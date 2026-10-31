/**
 * Quy tắc ánh xạ dữ liệu, sinh mã hợp đồng idempotent (code), chuẩn hóa payload GraphQL
 * và kiểm soát chuyển trạng thái tiến giữa B2C Portal và dịch vụ trung tâm Contract Service.
 * Module thuần TypeScript (Client-safe, không phụ thuộc node:crypto hay node:fs).
 */

import type {
  ContractCategory,
  ContractField,
  ContractRecord,
  ContractServiceTemplateField,
  ContractServiceTemplateObject,
  ContractServiceTemplateParticipant,
  ContractServiceTemplateType,
  ContractSystemSyncMeta,
  DocBlock,
  FieldGroup,
  FieldKind,
  FieldSource,
  LegalTemplate,
  SigningAttempt,
  TemplateSchemaDiff,
} from './types';
import { OFFICIAL_TEMPLATES_SNAPSHOT } from './builtInTemplatesSnapshot';

export const CONTRACT_SERVICE_TYPE_LABELS: Record<ContractServiceTemplateType, string> = {
  MASTER: 'Hợp đồng nguyên tắc (MASTER)',
  SERVICE: 'Hợp đồng dịch vụ lẻ (SERVICE)',
  APPENDIX: 'Phụ lục hợp đồng / SOW (APPENDIX)',
  VIDEO_ACCEPTANCE: 'Biên bản nghiệm thu Video (VIDEO_ACCEPTANCE)',
  LIVESTREAM_ACCEPTANCE: 'Biên bản nghiệm thu Livestream (LIVESTREAM_ACCEPTANCE)',
};

export const CONTRACT_SERVICE_OBJECT_LABELS: Record<ContractServiceTemplateObject, string> = {
  INDIVIDUAL: 'Cá nhân (INDIVIDUAL)',
  BUSINESS: 'Hộ kinh doanh (BUSINESS)',
  COMPANY: 'Công ty / Doanh nghiệp (COMPANY)',
};

export const DEFAULT_SIGN_TAGS = ['{{SIGN_PROVIDER}}', '{{SIGN_CLIENT}}'] as const;

/** UUID mẫu HDNT-CANHAN trên môi trường staging của Contract Service. */
export const DEFAULT_HDNT_CANHAN_TEMPLATE_ID = '23adfa68-b9a5-4ff6-a453-48a08b6a47a0';

/** Danh sách 17 field chuẩn của mẫu HDNT-CANHAN trên Contract Service. */
export const DEFAULT_HDNT_CANHAN_FIELDS: ContractServiceTemplateField[] = [
  { fieldKey: 'BANK_ACCOUNT_NAME', fieldType: 'text', required: true },
  { fieldKey: 'BANK_ACCOUNT_NUMBER', fieldType: 'text', required: true },
  { fieldKey: 'BANK_NAME', fieldType: 'text', required: true },
  { fieldKey: 'CONTRACT_NO', fieldType: 'text', required: true },
  { fieldKey: 'NOW_DAY', fieldType: 'text', required: true },
  { fieldKey: 'NOW_MONTH', fieldType: 'text', required: true },
  { fieldKey: 'NOW_YEAR', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_ADDRESS', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_EMAIL', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_ID_ISSUE_DATE', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_ID_ISSUE_PLACE', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_ID_NUMBER', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_NAME', fieldType: 'text', required: true },
  { fieldKey: 'PARTY_B_PHONE', fieldType: 'text', required: true },
  { fieldKey: 'PAYMENT_METHOD', fieldType: 'text', required: true },
  { fieldKey: 'PAYMENT_TERMS', fieldType: 'text', required: true },
  { fieldKey: 'SOCIAL_ACCOUNT_LINK', fieldType: 'text', required: true },
];

/** Danh sách người ký (participants) mặc định của mẫu HDNT-CANHAN trên Contract Service. */
export const DEFAULT_HDNT_CANHAN_PARTICIPANTS: ContractServiceTemplateParticipant[] = [
  {
    code: 'SIGN_PROVIDER',
    role: 'signer',
    action: 'sign',
    signingOrder: 1,
    required: true,
    name: '{{NAME_SIGN_PROVIDER}}',
    email: '{{EMAIL_SIGN_PROVIDER}}',
    phone: null,
    signatureType: 'electronic',
  },
  {
    code: 'SIGN_CLIENT',
    role: 'signer',
    action: 'sign',
    signingOrder: 2,
    required: true,
    name: '{{NAME_SIGN_CLIENT}}',
    email: '{{EMAIL_SIGN_CLIENT}}',
    phone: null,
    signatureType: 'electronic',
  },
];

/** Phân loại văn bản thuộc chặng nào trong chuỗi 3 bước: HĐNT Khung -> Phụ lục SOW -> Biên bản nghiệm thu BBNT. */
export function resolveContractDocStage(templateId?: string, kind?: 'CONTRACT' | 'ACCEPTANCE'): 'HDNT' | 'SOW' | 'BBNT' {
  const id = (templateId || '').toUpperCase();
  if (kind === 'ACCEPTANCE' || id.includes('BBNT') || id.endsWith('-NT')) return 'BBNT';
  if (id.endsWith('-SOW') || id.includes('-LIVE-') || id.includes('-PL')) return 'SOW';
  return 'HDNT';
}

/** Ánh xạ mã mẫu nội bộ B2C sang tiêu chí nhận diện mẫu trên Contract Service (code, type, object, fallbackUuid). */
export function resolveExpectedRemoteTemplateCriteria(
  templateId?: string,
  kind?: 'CONTRACT' | 'ACCEPTANCE',
  subject?: string,
): {
  preferredCodes: string[];
  type: 'MASTER' | 'SERVICE' | 'APPENDIX' | 'LIVESTREAM_ACCEPTANCE' | 'VIDEO_ACCEPTANCE';
  object: 'INDIVIDUAL' | 'BUSINESS' | 'COMPANY';
  fallbackUuid?: string;
} {
  const id = (templateId || '').toUpperCase();
  const subj = (subject || '').toLowerCase();

  const object: 'INDIVIDUAL' | 'BUSINESS' | 'COMPANY' =
    id.startsWith('HKD-') || subj.includes('hộ kinh doanh')
      ? 'BUSINESS'
      : id.startsWith('COM-') || subj.includes('công ty')
        ? 'COMPANY'
        : 'INDIVIDUAL';

  const type: 'MASTER' | 'SERVICE' | 'APPENDIX' | 'LIVESTREAM_ACCEPTANCE' | 'VIDEO_ACCEPTANCE' =
    id.includes('LIVE') && (kind === 'ACCEPTANCE' || id.includes('BBNT'))
      ? 'LIVESTREAM_ACCEPTANCE'
      : kind === 'ACCEPTANCE' || id.includes('BBNT')
        ? 'VIDEO_ACCEPTANCE'
        : id.endsWith('-SOW') || id.includes('-PL')
          ? 'APPENDIX'
          : id.endsWith('-HDNT')
            ? 'MASTER'
            : 'SERVICE';

  const objSuffix = object === 'INDIVIDUAL' ? 'CANHAN' : object === 'BUSINESS' ? 'HKD' : 'CONGTY';
  const preferredCodes: string[] = [id];

  if (type === 'MASTER') {
    preferredCodes.unshift(`HDNT-${objSuffix}`, `HDNT_${objSuffix}`);
  } else if (type === 'APPENDIX') {
    preferredCodes.unshift(`SOW-${objSuffix}`, `PL-${objSuffix}`, `APPENDIX-${objSuffix}`);
  } else if (type === 'VIDEO_ACCEPTANCE') {
    preferredCodes.unshift(`BBNT-${objSuffix}`, `BBNT-VIDEO-${objSuffix}`);
  } else if (type === 'LIVESTREAM_ACCEPTANCE') {
    preferredCodes.unshift(`BBNT-LIVE-${objSuffix}`, `LIVESTREAM-BBNT-${objSuffix}`);
  } else {
    preferredCodes.unshift(`HDDV-${objSuffix}`, `HD-${objSuffix}`, `HDNT-${objSuffix}`);
  }

  const fallbackUuid =
    object === 'INDIVIDUAL' && (type === 'MASTER' || type === 'SERVICE')
      ? DEFAULT_HDNT_CANHAN_TEMPLATE_ID
      : undefined;

  return { preferredCodes, type, object, fallbackUuid };
}

/**
 * Chuẩn hóa trạng thái hợp đồng từ ContractStatus của Contract Service
 * (`rendered`, `ready`, `signing_requested`, `completed`, `rejected`, `cancelled`, `failed`...)
 * sang mã trạng thái trình ký chuẩn của B2C Portal.
 */
export function normalizeContractServiceStatus(
  rawStatus?: string | null,
): 'DRAFT' | 'WAITING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'FAILED' | 'UNKNOWN' {
  const s = (rawStatus || '').trim().toLowerCase();
  if (!s) return 'WAITING';
  if (s === 'completed') return 'COMPLETED';
  if (s === 'partial') return 'PARTIAL';
  if (s === 'signing_requested' || s === 'waiting' || s === 'ready' || s === 'rendered') return 'WAITING';
  if (s === 'rejected') return 'REJECTED';
  if (s === 'cancelled' || s === 'canceled') return 'CANCELLED';
  if (
    s === 'failed' ||
    s === 'google_sync_failed' ||
    s === 'google_conversion_failed' ||
    s === 'google_permission_failed' ||
    s === 'document_render_failed'
  ) {
    return 'FAILED';
  }
  if (s === 'draft') return 'DRAFT';
  return 'UNKNOWN';
}

/** Thứ bậc trạng thái ký để chặn sự kiện webhook đến trễ ghi đè lùi trạng thái (Forward-only transition). */
const SIGNING_STATUS_RANK: Record<string, number> = {
  DRAFT: 0,
  UNKNOWN: 0,
  WAITING: 1,
  PARTIAL: 2,
  COMPLETED: 3,
  REJECTED: 3,
  CANCELLED: 3,
  FAILED: 3,
};

/**
 * Sinh mã hợp đồng ổn định (`contractCode`) làm khóa idempotent cho `generateContract` và `requestSign`.
 * Khi mạng chập chờn hoặc gọi lại `requestSign`, `contract-system` tra cứu theo `code` và tái sử dụng bản ghi đã có.
 */
export function buildStableContractCode(input: {
  id?: string;
  templateId: string;
  dealCode?: string;
  kocId?: string;
  partner?: string;
  brand?: string;
  values?: Record<string, string>;
}): string {
  const values = input.values || {};
  const explicitContractNo = values['CONTRACT_NO']?.trim();
  if (explicitContractNo && /\/(?:HĐNT|HDNT|HĐDV|HDDV|SOW|BBNT)\//i.test(explicitContractNo)) {
    return explicitContractNo;
  }
  const rawDate =
    values['CONTRACT_DATE_CODE'] ||
    values['token:[dd.mm.yy]'] ||
    values['token:[DDMMYY]'] ||
    values['MASTER_CONTRACT_DATE'] ||
    values['token:[Ngày HĐNT]'] ||
    values['PARENT_SOW_DATE'] ||
    values['token:[Ngày SOW]'] ||
    '26';
  const cleanDate = rawDate.replace(/[^0-9]/g, '').slice(0, 6) || '26';

  const docType = input.templateId.endsWith('-HDNT')
    ? 'HDNT'
    : input.templateId.endsWith('-SOW')
      ? 'SOW'
      : input.templateId.includes('BBNT')
        ? 'BBNT'
        : 'HDDV';

  const rawTokenId = (values['KOC_CODE'] || values['token:[ID KOC]'] || '').trim();
  const isStaleDemoToken =
    rawTokenId.toLowerCase() === 'chanhbeauty' &&
    Boolean(input.partner) &&
    !/chanh|mai\s*phuong|mai\s*phương/i.test(input.partner || '');
  const safeTokenId = isStaleDemoToken ? '' : rawTokenId;

  const rawRef =
    docType === 'HDNT'
      ? safeTokenId || input.partner || input.kocId || input.id?.slice(0, 8) || 'KOC'
      : input.dealCode ||
        safeTokenId ||
        input.partner ||
        input.kocId ||
        input.id?.slice(0, 8) ||
        'KOC';

  const cleanRef =
    rawRef
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toUpperCase()
      .slice(0, 24) || 'KOC';

  if (docType === 'HDNT') {
    return `${cleanDate}/${docType}/UPBASE-${cleanRef}`;
  }

  const cleanBrand =
    (values['BRAND_CODE'] || values['BRAND_NAME'] || values['token:[BRAND]'] || input.brand || 'UPBASE')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 12) || 'UPBASE';

  if (cleanBrand === 'UPBASE') {
    return `${cleanDate}/${docType}/UPBASE-${cleanRef}`;
  }

  return `${cleanDate}/${docType}/UPBASE-${cleanBrand}-${cleanRef}`;
}

/**
 * Bổ sung thông tin thẻ ô ký (`{{SIGN_PROVIDER}}`, `{{SIGN_CLIENT}}`) và cấu hình luồng ký
 * cho mẫu biểu nếu chưa có sẵn từ Contract Service.
 */
export function enrichTemplateWithSignFlow(template: LegalTemplate): LegalTemplate {
  const criteria = resolveExpectedRemoteTemplateCriteria(template.id, template.kind, template.subject);
  const signTags =
    template.signTags && template.signTags.length > 0
      ? template.signTags
      : [...DEFAULT_SIGN_TAGS];

  const signingFlowConfig = template.signingFlowConfig || {
    mode: 'SEQUENTIAL' as const,
    deadlineDays: 15,
    signers: [
      {
        order: 1,
        role: 'Đại diện Bên A (UpBase)',
        signTag: signTags[0] || '{{SIGN_PROVIDER}}',
      },
      {
        order: 2,
        role: `Đại diện Bên B (${template.subject || 'KOC'})`,
        signTag: signTags[1] || '{{SIGN_CLIENT}}',
      },
    ],
  };

  const normalizedFields = normalizeTemplateFieldsToApiKeys(template.fields || []);

  return {
    ...template,
    fields: normalizedFields,
    remoteTemplateId: template.remoteTemplateId || criteria.fallbackUuid,
    remoteTemplateCode: template.remoteTemplateCode || criteria.preferredCodes[0],
    contractType: template.contractType || criteria.type,
    contractObject: template.contractObject || criteria.object,
    hasSigningFlowConfig: template.hasSigningFlowConfig ?? true,
    remoteFields: template.remoteFields || DEFAULT_HDNT_CANHAN_FIELDS,
    remoteParticipants: template.remoteParticipants || DEFAULT_HDNT_CANHAN_PARTICIPANTS,
    signTags,
    signingFlowConfig,
  };
}

export const REMOTE_FIELD_DICTIONARY: Record<
  string,
  { title: string; group: FieldGroup; kind: FieldKind; source?: FieldSource }
> = {
  CONTRACT_NO: { title: 'Số hợp đồng / phụ lục (CONTRACT_NO)', group: 'NUMBER', kind: 'text' },
  CONTRACT_DATE_CODE: { title: 'Ngày lập trong số hợp đồng (CONTRACT_DATE_CODE)', group: 'NUMBER', kind: 'text', source: 'docDate' },
  MASTER_CONTRACT_DATE: { title: 'Ngày lập HĐNT gốc (MASTER_CONTRACT_DATE)', group: 'NUMBER', kind: 'text', source: 'parentContractDate' },
  PARENT_SOW_DATE: { title: 'Ngày lập Phụ lục SOW (PARENT_SOW_DATE)', group: 'NUMBER', kind: 'text', source: 'parentSowDate' },
  BRAND_CODE: { title: 'Mã nhãn hàng trong số hợp đồng (BRAND_CODE)', group: 'NUMBER', kind: 'text', source: 'brand' },
  KOC_CODE: { title: 'Mã KOC trong số hợp đồng (KOC_CODE)', group: 'NUMBER', kind: 'text', source: 'kocId' },
  NOW_DAY: { title: 'Ngày ký (NOW_DAY)', group: 'DATE', kind: 'text', source: 'signDay' },
  NGAY: { title: 'Ngày ký (NGAY)', group: 'DATE', kind: 'text', source: 'signDay' },
  NOW_MONTH: { title: 'Tháng ký (NOW_MONTH)', group: 'DATE', kind: 'text', source: 'signMonth' },
  THANG: { title: 'Tháng ký (THANG)', group: 'DATE', kind: 'text', source: 'signMonth' },
  NOW_YEAR: { title: 'Năm ký (NOW_YEAR)', group: 'DATE', kind: 'text', source: 'signYearDigit' },
  NAM: { title: 'Năm ký (NAM)', group: 'DATE', kind: 'text', source: 'signYearDigit' },
  PARTY_B_NAME: { title: 'Họ và tên / Tên đơn vị Bên B (PARTY_B_NAME)', group: 'PARTY', kind: 'text', source: 'partyName' },
  NAME_B: { title: 'Họ và tên Bên B (NAME_B)', group: 'PARTY', kind: 'text', source: 'partyName' },
  PARTY_B_OWNER_NAME: { title: 'Họ tên chủ hộ / Nghệ danh KOC (PARTY_B_OWNER_NAME)', group: 'PARTY', kind: 'text', source: 'ownerName' },
  PARTY_B_REPRESENTATIVE: { title: 'Người đại diện Bên B (PARTY_B_REPRESENTATIVE)', group: 'PARTY', kind: 'text', source: 'representative' },
  PARTY_B_POSITION: { title: 'Chức vụ người đại diện (PARTY_B_POSITION)', group: 'PARTY', kind: 'text' },
  PARTY_B_PHONE: { title: 'Số điện thoại Bên B (PARTY_B_PHONE)', group: 'PARTY', kind: 'text', source: 'phone' },
  PHONE: { title: 'Số điện thoại Bên B (PHONE)', group: 'PARTY', kind: 'text', source: 'phone' },
  PARTY_B_EMAIL: { title: 'Email nhận hợp đồng & ký số Bên B (PARTY_B_EMAIL)', group: 'PARTY', kind: 'text', source: 'email' },
  PARTY_B_ADDRESS: { title: 'Địa chỉ thường trú / Trụ sở Bên B (PARTY_B_ADDRESS)', group: 'PARTY', kind: 'text', source: 'address' },
  PARTY_B_ID_NUMBER: { title: 'Số CCCD / CMND Bên B (PARTY_B_ID_NUMBER)', group: 'PARTY', kind: 'text', source: 'cccd' },
  CCCD: { title: 'Số CCCD / CMND Bên B (CCCD)', group: 'PARTY', kind: 'text', source: 'cccd' },
  PARTY_B_ID_ISSUE_DATE: { title: 'Ngày cấp CCCD (PARTY_B_ID_ISSUE_DATE)', group: 'PARTY', kind: 'date' },
  PARTY_B_ID_ISSUE_PLACE: { title: 'Nơi cấp CCCD (PARTY_B_ID_ISSUE_PLACE)', group: 'PARTY', kind: 'text' },
  PARTY_B_TAX_CODE: { title: 'Mã số thuế Bên B (PARTY_B_TAX_CODE)', group: 'PARTY', kind: 'text', source: 'taxCode' },
  SOCIAL_ACCOUNT_LINK: { title: 'Link kênh mạng xã hội (SOCIAL_ACCOUNT_LINK)', group: 'PARTY', kind: 'text', source: 'channelLink' },
  BANK_ACCOUNT_NAME: { title: 'Tên chủ tài khoản ngân hàng (BANK_ACCOUNT_NAME)', group: 'MONEY', kind: 'text', source: 'bankAccountName' },
  BANK_ACCOUNT_NUMBER: { title: 'Số tài khoản ngân hàng (BANK_ACCOUNT_NUMBER)', group: 'MONEY', kind: 'text', source: 'bankAccountNumber' },
  BANK_NAME: { title: 'Tên ngân hàng & Chi nhánh (BANK_NAME)', group: 'MONEY', kind: 'text', source: 'bankName' },
  PAYMENT_METHOD: { title: 'Hình thức thanh toán (PAYMENT_METHOD)', group: 'MONEY', kind: 'text' },
  PAYMENT_TERMS: { title: 'Điều khoản & Thời hạn thanh toán (PAYMENT_TERMS)', group: 'MONEY', kind: 'long' },
  PRODUCT_NAME: { title: 'Sản phẩm / Nhãn hàng quảng bá (PRODUCT_NAME)', group: 'SCOPE', kind: 'text', source: 'product' },
  AIR_DATE: { title: 'Ngày đăng bài dự kiến (AIR_DATE)', group: 'SCOPE', kind: 'date', source: 'airDate' },
  QUANTITY: { title: 'Số lượng hạng mục (QUANTITY)', group: 'SCOPE', kind: 'number', source: 'quantity' },
  UNIT_PRICE: { title: 'Đơn giá dịch vụ (UNIT_PRICE)', group: 'MONEY', kind: 'money', source: 'unitPrice' },
  LINE_TOTAL: { title: 'Thành tiền dịch vụ (LINE_TOTAL)', group: 'MONEY', kind: 'money', source: 'lineTotal' },
  NET_TOTAL: { title: 'Tổng giá trị thực nhận Net (NET_TOTAL)', group: 'MONEY', kind: 'money', source: 'netTotal' },
  GROSS_TOTAL: { title: 'Tổng giá trị hợp đồng Gross (GROSS_TOTAL)', group: 'MONEY', kind: 'money', source: 'grossTotal' },
  PIT_AMOUNT: { title: 'Thuế TNCN khấu trừ tại nguồn (PIT_AMOUNT)', group: 'MONEY', kind: 'money', source: 'pitAmount' },
  VAT_AMOUNT: { title: 'Thuế GTGT / VAT (VAT_AMOUNT)', group: 'MONEY', kind: 'money', source: 'vatAmount' },
  ADVANCE_AMOUNT: { title: 'Số tiền tạm ứng lần 1 (ADVANCE_AMOUNT)', group: 'MONEY', kind: 'money', source: 'advanceAmount' },
  REMAINING_AMOUNT: { title: 'Số tiền thanh toán còn lại (REMAINING_AMOUNT)', group: 'MONEY', kind: 'money', source: 'remainingAmount' },
  AMOUNT_IN_WORDS: { title: 'Số tiền bằng chữ (AMOUNT_IN_WORDS)', group: 'MONEY', kind: 'text', source: 'amountInWords' },
};

/**
 * Chuẩn hóa mã trường (`key`) của các mẫu nội bộ sang quy tắc đặt tên `fieldKey` viết hoa của API Contract Service
 * (`CONTRACT_NO`, `NOW_DAY`, `NOW_MONTH`, `NOW_YEAR`, `PARTY_B_NAME`, `PARTY_B_ID_NUMBER`, `BANK_ACCOUNT_NAME`...).
 */
export function toStandardApiFieldKey(f: ContractField): string {
  const rawKey = (f.key || '').trim();
  if (/^[A-Z][A-Z0-9_]*$/.test(rawKey)) {
    return rawKey;
  }

  const title = (f.title || f.label || '').toLowerCase();
  const context = (f.context || '').toLowerCase();

  // 1. Nhóm Số hợp đồng / Mã định danh
  if (rawKey === 'token:[dd.mm.yy]' || f.source === 'docDate') return 'CONTRACT_DATE_CODE';
  if (rawKey === 'token:[Ngày HĐNT]' || f.source === 'parentContractDate') return 'MASTER_CONTRACT_DATE';
  if (rawKey === 'token:[Ngày SOW]' || f.source === 'parentSowDate') return 'PARENT_SOW_DATE';
  if (rawKey === 'token:[BRAND]') return 'BRAND_CODE';
  if (rawKey === 'token:[ID KOC]' || f.source === 'kocId') return 'KOC_CODE';

  // 2. Nhóm Ngày ký / Tháng nghiệm thu
  if (f.source === 'signDay') return 'NOW_DAY';
  if (f.source === 'signMonth') {
    if (title.includes('nghiệm thu')) {
      return title.includes('(2)') ? 'ACCEPTANCE_MONTH_2' : 'ACCEPTANCE_MONTH';
    }
    return 'NOW_MONTH';
  }
  if (f.source === 'signYearDigit') {
    if (title.includes('nghiệm thu')) {
      return title.includes('(2)') ? 'ACCEPTANCE_YEAR_2' : 'ACCEPTANCE_YEAR';
    }
    return 'NOW_YEAR';
  }

  // 3. Nhóm Thông tin Bên B & Tài khoản ngân hàng
  if (f.source === 'partyName') return 'PARTY_B_NAME';
  if (f.source === 'ownerName') return 'PARTY_B_OWNER_NAME';
  if (f.source === 'representative') return 'PARTY_B_REPRESENTATIVE';
  if (f.source === 'cccd') return 'PARTY_B_ID_NUMBER';
  if (f.source === 'taxCode') return 'PARTY_B_TAX_CODE';
  if (f.source === 'address') return 'PARTY_B_ADDRESS';
  if (f.source === 'phone') return 'PARTY_B_PHONE';
  if (f.source === 'email') return 'PARTY_B_EMAIL';
  if (f.source === 'channelLink') {
    if (title.includes('livestream')) return 'LIVESTREAM_CHANNEL_LINK';
    return 'SOCIAL_ACCOUNT_LINK';
  }
  if (f.source === 'bankAccountName' || rawKey === 'token:[Tên chủ tài khoản]') return 'BANK_ACCOUNT_NAME';
  if (f.source === 'bankAccountNumber' || rawKey === 'token:[Số tài khoản]') return 'BANK_ACCOUNT_NUMBER';
  if (f.source === 'bankName' || rawKey === 'token:[Tại Ngân hàng]') return 'BANK_NAME';

  // 4. Bảng nghiệm thu tháng CTV (Dòng 1..5)
  const ctvMatch = title.match(/^dòng\s+([1-5])\s*·\s*(.+)$/i);
  if (ctvMatch) {
    const rNum = ctvMatch[1];
    const col = ctvMatch[2].trim().toLowerCase();
    if (col.includes('dạng video')) return `CTV_ROW_${rNum}_VIDEO_TYPE`;
    if (col.includes('ghi chú')) return `CTV_ROW_${rNum}_NOTE`;
    if (col.includes('nhãn hàng')) return `CTV_ROW_${rNum}_BRAND`;
    if (col.includes('link')) return `CTV_ROW_${rNum}_VIDEO_LINK`;
    if (col.includes('trạng thái')) return `CTV_ROW_${rNum}_STATUS`;
    if (col.includes('đơn giá') || col.includes('mức giá')) return `CTV_ROW_${rNum}_UNIT_PRICE`;
    if (col.includes('số lượng')) return `CTV_ROW_${rNum}_QUANTITY`;
    if (col.includes('thành tiền')) return `CTV_ROW_${rNum}_LINE_TOTAL`;
  }

  // 5. Nhóm Hạng mục công việc & Tài chính theo source
  if (f.source === 'brand') return 'BRAND_NAME';
  if (f.source === 'product') {
    if (title.includes('giỏ hàng')) return 'CART_LINK_PRODUCT';
    if (title.includes('livestream')) return 'LIVESTREAM_PRODUCT_NAME';
    return 'PRODUCT_NAME';
  }
  if (f.source === 'airDate') return 'AIR_DATE';
  if (f.source === 'unitPrice') return 'UNIT_PRICE';
  if (f.source === 'quantity') return 'QUANTITY';
  if (f.source === 'lineTotal') return f.group === 'MONEY' ? 'SUBTOTAL_BEFORE_VAT' : 'LINE_TOTAL';
  if (f.source === 'netTotal') {
    if (title.includes('phí dịch vụ phải thanh toán')) return 'PAYABLE_SERVICE_FEE';
    return 'NET_TOTAL';
  }
  if (f.source === 'pitAmount') return 'PIT_AMOUNT';
  if (f.source === 'vatAmount') return 'VAT_AMOUNT';
  if (f.source === 'grossTotal') return 'GROSS_TOTAL';
  if (f.source === 'advanceAmount') return 'ADVANCE_AMOUNT';
  if (f.source === 'adjustmentAmount') return 'ADJUSTMENT_AMOUNT';
  if (f.source === 'remainingAmount') return 'REMAINING_AMOUNT';
  if (f.source === 'amountInWords') return 'AMOUNT_IN_WORDS';

  // 6. Các trường chuyên biệt theo tiêu đề / ngữ cảnh
  if (title.includes('chức vụ')) return 'PARTY_B_POSITION';
  if (title.includes('số văn bản ủy quyền')) return 'PARTY_B_AUTH_NO';
  if (title.includes('ngày ủy quyền')) return 'PARTY_B_AUTH_DATE';
  if (title.includes('hạn tạm ứng')) return 'ADVANCE_DUE_DAYS';
  if (title.includes('hạn thanh toán')) return 'SETTLEMENT_DUE_DAYS';
  if (title.includes('hoa hồng organic')) return 'ORGANIC_COMMISSION_PCT';
  if (title.includes('hoa hồng chạy ads')) return 'ADS_COMMISSION_PCT';
  if (title.includes('hoa hồng affiliate')) return 'AFFILIATE_COMMISSION_PCT';
  if (title.includes('mã quảng cáo') || context.includes('mã code để chạy quảng cáo')) {
    if (title.includes('thành tiền') || title.includes('phí dịch vụ') || f.kind === 'money') return 'SPARK_ADS_FEE';
    return 'SPARK_ADS_DAYS';
  }
  if (title.includes('hạng mục quảng cáo') || title.includes('cấp mã code')) return 'SPARK_ADS_FEE';
  if (title.includes('hạng mục thương mại') || (title.includes('gắn giỏ hàng') && f.kind === 'money')) return 'CART_LINK_FEE';
  if (title.includes('sử dụng hình ảnh livestream')) return 'LIVESTREAM_IMAGE_USAGE_MONTHS';
  if (title.includes('bắt đầu sử dụng hình ảnh')) return 'IMAGE_USAGE_START_DATE';
  if (title.includes('sử dụng hình ảnh')) {
    if (title.includes('đơn giá')) return 'IMAGE_USAGE_UNIT_PRICE';
    if (title.includes('số lượng')) return 'IMAGE_USAGE_QUANTITY';
    if (title.includes('thành tiền') || title.includes('phí dịch vụ') || f.kind === 'money') return 'IMAGE_USAGE_FEE';
    return 'IMAGE_USAGE_DAYS';
  }
  if (title.includes('tham dự sự kiện')) {
    if (title.includes('số giờ')) return 'EVENT_HOURS';
    if (title.includes('ngày tham dự')) return 'EVENT_DATE';
    if (title.includes('đơn giá')) return 'EVENT_UNIT_PRICE';
    if (title.includes('số lượng')) return 'EVENT_QUANTITY';
    return 'EVENT_FEE';
  }
  if (title.includes('trang facebook') || title.includes('post trên facebook')) {
    if (title.includes('trang facebook')) return 'FACEBOOK_POST_PAGE';
    if (title.includes('đơn giá')) return 'FACEBOOK_POST_UNIT_PRICE';
    if (title.includes('số lượng')) return 'FACEBOOK_POST_QUANTITY';
    return 'FACEBOOK_POST_FEE';
  }
  if (title.includes('thời lượng video')) return 'VIDEO_DURATION_SEC';
  if (title.includes('vòng chỉnh sửa')) return 'MAX_REVISION_ROUNDS';
  if (title.includes('hoàn trả sản phẩm mẫu')) return 'SAMPLE_RETURN_DAYS';
  if (title.includes('nội dung cung cấp') || title.includes('post-only')) return 'PROVIDED_CONTENT';
  if (title.includes('định dạng file bàn giao') || title.includes('production-only')) return 'DELIVERY_FORMAT';
  if (title.includes('số lượng phiên bản cắt ngắn')) return 'CUTDOWN_VERSION_COUNT';
  if (title.includes('thời lượng từng phiên bản cắt ngắn')) return 'CUTDOWN_DURATION';
  if (title.includes('link video nghiệm thu') || context.includes('link video')) return 'VIDEO_LINK';
  if (title.includes('link kênh shopee')) return 'SHOPEE_CHANNEL_LINK';
  if (title.includes('link kênh facebook')) return 'FACEBOOK_CHANNEL_LINK';
  if (title.includes('link kênh instagram')) return 'INSTAGRAM_CHANNEL_LINK';
  if (title.includes('link kênh youtube')) return 'YOUTUBE_CHANNEL_LINK';
  if (title.includes('link kênh threads')) return 'THREADS_CHANNEL_LINK';
  if (title.includes('nền tảng livestream')) return 'LIVESTREAM_PLATFORM';
  if (title.includes('khung giờ livestream')) return 'LIVESTREAM_TIME_SLOT';
  if (title.includes('thời lượng lên hình tối thiểu')) return 'LIVESTREAM_DURATION_MIN';
  if (title.includes('điều khoản điều chỉnh') || title.includes('ngoại lệ áp dụng theo sow')) {
    return title.includes('(2)') ? 'SOW_CUSTOM_CLAUSE_2' : 'SOW_CUSTOM_CLAUSE_1';
  }

  // Fallback: chuẩn hóa chuỗi title sang SNAKE_CASE viết hoa giống chuẩn fieldKey của API
  const ascii = (f.title || f.label || rawKey)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 42);
  return ascii || `FIELD_P${f.paragraph}`;
}

export function normalizeTemplateFieldsToApiKeys(fields: ContractField[]): ContractField[] {
  const keyByLegacyKey = new Map<string, string>();
  const usedByDistinctPosition = new Map<string, string>();
  // Các khóa dùng chung ở nhiều vị trí trong cùng 1 tài liệu (ví dụ header + footer cùng điền số HĐ / mã KOC)
  const sharedRepeatableKeys = new Set([
    'CONTRACT_NO',
    'CONTRACT_DATE_CODE',
    'MASTER_CONTRACT_DATE',
    'PARENT_SOW_DATE',
    'BRAND_CODE',
    'KOC_CODE',
  ]);

  return fields.map(f => {
    const baseKey = toStandardApiFieldKey(f);
    let finalKey = keyByLegacyKey.get(f.key);
    if (!finalKey) {
      if (sharedRepeatableKeys.has(baseKey)) {
        finalKey = baseKey;
      } else {
        let candidate = baseKey;
        let suffix = 2;
        while (usedByDistinctPosition.has(candidate) && usedByDistinctPosition.get(candidate) !== f.key) {
          candidate = `${baseKey}_${suffix++}`;
        }
        finalKey = candidate;
        usedByDistinctPosition.set(finalKey, f.key);
      }
      keyByLegacyKey.set(f.key, finalKey);
    }

    const baseTitle = (f.title || f.label || finalKey).replace(/\s*\([A-Z0-9_]+\)\s*$/, '').trim();
    return {
      ...f,
      key: finalKey,
      label: `{{${finalKey}}}`,
      title: `${baseTitle} (${finalKey})`,
    };
  });
}

/**
 * Chuyển đổi 1 field từ API 2 (`getContractTemplate`) sang `ContractField` của giao diện B2C Portal.
 */
export function describeRemoteTemplateField(
  rf: ContractServiceTemplateField,
  index: number,
): ContractField {
  const key = rf.fieldKey.trim();
  const upper = key.toUpperCase();
  const dict = REMOTE_FIELD_DICTIONARY[upper];
  const rawType = (rf.fieldType || 'text').toLowerCase();

  const kind: FieldKind =
    dict?.kind ||
    (rawType === 'number'
      ? /PRICE|AMOUNT|TOTAL|FEE|COST|MONEY|TAX|VAT|PIT/i.test(upper)
        ? 'money'
        : 'number'
      : rawType === 'date'
        ? 'date'
        : /TERMS|DESCRIPTION|NOTE|ADDRESS/i.test(upper)
          ? 'long'
          : 'text');

  const group: FieldGroup =
    dict?.group ||
    (/CONTRACT_NO|CODE|APPENDIX_NO/i.test(upper)
      ? 'NUMBER'
      : /NOW_|SIGN_DAY|SIGN_MONTH|SIGN_YEAR|DOC_DATE/i.test(upper)
        ? 'DATE'
        : /PARTY_B|KOC|REPRESENTATIVE|CCCD|ID_NUMBER|ID_ISSUE|TAX_CODE|SOCIAL|CHANNEL|PHONE|EMAIL|ADDRESS/i.test(upper)
          ? 'PARTY'
          : /BANK|PAYMENT|AMOUNT|TOTAL|PRICE|FEE|VAT|PIT|TAX|MONEY/i.test(upper)
            ? 'MONEY'
            : /PRODUCT|SCOPE|VIDEO|LIVESTREAM|AIR_DATE|QUANTITY|DELIVERABLE/i.test(upper)
              ? 'SCOPE'
              : 'OTHER');

  const rawTitle =
    dict?.title ||
    key
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  const humanizedTitle = rawTitle.includes(`(${key})`) ? rawTitle : `${rawTitle} (${key})`;

  return {
    key,
    label: `{{${key}}}`,
    title: humanizedTitle,
    context: `${humanizedTitle} — {{${key}}}`,
    required: Boolean(rf.required),
    part: 'word/document.xml',
    paragraph: index + 1,
    group,
    kind,
    source: dict?.source,
  };
}

/**
 * Ánh xạ mã mẫu từ API 1 (`getContractTemplates`) sang mã định danh trên B2C Portal.
 * Giữ tương thích với cả mã chuẩn (`HDNT-CANHAN` <-> `IND-HDNT`) lẫn các mẫu mới tạo trên Contract Service.
 */
export function mapRemoteTemplateToB2cId(
  remote: { id: string; code: string; type?: string; object?: string },
  usedIds?: Set<string>,
): string {
  const code = (remote.code || '').trim().toUpperCase();
  const type = (remote.type || '').trim().toUpperCase();
  const object = (remote.object || '').trim().toUpperCase();

  const prefix = object === 'BUSINESS' ? 'HKD' : object === 'COMPANY' ? 'COM' : 'IND';
  let canonical = code;

  if (code === 'HDNT-CANHAN' || code === 'IND-HDNT') {
    canonical = 'IND-HDNT';
  } else if (code === 'HDNT-HKD' || code === 'HKD-HDNT') {
    canonical = 'HKD-HDNT';
  } else if (code === 'HDNT-CONGTY' || code === 'COM-HDNT') {
    canonical = 'COM-HDNT';
  } else if (/^(SOW|PL|APPENDIX)[-_]/i.test(code)) {
    canonical = `${prefix}-SOW`;
  } else if (/^BBNT[-_]LIVE/i.test(code)) {
    canonical = `${prefix}-LIVE-BBNT`;
  } else if (/^BBNT/i.test(code)) {
    canonical = `${prefix}-VID-BBNT`;
  } else if (/^(HDDV|HD[-_](CANHAN|HKD|CONGTY))$/i.test(code)) {
    canonical = `${prefix}-HD`;
  }

  if (usedIds && usedIds.has(canonical)) {
    return code || remote.id;
  }
  return canonical || code || remote.id;
}

/**
 * Xác định mã biểu mẫu chuẩn lưu trên hệ thống (`OFFICIAL_TEMPLATES_SNAPSHOT`) tương ứng với mẫu kéo từ API
 * để thực hiện đối chiếu sự thay đổi cấu trúc trường (`fieldKey`, `required`, `kind`).
 */
export function resolveBaselineSystemTemplateId(params: {
  b2cId?: string;
  code?: string;
  type?: string;
  object?: string;
}): string | undefined {
  const b2cId = (params.b2cId || '').trim().toUpperCase();
  if (b2cId && OFFICIAL_TEMPLATES_SNAPSHOT[b2cId]) {
    return b2cId;
  }
  const code = (params.code || '').trim().toUpperCase();
  if (code && OFFICIAL_TEMPLATES_SNAPSHOT[code]) {
    return code;
  }
  const type = (params.type || 'MASTER').trim().toUpperCase();
  const object = (params.object || 'INDIVIDUAL').trim().toUpperCase();
  const prefix = object === 'BUSINESS' ? 'HKD' : object === 'COMPANY' ? 'COM' : 'IND';

  const inferredId =
    type === 'MASTER'
      ? `${prefix}-HDNT`
      : type === 'APPENDIX'
        ? `${prefix}-SOW`
        : type === 'VIDEO_ACCEPTANCE'
          ? `${prefix}-VID-BBNT`
          : type === 'LIVESTREAM_ACCEPTANCE'
            ? `${prefix}-LIVE-BBNT`
            : `${prefix}-HD`;

  return OFFICIAL_TEMPLATES_SNAPSHOT[inferredId] ? inferredId : undefined;
}

/**
 * Đối chiếu biểu mẫu vừa kéo từ Contract Service API với biểu mẫu chuẩn đang lưu trên hệ thống
 * để phát hiện và cảnh báo khi danh sách trường (`fieldKey`) hoặc cấu hình trường có thay đổi.
 */
export function compareRemoteTemplateWithLocalBaseline(params: {
  remoteFields: ContractField[];
  b2cId?: string;
  remoteCode?: string;
  remoteVersion?: string;
  type?: string;
  object?: string;
  localBaseline?: LegalTemplate | null;
}): TemplateSchemaDiff {
  const checkedAt = new Date().toISOString();
  const baselineId =
    params.localBaseline?.id ||
    resolveBaselineSystemTemplateId({
      b2cId: params.b2cId,
      code: params.remoteCode,
      type: params.type,
      object: params.object,
    });
  const baselineTpl =
    params.localBaseline && params.localBaseline.fields && params.localBaseline.fields.length > 0
      ? params.localBaseline
      : baselineId
        ? OFFICIAL_TEMPLATES_SNAPSHOT[baselineId]
        : undefined;

  const normalizedRemote = normalizeTemplateFieldsToApiKeys(params.remoteFields || []);
  const remoteMap = new Map<string, ContractField>();
  for (const f of normalizedRemote) {
    if (!remoteMap.has(f.key)) remoteMap.set(f.key, f);
  }

  if (!baselineTpl) {
    const addedFields = [...remoteMap.values()].map(f => ({
      key: f.key,
      title: f.title || f.label || f.key,
      required: Boolean(f.required),
      kind: f.kind,
    }));
    return {
      hasChanges: true,
      remoteVersion: params.remoteVersion,
      checkedAt,
      addedFields,
      removedFields: [],
      changedFields: [],
      matchedFieldKeys: [],
      summaryText: `Biểu mẫu mới trên API (${params.remoteCode || params.b2cId || 'Mới'}) chưa có bản lưu đối chiếu trên hệ thống (${addedFields.length} trường).`,
    };
  }

  const normalizedBaseline = normalizeTemplateFieldsToApiKeys(baselineTpl.fields || []);
  const baselineMap = new Map<string, ContractField>();
  for (const f of normalizedBaseline) {
    if (!baselineMap.has(f.key)) baselineMap.set(f.key, f);
  }

  const addedFields: TemplateSchemaDiff['addedFields'] = [];
  const removedFields: TemplateSchemaDiff['removedFields'] = [];
  const changedFields: TemplateSchemaDiff['changedFields'] = [];
  const matchedFieldKeys: string[] = [];

  for (const [key, rf] of remoteMap.entries()) {
    const bf = baselineMap.get(key);
    if (!bf) {
      addedFields.push({
        key,
        title: rf.title || rf.label || key,
        required: Boolean(rf.required),
        kind: rf.kind,
      });
      continue;
    }

    const changes: string[] = [];
    if (Boolean(rf.required) !== Boolean(bf.required)) {
      changes.push(
        rf.required ? 'Đổi từ Tùy chọn → Bắt buộc' : 'Đổi từ Bắt buộc → Tùy chọn',
      );
    }
    const rKind = rf.kind || 'text';
    const bKind = bf.kind || 'text';
    const isCompatibleTextLong =
      (rKind === 'text' && bKind === 'long') || (rKind === 'long' && bKind === 'text');
    const isCompatibleMoneyNumber =
      (rKind === 'money' && bKind === 'number') || (rKind === 'number' && bKind === 'money');
    if (rKind !== bKind && !isCompatibleTextLong && !isCompatibleMoneyNumber) {
      changes.push(`Đổi kiểu dữ liệu (${bKind} → ${rKind})`);
    }

    if (changes.length > 0) {
      changedFields.push({
        key,
        title: rf.title || bf.title || key,
        changeSummary: changes.join(' · '),
      });
    } else {
      matchedFieldKeys.push(key);
    }
  }

  for (const [key, bf] of baselineMap.entries()) {
    if (!remoteMap.has(key)) {
      removedFields.push({
        key,
        title: bf.title || bf.label || key,
        required: Boolean(bf.required),
        kind: bf.kind,
      });
    }
  }

  const hasChanges =
    addedFields.length > 0 || removedFields.length > 0 || changedFields.length > 0;

  const parts: string[] = [];
  if (addedFields.length > 0) parts.push(`+${addedFields.length} trường mới trên API`);
  if (removedFields.length > 0) parts.push(`-${removedFields.length} trường hệ thống không có trên API`);
  if (changedFields.length > 0) parts.push(`${changedFields.length} trường đổi cấu hình`);

  const summaryText = hasChanges
    ? `Form API (${params.remoteCode || params.b2cId}) có thay đổi so với mẫu lưu trên hệ thống (${baselineTpl.id} · ${baselineTpl.version}): ${parts.join(', ')}.`
    : `Khớp 100% danh sách trường (${matchedFieldKeys.length} trường) với mẫu lưu trên hệ thống (${baselineTpl.id}).`;

  return {
    hasChanges,
    baselineTemplateId: baselineTpl.id,
    baselineTemplateName: baselineTpl.name,
    baselineVersion: baselineTpl.version,
    remoteVersion: params.remoteVersion,
    checkedAt,
    addedFields,
    removedFields,
    changedFields,
    matchedFieldKeys,
    summaryText,
  };
}

/**
 * Chuyển đổi trực tiếp dữ liệu mẫu lấy từ API 1 (`getContractTemplates`) & API 2 (`getContractTemplate`)
 * thành đối tượng `LegalTemplate` để `web-admin` hiển thị và vận hành mà không cần lưu sẵn file `.docx` cục bộ.
 */
export function convertRemoteTemplateToLegalTemplate(
  summary: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    status?: string;
    type?: string;
    object?: string;
    hasSigningFlowConfig?: boolean;
    createdAt?: number | null;
    updatedAt?: number | null;
  },
  detail?: {
    id?: string;
    code?: string;
    name?: string;
    status?: string;
    type?: string;
    object?: string;
    hasSigningFlowConfig?: boolean;
    fields?: ContractServiceTemplateField[];
    participants?: ContractServiceTemplateParticipant[];
    documents?: Array<{
      documentType: string;
      fileUrl: string;
      status: string;
      version: number;
    }>;
  } | null,
  preferredB2cId?: string,
  localBaseline?: LegalTemplate | null,
): LegalTemplate {
  const type = (detail?.type || summary.type || 'MASTER').toUpperCase();
  const object = (detail?.object || summary.object || 'INDIVIDUAL').toUpperCase();
  const b2cId = preferredB2cId || mapRemoteTemplateToB2cId({ id: summary.id, code: summary.code, type, object });

  const subject =
    object === 'BUSINESS'
      ? 'Hộ kinh doanh'
      : object === 'COMPANY'
        ? 'Công ty'
        : 'Cá nhân';

  const kind: 'CONTRACT' | 'ACCEPTANCE' =
    type === 'VIDEO_ACCEPTANCE' || type === 'LIVESTREAM_ACCEPTANCE' || b2cId.endsWith('-BBNT')
      ? 'ACCEPTANCE'
      : 'CONTRACT';

  const category: ContractCategory =
    kind === 'ACCEPTANCE'
      ? 'ACCEPTANCE_SETTLEMENT'
      : type === 'APPENDIX' || b2cId.includes('LIVE')
        ? 'LIVESTREAM_APPENDIX'
        : 'BOOKING_VIDEO';

  const remoteFields =
    detail?.fields && detail.fields.length > 0
      ? detail.fields
      : DEFAULT_HDNT_CANHAN_FIELDS;

  const remoteParticipants =
    detail?.participants && detail.participants.length > 0
      ? detail.participants
      : DEFAULT_HDNT_CANHAN_PARTICIPANTS;

  const fields = remoteFields.map((rf, idx) => describeRemoteTemplateField(rf, idx));
  const sourceDoc = detail?.documents?.find(d => d.documentType === 'source');
  const previewDoc = detail?.documents?.find(d => d.documentType === 'preview');
  const docVersionNum = sourceDoc?.version || previewDoc?.version || 1;
  const versionLabel = `v${docVersionNum} (${summary.code})`;

  const deterministicHash = (() => {
    const seed = `contract-service:${summary.id}:${summary.code}:v${docVersionNum}:${remoteFields.map(f => f.fieldKey).join(',')}`;
    let h1 = 0xdeadbeef ^ seed.length;
    let h2 = 0x41c6ce57 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      const ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hexPart = ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
    return hexPart.repeat(4).slice(0, 64);
  })();

  const signTags =
    remoteParticipants.length > 0
      ? remoteParticipants.map(p => (p.code.startsWith('{{') ? p.code : `{{${p.code}}}`))
      : [...DEFAULT_SIGN_TAGS];

  const paragraphs: string[] = [
    (detail?.name || summary.name || 'HỢP ĐỒNG').toUpperCase(),
    `Mã biểu mẫu Contract Service: ${summary.code} (UUID: ${summary.id})`,
    ...fields.map(f => `${f.title || f.key}: {{${f.key}}}`),
    `Đại diện Bên A: ${signTags[0] || '{{SIGN_PROVIDER}}'} | Đại diện Bên B: ${signTags[1] || '{{SIGN_CLIENT}}'}`,
  ];

  const blocks: DocBlock[] = paragraphs.map((text, idx) => ({
    kind: 'p' as const,
    part: 'word/document.xml',
    paragraph: idx,
    text,
    bold: idx === 0,
    align: idx === 0 ? ('center' as const) : ('left' as const),
  }));

  const updatedIso =
    typeof summary.updatedAt === 'number' && summary.updatedAt > 0
      ? new Date(summary.updatedAt > 1e12 ? summary.updatedAt : summary.updatedAt * 1000).toISOString()
      : new Date().toISOString();

  return {
    id: b2cId,
    name: detail?.name || summary.name,
    filename: `${summary.code}.docx`,
    subject,
    kind,
    category,
    version: versionLabel,
    hash: deterministicHash,
    fields,
    paragraphs,
    blocks,
    description:
      summary.description ||
      `Biểu mẫu lấy trực tiếp từ Contract Service (${summary.code} · Đối tượng: ${subject}).`,
    active: (detail?.status || summary.status || 'active') === 'active',
    defaultReviewRoles: kind === 'ACCEPTANCE' ? ['FINANCE'] : ['FINANCE', 'LEAD'],
    exemptLegalReview: true,
    scope: 'GLOBAL',
    updatedAt: updatedIso,
    updatedBy: 'Contract Service (API)',
    fieldCount: fields.length,
    requiredFieldCount: fields.filter(f => f.required).length,
    history: [
      {
        version: versionLabel,
        hash: deterministicHash,
        filename: `${summary.code}.docx`,
        updatedAt: updatedIso,
        updatedBy: 'Contract Service',
        note: previewDoc?.fileUrl
          ? `Đồng bộ trực tiếp từ Contract Service (Google Docs Preview: ${previewDoc.fileUrl})`
          : 'Đồng bộ trực tiếp từ Contract Service (API 1 & API 2)',
      },
    ],
    remoteTemplateId: summary.id,
    remoteTemplateCode: summary.code,
    contractType: (['MASTER', 'SERVICE', 'APPENDIX', 'LIVESTREAM_ACCEPTANCE', 'VIDEO_ACCEPTANCE'].includes(type)
      ? type
      : 'SERVICE') as ContractServiceTemplateType,
    contractObject: (['INDIVIDUAL', 'BUSINESS', 'COMPANY'].includes(object)
      ? object
      : 'INDIVIDUAL') as ContractServiceTemplateObject,
    hasSigningFlowConfig: detail?.hasSigningFlowConfig ?? summary.hasSigningFlowConfig ?? true,
    remoteFields,
    remoteParticipants,
    sourceFileUrl: sourceDoc?.fileUrl,
    previewFileUrl: previewDoc?.fileUrl,
    signTags,
    signingFlowConfig: {
      mode: 'SEQUENTIAL',
      deadlineDays: 15,
      signers: remoteParticipants
        .filter(p => !p.action || p.action === 'sign')
        .sort((a, b) => (a.signingOrder ?? 99) - (b.signingOrder ?? 99))
        .map((p, idx) => ({
          order: p.signingOrder || idx + 1,
          role:
            /PROVIDER|BEN_A/i.test(p.code)
              ? 'Đại diện Bên A (UpBase)'
              : `Đại diện Bên B (${subject})`,
          signTag: p.code.startsWith('{{') ? p.code : `{{${p.code}}}`,
        })),
    },
    schemaDiff: compareRemoteTemplateWithLocalBaseline({
      remoteFields: fields,
      b2cId,
      remoteCode: summary.code,
      remoteVersion: versionLabel,
      type,
      object,
      localBaseline,
    }),
  };
}

/** Bóc tách chuỗi CCCD gộp (ví dụ "079123456789 cấp ngày 01/01/2021 tại Cục Cảnh sát...") thành 3 trường độc lập. */
export function parseCompositeIdField(
  rawCccd: string,
  values: Record<string, string>,
): { idNumber: string; issueDate: string; issuePlace: string } {
  const explicitNumber =
    values['PARTY_B_ID_NUMBER']?.trim() ||
    values['src:cccdNumber']?.trim() ||
    values['src:taxCode']?.trim() ||
    '';
  const explicitDate =
    values['PARTY_B_ID_ISSUE_DATE']?.trim() ||
    values['src:cccdIssueDate']?.trim() ||
    values['token:[Ngày cấp CCCD]']?.trim() ||
    '';
  const explicitPlace =
    values['PARTY_B_ID_ISSUE_PLACE']?.trim() ||
    values['src:cccdIssuePlace']?.trim() ||
    values['token:[Nơi cấp CCCD]']?.trim() ||
    '';

  const trimmed = (rawCccd || '').trim();
  const dateMatch = trimmed.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/);
  const placeMatch = trimmed.match(/(?:tại|nơi cấp[:\s]*)\s*([^,;.\n]+)/i);
  const digitsMatch = trimmed.match(/\b(\d{9,14})\b/);

  let idNumber = explicitNumber;
  if (!idNumber) {
    if (digitsMatch) {
      idNumber = digitsMatch[1];
    } else {
      idNumber = trimmed
        .split(/cấp\s+ngày|ngày\s+cấp|tại/i)[0]
        .replace(/^(số\s*:?\s*)/i, '')
        .trim();
    }
  }

  const issueDate = explicitDate || (dateMatch ? dateMatch[1].replace(/[.-]/g, '/') : '') || '01/01/2022';
  const issuePlace = explicitPlace || (placeMatch ? placeMatch[1].trim() : '') || 'Cục Cảnh sát QLHC về TTXH';

  return {
    idNumber: idNumber || trimmed || '000000000000',
    issueDate,
    issuePlace,
  };
}

/** Định dạng giá trị theo `fieldType` của Contract Service (`text`, `number`, `date`, `checkbox`, `select`). */
export function formatContractServiceFieldValue(
  rawValue: string,
  fieldType: string,
): string {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';

  const normalizedType = (fieldType || 'text').toLowerCase();
  if (normalizedType === 'number') {
    const cleanNum = trimmed.replace(/[.,\s]/g, '').replace(/[^\d-]/g, '');
    return cleanNum || '0';
  }
  if (normalizedType === 'date') {
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (dmyMatch) {
      const dd = dmyMatch[1].padStart(2, '0');
      const mm = dmyMatch[2].padStart(2, '0');
      const yyyy = dmyMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return trimmed;
  }
  if (normalizedType === 'checkbox') {
    const lower = trimmed.toLowerCase();
    if (['true', '1', 'yes', 'có', 'co'].includes(lower)) return 'true';
    if (['false', '0', 'no', 'không', 'khong'].includes(lower)) return 'false';
    return 'true';
  }
  return trimmed;
}

/**
 * Chuyển đổi danh sách giá trị đã điền trên B2C Portal sang bảng biến tổng hợp `Record<string, string>`.
 */
export function mapRecordValuesToTemplateVariables(
  record: Pick<
    ContractRecord,
    'title' | 'brand' | 'partner' | 'templateId' | 'parentId' | 'dealCode' | 'kocId' | 'values' | 'acceptanceScreenshots'
  >,
  template?: LegalTemplate,
): Record<string, string> {
  const docStage = resolveContractDocStage(record.templateId || template?.id, template?.kind);
  const contractCode = buildStableContractCode(record);
  const parentCode =
    record.values?.['token:[Số Phụ lục]'] ||
    record.values?.['token:[Số HĐNT]'] ||
    record.values?.['token:[Số Hợp đồng]'] ||
    record.parentId ||
    '';

  const bySource: Partial<Record<FieldSource, string>> = {};
  if (template?.fields) {
    for (const field of template.fields) {
      const rawVal = record.values?.[field.key]?.trim();
      if (!rawVal) continue;
      if (field.source && !bySource[field.source]) {
        bySource[field.source] = rawVal;
      }
    }
  }

  const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
  const defaultDay = String(nowVn.getUTCDate()).padStart(2, '0');
  const defaultMonth = String(nowVn.getUTCMonth() + 1).padStart(2, '0');
  const defaultYear = String(nowVn.getUTCFullYear());

  const rawSignDay = record.values?.['NOW_DAY']?.trim() || bySource.signDay || defaultDay;
  const rawSignMonth = record.values?.['NOW_MONTH']?.trim() || bySource.signMonth || defaultMonth;
  const rawSignYear = record.values?.['NOW_YEAR']?.trim() || bySource.signYearDigit || defaultYear;
  const normalizedYear =
    /^\d$/.test(rawSignYear)
      ? `202${rawSignYear}`
      : /^\d{2}$/.test(rawSignYear)
        ? `20${rawSignYear}`
        : /^\d{4}$/.test(rawSignYear)
          ? rawSignYear
          : defaultYear;

  const rawCccd =
    bySource.cccd ||
    record.values?.['src:cccd'] ||
    record.values?.['PARTY_B_ID_NUMBER'] ||
    '';
  const parsedId = parseCompositeIdField(rawCccd, record.values || {});

  const partyBName =
    record.values?.['PARTY_B_NAME']?.trim() ||
    bySource.partyName ||
    bySource.ownerName ||
    record.partner ||
    'Đối tác KOC';

  const partyBPhone =
    record.values?.['PARTY_B_PHONE']?.trim() ||
    bySource.phone ||
    record.values?.['src:phone']?.trim() ||
    '0900000000';

  const partyBEmail =
    record.values?.['PARTY_B_EMAIL']?.trim() ||
    bySource.email ||
    record.values?.['src:email']?.trim() ||
    record.values?.['partnerEmail']?.trim() ||
    'partner@booking.upbase.vn';

  const partyBAddress =
    record.values?.['PARTY_B_ADDRESS']?.trim() ||
    bySource.address ||
    record.values?.['src:address']?.trim() ||
    'Việt Nam';

  const bankAccountName =
    record.values?.['BANK_ACCOUNT_NAME']?.trim() ||
    record.values?.['token:[Tên chủ tài khoản]']?.trim() ||
    bySource.bankAccountName ||
    record.values?.['src:bankAccountName']?.trim() ||
    partyBName.toUpperCase();

  const bankAccountNumber =
    record.values?.['BANK_ACCOUNT_NUMBER']?.trim() ||
    record.values?.['token:[Số tài khoản]']?.trim() ||
    bySource.bankAccountNumber ||
    record.values?.['src:bankAccountNumber']?.trim() ||
    '0000000000';

  const bankName =
    record.values?.['BANK_NAME']?.trim() ||
    record.values?.['token:[Tại Ngân hàng]']?.trim() ||
    bySource.bankName ||
    record.values?.['src:bankName']?.trim() ||
    'Ngân hàng thương mại tại Việt Nam';

  const socialLink =
    record.values?.['SOCIAL_ACCOUNT_LINK']?.trim() ||
    bySource.channelLink ||
    record.values?.['src:channelLink']?.trim() ||
    'https://www.tiktok.com/';

  const paymentMethod = record.values?.['PAYMENT_METHOD']?.trim() || 'Chuyển khoản';
  const advanceVal = bySource.advanceAmount?.trim();
  const paymentTerms =
    record.values?.['PAYMENT_TERMS']?.trim() ||
    (advanceVal
      ? `Tạm ứng ${advanceVal} và thanh toán phần còn lại sau khi ký Biên bản nghiệm thu`
      : 'Thanh toán trong vòng 7 ngày làm việc kể từ ngày nghiệm thu');

  const vars: Record<string, string> = {
    // 17 field chuẩn của Contract Service (HDNT-CANHAN)
    CONTRACT_NO: record.values?.['CONTRACT_NO']?.trim() || contractCode,
    NOW_DAY: rawSignDay,
    NOW_MONTH: rawSignMonth,
    NOW_YEAR: normalizedYear,
    PARTY_B_NAME: partyBName,
    PARTY_B_PHONE: partyBPhone,
    PARTY_B_EMAIL: partyBEmail,
    PARTY_B_ADDRESS: partyBAddress,
    PARTY_B_ID_NUMBER: parsedId.idNumber,
    PARTY_B_ID_ISSUE_DATE: parsedId.issueDate,
    PARTY_B_ID_ISSUE_PLACE: parsedId.issuePlace,
    BANK_ACCOUNT_NAME: bankAccountName,
    BANK_ACCOUNT_NUMBER: bankAccountNumber,
    BANK_NAME: bankName,
    PAYMENT_METHOD: paymentMethod,
    PAYMENT_TERMS: paymentTerms,
    SOCIAL_ACCOUNT_LINK: socialLink,

    // Các biến ngữ cảnh bổ trợ cho SOW / BBNT / nội bộ
    CONTRACT_TITLE: record.title,
    BRAND_NAME: record.brand,
    PARTNER_NAME: record.partner,
    DEAL_CODE: record.dealCode || '',
    KOC_ID: record.kocId || '',
    DOCUMENT_STAGE: docStage,
    PARENT_CONTRACT_ID: record.parentId || '',
    PARENT_CONTRACT_CODE: parentCode,
  };

  for (const [key, val] of Object.entries(record.values || {})) {
    const trimmed = (val || '').trim();
    if (!trimmed) continue;
    if (key === 'meta:sowTasksJson' || key === '__meta:sowTasksJson') {
      try {
        const parsed = JSON.parse(trimmed) as {
          videoFeeNetVnd?: number;
          addons?: Array<{ termLabel?: string; allocatedCostVnd?: number; acceptanceStatus?: string; includedInSow?: boolean }>;
        };
        if (typeof parsed.videoFeeNetVnd === 'number') {
          vars.SOW_VIDEO_FEE_NET = String(parsed.videoFeeNetVnd);
        }
        if (Array.isArray(parsed.addons)) {
          const activeAddons = parsed.addons.filter(a => a.includedInSow !== false);
          vars.SOW_TASK_COUNT = String(1 + activeAddons.length);
          vars.SOW_ADDON_SUMMARY = activeAddons.map(a => a.termLabel || '').filter(Boolean).join('; ');
        }
      } catch {
        // Bỏ qua nếu JSON meta không hợp lệ
      }
      continue;
    }
    if (key.startsWith('token:[')) {
      const inner = key.slice('token:['.length, -1).trim();
      const normalizedKey = inner
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase();
      if (normalizedKey && !vars[normalizedKey]) vars[normalizedKey] = trimmed;
    }
    if (!vars[key]) {
      vars[key] = trimmed;
    }
  }

  if (Array.isArray(record.acceptanceScreenshots) && record.acceptanceScreenshots.length > 0) {
    vars.BBNT_SCREENSHOT_COUNT = String(record.acceptanceScreenshots.length);
    vars.BBNT_AIR_URLS = Array.from(
      new Set(record.acceptanceScreenshots.map(s => s.videoUrl).filter(Boolean)),
    ).join(', ');
  }

  if (template?.fields) {
    for (const field of template.fields) {
      const rawVal = record.values?.[field.key]?.trim();
      if (!rawVal) continue;
      if (field.source) {
        const sourceKey = field.source
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          .toUpperCase();
        if (!vars[sourceKey]) vars[sourceKey] = rawVal;
      }
    }
  }

  const sowJobsJson = record.values?.['meta:sowJobsJson']?.trim();
  if (sowJobsJson) {
    vars.SOW_JOBS_JSON = sowJobsJson;
    try {
      const parsedJobs = JSON.parse(sowJobsJson);
      if (Array.isArray(parsedJobs) && parsedJobs.length > 0) {
        vars.SOW_JOB_COUNT = String(parsedJobs.length);
        vars.SOW_TABLES_SUMMARY = parsedJobs
          .map(
            (j: { jobCode?: string; productName?: string; videoFeeNetVnd?: number }, idx: number) =>
              `Bảng công việc #${idx + 1} (${j.jobCode || `J0${idx + 1}`}): ${j.productName || 'Sản phẩm'} — ${Number(j.videoFeeNetVnd || 0).toLocaleString('vi-VN')}đ`,
          )
          .join(' | ');
      }
    } catch {
      // ignore invalid json
    }
  }

  return vars;
}

/**
 * Xây dựng mảng `payload: [{ fieldKey, value }]` gửi cho mutation `generateContract`.
 * Tuân thủ nghiêm ngặt quy tắc của Contract Service:
 * - Chỉ truyền các `fieldKey` có trong `remoteFields` của mẫu (tránh lỗi 400 do key lạ).
 * - Đảm bảo 100% các field `required = true` đều có chuỗi giá trị không rỗng.
 */
export function buildContractServicePayload(params: {
  record: Pick<
    ContractRecord,
    'title' | 'brand' | 'partner' | 'templateId' | 'parentId' | 'dealCode' | 'kocId' | 'values' | 'acceptanceScreenshots'
  >;
  template?: LegalTemplate;
  remoteFields?: ContractServiceTemplateField[];
  contractCode?: string;
}): Array<{ fieldKey: string; value: string }> {
  const { record, template, remoteFields, contractCode } = params;
  const vars = mapRecordValuesToTemplateVariables(record, template);
  if (contractCode) {
    vars.CONTRACT_NO = record.values?.['CONTRACT_NO']?.trim() || contractCode;
  }

  const effectiveFields =
    remoteFields && remoteFields.length > 0
      ? remoteFields
      : template?.remoteFields && template.remoteFields.length > 0
        ? template.remoteFields
        : DEFAULT_HDNT_CANHAN_FIELDS;

  const payload: Array<{ fieldKey: string; value: string }> = [];
  for (const field of effectiveFields) {
    const rawCandidate = vars[field.fieldKey] ?? record.values?.[field.fieldKey] ?? '';
    let formatted = formatContractServiceFieldValue(rawCandidate, field.fieldType);

    if (!formatted && field.required) {
      if (field.fieldType === 'number') formatted = '0';
      else if (field.fieldType === 'date') formatted = new Date().toISOString().slice(0, 10);
      else if (field.fieldType === 'checkbox') formatted = 'false';
      else formatted = 'Đang cập nhật';
    }

    if (formatted || field.required) {
      payload.push({
        fieldKey: field.fieldKey,
        value: String(formatted),
      });
    }
  }

  return payload;
}

/**
 * Xây dựng `identityPayload` và `participants` cho mutation `requestSign` theo cấu hình `participants` của mẫu trên Contract Service.
 */
export function buildRequestSignPayload(params: {
  record: Pick<ContractRecord, 'partner' | 'values'>;
  remoteParticipants?: ContractServiceTemplateParticipant[];
  partyAName?: string;
  partyAEmail?: string;
  partyBName?: string;
  partyBEmail?: string;
}): {
  identityPayload: Array<{ fieldKey: string; value: string }>;
  participants: Array<{ code: string; name: string; email: string; phone?: string; role?: string }>;
} {
  const { record, remoteParticipants } = params;
  const providerName = params.partyAName?.trim() || 'Công ty TNHH UpBase';
  const providerEmail = params.partyAEmail?.trim() || 'legal@upbase.vn';
  const clientName =
    params.partyBName?.trim() ||
    record.values?.['PARTY_B_NAME']?.trim() ||
    record.partner ||
    'Đối tác KOC';
  const clientEmail =
    params.partyBEmail?.trim() ||
    record.values?.['PARTY_B_EMAIL']?.trim() ||
    record.values?.['src:email']?.trim() ||
    record.values?.['partnerEmail']?.trim() ||
    record.values?.['word/document.xml:p54:cell']?.trim() ||
    record.values?.['word/document.xml:p48:cell']?.trim() ||
    'partner@booking.upbase.vn';

  const identityMap = new Map<string, string>([
    ['NAME_SIGN_PROVIDER', providerName],
    ['EMAIL_SIGN_PROVIDER', providerEmail],
    ['NAME_SIGN_CLIENT', clientName],
    ['EMAIL_SIGN_CLIENT', clientEmail],
  ]);

  const effectiveParticipants =
    remoteParticipants && remoteParticipants.length > 0
      ? remoteParticipants
      : DEFAULT_HDNT_CANHAN_PARTICIPANTS;

  const extractPlaceholderKey = (raw?: string | null): string | null => {
    if (!raw) return null;
    const match = raw.trim().match(/^\{\{\s*([A-Za-z0-9_]+)\s*\}\}$/);
    return match ? match[1] : null;
  };

  const participantsOut: Array<{ code: string; name: string; email: string; phone?: string; role?: string }> = [];

  effectiveParticipants.forEach((p, idx) => {
    const isProvider =
      /PROVIDER|BEN_A|PARTY_A|UPBASE/i.test(p.code) ||
      (p.signingOrder === 1 && idx === 0 && !/CLIENT|BEN_B|PARTY_B/i.test(p.code));

    const resolvedName = isProvider ? providerName : clientName;
    const resolvedEmail = isProvider ? providerEmail : clientEmail;

    const namePlaceholder = extractPlaceholderKey(p.name);
    if (namePlaceholder) {
      identityMap.set(namePlaceholder, resolvedName);
    }
    const emailPlaceholder = extractPlaceholderKey(p.email);
    if (emailPlaceholder) {
      identityMap.set(emailPlaceholder, resolvedEmail);
    }

    participantsOut.push({
      code: p.code,
      name: namePlaceholder ? resolvedName : p.name || resolvedName,
      email: emailPlaceholder ? resolvedEmail : p.email || resolvedEmail,
      ...(p.role ? { role: p.role } : {}),
    });
  });

  return {
    identityPayload: Array.from(identityMap.entries()).map(([fieldKey, value]) => ({
      fieldKey,
      value,
    })),
    participants: participantsOut,
  };
}

/**
 * Kiểm tra điều kiện chuyển trạng thái ký theo nguyên tắc chỉ tiến (Forward-only)
 * và so sánh timestamp để sự kiện webhook cũ đến muộn không kéo lùi trạng thái.
 */
export function canAdvanceSigningStatus(params: {
  currentStatus?: string;
  nextStatus: string;
  lastWebhookTimestamp?: number;
  incomingTimestamp?: number;
}): { allowed: boolean; reason?: string; isDuplicateCompleted?: boolean } {
  const { currentStatus, nextStatus, lastWebhookTimestamp, incomingTimestamp } = params;

  if (
    typeof lastWebhookTimestamp === 'number' &&
    typeof incomingTimestamp === 'number' &&
    incomingTimestamp > 0 &&
    incomingTimestamp < lastWebhookTimestamp
  ) {
    return {
      allowed: false,
      reason: `Bỏ qua sự kiện cũ (timestamp ${incomingTimestamp} < ${lastWebhookTimestamp}).`,
    };
  }

  const normalizedCurrent = currentStatus ? normalizeContractServiceStatus(currentStatus) : undefined;
  const normalizedNext = normalizeContractServiceStatus(nextStatus);

  if (!normalizedCurrent) {
    return { allowed: true };
  }

  if (normalizedCurrent === 'COMPLETED' && normalizedNext === 'COMPLETED') {
    return {
      allowed: false,
      isDuplicateCompleted: true,
      reason: 'Hồ sơ đã ở trạng thái COMPLETED, bỏ qua sự kiện lặp để tránh nhân bản job tải file.',
    };
  }

  // Khi đã ở trạng thái kết thúc (COMPLETED / REJECTED / CANCELLED / FAILED), không lùi về WAITING / PARTIAL
  const currentRank = SIGNING_STATUS_RANK[normalizedCurrent] ?? 0;
  const nextRank = SIGNING_STATUS_RANK[normalizedNext] ?? 0;

  if (currentRank >= 3 && nextRank < 3) {
    return {
      allowed: false,
      reason: `Không cho phép lùi trạng thái từ ${normalizedCurrent} về ${normalizedNext}.`,
    };
  }

  if (nextRank < currentRank) {
    return {
      allowed: false,
      reason: `Trạng thái ${normalizedNext} thấp hơn trạng thái hiện tại ${normalizedCurrent}.`,
    };
  }

  return { allowed: true };
}

/**
 * Tạo metadata `contractSystem` mặc định khi gọi `generateContract` ở chế độ độc lập / dự phòng.
 */
export function createStandaloneContractSystemMeta(
  record: ContractRecord,
  template?: LegalTemplate,
  parentContractCode?: string,
): ContractSystemSyncMeta {
  const now = new Date().toISOString();
  const contractCode = record.contractSystem?.contractCode || buildStableContractCode(record);
  const contractSystemId = record.contractSystem?.contractSystemId || `cs-${record.id.slice(0, 12)}`;
  const googleDocsId = record.contractSystem?.googleDocsId || `gdoc-${record.id.slice(0, 8)}-v${record.version}`;
  const enrichedTpl = template ? enrichTemplateWithSignFlow(template) : undefined;
  const documentStage = resolveContractDocStage(record.templateId, template?.kind);
  const resolvedParentCode =
    parentContractCode ||
    record.contractSystem?.parentContractCode ||
    record.values?.['token:[Số Phụ lục]'] ||
    record.values?.['token:[Số HĐNT]'] ||
    undefined;

  return {
    contractCode,
    contractSystemId,
    remoteTemplateId: enrichedTpl?.remoteTemplateId || DEFAULT_HDNT_CANHAN_TEMPLATE_ID,
    remoteStatus: 'ready',
    documentStage,
    parentContractCode: resolvedParentCode,
    googleDocsId,
    googleDocsUrl: `https://docs.google.com/document/d/${googleDocsId}/edit`,
    googleDocsSyncedAt: now,
    exportedDocxUrl: `/api/contracts/${record.id}/document?version=${record.version}`,
    signingFileUrl: `/api/contracts/${record.id}/document?version=${record.version}`,
    signedFileStatus: record.contractSystem?.signedFileStatus || 'IDLE',
    signedFileUrl: record.contractSystem?.signedFileUrl,
    templateSnapshot: {
      templateId: record.templateId,
      version: template?.version || `v${record.version}`,
      hash: record.templateHash,
      signTags: enrichedTpl?.signTags || [...DEFAULT_SIGN_TAGS],
      capturedAt: record.contractSystem?.templateSnapshot?.capturedAt || now,
    },
    lastSyncedAt: now,
    lastWebhookTimestamp: record.contractSystem?.lastWebhookTimestamp,
  };
}

/**
 * Tạo lượt trình ký (`SigningAttempt`) khi gọi `requestSign` qua `contract-system` ở chế độ dự phòng.
 */
export function createStandaloneRequestSignAttempt(
  record: ContractRecord,
  actorId: string,
  evidenceHash: string,
  customSigners?: { partyAEmail?: string; partyBEmail?: string },
): SigningAttempt {
  const now = new Date().toISOString();
  const contractCode = record.contractSystem?.contractCode || buildStableContractCode(record);
  const partyAEmail = customSigners?.partyAEmail?.trim() || 'legal@upbase.vn';
  const partyBEmail =
    customSigners?.partyBEmail?.trim() ||
    record.values['PARTY_B_EMAIL']?.trim() ||
    record.values['src:email']?.trim() ||
    record.values['token:[ĐIỀN EMAIL]']?.trim() ||
    record.values['token:[EMAIL]']?.trim() ||
    record.values['partnerEmail']?.trim() ||
    record.values['word/document.xml:p54:cell']?.trim() ||
    record.values['word/document.xml:p48:cell']?.trim() ||
    '';

  const safeUuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    documentId: safeUuid,
    name: `${contractCode} · ${record.title}`,
    version: record.version,
    linkedBy: actorId,
    linkedAt: now,
    syncedAt: now,
    provider: 'CONTRACT_SYSTEM',
    contractCode,
    status: 'WAITING',
    sourceStatus: 1,
    completedCount: 0,
    totalCount: 2,
    progressPercent: 0,
    currentSignerName: 'Công ty TNHH UpBase',
    currentSignerEmail: partyAEmail,
    evidenceConfirmedBy: actorId,
    evidenceHash,
    signedFileStatus: 'IDLE',
    lastWebhookTimestamp: undefined,
    people: [
      {
        name: 'Công ty TNHH UpBase',
        email: partyAEmail,
        role: 0,
        roleLabel: 'Bên A · {{SIGN_PROVIDER}}',
        level: 1,
        action: 1,
        status: 'Chờ ký',
      },
      {
        name: record.partner,
        email: partyBEmail,
        role: 0,
        roleLabel: 'Bên B · {{SIGN_CLIENT}}',
        level: 2,
        action: 0,
        status: 'Chưa đến lượt',
      },
    ],
  };
}
