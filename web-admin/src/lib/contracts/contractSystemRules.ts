/**
 * Quy tắc ánh xạ dữ liệu, sinh mã hợp đồng idempotent (code), chuẩn hóa payload GraphQL
 * và kiểm soát chuyển trạng thái tiến giữa B2C Portal và dịch vụ trung tâm Contract Service.
 * Module thuần TypeScript (Client-safe, không phụ thuộc node:crypto hay node:fs).
 */

import type {
  ContractRecord,
  ContractServiceTemplateField,
  ContractServiceTemplateParticipant,
  ContractSystemSyncMeta,
  FieldSource,
  LegalTemplate,
  SigningAttempt,
} from './types';

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
  const rawDate =
    values['token:[dd.mm.yy]'] ||
    values['token:[DDMMYY]'] ||
    values['token:[Ngày HĐNT]'] ||
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

  const rawTokenId = (values['token:[ID KOC]'] || '').trim();
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
    (values['token:[BRAND]'] || input.brand || 'UPBASE')
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

  return {
    ...template,
    remoteTemplateId: template.remoteTemplateId || criteria.fallbackUuid,
    remoteTemplateCode: template.remoteTemplateCode || criteria.preferredCodes[0],
    hasSigningFlowConfig: template.hasSigningFlowConfig ?? true,
    remoteFields: template.remoteFields || DEFAULT_HDNT_CANHAN_FIELDS,
    remoteParticipants: template.remoteParticipants || DEFAULT_HDNT_CANHAN_PARTICIPANTS,
    signTags,
    signingFlowConfig,
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
