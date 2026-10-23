'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Lightbulb, Plus, Search, Send, Trash2, UserPlus } from 'lucide-react';
import type { BookingDealItem, InputPlanBreakdownState, KocItem, StorePortfolioItem } from '../../lib/types';
import { Button, ConfirmDialog, Field, Input, Modal, Select, Status, Textarea } from '../ui';
import { CONTENT_PILLARS, pillarGroupOf } from '../../lib/contentPillars';
import {
  BRIEF_FORMAT_OPTIONS,
  CONTENT_ROWS,
  diagnoseContentPlan,
  ensureSequentialBriefCodes,
  formatBriefCode,
  generateMissingSlotsFromBreakdown,
  isBriefReady,
  isPlaced,
  newSlot,
  requiredGrid,
  slotSpecsFromBrandPlan,
  slotTargetQty,
  syncSlotsFromBrandPlan,
  type ContentPlanData,
  type ContentRowKey,
  type ContentSlot,
} from '../../lib/contentPlanRules';
import { usePlanRecord } from '../../lib/usePlanRecord';
import { detectChannel, type BrandPlanData, type PlanChannel } from '../../lib/brandPlanRules';
import { CreatorMatchModal } from './CreatorMatchModal';
import { ContentCopilotModal } from '../content/ContentCopilotModal';
import { BOOKING_LIST_COLUMNS, buildBookingListRows, defaultBookingTabName, resolveBrandBookingSheetUrl } from '../../lib/bookingList';

interface ContentPlanBoardProps {
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  currentUserName?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const EMPTY: ContentPlanData = { slots: [] };
const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const weekShort = (w: string) => w.split(' ')[0];

const PLAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING_PRE_APPROVAL: 'Chờ sơ duyệt',
  PENDING_APPROVAL: 'Chờ Giám đốc',
  REVISION_REQUESTED: 'Cần sửa',
  PRE_APPROVED: 'Đã sơ duyệt',
  LEAD_APPROVED: 'Đã duyệt',
  BRAND_APPROVED: 'Đã duyệt',
  APPROVED: 'Đã duyệt',
  LOCKED: 'Đã duyệt',
  IN_EXECUTION: 'Đã duyệt',
  COMPLETED: 'Hoàn tất',
};

const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };

export const ContentPlanBoard: React.FC<ContentPlanBoardProps> = ({ kocs = [], deals = [], currentUserName = 'Nhân viên', onNotify }) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);

  const [plans, setPlans] = useState<InputPlanBreakdownState[]>([]);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [backlogGroup, setBacklogGroup] = useState('ALL');

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

  const months = useMemo(() => Array.from(new Set(plans.map(p => p.month))).sort().reverse(), [plans]);
  const activeMonth = month || months[0] || '';
  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans
      .filter(p => p.month === activeMonth)
      .filter(p => !q || `${p.storeName || ''} ${p.brandName} ${p.pic || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.storeName || a.title).localeCompare(b.storeName || b.title));
  }, [plans, activeMonth, search]);

  const plan = useMemo(() => plans.find(p => p.id === selectedId) || null, [plans, selectedId]);
  const { data, status, update, saveNow } = usePlanRecord<ContentPlanData>('/api/content-plan', plan?.id ?? null, EMPTY, msg => notify(msg, 'warning'));
  const slots = useMemo(() => ensureSequentialBriefCodes(data.slots || []), [data.slots]);

  const req = useMemo(() => (plan ? requiredGrid(plan) : null), [plan]);
  const diag = useMemo(() => (plan ? diagnoseContentPlan(plan, slots) : null), [plan, slots]);

  const rowsShown = useMemo(() => {
    if (!req) return [];
    return CONTENT_ROWS.filter(r => req.weeks.some(w => (req.grid[w]?.[r.key] || 0) > 0) || slots.some(s => s.row === r.key));
  }, [req, slots]);

  const setSlots = (next: ContentSlot[]) => update({ ...data, slots: ensureSequentialBriefCodes(next) });

  // --- kéo thả ---
  const placeSlot = (id: string, week: string, row: ContentRowKey) => {
    setSlots(slots.map(s => (s.id === id ? { ...s, week, row, updatedAt: new Date().toISOString() } : s)));
  };
  const unplaceSlot = (id: string) => {
    setSlots(slots.map(s => (s.id === id ? { ...s, week: null, row: null, updatedAt: new Date().toISOString() } : s)));
  };

  // --- khởi tạo các dòng Brief mẫu theo khung tuần × bậc KL (mỗi ô thiếu N video -> 1 dòng Brief có SL mục tiêu = N) ---
  const handleGenerateAllPlanBriefs = () => {
    if (!plan) return;
    const { slots: next, addedCount, addedVideos } = generateMissingSlotsFromBreakdown(plan, slots, currentUserName);
    if (addedCount === 0) {
      notify(`Các dòng Brief đã phủ đủ tổng số video theo phân rã tuần.`, 'info');
      return;
    }
    setSlots(next);
    notify(`Đã khởi tạo ${addedCount} dòng Brief mẫu cho ${addedVideos} video mục tiêu.`, 'success');
  };

  // --- thêm dòng định hướng / brief mẫu ---
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    pillar: CONTENT_PILLARS[0].name,
    qty: 5,
    product: '',
    angle: '',
    hook: '',
    usp: '',
    cta: '',
    format: BRIEF_FORMAT_OPTIONS[0] as string,
    briefUrl: '',
    week: '',
    row: '' as ContentRowKey | '',
  });

  const openAdd = (week?: string, row?: ContentRowKey) => {
    let defaultQty = 5;
    if (week && row && req) {
      const need = req.grid[week]?.[row] || 0;
      const have = slots.filter(s => s.week === week && s.row === row).reduce((sum, s) => sum + slotTargetQty(s), 0);
      defaultQty = Math.max(1, need - have || need || 1);
    }
    setAddForm(f => ({ ...f, qty: defaultQty, week: week || '', row: row || '' }));
    setAddOpen(true);
  };

  const confirmAdd = () => {
    if (!plan) return;
    const qty = Math.max(1, Math.min(500, Math.floor(addForm.qty) || 1));
    const placed = addForm.week && addForm.row;
    const created = newSlot({
      targetQty: qty,
      pillar: addForm.pillar,
      angle: addForm.angle,
      product: addForm.product,
      hook: addForm.hook,
      usp: addForm.usp,
      cta: addForm.cta,
      format: addForm.format,
      briefUrl: addForm.briefUrl,
      week: placed ? addForm.week : null,
      row: placed ? (addForm.row as ContentRowKey) : null,
      pic: plan.pic || currentUserName,
      createdBy: currentUserName,
    });
    setSlots([...slots, created]);
    setAddOpen(false);
    notify(`Đã thêm 1 dòng Brief (${qty} video mục tiêu) · ${addForm.pillar}${placed ? ` vào ${weekShort(addForm.week)} ${addForm.row}` : ' vào kho chưa xếp'}.`, 'success');
  };

  // --- sửa / xóa ---
  const [editing, setEditing] = useState<ContentSlot | null>(null);
  const [editForm, setEditForm] = useState({
    briefCode: '',
    targetQty: 1,
    pillar: '',
    product: '',
    angle: '',
    hook: '',
    usp: '',
    cta: '',
    format: '',
    briefUrl: '',
    note: '',
  });
  const [deleting, setDeleting] = useState<ContentSlot | null>(null);

  const openEdit = (s: ContentSlot) => {
    setEditing(s);
    setEditForm({
      briefCode: s.briefCode || '',
      targetQty: slotTargetQty(s),
      pillar: s.pillar,
      product: s.product,
      angle: s.angle,
      hook: s.hook || '',
      usp: s.usp || '',
      cta: s.cta || '',
      format: s.format || BRIEF_FORMAT_OPTIONS[0],
      briefUrl: s.briefUrl || '',
      note: s.note || '',
    });
  };
  const saveEdit = () => {
    if (!editing) return;
    const ready = Boolean(editForm.product.trim() && (editForm.angle.trim() || editForm.hook.trim() || editForm.usp.trim()));
    setSlots(
      slots.map(s =>
        s.id === editing.id
          ? {
              ...s,
              briefCode: editForm.briefCode.trim() || s.briefCode,
              targetQty: Math.max(1, Math.min(500, Math.floor(editForm.targetQty) || 1)),
              pillar: editForm.pillar,
              product: editForm.product.trim(),
              angle: editForm.angle.trim(),
              hook: editForm.hook.trim() || undefined,
              usp: editForm.usp.trim() || undefined,
              cta: editForm.cta.trim() || undefined,
              format: editForm.format.trim() || undefined,
              briefUrl: editForm.briefUrl.trim() || undefined,
              briefStatus: ready ? 'READY' : 'DRAFT',
              note: editForm.note.trim() || undefined,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
    setEditing(null);
  };

  const copyWeekFromPrevious = (wi: number) => {
    if (!req || wi <= 0) return;
    const prev = req.weeks[wi - 1];
    const cur = req.weeks[wi];
    const sources = slots.filter(s => s.week === prev && s.row);
    if (sources.length === 0) {
      notify('Tuần trước chưa có dòng Brief để sao chép.', 'info');
      return;
    }
    const copies = sources.map(s => ({
      ...newSlot({
        targetQty: slotTargetQty(s),
        pillar: s.pillar,
        angle: s.angle,
        product: s.product,
        hook: s.hook,
        usp: s.usp,
        cta: s.cta,
        format: s.format,
        briefUrl: s.briefUrl,
        note: s.note,
        week: cur,
        row: s.row,
        pic: s.pic,
        createdBy: currentUserName,
      }),
    }));
    setSlots([...slots, ...copies]);
    notify(`Đã sao chép ${copies.length} dòng Brief từ ${weekShort(prev)} sang ${weekShort(cur)}.`, 'success');
  };

  // --- gán KOC (thủ công hoặc theo điểm phù hợp) ---
  const [matchSlotId, setMatchSlotId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const matchSlot = slots.find(s => s.id === matchSlotId) || null;
  const usedHandles = useMemo(() => new Set(slots.filter(s => s.kocHandle).map(s => (s.kocHandle || '').replace(/^@/, '').toLowerCase())), [slots]);

  const assignKoc = (handle: string | null) => {
    if (!matchSlotId) return;
    const clean = handle ? handle.replace(/^@/, '').trim() : '';
    setSlots(slots.map(s => (s.id === matchSlotId ? { ...s, kocHandle: clean || undefined, updatedAt: new Date().toISOString() } : s)));
    notify(clean ? `Đã gán @${clean}.` : 'Đã bỏ gán KOC.', 'success');
    setMatchSlotId(null);
  };

  // --- gửi danh sách KOC dự kiến book cho Brand ---
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ sheetUrl: '', tab: '', dot: 1 });
  const [sheetCfg, setSheetCfg] = useState<{ configured: boolean; serviceAccountEmail: string | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [pulling, setPulling] = useState(false);
  // Lấy content từ plan tháng của Brand: chỉ chạy khi nhân viên bấm nút
  const pullFromBrandPlan = async () => {
    if (!plan) return;
    setPulling(true);
    try {
      const [planRes, catalogRes] = await Promise.all([
        fetch(`/api/brand-plan?planId=${encodeURIComponent(plan.id)}`, { cache: 'no-store' }),
        fetch('/api/master-data', { cache: 'no-store' }),
      ]);
      const planBody = await planRes.json().catch(() => null);
      if (!planRes.ok) throw new Error(planBody?.error || `Lỗi ${planRes.status}`);
      const catalogBody = await catalogRes.json().catch(() => null);
      const stores = ((catalogBody?.data?.stores as StorePortfolioItem[]) || []).filter(Boolean);
      const slugOf = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const store = stores.find(s => (plan.storeId && s.id === plan.storeId) || (plan.storeName && slugOf(s.storeName || '') === slugOf(plan.storeName)));
      const channel: PlanChannel | null = store ? (store.platform === 'TikTok Shop' ? 'TIKTOK' : store.platform === 'Shopee Mall' ? 'SHOPEE' : null) : detectChannel(plan);
      if (!channel) {
        notify('Chưa xác định gian hàng này bán trên TikTok Shop hay Shopee nên chưa lấy được content từ plan của Brand.', 'warning');
        return;
      }
      const brandPlan = planBody.data as BrandPlanData;
      if (!brandPlan.rows.some(r => r.channel === channel)) {
        notify('Plan tháng của Brand chưa có dòng Chi tiết Content cho sàn này.', 'info');
        return;
      }
      let groups: { id: string; name: string }[] = [];
      try {
        const gRes = await fetch('/api/product-catalog?brand=' + encodeURIComponent(plan.brandName), { cache: 'no-store' });
        const gBody = await gRes.json().catch(() => null);
        if (gRes.ok) groups = ((gBody?.data?.groups as { id: string; name: string }[]) || []).map(g => ({ id: g.id, name: g.name }));
      } catch {
        /* không có danh mục thì ghi sản phẩm theo SKU của dòng plan */
      }
      const { specs, skipped } = slotSpecsFromBrandPlan(brandPlan.rows, brandPlan.pillars, channel, groups);
      const result = syncSlotsFromBrandPlan(slots, specs, currentUserName);
      setSlots(result.slots);
      const parts = [`thêm ${result.added}`, `cập nhật ${result.updated}`];
      if (result.removed) parts.push(`bỏ ${result.removed} content không còn trong plan`);
      if (result.manualKept) parts.push(`giữ ${result.manualKept} content bạn đã kéo sang chỗ khác`);
      if (result.keptOrphans) parts.push(`${result.keptOrphans} content đã gán KOC nhưng dòng plan không còn`);
      if (brandPlan.approval?.status !== 'APPROVED') parts.push('plan của Brand chưa được duyệt');
      const skip = skipped.live + skipped.noWeek + skipped.noTier;
      if (skip) parts.push(`bỏ qua ${skip} (livestream ${skipped.live}, chưa chọn tuần ${skipped.noWeek}, chưa chọn bậc ${skipped.noTier})`);
      notify(`Đã lấy từ plan Brand: ${parts.join(', ')}.`, result.keptOrphans || skip || brandPlan.approval?.status !== 'APPROVED' ? 'warning' : 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không lấy được plan tháng của Brand.', 'error');
    } finally {
      setPulling(false);
    }
  };
  const bookingRows = useMemo(() => (plan ? buildBookingListRows(plan, slots, kocs) : []), [plan, slots, kocs]);

  const openSend = () => {
    if (!plan) return;
    setSendForm({ sheetUrl: data.sheetUrl || resolveBrandBookingSheetUrl(plan), tab: data.tabName || defaultBookingTabName(plan, 1), dot: 1 });
    setSendOpen(true);
    fetch('/api/booking-list/push-sheet', { cache: 'no-store' })
      .then(r => r.json())
      .then(b => setSheetCfg({ configured: Boolean(b.configured), serviceAccountEmail: b.serviceAccountEmail ?? null }))
      .catch(() => setSheetCfg({ configured: false, serviceAccountEmail: null }));
  };

  const pushToSheet = async () => {
    if (!plan) return;
    setSending(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, sheetUrl: sendForm.sheetUrl.trim(), tab: sendForm.tab.trim(), columns: [...BOOKING_LIST_COLUMNS], rows: bookingRows }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        notify(body?.error || `Lỗi ${res.status}`, 'error');
        return;
      }
      update({
        ...data,
        sheetUrl: sendForm.sheetUrl.trim(),
        tabName: sendForm.tab.trim(),
        lastPush: { at: new Date().toISOString(), by: currentUserName, rows: bookingRows.length, added: body.added, url: sendForm.sheetUrl.trim() },
      });
      notify(`Đã gửi ${body.added} KOC mới lên Google Sheet${body.skipped ? `, bỏ qua ${body.skipped} KOC đã có` : ''}. ${body.listed} KOC vào bảng điều phối ở trạng thái Chờ Brand duyệt.`, 'success');
      setSendOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không gửi được lên Google Sheet.', 'error');
    } finally {
      setSending(false);
    }
  };

  const downloadBookingExcel = async () => {
    if (!plan) return;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(sendForm.tab.slice(0, 31) || 'Danh sách KOC');
      ws.addRow([...BOOKING_LIST_COLUMNS]);
      ws.getRow(1).font = { bold: true };
      bookingRows.forEach(r => ws.addRow(r.cells));
      ws.columns.forEach(c => {
        c.width = 18;
      });
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_sach_KOC_${(plan.storeName || plan.brandName).replace(/[^\w.-]+/g, '_')}_${plan.month.replace('/', '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không xuất được file.', 'error');
    }
  };

  const backlog = slots.filter(s => !isPlaced(s)).filter(s => backlogGroup === 'ALL' || pillarGroupOf(s.pillar) === backlogGroup);
  const groupOptions = Array.from(new Set(CONTENT_PILLARS.map(p => p.group)));
  const dragging = dragId ? slots.find(s => s.id === dragId) : undefined;

  const chip = (s: ContentSlot) => {
    const ready = isBriefReady(s);
    const code = formatBriefCode(s);
    const qty = slotTargetQty(s);
    return (
      <div
        key={s.id}
        draggable
        onDragStart={e => {
          setDragId(s.id);
          e.dataTransfer.setData('text/plain', s.id);
        }}
        onDragEnd={() => setDragId(null)}
        title={CONTENT_PILLARS.find(p => p.name === s.pillar)?.definition}
        className="cursor-grab rounded border border-line bg-surface px-1.5 py-1 text-2xs active:cursor-grabbing"
      >
        <button type="button" onClick={() => openEdit(s)} className="block w-full text-left">
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-ink">
              {code} · {qty} video
            </span>
            <span className={`text-3xs ${ready ? 'text-positive' : 'text-ink-3'}`}>{ready ? 'Brief đủ' : 'Nháp'}</span>
          </div>
          <div className="truncate font-medium text-ink">{s.pillar}</div>
          <div className="truncate text-ink-3">{s.product || s.angle || 'Chưa ghi sản phẩm'}</div>
          {s.angle && s.product && <div className="truncate text-ink-3">{s.angle}</div>}
          {s.pic && <div className="truncate text-ink-3">{s.pic}</div>}
          {s.kocHandle && <div className="truncate font-medium text-accent">@{s.kocHandle.replace(/^@/, '')}</div>}
          {!s.kocHandle && s.rejectedKoc && <div className="truncate text-critical">Brand từ chối @{s.rejectedKoc.handle}</div>}
        </button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
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
          {plansState === 'ready' && visiblePlans.length === 0 && <div className="px-2 py-4 text-xs text-ink-3">Chưa có kế hoạch trong tháng này.</div>}
          {visiblePlans.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`w-full rounded-md border px-3 py-2 text-left transition ${p.id === selectedId ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'}`}
            >
              <div className="truncate text-[13px] font-medium text-ink">{p.storeName || p.title}</div>
              <div className="mt-0.5 flex items-center justify-between text-2xs text-ink-3">
                <span className="truncate">{p.pic || 'Chưa giao'}</span>
                <span>{PLAN_STATUS_LABEL[p.status || 'DRAFT'] || p.status}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        {!plan || !req || !diag ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center text-sm text-ink-3">Chọn một kế hoạch ở bên trái để lập các dòng Định hướng / Brief Content.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{plan.storeName || plan.title}</h2>
                <div className="mt-0.5 text-xs text-ink-3">
                  {plan.month} · {plan.pic || 'Chưa giao'} · {PLAN_STATUS_LABEL[plan.status || 'DRAFT'] || plan.status}
                  {saveLabel[status] ? ` · ${saveLabel[status]}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {req.hasData && diag.placedVideos < diag.totalRequired && (
                  <Button size="md" variant="secondary" onClick={handleGenerateAllPlanBriefs}>
                    Khởi tạo dòng Brief theo khung tuần × bậc
                  </Button>
                )}
                <Button size="md" variant="secondary" onClick={pullFromBrandPlan} disabled={pulling}>
                  {pulling ? 'Đang lấy…' : 'Lấy từ plan Brand'}
                </Button>
                <Button size="md" variant="secondary" icon={Send} onClick={openSend} disabled={bookingRows.length === 0}>
                  Gửi Brand
                </Button>
                {status === 'error' && (
                  <Button size="sm" variant="secondary" onClick={saveNow}>
                    Lưu lại
                  </Button>
                )}
                <Button size="md" variant="primary" icon={Plus} onClick={() => openAdd()}>
                  Thêm dòng Brief
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: 'Số dòng Brief / Góc nội dung', value: `${fmt(diag.totalSlots)} dòng Brief` },
                { label: 'Tổng SL Video theo Brief / Plan', value: `${fmt(diag.totalBriefVideos)} / ${fmt(diag.totalRequired)} video` },
                { label: 'Dòng Brief đã đủ nội dung', value: `${fmt(diag.readyBriefs)} / ${fmt(diag.totalSlots)} dòng` },
                { label: 'SL Video đã xếp vào tuần', value: `${fmt(diag.placedVideos)} / ${fmt(diag.totalRequired)} video` },
                { label: 'Nhóm pillar nhiều nhất', value: diag.byPillarGroup[0] ? `${diag.byPillarGroup[0].group} (${Math.round(diag.byPillarGroup[0].share * 100)}%)` : '—' },
              ].map(c => (
                <div key={c.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="text-2xs text-ink-3">{c.label}</div>
                  <div className="truncate text-sm font-semibold tabular-nums text-ink">{c.value}</div>
                </div>
              ))}
            </div>

            {!req.hasData ? (
              <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-ink-3">
                Kế hoạch này chưa có số theo tuần trong bảng phân rã. Chuyên viên cần nhập tab Phân rã tuần trước khi xếp dòng Brief vào tuần.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full min-w-[900px] border-collapse text-xs">
                  <thead className="text-ink-3">
                    <tr className="border-b border-line">
                      <th className="sticky left-0 z-10 min-w-[120px] bg-surface px-3 py-2 text-left font-medium text-ink">Bậc</th>
                      {req.weeks.map((w, wi) => (
                        <th key={w} className="min-w-[150px] border-l border-line px-2 py-2 text-left font-medium text-ink">
                          <div className="flex items-center justify-between gap-1">
                            <span>{w}</span>
                            {wi > 0 && (
                              <button type="button" title="Sao chép các dòng Brief từ tuần trước" onClick={() => copyWeekFromPrevious(wi)} className="rounded p-1 text-ink-3 hover:bg-accent-soft hover:text-accent">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="min-w-[80px] border-l border-line px-2 py-2 text-right font-medium text-ink">Tổng Video</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsShown.map(row => {
                      const rowNeed = req.weeks.reduce((s, w) => s + (req.grid[w]?.[row.key] || 0), 0);
                      const rowHave = slots
                        .filter(s => s.row === row.key && isPlaced(s))
                        .reduce((sum, s) => sum + slotTargetQty(s), 0);
                      return (
                        <tr key={row.key} className="border-t border-line align-top">
                          <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-ink">{row.label}</td>
                          {req.weeks.map(w => {
                            const need = req.grid[w]?.[row.key] || 0;
                            const cell = slots.filter(s => s.week === w && s.row === row.key);
                            const cellVideos = cell.reduce((sum, s) => sum + slotTargetQty(s), 0);
                            const tone = cellVideos === need ? 'text-positive' : cellVideos > need ? 'text-critical' : 'text-warning';
                            const canDrop = Boolean(dragging);
                            return (
                              <td
                                key={w}
                                onDragOver={e => {
                                  if (canDrop) e.preventDefault();
                                }}
                                onDrop={e => {
                                  e.preventDefault();
                                  const id = dragId || e.dataTransfer.getData('text/plain');
                                  setDragId(null);
                                  if (id) placeSlot(id, w, row.key);
                                }}
                                className={`border-l border-line p-1.5 ${canDrop ? 'bg-accent-soft/40' : ''}`}
                              >
                                <div className="mb-1 flex items-center justify-between">
                                  <span className={`text-2xs font-medium tabular-nums ${need === 0 && cellVideos === 0 ? 'text-ink-3' : tone}`}>
                                    {cellVideos}/{need} video
                                  </span>
                                  <button type="button" title="Thêm dòng Brief vào ô này" onClick={() => openAdd(w, row.key)} className="rounded p-0.5 text-ink-3 hover:bg-accent-soft hover:text-accent">
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="min-h-[28px] space-y-1">{cell.map(chip)}</div>
                              </td>
                            );
                          })}
                          <td className={`border-l border-line px-2 py-2 text-right tabular-nums ${rowHave === rowNeed ? 'text-positive' : rowHave > rowNeed ? 'text-critical' : 'text-warning'}`}>
                            {rowHave}/{rowNeed}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div
                onDragOver={e => {
                  if (dragging && isPlaced(dragging)) e.preventDefault();
                }}
                onDrop={e => {
                  e.preventDefault();
                  const id = dragId || e.dataTransfer.getData('text/plain');
                  setDragId(null);
                  if (id) unplaceSlot(id);
                }}
                className="rounded-lg border border-line bg-surface p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink">Kho dòng Brief chưa xếp tuần ({diag.unplaced})</span>
                  <Select value={backlogGroup} onChange={e => setBacklogGroup(e.target.value)} className="max-w-[180px]">
                    <option value="ALL">Mọi nhóm pillar</option>
                    {groupOptions.map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {backlog.map(chip)}
                  {backlog.length === 0 && <div className="col-span-full px-2 py-6 text-center text-xs text-ink-3">Không có dòng Brief chưa xếp. Kéo từ bảng về đây để bỏ xếp tuần.</div>}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
                <div className="space-y-1.5">
                  {diag.byPillarGroup.length === 0 && <div className="text-xs text-ink-3">Chưa có dòng Brief nào.</div>}
                  {diag.byPillarGroup.map(g => (
                    <div key={g.group} className="flex items-center gap-2 text-xs">
                      <span className="w-40 shrink-0 truncate text-ink-2">{g.group}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-sunken">
                        <div className="h-full bg-accent" style={{ width: `${Math.round(g.share * 100)}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-right tabular-nums text-ink-3">{g.count} video · {Math.round(g.share * 100)}%</span>
                    </div>
                  ))}
                </div>
                {diag.issues.length > 0 && (
                  <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-line pt-2 text-xs">
                    {diag.issues.slice(0, 12).map((i, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Status tone={i.severity === 'warning' ? 'warning' : 'neutral'}>{i.severity === 'warning' ? 'Cần xem' : 'Thiếu'}</Status>
                        <span className="text-ink-2">{i.message}</span>
                      </li>
                    ))}
                    {diag.issues.length > 12 && <li className="text-ink-3">và {diag.issues.length - 12} mục khác</li>}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Thêm dòng Định hướng / Brief Content"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={confirmAdd}>
              {`Lưu dòng Brief (${Math.max(1, Math.min(500, Math.floor(addForm.qty) || 1))} video)`}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Content pillar">
            <Select value={addForm.pillar} onChange={e => setAddForm({ ...addForm, pillar: e.target.value })}>
              {CONTENT_PILLARS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Số lượng video mục tiêu của dòng Brief">
            <Input inputMode="numeric" value={String(addForm.qty)} onChange={e => setAddForm({ ...addForm, qty: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
          </Field>
          <Field label="Sản phẩm">
            <Input value={addForm.product} onChange={e => setAddForm({ ...addForm, product: e.target.value })} />
          </Field>
          <Field label="Định dạng quay">
            <Select value={addForm.format} onChange={e => setAddForm({ ...addForm, format: e.target.value })}>
              {BRIEF_FORMAT_OPTIONS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Góc nội dung (Angle)" className="col-span-2">
            <Input value={addForm.angle} onChange={e => setAddForm({ ...addForm, angle: e.target.value })} />
          </Field>
          <Field label="Câu mở đầu 3 giây đầu (Hook 3s)" className="col-span-2">
            <Input value={addForm.hook} onChange={e => setAddForm({ ...addForm, hook: e.target.value })} />
          </Field>
          <Field label="Thông điệp USP sản phẩm bắt buộc" className="col-span-2">
            <Input value={addForm.usp} onChange={e => setAddForm({ ...addForm, usp: e.target.value })} />
          </Field>
          <Field label="Xếp vào tuần">
            <Select value={addForm.week} onChange={e => setAddForm({ ...addForm, week: e.target.value })}>
              <option value="">Để trong kho, xếp sau</option>
              {(req?.weeks || []).map(w => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bậc">
            <Select value={addForm.row} disabled={!addForm.week} onChange={e => setAddForm({ ...addForm, row: e.target.value as ContentRowKey })}>
              <option value="">Chọn bậc</option>
              {CONTENT_ROWS.map(r => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Dòng Brief ${formatBriefCode(editing)} (${slotTargetQty(editing)} video) · ${editing.pillar}` : 'Dòng Brief Content'}
        size="lg"
        footer={
          <>
            {editing && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleting(editing)}>
                Xóa
              </Button>
            )}
            {editing && editing.row !== 'SELF' && (
              <Button
                variant="secondary"
                icon={UserPlus}
                onClick={() => {
                  setMatchSlotId(editing.id);
                  setEditing(null);
                }}
              >
                {editing.kocHandle ? `Đổi KOC (@${editing.kocHandle.replace(/^@/, '')})` : 'Gán KOC'}
              </Button>
            )}
            {editing && isPlaced(editing) && (
              <Button
                variant="secondary"
                onClick={() => {
                  unplaceSlot(editing.id);
                  setEditing(null);
                }}
              >
                Bỏ xếp
              </Button>
            )}
            <Button variant="primary" onClick={saveEdit}>
              Lưu dòng Brief
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã dòng Brief">
            <Input value={editForm.briefCode} onChange={e => setEditForm({ ...editForm, briefCode: e.target.value })} />
          </Field>
          <Field label="Số lượng video mục tiêu của dòng Brief">
            <Input
              inputMode="numeric"
              value={String(editForm.targetQty)}
              onChange={e => setEditForm({ ...editForm, targetQty: parseInt(e.target.value.replace(/\D/g, ''), 10) || 1 })}
            />
          </Field>
          <Field label="Content pillar">
            <Select value={editForm.pillar} onChange={e => setEditForm({ ...editForm, pillar: e.target.value })}>
              {CONTENT_PILLARS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sản phẩm">
            <Input value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} />
          </Field>
          <Field label="Định dạng quay" className="col-span-2">
            <Select value={editForm.format} onChange={e => setEditForm({ ...editForm, format: e.target.value })}>
              {BRIEF_FORMAT_OPTIONS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-ink">Góc nội dung (Angle)</span>
              <button
                type="button"
                onClick={() => setCopilotOpen(true)}
                className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
              >
                <Lightbulb className="h-3 w-3" />
                Gợi ý góc quay & Hook 3s
              </button>
            </div>
            <Input value={editForm.angle} onChange={e => setEditForm({ ...editForm, angle: e.target.value })} />
          </div>
          <Field label="Câu mở đầu 3 giây đầu (Hook 3s)" className="col-span-2">
            <Input value={editForm.hook} onChange={e => setEditForm({ ...editForm, hook: e.target.value })} />
          </Field>
          <Field label="Thông điệp USP sản phẩm bắt buộc" className="col-span-2">
            <Textarea rows={2} value={editForm.usp} onChange={e => setEditForm({ ...editForm, usp: e.target.value })} />
          </Field>
          <Field label="Lời kêu gọi hành động (CTA)">
            <Input value={editForm.cta} onChange={e => setEditForm({ ...editForm, cta: e.target.value })} />
          </Field>
          <Field label="Link file Brief mẫu">
            <Input value={editForm.briefUrl} placeholder="https://" onChange={e => setEditForm({ ...editForm, briefUrl: e.target.value })} />
          </Field>
          <Field label="Ghi chú hướng dẫn quay" className="col-span-2">
            <Textarea rows={2} value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ContentCopilotModal
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        brandName={plan?.brandName}
        productName={editForm.product}
        initialPillar={editForm.pillar}
        initialScript={editForm.note}
        onApplyAngle={data => {
          setEditForm(prev => ({
            ...prev,
            angle: data.angleName,
            hook: data.hook || prev.hook,
            usp: data.usp || prev.usp,
            cta: data.cta || prev.cta,
            note: (prev.note ? prev.note + '\n\n' : '') + `[Tình huống]: ${data.painPoint}`,
          }));
          notify(`Đã áp dụng góc tiếp cận vào Brief: ${data.angleName}`, 'success');
        }}
        onNotify={onNotify}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa Brief Content"
        message={deleting ? `Xóa Brief "${formatBriefCode(deleting)} · ${deleting.pillar}" khỏi kế hoạch?` : ''}
        confirmLabel="Xóa"
        tone="danger"
        onConfirm={() => {
          if (deleting) setSlots(slots.filter(s => s.id !== deleting.id));
          setDeleting(null);
          setEditing(null);
        }}
        onCancel={() => setDeleting(null)}
      />

      <CreatorMatchModal
        open={Boolean(matchSlot)}
        onClose={() => setMatchSlotId(null)}
        slot={matchSlot}
        plan={plan}
        kocs={kocs}
        deals={deals}
        usedHandles={usedHandles}
        onAssign={assignKoc}
        onNotify={onNotify}
      />

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Gửi danh sách KOC cho Brand"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Đóng
            </Button>
            <Button variant="secondary" icon={Download} onClick={() => void downloadBookingExcel()}>
              Tải Excel
            </Button>
            <Button variant="primary" icon={Send} disabled={sending || !sheetCfg?.configured || !sendForm.sheetUrl.trim() || !sendForm.tab.trim()} onClick={() => void pushToSheet()}>
              {sending ? 'Đang gửi…' : 'Gửi lên Google Sheet'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
            {bookingRows.length} KOC đã gán trong kế hoạch này.
            {data.lastPush ? ` Lần gửi gần nhất: ${new Date(data.lastPush.at).toLocaleString('vi-VN')} bởi ${data.lastPush.by}, thêm ${data.lastPush.added} KOC.` : ''}
          </div>
          {sheetCfg && !sheetCfg.configured && (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              Chưa cấu hình tài khoản dịch vụ Google nên chưa gửi thẳng được. Bạn tải Excel và dán vào Google Sheet, hoặc nhờ quản trị khai báo GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.
            </div>
          )}
          {sheetCfg?.configured && <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">Sheet của Brand cần chia sẻ quyền chỉnh sửa cho {sheetCfg.serviceAccountEmail}.</div>}
          <Field label="Link Google Sheet của Brand">
            <Input value={sendForm.sheetUrl} onChange={e => setSendForm({ ...sendForm, sheetUrl: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đợt">
              <Select
                value={String(sendForm.dot)}
                onChange={e => {
                  const dot = parseInt(e.target.value, 10) || 1;
                  setSendForm({ ...sendForm, dot, tab: plan ? defaultBookingTabName(plan, dot) : sendForm.tab });
                }}
              >
                <option value="1">Đợt 1</option>
                <option value="2">Đợt 2</option>
                <option value="3">Đợt 3</option>
              </Select>
            </Field>
            <Field label="Tên tab">
              <Input value={sendForm.tab} onChange={e => setSendForm({ ...sendForm, tab: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
};
