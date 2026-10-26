'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Download, FileText, MessageSquare, Plus, RefreshCw, Search, Send } from 'lucide-react';
import type { BookingDealItem, InputPlanBreakdownState, KocItem, KocListingItem, ListingBatchCycle, StorePortfolioItem } from '../../lib/types';
import { StoreShortlistFilterModal } from '../shortlist/StoreShortlistFilterModal';
import { Button, Field, Input, Modal, Select, Status, Textarea } from '../ui';
import { KL_TIERS, klBaseCost, type KlCode } from '../../lib/klTiers';
import { useListingBoard } from '../../lib/useListingBoard';
import { hasBrandApprovalBasis } from '../../lib/listingBoardGuard';
import { SheetPullPreviewModal, type SheetPullChange } from './SheetPullPreviewModal';
import { fetchClientMonthlyPlans, getCachedClientMonthlyPlans } from '../../lib/useMonthlyPlanSync';
import type { ContentSlot } from '../../lib/contentPlanRules';
import {
  BOOKING_LIST_COLUMNS,
  buildBookingListRowsFromListingItems,
  defaultBookingTabName,
  resolveBrandBookingSheetUrl,
} from '../../lib/bookingList';
import {
  BATCH_CYCLE_SPECS,
  BOARD_COLUMNS,
  KOC_REJECTION_REASONS_CATALOG,
  LARK_31_COLUMNS,
  buildBrandPriceChangeMessage,
  buildZaloGroupDealConfirmMessage,
  canMove,
  checkKocDuplicateAndPriceWarning,
  columnOf,
  computeAlerts,
  computeBatchProgress,
  computeBrandSlaMetrics,
  computeListingPipelineState,
  computeProgress,
  createListingItem,
  getItemSlaBadge,
  isPlanListable,
  isPlanOfficiallyApproved,
  itemFee,
  itemGrade,
  moveItem,
  parsePastedKocs,
  toLark31Rows,
  type BoardColumn,
  type QuotaKey,
} from '../../lib/listingBoardRules';

interface PlanListingBoardProps {
  kocs: KocItem[];
  /** Cho bộ gợi ý KOC (lịch sử deal, gian hàng) */
  stores?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  /** Thẻ KOC đã chốt: sang bảng Deal và tạo Deal ngay */
  onCreateDeal?: (planId: string, listingItemId: string) => void;
  currentUserName?: string;
  currentUserId?: string;
  initialPlanId?: string;
  initialStoreName?: string;
  initialMonth?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const GRADE_OPTIONS: (KlCode | 'TAP UpAffiliate')[] = [...KL_TIERS.map(t => t.code), 'TAP UpAffiliate'];
const gradeText = (g: string) => (g === 'TAP UpAffiliate' ? 'FOC' : g);

const NEXT_ACTION: Partial<Record<BoardColumn, { to: BoardColumn; label: string }>> = {
  DRAFT: { to: 'WAIT_BRAND', label: 'Gửi Brand' },
  WAIT_BRAND: { to: 'NEGOTIATING', label: 'Brand duyệt' },
  NEGOTIATING: { to: 'CONFIRMED', label: 'KOC nhận, chốt' },
  DROPPED: { to: 'DRAFT', label: 'Khôi phục' },
};

export const PlanListingBoard: React.FC<PlanListingBoardProps> = ({
  kocs,
  stores = [],
  deals = [],
  currentUserName = 'Nhân viên',
  currentUserId = 'staff',
  initialPlanId,
  initialStoreName,
  initialMonth,
  onNotify,
  onCreateDeal,
}) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);

  const [plans, setPlans] = useState<InputPlanBreakdownState[]>(() => getCachedClientMonthlyPlans() || []);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>(() =>
    getCachedClientMonthlyPlans() ? 'ready' : 'loading'
  );
  const [month, setMonth] = useState(initialMonth || '');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialPlanId || null);
  const [tierFilter, setTierFilter] = useState<QuotaKey | null>(null);
  const [batchFilter, setBatchFilter] = useState<ListingBatchCycle | null>(null);
  const [picFilter, setPicFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [planSlots, setPlanSlots] = useState<ContentSlot[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (initialMonth && initialMonth !== month) {
      setMonth(initialMonth);
    }
  }, [initialMonth]);

  useEffect(() => {
    if (initialPlanId && initialPlanId !== selectedId) {
      setSelectedId(initialPlanId);
    }
  }, [initialPlanId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchClientMonthlyPlans();
        if (cancelled) return;
        setPlans(stored.map(p => p.plan));
        setPlansState('ready');
      } catch (err) {
        if (cancelled) return;
        setPlansState('error');
        notify(err instanceof Error ? err.message : 'Không tải được danh sách kế hoạch.', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listable = useMemo(() => plans.filter(isPlanListable), [plans]);
  const months = useMemo(() => Array.from(new Set(listable.map(p => p.month))).sort().reverse(), [listable]);
  const activeMonth = month || initialMonth || months[0] || '';
  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listable
      .filter(p => p.month === activeMonth)
      .filter(p => !q || `${p.storeName || ''} ${p.brandName} ${p.pic || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.storeName || a.title).localeCompare(b.storeName || b.title));
  }, [listable, activeMonth, search]);

  // Tự động chọn kế hoạch đầu tiên hoặc theo context khi dữ liệu sẵn sàng
  useEffect(() => {
    if (visiblePlans.length === 0) return;
    const currentFound = visiblePlans.find(p => p.id === selectedId);
    if (!currentFound) {
      const matchInitial =
        (initialPlanId && visiblePlans.find(p => p.id === initialPlanId)) ||
        (initialStoreName && visiblePlans.find(p => p.storeName === initialStoreName));
      setSelectedId((matchInitial || visiblePlans[0]).id);
    }
  }, [visiblePlans, selectedId, initialPlanId, initialStoreName]);

  const plan = useMemo(() => listable.find(p => p.id === selectedId) || null, [listable, selectedId]);
  const { items, status, update, saveNow, reload } = useListingBoard(plan?.id ?? null, msg => notify(msg, 'warning'));

  interface PullSessionReport {
    pullAt: string;
    tabName: string;
    approved: number;
    rejected: number;
    considering: number;
    unchanged: number;
    reapproved: number;
    approvedHandles: string[];
    rejectedDetails: { handle: string; reason?: string }[];
    consideringHandles: string[];
    notOnSheet: string[];
    slotTaken: string[];
    duplicateConflicts: string[];
  }
  const [pullReport, setPullReport] = useState<PullSessionReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // --- đẩy danh sách KOC trực tiếp từ Bảng Điều phối Listing lên Google Sheet của Brand ---
  const [pushOpen, setPushOpen] = useState(false);
  const [pushForm, setPushForm] = useState({ sheetUrl: '', dot: 1, tab: '' });
  const [pushing, setPushing] = useState(false);
  const [sheetCfg, setSheetCfg] = useState<{ configured: boolean; serviceAccountEmail: string | null } | null>(null);

  const openPush = async () => {
    if (!plan) return;
    setPushForm({ sheetUrl: resolveBrandBookingSheetUrl(plan), dot: 1, tab: defaultBookingTabName(plan, 1) });
    setPushOpen(true);
    fetch('/api/booking-list/push-sheet', { cache: 'no-store' })
      .then(r => r.json())
      .then(b => setSheetCfg({ configured: Boolean(b.configured), serviceAccountEmail: b.serviceAccountEmail ?? null }))
      .catch(() => setSheetCfg({ configured: false, serviceAccountEmail: null }));
    try {
      const res = await fetch(`/api/content-plan?planId=${encodeURIComponent(plan.id)}`, { cache: 'no-store' });
      const body = await res.json();
      if (res.ok && body?.data) {
        setPushForm(f => ({ ...f, sheetUrl: body.data.sheetUrl || f.sheetUrl, tab: body.data.tabName || f.tab }));
      }
    } catch {
      /* giữ giá trị mặc định */
    }
  };

  const pushToSheetFromListing = async () => {
    if (!plan) return;
    // Chỉ đẩy KOC thuộc đợt đã chọn (Đợt 1 = list ngày 10, Đợt 2 = ngày 20, Đợt 3 = ngày 30)
    const batchOfDot = (['BATCH_10', 'BATCH_20', 'BATCH_30'] as const)[Math.min(2, Math.max(0, pushForm.dot - 1))];
    const inBatch = items.filter(i => (i.batchCycle || 'BATCH_10') === batchOfDot);
    const rows = buildBookingListRowsFromListingItems(plan, inBatch, planSlots, kocs);
    if (rows.length === 0) {
      notify(`Đợt ${pushForm.dot} chưa có KOC nào để đẩy lên Google Sheet.`, 'warning');
      return;
    }
    setPushing(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          sheetUrl: pushForm.sheetUrl.trim(),
          tab: pushForm.tab.trim(),
          columns: [...BOOKING_LIST_COLUMNS],
          rows,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        notify(body?.error || `Lỗi ${res.status}`, 'error');
        return;
      }
      await reload();
      setPushOpen(false);
      notify(
        `Đã đẩy ${body.added} dòng mới lên Google Sheet${body.updated ? `, cập nhật ${body.updated} dòng` : ''}${body.skipped ? `, bỏ qua ${body.skipped} dòng đã có` : ''}.`,
        'success'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đẩy được lên Google Sheet.', 'error');
    } finally {
      setPushing(false);
    }
  };

  // --- lấy kết quả Brand duyệt từ Google Sheet ---
  const [pullOpen, setPullOpen] = useState(false);
  const [pullForm, setPullForm] = useState({ sheetUrl: '', dot: 1, tab: '' });
  const [pulling, setPulling] = useState(false);

  const openPull = async () => {
    if (!plan) return;
    setPullForm({ sheetUrl: resolveBrandBookingSheetUrl(plan), dot: 1, tab: defaultBookingTabName(plan, 1) });
    setPullOpen(true);
    try {
      const res = await fetch(`/api/content-plan?planId=${encodeURIComponent(plan.id)}`, { cache: 'no-store' });
      const body = await res.json();
      if (res.ok && body?.data) {
        setPullForm(f => ({ ...f, sheetUrl: body.data.sheetUrl || f.sheetUrl, tab: body.data.tabName || f.tab }));
      }
    } catch {
      /* giữ giá trị mặc định */
    }
  };

  // Kéo Sheet 2 bước: xem trước thay đổi / mâu thuẫn, xác nhận rồi mới ghi
  const [pullPreview, setPullPreview] = useState<SheetPullChange[] | null>(null);
  const previewPull = async () => {
    if (!plan) return;
    setPulling(true);
    try {
      const res = await fetch('/api/booking-list/pull-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, sheetUrl: pullForm.sheetUrl.trim(), tab: pullForm.tab.trim(), dryRun: true }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        notify(body?.error || `Lỗi ${res.status}`, 'error');
        return;
      }
      setPullPreview(body.changes || []);
    } finally {
      setPulling(false);
    }
  };

  const pullFromSheet = async () => {
    if (!plan) return;
    setPulling(true);
    try {
      const res = await fetch('/api/booking-list/pull-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, sheetUrl: pullForm.sheetUrl.trim(), tab: pullForm.tab.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        notify(body?.error || `Lỗi ${res.status}`, 'error');
        return;
      }
      await reload();
      setPullPreview(null);
      setPullOpen(false);

      setPullReport({
        pullAt: body.pullAt || new Date().toISOString(),
        tabName: body.tabName || pullForm.tab,
        approved: body.approved || 0,
        rejected: body.rejected || 0,
        considering: body.considering || 0,
        unchanged: body.unchanged || 0,
        reapproved: body.reapproved || 0,
        approvedHandles: body.approvedHandles || [],
        rejectedDetails: body.rejectedDetails || [],
        consideringHandles: body.consideringHandles || [],
        notOnSheet: body.notOnSheet || [],
        slotTaken: body.slotTaken || [],
        duplicateConflicts: body.duplicateConflicts || [],
      });
      setReportOpen(true);

      const parts = [
        `Brand duyệt mới ${body.approved}`,
        `từ chối ${body.rejected}`,
        `cân nhắc ${body.considering}`,
        `không đổi ${body.unchanged}`,
      ];
      if (body.reapproved) parts.push(`duyệt lại sau khi từ chối ${body.reapproved}`);
      const warnings: string[] = [];
      if (body.rejectedHandles?.length) warnings.push('KOC bị từ chối đã được bỏ gán khỏi content để chọn lại');
      if (body.slotTaken?.length) warnings.push(`${body.slotTaken.join(', ')} được Brand duyệt lại nhưng content đã gán KOC khác`);
      if (body.duplicateConflicts?.length) warnings.push(`${body.duplicateConflicts.join(', ')} có nhiều dòng trả lời khác nhau trên sheet`);
      if (body.notOnSheet?.length) warnings.push(`${body.notOnSheet.length} KOC đã gửi nhưng không thấy trong tab này`);
      notify(`${parts.join(', ')}.${warnings.length ? ` ${warnings.join('. ')}.` : ''}`, warnings.length || body.rejected > 0 ? 'warning' : 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không lấy được kết quả từ Google Sheet.', 'error');
    } finally {
      setPulling(false);
    }
  };

  const progress = useMemo(() => (plan ? computeProgress(plan, items) : null), [plan, items]);
  const batchProgress = useMemo(() => (plan ? computeBatchProgress(plan, items) : []), [plan, items]);
  const brandSla = useMemo(() => computeBrandSlaMetrics(items, 48), [items]);
  const alerts = useMemo(() => (plan ? computeAlerts(plan, items) : []), [plan, items]);
  const [prevPlanId, setPrevPlanId] = useState(plan?.id);
  if (prevPlanId !== plan?.id) {
    setPrevPlanId(plan?.id);
    setPlanSlots([]);
    setPicFilter('');
    setGroupFilter('');
    setBatchFilter(null);
  }

  // Content của kế hoạch: cho biết PIC và sản phẩm của từng KOC trên bảng
  useEffect(() => {
    if (!plan) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/content-plan?planId=${encodeURIComponent(plan.id)}`, { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!cancelled && res.ok) setPlanSlots((body?.data?.slots as ContentSlot[]) || []);
      } catch {
        /* không có content thì bỏ qua bộ lọc PIC và sản phẩm */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan]);
  const slotOf = (i: KocListingItem) => planSlots.find(s => s.id === i.planSlotId);
  const picOf = (i: KocListingItem) => slotOf(i)?.pic || i.assignedStaffName || '';
  const productOf = (i: KocListingItem) => slotOf(i)?.product || '';
  const picOptions = useMemo(() => Array.from(new Set(items.map(i => (planSlots.find(s => s.id === i.planSlotId)?.pic || i.assignedStaffName || '').trim()).filter(Boolean))).sort(), [items, planSlots]);
  const productOptions = useMemo(() => Array.from(new Set(items.map(i => (planSlots.find(s => s.id === i.planSlotId)?.product || '').trim()).filter(Boolean))).sort(), [items, planSlots]);
  const shownItems = useMemo(
    () =>
      items
        .filter(i => !batchFilter || (i.batchCycle || 'BATCH_10') === batchFilter)
        .filter(i => !tierFilter || (itemGrade(i) === 'TAP UpAffiliate' ? 'FOC' : itemGrade(i)) === tierFilter)
        .filter(i => !picFilter || (planSlots.find(s => s.id === i.planSlotId)?.pic || i.assignedStaffName || '').trim() === picFilter)
        .filter(i => !groupFilter || (planSlots.find(s => s.id === i.planSlotId)?.product || '').trim() === groupFilter),
    [items, batchFilter, tierFilter, picFilter, groupFilter, planSlots]
  );

  // --- chuyển trạng thái, từ chối theo 21 lý do chuẩn (§3.2), trình lại Brand (§3.3) & mẫu Zalo chốt Deal (§3.4) ---
  const [dropTarget, setDropTarget] = useState<KocListingItem | null>(null);
  const [dropReasonCode, setDropReasonCode] = useState<string>(KOC_REJECTION_REASONS_CATALOG[0].code);
  const [dropCustomNote, setDropCustomNote] = useState<string>('');
  const [resubmitBrandTarget, setResubmitBrandTarget] = useState<KocListingItem | null>(null);
  const [resubmitForm, setResubmitForm] = useState<{ newFee: number; kpiCommitmentNote: string }>({ newFee: 0, kpiCommitmentNote: '' });
  const [zaloTemplateTarget, setZaloTemplateTarget] = useState<KocListingItem | null>(null);
  const [zaloTemplateForm, setZaloTemplateForm] = useState<{ airDate: string; sowSummary: string }>({
    airDate: '',
    sowSummary: '01 Video TikTok gắn giỏ hàng + Mã Spark Ads 60 ngày',
  });

  const applyMove = (id: string, to: BoardColumn, reason?: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const r = moveItem(item, to, currentUserName, reason);
    if (r.error || !r.item) {
      notify(r.error || 'Không chuyển được.', 'warning');
      return;
    }
    update(items.map(i => (i.id === id ? r.item! : i)));
  };

  const handleMove = (id: string, to: BoardColumn) => {
    const item = items.find(i => i.id === id);
    if (!item || columnOf(item) === to) return;
    if (!canMove(columnOf(item), to)) {
      notify('Không chuyển trực tiếp được sang cột này.', 'warning');
      return;
    }
    if (to === 'DROPPED') {
      setDropReasonCode(KOC_REJECTION_REASONS_CATALOG[0].code);
      setDropCustomNote('');
      setDropTarget(item);
      return;
    }
    // Brand duyệt bằng tay (không qua Sheet): phải ghi bằng chứng, máy chủ chặn nếu thiếu
    const entering = (to === 'NEGOTIATING' || to === 'CONFIRMED') && ['DRAFT', 'WAIT_BRAND'].includes(columnOf(item));
    if (entering && !item.brandApprovedAt && !hasBrandApprovalBasis(item)) {
      setEvidenceText(item.brandApprovalEvidence || '');
      setEvidenceTarget({ item, to });
      return;
    }
    applyMove(id, to);
  };

  // --- bằng chứng Brand duyệt khi không lấy kết quả từ Sheet ---
  const [evidenceTarget, setEvidenceTarget] = useState<{ item: KocListingItem; to: BoardColumn } | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const confirmEvidence = () => {
    if (!evidenceTarget || !evidenceText.trim()) return;
    const withEvidence = { ...evidenceTarget.item, brandApprovalEvidence: evidenceText.trim() };
    const r = moveItem(withEvidence, evidenceTarget.to, currentUserName);
    if (r.error || !r.item) {
      notify(r.error || 'Không chuyển được.', 'warning');
      return;
    }
    update(items.map(i => (i.id === withEvidence.id ? r.item! : i)));
    setEvidenceTarget(null);
  };

  // --- thêm KOC ---
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<'PICK' | 'PASTE'>('PICK');
  const [addGrade, setAddGrade] = useState<KlCode | 'TAP UpAffiliate'>('KL1');
  const [addBatch, setAddBatch] = useState<ListingBatchCycle>('BATCH_10');
  const [pickSearch, setPickSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState('');

  const openAdd = (grade?: KlCode | 'TAP UpAffiliate', batch?: ListingBatchCycle) => {
    if (!plan || !progress) return;
    const withGap = progress.tiers.filter(t => t.gap > 0 && t.key !== 'FOC');
    const fallback = (withGap[0]?.key as KlCode | undefined) || 'KL1';
    setAddGrade(grade || fallback);
    setAddBatch(batch || batchFilter || 'BATCH_10');
    setPicked([]);
    setPasteText('');
    setPickSearch('');
    setAddOpen(true);
  };

  const existingHandles = useMemo(
    () => new Set(items.filter(i => columnOf(i) !== 'DROPPED').map(i => (i.kocHandle || '').replace(/^@/, '').toLowerCase())),
    [items]
  );

  const pickable = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    return kocs
      .filter(k => (k.channelId || '').trim())
      .filter(k => addGrade === 'TAP UpAffiliate' ? true : k.salaryGrade === addGrade)
      .filter(k => !q || `${k.channelId} ${k.stageName}`.toLowerCase().includes(q))
      .slice(0, 80);
  }, [kocs, addGrade, pickSearch]);

  const pastedList = useMemo(() => parsePastedKocs(pasteText), [pasteText]);

  const pendingAdds = useMemo(() => {
    if (addTab === 'PICK') {
      return kocs
        .filter(k => picked.includes(k.id))
        .map(k => ({ handle: k.channelId, koc: k, fee: undefined as number | undefined }));
    }
    return pastedList.map(p => ({
      handle: p.handle,
      koc: kocs.find(k => (k.channelId || '').replace(/^@/, '').toLowerCase() === p.handle.toLowerCase()),
      fee: p.fee,
    }));
  }, [addTab, kocs, picked, pastedList]);

  const addPreview = useMemo(() => {
    const fresh = pendingAdds.filter(p => !existingHandles.has(p.handle.replace(/^@/, '').toLowerCase()));
    const fees = fresh.map(p =>
      addGrade === 'TAP UpAffiliate' ? 0 : p.fee ?? (p.koc?.rateCardVideo && p.koc.rateCardVideo > 0 ? p.koc.rateCardVideo : klBaseCost(addGrade as KlCode))
    );
    const added = fees.reduce((s, f) => s + f, 0);
    const tier = progress?.tiers.find(t => t.key === (addGrade === 'TAP UpAffiliate' ? 'FOC' : addGrade));
    const projected = (tier?.committedBudget ?? 0) + added;
    const required = tier?.requiredBudget ?? 0;
    return { fresh, duplicates: pendingAdds.length - fresh.length, added, projected, required, over: required > 0 && projected > required };
  }, [pendingAdds, existingHandles, addGrade, progress]);

  const confirmAdd = () => {
    if (!plan || addPreview.fresh.length === 0) return;
    const created = addPreview.fresh.map(p =>
      createListingItem({
        plan,
        grade: addGrade,
        handle: p.handle,
        koc: p.koc,
        fee: p.fee,
        actorId: currentUserId,
        actorName: currentUserName,
        batchCycle: addBatch,
      })
    );
    update([...items, ...created]);
    setAddOpen(false);
    void warnDuplicates(created.map(c => c.kocHandle || ''));
    notify(
      `Đã thêm ${created.length} KOC vào ${gradeText(addGrade)} (${BATCH_CYCLE_SPECS.find(b => b.key === addBatch)?.shortLabel || addBatch})${addPreview.duplicates ? `, bỏ qua ${addPreview.duplicates} KOC đã có` : ''}${addPreview.over ? '. Ngân sách bậc này đang vượt.' : '.'}`,
      addPreview.over ? 'warning' : 'success'
    );
  };

  // Cảnh báo (không chặn) khi KOC vừa thêm đang được list ở gian khác cùng nhãn trong tháng
  const warnDuplicates = async (handles: string[]) => {
    if (!plan || handles.length === 0) return;
    try {
      await saveNow();
      const res = await fetch(`/api/listing-board?planId=${encodeURIComponent(plan.id)}&view=duplicates`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      const wanted = new Set(handles.map(h => h.replace(/^@/, '').toLowerCase()));
      const hits = ((body?.duplicates as { handle: string; storeName: string; pic: string }[]) || []).filter(d => wanted.has(d.handle));
      if (hits.length > 0) {
        notify(`KOC đã được list ở gian khác cùng nhãn: ${hits.map(h => `@${h.handle} (${h.storeName}${h.pic ? ` · ${h.pic}` : ''})`).join(', ')}. Kiểm tra để tránh book trùng.`, 'warning');
      }
    } catch {
      /* chỉ là cảnh báo */
    }
  };

  // --- gợi ý KOC (chấm điểm theo lịch sử deal, lấp chỗ thiếu theo KL) đưa thẳng vào bảng này ---
  const [suggestOpen, setSuggestOpen] = useState(false);
  const planStore = useMemo(
    () => (plan ? stores.find(s => (plan.storeId && s.id === plan.storeId) || (plan.storeName && s.storeName === plan.storeName)) : undefined),
    [plan, stores]
  );
  const addSuggested = (newListings: Partial<KocListingItem>[], _store: StorePortfolioItem, batchCycle: ListingBatchCycle) => {
    if (!plan) return;
    const seen = new Set(items.filter(i => i.overallStatus !== 'DROPPED').map(i => (i.kocHandle || '').replace(/^@/, '').toLowerCase()));
    const created = newListings
      .filter(n => n.kocHandle && !seen.has(n.kocHandle.replace(/^@/, '').toLowerCase()))
      .map(n =>
        createListingItem({
          plan,
          grade: (n.salaryGrade as KlCode | 'TAP UpAffiliate') || 'KL1',
          handle: n.kocHandle!,
          koc: kocs.find(k => (k.channelId || '').replace(/^@/, '').toLowerCase() === n.kocHandle!.replace(/^@/, '').toLowerCase()),
          fee: n.proposedFee,
          actorId: currentUserId,
          actorName: currentUserName,
          batchCycle,
        })
      );
    if (created.length === 0) {
      notify('Các KOC gợi ý đã có trên bảng.', 'info');
      return;
    }
    update([...items, ...created]);
    setSuggestOpen(false);
    void warnDuplicates(created.map(c => c.kocHandle || ''));
    notify(`Đã thêm ${created.length} KOC gợi ý vào bảng (cột Nháp).`, 'success');
  };

  // --- sửa một KOC ---
  const [editing, setEditing] = useState<KocListingItem | null>(null);
  const [editForm, setEditForm] = useState({
    proposedFee: 0,
    finalFee: 0,
    grade: 'KL1' as KlCode | 'TAP UpAffiliate',
    batchCycle: 'BATCH_10' as ListingBatchCycle,
    note: '',
  });

  const openEdit = (item: KocListingItem) => {
    setEditing(item);
    setEditForm({
      proposedFee: item.proposedFee || 0,
      finalFee: item.finalFee ?? 0,
      grade: itemGrade(item),
      batchCycle: item.batchCycle || 'BATCH_10',
      note: item.negotiationNote || '',
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const oldFee = itemFee(editing);
    const nextFee = editForm.finalFee > 0 ? editForm.finalFee : editForm.proposedFee;
    const wasApproved =
      editing.brandApprovalStatus === 'BRAND_APPROVED' || editing.overallStatus === 'FINAL_APPROVED';
    const feeIncreasedAfterApproval = wasApproved && nextFee > oldFee;

    update(
      items.map(i => {
        if (i.id !== editing.id) return i;
        const updated: KocListingItem = {
          ...i,
          proposedFee: editForm.proposedFee,
          finalFee: editForm.finalFee > 0 ? editForm.finalFee : undefined,
          salaryGrade: editForm.grade,
          batchCycle: editForm.batchCycle,
          negotiationNote: editForm.note || undefined,
          updatedAt: new Date().toISOString(),
        };
        if (feeIncreasedAfterApproval) {
          return {
            ...updated,
            overallStatus: 'SUBMITTED',
            brandApprovalStatus: 'BRAND_PENDING',
            lastSheetDecision: undefined,
            lastSheetDecisionAt: undefined,
          };
        }
        return updated;
      })
    );
    if (feeIncreasedAfterApproval) {
      notify(
        'Do tăng mức phí sau khi Brand duyệt, KOC đã được chuyển về cột Chờ Brand duyệt lại (Bước 17/19).',
        'warning'
      );
    }
    setEditing(null);
  };

  // --- xuất file 3.1 ---
  const exportLark31 = async () => {
    if (!plan) return;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('3.1 Listing KOCs');
      ws.addRow([...LARK_31_COLUMNS]);
      ws.getRow(1).font = { bold: true };
      toLark31Rows(items).forEach(r => ws.addRow(r));
      ws.columns.forEach(c => {
        c.width = 18;
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `3.1_Listing_${(plan.storeName || plan.brandName).replace(/[^\w.-]+/g, '_')}_${plan.month.replace('/', '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      notify(`Đã xuất ${items.length} dòng theo cột bảng 3.1.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không xuất được file.', 'error');
    }
  };

  const statusLabel: Record<string, string> = {
    idle: '',
    loading: 'Đang tải…',
    saved: 'Đã lưu',
    dirty: 'Chưa lưu',
    saving: 'Đang lưu…',
    error: 'Lưu lỗi',
  };

  const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

  // ---------------------------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Thanh bộ lọc & Thao tác trên đầu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold text-ink-3">Kỳ</span>
            <Select
              value={activeMonth}
              onChange={e => {
                setMonth(e.target.value);
                setSelectedId(null);
              }}
              className="w-[120px]"
            >
              {months.length === 0 && <option value="">Chưa có kỳ</option>}
              {months.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold text-ink-3">Gian hàng</span>
            <Select
              value={selectedId || ''}
              onChange={e => {
                setSelectedId(e.target.value);
                setTierFilter(null);
              }}
              className="min-w-[260px] max-w-[400px]"
            >
              {visiblePlans.length === 0 && <option value="">Không có kế hoạch trong kỳ</option>}
              {visiblePlans.map(p => {
                const required = p.items.filter(i => i.category === 'KOC_TIER').reduce((s, i) => s + (i.qty || 0), 0);
                return (
                  <option key={p.id} value={p.id}>
                    {p.storeName || p.title} ({p.pic || 'Chưa giao'} · {fmt(required)} KOC)
                  </option>
                );
              })}
            </Select>
          </div>

          {plan && (
            <div className="hidden xl:flex items-center gap-2 border-l border-line pl-3 text-xs text-ink-3">
              <span>PIC: <strong className="text-ink">{plan.pic || 'Chưa giao'}</strong></span>
              {plan.bookingLeader && (
                <span>· Trưởng nhóm: <strong className="text-ink">{plan.bookingLeader}</strong></span>
              )}
              {statusLabel[status] && (
                <span className="font-medium text-accent">· {statusLabel[status]}</span>
              )}
            </div>
          )}
        </div>

        {plan && (
          <div className="flex flex-wrap items-center gap-2">
            {status === 'error' && (
              <Button size="sm" variant="secondary" onClick={saveNow}>
                Lưu lại
              </Button>
            )}
            {pullReport && (
              <Button size="md" variant="ghost" icon={FileText} onClick={() => setReportOpen(true)}>
                Xem phiên vừa lấy
              </Button>
            )}
            <Button size="md" variant="secondary" icon={Send} onClick={() => void openPush()} disabled={items.length === 0}>
              Đẩy lên Google Sheet
            </Button>
            <Button size="md" variant="secondary" icon={RefreshCw} onClick={() => void openPull()} disabled={items.length === 0}>
              Lấy kết quả Brand
            </Button>
            <Button size="md" variant="secondary" icon={Download} onClick={() => void exportLark31()} disabled={items.length === 0}>
              Xuất file 3.1
            </Button>
            <Button size="md" variant="secondary" icon={Search} onClick={() => setSuggestOpen(true)}>
              Gợi ý KOC
            </Button>
            <Button size="md" variant="primary" icon={Plus} onClick={() => openAdd()}>
              Thêm KOC
            </Button>
          </div>
        )}
      </div>

      {plansState === 'loading' && (
        <div className="rounded-lg border border-line bg-surface p-12 text-center text-xs text-ink-3">
          Đang tải dữ liệu kế hoạch…
        </div>
      )}

      {plansState === 'ready' && visiblePlans.length === 0 && (
        <div className="rounded-lg border border-dashed border-line p-12 text-center text-xs text-ink-3">
          Chưa có kế hoạch nào được duyệt trong kỳ {activeMonth}.
        </div>
      )}

      {/* Bảng điều phối */}
      {plan && progress && (
        <section className="space-y-4">

            {!isPlanOfficiallyApproved(plan) && (
              <div className="rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-2 text-xs text-warning">
                Kế hoạch 4.1.1 đang ở trạng thái <strong>{plan.status || 'DRAFT'}</strong> — Hệ thống mở khóa cho phép chuyên viên lập sớm Danh sách KOC Đợt 1 (ngày 10–20/T-1) và đẩy Google Sheet xin Brand duyệt trước.
              </div>
            )}

            {(() => {
              // Cảnh báo (không chặn): KOC đã chốt vượt chỉ tiêu / ngân sách của bậc — ví dụ khi bản 4.1 mới về thấp hơn plan nháp
              const over = progress.tiers.filter(t => (t.requiredQty > 0 && t.confirmed > t.requiredQty) || (t.requiredBudget > 0 && t.confirmedBudget > t.requiredBudget));
              if (over.length === 0) return null;
              return (
                <div className="rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-2 text-xs text-ink">
                  <strong>KOC đã chốt vượt chỉ tiêu kế hoạch:</strong>{' '}
                  {over.map(t => `${t.label} ${fmt(t.confirmed)}/${fmt(t.requiredQty)} video · ${fmt(t.confirmedBudget)}/${fmt(t.requiredBudget)}đ`).join(' — ')}.
                  {' '}Kiểm tra lại với kế hoạch 4.1 trước khi tạo thêm Deal.
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: 'Đã list / cần', value: `${fmt(progress.total.listed)} / ${fmt(progress.total.requiredQty)}`, bar: pct(progress.total.listed, progress.total.requiredQty) },
                { label: 'Đã chốt / cần', value: `${fmt(progress.total.confirmed)} / ${fmt(progress.total.requiredQty)}`, bar: pct(progress.total.confirmed, progress.total.requiredQty) },
                { label: 'Cam kết / ngân sách Net', value: `${fmt(progress.total.committedBudget)} / ${fmt(progress.total.requiredBudget)}`, bar: pct(progress.total.committedBudget, progress.total.requiredBudget), over: progress.total.budgetLeft < 0 },
                { label: 'Ngân sách còn lại', value: `${fmt(progress.total.budgetLeft)}`, bar: 0, over: progress.total.budgetLeft < 0 },
              ].map(c => (
                <div key={c.label} className={`rounded-lg border px-3 py-2 ${c.over ? 'border-critical bg-critical-soft' : 'border-line bg-surface'}`}>
                  <div className="text-2xs text-ink-3">{c.label}</div>
                  <div className="text-sm font-semibold tabular-nums text-ink">{c.value}</div>
                  {c.bar > 0 && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-sunken">
                      <div className={`h-full ${c.over ? 'bg-critical' : 'bg-accent'}`} style={{ width: `${c.bar}%` }} />
                    </div>
                  )}
                </div>
              ))}
              <div className={`rounded-lg border px-3 py-2 ${brandSla.pendingOverdue > 0 ? 'border-critical bg-critical-soft' : 'border-line bg-surface'}`}>
                <div className="text-2xs text-ink-3">SLA Brand duyệt (48h)</div>
                <div className="text-sm font-semibold tabular-nums text-ink">
                  {brandSla.totalDecided > 0 ? `${brandSla.onTimeRatePct}% đúng hạn` : `${brandSla.totalPending} chờ duyệt`}
                </div>
                <div className="mt-1 text-2xs tabular-nums text-ink-2">
                  {brandSla.pendingOverdue > 0 ? (
                    <span className="font-medium text-critical">{brandSla.pendingOverdue} kênh quá hạn</span>
                  ) : brandSla.totalDecided > 0 ? (
                    `TB: ${brandSla.avgResponseHours}h phản hồi`
                  ) : (
                    'Không có kênh trễ'
                  )}
                </div>
              </div>
            </div>

            {/* Tiến độ 3 Đợt Listing theo SLA B2C: Ngày 10 (60%) — Ngày 20 (30%) — Ngày 30 (10%) */}
            {batchProgress.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {batchProgress.map(bp => {
                  const active = batchFilter === bp.key;
                  const qtyPct = pct(bp.listedQty, bp.targetQty);
                  return (
                    <button
                      key={bp.key}
                      type="button"
                      onClick={() => setBatchFilter(active ? null : bp.key)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition ${
                        active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">{bp.label}</span>
                        <span className="text-xs font-semibold tabular-nums text-ink">
                          {fmt(bp.listedQty)} / {fmt(bp.targetQty)} KOC ({qtyPct}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-sunken">
                        <div className="h-full bg-accent" style={{ width: `${qtyPct}%` }} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-3">
                        <span>
                          Cam kết: <strong className="text-ink">{fmt(bp.committedBudget)}đ</strong> / {fmt(bp.targetBudget)}đ
                        </span>
                        <span>
                          Đã chốt: <strong className="text-ink">{fmt(bp.confirmedQty)}</strong>
                          {bp.key === 'BATCH_10' ? ` · KL cao (KL3–7): ${bp.highKlListedCount}` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="text-ink-3">
                  <tr className="border-b border-line">
                    <th className="px-3 py-2 text-left font-medium">Bậc</th>
                    <th className="px-3 py-2 text-right font-medium">Cần</th>
                    <th className="px-3 py-2 text-right font-medium">Đã list</th>
                    <th className="px-3 py-2 text-right font-medium">Chờ Brand</th>
                    <th className="px-3 py-2 text-right font-medium">Thương lượng</th>
                    <th className="px-3 py-2 text-right font-medium">Chốt</th>
                    <th className="px-3 py-2 text-right font-medium">Thiếu</th>
                    <th className="px-3 py-2 text-right font-medium">Cam kết / Cần (Net)</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.tiers.map(t => (
                    <tr
                      key={t.key}
                      onClick={() => setTierFilter(tierFilter === t.key ? null : t.key)}
                      className={`cursor-pointer border-t border-line ${tierFilter === t.key ? 'bg-accent-soft' : 'hover:bg-sunken'}`}
                    >
                      <td className="px-3 py-1.5 font-medium text-ink">{t.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(t.requiredQty)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(t.listed)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(t.waitBrand)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(t.negotiating)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(t.confirmed)}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${t.gap > 0 ? 'font-medium text-warning' : 'text-positive'}`}>{t.gap > 0 ? fmt(t.gap) : 'Đủ'}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${t.budgetLeft < 0 ? 'font-medium text-critical' : 'text-ink-2'}`}>
                        {fmt(t.committedBudget)} / {fmt(t.requiredBudget)}
                      </td>
                    </tr>
                  ))}
                  {progress.tiers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-ink-3">
                        Kế hoạch này chưa có chỉ tiêu theo bậc KL. Cần chuyên viên phân rã tuần trước.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {alerts.length > 0 && (
              <div className="rounded-lg border border-line bg-surface px-4 py-3 text-xs">
                <ul className="space-y-1">
                  {alerts.slice(0, 8).map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Status tone={a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'neutral'}>
                        {a.severity === 'critical' ? 'Vượt' : a.severity === 'warning' ? 'Cần xem' : 'Thiếu'}
                      </Status>
                      <span className="text-ink-2">{a.message}</span>
                    </li>
                  ))}
                  {alerts.length > 8 && <li className="text-ink-3">và {alerts.length - 8} cảnh báo khác</li>}
                </ul>
              </div>
            )}

            {(picOptions.length > 0 || productOptions.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {picOptions.length > 0 && (
                  <Select value={picFilter} onChange={e => setPicFilter(e.target.value)} className="w-[200px]">
                    <option value="">Tất cả PIC</option>
                    {picOptions.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                )}
                {productOptions.length > 0 && (
                  <Select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="w-[260px]">
                    <option value="">Tất cả sản phẩm</option>
                    {productOptions.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}
            {(tierFilter || batchFilter) && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent-soft px-3 py-1.5 text-xs text-ink-2">
                <span>
                  Đang lọc:{' '}
                  {[
                    batchFilter ? BATCH_CYCLE_SPECS.find(b => b.key === batchFilter)?.shortLabel || batchFilter : '',
                    tierFilter ? `Bậc ${gradeText(tierFilter)}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTierFilter(null);
                    setBatchFilter(null);
                  }}
                  className="font-medium text-accent hover:underline"
                >
                  Bỏ lọc
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {BOARD_COLUMNS.map(col => {
                const cards = shownItems.filter(i => columnOf(i) === col.key);
                const dragging = dragId ? items.find(i => i.id === dragId) : undefined;
                const droppable = dragging ? canMove(columnOf(dragging), col.key) : false;
                return (
                  <div
                    key={col.key}
                    onDragOver={e => {
                      if (droppable) e.preventDefault();
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      const id = dragId || e.dataTransfer.getData('text/plain');
                      setDragId(null);
                      if (id) handleMove(id, col.key);
                    }}
                    className={`min-h-[160px] rounded-lg border bg-sunken/40 p-2 transition ${droppable ? 'border-accent' : 'border-line'}`}
                  >
                    <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-ink-2">
                      <span>{col.label}</span>
                      <span className="tabular-nums text-ink-3">{cards.length}</span>
                    </div>
                    <div className="space-y-2">
                      {cards.map(it => {
                        const next = NEXT_ACTION[col.key];
                        const handle = (it.kocHandle || '').replace(/^@/, '');
                        const pipe = computeListingPipelineState(it);
                        const warnCheck = checkKocDuplicateAndPriceWarning(it.kocHandle, itemFee(it), items.filter(x => x.id !== it.id), kocs);
                        return (
                          <div
                            key={it.id}
                            draggable
                            onDragStart={e => {
                              setDragId(it.id);
                              e.dataTransfer.setData('text/plain', it.id);
                            }}
                            onDragEnd={() => setDragId(null)}
                            className="cursor-grab rounded-md border border-line bg-surface p-2 text-xs shadow-2xs active:cursor-grabbing"
                          >
                            <button type="button" onClick={() => openEdit(it)} className="block w-full text-left">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-ink">@{handle}</span>
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="rounded bg-sunken px-1.5 py-0.5 text-2xs font-medium text-ink-3">
                                    {it.batchCycle === 'BATCH_20' ? 'Đợt 2' : it.batchCycle === 'BATCH_30' ? 'Đợt 3' : 'Đợt 1'}
                                  </span>
                                  <span className="rounded bg-sunken px-1.5 py-0.5 text-2xs font-medium text-ink-2">{gradeText(itemGrade(it))}</span>
                                </div>
                              </div>
                              <div className="mt-0.5 flex items-center justify-between text-2xs text-ink-3">
                                <span className="truncate">{it.kocName !== handle ? it.kocName : ' '}</span>
                                <span className="tabular-nums">{itemFee(it) ? `${fmt(itemFee(it))}đ` : '0đ (FOC)'}</span>
                              </div>
                              {(picOf(it) || productOf(it)) && <div className="mt-0.5 truncate text-2xs text-ink-3">{[picOf(it), productOf(it)].filter(Boolean).join(' · ')}</div>}
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-3xs font-medium text-accent">
                                  {pipe.code}: {pipe.subStatusLabel}
                                </span>
                                <span className="rounded bg-sunken px-1.5 py-0.5 text-3xs text-ink-2">
                                  {pipe.ballLabel}
                                </span>
                              </div>
                              {warnCheck.priceHikeWarning && (
                                <div className="mt-1 rounded bg-warning-soft px-1.5 py-0.5 text-3xs text-warning">
                                  {warnCheck.priceHikeWarning}
                                </div>
                              )}
                              {col.key === 'DROPPED' && it.dropReason && <div className="mt-1 truncate text-2xs text-critical">{it.dropReason}</div>}
                              {(() => {
                                const sla = getItemSlaBadge(it, 48);
                                if (!sla) return null;
                                return (
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium ${
                                        sla.variant === 'critical'
                                          ? 'bg-critical-soft text-critical'
                                          : sla.variant === 'warning'
                                          ? 'bg-warning-soft text-warning'
                                          : 'bg-success-soft text-success'
                                      }`}
                                    >
                                      {sla.label}
                                    </span>
                                  </div>
                                );
                              })()}
                            </button>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              {next && (
                                <button type="button" onClick={() => handleMove(it.id, next.to)} className="rounded bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent hover:bg-accent hover:text-white">
                                  {next.label}
                                </button>
                              )}
                              {(col.key === 'DRAFT' || col.key === 'WAIT_BRAND') &&
                                (itemFee(it) <= 0 ||
                                  it.salaryGrade === 'TAP UpAffiliate' ||
                                  /brand\s*chỉ\s*định|kol\s*chỉ\s*định/i.test(it.negotiationNote || '')) && (
                                  <button
                                    type="button"
                                    onClick={() => handleMove(it.id, 'CONFIRMED')}
                                    className="rounded bg-success-soft px-2 py-0.5 text-2xs font-medium text-success hover:bg-success hover:text-white"
                                    title="Chốt thẳng cho KOC FOC 0đ hoặc KOL do Brand chỉ định"
                                  >
                                    Chốt thẳng
                                  </button>
                                )}
                              {col.key === 'NEGOTIATING' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResubmitForm({ newFee: itemFee(it), kpiCommitmentNote: 'Cam kết duy trì view ổn định + hỗ trợ mã Spark Ads 60 ngày' });
                                    setResubmitBrandTarget(it);
                                  }}
                                  className="rounded bg-warning-soft px-2 py-0.5 text-2xs font-medium text-warning hover:bg-warning hover:text-white"
                                  title="KOC tăng giá hoặc đổi lịch -> Tạo tin nhắn thuyết phục & trình lại Brand duyệt"
                                >
                                  Trình lại Brand
                                </button>
                              )}
                              {col.key === 'CONFIRMED' && onCreateDeal && plan && (
                                <button
                                  type="button"
                                  onClick={() => onCreateDeal(plan.id, it.id)}
                                  className="rounded bg-accent px-2 py-0.5 text-2xs font-medium text-white hover:opacity-90"
                                  title="Sang bảng Deal & nghiệm thu và tạo Deal cho KOC này (mở Deal nếu đã có)"
                                >
                                  Tạo Deal
                                </button>
                              )}
                              {(col.key === 'NEGOTIATING' || col.key === 'CONFIRMED') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setZaloTemplateForm({
                                      airDate: '',
                                      sowSummary: '01 Video TikTok gắn giỏ hàng + Mã Spark Ads 60 ngày',
                                    });
                                    setZaloTemplateTarget(it);
                                  }}
                                  className="rounded bg-sunken px-2 py-0.5 text-2xs font-medium text-ink-2 hover:bg-accent-soft hover:text-accent"
                                  title="Mở mẫu tin nhắn mở nhóm Zalo & xác nhận chốt Deal (§3.4)"
                                >
                                  Mẫu Zalo
                                </button>
                              )}
                              {col.key !== 'DROPPED' && col.key !== 'CONFIRMED' && (
                                <button type="button" onClick={() => handleMove(it.id, 'DROPPED')} className="rounded px-2 py-0.5 text-2xs text-ink-3 hover:bg-critical-soft hover:text-critical">
                                  Rớt
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        </section>
      )}


      {/* Modal Báo cáo phiên lấy kết quả Brand duyệt */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Tổng hợp phiên lấy kết quả Brand duyệt"
        size="xl"
        footer={
          <Button variant="primary" onClick={() => setReportOpen(false)}>
            Đã xem xong
          </Button>
        }
      >
        {pullReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2 text-xs text-ink-3">
              <span>Tab Google Sheet: <strong className="text-ink">{pullReport.tabName}</strong></span>
              <span>Thời gian lấy: <strong className="text-ink">{new Date(pullReport.pullAt).toLocaleTimeString('vi-VN')} {new Date(pullReport.pullAt).toLocaleDateString('vi-VN')}</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-success/30 bg-success-soft p-3">
                <div className="text-2xs text-ink-3">Duyệt mới</div>
                <div className="text-lg font-semibold text-success tabular-nums">{pullReport.approved}</div>
              </div>
              <div className="rounded-lg border border-critical/30 bg-critical-soft p-3">
                <div className="text-2xs text-ink-3">Từ chối</div>
                <div className="text-lg font-semibold text-critical tabular-nums">{pullReport.rejected}</div>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
                <div className="text-2xs text-ink-3">Cân nhắc</div>
                <div className="text-lg font-semibold text-warning tabular-nums">{pullReport.considering}</div>
              </div>
              <div className="rounded-lg border border-line bg-sunken/40 p-3">
                <div className="text-2xs text-ink-3">Không đổi</div>
                <div className="text-lg font-semibold text-ink tabular-nums">{pullReport.unchanged}</div>
              </div>
            </div>

            {(pullReport.duplicateConflicts.length > 0 || pullReport.notOnSheet.length > 0 || pullReport.slotTaken.length > 0) && (
              <div className="space-y-2 rounded-lg border border-critical/30 bg-critical-soft p-3 text-xs">
                <div className="font-semibold text-critical">Cảnh báo dữ liệu trên Google Sheet:</div>
                {pullReport.duplicateConflicts.length > 0 && (
                  <div className="text-critical">
                    • <strong>Mâu thuẫn kết quả:</strong> Kênh @{pullReport.duplicateConflicts.join(', @')} xuất hiện nhiều dòng trên sheet với các câu trả lời khác nhau (hệ thống đã lấy câu trả lời ở dòng cuối).
                  </div>
                )}
                {pullReport.notOnSheet.length > 0 && (
                  <div className="text-critical">
                    • <strong>Mất dòng trên Sheet:</strong> Có {pullReport.notOnSheet.length} KOC đã gửi nhưng không tìm thấy trong tab này (@{pullReport.notOnSheet.slice(0, 5).join(', @')}{pullReport.notOnSheet.length > 5 ? '…' : ''}).
                  </div>
                )}
                {pullReport.slotTaken.length > 0 && (
                  <div className="text-warning">
                    • <strong>Trùng vị trí content:</strong> Kênh @{pullReport.slotTaken.join(', @')} được Brand duyệt lại sau khi từ chối, nhưng vị trí content đã được gán KOC khác.
                  </div>
                )}
              </div>
            )}

            {pullReport.approvedHandles.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-line bg-surface p-3 text-xs">
                <div className="font-medium text-success">
                  KOC được Brand duyệt ({pullReport.approvedHandles.length}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pullReport.approvedHandles.map(h => (
                    <span key={h} className="rounded bg-success-soft px-2 py-0.5 font-medium text-success">
                      @{h}
                    </span>
                  ))}
                </div>
                <div className="text-2xs text-ink-3">Đã tự động chuyển sang cột Thương lượng KOC để chốt điều khoản.</div>
              </div>
            )}

            {pullReport.rejectedDetails.length > 0 && (
              <div className="space-y-2 rounded-lg border border-line bg-surface p-3 text-xs">
                <div className="font-medium text-critical">
                  KOC bị Brand từ chối ({pullReport.rejectedDetails.length}):
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-line/60">
                  {pullReport.rejectedDetails.map(item => (
                    <div key={item.handle} className="flex items-start justify-between py-1">
                      <span className="font-medium text-ink">@{item.handle}</span>
                      <span className="text-ink-2 text-right text-2xs italic">
                        {item.reason ? `Lý do: ${item.reason}` : 'Không ghi lý do'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-2xs text-ink-3">Đã tự động bỏ gán khỏi kế hoạch content để chuyên viên chọn KOC khác thay thế.</div>
              </div>
            )}

            {pullReport.consideringHandles.length > 0 && (
              <div className="space-y-1 rounded-lg border border-line bg-surface p-3 text-xs">
                <div className="font-medium text-warning">
                  KOC Brand đang cân nhắc ({pullReport.consideringHandles.length}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pullReport.consideringHandles.map(h => (
                    <span key={h} className="rounded bg-warning-soft px-2 py-0.5 font-medium text-warning">
                      @{h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Thêm KOC */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Thêm KOC vào kế hoạch"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" disabled={addPreview.fresh.length === 0} onClick={confirmAdd}>
              {`Thêm ${addPreview.fresh.length} KOC`}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Đợt Listing (SLA 60% / 30% / 10%)">
              <Select value={addBatch} onChange={e => setAddBatch(e.target.value as ListingBatchCycle)}>
                {BATCH_CYCLE_SPECS.map(b => (
                  <option key={b.key} value={b.key}>
                    {b.shortLabel}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bậc KL">
              <Select value={addGrade} onChange={e => setAddGrade(e.target.value as KlCode | 'TAP UpAffiliate')}>
                {GRADE_OPTIONS.map(g => (
                  <option key={g} value={g}>
                    {g === 'TAP UpAffiliate' ? 'FOC (0đ)' : KL_TIERS.find(t => t.code === g)?.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cách thêm">
              <Select value={addTab} onChange={e => setAddTab(e.target.value as 'PICK' | 'PASTE')}>
                <option value="PICK">Chọn từ Danh bạ KOC</option>
                <option value="PASTE">Dán danh sách</option>
              </Select>
            </Field>
          </div>

          {addTab === 'PICK' ? (
            <>
              <Input placeholder="Tìm theo ID kênh hoặc tên" value={pickSearch} onChange={e => setPickSearch(e.target.value)} />
              <div className="max-h-64 overflow-y-auto rounded-md border border-line">
                {pickable.length === 0 && <div className="px-3 py-6 text-center text-xs text-ink-3">Không có KOC phù hợp trong Danh bạ.</div>}
                {pickable.map(k => {
                  const dup = existingHandles.has((k.channelId || '').replace(/^@/, '').toLowerCase());
                  return (
                    <label key={k.id} className={`flex items-center gap-3 border-b border-line px-3 py-1.5 text-xs last:border-b-0 ${dup ? 'opacity-50' : 'cursor-pointer hover:bg-sunken'}`}>
                      <input
                        type="checkbox"
                        disabled={dup}
                        checked={picked.includes(k.id)}
                        onChange={e => setPicked(e.target.checked ? [...picked, k.id] : picked.filter(x => x !== k.id))}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">@{k.channelId}</span>
                      <span className="truncate text-ink-3">{k.stageName}</span>
                      <span className="w-24 text-right tabular-nums text-ink-2">{k.rateCardVideo ? `${fmt(k.rateCardVideo)}đ` : '—'}</span>
                      {dup && <span className="text-2xs text-ink-3">Đã có</span>}
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <Field label="Mỗi dòng một KOC: ID kênh hoặc link TikTok, có thể thêm giá sau dấu ; (ví dụ megauriviu; 1.500.000)">
              <Textarea rows={7} value={pasteText} onChange={e => setPasteText(e.target.value)} />
            </Field>
          )}

          <div className={`rounded-md px-3 py-2 text-xs ${addPreview.over ? 'bg-critical-soft text-critical' : 'bg-sunken text-ink-2'}`}>
            {addPreview.fresh.length} KOC mới, thêm {fmt(addPreview.added)}đ. Cam kết bậc này sau khi thêm: {fmt(addPreview.projected)}đ
            {addPreview.required > 0 ? ` trên ${fmt(addPreview.required)}đ` : ''}
            {addPreview.over ? ` (vượt ${fmt(addPreview.projected - addPreview.required)}đ)` : ''}
            {addPreview.duplicates > 0 ? `. Bỏ qua ${addPreview.duplicates} KOC đã có.` : '.'}
          </div>
        </div>
      </Modal>

      {/* Sửa một KOC */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `@${(editing.kocHandle || '').replace(/^@/, '')}` : ''}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              Lưu
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bậc KL">
            <Select value={editForm.grade} onChange={e => setEditForm({ ...editForm, grade: e.target.value as KlCode | 'TAP UpAffiliate' })}>
              {GRADE_OPTIONS.map(g => (
                <option key={g} value={g}>
                  {g === 'TAP UpAffiliate' ? 'FOC (0đ)' : KL_TIERS.find(t => t.code === g)?.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Đợt Listing">
            <Select value={editForm.batchCycle} onChange={e => setEditForm({ ...editForm, batchCycle: e.target.value as ListingBatchCycle })}>
              {BATCH_CYCLE_SPECS.map(b => (
                <option key={b.key} value={b.key}>
                  {b.shortLabel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Giá net đề xuất (đ)">
            <Input inputMode="numeric" value={editForm.proposedFee ? fmt(editForm.proposedFee) : ''} onChange={e => setEditForm({ ...editForm, proposedFee: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
          </Field>
          <Field label="Giá net chốt (đ)">
            <Input inputMode="numeric" value={editForm.finalFee ? fmt(editForm.finalFee) : ''} onChange={e => setEditForm({ ...editForm, finalFee: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
          </Field>
          <Field label="Ghi chú thương lượng" className="col-span-2">
            <Textarea rows={3} value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Cho rớt: chọn 1 trong 21 lý do chuẩn Mục 3.2 kèm gợi ý đàm phán */}
      <Modal
        open={Boolean(dropTarget)}
        onClose={() => setDropTarget(null)}
        title={dropTarget ? `Cho rớt @${(dropTarget.kocHandle || '').replace(/^@/, '')} (Pipeline 19)` : 'Cho KOC rớt khỏi kế hoạch'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDropTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!dropTarget) return;
                const spec = KOC_REJECTION_REASONS_CATALOG.find(r => r.code === dropReasonCode);
                const fullReason = `${spec ? `[${spec.code}] ${spec.label}` : dropReasonCode}${dropCustomNote.trim() ? ` — ${dropCustomNote.trim()}` : ''}`;
                applyMove(dropTarget.id, 'DROPPED', fullReason);
                setDropTarget(null);
              }}
            >
              Xác nhận cho rớt
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Chọn lý do từ chối / rớt chuẩn (21 lý do Mục 3.2)">
            <Select value={dropReasonCode} onChange={e => setDropReasonCode(e.target.value)}>
              {KOC_REJECTION_REASONS_CATALOG.map(r => (
                <option key={r.code} value={r.code}>
                  {r.code} ({r.group}) — {r.label}
                </option>
              ))}
            </Select>
          </Field>
          {(() => {
            const spec = KOC_REJECTION_REASONS_CATALOG.find(r => r.code === dropReasonCode);
            if (!spec) return null;
            return (
              <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-ink">
                <div className="font-semibold text-warning">Hướng xử lý / Đàm phán gợi ý trước khi cho rớt:</div>
                <div className="mt-0.5 text-ink-2">{spec.negotiationPlaybook}</div>
              </div>
            );
          })()}
          <Field label="Ghi chú chi tiết bổ sung">
            <Textarea rows={2} value={dropCustomNote} onChange={e => setDropCustomNote(e.target.value)} />
          </Field>
        </div>
      </Modal>

      {/* Đẩy danh sách KOC trực tiếp từ Bảng điều phối lên Google Sheet */}
      <Modal
        open={pushOpen}
        onClose={() => setPushOpen(false)}
        title="Đẩy danh sách KOC lên Google Sheet của Brand"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPushOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              icon={Send}
              disabled={pushing || !sheetCfg?.configured || !pushForm.sheetUrl.trim() || !pushForm.tab.trim()}
              onClick={() => void pushToSheetFromListing()}
            >
              {pushing ? 'Đang đẩy…' : 'Đẩy lên Google Sheet'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {sheetCfg && !sheetCfg.configured && (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              Chưa cấu hình tài khoản dịch vụ Google. Vui lòng dùng nút Xuất file 3.1 hoặc nhờ quản trị khai báo biến môi trường Google Service Account.
            </div>
          )}
          {sheetCfg?.configured && (
            <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
              Sheet của Brand cần chia sẻ quyền chỉnh sửa cho <strong>{sheetCfg.serviceAccountEmail}</strong>. Hệ thống so khớp theo cặp (ID kênh + Mã Brief).
            </div>
          )}
          <Field label="Link Google Sheet của Brand">
            <Input value={pushForm.sheetUrl} onChange={e => setPushForm({ ...pushForm, sheetUrl: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đợt">
              <Select
                value={String(pushForm.dot)}
                onChange={e => {
                  const dot = parseInt(e.target.value, 10) || 1;
                  setPushForm({ ...pushForm, dot, tab: plan ? defaultBookingTabName(plan, dot) : pushForm.tab });
                }}
              >
                <option value="1">Đợt 1</option>
                <option value="2">Đợt 2</option>
                <option value="3">Đợt 3</option>
              </Select>
            </Field>
            <Field label="Tên tab">
              <Input value={pushForm.tab} onChange={e => setPushForm({ ...pushForm, tab: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Modal Trình lại Brand khi KOC tăng giá / đổi lịch (Mục 3.3) */}
      <Modal
        open={Boolean(resubmitBrandTarget)}
        onClose={() => setResubmitBrandTarget(null)}
        title={resubmitBrandTarget ? `Trình lại Brand duyệt giá mới — @${(resubmitBrandTarget.kocHandle || '').replace(/^@/, '')}` : 'Trình lại Brand'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResubmitBrandTarget(null)}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              icon={Copy}
              onClick={() => {
                if (!resubmitBrandTarget || !plan) return;
                const msg = buildBrandPriceChangeMessage({
                  brandName: plan.brandName,
                  kocHandle: resubmitBrandTarget.kocHandle,
                  oldFee: itemFee(resubmitBrandTarget),
                  newFee: resubmitForm.newFee,
                  kpiCommitmentNote: resubmitForm.kpiCommitmentNote,
                });
                void navigator.clipboard.writeText(msg);
                notify('Đã sao chép tin nhắn thuyết phục Brand (§3.3).', 'success');
              }}
            >
              Sao chép tin nhắn gửi Brand
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!resubmitBrandTarget) return;
                const updated = items.map(i =>
                  i.id === resubmitBrandTarget.id
                    ? {
                        ...(moveItem(i, 'WAIT_BRAND', currentUserName).item || i),
                        proposedFee: resubmitForm.newFee,
                        finalFee: resubmitForm.newFee,
                        negotiationNote: `Trình lại Brand duyệt giá mới ${fmt(resubmitForm.newFee)}đ (${resubmitForm.kpiCommitmentNote})`,
                      }
                    : i
                );
                update(updated);
                setResubmitBrandTarget(null);
                notify('Đã cập nhật giá đề xuất mới và chuyển KOC về cột Chờ Brand duyệt lại.', 'success');
              }}
            >
              Cập nhật giá & Chuyển về Chờ Brand duyệt
            </Button>
          </>
        }
      >
        {resubmitBrandTarget && plan && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Giá cũ Brand đã duyệt (đ)">
                <Input disabled value={fmt(itemFee(resubmitBrandTarget))} />
              </Field>
              <Field label="Giá mới KOC báo lại (đ)">
                <Input
                  inputMode="numeric"
                  value={resubmitForm.newFee ? fmt(resubmitForm.newFee) : ''}
                  onChange={e => setResubmitForm({ ...resubmitForm, newFee: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })}
                />
              </Field>
              <Field label="Lý do / Cam kết chỉ số KPI để thuyết phục Brand" className="col-span-2">
                <Input value={resubmitForm.kpiCommitmentNote} onChange={e => setResubmitForm({ ...resubmitForm, kpiCommitmentNote: e.target.value })} />
              </Field>
            </div>
            <Field label="Mẫu tin nhắn gửi Brand (Mục 3.3)">
              <Textarea
                rows={4}
                readOnly
                value={buildBrandPriceChangeMessage({
                  brandName: plan.brandName,
                  kocHandle: resubmitBrandTarget.kocHandle,
                  oldFee: itemFee(resubmitBrandTarget),
                  newFee: resubmitForm.newFee,
                  kpiCommitmentNote: resubmitForm.kpiCommitmentNote,
                })}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Modal Mẫu tin nhắn mở nhóm Zalo & xác nhận chốt Deal (Mục 3.4) */}
      <Modal
        open={Boolean(zaloTemplateTarget)}
        onClose={() => setZaloTemplateTarget(null)}
        title={zaloTemplateTarget ? `Mẫu tin nhắn mở nhóm Zalo & Chốt Deal — @${(zaloTemplateTarget.kocHandle || '').replace(/^@/, '')}` : 'Mẫu Zalo Chốt Deal'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setZaloTemplateTarget(null)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              icon={Copy}
              onClick={() => {
                if (!zaloTemplateTarget || !plan) return;
                const msg = buildZaloGroupDealConfirmMessage({
                  brandName: plan.brandName,
                  storeName: plan.storeName || plan.title,
                  kocName: zaloTemplateTarget.kocName || zaloTemplateTarget.kocHandle,
                  kocHandle: zaloTemplateTarget.kocHandle,
                  productName: productOf(zaloTemplateTarget) || plan.brandName,
                  finalFee: itemFee(zaloTemplateTarget),
                  airDate: zaloTemplateForm.airDate,
                  sowSummary: zaloTemplateForm.sowSummary,
                  picName: picOf(zaloTemplateTarget) || currentUserName,
                });
                void navigator.clipboard.writeText(msg);
                notify('Đã sao chép tin nhắn mở nhóm Zalo & xác nhận chốt Deal (§3.4).', 'success');
              }}
            >
              Sao chép tin nhắn Zalo
            </Button>
          </>
        }
      >
        {zaloTemplateTarget && plan && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày dự kiến lên sóng (Air)">
                <Input type="date" value={zaloTemplateForm.airDate} onChange={e => setZaloTemplateForm({ ...zaloTemplateForm, airDate: e.target.value })} />
              </Field>
              <Field label="Hạng mục SOW thỏa thuận">
                <Input value={zaloTemplateForm.sowSummary} onChange={e => setZaloTemplateForm({ ...zaloTemplateForm, sowSummary: e.target.value })} />
              </Field>
            </div>
            <Field label="Nội dung tin nhắn chuẩn gửi vào nhóm Zalo (Mục 3.4)">
              <Textarea
                rows={9}
                readOnly
                value={buildZaloGroupDealConfirmMessage({
                  brandName: plan.brandName,
                  storeName: plan.storeName || plan.title,
                  kocName: zaloTemplateTarget.kocName || zaloTemplateTarget.kocHandle,
                  kocHandle: zaloTemplateTarget.kocHandle,
                  productName: productOf(zaloTemplateTarget) || plan.brandName,
                  finalFee: itemFee(zaloTemplateTarget),
                  airDate: zaloTemplateForm.airDate,
                  sowSummary: zaloTemplateForm.sowSummary,
                  picName: picOf(zaloTemplateTarget) || currentUserName,
                })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <SheetPullPreviewModal
        open={pullPreview !== null}
        changes={pullPreview || []}
        busy={pulling}
        onCancel={() => setPullPreview(null)}
        onConfirm={() => void pullFromSheet()}
      />

      {plan && (
        <StoreShortlistFilterModal
          isOpen={suggestOpen}
          onClose={() => setSuggestOpen(false)}
          stores={stores}
          kocs={kocs}
          deals={deals}
          existingListings={items}
          initialStoreId={planStore?.id}
          activePlan={plan}
          currentUserName={currentUserName}
          onAddToListingBatch={addSuggested}
          onNotify={onNotify}
        />
      )}

      <Modal
        open={!!evidenceTarget}
        onClose={() => setEvidenceTarget(null)}
        title="Bằng chứng Brand duyệt"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEvidenceTarget(null)}>
              Hủy
            </Button>
            <Button variant="primary" disabled={!evidenceText.trim()} onClick={confirmEvidence}>
              Ghi nhận Brand duyệt
            </Button>
          </>
        }
      >
        {evidenceTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-ink-2">
              KOC <span className="font-medium text-ink">{evidenceTarget.item.kocHandle || evidenceTarget.item.kocName}</span> chưa có kết quả Brand duyệt từ Google Sheet.
              Nếu Brand duyệt qua kênh khác (Zalo, email, KOL Brand chỉ định), dán link hoặc mô tả bằng chứng để lưu lại.
            </p>
            <Field label="Link / mô tả bằng chứng">
              <Textarea
                rows={3}
                value={evidenceText}
                placeholder="VD: https://… ảnh chụp tin nhắn Brand xác nhận ngày 25/10"
                onChange={e => setEvidenceText(e.target.value)}
              />
            </Field>
            <p className="text-2xs text-ink-3">Cách được khuyến nghị: Đẩy lên Google Sheet rồi Lấy kết quả Brand duyệt.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={pullOpen}
        onClose={() => setPullOpen(false)}
        title="Lấy kết quả Brand duyệt"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPullOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" icon={RefreshCw} disabled={pulling || !pullForm.sheetUrl.trim() || !pullForm.tab.trim()} onClick={() => void previewPull()}>
              {pulling ? 'Đang đọc…' : 'Xem trước kết quả'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Link Google Sheet của Brand">
            <Input value={pullForm.sheetUrl} onChange={e => setPullForm({ ...pullForm, sheetUrl: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đợt">
              <Select
                value={String(pullForm.dot)}
                onChange={e => {
                  const dot = parseInt(e.target.value, 10) || 1;
                  setPullForm({ ...pullForm, dot, tab: plan ? defaultBookingTabName(plan, dot) : pullForm.tab });
                }}
              >
                <option value="1">Đợt 1</option>
                <option value="2">Đợt 2</option>
                <option value="3">Đợt 3</option>
              </Select>
            </Field>
            <Field label="Tên tab">
              <Input value={pullForm.tab} onChange={e => setPullForm({ ...pullForm, tab: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
};
