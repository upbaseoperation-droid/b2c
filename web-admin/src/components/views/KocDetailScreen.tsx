'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Users,
  Truck,
  FileText,
  PieChart,
  Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  TrendingUp,
  Tag,
  CreditCard,
  CheckCircle2,
  Plus,
  Clock,
  MessageSquare,
  Copy,
  Check,
  UserCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import { KocItem, BookingDealItem, UserProfile } from '../../lib/types';
import { formatVndShort } from '../../lib/format';

export interface OngoingKocJob {
  id: string;
  dealCode: string;
  jobId: string;
  brandName: string;
  storeName?: string;
  productName: string;
  campaignTitle: string;
  bookingBatch?: string;
  bookingFormat?: string;
  assignedStaff: string; // Tên Specialist PIC
  staffRole?: string;    // e.g. "Chuyên viên Booking B2C"
  staffLarkId?: string;  // e.g. "@lephuongthao"
  staffEmail?: string;   // e.g. "thao.lp@upbase.vn"
  leaderName?: string;   // e.g. "Nguyễn Thị Ngọc Tâm" hoặc "Đặng Thị Yến Nhi"
  currentStage: string;  // e.g. "3_CONTENT_SCRIPT"
  stageLabel: string;    // e.g. "Đang duyệt kịch bản video (SLA 24h)"
  pipelineStepNumber: number; // 1 to 5 (1: Tạo BO, 2: Ký HĐ & Cọc, 3: Kịch bản, 4: Gửi mẫu, 5: Lên bài)
  deadlinePost: string;
  remainingDaysText: string;
  isUrgent?: boolean;
  totalValue: number;
  advanceAmount?: number;
  sampleStatus: string;  // e.g. "Đã nhận mẫu tại nhà", "Kho Upbase đang gửi"
  internalCollaborationNote?: string; // Ghi chú phối hợp nội bộ
}

interface KocDetailScreenProps {
  koc: KocItem;
  allKocs?: KocItem[];
  allDeals?: BookingDealItem[];
  currentUser?: UserProfile;
  duplicateReasons?: string[];
  onBackToOverview: () => void;
  onSelectKoc: (koc: KocItem) => void;
  onOpenQuickBook?: (koc: KocItem) => void;
  onSyncKalodata?: (koc: KocItem) => void;
  onScanOcr?: (koc: KocItem) => void;
}

export const KocDetailScreen: React.FC<KocDetailScreenProps> = ({
  koc,
  allKocs = [],
  allDeals = [],
  currentUser,
  duplicateReasons,
  onBackToOverview,
  onSelectKoc,
  onOpenQuickBook,
  onSyncKalodata,
  onScanOcr,
}) => {
  const [activeTab, setActiveTab] = useState<'ECOMMERCE' | 'AUDIENCE' | 'LOGISTICS' | 'CONTRACT_HISTORY'>('ECOMMERCE');

  // Navigation between KOCs
  const currentIndex = allKocs.findIndex((k) => k.id === koc.id);
  const prevKoc = currentIndex > 0 ? allKocs[currentIndex - 1] : null;
  const nextKoc = currentIndex >= 0 && currentIndex < allKocs.length - 1 ? allKocs[currentIndex + 1] : null;

  // State hỗ trợ hỏi thăm đồng nghiệp qua Lark
  const [inquiryTargetJob, setInquiryTargetJob] = useState<OngoingKocJob | null>(null);
  const [copiedInquirySuccess, setCopiedInquirySuccess] = useState(false);

  // Trích xuất hoặc khởi tạo danh sách Job hiện đang chạy cùng Upbase
  const activeJobs = useMemo<OngoingKocJob[]>(() => {
    // 1. Tìm trong allDeals truyền vào từ hệ thống
    const matched = (allDeals || []).filter((d) => {
      const matchId = d.kocId === koc.id;
      const matchName =
        d.kocStageName &&
        koc.stageName &&
        d.kocStageName.trim().toLowerCase() === koc.stageName.trim().toLowerCase();
      const matchHandle =
        d.kocChannelId &&
        koc.channelId &&
        d.kocChannelId.replace('@', '').toLowerCase() === koc.channelId.replace('@', '').toLowerCase();
      const isOngoing = d.status !== 'COMPLETED' && d.status !== 'CANCELLED';
      return (matchId || matchName || matchHandle) && isOngoing;
    });

    if (matched.length > 0) {
      return matched.map((deal, idx) => {
        let step = 3;
        let stageLabel = deal.statusLabel || 'Đang thực hiện chiến dịch';
        if (deal.status === 'DRAFT' || deal.status === 'CONTACTING') {
          step = 1;
          stageLabel = 'Đang liên hệ & Chốt điều khoản';
        } else if (deal.status === 'TERMS_AGREED' || deal.status === 'CONTRACT_GENERATED' || deal.status === 'ADVANCE_PAID') {
          step = 2;
          stageLabel = 'Đã chốt điều khoản & Tạm ứng';
        } else if (deal.status === 'SCRIPT_PENDING' || deal.status === 'SCRIPT_APPROVED') {
          step = 3;
          stageLabel = 'Đang duyệt kịch bản video (SLA 24h)';
        } else if (deal.status === 'SAMPLE_SHIPPED' || deal.status === 'SAMPLE_RECEIVED') {
          step = 4;
          stageLabel = deal.sampleStatus === 'ĐÃ_NHẬN' ? 'KOC đã nhận mẫu (Đang quay video)' : 'Kho Upbase đang giao mẫu';
        } else if (deal.status === 'VIDEO_SUBMITTED' || deal.status === 'VIDEO_VERIFIED') {
          step = 5;
          stageLabel = 'Video đã đăng • Đang theo dõi số & Chạy Spark Ads';
        }

        const isTamLeader = ['ClubClio', 'Cindy Bloom', 'Mine', 'EUPC', 'L\'Occitane', 'Bye Bye Blemish', 'Rejuran'].includes(deal.brandName);
        const assignedStaffName = deal.assignedStaff || deal.bookingPic || (idx % 2 === 0 ? 'Lê Phương Thảo' : 'Lương Thị Như Quỳnh');

        return {
          id: deal.id,
          dealCode: deal.dealCode,
          jobId: deal.jobId || `ID26_${deal.dealCode}`,
          brandName: deal.brandName,
          storeName: deal.storeName || `${deal.brandName} Official Store`,
          productName: deal.productName || 'Sản phẩm chiến dịch trọng tâm',
          campaignTitle: deal.campaignTitle,
          bookingBatch: deal.bookingBatch || 'Đợt 1',
          bookingFormat: deal.bookingFormat || 'Booking Video KOC',
          assignedStaff: assignedStaffName,
          staffRole: 'Chuyên viên Booking B2C',
          staffLarkId: `@${assignedStaffName.toLowerCase().replace(/\s+/g, '')}`,
          staffEmail: `${assignedStaffName.toLowerCase().replace(/\s+/g, '')}@upbase.vn`,
          leaderName: isTamLeader ? 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm)' : 'Đặng Thị Yến Nhi (Trưởng phòng)',
          currentStage: deal.currentStage || '3_CONTENT_SCRIPT',
          stageLabel,
          pipelineStepNumber: step,
          deadlinePost: deal.deadlinePost || '20/10/2026',
          remainingDaysText: 'Còn 6 ngày',
          isUrgent: false,
          totalValue: deal.totalValue || koc.rateCardVideo,
          advanceAmount: deal.advanceAmount,
          sampleStatus: deal.sampleStatus === 'ĐÃ_NHẬN' ? 'Đã nhận mẫu tại nhà' : 'Kho Upbase đang phát hàng',
          internalCollaborationNote:
            deal.contentNote ||
            `KOC phản hồi nhanh trong 30 phút, đồng ý hỗ trợ gắn link giỏ hàng và cấp mã Spark Ads 30 ngày. Chuyên viên nhãn khác có thể ghép thêm 1 video để xin giảm giá combo 15%!`
        };
      });
    }

    // 2. Dự phòng thực tế cho KOC đang có nhãn hoặc KOC mẫu để nhân viên trải nghiệm ngay tính năng hỏi đồng nghiệp
    if (koc.brandName || koc.statusKoc === 'ĐANG_LIÊN_HỆ' || koc.statusKoc === 'ĐÃ_KÝ' || koc.id === 'koc-1' || koc.id === 'koc-2' || koc.id === 'koc-3') {
      const primaryBrand = koc.brandName || 'ClubClio';
      const isTam = ['ClubClio', 'Cindy Bloom', 'Mine', 'EUPC', 'L\'Occitane', 'Bye Bye Blemish', 'Rejuran'].includes(primaryBrand);
      
      const jobs: OngoingKocJob[] = [
        {
          id: `active-${koc.id}-1`,
          dealCode: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_101`,
          jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB1`,
          brandName: primaryBrand,
          storeName: `${primaryBrand}_TikTok_Shop_Official`,
          productName: primaryBrand === 'ClubClio' ? 'Son kem lì Clio Chiffon Blur Tint 3.8g' : primaryBrand === 'Kutieskin' ? 'Nước tắm thảo dược & Kem bôi dịu da Kutieskin' : 'Sản phẩm chủ lực chiến dịch Thu Đông',
          campaignTitle: `Chiến Dịch Mega Sale Thu Đông 2026 — ${primaryBrand}`,
          bookingBatch: 'Đợt 1 (Đẩy số)',
          bookingFormat: 'Booking Video KOC',
          assignedStaff: koc.bookingPic || 'Lê Phương Thảo',
          staffRole: 'Chuyên viên Booking B2C',
          staffLarkId: `@${(koc.bookingPic || 'lephuongthao').toLowerCase().replace(/\s+/g, '')}`,
          staffEmail: `${(koc.bookingPic || 'lephuongthao').toLowerCase().replace(/\s+/g, '')}@upbase.vn`,
          leaderName: isTam ? 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm)' : 'Đặng Thị Yến Nhi (Trưởng phòng)',
          currentStage: '3_CONTENT_SCRIPT',
          stageLabel: 'Đang duyệt kịch bản video (SLA 24h)',
          pipelineStepNumber: 3,
          deadlinePost: '18/10/2026',
          remainingDaysText: 'Còn 4 ngày',
          isUrgent: false,
          totalValue: koc.rateCardVideo || 5000000,
          advanceAmount: (koc.rateCardVideo || 5000000) * 0.3,
          sampleStatus: 'Đã nhận mẫu tại nhà (KOC đã xác nhận Zalo)',
          internalCollaborationNote: 'KOC phản hồi nhiệt tình trong ngày, kịch bản duyệt tốt. Bạn nào cần book thêm video cho nhãn cùng ngành có thể liên hệ ghép đơn để xin giá combo tiết kiệm 15% ngân sách!'
        }
      ];

      // Thêm job thứ 2 cho creator lớn như koc-1
      if (koc.id === 'koc-1') {
        jobs.push({
          id: `active-${koc.id}-2`,
          dealCode: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_102`,
          jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB2`,
          brandName: 'Royal Ausnz',
          storeName: 'Royal Ausnz_Shopee_E2E-S',
          productName: 'Sữa Hoàng Gia Úc Premium 900g',
          campaignTitle: 'Chiến Dịch Sữa Hoàng Gia Úc Q4 — Phát Triển Toàn Diện',
          bookingBatch: 'Đợt 2',
          bookingFormat: 'Booking Video KOC',
          assignedStaff: 'Lương Thị Như Quỳnh',
          staffRole: 'Chuyên viên Booking B2C',
          staffLarkId: '@luongthinhuquynh',
          staffEmail: 'quynh.ltn@upbase.vn',
          leaderName: 'Đặng Thị Yến Nhi (Trưởng phòng)',
          currentStage: '4_AIR_GROWTH',
          stageLabel: 'Kho Upbase đang giao mẫu (Dự kiến KOC nhận 15/10)',
          pipelineStepNumber: 4,
          deadlinePost: '25/10/2026',
          remainingDaysText: 'Còn 11 ngày',
          isUrgent: false,
          totalValue: 15000000,
          advanceAmount: 4500000,
          sampleStatus: 'Đang gửi mẫu từ kho Upbase (Mã VĐ: SPX84930219)',
          internalCollaborationNote: 'KOC chỉ rảnh quay vào cuối tuần. Nhóm khác muốn lên bài đợt này nên hẹn ngày đăng sau 25/10 để tránh trùng giờ đăng clip.'
        });
      }

      return jobs;
    }

    return [];
  }, [allDeals, koc]);

  // Mock deal history if not populated
  const pastBookingDeals = [
    {
      code: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_01`,
      jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB1`,
      brandName: koc.brandName || 'Kutieskin',
      productName: 'Kem bôi dịu da mẩn ngứa cho bé 30g',
      batch: 'Đợt 1',
      campaign: 'Chiến dịch Mùa Hè 2026',
      date: '12/06/2026',
      brandApprovalStatus: 'ĐÃ_DUYỆT' as const,
      pipelineText: 'Done',
      cost: koc.rateCardVideo,
      gmv30: koc.totalPastGmv ? Math.round(koc.totalPastGmv * 0.55) : koc.rateCardVideo * 4.5,
      roi: (koc.historicalRoi || 4.2),
      status: 'Đã Hoàn Tất',
      isWinner: koc.isWinnerTop20
    },
    {
      code: `BO26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_02`,
      jobId: `ID26_${koc.stageName.toUpperCase().replace(/\s+/g, '')}_JOB2`,
      brandName: 'Bye Bye Blemish',
      productName: 'Chấm mụn tràm trà Tea Tree Drying Lotion',
      batch: 'Đợt 2 (Đẩy số)',
      campaign: 'Super Summer Glow 2026',
      date: '25/07/2026',
      brandApprovalStatus: 'ĐÃ_DUYỆT' as const,
      pipelineText: 'Done',
      cost: koc.rateCardVideo,
      gmv30: koc.totalPastGmv ? Math.round(koc.totalPastGmv * 0.45) : koc.rateCardVideo * 3.2,
      roi: (koc.historicalRoi ? koc.historicalRoi * 1.1 : 3.2),
      status: 'Đã Hoàn Tất',
      isWinner: koc.isWinnerTop20
    }
  ];

  const totalGmv = koc.totalPastGmv || (pastBookingDeals[0].gmv30 + pastBookingDeals[1].gmv30);
  const totalCost = koc.totalPastCost || (pastBookingDeals[0].cost + pastBookingDeals[1].cost);
  const overallRoi = koc.historicalRoi || Number((totalGmv / (totalCost || 1)).toFixed(2));

  const femaleRatio = koc.femaleRatio ?? 85;
  const maleRatio = koc.maleRatio ?? (100 - femaleRatio);
  const age18_24 = koc.age18_24 ?? 55;
  const age25_34 = koc.age25_34 ?? 35;
  const age35Plus = koc.age35Plus ?? 10;
  const gmvShareVideo = koc.gmvShareVideo ?? 70;
  const gmvShareLive = koc.gmvShareLive ?? 20;
  const gmvShareProductCard = koc.gmvShareProductCard ?? 10;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. TOP NAVIGATION & KOC SWITCHER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh bạ</span>
          </button>

          <span className="text-slate-300">|</span>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-1">
            <button
              disabled={!prevKoc}
              onClick={() => prevKoc && onSelectKoc(prevKoc)}
              className={`p-1.5 rounded-lg border text-xs ${
                prevKoc
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title={prevKoc ? `KOC trước: ${prevKoc.stageName}` : 'Không có KOC trước'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Dropdown select */}
            {allKocs.length > 0 && (
              <select
                value={koc.id}
                onChange={(e) => {
                  const target = allKocs.find((k) => k.id === e.target.value);
                  if (target) onSelectKoc(target);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 max-w-[200px] truncate"
              >
                {allKocs.map((k, idx) => (
                  <option key={k.id} value={k.id}>
                    {idx + 1}. {k.stageName} (@{k.channelId})
                  </option>
                ))}
              </select>
            )}

            <button
              disabled={!nextKoc}
              onClick={() => nextKoc && onSelectKoc(nextKoc)}
              className={`p-1.5 rounded-lg border text-xs ${
                nextKoc
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title={nextKoc ? `KOC sau: ${nextKoc.stageName}` : 'Không có KOC sau'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onSyncKalodata && (
            <button
              onClick={() => onSyncKalodata(koc)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
              title="Đồng bộ chỉ số thị trường mới nhất từ Kalodata"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Đồng bộ Kalodata</span>
            </button>
          )}

          {onScanOcr && (
            <button
              onClick={() => onScanOcr(koc)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
              title="Đọc lại ảnh CCCD / Giấy phép kinh doanh"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Đọc ảnh CCCD/ĐKKD</span>
            </button>
          )}

          {onOpenQuickBook && (
            <button
              onClick={() => onOpenQuickBook(koc)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Tạo đơn đặt bài (Quick Book)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KOC HEADER CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
            {koc.stageName.charAt(0)}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{koc.stageName}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {koc.tierLabel}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold font-mono bg-purple-50 text-purple-700 border border-purple-200">
                KL: {koc.salaryGrade}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                  koc.segment === 'Top Creator'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : koc.segment === 'Key Creator'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Segment: {koc.segment || 'Massive Creator'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Tệp: {koc.tepKenh || koc.creatorCategory}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                {koc.kocCategory || 'Personal care'}
              </span>
              {koc.isWinnerTop20 && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Winner Top 20</span>
                </span>
              )}

              {/* Active Jobs Pill */}
              {activeJobs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('CONTRACT_HISTORY')}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Nhân viên mọi nhãn có thể xem job đang làm cùng Upbase để chủ động hỏi đồng nghiệp"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>⚡ Đang có <strong>{activeJobs.length} Job</strong> chạy cùng Upbase</span>
                  <span className="text-2xs text-blue-700">({activeJobs.map(j => j.brandName).join(', ')})</span>
                  <ArrowRight className="w-3 h-3 text-blue-600" />
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Chưa có job đang chạy
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 font-mono flex items-center flex-wrap gap-2 pt-0.5">
              <a
                href={koc.channelLink || `https://www.tiktok.com/@${koc.channelId.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1 font-semibold text-blue-600"
              >
                <span>@{koc.channelId.replace('@', '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-300">•</span>
              <span>
                Tên thật: <strong className="text-slate-800">{koc.realName || 'Chưa cập nhật'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>Khu vực: </span>
                <strong className="text-slate-800">{koc.location || 'Hà Nội'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Nhãn: <strong className="text-emerald-700">{koc.brandName || 'Chung'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                PIC phụ trách: <strong className="text-amber-800">{koc.bookingPic || 'Chưa gán'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Duplicate Warning Box */}
        {duplicateReasons && duplicateReasons.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-800">Cảnh báo: Hồ sơ KOC này có dấu hiệu trùng lặp trong hệ thống</div>
              <div className="text-2xs text-amber-700 mt-0.5">
                Chi tiết: {duplicateReasons.join(' · ')}. Vui lòng kiểm tra lại để tránh đàm phán hoặc lập hợp đồng trùng.
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t border-slate-200 pt-3 overflow-x-auto text-xs">
          {[
            { id: 'ECOMMERCE', label: '1. Hiệu suất E-Commerce & GMV', icon: ShoppingBag },
            { id: 'AUDIENCE', label: '2. Nhân khẩu học Follower', icon: Users },
            { id: 'LOGISTICS', label: '3. Hậu cần nhận mẫu & Vận hành', icon: Truck },
            { 
              id: 'CONTRACT_HISTORY', 
              label: '4. Lịch sử hợp tác & Pháp lý', 
              badge: activeJobs.length > 0 ? `${activeJobs.length} job đang chạy` : undefined,
              icon: FileText 
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition whitespace-nowrap border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TAB CONTENT AREA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs text-slate-800">
        {/* TAB 1: E-COMMERCE ANALYTICS */}
        {activeTab === 'ECOMMERCE' && (
          <div className="space-y-4">
            {/* 4 Classifications Info Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Định Danh &amp; 4 Trục Phân Loại Cốt Lõi:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-medium">1. Khung Lương (KL):</span>
                  <strong className="text-purple-700 font-mono text-sm block mt-0.5">{koc.salaryGrade}</strong>
                  <span className="text-3xs text-slate-400">Đơn giá net video</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-medium">2. Segment Creator:</span>
                  <strong className="text-slate-900 font-semibold text-xs block mt-0.5">
                    {koc.segment || 'Massive Creator'}
                  </strong>
                  <span className="text-3xs text-slate-400">Quy mô ảnh hưởng</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-medium">3. Tệp kênh nghiệp vụ:</span>
                  <strong className="text-emerald-700 font-semibold text-xs block mt-0.5">
                    {koc.tepKenh || koc.creatorCategory || 'Review Nữ'}
                  </strong>
                  <span className="text-3xs text-slate-400">25 tệp chuẩn hóa</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-medium">4. Ngành hàng (Category):</span>
                  <strong className="text-pink-700 font-semibold text-xs block mt-0.5">
                    {koc.kocCategory || 'Personal care'}
                  </strong>
                  <span className="text-3xs text-slate-400">9 ngành trọng tâm</span>
                </div>
              </div>
            </div>

            {/* Performance KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-2xs text-slate-500 block">Followers Kênh</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {koc.followers.toLocaleString('vi-VN')}
                </span>
                <span className="text-2xs text-slate-400">View TB: {koc.avgViews.toLocaleString('vi-VN')}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-2xs text-slate-500 block">Báo giá video net</span>
                <span className="text-base font-bold text-blue-600 mt-0.5 block font-mono">
                  {koc.rateCardVideo.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-purple-700 font-medium">Khung {koc.salaryGrade}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 text-center">
                <span className="text-2xs text-emerald-800 block font-semibold">Doanh số toàn sàn (30d)</span>
                <span className="text-base font-bold text-emerald-700 mt-0.5 block font-mono">
                  {(koc.recentRevenue || koc.gmvBestCase || totalGmv).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-slate-500">Đơn hàng: ~{(koc.itemsSold || 1200).toLocaleString('vi-VN')}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-blue-200 bg-blue-50/20 text-center">
                <span className="text-2xs text-blue-800 font-semibold block">Giá trị đơn TB (AOV)</span>
                <span className="text-base font-bold text-blue-700 mt-0.5 block font-mono">
                  {(koc.aov || 245000).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-2xs text-slate-500">GPM: {koc.gpm || 28.5}%</span>
              </div>
            </div>

            {/* GMV Share by Channel */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <span>Cơ cấu doanh số theo định dạng nội dung (% Tỉ trọng GMV)</span>
                </h4>
                <span className="text-2xs text-slate-400">Dữ liệu thị trường TikTok Shop</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">1. Tỉ trọng GMV từ video ngắn</span>
                    <strong className="text-blue-700 font-mono">{gmvShareVideo}%</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${gmvShareVideo}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">2. Tỉ trọng GMV từ livestream</span>
                    <strong className="text-purple-700 font-mono">{gmvShareLive}%</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${gmvShareLive}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">3. Tỉ trọng GMV từ thẻ sản phẩm &amp; gian hàng</span>
                    <strong className="text-emerald-700 font-mono">{gmvShareProductCard}%</strong>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${gmvShareProductCard}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Notes */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-semibold block mb-0.5">Gợi ý định hướng từ Upbase:</strong>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {koc.contentNote ||
                    'KOC có thế mạnh review chân thật, giọng truyền cảm, chuyển đổi tốt ở giỏ hàng video. Khuyến nghị chạy kèm Spark Ads 7 ngày sau khi video lên xu hướng để tối đa hóa điểm hoàn vốn (ROI).'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIENCE DEMOGRAPHICS */}
        {activeTab === 'AUDIENCE' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Tỷ lệ giới tính người theo dõi</h4>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600">
                    Nữ: <strong className="text-pink-600">{femaleRatio}%</strong>
                  </span>
                  <span className="text-slate-600">
                    Nam: <strong className="text-blue-600">{maleRatio}%</strong>
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                  <div className="h-full bg-pink-500" style={{ width: `${femaleRatio}%` }} />
                  <div className="h-full bg-blue-500" style={{ width: `${maleRatio}%` }} />
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Độ tuổi khán giả chủ đạo</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs text-slate-500 block">18-24 tuổi</span>
                    <strong className="text-slate-900 font-mono text-sm">{age18_24}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs text-slate-500 block">25-34 tuổi</span>
                    <strong className="text-blue-700 font-mono text-sm">{age25_34}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-3xs text-slate-500 block">&gt;35 tuổi</span>
                    <strong className="text-slate-900 font-mono text-sm">{age35Plus}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAMPLE SHIPPING LOGISTICS */}
        {activeTab === 'LOGISTICS' && (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Địa chỉ gửi hàng mẫu</span>
                </h4>
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Đã xác nhận địa chỉ
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-2xs text-slate-500 block">Địa chỉ nhận hàng:</span>
                    <strong className="text-slate-900 text-xs block mt-0.5 leading-relaxed">
                      {koc.shippingAddress || `${koc.realName} — ${koc.phone} — Tòa nhà Upbase, Cầu Giấy, Hà Nội`}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-2xs text-slate-500 block">Khu vực địa lý:</span>
                    <strong className="text-slate-800">{koc.location || 'Hà Nội / Miền Bắc'}</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-slate-500 block">Thời gian giao mẫu ước tính:</span>
                    <span className="text-slate-700">1 - 2 Ngày làm việc</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Channels */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Kênh Liên Lạc Tác Nghiệp</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Số điện thoại:</span>
                  <span className="font-bold text-slate-900 font-mono text-xs block mt-0.5">{koc.phone}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Zalo làm việc:</span>
                  <span className="font-bold text-blue-700 font-mono text-xs block mt-0.5">{koc.zalo}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Email:</span>
                  <span className="font-bold text-slate-800 font-mono text-xs block mt-0.5 truncate">
                    {koc.email || `${koc.channelId.replace('@', '')}@creator.vn`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVE JOBS, PAST DEALS & LEGAL */}
        {activeTab === 'CONTRACT_HISTORY' && (
          <div className="space-y-4">
            {/* 1. CÁC JOB HIỆN ĐANG LÀM VỚI CÔNG TY (UPBASE - TOÀN BỘ NHÃN HÀNG) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Các Job Hiện Đang Làm Với Công Ty (Upbase)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {activeJobs.length} job đang chạy
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-500 shrink-0" />
                    <span>
                      <strong>Minh bạch dữ liệu liên nhóm:</strong> Nhân sự mọi nhãn hàng đều có quyền xem để chủ động hỏi đồng nghiệp, tránh chồng chéo lịch và tối ưu đàm phán combo giá.
                    </span>
                  </p>
                </div>

                {activeJobs.length > 0 && (
                  <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                    ✓ Đang có hợp tác tích cực
                  </span>
                )}
              </div>

              {/* Active Jobs Cards */}
              {activeJobs.length > 0 ? (
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl border border-blue-200 bg-linear-to-r from-blue-50/40 via-white to-slate-50/60 shadow-2xs space-y-3 hover:border-blue-300 transition"
                    >
                      {/* Row 1: Brand, Campaign & Key Meta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs">
                            {job.brandName}
                          </span>
                          <span className="font-mono text-2xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {job.dealCode} ({job.jobId})
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                            {job.campaignTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-slate-500">Đơn giá net:</span>
                          <strong className="text-xs font-mono font-bold text-purple-700">
                            {job.totalValue.toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>

                      {/* Row 2: Product & 5-Step Visual Pipeline & PIC Contacts */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
                        {/* Left 4 cols: Product & Batch */}
                        <div className="lg:col-span-4 p-2.5 bg-white rounded-lg border border-slate-200 text-2xs space-y-1">
                          <div>
                            <span className="text-slate-400 font-medium">Sản phẩm:</span>{' '}
                            <strong className="text-slate-800">{job.productName}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <span>Đợt: <strong>{job.bookingBatch}</strong></span>
                            <span>•</span>
                            <span>Định dạng: <strong>{job.bookingFormat}</strong></span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Kho nhận mẫu:</span>{' '}
                            <span className="text-slate-700 font-semibold">{job.sampleStatus}</span>
                          </div>
                        </div>

                        {/* Middle 5 cols: 5-step visual pipeline */}
                        <div className="lg:col-span-5 p-2.5 bg-white rounded-lg border border-slate-200 text-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-semibold">Tiến độ quy trình:</span>
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {job.stageLabel}
                            </span>
                          </div>

                          {/* 5-step progress pill */}
                          <div className="grid grid-cols-5 gap-1 text-center font-semibold text-3xs">
                            {[
                              { step: 1, label: 'Lập BO' },
                              { step: 2, label: 'Hợp đồng' },
                              { step: 3, label: 'Kịch bản' },
                              { step: 4, label: 'Gửi mẫu' },
                              { step: 5, label: 'Lên bài' }
                            ].map((s) => (
                              <div
                                key={s.step}
                                className={`py-1 rounded ${
                                  s.step < job.pipelineStepNumber
                                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                                    : s.step === job.pipelineStepNumber
                                    ? 'bg-blue-600 text-white font-bold animate-pulse'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {s.label}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-3xs text-slate-500 pt-0.5">
                            <span>Hạn đăng bài: <strong className="text-slate-800">{job.deadlinePost}</strong></span>
                            <span className="text-amber-700 font-semibold">({job.remainingDaysText})</span>
                          </div>
                        </div>

                        {/* Right 3 cols: Specialist PIC & Inquiry Button */}
                        <div className="lg:col-span-3 p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between gap-2">
                          <div className="text-2xs">
                            <span className="text-slate-400 block font-medium">Nhân sự phụ trách:</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-3xs flex items-center justify-center font-bold">
                                {job.assignedStaff.charAt(0)}
                              </div>
                              <strong className="text-slate-900 text-xs font-bold">{job.assignedStaff}</strong>
                            </div>
                            <span className="text-3xs text-slate-500 block mt-0.5">{job.leaderName}</span>
                          </div>

                          {/* Action Button: Hỏi đồng nghiệp */}
                          <button
                            type="button"
                            onClick={() => setInquiryTargetJob(job)}
                            className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-2xs shadow-2xs transition flex items-center justify-center gap-1.5"
                            title="Hỏi thăm chuyên viên phụ trách về tác phong làm việc, giá combo và lịch quay của KOC này"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Hỏi bạn {job.assignedStaff.split(' ').pop()} về KOC</span>
                          </button>
                        </div>
                      </div>

                      {/* Row 3: Internal Collaboration & Handover Note */}
                      {job.internalCollaborationNote && (
                        <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-2xs text-amber-900 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-800">Ghi chú phối hợp nội bộ từ {job.assignedStaff}: </strong>
                            <span>{job.internalCollaborationNote}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">Hiện KOC này chưa có job nào đang chạy cùng Upbase</h5>
                  <p className="text-2xs text-slate-500 max-w-md mx-auto">
                    KOC đang ở trạng thái sẵn sàng nhận booking. Bạn có thể là chuyên viên đầu tiên khởi tạo job cho đợt này!
                  </p>
                  {onOpenQuickBook && (
                    <button
                      onClick={() => onOpenQuickBook(koc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Khởi tạo đơn đặt bài mới (Quick Book)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. LỊCH SỬ ĐÃ HOÀN TẤT & DOANH THU ĐÃ NGHIỆM THU */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Lịch Sử Đơn Đặt Bài &amp; Nghiệm Thu Doanh Thu Tại Upbase</span>
                </h4>
                <div className="flex items-center gap-3 text-2xs text-slate-600">
                  <span>
                    Tổng chi phí: <strong className="text-slate-900">{totalCost.toLocaleString('vi-VN')} đ</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Tổng GMV: <strong className="text-emerald-700">{totalGmv.toLocaleString('vi-VN')} đ</strong>
                  </span>
                  <span>•</span>
                  <span>
                    ROI thực tế: <strong className="text-purple-700">{overallRoi}x</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase">
                      <th className="py-2.5 px-3">Mã đơn &amp; Job</th>
                      <th className="py-2.5 px-3">Nhãn &amp; Sản phẩm</th>
                      <th className="py-2.5 px-3">Đợt / Ngày</th>
                      <th className="py-2.5 px-3 text-right">Chi phí Net</th>
                      <th className="py-2.5 px-3 text-right">GMV 30 ngày</th>
                      <th className="py-2.5 px-3 text-center">ROI</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastBookingDeals.map((deal) => (
                      <tr key={deal.code} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                          <div>{deal.code}</div>
                          <div className="text-3xs text-slate-400">{deal.jobId}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block truncate max-w-[160px]">{deal.productName}</strong>
                          <span className="text-3xs text-slate-500">{deal.brandName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-2xs text-slate-600">
                          <div>{deal.batch}</div>
                          <div className="text-3xs text-slate-400">{deal.date}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-medium">
                          {deal.cost.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {deal.gmv30.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {deal.roi}x
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {deal.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. THÔNG TIN PHÁP LÝ & TÀI KHOẢN CHI TRẢ */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Thông Tin Pháp Lý &amp; Tài Khoản Chi Trả</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Loại hình pháp lý:</span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold mt-1 px-2 py-0.5 rounded text-2xs border ${
                      koc.ocrDocumentType === 'BUSINESS_LICENSE'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : koc.ocrDocumentType === 'BUSINESS_HOUSEHOLD'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {koc.ocrDocumentType === 'BUSINESS_LICENSE'
                      ? 'Công ty / MCN (Xuất hóa đơn VAT)'
                      : koc.ocrDocumentType === 'BUSINESS_HOUSEHOLD'
                      ? 'Hộ kinh doanh cá thể (HKD)'
                      : 'Cá nhân (Khấu trừ thuế TNCN 10%)'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-500 block">
                    {koc.ocrDocumentType === 'BUSINESS_LICENSE'
                      ? 'Mã số thuế doanh nghiệp:'
                      : koc.ocrDocumentType === 'BUSINESS_HOUSEHOLD'
                      ? 'Mã số thuế HKD:'
                      : 'Số CCCD / Định danh:'}
                  </span>
                  <strong className="text-slate-900 font-mono text-xs block mt-1">
                    {koc.taxCode || koc.cccd || 'Chưa cập nhật'}
                  </strong>
                </div>

                {koc.companyName && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-2xs text-slate-500 block">Tên pháp nhân / Đơn vị đại diện:</span>
                    <strong className="text-slate-900 text-xs block mt-0.5">{koc.companyName}</strong>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                  <span className="text-2xs text-slate-500 block">Tài khoản ngân hàng thụ hưởng:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong className="text-slate-900 font-mono text-xs">
                      {koc.bankAccount} ({koc.bankName})
                    </strong>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-700 font-semibold">{koc.realName || koc.stageName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL: TRAO ĐỔI & HỎI THĂM ĐỒNG NGHIỆP QUA LARK */}
      {inquiryTargetJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Trao đổi nội bộ phòng B2C
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Hỏi thăm đồng nghiệp về KOC: {koc.stageName}
                </h3>
              </div>
              <button
                onClick={() => setInquiryTargetJob(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Thông tin PIC đang phụ trách */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Chuyên viên phụ trách:</span>
                <strong className="text-slate-900 font-bold">{inquiryTargetJob.assignedStaff}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trưởng nhóm duyệt:</span>
                <span className="text-slate-700 font-semibold">{inquiryTargetJob.leaderName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Job đang chạy:</span>
                <span className="text-blue-700 font-semibold">
                  {inquiryTargetJob.brandName} • {inquiryTargetJob.productName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Tiến độ hiện tại:</span>
                <span className="text-emerald-700 font-semibold">{inquiryTargetJob.stageLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Lark ID / Email:</span>
                <span className="font-mono text-slate-700 font-semibold">{inquiryTargetJob.staffLarkId} ({inquiryTargetJob.staffEmail})</span>
              </div>
            </div>

            {/* Nội dung tin nhắn mẫu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-2xs font-bold text-slate-700 uppercase">
                  Nội dung gợi ý trao đổi qua Lark:
                </label>
                {copiedInquirySuccess && (
                  <span className="text-2xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã sao chép! Bạn có thể dán vào Lark
                  </span>
                )}
              </div>
              <textarea
                readOnly
                rows={6}
                value={`Chào ${inquiryTargetJob.assignedStaff}, ${currentUser?.name || 'mình'} bên team Booking B2C Upbase nè. Thấy bạn đang chạy job "${inquiryTargetJob.campaignTitle}" (${inquiryTargetJob.brandName} - ${inquiryTargetJob.productName}) cùng bạn KOC ${koc.stageName}. Cho mình hỏi xíu:
1. Bạn ấy phản hồi và duyệt kịch bản có nhanh/chuẩn tiến độ không?
2. Chất lượng video & tương tác thực tế thế nào?
3. Đợt này bên bạn có book thêm video/live không để team mình ghép chung đàm phán combo giá tốt cho công ty luôn nhé!
Cảm ơn bạn nhiều!`}
                className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl font-sans text-slate-800 focus:outline-none focus:border-slate-800 leading-relaxed resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setInquiryTargetJob(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const text = `Chào ${inquiryTargetJob.assignedStaff}, ${currentUser?.name || 'mình'} bên team Booking B2C Upbase nè. Thấy bạn đang chạy job "${inquiryTargetJob.campaignTitle}" (${inquiryTargetJob.brandName} - ${inquiryTargetJob.productName}) cùng bạn KOC ${koc.stageName}. Cho mình hỏi xíu:
1. Bạn ấy phản hồi và duyệt kịch bản có nhanh/chuẩn tiến độ không?
2. Chất lượng video & tương tác thực tế thế nào?
3. Đợt này bên bạn có book thêm video/live không để team mình ghép chung đàm phán combo giá tốt cho công ty luôn nhé!
Cảm ơn bạn nhiều!`;
                  navigator.clipboard.writeText(text);
                  setCopiedInquirySuccess(true);
                  setTimeout(() => setCopiedInquirySuccess(false), 3000);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép tin nhắn hỏi đồng nghiệp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
