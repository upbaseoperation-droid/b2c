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
  convertRemoteTemplateToLegalTemplate,
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  DEFAULT_HDNT_CANHAN_FIELDS,
  DEFAULT_HDNT_CANHAN_PARTICIPANTS,
  DEFAULT_HDNT_CANHAN_TEMPLATE_ID,
  DEFAULT_SIGN_TAGS,
  describeRemoteTemplateField,
  enrichTemplateWithSignFlow,
  formatContractServiceFieldValue,
  mapRecordValuesToTemplateVariables,
  mapRemoteTemplateToB2cId,
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
  convertRemoteTemplateToLegalTemplate,
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  DEFAULT_HDNT_CANHAN_FIELDS,
  DEFAULT_HDNT_CANHAN_PARTICIPANTS,
  DEFAULT_HDNT_CANHAN_TEMPLATE_ID,
  DEFAULT_SIGN_TAGS,
  describeRemoteTemplateField,
  enrichTemplateWithSignFlow,
  formatContractServiceFieldValue,
  mapRecordValuesToTemplateVariables,
  mapRemoteTemplateToB2cId,
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
let templateListCache: { items: RemoteContractTemplateSummary[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function clearContractTemplateCache(): void {
  templateDetailCache.clear();
  templateListCache = null;
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
 * Tải trực tiếp một mẫu hợp đồng từ Contract Service theo UUID, mã code (`HDNT-CANHAN`) hoặc mã định danh B2C (`IND-HDNT`)
 * thông qua API 1 (`getContractTemplates`) và API 2 (`getContractTemplate`), không phụ thuộc file `.docx` lưu sẵn trên `web-admin`.
 */
export async function loadTemplateFromContractService(
  idOrCodeOrB2cId: string,
): Promise<LegalTemplate | null> {
  if (!contractSystemConfigured()) return null;
  const target = (idOrCodeOrB2cId || '').trim();
  if (!target) return null;

  try {
    // 1. Nếu truyền trực tiếp UUID của Contract Service -> gọi thẳng API 2 getContractTemplate
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)) {
      const detail = await fetchContractTemplateDetailFromService(target);
      return convertRemoteTemplateToLegalTemplate(
        {
          id: detail.id,
          code: detail.code,
          name: detail.name,
          status: detail.status,
          type: detail.type,
          object: detail.object,
          hasSigningFlowConfig: detail.hasSigningFlowConfig,
        },
        detail,
      );
    }

    // 2. Lấy danh sách mẫu từ API 1 (getContractTemplates)
    let remoteList: RemoteContractTemplateSummary[];
    if (templateListCache && templateListCache.expiresAt > Date.now()) {
      remoteList = templateListCache.items;
    } else {
      const res = await fetchContractTemplatesFromService({
        pageNumber: 1,
        pageSize: 50,
        status: 'active',
        sortBy: 'createdAt',
        sortType: 'DESC',
      });
      remoteList = res.items || [];
      templateListCache = { items: remoteList, expiresAt: Date.now() + CACHE_TTL_MS };
    }

    if (remoteList.length === 0) return null;

    const upperTarget = target.toUpperCase();
    const criteria = resolveExpectedRemoteTemplateCriteria(target);

    // Ưu tiên khớp chính xác theo code trên Contract Service (ví dụ: HDNT-CANHAN)
    let matched =
      remoteList.find(item => item.code.toUpperCase() === upperTarget) ||
      remoteList.find(item => item.id.toLowerCase() === target.toLowerCase()) ||
      remoteList.find(item => mapRemoteTemplateToB2cId(item).toUpperCase() === upperTarget) ||
      remoteList.find(item => criteria.preferredCodes.some(c => c.toUpperCase() === item.code.toUpperCase()));

    if (!matched) return null;

    const detail = await fetchContractTemplateDetailFromService(matched.id).catch(() => null);
    const preferredB2cId =
      matched.code.toUpperCase() === upperTarget ? matched.code : target;
    return convertRemoteTemplateToLegalTemplate(matched, detail, preferredB2cId);
  } catch {
    return null;
  }
}

let syncedRemoteTemplatesCache: {
  items: LegalTemplate[];
  usedIds: Set<string>;
  expiresAt: number;
} | null = null;

/**
 * Bước 1 & 2: Lấy danh sách mẫu trực tiếp từ API 1 (`getContractTemplates`) và chi tiết `fields` / `participants` / `documents`
 * từ API 2 (`getContractTemplate`) trên Contract Service làm nguồn dữ liệu chính cho `web-admin`.
 * Các mẫu nội bộ (`localTemplates`) chỉ đóng vai trò dự phòng (Zero-Crash Standalone) khi chưa cấu hình API hoặc mẫu chưa có trên dịch vụ.
 */
export async function syncTemplatesWithContractSystem(
  localTemplates: LegalTemplate[],
): Promise<LegalTemplate[]> {
  const enrichedLocal = localTemplates.map(enrichTemplateWithSignFlow);
  if (!contractSystemConfigured()) {
    return enrichedLocal;
  }

  const now = Date.now();
  if (syncedRemoteTemplatesCache && syncedRemoteTemplatesCache.expiresAt > now) {
    const remainingLocal = enrichedLocal.filter(tpl => !syncedRemoteTemplatesCache!.usedIds.has(tpl.id));
    return [...syncedRemoteTemplatesCache.items, ...remainingLocal];
  }

  try {
    let remoteList: RemoteContractTemplateSummary[];
    if (templateListCache && templateListCache.expiresAt > now) {
      remoteList = templateListCache.items;
    } else {
      const res = await fetchContractTemplatesFromService({
        pageNumber: 1,
        pageSize: 50,
        status: 'active',
        sortBy: 'createdAt',
        sortType: 'DESC',
      });
      remoteList = res.items || [];
      if (remoteList.length > 0) {
        templateListCache = { items: remoteList, expiresAt: now + CACHE_TTL_MS };
      }
    }

    if (!remoteList || remoteList.length === 0) {
      return enrichedLocal;
    }

    // 1. Chuyển đổi trực tiếp toàn bộ mẫu trả về từ API 1 + API 2 thành LegalTemplate
    const usedIds = new Set<string>();
    const remoteConverted: LegalTemplate[] = await Promise.all(
      remoteList.map(async item => {
        const detail = await fetchContractTemplateDetailFromService(item.id).catch(() => null);
        const b2cId = mapRemoteTemplateToB2cId(item, usedIds);
        usedIds.add(b2cId);
        return convertRemoteTemplateToLegalTemplate(item, detail, b2cId);
      }),
    );

    syncedRemoteTemplatesCache = {
      items: remoteConverted,
      usedIds,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    // 2. Giữ lại các mẫu tùy chỉnh KOC (KOC_CUSTOM) hoặc các chặng SOW/BBNT chưa đưa lên Contract Service để luồng 3 bước không đứt gãy
    const remainingLocal = enrichedLocal.filter(tpl => !usedIds.has(tpl.id));
    return [...remoteConverted, ...remainingLocal];
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
  const explicitUuid =
    record.contractSystem?.remoteTemplateId ||
    enrichedTpl?.remoteTemplateId ||
    criteria.fallbackUuid;

  if (explicitUuid) {
    try {
      const detail = await fetchContractTemplateDetailFromService(explicitUuid);
      return { templateUuid: detail.id, detail };
    } catch {
      // Nếu UUID không tìm thấy trên dịch vụ, tiếp tục dò trong danh sách getContractTemplates bên dưới
    }
  }

  try {
    const { items } = await fetchContractTemplatesFromService({
      pageNumber: 1,
      pageSize: 50,
      status: 'active',
    });
    const matched =
      items.find(i => criteria.preferredCodes.some(c => c.toUpperCase() === i.code.toUpperCase())) ||
      items.find(i => i.type === criteria.type && i.object === criteria.object);
    if (matched) {
      const detail = await fetchContractTemplateDetailFromService(matched.id).catch(() => null);
      return { templateUuid: matched.id, detail };
    }
  } catch {
    // Bỏ qua lỗi mạng tạm thời
  }

  if (explicitUuid) {
    return { templateUuid: explicitUuid, detail: null };
  }

  throw new ContractError(
    `Mẫu hợp đồng ${record.templateId} (${criteria.type} · ${criteria.object}) chưa được cấu hình trên Contract Service.`,
    400,
  );
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

  const initialPayload = buildContractServicePayload({
    record,
    template: enrichedTpl,
    remoteFields,
    contractCode: baseContractCode,
  });
  const currentPayloadHash = createHash('sha256').update(JSON.stringify(initialPayload)).digest('hex');

  const executeMutation = async (codeToUse: string): Promise<GenerateContractMutationResult> => {
    const payload =
      codeToUse === baseContractCode
        ? initialPayload
        : buildContractServicePayload({
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
    //   Chỉ tái sử dụng bản ghi cũ nếu dữ liệu payload (payloadHash) hoàn toàn không đổi;
    //   nếu người dùng đã sửa dữ liệu hợp đồng hoặc gọi sinh lại bản mới thì tạo mã code kèm hậu tố phiên bản để sinh file mới.
    if (err instanceof ContractError && (err.status === 409 || err.status === 500)) {
      if (
        err.status === 409 &&
        record.contractSystem?.contractSystemId &&
        record.contractSystem?.googleDocsUrl &&
        record.contractSystem?.contractCode === baseContractCode &&
        record.contractSystem?.payloadHash === currentPayloadHash
      ) {
        return {
          ...record.contractSystem,
          lastError: undefined,
          lastSyncedAt: now,
        };
      }
      const cleanRootCode = buildStableContractCode(record);
      const retrySuffix = `V${record.version}-${String(Date.now()).slice(-4)}`;
      const retryCode = `${cleanRootCode}-${retrySuffix}`;
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
    payloadHash: currentPayloadHash,
    lastError: undefined,
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
  const isKocFlow = Boolean(record.isKocOwnForm || record.googleDocsSource === 'KOC_CUSTOM_DOC');
  const isAmendedFlow =
    !isKocFlow &&
    Boolean(
      record.googleDocsUrl ||
        record.hasCustomTerms ||
        record.googleDocsSource === 'TEMPLATE_AMENDED',
    );
  const isStandardTemplateFlow = !isKocFlow && !isAmendedFlow;
  const needsFreshGenerate =
    isStandardTemplateFlow &&
    (!record.contractSystem?.contractSystemId ||
      record.contractSystem.remoteStatus === 'failed' ||
      (contractSystemConfigured() && record.contractSystem.contractSystemId.startsWith('cs-')));
  const meta = needsFreshGenerate
    ? await generateContractOnSystem(record, template)
    : record.contractSystem || createStandaloneContractSystemMeta(record, template);

  if (!contractSystemConfigured() || (!isStandardTemplateFlow && !record.contractSystem?.contractSystemId)) {
    const attempt = createStandaloneRequestSignAttempt(record, actor.id, evidenceHash, {
      partyAEmail,
      partyBEmail,
    });
    return { meta, attempt, reusedExisting: false };
  }

  const { detail } = isKocFlow ? { detail: null } : await resolveTemplateDetailForRecord(record, template);
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
