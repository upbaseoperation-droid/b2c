'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, EmptyState, Panel, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatNumber, formatVnd, getVietnamDateYmd } from '../../../lib/format';
import {
  computeSelfAirPlanSummary,
  type SelfAirJobInput,
  type SelfAirPlanInput,
  type SelfAirPlanRow,
} from '../../../lib/selfChannelAirPlanReport';

const pct = (n: number) => `${n.toFixed(1)}%`;

/**
 * Content kênh Brand: kế hoạch (chỉ tiêu video theo gian) so với số video đã air.
 * Số liệu đọc từ việc thật trên bảng Self-channel, theo đúng tháng, gian và nhân sự đang lọc ở báo cáo.
 */
export function SelfChannelAirPlanPanel({ month, store, pic }: { month: string; store?: string; pic?: string }) {
  const [plans, setPlans] = useState<SelfAirPlanInput[]>([]);
  const [jobs, setJobs] = useState<SelfAirJobInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/self-channel-board?all=1', { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as { plans?: SelfAirPlanInput[]; jobs?: SelfAirJobInput[]; error?: string };
      if (!res.ok) {
        setError(body.error || 'Không tải được video Content kênh.');
        return;
      }
      setPlans(body.plans || []);
      setJobs(body.jobs || []);
    } catch {
      setError('Lỗi mạng khi tải video Content kênh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const summary = useMemo(
    () => computeSelfAirPlanSummary({ plans, jobs, month, store, pic, today: getVietnamDateYmd() }),
    [plans, jobs, month, store, pic]
  );

  const columns: Column<SelfAirPlanRow>[] = [
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
    { key: 'plan', header: 'Chỉ tiêu video', align: 'right', render: r => formatNumber(r.planQty) },
    { key: 'jobs', header: 'Đã giao việc', align: 'right', render: r => <span className={r.planQty > 0 && r.jobs < r.planQty ? 'text-warning' : undefined}>{formatNumber(r.jobs)}</span> },
    { key: 'aired', header: 'Đã air', align: 'right', render: r => <span className="font-semibold text-ink">{formatNumber(r.aired)}</span> },
    { key: 'rate', header: 'Tiến độ air', align: 'right', render: r => <Status tone={r.airRate >= 100 ? 'positive' : r.airRate >= 50 ? 'neutral' : r.planQty > 0 ? 'warning' : 'neutral'}>{pct(r.airRate)}</Status> },
    { key: 'late', header: 'Air trễ hạn', align: 'right', render: r => (r.airedLate > 0 ? <span className="text-warning">{formatNumber(r.airedLate)}</span> : '0') },
    { key: 'wait', header: 'Chờ air', align: 'right', render: r => formatNumber(r.waitingAir) },
    { key: 'over', header: 'Quá hạn chưa air', align: 'right', render: r => (r.overdueNotAired > 0 ? <span className="text-critical">{formatNumber(r.overdueNotAired)}</span> : '0') },
    { key: 'acc', header: 'Nghiệm thu đạt', align: 'right', render: r => formatNumber(r.accepted) },
    { key: 'gap', header: 'Còn thiếu so chỉ tiêu', align: 'right', render: r => formatNumber(r.gapQty) },
    { key: 'cost', header: 'Cam kết / Đã chi', align: 'right', render: r => `${formatVnd(r.committed)} / ${formatVnd(r.paid)}` },
  ];

  return (
    <Panel
      title="Video kênh Brand: kế hoạch so với đã air"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Status tone="neutral">
            {formatNumber(summary.aired)}/{formatNumber(summary.planQty)} video đã air · {pct(summary.airRate)}
          </Status>
          {summary.overdueNotAired > 0 && <Status tone="critical">{formatNumber(summary.overdueNotAired)} quá hạn chưa air</Status>}
          {summary.airedLate > 0 && <Status tone="warning">{formatNumber(summary.airedLate)} air trễ</Status>}
        </div>
      }
      flush
    >
      {error ? (
        <EmptyState title={error} />
      ) : (
        <DataTable columns={columns} rows={summary.rows} rowKey={r => r.planId} loading={loading} empty="Không có gian nào có chỉ tiêu Content kênh trong bộ lọc này." />
      )}
    </Panel>
  );
}
