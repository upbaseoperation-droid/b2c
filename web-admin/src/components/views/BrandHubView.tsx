'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Lock,
  ThumbsUp,
  RotateCcw,
  MessageSquare,
  Send,
  Video,
  Eye,
  TrendingUp,
  DollarSign,
  Copy,
  Check,
  AlertTriangle,
  Play,
  FileText,
  ChevronRight,
  Share2,
  Building,
  UserCheck,
  Users,
  Briefcase,
  History,
  LayoutDashboard,
  CheckSquare,
  Download,
  Paperclip,
  Smile,
  FileCheck,
  Filter,
  Search,
  ArrowRight,
  Flame,
  BadgeCheck
} from 'lucide-react';
import {
  BrandCampaignPortalData,
  BrandKocCandidate,
  BrandScriptItem,
  BrandRejectReasonType
} from '../../lib/types';
import { INITIAL_BRAND_PORTAL_DATA } from '../../lib/mockData';

interface BrandHubViewProps {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToCtvHub?: () => void;
  onNavigateToKocHub?: () => void;
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
  onNotify,
  onNavigateToCtvHub,
  onNavigateToKocHub
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

  // Stage 3: Script Feedback State
  const [activeScriptId, setActiveScriptId] = useState<string>(activePortal.scripts[0]?.id || '');
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
      }
    };
    if (isPlanRevisionModalOpen || rejectingKoc) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlanRevisionModalOpen, rejectingKoc]);

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
    const target = portals.find(p => p.id === portalId);
    if (target) {
      setActiveScriptId(target.scripts[0]?.id || '');
    }
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
    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          kocCandidates: p.kocCandidates.map(k => k.id === kocId ? { ...k, brandApprovalStatus: 'ĐÃ_DUYỆT', rejectReason: undefined } : k)
        };
      }
      return p;
    }));

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

    if (onNotify) {
      onNotify(`Đã từ chối KOC ${rejectingKoc.stageName} (Lý do: ${finalReason}). Upbase sẽ đề xuất KOC thay thế trong 24 giờ.`, 'warning');
    }
    setRejectingKoc(null);
    setRejectCustomNote('');
  };

  // Script Actions
  const activeScript = activePortal.scripts.find(s => s.id === activeScriptId) || activePortal.scripts[0];

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

    if (onNotify) {
      onNotify(`Brand đã phê duyệt kịch bản video của KOC ${activeScript?.kocStageName}! KOC được phép tiến hành quay video.`, 'success');
    }
  };

  const handleSubmitScriptFeedback = () => {
    if (!scriptFeedbackText.trim() || !activeScript) return;

    setPortals(prev => prev.map(p => {
      if (p.id === activePortal.id) {
        return {
          ...p,
          scripts: p.scripts.map(s => s.id === activeScript.id ? {
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
      onNotify(`Đã gửi góp ý kịch bản cho KOC ${activeScript.kocStageName} (Lần sửa: ${activeScript.revisionCount + 1}/2).`, 'info');
    }
    setScriptFeedbackText('');
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
      {/* 1. BRAND PORTAL TOP HEADER & CONTEXT BAR                                 */}
      {/* ========================================================================= */}
      <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-base shadow-sm">
              {activePortal.brandLogoText.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {activePortal.brandName}
                </h2>
                <span className="badge-emerald px-2.5 py-0.5 rounded font-semibold text-2xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cổng tác nghiệp Nhãn hàng
                </span>
                <span className="badge-slate text-2xs px-2 py-0.5 rounded font-mono font-semibold">
                  {activePortal.campaignCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Chiến dịch: <strong className="text-slate-800">{activePortal.campaignTitle}</strong> ({activePortal.month})
              </p>
            </div>
          </div>

          {/* Brand Switcher & Multi-hub Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={activePortal.id}
                onChange={(e) => handleSwitchPortal(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                {portals.map(p => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900">
                    {p.brandName} ({p.campaignCode})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCopyMagicLink}
              className="btn-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-blue-600" />}
              <span>{copiedLink ? 'Đã Sao Chép Link' : 'Copy Magic Link Brand'}</span>
            </button>

            {onNavigateToCtvHub && (
              <button
                type="button"
                onClick={onNavigateToCtvHub}
                className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                title="Chuyển sang Hub Cộng tác viên (CTV)"
              >
                <Video className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hub CTV</span>
              </button>
            )}

            {onNavigateToKocHub && (
              <button
                type="button"
                onClick={onNavigateToKocHub}
                className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                title="Chuyển sang Hub đối tác KOC / KOL"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hub KOC</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Support Team & SLA Commitment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Account Lead Upbase:</span>
            <span className="font-semibold text-slate-900">{activePortal.accountPic}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Booking Execution Lead:</span>
            <span className="font-semibold text-slate-900">{activePortal.bookingPic}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Cam kết SLA phản hồi:</span>
            <span className="font-semibold text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Tối đa 24h / lần duyệt
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 5 UNIVERSAL ENTERPRISE HUB TABS                                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>1. Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APPROVALS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'APPROVALS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>2. Cần duyệt ngay</span>
          {pendingApprovalsCount > 0 && (
            <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === 'APPROVALS' ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
            }`}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE_JOBS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ACTIVE_JOBS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>3. Các job đang làm ({activePortal.kocCandidates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DISCUSSION')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>5. Lịch sử &amp; Nghiệm thu</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TỔNG QUAN (OVERVIEW & CAMPAIGN STRATEGY)                           */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs text-slate-500 block font-medium">Tổng ngân sách gói chiến dịch</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
                {(activePortal.totalBudget).toLocaleString('vi-VN')} đ
              </span>
              <span className="text-2xs text-slate-400 mt-1 block">Đã phân bổ 100% theo các cấp độ KOC</span>
            </div>

            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs text-slate-500 block font-medium">Mục tiêu doanh thu GMV dự phóng</span>
              <span className="text-xl font-bold font-mono text-blue-600 mt-1 block">
                {(activePortal.targetGmv).toLocaleString('vi-VN')} đ
              </span>
              <span className="text-2xs text-emerald-600 font-medium mt-1 block">ROI kỳ vọng: 5.0x</span>
            </div>

            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs text-slate-500 block font-medium">Tỷ lệ CIR mục tiêu</span>
              <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">
                {activePortal.targetCir.toFixed(1)}%
              </span>
              <span className="text-2xs text-slate-400 mt-1 block">Chi phí / 100đ doanh thu GMV</span>
            </div>

            <div className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs">
              <span className="text-2xs text-slate-500 block font-medium">Quy mô Video &amp; Creator</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-purple-600">
                  {activePortal.liveAiredVideosCount} / {activePortal.totalTargetVideos}
                </span>
                <span className="text-xs text-slate-500 font-medium">Clips đã lên sóng</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all"
                  style={{ width: `${(activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stage Status Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-slate-500 uppercase">Chặng 1</span>
                <span className={`text-2xs font-bold px-2 py-0.5 rounded border ${
                  isPlanApproved ? 'badge-emerald' : 'badge-amber'
                }`}>
                  {isPlanApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-900 block">Kế hoạch ngân sách</span>
              <p className="text-2xs text-slate-500">Phân rã ngân sách cho 4 cấp độ KOC</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-slate-500 uppercase">Chặng 2</span>
                <span className="text-2xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'ĐÃ_DUYỆT').length}/{activePortal.kocCandidates.length} KOC
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-900 block">Duyệt KOCs</span>
              <p className="text-2xs text-slate-500">Thẩm định profile và mức độ phù hợp</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-slate-500 uppercase">Chặng 3</span>
                <span className="text-2xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activePortal.scripts.filter(s => s.status === 'APPROVED').length}/{activePortal.scripts.length} Kịch bản
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-900 block">Thẩm định kịch bản</span>
              <p className="text-2xs text-slate-500">Góp ý Hook, Pain point, USP, CTA</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-slate-500 uppercase">Chặng 4</span>
                <span className="text-2xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  {activePortal.liveAiredVideosCount}/{activePortal.totalTargetVideos} Clips
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-900 block">Lên sóng &amp; Nghiệm thu</span>
              <p className="text-2xs text-slate-500">Đo lường Views, GMV và Spark Ads code</p>
            </div>
          </div>

          {/* Strategy Brief Context for Brand */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs text-xs space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Định Hướng Chiến Lược &amp; Sản Phẩm Trọng Tâm (Campaign Strategy):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-1">Thông điệp chủ đạo (Big Idea):</span>
                <p className="text-slate-600 leading-relaxed">{activePortal.bigIdea}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-1">Sản phẩm chủ lực (Focus SKUs):</span>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  {activePortal.focusSkus.map((sku, i) => (
                    <li key={i}>{sku}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* The 4-Tier Budget Breakdown Table */}
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-900">
                CƠ CẤU PHÂN BỔ NGÂN SÁCH THEO CẤP ĐỘ KOC (GROWTH DEMAND)
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('APPROVALS')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Xem mục cần duyệt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 pr-3">Phân loại KOC</th>
                  <th className="py-2.5 px-3">Số lượng Slot</th>
                  <th className="py-2.5 px-3">Định mức chi phí</th>
                  <th className="py-2.5 px-3">Tổng ngân sách</th>
                  <th className="py-2.5 px-3">Mục tiêu GMV</th>
                  <th className="py-2.5 pl-3">Trạng thái duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePortal.breakdownTiers.map(t => (
                  <tr key={t.tierLabel} className="hover:bg-slate-50/50">
                    <td className="py-3 pr-3 font-semibold text-slate-900">{t.tierLabel}</td>
                    <td className="py-3 px-3 font-mono">{t.targetCount} KOCs</td>
                    <td className="py-3 px-3 font-mono">{(t.estimatedAvgCost).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">{(t.allocatedBudget).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 px-3 font-mono text-blue-700">{(t.totalExpectedGmv).toLocaleString('vi-VN')} đ</td>
                    <td className="py-3 pl-3">
                      <span className="badge-emerald text-2xs px-2 py-0.5 rounded font-semibold">
                        Đã khớp ngân sách
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẦN DUYỆT NGAY (ACTION CENTER / PENDING APPROVALS)                  */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Notice banner if everything is approved */}
          {pendingApprovalsCount === 0 && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">
                Tuyệt vời! Quý Nhãn Hàng đã hoàn tất toàn bộ các mục cần phê duyệt!
              </h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Không còn kịch bản hay KOC nào đang chờ duyệt. Đội ngũ Upbase đang tiến hành quay dựng và chuẩn bị lịch lên sóng theo cam kết.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE_JOBS')}
                className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition"
              >
                <span>Xem các Job đang triển khai</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ITEM 1: PLAN APPROVAL (If not approved) */}
          {!isPlanApproved && (
            <div className="card-enterprise p-5 bg-amber-50/60 border border-amber-300 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Phê duyệt Kế Hoạch &amp; Ngân Sách Chiến Dịch
                      <span className="badge-amber text-2xs px-2 py-0.5 rounded font-semibold">Cần xử lý trước</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Tổng ngân sách: <strong>{(activePortal.totalBudget).toLocaleString('vi-VN')} đ</strong> • Mục tiêu GMV: <strong>{(activePortal.targetGmv).toLocaleString('vi-VN')} đ</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPlanRevisionModalOpen(true)}
                    className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Yêu cầu điều chỉnh
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePlan}
                    className="btn-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Duyệt thông qua kế hoạch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ITEM 2: PENDING KOC CANDIDATES */}
          {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').length > 0 && (
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Danh Sách KOC Chờ Nhãn Hàng Duyệt ({activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').length} KOCs)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Vui lòng duyệt danh sách để Upbase tiến hành gửi mẫu unboxing và chốt hợp đồng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'CHỜ_DUYỆT').map(koc => (
                  <div key={koc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {koc.stageName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{koc.stageName}</span>
                          <span className="text-2xs text-slate-500 font-mono">{koc.channelId}</span>
                        </div>
                      </div>
                      <span className="badge-slate text-2xs px-2 py-0.5 rounded font-semibold">{koc.tier}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-2xs py-2 border-y border-slate-200/80">
                      <div>
                        <span className="text-slate-500 block">Followers:</span>
                        <span className="font-semibold text-slate-800">{(koc.followers).toLocaleString('vi-VN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tỷ lệ tương tác:</span>
                        <span className="font-semibold text-emerald-600">{koc.engagementRate}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Lượt xem TB:</span>
                        <span className="font-semibold text-slate-800">{(koc.avgViews).toLocaleString('vi-VN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ngành hàng (Niche):</span>
                        <span className="font-semibold text-blue-700 truncate block">{koc.niche}</span>
                      </div>
                    </div>

                    <p className="text-2xs text-slate-600 italic">
                      Định dạng: "{koc.formatDescription}"
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingKoc(koc);
                          setSelectedRejectReason('Lệch định vị thương hiệu');
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                      >
                        Đổi KOC
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveKoc(koc.id)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-2xs"
                      >
                        Duyệt KOC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITEM 3: PENDING SCRIPT REVIEWS */}
          {activePortal.scripts.filter(s => s.status !== 'APPROVED').length > 0 && (
            <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Thẩm Định Kịch Bản Video ({activePortal.scripts.filter(s => s.status !== 'APPROVED').length} Kịch bản chờ duyệt)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Góp ý trực tiếp theo 4 phân đoạn (Hook, Pain point, USP, CTA) hoặc phê duyệt để KOC tiến hành quay.
                    </p>
                  </div>
                </div>
              </div>

              {/* Script selector tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {activePortal.scripts.filter(s => s.status !== 'APPROVED').map(sc => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveScriptId(sc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border whitespace-nowrap ${
                      activeScript?.id === sc.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {sc.kocStageName} ({sc.productName.slice(0, 18)}...)
                  </button>
                ))}
              </div>

              {activeScript && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{activeScript.kocStageName}</span>
                      <span className="text-slate-500 ml-2">Sản phẩm: {activeScript.productName} ({activeScript.videoDuration})</span>
                    </div>
                    <span className="badge-amber text-2xs px-2 py-0.5 rounded font-semibold">
                      Lần sửa: {activeScript.revisionCount}/2
                    </span>
                  </div>

                  {/* 4-part script breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200">
                      <span className="font-bold text-amber-900 block mb-1">1. Hook mở đầu (3 giây đầu):</span>
                      <p className="text-slate-800 leading-relaxed">{activeScript.hook}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200">
                      <span className="font-bold text-rose-900 block mb-1">2. Nỗi đau khách hàng (Pain Point):</span>
                      <p className="text-slate-800 leading-relaxed">{activeScript.painPoint}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                      <span className="font-bold text-emerald-900 block mb-1">3. Giải pháp &amp; USP sản phẩm:</span>
                      <p className="text-slate-800 leading-relaxed">{activeScript.solutionAndUsp}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                      <span className="font-bold text-blue-900 block mb-1">4. Lời kêu gọi mua hàng (CTA):</span>
                      <p className="text-slate-800 leading-relaxed">{activeScript.callToAction}</p>
                    </div>
                  </div>

                  {/* Feedback Form */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Góp ý chỉnh sửa cho KOC:
                      </span>
                      <div className="flex items-center gap-1.5 text-2xs">
                        <span className="text-slate-500">Phần góp ý:</span>
                        <select
                          value={feedbackSection}
                          onChange={(e: any) => setFeedbackSection(e.target.value)}
                          className="bg-white text-slate-800 border border-slate-300 rounded-lg px-2 py-0.5 text-2xs"
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
                      placeholder="Nhập nội dung chỉnh sửa cụ thể cho KOC..."
                      className="w-full text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={!scriptFeedbackText.trim() || activeScript.revisionCount >= 2}
                        onClick={handleSubmitScriptFeedback}
                        className="btn-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Gửi yêu cầu sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveScript(activeScript.id)}
                        className="btn-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Phê duyệt kịch bản này
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÁC JOB ĐANG LÀM (ACTIVE JOBS & PIPELINE)                          */}
      {/* ========================================================================= */}
      {activeTab === 'ACTIVE_JOBS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm KOC hoặc sản phẩm..."
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                className="text-xs bg-transparent text-slate-800 placeholder-slate-400 outline-none w-48 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-2xs">Lọc trạng thái:</span>
              <button
                type="button"
                onClick={() => setJobStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({activePortal.scripts.length})
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('SCRIPT')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'SCRIPT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kịch bản
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('DRAFT')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'DRAFT' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đang quay/nháp
              </button>
              <button
                type="button"
                onClick={() => setJobStatusFilter('AIRED')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold transition ${
                  jobStatusFilter === 'AIRED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đã lên sóng ({activePortal.liveAiredVideosCount})
              </button>
            </div>
          </div>

          {/* Job List */}
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <div key={job.id} className="card-enterprise p-4 bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {job.kocStageName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{job.kocStageName}</span>
                        <span className="text-2xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{job.channelId}</span>
                        <span className={`text-2xs font-semibold px-2 py-0.5 rounded border ${
                          job.publishedVideoUrl 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : job.draftVideoUrl
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {job.publishedVideoUrl ? 'ĐÃ LÊN SÓNG' : job.draftVideoUrl ? 'CÓ CLIP NHÁP' : 'ĐANG VIẾT KỊCH BẢN'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{job.productName} ({job.videoDuration})</p>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-2">
                    {job.publishedVideoUrl ? (
                      <div className="text-right mr-2 text-xs">
                        <span className="text-emerald-700 font-bold block">
                          {(job.gmv || 0).toLocaleString('vi-VN')} đ GMV
                        </span>
                        <span className="text-2xs text-slate-500">{(job.views || 0).toLocaleString('vi-VN')} views</span>
                      </div>
                    ) : null}

                    {job.draftVideoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNotify) onNotify(`Đang mở clip nháp có Watermark bản quyền Upbase của ${job.kocStageName}.`, 'info');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition"
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
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 text-xs shadow-2xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem trên TikTok
                      </a>
                    )}
                  </div>
                </div>

                {/* Pipeline Progression Steps */}
                <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-100 text-2xs">
                  <div className="p-1.5 rounded bg-emerald-50 text-emerald-800 font-medium text-center border border-emerald-200">
                    1. Chốt KOC ✓
                  </div>
                  <div className="p-1.5 rounded bg-emerald-50 text-emerald-800 font-medium text-center border border-emerald-200">
                    2. Gửi hàng mẫu ✓
                  </div>
                  <div className={`p-1.5 rounded font-medium text-center border ${
                    job.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    3. Kịch bản {job.status === 'APPROVED' ? '✓' : '...'}
                  </div>
                  <div className={`p-1.5 rounded font-medium text-center border ${
                    job.draftVideoUrl ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    4. Quay nháp {job.draftVideoUrl ? '✓' : '...'}
                  </div>
                  <div className={`p-1.5 rounded font-medium text-center border ${
                    job.publishedVideoUrl ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200'
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
      {/* TAB 4: TRAO ĐỔI QUA LẠI (TWO-WAY DISCUSSION & CHAT)                       */}
      {/* ========================================================================= */}
      {activeTab === 'DISCUSSION' && (
        <div className="card-enterprise bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-col h-[600px] overflow-hidden animate-in fade-in duration-150">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                UP
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Kênh Trao Đổi Chiến Dịch: {activePortal.brandName} ⇄ Upbase Operations
                </h4>
                <p className="text-2xs text-slate-500">
                  Người phụ trách: <strong>{activePortal.accountPic}</strong> (Account Lead) &amp; <strong>{activePortal.bookingPic}</strong> (Booking Lead)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Cam kết phản hồi &lt; 2h
              </span>
            </div>
          </div>

          {/* Chat Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/30">
            {chatMessages.map(msg => {
              const isBrand = msg.sender === 'BRAND';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isBrand ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-2xs text-white shrink-0 ${
                    isBrand ? 'bg-indigo-600' : 'bg-blue-600'
                  }`}>
                    {msg.avatarText}
                  </div>
                  <div className={`max-w-[75%] space-y-1 ${isBrand ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-2xs text-slate-400 ${isBrand ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className={`p-3.5 rounded-2xl leading-relaxed text-xs shadow-2xs ${
                      isBrand 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              value={newChatText}
              onChange={(e) => setNewChatText(e.target.value)}
              placeholder="Nhập nội dung trao đổi với đội ngũ Upbase..."
              className="flex-1 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!newChatText.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ & NGHIỆM THU (HISTORY & ARCHIVES)                          */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="card-enterprise p-5 bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  LỊCH SỬ CÁC CHIẾN DỊCH ĐÃ THỰC HIỆN VỚI UPBASE
                </h4>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Lưu trữ kết quả, báo cáo nghiệm thu và hóa đơn tài chính của các chiến dịch trước đây.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNotify) onNotify('Đang xuất biên bản nghiệm thu tổng hợp định dạng PDF...', 'success');
                }}
                className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Tải Báo Cáo Nghiệm Thu Tổng Hợp (.PDF)</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Chiến dịch Mega Sale 9.9 - Siêu Tiệc Thương Hiệu</span>
                    <span className="text-2xs text-slate-500 ml-2">Tháng 09/2026</span>
                  </div>
                  <span className="badge-emerald text-2xs px-2.5 py-0.5 rounded font-semibold self-start sm:self-auto">
                    ĐÃ NGHIỆM THU &amp; QUYẾT TOÁN 100%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-2xs">Ngân sách giải ngân:</span>
                    <span className="font-bold text-slate-900 font-mono">180.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">Doanh thu GMV thực tế:</span>
                    <span className="font-bold text-emerald-600 font-mono">924.500.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">Lượt xem video tích lũy:</span>
                    <span className="font-bold text-purple-600 font-mono">1.850.000 views</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">Quy mô Video:</span>
                    <span className="font-bold text-slate-900 font-mono">35 Clips (100% on-time)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Chiến dịch Khởi Động Mùa Tựu Trường Kutieskin</span>
                    <span className="text-2xs text-slate-500 ml-2">Tháng 08/2026</span>
                  </div>
                  <span className="badge-emerald text-2xs px-2.5 py-0.5 rounded font-semibold self-start sm:self-auto">
                    ĐÃ NGHIỆM THU
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-2xs">Ngân sách giải ngân:</span>
                    <span className="font-bold text-slate-900 font-mono">120.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">Doanh thu GMV thực tế:</span>
                    <span className="font-bold text-emerald-600 font-mono">652.000.000 đ</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">Lượt xem video tích lũy:</span>
                    <span className="font-bold text-purple-600 font-mono">1.210.000 views</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-2xs">Quy mô Video:</span>
                    <span className="font-bold text-slate-900 font-mono">24 Clips</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS (PLAN REVISION & KOC REJECT)                                    */}
      {/* ========================================================================= */}

      {/* Modal 1: Plan Revision Request */}
      {isPlanRevisionModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPlanRevisionModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card-enterprise w-full max-w-lg p-6 bg-white border border-slate-200 shadow-2xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Yêu cầu điều chỉnh kế hoạch ngân sách
              </h4>
              <button
                type="button"
                onClick={() => setIsPlanRevisionModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vui lòng nhập chi tiết định hướng quý nhãn hàng muốn thay đổi (ví dụ: muốn dồn thêm ngân sách vào Micro KOC, giảm bớt Celeb, hoặc đổi tệp sáng tạo).
            </p>

            <textarea
              rows={4}
              value={planRevisionNotes}
              onChange={(e) => setPlanRevisionNotes(e.target.value)}
              placeholder="Nhập góp ý cụ thể cho Booking Team..."
              className="w-full text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPlanRevisionModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!planRevisionNotes.trim()}
                onClick={handleRequestPlanRevision}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition cursor-pointer shadow-2xs"
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingKoc(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card-enterprise w-full max-w-md p-6 bg-white border border-slate-200 shadow-2xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Đề Xuất Đổi KOC: {rejectingKoc.stageName}
              </h4>
              <button
                type="button"
                onClick={() => setRejectingKoc(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vui lòng chọn lý do quý nhãn hàng không đồng ý KOC này để Upbase đề xuất Creator phù hợp hơn:
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
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition text-slate-800"
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={selectedRejectReason === reason}
                    onChange={() => setSelectedRejectReason(reason as BrandRejectReasonType)}
                    className="accent-blue-600 cursor-pointer"
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
                  className="w-full text-xs bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none mt-2"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRejectingKoc(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKoc}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition cursor-pointer"
              >
                Xác nhận đổi KOC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};