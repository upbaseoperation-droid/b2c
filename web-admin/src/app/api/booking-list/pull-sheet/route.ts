import { NextRequest, NextResponse } from 'next/server';
import { assertListingSheetAccess } from '@/lib/server/monthlyPlanStore';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { ensureServiceAccountLoaded, GoogleSheetsError, parseSpreadsheetGid, parseSpreadsheetId, readTab } from '@/lib/server/googleSheets';
import { applyBrandDecision, columnOf, createListingItem, moveItem, parseBrandDecision, type BrandDecision } from '@/lib/listingBoardRules';
import { klFromFee, KL_TIERS, type KlCode } from '@/lib/klTiers';
import { UPBASE_FULL_KOC_MASTER } from '@/lib/kocMasterDataset';
import { addKocToSlot, removeKocFromSlot, slotKocHandles, type ContentPlanData } from '@/lib/contentPlanRules';
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, syncDealSummaryFields, type DealBoardData, type ScriptStatus } from '@/lib/dealBoardRules';
import type { KocItem, KocListingItem, ListingBatchCycle } from '@/lib/types';
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

const normHeader = (v: string) =>
  String(v || '')
    .replace(/[\u{1F383}\u{1F338}]/gu, '')
    .replace(/\s*\(bổ sung thêm\)/gi, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const parseFeeCell = (v: string | undefined): number | null => {
  if (!v) return null;
  const text = String(v).trim().toLowerCase();
  if (!text) return null;
  const firstPart = text.split(/[+;(\n]/)[0].trim();
  const trMatch = firstPart.match(/^(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|m)\b/i);
  if (trMatch) {
    return Math.round(parseFloat(trMatch[1].replace(',', '.')) * 1_000_000);
  }
  const kMatch = firstPart.match(/^(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1_000);
  }
  const numGroup = firstPart.match(/\d[\d.,]*/);
  if (!numGroup) return null;
  const cleaned = numGroup[0].replace(/[^\d]/g, '');
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
  handle: string;
  kocName?: string;
  followers?: number | null;
  grade?: KlCode | 'TAP UpAffiliate' | null;
  pic?: string;
  batchCycle?: ListingBatchCycle;
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

const parseGradeCell = (v: string | undefined): KlCode | 'TAP UpAffiliate' | null => {
  if (!v) return null;
  const t = v.trim().toUpperCase();
  if (!t) return null;
  if (/FOC|FREECAST|TAP|0Đ|0D/.test(t)) return 'TAP UpAffiliate';
  const found = KL_TIERS.find(tier => t.includes(tier.code));
  return found ? found.code : null;
};

const parseBatchCell = (v: string | undefined): ListingBatchCycle | undefined => {
  if (!v) return undefined;
  const t = v.trim().toLowerCase();
  // Theo tuần: W1–W2 → Đợt 1, W3 → Đợt 2, W4–W5 → Đợt 3
  const week = t.match(/(?:\bw|week|tuần)\s*(\d)/);
  if (week) {
    const n = Number(week[1]);
    return n <= 2 ? 'BATCH_10' : n === 3 ? 'BATCH_20' : 'BATCH_30';
  }
  // Theo đợt: "Đợt 1" / "1" / "10" (ngày 10), tương tự 2 / 20 và 3 / 30
  const num = t.match(/\d+/)?.[0];
  if (num === '1' || num === '10') return 'BATCH_10';
  if (num === '2' || num === '20') return 'BATCH_20';
  if (num === '3' || num === '30') return 'BATCH_30';
  return undefined;
};

// POST /api/booking-list/pull-sheet — đọc cột "Brand duyệt" và các cột Giai đoạn 2 (Kịch bản / Video Demo / Giá / Sản phẩm) trên Google Sheet.
// Đối chiếu theo cặp (ID kênh + Mã Brief) nếu có Mã Brief, hoặc theo ID kênh, giúp 1 KOC làm nhiều video trên cùng Sheet không bị xung đột.
// Đồng thời tự động nhập mới các dòng KOC có trên Google Sheet nhưng chưa có trên Bảng điều phối.
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; sheetUrl?: string; tab?: string; tabName?: string; dryRun?: boolean };
    // dryRun: chỉ so Sheet với app, trả danh sách thay đổi và mâu thuẫn để người dùng xác nhận trước khi ghi
    const dryRun = body.dryRun === true;
    type PullChange = { handle: string; briefCode?: string; field: string; app: string; sheet: string; conflict?: string };
    const changes: PullChange[] = [];
    const feeText = (v: number | null | undefined) => (typeof v === 'number' ? `${v.toLocaleString('vi-VN')}đ` : '—');
    const planId = body.planId || '';
    const tab = (body.tab || body.tabName || '').trim();
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    if (!planId || !spreadsheetId || !tab) {
      return NextResponse.json({ error: 'Thiếu mã kế hoạch, tên tab hoặc link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    }
    const sa = await ensureServiceAccountLoaded();
    if (!sa.configured) {
      return NextResponse.json({ error: 'Chưa cấu hình tài khoản dịch vụ Google.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }
    // Sheet nhân sự ("YYYY/MM__Gian") không có kế hoạch: chỉ trả dữ liệu Sheet, không ghi bảng điều phối
    const plan = await assertListingSheetAccess(planId, actor);

    const { header, rows } = await readTab({
      spreadsheetId,
      tab,
      sheetGid: parseSpreadsheetGid(body.sheetUrl || ''),
    });
    const col = (...names: string[]) => header.find(h => names.some(n => normHeader(h) === normHeader(n)));
    const keyCol = col('ID kênh', 'ID Kênh TikTok', 'TikTok ID', 'Handle', 'Kênh KOC');
    const decisionCol = col('Brand duyệt', 'Brand chọn', 'Kết quả Brand', 'Duyệt');
    const reasonCol = col('Lý do Brand từ chối', 'Lý do từ chối', 'Phản hồi Brand');
    const noteCol = col('Ghi chú Brand', 'Ghi chú', 'Content Note', 'Leader Note');
    const briefCol = col('Mã Brief', 'Brief');
    const feeCol = col('Giá net video', 'Giá Net', 'Chi phí chốt cuối', 'Giá booking', 'Ratecard');
    const productCol = col('Sản phẩm', 'Tên sản phẩm');
    const nameCol = col('Tên người ảnh hưởng (Tên kênh)', 'Tên kênh', 'Tên kênh KOC', 'Tên KOC', 'KOC');
    const followerCol = col('Follower', 'Followers', 'Lượng follower');
    const gradeCol = col('Bậc KL', 'Tệp booking', 'Khung lương', 'Tier');
    const picCol = col('PIC', 'Nhân sự điền', 'Nhân sự phụ trách');
    const dotCol = col('Đợt', 'Đợt Listing', 'Đợt listing', 'Tuần');
    const scriptLinkCol = col('Link kịch bản');
    const brandScriptCol = col('Brand duyệt kịch bản');
    const demoLinkCol = col('Link video demo');
    const brandDemoCol = col('Brand duyệt demo');
    const brandDemoNoteCol = col('Ghi chú sửa demo');
    const airLinkCol = col('Link Air', 'Link nghiệm thu');

    if (!keyCol) return NextResponse.json({ error: 'Tab chưa có cột "ID kênh".', code: 'INVALID' }, { status: 400 });

    // Gom theo (ID kênh + Mã Brief) và theo ID kênh
    const decisionsByComposite = new Map<string, SheetDecision>();
    const decisions = new Map<string, SheetDecision>();
    const seenDecisions = new Map<string, Set<BrandDecision>>();
    for (const r of rows) {
      const handle = normHandle(r[keyCol] || '');
      if (!handle) continue;
      const briefCode = briefCol ? (r[briefCol] || '').trim().toUpperCase() : '';
      const compKey = briefCode ? `${handle}::${briefCode}` : handle;
      const decision = decisionCol ? parseBrandDecision(r[decisionCol]) : 'NONE';
      const set = seenDecisions.get(compKey) || new Set<BrandDecision>();
      if (decision !== 'NONE') set.add(decision);
      seenDecisions.set(compKey, set);

      const entry: SheetDecision = {
        handle,
        kocName: nameCol ? (r[nameCol] || '').trim() || undefined : undefined,
        followers: followerCol ? parseFeeCell(r[followerCol]) : null,
        grade: gradeCol ? parseGradeCell(r[gradeCol]) : null,
        pic: picCol ? (r[picCol] || '').trim() || undefined : undefined,
        batchCycle: dotCol ? parseBatchCell(r[dotCol]) : undefined,
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
      imported: 0,
      stage2UpdatedJobs: 0,
      approvedHandles: [] as string[],
      consideringHandles: [] as string[],
      rejectedDetails: [] as { handle: string; reason?: string }[],
      importedHandles: [] as string[],
      notOnSheet: [] as string[],
      rejectedHandles: [] as string[],
      restoredHandles: [] as string[],
      slotTaken: [] as string[],
      duplicateConflicts,
    };

    if (!plan) {
      return NextResponse.json({
        ok: true,
        dryRun,
        ...summary,
        changes,
        conflicts: 0,
        sheetRows: rows,
        decisions: Array.from(decisionsByComposite.values()),
      });
    }

    // Đọc trước danh sách slot để biết slotId ứng với briefCode
    const contentSnap = await readRecord<ContentPlanData>(contentKey(planId), { slots: [] });
    const briefCodeBySlotId = new Map<string, string>();
    const slotIdByBriefCode = new Map<string, string>();
    for (const s of contentSnap.data.slots || []) {
      if (s.id && s.briefCode) {
        const bc = s.briefCode.trim().toUpperCase();
        briefCodeBySlotId.set(s.id, bc);
        slotIdByBriefCode.set(bc, s.id);
      }
    }
    // KOC Master thật: bộ dữ liệu gốc, đè bằng bản ghi đã sửa / đồng bộ trên máy chủ
    const kocDirectory = await readRecord<{ itemsByHandle: Record<string, KocItem> }>('koc-directory-changes', { itemsByHandle: {} });
    const masterKocByHandle = new Map<string, KocItem>();
    for (const k of [...UPBASE_FULL_KOC_MASTER, ...Object.values(kocDirectory.data.itemsByHandle || {})]) {
      const key = normHandle(k.channelId || '');
      if (key) masterKocByHandle.set(key, k);
    }

    // 1. Bảng điều phối listing
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] });
      const c = { approved: 0, rejected: 0, considering: 0, unchanged: 0, reapproved: 0, imported: 0 };
      const notOnSheet: string[] = [];
      const rejectedHandles: string[] = [];
      const restoredHandles: string[] = [];
      const approvedHandles: string[] = [];
      const consideringHandles: string[] = [];
      const importedHandles: string[] = [];
      const rejectedDetails: { handle: string; reason?: string }[] = [];
      const matchedSheetKeys = new Set<string>();
      const matchedHandles = new Set<string>();

      const items = rec.data.items.map(item => {
        const handle = normHandle(item.kocHandle || '');
        const bCode = item.planSlotId ? briefCodeBySlotId.get(item.planSlotId) || '' : '';
        const compKey = bCode ? `${handle}::${bCode}` : handle;
        const d = (bCode ? decisionsByComposite.get(compKey) : undefined) || decisions.get(handle);
        if (!d) {
          if (item.overallStatus === 'SUBMITTED') notOnSheet.push(handle);
          return item;
        }
        matchedHandles.add(handle);
        matchedSheetKeys.add(compKey);
        if (d.briefCode) matchedSheetKeys.add(`${handle}::${d.briefCode}`);
        const r = applyBrandDecision(item, d.decision, { reason: d.reason, note: d.note, actor: actor.name });
        let updatedItem = r.item;
        if (r.changed && d.decision !== 'NONE') {
          changes.push({ handle, briefCode: bCode || undefined, field: 'Brand duyệt', app: item.brandApprovalStatus, sheet: d.decision });
        }
        if (d.decision === 'REJECTED' && columnOf(item) === 'CONFIRMED') {
          changes.push({ handle, briefCode: bCode || undefined, field: 'Brand duyệt', app: 'Đã chốt', sheet: 'No', conflict: 'KOC đã chốt trong app nhưng Sheet ghi Brand từ chối — giữ nguyên, cần trao đổi lại với Brand.' });
        }
        if (columnOf(item) === 'CONFIRMED' && typeof d.fee === 'number' && d.fee !== (item.finalFee ?? item.proposedFee)) {
          changes.push({ handle, briefCode: bCode || undefined, field: 'Giá net video', app: feeText(item.finalFee ?? item.proposedFee), sheet: feeText(d.fee), conflict: 'Giá trên Sheet khác giá đã chốt — không ghi đè.' });
        }
        // Đồng bộ lại Giá net video nếu Brand sửa giá trên Sheet (nhưng không ghi đè item đã CONFIRMED — L4)
        if (
          columnOf(updatedItem) !== 'CONFIRMED' &&
          typeof d.fee === 'number' &&
          d.fee >= 0 &&
          d.fee !== (updatedItem.finalFee ?? updatedItem.proposedFee)
        ) {
          changes.push({ handle, briefCode: bCode || undefined, field: 'Giá net video', app: feeText(updatedItem.finalFee ?? updatedItem.proposedFee), sheet: feeText(d.fee) });
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

      // Nhập tự động các dòng KOC có trên Google Sheet nhưng chưa có trong bảng điều phối Listing
      for (const [compKey, d] of decisionsByComposite.entries()) {
        if (matchedSheetKeys.has(compKey) || (!d.briefCode && matchedHandles.has(d.handle))) {
          continue;
        }
        matchedSheetKeys.add(compKey);
        matchedHandles.add(d.handle);
        const matchedKoc = masterKocByHandle.get(d.handle);
        const feeVal = typeof d.fee === 'number' && d.fee >= 0 ? d.fee : matchedKoc?.rateCardVideo;
        const resolvedGrade: KlCode | 'TAP UpAffiliate' =
          d.grade ||
          (feeVal === 0 ? 'TAP UpAffiliate' : typeof feeVal === 'number' ? klFromFee(feeVal) : (matchedKoc?.salaryGrade as KlCode) || 'KL1');
        let newItem = createListingItem({
          plan,
          grade: resolvedGrade,
          handle: d.handle,
          koc: matchedKoc,
          fee: feeVal,
          followers: typeof d.followers === 'number' ? d.followers : matchedKoc?.followers,
          kocName: d.kocName || matchedKoc?.stageName || d.handle,
          actorId: actor.id,
          actorName: actor.name,
          batchCycle: d.batchCycle || 'BATCH_10',
        });
        if (d.pic) newItem.assignedStaffName = d.pic.slice(0, 120);
        if (d.productName) newItem.pillarName = d.productName.slice(0, 120);
        if (d.briefCode && slotIdByBriefCode.has(d.briefCode)) {
          newItem.planSlotId = slotIdByBriefCode.get(d.briefCode);
        }
        newItem = moveItem(newItem, 'WAIT_BRAND', actor.name).item || newItem;
        if (d.decision !== 'NONE') {
          newItem = applyBrandDecision(newItem, d.decision, { reason: d.reason, note: d.note, actor: actor.name }).item;
        }
        items.push(newItem);
        c.imported += 1;
        importedHandles.push(d.handle);
        if (d.decision === 'APPROVED') {
          c.approved += 1;
          approvedHandles.push(d.handle);
        } else if (d.decision === 'REJECTED') {
          c.rejected += 1;
          rejectedHandles.push(d.handle);
          rejectedDetails.push({ handle: d.handle, reason: d.reason || undefined });
        } else if (d.decision === 'CONSIDER') {
          c.considering += 1;
          consideringHandles.push(d.handle);
        }
        changes.push({
          handle: d.handle,
          briefCode: d.briefCode,
          field: 'Nhập mới từ Sheet',
          app: 'Chưa có trên bảng',
          sheet: `${d.kocName || `@${d.handle}`} · ${d.decision !== 'NONE' ? d.decision : 'Chờ Brand duyệt'}${typeof feeVal === 'number' ? ` · ${feeText(feeVal)}` : ''}`,
        });
      }

      if (dryRun) {
        Object.assign(summary, c, { notOnSheet, rejectedHandles, restoredHandles, approvedHandles, consideringHandles, importedHandles, rejectedDetails });
        break;
      }
      try {
        await updateRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] }, rec.revision, () => ({ items }));
        Object.assign(summary, c, { notOnSheet, rejectedHandles, restoredHandles, approvedHandles, consideringHandles, importedHandles, rejectedDetails });
        break;
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }

    // 2. Kế hoạch content: hỗ trợ 1 Brief - N KOC (removeKocFromSlot / addKocToSlot) và đồng bộ Sản phẩm/Giá nếu Brand sửa trên Sheet
    if (!dryRun && (summary.rejectedHandles.length > 0 || summary.restoredHandles.length > 0 || decisionsByComposite.size > 0)) {
      const latestListingRec = await readRecord<{ items: KocListingItem[] }>(listingKey(planId), { items: [] });
      const confirmedHandles = new Set(
        (latestListingRec.data.items || [])
          .filter(it => columnOf(it) === 'CONFIRMED')
          .map(it => normHandle(it.kocHandle || ''))
          .filter(Boolean)
      );
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
            // Không gỡ KOC đã chốt Deal (CONFIRMED) khỏi ô kế hoạch content (L6)
            if (h && !confirmedHandles.has(h) && (d?.decision === 'REJECTED' || (!bCode && rejected.has(h)))) {
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
          const nextJob = { ...job, script: { ...job.script } };
          let jobTouched = false;
          if (d.airLink && job.airLink.trim() && d.airLink !== job.airLink.trim()) {
            changes.push({ handle: h, briefCode: bCode || undefined, field: 'Link Air', app: job.airLink, sheet: d.airLink, conflict: 'Link Air trên Sheet khác link trong app — giữ link trong app.' });
          }
          // Kết quả Brand (vòng 2) chỉ nhận khi B2C đã duyệt nội bộ vòng 1
          const scriptV1Ok = !job.script.scriptUrl?.trim() || job.script.internalScriptAuditStatus === 'PASSED';
          const demoV1Ok = !job.script.demoUrl?.trim() || job.script.internalDemoAuditStatus === 'PASSED';
          if (d.brandScriptDecision && d.brandScriptDecision !== job.script.status && !scriptV1Ok) {
            changes.push({ handle: h, briefCode: bCode || undefined, field: 'Brand duyệt kịch bản', app: job.script.status, sheet: d.brandScriptDecision, conflict: 'Kịch bản chưa đạt duyệt nội bộ vòng 1 — chưa nhận kết quả Brand.' });
          }
          if (d.brandDemoDecision && d.brandDemoDecision !== job.script.demoStatus && !demoV1Ok) {
            changes.push({ handle: h, briefCode: bCode || undefined, field: 'Brand duyệt demo', app: job.script.demoStatus || 'NONE', sheet: d.brandDemoDecision, conflict: 'Demo chưa đạt duyệt nội bộ vòng 1 — chưa nhận kết quả Brand.' });
          }
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
          if (d.brandScriptDecision && d.brandScriptDecision !== nextJob.script.status && scriptV1Ok) {
            changes.push({ handle: h, briefCode: bCode || undefined, field: 'Brand duyệt kịch bản', app: job.script.status, sheet: d.brandScriptDecision });
            nextJob.script.status = d.brandScriptDecision;
            nextJob.script.at = nowYmd;
            jobTouched = true;
          }
          if (d.brandDemoDecision && d.brandDemoDecision !== nextJob.script.demoStatus && demoV1Ok) {
            changes.push({ handle: h, briefCode: bCode || undefined, field: 'Brand duyệt demo', app: job.script.demoStatus || 'NONE', sheet: d.brandDemoDecision });
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
      if (stage2Count === 0 || dryRun) break;
      try {
        await updateRecord<DealBoardData>(dealKey(planId), EMPTY_DEAL_BOARD, rec.revision, prev => ({ ...prev, deals: nextDeals }));
        summary.stage2UpdatedJobs = stage2Count;
        break;
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }

    for (const h of duplicateConflicts) {
      changes.push({ handle: h, field: 'Brand duyệt', app: '', sheet: 'Nhiều dòng khác nhau', conflict: 'Sheet có nhiều dòng của KOC này với kết quả khác nhau — app lấy dòng cuối.' });
    }
    return NextResponse.json({
      ok: true,
      dryRun,
      ...summary,
      changes,
      conflicts: changes.filter(c => c.conflict).length,
      sheetRows: rows,
      decisions: Array.from(decisionsByComposite.values()),
    });
  } catch (err) {
    if (err instanceof GoogleSheetsError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
