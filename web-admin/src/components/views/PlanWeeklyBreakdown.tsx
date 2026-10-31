'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Eraser,
} from 'lucide-react';
import type {
  InputPlanBreakdownState,
  PlanMultiPlatformKey,
  PlanStaffWeeklySlice,
  PlanTierKey,
  PlanWeekRow,
} from '../../lib/types';
import { REAL_BOOKING_TEAMS_STRUCTURE } from '../../lib/realB2cPlanData';

const STAFF_SLICE_PIC_OPTIONS = Array.from(
  new Set(
    [
      'Trần Thị Hảo',
      'Nguyễn Thị Mai Anh',
      'Quỳnh Như',
      'Hồng Bảo Ngọc',
      ...REAL_BOOKING_TEAMS_STRUCTURE.flatMap(t => [t.leaderName, ...t.members.map(m => m.name)]),
    ].filter(Boolean)
  )
);
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
import { Button, Chips, ConfirmDialog } from '../ui';

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

function buildSliceRoleLabel(staffName: string, primaryPic: string, rows: PlanWeekRow[], existingRoleLabel?: string): string {
  const t = sumBreakdown(rows);
  const isMain = staffName.trim() !== '' && staffName.trim() === primaryPic.trim();
  const existingPrefix = (existingRoleLabel || '').split('·')[0].trim();
  const liveTotal = t.liveSessions + t.liveSelfInhouse + t.liveSelfCtv + t.liveSelfBrand;
  const baseRole = isMain
    ? 'PIC chính'
    : existingPrefix && existingPrefix !== 'PIC chính'
    ? existingPrefix
    : t.focQty > 0 && t.castQty === 0
    ? 'Phụ trách FOC'
    : t.selfQty > 0 && t.castQty === 0 && t.focQty === 0
    ? 'Phụ trách Self'
    : liveTotal > 0 && t.castQty === 0 && t.focQty === 0
    ? 'Phụ trách Live'
    : 'Phụ';
  const parts: string[] = [];
  if (t.castQty > 0) parts.push(`${t.castQty} Cast`);
  if (t.focQty > 0) parts.push(`${t.focQty} FOC`);
  if (t.selfQty > 0) parts.push(`${t.selfQty} Self`);
  if (liveTotal > 0) parts.push(`${liveTotal} Live`);
  return parts.length > 0 ? `${baseRole} · ${parts.join(' + ')}` : baseRole;
}

function sumSlicesToStoreRows(slices: PlanStaffWeeklySlice[], month: string): PlanWeekRow[] {
  const baseRows = resolveWeekRows({ month, weeklyBreakdown: [] });
  const byWeek = new Map<string, PlanWeekRow>();
  baseRows.forEach(r => byWeek.set(r.week, emptyWeekRow(r.week)));
  for (const sl of slices) {
    const resolved = resolveWeekRows({ month, weeklyBreakdown: sl.weeklyBreakdown });
    for (const r of resolved) {
      let acc = byWeek.get(r.week);
      if (!acc) {
        acc = emptyWeekRow(r.week);
        byWeek.set(r.week, acc);
      }
      for (const k of TIER_KEYS) {
        const src = r.tiers?.[k];
        if (src && (src.qty || src.budgetNet)) {
          const cur = acc.tiers[k] || { qty: 0, budgetNet: 0 };
          acc.tiers[k] = { qty: cur.qty + (src.qty || 0), budgetNet: cur.budgetNet + (src.budgetNet || 0) };
        }
      }
      acc.foc.tapBrand += r.foc?.tapBrand || 0;
      acc.foc.tap += r.foc?.tap || 0;
      acc.foc.tapUp += r.foc?.tapUp || 0;
      acc.self.reviewVoice += r.self?.reviewVoice || 0;
      acc.self.videoAi += r.self?.videoAi || 0;
      acc.self.videoRemix += r.self?.videoRemix || 0;
      acc.self.videoToLive += r.self?.videoToLive || 0;
      acc.self.nhacText += r.self?.nhacText || 0;
      acc.self.budgetNet += r.self?.budgetNet || 0;
      acc.live.sessions += r.live?.sessions || 0;
      acc.live.budgetNet += r.live?.budgetNet || 0;
      for (const mp of MULTI_PLATFORMS) {
        const pk = mp.key;
        const srcMp = r.multiPlatform?.[pk];
        if (srcMp && (srcMp.affQty || srcMp.budgetNet || srcMp.reupQty)) {
          if (!acc.multiPlatform) acc.multiPlatform = {};
          const curMp = acc.multiPlatform[pk] || { affQty: 0, budgetNet: 0, reupQty: 0 };
          acc.multiPlatform[pk] = {
            affQty: curMp.affQty + (srcMp.affQty || 0),
            budgetNet: curMp.budgetNet + (srcMp.budgetNet || 0),
            reupQty: curMp.reupQty + (srcMp.reupQty || 0),
          };
        }
      }
      if (r.liveSelf) {
        const curLs = acc.liveSelf || { inhouse3h: 0, ctv2h: 0, brand2h: 0, budgetNet: 0 };
        acc.liveSelf = {
          inhouse3h: curLs.inhouse3h + (r.liveSelf.inhouse3h || 0),
          ctv2h: curLs.ctv2h + (r.liveSelf.ctv2h || 0),
          brand2h: (curLs.brand2h || 0) + (r.liveSelf.brand2h || 0),
          budgetNet: curLs.budgetNet + (r.liveSelf.budgetNet || 0),
        };
      }
    }
  }
  return Array.from(byWeek.values());
}

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

  const effectiveReadOnly = Boolean(readOnly);
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
    const primaryPicName = (plan.primaryPic || plan.pic || '').trim();
    if (activeSliceObj) {
      const nextSlices = (plan.staffWeeklySlices || []).map(s =>
        s.staffName === activeSliceObj.staffName
          ? {
              ...s,
              weeklyBreakdown: next,
              rowCount: Math.max(1, next.filter(r => hasBreakdownData([r])).length),
              roleLabel: buildSliceRoleLabel(s.staffName, primaryPicName, next, s.roleLabel),
            }
          : s
      );
      const combinedStoreRows = sumSlicesToStoreRows(nextSlices, plan.month);
      onChange({
        staffWeeklySlices: nextSlices,
        weeklyBreakdown: combinedStoreRows,
        items: mergeBreakdownItems({ ...plan, weeklyBreakdown: combinedStoreRows }, combinedStoreRows),
      });
      return;
    }
    if ((plan.staffWeeklySlices || []).length === 1) {
      const only = plan.staffWeeklySlices![0];
      const nextSlices: PlanStaffWeeklySlice[] = [
        {
          ...only,
          weeklyBreakdown: next,
          rowCount: Math.max(1, next.filter(r => hasBreakdownData([r])).length),
          roleLabel: buildSliceRoleLabel(only.staffName, primaryPicName, next, only.roleLabel),
        },
      ];
      onChange({
        staffWeeklySlices: nextSlices,
        weeklyBreakdown: next,
        items: mergeBreakdownItems({ ...plan, weeklyBreakdown: next }, next),
      });
      return;
    }
    onChange({
      weeklyBreakdown: next,
      items: mergeBreakdownItems({ ...plan, weeklyBreakdown: next }, next),
    });
  };

  const handleToggleSliceComplete = (staffName: string) => {
    if (effectiveReadOnly) return;
    const currentSlices = plan.staffWeeklySlices || [];
    const target = currentSlices.find(s => s.staffName === staffName);
    if (!target) return;
    const nextDone = !target.isCompleted;
    const nextSlices = currentSlices.map(s =>
      s.staffName === staffName
        ? { ...s, isCompleted: nextDone, completedAt: nextDone ? new Date().toISOString() : undefined }
        : s
    );
    onChange({ staffWeeklySlices: nextSlices });
    if (onNotify) {
      onNotify(
        nextDone
          ? `Đã xác nhận hoàn tất phần nhập 4.1.1 của ${staffName}.`
          : `Đã mở lại trạng thái đang nhập cho ${staffName}.`
      );
    }
  };

  const handleAddCollaboratorSlice = (newStaffName: string, defaultRolePrefix?: string) => {
    const trimmed = newStaffName.trim();
    if (!trimmed || effectiveReadOnly) return;
    const primaryPicName = (plan.primaryPic || plan.pic || '').trim();
    const existing = plan.staffWeeklySlices || [];
    if (existing.some(s => s.staffName.trim() === trimmed)) {
      setSelectedStaffSlice(trimmed);
      return;
    }
    const baseSlices: PlanStaffWeeklySlice[] =
      existing.length > 0
        ? existing
        : primaryPicName
        ? [
            {
              staffName: primaryPicName,
              roleLabel: buildSliceRoleLabel(primaryPicName, primaryPicName, storeRows, 'PIC chính'),
              rowCount: Math.max(1, storeRows.filter(r => hasBreakdownData([r])).length),
              weeklyBreakdown: clone(storeRows),
            },
          ]
        : [];
    const emptyRows = resolveWeekRows({ month: plan.month, weeklyBreakdown: [] });
    const newSlice: PlanStaffWeeklySlice = {
      staffName: trimmed,
      roleLabel: defaultRolePrefix || 'Phụ',
      rowCount: emptyRows.length,
      weeklyBreakdown: emptyRows,
      isCompleted: false,
    };
    const nextSlices = [...baseSlices, newSlice];
    onChange({ staffWeeklySlices: nextSlices });
    setSelectedStaffSlice(trimmed);
    if (onNotify) {
      onNotify(`Đã mở phần nhập tuần 4.1.1 cho ${trimmed}.`);
    }
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
    const next = clone(rows);
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
    const next = clone(rows);
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
    const next = clone(rows);
    const cur = next[wi].liveSelf || { inhouse3h: 0, ctv2h: 0, brand2h: 0, budgetNet: 0 };
    next[wi].liveSelf = {
      ...cur,
      [field]: field === 'budgetNet' && grossMode ? netFromGross(value) : value,
    };
    commit(next);
  };

  const copyPrevious = (wi: number) => {
    if (wi <= 0 || effectiveReadOnly) return;
    const next = clone(rows);
    next[wi] = { ...clone([rows[wi - 1]])[0], week: rows[wi].week };
    commit(next);
  };

  const clearWeek = (wi: number) => {
    if (effectiveReadOnly) return;
    const next = clone(rows);
    next[wi] = emptyWeekRow(rows[wi].week);
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
    const next = clone(rows);
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
    if (sub === 1 && qty > 0 && budget === 0) return 'bg-critical-soft text-critical ring-1 ring-inset ring-critical/30';
    if (sub === 0 && qty === 0 && budget > 0) return 'bg-critical-soft text-critical ring-1 ring-inset ring-critical/30';
    if (sub === 1 && qty > 0 && budget > 0) {
      const unit = budget / qty;
      const range = TIER_RANGE[def.tier!];
      if (unit < range.min || (range.max !== null && unit > range.max)) {
        return 'bg-warning-soft/70 text-warning';
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
          className={`flex h-7 w-full items-center justify-end px-2 text-right text-xs tabular-nums ${
            shown > 0
              ? sub === 0
                ? 'font-semibold text-ink'
                : 'font-medium text-ink-2'
              : 'text-ink-3/40'
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
        className={`h-7 w-full border-0 bg-transparent px-2 text-right text-xs tabular-nums outline-none transition placeholder:text-ink-3/40 hover:bg-canvas/80 focus:bg-accent-soft/50 focus:ring-1 focus:ring-inset focus:ring-accent ${
          sub === 0 ? 'font-semibold text-ink' : 'font-medium text-ink-2'
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
          className={`flex h-7 w-full items-center justify-end px-3 text-right text-xs tabular-nums ${
            value > 0
              ? isBold
                ? 'font-semibold text-ink'
                : 'font-medium text-ink-2'
              : 'text-ink-3/40'
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
        className={`h-7 w-full border-0 bg-transparent px-3 text-right text-xs tabular-nums outline-none transition placeholder:text-ink-3/40 hover:bg-canvas/80 focus:bg-accent-soft/50 focus:ring-1 focus:ring-inset focus:ring-accent ${
          isBold ? 'font-semibold text-ink' : 'font-medium text-ink-2'
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
      const hasAnyTierRef = TIER_KEYS.some(k => (ref41.tiers?.[k] || 0) > 0);
      if (!hasAnyTierRef) return null;
      return ref41.tiers[def.tier] ?? 0;
    }
    if (def.kind === 'foc' && def.focKey && ref41.focBreakdown) {
      const hasAnyFocRef = Object.values(ref41.focBreakdown).some(v => (v || 0) > 0);
      if (!hasAnyFocRef) return null;
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
    if (reference === null || reference === undefined) return <span className="text-ink-3/40">—</span>;
    const diff = planned - reference;
    if (diff === 0 && reference === 0 && planned === 0) return <span className="text-ink-3/40">—</span>;
    if (diff === 0) return <span className="font-semibold text-positive">Khớp</span>;
    return (
      <span className={`font-semibold ${diff > 0 ? 'text-critical' : 'text-warning'}`}>
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
        className="group border-b border-l border-line bg-canvas px-2 py-1 text-center align-middle"
      >
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs font-semibold text-ink">{code}</span>
          {range && <span className="text-2xs font-normal text-ink-3">{range}</span>}
          {!effectiveReadOnly && (
            <span className="ml-1 hidden items-center gap-0.5 group-hover:inline-flex">
              {wi > 0 && (
                <button
                  type="button"
                  title="Sao chép tuần trước"
                  onClick={() => copyPrevious(wi)}
                  className="rounded p-0.5 text-ink-3 hover:bg-accent-soft hover:text-accent cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                title="Xóa số tuần này"
                onClick={() => clearWeek(wi)}
                className="rounded p-0.5 text-ink-3 hover:bg-critical-soft hover:text-critical cursor-pointer"
              >
                <Eraser className="h-3.5 w-3.5" />
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

  const gmvSummary = useMemo(() => {
    const gt = ref41?.gmvTargets;
    const l1 = plan.coreMetricsLayer1;
    const nmvPlan = gt?.nmvPlan || l1?.targetNmvTotal || plan.targetGmv || 0;
    const videoAff = gt?.videoAff ?? l1?.targetGmvAffiliate ?? 0;
    const videoSelf = gt?.videoSelf ?? l1?.targetGmvSelfChannel ?? 0;
    const liveTotal = gt
      ? (gt.liveInhouse || 0) + (gt.liveCtv || 0)
      : l1?.targetGmvLivestream ?? 0;
    const lastMonth30d = gt?.lastMonth30d || 0;
    const thisMonth30d = gt?.thisMonth30d || 0;
    const activeBudget = overviewGrandTotals.plannedBudgetNet > 0 ? overviewGrandTotals.plannedBudgetNet : overviewGrandTotals.refBudgetNet;
    const cirPct = nmvPlan > 0 ? Math.round((activeBudget / nmvPlan) * 1000) / 10 : 0;
    const roiVal = activeBudget > 0 ? Math.round((nmvPlan / activeBudget) * 100) / 100 : 0;
    const gmvSum = videoAff + videoSelf + liveTotal;
    const baseGmv = Math.max(nmvPlan, gmvSum, 1);
    return {
      nmvPlan,
      videoAff,
      videoSelf,
      liveTotal,
      lastMonth30d,
      thisMonth30d,
      cirPct,
      roiVal,
      affPct: nmvPlan > 0 || gmvSum > 0 ? Math.min(100, (videoAff / baseGmv) * 100) : 0,
      selfPct: nmvPlan > 0 || gmvSum > 0 ? Math.min(100, (videoSelf / baseGmv) * 100) : 0,
      livePct: nmvPlan > 0 || gmvSum > 0 ? Math.min(100, (liveTotal / baseGmv) * 100) : 0,
    };
  }, [ref41, plan.coreMetricsLayer1, plan.targetGmv, overviewGrandTotals]);

  const handleSelectWorkstreamFromOverview = (tab: WorkstreamTab) => {
    setActiveTab(prev => (prev === tab ? 'ALL' : tab));
    if (detailAnchorRef.current) {
      detailAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  let flatIndex = -1;

  return (
    <div className="space-y-3">
      {/* TẦNG 1: KHỐI BENTO ĐỐI CHIẾU 4.1 & 4.1.1 (CỘT TRÁI: MA TRẬN 5 HẠNG MỤC · CỘT PHẢI: CHỈ TIÊU DOANH SỐ & HIỆU QUẢ) */}
      <div className="rounded-xl border border-line bg-surface shadow-2xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/80 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-semibold text-ink">
              Tổng quan 4.1 &amp; 4.1.1
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(staffSlices.length > 0 || !effectiveReadOnly) && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedStaffSlice('ALL_STORE')}
                  className={`rounded px-2 py-0.5 font-semibold transition cursor-pointer ${
                    selectedStaffSlice === 'ALL_STORE'
                      ? 'bg-primary text-white'
                      : 'text-ink-2 hover:bg-sunken'
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
                      className={`inline-flex items-center gap-2 rounded px-2 py-0.5 font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white'
                          : isMainPic
                          ? 'bg-sunken text-ink hover:bg-sunken/80'
                          : 'text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      {slice.isCompleted && (
                        <CheckCircle2
                          className={`h-3 w-3 shrink-0 ${isSelected ? 'text-white' : 'text-positive'}`}
                        />
                      )}
                      <span>{slice.staffName}</span>
                      <span
                        className={`rounded px-2 py-0 text-2xs font-medium ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isMainPic
                            ? 'bg-sunken text-ink'
                            : 'bg-sunken/80 text-ink-2'
                        }`}
                      >
                        {roleTag}
                      </span>
                    </button>
                  );
                })}
                {!effectiveReadOnly && (() => {
                  const existingNames = new Set(staffSlices.map(s => s.staffName.trim()));
                  const roleCandidates: { name: string; rolePrefix: string }[] = [];
                  const pushCand = (names: string[] | undefined, rolePrefix: string) => {
                    (names || []).forEach(n => {
                      const clean = (n || '').trim();
                      if (clean && !existingNames.has(clean) && !roleCandidates.some(c => c.name === clean)) {
                        roleCandidates.push({ name: clean, rolePrefix });
                      }
                    });
                  };
                  pushCand(rolePics?.bookingPics, 'Phụ');
                  pushCand(rolePics?.focPics, 'Phụ trách FOC');
                  pushCand(rolePics?.contentPics, 'Phụ trách Self');
                  pushCand(rolePics?.livePics, 'Phụ trách Live');
                  STAFF_SLICE_PIC_OPTIONS.forEach((n: string) => {
                    const clean = (n || '').trim();
                    if (clean && !existingNames.has(clean) && !roleCandidates.some(c => c.name === clean)) {
                      roleCandidates.push({ name: clean, rolePrefix: 'Phụ' });
                    }
                  });
                  if (roleCandidates.length === 0) return null;
                  return (
                    <select
                      value=""
                      onChange={e => {
                        const picked = roleCandidates.find(c => c.name === e.target.value);
                        if (picked) handleAddCollaboratorSlice(picked.name, picked.rolePrefix);
                      }}
                      className="h-6 rounded border border-dashed border-line-strong bg-canvas/80 px-2 text-2xs font-medium text-ink-2 hover:border-line-strong hover:bg-sunken focus:outline-none cursor-pointer"
                      title="Thêm phần nhập tuần 4.1.1 cho chuyên viên phối hợp (FOC, Content, Live, Booking phụ)"
                    >
                      <option value="">+ Thêm người nhập</option>
                      {roleCandidates.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.rolePrefix})
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>
            )}
            {activeSliceObj && !effectiveReadOnly && (
              <button
                type="button"
                onClick={() => handleToggleSliceComplete(activeSliceObj.staffName)}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-2xs font-semibold transition cursor-pointer ${
                  activeSliceObj.isCompleted
                    ? 'border-positive/30 bg-positive-soft text-positive hover:bg-positive-soft'
                    : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken'
                }`}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${activeSliceObj.isCompleted ? 'text-positive' : 'text-ink-3'}`} />
                <span>{activeSliceObj.isCompleted ? 'Đã chốt phần việc' : 'Xác nhận xong phần việc'}</span>
              </button>
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
                className="rounded-md border border-accent/30 bg-accent-soft px-3 py-1 text-2xs font-semibold text-accent-hover hover:bg-accent-soft transition cursor-pointer"
              >
                Xem tất cả
              </button>
            )}
          </div>
        </div>

        {/* MOBILE (< 768px): DẠNG THẺ TỔNG QUAN 4.1 & 4.1.1 (KHÔNG CẦN KÉO NGANG) */}
        <div className="md:hidden divide-y divide-line">
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
                className={`p-3 space-y-2 cursor-pointer transition ${
                  isFocused ? 'bg-accent-soft/60' : 'hover:bg-canvas/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-ink truncate">{row.title}</span>
                    {row.extraTag && (
                      <span className="rounded bg-sunken px-2 py-0.5 text-2xs font-medium text-ink-2 shrink-0">
                        {row.extraTag}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {isEmpty ? (
                      <span className="text-2xs text-ink-3/50">—</span>
                    ) : isAllMatched ? (
                      <span className="inline-flex items-center gap-1 text-2xs font-semibold text-positive">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Khớp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-2xs font-semibold text-warning">
                        {!isQtyMatched && `${qtyDiff > 0 ? `+${fmt(qtyDiff)}` : fmt(qtyDiff)} ${row.unitLabel}`}
                        {!isQtyMatched && !isBudMatched && ' · '}
                        {!isBudMatched && `${budDiff > 0 ? `+${fmt(budDiff)}đ` : `${fmt(budDiff)}đ`}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-2xs text-ink-3">
                  Phụ trách: <strong className="text-ink">{row.picText}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs tabular-nums pt-0.5">
                  <div className="rounded-lg bg-canvas border border-line/80 px-3 py-2 flex items-center justify-between">
                    <span className="text-ink-3">SL (4.1 / 4.1.1):</span>
                    <span>
                      <span className="text-ink-2">{fmt(row.refQty)}</span>
                      <span className="text-ink-3/40 mx-1">/</span>
                      <strong className="text-accent-hover">{fmt(row.plannedQty)}</strong>
                    </span>
                  </div>
                  <div className="rounded-lg bg-accent-soft/30 border border-accent-soft px-3 py-2 flex items-center justify-between">
                    <span className="text-ink-3">Net:</span>
                    <strong className="text-accent-hover">
                      {row.plannedBudgetNet > 0 ? `${fmt(row.plannedBudgetNet)}đ` : row.refBudgetNet > 0 ? `${fmt(row.refBudgetNet)}đ` : '0đ'}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="p-3 bg-canvas/90 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink">
            <span>Tổng 4.1.1 / 4.1: {fmt(overviewGrandTotals.plannedQty)} / {fmt(overviewGrandTotals.refQty)}</span>
            <span className="text-accent-hover tabular-nums">
              {fmt(overviewGrandTotals.plannedBudgetNet)}đ / {fmt(overviewGrandTotals.refBudgetNet)}đ
            </span>
          </div>
        </div>

        {/* DESKTOP (>= 768px): BỐ CỤC SPLIT 2 CỘT (TRÁI: MA TRẬN 5 HẠNG MỤC · PHẢI: CHỈ TIÊU DOANH SỐ GMV & HIỆU QUẢ) */}
        <div className="hidden md:grid md:grid-cols-12">
          <div className="md:col-span-12 xl:col-span-8 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/50 text-2xs font-semibold text-ink-3">
                  <th className="px-4 py-1 text-left">Hạng mục</th>
                  <th className="px-3 py-1 text-left">Phụ trách</th>
                  <th className="border-l border-line px-3 py-1 text-right w-[96px]">SL 4.1</th>
                  <th className="px-3 py-1 text-right w-[96px] bg-accent-soft/30 text-accent-hover">SL 4.1.1</th>
                  <th className="border-l border-line px-3 py-1 text-right w-[124px]">Net 4.1</th>
                  <th className="px-3 py-1 text-right w-[124px] bg-accent-soft/30 text-accent-hover">Net 4.1.1</th>
                  <th className="border-l border-line px-4 py-1 text-right w-[124px]">Đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
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
                          ? 'border-l-2 border-l-accent bg-accent-soft/70'
                          : 'hover:bg-canvas/70'
                      }`}
                    >
                      <td className="px-4 py-1 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{row.title}</span>
                          {row.extraTag && (
                            <span className="rounded bg-sunken px-2 py-0.5 text-2xs font-medium text-ink-2">
                              {row.extraTag}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1 align-middle">
                        <span className="text-ink-2 font-medium">{row.picText}</span>
                      </td>
                      <td className="border-l border-line px-3 py-1 text-right align-middle tabular-nums text-ink-2">
                        {row.refQty > 0 ? (
                          <>
                            <span className="font-semibold text-ink">{fmt(row.refQty)}</span>{' '}
                            <span className="text-2xs text-ink-3">{row.unitLabel}</span>
                          </>
                        ) : (
                          <span className="text-ink-3/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1 text-right align-middle tabular-nums bg-accent-soft/20">
                        {row.plannedQty > 0 ? (
                          <>
                            <span className="font-semibold text-ink">{fmt(row.plannedQty)}</span>{' '}
                            <span className="text-2xs text-ink-3">{row.unitLabel}</span>
                          </>
                        ) : (
                          <span className="text-ink-3/40">—</span>
                        )}
                      </td>
                      <td className="border-l border-line px-3 py-1 text-right align-middle tabular-nums text-ink-2">
                        {row.refBudgetNet > 0 ? `${fmt(row.refBudgetNet)}đ` : <span className="text-ink-3/40">—</span>}
                      </td>
                      <td className="px-3 py-1 text-right align-middle tabular-nums font-semibold text-accent-hover bg-accent-soft/20">
                        {row.plannedBudgetNet > 0 ? `${fmt(row.plannedBudgetNet)}đ` : <span className="text-ink-3/40 font-normal">—</span>}
                      </td>
                      <td className="border-l border-line px-4 py-1 text-right align-middle tabular-nums">
                        {isEmpty ? (
                          <span className="text-ink-3/40">—</span>
                        ) : isAllMatched ? (
                          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-positive">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Khớp
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-end gap-0.5 text-2xs font-semibold">
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              {!isQtyMatched && (
                                <span className={qtyDiff > 0 ? 'text-critical' : 'text-warning'}>
                                  {qtyDiff > 0 ? `+${fmt(qtyDiff)}` : fmt(qtyDiff)} {row.unitLabel}
                                </span>
                              )}
                              {!isBudMatched && (
                                <span className={budDiff > 0 ? 'text-critical' : 'text-warning'}>
                                  {budDiff > 0 ? `+${fmt(budDiff)}đ` : `${fmt(budDiff)}đ`}
                                </span>
                              )}
                            </div>
                            {!isBudMatched && isPreVatPitIncludedBudget(row.plannedBudgetNet, row.refBudgetNet) && (
                              <span className="rounded bg-warning-soft border border-warning/30 px-2 py-0 text-2xs font-medium text-warning">
                                Giá trước VAT
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
                <tr
                  onClick={() => setActiveTab('ALL')}
                  className="cursor-pointer border-t border-line bg-canvas/90 font-semibold text-ink hover:bg-sunken/80 transition"
                >
                  <td className="px-4 py-1" colSpan={2}>
                    Tổng cộng
                  </td>
                  <td className="border-l border-line px-3 py-1 text-right tabular-nums">
                    {fmt(overviewGrandTotals.refQty)}
                  </td>
                  <td className="px-3 py-1 text-right tabular-nums text-accent-hover bg-accent-soft/40">
                    {fmt(overviewGrandTotals.plannedQty)}
                  </td>
                  <td className="border-l border-line px-3 py-1 text-right tabular-nums">
                    {fmt(overviewGrandTotals.refBudgetNet)}đ
                  </td>
                  <td className="px-3 py-1 text-right tabular-nums text-accent-hover bg-accent-soft/40">
                    {fmt(overviewGrandTotals.plannedBudgetNet)}đ
                  </td>
                  <td className="border-l border-line px-4 py-1 text-right tabular-nums">
                    {overviewGrandTotals.plannedQty === overviewGrandTotals.refQty &&
                    Math.abs(overviewGrandTotals.plannedBudgetNet - overviewGrandTotals.refBudgetNet) <= 2000 ? (
                      <span className="inline-flex items-center gap-1 text-positive">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Khớp
                      </span>
                    ) : (
                      <span className="text-warning inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Lệch
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* CỘT PHẢI (4/12): CHỈ TIÊU DOANH SỐ GMV & HIỆU QUẢ ĐẦU TƯ 4.1 */}
          <div className="md:col-span-12 xl:col-span-4 border-t xl:border-t-0 xl:border-l border-line bg-canvas/40 p-3 flex flex-col justify-between gap-2 text-2xs">
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-line">
              <div>
                <div className="text-ink-3 font-medium">NMV mục tiêu (4.1)</div>
                <div className="text-sm font-semibold tabular-nums text-ink mt-1">
                  {gmvSummary.nmvPlan > 0 ? `${fmt(gmvSummary.nmvPlan)}đ` : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div className="rounded-md bg-surface border border-line px-2 py-1">
                  <span className="text-ink-3 block">CIR dự kiến</span>
                  <strong className={`tabular-nums ${gmvSummary.cirPct > 35 ? 'text-warning' : 'text-ink'}`}>
                    {gmvSummary.cirPct > 0 ? `${gmvSummary.cirPct}%` : '—'}
                  </strong>
                </div>
                <div className="rounded-md bg-surface border border-line px-2 py-1">
                  <span className="text-ink-3 block">ROI mục tiêu</span>
                  <strong className="tabular-nums text-positive">
                    {gmvSummary.roiVal > 0 ? `${gmvSummary.roiVal}x` : '—'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Phân bổ GMV theo kênh (Thanh tỷ trọng + lưới 3 cột gọn) */}
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-sunken overflow-hidden flex">
                {gmvSummary.affPct > 0 && (
                  <div
                    className="h-full bg-positive"
                    style={{ width: `${gmvSummary.affPct}%` }}
                    title={`GMV Affiliate: ${fmt(gmvSummary.videoAff)}đ`}
                  />
                )}
                {gmvSummary.selfPct > 0 && (
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${gmvSummary.selfPct}%` }}
                    title={`GMV Kênh Brand: ${fmt(gmvSummary.videoSelf)}đ`}
                  />
                )}
                {gmvSummary.livePct > 0 && (
                  <div
                    className="h-full bg-warning"
                    style={{ width: `${gmvSummary.livePct}%` }}
                    title={`GMV Live Brand: ${fmt(gmvSummary.liveTotal)}đ`}
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-line bg-surface px-2 py-1">
                  <div className="flex items-center gap-1 text-ink-3">
                    <span className="h-2 w-2 rounded-full bg-positive shrink-0" />
                    <span className="truncate">GMV Affiliate</span>
                  </div>
                  <div className="font-semibold tabular-nums text-positive mt-1 truncate">
                    {gmvSummary.videoAff > 0 ? `${fmt(gmvSummary.videoAff)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-surface px-2 py-1">
                  <div className="flex items-center gap-1 text-ink-3">
                    <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
                    <span className="truncate">GMV Brand</span>
                  </div>
                  <div className="font-semibold tabular-nums text-accent-hover mt-1 truncate">
                    {gmvSummary.videoSelf > 0 ? `${fmt(gmvSummary.videoSelf)}đ` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-surface px-2 py-1">
                  <div className="flex items-center gap-1 text-ink-3">
                    <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                    <span className="truncate">GMV Live</span>
                  </div>
                  <div className="font-semibold tabular-nums text-ink mt-1 truncate">
                    {gmvSummary.liveTotal > 0 ? `${fmt(gmvSummary.liveTotal)}đ` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Đối chiếu GMV 30 ngày & Định mức KL4+ trên 1 dòng gọn */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/80">
              <div className="rounded-lg border border-warning/30 bg-warning-soft/40 px-2 py-1 flex items-center justify-between gap-1">
                <span className="text-warning truncate">GMV 30N trước</span>
                <strong className="tabular-nums text-warning shrink-0">
                  {gmvSummary.lastMonth30d > 0 ? `${fmt(gmvSummary.lastMonth30d)}đ` : '—'}
                </strong>
              </div>
              <div className="rounded-lg border border-positive/30 bg-positive-soft/40 px-2 py-1 flex items-center justify-between gap-1">
                <span className="text-positive truncate">GMV 30N này</span>
                <strong className="tabular-nums text-positive shrink-0">
                  {gmvSummary.thisMonth30d > 0 ? `${fmt(gmvSummary.thisMonth30d)}đ` : '—'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TẦNG 2: BẢNG CHI TIẾT PHÂN RÃ TUẦN 4.1.1 (THANH CÔNG CỤ GỘP TRỰC TIẾP VÀO ĐẦU BẢNG) */}
      <div ref={detailAnchorRef} className="space-y-3">
        {!effectiveReadOnly && isEmptyBreakdown && hasStep2Items && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent-soft/70 px-4 py-2 text-xs text-accent-hover">
            <span className="font-medium">Chưa có số phân rã tuần</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('EVEN')}
                className="rounded-md bg-accent px-3 py-1 text-2xs font-semibold text-white hover:bg-accent-hover transition cursor-pointer"
              >
                Chia đều
              </button>
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                className="rounded-md border border-accent/30 bg-surface px-3 py-1 text-2xs font-semibold text-accent-hover hover:bg-accent-soft transition cursor-pointer"
              >
                Dồn W2–W3
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-line bg-surface shadow-2xs overflow-hidden">
          {/* Header tích hợp của Bảng Phân Rã Tuần: Trái = Tabs chọn nhanh hạng mục + KL4+ · Phải = Công cụ chia tuần & lọc hiển thị */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/80 px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Chips<WorkstreamTab>
                value={activeTab}
                onChange={setActiveTab}
                items={[
                  { key: 'ALL', label: 'Tất cả hạng mục' },
                  { key: 'CAST_KL', label: 'Cast trả phí' },
                  { key: 'FOC_SAMPLE', label: 'Mẫu FOC' },
                  { key: 'SELF_CHANNEL', label: 'Kênh Brand' },
                  { key: 'MULTI_PLATFORM', label: 'Đa sàn' },
                  { key: 'LIVE_GMV', label: 'Livestream' },
                ]}
              />

              {ref41 && (ref41.kl4PlusTarget || 0) > 0 && (
                <span className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent-soft/60 px-2 py-0.5 text-2xs font-semibold text-accent-hover tabular-nums">
                  <span>KL4–KL7: {fmt(kl4PlusPlanned)}/{fmt(ref41.kl4PlusTarget || 0)} video</span>
                  <span className={kl4PlusPlanned >= (ref41.kl4PlusTarget || 0) ? 'text-positive' : 'text-warning'}>
                    ({kl4PlusPlanned >= (ref41.kl4PlusTarget || 0) ? 'Đạt' : `Thiếu ${fmt((ref41.kl4PlusTarget || 0) - kl4PlusPlanned)}`})
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-2xs">
              {!effectiveReadOnly && (
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDistributeFromStep2('EVEN')}
                    className="rounded-md border border-line bg-surface px-3 py-1 font-semibold text-ink-2 hover:bg-sunken transition cursor-pointer"
                  >
                    Chia đều
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                    className="rounded-md border border-line bg-surface px-3 py-1 font-semibold text-ink-2 hover:bg-sunken transition cursor-pointer"
                  >
                    Dồn W2–W3
                  </button>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-1 font-medium text-ink-2 hover:bg-sunken">
                <input type="checkbox" checked={hideEmptyRows} onChange={e => setHideEmptyRows(e.target.checked)} />
                <span>Ẩn dòng trống</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-1 font-medium text-ink-2 hover:bg-sunken">
                <input type="checkbox" checked={grossMode} onChange={e => setGrossMode(e.target.checked)} />
                <span>Nhập theo Gross</span>
              </label>
            </div>
          </div>

          {visibleSections.length > 0 && (
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full min-w-[1100px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 min-w-[105px] max-w-[115px] sm:min-w-[180px] sm:max-w-none border-b border-r border-line bg-canvas px-2 sm:px-3 py-1 text-left font-semibold text-ink"
                    >
                      Hạng mục
                    </th>
                    <th
                      rowSpan={2}
                      className="min-w-[84px] border-b border-r border-line bg-canvas px-2 py-1 text-right font-semibold text-ink-3 text-2xs"
                    >
                      Đơn giá TB
                    </th>
                    {rows.map((r, wi) => weekHeader(r, wi))}
                    <th
                      colSpan={2}
                      className="border-b border-l border-line bg-accent-soft/60 px-2 py-1 text-center font-semibold text-accent-hover"
                    >
                      Tổng 4.1.1
                    </th>
                    {hasRef && (
                      <th
                        colSpan={2}
                        className="border-b border-l border-line bg-sunken/80 px-2 py-1 text-center font-semibold text-ink-2"
                      >
                        Chỉ tiêu 4.1 / Tỷ trọng
                      </th>
                    )}
                    {hasRef && (
                      <th
                        rowSpan={2}
                        className="min-w-[90px] border-b border-l border-line bg-canvas px-3 py-1 text-right font-semibold text-ink-2"
                      >
                        Đối soát
                      </th>
                    )}
                  </tr>
                  <tr className="border-b border-line bg-canvas/70 text-2xs font-semibold text-ink-3">
                    {rows.map(r => (
                      <React.Fragment key={`sub-${r.week}`}>
                        <th className="w-[50px] min-w-[50px] border-l border-line px-2 py-1 text-right">
                          SL
                        </th>
                        <th className="w-[92px] min-w-[92px] border-l border-line px-2 py-1 text-right">
                          {grossMode ? 'Gross' : 'Net'}
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="w-[52px] min-w-[52px] border-l border-line bg-accent-soft/40 px-2 py-1 text-right text-accent-hover">
                      SL
                    </th>
                    <th className="w-[100px] min-w-[100px] border-l border-accent-soft bg-accent-soft/40 px-2 py-1 text-right text-accent-hover">
                      Net
                    </th>
                    {hasRef && (
                      <>
                        <th className="w-[52px] min-w-[52px] border-l border-line bg-sunken/50 px-2 py-1 text-right">
                          SL
                        </th>
                        <th className="w-[100px] min-w-[100px] border-l border-line/60 bg-sunken/50 px-2 py-1 text-right">
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
                        <tr className="bg-sunken/80 border-y border-line">
                          <td
                            colSpan={totalColSpan}
                            className="sticky left-0 px-3 py-1 text-2xs font-semibold text-ink-2"
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
                          const qtySharePct = secQty > 0 && t.qty > 0 ? Math.round((t.qty / secQty) * 100) : 0;
                          const budSharePct = secBudget > 0 && t.budget > 0 ? Math.round((t.budget / secBudget) * 100) : 0;
                          const tierOutRange =
                            def.kind === 'tier' && def.tier && avgUnit > 0
                              ? avgUnit < TIER_RANGE[def.tier].min ||
                                (TIER_RANGE[def.tier].max !== null && avgUnit > TIER_RANGE[def.tier].max!)
                              : false;

                          return (
                            <tr key={def.id} className="border-b border-line hover:bg-canvas/40">
                              <td className="sticky left-0 z-10 max-w-[115px] sm:max-w-none truncate border-r border-line bg-surface px-2 sm:px-3 py-1 font-medium text-ink" title={def.label}>
                                {def.label}
                              </td>
                              <td className="border-r border-line px-2 py-1 text-right tabular-nums text-2xs text-ink-3">
                                {avgUnit > 0 ? `${fmt(avgUnit)}đ` : '—'}
                              </td>
                              {rows.map((row, wi) => (
                                <React.Fragment key={row.week}>
                                  <td className="border-l border-line p-0 align-middle">
                                    {def.hasQty ? (
                                      renderInput(r, def, wi, 0)
                                    ) : (
                                      <span className="block h-7 bg-canvas/40" />
                                    )}
                                  </td>
                                  <td className="border-l border-line p-0 align-middle">
                                    {def.hasBudget ? (
                                      renderInput(r, def, wi, 1)
                                    ) : (
                                      <span className="block h-7 bg-canvas/40" />
                                    )}
                                  </td>
                                </React.Fragment>
                              ))}
                              <td className="border-l border-line bg-accent-soft/20 px-2 py-1 text-right tabular-nums font-semibold text-ink">
                                {def.hasQty ? (t.qty > 0 ? fmt(t.qty) : <span className="text-ink-3/40 font-normal">—</span>) : ''}
                              </td>
                              <td className="border-l border-accent-soft/70 bg-accent-soft/20 px-2 py-1 text-right tabular-nums font-semibold text-accent-hover">
                                {def.hasBudget ? (t.budget > 0 ? fmt(t.budget) : <span className="text-ink-3/40 font-normal">—</span>) : ''}
                              </td>
                              {hasRef && (
                                <>
                                  <td className="border-l border-line bg-canvas/50 px-2 py-1 text-right tabular-nums text-ink-2">
                                    {rowRefQty !== null ? (
                                      rowRefQty > 0 ? fmt(rowRefQty) : <span className="text-ink-3/40">—</span>
                                    ) : qtySharePct > 0 ? (
                                      <span className="text-2xs text-ink-3" title="Tỷ trọng số lượng trong nhóm">{qtySharePct}%</span>
                                    ) : (
                                      <span className="text-ink-3/40">—</span>
                                    )}
                                  </td>
                                  <td className="border-l border-line bg-canvas/50 px-2 py-1 text-right tabular-nums text-ink-3">
                                    {budSharePct > 0 ? (
                                      <span className="text-2xs text-ink-3" title="Tỷ trọng ngân sách trong nhóm">{budSharePct}%</span>
                                    ) : (
                                      <span className="text-ink-3/40">—</span>
                                    )}
                                  </td>
                                  <td className="border-l border-line px-3 py-1 text-right tabular-nums">
                                    {rowRefQty !== null ? (
                                      renderInlineDiff(t.qty, rowRefQty)
                                    ) : tierOutRange ? (
                                      <span className="text-2xs font-medium text-warning">Lệch khung</span>
                                    ) : t.qty > 0 || t.budget > 0 ? (
                                      <span className="text-2xs text-positive">Đạt khung</span>
                                    ) : (
                                      <span className="text-ink-3/40">—</span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                        {defs.length > 1 ? (
                          <tr className="border-b border-line bg-canvas/90 font-semibold text-ink">
                            <td className="sticky left-0 z-10 border-r border-line bg-canvas px-3 py-1">
                              Cộng {section.toLowerCase()}
                            </td>
                            <td className="border-r border-line px-2 py-1 text-right tabular-nums text-2xs font-normal text-ink-3">
                              {secQty > 0 && secBudget > 0 ? `${fmt(Math.round(secBudget / secQty))}đ` : '—'}
                            </td>
                            {sub.map((x, wi) => (
                              <React.Fragment key={rows[wi].week}>
                                <td className="border-l border-line px-2 py-1 text-right tabular-nums">
                                  {x.qty > 0 ? fmt(x.qty) : <span className="text-ink-3/40 font-normal">—</span>}
                                </td>
                                <td className="border-l border-line px-2 py-1 text-right tabular-nums">
                                  {x.budget > 0 ? fmt(x.budget) : <span className="text-ink-3/40 font-normal">—</span>}
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="border-l border-line bg-accent-soft/50 px-2 py-1 text-right tabular-nums text-accent-hover">
                              {fmt(secQty)}
                            </td>
                            <td className="border-l border-accent-soft bg-accent-soft/50 px-2 py-1 text-right tabular-nums text-accent-hover">
                              {section === 'Suất FOC (0đ)' ? '0' : fmt(secBudget)}
                            </td>
                            {hasRef && (
                              <>
                                <td className="border-l border-line bg-sunken/60 px-2 py-1 text-right tabular-nums text-ink-2">
                                  {qtyRef ? fmt(qtyRef.reference) : '—'}
                                </td>
                                <td className="border-l border-line/60 bg-sunken/60 px-2 py-1 text-right tabular-nums text-ink-2">
                                  {budgetRef ? fmt(budgetRef.reference) : '—'}
                                </td>
                                <td className="border-l border-line px-3 py-1 text-right tabular-nums">
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
          )}
        </div>

        {(activeTab === 'ALL' || activeTab === 'MULTI_PLATFORM') && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-2">
              <h4 className="text-xs font-semibold text-ink">
                Đa sàn (Shopee · Threads · Facebook · Instagram)
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                {ref41 && (ref41.tiktokReup || 0) > 0 && (
                  <span className="rounded-md bg-sunken/80 px-2 py-0.5 font-semibold text-ink">
                    Reup TikTok (4.1): {fmt(ref41.tiktokReup || 0)}
                  </span>
                )}
                <span className="text-ink-2">
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
                    <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${mp.borderClass} ${mp.headerBg} px-4 py-2`}>
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${mp.badgeClass}`}>
                        {mp.shortLabel}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-2xs tabular-nums">
                        <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-ink-2 border border-line/70">
                          Affiliate: <b>{fmt(pTot.affQty)}</b>
                          {hasRef ? ` / ${fmt(refAff)}` : ''}
                        </span>
                        <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-ink-2 border border-line/70">
                          Reup: <b>{fmt(pTot.reupQty)}</b>
                          {hasRef ? ` / ${fmt(refReup)}` : ''}
                        </span>
                        <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-ink-2 border border-line/70">
                          Net: <b>{fmt(pTot.budgetNet)}đ</b>
                          {hasRef ? ` / ${fmt(refNet)}đ` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-line bg-canvas/50 text-2xs text-ink-3">
                            <th className="px-3 py-2 text-left font-semibold text-ink-2 min-w-[130px]">
                              Hạng mục
                            </th>
                            {rows.map(r => (
                              <th key={r.week} className="border-l border-line px-2 py-2 text-center font-semibold text-ink-2 min-w-[76px]">
                                {shortWeek(r.week)}
                              </th>
                            ))}
                            <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink min-w-[78px]">
                              Tổng
                            </th>
                            {hasRef && (
                              <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink-2 min-w-[78px]">
                                4.1
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-line hover:bg-canvas/40">
                            <td className="px-3 py-2 font-medium text-ink-2">Video Affiliate</td>
                            {rows.map((r, wi) => {
                              const v = r.multiPlatform?.[mp.key]?.affQty || 0;
                              return (
                                <td key={r.week} className="border-l border-line p-0 align-middle">
                                  {renderFlushCellInput(v, val => setMultiPlatformCell(wi, mp.key, 'affQty', val), false)}
                                </td>
                              );
                            })}
                            <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                              {pTot.affQty ? fmt(pTot.affQty) : '—'}
                            </td>
                            {hasRef && (
                              <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
                                {refAff ? fmt(refAff) : '—'}
                              </td>
                            )}
                          </tr>

                          <tr className="border-b border-line hover:bg-canvas/40">
                            <td className="px-3 py-2 font-medium text-ink-2">
                              Ngân sách ({grossMode ? 'Gross' : 'Net'})
                            </td>
                            {rows.map((r, wi) => {
                              const netVal = r.multiPlatform?.[mp.key]?.budgetNet || 0;
                              const shown = grossMode ? grossFromNet(netVal) : netVal;
                              return (
                                <td key={r.week} className="border-l border-line p-0 align-middle">
                                  {renderFlushCellInput(
                                    shown,
                                    val => setMultiPlatformCell(wi, mp.key, 'budgetNet', grossMode ? netFromGross(val) : val),
                                    true,
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                              {pTot.budgetNet ? fmt(pTot.budgetNet) : '—'}
                            </td>
                            {hasRef && (
                              <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
                                {refNet ? fmt(refNet) : '—'}
                              </td>
                            )}
                          </tr>

                          <tr className="hover:bg-canvas/40">
                            <td className="px-3 py-2 font-medium text-ink-2">Video Reup (0đ)</td>
                            {rows.map((r, wi) => {
                              const v = r.multiPlatform?.[mp.key]?.reupQty || 0;
                              return (
                                <td key={r.week} className="border-l border-line p-0 align-middle">
                                  {renderFlushCellInput(v, val => setMultiPlatformCell(wi, mp.key, 'reupQty', val), false)}
                                </td>
                              );
                            })}
                            <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                              {pTot.reupQty ? fmt(pTot.reupQty) : '—'}
                            </td>
                            {hasRef && (
                              <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
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
            <div className="rounded-xl border border-critical/30 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-critical/30 bg-critical-soft/70 px-4 py-2">
                <span className="text-xs font-semibold text-critical">
                  Livestream Affiliate
                </span>
                <div className="flex items-center gap-2 text-2xs tabular-nums">
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-critical border border-critical/30">
                    Phiên: {fmt(totals.liveSessions)}
                    {hasRef ? ` / ${fmt(ref41?.liveSessions || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-critical border border-critical/30">
                    Net: {fmt(totals.liveBudget)}đ
                    {hasRef ? ` / ${fmt(ref41?.liveCostNet || 0)}đ` : ''}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-canvas/50 text-2xs text-ink-3">
                      <th className="px-3 py-2 text-left font-semibold text-ink-2 min-w-[140px]">
                        Hạng mục
                      </th>
                      {rows.map(r => (
                        <th key={r.week} className="border-l border-line px-2 py-2 text-center font-semibold text-ink-2 min-w-[76px]">
                          {shortWeek(r.week)}
                        </th>
                      ))}
                      <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink min-w-[78px]">
                        Tổng
                      </th>
                      {hasRef && (
                        <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink-2 min-w-[78px]">
                          4.1
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line hover:bg-canvas/40">
                      <td className="px-3 py-2 font-medium text-ink-2">Số phiên</td>
                      {rows.map((r, wi) => {
                        const liveDef = ROWS.find(d => d.id === 'live')!;
                        const v = r.live?.sessions || 0;
                        return (
                          <td key={r.week} className="border-l border-line p-0 align-middle">
                            {renderFlushCellInput(v, val => setCell(wi, liveDef, 0, val), false)}
                          </td>
                        );
                      })}
                      <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {totals.liveSessions ? fmt(totals.liveSessions) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
                          {ref41?.liveSessions ? fmt(ref41.liveSessions) : '—'}
                        </td>
                      )}
                    </tr>
                    <tr className="hover:bg-canvas/40">
                      <td className="px-3 py-2 font-medium text-ink-2">
                        Ngân sách ({grossMode ? 'Gross' : 'Net'})
                      </td>
                      {rows.map((r, wi) => {
                        const liveDef = ROWS.find(d => d.id === 'live')!;
                        const netVal = r.live?.budgetNet || 0;
                        const shown = grossMode ? grossFromNet(netVal) : netVal;
                        return (
                          <td key={r.week} className="border-l border-line p-0 align-middle">
                            {renderFlushCellInput(
                              shown,
                              val => setCell(wi, liveDef, 1, grossMode ? netFromGross(val) : val),
                              true,
                            )}
                          </td>
                        );
                      })}
                      <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {totals.liveBudget ? fmt(totals.liveBudget) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
                          {ref41?.liveCostNet ? fmt(ref41.liveCostNet) : '—'}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-positive/30 bg-white shadow-xs overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-positive/30 bg-positive-soft/70 px-4 py-2">
                <span className="text-xs font-semibold text-positive">
                  Livestream kênh Brand
                </span>
                <div className="flex flex-wrap items-center gap-2 text-2xs tabular-nums">
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-positive border border-positive/30">
                    Inhouse 3h: {fmt(totals.liveSelfInhouse)}
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.inhouse3h || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-positive border border-positive/30">
                    CTV 2h: {fmt(totals.liveSelfCtv)}
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.ctv2h || 0)}` : ''}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-semibold text-positive border border-positive/30">
                    Net: {fmt(totals.liveSelfBudget)}đ
                    {hasRef ? ` / ${fmt(ref41?.liveSelf?.totalCostNet || 0)}đ` : ''}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-canvas/50 text-2xs text-ink-3">
                      <th className="px-3 py-2 text-left font-semibold text-ink-2 min-w-[140px]">
                        Hạng mục
                      </th>
                      {rows.map(r => (
                        <th key={r.week} className="border-l border-line px-2 py-2 text-center font-semibold text-ink-2 min-w-[76px]">
                          {shortWeek(r.week)}
                        </th>
                      ))}
                      <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink min-w-[78px]">
                        Tổng
                      </th>
                      {hasRef && (
                        <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink-2 min-w-[78px]">
                          4.1
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line hover:bg-canvas/40">
                      <td className="px-3 py-2 font-medium text-ink-2">Inhouse (3h)</td>
                      {rows.map((r, wi) => {
                        const v = r.liveSelf?.inhouse3h || 0;
                        return (
                          <td key={r.week} className="border-l border-line p-0 align-middle">
                            {renderFlushCellInput(v, val => setLiveSelfCell(wi, 'inhouse3h', val), false)}
                          </td>
                        );
                      })}
                      <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {totals.liveSelfInhouse ? fmt(totals.liveSelfInhouse) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
                          {ref41?.liveSelf?.inhouse3h ? fmt(ref41.liveSelf.inhouse3h) : '—'}
                        </td>
                      )}
                    </tr>
                    <tr className="border-b border-line hover:bg-canvas/40">
                      <td className="px-3 py-2 font-medium text-ink-2">CTV ngoài (2h)</td>
                      {rows.map((r, wi) => {
                        const v = r.liveSelf?.ctv2h || 0;
                        return (
                          <td key={r.week} className="border-l border-line p-0 align-middle">
                            {renderFlushCellInput(v, val => setLiveSelfCell(wi, 'ctv2h', val), false)}
                          </td>
                        );
                      })}
                      <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {totals.liveSelfCtv ? fmt(totals.liveSelfCtv) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
                          {ref41?.liveSelf?.ctv2h ? fmt(ref41.liveSelf.ctv2h) : '—'}
                        </td>
                      )}
                    </tr>
                    <tr className="hover:bg-canvas/40">
                      <td className="px-3 py-2 font-medium text-ink-2">
                        Ngân sách ({grossMode ? 'Gross' : 'Net'})
                      </td>
                      {rows.map((r, wi) => {
                        const netVal = r.liveSelf?.budgetNet || 0;
                        const shown = grossMode ? grossFromNet(netVal) : netVal;
                        return (
                          <td key={r.week} className="border-l border-line p-0 align-middle">
                            {renderFlushCellInput(
                              shown,
                              val => setLiveSelfCell(wi, 'budgetNet', grossMode ? netFromGross(val) : val),
                              true,
                            )}
                          </td>
                        );
                      })}
                      <td className="border-l border-line bg-canvas/30 px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {totals.liveSelfBudget ? fmt(totals.liveSelfBudget) : '—'}
                      </td>
                      {hasRef && (
                        <td className="border-l border-line px-3 py-2 text-right tabular-nums text-ink-2">
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
