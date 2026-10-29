/**
 * Adapter kết nối B2C Portal với dịch vụ trung tâm `contract-system` (GraphQL + Webhook Step 13).
 * Tuân thủ cơ chế Zero-Crash Standalone: khi chưa cấu hình biến môi trường `CONTRACT_SYSTEM_GRAPHQL_URL`,
 * tự động chuyển sang nhánh dự phòng nội bộ để không làm gián đoạn môi trường local dev / kiểm thử.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ContractError, requireCondition } from './domain';
import type {
  ContractActor,
  ContractRecord,
  ContractSystemSyncMeta,
  LegalTemplate,
  SigningAttempt,
  SigningPerson,
} from './types';
import {
  buildStableContractCode,
  canAdvanceSigningStatus,
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  DEFAULT_SIGN_TAGS,
  enrichTemplateWithSignFlow,
  mapRecordValuesToTemplateVariables,
  resolveContractDocStage,
} from './contractSystemRules';

export {
  buildStableContractCode,
  canAdvanceSigningStatus,
  createStandaloneContractSystemMeta,
  createStandaloneRequestSignAttempt,
  enrichTemplateWithSignFlow,
  mapRecordValuesToTemplateVariables,
  resolveContractDocStage,
};

const graphqlEndpoint = () => process.env.CONTRACT_SYSTEM_GRAPHQL_URL?.trim() || '';
const graphqlApiKey = () => process.env.CONTRACT_SYSTEM_API_KEY?.trim() || '';

export function contractSystemConfigured(): boolean {
  return Boolean(graphqlEndpoint());
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
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
  const token = graphqlApiKey();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new ContractError(
      `Dịch vụ contract-system trả lỗi HTTP ${response.status}. Vui lòng kiểm tra kết nối.`,
      502,
    );
  }

  const payload = (await response.json()) as GraphQLResponse<T>;
  if (payload.errors && payload.errors.length > 0) {
    const firstErr = payload.errors[0];
    const isTokenExpired =
      /token|expired|provider|oauth/i.test(firstErr.message) ||
      firstErr.extensions?.code === 'PROVIDER_TOKEN_EXPIRED';
    if (isTokenExpired) {
      throw new ContractError(
        'Token WeSign trong Provider DB đã hết hạn hoặc chưa sẵn sàng. Vui lòng làm mới OAuth token trước khi gửi ký.',
        503,
      );
    }
    throw new ContractError(firstErr.message || 'Lỗi xử lý từ contract-system.', 502);
  }

  if (!payload.data) {
    throw new ContractError('Phản hồi từ contract-system không có dữ liệu.', 502);
  }

  return payload.data;
}

/**
 * Bước 4: B2C Portal lấy danh sách template kèm thẻ `{{KEY}}`, `{{SIGN_*}}` và cấu hình luồng ký từ `contract-system`.
 * Có nhánh dự phòng enrich trực tiếp trên danh mục mẫu chuẩn của B2C Portal.
 */
export async function syncTemplatesWithContractSystem(
  localTemplates: LegalTemplate[],
): Promise<LegalTemplate[]> {
  const enrichedLocal = localTemplates.map(enrichTemplateWithSignFlow);
  if (!contractSystemConfigured()) {
    return enrichedLocal;
  }

  try {
    const data = await callContractSystemGraphQL<{
      contractTemplates: Array<{
        id: string;
        code?: string;
        version?: string;
        signTags?: string[];
        signingFlow?: {
          mode?: 'SEQUENTIAL' | 'PARALLEL';
          deadlineDays?: number;
          signers?: Array<{ order: number; role: string; signTag: string }>;
        };
      }>;
    }>(
      `query GetContractTemplatesForB2C {
        contractTemplates {
          id
          code
          version
          signTags
          signingFlow {
            mode
            deadlineDays
            signers {
              order
              role
              signTag
            }
          }
        }
      }`,
      {},
    );

    const remoteByCode = new Map(
      (data.contractTemplates || []).map(item => [(item.code || item.id).toUpperCase(), item]),
    );

    return enrichedLocal.map(tpl => {
      const remote = remoteByCode.get(tpl.id.toUpperCase());
      if (!remote) return tpl;
      return {
        ...tpl,
        signTags: remote.signTags && remote.signTags.length > 0 ? remote.signTags : tpl.signTags,
        signingFlowConfig: remote.signingFlow
          ? {
              mode: remote.signingFlow.mode === 'PARALLEL' ? 'PARALLEL' : 'SEQUENTIAL',
              deadlineDays: remote.signingFlow.deadlineDays || 7,
              signers: remote.signingFlow.signers || tpl.signingFlowConfig?.signers || [],
            }
          : tpl.signingFlowConfig,
      };
    });
  } catch {
    return enrichedLocal;
  }
}

/**
 * Bước 5: Gọi `generateContract` trên `contract-system` để render `.docx` bằng dữ liệu hợp đồng,
 * lưu hợp đồng, đồng bộ sang Google Docs (để sửa điều khoản nếu cần) và upload lên UpBase upload API.
 */
export async function generateContractOnSystem(
  record: ContractRecord,
  template?: LegalTemplate,
  parentContractCode?: string,
): Promise<ContractSystemSyncMeta> {
  const contractCode = record.contractSystem?.contractCode || buildStableContractCode(record);
  const variables = mapRecordValuesToTemplateVariables(record, template);
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

  const data = await callContractSystemGraphQL<{
    generateContract: {
      id: string;
      code: string;
      googleDocsId?: string;
      googleDocsUrl?: string;
      docxUrl?: string;
      templateVersion?: string;
      signTags?: string[];
    };
  }>(
    `mutation GenerateContractFromB2C($input: GenerateContractInput!) {
      generateContract(input: $input) {
        id
        code
        googleDocsId
        googleDocsUrl
        docxUrl
        templateVersion
        signTags
      }
    }`,
    {
      input: {
        code: contractCode,
        documentStage,
        parentContractCode: resolvedParentCode,
        parentId: record.parentId || undefined,
        templateId: record.templateId,
        templateVersion: template?.version || `v${record.version}`,
        templateHash: record.templateHash,
        title: record.title,
        brand: record.brand,
        partner: record.partner,
        variables,
        syncGoogleDocs: true,
      },
    },
  );

  const generated = data.generateContract;
  return {
    contractCode: generated.code || contractCode,
    contractSystemId: generated.id,
    documentStage,
    parentContractCode: resolvedParentCode,
    googleDocsId: generated.googleDocsId,
    googleDocsUrl:
      generated.googleDocsUrl ||
      (generated.googleDocsId ? `https://docs.google.com/document/d/${generated.googleDocsId}/edit` : undefined),
    googleDocsSyncedAt: now,
    exportedDocxUrl: generated.docxUrl || `/api/contracts/${record.id}/document?version=${record.version}`,
    signedFileStatus: record.contractSystem?.signedFileStatus || 'IDLE',
    signedFileUrl: record.contractSystem?.signedFileUrl,
    templateSnapshot: {
      templateId: record.templateId,
      version: generated.templateVersion || template?.version || `v${record.version}`,
      hash: record.templateHash,
      signTags:
        generated.signTags && generated.signTags.length > 0
          ? generated.signTags
          : enrichedTpl?.signTags || [...DEFAULT_SIGN_TAGS],
      capturedAt: now,
    },
    lastSyncedAt: now,
    lastWebhookTimestamp: record.contractSystem?.lastWebhookTimestamp,
  };
}

/**
 * Bước 5 -> 8: Gọi `requestSign` sang `contract-system`.
 * - Bước 6: Xuất lại `.docx` từ Google Docs để bản đã chỉnh sửa là bản được ký.
 * - Bước 7: Đọc OAuth access token WeSign từ Provider DB.
 * - Bước 8: Đổi thẻ `{{SIGN_*}}` sang khóa WeSign, upload file ký và tạo signflow.
 * - Dùng `contractCode` làm khóa idempotent để gọi lại sau timeout không sinh hợp đồng mới.
 */
export async function requestSignOnSystem(params: {
  record: ContractRecord;
  actor: ContractActor;
  renderedParagraphs: string[];
  template?: LegalTemplate;
  partyAEmail?: string;
  partyBEmail?: string;
}): Promise<{ meta: ContractSystemSyncMeta; attempt: SigningAttempt; reusedExisting: boolean }> {
  const { record, actor, renderedParagraphs, template, partyAEmail, partyBEmail } = params;
  const contractCode = record.contractSystem?.contractCode || buildStableContractCode(record);

  // Kiểm tra idempotent: nếu đã có lượt ký đang hoạt động hoặc hoàn tất với cùng contractCode thì dùng lại
  const existingActive = record.signing.find(
    s =>
      (s.contractCode === contractCode || s.version === record.version) &&
      !['CANCELLED', 'REJECTED'].includes(s.status),
  );
  if (existingActive && record.contractSystem) {
    return {
      meta: record.contractSystem,
      attempt: existingActive,
      reusedExisting: true,
    };
  }

  const evidenceHash = createHash('sha256').update(renderedParagraphs.join('\n')).digest('hex');
  const meta =
    record.contractSystem || (await generateContractOnSystem(record, template));

  if (!contractSystemConfigured()) {
    const attempt = createStandaloneRequestSignAttempt(record, actor.id, evidenceHash, {
      partyAEmail,
      partyBEmail,
    });
    return { meta, attempt, reusedExisting: false };
  }

  const data = await callContractSystemGraphQL<{
    requestSign: {
      contractId: string;
      code: string;
      providerDocumentId: string;
      status: string;
      exportedDocxUrl?: string;
      signers?: Array<{
        name: string;
        email: string;
        roleLabel?: string;
        order?: number;
        status?: string;
        action?: number;
        signedAt?: string;
      }>;
    };
  }>(
    `mutation RequestSignFromB2C($input: RequestSignInput!) {
      requestSign(input: $input) {
        contractId
        code
        providerDocumentId
        status
        exportedDocxUrl
        signers {
          name
          email
          roleLabel
          order
          status
          action
          signedAt
        }
      }
    }`,
    {
      input: {
        code: contractCode,
        contractId: meta.contractSystemId,
        exportFromGoogleDocs: Boolean(meta.googleDocsId),
        signers: [
          {
            order: 1,
            name: 'Đặng Thị Yến Nhi (Đại diện UpBase)',
            email: partyAEmail?.trim() || 'hddt@upbase.asia',
            signTag: meta.templateSnapshot?.signTags?.[0] || '{{SIGN_BEN_A}}',
          },
          {
            order: 2,
            name: record.partner,
            email:
              partyBEmail?.trim() ||
              record.values['word/document.xml:p48:cell']?.trim() ||
              'partner@booking.upbase.vn',
            signTag: meta.templateSnapshot?.signTags?.[1] || '{{SIGN_BEN_B}}',
          },
        ],
      },
    },
  );

  const res = data.requestSign;
  const now = new Date().toISOString();
  const people: SigningPerson[] =
    res.signers && res.signers.length > 0
      ? res.signers.map((s, idx) => ({
          name: s.name,
          email: s.email,
          action: typeof s.action === 'number' ? s.action : idx === 0 ? 1 : 0,
          status: s.status || (idx === 0 ? 'Chờ ký' : 'Chưa đến lượt'),
          role: 0,
          roleLabel: s.roleLabel || (idx === 0 ? 'Bên A · {{SIGN_BEN_A}}' : 'Bên B · {{SIGN_BEN_B}}'),
          level: s.order || idx + 1,
          at: s.signedAt,
        }))
      : createStandaloneRequestSignAttempt(record, actor.id, evidenceHash, { partyAEmail, partyBEmail }).people;

  const completedCount = people.filter(p => p.action === 2).length;
  const totalCount = people.length;
  const normalizedStatus = ['WAITING', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(
    (res.status || '').toUpperCase(),
  )
    ? (res.status || '').toUpperCase()
    : 'WAITING';

  const attempt: SigningAttempt = {
    documentId: (res.providerDocumentId || crypto.randomUUID()).toLowerCase(),
    name: `${contractCode} · ${record.title}`,
    version: record.version,
    linkedBy: actor.id,
    linkedAt: now,
    syncedAt: now,
    provider: 'CONTRACT_SYSTEM',
    contractCode: res.code || contractCode,
    status: normalizedStatus,
    sourceStatus: normalizedStatus === 'COMPLETED' ? 2 : 1,
    completedCount,
    totalCount,
    progressPercent: normalizedStatus === 'COMPLETED' ? 100 : totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    currentSignerName: people.find(p => p.action === 1)?.name,
    currentSignerEmail: people.find(p => p.action === 1)?.email,
    evidenceConfirmedBy: actor.id,
    evidenceHash,
    signedFileStatus: normalizedStatus === 'COMPLETED' ? 'QUEUED' : 'IDLE',
    lastWebhookTimestamp: Date.now(),
    people,
  };

  const nextMeta: ContractSystemSyncMeta = {
    ...meta,
    contractSystemId: res.contractId || meta.contractSystemId,
    contractCode: res.code || contractCode,
    exportedDocxUrl: res.exportedDocxUrl || meta.exportedDocxUrl,
    lastSyncedAt: now,
    lastWebhookTimestamp: attempt.lastWebhookTimestamp,
  };

  return { meta: nextMeta, attempt, reusedExisting: false };
}

/**
 * Bước 13 (Chiều Pull đối soát): B2C Portal chủ động hỏi trạng thái ký & file đã ký từ `contract-system`.
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
  const status = (remote.status || 'WAITING').toUpperCase();
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
    signedFileStatus: remote.signedFileStatus || (remote.signedFileUrl ? 'DOWNLOADED' : status === 'COMPLETED' ? 'QUEUED' : 'IDLE'),
    eventTimestamp: remote.updatedAtTimestamp,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Xác thực chữ ký HMAC-SHA256 hoặc Bearer Secret của Webhook từ `contract-system` / `webhook-system` (Giải quyết Rủi ro #1).
 * Tuyệt đối không trả `true` mù quáng khi chưa xác thực.
 */
export function verifyContractSystemWebhookAuth(params: {
  rawBody: string;
  signatureHeader?: string | null;
  bearerToken?: string | null;
}): boolean {
  const secret =
    process.env.CONTRACT_SYSTEM_WEBHOOK_SECRET?.trim() ||
    process.env.WESIGN_SYNC_SECRET?.trim() ||
    '';
  if (!secret) return false;

  const { rawBody, signatureHeader, bearerToken } = params;

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

  // 2. Kiểm tra khóa đối xứng Bearer / Header Secret
  if (bearerToken && bearerToken.trim()) {
    const cleanToken = bearerToken.trim().replace(/^Bearer\s+/i, '');
    if (
      Buffer.byteLength(cleanToken) === Buffer.byteLength(secret) &&
      timingSafeEqual(Buffer.from(cleanToken), Buffer.from(secret))
    ) {
      return true;
    }
  }

  return false;
}
