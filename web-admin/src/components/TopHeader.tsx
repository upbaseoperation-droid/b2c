'use client';

import React from 'react';
import { Plus, Upload, Menu, ChevronDown } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { USERS } from '../lib/mockData';
import type { TabKey } from './Sidebar';

// Ô chuyển vai trò chỉ dùng khi phát triển hoặc demo, không hiện cho người dùng thật
const SHOW_ROLE_SWITCHER =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCHER === '1';

const ROLE_LABEL: Record<UserProfile['role'], string> = {
  ADMIN: 'Quản trị (BOD)',
  MANAGER: 'Trưởng phòng',
  LEADER: 'Trưởng nhóm (PIC Lead)',
  MEMBER: 'Chuyên viên vận hành',
  BRAND_MEMBER: 'Brand PIC',
  CONTENT_MEMBER: 'Content',
  BOOKING_MEMBER: 'Booking',
  BRAND_PARTNER: 'Đối tác Brand (Gmail)',
  KOC_PARTNER: 'KOC / KOL (Gmail)',
  CTV_PARTNER: 'Cộng tác viên (Gmail)',
};

interface TopHeaderProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onOpenQuickBook: () => void;
  onOpenImport: () => void;
  title: string;
  subtitle?: string;
  onNavigateTab?: (tab: TabKey) => void;
  onToggleMobileSidebar?: () => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenQuickBook,
  onOpenImport,
  title,
  subtitle,
  onNavigateTab,
  onToggleMobileSidebar,
}) => {
  const isBookingOrManager = currentUser.role === 'MANAGER' || currentUser.role === 'BOOKING_MEMBER';

  return (
    <header className="sticky top-0 z-20 min-h-14 bg-canvas/95 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md text-ink-2 hover:text-ink hover:bg-sunken transition-colors shrink-0"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-ink truncate leading-7 tracking-tight">{title}</h1>
          {subtitle && <p className="text-2xs text-ink-3 truncate hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {SHOW_ROLE_SWITCHER && (
          <label className="relative hidden sm:flex items-center h-[34px] pl-3 pr-8 rounded-md border border-dashed border-line-strong text-[13px] text-ink-2 hover:border-ink-3 transition-colors cursor-pointer">
            <span className="text-ink-3 mr-1.5">Xem với vai trò</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = USERS.find((item) => item.id === e.target.value);
                if (u) onUserChange(u);
              }}
              className="appearance-none bg-transparent font-medium text-ink focus:outline-none cursor-pointer"
              style={{ backgroundColor: 'transparent' }}
              aria-label="Xem với vai trò"
            >
              {USERS.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {ROLE_LABEL[user.role]}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 pointer-events-none" />
          </label>
        )}

        {isBookingOrManager && (
          <>
            <button
              onClick={onOpenImport}
              className="btn-md bg-surface hover:bg-sunken text-ink border border-line-strong transition-colors"
            >
              <Upload className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
              <span className="hidden sm:inline">Nhập Excel</span>
            </button>
            <button
              onClick={onOpenQuickBook}
              className="btn-md bg-primary hover:bg-primary-hover text-white transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Tạo booking</span>
            </button>
          </>
        )}


      </div>
    </header>
  );
};
