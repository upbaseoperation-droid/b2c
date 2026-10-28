'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Eraser,
  Layers,
  Radio,
  Share2,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react';
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
  isPreVatPitIncludedBudget,
  mergeBreakdownItems,
  netFromGross,
  resolveWeekRows,
  sumBreakdown,
  validateBreakdown,
  type WeeklyDistributionMode,
} from '../../lib/planBreakdownRules';
import { PullHangingJobsModal } from './PullHangingJobsModal';
import { Button, ConfirmDialog } from '../ui';

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
  const [hideEmptyRows, setHideEmptyRows] = useState(readOnly);
  const [activeTab, setActiveTab] = useState<WorkstreamTab>('ALL');
  const [selectedStaffSlice, setSelectedStaffSlice] = useState<string>('ALL_STORE');
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const refs = useRef(new Map<string, HTMLInputElement>());
  const detailAnchorRef = useRef<HTMLDivElement>(null);

  const { issues, comparison, rows: storeRows } = useMemo(() => validateBreakdown(plan), [plan]);
  const staffSlices = useMemo(() => {
    const raw = plan.staffWeeklySlices || [];
    if (raw.length <= 1) return raw;
    const mainName = (plan.primaryPic || plan.pic || '').trim();
    return [...raw].sort((a, b) => {
      const aMain = a.staffName.trim() === mainName ? 1 : 0;
      const bMain = b.staffName.trim() === mainName ? 1 : 0;
      if (aMain !== bMain) return bMain - aMain;
      const aFoc = (a.roleLabel || '').includes('FOC') && !(a.roleLabel || '').includes('Cast') ? 1 : 0;
      const bFoc = (b.roleLabel || '').includes('FOC') && !(b.roleLabel || '').includes('Cast') ? 1 : 0;
      return aFoc - bFoc;
    });
  }, [plan.staffWeeklySlices, plan.primaryPic, plan.pic]);

  const activeSliceObj = useMemo(
    () => (selectedStaffSlice === 'ALL_STORE' ? null : staffSlices.find(s => s.staffName === selectedStaffSlice) || null),
    [selectedStaffSlice, staffSlices]
  );

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

  const [confirmDistributeOpen, setConfirmDistributeOpen] = useState(false);
  const applyDistributeFromRef41 = () => {
    setConfirmDistributeOpen(false);
    if (effectiveReadOnly || !plan.reference41) return;
    const { weeklyBreakdown, items } = distributeReference41ToWeeks(plan, 'EVEN');
    onChange({ weeklyBreakdown, items });
    if (onNotify) {
      onNotify('Đã chia đều số 4.1 vào các tuần');
    }
  };
  // Bảng tuần đã có số thì hỏi lại trước khi ghi đè
  const handleDistributeFromRef41 = () => {
    if (hasBreakdownData(storeRows)) setConfirmDistributeOpen(true);
    else applyDistributeFromRef41();
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
    if (sub === 1 && qty > 0 && budget === 0) return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-300';
    if (sub === 0 && qty === 0 && budget > 0) return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-300';
    if (sub === 1 && qty > 0 && budget > 0) {
      const unit = budget / qty;
      const range = TIER_RANGE[def.tier!];
      if (unit < range.min || (range.max !== null && unit > range.max)) {
        return 'bg-amber-50/70 text-amber-800';
      }
    }
    return '';
  };

  const renderInput = (r: number, def: RowDef, wi: number, sub: 0 | 1) => {
    const c = wi * 2 + sub;
    const row = rows[wi];
    const stored = sub === 0 ? readQty(row, def) : readBudget(row, def);
    const shown = sub === 1 && grossMode ? grossFromNet(stored) : stored;
    const tone = cellTone(row, def, sub);

    if (effectiveReadOnly) {
      return (
        <div
          className={`flex h-8 w-full items-center justify-end px-2 text-right text-xs tabular-nums ${
            shown > 0
              ? sub === 0
                ? 'font-semibold text-slate-900'
                : 'font-medium text-slate-700'
              : 'text-slate-300'
          } ${tone}`}
        >
          {shown > 0 ? fmt(shown) : '—'}
        </div>
      );
    }

    return (
      <input
        ref={el => {
          if (el) refs.current.set(`${r}:${c}`, el);
          else refs.current.delete(`${r}:${c}`);
        }}
        type="text"
        inputMode="numeric"
        value={shown ? fmt(shown) : ''}
        placeholder="—"
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
        className={`h-8 w-full border-0 bg-transparent px-2 text-right text-xs tabular-nums outline-none transition placeholder:text-slate-300 hover:bg-slate-50/80 focus:bg-blue-50/50 focus:ring-1 focus:ring-inset focus:ring-blue-600 ${
          sub === 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
        } ${tone}`}
      />
    );
  };

  const renderFlushCellInput = (
    value: number,
    onChangeVal: (v: number) => void,
    isBold = false
  ) => {
    if (effectiveReadOnly) {
      return (
        <div
          className={`flex h-8 w-full items-center justify-end px-2.5 text-right text-xs tabular-nums ${
            value > 0
              ? isBold
                ? 'font-semibold text-slate-900'
                : 'font-medium text-slate-700'
              : 'text-slate-300'
          }`}
        >
          {value > 0 ? fmt(value) : '—'}
        </div>
      );
    }
    return (
      <input
        type="text"
        inputMode="numeric"
        value={value ? fmt(value) : ''}
        placeholder="—"
        onChange={e => onChangeVal(parseNumber(e.target.value))}
        className={`h-8 w-full border-0 bg-transparent px-2.5 text-right text-xs tabular-nums outline-none transition placeholder:text-slate-300 hover:bg-slate-50/80 focus:bg-blue-50/50 focus:ring-1 focus:ring-inset focus:ring-blue-600 ${
          isBold ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
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
      <span className={c.matched ? 'text-emerald-700 font-semibold' : c.diff > 0 ? 'text-rose-600 font-semibold' : 'text-amber-700 font-semibold'}>
        {c.matched ? 'Khớp' : `${c.diff > 0 ? '+' : ''}${fmt(c.diff)}`}
      </span>
    );
  };

  const renderInlineDiff = (planned: number, reference: number | null) => {
    if (reference === null || reference === undefined) return <span className="text-slate-300">—</span>;
    const diff = planned - reference;
    if (diff === 0 && reference === 0 && planned === 0) return <span className="text-slate-300">—</span>;
    if (diff === 0) return <span className="font-semibold text-emerald-700">Khớp</span>;
    return (
      <span className={`font-semibold ${diff > 0 ? 'text-rose-600' : 'text-amber-700'}`}>
        {diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
      </span>
    );
  };

  const formatWeekTitle = (w: string) => {
    const cleaned = (w || '').replace(/\[/g, '(').replace(/\]/g, ')');
    const parts = cleaned.split(/\s+/);
    const code = parts[0] || w;
    const range = parts.slice(1).join(' ');
    return { code, range };
  };

  const weekHeader = (r: PlanWeekRow, wi: number) => {
    const { code, range } = formatWeekTitle(r.week);
    return (
      <th
        key={r.week}
        colSpan={2}
        className="group border-b border-l border-slate-200 bg-slate-50 px-2 py-1.5 text-center align-middle"
      >
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs font-semibold text-slate-800">{code}</span>
          {range && <span className="text-2xs font-normal text-slate-500">{range}</span>}
          {!effectiveReadOnly && (
            <span className="ml-1 hidden items-center gap-0.5 group-hover:inline-flex">
              {wi > 0 && (
                <button
                  type="button"
                  title="Sao chép tuần trước"
                  onClick={() => copyPrevious(wi)}
                  className="rounded p-0.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                title="Xóa số tuần này"
                onClick={() => clearWeek(wi)}
                className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              >
                <Eraser className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      </th>
    );
  };

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

  const kl4PlusPlanned = useMemo(
    () => (['KL4', 'KL5', 'KL6', 'KL7'] as PlanTierKey[]).reduce((s, k) => s + (totals.tiers[k]?.qty || 0), 0),
    [totals]
  );

  const visibleSections = useMemo(() => {
    if (activeTab === 'CAST_KL') return ['Video Cast trả phí'];
    if (activeTab === 'FOC_SAMPLE') return ['Suất FOC (0đ)'];
    if (activeTab === 'SELF_CHANNEL') return ['Video self channel'];
    if (activeTab === 'ALL') return ['Video Cast trả phí', 'Suất FOC (0đ)', 'Video self channel'];
    return [];
  }, [activeTab]);

  const rolePics = ref41?.rolePics;

  // Chuẩn hóa số mục tiêu 4.1 (nếu kế hoạch tháng 10 chưa có reference41 thì lấy từ coreMetricsLayer1 / chỉ tiêu tháng)
  const overviewMatrixRows = useMemo(() => {
    const r = ref41;
    const l1 = plan.coreMetricsLayer1;

    const useShopeeAsCastFallback =
      totals.castQty === 0 &&
      ref41MultiTotals.affQty === 0 &&
      totals.multiPlatform.shopee.affQty > 0;
    const effectiveCastPlannedQty = useShopeeAsCastFallback ? totals.multiPlatform.shopee.affQty : totals.castQty;
    const effectiveCastPlannedNet = useShopeeAsCastFallback ? totals.multiPlatform.shopee.budgetNet : totals.castBudget;
    const multiPlannedQty =
      (useShopeeAsCastFallback ? totals.multiTotalAffQty - totals.multiPlatform.shopee.affQty : totals.multiTotalAffQty) +
      totals.multiTotalReupQty;
    const multiPlannedNet = useShopeeAsCastFallback
      ? totals.multiTotalBudget - totals.multiPlatform.shopee.budgetNet
      : totals.multiTotalBudget;
    const livePlannedQty = totals.liveSessions + totals.liveSelfInhouse + totals.liveSelfCtv + totals.liveSelfBrand;
    const livePlannedNet = totals.liveBudget + totals.liveSelfBudget;

    const castRefQty = r ? r.cast || 0 : l1?.qtyAffiliatePaid ?? (plan.targetAffiliateContents || storeTotals.castQty);
    const castRefNet = r ? r.affCostNet || 0 : l1?.budgetAffiliateNet ?? (plan.budgetAffiliate || storeTotals.castBudget);
    const focRefQty = r ? r.foc || 0 : l1?.qtyFocSample ?? storeTotals.focQty;
    const selfRefQty = r ? r.selfVideos || 0 : l1?.qtySelfChannel ?? (plan.targetSelfChannelContents || storeTotals.selfQty);
    const selfRefNet = r ? r.selfCostNet || 0 : l1?.budgetSelfChannelNet ?? (plan.budgetSelfChannel || storeTotals.selfBudget);
    const multiRefQty = r
      ? ref41MultiTotals.affQty + ref41MultiTotals.reupQty + (r.tiktokReup || 0)
      : l1?.qtyMultiPlatform ?? multiPlannedQty;
    const multiRefNet = r ? ref41MultiTotals.costNet : l1?.budgetMultiPlatformNet ?? multiPlannedNet;
    const liveRefQty = r
      ? (r.liveSessions || 0) + (r.liveSelf?.inhouse3h || 0) + (r.liveSelf?.ctv2h || 0) + (r.liveSelf?.brand2h || 0)
      : l1?.qtyLivestreamSessions ?? livePlannedQty;
    const liveRefNet = r
      ? (r.liveCostNet || 0) + (r.liveSelf?.totalCostNet || 0)
      : l1?.budgetLivestreamNet ?? livePlannedNet;

    return [
      {
        id: 'CAST_KL' as WorkstreamTab,
        code: '01',
        title: '1. Cast trả phí (KL1–KL7)',
        picText: rolePics?.bookingPics?.length ? rolePics.bookingPics.join(', ') : plan.primaryPic || plan.pic || '—',
        refQty: castRefQty,
        plannedQty: effectiveCastPlannedQty,
        unitLabel: 'video',
        refBudgetNet: castRefNet,
        plannedBudgetNet: effectiveCastPlannedNet,
        extraTag:
          (r?.kl4PlusTarget || 0) > 0
            ? `KL4+: ${kl4PlusPlanned}/${r?.kl4PlusTarget}`
            : undefined,
      },
      {
        id: 'FOC_SAMPLE' as WorkstreamTab,
        code: '02',
        title: '2. Mẫu FOC (0đ)',
        picText: rolePics?.focPics?.length
          ? rolePics.focPics.join(', ')
          : staffSlices.filter(s => (s.roleLabel || '').includes('FOC')).map(s => s.staffName).join(', ') || '—',
        refQty: focRefQty,
        plannedQty: totals.focQty,
        unitLabel: 'mẫu',
        refBudgetNet: 0,
        plannedBudgetNet: 0,
        extraTag: undefined,
      },
      {
        id: 'SELF_CHANNEL' as WorkstreamTab,
        code: '03',
        title: '3. Kênh Brand',
        picText: rolePics?.contentPics?.length ? rolePics.contentPics.join(', ') : plan.primaryPic || '—',
        refQty: selfRefQty,
        plannedQty: totals.selfQty,
        unitLabel: 'video',
        refBudgetNet: selfRefNet,
        plannedBudgetNet: totals.selfBudget,
        extraTag: undefined,
      },
      {
        id: 'MULTI_PLATFORM' as WorkstreamTab,
        code: '04',
        title: '4. Đa sàn',
        picText: rolePics?.bookingPics?.[0] || plan.primaryPic || '—',
        refQty: multiRefQty,
        plannedQty: multiPlannedQty,
        unitLabel: 'video',
        refBudgetNet: multiRefNet,
        plannedBudgetNet: multiPlannedNet,
        extraTag: (r?.tiktokReup || 0) > 0 ? `Reup TT: ${r?.tiktokReup}` : undefined,
      },
      {
        id: 'LIVE_GMV' as WorkstreamTab,
        code: '05',
        title: '5. Livestream',
        picText: rolePics?.livePics?.length ? rolePics.livePics.join(', ') : '—',
        refQty: liveRefQty,
        plannedQty: livePlannedQty,
        unitLabel: 'phiên',
        refBudgetNet: liveRefNet,
        plannedBudgetNet: livePlannedNet,
        extraTag: undefined,
      },
    ];
  }, [
    ref41,
    plan.coreMetricsLayer1,
    plan.targetAffiliateContents,
    plan.budgetAffiliate,
    plan.targetSelfChannelContents,
    plan.budgetSelfChannel,
    ref41MultiTotals,
    totals,
    storeTotals,
    rolePics,
    staffSlices,
    plan.primaryPic,
    plan.pic,
    kl4PlusPlanned,
  ]);

  const overviewGrandTotals = useMemo(() => {
    return overviewMatrixRows.reduce(
      (acc, r) => ({
        refQty: acc.refQty + r.refQty,
        plannedQty: acc.plannedQty + r.plannedQty,
        refBudgetNet: acc.refBudgetNet + r.refBudgetNet,
        plannedBudgetNet: acc.plannedBudgetNet + r.plannedBudgetNet,
      }),
      { refQty: 0, plannedQty: 0, refBudgetNet: 0, plannedBudgetNet: 0 }
    );
  }, [overviewMatrixRows]);

  const activeRoleBadges = useMemo(() => {
    const list: { role: string; names: string }[] = [];
    const bookingNames = rolePics?.bookingPics?.length
      ? rolePics.bookingPics.join(', ')
      : plan.primaryPic || plan.pic || '';
    if (bookingNames) list.push({ role: 'Booking', names: bookingNames });
    if (rolePics?.growthPics?.length) list.push({ role: 'Growth', names: rolePics.growthPics.join(', ') });
    if (rolePics?.accountPics?.length) list.push({ role: 'Account', names: rolePics.accountPics.join(', ') });
    if (rolePics?.focPics?.length) list.push({ role: 'FOC', names: rolePics.focPics.join(', ') });
    const contentLive = [...(rolePics?.contentPics || []), ...(rolePics?.livePics || [])].filter(Boolean);
    if (contentLive.length > 0) list.push({ role: 'Content/Live', names: contentLive.join(', ') });
    return list;
  }, [rolePics, plan.primaryPic, plan.pic]);

  const handleSelectWorkstreamFromOverview = (tab: WorkstreamTab) => {
    setActiveTab(prev => (prev === tab ? 'ALL' : tab));
    if (detailAnchorRef.current) {
      detailAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  let flatIndex = -1;

  return (
    <div className="space-y-3.5">
      {/* TẦNG 1: BẢNG TỔNG QUAN 4.1 & 4.1.1 (FULL WIDTH + DẢI NHÂN SỰ GỌN) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-semibold text-slate-900">
              Tổng quan 4.1 &amp; 4.1.1
            </h4>
            <span className="text-slate-300">|</span>
            <div className="flex flex-wrap items-center gap-1.5 text-2xs">
              {activeRoleBadges.map(b => (
                <span
                  key={b.role}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-700"
                >
                  <span className="text-slate-400">{b.role}:</span>
                  <strong className="font-semibold text-slate-900">{b.names}</strong>
                </span>
              ))}
              <span className="rounded-md bg-slate-200/70 px-2 py-0.5 font-semibold text-slate-700">
                {plan.hasBookingLeader && plan.bookingLeader
                  ? `Leader: ${plan.bookingLeader}`
                  : 'Duyệt trực tiếp'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {staffSlices.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedStaffSlice('ALL_STORE')}
                  className={`rounded px-2 py-0.5 font-semibold transition cursor-pointer ${
                    selectedStaffSlice === 'ALL_STORE'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Toàn gian hàng
                </button>
                {staffSlices.map(slice => {
                  const isSelected = selectedStaffSlice === slice.staffName;
                  const isMainPic = slice.staffName.trim() === (plan.primaryPic || plan.pic || '').trim();
                  const roleTag = slice.roleLabel || (isMainPic ? 'PIC chính' : 'Phụ');
                  return (
                    <button
                      key={slice.staffName}
                      type="button"
                      onClick={() => setSelectedStaffSlice(isSelected ? 'ALL_STORE' : slice.staffName)}
                      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white'
                          : isMainPic
                          ? 'bg-slate-100 text-slate-900 hover:bg-slate-200/80'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{slice.staffName}</span>
                      <span
                        className={`rounded px-1.5 py-0 text-2xs font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isMainPic
                            ? 'bg-sunken text-ink'
                            : 'bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        {roleTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <Button size="sm" variant="ghost" onClick={() => setPullModalOpen(true)}>
              Kéo job tháng trước
            </Button>
            {!effectiveReadOnly && hasRef && (
              <Button size="sm" variant="secondary" onClick={handleDistributeFromRef41}>
                Chia tuần theo 4.1
              </Button>
            )}
            {activeTab !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-2xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
              >
                Xem tất cả
              </button>
            )}
          </div>
        </div>

        {/* MOBILE (< 768px): DẠNG THẺ TỔNG QUAN 4.1 & 4.1.1 (KHÔNG CẦN KÉO NGANG) */}
        <div className="md:hidden divide-y divide-slate-100">
          {overviewMatrixRows.map(row => {
            const qtyDiff = row.plannedQty - row.refQty;
            const budDiff = row.plannedBudgetNet - row.refBudgetNet;
            const isQtyMatched = qtyDiff === 0;
            const isBudMatched = Math.abs(budDiff) <= Math.max(1000, row.refBudgetNet * 0.005);
            const isAllMatched = isQtyMatched && isBudMatched;
            const isEmpty = row.plannedQty === 0 && row.refQty === 0 && row.plannedBudgetNet === 0 && row.refBudgetNet === 0;
            const isFocused = activeTab === row.id;

            return (
              <div
                key={`mob-ov-${row.id}`}
                onClick={() => handleSelectWorkstreamFromOverview(row.id)}
                className={`p-3 space-y-1.5 cursor-pointer transition ${
                  isFocused ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate">{row.title}</span>
                    {row.extraTag && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-600 shrink-0">
                        {row.extraTag}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {isEmpty ? (
                      <span className="text-2xs text-slate-300">—</span>
                    ) : isAllMatched ? (
                      <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Khớp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-700">
                        {!isQtyMatched && `${qtyDiff > 0 ? `+${fmt(qtyDiff)}` : fmt(qtyDiff)} ${row.unitLabel}`}
                        {!isQtyMatched && !isBudMatched && ' · '}
                        {!isBudMatched && `${budDiff > 0 ? `+${fmt(budDiff)}đ` : `${fmt(budDiff)}đ`}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-2xs text-slate-500">
                  Phụ trách: <strong className="text-slate-800">{row.picText}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs tabular-nums pt-0.5">
                  <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-slate-500">SL (4.1 / 4.1.1):</span>
                    <span>
                      <span className="text-slate-600">{fmt(row.refQty)}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <strong className="text-blue-700">{fmt(row.plannedQty)}</strong>
                    </span>
                  </div>
                  <div className="rounded-lg bg-blue-50/30 border border-blue-100 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-slate-500">Net:</span>
                    <strong className="text-blue-950">
                      {row.plannedBudgetNet > 0 ? `${fmt(row.plannedBudgetNet)}đ` : row.refBudgetNet > 0 ? `${fmt(row.refBudgetNet)}đ` : '0đ'}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="p-3 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-900">
            <span>Tổng 4.1.1 / 4.1: {fmt(overviewGrandTotals.plannedQty)} / {fmt(overviewGrandTotals.refQty)}</span>
            <span className="text-blue-700 tabular-nums">
              {fmt(overviewGrandTotals.plannedBudgetNet)}đ / {fmt(overviewGrandTotals.refBudgetNet)}đ
            </span>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs font-semibold text-slate-500">
                <th className="px-4 py-2 text-left">Hạng mục</th>
                <th className="px-3 py-2 text-left">Phụ trách</th>
                <th className="border-l border-slate-200 px-3 py-2 text-right w-[120px]">SL 4.1</th>
                <th className="px-3 py-2 text-right w-[120px] bg-blue-50/30 text-blue-950">SL 4.1.1</th>
                <th className="border-l border-slate-200 px-3 py-2 text-right w-[150px]">Net 4.1</th>
                <th className="px-3 py-2 text-right w-[150px] bg-blue-50/30 text-blue-950">Net 4.1.1</th>
                <th className="border-l border-slate-200 px-4 py-2 text-right w-[140px]">Đối soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overviewMatrixRows.map(row => {
                const qtyDiff = row.plannedQty - row.refQty;
                const budDiff = row.plannedBudgetNet - row.refBudgetNet;
                const isQtyMatched = qtyDiff === 0;
                const isBudMatched = Math.abs(budDiff) <= Math.max(1000, row.refBudgetNet * 0.005);
                const isAllMatched = isQtyMatched && isBudMatched;
                const isEmpty = row.plannedQty === 0 && row.refQty === 0 && row.plannedBudgetNet === 0 && row.refBudgetNet === 0;
                const isFocused = activeTab === row.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => handleSelectWorkstreamFromOverview(row.id)}
                    className={`cursor-pointer transition ${
                      isFocused
                        ? 'bg-blue-50/60'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{row.title}</span>
                        {row.extraTag && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-600">
                            {row.extraTag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-slate-700 font-medium">{row.picText}</span>
                    </td>
                    <td className="border-l border-slate-100 px-3 py-2 text-right align-middle tabular-nums text-slate-600">
                      {row.refQty > 0 ? (
                        <>
                          <span className="font-semibold text-slate-800">{fmt(row.refQty)}</span>{' '}
                          <span className="text-2xs text-slate-400">{row.unitLabel}</span>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right align-middle tabular-nums bg-blue-50/20">
                      {row.plannedQty > 0 ? (
                        <>
                          <span className="font-semibold text-slate-900">{fmt(row.plannedQty)}</span>{' '}
                          <span className="text-2xs text-slate-400">{row.unitLabel}</span>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="border-l border-slate-100 px-3 py-2 text-right align-middle tabular-nums text-slate-600">
                      {row.refBudgetNet > 0 ? `${fmt(row.refBudgetNet)}đ` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right align-middle tabular-nums font-semibold text-blue-950 bg-blue-50/20">
                      {row.plannedBudgetNet > 0 ? `${fmt(row.plannedBudgetNet)}đ` : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="border-l border-slate-100 px-4 py-2 text-right align-middle tabular-nums">
                      {isEmpty ? (
                        <span className="text-slate-300">—</span>
                      ) : isAllMatched ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Khớp
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-end gap-0.5 text-2xs font-semibold">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            {!isQtyMatched && (
                              <span className={qtyDiff > 0 ? 'text-rose-600' : 'text-amber-700'}>
                                {qtyDiff > 0 ? `+${fmt(qtyDiff)}` : fmt(qtyDiff)} {row.unitLabel}
                              </span>
                            )}
                            {!isBudMatched && (
                              <span className={budDiff > 0 ? 'text-rose-600' : 'text-amber-700'}>
                                {budDiff > 0 ? `+${fmt(budDiff)}đ` : `${fmt(budDiff)}đ`}
                              </span>
                            )}
                          </div>
                          {!isBudMatched && isPreVatPitIncludedBudget(row.plannedBudgetNet, row.refBudgetNet) && (
                            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-2xs font-medium text-amber-800">
                              Giá trước VAT (chưa trừ 10% TNCN)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/90 font-semibold text-slate-900">
                <td className="px-4 py-2" colSpan={2}>
                  Tổng cộng
                </td>
                <td className="border-l border-slate-200 px-3 py-2 text-right tabular-nums">
                  {fmt(overviewGrandTotals.refQty)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-blue-700 bg-blue-50/40">
                  {fmt(overviewGrandTotals.plannedQty)}
                </td>
                <td className="border-l border-slate-200 px-3 py-2 text-right tabular-nums">
                  {fmt(overviewGrandTotals.refBudgetNet)}đ
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-blue-700 bg-blue-50/40">
                  {fmt(overviewGrandTotals.plannedBudgetNet)}đ
                </td>
                <td className="border-l border-slate-200 px-4 py-2 text-right tabular-nums">
                  {overviewGrandTotals.plannedQty === overviewGrandTotals.refQty &&
                  Math.abs(overviewGrandTotals.plannedBudgetNet - overviewGrandTotals.refBudgetNet) <= 2000 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Khớp
                    </span>
                  ) : (
                    <span className="text-amber-700 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Lệch
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {ref41?.gmvTargets && (
          <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-2xs">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <div className="text-slate-500">NMV mục tiêu</div>
                <div className="font-semibold tabular-nums text-slate-900">
                  {ref41.gmvTargets.nmvPlan > 0 ? `${fmt(ref41.gmvTargets.nmvPlan)}đ` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <div className="text-slate-500">GMV Affiliate</div>
                <div className="font-semibold tabular-nums text-emerald-700">
                  {ref41.gmvTargets.videoAff > 0 ? `${fmt(ref41.gmvTargets.videoAff)}đ` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <div className="text-slate-500">GMV Kênh Brand</div>
                <div className="font-semibold tabular-nums text-blue-700">
                  {ref41.gmvTargets.videoSelf > 0 ? `${fmt(ref41.gmvTargets.videoSelf)}đ` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <div className="text-slate-500">GMV Live Brand</div>
                <div className="font-semibold tabular-nums text-emerald-700">
                  {ref41.gmvTargets.liveInhouse + ref41.gmvTargets.liveCtv > 0
                    ? `${fmt(ref41.gmvTargets.liveInhouse + ref41.gmvTargets.liveCtv)}đ`
                    : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-1.5">
                <div className="text-amber-800">GMV 30 ngày trước</div>
                <div className="font-semibold tabular-nums text-amber-950">
                  {ref41.gmvTargets.lastMonth30d > 0 ? `${fmt(ref41.gmvTargets.lastMonth30d)}đ` : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5">
                <div className="text-emerald-800">GMV 30 ngày này</div>
                <div className="font-semibold tabular-nums text-emerald-950">
                  {ref41.gmvTargets.thisMonth30d > 0 ? `${fmt(ref41.gmvTargets.thisMonth30d)}đ` : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TẦNG 2: BẢNG CHI TIẾT PHÂN RÃ TUẦN 4.1.1 (CHUẨN SPREADSHEET) */}
      <div ref={detailAnchorRef} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            {(
              [
                {
                  id: 'ALL' as WorkstreamTab,
                  label: 'Tất cả',
                  icon: Layers,
                },
                {
                  id: 'CAST_KL' as WorkstreamTab,
                  label: '1. Cast KL1–KL7',
                  icon: Video,
                },
                {
                  id: 'FOC_SAMPLE' as WorkstreamTab,
                  label: '2. Mẫu FOC',
                  icon: Sparkles,
                },
                {
                  id: 'SELF_CHANNEL' as WorkstreamTab,
                  label: '3. Kênh Brand',
                  icon: TrendingUp,
                },
                {
                  id: 'MULTI_PLATFORM' as WorkstreamTab,
                  label: '4. Đa sàn',
                  icon: Share2,
                },
                {
                  id: 'LIVE_GMV' as WorkstreamTab,
                  label: '5. Livestream',
                  icon: Radio,
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!effectiveReadOnly && (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDistributeFromStep2('EVEN')}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Chia đều
                </button>
                <button
                  type="button"
                  onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Dồn W2–W3
                </button>
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-medium text-slate-700">
              <input type="checkbox" checked={hideEmptyRows} onChange={e => setHideEmptyRows(e.target.checked)} />
              Ẩn dòng trống
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-medium text-slate-700">
              <input type="checkbox" checked={grossMode} onChange={e => setGrossMode(e.target.checked)} />
              Nhập theo Gross
            </label>
          </div>
        </div>

        {!effectiveReadOnly && isEmptyBreakdown && hasStep2Items && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs text-blue-950">
            <span className="font-medium">Chưa có số phân rã tuần</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('EVEN')}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-2xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
              >
                Chia đều
              </button>
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                className="rounded-md border border-blue-300 bg-white px-2.5 py-1 text-2xs font-semibold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
              >
                Dồn W2–W3
              </button>
            </div>
          </div>
        )}

        {visibleSections.length > 0 && (
          <div className="space-y-2">
            {(activeTab === 'ALL' || activeTab === 'CAST_KL') && ref41 && (ref41.kl4PlusTarget || 0) > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs text-blue-950">
                <span className="font-semibold">Video KL4–KL7</span>
                <span className="font-semibold tabular-nums">
                  {fmt(kl4PlusPlanned)} / {fmt(ref41.kl4PlusTarget || 0)} video (
                  {kl4PlusPlanned >= (ref41.kl4PlusTarget || 0) ? (
                    <span className="text-emerald-700">Đạt</span>
                  ) : (
                    <span className="text-amber-700">
                      Thiếu {fmt((ref41.kl4PlusTarget || 0) - kl4PlusPlanned)}
                    </span>
                  )}
                  )
                </span>
              </div>
            )}

            <div className="overflow-x-auto touch-pan-x rounded-xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full min-w-[1100px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 min-w-[105px] max-w-[115px] sm:min-w-[190px] sm:max-w-none border-b border-r border-slate-200 bg-slate-50 px-2 sm:px-3 py-2 text-left font-semibold text-slate-800"
                    >
                      Hạng mục
                    </th>
                    <th
                      rowSpan={2}
                      className="min-w-[88px] border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-right font-semibold text-slate-500 text-2xs"
                    >
                      Đơn giá TB
                    </th>
                    {rows.map((r, wi) => weekHeader(r, wi))}
                    <th
                      colSpan={2}
                      className="border-b border-l border-slate-200 bg-blue-50/60 px-2 py-1.5 text-center font-semibold text-blue-950"
                    >
                      Tổng 4.1.1
                    </th>
                    {hasRef && (
                      <th
                        colSpan={2}
                        className="border-b border-l border-slate-200 bg-slate-100/80 px-2 py-1.5 text-center font-semibold text-slate-700"
                      >
                        Chỉ tiêu 4.1
                      </th>
                    )}
                    {hasRef && (
                      <th
                        rowSpan={2}
                        className="min-w-[90px] border-b border-l border-slate-200 bg-slate-50 px-2.5 py-2 text-right font-semibold text-slate-700"
                      >
                        Đối soát
                      </th>
                    )}
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-2xs font-semibold text-slate-500">
                    {rows.map(r => (
                      <React.Fragment key={`sub-${r.week}`}>
                        <th className="w-[52px] min-w-[52px] border-l border-slate-200 px-1.5 py-1 text-right">
                          SL
                        </th>
                        <th className="w-[96px] min-w-[96px] border-l border-slate-100 px-2 py-1 text-right">
                          {grossMode ? 'Gross' : 'Net'}
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="w-[56px] min-w-[56px] border-l border-slate-200 bg-blue-50/40 px-2 py-1 text-right text-blue-900">
                      SL
                    </th>
                    <th className="w-[104px] min-w-[104px] border-l border-blue-100 bg-blue-50/40 px-2 py-1 text-right text-blue-900">
                      Net
                    </th>
                    {hasRef && (
                      <>
                        <th className="w-[56px] min-w-[56px] border-l border-slate-200 bg-slate-100/50 px-2 py-1 text-right">
                          SL
                        </th>
                        <th className="w-[104px] min-w-[104px] border-l border-slate-200/60 bg-slate-100/50 px-2 py-1 text-right">
                          Net
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleSections.map(section => {
                    const defs = ROWS.filter(r => {
                      if (r.section !== section) return false;
                      if (!hideEmptyRows) return true;
                      const t = totalCell(r);
                      return t.qty > 0 || t.budget > 0 || (getRowRef41Qty(r) || 0) > 0;
                    });
                    const sub = subtotal(section);
                    const refKeys = subtotalRefs[section] || {};
                    const qtyRef = refKeys.qtyKey ? cmp(refKeys.qtyKey) : undefined;
                    const budgetRef = refKeys.budgetKey ? cmp(refKeys.budgetKey) : undefined;
                    const secQty = sub.reduce((s, x) => s + x.qty, 0);
                    const secBudget = sub.reduce((s, x) => s + x.budget, 0);
                    const totalColSpan = 2 + rows.length * 2 + 2 + (hasRef ? 3 : 0);

                    return (
                      <React.Fragment key={section}>
                        <tr className="bg-slate-100/80 border-y border-slate-200">
                          <td
                            colSpan={totalColSpan}
                            className="sticky left-0 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-slate-700"
                          >
                            {section}
                          </td>
                        </tr>
                        {defs.map(def => {
                          flatIndex += 1;
                          const r = flatIndex;
                          const t = totalCell(def);
                          const rowRefQty = getRowRef41Qty(def);
                          const avgUnit =
                            def.hasQty && def.hasBudget && t.qty > 0 && t.budget > 0
                              ? Math.round(t.budget / t.qty)
                              : 0;

                          return (
                            <tr key={def.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                              <td className="sticky left-0 z-10 max-w-[115px] sm:max-w-none truncate border-r border-slate-200 bg-white px-2 sm:px-3 py-1 font-medium text-slate-800" title={def.label}>
                                {def.label}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-1 text-right tabular-nums text-2xs text-slate-400">
                                {avgUnit > 0 ? `${fmt(avgUnit)}đ` : '—'}
                              </td>
                              {rows.map((row, wi) => (
                                <React.Fragment key={row.week}>
                                  <td className="border-l border-slate-200 p-0 align-middle">
                                    {def.hasQty ? (
                                      renderInput(r, def, wi, 0)
                                    ) : (
                                      <span className="block h-8 bg-slate-50/40" />
                                    )}
                                  </td>
                                  <td className="border-l border-slate-100 p-0 align-middle">
                                    {def.hasBudget ? (
                                      renderInput(r, def, wi, 1)
                                    ) : (
                                      <span className="block h-8 bg-slate-50/40" />
                                    )}
                                  </td>
                                </React.Fragment>
                              ))}
                              <td className="border-l border-slate-200 bg-blue-50/20 px-2 py-1 text-right tabular-nums font-semibold text-slate-900">
                                {def.hasQty ? (t.qty > 0 ? fmt(t.qty) : <span className="text-slate-300 font-normal">—</span>) : ''}
                              </td>
                              <td className="border-l border-blue-100/70 bg-blue-50/20 px-2 py-1 text-right tabular-nums font-semibold text-blue-950">
                                {def.hasBudget ? (t.budget > 0 ? fmt(t.budget) : <span className="text-slate-300 font-normal">—</span>) : ''}
                              </td>
                              {hasRef && (
                                <>
                                  <td className="border-l border-slate-200 bg-slate-50/50 px-2 py-1 text-right tabular-nums text-slate-600">
                                    {rowRefQty !== null ? (rowRefQty > 0 ? fmt(rowRefQty) : <span className="text-slate-300">—</span>) : ''}
                                  </td>
                                  <td className="border-l border-slate-100 bg-slate-50/50 px-2 py-1 text-right tabular-nums text-slate-400">
                                    —
                                  </td>
                                  <td className="border-l border-slate-200 px-2.5 py-1 text-right tabular-nums">
                                    {renderInlineDiff(t.qty, rowRefQty)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                        {defs.length > 1 ? (
                          <tr className="border-b border-slate-200 bg-slate-50/90 font-semibold text-slate-900">
                            <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-3 py-1.5">
                              Cộng {section.toLowerCase()}
                            </td>
                            <td className="border-r border-slate-200 px-2 py-1.5 text-right tabular-nums text-2xs font-normal text-slate-500">
                              {secQty > 0 && secBudget > 0 ? `${fmt(Math.round(secBudget / secQty))}đ` : '—'}
                            </td>
                            {sub.map((x, wi) => (
                              <React.Fragment key={rows[wi].week}>
                                <td className="border-l border-slate-200 px-2 py-1.5 text-right tabular-nums">
                                  {x.qty > 0 ? fmt(x.qty) : <span className="text-slate-300 font-normal">—</span>}
                                </td>
                                <td className="border-l border-slate-100 px-2 py-1.5 text-right tabular-nums">
                                  {x.budget > 0 ? fmt(x.budget) : <span className="text-slate-300 font-normal">—</span>}
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="border-l border-slate-200 bg-blue-50/50 px-2 py-1.5 text-right tabular-nums text-blue-950">
                              {fmt(secQty)}
                            </td>
                            <td className="border-l border-blue-100 bg-blue-50/50 px-2 py-1.5 text-right tabular-nums text-blue-950">
                              {section === 'Suất FOC (0đ)' ? '0' : fmt(secBudget)}
                            </td>
                            {hasRef && (
                              <>
                                <td className="border-l border-slate-200 bg-slate-100/60 px-2 py-1.5 text-right tabular-nums text-slate-700">
                                  {qtyRef ? fmt(qtyRef.reference) : '—'}
                                </td>
                                <td className="border-l border-slate-200/60 bg-slate-100/60 px-2 py-1.5 text-right tabular-nums text-slate-700">
                                  {budgetRef ? fmt(budgetRef.reference) : '—'}
                                </td>
                                <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums">
                                  {diffCell(refKeys.qtyKey || refKeys.budgetKey)}
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

        {(activeTab === 'ALL' || activeTab === 'MULTI_PLATFORM') && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
              <h4 className="text-xs font-semibold text-slate-800">
                Đa sàn (Shopee · Threads · Facebook · Instagram)
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                {ref41 && (ref41.tiktokReup || 0) > 0 && (
                  <span className="rounded-md bg-slate-200/80 px-2 py-0.5 font-semibold text-slate-800">
                    Reup TikTok (4.1): {fmt(ref41.tiktokReup || 0)}
                  </span>
                )}
                <span className="text-slate-600">
                  Affiliate: <b>{fmt(totals.multiTotalAffQty)}</b> · Reup:{' '}
                  <b>{fmt(totals.multiTotalReupQty)}</b> · Net:{' '}
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
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${mp.badgeClass}`}>
                        {mp.shortLabel}
                      </span>
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
                          Net: <b>{fmt(pTot.budgetNet)}đ</b>
                          {hasRef ? ` / ${fmt(refNet)}đ` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-2xs text-slate-500">
                            <th className="px-3 py-1.5 text-left font-semibold text-slate-700 min-w-[130px]">
                              Hạng mục
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
                                4.1
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100 hover:bg-slate-50/40">
                            <td className="px-3 py-1.5 font-medium text-slate-700">Video Affiliate</td>
                            {rows.map((r, wi) => {
                              const v = r.multiPlatform?.[mp.key]?.affQty || 0;
                              return (
                                <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                                  {renderFlushCellInput(v, val => setMultiPlatformCell(wi, mp.key, 'affQty', val), false)}
                                </td>
                              );
                            })}
                            <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                              {pTot.affQty ? fmt(pTot.affQty) : '—'}
                            </td>
                            {hasRef && (
                              <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                                {refAff ? fmt(refAff) : '—'}
                              </td>
                            )}
                          </tr>

                          <tr className="border-b border-slate-100 hover:bg-slate-50/40">
                            <td className="px-3 py-1.5 font-medium text-slate-700">
                              Ngân sách ({grossMode ? 'Gross' : 'Net'})
                            </td>
                            {rows.map((r, wi) => {
                              const netVal = r.multiPlatform?.[mp.key]?.budgetNet || 0;
                              const shown = grossMode ? grossFromNet(netVal) : netVal;
                              return (
                                <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                                  {renderFlushCellInput(
                                    shown,
                                    val => setMultiPlatformCell(wi, mp.key, 'budgetNet', grossMode ? netFromGross(val) : val),
                                    true,
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                              {pTot.budgetNet ? fmt(pTot.budgetNet) : '—'}
                            </td>
                            {hasRef && (
                              <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                                {refNet ? fmt(refNet) : '—'}
                              </td>
                            )}
                          </tr>

                          <tr className="hover:bg-slate-50/40">
                            <td className="px-3 py-1.5 font-medium text-slate-700">Video Reup (0đ)</td>
                            {rows.map((r, wi) => {
                              const v = r.multiPlatform?.[mp.key]?.reupQty || 0;
                              return (
                                <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                                  {renderFlushCellInput(v, val => setMultiPlatformCell(wi, mp.key, 'reupQty', val), false)}
                                </td>
                              );
                            })}
                            <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                              {pTot.reupQty ? fmt(pTot.reupQty) : '—'}
                            </td>
                            {hasRef && (
                              <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                                {refReup ? fmt(refReup) : '—'}
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

        {(activeTab === 'ALL' || activeTab === 'LIVE_GMV') && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50/70 px-3.5 py-2">
                <span className="text-xs font-semibold text-rose-900">
                  Livestream Affiliate
                </span>
                <div className="flex items-center gap-2 text-2xs tabular-nums">
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-rose-900 border border-rose-200">
                    Phiên: {fmt(totals.liveSessions)}
                    {hasRef ? ` / ${fmt(ref41?.liveSessions || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-rose-900 border border-rose-200">
                    Net: {fmt(totals.liveBudget)}đ
                    {hasRef ? ` / ${fmt(ref41?.liveCostNet || 0)}đ` : ''}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-2xs text-slate-500">
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-700 min-w-[140px]">
                        Hạng mục
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
                          4.1
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Số phiên</td>
                      {rows.map((r, wi) => {
                        const liveDef = ROWS.find(d => d.id === 'live')!;
                        const v = r.live?.sessions || 0;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                            {renderFlushCellInput(v, val => setCell(wi, liveDef, 0, val), false)}
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {totals.liveSessions ? fmt(totals.liveSessions) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {ref41?.liveSessions ? fmt(ref41.liveSessions) : '—'}
                        </td>
                      )}
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-3 py-1.5 font-medium text-slate-700">
                        Ngân sách ({grossMode ? 'Gross' : 'Net'})
                      </td>
                      {rows.map((r, wi) => {
                        const liveDef = ROWS.find(d => d.id === 'live')!;
                        const netVal = r.live?.budgetNet || 0;
                        const shown = grossMode ? grossFromNet(netVal) : netVal;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                            {renderFlushCellInput(
                              shown,
                              val => setCell(wi, liveDef, 1, grossMode ? netFromGross(val) : val),
                              true,
                            )}
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {totals.liveBudget ? fmt(totals.liveBudget) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {ref41?.liveCostNet ? fmt(ref41.liveCostNet) : '—'}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50/70 px-3.5 py-2">
                <span className="text-xs font-semibold text-emerald-950">
                  Livestream kênh Brand
                </span>
                <div className="flex flex-wrap items-center gap-2 text-2xs tabular-nums">
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-emerald-900 border border-emerald-200">
                    Inhouse 3h: {fmt(totals.liveSelfInhouse)}
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.inhouse3h || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-emerald-900 border border-emerald-200">
                    CTV 2h: {fmt(totals.liveSelfCtv)}
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.ctv2h || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-emerald-900 border border-emerald-200">
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
                        Hạng mục
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
                          4.1
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Inhouse (3h)</td>
                      {rows.map((r, wi) => {
                        const v = r.liveSelf?.inhouse3h || 0;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                            {renderFlushCellInput(v, val => setLiveSelfCell(wi, 'inhouse3h', val), false)}
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {totals.liveSelfInhouse ? fmt(totals.liveSelfInhouse) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {ref41?.liveSelf?.inhouse3h ? fmt(ref41.liveSelf.inhouse3h) : '—'}
                        </td>
                      )}
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="px-3 py-1.5 font-medium text-slate-700">CTV ngoài (2h)</td>
                      {rows.map((r, wi) => {
                        const v = r.liveSelf?.ctv2h || 0;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                            {renderFlushCellInput(v, val => setLiveSelfCell(wi, 'ctv2h', val), false)}
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {totals.liveSelfCtv ? fmt(totals.liveSelfCtv) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {ref41?.liveSelf?.ctv2h ? fmt(ref41.liveSelf.ctv2h) : '—'}
                        </td>
                      )}
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-3 py-1.5 font-medium text-slate-700">
                        Ngân sách ({grossMode ? 'Gross' : 'Net'})
                      </td>
                      {rows.map((r, wi) => {
                        const netVal = r.liveSelf?.budgetNet || 0;
                        const shown = grossMode ? grossFromNet(netVal) : netVal;
                        return (
                          <td key={r.week} className="border-l border-slate-100 p-0 align-middle">
                            {renderFlushCellInput(
                              shown,
                              val => setLiveSelfCell(wi, 'budgetNet', grossMode ? netFromGross(val) : val),
                              true,
                            )}
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-200 bg-slate-50/30 px-2.5 py-1.5 text-right font-semibold tabular-nums text-slate-900">
                        {totals.liveSelfBudget ? fmt(totals.liveSelfBudget) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-slate-200 px-2.5 py-1.5 text-right tabular-nums text-slate-600">
                          {ref41?.liveSelf?.totalCostNet ? fmt(ref41.liveSelf.totalCostNet) : '—'}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

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

      <ConfirmDialog
        open={confirmDistributeOpen}
        title="Chia lại tuần theo 4.1"
        message="Số đang có trong bảng tuần sẽ bị thay bằng số 4.1 chia đều cho các tuần."
        confirmLabel="Chia lại"
        tone="danger"
        onConfirm={applyDistributeFromRef41}
        onCancel={() => setConfirmDistributeOpen(false)}
      />

      <PullHangingJobsModal
        open={pullModalOpen}
        onClose={() => setPullModalOpen(false)}
        plan={plan}
        onNotify={msg => onNotify?.(msg)}
      />
    </div>
  );
};
