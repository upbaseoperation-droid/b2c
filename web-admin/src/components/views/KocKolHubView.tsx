'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Briefcase,
  History as HistoryIcon,
  Video,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Play,
  ExternalLink,
  FileText,
  Check,
  X,
  DollarSign,
  Calendar,
  ArrowRight,
  Layers,
  Award,
  ChevronDown,
  RefreshCw,
  Send,
  ThumbsUp,
  ThumbsDown,
  Building,
  Wallet,
  FileCheck,
  Package,
  Truck,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Phone,
  QrCode,
  Share2,
  Copy
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

export const KocKolHubView: React.FC<KocKolHubViewProps> = ({
  currentUser,
  brands = [],
  initialKocs = INITIAL_KOCS,
  initialDeals = INITIAL_DEALS,
  onNotify,
  onNavigateToBrandHub,
  onNavigateToCtvHub
}) => {
  // Simulator State: Active KOC profile currently being simulated
  const [selectedKocId, setSelectedKocId] = useState<string>(initialKocs[0]?.id || 'koc-1');
  const activeKoc = useMemo(() => {
    return initialKocs.find(k => k.id === selectedKocId) || initialKocs[0];
  }, [initialKocs, selectedKocId]);

  // The 5 Universal Enterprise Hub Tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'DISCUSSION' | 'HISTORY'>('OVERVIEW');
  const [activeJobsSubTab, setActiveJobsSubTab] = useState<'DEALS' | 'SAMPLES' | 'SUBMISSION'>('DEALS');

  // Discussion Chat State between KOC and Upbase Booking PIC
  const [kocChatMessages, setKocChatMessages] = useState([
    {
      id: 'kmsg-1',
      sender: 'UPBASE_BOOKING',
      senderName: 'Khánh Vy (Booking Lead Upbase)',
      time: 'Hôm qua lúc 11:20',
      content: `Chào ${activeKoc.stageName}! Team Booking vừa gửi bạn lời mời hợp tác chiến dịch mới của nhãn hàng. Hàng mẫu đã được gửi chuyển phát nhanh GHN đến bạn rồi nhé!`
    },
    {
      id: 'kmsg-2',
      sender: 'KOC',
      senderName: activeKoc.stageName,
      time: 'Hôm qua lúc 15:45',
      content: 'Dạ em vừa nhận được kiện hàng mẫu rồi chị Vy ơi! Sản phẩm đóng gói rất cẩn thận. Em sẽ lên kịch bản unboxing và test chất kem trong 2 ngày tới rồi nộp kịch bản qua tab Cần duyệt cho bên mình duyệt ạ.'
    },
    {
      id: 'kmsg-3',
      sender: 'UPBASE_BOOKING',
      senderName: 'Khánh Vy (Booking Lead Upbase)',
      time: 'Sáng nay lúc 09:30',
      content: 'Tuyệt vời em ơi! Lưu ý giúp chị là Brand muốn nhấn mạnh tính năng kiềm dầu 8 tiếng và dịu nhẹ cho da mụn nha. Cần hỗ trợ mã Spark Ads code cứ nhắn chị nhé!'
    }
  ]);
  const [newKocChatText, setNewKocChatText] = useState('');

  const handleSendKocChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKocChatText.trim()) return;

    setKocChatMessages(prev => [
      ...prev,
      {
        id: `kmsg-${Date.now()}`,
        sender: 'KOC',
        senderName: activeKoc.stageName,
        time: 'Vừa xong',
        content: newKocChatText.trim()
      }
    ]);
    setNewKocChatText('');
    notify('Đã gửi tin nhắn đến Booking PIC Upbase!');
  };

  // Local Deals State for active KOC
  const [deals, setDeals] = useState<BookingDealItem[]>(initialDeals);

  // Filter deals belonging to current KOC or generic demo deals
  const currentKocDeals = useMemo(() => {
    const matched = deals.filter(d => d.kocId === activeKoc.id || d.kocStageName === activeKoc.stageName);
    if (matched.length > 0) return matched;
    // Fallback: assign sample deals to this KOC for interactive simulation
    return deals.slice(0, 4).map(d => ({ ...d, kocId: activeKoc.id, kocStageName: activeKoc.stageName }));
  }, [deals, activeKoc]);

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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & KOC SIMULATOR SWITCHER */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Active KOC Profile Banner */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={activeKoc.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={activeKoc.stageName}
              className="w-13 h-13 rounded-full object-cover border-2 border-indigo-500/20 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{activeKoc.stageName}</h2>
              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeKoc.tierLabel || activeKoc.tier}
              </span>
              <span className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-600">
                {activeKoc.tepKenh || activeKoc.niche || 'Creator'}
              </span>
            </div>
            <div className="text-2xs text-slate-500 flex items-center gap-3 mt-1">
              <span>Họ tên: <strong className="text-slate-700">{activeKoc.realName || activeKoc.stageName}</strong></span>
              <span>•</span>
              <span>Kênh: <strong className="text-slate-700">@{activeKoc.channelId}</strong></span>
              <span>•</span>
              <span>Followers: <strong className="text-slate-700 font-mono">{(activeKoc.followers / 1000).toFixed(0)}K</strong></span>
              <span>•</span>
              <span>Cast chuẩn: <strong className="text-emerald-600 font-mono">{formatVndShort(activeKoc.rateCardVideo || 3000000)}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: KOC Simulator Switcher & Cross-Hub Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-2xs font-medium text-slate-500">Mô phỏng KOC:</span>
            <select
              value={selectedKocId}
              onChange={(e) => setSelectedKocId(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
            >
              {initialKocs.map(k => (
                <option key={k.id} value={k.id}>
                  {k.stageName} ({k.tierLabel || k.tier} - @{k.channelId})
                </option>
              ))}
            </select>
          </div>

          {onNavigateToBrandHub && (
            <button
              onClick={onNavigateToBrandHub}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Chuyển sang Cổng đối tác Brand"
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Cổng Brand</span>
            </button>
          )}

          {onNavigateToCtvHub && (
            <button
              onClick={onNavigateToCtvHub}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Chuyển sang Hub Cộng tác viên (CTV)"
            >
              <Video className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hub CTV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Lời mời Job & Hợp tác</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stats.totalJobs}</span>
            <span className="text-2xs text-slate-500">jobs</span>
          </div>
          <div className="text-2xs text-emerald-600 mt-1 font-medium">
            {stats.acceptedJobs} deal đã xác nhận hợp tác
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Hàng mẫu đang giao</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-amber-600">{stats.pendingSamples}</span>
            <span className="text-2xs text-slate-500">vận đơn</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Giao đến: {activeKoc.location || 'Hà Nội'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Thù lao Cast dự kiến</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-600">{formatVndShort(stats.totalEarnings)}</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chưa gồm hoa hồng Affiliate
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Doanh số GMV tạo ra</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-purple-600">{formatVndShort(stats.totalGmv)}</span>
          </div>
          <div className="text-2xs text-purple-600 mt-1 font-medium">
            Đóng góp vào chiến dịch nhãn hàng
          </div>
        </div>
      </div>

      {/* 3. THE 5 UNIVERSAL ENTERPRISE HUB TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APPROVALS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === 'APPROVALS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>2. Cần xác nhận &amp; Duyệt</span>
            {pendingActionCount > 0 && (
              <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'APPROVALS' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
              }`}>
                {pendingActionCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE_JOBS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ACTIVE_JOBS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>3. Các job đang làm ({currentKocDeals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DISCUSSION')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'DISCUSSION'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>4. Trao đổi qua lại</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'HISTORY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>5. Lịch sử &amp; Quyết toán</span>
          </button>
        </div>

        {/* Address badge on top right */}
        <button
          onClick={() => setEditingAddress(true)}
          className="hidden sm:flex items-center gap-1.5 text-2xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
        >
          <MapPin className="w-3 h-3 text-red-500" />
          <span className="truncate max-w-[200px]">{addressForm.address}</span>
          <span className="text-indigo-600 font-semibold underline">Sửa</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 1: TỔNG QUAN (OVERVIEW & COLLABORATION HEALTH)                       */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Hồ Sơ Hợp Tác KOC Tiêu Biểu &amp; Tỷ Lệ On-Time
              </h3>
              <span className="badge-emerald text-2xs px-2.5 py-1 rounded font-semibold">
                Đối tác Tin Cậy Của Upbase
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-2xs">Điểm đánh giá uy tín (Rating):</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-amber-500 font-mono">5.0 / 5.0</span>
                  <div className="flex text-amber-400 text-xs">★★★★★</div>
                </div>
                <p className="text-2xs text-slate-500">Dựa trên 18 chiến dịch hợp tác gần nhất</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-2xs">Tỷ lệ lên video đúng hạn (On-time SLA):</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-emerald-600 font-mono">96.8%</span>
                </div>
                <p className="text-2xs text-slate-500">Cam kết trả bài nháp trong vòng 3 ngày sau nhận mẫu</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-2xs">Trạng thái xác thực pháp lý &amp; thuế:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-blue-600 font-mono">Đã Xác Thực</span>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xs text-slate-500">Đã cập nhật CCCD &amp; Mã số thuế TNCN</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN XÁC NHẬN & PHÊ DUYỆT (ACTION CENTER)                          */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Action 1: Pending Offers */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>1. LỜI MỜI BOOKING MỚI CHỜ BẠN XÁC NHẬN ({currentKocDeals.filter(d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') || d.status === 'CONTACTING').length} deals)</span>
              <span className="text-2xs text-slate-500 font-normal">Vui lòng Chấp nhận hoặc Đề xuất cast trong 24h</span>
            </h4>

            {currentKocDeals.filter(d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') || d.status === 'CONTACTING').length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">Bạn đã phản hồi toàn bộ các lời mời booking mới.</p>
            ) : (
              <div className="space-y-3">
                {currentKocDeals.filter(d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') || d.status === 'CONTACTING').map(deal => (
                  <div key={deal.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{deal.campaignTitle}</span>
                        <span className="badge-slate text-2xs px-2 py-0.5 rounded font-semibold">{deal.brandName}</span>
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">Sản phẩm: {deal.productName} • Mức cast đề xuất: <strong className="text-emerald-700 font-mono text-sm">{formatVndShort(deal.totalValue || 3000000)}</strong></p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAcceptDeal(deal.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-2xs"
                      >
                        Đồng Ý Nhận Job
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNegotiatingDeal(deal);
                          setCounterRate(deal.totalValue || activeKoc.rateCardVideo || 3000000);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                      >
                        Đề Xuất Cast
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action 2: Sample Check-in */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>2. CHECK-IN XÁC NHẬN NHẬN HÀNG MẪU UNBOXING ({currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO').length} kiện hàng)</span>
              <span className="text-2xs text-slate-500 font-normal">Bấm xác nhận khi shipper đã giao hàng đến bạn</span>
            </h4>

            {currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO').length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">Không có kiện hàng mẫu nào đang trên đường vận chuyển.</p>
            ) : (
              <div className="space-y-3">
                {currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO').map(deal => (
                  <div key={deal.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{deal.productName || 'Kiện hàng mẫu sản phẩm'}</span>
                      <p className="text-2xs text-slate-500 mt-0.5">Nhãn hàng: <strong>{deal.brandName}</strong> • Mã vận đơn: <span className="font-mono font-semibold text-indigo-700">{deal.jobId || 'GHN-89421-HN'}</span></p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, sampleStatus: 'ĐÃ_NHẬN', pipelineText: 'Đã nhận mẫu - Đang quay video' } : d));
                        notify('Đã xác nhận nhận mẫu! Hệ thống chuyển sang giai đoạn quay video nháp.');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-2xs shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 inline mr-1" />
                      Xác Nhận Đã Nhận Mẫu
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÁC JOB ĐANG LÀM (ACTIVE JOBS)                                     */}
      {/* ========================================================================= */}
      {/* TAB 3: CÁC JOB ĐANG LÀM (ACTIVE JOBS)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveJobsSubTab('DEALS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeJobsSubTab === 'DEALS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Danh sách Deals ({currentKocDeals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveJobsSubTab('SAMPLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeJobsSubTab === 'SAMPLES' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hàng mẫu &amp; Vận đơn ({stats.pendingSamples})
            </button>
            <button
              type="button"
              onClick={() => setActiveJobsSubTab('SUBMISSION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeJobsSubTab === 'SUBMISSION' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-2xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {deal.dealCode || deal.jobId || 'DEAL-KOC'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {deal.brandName}
                    </span>
                    {deal.bookingBatch && (
                      <span className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-600">
                        {deal.bookingBatch}
                      </span>
                    )}
                    {isAccepted ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã xác nhận hợp tác
                      </span>
                    ) : isNegotiating ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Đang đàm phán mức cast
                      </span>
                    ) : isRejected ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-500">
                        Đã từ chối
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
                        Lời mời mới chờ xác nhận
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{deal.campaignTitle}</h3>

                  <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap">
                    <span>Sản phẩm: <strong className="text-slate-800">{deal.productName || 'Combo sản phẩm chủ lực'}</strong></span>
                    <span>•</span>
                    <span>Trụ cột: <strong className="text-indigo-600">{deal.contentPillar || 'Review thực tế'}</strong></span>
                    <span>•</span>
                    <span>Hạn air: <strong className="text-slate-800 font-mono">{deal.slaDeadline || '2026-10-25'}</strong></span>
                  </div>

                  {deal.holdingReason && (
                    <div className="text-2xs bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 mt-1">
                      {deal.holdingReason}
                    </div>
                  )}
                </div>

                {/* Remuneration & Action buttons */}
                <div className="flex md:flex-col items-end justify-between md:justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 shrink-0">
                  <div className="text-right">
                    <div className="text-2xs text-slate-500 uppercase font-semibold">Thù lao Cast hợp đồng</div>
                    <div className="text-base font-extrabold font-mono text-emerald-600">
                      {formatVndShort(deal.totalValue || 3000000)}
                    </div>
                    <div className="text-3xs text-slate-500">
                      + 15% Hoa hồng Affiliate
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isAccepted && !isRejected && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAcceptDeal(deal.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Nhận Job
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNegotiatingDeal(deal);
                            setCounterRate(deal.totalValue || 3000000);
                            setCounterNote('');
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition"
                        >
                          Đàm phán
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingDeal(deal);
                            setRejectReason('Lệch định hướng kênh / không phù hợp sản phẩm');
                          }}
                          className="px-2 py-1.5 text-slate-400 hover:text-red-600 text-xs font-medium rounded-lg transition"
                          title="Từ chối job"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittingDeal(deal);
                          setActiveJobsSubTab('SUBMISSION');
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs"
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

      {/* ========================================================================= */}
      {/* TAB 2: HÀNG MẪU & VẬN CHUYỂN                                              */}
      {/* ========================================================================= */}
          {activeJobsSubTab === 'SAMPLES' && (
        <div className="space-y-4">
          {/* Shipping Address Summary Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Địa chỉ nhận hàng mẫu: </span>
                <span className="text-slate-600">{addressForm.recipient} ({addressForm.phone}) — {addressForm.address}</span>
              </div>
            </div>
            <button
              onClick={() => setEditingAddress(true)}
              className="text-xs font-semibold text-indigo-600 hover:underline shrink-0"
            >
              Cập nhật địa chỉ
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
                <tr>
                  <th className="py-3 px-4">Chiến dịch & Sản phẩm</th>
                  <th className="py-3 px-4">Nhãn hàng</th>
                  <th className="py-3 px-4">Mã vận đơn (Tracking)</th>
                  <th className="py-3 px-4 text-center">Trạng thái vận chuyển</th>
                  <th className="py-3 px-4 text-center">SLA nộp video</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentKocDeals.map(d => {
                  const isReceived = d.sampleStatus === 'ĐÃ_NHẬN';
                  const trackingCode = `GHTK-${d.id.slice(-6).toUpperCase()}`;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{d.productName || 'Bộ Kit Trải Nghiệm'}</div>
                        <div className="text-2xs text-slate-500">{d.campaignTitle}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{d.brandName}</td>
                      <td className="py-3 px-4 font-mono text-2xs">
                        <div className="text-indigo-600 font-semibold">{trackingCode}</div>
                        <div className="text-slate-400">Giao Hàng Tiết Kiệm</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isReceived ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã nhận hàng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600" /> Đang giao hàng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-2xs font-mono">
                        {isReceived ? (
                          <div className="text-emerald-600 font-semibold">Còn 4 ngày (SLA 5D)</div>
                        ) : (
                          <div className="text-slate-400">Kích hoạt khi nhận hàng</div>
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
                          <span className="text-2xs text-slate-400 font-medium">Đã kích hoạt</span>
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

      {/* ========================================================================= */}
      {/* TAB 3: NỘP VIDEO & SPARK ADS                                              */}
      {/* ========================================================================= */}
          {activeJobsSubTab === 'SUBMISSION' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Cổng nộp Video nghiệm thu & Mã Spark Ads</h3>
            <p className="text-xs text-slate-500 mb-4">
              KOC vui lòng đăng tải video bản nháp (không chèn logo đối thủ, độ phân giải 1080p) và cung cấp mã ủy quyền Spark Ads 30 ngày để Brand & Growth chạy Ads.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentKocDeals.map(d => (
                <div key={d.id} className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs">{d.brandName}</span>
                    <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                      d.tiktokVideoUrl ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {d.tiktokVideoUrl ? 'Đã nộp video nháp' : 'Chưa nộp video'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{d.productName || d.campaignTitle}</div>

                  {d.tiktokVideoUrl && (
                    <div className="text-2xs font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 truncate">
                      Link: <a href={d.tiktokVideoUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{d.tiktokVideoUrl}</a>
                    </div>
                  )}

                  {d.sparkAdsCode && (
                    <div className="text-2xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                      <span>Spark Ads: <strong className="text-slate-900">{d.sparkAdsCode}</strong></span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(d.sparkAdsCode || '');
                          notify('Đã copy mã Spark Ads!');
                        }}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
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
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
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
      {/* TAB 4: TRAO ĐỔI QUA LẠI (TWO-WAY DISCUSSION & CHAT)                       */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <div className="bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-col h-[580px] overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                KOC
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Kênh Trao Đổi Booking Trực Tiếp: {activeKoc.stageName} ⇄ Upbase Booking PIC
                </h4>
                <p className="text-2xs text-slate-500">
                  Hỗ trợ giải đáp kịch bản, thời gian nộp mẫu, xin gia hạn lịch quay, mã Spark Ads
                </p>
              </div>
            </div>
            <span className="text-2xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Phản hồi trực tuyến &lt; 15 phút
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-slate-50/40">
            {kocChatMessages.map(msg => {
              const isKoc = msg.sender === 'KOC';
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isKoc ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-2xs text-white shrink-0 ${
                    isKoc ? 'bg-purple-600' : 'bg-slate-700'
                  }`}>
                    {isKoc ? activeKoc.stageName.slice(0, 2).toUpperCase() : 'UP'}
                  </div>
                  <div className={`max-w-[75%] space-y-1 ${isKoc ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-2xs text-slate-400 ${isKoc ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl leading-relaxed text-xs shadow-2xs ${
                      isKoc ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendKocChat} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              value={newKocChatText}
              onChange={(e) => setNewKocChatText(e.target.value)}
              placeholder="Nhập nội dung trao đổi với Booking Lead Upbase..."
              className="flex-1 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newKocChatText.trim()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ HỢP TÁC & QUYẾT TOÁN (HISTORY)                             */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank / QR Card */}
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">Tài khoản nhận thanh toán</div>
                <div className="text-sm font-bold mt-1 text-slate-100">{activeKoc.bankName || 'MB Bank (Quân Đội)'}</div>
                <div className="text-lg font-mono font-bold tracking-widest mt-0.5 text-emerald-400">
                  {activeKoc.bankAccount || '999988886666'}
                </div>
                <div className="text-2xs text-slate-400 mt-1 uppercase">
                  Chủ TK: {activeKoc.realName || activeKoc.stageName}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-2xs text-slate-400">
                <span>Khấu trừ thuế TNCN 10% theo quy định</span>
                <QrCode className="w-5 h-5 text-slate-300" />
              </div>
            </div>

            {/* Income Summary Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs md:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng kết thu nhập kỳ này</h3>
              
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <div className="text-2xs text-slate-500">Tổng tiền Cast hợp đồng</div>
                  <div className="text-base font-bold font-mono text-slate-900">{formatVndShort(stats.totalEarnings)}</div>
                </div>
                <div>
                  <div className="text-2xs text-slate-500">Hoa hồng Affiliate ước tính</div>
                  <div className="text-base font-bold font-mono text-indigo-600">{formatVndShort(stats.totalGmv * 0.15)}</div>
                </div>
                <div>
                  <div className="text-2xs text-slate-500">Thực nhận sau thuế (90%)</div>
                  <div className="text-base font-extrabold font-mono text-emerald-600">
                    {formatVndShort((stats.totalEarnings + stats.totalGmv * 0.15) * 0.9)}
                  </div>
                </div>
              </div>

              <div className="text-2xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kế toán Upbase đối soát vào thứ 6 hàng tuần và giải ngân trực tiếp qua lệnh UNC ngân hàng.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ĐÀM PHÁN GIÁ CAST                                                  */}
      {/* ========================================================================= */}
      {negotiatingDeal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Đề xuất mức thù lao Cast</h3>
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono font-bold focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú gửi Account Upbase</label>
                <textarea
                  rows={3}
                  placeholder="Lý do đề xuất (ví dụ: cần thêm quyền chạy ads 30 ngày, sản phẩm độ khó cao...)"
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNegotiatingDeal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleNegotiateDeal}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Gửi đề xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TỪ CHỐI JOB                                                        */}
      {/* ========================================================================= */}
      {rejectingDeal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Từ chối lời mời hợp tác</h3>
              <button onClick={() => setRejectingDeal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Vui lòng chọn lý do để Upbase cập nhật hồ sơ và không gửi các job tương tự làm phiền bạn:
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
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleRejectDeal}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NỘP VIDEO DEMO & SPARK ADS                                         */}
      {/* ========================================================================= */}
      {submittingDeal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitVideoDemo} className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Nộp Video Demo & Mã Spark Ads</h3>
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mã ủy quyền Spark Ads Code (TikTok)</label>
                <input
                  type="text"
                  placeholder="VD: 7412894723984729384..."
                  value={submissionForm.sparkAdsCode}
                  onChange={(e) => setSubmissionForm(prev => ({ ...prev, sparkAdsCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
                <span className="text-3xs text-slate-400 mt-0.5 block">Mã sinh từ mục Video Setting ➔ Ad Authorization trên TikTok.</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi chú cho Brand / Content Lead</label>
                <textarea
                  rows={2}
                  placeholder="Lưu ý về góc quay, thời điểm xuất hiện sản phẩm..."
                  value={submissionForm.notes}
                  onChange={(e) => setSubmissionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubmittingDeal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Xác nhận nộp video
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SỬA ĐỊA CHỈ NHẬN HÀNG MẪU                                         */}
      {/* ========================================================================= */}
      {editingAddress && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Cập nhật địa chỉ nhận hàng mẫu</h3>
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
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(false);
                  notify('Đã cập nhật địa chỉ giao hàng mẫu thành công!');
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Lưu địa chỉ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
