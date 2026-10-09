'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
import { 
  Users, 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  ShieldCheck, 
  Eye, 
  ExternalLink, 
  CreditCard, 
  Building2, 
  Copy, 
  Check, 
  FileText, 
  Layers, 
  Tag, 
  DollarSign, 
  TrendingUp, 
  RefreshCw,
  Camera,
  IdCard,
  FileCheck,
  RotateCcw,
  X
} from 'lucide-react';
import { 
  KocItem, 
  SalaryGrade, 
  CreatorSegment, 
  KocCategory, 
  TepKenh, 
  OcrLegalExtractionResult,
  UserProfile
} from '../../lib/types';
import { INITIAL_KOCS } from '../../lib/mockData';
import { LegalOcrModal } from '../LegalOcrModal';
import { KocProfileModal } from '../KocProfileModal';
import { CreateKocModal } from '../CreateKocModal';

interface KocMasterDataViewProps {
  kocs?: KocItem[];
  currentUser?: UserProfile;
  onOpenQuickBookWithKoc: (koc: KocItem) => void;
  onKocUpdated?: (updatedKoc: KocItem) => void;
  onKocCreated?: (newKoc: KocItem) => void;
}

export const KocMasterDataView: React.FC<KocMasterDataViewProps> = ({
  kocs = INITIAL_KOCS,
  currentUser,
  onOpenQuickBookWithKoc,
  onKocUpdated,
  onKocCreated,
}) => {
  const [localKocs, setLocalKocs] = useState<KocItem[]>(kocs);
  
  // Sync when prop updates
  React.useEffect(() => {
    if (kocs) setLocalKocs(kocs);
  }, [kocs]);

  // Modal States
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrTargetKoc, setOcrTargetKoc] = useState<KocItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectedKoc, setInspectedKoc] = useState<KocItem | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOcrStatus, setFilterOcrStatus] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedKL, setSelectedKL] = useState<string>('ALL');
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [selectedKocCategory, setSelectedKocCategory] = useState<string>('ALL');
  const [selectedTepKenh, setSelectedTepKenh] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedPic, setSelectedPic] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Danh sách các Brand & PIC động từ dữ liệu KOC
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    localKocs.forEach(k => {
      if (k.brandName) set.add(k.brandName.trim());
    });
    return Array.from(set).sort();
  }, [localKocs]);

  const availablePics = useMemo(() => {
    const set = new Set<string>();
    localKocs.forEach(k => {
      if (k.bookingPic) set.add(k.bookingPic.trim());
    });
    return Array.from(set).sort();
  }, [localKocs]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered KOC List
  const filteredKocs = useMemo(() => {
    return localKocs.filter(koc => {
      const matchSearch =
        koc.stageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (koc.realName && koc.realName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        koc.channelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (koc.cccd && koc.cccd.includes(searchTerm)) ||
        koc.phone.includes(searchTerm);

      if (!matchSearch) return false;

      // Filter OCR Status
      const hasOcr = Boolean(koc.isOcrVerified || (koc.cccd && koc.cccd !== 'Chưa có' && koc.cccd.length >= 9));
      if (filterOcrStatus === 'VERIFIED' && !hasOcr) return false;
      if (filterOcrStatus === 'UNVERIFIED' && hasOcr) return false;

      // Filter Tier
      if (selectedTier !== 'ALL' && koc.tier !== selectedTier) return false;

      // Filter 4 Core Dimensions
      if (selectedKL !== 'ALL' && koc.salaryGrade !== selectedKL) return false;
      if (selectedSegment !== 'ALL' && koc.segment !== selectedSegment) return false;
      if (selectedKocCategory !== 'ALL' && koc.kocCategory !== selectedKocCategory) return false;
      if (selectedTepKenh !== 'ALL' && koc.tepKenh !== selectedTepKenh) return false;

      // Filter Brand & PIC
      if (selectedBrand !== 'ALL' && koc.brandName !== selectedBrand) return false;
      if (selectedPic !== 'ALL' && koc.bookingPic !== selectedPic) return false;

      return true;
    });
  }, [localKocs, searchTerm, filterOcrStatus, selectedTier, selectedKL, selectedSegment, selectedKocCategory, selectedTepKenh, selectedBrand, selectedPic]);

  const isKocFiltered = searchTerm.trim() !== '' || filterOcrStatus !== 'ALL' || selectedTier !== 'ALL' || selectedKL !== 'ALL' || selectedSegment !== 'ALL' || selectedKocCategory !== 'ALL' || selectedTepKenh !== 'ALL' || selectedBrand !== 'ALL' || selectedPic !== 'ALL';

  const handleResetKocFilters = () => {
    setSearchTerm('');
    setFilterOcrStatus('ALL');
    setSelectedTier('ALL');
    setSelectedKL('ALL');
    setSelectedSegment('ALL');
    setSelectedKocCategory('ALL');
    setSelectedTepKenh('ALL');
    setSelectedBrand('ALL');
    setSelectedPic('ALL');
    setCurrentPage(1);
  };

  // Reset to page 1 whenever any filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterOcrStatus, selectedTier, selectedKL, selectedSegment, selectedKocCategory, selectedTepKenh, selectedBrand, selectedPic, pageSize]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredKocs.length / pageSize) || 1;
  const paginatedKocs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredKocs.slice(startIndex, startIndex + pageSize);
  }, [filteredKocs, currentPage, pageSize]);

  // Handle OCR Apply: Either update existing KOC or create new KOC record
  const handleApplyOcrResult = (ocrResult: OcrLegalExtractionResult) => {
    const isCompany = ocrResult.documentType === 'BUSINESS_LICENSE' || ocrResult.documentType === 'BUSINESS_HOUSEHOLD';
    const legalName = isCompany ? (ocrResult.fields.companyName || 'Công Ty MCN') : (ocrResult.fields.fullName || 'KOC Cá Nhân');
    const legalId = isCompany ? (ocrResult.fields.taxCode || '') : (ocrResult.fields.idNumber || '');

    if (ocrTargetKoc) {
      // Cập nhật KOC hiện có
      const updated: KocItem = {
        ...ocrTargetKoc,
        realName: ocrResult.fields.fullName || ocrTargetKoc.realName,
        cccd: legalId || ocrTargetKoc.cccd,
        shippingAddress: ocrResult.fields.permanentAddress || ocrResult.fields.headquartersAddress || ocrTargetKoc.shippingAddress,
        isOcrVerified: true,
        ocrDocumentType: ocrResult.documentType,
        ocrVerifiedAt: new Date().toISOString(),
        companyName: ocrResult.fields.companyName,
        taxCode: ocrResult.fields.taxCode,
        permanentAddress: ocrResult.fields.permanentAddress,
        dob: ocrResult.fields.dob,
        issueDate: ocrResult.fields.issueDate,
        issuePlace: ocrResult.fields.issuePlace,
        legalRepresentative: ocrResult.fields.legalRepresentative
      };

      setLocalKocs(prev => prev.map(k => k.id === updated.id ? updated : k));
      if (onKocUpdated) onKocUpdated(updated);
      alert(`Đã cập nhật dữ liệu pháp lý OCR thành công cho KOC ${updated.stageName}!`);
    } else {
      // Tạo KOC Mới từ OCR
      const newKoc: KocItem = {
        id: `koc-ocr-${Date.now()}`,
        channelId: `@${(ocrResult.fields.fullName || 'koc').toLowerCase().replace(/\s+/g, '')}`,
        stageName: ocrResult.fields.fullName || ocrResult.fields.companyName || 'KOC Mới',
        realName: ocrResult.fields.fullName || '',
        tier: 'TIER_3_MICRO',
        tierLabel: 'Micro (KL4-5)',
        salaryGrade: 'KL4',
        segment: 'Mid Creator',
        tepKenh: 'Review Nữ',
        kocCategory: 'Personal care',
        niche: 'Beauty / Chăm sóc cá nhân',
        followers: 45000,
        avgViews: 18000,
        rateCardVideo: 4000000,
        bookingFormat: 'Booking Video KOC',
        phone: '0912345678',
        zalo: '0912345678',
        shippingAddress: ocrResult.fields.permanentAddress || ocrResult.fields.headquartersAddress || 'Hà Nội',
        cccd: legalId,
        bankName: 'Techcombank',
        bankAccount: '190388889999',
        reliabilityScore: 10.0,
        isOcrVerified: true,
        ocrDocumentType: ocrResult.documentType,
        ocrVerifiedAt: new Date().toISOString(),
        companyName: ocrResult.fields.companyName,
        taxCode: ocrResult.fields.taxCode,
        permanentAddress: ocrResult.fields.permanentAddress,
        dob: ocrResult.fields.dob,
        issueDate: ocrResult.fields.issueDate,
        issuePlace: ocrResult.fields.issuePlace,
        legalRepresentative: ocrResult.fields.legalRepresentative
      };

      setLocalKocs(prev => [newKoc, ...prev]);
      if (onKocCreated) onKocCreated(newKoc);
      alert(`Đã tạo hồ sơ KOC mới từ OCR: "${newKoc.stageName}" (CCCD/MST: ${legalId})!`);
    }

    setOcrTargetKoc(null);
    setIsOcrModalOpen(false);
  };

  // KPIs
  const totalKocs = localKocs.length;
  const verifiedCount = localKocs.filter(k => k.isOcrVerified || (k.cccd && k.cccd !== 'Chưa có' && k.cccd.length >= 9)).length;
  const verifiedPercent = Math.round((verifiedCount / (totalKocs || 1)) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner & Title */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              Master Data &amp; Quản Trị Hồ Sơ Pháp Lý KOC
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Danh Bạ Master KOC
            </h2>
            <p className="text-xs text-blue-100/90 max-w-2xl leading-relaxed">
              Cơ sở dữ liệu gốc quản lý danh sách KOC toàn phòng B2C: 4 phân loại chuẩn hóa (khung lương, Segment, tệp, ngành hàng) và tích hợp <strong className="text-cyan-300 font-semibold">AI OCR bóc tách CCCD / ĐKKD</strong> phục vụ hợp đồng &amp; chi trả hoa hồng.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Primary Action Button: Scan OCR */}
            <button
              onClick={() => {
                setOcrTargetKoc(null);
                setIsOcrModalOpen(true);
              }}
              className="btn-md bg-cyan-500 hover:bg-cyan-400 hover: active:scale-[0.99] text-white font-semibold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Quét OCR CCCD / ĐKKD thêm KOC</span>
            </button>

            {/* Secondary Action: Manual Create */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-md bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Thêm thủ công</span>
            </button>
          </div>
        </div>

        {/* Mini KPI Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xs text-slate-200 font-medium block">Tổng KOC Trong Master Data</span>
            <span className="text-xl font-semibold text-white mt-0.5 block">{totalKocs}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-2xs text-emerald-200 font-medium block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã xác thực CCCD / ĐKKD
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-semibold text-emerald-300">{verifiedCount}</span>
              <span className="text-xs text-emerald-200">({verifiedPercent}%)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-2xs text-amber-200 font-medium block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Chưa có thông tin CCCD
            </span>
            <span className="text-xl font-semibold text-amber-300 mt-0.5 block">{totalKocs - verifiedCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-2xs text-blue-200 font-medium block">Sẵn sàng xuất hợp đồng</span>
            <span className="text-xl font-semibold text-cyan-300 mt-0.5 block">{verifiedCount} KOC</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search & 4 Core Dimensions Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên kênh, tên thật, số CCCD / MST, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Status Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold text-2xs shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Pháp lý:
            </span>
            <button
              onClick={() => setFilterOcrStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                filterOcrStatus === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả ({totalKocs})
            </button>
            <button
              onClick={() => setFilterOcrStatus('VERIFIED')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                filterOcrStatus === 'VERIFIED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã Quét OCR ({verifiedCount})
            </button>
            <button
              onClick={() => setFilterOcrStatus('UNVERIFIED')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                filterOcrStatus === 'UNVERIFIED'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Chưa Có CCCD ({totalKocs - verifiedCount})
            </button>
          </div>
        </div>

        {/* Multi-Dimensional Filter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              1. Cấp bậc (Tier):
            </label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi cấp bậc Tier</option>
              <option value="TIER_1_CELEB">Tier 1 - Celeb / Key Talent</option>
              <option value="TIER_2_MACRO">Tier 2 - Macro Creator</option>
              <option value="TIER_3_MICRO">Tier 3 - Micro Creator</option>
              <option value="TIER_4_AFFILIATE">Tier 4 - Nano / Affiliate</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              2. Khung Lương (KL):
            </label>
            <select
              value={selectedKL}
              onChange={(e) => setSelectedKL(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Tất cả khung lương</option>
              <option value="TAP UpAffiliate">TAP UpAffiliate (0đ)</option>
              <option value="KL1">KL1 (&lt;1.5M)</option>
              <option value="KL2">KL2 (1.5M - 3M)</option>
              <option value="KL3">KL3 (3M - 5M)</option>
              <option value="KL4">KL4 (5M - 8M)</option>
              <option value="KL5">KL5 (8M - 15M)</option>
              <option value="KL6">KL6 (15M - 25M)</option>
              <option value="KL7">KL7 (&gt;25M Celeb)</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              3. Segment:
            </label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Tất cả Segment</option>
              <option value="Massive Creator">Massive Creator (&lt;3M)</option>
              <option value="Mid Creator">Mid Creator (3M - 10M)</option>
              <option value="Key Creator">Key Creator (10M - 30M)</option>
              <option value="Top Creator">Top Creator (&gt;30M Celeb)</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              4. Tệp kênh (25 tệp):
            </label>
            <select
              value={selectedTepKenh}
              onChange={(e) => setSelectedTepKenh(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Tất cả tệp kênh</option>
              <option value="Review Nữ">Review Nữ</option>
              <option value="Mẹ bé (bầu)">Mẹ bé (bầu)</option>
              <option value="Beauty">Beauty / Làm đẹp</option>
              <option value="Bác sỹ/chuyên gia">Bác sỹ / chuyên gia</option>
              <option value="Gia đình">Gia đình</option>
              <option value="Cooking">Cooking / Nấu ăn</option>
              <option value="Couple">Couple</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              5. Nhãn Hàng:
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Tất cả nhãn hàng</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              6. PIC Booking:
            </label>
            <select
              value={selectedPic}
              onChange={(e) => setSelectedPic(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Tất cả PIC phụ trách</option>
              {availablePics.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {isKocFiltered ? (
              <button
                type="button"
                onClick={handleResetKocFilters}
                className="w-full py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            ) : (
              <div className="text-2xs text-slate-400 px-2 py-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Bộ lọc KOC</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Summary & Pagination Size Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-2xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Tìm thấy <strong className="text-slate-900 font-bold">{filteredKocs.length}</strong> / {totalKocs} KOC trong danh bạ
            </span>
            {isKocFiltered && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-3xs">
                Đang lọc kết quả
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span>
              Trang <strong className="text-slate-800">{currentPage}</strong> / {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-2xs">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-2xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value={10}>10 KOC / trang</option>
              <option value={20}>20 KOC / trang</option>
              <option value={50}>50 KOC / trang</option>
              <option value={100}>100 KOC / trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main KOC Master Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-2xs">
                <th className="py-3 px-4">KOC / tên kênh</th>
                <th className="py-3 px-3">Phân Loại (KL &amp; Segment)</th>
                <th className="py-3 px-3">Tệp Kênh &amp; Ngành</th>
                <th className="py-3 px-3">Nhãn Hàng &amp; PIC</th>
                <th className="py-3 px-4">Định danh pháp lý (CCCD / ĐKKD)</th>
                <th className="py-3 px-3">Tài khoản chi trả</th>
                <th className="py-3 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedKocs.map((koc) => {
                const hasCccd = Boolean(koc.isOcrVerified || (koc.cccd && koc.cccd !== 'Chưa có' && koc.cccd.length >= 9));
                const isCompanyOcr = koc.ocrDocumentType === 'BUSINESS_LICENSE' || koc.ocrDocumentType === 'BUSINESS_HOUSEHOLD';

                return (
                  <tr key={koc.id} className="hover:bg-slate-50/70 transition">
                    
                    {/* KOC Stage & Real Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                          {koc.stageName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate leading-tight">
                            {koc.stageName}
                          </span>
                          <span className="text-2xs text-slate-500 block truncate leading-tight mt-0.5">
                            {koc.realName ? `${koc.realName} • ` : ''}@{koc.channelId}
                          </span>
                          <span className="text-2xs text-slate-400 block mt-0.5">
                            {(koc.followers / 1000).toFixed(0)}k followers • {formatVndShort(koc.rateCardVideo)}/clip
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Salary Grade & Segment */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded font-semibold text-2xs bg-blue-50 text-blue-700 border border-blue-200">
                          {koc.salaryGrade}
                        </span>
                        <span className="block text-2xs text-slate-600 font-medium truncate">
                          {koc.segment}
                        </span>
                      </div>
                    </td>

                    {/* Tep Kenh & Category */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-800 block text-xs truncate">
                          {koc.tepKenh || koc.creatorCategory}
                        </span>
                        <span className="text-2xs text-slate-500 block truncate">
                          {koc.kocCategory}
                        </span>
                      </div>
                    </td>

                    {/* Brand & PIC Phụ Trách */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded font-semibold text-2xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {koc.brandName || 'Chung'}
                        </span>
                        <span className="block text-2xs text-slate-600 truncate">
                          PIC: <strong className="text-slate-800">{koc.bookingPic || 'Chưa gán'}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Legal Status & OCR Verified */}
                    <td className="py-3 px-4">
                      {hasCccd ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold border ${
                              isCompanyOcr 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {koc.isOcrVerified 
                                ? (isCompanyOcr ? 'ĐKKD (OCR)' : 'CCCD (OCR)') 
                                : 'CCCD Hợp Lệ'}
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              {koc.cccd}
                            </span>
                            <button
                              onClick={() => handleCopy(koc.cccd, koc.id)}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                              title="Sao chép số định danh"
                            >
                              {copiedKey === koc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <span className="text-2xs text-slate-500 block truncate max-w-xs" title={koc.permanentAddress || koc.shippingAddress}>
                            {koc.permanentAddress || koc.shippingAddress || 'Hà Nội'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            Thiếu CCCD
                          </span>
                          <button
                            onClick={() => {
                              setOcrTargetKoc(koc);
                              setIsOcrModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Quét CCCD bằng OCR cho KOC này"
                          >
                            <Camera className="w-3 h-3" />
                            Quét OCR
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Bank Account */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <span className="font-mono font-semibold text-xs text-slate-900 block">
                          {koc.bankAccount || 'Chưa cập nhật'}
                        </span>
                        <span className="text-2xs text-slate-500 block">
                          {koc.bankName || 'Ngân hàng'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick View Profile */}
                        <button
                          onClick={() => setInspectedKoc(koc)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Xem toàn bộ hồ sơ 360 độ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* OCR Update Button */}
                        <button
                          onClick={() => {
                            setOcrTargetKoc(koc);
                            setIsOcrModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition cursor-pointer"
                          title="Bóc tách OCR CCCD / ĐKKD để cập nhật hồ sơ"
                        >
                          <Sparkles className="w-4 h-4 text-cyan-600" />
                        </button>

                        {/* Quick Book */}
                        <button
                          onClick={() => onOpenQuickBookWithKoc(koc)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Lên Deal
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredKocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Không tìm thấy KOC nào khớp với điều kiện lọc.</p>
          </div>
        ) : (
          /* Pagination Controls Footer */
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 text-2xs">
              Hiển thị <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredKocs.length)}</strong> trong tổng số <strong className="text-slate-800">{filteredKocs.length}</strong> KOC
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium text-xs transition"
              >
                Trang trước
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum = idx + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = Math.min(currentPage - 2 + idx, totalPages - 4 + idx);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                        currentPage === pageNum
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium text-xs transition"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Embedded OCR Modal */}
      <LegalOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => {
          setIsOcrModalOpen(false);
          setOcrTargetKoc(null);
        }}
        onApplyToContract={handleApplyOcrResult}
        initialPreset={ocrTargetKoc ? 'CCCD_INDIVIDUAL' : 'CCCD_INDIVIDUAL'}
      />

      {/* KOC Profile Inspector Modal */}
      <KocProfileModal
        isOpen={!!inspectedKoc}
        onClose={() => setInspectedKoc(null)}
        koc={inspectedKoc}
        onOpenQuickBook={(k) => {
          setInspectedKoc(null);
          onOpenQuickBookWithKoc(k);
        }}
      />

      {/* Create KOC Modal */}
      <CreateKocModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onKocCreated={(newK) => {
          setLocalKocs(prev => [newK, ...prev]);
          if (onKocCreated) onKocCreated(newK);
          setIsCreateModalOpen(false);
        }}
      />

    </div>
  );
};
