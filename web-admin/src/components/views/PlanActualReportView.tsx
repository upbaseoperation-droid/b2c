'use client';

import { ClipboardList } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTable, EmptyState, Modal, Panel, Person, Progress, Segmented, Select, Stat, StatRow, Status, STATUS, Toolbar, type Column } from '../ui';
import { formatDate, formatNumber, formatVndShort } from '../../lib/format';
import type {
  BatchActualRow,
  PlanActualStoreReport,
  ProgressState,
  TierActualRow,
  WeekActualRow,
} from '../../lib/planActualReport';

interface ReportResponse {
  month: string;
  months: string[];
  today: string;
  reports: PlanActualStoreReport[];
}

const STATE_STATUS: Record<ProgressState, { label: string; tone: 'positive' | 'info' | 'critical' | 'neutral' }> = {
  done: STATUS.done,
  running: STATUS.running,
  overdue: STATUS.overdue,
  upcoming: { label: 'Chưa tới', tone: 'neutral' },
  none: { label: 'Không có chỉ tiêu', tone: 'neutral' },
};

const StateTag = ({ state }: { state: ProgressState }) => <Status tone={STATE_STATUS[state].tone}>{STATE_STATUS[state].label}</Status>;

const sub = (text: React.ReactNode) => <div className="text-2xs text-ink-3">{text}</div>;

/** Số thực tế / chỉ tiêu kèm thanh tiến độ (Progress chỉ vẽ thanh, không hiện chữ). */
const Bar = ({ value, max, text, invert }: { value: number; max: number; text: string; invert?: boolean }) => (
  <div className="space-y-1">
    <div className="tabular-nums">{text}</div>
    <Progress value={value} max={Math.max(1, max)} target={1} invert={invert} label={text} />
  </div>
);
const monthLabel = (m: string) => {
  const [y, mm] = m.split('/');
  return y && mm ? `Tháng ${mm}/${y}` : m;
};

type DetailSection = 'tiers' | 'batches' | 'weeks';

export const PlanActualReportView: React.FC<{
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  allowedStoreNames?: string[];
}> = ({ onNotify, allowedStoreNames }) => {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<PlanActualStoreReport | null>(null);
  const [section, setSection] = useState<DetailSection>('tiers');

  // Chỉ nhận kết quả của lần tải mới nhất: đổi tháng nhanh thì phản hồi cũ về sau không ghi đè
  const requestSeq = useRef(0);
  // Chỉ cập nhật state sau khi máy chủ trả lời, để dùng được cả trong effect lần đầu
  const fetchReport = useCallback(
    async (m: string) => {
      const seq = ++requestSeq.current;
      try {
        const res = await fetch(`/api/plan-actual-report${m ? `?month=${encodeURIComponent(m)}` : ''}`, { cache: 'no-store' });
        const body = (await res.json().catch(() => null)) as (ReportResponse & { error?: string }) | null;
        if (seq !== requestSeq.current) return;
        if (!res.ok || !body) throw new Error(body?.error || 'Không tải được báo cáo.');
        setData(body);
        setMonth(body.month);
        setError('');
      } catch (e) {
        if (seq !== requestSeq.current) return;
        const msg = e instanceof Error ? e.message : 'Không tải được báo cáo.';
        // Không giữ số của tháng trước dưới nhãn tháng mới
        setData(prev => (prev ? { ...prev, reports: [] } : prev));
        setError(msg);
        onNotify?.(msg, 'error');
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    // Lần tải đầu chỉ đổi state sau khi máy chủ trả lời, không đổi đồng bộ.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReport('');
  }, [fetchReport]);

  const load = (m: string) => {
    setLoading(true);
    setMonth(m);
    void fetchReport(m);
  };

  const reports = useMemo(() => {
    const list = data?.reports ?? [];
    if (!allowedStoreNames || allowedStoreNames.length === 0) return list;
    return list.filter(r => allowedStoreNames.includes(r.storeName));
  }, [data, allowedStoreNames]);
  const totals = useMemo(() => {
    const t = { planQty: 0, aired: 0, planBudget: 0, committed: 0, paid: 0, dueQty: 0, dueAired: 0, weeklyStores: 0, overdue: 0 };
    for (const r of reports) {
      t.planQty += r.total.planQty;
      t.aired += r.total.aired;
      t.planBudget += r.budget.plan;
      t.committed += r.budget.committed;
      t.paid += r.budget.paid;
      if (r.hasWeeklyPlan) {
        t.weeklyStores += 1;
        t.dueQty += r.dueToDate.planQty;
        t.dueAired += r.dueToDate.aired;
      }
      if (r.state === 'overdue') t.overdue += 1;
    }
    return t;
  }, [reports]);

  const storeColumns: Column<PlanActualStoreReport>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      render: r => (
        <div>
          <div className="font-medium text-ink">{r.storeName}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-ink-3">
            <span>{r.brandName}</span>
            {r.pic && (
              <>
                <span>·</span>
                <Person name={r.pic} size={16} />
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Kế hoạch',
      align: 'right',
      render: r => (
        <div>
          <div>{formatNumber(r.total.planQty)} video</div>
          {sub(formatVndShort(r.budget.plan))}
        </div>
      ),
    },
    {
      key: 'listed',
      header: 'Đã list',
      align: 'right',
      render: r => (
        <div>
          {formatNumber(r.total.listed)}
          {sub(`Chốt ${formatNumber(r.total.confirmed)}${r.total.listed > 0 ? ` (${Math.round((r.total.confirmed / r.total.listed) * 100)}%)` : ''}`)}
        </div>
      ),
    },
    {
      key: 'aired',
      header: 'Đã air',
      align: 'right',
      render: r => (
        <div>
          {formatNumber(r.total.aired)}
          {sub(`Nghiệm thu ${formatNumber(r.total.accepted)}${r.total.aired > 0 ? ` (${Math.round((r.total.accepted / r.total.aired) * 100)}%)` : ''}`)}
        </div>
      ),
    },
    {
      key: 'carry',
      header: 'Chuyển tháng',
      align: 'right',
      render: r =>
        !r.carryOver || (r.carryOver.movedOut === 0 && r.carryOver.carriedIn === 0) ? (
          <span className="text-ink-3">—</span>
        ) : (
          <div>
            {r.carryOver.movedOut > 0 && <div>{formatNumber(r.carryOver.movedOut)} chuyển tháng sau</div>}
            {r.carryOver.carriedIn > 0 && sub(`${formatNumber(r.carryOver.carriedIn)} từ tháng trước · ${formatVndShort(r.carryOver.carriedInFee)}`)}
          </div>
        ),
    },
    {
      key: 'pace',
      header: 'Air đến tuần trước',
      width: 150,
      render: r =>
        !r.hasWeeklyPlan ? (
          <span className="text-ink-3">Chưa phân rã tuần</span>
        ) : r.dueToDate.lastEndedWeekEnd ? (
          <Bar value={r.dueToDate.aired} max={r.dueToDate.planQty} text={`${formatNumber(r.dueToDate.aired)} / ${formatNumber(r.dueToDate.planQty)}`} />
        ) : (
          <span className="text-ink-3">Chưa hết tuần đầu</span>
        ),
    },
    {
      key: 'budget',
      header: 'Cam kết / Kế hoạch',
      width: 160,
      render: r =>
        r.budget.isUnbudgeted ? (
          <div className="text-critical">{formatVndShort(r.budget.committed)}{sub('Kế hoạch 0đ')}</div>
        ) : (
          <div>
            <Bar value={r.budget.committed} max={r.budget.plan} invert text={`${formatVndShort(r.budget.committed)} / ${formatVndShort(r.budget.plan)}`} />
            {sub(`Đã chi ${formatVndShort(r.budget.paid)}`)}
          </div>
        ),
    },
    { key: 'state', header: 'Trạng thái', render: r => <StateTag state={r.state} /> },
  ];

  const tierColumns: Column<TierActualRow>[] = [
    { key: 'kl', header: 'Bậc', render: t => t.label },
    { key: 'plan', header: 'Kế hoạch', align: 'right', render: t => <div>{formatNumber(t.planQty)}{sub(formatVndShort(t.planBudget))}</div> },
    { key: 'listed', header: 'Đã list', align: 'right', render: t => <div>{formatNumber(t.listed)}{sub(`Chốt ${formatNumber(t.confirmed)}`)}</div> },
    { key: 'jobs', header: 'Job', align: 'right', render: t => formatNumber(t.jobs) },
    { key: 'aired', header: 'Đã air', align: 'right', render: t => formatNumber(t.aired) },
    { key: 'accepted', header: 'Nghiệm thu', align: 'right', render: t => formatNumber(t.accepted) },
    {
      key: 'committed',
      header: 'Cam kết',
      align: 'right',
      render: t => <span className={t.planBudget > 0 && t.committed > t.planBudget ? 'text-critical' : undefined}>{formatVndShort(t.committed)}</span>,
    },
    { key: 'paid', header: 'Đã chi', align: 'right', render: t => formatVndShort(t.paid) },
  ];

  const batchColumns: Column<BatchActualRow>[] = [
    { key: 'batch', header: 'Đợt', render: b => <div>{b.label}{sub(b.dueDate ? `Hạn ${formatDate(b.dueDate)}` : 'Chưa có hạn')}</div> },
    { key: 'target', header: 'Chỉ tiêu', align: 'right', render: b => <div>{formatNumber(b.targetQty)}{sub(formatVndShort(b.targetBudget))}</div> },
    { key: 'listed', header: 'Đã list', width: 150, render: b => <Bar value={b.listed} max={b.targetQty} text={`${formatNumber(b.listed)} / ${formatNumber(b.targetQty)}`} /> },
    { key: 'confirmed', header: 'Đã chốt', align: 'right', render: b => formatNumber(b.confirmed) },
    { key: 'committed', header: 'Giá đang list', align: 'right', render: b => formatVndShort(b.committed) },
    { key: 'state', header: 'Trạng thái', render: b => <StateTag state={b.state} /> },
  ];

  const weekColumns: Column<WeekActualRow>[] = [
    { key: 'week', header: 'Tuần', render: w => <div>{w.week.split(' ')[0]}{sub(`${formatDate(w.start)} – ${formatDate(w.end)}`)}</div> },
    { key: 'plan', header: 'Kế hoạch', align: 'right', render: w => <div>{formatNumber(w.planQty)}{sub(formatVndShort(w.planBudget))}</div> },
    { key: 'scheduled', header: 'Hạn air trong tuần', align: 'right', render: w => formatNumber(w.scheduled) },
    { key: 'aired', header: 'Đã air', width: 150, render: w => <Bar value={w.aired} max={w.planQty} text={`${formatNumber(w.aired)} / ${formatNumber(w.planQty)}`} /> },
    { key: 'state', header: 'Trạng thái', render: w => <StateTag state={w.state} /> },
  ];

  const months = data?.months ?? [];

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select
          aria-label="Chọn tháng"
          value={month}
          disabled={loading || months.length === 0}
          onChange={e => void load(e.target.value)}
          className="w-44"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      </Toolbar>

      <StatRow size="sm">
        <Stat label="Video đã air" value={`${formatNumber(totals.aired)} / ${formatNumber(totals.planQty)}`} progress={{ value: totals.aired, max: Math.max(1, totals.planQty) }} />
        <Stat
          label="Air đến tuần trước"
          value={totals.weeklyStores > 0 ? `${formatNumber(totals.dueAired)} / ${formatNumber(totals.dueQty)}` : '—'}
          note={
            totals.weeklyStores === 0
              ? 'Chưa gian nào phân rã kế hoạch theo tuần'
              : totals.dueQty > totals.dueAired
                ? `Thiếu ${formatNumber(totals.dueQty - totals.dueAired)} video · ${formatNumber(totals.weeklyStores)} gian có lịch tuần`
                : `${formatNumber(totals.weeklyStores)} gian có lịch tuần`
          }
          tone={totals.dueQty > totals.dueAired ? 'warning' : undefined}
        />
        <Stat
          label="Cam kết / Kế hoạch Net"
          value={`${formatVndShort(totals.committed)} / ${formatVndShort(totals.planBudget)}`}
          note={
            totals.committed > totals.planBudget
              ? `Vượt ${formatVndShort(totals.committed - totals.planBudget)} · Đã chi ${formatVndShort(totals.paid)}`
              : `Đã chi ${formatVndShort(totals.paid)}`
          }
          tone={totals.committed > totals.planBudget ? 'critical' : undefined}
        />
        <Stat
          label="Gian hàng quá hạn"
          value={formatNumber(totals.overdue)}
          note={`Trên ${formatNumber(reports.length)} gian có kế hoạch`}
          tone={totals.overdue > 0 ? 'critical' : undefined}
        />
      </StatRow>

      <Panel
        flush
        title={
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-critical" strokeWidth={1.75} />
            Tiến độ từng gian hàng
          </span>
        }
      >
        <DataTable
          columns={storeColumns}
          rows={reports}
          rowKey={r => r.planId}
          loading={loading}
          onRowClick={r => {
            setDetail(r);
            setSection('tiers');
          }}
          empty={
            <EmptyState
              title={error ? 'Chưa tải được báo cáo' : 'Chưa có kế hoạch tháng trong phạm vi của bạn'}
              description={error || 'Lập kế hoạch tháng cho gian hàng để xem tiến độ so với thực tế.'}
            />
          }
        />
        {data?.today && (
          <p className="px-3.5 sm:px-4 py-2.5 border-t border-line text-2xs text-ink-3">
            Tính đến {formatDate(data.today)} · nguồn: kế hoạch tháng 4.1.1 và video đã air.
          </p>
        )}
      </Panel>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `${detail.storeName} · ${monthLabel(detail.month)}` : ''} size="xl">
        {detail && (
          <div className="space-y-4">
            <Segmented<DetailSection>
              items={[
                { key: 'tiers', label: 'Theo KL' },
                { key: 'batches', label: 'Theo đợt' },
                { key: 'weeks', label: 'Theo tuần' },
              ]}
              value={section}
              onChange={setSection}
            />
            {section === 'tiers' && (
              <DataTable
                columns={tierColumns}
                rows={[...detail.tiers, detail.total]}
                rowKey={t => (t === detail.total ? 'total' : t.key)}
                rowClassName={t => (t === detail.total ? 'font-semibold' : undefined)}
                empty={<EmptyState title="Kế hoạch chưa có chỉ tiêu theo KL" />}
              />
            )}
            {section === 'batches' && <DataTable columns={batchColumns} rows={detail.batches} rowKey={b => b.key} />}
            {section === 'weeks' && (
              <DataTable
                columns={weekColumns}
                rows={detail.weeks}
                rowKey={w => w.week}
                empty={<EmptyState title="Kế hoạch chưa phân rã theo tuần" />}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
