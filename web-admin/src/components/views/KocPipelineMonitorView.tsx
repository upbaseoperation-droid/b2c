'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  HelpCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import {
  Modal,
  Button,
  DataTable,
  FilterBar,
  Column,
  Input,
  Select,
} from '../ui';
import { KocListingItem, BookingDealItem, UserProfile } from '../../lib/types';
import { PlanDeal, DealJob } from '../../lib/dealBoardRules';
import { formatVndShort } from '../../lib/format';

export type MacroMilestoneKey = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M19';

export type BallInCourt = 'B2C_STAFF' | 'KOC' | 'BRAND' | 'LEGAL_FINANCE' | 'SYSTEM';

export interface KocPipelineStatusInfo {
  macroKey: MacroMilestoneKey;
  macroTitle: string;
  stageCode: string;
  stageName: string;
  subStatusName: string;
  ballInCourt: BallInCourt;
  ballInCourtLabel: string;
  isStalled: boolean;
  slaNotice?: string;
  badgeClass: string;
}

export const KOC_REJECTION_REASONS_CATALOG = [
  { code: 'R01', label: 'Giá quá cao so với ngân sách', stage: 'M1', tip: 'Đề xuất đổi quyền lợi, tặng thêm mẫu hoặc giảm bớt số video' },
  { code: 'R02', label: 'Không phản hồi / Mất liên lạc', stage: 'M1', tip: 'Chuyển kênh liên hệ qua Zalo / Số điện thoại quản lý KOC' },
  { code: 'R03', label: 'Không phù hợp định hướng nội dung', stage: 'M1', tip: 'Gửi bảng tóm tắt định hướng sáng tạo mở hơn' },
  { code: 'R04', label: 'Trùng lịch / Kẹt thời gian', stage: 'M1', tip: 'Đề xuất dời lịch sang đợt chiến dịch tiếp theo' },
  { code: 'R05', label: 'Brand không duyệt danh sách', stage: 'M2', tip: 'Trình 2 KOC dự phòng cùng tệp khán giả' },
  { code: 'R06', label: 'Không đồng ý điều khoản hợp đồng', stage: 'M2', tip: 'Nhờ Pháp chế giải thích và điều chỉnh điều khoản phạt' },
  { code: 'R07', label: 'Tranh chấp / Không chốt được tạm ứng', stage: 'M2', tip: 'Trình duyệt ứng 30% đối với KOC lớn' },
  { code: 'R08', label: 'Kho hết mẫu / Chậm giao mẫu', stage: 'M3', tip: 'Điều phối mượn mẫu từ gian hàng khác hoặc gửi trực tiếp' },
  { code: 'R09', label: 'Trễ hạn nộp kịch bản / Demo', stage: 'M3', tip: 'Gọi điện trực tiếp chốt hạn chót nộp video' },
  { code: 'R10', label: 'Video demo không đạt yêu cầu', stage: 'M3', tip: 'Liệt kê cụ thể từng giây cần chỉnh sửa' },
  { code: 'R11', label: 'Trễ hạn Air bài chiến dịch', stage: 'M4', tip: 'Bù suất đẩy thêm link giỏ hàng hoặc ghim bình luận' },
  { code: 'R12', label: 'Không cấp mã Ads / Vi phạm bản quyền', stage: 'M4', tip: 'Hướng dẫn KOC thao tác mở mã ủy quyền trên ứng dụng' },
];

export function computeListingPipelineState(item: KocListingItem): KocPipelineStatusInfo {
  if (item.overallStatus === 'DROPPED' || item.kocNegotiationStatus === 'NEGOTIATION_FAILED') {
    return {
      macroKey: 'M19',
      macroTitle: 'Tạm dừng / Hủy',
      stageCode: '19.1',
      stageName: 'Đã dừng hợp tác',
      subStatusName: 'Từ chối hoặc hủy',
      ballInCourt: 'SYSTEM',
      ballInCourtLabel: 'Đã đóng',
      isStalled: false,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (item.overallStatus === 'FINAL_APPROVED' || item.brandApprovalStatus === 'BRAND_APPROVED') {
    return {
      macroKey: 'M2',
      macroTitle: 'Duyệt & Hợp đồng',
      stageCode: '6.1',
      stageName: 'Brand đã duyệt',
      subStatusName: 'Chờ lập hợp đồng',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (item.brandApprovalStatus === 'BRAND_PENDING') {
    return {
      macroKey: 'M2',
      macroTitle: 'Duyệt & Hợp đồng',
      stageCode: '5.2',
      stageName: 'Chờ duyệt Brand',
      subStatusName: 'Đã trình nhãn hàng',
      ballInCourt: 'BRAND',
      ballInCourtLabel: 'Nhãn hàng',
      isStalled: true,
      slaNotice: 'Cần duyệt trước 48h',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  if (item.kocNegotiationStatus === 'TERMS_AGREED') {
    return {
      macroKey: 'M2',
      macroTitle: 'Duyệt & Hợp đồng',
      stageCode: '5.1',
      stageName: 'Chờ duyệt nội bộ',
      subStatusName: 'KOC đồng ý, chờ trình Brand',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (item.kocNegotiationStatus === 'PRICE_NEGOTIATING') {
    return {
      macroKey: 'M1',
      macroTitle: 'Tiếp cận & Đàm phán',
      stageCode: '4.3',
      stageName: 'Đang thương lượng',
      subStatusName: 'Đã trao đổi đề xuất chi phí',
      ballInCourt: 'KOC',
      ballInCourtLabel: 'KOC',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (item.kocNegotiationStatus === 'CONTACTING') {
    return {
      macroKey: 'M1',
      macroTitle: 'Tiếp cận & Đàm phán',
      stageCode: '2.2',
      stageName: 'Đã liên hệ',
      subStatusName: 'Chờ KOC phản hồi',
      ballInCourt: 'KOC',
      ballInCourtLabel: 'KOC',
      isStalled: false,
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  }

  return {
    macroKey: 'M1',
    macroTitle: 'Tiếp cận & Đàm phán',
    stageCode: '1.1',
    stageName: 'Chưa liên hệ',
    subStatusName: 'Danh sách mới',
    ballInCourt: 'B2C_STAFF',
    ballInCourtLabel: 'Chuyên viên B2C',
    isStalled: false,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  };
}

export function computeJobPipelineState(job: DealJob, deal?: PlanDeal): KocPipelineStatusInfo {
  if (job.lifecycleStatus === 'CANCELLED') {
    return {
      macroKey: 'M19',
      macroTitle: 'Tạm dừng / Hủy',
      stageCode: '19.1',
      stageName: 'Hủy hợp tác',
      subStatusName: job.lifecycleNote || 'Đã hủy hợp tác',
      ballInCourt: 'SYSTEM',
      ballInCourtLabel: 'Đã đóng',
      isStalled: false,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (job.payment?.paidAt || job.payment?.status === 'PAID') {
    return {
      macroKey: 'M5',
      macroTitle: 'Thanh toán & Hoàn tất',
      stageCode: '18.1',
      stageName: 'Hoàn tất & Đóng job',
      subStatusName: 'Đã giải ngân đầy đủ',
      ballInCourt: 'SYSTEM',
      ballInCourtLabel: 'Hoàn tất',
      isStalled: false,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (job.payment?.larkSlipCode || job.payment?.status === 'REQUESTED') {
    return {
      macroKey: 'M5',
      macroTitle: 'Thanh toán & Hoàn tất',
      stageCode: '17.1',
      stageName: 'Giải ngân thanh toán',
      subStatusName: 'Chờ Kế toán chi tiền',
      ballInCourt: 'LEGAL_FINANCE',
      ballInCourtLabel: 'Kế toán B2C',
      isStalled: false,
      slaNotice: 'Theo lịch thanh toán thứ 6',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (job.acceptance?.status === 'PASSED' || job.bbntSigned) {
    return {
      macroKey: 'M5',
      macroTitle: 'Thanh toán & Hoàn tất',
      stageCode: '16.1',
      stageName: 'Hồ sơ thanh toán',
      subStatusName: 'Đã ký nghiệm thu, chờ lập phiếu chi',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (job.airLink || job.airedAt) {
    const hasAdsCode = Boolean(job.sparkAdsCode);
    if (!hasAdsCode) {
      return {
        macroKey: 'M4',
        macroTitle: 'Air & Nghiệm thu',
        stageCode: '14.1',
        stageName: 'Quyền Ads / Usage',
        subStatusName: 'Đã Air bài, chờ KOC gửi mã Ads',
        ballInCourt: 'KOC',
        ballInCourtLabel: 'KOC',
        isStalled: true,
        slaNotice: 'Cần mã Ads trong 24h sau Air',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      macroKey: 'M4',
      macroTitle: 'Air & Nghiệm thu',
      stageCode: '15.1',
      stageName: 'Nghiệm thu video',
      subStatusName: 'Đủ video & mã Ads, chờ ký BBNT',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (job.sample?.status === 'RECEIVED' || job.sample?.trackingNo) {
    if (job.script?.demoUrl || job.script?.status === 'SUBMITTED') {
      return {
        macroKey: 'M3',
        macroTitle: 'Hàng mẫu & Sản xuất',
        stageCode: '11.1',
        stageName: 'Duyệt video demo',
        subStatusName: 'Đã nộp demo, chờ Brand duyệt',
        ballInCourt: 'BRAND',
        ballInCourtLabel: 'Nhãn hàng',
        isStalled: false,
        slaNotice: 'SLA duyệt demo 24h',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    return {
      macroKey: 'M3',
      macroTitle: 'Hàng mẫu & Sản xuất',
      stageCode: '10.1',
      stageName: 'Sản xuất nội dung',
      subStatusName: 'KOC đang làm kịch bản / quay video',
      ballInCourt: 'KOC',
      ballInCourtLabel: 'KOC',
      isStalled: false,
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  }

  if (job.sowSigned || deal?.appendixNo) {
    return {
      macroKey: 'M3',
      macroTitle: 'Hàng mẫu & Sản xuất',
      stageCode: '9.1',
      stageName: 'Gửi / Nhận hàng mẫu',
      subStatusName: 'Đã ký HĐ, chờ kho xuất hàng mẫu',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (job.legalReviewStatus === 'PENDING' || job.financeReviewStatus === 'PENDING') {
    return {
      macroKey: 'M2',
      macroTitle: 'Duyệt & Hợp đồng',
      stageCode: '7.3',
      stageName: 'Chờ duyệt Pháp chế',
      subStatusName: 'Có điều khoản riêng cần duyệt',
      ballInCourt: 'LEGAL_FINANCE',
      ballInCourtLabel: 'Pháp chế',
      isStalled: true,
      slaNotice: 'SLA Pháp chế 24h',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    macroKey: 'M2',
    macroTitle: 'Duyệt & Hợp đồng',
    stageCode: '7.1',
    stageName: 'Hồ sơ hợp tác',
    subStatusName: 'Chờ hoàn thiện hợp đồng',
    ballInCourt: 'B2C_STAFF',
    ballInCourtLabel: 'Chuyên viên B2C',
    isStalled: false,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  };
}

export function computeBookingDealPipelineState(item: BookingDealItem): KocPipelineStatusInfo {
  if (
    item.status === 'CANCELLED' ||
    item.kocResponseStatus === 'TỪ_CHỐI' ||
    item.brandApprovalStatus === 'TỪ_CHỐI'
  ) {
    return {
      macroKey: 'M19',
      macroTitle: 'Tạm dừng / Hủy',
      stageCode: '19.1',
      stageName: 'Đã hủy deal',
      subStatusName: item.brandRejectReason || 'Đã dừng hợp tác',
      ballInCourt: 'SYSTEM',
      ballInCourtLabel: 'Đã đóng',
      isStalled: false,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (item.status === 'COMPLETED' || item.status === 'FINAL_PAID') {
    return {
      macroKey: 'M5',
      macroTitle: 'Thanh toán & Hoàn tất',
      stageCode: '18.1',
      stageName: 'Hoàn tất & Đóng job',
      subStatusName: 'Đã thanh toán đầy đủ',
      ballInCourt: 'SYSTEM',
      ballInCourtLabel: 'Hoàn tất',
      isStalled: false,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (item.status === 'VIDEO_VERIFIED') {
    return {
      macroKey: 'M5',
      macroTitle: 'Thanh toán & Hoàn tất',
      stageCode: '17.1',
      stageName: 'Giải ngân thanh toán',
      subStatusName: 'Chờ Kế toán chi tiền',
      ballInCourt: 'LEGAL_FINANCE',
      ballInCourtLabel: 'Kế toán B2C',
      isStalled: false,
      slaNotice: 'Theo lịch thanh toán thứ 6',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (item.status === 'VIDEO_SUBMITTED' || item.videoUrl || item.tiktokVideoUrl) {
    if (!item.sparkAdsCode) {
      return {
        macroKey: 'M4',
        macroTitle: 'Air & Nghiệm thu',
        stageCode: '14.1',
        stageName: 'Quyền Ads / Usage',
        subStatusName: 'Đã Air bài, chờ mã Ads',
        ballInCourt: 'KOC',
        ballInCourtLabel: 'KOC',
        isStalled: true,
        slaNotice: 'Cần mã Ads trong 24h sau Air',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      macroKey: 'M4',
      macroTitle: 'Air & Nghiệm thu',
      stageCode: '15.1',
      stageName: 'Nghiệm thu video',
      subStatusName: 'Đủ link & mã Ads, chờ nghiệm thu',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (item.status === 'SAMPLE_RECEIVED' || item.sampleStatus === 'ĐÃ_NHẬN' || item.sampleTrackingCode) {
    if (item.status === 'SCRIPT_PENDING' || item.status === 'SCRIPT_APPROVED') {
      return {
        macroKey: 'M3',
        macroTitle: 'Hàng mẫu & Sản xuất',
        stageCode: '11.1',
        stageName: 'Duyệt video demo',
        subStatusName: 'Đang duyệt kịch bản / demo',
        ballInCourt: 'BRAND',
        ballInCourtLabel: 'Nhãn hàng',
        isStalled: false,
        slaNotice: 'SLA duyệt demo 24h',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    return {
      macroKey: 'M3',
      macroTitle: 'Hàng mẫu & Sản xuất',
      stageCode: '10.1',
      stageName: 'Sản xuất nội dung',
      subStatusName: 'KOC đang làm kịch bản / sản xuất',
      ballInCourt: 'KOC',
      ballInCourtLabel: 'KOC',
      isStalled: false,
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  }

  if (item.status === 'SAMPLE_SHIPPED' || item.sampleStatus === 'ĐANG_GIAO') {
    return {
      macroKey: 'M3',
      macroTitle: 'Hàng mẫu & Sản xuất',
      stageCode: '9.1',
      stageName: 'Gửi / Nhận hàng mẫu',
      subStatusName: 'Đã gửi hàng mẫu cho KOC',
      ballInCourt: 'B2C_STAFF',
      ballInCourtLabel: 'Chuyên viên B2C',
      isStalled: false,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (item.brandApprovalStatus === 'CHỜ_DUYỆT') {
    return {
      macroKey: 'M2',
      macroTitle: 'Duyệt & Hợp đồng',
      stageCode: '5.2',
      stageName: 'Chờ duyệt Brand',
      subStatusName: 'Đã gửi nhãn hàng chờ phê duyệt',
      ballInCourt: 'BRAND',
      ballInCourtLabel: 'Nhãn hàng',
      isStalled: true,
      slaNotice: 'SLA Brand duyệt 48h',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    macroKey: 'M2',
    macroTitle: 'Duyệt & Hợp đồng',
    stageCode: '7.1',
    stageName: 'Hồ sơ hợp tác',
    subStatusName: 'Chờ hoàn thiện hợp đồng',
    ballInCourt: 'B2C_STAFF',
    ballInCourtLabel: 'Chuyên viên B2C',
    isStalled: false,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  };
}

export interface UnifiedPipelineRow {
  id: string;
  sourceType: 'LISTING' | 'JOB' | 'DEAL';
  kocName: string;
  kocHandle: string;
  brandName: string;
  storeName: string;
  picName: string;
  costVnd: number;
  pipeline: KocPipelineStatusInfo;
  rawListing?: KocListingItem;
  rawJob?: DealJob;
  rawDeal?: PlanDeal;
  rawBookingDeal?: BookingDealItem;
}

interface KocPipelineMonitorViewProps {
  currentUser?: UserProfile;
  listingItems?: KocListingItem[];
  deals?: Array<PlanDeal | BookingDealItem>;
  onOpenListingModal?: (item: KocListingItem) => void;
  onOpenDealJobModal?: (deal: PlanDeal, job: DealJob) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export function KocPipelineMonitorView({
  listingItems = [],
  deals = [],
  onOpenListingModal,
  onOpenDealJobModal,
  onNotify,
}: KocPipelineMonitorViewProps) {
  const [selectedMacro, setSelectedMacro] = useState<MacroMilestoneKey | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedBallInCourt, setSelectedBallInCourt] = useState<BallInCourt | 'ALL'>('ALL');
  const [onlyStalled, setOnlyStalled] = useState(false);

  const [activeReasonModalRow, setActiveReasonModalRow] = useState<UnifiedPipelineRow | null>(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState('R01');
  const [reasonNotes, setReasonNotes] = useState('');

  const [activeQuickUpdateRow, setActiveQuickUpdateRow] = useState<UnifiedPipelineRow | null>(null);
  const [quickUpdateText, setQuickUpdateText] = useState('');

  const unifiedRows = useMemo<UnifiedPipelineRow[]>(() => {
    const rows: UnifiedPipelineRow[] = [];

    listingItems.forEach((li) => {
      const pInfo = computeListingPipelineState(li);
      rows.push({
        id: `listing-${li.id}`,
        sourceType: 'LISTING',
        kocName: li.kocName,
        kocHandle: li.kocHandle,
        brandName: li.brandName || 'Chưa gán',
        storeName: li.storeName || 'Chưa gán',
        picName: li.staffComment || 'Chưa phân công',
        costVnd: li.finalFee || li.proposedFee || 0,
        pipeline: pInfo,
        rawListing: li,
      });
    });

    deals.forEach((d) => {
      if ('jobs' in d && Array.isArray(d.jobs)) {
        d.jobs.forEach((j) => {
          const pInfo = computeJobPipelineState(j, d);
          rows.push({
            id: `job-${j.id}`,
            sourceType: 'JOB',
            kocName: d.kocName,
            kocHandle: d.kocHandle,
            brandName: d.productGroupName || 'Nhãn hàng',
            storeName: j.productName || 'Gian hàng',
            picName: j.pic || d.pic || 'Chưa phân công',
            costVnd: j.payment?.amount || j.videoFee || 0,
            pipeline: pInfo,
            rawJob: j,
            rawDeal: d,
          });
        });
      } else {
        const bd = d as BookingDealItem;
        const pInfo = computeBookingDealPipelineState(bd);
        rows.push({
          id: `deal-${bd.id}`,
          sourceType: 'DEAL',
          kocName: bd.kocStageName || bd.kocId,
          kocHandle: bd.kocChannelId || bd.kocStageName || 'koc',
          brandName: bd.brandName || 'Chưa gán',
          storeName: bd.storeName || 'Chưa gán',
          picName: bd.assignedStaff || bd.bookingPic || 'Chưa phân công',
          costVnd: bd.finalAmount || bd.totalValue || 0,
          pipeline: pInfo,
          rawBookingDeal: bd,
        });
      }
    });

    return rows;
  }, [listingItems, deals]);

  const brandsList = useMemo(() => {
    const set = new Set<string>();
    unifiedRows.forEach((r) => {
      if (r.brandName && r.brandName !== 'Chưa gán') set.add(r.brandName);
    });
    return Array.from(set).sort();
  }, [unifiedRows]);

  const funnelCounts = useMemo(() => {
    const counts: Record<MacroMilestoneKey, number> = {
      M1: 0,
      M2: 0,
      M3: 0,
      M4: 0,
      M5: 0,
      M19: 0,
    };
    unifiedRows.forEach((r) => {
      counts[r.pipeline.macroKey] = (counts[r.pipeline.macroKey] || 0) + 1;
    });
    return counts;
  }, [unifiedRows]);

  const bottleneckAlerts = useMemo(() => {
    const brandPending = unifiedRows.filter((r) => r.pipeline.ballInCourt === 'BRAND' && r.pipeline.isStalled);
    const airOverdue = unifiedRows.filter((r) => r.pipeline.macroKey === 'M4' && r.pipeline.isStalled);
    const kocSilent = unifiedRows.filter((r) => r.pipeline.ballInCourt === 'KOC' && r.pipeline.isStalled);
    return { brandPending, airOverdue, kocSilent };
  }, [unifiedRows]);

  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (selectedMacro !== 'ALL' && r.pipeline.macroKey !== selectedMacro) return false;
      if (selectedBrand !== 'ALL' && r.brandName !== selectedBrand) return false;
      if (selectedBallInCourt !== 'ALL' && r.pipeline.ballInCourt !== selectedBallInCourt) return false;
      if (onlyStalled && !r.pipeline.isStalled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.kocName.toLowerCase().includes(q) ||
          r.kocHandle.toLowerCase().includes(q) ||
          r.brandName.toLowerCase().includes(q) ||
          r.picName.toLowerCase().includes(q) ||
          r.pipeline.stageName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [unifiedRows, selectedMacro, selectedBrand, selectedBallInCourt, onlyStalled, searchQuery]);

  const handleSaveQuickUpdate = () => {
    if (!activeQuickUpdateRow) return;
    onNotify?.(`Đã lưu ghi chú cho ${activeQuickUpdateRow.kocName}`, 'success');
    setActiveQuickUpdateRow(null);
    setQuickUpdateText('');
  };

  const handleSaveRejectionReason = () => {
    if (!activeReasonModalRow) return;
    const item = KOC_REJECTION_REASONS_CATALOG.find((r) => r.code === selectedReasonCode);
    onNotify?.(
      `Đã chuyển KOC ${activeReasonModalRow.kocName} sang chặng Tạm dừng với lý do: ${item?.label || selectedReasonCode}`,
      'info'
    );
    setActiveReasonModalRow(null);
    setReasonNotes('');
  };

  const columns: Column<UnifiedPipelineRow>[] = [
    {
      header: 'KOC / Kênh',
      key: 'koc',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink-1">{r.kocName}</div>
          <div className="text-xs text-ink-2">@{r.kocHandle.replace(/^@/, '')}</div>
        </div>
      ),
    },
    {
      header: 'Nhãn hàng / Gian',
      key: 'brandStore',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-1">{r.brandName}</div>
          <div className="text-xs text-ink-2">{r.storeName}</div>
        </div>
      ),
    },
    {
      header: 'Cột mốc & Chặng chi tiết',
      key: 'stage',
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-ink-1">
              {r.pipeline.stageCode} · {r.pipeline.stageName}
            </span>
          </div>
          <div className="text-xs text-ink-2">{r.pipeline.subStatusName}</div>
          {r.pipeline.slaNotice && (
            <div className="text-2xs font-medium text-amber-600 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{r.pipeline.slaNotice}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Bóng ở chân',
      key: 'ballInCourt',
      render: (r) => {
        const bgColors: Record<BallInCourt, string> = {
          B2C_STAFF: 'bg-blue-50 text-blue-700 border-blue-200',
          KOC: 'bg-blue-50 text-blue-700 border-blue-200',
          BRAND: 'bg-amber-50 text-amber-700 border-amber-200',
          LEGAL_FINANCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          SYSTEM: 'bg-slate-50 text-slate-600 border-slate-200',
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${
              bgColors[r.pipeline.ballInCourt]
            }`}
          >
            {r.pipeline.ballInCourtLabel}
          </span>
        );
      },
    },
    {
      header: 'Chi phí',
      key: 'cost',
      align: 'right',
      render: (r) => (
        <span className="font-medium text-ink-1">
          {r.costVnd > 0 ? formatVndShort(r.costVnd) : '0đ (FOC)'}
        </span>
      ),
    },
    {
      header: 'Người phụ trách',
      key: 'pic',
      render: (r) => <span className="text-xs text-ink-1">{r.picName}</span>,
    },
    {
      header: 'Thao tác',
      key: 'action',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (r.sourceType === 'LISTING' && r.rawListing && onOpenListingModal) {
                onOpenListingModal(r.rawListing);
              } else if (r.sourceType === 'JOB' && r.rawDeal && r.rawJob && onOpenDealJobModal) {
                onOpenDealJobModal(r.rawDeal, r.rawJob);
              } else {
                setActiveQuickUpdateRow(r);
              }
            }}
          >
            Chi tiết
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setActiveReasonModalRow(r);
            }}
          >
            Cứu deal
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {(
          [
            { key: 'M1', label: '1. Tiếp cận & Đàm phán', sub: 'Chặng 1 - 4' },
            { key: 'M2', label: '2. Duyệt & Hợp đồng', sub: 'Chặng 5 - 8' },
            { key: 'M3', label: '3. Mẫu & Sản xuất', sub: 'Chặng 9 - 11' },
            { key: 'M4', label: '4. Air & Nghiệm thu', sub: 'Chặng 12 - 15' },
            { key: 'M5', label: '5. Thanh toán & Đóng', sub: 'Chặng 16 - 18' },
            { key: 'M19', label: 'Tạm dừng / Hủy', sub: 'Chặng 19' },
          ] as const
        ).map((m) => {
          const isSelected = selectedMacro === m.key;
          const count = funnelCounts[m.key] || 0;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMacro(isSelected ? 'ALL' : m.key)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-brand bg-brand-subtle/30 shadow-sm ring-1 ring-brand'
                  : 'border-line-1 bg-surface-1 hover:border-line-2'
              }`}
            >
              <div className="text-xs font-medium text-ink-2 truncate">{m.label}</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-semibold text-ink-1">{count}</span>
                <span className="text-2xs text-ink-2">{m.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 border rounded-lg border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Kẹt duyệt Brand (&gt; 48h)</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              {bottleneckAlerts.brandPending.length}
            </span>
          </div>
          <div className="text-xs text-amber-800 mt-1">
            Có {bottleneckAlerts.brandPending.length} đề xuất đang chờ nhãn hàng phê duyệt danh sách.
          </div>
        </div>

        <div className="p-3 border rounded-lg border-rose-200 bg-rose-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-900">Trễ Air / Thiếu mã Ads</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
              {bottleneckAlerts.airOverdue.length}
            </span>
          </div>
          <div className="text-xs text-rose-800 mt-1">
            Có {bottleneckAlerts.airOverdue.length} video đã air nhưng chưa bàn giao mã Ads hoặc trễ lịch air.
          </div>
        </div>

        <div className="p-3 border rounded-lg border-blue-200 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900">KOC im lặng (&gt; 24h)</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {bottleneckAlerts.kocSilent.length}
            </span>
          </div>
          <div className="text-xs text-blue-800 mt-1">
            Có {bottleneckAlerts.kocSilent.length} KOC chưa phản hồi báo giá hoặc kịch bản cần follow-up.
          </div>
        </div>
      </div>

      <FilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Tìm tên KOC, kênh, nhãn hàng, người phụ trách...',
        }}
        resultCount={filteredRows.length}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs h-8"
            >
              <option value="ALL">Tất cả Nhãn hàng</option>
              {brandsList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>

            <Select
              value={selectedBallInCourt}
              onChange={(e) => setSelectedBallInCourt(e.target.value as BallInCourt | 'ALL')}
              className="text-xs h-8"
            >
              <option value="ALL">Tất cả Trách nhiệm</option>
              <option value="B2C_STAFF">Chuyên viên B2C</option>
              <option value="KOC">KOC</option>
              <option value="BRAND">Nhãn hàng</option>
              <option value="LEGAL_FINANCE">Pháp chế & Kế toán</option>
            </Select>

            <Button
              size="sm"
              variant={onlyStalled ? 'primary' : 'secondary'}
              onClick={() => setOnlyStalled(!onlyStalled)}
            >
              Chỉ xem điểm nghẽn SLA
            </Button>

            {selectedMacro !== 'ALL' && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedMacro('ALL')}>
                Xóa lọc chặng
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={(r) => r.id}
        empty={<div className="p-8 text-center text-ink-2">Không tìm thấy KOC nào phù hợp với bộ lọc.</div>}
      />

      {activeReasonModalRow && (
        <Modal
          open={Boolean(activeReasonModalRow)}
          onClose={() => setActiveReasonModalRow(null)}
          title={`Ghi nhận lý do & Cứu deal (@${activeReasonModalRow.kocHandle})`}
        >
          <div className="space-y-4 p-4">
            <div>
              <label className="block text-xs font-semibold text-ink-1 mb-1">
                Lý do dừng hợp tác chuẩn hóa
              </label>
              <Select
                value={selectedReasonCode}
                onChange={(e) => setSelectedReasonCode(e.target.value)}
                className="w-full text-xs"
              >
                {KOC_REJECTION_REASONS_CATALOG.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.label}
                  </option>
                ))}
              </Select>
            </div>

            {(() => {
              const current = KOC_REJECTION_REASONS_CATALOG.find((r) => r.code === selectedReasonCode);
              if (!current) return null;
              return (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Gợi ý phương án cứu deal</span>
                  </div>
                  <div className="text-xs text-blue-800 mt-1">{current.tip}</div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-ink-1 mb-1">
                Ghi chú chi tiết trao đổi với KOC
              </label>
              <Input
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                placeholder="Nhập chi tiết yêu cầu của KOC hoặc nguyên nhân cụ thể..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setActiveReasonModalRow(null)}>
                Đóng
              </Button>
              <Button variant="danger" onClick={handleSaveRejectionReason}>
                Chuyển sang chặng Tạm dừng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {activeQuickUpdateRow && (
        <Modal
          open={Boolean(activeQuickUpdateRow)}
          onClose={() => setActiveQuickUpdateRow(null)}
          title={`Ghi nhận nhanh tiến độ (@${activeQuickUpdateRow.kocHandle})`}
        >
          <div className="space-y-4 p-4">
            <div>
              <span className="text-xs font-semibold text-ink-1">Chặng hiện tại:</span>{' '}
              <span className="text-xs text-ink-2">
                {activeQuickUpdateRow.pipeline.stageCode} · {activeQuickUpdateRow.pipeline.stageName}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-1 mb-1">
                Nội dung cập nhật tiến độ
              </label>
              <Input
                value={quickUpdateText}
                onChange={(e) => setQuickUpdateText(e.target.value)}
                placeholder="Nhập nội dung đã trao đổi hoặc ghi chú hành động tiếp theo..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setActiveQuickUpdateRow(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveQuickUpdate}>
                Lưu tiến độ
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
