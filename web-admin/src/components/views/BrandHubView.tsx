'use client';

import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import {
  BrandCampaignPortalData,
  BrandKocCandidate,
  BrandScriptItem,
  BrandRejectReasonType
} from '../../lib/types';
import { INITIAL_BRAND_PORTAL_DATA } from '../../lib/mockData';

interface BrandHubViewProps {
  onNotify?: (msg: string) => void;
}

export const BrandHubView: React.FC<BrandHubViewProps> = ({ onNotify }) => {
  const [portals, setPortals] = useState<BrandCampaignPortalData[]>(INITIAL_BRAND_PORTAL_DATA);
  const [selectedPortalId, setSelectedPortalId] = useState<string>(INITIAL_BRAND_PORTAL_DATA[0].id);

  const activePortal = portals.find(p => p.id === selectedPortalId) || portals[0];

  // Active Stage Tab: STAGE_1_PLAN | STAGE_2_KOCS | STAGE_3_SCRIPTS | STAGE_4_COCKPIT
  const [activeStage, setActiveStage] = useState<'STAGE_1_PLAN' | 'STAGE_2_KOCS' | 'STAGE_3_SCRIPTS' | 'STAGE_4_COCKPIT'>('STAGE_1_PLAN');

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

  // Copy Magic Link state
  const [copiedLink, setCopiedLink] = useState(false);

  // Check if Stage 1 is completed
  const isPlanApproved = activePortal.planApprovalStatus === 'BRAND_PLAN_APPROVED';

  // Handle Switch Brand Portal
  const handleSwitchPortal = (portalId: string) => {
    setSelectedPortalId(portalId);
    const target = portals.find(p => p.id === portalId);
    if (target) {
      setActiveScriptId(target.scripts[0]?.id || '');
      // If target plan is pending, force jump to Stage 1
      if (target.planApprovalStatus !== 'BRAND_PLAN_APPROVED') {
        setActiveStage('STAGE_1_PLAN');
      }
    }
  };

  // Stage 1 Actions: Approve or Request Revision
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
      onNotify(`🎉 Quý Nhãn Hàng ${activePortal.brandName} đã chính thức phê duyệt Kế hoạch Ngân sách & Cơ cấu KOC! Chặng 2 (Duyệt Danh Sách KOC) đã được mở khóa.`);
    }
    // Automatically advance to Stage 2
    setActiveStage('STAGE_2_KOCS');
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
      onNotify(`📝 Đã ghi nhận phản hồi yêu cầu điều chỉnh Kế hoạch từ Nhãn hàng ${activePortal.brandName}. Booking Lead sẽ cập nhật lại trong 12 giờ.`);
    }
    setIsPlanRevisionModalOpen(false);
  };

  // Stage 2 Actions: Approve or Reject KOC
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
      onNotify(`✅ Brand đã duyệt KOC! Hệ thống kích hoạt ký hợp đồng và gửi hàng mẫu.`);
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
      onNotify(`🔄 Đã từ chối KOC ${rejectingKoc.stageName} (Lý do: ${finalReason}). Đội ngũ Booking sẽ đề xuất KOC thay thế trong 24 giờ.`);
    }
    setRejectingKoc(null);
    setRejectCustomNote('');
  };

  // Stage 3 Actions: Approve or Request Script Revision
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
      onNotify(`🎬 Brand đã phê duyệt kịch bản video của KOC ${activeScript?.kocStageName}! KOC được phép tiến hành quay video.`);
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
      onNotify(`📝 Đã gửi góp ý kịch bản cho KOC ${activeScript.kocStageName} (Lần sửa: ${activeScript.revisionCount + 1}/2). Content Lead sẽ hỗ trợ KOC hoàn thiện.`);
    }
    setScriptFeedbackText('');
  };

  const handleCopyMagicLink = () => {
    navigator.clipboard.writeText(`https://portal.upbase.asia/client/${activePortal.brandId}?token=sec_live_202610_upbase`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    if (onNotify) {
      onNotify('🔗 Đã sao chép Magic Link dành cho Brand! Bạn có thể gửi link này qua Zalo/Email cho Brand Manager.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. BRAND PORTAL TOP HEADER & SECURE CLIENT IDENTIFIER                    */}
      {/* ========================================================================= */}
      <div className="card-enterprise p-5 bg-[#0e1320] border-[#1e293b]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-base shadow-md border border-blue-400/30">
              {activePortal.brandLogoText.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {activePortal.brandName}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cổng Tác Nghiệp Khách Hàng (Brand Client Portal)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {activePortal.campaignCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Chiến Dịch: <strong className="text-slate-200">{activePortal.campaignTitle}</strong> ({activePortal.month})
              </p>
            </div>
          </div>

          {/* Brand Switcher & Magic Link Share Button */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* Switch Brand Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0b1120] border border-[#1e293b] rounded-md px-2.5 py-1 text-xs">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={activePortal.id}
                onChange={(e) => handleSwitchPortal(e.target.value)}
                className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                {portals.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0b1120] text-slate-200">
                    {p.brandName} ({p.campaignCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Share Magic Link */}
            <button
              type="button"
              onClick={handleCopyMagicLink}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-md text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Đã Sao Chép Link' : 'Copy Magic Link Brand'}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Support Team & SLA Commitment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-1 text-xs">
          <div className="p-2.5 rounded-md bg-[#0b1120] border border-[#1e293b] flex items-center justify-between">
            <span className="text-slate-400">Account Lead Upbase:</span>
            <span className="font-semibold text-white">{activePortal.accountPic}</span>
          </div>
          <div className="p-2.5 rounded-md bg-[#0b1120] border border-[#1e293b] flex items-center justify-between">
            <span className="text-slate-400">Booking Execution Lead:</span>
            <span className="font-semibold text-white">{activePortal.bookingPic}</span>
          </div>
          <div className="p-2.5 rounded-md bg-[#0b1120] border border-[#1e293b] flex items-center justify-between">
            <span className="text-slate-400">Cam Kết SLA Phản Hồi:</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Tối đa 24h / Lần duyệt
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 4-STAGE GATED STEPPER NAVIGATION                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stage 1 Button */}
        <button
          onClick={() => setActiveStage('STAGE_1_PLAN')}
          className={`p-3 rounded-md border text-left transition flex items-start gap-3 relative ${
            activeStage === 'STAGE_1_PLAN'
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-sm'
              : 'bg-[#0e1320] border-[#1e293b] hover:bg-[#111827]'
          }`}
        >
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
            isPlanApproved ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
          }`}>
            {isPlanApproved ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
              Chặng 1 (Bắt Buộc Trước)
            </span>
            <span className="text-xs font-bold text-white block mt-0.5">
              Duyệt Kế Hoạch & Ngân Sách
            </span>
            <span className={`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.2 rounded border ${
              isPlanApproved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
              activePortal.planApprovalStatus === 'BRAND_PLAN_REVISION_REQUESTED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
              'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
            }`}>
              {isPlanApproved ? 'Đã Phê Duyệt' :
               activePortal.planApprovalStatus === 'BRAND_PLAN_REVISION_REQUESTED' ? 'Đang Yêu Cầu Sửa' : 'Chờ Brand Duyệt'}
            </span>
          </div>
        </button>

        {/* Stage 2 Button (Gated by Stage 1) */}
        <button
          onClick={() => {
            if (isPlanApproved) setActiveStage('STAGE_2_KOCS');
          }}
          disabled={!isPlanApproved}
          className={`p-3 rounded-md border text-left transition flex items-start gap-3 relative ${
            !isPlanApproved
              ? 'bg-[#0a0d14] border-[#1e293b]/50 opacity-60 cursor-not-allowed'
              : activeStage === 'STAGE_2_KOCS'
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-sm'
              : 'bg-[#0e1320] border-[#1e293b] hover:bg-[#111827]'
          }`}
        >
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
            !isPlanApproved ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white'
          }`}>
            {!isPlanApproved ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : '2'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
              Chặng 2
            </span>
            <span className="text-xs font-bold text-white block mt-0.5">
              Duyệt Danh Sách KOC
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {!isPlanApproved ? 'Khóa (Cần duyệt Chặng 1)' : `${activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'ĐÃ_DUYỆT').length}/${activePortal.kocCandidates.length} KOCs đã duyệt`}
            </span>
          </div>
        </button>

        {/* Stage 3 Button (Gated by Stage 1) */}
        <button
          onClick={() => {
            if (isPlanApproved) setActiveStage('STAGE_3_SCRIPTS');
          }}
          disabled={!isPlanApproved}
          className={`p-3 rounded-md border text-left transition flex items-start gap-3 relative ${
            !isPlanApproved
              ? 'bg-[#0a0d14] border-[#1e293b]/50 opacity-60 cursor-not-allowed'
              : activeStage === 'STAGE_3_SCRIPTS'
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-sm'
              : 'bg-[#0e1320] border-[#1e293b] hover:bg-[#111827]'
          }`}
        >
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
            !isPlanApproved ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white'
          }`}>
            {!isPlanApproved ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : '3'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
              Chặng 3
            </span>
            <span className="text-xs font-bold text-white block mt-0.5">
              Thẩm Định Kịch Bản (24h)
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {!isPlanApproved ? 'Khóa (Cần duyệt Chặng 1)' : `${activePortal.scripts.filter(s => s.status === 'APPROVED').length}/${activePortal.scripts.length} Kịch bản đã duyệt`}
            </span>
          </div>
        </button>

        {/* Stage 4 Button */}
        <button
          onClick={() => {
            if (isPlanApproved) setActiveStage('STAGE_4_COCKPIT');
          }}
          disabled={!isPlanApproved}
          className={`p-3 rounded-md border text-left transition flex items-start gap-3 relative ${
            !isPlanApproved
              ? 'bg-[#0a0d14] border-[#1e293b]/50 opacity-60 cursor-not-allowed'
              : activeStage === 'STAGE_4_COCKPIT'
              ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-sm'
              : 'bg-[#0e1320] border-[#1e293b] hover:bg-[#111827]'
          }`}
        >
          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
            !isPlanApproved ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white'
          }`}>
            {!isPlanApproved ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : '4'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">
              Chặng 4
            </span>
            <span className="text-xs font-bold text-white block mt-0.5">
              Nghiệm Thu & Báo Cáo Live
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {!isPlanApproved ? 'Khóa' : `${activePortal.liveAiredVideosCount}/${activePortal.totalTargetVideos} Clips Đã Air`}
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. STAGE CONTENT AREA                                                     */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* CHẶNG 1: DUYỆT KẾ HOẠCH PHÂN BỔ NGÂN SÁCH (MẶC ĐỊNH BƯỚC ĐẦU TIÊN)        */}
      {/* ------------------------------------------------------------------------- */}
      {activeStage === 'STAGE_1_PLAN' && (
        <div className="space-y-5">
          {/* Plan Status Alert Banner */}
          <div className={`p-4 rounded-md border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isPlanApproved
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : activePortal.planApprovalStatus === 'BRAND_PLAN_REVISION_REQUESTED'
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-start gap-3">
              {isPlanApproved ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {isPlanApproved
                    ? `Kế Hoạch Đã Được Nhãn Hàng Phê Duyệt vào ngày ${activePortal.planApprovalDate}`
                    : activePortal.planApprovalStatus === 'BRAND_PLAN_REVISION_REQUESTED'
                    ? 'Đang chờ Booking Team điều chỉnh Kế hoạch theo phản hồi của bạn'
                    : 'YÊU CẦU BẮT BUỘC: Quý Nhãn Hàng Vui Lòng Phê Duyệt Kế Hoạch Trước'}
                </h4>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">
                  {isPlanApproved
                    ? 'Chặng 1 đã hoàn tất! Quý Nhãn Hàng có thể chuyển sang Chặng 2 để duyệt từng gương mặt KOC cụ thể trong danh sách đề xuất.'
                    : activePortal.planApprovalStatus === 'BRAND_PLAN_REVISION_REQUESTED'
                    ? `Góp ý của bạn: "${activePortal.planFeedbackNotes}"`
                    : 'Sau khi Quý Nhãn Hàng duyệt Kế hoạch phân bổ ngân sách & số lượng KOC theo từng Level dưới đây, đội ngũ Booking sẽ mở khóa danh sách KOC cụ thể để bạn thẩm định.'}
                </p>
              </div>
            </div>

            {/* Stage 1 Actions */}
            {!isPlanApproved && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPlanRevisionModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Yêu Cầu Chỉnh Sửa
                </button>
                <button
                  type="button"
                  onClick={handleApprovePlan}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  ✅ Duyệt Thông Qua Kế Hoạch
                </button>
              </div>
            )}
          </div>

          {/* Campaign Strategy & KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Tổng Ngân Sách Gói Chiến Dịch</span>
              <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
                {(activePortal.totalBudget).toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Đã bao gồm chi phí thù lao & vận hành</span>
            </div>

            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Mục Tiêu Doanh Thu GMV Dự Phóng</span>
              <span className="text-lg font-black font-mono text-blue-400 mt-1 block">
                {(activePortal.targetGmv).toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Tỷ lệ ROI kỳ vọng: 5.0x</span>
            </div>

            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Tỷ Lệ CIR Mục Tiêu (Cost/Revenue)</span>
              <span className="text-lg font-black font-mono text-amber-400 mt-1 block">
                {activePortal.targetCir.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Chi phí trên mỗi 100đ doanh thu</span>
            </div>

            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Quy Mô Creator Triển Khai</span>
              <span className="text-lg font-black font-mono text-purple-400 mt-1 block">
                {activePortal.totalTargetVideos} Clips
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Trải dài trên 4 cấp độ KOC</span>
            </div>
          </div>

          {/* Strategy Brief Context for Brand */}
          <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b] text-xs space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Định Hướng Chiến Lược & Sản Phẩm Trọng Tâm (Campaign Strategy):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-md bg-[#0b1120] border border-[#1e293b]">
                <span className="font-bold text-slate-300 block mb-1">🎯 Thông điệp chủ đạo (Big Idea):</span>
                <p className="text-slate-400 leading-relaxed">{activePortal.bigIdea}</p>
              </div>
              <div className="p-3 rounded-md bg-[#0b1120] border border-[#1e293b]">
                <span className="font-bold text-slate-300 block mb-1">📦 Sản phẩm chủ lực (Hero SKUs):</span>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                  {activePortal.focusSkus.map((sku, i) => (
                    <li key={i}>{sku}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* The 4-Tier Budget Breakdown Table */}
          <div className="card-enterprise p-5 bg-[#0e1320] border-[#1e293b] overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e293b]">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  CƠ CẤU PHÂN BỔ 4 CẤP ĐỘ KOC / KOL CHIẾN DỊCH
                </h4>
                <p className="text-[11px] text-slate-400">
                  Số lượng và vai trò chiến lược được thiết kế riêng biệt để cân bằng giữa Độ Phủ Nhận Diện và Hiệu Quả Doanh Thu.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#0b1120] text-emerald-400 border border-[#1e293b]">
                Bảo vệ biên độ an toàn ngân sách: 100%
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e293b] text-slate-400 bg-[#0b1120]">
                  <th className="py-2.5 px-3 font-semibold">Cấp Độ KOC / KOL</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Số Lượng Creator</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Ngân Sách Phân Bổ</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tỷ Trọng (%)</th>
                  <th className="py-2.5 px-3 font-semibold">Vai Trò & Định Hướng Chiến Lược</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Mục Tiêu ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {activePortal.breakdownTiers.map((tier) => {
                  const share = ((tier.allocatedBudget / activePortal.totalBudget) * 100).toFixed(1);
                  return (
                    <tr key={tier.tier} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-xs">{tier.tierLabel}</div>
                        <div className="text-[10px] text-slate-400">{tier.salaryGradeLabel}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-400">
                        {tier.targetCount} Creators
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {(tier.allocatedBudget).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {share}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs">
                        {tier.notes}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {tier.historicalRoiBenchmark}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1e293b] bg-[#0b1120]/80 font-bold text-xs">
                  <td className="py-3 px-3 text-white">TỔNG CỘNG CHIẾN DỊCH</td>
                  <td className="py-3 px-3 text-center text-blue-400">{activePortal.totalTargetVideos} Clips</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400">
                    {(activePortal.totalBudget).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-3 text-center text-slate-300">100.0%</td>
                  <td className="py-3 px-3 text-slate-400">Đã chốt cấu trúc chiến lược</td>
                  <td className="py-3 px-3 text-center text-emerald-400">5.0x</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* CHẶNG 2: DUYỆT DANH SÁCH KOC ĐỀ XUẤT (GATED BY STAGE 1)                    */}
      {/* ------------------------------------------------------------------------- */}
      {activeStage === 'STAGE_2_KOCS' && (
        <div className="space-y-4">
          <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b] flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                DANH SÁCH KOC / KOL ĐỀ XUẤT CHO CHIẾN DỊCH
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các Creator được chọn lọc kỹ càng dựa trên chỉ số tệp người xem, lịch sử chuyển đổi và độ an toàn thương hiệu.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Đã duyệt:{' '}
              <strong className="text-emerald-400">
                {activePortal.kocCandidates.filter(k => k.brandApprovalStatus === 'ĐÃ_DUYỆT').length}
              </strong>
              /{activePortal.kocCandidates.length} KOCs
            </div>
          </div>

          {/* KOC Candidates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePortal.kocCandidates.map(koc => {
              const isApproved = koc.brandApprovalStatus === 'ĐÃ_DUYỆT';
              const isRejected = koc.brandApprovalStatus === 'TỪ_CHỐI';

              return (
                <div
                  key={koc.id}
                  className={`card-enterprise p-4 border transition flex flex-col justify-between ${
                    isApproved ? 'bg-emerald-950/20 border-emerald-500/40' :
                    isRejected ? 'bg-rose-950/20 border-rose-500/40 opacity-75' :
                    'bg-[#0e1320] border-[#1e293b]'
                  }`}
                >
                  <div>
                    {/* Top Row: Tier & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {koc.tierLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isApproved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        isRejected ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {isApproved ? 'Đã Đồng Ý' : isRejected ? 'Đã Từ Chối' : 'Chờ Brand Duyệt'}
                      </span>
                    </div>

                    {/* Creator Identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-slate-800 text-blue-400 font-bold flex items-center justify-center text-sm border border-slate-700">
                        {koc.stageName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{koc.stageName}</h4>
                        <a
                          href={koc.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          {koc.channelId}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-2 rounded-md bg-[#0b1120] text-center text-[11px] border border-[#1e293b]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Followers</span>
                        <span className="font-bold text-white">{(koc.followers / 1000).toFixed(0)}K</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">View TB</span>
                        <span className="font-bold text-blue-400">{(koc.avgViews / 1000).toFixed(0)}K</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Tương Tác</span>
                        <span className="font-bold text-emerald-400">{koc.engagementRate}%</span>
                      </div>
                    </div>

                    {/* Format Description */}
                    <p className="text-[11px] text-slate-300 bg-[#0b1120]/60 p-2 rounded border border-[#1e293b]/70">
                      <strong>Quyền lợi:</strong> {koc.formatDescription}
                    </p>

                    {/* Sample Videos */}
                    <div className="mt-2.5 text-[11px]">
                      <span className="text-slate-400 block mb-1 font-semibold">Clip mẫu tương tự:</span>
                      <div className="space-y-1">
                        {koc.sampleVideoUrls.map((sample, i) => (
                          <a
                            key={i}
                            href={sample.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300 block truncate flex items-center gap-1 bg-[#0b1120] px-2 py-1 rounded"
                          >
                            <Play className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{sample.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Rejection Note if any */}
                    {isRejected && (
                      <div className="mt-2 text-[10px] text-rose-300 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                        <strong>Lý do từ chối:</strong> {koc.rejectReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectingKoc(koc)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-800/50 transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Đổi KOC Khác
                    </button>
                    <button
                      type="button"
                      disabled={isApproved}
                      onClick={() => handleApproveKoc(koc.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isApproved ? 'Đã Đồng Ý' : 'Đồng Ý KOC Này'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* CHẶNG 3: THẨM ĐỊNH KỊCH BẢN (SLA 24H)                                     */}
      {/* ------------------------------------------------------------------------- */}
      {activeStage === 'STAGE_3_SCRIPTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Script List Sidebar */}
          <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#1e293b]">
              Kịch Bản Cần Phê Duyệt ({activePortal.scripts.length})
            </h4>

            <div className="space-y-2">
              {activePortal.scripts.map(s => {
                const isSelected = s.id === activeScript?.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveScriptId(s.id)}
                    className={`p-3 rounded-md border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                        : 'bg-[#0b1120] border-[#1e293b] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-white">{s.kocStageName}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        s.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                        s.status === 'REVISION_REQUESTED' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {s.status === 'APPROVED' ? 'Đã Duyệt' : s.status === 'REVISION_REQUESTED' ? 'Đang Sửa' : 'Chờ Duyệt'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{s.productName}</p>
                    <span className="text-[10px] text-amber-400 block mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      SLA còn: {s.remainingHours} giờ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Script Review Detail */}
          {activeScript && (
            <div className="lg:col-span-2 space-y-4">
              <div className="card-enterprise p-5 bg-[#0e1320] border-[#1e293b]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1e293b]">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {activeScript.dealCode}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      Kịch bản Video của {activeScript.kocStageName} ({activeScript.videoDuration})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Sản phẩm: {activeScript.productName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      SLA: {activeScript.remainingHours}h còn lại
                    </span>
                  </div>
                </div>

                {/* 4-Part Script Structure */}
                <div className="space-y-3 mt-4 text-xs">
                  {/* Part 1: Hook */}
                  <div className="p-3.5 rounded-md bg-[#0b1120] border border-[#1e293b]">
                    <span className="font-bold text-amber-400 block text-xs uppercase mb-1">
                      1. Đoạn Mở Đầu (Hook 3s Đầu):
                    </span>
                    <p className="text-slate-200 leading-relaxed font-medium">{activeScript.hook}</p>
                  </div>

                  {/* Part 2: Pain Point */}
                  <div className="p-3.5 rounded-md bg-[#0b1120] border border-[#1e293b]">
                    <span className="font-bold text-rose-400 block text-xs uppercase mb-1">
                      2. Nỗi Đau Khách Hàng (Pain Point):
                    </span>
                    <p className="text-slate-200 leading-relaxed">{activeScript.painPoint}</p>
                  </div>

                  {/* Part 3: Solution & USP */}
                  <div className="p-3.5 rounded-md bg-[#0b1120] border border-[#1e293b]">
                    <span className="font-bold text-emerald-400 block text-xs uppercase mb-1">
                      3. Giải Pháp & Điểm Mạnh Sản Phẩm (USP):
                    </span>
                    <p className="text-slate-200 leading-relaxed">{activeScript.solutionAndUsp}</p>
                  </div>

                  {/* Part 4: CTA */}
                  <div className="p-3.5 rounded-md bg-[#0b1120] border border-[#1e293b]">
                    <span className="font-bold text-blue-400 block text-xs uppercase mb-1">
                      4. Lời Kêu Gọi Mua Hàng (Call To Action - CTA):
                    </span>
                    <p className="text-slate-200 leading-relaxed">{activeScript.callToAction}</p>
                  </div>
                </div>

                {/* Existing Feedback if any */}
                {activeScript.brandFeedback && (
                  <div className="mt-4 p-3 rounded-md bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200">
                    <strong>Góp ý gần nhất của Brand (Lần {activeScript.revisionCount}/2):</strong> {activeScript.brandFeedback}
                  </div>
                )}

                {/* Inline Feedback Form for Brand */}
                {activeScript.status !== 'APPROVED' && (
                  <div className="mt-5 pt-4 border-t border-[#1e293b] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        Góp Ý Chỉnh Sửa Kịch Bản (Còn {2 - activeScript.revisionCount} lần sửa):
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-400">Chọn phần góp ý:</span>
                        <select
                          value={feedbackSection}
                          onChange={(e: any) => setFeedbackSection(e.target.value)}
                          className="bg-[#0b1120] text-slate-200 border border-[#1e293b] rounded px-2 py-0.5 text-xs outline-none"
                        >
                          <option value="HOOK">1. Hook</option>
                          <option value="PAIN">2. Pain Point</option>
                          <option value="USP">3. USP Sản Phẩm</option>
                          <option value="CTA">4. CTA</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={scriptFeedbackText}
                      onChange={(e) => setScriptFeedbackText(e.target.value)}
                      placeholder="Nhập nội dung cần điều chỉnh chi tiết cho KOC (VD: Đề nghị nhấn mạnh khả năng kiềm dầu 8 tiếng thay vì làm trắng)..."
                      className="w-full text-xs bg-[#0b1120] text-slate-200 border border-[#1e293b] rounded-md p-2.5 focus:border-blue-500 outline-none leading-relaxed"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={!scriptFeedbackText.trim() || activeScript.revisionCount >= 2}
                        onClick={handleSubmitScriptFeedback}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Gửi Yêu Cầu Sửa Kịch Bản
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveScript(activeScript.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ✅ Phê Duyệt Kịch Bản Này
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* CHẶNG 4: NGHIỆM THU VIDEO & LIVE CAMPAIGN COCKPIT                         */}
      {/* ------------------------------------------------------------------------- */}
      {activeStage === 'STAGE_4_COCKPIT' && (
        <div className="space-y-5">
          {/* Real-time Tickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Tiến Độ Lên Sóng Video</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black font-mono text-white">
                  {activePortal.liveAiredVideosCount}
                </span>
                <span className="text-xs text-slate-500">/ {activePortal.totalTargetVideos} Clips đã air</span>
              </div>
              <div className="w-full bg-[#0b1120] h-2 rounded-full mt-2 border border-[#1e293b]">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(activePortal.liveAiredVideosCount / activePortal.totalTargetVideos) * 100}%` }}
                />
              </div>
            </div>

            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Tổng Lượt Views Thực Tế</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black font-mono text-purple-400">
                  {(activePortal.totalAiredViews).toLocaleString('vi-VN')}
                </span>
                <span className="text-xs text-slate-500">Lượt xem</span>
              </div>
              <span className="text-[10px] text-emerald-400 mt-2 block flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Dữ liệu đồng bộ trực tiếp từ TikTok Analytics
              </span>
            </div>

            <div className="card-enterprise p-4 bg-[#0e1320] border-[#1e293b]">
              <span className="text-[11px] text-slate-400 block font-medium">Doanh Thu GMV Tạm Tính</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black font-mono text-emerald-400">
                  {(activePortal.totalAffiliateGmv).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">
                Phát sinh qua link Affiliate & Giỏ hàng
              </span>
            </div>
          </div>

          {/* Watermarked Draft Preview & Aired Clips Table */}
          <div className="card-enterprise p-5 bg-[#0e1320] border-[#1e293b]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-3 mb-3 border-b border-[#1e293b] flex items-center justify-between">
              <span>BẢNG THEO DÕI VIDEO & LINK LÊN SÓNG CHÍNH THỨC</span>
              <span className="text-xs font-normal text-slate-400">
                Nhãn hàng có thể bấm xem clip nháp hoặc link TikTok trực tiếp
              </span>
            </h4>

            <div className="space-y-3">
              {activePortal.scripts.map((sc, i) => (
                <div key={sc.id} className="p-3.5 rounded-md bg-[#0b1120] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{sc.kocStageName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {sc.channelId}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sc.publishedVideoUrl ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {sc.publishedVideoUrl ? 'ĐÃ LÊN SÓNG' : 'ĐANG QUAY / CHỜ DUYỆT NHÁP'}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1 line-clamp-1">{sc.productName} ({sc.videoDuration})</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {sc.publishedVideoUrl ? (
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold block">
                          {(sc.gmv || 0).toLocaleString('vi-VN')} đ GMV
                        </span>
                        <span className="text-[10px] text-slate-500">{(sc.views || 0).toLocaleString('vi-VN')} views</span>
                      </div>
                    ) : null}

                    {sc.draftVideoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNotify) onNotify(`🎬 Đang mở bản xem trước video nháp của ${sc.kocStageName} (Có Watermark Bản Quyền Upbase).`);
                        }}
                        className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Play className="w-3 h-3 text-amber-400" />
                        Xem Clip Nháp (Watermark)
                      </button>
                    )}

                    {sc.publishedVideoUrl && (
                      <a
                        href={sc.publishedVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 text-[11px] shadow-sm"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Xem Clip Trên TikTok
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS (PLAN REVISION & KOC REJECT)                                    */}
      {/* ========================================================================= */}

      {/* Modal 1: Plan Revision Request for Stage 1 */}
      {isPlanRevisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-enterprise w-full max-w-lg p-5 bg-[#0e1320] border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Yêu Cầu Điều Chỉnh Kế Hoạch Ngân Sách
              </h4>
              <button
                type="button"
                onClick={() => setIsPlanRevisionModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vui lòng nhập chi tiết định hướng Quý Nhãn Hàng muốn thay đổi (Ví dụ: muốn dồn thêm ngân sách vào Micro KOC, giảm bớt Celeb, hoặc đổi tệp sáng tạo).
            </p>

            <textarea
              rows={4}
              value={planRevisionNotes}
              onChange={(e) => setPlanRevisionNotes(e.target.value)}
              placeholder="Nhập góp ý cụ thể cho Booking Team..."
              className="w-full text-xs bg-[#0b1120] text-slate-200 border border-[#1e293b] rounded-md p-2.5 focus:border-blue-500 outline-none leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setIsPlanRevisionModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!planRevisionNotes.trim()}
                onClick={handleRequestPlanRevision}
                className="px-4 py-1.5 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
              >
                Gửi Yêu Cầu Chỉnh Sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: KOC Reject Reason for Stage 2 */}
      {rejectingKoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-enterprise w-full max-w-md p-5 bg-[#0e1320] border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                Đề Xuất Đổi KOC: {rejectingKoc.stageName}
              </h4>
              <button
                type="button"
                onClick={() => setRejectingKoc(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Vui lòng chọn lý do Quý Nhãn Hàng không đồng ý KOC này để Upbase đề xuất Creator phù hợp hơn:
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
                  className="flex items-center gap-2.5 p-2 rounded bg-[#0b1120] border border-[#1e293b] cursor-pointer hover:bg-slate-800/50"
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={selectedRejectReason === reason}
                    onChange={() => setSelectedRejectReason(reason as BrandRejectReasonType)}
                    className="accent-blue-500"
                  />
                  <span className="text-slate-200">{reason}</span>
                </label>
              ))}

              {selectedRejectReason === 'Lý do khác' && (
                <input
                  type="text"
                  placeholder="Nhập lý do cụ thể..."
                  value={rejectCustomNote}
                  onChange={(e) => setRejectCustomNote(e.target.value)}
                  className="w-full text-xs bg-[#0b1120] text-slate-200 border border-[#1e293b] rounded p-2 focus:border-blue-500 outline-none mt-2"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setRejectingKoc(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKoc}
                className="px-4 py-1.5 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Xác Nhận Đổi KOC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
