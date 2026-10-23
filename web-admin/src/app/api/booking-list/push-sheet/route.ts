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
    const body = (await request.json()) as { planId?: string; sheetUrl?: string; tab?: string; columns?: string[]; rows?: PushRow[] };
    const planId = body.planId || '';
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    if (!planId || !spreadsheetId) return NextResponse.json({ error: 'Thiếu mã kế hoạch hoặc link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    if (!Array.isArray(body.columns) || !Array.isArray(body.rows) || body.rows.length === 0) return NextResponse.json({ error: 'Chưa có KOC nào được gán để gửi.', code: 'INVALID' }, { status: 400 });
    if (body.rows.length > MAX_ROWS) return NextResponse.json({ error: `Tối đa ${MAX_ROWS} KOC mỗi lần gửi.`, code: 'INVALID' }, { status: 400 });
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({ error: 'Chưa cấu hình tài khoản dịch vụ Google. Tải file Excel để gửi tạm.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }
    await assertPlanIdAccess(planId, actor, 'write');

    const result = await appendNewRows({
      spreadsheetId,
      tab: (body.tab || '').trim(),
      columns: body.columns,
      rows: body.rows.map(r => r.cells),
      keyColumn: KEY_COLUMN,
    });

    // Đưa KOC vừa gửi vào bảng điều phối listing (Chờ Brand duyệt)
    let listed = 0;
    const plan = (await listMonthlyPlans(actor)).find(p => p.plan.id === planId)?.plan;
    if (plan) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rec = await readRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] });
        const have = new Set(rec.data.items.filter(i => i.overallStatus !== 'DROPPED').map(i => (i.kocHandle || '').replace(/^@/, '').toLowerCase()));
        const created: KocListingItem[] = [];
        for (const r of body.rows) {
          if (have.has(r.handle.toLowerCase())) continue;
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
          created.push(moveItem(item, 'WAIT_BRAND', actor.name).item || item);
        }
        if (created.length === 0) break;
        try {
          await updateRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] }, rec.revision, d => ({ items: [...d.items, ...created] }));
          listed = created.length;
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
