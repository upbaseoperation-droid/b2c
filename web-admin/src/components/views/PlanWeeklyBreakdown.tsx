'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Copy, Eraser } from 'lucide-react';
import type { InputPlanBreakdownState, PlanTierKey, PlanWeekRow } from '../../lib/types';
import {
  FOC_TYPES,
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
  ...TIER_KEYS.map<RowDef>(k => ({ id: `tier-${k}`, kind: 'tier', label: TIER_RANGE[k].label, tier: k, hasQty: true, hasBudget: true, section: 'Video Cast trả phí' })),
  ...FOC_TYPES.map<RowDef>(f => ({ id: `foc-${f.key}`, kind: 'foc', label: f.label, focKey: f.key, hasQty: true, hasBudget: false, section: 'Suất FOC (0đ)' })),
  ...SELF_TYPES.map<RowDef>(s => ({ id: `self-${s.key}`, kind: 'self', label: s.label, selfKey: s.key, hasQty: true, hasBudget: false, section: 'Video self channel' })),
  { id: 'self-budget', kind: 'selfBudget', label: 'Ngân sách self channel', hasQty: false, hasBudget: true, section: 'Video self channel' },
  { id: 'live', kind: 'live', label: 'Livestream affiliate', hasQty: true, hasBudget: true, section: 'Livestream' },
];

const clone = (rows: PlanWeekRow[]): PlanWeekRow[] => structuredClone(rows);
const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');

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
  const refs = useRef(new Map<string, HTMLInputElement>());

  const { issues, comparison, rows } = useMemo(() => validateBreakdown(plan), [plan]);
  const totals = useMemo(() => sumBreakdown(rows), [rows]);
  const hasRef = Boolean(plan.reference41);
  const isEmptyBreakdown = useMemo(() => !hasBreakdownData(rows), [rows]);
  const hasStep2Items = useMemo(
    () => (plan.items || []).some(it => !it.id.startsWith('WB-') && (it.qty > 0 || it.totalBudget > 0)),
    [plan.items]
  );
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const needsNote = issues.some(i => i.needsNote);

  const commit = (next: PlanWeekRow[]) => {
    if (readOnly) return;
    onChange({
      weeklyBreakdown: next,
      items: mergeBreakdownItems({ ...plan, weeklyBreakdown: next }, next),
    });
  };

  const handleDistributeFromStep2 = (mode: WeeklyDistributionMode) => {
    if (readOnly) return;
    const nextRows = distributeItemsToWeeks(plan, mode);
    commit(nextRows);
    if (onNotify) {
      const label =
        mode === 'EVEN'
          ? 'Chia đều 4 tuần'
          : mode === 'CAMPAIGN_PEAK'
          ? 'Dồn trọng tâm W2–W3'
          : 'Dồn đầu tháng W1–W2';
      onNotify(`Đã phân bổ số lượng & ngân sách từ Bước 2 xuống các tuần (${label}).`);
    }
  };

  const handleDistributeFromRef41 = () => {
    if (readOnly || !plan.reference41) return;
    const { weeklyBreakdown, items } = distributeReference41ToWeeks(plan, 'EVEN');
    onChange({ weeklyBreakdown, items });
    if (onNotify) {
      onNotify('Đã tự động phân bổ bảng tuần khớp 100% với số chuẩn Bảng 4.1.');
    }
  };

  const setCell = (wi: number, def: RowDef, sub: 0 | 1, value: number) => {
    const next = clone(rows);
    writeCellWithAutoBudget(next[wi], def, sub, value, plan, true);
    commit(next);
  };

  const copyPrevious = (wi: number) => {
    if (wi <= 0) return;
    const next = clone(rows);
    next[wi] = { ...clone([rows[wi - 1]])[0], week: rows[wi].week };
    commit(next);
  };

  const clearWeek = (wi: number) => {
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
        // Nếu chỉ dán 1 cột SL (không dán kèm cột Ngân sách), tự động nhân đơn giá định mức
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
        disabled={readOnly}
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

  const sectionOrder = Array.from(new Set(ROWS.map(r => r.section)));
  const cmp = (key: string) => comparison.find(c => c.key === key);

  const totalCell = (def: RowDef) => {
    const qty = rows.reduce((s, r) => s + readQty(r, def), 0);
    const budget = rows.reduce((s, r) => s + readBudget(r, def), 0);
    return { qty, budget };
  };

  const subtotal = (section: string) => {
    const defs = ROWS.filter(r => r.section === section);
    const perWeek = rows.map(r => ({
      qty: defs.reduce((s, d) => s + readQty(r, d), 0),
      budget: defs.reduce((s, d) => s + readBudget(r, d), 0),
    }));
    return perWeek;
  };

  const subtotalRefs: Record<string, { qtyKey?: string; budgetKey?: string }> = {
    'Video Cast trả phí': { qtyKey: 'cast', budgetKey: 'affBudget' },
    'Suất FOC (0đ)': { qtyKey: 'foc' },
    'Video self channel': { qtyKey: 'selfQty', budgetKey: 'selfBudget' },
    Livestream: { qtyKey: 'live', budgetKey: 'liveBudget' },
  };

  const diffCell = (key?: string) => {
    const c = key ? cmp(key) : undefined;
    if (!c) return null;
    return (
      <span className={c.matched ? 'text-positive' : c.diff > 0 ? 'text-critical' : 'text-warning'}>
        {c.matched ? 'Khớp' : `${c.diff > 0 ? '+' : ''}${fmt(c.diff)}`}
      </span>
    );
  };

  const weekHeader = (r: PlanWeekRow, wi: number) => (
    <th key={r.week} colSpan={2} className="min-w-[200px] border-l border-line px-2 py-2 text-center align-bottom font-medium text-ink">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs">{r.week}</span>
        {!readOnly && (
          <span className="flex shrink-0 gap-0.5">
            {wi > 0 && (
              <button type="button" title="Sao chép tuần trước" onClick={() => copyPrevious(wi)} className="rounded p-1 text-ink-3 hover:bg-accent-soft hover:text-accent">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" title="Xóa số tuần này" onClick={() => clearWeek(wi)} className="rounded p-1 text-ink-3 hover:bg-critical-soft hover:text-critical">
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

  let flatIndex = -1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {hasRef
          ? comparison.map(c => (
              <div key={c.key} className={`rounded-lg border px-3 py-2 ${c.matched ? 'border-line bg-surface' : 'border-warning bg-warning-soft'}`}>
                <div className="text-2xs text-ink-3">{c.label}</div>
                <div className="text-sm font-semibold tabular-nums text-ink">
                  {fmt(c.planned)}
                  <span className="font-normal text-ink-3"> / {fmt(c.reference)}</span>
                </div>
                <div className="text-2xs">{c.matched ? <span className="text-positive">Khớp bảng 4.1</span> : <span className="text-warning">{c.diff > 0 ? 'Thừa' : 'Thiếu'} {fmt(Math.abs(c.diff))}</span>}</div>
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

      {!readOnly && isEmptyBreakdown && hasStep2Items && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs text-blue-950">
          <span className="font-medium">
            Bảng tuần đang trống — Nạp ngay số lượng &amp; ngân sách đã chia ở Bước 2 xuống 4 tuần:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDistributeFromStep2('EVEN')}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-2xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
            >
              Chia đều 4 tuần
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-3">
            {hasRef
              ? `Số bảng 4.1 nạp ${new Date(plan.reference41!.importedAt).toLocaleDateString('vi-VN')}`
              : 'Gõ Số lượng (SL) sẽ tự tính Ngân sách theo đơn giá định mức.'}
          </span>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('EVEN')}
                className="rounded-md border border-line bg-sunken px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
                title="Chia đều tổng số lượng & ngân sách từ Bước 2 xuống các tuần"
              >
                Chia đều từ Bước 2
              </button>
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('CAMPAIGN_PEAK')}
                className="rounded-md border border-line bg-sunken px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
                title="Chia theo tỷ trọng chiến dịch: W1 (20%) · W2 (35%) · W3 (30%) · W4 (15%)"
              >
                Dồn Mega W2–W3
              </button>
              <button
                type="button"
                onClick={() => handleDistributeFromStep2('FRONT_LOAD')}
                className="rounded-md border border-line bg-sunken px-2 py-1 text-2xs font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent transition cursor-pointer"
                title="Dồn đầu tháng: W1 (35%) · W2 (35%) · W3 (20%) · W4 (10%)"
              >
                Dồn đầu tháng W1–W2
              </button>
              {hasRef && (
                <button
                  type="button"
                  onClick={handleDistributeFromRef41}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-2xs font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                  title="Tự động điền và khớp 100% các tuần theo đúng số chuẩn Bảng 4.1"
                >
                  Khớp theo Bảng 4.1
                </button>
              )}
            </div>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-ink-2">
          <input type="checkbox" checked={grossMode} onChange={e => setGrossMode(e.target.checked)} />
          Nhập ngân sách theo Gross (tự quy ra Net)
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[1200px] border-collapse text-xs">
          <thead className="bg-surface text-ink-3">
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 min-w-[170px] bg-surface px-3 py-2 text-left font-medium text-ink">Chỉ tiêu</th>
              {rows.map((r, wi) => weekHeader(r, wi))}
              <th colSpan={2} className="min-w-[170px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                Tổng phân rã
              </th>
              {hasRef && (
                <th colSpan={2} className="min-w-[170px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                  Bảng 4.1
                </th>
              )}
              {hasRef && (
                <th colSpan={2} className="min-w-[140px] border-l border-line px-2 py-2 text-center font-medium text-ink">
                  Chênh
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sectionOrder.map(section => {
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
                    <td colSpan={2 + rows.length * 2 + (hasRef ? 4 : 0)} className="sticky left-0 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-2">
                      {section}
                    </td>
                  </tr>
                  {defs.map(def => {
                    flatIndex += 1;
                    const r = flatIndex;
                    const t = totalCell(def);
                    return (
                      <tr key={def.id} className="border-t border-line">
                        <td className="sticky left-0 z-10 bg-surface px-3 py-1 text-ink-2">{def.label}</td>
                        {rows.map((row, wi) => {
                          const qty = readQty(row, def);
                          const budget = readBudget(row, def);
                          return (
                            <React.Fragment key={row.week}>
                              <td className="border-l border-line px-1 py-1">
                                {def.hasQty ? (
                                  renderInput(r, def, wi, 0)
                                ) : (
                                  <span className="block" />
                                )}
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
                        <td className="border-l border-line px-2 py-1 text-right tabular-nums text-ink">{def.hasQty ? fmt(t.qty) : ''}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-ink">{def.hasBudget ? fmt(t.budget) : ''}</td>
                        {hasRef && <td colSpan={2} className="border-l border-line" />}
                        {hasRef && <td colSpan={2} className="border-l border-line" />}
                      </tr>
                    );
                  })}
                  {defs.length > 1 || section === 'Livestream' ? (
                    <tr className="border-t border-line bg-surface font-medium">
                      <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-ink">Cộng {section.toLowerCase()}</td>
                      {sub.map((x, wi) => (
                        <React.Fragment key={rows[wi].week}>
                          <td className="border-l border-line px-2 py-1.5 text-right tabular-nums text-ink">{x.qty ? fmt(x.qty) : ''}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-ink">{x.budget ? fmt(x.budget) : ''}</td>
                        </React.Fragment>
                      ))}
                      <td className="border-l border-line px-2 py-1.5 text-right tabular-nums text-ink">{fmt(secQty)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-ink">{section === 'Suất FOC (0đ)' ? '' : fmt(secBudget)}</td>
                      {hasRef && (
                        <>
                          <td className="border-l border-line px-2 py-1.5 text-right tabular-nums text-ink-2">{qtyRef ? fmt(qtyRef.reference) : ''}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-ink-2">{budgetRef ? fmt(budgetRef.reference) : ''}</td>
                          <td className="border-l border-line px-2 py-1.5 text-right tabular-nums">{diffCell(refKeys.qtyKey)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{diffCell(refKeys.budgetKey)}</td>
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

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-xs">
          {errors.length > 0 && (
            <div>
              <div className="mb-1 font-semibold text-critical">Lỗi ({errors.length}): phải sửa trước khi gửi duyệt</div>
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
