// ============================================================================
// ĐỘNG CƠ KIỂM TRA HỒ SƠ BẢNG 3.2 & TẠO PHIẾU DUYỆT THANH TOÁN LARK (TẠM ỨNG / ĐNTT)
// Tuân thủ quy tắc:
// - BR-03: Nghĩa vụ ký hợp đồng (HKD/COM 100%, IND/CTV khi tạm ứng >= 2M hoặc tổng >= 10M)
// - BR-04: Nghĩa vụ ký BBNT (Tổng >= 20M hoặc có chênh lệch/khấu trừ nghiệm thu)
// - BR-09: Tính thuế TNCN 10% (IND/CTV >= 2M) & VAT 8-10% (COM)
// - Quy tắc Leader B2C: 8 gian hàng có Nguyễn Thị Ngọc Tâm sơ duyệt, còn lại trình thẳng Đặng Thị Yến Nhi
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
  month: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  payee: ResolvedPayeeProfile;
  approvalRoute: {
    hasBookingLeader: boolean;
    bookingLeaderName?: string;
    marketingDirectorName: string;
    financeApproverName: string;
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
    approvalStatus: 'PENDING_LEADER' | 'PENDING_DIRECTOR' | 'PENDING_FINANCE' | 'APPROVED' | 'PAID';
    syncedAt: string;
    /** Trạng thái thô lần cuối đọc từ Lark Approval (PENDING / APPROVED / REJECTED / CANCELED) */
    lastLarkStatus?: string;
  };
  /** Job trên bảng Deal của từng dòng phiếu, để trạng thái phiếu tự cập nhật về Job */
  planJobRefs?: Array<{ planId: string; dealId: string; jobId: string }>;
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
  const holder = encodeURIComponent((params.bankHolder || '').toUpperCase());
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
  const detectedKind = override?.taxAccountType || detectSubjectKind(koc, deal);
  const subjectLabel = {
    IND: 'Cá nhân (Khấu trừ 10% TNCN khi ≥ 2M)',
    HKD: 'Hộ kinh doanh (Trọn gói thuế)',
    COM: 'Công ty / MCN (Xuất HĐ VAT 8-10%)',
    CTV: 'Cộng tác viên (Khấu trừ 10% TNCN khi ≥ 2M)',
  }[detectedKind];

  const altPayee = koc?.alternatePayees?.[0];

  const legalId = (
    override?.legalId ??
    deal.kocIdCardNumber ??
    (detectedKind === 'COM' || detectedKind === 'HKD' ? koc?.taxCode || koc?.cccd : koc?.cccd || koc?.taxCode) ??
    altPayee?.legalId ??
    ''
  ).trim();

  const bankName = (
    override?.bankName ??
    deal.kocBankName ??
    koc?.bankName ??
    altPayee?.bankName ??
    ''
  ).trim();

  const bankAccount = (
    override?.bankAccount ??
    deal.kocBankAccount ??
    koc?.bankAccount ??
    altPayee?.bankAccount ??
    ''
  ).trim();

  const defaultHolder =
    detectedKind === 'COM' || detectedKind === 'HKD'
      ? koc?.companyName || altPayee?.holderName || koc?.realName || deal.kocStageName
      : koc?.realName || altPayee?.holderName || deal.kocStageName;

  const bankHolder = (
    override?.bankHolder ??
    deal.kocBankHolder ??
    defaultHolder ??
    ''
  ).trim();

  const hasIdCardScan = Boolean(
    override?.hasIdCardScan ??
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
        ? koc?.companyName || bankHolder || deal.kocStageName
        : koc?.realName || bankHolder || deal.kocStageName,
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

  // Tạm ứng: Nếu tạo phiếu ADVANCE thì tính theo advanceAmount trên deal (hoặc 50% mặc định)
  const defaultAdvance =
    deal.advanceAmount && deal.advanceAmount > 0
      ? Math.round(deal.advanceAmount)
      : Math.round(agreedNetAmount * ((override?.advanceRatePct ?? 50) / 100));

  // Tất toán trừ phần đã tạm ứng: lấy số lớn hơn giữa trạng thái trên deal và sổ phiếu tạm ứng đã lập trên máy chủ
  const advanceFromDeal =
    deal.status === 'ADVANCE_PAID' || Boolean(deal.larkAdvanceApprovalCode) ? deal.advanceAmount || 0 : 0;
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
    deal.contractScanUrl ??
    deal.signedContractUrl ??
    koc?.contractDriveUrl ??
    ''
  ).trim();
  const bbntUrl = (override?.bbntUrl ?? '').trim();
  const invoiceNumber = (override?.invoiceNumber ?? '').trim();

  // =========================================================================
  // KIỂM TRA CHẶN CỨNG 100% THEO 4 NHÓM NGHIỆP VỤ BẢNG 3.2
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

  // NHÓM 2: THÔNG TIN THỤ HƯỞNG, CCCD/MST & THUẾ (PAYEE_TAX)
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
      message: `Thiếu Tên chủ tài khoản ngân hàng khớp với CCCD/Hợp đồng.`,
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

  // NHÓM 4: CHỨNG TỪ PHÁP LÝ HỢP ĐỒNG & BBNT (LEGAL_DOCS theo BR-03 & BR-04)
  if (ruleEval.isContractMandatory && !contractUrl) {
    issues.push({
      code: 'MISSING_SIGNED_CONTRACT',
      group: 'LEGAL_DOCS',
      fieldKey: 'contractUrl',
      fieldLabel: 'Link Hợp đồng đã ký 2 bên (BR-03)',
      message: `${ruleEval.contractMandatoryReason} Bắt buộc gắn link file/thư mục Hợp đồng đã ký 2 bên.`,
      canQuickFix: true,
    });
  }

  if (requestType === 'SETTLEMENT' && ruleEval.isAcceptanceMandatory && !bbntUrl) {
    issues.push({
      code: 'MISSING_SIGNED_BBNT',
      group: 'LEGAL_DOCS',
      fieldKey: 'bbntUrl',
      fieldLabel: 'Biên bản nghiệm thu BBNT đã ký (BR-04)',
      message: `${ruleEval.acceptanceMandatoryReason} Bắt buộc điền mã hoặc link BBNT đã ký.`,
      canQuickFix: true,
    });
  }

  if (requestType === 'SETTLEMENT' && payee.subjectKind === 'COM' && !invoiceNumber) {
    issues.push({
      code: 'MISSING_VAT_INVOICE',
      group: 'LEGAL_DOCS',
      fieldKey: 'invoiceNumber',
      fieldLabel: 'Số Hóa đơn GTGT (VAT)',
      message: `Chủ thể là Công ty/Doanh nghiệp (COM): Bắt buộc có Số Hóa đơn GTGT trùng ngày ký BBNT trước khi lập ĐNTT.`,
      canQuickFix: true,
    });
  }

  const bookingLeader = resolveStoreBookingLeader(deal.storeName || deal.brandName, deal.leadBooking);

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
    bbntUrl: bbntUrl || (!ruleEval.isAcceptanceMandatory ? 'Miễn BBNT (<20M & khớp 100% theo BR-04)' : ''),
    invoiceNumber,
    isContractMandatory: ruleEval.isContractMandatory,
    contractMandatoryReason: ruleEval.contractMandatoryReason,
    isBbntMandatory: ruleEval.isAcceptanceMandatory,
    bbntMandatoryReason: ruleEval.acceptanceMandatoryReason,
    isEligible: issues.length === 0,
    issues,
  };
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
  // Xét theo dữ liệu riêng của từng đơn, không theo STK dùng chung của phiếu — nếu không, STK chung sẽ che các KOC khác nhau.
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

  const dealCodesLabel = lineItems.map(i => i.dealCode).join(' ');
  const vietQrUrl = buildVietQrImageUrl({
    bankName: payee.bankName,
    bankAccount: payee.bankAccount,
    bankHolder: payee.bankHolder,
    amount: netTransferTotal,
    addInfo: `${requestType === 'ADVANCE' ? 'TU' : 'DNTT'} ${dealCodesLabel} ${month}`,
  });

  payee.vietQrUrl = vietQrUrl;

  const hasBookingLeader = lineItems.some(i => Boolean(i.bookingLeader));
  const bookingLeaderName = hasBookingLeader ? 'Nguyễn Thị Ngọc Tâm' : undefined;

  const approvalRoute: LarkPaymentRequestSlip['approvalRoute'] = {
    hasBookingLeader,
    bookingLeaderName,
    marketingDirectorName: 'Đặng Thị Yến Nhi',
    financeApproverName: 'Phòng Tài chính - Kế toán (TCKT)',
    routeSummary: hasBookingLeader
      ? `Chuyên viên (${lineItems[0]?.bookingPic || 'PIC'}) → Trưởng nhóm (Nguyễn Thị Ngọc Tâm) → Giám đốc MKT (Đặng Thị Yến Nhi) → Kế toán (TCKT)`
      : `Chuyên viên (${lineItems[0]?.bookingPic || 'PIC'}) → Giám đốc MKT (Đặng Thị Yến Nhi) → Kế toán (TCKT) (Gian hàng không qua Leader trung gian)`,
  };

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
