import type { BookingDealItem, DealRightsTermItem, InputPlanBreakdownState, SalaryGrade } from './types';
import type { ContractRecord } from './contracts/types';
import type { DealJob, JobAddonType, PlanDeal } from './dealBoardRules';
import {
  COMMERCE_PLATFORM_LABEL,
  PRODUCTION_MODE_LABEL,
  PUBLISH_PLATFORM_LABEL,
  computeJobContractAmounts,
  jobAddonsFee,
  jobDroppedFee,
  jobTotalFee,
  normHandle,
} from './dealBoardRules';

/**
 * Nối Deal & từng Job của kế hoạch với mô-đun Hợp đồng và Luồng đẩy Lark Thanh toán:
 * - Hợp đồng nguyên tắc (HDNT) ký theo KOC.
 * - Phụ lục (SOW) và Biên bản nghiệm thu (BBNT) ký theo từng Job (`job.code`).
 * - Phiếu đề nghị thanh toán đẩy về Lark theo từng Job sau nghiệm thu.
 */

/** Chi phí thực của một dòng booking: `totalValue` còn gồm phần DROPPED nên phải trừ `droppedCostVnd` khi cộng ngân sách. */
export function bookingDealCost(d: Pick<BookingDealItem, 'totalValue' | 'droppedCostVnd'>): number {
  return Math.max(0, (d.totalValue || 0) - (d.droppedCostVnd || 0));
}

export type ContractDocument = 'HDNT' | 'SOW' | 'BBNT';

export const DOCUMENT_LABEL: Record<ContractDocument, string> = {
  HDNT: 'Hợp đồng nguyên tắc (KOC)',
  SOW: 'SOW (Phụ lục theo Job)',
  BBNT: 'Biên bản nghiệm thu (Theo Job)',
};

/** Họ mẫu của từng loại tài liệu (mẫu bản mới của booking video). */
export const documentOfTemplate = (templateId: string): ContractDocument | null => {
  if (templateId.endsWith('-HDNT')) return 'HDNT';
  if (templateId.endsWith('-SOW')) return 'SOW';
  // Gồm mẫu BBNT video bản cũ (IND-BBNT…) mà bộ gợi ý mẫu vẫn đề xuất, bản mới (-VID-BBNT) và livestream (-LIVE-BBNT)
  if (templateId.endsWith('-BBNT')) return 'BBNT';
  return null;
};

const mapAddonTypeToRightTermType = (t: JobAddonType): DealRightsTermItem['termType'] => {
  switch (t) {
    case 'ADS_CODE':
      return 'ADS_CODE';
    case 'CROSS_POST':
      return 'CROSS_POST_REUP';
    case 'IMAGE_USAGE':
      return 'IMAGE_USAGE';
    case 'EXCLUSIVITY':
      return 'EXCLUSIVITY';
    case 'LINK_BIO_CART':
      return 'LINK_BIO_CART';
    default:
      return 'ADS_CODE';
  }
};

/**
 * Dựng bản `BookingDealItem` cho 1 Job cụ thể trong Deal:
 * Dùng để (1) Điền sẵn Phụ lục SOW & BBNT theo từng Job trong mô-đun Hợp đồng,
 * và (2) Đẩy về Lark theo từng Job để Kế toán đối soát & thanh toán.
 */
export function planJobToBookingDeal(
  deal: PlanDeal,
  job: DealJob,
  plan: InputPlanBreakdownState,
  kocId?: string,
  frameworkContractNo?: string
): BookingDealItem {
  const handle = normHandle(deal.kocHandle);
  const grade = (deal.grade === 'TAP UpAffiliate' ? 'KL1' : deal.grade) as SalaryGrade;
  const videoNet = Math.max(0, Math.round(job.videoFee || 0));
  const addonsNet = jobAddonsFee(job);
  const droppedNet = jobDroppedFee(job);
  const totalNet = jobTotalFee(job);
  const amountBreakdown = computeJobContractAmounts(job);
  const isPackageAllIn = (job.pricingDisplayMode || 'PACKAGE_ALL_IN') === 'PACKAGE_ALL_IN';
  const activeAddons = (job.addons || []).filter(a => a.status !== 'DROPPED');
  const addonsSummary = activeAddons
    .map(a =>
      isPackageAllIn
        ? `${a.label} (Đi kèm trong gói)`
        : `${a.label}${a.fee > 0 ? ` (${Math.round(a.fee).toLocaleString('vi-VN')}đ)` : ' (Đi kèm)'}`
    )
    .join('; ');
  const platformTag = `${PUBLISH_PLATFORM_LABEL[job.publishPlatform || 'TIKTOK']} → ${COMMERCE_PLATFORM_LABEL[job.commercePlatform || 'TIKTOK_SHOP']} · ${PRODUCTION_MODE_LABEL[job.productionMode || 'ORIGINAL']}`;

  const rightsTerms: DealRightsTermItem[] = (job.addons || []).map(a => ({
    id: a.id,
    termType: mapAddonTypeToRightTermType(a.type),
    termLabel: a.label,
    scopeType: 'ASSET',
    anchorType: 'ACCEPTANCE_DATE',
    durationDays: 60,
    allocatedCostVnd: isPackageAllIn ? 0 : Math.max(0, Math.round(a.fee || 0)),
    status: a.status === 'VERIFIED' ? 'ACTIVE' : 'PENDING_ANCHOR',
    acceptanceStatus: a.status === 'VERIFIED' ? 'VERIFIED' : a.status === 'DROPPED' ? 'DROPPED' : 'PENDING_ACCEPTANCE',
    evidenceCodeOrUrl: a.evidence || undefined,
  }));

  const adsAddon = (job.addons || []).find(a => a.type === 'ADS_CODE' && a.status !== 'DROPPED');
  const sparkCode = (job.sparkAdsCode || adsAddon?.evidence || '').trim();
  const effectiveEntity = job.entityType || amountBreakdown.entityType || 'INDIVIDUAL';
  const advanceFromPipeline8 =
    job.advancePayment?.status &&
    job.advancePayment.status !== 'NONE' &&
    typeof job.advancePayment.amount === 'number' &&
    job.advancePayment.amount > 0
      ? job.advancePayment.amount
      : 0;
  const advanceFromPayment =
    job.payment.status !== 'NONE' &&
    typeof job.payment.amount === 'number' &&
    job.payment.amount > 0 &&
    job.payment.amount < amountBreakdown.contractDisplayValue
      ? job.payment.amount
      : 0;
  const commPct = job.commissionPct ?? deal.commissionPct ?? undefined;

  return {
    id: `PJ-${job.id}`,
    dealCode: job.code,
    jobId: job.code,
    sourceDealCode: deal.code,
    campaignCode: `PLAN-${plan.month.replace('/', '')}`,
    campaignTitle: plan.title,
    brandName: plan.brandName,
    storeId: plan.storeId,
    storeName: plan.storeName,
    productName: [job.productGroupName, job.productName].filter(Boolean).join(' · ') || undefined,
    bookingFormat: 'Booking Video KOC',
    kocId: kocId || `KOC-${handle}`,
    kocStageName: deal.kocName || handle,
    kocChannelId: handle,
    kocTier: 'TIER_3_MICRO',
    salaryGrade: grade,
    segment: 'Mid Creator',
    tepKenh: 'Mẹ bé (bé)',
    kocCategory: 'Mom and baby',
    contentPillar: job.pillar || 'Review trực tiếp',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    status:
      job.payment.status === 'PAID'
        ? 'FINAL_PAID'
        : job.acceptance.status === 'PASSED' || Boolean(job.acceptance.confirmedBy)
        ? 'VIDEO_VERIFIED'
        : 'TERMS_AGREED',
    statusLabel: job.payment.status === 'PAID' ? 'Đã thanh toán' : 'Đã chốt điều khoản',
    assignedStaff: job.pic || deal.pic,
    bookingPic: job.pic || deal.pic,
    // Giá chưa VAT + phần DROPPED (nơi dùng tự trừ droppedCostVnd); VAT của Công ty cộng ở bước tính thuế theo vatRatePercent.
    totalValue: amountBreakdown.netAmount + droppedNet,
    vatRatePercent: effectiveEntity === 'COMPANY' ? amountBreakdown.vatPct : undefined,
    videoAssetCostVnd: isPackageAllIn ? totalNet : videoNet,
    addonsCostVnd: isPackageAllIn ? 0 : addonsNet,
    droppedCostVnd: droppedNet,
    advanceAmount: advanceFromPipeline8 || advanceFromPayment,
    finalAmount: amountBreakdown.contractDisplayValue,
    deadlinePost: job.deadline,
    tiktokVideoUrl: job.airLink || undefined,
    videoUrl: job.airLink || undefined,
    postedDate: job.airedAt || undefined,
    postDate: job.airedAt || undefined,
    sparkAdsCode: sparkCode || undefined,
    adsCodeStatus: adsAddon ? (adsAddon.status === 'VERIFIED' || Boolean(sparkCode) ? 'ĐÃ_NGHIỆM_THU' : 'CHƯA_CẤP') : 'KHÔNG_DÙNG',
    masterContractCode: frameworkContractNo || undefined,
    contractAppendixCode: job.appendixNo || `PL-${job.code}`,
    contractScanUrl: job.appendixUrl || undefined,
    signedContractUrl: job.appendixUrl || undefined,
    legalProfileId: job.legalProfileId || undefined,
    kocIdCardNumber: job.payeeTaxOrCccd || undefined,
    kocBankName: job.payeeBankName || undefined,
    kocBankAccount: job.payeeBankAccount || undefined,
    kocBankHolder: job.payeeBankHolder || job.payeeLegalName || undefined,
    legalProfileSnapshot:
      job.entityType || job.payeeLegalName || job.payeeTaxOrCccd || job.payeeBankAccount
        ? {
            profileCode: job.legalProfileId || `LP-${job.code}`,
            legalType: effectiveEntity,
            holderName: job.payeeLegalName || deal.kocName || handle,
            legalId: job.payeeTaxOrCccd || '',
            taxAccountType:
              effectiveEntity === 'COMPANY'
                ? `(VAT ${amountBreakdown.vatPct}%) Tài khoản doanh nghiệp`
                : effectiveEntity === 'HOUSEHOLD'
                  ? 'Hộ kinh doanh xuất hóa đơn'
                  : '(Thuế TNCN 10%) Tài khoản cá nhân',
            bankName: job.payeeBankName || undefined,
            bankAccount: job.payeeBankAccount || undefined,
            bankHolderName: job.payeeBankHolder || job.payeeLegalName || undefined,
            frameworkContractCode: frameworkContractNo || undefined,
          }
        : undefined,
    organicCommissionPct: commPct,
    adsCommissionPct: commPct,
    pricingDisplayMode: isPackageAllIn ? 'PACKAGE_TOTAL' : 'ITEMIZED_SOW',
    rightsTerms,
    viewsCount: job.acceptance.views ?? job.performance.d30.views ?? 0,
    affiliateGmv: job.performance.d30.gmv ?? 0,
    gmv30: job.performance.d30.gmv ?? 0,
    roi: totalNet > 0 && job.performance.d30.gmv ? Number((job.performance.d30.gmv / totalNet).toFixed(2)) : 0,
    publishedDays: 0,
    remainingSlaHours: 0,
    isSlaWarning: false,
    contentNote: isPackageAllIn
      ? `[${platformTag}] Gói trọn gói All-in (${totalNet.toLocaleString('vi-VN')}đ)${addonsSummary ? ` gồm: ${addonsSummary}` : ''} · ${amountBreakdown.ruleSummary}`
      : `[${platformTag}] 1 Video (${videoNet.toLocaleString('vi-VN')}đ)${addonsSummary ? ` + SOW: ${addonsSummary}` : ''} · ${amountBreakdown.ruleSummary}`,
    accountComment: `Job ${job.code} thuộc Deal ${deal.code} · Kế hoạch ${plan.title}`,
  } as BookingDealItem;
}

/** Bản deal dùng để điền sẵn hồ sơ hợp đồng cấp Deal (mặc định lấy Job đầu tiên). */
export function planDealToBookingDeal(deal: PlanDeal, plan: InputPlanBreakdownState, kocId?: string): BookingDealItem {
  const firstJob = deal.jobs && deal.jobs.length > 0 ? deal.jobs[0] : null;
  if (firstJob) return planJobToBookingDeal(deal, firstJob, plan, kocId);
  const handle = normHandle(deal.kocHandle);
  const grade = (deal.grade === 'TAP UpAffiliate' ? 'KL1' : deal.grade) as SalaryGrade;
  return {
    id: `PD-${deal.id}`,
    dealCode: deal.code,
    campaignCode: `PLAN-${plan.month.replace('/', '')}`,
    campaignTitle: plan.title,
    brandName: plan.brandName,
    storeId: plan.storeId,
    storeName: plan.storeName,
    productName: [deal.productGroupName, deal.productName].filter(Boolean).join(' · ') || undefined,
    bookingFormat: 'Booking Video KOC',
    kocId: kocId || `KOC-${handle}`,
    kocStageName: deal.kocName || handle,
    kocChannelId: handle,
    kocTier: 'TIER_3_MICRO',
    salaryGrade: grade,
    segment: 'Mid Creator',
    tepKenh: 'Mẹ bé (bé)',
    kocCategory: 'Mom and baby',
    contentPillar: 'Review trực tiếp',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    status: 'TERMS_AGREED',
    statusLabel: 'Đã chốt điều khoản',
    assignedStaff: deal.pic,
    totalValue: deal.fee,
    advanceAmount: 0,
    finalAmount: deal.fee,
    deadlinePost: deal.deadline,
    viewsCount: 0,
    affiliateGmv: 0,
    gmv30: 0,
    roi: 0,
    publishedDays: 0,
    remainingSlaHours: 0,
    isSlaWarning: false,
    accountComment: `Deal ${deal.code} của kế hoạch ${plan.title}`,
  } as BookingDealItem;
}

/** Trạng thái ký của hồ sơ: đã ký khi lần trình ký gần nhất hoàn tất. */
export function recordSigned(r: ContractRecord): { signed: boolean; at: string } {
  const last = [...(r.signing || [])].reverse().find(s => !['CANCELLED', 'REJECTED'].includes(s.status));
  if (last && last.status === 'COMPLETED') return { signed: true, at: (last.syncedAt || last.linkedAt || '').slice(0, 10) };
  return { signed: false, at: '' };
}

/**
 * Ghép Số hiệu văn bản chuẩn từ các token trên bộ 11 mẫu mới (`token:[dd.mm.yy]`, `token:[BRAND]`, `token:[ID KOC]`):
 * - HĐNT: `ddmmyy/HĐNT/UPBASE-ID KOC`
 * - Phụ lục SOW: `ddmmyy/SOW/UPBASE-BRAND-ID KOC`
 * - Biên bản nghiệm thu: `ddmmyy/BBNT/UPBASE-BRAND-ID KOC` (hoặc `ddmmyy/BBNT/UPBASE-ID KOC` với CTV)
 */
export function formatContractRecordNumber(r: ContractRecord): string {
  const vals = r.values || {};
  const explicitKey = Object.keys(vals).find(
    k => /^(token:)?\[?\s*(số|so)\b.*(hợp đồng|phụ lục|sow)/i.test(k) && (vals[k] || '').trim(),
  );
  if (explicitKey && vals[explicitKey]?.trim()) {
    return vals[explicitKey].trim();
  }
  const docDate = (vals['token:[dd.mm.yy]'] || '').trim();
  const brandToken = (vals['token:[BRAND]'] || r.brand || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const kocToken = (vals['token:[ID KOC]'] || r.dealCode || '').trim();
  if (docDate && kocToken) {
    if (r.templateId.endsWith('-HDNT')) {
      return `${docDate}/HĐNT/UPBASE-${kocToken}`;
    }
    if (r.templateId.endsWith('-SOW')) {
      return `${docDate}/SOW/UPBASE-${brandToken || 'BRAND'}-${kocToken}`;
    }
    if (r.templateId === 'CTV-VID-BBNT' || r.templateId === 'CTV-BBNT') {
      return `${docDate}/BBNT/UPBASE-${kocToken}`;
    }
    if (r.templateId.includes('BBNT')) {
      return `${docDate}/BBNT/UPBASE-${brandToken || 'BRAND'}-${kocToken}`;
    }
    return `${docDate}/HĐDV/UPBASE-${brandToken || 'BRAND'}-${kocToken}`;
  }
  return r.id;
}

export interface DealDocumentState {
  document: ContractDocument;
  record?: ContractRecord;
  /** Nhãn hiển thị: Chưa soạn, Nháp, Đang duyệt, Đã duyệt, Đã ký... */
  label: string;
  signed: boolean;
  signedAt: string;
}

const APPROVAL_LABEL: Record<ContractRecord['approval'], string> = {
  DRAFT: 'Đang soạn',
  IN_REVIEW: 'Đang duyệt',
  CHANGES: 'Cần sửa',
  REJECTED: 'Bị từ chối',
  APPROVED: 'Đã duyệt, chờ ký',
};

const pickBestContractRecord = (pool: ContractRecord[]): ContractRecord | undefined =>
  [...pool].sort((a, b) => {
    const aSigned = recordSigned(a).signed ? 1 : 0;
    const bSigned = recordSigned(b).signed ? 1 : 0;
    if (aSigned !== bSigned) return bSigned - aSigned;
    const aApproved = a.approval === 'APPROVED' ? 1 : 0;
    const bApproved = b.approval === 'APPROVED' ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];

/**
 * Hồ sơ hợp đồng theo từng Job:
 * - HDNT: Dùng chung cho KOC.
 * - SOW (Phụ lục) và BBNT: Khớp riêng theo mã Job (`job.code` hoặc `PJ-${job.id}`), hỗ trợ tương thích ngược với hồ sơ cũ gắn mã Deal khi Deal có 1 Job.
 */
export function documentsOfJob(deal: PlanDeal, job: DealJob, records: ContractRecord[], frameworkRecords: ContractRecord[] = []): DealDocumentState[] {
  const isFirstJob = (deal.jobs || [])[0]?.id === job.id;
  const own = records.filter(
    r =>
      r.dealCode === job.code ||
      r.dealId === `PJ-${job.id}` ||
      (isFirstJob && (r.dealCode === deal.code || r.dealId === `PD-${deal.id}`))
  );
  const kocKey = normHandle(deal.kocHandle);
  return (['HDNT', 'SOW', 'BBNT'] as ContractDocument[]).map(document => {
    let pool = own.filter(r => documentOfTemplate(r.templateId) === document);
    // Hợp đồng nguyên tắc dùng chung cho KOC: nhận cả hồ sơ soạn từ deal/job khác của cùng KOC (chỉ khớp theo mã/handle KOC chuẩn)
    if (document === 'HDNT' && pool.length === 0) {
      pool = frameworkRecords.filter(
        r => documentOfTemplate(r.templateId) === 'HDNT' && [r.kocId, r.partner].some(v => v && normHandle(v) === kocKey)
      );
    }
    const record = pickBestContractRecord(pool);
    if (!record) return { document, label: 'Chưa soạn', signed: false, signedAt: '' };
    const s = recordSigned(record);
    return { document, record, label: s.signed ? 'Đã ký' : APPROVAL_LABEL[record.approval], signed: s.signed, signedAt: s.at };
  });
}

/** Hồ sơ của deal theo từng loại tài liệu (mặc định lấy theo Job đầu tiên của Deal). */
export function documentsOfDeal(deal: PlanDeal, records: ContractRecord[], frameworkRecords: ContractRecord[] = []): DealDocumentState[] {
  const firstJob = deal.jobs && deal.jobs.length > 0 ? deal.jobs[0] : null;
  if (firstJob) return documentsOfJob(deal, firstJob, records, frameworkRecords);
  const own = records.filter(r => r.dealCode === deal.code);
  const kocKey = normHandle(deal.kocHandle);
  return (['HDNT', 'SOW', 'BBNT'] as ContractDocument[]).map(document => {
    let pool = own.filter(r => documentOfTemplate(r.templateId) === document);
    if (document === 'HDNT' && pool.length === 0) {
      pool = frameworkRecords.filter(r => documentOfTemplate(r.templateId) === 'HDNT' && [r.kocId, r.partner].some(v => v && normHandle(v) === kocKey));
    }
    const record = pickBestContractRecord(pool);
    if (!record) return { document, label: 'Chưa soạn', signed: false, signedAt: '' };
    const s = recordSigned(record);
    return { document, record, label: s.signed ? 'Đã ký' : APPROVAL_LABEL[record.approval], signed: s.signed, signedAt: s.at };
  });
}
