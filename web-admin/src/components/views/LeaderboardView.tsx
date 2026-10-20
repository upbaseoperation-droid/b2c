'use client';

import React, { useMemo, useState } from 'react';
import {
  DataTable,
  FilterBar,
  Panel,
  Person,
  Segmented,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { Column } from '../ui';
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import { LeaderboardItem } from '../../lib/types';
import { INITIAL_LEADERBOARD } from '../../lib/mockData';

export const LeaderboardView: React.FC = () => {
  const [boardData] = useState<LeaderboardItem[]>(INITIAL_LEADERBOARD);
  const [timeRange, setTimeRange] = useState<'MONTH' | 'WEEK'>('MONTH');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredBoard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return boardData;
    return boardData.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.team.toLowerCase().includes(q)
    );
  }, [boardData, searchQuery]);

  const summary = useMemo(() => {
    const count = filteredBoard.length;
    const avgSla =
      count > 0
        ? Math.round(
            (filteredBoard.reduce((sum, i) => sum + i.slaScore, 0) / count) * 10
          ) / 10
        : 0;
    const totalVideos = filteredBoard.reduce((sum, i) => sum + i.videoCount, 0);
    const totalGmv = filteredBoard.reduce((sum, i) => sum + i.gmv, 0);
    const avgScore =
      count > 0
        ? Math.round(
            (filteredBoard.reduce((sum, i) => sum + i.totalScore, 0) / count) * 10
          ) / 10
        : 0;
    return { count, avgSla, totalVideos, totalGmv, avgScore };
  }, [filteredBoard]);

  const columns: Column<LeaderboardItem>[] = [
    {
      key: 'rank',
      header: 'Hạng',
      width: 72,
      render: (item) => (
        <span className="font-medium text-ink-2">#{item.rank}</span>
      ),
    },
    {
      key: 'name',
      header: 'Nhân sự',
      width: 220,
      render: (item) => <Person name={item.name} sub={item.team} />,
    },
    {
      key: 'slaScore',
      header: 'Đúng hạn SLA (30%)',
      align: 'right',
      render: (item) => <span className="text-ink">{item.slaScore}%</span>,
    },
    {
      key: 'videoCount',
      header: 'Sản lượng video (40%)',
      align: 'right',
      render: (item) => <span className="text-ink">{item.videoCount} video</span>,
    },
    {
      key: 'gmv',
      header: 'Doanh thu GMV (30%)',
      align: 'right',
      render: (item) => (
        <span className="font-medium text-ink">{formatVnd(item.gmv)}</span>
      ),
    },
    {
      key: 'totalScore',
      header: 'Tổng điểm',
      align: 'right',
      render: (item) => (
        <span className="font-semibold text-ink">{item.totalScore}</span>
      ),
    },
    {
      key: 'badge',
      header: 'Đánh giá',
      width: 160,
      render: (item) => (
        <Status
          tone={
            item.rank === 1 ? 'positive' : item.rank <= 3 ? 'info' : 'neutral'
          }
        >
          {item.badge}
        </Status>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat
          label="Nhân sự đánh giá"
          value={`${summary.count} nhân sự`}
          note={`Điểm trung bình ${summary.avgScore}/100`}
        />
        <Stat
          label="Đúng hạn SLA trung bình"
          value={`${summary.avgSla}%`}
          note="Trọng số 30% tổng điểm"
        />
        <Stat
          label="Tổng sản lượng video"
          value={`${formatNumber(summary.totalVideos)} video`}
          note="Trọng số 40% tổng điểm"
        />
        <Stat
          label="Tổng doanh thu GMV"
          value={formatVndShort(summary.totalGmv)}
          note="Trọng số 30% tổng điểm"
        />
      </StatRow>

      <Panel flush>
        <FilterBar
          search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Tìm nhân sự, bộ phận..." }}
          filters={
            <Segmented
              value={timeRange}
              onChange={setTimeRange}
              items={[
                { key: 'MONTH', label: 'Tháng 8 & 9/2026' },
                { key: 'WEEK', label: 'Tuần này' },
              ]}
            />
          }
        />

        <DataTable
          columns={columns}
          rows={filteredBoard}
          rowKey={(item) => String(item.rank)}
        />
      </Panel>
    </div>
  );
};
