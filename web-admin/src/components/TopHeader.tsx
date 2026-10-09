'use client';

import React from 'react';
import { Menu, ChevronDown, Sparkles, ArrowRight, Building2 } from 'lucide-react';
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

// Các tab có phạm vi theo nhãn hàng
const BRAND_FILTERABLE_TABS = new Set<TabKey>([
  'dashboard-bi', 'ads-report', 'performance-p3', 'overview',
  'manager', 'input-plan', 'koc-listing', 'push-products',
  'booking', 'koc-master', 'content', 'content-angles',
  'campaigns', 'sample-tracker', 'brand-hub', 'self-channel-hub', 'koc-hub'
]);

interface TopHeaderProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onOpenQuickBook?: () => void;
  onOpenImport?: () => void;
  title: string;
  subtitle?: string;
  activeTab?: TabKey;
  selectedBrand?: string;
  onBrandChange?: (brand: string) => void;
  onNavigateTab?: (tab: TabKey) => void;
  onToggleMobileSidebar?: () => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  onUserChange,
  title,
  subtitle,
  activeTab,
  selectedBrand = 'ALL',
  onBrandChange,
  onNavigateTab,
  onToggleMobileSidebar,
}) => {
  // Danh sách các brand được phép chọn của tài khoản hiện tại
  const userAssignedBrands = currentUser.assignedBrands || (
    currentUser.linkedEntityName ? currentUser.linkedEntityName.split(',').map(s => s.trim()) : []
  );

  return (
    <header className="sticky top-0 z-20 min-h-14 bg-canvas/95 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 -ml-1.5 rounded-md text-ink-2 hover:text-ink hover:bg-sunken transition-colors shrink-0"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-ink truncate leading-7 tracking-tight">{title}</h1>
          {subtitle && <p className="text-2xs text-ink-3 truncate hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* ========================================================================= */}
        {/* BỘ CHỌN NHÃN HÀNG (BRAND CONTEXT SWITCHER) DÀNH CHO NHÂN VIÊN 2-3 BRAND   */}
        {/* ========================================================================= */}
        {currentUser.role === 'BRAND_PARTNER' ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{currentUser.assignedBrands?.[0] || currentUser.linkedEntityName || 'Kutieskin'}</span>
          </div>
        ) : !['KOC_PARTNER', 'CTV_PARTNER'].includes(currentUser.role) && onBrandChange && (!activeTab || BRAND_FILTERABLE_TABS.has(activeTab)) && (
          <label className="relative hidden sm:flex items-center h-[34px] pl-2.5 pr-7 rounded-md border border-line-strong text-[12px] text-ink hover:border-slate-400 bg-surface transition-colors cursor-pointer" title="Lọc dữ liệu theo nhãn hàng bạn đang phụ trách">
            <Building2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
            <span className="text-ink-3 mr-1 text-2xs hidden md:inline">Nhãn:</span>
            <select
              value={selectedBrand}
              onChange={(e) => onBrandChange(e.target.value)}
              className="appearance-none bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">
                {['ADMIN', 'MANAGER'].includes(currentUser.role)
                  ? 'Tất cả nhãn hàng'
                  : `Tất cả brand phụ trách (${userAssignedBrands.filter(b => b !== 'Tất cả nhãn hàng').length})`}
              </option>
              {userAssignedBrands
                .filter(b => b !== 'Tất cả nhãn hàng')
                .map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2 pointer-events-none" />
          </label>
        )}

        {SHOW_ROLE_SWITCHER && (
          <div className="hidden sm:flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-2xs font-bold border shrink-0 ${
              currentUser.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
              currentUser.role === 'MANAGER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
              currentUser.role === 'LEADER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              currentUser.role === 'BOOKING_MEMBER' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' :
              currentUser.role === 'CONTENT_MEMBER' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              currentUser.role === 'BRAND_MEMBER' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              currentUser.role === 'BRAND_PARTNER' ? 'bg-purple-50 text-purple-800 border-purple-200' :
              currentUser.role === 'KOC_PARTNER' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              currentUser.role === 'CTV_PARTNER' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {ROLE_LABEL[currentUser.role] ?? currentUser.role}
            </span>

            <label className="relative flex items-center h-[34px] pl-3 pr-8 rounded-md border border-dashed border-line-strong text-[13px] text-ink-2 hover:border-ink-3 transition-colors cursor-pointer bg-surface/50">
              <span className="text-ink-3 mr-1.5 hidden md:inline">Tài khoản:</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = USERS.find((item) => item.id === e.target.value);
                  if (u) onUserChange(u);
                }}
                className="appearance-none bg-transparent font-medium text-ink focus:outline-none cursor-pointer pr-2"
                style={{ backgroundColor: 'transparent' }}
                aria-label="Xem với vai trò"
              >
                <optgroup label="Ban Điều Hành & Quản Trị">
                  {USERS.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER').map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {ROLE_LABEL[user.role] ?? user.role}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Trưởng Nhóm & Chuyên Viên Nội Bộ">
                  {USERS.filter(u => ['LEADER', 'BOOKING_MEMBER', 'CONTENT_MEMBER', 'BRAND_MEMBER', 'MEMBER'].includes(u.role)).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {ROLE_LABEL[user.role] ?? user.role}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Đối Tác Bên Thứ 3 (Gmail SSO)">
                  {USERS.filter(u => ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'].includes(u.role)).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {ROLE_LABEL[user.role] ?? user.role}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 pointer-events-none" />
            </label>
          </div>
        )}

        {/* Nút thao tác nhanh chuyển sang Content Angle khi ở tab Kịch bản */}
        {activeTab === 'content' && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('content-angles')}
            className="btn-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline font-semibold">Góc tiếp cận theo SP</span>
            <ArrowRight className="w-3 h-3 text-purple-500" />
          </button>
        )}


      </div>
    </header>
  );
};
