'use client';

import React, { useState, useMemo } from 'react';
import { klLabel } from '../../lib/klTiers';
import { Modal, Button, Chips, Status } from '../ui';
import {
  Filter,
  AlertTriangle,
  Download,
  Send,
  Search,
  ShieldCheck,
  AlertCircle,
  History,
  Award,
  Star,
  Eye,
  CheckSquare,
  CheckCircle2,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import {
  StorePortfolioItem,
  KocItem,
  KocListingItem,
  BookingDealItem,
  ListingBatchCycle,
  SalaryGrade,
  InputPlanBreakdownState,
} from '@/lib/types';
import { formatVndShort } from '@/lib/format';
import { useKocChannelReviews } from '@/lib/kocChannelReviewService';
import {
  KocChannelReviewBadge,
  KocChannelReviewModal,
  type KocChannelReviewTarget,
} from '../koc/KocChannelReviewModal';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS, INITIAL_DEALS } from '@/lib/mockData';
import {
  KocCooperationHistory,
  RecommendationBucket,
  RankedKocRecommendation,
  evaluateAndRankKocs,
  computeMissingPlanQuotas,
  autoPickKocsForMissingQuotas,
  normalizeGradeCode,
} from '@/lib/kocRecommendationEngine';

export type { KocCooperationHistory };

interface StoreShortlistFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  existingListings?: KocListingItem[];
  initialStoreId?: string;
  initialSalaryGrade?: SalaryGrade;
  activePlan?: InputPlanBreakdownState | null;
  currentUserName?: string;
  onAddToListingBatch?: (
    newListings: Partial<KocListingItem>[],
    store: StorePortfolioItem,
    batchCycle: ListingBatchCycle
  ) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

function getDefaultStoreFilters(store?: StorePortfolioItem): {
  tepKenh: string;
  minFemaleRatio: number;
} {
  if (!store) return { tepKenh: 'ALL', minFemaleRatio: 0 };
  const cat = (store.category || '').toLowerCase();
  if (cat.includes('mỹ phẩm') || cat.includes('skincare') || cat.includes('dược')) {
    return { tepKenh: 'Review Nữ', minFemaleRatio: 60 };
  }
  if (cat.includes('mẹ') || cat.includes('bé')) {
    return { tepKenh: 'Mẹ & Bé (bầu)', minFemaleRatio: 70 };
  }
  if (cat.includes('gia dụng') || cat.includes('nhà')) {
    return { tepKenh: 'ELHA', minFemaleRatio: 0 };
  }
  return { tepKenh: 'ALL', minFemaleRatio: 0 };
}

function createListingId(kocId: string): string {
  return `listing-${Date.now()}-${kocId}`;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const KL_FILTER_OPTIONS: Array<{ id: SalaryGrade; label: string }> = [
  { id: 'TAP UpAffiliate', label: 'FOC / TAP (0đ)' },
  { id: 'KL1', label: klLabel('KL1') },
  { id: 'KL2', label: klLabel('KL2') },
  { id: 'KL3', label: klLabel('KL3') },
  { id: 'KL4', label: klLabel('KL4') },
  { id: 'KL5', label: klLabel('KL5') },
  { id: 'KL6', label: klLabel('KL6') },
  { id: 'KL7', label: klLabel('KL7') },
];

export const StoreShortlistFilterModal: React.FC<StoreShortlistFilterModalProps> = ({
  isOpen,
  onClose,
  stores = INITIAL_STORE_PORTFOLIOS,
  kocs = INITIAL_KOCS,
  deals = INITIAL_DEALS,
  existingListings = [],
  initialStoreId,
  initialSalaryGrade,
  activePlan,
  currentUserName = 'Chuyên viên Booking',
  onAddToListingBatch,
  onNotify,
}) => {
  const defaultStoreId = initialStoreId || (stores[0]?.id ?? '');
  const initialStoreObj = stores.find((s) => s.id === defaultStoreId) || stores[0];
  const initialDefaults = getDefaultStoreFilters(initialStoreObj);

  const [selectedStoreId, setSelectedStoreId] = useState<string>(defaultStoreId);
  const [bucketFilter, setBucketFilter] = useState<RecommendationBucket>('ALL');

  const [selectedGrades, setSelectedGrades] = useState<string[]>(
    initialSalaryGrade ? [normalizeGradeCode(initialSalaryGrade)] : []
  );
  const [selectedTepKenh, setSelectedTepKenh] = useState<string>(initialDefaults.tepKenh);
  const [minGmvThreshold, setMinGmvThreshold] = useState<number>(0);
  const [preferFormat, setPreferFormat] = useState<'ALL' | 'VIDEO' | 'LIVE'>('ALL');
  const [minFemaleRatio, setMinFemaleRatio] = useState<number>(initialDefaults.minFemaleRatio);
  const [excludeAssignedKoc, setExcludeAssignedKoc] = useState<boolean>(false);
  const [requireLegalDoc, setRequireLegalDoc] = useState<boolean>(false);
  const [enforceCooldownFilter, setEnforceCooldownFilter] = useState<boolean>(true);
  const [searchKocText, setSearchKocText] = useState<string>('');

  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | 'BRAND_EXPERIENCED' | 'UPBASE_EXPERIENCED' | 'NEW_KOC'
  >('ALL');
  const [excludeBrandRejected, setExcludeBrandRejected] = useState<boolean>(true);
  const [requireTopWinner, setRequireTopWinner] = useState<boolean>(false);
  const [minOnTimeRate, setMinOnTimeRate] = useState<number>(0);

  const [targetBatchCycle, setTargetBatchCycle] = useState<ListingBatchCycle>('BATCH_10');
  const [selectedKocIds, setSelectedKocIds] = useState<string[]>([]);

  const [inspectingKocDetail, setInspectingKocDetail] = useState<RankedKocRecommendation | null>(
    null
  );
  const [excludeStaffNotSuitable, setExcludeStaffNotSuitable] = useState<boolean>(false);
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewTarget, setReviewTarget] = useState<KocChannelReviewTarget | null>(null);
  const [reviewMode, setReviewMode] = useState<'CHANNEL_DETAIL' | 'ALL_HISTORY'>('CHANNEL_DETAIL');
  const { reviews: channelReviews, getChannelSummary } = useKocChannelReviews();

  const openChannelReview = (
    target: KocChannelReviewTarget | null,
    mode: 'CHANNEL_DETAIL' | 'ALL_HISTORY' = 'CHANNEL_DETAIL',
  ) => {
    setReviewTarget(target);
    setReviewMode(mode);
    setReviewModalOpen(true);
  };

  const [prevInitialStoreId, setPrevInitialStoreId] = useState(initialStoreId);
  if (prevInitialStoreId !== initialStoreId) {
    setPrevInitialStoreId(initialStoreId);
    const nextId = initialStoreId || (stores[0]?.id ?? '');
    if (nextId && nextId !== selectedStoreId) {
      setSelectedStoreId(nextId);
      const nextStore = stores.find((s) => s.id === nextId) || stores[0];
      const defaults = getDefaultStoreFilters(nextStore);
      setSelectedTepKenh(defaults.tepKenh);
      setMinFemaleRatio(defaults.minFemaleRatio);
      setSelectedKocIds([]);
    }
  }

  const [prevInitialGrade, setPrevInitialGrade] = useState(initialSalaryGrade);
  if (prevInitialGrade !== initialSalaryGrade) {
    setPrevInitialGrade(initialSalaryGrade);
    if (initialSalaryGrade) {
      setSelectedGrades([normalizeGradeCode(initialSalaryGrade)]);
    } else {
      setSelectedGrades([]);
    }
  }

  const handleSelectStore = (nextStoreId: string) => {
    setSelectedStoreId(nextStoreId);
    const nextStore = stores.find((s) => s.id === nextStoreId) || stores[0];
    const defaults = getDefaultStoreFilters(nextStore);
    setSelectedTepKenh(defaults.tepKenh);
    setMinFemaleRatio(defaults.minFemaleRatio);
    setSelectedKocIds([]);
  };

  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0];
  }, [stores, selectedStoreId]);

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  // Định mức còn thiếu của Kế hoạch tháng
  const missingQuotas = useMemo(() => {
    return computeMissingPlanQuotas(activePlan, existingListings, selectedStore?.storeName);
  }, [activePlan, existingListings, selectedStore]);

  const totalMissingSlots = useMemo(
    () => missingQuotas.reduce((sum, q) => sum + q.missingQty, 0),
    [missingQuotas]
  );

  // Chấm điểm toàn bộ (trước khi lọc theo bucketFilter để đếm số lượng từng tab nhóm đề xuất)
  const allEvaluatedKocs = useMemo(() => {
    if (!isOpen || !selectedStore) return [];
    return evaluateAndRankKocs({
      store: selectedStore,
      kocs,
      deals,
      activePlan,
      existingListings,
      currentUserName,
      bucketFilter: 'ALL',
      selectedGrades,
      selectedTepKenh,
      minGmvThreshold,
      preferFormat,
      minFemaleRatio,
      excludeAssignedKoc,
      requireLegalDoc,
      searchKocText,
      historyFilter,
      excludeBrandRejected,
      requireTopWinner,
      minOnTimeRate,
      enforceCooldownFilter,
    });
  }, [
    isOpen,
    selectedStore,
    kocs,
    deals,
    activePlan,
    existingListings,
    currentUserName,
    selectedGrades,
    selectedTepKenh,
    minGmvThreshold,
    preferFormat,
    minFemaleRatio,
    excludeAssignedKoc,
    requireLegalDoc,
    searchKocText,
    historyFilter,
    excludeBrandRejected,
    requireTopWinner,
    minOnTimeRate,
    enforceCooldownFilter,
  ]);

  const bucketCounts = useMemo(() => {
    const counts: Record<RecommendationBucket, number> = {
      ALL: allEvaluatedKocs.length,
      BRAND_REBOOK: 0,
      CROSS_BRAND_WINNER: 0,
      COMPETITOR_ACTIVE: 0,
      FOC_SATELLITE: 0,
    };
    for (const item of allEvaluatedKocs) {
      if (item.buckets.includes('BRAND_REBOOK')) counts.BRAND_REBOOK++;
      if (item.buckets.includes('CROSS_BRAND_WINNER')) counts.CROSS_BRAND_WINNER++;
      if (item.buckets.includes('COMPETITOR_ACTIVE')) counts.COMPETITOR_ACTIVE++;
      if (item.buckets.includes('FOC_SATELLITE')) counts.FOC_SATELLITE++;
    }
    return counts;
  }, [allEvaluatedKocs]);

  const [visibleLimit, setVisibleLimit] = useState<number>(50);

  const rankedKocs = useMemo(() => {
    const byBucket =
      bucketFilter === 'ALL'
        ? allEvaluatedKocs
        : allEvaluatedKocs.filter((item) => item.buckets.includes(bucketFilter));
    if (!excludeStaffNotSuitable) return byBucket;
    return byBucket.filter(
      (item) =>
        getChannelSummary(item.koc.channelId)?.latestReview.verdict !== 'NOT_SUITABLE'
    );
  }, [allEvaluatedKocs, bucketFilter, excludeStaffNotSuitable, getChannelSummary]);

  const displayedRankedKocs = useMemo(
    () => rankedKocs.slice(0, visibleLimit),
    [rankedKocs, visibleLimit]
  );

  const toggleSelectKoc = (id: string) => {
    setSelectedKocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedKocIds.length === rankedKocs.length) {
      setSelectedKocIds([]);
    } else {
      setSelectedKocIds(rankedKocs.map((r) => r.koc.id));
    }
  };

  // Điền tự động KOC điểm cao nhất theo định mức KL còn thiếu trong Kế hoạch tháng
  const handleAutoPickByMissingQuotas = () => {
    const { pickedIds, pickedByGrade } = autoPickKocsForMissingQuotas(
      allEvaluatedKocs,
      missingQuotas,
      existingListings,
      selectedStore?.storeName
    );
    setSelectedKocIds(pickedIds);
    if (onNotify) {
      const summaryParts = Object.entries(pickedByGrade).map(([g, c]) => `${g}: ${c}`);
      if (pickedIds.length > 0 && totalMissingSlots > 0 && pickedIds.length < totalMissingSlots) {
        onNotify(
          `Chỉ tìm thấy ${pickedIds.length}/${totalMissingSlots} KOC thỏa điều kiện (${summaryParts.join(', ')}) — thiếu ${totalMissingSlots - pickedIds.length} KOC so với định mức.`,
          'warning'
        );
      } else if (pickedIds.length > 0) {
        onNotify(
          `Đã chọn ${pickedIds.length} KOC điểm cao nhất (${summaryParts.join(', ')}).`,
          'info'
        );
      } else {
        onNotify('Không tìm thấy KOC phù hợp chưa có trong danh sách đề xuất.', 'warning');
      }
    }
  };

  // Dự toán chi phí
  const selectedKocsSummary = useMemo(() => {
    const selectedSet = new Set(selectedKocIds);
    const list = allEvaluatedKocs.filter((r) => selectedSet.has(r.koc.id));
    const totalCost = list.reduce((sum, r) => sum + (r.koc.rateCardVideo || 0), 0);
    const estimatedGmv = list.reduce(
      (sum, r) =>
        sum +
        (r.koc.tiktokGmv30d || r.koc.recentRevenue
          ? (r.koc.tiktokGmv30d || r.koc.recentRevenue || 0) * 0.6
          : (r.koc.rateCardVideo || 500_000) * Math.max(2.2, r.history.systemAvgRoi || 2.5)),
      0
    );
    const avgScore =
      list.length > 0
        ? Math.round(list.reduce((s, r) => s + r.matchPercent, 0) / list.length)
        : 0;

    const storeBudget = selectedStore?.monthlyBudget || 0;
    const isOverBudget = storeBudget > 0 && totalCost > storeBudget;

    return {
      count: list.length,
      totalCost,
      estimatedGmv,
      avgScore,
      storeBudget,
      isOverBudget,
      list: list.map((r) => r.koc),
      rankedList: list,
    };
  }, [allEvaluatedKocs, selectedKocIds, selectedStore]);

  // Đưa vào đợt Listing Batch
  const handleTransferToListingBatch = () => {
    if (!selectedStore) return;
    if (selectedKocIds.length === 0) {
      if (onNotify) onNotify('Vui lòng chọn ít nhất 1 KOC để đưa vào đợt duyệt.', 'warning');
      return;
    }

    const nowIso = new Date().toISOString();
    const newListings: Partial<KocListingItem>[] = selectedKocsSummary.rankedList.map((ranked) => {
      const k = ranked.koc;
      let tier: 'CELEB' | 'MEGA' | 'MACRO' | 'MICRO' | 'NANO' = 'MICRO';
      if (k.tier === 'TIER_1_CELEB') tier = 'CELEB';
      else if (k.tier === 'TIER_2_MACRO') tier = 'MACRO';
      else if (k.tier === 'TIER_3_MICRO') tier = 'MICRO';
      else tier = 'NANO';

      const grade = normalizeGradeCode(k.salaryGrade || initialSalaryGrade || 'KL3');
      const matchedPlanRow = activePlan?.items?.find(
        (it) => normalizeGradeCode(it.salaryGrade || it.tierCode) === grade
      );

      return {
        id: createListingId(k.id),
        batchId: `BATCH-${targetBatchCycle}-${selectedStore.id}`,
        batchCycle: targetBatchCycle,
        monthKey: activePlan?.month || '2026/10',
        storeId: selectedStore.id,
        storeName: selectedStore.storeName,
        brandName: selectedStore.brandName,
        sourcePlanId: activePlan?.id,
        sourcePlanVersion: activePlan?.currentVersionCode || 'v1.0',
        planRowId: matchedPlanRow?.id,
        salaryGrade: grade,
        kocId: k.id,
        kocName: k.stageName,
        kocHandle: k.channelId.startsWith('@') ? k.channelId : `@${k.channelId}`,
        channel: 'TikTok Shop',
        followersCount: k.followers,
        tier,
        niche: k.niche || k.tepKenh,
        videoFormat: matchedPlanRow?.contentFormat || 'Review & Hướng dẫn sử dụng',
        pillarName: `Chiến dịch ${selectedStore.category} (${ranked.primaryBucketLabel} · ${ranked.matchPercent}đ)`,
        proposedFee: k.rateCardVideo ?? matchedPlanRow?.unitCost ?? 2_200_000,
        brandApprovalStatus: 'BRAND_PENDING',
        kocNegotiationStatus: 'NOT_CONTACTED',
        overallStatus: 'DRAFT',
        expectedAirDate: '2026-10-25',
        assignedStaffId: 'staff-booking',
        assignedStaffName:
          matchedPlanRow?.assignedStaff || selectedStore.b2cOwnerName || currentUserName,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    if (onAddToListingBatch) {
      onAddToListingBatch(newListings, selectedStore, targetBatchCycle);
    }

    if (onNotify) {
      onNotify(
        `Đã đưa ${newListings.length} KOC vào ${targetBatchCycle} cho gian hàng ${selectedStore.brandName}.`,
        'success'
      );
    }

    onClose();
  };

  // Xuất CSV kèm bảng chấm điểm 4 trụ cột
  const handleExportCsv = () => {
    if (!selectedStore || rankedKocs.length === 0) return;

    const exportItems =
      selectedKocIds.length > 0
        ? allEvaluatedKocs.filter((r) => selectedKocIds.includes(r.koc.id))
        : rankedKocs;

    const headers = [
      'STT',
      'Gian hàng',
      'KOC Stage Name',
      'ID Kênh TikTok',
      'Nhóm đề xuất',
      'Phân hạng',
      'Tổng điểm (/100)',
      'Điểm Hiệu quả (/35)',
      'Điểm Độ khớp (/25)',
      'Điểm Ngân sách (/20)',
      'Điểm Vận hành (/20)',
      'Điểm Cộng/Trừ',
      'Khung lương',
      'Tệp kênh',
      'Followers',
      'Giá dự kiến (VNĐ)',
      'CPV ước tính (/1K view)',
      'GMV 30d sàn (VNĐ)',
      'Deal với Brand này',
      'ROI với Brand',
      'Tổng job UpBase',
      'Tỷ lệ đúng hạn (%)',
      'Lý do đề xuất',
    ];

    const rows = exportItems.map((item, idx) => [
      idx + 1,
      `"${selectedStore.brandName}"`,
      `"${item.koc.stageName}"`,
      `"${item.koc.channelId}"`,
      `"${item.primaryBucketLabel}"`,
      `"${item.matchTierLabel}"`,
      item.matchPercent,
      item.scoreBreakdown.perfTotal,
      item.scoreBreakdown.fitTotal,
      item.scoreBreakdown.costTotal,
      item.scoreBreakdown.opsTotal,
      item.scoreBreakdown.bonusPenaltyScore,
      item.koc.salaryGrade,
      `"${item.koc.tepKenh}"`,
      item.koc.followers,
      item.koc.rateCardVideo || 0,
      item.estimatedCpv,
      item.koc.tiktokGmv30d || item.koc.recentRevenue || 0,
      item.history.brandApprovedDealsCount,
      item.history.brandAvgRoi,
      item.history.totalUpbaseDeals,
      `${item.history.onTimeRate}%`,
      `"${item.evidenceTags.join(' | ')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `De_xuat_KOC_${selectedStore.brandName.replace(/\s+/g, '_')}_${getTodayIsoDate()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onNotify) {
      onNotify(`Đã xuất bảng chấm điểm ${exportItems.length} KOC ra tệp CSV.`, 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        size="3xl"
        title="Đề xuất & Chấm điểm KOC cho Gian hàng (Thang 100 điểm)"
        footer={
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs w-full md:w-auto justify-between md:justify-start">
              <div>
                <span className="text-2xs text-ink-3 block">Đã chọn</span>
                <span className="font-semibold text-primary text-sm tabular-nums">
                  {selectedKocsSummary.count} KOC
                  {selectedKocsSummary.avgScore > 0
                    ? ` (TB ${selectedKocsSummary.avgScore}/100đ)`
                    : ''}
                </span>
              </div>

              <div className="border-l border-line pl-3 sm:pl-4">
                <span className="text-2xs text-ink-3 block">Chi phí Net dự kiến</span>
                <span
                  className={`font-semibold text-sm tabular-nums ${
                    selectedKocsSummary.isOverBudget ? 'text-critical' : 'text-ink'
                  }`}
                >
                  {formatVndShort(selectedKocsSummary.totalCost)}
                </span>
                {selectedKocsSummary.isOverBudget && (
                  <span className="text-2xs text-critical font-semibold block">
                    Vượt ngân sách tháng ({formatVndShort(selectedKocsSummary.storeBudget)})
                  </span>
                )}
              </div>

              <div className="border-l border-line pl-3 sm:pl-4">
                <span className="text-2xs text-ink-3 block">Doanh số kỳ vọng (GMV)</span>
                <span className="font-semibold text-positive text-sm tabular-nums">
                  ~{formatVndShort(selectedKocsSummary.estimatedGmv)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </Button>

              <div className="flex items-center gap-1.5 bg-sunken px-2.5 py-1 rounded-md border border-line">
                <span className="text-2xs font-medium text-ink-2">Đợt:</span>
                <select
                  value={targetBatchCycle}
                  onChange={(e) => setTargetBatchCycle(e.target.value as ListingBatchCycle)}
                  className="bg-transparent text-xs font-semibold text-ink focus:outline-none"
                >
                  <option value="BATCH_10">Đợt 10 hàng tháng</option>
                  <option value="BATCH_20">Đợt 20 hàng tháng</option>
                  <option value="BATCH_30">Đợt 30 hàng tháng</option>
                  <option value="BATCH_ADHOC">Đợt bổ sung</option>
                </select>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={handleTransferToListingBatch}
                disabled={selectedKocsSummary.count === 0}
              >
                Đưa vào đợt duyệt ({selectedKocsSummary.count})
              </Button>
            </div>
          </div>
        }
      >
        <div className="-m-4 sm:-m-5 flex flex-col">
          {/* Thanh chọn gian hàng & Định mức thiếu của Kế hoạch tháng */}
          <div className="p-3.5 sm:p-4 border-b border-line bg-sunken space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 w-full lg:w-auto lg:min-w-[300px]">
                <label className="text-xs font-semibold text-ink-2 whitespace-nowrap">
                  Gian hàng mục tiêu:
                </label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-md px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-primary"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.brandName} — {s.storeName} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStore && (
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                  <div className="bg-surface px-2.5 py-1 rounded-md border border-line">
                    <span className="text-2xs text-ink-3 block">Ngân sách tháng</span>
                    <span className="font-semibold text-primary tabular-nums">
                      {formatVndShort(selectedStore.monthlyBudget)}
                    </span>
                  </div>
                  <div className="bg-surface px-2.5 py-1 rounded-md border border-line">
                    <span className="text-2xs text-ink-3 block">Mục tiêu GMV</span>
                    <span className="font-semibold text-positive tabular-nums">
                      {formatVndShort(selectedStore.monthlyTargetGmv)}
                    </span>
                  </div>
                  <div className="bg-surface px-2.5 py-1 rounded-md border border-line">
                    <span className="text-2xs text-ink-3 block">Ngành hàng</span>
                    <span className="font-semibold text-ink">{selectedStore.category}</span>
                  </div>
                  <div className="bg-surface px-2.5 py-1 rounded-md border border-line">
                    <span className="text-2xs text-ink-3 block">Phụ trách B2C</span>
                    <span className="font-semibold text-ink">{selectedStore.b2cOwnerName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Định mức thiếu theo KL từ Kế hoạch tháng */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
              <div className="flex items-center gap-1.5 flex-wrap text-2xs">
                <span className="font-semibold text-ink-2">
                  Định mức cần bổ sung ({activePlan?.month || '2026/10'}):
                </span>
                {missingQuotas.filter((q) => q.planQty > 0).length === 0 ? (
                  <span className="text-ink-3">
                    Chưa phân bổ định mức KL
                  </span>
                ) : (
                  missingQuotas
                    .filter((q) => q.planQty > 0)
                    .map((q) => {
                      const isSelected = selectedGrades.includes(q.grade);
                      return (
                        <button
                          key={q.grade}
                          type="button"
                          onClick={() => toggleGrade(q.grade)}
                          className={`px-2 py-0.5 rounded border text-2xs font-medium transition cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white border-primary'
                              : q.missingQty > 0
                                ? 'bg-warning-soft text-warning border-warning/30 hover:bg-warning-soft/80'
                                : 'bg-surface text-ink-3 border-line'
                          }`}
                        >
                          {q.grade}:{' '}
                          {q.missingQty > 0
                            ? `Thiếu ${q.missingQty}/${q.planQty}`
                            : `Đủ ${q.listedQty}/${q.planQty}`}
                        </button>
                      );
                    })
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={CheckSquare}
                onClick={handleAutoPickByMissingQuotas}
              >
                {totalMissingSlots > 0
                  ? `Điền theo định mức thiếu (${totalMissingSlots} KOC)`
                  : 'Chọn nhanh Top 5 KOC điểm cao'}
              </Button>
            </div>
          </div>

          {/* Thanh chọn 4 Rổ Chiến Thuật (Buckets) */}
          <div className="px-4 py-2.5 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
            <Chips
              value={bucketFilter}
              onChange={setBucketFilter}
              items={[
                { key: 'ALL', label: 'Tất cả phù hợp', count: bucketCounts.ALL },
                {
                  key: 'BRAND_REBOOK',
                  label: '1. KOC Tái book của Brand',
                  count: bucketCounts.BRAND_REBOOK,
                },
                {
                  key: 'CROSS_BRAND_WINNER',
                  label: '2. Winner cùng ngành',
                  count: bucketCounts.CROSS_BRAND_WINNER,
                },
                {
                  key: 'COMPETITOR_ACTIVE',
                  label: '3. Tệp mở rộng / Đối thủ',
                  count: bucketCounts.COMPETITOR_ACTIVE,
                },
                {
                  key: 'FOC_SATELLITE',
                  label: '4. Tệp gửi mẫu (FOC / KL1)',
                  count: bucketCounts.FOC_SATELLITE,
                },
              ]}
            />

            <div className="text-2xs text-ink-3 font-medium">
              Trọng số: <strong>Hiệu quả 35đ</strong> · <strong>Độ khớp 25đ</strong> ·{' '}
              <strong>Ngân sách 20đ</strong> · <strong>Vận hành 20đ</strong>
            </div>
          </div>

          {/* Nội dung chính 2 cột */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] max-h-[62dvh] overflow-y-auto lg:overflow-hidden">
            {/* Cột trái: Bộ tiêu chí lọc & Quy tắc chặn cứng */}
            <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-line lg:overflow-y-auto space-y-3.5 bg-surface text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  Bộ lọc &amp; Quy tắc chặn
                </span>
                {selectedGrades.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGrades([])}
                    className="text-2xs text-primary hover:underline font-medium"
                  >
                    Bỏ lọc bậc KL ({selectedGrades.length})
                  </button>
                )}
              </div>

              {/* Tìm kiếm nhanh */}
              <div>
                <label className="text-2xs font-semibold text-ink-2 block mb-1">
                  Tìm tên hoặc ID kênh:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchKocText}
                    onChange={(e) => setSearchKocText(e.target.value)}
                    placeholder="VD: megauriviu, chanhbeauty..."
                    className="w-full pl-8 pr-3 py-1.5 bg-sunken border border-line rounded-md text-xs text-ink focus:bg-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Khung lương (Salary Grade) */}
              <div className="space-y-1.5">
                <label className="text-2xs font-semibold text-ink-2 block">
                  Khung lương (KL) mục tiêu:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {KL_FILTER_OPTIONS.map((g) => {
                    const active = selectedGrades.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-1.5 p-1.5 rounded-md border text-2xs cursor-pointer transition ${
                          active
                            ? 'bg-accent-soft border-primary text-primary font-semibold'
                            : 'bg-sunken border-line text-ink-2 hover:bg-canvas'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleGrade(g.id)}
                          className="rounded text-primary focus:ring-0"
                        />
                        <span className="truncate">{g.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tệp kênh */}
              <div>
                <label className="text-2xs font-semibold text-ink-2 block mb-1">
                  Tệp kênh sáng tạo:
                </label>
                <select
                  value={selectedTepKenh}
                  onChange={(e) => setSelectedTepKenh(e.target.value)}
                  className="w-full bg-sunken border border-line rounded-md p-1.5 text-xs font-medium text-ink focus:bg-surface focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Tất cả tệp kênh (Chấm điểm tự động theo ngành)</option>
                  <option value="Review Nữ">Review Nữ</option>
                  <option value="Mẹ & Bé (bầu)">Mẹ &amp; Bé (bầu)</option>
                  <option value="Mẹ bé (bé)">Mẹ &amp; Bé (em bé)</option>
                  <option value="Beauty">Beauty / Trang điểm</option>
                  <option value="Bác sỹ/chuyên gia">Bác sỹ / Chuyên gia</option>
                  <option value="Gia đình">Gia đình</option>
                  <option value="ELHA">Gia dụng (ELHA)</option>
                  <option value="Lifestyle">Đời sống (Lifestyle)</option>
                </select>
              </div>

              {/* Quy tắc chặn cứng & Lịch sử hợp tác */}
              <div className="p-2.5 bg-sunken rounded-lg border border-line space-y-2">
                <div className="flex items-center gap-1.5 text-ink font-semibold text-2xs">
                  <History className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Quy tắc loại trừ &amp; Lịch sử (HF-01..06)</span>
                </div>

                <div>
                  <select
                    value={historyFilter}
                    onChange={(e) =>
                      setHistoryFilter(
                        e.target.value as
                          | 'ALL'
                          | 'BRAND_EXPERIENCED'
                          | 'UPBASE_EXPERIENCED'
                          | 'NEW_KOC'
                      )
                    }
                    className="w-full bg-surface border border-line rounded-md p-1.5 text-2xs font-medium text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">Mọi lịch sử hợp tác</option>
                    <option value="BRAND_EXPERIENCED">
                      Đã từng được {selectedStore?.brandName} duyệt
                    </option>
                    <option value="UPBASE_EXPERIENCED">Đã có deal thành công tại UpBase</option>
                    <option value="NEW_KOC">KOC mới (Chưa từng book tại UpBase)</option>
                  </select>
                </div>

                <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeBrandRejected}
                    onChange={(e) => setExcludeBrandRejected(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span>
                    <strong>HF-01:</strong> Loại KOC từng bị {selectedStore?.brandName} từ chối
                  </span>
                </label>

                <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceCooldownFilter}
                    onChange={(e) => setEnforceCooldownFilter(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span>
                    <strong>HF-05:</strong> Chặn KOC vừa lên sóng &lt; 21 ngày trên cùng Brand
                  </span>
                </label>

                <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireTopWinner}
                    onChange={(e) => setRequireTopWinner(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning" />
                    <strong>Chỉ hiển thị Top 20% KOC Doanh số cao</strong>
                  </span>
                </label>

                <div>
                  <label className="text-2xs text-ink-2 flex items-center justify-between mb-1">
                    <span>Tỷ lệ trả video đúng hạn SLA:</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {minOnTimeRate === 0 ? 'Tất cả' : `≥ ${minOnTimeRate}%`}
                    </span>
                  </label>
                  <select
                    value={minOnTimeRate}
                    onChange={(e) => setMinOnTimeRate(Number(e.target.value))}
                    className="w-full bg-surface border border-line rounded-md p-1.5 text-2xs font-medium text-ink"
                  >
                    <option value={0}>Tất cả (Chấm điểm tự động theo SLA)</option>
                    <option value={85}>≥ 85% đúng hạn</option>
                    <option value={95}>≥ 95% đúng hạn</option>
                    <option value={100}>100% đúng hạn</option>
                  </select>
                </div>
              </div>

              {/* Chỉ số bán hàng & Nhân khẩu học */}
              <div className="pt-2 border-t border-line space-y-2">
                <div>
                  <label className="text-2xs text-ink-2 flex items-center justify-between mb-1">
                    <span>GMV sàn 30 ngày tối thiểu:</span>
                    <span className="font-semibold text-primary tabular-nums">
                      {minGmvThreshold === 0 ? 'Không giới hạn' : formatVndShort(minGmvThreshold)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200000000"
                    step="10000000"
                    value={minGmvThreshold}
                    onChange={(e) => setMinGmvThreshold(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <label className="text-2xs text-ink-2 flex items-center justify-between mb-1">
                    <span>Tỷ lệ khán giả Nữ tối thiểu:</span>
                    <span className="font-semibold text-primary tabular-nums">
                      {minFemaleRatio === 0 ? 'Không giới hạn' : `${minFemaleRatio}%`}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="10"
                    value={minFemaleRatio}
                    onChange={(e) => setMinFemaleRatio(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 pt-1">
                  {[
                    { id: 'ALL', label: 'Mọi định dạng' },
                    { id: 'VIDEO', label: 'Video ngắn' },
                    { id: 'LIVE', label: 'Livestream' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPreferFormat(f.id as 'ALL' | 'VIDEO' | 'LIVE')}
                      className={`p-1 rounded border text-2xs font-medium transition ${
                        preferFormat === f.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-sunken border-line text-ink-2 hover:bg-canvas'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pháp lý & Phân công */}
              <div className="pt-2 border-t border-line space-y-1.5">
                <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLegalDoc}
                    onChange={(e) => setRequireLegalDoc(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span>Chỉ chọn KOC đã đủ CCCD / Mã số thuế</span>
                </label>

                <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeAssignedKoc}
                    onChange={(e) => setExcludeAssignedKoc(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span>Loại KOC đang do chuyên viên khác phụ trách</span>
                </label>

                <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeStaffNotSuitable}
                    onChange={(e) => setExcludeStaffNotSuitable(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span>Ẩn kênh đã bị nhân viên đánh giá Không phù hợp</span>
                </label>
              </div>
            </div>

            {/* Cột phải: Bảng kết quả xếp hạng KOC */}
            <div className="lg:col-span-8 flex flex-col bg-sunken lg:overflow-hidden">
              <div className="px-4 py-2.5 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleSelectAll}>
                    {selectedKocIds.length === rankedKocs.length && rankedKocs.length > 0
                      ? 'Bỏ chọn tất cả'
                      : `Chọn tất cả (${rankedKocs.length})`}
                  </Button>
                  <span className="text-2xs text-ink-3">
                    Đang hiển thị <strong>{rankedKocs.length}</strong> KOC xếp theo tổng điểm
                  </span>
                  {totalMissingSlots > 0 && rankedKocs.length < totalMissingSlots && (
                    <Status tone="warning">
                      Chỉ có {rankedKocs.length}/{totalMissingSlots} KOC khớp định mức cần bổ sung (thiếu{' '}
                      {totalMissingSlots - rankedKocs.length} KOC)
                    </Status>
                  )}
                  {totalMissingSlots > 0 &&
                    rankedKocs.length >= totalMissingSlots &&
                    selectedKocsSummary.count > 0 &&
                    selectedKocsSummary.count < totalMissingSlots && (
                      <Status tone="warning">
                        Đã chọn {selectedKocsSummary.count}/{totalMissingSlots} KOC theo định mức (thiếu{' '}
                        {totalMissingSlots - selectedKocsSummary.count} KOC)
                      </Status>
                    )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={handleExportCsv}
                  disabled={rankedKocs.length === 0}
                >
                  Xuất CSV bảng điểm
                </Button>
              </div>

              <div className="flex-1 lg:overflow-y-auto p-3.5 space-y-2.5">
                {rankedKocs.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <AlertCircle className="w-7 h-7 text-ink-3 mx-auto" />
                    <div className="text-xs font-semibold text-ink">
                      Không có KOC thỏa mãn đồng thời các điều kiện lọc hiện tại
                    </div>
                    <div className="pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedGrades([]);
                          setBucketFilter('ALL');
                          setSelectedTepKenh('ALL');
                          setMinGmvThreshold(0);
                          setMinFemaleRatio(0);
                          setRequireTopWinner(false);
                        }}
                      >
                        Đặt lại bộ lọc
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                  {displayedRankedKocs.map((item) => {
                    const {
                      koc,
                      matchPercent,
                      matchTier,
                      matchTierLabel,
                      primaryBucketLabel,
                      hasLegalDoc,
                      estimatedCpv,
                      history,
                      scoreBreakdown,
                      evidenceTags,
                      warningTags,
                    } = item;
                    const isSelected = selectedKocIds.includes(koc.id);

                    return (
                      <div
                        key={koc.id}
                        className={`p-3 rounded-xl border transition flex flex-col gap-2.5 ${
                          isSelected
                            ? 'bg-accent-soft/40 border-primary ring-1 ring-primary'
                            : 'bg-surface border-line hover:border-line-strong'
                        }`}
                      >
                        {/* Hàng 1: Định danh KOC + Chỉ số thực + Tổng điểm */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div
                            onClick={() => toggleSelectKoc(koc.id)}
                            className="flex items-center gap-2.5 min-w-0 w-full md:w-auto md:min-w-[250px] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-primary focus:ring-0 shrink-0"
                            />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                koc.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
                              }
                              alt={koc.stageName}
                              className="w-9 h-9 rounded-full object-cover border border-line shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-ink text-xs">
                                  {koc.stageName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-semibold text-ink-2">
                                  {koc.salaryGrade}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-2xs font-medium">
                                  {primaryBucketLabel}
                                </span>
                                {hasLegalDoc && (
                                  <span title="Đã có CCCD / MST">
                                    <ShieldCheck className="w-3.5 h-3.5 text-positive" />
                                  </span>
                                )}
                                {history.isWinnerTop20 && (
                                  <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-warning">
                                    <Star className="w-3 h-3" /> Top 20%
                                  </span>
                                )}
                                <KocChannelReviewBadge
                                  summary={getChannelSummary(koc.channelId)}
                                  onClick={() =>
                                    openChannelReview(
                                      {
                                        handle: koc.channelId,
                                        channelName: koc.stageName,
                                        avatarUrl: koc.avatarUrl,
                                        defaultBrandScope: selectedStore?.brandName,
                                        sourceScreen: 'Bộ lọc tìm kiếm KOC cho Gian hàng',
                                      },
                                      'CHANNEL_DETAIL'
                                    )
                                  }
                                />
                              </div>
                              <div className="text-2xs text-ink-3 truncate mt-0.5">
                                @{koc.channelId.replace('@', '')} · {koc.tepKenh} · Nữ{' '}
                                {koc.femaleRatio ?? koc.audienceGender?.femalePct ?? 65}%
                              </div>
                            </div>
                          </div>

                          {/* Cụm chỉ số thương mại */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center w-full md:w-auto bg-sunken px-2.5 py-1.5 rounded-lg border border-line">
                            <div>
                              <span className="text-3xs text-ink-3 block">Follower</span>
                              <span className="text-2xs font-semibold text-ink tabular-nums">
                                {formatVndShort(koc.followers).replace('đ', '')}
                              </span>
                            </div>
                            <div>
                              <span className="text-3xs text-ink-3 block">GMV 30d</span>
                              <span className="text-2xs font-semibold text-primary tabular-nums">
                                {koc.tiktokGmv30d || koc.recentRevenue
                                  ? formatVndShort(koc.tiktokGmv30d || koc.recentRevenue || 0)
                                  : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-3xs text-ink-3 block">ROI lịch sử</span>
                              <span className="text-2xs font-semibold text-positive tabular-nums">
                                {history.brandApprovedDealsCount > 0
                                  ? `${history.brandAvgRoi}x`
                                  : history.systemAvgRoi > 0
                                    ? `${history.systemAvgRoi}x`
                                    : 'Mới'}
                              </span>
                            </div>
                            <div>
                              <span className="text-3xs text-ink-3 block">Giá Net</span>
                              <span className="text-2xs font-semibold text-ink tabular-nums">
                                {koc.rateCardVideo ? formatVndShort(koc.rateCardVideo) : '0đ FOC'}
                              </span>
                            </div>
                          </div>

                          {/* Huy hiệu Tổng điểm /100 */}
                          <div className="flex items-center gap-2.5 justify-between md:justify-end w-full md:w-auto shrink-0">
                            <div className="text-left md:text-right">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-3xs font-semibold ${
                                  matchTier === 'TOP_MATCH'
                                    ? 'bg-positive-soft text-positive'
                                    : matchTier === 'GOOD_MATCH'
                                      ? 'bg-accent-soft text-accent'
                                      : 'bg-sunken text-ink-2'
                                }`}
                              >
                                {matchTierLabel}
                              </span>
                              <span className="text-3xs text-ink-3 block mt-0.5 tabular-nums">
                                {estimatedCpv > 0
                                  ? `CPV ~${formatVndShort(estimatedCpv)}`
                                  : 'FOC 0đ'}
                              </span>
                            </div>

                            <div
                              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-semibold border tabular-nums ${
                                matchPercent >= 85
                                  ? 'bg-positive-soft text-positive border-positive/30'
                                  : matchPercent >= 70
                                    ? 'bg-accent-soft text-accent border-primary/30'
                                    : 'bg-sunken text-ink-2 border-line'
                              }`}
                            >
                              <span className="text-xs leading-none">{matchPercent}</span>
                              <span className="text-3xs font-normal opacity-80">/100đ</span>
                            </div>
                          </div>
                        </div>

                        {/* Hàng 2: Thanh Bóc Tách Điểm 4 Trụ Cột */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2 border-t border-line text-2xs">
                          <div className="bg-sunken/70 px-2 py-1 rounded border border-line flex items-center justify-between">
                            <span className="text-ink-3">1. Hiệu quả:</span>
                            <strong className="text-ink tabular-nums">
                              {scoreBreakdown.perfTotal}/35đ
                            </strong>
                          </div>
                          <div className="bg-sunken/70 px-2 py-1 rounded border border-line flex items-center justify-between">
                            <span className="text-ink-3">2. Độ khớp:</span>
                            <strong className="text-ink tabular-nums">
                              {scoreBreakdown.fitTotal}/25đ
                            </strong>
                          </div>
                          <div className="bg-sunken/70 px-2 py-1 rounded border border-line flex items-center justify-between">
                            <span className="text-ink-3">3. Ngân sách:</span>
                            <strong className="text-ink tabular-nums">
                              {scoreBreakdown.costTotal}/20đ
                            </strong>
                          </div>
                          <div className="bg-sunken/70 px-2 py-1 rounded border border-line flex items-center justify-between">
                            <span className="text-ink-3">4. Vận hành:</span>
                            <strong className="text-ink tabular-nums">
                              {scoreBreakdown.opsTotal}/20đ
                            </strong>
                          </div>
                          <div className="bg-sunken/70 px-2 py-1 rounded border border-line flex items-center justify-between col-span-2 sm:col-span-1">
                            <span className="text-ink-3">Thưởng/Phạt:</span>
                            <strong
                              className={`tabular-nums ${
                                scoreBreakdown.bonusPenaltyScore > 0
                                  ? 'text-positive'
                                  : scoreBreakdown.bonusPenaltyScore < 0
                                    ? 'text-critical'
                                    : 'text-ink-2'
                              }`}
                            >
                              {scoreBreakdown.bonusPenaltyScore > 0
                                ? `+${scoreBreakdown.bonusPenaltyScore}đ`
                                : `${scoreBreakdown.bonusPenaltyScore}đ`}
                            </strong>
                          </div>
                        </div>

                        {/* Hàng 3: Dẫn chứng lý do đề xuất & Nút xem chi tiết */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-2xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {evidenceTags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full bg-positive-soft/60 text-positive font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                            {warningTags.map((w, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full bg-warning-soft text-warning font-medium inline-flex items-center gap-1"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {w}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openChannelReview(
                                  {
                                    handle: koc.channelId,
                                    channelName: koc.stageName,
                                    avatarUrl: koc.avatarUrl,
                                    defaultBrandScope: selectedStore?.brandName,
                                    initialVerdict: 'SUITABLE',
                                    sourceScreen: 'Bộ lọc tìm kiếm KOC cho Gian hàng',
                                  },
                                  'CHANNEL_DETAIL'
                                );
                              }}
                              className="text-2xs font-semibold text-positive hover:underline inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ĐG Phù hợp</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openChannelReview(
                                  {
                                    handle: koc.channelId,
                                    channelName: koc.stageName,
                                    avatarUrl: koc.avatarUrl,
                                    defaultBrandScope: selectedStore?.brandName,
                                    initialVerdict: 'NOT_SUITABLE',
                                    sourceScreen: 'Bộ lọc tìm kiếm KOC cho Gian hàng',
                                  },
                                  'CHANNEL_DETAIL'
                                );
                              }}
                              className="text-2xs font-semibold text-critical hover:underline inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Không phù hợp</span>
                            </button>

                            {getChannelSummary(koc.channelId) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openChannelReview(
                                    {
                                      handle: koc.channelId,
                                      channelName: koc.stageName,
                                      avatarUrl: koc.avatarUrl,
                                      defaultBrandScope: selectedStore?.brandName,
                                      sourceScreen: 'Bộ lọc tìm kiếm KOC cho Gian hàng',
                                    },
                                    'CHANNEL_DETAIL'
                                  );
                                }}
                                className="text-2xs font-semibold text-ink-2 hover:underline inline-flex items-center gap-1"
                              >
                                <History className="w-3 h-3" />
                                <span>
                                  Lịch sử ĐG ({getChannelSummary(koc.channelId)!.totalReviews})
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingKocDetail(item);
                              }}
                              className="text-2xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>
                                Chi tiết điểm &amp; {history.allPastDeals.length} deal lịch sử
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {rankedKocs.length > visibleLimit && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setVisibleLimit((prev) => prev + 50)}
                      >
                        Xem thêm 50 KOC ({visibleLimit}/{rankedKocs.length})
                      </Button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal con: Bảng bóc tách điểm số chi tiết & Lịch sử deal của 1 KOC */}
      <Modal
        open={!!inspectingKocDetail}
        onClose={() => setInspectingKocDetail(null)}
        size="xl"
        title={
          inspectingKocDetail
            ? `Bóc tách điểm đề xuất & Lịch sử: ${inspectingKocDetail.koc.stageName} (@${inspectingKocDetail.koc.channelId.replace('@', '')})`
            : 'Chi tiết KOC'
        }
        footer={
          <Button variant="secondary" size="sm" onClick={() => setInspectingKocDetail(null)}>
            Đóng
          </Button>
        }
      >
        {inspectingKocDetail && (
          <div className="space-y-4 text-xs">
            {/* Bảng bóc tách 4 trụ cột điểm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-sunken border border-line space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>1. Hiệu quả thương mại &amp; Tương tác</span>
                  <span className="text-primary tabular-nums">
                    {inspectingKocDetail.scoreBreakdown.perfTotal} / 35đ
                  </span>
                </div>
                <div className="text-2xs text-ink-2 space-y-1">
                  <div className="flex justify-between">
                    <span>• ROI lịch sử ({inspectingKocDetail.history.systemAvgRoi || 2.2}x):</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.roiScore} / 15đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Doanh số GMV so với chuẩn {inspectingKocDetail.koc.salaryGrade}:</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.gmvScore} / 10đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Tương tác (ER%) &amp; Chuyển đổi giỏ hàng:</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.engagementCvrScore} / 10đ
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-sunken border border-line space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>2. Độ khớp Ngành hàng &amp; Khán giả</span>
                  <span className="text-primary tabular-nums">
                    {inspectingKocDetail.scoreBreakdown.fitTotal} / 25đ
                  </span>
                </div>
                <div className="text-2xs text-ink-2 space-y-1">
                  <div className="flex justify-between">
                    <span>• Tệp kênh ({inspectingKocDetail.koc.tepKenh}):</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.categoryFitScore} / 12đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      • Khán giả (Nữ {inspectingKocDetail.koc.femaleRatio ?? 65}%, tuổi 18–34):
                    </span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.demographicsScore} / 8đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Đặc tính nhận mẫu &amp; Đa nền tảng:</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.productSampleScore} / 5đ
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-sunken border border-line space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>3. Độ khớp Ngân sách &amp; Khung giá</span>
                  <span className="text-primary tabular-nums">
                    {inspectingKocDetail.scoreBreakdown.costTotal} / 20đ
                  </span>
                </div>
                <div className="text-2xs text-ink-2 space-y-1">
                  <div className="flex justify-between">
                    <span>• Khớp định mức KL đang thiếu ({inspectingKocDetail.koc.salaryGrade}):</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.gradeMatchScore} / 10đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Đơn giá so với biên độ lịch sử:</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.rateBenchmarkScore} / 6đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      • CPV ước tính (~{formatVndShort(inspectingKocDetail.estimatedCpv)}/1K view):
                    </span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.cpvScore} / 4đ
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-sunken border border-line space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>4. Uy tín vận hành, SLA &amp; Pháp lý</span>
                  <span className="text-primary tabular-nums">
                    {inspectingKocDetail.scoreBreakdown.opsTotal} / 20đ
                  </span>
                </div>
                <div className="text-2xs text-ink-2 space-y-1">
                  <div className="flex justify-between">
                    <span>
                      • Tỷ lệ trả bài đúng hạn ({inspectingKocDetail.history.onTimeRate}%):
                    </span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.onTimeScore} / 8đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      • Điểm tin cậy ({inspectingKocDetail.history.reliabilityScore.toFixed(1)}/10):
                    </span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.reliabilityHealthScore} / 6đ
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>• Đủ SĐT, CCCD/MST &amp; Hợp đồng:</span>
                    <strong className="tabular-nums">
                      {inspectingKocDetail.scoreBreakdown.legalReadinessScore} / 6đ
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Điểm thưởng / phạt đặc biệt */}
            {inspectingKocDetail.scoreBreakdown.bonusPenaltyDetails.length > 0 && (
              <div className="p-3 rounded-lg bg-surface border border-line space-y-1">
                <span className="font-semibold text-ink block text-2xs">
                  Điểm cộng / trừ đặc biệt:
                </span>
                <div className="flex flex-wrap gap-2">
                  {inspectingKocDetail.scoreBreakdown.bonusPenaltyDetails.map((bp) => (
                    <span
                      key={bp.code}
                      className={`px-2 py-0.5 rounded text-2xs font-medium ${
                        bp.delta > 0
                          ? 'bg-positive-soft text-positive'
                          : 'bg-critical-soft text-critical'
                      }`}
                    >
                      {bp.code}: {bp.label} ({bp.delta > 0 ? `+${bp.delta}đ` : `${bp.delta}đ`})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách các deal lịch sử */}
            <div className="space-y-2">
              <span className="text-2xs font-semibold text-ink-2 block">
                Lịch sử chiến dịch đã tham gia ({inspectingKocDetail.history.allPastDeals.length}{' '}
                deal)
              </span>

              {inspectingKocDetail.history.allPastDeals.length === 0 ? (
                <div className="p-4 text-center bg-sunken rounded-lg border border-line text-2xs text-ink-3">
                  KOC chưa có lịch sử deal lưu trữ trong hệ thống.
                </div>
              ) : (
                <div className="divide-y divide-line border border-line rounded-lg overflow-hidden bg-surface max-h-60 overflow-y-auto">
                  {inspectingKocDetail.history.allPastDeals.map((deal) => (
                    <div key={deal.id} className="p-2.5 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{deal.brandName}</span>
                          <span className="text-ink-3">•</span>
                          <span className="text-ink-2">{deal.productName}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                            deal.brandApprovalStatus === 'ĐÃ_DUYỆT'
                              ? 'bg-positive-soft text-positive'
                              : deal.brandApprovalStatus === 'TỪ_CHỐI'
                                ? 'bg-critical-soft text-critical'
                                : 'bg-sunken text-ink-2'
                          }`}
                        >
                          {deal.brandApprovalStatus === 'ĐÃ_DUYỆT'
                            ? 'Brand đã duyệt'
                            : deal.brandApprovalStatus === 'TỪ_CHỐI'
                              ? 'Brand từ chối'
                              : 'Chờ duyệt'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-2xs text-ink-3">
                        <div>
                          Mã BO: <span className="font-mono text-ink-2">{deal.dealCode}</span>
                          {deal.bookingBatch && ` • ${deal.bookingBatch}`}
                        </div>
                        <div className="tabular-nums">
                          Chi phí:{' '}
                          <strong className="text-ink-2">
                            {formatVndShort(deal.totalValue || 0)}
                          </strong>
                          {' • '}
                          GMV:{' '}
                          <strong className="text-positive">
                            {formatVndShort(deal.affiliateGmv || deal.gmv30 || 0)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <KocChannelReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        target={reviewTarget}
        initialMode={reviewMode}
        currentUserName={currentUserName}
        currentUserRole="Chuyên viên Booking"
        reviews={channelReviews}
        onNotify={onNotify}
      />
    </>
  );
};
