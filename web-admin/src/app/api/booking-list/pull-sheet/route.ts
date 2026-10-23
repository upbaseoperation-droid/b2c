import { NextRequest, NextResponse } from 'next/server';
import { assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { GoogleSheetsError, isGoogleSheetsConfigured, parseSpreadsheetId, readTab } from '@/lib/server/googleSheets';
import { applyBrandDecision, parseBrandDecision, type BrandDecision } from '@/lib/listingBoardRules';
import type { ContentPlanData } from '@/lib/contentPlanRules';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const slug = (planId: string) => planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const listingKey = (planId: string) => `listing-board-${slug(planId)}`;
const contentKey = (planId: string) => `content-plan-${slug(planId)}`;

/** ID kênh trên sheet có thể bị gõ kèm @, link TikTok hoặc khác hoa thường. */
const normHandle = (v: string) =>
  v
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .toLowerCase();

const normHeader = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim().toLowerCase();

interface SheetDecision {
  decision: BrandDecision;
  reason: string;
  note: string;
}

// POST /api/booking-list/pull-sheet — đọc cột "Brand duyệt" trên Google Sheet và cập nhật bảng điều phối listing.
// Đối chiếu theo ID kênh (không theo số dòng) nên nhân viên sắp xếp, chèn hoặc di chuyển dòng đều không ảnh hưởng.
// Chỉ áp khi giá trị trên sheet đổi so với lần đọc trước. Brand đổi No thành Yes thì KOC được khôi phục và gán lại content.
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; sheetUrl?: string; tab?: string };
    const planId = body.planId || '';
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    if (!planId || !spreadsheetId || !(body.tab || '').trim()) {
      return NextResponse.json({ error: 'Thiếu mã kế hoạch, tên tab hoặc link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    }
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({ error: 'Chưa cấu hình tài khoản dịch vụ Google.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }
    await assertPlanIdAccess(planId, actor, 'write');

    const { header, rows } = await readTab({ spreadsheetId, tab: body.tab!.trim() });
    const col = (name: string) => header.find(h => normHeader(h) === normHeader(name));
    const keyCol = col('ID kênh');
    const decisionCol = col('Brand duyệt');
    const reasonCol = col('Lý do Brand từ chối');
    const noteCol = col('Ghi chú Brand');
    if (!keyCol) return NextResponse.json({ error: 'Tab chưa có cột "ID kênh".', code: 'INVALID' }, { status: 400 });
    if (!decisionCol) return NextResponse.json({ error: 'Tab chưa có cột "Brand duyệt".', code: 'INVALID' }, { status: 400 });

    // Gom theo ID kênh. Một KOC xuất hiện nhiều dòng: lấy câu trả lời cuối cùng, báo nếu các dòng mâu thuẫn.
    const decisions = new Map<string, SheetDecision>();
    const seenDecisions = new Map<string, Set<BrandDecision>>();
    for (const r of rows) {
      const handle = normHandle(r[keyCol] || '');
      if (!handle) continue;
      const decision = parseBrandDecision(r[decisionCol]);
      const set = seenDecisions.get(handle) || new Set<BrandDecision>();
      if (decision !== 'NONE') set.add(decision);
      seenDecisions.set(handle, set);
      const prev = decisions.get(handle);
      if (!prev || decision !== 'NONE') {
        decisions.set(handle, { decision, reason: reasonCol ? r[reasonCol] || '' : '', note: noteCol ? r[noteCol] || '' : '' });
      }
    }
    const duplicateConflicts = Array.from(seenDecisions.entries()).filter(([, s]) => s.size > 1).map(([h]) => h);

    const summary = {
      approved: 0,
      rejected: 0,
      considering: 0,
      unchanged: 0,
      reapproved: 0,
      notOnSheet: [] as string[],
      rejectedHandles: [] as string[],
      restoredHandles: [] as string[],
      slotTaken: [] as string[],
      duplicateConflicts,
    };

    // 1. Bảng điều phối listing
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] });
      const c = { approved: 0, rejected: 0, considering: 0, unchanged: 0, reapproved: 0 };
      const notOnSheet: string[] = [];
      const rejectedHandles: string[] = [];
      const restoredHandles: string[] = [];
      const items = rec.data.items.map(item => {
        const handle = normHandle(item.kocHandle || '');
        const d = decisions.get(handle);
        if (!d) {
          if (item.overallStatus === 'SUBMITTED') notOnSheet.push(handle);
          return item;
        }
        const r = applyBrandDecision(item, d.decision, { reason: d.reason, note: d.note, actor: actor.name });
        if (!r.changed) c.unchanged += 1;
        else if (r.restored) {
          c.reapproved += 1;
          restoredHandles.push(handle);
        } else if (d.decision === 'APPROVED') c.approved += 1;
        else if (d.decision === 'REJECTED') {
          c.rejected += 1;
          rejectedHandles.push(handle);
        } else if (d.decision === 'CONSIDER') c.considering += 1;
        return r.item;
      });
      try {
        await updateRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] }, rec.revision, () => ({ items }));
        Object.assign(summary, c, { notOnSheet, rejectedHandles, restoredHandles });
        break;
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }

    // 2. Kế hoạch content: bỏ gán KOC bị từ chối (nhớ lại để gán lại nếu Brand đổi ý)
    if (summary.rejectedHandles.length > 0 || summary.restoredHandles.length > 0) {
      const rejected = new Set(summary.rejectedHandles);
      const restored = new Set(summary.restoredHandles);
      for (let attempt = 0; attempt < 3; attempt++) {
        const rec = await readRecord<ContentPlanData>(contentKey(planId), { slots: [] });
        let touched = false;
        const slotTaken: string[] = [];
        const slots = (rec.data.slots || []).map(s => {
          const now = new Date().toISOString();
          const h = normHandle(s.kocHandle || '');
          if (h && rejected.has(h)) {
            touched = true;
            const reason = decisions.get(h)?.reason;
            const note = `Brand từ chối @${h}${reason ? `: ${reason}` : ''}`;
            return { ...s, kocHandle: undefined, rejectedKoc: { handle: h, reason: reason || undefined, at: now }, note: s.note ? `${s.note}\n${note}` : note, updatedAt: now };
          }
          const rj = s.rejectedKoc ? normHandle(s.rejectedKoc.handle) : '';
          if (rj && restored.has(rj)) {
            touched = true;
            if (!s.kocHandle) {
              const note = `Brand duyệt lại @${rj}, đã gán lại`;
              return { ...s, kocHandle: rj, rejectedKoc: undefined, note: s.note ? `${s.note}\n${note}` : note, updatedAt: now };
            }
            slotTaken.push(rj);
          }
          return s;
        });
        if (!touched) break;
        try {
          await updateRecord<ContentPlanData>(contentKey(planId), { slots: [] }, rec.revision, d => ({ ...d, slots }));
          summary.slotTaken = slotTaken;
          break;
        } catch (err) {
          if (!(err instanceof RecordError && err.status === 409)) throw err;
        }
      }
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof GoogleSheetsError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
