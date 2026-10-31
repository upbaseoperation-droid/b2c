// Quy tắc nghiệp vụ, kiểu dữ liệu và kiểm soát quy trình 6 bước làm Video Self-channel (Video kênh Brand).
// Gắn với từng Kế hoạch tháng (InputPlanBreakdownState).
import { SELF_TYPES, resolveWeekRows } from './planBreakdownRules';
import type { InputPlanBreakdownState, Contributor, PlanWeekRow } from './types';
import type { ContentSlot } from './contentPlanRules';

export type SelfFormatKey = Exclude<keyof PlanWeekRow['self'], 'budgetNet'>;
export type SelfProductionMode = 'CTV_OUTSOURCE' | 'INHOUSE';
export type SelfSampleStatus = 'NOT_NEEDED' | 'ON_HAND' | 'PENDING_SHIP' | 'SHIPPING' | 'RECEIVED';
export type SelfScriptStatus = 'NOT_NEEDED' | 'DRAFT' | 'SUBMITTED' | 'REVISION' | 'APPROVED';
/** Brand duyệt kịch bản (sau khi Content duyệt nội bộ, trước khi quay). Brand im lặng chỉ cảnh báo, không tự duyệt. */
export type SelfBrandScriptStatus = 'NOT_SENT' | 'PENDING' | 'REVISION' | 'APPROVED';
/** Brand chưa phản hồi kịch bản quá số giờ này thì cảnh báo / raise (không Auto-Pass). */
export const BRAND_SCRIPT_SLA_HOURS = 72;
export type SelfVideoQaStatus = 'WAITING_DRAFT' | 'DRAFT_SUBMITTED' | 'REVISION' | 'INTERNAL_QA_PASSED' | 'BRAND_APPROVED';
export type SelfPublishPlatform = 'TIKTOK_BRAND' | 'SHOPEE_VIDEO' | 'FACEBOOK_PAGE' | 'INSTAGRAM' | 'YOUTUBE_SHORTS';
export type SelfAcceptanceStatus = 'PENDING' | 'PASSED' | 'REVISION' | 'REJECTED';
export type SelfPaymentStatus = 'NONE' | 'NOT_APPLICABLE' | 'REQUESTED' | 'PAID';
export type SelfJobStage = 'BRIEF' | 'SCRIPT' | 'PRODUCTION' | 'BRAND_AIR' | 'ACCEPTANCE' | 'SETTLEMENT';

export const SELF_FORMAT_LABEL: Record<SelfFormatKey, string> = {
  reviewVoice: 'Review voice',
  videoAi: 'Video giọng máy',
  videoRemix: 'Video remix',
  videoToLive: 'Video to live',
  nhacText: 'Nhạc text',
};

export const SELF_PRODUCTION_MODE_LABEL: Record<SelfProductionMode, string> = {
  CTV_OUTSOURCE: 'Thuê CTV / VJ ngoài',
  INHOUSE: 'Tự sản xuất nội bộ',
};

export const SELF_SAMPLE_LABEL: Record<SelfSampleStatus, string> = {
  NOT_NEEDED: 'Không cần mẫu',
  ON_HAND: 'Sẵn mẫu tại nhà/kho',
  PENDING_SHIP: 'Chờ gửi mẫu',
  SHIPPING: 'Đang giao mẫu',
  RECEIVED: 'Đã nhận mẫu',
};

export const SELF_SCRIPT_LABEL: Record<SelfScriptStatus, string> = {
  NOT_NEEDED: 'Không cần kịch bản',
  DRAFT: 'Bản nháp kịch bản',
  SUBMITTED: 'Đã nộp kịch bản',
  REVISION: 'Yêu cầu sửa kịch bản',
  APPROVED: 'Đã duyệt kịch bản',
};

export const SELF_BRAND_SCRIPT_LABEL: Record<SelfBrandScriptStatus, string> = {
  NOT_SENT: 'Chưa gửi Brand',
  PENDING: 'Chờ Brand duyệt kịch bản',
  REVISION: 'Brand yêu cầu sửa kịch bản',
  APPROVED: 'Brand đã duyệt kịch bản',
};

export const SELF_VIDEO_QA_LABEL: Record<SelfVideoQaStatus, string> = {
  WAITING_DRAFT: 'Chờ nộp video nháp',
  DRAFT_SUBMITTED: 'Đã nộp video nháp',
  REVISION: 'Yêu cầu dựng lại',
  INTERNAL_QA_PASSED: 'QA nội bộ Đạt',
  BRAND_APPROVED: 'Brand đã duyệt',
};

export const SELF_PLATFORM_LABEL: Record<SelfPublishPlatform, string> = {
  TIKTOK_BRAND: 'Kênh TikTok Brand',
  SHOPEE_VIDEO: 'Shopee Video',
  FACEBOOK_PAGE: 'Facebook Page',
  INSTAGRAM: 'Instagram',
  YOUTUBE_SHORTS: 'YouTube Shorts',
};

export const SELF_ACCEPTANCE_LABEL: Record<SelfAcceptanceStatus, string> = {
  PENDING: 'Chờ nghiệm thu',
  PASSED: 'Nghiệm thu Đạt',
  REVISION: 'Yêu cầu chỉnh sửa',
  REJECTED: 'Không đạt',
};

export const SELF_PAYMENT_LABEL: Record<SelfPaymentStatus, string> = {
  NONE: 'Chưa thanh toán',
  NOT_APPLICABLE: 'Không áp dụng (0đ)',
  REQUESTED: 'Đã lập ĐNTT',
  PAID: 'Đã thanh toán',
};

export const SELF_STAGE_LABEL: Record<SelfJobStage, string> = {
  BRIEF: 'Nhận Brief & Sản phẩm',
  SCRIPT: 'Soạn & Duyệt kịch bản',
  PRODUCTION: 'Quay dựng & QA video',
  BRAND_AIR: 'Duyệt Brand & Đăng video',
  ACCEPTANCE: 'Nghiệm thu video',
  SETTLEMENT: 'Quyết toán & Chi trả',
};

export interface SelfChannelJob {
  id: string;
  code: string;
  week: string;
  formatKey: SelfFormatKey;
  productionMode: SelfProductionMode;
  briefSlotId?: string;
  briefCode?: string;
  pillar: string;
  angle: string;
  productName: string;
  skuCode?: string;
  hook?: string;
  usp?: string;
  cta?: string;
  forbiddenClaims?: string;
  cartUrl?: string;
  briefUrl?: string;
  shippingAddress?: string;
  contentPic: string;
  contributorId?: string;
  contributorName: string;
  channelOrPhone?: string;
  contractNo?: string;
  legalId?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  sampleStatus: SelfSampleStatus;
  trackingCode?: string;
  scriptStatus: SelfScriptStatus;
  scriptUrl?: string;
  scriptNote?: string;
  brandScriptStatus: SelfBrandScriptStatus;
  brandScriptSentAt?: string;
  brandScriptDecidedAt?: string;
  brandScriptNote?: string;
  videoQaStatus: SelfVideoQaStatus;
  draftVideoUrl: string;
  finalDriveUrl?: string;
  qaChecklist: {
    hookOk: boolean;
    productOk: boolean;
    audioVisualOk: boolean;
    guidelineOk: boolean;
  };
  qaReviewedBy?: string;
  qaReviewedAt?: string;
  qaNote?: string;
  publishPlatform: SelfPublishPlatform;
  airLink: string;
  airedAt: string;
  deadline: string;
  sparkAdsCode?: string;
  views?: number;
  gmv?: number;
  /** Kết quả kiểm link đăng (máy chủ ghi): đúng kênh Brand, bài còn hiển thị, ảnh bìa làm ảnh nghiệm thu */
  airCheck?: SelfAirCheck;
  acceptanceStatus: SelfAcceptanceStatus;
  acceptedAt?: string;
  acceptedBy?: string;
  bbntCode?: string;
  bbntUrl?: string;
  acceptanceNote?: string;
  /** CTV xác nhận nhận việc: ASSIGNED (chờ), CONFIRMED (nhận), DECLINED (từ chối). Thiếu = việc cũ, coi như đã nhận. */
  ctvConfirmStatus?: SelfCtvConfirmStatus;
  ctvConfirmedAt?: string;
  ctvDeclineReason?: string;
  /** Kết quả đối chiếu nội dung bài đăng với brief (máy đề xuất, người quyết định) */
  contentCheck?: SelfContentCheck;
  feeGross: number;
  withholdPit10: boolean;
  pitTaxAmount: number;
  netPayout: number;
  paymentStatus: SelfPaymentStatus;
  dnttSlipCode?: string;
  requestedAt?: string;
  requestedBy?: string;
  paidAt?: string;
  uncRef?: string;
  paymentNote?: string;
  lifecycleStatus?: 'ACTIVE' | 'CANCELLED';
  updatedAt: string;
}

export type SelfCtvConfirmStatus = 'ASSIGNED' | 'CONFIRMED' | 'DECLINED';

export const SELF_CTV_CONFIRM_LABEL: Record<SelfCtvConfirmStatus, string> = {
  ASSIGNED: 'Chờ CTV xác nhận',
  CONFIRMED: 'CTV đã nhận việc',
  DECLINED: 'CTV từ chối',
};

export interface SelfContentCheckItem {
  key: string;
  label: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
  /** Trích dẫn từ caption / lời thoại làm bằng chứng */
  evidence?: string;
}

export interface SelfContentCheck {
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  checkedAt: string;
  checkedBy: string;
  checkedLink: string;
  /** RULES: chỉ luật từ khóa; MODEL: có thêm đối chiếu nội dung bằng mô hình */
  source: 'RULES' | 'MODEL';
  items: SelfContentCheckItem[];
  /** Gợi ý phản hồi cho CTV khi cần sửa */
  suggestion?: string;
}

export interface SelfAirCheck {
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  checkedAt: string;
  checkedBy: string;
  checkedLink: string;
  platform: string | null;
  authorHandle: string | null;
  expectedHandle: string | null;
  publishedAt: string | null;
  views: number | null;
  coverUrl: string | null;
  /** Các mục không đạt / cần xem lại */
  issues: string[];
}

export interface SelfSettlementBatch {
  id: string;
  slipCode: string;
  contributorName: string;
  contributorId?: string;
  jobIds: string[];
  jobCodes: string[];
  grossTotal: number;
  pitTaxTotal: number;
  netTotal: number;
  status: 'REQUESTED' | 'PAID';
  requestedAt: string;
  requestedBy: string;
  paidAt?: string;
  uncRef?: string;
  note?: string;
}

export interface SelfChannelBoardData {
  jobs: SelfChannelJob[];
  settlementBatches: SelfSettlementBatch[];
}

export const EMPTY_SELF_CHANNEL_BOARD: SelfChannelBoardData = {
  jobs: [],
  settlementBatches: [],
};

export function computeJobFinancials(
  feeGross: number,
  productionMode: SelfProductionMode,
  withholdPit10: boolean
): { feeGross: number; withholdPit10: boolean; pitTaxAmount: number; netPayout: number } {
  const gross = Math.max(0, Math.round(Number(feeGross) || 0));
  if (gross <= 0 || productionMode === 'INHOUSE') {
    return {
      feeGross: gross,
      withholdPit10: false,
      pitTaxAmount: 0,
      netPayout: gross,
    };
  }
  const pit = withholdPit10 ? Math.round(gross * 0.1) : 0;
  const net = Math.max(0, gross - pit);
  return {
    feeGross: gross,
    withholdPit10: Boolean(withholdPit10),
    pitTaxAmount: pit,
    netPayout: net,
  };
}

export function sanitizeSelfChannelBoard(raw?: Partial<SelfChannelBoardData> | null): SelfChannelBoardData {
  if (!raw || typeof raw !== 'object') {
    return { jobs: [], settlementBatches: [] };
  }
  const jobs = (Array.isArray(raw.jobs) ? raw.jobs : []).map((j, index): SelfChannelJob => {
    const formatKey: SelfFormatKey =
      j.formatKey && j.formatKey in SELF_FORMAT_LABEL ? j.formatKey : 'reviewVoice';
    const productionMode: SelfProductionMode =
      j.productionMode === 'INHOUSE' ? 'INHOUSE' : 'CTV_OUTSOURCE';
    const sampleStatus: SelfSampleStatus =
      j.sampleStatus && j.sampleStatus in SELF_SAMPLE_LABEL ? j.sampleStatus : 'NOT_NEEDED';
    const scriptStatus: SelfScriptStatus =
      j.scriptStatus && j.scriptStatus in SELF_SCRIPT_LABEL ? j.scriptStatus : 'NOT_NEEDED';
    const videoQaStatus: SelfVideoQaStatus =
      j.videoQaStatus && j.videoQaStatus in SELF_VIDEO_QA_LABEL ? j.videoQaStatus : 'WAITING_DRAFT';
    // Job cũ (trước khi có bước Brand duyệt kịch bản) đã quay hoặc xong: coi như Brand đã duyệt để không chặn ngược
    const brandScriptStatus: SelfBrandScriptStatus =
      j.brandScriptStatus && j.brandScriptStatus in SELF_BRAND_SCRIPT_LABEL
        ? j.brandScriptStatus
        : scriptStatus === 'APPROVED' && videoQaStatus !== 'WAITING_DRAFT'
        ? 'APPROVED'
        : 'NOT_SENT';
    const publishPlatform: SelfPublishPlatform =
      j.publishPlatform && j.publishPlatform in SELF_PLATFORM_LABEL ? j.publishPlatform : 'TIKTOK_BRAND';
    const acceptanceStatus: SelfAcceptanceStatus =
      j.acceptanceStatus && j.acceptanceStatus in SELF_ACCEPTANCE_LABEL ? j.acceptanceStatus : 'PENDING';

    const feeGross = Math.max(0, Math.round(Number(j.feeGross) || 0));
    const withholdPit10 = Boolean(j.withholdPit10);
    const financials = computeJobFinancials(feeGross, productionMode, withholdPit10);

    let paymentStatus: SelfPaymentStatus =
      j.paymentStatus && j.paymentStatus in SELF_PAYMENT_LABEL ? j.paymentStatus : 'NONE';
    if (productionMode === 'INHOUSE' && feeGross === 0 && paymentStatus === 'NONE') {
      paymentStatus = 'NOT_APPLICABLE';
    }

    const qaChecklist = {
      hookOk: Boolean(j.qaChecklist?.hookOk),
      productOk: Boolean(j.qaChecklist?.productOk),
      audioVisualOk: Boolean(j.qaChecklist?.audioVisualOk),
      guidelineOk: Boolean(j.qaChecklist?.guidelineOk),
    };

    return {
      id: String(j.id || `sc-job-${index + 1}`),
      code: String(j.code || `SC-${String(index + 1).padStart(2, '0')}`),
      week: String(j.week || ''),
      formatKey,
      productionMode,
      briefSlotId: j.briefSlotId ? String(j.briefSlotId) : undefined,
      briefCode: j.briefCode ? String(j.briefCode) : undefined,
      pillar: String(j.pillar || ''),
      angle: String(j.angle || ''),
      productName: String(j.productName || ''),
      skuCode: j.skuCode ? String(j.skuCode) : undefined,
      hook: j.hook ? String(j.hook) : undefined,
      usp: j.usp ? String(j.usp) : undefined,
      cta: j.cta ? String(j.cta) : undefined,
      forbiddenClaims: j.forbiddenClaims ? String(j.forbiddenClaims) : undefined,
      cartUrl: j.cartUrl ? String(j.cartUrl) : undefined,
      briefUrl: j.briefUrl ? String(j.briefUrl) : undefined,
      shippingAddress: j.shippingAddress ? String(j.shippingAddress) : undefined,
      contentPic: String(j.contentPic || 'Nhân viên'),
      contributorId: j.contributorId ? String(j.contributorId) : undefined,
      contributorName: String(j.contributorName || ''),
      channelOrPhone: j.channelOrPhone ? String(j.channelOrPhone) : undefined,
      contractNo: j.contractNo ? String(j.contractNo) : undefined,
      legalId: j.legalId ? String(j.legalId) : undefined,
      bankName: j.bankName ? String(j.bankName) : undefined,
      bankAccount: j.bankAccount ? String(j.bankAccount) : undefined,
      bankHolder: j.bankHolder ? String(j.bankHolder) : undefined,
      sampleStatus,
      trackingCode: j.trackingCode ? String(j.trackingCode) : undefined,
      scriptStatus,
      scriptUrl: j.scriptUrl ? String(j.scriptUrl) : undefined,
      scriptNote: j.scriptNote ? String(j.scriptNote) : undefined,
      brandScriptStatus,
      brandScriptSentAt: j.brandScriptSentAt ? String(j.brandScriptSentAt) : undefined,
      brandScriptDecidedAt: j.brandScriptDecidedAt ? String(j.brandScriptDecidedAt) : undefined,
      brandScriptNote: j.brandScriptNote ? String(j.brandScriptNote) : undefined,
      videoQaStatus,
      draftVideoUrl: String(j.draftVideoUrl || ''),
      finalDriveUrl: j.finalDriveUrl ? String(j.finalDriveUrl) : undefined,
      qaChecklist,
      qaReviewedBy: j.qaReviewedBy ? String(j.qaReviewedBy) : undefined,
      qaReviewedAt: j.qaReviewedAt ? String(j.qaReviewedAt) : undefined,
      qaNote: j.qaNote ? String(j.qaNote) : undefined,
      publishPlatform,
      airLink: String(j.airLink || ''),
      airedAt: String(j.airedAt || ''),
      deadline: String(j.deadline || ''),
      sparkAdsCode: j.sparkAdsCode ? String(j.sparkAdsCode) : undefined,
      views: typeof j.views === 'number' ? j.views : undefined,
      airCheck: j.airCheck && typeof j.airCheck === 'object' && j.airCheck.verdict ? { ...j.airCheck, issues: Array.isArray(j.airCheck.issues) ? j.airCheck.issues.map(String) : [] } : undefined,
      gmv: typeof j.gmv === 'number' ? j.gmv : undefined,
      acceptanceStatus,
      acceptedAt: j.acceptedAt ? String(j.acceptedAt) : undefined,
      acceptedBy: j.acceptedBy ? String(j.acceptedBy) : undefined,
      bbntCode: j.bbntCode ? String(j.bbntCode) : undefined,
      bbntUrl: j.bbntUrl ? String(j.bbntUrl) : undefined,
      acceptanceNote: j.acceptanceNote ? String(j.acceptanceNote) : undefined,
      ctvConfirmStatus: j.ctvConfirmStatus && j.ctvConfirmStatus in SELF_CTV_CONFIRM_LABEL ? j.ctvConfirmStatus : undefined,
      ctvConfirmedAt: j.ctvConfirmedAt ? String(j.ctvConfirmedAt) : undefined,
      ctvDeclineReason: j.ctvDeclineReason ? String(j.ctvDeclineReason) : undefined,
      contentCheck:
        j.contentCheck && typeof j.contentCheck === 'object' && j.contentCheck.verdict
          ? { ...j.contentCheck, items: Array.isArray(j.contentCheck.items) ? j.contentCheck.items : [] }
          : undefined,
      feeGross: financials.feeGross,
      withholdPit10: financials.withholdPit10,
      pitTaxAmount: financials.pitTaxAmount,
      netPayout: financials.netPayout,
      paymentStatus,
      dnttSlipCode: j.dnttSlipCode ? String(j.dnttSlipCode) : undefined,
      requestedAt: j.requestedAt ? String(j.requestedAt) : undefined,
      requestedBy: j.requestedBy ? String(j.requestedBy) : undefined,
      paidAt: j.paidAt ? String(j.paidAt) : undefined,
      uncRef: j.uncRef ? String(j.uncRef) : undefined,
      paymentNote: j.paymentNote ? String(j.paymentNote) : undefined,
      lifecycleStatus: j.lifecycleStatus === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
      updatedAt: String(j.updatedAt || new Date().toISOString()),
    };
  });

  const settlementBatches = (Array.isArray(raw.settlementBatches) ? raw.settlementBatches : []).map(
    (b, index): SelfSettlementBatch => ({
      id: String(b.id || `batch-${index + 1}`),
      slipCode: String(b.slipCode || `DNTT-SC-${String(index + 1).padStart(3, '0')}`),
      contributorName: String(b.contributorName || ''),
      contributorId: b.contributorId ? String(b.contributorId) : undefined,
      jobIds: Array.isArray(b.jobIds) ? b.jobIds.map(String) : [],
      jobCodes: Array.isArray(b.jobCodes) ? b.jobCodes.map(String) : [],
      grossTotal: Math.max(0, Math.round(Number(b.grossTotal) || 0)),
      pitTaxTotal: Math.max(0, Math.round(Number(b.pitTaxTotal) || 0)),
      netTotal: Math.max(0, Math.round(Number(b.netTotal) || 0)),
      status: b.status === 'PAID' ? 'PAID' : 'REQUESTED',
      requestedAt: String(b.requestedAt || new Date().toISOString()),
      requestedBy: String(b.requestedBy || 'Chuyên viên'),
      paidAt: b.paidAt ? String(b.paidAt) : undefined,
      uncRef: b.uncRef ? String(b.uncRef) : undefined,
      note: b.note ? String(b.note) : undefined,
    })
  );

  return { jobs, settlementBatches };
}

export function selfJobStageOf(job: SelfChannelJob): SelfJobStage {
  if (
    (!job.productName.trim() && !job.angle.trim()) ||
    (job.productionMode === 'CTV_OUTSOURCE' && !job.contributorName.trim())
  ) {
    return 'BRIEF';
  }
  if (
    !isSelfScriptReady(job) ||
    (job.productionMode === 'CTV_OUTSOURCE' &&
      job.sampleStatus !== 'RECEIVED' &&
      job.sampleStatus !== 'ON_HAND' &&
      job.sampleStatus !== 'NOT_NEEDED')
  ) {
    return 'SCRIPT';
  }
  if (job.videoQaStatus !== 'INTERNAL_QA_PASSED' && job.videoQaStatus !== 'BRAND_APPROVED') {
    return 'PRODUCTION';
  }
  if (!job.airLink.trim() || !job.airedAt.trim()) {
    return 'BRAND_AIR';
  }
  if (job.acceptanceStatus !== 'PASSED') {
    return 'ACCEPTANCE';
  }
  return 'SETTLEMENT';
}

/** Kịch bản sẵn sàng để quay: không cần kịch bản, hoặc Content duyệt nội bộ và Brand đã duyệt. */
export function isSelfScriptReady(job: Pick<SelfChannelJob, 'scriptStatus' | 'brandScriptStatus'>): boolean {
  return job.scriptStatus === 'NOT_NEEDED' || (job.scriptStatus === 'APPROVED' && job.brandScriptStatus === 'APPROVED');
}

/** Số giờ Brand chưa phản hồi kịch bản (null nếu không đang chờ Brand). */
export function brandScriptWaitingHours(job: Pick<SelfChannelJob, 'brandScriptStatus' | 'brandScriptSentAt'>, now = Date.now()): number | null {
  if (job.brandScriptStatus !== 'PENDING' || !job.brandScriptSentAt) return null;
  const sent = Date.parse(job.brandScriptSentAt);
  return Number.isFinite(sent) ? Math.max(0, (now - sent) / 3_600_000) : null;
}

/** Chuyển bước Brand duyệt kịch bản hợp lệ (máy chủ kiểm khi lưu). */
export function selfBrandScriptBlocker(prev: SelfChannelJob | undefined, next: SelfChannelJob): string | null {
  const from = prev?.brandScriptStatus ?? 'NOT_SENT';
  const to = next.brandScriptStatus;
  if (from === to) return null;
  if (to === 'PENDING' && next.scriptStatus !== 'APPROVED') return 'Content phải duyệt kịch bản nội bộ trước khi gửi Brand.';
  if ((to === 'APPROVED' || to === 'REVISION') && from !== 'PENDING') return 'Chỉ ghi kết quả Brand khi kịch bản đang chờ Brand duyệt.';
  if (to === 'REVISION' && !next.brandScriptNote?.trim()) return 'Ghi lại nội dung Brand yêu cầu sửa kịch bản.';
  return null;
}

/** Đã đạt QA nội bộ nhưng chưa đăng lên kênh Brand: "Đạt bàn giao", chưa nghiệm thu tính công. */
export function selfJobHandoverPassed(job: SelfChannelJob): boolean {
  return (
    (job.videoQaStatus === 'INTERNAL_QA_PASSED' || job.videoQaStatus === 'BRAND_APPROVED') &&
    !job.airLink.trim() &&
    job.acceptanceStatus !== 'PASSED'
  );
}

/** CTV chưa nhận việc hoặc đã từ chối thì không được nộp bài. Việc cũ (không có trạng thái) coi như đã nhận. */
export function selfCtvConfirmBlocker(job: Pick<SelfChannelJob, 'ctvConfirmStatus' | 'code'>): string | null {
  if (job.ctvConfirmStatus === 'ASSIGNED') return `Bạn cần xác nhận nhận việc ${job.code} trước khi nộp bài.`;
  if (job.ctvConfirmStatus === 'DECLINED') return `Việc ${job.code} bạn đã từ chối.`;
  return null;
}

export function selfJobAcceptanceBlocker(job: SelfChannelJob): string | null {
  // Link đăng phải được máy chủ kiểm (đúng kênh Brand, còn hiển thị) và khớp link hiện tại
  if (!job.airCheck || job.airCheck.checkedLink !== job.airLink.trim()) {
    if (job.airLink.trim()) return 'Chưa kiểm tra link đăng (bấm Kiểm tra link đăng).';
  } else if (job.airCheck.verdict === 'FAIL') {
    return `Link đăng không đạt kiểm tra: ${job.airCheck.issues.join('; ') || 'xem chi tiết'}.`;
  } else if (job.airCheck.verdict === 'REVIEW' && !job.acceptanceNote?.trim()) {
    return 'Link đăng cần xem lại: ghi chú lý do vẫn nghiệm thu Đạt.';
  }
  if (job.videoQaStatus !== 'INTERNAL_QA_PASSED' && job.videoQaStatus !== 'BRAND_APPROVED') {
    return 'Video nháp chưa được duyệt QA nội bộ.';
  }
  if (job.contentCheck && job.contentCheck.checkedLink === job.airLink.trim()) {
    if (job.contentCheck.verdict === 'FAIL' && !job.acceptanceNote?.trim()) {
      return 'Đối chiếu nội dung báo không đạt: yêu cầu CTV sửa hoặc ghi lý do nếu vẫn nghiệm thu.';
    }
    if (job.contentCheck.verdict === 'REVIEW' && !job.acceptanceNote?.trim()) {
      return 'Đối chiếu nội dung cần xem lại: ghi chú lý do vẫn nghiệm thu Đạt.';
    }
  }
  if (!job.airLink.trim()) {
    return 'Chưa nhập link video đăng trên kênh Brand.';
  }
  if (!job.airedAt.trim()) {
    return 'Chưa nhập ngày đăng video.';
  }
  return null;
}

/** Ngưỡng bắt buộc ký Hợp đồng đối với Cá nhân / CTV theo BR-03 §2 (tổng thù lao từ 10.000.000đ trở lên). Dưới ngưỡng này không bắt buộc HĐ. */
export const SELF_CONTRACT_THRESHOLD = 10_000_000;
/** Ngưỡng bắt buộc ký Biên bản nghiệm thu (BBNT) thanh lý riêng theo BR-04 §3 (từ 20.000.000đ trở lên). */
export const SELF_BBNT_THRESHOLD = 20_000_000;

/** Điều kiện lập phiếu thanh toán cho một video (BR-03, BR-04 tính theo giá trị từng video). */
export function selfJobPaymentBlocker(job: SelfChannelJob): string | null {
  if (job.feeGross <= 0) {
    return 'Job không phát sinh chi phí (0đ) nên không cần lập Đề nghị thanh toán.';
  }
  if (job.acceptanceStatus !== 'PASSED') {
    return 'Cần nghiệm thu Đạt video trước khi lập Đề nghị thanh toán.';
  }
  if (!job.contributorName.trim()) {
    return 'Thiếu họ tên CTV / người thụ hưởng.';
  }
  if (!job.legalId?.trim()) {
    return 'Thiếu số CCCD/MST của CTV.';
  }
  const effectiveGross = job.feeGross;
  if (effectiveGross >= SELF_CONTRACT_THRESHOLD && !job.contractNo?.trim()) {
    return 'Giá trị video từ 10.000.000đ trở lên bắt buộc có số Hợp đồng CTV.';
  }
  if (!job.bankName?.trim() || !job.bankAccount?.trim() || !job.bankHolder?.trim()) {
    return 'Thiếu thông tin tài khoản ngân hàng (Ngân hàng, Số TK, Chủ TK).';
  }
  if (job.productionMode === 'CTV_OUTSOURCE' && effectiveGross >= SELF_BBNT_THRESHOLD && !job.bbntCode?.trim()) {
    return 'Tổng giá trị từ 20.000.000đ trở lên bắt buộc có Biên bản nghiệm thu (BBNT).';
  }
  return null;
}

export interface SelfWeekTarget {
  week: string;
  totalQty: number;
  budgetNet: number;
  byFormat: Record<SelfFormatKey, number>;
}

export interface SelfPlanTarget {
  byFormat: Record<SelfFormatKey, number>;
  totalQty: number;
  totalBudgetNet: number;
  byWeek: SelfWeekTarget[];
}

export function computeSelfPlanTarget(plan: InputPlanBreakdownState): SelfPlanTarget {
  const byFormat: Record<SelfFormatKey, number> = {
    reviewVoice: 0,
    videoAi: 0,
    videoRemix: 0,
    videoToLive: 0,
    nhacText: 0,
  };
  let totalBudgetNet = 0;
  const weekRows = resolveWeekRows(plan);
  const byWeek: SelfWeekTarget[] = [];

  for (const r of weekRows) {
    const weekFormat: Record<SelfFormatKey, number> = {
      reviewVoice: Number(r.self?.reviewVoice || 0),
      videoAi: Number(r.self?.videoAi || 0),
      videoRemix: Number(r.self?.videoRemix || 0),
      videoToLive: Number(r.self?.videoToLive || 0),
      nhacText: Number(r.self?.nhacText || 0),
    };
    const weekBudget = Number(r.self?.budgetNet || 0);
    const weekQty = (Object.keys(weekFormat) as SelfFormatKey[]).reduce((s, k) => s + weekFormat[k], 0);

    (Object.keys(weekFormat) as SelfFormatKey[]).forEach(k => {
      byFormat[k] += weekFormat[k];
    });
    totalBudgetNet += weekBudget;

    byWeek.push({
      week: r.week,
      totalQty: weekQty,
      budgetNet: weekBudget,
      byFormat: weekFormat,
    });
  }

  let totalQty = (Object.keys(byFormat) as SelfFormatKey[]).reduce((s, k) => s + byFormat[k], 0);

  if (totalQty === 0 && totalBudgetNet === 0 && Array.isArray(plan.items)) {
    for (const it of plan.items) {
      if (it.category === 'SELF_CHANNEL') {
        const qty = Number(it.qty || 0);
        const budget = Number(it.totalBudget || 0);
        totalQty += qty;
        totalBudgetNet += budget;

        const code = (it.tierCode || '').toLowerCase();
        if (code.includes('voice')) byFormat.reviewVoice += qty;
        else if (code.includes('ai') || code.includes('máy')) byFormat.videoAi += qty;
        else if (code.includes('remix')) byFormat.videoRemix += qty;
        else if (code.includes('live')) byFormat.videoToLive += qty;
        else if (code.includes('nhạc') || code.includes('text')) byFormat.nhacText += qty;
        else byFormat.reviewVoice += qty;
      }
    }
  }

  return {
    byFormat,
    totalQty,
    totalBudgetNet,
    byWeek,
  };
}

export function createSelfChannelJob(
  partial: Partial<SelfChannelJob>,
  existingJobs: SelfChannelJob[],
  defaultPic = 'Nhân viên'
): SelfChannelJob {
  let nextCode = partial.code?.trim();
  if (!nextCode) {
    const existingNums = existingJobs
      .map(j => {
        const m = /^SC-(\d+)$/i.exec(j.code.trim());
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    nextCode = `SC-${String(maxNum + 1).padStart(2, '0')}`;
  }

  const productionMode: SelfProductionMode =
    partial.productionMode === 'INHOUSE' ? 'INHOUSE' : 'CTV_OUTSOURCE';
  const feeGross = Math.max(0, Math.round(Number(partial.feeGross) || 0));
  const withholdPit10 = Boolean(partial.withholdPit10);
  const financials = computeJobFinancials(feeGross, productionMode, withholdPit10);

  let paymentStatus: SelfPaymentStatus = partial.paymentStatus || 'NONE';
  if (productionMode === 'INHOUSE' && feeGross === 0 && paymentStatus === 'NONE') {
    paymentStatus = 'NOT_APPLICABLE';
  }

  return {
    id: partial.id || `sc-job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code: nextCode,
    week: partial.week || '',
    formatKey: partial.formatKey && partial.formatKey in SELF_FORMAT_LABEL ? partial.formatKey : 'reviewVoice',
    productionMode,
    briefSlotId: partial.briefSlotId,
    briefCode: partial.briefCode,
    pillar: partial.pillar || '',
    angle: partial.angle || '',
    productName: partial.productName || '',
    skuCode: partial.skuCode,
    hook: partial.hook,
    usp: partial.usp,
    cta: partial.cta,
    forbiddenClaims: partial.forbiddenClaims,
    cartUrl: partial.cartUrl,
    briefUrl: partial.briefUrl,
    shippingAddress: partial.shippingAddress,
    contentPic: partial.contentPic || defaultPic,
    contributorId: partial.contributorId,
    contributorName: partial.contributorName || '',
    channelOrPhone: partial.channelOrPhone,
    contractNo: partial.contractNo,
    legalId: partial.legalId,
    bankName: partial.bankName,
    bankAccount: partial.bankAccount,
    bankHolder: partial.bankHolder,
    sampleStatus: partial.sampleStatus || (productionMode === 'INHOUSE' ? 'ON_HAND' : 'PENDING_SHIP'),
    trackingCode: partial.trackingCode,
    scriptStatus: partial.scriptStatus || (partial.formatKey === 'nhacText' ? 'NOT_NEEDED' : 'DRAFT'),
    scriptUrl: partial.scriptUrl,
    scriptNote: partial.scriptNote,
    brandScriptStatus: partial.brandScriptStatus || 'NOT_SENT',
    brandScriptSentAt: partial.brandScriptSentAt,
    brandScriptDecidedAt: partial.brandScriptDecidedAt,
    brandScriptNote: partial.brandScriptNote,
    videoQaStatus: partial.videoQaStatus || 'WAITING_DRAFT',
    draftVideoUrl: partial.draftVideoUrl || '',
    finalDriveUrl: partial.finalDriveUrl,
    qaChecklist: {
      hookOk: false,
      productOk: false,
      audioVisualOk: false,
      guidelineOk: false,
      ...partial.qaChecklist,
    },
    qaReviewedBy: partial.qaReviewedBy,
    qaReviewedAt: partial.qaReviewedAt,
    qaNote: partial.qaNote,
    publishPlatform: partial.publishPlatform || 'TIKTOK_BRAND',
    airLink: partial.airLink || '',
    airedAt: partial.airedAt || '',
    deadline: partial.deadline || '',
    sparkAdsCode: partial.sparkAdsCode,
    views: partial.views,
    gmv: partial.gmv,
    acceptanceStatus: partial.acceptanceStatus || 'PENDING',
    acceptedAt: partial.acceptedAt,
    acceptedBy: partial.acceptedBy,
    bbntCode: partial.bbntCode,
    bbntUrl: partial.bbntUrl,
    acceptanceNote: partial.acceptanceNote,
    ctvConfirmStatus: partial.ctvConfirmStatus || (productionMode === 'CTV_OUTSOURCE' && partial.contributorId ? 'ASSIGNED' : undefined),
    ctvConfirmedAt: partial.ctvConfirmedAt,
    ctvDeclineReason: partial.ctvDeclineReason,
    contentCheck: partial.contentCheck,
    feeGross: financials.feeGross,
    withholdPit10: financials.withholdPit10,
    pitTaxAmount: financials.pitTaxAmount,
    netPayout: financials.netPayout,
    paymentStatus,
    dnttSlipCode: partial.dnttSlipCode,
    requestedAt: partial.requestedAt,
    requestedBy: partial.requestedBy,
    paidAt: partial.paidAt,
    uncRef: partial.uncRef,
    paymentNote: partial.paymentNote,
    lifecycleStatus: partial.lifecycleStatus || 'ACTIVE',
    updatedAt: partial.updatedAt || new Date().toISOString(),
  };
}

/**
 * Áp dụng thông tin CTV từ Danh bạ (Contributor) vào Job video:
 * - Tự động điền Hợp đồng, CCCD/MST, Tài khoản ngân hàng, Thư mục Drive, Địa chỉ nhận mẫu.
 * - Tự động đối chiếu SKU với danh sách hàng mẫu có sẵn tại nhà CTV (onHandProducts) để chuyển trạng thái sang ON_HAND.
 * - Áp giá chuẩn của CTV theo loại video của Job (formatRates) nếu Job đang để 0đ; giá đã nhập trên Job (Partnership sửa) được giữ.
 * - Không tự điền số HĐ / ngân hàng giả: thiếu thì để trống để điều kiện thanh toán chặn đúng.
 */
export function applyContributorToSelfJob(job: SelfChannelJob, ctv: Contributor): SelfChannelJob {
  const defaultRate = ctv.formatRates?.[job.formatKey] || ctv.unitRateAllInOne || 0;
  const nextFeeGross = job.feeGross > 0 ? job.feeGross : defaultRate;
  const fin = computeJobFinancials(nextFeeGross, 'CTV_OUTSOURCE', job.withholdPit10 || nextFeeGross >= 2000000);

  const skuLower = (job.skuCode || '').trim().toLowerCase();
  const prodLower = (job.productName || '').trim().toLowerCase();
  const hasSampleOnHand =
    Array.isArray(ctv.onHandProducts) &&
    ctv.onHandProducts.some(item => {
      const code = item.trim().toLowerCase();
      return Boolean(code && ((skuLower && skuLower.includes(code)) || (prodLower && prodLower.includes(code))));
    });

  const nextSampleStatus: SelfSampleStatus = hasSampleOnHand
    ? 'ON_HAND'
    : job.sampleStatus === 'NOT_NEEDED'
    ? 'PENDING_SHIP'
    : job.sampleStatus;

  const formattedAddress = ctv.shippingAddress
    ? `${ctv.shippingRecipientName || ctv.name} (${ctv.shippingPhone || ctv.phone || ''}) — ${ctv.shippingAddress}`
    : job.shippingAddress;

  return {
    ...job,
    productionMode: 'CTV_OUTSOURCE',
    contributorId: ctv.id,
    ctvConfirmStatus: job.contributorId === ctv.id && job.ctvConfirmStatus ? job.ctvConfirmStatus : 'ASSIGNED',
    ctvConfirmedAt: job.contributorId === ctv.id ? job.ctvConfirmedAt : undefined,
    ctvDeclineReason: undefined,
    contributorName: ctv.name,
    channelOrPhone: ctv.phone || ctv.channelLink || job.channelOrPhone,
    contractNo: ctv.contractCode || job.contractNo || '',
    legalId: ctv.cccd || ctv.taxCode || job.legalId || '',
    bankName: ctv.bankName || job.bankName || '',
    bankAccount: ctv.bankAccount || job.bankAccount || '',
    bankHolder: ctv.bankAccountName || job.bankHolder || ctv.name,
    finalDriveUrl: ctv.driveFolderUrl || job.finalDriveUrl,
    shippingAddress: formattedAddress,
    sampleStatus: nextSampleStatus,
    feeGross: fin.feeGross,
    withholdPit10: fin.withholdPit10,
    pitTaxAmount: fin.pitTaxAmount,
    netPayout: fin.netPayout,
    paymentStatus: job.paymentStatus === 'NOT_APPLICABLE' ? 'NONE' : job.paymentStatus,
    updatedAt: new Date().toISOString(),
  };
}

function inferFormatKeyFromSlot(formatText?: string): SelfFormatKey {
  const f = (formatText || '').toLowerCase();
  if (f.includes('ai') || f.includes('máy')) return 'videoAi';
  if (f.includes('remix')) return 'videoRemix';
  if (f.includes('live')) return 'videoToLive';
  if (f.includes('nhạc') || f.includes('text')) return 'nhacText';
  return 'reviewVoice';
}

export function generateSelfJobsFromPlanAndContent(
  plan: InputPlanBreakdownState,
  existingJobs: SelfChannelJob[],
  contentSlots: ContentSlot[],
  contributors: Contributor[],
  actorName: string
): { jobs: SelfChannelJob[]; addedCount: number } {
  const currentJobs = [...existingJobs];
  let addedCount = 0;
  const weekRows = resolveWeekRows(plan);

  // Tính đơn giá dự kiến theo từng tuần từ ngân sách Self-channel trong kế hoạch
  const weekDefaultUnitFee = new Map<string, number>();
  for (const r of weekRows) {
    const budgetNet = Number(r.self?.budgetNet || 0);
    const reviewVoiceTarget = Number(r.self?.reviewVoice || 0);
    if (reviewVoiceTarget > 0 && budgetNet > 0) {
      weekDefaultUnitFee.set(r.week, Math.round(budgetNet / reviewVoiceTarget));
    }
  }
  const fallbackUnitFee = Array.from(weekDefaultUnitFee.values())[0] || 0;

  // Bước A: Duyệt các contentSlots có row === 'SELF'
  const selfSlots = (contentSlots || []).filter(s => s.row === 'SELF');
  for (const slot of selfSlots) {
    const targetQty = Math.max(1, Number(slot.targetQty) || 1);
    const existingCountForSlot = currentJobs.filter(
      j => j.briefSlotId === slot.id && (!j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE')
    ).length;
    const missing = targetQty - existingCountForSlot;
    if (missing > 0) {
      const slotWeek = slot.week || weekRows[0]?.week || '';
      const inferredFormat = inferFormatKeyFromSlot(slot.format);
      const slotMode: SelfProductionMode = inferredFormat === 'reviewVoice' ? 'CTV_OUTSOURCE' : 'INHOUSE';
      const slotUnitFee =
        Number(slot.kocFee) > 0
          ? Number(slot.kocFee)
          : slotMode === 'CTV_OUTSOURCE'
          ? weekDefaultUnitFee.get(slotWeek) || fallbackUnitFee
          : 0;
      const assignedHandles = [
        ...(Array.isArray(slot.kocHandles) ? slot.kocHandles : []),
        ...(slot.kocHandle ? [slot.kocHandle] : []),
      ]
        .map(h => h.replace(/^@/, '').trim())
        .filter(Boolean);

      for (let i = 0; i < missing; i++) {
        let newJob = createSelfChannelJob(
          {
            briefSlotId: slot.id,
            briefCode: slot.briefCode,
            pillar: slot.pillar || '',
            angle: slot.angle || '',
            productName: slot.productName || slot.product || plan.storeName || '',
            skuCode: slot.sku || undefined,
            hook: slot.hook || '',
            usp: slot.usp || '',
            cta: slot.cta || '',
            forbiddenClaims: slot.forbiddenClaims || undefined,
            cartUrl: slot.cartUrl || undefined,
            briefUrl: slot.briefUrl || undefined,
            week: slotWeek,
            formatKey: inferredFormat,
            productionMode: slotMode,
            feeGross: slotUnitFee,
            withholdPit10: slotMode === 'CTV_OUTSOURCE' && slotUnitFee >= 2000000,
            contentPic: slot.pic || plan.pic || actorName || 'Nhân viên',
            sampleStatus: slotMode === 'CTV_OUTSOURCE' ? 'PENDING_SHIP' : 'ON_HAND',
            scriptStatus: inferredFormat === 'nhacText' ? 'NOT_NEEDED' : 'DRAFT',
          },
          currentJobs,
          actorName
        );

        const candidateHandle = assignedHandles[i] || assignedHandles[0];
        if (candidateHandle && contributors.length > 0) {
          const matchedCtv = contributors.find(
            c =>
              c.name.toLowerCase().includes(candidateHandle.toLowerCase()) ||
              (c.channelLink && c.channelLink.toLowerCase().includes(candidateHandle.toLowerCase())) ||
              (c.code || '').toLowerCase() === candidateHandle.toLowerCase()
          );
          if (matchedCtv) {
            newJob = applyContributorToSelfJob(newJob, matchedCtv);
          } else {
            newJob.contributorName = candidateHandle;
          }
        }

        currentJobs.push(newJob);
        addedCount++;
      }
    }
  }

  // Bước B: Duyệt resolveWeekRows(plan) để bù phần chỉ tiêu tuần còn thiếu
  for (const r of weekRows) {
    const week = r.week;
    const budgetNet = Number(r.self?.budgetNet || 0);
    const reviewVoiceTarget = Number(r.self?.reviewVoice || 0);

    for (const ft of SELF_TYPES) {
      const formatKey = ft.key as SelfFormatKey;
      const target = Number(r.self?.[formatKey] || 0);
      if (target <= 0) continue;

      const currentCount = currentJobs.filter(
        j => j.week === week && j.formatKey === formatKey && (!j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE')
      ).length;

      const deficit = target - currentCount;
      if (deficit > 0) {
        let productionMode: SelfProductionMode = 'INHOUSE';
        let feeGross = 0;

        if (formatKey === 'reviewVoice') {
          productionMode = 'CTV_OUTSOURCE';
          if (reviewVoiceTarget > 0 && budgetNet > 0) {
            feeGross = Math.round(budgetNet / reviewVoiceTarget);
          }
        } else {
          productionMode = 'INHOUSE';
          if (reviewVoiceTarget === 0 && budgetNet > 0) {
            const inhouseTotal =
              Number(r.self?.videoAi || 0) +
              Number(r.self?.videoRemix || 0) +
              Number(r.self?.videoToLive || 0) +
              Number(r.self?.nhacText || 0);
            if (inhouseTotal > 0) {
              feeGross = Math.round(budgetNet / inhouseTotal);
            }
          }
        }

        const withholdPit10 = productionMode === 'CTV_OUTSOURCE' && feeGross >= 2000000;

        for (let i = 0; i < deficit; i++) {
          const newJob = createSelfChannelJob(
            {
              week,
              formatKey,
              productionMode,
              feeGross,
              withholdPit10,
              productName: plan.storeName || '',
              contentPic: plan.pic || actorName || 'Nhân viên',
              sampleStatus: productionMode === 'CTV_OUTSOURCE' ? 'PENDING_SHIP' : 'ON_HAND',
              scriptStatus: formatKey === 'nhacText' ? 'NOT_NEEDED' : 'DRAFT',
            },
            currentJobs,
            actorName
          );
          currentJobs.push(newJob);
          addedCount++;
        }
      }
    }
  }

  return { jobs: currentJobs, addedCount };
}

export interface SelfFormatSummary {
  key: SelfFormatKey;
  label: string;
  targetQty: number;
  jobs: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
}

export interface SelfContributorSummary {
  contributorName: string;
  contributorId?: string;
  contractNo?: string;
  legalId?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  totalJobs: number;
  acceptedUnpaidJobs: SelfChannelJob[];
  requestedJobs: SelfChannelJob[];
  paidJobs: SelfChannelJob[];
  pendingGross: number;
  pendingPitTax: number;
  pendingNet: number;
  paidGross: number;
  legalReady: boolean;
  missingReason?: string;
}

export interface SelfChannelBoardSummary {
  targetQty: number;
  targetBudgetNet: number;
  totalJobs: number;
  inhouseJobs: number;
  ctvJobs: number;
  scriptApprovedCount: number;
  qaPassedCount: number;
  airedCount: number;
  acceptedCount: number;
  committedBudget: number;
  requestedBudget: number;
  paidBudget: number;
  netPaidAmount: number;
  isOverbudget: boolean;
  isUnbudgeted: boolean;
  byFormat: SelfFormatSummary[];
  byContributor: SelfContributorSummary[];
}

export function summarizeSelfChannelBoard(
  plan: InputPlanBreakdownState,
  board: SelfChannelBoardData
): SelfChannelBoardSummary {
  const target = computeSelfPlanTarget(plan);
  const activeJobs = (board.jobs || []).filter(j => !j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE');

  let inhouseJobs = 0;
  let ctvJobs = 0;
  let scriptApprovedCount = 0;
  let qaPassedCount = 0;
  let airedCount = 0;
  let acceptedCount = 0;
  let committedBudget = 0;
  let requestedBudget = 0;
  let paidBudget = 0;
  let netPaidAmount = 0;

  for (const j of activeJobs) {
    if (j.productionMode === 'INHOUSE') inhouseJobs++;
    else ctvJobs++;

    if (j.scriptStatus === 'APPROVED' || j.scriptStatus === 'NOT_NEEDED') scriptApprovedCount++;
    if (j.videoQaStatus === 'INTERNAL_QA_PASSED' || j.videoQaStatus === 'BRAND_APPROVED') qaPassedCount++;
    if (Boolean(j.airedAt || j.airLink.trim())) airedCount++;
    if (j.acceptanceStatus === 'PASSED') acceptedCount++;

    committedBudget += j.feeGross;
    if (j.paymentStatus === 'REQUESTED') requestedBudget += j.feeGross;
    if (j.paymentStatus === 'PAID') {
      paidBudget += j.feeGross;
      netPaidAmount += j.netPayout;
    }
  }

  const byFormat: SelfFormatSummary[] = (Object.keys(SELF_FORMAT_LABEL) as SelfFormatKey[]).map(key => {
    const fJobs = activeJobs.filter(j => j.formatKey === key);
    return {
      key,
      label: SELF_FORMAT_LABEL[key],
      targetQty: target.byFormat[key] || 0,
      jobs: fJobs.length,
      aired: fJobs.filter(j => Boolean(j.airedAt || j.airLink.trim())).length,
      accepted: fJobs.filter(j => j.acceptanceStatus === 'PASSED').length,
      committed: fJobs.reduce((s, j) => s + j.feeGross, 0),
      paid: fJobs.filter(j => j.paymentStatus === 'PAID').reduce((s, j) => s + j.feeGross, 0),
    };
  });

  const contribMap = new Map<string, SelfChannelJob[]>();
  // Gom theo mã CTV (hai CTV trùng tên không bị gộp); job cũ chưa có mã thì theo tên
  for (const j of activeJobs) {
    const name = j.contributorName.trim();
    if (!name && j.productionMode === 'INHOUSE') continue;
    const k = j.contributorId || name || '(Chưa gán CTV)';
    const list = contribMap.get(k) || [];
    list.push(j);
    contribMap.set(k, list);
  }

  const byContributor: SelfContributorSummary[] = Array.from(contribMap.entries()).map(([groupKey, cJobs]) => {
    const cName = cJobs.find(j => j.contributorName.trim())?.contributorName.trim() || groupKey;
    const firstWithDetails = cJobs.find(j => j.contractNo || j.legalId || j.bankAccount) || cJobs[0];
    const acceptedUnpaidJobs = cJobs.filter(j => j.acceptanceStatus === 'PASSED' && j.feeGross > 0 && j.paymentStatus === 'NONE');
    const requestedJobs = cJobs.filter(j => j.paymentStatus === 'REQUESTED');
    const paidJobs = cJobs.filter(j => j.paymentStatus === 'PAID');

    const pendingGross = acceptedUnpaidJobs.reduce((s, j) => s + j.feeGross, 0);
    // Thuế TNCN tính theo từng video (BR-09): từ 2.000.000đ khấu trừ 10%
    const effectivePitTax = acceptedUnpaidJobs.reduce((s, j) => s + (j.feeGross >= 2000000 ? Math.round(j.feeGross * 0.1) : 0), 0);
    const pendingPitTax = effectivePitTax;
    const pendingNet = Math.max(0, pendingGross - effectivePitTax);
    const paidGross = paidJobs.reduce((s, j) => s + j.feeGross, 0);
    const contractRequired = cJobs.some(j => j.feeGross >= SELF_CONTRACT_THRESHOLD);

    const hasContract = Boolean(firstWithDetails.contractNo?.trim());
    const hasLegalId = Boolean(firstWithDetails.legalId?.trim());
    const hasBank = Boolean(
      firstWithDetails.bankName?.trim() &&
      firstWithDetails.bankAccount?.trim() &&
      firstWithDetails.bankHolder?.trim()
    );
    const legalReady = (!contractRequired || hasContract) && hasLegalId && hasBank;

    const missingParts: string[] = [];
    if (contractRequired && !hasContract) missingParts.push('Hợp đồng (video ≥ 10tr)');
    if (!hasLegalId) missingParts.push('CCCD/MST');
    if (!hasBank) missingParts.push('Tài khoản ngân hàng');

    return {
      contributorName: cName,
      contributorId: firstWithDetails.contributorId,
      contractNo: firstWithDetails.contractNo,
      legalId: firstWithDetails.legalId,
      bankName: firstWithDetails.bankName,
      bankAccount: firstWithDetails.bankAccount,
      bankHolder: firstWithDetails.bankHolder,
      totalJobs: cJobs.length,
      acceptedUnpaidJobs,
      requestedJobs,
      paidJobs,
      pendingGross,
      pendingPitTax,
      pendingNet,
      paidGross,
      legalReady,
      missingReason: missingParts.length > 0 ? `Thiếu ${missingParts.join(', ')}` : undefined,
    };
  });

  return {
    targetQty: target.totalQty,
    targetBudgetNet: target.totalBudgetNet,
    totalJobs: activeJobs.length,
    inhouseJobs,
    ctvJobs,
    scriptApprovedCount,
    qaPassedCount,
    airedCount,
    acceptedCount,
    committedBudget,
    requestedBudget,
    paidBudget,
    netPaidAmount,
    isOverbudget: target.totalBudgetNet > 0 && committedBudget > target.totalBudgetNet,
    isUnbudgeted: target.totalBudgetNet <= 0 && committedBudget > 0,
    byFormat,
    byContributor,
  };
}
