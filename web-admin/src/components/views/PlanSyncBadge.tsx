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
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-semibold border whitespace-nowrap';

  switch (status) {
    case 'loading':
      return (
        <span className={`${base} bg-slate-50 text-slate-500 border-slate-200`}>
          <Loader2 className="w-3 h-3 animate-spin" /> Đang tải
        </span>
      );
    case 'saving':
      return (
        <span className={`${base} bg-slate-50 text-slate-600 border-slate-200`}>
          <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
        </span>
      );
    case 'dirty':
      return (
        <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Chưa lưu
        </span>
      );
    case 'saved':
      return (
        <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`} title="Đã lưu vào database">
          <CheckCircle2 className="w-3 h-3" /> Đã lưu {timeLabel(lastSavedAt)}
        </span>
      );
    case 'error':
      return (
        <button
          type="button"
          onClick={onRetry}
          className={`${base} bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer`}
          title={errorMessage || 'Lưu không thành công'}
        >
          <AlertTriangle className="w-3 h-3" /> Lưu lỗi
          <RefreshCw className="w-3 h-3" /> Thử lại
        </button>
      );
    case 'offline':
    default:
      return (
        <span
          className={`${base} bg-rose-50 text-rose-700 border-rose-200`}
          title={errorMessage || 'Không kết nối được database'}
        >
          <CloudOff className="w-3 h-3" /> Chưa kết nối database — không lưu
        </span>
      );
  }
};
