'use client';

import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import {
  KocListingItem,
  KocListingDiscussionItem,
  ListingBatchCycle,
  BrandListingStatus,
  KocNegotiationStatus,
  ListingItemStatus,
  AirVideoStage,
  UserRole,
  SalaryGrade,
  InputPlanBreakdownState,
  StorePortfolioItem,
  KocItem,
  BookingDealItem
} from '@/lib/types';
import { ConfirmDialog, PageActions, Button, Presence } from '../ui';
import { formatVnd, formatVndShort } from '../../lib/format';
import { StoreShortlistFilterModal } from '../shortlist/StoreShortlistFilterModal';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { INITIAL_MONTHLY_PLANS } from '@/lib/monthlyPlanData';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS, INITIAL_DEALS } from '@/lib/mockData';
import {
  Filter,
  Search,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  Film,
  Calendar,
  Layers,
  ShieldCheck,
  RotateCcw,
  FileText,
  MessageSquare,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ArrowUpRight
} from 'lucide-react';

export interface ListingPlanContext {
  planId?: string;
  storeName?: string;
  monthKey?: string;
  salaryGrade?: SalaryGrade;
  nonce?: number;
}

interface KocListingBatchHubViewProps {
  listings: KocListingItem[];
  onUpdateListings: (updated: KocListingItem[]) => void;
  onGenerateDeal?: (item: KocListingItem) => void;
  currentRole?: UserRole;
  currentUserName?: string;
  monthlyPlans?: InputPlanBreakdownState[];
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  activePlanContext?: ListingPlanContext | null;
  onOpenPlanStudio?: (plan: InputPlanBreakdownState) => void;
}

const KL_GRADE_ORDER: Array<{ code: SalaryGrade; label: string; defaultCost: number; defaultTier: KocListingItem['tier'] }> = [
  { code: 'KL1', label: 'KL1 (< 500K)', defaultCost: 400000, defaultTier: 'NANO' },
  { code: 'KL2', label: 'KL2 (500K - 1.5M)', defaultCost: 1000000, defaultTier: 'NANO' },
  { code: 'KL3', label: 'KL3 (1.5M - 3M)', defaultCost: 2200000, defaultTier: 'MICRO' },
  { code: 'KL4', label: 'KL4 (3M - 6M)', defaultCost: 4500000, defaultTier: 'MICRO' },
  { code: 'KL5', label: 'KL5 (6M - 12M)', defaultCost: 8500000, defaultTier: 'MACRO' },
  { code: 'KL6', label: 'KL6 (12M - 25M)', defaultCost: 16000000, defaultTier: 'MACRO' },
  { code: 'KL7', label: 'KL7 (> 25M)', defaultCost: 30000000, defaultTier: 'MEGA' },
  { code: 'TAP UpAffiliate', label: 'FOC / TAP (0đ)', defaultCost: 0, defaultTier: 'NANO' },
];

function inferSalaryGradeFromFee(fee: number, existingGrade?: SalaryGrade): SalaryGrade {
  if (existingGrade) return existingGrade;
  if (!fee || fee <= 0) return 'TAP UpAffiliate';
  if (fee < 500000) return 'KL1';
  if (fee <= 1500000) return 'KL2';
  if (fee <= 3000000) return 'KL3';
  if (fee <= 6000000) return 'KL4';
  if (fee <= 12000000) return 'KL5';
  if (fee <= 25000000) return 'KL6';
  return 'KL7';
}

export function KocListingBatchHubView({
  listings,
  onUpdateListings,
  onGenerateDeal,
  currentRole,
  currentUserName = 'Quản trị viên',
  monthlyPlans = INITIAL_MONTHLY_PLANS,
  stores = INITIAL_STORE_PORTFOLIOS,
  kocs = INITIAL_KOCS,
  deals = INITIAL_DEALS,
  activePlanContext,
  onOpenPlanStudio,
}: KocListingBatchHubViewProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'LISTING_APPROVAL' | 'AIR_TRACKER'>('LISTING_APPROVAL');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [selectedCycle, setSelectedCycle] = useState<ListingBatchCycle | 'ALL'>('ALL');
  const [selectedStore, setSelectedStore] = useState<string>('Kutieskin Chính Hãng - TikTok Shop');
  const [selectedGrade, setSelectedGrade] = useState<SalaryGrade | 'ALL'>('ALL');
  const [selectedOverallStatus, setSelectedOverallStatus] = useState<ListingItemStatus | 'ALL'>('ALL');
  const [selectedBrandStatus, setSelectedBrandStatus] = useState<string>('ALL');
  const [selectedKocStatus, setSelectedKocStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Plan vs Listing KL matrix collapse state
  const [isKlMatrixExpanded, setIsKlMatrixExpanded] = useState<boolean>(true);
  const [shortlistTargetGrade, setShortlistTargetGrade] = useState<SalaryGrade | undefined>(undefined);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterOnlyDuplicates, setFilterOnlyDuplicates] = useState<boolean>(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showShortlistModal, setShowShortlistModal] = useState<boolean>(false);
  const [showAirUpdateModal, setShowAirUpdateModal] = useState<boolean>(false);
  const [selectedListingForAir, setSelectedListingForAir] = useState<KocListingItem | null>(null);
  const [approvingItem, setApprovingItem] = useState<KocListingItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<KocListingItem | null>(null);
  const [isKocReportOpen, setIsKocReportOpen] = useState<boolean>(false);

  // Drawer/Modal trao đổi & duyệt chi tiết 1 KOC Listing (Submit Brand -> Duyệt & Đàm phán -> Final Approve)
  const [inspectingListingId, setInspectingListingId] = useState<string | null>(null);
  const [discussionInput, setDiscussionInput] = useState<string>('');
  const [discussionRole, setDiscussionRole] = useState<'BOOKING' | 'BRAND' | 'LEADER'>('BOOKING');

  // Sync when navigated from Plan Final (InputPlanBreakdownView / MonthlyPlanHub)
  const [prevPlanContext, setPrevPlanContext] = useState(activePlanContext);
  if (activePlanContext !== prevPlanContext) {
    setPrevPlanContext(activePlanContext);
    if (activePlanContext) {
      if (activePlanContext.monthKey) setSelectedMonth(activePlanContext.monthKey);
      if (activePlanContext.storeName) setSelectedStore(activePlanContext.storeName);
      if (activePlanContext.salaryGrade) {
        setSelectedGrade(activePlanContext.salaryGrade);
      } else {
        setSelectedGrade('ALL');
      }
      setActiveSubTab('LISTING_APPROVAL');
      setIsKlMatrixExpanded(true);
    }
  }

  // New KOC form state
  const [newKocForm, setNewKocForm] = useState<{
    storeName: string;
    brandName: string;
    batchCycle: ListingBatchCycle;
    salaryGrade: SalaryGrade;
    kocName: string;
    kocHandle: string;
    channel: KocListingItem['channel'];
    followersCount: number;
    tier: KocListingItem['tier'];
    pillarName: string;
    videoFormat: string;
    proposedFee: number;
    expectedAirDate: string;
  }>({
    storeName: 'Kutieskin Chính Hãng - TikTok Shop',
    brandName: 'Kutieskin',
    batchCycle: 'BATCH_30',
    salaryGrade: 'KL4',
    kocName: '',
    kocHandle: '',
    channel: 'TikTok Shop',
    followersCount: 150000,
    tier: 'MICRO',
    pillarName: 'Chăm sóc da bé mẩn ngứa',
    videoFormat: 'Review & Hướng dẫn sử dụng',
    proposedFee: 4500000,
    expectedAirDate: '2026-10-25'
  });

  // Unique list of stores combining listings + monthlyPlans + B2C stores
  const storeOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((item) => {
      if (item.storeName) set.add(item.storeName);
    });
    monthlyPlans.forEach((p) => {
      if (p.storeName) set.add(p.storeName);
      else if (p.brandName) set.add(p.brandName);
    });
    stores.forEach((s) => {
      if (s.isB2cManaged !== false && s.storeName) set.add(s.storeName);
    });
    return Array.from(set);
  }, [listings, monthlyPlans, stores]);

  // Tìm Plan Final tương ứng với Gian hàng & Tháng đang chọn
  const matchedPlanFinal = useMemo(() => {
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    if (selectedStore === 'ALL') return null;
    const sLower = selectedStore.trim().toLowerCase();
    return (
      monthlyPlans.find(
        (p) =>
          p.month === targetMonth &&
          ((p.storeName && p.storeName.trim().toLowerCase() === sLower) ||
            (p.brandName && sLower.includes(p.brandName.trim().toLowerCase())) ||
            (p.brandName && p.brandName.trim().toLowerCase().includes(sLower.split('_')[0])))
      ) || null
    );
  }, [monthlyPlans, selectedMonth, selectedStore]);

  // Tìm StorePortfolioItem tương ứng để truyền vào Shortlist Modal
  const matchedStoreObj = useMemo(() => {
    if (selectedStore === 'ALL') return stores[0];
    const sLower = selectedStore.trim().toLowerCase();
    return (
      stores.find(
        (s) =>
          s.storeName.trim().toLowerCase() === sLower ||
          (matchedPlanFinal?.storeId && s.id === matchedPlanFinal.storeId) ||
          sLower.includes(s.brandName.trim().toLowerCase())
      ) || stores[0]
    );
  }, [stores, selectedStore, matchedPlanFinal]);

  // Bảng đối soát Plan Final vs. Thực tế Listing theo từng Khung lương KL (KL1 -> KL7 & FOC)
  const klTrackingRows = useMemo(() => {
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    // Các plan áp dụng (1 gian hàng hoặc tất cả gian hàng trong tháng)
    const relevantPlans = matchedPlanFinal
      ? [matchedPlanFinal]
      : monthlyPlans.filter((p) => p.month === targetMonth);

    // Các listing thuộc phạm vi gian hàng & tháng (không bị lọc bởi selectedGrade để giữ nguyên bảng tổng hợp KL)
    const storeListings = listings.filter((item) => {
      if (selectedMonth !== 'ALL' && item.monthKey !== selectedMonth) return false;
      if (selectedCycle !== 'ALL' && item.batchCycle !== selectedCycle) return false;
      if (selectedStore !== 'ALL' && item.storeName !== selectedStore) return false;
      return true;
    });

    return KL_GRADE_ORDER.map((klDef) => {
      // Gom định mức từ Plan Final cho khung lương này
      let planQty = 0;
      let planBudget = 0;
      let benchmarkUnitCost = klDef.defaultCost;
      const assignedPicSet = new Set<string>();

      relevantPlans.forEach((plan) => {
        (plan.items || []).forEach((row) => {
          const isPaidOrTapRow =
            row.channel === 'TIKTOK' || row.category === 'KOC_TIER' || row.tierCode.includes('TAP');
          if (!isPaidOrTapRow) return;

          const rowGrade: SalaryGrade =
            row.salaryGrade ||
            (row.tierCode.includes('TAP')
              ? 'TAP UpAffiliate'
              : (row.tierCode as SalaryGrade));

          if (rowGrade === klDef.code) {
            planQty += row.qty || 0;
            planBudget += row.totalBudget || 0;
            if (row.unitCost && row.unitCost > 0) {
              benchmarkUnitCost = row.unitCost;
            }
            if (row.assignedStaff) assignedPicSet.add(row.assignedStaff);
          }
        });
      });

      // Gom số liệu thực tế từ danh sách KOC Listing
      const itemsInGrade = storeListings.filter(
        (l) => inferSalaryGradeFromFee(l.finalFee || l.proposedFee, l.salaryGrade) === klDef.code
      );

      const draftCount = itemsInGrade.filter((l) => l.overallStatus === 'DRAFT').length;
      const submittedCount = itemsInGrade.filter((l) => l.overallStatus === 'SUBMITTED').length;
      const finalApprovedCount = itemsInGrade.filter((l) => l.overallStatus === 'FINAL_APPROVED').length;
      const droppedCount = itemsInGrade.filter((l) => l.overallStatus === 'DROPPED').length;
      const activeListedCount = draftCount + submittedCount + finalApprovedCount;

      const listedBudget = itemsInGrade
        .filter((l) => l.overallStatus !== 'DROPPED')
        .reduce((sum, l) => sum + (l.finalFee || l.proposedFee || 0), 0);
      const approvedBudget = itemsInGrade
        .filter((l) => l.overallStatus === 'FINAL_APPROVED')
        .reduce((sum, l) => sum + (l.finalFee || l.proposedFee || 0), 0);

      const remainingToList = Math.max(0, planQty - activeListedCount);
      const remainingToFinal = Math.max(0, planQty - finalApprovedCount);
      const budgetVariance = listedBudget - planBudget;

      return {
        code: klDef.code,
        label: klDef.label,
        defaultTier: klDef.defaultTier,
        benchmarkUnitCost,
        planQty,
        planBudget,
        draftCount,
        submittedCount,
        finalApprovedCount,
        droppedCount,
        activeListedCount,
        listedBudget,
        approvedBudget,
        remainingToList,
        remainingToFinal,
        budgetVariance,
        assignedPics: Array.from(assignedPicSet),
      };
    });
  }, [matchedPlanFinal, monthlyPlans, listings, selectedMonth, selectedCycle, selectedStore]);

  const klTotals = useMemo(() => {
    return klTrackingRows.reduce(
      (acc, r) => ({
        planQty: acc.planQty + r.planQty,
        planBudget: acc.planBudget + r.planBudget,
        draftCount: acc.draftCount + r.draftCount,
        submittedCount: acc.submittedCount + r.submittedCount,
        finalApprovedCount: acc.finalApprovedCount + r.finalApprovedCount,
        droppedCount: acc.droppedCount + r.droppedCount,
        activeListedCount: acc.activeListedCount + r.activeListedCount,
        listedBudget: acc.listedBudget + r.listedBudget,
        approvedBudget: acc.approvedBudget + r.approvedBudget,
        remainingToList: acc.remainingToList + r.remainingToList,
      }),
      {
        planQty: 0,
        planBudget: 0,
        draftCount: 0,
        submittedCount: 0,
        finalApprovedCount: 0,
        droppedCount: 0,
        activeListedCount: 0,
        listedBudget: 0,
        approvedBudget: 0,
        remainingToList: 0,
      }
    );
  }, [klTrackingRows]);

  // Kiểm tra trùng lặp KOC giữa các nhân sự listing
  const duplicateHandleMap = useMemo(() => {
    const map = new Map<string, KocListingItem[]>();
    listings.forEach((item) => {
      const handle = (item.kocHandle || '').toLowerCase().trim().replace('@', '');
      const brand = (item.brandName || '').toLowerCase().trim();
      if (handle.length > 2) {
        const key = `${handle}|${brand}|${item.monthKey}`;
        const list = map.get(key) || [];
        list.push(item);
        map.set(key, list);
      }
    });
    return map;
  }, [listings]);

  const totalDuplicateListingsCount = useMemo(() => {
    let count = 0;
    duplicateHandleMap.forEach((items) => {
      if (items.length > 1) {
        count += items.length;
      }
    });
    return count;
  }, [duplicateHandleMap]);

  // Kiểm tra trùng lặp thời gian thực khi tạo mới KOC vào đợt listing
  const newKocDuplicate = useMemo(() => {
    if (!newKocForm.kocHandle.trim() && !newKocForm.kocName.trim()) return null;
    const cleanHandle = newKocForm.kocHandle.trim().toLowerCase().replace('@', '');
    const cleanName = newKocForm.kocName.trim().toLowerCase();

    return listings.find((item) => {
      const itemHandle = (item.kocHandle || '').toLowerCase().trim().replace('@', '');
      const itemName = (item.kocName || '').toLowerCase().trim();
      const isSameBrand = item.brandName.toLowerCase().trim() === newKocForm.brandName.toLowerCase().trim();
      const isSameCycle = item.batchCycle === newKocForm.batchCycle;

      const handleMatch = cleanHandle.length > 2 && itemHandle === cleanHandle;
      const nameMatch = cleanName.length > 3 && itemName === cleanName;

      return (handleMatch || nameMatch) && isSameBrand && isSameCycle;
    });
  }, [newKocForm.kocHandle, newKocForm.kocName, newKocForm.brandName, newKocForm.batchCycle, listings]);

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (filterOnlyDuplicates) {
        const handle = (item.kocHandle || '').toLowerCase().trim().replace('@', '');
        const brand = (item.brandName || '').toLowerCase().trim();
        const key = `${handle}|${brand}|${item.monthKey}`;
        const dups = duplicateHandleMap.get(key);
        if (!dups || dups.length <= 1) return false;
      }
      if (selectedMonth !== 'ALL' && item.monthKey !== selectedMonth) return false;
      if (selectedCycle !== 'ALL' && item.batchCycle !== selectedCycle) return false;
      if (selectedStore !== 'ALL' && item.storeName !== selectedStore) return false;
      if (selectedGrade !== 'ALL') {
        const itemGrade = inferSalaryGradeFromFee(item.finalFee || item.proposedFee, item.salaryGrade);
        if (itemGrade !== selectedGrade) return false;
      }
      if (selectedOverallStatus !== 'ALL' && item.overallStatus !== selectedOverallStatus) return false;
      if (selectedBrandStatus !== 'ALL' && item.brandApprovalStatus !== selectedBrandStatus) return false;
      if (selectedKocStatus !== 'ALL' && item.kocNegotiationStatus !== selectedKocStatus) return false;
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchName = item.kocName.toLowerCase().includes(q);
        const matchHandle = item.kocHandle.toLowerCase().includes(q);
        const matchStore = item.storeName.toLowerCase().includes(q);
        const matchBrand = item.brandName.toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchStore && !matchBrand) return false;
      }
      return true;
    });
  }, [listings, filterOnlyDuplicates, duplicateHandleMap, selectedMonth, selectedCycle, selectedStore, selectedGrade, selectedOverallStatus, selectedBrandStatus, selectedKocStatus, deferredSearchQuery]);

  const inspectingListing = useMemo(() => {
    if (!inspectingListingId) return null;
    return listings.find((l) => l.id === inspectingListingId) || null;
  }, [listings, inspectingListingId]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = filteredListings.length;
    const draft = filteredListings.filter((i) => i.overallStatus === 'DRAFT').length;
    const submitted = filteredListings.filter((i) => i.overallStatus === 'SUBMITTED').length;
    const brandApproved = filteredListings.filter((i) => i.brandApprovalStatus === 'BRAND_APPROVED').length;
    const termsAgreed = filteredListings.filter((i) => i.kocNegotiationStatus === 'TERMS_AGREED').length;
    const finalApproved = filteredListings.filter((i) => i.overallStatus === 'FINAL_APPROVED').length;
    const dropped = filteredListings.filter((i) => i.overallStatus === 'DROPPED').length;
    const totalBudget = filteredListings
      .filter((i) => i.overallStatus !== 'DROPPED')
      .reduce((sum, i) => sum + (i.finalFee || i.proposedFee || 0), 0);

    return {
      total,
      draft,
      submitted,
      brandApproved,
      termsAgreed,
      finalApproved,
      dropped,
      totalBudget
    };
  }, [filteredListings]);

  // Air Video listings (only FINAL_APPROVED items)
  const airListings = useMemo(() => {
    return filteredListings.filter((i) => i.overallStatus === 'FINAL_APPROVED');
  }, [filteredListings]);

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredListings.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit Drafts to Brand (bulk or single)
  const handleSubmitToBrand = (targetIds?: string[]) => {
    const idsToSubmit = targetIds || selectedIds;
    if (idsToSubmit.length === 0) return;
    const nowIso = new Date().toISOString();
    const updated = listings.map((item) => {
      if (idsToSubmit.includes(item.id) && item.overallStatus === 'DRAFT') {
        const newDisc: KocListingDiscussionItem = {
          id: `disc-sub-${Date.now()}-${item.id}`,
          authorName: currentUserName,
          authorRole: 'BOOKING',
          content: `Đã chuyển trạng thái từ Bản nháp (Draft) sang Gửi nhãn hàng duyệt (Submit Brand) — Khung lương ${item.salaryGrade || inferSalaryGradeFromFee(item.proposedFee)} (${formatVnd(item.proposedFee)}).`,
          createdAt: nowIso,
          actionType: 'SUBMIT_BRAND',
        };
        return {
          ...item,
          overallStatus: 'SUBMITTED' as ListingItemStatus,
          discussions: [...(item.discussions || []), newDisc],
          updatedAt: nowIso
        };
      }
      return item;
    });
    onUpdateListings(updated);
    if (!targetIds) setSelectedIds([]);
  };

  // Brand Approval Action
  const handleBrandDecision = (id: string, decision: 'APPROVE' | 'REJECT', feedback?: string) => {
    const nowIso = new Date().toISOString();
    const updated = listings.map((item) => {
      if (item.id === id) {
        const nextBrandStatus: BrandListingStatus = decision === 'APPROVE' ? 'BRAND_APPROVED' : 'BRAND_REJECTED';
        let nextOverall = item.overallStatus === 'DRAFT' ? 'SUBMITTED' : item.overallStatus;
        let dropReason = item.dropReason;

        if (decision === 'REJECT') {
          nextOverall = 'DROPPED';
          dropReason = feedback || `Nhãn hàng từ chối hồ sơ KOC đợt này. Đã hoàn 1 suất ${item.salaryGrade || ''} về Plan tháng.`;
        } else if (decision === 'APPROVE' && item.kocNegotiationStatus === 'TERMS_AGREED') {
          nextOverall = 'FINAL_APPROVED';
        }

        const newDisc: KocListingDiscussionItem = {
          id: `disc-brand-${Date.now()}`,
          authorName: currentUserName,
          authorRole: 'BRAND',
          content:
            decision === 'APPROVE'
              ? `Nhãn hàng ĐỒNG Ý duyệt KOC.${feedback ? ` Ghi chú: "${feedback}"` : ''}`
              : `Nhãn hàng TỪ CHỐI KOC. Lý do: "${feedback || 'Chưa phù hợp định hướng'}"`,
          createdAt: nowIso,
          actionType: decision === 'APPROVE' ? 'BRAND_FEEDBACK' : 'REJECT',
        };

        return {
          ...item,
          brandApprovalStatus: nextBrandStatus,
          brandFeedbackNote: feedback || item.brandFeedbackNote,
          brandApprovedAt: decision === 'APPROVE' ? nowIso : undefined,
          brandApprovedBy: currentUserName,
          overallStatus: nextOverall,
          dropReason,
          discussions: [...(item.discussions || []), newDisc],
          updatedAt: nowIso
        };
      }
      return item;
    });
    onUpdateListings(updated);
  };

  // KOC Negotiation Status Update
  const handleKocNegotiationChange = (id: string, newStatus: KocNegotiationStatus, note?: string, finalFeeOverride?: number) => {
    const nowIso = new Date().toISOString();
    const updated = listings.map((item) => {
      if (item.id === id) {
        let nextOverall = item.overallStatus === 'DRAFT' && newStatus !== 'NOT_CONTACTED' ? 'SUBMITTED' : item.overallStatus;
        let dropReason = item.dropReason;

        if (newStatus === 'NEGOTIATION_FAILED') {
          nextOverall = 'DROPPED';
          dropReason = note || `Đàm phán thù lao/lịch trình thất bại. Đã hoàn 1 suất ${item.salaryGrade || ''} về Plan tháng.`;
        } else if (newStatus === 'TERMS_AGREED' && item.brandApprovalStatus === 'BRAND_APPROVED') {
          nextOverall = 'FINAL_APPROVED';
        }

        const nextFee = finalFeeOverride !== undefined ? finalFeeOverride : item.finalFee;
        const newDisc: KocListingDiscussionItem = {
          id: `disc-koc-${Date.now()}`,
          authorName: currentUserName,
          authorRole: 'BOOKING',
          content: `Cập nhật đàm phán KOC: ${
            newStatus === 'TERMS_AGREED'
              ? 'Đã chốt điều khoản'
              : newStatus === 'CONTACTING'
              ? 'Đang trao đổi'
              : newStatus === 'NEGOTIATION_FAILED'
              ? 'Đàm phán thất bại'
              : 'Chưa liên hệ'
          }${nextFee ? ` · Thù lao chốt: ${formatVnd(nextFee)}` : ''}${note ? ` · Ghi chú: "${note}"` : ''}`,
          createdAt: nowIso,
          actionType: 'KOC_NEGOTIATION',
        };

        return {
          ...item,
          kocNegotiationStatus: newStatus,
          finalFee: nextFee,
          negotiationNote: note !== undefined ? note : item.negotiationNote,
          negotiatedAt: newStatus === 'TERMS_AGREED' ? nowIso : item.negotiatedAt,
          overallStatus: nextOverall,
          dropReason,
          discussions: [...(item.discussions || []), newDisc],
          updatedAt: nowIso
        };
      }
      return item;
    });
    onUpdateListings(updated);
  };

  // Thêm bình luận trao đổi trong Drawer chi tiết KOC Listing
  const handleAddListingDiscussion = (listingId: string) => {
    if (!discussionInput.trim()) return;
    const nowIso = new Date().toISOString();
    const updated = listings.map((item) => {
      if (item.id !== listingId) return item;
      const newDisc: KocListingDiscussionItem = {
        id: `disc-msg-${Date.now()}`,
        authorName: currentUserName,
        authorRole: discussionRole,
        content: discussionInput.trim(),
        createdAt: nowIso,
        actionType: discussionRole === 'BRAND' ? 'BRAND_FEEDBACK' : 'KOC_NEGOTIATION',
      };
      return {
        ...item,
        brandFeedbackNote: discussionRole === 'BRAND' ? discussionInput.trim() : item.brandFeedbackNote,
        negotiationNote: discussionRole === 'BOOKING' ? discussionInput.trim() : item.negotiationNote,
        discussions: [...(item.discussions || []), newDisc],
        updatedAt: nowIso,
      };
    });
    onUpdateListings(updated);
    setDiscussionInput('');
  };

  // Final Approve -> Sinh Deal Booking gắn với KL & Plan Final
  const handleFinalApprove = (item: KocListingItem) => {
    const dealId = item.generatedDealId || `DEAL-202610-${item.id.replace('LIST-', '').replace('LISTING-', '')}`;
    const nowIso = new Date().toISOString();
    const resolvedGrade = inferSalaryGradeFromFee(item.finalFee || item.proposedFee, item.salaryGrade);
    const updated = listings.map((l) => {
      if (l.id === item.id) {
        const newDisc: KocListingDiscussionItem = {
          id: `disc-final-${Date.now()}`,
          authorName: currentUserName,
          authorRole: 'BOOKING',
          content: `Đã chốt duyệt chính thức (FINAL_APPROVED) ở khung ${resolvedGrade} và khởi tạo Deal Booking ${dealId}.`,
          createdAt: nowIso,
          actionType: 'FINAL_APPROVE',
        };
        return {
          ...l,
          salaryGrade: resolvedGrade,
          overallStatus: 'FINAL_APPROVED' as ListingItemStatus,
          generatedDealId: dealId,
          airVideoStage: l.airVideoStage || ('SAMPLE_DISPATCHED' as AirVideoStage),
          discussions: [...(l.discussions || []), newDisc],
          updatedAt: nowIso
        };
      }
      return l;
    });
    onUpdateListings(updated);

    if (onGenerateDeal) {
      onGenerateDeal({
        ...item,
        salaryGrade: resolvedGrade,
        generatedDealId: dealId,
        overallStatus: 'FINAL_APPROVED'
      });
    }
  };

  // Mở modal thêm KOC thủ công gắn sẵn Khung lương KL từ bảng đối soát Plan Final
  const handleOpenManualAddForGrade = (grade: SalaryGrade, unitCost: number, defaultTier: KocListingItem['tier']) => {
    const targetStoreName = selectedStore === 'ALL' ? (matchedPlanFinal?.storeName || 'Kutieskin Chính Hãng - TikTok Shop') : selectedStore;
    const targetBrand = matchedPlanFinal?.brandName || targetStoreName.split('_')[0] || 'Kutieskin';
    setNewKocForm({
      ...newKocForm,
      storeName: targetStoreName,
      brandName: targetBrand,
      salaryGrade: grade,
      tier: defaultTier,
      proposedFee: unitCost,
    });
    setShowAddModal(true);
  };

  // Add new KOC to batch (starts in DRAFT status, linked to Plan Final & KL)
  const handleAddNewKoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKocForm.kocName.trim()) return;

    const nowIso = new Date().toISOString();
    const matchedRow = matchedPlanFinal?.items?.find(
      (it) => it.salaryGrade === newKocForm.salaryGrade || it.tierCode === newKocForm.salaryGrade
    );

    const newItem: KocListingItem = {
      id: `LIST-${Date.now().toString().slice(-6)}`,
      batchId: `BATCH-202610-${newKocForm.batchCycle === 'BATCH_10' ? 'B1' : newKocForm.batchCycle === 'BATCH_20' ? 'B2' : 'B3'}`,
      batchCycle: newKocForm.batchCycle,
      monthKey: selectedMonth === 'ALL' ? '2026/10' : selectedMonth,
      storeId: matchedPlanFinal?.storeId || matchedStoreObj?.id || 'STORE-01',
      storeName: newKocForm.storeName,
      brandName: newKocForm.brandName,
      sourcePlanId: matchedPlanFinal?.id,
      sourcePlanVersion: matchedPlanFinal?.currentVersionCode || 'v1.0',
      planRowId: matchedRow?.id,
      salaryGrade: newKocForm.salaryGrade,
      kocId: `KOC-${Date.now().toString().slice(-4)}`,
      kocName: newKocForm.kocName,
      kocHandle: newKocForm.kocHandle.startsWith('@') ? newKocForm.kocHandle : `@${newKocForm.kocHandle}`,
      channel: newKocForm.channel,
      followersCount: Number(newKocForm.followersCount),
      tier: newKocForm.tier,
      niche: 'Mẹ & Bé / Chăm sóc da',
      videoFormat: newKocForm.videoFormat,
      pillarName: newKocForm.pillarName,
      proposedFee: Number(newKocForm.proposedFee),
      finalFee: Number(newKocForm.proposedFee),
      brandApprovalStatus: 'BRAND_PENDING',
      kocNegotiationStatus: 'NOT_CONTACTED',
      overallStatus: 'DRAFT',
      discussions: [
        {
          id: `disc-init-${Date.now()}`,
          authorName: currentUserName,
          authorRole: 'BOOKING',
          content: `Khởi tạo KOC ở trạng thái Bản nháp (Draft) gắn với khung lương ${newKocForm.salaryGrade} của Plan ${matchedPlanFinal?.id || 'Tháng'}.`,
          createdAt: nowIso,
        }
      ],
      expectedAirDate: newKocForm.expectedAirDate,
      assignedStaffId: 'STAFF-101',
      assignedStaffName: matchedRow?.assignedStaff || currentUserName,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onUpdateListings([newItem, ...listings]);
    setShowAddModal(false);
  };

  // Thêm danh sách KOC từ bộ lọc Shortlist vào đợt duyệt (mặc định trạng thái DRAFT, gắn KL & Plan Final)
  const handleAddShortlistToListings = (
    newListings: Partial<KocListingItem>[]
  ) => {
    const nowIso = new Date().toISOString();
    const fullListings: KocListingItem[] = newListings.map((item, idx) => {
      const grade = inferSalaryGradeFromFee(item.proposedFee || 0, item.salaryGrade);
      return {
        id: item.id || `LIST-SL-${Date.now()}-${idx}`,
        batchId: item.batchId || 'BATCH-202610-B10',
        batchCycle: item.batchCycle || 'BATCH_10',
        monthKey: item.monthKey || (selectedMonth === 'ALL' ? '2026/10' : selectedMonth),
        storeId: item.storeId || matchedPlanFinal?.storeId || 'STORE-01',
        storeName: item.storeName || (selectedStore === 'ALL' ? 'Kutieskin Chính Hãng - TikTok Shop' : selectedStore),
        brandName: item.brandName || matchedPlanFinal?.brandName || 'Kutieskin',
        sourcePlanId: item.sourcePlanId || matchedPlanFinal?.id,
        sourcePlanVersion: item.sourcePlanVersion || matchedPlanFinal?.currentVersionCode || 'v1.0',
        planRowId: item.planRowId,
        salaryGrade: grade,
        kocId: item.kocId || `KOC-SL-${idx}`,
        kocName: item.kocName || 'KOC Đề Xuất',
        kocHandle: item.kocHandle || '@koc',
        channel: item.channel || 'TikTok Shop',
        followersCount: item.followersCount || 100000,
        tier: item.tier || 'MICRO',
        niche: item.niche || 'Chăm sóc cá nhân',
        videoFormat: item.videoFormat || 'Review trải nghiệm',
        pillarName: item.pillarName || 'Chiến dịch tháng',
        proposedFee: item.proposedFee || 0,
        finalFee: item.finalFee,
        brandApprovalStatus: item.brandApprovalStatus || 'BRAND_PENDING',
        kocNegotiationStatus: item.kocNegotiationStatus || 'NOT_CONTACTED',
        overallStatus: 'DRAFT',
        discussions: [
          {
            id: `disc-sl-${Date.now()}-${idx}`,
            authorName: currentUserName,
            authorRole: 'BOOKING',
            content: `Đưa KOC từ danh sách lọc vào Bản nháp (Draft) — Khung lương ${grade} (Plan ${matchedPlanFinal?.currentVersionCode || 'v1.0'}).`,
            createdAt: nowIso,
          }
        ],
        expectedAirDate: item.expectedAirDate || '2026-10-25',
        assignedStaffId: item.assignedStaffId || 'STAFF-101',
        assignedStaffName: item.assignedStaffName || currentUserName,
        createdAt: item.createdAt || nowIso,
        updatedAt: item.updatedAt || nowIso,
      };
    });
    onUpdateListings([...fullListings, ...listings]);
    setShowShortlistModal(false);
  };

  // Update Air Video stage
  const handleSaveAirUpdate = (
    stage: AirVideoStage,
    videoUrl?: string,
    isCartAnchored?: boolean,
    sparkAds?: string,
    actualAirDate?: string
  ) => {
    if (!selectedListingForAir) return;

    const updated = listings.map((item) => {
      if (item.id === selectedListingForAir.id) {
        return {
          ...item,
          airVideoStage: stage,
          publishedVideoUrl: videoUrl || item.publishedVideoUrl,
          isCartAnchored: isCartAnchored !== undefined ? isCartAnchored : item.isCartAnchored,
          sparkAdsCode: sparkAds || item.sparkAdsCode,
          actualAirDate: actualAirDate || item.actualAirDate,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    onUpdateListings(updated);
    setShowAirUpdateModal(false);
    setSelectedListingForAir(null);
  };

  return (
    <div className="space-y-4">
      <PageActions>
        <Button variant="secondary" icon={FileText} onClick={() => setIsKocReportOpen(true)}>
          Báo cáo đề xuất cơ cấu KOC
        </Button>
        <Button
          variant="secondary"
          icon={Plus}
          onClick={() => {
            const gradeToUse = selectedGrade !== 'ALL' ? selectedGrade : 'KL4';
            const rowMatch = klTrackingRows.find((r) => r.code === gradeToUse);
            handleOpenManualAddForGrade(
              gradeToUse,
              rowMatch?.benchmarkUnitCost || 4500000,
              rowMatch?.defaultTier || 'MICRO'
            );
          }}
        >
          Thêm KOC nháp (Draft)
        </Button>
        <Button
          variant="primary"
          icon={Filter}
          onClick={() => {
            setShortlistTargetGrade(selectedGrade !== 'ALL' ? selectedGrade : undefined);
            setShowShortlistModal(true);
          }}
        >
          Lọc KOC từ kho theo KL
        </Button>
      </PageActions>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pt-2 rounded-t-md">
        <button
          onClick={() => setActiveSubTab('LISTING_APPROVAL')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'LISTING_APPROVAL'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          1. Lên danh sách nháp (Draft) → Gửi Brand &amp; Duyệt trao đổi theo KL
          <span className="text-2xs text-slate-500">
            ({filteredListings.length})
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('AIR_TRACKER')}
          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'AIR_TRACKER'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          2. Theo dõi video lên sóng &amp; giỏ hàng sàn (Sau khi chốt Deal)
          <span className="text-2xs text-emerald-700">
            ({airListings.length})
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* BẢNG ĐỐI SOÁT PLAN FINAL & TIẾN ĐỘ LISTING THEO KHUNG LƯƠNG (KL1–KL7) */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-semibold text-slate-900">
                  Đối soát Plan Final &amp; Tiến độ Listing KOC theo Khung lương (KL1–KL7 &amp; FOC)
                </h3>
                {matchedPlanFinal ? (
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700">
                    <ShieldCheck className="w-3 h-3" />
                    · Gắn với {matchedPlanFinal.id} ({matchedPlanFinal.currentVersionCode || 'v1.0'}) · PIC: {matchedPlanFinal.pic}
                  </span>
                ) : (
                  <span className="text-2xs font-medium text-slate-500">
                    · Tổng hợp toàn bộ kế hoạch tháng {selectedMonth}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {matchedPlanFinal && onOpenPlanStudio && (
              <button
                type="button"
                onClick={() => onOpenPlanStudio(matchedPlanFinal)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-2xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Xem Plan Final gốc</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsKlMatrixExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-2xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>{isKlMatrixExpanded ? 'Thu gọn bảng KL' : 'Mở bảng đối soát KL'}</span>
              {isKlMatrixExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isKlMatrixExpanded && (
          <div className="w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3 w-[22%]">Khung lương (KL) &amp; Đơn giá</th>
                  <th className="py-2.5 px-3 text-center bg-slate-100/70 w-[13%]">Chỉ tiêu Plan</th>
                  <th className="py-2.5 px-3 w-[28%]">Tiến độ đề xuất (Chốt · Gửi · Nháp)</th>
                  <th className="py-2.5 px-3 text-center w-[12%]">Còn thiếu</th>
                  <th className="py-2.5 px-3 text-right w-[14%]">Ngân sách (Thực/Plan)</th>
                  <th className="py-2.5 px-3 text-right w-[11%]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {klTrackingRows.map((row) => {
                  const isActiveFilter = selectedGrade === row.code;
                  const progressPct = row.planQty > 0 ? Math.min(100, Math.round((row.activeListedCount / row.planQty) * 100)) : 0;
                  const isOverBudget = row.planBudget > 0 && row.listedBudget > row.planBudget;

                  return (
                    <tr
                      key={row.code}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isActiveFilter ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Col 1: Khung lương, Đơn giá chuẩn, PIC */}
                      <td className="py-2.5 px-3">
                        <div className="leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs">{row.label}</span>
                            <span className="text-2xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                              Chuẩn {row.benchmarkUnitCost > 0 ? formatVndShort(row.benchmarkUnitCost) : '0đ'}
                            </span>
                          </div>
                          {row.assignedPics.length > 0 && (
                            <span className="text-[10px] text-slate-500 truncate block max-w-[200px] mt-0.5" title={row.assignedPics.join(', ')}>
                              PIC: {row.assignedPics.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 2: Chỉ tiêu Plan */}
                      <td className="py-2.5 px-3 text-center tabular-nums bg-slate-50/60 font-semibold text-slate-900 text-xs leading-tight">
                        {row.planQty} KOC
                        <span className="block text-[10px] font-normal text-slate-500">
                          {formatVndShort(row.planBudget)}
                        </span>
                      </td>

                      {/* Col 3: Gộp tiến độ đề xuất (Chốt / Gửi / Nháp / Rớt) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              row.finalApprovedCount > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                            title="Đã chốt duyệt (Final)"
                          >
                            {row.finalApprovedCount} chốt
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              row.submittedCount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                            title="Đã gửi Brand thẩm định (Submit)"
                          >
                            {row.submittedCount} gửi Brand
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              row.draftCount > 0
                                ? 'bg-slate-100 text-slate-800 font-medium'
                                : 'text-slate-400'
                            }`}
                            title="Bản nháp đang chuẩn bị"
                          >
                            {row.draftCount} nháp
                          </span>
                          {row.droppedCount > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 font-medium border border-rose-200"
                              title="Rớt / Không đạt"
                            >
                              {row.droppedCount} rớt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 4: Còn thiếu cần list */}
                      <td className="py-2.5 px-3 text-center tabular-nums text-xs">
                        <div className="flex flex-col items-center leading-tight">
                          {row.remainingToList > 0 ? (
                            <span className="text-[11px] font-semibold text-amber-700">
                              Thiếu {row.remainingToList}
                            </span>
                          ) : row.planQty > 0 ? (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              Đủ ({row.activeListedCount}/{row.planQty})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">+{row.activeListedCount}</span>
                          )}
                          {row.planQty > 0 && (
                            <div className="w-14 h-1 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Col 5: Ngân sách Thực tế vs Plan */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-xs leading-tight">
                        <div className={`font-semibold ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatVndShort(row.listedBudget)} / {formatVndShort(row.planBudget)}
                        </div>
                        {isOverBudget && (
                          <div className="text-[10px] text-rose-600 font-medium">
                            Vượt {formatVndShort(row.listedBudget - row.planBudget)}
                          </div>
                        )}
                      </td>

                      {/* Col 6: Thao tác */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedGrade(isActiveFilter ? 'ALL' : row.code)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                              isActiveFilter
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {isActiveFilter ? 'Đang lọc' : 'Lọc'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShortlistTargetGrade(row.code);
                              setShowShortlistModal(true);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                            title={`Mở bộ lọc kho KOC theo chuẩn ${row.label} để đưa vào Bản nháp (Draft)`}
                          >
                            + Nháp
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 border-t border-slate-200 font-semibold text-xs text-slate-900">
                  <td className="py-2.5 px-3">Tổng cộng Plan Final (Toàn kỳ)</td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-xs">
                    {klTotals.planQty} KOC · {formatVndShort(klTotals.planBudget)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-semibold text-emerald-700">{klTotals.finalApprovedCount} đã chốt</span>
                      <span>·</span>
                      <span className="font-semibold text-blue-700">{klTotals.submittedCount} chờ duyệt</span>
                      <span>·</span>
                      <span className="text-slate-700">{klTotals.draftCount} nháp</span>
                      {klTotals.droppedCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-700">{klTotals.droppedCount} rớt</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-amber-800 text-xs">
                    Thiếu {klTotals.remainingToList}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                    {formatVndShort(klTotals.listedBudget)} / {formatVndShort(klTotals.planBudget)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {selectedGrade !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSelectedGrade('ALL')}
                        className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Xóa lọc
                      </button>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500">Tổng đề xuất</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-semibold text-slate-900">{metrics.total}</span>
            {metrics.dropped > 0 && (
              <span className="text-2xs text-rose-600 font-medium">({metrics.dropped} rớt)</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500">Bản nháp (Draft)</div>
          <div className="text-lg font-semibold text-slate-700 mt-1">{metrics.draft}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-blue-600">Đã gửi Brand</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-semibold text-blue-700">{metrics.submitted}</span>
            {metrics.brandApproved > 0 && (
              <span className="text-2xs text-emerald-600 font-medium">({metrics.brandApproved} đạt)</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-lg p-3">
          <div className="text-2xs font-semibold text-emerald-800">Đã chốt (Final)</div>
          <div className="text-lg font-semibold text-emerald-900 mt-1">{metrics.finalApproved}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500">Ngân sách dự kiến</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 truncate">
            {formatVnd(metrics.totalBudget)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Month selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Tháng kế hoạch</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="2026/10">Tháng 10/2026</option>
              <option value="2026/09">Tháng 09/2026</option>
              <option value="2026/11">Tháng 11/2026</option>
              <option value="ALL">Tất cả các tháng</option>
            </select>
          </div>

          {/* Store selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Gian hàng (Plan Final)</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả gian hàng</option>
              {storeOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Salary Grade (KL) selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Khung lương (KL)</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as SalaryGrade | 'ALL')}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả khung lương (KL1–KL7)</option>
              {KL_GRADE_ORDER.map((kl) => (
                <option key={kl.code} value={kl.code}>
                  {kl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cycle selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Đợt đề xuất</label>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value as ListingBatchCycle | 'ALL')}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả các đợt (10-20-30)</option>
              <option value="BATCH_10">Đợt ngày 10</option>
              <option value="BATCH_20">Đợt ngày 20</option>
              <option value="BATCH_30">Đợt ngày 30</option>
            </select>
          </div>

          {/* Overall Status Filter */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Trạng thái Listing</label>
            <select
              value={selectedOverallStatus}
              onChange={(e) => setSelectedOverallStatus(e.target.value as ListingItemStatus | 'ALL')}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">1. Bản nháp (Draft)</option>
              <option value="SUBMITTED">2. Đã Submit Brand (Đang duyệt)</option>
              <option value="FINAL_APPROVED">3. Đã chốt duyệt (Final)</option>
              <option value="DROPPED">Không đạt (Dropped)</option>
            </select>
          </div>

          {/* Brand / KOC Status Filter */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Thẩm định &amp; Đàm phán</label>
            <select
              value={selectedBrandStatus}
              onChange={(e) => setSelectedBrandStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả thẩm định Brand</option>
              <option value="BRAND_PENDING">Chờ nhãn hàng duyệt</option>
              <option value="BRAND_APPROVED">Nhãn hàng đã duyệt</option>
              <option value="BRAND_REJECTED">Nhãn hàng từ chối</option>
            </select>
          </div>
        </div>

        {/* Search bar and bulk actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm KOC, kênh, gian hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <button
              onClick={() => setFilterOnlyDuplicates((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap border shrink-0 ${
                filterOnlyDuplicates
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : totalDuplicateListingsCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Trùng KOC: {totalDuplicateListingsCount}</span>
            </button>
          </div>

          {activeSubTab === 'LISTING_APPROVAL' && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-2xs text-slate-500">
                Đã chọn: <strong className="text-slate-800">{selectedIds.length}</strong>
              </span>

              <button
                disabled={selectedIds.length === 0}
                onClick={() => handleSubmitToBrand()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedIds.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <Send className="w-3 h-3" />
                Submit Brand các KOC nháp đã chọn
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'LISTING_APPROVAL' ? (
        /* TAB 1: LISTING & PARALLEL APPROVAL */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2 px-2 w-7 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredListings.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-[24%]">KOC &amp; Khung lương</th>
                  <th className="py-2.5 px-3 w-[16%]">Đợt / Gian hàng</th>
                  <th className="py-2.5 px-3 text-right w-[16%]">Thù lao &amp; Chuẩn KL</th>
                  <th className="py-2.5 px-3 w-[26%]">Thẩm định Brand &amp; Đàm phán KOC</th>
                  <th className="py-2.5 px-3 text-right w-[18%]">Trạng thái &amp; Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy bản ghi đề xuất nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const resolvedGrade = inferSalaryGradeFromFee(item.finalFee || item.proposedFee, item.salaryGrade);
                    const klBenchmarkRow = klTrackingRows.find((r) => r.code === resolvedGrade);
                    const benchmarkCost = klBenchmarkRow?.benchmarkUnitCost || 0;
                    const activeFee = item.finalFee || item.proposedFee || 0;
                    const isOverKlBenchmark = benchmarkCost > 0 && activeFee > benchmarkCost * 1.15;

                    const canFinalApprove =
                      item.brandApprovalStatus === 'BRAND_APPROVED' &&
                      item.kocNegotiationStatus === 'TERMS_AGREED' &&
                      item.overallStatus !== 'FINAL_APPROVED';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-slate-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </td>

                        {/* KOC Info & KL Badge */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">{item.kocName}</span>
                            <span className="font-code text-2xs font-semibold text-blue-700">
                              · {resolvedGrade}
                            </span>
                            {item.sourcePlanVersion && (
                              <span className="text-2xs font-medium text-slate-500">
                                · Plan {item.sourcePlanVersion}
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{item.kocHandle}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{item.channel}</span>
                            <span>•</span>
                            <span>{(item.followersCount / 1000).toFixed(0)}K flw</span>
                          </div>
                          {(() => {
                            const handleKey = `${(item.kocHandle || '').toLowerCase().trim().replace('@', '')}|${item.brandName.toLowerCase().trim()}|${item.monthKey}`;
                            const conflictingListings = duplicateHandleMap.get(handleKey) || [];
                            const otherStaffs = conflictingListings
                              .filter((l) => l.id !== item.id)
                              .map((l) => l.assignedStaffName || 'Nhân sự khác');
                            if (otherStaffs.length > 0) {
                              return (
                                <div className="mt-1">
                                  <span
                                    className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-700"
                                    title={`Trùng KOC trong cùng nhãn với: ${otherStaffs.join(', ')}`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    Trùng: {otherStaffs.join(', ')}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="text-2xs text-slate-500 mt-1">
                            <span className="font-semibold text-slate-700">
                              {item.tier}
                            </span>
                            <span className="ml-1.5 text-slate-600 truncate max-w-[180px] inline-block align-bottom">
                              · {item.pillarName}
                            </span>
                          </div>
                        </td>

                        {/* Batch & Store */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-2xs font-semibold ${
                                item.batchCycle === 'BATCH_10'
                                  ? 'text-blue-700'
                                  : item.batchCycle === 'BATCH_20'
                                  ? 'text-accent'
                                  : 'text-amber-700'
                              }`}
                            >
                              {item.batchCycle === 'BATCH_10'
                                ? 'Đợt 10'
                                : item.batchCycle === 'BATCH_20'
                                ? 'Đợt 20'
                                : 'Đợt 30'}
                            </span>
                          </div>
                          <div className="text-2xs text-slate-700 font-medium mt-1 truncate max-w-[170px]" title={item.storeName}>
                            {item.storeName}
                          </div>
                          <div className="text-2xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Lên sóng: {item.expectedAirDate || 'Chưa đặt'}</span>
                          </div>
                        </td>

                        {/* Fee vs Plan Benchmark */}
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <div className="font-semibold text-slate-900">
                            {formatVnd(item.proposedFee)}
                          </div>
                          {item.finalFee && item.finalFee !== item.proposedFee && (
                            <div className="text-2xs text-emerald-600 font-semibold">
                              Chốt: {formatVnd(item.finalFee)}
                            </div>
                          )}
                          {benchmarkCost > 0 && (
                            <div className={`text-2xs mt-0.5 ${isOverKlBenchmark ? 'text-amber-700 font-medium' : 'text-slate-400'}`}>
                              Chuẩn {resolvedGrade}: {formatVndShort(benchmarkCost)}
                            </div>
                          )}
                          <div className="text-2xs text-slate-400 mt-0.5">
                            PIC: {item.assignedStaffName}
                          </div>
                        </td>

                        {/* Gộp: Thẩm định Brand & Đàm phán KOC */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1.5">
                            {/* Brand Review */}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {item.brandApprovalStatus === 'BRAND_APPROVED' && (
                                  <span className="inline-flex items-center gap-1 text-2xs font-medium text-emerald-700">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Brand đã duyệt
                                  </span>
                                )}
                                {item.brandApprovalStatus === 'BRAND_PENDING' && (
                                  <span className="inline-flex items-center gap-1 text-2xs font-medium text-amber-700">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    {item.overallStatus === 'DRAFT' ? 'Chưa gửi Brand' : 'Chờ Brand duyệt'}
                                  </span>
                                )}
                                {item.brandApprovalStatus === 'BRAND_REJECTED' && (
                                  <span className="inline-flex items-center gap-1 text-2xs font-medium text-rose-700">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    Brand từ chối
                                  </span>
                                )}
                              </div>

                              {item.overallStatus !== 'DRAFT' && item.brandApprovalStatus === 'BRAND_PENDING' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setApprovingItem(item)}
                                    className="px-1.5 py-0.5 text-2xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => setRejectingItem(item)}
                                    className="px-1.5 py-0.5 text-2xs font-medium bg-white text-rose-600 border border-rose-300 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>

                            {item.brandFeedbackNote && (
                              <div className="text-2xs text-slate-500 italic max-w-[200px] truncate" title={item.brandFeedbackNote}>
                                {item.brandFeedbackNote}
                              </div>
                            )}

                            {/* KOC Negotiation */}
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                              <span className="text-2xs text-slate-500 shrink-0">KOC:</span>
                              <select
                                value={item.kocNegotiationStatus}
                                onChange={(e) =>
                                  handleKocNegotiationChange(item.id, e.target.value as KocNegotiationStatus)
                                }
                                className="text-2xs border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 flex-1 max-w-[170px]"
                              >
                                <option value="NOT_CONTACTED">Chưa liên hệ</option>
                                <option value="CONTACTING">Đang trao đổi</option>
                                <option value="TERMS_AGREED">Đã chốt điều khoản</option>
                                <option value="NEGOTIATION_FAILED">Đàm phán thất bại</option>
                              </select>
                            </div>
                            {item.negotiationNote && (
                              <div className="text-2xs text-slate-500 truncate max-w-[200px]" title={item.negotiationNote}>
                                {item.negotiationNote}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Gộp: Trạng thái & Thao tác luồng duyệt */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Trạng thái */}
                            <div>
                              {item.overallStatus === 'FINAL_APPROVED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  3. Đã chốt duyệt
                                </span>
                              )}
                              {item.overallStatus === 'SUBMITTED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  2. Đã Submit Brand
                                </span>
                              )}
                              {item.overallStatus === 'DRAFT' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                  1. Bản nháp (Draft)
                                </span>
                              )}
                              {item.overallStatus === 'DROPPED' && (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    Không đạt
                                  </span>
                                  <div className="text-2xs text-rose-600 mt-0.5 flex items-center justify-end gap-1">
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Hoàn {resolvedGrade}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Thao tác tương ứng */}
                            <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                              {item.overallStatus === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => handleSubmitToBrand([item.id])}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  Submit
                                </button>
                              )}

                              {canFinalApprove ? (
                                <button
                                  onClick={() => handleFinalApprove(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition-colors cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Chốt &amp; Tạo Deal
                                </button>
                              ) : item.overallStatus === 'FINAL_APPROVED' ? (
                                <span className="text-2xs text-emerald-700 font-code font-semibold">
                                  {item.generatedDealId}
                                </span>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => setInspectingListingId(item.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3 text-slate-500" />
                                <span>Trao đổi ({item.discussions?.length || 0})</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-2xs text-slate-500 gap-2">
            <div>
              Hiển thị <strong>{filteredListings.length}</strong> hồ sơ KOC trong đợt.
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Chốt duyệt khi: Nhãn hàng đã duyệt + KOC đã chốt điều khoản
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                KOC không đạt: Hoàn trả 1 suất khả dụng về đúng khung lương KL của Plan tháng
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: AIR VIDEO TRACKER */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Theo dõi tiến độ video lên sóng
                </h2>
                
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-emerald-700">
                  {airListings.length} video đang theo dõi
                </span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-3 w-[28%]">KOC &amp; Gian hàng</th>
                  <th className="py-2.5 px-3 w-[22%]">Tiến trình lên sóng</th>
                  <th className="py-2.5 px-3 w-[16%]">Lịch lên sóng</th>
                  <th className="py-2.5 px-3 w-[22%]">Nghiệm thu &amp; Kỹ thuật</th>
                  <th className="py-2.5 px-3 text-right w-[12%]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {airListings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      Chưa có KOC nào đạt trạng thái chốt duyệt trong đợt này.
                    </td>
                  </tr>
                ) : (
                  airListings.map((item) => {
                    const todayStr = '2026-10-09';
                    const isOverdue =
                      item.expectedAirDate &&
                      item.expectedAirDate < todayStr &&
                      item.airVideoStage !== 'AIRED' &&
                      item.airVideoStage !== 'ANCHOR_VERIFIED' &&
                      item.airVideoStage !== 'COMPLETED';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* KOC & Store */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">{item.kocName}</span>
                            <span className="font-code text-2xs font-semibold text-blue-700">
                              · {inferSalaryGradeFromFee(item.finalFee || item.proposedFee, item.salaryGrade)}
                            </span>
                            <span className="text-2xs font-code text-slate-500">
                              · {item.generatedDealId || 'DEAL-AUTO'}
                            </span>
                          </div>
                          <div className="text-2xs text-slate-500 mt-0.5">
                            <span>{item.kocHandle}</span>
                          </div>
                          <div className="text-2xs text-slate-600 mt-1 flex items-center gap-1 flex-wrap">
                            <span className="font-medium text-slate-800">{item.storeName}</span>
                            <span>•</span>
                            <span>{item.channel}</span>
                            {item.pillarName && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 truncate max-w-[150px]">{item.pillarName}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Air Video Pipeline Stage */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold border ${
                                item.airVideoStage === 'AIRED' ||
                                item.airVideoStage === 'ANCHOR_VERIFIED' ||
                                item.airVideoStage === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.airVideoStage === 'VIDEO_DRAFT_REVIEW'
                                  ? 'bg-accent-soft text-accent border-line'
                                  : item.airVideoStage === 'SCRIPT_APPROVED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {item.airVideoStage === 'SAMPLE_DISPATCHED' && 'Đã xuất mẫu'}
                              {item.airVideoStage === 'SAMPLE_DELIVERED' && 'Đã nhận mẫu'}
                              {item.airVideoStage === 'SCRIPT_PENDING' && 'Chờ nộp kịch bản'}
                              {item.airVideoStage === 'SCRIPT_APPROVED' && 'Đã duyệt kịch bản'}
                              {item.airVideoStage === 'VIDEO_DRAFT_REVIEW' && 'Duyệt video nháp'}
                              {item.airVideoStage === 'AIRED' && 'Đã lên sóng'}
                              {item.airVideoStage === 'ANCHOR_VERIFIED' && 'Đã kiểm tra giỏ hàng'}
                              {item.airVideoStage === 'COMPLETED' && 'Nghiệm thu hoàn tất'}
                              {!item.airVideoStage && 'Chưa bắt đầu'}
                            </span>

                            {isOverdue && (
                              <div className="text-2xs font-semibold text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-500" />
                                <span>Trễ lịch cam kết</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Expected Air Date vs Actual */}
                        <td className="py-2.5 px-3">
                          <div className="text-2xs text-slate-500">Cam kết:</div>
                          <div className="font-medium text-slate-800">
                            {item.expectedAirDate || 'Chưa định ngày'}
                          </div>
                          {item.actualAirDate && (
                            <div className="text-2xs text-emerald-600 mt-0.5">
                              Thực tế: {item.actualAirDate}
                            </div>
                          )}
                        </td>

                        {/* Video & Technical Verification (Cart Anchor, Spark Ads, Video Link) */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1 text-2xs">
                            <div className="flex items-center gap-2">
                              {item.publishedVideoUrl ? (
                                <a
                                  href={item.publishedVideoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                >
                                  <span>Xem video</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Chưa có link video</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.isCartAnchored ? (
                                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Đã gắn giỏ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  Chưa gắn giỏ
                                </span>
                              )}
                              <span>•</span>
                              {item.sparkAdsCode ? (
                                <span className="font-code text-slate-700 font-medium">
                                  {item.sparkAdsCode}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa mã Ads</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedListingForAir(item);
                              setShowAirUpdateModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                          >
                            Cập nhật
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW KOC TO BATCH (DRAFT + LINKED TO KL) */}
      <Presence show={!!showAddModal}>
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Thêm KOC vào bản nháp (Draft) gắn với Plan Final
                </h3>
                
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddNewKoc} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Khung lương Plan (KL) *
                  </label>
                  <select
                    value={newKocForm.salaryGrade}
                    onChange={(e) => {
                      const nextGrade = e.target.value as SalaryGrade;
                      const rowMatch = klTrackingRows.find((r) => r.code === nextGrade);
                      setNewKocForm({
                        ...newKocForm,
                        salaryGrade: nextGrade,
                        tier: rowMatch?.defaultTier || newKocForm.tier,
                        proposedFee: rowMatch?.benchmarkUnitCost ?? newKocForm.proposedFee,
                      });
                    }}
                    className="w-full border border-blue-300 rounded px-2.5 py-1.5 bg-blue-50/40 text-blue-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {KL_GRADE_ORDER.map((kl) => (
                      <option key={kl.code} value={kl.code}>
                        {kl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Chu kỳ đợt đề xuất *
                  </label>
                  <select
                    value={newKocForm.batchCycle}
                    onChange={(e) =>
                      setNewKocForm({ ...newKocForm, batchCycle: e.target.value as ListingBatchCycle })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="BATCH_10">Đợt ngày 10</option>
                    <option value="BATCH_20">Đợt ngày 20</option>
                    <option value="BATCH_30">Đợt ngày 30</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Gian hàng *
                  </label>
                  <select
                    value={newKocForm.storeName}
                    onChange={(e) => {
                      const st = e.target.value;
                      const br = st.split('_')[0] || 'Kutieskin';
                      setNewKocForm({ ...newKocForm, storeName: st, brandName: br });
                    }}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    {storeOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Tên KOC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Mai Trang"
                    value={newKocForm.kocName}
                    onChange={(e) => setNewKocForm({ ...newKocForm, kocName: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Mã kênh *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: @trangmebe"
                    value={newKocForm.kocHandle}
                    onChange={(e) => setNewKocForm({ ...newKocForm, kocHandle: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Duplicate Listing Real-time Alert */}
              {newKocDuplicate && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Cảnh báo: KOC đã có trong đợt đề xuất của nhãn này!
                  </div>
                  <div className="mt-1 text-2xs space-y-0.5 text-amber-800/90">
                    <div>Nhân sự đã thêm: <strong>{newKocDuplicate.assignedStaffName || 'Chưa rõ'}</strong></div>
                    <div>Hồ sơ: <strong>{newKocDuplicate.kocName}</strong> · {newKocDuplicate.kocHandle} · Nhãn: <strong>{newKocDuplicate.brandName}</strong></div>
                    <div>Thù lao đề xuất: <strong>{formatVnd(newKocDuplicate.proposedFee)}</strong></div>
                    <div className="text-amber-700 font-medium pt-0.5">Tránh liên hệ trùng KOC hoặc chênh lệch giá.</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">Kênh</label>
                  <select
                    value={newKocForm.channel}
                    onChange={(e) => setNewKocForm({ ...newKocForm, channel: e.target.value as KocListingItem['channel'] })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800"
                  >
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">Phân hạng</label>
                  <select
                    value={newKocForm.tier}
                    onChange={(e) => setNewKocForm({ ...newKocForm, tier: e.target.value as KocListingItem['tier'] })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800"
                  >
                    <option value="NANO">Nano — dưới 50K</option>
                    <option value="MICRO">Micro — 50K đến 250K</option>
                    <option value="MACRO">Macro — 250K đến 1M</option>
                    <option value="MEGA">Mega — trên 1M</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">Người theo dõi</label>
                  <input
                    type="number"
                    value={newKocForm.followersCount}
                    onChange={(e) =>
                      setNewKocForm({ ...newKocForm, followersCount: Number(e.target.value) })
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Thù lao đề xuất *
                  </label>
                  <input
                    type="number"
                    step={100000}
                    value={newKocForm.proposedFee}
                    onChange={(e) =>
                      setNewKocForm({ ...newKocForm, proposedFee: Number(e.target.value) })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Ngày dự kiến lên sóng *
                  </label>
                  <input
                    type="date"
                    value={newKocForm.expectedAirDate}
                    onChange={(e) =>
                      setNewKocForm({ ...newKocForm, expectedAirDate: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Định hướng nội dung
                </label>
                <input
                  type="text"
                  value={newKocForm.pillarName}
                  onChange={(e) => setNewKocForm({ ...newKocForm, pillarName: e.target.value })}
                  placeholder="VD: Da mẩn ngứa thời tiết giao mùa, hướng dẫn thoa kem"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded shadow-sm"
                >
                  Lưu vào Bản nháp (Draft)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL 2: LUỒNG DUYỆT & TRAO ĐỔI CHI TIẾT (SUBMIT BRAND -> BRAND REVIEW & KOC NEGOTIATION -> FINAL APPROVE) */}
      <Presence show={!!inspectingListing}>
      {inspectingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Luồng duyệt &amp; Trao đổi KOC: {inspectingListing.kocName} ({inspectingListing.kocHandle})
                  </h3>
                  <span className="font-code text-2xs font-semibold text-blue-700">
                    · {inferSalaryGradeFromFee(inspectingListing.finalFee || inspectingListing.proposedFee, inspectingListing.salaryGrade)}
                  </span>
                </div>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Gian hàng: <strong>{inspectingListing.storeName}</strong> · Plan: <strong>{inspectingListing.sourcePlanId || matchedPlanFinal?.id || 'Tháng 10/2026'} ({inspectingListing.sourcePlanVersion || 'v1.0'})</strong>
                </p>
              </div>
              <button
                onClick={() => setInspectingListingId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Thanh tiến trình 3 bước của Listing */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className={`p-2 rounded border ${inspectingListing.overallStatus === 'DRAFT' ? 'bg-white border-slate-400 font-semibold text-slate-900 shadow-2xs' : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'}`}>
                  <div className="text-2xs uppercase tracking-wider">Bước 1</div>
                  <div className="mt-0.5">Lên danh sách Nháp (Draft)</div>
                </div>
                <div className={`p-2 rounded border ${inspectingListing.overallStatus === 'SUBMITTED' ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900 shadow-2xs' : inspectingListing.overallStatus === 'FINAL_APPROVED' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <div className="text-2xs uppercase tracking-wider">Bước 2</div>
                  <div className="mt-0.5">Submit Brand &amp; Đàm phán</div>
                </div>
                <div className={`p-2 rounded border ${inspectingListing.overallStatus === 'FINAL_APPROVED' ? 'bg-emerald-100 border-emerald-400 font-semibold text-emerald-900 shadow-2xs' : inspectingListing.overallStatus === 'DROPPED' ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <div className="text-2xs uppercase tracking-wider">Bước 3</div>
                  <div className="mt-0.5">
                    {inspectingListing.overallStatus === 'DROPPED' ? 'Không đạt (Hoàn suất KL)' : 'Chốt duyệt → Sinh Deal'}
                  </div>
                </div>
              </div>

              {/* Điều chỉnh Khung lương KL, Thù lao & Trạng thái duyệt song song */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">Khung lương Plan (KL)</label>
                  <select
                    value={inferSalaryGradeFromFee(inspectingListing.finalFee || inspectingListing.proposedFee, inspectingListing.salaryGrade)}
                    onChange={(e) => {
                      const nextGrade = e.target.value as SalaryGrade;
                      onUpdateListings(
                        listings.map((l) =>
                          l.id === inspectingListing.id
                            ? { ...l, salaryGrade: nextGrade, updatedAt: new Date().toISOString() }
                            : l
                        )
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900 font-semibold"
                  >
                    {KL_GRADE_ORDER.map((kl) => (
                      <option key={kl.code} value={kl.code}>
                        {kl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">Thù lao đề xuất / Chốt (VNĐ)</label>
                  <input
                    type="number"
                    step={100000}
                    value={inspectingListing.finalFee ?? inspectingListing.proposedFee}
                    onChange={(e) => {
                      const nextFee = Number(e.target.value);
                      onUpdateListings(
                        listings.map((l) =>
                          l.id === inspectingListing.id
                            ? { ...l, finalFee: nextFee, updatedAt: new Date().toISOString() }
                            : l
                        )
                      );
                    }}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900 font-semibold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">Tiến độ đàm phán KOC</label>
                  <select
                    value={inspectingListing.kocNegotiationStatus}
                    onChange={(e) =>
                      handleKocNegotiationChange(inspectingListing.id, e.target.value as KocNegotiationStatus)
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900 font-medium"
                  >
                    <option value="NOT_CONTACTED">Chưa liên hệ</option>
                    <option value="CONTACTING">Đang trao đổi</option>
                    <option value="TERMS_AGREED">Đã chốt điều khoản</option>
                    <option value="NEGOTIATION_FAILED">Đàm phán thất bại</option>
                  </select>
                </div>
              </div>

              {/* Thao tác nhanh của Nhãn hàng & Booking */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-2xs text-slate-600">
                  Trạng thái Brand: <strong>{inspectingListing.brandApprovalStatus}</strong> · KOC: <strong>{inspectingListing.kocNegotiationStatus}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {inspectingListing.overallStatus === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => handleSubmitToBrand([inspectingListing.id])}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Chuyển sang Submit Brand
                    </button>
                  )}
                  {inspectingListing.brandApprovalStatus !== 'BRAND_APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleBrandDecision(inspectingListing.id, 'APPROVE', 'Nhãn hàng đồng ý duyệt hồ sơ KOC.')}
                      className="px-2.5 py-1 rounded text-2xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      Brand Duyệt KOC
                    </button>
                  )}
                  {inspectingListing.brandApprovalStatus !== 'BRAND_REJECTED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingListingId(null);
                        setRejectingItem(inspectingListing);
                      }}
                      className="px-2.5 py-1 rounded text-2xs font-semibold bg-white text-rose-600 border border-rose-300 hover:bg-rose-50 cursor-pointer"
                    >
                      Brand Từ chối
                    </button>
                  )}
                  {inspectingListing.brandApprovalStatus === 'BRAND_APPROVED' &&
                    inspectingListing.kocNegotiationStatus === 'TERMS_AGREED' &&
                    inspectingListing.overallStatus !== 'FINAL_APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleFinalApprove(inspectingListing)}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
                      >
                        Chốt duyệt &amp; Khởi tạo Deal Booking
                      </button>
                    )}
                </div>
              </div>

              {/* Lịch sử trao đổi giữa Booking / Account / Brand */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-800">
                  Lịch sử trao đổi &amp; phản hồi ({inspectingListing.discussions?.length || 0})
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(!inspectingListing.discussions || inspectingListing.discussions.length === 0) ? (
                    <div className="p-3 text-center text-2xs text-slate-400 bg-slate-50 rounded border border-slate-200">
                      Chưa có ghi chú trao đổi nào. Hãy nhập phản hồi của Brand hoặc kết quả thương lượng KOC bên dưới.
                    </div>
                  ) : (
                    inspectingListing.discussions.map((d) => (
                      <div key={d.id} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center justify-between text-2xs">
                          <span className="font-semibold text-slate-800">
                            {d.authorName}{' '}
                            <span className="text-slate-500 font-medium ml-1">
                              · {d.authorRole}
                            </span>
                          </span>
                          <span className="text-slate-400">
                            {d.createdAt.replace('T', ' ').slice(0, 16)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700">{d.content}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form gửi phản hồi mới */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <select
                    value={discussionRole}
                    onChange={(e) => setDiscussionRole(e.target.value as 'BOOKING' | 'BRAND' | 'LEADER')}
                    className="border border-slate-300 rounded px-2 py-1.5 text-2xs font-semibold bg-slate-50 text-slate-800 shrink-0"
                  >
                    <option value="BOOKING">Vai trò: Nhân sự Booking</option>
                    <option value="BRAND">Vai trò: Đại diện Brand / Account</option>
                    <option value="LEADER">Vai trò: Leader / Trưởng phòng</option>
                  </select>
                  <input
                    type="text"
                    value={discussionInput}
                    onChange={(e) => setDiscussionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddListingDiscussion(inspectingListing.id);
                      }
                    }}
                    placeholder="Nhập nội dung trao đổi (VD: Brand yêu cầu giảm giá về 4.5M theo khung KL4, KOC hẹn gửi lịch quay...)"
                    className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddListingDiscussion(inspectingListing.id)}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shrink-0 cursor-pointer"
                  >
                    Gửi trao đổi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL 3: UPDATE AIR VIDEO PROGRESS */}
      <Presence show={!!(showAirUpdateModal && selectedListingForAir)}>
      {showAirUpdateModal && selectedListingForAir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Cập nhật tiến độ video lên sóng
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  KOC: {selectedListingForAir.kocName} · {selectedListingForAir.kocHandle}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAirUpdateModal(false);
                  setSelectedListingForAir(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Giai đoạn hiện tại *
                </label>
                <select
                  defaultValue={selectedListingForAir.airVideoStage || 'SAMPLE_DISPATCHED'}
                  id="air-stage-select"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium"
                >
                  <option value="SAMPLE_DISPATCHED">Đã xuất hàng mẫu</option>
                  <option value="SAMPLE_DELIVERED">KOC đã nhận mẫu</option>
                  <option value="SCRIPT_PENDING">Chờ nộp kịch bản</option>
                  <option value="SCRIPT_APPROVED">Đã duyệt kịch bản</option>
                  <option value="VIDEO_DRAFT_REVIEW">Kiểm duyệt bản dựng nháp</option>
                  <option value="AIRED">Đã lên sóng chính thức</option>
                  <option value="ANCHOR_VERIFIED">Đã kiểm tra gắn giỏ hàng</option>
                  <option value="COMPLETED">Nghiệm thu hoàn tất</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Liên kết video đã đăng tải
                </label>
                <input
                  type="url"
                  id="air-video-url"
                  defaultValue={selectedListingForAir.publishedVideoUrl || ''}
                  placeholder="https://tiktok.com/@koc/video/..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Ngày lên sóng thực tế
                  </label>
                  <input
                    type="date"
                    id="air-actual-date"
                    defaultValue={selectedListingForAir.actualAirDate || '2026-10-09'}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Mã Spark Ads
                  </label>
                  <input
                    type="text"
                    id="air-spark-code"
                    defaultValue={selectedListingForAir.sparkAdsCode || ''}
                    placeholder="VD: SPARK-TK-9821"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-mono text-2xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="air-cart-anchored"
                    defaultChecked={selectedListingForAir.isCartAnchored ?? false}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span className="text-2xs font-medium text-slate-700">
                    Đã kiểm tra liên kết giỏ hàng sàn
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAirUpdateModal(false);
                    setSelectedListingForAir(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const stage = (document.getElementById('air-stage-select') as HTMLSelectElement).value as AirVideoStage;
                    const url = (document.getElementById('air-video-url') as HTMLInputElement).value;
                    const actualDate = (document.getElementById('air-actual-date') as HTMLInputElement).value;
                    const sparkCode = (document.getElementById('air-spark-code') as HTMLInputElement).value;
                    const isAnchored = (document.getElementById('air-cart-anchored') as HTMLInputElement).checked;

                    handleSaveAirUpdate(stage, url, isAnchored, sparkCode, actualDate);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* Modal xác nhận duyệt KOC */}
      <ConfirmDialog
        open={!!approvingItem}
        title="Xác nhận duyệt hồ sơ KOC"
        message={`Bạn có chắc chắn muốn phê duyệt hồ sơ KOC "${approvingItem?.kocName}" (${inferSalaryGradeFromFee(approvingItem?.finalFee || approvingItem?.proposedFee || 0, approvingItem?.salaryGrade)}) của nhãn ${approvingItem?.brandName} cho đợt đề xuất hiện tại?`}
        confirmLabel="Xác nhận duyệt"
        onConfirm={() => {
          if (approvingItem) {
            handleBrandDecision(approvingItem.id, 'APPROVE');
            setApprovingItem(null);
          }
        }}
        onCancel={() => setApprovingItem(null)}
      />

      {/* Modal từ chối KOC */}
      <ConfirmDialog
        open={!!rejectingItem}
        title="Từ chối hồ sơ KOC"
        message={`Vui lòng nhập lý do từ chối hồ sơ KOC "${rejectingItem?.kocName}" để bộ phận phụ trách điều chỉnh hoặc tìm KOC thay thế cho khung ${inferSalaryGradeFromFee(rejectingItem?.finalFee || rejectingItem?.proposedFee || 0, rejectingItem?.salaryGrade)}:`}
        confirmLabel="Xác nhận từ chối"
        tone="danger"
        reason={{
          label: "Lý do từ chối",
          placeholder: "Ví dụ: Lệch phong cách nhãn hàng, hình ảnh chưa phù hợp, chi phí đề xuất cao...",
          required: true
        }}
        onConfirm={(reason) => {
          if (rejectingItem) {
            handleBrandDecision(rejectingItem.id, 'REJECT', reason);
            setRejectingItem(null);
          }
        }}
        onCancel={() => setRejectingItem(null)}
      />

      {/* Modal Lọc Shortlist KOC cho gian hàng (Gắn với Plan Final & Khung lương KL) */}
      <StoreShortlistFilterModal
        isOpen={showShortlistModal}
        onClose={() => setShowShortlistModal(false)}
        stores={stores}
        kocs={kocs}
        deals={deals}
        initialStoreId={matchedStoreObj?.id}
        initialSalaryGrade={shortlistTargetGrade}
        activePlan={matchedPlanFinal}
        currentUserName={currentUserName}
        onAddToListingBatch={handleAddShortlistToListings}
      />

      <OperationalReportDrawer
        isOpen={isKocReportOpen}
        onClose={() => setIsKocReportOpen(false)}
        purposeId="KOC_MATCHING"
        moduleTitle={`Báo Cáo Đánh Giá Cơ Cấu KOC Đề Xuất Theo KL — Kỳ ${selectedMonth}`}
        moduleSubtitle={`Kỳ ${selectedMonth} | Đợt: ${selectedCycle === 'ALL' ? 'Tất cả đợt (10-20-30)' : selectedCycle} | Gian hàng: ${selectedStore === 'ALL' ? 'Toàn bộ gian hàng' : selectedStore} | Tổng hồ sơ: ${metrics.total}`}
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Đề Xuất KOC Theo Đợt (10 - 20 - 30) & Đối Soát Plan Final Theo KL]`,
          `- Kỳ kế hoạch: ${selectedMonth} | Gian hàng: ${selectedStore} | Plan gốc: ${matchedPlanFinal?.id || 'Toàn bộ'} (${matchedPlanFinal?.currentVersionCode || 'v1.0'})`,
          `- Tổng chỉ tiêu Plan Final: ${klTotals.planQty} KOC (${formatVnd(klTotals.planBudget)}) | Đã list: ${klTotals.activeListedCount} KOC (Nháp: ${klTotals.draftCount}, Đã Submit Brand: ${klTotals.submittedCount}, Đã chốt Final: ${klTotals.finalApprovedCount}, Rớt: ${klTotals.droppedCount}) | Còn thiếu cần list: ${klTotals.remainingToList} slot.`,
          ...klTrackingRows.map(
            r => `- Khung ${r.label}: Plan ${r.planQty} slot (${formatVndShort(r.planBudget)}) vs Thực tế List ${r.activeListedCount} (Nháp ${r.draftCount}, Submit ${r.submittedCount}, Chốt ${r.finalApprovedCount}, Rớt ${r.droppedCount}) -> Còn thiếu ${r.remainingToList} slot.`
          ),
        ].join('\n')}
        customSystemPrompt="Đánh giá tiến độ Listing KOC so với Plan Final theo từng khung lương KL1-KL7: (1) Chỉ ra các khung lương KL đang thiếu hụt số lượng listing so với Plan Final, (2) Phân tích tỷ lệ rớt/từ chối ở bước Submit Brand & Đàm phán KOC, (3) Đề xuất phương án bổ sung KOC nháp vào các khung lương còn thiếu để đảm bảo giải ngân đúng định mức Plan Final."
      />
    </div>
  );
}
