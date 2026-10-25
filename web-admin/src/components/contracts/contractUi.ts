/**
 * Logic hiển thị dùng chung cho phân hệ Hợp đồng: trạng thái theo bộ 8 nhãn chuẩn,
 * tên vai trò, nhóm ô, chọn mẫu theo loại hồ sơ KOC và điền sẵn từ hồ sơ KOC / booking.
 * Đảm bảo áp dụng chính xác 100% bộ 8 biểu mẫu chuẩn Ver052026 và quy tắc pháp lý BR-01, BR-03, BR-04, BR-05.
 */

import type { BookingDealItem, KocItem, KocLegalProfile } from '../../lib/types';
import { OFFICIAL_3STAGE_TEMPLATE_IDS, type ContractField, type ContractRecord, type ContractRole, type FieldGroup, type LegalTemplate, type ReviewStep } from '../../lib/contracts/types';
import type { StatusTone } from '../ui';
import { formatNumber, getVietnamDateYmd } from '../../lib/format';
import { getKocLegalProfiles, legalTypeOf } from '../koc/kocUtils';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from '../../lib/contracts/builtInTemplatesSnapshot';
import {
  calculateContractTax,
  detectSubjectKind,
  evaluateContractRules,
  numberToVietnameseWords,
  type ContractRuleEvaluation,
  type SubjectKind,
  type TaxCalculationResult,
} from '../../lib/contracts/contractRules';

export {
  calculateContractTax,
  detectSubjectKind,
  evaluateContractRules,
  numberToVietnameseWords,
  OFFICIAL_3STAGE_TEMPLATE_IDS,
  type ContractRuleEvaluation,
  type SubjectKind,
  type TaxCalculationResult,
};

export const ROLE_LABEL: Record<ContractRole, string> = {
  CREATOR: 'Người tạo',
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  LEAD: 'Trưởng nhóm',
  SIGN_COORDINATOR: 'Điều phối ký',
  AUDITOR: 'Người xem',
};

export interface StatusView { label: string; tone: StatusTone; note?: string }

export function stepStatus(s: ReviewStep): StatusView {
  if (s.status === 'APPROVED') return { label: 'Đã duyệt', tone: 'positive' };
  if (s.status === 'CHANGES') return { label: 'Cần sửa', tone: 'critical', note: 'Yêu cầu bổ sung' };
  if (s.status === 'REJECTED') return { label: 'Cần sửa', tone: 'critical', note: 'Từ chối' };
  return { label: 'Chờ duyệt', tone: 'warning' };
}

/** Trạng thái của một người ký trên weSign (mã action của MISA). */
export function signerStatus(action: number, raw: string): StatusView {
  if (action === 2) return { label: 'Đã ký', tone: 'positive' };
  if (action === 3) return { label: 'Từ chối', tone: 'critical' };
  if (action === 1) return { label: 'Chờ ký', tone: 'warning' };
  if (action === 0) return { label: 'Chưa đến lượt', tone: 'neutral' };
  return { label: raw, tone: 'neutral' };
}

/** Một trạng thái tổng cho hồ sơ: lượt ký (nếu có) quyết định, nếu chưa trình ký thì theo phê duyệt. */
export function contractStatus(r: ContractRecord): StatusView {
  const s = r.signing.at(-1);
  if (s) {
    const signed = s.people.filter(p => p.action === 2).length;
    if (s.status === 'COMPLETED') return { label: 'Hoàn tất', tone: 'positive', note: 'Đã ký đủ' };
    if (s.status === 'REJECTED') return { label: 'Cần sửa', tone: 'critical', note: 'Bên ký từ chối' };
    if (s.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'neutral', note: 'Lượt ký đã hủy' };
    if (s.status === 'WAITING' || s.status === 'PARTIAL') return { label: 'Đang chạy', tone: 'info', note: `Đang ký · ${signed}/${s.people.length} đã ký` };
    return { label: 'Đang chạy', tone: 'info', note: 'Chưa xác định trạng thái ký' };
  }
  if (r.approval === 'APPROVED') return { label: 'Đã duyệt', tone: 'positive', note: 'Chờ trình ký' };
  if (r.approval === 'CHANGES') return { label: 'Cần sửa', tone: 'critical', note: 'Yêu cầu bổ sung' };
  if (r.approval === 'REJECTED') return { label: 'Cần sửa', tone: 'critical', note: 'Bị từ chối' };
  if (r.approval === 'IN_REVIEW') {
    const waiting = r.steps.filter(x => x.status === 'PENDING').map(x => ROLE_LABEL[x.role]);
    return { label: 'Chờ duyệt', tone: 'warning', note: waiting.length ? `Chờ ${waiting.join(', ').toLowerCase()}` : undefined };
  }
  return { label: 'Nháp', tone: 'neutral' };
}

export const HISTORY_LABEL: Record<string, string> = {
  CREATE: 'Tạo hồ sơ', EDIT: 'Tạo phiên bản mới', SUBMIT: 'Gửi duyệt', APPROVED: 'Duyệt', CHANGES: 'Yêu cầu bổ sung',
  REJECTED: 'Từ chối', WITHDRAW: 'Thu hồi', NOTE: 'Ghi chú đàm phán', RULE_CHECK: 'Kiểm tra ô bắt buộc', AI_CHECK: 'Kiểm tra nội dung',
  DEMO_SIGN_START: 'Bắt đầu ký thử', DEMO_SIGN_NEXT: 'Ký thử', DEMO_SIGN_REJECT: 'Từ chối ký thử',
  LINK_WESIGN: 'Liên kết luồng ký', SYNC_WESIGN: 'Cập nhật tiến độ ký', SYNC_ERROR: 'Lỗi cập nhật tiến độ ký',
};

export const GROUP_ORDER: Array<{ key: FieldGroup; title: string }> = [
  { key: 'PARTY', title: 'Bên B' },
  { key: 'NUMBER', title: 'Số hợp đồng' },
  { key: 'DATE', title: 'Ngày ký' },
  { key: 'SCOPE', title: 'Hạng mục công việc' },
  { key: 'MONEY', title: 'Giá trị & thanh toán' },
  { key: 'OTHER', title: 'Ô khác trong mẫu' },
];

/** Mỗi khóa một ô (token như [ID KOC] xuất hiện nhiều chỗ nhưng điền một lần). */
export const uniqueFields = (t: LegalTemplate | null) => (t ? [...new Map(t.fields.map(f => [f.key, f])).values()] : []);

export const isAcceptance = (templateId: string) => templateId.endsWith('-BBNT');

export type ContractDocStage = 'HD' | 'HDNT' | 'SOW' | 'BBNT';

/** Suy ra mẫu Biên bản nghiệm thu (BBNT) tương ứng từ mẫu Hợp đồng / HĐNT / Phụ lục SOW gốc. */
export function inferAcceptanceTemplateId(parentTemplateId?: string, templates: LegalTemplate[] = []): string {
  if (!parentTemplateId) return '';
  const candidate = parentTemplateId.endsWith('-SOW')
    ? parentTemplateId.replace(/-SOW$/, '-VID-BBNT')
    : parentTemplateId.endsWith('-HDNT')
      ? parentTemplateId.replace(/-HDNT$/, '-VID-BBNT')
      : parentTemplateId.endsWith('-HD')
        ? parentTemplateId.replace(/-HD$/, '-BBNT')
        : `${parentTemplateId.split('-')[0]}-BBNT`;
  if (templates.length === 0) return candidate;
  return templates.some(t => t.id === candidate) ? candidate : '';
}

/**
 * Chọn đúng mẫu pháp chế chuẩn cho KOC / Booking:
 * - Ưu tiên mẫu đã được Pháp chế duyệt riêng cho KOC (nếu có).
 * - Tự động nhận diện Livestream -> chọn *-LIVE-HD hoặc *-LIVE-BBNT.
 * - Tự động nhận diện Cộng tác viên (CTV) và chủ thể Cá nhân (IND), Hộ kinh doanh (HKD), Doanh nghiệp (COM).
 * - Hỗ trợ chọn theo giai đoạn hồ sơ mới (HDNT -> SOW -> BBNT).
 */
export function templateFor(
  koc: KocItem | undefined,
  kind: 'CONTRACT' | 'ACCEPTANCE',
  deal?: BookingDealItem,
  templates: LegalTemplate[] = [],
  docStage?: ContractDocStage,
): string {
  // 1. Kiểm tra mẫu duyệt riêng cho KOC
  if (koc?.id && templates.length > 0) {
    const customTpl = templates.find(
      t => t.scope === 'KOC_CUSTOM' && t.kocId === koc.id && t.kind === kind && t.active !== false,
    );
    if (customTpl) return customTpl.id;
  }

  // 2. Nhận diện chủ thể: CTV, COM, HKD, IND
  const subjectKind = detectSubjectKind(koc, deal);

  // 3. Nếu là booking Livestream
  const isLive = Boolean(deal?.bookingFormat && /live/i.test(deal.bookingFormat));
  if (isLive && subjectKind !== 'CTV') {
    return `${subjectKind}-LIVE-${kind === 'ACCEPTANCE' ? 'BBNT' : 'HD'}`;
  }

  // 4. Nếu chỉ định rõ giai đoạn hồ sơ mới (HĐNT -> SOW -> BBNT)
  if (docStage === 'HDNT') {
    return `${subjectKind}-HDNT`;
  }
  if (docStage === 'SOW') {
    return subjectKind === 'CTV' ? 'CTV-HDNT' : `${subjectKind}-SOW`;
  }
  if (docStage === 'BBNT' || (kind === 'ACCEPTANCE' && subjectKind !== 'CTV')) {
    const vidBbntId = `${subjectKind}-VID-BBNT`;
    if (templates.length === 0 || templates.some(t => t.id === vidBbntId)) {
      return vidBbntId;
    }
  }

  return `${subjectKind}-${kind === 'CONTRACT' ? 'HD' : 'BBNT'}`;
}

export interface JobAcceptanceAddonRow {
  id: string;
  termType: 'ADS_CODE' | 'IMAGE_USAGE' | 'EXCLUSIVITY' | 'CROSS_POST_REUP' | 'LINK_BIO_CART';
  termLabel: string;
  durationDays: number;
  evidenceCodeOrUrl: string;
  allocatedCostVnd: number;
  acceptanceStatus: 'VERIFIED' | 'PENDING_ACCEPTANCE' | 'DROPPED';
}

export interface JobAcceptanceBreakdown {
  jobCode: string;
  appendixCode: string;
  masterContractCode: string;
  subjectKind: SubjectKind;
  videoItem: {
    productName: string;
    brandName: string;
    airDate: string;
    videoUrl: string;
    feeNetVnd: number;
    quantity: number;
  };
  addonItems: JobAcceptanceAddonRow[];
  financials: {
    plannedTotalNet: number;
    videoNet: number;
    activeAddonsNet: number;
    droppedDeduction: number;
    acceptedTotalNet: number;
    pitTax: number;
    vatTax: number;
    grossTotal: number;
    advanceAmount: number;
    remainingPayable: number;
    amountInWords: string;
  };
}

const formatYmdToVnDate = (raw?: string): string => {
  if (!raw) return '';
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return raw.trim();
};

const extractDocDateFromCode = (code?: string): string => {
  if (!code) return '';
  const m = code.trim().match(/^(\d{2})[./-]?(\d{2})[./-]?(\d{2})\b/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  return '';
};

/**
 * Tổng hợp bảng kê nghiệm thu theo Phụ lục của từng Job (gồm 1 Video chính + các Dịch vụ đi kèm).
 */
export function buildJobAcceptanceBreakdown(
  deal?: BookingDealItem,
  koc?: KocItem,
  parentRecord?: ContractRecord,
  customAddons?: JobAcceptanceAddonRow[],
  customVideoFee?: number,
): JobAcceptanceBreakdown {
  const subjectKind = detectSubjectKind(koc, deal);
  const jobCode = deal?.dealCode || parentRecord?.dealCode || 'JOB-01';
  const parentDocDate = parentRecord?.values['token:[dd.mm.yy]'] || '';
  const parentBrand = parentRecord?.values['token:[BRAND]'] || (deal?.brandName || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const parentKocToken = parentRecord?.values['token:[ID KOC]'] || (koc?.channelId || deal?.kocChannelId || '').replace(/^@/, '');

  const appendixCode =
    deal?.contractAppendixCode ||
    (parentRecord?.templateId.endsWith('-SOW') && parentDocDate && parentKocToken
      ? `${parentDocDate}/SOW/UPBASE-${parentBrand || 'BRAND'}-${parentKocToken}`
      : `PL-${jobCode}`);

  const masterContractCode =
    deal?.masterContractCode ||
    (parentRecord?.values['token:[Ngày HĐNT]'] && parentKocToken
      ? `${parentRecord.values['token:[Ngày HĐNT]']}/HĐNT/UPBASE-${parentKocToken}`
      : `HĐNT-${parentKocToken || 'KOC'}`);

  const addonItems: JobAcceptanceAddonRow[] = customAddons
    ? customAddons
    : deal?.rightsTerms && deal.rightsTerms.length > 0
      ? deal.rightsTerms.map((rt, idx) => ({
          id: rt.id || `addon-${idx + 1}`,
          termType: rt.termType,
          termLabel: rt.termLabel,
          durationDays: rt.durationDays || 30,
          evidenceCodeOrUrl: rt.evidenceCodeOrUrl || (rt.termType === 'ADS_CODE' ? deal?.sparkAdsCode || '' : ''),
          allocatedCostVnd: Number(rt.allocatedCostVnd) || 0,
          acceptanceStatus:
            rt.acceptanceStatus === 'DROPPED'
              ? 'DROPPED'
              : rt.acceptanceStatus === 'VERIFIED' || (rt.termType === 'ADS_CODE' && Boolean(deal?.sparkAdsCode || rt.evidenceCodeOrUrl))
                ? 'VERIFIED'
                : 'PENDING_ACCEPTANCE',
        }))
      : [
          {
            id: 'default-ads-code',
            termType: 'ADS_CODE',
            termLabel: 'Cấp mã code chạy quảng cáo video (Spark Ads)',
            durationDays: deal?.sparkAdsExpiryDays || 30,
            evidenceCodeOrUrl: deal?.sparkAdsCode || '',
            allocatedCostVnd: 0,
            acceptanceStatus: deal?.sparkAdsCode ? 'VERIFIED' : 'VERIFIED',
          },
          {
            id: 'default-image-usage',
            termType: 'IMAGE_USAGE',
            termLabel: 'Sử dụng hình ảnh và video gốc kể từ ngày đăng tải',
            durationDays: 90,
            evidenceCodeOrUrl: deal?.tiktokVideoUrl || '',
            allocatedCostVnd: 0,
            acceptanceStatus: 'VERIFIED',
          },
        ];

  const totalAddonsAllocated = addonItems.reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
  const activeAddonsNet = addonItems
    .filter(a => a.acceptanceStatus !== 'DROPPED')
    .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
  const droppedDeduction = addonItems
    .filter(a => a.acceptanceStatus === 'DROPPED')
    .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);

  const rawDealTotal = Number(deal?.totalValue || 0);
  const videoNet =
    customVideoFee !== undefined
      ? customVideoFee
      : deal?.videoAssetCostVnd && deal.videoAssetCostVnd > 0
        ? deal.videoAssetCostVnd
        : Math.max(0, rawDealTotal - totalAddonsAllocated);

  const plannedTotalNet = videoNet + totalAddonsAllocated;
  const acceptedTotalNet = Math.max(0, videoNet + activeAddonsNet);

  const tax = calculateContractTax({
    subjectKind,
    baseAmount: acceptedTotalNet,
    vatRatePercent: deal?.vatRatePercent,
    isNetPayment: true,
  });

  const advanceAmount = Number(deal?.advanceAmount || 0);
  const remainingPayable =
    subjectKind === 'COM'
      ? Math.max(0, tax.grossTotalContract - advanceAmount)
      : Math.max(0, tax.netAmountToReceive - advanceAmount);

  return {
    jobCode,
    appendixCode,
    masterContractCode,
    subjectKind,
    videoItem: {
      productName: deal?.productName || deal?.brandName || '',
      brandName: deal?.brandName || parentRecord?.brand || '',
      airDate: formatYmdToVnDate(deal?.postedDate || deal?.deadlinePost || ''),
      videoUrl: deal?.tiktokVideoUrl || '',
      feeNetVnd: videoNet,
      quantity: deal?.committedOutputsCount || 1,
    },
    addonItems,
    financials: {
      plannedTotalNet,
      videoNet,
      activeAddonsNet,
      droppedDeduction,
      acceptedTotalNet,
      pitTax: tax.pitDeductionAmount,
      vatTax: tax.vatAmount,
      grossTotal: tax.grossTotalContract,
      advanceAmount,
      remainingPayable,
      amountInWords: tax.amountInWords,
    },
  };
}

/**
 * Xác định hồ sơ pháp lý đang áp dụng cho KOC / Booking (1 KOC -> N KocLegalProfile).
 * Ưu tiên: legalProfileId chỉ định -> deal.legalProfileId -> deal.legalProfileSnapshot -> hồ sơ mặc định của KOC.
 */
export function resolveActiveLegalProfile(
  koc?: KocItem,
  deal?: BookingDealItem,
  legalProfileId?: string,
): KocLegalProfile | undefined {
  const profiles = koc ? getKocLegalProfiles(koc) : [];
  const targetId = legalProfileId || deal?.legalProfileId;
  const matched =
    (targetId ? profiles.find(p => p.id === targetId) : undefined) ||
    (deal?.legalProfileSnapshot?.legalType
      ? profiles.find(p => p.legalType === deal.legalProfileSnapshot?.legalType)
      : undefined) ||
    profiles.find(p => p.isDefault) ||
    profiles[0];

  const snap = deal?.legalProfileSnapshot;
  if (!matched && !snap) return undefined;

  return {
    id: matched?.id || targetId || 'snap-profile',
    profileCode: snap?.profileCode || matched?.profileCode || 'HSPL-01',
    status: matched?.status || 'ACTIVE',
    legalType: snap?.legalType || matched?.legalType || (koc ? legalTypeOf(koc) : 'INDIVIDUAL'),
    holderName: snap?.holderName || matched?.holderName || koc?.companyName || koc?.realName || koc?.stageName || '',
    taxCode: (snap?.legalType !== 'INDIVIDUAL' ? snap?.legalId : undefined) || matched?.taxCode || koc?.taxCode,
    cccd: deal?.kocIdCardNumber || (snap?.legalType === 'INDIVIDUAL' ? snap?.legalId : undefined) || matched?.cccd || koc?.cccd,
    cccdIssueDate: snap?.cccdIssueDate || matched?.cccdIssueDate || koc?.issueDate,
    cccdIssuePlace: snap?.cccdIssuePlace || matched?.cccdIssuePlace || koc?.issuePlace,
    representativeName: snap?.representativeName || matched?.representativeName || koc?.legalRepresentative,
    representativeTitle: snap?.representativeTitle || matched?.representativeTitle,
    authorizationNumber: matched?.authorizationNumber,
    authorizationDate: matched?.authorizationDate,
    registeredAddress: snap?.registeredAddress || matched?.registeredAddress || koc?.permanentAddress,
    bankName: deal?.kocBankName || snap?.bankName || matched?.bankName || koc?.bankName,
    bankAccount: deal?.kocBankAccount || snap?.bankAccount || matched?.bankAccount || koc?.bankAccount,
    bankHolderName: deal?.kocBankHolder || snap?.bankHolderName || matched?.bankHolderName || snap?.holderName || matched?.holderName,
    taxAccountType: snap?.taxAccountType || matched?.taxAccountType || koc?.taxAccountType || '',
    relationshipNote: matched?.relationshipNote || 'Chính chủ KOC',
    isDefault: matched?.isDefault ?? true,
  };
}

/** Tên đối tác hiển thị trên hồ sơ: tên pháp lý nếu có, không thì tên kênh. */
export function partnerName(koc: KocItem | undefined, deal?: BookingDealItem, legalProfileId?: string): string {
  const activeProfile = resolveActiveLegalProfile(koc, deal, legalProfileId);
  if (activeProfile?.holderName?.trim()) return activeProfile.holderName.trim();
  if (!koc) return deal?.kocStageName || '';
  const type = legalTypeOf(koc);
  return (type === 'INDIVIDUAL' ? koc.realName : koc.companyName || koc.realName) || koc.stageName;
}

const money = (n?: number) => (n !== undefined && !isNaN(n) && n !== 0 ? formatNumber(n) : '');

/**
 * Điền sẵn các ô có nguồn dữ liệu trong hệ thống. Chỉ điền ô đang trống, không bịa giá trị:
 * - Tự động tính toán thuế TNCN (10% cho IND & CTV khi >= 2M) và thuế VAT (cho COM).
 * - Tự sinh số tiền bằng chữ chuẩn kế toán tài chính.
 * - Tự động kế thừa dữ liệu 3 tầng: HĐNT -> Phụ lục SOW -> BBNT.
 */
export function prefill(
  fields: ContractField[],
  values: Record<string, string>,
  ctx: {
    koc?: KocItem;
    deal?: BookingDealItem;
    brand?: string;
    today?: Date;
    existingRecords?: ContractRecord[];
    parentRecord?: ContractRecord;
    parentFields?: ContractField[];
    legalProfileId?: string;
    ctvAcceptedDeals?: BookingDealItem[];
  }
) {
  const { koc, deal, existingRecords = [], parentRecord } = ctx;
  const d = ctx.today || new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const activeProfile = resolveActiveLegalProfile(koc, deal, ctx.legalProfileId);
  const baseSubjectKind = detectSubjectKind(koc, deal);
  const subjectKind: SubjectKind =
    baseSubjectKind === 'CTV'
      ? 'CTV'
      : activeProfile?.legalType === 'COMPANY'
        ? 'COM'
        : activeProfile?.legalType === 'HOUSEHOLD'
          ? 'HKD'
          : baseSubjectKind;
  const type = activeProfile?.legalType || (koc ? legalTypeOf(koc) : 'INDIVIDUAL');
  const quantity = deal?.committedOutputsCount || 1;
  const todayDocDate = `${dd}.${mm}.${String(d.getFullYear()).slice(2)}`;
  const hasSeparateParentDateToken = fields.some(
    f => f.source === 'parentContractDate' || f.source === 'parentSowDate',
  );
  const docDateStr = !hasSeparateParentDateToken && parentRecord?.values['token:[dd.mm.yy]']
    ? parentRecord.values['token:[dd.mm.yy]']
    : todayDocDate;

  // Tự động tìm Phụ lục SOW của Job (nếu chưa truyền parentRecord trực tiếp)
  const sowRecord: ContractRecord | undefined = (() => {
    if (parentRecord?.templateId.endsWith('-SOW')) return parentRecord;
    if (deal?.id || deal?.dealCode) {
      const found = existingRecords.find(
        r =>
          r.templateId.endsWith('-SOW') &&
          ((deal.id && r.dealId === deal.id) || (deal.dealCode && r.dealCode === deal.dealCode)),
      );
      if (found) return found;
    }
    return undefined;
  })();

  const effectiveParentRecord = parentRecord || sowRecord;

  // Tự động tra cứu danh sách trường của hồ sơ gốc (SOW hoặc HĐNT) và HĐNT khung (nếu parent là SOW)
  const resolvedParentFields: ContractField[] =
    ctx.parentFields && ctx.parentFields.length > 0
      ? ctx.parentFields
      : effectiveParentRecord && OFFICIAL_TEMPLATES_SNAPSHOT[effectiveParentRecord.templateId]
        ? uniqueFields(OFFICIAL_TEMPLATES_SNAPSHOT[effectiveParentRecord.templateId])
        : [];

  const frameworkRecord: ContractRecord | undefined = (() => {
    if (effectiveParentRecord?.templateId.endsWith('-HDNT')) return effectiveParentRecord;
    if (effectiveParentRecord?.parentId) {
      const found = existingRecords.find(r => r.id === effectiveParentRecord.parentId);
      if (found) return found;
    }
    if (koc || effectiveParentRecord) {
      return existingRecords.find(
        r =>
          r.templateId.endsWith('-HDNT') &&
          ((koc?.id && r.kocId === koc.id) ||
            (effectiveParentRecord?.kocId && r.kocId === effectiveParentRecord.kocId) ||
            (effectiveParentRecord?.partner && r.partner === effectiveParentRecord.partner)),
      );
    }
    return undefined;
  })();

  const frameworkFields: ContractField[] =
    frameworkRecord && OFFICIAL_TEMPLATES_SNAPSHOT[frameworkRecord.templateId]
      ? uniqueFields(OFFICIAL_TEMPLATES_SNAPSHOT[frameworkRecord.templateId])
      : [];

  // Hỗ trợ kế thừa giá trị theo source từ hợp đồng gốc (SOW -> HĐNT)
  const parentValueBySource = (src: NonNullable<ContractField['source']>): string => {
    if (effectiveParentRecord) {
      const pf = resolvedParentFields.find(x => x.source === src && effectiveParentRecord.values[x.key]?.trim());
      if (pf) return effectiveParentRecord.values[pf.key].trim();
    }
    if (frameworkRecord && frameworkRecord.id !== effectiveParentRecord?.id) {
      const ff = frameworkFields.find(x => x.source === src && frameworkRecord.values[x.key]?.trim());
      if (ff) return frameworkRecord.values[ff.key].trim();
    }
    return '';
  };

  const parentValueByTitleContains = (keyword1: string, keyword2?: string): string => {
    if (!effectiveParentRecord) return '';
    const pf = resolvedParentFields.find(x => {
      const t = (x.title || x.label || '').toLowerCase();
      return t.includes(keyword1) && (!keyword2 || t.includes(keyword2)) && effectiveParentRecord.values[x.key]?.trim();
    });
    return pf ? effectiveParentRecord.values[pf.key].trim() : '';
  };

  const parentMoneyFallback = (() => {
    const raw =
      parentValueBySource('netTotal') ||
      parentValueBySource('lineTotal') ||
      effectiveParentRecord?.values['token:[Tổng tiền trước thuế/sau thuế]'] ||
      '';
    const num = Number(raw.replace(/[^\d]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : 0;
  })();

  const breakdown = buildJobAcceptanceBreakdown(deal, koc, effectiveParentRecord);
  const droppedDeduction = deal?.droppedCostVnd ?? breakdown.financials.droppedDeduction;
  const totalAmount = Math.max(0, (deal?.totalValue || parentMoneyFallback || 0) - droppedDeduction);
  const videoLineAmount =
    deal?.videoAssetCostVnd && deal.videoAssetCostVnd > 0
      ? deal.videoAssetCostVnd
      : Math.max(0, totalAmount - breakdown.financials.activeAddonsNet);
  const unitPrice = quantity > 1 && videoLineAmount ? Math.round(videoLineAmount / quantity) : videoLineAmount;

  // Tính thuế và tổng giá trị hợp đồng theo quy định BR-09
  const tax = calculateContractTax({
    subjectKind,
    baseAmount: totalAmount,
    vatRatePercent: deal?.vatRatePercent,
    isNetPayment: true,
  });

  // Tạm ứng lần 1 (ưu tiên deal.advanceAmount hoặc kế thừa từ SOW/HĐ gốc, mặc định 50% khi >= 2M)
  const parentAdvanceNum = Number((parentValueBySource('advanceAmount') || '').replace(/[^\d]/g, ''));
  const advanceAmount =
    deal?.advanceAmount !== undefined && deal.advanceAmount >= 0
      ? deal.advanceAmount
      : parentAdvanceNum > 0
        ? parentAdvanceNum
        : totalAmount >= 2000000
          ? Math.round(totalAmount * 0.5)
          : 0;

  const getUniqueKocIdToken = () => {
    if (effectiveParentRecord?.values['token:[ID KOC]']?.trim()) {
      return effectiveParentRecord.values['token:[ID KOC]'].trim();
    }
    if (frameworkRecord?.values['token:[ID KOC]']?.trim()) {
      return frameworkRecord.values['token:[ID KOC]'].trim();
    }
    const rawId = koc ? koc.channelId.replace(/^@/, '') : (deal?.kocChannelId || '').replace(/^@/, '');
    if (!rawId) return '';
    if (deal?.dealCode) {
      return `${rawId}-${deal.dealCode}`;
    }
    const sameDayCount = existingRecords.filter(r => {
      const matchKoc = r.kocId === koc?.id || r.partner === koc?.realName || r.partner === koc?.stageName;
      const matchDate = r.values['token:[dd.mm.yy]'] === docDateStr || r.createdAt.startsWith(getVietnamDateYmd(d));
      return matchKoc && matchDate;
    }).length;
    if (sameDayCount > 0) {
      return `${rawId}-${String(sameDayCount + 1).padStart(2, '0')}`;
    }
    return rawId;
  };

  const resolvedCccd = activeProfile?.cccd || koc?.cccd || deal?.kocIdCardNumber || '';
  const resolvedIssueDate = activeProfile?.cccdIssueDate || koc?.issueDate || '';
  const resolvedIssuePlace = activeProfile?.cccdIssuePlace || koc?.issuePlace || '';
  const cccdWithIssue = (f: ContractField) =>
    resolvedCccd && f.start !== undefined && (resolvedIssueDate || resolvedIssuePlace)
      ? [resolvedCccd, resolvedIssueDate && `cấp ngày ${resolvedIssueDate}`, resolvedIssuePlace && `tại ${resolvedIssuePlace}`].filter(Boolean).join(' ')
      : resolvedCccd || parentValueBySource('cccd') || '';

  const effectiveBrand = ctx.brand || deal?.brandName || effectiveParentRecord?.brand || frameworkRecord?.brand || '';
  const brandCode =
    effectiveParentRecord?.values['token:[BRAND]']?.trim() ||
    effectiveBrand.toUpperCase().replace(/[^A-Z0-9]/g, '') ||
    'BRAND';

  const source = (f: ContractField): string => {
    const title = (f.title || f.label || '').toLowerCase();
    const context = (f.context || '').toLowerCase();

    // 1. Phân loại theo source có sẵn (ưu tiên Hồ sơ pháp lý được chọn / Deal / KOC, dự phòng từ SOW / HĐNT gốc)
    switch (f.source) {
      case 'partyName':
        return (
          activeProfile?.holderName ||
          (koc ? (type === 'INDIVIDUAL' ? koc.realName : koc.companyName || koc.realName || '') : '') ||
          deal?.kocStageName ||
          parentValueBySource('partyName') ||
          effectiveParentRecord?.partner ||
          frameworkRecord?.partner ||
          ''
        );
      case 'ownerName':
        // Trên COM-HDNT và COM-SOW, dòng "Tên/Nghệ danh KOL/KOC/Talent" dùng source=ownerName -> ưu tiên Nghệ danh KOC
        if (/nghệ danh|talent/i.test(title) || /nghệ danh|talent/i.test(f.label)) {
          return (
            koc?.stageName ||
            deal?.kocStageName ||
            parentValueByTitleContains('nghệ danh') ||
            koc?.realName ||
            ''
          );
        }
        return (
          activeProfile?.representativeName ||
          koc?.legalRepresentative ||
          koc?.realName ||
          activeProfile?.holderName ||
          parentValueBySource('ownerName') ||
          ''
        );
      case 'representative':
        return (
          activeProfile?.representativeName ||
          koc?.legalRepresentative ||
          koc?.realName ||
          parentValueBySource('representative') ||
          ''
        );
      case 'cccd':
        // Trên COM-VID-BBNT, ô định danh doanh nghiệp mang nhãn gốc CCCD -> tự điền Mã số thuế doanh nghiệp
        if (subjectKind === 'COM' || type === 'COMPANY') {
          return (
            activeProfile?.taxCode ||
            koc?.taxCode ||
            parentValueBySource('taxCode') ||
            parentValueBySource('cccd') ||
            cccdWithIssue(f)
          );
        }
        return cccdWithIssue(f);
      case 'taxCode':
        return activeProfile?.taxCode || koc?.taxCode || parentValueBySource('taxCode') || '';
      case 'address':
        return activeProfile?.registeredAddress || koc?.permanentAddress || parentValueBySource('address') || '';
      case 'phone':
        return koc?.phone || deal?.sampleRecipientPhone || parentValueBySource('phone') || '';
      case 'email':
        return koc?.email || parentValueBySource('email') || '';
      case 'channelLink': {
        const handle = (koc?.channelId || deal?.kocChannelId || '').replace(/^@/, '').trim();
        return (
          koc?.channelLink ||
          koc?.tiktokChannel ||
          (handle ? `https://www.tiktok.com/@${handle}` : '') ||
          parentValueBySource('channelLink') ||
          ''
        );
      }
      case 'bankAccountName':
        return (
          deal?.kocBankHolder ||
          activeProfile?.bankHolderName ||
          activeProfile?.holderName ||
          effectiveParentRecord?.values['token:[Tên chủ tài khoản]'] ||
          frameworkRecord?.values['token:[Tên chủ tài khoản]'] ||
          parentValueBySource('bankAccountName') ||
          (koc ? (type === 'COMPANY' ? koc.companyName || koc.realName : koc.realName) : '') ||
          effectiveParentRecord?.partner ||
          ''
        );
      case 'bankAccountNumber':
        return (
          deal?.kocBankAccount ||
          activeProfile?.bankAccount ||
          koc?.bankAccount ||
          effectiveParentRecord?.values['token:[Số tài khoản]'] ||
          frameworkRecord?.values['token:[Số tài khoản]'] ||
          parentValueBySource('bankAccountNumber') ||
          ''
        );
      case 'bankName':
        return (
          deal?.kocBankName ||
          activeProfile?.bankName ||
          koc?.bankName ||
          effectiveParentRecord?.values['token:[Tại Ngân hàng]'] ||
          frameworkRecord?.values['token:[Tại Ngân hàng]'] ||
          parentValueBySource('bankName') ||
          ''
        );
      case 'brand':
        return f.key === 'token:[BRAND]' ? brandCode : (effectiveBrand || parentValueBySource('brand') || '');
      case 'airDate':
        return (
          formatYmdToVnDate(deal?.postedDate || deal?.deadlinePost) ||
          parentValueBySource('airDate') ||
          `${dd}/${mm}/${d.getFullYear()}`
        );
      case 'kocId':
        return getUniqueKocIdToken();
      case 'docDate':
        return docDateStr;
      case 'parentContractDate':
        return (
          frameworkRecord?.values['token:[dd.mm.yy]'] ||
          effectiveParentRecord?.values['token:[Ngày HĐNT]'] ||
          extractDocDateFromCode(deal?.masterContractCode) ||
          effectiveParentRecord?.values['token:[dd.mm.yy]'] ||
          todayDocDate
        );
      case 'parentSowDate':
        return (
          (sowRecord ? sowRecord.values['token:[dd.mm.yy]'] : '') ||
          (effectiveParentRecord?.templateId.endsWith('-SOW') ? effectiveParentRecord.values['token:[dd.mm.yy]'] : '') ||
          effectiveParentRecord?.values['token:[Ngày SOW]'] ||
          extractDocDateFromCode(deal?.contractAppendixCode) ||
          effectiveParentRecord?.values['token:[dd.mm.yy]'] ||
          todayDocDate
        );
      case 'signDay':
        return dd;
      case 'signMonth':
        return mm;
      case 'signYearDigit':
        return String(d.getFullYear()).slice(-1);
      case 'product':
        return deal?.productName || parentValueBySource('product') || effectiveBrand || '';
      case 'unitPrice':
        return money(unitPrice) || parentValueBySource('unitPrice');
      case 'quantity':
        return (quantity ? String(quantity) : '') || parentValueBySource('quantity');
      case 'lineTotal':
        // Trong bảng hạng mục (SCOPE), lineTotal là đơn giá thành tiền của Hạng mục 1 (Video review);
        // trong bảng tổng hợp (MONEY) của COM-VID-BBNT, lineTotal là Tổng giá trị chưa gồm VAT của cả Job.
        if (f.group === 'SCOPE') {
          return money(videoLineAmount) || money(totalAmount) || parentValueBySource('lineTotal');
        }
        return money(totalAmount) || parentValueBySource('lineTotal');
      case 'netTotal':
        return money(tax.netAmountToReceive) || parentValueBySource('netTotal');
      case 'pitAmount':
        return money(tax.pitDeductionAmount) || parentValueBySource('pitAmount') || (totalAmount > 0 ? '0' : '');
      case 'vatAmount':
        return money(tax.vatAmount) || parentValueBySource('vatAmount') || (totalAmount > 0 ? '0' : '');
      case 'grossTotal':
        return money(tax.grossTotalContract) || parentValueBySource('grossTotal');
      case 'advanceAmount':
        return money(advanceAmount) || parentValueBySource('advanceAmount') || (totalAmount > 0 ? '0' : '');
      case 'adjustmentAmount':
        return droppedDeduction > 0 ? money(droppedDeduction) : (parentValueBySource('adjustmentAmount') || (totalAmount > 0 ? '0' : ''));
      case 'remainingAmount': {
        const remainBase = subjectKind === 'COM' ? tax.grossTotalContract : tax.netAmountToReceive;
        return money(Math.max(0, remainBase - advanceAmount)) || parentValueBySource('remainingAmount') || (totalAmount > 0 ? '0' : '');
      }
      case 'amountInWords':
        return tax.amountInWords || parentValueBySource('amountInWords');
    }

    // 2. Tự động nhận diện các ô hạng mục dịch vụ đi kèm, thuế, tổng tiền từ ngữ cảnh biểu mẫu
    // Thành tiền Hạng mục 2: Cấp mã code quảng cáo video (Spark Ads)
    if (
      (title.includes('cấp mã code') || context.includes('cấp mã code')) &&
      (title.includes('thành tiền') || f.kind === 'money')
    ) {
      const adsRight = breakdown.addonItems.find(rt => rt.termType === 'ADS_CODE');
      if (adsRight) {
        if (adsRight.acceptanceStatus === 'DROPPED') return '0';
        if (adsRight.allocatedCostVnd > 0) return money(adsRight.allocatedCostVnd);
      }
      return parentValueByTitleContains('cấp mã code', 'thành tiền') || (totalAmount > 0 ? '0' : '');
    }

    // Thành tiền Hạng mục 3: Sử dụng hình ảnh và video
    if (
      (title.includes('sử dụng hình ảnh') || context.includes('sử dụng hình ảnh')) &&
      (title.includes('thành tiền') || f.kind === 'money')
    ) {
      const imgRight = breakdown.addonItems.find(rt => rt.termType === 'IMAGE_USAGE');
      if (imgRight) {
        if (imgRight.acceptanceStatus === 'DROPPED') return '0';
        if (imgRight.allocatedCostVnd > 0) return money(imgRight.allocatedCostVnd);
      }
      return parentValueByTitleContains('sử dụng hình ảnh', 'thành tiền') || (totalAmount > 0 ? '0' : '');
    }

    // Tổng giá trị nghiệm thu (Điều 2 COM-VID-BBNT có trường chưa gắn source)
    if (title.includes('tổng giá trị nghiệm thu') && title.includes('thành tiền')) {
      return title.includes('vat') ? money(tax.grossTotalContract) : money(tax.netAmountToReceive);
    }

    // Thuế TNCN
    if (title.includes('thuế tncn') && title.includes('trích nộp')) {
      return money(tax.pitDeductionAmount);
    }
    // Tổng giá trị gồm thuế TNCN
    if (title.includes('đã bao gồm thuế tncn') || (title.includes('tổng giá trị') && title.includes('thuế tncn'))) {
      return money(tax.grossTotalContract);
    }
    // Thuế VAT
    if (title.includes('thuế vat')) {
      return money(tax.vatAmount);
    }
    // Tổng giá trị gồm VAT
    if (title.includes('đã bao gồm thuế vat') || (title.includes('tổng giá trị') && title.includes('thuế vat'))) {
      return money(tax.grossTotalContract);
    }
    // Số tiền bằng chữ
    if (title.includes('bằng chữ') || context.includes('bằng chữ')) {
      return tax.amountInWords;
    }
    // Hoa hồng organic (%) và Hoa hồng chạy ads (%) trên SOW
    if (title.includes('hoa hồng organic')) {
      const pct = deal?.organicCommissionPct ?? koc?.avgCommissionPct;
      return pct !== undefined ? String(pct) : parentValueByTitleContains('hoa hồng organic') || '0';
    }
    if (title.includes('hoa hồng chạy ads')) {
      const pct = deal?.adsCommissionPct ?? deal?.organicCommissionPct ?? koc?.avgCommissionPct;
      return pct !== undefined ? String(pct) : parentValueByTitleContains('hoa hồng chạy ads') || '0';
    }
    if (title.includes('hoa hồng affiliate')) {
      const pct = deal?.organicCommissionPct ?? koc?.avgCommissionPct;
      return pct !== undefined ? String(pct) : '0';
    }
    // Số tiền tạm ứng lần 1
    if (title.includes('tạm ứng lần 1') || context.includes('tạm ứng lần 1') || title.includes('lần 1 tạm ứng')) {
      return money(advanceAmount);
    }
    // Số tiền còn lại / thanh toán đợt 2
    if ((title.includes('còn lại') || title.includes('đợt 2') || title.includes('lần 2')) && f.kind === 'money') {
      return money(tax.grossTotalContract - advanceAmount);
    }
    // Số ngày tạm ứng / thanh toán (kế thừa từ HĐNT khung nếu có, mặc định 05 ngày làm việc)
    if (title.includes('hạn tạm ứng')) {
      return parentValueByTitleContains('hạn tạm ứng') || '05';
    }
    if (title.includes('hạn thanh toán')) {
      return parentValueByTitleContains('hạn thanh toán') || '05';
    }
    // Mã quảng cáo (Spark Ads) - Số ngày
    if (title.includes('mã quảng cáo') || context.includes('mã code để chạy quảng cáo')) {
      const adsRight = breakdown.addonItems.find(rt => rt.termType === 'ADS_CODE');
      return String(adsRight?.durationDays || deal?.sparkAdsExpiryDays || 30);
    }
    // Thời hạn sử dụng hình ảnh - Số ngày
    if (title.includes('sử dụng hình ảnh') && (title.includes('số ngày') || context.includes('ngày kể từ ngày') || context.includes('ngày từ ngày'))) {
      const imgRight = breakdown.addonItems.find(rt => rt.termType === 'IMAGE_USAGE');
      return String(imgRight?.durationDays || 90);
    }
    // Thời hạn sử dụng hình ảnh livestream (tháng)
    if (title.includes('sử dụng hình ảnh livestream')) {
      return '03';
    }
    // Nền tảng / khung giờ / thời lượng livestream
    if (title.includes('nền tảng livestream')) {
      return 'TikTok Shop';
    }
    if (title.includes('khung giờ livestream')) {
      return '20:00 - 22:00';
    }
    if (title.includes('thời lượng lên hình tối thiểu')) {
      return '60';
    }
    // Bảng nghiệm thu tháng CTV-VID-BBNT (Dòng 1..5)
    const ctvRowMatch = title.match(/^dòng\s+([1-5])\s*·\s*(.+)$/i);
    if (ctvRowMatch) {
      const rowIdx = Number(ctvRowMatch[1]) - 1;
      const colName = ctvRowMatch[2].trim().toLowerCase();
      const ctvDeals = ctx.ctvAcceptedDeals && ctx.ctvAcceptedDeals.length > 0 ? ctx.ctvAcceptedDeals : deal ? [deal] : [];
      const rowDeal = ctvDeals[rowIdx];
      if (colName === 'dạng video' && rowIdx === 0) {
        return 'Video review / giới thiệu sản phẩm trên kênh TikTok';
      }
      if (rowDeal) {
        const rowQty = rowDeal.committedOutputsCount || 1;
        const rowTotal = Number(rowDeal.totalValue || 0);
        const rowUnit = rowQty > 1 && rowTotal ? Math.round(rowTotal / rowQty) : rowTotal;
        if (colName === 'nhãn hàng') return rowDeal.brandName || effectiveBrand || '';
        if (colName === 'link') return rowDeal.tiktokVideoUrl || '';
        if (colName === 'trạng thái') return rowDeal.tiktokVideoUrl ? 'Đã nghiệm thu' : 'Chờ nghiệm thu';
        if (colName.startsWith('đơn giá') || colName.startsWith('mức giá')) return money(rowUnit);
        if (colName === 'số lượng') return String(rowQty);
        if (colName === 'thành tiền') return money(rowTotal);
      }
    }
    // Ngày bắt đầu sử dụng hình ảnh
    if (title.includes('bắt đầu sử dụng hình ảnh')) {
      return `${dd}/${mm}/2026`;
    }
    // Chức vụ người đại diện công ty / hộ kinh doanh
    if (title.includes('chức vụ')) {
      return (
        activeProfile?.representativeTitle ||
        parentValueByTitleContains('chức vụ') ||
        (type === 'COMPANY' ? 'Giám đốc' : 'Chủ hộ kinh doanh')
      );
    }
    // Ủy quyền đại diện (COM-HDNT, COM-SOW)
    if (title.includes('số văn bản ủy quyền')) {
      return activeProfile?.authorizationNumber || parentValueByTitleContains('số văn bản ủy quyền') || '';
    }
    if (title.includes('ngày ủy quyền')) {
      return formatYmdToVnDate(activeProfile?.authorizationDate) || parentValueByTitleContains('ngày ủy quyền') || '';
    }
    // Tháng nghiệm thu
    if (title.includes('tháng nghiệm thu')) {
      return mm;
    }

    return '';
  };

  const next = { ...values };
  const filled: string[] = [];
  for (const f of fields) {
    if (next[f.key]?.trim()) continue;
    const v = source(f);
    if (v) {
      next[f.key] = v;
      filled.push(f.key);
    }
  }
  return { values: next, filled };
}

/**
 * Đồng bộ ngược số liệu từ Bảng kiểm nghiệm thu theo Phụ lục Job (Video + Dịch vụ đi kèm)
 * vào các ô của bản nháp Biên bản nghiệm thu (A4).
 */
export function syncValuesFromJobAcceptanceBreakdown(
  fields: ContractField[],
  prevValues: Record<string, string>,
  breakdown: JobAcceptanceBreakdown,
): Record<string, string> {
  const next = { ...prevValues };
  const adsRight = breakdown.addonItems.find(rt => rt.termType === 'ADS_CODE');
  const imgRight = breakdown.addonItems.find(rt => rt.termType === 'IMAGE_USAGE');
  const fin = breakdown.financials;

  for (const f of fields) {
    const title = (f.title || f.label || '').toLowerCase();
    const context = (f.context || '').toLowerCase();

    if (f.source === 'product' && breakdown.videoItem.productName) {
      next[f.key] = breakdown.videoItem.productName;
    } else if (f.source === 'airDate' && breakdown.videoItem.airDate) {
      next[f.key] = breakdown.videoItem.airDate;
    } else if (f.source === 'lineTotal') {
      next[f.key] = f.group === 'SCOPE'
        ? (money(fin.videoNet) || '0')
        : (money(fin.acceptedTotalNet) || '0');
    } else if (f.source === 'netTotal') {
      next[f.key] = money(fin.acceptedTotalNet) || '0';
    } else if (f.source === 'pitAmount') {
      next[f.key] = money(fin.pitTax) || '0';
    } else if (f.source === 'vatAmount') {
      next[f.key] = money(fin.vatTax) || '0';
    } else if (f.source === 'grossTotal') {
      next[f.key] = money(fin.grossTotal) || '0';
    } else if (f.source === 'advanceAmount') {
      next[f.key] = money(fin.advanceAmount) || '0';
    } else if (f.source === 'adjustmentAmount') {
      next[f.key] = money(fin.droppedDeduction) || '0';
    } else if (f.source === 'remainingAmount') {
      next[f.key] = money(fin.remainingPayable) || '0';
    } else if (f.source === 'amountInWords' || title.includes('bằng chữ') || context.includes('bằng chữ')) {
      next[f.key] = fin.amountInWords;
    } else if (
      (title.includes('cấp mã code') || context.includes('cấp mã code')) &&
      (title.includes('thành tiền') || f.kind === 'money')
    ) {
      if (adsRight) {
        next[f.key] = adsRight.acceptanceStatus === 'DROPPED' ? '0' : (money(adsRight.allocatedCostVnd) || '0');
      }
    } else if (
      (title.includes('sử dụng hình ảnh') || context.includes('sử dụng hình ảnh')) &&
      (title.includes('thành tiền') || f.kind === 'money')
    ) {
      if (imgRight) {
        next[f.key] = imgRight.acceptanceStatus === 'DROPPED' ? '0' : (money(imgRight.allocatedCostVnd) || '0');
      }
    } else if (title.includes('mã quảng cáo') || context.includes('mã code để chạy quảng cáo')) {
      if (adsRight?.durationDays) next[f.key] = String(adsRight.durationDays);
    } else if (
      title.includes('sử dụng hình ảnh') &&
      (title.includes('số ngày') || context.includes('ngày kể từ ngày') || context.includes('ngày từ ngày'))
    ) {
      if (imgRight?.durationDays) next[f.key] = String(imgRight.durationDays);
    } else if (title.includes('tổng giá trị nghiệm thu') && title.includes('thành tiền')) {
      next[f.key] = title.includes('vat') ? (money(fin.grossTotal) || '0') : (money(fin.acceptedTotalNet) || '0');
    }
  }

  return next;
}

/** Ô tiền: chỉ giữ chữ số, hiển thị dấu chấm ngăn nghìn. */
export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits ? formatNumber(Number(digits)) : '';
}

export const dateTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
