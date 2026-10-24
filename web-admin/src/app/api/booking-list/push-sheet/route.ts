import { NextRequest, NextResponse } from 'next/server';
import { assertPlanIdAccess, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { appendNewRows, GoogleSheetsError, isGoogleSheetsConfigured, parseSpreadsheetId, getServiceAccount } from '@/lib/server/googleSheets';
import { createListingItem, moveItem } from '@/lib/listingBoardRules';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 500;
const KEY_COLUMN = 'ID kênh';

interface PushRow {
  handle: string;
  kocName: string;
  followers: number;
  fee: number;
  grade: string;
  slotId?: string;
  pic?: string;
  cells: (string | number)[];
}

const listingKey = (planId: string) => `listing-board-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

// GET /api/booking-list/push-sheet — trạng thái cấu hình kết nối Google Sheet
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  return NextResponse.json({ configured: isGoogleSheetsConfigured(), serviceAccountEmail: isGoogleSheetsConfigured() ? getServiceAccount().email : null });
}

// POST /api/booking-list/push-sheet — đẩy danh sách KOC dự kiến book lên Google Sheet của Brand,
// đồng thời đưa các KOC mới vào bảng điều phối listing ở trạng thái "Chờ Brand duyệt".
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as {
      planId?: string;
      sheetUrl?: string;
      tab?: string;
      tabName?: string;
      columns?: string[];
      header?: string[];
      rows?: (PushRow | (string | number)[])[];
    };
    const planId = body.planId || '';
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    const columns = Array.isArray(body.columns) ? body.columns : Array.isArray(body.header) ? body.header : null;
    const rawRows = Array.isArray(body.rows) ? body.rows : [];
    if (!planId || !spreadsheetId) return NextResponse.json({ error: 'Thiếu mã kế hoạch hoặc link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    if (!columns || rawRows.length === 0) return NextResponse.json({ error: 'Chưa có KOC nào được gán để gửi.', code: 'INVALID' }, { status: 400 });
    if (rawRows.length > MAX_ROWS) return NextResponse.json({ error: `Tối đa ${MAX_ROWS} KOC mỗi lần gửi.`, code: 'INVALID' }, { status: 400 });
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({ error: 'Chưa cấu hình tài khoản dịch vụ Google. Tải file Excel để gửi tạm.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }
    await assertPlanIdAccess(planId, actor, 'write');

    const cellRows: (string | number)[][] = rawRows.map(r => (Array.isArray(r) ? r : r.cells));
    const pushObjects: PushRow[] = rawRows.filter((r): r is PushRow => !Array.isArray(r) && typeof r === 'object' && r !== null && 'handle' in r);

    const result = await appendNewRows({
      spreadsheetId,
      tab: (body.tab || body.tabName || '').trim(),
      columns,
      rows: cellRows,
      keyColumn: KEY_COLUMN,
    });

    // Đưa KOC vừa gửi vào bảng điều phối listing (Chờ Brand duyệt)
    let listed = 0;
    const plan = (await listMonthlyPlans(actor)).find(p => p.plan.id === planId)?.plan;
    if (plan && pushObjects.length > 0) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rec = await readRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] });
        const existingByKey = new Map<string, number>();
        rec.data.items.forEach((i, idx) => {
          if (i.overallStatus === 'DROPPED') return;
          const h = (i.kocHandle || '').replace(/^@/, '').toLowerCase();
          existingByKey.set(h, idx);
          if (i.planSlotId) existingByKey.set(`${h}::${i.planSlotId.toLowerCase()}`, idx);
        });
        const nextItems = [...rec.data.items];
        let changedCount = 0;
        for (const r of pushObjects) {
          const h: string = (r.handle || '').replace(/^@/, '').toLowerCase();
          const compKey: string = r.slotId ? `${h}::${r.slotId.toLowerCase()}` : h;
          const existIdx = existingByKey.get(compKey) ?? existingByKey.get(h);
          if (existIdx !== undefined) {
            const existing = nextItems[existIdx];
            if (existing.overallStatus === 'DRAFT') {
              const moved = moveItem(existing, 'WAIT_BRAND', actor.name);
              if (moved.item) {
                nextItems[existIdx] = moved.item;
                changedCount += 1;
              }
            }
            continue;
          }
          const item = createListingItem({
            plan,
            grade: (r.grade as never) || 'KL1',
            handle: r.handle,
            fee: r.fee,
            followers: r.followers,
            kocName: r.kocName,
            actorId: actor.id,
            actorName: actor.name,
          });
          if (typeof r.slotId === 'string' && r.slotId) item.planSlotId = r.slotId.slice(0, 60);
          if (typeof r.pic === 'string' && r.pic.trim()) item.assignedStaffName = r.pic.trim().slice(0, 120);
          nextItems.push(moveItem(item, 'WAIT_BRAND', actor.name).item || item);
          changedCount += 1;
        }
        if (changedCount === 0) break;
        try {
          await updateRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] }, rec.revision, () => ({ items: nextItems }));
          listed = changedCount;
          break;
        } catch (err) {
          if (!(err instanceof RecordError && err.status === 409)) throw err;
        }
      }
    }

    return NextResponse.json({ ok: true, ...result, listed, url: body.sheetUrl });
  } catch (err) {
    if (err instanceof GoogleSheetsError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
