import { NextRequest, NextResponse } from 'next/server';
import { assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { GoogleSheetsError, isGoogleSheetsConfigured, parseSpreadsheetId, readTab } from '@/lib/server/googleSheets';
import { applyBrandDecision, parseBrandDecision, type BrandDecision } from '@/lib/listingBoardRules';
import { addKocToSlot, removeKocFromSlot, slotKocHandles, type ContentPlanData } from '@/lib/contentPlanRules';
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, syncDealSummaryFields, type DealBoardData, type ScriptStatus } from '@/lib/dealBoardRules';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const slug = (planId: string) => planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const listingKey = (planId: string) => `listing-board-${slug(planId)}`;
const contentKey = (planId: string) => `content-plan-${slug(planId)}`;
const dealKey = (planId: string) => `deal-board-${slug(planId)}`;

/** ID kênh trên sheet có thể bị gõ kèm @, link TikTok hoặc khác hoa thường. */
const normHandle = (v: string) =>
  v
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
    .toLowerCase();

const normHeader = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim().toLowerCase();

const parseFeeCell = (v: string | undefined): number | null => {
  if (!v) return null;
  const cleaned = String(v).replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

const parseScriptStageDecision = (v: string | undefined): ScriptStatus | null => {
  const d = parseBrandDecision(v);
  if (d === 'APPROVED') return 'APPROVED';
  if (d === 'REJECTED' || d === 'CONSIDER') return 'CHANGES';
  return null;
};

interface SheetDecision {
  decision: BrandDecision;
  reason: string;
  note: string;
  briefCode?: string;
  fee?: number | null;
  productName?: string;
  scriptLink?: string;
  brandScriptDecision?: ScriptStatus | null;
  demoLink?: string;
  brandDemoDecision?: ScriptStatus | null;
  brandDemoNote?: string;
  airLink?: string;
}

// POST /api/booking-list/pull-sheet — đọc cột "Brand duyệt" và các cột Giai đoạn 2 (Kịch bản / Video Demo / Giá / Sản phẩm) trên Google Sheet.
// Đối chiếu theo cặp (ID kênh + Mã Brief) nếu có Mã Brief, hoặc theo ID kênh, giúp 1 KOC làm nhiều video trên cùng Sheet không bị xung đột.
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; sheetUrl?: string; tab?: string; tabName?: string };
    const planId = body.planId || '';
    const tab = (body.tab || body.tabName || '').trim();
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    if (!planId || !spreadsheetId || !tab) {
      return NextResponse.json({ error: 'Thiếu mã kế hoạch, tên tab hoặc link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    }
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json({ error: 'Chưa cấu hình tài khoản dịch vụ Google.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }
    await assertPlanIdAccess(planId, actor, 'write');

    const { header, rows } = await readTab({ spreadsheetId, tab });
    const col = (name: string) => header.find(h => normHeader(h) === normHeader(name));
    const keyCol = col('ID kênh');
    const decisionCol = col('Brand duyệt');
    const reasonCol = col('Lý do Brand từ chối');
    const noteCol = col('Ghi chú Brand');
    const briefCol = col('Mã Brief');
    const feeCol = col('Giá net video');
    const productCol = col('Sản phẩm');
    const scriptLinkCol = col('Link kịch bản');
    const brandScriptCol = col('Brand duyệt kịch bản');
    const demoLinkCol = col('Link video demo');
    const brandDemoCol = col('Brand duyệt demo');
    const brandDemoNoteCol = col('Ghi chú sửa demo');
    const airLinkCol = col('Link Air');

    if (!keyCol) return NextResponse.json({ error: 'Tab chưa có cột "ID kênh".', code: 'INVALID' }, { status: 400 });
    if (!decisionCol) return NextResponse.json({ error: 'Tab chưa có cột "Brand duyệt".', code: 'INVALID' }, { status: 400 });

    // Gom theo (ID kênh + Mã Brief) và theo ID kênh
    const decisionsByComposite = new Map<string, SheetDecision>();
    const decisions = new Map<string, SheetDecision>();
    const seenDecisions = new Map<string, Set<BrandDecision>>();
    for (const r of rows) {
      const handle = normHandle(r[keyCol] || '');
      if (!handle) continue;
      const briefCode = briefCol ? (r[briefCol] || '').trim().toUpperCase() : '';
      const compKey = briefCode ? `${handle}::${briefCode}` : handle;
      const decision = parseBrandDecision(r[decisionCol]);
      const set = seenDecisions.get(compKey) || new Set<BrandDecision>();
      if (decision !== 'NONE') set.add(decision);
      seenDecisions.set(compKey, set);

      const entry: SheetDecision = {
        decision,
        reason: reasonCol ? r[reasonCol] || '' : '',
        note: noteCol ? r[noteCol] || '' : '',
        briefCode: briefCode || undefined,
        fee: feeCol ? parseFeeCell(r[feeCol]) : null,
        productName: productCol ? (r[productCol] || '').trim() : undefined,
        scriptLink: scriptLinkCol ? (r[scriptLinkCol] || '').trim() : undefined,
        brandScriptDecision: brandScriptCol ? parseScriptStageDecision(r[brandScriptCol]) : null,
        demoLink: demoLinkCol ? (r[demoLinkCol] || '').trim() : undefined,
        brandDemoDecision: brandDemoCol ? parseScriptStageDecision(r[brandDemoCol]) : null,
        brandDemoNote: brandDemoNoteCol ? (r[brandDemoNoteCol] || '').trim() : undefined,
        airLink: airLinkCol ? (r[airLinkCol] || '').trim() : undefined,
      };
      decisionsByComposite.set(compKey, entry);
      const prev = decisions.get(handle);
      if (!prev || decision !== 'NONE') {
        decisions.set(handle, entry);
      }
    }
    const duplicateConflicts = Array.from(seenDecisions.entries())
      .filter(([, s]) => s.size > 1)
      .map(([k]) => k.split('::')[0]);

    const summary = {
      pullAt: new Date().toISOString(),
      tabName: (body.tab || '').trim(),
      approved: 0,
      rejected: 0,
      considering: 0,
      unchanged: 0,
      reapproved: 0,
      stage2UpdatedJobs: 0,
      approvedHandles: [] as string[],
      consideringHandles: [] as string[],
      rejectedDetails: [] as { handle: string; reason?: string }[],
      notOnSheet: [] as string[],
      rejectedHandles: [] as string[],
      restoredHandles: [] as string[],
      slotTaken: [] as string[],
      duplicateConflicts,
    };

    // Đọc trước danh sách slot để biết slotId ứng với briefCode
    const contentSnap = await readRecord<ContentPlanData>(contentKey(planId), { slots: [] });
    const briefCodeBySlotId = new Map<string, string>();
    for (const s of contentSnap.data.slots || []) {
      if (s.id && s.briefCode) briefCodeBySlotId.set(s.id, s.briefCode.trim().toUpperCase());
    }

    // 1. Bảng điều phối listing
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] });
      const c = { approved: 0, rejected: 0, considering: 0, unchanged: 0, reapproved: 0 };
      const notOnSheet: string[] = [];
      const rejectedHandles: string[] = [];
      const restoredHandles: string[] = [];
      const approvedHandles: string[] = [];
      const consideringHandles: string[] = [];
      const rejectedDetails: { handle: string; reason?: string }[] = [];
      const items = rec.data.items.map(item => {
        const handle = normHandle(item.kocHandle || '');
        const bCode = item.planSlotId ? briefCodeBySlotId.get(item.planSlotId) || '' : '';
        const d = (bCode ? decisionsByComposite.get(`${handle}::${bCode}`) : undefined) || decisions.get(handle);
        if (!d) {
          if (item.overallStatus === 'SUBMITTED') notOnSheet.push(handle);
          return item;
        }
        const r = applyBrandDecision(item, d.decision, { reason: d.reason, note: d.note, actor: actor.name });
        let updatedItem = r.item;
        // Đồng bộ lại Giá net video nếu Brand sửa giá trên Sheet
        if (typeof d.fee === 'number' && d.fee >= 0 && d.fee !== (updatedItem.finalFee ?? updatedItem.proposedFee)) {
          updatedItem = { ...updatedItem, proposedFee: d.fee, finalFee: d.fee };
        }
        if (!r.changed) c.unchanged += 1;
        else if (r.restored) {
          c.reapproved += 1;
          restoredHandles.push(handle);
        } else if (d.decision === 'APPROVED') {
          c.approved += 1;
          approvedHandles.push(handle);
        } else if (d.decision === 'REJECTED') {
          c.rejected += 1;
          rejectedHandles.push(handle);
          rejectedDetails.push({ handle, reason: d.reason || undefined });
        } else if (d.decision === 'CONSIDER') {
          c.considering += 1;
          consideringHandles.push(handle);
        }
        return updatedItem;
      });
      try {
        await updateRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] }, rec.revision, () => ({ items }));
        Object.assign(summary, c, { notOnSheet, rejectedHandles, restoredHandles, approvedHandles, consideringHandles, rejectedDetails });
        break;
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }

    // 2. Kế hoạch content: hỗ trợ 1 Brief - N KOC (removeKocFromSlot / addKocToSlot) và đồng bộ Sản phẩm/Giá nếu Brand sửa trên Sheet
    if (summary.rejectedHandles.length > 0 || summary.restoredHandles.length > 0 || decisionsByComposite.size > 0) {
      const rejected = new Set(summary.rejectedHandles);
      const restored = new Set(summary.restoredHandles);
      for (let attempt = 0; attempt < 3; attempt++) {
        const rec = await readRecord<ContentPlanData>(contentKey(planId), { slots: [] });
        let touched = false;
        const slotTaken: string[] = [];
        const slots = (rec.data.slots || []).map(s => {
          const now = new Date().toISOString();
          let nextSlot = s;
          const bCode = (s.briefCode || '').trim().toUpperCase();
          const handles = slotKocHandles(s);
          for (const rawH of handles) {
            const h = normHandle(rawH);
            const d = (bCode ? decisionsByComposite.get(`${h}::${bCode}`) : undefined) || decisions.get(h);
            if (d?.productName && d.productName !== nextSlot.product) {
              touched = true;
              nextSlot = { ...nextSlot, product: d.productName, updatedAt: now };
            }
            if (h && (d?.decision === 'REJECTED' || (!bCode && rejected.has(h)))) {
              touched = true;
              const reason = d?.reason || decisions.get(h)?.reason;
              const note = `Brand từ chối @${h}${reason ? `: ${reason}` : ''}`;
              const removed = removeKocFromSlot(nextSlot, h);
              nextSlot = {
                ...removed,
                rejectedKoc: { handle: h, reason: reason || undefined, at: now },
                note: nextSlot.note ? `${nextSlot.note}\n${note}` : note,
                updatedAt: now,
              };
            }
          }
          const rj = nextSlot.rejectedKoc ? normHandle(nextSlot.rejectedKoc.handle) : '';
          if (rj && restored.has(rj)) {
            touched = true;
            const added = addKocToSlot(nextSlot, rj);
            const note = `Brand duyệt lại @${rj}, đã gán lại`;
            nextSlot = {
              ...added,
              rejectedKoc: undefined,
              note: nextSlot.note ? `${nextSlot.note}\n${note}` : note,
              updatedAt: now,
            };
          }
          return nextSlot;
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

    // 3. Đồng bộ Giai đoạn 2 sang Bảng Deal & Job (Brand duyệt kịch bản / Brand duyệt video demo / Ghi chú sửa demo)
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<DealBoardData>(dealKey(planId), EMPTY_DEAL_BOARD);
      const board = sanitizeDealBoard(rec.data);
      if (!board.deals || board.deals.length === 0) break;
      let stage2Count = 0;
      const nowYmd = new Date().toISOString().slice(0, 10);
      const nextDeals = board.deals.map(deal => {
        const h = normHandle(deal.kocHandle);
        let dealTouched = false;
        const nextJobs = (deal.jobs || []).map(job => {
          const bCode = (job.briefCode || (job.slotId ? briefCodeBySlotId.get(job.slotId) : '') || '').trim().toUpperCase();
          const d = (bCode ? decisionsByComposite.get(`${h}::${bCode}`) : undefined) || decisions.get(h);
          if (!d) return job;
          let nextJob = { ...job, script: { ...job.script } };
          let jobTouched = false;
          if (d.scriptLink && !nextJob.script.scriptUrl) {
            nextJob.script.scriptUrl = d.scriptLink;
            jobTouched = true;
          }
          if (d.demoLink && !nextJob.script.demoUrl) {
            nextJob.script.demoUrl = d.demoLink;
            jobTouched = true;
          }
          if (d.airLink && !nextJob.airLink) {
            nextJob.airLink = d.airLink;
            nextJob.airedAt = nextJob.airedAt || nowYmd;
            jobTouched = true;
          }
          if (d.brandScriptDecision && d.brandScriptDecision !== nextJob.script.status) {
            nextJob.script.status = d.brandScriptDecision;
            nextJob.script.at = nowYmd;
            jobTouched = true;
          }
          if (d.brandDemoDecision && d.brandDemoDecision !== nextJob.script.demoStatus) {
            nextJob.script.demoStatus = d.brandDemoDecision;
            jobTouched = true;
          }
          if (d.brandDemoNote && !nextJob.script.note.includes(d.brandDemoNote)) {
            nextJob.script.note = nextJob.script.note ? `${nextJob.script.note} | Brand góp ý Demo: ${d.brandDemoNote}` : `Brand góp ý Demo: ${d.brandDemoNote}`;
            jobTouched = true;
          }
          if (jobTouched) {
            dealTouched = true;
            stage2Count += 1;
          }
          return nextJob;
        });
        return dealTouched ? syncDealSummaryFields({ ...deal, jobs: nextJobs }) : deal;
      });
      if (stage2Count === 0) break;
      try {
        await updateRecord<DealBoardData>(dealKey(planId), EMPTY_DEAL_BOARD, rec.revision, prev => ({ ...prev, deals: nextDeals }));
        summary.stage2UpdatedJobs = stage2Count;
        break;
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    if (err instanceof GoogleSheetsError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
