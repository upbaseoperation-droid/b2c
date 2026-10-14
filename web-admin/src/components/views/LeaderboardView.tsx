'use client';

import React, { useState } from 'react';
import {
  Avatar,
  DataTable,
  Panel,
  Person,
  Segmented,
  Status,
  Toolbar,
} from '../ui';
import type { Column } from '../ui';
import { formatVnd, formatVndShort } from '../../lib/format';
import { LeaderboardItem } from '../../lib/types';
import { INITIAL_LEADERBOARD } from '../../lib/mockData';

export const LeaderboardView: React.FC = () => {
  const [boardData] = useState<LeaderboardItem[]>(INITIAL_LEADERBOARD);
  const [timeRange, setTimeRange] = useState<'MONTH' | 'WEEK'>('MONTH');

  const topList = [boardData[0], boardData[1], boardData[2]].filter(Boolean);

  const columns: Column<LeaderboardItem>[] = [
    {
      key: 'rank',
      header: 'Thứ hạng',
      width: 90,
      render: (item) => (
        <span className="tabular-nums font-semibold text-ink">
          #{item.rank}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nhân sự',
      width: 180,
      render: (item) => <Person name={item.name} size={24} />,
    },
    {
      key: 'team',
      header: 'Bộ phận phụ trách',
      width: 160,
      render: (item) => <span className="text-ink-2">{item.team}</span>,
    },
    {
      key: 'slaScore',
      header: 'Kỷ luật SLA (30%)',
      align: 'right',
      width: 150,
      render: (item) => (
        <span className="font-semibold text-positive tabular-nums">
          {item.slaScore}%
        </span>
      ),
    },
    {
      key: 'videoCount',
      header: 'Sản lượng video (40%)',
      align: 'right',
      width: 160,
      render: (item) => (
        <span className="font-medium text-ink tabular-nums">
          {item.videoCount} video
        </span>
      ),
    },
    {
      key: 'gmv',
      header: 'Doanh thu GMV (30%)',
      align: 'right',
      width: 170,
      render: (item) => (
        <span className="font-semibold text-ink tabular-nums">
          {formatVnd(item.gmv)}
        </span>
      ),
    },
    {
      key: 'totalScore',
      header: 'Tổng điểm',
      align: 'right',
      width: 110,
      render: (item) => (
        <span className="font-semibold text-ink tabular-nums">
          {item.totalScore}
        </span>
      ),
    },
    {
      key: 'badge',
      header: 'Đánh giá nghiệp vụ',
      align: 'right',
      width: 160,
      render: (item) => (
        <Status tone={item.rank === 1 ? 'positive' : item.rank <= 3 ? 'info' : 'neutral'}>
          {item.badge}
        </Status>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Toolbar
        actions={<span className="text-xs text-ink-3 tabular-nums">{boardData.length} nhân sự</span>}
      >
        <Segmented
          value={timeRange}
          onChange={setTimeRange}
          items={[
            { key: 'MONTH', label: 'Tháng 8 & 9/2026' },
            { key: 'WEEK', label: 'Tuần này' },
          ]}
        />
        <span className="text-2xs text-ink-3">
          Cơ chế tính điểm: 30% kỷ luật SLA + 40% sản lượng video + 30% doanh thu GMV
        </span>
      </Toolbar>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topList.map((item) => (
          <div
            key={item.rank}
            className="p-4 bg-surface border border-line rounded-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-ink-2 tabular-nums">
                  Hạng #{item.rank} toàn phòng
                </span>
                <span className="text-xs font-semibold text-ink tabular-nums">
                  {item.totalScore} điểm
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name={item.name} size={32} />
                <div>
                  <h4 className="text-base font-semibold text-ink tracking-tight">{item.name}</h4>
                  <span className="text-xs text-ink-3">{item.team}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-line text-center">
                <div className="p-2.5 bg-canvas border border-line rounded-lg">
                  <span className="text-2xs text-ink-3 block">SLA (30%)</span>
                  <span className="text-xs font-semibold text-positive tabular-nums">{item.slaScore}%</span>
                </div>
                <div className="p-2.5 bg-canvas border border-line rounded-lg">
                  <span className="text-2xs text-ink-3 block">Video (40%)</span>
                  <span className="text-xs font-semibold text-ink tabular-nums">{item.videoCount}</span>
                </div>
                <div className="p-2.5 bg-canvas border border-line rounded-lg">
                  <span className="text-2xs text-ink-3 block">GMV (30%)</span>
                  <span className="text-xs font-semibold text-ink tabular-nums">{formatVndShort(item.gmv)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-2xs text-ink-3">Đánh giá chung</span>
              <Status tone={item.rank === 1 ? 'positive' : item.rank === 2 ? 'info' : 'neutral'}>
                {item.badge}
              </Status>
            </div>
          </div>
        ))}
      </div>

      <Panel
        flush
        title="Bảng đánh giá chi tiết toàn bộ 30 nhân sự"
      >
        <DataTable
          columns={columns}
          rows={boardData}
          rowKey={(item) => String(item.rank)}
        />
      </Panel>
    </div>
  );
};
