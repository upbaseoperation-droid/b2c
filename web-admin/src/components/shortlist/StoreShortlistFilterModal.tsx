'use client';

import React, { useState, useMemo } from 'react';
import { Presence } from '../ui';
import {
  X,
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
} from 'lucide-react';
import {
  StorePortfolioItem,
  KocItem,
  KocListingItem,
  BookingDealItem,
  ListingBatchCycle,
} from '@/lib/types';
import { formatVndShort } from '@/lib/format';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS, INITIAL_DEALS } from '@/lib/mockData';

export interface KocCooperationHistory {
  // Lịch sử với chính Brand đang chọn
  brandDealsCount: number;
  brandApprovedDealsCount: number;
  brandRejectedDealsCount: number;
  brandLatestRejectReason?: string;
  brandPastGmv: number;
  brandPastCost: number;
  brandAvgRoi: number;
  brandPastDeals: BookingDealItem[];

  // Lịch sử tổng thể tại Upbase B2C
  totalUpbaseDeals: number;
  completedDealsCount: number;
  totalPastGmv: number;
  totalPastCost: number;
  systemAvgRoi: number;
  onTimeRate: number; // Tỷ lệ đúng hạn (%)
  reliabilityScore: number;
  isWinnerTop20: boolean;
  hasOverdueWarning: boolean;
  allPastDeals: BookingDealItem[];
}

interface StoreShortlistFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  initialStoreId?: string;
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
  const cat = store.category.toLowerCase();
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

function calculateKocHistory(
  koc: KocItem,
  brandName: string,
  deals: BookingDealItem[]
): KocCooperationHistory {
  const cleanHandle = koc.channelId.toLowerCase().replace('@', '');
  const kocDeals = deals.filter(
    (d) =>
      d.kocId === koc.id ||
      (d.kocChannelId && d.kocChannelId.toLowerCase().replace('@', '') === cleanHandle)
  );

  const cleanBrand = brandName.trim().toLowerCase();
  const brandDeals = kocDeals.filter(
    (d) => d.brandName && d.brandName.toLowerCase().includes(cleanBrand)
  );

  const brandApprovedDeals = brandDeals.filter(
    (d) =>
      d.brandApprovalStatus === 'ĐÃ_DUYỆT' ||
      d.status === 'FINAL_PAID' ||
      d.status === 'VIDEO_VERIFIED' ||
      d.status === 'SCRIPT_APPROVED'
  );

  const brandRejectedDeals = brandDeals.filter(
    (d) => d.brandApprovalStatus === 'TỪ_CHỐI' || d.status === 'CANCELLED'
  );

  const brandLatestRejectReason =
    brandRejectedDeals[0]?.brandRejectReason ||
    (brandRejectedDeals.length > 0 ? 'Lệch phong cách nhãn hàng' : undefined);

  const brandPastGmv = brandApprovedDeals.reduce(
    (sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0),
    0
  );
  const brandPastCost = brandApprovedDeals.reduce(
    (sum, d) => sum + (d.totalValue || 0),
    0
  );
  const brandAvgRoi = brandPastCost > 0 ? +(brandPastGmv / brandPastCost).toFixed(2) : 0;

  // Toàn hệ thống Upbase
  const totalUpbaseDeals = Math.max(koc.totalPastDeals || 0, kocDeals.length);
  const completedDealsCount = kocDeals.filter(
    (d) => d.status === 'FINAL_PAID' || d.status === 'VIDEO_VERIFIED'
  ).length;

  const totalPastGmv =
    (koc.totalPastGmv || 0) +
    kocDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0);
  const totalPastCost =
    (koc.totalPastCost || 0) +
    kocDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
  const systemAvgRoi =
    totalPastCost > 0
      ? +(totalPastGmv / totalPastCost).toFixed(2)
      : koc.historicalRoi || 0;

  const onTimeCount = kocDeals.filter((d) => d.slaStatus !== 'OVERDUE').length;
  const onTimeRate =
    kocDeals.length > 0 ? Math.round((onTimeCount / kocDeals.length) * 100) : 100;
  const hasOverdueWarning = kocDeals.some((d) => d.slaStatus === 'OVERDUE');

  return {
    brandDealsCount: brandDeals.length,
    brandApprovedDealsCount: brandApprovedDeals.length,
    brandRejectedDealsCount: brandRejectedDeals.length,
    brandLatestRejectReason,
    brandPastGmv,
    brandPastCost,
    brandAvgRoi,
    brandPastDeals: brandDeals,

    totalUpbaseDeals,
    completedDealsCount,
    totalPastGmv,
    totalPastCost,
    systemAvgRoi,
    onTimeRate,
    reliabilityScore: koc.reliabilityScore || 9.5,
    isWinnerTop20: Boolean(koc.isWinnerTop20),
    hasOverdueWarning,
    allPastDeals: kocDeals,
  };
}

function createListingId(kocId: string): string {
  return `listing-${Date.now()}-${kocId}`;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const StoreShortlistFilterModal: React.FC<StoreShortlistFilterModalProps> = ({
  isOpen,
  onClose,
  stores = INITIAL_STORE_PORTFOLIOS,
  kocs = INITIAL_KOCS,
  deals = INITIAL_DEALS,
  initialStoreId,
  onAddToListingBatch,
  onNotify,
}) => {
  const defaultStoreId = initialStoreId || (stores[0]?.id ?? '');
  const initialStoreObj = stores.find((s) => s.id === defaultStoreId) || stores[0];
  const initialDefaults = getDefaultStoreFilters(initialStoreObj);

  // Gian hàng được chọn
  const [selectedStoreId, setSelectedStoreId] = useState<string>(defaultStoreId);

  // Bộ tiêu chí lọc cơ bản
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['KL2', 'KL3', 'KL4', 'KL5']);
  const [selectedTepKenh, setSelectedTepKenh] = useState<string>(initialDefaults.tepKenh);
  const [minGmvThreshold, setMinGmvThreshold] = useState<number>(0);
  const [preferFormat, setPreferFormat] = useState<'ALL' | 'VIDEO' | 'LIVE'>('ALL');
  const [minFemaleRatio, setMinFemaleRatio] = useState<number>(initialDefaults.minFemaleRatio);
  const [excludeAssignedKoc, setExcludeAssignedKoc] = useState<boolean>(true);
  const [requireLegalDoc, setRequireLegalDoc] = useState<boolean>(false);
  const [searchKocText, setSearchKocText] = useState<string>('');

  // Bộ tiêu chí lịch sử hợp tác
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'BRAND_EXPERIENCED' | 'UPBASE_EXPERIENCED' | 'NEW_KOC'>('ALL');
  const [excludeBrandRejected, setExcludeBrandRejected] = useState<boolean>(true);
  const [requireTopWinner, setRequireTopWinner] = useState<boolean>(false);
  const [minOnTimeRate, setMinOnTimeRate] = useState<number>(0);

  // Chu kỳ đợt Listing để bàn giao
  const [targetBatchCycle, setTargetBatchCycle] = useState<ListingBatchCycle>('BATCH_10');

  // KOC được chọn trong Shortlist
  const [selectedKocIds, setSelectedKocIds] = useState<string[]>([]);

  // Modal xem chi tiết lịch sử hợp tác của KOC
  const [inspectingHistoryKoc, setInspectingHistoryKoc] = useState<{
    koc: KocItem;
    history: KocCooperationHistory;
  } | null>(null);

  // Đồng bộ khi initialStoreId thay đổi từ bên ngoài
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

  // Xếp hạng KOC kết hợp tiêu chí cơ bản & Lịch sử hợp tác
  const rankedKocs = useMemo(() => {
    if (!selectedStore) return [];

    const storeCat = (selectedStore.category || '').toLowerCase();
    const brandName = selectedStore.brandName;

    return kocs
      .map((k) => {
        let score = 45; // Điểm cơ sở

        // Tính lịch sử hợp tác
        const history = calculateKocHistory(k, brandName, deals);

        // --- BỘ LỌC LỊCH SỬ HỢP TÁC ---
        if (historyFilter === 'BRAND_EXPERIENCED' && history.brandApprovedDealsCount === 0) {
          return null;
        }
        if (historyFilter === 'UPBASE_EXPERIENCED' && history.totalUpbaseDeals === 0) {
          return null;
        }
        if (historyFilter === 'NEW_KOC' && history.totalUpbaseDeals > 0) {
          return null;
        }

        if (excludeBrandRejected && history.brandRejectedDealsCount > 0) {
          return null;
        }

        if (requireTopWinner && !history.isWinnerTop20) {
          return null;
        }

        if (minOnTimeRate > 0 && history.totalUpbaseDeals > 0 && history.onTimeRate < minOnTimeRate) {
          return null;
        }

        // --- CỘNG / TRỪ ĐIỂM THEO LỊCH SỬ ---
        if (history.brandApprovedDealsCount > 0) {
          score += 25;
        } else if (history.brandRejectedDealsCount > 0) {
          score -= 30;
        }

        if (history.isWinnerTop20) {
          score += 15;
        }

        if (history.totalUpbaseDeals >= 3 && history.onTimeRate >= 95) {
          score += 10;
        }

        if (history.hasOverdueWarning) {
          score -= 10;
        }

        // --- CÁC TIÊU CHÍ CƠ BẢN ---
        if (selectedGrades.length > 0) {
          if (selectedGrades.includes(k.salaryGrade)) {
            score += 15;
          } else {
            return null;
          }
        }

        if (selectedTepKenh !== 'ALL') {
          if (k.tepKenh === selectedTepKenh) {
            score += 20;
          } else {
            score -= 10;
          }
        } else {
          const kocCat = (k.kocCategory || '').toLowerCase();
          if (
            (storeCat.includes('mỹ phẩm') || storeCat.includes('dược')) &&
            (kocCat.includes('personal') || kocCat.includes('care') || k.tepKenh?.includes('Review Nữ') || k.tepKenh?.includes('Beauty'))
          ) {
            score += 10;
          } else if (storeCat.includes('mẹ') && (kocCat.includes('mom') || k.tepKenh?.includes('Mẹ'))) {
            score += 10;
          }
        }

        const revenue = k.recentRevenue || 0;
        if (minGmvThreshold > 0 && revenue < minGmvThreshold) {
          return null;
        }
        if (revenue >= 100000000) {
          score += 10;
        }

        const gpm = k.gpm || 0;
        if (gpm >= 8000000) {
          score += 5;
        }

        if (preferFormat === 'VIDEO' && (k.gmvShareVideo || 0) >= 60) {
          score += 5;
        } else if (preferFormat === 'LIVE' && (k.gmvShareLive || 0) >= 30) {
          score += 5;
        }

        if (minFemaleRatio > 0) {
          const female = k.femaleRatio || 0;
          if (female < minFemaleRatio) {
            return null;
          }
        }

        const isConflictPic = Boolean(k.bookingPic && k.bookingPic !== selectedStore.b2cOwnerName);
        if (excludeAssignedKoc && isConflictPic) {
          return null;
        }

        const hasLegalDoc = Boolean(k.isOcrVerified || (k.cccd && k.cccd.length >= 9));
        if (requireLegalDoc && !hasLegalDoc) {
          return null;
        }

        if ((k.reliabilityScore || 10) < 8.0) {
          return null;
        }

        if (searchKocText.trim()) {
          const q = searchKocText.trim().toLowerCase();
          const matchName = k.stageName.toLowerCase().includes(q);
          const matchHandle = k.channelId.toLowerCase().includes(q);
          if (!matchName && !matchHandle) return null;
        }

        const matchPercent = Math.min(100, Math.max(15, score));

        return {
          koc: k,
          matchPercent,
          hasLegalDoc,
          history,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }, [
    kocs,
    deals,
    selectedStore,
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
  ]);

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

  // Dự toán chi phí
  const selectedKocsSummary = useMemo(() => {
    const list = rankedKocs.filter((r) => selectedKocIds.includes(r.koc.id)).map((r) => r.koc);
    const totalCost = list.reduce((sum, k) => sum + (k.rateCardVideo || 0), 0);
    const estimatedGmv = list.reduce(
      (sum, k) => sum + (k.recentRevenue ? k.recentRevenue * 0.8 : (k.rateCardVideo || 0) * 3),
      0
    );

    const storeBudget = selectedStore?.monthlyBudget || 0;
    const isOverBudget = storeBudget > 0 && totalCost > storeBudget;

    return {
      count: list.length,
      totalCost,
      estimatedGmv,
      storeBudget,
      isOverBudget,
      list,
    };
  }, [rankedKocs, selectedKocIds, selectedStore]);

  // Hành động: Đưa vào đợt Listing Batch
  const handleTransferToListingBatch = () => {
    if (!selectedStore) return;
    if (selectedKocIds.length === 0) {
      if (onNotify) onNotify('Vui lòng chọn ít nhất 1 KOC để đưa vào đợt duyệt.', 'warning');
      return;
    }

    const selectedList = selectedKocsSummary.list;

    const newListings: Partial<KocListingItem>[] = selectedList.map((k) => {
      let tier: 'CELEB' | 'MEGA' | 'MACRO' | 'MICRO' | 'NANO' = 'MICRO';
      if (k.tier === 'TIER_1_CELEB') tier = 'CELEB';
      else if (k.tier === 'TIER_2_MACRO') tier = 'MACRO';
      else if (k.tier === 'TIER_3_MICRO') tier = 'MICRO';
      else tier = 'NANO';

      return {
        id: createListingId(k.id),
        batchId: `BATCH-${targetBatchCycle}-${selectedStore.id}`,
        batchCycle: targetBatchCycle,
        monthKey: '2026/10',
        storeId: selectedStore.id,
        storeName: selectedStore.storeName,
        brandName: selectedStore.brandName,
        kocId: k.id,
        kocName: k.stageName,
        kocHandle: k.channelId.replace('@', ''),
        channel: 'TikTok Shop',
        followersCount: k.followers,
        tier,
        niche: k.niche || k.tepKenh,
        videoFormat: 'Review & Hướng dẫn sử dụng',
        pillarName: `Chiến dịch thúc đẩy ${selectedStore.category}`,
        proposedFee: k.rateCardVideo || 3000000,
        brandApprovalStatus: 'BRAND_PENDING',
        kocNegotiationStatus: 'NOT_CONTACTED',
        expectedAirDate: '2026-10-25',
      };
    });

    if (onAddToListingBatch) {
      onAddToListingBatch(newListings, selectedStore, targetBatchCycle);
    }

    if (onNotify) {
      onNotify(
        `Đã tạo đề xuất ${newListings.length} KOC vào ${targetBatchCycle} cho gian hàng ${selectedStore.brandName}.`,
        'success'
      );
    }

    onClose();
  };

  // Xuất CSV kèm lịch sử hợp tác
  const handleExportCsv = () => {
    if (!selectedStore || rankedKocs.length === 0) return;

    const exportItems =
      selectedKocIds.length > 0
        ? rankedKocs.filter((r) => selectedKocIds.includes(r.koc.id))
        : rankedKocs;

    const headers = [
      'STT',
      'Gian hàng',
      'KOC Stage Name',
      'ID Kênh TikTok',
      'Khung lương',
      'Phân nhóm',
      'Tệp kênh',
      'Followers',
      'Giá dự kiến (VNĐ)',
      'GMV 30d sàn (VNĐ)',
      'Deal với Brand này',
      'GMV đã mang lại cho Brand',
      'ROI với Brand',
      'Tổng job tại Upbase',
      'Tỷ lệ đúng hạn (%)',
      'Winner Top 20',
      'Độ phù hợp (%)',
    ];

    const rows = exportItems.map((item, idx) => [
      idx + 1,
      selectedStore.brandName,
      `"${item.koc.stageName}"`,
      `"${item.koc.channelId}"`,
      item.koc.salaryGrade,
      item.koc.segment,
      `"${item.koc.tepKenh}"`,
      item.koc.followers,
      item.koc.rateCardVideo || 0,
      item.koc.recentRevenue || 0,
      item.history.brandApprovedDealsCount,
      item.history.brandPastGmv,
      item.history.brandAvgRoi,
      item.history.totalUpbaseDeals,
      `${item.history.onTimeRate}%`,
      item.history.isWinnerTop20 ? 'Có' : 'Không',
      `${item.matchPercent}%`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Shortlist_KOC_${selectedStore.brandName.replace(/\s+/g, '_')}_${getTodayIsoDate()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onNotify) {
      onNotify(`Đã xuất danh sách ${exportItems.length} KOC ra tệp CSV.`, 'success');
    }
  };

  if (!isOpen) return <Presence show={false} />;

  return (
    <Presence show>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 overflow-y-auto animate-in fade-in duration-(--motion-base)">
      <div data-motion-panel className="relative w-full max-w-6xl bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface text-ink">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info-soft text-primary flex items-center justify-center border border-info-line">
              <Filter className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink">
                  Chọn nhanh KOC cho gian hàng
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-info-soft text-info border border-info-line">
                  Đối soát tiêu chí &amp; Đánh giá lịch sử hợp tác
                </span>
              </div>
              <p className="text-xs text-muted">
                Sàng lọc tệp KOC theo ngành hàng, năng lực ra đơn và kinh nghiệm hợp tác thực tế
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Khối chọn gian hàng & thông tin mục tiêu */}
        <div className="p-5 border-b border-line bg-sunken flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-[280px]">
            <label className="text-xs font-semibold text-ink-2 whitespace-nowrap">
              Gian hàng mục tiêu:
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => handleSelectStore(e.target.value)}
              className="w-full bg-surface border border-line-strong rounded-xl px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.brandName} - {s.storeName} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {selectedStore && (
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <div className="bg-surface px-3 py-1.5 rounded-xl border border-line">
                <span className="text-2xs text-muted block">Ngân sách tháng</span>
                <span className="font-semibold text-primary tabular-nums">
                  {formatVndShort(selectedStore.monthlyBudget)}
                </span>
              </div>
              <div className="bg-surface px-3 py-1.5 rounded-xl border border-line">
                <span className="text-2xs text-muted block">Mục tiêu GMV</span>
                <span className="font-semibold text-success tabular-nums">
                  {formatVndShort(selectedStore.monthlyTargetGmv)}
                </span>
              </div>
              <div className="bg-surface px-3 py-1.5 rounded-xl border border-line">
                <span className="text-2xs text-muted block">Ngành hàng</span>
                <span className="font-semibold text-ink">{selectedStore.category}</span>
              </div>
              <div className="bg-surface px-3 py-1.5 rounded-xl border border-line">
                <span className="text-2xs text-muted block">Phụ trách B2C</span>
                <span className="font-semibold text-ink">{selectedStore.b2cOwnerName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Nội dung chính: 2 Cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Cột trái: Bộ tiêu chuẩn lọc */}
          <div className="lg:col-span-4 p-5 border-r border-line overflow-y-auto space-y-4 bg-surface text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-primary" />
                Tiêu chuẩn sàng lọc
              </span>
              <span className="text-2xs text-muted">
                Tìm thấy: <strong>{rankedKocs.length}</strong> KOC phù hợp
              </span>
            </div>

            {/* Tìm kiếm nhanh */}
            <div>
              <label className="text-2xs font-semibold text-ink-2 block mb-1">
                Tìm tên hoặc ID kênh:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKocText}
                  onChange={(e) => setSearchKocText(e.target.value)}
                  placeholder="VD: megauriviu, chanhbeauty..."
                  className="w-full pl-8 pr-3 py-1.5 bg-sunken border border-line rounded-lg text-xs font-medium text-ink focus:bg-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Bộ lọc lịch sử hợp tác với KOC */}
            <div className="p-3 bg-warn-soft/50 rounded-xl border border-warn-line space-y-2.5">
              <div className="flex items-center gap-1.5 text-warn font-semibold text-xs">
                <History className="w-4 h-4 text-warn shrink-0" />
                <span>Đánh giá lịch sử hợp tác</span>
              </div>

              <div>
                <label className="text-2xs font-semibold text-ink-2 block mb-1">
                  Kinh nghiệm hợp tác:
                </label>
                <select
                  value={historyFilter}
                  onChange={(e) =>
                    setHistoryFilter(
                      e.target.value as 'ALL' | 'BRAND_EXPERIENCED' | 'UPBASE_EXPERIENCED' | 'NEW_KOC'
                    )
                  }
                  className="w-full bg-surface border border-warn-line rounded-lg p-2 text-xs font-semibold text-ink focus:outline-none focus:border-warn"
                >
                  <option value="ALL">Tất cả KOC (Có hoặc chưa có lịch sử)</option>
                  <option value="BRAND_EXPERIENCED">
                    Đã từng làm việc với {selectedStore?.brandName} (Ưu tiên đối tác quen)
                  </option>
                  <option value="UPBASE_EXPERIENCED">
                    Đã từng có deal tại Upbase (&gt;= 1 job thành công)
                  </option>
                  <option value="NEW_KOC">
                    KOC mới tinh (Chưa từng book, mở rộng tệp)
                  </option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-warn-line">
                <label className="flex items-start gap-2 text-2xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeBrandRejected}
                    onChange={(e) => setExcludeBrandRejected(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span>
                    <strong>Loại trừ KOC từng bị {selectedStore?.brandName} từ chối</strong> (tránh gửi lại KOC khách hàng đã chê)
                  </span>
                </label>

                <label className="flex items-start gap-2 text-2xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireTopWinner}
                    onChange={(e) => setRequireTopWinner(e.target.checked)}
                    className="rounded text-primary mt-0.5"
                  />
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warn" />
                    <strong>Chỉ chọn KOC Chiến Thắng (Winner Top 20)</strong>
                  </span>
                </label>

                <div>
                  <label className="text-2xs text-ink-2 flex items-center justify-between mb-1">
                    <span>Tỷ lệ trả bài đúng hạn SLA:</span>
                    <span className="font-semibold text-warn tabular-nums">
                      {minOnTimeRate === 0 ? 'Không giới hạn' : `≥ ${minOnTimeRate}%`}
                    </span>
                  </label>
                  <select
                    value={minOnTimeRate}
                    onChange={(e) => setMinOnTimeRate(Number(e.target.value))}
                    className="w-full bg-surface border border-line rounded-lg p-1.5 text-2xs font-medium text-ink"
                  >
                    <option value={0}>Không yêu cầu tỷ lệ SLA</option>
                    <option value={80}>≥ 80% đúng hạn deadline</option>
                    <option value={90}>≥ 90% đúng hạn deadline (Tiêu chuẩn)</option>
                    <option value={100}>100% chuẩn hạn (Tuyệt đối không trễ)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Khung lương (Salary Grade) */}
            <div className="space-y-1.5">
              <label className="text-2xs font-semibold text-ink-2 block">
                Khung lương (KL) nhắm tới:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'TAP_UP_AFFILIATE', label: 'TAP (0đ)' },
                  { id: 'KL1', label: 'KL1 (0-500k)' },
                  { id: 'KL2', label: 'KL2 (500k-1.5M)' },
                  { id: 'KL3', label: 'KL3 (1.5M-3M)' },
                  { id: 'KL4', label: 'KL4 (3M-5M)' },
                  { id: 'KL5', label: 'KL5 (5M-10M)' },
                  { id: 'KL6', label: 'KL6 (10M-30M)' },
                  { id: 'KL7', label: 'KL7 (>30M)' },
                ].map((g) => (
                  <label
                    key={g.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-2xs cursor-pointer transition ${
                      selectedGrades.includes(g.id)
                        ? 'bg-info-soft border-info-line text-info font-semibold'
                        : 'bg-sunken border-line text-ink-2 hover:bg-hover'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(g.id)}
                      onChange={() => toggleGrade(g.id)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span>{g.label}</span>
                  </label>
                ))}
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
                className="w-full bg-sunken border border-line rounded-lg p-2 text-xs font-medium text-ink focus:bg-surface focus:outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả tệp kênh</option>
                <option value="Review Nữ">Review Nữ</option>
                <option value="Chăm sóc da (Skincare)">Chăm sóc da (Skincare)</option>
                <option value="Mẹ & Bé (bầu)">Mẹ &amp; Bé (bầu)</option>
                <option value="Beauty">Beauty / Trang điểm</option>
                <option value="ELHA">Gia dụng thông minh (ELHA)</option>
                <option value="Đời sống">Đời sống / Phong cách</option>
                <option value="F&B">Ẩm thực (F&amp;B)</option>
              </select>
            </div>

            {/* Tiêu chí sàn: Kalodata GMV & GPM */}
            <div className="pt-2 border-t border-line space-y-2.5">
              <span className="text-2xs font-semibold text-ink-2 block">
                Chỉ số bán hàng từ sàn (Kalodata)
              </span>

              <div>
                <label className="text-2xs text-ink-2 flex items-center justify-between mb-1">
                  <span>Doanh số 30 ngày tối thiểu:</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {minGmvThreshold === 0 ? 'Không giới hạn' : formatVndShort(minGmvThreshold)}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="300000000"
                  step="20000000"
                  value={minGmvThreshold}
                  onChange={(e) => setMinGmvThreshold(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="text-2xs text-ink-2 flex items-center justify-between mb-1">
                  <span>Tỉ lệ người xem Nữ tối thiểu:</span>
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

              <div>
                <label className="text-2xs font-semibold text-ink-2 block mb-1">
                  Ưu tiên định dạng:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'VIDEO', label: 'Video ngắn' },
                    { id: 'LIVE', label: 'Live' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPreferFormat(f.id as 'ALL' | 'VIDEO' | 'LIVE')}
                      className={`p-1.5 rounded-lg border text-2xs font-semibold transition ${
                        preferFormat === f.id
                          ? 'bg-primary text-primary-fg border-primary'
                          : 'bg-sunken border-line text-ink-2 hover:bg-hover'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quy tắc an toàn */}
            <div className="pt-2 border-t border-line space-y-2">
              <span className="text-2xs font-semibold text-ink-2 block">
                Quy tắc an toàn &amp; Pháp lý
              </span>

              <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAssignedKoc}
                  onChange={(e) => setExcludeAssignedKoc(e.target.checked)}
                  className="rounded text-primary mt-0.5"
                />
                <span>
                  <strong>Loại trừ KOC đang có người phụ trách khác</strong>
                </span>
              </label>

              <label className="flex items-start gap-2 text-2xs text-ink-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireLegalDoc}
                  onChange={(e) => setRequireLegalDoc(e.target.checked)}
                  className="rounded text-primary mt-0.5"
                />
                <span>
                  <strong>Chỉ chọn KOC đã có CCCD/ĐKKD</strong>
                </span>
              </label>
            </div>
          </div>

          {/* Cột phải: Bảng KOC đề xuất */}
          <div className="lg:col-span-8 flex flex-col bg-sunken overflow-hidden">
            {/* Thanh công cụ bảng */}
            <div className="px-5 py-3 border-b border-line bg-surface flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-sunken hover:bg-hover text-ink-2 rounded-lg text-2xs font-semibold transition"
                >
                  {selectedKocIds.length === rankedKocs.length && rankedKocs.length > 0
                    ? 'Bỏ chọn tất cả'
                    : `Chọn tất cả (${rankedKocs.length})`}
                </button>
                <span className="text-2xs text-muted">
                  Đã chọn: <strong className="text-primary">{selectedKocIds.length}</strong> KOC
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 bg-sunken hover:bg-hover text-ink-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất bảng đề xuất</span>
                </button>
              </div>
            </div>

            {/* Danh sách thẻ KOC */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {rankedKocs.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-muted mx-auto" />
                  <div className="text-xs font-semibold text-ink-2">
                    Không tìm thấy KOC phù hợp với các tiêu chí đã chọn
                  </div>
                  <div className="text-2xs text-muted max-w-sm mx-auto">
                    Vui lòng mở rộng khung lương, giảm bớt điều kiện lịch sử hoặc doanh số sàn.
                  </div>
                </div>
              ) : (
                rankedKocs.map(({ koc, matchPercent, hasLegalDoc, history }) => {
                  const isSelected = selectedKocIds.includes(koc.id);

                  return (
                    <div
                      key={koc.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col gap-3 ${
                        isSelected
                          ? 'bg-info-soft/40 border-info-line ring-1 ring-primary'
                          : 'bg-surface border-line hover:border-line-strong'
                      }`}
                    >
                      {/* Hàng 1: Profile KOC & Chỉ số bán hàng & Điểm phù hợp */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        {/* Thông tin kênh */}
                        <div
                          onClick={() => toggleSelectKoc(koc.id)}
                          className="flex items-center gap-3 min-w-[260px] cursor-pointer"
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
                            className="w-10 h-10 rounded-full object-cover border border-line shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink text-xs">{koc.stageName}</span>
                              <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-info-soft text-info">
                                {koc.salaryGrade}
                              </span>
                              {hasLegalDoc && (
                                <span title="Đã có CCCD xác thực">
                                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                                </span>
                              )}
                              {history.isWinnerTop20 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-semibold bg-warn-soft text-warn border border-warn-line">
                                  <Star className="w-2.5 h-2.5 text-warn" />
                                  Top Winner
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-muted font-medium">
                              @{koc.channelId.replace('@', '')} • {koc.tepKenh}
                            </div>
                          </div>
                        </div>

                        {/* Chỉ số sàn Kalodata */}
                        <div className="grid grid-cols-3 gap-3 text-center min-w-[210px] bg-sunken p-2 rounded-lg border border-line">
                          <div>
                            <span className="text-2xs text-muted block">Follower</span>
                            <span className="text-2xs font-semibold text-ink tabular-nums">
                              {formatVndShort(koc.followers).replace('đ', '')}
                            </span>
                          </div>
                          <div>
                            <span className="text-2xs text-muted block">GMV sàn 30d</span>
                            <span className="text-2xs font-semibold text-primary tabular-nums">
                              {koc.recentRevenue ? formatVndShort(koc.recentRevenue) : 'Chưa có'}
                            </span>
                          </div>
                          <div>
                            <span className="text-2xs text-muted block">GPM/1K view</span>
                            <span className="text-2xs font-semibold text-success tabular-nums">
                              {koc.gpm ? formatVndShort(koc.gpm) : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Giá đề xuất & Điểm phù hợp */}
                        <div className="flex items-center gap-3 min-w-[150px] justify-between md:justify-end w-full md:w-auto">
                          <div className="text-right">
                            <span className="text-2xs text-muted block">Giá dự kiến (Net)</span>
                            <span className="text-xs font-semibold text-ink tabular-nums">
                              {formatVndShort(koc.rateCardVideo || 0)}
                            </span>
                          </div>

                          <div className="text-center shrink-0">
                            <div
                              className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-semibold text-xs border tabular-nums ${
                                matchPercent >= 80
                                  ? 'bg-success-soft text-success border-success-line'
                                  : matchPercent >= 60
                                    ? 'bg-info-soft text-info border-info-line'
                                    : 'bg-sunken text-ink-2 border-line'
                              }`}
                            >
                              <span>{matchPercent}%</span>
                              <span className="text-2xs font-normal">Hợp</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hàng 2: ĐÁNH GIÁ LỊCH SỬ HỢP TÁC VỚI KOC */}
                      <div className="pt-2 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-2xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          {history.brandApprovedDealsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-semibold bg-success-soft text-success border border-success-line inline-flex items-center gap-1">
                              <Award className="w-3 h-3 text-success" />
                              <span>
                                Đã làm <strong>{history.brandApprovedDealsCount} deal</strong> cho{' '}
                                {selectedStore?.brandName} (GMV {formatVndShort(history.brandPastGmv)} • ROI {history.brandAvgRoi || 2.4})
                              </span>
                            </span>
                          ) : history.brandRejectedDealsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-semibold bg-danger-soft text-danger border border-danger-line inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-danger" />
                              <span>
                                Từng bị {selectedStore?.brandName} từ chối ({history.brandLatestRejectReason})
                              </span>
                            </span>
                          ) : history.totalUpbaseDeals > 0 ? (
                            <span className="px-2 py-0.5 rounded-md font-medium bg-info-soft text-info border border-info-line inline-flex items-center gap-1">
                              <History className="w-3 h-3 text-info" />
                              <span>
                                Đối tác Upbase (<strong>{history.totalUpbaseDeals} deal</strong> • Đúng hạn {history.onTimeRate}%)
                              </span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-medium bg-sunken text-ink-2 border border-line inline-flex items-center gap-1">
                              KOC mới (Chưa có lịch sử tại Upbase)
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-md font-medium bg-sunken text-ink-2 border border-line">
                            Uy tín: <strong>{history.reliabilityScore.toFixed(1)}/10</strong>
                          </span>
                        </div>

                        {history.allPastDeals.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingHistoryKoc({ koc, history });
                            }}
                            className="text-2xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem chi tiết {history.allPastDeals.length} job đã làm</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer: Thanh tóm tắt dự toán & Hành động */}
        <div className="px-6 py-4 border-t border-line bg-surface flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="text-2xs text-muted block">Đã chọn vào Shortlist:</span>
              <span className="font-semibold text-primary text-sm tabular-nums">
                {selectedKocsSummary.count} KOC
              </span>
            </div>

            <div className="border-l border-line pl-4">
              <span className="text-2xs text-muted block">Tổng chi phí dự kiến:</span>
              <span
                className={`font-semibold text-sm tabular-nums ${
                  selectedKocsSummary.isOverBudget ? 'text-danger' : 'text-ink'
                }`}
              >
                {formatVndShort(selectedKocsSummary.totalCost)}
              </span>
              {selectedKocsSummary.isOverBudget && (
                <span className="text-2xs text-danger font-semibold block">
                  Vượt ngân sách tháng ({formatVndShort(selectedKocsSummary.storeBudget)})
                </span>
              )}
            </div>

            <div className="border-l border-line pl-4">
              <span className="text-2xs text-muted block">Doanh số ước tính (GMV):</span>
              <span className="font-semibold text-success text-sm tabular-nums">
                ~{formatVndShort(selectedKocsSummary.estimatedGmv)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:text-ink bg-sunken hover:bg-hover transition"
            >
              Đóng
            </button>

            <div className="flex items-center gap-1.5 bg-sunken px-2.5 py-1 rounded-xl border border-line">
              <span className="text-2xs font-semibold text-ink-2">Đợt:</span>
              <select
                value={targetBatchCycle}
                onChange={(e) => setTargetBatchCycle(e.target.value as ListingBatchCycle)}
                className="bg-transparent text-xs font-semibold text-ink focus:outline-none"
              >
                <option value="BATCH_10">Đợt 10 hàng tháng</option>
                <option value="BATCH_20">Đợt 20 hàng tháng</option>
                <option value="BATCH_30">Đợt 30 hàng tháng</option>
                <option value="BATCH_ADHOC">Đợt phát sinh ngoài kế hoạch</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleTransferToListingBatch}
              disabled={selectedKocsSummary.count === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-fg bg-primary hover:bg-primary-hover disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đưa vào đợt duyệt KOC ({selectedKocsSummary.count})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Popover / Modal nhỏ: Xem toàn bộ các Deal lịch sử của 1 KOC */}
      <Presence show={!!inspectingHistoryKoc}>
      {inspectingHistoryKoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-ink/50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-2xl shadow-2xl border border-line w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-5 py-3.5 border-b border-line bg-sunken flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-ink">
                  Lịch sử hợp tác của KOC: {inspectingHistoryKoc.koc.stageName} (@
                  {inspectingHistoryKoc.koc.channelId.replace('@', '')})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingHistoryKoc(null)}
                className="text-muted hover:text-ink font-semibold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Thống kê nhanh */}
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 bg-sunken rounded-xl border border-line">
                  <span className="text-2xs text-muted block">Tổng job đã làm</span>
                  <span className="text-sm font-semibold text-ink mt-0.5 block tabular-nums">
                    {inspectingHistoryKoc.history.totalUpbaseDeals}
                  </span>
                </div>
                <div className="p-2.5 bg-sunken rounded-xl border border-line">
                  <span className="text-2xs text-muted block">GMV mang lại</span>
                  <span className="text-sm font-semibold text-success mt-0.5 block tabular-nums">
                    {formatVndShort(inspectingHistoryKoc.history.totalPastGmv)}
                  </span>
                </div>
                <div className="p-2.5 bg-sunken rounded-xl border border-line">
                  <span className="text-2xs text-muted block">ROI trung bình</span>
                  <span className="text-sm font-semibold text-primary mt-0.5 block tabular-nums">
                    {inspectingHistoryKoc.history.systemAvgRoi || 2.5}
                  </span>
                </div>
                <div className="p-2.5 bg-sunken rounded-xl border border-line">
                  <span className="text-2xs text-muted block">Đúng hạn SLA</span>
                  <span className="text-sm font-semibold text-ink mt-0.5 block tabular-nums">
                    {inspectingHistoryKoc.history.onTimeRate}%
                  </span>
                </div>
              </div>

              {/* Danh sách các deal */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold text-ink-2 block">
                  Danh sách chiến dịch đã tham gia ({inspectingHistoryKoc.history.allPastDeals.length})
                </span>

                <div className="divide-y divide-line border border-line rounded-xl overflow-hidden bg-surface">
                  {inspectingHistoryKoc.history.allPastDeals.map((deal) => (
                    <div key={deal.id} className="p-3 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{deal.brandName}</span>
                          <span className="text-muted">•</span>
                          <span className="text-ink-2 font-medium">{deal.productName}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                            deal.brandApprovalStatus === 'ĐÃ_DUYỆT'
                              ? 'bg-success-soft text-success'
                              : deal.brandApprovalStatus === 'TỪ_CHỐI'
                                ? 'bg-danger-soft text-danger'
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

                      <div className="flex items-center justify-between text-2xs text-muted mt-1">
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
                          <strong className="text-success">
                            {formatVndShort(deal.affiliateGmv || deal.gmv30 || 0)}
                          </strong>
                        </div>
                      </div>

                      {deal.brandRejectReason && (
                        <div className="text-2xs text-danger bg-danger-soft px-2 py-1 rounded mt-1">
                          Lý do từ chối: {deal.brandRejectReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-line bg-sunken flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingHistoryKoc(null)}
                className="px-4 py-1.5 bg-surface hover:bg-hover text-ink-2 border border-line rounded-lg text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>
    </div>
    </Presence>
  );
};

