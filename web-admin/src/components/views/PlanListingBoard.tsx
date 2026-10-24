'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Plus, RefreshCw, Search } from 'lucide-react';
import type { InputPlanBreakdownState, KocItem, KocListingItem, ListingBatchCycle } from '../../lib/types';
import { Button, ConfirmDialog, Field, Input, Modal, Select, Status, Textarea } from '../ui';
import { KL_TIERS, klBaseCost, type KlCode } from '../../lib/klTiers';
import { useListingBoard } from '../../lib/useListingBoard';
import type { ContentSlot } from '../../lib/contentPlanRules';
import { defaultBookingTabName, resolveBrandBookingSheetUrl } from '../../lib/bookingList';
import {
  BATCH_CYCLE_SPECS,
  BOARD_COLUMNS,
  LARK_31_COLUMNS,
  canMove,
  columnOf,
  computeAlerts,
  computeBatchProgress,
  computeProgress,
  createListingItem,
  isPlanListable,
  itemFee,
  itemGrade,
  moveItem,
  parsePastedKocs,
  toLark31Rows,
  computeBrandSlaMetrics,
  getItemSlaBadge,
  type BoardColumn,
  type QuotaKey,
} from '../../lib/listingBoardRules';

interface PlanListingBoardProps {
  kocs: KocItem[];
  currentUserName?: string;
  currentUserId?: string;
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

export const PlanListingBoard: React.FC<PlanListingBoardProps> = ({ kocs, currentUserName = 'Nhân viên', currentUserId = 'staff', onNotify }) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);

  const [plans, setPlans] = useState<InputPlanBreakdownState[]>([]);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<QuotaKey | null>(null);
  const [batchFilter, setBatchFilter] = useState<ListingBatchCycle | null>(null);
  const [picFilter, setPicFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [planSlots, setPlanSlots] = useState<ContentSlot[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/monthly-plans', { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
        if (cancelled) return;
        setPlans((body.plans as { plan: InputPlanBreakdownState }[]).map(p => p.plan));
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
  const activeMonth = month || months[0] || '';
  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listable
      .filter(p => p.month === activeMonth)
      .filter(p => !q || `${p.storeName || ''} ${p.brandName} ${p.pic || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.storeName || a.title).localeCompare(b.storeName || b.title));
  }, [listable, activeMonth, search]);

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

  // --- chuyển trạng thái ---
  const [dropTarget, setDropTarget] = useState<KocListingItem | null>(null);

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
      setDropTarget(item);
      return;
    }
    applyMove(id, to);
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
    notify(
      `Đã thêm ${created.length} KOC vào ${gradeText(addGrade)} (${BATCH_CYCLE_SPECS.find(b => b.key === addBatch)?.shortLabel || addBatch})${addPreview.duplicates ? `, bỏ qua ${addPreview.duplicates} KOC đã có` : ''}${addPreview.over ? '. Ngân sách bậc này đang vượt.' : '.'}`,
      addPreview.over ? 'warning' : 'success'
    );
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
    update(
      items.map(i =>
        i.id === editing.id
          ? {
              ...i,
              proposedFee: editForm.proposedFee,
              finalFee: editForm.finalFee > 0 ? editForm.finalFee : undefined,
              salaryGrade: editForm.grade,
              batchCycle: editForm.batchCycle,
              negotiationNote: editForm.note || undefined,
              updatedAt: new Date().toISOString(),
            }
          : i
      )
    );
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Danh sách kế hoạch đã duyệt */}
      <aside className="space-y-3 rounded-lg border border-line bg-surface p-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={activeMonth} onChange={e => setMonth(e.target.value)}>
            {months.length === 0 && <option value="">Chưa có tháng</option>}
            {months.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-3" />
            <Input className="pl-8" placeholder="Tìm gian hàng" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
          {plansState === 'loading' && <div className="px-2 py-4 text-xs text-ink-3">Đang tải kế hoạch…</div>}
          {plansState === 'ready' && visiblePlans.length === 0 && (
            <div className="px-2 py-4 text-xs text-ink-3">Chưa có kế hoạch nào được Giám đốc duyệt trong tháng này.</div>
          )}
          {visiblePlans.map(p => {
            const required = p.items.filter(i => i.category === 'KOC_TIER').reduce((s, i) => s + (i.qty || 0), 0);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedId(p.id);
                  setTierFilter(null);
                }}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  p.id === selectedId ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'
                }`}
              >
                <div className="truncate text-[13px] font-medium text-ink">{p.storeName || p.title}</div>
                <div className="mt-0.5 flex items-center justify-between text-2xs text-ink-3">
                  <span className="truncate">{p.pic || 'Chưa giao'}</span>
                  <span className="tabular-nums">{fmt(required)} KOC</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Bảng điều phối */}
      <section className="min-w-0 space-y-4">
        {!plan || !progress ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center text-sm text-ink-3">
            Chọn một kế hoạch đã duyệt ở bên trái để bắt đầu listing.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{plan.storeName || plan.title}</h2>
                <div className="mt-0.5 text-xs text-ink-3">
                  {plan.month} · {plan.pic || 'Chưa giao'}
                  {plan.bookingLeader ? ` · Trưởng nhóm ${plan.bookingLeader}` : ''}
                  {statusLabel[status] ? ` · ${statusLabel[status]}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                <Button size="md" variant="secondary" icon={RefreshCw} onClick={() => void openPull()} disabled={items.length === 0}>
                  Lấy kết quả Brand
                </Button>
                <Button size="md" variant="secondary" icon={Download} onClick={() => void exportLark31()} disabled={items.length === 0}>
                  Xuất file 3.1
                </Button>
                <Button size="md" variant="primary" icon={Plus} onClick={() => openAdd()}>
                  Thêm KOC
                </Button>
              </div>
            </div>

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
                    <span className="font-medium text-critical">${brandSla.pendingOverdue} kênh quá hạn</span>
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
                                <span className="tabular-nums">{itemFee(it) ? `${fmt(itemFee(it))}đ` : 'Chưa có giá'}</span>
                              </div>
                              {(picOf(it) || productOf(it)) && <div className="mt-0.5 truncate text-2xs text-ink-3">{[picOf(it), productOf(it)].filter(Boolean).join(' · ')}</div>}
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
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {next && (
                                <button type="button" onClick={() => handleMove(it.id, next.to)} className="rounded bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent hover:bg-accent hover:text-white">
                                  {next.label}
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
          </>
        )}
      </section>


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

      {/* Cho rớt: bắt buộc lý do */}
      <ConfirmDialog
        open={Boolean(dropTarget)}
        title="Cho KOC rớt khỏi kế hoạch"
        message={dropTarget ? `@${(dropTarget.kocHandle || '').replace(/^@/, '')} sẽ không tính vào chỉ tiêu và ngân sách.` : ''}
        confirmLabel="Cho rớt"
        tone="danger"
        reason={{ label: 'Lý do', placeholder: 'Ví dụ: Brand từ chối, KOC không nhận giá, hết hàng mẫu', required: true }}
        onConfirm={reason => {
          if (dropTarget) applyMove(dropTarget.id, 'DROPPED', reason);
          setDropTarget(null);
        }}
        onCancel={() => setDropTarget(null)}
      />

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
            <Button variant="primary" icon={RefreshCw} disabled={pulling || !pullForm.sheetUrl.trim() || !pullForm.tab.trim()} onClick={() => void pullFromSheet()}>
              {pulling ? 'Đang đọc…' : 'Lấy kết quả'}
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
