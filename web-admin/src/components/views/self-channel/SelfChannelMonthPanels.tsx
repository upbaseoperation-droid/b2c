'use client';

import React, { useMemo, useState } from 'react';
import { Button, DataTable, Field, Panel, Select, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatNumber, formatVnd } from '../../../lib/format';
import { BRAND_SCRIPT_SLA_HOURS, brandScriptWaitingHours, type SelfChannelJob } from '../../../lib/selfChannelBoardRules';

export type HubJob = SelfChannelJob & { planId: string; storeName: string; brandName: string; month: string };

export interface HubPlanSummary {
  planId: string;
  storeName: string;
  brandName: string;
  month: string;
  pic: string;
  targetQty: number;
  targetBudgetNet: number;
}

const isActive = (j: SelfChannelJob) => j.lifecycleStatus !== 'CANCELLED';
const isAired = (j: SelfChannelJob) => Boolean(j.airedAt || j.airLink?.trim());

function MonthSelect({ months, value, onChange }: { months: string[]; value: string; onChange: (m: string) => void }) {
  return (
    <Field label="Tháng" className="w-40">
      <Select value={value} onChange={e => onChange(e.target.value)} aria-label="Chọn tháng">
        {months.map(m => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function useHubMonths(plans: HubPlanSummary[], jobs: HubJob[]) {
  const months = useMemo(
    () => Array.from(new Set([...plans.map(p => p.month), ...jobs.map(j => j.month)].filter(Boolean))).sort().reverse(),
    [plans, jobs]
  );
  const [month, setMonth] = useState('');
  return { months, month: month || months[0] || '', setMonth };
}

interface StoreRow extends HubPlanSummary {
  jobs: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
}

interface CtvRow {
  key: string;
  name: string;
  stores: number;
  jobs: number;
  accepted: number;
  acceptedUnpaid: number;
  paid: number;
}

/** Tổng quan tháng: chỉ tiêu 4.1.1 so với thực tế theo gian, và khối lượng / tiền theo CTV xuyên các gian. */
export function SelfChannelOverviewPanel({
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
  const monthJobs = useMemo(() => jobs.filter(j => j.month === month && isActive(j)), [jobs, month]);

  const storeRows = useMemo<StoreRow[]>(
    () =>
      plans
        .filter(p => p.month === month)
        .map(p => {
          const pj = monthJobs.filter(j => j.planId === p.planId);
          return {
            ...p,
            jobs: pj.length,
            aired: pj.filter(isAired).length,
            accepted: pj.filter(j => j.acceptanceStatus === 'PASSED').length,
            committed: pj.reduce((s, j) => s + (j.feeGross || 0), 0),
            paid: pj.filter(j => j.paymentStatus === 'PAID').reduce((s, j) => s + (j.feeGross || 0), 0),
          };
        })
        .sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi')),
    [plans, month, monthJobs]
  );

  const ctvRows = useMemo<CtvRow[]>(() => {
    const map = new Map<string, HubJob[]>();
    for (const j of monthJobs) {
      if (j.productionMode !== 'CTV_OUTSOURCE') continue;
      const k = j.contributorId || j.contributorName.trim() || '(Chưa gán CTV)';
      map.set(k, [...(map.get(k) || []), j]);
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({
        key,
        name: list.find(j => j.contributorName.trim())?.contributorName || key,
        stores: new Set(list.map(j => j.planId)).size,
        jobs: list.length,
        accepted: list.filter(j => j.acceptanceStatus === 'PASSED').length,
        acceptedUnpaid: list
          .filter(j => j.acceptanceStatus === 'PASSED' && j.paymentStatus === 'NONE')
          .reduce((s, j) => s + (j.feeGross || 0), 0),
        paid: list.filter(j => j.paymentStatus === 'PAID').reduce((s, j) => s + (j.feeGross || 0), 0),
      }))
      .sort((a, b) => b.jobs - a.jobs);
  }, [monthJobs]);

  const total = storeRows.reduce(
    (s, r) => ({
      targetQty: s.targetQty + r.targetQty,
      jobs: s.jobs + r.jobs,
      aired: s.aired + r.aired,
      accepted: s.accepted + r.accepted,
      committed: s.committed + r.committed,
      budget: s.budget + r.targetBudgetNet,
    }),
    { targetQty: 0, jobs: 0, aired: 0, accepted: 0, committed: 0, budget: 0 }
  );

  const storeColumns: Column<StoreRow>[] = [
    { key: 'store', header: 'Gian hàng', render: r => <span className="font-medium text-ink">{r.storeName}</span> },
    { key: 'pic', header: 'PIC', render: r => r.pic || '—' },
    { key: 'target', header: 'Chỉ tiêu', align: 'right', render: r => formatNumber(r.targetQty) },
    {
      key: 'jobs',
      header: 'Đã giao việc',
      align: 'right',
      render: r => (
        <span className={r.targetQty > 0 && r.jobs < r.targetQty ? 'text-warning' : undefined}>{formatNumber(r.jobs)}</span>
      ),
    },
    { key: 'aired', header: 'Đã đăng', align: 'right', render: r => formatNumber(r.aired) },
    { key: 'accepted', header: 'Nghiệm thu đạt', align: 'right', render: r => formatNumber(r.accepted) },
    {
      key: 'committed',
      header: 'Cam kết / Ngân sách',
      align: 'right',
      render: r => (
        <span className={r.targetBudgetNet > 0 && r.committed > r.targetBudgetNet ? 'text-critical' : undefined}>
          {formatVnd(r.committed)} / {r.targetBudgetNet > 0 ? formatVnd(r.targetBudgetNet) : '—'}
        </span>
      ),
    },
    { key: 'paid', header: 'Đã chi', align: 'right', render: r => formatVnd(r.paid) },
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

  const ctvColumns: Column<CtvRow>[] = [
    { key: 'name', header: 'CTV', render: r => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'stores', header: 'Số gian', align: 'right', render: r => formatNumber(r.stores) },
    { key: 'jobs', header: 'Việc', align: 'right', render: r => formatNumber(r.jobs) },
    { key: 'accepted', header: 'Nghiệm thu đạt', align: 'right', render: r => formatNumber(r.accepted) },
    { key: 'unpaid', header: 'Đạt, chưa lập ĐNTT', align: 'right', render: r => formatVnd(r.acceptedUnpaid) },
    { key: 'paid', header: 'Đã chi', align: 'right', render: r => formatVnd(r.paid) },
  ];

  return (
    <div className="space-y-4">
      <Panel
        title="Chỉ tiêu và thực tế theo gian"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Status tone="neutral">
              {formatNumber(total.jobs)}/{formatNumber(total.targetQty)} video giao · {formatNumber(total.aired)} đăng · {formatNumber(total.accepted)} đạt · {formatVnd(total.committed)}/{formatVnd(total.budget)}
            </Status>
            {months.length > 0 ? <MonthSelect months={months} value={month} onChange={setMonth} /> : null}
          </div>
        }
        flush
      >
        <DataTable
          columns={storeColumns}
          rows={storeRows}
          rowKey={r => r.planId}
          loading={loading}
          empty="Chưa có gian nào có chỉ tiêu Self-channel trong tháng này."
        />
      </Panel>
      <Panel title="Theo CTV (gộp mọi gian)" flush>
        <DataTable columns={ctvColumns} rows={ctvRows} rowKey={r => r.key} loading={loading} empty="Chưa có việc giao CTV trong tháng này." />
      </Panel>
    </div>
  );
}

type QueueKind = 'SCRIPT' | 'BRAND_SCRIPT' | 'BRAND_SCRIPT_LATE' | 'QA' | 'ACCEPTANCE' | 'OVERDUE';

const QUEUE_LABEL: Record<QueueKind, { label: string; tone: 'info' | 'warning' | 'critical' }> = {
  SCRIPT: { label: 'Duyệt kịch bản', tone: 'info' },
  BRAND_SCRIPT: { label: 'Chờ Brand duyệt kịch bản', tone: 'warning' },
  BRAND_SCRIPT_LATE: { label: `Brand quá ${BRAND_SCRIPT_SLA_HOURS}h chưa duyệt kịch bản — raise`, tone: 'critical' },
  QA: { label: 'QA video nháp', tone: 'info' },
  ACCEPTANCE: { label: 'Nghiệm thu', tone: 'warning' },
  OVERDUE: { label: 'Quá hạn đăng', tone: 'critical' },
};

interface QueueRow {
  key: string;
  kind: QueueKind;
  job: HubJob;
}

/** Việc đang chờ người duyệt, gom mọi gian người dùng được xem: kịch bản, video nháp, nghiệm thu, quá hạn đăng. */
export function SelfChannelQueuePanel({
  jobs,
  loading,
  today,
  onOpenPlan,
}: {
  jobs: HubJob[];
  loading: boolean;
  today: string;
  onOpenPlan: (planId: string, jobCode?: string) => void;
}) {
  const [nowMs] = useState(() => Date.now());
  const [kind, setKind] = useState<QueueKind | 'ALL'>('ALL');
  const rows = useMemo<QueueRow[]>(() => {
    const out: QueueRow[] = [];
    for (const j of jobs) {
      if (!isActive(j)) continue;
      if (j.scriptStatus === 'SUBMITTED') out.push({ key: `${j.planId}-${j.id}-S`, kind: 'SCRIPT', job: j });
      // Brand im lặng: chỉ nhắc raise, không tự duyệt
      const brandWait = brandScriptWaitingHours(j, nowMs);
      if (brandWait !== null) {
        out.push({ key: `${j.planId}-${j.id}-B`, kind: brandWait > BRAND_SCRIPT_SLA_HOURS ? 'BRAND_SCRIPT_LATE' : 'BRAND_SCRIPT', job: j });
      }
      if (j.videoQaStatus === 'DRAFT_SUBMITTED') out.push({ key: `${j.planId}-${j.id}-Q`, kind: 'QA', job: j });
      if (isAired(j) && j.acceptanceStatus === 'PENDING') out.push({ key: `${j.planId}-${j.id}-A`, kind: 'ACCEPTANCE', job: j });
      if (!isAired(j) && j.deadline && j.deadline < today) out.push({ key: `${j.planId}-${j.id}-O`, kind: 'OVERDUE', job: j });
    }
    return out.sort((a, b) => (a.job.deadline || '9').localeCompare(b.job.deadline || '9'));
  }, [jobs, today, nowMs]);
  const visible = kind === 'ALL' ? rows : rows.filter(r => r.kind === kind);

  const columns: Column<QueueRow>[] = [
    { key: 'kind', header: 'Việc cần làm', render: r => <Status tone={QUEUE_LABEL[r.kind].tone}>{QUEUE_LABEL[r.kind].label}</Status> },
    { key: 'store', header: 'Gian hàng', render: r => r.job.storeName },
    { key: 'code', header: 'Mã việc', render: r => <span className="tabular-nums">{r.job.code}</span> },
    { key: 'product', header: 'Sản phẩm', render: r => r.job.productName || '—' },
    { key: 'ctv', header: 'CTV / Inhouse', render: r => r.job.contributorName || (r.job.productionMode === 'INHOUSE' ? 'Inhouse' : '—') },
    { key: 'deadline', header: 'Hạn đăng', render: r => r.job.deadline || '—' },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: r => (
        <Button size="sm" variant="ghost" onClick={() => onOpenPlan(r.job.planId, r.job.code)}>
          Mở
        </Button>
      ),
    },
  ];

  return (
    <Panel
      title="Hàng chờ duyệt"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Status tone="neutral">{formatNumber(rows.length)} việc chờ xử lý</Status>
          <Field label="Loại việc" className="w-44">
            <Select value={kind} onChange={e => setKind(e.target.value as QueueKind | 'ALL')} aria-label="Lọc loại việc">
              <option value="ALL">Tất cả</option>
              {(Object.keys(QUEUE_LABEL) as QueueKind[]).map(k => (
                <option key={k} value={k}>
                  {QUEUE_LABEL[k].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      }
      flush
    >
      <DataTable columns={columns} rows={visible} rowKey={r => r.key} loading={loading} empty="Không có việc nào đang chờ." />
    </Panel>
  );
}
