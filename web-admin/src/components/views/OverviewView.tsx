'use client';

import React from 'react';
import { Eye, Plus } from 'lucide-react';
import { BookingDealItem } from '../../lib/types';
import {
  Button,
  ChannelBar,
  DataTable,
  Panel,
  Person,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { Column } from '../ui';
import { formatVnd, formatVndShort } from '../../lib/format';

interface OverviewViewProps {
  deals: BookingDealItem[];
  onOpenQuickBook: () => void;
  onSelectDeal: (deal: BookingDealItem) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  deals,
  onOpenQuickBook,
  onSelectDeal,
}) => {
  const stats = React.useMemo(() => {
    let totalValue = 0;
    let advance = 0;
    let gmv = 0;
    const staffSet = new Set<string>();
    const byStaff = new Map<string, number>();

    for (const d of deals) {
      totalValue += d.totalValue || 0;
      advance += d.advanceAmount || 0;
      gmv += d.gmv30 || 0;
      if (d.assignedStaff) {
        staffSet.add(d.assignedStaff);
        byStaff.set(d.assignedStaff, (byStaff.get(d.assignedStaff) || 0) + 1);
      }
    }
    const top = [...byStaff.entries()].sort((x, y) => y[1] - x[1])[0];
    return {
      totalValue,
      advance,
      gmv,
      staffCount: staffSet.size,
      top,
    };
  }, [deals]);

  const columns: Column<BookingDealItem>[] = React.useMemo(() => [
    {
      key: 'dealCode',
      header: 'Mã deal',
      width: 110,
      render: (deal) => (
        <span className="font-code font-medium text-ink whitespace-nowrap">
          {deal.dealCode}
        </span>
      ),
    },
    {
      key: 'koc',
      header: 'KOC & chiến dịch',
      width: 240,
      render: (deal) => (
        <div className="space-y-0.5 min-w-0">
          <div className="font-medium text-ink truncate">{deal.kocStageName}</div>
          <div className="text-2xs text-ink-3 truncate max-w-xs">
            {deal.campaignTitle} · PIC: {deal.assignedStaff}
          </div>
        </div>
      ),
    },
    {
      key: 'totalValue',
      header: 'Tổng deal',
      align: 'right',
      width: 130,
      render: (deal) => (
        <span className="font-medium text-ink whitespace-nowrap">
          {formatVnd(deal.totalValue)}
        </span>
      ),
    },
    {
      key: 'advanceAmount',
      header: 'Tạm ứng đợt 1',
      align: 'right',
      width: 130,
      render: (deal) => (
        <span className="font-medium text-positive whitespace-nowrap">
          {formatVnd(deal.advanceAmount)}
        </span>
      ),
    },
    {
      key: 'finalAmount',
      header: 'Còn lại đợt 2',
      align: 'right',
      width: 130,
      render: (deal) => (
        <span className="text-ink-2 whitespace-nowrap">
          {formatVnd(deal.finalAmount ?? Math.max(0, deal.totalValue - deal.advanceAmount))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 150,
      render: (deal) => (
        <Status
          tone={
            deal.status === 'ADVANCE_PAID' || deal.status === 'FINAL_PAID' || deal.status === 'COMPLETED'
              ? 'positive'
              : deal.status === 'SCRIPT_APPROVED' || deal.status === 'VIDEO_SUBMITTED'
              ? 'info'
              : deal.status === 'CANCELLED'
              ? 'critical'
              : 'warning'
          }
        >
          {deal.statusLabel}
        </Status>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 140,
      render: (deal) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Eye}
          onClick={() => onSelectDeal(deal)}
        >
          Xem hợp đồng
        </Button>
      ),
    },
  ], [onSelectDeal]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <StatRow>
          <Stat label="Giá trị deal" value={formatVndShort(stats.totalValue)} progress={{ value: stats.advance, max: stats.totalValue || 1, target: 0 }} note={`Đã tạm ứng ${formatVndShort(stats.advance)}`} />
          <Stat label="Deal đang theo dõi" value={deals.length} note={`${stats.staffCount} nhân sự phụ trách`} />
          <Stat label="GMV 30 ngày" value={formatVndShort(stats.gmv)} note={stats.totalValue > 0 ? `Gấp ${(stats.gmv / stats.totalValue).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} lần giá trị deal` : undefined} tone={stats.gmv >= stats.totalValue ? 'positive' : undefined} />
          <Stat label="Nhiều deal nhất" value={stats.top ? <Person name={stats.top[0]} size={28} /> : '—'} note={stats.top ? `${stats.top[1]} deal` : undefined} />
        </StatRow>
            <div className="bg-surface border border-line rounded-xl px-4 py-3.5 grid gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-ink">Giá trị deal theo kênh</span>
                <span className="text-2xs text-ink-3 tabular-nums">{formatVndShort(stats.totalValue)}</span>
              </div>
              <ChannelBar
                format={formatVndShort}
                values={deals.map(d => ({
                  channel: d.bookingFormat === 'Booking Livestream KOC' ? 'LIVE' : (d.storeName || d.campaignTitle || ''),
                  value: d.totalValue || 0,
                }))}
              />
            </div>
          </div>

      <Panel
        title="Bàn giao giữa các team"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-line bg-canvas space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-xs font-semibold text-ink">1. Team Brand</span>
              <span className="text-2xs text-ink-3">SLA 24h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-surface rounded-lg border border-line text-xs space-y-1.5">
                <span className="font-semibold text-ink block">Mega Sale 10.10: Kháng nắng</span>
                <p className="text-ink-2 text-2xs">Thông điệp &quot;Lá chắn đa tầng&quot; · Mục tiêu 1,8 tỷ GMV</p>
                <div className="flex items-center justify-between text-2xs text-ink-3 pt-1.5 border-t border-line">
                  <span className="font-medium text-ink-2">Phương Thảo</span>
                  <Status tone="positive">Đã duyệt brief</Status>
                </div>
              </div>
              <div className="p-3.5 bg-surface rounded-lg border border-line text-xs space-y-1.5">
                <span className="font-semibold text-ink block">Chiến dịch Thu Đông Q4</span>
                <p className="text-ink-2 text-2xs">Định vị dòng phục hồi da mùa khô</p>
                <div className="flex items-center justify-between text-2xs text-ink-3 pt-1.5 border-t border-line">
                  <span className="font-medium text-ink-2">Tiến</span>
                  <Status tone="info">SLA còn 14h</Status>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-line bg-canvas space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-xs font-semibold text-ink">2. Team Content</span>
              <span className="text-2xs text-ink-3">SLA 24–48h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-surface rounded-lg border border-line text-xs space-y-1.5">
                <span className="font-semibold text-ink block">Kế hoạch 10.10: 45 bài đăng</span>
                <p className="text-ink-2 text-2xs">Trụ cột: Kiến thức tia UV (35%) + Trải nghiệm thực tế (45%)</p>
                <div className="flex items-center justify-between text-2xs text-ink-3 pt-1.5 border-t border-line">
                  <span className="font-medium text-ink-2">Quỳnh Như</span>
                  <Status tone="positive">Đã chuyển Booking</Status>
                </div>
              </div>
              <div className="p-3.5 bg-surface rounded-lg border border-line text-xs space-y-1.5">
                <span className="font-semibold text-ink block">Duyệt kịch bản KOC 60s</span>
                <p className="text-ink-2 text-2xs">Góc quay &quot;Soi camera UV trước và sau khi thoa&quot;</p>
                <div className="flex items-center justify-between text-2xs text-ink-3 pt-1.5 border-t border-line">
                  <span className="font-medium text-ink-2">Hoàng Linh</span>
                  <Status tone="warning">SLA còn 4h</Status>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-line bg-canvas space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-xs font-semibold text-ink">3. Team Booking</span>
              <span className="text-2xs text-ink-3">SLA 12–48h</span>
            </div>
            <div className="space-y-2">
              <div className="p-3.5 bg-surface rounded-lg border border-line text-xs space-y-1.5">
                <span className="font-semibold text-ink block">Booking 30 KOC video Micro</span>
                <p className="text-ink-2 text-2xs">Đã chốt 28/30 KOC · 18 hợp đồng đã chi tạm ứng 2 tr</p>
                <div className="flex items-center justify-between text-2xs text-ink-3 pt-1.5 border-t border-line">
                  <span className="font-medium text-ink-2">Khánh Vy</span>
                  <Status tone="positive">Đang chạy</Status>
                </div>
              </div>
              <div className="p-3.5 bg-surface rounded-lg border border-line text-xs space-y-1.5">
                <span className="font-semibold text-ink block">Livestream Affiliate ngày sale</span>
                <p className="text-ink-2 text-2xs">Booking 8 KOC livestream đồng thời khung 19h–24h</p>
                <div className="flex items-center justify-between text-2xs text-ink-3 pt-1.5 border-t border-line">
                  <span className="font-medium text-ink-2">Nguyễn Anh</span>
                  <Status tone="warning">Chờ nghiệm thu</Status>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        flush
        title="Theo dõi deal và giải ngân"
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={onOpenQuickBook}>
            Thêm deal
          </Button>
        }
      >
        <DataTable
          columns={columns}
          rows={deals.slice(0, 50)}
          rowKey={(deal) => deal.id}
          stickyLast
        />
      </Panel>
    </div>
  );
};
