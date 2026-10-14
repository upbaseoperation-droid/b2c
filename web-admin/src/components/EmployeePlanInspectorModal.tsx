'use client';

import React, { useState, useEffect } from 'react';
import { formatVndShort } from '../lib/format';
import { ConfirmDialog, Presence, Status } from './ui';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Video, 
  Target, 
  Layers, 
  ExternalLink, 
  Check, 
  Edit3, 
  Send, 
  Sparkles,
  TrendingUp,
  User,
  Filter,
  Search,
  MessageSquare,
  AlertTriangle,
  Zap,
  ArrowRight,
  Shield
} from 'lucide-react';
import { 
  StaffDetailedPlanItem, 
  MonthlyStaffAllocation, 
  KocTier, 
  SalaryGrade,
  StaffPlanStatus,
  UserProfile
} from '../lib/types';
import { AiStaffReviewModal } from './AiStaffReviewModal';

interface EmployeePlanInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffAllocation: MonthlyStaffAllocation | null;
  planItems: StaffDetailedPlanItem[];
  onApproveEntirePlan: (staffName: string, managerFeedback: string) => void;
  onRequestPlanRevision: (staffName: string, managerFeedback: string) => void;
  onUpdatePlanItemStatus: (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => void;
  onConvertPlanToDeals?: (staffName: string) => void;
  currentUser?: UserProfile;
}

export const EmployeePlanInspectorModal: React.FC<EmployeePlanInspectorModalProps> = ({
  isOpen,
  onClose,
  staffAllocation,
  planItems,
  onApproveEntirePlan,
  onRequestPlanRevision,
  onUpdatePlanItemStatus,
  onConvertPlanToDeals,
  currentUser
}) => {
  const isManager = currentUser ? currentUser.role === 'MANAGER' : true;
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<'ALL' | 'W1' | 'W2' | 'W3' | 'W4'>('ALL');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | KocTier>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [managerFeedback, setManagerFeedback] = useState(staffAllocation?.managerNote || '');
  const [editingItem, setEditingItem] = useState<StaffDetailedPlanItem | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [isAiReviewOpen, setIsAiReviewOpen] = useState(false);
  const [isConfirmingApproveAll, setIsConfirmingApproveAll] = useState(false);
  const [isConfirmingConvertDeals, setIsConfirmingConvertDeals] = useState(false);
  const [isConfirmingRevision, setIsConfirmingRevision] = useState(false);

  useEffect(() => {
    if (staffAllocation?.managerNote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManagerFeedback(staffAllocation.managerNote);
    }
  }, [staffAllocation]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !staffAllocation) return <Presence show={false} />;

  // Calculations
  const staffItems = planItems.filter(item => item.staffName === staffAllocation.staffName);
  
  const totalPlannedVideos = staffItems.length;
  const totalPlannedBudget = staffItems.reduce((sum, item) => sum + (item.budgetEstimated || 0), 0);
  const totalPlannedGmv = staffItems.reduce((sum, item) => sum + (item.targetGmv || 0), 0);

  const targetVideos = staffAllocation.planVideos || 1;
  const targetBudget = staffAllocation.planBudget || 1;
  const targetGmv = staffAllocation.targetGmv || 1;

  const fillRateVideos = Math.round((totalPlannedVideos / targetVideos) * 100);
  const fillRateBudget = Math.round((totalPlannedBudget / targetBudget) * 100);

  // Tier counts in detailed plan
  const planTierCounts = {
    TIER_1_CELEB: staffItems.filter(i => i.tier === 'TIER_1_CELEB').length,
    TIER_2_MACRO: staffItems.filter(i => i.tier === 'TIER_2_MACRO').length,
    TIER_3_MICRO: staffItems.filter(i => i.tier === 'TIER_3_MICRO').length,
    TIER_4_AFFILIATE: staffItems.filter(i => i.tier === 'TIER_4_AFFILIATE').length,
  };

  const targetTierCounts = {
    TIER_1_CELEB: staffAllocation.tier1Videos || 0,
    TIER_2_MACRO: staffAllocation.tier2Videos || 0,
    TIER_3_MICRO: staffAllocation.tier3Videos || 0,
    TIER_4_AFFILIATE: staffAllocation.tier4Videos ?? staffAllocation.planVideos ?? 0,
  };

  // Filtered items
  const filteredItems = staffItems.filter(item => {
    if (selectedWeekFilter !== 'ALL' && item.targetWeek !== selectedWeekFilter) return false;
    if (selectedTierFilter !== 'ALL' && item.tier !== selectedTierFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = item.kocStageName.toLowerCase().includes(term);
      const matchBrand = item.brandName.toLowerCase().includes(term);
      const matchChannel = item.channelId?.toLowerCase().includes(term);
      if (!matchName && !matchBrand && !matchChannel) return false;
    }
    return true;
  });

  const pendingApprovalCount = staffItems.filter(i => i.status === 'SUBMITTED' || i.status === 'DRAFT').length;
  const approvedCount = staffItems.filter(i => i.status === 'APPROVED' || i.status === 'CONVERTED').length;

  const handleSaveNotes = () => {
    if (!editingItem) return;
    onUpdatePlanItemStatus(editingItem.id, editingItem.status, editNotes);
    setEditingItem(null);
  };

  return (
    <Presence show>
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-(--motion-base)"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div data-motion-panel
        role="dialog"
        aria-modal="true"
        aria-label={`Kế hoạch triển khai chi tiết — ${staffAllocation.staffName}`}
        className="bg-surface border border-line rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-ink animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter"
      >
        
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER                                                           */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-line bg-canvas flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-accent-soft border border-line text-accent font-semibold flex items-center justify-center text-sm shadow-2xs">
              {staffAllocation.staffName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-ink tracking-tight">
                  Kế hoạch triển khai chi tiết — {staffAllocation.staffName}
                </h3>
                <span className="text-xs text-ink-3 font-code">
                  · {staffAllocation.month}
                </span>
                <span className="text-xs text-ink-2">
                  · {staffAllocation.roleTitle}
                </span>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                Nhãn hàng phụ trách: <strong className="text-ink-2">{staffAllocation.assignedBrands.join(', ')}</strong> • Đối soát giữa chỉ tiêu Ma trận và danh sách KOC thực tế nhân viên đã lên lịch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SUMMARY KPI & MATRIX RECONCILIATION BAR                                */}
        {/* ========================================================================= */}
        <div className="p-5 border-b border-line bg-canvas/70 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          
          {/* Card 1: Số lượng Video & Fill Rate */}
          <div className="p-3.5 rounded-md bg-surface border border-line shadow-2xs">
            <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Video className="w-3.5 h-3.5 text-accent" />
                Độ lấp đầy video
              </span>
              <span className={`font-semibold font-code text-2xs ${fillRateVideos >= 90 ? 'text-positive' : 'text-warning'}`}>
                {fillRateVideos}%
              </span>
            </div>
            <div className="text-lg font-semibold text-ink font-code">
              {totalPlannedVideos} <span className="text-xs text-ink-3 font-normal">/ {targetVideos} clips giao</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden mt-2 border border-line">
              <div 
                className={`h-full transition-all ${fillRateVideos >= 90 ? 'bg-positive' : 'bg-warning'}`}
                style={{ width: `${Math.min(100, fillRateVideos)}%` }}
              />
            </div>
            <div className="text-2xs text-ink-3 mt-1 flex justify-between">
              <span>Đã lên plan: {totalPlannedVideos}</span>
              <span>Còn thiếu: {Math.max(0, targetVideos - totalPlannedVideos)} slot</span>
            </div>
          </div>

          {/* Card 2: Ngân Sách Đối Soát */}
          <div className="p-3.5 rounded-md bg-surface border border-line shadow-2xs">
            <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-accent" />
                Ngân sách dự toán Plan
              </span>
              <span className={`font-semibold font-code text-2xs ${fillRateBudget <= 100 ? 'text-accent' : 'text-critical'}`}>
                {fillRateBudget}%
              </span>
            </div>
            <div className="text-lg font-semibold text-accent font-code">
              {formatVndShort(totalPlannedBudget)} <span className="text-xs text-ink-3 font-normal">/ {formatVndShort(targetBudget)}</span>
            </div>
            <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden mt-2 border border-line">
              <div 
                className={`h-full transition-all ${fillRateBudget <= 100 ? 'bg-accent' : 'bg-critical'}`}
                style={{ width: `${Math.min(100, fillRateBudget)}%` }}
              />
            </div>
            <div className="text-2xs text-ink-3 mt-1 flex justify-between">
              <span>Hạn mức: {formatVndShort(targetBudget)}</span>
              <span className={targetBudget >= totalPlannedBudget ? 'text-ink-3' : 'text-critical font-medium'}>
                {targetBudget >= totalPlannedBudget ? `Dư: ${formatVndShort((targetBudget - totalPlannedBudget))}` : `Vượt: ${formatVndShort((totalPlannedBudget - targetBudget))}`}
              </span>
            </div>
          </div>

          {/* Card 3: Mục Tiêu GMV Kỳ Vọng */}
          <div className="p-3.5 rounded-md bg-surface border border-line shadow-2xs">
            <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Target className="w-3.5 h-3.5 text-positive" />
                Target GMV dự phóng
              </span>
              <span className="font-semibold font-code text-2xs text-positive">
                {Math.round((totalPlannedGmv / targetGmv) * 100)}%
              </span>
            </div>
            <div className="text-lg font-semibold text-positive font-code">
              {formatVndShort(totalPlannedGmv)} <span className="text-xs text-ink-3 font-normal">/ {formatVndShort(targetGmv)}</span>
            </div>
            <div className="text-2xs text-ink-3 mt-2 flex items-center gap-1.5">
              <span>Blended ROI dự kiến:</span>
              <span className="font-semibold text-warning font-code">
                {totalPlannedBudget > 0 ? (totalPlannedGmv / totalPlannedBudget).toFixed(1) : 0}x
              </span>
            </div>
          </div>

          {/* Card 4: Đối Soát Cơ Cấu 4 Tier KOC */}
          <div className="p-3.5 rounded-md bg-surface border border-line shadow-2xs">
            <span className="text-xs text-ink-3 block font-medium mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-accent" />
              So Khớp 4 Tier
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center font-code">
              <div className="p-1 rounded bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-semibold">T1 Celeb</span>
                <span className="text-xs font-semibold text-ink">{planTierCounts.TIER_1_CELEB}/{targetTierCounts.TIER_1_CELEB}</span>
              </div>
              <div className="p-1 rounded bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-semibold">T2 Macro</span>
                <span className="text-xs font-semibold text-ink">{planTierCounts.TIER_2_MACRO}/{targetTierCounts.TIER_2_MACRO}</span>
              </div>
              <div className="p-1 rounded bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-semibold">T3 Micro</span>
                <span className="text-xs font-semibold text-ink">{planTierCounts.TIER_3_MICRO}/{targetTierCounts.TIER_3_MICRO}</span>
              </div>
              <div className="p-1 rounded bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-semibold">T4 Nano</span>
                <span className="text-xs font-semibold text-ink">{planTierCounts.TIER_4_AFFILIATE}/{targetTierCounts.TIER_4_AFFILIATE}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. FILTER & SEARCH TOOLBAR                                                */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 border-b border-line bg-surface flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Week Filter */}
            <div className="flex items-center gap-1 bg-sunken border border-line rounded-md p-1">
              <span className="text-2xs text-ink-3 font-semibold px-1.5">Tuần:</span>
              {(['ALL', 'W1', 'W2', 'W3', 'W4'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeekFilter(w)}
                  className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                    selectedWeekFilter === w ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {w === 'ALL' ? 'Tất Cả' : w}
                </button>
              ))}
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-1 bg-sunken border border-line rounded-md p-1">
              <span className="text-2xs text-ink-3 font-semibold px-1.5">Tier:</span>
              <button
                onClick={() => setSelectedTierFilter('ALL')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'ALL' ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                Tất Cả
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_1_CELEB')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_1_CELEB' ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                T1 Celeb
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_2_MACRO')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_2_MACRO' ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                T2 Macro
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_3_MICRO')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_3_MICRO' ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                T3 Micro
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_4_AFFILIATE')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_4_AFFILIATE' ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                T4 Nano
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Tìm KOC, Brand, Channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-line rounded-md pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent shadow-2xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. DETAILED PLAN TABLE                                                    */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border border-line rounded-md overflow-hidden bg-surface shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-ink-2 border-b border-line font-semibold">
                  <th className="p-3 pl-4">Tuần</th>
                  <th className="p-3">Nhãn hàng</th>
                  <th className="p-3">KOC / Creator</th>
                  <th className="p-3">Phân hạng & tệp kênh</th>
                  <th className="p-3">Góc Quay / Pillar</th>
                  <th className="p-3 text-right">Dự toán chi phí</th>
                  <th className="p-3 text-right">GMV kỳ vọng</th>
                  <th className="p-3 text-center">Trạng thái Plan</th>
                  <th className="p-3">Ghi chú phê duyệt</th>
                  <th className="p-3 pr-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-ink-3">
                        <Filter className="w-6 h-6 text-ink-3" />
                        <span className="text-xs font-medium text-ink-2">Chưa có slot KOC nào trong kế hoạch phù hợp với tiêu chí lọc</span>
                        {(selectedWeekFilter !== 'ALL' || selectedTierFilter !== 'ALL' || searchTerm) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWeekFilter('ALL');
                              setSelectedTierFilter('ALL');
                              setSearchTerm('');
                            }}
                            className="mt-1 text-xs text-accent hover:underline cursor-pointer font-medium"
                          >
                            Xóa toàn bộ bộ lọc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-canvas transition-colors">
                      {/* Tuần */}
                      <td className="p-3 pl-4">
                        <span className="font-semibold font-code text-ink-2 text-xs">
                          {item.targetWeek}
                        </span>
                      </td>

                      {/* Brand */}
                      <td className="p-3 font-semibold text-ink">
                        {item.brandName}
                      </td>

                      {/* KOC Info */}
                      <td className="p-3">
                        <div className="font-semibold text-ink text-xs">{item.kocStageName}</div>
                        {item.channelId && (
                          <div className="text-2xs text-ink-3 flex items-center gap-1 font-code">
                            <span>{item.channelId}</span>
                            {item.channelUrl && (
                              <a href={item.channelUrl} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-accent">
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tier & Category */}
                      <td className="p-3">
                        <span className="text-xs font-medium text-ink block">
                          {item.salaryGrade} <span className="text-ink-3">({item.tier.replace('TIER_', '')})</span>
                        </span>
                        {item.tepKenh && (
                          <div className="text-2xs text-ink-3 mt-0.5">{item.tepKenh}</div>
                        )}
                      </td>

                      {/* Content Pillar */}
                      <td className="p-3">
                        <span className="text-xs text-ink-2 block">
                          {item.contentPillar || 'Review trực tiếp'}
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="p-3 text-right font-code font-semibold text-accent">
                        {item.budgetEstimated === 0 ? 'FOC (0đ)' : `${item.budgetEstimated.toLocaleString('vi-VN')} đ`}
                      </td>

                      {/* GMV */}
                      <td className="p-3 text-right font-code font-semibold text-positive">
                        {item.targetGmv.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <Status
                          tone={
                            item.status === 'APPROVED'
                              ? 'positive'
                              : item.status === 'CONVERTED'
                                ? 'info'
                                : item.status === 'SUBMITTED'
                                  ? 'warning'
                                  : item.status === 'REVISION_REQUESTED'
                                    ? 'critical'
                                    : 'neutral'
                          }
                        >
                          {item.status === 'APPROVED'
                            ? 'Đã duyệt'
                            : item.status === 'CONVERTED'
                              ? 'Đã lên deal'
                              : item.status === 'SUBMITTED'
                                ? 'Chờ duyệt'
                                : item.status === 'REVISION_REQUESTED'
                                  ? 'Cần sửa'
                                  : 'Bản nháp'}
                        </Status>
                        {item.dealCode && (
                          <span className="block text-2xs text-accent font-code mt-0.5">{item.dealCode}</span>
                        )}
                      </td>

                      {/* Lead Notes */}
                      <td className="p-3 max-w-[180px]">
                        <p className="text-2xs text-ink-3 truncate hover:text-clip" title={item.leadNotes}>
                          {item.leadNotes || '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isManager && item.status !== 'APPROVED' && item.status !== 'CONVERTED' && (
                            <button
                              onClick={() => onUpdatePlanItemStatus(item.id, 'APPROVED', 'Trưởng phòng đã phê duyệt')}
                              title="Duyệt slot KOC này"
                              className="p-1 rounded bg-positive-soft hover:bg-positive text-positive hover:text-white border border-line transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isManager && (
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setEditNotes(item.leadNotes || '');
                              }}
                              title="Ghi chú / Yêu cầu chỉnh sửa"
                              className="p-1 rounded bg-sunken hover:bg-accent text-ink-2 hover:text-white border border-line transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isManager && (
                            <span className="text-2xs text-ink-3 italic">Chỉ xem</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Note Sub-panel (if active) */}
          {editingItem && isManager && (
            <div className="p-3.5 rounded-md bg-accent-soft border border-line space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span>Ghi chú phản hồi cho KOC: <strong>{editingItem.kocStageName}</strong> ({editingItem.brandName})</span>
                <button onClick={() => setEditingItem(null)} className="text-ink-3 hover:text-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Nhập yêu cầu điều chỉnh kịch bản, đổi tệp KOC hoặc dặn dò góc quay..."
                className="w-full text-xs bg-surface border border-line-strong rounded px-3 py-1.5 text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent shadow-2xs"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onUpdatePlanItemStatus(editingItem.id, 'REVISION_REQUESTED', editNotes)}
                  className="px-2.5 py-1 rounded text-2xs font-semibold bg-critical-soft text-critical border border-line transition"
                >
                  Yêu Cầu Sửa
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-2.5 py-1 rounded text-2xs font-semibold bg-accent text-white transition"
                >
                  Lưu ghi chú
                </button>
              </div>
            </div>
          )}

          {/* Feedback & Decision Box */}
          <div className="p-4 rounded-md bg-canvas border border-line space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                Chỉ Đạo &amp; Nhận Xét Của Trưởng Phòng:
              </h4>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setIsAiReviewOpen(true)}
                  className="px-2.5 py-1 rounded bg-accent-soft text-accent border border-line font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
                  title="Nhận xét tiến độ và gợi ý lời phê chuẩn mực"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Gợi ý nhận xét</span>
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={managerFeedback}
              onChange={(e) => isManager && setManagerFeedback(e.target.value)}
              disabled={!isManager}
              placeholder={isManager ? "Nhập nhận xét tổng thể về tỷ lệ lấp đầy, cân đối ngân sách và chỉ đạo nghiệp vụ cho nhân sự..." : "Chỉ Trưởng phòng mới có thẩm quyền nhập chỉ đạo nghiệp vụ."}
              className={`w-full text-xs bg-surface border border-line-strong rounded-md p-2.5 text-ink placeholder:text-ink-3 focus:outline-none shadow-2xs ${isManager ? 'focus:border-accent' : 'opacity-60 cursor-not-allowed bg-sunken'}`}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. MODAL FOOTER & MASTER APPROVAL ACTIONS                                 */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-t border-line bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-ink-2">
            Trạng thái hiện tại: <strong className="text-ink">{approvedCount}/{totalPlannedVideos} clips đã duyệt</strong> ({pendingApprovalCount} chờ duyệt)
          </div>

          {!isManager ? (
            <span className="text-xs text-warning bg-warning-soft border border-line px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Chế độ xem (chỉ trưởng phòng mới có quyền phê duyệt hoặc yêu cầu điều chỉnh kế hoạch)
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfirmingRevision(true)}
                className="px-3.5 py-2 rounded-md font-semibold text-xs bg-critical-soft text-critical border border-line transition flex items-center gap-1.5 shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-critical" />
                Yêu cầu điều chỉnh kế hoạch
              </button>

              <button
                onClick={() => setIsConfirmingApproveAll(true)}
                className="px-4 py-2 rounded-md font-semibold text-xs bg-positive text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Phê duyệt toàn bộ kế hoạch
              </button>

              {onConvertPlanToDeals && (
                <button
                  onClick={() => setIsConfirmingConvertDeals(true)}
                  className="px-4 py-2 rounded-md font-semibold text-xs bg-accent text-white transition flex items-center gap-1.5 shadow-sm"
                  title="Khởi tạo danh sách Deal Booking từ các slot đã duyệt để bắt đầu liên hệ và gửi mẫu"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Tạo {approvedCount} Deals tác nghiệp
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* AI Staff Reviewer Modal */}
      {isAiReviewOpen && (
        <AiStaffReviewModal
          isOpen={isAiReviewOpen}
          onClose={() => setIsAiReviewOpen(false)}
          initialStaffName={staffAllocation.staffName}
          onApplyManagerNote={(note) => setManagerFeedback(note)}
        />
      )}

      {/* Confirm Approve Entire Plan */}
      <ConfirmDialog
        open={isConfirmingApproveAll}
        onOpenChange={setIsConfirmingApproveAll}
        title="Xác nhận phê duyệt toàn bộ kế hoạch"
        description={`Bạn có chắc chắn muốn phê duyệt toàn bộ kế hoạch tháng của nhân sự ${staffAllocation.staffName} (${totalPlannedVideos} slot KOC, tổng ngân sách dự kiến ${formatVndShort(totalPlannedBudget)})?`}
        confirmLabel="Phê duyệt kế hoạch"
        cancelLabel="Hủy"
        variant="primary"
        onConfirm={() => {
          onApproveEntirePlan(staffAllocation.staffName, managerFeedback);
          setIsConfirmingApproveAll(false);
        }}
      />

      {/* Confirm Request Revision */}
      <ConfirmDialog
        open={isConfirmingRevision}
        onOpenChange={setIsConfirmingRevision}
        title="Xác nhận yêu cầu điều chỉnh kế hoạch"
        description={`Bạn có chắc chắn muốn trả lại kế hoạch cho ${staffAllocation.staffName} để điều chỉnh? ${managerFeedback ? `Nội dung chỉ đạo: "${managerFeedback}"` : 'Lưu ý: Bạn chưa nhập ghi chú chỉ đạo ở ô phía trên.'}`}
        confirmLabel="Gửi yêu cầu sửa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          onRequestPlanRevision(staffAllocation.staffName, managerFeedback);
          setIsConfirmingRevision(false);
        }}
      />

      {/* Confirm Batch Convert Deals */}
      {onConvertPlanToDeals && (
        <ConfirmDialog
          open={isConfirmingConvertDeals}
          onOpenChange={setIsConfirmingConvertDeals}
          title="Xác nhận tạo hàng loạt Deal Booking"
          description={`Hệ thống sẽ tự động khởi tạo ${approvedCount} Booking Deal tác nghiệp thực tế tương ứng với các slot KOC đã duyệt của ${staffAllocation.staffName}. Bạn có muốn tiếp tục?`}
          confirmLabel={`Tạo ${approvedCount} Deals`}
          cancelLabel="Hủy"
          variant="primary"
          onConfirm={() => {
            onConvertPlanToDeals(staffAllocation.staffName);
            setIsConfirmingConvertDeals(false);
          }}
        />
      )}
    </div>
    </Presence>
  );
};
