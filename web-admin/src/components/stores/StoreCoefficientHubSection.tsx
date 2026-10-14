'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileCheck,
  Search,
  Sliders,
  ShieldCheck,
  Store as StoreIcon,
  Info,
  Check,
  Edit3,
  Calendar,
  Copy,
  Layers,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import {
  StorePortfolioItem,
  BrandDetail,
  InputPlanBreakdownState,
  UserProfile,
  StoreDifficultyTier,
  StoreCoefficientApprovalStatus,
  STORE_COEFFICIENT_TABLE_2,
  normalizeStoreCoefficient,
  getStoreCoefficientByTier,
} from '../../lib/types';
import { Button, ChannelTag, Modal, Field, Input, Textarea, Status } from '../ui';
import { formatVndShort } from '../../lib/format';

export interface StoreCoefficientHubSectionProps {
  stores: StorePortfolioItem[];
  brands?: BrandDetail[];
  plans?: InputPlanBreakdownState[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  currentUser?: UserProfile | null;
  onUpdateStore?: (updated: StorePortfolioItem) => void;
  onBulkUpdateStores?: (updatedStores: StorePortfolioItem[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  compactReferenceTable?: boolean;
}

interface MonthlyStoreCoeffSnapshot {
  tier: StoreDifficultyTier;
  multiplier: number;
  approvalStatus: StoreCoefficientApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  adjustedPlanCode?: string;
  adjustmentReason?: string;
  hasCompletedPeriodResult?: boolean;
  isDirty?: boolean;
}

const SETUP_MONTH_OPTIONS: Array<{
  value: string;
  label: string;
  badge: string;
  prevMonth: string;
  isFutureSetup?: boolean;
  isClosedPeriod?: boolean;
}> = [
  {
    value: '2026/08',
    label: 'Tháng 08/2026',
    badge: 'Đã khóa sổ',
    prevMonth: '2026/08',
    isClosedPeriod: true,
  },
  {
    value: '2026/09',
    label: 'Tháng 09/2026',
    badge: 'Đã nghiệm thu',
    prevMonth: '2026/08',
    isClosedPeriod: true,
  },
  {
    value: '2026/10',
    label: 'Tháng 10/2026',
    badge: 'Kỳ hiện hành',
    prevMonth: '2026/09',
  },
  {
    value: '2026/11',
    label: 'Tháng 11/2026 (Mega 11.11)',
    badge: 'Setup trước đầu kỳ',
    prevMonth: '2026/10',
    isFutureSetup: true,
  },
  {
    value: '2026/12',
    label: 'Tháng 12/2026 (Mega 12.12)',
    badge: 'Setup trước đầu kỳ',
    prevMonth: '2026/11',
    isFutureSetup: true,
  },
];

export const StoreCoefficientHubSection: React.FC<StoreCoefficientHubSectionProps> = ({
  stores,
  brands = [],
  plans = [],
  selectedMonth = '2026/10',
  onMonthChange,
  currentUser,
  onUpdateStore,
  onBulkUpdateStores,
  onNotify,
  compactReferenceTable = false,
}) => {
  const isManager = !currentUser || ['ADMIN', 'MANAGER', 'GROWTH_MANAGER'].includes(currentUser.role);
  const managerName = currentUser?.name || 'Đặng Thị Yến Nhi';

  const normalizedPropMonth =
    selectedMonth === 'ALL' || !selectedMonth ? '2026/10' : selectedMonth;
  const [activeMonth, setActiveMonth] = useState<string>(normalizedPropMonth);
  const [prevSelectedMonth, setPrevSelectedMonth] = useState<string>(selectedMonth);

  if (selectedMonth !== prevSelectedMonth) {
    setPrevSelectedMonth(selectedMonth);
    if (selectedMonth && selectedMonth !== 'ALL' && selectedMonth !== activeMonth) {
      setActiveMonth(selectedMonth);
    }
  }

  const handleSelectMonth = (monthVal: string) => {
    setActiveMonth(monthVal);
    setSelectedStoreIds(new Set());
    onMonthChange?.(monthVal);
  };

  const activeMonthMeta =
    SETUP_MONTH_OPTIONS.find(m => m.value === activeMonth) || SETUP_MONTH_OPTIONS[2];

  // Bảng lưu cấu hình hệ số gian hàng theo từng tháng (hỗ trợ GĐ setup trước cho tháng 11, 12...)
  const [monthlyConfigs, setMonthlyConfigs] = useState<
    Record<string, Record<string, MonthlyStoreCoeffSnapshot>>
  >({});

  // Bộ lọc bảng hệ số gian hàng
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | StoreDifficultyTier>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [leaderFilter, setLeaderFilter] = useState<string>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<
    'ALL' | 'APPROVED_START_OF_MONTH' | 'PENDING_MANAGER_APPROVAL' | 'ADJUSTED_BY_APPROVED_PLAN'
  >('ALL');
  const [scopeFilter, setScopeFilter] = useState<'B2C_ONLY' | 'ALL'>('B2C_ONLY');

  // Chế độ Setup hàng loạt của Giám đốc
  const [bulkSetupMode, setBulkSetupMode] = useState<boolean>(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [bulkReasonNote, setBulkReasonNote] = useState<string>('');

  // Modal điều chỉnh chi tiết / điều chỉnh giữa tháng có Plan duyệt
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);
  const [editTier, setEditTier] = useState<StoreDifficultyTier>('Tiêu chuẩn');
  const [editChangeMode, setEditChangeMode] = useState<'START_OF_MONTH' | 'MID_MONTH_SCOPE_CHANGE'>('START_OF_MONTH');
  const [editAdjustedPlanCode, setEditAdjustedPlanCode] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Map Brand để tra cứu 3 vị trí cấp Brand (Content/Brand main, Plan/Strategy, Key Visual/SIS)
  const brandByNameMap = useMemo(() => {
    const map = new Map<string, BrandDetail>();
    brands.forEach(b => {
      if (b.name) map.set(b.name.trim().toLowerCase(), b);
    });
    return map;
  }, [brands]);

  // Map Plan để tra cứu Plan điều chỉnh của Store trong kỳ
  const planByStoreMap = useMemo(() => {
    const map = new Map<string, InputPlanBreakdownState>();
    plans.forEach(p => {
      if (p.month !== activeMonth && p.month !== '2026/10') return;
      if (p.storeId) map.set(p.storeId, p);
      if (p.storeName) map.set(p.storeName.trim().toLowerCase(), p);
    });
    return map;
  }, [plans, activeMonth]);

  // Lấy cấu hình hệ số hiệu lực của 1 store tại tháng đang chọn
  const getEffectiveStoreView = (store: StorePortfolioItem): StorePortfolioItem & { isDirty?: boolean } => {
    const monthOverride = monthlyConfigs[activeMonth]?.[store.id];
    if (monthOverride) {
      return {
        ...store,
        difficultyTier: monthOverride.tier,
        difficultyMultiplier: monthOverride.multiplier,
        coefficientApprovalStatus: monthOverride.approvalStatus,
        coefficientApprovedBy: monthOverride.approvedBy,
        coefficientApprovedAt: monthOverride.approvedAt,
        coefficientPeriodMonth: activeMonth,
        coefficientAdjustedPlanCode: monthOverride.adjustedPlanCode,
        coefficientAdjustmentReason: monthOverride.adjustmentReason,
        hasCompletedPeriodResult: monthOverride.hasCompletedPeriodResult,
        isDirty: monthOverride.isDirty,
      };
    }

    // Mặc định cho các kỳ tương lai (2026/11, 2026/12): để ở trạng thái Chờ Giám đốc duyệt đầu tháng để GĐ setup hàng loạt trước
    if (activeMonthMeta.isFutureSetup) {
      const baseNorm = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
      return {
        ...store,
        difficultyTier: baseNorm.tier,
        difficultyMultiplier: baseNorm.multiplier,
        coefficientApprovalStatus: 'PENDING_MANAGER_APPROVAL',
        coefficientApprovedBy: undefined,
        coefficientApprovedAt: undefined,
        coefficientPeriodMonth: activeMonth,
        coefficientAdjustedPlanCode: undefined,
        coefficientAdjustmentReason: `Kế thừa dự kiến từ kỳ trước (${baseNorm.rule.definition}) — Chờ Giám đốc chốt đầu tháng ${activeMonth}`,
        hasCompletedPeriodResult: false,
      };
    }

    // Mặc định cho các kỳ đã khóa sổ (2026/08, 2026/09)
    if (activeMonthMeta.isClosedPeriod) {
      const baseNorm = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
      return {
        ...store,
        difficultyTier: baseNorm.tier,
        difficultyMultiplier: baseNorm.multiplier,
        coefficientApprovalStatus: 'APPROVED_START_OF_MONTH',
        coefficientApprovedBy: 'Đặng Thị Yến Nhi',
        coefficientApprovedAt: `${activeMonth.replace('/', '-')}-01`,
        coefficientPeriodMonth: activeMonth,
        hasCompletedPeriodResult: true,
      };
    }

    return {
      ...store,
      coefficientPeriodMonth: activeMonth,
    };
  };

  // Danh sách gian hàng thuộc phạm vi lọc (đã áp dụng cấu hình của tháng đang chọn)
  const scopedStores = useMemo(() => {
    return stores
      .filter(s => {
        if (scopeFilter === 'B2C_ONLY') {
          return Boolean(s.isB2cManaged !== false && s.requiresB2cPlan !== false);
        }
        return true;
      })
      .map(s => getEffectiveStoreView(s));
  }, [stores, scopeFilter, monthlyConfigs, activeMonth]);

  // Thống kê theo 4 mức độ Bảng 2 & trạng thái duyệt của tháng đang chọn
  const stats = useMemo(() => {
    let countBasic = 0;
    let countStandard = 0;
    let countMedium = 0;
    let countHard = 0;
    let countApprovedStart = 0;
    let countPending = 0;
    let countAdjustedPlan = 0;
    let countDirty = 0;
    let sumMultiplier = 0;

    scopedStores.forEach(s => {
      const norm = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier);
      sumMultiplier += norm.multiplier;
      if (norm.tier === 'Cơ bản') countBasic++;
      else if (norm.tier === 'Tiêu chuẩn') countStandard++;
      else if (norm.tier === 'Vừa') countMedium++;
      else if (norm.tier === 'Khó') countHard++;

      const st = s.coefficientApprovalStatus || 'APPROVED_START_OF_MONTH';
      if (st === 'PENDING_MANAGER_APPROVAL') countPending++;
      else if (st === 'ADJUSTED_BY_APPROVED_PLAN') countAdjustedPlan++;
      else countApprovedStart++;

      if (s.isDirty) countDirty++;
    });

    const avgMultiplier = scopedStores.length > 0 ? sumMultiplier / scopedStores.length : 1.0;

    return {
      total: scopedStores.length,
      countBasic,
      countStandard,
      countMedium,
      countHard,
      countApprovedStart,
      countPending,
      countAdjustedPlan,
      countDirty,
      avgMultiplier,
    };
  }, [scopedStores]);

  // Lọc danh sách hiển thị
  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedStores.filter(s => {
      const norm = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier);
      const status = s.coefficientApprovalStatus || 'APPROVED_START_OF_MONTH';

      if (tierFilter !== 'ALL' && norm.tier !== tierFilter) return false;
      if (platformFilter !== 'ALL' && s.platform !== platformFilter) return false;
      if (approvalFilter !== 'ALL' && status !== approvalFilter) return false;
      if (leaderFilter === 'HAS_LEADER' && !s.bookingLeader) return false;
      if (leaderFilter === 'DIRECT_TO_DIRECTOR' && s.bookingLeader) return false;

      if (q) {
        const brandObj = brandByNameMap.get((s.brandName || '').trim().toLowerCase());
        const hay = [
          s.storeName,
          s.brandName,
          s.storeOperationId,
          s.b2cOwnerName,
          s.bookingLeader,
          s.category,
          s.coefficientAdjustmentReason,
          brandObj?.contentBrandMainPic,
          brandObj?.planStrategyPic,
          brandObj?.keyVisualSisPic,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedStores, tierFilter, platformFilter, approvalFilter, leaderFilter, searchQuery, brandByNameMap]);

  // Ghi nhận thay đổi cấu hình hệ số cho 1 hoặc nhiều gian hàng trong tháng đang chọn
  const applyMonthlyStoreChanges = (
    targetStores: StorePortfolioItem[],
    nextTier: StoreDifficultyTier,
    options?: {
      approveImmediately?: boolean;
      customReason?: string;
      adjustedPlanCode?: string;
      statusOverride?: StoreCoefficientApprovalStatus;
    }
  ) => {
    const nextMultiplier = getStoreCoefficientByTier(nextTier);
    const rule =
      STORE_COEFFICIENT_TABLE_2.rows.find(r => r.tier === nextTier) ||
      STORE_COEFFICIENT_TABLE_2.rows[1];
    const today = new Date().toISOString().slice(0, 10);

    const updatedItems: StorePortfolioItem[] = [];
    const nextMonthMap: Record<string, MonthlyStoreCoeffSnapshot> = {
      ...(monthlyConfigs[activeMonth] || {}),
    };

    targetStores.forEach(st => {
      const nextStatus: StoreCoefficientApprovalStatus =
        options?.statusOverride ||
        (options?.approveImmediately
          ? 'APPROVED_START_OF_MONTH'
          : isManager
            ? 'APPROVED_START_OF_MONTH'
            : 'PENDING_MANAGER_APPROVAL');

      const reasonText =
        options?.customReason?.trim() ||
        bulkReasonNote.trim() ||
        rule.definition;

      nextMonthMap[st.id] = {
        tier: nextTier,
        multiplier: nextMultiplier,
        approvalStatus: nextStatus,
        approvedBy: isManager ? managerName : st.coefficientApprovedBy,
        approvedAt: isManager ? today : st.coefficientApprovedAt,
        adjustedPlanCode: options?.adjustedPlanCode,
        adjustmentReason: reasonText,
        hasCompletedPeriodResult: st.hasCompletedPeriodResult,
        isDirty: true,
      };

      const updatedStore: StorePortfolioItem = {
        ...st,
        difficultyTier: nextTier,
        difficultyMultiplier: nextMultiplier,
        coefficientApprovalStatus: nextStatus,
        coefficientApprovedBy: isManager ? managerName : st.coefficientApprovedBy,
        coefficientApprovedAt: isManager ? today : st.coefficientApprovedAt,
        coefficientPeriodMonth: activeMonth,
        coefficientAdjustedPlanCode: options?.adjustedPlanCode,
        coefficientAdjustmentReason: reasonText,
        updatedAt: new Date().toISOString(),
      };
      updatedItems.push(updatedStore);
      onUpdateStore?.(updatedStore);
    });

    setMonthlyConfigs(prev => ({
      ...prev,
      [activeMonth]: nextMonthMap,
    }));

    if (onBulkUpdateStores && updatedItems.length > 0) {
      onBulkUpdateStores(updatedItems);
    }
  };

  // Đổi nhanh hệ số 1-click ngay trên dòng của bảng (Inline Quick-Select)
  const handleInlineTierSelect = (
    store: StorePortfolioItem,
    nextTier: StoreDifficultyTier
  ) => {
    const prevNorm = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
    const nextMultiplier = getStoreCoefficientByTier(nextTier);

    if (prevNorm.tier === nextTier) return;

    // Kiểm tra nguyên tắc Bảng 2: Nếu store đã có kết quả trong kỳ và muốn nâng hệ số -> bắt buộc mở modal nhập Plan điều chỉnh
    if (store.hasCompletedPeriodResult && nextMultiplier > prevNorm.multiplier) {
      handleOpenEditModal(store, nextTier, 'MID_MONTH_SCOPE_CHANGE');
      return;
    }

    applyMonthlyStoreChanges([store], nextTier, {
      approveImmediately: isManager,
    });

    const rule =
      STORE_COEFFICIENT_TABLE_2.rows.find(r => r.tier === nextTier) ||
      STORE_COEFFICIENT_TABLE_2.rows[1];

    onNotify?.(
      `[${activeMonth}] Đã đặt hệ số gian hàng "${store.storeName}" = ${rule.multiplierLabel} (${nextTier}).`,
      'success'
    );
  };

  // Gán hệ số hàng loạt cho tất cả gian hàng đang chọn (Bulk Assign)
  const handleBulkAssignTier = (targetTier: StoreDifficultyTier) => {
    const targets = scopedStores.filter(s => selectedStoreIds.has(s.id));
    if (targets.length === 0) {
      onNotify?.('Vui lòng tích chọn ít nhất 1 gian hàng để gán hệ số hàng loạt.', 'warning');
      return;
    }

    // Tách những gian đã khóa kết quả và đang nâng hệ số (vi phạm nguyên tắc không tự nâng sau khi có kết quả)
    const targetMultiplier = getStoreCoefficientByTier(targetTier);
    const blockedStores: StorePortfolioItem[] = [];
    const validStores: StorePortfolioItem[] = [];

    targets.forEach(st => {
      const curr = normalizeStoreCoefficient(st.difficultyTier, st.difficultyMultiplier);
      if (st.hasCompletedPeriodResult && targetMultiplier > curr.multiplier) {
        blockedStores.push(st);
      } else {
        validStores.push(st);
      }
    });

    if (validStores.length > 0) {
      applyMonthlyStoreChanges(validStores, targetTier, {
        approveImmediately: isManager,
        customReason: bulkReasonNote.trim() || undefined,
      });
    }

    const rule =
      STORE_COEFFICIENT_TABLE_2.rows.find(r => r.tier === targetTier) ||
      STORE_COEFFICIENT_TABLE_2.rows[1];

    if (blockedStores.length > 0) {
      onNotify?.(
        `Đã gán mức ${targetTier} (${rule.multiplierLabel}) cho ${validStores.length} store. Có ${blockedStores.length} store đã có kết quả nghiệm thu nên không thể tự nâng hệ số nếu chưa nhập Plan điều chỉnh.`,
        'warning'
      );
    } else {
      onNotify?.(
        `[Setup hàng loạt ${activeMonth}] Đã gán mức ${targetTier} (HS ${rule.multiplierLabel}) cho ${validStores.length} gian hàng đã chọn.`,
        'success'
      );
    }
  };

  // Sao chép cấu hình hệ số từ tháng trước sang tháng đang chọn
  const handleCopyFromPreviousMonth = () => {
    const prevMonth = activeMonthMeta.prevMonth;
    const prevMap = monthlyConfigs[prevMonth] || {};
    const today = new Date().toISOString().slice(0, 10);
    const nextMonthMap: Record<string, MonthlyStoreCoeffSnapshot> = {};

    scopedStores.forEach(st => {
      const baseStore = stores.find(orig => orig.id === st.id) || st;
      const prevSnap = prevMap[st.id];
      const norm = prevSnap
        ? normalizeStoreCoefficient(prevSnap.tier, prevSnap.multiplier)
        : normalizeStoreCoefficient(baseStore.difficultyTier, baseStore.difficultyMultiplier);

      nextMonthMap[st.id] = {
        tier: norm.tier,
        multiplier: norm.multiplier,
        approvalStatus: isManager ? 'APPROVED_START_OF_MONTH' : 'PENDING_MANAGER_APPROVAL',
        approvedBy: isManager ? managerName : undefined,
        approvedAt: isManager ? today : undefined,
        adjustmentReason: `Kế thừa hệ số từ kỳ ${prevMonth} (${norm.rule.definition})`,
        hasCompletedPeriodResult: false,
        isDirty: true,
      };
    });

    setMonthlyConfigs(prev => ({
      ...prev,
      [activeMonth]: nextMonthMap,
    }));

    onNotify?.(
      `Đã sao chép toàn bộ hệ số của ${scopedStores.length} gian hàng từ kỳ ${prevMonth} sang kỳ ${activeMonth}. Giám đốc có thể chỉnh nhanh các gian thay đổi scope ngay trên bảng.`,
      'success'
    );
  };

  // Tự động gợi ý phân loại hệ số đầu tháng theo quy mô ngân sách Net & sản lượng video của từng store
  const handleAutoSuggestByScaleAndCampaign = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonthMap: Record<string, MonthlyStoreCoeffSnapshot> = {
      ...(monthlyConfigs[activeMonth] || {}),
    };

    const targetList =
      selectedStoreIds.size > 0
        ? scopedStores.filter(s => selectedStoreIds.has(s.id))
        : scopedStores;

    let cBasic = 0;
    let cStd = 0;
    let cMed = 0;
    let cHard = 0;

    targetList.forEach(st => {
      if (st.hasCompletedPeriodResult) return;
      const net = st.budgetNet ?? st.monthlyBudget ?? 0;
      const totalVids =
        (st.targetAffiliateContents || 0) +
        (st.targetSelfChannelContents || 0) +
        (st.targetFocVideos || 0);

      let suggestedTier: StoreDifficultyTier = 'Tiêu chuẩn';
      let reason = '';

      if (net >= 60_000_000 || totalVids >= 70) {
        suggestedTier = 'Khó';
        cHard++;
        reason = 'Campaign chiến lược ngân sách lớn, yêu cầu KOC/Talent hiếm và nhiều ràng buộc thương hiệu';
      } else if (net >= 22_000_000 || totalVids >= 35 || st.bookingLeader) {
        suggestedTier = 'Vừa';
        cMed++;
        reason = 'Nhiều bên phối hợp, nhiều vòng duyệt kịch bản hoặc mở rộng scope ngành hàng trong tháng';
      } else if (net >= 5_000_000 || totalVids >= 12) {
        suggestedTier = 'Tiêu chuẩn';
        cStd++;
        reason = 'Khối lượng và yêu cầu đúng benchmark thông thường, deadline tiêu chuẩn';
      } else {
        suggestedTier = 'Cơ bản';
        cBasic++;
        reason = 'Store ổn định, quy trình rõ, chủ yếu vận hành lặp lại với nguồn lực sẵn có';
      }

      const mult = getStoreCoefficientByTier(suggestedTier);
      nextMonthMap[st.id] = {
        tier: suggestedTier,
        multiplier: mult,
        approvalStatus: isManager ? 'APPROVED_START_OF_MONTH' : 'PENDING_MANAGER_APPROVAL',
        approvedBy: isManager ? managerName : undefined,
        approvedAt: isManager ? today : undefined,
        adjustmentReason: reason,
        hasCompletedPeriodResult: false,
        isDirty: true,
      };

      onUpdateStore?.({
        ...st,
        difficultyTier: suggestedTier,
        difficultyMultiplier: mult,
        coefficientApprovalStatus: isManager ? 'APPROVED_START_OF_MONTH' : 'PENDING_MANAGER_APPROVAL',
        coefficientApprovedBy: isManager ? managerName : undefined,
        coefficientApprovedAt: isManager ? today : undefined,
        coefficientPeriodMonth: activeMonth,
        coefficientAdjustmentReason: reason,
      });
    });

    setMonthlyConfigs(prev => ({
      ...prev,
      [activeMonth]: nextMonthMap,
    }));

    onNotify?.(
      `Đã thiết lập gợi ý hệ số kỳ ${activeMonth} cho ${targetList.length} gian hàng: ${cHard} Khó (1,50) • ${cMed} Vừa (1,25) • ${cStd} Tiêu chuẩn (1,00) • ${cBasic} Cơ bản (0,80).`,
      'success'
    );
  };

  // Chốt & Duyệt đầu tháng hàng loạt cho toàn bộ gian hàng trong kỳ
  const handleApproveAllStartOfMonth = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonthMap: Record<string, MonthlyStoreCoeffSnapshot> = {
      ...(monthlyConfigs[activeMonth] || {}),
    };

    const updatedList: StorePortfolioItem[] = [];

    scopedStores.forEach(st => {
      const norm = normalizeStoreCoefficient(st.difficultyTier, st.difficultyMultiplier);
      const nextStatus: StoreCoefficientApprovalStatus =
        st.coefficientApprovalStatus === 'ADJUSTED_BY_APPROVED_PLAN'
          ? 'ADJUSTED_BY_APPROVED_PLAN'
          : 'APPROVED_START_OF_MONTH';

      nextMonthMap[st.id] = {
        tier: norm.tier,
        multiplier: norm.multiplier,
        approvalStatus: nextStatus,
        approvedBy: managerName,
        approvedAt: today,
        adjustedPlanCode: st.coefficientAdjustedPlanCode,
        adjustmentReason: st.coefficientAdjustmentReason || norm.rule.definition,
        hasCompletedPeriodResult: st.hasCompletedPeriodResult,
        isDirty: false,
      };

      const updated: StorePortfolioItem = {
        ...st,
        difficultyTier: norm.tier,
        difficultyMultiplier: norm.multiplier,
        coefficientApprovalStatus: nextStatus,
        coefficientApprovedBy: managerName,
        coefficientApprovedAt: today,
        coefficientPeriodMonth: activeMonth,
        updatedAt: new Date().toISOString(),
      };
      updatedList.push(updated);
      onUpdateStore?.(updated);
    });

    setMonthlyConfigs(prev => ({
      ...prev,
      [activeMonth]: nextMonthMap,
    }));

    if (onBulkUpdateStores && updatedList.length > 0) {
      onBulkUpdateStores(updatedList);
    }

    onNotify?.(
      `Giám đốc (${managerName}) đã phê duyệt & chốt bảng Hệ số gian hàng đầu tháng cho toàn bộ ${scopedStores.length} gian hàng kỳ ${activeMonth}.`,
      'success'
    );
  };

  // Chọn / Bỏ chọn checkbox
  const toggleSelectStore = (storeId: string) => {
    setSelectedStoreIds(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const isAllFilteredSelected =
    filteredStores.length > 0 && filteredStores.every(s => selectedStoreIds.has(s.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedStoreIds(prev => {
        const next = new Set(prev);
        filteredStores.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStoreIds(prev => {
        const next = new Set(prev);
        filteredStores.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  const selectQuickGroup = (
    mode: 'TIKTOK' | 'SHOPEE' | 'PENDING' | 'LEADER_TAM' | 'CLEAR'
  ) => {
    if (mode === 'CLEAR') {
      setSelectedStoreIds(new Set());
      return;
    }
    const matched = scopedStores.filter(s => {
      if (mode === 'TIKTOK') return s.platform === 'TikTok Shop';
      if (mode === 'SHOPEE') return s.platform === 'Shopee Mall';
      if (mode === 'PENDING') return s.coefficientApprovalStatus === 'PENDING_MANAGER_APPROVAL';
      if (mode === 'LEADER_TAM') return Boolean(s.bookingLeader);
      return false;
    });
    setSelectedStoreIds(new Set(matched.map(s => s.id)));
  };

  // Mở modal điều chỉnh hệ số cho 1 gian hàng
  const handleOpenEditModal = (
    store: StorePortfolioItem,
    preselectedTier?: StoreDifficultyTier,
    forcedMode?: 'START_OF_MONTH' | 'MID_MONTH_SCOPE_CHANGE'
  ) => {
    const norm = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
    const targetTier = preselectedTier || norm.tier;
    const targetRule =
      STORE_COEFFICIENT_TABLE_2.rows.find(r => r.tier === targetTier) || norm.rule;
    const linkedPlan =
      planByStoreMap.get(store.id) ||
      planByStoreMap.get((store.storeName || '').trim().toLowerCase());
    setEditingStore(store);
    setEditTier(targetTier);
    setEditChangeMode(
      forcedMode ||
        (store.coefficientApprovalStatus === 'ADJUSTED_BY_APPROVED_PLAN'
          ? 'MID_MONTH_SCOPE_CHANGE'
          : 'START_OF_MONTH')
    );
    setEditAdjustedPlanCode(
      store.coefficientAdjustedPlanCode ||
        (linkedPlan
          ? `${linkedPlan.id} (${linkedPlan.currentVersionCode || 'v2.0'})`
          : `PLAN-${activeMonth.replace('/', '-')}-v2.0`)
    );
    setEditReason(
      preselectedTier ? targetRule.definition : store.coefficientAdjustmentReason || norm.rule.definition
    );
    setValidationError(null);
  };

  // Lưu thay đổi hệ số gian hàng từ Modal (tuân thủ nghiêm ngặt Nguyên tắc Bảng 2)
  const handleSaveStoreCoefficient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    const prevNorm = normalizeStoreCoefficient(
      editingStore.difficultyTier,
      editingStore.difficultyMultiplier
    );
    const nextMultiplier = getStoreCoefficientByTier(editTier);
    const nextRule =
      STORE_COEFFICIENT_TABLE_2.rows.find(r => r.tier === editTier) ||
      STORE_COEFFICIENT_TABLE_2.rows[1];
    const isIncreasing = nextMultiplier > prevNorm.multiplier;

    if (
      editingStore.hasCompletedPeriodResult &&
      isIncreasing &&
      editChangeMode !== 'MID_MONTH_SCOPE_CHANGE'
    ) {
      setValidationError(
        'Vi phạm nguyên tắc Bảng 2: Gian hàng đã có kết quả trong kỳ, không được tự nâng hệ số sau khi đã có kết quả. Nếu thay đổi scope lớn trong tháng, bắt buộc chuyển sang chế độ "Thay đổi scope lớn trong tháng (có Plan điều chỉnh được duyệt)".'
      );
      return;
    }

    if (editChangeMode === 'MID_MONTH_SCOPE_CHANGE') {
      if (!editAdjustedPlanCode.trim()) {
        setValidationError(
          'Bắt buộc nhập Mã Plan điều chỉnh đã được duyệt khi thay đổi hệ số giữa kỳ.'
        );
        return;
      }
      if (!editReason.trim() || editReason.trim().length < 10) {
        setValidationError(
          'Vui lòng ghi rõ nội dung thay đổi scope lớn trong tháng để lưu hồ sơ đối soát.'
        );
        return;
      }
    }

    const nextStatus: StoreCoefficientApprovalStatus =
      editChangeMode === 'MID_MONTH_SCOPE_CHANGE'
        ? 'ADJUSTED_BY_APPROVED_PLAN'
        : isManager
          ? 'APPROVED_START_OF_MONTH'
          : 'PENDING_MANAGER_APPROVAL';

    applyMonthlyStoreChanges([editingStore], editTier, {
      statusOverride: nextStatus,
      customReason: editReason.trim() || nextRule.definition,
      adjustedPlanCode:
        editChangeMode === 'MID_MONTH_SCOPE_CHANGE' ? editAdjustedPlanCode.trim() : undefined,
    });

    onNotify?.(
      `Đã cập nhật hệ số gian hàng "${editingStore.storeName}" sang mức ${editTier} (HS ${nextRule.multiplierLabel}) kỳ ${activeMonth}.`,
      'success'
    );
    setEditingStore(null);
  };

  // Duyệt nhanh đầu tháng cho 1 gian hàng
  const handleQuickApproveStore = (store: StorePortfolioItem) => {
    const norm = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
    applyMonthlyStoreChanges([store], norm.tier, {
      approveImmediately: true,
      customReason: store.coefficientAdjustmentReason || norm.rule.definition,
    });
    onNotify?.(
      `Quản lý đã duyệt hệ số đầu tháng (${norm.tier} - HS ${norm.label}) cho gian hàng ${store.storeName} kỳ ${activeMonth}.`,
      'success'
    );
  };

  const getTierBadgeClass = (tier: StoreDifficultyTier) => {
    switch (tier) {
      case 'Cơ bản':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Tiêu chuẩn':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Vừa':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'Khó':
        return 'bg-rose-50 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 0. THANH ĐIỀU KHIỂN KỲ THÁNG & SETUP HÀNG LOẠT ĐẦU THÁNG CHO GIÁM ĐỐC      */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-line rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/10 text-brand font-semibold text-xs border border-brand/20">
              <Calendar className="w-3.5 h-3.5" />
              <span>Kỳ Setup Hệ số Gian hàng:</span>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-sunken rounded-xl border border-line">
              {SETUP_MONTH_OPTIONS.map(m => {
                const isSelected = activeMonth === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleSelectMonth(m.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-surface text-ink font-semibold shadow-2xs border border-line-strong'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="text-2xs text-ink-3 font-medium">
                      · {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Copy}
                  onClick={handleCopyFromPreviousMonth}
                  title={`Sao chép toàn bộ hệ số từ kỳ ${activeMonthMeta.prevMonth} sang kỳ ${activeMonth}`}
                >
                  Sao chép từ kỳ {activeMonthMeta.prevMonth}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  icon={Layers}
                  onClick={handleAutoSuggestByScaleAndCampaign}
                  title="Tự động gợi ý phân tầng hệ số 0,80 - 1,50 theo quy mô ngân sách Net và sản lượng video của từng gian hàng"
                >
                  Gợi ý theo quy mô tháng
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  icon={ShieldCheck}
                  onClick={handleApproveAllStartOfMonth}
                >
                  Chốt &amp; Duyệt đầu tháng ({stats.countPending > 0 ? `${stats.countPending} chờ` : `Toàn bộ ${stats.total} store`})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Thanh Setup Hàng Loạt (Bulk Assign Bar) dành cho Giám đốc */}
        {isManager && (
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/25 border border-blue-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-brand" />
                Setup hàng loạt đầu tháng ({selectedStoreIds.size} store đang chọn):
              </span>

              <div className="flex flex-wrap items-center gap-1 text-2xs">
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="px-2 py-1 rounded-md bg-surface border border-line hover:border-line-strong text-ink font-medium cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Bỏ chọn danh sách lọc' : `Chọn tất cả đang lọc (${filteredStores.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickGroup('TIKTOK')}
                  className="px-2 py-1 rounded-md bg-surface border border-line hover:border-line-strong text-ink-2 hover:text-ink cursor-pointer"
                >
                  Chọn TikTok Shop
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickGroup('SHOPEE')}
                  className="px-2 py-1 rounded-md bg-surface border border-line hover:border-line-strong text-ink-2 hover:text-ink cursor-pointer"
                >
                  Chọn Shopee Mall
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickGroup('LEADER_TAM')}
                  className="px-2 py-1 rounded-md bg-surface border border-line hover:border-line-strong text-ink-2 hover:text-ink cursor-pointer"
                >
                  Nhóm Ngọc Tâm (8 gian)
                </button>
                {stats.countPending > 0 && (
                  <button
                    type="button"
                    onClick={() => selectQuickGroup('PENDING')}
                    className="px-2 py-1 rounded-md bg-amber-100/80 border border-amber-300 text-amber-950 font-semibold cursor-pointer"
                  >
                    Chọn {stats.countPending} gian chờ duyệt
                  </button>
                )}
                {selectedStoreIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => selectQuickGroup('CLEAR')}
                    className="px-2 py-1 rounded-md text-critical hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Xóa chọn
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={bulkReasonNote}
                onChange={e => setBulkReasonNote(e.target.value)}
                placeholder="Ghi chú căn cứ áp dụng chung cho lô (tùy chọn)..."
                className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-lg text-ink placeholder-ink-3 min-w-[230px] focus:outline-none focus:border-focus"
              />

              <div className="inline-flex items-center gap-1.5 flex-wrap">
                <span className="text-2xs font-semibold text-ink-2">Gán hàng loạt:</span>
                {STORE_COEFFICIENT_TABLE_2.rows.map(row => (
                  <button
                    key={row.tier}
                    type="button"
                    onClick={() => handleBulkAssignTier(row.tier)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs hover:opacity-90 ${getTierBadgeClass(
                      row.tier
                    )}`}
                    title={`Gán mức ${row.tier} (${row.multiplierLabel}) cho ${selectedStoreIds.size} gian hàng đã chọn`}
                  >
                    {row.tier} ({row.multiplierLabel})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 1. BẢNG QUY CHUẨN: BẢNG 2. HỆ SỐ GIAN HÀNG (CHÍNH XÁC THEO QUY ĐỊNH)      */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        <div className="bg-[#cfe0f5] dark:bg-blue-950/60 px-4 py-2.5 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-900 dark:text-blue-200 shrink-0" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
              {STORE_COEFFICIENT_TABLE_2.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-2xs text-slate-800 dark:text-slate-200">
            <span className="font-semibold">
              Kỳ áp dụng: {activeMonth}
            </span>
            <span>·</span>
            <span className="font-medium">
              Áp dụng theo store, không theo brand
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#e2e4e8] dark:bg-sunken text-slate-900 dark:text-ink font-semibold border-b border-line">
                <th className="py-2.5 px-4 w-36 border-r border-line text-center">Mức độ</th>
                <th className="py-2.5 px-4 w-28 border-r border-line text-center">Hệ số</th>
                <th className="py-2.5 px-4 border-r border-line min-w-[280px]">Định nghĩa</th>
                <th className="py-2.5 px-4 min-w-[220px]">Ví dụ</th>
                {!compactReferenceTable && (
                  <th className="py-2.5 px-4 w-44 border-l border-line text-center">
                    Số store kỳ {activeMonth}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {STORE_COEFFICIENT_TABLE_2.rows.map(row => {
                const countInTier =
                  row.tier === 'Cơ bản'
                    ? stats.countBasic
                    : row.tier === 'Tiêu chuẩn'
                      ? stats.countStandard
                      : row.tier === 'Vừa'
                        ? stats.countMedium
                        : stats.countHard;
                const isSelectedTier = tierFilter === row.tier;

                return (
                  <tr
                    key={row.tier}
                    onClick={() => setTierFilter(isSelectedTier ? 'ALL' : row.tier)}
                    className={`transition cursor-pointer ${
                      isSelectedTier ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-canvas/70'
                    }`}
                    title="Bấm để lọc danh sách gian hàng theo mức hệ số này"
                  >
                    <td className="py-2.5 px-4 border-r border-line text-center align-top">
                      <span className="font-semibold text-xs text-ink">
                        {row.tier}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-line text-center align-top font-mono font-semibold text-sm text-ink">
                      {row.multiplierLabel}
                    </td>
                    <td className="py-2.5 px-4 border-r border-line align-top text-ink leading-relaxed">
                      {row.definition}
                    </td>
                    <td className="py-2.5 px-4 align-top text-ink-2 leading-relaxed">
                      {row.example}
                    </td>
                    {!compactReferenceTable && (
                      <td className="py-2.5 px-4 border-l border-line text-center align-middle font-mono font-semibold text-xs text-ink">
                        {countInTier} store
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Dòng Nguyên tắc */}
              <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                <td className="py-2.5 px-4 border-r border-line text-center font-semibold text-ink align-top">
                  Nguyên tắc
                </td>
                <td className="py-2.5 px-4 border-r border-line"></td>
                <td
                  colSpan={compactReferenceTable ? 2 : 3}
                  className="py-2.5 px-4 text-ink font-medium leading-relaxed"
                >
                  {STORE_COEFFICIENT_TABLE_2.principle}
                </td>
              </tr>

              {/* Dòng Áp dụng */}
              <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                <td className="py-2.5 px-4 border-r border-line text-center font-semibold text-ink align-top">
                  Áp dụng
                </td>
                <td className="py-2.5 px-4 border-r border-line"></td>
                <td
                  colSpan={compactReferenceTable ? 2 : 3}
                  className="py-2.5 px-4 text-ink font-semibold"
                >
                  {STORE_COEFFICIENT_TABLE_2.applicationScope}{' '}
                  <span className="font-normal text-ink-2">
                    (Làm hệ số phạm vi tính điểm khối lượng cho cả đầu việc cấp Sàn và các vị trí gắn cấp Brand quy chiếu theo từng gian hàng).
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THẺ TỔNG HỢP TRẠNG THÁI DUYỆT ĐẦU THÁNG & PHÂN BỔ HỆ SỐ GIAN HÀNG      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setTierFilter('ALL')}
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            tierFilter === 'ALL'
              ? 'bg-surface border-brand ring-1 ring-brand/20'
              : 'bg-surface border-line hover:border-line-strong'
          }`}
        >
          <div className="text-2xs text-ink-3 font-medium">Tổng gian hàng kỳ {activeMonth}</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-semibold text-ink font-mono">{stats.total} store</span>
            <span className="text-xs font-semibold text-brand font-mono">
              TB: {stats.avgMultiplier.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="text-2xs text-ink-3 mt-0.5">1 store = 1 hệ số trong cùng kỳ</div>
        </button>

        <button
          type="button"
          onClick={() =>
            setApprovalFilter(
              approvalFilter === 'APPROVED_START_OF_MONTH' ? 'ALL' : 'APPROVED_START_OF_MONTH'
            )
          }
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            approvalFilter === 'APPROVED_START_OF_MONTH'
              ? 'bg-emerald-50/60 border-emerald-400'
              : 'bg-surface border-line hover:border-line-strong'
          }`}
        >
          <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
            <span>Đã duyệt đầu tháng</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
          </div>
          <div className="mt-1 text-lg font-semibold text-positive font-mono">
            {stats.countApprovedStart} / {stats.total}
          </div>
          <div className="text-2xs text-ink-3 mt-0.5">Quản lý duyệt chốt đầu kỳ</div>
        </button>

        <button
          type="button"
          onClick={() =>
            setApprovalFilter(
              approvalFilter === 'ADJUSTED_BY_APPROVED_PLAN' ? 'ALL' : 'ADJUSTED_BY_APPROVED_PLAN'
            )
          }
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            approvalFilter === 'ADJUSTED_BY_APPROVED_PLAN'
              ? 'bg-blue-50/70 border-blue-400'
              : 'bg-surface border-line hover:border-line-strong'
          }`}
        >
          <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
            <span>Điều chỉnh theo Plan</span>
            <FileCheck className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-1 text-lg font-semibold text-accent font-mono">
            {stats.countAdjustedPlan} store
          </div>
          <div className="text-2xs text-ink-3 mt-0.5">Thay đổi scope lớn có Plan duyệt</div>
        </button>

        <button
          type="button"
          onClick={() =>
            setApprovalFilter(
              approvalFilter === 'PENDING_MANAGER_APPROVAL' ? 'ALL' : 'PENDING_MANAGER_APPROVAL'
            )
          }
          className={`text-left p-3 rounded-xl border transition cursor-pointer ${
            approvalFilter === 'PENDING_MANAGER_APPROVAL'
              ? 'bg-amber-50/70 border-amber-400'
              : 'bg-surface border-line hover:border-line-strong'
          }`}
        >
          <div className="text-2xs text-ink-3 font-medium flex items-center justify-between">
            <span>Chờ quản lý duyệt</span>
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="mt-1 text-lg font-semibold text-warning font-mono">
            {stats.countPending} store
          </div>
          <div className="text-2xs text-ink-3 mt-0.5">Cần Đặng Thị Yến Nhi chốt đầu kỳ</div>
        </button>

        <div className="p-3 rounded-xl border border-line bg-surface flex flex-col justify-between">
          <div className="text-2xs text-ink-3 font-medium">Phân bổ 4 mức hệ số ({activeMonth})</div>
          <div className="grid grid-cols-4 gap-1 mt-1 text-center">
            <button
              type="button"
              onClick={() => setTierFilter(tierFilter === 'Cơ bản' ? 'ALL' : 'Cơ bản')}
              className="p-1 rounded bg-slate-100 text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              title="Cơ bản (0,80)"
            >
              <div className="text-2xs font-semibold">0,80</div>
              <div className="text-xs font-semibold font-mono">{stats.countBasic}</div>
            </button>
            <button
              type="button"
              onClick={() => setTierFilter(tierFilter === 'Tiêu chuẩn' ? 'ALL' : 'Tiêu chuẩn')}
              className="p-1 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 transition cursor-pointer"
              title="Tiêu chuẩn (1,00)"
            >
              <div className="text-2xs font-semibold">1,00</div>
              <div className="text-xs font-semibold font-mono">{stats.countStandard}</div>
            </button>
            <button
              type="button"
              onClick={() => setTierFilter(tierFilter === 'Vừa' ? 'ALL' : 'Vừa')}
              className="p-1 rounded bg-amber-50 text-amber-900 hover:bg-amber-100 transition cursor-pointer"
              title="Vừa (1,25)"
            >
              <div className="text-2xs font-semibold">1,25</div>
              <div className="text-xs font-semibold font-mono">{stats.countMedium}</div>
            </button>
            <button
              type="button"
              onClick={() => setTierFilter(tierFilter === 'Khó' ? 'ALL' : 'Khó')}
              className="p-1 rounded bg-rose-50 text-rose-800 hover:bg-rose-100 transition cursor-pointer"
              title="Khó (1,50)"
            >
              <div className="text-2xs font-semibold">1,50</div>
              <div className="text-xs font-semibold font-mono">{stats.countHard}</div>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BẢNG QUẢN TRỊ & SETUP HỆ SỐ GIAN HÀNG HÀNG LOẠT THEO TỪNG STORE        */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden">
        {/* Thanh công cụ lọc & bật/tắt chế độ chọn nhanh */}
        <div className="p-3.5 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                placeholder="Tìm store, brand, PIC cấp Sàn / cấp Brand..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-lg text-ink placeholder-ink-3 focus:outline-none focus:border-focus"
              />
            </div>

            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as 'ALL' | StoreDifficultyTier)}
              className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:border-focus"
            >
              <option value="ALL">Mọi mức độ (0,80 – 1,50)</option>
              <option value="Cơ bản">Cơ bản (0,80)</option>
              <option value="Tiêu chuẩn">Tiêu chuẩn (1,00)</option>
              <option value="Vừa">Vừa (1,25)</option>
              <option value="Khó">Khó (1,50)</option>
            </select>

            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:border-focus"
            >
              <option value="ALL">Tất cả sàn</option>
              <option value="TikTok Shop">TikTok Shop</option>
              <option value="Shopee Mall">Shopee Mall</option>
              <option value="Lazada">Lazada</option>
            </select>

            <select
              value={leaderFilter}
              onChange={e => setLeaderFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:border-focus"
            >
              <option value="ALL">Mọi cơ cấu nhóm</option>
              <option value="HAS_LEADER">Có Trưởng nhóm (Ngọc Tâm)</option>
              <option value="DIRECT_TO_DIRECTOR">Báo cáo trực tiếp GĐ (Không có Leader)</option>
            </select>

            <select
              value={approvalFilter}
              onChange={e => setApprovalFilter(e.target.value as typeof approvalFilter)}
              className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:border-focus"
            >
              <option value="ALL">Tất cả trạng thái duyệt</option>
              <option value="APPROVED_START_OF_MONTH">Đã duyệt đầu tháng</option>
              <option value="ADJUSTED_BY_APPROVED_PLAN">Điều chỉnh theo Plan</option>
              <option value="PENDING_MANAGER_APPROVAL">Chờ quản lý duyệt</option>
            </select>

            <div className="inline-flex p-0.5 bg-sunken rounded-lg border border-line text-2xs font-medium">
              <button
                type="button"
                onClick={() => setScopeFilter('B2C_ONLY')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  scopeFilter === 'B2C_ONLY'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Gian B2C ({stores.filter(s => s.isB2cManaged !== false && s.requiresB2cPlan !== false).length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  scopeFilter === 'ALL'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Tất cả ({stores.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isManager && (
              <button
                type="button"
                onClick={() => setBulkSetupMode(v => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  bulkSetupMode
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface text-ink border-line-strong'
                }`}
              >
                {bulkSetupMode ? 'Đang bật: Setup nhanh trên dòng' : 'Bật Setup nhanh trên dòng'}
              </button>
            )}
            <span className="text-2xs text-ink-3">
              Hiển thị <strong className="text-ink">{filteredStores.length}</strong> / {scopedStores.length} store
            </span>
          </div>
        </div>

        {/* Bảng chi tiết từng Store */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-sunken/70 border-b border-line text-ink-2 font-semibold text-2xs">
                {isManager && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      className="inline-flex items-center justify-center text-ink-2 hover:text-ink cursor-pointer"
                      title="Chọn / Bỏ chọn tất cả gian hàng đang hiển thị"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-brand" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-2.5 px-3 min-w-[200px]">Gian hàng (Store) &amp; Sàn</th>
                <th className="py-2.5 px-3 text-center min-w-[220px]">
                  {isManager && bulkSetupMode
                    ? `Setup nhanh Hệ số kỳ ${activeMonth} (Bấm chọn trực tiếp)`
                    : 'Mức độ & Hệ số (Bảng 2)'}
                </th>
                <th className="py-2.5 px-3 min-w-[210px]">Phạm vi áp dụng: Việc cấp Sàn &amp; cấp Brand</th>
                <th className="py-2.5 px-3 min-w-[240px]">Định nghĩa áp dụng &amp; Plan điều chỉnh</th>
                <th className="py-2.5 px-3 text-right w-28">Hạn mức Net</th>
                <th className="py-2.5 px-3 text-center w-40">Trạng thái duyệt kỳ {activeMonth}</th>
                <th className="py-2.5 px-3 text-right w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="py-12 text-center text-ink-3">
                    <StoreIcon className="w-7 h-7 mx-auto mb-2 text-line-strong" />
                    <p className="font-medium text-ink">Không có gian hàng nào khớp bộ lọc</p>
                  </td>
                </tr>
              ) : (
                filteredStores.map(store => {
                  const norm = normalizeStoreCoefficient(
                    store.difficultyTier,
                    store.difficultyMultiplier
                  );
                  const approvalStatus =
                    store.coefficientApprovalStatus || 'APPROVED_START_OF_MONTH';
                  const brandObj = brandByNameMap.get(
                    (store.brandName || '').trim().toLowerCase()
                  );
                  const storePic =
                    store.b2cOwners?.[0] || store.b2cOwnerName || 'Lê Phương Thảo';
                  const contentMainPic =
                    brandObj?.contentBrandMainPic || store.contentPic || 'Quỳnh Như';
                  const planStratPic = brandObj?.planStrategyPic || 'Nguyễn Thị Ngọc Tâm';
                  const kvSisPic = brandObj?.keyVisualSisPic || 'Vũ Hoài Lâm';
                  const netBudget = store.budgetNet ?? store.monthlyBudget ?? 0;
                  const isChecked = selectedStoreIds.has(store.id);

                  return (
                    <tr
                      key={store.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-blue-50/40 dark:bg-blue-950/20'
                          : 'hover:bg-canvas/70'
                      }`}
                    >
                      {/* Checkbox chọn hàng loạt */}
                      {isManager && (
                        <td className="py-3 px-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => toggleSelectStore(store.id)}
                            className="inline-flex items-center justify-center text-ink-2 hover:text-brand cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-brand" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* 1. Store & Sàn */}
                      <td className="py-3 px-3 align-top">
                        <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                          <span>{store.storeName}</span>
                          {store.isDirty && (
                            <span className="text-brand text-2xs font-medium">
                              · Vừa cập nhật
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <ChannelTag channel={store.platform} />
                          <span className="text-2xs text-ink-2 font-medium">{store.brandName}</span>
                          {store.hasCompletedPeriodResult && (
                            <span
                              className="inline-flex items-center gap-0.5 text-ink-3 text-2xs font-medium"
                              title="Store đã có kết quả nghiệm thu trong kỳ — Khóa tự nâng hệ số nếu không có Plan điều chỉnh được duyệt"
                            >
                              · <Lock className="w-2.5 h-2.5" /> Đã có KQ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Setup nhanh 4 mức Hệ số trên dòng (hoặc hiển thị chữ thuần) */}
                      <td className="py-3 px-3 text-center align-middle">
                        {isManager && bulkSetupMode ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-sunken border border-line">
                              {STORE_COEFFICIENT_TABLE_2.rows.map(r => {
                                const isActive = norm.tier === r.tier;
                                return (
                                  <button
                                    key={r.tier}
                                    type="button"
                                    onClick={() => handleInlineTierSelect(store, r.tier)}
                                    className={`px-2 py-1 rounded-lg font-mono text-xs transition cursor-pointer ${
                                      isActive
                                        ? `${getTierBadgeClass(r.tier)} font-semibold shadow-2xs ring-1 ring-ink/10`
                                        : 'text-ink-3 hover:text-ink hover:bg-surface/60 font-medium'
                                    }`}
                                    title={`${r.tier} (${r.multiplierLabel}): ${r.definition}`}
                                  >
                                    {r.multiplierLabel}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-2xs font-semibold text-ink-2">
                              Mức: <span className="text-ink">{norm.tier}</span> ({norm.label})
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-ink">{norm.tier}</span>
                            <span className="text-ink-3">·</span>
                            <span className="font-mono font-semibold text-sm text-ink">{norm.label}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Phạm vi áp dụng: Việc cấp Sàn & cấp Brand (tính theo Store) */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-2xs">
                          <span className="font-semibold text-ink">Cấp Sàn (Booking/FOC):</span>{' '}
                          <span className="text-ink-2">{storePic}</span>
                          {store.bookingLeader ? (
                            <span className="text-ink-3"> (Lead: {store.bookingLeader})</span>
                          ) : (
                            <span className="text-ink-3"> (Trực tiếp GĐ)</span>
                          )}
                        </div>
                        <div className="mt-1 text-2xs text-ink-3">
                          Content: <span className="text-ink-2">{contentMainPic}</span> · Plan: <span className="text-ink-2">{planStratPic}</span> · KV/SIS: <span className="text-ink-2">{kvSisPic}</span>
                        </div>
                      </td>

                      {/* 4. Định nghĩa & Lý do / Plan điều chỉnh */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-xs text-ink leading-snug">
                          {store.coefficientAdjustmentReason || norm.rule.definition}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">
                          Ví dụ chuẩn: <span className="italic">{norm.rule.example}</span>
                        </div>
                        {store.coefficientAdjustedPlanCode && (
                          <div className="mt-1 inline-flex items-center gap-1 text-accent text-2xs font-semibold">
                            <FileCheck className="w-3 h-3" />
                            <span>Plan điều chỉnh: <span className="font-code">{store.coefficientAdjustedPlanCode}</span></span>
                          </div>
                        )}
                      </td>

                      {/* 5. Hạn mức Net */}
                      <td className="py-3 px-3 text-right align-middle font-mono">
                        <div className="font-semibold text-ink">{formatVndShort(netBudget)}</div>
                        <div className="text-2xs text-ink-3">
                          {(store.targetAffiliateContents || 0) +
                            (store.targetSelfChannelContents || 0) +
                            (store.targetFocVideos || 0)}{' '}
                          video
                        </div>
                      </td>

                      {/* 6. Trạng thái duyệt đầu tháng */}
                      <td className="py-3 px-3 text-center align-middle">
                        {approvalStatus === 'APPROVED_START_OF_MONTH' ? (
                          <div>
                            <Status tone="positive">Đã duyệt đầu tháng</Status>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {store.coefficientApprovedBy || 'Đặng Thị Yến Nhi'} •{' '}
                              {store.coefficientApprovedAt || `${activeMonth.replace('/', '-')}-01`}
                            </div>
                          </div>
                        ) : approvalStatus === 'ADJUSTED_BY_APPROVED_PLAN' ? (
                          <div>
                            <Status tone="info">Đã duyệt theo Plan</Status>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {store.coefficientApprovedBy || 'Đặng Thị Yến Nhi'} •{' '}
                              {store.coefficientApprovedAt || `${activeMonth.replace('/', '-')}-09`}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Status tone="warning">Chờ GĐ chốt đầu tháng</Status>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              Bấm chọn hệ số hoặc Duyệt
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Thao tác */}
                      <td className="py-3 px-3 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManager && approvalStatus === 'PENDING_MANAGER_APPROVAL' && (
                            <button
                              type="button"
                              onClick={() => handleQuickApproveStore(store)}
                              className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                              title="Quản lý duyệt chốt hệ số đầu tháng"
                            >
                              <Check className="w-3 h-3" />
                              <span>Duyệt</span>
                            </button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Edit3}
                            onClick={() => handleOpenEditModal(store)}
                            className="h-7 px-2.5 text-2xs"
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL CẤU HÌNH / DUYỆT ĐIỀU CHỈNH HỆ SỐ GIAN HÀNG (THEO NGUYÊN TẮC BẢNG 2) */}
      {/* ========================================================================= */}
      {editingStore && (
        <Modal
          open={Boolean(editingStore)}
          onClose={() => setEditingStore(null)}
          title={`Cấu hình & Duyệt Hệ số Gian hàng — ${editingStore.storeName}`}
          description={`Kỳ áp dụng: ${activeMonth} • Áp dụng theo store (${editingStore.platform}), không theo brand`}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditingStore(null)}>
                Đóng
              </Button>
              <Button variant="primary" onClick={handleSaveStoreCoefficient}>
                {isManager ? 'Duyệt & Lưu hệ số gian hàng' : 'Gửi đề xuất duyệt hệ số'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveStoreCoefficient} className="space-y-4">
            {/* Thông báo nguyên tắc Bảng 2 */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Nguyên tắc quản trị Hệ số gian hàng (Bảng 2):</span>
              </div>
              <p className="text-2xs leading-relaxed text-amber-900">
                {STORE_COEFFICIENT_TABLE_2.principle}
              </p>
            </div>

            {editingStore.hasCompletedPeriodResult && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Gian hàng đã có kết quả trong kỳ:</span> Theo quy định Bảng 2,{' '}
                  <strong>không tự nâng hệ số sau khi đã có kết quả</strong>. Chỉ được phép điều chỉnh khi có{' '}
                  <strong>Plan điều chỉnh được duyệt</strong> do thay đổi scope lớn trong tháng.
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-3 rounded-xl bg-critical-soft border border-critical/30 text-xs text-critical font-medium">
                {validationError}
              </div>
            )}

            {/* Chọn chế độ duyệt đầu tháng hay điều chỉnh scope trong tháng */}
            <Field label="Hình thức phê duyệt hệ số trong kỳ *">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditChangeMode('START_OF_MONTH');
                    setValidationError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    editChangeMode === 'START_OF_MONTH'
                      ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-300'
                      : 'bg-surface border-line hover:border-line-strong'
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">1. Duyệt hệ số đầu tháng</div>
                  <div className="text-2xs text-ink-3 mt-0.5">
                    Quản lý phê duyệt hệ số cố định cho store vào đầu kỳ kế hoạch ({activeMonth}).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditChangeMode('MID_MONTH_SCOPE_CHANGE');
                    setValidationError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    editChangeMode === 'MID_MONTH_SCOPE_CHANGE'
                      ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-300'
                      : 'bg-surface border-line hover:border-line-strong'
                  }`}
                >
                  <div className="text-xs font-semibold text-ink">
                    2. Thay đổi scope lớn trong tháng (Có Plan điều chỉnh)
                  </div>
                  <div className="text-2xs text-ink-3 mt-0.5">
                    Áp dụng khi mở rộng scope/ngành hàng lớn giữa tháng và đã có Plan điều chỉnh được duyệt.
                  </div>
                </button>
              </div>
            </Field>

            {/* Chọn 1 trong 4 mức hệ số Bảng 2 */}
            <Field label="Chọn mức độ & Hệ số gian hàng (Bảng 2) *">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STORE_COEFFICIENT_TABLE_2.rows.map(row => {
                  const active = editTier === row.tier;
                  return (
                    <button
                      key={row.tier}
                      type="button"
                      onClick={() => {
                        setEditTier(row.tier);
                        setEditReason(row.definition);
                        setValidationError(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? 'bg-accent-soft/60 border-accent ring-2 ring-accent/20'
                          : 'bg-surface border-line hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">
                          {row.tier}
                        </span>
                        <span className="font-mono font-semibold text-sm text-ink">
                          Hệ số: {row.multiplierLabel}
                        </span>
                      </div>
                      <p className="text-2xs text-ink mt-1.5 leading-snug">{row.definition}</p>
                      <p className="text-2xs text-ink-3 mt-1 italic">VD: {row.example}</p>
                    </button>
                  );
                })}
              </div>
            </Field>

            {editChangeMode === 'MID_MONTH_SCOPE_CHANGE' && (
              <Field
                label="Mã Plan điều chỉnh đã được duyệt *"
                hint="Theo nguyên tắc Bảng 2: Nếu thay đổi scope lớn trong tháng, bắt buộc phải có Plan điều chỉnh được duyệt."
              >
                <Input
                  required
                  value={editAdjustedPlanCode}
                  onChange={e => setEditAdjustedPlanCode(e.target.value)}
                  placeholder="VD: PLAN-2026-10-v2.0 (Bản điều chỉnh mở rộng scope)"
                  className="font-code"
                />
              </Field>
            )}

            <Field label="Căn cứ áp dụng / Lý do thay đổi scope *">
              <Textarea
                rows={3}
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="Ghi rõ căn cứ xếp mức hệ số gian hàng hoặc nội dung thay đổi scope lớn trong tháng..."
              />
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
};
