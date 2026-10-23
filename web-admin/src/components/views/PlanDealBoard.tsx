'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { InputPlanBreakdownState, KocItem } from '../../lib/types';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { usePlanRecord } from '../../lib/usePlanRecord';
import { useListingBoard } from '../../lib/useListingBoard';
import { columnOf, itemFee, itemGrade, planQuota } from '../../lib/listingBoardRules';
import type { ContentSlot } from '../../lib/contentPlanRules';
import type { BrandProductCatalog } from '../../lib/productCatalog';
import {
  EMPTY_DEAL_BOARD,
  FRAMEWORK_STATE_LABEL,
  budgetIssues,
  STAGES,
  createDeal,
  createDealBlocker,
  dealIssues,
  frameworkState,
  isAcceptanceCleared,
  normHandle,
  paymentBlocker,
  pushEvent,
  stageOf,
  summarizeDeals,
  type AcceptanceStatus,
  type DealBoardData,
  type FrameworkContract,
  type PaymentStatus,
  type PlanDeal,
  type SampleStatus,
  type ScriptStatus,
} from '../../lib/dealBoardRules';

interface PlanDealBoardProps {
  kocs?: KocItem[];
  currentUserName?: string;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };
const SAMPLE_LABEL: Record<SampleStatus, string> = { NONE: 'Chưa gửi', NOT_NEEDED: 'Không cần gửi', SENT: 'Đã gửi', RECEIVED: 'KOC đã nhận' };
const SCRIPT_LABEL: Record<ScriptStatus, string> = { NONE: 'Chưa nộp', NOT_NEEDED: 'Không cần kịch bản', SUBMITTED: 'Chờ duyệt', CHANGES: 'Cần sửa', APPROVED: 'Đã duyệt' };
const PAY_LABEL: Record<PaymentStatus, string> = { NONE: 'Chưa đề nghị', REQUESTED: 'Đã đề nghị', PAID: 'Đã thanh toán' };
const ACCEPT_LABEL: Record<AcceptanceStatus, string> = { PENDING: 'Chưa nghiệm thu', PASSED: 'Đạt', REVIEW: 'Cần xem lại', FAILED: 'Không đạt' };
const TH = 'whitespace-nowrap border-b border-line bg-sunken px-2 py-2 text-left text-2xs font-medium text-ink-3';
const TD = 'border-b border-line px-2 py-1.5 align-middle text-[13px] text-ink';

interface PlanLite extends InputPlanBreakdownState {}

export const PlanDealBoard: React.FC<PlanDealBoardProps> = ({ currentUserName = 'Nhân viên', onNotify }) => {
  const notify = useCallback((msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type), [onNotify]);

  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [fwModal, setFwModal] = useState<{ handle: string } | null>(null);
  const [fwForm, setFwForm] = useState({ contractNo: '', signedAt: '', validTo: '', fileUrl: '', note: '' });
  const [inspecting, setInspecting] = useState(false);
  const [confirmNote, setConfirmNote] = useState('');

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
  }, [notify]);

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

  const { data, status, update, saveNow } = usePlanRecord<DealBoardData>('/api/deal-board', plan?.id ?? null, EMPTY_DEAL_BOARD, msg => notify(msg, 'warning'));
  const { items } = useListingBoard(plan?.id ?? null, msg => notify(msg, 'warning'));
  const deals = data.deals;

  // Nguồn tham chiếu: hợp đồng nguyên tắc, content của kế hoạch, danh mục sản phẩm
  const [frameworks, setFrameworks] = useState<Record<string, FrameworkContract>>({});
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [catalog, setCatalog] = useState<BrandProductCatalog>({ groups: [] });

  const handlesKey = useMemo(
    () =>
      Array.from(new Set([...items.filter(i => columnOf(i) === 'CONFIRMED').map(i => normHandle(i.kocHandle)), ...deals.map(d => normHandle(d.kocHandle))].filter(Boolean)))
        .sort()
        .join(','),
    [items, deals]
  );

  const loadFrameworks = useCallback(async (handles: string) => {
    if (!handles) {
      setFrameworks({});
      return;
    }
    try {
      const res = await fetch(`/api/koc-framework?handles=${encodeURIComponent(handles)}`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) return;
      setFrameworks(Object.fromEntries(((body?.items as FrameworkContract[]) || []).map(i => [i.id, i])));
    } catch {
      /* không tải được thì coi như chưa có hợp đồng nguyên tắc */
    }
  }, []);

  useEffect(() => {
    void loadFrameworks(handlesKey);
  }, [handlesKey, loadFrameworks]);

  useEffect(() => {
    setSlots([]);
    setCatalog({ groups: [] });
    if (!plan) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([fetch(`/api/content-plan?planId=${encodeURIComponent(plan.id)}`, { cache: 'no-store' }), fetch(`/api/product-catalog?brand=${encodeURIComponent(plan.brandName)}`, { cache: 'no-store' })]);
        const cBody = await cRes.json().catch(() => null);
        const pBody = await pRes.json().catch(() => null);
        if (cancelled) return;
        if (cRes.ok) setSlots((cBody?.data?.slots as ContentSlot[]) || []);
        if (pRes.ok) setCatalog((pBody?.data as BrandProductCatalog) || { groups: [] });
      } catch {
        /* thiếu tham chiếu thì deal tạo không kèm tuần, sản phẩm */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan]);

  const summary = useMemo(() => summarizeDeals(deals), [deals]);
  const issues = useMemo(() => [...(plan ? budgetIssues(deals, planQuota(plan)) : []), ...dealIssues(deals)], [deals, plan]);
  const confirmedNoDeal = useMemo(() => items.filter(i => columnOf(i) === 'CONFIRMED' && !deals.some(d => d.listingItemId === i.id)), [items, deals]);
  const openDeal = deals.find(d => d.id === openDealId) || null;

  const setDeals = (next: PlanDeal[]) => update({ deals: next });
  const patchDeal = (id: string, fn: (d: PlanDeal) => PlanDeal) => setDeals(deals.map(d => (d.id === id ? fn(d) : d)));

  const makeDeal = (itemId: string) => {
    if (!plan) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const reason = createDealBlocker(item, frameworks[normHandle(item.kocHandle)], deals);
    if (reason) {
      notify(reason, 'warning');
      return;
    }
    const slot = slots.find(s => s.id === item.planSlotId);
    const group = catalog.groups.find(g => g.id === slot?.productGroupId);
    const deal = createDeal({
      item,
      planId: plan.id,
      month: plan.month,
      actor: currentUserName,
      existingCodes: deals.map(d => d.code),
      week: slot?.week || '',
      pic: slot?.pic || '',
      slotId: slot?.id,
      productGroupId: group?.id || '',
      productGroupName: group?.name || '',
    });
    setDeals([...deals, deal]);
    setOpenDealId(deal.id);
  };

  const saveFramework = async () => {
    if (!fwModal) return;
    try {
      const res = await fetch('/api/koc-framework', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: fwModal.handle, ...fwForm }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
      notify(`Đã ghi hợp đồng nguyên tắc của @${normHandle(fwModal.handle)}.`, 'success');
      setFwModal(null);
      await loadFrameworks(handlesKey);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không ghi được hợp đồng nguyên tắc.', 'error');
    }
  };

  const openFramework = (handle: string) => {
    const cur = frameworks[normHandle(handle)];
    setFwForm({ contractNo: cur?.contractNo || '', signedAt: cur?.signedAt || '', validTo: cur?.validTo || '', fileUrl: cur?.fileUrl || '', note: cur?.note || '' });
    setFwModal({ handle });
  };

  // Nghiệm thu video: chỉ chạy khi nhân viên bấm
  const runAcceptance = async (d: PlanDeal) => {
    if (!d.airLink.trim()) return;
    setInspecting(true);
    try {
      const res = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [d.airLink.trim()], expectedHandle: d.kocHandle, expectedDeadline: d.deadline || undefined, expectedCartUrl: d.cartUrl || undefined, brandName: plan?.brandName }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.error || `Lỗi ${res.status}`);
      const r = (body.data as Array<{ verdict: string; verdictSummary: string; checklist: { key: string; label: string; passed: boolean; detail: string }[]; viewsCount: number; isOnTime: boolean; daysDelayed: number; publishedDate: string }>)[0];
      if (!r) throw new Error('Không có kết quả kiểm tra.');
      const statusMap: Record<string, AcceptanceStatus> = { 'ĐẠT_CHUẨN': 'PASSED', 'CẦN_KIỂM_TRA': 'REVIEW', 'KHÔNG_ĐẠT': 'FAILED' };
      const st = statusMap[r.verdict] || 'REVIEW';
      patchDeal(d.id, cur =>
        pushEvent(
          {
            ...cur,
            airedAt: r.publishedDate || cur.airedAt,
            acceptance: {
              ...cur.acceptance,
              status: st,
              checks: (r.checklist || []).map(c => ({ key: c.key, label: c.label, passed: c.passed, detail: c.detail })),
              summary: r.verdictSummary || '',
              views: typeof r.viewsCount === 'number' ? r.viewsCount : null,
              isOnTime: typeof r.isOnTime === 'boolean' ? r.isOnTime : null,
              daysDelayed: typeof r.daysDelayed === 'number' ? r.daysDelayed : null,
              checkedAt: new Date().toISOString(),
              confirmedBy: '',
              confirmedAt: '',
              confirmNote: '',
            },
          },
          currentUserName,
          `Nghiệm thu video: ${ACCEPT_LABEL[st]}`
        )
      );
      notify(`Kết quả nghiệm thu: ${ACCEPT_LABEL[st]}.`, st === 'PASSED' ? 'success' : 'warning');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không kiểm tra được video.', 'error');
    } finally {
      setInspecting(false);
    }
  };

  /* ------------------------------------------------------------ Chi tiết deal */
  const productsOfGroup = (groupId: string) => catalog.groups.find(g => g.id === groupId)?.products || [];

  const renderDealModal = (d: PlanDeal) => {
    const set = (fn: (x: PlanDeal) => PlanDeal, log?: string) => patchDeal(d.id, x => (log ? pushEvent(fn(x), currentUserName, log) : fn(x)));
    const prod = productsOfGroup(d.productGroupId).find(p => p.name === d.productName);
    const blocker = paymentBlocker(d);
    const stage = stageOf(d);
    const perfRow = (key: 'd14' | 'd30' | 'd60', label: string) => (
      <tr key={key}>
        <td className={TD}>{label}</td>
        {(['views', 'orders', 'gmv'] as const).map(f => (
          <td key={f} className={TD}>
            <Input
              type="number"
              min={0}
              className="h-8 text-right"
              value={d.performance[key][f] ?? ''}
              onChange={e => set(x => ({ ...x, performance: { ...x.performance, [key]: { ...x.performance[key], [f]: e.target.value === '' ? null : Number(e.target.value) } } }))}
            />
          </td>
        ))}
        <td className={`${TD} text-right text-ink-2`}>{d.fee > 0 && d.performance[key].gmv !== null ? (d.performance[key].gmv! / d.fee).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'}</td>
      </tr>
    );
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
          <span className="font-medium text-ink">@{d.kocHandle}</span>
          <span>{d.kocName}</span>
          <span>{d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade}</span>
          <span>Thù lao chốt: {fmt(d.fee)}đ</span>
          <span>PIC: {d.pic || '—'}</span>
          <span>Bước hiện tại: {STAGES.find(s => s.key === stage)?.label}</span>
        </div>

        <section className="space-y-2">
          <div className="text-sm font-semibold text-ink">Phụ lục</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Số phụ lục">
              <Input value={d.appendixNo} onChange={e => set(x => ({ ...x, appendixNo: e.target.value }))} />
            </Field>
            <Field label="Ngày ký">
              <Input type="date" value={d.appendixDate} onChange={e => set(x => ({ ...x, appendixDate: e.target.value }))} />
            </Field>
            <Field label="Link file phụ lục">
              <Input value={d.appendixUrl} placeholder="https://" onChange={e => set(x => ({ ...x, appendixUrl: e.target.value }))} />
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold text-ink">Sản phẩm</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nhóm sản phẩm">
              <Select
                value={d.productGroupId}
                onChange={e => {
                  const g = catalog.groups.find(x => x.id === e.target.value);
                  set(x => ({ ...x, productGroupId: g?.id || '', productGroupName: g?.name || '', productName: '', cartUrl: '', affiliateUrl: '', commissionPct: null }));
                }}
              >
                <option value="">Chọn nhóm</option>
                {catalog.groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name || 'Chưa đặt tên'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sản phẩm">
              <Select value={d.productName} disabled={!d.productGroupId} onChange={e => set(x => ({ ...x, productName: e.target.value, cartUrl: '', affiliateUrl: '', commissionPct: null }))}>
                <option value="">Chọn sản phẩm</option>
                {productsOfGroup(d.productGroupId).map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Link giỏ hàng">
              <Select value={d.cartUrl} disabled={!prod} onChange={e => set(x => ({ ...x, cartUrl: e.target.value }))}>
                <option value="">Chọn link giỏ hàng</option>
                {(prod?.cartLinks || []).map(l => (
                  <option key={l.id} value={l.url}>
                    {l.platform} · {l.storeName || l.url}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Link affiliate">
              <Select
                value={d.affiliateUrl}
                disabled={!prod}
                onChange={e => {
                  const l = prod?.affiliateLinks.find(a => a.url === e.target.value);
                  set(x => ({ ...x, affiliateUrl: l?.url || '', commissionPct: l ? l.commissionPct : null }));
                }}
              >
                <option value="">Chọn link affiliate</option>
                {(prod?.affiliateLinks || []).map(l => (
                  <option key={l.id} value={l.url}>
                    {l.label || l.platform} · {l.commissionPct === null ? 'chưa có hoa hồng' : `${l.commissionPct}%`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {d.affiliateUrl && <div className="text-xs text-ink-2">Hoa hồng đã chốt cho deal: {d.commissionPct === null ? '—' : `${d.commissionPct}%`}</div>}
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold text-ink">Hàng mẫu và kịch bản</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Hàng mẫu">
              <Select value={d.sample.status} onChange={e => set(x => ({ ...x, sample: { ...x.sample, status: e.target.value as SampleStatus, at: x.sample.at || new Date().toISOString().slice(0, 10) } }), `Hàng mẫu: ${SAMPLE_LABEL[e.target.value as SampleStatus]}`)}>
                {(Object.keys(SAMPLE_LABEL) as SampleStatus[]).map(k => (
                  <option key={k} value={k}>
                    {SAMPLE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mã vận đơn">
              <Input value={d.sample.trackingNo} onChange={e => set(x => ({ ...x, sample: { ...x.sample, trackingNo: e.target.value } }))} />
            </Field>
            <Field label="Kịch bản">
              <Select value={d.script.status} onChange={e => set(x => ({ ...x, script: { ...x.script, status: e.target.value as ScriptStatus, at: new Date().toISOString().slice(0, 10) } }), `Kịch bản: ${SCRIPT_LABEL[e.target.value as ScriptStatus]}`)}>
                {(Object.keys(SCRIPT_LABEL) as ScriptStatus[]).map(k => (
                  <option key={k} value={k}>
                    {SCRIPT_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ghi chú kịch bản">
              <Input value={d.script.note} onChange={e => set(x => ({ ...x, script: { ...x.script, note: e.target.value } }))} />
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">Air và nghiệm thu video</div>
            <Button size="md" variant="primary" disabled={inspecting || !d.airLink.trim()} onClick={() => void runAcceptance(d)}>
              {inspecting ? 'Đang kiểm tra…' : 'Nghiệm thu video'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Hạn air">
              <Input type="date" value={d.deadline} onChange={e => set(x => ({ ...x, deadline: e.target.value }))} />
            </Field>
            <Field label="Link air" className="md:col-span-2">
              <Input value={d.airLink} placeholder="https://www.tiktok.com/@kênh/video/…" onChange={e => set(x => ({ ...x, airLink: e.target.value, acceptance: x.airLink === e.target.value ? x.acceptance : { ...x.acceptance, status: 'PENDING', checks: [], summary: '', confirmedBy: '', confirmedAt: '', confirmNote: '' } }))} />
            </Field>
          </div>
          {d.acceptance.status !== 'PENDING' && (
            <div className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <span className={`font-medium ${d.acceptance.status === 'PASSED' ? 'text-ink' : 'text-critical'}`}>Kết quả: {ACCEPT_LABEL[d.acceptance.status]}</span>
                {d.acceptance.views !== null && <span className="text-ink-2">{fmt(d.acceptance.views)} lượt xem</span>}
                {d.acceptance.isOnTime !== null && <span className="text-ink-2">{d.acceptance.isOnTime ? 'Đúng hạn' : `Trễ ${d.acceptance.daysDelayed ?? '?'} ngày`}</span>}
                {d.acceptance.confirmedBy && <span className="text-ink-2">Đã xác nhận bởi {d.acceptance.confirmedBy}</span>}
              </div>
              {d.acceptance.summary && <div className="text-xs text-ink-2">{d.acceptance.summary}</div>}
              <ul className="space-y-1">
                {d.acceptance.checks.map(c => (
                  <li key={c.key} className="flex gap-2 text-[13px]">
                    <span className={c.passed ? 'text-ink-3' : 'text-critical'}>{c.passed ? '✓' : '✗'}</span>
                    <span className="text-ink">{c.label}</span>
                    {c.detail && <span className="text-ink-3">· {c.detail}</span>}
                  </li>
                ))}
              </ul>
              {d.acceptance.status !== 'PASSED' && !d.acceptance.confirmedBy && (
                <div className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
                  <Field label="Lý do xác nhận nghiệm thu dù chưa đạt" className="min-w-[260px] flex-1">
                    <Input value={confirmNote} onChange={e => setConfirmNote(e.target.value)} />
                  </Field>
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={!confirmNote.trim()}
                    onClick={() => {
                      set(x => ({ ...x, acceptance: { ...x.acceptance, confirmedBy: currentUserName, confirmNote: confirmNote.trim() } }), `Xác nhận nghiệm thu dù ${ACCEPT_LABEL[d.acceptance.status].toLowerCase()}: ${confirmNote.trim()}`);
                      setConfirmNote('');
                    }}
                  >
                    Xác nhận nghiệm thu
                  </Button>
                </div>
              )}
              {d.acceptance.confirmNote && <div className="text-xs text-ink-2">Lý do xác nhận: {d.acceptance.confirmNote}</div>}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold text-ink">Thanh toán</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Số tiền (Net)">
              <Input type="number" min={0} value={d.payment.amount ?? ''} onChange={e => set(x => ({ ...x, payment: { ...x.payment, amount: e.target.value === '' ? null : Number(e.target.value) } }))} />
            </Field>
            <Field label="Trạng thái">
              <Select
                value={d.payment.status}
                onChange={e => {
                  const next = e.target.value as PaymentStatus;
                  if (next !== 'NONE') {
                    const reason = paymentBlocker(d);
                    if (reason) {
                      notify(reason, 'warning');
                      return;
                    }
                  }
                  set(x => ({ ...x, payment: { ...x.payment, status: next, requestedAt: next === 'REQUESTED' && !x.payment.requestedAt ? new Date().toISOString().slice(0, 10) : x.payment.requestedAt, paidAt: next === 'PAID' ? new Date().toISOString().slice(0, 10) : '' } }), `Thanh toán: ${PAY_LABEL[next]}`);
                }}
              >
                {(Object.keys(PAY_LABEL) as PaymentStatus[]).map(k => (
                  <option key={k} value={k}>
                    {PAY_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ghi chú" className="md:col-span-2">
              <Input value={d.payment.note} onChange={e => set(x => ({ ...x, payment: { ...x.payment, note: e.target.value } }))} />
            </Field>
          </div>
          {blocker && d.payment.status === 'NONE' && <div className="text-xs text-ink-3">Chưa thanh toán được: {blocker}</div>}
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold text-ink">Hiệu suất</div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Mốc</th>
                  <th className={`${TH} text-right`}>Lượt xem</th>
                  <th className={`${TH} text-right`}>Đơn hàng</th>
                  <th className={`${TH} text-right`}>GMV</th>
                  <th className={`${TH} text-right`}>GMV / thù lao</th>
                </tr>
              </thead>
              <tbody>
                {perfRow('d14', '14 ngày')}
                {perfRow('d30', '30 ngày')}
                {perfRow('d60', '60 ngày')}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-1">
          <div className="text-sm font-semibold text-ink">Lịch sử</div>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-ink-2">
            {[...d.history].reverse().map((h, i) => (
              <li key={i}>
                {h.at.slice(0, 16).replace('T', ' ')} · {h.actor} · {h.text}
              </li>
            ))}
          </ul>
        </section>
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
            <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} className={`w-full rounded-md border px-3 py-2 text-left transition ${p.id === selectedId ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'}`}>
              <div className="truncate text-[13px] font-medium text-ink">{p.storeName || p.title}</div>
              <div className="mt-0.5 truncate text-2xs text-ink-3">{p.pic || 'Chưa giao'}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        {!plan ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center text-sm text-ink-3">Chọn một kế hoạch ở bên trái để theo dõi deal.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{plan.storeName || plan.title}</h2>
                <div className="mt-0.5 text-xs text-ink-3">
                  {plan.brandName} · {plan.month}
                  {saveLabel[status] ? ` · ${saveLabel[status]}` : ''}
                </div>
              </div>
              {status === 'error' && (
                <Button size="sm" variant="secondary" onClick={saveNow}>
                  Lưu lại
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Số deal', value: fmt(summary.count) },
                { label: 'Tổng thù lao chốt', value: `${fmt(summary.totalFee)}đ` },
                { label: 'Đã thanh toán', value: `${fmt(summary.paid)}đ` },
                { label: 'GMV 30 ngày', value: summary.gmv30 ? `${fmt(summary.gmv30)}đ` : '—' },
              ].map(c => (
                <div key={c.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="text-2xs text-ink-3">{c.label}</div>
                  <div className="truncate text-sm font-semibold tabular-nums text-ink">{c.value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink-2">
              {STAGES.map(s => (
                <span key={s.key} className="rounded-md border border-line px-2 py-1">
                  {s.label}: {summary.byStage[s.key]}
                </span>
              ))}
            </div>

            {issues.length > 0 && (
              <div className="space-y-1">
                {issues.slice(0, 20).map((i, idx) => (
                  <div key={idx} className={`rounded-md border px-3 py-1.5 text-[13px] ${i.level === 'error' ? 'border-critical text-critical' : 'border-line text-ink'}`}>
                    <span className="mr-2 font-medium">{i.dealCode}</span>
                    {i.text}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-semibold text-ink">KOC đã chốt, chưa có deal ({confirmedNoDeal.length})</div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>KOC</th>
                      <th className={TH}>Bậc</th>
                      <th className={`${TH} text-right`}>Thù lao chốt</th>
                      <th className={TH}>Hợp đồng nguyên tắc</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedNoDeal.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-ink-3">
                          Không có KOC nào đang chờ tạo deal.
                        </td>
                      </tr>
                    )}
                    {confirmedNoDeal.map(i => {
                      const fw = frameworks[normHandle(i.kocHandle)];
                      const st = frameworkState(fw);
                      const blocker = createDealBlocker(i, fw, deals);
                      return (
                        <tr key={i.id}>
                          <td className={TD}>
                            <div className="font-medium">@{i.kocHandle.replace(/^@/, '')}</div>
                            <div className="text-2xs text-ink-3">{i.kocName}</div>
                          </td>
                          <td className={TD}>{itemGrade(i) === 'TAP UpAffiliate' ? 'FOC' : itemGrade(i)}</td>
                          <td className={`${TD} text-right`}>{fmt(itemFee(i))}đ</td>
                          <td className={TD}>
                            <span className={st === 'VALID' ? 'text-ink' : 'text-critical'}>{FRAMEWORK_STATE_LABEL[st]}</span>
                            {fw?.contractNo && <span className="ml-2 text-2xs text-ink-3">{fw.contractNo}</span>}
                          </td>
                          <td className={`${TD} text-right`}>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => openFramework(i.kocHandle)}>
                                {fw ? 'Sửa hợp đồng nguyên tắc' : 'Ghi hợp đồng nguyên tắc'}
                              </Button>
                              <Button size="sm" variant="primary" disabled={Boolean(blocker)} title={blocker || undefined} onClick={() => makeDeal(i.id)}>
                                Tạo deal
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-ink">Deal ({deals.length})</div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Mã deal</th>
                      <th className={TH}>KOC</th>
                      <th className={TH}>Bậc</th>
                      <th className={TH}>Tuần</th>
                      <th className={TH}>Sản phẩm</th>
                      <th className={`${TH} text-right`}>Thù lao</th>
                      <th className={TH}>Bước hiện tại</th>
                      <th className={TH}>Nghiệm thu</th>
                      <th className={TH}>Thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-sm text-ink-3">
                          Chưa có deal nào.
                        </td>
                      </tr>
                    )}
                    {deals.map(d => (
                      <tr key={d.id} className="cursor-pointer hover:bg-sunken" onClick={() => setOpenDealId(d.id)}>
                        <td className={`${TD} font-medium`}>{d.code}</td>
                        <td className={TD}>@{d.kocHandle}</td>
                        <td className={TD}>{d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade}</td>
                        <td className={TD}>{d.week ? d.week.split(' ')[0] : '—'}</td>
                        <td className={TD}>{[d.productGroupName, d.productName].filter(Boolean).join(' · ') || '—'}</td>
                        <td className={`${TD} text-right`}>{fmt(d.fee)}đ</td>
                        <td className={TD}>{STAGES.find(s => s.key === stageOf(d))?.label}</td>
                        <td className={TD}>{isAcceptanceCleared(d) ? 'Đã qua' : ACCEPT_LABEL[d.acceptance.status]}</td>
                        <td className={TD}>{PAY_LABEL[d.payment.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal open={Boolean(openDeal)} onClose={() => setOpenDealId(null)} title={openDeal ? `Deal ${openDeal.code}` : 'Deal'} size="xl">
        {openDeal && renderDealModal(openDeal)}
      </Modal>

      <Modal
        open={Boolean(fwModal)}
        onClose={() => setFwModal(null)}
        title={fwModal ? `Hợp đồng nguyên tắc @${normHandle(fwModal.handle)}` : 'Hợp đồng nguyên tắc'}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="md" variant="secondary" onClick={() => setFwModal(null)}>
              Hủy
            </Button>
            <Button size="md" variant="primary" onClick={() => void saveFramework()}>
              Lưu
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Số hợp đồng">
            <Input value={fwForm.contractNo} onChange={e => setFwForm({ ...fwForm, contractNo: e.target.value })} />
          </Field>
          <Field label="Ngày ký">
            <Input type="date" value={fwForm.signedAt} onChange={e => setFwForm({ ...fwForm, signedAt: e.target.value })} />
          </Field>
          <Field label="Hiệu lực đến">
            <Input type="date" value={fwForm.validTo} onChange={e => setFwForm({ ...fwForm, validTo: e.target.value })} />
          </Field>
          <Field label="Link file hợp đồng">
            <Input value={fwForm.fileUrl} placeholder="https://" onChange={e => setFwForm({ ...fwForm, fileUrl: e.target.value })} />
          </Field>
          <Field label="Ghi chú" className="md:col-span-2">
            <Textarea rows={2} value={fwForm.note} onChange={e => setFwForm({ ...fwForm, note: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};
