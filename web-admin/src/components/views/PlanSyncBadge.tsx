'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import type { PlanSyncStatus } from '../../lib/useMonthlyPlanSync';

interface PlanSyncBadgeProps {
  status: PlanSyncStatus;
  lastSavedAt: Date | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const timeLabel = (d: Date | null) =>
  d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

/** Nhãn trạng thái lưu kế hoạch: Đang tải / Chưa lưu / Đang lưu / Đã lưu hh:mm / Lỗi / Chưa kết nối. */
export const PlanSyncBadge: React.FC<PlanSyncBadgeProps> = ({ status, lastSavedAt, errorMessage, onRetry }) => {
  const base = 'inline-flex items-center gap-2 px-3 py-1 rounded-lg text-2xs font-semibold border whitespace-nowrap';

  switch (status) {
    case 'loading':
      return (
        <span className={`${base} bg-canvas text-ink-3 border-line`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải
        </span>
      );
    case 'saving':
      return (
        <span className={`${base} bg-canvas text-ink-2 border-line`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
        </span>
      );
    case 'dirty':
      return (
        <span className={`${base} bg-warning-soft text-warning border-warning/30`}>
          <span className="w-1.5 h-1.5 rounded-full bg-warning" /> Chưa lưu
        </span>
      );
    case 'saved':
      return (
        <span className={`${base} bg-positive-soft text-positive border-positive/30`} title="Đã lưu vào database">
          <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu {timeLabel(lastSavedAt)}
        </span>
      );
    case 'error':
      return (
        <button
          type="button"
          onClick={onRetry}
          className={`${base} bg-critical-soft text-critical border-critical/30 hover:bg-critical-soft cursor-pointer`}
          title={errorMessage || 'Lưu không thành công'}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Lưu lỗi
          <RefreshCw className="w-3.5 h-3.5" /> Thử lại
        </button>
      );
    case 'offline':
    default:
      return (
        <span
          className={`${base} bg-critical-soft text-critical border-critical/30`}
          title={errorMessage || 'Không kết nối được database'}
        >
          <CloudOff className="w-3.5 h-3.5" /> Chưa kết nối database — không lưu
        </span>
      );
  }
};
