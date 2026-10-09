'use client';

import React, { useState, useEffect } from 'react';
import { formatVndShort } from '../lib/format';
import { ConfirmDialog } from './ui';
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

  if (!isOpen || !staffAllocation) return null;

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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={`Kế hoạch triển khai chi tiết — ${staffAllocation.staffName}`}
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
      >
        
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER                                                           */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-semibold flex items-center justify-center text-sm shadow-2xs">
              {staffAllocation.staffName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  KẾ HOẠCH TRIỂN KHAI CHI TIẾT — {staffAllocation.staffName.toUpperCase()}
                </h3>
                <span className="text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {staffAllocation.month}
                </span>
                <span className="text-2xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  {staffAllocation.roleTitle}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhãn hàng phụ trách: <strong className="text-slate-700">{staffAllocation.assignedBrands.join(', ')}</strong> • Đối soát giữa chỉ tiêu Ma trận và danh sách KOC thực tế nhân viên đã lên lịch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SUMMARY KPI & MATRIX RECONCILIATION BAR                                */}
        {/* ========================================================================= */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          
          {/* Card 1: Số lượng Video & Fill Rate */}
          <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                Độ lấp đầy video
              </span>
              <span className={`font-semibold font-mono text-2xs ${fillRateVideos >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {fillRateVideos}%
              </span>
            </div>
            <div className="text-lg font-semibold text-slate-900 font-mono">
              {totalPlannedVideos} <span className="text-xs text-slate-500 font-normal">/ {targetVideos} clips giao</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 border border-slate-200">
              <div 
                className={`h-full transition-all ${fillRateVideos >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, fillRateVideos)}%` }}
              />
            </div>
            <div className="text-2xs text-slate-500 mt-1 flex justify-between">
              <span>Đã lên plan: {totalPlannedVideos}</span>
              <span>Còn thiếu: {Math.max(0, targetVideos - totalPlannedVideos)} slot</span>
            </div>
          </div>

          {/* Card 2: Ngân Sách Đối Soát */}
          <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                Ngân sách dự toán Plan
              </span>
              <span className={`font-semibold font-mono text-2xs ${fillRateBudget <= 100 ? 'text-blue-600' : 'text-rose-600'}`}>
                {fillRateBudget}%
              </span>
            </div>
            <div className="text-lg font-semibold text-blue-600 font-mono">
              {formatVndShort(totalPlannedBudget)} <span className="text-xs text-slate-500 font-normal">/ {formatVndShort(targetBudget)}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 border border-slate-200">
              <div 
                className={`h-full transition-all ${fillRateBudget <= 100 ? 'bg-blue-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, fillRateBudget)}%` }}
              />
            </div>
            <div className="text-2xs text-slate-500 mt-1 flex justify-between">
              <span>Hạn mức: {formatVndShort(targetBudget)}</span>
              <span className={targetBudget >= totalPlannedBudget ? 'text-slate-500' : 'text-rose-600 font-medium'}>
                {targetBudget >= totalPlannedBudget ? `Dư: ${formatVndShort((targetBudget - totalPlannedBudget))}` : `Vượt: ${formatVndShort((totalPlannedBudget - targetBudget))}`}
              </span>
            </div>
          </div>

          {/* Card 3: Mục Tiêu GMV Kỳ Vọng */}
          <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                Target GMV dự phóng
              </span>
              <span className="font-semibold font-mono text-2xs text-emerald-600">
                {Math.round((totalPlannedGmv / targetGmv) * 100)}%
              </span>
            </div>
            <div className="text-lg font-semibold text-emerald-600 font-mono">
              {formatVndShort(totalPlannedGmv)} <span className="text-xs text-slate-500 font-normal">/ {formatVndShort(targetGmv)}</span>
            </div>
            <div className="text-2xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span>Blended ROI dự kiến:</span>
              <span className="font-semibold text-amber-600 font-mono">
                {totalPlannedBudget > 0 ? (totalPlannedGmv / totalPlannedBudget).toFixed(1) : 0}x
              </span>
            </div>
          </div>

          {/* Card 4: Đối Soát Cơ Cấu 4 Tier KOC */}
          <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block font-medium mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              So Khớp 4 Tier
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
              <div className="p-1 rounded bg-slate-50 border border-slate-200">
                <span className="text-2xs text-rose-600 block font-semibold">T1 Celeb</span>
                <span className="text-xs font-semibold text-slate-900">{planTierCounts.TIER_1_CELEB}/{targetTierCounts.TIER_1_CELEB}</span>
              </div>
              <div className="p-1 rounded bg-slate-50 border border-slate-200">
                <span className="text-2xs text-blue-600 block font-semibold">T2 Macro</span>
                <span className="text-xs font-semibold text-slate-900">{planTierCounts.TIER_2_MACRO}/{targetTierCounts.TIER_2_MACRO}</span>
              </div>
              <div className="p-1 rounded bg-slate-50 border border-slate-200">
                <span className="text-2xs text-emerald-600 block font-semibold">T3 Micro</span>
                <span className="text-xs font-semibold text-slate-900">{planTierCounts.TIER_3_MICRO}/{targetTierCounts.TIER_3_MICRO}</span>
              </div>
              <div className="p-1 rounded bg-slate-50 border border-slate-200">
                <span className="text-2xs text-purple-600 block font-semibold">T4 Nano</span>
                <span className="text-xs font-semibold text-slate-900">{planTierCounts.TIER_4_AFFILIATE}/{targetTierCounts.TIER_4_AFFILIATE}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. FILTER & SEARCH TOOLBAR                                                */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Week Filter */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md p-1">
              <span className="text-2xs text-slate-500 font-semibold px-1.5">Tuần:</span>
              {(['ALL', 'W1', 'W2', 'W3', 'W4'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeekFilter(w)}
                  className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                    selectedWeekFilter === w ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {w === 'ALL' ? 'Tất Cả' : w}
                </button>
              ))}
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md p-1">
              <span className="text-2xs text-slate-500 font-semibold px-1.5">Tier:</span>
              <button
                onClick={() => setSelectedTierFilter('ALL')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất Cả
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_1_CELEB')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_1_CELEB' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                T1 Celeb
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_2_MACRO')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_2_MACRO' ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'
                }`}
              >
                T2 Macro
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_3_MICRO')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_3_MICRO' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                T3 Micro
              </button>
              <button
                onClick={() => setSelectedTierFilter('TIER_4_AFFILIATE')}
                className={`px-2 py-0.5 rounded text-2xs font-semibold transition ${
                  selectedTierFilter === 'TIER_4_AFFILIATE' ? 'bg-purple-600 text-white' : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                T4 Nano
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Tìm KOC, Brand, Channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. DETAILED PLAN TABLE                                                    */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
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
              <tbody className="divide-y divide-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Filter className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600">Chưa có slot KOC nào trong kế hoạch phù hợp với tiêu chí lọc</span>
                        {(selectedWeekFilter !== 'ALL' || selectedTierFilter !== 'ALL' || searchTerm) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWeekFilter('ALL');
                              setSelectedTierFilter('ALL');
                              setSearchTerm('');
                            }}
                            className="mt-1 text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                          >
                            Xóa toàn bộ bộ lọc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* Tuần */}
                      <td className="p-3 pl-4">
                        <span className="font-semibold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-2xs">
                          {item.targetWeek}
                        </span>
                      </td>

                      {/* Brand */}
                      <td className="p-3 font-semibold text-slate-900">
                        {item.brandName}
                      </td>

                      {/* KOC Info */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 text-xs">{item.kocStageName}</div>
                        {item.channelId && (
                          <div className="text-2xs text-slate-500 flex items-center gap-1 font-mono">
                            <span>{item.channelId}</span>
                            {item.channelUrl && (
                              <a href={item.channelUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tier & Category */}
                      <td className="p-3">
                        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border inline-block ${
                          item.tier === 'TIER_1_CELEB' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          item.tier === 'TIER_2_MACRO' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          item.tier === 'TIER_3_MICRO' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {item.salaryGrade} ({item.tier.replace('TIER_', '')})
                        </span>
                        {item.tepKenh && (
                          <div className="text-2xs text-slate-400 mt-0.5">{item.tepKenh}</div>
                        )}
                      </td>

                      {/* Content Pillar */}
                      <td className="p-3">
                        <span className="text-2xs text-slate-300 block">
                          {item.contentPillar || 'Review trực tiếp'}
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="p-3 text-right font-mono font-semibold text-cyan-300">
                        {item.budgetEstimated === 0 ? 'FOC (0đ)' : `${item.budgetEstimated.toLocaleString('vi-VN')} đ`}
                      </td>

                      {/* GMV */}
                      <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                        {item.targetGmv.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span className={`text-2xs font-semibold px-2 py-0.5 rounded border inline-block ${
                          item.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          item.status === 'CONVERTED' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                          item.status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          item.status === 'REVISION_REQUESTED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          'bg-slate-700 text-slate-300 border-slate-600'
                        }`}>
                          {item.status === 'APPROVED' ? '✓ Đã Duyệt' :
                           item.status === 'CONVERTED' ? '✓ Đã Lên Deal' :
                           item.status === 'SUBMITTED' ? 'Chờ Duyệt' :
                           item.status === 'REVISION_REQUESTED' ? 'Cần Sửa' : 'Bản Nháp'}
                        </span>
                        {item.dealCode && (
                          <span className="block text-2xs text-purple-400 font-mono mt-0.5">{item.dealCode}</span>
                        )}
                      </td>

                      {/* Lead Notes */}
                      <td className="p-3 max-w-[180px]">
                        <p className="text-2xs text-slate-400 truncate hover:text-clip" title={item.leadNotes}>
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
                              className="p-1 rounded bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800 transition"
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
                              className="p-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isManager && (
                            <span className="text-2xs text-slate-500 italic">Chỉ xem</span>
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
            <div className="p-3.5 rounded-md bg-blue-50 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                <span>Ghi chú phản hồi cho KOC: <strong>{editingItem.kocStageName}</strong> ({editingItem.brandName})</span>
                <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Nhập yêu cầu điều chỉnh kịch bản, đổi tệp KOC hoặc dặn dò góc quay..."
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onUpdatePlanItemStatus(editingItem.id, 'REVISION_REQUESTED', editNotes)}
                  className="px-2.5 py-1 rounded text-2xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                >
                  Yêu Cầu Sửa
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-2.5 py-1 rounded text-2xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                >
                  Lưu ghi chú
                </button>
              </div>
            </div>
          )}

          {/* Feedback & Decision Box */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                Chỉ Đạo &amp; Nhận Xét Của Trưởng Phòng:
              </h4>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setIsAiReviewOpen(true)}
                  className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
                  title="Nhận xét tiến độ bằng AI API và tự động gợi ý lời phê chuẩn mực"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Đánh Giá &amp; Gợi Ý Lời Phê</span>
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={managerFeedback}
              onChange={(e) => isManager && setManagerFeedback(e.target.value)}
              disabled={!isManager}
              placeholder={isManager ? "Nhập nhận xét tổng thể về tỷ lệ lấp đầy, cân đối ngân sách và chỉ đạo nghiệp vụ cho nhân sự..." : "Chỉ Trưởng phòng mới có thẩm quyền nhập chỉ đạo nghiệp vụ."}
              className={`w-full text-xs bg-white border border-slate-300 rounded-md p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none shadow-2xs ${isManager ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed bg-slate-100'}`}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. MODAL FOOTER & MASTER APPROVAL ACTIONS                                 */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            Trạng thái hiện tại: <strong className="text-slate-900">{approvedCount}/{totalPlannedVideos} clips đã duyệt</strong> ({pendingApprovalCount} chờ duyệt)
          </div>

          {!isManager ? (
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Chế độ xem (chỉ trưởng phòng mới có quyền phê duyệt hoặc yêu cầu điều chỉnh kế hoạch)
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfirmingRevision(true)}
                className="px-3.5 py-2 rounded-md font-semibold text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1.5 shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Yêu cầu điều chỉnh kế hoạch
              </button>

              <button
                onClick={() => setIsConfirmingApproveAll(true)}
                className="px-4 py-2 rounded-md font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Phê duyệt toàn bộ kế hoạch
              </button>

              {onConvertPlanToDeals && (
                <button
                  onClick={() => setIsConfirmingConvertDeals(true)}
                  className="px-4 py-2 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm"
                  title="Khởi tạo danh sách Deal Booking từ các slot đã duyệt để bắt đầu liên hệ và gửi mẫu"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  1-Click Tạo {approvedCount} Deals Tác Nghiệp
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
  );
};
