'use client';

import React from 'react';
import { Menu, ChevronDown, ArrowRight, Building2, PanelLeftOpen, PanelLeftClose, Sliders, HelpCircle } from 'lucide-react';
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
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
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
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  // Danh sách các brand được phép chọn của tài khoản hiện tại
  const userAssignedBrands = currentUser.assignedBrands || (
    currentUser.linkedEntityName ? currentUser.linkedEntityName.split(',').map(s => s.trim()) : []
  );

  return (
    <header className="app-header sticky top-0 z-20 min-h-14 bg-surface/95 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
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

        {onToggleSidebarCollapse && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
              isSidebarCollapsed
                ? 'px-2.5 py-1.5 bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft/80 text-xs font-semibold'
                : 'p-1.5 -ml-1.5 text-ink-3 hover:text-ink hover:bg-sunken border-transparent'
            }`}
            title={isSidebarCollapsed ? 'Mở lại thanh menu bên trái' : 'Ẩn thanh menu bên trái để mở rộng không gian làm việc'}
            aria-label={isSidebarCollapsed ? 'Mở lại thanh menu bên trái' : 'Ẩn thanh menu bên trái'}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-4 h-4" />
                <span>Menu</span>
              </>
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-ink leading-7 tracking-tight">{title}</h1>
          {subtitle && <p className="text-2xs text-ink-3 truncate hidden md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        {currentUser.role === 'BRAND_PARTNER' ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-positive-soft text-positive text-xs font-medium">
            <Building2 className="w-3.5 h-3.5 text-positive" />
            <span>{currentUser.assignedBrands?.[0] || currentUser.linkedEntityName || 'Kutieskin'}</span>
          </div>
        ) : !['KOC_PARTNER', 'CTV_PARTNER'].includes(currentUser.role) && onBrandChange && (!activeTab || BRAND_FILTERABLE_TABS.has(activeTab)) && (
          <label className="relative hidden sm:flex items-center h-[34px] pl-2.5 pr-7 rounded-md border border-line-strong text-2xs text-ink hover:border-ink-3 bg-surface transition-colors cursor-pointer" title="Lọc dữ liệu theo nhãn hàng bạn đang phụ trách">
            <Building2 className="w-3.5 h-3.5 text-accent mr-1.5 shrink-0" />
            <span className="text-ink-3 mr-1 text-2xs hidden md:inline">Nhãn:</span>
            <select
              aria-label="Lọc theo nhãn hàng"
              value={selectedBrand}
              onChange={(e) => onBrandChange(e.target.value)}
              className="appearance-none bg-transparent font-medium text-ink focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">
                {['ADMIN', 'MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER'].includes(currentUser.role)
                  ? 'Tất cả nhãn hàng'
                  : `Tất cả nhãn phụ trách (${userAssignedBrands.filter(b => b !== 'Tất cả nhãn hàng').length})`}
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

        {!['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'].includes(currentUser.role) && onNavigateTab && (
          <>
            <button
              type="button"
              onClick={() => onNavigateTab('knowledge-qa')}
              title="Tra cứu Sổ tay quy trình, SLA, mẫu hợp đồng, tính thuế và hỏi đáp nghiệp vụ Marketing B2C"
              className={`h-[34px] px-2.5 rounded-md border text-2xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'knowledge-qa'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface hover:bg-sunken text-ink border-line-strong'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sổ tay & Hỏi đáp</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('api-settings')}
              title="Thiết lập khóa API Google (Gemini), ChatGPT (OpenAI), Claude (Anthropic) và phân bổ theo mục đích nghiệp vụ"
              className={`h-[34px] px-2.5 rounded-md border text-2xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'api-settings'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface hover:bg-sunken text-ink border-line-strong'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cấu hình API</span>
            </button>
          </>
        )}

        {activeTab === 'content' && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('content-angles')}
            className="h-[34px] px-3 rounded-md bg-accent-soft hover:bg-sunken text-accent border border-line text-[13px] font-medium transition-colors flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Góc nội dung</span>
            <ArrowRight className="w-3.5 h-3.5 text-accent" />
          </button>
        )}

        <PageActionsSlot />
      </div>
    </header>
  );
};

