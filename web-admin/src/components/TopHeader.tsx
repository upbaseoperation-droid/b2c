'use client';

import React from 'react';
import { Plus, Upload, FileText, Layers, Shield, Menu } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { USERS } from '../lib/mockData';

interface TopHeaderProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onOpenQuickBook: () => void;
  onOpenImport: () => void;
  title: string;
  subtitle?: string;
  onNavigateTab?: (tab: any) => void;
  onToggleMobileSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenQuickBook,
  onOpenImport,
  title,
  subtitle,
  onNavigateTab,
  onToggleMobileSidebar
}) => {
  const isBookingOrManager = currentUser.role === 'MANAGER' || currentUser.role === 'BOOKING_MEMBER';
  const isContent = currentUser.role === 'CONTENT_MEMBER';
  const isBrand = currentUser.role === 'BRAND_MEMBER';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
      {/* Mobile Menu Button & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-500 truncate hidden md:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Role Switcher */}
        <div className="h-8 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs shadow-2xs">
          <div className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
            {currentUser.avatar}
          </div>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = USERS.find(item => item.id === e.target.value);
              if (u) onUserChange(u);
            }}
            className="bg-transparent text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer pr-1"
            aria-label="Chọn tài khoản và vai trò"
          >
            {USERS.map(user => (
              <option key={user.id} value={user.id} className="bg-white text-slate-800">
                {user.name} ({user.role === 'MANAGER' ? 'Trưởng phòng' : user.role === 'BOOKING_MEMBER' ? 'Booking' : user.role === 'CONTENT_MEMBER' ? 'Content' : 'Brand'})
              </option>
            ))}
          </select>
        </div>

        {/* Role-Aware Actions */}
        {isBookingOrManager && (
          <>
            {/* Action Button: Quick Book */}
            <button
              onClick={onOpenQuickBook}
              className="btn-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Tạo Booking</span>
            </button>

            {/* Action Button: Import Excel */}
            <button
              onClick={onOpenImport}
              className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs shadow-2xs transition"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
              <span className="hidden sm:inline">Nhập Excel</span>
            </button>
          </>
        )}

        {isContent && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('content')}
            className="btn-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">Hàng Chờ Duyệt Kịch Bản</span>
          </button>
        )}

        {isBrand && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('campaigns')}
            className="btn-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">Chiến Dịch &amp; Brief Mới</span>
          </button>
        )}
      </div>
    </header>
  );
};
