'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Copy, Eraser, Layers, Radio, Share2, Sparkles, TrendingUp, Users, Video } from 'lucide-react';
import type {
  InputPlanBreakdownState,
  PlanMultiPlatformKey,
  PlanTierKey,
  PlanWeekRow,
} from '../../lib/types';
import {
  FOC_TYPES,
  MULTI_PLATFORMS,
  SELF_TYPES,
  TIER_KEYS,
  TIER_RANGE,
  distributeItemsToWeeks,
  distributeReference41ToWeeks,
  emptyWeekRow,
  getLiveDefaultUnitCost,
  getTierDefaultUnitCost,
  grossFromNet,
  hasBreakdownData,
  mergeBreakdownItems,
  netFromGross,
  resolveWeekRows,
  sumBreakdown,
  validateBreakdown,
  type WeeklyDistributionMode,
} from '../../lib/planBreakdownRules';

interface PlanWeeklyBreakdownProps {
  plan: InputPlanBreakdownState;
  readOnly?: boolean;
  onChange: (patch: Partial<InputPlanBreakdownState>) => void;
  onNotify?: (msg: string) => void;
}

type WorkstreamTab = 'ALL' | 'CAST_KL' | 'FOC_SAMPLE' | 'SELF_CHANNEL' | 'MULTI_PLATFORM' | 'LIVE_GMV';

type RowKind = 'tier' | 'foc' | 'self' | 'selfBudget' | 'live';

interface RowDef {
  id: string;
  kind: RowKind;
  label: string;
  tier?: PlanTierKey;
  focKey?: keyof PlanWeekRow['foc'];
  selfKey?: keyof PlanWeekRow['self'];
  hasQty: boolean;
  hasBudget: boolean;
  section: string;
}

const ROWS: RowDef[] = [
  ...TIER_KEYS.map<RowDef>(k => ({
    id: `tier-${k}`,
    kind: 'tier',
    label: TIER_RANGE[k].label,
    tier: k,
    hasQty: true,
    hasBudget: true,
    section: 'Video Cast trả phí',
  })),
  ...FOC_TYPES.map<RowDef>(f => ({
    id: `foc-${f.key}`,
    kind: 'foc',
    label: f.label,
    focKey: f.key,
    hasQty: true,
    hasBudget: false,
    section: 'Suất FOC (0đ)',
  })),
  ...SELF_TYPES.map<RowDef>(s => ({
    id: `self-${s.key}`,
    kind: 'self',
    label: s.label,
    selfKey: s.key,
    hasQty: true,
    hasBudget: false,
    section: 'Video self channel',
  })),
  {
    id: 'self-budget',
    kind: 'selfBudget',
    label: 'Ngân sách self channel',
    hasQty: false,
    hasBudget: true,
    section: 'Video self channel',
  },
  {
    id: 'live',
    kind: 'live',
    label: 'Livestream affiliate',
    hasQty: true,
    hasBudget: true,
    section: 'Livestream',
  },
];

const clone = (rows: PlanWeekRow[]): PlanWeekRow[] => structuredClone(rows);
const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const shortWeek = (w: string) => (w || '').split(' ')[0];

function readQty(row: PlanWeekRow, def: RowDef): number {
  if (def.kind === 'tier') return row.tiers?.[def.tier!]?.qty || 0;
  if (def.kind === 'foc') return row.foc?.[def.focKey!] || 0;
  if (def.kind === 'self') return row.self?.[def.selfKey!] || 0;
  if (def.kind === 'live') return row.live?.sessions || 0;
  return 0;
}

function readBudget(row: PlanWeekRow, def: RowDef): number {
  if (def.kind === 'tier') return row.tiers?.[def.tier!]?.budgetNet || 0;
  if (def.kind === 'selfBudget') return row.self?.budgetNet || 0;
  if (def.kind === 'live') return row.live?.budgetNet || 0;
  return 0;
}

function writeCell(row: PlanWeekRow, def: RowDef, sub: 0 | 1, value: number) {
  if (def.kind === 'tier') {
    const cur = row.tiers[def.tier!] || { qty: 0, budgetNet: 0 };
    row.tiers[def.tier!] = sub === 0 ? { ...cur, qty: value } : { ...cur, budgetNet: value };
  } else if (def.kind === 'foc') {
    row.foc[def.focKey!] = value;
  } else if (def.kind === 'self') {
    row.self[def.selfKey!] = value;
  } else if (def.kind === 'selfBudget') {
    row.self.budgetNet = value;
  } else if (def.kind === 'live') {
    if (sub === 0) row.live.sessions = value;
    else row.live.budgetNet = value;
  }
}

function writeCellWithAutoBudget(
  row: PlanWeekRow,
  def: RowDef,
  sub: 0 | 1,
  value: number,
  plan: InputPlanBreakdownState,
  autoBudgetWhenQtyChanged = true
) {
  if (sub === 0 && autoBudgetWhenQtyChanged) {
    if (def.kind === 'tier') {
      const cur = row.tiers[def.tier!] || { qty: 0, budgetNet: 0 };
      const prevQty = cur.qty || 0;
      const prevBudget = cur.budgetNet || 0;
      const defaultUnit = getTierDefaultUnitCost(plan, def.tier!);
      const effectiveUnit = prevQty > 0 && prevBudget > 0 ? Math.round(prevBudget / prevQty) : defaultUnit;

      if (value <= 0) {
        row.tiers[def.tier!] = { qty: 0, budgetNet: 0 };
        return;
      }
      const shouldRecalcBudget =
        prevBudget === 0 || (prevQty > 0 && Math.abs(prevBudget - prevQty * effectiveUnit) <= 1000);
      row.tiers[def.tier!] = {
        qty: value,
        budgetNet: shouldRecalcBudget ? value * effectiveUnit : prevBudget,
      };
      return;
    }

    if (def.kind === 'live') {
      const prevQty = row.live?.sessions || 0;
      const prevBudget = row.live?.budgetNet || 0;
      const defaultLiveUnit = getLiveDefaultUnitCost(plan);
      const effectiveUnit = prevQty > 0 && prevBudget > 0 ? Math.round(prevBudget / prevQty) : defaultLiveUnit;

      if (value <= 0) {
        row.live.sessions = 0;
        row.live.budgetNet = 0;
        return;
      }
      const shouldRecalcBudget =
        prevBudget === 0 || (prevQty > 0 && Math.abs(prevBudget - prevQty * effectiveUnit) <= 1000);
      row.live.sessions = value;
      if (shouldRecalcBudget) {
        row.live.budgetNet = value * effectiveUnit;
      }
      return;
    }

    if (def.kind === 'self') {
      const prevSelfQty = SELF_TYPES.reduce((s, t) => s + (row.self?.[t.key] || 0), 0);
      const prevSelfBudget = row.self?.budgetNet || 0;
      row.self[def.selfKey!] = value;
      const nextSelfQty = SELF_TYPES.reduce((s, t) => s + (row.self?.[t.key] || 0), 0);

      if (nextSelfQty <= 0) {
        row.self.budgetNet = 0;
      } else if (prevSelfBudget === 0) {
        const selfItems = (plan.items || []).filter(it => it.channel === 'SELF_CHANNEL' && it.unitCost > 0);
        const avgSelfUnit =
          selfItems.length > 0
            ? Math.round(selfItems.reduce((s, it) => s + it.unitCost, 0) / selfItems.length)
            : 180000;
        row.self.budgetNet = nextSelfQty * avgSelfUnit;
      } else if (prevSelfQty > 0) {
        const unit = Math.round(prevSelfBudget / prevSelfQty);
        if (Math.abs(prevSelfBudget - prevSelfQty * unit) <= 1000) {
          row.self.budgetNet = nextSelfQty * unit;
        }
      }
      return;
    }
  }

  writeCell(row, def, sub, value);
}

function cellSupported(def: RowDef, sub: 0 | 1) {
  return sub === 0 ? def.hasQty : def.hasBudget;
}

const parseNumber = (raw: string): number => {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export const PlanWeeklyBreakdown: React.FC<PlanWeeklyBreakdownProps> = ({
  plan,
  readOnly = false,
  onChange,
  onNotify,
}) => {
  const [grossMode, setGrossMode] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkstreamTab>('ALL');
  const [selectedStaffSlice, setSelectedStaffSlice] = useState<string>('ALL_STORE');
  const refs = useRef(new Map<string, HTMLInputElement>());

  const { issues, comparison, rows: storeRows } = useMemo(() => validateBreakdown(plan), [plan]);
  const staffSlices = useMemo(() => plan.staffWeeklySlices || [], [plan.staffWeeklySlices]);

  const activeSliceObj = useMemo(
    () => (selectedStaffSlice === 'ALL_STORE' ? null : staffSlices.find(s => s.staffName === selectedStaffSlice) || null),
    [selectedStaffSlice, staffSlices]
  );

  // Khi đang lọc xem riêng 1 chuyên viên, bảng hiển thị lát cắt của chuyên viên đó (chế độ chỉ đọc để tránh ghi đè tổng gian hàng)
  const rows = useMemo(() => {
    if (activeSliceObj) {
      return resolveWeekRows({ month: plan.month, weeklyBreakdown: activeSliceObj.weeklyBreakdown });
    }
    return storeRows;
  }, [activeSliceObj, plan.month, storeRows]);

  const effectiveReadOnly = readOnly || Boolean(activeSliceObj);
  const totals = useMemo(() => sumBreakdown(rows), [rows]);
  const storeTotals = useMemo(() => sumBreakdown(storeRows), [storeRows]);
  const ref41 = plan.reference41;
  const hasRef = Boolean(ref41);
  const isEmptyBreakdown = useMemo(() => !hasBreakdownData(storeRows), [storeRows]);
  const hasStep2Items = useMemo(
    () => (plan.items || []).some(it => !it.id.startsWith('WB-') && (it.qty > 0 || it.totalBudget > 0)),
    [plan.items]
  );
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const needsNote = issues.some(i => i.needsNote);

  const commit = (next: PlanWeekRow[]) => {
    if (effectiveReadOnly) return;
    onChange({
      weeklyBreakdown: next,
      items: mergeBreakdownItems({ ...plan, weeklyBreakdown: next }, next),
    });
  };

  const handleDistributeFromStep2 = (mode: WeeklyDistributionMode) => {
    if (effectiveReadOnly) return;
    const nextRows = distributeItemsToWeeks(plan, mode);
    commit(nextRows);
    if (onNotify) {
      const label =
        mode === 'EVEN'
          ? 'Chia đều các tuần'
          : mode === 'CAMPAIGN_PEAK'
          ? 'Dồn trọng tâm W2–W3'
          : 'Dồn đầu tháng W1–W2';
      onNotify(`Đã phân bổ số lượng & ngân sách từ Bước 2 xuống các tuần (${label}).`);
    }
  };

  const handleDistributeFromRef41 = () => {
    if (effectiveReadOnly || !plan.reference41) return;
    const { weeklyBreakdown, items } = distributeReference41ToWeeks(plan, 'EVEN');
    onChange({ weeklyBreakdown, items });
    if (onNotify) {
      onNotify('Đã tự động phân bổ bảng tuần khớp 100% với số chuẩn Bảng 4.1.');
    }
  };

  const setCell = (wi: number, def: RowDef, sub: 0 | 1, value: number) => {
    const next = clone(storeRows);
    writeCellWithAutoBudget(next[wi], def, sub, value, plan, true);
    commit(next);
  };

  const setMultiPlatformCell = (
    wi: number,
    platformKey: PlanMultiPlatformKey,
    field: 'affQty' | 'budgetNet' | 'reupQty',
    value: number
  ) => {
    if (effectiveReadOnly) return;
    const next = clone(storeRows);
    if (!next[wi].multiPlatform) next[wi].multiPlatform = {};
    const cur = next[wi].multiPlatform![platformKey] || { affQty: 0, budgetNet: 0, reupQty: 0 };
    next[wi].multiPlatform![platformKey] = {
      ...cur,
      [field]: field === 'budgetNet' && grossMode ? netFromGross(value) : value,
    };
    commit(next);
  };

  const setLiveSelfCell = (
    wi: number,
    field: 'inhouse3h' | 'ctv2h' | 'brand2h' | 'budgetNet',
    value: number
  ) => {
    if (effectiveReadOnly) return;
    const next = clone(storeRows);
    const cur = next[wi].liveSelf || { inhouse3h: 0, ctv2h: 0, brand2h: 0, budgetNet: 0 };
    next[wi].liveSelf = {
      ...cur,
      [field]: field === 'budgetNet' && grossMode ? netFromGross(value) : value,
    };
    commit(next);
  };

  const copyPrevious = (wi: number) => {
    if (wi <= 0 || effectiveReadOnly) return;
    const next = clone(storeRows);
    next[wi] = { ...clone([storeRows[wi - 1]])[0], week: storeRows[wi].week };
    commit(next);
  };

  const clearWeek = (wi: number) => {
    if (effectiveReadOnly) return;
    const next = clone(storeRows);
    next[wi] = emptyWeekRow(storeRows[wi].week);
    commit(next);
  };

  const focusCell = (r: number, c: number) => {
    const el = refs.current.get(`${r}:${c}`);
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (effectiveReadOnly) return;
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text)) return;
    e.preventDefault();
    const grid = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line, idx, arr) => line !== '' || idx < arr.length - 1)
      .map(line => line.split('\t'));
    const next = clone(storeRows);
    grid.forEach((cols, i) => {
      cols.forEach((raw, j) => {
        const def = ROWS[r + i];
        const col = c + j;
        const wi = Math.floor(col / 2);
        const sub = (col % 2) as 0 | 1;
        if (!def || wi >= next.length || !cellSupported(def, sub)) return;
        const parsed = parseNumber(raw);
        const hasPairedBudgetColInPaste = sub === 0 && j + 1 < cols.length;
        writeCellWithAutoBudget(
          next[wi],
          def,
          sub,
          sub === 1 && grossMode ? netFromGross(parsed) : parsed,
          plan,
          !hasPairedBudgetColInPaste
        );
      });
    });
    commit(next);
  };

  const cellTone = (row: PlanWeekRow, def: RowDef, sub: 0 | 1): string => {
    if (def.kind !== 'tier') return '';
    const qty = readQty(row, def);
    const budget = readBudget(row, def);
    if (sub === 1 && qty > 0 && budget === 0) return 'border-critical bg-critical-soft';
    if (sub === 0 && qty === 0 && budget > 0) return 'border-critical bg-critical-soft';
    if (sub === 1 && qty > 0 && budget > 0) {
      const unit = budget / qty;
      const range = TIER_RANGE[def.tier!];
      if (unit < range.min || (range.max !== null && unit > range.max)) return 'border-warning bg-warning-soft';
    }
    return '';
  };

  const renderInput = (r: number, def: RowDef, wi: number, sub: 0 | 1) => {
    const c = wi * 2 + sub;
    const row = rows[wi];
    const stored = sub === 0 ? readQty(row, def) : readBudget(row, def);
    const shown = sub === 1 && grossMode ? grossFromNet(stored) : stored;
    return (
      <input
        ref={el => {
          if (el) refs.current.set(`${r}:${c}`, el);
          else refs.current.delete(`${r}:${c}`);
        }}
        type="text"
        inputMode="numeric"
        disabled={effectiveReadOnly}
        value={shown ? fmt(shown) : ''}
        placeholder="0"
        onChange={e => {
          const v = parseNumber(e.target.value);
          setCell(wi, def, sub, sub === 1 && grossMode ? netFromGross(v) : v);
        }}
        onPaste={e => handlePaste(e, r, c)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            focusCell(r + 1, c);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusCell(r - 1, c);
          }
        }}
        className={`w-full rounded border px-1.5 py-1 text-right text-xs tabular-nums text-ink outline-none focus:border-accent disabled:bg-transparent ${
          cellTone(row, def, sub) || 'border-line bg-surface'
        }`}
      />
    );
  };

  const cmp = (key: string) => comparison.find(c => c.key === key);

  const totalCell = (def: RowDef) => {
    const qty = rows.reduce((s, r) => s + readQty(r, def), 0);
    const budget = rows.reduce((s, r) => s + readBudget(r, def), 0);
    return { qty, budget };
  };

  const subtotal = (section: string) => {
    const defs = ROWS.filter(r => r.section === section);
    return rows.map(r => ({
      qty: defs.reduce((s, d) => s + readQty(r, d), 0),
      budget: defs.reduce((s, d) => s + readBudget(r, d), 0),
    }));
  };

  const subtotalRefs: Record<string, { qtyKey?: string; budgetKey?: string }> = {
    'Video Cast trả phí': { qtyKey: 'cast', budgetKey: 'affBudget' },
    'Suất FOC (0đ)': { qtyKey: 'foc' },
    'Video self channel': { qtyKey: 'selfQty', budgetKey: 'selfBudget' },
    Livestream: { qtyKey: 'live', budgetKey: 'liveBudget' },
  };

  // Lấy số tham chiếu Bảng 4.1 cho từng dòng lẻ (KL1..KL7 hoặc TAP Brand / TAP / TAP UpAffiliate)
  const getRowRef41Qty = (def: RowDef): number | null => {
    if (!ref41) return null;
    if (def.kind === 'tier' && def.tier && ref41.tiers) {
      return ref41.tiers[def.tier] ?? 0;
    }
    if (def.kind === 'foc' && def.focKey && ref41.focBreakdown) {
      return ref41.focBreakdown[def.focKey] ?? 0;
    }
    return null;
  };

  const diffCell = (key?: string) => {
    const c = key ? cmp(key) : undefined;
    if (!c) return null;
    return (
      <span className={c.matched ? 'text-positive font-semibold' : c.diff > 0 ? 'text-critical font-semibold' : 'text-warning font-semibold'}>
        {c.matched ? 'Khớp' : `${c.diff > 0 ? '+' : ''}${fmt(c.diff)}`}
      </span>
    );
  };

  const renderInlineDiff = (planned: number, reference: number | null) => {
    if (reference === null || reference === undefined) return null;
    const diff = planned - reference;
    if (diff === 0 && reference === 0 && planned === 0) return <span className="text-ink-3">—</span>;
    if (diff === 0) return <span className="font-semibold text-positive">Khớp</span>;
    return (
      <span className={`font-semibold ${diff > 0 ? 'text-critical' : 'text-warning'}`}>
        {diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
      </span>
    );
  };

  const weekHeader = (r: PlanWeekRow, wi: number) => (
    <th key={r.week} colSpan={2} className="min-w-[185px] border-l border-line px-2 py-2 text-center align-bottom font-medium text-ink">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold">{r.week}</span>
        {!effectiveReadOnly && (
          <span className="flex shrink-0 gap-0.5">
            {wi > 0 && (
              <button
                type="button"
                title="Sao chép tuần trước"
                onClick={() => copyPrevious(wi)}
                className="rounded p-1 text-ink-3 hover:bg-accent-soft hover:text-accent cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              title="Xóa số tuần này"
              onClick={() => clearWeek(wi)}
              className="rounded p-1 text-ink-3 hover:bg-critical-soft hover:text-critical cursor-pointer"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
      <div className="mt-1 grid grid-cols-2 text-2xs font-normal text-ink-3">
        <span>SL</span>
        <span>Net{grossMode ? ' (nhập Gross)' : ''}</span>
      </div>
    </th>
  );

  // Tính tổng Đa sàn từ Bảng 4.1 để hiện badge trên Tab
  const ref41MultiTotals = useMemo(() => {
    const mp = ref41?.multiPlatform;
    if (!mp) return { affQty: 0, reupQty: 0, costNet: 0 };
    return MULTI_PLATFORMS.reduce(
      (acc, p) => {
        const item = mp[p.key];
        return {
          affQty: acc.affQty + (item?.affQty || 0),
          reupQty: acc.reupQty + (item?.reupQty || 0),
          costNet: acc.costNet + (item?.costNet || 0),
        };
      },
      { affQty: 0, reupQty: 0, costNet: 0 }
    );
  }, [ref41]);

  // Tính tổng KL4+ thực nhập để đối chiếu với Số video KL4 trở lên trên 4.1
  const kl4PlusPlanned = useMemo(
    () => (['KL4', 'KL5', 'KL6', 'KL7'] as PlanTierKey[]).reduce((s, k) => s + (totals.tiers[k]?.qty || 0), 0),
    [totals]
  );

  // Các section hiển thị trong bảng tuần tùy theo Tab được chọn
  const visibleSections = useMemo(() => {
    if (activeTab === 'CAST_KL') return ['Video Cast trả phí'];
    if (activeTab === 'FOC_SAMPLE') return ['Suất FOC (0đ)'];
    if (activeTab === 'SELF_CHANNEL') return ['Video self channel'];
    if (activeTab === 'ALL') return ['Video Cast trả phí', 'Suất FOC (0đ)', 'Video self channel'];
    return [];
  }, [activeTab]);

  const rolePics = ref41?.rolePics;
  let flatIndex = -1;

  return (
    <div className="space-y-4">
      {/* KHỐI 1: ĐỘI NGŨ PHỤ TRÁCH ĐA VAI TRÒ (4.1) & TIẾN ĐỘ NHẬP THEO CHUYÊN VIÊN (4.1.1) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Users className="h-4 w-4" />
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
              Đội ngũ phụ trách gian hàng &amp; Tiến độ nhập theo chuyên viên
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-2xs">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
              Cơ chế duyệt:{' '}
              {plan.hasBookingLeader && plan.bookingLeader
                ? `Qua Trưởng nhóm (${plan.bookingLeader})`
                : 'Trình trực tiếp GĐ Marketing (Đặng Thị Yến Nhi)'}
            </span>
          </div>
        </div>

        {/* Lưới thẻ nhân sự theo vai trò từ Bảng 4.1 */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-2.5 py-2">
            <div className="text-2xs font-medium text-slate-500">Growth PIC (Giao Order)</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-900 truncate">
              {rolePics?.growthPics?.length ? rolePics.growthPics.join(', ') : '—'}
            </div>
            {rolePics?.growthSupports?.length ? (
              <div className="mt-0.5 text-2xs text-slate-500 truncate">Hỗ trợ: {rolePics.growthSupports.join(', ')}</div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-2.5 py-2">
            <div className="text-2xs font-medium text-slate-500">Account PIC</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-900 truncate">
              {rolePics?.accountPics?.length ? rolePics.accountPics.join(', ') : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/40 px-2.5 py-2">
            <div className="text-2xs font-medium text-indigo-700">Trưởng nhóm B2C (Leader)</div>
            <div className="mt-0.5 text-xs font-semibold text-indigo-950 truncate">
              {plan.hasBookingLeader && plan.bookingLeader ? plan.bookingLeader : 'Không có Leader'}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-2.5 py-2">
            <div className="text-2xs font-medium text-emerald-700">Chuyên viên Booking (Paid)</div>
            <div className="mt-0.5 text-xs font-semibold text-emerald-950 truncate">
              {rolePics?.bookingPics?.length ? rolePics.bookingPics.join(', ') : plan.primaryPic || plan.pic || '—'}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 px-2.5 py-2">
            <div className="text-2xs font-medium text-amber-800">Chuyên viên FOC (0đ)</div>
            <div className="mt-0.5 text-xs font-semibold text-amber-950 truncate">
              {rolePics?.focPics?.length ? rolePics.focPics.join(', ') : ref41 && ref41.foc > 0 ? 'Trần Thị Hảo' : '—'}
            </div>
          </div>

          <div className="rounded-lg border border-purple-200/80 bg-purple-50/40 px-2.5 py-2">
            <div className="text-2xs font-medium text-purple-700">Content &amp; Livestream PIC</div>
            <div className="mt-0.5 text-xs font-semibold text-purple-950 truncate">
              {[...(rolePics?.contentPics || []), ...(rolePics?.livePics || [])].filter(Boolean).join(', ') || '—'}
            </div>
          </div>
        </div>

        {/* Bộ chọn lát cắt tiến độ nhập 4.1.1 theo từng chuyên viên */}
        {staffSlices.length > 0 && (
          <div className="pt-1">
            <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold text-slate-600">
              <span>Lát cắt dữ liệu đã nhập trên Bảng 4.1.1 theo từng chuyên viên ({staffSlices.length} nhân sự):</span>
              {activeSliceObj && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffSlice('ALL_STORE')}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  Quay lại Tổng hợp toàn gian hàng
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setSelectedStaffSlice('ALL_STORE')}
                className={`flex flex-col justify-between rounded-lg border px-3 py-2 text-left transition cursor-pointer ${
                  selectedStaffSlice === 'ALL_STORE'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900">Tổng hợp toàn gian hàng</span>
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-2xs font-semibold text-indigo-800">
                    Chỉnh sửa &amp; Khớp 4.1
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2 text-2xs text-slate-600 tabular-nums">
                  <span>Cast: <b>{fmt(storeTotals.castQty)}</b></span>
                  <span>FOC: <b>{fmt(storeTotals.focQty)}</b></span>
                  <span>Self: <b>{fmt(storeTotals.selfQty)}</b></span>
                  <span>Net: <b>{fmt(storeTotals.totalBudget)}đ</b></span>
                </div>
              </button>

              {staffSlices.map(slice => {
                const st = sumBreakdown(slice.weeklyBreakdown);
                const isSelected = selectedStaffSlice === slice.staffName;
                return (
                  <button
                    key={slice.staffName}
                    type="button"
                    onClick={() => setSelectedStaffSlice(isSelected ? 'ALL_STORE' : slice.staffName)}
                    className={`flex flex-col justify-between rounded-lg border px-3 py-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">{slice.staffName}</span>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-700">
                        {slice.roleLabel || 'Chuyên viên'} · {slice.rowCount} dòng
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-2xs text-slate-600 tabular-nums">
                      {st.castQty > 0 && (
                        <span className="text-emerald-800">
                          Cast: <b>{fmt(st.castQty)}</b> ({fmt(st.castBudget)}đ)
                        </span>
                      )}
                      {st.focQty > 0 && (
                        <span className="text-amber-800">
                          FOC: <b>{fmt(st.focQty)}</b> mẫu
                        </span>
                      )}
                      {st.selfQty > 0 && (
                        <span className="text-purple-800">
                          Self: <b>{fmt(st.selfQty)}</b> ({fmt(st.selfBudget)}đ)
                        </span>
                      )}
                      {st.multiTotalAffQty + st.multiTotalReupQty > 0 && (
                        <span className="text-blue-800">
                          Đa sàn: <b>{fmt(st.multiTotalAffQty + st.multiTotalReupQty)}</b>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KHỐI 2: THẺ ĐỐI CHIẾU TỔNG QUAN BẢNG 4.1 */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
        {hasRef
          ? comparison.map(c => (
              <div
                key={c.key}
                className={`rounded-lg border px-3 py-2 ${
                  c.matched ? 'border-line bg-surface' : 'border-warning bg-warning-soft'
                }`}
              >
                <div className="text-2xs text-ink-3">{c.label}</div>
                <div className="text-sm font-semibold tabular-nums text-ink">
                  {fmt(c.planned)}
                  <span className="font-normal text-ink-3"> / {fmt(c.reference)}</span>
                </div>
                <div className="text-2xs">
                  {c.matched ? (
                    <span className="text-positive font-medium">Khớp bảng 4.1</span>
                  ) : (
                    <span className="text-warning font-medium">
                      {c.diff > 0 ? 'Thừa' : 'Thiếu'} {fmt(Math.abs(c.diff))}
                    </span>
                  )}
                </div>
              </div>
            ))
          : [
              { label: 'Video Cast trả phí', v: totals.castQty },
              { label: 'Ngân sách Cast (Net)', v: totals.castBudget },
              { label: 'Suất FOC', v: totals.focQty },
              { label: 'Video self channel', v: totals.selfQty },
              { label: 'Ngân sách self channel (Net)', v: totals.selfBudget },
              { label: 'Phiên livestream', v: totals.liveSessions },
            ].map(c => (
              <div key={c.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                <div className="text-2xs text-ink-3">{c.label}</div>
                <div className="text-sm font-semibold tabular-nums text-ink">{fmt(c.v)}</div>
              </div>
            ))}
      </div>

      {/* KHỐI 3: THANH CHUYỂN KHỐI NGHIỆP VỤ (TÁCH RIÊNG TỪNG KHỐI, KHÔNG DÀN HÀNG NGANG) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              {
                id: 'ALL' as WorkstreamTab,
                label: 'Tất cả khối',
                icon: Layers,
                badge: `${fmt(totals.castQty + totals.focQty + totals.selfQty)} video`,
              },
              {
                id: 'CAST_KL' as WorkstreamTab,
                label: '1. KOC Trả Phí (KL1–KL7)',
                icon: Video,
                badge: `${fmt(totals.castQty)}/${fmt(ref41?.cast || 0)}`,
              },
              {
                id: 'FOC_SAMPLE' as WorkstreamTab,
                label: '2. Suất FOC (0đ)',
                icon: Sparkles,
                badge: `${fmt(totals.focQty)}/${fmt(ref41?.foc || 0)}`,
              },
              {
                id: 'SELF_CHANNEL' as WorkstreamTab,
                label: '3. Kênh Tự Xây',
                icon: TrendingUp,
                badge: `${fmt(totals.selfQty)}/${fmt(ref41?.selfVideos || 0)}`,
              },
              {
                id: 'MULTI_PLATFORM' as WorkstreamTab,
                label: '4. Đa Sàn (Shopee · Threads · FB · IG)',
                icon: Share2,
                badge: `${fmt(totals.multiTotalAffQty + totals.multiTotalReupQty)}/${fmt(
                  ref41MultiTotals.affQty + ref41MultiTotals.reupQty
                )}`,
              },
              {
                id: 'LIVE_GMV' as WorkstreamTab,
                label: '5. Livestream & GMV',
                icon: Radio,
                badge: `${fmt(totals.liveSessions + totals.liveSelfInhouse + totals.liveSelfCtv)} phiên`,
              },
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-2xs tabular-nums ${
                    active ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Công cụ nạp nhanh & chế độ Gross/Net */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!effectiveReadOnly && (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('EVEN')}
                className="rounded-md border border-line bg-white px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
              >
                Chia đều từ Bước 2
              </button>
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                className="rounded-md border border-line bg-white px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
              >
                Dồn Mega W2–W3
              </button>
              {hasRef && (
                <button
                  type="button"
                  onClick={handleDistributeFromRef41}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-2xs font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                >
                  Khớp 100% theo Bảng 4.1
                </button>
              )}
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-2xs font-medium text-ink-2">
            <input type="checkbox" checked={grossMode} onChange={e => setGrossMode(e.target.checked)} />
            Nhập theo Gross
          </label>
        </div>
      </div>

      {!effectiveReadOnly && isEmptyBreakdown && hasStep2Items && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs text-blue-950">
          <span className="font-medium">
            Bảng tuần đang trống — Nạp ngay số lượng &amp; ngân sách đã chia ở Bước 2 xuống các tuần:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDistributeFromStep2('EVEN')}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-2xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
            >
              Chia đều các tuần
            </button>
            <button
              type="button"
              onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
              className="rounded-md border border-blue-300 bg-white px-2.5 py-1 text-2xs font-semibold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
            >
              Dồn trọng tâm W2–W3
            </button>
          </div>
        </div>
      )}

      {/* KHỐI 4A: BẢNG PHÂN RÃ TUẦN CHO KOC TRẢ PHÍ (KL1–KL7), SUẤT FOC (0Đ) VÀ VIDEO SELF-CHANNEL */}
      {visibleSections.length > 0 && (
        <div className="space-y-2">
          {/* Thanh tóm tắt hạn mức KL4+ nếu đang xem KOC Trả Phí */}
          {(activeTab === 'ALL' || activeTab === 'CAST_KL') && ref41 && (ref41.kl4PlusTarget || 0) > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs text-indigo-950">
              <span>
                Chỉ tiêu chất lượng Cast trên Bảng 4.1 — <b>Số video KL4 trở lên (KL4–KL7)</b>:
              </span>
              <span className="font-semibold tabular-nums">
                Đã phân rã: {fmt(kl4PlusPlanned)} / Bảng 4.1: {fmt(ref41.kl4PlusTarget || 0)} video (
                {kl4PlusPlanned >= (ref41.kl4PlusTarget || 0) ? (
                  <span className="text-emerald-700">Đạt chuẩn KL4+</span>
                ) : (
                  <span className="text-amber-700">
                    Còn thiếu {fmt((ref41.kl4PlusTarget || 0) - kl4PlusPlanned)} video KL4+
                  </span>
                )}
                )
              </span>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[1150px] border-collapse text-xs">
              <thead className="bg-surface text-ink-3">
                <tr className="border-b border-line">
                  <th className="sticky left-0 z-10 min-w-[180px] bg-surface px-3 py-2 text-left font-medium text-ink">
                    Chỉ tiêu
                  </th>
                  {rows.map((r, wi) => weekHeader(r, wi))}
                  <th colSpan={2} className="min-w-[165px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                    Tổng phân rã
                  </th>
                  {hasRef && (
                    <th colSpan={2} className="min-w-[155px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                      Bảng 4.1
                    </th>
                  )}
                  {hasRef && (
                    <th colSpan={2} className="min-w-[130px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                      Chênh
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleSections.map(section => {
                  const defs = ROWS.filter(r => r.section === section);
                  const sub = subtotal(section);
                  const refKeys = subtotalRefs[section] || {};
                  const qtyRef = refKeys.qtyKey ? cmp(refKeys.qtyKey) : undefined;
                  const budgetRef = refKeys.budgetKey ? cmp(refKeys.budgetKey) : undefined;
                  const secQty = sub.reduce((s, x) => s + x.qty, 0);
                  const secBudget = sub.reduce((s, x) => s + x.budget, 0);
                  return (
                    <React.Fragment key={section}>
                      <tr className="bg-accent-soft/40">
                        <td
                          colSpan={2 + rows.length * 2 + (hasRef ? 4 : 0)}
                          className="sticky left-0 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-2"
                        >
                          {section}
                        </td>
                      </tr>
                      {defs.map(def => {
                        flatIndex += 1;
                        const r = flatIndex;
                        const t = totalCell(def);
                        const rowRefQty = getRowRef41Qty(def);
                        return (
                          <tr key={def.id} className="border-t border-line">
                            <td className="sticky left-0 z-10 bg-surface px-3 py-1 text-ink-2">{def.label}</td>
                            {rows.map((row, wi) => {
                              const qty = readQty(row, def);
                              const budget = readBudget(row, def);
                              return (
                                <React.Fragment key={row.week}>
                                  <td className="border-l border-line px-1 py-1">
                                    {def.hasQty ? renderInput(r, def, wi, 0) : <span className="block" />}
                                  </td>
                                  <td className="px-1 py-1">
                                    {def.hasBudget ? (
                                      <div>
                                        {renderInput(r, def, wi, 1)}
                                        {def.kind === 'tier' && qty > 0 && budget > 0 && (
                                          <div className="pr-1 text-right text-2xs text-ink-3">{fmt(budget / qty)}đ/video</div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="block" />
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td className="border-l border-line px-2 py-1 text-right tabular-nums font-medium text-ink">
                              {def.hasQty ? fmt(t.qty) : ''}
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums text-ink">
                              {def.hasBudget ? fmt(t.budget) : ''}
                            </td>
                            {hasRef && (
                              <>
                                <td className="border-l border-line px-2 py-1 text-right tabular-nums text-ink-2">
                                  {rowRefQty !== null ? fmt(rowRefQty) : ''}
                                </td>
                                <td className="px-2 py-1 text-right tabular-nums text-ink-3" />
                                <td className="border-l border-line px-2 py-1 text-right tabular-nums">
                                  {renderInlineDiff(t.qty, rowRefQty)}
                                </td>
                                <td className="px-2 py-1 text-right tabular-nums" />
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {defs.length > 1 ? (
                        <tr className="border-t border-line bg-surface font-semibold">
                          <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-ink">
                            Cộng {section.toLowerCase()}
                          </td>
                          {sub.map((x, wi) => (
                            <React.Fragment key={rows[wi].week}>
                              <td className="border-l border-line px-2 py-1.5 text-right tabular-nums text-ink">
                                {x.qty ? fmt(x.qty) : ''}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                                {x.budget ? fmt(x.budget) : ''}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="border-l border-line px-2 py-1.5 text-right tabular-nums text-ink">
                            {fmt(secQty)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                            {section === 'Suất FOC (0đ)' ? '' : fmt(secBudget)}
                          </td>
                          {hasRef && (
                            <>
                              <td className="border-l border-line px-2 py-1.5 text-right tabular-nums text-ink-2">
                                {qtyRef ? fmt(qtyRef.reference) : ''}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-ink-2">
                                {budgetRef ? fmt(budgetRef.reference) : ''}
                              </td>
                              <td className="border-l border-line px-2 py-1.5 text-right tabular-nums">
                                {diffCell(refKeys.qtyKey)}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {diffCell(refKeys.budgetKey)}
                              </td>
                            </>
                          )}
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KHỐI 4B: KHỐI ĐA SÀN (CHIA RIÊNG TỪNG KHỐI SÀN: SHOPEE · THREADS · FACEBOOK · INSTAGRAM) */}
      {(activeTab === 'ALL' || activeTab === 'MULTI_PLATFORM') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Khối Đa Sàn — Tách riêng từng nền tảng (Shopee · Threads · Facebook · Instagram)
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
              {ref41 && (ref41.tiktokReup || 0) > 0 && (
                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 font-semibold text-slate-800">
                  Hạn mức Video Reup TikTok (Bảng 4.1): {fmt(ref41.tiktokReup || 0)} video
                </span>
              )}
              <span className="text-slate-600">
                Tổng Đa sàn đã chia: <b>{fmt(totals.multiTotalAffQty)}</b> Video Affiliate ·{' '}
                <b>{fmt(totals.multiTotalReupQty)}</b> Video Reup · Ngân sách Net:{' '}
                <b>{fmt(totals.multiTotalBudget)}đ</b>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {MULTI_PLATFORMS.map(mp => {
              const pTot = totals.multiPlatform[mp.key];
              const pRef = ref41?.multiPlatform?.[mp.key];
              const refAff = pRef?.affQty || 0;
              const refReup = pRef?.reupQty || 0;
              const refNet = pRef?.costNet || 0;

              return (
                <div
                  key={mp.key}
                  className={`rounded-xl border ${mp.borderClass} bg-white shadow-xs overflow-hidden`}
                >
                  <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${mp.borderClass} ${mp.headerBg} px-3.5 py-2`}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${mp.badgeClass}`}>
                        {mp.shortLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{mp.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-2xs tabular-nums">
                      <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-slate-700 border border-slate-200/70">
                        Affiliate: <b>{fmt(pTot.affQty)}</b>
                        {hasRef ? ` / ${fmt(refAff)}` : ''}
                      </span>
                      <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-slate-700 border border-slate-200/70">
                        Reup: <b>{fmt(pTot.reupQty)}</b>
                        {hasRef ? ` / ${fmt(refReup)}` : ''}
                      </span>
                      <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-slate-700 border border-slate-200/70">
                        Ngân sách Net: <b>{fmt(pTot.budgetNet)}đ</b>
                        {hasRef ? ` / ${fmt(refNet)}đ` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-2xs text-slate-500">
                          <th className="px-3 py-1.5 text-left font-semibold text-slate-700 min-w-[130px]">
                            Chỉ tiêu {mp.shortLabel}
                          </th>
                          {rows.map(r => (
                            <th key={r.week} className="border-l border-slate-100 px-2 py-1.5 text-center font-semibold text-slate-700 min-w-[76px]">
                              {shortWeek(r.week)}
                            </th>
                          ))}
                          <th className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-800 min-w-[78px]">
                            Tổng
                          </th>
                          {hasRef && (
                            <th className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-600 min-w-[78px]">
                              Bảng 4.1
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Dòng 1: Số video Affiliate */}
                        <tr className="border-b border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-slate-700">Số video Affiliate</td>
                          {rows.map((r, wi) => {
                            const v = r.multiPlatform?.[mp.key]?.affQty || 0;
                            return (
                              <td key={r.week} className="border-l border-slate-100 p-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={effectiveReadOnly}
                                  value={v ? fmt(v) : ''}
                                  placeholder="0"
                                  onChange={e => setMultiPlatformCell(wi, mp.key, 'affQty', parseNumber(e.target.value))}
                                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-indigo-500 disabled:bg-transparent"
                                />
                              </td>
                            );
                          })}
                          <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                            {fmt(pTot.affQty)}
                          </td>
                          {hasRef && (
                            <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                              {fmt(refAff)}
                            </td>
                          )}
                        </tr>

                        {/* Dòng 2: Ngân sách Affiliate Net */}
                        <tr className="border-b border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-slate-700">
                            Ngân sách ({grossMode ? 'Gross' : 'Net'})
                          </td>
                          {rows.map((r, wi) => {
                            const netVal = r.multiPlatform?.[mp.key]?.budgetNet || 0;
                            const shown = grossMode ? grossFromNet(netVal) : netVal;
                            return (
                              <td key={r.week} className="border-l border-slate-100 p-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={effectiveReadOnly}
                                  value={shown ? fmt(shown) : ''}
                                  placeholder="0"
                                  onChange={e => setMultiPlatformCell(wi, mp.key, 'budgetNet', parseNumber(e.target.value))}
                                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-indigo-500 disabled:bg-transparent"
                                />
                              </td>
                            );
                          })}
                          <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                            {fmt(pTot.budgetNet)}
                          </td>
                          {hasRef && (
                            <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                              {fmt(refNet)}
                            </td>
                          )}
                        </tr>

                        {/* Dòng 3: Số video Reup */}
                        <tr>
                          <td className="px-3 py-1.5 font-medium text-slate-700">Số video Reup (0đ)</td>
                          {rows.map((r, wi) => {
                            const v = r.multiPlatform?.[mp.key]?.reupQty || 0;
                            return (
                              <td key={r.week} className="border-l border-slate-100 p-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={effectiveReadOnly}
                                  value={v ? fmt(v) : ''}
                                  placeholder="0"
                                  onChange={e => setMultiPlatformCell(wi, mp.key, 'reupQty', parseNumber(e.target.value))}
                                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-indigo-500 disabled:bg-transparent"
                                />
                              </td>
                            );
                          })}
                          <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                            {fmt(pTot.reupQty)}
                          </td>
                          {hasRef && (
                            <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                              {fmt(refReup)}
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KHỐI 4C: KHỐI LIVESTREAM (AFFILIATE VS KÊNH BRAND INHOUSE 3H / CTV 2H) & CHỈ TIÊU GMV */}
      {(activeTab === 'ALL' || activeTab === 'LIVE_GMV') && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {/* Thẻ 1: Livestream Affiliate (Ngoại sàn) */}
            <div className="rounded-xl border border-rose-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50/70 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-rose-700" />
                  <span className="text-xs font-bold uppercase tracking-wide text-rose-900">
                    Livestream Affiliate (Booking KOC / Ngoại sàn)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-2xs tabular-nums">
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-rose-900 border border-rose-200">
                    Số phiên: {fmt(totals.liveSessions)}
                    {hasRef ? ` / ${fmt(ref41?.liveSessions || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-rose-900 border border-rose-200">
                    Ngân sách Net: {fmt(totals.liveBudget)}đ
                    {hasRef ? ` / ${fmt(ref41?.liveCostNet || 0)}đ` : ''}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-2xs text-slate-500">
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-700 min-w-[140px]">
                        Chỉ tiêu Live Affiliate
                      </th>
                      {rows.map(r => (
                        <th key={r.week} className="border-l border-slate-100 px-2 py-1.5 text-center font-semibold text-slate-700 min-w-[76px]">
                          {shortWeek(r.week)}
                        </th>
                      ))}
                      <th className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-800 min-w-[78px]">
                        Tổng
                      </th>
                      {hasRef && (
                        <th className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-600 min-w-[78px]">
                          Bảng 4.1
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Số phiên Live Affiliate</td>
                      {rows.map((r, wi) => {
                        const liveDef = ROWS.find(d => d.id === 'live')!;
                        const v = r.live?.sessions || 0;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={effectiveReadOnly}
                              value={v ? fmt(v) : ''}
                              placeholder="0"
                              onChange={e => setCell(wi, liveDef, 0, parseNumber(e.target.value))}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-rose-500 disabled:bg-transparent"
                            />
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmt(totals.liveSessions)}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {fmt(ref41?.liveSessions || 0)}
                        </td>
                      )}
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-slate-700">
                        Ngân sách ({grossMode ? 'Gross' : 'Net'})
                      </td>
                      {rows.map((r, wi) => {
                        const liveDef = ROWS.find(d => d.id === 'live')!;
                        const netVal = r.live?.budgetNet || 0;
                        const shown = grossMode ? grossFromNet(netVal) : netVal;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={effectiveReadOnly}
                              value={shown ? fmt(shown) : ''}
                              placeholder="0"
                              onChange={e => {
                                const parsed = parseNumber(e.target.value);
                                setCell(wi, liveDef, 1, grossMode ? netFromGross(parsed) : parsed);
                              }}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-rose-500 disabled:bg-transparent"
                            />
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmt(totals.liveBudget)}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {fmt(ref41?.liveCostNet || 0)}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Thẻ 2: Livestream Kênh Brand (Self-channel: Inhouse 3h / CTV ngoài 2h / Brand 2h) */}
            <div className="rounded-xl border border-teal-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 bg-teal-50/70 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-teal-700" />
                  <span className="text-xs font-bold uppercase tracking-wide text-teal-950">
                    Livestream Kênh Brand (Inhouse 3h · CTV 2h · Brand 2h)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-2xs tabular-nums">
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-teal-900 border border-teal-200">
                    Inhouse 3h: {fmt(totals.liveSelfInhouse)}
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.inhouse3h || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-teal-900 border border-teal-200">
                    CTV 2h: {fmt(totals.liveSelfCtv)}
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.ctv2h || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-teal-900 border border-teal-200">
                    Net: {fmt(totals.liveSelfBudget)}đ
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.totalCostNet || 0)}đ` : ''}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-2xs text-slate-500">
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-700 min-w-[140px]">
                        Chỉ tiêu Live Kênh Brand
                      </th>
                      {rows.map(r => (
                        <th key={r.week} className="border-l border-slate-100 px-2 py-1.5 text-center font-semibold text-slate-700 min-w-[76px]">
                          {shortWeek(r.week)}
                        </th>
                      ))}
                      <th className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-800 min-w-[78px]">
                        Tổng
                      </th>
                      {hasRef && (
                        <th className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-600 min-w-[78px]">
                          Bảng 4.1
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Inhouse — Số phiên (3h)</td>
                      {rows.map((r, wi) => {
                        const v = r.liveSelf?.inhouse3h || 0;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={effectiveReadOnly}
                              value={v ? fmt(v) : ''}
                              placeholder="0"
                              onChange={e => setLiveSelfCell(wi, 'inhouse3h', parseNumber(e.target.value))}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-teal-600 disabled:bg-transparent"
                            />
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmt(totals.liveSelfInhouse)}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {fmt(ref41?.liveSelf?.inhouse3h || 0)}
                        </td>
                      )}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-1.5 font-medium text-slate-700">CTV ngoài — Số phiên (2h)</td>
                      {rows.map((r, wi) => {
                        const v = r.liveSelf?.ctv2h || 0;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={effectiveReadOnly}
                              value={v ? fmt(v) : ''}
                              placeholder="0"
                              onChange={e => setLiveSelfCell(wi, 'ctv2h', parseNumber(e.target.value))}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-teal-600 disabled:bg-transparent"
                            />
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmt(totals.liveSelfCtv)}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {fmt(ref41?.liveSelf?.ctv2h || 0)}
                        </td>
                      )}
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-slate-700">
                        Ngân sách Live Self ({grossMode ? 'Gross' : 'Net'})
                      </td>
                      {rows.map((r, wi) => {
                        const netVal = r.liveSelf?.budgetNet || 0;
                        const shown = grossMode ? grossFromNet(netVal) : netVal;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={effectiveReadOnly}
                              value={shown ? fmt(shown) : ''}
                              placeholder="0"
                              onChange={e => setLiveSelfCell(wi, 'budgetNet', parseNumber(e.target.value))}
                              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-slate-900 outline-none focus:border-teal-600 disabled:bg-transparent"
                            />
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmt(totals.liveSelfBudget)}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {fmt(ref41?.liveSelf?.totalCostNet || 0)}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Thẻ 3: Chỉ tiêu GMV Mục tiêu (Bảng 4.1) & Đối sánh GMV 30 ngày (Bảng 4.1.1) */}
          {ref41?.gmvTargets && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  Chỉ tiêu Doanh thu GMV / NMV (Bảng 4.1) &amp; Đà tăng trưởng GMV 30 ngày (Bảng 4.1.1)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div className="text-2xs text-slate-500">(Plan) NMV toàn gian</div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-slate-900">
                    {ref41.gmvTargets.nmvPlan > 0 ? `${fmt(ref41.gmvTargets.nmvPlan)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div className="text-2xs text-slate-500">(Plan) GMV Video Affiliate</div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-emerald-800">
                    {ref41.gmvTargets.videoAff > 0 ? `${fmt(ref41.gmvTargets.videoAff)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div className="text-2xs text-slate-500">(Plan) GMV Video Self-channel</div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-indigo-800">
                    {ref41.gmvTargets.videoSelf > 0 ? `${fmt(ref41.gmvTargets.videoSelf)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <div className="text-2xs text-slate-500">Doanh thu Live Self (Inhouse + CTV)</div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-teal-800">
                    {ref41.gmvTargets.liveInhouse + ref41.gmvTargets.liveCtv > 0
                      ? `${fmt(ref41.gmvTargets.liveInhouse + ref41.gmvTargets.liveCtv)}đ`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                  <div className="text-2xs text-amber-800">(Last month) GMV 30 ngày</div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-amber-950">
                    {ref41.gmvTargets.lastMonth30d > 0 ? `${fmt(ref41.gmvTargets.lastMonth30d)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
                  <div className="text-2xs text-emerald-800">(This month) GMV 30 ngày</div>
                  <div className="mt-0.5 text-xs font-bold tabular-nums text-emerald-950">
                    {ref41.gmvTargets.thisMonth30d > 0 ? `${fmt(ref41.gmvTargets.thisMonth30d)}đ` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-xs">
          {errors.length > 0 && (
            <div>
              <div className="mb-1 font-semibold text-critical">
                Lỗi ({errors.length}): phải sửa trước khi gửi duyệt
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-ink-2">
                {errors.map((i, idx) => (
                  <li key={`e${idx}`}>{i.message}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <div className="mb-1 font-semibold text-warning">Cảnh báo ({warnings.length})</div>
              <ul className="list-disc space-y-0.5 pl-5 text-ink-2">
                {warnings.map((i, idx) => (
                  <li key={`w${idx}`}>{i.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {needsNote && (
        <div className="space-y-1 text-xs">
          <label className="font-medium text-ink" htmlFor="breakdown-note">
            Giải trình lệch bảng 4.1
          </label>
          <textarea
            id="breakdown-note"
            rows={3}
            disabled={readOnly}
            value={plan.breakdownNote || ''}
            onChange={e => onChange({ breakdownNote: e.target.value })}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
};
