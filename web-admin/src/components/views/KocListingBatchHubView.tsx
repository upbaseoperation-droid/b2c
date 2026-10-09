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
  Sparkles,
  Film,
  ShoppingBag,
  Store,
  DollarSign,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
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
  currentRole = 'ADMIN',
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

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAirUpdateModal, setShowAirUpdateModal] = useState<boolean>(false);
  const [selectedListingForAir, setSelectedListingForAir] = useState<KocListingItem | null>(null);

  // New KOC form state
  const [newKocForm, setNewKocForm] = useState({
    storeName: 'Kutieskin Official Store',
    brandName: 'Kutieskin',
    batchCycle: 'BATCH_10' as ListingBatchCycle,
    kocName: '',
    kocHandle: '',
    channel: 'TikTok Shop' as const,
    followersCount: 150000,
    tier: 'MICRO' as const,
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

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
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
  }, [listings, selectedMonth, selectedCycle, selectedStore, selectedBrandStatus, selectedKocStatus, searchQuery]);

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
          dropReason = feedback || 'Brand từ chối hồ sơ KOC đợt này. Đã hoàn 1 slot kế hoạch.';
        } else if (decision === 'APPROVE' && item.kocNegotiationStatus === 'TERMS_AGREED') {
          // If KOC negotiation is already agreed, can graduate to FINAL_APPROVED
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
          dropReason = note || 'Đàm phán thù lao/lịch trình thất bại. Đã hoàn 1 slot kế hoạch.';
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

  // Dual-Gate Final Approve
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
      niche: 'Mẹ & Bé / Skincare',
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
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                Chu kỳ Listing Ngày 10 - 20 - 30
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Parallel Tracks & Dual-Gate Approval
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Lý Đợt Listing KOC & Theo Dõi Air Video
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Quy trình chuẩn hóa: Soạn danh sách nháp theo đợt ngày 10, 20, 30; gửi Brand duyệt song song với nhân sự đàm phán KOC;
              chốt Final khi cả 2 nhánh thành công để tự động chuyển sang phân hệ theo dõi hàng mẫu, duyệt video và gắn giỏ hàng sàn.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm KOC vào đợt listing
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mt-6 pt-2">
          <button
            onClick={() => setActiveSubTab('LISTING_APPROVAL')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'LISTING_APPROVAL'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Đợt Listing & Phê duyệt song song
            <span className="text-2xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full">
              {filteredListings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('AIR_TRACKER')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeSubTab === 'AIR_TRACKER'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Theo dõi Air Video & Giỏ hàng sàn
            <span className="text-2xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
              {airListings.length}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500 uppercase tracking-wider">Tổng Listing</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{metrics.total}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Hồ sơ trong kỳ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500 uppercase tracking-wider">Bản nháp</div>
          <div className="text-lg font-bold text-slate-700 mt-1">{metrics.draft}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Chưa gửi Brand</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-blue-600 uppercase tracking-wider">Đã gửi Brand</div>
          <div className="text-lg font-bold text-blue-700 mt-1">{metrics.submitted}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Đang thẩm định</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-emerald-600 uppercase tracking-wider">Brand đã duyệt</div>
          <div className="text-lg font-bold text-emerald-700 mt-1">{metrics.brandApproved}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Đạt tiêu chí nhãn</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-purple-600 uppercase tracking-wider">KOC chốt giá</div>
          <div className="text-lg font-bold text-purple-700 mt-1">{metrics.termsAgreed}</div>
          <div className="text-2xs text-slate-400 mt-0.5">Đã thống nhất phí</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 bg-emerald-50/40 border-emerald-200">
          <div className="text-2xs font-bold text-emerald-800 uppercase tracking-wider">Chốt Final</div>
          <div className="text-lg font-bold text-emerald-900 mt-1">{metrics.finalApproved}</div>
          <div className="text-2xs text-emerald-700 mt-0.5">Tính KPI & Air video</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 bg-rose-50/40 border-rose-200">
          <div className="text-2xs font-bold text-rose-800 uppercase tracking-wider">Bị loại (Dropped)</div>
          <div className="text-lg font-bold text-rose-900 mt-1">{metrics.dropped}</div>
          <div className="text-2xs text-rose-700 mt-0.5">Đã hoàn slot Plan</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-2xs font-medium text-slate-500 uppercase tracking-wider">Ngân sách dự kiến</div>
          <div className="text-sm font-bold text-slate-900 mt-1 truncate">
            {metrics.totalBudget.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">Chi phí thù lao</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Month selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Tháng Kế Hoạch</label>
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
            <label className="block text-2xs font-medium text-slate-600 mb-1">Đợt Listing (Batch Cycle)</label>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            >
              <option value="ALL">Tất cả các đợt</option>
              <option value="BATCH_10">Đợt 10 (Chuẩn bị Mega Sale 15)</option>
              <option value="BATCH_20">Đợt 20 (Chuẩn bị Payday 25)</option>
              <option value="BATCH_30">Đợt 30 (Chuẩn bị Double Day đầu tháng)</option>
            </select>
          </div>

          {/* Store selector */}
          <div>
            <label className="block text-2xs font-medium text-slate-600 mb-1">Gian hàng (Store)</label>
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
            <label className="block text-2xs font-medium text-slate-600 mb-1">Thẩm định Brand</label>
            <select
              value={selectedBrandStatus}
              onChange={(e) => setSelectedBrandStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">Tất cả trạng thái Brand</option>
              <option value="BRAND_PENDING">Chờ Brand duyệt</option>
              <option value="BRAND_APPROVED">Brand đã duyệt</option>
              <option value="BRAND_REJECTED">Brand từ chối</option>
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
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên KOC, handle, shop, nhãn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
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
                Gửi Brand duyệt đợt này
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredListings.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                  </th>
                  <th className="py-3 px-3">KOC & Kênh</th>
                  <th className="py-3 px-3">Đợt / Shop / Ngày Air</th>
                  <th className="py-3 px-3 text-right">Chi phí đề xuất</th>
                  <th className="py-3 px-3">Thẩm định Brand</th>
                  <th className="py-3 px-3">Đàm phán KOC (Booking)</th>
                  <th className="py-3 px-3">Trạng thái chung</th>
                  <th className="py-3 px-3 text-right">Cổng Dual-Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy bản ghi listing nào phù hợp với bộ lọc hiện tại.
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
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
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
                            <span>Air: {item.expectedAirDate || 'Chưa đặt'}</span>
                          </div>
                        </td>

                        {/* Fee */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-semibold text-slate-900">
                            {item.proposedFee.toLocaleString('vi-VN')} đ
                          </div>
                          {item.finalFee && item.finalFee !== item.proposedFee && (
                            <div className="text-2xs text-emerald-600 font-medium">
                              Chốt: {item.finalFee.toLocaleString('vi-VN')} đ
                            </div>
                          )}
                          <div className="text-2xs text-slate-400 mt-0.5">
                            PIC: {item.assignedStaffName}
                          </div>
                        </td>

                        {/* Parallel Track 1: Brand Review */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {item.brandApprovalStatus === 'BRAND_APPROVED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Brand đã duyệt
                                </span>
                              )}
                              {item.brandApprovalStatus === 'BRAND_PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Chờ Brand duyệt
                                </span>
                              )}
                              {item.brandApprovalStatus === 'BRAND_REJECTED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Brand từ chối
                                </span>
                              )}
                            </div>

                            {/* Brand Quick Actions (For Brand Partner / Admin / Manager) */}
                            {item.brandApprovalStatus === 'BRAND_PENDING' && (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <button
                                  onClick={() => handleBrandDecision(item.id, 'APPROVE')}
                                  className="px-2 py-0.5 text-2xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors"
                                >
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => {
                                    const note = prompt('Nhập lý do từ chối hồ sơ KOC này:');
                                    if (note !== null) {
                                      handleBrandDecision(item.id, 'REJECT', note || 'Không phù hợp nhãn hàng');
                                    }
                                  }}
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
                                Listing thành công
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
                                  Bị loại (Dropped)
                                </span>
                                <div className="text-2xs text-rose-600 mt-1 flex items-center gap-1">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Đã hoàn 1 slot Plan</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Dual-Gate Action */}
                        <td className="py-3 px-3 text-right">
                          {canFinalApprove ? (
                            <button
                              onClick={() => handleFinalApprove(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Chốt Final
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
                Duyệt Final khi: Brand đã duyệt + KOC đã chốt điều khoản
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                KOC bị loại: Hoàn trả 1 Slot khả dụng về Kế hoạch tháng
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
                <h2 className="text-sm font-bold text-slate-900">
                  Phân Hệ Theo Dõi Air Video (Air Video Tracker)
                </h2>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Tập hợp các KOC đã qua thẩm định Dual-Gate (FINAL_APPROVED). Kiểm soát toàn trình: gửi hàng mẫu, duyệt kịch bản,
                  duyệt video nháp, lên sóng đúng hạn cam kết, kiểm tra gắn link giỏ hàng sàn và mã Spark Ads.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {airListings.length} Video đang theo dõi
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                  <th className="py-3 px-3">Mã Deal / KOC</th>
                  <th className="py-3 px-3">Gian hàng & Kênh</th>
                  <th className="py-3 px-3">Tiến trình Air Video</th>
                  <th className="py-3 px-3">Lịch lên sóng cam kết</th>
                  <th className="py-3 px-3">Gắn giỏ hàng sàn</th>
                  <th className="py-3 px-3">Mã Spark Ads</th>
                  <th className="py-3 px-3">Link Video Thực Tế</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {airListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Chưa có KOC nào đạt trạng thái chốt Final (FINAL_APPROVED) trong đợt này.
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
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : item.airVideoStage === 'SCRIPT_APPROVED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {item.airVideoStage === 'SAMPLE_DISPATCHED' && '1. Đã xuất mẫu'}
                              {item.airVideoStage === 'SAMPLE_DELIVERED' && '2. Đã nhận mẫu'}
                              {item.airVideoStage === 'SCRIPT_PENDING' && '3. Chờ nộp kịch bản'}
                              {item.airVideoStage === 'SCRIPT_APPROVED' && '4. Đã duyệt kịch bản'}
                              {item.airVideoStage === 'VIDEO_DRAFT_REVIEW' && '5. Duyệt video nháp'}
                              {item.airVideoStage === 'AIRED' && '6. Đã lên sóng'}
                              {item.airVideoStage === 'ANCHOR_VERIFIED' && '7. Đã kiểm tra giỏ hàng'}
                              {item.airVideoStage === 'COMPLETED' && '8. Nghiệm thu hoàn tất'}
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
                            <span className="text-2xs text-slate-400 italic">Chưa có link</span>
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                Thêm KOC Mới Vào Đợt Listing
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
                    Chu kỳ Đợt Listing *
                  </label>
                  <select
                    value={newKocForm.batchCycle}
                    onChange={(e) =>
                      setNewKocForm({ ...newKocForm, batchCycle: e.target.value as ListingBatchCycle })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="BATCH_10">Đợt 10 (Mega Sale 15)</option>
                    <option value="BATCH_20">Đợt 20 (Payday 25)</option>
                    <option value="BATCH_30">Đợt 30 (Double Day)</option>
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
                    Handle Kênh *
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">Kênh</label>
                  <select
                    value={newKocForm.channel}
                    onChange={(e) => setNewKocForm({ ...newKocForm, channel: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800"
                  >
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">Phân Hạng</label>
                  <select
                    value={newKocForm.tier}
                    onChange={(e) => setNewKocForm({ ...newKocForm, tier: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800"
                  >
                    <option value="NANO">NANO (&lt;50K)</option>
                    <option value="MICRO">MICRO (50K-250K)</option>
                    <option value="MACRO">MACRO (250K-1M)</option>
                    <option value="MEGA">MEGA (&gt;1M)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">Followers</label>
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
                    Thù lao đề xuất (VND) *
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
                    Ngày dự kiến lên sóng (Air) *
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
                  Định hướng nội dung (Pillar / Angle)
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
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm"
                >
                  Lưu vào đợt nháp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE AIR VIDEO PROGRESS */}
      {showAirUpdateModal && selectedListingForAir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cập Nhật Tiến Độ Air Video
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  KOC: {selectedListingForAir.kocName} ({selectedListingForAir.kocHandle})
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
                  <option value="SAMPLE_DISPATCHED">1. Đã xuất hàng mẫu</option>
                  <option value="SAMPLE_DELIVERED">2. KOC đã nhận mẫu</option>
                  <option value="SCRIPT_PENDING">3. Chờ nộp kịch bản</option>
                  <option value="SCRIPT_APPROVED">4. Đã duyệt kịch bản</option>
                  <option value="VIDEO_DRAFT_REVIEW">5. Kiểm duyệt bản dựng nháp</option>
                  <option value="AIRED">6. Đã lên sóng chính thức</option>
                  <option value="ANCHOR_VERIFIED">7. Đã kiểm tra gắn giỏ hàng</option>
                  <option value="COMPLETED">8. Nghiệm thu hoàn tất</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Link Video Đã Đăng Tải
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
                    Đã kiểm tra liên kết giỏ hàng sàn (Cart Anchor Verified)
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
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
