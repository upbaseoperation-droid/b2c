'use client';

import React, { useMemo, useState } from 'react';
import { Medal, ScatterChart, Users } from 'lucide-react';
import {
  BarList,
  DataTable,
  Pagination,
  Panel,
  Person,
  Progress,
  ScatterPlot,
  SearchInput,
  Segmented,
  Stat,
  StatRow,
  Status,
  autoScale,
} from '../ui';
import type { BarItem, Column, ScatterPoint } from '../ui';
import { formatCountShort, formatNumber, formatPercent, formatVndShort } from '../../lib/format';
import { B2cStaffAnalyticsRecord } from '../../lib/b2cAnalyticsDataset';

type StaffQuadrant = 'STAR' | 'HIGH_VOL_OPT_COST' | 'HIGH_EFF_NEED_VOL' | 'NEED_COACHING';

export type DashboardStaffRow = B2cStaffAnalyticsRecord & {
  airVsBookPct: number;
  pendingAirVideos: number;
  avgCostPerAiredVideo: number;
  attributedGmv: number;
  effectiveRoas: number;
  kpiScore: number;
  kpiGrade: 'S' | 'A' | 'B' | 'C';
  staffQuadrant: StaffQuadrant;
};

type RoleFilter = 'ALL' | 'SPECIALIST' | 'MANAGEMENT';
type ScatterY = 'COST' | 'GMV';
type RankBy = 'AIRED' | 'GMV' | 'SLA';
type SortBy = 'AIRED' | 'GMV' | 'COST' | 'SLA' | 'LATE';

const QUADRANTS: { key: StaffQuadrant; label: string; color: string }[] = [
  { key: 'STAR', label: 'Đạt chỉ tiêu', color: 'var(--color-positive)' },
  { key: 'HIGH_VOL_OPT_COST', label: 'Kiểm soát chi phí', color: 'var(--color-warning)' },
  { key: 'HIGH_EFF_NEED_VOL', label: 'Đẩy tiến độ đăng', color: 'var(--color-accent)' },
  { key: 'NEED_COACHING', label: 'Cần hỗ trợ', color: 'var(--color-ink-3)' },
];
const quadrantOf = (k: string) => QUADRANTS.find((q) => q.key === k) ?? QUADRANTS[3];

const roleSub = (st: DashboardStaffRow) =>
  st.roleLevel === 'HEAD' ? 'Giám đốc' : st.roleLevel === 'LEADER' ? 'Trưởng nhóm' : st.teamName || undefined;

function StaffStatus({ st }: { st: DashboardStaffRow }) {
  if (st.unbudgetedStoresCount > 0) return <Status tone="critical">{`${st.unbudgetedStoresCount} gian chi ngoài KH`}</Status>;
  if (st.lateSlaVideosCount > 0) return <Status tone="critical">{`Trễ ${st.lateSlaVideosCount} đơn`}</Status>;
  if (st.overbudgetStoresCount > 0) return <Status tone="warning">{`${st.overbudgetStoresCount} gian vượt Net`}</Status>;
  if (st.pendingAirVideos > 5) return <Status tone="warning">{`Chờ đăng ${st.pendingAirVideos} đơn`}</Status>;
  if (st.staffQuadrant === 'STAR') return <Status tone="positive">Đạt chỉ tiêu</Status>;
  if (st.staffQuadrant === 'HIGH_EFF_NEED_VOL') return <Status tone="info">Đẩy tiến độ đăng</Status>;
  if (st.staffQuadrant === 'HIGH_VOL_OPT_COST') return <Status tone="warning">Kiểm soát chi phí</Status>;
  return <Status tone="neutral">Cần hỗ trợ</Status>;
}

const panelTitle = (Icon: typeof Users, text: string) => (
  <span className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-critical" strokeWidth={1.75} />
    {text}
  </span>
);

export function DashboardStaffReport({
  staffList,
  onInspectStaff,
}: {
  staffList: DashboardStaffRow[];
  onInspectStaff: (st: DashboardStaffRow) => void;
}) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [scatterY, setScatterY] = useState<ScatterY>('COST');
  const [rankBy, setRankBy] = useState<RankBy>('AIRED');
  const [sortBy, setSortBy] = useState<SortBy>('AIRED');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staffList.filter((st) => {
      if (role === 'SPECIALIST' && st.roleLevel !== 'SPECIALIST') return false;
      if (role === 'MANAGEMENT' && st.roleLevel === 'SPECIALIST') return false;
      if (!q) return true;
      return (
        st.name.toLowerCase().includes(q) ||
        st.storesList.some((s) => s.toLowerCase().includes(q)) ||
        st.brandsList.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [staffList, query, role]);

  const summary = useMemo(() => {
    const specialists = filtered.filter((s) => s.roleLevel === 'SPECIALIST');
    const base = specialists.length > 0 ? specialists : filtered;
    const budget = base.reduce((s, x) => s + x.orderBudgetNet, 0);
    const spent = base.reduce((s, x) => s + x.actualSpentNet, 0);
    const booked = base.reduce((s, x) => s + x.actualBookedVideos, 0);
    const aired = base.reduce((s, x) => s + x.actualAiredVideos, 0);
    const late = base.reduce((s, x) => s + x.lateSlaVideosCount, 0);
    const avgSla = filtered.length > 0 ? filtered.reduce((s, x) => s + x.slaRate, 0) / filtered.length : null;
    return {
      count: filtered.length,
      budgetWarn: filtered.filter((s) => s.unbudgetedStoresCount > 0 || s.overbudgetStoresCount > 0).length,
      budget,
      spent,
      booked,
      aired,
      late,
      avgSla,
      costPerAir: aired > 0 && spent > 0 ? spent / aired : null,
    };
  }, [filtered]);

  const scatter = useMemo(() => {
    const pts: ScatterPoint[] = filtered
      .filter((st) => st.roleLevel === 'SPECIALIST')
      .map((st) => ({
        id: st.name,
        x: st.actualAiredVideos,
        y: scatterY === 'COST' ? st.avgCostPerAiredVideo : st.attributedGmv,
        label: st.name,
        group: st.staffQuadrant,
      }));
    const counts = QUADRANTS.map((q) => ({ ...q, n: pts.filter((p) => p.group === q.key).length })).filter((q) => q.n > 0);
    return {
      points: pts,
      counts,
      xScale: autoScale(pts.map((p) => p.x)),
      yScale: autoScale(pts.map((p) => p.y)),
    };
  }, [filtered, scatterY]);

  const byName = useMemo(() => new Map(staffList.map((s) => [s.name, s])), [staffList]);

  const ranking = useMemo<BarItem[]>(() => {
    const metric = (st: DashboardStaffRow) =>
      rankBy === 'AIRED' ? st.actualAiredVideos : rankBy === 'GMV' ? st.attributedGmv : st.slaRate;
    const show = (st: DashboardStaffRow) =>
      rankBy === 'AIRED'
        ? formatNumber(st.actualAiredVideos)
        : rankBy === 'GMV'
        ? formatVndShort(st.attributedGmv)
        : formatPercent(st.slaRate / 100, 0);
    return filtered
      .filter((st) => st.roleLevel === 'SPECIALIST' || role === 'MANAGEMENT')
      .slice()
      .sort((a, b) => metric(b) - metric(a))
      .slice(0, 10)
      .map((st) => ({
        key: st.name,
        label: st.name,
        value: metric(st),
        display: show(st),
        onClick: () => onInspectStaff(st),
      }));
  }, [filtered, rankBy, role, onInspectStaff]);

  const sorted = useMemo(() => {
    const cost = (s: DashboardStaffRow) => (s.avgCostPerAiredVideo > 0 ? s.avgCostPerAiredVideo : Number.MAX_SAFE_INTEGER);
    return [...filtered].sort((a, b) => {
      if (sortBy === 'AIRED') return b.actualAiredVideos - a.actualAiredVideos || b.actualSpentNet - a.actualSpentNet;
      if (sortBy === 'GMV') return b.attributedGmv - a.attributedGmv || b.actualAiredVideos - a.actualAiredVideos;
      if (sortBy === 'COST') return cost(a) - cost(b);
      if (sortBy === 'SLA') return b.slaRate - a.slaRate || b.actualAiredVideos - a.actualAiredVideos;
      if (sortBy === 'LATE') return b.lateSlaVideosCount - a.lateSlaVideosCount || b.pendingAirVideos - a.pendingAirVideos;
      return b.actualAiredVideos - a.actualAiredVideos;
    });
  }, [filtered, sortBy]);

  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<DashboardStaffRow>[] = [
    {
      key: 'name',
      header: 'Nhân sự',
      width: 200,
      render: (st) => <Person name={st.name} sub={roleSub(st)} />,
    },
    {
      key: 'stores',
      header: 'Gian hàng',
      align: 'right',
      render: (st) => (st.storesCount > 0 ? formatNumber(st.storesCount) : '—'),
    },
    {
      key: 'spend',
      header: 'Đã chi / Trần Net',
      width: 170,
      render: (st) =>
        st.orderBudgetNet > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between gap-2 tabular-nums">
              <span className="text-ink">{formatVndShort(st.actualSpentNet)}</span>
              <span className="text-ink-3">{formatPercent(st.actualSpentNet / st.orderBudgetNet, 0)}</span>
            </div>
            <Progress value={st.actualSpentNet} max={st.orderBudgetNet} invert label={`Đã chi của ${st.name}`} />
          </div>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      key: 'videos',
      header: 'Video đăng / Book',
      align: 'right',
      render: (st) => <span className="tabular-nums">{`${formatNumber(st.actualAiredVideos)} / ${formatNumber(st.actualBookedVideos)}`}</span>,
    },
    {
      key: 'unitCost',
      header: 'Chi phí / Video',
      align: 'right',
      render: (st) => <span className="tabular-nums">{st.avgCostPerAiredVideo > 0 ? formatVndShort(st.avgCostPerAiredVideo) : '—'}</span>,
    },
    {
      key: 'sla',
      header: 'Đúng hạn SLA',
      align: 'right',
      render: (st) => <span className="tabular-nums">{st.actualBookedVideos > 0 ? formatPercent(st.slaRate / 100, 0) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 170,
      render: (st) => <StaffStatus st={st} />,
    },
  ];

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={resetPage(setQuery)} placeholder="Tìm nhân sự, gian hàng, thương hiệu" className="w-full sm:w-72" />
        <Segmented<RoleFilter>
          items={[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'SPECIALIST', label: 'Chuyên viên' },
            { key: 'MANAGEMENT', label: 'Quản lý' },
          ]}
          value={role}
          onChange={resetPage(setRole)}
        />
      </div>

      <StatRow size="sm">
        <Stat
          label="Nhân sự phụ trách"
          value={formatNumber(summary.count)}
          tone={summary.budgetWarn > 0 ? 'warning' : undefined}
        />
        <Stat
          label="Video đăng / Đơn book"
          value={`${formatNumber(summary.aired)} / ${formatNumber(summary.booked)}`}
          progress={{ value: summary.aired, max: Math.max(1, summary.booked) }}
        />
        <Stat
          label="Đúng hạn SLA"
          value={summary.avgSla === null ? '—' : formatPercent(summary.avgSla / 100)}
          tone={summary.late > 0 ? 'critical' : undefined}
        />
        <Stat
          label="Chi phí / Video air"
          value={summary.costPerAir === null ? '—' : formatVndShort(summary.costPerAir)}
        />
      </StatRow>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,8fr)_minmax(0,5fr)] gap-4 items-start">
        <Panel
          title={panelTitle(ScatterChart, 'Khối lượng × Hiệu quả')}
          actions={
            <Segmented<ScatterY>
              items={[
                { key: 'COST', label: 'Chi phí / video' },
                { key: 'GMV', label: 'GMV' },
              ]}
              value={scatterY}
              onChange={setScatterY}
            />
          }
        >
          {scatter.points.length < 2 ? (
            <p className="text-sm text-ink-3 py-16 text-center">Chưa đủ chuyên viên trong phạm vi lọc để vẽ biểu đồ.</p>
          ) : (
            <>
              <ScatterPlot
                points={scatter.points}
                xScale={scatter.xScale}
                yScale={scatter.yScale}
                xLabel="Video đã đăng"
                yLabel={scatterY === 'COST' ? 'Chi phí / video' : 'GMV'}
                formatX={formatCountShort}
                formatY={formatVndShort}
                groupColor={(g) => quadrantOf(g).color}
                onPointClick={(p) => {
                  const st = byName.get(p.id);
                  if (st) onInspectStaff(st);
                }}
                height={340}
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink-2">
                {scatter.counts.map((q) => (
                  <span key={q.key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: q.color }} />
                    {q.label} ({q.n})
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel
          title={panelTitle(Medal, 'Xếp hạng')}
          actions={
            <Segmented<RankBy>
              items={[
                { key: 'AIRED', label: 'Video' },
                { key: 'GMV', label: 'GMV' },
                { key: 'SLA', label: 'SLA' },
              ]}
              value={rankBy}
              onChange={setRankBy}
            />
          }
        >
          {ranking.length === 0 ? (
            <p className="text-sm text-ink-3 py-16 text-center">Không có nhân sự trong phạm vi lọc.</p>
          ) : (
            <BarList items={ranking} max={rankBy === 'SLA' ? 100 : undefined} />
          )}
        </Panel>
      </div>

      <Panel
        flush
        title={panelTitle(Users, 'Danh sách nhân sự')}
        actions={
          <Segmented<SortBy>
            items={[
              { key: 'AIRED', label: 'Video' },
              { key: 'GMV', label: 'GMV' },
              { key: 'COST', label: 'Chi phí' },
              { key: 'SLA', label: 'SLA' },
              { key: 'LATE', label: 'Trễ hạn' },
            ]}
            value={sortBy}
            onChange={resetPage(setSortBy)}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(st) => st.name}
          onRowClick={onInspectStaff}
          empty={<p className="text-sm text-ink-3 py-6 text-center">Không có nhân sự khớp bộ lọc.</p>}
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </Panel>
    </div>
  );
}
