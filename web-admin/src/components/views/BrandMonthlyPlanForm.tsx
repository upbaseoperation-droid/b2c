'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Search, Trash2 } from 'lucide-react';
import type { InputPlanBreakdownState, StorePortfolioItem } from '../../lib/types';
import { Button, ConfirmDialog, Field, Input, Modal, Select, Textarea } from '../ui';
import { CONTENT_PILLARS } from '../../lib/contentPillars';
import { weekLabelsForMonth } from '../../lib/planBreakdownRules';
import { usePlanRecord } from '../../lib/usePlanRecord';
import { SECTION_FIELDS, SECTION_LABEL, type BrandPlanAccess } from '../../lib/brandPlanAccess';
import {
  EMPTY_PRODUCT_CATALOG,
  findCatalogProduct,
  listAllCatalogProducts,
  resolveEffectiveProductGuidelines,
  resolveEffectiveSampleQuota,
  type BrandProductCatalog,
} from '../../lib/productCatalog';
import { ProductCatalogView } from './ProductCatalogView';
import {
  APPROVAL_LABEL,
  CHANNEL_LABEL,
  DIRECTION_FIELDS,
  EMPTY_BRAND_PLAN,
  KEY_VISUAL_FIELDS,
  KL_OPTIONS,
  KPI_ROWS,
  MILESTONE_DATES,
  OVERVIEW_GROUPS,
  OVERVIEW_METRICS,
  SOURCES,
  SOURCE_LABEL,
  STRATEGY_OWNER_MODE_LABEL,
  aggregateWeeks,
  computeKpi,
  computeOverview,
  daysBetween,
  detectChannel,
  diagnoseBrandPlan,
  getTierBookingOwnerLabel,
  newId,
  newMilestone,
  newPillar,
  newRow,
  sumWeeks,
  type BrandPlanData,
  type BrandPlanPillar,
  type BrandPlanApprovalStatus,
  type BrandPlanRow,
  type KeyVisualMilestone,
  type ContentSource,
  type KpiUnit,
  type PlanChannel,
  type StrategyOwnerMode,
} from '../../lib/brandPlanRules';

interface BrandMonthlyPlanFormProps {
  currentUserName?: string;
  currentUserRole?: string;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type PlanTab = 'DIRECTION' | 'KPI' | 'KEY_VISUAL' | 'TIKTOK' | 'SHOPEE' | 'PILLAR' | 'CHECK';

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };
const PLAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING_PRE_APPROVAL: 'Chờ Leader',
  PENDING_APPROVAL: 'Chờ Giám đốc',
  APPROVED: 'Đã duyệt',
  CHANGES_REQUESTED: 'Cần sửa',
};

function show(v: number | null | undefined, unit: KpiUnit): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (unit === 'pct') return `${(v * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
  if (unit === 'ratio') return v.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  return fmt(v);
}

const NumInput: React.FC<{ value: number | null | undefined; onChange: (v: number | null) => void; scale?: number; className?: string; placeholder?: string }> = ({
  value,
  onChange,
  scale = 1,
  className = '',
  placeholder,
}) => (
  <Input
    type="number"
    min={0}
    className={`h-8 text-right tabular-nums ${className}`}
    placeholder={placeholder}
    value={value === null || value === undefined ? '' : Math.round(value * scale * 1e6) / 1e6}
    onChange={e => {
      const raw = e.target.value;
      if (raw === '') return onChange(null);
      const n = Number(raw);
      onChange(Number.isFinite(n) && n >= 0 ? n / scale : null);
    }}
  />
);

const TH = 'whitespace-nowrap border-b border-line bg-sunken px-2.5 py-2 text-left text-2xs font-medium text-ink-3';
const TD = 'border-b border-line px-2.5 py-1.5 align-top text-[13px] text-ink';

export const BrandMonthlyPlanForm: React.FC<BrandMonthlyPlanFormProps> = ({ currentUserName = 'Nhân viên', currentUserRole, onNotify }) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);

  const [plans, setPlans] = useState<InputPlanBreakdownState[]>([]);
  const [accessById, setAccessById] = useState<Record<string, BrandPlanAccess>>({});
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<PlanTab>('DIRECTION');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Gồm cả kế hoạch của gian mình giữ vị trí Plan / Strategy, Key Visual / SIS
        const res = await fetch('/api/brand-plan?list=1', { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
        if (cancelled) return;
        const rows = body.plans as { plan: InputPlanBreakdownState; access: BrandPlanAccess }[];
        setPlans(rows.map(p => p.plan));
        setAccessById(Object.fromEntries(rows.map(p => [p.plan.id, p.access])));
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

  const activePlanId = useMemo(() => {
    if (selectedId && visiblePlans.some(p => p.id === selectedId)) return selectedId;
    return visiblePlans[0]?.id ?? null;
  }, [selectedId, visiblePlans]);

  const plan = useMemo(() => plans.find(p => p.id === activePlanId) || null, [plans, activePlanId]);
  const { data, status, update, saveNow } = usePlanRecord<BrandPlanData>('/api/brand-plan', plan?.id ?? null, EMPTY_BRAND_PLAN, msg => notify(msg, 'warning'));

  const [catalogStores, setCatalogStores] = useState<StorePortfolioItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/master-data', { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        setCatalogStores((body?.data?.stores as StorePortfolioItem[]) || []);
      } catch {
        /* không có danh bạ nhóm phụ trách thì chỉ bỏ gợi ý PIC */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogStore = useMemo(() => {
    if (!plan) return null;
    const slugOf = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const store = catalogStores.find(s => (plan.storeId && s.id === plan.storeId) || (plan.storeName && slugOf(s.storeName || '') === slugOf(plan.storeName)));
    return store || null;
  }, [plan, catalogStores]);

  const members = useMemo(() => {
    const store = catalogStore;
    if (!store) return [] as string[];
    const names = [store.primaryPic, store.assignedPic, store.assignedStaff, store.b2cOwnerName, store.bookingLeader, ...(store.assignedMembers || []), ...(store.b2cOwners || [])];
    return Array.from(new Set(names.map(n => (n || '').trim()).filter(Boolean)));
  }, [catalogStore]);

  const channelHint: PlanChannel | null = catalogStore ? (catalogStore.platform === 'TikTok Shop' ? 'TIKTOK' : catalogStore.platform === 'Shopee Mall' ? 'SHOPEE' : null) : null;

  // Nhóm sản phẩm & Danh mục SKU/Combo của Brand (Chiều Sản phẩm xuyên tháng)
  const [brandCatalog, setBrandCatalog] = useState<BrandProductCatalog>(EMPTY_PRODUCT_CATALOG);
  const [productGroups, setProductGroups] = useState<{ id: string; name: string }[] | null>(null);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const planBrand = plan?.brandName || '';
  const allPlanBrandNames = useMemo(
    () => Array.from(new Set(plans.map(p => p.brandName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [plans]
  );
  const [prevPlanBrand, setPrevPlanBrand] = useState(planBrand);
  if (planBrand !== prevPlanBrand) {
    setPrevPlanBrand(planBrand);
    setBrandCatalog(EMPTY_PRODUCT_CATALOG);
    setProductGroups(null);
  }
  useEffect(() => {
    if (!planBrand) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/product-catalog?brand=${encodeURIComponent(planBrand)}`, { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        const cat = (body?.data as BrandProductCatalog) || EMPTY_PRODUCT_CATALOG;
        setBrandCatalog(cat);
        setProductGroups((cat.groups || []).map(g => ({ id: g.id, name: g.name })));
      } catch {
        /* không tải được danh mục thì bỏ qua phần kiểm nhóm sản phẩm */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planBrand]);
  const weeks = useMemo(() => (plan ? weekLabelsForMonth(plan.month) : []), [plan]);
  const kpi = useMemo(() => computeKpi(data.kpi), [data.kpi]);
  const issues = useMemo(() => (plan ? diagnoseBrandPlan(plan, data, members, channelHint, productGroups) : []), [plan, data, members, channelHint, productGroups]);
  const errorCount = issues.filter(i => i.level === 'error').length;
  const channelOfStore = channelHint ?? (plan ? detectChannel(plan) : null);

  const [prevPlanIdForTab, setPrevPlanIdForTab] = useState(plan?.id || '');
  if ((plan?.id || '') !== prevPlanIdForTab) {
    setPrevPlanIdForTab(plan?.id || '');
    if (channelOfStore === 'TIKTOK' && tab === 'SHOPEE') setTab('TIKTOK');
    else if (channelOfStore === 'SHOPEE' && tab === 'TIKTOK') setTab('SHOPEE');
  }

  const normalizeName = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const isManagerUser = useMemo(() => {
    const managerRoles = ['ADMIN', 'MANAGER', 'LEADER', 'FINANCE'];
    if (currentUserRole && managerRoles.includes(currentUserRole)) return true;
    const nameSlug = normalizeName(currentUserName);
    if (nameSlug === normalizeName('Đặng Thị Yến Nhi') || nameSlug === normalizeName('Đỗ Văn Giang')) return true;
    if (catalogStore?.bookingLeader && normalizeName(catalogStore.bookingLeader) === nameSlug) return true;
    return false;
  }, [currentUserRole, currentUserName, catalogStore?.bookingLeader]);

  const canEditRow = (r: BrandPlanRow) => {
    if (isManagerUser) return true;
    if (!r.pic || !r.pic.trim()) return true;
    return normalizeName(r.pic) === normalizeName(currentUserName);
  };

  // Quyền theo phần: PIC gian sửa cả plan; PIC Plan / Strategy, Key Visual / SIS chỉ thấy và sửa phần được giao (máy chủ cũng chặn)
  const access: BrandPlanAccess = (plan && accessById[plan.id]) || { full: false, sections: [] };
  const sectionOnly = !access.full && access.sections.length > 0;
  const readOnly = !access.full && access.sections.length === 0;
  const allowedFields = useMemo(() => new Set(access.sections.flatMap(s => SECTION_FIELDS[s])), [access.sections]);

  const approvalStatus = data.approval.status;
  const locked = approvalStatus === 'PENDING' || approvalStatus === 'APPROVED' || readOnly;
  const [decisionNote, setDecisionNote] = useState('');

  const patch = (next: Partial<BrandPlanData>) => {
    if (readOnly) {
      notify('Bạn chỉ được xem plan này.', 'warning');
      return;
    }
    if (locked) {
      notify(approvalStatus === 'PENDING' ? 'Plan đang chờ duyệt, rút lại để sửa tiếp.' : 'Plan đã được duyệt, cần người duyệt yêu cầu mở lại.', 'warning');
      return;
    }
    if (sectionOnly && (Object.keys(next) as (keyof BrandPlanData)[]).some(k => !allowedFields.has(k))) {
      notify(`Bạn chỉ được sửa phần ${access.sections.map(s => SECTION_LABEL[s]).join(', ')}.`, 'warning');
      return;
    }
    update({ ...data, ...next });
  };
  // Chuyển trạng thái duyệt: máy chủ kiểm quyền và ghi người thao tác
  const changeApproval = (to: BrandPlanApprovalStatus, note = '') => {
    update({ ...data, approval: { ...data.approval, status: to, note } });
    saveNow();
    setDecisionNote('');
  };
  const patchRow = (id: string, next: Partial<BrandPlanRow>) => patch({ rows: data.rows.map(r => (r.id === id ? { ...r, ...next } : r)) });

  const allTabs: { key: PlanTab; label: string }[] = [
    { key: 'DIRECTION', label: '1. Định hướng' },
    { key: 'KPI', label: '2. KPI tháng' },
    { key: 'KEY_VISUAL', label: '3. Key Visual' },
    { key: 'TIKTOK', label: '4. TikTok Shop' },
    { key: 'SHOPEE', label: '5. Shopee' },
    { key: 'PILLAR', label: `Pillar (${data.pillars.length})` },
    { key: 'CHECK', label: issues.length ? `Kiểm tra (${issues.length})` : 'Kiểm tra' },
  ];
  const tabs = sectionOnly
    ? allTabs.filter(t => (t.key === 'DIRECTION' && access.sections.includes('STRATEGY')) || (t.key === 'KEY_VISUAL' && access.sections.includes('KEY_VISUAL')))
    : allTabs;
  const activeTab: PlanTab = tabs.some(t => t.key === tab) ? tab : tabs[0]?.key ?? 'DIRECTION';

  /* ------------------------------------------------------- 1. Định hướng */
  const renderDirection = () => {
    const ownerMode: StrategyOwnerMode = data.strategyOwnerMode || 'CONTENT_TEAM';
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-sunken/40 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Chủ trì chiến lược (1 Dự Án — 1 Strategy Owner)">
              <Select
                value={ownerMode}
                onChange={e => patch({ strategyOwnerMode: e.target.value as StrategyOwnerMode })}
              >
                {(Object.keys(STRATEGY_OWNER_MODE_LABEL) as StrategyOwnerMode[]).map(k => (
                  <option key={k} value={k}>
                    {STRATEGY_OWNER_MODE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Người lập / duyệt">
              <Input value={data.planner} onChange={e => patch({ planner: e.target.value })} placeholder={plan?.pic || currentUserName} />
            </Field>
            <Field label="Ngày chốt / trạng thái">
              <Input value={data.statusNote} onChange={e => patch({ statusNote: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {DIRECTION_FIELDS.map(f => (
            <Field key={f.key} label={f.label}>
              <Textarea rows={3} value={data.direction[f.key] || ''} onChange={e => patch({ direction: { ...data.direction, [f.key]: e.target.value } })} />
            </Field>
          ))}
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------- 2. KPI */
  const renderKpi = () => {
    let lastGroup = '';
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={TH}>Chỉ số</th>
                <th className={`${TH} w-[190px] ${channelOfStore === 'SHOPEE' ? 'text-accent font-semibold' : ''}`}>Target Shopee</th>
                <th className={`${TH} w-[190px] ${channelOfStore === 'TIKTOK' ? 'text-accent font-semibold' : ''}`}>Target TikTok Shop</th>
                <th className={`${TH} w-[170px] text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {KPI_ROWS.map(r => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                const cell = kpi[r.key];
                return (
                  <React.Fragment key={r.key}>
                    {header && (
                      <tr>
                        <td colSpan={4} className="border-b border-line bg-sunken/60 px-2.5 py-1.5 text-xs font-semibold text-ink">
                          {header}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className={TD}>{r.label}</td>
                      {(['shopee', 'tiktok'] as const).map(col => (
                        <td key={col} className={TD}>
                          {r.kind === 'input' ? (
                            <div className="flex items-center gap-1.5">
                              <NumInput
                                value={data.kpi[r.key]?.[col]}
                                scale={r.unit === 'pct' ? 100 : 1}
                                onChange={v => patch({ kpi: { ...data.kpi, [r.key]: { ...data.kpi[r.key], [col]: v } } })}
                              />
                              {r.unit === 'pct' && <span className="text-xs text-ink-3">%</span>}
                            </div>
                          ) : (
                            <div className="px-1 text-right tabular-nums text-ink-2">{show(cell?.[col], r.unit)}</div>
                          )}
                        </td>
                      ))}
                      <td className={`${TD} text-right tabular-nums font-medium`}>{show(cell?.total, r.unit)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Field label="Ghi chú KPI">
          <Textarea rows={3} value={data.kpiNote} onChange={e => patch({ kpiNote: e.target.value })} />
        </Field>
      </div>
    );
  };

  /* ------------------------------------------------------ 3. Key Visual */
  const patchMilestone = (id: string, next: Partial<KeyVisualMilestone>) => patch({ milestones: data.milestones.map(m => (m.id === id ? { ...m, ...next } : m)) });
  const gap = (a: string, b: string) => {
    const d = daysBetween(a, b);
    return d === null ? null : d;
  };

  const renderKeyVisual = () => {
    const shortFields = KEY_VISUAL_FIELDS.filter(f => !f.long);
    const longFields = KEY_VISUAL_FIELDS.filter(f => f.long);
    const allCatProducts = listAllCatalogProducts(brandCatalog);
    return (
      <div className="space-y-5">
        <datalist id="brand-plan-main-products">
          {allCatProducts.map(({ group, product }) => (
            <option key={product.id} value={product.name} label={`${group.name} · ${product.sku || product.role}`} />
          ))}
        </datalist>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {shortFields.map(f => (
            <Field key={f.key} label={f.label}>
              <Input
                list={f.key === 'mainProduct' ? 'brand-plan-main-products' : undefined}
                value={data.keyVisual[f.key] || ''}
                onChange={e => patch({ keyVisual: { ...data.keyVisual, [f.key]: e.target.value } })}
              />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {longFields.map(f => (
            <Field key={f.key} label={f.label}>
              <Textarea rows={3} value={data.keyVisual[f.key] || ''} onChange={e => patch({ keyVisual: { ...data.keyVisual, [f.key]: e.target.value } })} />
            </Field>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">Mốc Key Visual</div>
            <Button size="sm" variant="primary" icon={Plus} onClick={() => patch({ milestones: [...data.milestones, newMilestone(data.milestones.length === 0 ? 'Master' : '')] })}>
              Thêm phiên bản
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Phiên bản</th>
                  {MILESTONE_DATES.map(d => (
                    <th key={d.key} className={TH}>
                      {d.label}
                    </th>
                  ))}
                  <th className={TH}>Ghi chú</th>
                  <th className={`${TH} w-[48px] text-center`}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {data.milestones.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-ink-3">
                      Chưa có phiên bản nào.
                    </td>
                  </tr>
                )}
                {data.milestones.map(m => (
                  <tr key={m.id}>
                    <td className={`${TD} w-[160px]`}>
                      <Input className="h-8" value={m.name} placeholder="Master, Adapt 11.11…" onChange={e => patchMilestone(m.id, { name: e.target.value })} />
                    </td>
                    {MILESTONE_DATES.map((d, i) => {
                      const prev = i > 0 ? MILESTONE_DATES[i - 1] : null;
                      const days = prev ? gap(m[prev.key], m[d.key]) : null;
                      return (
                        <td key={d.key} className={`${TD} w-[140px]`}>
                          <Input type="date" className="h-8" value={m[d.key]} onChange={e => patchMilestone(m.id, { [d.key]: e.target.value })} />
                          {days !== null && <div className={`mt-0.5 text-2xs ${days < 0 ? 'text-critical' : 'text-ink-3'}`}>{days < 0 ? `Trước ${prev!.label} ${-days} ngày` : `Sau ${prev!.label} ${days} ngày`}</div>}
                        </td>
                      );
                    })}
                    <td className={`${TD} w-[220px]`}>
                      <Textarea rows={2} value={m.note} onChange={e => patchMilestone(m.id, { note: e.target.value })} />
                    </td>
                    <td className={`${TD} w-[48px] text-center`}>
                      <button type="button" aria-label="Xóa phiên bản" className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical" onClick={() => patch({ milestones: data.milestones.filter(x => x.id !== m.id) })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------- Pillar */
  const pillarName = (id: string) => data.pillars.find(p => p.id === id)?.name || '';
  const pillarQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data.rows) if (r.pillarId) m.set(r.pillarId, (m.get(r.pillarId) || 0) + (r.qty || 0));
    return m;
  }, [data.rows]);
  const pillarTotalQty = Array.from(pillarQty.values()).reduce((s, v) => s + v, 0);
  const pillarTotalShare = data.pillars.reduce((s, p) => s + (p.sharePct || 0), 0);

  const patchPillar = (index: number, next: Partial<BrandPlanPillar>) => patch({ pillars: data.pillars.map((p, i) => (i === index ? { ...p, ...next } : p)) });
  const [pillarPick, setPillarPick] = useState('');
  const [pendingDeletePillar, setPendingDeletePillar] = useState<{ index: number; id: string; usedCount: number } | null>(null);

  const addPillarFromCatalog = () => {
    const found = CONTENT_PILLARS.find(p => p.name === pillarPick);
    if (!found) return;
    const nextId = `P${String(data.pillars.length + 1).padStart(2, '0')}`;
    patch({ pillars: [...data.pillars, { ...newPillar(), id: nextId, name: found.name, goal: found.definition || '' }] });
    setPillarPick('');
  };

  const renderPillars = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" icon={Plus} onClick={() => patch({ pillars: [...data.pillars, { ...newPillar(), id: `P${String(data.pillars.length + 1).padStart(2, '0')}` }] })}>
          Thêm pillar
        </Button>
        <Select value={pillarPick} onChange={e => setPillarPick(e.target.value)} className="max-w-[260px]">
          <option value="">Chọn từ danh mục pillar</option>
          {CONTENT_PILLARS.map(p => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" disabled={!pillarPick} onClick={addPillarFromCatalog}>
          Thêm từ danh mục
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[1320px] border-collapse">
          <thead>
            <tr>
              <th className={`${TH} w-[84px]`}>Pillar ID</th>
              <th className={`${TH} w-[170px]`}>Tên pillar</th>
              <th className={`${TH} w-[200px]`}>Mục tiêu / hành vi</th>
              <th className={`${TH} w-[200px]`}>Insight / rào cản</th>
              <th className={`${TH} w-[200px]`}>Thông điệp / RTB</th>
              <th className={`${TH} w-[200px]`}>Angle ưu tiên</th>
              <th className={`${TH} w-[150px]`}>Format phù hợp</th>
              <th className={`${TH} w-[115px] text-right`}>Tỷ trọng (%)</th>
              <th className={`${TH} w-[110px] text-right`}>SL video</th>
              <th className={`${TH} sticky right-0 z-10 w-[52px] border-l border-line bg-sunken text-center`}>Xóa</th>
            </tr>
          </thead>
          <tbody>
            {data.pillars.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-ink-3">
                  Chưa có pillar nào.
                </td>
              </tr>
            )}
            {data.pillars.map((p, i) => {
              const q = pillarQty.get(p.id) || 0;
              return (
                <tr key={i} className="group hover:bg-canvas">
                  <td className={`${TD} w-[84px]`}>
                    <Input className="h-8 font-mono" value={p.id} onChange={e => patchPillar(i, { id: e.target.value.toUpperCase() })} />
                  </td>
                  <td className={`${TD} w-[170px]`}>
                    <Input className="h-8" value={p.name} onChange={e => patchPillar(i, { name: e.target.value })} />
                  </td>
                  {(['goal', 'insight', 'message', 'angle'] as const).map(k => (
                    <td key={k} className={`${TD} w-[200px]`}>
                      <Textarea rows={2} value={p[k]} onChange={e => patchPillar(i, { [k]: e.target.value })} />
                    </td>
                  ))}
                  <td className={`${TD} w-[150px]`}>
                    <Input className="h-8" value={p.format} onChange={e => patchPillar(i, { format: e.target.value })} />
                  </td>
                  <td className={`${TD} w-[115px]`}>
                    <NumInput value={p.sharePct} onChange={v => patchPillar(i, { sharePct: v })} />
                  </td>
                  <td className={`${TD} w-[110px] text-right tabular-nums`}>
                    {fmt(q)}
                    {pillarTotalQty > 0 && <div className="text-2xs text-ink-3">{Math.round((q / pillarTotalQty) * 100)}%</div>}
                  </td>
                  <td className={`${TD} sticky right-0 z-10 w-[52px] border-l border-line bg-surface text-center group-hover:bg-canvas`}>
                    <button
                      type="button"
                      aria-label="Xóa pillar"
                      className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-critical"
                      onClick={() => {
                        const used = data.rows.filter(r => r.pillarId === p.id).length;
                        if (used > 0) {
                          setPendingDeletePillar({ index: i, id: p.id, usedCount: used });
                          return;
                        }
                        patch({ pillars: data.pillars.filter((_, k) => k !== i), rows: data.rows.map(r => (r.pillarId === p.id ? { ...r, pillarId: '' } : r)) });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {data.pillars.length > 0 && (
              <tr className="bg-sunken/40">
                <td colSpan={7} className={`${TD} text-right font-semibold`}>
                  Tổng cộng ({data.pillars.length} pillar)
                </td>
                <td className={`${TD} text-right tabular-nums font-semibold ${pillarTotalShare > 0 && Math.round(pillarTotalShare) !== 100 ? 'text-warning' : 'text-ink'}`}>
                  {fmt(pillarTotalShare)}%
                </td>
                <td className={`${TD} text-right tabular-nums font-semibold`}>{fmt(pillarTotalQty)}</td>
                <td className={`${TD} sticky right-0 z-10 border-l border-line bg-sunken/40`} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ---------------------------------------------------- Kênh TikTok/Shopee */
  const renderOverviewCard = (group: (typeof OVERVIEW_GROUPS)[number], ov: ReturnType<typeof computeOverview>) => (
    <div key={group} className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line bg-sunken px-3 py-2 text-xs font-semibold text-ink">{group}</div>
      <div className="space-y-1.5 p-3">
        {OVERVIEW_METRICS.filter(m => m.group === group).map(m => (
          <div key={m.key} className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
            <div className="text-[13px] text-ink">{m.label}</div>
            {m.kind === 'input' ? (
              <NumInput value={data.overview[m.key]} onChange={v => patch({ overview: { ...data.overview, [m.key]: v } })} />
            ) : (
              <div className="px-2 text-right tabular-nums text-[13px] text-ink-2">{show(ov[m.key], m.unit)}</div>
            )}
          </div>
        ))}
        <Textarea
          rows={2}
          placeholder="Ghi chú"
          value={data.overviewNotes[group] || ''}
          onChange={e => patch({ overviewNotes: { ...data.overviewNotes, [group]: e.target.value } })}
        />
      </div>
    </div>
  );

  const renderChannel = (channel: PlanChannel) => {
    const agg = aggregateWeeks(data.rows, channel, weeks);
    const tot = sumWeeks(agg);
    const rows = data.rows.filter(r => r.channel === channel);
    const targets = data.weekTargets[channel] || {};
    const ov = computeOverview(data.overview);
    const setTarget = (week: string, next: { gmv?: number | null; views?: number | null }) =>
      patch({ weekTargets: { ...data.weekTargets, [channel]: { ...targets, [week]: { ...targets[week], ...next } } } });
    const addRow = (week: string, source: ContentSource = 'AFFILIATE') =>
      patch({
        rows: [
          ...data.rows,
          {
            ...newRow(channel, week),
            source,
            ...(source === 'AFFILIATE' ? {} : { kl: '' }),
            pic: isManagerUser ? (plan?.pic || currentUserName) : currentUserName,
          },
        ],
      });
    const copyRow = (r: BrandPlanRow) => {
      const idx = data.rows.findIndex(x => x.id === r.id);
      const next = [...data.rows];
      next.splice(idx + 1, 0, { ...r, id: newId('PR') });
      patch({ rows: next });
    };
    const delRow = (id: string) => patch({ rows: data.rows.filter(r => r.id !== id) });
    const hasAff = tot.affQty > 0 || tot.affBudget > 0;

    return (
      <div className="space-y-5">
        {channel === 'TIKTOK' && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-ink">Tổng quan</div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 items-start">
              {OVERVIEW_GROUPS.map(group => renderOverviewCard(group, ov))}
            </div>
          </div>
        )}

        {channel === 'TIKTOK' && (
          <>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-ink">Số lượng theo tuần</div>
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full min-w-[820px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Tuần</th>
                      <th className={`${TH} text-right`}>Tổng video AFF</th>
                      {KL_OPTIONS.map(k => (
                        <th key={k} className={`${TH} text-right`}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agg.map(w => (
                      <tr key={w.week}>
                        <td className={TD}>{w.week}</td>
                        <td className={`${TD} text-right tabular-nums font-medium`}>{fmt(w.affQty)}</td>
                        {KL_OPTIONS.map(k => (
                          <td key={k} className={`${TD} text-right tabular-nums text-ink-2`}>
                            {w.affByKl[k].qty ? fmt(w.affByKl[k].qty) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-sunken/40">
                      <td className={`${TD} font-semibold`}>Tổng tháng</td>
                      <td className={`${TD} text-right tabular-nums font-semibold`}>{fmt(tot.affQty)}</td>
                      {KL_OPTIONS.map(k => {
                        const s = agg.reduce((a, w) => a + w.affByKl[k].qty, 0);
                        return (
                          <td key={k} className={`${TD} text-right tabular-nums font-semibold`}>
                            {s ? fmt(s) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-ink">Ngân sách theo tuần (Net)</div>
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full min-w-[820px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Tuần</th>
                      <th className={`${TH} text-right`}>Tổng chi phí</th>
                      {KL_OPTIONS.map(k => (
                        <th key={k} className={`${TH} text-right`}>
                          {k === 'TAP' ? 'TAP' : `NS ${k}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agg.map(w => (
                      <tr key={w.week}>
                        <td className={TD}>{w.week}</td>
                        <td className={`${TD} text-right tabular-nums font-medium`}>{fmt(w.affBudget)}</td>
                        {KL_OPTIONS.map(k => (
                          <td key={k} className={`${TD} text-right tabular-nums text-ink-2`}>
                            {w.affByKl[k].budget ? fmt(w.affByKl[k].budget) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-sunken/40">
                      <td className={`${TD} font-semibold`}>Tổng tháng</td>
                      <td className={`${TD} text-right tabular-nums font-semibold`}>{fmt(tot.affBudget)}</td>
                      {KL_OPTIONS.map(k => {
                        const s = agg.reduce((a, w) => a + w.affByKl[k].budget, 0);
                        return (
                          <td key={k} className={`${TD} text-right tabular-nums font-semibold`}>
                            {s ? fmt(s) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <div className="text-sm font-semibold text-ink">Target theo tuần</div>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Tuần</th>
                  <th className={`${TH} text-right`}>Số video / phiên</th>
                  <th className={`${TH} text-right`}>Ngân sách</th>
                  {channel === 'SHOPEE' && <th className={`${TH} w-[150px] text-right`}>View video target</th>}
                  <th className={`${TH} w-[170px] text-right`}>GMV target</th>
                  {channel === 'SHOPEE' && <th className={`${TH} text-right`}>View / video</th>}
                  <th className={`${TH} text-right`}>{channel === 'TIKTOK' ? 'CP booking / GMV' : 'GMV / chi phí'}</th>
                </tr>
              </thead>
              <tbody>
                {agg.map(w => {
                  const t = targets[w.week] || {};
                  const qty = channel === 'TIKTOK' ? w.affQty : w.totalQty;
                  const cost = channel === 'TIKTOK' ? w.affBudget : w.totalBudget;
                  const gmv = typeof t.gmv === 'number' ? t.gmv : null;
                  const views = typeof t.views === 'number' ? t.views : null;
                  const ratio = gmv !== null && cost > 0 ? (channel === 'TIKTOK' ? cost / gmv : gmv / cost) : null;
                  return (
                    <tr key={w.week}>
                      <td className={TD}>{w.week}</td>
                      <td className={`${TD} text-right tabular-nums`}>{fmt(qty)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{fmt(cost)}</td>
                      {channel === 'SHOPEE' && (
                        <td className={TD}>
                          <NumInput value={views} onChange={v => setTarget(w.week, { views: v })} />
                        </td>
                      )}
                      <td className={TD}>
                        <NumInput value={gmv} onChange={v => setTarget(w.week, { gmv: v })} />
                      </td>
                      {channel === 'SHOPEE' && <td className={`${TD} text-right tabular-nums text-ink-2`}>{views !== null && qty > 0 ? fmt(views / qty) : '—'}</td>}
                      <td className={`${TD} text-right tabular-nums text-ink-2`}>
                        {ratio === null ? '—' : channel === 'TIKTOK' ? `${(ratio * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : ratio.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">Chi tiết Content</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setCatalogModalOpen(true)}>
                Danh mục SP &amp; Combo ({planBrand || 'Brand'})
              </Button>
              <Button size="sm" variant="primary" icon={Plus} onClick={() => addRow(weeks[0] || '', channel === 'SHOPEE' ? 'SELF' : 'AFFILIATE')}>
                Thêm dòng
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[1780px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-[150px]`}>Tuần</th>
                  <th className={`${TH} w-[95px]`}>Ngày air</th>
                  <th className={`${TH} w-[170px]`}>Nhóm sản phẩm</th>
                  <th className={`${TH} w-[210px]`}>SKU / Combo</th>
                  <th className={`${TH} w-[155px]`}>Nguồn / điểm chạm</th>
                  <th className={`${TH} w-[135px]`}>Bậc KL</th>
                  <th className={`${TH} w-[200px]`}>Tệp KOC / tiêu chí chọn</th>
                  <th className={`${TH} w-[170px]`}>Pillar</th>
                  <th className={`${TH} w-[120px]`}>Mục tiêu</th>
                  <th className={`${TH} w-[230px]`}>Angle / brief</th>
                  <th className={`${TH} w-[105px]`}>Type</th>
                  <th className={`${TH} w-[105px]`}>Sản xuất</th>
                  <th className={`${TH} w-[90px] text-right`}>Số lượng</th>
                  <th className={`${TH} w-[135px] text-right`}>Ngân sách (Net)</th>
                  <th className={`${TH} w-[135px]`}>PIC</th>
                  <th className={`${TH} sticky right-0 z-10 w-[72px] border-l border-line bg-sunken text-center`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-3 py-8 text-center text-sm text-ink-3">
                      Chưa có dòng content nào.
                    </td>
                  </tr>
                )}
                {rows.map(r => {
                  const rowEditable = !locked && canEditRow(r);
                  const lockTitle = rowEditable ? undefined : `Chỉ PIC (${r.pic || 'chưa gán'}) hoặc Leader/Quản lý mới có quyền chỉnh sửa dòng này`;
                  const groupObj = (brandCatalog.groups || []).find(g => g.id === r.productGroupId);
                  const groupProducts = groupObj?.products || [];
                  const matchedProd = findCatalogProduct(brandCatalog, r.sku, r.productGroupId)?.product;
                  const sampleCheck = resolveEffectiveSampleQuota(brandCatalog, matchedProd);
                  return (
                    <tr key={r.id} className={`group ${rowEditable ? 'hover:bg-canvas' : 'bg-sunken/40'}`} title={lockTitle}>
                      <td className={`${TD} w-[150px]`}>
                        <Select value={r.week} disabled={!rowEditable} onChange={e => patchRow(r.id, { week: e.target.value })}>
                          <option value="">Chọn tuần</option>
                          {weeks.map(w => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                          {r.week && !weeks.includes(r.week) && <option value={r.week}>{r.week}</option>}
                        </Select>
                      </td>
                      <td className={`${TD} w-[95px]`}>
                        <Input className="h-8" value={r.airDate} disabled={!rowEditable} placeholder="dd/mm" onChange={e => patchRow(r.id, { airDate: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[170px]`}>
                        <Select
                          value={r.productGroupId}
                          disabled={!rowEditable}
                          onChange={e => {
                            const nextGroupId = e.target.value;
                            const nextGroup = (brandCatalog.groups || []).find(g => g.id === nextGroupId);
                            const defaultProd = nextGroup?.products?.[0];
                            const nextPatch: Partial<BrandPlanRow> = { productGroupId: nextGroupId };
                            if (defaultProd && !r.sku.trim()) {
                              nextPatch.sku = defaultProd.name;
                            }
                            if (nextGroup && !r.angle.trim()) {
                              const eff = resolveEffectiveProductGuidelines(brandCatalog, nextGroupId, defaultProd);
                              if (eff.usp) nextPatch.angle = eff.usp;
                            }
                            patchRow(r.id, nextPatch);
                          }}
                        >
                          <option value="">Chọn nhóm</option>
                          {(productGroups || []).map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name || 'Chưa đặt tên'}
                            </option>
                          ))}
                          {r.productGroupId && !(productGroups || []).some(g => g.id === r.productGroupId) && <option value={r.productGroupId}>Nhóm không còn trong danh mục</option>}
                        </Select>
                      </td>
                      <td className={`${TD} w-[210px]`}>
                        <div className="space-y-1">
                          {groupProducts.length > 0 && (
                            <Select
                              value={matchedProd?.name || ''}
                              disabled={!rowEditable}
                              onChange={e => {
                                const val = e.target.value;
                                if (!val) return;
                                const picked = groupProducts.find(p => p.name === val);
                                const nextPatch: Partial<BrandPlanRow> = { sku: val };
                                if (picked && !r.angle.trim()) {
                                  const eff = resolveEffectiveProductGuidelines(brandCatalog, r.productGroupId, picked);
                                  if (eff.usp) nextPatch.angle = eff.usp;
                                }
                                patchRow(r.id, nextPatch);
                              }}
                            >
                              <option value="">-- Móc từ Danh mục SP/Combo --</option>
                              {groupProducts.map(p => {
                                const isC = p.productType === 'HARD_BUNDLE' || p.productType === 'ROUTINE_COMBO';
                                const tag = isC ? '[COMBO]' : `[${p.role || 'HERO'}]`;
                                const stTag = p.status === 'OUT_OF_STOCK' ? ' · [HẾT HÀNG]' : p.status === 'STOPPED' ? ' · [NGỪNG BÁN]' : '';
                                return (
                                  <option key={p.id} value={p.name}>
                                    {tag} {p.name || p.sku}{stTag}
                                  </option>
                                );
                              })}
                            </Select>
                          )}
                          <Input
                            className="h-8"
                            value={r.sku}
                            disabled={!rowEditable}
                            placeholder={groupProducts.length > 0 ? 'Hoặc gõ tên SKU / Combo' : 'Nhập tên SKU / Combo'}
                            onChange={e => patchRow(r.id, { sku: e.target.value })}
                          />
                          {matchedProd && (
                            <div className="flex flex-wrap items-center gap-1 text-2xs text-ink-3">
                              <span className="font-medium text-ink-2">
                                {matchedProd.productType === 'HARD_BUNDLE'
                                  ? 'Combo sàn'
                                  : matchedProd.productType === 'ROUTINE_COMBO'
                                    ? `Routine (${(matchedProd.bundleComponents || []).length} món)`
                                    : matchedProd.role || 'HERO'}
                              </span>
                              {sampleCheck.remaining !== null && <span>· Mẫu: {sampleCheck.remaining}</span>}
                              {sampleCheck.hasOutOfStockComponent && <span className="font-semibold text-critical">· Hết hàng!</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`${TD} w-[155px]`}>
                        <Select value={r.source} disabled={!rowEditable} onChange={e => patchRow(r.id, { source: e.target.value as ContentSource, kl: e.target.value === 'AFFILIATE' ? r.kl : '' })}>
                          {SOURCES.map(s => (
                            <option key={s} value={s}>
                              {SOURCE_LABEL[s]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={`${TD} w-[135px]`}>
                        {r.source === 'AFFILIATE' ? (
                          <div className="space-y-1">
                            <Select value={r.kl} disabled={!rowEditable} onChange={e => patchRow(r.id, { kl: e.target.value })}>
                              <option value="">Chọn</option>
                              {KL_OPTIONS.map(k => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </Select>
                            {r.kl && (
                              <div className="text-2xs text-ink-3 truncate">
                                {getTierBookingOwnerLabel(r.kl, r.source)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-2 py-1.5 text-2xs text-ink-3">{getTierBookingOwnerLabel('', r.source)}</div>
                        )}
                      </td>
                      <td className={`${TD} w-[200px]`}>
                        <Textarea rows={2} value={r.kocCriteria} disabled={!rowEditable} onChange={e => patchRow(r.id, { kocCriteria: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[170px]`}>
                        <Select value={r.pillarId} disabled={!rowEditable} onChange={e => patchRow(r.id, { pillarId: e.target.value })}>
                          <option value="">Chọn pillar</option>
                          {data.pillars
                            .filter(p => p.id)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.id} · {p.name}
                              </option>
                            ))}
                          {r.pillarId && !data.pillars.some(p => p.id === r.pillarId) && <option value={r.pillarId}>{r.pillarId}</option>}
                        </Select>
                      </td>
                      <td className={`${TD} w-[120px]`}>
                        <Input className="h-8" value={r.goal} disabled={!rowEditable} onChange={e => patchRow(r.id, { goal: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[230px]`}>
                        <Textarea rows={2} value={r.angle} disabled={!rowEditable} onChange={e => patchRow(r.id, { angle: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[105px]`}>
                        <Input className="h-8" value={r.type} disabled={!rowEditable} onChange={e => patchRow(r.id, { type: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[105px]`}>
                        <Input className="h-8" value={r.production} disabled={!rowEditable} placeholder="VJ / Remix" onChange={e => patchRow(r.id, { production: e.target.value })} />
                      </td>
                      <td className={`${TD} w-[90px]`}>
                        <NumInput value={r.qty} className={rowEditable ? '' : 'cursor-not-allowed bg-sunken'} onChange={v => rowEditable && patchRow(r.id, { qty: v })} />
                      </td>
                      <td className={`${TD} w-[135px]`}>
                        <NumInput value={r.budget} className={rowEditable ? '' : 'cursor-not-allowed bg-sunken'} onChange={v => rowEditable && patchRow(r.id, { budget: v })} />
                      </td>
                      <td className={`${TD} w-[135px]`}>
                        <Input
                          className={`h-8 ${!rowEditable ? 'cursor-not-allowed bg-sunken' : ''}`}
                          value={r.pic}
                          list="brand-plan-pic"
                          disabled={!rowEditable}
                          onChange={e => patchRow(r.id, { pic: e.target.value })}
                        />
                      </td>
                      <td className={`${TD} sticky right-0 z-10 w-[72px] border-l border-line ${rowEditable ? 'bg-surface group-hover:bg-canvas' : 'bg-sunken/40'}`}>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            aria-label="Nhân đôi dòng"
                            disabled={!rowEditable}
                            className={`rounded p-1.5 ${rowEditable ? 'text-ink-3 hover:bg-sunken hover:text-ink' : 'text-ink-4 cursor-not-allowed opacity-30'}`}
                            onClick={() => rowEditable && copyRow(r)}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Xóa dòng"
                            disabled={!rowEditable}
                            className={`rounded p-1.5 ${rowEditable ? 'text-ink-3 hover:bg-sunken hover:text-critical' : 'text-ink-4 cursor-not-allowed opacity-30'}`}
                            onClick={() => rowEditable && delRow(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length > 0 && (
                  <tr className="bg-sunken/40">
                    <td colSpan={12} className={`${TD} text-right font-semibold`}>
                      Tổng {hasAff ? `(affiliate ${fmt(tot.affQty)}, self ${fmt(tot.selfQty)}, live ${fmt(tot.liveAffQty + tot.liveSelfQty)})` : ''}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-semibold`}>{fmt(tot.totalQty)}</td>
                    <td className={`${TD} text-right tabular-nums font-semibold`}>{fmt(tot.totalBudget)}</td>
                    <td className={TD} />
                    <td className={`${TD} sticky right-0 z-10 border-l border-line bg-sunken/40`} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {rows.some(r => r.pillarId) && data.pillars.length > 0 && <div className="text-2xs text-ink-3">Pillar đang dùng: {Array.from(new Set(rows.filter(r => r.pillarId).map(r => pillarName(r.pillarId) || r.pillarId))).join(', ')}</div>}
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------ Kiểm tra */
  const renderChecks = () => (
    <div className="space-y-2">
      {issues.length === 0 && <div className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-ink-3">Không có cảnh báo nào.</div>}
      {issues.map((i, idx) => (
        <div key={idx} className={`rounded-md border px-3 py-2 text-[13px] ${i.level === 'error' ? 'border-critical bg-critical-soft/30 text-critical' : 'border-line bg-surface text-ink'}`}>
          <span className="mr-2 font-medium">{i.scope}:</span>
          {i.text}
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-lg border border-line bg-surface p-3">
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
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
              className={`w-full rounded-md border px-3 py-2 text-left transition ${p.id === activePlanId ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'}`}
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
        {!plan ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center text-sm text-ink-3">Chọn một kế hoạch ở bên trái để nhập plan tháng của Brand.</div>
        ) : (
          <>
            <datalist id="brand-plan-pic">
              {Array.from(new Set([...members, plan.pic, data.planner].filter(Boolean) as string[])).map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{plan.storeName || plan.title}</h2>
                <span className="rounded bg-sunken px-2 py-0.5 text-xs text-ink-2">
                  {plan.brandName} · {plan.month} · {plan.pic || 'Chưa giao'}
                  {channelOfStore ? ` · ${CHANNEL_LABEL[channelOfStore]}` : ''}
                </span>
                {saveLabel[status] && (
                  <span className="rounded bg-sunken px-2 py-0.5 text-2xs text-ink-3">{saveLabel[status]}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs ${approvalStatus === 'CHANGES' ? 'text-critical' : 'text-ink-2'}`}>
                  {APPROVAL_LABEL[approvalStatus]}
                  {data.approval.decidedBy && approvalStatus !== 'PENDING' ? ` · ${data.approval.decidedBy}` : ''}
                  {approvalStatus === 'PENDING' && data.approval.submittedBy ? ` · ${data.approval.submittedBy} gửi` : ''}
                </span>
                {access.full && (approvalStatus === 'DRAFT' || approvalStatus === 'CHANGES') && (
                  <Button size="sm" variant="primary" disabled={errorCount > 0} title={errorCount > 0 ? 'Còn lỗi ở tab Kiểm tra' : undefined} onClick={() => changeApproval('PENDING')}>
                    {catalogStore?.bookingLeader ? `Gửi Trưởng nhóm (${catalogStore.bookingLeader})` : 'Trình duyệt Giám đốc Marketing'}
                  </Button>
                )}
                {access.full && approvalStatus === 'PENDING' && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => changeApproval('APPROVED')}>
                      Duyệt
                    </Button>
                    <Button size="sm" variant="secondary" disabled={!decisionNote.trim()} title={decisionNote.trim() ? undefined : 'Nhập lý do cần sửa'} onClick={() => changeApproval('CHANGES', decisionNote.trim())}>
                      Yêu cầu sửa
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => changeApproval('DRAFT')}>
                      Rút lại
                    </Button>
                  </>
                )}
                {access.full && approvalStatus === 'APPROVED' && (
                  <Button size="sm" variant="secondary" disabled={!decisionNote.trim()} title={decisionNote.trim() ? undefined : 'Nhập lý do mở lại'} onClick={() => changeApproval('CHANGES', decisionNote.trim())}>
                    Mở lại để sửa
                  </Button>
                )}
                {errorCount > 0 && <span className="text-xs text-critical">{errorCount} lỗi cần sửa</span>}
                {status === 'error' && (
                  <Button size="sm" variant="secondary" onClick={saveNow}>
                    Lưu lại
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-line pb-2">
              {tabs.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-3 py-1.5 text-[13px] transition ${activeTab === t.key ? 'bg-accent-soft font-medium text-ink' : 'text-ink-3 hover:bg-sunken'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {sectionOnly && (
              <div className="text-xs text-ink-3">
                Bạn được giao phần {access.sections.map(s => SECTION_LABEL[s]).join(', ')} của gian này. PIC gian gửi duyệt cả plan.
              </div>
            )}
            {readOnly && <div className="text-xs text-ink-3">Bạn chỉ được xem plan này.</div>}
            {approvalStatus === 'CHANGES' && data.approval.note && <div className="rounded-md border border-critical px-3 py-2 text-[13px] text-critical">Cần sửa: {data.approval.note}</div>}
            {access.full && (approvalStatus === 'PENDING' || approvalStatus === 'APPROVED') && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-[420px]" placeholder={approvalStatus === 'PENDING' ? 'Lý do khi yêu cầu sửa' : 'Lý do khi mở lại'} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} />
                <span className="text-xs text-ink-3">{approvalStatus === 'PENDING' ? 'Plan đang chờ duyệt, không sửa được.' : 'Plan đã duyệt, không sửa được.'}</span>
              </div>
            )}
            <div className={locked ? 'pointer-events-none select-none opacity-60' : ''}>
              {activeTab === 'DIRECTION' && renderDirection()}
              {activeTab === 'KPI' && renderKpi()}
              {activeTab === 'KEY_VISUAL' && renderKeyVisual()}
              {activeTab === 'TIKTOK' && renderChannel('TIKTOK')}
              {activeTab === 'SHOPEE' && renderChannel('SHOPEE')}
              {activeTab === 'PILLAR' && renderPillars()}
              {activeTab === 'CHECK' && renderChecks()}
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDeletePillar)}
        title="Xóa pillar"
        message={
          pendingDeletePillar
            ? `Pillar "${pendingDeletePillar.id}" đang dùng ở ${pendingDeletePillar.usedCount} dòng content. Xóa vẫn tiếp tục?`
            : ''
        }
        confirmLabel="Xóa pillar"
        tone="danger"
        onConfirm={() => {
          if (pendingDeletePillar) {
            patch({
              pillars: data.pillars.filter((_, k) => k !== pendingDeletePillar.index),
              rows: data.rows.map(r => (r.pillarId === pendingDeletePillar.id ? { ...r, pillarId: '' } : r)),
            });
          }
          setPendingDeletePillar(null);
        }}
        onCancel={() => setPendingDeletePillar(null)}
      />

      <Modal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        title={`Danh mục Sản phẩm & Combo — ${planBrand || 'Brand'}`}
        size="xl"
      >
        <ProductCatalogView
          brandNames={allPlanBrandNames}
          legacyProducts={[]}
          initialBrand={planBrand}
          onCatalogSaved={(savedBrand, nextCat) => {
            if (savedBrand === planBrand) {
              setBrandCatalog(nextCat);
              setProductGroups((nextCat.groups || []).map(g => ({ id: g.id, name: g.name })));
            }
          }}
          onNotify={onNotify}
        />
      </Modal>
    </div>
  );
};
