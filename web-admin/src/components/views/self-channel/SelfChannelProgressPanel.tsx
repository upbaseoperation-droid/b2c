'use client';

import React, { useMemo, useState } from 'react';
import { Button, DataTable, Field, Panel, Progress, Select, Stat, StatRow, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatNumber, getVietnamDateYmd } from '../../../lib/format';
import {
  computeSelfWorkProgress,
  type SelfPersonProgress,
  type SelfProgressCounts,
  type SelfStoreProgress,
} from '../../../lib/selfChannelWorkProgress';
import { useHubMonths, type HubJob, type HubPlanSummary } from './SelfChannelMonthPanels';

const STAGE_COLS: Array<{ key: keyof SelfProgressCounts['byStage']; header: string }> = [
  { key: 'BRIEF', header: 'Brief' },
  { key: 'SCRIPT', header: 'Kịch bản' },
  { key: 'PRODUCTION', header: 'Quay, QA' },
  { key: 'BRAND_AIR', header: 'Duyệt, đăng' },
  { key: 'ACCEPTANCE', header: 'Nghiệm thu' },
  { key: 'SETTLEMENT', header: 'Chờ thanh toán' },
];

const num = (n: number, warn = false) => (n > 0 ? <span className={warn ? 'text-critical font-medium' : 'text-ink'}>{formatNumber(n)}</span> : <span className="text-ink-3">0</span>);

function Flags({ c }: { c: SelfProgressCounts }) {
  const items: Array<{ tone: 'critical' | 'warning'; text: string }> = [];
  if (c.overdue > 0) items.push({ tone: 'critical', text: `${c.overdue} quá hạn đăng` });
  if (c.brandLate > 0) items.push({ tone: 'critical', text: `${c.brandLate} Brand quá 72h chưa duyệt` });
  if (c.qaWaiting > 0) items.push({ tone: 'warning', text: `${c.qaWaiting} chờ QA` });
  if (c.ctvPending > 0) items.push({ tone: 'warning', text: `${c.ctvPending} CTV chưa nhận` });
  if (c.ctvDeclined > 0) items.push({ tone: 'critical', text: `${c.ctvDeclined} CTV từ chối` });
  if (items.length === 0) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(i => (
        <Status key={i.text} tone={i.tone}>
          {i.text}
        </Status>
      ))}
    </div>
  );
}

function RateBar({ done, base }: { done: number; base: number }) {
  const pct = base === 0 ? 0 : (done / base) * 100;
  return (
    <div className="min-w-[110px]">
      <div className="text-xs tabular-nums text-ink">
        {formatNumber(done)}/{formatNumber(base)} · {pct.toFixed(0)}%
      </div>
      <Progress value={done} max={Math.max(1, base)} />
    </div>
  );
}

/** Tiến độ làm việc Content kênh: mỗi gian, nhân sự, CTV đang ở bước nào so với chỉ tiêu và việc nào đang kẹt. */
export function SelfChannelProgressPanel({
  plans,
  jobs,
  loading,
  onOpenPlan,
}: {
  plans: HubPlanSummary[];
  jobs: HubJob[];
  loading: boolean;
  onOpenPlan: (planId: string) => void;
}) {
  const { months, month, setMonth } = useHubMonths(plans, jobs);
  const [store, setStore] = useState('ALL');
  const [pic, setPic] = useState('ALL');
  const [nowMs] = useState(() => Date.now());

  const monthPlans = useMemo(() => plans.filter(p => p.month === month), [plans, month]);
  const storeOptions = useMemo(() => Array.from(new Set(monthPlans.map(p => p.storeName))).sort((a, b) => a.localeCompare(b, 'vi')), [monthPlans]);
  const picOptions = useMemo(() => {
    const set = new Set<string>();
    monthPlans.forEach(p => p.pic && set.add(p.pic));
    jobs.filter(j => j.month === month).forEach(j => j.contentPic && set.add(j.contentPic));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [monthPlans, jobs, month]);

  const progress = useMemo(
    () =>
      computeSelfWorkProgress({
        plans,
        jobs,
        month,
        store: store === 'ALL' ? undefined : store,
        pic: pic === 'ALL' ? undefined : pic,
        today: getVietnamDateYmd(),
        nowMs,
      }),
    [plans, jobs, month, store, pic, nowMs]
  );
  const t = progress.totals;
  const base = t.planQty > 0 ? t.planQty : t.jobs;
  const flagged = t.overdue + t.brandLate + t.qaWaiting + t.ctvPending + t.ctvDeclined;

  const storeColumns: Column<SelfStoreProgress>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      render: r => (
        <div>
          <div className="font-medium text-ink">{r.storeName}</div>
          <div className="text-2xs text-ink-3">{r.pic || '—'}</div>
        </div>
      ),
    },
    { key: 'plan', header: 'Chỉ tiêu', align: 'right', render: r => formatNumber(r.planQty) },
    { key: 'na', header: 'Chưa giao việc', align: 'right', render: r => num(r.notAssigned) },
    ...STAGE_COLS.map(s => ({ key: s.key, header: s.header, align: 'right' as const, render: (r: SelfStoreProgress) => num(r.byStage[s.key]) })),
    { key: 'aired', header: 'Đã đăng', render: r => <RateBar done={r.aired} base={r.planQty > 0 ? r.planQty : r.jobs} /> },
    { key: 'acc', header: 'Nghiệm thu đạt', render: r => <RateBar done={r.accepted} base={r.planQty > 0 ? r.planQty : r.jobs} /> },
    { key: 'flags', header: 'Cần đôn đốc', render: r => <Flags c={r} /> },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: r => (
        <Button size="sm" variant="ghost" onClick={() => onOpenPlan(r.planId)}>
          Mở
        </Button>
      ),
    },
  ];

  const personColumns = (label: string): Column<SelfPersonProgress>[] => [
    { key: 'name', header: label, render: r => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'stores', header: 'Số gian', align: 'right', render: r => formatNumber(r.stores) },
    { key: 'jobs', header: 'Số việc', align: 'right', render: r => formatNumber(r.jobs) },
    ...STAGE_COLS.map(s => ({ key: s.key, header: s.header, align: 'right' as const, render: (r: SelfPersonProgress) => num(r.byStage[s.key]) })),
    { key: 'aired', header: 'Đã đăng', render: r => <RateBar done={r.aired} base={r.jobs} /> },
    { key: 'acc', header: 'Nghiệm thu đạt', render: r => <RateBar done={r.accepted} base={r.jobs} /> },
    { key: 'flags', header: 'Cần đôn đốc', render: r => <Flags c={r} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Tháng" className="w-36">
          <Select value={month} onChange={e => setMonth(e.target.value)} aria-label="Chọn tháng">
            {months.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gian hàng" className="w-48">
          <Select value={store} onChange={e => setStore(e.target.value)} aria-label="Lọc gian hàng">
            <option value="ALL">Tất cả</option>
            {storeOptions.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nhân sự phụ trách" className="w-48">
          <Select value={pic} onChange={e => setPic(e.target.value)} aria-label="Lọc nhân sự">
            <option value="ALL">Tất cả</option>
            {picOptions.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <StatRow>
        <Stat
          label="Đã giao việc"
          value={`${formatNumber(t.jobs)}/${formatNumber(t.planQty)}`}
          tone={t.notAssigned > 0 ? 'warning' : 'positive'}
          progress={{ value: t.jobs, max: Math.max(1, t.planQty) }}
          note={`${formatNumber(t.notAssigned)} video chưa giao việc`}
        />
        <Stat
          label="Đã đăng"
          value={`${formatNumber(t.aired)}/${formatNumber(base)}`}
          progress={{ value: t.aired, max: Math.max(1, base) }}
          note={`${t.airRate.toFixed(1)}% so với chỉ tiêu`}
        />
        <Stat
          label="Nghiệm thu đạt"
          value={`${formatNumber(t.accepted)}/${formatNumber(base)}`}
          progress={{ value: t.accepted, max: Math.max(1, base) }}
          note={`Đã chi: ${formatNumber(t.paid)} video`}
        />
        <Stat
          label="Cần đôn đốc"
          value={formatNumber(flagged)}
          tone={t.overdue > 0 || t.brandLate > 0 ? 'critical' : flagged > 0 ? 'warning' : 'positive'}
          note={`${formatNumber(t.overdue)} quá hạn đăng · ${formatNumber(t.brandLate)} Brand trễ · ${formatNumber(t.ctvPending)} CTV chưa nhận`}
        />
      </StatRow>

      <Panel title="Tiến độ theo gian: số video đang ở từng bước" flush>
        <DataTable columns={storeColumns} rows={progress.stores} rowKey={r => r.planId} loading={loading} empty="Không có gian nào có chỉ tiêu hoặc video Content kênh trong bộ lọc này." />
      </Panel>
      <Panel title="Tiến độ theo nhân sự phụ trách" flush>
        <DataTable columns={personColumns('Nhân sự')} rows={progress.pics} rowKey={r => r.key} loading={loading} empty="Chưa có video." />
      </Panel>
      <Panel title="Tiến độ theo CTV" flush>
        <DataTable columns={personColumns('CTV')} rows={progress.ctvs} rowKey={r => r.key} loading={loading} empty="Chưa có video giao CTV." />
      </Panel>
    </div>
  );
}
