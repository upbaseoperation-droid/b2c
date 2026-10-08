'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  RotateCcw,
  MessageSquare,
  Send,
  Video,
  Eye,
  DollarSign,
  Copy,
  Check,
  Play,
  FileText,
  Share2,
  Building,
  Users,
  Briefcase,
  History,
  LayoutDashboard,
  Download,
  Search,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  X,
  SlidersHorizontal
} from 'lucide-react';
import {
  BrandCampaignPortalData,
  BrandKocCandidate,
  BrandScriptItem,
  BrandRejectReasonType,
  BookingDealItem,
  BrandDetail
} from '../../lib/types';
import { INITIAL_BRAND_PORTAL_DATA } from '../../lib/mockData';

export interface BrandHubViewProps {
  deals?: BookingDealItem[];
  brands?: BrandDetail[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToCtvHub?: () => void;
  onNavigateToKocHub?: () => void;
  onBrandApproveDeal?: (kocOrDeal: string) => void;
  onBrandRejectDeal?: (kocOrDeal: string, reason: string) => void;
}

export type BrandHubPillarTab = 'OVERVIEW' | 'APPROVALS' | 'ACTIVE_JOBS' | 'DISCUSSION' | 'HISTORY';

interface ChatMessage {
  id: string;
  sender: 'BRAND' | 'UPBASE_ACCOUNT' | 'UPBASE_BOOKING';
  senderName: string;
  senderRole: string;
  avatarText: string;
  time: string;
  content: string;
  attachmentName?: string;
}

export const BrandHubView: React.FC<BrandHubViewProps> = ({ 
  deals = [],
  brands = [],
  onNotify,
  onNavigateToCtvHub,
  onNavigateToKocHub,
  onBrandApproveDeal,
  onBrandRejectDeal
}) => {
  const [portals, setPortals] = useState<BrandCampaignPortalData[]>(INITIAL_BRAND_PORTAL_DATA);
  const [selectedPortalId, setSelectedPortalId] = useState<string>(INITIAL_BRAND_PORTAL_DATA[0].id);

  const activePortal = portals.find(p => p.id === selectedPortalId) || portals[0];

  // The 5 Universal Enterprise Hub Tabs
  const [activeTab, setActiveTab] = useState<BrandHubPillarTab>('OVERVIEW');

  // Stage 1: Plan Revision Form state
  const [isPlanRevisionModalOpen, setIsPlanRevisionModalOpen] = useState(false);
  const [planRevisionNotes, setPlanRevisionNotes] = useState('');

  // Stage 2: KOC Reject Modal state
  const [rejectingKoc, setRejectingKoc] = useState<BrandKocCandidate | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState<BrandRejectReasonType>('Lệch định vị thương hiệu');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  // Stage 3: Script Review Drawer / Modal State
  const [inspectingScript, setInspectingScript] = useState<BrandScriptItem | null>(null);
  const [scriptFeedbackText, setScriptFeedbackText] = useState('');
  const [feedbackSection, setFeedbackSection] = useState<'HOOK' | 'PAIN' | 'USP' | 'CTA'>('HOOK');

  // Stage filter for Active Jobs
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('ALL');
  const [jobSearchQuery, setJobSearchQuery] = useState<string>('');

  // Discussion Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'UPBASE_ACCOUNT',
      senderName: activePortal.accountPic || 'Vân Ngọc',
      senderRole: 'Account Lead Upbase',
      avatarText: 'VN',
      time: 'Hôm qua lúc 14:20',
      content: `Chào Quý Nhãn Hàng ${activePortal.brandName}! Đội ngũ Upbase đã chuẩn bị xong kế hoạch ngân sách và danh sách các KOC đề xuất cho chiến dịch ${activePortal.campaignTitle}. Anh/chị xem qua và phê duyệt giúp team nhé ạ!`
    },
    {
      id: 'msg-2',
      sender: 'BRAND',
      senderName: 'Brand Manager',
      senderRole: activePortal.brandName,
      avatarText: 'BM',
      time: 'Hôm qua lúc 16:05',
      content: 'Cảm ơn em. Mình đã xem qua, kế hoạch ngân sách cơ bản ổn. Tuy nhiên với tệp Micro KOC bên em ưu tiên chọn các bạn có thế mạnh về phân tích thành phần lành tính giúp bên mình nhé.'
    },
    {
      id: 'msg-3',
      sender: 'UPBASE_BOOKING',
      senderName: activePortal.bookingPic || 'Khánh Vy',
      senderRole: 'Booking Execution Lead',
      avatarText: 'KV',
      time: 'Sáng nay lúc 09:15',
      content: 'Dạ vâng ạ! Team Booking đã lọc kỹ và bổ sung 2 bạn Dược sĩ/Beauty Reviewer chuyên sâu về da nhạy cảm. Kịch bản của 2 bạn đã được gửi lên mục "Cần duyệt ngay" để anh/chị xem trước ạ.'
    }
  ]);
  const [newChatText, setNewChatText] = useState('');

  // Copy Magic Link state
  const [copiedLink, setCopiedLink] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPlanRevisionModalOpen) setIsPlanRevisionModalOpen(false);
        if (rejectingKoc) setRejectingKoc(null);
        if (inspectingScript) setInspectingScript(null);
      }
    };
    if (isPlanRevisionModalOpen || rejectingKoc || inspectingScript) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlanRevisionModalOpen, rejectingKoc, inspectingScript]);

  // Check if Stage 1 is completed
  const isPlanApproved = activePortal.planApprovalStatus === 'BRAND_PLAN_APPROVED';

  // Count pending items for Approvals badge
  const pendingApprovalsCount = useMemo(() => {
    let count = 0;
    if (!isPlanApproved) count += 1;
    count += activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').length;
    count += activePortal.scripts.filter(s => s.status !== 'APPROVED').length;
    return count;
  }, [isPlanApproved, activePortal]);

  // Handle Switch Brand Portal
  const handleSwitchPortal = (portalId: string) => {
    setSelectedPortalId(portalId);
  };

  // Plan Actions
  const handleApprovePlan = () => {
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          planApprovalStatus: 'BRAND_PLAN_APPROVED',
          planApprovalDate: new Date().toLocaleString('vi-VN')
        };
      }
      return p;
    }));

    if (onNotify) {
      onNotify(`Quý Nhãn Hàng ${activePortal.brandName} đã chính thức phê duyệt Kế hoạch Ngân sách!`, 'success');
    }
  };

  const handleRequestPlanRevision = () => {
    if (!planRevisionNotes.trim()) return;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          planApprovalStatus: 'BRAND_PLAN_REVISION_REQUESTED',
          planFeedbackNotes: planRevisionNotes
        };
      }
      return p;
    }));

    if (onNotify) {
      onNotify(`Đã ghi nhận yêu cầu điều chỉnh Kế hoạch từ Nhãn hàng. Booking Lead sẽ cập nhật lại trong 12 giờ.`, 'warning');
    }
    setIsPlanRevisionModalOpen(false);
  };

  // KOC Actions
  const handleApproveKoc = (kocId: string) => {
    const targetKoc = activePortal.kocCandidates.find(k => k.id === kocId);
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          kocCandidates: p.kocCandidates.map(k => k.id === kocId ? { ...k, brandApprovalStatus: 'ĐÃ_DUYỆT', rejectReason: undefined } : k)
        };
      }
      return p;
    }));

    if (targetKoc && onBrandApproveDeal) {
      onBrandApproveDeal(targetKoc.stageName);
    }

    if (onNotify) {
      onNotify(`Brand đã duyệt KOC! Hệ thống chuyển sang chặng gửi hàng mẫu và kịch bản.`, 'success');
    }
  };

  const handleConfirmRejectKoc = () => {
    if (!rejectingKoc) return;
    const finalReason = selectedRejectReason === 'Lý do khác' ? (rejectCustomNote || 'Lý do khác') : selectedRejectReason;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          kocCandidates: p.kocCandidates.map(k => k.id === rejectingKoc.id ? {
            ...k,
            brandApprovalStatus: 'TỪ_CHỐI',
            rejectReason: finalReason
          } : k)
        };
      }
      return p;
    }));

    if (onBrandRejectDeal) {
      onBrandRejectDeal(rejectingKoc.stageName, finalReason);
    }
    if (onNotify) {
      onNotify(`Đã từ chối KOC ${rejectingKoc.stageName} (Lý do: ${finalReason}). Upbase sẽ đề xuất KOC thay thế trong 24 giờ.`, 'warning');
    }
    setRejectingKoc(null);
    setRejectCustomNote('');
  };

  // Script Actions
  const handleApproveScript = (scriptId: string) => {
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          scripts: p.scripts.map(s => s.id === scriptId ? { ...s, status: 'APPROVED' } : s)
        };
      }
      return p;
    }));

    const sc = activePortal.scripts.find(s => s.id === scriptId);
    if (onNotify) {
      onNotify(`Brand đã phê duyệt kịch bản video của KOC ${sc?.kocStageName || ''}! KOC được phép tiến hành quay video.`, 'success');
    }
    if (inspectingScript && inspectingScript.id === scriptId) {
      setInspectingScript(null);
    }
  };

  const handleSubmitScriptFeedback = () => {
    if (!scriptFeedbackText.trim() || !inspectingScript) return;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          scripts: p.scripts.map(s => s.id === inspectingScript.id ? {
            ...s,
            status: 'REVISION_REQUESTED',
            revisionCount: s.revisionCount + 1,
            brandFeedback: `[Góp ý phần ${feedbackSection}]: ${scriptFeedbackText}`
          } : s)
        };
      }
      return p;
    }));

    if (onNotify) {
      onNotify(`Đã gửi góp ý kịch bản cho KOC ${inspectingScript.kocStageName} (Lần sửa: ${inspectingScript.revisionCount + 1}/2).`, 'info');
    }
    setScriptFeedbackText('');
    setInspectingScript(null);
  };

  // Chat message send handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChatText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'BRAND',
      senderName: 'Brand Manager',
      senderRole: activePortal.brandName,
      avatarText: 'BM',
      time: 'Vừa xong',
      content: newChatText.trim()
    };

    setChatMessages(prev => [...prev, newMsg]);
    setNewChatText('');
    if (onNotify) onNotify('Đã gửi tin nhắn đến Upbase Account Team!', 'success');
  };

  const handleCopyMagicLink = () => {
    navigator.clipboard.writeText(`https://portal.upbase.asia/client/${activePortal.brandId}?token=sec_live_202610_upbase`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    if (onNotify) {
      onNotify('Đã sao chép Magic Link Cổng Nhãn Hàng! Link này có thể gửi qua Zalo/Email cho Brand Manager.', 'success');
    }
  };

  // Filtered jobs in Active Jobs tab
  const filteredJobs = useMemo(() => {
    return activePortal.scripts.filter(sc => {
      const matchQuery = sc.kocStageName.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
        sc.productName.toLowerCase().includes(jobSearchQuery.toLowerCase());
      if (!matchQuery) return false;
      if (jobStatusFilter === 'AIRED') return !!sc.publishedVideoUrl;
      if (jobStatusFilter === 'DRAFT') return !!sc.draftVideoUrl && !sc.publishedVideoUrl;
      if (jobStatusFilter === 'SCRIPT') return sc.status !== 'APPROVED';
      return true;
    });
  }, [activePortal, jobStatusFilter, jobSearchQuery]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SLEEK ENTERPRISE HEADER (Single line, low noise, high context)        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              {activePortal.brandLogoText.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {activePortal.brandName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Cổng Nhãn Hàng
                </span>
                <span className="font-mono text-2xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {activePortal.campaignCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chiến dịch: <span className="font-medium text-slate-700">{activePortal.campaignTitle}</span> ({activePortal.month}) • Phụ trách: <span className="text-slate-700 font-medium">{activePortal.accountPic}</span> (Account Lead) &amp; <span className="text-slate-700 font-medium">{activePortal.bookingPic}</span> (Booking Lead) • Cam kết SLA: &lt; 24h
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* Brand Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={activePortal.id}
                onChange={(e) => handleSwitchPortal(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                {portals.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.brandName} ({p.campaignCode})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCopyMagicLink}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Đã chép Link' : 'Chia sẻ Cổng Brand'}</span>
            </button>

            {onNavigateToCtvHub && (
              <button
                type="button"
                onClick={onNavigateToCtvHub}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                title="Chuyển sang Hub CTV"
              >
                <Video className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hub CTV</span>
              </button>
            )}

            {onNavigateToKocHub && (
              <button
                type="button"
                onClick={onNavigateToKocHub}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                title="Chuyển sang Hub KOC"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hub KOC</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MINIMALIST SEGMENTED TABS                                             */}
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
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APPROVALS')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'APPROVALS'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Cần duyệt</span>
          {pendingApprovalsCount > 0 && (
            <span className={`text-2xs font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'APPROVALS' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
            }`}>
              {pendingApprovalsCount}
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
          <span>Công việc đang chạy ({activePortal.kocCandidates.length})</span>
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
          <History className="w-3.5 h-3.5" />
          <span>Lịch sử &amp; Nghiệm thu</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TỔNG QUAN (STREAMLINED & BALANCED)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 Clean Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Tổng ngân sách</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-slate-900">
                  {(activePortal.totalBudget).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-emerald-600 font-medium">100% phân bổ</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Mục tiêu GMV</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-blue-600">
                  {(activePortal.targetGmv).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-slate-500 font-medium">ROI 5.0x</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Tỷ lệ CIR mục tiêu</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-amber-600">
                  {activePortal.targetCir.toFixed(1)}%
                </span>
                <span className="text-2xs text-slate-400">Chi phí / GMV</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Tiến độ Clips lên sóng</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono text-purple-600">
                  {activePortal.liveAiredVideosCount} / {activePortal.totalTargetVideos}
                </span>
                <span className="text-2xs text-slate-400">
                  {Math.round((activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100)}% hoàn thành
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all"
                  style={{ width: `${(activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Connected Pipeline Steps (Minimalist Stepper) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">
              Tiến Độ Triển Khai 4 Chặng Cốt Lõi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-bold text-slate-400">CHẶNG 1</span>
                  <span className={`text-2xs font-semibold px-2 py-0.5 rounded ${isPlanApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {isPlanApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">Kế hoạch ngân sách</h4>
                <p className="text-2xs text-slate-500 mt-0.5">Phân rã ngân sách cho 4 cấp độ KOC</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-bold text-slate-400">CHẶNG 2</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'ĐÃ_DUYỆT').length}/{activePortal.kocCandidates.length} KOC
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">Duyệt danh sách KOC</h4>
                <p className="text-2xs text-slate-500 mt-0.5">Thẩm định profile và độ phù hợp</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-bold text-slate-400">CHẶNG 3</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {activePortal.scripts.filter(s => s.status === 'APPROVED').length}/{activePortal.scripts.length} Kịch bản
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">Thẩm định kịch bản</h4>
                <p className="text-2xs text-slate-500 mt-0.5">Góp ý Hook, Pain, USP, CTA</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-bold text-slate-400">CHẶNG 4</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                    {activePortal.liveAiredVideosCount}/{activePortal.totalTargetVideos} Clips
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800">Lên sóng &amp; Nghiệm thu</h4>
                <p className="text-2xs text-slate-500 mt-0.5">Đo lường Views, GMV &amp; Spark Ads</p>
              </div>
            </div>
          </div>

          {/* Strategy Brief Context */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Định Hướng Chiến Lược &amp; Sản Phẩm Trọng Tâm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-1">Thông điệp chủ đạo (Big Idea):</span>
                <p className="text-slate-600 leading-relaxed">{activePortal.bigIdea}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-1">Sản phẩm chủ lực (Focus SKUs):</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activePortal.focusSkus.map((sku, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-2xs">
                      {sku}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Cơ Cấu Phân Bổ Ngân Sách Theo Cấp Độ KOC
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('APPROVALS')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Xem mục cần duyệt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Cấp độ KOC</th>
                    <th className="py-2.5 px-3">Số lượng</th>
                    <th className="py-2.5 px-3">Chi phí TB</th>
                    <th className="py-2.5 px-3">Tổng ngân sách</th>
                    <th className="py-2.5 px-3">Mục tiêu GMV</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePortal.breakdownTiers.map(t => (
                    <tr key={t.tierLabel} className="hover:bg-slate-50/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{t.tierLabel}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{t.targetCount} KOCs</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{(t.estimatedAvgCost).toLocaleString('vi-VN')} đ</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">{(t.allocatedBudget).toLocaleString('vi-VN')} đ</td>
                      <td className="py-3 px-3 font-mono text-blue-700">{(t.totalExpectedGmv).toLocaleString('vi-VN')} đ</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700">
                          Khớp ngân sách
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN DUYỆT (ACTIONABLE INBOX - LINEAR/STRIPE STYLE)                  */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* All approved empty state */}
          {pendingApprovalsCount === 0 && (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Hộp việc hoàn tất! Quý Nhãn Hàng đã duyệt tất cả các hạng mục
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Không còn mục nào chờ duyệt. Upbase đang tiến hành quay dựng và điều phối lịch lên sóng đúng tiến độ.
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

          {/* Pending items list */}
          {pendingApprovalsCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Hộp Việc Cần Phê Duyệt ({pendingApprovalsCount} mục)
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Click phê duyệt nhanh hoặc mở xem chi tiết để phản hồi cho Booking Lead
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Plan Approval Item */}
                {!isPlanApproved && (
                  <div className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">Kế Hoạch &amp; Ngân Sách Chiến Dịch</span>
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Cần duyệt đầu tiên
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tổng ngân sách: <strong className="text-slate-700">{(activePortal.totalBudget).toLocaleString('vi-VN')} đ</strong> • Mục tiêu GMV: <strong className="text-slate-700">{(activePortal.targetGmv).toLocaleString('vi-VN')} đ</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsPlanRevisionModalOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition"
                      >
                        Yêu cầu chỉnh
                      </button>
                      <button
                        type="button"
                        onClick={handleApprovePlan}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt kế hoạch
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Pending KOC Candidates */}
                {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').map(koc => (
                  <div key={koc.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {koc.stageName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">{koc.stageName}</span>
                          <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{koc.channelId}</span>
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700">{koc.tier}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(koc.followers).toLocaleString('vi-VN')} followers • ER: <span className="text-emerald-600 font-semibold">{koc.engagementRate}%</span> • Ngành hàng: <span className="text-slate-700">{koc.niche}</span> • "{koc.formatDescription}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingKoc(koc);
                          setSelectedRejectReason('Lệch định vị thương hiệu');
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition"
                      >
                        Đổi KOC
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveKoc(koc.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt KOC
                      </button>
                    </div>
                  </div>
                ))}

                {/* 3. Pending Scripts */}
                {activePortal.scripts.filter(s => s.status !== 'APPROVED').map(script => (
                  <div key={script.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">Kịch bản: {script.kocStageName}</span>
                          <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{script.videoDuration}</span>
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-indigo-50 text-indigo-700">
                            Lần sửa: {script.revisionCount}/2
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sản phẩm: <span className="text-slate-800 font-medium">{script.productName}</span> • Hook: <span className="italic text-slate-600">"{script.hook.slice(0, 70)}..."</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setInspectingScript(script)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem &amp; Góp ý
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveScript(script.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt kịch bản
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÁC JOB ĐANG LÀM (ACTIVE JOBS)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Clean Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên KOC hoặc sản phẩm..."
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                className="text-xs bg-transparent text-slate-800 placeholder-slate-400 outline-none w-48 sm:w-72"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setJobStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ({activePortal.scripts.length})
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('SCRIPT')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'SCRIPT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Kịch bản
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('DRAFT')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'DRAFT' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Clip nháp
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('AIRED')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'AIRED' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Đã lên sóng ({activePortal.liveAiredVideosCount})
              </button>
            </div>
          </div>

          {/* Job List Cards */}
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                      {job.kocStageName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{job.kocStageName}</span>
                        <span className="text-2xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{job.channelId}</span>
                        <span className={`text-2xs font-semibold px-2 py-0.5 rounded ${
                          job.publishedVideoUrl 
                            ? 'bg-emerald-50 text-emerald-700'
                            : job.draftVideoUrl
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {job.publishedVideoUrl ? 'ĐÃ LÊN SÓNG' : job.draftVideoUrl ? 'CLIP NHÁP' : 'KỊCH BẢN'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{job.productName} ({job.videoDuration})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {job.publishedVideoUrl && (
                      <div className="text-right mr-2 text-xs">
                        <span className="text-emerald-700 font-bold block">
                          {(job.gmv || 0).toLocaleString('vi-VN')} đ GMV
                        </span>
                        <span className="text-2xs text-slate-400">{(job.views || 0).toLocaleString('vi-VN')} views</span>
                      </div>
                    )}

                    {job.draftVideoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNotify) onNotify(`Đang mở clip nháp có Watermark bản quyền Upbase của ${job.kocStageName}.`, 'info');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 text-amber-600" />
                        Xem Clip Nháp
                      </button>
                    )}

                    {job.publishedVideoUrl && (
                      <a
                        href={job.publishedVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center gap-1.5 text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem TikTok
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress bar stages */}
                <div className="grid grid-cols-5 gap-1.5 pt-3 mt-3 border-t border-slate-100 text-2xs">
                  <div className="py-1 px-1.5 rounded bg-emerald-50 text-emerald-800 font-medium text-center">
                    1. Chốt KOC ✓
                  </div>
                  <div className="py-1 px-1.5 rounded bg-emerald-50 text-emerald-800 font-medium text-center">
                    2. Gửi hàng ✓
                  </div>
                  <div className={`py-1 px-1.5 rounded font-medium text-center ${
                    job.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}>
                    3. Kịch bản {job.status === 'APPROVED' ? '✓' : '...'}
                  </div>
                  <div className={`py-1 px-1.5 rounded font-medium text-center ${
                    job.draftVideoUrl ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-400'
                  }`}>
                    4. Quay nháp {job.draftVideoUrl ? '✓' : '...'}
                  </div>
                  <div className={`py-1 px-1.5 rounded font-medium text-center ${
                    job.publishedVideoUrl ? 'bg-purple-50 text-purple-800' : 'bg-slate-50 text-slate-400'
                  }`}>
                    5. Lên sóng {job.publishedVideoUrl ? '✓' : '...'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRAO ĐỔI (TWO-WAY DISCUSSION)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[560px] overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                UP
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {activePortal.brandName} ⇄ Upbase Operations
                </h4>
                <p className="text-2xs text-slate-500">
                  {activePortal.accountPic} (Account Lead) &amp; {activePortal.bookingPic} (Booking Lead)
                </p>
              </div>
            </div>
            <span className="text-2xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              SLA phản hồi &lt; 2h
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/20">
            {chatMessages.map(msg => {
              const isBrand = msg.sender === 'BRAND';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isBrand ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-2xs text-white shrink-0 ${
                    isBrand ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}>
                    {msg.avatarText}
                  </div>
                  <div className={`max-w-[70%] space-y-1 ${isBrand ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-2xs text-slate-400 ${isBrand ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className={`p-3 rounded-2xl leading-relaxed text-xs ${
                      isBrand 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-2xs'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
            <input
              type="text"
              value={newChatText}
              onChange={(e) => setNewChatText(e.target.value)}
              placeholder="Nhập nội dung trao đổi với đội ngũ Upbase..."
              className="flex-1 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newChatText.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ & NGHIỆM THU (HISTORY)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Lịch Sử Các Chiến Dịch Trước Đây
                </h4>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Lưu trữ kết quả, biên bản nghiệm thu và quyết toán
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNotify) onNotify('Đang xuất biên bản nghiệm thu tổng hợp PDF...', 'success');
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Xuất Báo Cáo Nghiệm Thu (.PDF)</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-slate-900 text-xs">Chiến dịch Mega Sale 9.9 - Siêu Tiệc Thương Hiệu</span>
                    <span className="text-2xs text-slate-500 ml-2">Tháng 09/2026</span>
                  </div>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    Đã nghiệm thu 100%
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-2xs">Ngân sách giải ngân:</span>
                    <span className="font-semibold text-slate-900 font-mono">180.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">GMV thực tế:</span>
                    <span className="font-semibold text-emerald-600 font-mono">924.500.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Lượt xem video:</span>
                    <span className="font-semibold text-purple-600 font-mono">1.850.000</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Quy mô:</span>
                    <span className="font-semibold text-slate-700">35 Clips</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-slate-900 text-xs">Chiến dịch Khởi Động Mùa Tựu Trường Kutieskin</span>
                    <span className="text-2xs text-slate-500 ml-2">Tháng 08/2026</span>
                  </div>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    Đã nghiệm thu
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-2xs">Ngân sách giải ngân:</span>
                    <span className="font-semibold text-slate-900 font-mono">120.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">GMV thực tế:</span>
                    <span className="font-semibold text-emerald-600 font-mono">652.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Lượt xem video:</span>
                    <span className="font-semibold text-purple-600 font-mono">1.210.000</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">Quy mô:</span>
                    <span className="font-semibold text-slate-700">24 Clips</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS & DRAWERS                                                       */}
      {/* ========================================================================= */}

      {/* Modal 1: Plan Revision Request */}
      {isPlanRevisionModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPlanRevisionModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg p-6 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Yêu cầu điều chỉnh kế hoạch ngân sách
              </h4>
              <button
                type="button"
                onClick={() => setIsPlanRevisionModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vui lòng nhập định hướng quý nhãn hàng muốn điều chỉnh (ví dụ: tăng phân bổ cho Micro KOC, giảm Celeb, hoặc đổi tệp sáng tạo).
            </p>

            <textarea
              rows={4}
              value={planRevisionNotes}
              onChange={(e) => setPlanRevisionNotes(e.target.value)}
              placeholder="Nhập góp ý cụ thể cho Booking Team..."
              className="w-full text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPlanRevisionModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!planRevisionNotes.trim()}
                onClick={handleRequestPlanRevision}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition shadow-2xs"
              >
                Gửi yêu cầu chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: KOC Reject Reason */}
      {rejectingKoc && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingKoc(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Đề xuất đổi KOC: {rejectingKoc.stageName}
              </h4>
              <button
                type="button"
                onClick={() => setRejectingKoc(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Chọn lý do quý nhãn hàng chưa đồng ý KOC này để Upbase đề xuất Creator phù hợp hơn:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Lệch định vị thương hiệu',
                'Từng booking đối thủ cạnh tranh',
                'Rủi ro hình ảnh / Scandal',
                'Chất giọng / Phong cách chưa phù hợp',
                'Yêu cầu Creator chuyên môn cao hơn (Bác sĩ/Dược sĩ)',
                'Lý do khác'
              ].map(reason => (
                <label
                  key={reason}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition text-slate-800"
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={selectedRejectReason === reason}
                    onChange={() => setSelectedRejectReason(reason as BrandRejectReasonType)}
                    className="accent-indigo-600 cursor-pointer"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {selectedRejectReason === 'Lý do khác' && (
                <input
                  type="text"
                  placeholder="Nhập lý do cụ thể..."
                  value={rejectCustomNote}
                  onChange={(e) => setRejectCustomNote(e.target.value)}
                  className="w-full text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none mt-2"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingKoc(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKoc}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition"
              >
                Xác nhận đổi KOC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Script Review Drawer / Modal */}
      {inspectingScript && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingScript(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl p-6 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Kịch bản: {inspectingScript.kocStageName}
                </h4>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Sản phẩm: {inspectingScript.productName} ({inspectingScript.videoDuration}) • Lần sửa: {inspectingScript.revisionCount}/2
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingScript(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* 4 segments in a clean 2x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80">
                <span className="font-semibold text-amber-900 block mb-1">1. Hook mở đầu (3 giây đầu):</span>
                <p className="text-slate-700 leading-relaxed">{inspectingScript.hook}</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/80">
                <span className="font-semibold text-rose-900 block mb-1">2. Nỗi đau (Pain Point):</span>
                <p className="text-slate-700 leading-relaxed">{inspectingScript.painPoint}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                <span className="font-semibold text-emerald-900 block mb-1">3. Giải pháp &amp; USP sản phẩm:</span>
                <p className="text-slate-700 leading-relaxed">{inspectingScript.solutionAndUsp}</p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80">
                <span className="font-semibold text-blue-900 block mb-1">4. Kêu gọi mua (CTA):</span>
                <p className="text-slate-700 leading-relaxed">{inspectingScript.callToAction}</p>
              </div>
            </div>

            {/* Feedback Input */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Góp ý điều chỉnh cho KOC:
                </span>
                <div className="flex items-center gap-1.5 text-2xs">
                  <span className="text-slate-500">Phần góp ý:</span>
                  <select
                    value={feedbackSection}
                    onChange={(e: any) => setFeedbackSection(e.target.value)}
                    className="bg-slate-50 text-slate-800 border border-slate-200 rounded-md px-2 py-0.5 text-2xs"
                  >
                    <option value="HOOK">1. Hook</option>
                    <option value="PAIN">2. Pain Point</option>
                    <option value="USP">3. USP sản phẩm</option>
                    <option value="CTA">4. CTA</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={2}
                value={scriptFeedbackText}
                onChange={(e) => setScriptFeedbackText(e.target.value)}
                placeholder="Nhập nội dung chỉnh sửa cụ thể..."
                className="w-full text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={!scriptFeedbackText.trim() || inspectingScript.revisionCount >= 2}
                  onClick={handleSubmitScriptFeedback}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi góp ý
                </button>

                <button
                  type="button"
                  onClick={() => handleApproveScript(inspectingScript.id)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Phê duyệt kịch bản này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};