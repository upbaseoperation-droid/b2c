// Phiếu ĐNTT Content kênh Brand: dùng chung sổ phiếu, kết nối Lark Approval / Larkbase, tuyến duyệt, KT Handle (đã đi tiền + UNC)
// với Booking video. Mỗi video nghiệm thu Đạt lập một phiếu; thuế TNCN (BR-09), hợp đồng (BR-03) và BBNT (BR-04) tính theo từng video.
import { calculateContractTax, numberToVietnameseWords } from './contracts/contractRules';
import {
  buildSlipApprovalRoute,
  resolveStoreBookingLeader,
  validateStandardAirLink,
  type DealPaymentLedgerEntry,
  type DealPaymentLineBreakdown,
  type LarkPaymentCategory,
  type LarkPaymentRequestSlip,
  type PaymentValidationIssue,
  type ResolvedPayeeProfile,
} from './larkPaymentRequestEngine';
import { getVietnamDateYmd } from './format';
import { SELF_BBNT_THRESHOLD, SELF_CONTRACT_THRESHOLD, type SelfChannelJob } from './selfChannelBoardRules';
import type { Contributor } from './types';

export const SELF_PAYMENT_CATEGORY: LarkPaymentCategory = 'Thanh toán CTV Content kênh';

export interface SelfSlipPlanInfo {
  id: string;
  storeName: string;
  brandName: string;
  month: string;
}

/** Mã đơn của phiếu (khóa chống lập trùng trong sổ phiếu): mã việc kèm gian vì mã việc lặp giữa các gian. */
export const selfSlipDealCode = (plan: Pick<SelfSlipPlanInfo, 'storeName' | 'brandName'>, job: Pick<SelfChannelJob, 'code'>): string =>
  `${job.code}@${(plan.storeName || plan.brandName || 'GIAN').trim()}`;

const issue = (
  code: string,
  group: PaymentValidationIssue['group'],
  fieldKey: PaymentValidationIssue['fieldKey'],
  fieldLabel: string,
  message: string,
  canQuickFix = false
): PaymentValidationIssue => ({ code, group, fieldKey, fieldLabel, message, canQuickFix });

export function resolveSelfPayee(job: SelfChannelJob, ctv?: Contributor): ResolvedPayeeProfile {
  // Danh bạ CTV là nguồn gốc (RULE-SYNC-01); bản chép trên việc chỉ dùng khi không có hồ sơ danh bạ
  const legalId = ((ctv ? ctv.cccd || ctv.taxCode : '') || job.legalId || '').trim();
  const bankHolder = ((ctv ? ctv.bankAccountName : '') || job.bankHolder || '').trim();
  return {
    subjectKind: 'CTV',
    subjectLabel: 'Cộng tác viên (Khấu trừ 10% TNCN khi ≥ 2M)',
    kocId: ctv?.id || job.contributorId || '',
    kocStageName: job.contributorName || ctv?.name || '',
    kocChannelId: (job.channelOrPhone || ctv?.phone || '').trim(),
    legalEntityName: bankHolder || job.contributorName,
    legalId,
    hasIdCardScan: legalId.length >= 9,
    bankName: ((ctv ? ctv.bankName : '') || job.bankName || '').trim(),
    bankAccount: ((ctv ? ctv.bankAccount : '') || job.bankAccount || '').replace(/\s+/g, '').trim(),
    bankHolder,
    isMcnOrAlternatePayee: false,
  };
}

/** Một video nghiệm thu Đạt thành một dòng phiếu, kèm các điều kiện chặn cứng. */
export function evaluateSelfJobForPaymentSlip(
  job: SelfChannelJob,
  plan: SelfSlipPlanInfo,
  ctv?: Contributor,
  ledger?: DealPaymentLedgerEntry
): DealPaymentLineBreakdown {
  const issues: PaymentValidationIssue[] = [];
  const payee = resolveSelfPayee(job, ctv);
  const dealCode = selfSlipDealCode(plan, job);
  const gross = Math.max(0, Math.round(job.feeGross || 0));
  const tax = calculateContractTax({ subjectKind: 'CTV', baseAmount: gross, isNetPayment: false });
  const contractMandatory = gross >= SELF_CONTRACT_THRESHOLD;
  const bbntMandatory = gross >= SELF_BBNT_THRESHOLD;
  const bbntRef = (job.bbntUrl || job.bbntCode || '').trim();
  // Hợp đồng: lấy từ hồ sơ CTV trong danh bạ; việc gõ tay không có hồ sơ thì dùng số ghi trên việc
  const contractNo = ((ctv ? ctv.contractCode : '') || job.contractNo || '').trim();

  if (gross <= 0 || job.productionMode === 'INHOUSE') {
    issues.push(issue('FOC_ZERO_COST', 'DEAL_BUDGET', 'dealValue', 'Thù lao video', `Việc ${job.code} không phát sinh chi phí (0đ hoặc tự sản xuất nội bộ), không lập phiếu thanh toán.`));
  }
  if (ledger?.settlementRequested) {
    issues.push(issue('SETTLEMENT_ALREADY_REQUESTED', 'DEAL_BUDGET', 'dealValue', 'Phiếu thanh toán', `Việc ${job.code} đã có phiếu thanh toán, không lập thêm.`));
  }
  if (job.contributorId && !ctv) {
    issues.push(issue('CTV_NOT_IN_DIRECTORY', 'DEAL_BUDGET', 'dealValue', 'Hồ sơ CTV', `CTV của việc ${job.code} không còn trong Danh bạ CTV. Chọn lại CTV trên việc.`));
  }
  if (job.ctvConfirmStatus === 'ASSIGNED' || job.ctvConfirmStatus === 'DECLINED') {
    issues.push(issue('CTV_NOT_CONFIRMED', 'DEAL_BUDGET', 'dealValue', 'CTV nhận việc', `CTV chưa nhận việc ${job.code} (hoặc đã từ chối).`));
  }

  if (!payee.legalId || payee.legalId.length < 9) {
    issues.push(issue('MISSING_LEGAL_ID', 'PAYEE_TAX', 'legalId', 'Số CCCD / Mã số thuế', `Thiếu số CCCD/MST của CTV "${job.contributorName}".`, true));
  }
  if (!payee.bankName) issues.push(issue('MISSING_BANK_NAME', 'PAYEE_TAX', 'bankName', 'Tên ngân hàng', `Thiếu ngân hàng nhận tiền của CTV "${job.contributorName}".`, true));
  if (!payee.bankAccount || payee.bankAccount.length < 6) issues.push(issue('MISSING_BANK_ACCOUNT', 'PAYEE_TAX', 'bankAccount', 'Số tài khoản', `Thiếu số tài khoản nhận tiền của CTV "${job.contributorName}".`, true));
  if (!payee.bankHolder) issues.push(issue('MISSING_BANK_HOLDER', 'PAYEE_TAX', 'bankHolder', 'Tên chủ tài khoản', 'Thiếu tên chủ tài khoản ngân hàng.', true));

  if (job.acceptanceStatus !== 'PASSED') {
    issues.push(issue('NOT_ACCEPTED', 'ACCEPTANCE_TECH', 'linkAir', 'Nghiệm thu video', `Việc ${job.code} chưa nghiệm thu Đạt.`));
  }
  const linkCheck = validateStandardAirLink(job.airLink);
  if (!linkCheck.valid) issues.push(issue('INVALID_AIR_LINK', 'ACCEPTANCE_TECH', 'linkAir', 'Link bài đăng chuẩn', linkCheck.reason || 'Thiếu link bài đăng chuẩn có Video ID.', true));
  if (!job.airedAt.trim()) issues.push(issue('MISSING_POSTED_DATE', 'ACCEPTANCE_TECH', 'postedDate', 'Ngày lên sóng thực tế', `Chưa có ngày đăng của việc ${job.code}.`, true));

  if (contractMandatory && !contractNo) {
    issues.push(issue('MISSING_SIGNED_CONTRACT', 'LEGAL_DOCS', 'contractUrl', 'Hợp đồng CTV (BR-03)', `Giá trị video từ ${SELF_CONTRACT_THRESHOLD.toLocaleString('vi-VN')}đ trở lên bắt buộc có số Hợp đồng CTV.`, true));
  } else if (contractMandatory && ctv?.contractCode) {
    if (ctv.contractStatus !== 'ACTIVE') {
      issues.push(issue('CONTRACT_NOT_ACTIVE', 'LEGAL_DOCS', 'contractUrl', 'Hợp đồng CTV (BR-03)', 'Hợp đồng CTV chưa có hiệu lực (chưa ký hoặc đã hết hạn).', true));
    } else if (ctv.contractExpiryDate && ctv.contractExpiryDate < getVietnamDateYmd()) {
      issues.push(issue('CONTRACT_NOT_ACTIVE', 'LEGAL_DOCS', 'contractUrl', 'Hợp đồng CTV (BR-03)', `Hợp đồng CTV hết hạn ngày ${ctv.contractExpiryDate}.`, true));
    }
  }
  if (bbntMandatory && !bbntRef) {
    issues.push(issue('MISSING_SIGNED_BBNT', 'LEGAL_DOCS', 'bbntUrl', 'Biên bản nghiệm thu (BR-04)', `Giá trị video từ ${SELF_BBNT_THRESHOLD.toLocaleString('vi-VN')}đ trở lên bắt buộc có mã hoặc link BBNT đã ký.`, true));
  }

  const bookingLeader = resolveStoreBookingLeader(plan.storeName || plan.brandName);
  return {
    dealId: `${plan.id}::${job.id}`,
    dealCode,
    jobId: job.id,
    brandName: plan.brandName || 'UpBase B2C',
    storeName: plan.storeName || plan.brandName,
    productName: job.productName || 'Video kênh Brand',
    salaryGrade: 'CTV',
    bookingPic: job.contentPic || 'Chuyên viên Content',
    bookingLeader,
    approverDirector: 'Đặng Thị Yến Nhi',
    requestType: 'SETTLEMENT',
    larkPaymentCategory: SELF_PAYMENT_CATEGORY,
    transferTitle: `UpBase thanh toan cho CTV ${plan.brandName || 'Brand'} ${plan.month.replace(/\D/g, '')} ${job.code}`,
    masterContractCode: contractNo,
    contractAppendixCode: job.bbntCode || '',
    videoAssetNetAmount: gross,
    addonServicesNetAmount: 0,
    agreedNetAmount: gross,
    droppedDeductionAmount: 0,
    effectiveSettledNetAmount: gross,
    advancePaidAmount: 0,
    requestBaseNetAmount: gross,
    vatRate: 0,
    vatAmount: 0,
    pitDeductionRate: tax.pitDeductionRate,
    pitDeductionAmount: tax.pitDeductionAmount,
    grossContractAmount: tax.grossTotalContract,
    netTransferAmount: tax.netAmountToReceive,
    linkAir: job.airLink.trim(),
    postedDate: job.airedAt.trim(),
    sparkAdsCode: (job.sparkAdsCode || '').trim(),
    contractUrl: contractNo,
    bbntUrl: bbntRef || (bbntMandatory ? '' : 'Miễn BBNT (dưới 20.000.000đ theo BR-04)'),
    invoiceNumber: '',
    isContractMandatory: contractMandatory,
    contractMandatoryReason: contractMandatory ? 'Giá trị video từ 10.000.000đ trở lên (BR-03).' : 'Dưới 10.000.000đ: miễn hợp đồng CTV (BR-03).',
    isBbntMandatory: bbntMandatory,
    bbntMandatoryReason: bbntMandatory ? 'Giá trị video từ 20.000.000đ trở lên (BR-04).' : 'Dưới 20.000.000đ: không bắt buộc BBNT riêng (BR-04).',
    isEligible: issues.length === 0,
    issues,
  };
}

export interface BuiltSelfSlip {
  canSubmit: boolean;
  allIssues: Array<{ dealCode: string; issue: PaymentValidationIssue }>;
  lineItems: DealPaymentLineBreakdown[];
  payee: ResolvedPayeeProfile;
  larkPaymentCategory: LarkPaymentCategory;
  transferTitle: string;
  approvalRoute: LarkPaymentRequestSlip['approvalRoute'];
  totals: LarkPaymentRequestSlip['totals'];
}

/** Dựng phiếu cho đúng một video (một phiếu một video). */
export function buildSelfChannelPaymentSlip(params: {
  job: SelfChannelJob;
  plan: SelfSlipPlanInfo;
  ctv?: Contributor;
  ledger?: DealPaymentLedgerEntry;
}): BuiltSelfSlip {
  const line = evaluateSelfJobForPaymentSlip(params.job, params.plan, params.ctv, params.ledger);
  const payee = resolveSelfPayee(params.job, params.ctv);
  const route = buildSlipApprovalRoute({
    lineItems: [line],
    requestType: 'SETTLEMENT',
    larkPaymentCategory: SELF_PAYMENT_CATEGORY,
    netTransferTotal: line.netTransferAmount,
  });
  return {
    canSubmit: line.issues.length === 0,
    allIssues: line.issues.map(i => ({ dealCode: line.dealCode, issue: i })),
    lineItems: [line],
    payee,
    larkPaymentCategory: SELF_PAYMENT_CATEGORY,
    transferTitle: line.transferTitle,
    approvalRoute: route,
    totals: {
      dealsCount: 1,
      agreedNetTotal: line.agreedNetAmount,
      droppedDeductionTotal: 0,
      advancePaidTotal: 0,
      requestBaseNetTotal: line.requestBaseNetAmount,
      vatTotal: 0,
      pitTax10PctTotal: line.pitDeductionAmount,
      grossTotal: line.grossContractAmount,
      netTransferTotal: line.netTransferAmount,
      amountInWords: numberToVietnameseWords(line.netTransferAmount),
    },
  };
}
