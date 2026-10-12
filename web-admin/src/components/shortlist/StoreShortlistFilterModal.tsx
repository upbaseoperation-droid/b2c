'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Users,
  Store,
  DollarSign,
  TrendingUp,
  Download,
  Send,
  Sparkles,
  Search,
  Check,
  ShieldCheck,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import {
  StorePortfolioItem,
  KocItem,
  KocListingItem,
  ListingBatchCycle,
  SalaryGrade,
  CreatorSegment,
  TepKenh,
  KocCategory
} from '@/lib/types';
import { formatVndShort } from '@/lib/format';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS } from '@/lib/mockData';

interface StoreShortlistFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  initialStoreId?: string;
  onAddToListingBatch?: (
    newListings: Partial<KocListingItem>[],
    store: StorePortfolioItem,
    batchCycle: ListingBatchCycle
  ) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const StoreShortlistFilterModal: React.FC<StoreShortlistFilterModalProps> = ({
  isOpen,
  onClose,
  stores = INITIAL_STORE_PORTFOLIOS,
  kocs = INITIAL_KOCS,
  initialStoreId,
  onAddToListingBatch,
  onNotify
}) => {
  // 1. Gian hàng được chọn
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    initialStoreId || (stores[0]?.id ?? '')
  );

  // Cập nhật khi mở modal hoặc initialStoreId thay đổi
  React.useEffect(() => {
    if (initialStoreId) {
      setSelectedStoreId(initialStoreId);
    } else if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [initialStoreId, stores]);

  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0];
  }, [stores, selectedStoreId]);

  // 2. Bộ tiêu chí lọc
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['KL2', 'KL3', 'KL4', 'KL5']);
  const [selectedTepKenh, setSelectedTepKenh] = useState<string>('ALL');
  const [minGmvThreshold, setMinGmvThreshold] = useState<number>(0);
  const [minGpmThreshold, setMinGpmThreshold] = useState<number>(0);
  const [preferFormat, setPreferFormat] = useState<'ALL' | 'VIDEO' | 'LIVE'>('ALL');
  const [minFemaleRatio, setMinFemaleRatio] = useState<number>(0);
  const [excludeAssignedKoc, setExcludeAssignedKoc] = useState<boolean>(true);
  const [requireLegalDoc, setRequireLegalDoc] = useState<boolean>(false);
  const [minReliability, setMinReliability] = useState<number>(8.0);
  const [searchKocText, setSearchKocText] = useState<string>('');

  // 3. Chu kỳ đợt Listing để bàn giao
  const [targetBatchCycle, setTargetBatchCycle] = useState<ListingBatchCycle>('BATCH_10');

  // 4. KOC được chọn trong Shortlist
  const [selectedKocIds, setSelectedKocIds] = useState<string[]>([]);

  // Tự động gợi ý thiết lập lọc ban đầu dựa trên ngành hàng của gian hàng
  React.useEffect(() => {
    if (!selectedStore) return;
    const cat = selectedStore.category.toLowerCase();
    if (cat.includes('mỹ phẩm') || cat.includes('skincare') || cat.includes('dược')) {
      setSelectedTepKenh('Review Nữ');
      setMinFemaleRatio(60);
    } else if (cat.includes('mẹ') || cat.includes('bé')) {
      setSelectedTepKenh('Mẹ & Bé (bầu)');
      setMinFemaleRatio(70);
    } else if (cat.includes('gia dụng') || cat.includes('nhà')) {
      setSelectedTepKenh('ELHA');
      setMinFemaleRatio(0);
    } else {
      setSelectedTepKenh('ALL');
      setMinFemaleRatio(0);
    }
    // Reset danh sách chọn
    setSelectedKocIds([]);
  }, [selectedStoreId]);

  // Đổi lựa chọn checkbox khung lương
  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  // 5. Tính điểm phù hợp (Match Score Engine) & Lọc danh sách KOC
  const rankedKocs = useMemo(() => {
    if (!selectedStore) return [];

    const storeCat = (selectedStore.category || '').toLowerCase();

    return kocs
      .map((k) => {
        let score = 50; // Điểm cơ sở
        const reasons: string[] = [];

        // 1. Phù hợp khung lương được chọn
        if (selectedGrades.length > 0) {
          if (selectedGrades.includes(k.salaryGrade)) {
            score += 20;
            reasons.push(`Thuộc khung lương ${k.salaryGrade}`);
          } else {
            return null; // Bị loại nếu không đúng khung lương chọn
          }
        }

        // 2. Phù hợp tệp kênh
        if (selectedTepKenh !== 'ALL') {
          if (k.tepKenh === selectedTepKenh) {
            score += 25;
            reasons.push(`Đúng tệp kênh ${k.tepKenh}`);
          } else {
            score -= 15;
          }
        } else {
          // So khớp tương đối với ngành hàng gian hàng
          const kocCat = (k.kocCategory || '').toLowerCase();
          if (
            (storeCat.includes('mỹ phẩm') || storeCat.includes('dược')) &&
            (kocCat.includes('personal') || kocCat.includes('care') || k.tepKenh?.includes('Review Nữ') || k.tepKenh?.includes('Beauty'))
          ) {
            score += 15;
            reasons.push('Khớp ngành hàng Dược mỹ phẩm');
          } else if (storeCat.includes('mẹ') && (kocCat.includes('mom') || k.tepKenh?.includes('Mẹ'))) {
            score += 15;
            reasons.push('Khớp ngành hàng Mẹ & Bé');
          }
        }

        // 3. Doanh số sàn 30 ngày từ Kalodata
        const revenue = k.recentRevenue || 0;
        if (minGmvThreshold > 0 && revenue < minGmvThreshold) {
          return null; // Không đạt ngưỡng GMV tối thiểu
        }
        if (revenue >= 100000000) {
          score += 15;
          reasons.push(`GMV sàn 30 ngày tốt (${formatVndShort(revenue)})`);
        }

        // 4. Hiệu quả chuyển đổi GPM
        const gpm = k.gpm || 0;
        if (minGpmThreshold > 0 && gpm < minGpmThreshold) {
          return null;
        }
        if (gpm >= 8000000) {
          score += 10;
          reasons.push(`GPM cao (${formatVndShort(gpm)}/1K views)`);
        }

        // 5. Định dạng thế mạnh
        if (preferFormat === 'VIDEO' && (k.gmvShareVideo || 0) >= 60) {
          score += 10;
          reasons.push('Thế mạnh Video ngắn');
        } else if (preferFormat === 'LIVE' && (k.gmvShareLive || 0) >= 30) {
          score += 10;
          reasons.push('Thế mạnh Livestream');
        }

        // 6. Tỉ lệ người xem Nữ
        if (minFemaleRatio > 0) {
          const female = k.femaleRatio || 0;
          if (female < minFemaleRatio) {
            return null; // Không đạt ngưỡng nữ
          }
          if (female >= 80) {
            score += 10;
            reasons.push(`Tệp Nữ cao (${female}%)`);
          }
        }

        // 7. Bộ lọc an toàn: Tránh trùng nhân sự khác phụ trách
        const isConflictPic = Boolean(k.bookingPic && k.bookingPic !== selectedStore.b2cOwnerName);
        if (excludeAssignedKoc && isConflictPic) {
          return null; // Loại trừ KOC đã được nhân sự khác nhận
        }

        // 8. Pháp lý
        const hasLegalDoc = Boolean(k.isOcrVerified || (k.cccd && k.cccd.length >= 9));
        if (requireLegalDoc && !hasLegalDoc) {
          return null; // Chưa có CCCD
        }
        if (hasLegalDoc) {
          score += 5;
        }

        // 9. Điểm uy tín
        if ((k.reliabilityScore || 10) < minReliability) {
          return null;
        }

        // 10. Lọc theo từ khóa tìm kiếm
        if (searchKocText.trim()) {
          const q = searchKocText.trim().toLowerCase();
          const matchName = k.stageName.toLowerCase().includes(q);
          const matchHandle = k.channelId.toLowerCase().includes(q);
          if (!matchName && !matchHandle) return null;
        }

        const matchPercent = Math.min(100, Math.max(20, score));

        return {
          koc: k,
          matchPercent,
          reasons,
          isConflictPic,
          hasLegalDoc
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }, [
    kocs,
    selectedStore,
    selectedGrades,
    selectedTepKenh,
    minGmvThreshold,
    minGpmThreshold,
    preferFormat,
    minFemaleRatio,
    excludeAssignedKoc,
    requireLegalDoc,
    minReliability,
    searchKocText
  ]);

  // Toggle chọn KOC
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

  // Dự toán chi phí & số liệu của danh sách đã chọn
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
      list
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
      // Map Tier
      let tier: 'CELEB' | 'MEGA' | 'MACRO' | 'MICRO' | 'NANO' = 'MICRO';
      if (k.tier === 'TIER_1_CELEB') tier = 'CELEB';
      else if (k.tier === 'TIER_2_MACRO') tier = 'MACRO';
      else if (k.tier === 'TIER_3_MICRO') tier = 'MICRO';
      else tier = 'NANO';

      return {
        id: `listing-${Date.now()}-${k.id}`,
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
        expectedAirDate: '2026-10-25'
      };
    });

    if (onAddToListingBatch) {
      onAddToListingBatch(newListings, selectedStore, targetBatchCycle);
    }

    if (onNotify) {
      onNotify(
        `Đã tạo đề xuất ${newListings.length} KOC vào ${targetBatchCycle} cho gian hàng ${selectedStore.brandName} thành công.`,
        'success'
      );
    }

    onClose();
  };

  // Xuất bảng đề xuất ra file CSV
  const handleExportCsv = () => {
    if (!selectedStore || rankedKocs.length === 0) return;

    const exportItems = selectedKocIds.length > 0
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
      'View TB',
      'Giá dự kiến (VNĐ)',
      'GMV 30 ngày sàn (VNĐ)',
      'GPM (VNĐ/1K views)',
      'Tỷ lệ Nữ (%)',
      'Độ phù hợp (%)',
      'Đã có CCCD'
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
      item.koc.avgViews,
      item.koc.rateCardVideo || 0,
      item.koc.recentRevenue || 0,
      item.koc.gpm || 0,
      `${item.koc.femaleRatio || 0}%`,
      `${item.matchPercent}%`,
      item.hasLegalDoc ? 'Đã có' : 'Chưa có'
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
      `Shortlist_KOC_${selectedStore.brandName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onNotify) {
      onNotify(`Đã xuất danh sách ${exportItems.length} KOC ra tệp CSV.`, 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/20">
              <Filter className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Lọc Danh Sách Đề Xuất KOC (Shortlist) Cho Gian Hàng
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                  Đối soát tiêu chí & dữ liệu sàn
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Sàng lọc tệp KOC tối ưu theo ngành hàng, ngân sách và chỉ số bán hàng thực tế
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Khối chọn gian hàng & thông tin mục tiêu */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-[280px]">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Gian hàng mục tiêu:
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
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
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-2xs text-slate-500 block">Ngân sách tháng</span>
                <span className="font-bold text-blue-700">
                  {formatVndShort(selectedStore.monthlyBudget)}
                </span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-2xs text-slate-500 block">Mục tiêu GMV</span>
                <span className="font-bold text-emerald-700">
                  {formatVndShort(selectedStore.monthlyTargetGmv)}
                </span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-2xs text-slate-500 block">Ngành hàng</span>
                <span className="font-semibold text-slate-800">{selectedStore.category}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-2xs text-slate-500 block">Phụ trách B2C</span>
                <span className="font-semibold text-slate-800">{selectedStore.b2cOwnerName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Nội dung chính: 2 Cột (Bộ lọc bên trái - Danh sách kết quả bên phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Cột trái: Bộ tiêu chuẩn lọc (4 cột) */}
          <div className="lg:col-span-4 p-5 border-r border-slate-200 overflow-y-auto space-y-4 bg-white text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600" />
                Tiêu chuẩn sàng lọc
              </span>
              <span className="text-2xs text-slate-500">
                Tìm thấy: <strong>{rankedKocs.length}</strong> KOC phù hợp
              </span>
            </div>

            {/* Tìm kiếm nhanh */}
            <div>
              <label className="text-2xs font-semibold text-slate-600 block mb-1">
                Tìm tên hoặc ID kênh:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKocText}
                  onChange={(e) => setSearchKocText(e.target.value)}
                  placeholder="VD: megauriviu, chanhbeauty..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Khung lương (Salary Grade) */}
            <div className="space-y-1.5">
              <label className="text-2xs font-semibold text-slate-600 block">
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
                  { id: 'KL7', label: 'KL7 (>30M)' }
                ].map((g) => (
                  <label
                    key={g.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-2xs cursor-pointer transition ${
                      selectedGrades.includes(g.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(g.id)}
                      onChange={() => toggleGrade(g.id)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>{g.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tệp kênh (25 tệp chuẩn) */}
            <div>
              <label className="text-2xs font-semibold text-slate-600 block mb-1">
                Tệp kênh sáng tạo:
              </label>
              <select
                value={selectedTepKenh}
                onChange={(e) => setSelectedTepKenh(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
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
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider block">
                Chỉ số bán hàng từ sàn (Kalodata)
              </span>

              <div>
                <label className="text-2xs text-slate-600 flex items-center justify-between mb-1">
                  <span>Doanh số 30 ngày tối thiểu:</span>
                  <span className="font-bold text-blue-600">
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
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="text-2xs text-slate-600 flex items-center justify-between mb-1">
                  <span>GPM tối thiểu (GMV/1K views):</span>
                  <span className="font-bold text-indigo-600">
                    {minGpmThreshold === 0 ? 'Không giới hạn' : formatVndShort(minGpmThreshold)}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20000000"
                  step="2000000"
                  value={minGpmThreshold}
                  onChange={(e) => setMinGpmThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="text-2xs text-slate-600 flex items-center justify-between mb-1">
                  <span>Tỉ lệ người xem Nữ tối thiểu:</span>
                  <span className="font-bold text-rose-600">
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
                  className="w-full accent-rose-600"
                />
              </div>

              <div>
                <label className="text-2xs font-semibold text-slate-600 block mb-1">
                  Ưu tiên định dạng nội dung:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'VIDEO', label: 'Video ngắn' },
                    { id: 'LIVE', label: 'Live' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPreferFormat(f.id as any)}
                      className={`p-1.5 rounded-lg border text-2xs font-semibold transition ${
                        preferFormat === f.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bộ lọc an toàn & Chống xung đột */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider block">
                Quy tắc an toàn &amp; Pháp lý
              </span>

              <label className="flex items-start gap-2 text-2xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAssignedKoc}
                  onChange={(e) => setExcludeAssignedKoc(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5"
                />
                <span>
                  <strong>Loại trừ KOC đang có nhân sự khác phụ trách</strong> (tránh 2 người cùng liên hệ gây xung đột giá cast)
                </span>
              </label>

              <label className="flex items-start gap-2 text-2xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireLegalDoc}
                  onChange={(e) => setRequireLegalDoc(e.target.checked)}
                  className="rounded text-blue-600 mt-0.5"
                />
                <span>
                  <strong>Chỉ chọn KOC đã có CCCD/ĐKKD</strong> (để làm hợp đồng và giải ngân nhanh)
                </span>
              </label>
            </div>
          </div>

          {/* Cột phải: Bảng danh sách KOC được đề xuất (8 cột) */}
          <div className="lg:col-span-8 flex flex-col bg-slate-50/40 overflow-hidden">
            {/* Thanh công cụ bảng */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-2xs font-semibold transition"
                >
                  {selectedKocIds.length === rankedKocs.length && rankedKocs.length > 0
                    ? 'Bỏ chọn tất cả'
                    : `Chọn tất cả (${rankedKocs.length})`}
                </button>
                <span className="text-2xs text-slate-500">
                  Đã chọn: <strong className="text-blue-600">{selectedKocIds.length}</strong> KOC
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất bảng đề xuất</span>
                </button>
              </div>
            </div>

            {/* Bảng KOC */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {rankedKocs.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold text-slate-700">
                    Không tìm thấy KOC phù hợp với các tiêu chí đã chọn
                  </div>
                  <div className="text-2xs text-slate-500 max-w-sm mx-auto">
                    Vui lòng mở rộng khung lương, giảm bớt điều kiện doanh số sàn hoặc bỏ chọn lọc KOC trùng người phụ trách.
                  </div>
                </div>
              ) : (
                rankedKocs.map(({ koc, matchPercent, reasons, isConflictPic, hasLegalDoc }) => {
                  const isSelected = selectedKocIds.includes(koc.id);

                  return (
                    <div
                      key={koc.id}
                      onClick={() => toggleSelectKoc(koc.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Cột 1: Thông tin kênh */}
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handle by parent div click
                          className="rounded text-blue-600 focus:ring-0 shrink-0"
                        />
                        <img
                          src={
                            koc.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
                          }
                          alt={koc.stageName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">{koc.stageName}</span>
                            <span className="px-1.5 py-0.2 rounded text-3xs font-semibold bg-blue-100 text-blue-800">
                              {koc.salaryGrade}
                            </span>
                            {hasLegalDoc && (
                              <span title="Đã có CCCD xác thực">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-slate-500 font-medium">
                            @{koc.channelId.replace('@', '')} • {koc.tepKenh}
                          </div>
                          {/* Điểm nổi bật */}
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {reasons.slice(0, 2).map((r, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-3xs font-medium"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Cột 2: Chỉ số sàn Kalodata */}
                      <div className="grid grid-cols-3 gap-3 text-center min-w-[220px] bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-3xs text-slate-500 block">Follower</span>
                          <span className="text-2xs font-bold text-slate-800">
                            {formatVndShort(koc.followers).replace('đ', '')}
                          </span>
                        </div>
                        <div>
                          <span className="text-3xs text-slate-500 block">GMV sàn 30d</span>
                          <span className="text-2xs font-bold text-blue-700">
                            {koc.recentRevenue ? formatVndShort(koc.recentRevenue) : 'Chưa có'}
                          </span>
                        </div>
                        <div>
                          <span className="text-3xs text-slate-500 block">GPM/1K view</span>
                          <span className="text-2xs font-bold text-emerald-700">
                            {koc.gpm ? formatVndShort(koc.gpm) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Cột 3: Giá dự kiến & Độ phù hợp */}
                      <div className="flex items-center gap-4 min-w-[160px] justify-between md:justify-end w-full md:w-auto">
                        <div className="text-right">
                          <span className="text-3xs text-slate-500 block">Giá dự kiến (Net)</span>
                          <span className="text-xs font-bold text-slate-900">
                            {formatVndShort(koc.rateCardVideo || 0)}
                          </span>
                        </div>

                        <div className="text-center shrink-0">
                          <div
                            className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-bold text-xs border ${
                              matchPercent >= 80
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : matchPercent >= 60
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>{matchPercent}%</span>
                            <span className="text-4xs font-normal">Hợp</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer: Thanh tóm tắt dự toán & Hành động */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tóm tắt ngân sách */}
          <div className="flex items-center gap-4 text-xs w-full md:w-auto justify-between md:justify-start">
            <div>
              <span className="text-2xs text-slate-500 block">Đã chọn vào Shortlist:</span>
              <span className="font-bold text-blue-700 text-sm">
                {selectedKocsSummary.count} KOC
              </span>
            </div>

            <div className="border-l border-slate-200 pl-4">
              <span className="text-2xs text-slate-500 block">Tổng chi phí dự kiến:</span>
              <span
                className={`font-bold text-sm ${
                  selectedKocsSummary.isOverBudget ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {formatVndShort(selectedKocsSummary.totalCost)}
              </span>
              {selectedKocsSummary.isOverBudget && (
                <span className="text-3xs text-rose-500 font-semibold block">
                  ⚠️ Vượt ngân sách tháng ({formatVndShort(selectedKocsSummary.storeBudget)})
                </span>
              )}
            </div>

            <div className="border-l border-slate-200 pl-4">
              <span className="text-2xs text-slate-500 block">Doanh số ước tính (GMV):</span>
              <span className="font-bold text-emerald-700 text-sm">
                ~{formatVndShort(selectedKocsSummary.estimatedGmv)}
              </span>
            </div>
          </div>

          {/* Các nút hành động */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              Đóng
            </button>

            {/* Chọn chu kỳ đợt */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-2xs font-semibold text-slate-600">Đợt:</span>
              <select
                value={targetBatchCycle}
                onChange={(e) => setTargetBatchCycle(e.target.value as ListingBatchCycle)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
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
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đưa vào đợt duyệt KOC ({selectedKocsSummary.count})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
