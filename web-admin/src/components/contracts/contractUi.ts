/**
 * Logic hiển thị dùng chung cho phân hệ Hợp đồng: trạng thái theo bộ 8 nhãn chuẩn,
 * tên vai trò, nhóm ô, chọn mẫu theo loại hồ sơ KOC và điền sẵn từ hồ sơ KOC / booking.
 * Đảm bảo áp dụng chính xác 100% bộ 8 biểu mẫu chuẩn Ver052026 và quy tắc pháp lý BR-01, BR-03, BR-04, BR-05.
 */

import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, ContractRole, FieldGroup, LegalTemplate, ReviewStep } from '../../lib/contracts/types';
import type { StatusTone } from '../ui';
import { formatNumber, getVietnamDateYmd } from '../../lib/format';
import { legalTypeOf } from '../koc/kocUtils';
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
  if (docStage === 'BBNT') {
    return `${subjectKind}-VID-BBNT`;
  }

  return `${subjectKind}-${kind === 'CONTRACT' ? 'HD' : 'BBNT'}`;
}

/** Tên đối tác hiển thị trên hồ sơ: tên pháp lý nếu có, không thì tên kênh. */
export function partnerName(koc: KocItem | undefined, deal?: BookingDealItem): string {
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
  }
) {
  const { koc, deal, existingRecords = [], parentRecord } = ctx;
  const d = ctx.today || new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const subjectKind = detectSubjectKind(koc, deal);
  const type = koc ? legalTypeOf(koc) : 'INDIVIDUAL';
  const quantity = deal?.committedOutputsCount || 1;
  const todayDocDate = `${dd}.${mm}.${String(d.getFullYear()).slice(2)}`;
  const hasSeparateParentDateToken = fields.some(
    f => f.source === 'parentContractDate' || f.source === 'parentSowDate',
  );
  const docDateStr = !hasSeparateParentDateToken && parentRecord?.values['token:[dd.mm.yy]']
    ? parentRecord.values['token:[dd.mm.yy]']
    : todayDocDate;

  // Tự động tra cứu danh sách trường của hồ sơ gốc (SOW hoặc HĐNT) và HĐNT khung (nếu parent là SOW)
  const resolvedParentFields: ContractField[] =
    ctx.parentFields && ctx.parentFields.length > 0
      ? ctx.parentFields
      : parentRecord && OFFICIAL_TEMPLATES_SNAPSHOT[parentRecord.templateId]
        ? uniqueFields(OFFICIAL_TEMPLATES_SNAPSHOT[parentRecord.templateId])
        : [];

  const frameworkRecord: ContractRecord | undefined = (() => {
    if (parentRecord?.templateId.endsWith('-HDNT')) return parentRecord;
    if (parentRecord?.parentId) {
      const found = existingRecords.find(r => r.id === parentRecord.parentId);
      if (found) return found;
    }
    if (koc || parentRecord) {
      return existingRecords.find(
        r =>
          r.templateId.endsWith('-HDNT') &&
          ((koc?.id && r.kocId === koc.id) ||
            (parentRecord?.kocId && r.kocId === parentRecord.kocId) ||
            (parentRecord?.partner && r.partner === parentRecord.partner)),
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
    if (parentRecord) {
      const pf = resolvedParentFields.find(x => x.source === src && parentRecord.values[x.key]?.trim());
      if (pf) return parentRecord.values[pf.key].trim();
    }
    if (frameworkRecord && frameworkRecord.id !== parentRecord?.id) {
      const ff = frameworkFields.find(x => x.source === src && frameworkRecord.values[x.key]?.trim());
      if (ff) return frameworkRecord.values[ff.key].trim();
    }
    return '';
  };

  const parentMoneyFallback = (() => {
    const raw =
      parentValueBySource('lineTotal') ||
      parentValueBySource('netTotal') ||
      parentRecord?.values['token:[Tổng tiền trước thuế/sau thuế]'] ||
      '';
    const num = Number(raw.replace(/[^\d]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : 0;
  })();

  const droppedDeduction = deal?.droppedCostVnd || 0;
  const totalAmount = Math.max(0, (deal?.totalValue || parentMoneyFallback || 0) - droppedDeduction);
  const unitPrice = quantity > 1 && totalAmount ? Math.round(totalAmount / quantity) : totalAmount;

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
    deal?.advanceAmount !== undefined && deal.advanceAmount > 0
      ? deal.advanceAmount
      : parentAdvanceNum > 0
        ? parentAdvanceNum
        : totalAmount >= 2000000
          ? Math.round(totalAmount * 0.5)
          : totalAmount;

  const getUniqueKocIdToken = () => {
    if (parentRecord?.values['token:[ID KOC]']?.trim()) {
      return parentRecord.values['token:[ID KOC]'].trim();
    }
    if (frameworkRecord?.values['token:[ID KOC]']?.trim()) {
      return frameworkRecord.values['token:[ID KOC]'].trim();
    }
    const rawId = koc ? koc.channelId.replace(/^@/, '') : '';
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

  const cccdWithIssue = (f: ContractField) =>
    koc?.cccd && f.start !== undefined && (koc.issueDate || koc.issuePlace)
      ? [koc.cccd, koc.issueDate && `cấp ngày ${koc.issueDate}`, koc.issuePlace && `tại ${koc.issuePlace}`].filter(Boolean).join(' ')
      : koc?.cccd || parentValueBySource('cccd') || '';

  const effectiveBrand = ctx.brand || deal?.brandName || parentRecord?.brand || frameworkRecord?.brand || '';
  const brandCode =
    parentRecord?.values['token:[BRAND]']?.trim() ||
    effectiveBrand.toUpperCase().replace(/[^A-Z0-9]/g, '') ||
    'BRAND';

  const source = (f: ContractField): string => {
    // 1. Phân loại theo source có sẵn (ưu tiên KOC/Deal, dự phòng từ SOW / HĐNT gốc)
    switch (f.source) {
      case 'partyName':
        return (koc ? (type === 'INDIVIDUAL' ? koc.realName : koc.companyName || koc.realName || '') : '') || parentValueBySource('partyName') || parentRecord?.partner || frameworkRecord?.partner || '';
      case 'ownerName':
        return koc?.legalRepresentative || koc?.realName || koc?.stageName || parentValueBySource('ownerName') || '';
      case 'representative':
        return koc?.legalRepresentative || koc?.realName || parentValueBySource('representative') || '';
      case 'cccd':
        return cccdWithIssue(f);
      case 'taxCode':
        return koc?.taxCode || parentValueBySource('taxCode') || '';
      case 'address':
        return koc?.permanentAddress || parentValueBySource('address') || '';
      case 'phone':
        return koc?.phone || parentValueBySource('phone') || '';
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
          parentRecord?.values['token:[Tên chủ tài khoản]'] ||
          frameworkRecord?.values['token:[Tên chủ tài khoản]'] ||
          parentValueBySource('bankAccountName') ||
          (koc ? (type === 'COMPANY' ? koc.companyName || koc.realName : koc.realName) : '') ||
          parentRecord?.partner ||
          ''
        );
      case 'bankAccountNumber':
        return (
          koc?.bankAccount ||
          parentRecord?.values['token:[Số tài khoản]'] ||
          frameworkRecord?.values['token:[Số tài khoản]'] ||
          parentValueBySource('bankAccountNumber') ||
          ''
        );
      case 'bankName':
        return (
          koc?.bankName ||
          parentRecord?.values['token:[Tại Ngân hàng]'] ||
          frameworkRecord?.values['token:[Tại Ngân hàng]'] ||
          parentValueBySource('bankName') ||
          ''
        );
      case 'brand':
        return f.key === 'token:[BRAND]' ? brandCode : (effectiveBrand || parentValueBySource('brand') || '');
      case 'airDate':
        return deal?.deadlinePost || parentValueBySource('airDate') || `${dd}/${mm}/${d.getFullYear()}`;
      case 'kocId':
        return getUniqueKocIdToken();
      case 'docDate':
        return docDateStr;
      case 'parentContractDate':
        return (
          frameworkRecord?.values['token:[dd.mm.yy]'] ||
          parentRecord?.values['token:[Ngày HĐNT]'] ||
          parentRecord?.values['token:[dd.mm.yy]'] ||
          todayDocDate
        );
      case 'parentSowDate':
        return (
          (parentRecord?.templateId.endsWith('-SOW') ? parentRecord.values['token:[dd.mm.yy]'] : '') ||
          parentRecord?.values['token:[Ngày SOW]'] ||
          parentRecord?.values['token:[dd.mm.yy]'] ||
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
      case 'remainingAmount':
        return money(Math.max(0, tax.netAmountToReceive - advanceAmount)) || parentValueBySource('remainingAmount') || (totalAmount > 0 ? '0' : '');
      case 'amountInWords':
        return tax.amountInWords || parentValueBySource('amountInWords');
    }

    // 2. Tự động nhận diện các ô thuế, tổng tiền, chữ ký, tiến độ từ ngữ cảnh biểu mẫu
    const title = (f.title || f.label || '').toLowerCase();
    const context = (f.context || '').toLowerCase();

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
    // Số tiền tạm ứng lần 1
    if (title.includes('tạm ứng lần 1') || context.includes('tạm ứng lần 1') || title.includes('lần 1 tạm ứng')) {
      return money(advanceAmount);
    }
    // Số tiền còn lại / thanh toán đợt 2
    if (title.includes('còn lại') || title.includes('đợt 2') || title.includes('lần 2')) {
      return money(tax.grossTotalContract - advanceAmount);
    }
    // Số ngày tạm ứng / thanh toán
    if (title.includes('hạn tạm ứng') || title.includes('hạn thanh toán')) {
      return '05';
    }
    // Mã quảng cáo (Spark Ads)
    if (title.includes('mã quảng cáo') || context.includes('mã code để chạy quảng cáo')) {
      const adsRight = deal?.rightsTerms?.find(rt => rt.termType === 'ADS_CODE');
      return String(adsRight?.durationDays || deal?.sparkAdsExpiryDays || 30);
    }
    // Thời hạn sử dụng hình ảnh
    if (title.includes('sử dụng hình ảnh') && (title.includes('số ngày') || context.includes('ngày kể từ ngày') || context.includes('ngày từ ngày'))) {
      const imgRight = deal?.rightsTerms?.find(rt => rt.termType === 'IMAGE_USAGE');
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
    // CTV dòng 1
    if (title === 'dòng 1 · nhãn hàng' && effectiveBrand) {
      return effectiveBrand;
    }
    if (title === 'dòng 1 · link' && deal?.tiktokVideoUrl) {
      return deal.tiktokVideoUrl;
    }
    if (title === 'dòng 1 · dạng video') {
      return 'Video review / giới thiệu sản phẩm trên kênh TikTok';
    }
    // Ngày bắt đầu sử dụng hình ảnh
    if (title.includes('bắt đầu sử dụng hình ảnh')) {
      return `${dd}/${mm}/2026`;
    }
    // Chức vụ đại diện công ty
    if (title.includes('chức vụ')) {
      return type === 'COMPANY' ? 'Tổng Giám Đốc' : 'Chủ hộ kinh doanh';
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

/** Ô tiền: chỉ giữ chữ số, hiển thị dấu chấm ngăn nghìn. */
export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits ? formatNumber(Number(digits)) : '';
}

export const dateTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
