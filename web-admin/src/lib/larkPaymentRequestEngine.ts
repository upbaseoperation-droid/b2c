// ============================================================================
// ĐỘNG CƠ KIỂM TRA HỒ SƠ BẢNG 3.2 & TẠO PHIẾU DUYỆT THANH TOÁN LARK (TẠM ỨNG / ĐNTT)
// Tuân thủ quy tắc:
// - BR-03: Nghĩa vụ ký hợp đồng (HKD/COM 100%, IND/CTV khi tạm ứng >= 2M Gross hoặc tổng >= 10M Gross)
// - BR-04: Nghĩa vụ ký BBNT (Tổng >= 20M Gross hoặc có chênh lệch/khấu trừ nghiệm thu hoặc HKD/COM)
// - BR-09: Tính thuế TNCN 10% (IND/CTV >= 2M) & VAT 8-10% (COM)
// - Quy tắc Leader B2C: 8 gian hàng có Nguyễn Thị Ngọc Tâm sơ duyệt, còn lại trình thẳng Đặng Thị Yến Nhi
// - Đấu nối 3 luồng Lark (Tài liệu VPyN & Usn0 29-30/10/2026):
//   + Luồng 1: Tạm ứng (Whiteboard QNvp) — mở sau khi ký Phụ lục SOW, HKD/COM kèm hóa đơn đợt 1
//   + Luồng 2: Nghiệm thu tháng & Khóa sổ WORKDAY(EOMONTH(air,0),3), Chốt data, mở khóa 2 đợt (LV 4-5, LV 10-11)
//   + Luồng 3: Thanh toán ĐNTT (Whiteboard KN8A/Le27/VvoF) — tự trừ tạm ứng, rẽ nhánh hạn mức B2C (<1M, 1-5M, >5M),
//              khép kín node KT Handle (Đã đi tiền + Gửi Bill UNC 100% cho KOC trong 7 ngày)
// ============================================================================

import type { BookingDealItem, KocItem } from './types';
import {
  calculateContractTax,
  detectSubjectKind,
  evaluateContractRules,
  numberToVietnameseWords,
  type SubjectKind,
} from './contracts/contractRules';

export type PaymentRequestType = 'ADVANCE' | 'SETTLEMENT';

export type LarkPaymentCategory =
  | 'Tạm ứng trước Booking KOC'
  | 'Thanh toán Booking KOC'
  | 'Tạm ứng trước Booking Livestream'
  | 'Thanh toán Booking Livestream'
  | 'Thanh toán CTV Content kênh';

export type ValidationGroupKey =
  | 'DEAL_BUDGET'
  | 'PAYEE_TAX'
  | 'ACCEPTANCE_TECH'
  | 'LEGAL_DOCS';

export interface PaymentValidationIssue {
  code: string;
  group: ValidationGroupKey;
  fieldKey:
    | 'bankName'
    | 'bankAccount'
    | 'bankHolder'
    | 'legalId'
    | 'linkAir'
    | 'postedDate'
    | 'sparkAdsCode'
    | 'contractUrl'
    | 'bbntUrl'
    | 'invoiceNumber'
    | 'brandApproval'
    | 'dealValue';
  fieldLabel: string;
  message: string;
  canQuickFix: boolean;
}

export interface DealPaymentOverrides {
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  legalId?: string; // CCCD 12 số hoặc MST
  taxAccountType?: 'IND' | 'HKD' | 'COM' | 'CTV';
  hasIdCardScan?: boolean;
  linkAir?: string;
  postedDate?: string;
  sparkAdsCode?: string;
  adsCodeStatus?: 'CHƯA_CẤP' | 'ĐÃ_NGHIỆM_THU' | 'KHÔNG_DÙNG';
  contractUrl?: string;
  bbntUrl?: string;
  invoiceNumber?: string;
  advanceRatePct?: number;
  advanceAmount?: number;
  isBrandBudgetAdvance?: boolean;
  brandConfirmPaymentDate?: string;
}

/** Các phiếu đã lập trước đó cho cùng mã đơn (máy chủ tự tổng hợp, không nhận từ client). */
export interface DealPaymentLedgerEntry {
  advanceRequestedAmount: number;
  settlementRequested: boolean;
}

export interface ResolvedPayeeProfile {
  subjectKind: SubjectKind;
  subjectLabel: string;
  kocId: string;
  kocStageName: string;
  kocChannelId: string;
  legalEntityName: string;
  legalId: string; // CCCD hoặc MST
  hasIdCardScan: boolean;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  isMcnOrAlternatePayee: boolean;
  mcnNote?: string;
  vietQrUrl?: string;
}

export interface DealPaymentLineBreakdown {
  dealId: string;
  dealCode: string;
  jobId?: string;
  brandName: string;
  storeName: string;
  productName: string;
  salaryGrade: string;
  bookingPic: string;
  bookingLeader?: string;
  approverDirector: string;
  requestType: PaymentRequestType;
  larkPaymentCategory: LarkPaymentCategory;
  transferTitle: string;
  masterContractCode?: string;
  contractAppendixCode?: string;
  videoAssetNetAmount?: number;
  addonServicesNetAmount?: number;
  agreedNetAmount: number;
  droppedDeductionAmount: number;
  effectiveSettledNetAmount: number;
  advancePaidAmount: number;
  requestBaseNetAmount: number;
  vatRate: number;
  vatAmount: number;
  pitDeductionRate: number;
  pitDeductionAmount: number;
  grossContractAmount: number;
  netTransferAmount: number;
  linkAir: string;
  postedDate: string;
  sparkAdsCode: string;
  contractUrl: string;
  bbntUrl: string;
  invoiceNumber: string;
  isContractMandatory: boolean;
  contractMandatoryReason: string;
  isBbntMandatory: boolean;
  bbntMandatoryReason: string;
  isEligible: boolean;
  issues: PaymentValidationIssue[];
}

export interface LarkPaymentRequestSlip {
  id: string;
  slipCode: string;
  requestType: PaymentRequestType;
  requestTypeLabel: string;
  larkPaymentCategory?: LarkPaymentCategory;
  transferTitle?: string;
  month: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  isBrandBudgetAdvance?: boolean;
  brandConfirmPaymentDate?: string;
  payee: ResolvedPayeeProfile;
  approvalRoute: {
    hasBookingLeader: boolean;
    bookingLeaderName?: string;
    marketingDirectorName: string;
    financeApproverName: string;
    b2cAmountTier?: '< 1.000.000 đ' | '1.000.000 – 5.000.000 đ' | '> 5.000.000 đ';
    larkWhiteboardCode?: 'QNvp' | 'KN8A / Le27' | 'VvoF';
    routeSummary: string;
  };
  lineItems: DealPaymentLineBreakdown[];
  totals: {
    dealsCount: number;
    agreedNetTotal: number;
    droppedDeductionTotal: number;
    advancePaidTotal: number;
    requestBaseNetTotal: number;
    vatTotal: number;
    pitTax10PctTotal: number;
    grossTotal: number;
    netTransferTotal: number;
    amountInWords: string;
  };
  larkSync: {
    approvalInstanceCode: string;
    larkbaseRecordId: string;
    larkAppToken: string;
    larkTableId: string;
    anycrossWebhookDelivered: boolean;
    syncMode: 'LIVE_LARK_API' | 'ANYCROSS_WEBHOOK' | 'SANDBOX_SIMULATED';
    approvalStatus:
      | 'PENDING_LEADER'
      | 'PENDING_DIRECTOR'
      | 'PENDING_FINANCE'
      | 'APPROVED'
      | 'PAID'
      | 'REJECTED';
    syncedAt: string;
    /** Trạng thái thô lần cuối đọc từ Lark Approval (PENDING / APPROVED / REJECTED / CANCELED) */
    lastLarkStatus?: string;
    /** Node KT Handle trên Bảng 6.1: Đã đi tiền + Mã/Link Bill UNC gửi KOC trong 7 ngày (P-07) */
    daDiTien?: boolean;
    uncBillCode?: string;
    uncSentToKocAt?: string;
    rejectedReason?: string;
  };
  /** Job trên bảng Deal của từng dòng phiếu, để trạng thái phiếu tự cập nhật về Job */
  planJobRefs?: Array<{ planId: string; dealId: string; jobId: string }>;
  /** Việc Content kênh Brand của phiếu (mỗi phiếu một video): trạng thái phiếu tự cập nhật về bảng Self-channel */
  selfJobRefs?: Array<{ planId: string; jobId: string }>;
}

/**
 * Chuẩn hóa Tên chủ tài khoản ngân hàng sang IN HOA KHÔNG DẤU (Giải quyết P-02: 126 dòng lỗi trên S40)
 */
export function normalizeBankHolderUpperNoAccent(raw?: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function isBankHolderValidUpperNoAccent(raw?: string): boolean {
  const trimmed = (raw || '').trim();
  if (!trimmed) return false;
  return trimmed === normalizeBankHolderUpperNoAccent(trimmed) && /^[A-Z0-9\s]+$/.test(trimmed);
}

// 8 gian hàng có Trưởng nhóm Nguyễn Thị Ngọc Tâm sơ duyệt (Cột 55 File 4.1.1)
const NGOC_TAM_LEADER_PATTERNS: RegExp[] = [
  /\bclub\s*clio\b/i,
  /\bcindy\s*bloom\b/i,
  /\bmine\b/i,
  /\beupc\b/i,
  /\bl['’]?occitane\b/i,
  /\bbye\s*bye\s*blemish\b/i,
  /\brejuran\b/i,
];

export function resolveStoreBookingLeader(storeOrBrandName?: string, explicitLeader?: string): string | undefined {
  if (explicitLeader && explicitLeader.toLowerCase().includes('ngọc tâm')) {
    return 'Nguyễn Thị Ngọc Tâm';
  }
  const normalized = (storeOrBrandName || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!normalized) return undefined;
  // Theo GEMINI.md: Toàn bộ gian Shopee (trừ ClubClio Shopee) chỉ có 1 PIC, không qua Trưởng nhóm trung gian
  if (normalized.includes('shopee') && !/\bclub\s*clio\b/i.test(normalized)) {
    return undefined;
  }
  if (NGOC_TAM_LEADER_PATTERNS.some(re => re.test(normalized))) {
    return 'Nguyễn Thị Ngọc Tâm';
  }
  return undefined;
}

const BANK_BIN_MAP: Record<string, string> = {
  vietcombank: '970436',
  vcb: '970436',
  techcombank: '970407',
  tcb: '970407',
  mbbank: '970422',
  mb: '970422',
  acb: '970416',
  vpbank: '970432',
  tpbank: '970423',
  bidv: '970418',
  vietinbank: '970415',
  ctg: '970415',
  sacombank: '970403',
  vib: '970441',
  hdbank: '970437',
  shb: '970443',
  ocb: '970448',
  msb: '970426',
  seabank: '970440',
  agribank: '970405',
};

export function buildVietQrImageUrl(params: {
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  amount: number;
  addInfo: string;
}): string | undefined {
  const bankKey = (params.bankName || '').toLowerCase().replace(/\s+/g, '');
  const matchedBin = Object.entries(BANK_BIN_MAP).find(([k]) => bankKey.includes(k))?.[1];
  const account = (params.bankAccount || '').replace(/\s+/g, '');
  if (!matchedBin || !account || params.amount <= 0) return undefined;
  const holder = encodeURIComponent(normalizeBankHolderUpperNoAccent(params.bankHolder));
  const memo = encodeURIComponent(params.addInfo.slice(0, 50));
  return `https://img.vietqr.io/image/${matchedBin}-${account}-compact2.png?amount=${Math.round(params.amount)}&addInfo=${memo}&accountName=${holder}`;
}

/**
 * Kiểm tra link bài đăng chuẩn trên Bảng 3.2:
 * - Bắt buộc là link đầy đủ có Video ID / Post ID
 * - Chặn cứng link rút gọn vt.tiktok.com / vm.tiktok.com chưa giải mã
 */
export function validateStandardAirLink(rawUrl?: string): {
  valid: boolean;
  reason?: string;
} {
  const url = (rawUrl || '').trim();
  if (!url) {
    return {
      valid: false,
      reason: 'Chưa có Link bài đăng (linkAir) trên Bảng 3.2.',
    };
  }
  if (/^https?:\/\/(vt|vm)\.tiktok\.com\//i.test(url)) {
    return {
      valid: false,
      reason: 'Link đang ở dạng rút gọn (vt.tiktok.com). Kế toán yêu cầu dán link dài chuẩn có chứa Video ID (tiktok.com/@.../video/...).',
    };
  }
  const isTikTokFull = /^https?:\/\/(www\.|m\.)?tiktok\.com\/@[^/]+\/(video|photo)\/\d+/i.test(url);
  const isShopeeVideo = /^https?:\/\/([a-z0-9-]+\.)?shopee\.vn\//i.test(url);
  const isFacebookFull = /^https?:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/.+/i.test(url);
  const isInstagramFull = /^https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[^/]+/i.test(url);
  const isYoutubeFull = /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be)\/.+/i.test(url);

  if (isTikTokFull || isShopeeVideo || isFacebookFull || isInstagramFull || isYoutubeFull) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: 'Link bài đăng chưa đúng định dạng link dài chuẩn chứa ID video (VD: https://www.tiktok.com/@koc/video/742...).',
  };
}

/**
 * Giải quyết thông tin thụ hưởng & pháp lý của KOC từ Deal (Bảng 3.2) + Danh bạ KOC (Bảng 3.1) + Override
 */
export function resolvePayeeProfileForDeal(
  deal: BookingDealItem,
  koc?: KocItem,
  override?: DealPaymentOverrides
): ResolvedPayeeProfile {
  const activeProfile =
    deal.legalProfileSnapshot ||
    (koc?.legalProfiles && deal.legalProfileId
      ? koc.legalProfiles.find(p => p.id === deal.legalProfileId)
      : undefined) ||
    koc?.legalProfiles?.find(p => p.isDefault) ||
    koc?.legalProfiles?.[0];

  const profileKind: SubjectKind | undefined =
    activeProfile?.legalType === 'COMPANY'
      ? 'COM'
      : activeProfile?.legalType === 'HOUSEHOLD'
      ? 'HKD'
      : activeProfile?.legalType === 'INDIVIDUAL'
      ? 'IND'
      : undefined;

  const detectedKind = override?.taxAccountType || profileKind || detectSubjectKind(koc, deal);
  const subjectLabel = {
    IND: 'Cá nhân (Khấu trừ 10% TNCN khi ≥ 2M)',
    HKD: 'Hộ kinh doanh (Trọn gói thuế)',
    COM: 'Công ty / MCN (Xuất HĐ VAT 8-10%)',
    CTV: 'Cộng tác viên (Khấu trừ 10% TNCN khi ≥ 2M)',
  }[detectedKind];

  const altPayee = koc?.alternatePayees?.[0];

  const legalId = (
    override?.legalId ??
    activeProfile?.taxCode ??
    activeProfile?.cccd ??
    deal.kocIdCardNumber ??
    (detectedKind === 'COM' || detectedKind === 'HKD' ? koc?.taxCode || koc?.cccd : koc?.cccd || koc?.taxCode) ??
    altPayee?.legalId ??
    ''
  ).trim();

  const bankName = (
    override?.bankName ??
    activeProfile?.bankName ??
    deal.kocBankName ??
    koc?.bankName ??
    altPayee?.bankName ??
    ''
  ).trim();

  const bankAccount = (
    override?.bankAccount ??
    activeProfile?.bankAccountNumber ??
    activeProfile?.bankAccount ??
    deal.kocBankAccount ??
    koc?.bankAccount ??
    altPayee?.bankAccount ??
    ''
  )
    .replace(/\s+/g, '')
    .trim();

  const defaultHolder =
    activeProfile?.bankHolderName ||
    activeProfile?.holderName ||
    (detectedKind === 'COM' || detectedKind === 'HKD'
      ? koc?.companyName || altPayee?.holderName || koc?.realName || deal.kocStageName
      : koc?.realName || altPayee?.holderName || deal.kocStageName);

  const bankHolder = (
    override?.bankHolder ??
    deal.kocBankHolder ??
    defaultHolder ??
    ''
  ).trim();

  const hasIdCardScan = Boolean(
    override?.hasIdCardScan ??
    (activeProfile?.legalAttachments && activeProfile.legalAttachments.length > 0) ??
    deal.hasIdCardScan ??
    koc?.isOcrVerified ??
    Boolean(legalId.length >= 9)
  );

  const isMcnOrAlternatePayee = Boolean(
    koc?.sharedMcnInfo ||
    (altPayee && bankHolder && altPayee.holderName.toLowerCase() === bankHolder.toLowerCase())
  );

  return {
    subjectKind: detectedKind,
    subjectLabel,
    kocId: koc?.id || deal.kocId,
    kocStageName: deal.kocStageName || koc?.stageName || '',
    kocChannelId: deal.kocChannelId || koc?.channelId || '',
    legalEntityName:
      detectedKind === 'COM' || detectedKind === 'HKD'
        ? activeProfile?.holderName || koc?.companyName || bankHolder || deal.kocStageName
        : activeProfile?.holderName || koc?.realName || bankHolder || deal.kocStageName,
    legalId,
    hasIdCardScan,
    bankName,
    bankAccount,
    bankHolder,
    isMcnOrAlternatePayee,
    mcnNote: koc?.sharedMcnInfo,
  };
}

/**
 * Xác định Loại thanh toán chuẩn trên Form Lark Approval §3.3.2 & Bảng 6.1
 * (Bao gồm cả Booking KOC Video và Booking Livestream trả phí theo chốt 30/10)
 */
export function resolveLarkPaymentCategory(
  deal: BookingDealItem,
  requestType: PaymentRequestType
): LarkPaymentCategory {
  const isLivestream =
    deal.bookingFormat === 'Phiên Livestream' ||
    (deal.bookingFormat || '').toLowerCase().includes('live') ||
    (deal.contentPillar || '').toLowerCase().includes('live');
  if (requestType === 'ADVANCE') {
    return isLivestream ? 'Tạm ứng trước Booking Livestream' : 'Tạm ứng trước Booking KOC';
  }
  return isLivestream ? 'Thanh toán Booking Livestream' : 'Thanh toán Booking KOC';
}

/**
 * Đánh giá và kiểm tra chặn cứng 100% một dòng Booking trên Bảng 3.2 trước khi tạo phiếu Tạm ứng / ĐNTT
 */
export function evaluateDealForPaymentRequest(
  deal: BookingDealItem,
  koc: KocItem | undefined,
  requestType: PaymentRequestType,
  override?: DealPaymentOverrides,
  ledger?: DealPaymentLedgerEntry
): DealPaymentLineBreakdown {
  const issues: PaymentValidationIssue[] = [];
  const payee = resolvePayeeProfileForDeal(deal, koc, override);

  // 1. Tính toán số tiền Net theo Deal (Asset Video + Dịch vụ gia tăng), khấu trừ hạng mục DROPPED, tạm ứng
  const agreedNetAmount = Math.max(0, Math.round(deal.totalValue || 0));
  const droppedDeliverablesCost = (deal.deliverables || [])
    .filter(item => item.lockStatus === 'DROPPED')
    .reduce((sum, item) => sum + Math.round(item.allocatedCostVnd || 0), 0);
  const droppedAddonsCost = (deal.rightsTerms || [])
    .filter(item => item.acceptanceStatus === 'DROPPED')
    .reduce((sum, item) => sum + Math.round(item.allocatedCostVnd || 0), 0);
  const droppedDeductionAmount = Math.max(
    droppedDeliverablesCost + droppedAddonsCost,
    Math.round(deal.droppedCostVnd || 0)
  );
  const addonServicesNetAmount =
    deal.addonsCostVnd !== undefined
      ? Math.round(deal.addonsCostVnd)
      : (deal.rightsTerms || []).reduce(
          (sum, item) => sum + Math.round(item.allocatedCostVnd || 0),
          0
        );
  const videoAssetNetAmount =
    deal.videoAssetCostVnd !== undefined
      ? Math.round(deal.videoAssetCostVnd)
      : Math.max(0, agreedNetAmount - addonServicesNetAmount);

  const effectiveSettledNetAmount = Math.max(0, agreedNetAmount - droppedDeductionAmount);

  // Tạm ứng: chỉ cho phép khi Phụ lục SOW cấu hình Thanh toán 2 đợt (TWO_TIMES); nếu SOW là ONE_TIME thì chặn = 0đ
  const isExplicitOneTime = deal.paymentScheduleOption === 'ONE_TIME';
  const defaultAdvance = isExplicitOneTime
    ? 0
    : override?.advanceAmount !== undefined && override.advanceAmount > 0
    ? Math.round(override.advanceAmount)
    : deal.advanceAmount && deal.advanceAmount > 0
    ? Math.round(deal.advanceAmount)
    : Math.round(agreedNetAmount * ((override?.advanceRatePct ?? 50) / 100));

  // Tất toán trừ phần đã tạm ứng (Giải quyết P-03: tự động lấy từ phiếu tạm ứng đã duyệt, không nhập tay sai lệch)
  const advanceFromDeal =
    deal.status === 'ADVANCE_PAID' || Boolean(deal.larkAdvanceApprovalCode) || (deal.advanceAmount || 0) > 0
      ? deal.advanceAmount || 0
      : 0;
  const advancePaidAmount =
    requestType === 'SETTLEMENT'
      ? Math.min(effectiveSettledNetAmount, Math.max(advanceFromDeal, ledger?.advanceRequestedAmount || 0))
      : 0;

  const requestBaseNetAmount =
    requestType === 'ADVANCE'
      ? Math.min(agreedNetAmount, defaultAdvance)
      : Math.max(0, effectiveSettledNetAmount - advancePaidAmount);

  // Tính thuế TNCN 10% / VAT theo quy định BR-09 trên phần thanh toán đợt này
  const taxResult = calculateContractTax({
    subjectKind: payee.subjectKind,
    baseAmount: requestBaseNetAmount,
    vatRatePercent: deal.vatRatePercent ?? 8,
    isNetPayment: true,
  });

  // 2. Đánh giá quy tắc pháp lý BR-03 (Hợp đồng) và BR-04 (BBNT)
  const ruleEval = evaluateContractRules({
    koc,
    deal,
    kind: requestType === 'SETTLEMENT' ? 'ACCEPTANCE' : 'CONTRACT',
    totalValue: agreedNetAmount,
    advanceAmount: requestType === 'ADVANCE' ? requestBaseNetAmount : advancePaidAmount,
    actualSettledValue: effectiveSettledNetAmount,
  });

  // 3. Lấy các trường nghiệm thu & chứng từ (ưu tiên override từ form bổ sung nhanh; không tự bịa trạng thái hay link — P2)
  const linkAir = (override?.linkAir ?? deal.tiktokVideoUrl ?? deal.videoUrl ?? '').trim();
  const postedDate = (override?.postedDate ?? deal.postedDate ?? deal.postDate ?? '').trim();
  const sparkAdsCode = (override?.sparkAdsCode ?? deal.sparkAdsCode ?? '').trim();
  const adsCodeStatus =
    override?.adsCodeStatus ??
    deal.adsCodeStatus ??
    (sparkAdsCode ? 'ĐÃ_NGHIỆM_THU' : 'CHỜ_NGHIỆM_THU');
  const contractUrl = (
    override?.contractUrl ??
    deal.contractAppendixSignedUrl ??
    deal.contractScanUrl ??
    deal.signedContractUrl ??
    deal.masterContractSignedUrl ??
    koc?.contractDriveUrl ??
    ''
  ).trim();
  const bbntUrl = (override?.bbntUrl ?? deal.bbntSignedUrl ?? '').trim();
  const invoiceNumber = (override?.invoiceNumber ?? '').trim();

  // =========================================================================
  // KIỂM TRA CHẶN CỨNG 100% THEO 4 NHÓM NGHIỆP VỤ BẢNG 3.2 & LARK APPROVAL
  // =========================================================================

  // NHÓM 1: ĐỊNH DANH ĐƠN & NGÂN SÁCH (DEAL_BUDGET)
  if (agreedNetAmount <= 0 || deal.isFreeSample || deal.salaryGrade === 'TAP UpAffiliate') {
    issues.push({
      code: 'FOC_ZERO_COST',
      group: 'DEAL_BUDGET',
      fieldKey: 'dealValue',
      fieldLabel: 'Giá trị Booking Net',
      message: `Mã đơn ${deal.dealCode} là đơn gửi mẫu miễn phí (FOC 0đ), không thuộc diện lập phiếu thanh toán.`,
      canQuickFix: false,
    });
  }

  if (deal.brandApprovalStatus !== 'ĐÃ_DUYỆT') {
    issues.push({
      code: 'BRAND_NOT_APPROVED',
      group: 'DEAL_BUDGET',
      fieldKey: 'brandApproval',
      fieldLabel: 'Trạng thái Brand duyệt',
      message: `Mã đơn ${deal.dealCode} chưa được Brand duyệt (${deal.brandApprovalStatus || 'CHỜ_DUYỆT'}).`,
      canQuickFix: false,
    });
  }

  if (requestBaseNetAmount <= 0 && agreedNetAmount > 0) {
    issues.push({
      code: 'ZERO_REMAINING_AMOUNT',
      group: 'DEAL_BUDGET',
      fieldKey: 'dealValue',
      fieldLabel: 'Số tiền đề nghị thanh toán',
      message: `Số tiền đề nghị thanh toán bằng 0đ (đơn đã thanh toán hết hoặc khấu trừ 100%).`,
      canQuickFix: false,
    });
  }

  if (ledger?.settlementRequested) {
    issues.push({
      code: 'SETTLEMENT_ALREADY_REQUESTED',
      group: 'DEAL_BUDGET',
      fieldKey: 'dealValue',
      fieldLabel: 'Phiếu tất toán',
      message: `Mã đơn ${deal.dealCode} đã có phiếu tất toán trước đó, không lập thêm phiếu.`,
      canQuickFix: false,
    });
  }

  if (requestType === 'ADVANCE' && (ledger?.advanceRequestedAmount || 0) > 0) {
    issues.push({
      code: 'ADVANCE_ALREADY_REQUESTED',
      group: 'DEAL_BUDGET',
      fieldKey: 'dealValue',
      fieldLabel: 'Phiếu tạm ứng',
      message: `Mã đơn ${deal.dealCode} đã có phiếu tạm ứng ${(ledger?.advanceRequestedAmount || 0).toLocaleString('vi-VN')}đ, không lập thêm phiếu tạm ứng.`,
      canQuickFix: false,
    });
  }

  if (requestType === 'SETTLEMENT' && deal.status === 'FINAL_PAID') {
    issues.push({
      code: 'ALREADY_FINAL_PAID',
      group: 'DEAL_BUDGET',
      fieldKey: 'dealValue',
      fieldLabel: 'Trạng thái tất toán',
      message: `Mã đơn ${deal.dealCode} đã được tất toán trước đó (${deal.larkFinalApprovalCode || 'FINAL_PAID'}).`,
      canQuickFix: false,
    });
  }

  // NHÓM 2: THÔNG TIN THỤ HƯỞNG, CCCD/MST & THUẾ (PAYEE_TAX — Giải quyết P-02)
  if (!payee.legalId || payee.legalId.length < 9) {
    issues.push({
      code: 'MISSING_LEGAL_ID',
      group: 'PAYEE_TAX',
      fieldKey: 'legalId',
      fieldLabel: payee.subjectKind === 'COM' || payee.subjectKind === 'HKD' ? 'Mã số thuế (MST)' : 'Số CCCD (12 số)',
      message: `Thiếu ${payee.subjectKind === 'COM' || payee.subjectKind === 'HKD' ? 'Mã số thuế' : 'Số CCCD 12 số'} của KOC "${deal.kocStageName}".`,
      canQuickFix: true,
    });
  }

  if (!payee.bankName) {
    issues.push({
      code: 'MISSING_BANK_NAME',
      group: 'PAYEE_TAX',
      fieldKey: 'bankName',
      fieldLabel: 'Tên ngân hàng',
      message: `Thiếu tên Ngân hàng thụ hưởng của KOC "${deal.kocStageName}".`,
      canQuickFix: true,
    });
  }

  if (!payee.bankAccount || payee.bankAccount.length < 6) {
    issues.push({
      code: 'MISSING_BANK_ACCOUNT',
      group: 'PAYEE_TAX',
      fieldKey: 'bankAccount',
      fieldLabel: 'Số tài khoản ngân hàng',
      message: `Thiếu Số tài khoản ngân hàng nhận thanh toán của KOC "${deal.kocStageName}".`,
      canQuickFix: true,
    });
  }

  if (!payee.bankHolder) {
    issues.push({
      code: 'MISSING_BANK_HOLDER',
      group: 'PAYEE_TAX',
      fieldKey: 'bankHolder',
      fieldLabel: 'Tên chủ tài khoản',
      message: `Thiếu Tên chủ tài khoản ngân hàng khớp với Hồ sơ pháp lý KOC.`,
      canQuickFix: true,
    });
  }

  // NHÓM 3: NGHIỆM THU KỸ THUẬT VIDEO & ADS (Bắt buộc khi lập ĐNTT Tất toán)
  if (requestType === 'SETTLEMENT') {
    const linkCheck = validateStandardAirLink(linkAir);
    if (!linkCheck.valid) {
      issues.push({
        code: 'INVALID_AIR_LINK',
        group: 'ACCEPTANCE_TECH',
        fieldKey: 'linkAir',
        fieldLabel: 'Link bài đăng chuẩn (linkAir)',
        message: linkCheck.reason || 'Thiếu link bài đăng chuẩn có Video ID.',
        canQuickFix: true,
      });
    }

    if (!postedDate) {
      issues.push({
        code: 'MISSING_POSTED_DATE',
        group: 'ACCEPTANCE_TECH',
        fieldKey: 'postedDate',
        fieldLabel: 'Ngày lên sóng thực tế',
        message: `Chưa ghi nhận Ngày lên sóng thực tế (air_date_real) cho đơn ${deal.dealCode}.`,
        canQuickFix: true,
      });
    }

    if (adsCodeStatus === 'CHƯA_CẤP' && !sparkAdsCode) {
      issues.push({
        code: 'MISSING_SPARK_ADS_CODE',
        group: 'ACCEPTANCE_TECH',
        fieldKey: 'sparkAdsCode',
        fieldLabel: 'Mã quảng cáo Spark Ads (Nghiệm thu Bước 2)',
        message: `Deal ${deal.dealCode} đang ở trạng thái "Chưa cấp mã Ads". Vui lòng hoàn tất nghiệm thu Bước 2 (cấp mã Spark Ads) hoặc xác nhận Deal không dùng mã Ads.`,
        canQuickFix: true,
      });
    }

    const unverifiedAddons = (deal.rightsTerms || []).filter(
      item =>
        item.acceptanceStatus === 'LOCKED_BY_VIDEO' ||
        item.acceptanceStatus === 'PENDING_ACCEPTANCE'
    );
    if (
      unverifiedAddons.length > 0 &&
      adsCodeStatus !== 'ĐÃ_NGHIỆM_THU' &&
      adsCodeStatus !== 'KHÔNG_DÙNG' &&
      !sparkAdsCode
    ) {
      issues.push({
        code: 'STAGE2_ADDONS_NOT_VERIFIED',
        group: 'ACCEPTANCE_TECH',
        fieldKey: 'sparkAdsCode',
        fieldLabel: 'Nghiệm thu Bước 2 (Dịch vụ gia tăng theo Deal)',
        message: `Deal ${deal.dealCode} còn ${unverifiedAddons.length} dịch vụ gia tăng (${unverifiedAddons.map(a => a.termLabel).join(', ')}) chưa nghiệm thu ở Bước 2.`,
        canQuickFix: true,
      });
    }
  }

  // NHÓM 4: CHỨNG TỪ PHÁP LÝ HỢP ĐỒNG, BBNT & HÓA ĐƠN (LEGAL_DOCS theo BR-03, BR-04, P-05, P-06)
  if (requestType === 'ADVANCE') {
    const isTwoTimesAllowed =
      deal.paymentScheduleOption === 'TWO_TIMES' ||
      (deal.paymentScheduleOption !== 'ONE_TIME' &&
        ((deal.advanceAmount || 0) > 0 || (deal.soTienTamUngTruoc || 0) > 0 || (override?.advanceAmount || 0) > 0));
    if (!isTwoTimesAllowed) {
      issues.push({
        code: 'SOW_NOT_TWO_TIME_PAYMENT',
        group: 'LEGAL_DOCS',
        fieldKey: 'dealValue',
        fieldLabel: 'Phương thức thanh toán Phụ lục SOW',
        message: `Đơn ${deal.dealCode} đang cấu hình Phụ lục SOW "Thanh toán 1 lần (100% sau nghiệm thu)". Chỉ khi Phụ lục SOW chọn "Thanh toán 2 đợt (Có tạm ứng)" mới được phép đẩy luồng Tạm ứng (QNvp).`,
        canQuickFix: false,
      });
    }

    const isSowSigned =
      deal.contractAppendixStatus === 'ĐÃ_KÝ' ||
      Boolean(contractUrl);
    if (!isSowSigned) {
      issues.push({
        code: 'SOW_NOT_SIGNED_FOR_ADVANCE',
        group: 'LEGAL_DOCS',
        fieldKey: 'contractUrl',
        fieldLabel: 'Phụ lục SOW / Hợp đồng đã ký 2 bên (P-05)',
        message: `Đơn ${deal.dealCode} chưa có link Hợp đồng / Phụ lục SOW đã ký 2 bên. Quy định luồng Tạm ứng (QNvp): bắt buộc ký Phụ lục SOW trước khi mở tạm ứng.`,
        canQuickFix: true,
      });
    }

    if ((payee.subjectKind === 'HKD' || payee.subjectKind === 'COM') && !invoiceNumber) {
      issues.push({
        code: 'MISSING_ADVANCE_DRAFT_INVOICE',
        group: 'LEGAL_DOCS',
        fieldKey: 'invoiceNumber',
        fieldLabel: 'Hóa đơn nháp / Hóa đơn đợt 1 (HKD / Công ty)',
        message: `Chủ thể là ${payee.subjectKind === 'COM' ? 'Công ty' : 'Hộ kinh doanh'}: Khi làm tạm ứng đợt 1 bắt buộc đính kèm Số/Link Hóa đơn nháp (hoặc hóa đơn hợp lệ đợt 1) theo S37 §3.4.3.`,
        canQuickFix: true,
      });
    }
  }

  if (ruleEval.isContractMandatory && !contractUrl && deal.contractAppendixStatus !== 'ĐÃ_KÝ') {
    issues.push({
      code: 'MISSING_SIGNED_CONTRACT',
      group: 'LEGAL_DOCS',
      fieldKey: 'contractUrl',
      fieldLabel: 'Link Hợp đồng đã ký 2 bên (BR-03)',
      message: `${ruleEval.contractMandatoryReason} Bắt buộc gắn link file/thư mục Hợp đồng đã ký 2 bên.`,
      canQuickFix: true,
    });
  }

  const isBbntRequiredForSubject =
    ruleEval.isAcceptanceMandatory ||
    payee.subjectKind === 'COM' ||
    payee.subjectKind === 'HKD';
  const bbntReasonText =
    payee.subjectKind === 'COM' || payee.subjectKind === 'HKD'
      ? `Chủ thể là ${payee.subjectKind === 'COM' ? 'Công ty' : 'Hộ kinh doanh'} (S37 §3.5: bắt buộc ký BBNT đối với Công ty/HKD).`
      : ruleEval.acceptanceMandatoryReason;

  if (requestType === 'SETTLEMENT' && isBbntRequiredForSubject && !bbntUrl) {
    issues.push({
      code: 'MISSING_SIGNED_BBNT',
      group: 'LEGAL_DOCS',
      fieldKey: 'bbntUrl',
      fieldLabel: 'Biên bản nghiệm thu BBNT đã ký (BR-04 / S37 §3.5)',
      message: `${bbntReasonText} Bắt buộc điền mã hoặc link BBNT đã ký 2 bên.`,
      canQuickFix: true,
    });
  }

  if (
    requestType === 'SETTLEMENT' &&
    (payee.subjectKind === 'COM' || payee.subjectKind === 'HKD') &&
    !invoiceNumber
  ) {
    issues.push({
      code: 'MISSING_VAT_INVOICE',
      group: 'LEGAL_DOCS',
      fieldKey: 'invoiceNumber',
      fieldLabel: 'Số Hóa đơn hợp lệ (Trùng ngày BBNT)',
      message: `Chủ thể là ${payee.subjectKind === 'COM' ? 'Công ty (COM)' : 'Hộ kinh doanh (HKD)'}: Bắt buộc có Số Hóa đơn đã phát hành (ngày xuất hóa đơn trùng ngày ký BBNT) trước khi lập ĐNTT.`,
      canQuickFix: true,
    });
  }

  const bookingLeader = resolveStoreBookingLeader(deal.storeName || deal.brandName, deal.leadBooking);
  const larkPaymentCategory = resolveLarkPaymentCategory(deal, requestType);
  const monthCompact = (deal.campaignCode || '202610').replace(/\D/g, '').slice(0, 6) || '202610';
  const transferTitle =
    requestType === 'ADVANCE'
      ? `UpBase tam ung cho KOC ${deal.brandName || 'Brand'} ${monthCompact} ${deal.dealCode}`
      : `UpBase thanh toan cho KOC ${deal.brandName || 'Brand'} ${monthCompact} ${deal.dealCode}`;

  return {
    dealId: deal.id,
    dealCode: deal.dealCode,
    jobId: deal.jobId,
    brandName: deal.brandName || 'UpBase B2C',
    storeName: deal.storeName || `${deal.brandName} TikTok Shop`,
    productName: deal.productName || 'Sản phẩm chiến dịch',
    salaryGrade: deal.salaryGrade,
    bookingPic: deal.bookingPic || deal.assignedStaff || 'Chuyên viên B2C',
    bookingLeader,
    approverDirector: 'Đặng Thị Yến Nhi',
    requestType,
    larkPaymentCategory,
    transferTitle,
    masterContractCode:
      deal.masterContractCode ||
      `HDNT-2026-${(deal.kocChannelId || deal.kocId || 'KOC').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`,
    contractAppendixCode:
      deal.contractAppendixCode || `PL-${deal.dealCode}-01`,
    videoAssetNetAmount,
    addonServicesNetAmount,
    agreedNetAmount,
    droppedDeductionAmount,
    effectiveSettledNetAmount,
    advancePaidAmount,
    requestBaseNetAmount,
    vatRate: taxResult.vatRate,
    vatAmount: taxResult.vatAmount,
    pitDeductionRate: taxResult.pitDeductionRate,
    pitDeductionAmount: taxResult.pitDeductionAmount,
    grossContractAmount: taxResult.grossTotalContract,
    netTransferAmount: taxResult.netAmountToReceive,
    linkAir,
    postedDate,
    sparkAdsCode,
    contractUrl,
    bbntUrl: bbntUrl || (!isBbntRequiredForSubject ? 'Miễn BBNT (<20M & khớp 100% theo BR-04)' : ''),
    invoiceNumber,
    isContractMandatory: ruleEval.isContractMandatory,
    contractMandatoryReason: ruleEval.contractMandatoryReason,
    isBbntMandatory: isBbntRequiredForSubject,
    bbntMandatoryReason: bbntReasonText,
    isEligible: issues.length === 0,
    issues,
  };
}

/**
 * Tuyến duyệt chung của phiếu ĐNTT / Tạm ứng (Booking video và Content kênh): Leader (nếu gian có Trưởng nhóm) → Giám đốc MKT → Kế toán → KT Handle.
 * Mức duyệt theo số thực chuyển (< 1M, 1–5M, > 5M) và mã whiteboard theo loại phiếu.
 */
export function buildSlipApprovalRoute(params: {
  lineItems: DealPaymentLineBreakdown[];
  requestType: PaymentRequestType;
  larkPaymentCategory: LarkPaymentCategory;
  netTransferTotal: number;
}): LarkPaymentRequestSlip['approvalRoute'] {
  const { lineItems, requestType, larkPaymentCategory, netTransferTotal } = params;
  const hasBookingLeader = lineItems.some(i => Boolean(i.bookingLeader));
  const bookingLeaderName = hasBookingLeader ? 'Nguyễn Thị Ngọc Tâm' : undefined;
  const b2cAmountTier: '< 1.000.000 đ' | '1.000.000 – 5.000.000 đ' | '> 5.000.000 đ' =
    netTransferTotal < 1_000_000
      ? '< 1.000.000 đ'
      : netTransferTotal <= 5_000_000
      ? '1.000.000 – 5.000.000 đ'
      : '> 5.000.000 đ';
  const isLivestreamSlip = larkPaymentCategory.includes('Livestream');
  const larkWhiteboardCode: 'QNvp' | 'KN8A / Le27' | 'VvoF' =
    requestType === 'ADVANCE' ? 'QNvp' : isLivestreamSlip ? 'VvoF' : 'KN8A / Le27';

  const approvalRoute: LarkPaymentRequestSlip['approvalRoute'] = {
    hasBookingLeader,
    bookingLeaderName,
    marketingDirectorName: 'Đặng Thị Yến Nhi',
    financeApproverName: 'Phòng Tài chính - Kế toán (TCKT)',
    b2cAmountTier,
    larkWhiteboardCode,
    routeSummary: hasBookingLeader
      ? `Chuyên viên (${lineItems[0]?.bookingPic || 'PIC'}) → Trưởng nhóm (Nguyễn Thị Ngọc Tâm) → Giám đốc MKT (Đặng Thị Yến Nhi · Mức ${b2cAmountTier}) → Kế toán Approval → KT Handle (Chi tiền & Bill UNC)`
      : `Chuyên viên (${lineItems[0]?.bookingPic || 'PIC'}) → Giám đốc MKT (Đặng Thị Yến Nhi · Mức ${b2cAmountTier}) → Kế toán Approval → KT Handle (Chi tiền & Bill UNC)`,
  };

  return approvalRoute;
}

/**
 * Tổng hợp danh sách các dòng Booking đã chọn thành 1 Phiếu ĐNTT / Tạm ứng chuẩn
 */
export function buildLarkPaymentRequestSlip(params: {
  requestType: PaymentRequestType;
  deals: BookingDealItem[];
  kocs: KocItem[];
  overridesByDealId?: Record<string, DealPaymentOverrides>;
  sharedPayeeOverride?: DealPaymentOverrides;
  createdBy: string;
  note?: string;
  month?: string;
  ledgerByDealCode?: Record<string, DealPaymentLedgerEntry>;
}): {
  canSubmit: boolean;
  allIssues: Array<{ dealCode: string; issue: PaymentValidationIssue }>;
  lineItems: DealPaymentLineBreakdown[];
  payee: ResolvedPayeeProfile;
  larkPaymentCategory: LarkPaymentCategory;
  transferTitle: string;
  approvalRoute: LarkPaymentRequestSlip['approvalRoute'];
  totals: LarkPaymentRequestSlip['totals'];
} {
  const {
    requestType,
    deals,
    kocs,
    overridesByDealId = {},
    sharedPayeeOverride = {},
    month = '2026/10',
    ledgerByDealCode = {},
  } = params;

  const findKocForDeal = (d: BookingDealItem) =>
    kocs.find(k => k.id === d.kocId) ||
    kocs.find(
      k =>
        k.channelId.replace(/^@/, '').toLowerCase() ===
        (d.kocChannelId || '').replace(/^@/, '').toLowerCase()
    );

  const lineItems = deals.map(d => {
    const koc = findKocForDeal(d);
    const mergedOverride: DealPaymentOverrides = {
      ...sharedPayeeOverride,
      ...(overridesByDealId[d.id] || {}),
    };
    return evaluateDealForPaymentRequest(d, koc, requestType, mergedOverride, ledgerByDealCode[d.dealCode]);
  });

  // Một phiếu chỉ chuyển cho một người thụ hưởng: các đơn phải cùng số tài khoản (MCN dùng chung STK vẫn gom được).
  const ownPayees = deals.map(d => resolvePayeeProfileForDeal(d, findKocForDeal(d), overridesByDealId[d.id] || {}));
  const knownAccounts = new Set(ownPayees.map(p => p.bankAccount.replace(/\s/g, '')).filter(Boolean));
  const channels = new Set(ownPayees.map(p => p.kocChannelId.replace(/^@/, '').toLowerCase()));
  const allShareOneAccount = knownAccounts.size === 1 && ownPayees.every(p => p.bankAccount.trim());
  const payeeCount = knownAccounts.size > 1 ? knownAccounts.size : allShareOneAccount ? 1 : channels.size;
  if (payeeCount > 1) {
    for (const item of lineItems) {
      item.issues.push({
        code: 'MIXED_PAYEES',
        group: 'PAYEE_TAX',
        fieldKey: 'bankAccount',
        fieldLabel: 'Người thụ hưởng',
        message: `Phiếu đang gom ${payeeCount} người thụ hưởng khác nhau. Mỗi phiếu chỉ được chuyển cho một tài khoản — tách phiếu theo KOC/MCN.`,
        canQuickFix: false,
      });
      item.isEligible = false;
    }
  }

  const primaryDeal = deals[0];
  const primaryKoc = primaryDeal ? findKocForDeal(primaryDeal) : undefined;
  const primaryOverride: DealPaymentOverrides = {
    ...sharedPayeeOverride,
    ...(primaryDeal ? overridesByDealId[primaryDeal.id] || {} : {}),
  };

  const payee = primaryDeal
    ? resolvePayeeProfileForDeal(primaryDeal, primaryKoc, primaryOverride)
    : {
        subjectKind: 'IND' as SubjectKind,
        subjectLabel: 'Cá nhân',
        kocId: '',
        kocStageName: '',
        kocChannelId: '',
        legalEntityName: '',
        legalId: '',
        hasIdCardScan: false,
        bankName: '',
        bankAccount: '',
        bankHolder: '',
        isMcnOrAlternatePayee: false,
      };

  const agreedNetTotal = lineItems.reduce((s, i) => s + i.agreedNetAmount, 0);
  const droppedDeductionTotal = lineItems.reduce((s, i) => s + i.droppedDeductionAmount, 0);
  const advancePaidTotal = lineItems.reduce((s, i) => s + i.advancePaidAmount, 0);
  const requestBaseNetTotal = lineItems.reduce((s, i) => s + i.requestBaseNetAmount, 0);
  const vatTotal = lineItems.reduce((s, i) => s + i.vatAmount, 0);
  const pitTax10PctTotal = lineItems.reduce((s, i) => s + i.pitDeductionAmount, 0);
  const grossTotal = lineItems.reduce((s, i) => s + i.grossContractAmount, 0);
  const netTransferTotal = lineItems.reduce((s, i) => s + i.netTransferAmount, 0);

  const larkPaymentCategory: LarkPaymentCategory =
    lineItems[0]?.larkPaymentCategory ||
    (requestType === 'ADVANCE' ? 'Tạm ứng trước Booking KOC' : 'Thanh toán Booking KOC');
  const brandLabel = lineItems[0]?.brandName || 'UpBase';
  const dealCodesLabel = lineItems.map(i => i.dealCode).join(' ');
  const transferTitle =
    requestType === 'ADVANCE'
      ? `UpBase tam ung cho KOC ${brandLabel} ${month} (${dealCodesLabel})`
      : `UpBase thanh toan cho KOC ${brandLabel} ${month} (${dealCodesLabel})`;

  const vietQrUrl = buildVietQrImageUrl({
    bankName: payee.bankName,
    bankAccount: payee.bankAccount,
    bankHolder: payee.bankHolder,
    amount: netTransferTotal,
    addInfo: transferTitle,
  });

  payee.vietQrUrl = vietQrUrl;

  const approvalRoute = buildSlipApprovalRoute({ lineItems, requestType, larkPaymentCategory, netTransferTotal });

  const allIssues: Array<{ dealCode: string; issue: PaymentValidationIssue }> = [];
  for (const item of lineItems) {
    for (const iss of item.issues) {
      allIssues.push({ dealCode: item.dealCode, issue: iss });
    }
  }

  return {
    canSubmit: lineItems.length > 0 && allIssues.length === 0,
    allIssues,
    lineItems,
    payee,
    larkPaymentCategory,
    transferTitle,
    approvalRoute,
    totals: {
      dealsCount: lineItems.length,
      agreedNetTotal,
      droppedDeductionTotal,
      advancePaidTotal,
      requestBaseNetTotal,
      vatTotal,
      pitTax10PctTotal,
      grossTotal,
      netTransferTotal,
      amountInWords: numberToVietnameseWords(netTransferTotal),
    },
  };
}

export const LARK_PAYMENT_SLIPS_STORAGE_KEY = 'upbase_b2c_lark_payment_slips_v1';

export function loadLarkPaymentSlipsFromStorage(): LarkPaymentRequestSlip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LARK_PAYMENT_SLIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LarkPaymentRequestSlip[]) : [];
  } catch {
    return [];
  }
}

export function saveLarkPaymentSlipsToStorage(slips: LarkPaymentRequestSlip[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LARK_PAYMENT_SLIPS_STORAGE_KEY, JSON.stringify(slips));
  } catch {
    // Bỏ qua lỗi quota trình duyệt
  }
}
