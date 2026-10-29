/**
 * Quy tắc ánh xạ dữ liệu, sinh mã hợp đồng idempotent (code) và kiểm soát chuyển trạng thái tiến
 * giữa B2C Portal và dịch vụ trung tâm contract-system.
 * Module thuần TypeScript (Client-safe, không phụ thuộc node:crypto hay node:fs).
 */

import type { ContractRecord, ContractSystemSyncMeta, LegalTemplate, SigningAttempt } from './types';

export const DEFAULT_SIGN_TAGS = ['{{SIGN_BEN_A}}', '{{SIGN_BEN_B}}'] as const;

/** Phân loại văn bản thuộc chặng nào trong chuỗi 3 bước: HĐNT Khung -> Phụ lục SOW -> Biên bản nghiệm thu BBNT. */
export function resolveContractDocStage(templateId?: string, kind?: 'CONTRACT' | 'ACCEPTANCE'): 'HDNT' | 'SOW' | 'BBNT' {
  const id = (templateId || '').toUpperCase();
  if (kind === 'ACCEPTANCE' || id.includes('BBNT') || id.endsWith('-NT')) return 'BBNT';
  if (id.endsWith('-SOW') || id.includes('-LIVE-') || id.includes('-PL')) return 'SOW';
  return 'HDNT';
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

  const rawRef =
    input.dealCode ||
    values['token:[ID KOC]'] ||
    input.kocId ||
    input.partner ||
    input.id?.slice(0, 8) ||
    'KOC';

  const cleanRef = rawRef
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toUpperCase()
    .slice(0, 24) || 'KOC';

  const cleanBrand = (values['token:[BRAND]'] || input.brand || 'UPBASE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12) || 'UPBASE';

  return `${cleanDate}/${docType}/UPBASE-${cleanBrand}-${cleanRef}`;
}

/**
 * Bổ sung thông tin thẻ ô ký (`{{SIGN_*}}`) và cấu hình luồng ký (`configureTemplateSigningFlow`)
 * cho mẫu biểu nếu chưa có sẵn từ contract-system.
 */
export function enrichTemplateWithSignFlow(template: LegalTemplate): LegalTemplate {
  const signTags =
    template.signTags && template.signTags.length > 0
      ? template.signTags
      : [...DEFAULT_SIGN_TAGS];

  const signingFlowConfig = template.signingFlowConfig || {
    mode: 'SEQUENTIAL' as const,
    deadlineDays: 7,
    signers: [
      {
        order: 1,
        role: 'Đại diện Bên A (UpBase)',
        signTag: signTags[0] || '{{SIGN_BEN_A}}',
      },
      {
        order: 2,
        role: `Đại diện Bên B (${template.subject || 'KOC'})`,
        signTag: signTags[1] || '{{SIGN_BEN_B}}',
      },
    ],
  };

  return {
    ...template,
    signTags,
    signingFlowConfig,
  };
}

/**
 * Chuyển đổi danh sách giá trị đã điền trên B2C Portal sang bảng biến `{{KEY}}` gửi cho `generateContract`.
 */
export function mapRecordValuesToTemplateVariables(
  record: Pick<ContractRecord, 'title' | 'brand' | 'partner' | 'templateId' | 'parentId' | 'dealCode' | 'kocId' | 'values' | 'acceptanceScreenshots'>,
  template?: LegalTemplate,
): Record<string, string> {
  const docStage = resolveContractDocStage(record.templateId || template?.id, template?.kind);
  const parentCode =
    record.values?.['token:[Số Phụ lục]'] ||
    record.values?.['token:[Số HĐNT]'] ||
    record.values?.['token:[Số Hợp đồng]'] ||
    record.parentId ||
    '';

  const vars: Record<string, string> = {
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
    if (key === '__meta:sowTasksJson') {
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
      if (normalizedKey) vars[normalizedKey] = trimmed;
    }
    vars[key] = trimmed;
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
        vars[sourceKey] = rawVal;
      }
    }
  }

  // Đồng bộ danh sách N Bảng công việc theo từng Job (1 Deal -> N Jobs -> N Bảng công việc trong Phụ lục SOW)
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

  if (!currentStatus) {
    return { allowed: true };
  }

  if (currentStatus === 'COMPLETED' && nextStatus === 'COMPLETED') {
    return {
      allowed: false,
      isDuplicateCompleted: true,
      reason: 'Hồ sơ đã ở trạng thái COMPLETED, bỏ qua sự kiện lặp để tránh nhân bản job tải file.',
    };
  }

  // Khi đã ở trạng thái kết thúc (COMPLETED / REJECTED / CANCELLED), không lùi về WAITING / PARTIAL
  const currentRank = SIGNING_STATUS_RANK[currentStatus] ?? 0;
  const nextRank = SIGNING_STATUS_RANK[nextStatus] ?? 0;

  if (currentRank >= 3 && nextRank < 3) {
    return {
      allowed: false,
      reason: `Không cho phép lùi trạng thái từ ${currentStatus} về ${nextStatus}.`,
    };
  }

  if (nextRank < currentRank) {
    return {
      allowed: false,
      reason: `Trạng thái ${nextStatus} thấp hơn trạng thái hiện tại ${currentStatus}.`,
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
    documentStage,
    parentContractCode: resolvedParentCode,
    googleDocsId,
    googleDocsUrl: `https://docs.google.com/document/d/${googleDocsId}/edit`,
    googleDocsSyncedAt: now,
    exportedDocxUrl: `/api/contracts/${record.id}/document?version=${record.version}`,
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
  const partyAEmail = customSigners?.partyAEmail?.trim() || 'hddt@upbase.asia';
  const partyBEmail =
    customSigners?.partyBEmail?.trim() ||
    record.values['word/document.xml:p48:cell']?.trim() ||
    'partner@booking.upbase.vn';

  return {
    documentId: crypto.randomUUID(),
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
    currentSignerName: 'Đặng Thị Yến Nhi (Đại diện UpBase)',
    currentSignerEmail: partyAEmail,
    evidenceConfirmedBy: actorId,
    evidenceHash,
    signedFileStatus: 'IDLE',
    lastWebhookTimestamp: undefined,
    people: [
      {
        name: 'Đặng Thị Yến Nhi (Đại diện UpBase)',
        email: partyAEmail,
        role: 0,
        roleLabel: 'Bên A · {{SIGN_BEN_A}}',
        level: 1,
        action: 1,
        status: 'Chờ ký',
      },
      {
        name: record.partner,
        email: partyBEmail,
        role: 0,
        roleLabel: 'Bên B · {{SIGN_BEN_B}}',
        level: 2,
        action: 0,
        status: 'Chưa đến lượt',
      },
    ],
  };
}
