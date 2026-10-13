'use client';

import React, { useState, useMemo } from 'react';
import {
  KocListingItem,
  ListingBatchCycle,
  BrandListingStatus,
  KocNegotiationStatus,
  ListingItemStatus,
  AirVideoStage,
  UserRole
} from '@/lib/types';
import { ConfirmDialog, PageActions, Button, Presence } from '../ui';
import { formatVnd } from '../../lib/format';
import { StoreShortlistFilterModal } from '../shortlist/StoreShortlistFilterModal';
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
  RotateCcw
} from 'lucide-react';

interface KocListingBatchHubViewProps {
  listings: KocListingItem[];
  onUpdateListings: (updated: KocListingItem[]) => void;
  onGenerateDeal?: (item: KocListingItem) => void;
  currentRole?: UserRole;
  currentUserName?: string;
}

export function KocListingBatchHubView({
  listings,
  onUpdateListings,
  onGenerateDeal,
  currentUserName = 'Quản trị viên'
}: KocListingBatchHubViewProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'LISTING_APPROVAL' | 'AIR_TRACKER'>('LISTING_APPROVAL');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [selectedCycle, setSelectedCycle] = useState<ListingBatchCycle | 'ALL'>('ALL');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedBrandStatus, setSelectedBrandStatus] = useState<string>('ALL');
  const [selectedKocStatus, setSelectedKocStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // New KOC form state
  const [newKocForm, setNewKocForm] = useState<{
    storeName: string;
    brandName: string;
    batchCycle: ListingBatchCycle;
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
    storeName: 'Kutieskin Official Store',
    brandName: 'Kutieskin',
    batchCycle: 'BATCH_10',
    kocName: '',
    kocHandle: '',
    channel: 'TikTok Shop',
    followersCount: 150000,
    tier: 'MICRO',
    pillarName: 'Chăm sóc da bé mẩn ngứa',
    videoFormat: 'Review & Hướng dẫn sử dụng',
    proposedFee: 5000000,
    expectedAirDate: '2026-10-15'
  });

  // Unique list of stores for filter
  const storeOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((item) => set.add(item.storeName));
    return Array.from(set);
  }, [listings]);

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
      if (selectedBrandStatus !== 'ALL' && item.brandApprovalStatus !== selectedBrandStatus) return false;
      if (selectedKocStatus !== 'ALL' && item.kocNegotiationStatus !== selectedKocStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.kocName.toLowerCase().includes(q);
        const matchHandle = item.kocHandle.toLowerCase().includes(q);
        const matchStore = item.storeName.toLowerCase().includes(q);
        const matchBrand = item.brandName.toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchStore && !matchBrand) return false;
      }
      return true;
    });
  }, [listings, filterOnlyDuplicates, duplicateHandleMap, selectedMonth, selectedCycle, selectedStore, selectedBrandStatus, selectedKocStatus, searchQuery]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = filteredListings.length;
    const draft = filteredListings.filter((i) => i.overallStatus === 'DRAFT').length;
    const submitted = filteredListings.filter((i) => i.overallStatus === 'SUBMITTED').length;
    const brandApproved = filteredListings.filter((i) => i.brandApprovalStatus === 'BRAND_APPROVED').length;
    const termsAgreed = filteredListings.filter((i) => i.kocNegotiationStatus === 'TERMS_AGREED').length;
    const finalApproved = filteredListings.filter((i) => i.overallStatus === 'FINAL_APPROVED').length;
    const dropped = filteredListings.filter((i) => i.overallStatus === 'DROPPED').length;
    const totalBudget = filteredListings.reduce((sum, i) => sum + (i.finalFee || i.proposedFee || 0), 0);

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

  // Submit Drafts to Brand in bulk
  const handleSubmitToBrand = () => {
    if (selectedIds.length === 0) return;
    const updated = listings.map((item) => {
      if (selectedIds.includes(item.id) && item.overallStatus === 'DRAFT') {
        return {
          ...item,
          overallStatus: 'SUBMITTED' as ListingItemStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    onUpdateListings(updated);
    setSelectedIds([]);
  };

  // Brand Approval Action
  const handleBrandDecision = (id: string, decision: 'APPROVE' | 'REJECT', feedback?: string) => {
    const updated = listings.map((item) => {
      if (item.id === id) {
        const nextBrandStatus: BrandListingStatus = decision === 'APPROVE' ? 'BRAND_APPROVED' : 'BRAND_REJECTED';
        let nextOverall = item.overallStatus;
        let dropReason = item.dropReason;

        if (decision === 'REJECT') {
          nextOverall = 'DROPPED';
          dropReason = feedback || 'Nhãn hàng từ chối hồ sơ KOC đợt này. Đã hoàn 1 suất kế hoạch.';
        } else if (decision === 'APPROVE' && item.kocNegotiationStatus === 'TERMS_AGREED') {
          nextOverall = 'FINAL_APPROVED';
        }

        return {
          ...item,
          brandApprovalStatus: nextBrandStatus,
          brandFeedbackNote: feedback || item.brandFeedbackNote,
          brandApprovedAt: decision === 'APPROVE' ? new Date().toISOString() : undefined,
          brandApprovedBy: currentUserName,
          overallStatus: nextOverall,
          dropReason,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    onUpdateListings(updated);
  };

  // KOC Negotiation Status Update
  const handleKocNegotiationChange = (id: string, newStatus: KocNegotiationStatus, note?: string) => {
    const updated = listings.map((item) => {
      if (item.id === id) {
        let nextOverall = item.overallStatus;
        let dropReason = item.dropReason;

        if (newStatus === 'NEGOTIATION_FAILED') {
          nextOverall = 'DROPPED';
          dropReason = note || 'Đàm phán thù lao/lịch trình thất bại. Đã hoàn 1 suất kế hoạch.';
        } else if (newStatus === 'TERMS_AGREED' && item.brandApprovalStatus === 'BRAND_APPROVED') {
          nextOverall = 'FINAL_APPROVED';
        }

        return {
          ...item,
          kocNegotiationStatus: newStatus,
          negotiationNote: note !== undefined ? note : item.negotiationNote,
          negotiatedAt: newStatus === 'TERMS_AGREED' ? new Date().toISOString() : item.negotiatedAt,
          overallStatus: nextOverall,
          dropReason,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    onUpdateListings(updated);
  };

  // Final Approve
  const handleFinalApprove = (item: KocListingItem) => {
    const dealId = item.generatedDealId || `DEAL-202610-${item.id.replace('LIST-', '')}`;
    const updated = listings.map((l) => {
      if (l.id === item.id) {
        return {
          ...l,
          overallStatus: 'FINAL_APPROVED' as ListingItemStatus,
          generatedDealId: dealId,
          airVideoStage: l.airVideoStage || ('SAMPLE_DISPATCHED' as AirVideoStage),
          updatedAt: new Date().toISOString()
        };
      }
      return l;
    });
    onUpdateListings(updated);

    if (onGenerateDeal) {
      onGenerateDeal({
        ...item,
        generatedDealId: dealId,
        overallStatus: 'FINAL_APPROVED'
      });
    }
  };

  // Add new KOC to batch
  const handleAddNewKoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKocForm.kocName.trim()) return;

    const newItem: KocListingItem = {
      id: `LIST-${Date.now().toString().slice(-6)}`,
      batchId: `BATCH-202610-${newKocForm.batchCycle === 'BATCH_10' ? 'B1' : newKocForm.batchCycle === 'BATCH_20' ? 'B2' : 'B3'}`,
      batchCycle: newKocForm.batchCycle,
      monthKey: selectedMonth === 'ALL' ? '2026/10' : selectedMonth,
      storeId: 'STORE-01',
      storeName: newKocForm.storeName,
      brandName: newKocForm.brandName,
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
      expectedAirDate: newKocForm.expectedAirDate,
      assignedStaffId: 'STAFF-101',
      assignedStaffName: currentUserName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdateListings([newItem, ...listings]);
    setShowAddModal(false);
    setNewKocForm({
      storeName: 'Kutieskin Official Store',
      brandName: 'Kutieskin',
      batchCycle: 'BATCH_10',
      kocName: '',
      kocHandle: '',
      channel: 'TikTok Shop',
      followersCount: 150000,
      tier: 'MICRO',
      pillarName: 'Chăm sóc da bé mẩn ngứa',
      videoFormat: 'Review & Hướng dẫn sử dụng',
      proposedFee: 5000000,
      expectedAirDate: '2026-10-15'
    });
  };

  // Thêm danh sách KOC từ bộ lọc Shortlist vào đợt duyệt
  const handleAddShortlistToListings = (
    newListings: Partial<KocListingItem>[]
  ) => {
    const fullListings = newListings as KocListingItem[];
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
        <Button variant="secondary" icon={Plus} onClick={() => setShowAddModal(true)}>
          Thêm KOC thủ công
        </Button>
        <Button variant="primary" icon={Filter} onClick={() => setShowShortlistModal(true)}>
          Lọc danh sách đề xuất
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
          Đợt đề xuất & phê duyệt song song
          <span className="text-2xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full">
            {filteredListings.length}
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
          Theo dõi video lên sóng & giỏ hàng sàn
          <span className="text-2xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
            {airListings.length}
          </span>
        </button>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500">Tổng đề xuất</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">{metrics.total}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Hồ sơ trong kỳ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500">Bản nháp</div>
          <div className="text-lg font-semibold text-slate-700 mt-1">{metrics.draft}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Chưa gửi nhãn hàng</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-blue-600">Đã gửi nhãn hàng</div>
          <div className="text-lg font-semibold text-blue-700 mt-1">{metrics.submitted}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Đang thẩm định</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-emerald-600">Nhãn hàng đã duyệt</div>
          <div className="text-lg font-semibold text-emerald-700 mt-1">{metrics.brandApproved}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Đạt tiêu chí nhãn</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-accent">KOC chốt giá</div>
          <div className="text-lg font-semibold text-accent mt-1">{metrics.termsAgreed}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Đã thống nhất phí</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 bg-emerald-50/40 border-emerald-200">
          <div className="text-2xs font-semibold text-emerald-800">Đã chốt duyệt</div>
          <div className="text-lg font-semibold text-emerald-900 mt-1">{metrics.finalApproved}</div>
          <div className="text-2xs text-emerald-700 mt-0.5">Tính chỉ tiêu & lên sóng</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 bg-rose-50/40 border-rose-200">
          <div className="text-2xs font-semibold text-rose-800">Không đạt</div>
          <div className="text-lg font-semibold text-rose-900 mt-1">{metrics.dropped}</div>
          <div className="text-2xs text-rose-700 mt-0.5">Đã hoàn suất kế hoạch</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500">Ngân sách dự kiến</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 truncate">
            {formatVnd(metrics.totalBudget)}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">Chi phí thù lao</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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

          {/* Cycle selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Đợt đề xuất</label>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value as ListingBatchCycle | 'ALL')}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            >
              <option value="ALL">Tất cả các đợt</option>
              <option value="BATCH_10">Đợt ngày 10</option>
              <option value="BATCH_20">Đợt ngày 20</option>
              <option value="BATCH_30">Đợt ngày 30</option>
            </select>
          </div>

          {/* Store selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Gian hàng</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả gian hàng</option>
              {storeOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Approval Filter */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Thẩm định nhãn hàng</label>
            <select
              value={selectedBrandStatus}
              onChange={(e) => setSelectedBrandStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="BRAND_PENDING">Chờ nhãn hàng duyệt</option>
              <option value="BRAND_APPROVED">Nhãn hàng đã duyệt</option>
              <option value="BRAND_REJECTED">Nhãn hàng từ chối</option>
            </select>
          </div>

          {/* KOC Status Filter */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Đàm phán KOC</label>
            <select
              value={selectedKocStatus}
              onChange={(e) => setSelectedKocStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả tiến độ đàm phán</option>
              <option value="NOT_CONTACTED">Chưa liên hệ</option>
              <option value="CONTACTING">Đang trao đổi</option>
              <option value="TERMS_AGREED">Đã chốt điều khoản</option>
              <option value="NEGOTIATION_FAILED">Đàm phán thất bại</option>
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
                placeholder="Tìm theo tên KOC, kênh, gian hàng, nhãn hàng..."
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
                onClick={handleSubmitToBrand}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedIds.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                <Send className="w-3 h-3" />
                Gửi nhãn hàng duyệt đợt này
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'LISTING_APPROVAL' ? (
        /* TAB 1: LISTING & PARALLEL APPROVAL */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-2xs">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredListings.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                  </th>
                  <th className="py-3 px-3">KOC & Kênh</th>
                  <th className="py-3 px-3">Đợt / Gian hàng / Ngày lên sóng</th>
                  <th className="py-3 px-3 text-right">Chi phí đề xuất</th>
                  <th className="py-3 px-3">Thẩm định nhãn hàng</th>
                  <th className="py-3 px-3">Đàm phán KOC</th>
                  <th className="py-3 px-3">Trạng thái chung</th>
                  <th className="py-3 px-3 text-right">Phê duyệt chốt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy bản ghi đề xuất nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
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
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </td>

                        {/* KOC Info */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.kocName}</div>
                          <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{item.kocHandle}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{item.channel}</span>
                            <span>•</span>
                            <span>{(item.followersCount / 1000).toFixed(0)}K</span>
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
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-300"
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
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.tier}
                            </span>
                            <span className="ml-1.5 text-slate-600 truncate max-w-[180px] inline-block align-bottom">
                              {item.pillarName}
                            </span>
                          </div>
                        </td>

                        {/* Batch & Store */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-2xs font-semibold px-2 py-0.5 rounded border ${
                                item.batchCycle === 'BATCH_10'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : item.batchCycle === 'BATCH_20'
                                  ? 'bg-accent-soft text-accent border-line'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {item.batchCycle === 'BATCH_10'
                                ? 'Đợt 10'
                                : item.batchCycle === 'BATCH_20'
                                ? 'Đợt 20'
                                : 'Đợt 30'}
                            </span>
                          </div>
                          <div className="text-2xs text-slate-700 font-medium mt-1 truncate max-w-[170px]">
                            {item.storeName}
                          </div>
                          <div className="text-2xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Lên sóng: {item.expectedAirDate || 'Chưa đặt'}</span>
                          </div>
                        </td>

                        {/* Fee */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-semibold text-slate-900">
                            {formatVnd(item.proposedFee)}
                          </div>
                          {item.finalFee && item.finalFee !== item.proposedFee && (
                            <div className="text-2xs text-emerald-600 font-medium">
                              Chốt: {formatVnd(item.finalFee)}
                            </div>
                          )}
                          <div className="text-2xs text-slate-400 mt-0.5">
                            Phụ trách: {item.assignedStaffName}
                          </div>
                        </td>

                        {/* Parallel Track 1: Brand Review */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {item.brandApprovalStatus === 'BRAND_APPROVED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Nhãn hàng đã duyệt
                                </span>
                              )}
                              {item.brandApprovalStatus === 'BRAND_PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Chờ nhãn hàng duyệt
                                </span>
                              )}
                              {item.brandApprovalStatus === 'BRAND_REJECTED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Nhãn hàng từ chối
                                </span>
                              )}
                            </div>

                            {item.brandApprovalStatus === 'BRAND_PENDING' && (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <button
                                  onClick={() => setApprovingItem(item)}
                                  className="px-2 py-0.5 text-2xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors"
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => setRejectingItem(item)}
                                  className="px-2 py-0.5 text-2xs font-medium bg-white text-rose-600 border border-rose-300 hover:bg-rose-50 rounded transition-colors"
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}

                            {item.brandFeedbackNote && (
                              <div className="text-2xs text-slate-500 italic max-w-[180px] truncate" title={item.brandFeedbackNote}>
                                {item.brandFeedbackNote}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Parallel Track 2: KOC Negotiation */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <select
                              value={item.kocNegotiationStatus}
                              onChange={(e) =>
                                handleKocNegotiationChange(item.id, e.target.value as KocNegotiationStatus)
                              }
                              className="text-2xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                            >
                              <option value="NOT_CONTACTED">Chưa liên hệ</option>
                              <option value="CONTACTING">Đang trao đổi</option>
                              <option value="TERMS_AGREED">Đã chốt điều khoản</option>
                              <option value="NEGOTIATION_FAILED">Đàm phán thất bại</option>
                            </select>

                            {item.negotiationNote && (
                              <div className="text-2xs text-slate-500 truncate max-w-[180px]" title={item.negotiationNote}>
                                {item.negotiationNote}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Overall Status Badge */}
                        <td className="py-3 px-3">
                          <div>
                            {item.overallStatus === 'FINAL_APPROVED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                Đã chốt duyệt
                              </span>
                            )}
                            {item.overallStatus === 'SUBMITTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-600" />
                                Đang xử lý song song
                              </span>
                            )}
                            {item.overallStatus === 'DRAFT' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Bản nháp nội bộ
                              </span>
                            )}
                            {item.overallStatus === 'DROPPED' && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Không đạt
                                </span>
                                <div className="text-2xs text-rose-600 mt-1 flex items-center gap-1">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Đã hoàn 1 suất kế hoạch</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Final Approve Action */}
                        <td className="py-3 px-3 text-right">
                          {canFinalApprove ? (
                            <button
                              onClick={() => handleFinalApprove(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Chốt duyệt
                            </button>
                          ) : item.overallStatus === 'FINAL_APPROVED' ? (
                            <div className="text-2xs text-emerald-700 font-medium flex items-center justify-end gap-1">
                              <span>Mã: {item.generatedDealId}</span>
                              <ChevronRight className="w-3 h-3 text-emerald-500" />
                            </div>
                          ) : item.overallStatus === 'DROPPED' ? (
                            <span className="text-2xs text-slate-400">Đã giải phóng</span>
                          ) : (
                            <span className="text-2xs text-slate-400 italic">Chờ đủ 2 điều kiện</span>
                          )}
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
                KOC không đạt: Hoàn trả 1 suất khả dụng về kế hoạch tháng
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
                <p className="text-2xs text-slate-500 mt-0.5">
                  Tập hợp các KOC đã chốt duyệt. Kiểm soát gửi hàng mẫu, duyệt kịch bản,
                  duyệt video nháp, lên sóng đúng hạn cam kết, kiểm tra gắn giỏ hàng sàn và mã quảng cáo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {airListings.length} video đang theo dõi
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-2xs">
                  <th className="py-3 px-3">Mã hồ sơ / KOC</th>
                  <th className="py-3 px-3">Gian hàng & Kênh</th>
                  <th className="py-3 px-3">Tiến trình lên sóng</th>
                  <th className="py-3 px-3">Lịch lên sóng cam kết</th>
                  <th className="py-3 px-3">Gắn giỏ hàng sàn</th>
                  <th className="py-3 px-3">Mã Spark Ads</th>
                  <th className="py-3 px-3">Liên kết video</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {airListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Chưa có KOC nào đạt trạng thái chốt duyệt trong đợt này.
                    </td>
                  </tr>
                ) : (
                  airListings.map((item) => {
                    // Check overdue
                    const todayStr = '2026-10-09';
                    const isOverdue =
                      item.expectedAirDate &&
                      item.expectedAirDate < todayStr &&
                      item.airVideoStage !== 'AIRED' &&
                      item.airVideoStage !== 'ANCHOR_VERIFIED' &&
                      item.airVideoStage !== 'COMPLETED';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Deal & KOC */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.kocName}</div>
                          <div className="text-2xs text-slate-500">{item.kocHandle}</div>
                          <div className="text-2xs font-mono text-blue-600 mt-1">
                            {item.generatedDealId || 'DEAL-AUTO'}
                          </div>
                        </td>

                        {/* Store & Channel */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{item.storeName}</div>
                          <div className="text-2xs text-slate-500 mt-0.5">
                            {item.channel} • {item.pillarName}
                          </div>
                        </td>

                        {/* Air Video Pipeline Stage */}
                        <td className="py-3 px-3">
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

                        {/* Expected Air Date */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">
                            {item.expectedAirDate || 'Chưa định ngày'}
                          </div>
                          {item.actualAirDate && (
                            <div className="text-2xs text-emerald-600">
                              Thực tế: {item.actualAirDate}
                            </div>
                          )}
                        </td>

                        {/* Cart Anchor Verified */}
                        <td className="py-3 px-3">
                          {item.isCartAnchored ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Đã gắn giỏ hàng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              Chưa gắn giỏ hàng
                            </span>
                          )}
                        </td>

                        {/* Spark Ads Code */}
                        <td className="py-3 px-3">
                          {item.sparkAdsCode ? (
                            <span className="font-mono text-2xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {item.sparkAdsCode}
                            </span>
                          ) : (
                            <span className="text-2xs text-slate-400 italic">Chưa cấp mã</span>
                          )}
                        </td>

                        {/* Published Video URL */}
                        <td className="py-3 px-3">
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
                            <span className="text-2xs text-slate-400 italic">Chưa có liên kết</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedListingForAir(item);
                              setShowAirUpdateModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                          >
                            Cập nhật tiến độ
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

      {/* MODAL 1: ADD NEW KOC TO BATCH */}
      <Presence show={!!showAddModal}>
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                Thêm KOC mới vào đợt đề xuất
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddNewKoc} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                      const br = st.toLowerCase().includes('kutieskin') ? 'Kutieskin' : 'Nhãn hàng khác';
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
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    Cảnh báo: KOC đã có trong đợt đề xuất của nhãn này!
                  </div>
                  <div className="mt-1 text-2xs space-y-0.5 text-amber-800/90">
                    <div>Nhân sự đã thêm: <strong>{newKocDuplicate.assignedStaffName || 'Chưa rõ'}</strong></div>
                    <div>Hồ sơ: <strong>{newKocDuplicate.kocName}</strong> · {newKocDuplicate.kocHandle} · Nhãn: <strong>{newKocDuplicate.brandName}</strong></div>
                    <div>Thù lao đề xuất: <strong>{formatVnd(newKocDuplicate.proposedFee)}</strong></div>
                    <div className="text-amber-700 italic pt-0.5">Vui lòng kiểm tra với đồng nghiệp để tránh liên hệ trùng KOC hoặc chênh lệch giá.</div>
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
                    step={500000}
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
                  Lưu vào đợt nháp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL 2: UPDATE AIR VIDEO PROGRESS */}
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
        message={`Bạn có chắc chắn muốn phê duyệt hồ sơ KOC "${approvingItem?.kocName}" của nhãn ${approvingItem?.brandName} cho đợt đề xuất hiện tại? Sau khi duyệt, hồ sơ sẽ đủ điều kiện chuyển sang theo dõi video lên sóng.`}
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
        message={`Vui lòng nhập lý do từ chối hồ sơ KOC "${rejectingItem?.kocName}" để bộ phận phụ trách điều chỉnh hoặc tìm KOC thay thế:`}
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

      {/* Modal Lọc Shortlist KOC cho gian hàng */}
      <StoreShortlistFilterModal
        isOpen={showShortlistModal}
        onClose={() => setShowShortlistModal(false)}
        onAddToListingBatch={handleAddShortlistToListings}
      />
    </div>
  );
}
