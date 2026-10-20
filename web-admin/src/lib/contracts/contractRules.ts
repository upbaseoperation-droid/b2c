/**
 * Quy định về Biểu mẫu Hợp đồng Booking & Biên bản nghiệm thu UpBase B2C
 * Căn cứ: Quyết định ban hành biểu mẫu Ver052026 (áp dụng từ 20/05/2026)
 * - BR-01: Ngưỡng 50M (Mẫu UpBase vs Mẫu KOL/KOC/Celeb)
 * - BR-03: Ngưỡng ký hợp đồng (Cá nhân/CTV vs Hộ kinh doanh/Công ty)
 * - BR-04: Ngưỡng ký biên bản nghiệm thu (BBNT)
 * - BR-05: Định tuyến luồng review TCKT / Pháp chế và đồng hồ SLA (48h / 24h)
 * - BR-09: Thuế TNCN (10% khấu trừ tại nguồn cho IND/CTV >= 2M) và Thuế VAT (8-10% cho COM)
 */

import type { BookingDealItem, KocItem } from '../types';
import type { ContractCategory, ContractField, LegalTemplate } from './types';
import { legalTypeOf, type LegalType } from '../../components/koc/kocUtils';

export type SubjectKind = 'IND' | 'HKD' | 'COM' | 'CTV';

export interface ContractRuleEvaluation {
  subjectKind: SubjectKind;
  subjectLabel: string;
  recommendedTemplateId: string;
  recommendedTemplateName: string;
  // BR-01: Ngưỡng 50M
  isHighValueKoc: boolean; // Tổng HĐ >= 50.000.000đ
  templateCompliance: {
    useKolTemplateAllowed: boolean;
    requiresUpbaseExceptionApproval: boolean;
    note: string;
  };
  // BR-03: Ký hợp đồng
  isContractMandatory: boolean;
  contractMandatoryReason: string;
  // BR-04: Ký BBNT
  isAcceptanceMandatory: boolean;
  acceptanceMandatoryReason: string;
  // BR-05: Luồng review
  reviewStream: {
    streamNumber: 1 | 2 | 3 | 4 | 5;
    streamName: string;
    flowDescription: string;
    slaHoursTckt: number;
    slaHoursLegal: number;
    reviewersRequired: ('TCKT' | 'LEGAL' | 'LEAD' | 'CEO')[];
  };
  // Thuộc tính tương thích giao diện (ContractDetail / ContractForm)
  br01: {
    threshold50M: boolean;
    message: string;
  };
  br03: {
    contractMandatory: boolean;
    reason: string;
  };
  br04: {
    acceptanceMandatory: boolean;
    reason: string;
  };
  br05: {
    streamName: string;
    turnaroundSla: string;
    requiresLegalReview: boolean;
  };
}

export interface TaxCalculationResult {
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  pitDeductionRate: number;
  pitDeductionAmount: number;
  netAmountToReceive: number;
  grossTotalContract: number;
  amountInWords: string;
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readTriple(triple: number, showZeroHundred: boolean): string {
  const a = Math.floor(triple / 100);
  const b = Math.floor((triple % 100) / 10);
  const c = triple % 10;
  if (a === 0 && b === 0 && c === 0) return '';
  let result = '';
  if (a > 0 || showZeroHundred) result += `${DIGITS[a]} trăm `;
  if (b === 0 && c > 0) {
    if (a > 0 || showZeroHundred) result += 'lẻ ';
    result += DIGITS[c];
  } else if (b === 1) {
    result += 'mười ';
    if (c === 1) result += 'một';
    else if (c === 5) result += 'lăm';
    else if (c > 0) result += DIGITS[c];
  } else if (b > 1) {
    result += `${DIGITS[b]} mươi `;
    if (c === 1) result += 'mốt';
    else if (c === 4) result += 'tư';
    else if (c === 5) result += 'lăm';
    else if (c > 0) result += DIGITS[c];
  }
  return result.trim();
}

/** Chuyển số tiền thành chữ tiếng Việt chuẩn tài chính kế toán */
export function numberToVietnameseWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Không đồng';
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const str = absAmount.toString();
  const triples: number[] = [];
  let i = str.length;
  while (i > 0) {
    const start = Math.max(0, i - 3);
    triples.push(parseInt(str.substring(start, i), 10));
    i -= 3;
  }
  const parts: string[] = [];
  for (let j = triples.length - 1; j >= 0; j--) {
    const triple = triples[j];
    if (triple > 0) {
      const showZeroHundred = j < triples.length - 1 && triples[j + 1] > 0;
      const readText = readTriple(triple, showZeroHundred);
      if (readText) {
        const unit = UNITS[j];
        parts.push(unit ? `${readText} ${unit}` : readText);
      }
    }
  }
  let finalString = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (finalString) {
    finalString = finalString.charAt(0).toUpperCase() + finalString.slice(1) + ' đồng';
  } else {
    finalString = 'Không đồng';
  }
  return isNegative ? `Âm ${finalString.toLowerCase()}` : finalString;
}

/** Nhận diện chủ thể hợp đồng: IND (Cá nhân), HKD (Hộ kinh doanh), COM (Công ty), CTV (Cộng tác viên) */
export function detectSubjectKind(koc?: KocItem, deal?: BookingDealItem): SubjectKind {
  // 1. Kiểm tra đối tượng CTV
  const isCtv =
    (koc as any)?.partnerType === 'CTV' ||
    (koc?.kocCategory && /CTV|Cộng tác viên/i.test(koc.kocCategory)) ||
    (deal?.bookingFormat && /CTV/i.test(deal.bookingFormat)) ||
    (koc?.niche && /CTV/i.test(koc.niche));
  if (isCtv) return 'CTV';

  if (!koc) return 'IND';
  if ((koc as any)?.legalType === 'COMPANY' || koc.ocrDocumentType === 'BUSINESS_LICENSE') return 'COM';
  if ((koc as any)?.legalType === 'HOUSEHOLD' || koc.ocrDocumentType === 'BUSINESS_HOUSEHOLD') return 'HKD';
  const type: LegalType = legalTypeOf(koc);
  if (type === 'COMPANY') return 'COM';
  if (type === 'HOUSEHOLD') return 'HKD';
  return 'IND';
}

export interface EvaluateContractRulesParams {
  koc?: KocItem;
  deal?: BookingDealItem;
  kind?: 'CONTRACT' | 'ACCEPTANCE';
  totalValue?: number;
  totalAmount?: number;
  advanceAmount?: number;
  actualSettledValue?: number;
  settlementAmount?: number;
  contractAmount?: number;
  hasCustomTerms?: boolean;
  hasModifiedPaymentClause?: boolean;
  hasModifiedLegalClause?: boolean;
  isKolForm?: boolean;
  templateScope?: 'GLOBAL' | 'KOC_CUSTOM' | 'UPBASE_STANDARD';
  availableTemplates?: LegalTemplate[];
}

/**
 * Đánh giá đầy đủ bộ quy tắc pháp lý hợp đồng theo quy định B2C UpBase
 */
export function evaluateContractRules({
  koc,
  deal,
  kind = 'CONTRACT',
  totalValue,
  totalAmount,
  advanceAmount = 0,
  actualSettledValue,
  settlementAmount,
  contractAmount,
  hasCustomTerms = false,
  hasModifiedPaymentClause = false,
  hasModifiedLegalClause = false,
  isKolForm = false,
  templateScope = 'UPBASE_STANDARD',
  availableTemplates = [],
}: EvaluateContractRulesParams): ContractRuleEvaluation {
  const subjectKind = detectSubjectKind(koc, deal);
  const subjectLabel = {
    IND: 'Cá nhân',
    HKD: 'Hộ kinh doanh',
    COM: 'Công ty / Doanh nghiệp',
    CTV: 'Cộng tác viên (CTV tháng)',
  }[subjectKind];

  const effectiveTotal = totalAmount !== undefined ? totalAmount : (totalValue ?? contractAmount ?? 0);
  const effectiveSettled = settlementAmount !== undefined ? settlementAmount : actualSettledValue;
  const effectiveIsKolForm = isKolForm || templateScope === 'KOC_CUSTOM';

  // 1. Mẫu hợp đồng chuẩn theo bộ 8 biểu mẫu Ver052026
  let recommendedTemplateId = `${subjectKind}-${kind === 'ACCEPTANCE' ? 'BBNT' : 'HD'}`;
  let recommendedTemplateName = kind === 'ACCEPTANCE'
    ? {
        IND: 'Nghiệm thu video · Cá nhân (BM.BBNT.VID.IND.Ver052026)',
        HKD: 'Nghiệm thu video · Hộ kinh doanh (BM.BBNT.VID.HKD.Ver052026)',
        COM: 'Nghiệm thu video · Công ty (BM.BBNT.VID.COM.Ver052026)',
        CTV: 'Nghiệm thu · CTV tháng (BM.BBNTVID.CTV.Ver052026)',
      }[subjectKind]
    : {
        IND: 'Hợp đồng video · Cá nhân (BM.HĐ.VID.IND.Ver052026)',
        HKD: 'Hợp đồng video · Hộ kinh doanh (BM.HĐ.VID.HKD.Ver052026)',
        COM: 'Hợp đồng video · Công ty (BM.HĐ.VID.COM.Ver052026)',
        CTV: 'Hợp đồng nguyên tắc · CTV tháng (BM.HĐVID.CTV.Ver052026)',
      }[subjectKind];

  // Kiểm tra mẫu duyệt riêng cho KOC
  if (koc?.id && availableTemplates.length > 0) {
    const customTpl = availableTemplates.find(
      t => t.scope === 'KOC_CUSTOM' && t.kocId === koc.id && t.kind === kind && t.active !== false,
    );
    if (customTpl) {
      recommendedTemplateId = customTpl.id;
      recommendedTemplateName = `${customTpl.name} (Mẫu đã duyệt riêng của KOC)`;
    }
  }

  // 2. BR-01: Ngưỡng 50M
  const isHighValueKoc = effectiveTotal >= 50000000;
  let templateCompliance = {
    useKolTemplateAllowed: isHighValueKoc,
    requiresUpbaseExceptionApproval: false,
    note: isHighValueKoc
      ? 'Tổng giá trị ≥ 50.000.000đ (KOL/KOC lớn): Được phép áp dụng biểu mẫu riêng của KOL/KOC. Nếu dùng mẫu UpBase, cần duyệt ngoại lệ từ TCKT và Pháp chế.'
      : 'Tổng giá trị < 50.000.000đ (KOL/KOC nhỏ/mass): Bắt buộc 100% dùng mẫu chuẩn UpBase. Nếu dùng mẫu KOL/KOC riêng, phải xin duyệt ngoại lệ từ TCKT và Pháp chế.',
  };

  if (!isHighValueKoc && effectiveIsKolForm) {
    templateCompliance.requiresUpbaseExceptionApproval = true;
    templateCompliance.note =
      'Hồ sơ giá trị < 50M nhưng dùng mẫu riêng của KOL: Bắt buộc xin duyệt ngoại lệ từ TCKT và Pháp chế theo quy định BR-01.';
  }

  // 3. BR-03: Quy định ký hợp đồng
  let isContractMandatory = false;
  let contractMandatoryReason = '';
  if (subjectKind === 'HKD' || subjectKind === 'COM') {
    isContractMandatory = true;
    contractMandatoryReason = `Chủ thể là ${subjectLabel}: Bắt buộc 100% phải ký hợp đồng kinh tế theo quy định BR-03.`;
  } else {
    // Cá nhân hoặc CTV
    if (advanceAmount >= 2000000) {
      isContractMandatory = true;
      contractMandatoryReason = `Số tiền tạm ứng (${advanceAmount.toLocaleString('vi-VN')} đ) ≥ 2.000.000 đ: Bắt buộc phải ký hợp đồng trước khi đề nghị tạm ứng (BR-03 §2).`;
    } else if (effectiveTotal >= 10000000) {
      isContractMandatory = true;
      contractMandatoryReason = `Tổng giá trị hợp đồng (${effectiveTotal.toLocaleString('vi-VN')} đ) ≥ 10.000.000 đ: Bắt buộc phải ký hợp đồng pháp lý (BR-03 §2).`;
    } else {
      isContractMandatory = false;
      contractMandatoryReason =
        'Tổng giá trị < 10.000.000 đ và tạm ứng < 2.000.000 đ: Không bắt buộc ký hợp đồng theo quy định BR-03 §2.';
    }
  }

  // 4. BR-04: Quy định ký BBNT
  let isAcceptanceMandatory = false;
  let acceptanceMandatoryReason = '';
  const settled = effectiveSettled !== undefined ? effectiveSettled : effectiveTotal;
  const hasDiscrepancy = effectiveSettled !== undefined && effectiveSettled !== effectiveTotal;

  if (effectiveTotal >= 20000000) {
    isAcceptanceMandatory = true;
    acceptanceMandatoryReason =
      'Tổng giá trị hợp đồng ≥ 20.000.000 đ: Bắt buộc lập và ký Biên bản nghiệm thu theo quy định BR-04 §3.';
  } else if (hasDiscrepancy) {
    isAcceptanceMandatory = true;
    acceptanceMandatoryReason = `Giá trị nghiệm thu thực tế (${settled.toLocaleString('vi-VN')} đ) khác giá trị hợp đồng ban đầu (${effectiveTotal.toLocaleString('vi-VN')} đ): Bắt buộc lập BBNT để đối soát và tất toán (BR-04 §3).`;
  } else {
    isAcceptanceMandatory = false;
    acceptanceMandatoryReason =
      'Tổng giá trị hợp đồng < 20.000.000 đ và nghiệm thu đúng giá trị: Không bắt buộc ký BBNT (tự động thanh lý theo hợp đồng chuẩn).';
  }

  // 5. BR-05: Luồng review và SLA
  let streamNumber: 1 | 2 | 3 | 4 | 5 = 1;
  let streamName = 'Luồng 1: Mẫu chuẩn UpBase không sửa nội dung';
  let flowDescription = 'Booking/Growth → TCKT (48h) → KOL/KOC ký → Trưởng nhóm (Leader) → Tổng Giám Đốc (CEO)';
  let slaHoursTckt = 48;
  let slaHoursLegal = 0;
  let reviewersRequired: ('TCKT' | 'LEGAL' | 'LEAD' | 'CEO')[] = ['TCKT', 'LEAD', 'CEO'];

  if (effectiveIsKolForm) {
    streamNumber = 5;
    streamName = 'Luồng 5: Áp dụng biểu mẫu riêng của KOL/Celeb lớn';
    flowDescription = 'Booking/Growth → Pháp chế (24h) + TCKT (48h) → KOL/KOC ký → Trưởng nhóm → Tổng Giám Đốc';
    slaHoursTckt = 48;
    slaHoursLegal = 24;
    reviewersRequired = ['LEGAL', 'TCKT', 'LEAD', 'CEO'];
  } else if (hasModifiedLegalClause && hasModifiedPaymentClause) {
    streamNumber = 4;
    streamName = 'Luồng 4: Sửa đổi cả điều khoản thanh toán & quyền nghĩa vụ pháp lý';
    flowDescription = 'Booking/Growth → Pháp chế (24h) + TCKT (48h) → KOL/KOC ký → Trưởng nhóm → Tổng Giám Đốc';
    slaHoursTckt = 48;
    slaHoursLegal = 24;
    reviewersRequired = ['LEGAL', 'TCKT', 'LEAD', 'CEO'];
  } else if (hasModifiedLegalClause || hasCustomTerms) {
    streamNumber = 3;
    streamName = 'Luồng 3: Sửa đổi điều khoản quyền nghĩa vụ / thỏa thuận riêng';
    flowDescription = 'Booking/Growth → Pháp chế (24h) → TCKT (48h) → KOL/KOC ký → Trưởng nhóm → Tổng Giám Đốc';
    slaHoursTckt = 48;
    slaHoursLegal = 24;
    reviewersRequired = ['LEGAL', 'TCKT', 'LEAD', 'CEO'];
  } else if (hasModifiedPaymentClause) {
    streamNumber = 2;
    streamName = 'Luồng 2: Chỉ sửa đổi nội dung thanh toán, thuế, hóa đơn';
    flowDescription = 'Booking/Growth → TCKT (48h) → KOL/KOC ký → Tổng Giám Đốc (CEO)';
    slaHoursTckt = 48;
    slaHoursLegal = 0;
    reviewersRequired = ['TCKT', 'CEO'];
  }

  return {
    subjectKind,
    subjectLabel,
    recommendedTemplateId,
    recommendedTemplateName,
    isHighValueKoc,
    templateCompliance,
    isContractMandatory,
    contractMandatoryReason,
    isAcceptanceMandatory,
    acceptanceMandatoryReason,
    reviewStream: {
      streamNumber,
      streamName,
      flowDescription,
      slaHoursTckt,
      slaHoursLegal,
      reviewersRequired,
    },
    br01: {
      threshold50M: isHighValueKoc,
      message: templateCompliance.note,
    },
    br03: {
      contractMandatory: isContractMandatory,
      reason: contractMandatoryReason,
    },
    br04: {
      acceptanceMandatory: isAcceptanceMandatory,
      reason: acceptanceMandatoryReason,
    },
    br05: {
      streamName,
      turnaroundSla: slaHoursLegal > 0 ? `TCKT ${slaHoursTckt}h + Pháp chế ${slaHoursLegal}h` : `TCKT ${slaHoursTckt}h`,
      requiresLegalReview: slaHoursLegal > 0,
    },
  };
}

/**
 * Tính toán thuế TNCN / VAT chuẩn theo quy định BR-09
 */
export function calculateContractTax({
  subjectKind,
  baseAmount = 0,
  vatRatePercent = 10,
  isNetPayment = true,
}: {
  subjectKind: SubjectKind;
  baseAmount: number;
  vatRatePercent?: number;
  isNetPayment?: boolean;
}): TaxCalculationResult {
  const roundedBase = Math.max(0, Math.round(baseAmount));
  let vatRate = 0;
  let vatAmount = 0;
  let pitDeductionRate = 0;
  let pitDeductionAmount = 0;
  let netAmountToReceive = roundedBase;
  let grossTotalContract = roundedBase;

  switch (subjectKind) {
    case 'IND':
    case 'CTV': {
      // Theo Luật Thuế TNCN & Thông tư 111/2013/TT-BTC:
      // Chi trả thu nhập vãng lai từ 2.000.000 VNĐ trở lên phải khấu trừ 10% thuế TNCN trước khi trả cho cá nhân.
      if (roundedBase >= 2000000) {
        pitDeductionRate = 0.1;
        if (isNetPayment) {
          // Thỏa thuận Net thực nhận (ví dụ 16.000.000đ thực nhận như mẫu BBNT 1.1.2)
          // Gross = Net / 0.90
          grossTotalContract = Math.round(roundedBase / 0.9);
          pitDeductionAmount = grossTotalContract - roundedBase;
          netAmountToReceive = roundedBase;
        } else {
          // Thỏa thuận tổng thù lao ghi trên HĐ là Gross
          grossTotalContract = roundedBase;
          pitDeductionAmount = Math.round(grossTotalContract * pitDeductionRate);
          netAmountToReceive = grossTotalContract - pitDeductionAmount;
        }
      } else {
        pitDeductionRate = 0;
        pitDeductionAmount = 0;
        grossTotalContract = roundedBase;
        netAmountToReceive = roundedBase;
      }
      break;
    }

    case 'HKD': {
      // Hộ kinh doanh: Giá trọn gói đã bao gồm toàn bộ thuế môn bài, TNCN, GTGT của Hộ kinh doanh.
      vatRate = 0;
      vatAmount = 0;
      pitDeductionRate = 0;
      pitDeductionAmount = 0;
      grossTotalContract = roundedBase;
      netAmountToReceive = roundedBase;
      break;
    }

    case 'COM': {
      // Doanh nghiệp / Công ty: Giá dịch vụ chưa bao gồm thuế GTGT (VAT). Bên B xuất hóa đơn GTGT.
      vatRate = vatRatePercent / 100;
      vatAmount = Math.round(roundedBase * vatRate);
      pitDeductionRate = 0;
      pitDeductionAmount = 0;
      grossTotalContract = roundedBase + vatAmount;
      netAmountToReceive = grossTotalContract;
      break;
    }
  }

  const amountInWords = numberToVietnameseWords(grossTotalContract);

  return {
    baseAmount: roundedBase,
    vatRate,
    vatAmount,
    pitDeductionRate,
    pitDeductionAmount,
    netAmountToReceive,
    grossTotalContract,
    amountInWords,
  };
}
