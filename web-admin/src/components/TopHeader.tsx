'use client';

import React from 'react';
import { Menu, ChevronDown, Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { UserProfile } from '../lib/types';
import type { TabKey } from './Sidebar';
import { PageActionsSlot } from './ui';

// Các tab có phạm vi theo nhãn hàng
const BRAND_FILTERABLE_TABS = new Set<TabKey>([
  'dashboard-bi', 'ads-report', 'performance-p3', 'overview',
  'manager', 'input-plan', 'koc-listing', 'push-products',
  'booking', 'koc-master', 'content', 'content-angles',
  'campaigns', 'sample-tracker', 'brand-hub', 'self-channel-hub', 'koc-hub',
  'brand-knowledge'
]);

interface TopHeaderProps {
  currentUser: UserProfile;
  onUserChange?: (user: UserProfile) => void;
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
    <header className="app-header sticky top-0 z-20 min-h-20 bg-surface/95 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
          <h1 className="text-xl font-semibold text-ink leading-7 tracking-tight">{title}</h1>
          {subtitle && <p className="text-2xs text-ink-3 truncate hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
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
              aria-label="Lọc theo nhãn hàng"
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



        {/* Nút thao tác nhanh chuyển sang Content Angle khi ở tab Kịch bản */}
        {activeTab === 'content' && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('content-angles')}
            className="btn-md bg-accent-soft hover:bg-sunken text-accent border border-line transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline font-semibold">Góc tiếp cận theo SP</span>
            <ArrowRight className="w-3 h-3 text-accent" />
          </button>
        )}

        <PageActionsSlot />
      </div>
    </header>
  );
};
