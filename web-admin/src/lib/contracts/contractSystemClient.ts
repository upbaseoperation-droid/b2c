/**
 * Adapter kết nối B2C Portal với dịch vụ trung tâm Contract Service (`https://contract.staging.upbase.asia/graphql`).
 * Tuân thủ 100% đặc tả GraphQL (API 1: getContractTemplates, API 2: getContractTemplate, API 3: generateContract, API 4: requestSign)
 * và cơ chế Zero-Crash Standalone: khi chưa cấu hình biến môi trường `CONTRACT_SYSTEM_GRAPHQL_URL`,
 * tự động chuyển sang nhánh dự phòng nội bộ để không làm gián đoạn môi trường local dev / kiểm thử.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ContractError, requireCondition } from './domain';
import type {
  ContractActor,
  ContractRecord,
  ContractServiceTemplateField,
  ContractServiceTemplateParticipant,
  ContractSystemSyncMeta,
  LegalTemplate,
  SigningAttempt,
  SigningPerson,
} from './types';
import {
  buildContractServicePayload,
  buildRequestSignPayload,
  buildStableContractCode,
  canAdvanceSigningStatus,
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  DEFAULT_HDNT_CANHAN_FIELDS,
  DEFAULT_HDNT_CANHAN_PARTICIPANTS,
  DEFAULT_HDNT_CANHAN_TEMPLATE_ID,
  DEFAULT_SIGN_TAGS,
  enrichTemplateWithSignFlow,
  formatContractServiceFieldValue,
  mapRecordValuesToTemplateVariables,
  normalizeContractServiceStatus,
  parseCompositeIdField,
  resolveContractDocStage,
  resolveExpectedRemoteTemplateCriteria,
} from './contractSystemRules';

export {
  buildContractServicePayload,
  buildRequestSignPayload,
  buildStableContractCode,
  canAdvanceSigningStatus,
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  DEFAULT_HDNT_CANHAN_FIELDS,
  DEFAULT_HDNT_CANHAN_PARTICIPANTS,
  DEFAULT_HDNT_CANHAN_TEMPLATE_ID,
  DEFAULT_SIGN_TAGS,
  enrichTemplateWithSignFlow,
  formatContractServiceFieldValue,
  mapRecordValuesToTemplateVariables,
  normalizeContractServiceStatus,
  parseCompositeIdField,
  resolveContractDocStage,
  resolveExpectedRemoteTemplateCriteria,
};

const graphqlEndpoint = () => process.env.CONTRACT_SYSTEM_GRAPHQL_URL?.trim() || '';
const secretAccessHeaderValue = () =>
  process.env.UPBASE_SECRET_ACCESS?.trim() ||
  process.env.CONTRACT_SYSTEM_API_KEY?.trim() ||
  '';

export function contractSystemConfigured(): boolean {
  return Boolean(graphqlEndpoint());
}

/** Khung response chuẩn của Contract Service: HTTP status luôn là 200, kết quả thật nằm ở `statusCode` / `success`. */
export interface ContractServiceEnvelope<TData, TMeta = Record<string, unknown>> {
  statusCode: number;
  success: boolean;
  message: string;
  data: TData | null;
  meta?: TMeta | null;
}

interface RawGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

export interface RemoteContractTemplateSummary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: 'active' | 'archived' | string;
  type: 'MASTER' | 'SERVICE' | 'APPENDIX' | 'LIVESTREAM_ACCEPTANCE' | 'VIDEO_ACCEPTANCE' | string;
  object: 'INDIVIDUAL' | 'BUSINESS' | 'COMPANY' | string;
  hasSigningFlowConfig: boolean;
  createdAt?: number | null;
  updatedAt?: number | null;
}

export interface RemoteContractTemplateDetail {
  id: string;
  code: string;
  name: string;
  status: string;
  type: string;
  object: string;
  hasSigningFlowConfig: boolean;
  fields: ContractServiceTemplateField[];
  participants: ContractServiceTemplateParticipant[];
  documents?: Array<{
    documentType: 'source' | 'preview' | string;
    fileUrl: string;
    status: string;
    version: number;
  }>;
}

export interface GetContractTemplatesInput {
  pageNumber?: number;
  pageSize?: number;
  status?: 'active' | 'archived';
  type?: 'MASTER' | 'SERVICE' | 'APPENDIX' | 'LIVESTREAM_ACCEPTANCE' | 'VIDEO_ACCEPTANCE';
  object?: 'INDIVIDUAL' | 'BUSINESS' | 'COMPANY';
  search?: string;
  createdAtFrom?: number;
  createdAtTo?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'hasSigningFlowConfig';
  sortType?: 'ASC' | 'DESC';
}

const templateDetailCache = new Map<string, { detail: RemoteContractTemplateDetail; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function clearContractTemplateCache(): void {
  templateDetailCache.clear();
}

function extractGoogleDocIdFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : undefined;
}

function normalizeHttpErrorStatus(statusCode?: number): number {
  if (!statusCode || !Number.isInteger(statusCode)) return 502;
  if ([400, 401, 403, 404, 409, 422, 500, 502, 503].includes(statusCode)) return statusCode;
  return 502;
}

async function callContractSystemGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const endpoint = graphqlEndpoint();
  requireCondition(endpoint, 'Chưa cấu hình CONTRACT_SYSTEM_GRAPHQL_URL.', 503);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const secret = secretAccessHeaderValue();
  if (secret) {
    headers['x-upbase-secret-access'] = secret;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    throw new ContractError(
      `Contract Service trả lỗi HTTP ${response.status}. Vui lòng kiểm tra kết nối và khóa x-upbase-secret-access.`,
      response.status === 401 || response.status === 403 ? response.status : 502,
    );
  }

  const payload = (await response.json()) as RawGraphQLResponse<T>;
  if (payload.errors && payload.errors.length > 0) {
    const firstErr = payload.errors[0];
    throw new ContractError(firstErr.message || 'Lỗi kiểu dữ liệu đầu vào GraphQL trên Contract Service.', 400);
  }

  if (!payload.data) {
    throw new ContractError('Phản hồi từ Contract Service không có dữ liệu.', 502);
  }

  return payload.data;
}

function unwrapEnvelope<TData, TMeta = Record<string, unknown>>(
  envelope: ContractServiceEnvelope<TData, TMeta> | undefined,
  fallbackErrorMsg: string,
): { data: TData; meta?: TMeta | null; statusCode: number; message: string } {
  if (!envelope) {
    throw new ContractError(fallbackErrorMsg, 502);
  }
  if (!envelope.success || envelope.statusCode >= 400 || envelope.data === null || envelope.data === undefined) {
    throw new ContractError(
      envelope.message || fallbackErrorMsg,
      normalizeHttpErrorStatus(envelope.statusCode),
    );
  }
  return {
    data: envelope.data,
    meta: envelope.meta,
    statusCode: envelope.statusCode,
    message: envelope.message,
  };
}

/**
 * API 1 – Danh sách mẫu hợp đồng (`getContractTemplates`).
 */
export async function fetchContractTemplatesFromService(
  input: GetContractTemplatesInput = { pageNumber: 1, pageSize: 50, status: 'active' },
): Promise<{
  items: RemoteContractTemplateSummary[];
  meta?: { totalItems: number; pageNumber: number; pageSize: number; totalPages: number } | null;
}> {
  const raw = await callContractSystemGraphQL<{
    getContractTemplates: ContractServiceEnvelope<
      RemoteContractTemplateSummary[],
      { totalItems: number; pageNumber: number; pageSize: number; totalPages: number }
    >;
  }>(
    `query GetContractTemplates($input: GetContractTemplatesInput) {
      getContractTemplates(input: $input) {
        statusCode
        success
        message
        meta { totalItems pageNumber pageSize totalPages }
        data {
          id
          code
          name
          description
          status
          type
          object
          hasSigningFlowConfig
          createdAt
          updatedAt
        }
      }
    }`,
    { input },
  );

  const unwrapped = unwrapEnvelope(
    raw.getContractTemplates,
    'Không lấy được danh sách mẫu hợp đồng từ Contract Service.',
  );

  return {
    items: Array.isArray(unwrapped.data) ? unwrapped.data : [],
    meta: unwrapped.meta,
  };
}

/**
 * API 2 – Chi tiết mẫu hợp đồng (`getContractTemplate`).
 */
export async function fetchContractTemplateDetailFromService(
  templateUuid: string,
): Promise<RemoteContractTemplateDetail> {
  const cleanId = (templateUuid || '').trim();
  requireCondition(Boolean(cleanId), 'Thiếu ID mẫu hợp đồng (templateId).', 400);

  const cached = templateDetailCache.get(cleanId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.detail;
  }

  const raw = await callContractSystemGraphQL<{
    getContractTemplate: ContractServiceEnvelope<RemoteContractTemplateDetail>;
  }>(
    `query GetContractTemplate($id: String!) {
      getContractTemplate(id: $id) {
        statusCode
        success
        message
        data {
          id
          code
          name
          status
          type
          object
          hasSigningFlowConfig
          fields { fieldKey fieldType required }
          participants { code role action signingOrder required name email phone signatureType }
          documents { documentType fileUrl status version }
        }
      }
    }`,
    { id: cleanId },
  );

  const unwrapped = unwrapEnvelope(
    raw.getContractTemplate,
    'Không tìm thấy template hợp đồng trên Contract Service.',
  );

  templateDetailCache.set(cleanId, {
    detail: unwrapped.data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return unwrapped.data;
}

/**
 * Bước 1 & 2: Đồng bộ danh sách mẫu của B2C Portal với `getContractTemplates` và `getContractTemplate` từ Contract Service.
 */
export async function syncTemplatesWithContractSystem(
  localTemplates: LegalTemplate[],
): Promise<LegalTemplate[]> {
  const enrichedLocal = localTemplates.map(enrichTemplateWithSignFlow);
  if (!contractSystemConfigured()) {
    return enrichedLocal;
  }

  try {
    const { items: remoteList } = await fetchContractTemplatesFromService({
      pageNumber: 1,
      pageSize: 50,
      status: 'active',
      sortBy: 'createdAt',
      sortType: 'DESC',
    });

    if (!remoteList || remoteList.length === 0) {
      return enrichedLocal;
    }

    const byCode = new Map(remoteList.map(item => [item.code.toUpperCase(), item]));
    const byId = new Map(remoteList.map(item => [item.id.toLowerCase(), item]));

    return await Promise.all(
      enrichedLocal.map(async tpl => {
        const criteria = resolveExpectedRemoteTemplateCriteria(tpl.id, tpl.kind, tpl.subject);
        let matched: RemoteContractTemplateSummary | undefined;

        if (tpl.remoteTemplateId && byId.has(tpl.remoteTemplateId.toLowerCase())) {
          matched = byId.get(tpl.remoteTemplateId.toLowerCase());
        }
        if (!matched) {
          for (const candidateCode of criteria.preferredCodes) {
            const hit = byCode.get(candidateCode.toUpperCase());
            if (hit) {
              matched = hit;
              break;
            }
          }
        }
        if (!matched) {
          matched = remoteList.find(
            item => item.type === criteria.type && item.object === criteria.object && item.status === 'active',
          );
        }
        if (!matched && criteria.fallbackUuid && byId.has(criteria.fallbackUuid.toLowerCase())) {
          matched = byId.get(criteria.fallbackUuid.toLowerCase());
        }

        if (!matched) return tpl;

        let detail: RemoteContractTemplateDetail | null = null;
        try {
          detail = await fetchContractTemplateDetailFromService(matched.id);
        } catch {
          detail = null;
        }

        const participants = detail?.participants || tpl.remoteParticipants || DEFAULT_HDNT_CANHAN_PARTICIPANTS;
        const signTags =
          participants.length > 0
            ? participants.map(p => (p.code.startsWith('{{') ? p.code : `{{${p.code}}}`))
            : tpl.signTags || [...DEFAULT_SIGN_TAGS];

        return {
          ...tpl,
          remoteTemplateId: matched.id,
          remoteTemplateCode: matched.code,
          hasSigningFlowConfig: detail?.hasSigningFlowConfig ?? matched.hasSigningFlowConfig,
          remoteFields: detail?.fields && detail.fields.length > 0 ? detail.fields : tpl.remoteFields,
          remoteParticipants: participants,
          signTags,
          signingFlowConfig: {
            mode: 'SEQUENTIAL',
            deadlineDays: 15,
            signers: participants
              .filter(p => !p.action || p.action === 'sign')
              .sort((a, b) => (a.signingOrder ?? 99) - (b.signingOrder ?? 99))
              .map((p, idx) => ({
                order: p.signingOrder || idx + 1,
                role:
                  /PROVIDER|BEN_A/i.test(p.code)
                    ? 'Đại diện Bên A (UpBase)'
                    : `Đại diện Bên B (${tpl.subject || 'KOC'})`,
                signTag: p.code.startsWith('{{') ? p.code : `{{${p.code}}}`,
              })),
          },
        };
      }),
    );
  } catch {
    return enrichedLocal;
  }
}

/**
 * Tìm UUID mẫu hợp đồng (`templateId`) và chi tiết `fields` / `participants` trên Contract Service cho một hồ sơ B2C.
 */
async function resolveTemplateDetailForRecord(
  record: ContractRecord,
  template?: LegalTemplate,
): Promise<{
  templateUuid: string;
  detail: RemoteContractTemplateDetail | null;
}> {
  const enrichedTpl = template ? enrichTemplateWithSignFlow(template) : undefined;
  const criteria = resolveExpectedRemoteTemplateCriteria(record.templateId, template?.kind, template?.subject);
  const candidateUuid =
    record.contractSystem?.remoteTemplateId ||
    enrichedTpl?.remoteTemplateId ||
    criteria.fallbackUuid ||
    DEFAULT_HDNT_CANHAN_TEMPLATE_ID;

  try {
    const detail = await fetchContractTemplateDetailFromService(candidateUuid);
    return { templateUuid: detail.id, detail };
  } catch {
    // Nếu UUID mặc định không khớp, thử tìm từ danh sách getContractTemplates
    try {
      const { items } = await fetchContractTemplatesFromService({
        pageNumber: 1,
        pageSize: 50,
        status: 'active',
      });
      const matched =
        items.find(i => criteria.preferredCodes.some(c => c.toUpperCase() === i.code.toUpperCase())) ||
        items.find(i => i.type === criteria.type && i.object === criteria.object) ||
        items[0];
      if (matched) {
        const detail = await fetchContractTemplateDetailFromService(matched.id).catch(() => null);
        return { templateUuid: matched.id, detail };
      }
    } catch {
      // Bỏ qua và dùng candidateUuid
    }
    return { templateUuid: candidateUuid, detail: null };
  }
}

interface GenerateContractMutationResult {
  id: string;
  code: string;
  status: string;
  templateId: string;
  document?: {
    id: string;
    documentType: string;
    status: string;
    fileUrl?: string | null;
    signingFileUrl?: string | null;
  } | null;
}

/**
 * API 3 – Tạo hợp đồng (`generateContract`).
 * Truyền `templateId` (UUID), `code`, `fileName` và `payload: [{ fieldKey, value }]` để sinh:
 * - Bản xem trước trên Google Docs (`document.fileUrl`)
 * - File DOCX dùng để ký (`document.signingFileUrl`, giữ tag `{{SIGN_...}}`)
 */
export async function generateContractOnSystem(
  record: ContractRecord,
  template?: LegalTemplate,
  parentContractCode?: string,
): Promise<ContractSystemSyncMeta> {
  const baseContractCode = record.contractSystem?.contractCode || buildStableContractCode(record);
  const enrichedTpl = template ? enrichTemplateWithSignFlow(template) : undefined;
  const documentStage = resolveContractDocStage(record.templateId, template?.kind);
  const resolvedParentCode =
    parentContractCode ||
    record.contractSystem?.parentContractCode ||
    record.values?.['token:[Số Phụ lục]'] ||
    record.values?.['token:[Số HĐNT]'] ||
    undefined;
  const now = new Date().toISOString();

  if (!contractSystemConfigured()) {
    return createStandaloneContractSystemMeta(record, enrichedTpl, resolvedParentCode);
  }

  const { templateUuid, detail } = await resolveTemplateDetailForRecord(record, enrichedTpl);
  const remoteFields = detail?.fields || enrichedTpl?.remoteFields || DEFAULT_HDNT_CANHAN_FIELDS;
  const remoteParticipants =
    detail?.participants || enrichedTpl?.remoteParticipants || DEFAULT_HDNT_CANHAN_PARTICIPANTS;

  const executeMutation = async (codeToUse: string): Promise<GenerateContractMutationResult> => {
    const payload = buildContractServicePayload({
      record,
      template: enrichedTpl,
      remoteFields,
      contractCode: codeToUse,
    });
    const fileName = `${codeToUse} - ${record.partner || record.title}`.slice(0, 180);

    const raw = await callContractSystemGraphQL<{
      generateContract: ContractServiceEnvelope<GenerateContractMutationResult>;
    }>(
      `mutation GenerateContract($input: GenerateContractInput!) {
        generateContract(input: $input) {
          statusCode
          success
          message
          data {
            id
            code
            status
            templateId
            document { id documentType status fileUrl signingFileUrl }
          }
        }
      }`,
      {
        input: {
          templateId: templateUuid,
          code: codeToUse,
          fileName,
          payload,
        },
      },
    );

    return unwrapEnvelope(raw.generateContract, 'Không thể tạo hợp đồng trên Contract Service.').data;
  };

  let generated: GenerateContractMutationResult;
  try {
    generated = await executeMutation(baseContractCode);
  } catch (err) {
    // Theo mục 4 tài liệu:
    // - Lỗi 409 (code hợp đồng đã tồn tại) hoặc lỗi 500 (đồng bộ Google Drive thất bại):
    //   nếu hồ sơ đã có sẵn metadata cùng code và chưa nâng version thì giữ nguyên để gọi requestSign;
    //   nếu là bản sửa mới hoặc thử lại sau lỗi 500 thì sinh mã code kèm hậu tố phiên bản để không bị kẹt.
    if (err instanceof ContractError && (err.status === 409 || err.status === 500)) {
      if (
        err.status === 409 &&
        record.contractSystem?.contractSystemId &&
        record.contractSystem?.googleDocsUrl &&
        record.contractSystem?.contractCode === baseContractCode
      ) {
        return {
          ...record.contractSystem,
          lastSyncedAt: now,
        };
      }
      const retrySuffix = record.version > 1 ? `V${record.version}` : String(Date.now()).slice(-4);
      const retryCode = `${baseContractCode}-${retrySuffix}`;
      generated = await executeMutation(retryCode);
    } else {
      throw err;
    }
  }

  const googleDocsUrl = generated.document?.fileUrl || record.contractSystem?.googleDocsUrl;
  const googleDocsId = extractGoogleDocIdFromUrl(googleDocsUrl) || record.contractSystem?.googleDocsId;
  const signingFileUrl = generated.document?.signingFileUrl || undefined;
  const signTags =
    remoteParticipants.length > 0
      ? remoteParticipants.map(p => (p.code.startsWith('{{') ? p.code : `{{${p.code}}}`))
      : enrichedTpl?.signTags || [...DEFAULT_SIGN_TAGS];

  return {
    contractCode: generated.code || baseContractCode,
    contractSystemId: generated.id,
    remoteTemplateId: generated.templateId || templateUuid,
    remoteStatus: generated.status || 'ready',
    documentStage,
    parentContractCode: resolvedParentCode,
    googleDocsId,
    googleDocsUrl:
      googleDocsUrl ||
      (googleDocsId ? `https://docs.google.com/document/d/${googleDocsId}/edit` : undefined),
    googleDocsSyncedAt: now,
    exportedDocxUrl:
      signingFileUrl ||
      record.contractSystem?.exportedDocxUrl ||
      `/api/contracts/${record.id}/document?version=${record.version}`,
    signingFileUrl,
    signedFileStatus: record.contractSystem?.signedFileStatus || 'IDLE',
    signedFileUrl: record.contractSystem?.signedFileUrl,
    templateSnapshot: {
      templateId: record.templateId,
      version: enrichedTpl?.version || `v${record.version}`,
      hash: record.templateHash,
      signTags,
      capturedAt: now,
    },
    lastSyncedAt: now,
    lastWebhookTimestamp: record.contractSystem?.lastWebhookTimestamp,
  };
}

interface RequestSignMutationResult {
  provider: string;
  requestId: string;
  contractId: string;
  contractCode: string;
  templateId: string;
  participants: Array<{
    code: string;
    name: string;
    email: string;
    phone?: string | null;
    role?: string | null;
  }>;
}

/**
 * API 4 – Yêu cầu ký (`requestSign`).
 * Gửi hợp đồng đã sinh sang WeSign (lấy nội dung từ bản Google Docs mới nhất).
 * Truyền `code` hợp đồng và `identityPayload` (`NAME_SIGN_PROVIDER`, `EMAIL_SIGN_PROVIDER`, `NAME_SIGN_CLIENT`, `EMAIL_SIGN_CLIENT`).
 */
export async function requestSignOnSystem(params: {
  record: ContractRecord;
  actor: ContractActor;
  renderedParagraphs: string[];
  template?: LegalTemplate;
  partyAName?: string;
  partyAEmail?: string;
  partyBName?: string;
  partyBEmail?: string;
}): Promise<{ meta: ContractSystemSyncMeta; attempt: SigningAttempt; reusedExisting: boolean }> {
  const { record, actor, renderedParagraphs, template, partyAName, partyAEmail, partyBName, partyBEmail } = params;
  const contractCode = record.contractSystem?.contractCode || buildStableContractCode(record);

  // Kiểm tra idempotent: nếu đã có lượt ký đang hoạt động hoặc hoàn tất với cùng contractCode thì dùng lại
  const existingActive = record.signing.find(
    s =>
      (s.contractCode === contractCode || s.version === record.version) &&
      !['CANCELLED', 'REJECTED', 'FAILED'].includes(s.status),
  );
  if (existingActive && record.contractSystem) {
    return {
      meta: record.contractSystem,
      attempt: existingActive,
      reusedExisting: true,
    };
  }

  const evidenceHash = createHash('sha256').update(renderedParagraphs.join('\n')).digest('hex');
  const meta = record.contractSystem || (await generateContractOnSystem(record, template));

  if (!contractSystemConfigured()) {
    const attempt = createStandaloneRequestSignAttempt(record, actor.id, evidenceHash, {
      partyAEmail,
      partyBEmail,
    });
    return { meta, attempt, reusedExisting: false };
  }

  const { detail } = await resolveTemplateDetailForRecord(record, template);
  if (detail && detail.hasSigningFlowConfig === false) {
    throw new ContractError(
      'Template của hợp đồng chưa được cấu hình luồng ký (hasSigningFlowConfig = false).',
      400,
    );
  }

  const remoteParticipants =
    detail?.participants || template?.remoteParticipants || DEFAULT_HDNT_CANHAN_PARTICIPANTS;

  const { identityPayload } = buildRequestSignPayload({
    record,
    remoteParticipants,
    partyAName,
    partyAEmail,
    partyBName,
    partyBEmail,
  });

  const targetCode = meta.contractCode || contractCode;

  const raw = await callContractSystemGraphQL<{
    requestSign: ContractServiceEnvelope<RequestSignMutationResult>;
  }>(
    `mutation RequestSign($input: RequestSignInput!) {
      requestSign(input: $input) {
        statusCode
        success
        message
        data {
          provider
          requestId
          contractId
          contractCode
          templateId
          participants { code name email phone role }
        }
      }
    }`,
    {
      input: {
        code: targetCode,
        identityPayload,
      },
    },
  );

  const res = unwrapEnvelope(raw.requestSign, 'Gửi yêu cầu ký sang WeSign thất bại.').data;
  const now = new Date().toISOString();

  const people: SigningPerson[] =
    res.participants && res.participants.length > 0
      ? res.participants.map((p, idx) => ({
          name: p.name,
          email: p.email,
          action: idx === 0 ? 1 : 0,
          status: idx === 0 ? 'Chờ ký' : 'Chưa đến lượt',
          role: 0,
          roleLabel:
            /PROVIDER|BEN_A/i.test(p.code)
              ? `Bên A · {{${p.code}}}`
              : `Bên B · {{${p.code}}}`,
          level: idx + 1,
        }))
      : createStandaloneRequestSignAttempt(record, actor.id, evidenceHash, { partyAEmail, partyBEmail }).people;

  const completedCount = people.filter(p => p.action === 2).length;
  const totalCount = people.length;

  const attempt: SigningAttempt = {
    documentId: (res.requestId || res.contractId || crypto.randomUUID()).toLowerCase(),
    name: `${res.contractCode || targetCode} · ${record.title}`,
    version: record.version,
    linkedBy: actor.id,
    linkedAt: now,
    syncedAt: now,
    provider: 'CONTRACT_SYSTEM',
    contractCode: res.contractCode || targetCode,
    status: 'WAITING',
    sourceStatus: 1,
    completedCount,
    totalCount,
    progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    currentSignerName: people.find(p => p.action === 1)?.name,
    currentSignerEmail: people.find(p => p.action === 1)?.email,
    evidenceConfirmedBy: actor.id,
    evidenceHash,
    signedFileStatus: 'IDLE',
    lastWebhookTimestamp: Date.now(),
    people,
  };

  const nextMeta: ContractSystemSyncMeta = {
    ...meta,
    contractSystemId: res.contractId || meta.contractSystemId,
    contractCode: res.contractCode || targetCode,
    remoteTemplateId: res.templateId || meta.remoteTemplateId,
    remoteStatus: 'signing_requested',
    wesignRequestId: res.requestId,
    lastSyncedAt: now,
    lastWebhookTimestamp: attempt.lastWebhookTimestamp,
  };

  return { meta: nextMeta, attempt, reusedExisting: false };
}

/**
 * Chiều Pull đối soát trạng thái ký từ Contract Service (hỗ trợ cả Envelope mới lẫn cấu trúc cũ nếu có).
 */
export async function querySigningStatusFromContractSystem(
  record: ContractRecord,
): Promise<{
  status: string;
  sourceStatus: number;
  people: SigningPerson[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  currentSignerName?: string;
  currentSignerEmail?: string;
  signedFileUrl?: string;
  signedFileStatus?: 'IDLE' | 'QUEUED' | 'DOWNLOADED' | 'FAILED';
  eventTimestamp?: number;
  syncedAt: string;
} | null> {
  if (!contractSystemConfigured()) return null;
  const contractCode =
    record.contractSystem?.contractCode ||
    record.signing.at(-1)?.contractCode ||
    buildStableContractCode(record);

  try {
    const data = await callContractSystemGraphQL<{
      contractByCode?: {
        id: string;
        code: string;
        status: string;
        sourceStatus?: number;
        signedFileUrl?: string;
        signedFileStatus?: 'IDLE' | 'QUEUED' | 'DOWNLOADED' | 'FAILED';
        updatedAtTimestamp?: number;
        signers?: Array<{
          name: string;
          email: string;
          roleLabel?: string;
          order?: number;
          action: number;
          status: string;
          signedAt?: string;
        }>;
      };
    }>(
      `query GetContractStatusForB2C($code: String!) {
        contractByCode(code: $code) {
          id
          code
          status
          sourceStatus
          signedFileUrl
          signedFileStatus
          updatedAtTimestamp
          signers {
            name
            email
            roleLabel
            order
            action
            status
            signedAt
          }
        }
      }`,
      { code: contractCode },
    );

    const remote = data.contractByCode;
    if (!remote) return null;

    const people: SigningPerson[] = (remote.signers || []).map((s, idx) => ({
      name: s.name,
      email: s.email,
      action: s.action,
      status: s.status,
      role: 0,
      roleLabel: s.roleLabel || 'Người ký',
      level: s.order || idx + 1,
      at: s.signedAt,
    }));
    const totalCount = people.length;
    const completedCount = people.filter(p => p.action === 2).length;
    const status = normalizeContractServiceStatus(remote.status);
    const progressPercent =
      status === 'COMPLETED' ? 100 : totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const waiting = people.find(p => p.action === 1);

    return {
      status,
      sourceStatus: typeof remote.sourceStatus === 'number' ? remote.sourceStatus : status === 'COMPLETED' ? 2 : 1,
      people,
      completedCount,
      totalCount,
      progressPercent,
      currentSignerName: waiting?.name,
      currentSignerEmail: waiting?.email,
      signedFileUrl: remote.signedFileUrl,
      signedFileStatus:
        remote.signedFileStatus || (remote.signedFileUrl ? 'DOWNLOADED' : status === 'COMPLETED' ? 'QUEUED' : 'IDLE'),
      eventTimestamp: remote.updatedAtTimestamp,
      syncedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Xác thực chữ ký HMAC-SHA256 hoặc khóa bí mật Header (`x-upbase-secret-access` / Bearer) của Webhook từ Contract Service.
 * Tuyệt đối không trả `true` mù quáng khi chưa xác thực.
 */
export function verifyContractSystemWebhookAuth(params: {
  rawBody: string;
  signatureHeader?: string | null;
  bearerToken?: string | null;
}): boolean {
  const secrets = [
    process.env.CONTRACT_SYSTEM_WEBHOOK_SECRET?.trim(),
    process.env.UPBASE_SECRET_ACCESS?.trim(),
    process.env.WESIGN_SYNC_SECRET?.trim(),
  ].filter((s): s is string => Boolean(s));

  if (secrets.length === 0) return false;

  const { rawBody, signatureHeader, bearerToken } = params;

  for (const secret of secrets) {
    // 1. Kiểm tra chữ ký HMAC-SHA256 (x-contract-system-signature hoặc x-wesign-signature)
    if (signatureHeader && signatureHeader.trim()) {
      const cleanSig = signatureHeader.trim().replace(/^sha256=/i, '');
      const expectedHmac = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
      if (
        Buffer.byteLength(cleanSig) === Buffer.byteLength(expectedHmac) &&
        timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedHmac))
      ) {
        return true;
      }
    }

    // 2. Kiểm tra khóa đối xứng Header (`x-upbase-secret-access`, `x-contract-system-secret`, `Authorization: Bearer ...`)
    if (bearerToken && bearerToken.trim()) {
      const cleanToken = bearerToken.trim().replace(/^Bearer\s+/i, '');
      if (
        Buffer.byteLength(cleanToken) === Buffer.byteLength(secret) &&
        timingSafeEqual(Buffer.from(cleanToken), Buffer.from(secret))
      ) {
        return true;
      }
    }
  }

  return false;
}
