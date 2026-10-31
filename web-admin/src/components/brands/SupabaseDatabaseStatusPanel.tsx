'use client';

import React, { useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { Button, Panel, Status } from '../ui';
import { formatNumber } from '../../lib/format';

interface SupabaseDatabaseStatusPanelProps {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface SupabaseStatsResponse {
  connected: boolean;
  storageMode: 'POSTGRES' | 'LOCAL_FALLBACK';
  counts?: Record<string, number>;
  error?: string;
}

const TABLE_LABELS: Record<string, string> = {
  StorePortfolio: 'Danh mục 69 gian hàng B2C (StorePortfolio)',
  MonthlyPlan: 'Kế hoạch tháng (MonthlyPlan)',
  LarkbaseBookingPlanRecord: 'Bản ghi kế hoạch Larkbase (LarkbaseBookingPlanRecord)',
  KocProfile: 'Hồ sơ danh bạ KOC (KocProfile)',
  AppSharedRecord: 'Kho trạng thái đồng bộ trung tâm (AppSharedRecord)',
  ContractHubRecord: 'Hồ sơ hợp đồng điện tử (ContractHubRecord)',
  BrandProfileRecord: 'Hồ sơ 42 thương hiệu B2C (BrandProfileRecord)',
};

export function SupabaseDatabaseStatusPanel({ onNotify }: SupabaseDatabaseStatusPanelProps) {
  const [stats, setStats] = useState<SupabaseStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/supabase-sync', { cache: 'no-store' });
      const data = (await res.json()) as SupabaseStatsResponse;
      setStats(data);
      if (data.connected) {
        onNotify?.('Đã kết nối trực tiếp tới Supabase PostgreSQL.', 'success');
      } else {
        onNotify?.(data.error || 'Đang chạy ở chế độ lưu trữ dự phòng cục bộ.', 'warning');
      }
    } catch {
      onNotify?.('Không thể kiểm tra trạng thái kết nối cơ sở dữ liệu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel
      title="Cơ sở dữ liệu trung tâm Supabase PostgreSQL"
      icon={Database}
      actions={
        <div className="flex items-center gap-2">
          <Status tone={stats ? (stats.connected ? 'positive' : 'warning') : 'neutral'}>
            {!stats
              ? 'Chưa kiểm tra'
              : stats.storageMode === 'LOCAL_FALLBACK'
                ? 'Dự phòng cục bộ'
                : 'Supabase PostgreSQL'}
          </Status>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            disabled={loading}
            onClick={handleCheckStatus}
          >
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra bảng dữ liệu'}
          </Button>
        </div>
      }
    >
      <div className="p-4 space-y-3">
        {stats?.counts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(TABLE_LABELS).map(([tableKey, label]) => (
              <div
                key={tableKey}
                className="p-3 rounded-lg border border-line bg-canvas flex items-center justify-between gap-2"
              >
                <span className="text-xs font-medium text-ink-2">{label}</span>
                <span className="text-sm font-semibold tabular-nums text-ink">
                  {formatNumber(stats.counts?.[tableKey] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-ink-2">
            Hệ thống tự động đồng bộ toàn bộ Kế hoạch tháng, Danh sách duyệt book, Hợp đồng, Danh bạ KOC và 69 gian hàng B2C trực tiếp lên Supabase PostgreSQL. Bấm nút Kiểm tra bảng dữ liệu để đối chiếu số lượng bản ghi hiện hành.
          </div>
        )}
      </div>
    </Panel>
  );
}
