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
  const detailAnchorRef = useRef<HTMLDivElement>(null);

  const { issues, comparison, rows: storeRows } = useMemo(() => validateBreakdown(plan), [plan]);
  const staffSlices = useMemo(() => plan.staffWeeklySlices || [], [plan.staffWeeklySlices]);

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

  // Dữ liệu 5 dòng chuẩn cho BẢNG TỔNG QUAN ĐỐI SOÁT 4.1 VS 4.1.1 (Cố định ở nửa trên)
  const overviewMatrixRows = useMemo(() => {
    const r = ref41;
    const castRefQty = r?.cast || 0;
    const castRefNet = r?.affCostNet || 0;
    const focRefQty = r?.foc || 0;
    const selfRefQty = r?.selfVideos || 0;
    const selfRefNet = r?.selfCostNet || 0;
    const multiRefQty = ref41MultiTotals.affQty + ref41MultiTotals.reupQty + (r?.tiktokReup || 0);
    const multiRefNet = ref41MultiTotals.costNet;
    const liveRefQty = (r?.liveSessions || 0) + (r?.liveSelf?.inhouse3h || 0) + (r?.liveSelf?.ctv2h || 0) + (r?.liveSelf?.brand2h || 0);
    const liveRefNet = (r?.liveCostNet || 0) + (r?.liveSelf?.totalCostNet || 0);

    const multiPlannedQty = totals.multiTotalAffQty + totals.multiTotalReupQty;
    const multiPlannedNet = totals.multiTotalBudget;
    const livePlannedQty = totals.liveSessions + totals.liveSelfInhouse + totals.liveSelfCtv + totals.liveSelfBrand;
    const livePlannedNet = totals.liveBudget + totals.liveSelfBudget;

    return [
      {
        id: 'CAST_KL' as WorkstreamTab,
        code: '01',
        title: '1. Cast trả phí (KL1–KL7)',
        picText: rolePics?.bookingPics?.length ? rolePics.bookingPics.join(', ') : plan.primaryPic || plan.pic || '—',
        refQty: castRefQty,
        plannedQty: totals.castQty,
        unitLabel: 'video',
        refBudgetNet: castRefNet,
        plannedBudgetNet: totals.castBudget,
        extraTag:
          (r?.kl4PlusTarget || 0) > 0
            ? `KL4+: ${kl4PlusPlanned}/${r?.kl4PlusTarget}`
            : undefined,
      },
      {
        id: 'FOC_SAMPLE' as WorkstreamTab,
        code: '02',
        title: '2. Mẫu FOC (0đ)',
        picText: rolePics?.focPics?.length ? rolePics.focPics.join(', ') : focRefQty > 0 ? 'Trần Thị Hảo' : '—',
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
  }, [ref41, ref41MultiTotals, totals, rolePics, plan.primaryPic, plan.pic, kl4PlusPlanned]);

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

  const handleSelectWorkstreamFromOverview = (tab: WorkstreamTab) => {
    setActiveTab(prev => (prev === tab ? 'ALL' : tab));
    if (detailAnchorRef.current) {
      detailAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  let flatIndex = -1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
              <h4 className="text-xs font-bold text-slate-900">
                Tổng quan kế hoạch (4.1 &amp; 4.1.1)
              </h4>
              <div className="flex flex-wrap items-center gap-1.5">
                {!effectiveReadOnly && hasRef && (
                  <button
                    type="button"
                    onClick={handleDistributeFromRef41}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-2xs font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Khớp theo 4.1
                  </button>
                )}
                {activeTab !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-2xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs font-semibold text-slate-600">
                    <th className="px-3.5 py-2 text-left">Hạng mục</th>
                    <th className="px-2.5 py-2 text-left">PIC</th>
                    <th className="border-l border-slate-200 px-2.5 py-2 text-right">SL 4.1</th>
                    <th className="px-2.5 py-2 text-right">SL 4.1.1</th>
                    <th className="border-l border-slate-200 px-2.5 py-2 text-right">Net 4.1</th>
                    <th className="px-2.5 py-2 text-right">Net 4.1.1</th>
                    <th className="border-l border-slate-200 px-3 py-2 text-right">Lệch</th>
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
                            ? 'bg-indigo-50/70 hover:bg-indigo-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{row.title}</span>
                            {row.extraTag && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-700">
                                {row.extraTag}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 align-middle">
                          <span className="inline-block max-w-[130px] truncate font-medium text-slate-800" title={row.picText}>
                            {row.picText}
                          </span>
                        </td>
                        <td className="border-l border-slate-100 px-2.5 py-2.5 text-right align-middle tabular-nums font-semibold text-slate-700">
                          {fmt(row.refQty)} <span className="text-2xs font-normal text-slate-400">{row.unitLabel}</span>
                        </td>
                        <td className="px-2.5 py-2.5 text-right align-middle tabular-nums font-bold text-slate-900">
                          {fmt(row.plannedQty)} <span className="text-2xs font-normal text-slate-400">{row.unitLabel}</span>
                        </td>
                        <td className="border-l border-slate-100 px-2.5 py-2.5 text-right align-middle tabular-nums text-slate-600">
                          {row.refBudgetNet > 0 ? `${fmt(row.refBudgetNet)}đ` : '0đ'}
                        </td>
                        <td className="px-2.5 py-2.5 text-right align-middle tabular-nums font-semibold text-indigo-900">
                          {row.plannedBudgetNet > 0 ? `${fmt(row.plannedBudgetNet)}đ` : '0đ'}
                        </td>
                        <td className="border-l border-slate-100 px-3 py-2.5 text-right align-middle tabular-nums">
                          {isEmpty ? (
                            <span className="text-2xs text-slate-400">—</span>
                          ) : isAllMatched ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-semibold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Khớp
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {!isQtyMatched && (
                                <div className={`text-2xs font-semibold ${qtyDiff > 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                                  SL: {qtyDiff > 0 ? `+${fmt(qtyDiff)}` : fmt(qtyDiff)}
                                </div>
                              )}
                              {!isBudMatched && (
                                <div className={`text-2xs font-semibold ${budDiff > 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                                  Net: {budDiff > 0 ? `+${fmt(budDiff)}đ` : `${fmt(budDiff)}đ`}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <td className="px-3.5 py-2.5" colSpan={2}>
                      Tổng cộng
                    </td>
                    <td className="border-l border-slate-200 px-2.5 py-2.5 text-right tabular-nums">
                      {fmt(overviewGrandTotals.refQty)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums text-indigo-700">
                      {fmt(overviewGrandTotals.plannedQty)}
                    </td>
                    <td className="border-l border-slate-200 px-2.5 py-2.5 text-right tabular-nums">
                      {fmt(overviewGrandTotals.refBudgetNet)}đ
                    </td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums text-indigo-700">
                      {fmt(overviewGrandTotals.plannedBudgetNet)}đ
                    </td>
                    <td className="border-l border-slate-200 px-3 py-2.5 text-right tabular-nums">
                      {overviewGrandTotals.plannedQty === overviewGrandTotals.refQty &&
                      Math.abs(overviewGrandTotals.plannedBudgetNet - overviewGrandTotals.refBudgetNet) <= 2000 ? (
                        <span className="text-emerald-700">Khớp</span>
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
          </div>

          {ref41?.gmvTargets && (
            <div className="border-t border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-2xs">
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <div className="text-slate-500">NMV mục tiêu</div>
                  <div className="font-bold tabular-nums text-slate-900">
                    {ref41.gmvTargets.nmvPlan > 0 ? `${fmt(ref41.gmvTargets.nmvPlan)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <div className="text-slate-500">GMV Affiliate</div>
                  <div className="font-bold tabular-nums text-emerald-700">
                    {ref41.gmvTargets.videoAff > 0 ? `${fmt(ref41.gmvTargets.videoAff)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <div className="text-slate-500">GMV Kênh Brand</div>
                  <div className="font-bold tabular-nums text-indigo-700">
                    {ref41.gmvTargets.videoSelf > 0 ? `${fmt(ref41.gmvTargets.videoSelf)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <div className="text-slate-500">GMV Live Brand</div>
                  <div className="font-bold tabular-nums text-teal-700">
                    {ref41.gmvTargets.liveInhouse + ref41.gmvTargets.liveCtv > 0
                      ? `${fmt(ref41.gmvTargets.liveInhouse + ref41.gmvTargets.liveCtv)}đ`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-1.5">
                  <div className="text-amber-800">GMV 30 ngày trước</div>
                  <div className="font-bold tabular-nums text-amber-950">
                    {ref41.gmvTargets.lastMonth30d > 0 ? `${fmt(ref41.gmvTargets.lastMonth30d)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5">
                  <div className="text-emerald-800">GMV 30 ngày này</div>
                  <div className="font-bold tabular-nums text-emerald-950">
                    {ref41.gmvTargets.thisMonth30d > 0 ? `${fmt(ref41.gmvTargets.thisMonth30d)}đ` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800">
                Nhân sự phụ trách
              </h4>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-700">
                {plan.hasBookingLeader && plan.bookingLeader
                  ? `Leader: ${plan.bookingLeader}`
                  : 'Duyệt trực tiếp'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5">
                <div className="text-2xs text-slate-500">Growth PIC</div>
                <div className="font-semibold text-slate-900 truncate">
                  {rolePics?.growthPics?.length ? rolePics.growthPics.join(', ') : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5">
                <div className="text-2xs text-slate-500">Account PIC</div>
                <div className="font-semibold text-slate-900 truncate">
                  {rolePics?.accountPics?.length ? rolePics.accountPics.join(', ') : '—'}
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-2.5 py-1.5">
                <div className="text-2xs text-emerald-700">Booking PIC</div>
                <div className="font-semibold text-emerald-950 truncate">
                  {rolePics?.bookingPics?.length ? rolePics.bookingPics.join(', ') : plan.primaryPic || plan.pic || '—'}
                </div>
              </div>
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 px-2.5 py-1.5">
                <div className="text-2xs text-amber-800">FOC PIC</div>
                <div className="font-semibold text-amber-950 truncate">
                  {rolePics?.focPics?.length ? rolePics.focPics.join(', ') : ref41 && ref41.foc > 0 ? 'Trần Thị Hảo' : '—'}
                </div>
              </div>
              <div className="col-span-2 rounded-lg border border-purple-200/80 bg-purple-50/40 px-2.5 py-1.5 flex items-center justify-between gap-2">
                <span className="text-2xs text-purple-700 shrink-0">Content / Live:</span>
                <span className="font-semibold text-purple-950 truncate">
                  {[...(rolePics?.contentPics || []), ...(rolePics?.livePics || [])].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-2xs font-semibold text-slate-600">
              <span>Theo người nhập ({staffSlices.length || 1})</span>
              {activeSliceObj && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffSlice('ALL_STORE')}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  Tất cả
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-0.5">
              <button
                type="button"
                onClick={() => setSelectedStaffSlice('ALL_STORE')}
                className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-2 text-left transition cursor-pointer ${
                  selectedStaffSlice === 'ALL_STORE'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-bold text-slate-900">Toàn gian hàng</span>
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-2xs font-semibold text-indigo-800 tabular-nums">
                  {fmt(storeTotals.totalBudget)}đ
                </span>
              </button>

              {staffSlices.map(slice => {
                const st = sumBreakdown(slice.weeklyBreakdown);
                const isSelected = selectedStaffSlice === slice.staffName;
                return (
                  <button
                    key={slice.staffName}
                    type="button"
                    onClick={() => setSelectedStaffSlice(isSelected ? 'ALL_STORE' : slice.staffName)}
                    className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2 flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">{slice.staffName}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs text-slate-600 shrink-0">
                        {slice.roleLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-2xs font-semibold text-slate-700 tabular-nums">
                      {fmt(st.castQty + st.focQty + st.selfQty + st.multiTotalAffQty + st.multiTotalReupQty)} video · {slice.rowCount} tuần
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={detailAnchorRef} className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
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
                  className="rounded-md border border-line bg-white px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
                >
                  Chia đều
                </button>
                <button
                  type="button"
                  onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                  className="rounded-md border border-line bg-white px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
                >
                  Dồn W2–W3
                </button>
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs text-indigo-950">
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

            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[1150px] border-collapse text-xs">
                <thead className="bg-surface text-ink-3">
                  <tr className="border-b border-line">
                    <th className="sticky left-0 z-10 min-w-[180px] bg-surface px-3 py-2 text-left font-medium text-ink">
                      Hạng mục
                    </th>
                    {rows.map((r, wi) => weekHeader(r, wi))}
                    <th colSpan={2} className="min-w-[165px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                      Tổng 4.1.1
                    </th>
                    {hasRef && (
                      <th colSpan={2} className="min-w-[155px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                        4.1
                      </th>
                    )}
                    {hasRef && (
                      <th colSpan={2} className="min-w-[130px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                        Lệch
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

        {(activeTab === 'ALL' || activeTab === 'MULTI_PLATFORM') && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2">
              <h4 className="text-xs font-bold text-slate-800">
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
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${mp.badgeClass}`}>
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
                          <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5 font-medium text-slate-700">Video Affiliate</td>
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

                          <tr>
                            <td className="px-3 py-1.5 font-medium text-slate-700">Video Reup (0đ)</td>
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

        {(activeTab === 'ALL' || activeTab === 'LIVE_GMV') && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50/70 px-3.5 py-2">
                <span className="text-xs font-bold text-rose-900">
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
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Số phiên</td>
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

            <div className="rounded-xl border border-teal-200 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 bg-teal-50/70 px-3.5 py-2">
                <span className="text-xs font-bold text-teal-950">
                  Livestream kênh Brand
                </span>
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
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Inhouse (3h)</td>
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
                      <td className="px-3 py-1.5 font-medium text-slate-700">CTV ngoài (2h)</td>
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
                        Ngân sách ({grossMode ? 'Gross' : 'Net'})
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
    </div>
  );
};
