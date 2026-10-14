'use client';

import React, { useState, useMemo } from 'react';
import { Avatar, Presence } from '../ui';
import { PartnerDiscussion } from '../PartnerDiscussion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  Briefcase,
  History as HistoryIcon,
  Video,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Play,
  Check,
  X,
  DollarSign,
  ArrowRight,
  Layers,
  RefreshCw,
  Send,
  Building,
  Truck,
  MessageSquare,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import {
  KocItem,
  BookingDealItem,
  UserProfile,
  BrandDetail
} from '../../lib/types';
import { INITIAL_KOCS, INITIAL_DEALS } from '../../lib/mockData';
import { formatVndShort } from '../../lib/format';

interface KocKolHubViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  initialKocs?: KocItem[];
  initialDeals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToBrandHub?: () => void;
  onNavigateToCtvHub?: () => void;
}

export const KocKolHubView: React.FC<KocKolHubViewProps> = (props) => {
  const kocs = props.initialKocs || INITIAL_KOCS;
  if (props.currentUser?.role === 'KOC_PARTNER') {
    const own = kocs.filter(k => k.id === props.currentUser?.linkedEntityId);
    if (!own.length) return <div className="rounded-xl border bg-white p-6 text-sm">Chưa có hồ sơ KOC được liên kết với tài khoản của bạn.</div>;
    return <KocKolWorkspace key={props.currentUser.id} {...props} initialKocs={own} initialDeals={(props.initialDeals || INITIAL_DEALS).filter(d => d.kocId === own[0].id)} />;
  }
  if (!kocs.length) return <div className="rounded-xl border bg-white p-6 text-sm">Chưa có hồ sơ KOC.</div>;
  return <KocKolWorkspace key={props.currentUser?.id || 'guest'} {...props} />;
};
const KocKolWorkspace: React.FC<KocKolHubViewProps> = ({
  currentUser,
  initialKocs = INITIAL_KOCS,
  initialDeals = INITIAL_DEALS,
  onNotify,
  onNavigateToBrandHub,
  onNavigateToCtvHub
}) => {
  // Phân quyền: KOC Partner chỉ xem được KOC của họ, Quản lý/Trưởng phòng/Nhân viên có Bảng Giám Sát Toàn Mạng Lưới
  const isKocPartner = currentUser?.role === 'KOC_PARTNER';
  const isManagerOrStaff = !isKocPartner;

  // Chế độ xem: 'NETWORK_COCKPIT' (Toàn cảnh mạng lưới KOC) | 'KOC_PORTAL' (Giao diện KOC đơn lẻ)
  const [viewMode, setViewMode] = useState<'NETWORK_COCKPIT' | 'KOC_PORTAL'>(
    isKocPartner ? 'KOC_PORTAL' : 'NETWORK_COCKPIT'
  );

  // Bộ lọc đa chiều cho Quản lý & Trưởng phòng
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterSalaryGrade, setFilterSalaryGrade] = useState('ALL');
  const [filterTepKenh, setFilterTepKenh] = useState('ALL');
  const [filterPic, setFilterPic] = useState('ALL');
  const [cockpitPage, setCockpitPage] = useState(1);
  const COCKPIT_PAGE_SIZE = 12;

  // Danh sách các Brand & PIC & Tệp kênh duy nhất từ initialKocs
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    initialKocs.forEach(k => {
      if (k.brandName) set.add(k.brandName);
    });
    return Array.from(set).sort();
  }, [initialKocs]);

  const availablePics = useMemo(() => {
    const set = new Set<string>();
    initialKocs.forEach(k => {
      if (k.bookingPic) set.add(k.bookingPic);
    });
    return Array.from(set).sort();
  }, [initialKocs]);

  const availableTepKenhs = useMemo(() => {
    const set = new Set<string>();
    initialKocs.forEach(k => {
      if (k.tepKenh) set.add(k.tepKenh);
    });
    return Array.from(set).sort();
  }, [initialKocs]);

  // Lọc KOC theo các tiêu chí đa chiều
  const filteredKocs = useMemo(() => {
    return initialKocs.filter(k => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = k.stageName.toLowerCase().includes(q);
        const matchChannel = (k.channelId || '').toLowerCase().includes(q);
        const matchReal = (k.realName || '').toLowerCase().includes(q);
        const matchPhone = (k.phone || '').includes(q);
        if (!matchName && !matchChannel && !matchReal && !matchPhone) return false;
      }
      if (filterBrand !== 'ALL') {
        const b = filterBrand.toLowerCase();
        const matchBrand = (k.brandName || '').toLowerCase().includes(b);
        if (!matchBrand) return false;
      }
      if (filterTier !== 'ALL' && k.tier !== filterTier) return false;
      if (filterSalaryGrade !== 'ALL' && k.salaryGrade !== filterSalaryGrade) return false;
      if (filterTepKenh !== 'ALL' && k.tepKenh !== filterTepKenh) return false;
      if (filterPic !== 'ALL' && k.bookingPic !== filterPic) return false;
      return true;
    });
  }, [initialKocs, searchQuery, filterBrand, filterTier, filterSalaryGrade, filterTepKenh, filterPic]);

  // Phân trang danh bạ giám sát
  const totalCockpitPages = Math.max(1, Math.ceil(filteredKocs.length / COCKPIT_PAGE_SIZE));
  const paginatedKocs = useMemo(() => {
    const start = (cockpitPage - 1) * COCKPIT_PAGE_SIZE;
    return filteredKocs.slice(start, start + COCKPIT_PAGE_SIZE);
  }, [filteredKocs, cockpitPage]);

  // Local Deals State for active KOC
  const [deals, setDeals] = useState<BookingDealItem[]>(initialDeals);

  // Thống kê toàn mạng lưới KOC cho Quản lý & Trưởng phòng
  const networkStats = useMemo(() => {
    const totalKocs = initialKocs.length;
    const activeDeals = deals.filter(d => d.status !== 'CANCELLED');
    const pendingSamples = deals.filter(d => d.sampleStatus === 'ĐANG_GIAO' || d.sampleStatus === 'CHƯA_GỬI').length;
    const pendingReviews = deals.filter(d => d.status === 'SCRIPT_PENDING' || d.status === 'VIDEO_SUBMITTED').length;
    const totalCastValue = activeDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const totalGmvEstimate = activeDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0);
    return { totalKocs, activeDealsCount: activeDeals.length, pendingSamples, pendingReviews, totalCastValue, totalGmvEstimate };
  }, [initialKocs, deals]);


  // Simulator State: Active KOC profile currently being simulated
  const [selectedKocId, setSelectedKocId] = useState<string>(initialKocs[0]?.id || 'koc-1');
  const activeKoc = useMemo(() => {
    return initialKocs.find(k => k.id === selectedKocId) || initialKocs[0];
  }, [initialKocs, selectedKocId]);

  // The 5 Universal Enterprise Hub Tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'DISCUSSION' | 'HISTORY'>('OVERVIEW');
  const [activeJobsSubTab, setActiveJobsSubTab] = useState<'DEALS' | 'SAMPLES' | 'SUBMISSION'>('DEALS');

  const currentKocDeals = useMemo(() => deals.filter(d => d.kocId === activeKoc.id), [deals, activeKoc.id]);

  // Modals state
  const [negotiatingDeal, setNegotiatingDeal] = useState<BookingDealItem | null>(null);
  const [counterRate, setCounterRate] = useState<number>(activeKoc.rateCardVideo || 3000000);
  const [counterNote, setCounterNote] = useState<string>('');

  const [rejectingDeal, setRejectingDeal] = useState<BookingDealItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Lệch định hướng kênh / không phù hợp sản phẩm');

  const [submittingDeal, setSubmittingDeal] = useState<BookingDealItem | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    videoUrl: '',
    sparkAdsCode: '',
    scriptUrl: '',
    notes: ''
  });

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    recipient: activeKoc.realName || activeKoc.stageName,
    phone: activeKoc.phone || '0987654321',
    address: activeKoc.shippingAddress || 'Số 18 Tam Trinh, Hoàng Mai, Hà Nội'
  });

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  // Pending approvals count for KOC Action Center
  const pendingActionCount = useMemo(() => {
    const pendingOffers = currentKocDeals.filter(d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') || d.status === 'CONTACTING').length;
    const pendingSamples = currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO').length;
    const pendingSubmissions = currentKocDeals.filter(d => d.status === 'SAMPLE_RECEIVED' || !d.sparkAdsCode).length;
    return pendingOffers + pendingSamples + (pendingSubmissions > 0 ? 1 : 0);
  }, [currentKocDeals]);

  // KPIs for Active KOC
  const stats = useMemo(() => {
    const totalJobs = currentKocDeals.length;
    const acceptedJobs = currentKocDeals.filter(d => d.kocResponseStatus === 'ĐỒNG_Ý' || (d.status !== 'CONTACTING' && d.status !== 'CANCELLED')).length;
    const pendingSamples = currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO' || d.sampleStatus === 'CHƯA_GỬI').length;
    const totalEarnings = currentKocDeals.reduce((sum, d) => sum + (d.totalValue || 3000000), 0);
    const totalGmv = currentKocDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 25000000), 0);
    return { totalJobs, acceptedJobs, pendingSamples, totalEarnings, totalGmv };
  }, [currentKocDeals]);

  // Actions
  const handleAcceptDeal = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      kocResponseStatus: 'ĐỒNG_Ý',
      status: 'SCRIPT_PENDING',
      statusLabel: 'KOC Đã Đồng Ý Hợp Tác',
      pipelineText: 'Chờ gửi hàng mẫu'
    } : d));
    notify(`KOC [${activeKoc.stageName}] đã đồng ý nhận Job! Hậu cần sẽ gửi mẫu trong 24h.`);
  };

  const handleNegotiateDeal = () => {
    if (!negotiatingDeal) return;
    setDeals(prev => prev.map(d => d.id === negotiatingDeal.id ? {
      ...d,
      kocResponseStatus: 'ĐANG_THƯƠNG_LƯỢNG',
      totalValue: counterRate,
      statusLabel: 'KOC Đang Đề Xuất Mức Cast',
      holdingReason: `KOC đề xuất cast: ${formatVndShort(counterRate)} - ${counterNote}`
    } : d));
    notify(`Đã gửi đề xuất mức cast [${formatVndShort(counterRate)}] tới Account PIC!`);
    setNegotiatingDeal(null);
  };

  const handleRejectDeal = () => {
    if (!rejectingDeal) return;
    setDeals(prev => prev.map(d => d.id === rejectingDeal.id ? {
      ...d,
      kocResponseStatus: 'TỪ_CHỐI',
      status: 'CANCELLED',
      statusLabel: 'KOC Đã Từ Chối Job',
      holdingReason: `Lý do KOC từ chối: ${rejectReason}`
    } : d));
    notify(`Đã thông báo từ chối Job tới Brand & Account PIC!`, 'warning');
    setRejectingDeal(null);
  };

  const handleConfirmReceivedSample = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      sampleStatus: 'ĐÃ_NHẬN',
      slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pipelineText: 'Đã nhận mẫu - SLA 5 ngày nộp video'
    } : d));
    notify(`Đã xác nhận nhận mẫu! SLA 5 ngày nộp video nháp bắt đầu tính từ hôm nay.`);
  };

  const handleSubmitVideoDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingDeal || !submissionForm.videoUrl.trim()) {
      notify('Vui lòng nhập link video demo!', 'warning');
      return;
    }

    setDeals(prev => prev.map(d => d.id === submittingDeal.id ? {
      ...d,
      tiktokVideoUrl: submissionForm.videoUrl.trim(),
      sparkAdsCode: submissionForm.sparkAdsCode.trim() || d.sparkAdsCode,
      adsCodeStatus: submissionForm.sparkAdsCode.trim() ? 'ĐÃ_NGHIỆM_THU' : d.adsCodeStatus,
      status: 'VIDEO_SUBMITTED',
      statusLabel: 'Đã nộp Video Nháp (Chờ Brand duyệt)',
      pipelineText: 'Chờ nghiệm thu video'
    } : d));

    notify(`Đã nộp video demo cho chiến dịch [${submittingDeal.campaignTitle}]!`);
    setSubmittingDeal(null);
    setSubmissionForm({ videoUrl: '', sparkAdsCode: '', scriptUrl: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 0. ENTERPRISE FILTER & ROLE-AWARE COCKPIT CONTROLLER */}
      {/* Dành cho Quản lý & Trưởng phòng bao quát 125+ KOC đa nhãn hàng */}
      {/* ========================================================================= */}
      {isManagerOrStaff && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Trung Tâm Điều Hành KOC Đối Tác</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {filteredKocs.length}/{initialKocs.length} KOC
                  </span>
                </h2>
                <p className="text-2xs text-slate-500">
                  Dành cho Quản trị, Trưởng phòng &amp; Booking Lead giám sát toàn mạng lưới KOC ngoại sàn
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('NETWORK_COCKPIT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  viewMode === 'NETWORK_COCKPIT'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Giám Sát Mạng Lưới KOC</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('KOC_PORTAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  viewMode === 'KOC_PORTAL'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cổng KOC Đang Chọn ({activeKoc.stageName})</span>
              </button>
            </div>
          </div>

          {/* Multi-dimensional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* Search query */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, kênh @, SĐT..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Brand */}
            <div>
              <select
                value={filterBrand}
                onChange={(e) => {
                  setFilterBrand(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Tất cả nhãn hàng</option>
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Filter Tier */}
            <div>
              <select
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Tất cả Cấp bậc (Tier)</option>
                <option value="TIER_1_CELEB">Mega / Celeb (&gt;1M)</option>
                <option value="TIER_2_MACRO">Macro (250K - 1M)</option>
                <option value="TIER_3_MICRO">Micro (50K - 250K)</option>
                <option value="TIER_4_NANO">Nano (&lt;50K)</option>
              </select>
            </div>

            {/* Filter Salary Grade */}
            <div>
              <select
                value={filterSalaryGrade}
                onChange={(e) => {
                  setFilterSalaryGrade(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Tất cả Khung lương (KL)</option>
                <option value="KL1">KL1 (&lt; 1 Triệu)</option>
                <option value="KL2">KL2 (1 - 3 Triệu)</option>
                <option value="KL3">KL3 (3 - 6 Triệu)</option>
                <option value="KL4">KL4 (6 - 10 Triệu)</option>
                <option value="KL5">KL5 (10 - 18 Triệu)</option>
                <option value="KL6">KL6 (18 - 35 Triệu)</option>
                <option value="KL7">KL7 (&gt; 35 Triệu)</option>
              </select>
            </div>

            {/* Filter Tệp kênh */}
            <div>
              <select
                value={filterTepKenh}
                onChange={(e) => {
                  setFilterTepKenh(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 truncate"
              >
                <option value="ALL">Tất cả Tệp kênh</option>
                {availableTepKenhs.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filter PIC */}
            <div className="flex items-center gap-1.5">
              <select
                value={filterPic}
                onChange={(e) => {
                  setFilterPic(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 truncate"
              >
                <option value="ALL">Tất cả PIC Booking</option>
                {availablePics.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {(searchQuery || filterBrand !== 'ALL' || filterTier !== 'ALL' || filterSalaryGrade !== 'ALL' || filterTepKenh !== 'ALL' || filterPic !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterBrand('ALL');
                    setFilterTier('ALL');
                    setFilterSalaryGrade('ALL');
                    setFilterTepKenh('ALL');
                    setFilterPic('ALL');
                    setCockpitPage(1);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition shrink-0"
                  title="Xóa bộ lọc"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VIEW MODE: NETWORK COCKPIT (BẢNG GIÁM SÁT TOÀN MẠNG LƯỚI KOC ĐỐI TÁC) */}
      {/* ========================================================================= */}
      {viewMode === 'NETWORK_COCKPIT' && isManagerOrStaff ? (
        <div className="space-y-6">
          {/* KPI Cards Mạng Lưới KOC */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Mạng Lưới KOC Hợp Tác</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-semibold text-slate-900 tracking-tight">
                {filteredKocs.length} <span className="text-xs font-normal text-slate-500">/ {initialKocs.length} KOC</span>
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                Chuẩn hóa 4 Tier &amp; 7 Khung lương KL1-KL7
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Hợp Đồng Booking Active</span>
                <Briefcase className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-semibold text-emerald-700 tracking-tight">
                {networkStats.activeDealsCount} <span className="text-xs font-normal text-slate-500">deals</span>
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                Đang vận hành trên các chiến dịch nhãn hàng
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Hàng Mẫu &amp; Video Đang Chạy</span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-semibold text-amber-700 tracking-tight">
                {networkStats.pendingSamples} <span className="text-xs font-normal text-slate-500">mẫu</span> • {networkStats.pendingReviews} <span className="text-xs font-normal text-slate-500">video chờ</span>
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                SLA 5 ngày sau nhận mẫu để nộp video nháp
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Tổng GMV Dự Kiến 30 Ngày</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-semibold text-blue-700 tracking-tight">
                {formatVndShort(networkStats.totalGmvEstimate)}
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                Tổng ngân sách cast: <strong className="text-slate-700 font-mono">{formatVndShort(networkStats.totalCastValue)}</strong>
              </p>
            </div>
          </div>

          {/* Bảng Danh Sách Giám Sát KOC Đối Tác */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Danh Bạ Mạng Lưới KOC Đối Tác ({filteredKocs.length} KOC)
                </h3>
                <p className="text-2xs text-slate-500">
                  Bấm &quot;Mở Hub KOC Này&quot; để chuyển sang giao diện đối tác của KOC đó để kiểm tra lời mời, kịch bản và chat
                </p>
              </div>

              {/* Pagination controls top */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-2xs">
                  Trang {cockpitPage}/{totalCockpitPages}
                </span>
                <button
                  type="button"
                  disabled={cockpitPage <= 1}
                  onClick={() => setCockpitPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={cockpitPage >= totalCockpitPages}
                  onClick={() => setCockpitPage(prev => Math.min(totalCockpitPages, prev + 1))}
                  className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-500 ">
                    <th className="py-3 px-4">KOC / Creator</th>
                    <th className="py-3 px-3">Cấp Bậc &amp; Cast Chuẩn</th>
                    <th className="py-3 px-3">Tệp Kênh</th>
                    <th className="py-3 px-3">Nhãn Hàng Hợp Tác</th>
                    <th className="py-3 px-3">PIC Booking</th>
                    <th className="py-3 px-3">Hồ Sơ &amp; Pháp Lý</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedKocs.map((koc) => {
                    const kocDealsCount = deals.filter(d => d.kocId === koc.id || d.kocStageName === koc.stageName).length;
                    return (
                      <tr key={koc.id} className="hover:bg-slate-50/60 transition group">
                        {/* KOC Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={koc.stageName} size={36} />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                                <span>{koc.stageName}</span>
                                {koc.realName && (
                                  <span className="text-2xs font-normal text-slate-400">({koc.realName})</span>
                                )}
                              </div>
                              <div className="text-2xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                                <span>@{koc.channelId}</span>
                                <span>•</span>
                                <span>{(koc.followers / 1000).toFixed(0)}K flw</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tier & Cast */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {koc.tierLabel || koc.tier}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                                {koc.salaryGrade}
                              </span>
                            </div>
                            <div className="text-2xs text-slate-600 font-mono font-semibold">
                              {formatVndShort(koc.rateCardVideo || 3000000)}
                            </div>
                          </div>
                        </td>

                        {/* Tệp kênh */}
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-2xs font-medium">
                            {koc.tepKenh || 'Beauty & Skincare'}
                          </span>
                        </td>

                        {/* Nhãn hàng hợp tác */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {koc.brandName || 'Kutieskin'}
                            </span>
                            {kocDealsCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700">
                                {kocDealsCount} deal
                              </span>
                            )}
                          </div>
                        </td>

                        {/* PIC Booking */}
                        <td className="py-3 px-3">
                          <div className="text-2xs text-slate-700 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{koc.bookingPic || 'Khánh Vy'}</span>
                          </div>
                        </td>

                        {/* Hồ sơ & Pháp lý */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 text-2xs">
                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                              <ShieldCheck className="w-3 h-3" />
                              <span>CCCD: {koc.cccd ? 'Đã xác thực' : 'Chưa có'}</span>
                            </div>
                            <div className="text-slate-500 font-mono">
                              MST: {koc.taxCode || '0315894125'}
                            </div>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKocId(koc.id);
                              setViewMode('KOC_PORTAL');
                              notify(`Đang mở Cổng KOC: ${koc.stageName}`, 'info');
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-2xs font-semibold transition flex items-center gap-1 ml-auto"
                          >
                            <span>Mở cổng KOC</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 text-2xs">
                Hiển thị {paginatedKocs.length} trên tổng số {filteredKocs.length} KOC phù hợp bộ lọc
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={cockpitPage <= 1}
                  onClick={() => setCockpitPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-2xs font-semibold disabled:opacity-40 transition"
                >
                  Trang Trước
                </button>
                {Array.from({ length: Math.min(5, totalCockpitPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCockpitPage(p)}
                      className={`w-7 h-7 rounded-md text-2xs font-semibold transition ${
                        cockpitPage === p
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={cockpitPage >= totalCockpitPages}
                  onClick={() => setCockpitPage(prev => Math.min(totalCockpitPages, prev + 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-2xs font-semibold disabled:opacity-40 transition"
                >
                  Trang Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. VIEW MODE: KOC DEDICATED PORTAL (CỔNG KOC ĐANG CHỌN) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Breadcrumb banner quay lại Bảng Giám Sát Mạng Lưới */}
          {isManagerOrStaff && (
            <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 px-4 py-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('NETWORK_COCKPIT')}
                  className="font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại Bảng Giám Sát Mạng Lưới ({filteredKocs.length} KOC)</span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">Đang mô phỏng giao diện đối tác KOC: <strong className="text-slate-900">{activeKoc.stageName}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-2xs text-slate-500 hidden sm:inline">Chuyển KOC khác:</span>
                <select
                  value={selectedKocId}
                  onChange={(e) => setSelectedKocId(e.target.value)}
                  className="bg-white border border-blue-200 text-blue-900 font-semibold text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {filteredKocs.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.stageName} ({k.tierLabel || k.tier})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

      {/* ========================================================================= */}
      {/* 1. SLEEK ENTERPRISE HEADER */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <Avatar name={activeKoc.stageName} size={44} />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  {activeKoc.stageName}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {activeKoc.tierLabel || activeKoc.tier}
                </span>
                <span className="font-mono text-2xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  @{activeKoc.channelId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cast chuẩn: <strong className="text-slate-800 font-mono">{formatVndShort(activeKoc.rateCardVideo || 3000000)}</strong> • Followers: <strong className="text-slate-800 font-mono">{(activeKoc.followers / 1000).toFixed(0)}K</strong> • Địa chỉ nhận mẫu: <span className="text-slate-700">{addressForm.address}</span> (<button onClick={() => setEditingAddress(true)} className="text-blue-600 hover:underline">Sửa</button>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* KOC Simulator Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedKocId}
                onChange={(e) => setSelectedKocId(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                {initialKocs.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.stageName} ({k.tierLabel || k.tier})
                  </option>
                ))}
              </select>
            </div>

            {onNavigateToBrandHub && (
              <button
                type="button"
                onClick={onNavigateToBrandHub}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                title="Chuyển sang Cổng Brand"
              >
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Cổng Brand</span>
              </button>
            )}

            {onNavigateToCtvHub && (
              <button
                type="button"
                onClick={onNavigateToCtvHub}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                title="Chuyển sang Kênh CTV"
              >
                <Video className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kênh CTV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MINIMALIST SEGMENTED TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APPROVALS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'APPROVALS'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Cần xác nhận &amp; Duyệt</span>
          {pendingActionCount > 0 && (
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
              activeTab === 'APPROVALS' ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
            }`}>
              {pendingActionCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE_JOBS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ACTIVE_JOBS'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Các job đang làm ({currentKocDeals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISCUSSION')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DISCUSSION'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Trao đổi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>Lịch sử &amp; Quyết toán</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 Clean Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Lời mời Job &amp; Hợp tác</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-slate-900">{stats.totalJobs}</span>
                <span className="text-2xs text-emerald-600 font-medium">{stats.acceptedJobs} đã chốt</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">Chiến dịch tháng 10/2026</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Hàng mẫu đang giao</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-amber-600">{stats.pendingSamples} kiện</span>
                <span className="text-2xs text-slate-400">GHN / GHTK</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">Giao đến: {addressForm.address.slice(0, 24)}...</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Thù lao Cast dự kiến</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-emerald-600">{formatVndShort(stats.totalEarnings)}</span>
                <span className="text-2xs text-slate-400">Chưa gồm hoa hồng</span>
              </div>
              <span className="text-2xs text-emerald-600 mt-0.5 block">+15% hoa hồng Affiliate</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 ">Doanh số GMV tạo ra</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-semibold font-mono text-blue-600">{formatVndShort(stats.totalGmv)}</span>
                <span className="text-2xs text-blue-600 font-medium">Top Creator</span>
              </div>
              <span className="text-2xs text-slate-400 mt-0.5 block">Đóng góp cho Brand</span>
            </div>
          </div>

          {/* Profile & SLA Health Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Chỉ Số Tín Nhiệm &amp; Cam Kết Vận Hành KOC
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-2xs">Điểm đánh giá uy tín:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-base font-semibold text-amber-500 font-mono">5.0 / 5.0</span>
                  <div className="flex text-amber-400 text-xs"></div>
                </div>
                <p className="text-2xs text-slate-400 mt-1">Dựa trên 18 chiến dịch hợp tác gần nhất</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-2xs">Tỷ lệ lên video đúng hạn (SLA):</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-base font-semibold text-emerald-600 font-mono">96.8%</span>
                </div>
                <p className="text-2xs text-slate-400 mt-1">Cam kết trả bài nháp trong vòng 3 ngày sau nhận mẫu</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-2xs">Trạng thái hồ sơ &amp; thuế:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-base font-semibold text-blue-600 font-mono">Đã xác thực</span>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xs text-slate-400 mt-1">Đã nạp CCCD &amp; Mã số thuế TNCN</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN XÁC NHẬN & PHÊ DUYỆT (ACTION CENTER) */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {pendingActionCount === 0 && (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Tất cả các mục đã được xác nhận hoàn tất!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Không còn lời mời mới hay kiện hàng nào chờ check-in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE_JOBS')}
                className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <span>Xem công việc đang chạy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {pendingActionCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 ">
                    Hộp Việc Cần Xác Nhận &amp; Phản Hồi ({pendingActionCount} mục)
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Xác nhận nhận job, check-in nhận hàng mẫu hoặc gửi mã Spark Ads
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Pending Offers */}
                {currentKocDeals.filter(d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') || d.status === 'CONTACTING').map(deal => (
                  <div key={deal.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">{deal.campaignTitle}</span>
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700">
                            {deal.brandName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sản phẩm: <span className="text-slate-800 font-medium">{deal.productName}</span> • Mức cast: <strong className="text-emerald-700 font-mono text-sm">{formatVndShort(deal.totalValue || 3000000)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleAcceptDeal(deal.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-2xs"
                      >
                        Đồng Ý Nhận Job
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNegotiatingDeal(deal);
                          setCounterRate(deal.totalValue || activeKoc.rateCardVideo || 3000000);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition"
                      >
                        Đề Xuất Cast
                      </button>
                    </div>
                  </div>
                ))}

                {/* 2. Pending Samples */}
                {currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO').map(deal => (
                  <div key={deal.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">Kiện hàng mẫu: {deal.productName || 'Combo sản phẩm'}</span>
                          <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{deal.jobId || 'GHN-89421'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nhãn hàng: <strong>{deal.brandName}</strong> • Giao đến: {addressForm.address}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, sampleStatus: 'ĐÃ_NHẬN', pipelineText: 'Đã nhận mẫu - Đang quay video' } : d));
                        notify('Đã xác nhận nhận mẫu! Hệ thống chuyển sang giai đoạn quay video nháp.');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-2xs shrink-0 self-end sm:self-auto"
                    >
                      <Check className="w-3.5 h-3.5 inline mr-1" />
                      Xác Nhận Đã Nhận Mẫu
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÁC JOB ĐANG LÀM (ACTIVE JOBS) */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 w-fit text-xs">
            <button
              type="button"
              onClick={() => setActiveJobsSubTab('DEALS')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeJobsSubTab === 'DEALS' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Danh sách Deals ({currentKocDeals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveJobsSubTab('SAMPLES')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeJobsSubTab === 'SAMPLES' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hàng mẫu ({stats.pendingSamples})
            </button>
            <button
              type="button"
              onClick={() => setActiveJobsSubTab('SUBMISSION')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeJobsSubTab === 'SUBMISSION' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nộp Video &amp; Spark Ads
            </button>
          </div>

          {activeJobsSubTab === 'DEALS' && (
            <div className="space-y-3">
              {currentKocDeals.map(deal => {
                const isAccepted = deal.kocResponseStatus === 'ĐỒNG_Ý' || (deal.status !== 'CONTACTING' && deal.status !== 'CANCELLED');
                const isNegotiating = deal.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG';
                const isRejected = deal.kocResponseStatus === 'TỪ_CHỐI' || deal.status === 'CANCELLED';

                return (
                  <div
                    key={deal.id}
                    className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-2xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {deal.dealCode || deal.jobId || 'DEAL-KOC'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700">
                          {deal.brandName}
                        </span>
                        {isAccepted ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700">
                            Đã xác nhận hợp tác
                          </span>
                        ) : isNegotiating ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700">
                            Đang đàm phán mức cast
                          </span>
                        ) : isRejected ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-500">
                            Đã từ chối
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700">
                            Chờ xác nhận
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900">{deal.campaignTitle}</h3>

                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>Sản phẩm: <strong className="text-slate-700">{deal.productName || 'Combo sản phẩm'}</strong></span>
                        <span>•</span>
                        <span>Trụ cột: <strong className="text-blue-600">{deal.contentPillar || 'Review thực tế'}</strong></span>
                        <span>•</span>
                        <span>Hạn air: <strong className="text-slate-700 font-mono">{deal.slaDeadline || '2026-10-25'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 shrink-0 justify-between md:justify-end">
                      <div className="text-right">
                        <div className="text-2xs text-slate-400 font-semibold ">Thù lao Cast</div>
                        <div className="text-base font-semibold font-mono text-emerald-600">
                          {formatVndShort(deal.totalValue || 3000000)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isAccepted && !isRejected && (
                          <button
                            type="button"
                            onClick={() => handleAcceptDeal(deal.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition shadow-2xs"
                          >
                            Nhận Job
                          </button>
                        )}

                        {isAccepted && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittingDeal(deal);
                              setActiveJobsSubTab('SUBMISSION');
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Nộp Video nháp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeJobsSubTab === 'SAMPLES' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 font-medium text-2xs">
                    <tr>
                      <th className="py-2.5 px-4">Chiến dịch &amp; Sản phẩm</th>
                      <th className="py-2.5 px-4">Nhãn hàng</th>
                      <th className="py-2.5 px-4">Mã vận đơn</th>
                      <th className="py-2.5 px-4 text-center">Trạng thái</th>
                      <th className="py-2.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentKocDeals.map(d => {
                      const isReceived = d.sampleStatus === 'ĐÃ_NHẬN';
                      const trackingCode = `GHTK-${d.id.slice(-6).toUpperCase()}`;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{d.productName || 'Bộ Kit Trải Nghiệm'}</div>
                            <div className="text-2xs text-slate-400">{d.campaignTitle}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{d.brandName}</td>
                          <td className="py-3 px-4 font-mono text-2xs text-blue-600 font-semibold">
                            {trackingCode}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isReceived ? (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700">
                                Đã nhận hàng
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700">
                                Đang giao hàng
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isReceived ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmReceivedSample(d.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-2xs font-semibold transition"
                              >
                                Đã nhận được hàng
                              </button>
                            ) : (
                              <span className="text-2xs text-slate-400">Đã kích hoạt</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeJobsSubTab === 'SUBMISSION' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-semibold text-slate-900 mb-1">Cổng Nộp Video Nghiệm Thu &amp; Mã Spark Ads</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Đăng tải video bản nháp (1080p) và cung cấp mã ủy quyền Spark Ads 30 ngày để Brand chạy Ads.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentKocDeals.map(d => (
                    <div key={d.id} className="border border-slate-100 rounded-xl p-3.5 space-y-2 bg-slate-50/50 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{d.brandName}</span>
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                          d.tiktokVideoUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {d.tiktokVideoUrl ? 'Đã nộp video' : 'Chưa nộp video'}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900">{d.productName || d.campaignTitle}</div>

                      {d.tiktokVideoUrl && (
                        <div className="text-2xs font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 truncate">
                          Link: <a href={d.tiktokVideoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{d.tiktokVideoUrl}</a>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSubmittingDeal(d);
                          setSubmissionForm({
                            videoUrl: d.tiktokVideoUrl || '',
                            sparkAdsCode: d.sparkAdsCode || '',
                            scriptUrl: '',
                            notes: ''
                          });
                        }}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {d.tiktokVideoUrl ? 'Cập nhật lại video / mã Ads' : 'Nộp video & mã Spark Ads'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRAO ĐỔI (TWO-WAY DISCUSSION) */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <PartnerDiscussion family="KOC" root={`koc:${activeKoc.id}`} actorId={currentUser?.id || 'guest'} />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ & QUYẾT TOÁN (HISTORY) */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank Card */}
            <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="text-2xs text-slate-400 font-medium">Tài khoản nhận thù lao</div>
                <div className="text-sm font-semibold mt-1 text-slate-100">{activeKoc.bankName || 'MB Bank'}</div>
                <div className="text-base font-mono font-semibold mt-0.5 text-emerald-400">
                  {activeKoc.bankAccount || '999988886666'}
                </div>
                <div className="text-2xs text-slate-400 mt-1 ">
                  Chủ TK: {activeKoc.realName || activeKoc.stageName}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-2xs text-slate-400">
                <span>Khấu trừ thuế TNCN 10%</span>
                <QrCode className="w-4 h-4 text-slate-300" />
              </div>
            </div>

            {/* Income Summary Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs md:col-span-2 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900">Tổng Kết Thu Nhập Kỳ Này</h3>
              
              <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                <div>
                  <div className="text-2xs text-slate-400">Tổng tiền Cast hợp đồng</div>
                  <div className="text-base font-semibold font-mono text-slate-900">{formatVndShort(stats.totalEarnings)}</div>
                </div>
                <div>
                  <div className="text-2xs text-slate-400">Hoa hồng Affiliate ước tính</div>
                  <div className="text-base font-semibold font-mono text-blue-600">{formatVndShort(stats.totalGmv * 0.15)}</div>
                </div>
                <div>
                  <div className="text-2xs text-slate-400">Thực nhận sau thuế (90%)</div>
                  <div className="text-base font-semibold font-mono text-emerald-600">
                    {formatVndShort((stats.totalEarnings + stats.totalGmv * 0.15) * 0.9)}
                  </div>
                </div>
              </div>

              <div className="text-2xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Kế toán Upbase đối soát vào thứ 6 hàng tuần và giải ngân qua lệnh UNC ngân hàng.</span>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ĐÀM PHÁN GIÁ CAST */}
      {/* ========================================================================= */}
      <Presence show={!!negotiatingDeal}>
      {negotiatingDeal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Đề xuất mức thù lao Cast</h3>
              <button onClick={() => setNegotiatingDeal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Chiến dịch:</span> <strong className="text-slate-800">{negotiatingDeal.campaignTitle}</strong>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mức thù lao mong muốn (VND)</label>
                <input
                  type="number"
                  step="500000"
                  value={counterRate}
                  onChange={(e) => setCounterRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú gửi Account Upbase</label>
                <textarea
                  rows={3}
                  placeholder="Lý do đề xuất..."
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNegotiatingDeal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleNegotiateDeal}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
              >
                Gửi đề xuất
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL: TỪ CHỐI JOB */}
      {/* ========================================================================= */}
      <Presence show={!!rejectingDeal}>
      {rejectingDeal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Từ chối lời mời hợp tác</h3>
              <button onClick={() => setRejectingDeal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Chọn lý do để Upbase cập nhật hồ sơ và không gửi job tương tự làm phiền bạn:
              </p>

              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs focus:outline-none"
              >
                <option value="Lệch định hướng kênh / không phù hợp sản phẩm">Lệch định hướng kênh / không phù hợp sản phẩm</option>
                <option value="Đã kẹt lịch air / không kịp timeline tháng này">Đã kẹt lịch air / không kịp timeline tháng này</option>
                <option value="Xung đột hợp đồng độc quyền với đối thủ nhãn hàng">Xung đột hợp đồng độc quyền với đối thủ nhãn hàng</option>
                <option value="Mức cast chưa phù hợp với yêu cầu sản xuất">Mức cast chưa phù hợp với yêu cầu sản xuất</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingDeal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleRejectDeal}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL: NỘP VIDEO DEMO & SPARK ADS */}
      {/* ========================================================================= */}
      <Presence show={!!submittingDeal}>
      {submittingDeal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <form onSubmit={handleSubmitVideoDemo} data-motion-panel className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Nộp Video Demo &amp; Mã Spark Ads</h3>
                <p className="text-2xs text-slate-500">{submittingDeal.brandName} — {submittingDeal.productName}</p>
              </div>
              <button type="button" onClick={() => setSubmittingDeal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Link Video Demo (Google Drive / TikTok Private) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... hoặc https://vt.tiktok.com/..."
                  value={submissionForm.videoUrl}
                  onChange={(e) => setSubmissionForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mã ủy quyền Spark Ads Code (TikTok)</label>
                <input
                  type="text"
                  placeholder="VD: 7412894723984729384..."
                  value={submissionForm.sparkAdsCode}
                  onChange={(e) => setSubmissionForm(prev => ({ ...prev, sparkAdsCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-2xs text-slate-400 mt-0.5 block">Mã sinh từ mục Video Setting ➔ Ad Authorization trên TikTok.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi chú cho Brand / Content Lead</label>
                <textarea
                  rows={2}
                  placeholder="Lưu ý về góc quay, thời điểm xuất hiện sản phẩm..."
                  value={submissionForm.notes}
                  onChange={(e) => setSubmissionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubmittingDeal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                Xác nhận nộp video
              </button>
            </div>
          </form>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL: SỬA ĐỊA CHỈ NHẬN HÀNG MẪU */}
      {/* ========================================================================= */}
      <Presence show={!!editingAddress}>
      {editingAddress && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Cập nhật địa chỉ nhận hàng mẫu</h3>
              <button onClick={() => setEditingAddress(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Họ tên người nhận</label>
                <input
                  type="text"
                  value={addressForm.recipient}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, recipient: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Địa chỉ chi tiết</label>
                <textarea
                  rows={2}
                  value={addressForm.address}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAddress(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(false);
                  notify('Đã cập nhật địa chỉ giao hàng mẫu thành công!');
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
              >
                Lưu địa chỉ
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
