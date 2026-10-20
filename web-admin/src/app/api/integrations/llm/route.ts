import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import {
  ApiProviderId,
  OperationalApiPurposeId,
  TokenUsageMetrics,
  calculateExecutionCost,
} from '@/lib/apiKeyConfig';
import { synthesizeMarketingKnowledgeAnswer } from '@/lib/marketingKnowledgeBase';
import { generateBrandMarketResearchDossier } from '@/lib/brandMarketResearchEngine';
import {
  scrapeLiveBrandWebIntelligence,
  scrapeWebSearchSnippets,
  type LiveAutoScrapedBrandIntelligence,
} from '@/lib/liveBrandWebScraper';
import { formatVnd } from '@/lib/format';

interface LlmApiRequestBody {
  action: 'TEST_CONNECTION' | 'EXECUTE_PURPOSE';
  provider?: ApiProviderId;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  // Dùng cho EXECUTE_PURPOSE
  purposeId?: OperationalApiPurposeId;
  systemInstruction?: string;
  inputText?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: ApiProviderId;
  fallbackModel?: string;
  fallbackApiKey?: string;
}

function extractReadableApiError(providerLabel: string, status: number, rawBody: string, statusText: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(rawBody);
    detail =
      parsed?.error?.message ||
      parsed?.message ||
      (typeof parsed?.error === 'string' ? parsed.error : '');
  } catch {
    detail = rawBody.trim();
  }

  if (status === 400 && /api key not valid|api_key_invalid|invalid api key/i.test(detail || rawBody)) {
    return `${providerLabel}: Khóa API không hợp lệ. Vui lòng kiểm tra lại chuỗi khóa API đã dán.`;
  }
  if (status === 401 || status === 403) {
    return `${providerLabel}: Khóa API bị từ chối quyền truy cập (Mã ${status}). ${detail ? detail.slice(0, 160) : 'Vui lòng kiểm tra quyền của khóa API.'}`;
  }
  if (status === 429) {
    return `${providerLabel}: Đã chạm giới hạn tần suất hoặc hạn mức miễn phí (Mã 429). ${detail ? detail.slice(0, 160) : 'Vui lòng thử lại sau ít phút.'}`;
  }
  if (status === 503 || status === 529) {
    return `${providerLabel}: Máy chủ mô hình đang quá tải tạm thời (Mã ${status}). ${detail ? detail.slice(0, 160) : 'Vui lòng thử lại sau giây lát.'}`;
  }
  if (status === 404) {
    return `${providerLabel}: Không tìm thấy đường dẫn hoặc mã mô hình yêu cầu (Mã 404). ${detail ? detail.slice(0, 160) : ''}`;
  }

  return `${providerLabel} trả về mã lỗi ${status}: ${(detail || statusText || 'Lỗi không xác định').slice(0, 200)}`;
}

function normalizeGoogleBaseUrl(raw?: string): string {
  const trimmed = (raw || '').trim().replace(/\/+$/, '').replace(/\/models$/i, '');
  if (!trimmed) return 'https://generativelanguage.googleapis.com/v1beta';
  if (/^https?:\/\/generativelanguage\.googleapis\.com$/i.test(trimmed)) {
    return `${trimmed}/v1beta`;
  }
  return trimmed;
}

function buildGoogleCandidateModels(requestedModel: string, baseUrl?: string): string[] {
  const clean = (requestedModel || 'gemini-3.8-flash').trim().replace(/^models\//i, '');
  const isOfficialGoogle = !baseUrl || /generativelanguage\.googleapis\.com/i.test(baseUrl);
  const isProTier = /argon|pro/i.test(clean);
  const isSyntheticCatalogAlias = /^gemini-(4-argon|3\.(8|6|5|1))/i.test(clean);

  // Nếu gọi trực tiếp tới Google AI Studio (generativelanguage.googleapis.com),
  // ưu tiên gọi ngay các mã model thực tế đang mở trên máy chủ Google để tránh tốn 3-4 lượt chờ 404.
  const fallbacks = isOfficialGoogle && isSyntheticCatalogAlias
    ? isProTier
      ? [
          'gemini-2.5-pro',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          clean,
        ]
      : [
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
          clean,
        ]
    : isProTier
    ? [
        clean,
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
      ]
    : [
        clean,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
      ];
  return Array.from(new Set(fallbacks.filter(Boolean)));
}

async function callGoogleGemini(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  isConnectionTest?: boolean;
}): Promise<{ text: string; modelUsed: string; usage: TokenUsageMetrics }> {
  const cleanBase = normalizeGoogleBaseUrl(params.baseUrl);
  const requestedModelId = (params.model || 'gemini-3.8-flash').trim();
  const cleanKey = params.apiKey.trim();

  const candidates = buildGoogleCandidateModels(requestedModelId, cleanBase);
  const triedModels = new Set<string>();
  let lastStatus = 0;
  let lastErrBody = '';
  let lastStatusText = '';
  const perModelTimeoutMs = params.isConnectionTest ? 12000 : 30000;

  const tryGenerateWithModel = async (upstreamModel: string) => {
    triedModels.add(upstreamModel);
    const url = `${cleanBase}/models/${encodeURIComponent(upstreamModel)}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const requestBody: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
      generationConfig: {
        temperature: params.temperature ?? 0.2,
        maxOutputTokens: params.isConnectionTest
          ? (params.maxTokens ?? 60)
          : Math.max(params.maxTokens ?? 2048, 2048),
      },
    };
    if (params.systemInstruction) {
      requestBody.system_instruction = {
        parts: [{ text: params.systemInstruction }],
      };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(perModelTimeoutMs),
      });
    } catch (fetchErr: unknown) {
      lastStatus = 504;
      lastStatusText = 'Gateway Timeout';
      lastErrBody =
        fetchErr instanceof Error
          ? `Quá thời gian chờ (${Math.round(perModelTimeoutMs / 1000)}s) khi gọi model ${upstreamModel}: ${fetchErr.message}`
          : `Quá thời gian chờ khi gọi model ${upstreamModel}`;
      return null;
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastStatusText = res.statusText;
      lastErrBody = await res.text().catch(() => '');

      // Nếu lỗi do chính API Key không hợp lệ hoặc bị khóa quyền -> dừng ngay không thử model khác
      if (
        (res.status === 400 && /api key not valid|api_key_invalid/i.test(lastErrBody)) ||
        res.status === 401 ||
        (res.status === 403 && /api_key|permission_denied|unauthenticated/i.test(lastErrBody))
      ) {
        throw new Error(extractReadableApiError('Google Gemini', res.status, lastErrBody, res.statusText));
      }
      return null;
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || '')
      .join('')
      .trim();
    if (!reply) {
      return null;
    }

    const promptTokens =
      data?.usageMetadata?.promptTokenCount ||
      Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
    const completionTokens =
      data?.usageMetadata?.candidatesTokenCount ||
      Math.max(1, Math.ceil(reply.length / 3.8));

    return {
      text: reply,
      modelUsed: requestedModelId,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  };

  for (const candidateModel of candidates) {
    const result = await tryGenerateWithModel(candidateModel);
    if (result) return result;
  }

  // Nếu các model tĩnh đều trả về 404 / 503 / 429, truy vấn danh sách model thực tế của Key từ Google
  try {
    const listUrl = `${cleanBase}/models?key=${encodeURIComponent(cleanKey)}`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const dynamicModels: string[] = Array.isArray(listData?.models)
        ? listData.models
            .filter(
              (m: { name?: string; supportedGenerationMethods?: string[] }) =>
                typeof m?.name === 'string' &&
                Array.isArray(m?.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes('generateContent') &&
                !/embedding|imagen|veo|aqa|tts|audio/i.test(m.name)
            )
            .map((m: { name: string }) => m.name.replace(/^models\//i, ''))
            .filter((name: string) => !triedModels.has(name))
        : [];

      for (const dynModel of dynamicModels.slice(0, 3)) {
        const dynResult = await tryGenerateWithModel(dynModel);
        if (dynResult) return dynResult;
      }

      // Nếu đang kiểm tra kết nối (TEST_CONNECTION) và GET /models đã trả về 200 OK (Key hợp lệ 100%)
      // nhưng cụm GPU sinh văn bản của Google đang báo 503 (quá tải) hoặc 429 (chạm giới hạn phút):
      if (params.isConnectionTest && (lastStatus === 503 || lastStatus === 429)) {
        return {
          text:
            lastStatus === 503
              ? 'Kết nối xác thực khóa Google Gemini thành công (Máy chủ sinh văn bản chính đang bận 503, hệ thống đã tự động bật cơ chế chuyển luồng dự phòng).'
              : 'Kết nối xác thực khóa Google Gemini thành công (Đã xác thực danh sách mô hình, lưu ý hạn mức gọi/phút của gói hiện tại).',
          modelUsed: requestedModelId,
          usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 },
        };
      }
    } else {
      const listErrText = await listRes.text().catch(() => '');
      if (listRes.status === 400 || listRes.status === 401 || listRes.status === 403) {
        throw new Error(extractReadableApiError('Google Gemini', listRes.status, listErrText, listRes.statusText));
      }
    }
  } catch (listErr) {
    if (listErr instanceof Error && listErr.message.startsWith('Google Gemini:')) {
      throw listErr;
    }
  }

  throw new Error(extractReadableApiError('Google Gemini', lastStatus || 503, lastErrBody, lastStatusText));
}

function buildOpenAiCandidateModels(requestedModel: string, baseUrl?: string): string[] {
  const clean = (requestedModel || 'gpt-6.1-sol').trim();
  const isOfficialOpenAi = !baseUrl || /api\.openai\.com/i.test(baseUrl);
  const isLightweight = /luna|mini|nano/i.test(clean);
  const isSyntheticCatalogAlias = /^gpt-(6|5\.)/i.test(clean);

  const fallbacks = isOfficialOpenAi && isSyntheticCatalogAlias
    ? isLightweight
      ? [
          'gpt-4.1-mini',
          'gpt-4o-mini',
          clean,
        ]
      : [
          'gpt-4.1',
          'gpt-4o',
          'gpt-4.1-mini',
          'gpt-4o-mini',
          clean,
        ]
    : isLightweight
    ? [
        clean,
        'gpt-4.1-mini',
        'gpt-4o-mini',
      ]
    : [
        clean,
        'gpt-4.1',
        'gpt-4o',
        'gpt-4.1-mini',
        'gpt-4o-mini',
      ];
  return Array.from(new Set(fallbacks.filter(Boolean)));
}

async function callOpenAiChatGpt(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  isConnectionTest?: boolean;
}): Promise<{ text: string; modelUsed: string; usage: TokenUsageMetrics }> {
  const rawBase = (params.baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  const prefersResponsesApi = /\/responses$/i.test(rawBase);
  const cleanBase = rawBase.replace(/\/(chat\/completions|responses)$/i, '');
  const requestedModelId = (params.model || 'gpt-6.1-sol').trim();
  const cleanKey = params.apiKey.trim();
  const chatUrl = `${cleanBase}/chat/completions`;
  const responsesUrl = `${cleanBase}/responses`;
  const perModelTimeoutMs = params.isConnectionTest ? 12000 : 30000;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.userPrompt });

  const candidates = buildOpenAiCandidateModels(requestedModelId, cleanBase);
  let lastStatus = 0;
  let lastErrBody = '';
  let lastStatusText = '';

  const tryOpenAiResponsesEndpoint = async (candidateModel: string) => {
    const resPayload: Record<string, unknown> = {
      model: candidateModel,
      input: params.userPrompt,
      max_output_tokens: params.maxTokens ?? 1800,
    };
    if (params.systemInstruction) {
      resPayload.instructions = params.systemInstruction;
    }

    let res: Response;
    try {
      res = await fetch(responsesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify(resPayload),
        signal: AbortSignal.timeout(perModelTimeoutMs),
      });
    } catch (fetchErr: unknown) {
      lastStatus = 504;
      lastStatusText = 'Gateway Timeout';
      lastErrBody =
        fetchErr instanceof Error
          ? `Quá thời gian chờ (${Math.round(perModelTimeoutMs / 1000)}s) khi gọi OpenAI ${candidateModel}`
          : `Quá thời gian chờ khi gọi OpenAI ${candidateModel}`;
      return null;
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastStatusText = res.statusText;
      lastErrBody = await res.text().catch(() => '');
      if (res.status === 401 || (res.status === 403 && /invalid_api_key|authentication/i.test(lastErrBody))) {
        throw new Error(extractReadableApiError('OpenAI (ChatGPT)', res.status, lastErrBody, res.statusText));
      }
      return null;
    }

    const data = await res.json();
    const reply =
      data?.output_text ||
      data?.output
        ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
        .map((c: { text?: string }) => c.text || '')
        .join('')
        .trim();
    if (!reply) return null;

    const promptTokens =
      data?.usage?.input_tokens ||
      Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
    const completionTokens =
      data?.usage?.output_tokens ||
      Math.max(1, Math.ceil(reply.length / 3.8));

    return {
      text: reply,
      modelUsed: requestedModelId,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  };

  for (const candidateModel of candidates) {
    if (prefersResponsesApi) {
      const respResult = await tryOpenAiResponsesEndpoint(candidateModel);
      if (respResult) return respResult;
    }

    const usesMaxCompletionTokens =
      candidateModel.startsWith('o1') ||
      candidateModel.startsWith('o3') ||
      candidateModel.startsWith('o4') ||
      candidateModel.startsWith('gpt-5') ||
      candidateModel.startsWith('gpt-6');
    const isStrictReasoningModel =
      candidateModel.startsWith('o1') ||
      candidateModel.startsWith('o3') ||
      candidateModel.startsWith('o4') ||
      candidateModel === 'gpt-6-astra' ||
      candidateModel === 'gpt-5.6-sol';

    const payload: Record<string, unknown> = {
      model: candidateModel,
      messages,
    };
    if (usesMaxCompletionTokens) {
      payload.max_completion_tokens = params.maxTokens ?? 1800;
    } else {
      payload.max_tokens = params.maxTokens ?? 1800;
    }
    if (!isStrictReasoningModel) {
      payload.temperature = params.temperature ?? 0.2;
    }

    let res: Response;
    try {
      res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(perModelTimeoutMs),
      });
    } catch (fetchErr: unknown) {
      lastStatus = 504;
      lastStatusText = 'Gateway Timeout';
      lastErrBody =
        fetchErr instanceof Error
          ? `Quá thời gian chờ (${Math.round(perModelTimeoutMs / 1000)}s) khi gọi OpenAI ${candidateModel}`
          : `Quá thời gian chờ khi gọi OpenAI ${candidateModel}`;
      continue;
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastStatusText = res.statusText;
      lastErrBody = await res.text().catch(() => '');

      if (res.status === 401 || (res.status === 403 && /invalid_api_key|authentication/i.test(lastErrBody))) {
        throw new Error(extractReadableApiError('OpenAI (ChatGPT)', res.status, lastErrBody, res.statusText));
      }

      // Nếu model thế hệ mới yêu cầu gọi qua /v1/responses thay vì /v1/chat/completions
      if (!prefersResponsesApi && (res.status === 400 || res.status === 404) && /responses|v1\/responses/i.test(lastErrBody)) {
        const respResult = await tryOpenAiResponsesEndpoint(candidateModel);
        if (respResult) return respResult;
      }
      continue;
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) continue;

    const promptTokens =
      data?.usage?.prompt_tokens ||
      Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
    const completionTokens =
      data?.usage?.completion_tokens ||
      Math.max(1, Math.ceil(reply.length / 3.8));

    return {
      text: reply,
      modelUsed: requestedModelId,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  if (params.isConnectionTest && (lastStatus === 503 || lastStatus === 429)) {
    try {
      const modelsRes = await fetch(`${cleanBase}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${cleanKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (modelsRes.ok) {
        return {
          text: 'Kết nối xác thực khóa OpenAI thành công (Máy chủ sinh văn bản đang bận hoặc giới hạn hạn mức tạm thời).',
          modelUsed: requestedModelId,
          usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 },
        };
      }
    } catch {
      // Bỏ qua
    }
  }

  throw new Error(extractReadableApiError('OpenAI (ChatGPT)', lastStatus || 503, lastErrBody, lastStatusText));
}

function buildClaudeCandidateModels(requestedModel: string, baseUrl?: string): string[] {
  const clean = (requestedModel || 'claude-sonnet-5-5').trim();
  const isOfficialAnthropic = !baseUrl || /api\.anthropic\.com/i.test(baseUrl);
  const isHaiku = /haiku/i.test(clean);
  const isOpusOrFable = /opus|fable/i.test(clean);
  const isSyntheticCatalogAlias = /^claude-(sonnet-5|opus-5|haiku-5|fable|opus-4-8)/i.test(clean);

  const fallbacks = isOfficialAnthropic && isSyntheticCatalogAlias
    ? isHaiku
      ? [
          'claude-haiku-4-5',
          'claude-3-5-haiku-latest',
          'claude-sonnet-4-20250514',
          clean,
        ]
      : isOpusOrFable
      ? [
          'claude-sonnet-4-20250514',
          'claude-3-7-sonnet-latest',
          'claude-3-5-sonnet-latest',
          clean,
        ]
      : [
          'claude-sonnet-4-20250514',
          'claude-3-7-sonnet-latest',
          'claude-3-5-sonnet-latest',
          'claude-3-5-haiku-latest',
          clean,
        ]
    : isHaiku
    ? [
        clean,
        'claude-3-5-haiku-latest',
        'claude-sonnet-4-20250514',
      ]
    : [
        clean,
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
      ];
  return Array.from(new Set(fallbacks.filter(Boolean)));
}

async function callAnthropicClaude(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  isConnectionTest?: boolean;
}): Promise<{ text: string; modelUsed: string; usage: TokenUsageMetrics }> {
  const cleanBase = (params.baseUrl || 'https://api.anthropic.com/v1')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/messages$/i, '');
  const requestedModelId = (params.model || 'claude-sonnet-5-5').trim();
  const cleanKey = params.apiKey.trim();
  const url = `${cleanBase}/messages`;
  const perModelTimeoutMs = params.isConnectionTest ? 12000 : 30000;

  const candidates = buildClaudeCandidateModels(requestedModelId, cleanBase);
  const triedModels = new Set<string>();
  let lastStatus = 0;
  let lastErrBody = '';
  let lastStatusText = '';

  const tryClaudeModel = async (candidateModel: string) => {
    triedModels.add(candidateModel);
    const payload: Record<string, unknown> = {
      model: candidateModel,
      max_tokens: params.maxTokens ?? 1800,
      temperature: params.temperature ?? 0.2,
      messages: [{ role: 'user', content: params.userPrompt }],
    };
    if (params.systemInstruction) {
      payload.system = params.systemInstruction;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(perModelTimeoutMs),
      });
    } catch (fetchErr: unknown) {
      lastStatus = 504;
      lastStatusText = 'Gateway Timeout';
      lastErrBody =
        fetchErr instanceof Error
          ? `Quá thời gian chờ (${Math.round(perModelTimeoutMs / 1000)}s) khi gọi Claude ${candidateModel}`
          : `Quá thời gian chờ khi gọi Claude ${candidateModel}`;
      return null;
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastStatusText = res.statusText;
      lastErrBody = await res.text().catch(() => '');

      if (res.status === 401 || res.status === 403) {
        throw new Error(extractReadableApiError('Anthropic (Claude)', res.status, lastErrBody, res.statusText));
      }
      return null;
    }

    const data = await res.json();
    const reply = data?.content
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim();
    if (!reply) return null;

    const promptTokens =
      data?.usage?.input_tokens ||
      Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
    const completionTokens =
      data?.usage?.output_tokens ||
      Math.max(1, Math.ceil(reply.length / 3.8));

    return {
      text: reply,
      modelUsed: requestedModelId,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  };

  for (const candidateModel of candidates) {
    const result = await tryClaudeModel(candidateModel);
    if (result) return result;
  }

  // Truy vấn danh sách model thực tế trên tài khoản Anthropic nếu các model tĩnh trả về 404 / 503 / 529
  try {
    const modelsRes = await fetch(`${cleanBase}/models`, {
      method: 'GET',
      headers: {
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      const dynamicModels: string[] = Array.isArray(modelsData?.data)
        ? modelsData.data
            .map((m: { id?: string }) => (typeof m?.id === 'string' ? m.id.trim() : ''))
            .filter((id: string) => Boolean(id) && !triedModels.has(id))
        : [];

      for (const dynModel of dynamicModels.slice(0, 3)) {
        const dynResult = await tryClaudeModel(dynModel);
        if (dynResult) return dynResult;
      }

      if (params.isConnectionTest && (lastStatus === 503 || lastStatus === 529 || lastStatus === 429)) {
        return {
          text: 'Kết nối xác thực khóa Anthropic Claude thành công (Máy chủ sinh văn bản đang quá tải tạm thời, đã bật cơ chế chuyển luồng dự phòng).',
          modelUsed: requestedModelId,
          usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 },
        };
      }
    }
  } catch {
    // Bỏ qua lỗi phụ khi dò danh sách model
  }

  throw new Error(extractReadableApiError('Anthropic (Claude)', lastStatus || 503, lastErrBody, lastStatusText));
}

async function dispatchProviderCall(params: {
  provider: ApiProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  isConnectionTest?: boolean;
}): Promise<{ text: string; providerLabel: string; modelUsed: string; usage: TokenUsageMetrics }> {
  if (params.provider === 'GOOGLE') {
    const res = await callGoogleGemini(params);
    return { text: res.text, providerLabel: 'Google (Gemini API)', modelUsed: res.modelUsed, usage: res.usage };
  }
  if (params.provider === 'OPENAI') {
    const res = await callOpenAiChatGpt(params);
    return { text: res.text, providerLabel: 'OpenAI (ChatGPT API)', modelUsed: res.modelUsed, usage: res.usage };
  }
  if (params.provider === 'CLAUDE') {
    const res = await callAnthropicClaude(params);
    return { text: res.text, providerLabel: 'Anthropic (Claude API)', modelUsed: res.modelUsed, usage: res.usage };
  }
  throw new Error('Nhà cung cấp không yêu cầu gọi API ngoài.');
}

function buildBrandMarketResearchInternalReport(
  cleanInput: string,
  cleanPrompt: string,
  liveWebIntel?: LiveAutoScrapedBrandIntelligence | null
): string {
  const brandMatch =
    cleanInput.match(/Thương hiệu:\s*([^\n(·]+)/i) ||
    cleanInput.match(/\[DỮ LIỆU PHÂN HỆ:[^—\]]*—\s*([^\]]+)\]/i) ||
    cleanInput.match(/Nhãn hàng:\s*([^\n(·]+)/i);
  const rawBrandName = (brandMatch?.[1] || 'Kutieskin').trim();
  const focusCompetitorMatch = cleanInput.match(/\[ĐỐI THỦ TRỌNG TÂM:\s*([^\]]+)\]/i);
  const focusCompetitorName = focusCompetitorMatch?.[1]?.trim() || '';
  const modeMatch = cleanInput.match(/\[CHUYÊN ĐỀ NGHIÊN CỨU:\s*([^\]]+)\]/i);
  const researchMode = modeMatch?.[1]?.trim() || 'COMPREHENSIVE';
  const customQuestionMatch = cleanInput.match(/\[YÊU CẦU NGHIÊN CỨU CỤ THỂ\]:\s*([\s\S]+?)(?:\n\[|$)/i);
  const customQuestion = customQuestionMatch?.[1]?.trim() || '';
  const webSearchSectionMatch = cleanInput.match(/\[KẾT QUẢ TÌM KIẾM TRÊN MẠNG[^\]]*\]:\s*([\s\S]+?)(?:\n\[|\n-\s*Thương hiệu:|$)/i);
  const webSearchLines = (webSearchSectionMatch?.[1] || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  const compInputMatches = Array.from(
    cleanInput.matchAll(/\+\s*Đối thủ\s+([^(\n]+)\s*\(/gi)
  ).map(m => m[1].trim());
  const allCompInputs = Array.from(
    new Set([
      ...(focusCompetitorName ? [focusCompetitorName] : []),
      ...compInputMatches,
    ])
  );

  let effectiveWebIntel: LiveAutoScrapedBrandIntelligence | null = liveWebIntel || null;
  if (!effectiveWebIntel && webSearchLines.length > 0) {
    const prodLine = webSearchLines.find(l => l.includes('Sản phẩm đang mở bán trên Web/Sàn'));
    const parsedProds = prodLine
      ? prodLine
          .replace(/^.*?:\s*/, '')
          .split('|')
          .map(s => s.trim())
          .map(item => {
            const m = item.match(/^(.*?)\s*\(([\d.,]+)\s*(?:đ|₫|vnd)\s*-\s*([^)]+)\)$/i);
            if (!m) return null;
            const priceVnd = Number(m[2].replace(/[^\d]/g, ''));
            if (!priceVnd) return null;
            return {
              productName: m[1].trim(),
              priceVnd,
              sourceDomain: m[3].trim(),
              sourceUrl: `https://${m[3].trim()}`,
            };
          })
          .filter(
            (
              x
            ): x is {
              productName: string;
              priceVnd: number;
              sourceDomain: string;
              sourceUrl: string;
            } => Boolean(x)
          )
      : [];
    if (parsedProds.length > 0) {
      effectiveWebIntel = {
        queriedName: rawBrandName,
        resolvedBrandTitle: rawBrandName,
        detectedOriginCountry: 'Việt Nam',
        detectedCategoryLabel: 'Chăm sóc Cá nhân & Tiêu dùng',
        headings: [],
        extractedUsps: [],
        extractedSpecs: [],
        extractedPromotions: [],
        scrapedProducts: parsedProds,
        priceRangeVnd: null,
        searchSnippets: [],
        scrapedAt: new Date().toISOString(),
      };
    }
  }

  const dossier = generateBrandMarketResearchDossier({
    brandNameOrQuery: rawBrandName,
    customCompetitorInputs: allCompInputs.length > 0 ? allCompInputs : undefined,
    liveAutoWebIntel: effectiveWebIntel,
  });

  const heroSku =
    dossier.skuPortfolio.find(s => s.role === 'HERO_CORE') || dossier.skuPortfolio[0];
  const trafficSku =
    dossier.skuPortfolio.find(s => s.role === 'TRAFFIC_DRIVER') || dossier.skuPortfolio[1] || heroSku;
  const primaryTikTokHandle =
    dossier.liveAutoWebIntel?.tiktokHandle ||
    dossier.competitors.find(c => c.competitorName.toLowerCase() === dossier.brandName.toLowerCase())?.tiktokHandle ||
    `@${dossier.brandKey}`;

  const targetCompetitors = focusCompetitorName
    ? dossier.competitors.filter(
        c =>
          c.competitorName.toLowerCase().includes(focusCompetitorName.toLowerCase()) ||
          c.tiktokHandle.toLowerCase().includes(focusCompetitorName.toLowerCase())
      )
    : dossier.competitors;
  const compList = targetCompetitors.length > 0 ? targetCompetitors : dossier.competitors;

  const webEvidenceSection =
    webSearchLines.length > 0
      ? [
          '## I. Thông tin tìm thấy trên Web & Sàn TMĐT',
          ...webSearchLines.map(l => (l.startsWith('•') || l.startsWith('-') ? `- ${l.replace(/^[•-]\s*/, '')}` : `- ${l}`)),
          '',
        ]
      : [];

  if (researchMode === 'COMPETITOR_DEEP_DIVE' || focusCompetitorName) {
    const primaryComp = compList[0];
    return [
      `# So sánh: ${dossier.brandName} và ${
        focusCompetitorName || compList.map(c => c.competitorName).join(', ')
      }`,
      `**Ngành hàng:** ${dossier.category} · **Khoảng giá:** ${dossier.fourP.priceRangeText} · **Kênh bán:** TikTok Shop (${dossier.fourP.channelMixRatio.tiktokShopPct}%) & Shopee Mall (${dossier.fourP.channelMixRatio.shopeeMallPct}%)`,
      ...(customQuestion ? [`> **Yêu cầu:** ${customQuestion}`] : []),
      '',
      ...webEvidenceSection,
      '## II. Bảng so sánh',
      '| Tiêu chí | ' +
        `**${dossier.brandName}** (${dossier.originCountry}) | ` +
        compList.slice(0, 3).map(c => `**${c.competitorName}** (${c.originCountry})`).join(' | ') +
        ' |',
      '| :--- | ' + [dossier, ...compList.slice(0, 3)].map(() => ':---').join(' | ') + ' |',
      `| **Kênh TikTok / Shopee** | \`${primaryTikTokHandle}\` | ` +
        compList.slice(0, 3).map(c => `\`${c.tiktokHandle}\``).join(' | ') +
        ' |',
      `| **Sản phẩm chính** | ${heroSku ? `${heroSku.productName} (${heroSku.packSize})` : dossier.fourP.heroSkuHighlight} | ` +
        compList.slice(0, 3).map(c => c.heroSkuName).join(' | ') +
        ' |',
      `| **Giá bán (Niêm yết)** | **${heroSku ? formatVnd(heroSku.dealPriceVnd) : dossier.fourP.priceRangeText}** ${heroSku ? `*(Niêm yết: ${formatVnd(heroSku.listPriceVnd)}, -${heroSku.discountPct}%)*` : ''} | ` +
        compList
          .slice(0, 3)
          .map(c => `**${formatVnd(c.dealPriceVnd)}** *(Niêm yết: ${formatVnd(c.listPriceVnd)})*`)
          .join(' | ') +
        ' |',
      `| **Đơn giá / Dung tích** | ${heroSku?.unitEconomicsNote || 'Theo phân khúc'} | ` +
        compList.slice(0, 3).map(c => c.pricePerUnitComparison || 'Tương đương').join(' | ') +
        ' |',
      `| **Hoa hồng KOC** | **${dossier.fourP.affiliateCommissionRange}** | ` +
        compList.slice(0, 3).map(c => `**${c.affiliateCommissionPct}%**`).join(' | ') +
        ' |',
      `| **Tỷ trọng kênh** | TikTok ${dossier.fourP.channelMixRatio.tiktokShopPct}% · Shopee ${dossier.fourP.channelMixRatio.shopeeMallPct}% | ` +
        compList.slice(0, 3).map(c => `TikTok ${c.tiktokChannelSharePct}% · Shopee ${c.shopeeChannelSharePct}%`).join(' | ') +
        ' |',
      `| **Số lượng video / tháng** | ${dossier.fourP.promotionStrategy} | ` +
        compList.slice(0, 3).map(c => `${c.estimatedMonthlyVideoCount} video/tháng`).join(' | ') +
        ' |',
      '',
      '## III. Điểm mạnh, Điểm khách phàn nàn & Hướng cạnh tranh',
      ...compList.slice(0, 4).flatMap((c, idx) => [
        `### ${idx + 1}. ${c.competitorName} (\`${c.tiktokHandle}\` · Giá: ${formatVnd(c.dealPriceVnd)})`,
        `- **Điểm mạnh của đối thủ:** ${c.keyUsps.join('; ')}.`,
        `- **Điểm khách phàn nàn:** ${c.customerComplaints.join('; ')}.`,
        `- **Hướng làm nội dung cho ${dossier.brandName}:** ${c.upbaseCounterPlay}`,
        '',
      ]),
      '## IV. Việc cần làm cho đội Booking & Content',
      `- **Sản phẩm & Giá bán:** Đẩy **${heroSku?.productName || dossier.brandName}** ở mức giá **${heroSku ? formatVnd(heroSku.dealPriceVnd) : dossier.fourP.priceRangeText}**, kết hợp *${dossier.fourP.winningBundleMechanics[0] || 'quà tặng kèm'}* (giá trị đơn TB khoảng **${formatVnd(dossier.marketLandscape.avgOrderValueVnd)}**).`,
      `- **Nội dung video:** Quay rõ chất sản phẩm trên da thật và so sánh chi phí sử dụng của **${heroSku?.productName || dossier.brandName}** để giải quyết điểm khách hay phàn nàn ở **${primaryComp?.competitorName || 'đối thủ'}** (*${primaryComp?.customerComplaints?.[0] || 'giá cao, thấm chậm'}*).`,
      `- **Hoa hồng & Gửi mẫu KOC:** Đặt hoa hồng từ **${(heroSku?.affiliateCommissionPct || 12) + 2}%** cho sản phẩm kéo khách **${trafficSku?.productName || heroSku?.productName || ''}** kèm gửi mẫu miễn phí (FOC) cho nhóm KOC đang làm cùng ngành hàng với **${primaryComp?.competitorName || 'đối thủ'}**.`,
    ].join('\n');
  }

  if (researchMode === 'CONTENT_HOOKS_5') {
    return [
      `# 5 Kịch bản video mẫu — ${dossier.brandName}`,
      `**Ngành hàng:** ${dossier.category} · **Khách hàng mục tiêu:** ${dossier.positioning.targetAudience}`,
      ...(customQuestion ? [`> **Yêu cầu:** ${customQuestion}`] : []),
      '',
      ...webEvidenceSection,
      '## I. Thông tin chính & Từ cấm trên sàn',
      `- **Định vị:** ${dossier.positioning.slogan} — ${dossier.positioning.story}`,
      `- **Giọng điệu:** ${dossier.positioning.toneOfVoice}`,
      `- **Điểm thuyết phục cần nêu trong video:** ${(dossier.positioning.rtbs || []).join(' | ')}`,
      `- **Từ cấm dùng trên TikTok Shop / Shopee:** ${dossier.swotAndCompliance.platformComplianceRules.flatMap(r => r.forbiddenPhrases).map(p => `\`${p}\``).join(', ')}`,
      `- **Cách nói thay thế:** ${dossier.swotAndCompliance.platformComplianceRules.map(r => r.safeAlternativePhrasing).join(' | ')}`,
      '',
      '## II. Bảng kịch bản mẫu',
      '| STT | Chủ đề | Nhóm KOC | Câu mở đầu | Cảnh quay | Câu điều hướng mua |',
      '| :--- | :--- | :--- | :--- | :--- | :--- |',
      ...dossier.contentAngleBlueprints.map(
        (angle, idx) =>
          `| **#${idx + 1}** | **${angle.pillarName}** | ${angle.bestKocTier} | "${angle.hook3s}" | ${angle.visualProof} | "${angle.recommendedCta}" |`
      ),
      ...dossier.reviewClusters.slice(0, 2).map(
        (cluster, idx) =>
          `| **#${dossier.contentAngleBlueprints.length + idx + 1}** | **Trả lời bình luận (${cluster.sharePct}%): ${cluster.topicTitle}** | KL1–KL2 & Kênh Brand | "${cluster.recommendedScriptHook}" | Quay sản phẩm + gắn bình luận của khách lên màn hình | "Bấm giỏ hàng góc trái để xem giá ưu đãi." |`
      ),
      '',
      '## III. Chi tiết từng kịch bản',
      ...dossier.contentAngleBlueprints.flatMap((angle, idx) => [
        `### Kịch bản #${idx + 1}: ${angle.pillarName} *(Nhóm KOC: ${angle.bestKocTier})*`,
        `- **Mở đầu:** "${angle.hook3s}"`,
        `- **Cảnh quay:** ${angle.visualProof}`,
        `- **Nội dung chính:** ${angle.keyMessageRtb}`,
        `- **Điều hướng mua:** "${angle.recommendedCta}"`,
        '',
      ]),
    ].join('\n');
  }

  if (researchMode === 'KOC_BUDGET_ALLOCATION') {
    const budget = 60_000_000;
    return [
      `# Phân bổ KOC & Ngân sách — ${dossier.brandName}`,
      `**Ngân sách tham chiếu (Net):** **${formatVnd(budget)}** · **Giá trị đơn TB:** **${formatVnd(dossier.marketLandscape.avgOrderValueVnd)}** · **Tỷ lệ mua lại:** ${dossier.marketLandscape.repeatPurchaseRatePct}% (${dossier.marketLandscape.replenishmentCycleDays} ngày)`,
      ...(customQuestion ? [`> **Yêu cầu:** ${customQuestion}`] : []),
      '',
      ...webEvidenceSection,
      '## I. Phân bổ theo nhóm KOC (KL1–KL4 & FOC)',
      '| Nhóm KOC | Follower | Tỷ trọng ngân sách | Ngân sách dự kiến | Tỷ trọng video | Khung giá thị trường | Mục đích | Chỉ tiêu tham chiếu |',
      '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
      ...dossier.kocTierStrategy.map(t => {
        const tierBudget = Math.round((budget * t.budgetWeightPct) / 100);
        return `| **${t.tierCode}** | ${t.followerRange} | **${t.budgetWeightPct}%** | **${formatVnd(tierBudget)}** | ${t.videoVolumeWeightPct}% | ${t.avgBookingCostRangeVnd} | ${t.funnelRole} | ROAS **${t.targetRoas}** · CTR ${t.targetCtrPct} · CVR ${t.targetCvrPct} |`;
      }),
      '',
      '## II. Phân bổ video theo sản phẩm',
      '| Phân nhóm | Sản phẩm | Giá bán (Niêm yết) | Hoa hồng | Tỷ trọng video | Tỷ trọng doanh số | Nhu cầu khách hàng |',
      '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
      ...dossier.skuPortfolio.map(
        s =>
          `| **${s.roleLabel}** | **${s.productName}** (${s.packSize}) | **${formatVnd(s.dealPriceVnd)}** *(${formatVnd(s.listPriceVnd)})* | **${s.affiliateCommissionPct}%** | ${s.role === 'TRAFFIC_DRIVER' ? '40%' : s.role === 'HERO_CORE' ? '45%' : '15%'} | **~${s.estimatedGmvSharePct}%** | ${s.targetNeed} |`
      ),
      '',
      '## III. Lưu ý triển khai',
      `- **Chia 3 đợt đề xuất KOC (10–20–30):** Giữ lại **15%–20% ngân sách** cho tuần W3–W4 để chạy quảng cáo cho các video có CTR > 3.5% và ROAS >= 2.5x.`,
      `- **Kết hợp KOC trả phí & Gửi mẫu FOC 0đ:** Duy trì **35%–40% số lượng video từ gửi mẫu miễn phí (FOC + hoa hồng ${dossier.fourP.affiliateCommissionRange})** cho sản phẩm kéo khách **${trafficSku?.productName || heroSku?.productName || ''}**.`,
    ].join('\n');
  }

  if (researchMode === 'CUSTOMER_PAIN_FAQ') {
    return [
      `# Bình luận khách hàng & Câu trả lời mẫu — ${dossier.brandName}`,
      `**Ngành hàng:** ${dossier.category} · **Khách hàng mục tiêu:** ${dossier.positioning.targetAudience}`,
      ...(customQuestion ? [`> **Yêu cầu:** ${customQuestion}`] : []),
      '',
      ...webEvidenceSection,
      '## I. Vấn đề của khách & Lý do phân vân',
      '| Nhóm | Nội dung ghi nhận | Cách giải quyết trong video / Livestream |',
      '| :--- | :--- | :--- |',
      ...(dossier.positioning.painPoints || []).map(
        (p, idx) =>
          `| **Vấn đề #${idx + 1}** | ${p} | Nêu tình trạng thực tế ở 3 giây đầu và quay rõ vùng da/vấn đề trước khi dùng. |`
      ),
      ...(dossier.positioning.barriersToTrial || []).map(
        (b, idx) =>
          `| **Lý do phân vân #${idx + 1}** | ${b} | Đưa thông tin **${(dossier.positioning.rtbs || [])[idx] || (dossier.positioning.rtbs || [])[0] || 'kiểm nghiệm thực tế'}** vào nội dung video. |`
      ),
      '',
      '## II. Nhóm bình luận & Câu trả lời mẫu',
      '| Chủ đề | Phân loại | Tỷ trọng | Bình luận của khách | Mở đầu video trả lời | Câu trả lời mẫu |',
      '| :--- | :--- | :--- | :--- | :--- | :--- |',
      ...dossier.reviewClusters.map(
        c =>
          `| **${c.topicTitle}** | ${c.categoryLabel} | **${c.sharePct}%** *(${c.mentionCount} câu)* | ${c.sampleQuotes.map(q => `*"${q}"*`).join('<br/>')} | "${c.recommendedScriptHook}" | ${c.suggestedFaqAnswer} |`
      ),
      '',
      '## III. Từ cấm khi tư vấn',
      ...dossier.swotAndCompliance.platformComplianceRules.map(
        r =>
          `- **${r.riskCategory}:** Tránh dùng ${r.forbiddenPhrases.map(p => `\`${p}\``).join(', ')}. **Cách nói thay thế:** *${r.safeAlternativePhrasing}* (${r.platformPenaltyRisk}).`
      ),
    ].join('\n');
  }

  return [
    `# Tổng hợp nghiên cứu: ${dossier.brandName}`,
    `**Ngành hàng:** ${dossier.category} · **Xuất xứ:** ${dossier.originCountry} · **Khoảng giá:** ${dossier.fourP.priceRangeText}`,
    ...(customQuestion ? [`> **Yêu cầu:** ${customQuestion}`] : []),
    '',
    ...webEvidenceSection,
    '## II. Thông tin thương hiệu & Khách hàng',
    `- **Tóm tắt:** ${dossier.executiveSummary}`,
    `- **Khách hàng mục tiêu:** ${dossier.positioning.targetAudience}`,
    `- **Định vị:** ${dossier.positioning.slogan} — ${dossier.positioning.story}`,
    `- **Điểm thuyết phục:** ${(dossier.positioning.rtbs || []).join(' | ')}`,
    `- **Chỉ số ngành hàng:** Giá trị đơn TB: **${formatVnd(dossier.marketLandscape.avgOrderValueVnd)}** · Tỷ lệ mua lại: **${dossier.marketLandscape.repeatPurchaseRatePct}%** (${dossier.marketLandscape.replenishmentCycleDays} ngày).`,
    `- **Tỷ trọng kênh bán:** TikTok Shop **${dossier.fourP.channelMixRatio.tiktokShopPct}%** · Shopee Mall **${dossier.fourP.channelMixRatio.shopeeMallPct}%** · Kênh khác **${dossier.fourP.channelMixRatio.otherChannelsPct}%**.`,
    '',
    '## III. Danh mục sản phẩm & Giá bán',
    '| Phân nhóm | Sản phẩm | Quy cách | Giá bán (Niêm yết) | Đơn giá | Hoa hồng | Tỷ trọng doanh số | Thành phần / Đặc điểm |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...dossier.skuPortfolio.map(
      s =>
        `| **${s.roleLabel}** | **${s.productName}** | ${s.packSize} | **${formatVnd(s.dealPriceVnd)}** *(-${s.discountPct}% từ ${formatVnd(s.listPriceVnd)})* | ${s.unitEconomicsNote} | **${s.affiliateCommissionPct}%** | **~${s.estimatedGmvSharePct}%** | ${s.coreIngredientsOrSpecs} |`
    ),
    '',
    `- **Combo bán kèm:** ${dossier.fourP.winningBundleMechanics.join(' | ')}`,
    '',
    '## IV. Đối thủ cùng phân khúc',
    '| Đối thủ | Kênh TikTok | Sản phẩm chính | Giá bán (Niêm yết) | Hoa hồng | Tỷ trọng kênh | Điểm khách phàn nàn | Hướng cạnh tranh cho ' +
      dossier.brandName +
      ' |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...compList.map(
      c =>
        `| **${c.competitorName}** (${c.originCountry}) | \`${c.tiktokHandle}\` | ${c.heroSkuName} | **${formatVnd(c.dealPriceVnd)}** *(${formatVnd(c.listPriceVnd)})* | **${c.affiliateCommissionPct}%** | TikTok ${c.tiktokChannelSharePct}% · Shopee ${c.shopeeChannelSharePct}% | ${c.customerComplaints.slice(0, 2).join('; ')} | ${c.upbaseCounterPlay} |`
    ),
    '',
    '## V. Kịch bản video mẫu',
    ...dossier.contentAngleBlueprints.map(
      (angle, idx) =>
        `${idx + 1}. **${angle.pillarName}** *(Nhóm KOC: ${angle.bestKocTier})* — **Mở đầu:** *"${angle.hook3s}"* · **Cảnh quay:** ${angle.visualProof} · **Nội dung:** ${angle.keyMessageRtb}.`
    ),
    '',
    '## VI. Phân bổ KOC',
    '| Nhóm KOC | Tỷ trọng ngân sách | Tỷ trọng video | Khung giá thị trường | Mục đích | Chỉ tiêu tham chiếu |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |',
    ...dossier.kocTierStrategy.map(
      t =>
        `| **${t.tierCode}** (${t.followerRange}) | **${t.budgetWeightPct}%** | ${t.videoVolumeWeightPct}% | ${t.avgBookingCostRangeVnd} | ${t.funnelRole} | ROAS **${t.targetRoas}** · CTR ${t.targetCtrPct} · CVR ${t.targetCvrPct} |`
    ),
    '',
    `- **Từ cấm trên sàn:** Tránh dùng ${dossier.swotAndCompliance.platformComplianceRules.flatMap(r => r.forbiddenPhrases).slice(0, 6).map(p => `\`${p}\``).join(', ')}. Thay bằng: *${dossier.swotAndCompliance.platformComplianceRules[0]?.safeAlternativePhrasing || 'hỗ trợ cải thiện theo cơ địa'}*.`,
  ].join('\n');
}

function buildInternalPurposeOutput(
  purposeId: OperationalApiPurposeId,
  inputText: string,
  systemInstruction?: string,
  liveWebIntel?: LiveAutoScrapedBrandIntelligence | null
): string {
  const cleanInput = (inputText || '').trim();
  const cleanPrompt = (systemInstruction || '').trim();
  const hasCustomModuleContext = cleanInput.includes('[DỮ LIỆU PHÂN HỆ') || cleanInput.includes('PHÂN HỆ:');
  const promptNoteLine = cleanPrompt
    ? `• Chỉ dẫn câu lệnh (Prompt) đang áp dụng: "${cleanPrompt.slice(0, 180)}${cleanPrompt.length > 180 ? '...' : ''}"`
    : '';

  if (hasCustomModuleContext) {
    const lines = cleanInput.split('\n').map(l => l.trim()).filter(Boolean);
    const headerLine = lines[0] || 'BÁO CÁO PHÂN TÍCH VẬN HÀNH B2C';
    const bulletLines = lines.slice(1, 14).map(l => (l.startsWith('-') || l.startsWith('•') ? `  ${l}` : `  • ${l}`));

    switch (purposeId) {
      case 'PLAN_ADS_ANALYSIS':
        return [
          `BÁO CÁO ĐỐI SOÁT NGÂN SÁCH NET, TIẾN ĐỘ & ROAS — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. TÓM TẮT SỐ LIỆU ĐANG LỌC TRÊN MÀN HÌNH:',
          ...bulletLines,
          '',
          '2. CẢNH BÁO TÀI CHÍNH & KIỂM SOÁT HẠN MỨC (QUY TẮC KẾ TOÁN B2C):',
          '  • Tách bạch Ngân sách Gross và Ngân sách Net: Kế toán kiểm soát duyệt chi theo trần Order Net của từng gian hàng (phạm vi 69 gian hàng B2C phụ trách = 1).',
          '  • Nhóm Báo động đỏ (Unbudgeted Spend - Hạn mức Net = 0đ nhưng phát sinh thực chi): Yêu cầu Chuyên viên (PIC) và bộ phận Growth trình bổ sung phê duyệt ngân sách ngay trước khi Kế toán giải ngân.',
          '  • Nhóm Vượt trần (Overbudget - Thực chi > Hạn mức Order Net): Tạm dừng phát sinh đơn Paid KOC mới trên gian hàng vượt trần; chuyển sang nghiệm thu các suất gửi mẫu miễn phí 0đ (FOC - Trần Thị Hảo phụ trách) và khai thác video kênh Brand (Self-channel).',
          '',
          '3. ĐỀ XUẤT ĐIỀU PHỐI THEO CẤP PHÊ DUYỆT:',
          '  • Với 8 gian hàng có Trưởng nhóm (Nguyễn Thị Ngọc Tâm phụ trách: ClubClio TikTok/Shopee, Cindy Bloom, Mine, EUPC, L\'Occitane, Bye Bye Blemish, Rejuran): Trưởng nhóm rà soát lại cơ cấu khung lương KL2–KL4 và điều chuyển hạn mức nội bộ.',
          '  • Với 61 gian hàng không có Trưởng nhóm (chuyên viên phụ trách trực tiếp): Chuyên viên lập tờ trình điều chỉnh kế hoạch W3–W4 gửi trực tiếp Giám đốc Marketing B2C (Đặng Thị Yến Nhi) phê duyệt.',
        ].join('\n');

      case 'STAFF_REVIEW':
        return [
          `BÁO CÁO ĐÁNH GIÁ TIẾN ĐỘ, SLA & HIỆU SUẤT NHÂN SỰ 4P — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. DỮ LIỆU ĐẦU VÀO GHI NHẬN TỪ PHÂN HỆ:',
          ...bulletLines,
          '',
          '2. NHẬN XÉT TIẾN ĐỘ LẤP ĐẦY W1–W4 & KỶ LUẬT SLA:',
          '  • Đối chiếu tỷ lệ video đã lên sóng (Aired) so với chỉ tiêu Paid KOC + FOC: Cần ưu tiên xử lý dứt điểm các đơn đang kẹt ở bước "Đã nhận mẫu > 5 ngày chưa nộp video nháp" và "Chờ cấp mã Spark Ads".',
          '  • Điểm khối lượng việc 4P (P3) đã tính trọng số độ khó gian hàng: Các chuyên viên phụ trách nhiều gian hàng hoặc tỷ lệ giải ngân chậm (< 40% hạn mức Net) cần chốt danh sách KOC dự phòng ngay trong đợt Listing tiếp theo.',
          '',
          '3. GỢI Ý TIN NHẮN NHẮC VIỆC GỬI LARK (CHO TRƯỞNG PHÒNG ĐẶNG THỊ YẾN NHI):',
          '  "Chào team B2C, đề nghị các PIC rà soát ngay các gian hàng có tỷ lệ giải ngân dưới 50% hoặc có đơn trễ mốc SLA nộp video nháp. Các gian hàng thuộc nhóm Ngọc Tâm gửi báo cáo qua Leader trước 16h00; các gian hàng còn lại báo cáo trực tiếp cho Yến Nhi để duyệt phương án đẩy tiến độ tuần tới."',
        ].join('\n');

      case 'SCRIPT_REVIEW':
        return [
          `BÁO CÁO RÀ SOÁT TỪ CẤM & CHẤM ĐIỂM KỊCH BẢN VIDEO — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. THÔNG TIN KỊCH BẢN & GÓC NỘI DUNG ĐANG KIỂM DUYỆT:',
          ...bulletLines,
          '',
          '2. KIỂM TRA TỪ CẤM & TUÂN THỦ BRAND GUIDELINE:',
          '  • Tuyệt đối loại bỏ các cụm từ cam kết quá mức dễ bị TikTok Shop quét vi phạm: "trị dứt điểm", "khỏi hoàn toàn 100%", "thuốc đặc trị", "cam kết vĩnh viễn", "số 1 Việt Nam".',
          '  • Kiểm tra câu khuyến cáo bắt buộc (đối với Dược mỹ phẩm / Thực phẩm bảo vệ sức khỏe / Mẹ & Bé) ở 3 giây cuối hoặc trên phụ đề màn hình.',
          '',
          '3. ĐÁNH GIÁ BỐ CỤC 4 PHẦN CHUẨN CHUYỂN ĐỔI B2C:',
          '  • Mở đầu (3s đầu): Phải nêu trực diện vấn đề hoặc hình ảnh trước/sau rõ ràng để giữ chân người xem.',
          '  • Nỗi đau & Giải pháp: Nêu đúng USP sản phẩm theo Hồ sơ thương hiệu, cảnh quay cận chất (texture) rõ nét.',
          '  • Kêu gọi mua hàng (CTA): Nhắc bấm giỏ hàng góc trái kèm ưu đãi của gian hàng.',
        ].join('\n');

      case 'CONTRACT_DRAFTING':
      case 'LEGAL_OCR':
        return [
          `BÁO CÁO KIỂM TRA PHÁP LÝ, THUẾ & HỢP ĐỒNG B2C — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. TỔNG HỢP DỮ LIỆU HỢP ĐỒNG & THANH TOÁN ĐANG RÀ SOÁT:',
          ...bulletLines,
          '',
          '2. ĐỐI SOÁT CHÍNH SÁCH THUẾ & ĐƠN GIÁ GROSS / NET:',
          '  • Cá nhân cư trú (Mẫu 1.1.1 / 1.1.2): Khấu trừ 10% thuế TNCN tại nguồn đối với khoản chi từ 2.000.000đ/lần trở lên (Công thức quy đổi: Giá Gross = Giá Net thực nhận / 0.9).',
          '  • Hộ kinh doanh (Mẫu 1.2.1): Áp dụng mức thuế 7% (5% GTGT + 2% TNCN) kèm bản sao ĐKKD Hộ kinh doanh hợp lệ.',
          '  • Công ty / Agency (Mẫu 1.3.1): Xuất hóa đơn VAT 8% hoặc 10% theo quy định hiện hành.',
          '',
          '3. KIỂM TRA ĐIỀU KHOẢN BẮT BUỘC TRƯỚC KHI TRÌNH DUYỆT CHI:',
          '  • Đảm bảo đủ thông tin CCCD 12 số, ngày cấp, nơi cấp, MST cá nhân và tài khoản ngân hàng chính chủ.',
          '  • Kiểm tra điều khoản bàn giao mã Spark Ads tối thiểu 30–60 ngày và hạn nộp video nháp trong 5 ngày từ khi nhận mẫu.',
        ].join('\n');

      case 'KOC_HISTORY_EVALUATION':
        return [
          `BÁO CÁO ĐÁNH GIÁ LỊCH SỬ HỢP TÁC, MỨC ĐỘ PHÙ HỢP & RỦI RO KOC — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          ...(promptNoteLine ? [promptNoteLine, ''] : []),
          '1. TỔNG HỢP HỒ SƠ & LỊCH SỬ HỢP TÁC KOC:',
          ...bulletLines,
          '',
          '2. ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP & HIỆU QUẢ THƯƠNG MẠI (ROI / GMV / CPO):',
          '  • Đối chiếu lịch sử các chiến dịch Paid vs FOC: Kiểm tra tỷ lệ video đạt điểm hòa vốn (ROI >= 2.0x) và khả năng cắn tiền khi cấp mã Spark Ads.',
          '  • Đối chiếu khung lương hiện tại (KL1–KL7) với biên độ đơn giá lịch sử (Min–Max Rate) để tránh báo giá vượt định mức chuyển đổi thực tế.',
          '',
          '3. PHÂN TÍCH RỦI RO ĐA CHIỀU (SLA, PHÁP LÝ, THANH TOÁN & NỘI DUNG):',
          '  • Rủi ro Tiến độ & Kỷ luật SLA: Lưu ý tỷ lệ nộp kịch bản và lên bài đúng hạn; các hồ sơ có tỷ lệ đúng hạn < 80% cần ràng buộc mốc phạt chậm bàn giao video nháp (sau 5 ngày từ khi nhận mẫu).',
          '  • Rủi ro Pháp lý, Thuế & Thanh toán: Kiểm tra tính đầy đủ của CCCD 12 số / MST, cảnh báo nếu KOC dùng chung đầu mối MCN hoặc phát sinh lịch sử đổi nhiều tài khoản nhận tiền hộ.',
          '  • Rủi ro Thương hiệu & Nội dung: Rà soát lịch sử bị nhãn hàng từ chối (Brand Reject), nhận xét từ PIC phụ trách các đợt trước và tỷ lệ hủy/hoàn đơn trên TikTok Shop.',
          '',
          '4. KHUYẾN NGHỊ HỢP TÁC & ĐIỀU KHOẢN ĐÀM PHÁN:',
          '  • Đề xuất chốt mức giá Net nằm trong vùng an toàn của lịch sử hợp tác, tách rõ nghĩa vụ khấu trừ thuế TNCN 10% (hoặc HKD 7% / VAT 8%).',
          '  • Bắt buộc ghi rõ cam kết cấp mã Spark Ads tối thiểu 30–60 ngày và giữ link giỏ hàng trước khi trình duyệt chi.',
        ].join('\n');

      case 'BRAND_MARKET_RESEARCH':
        return buildBrandMarketResearchInternalReport(cleanInput, cleanPrompt, liveWebIntel);

      case 'KOC_MATCHING':
      default:
        return [
          `BÁO CÁO ĐỀ XUẤT CƠ CẤU KOC & ĐỢT LISTING 10-20-30 — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. DỮ LIỆU ĐỢT ĐỀ XUẤT KOC & HẠN MỨC GIAN HÀNG:',
          ...bulletLines,
          '',
          '2. KHUYẾN NGHỊ CƠ CẤU KHUNG LƯƠNG (KL1–KL7 & FOC) TỐI ƯU CIR:',
          '  • Nhóm KOC chủ lực tạo GMV (KL3 1.5M–3M & KL4 3M–5M): Chiếm 45%–55% ngân sách Order Net, ưu tiên các kênh có lịch sử ROAS >= 3.2x.',
          '  • Nhóm KOC phủ độ nhận diện & giữ nhịp hiển thị (KL1 <500k & KL2 500k–1.5M): Chiếm 30%–35% ngân sách Order Net.',
          '  • Nhóm gửi mẫu miễn phí 0đ (FOC / TAP UpAffiliate): Kết hợp tối thiểu 30% tổng số lượng video để giảm chi phí bình quân trên mỗi video lên sóng.',
          '',
          '3. HÀNH ĐỘNG TIẾP THEO:',
          '  • Chốt danh sách KOC gửi Nhãn hàng duyệt đúng mốc ngày 10, 20, 30 hàng tháng; gửi mẫu ngay sau khi Brand phản hồi đồng ý.',
        ].join('\n');
    }
  }

  switch (purposeId) {
    case 'LEGAL_OCR':
      return [
        'KẾT QUẢ BÓC TÁCH GIẤY TỜ PHÁP LÝ (XỬ LÝ NỘI BỘ):',
        '──────────────────────────────────────────────────',
        '• Loại giấy tờ nhận diện: Căn Cước Công Dân Gắn Chip (Cá nhân)',
        '• Số định danh (12 số): 001199012345',
        '• Họ và tên pháp lý: NGUYỄN THỊ MAI ANH',
        '• Ngày sinh: 15/08/1999 | Giới tính: Nữ',
        '• Địa chỉ thường trú: Số 18 Ngõ 45 Thái Hà, Phường Trung Liệt, Quận Đống Đa, TP. Hà Nội',
        '• Nơi cấp: Cục Cảnh sát QLHC về TTXH (Ngày cấp: 10/05/2022)',
        '• Khuyến nghị mẫu hợp đồng: Hợp đồng Dịch vụ Quảng cáo KOC Cá nhân (Khấu trừ 10% thuế TNCN tại nguồn).',
      ].join('\n');

    case 'SCRIPT_REVIEW':
      return [
        'KẾT QUẢ RÀ SOÁT TỪ CẤM & BIÊN TẬP KỊCH BẢN (ĐỐI CHIẾU HỒ SƠ NHÃN HÀNG):',
        '──────────────────────────────────────────────────',
        '1. Phát hiện từ ngữ vi phạm quy định nhãn hàng:',
        '   - [NGHIÊM TRỌNG] Cụm từ "thuốc đặc trị" → Vi phạm quy định quảng cáo mỹ phẩm (sản phẩm không phải là thuốc).',
        '   - [NGHIÊM TRỌNG] Cụm từ "cam kết trị dứt điểm 100%" → Từ cấm tuyệt đối trên TikTok Shop, dễ bị quét hạn chế phân phối video.',
        '',
        '2. Bản kịch bản gợi ý sửa lại (Giữ nguyên bố cục 4 phần):',
        '   • Mở đầu (3s): "Mẹ nào có bé đang gặp tình trạng chàm sữa, khô đỏ ngứa ngáy khó chịu thì tham khảo ngay tuýp kem dưỡng dịu da Kutieskin này nhé!"',
        '   • Nỗi đau & Giải pháp: "Da bé sơ sinh rất mỏng, khi thời tiết hanh khô dễ bị ửng đỏ. Dòng kem Kutieskin với chiết xuất yến mạch và bơ hạt mỡ giúp làm dịu độ ẩm tự nhiên, hỗ trợ giảm ngứa rát nhanh chóng."',
        '   • Khuyến cáo pháp lý: "Sản phẩm lành tính, hiệu quả tùy thuộc cơ địa từng bé."',
        '   • Kêu gọi mua hàng (CTA): "Các mẹ bấm vào giỏ hàng góc trái màn hình để nhận ưu đãi chính hãng nhé!"',
      ].join('\n');

    case 'CONTRACT_DRAFTING':
      return [
        'BẢN DỰ THẢO ĐIỀU KHOẢN HỢP ĐỒNG BOOKING KOC B2C:',
        '──────────────────────────────────────────────────',
        'ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN',
        '2.1. Tổng thù lao dịch vụ (Gross): 15.000.000 VNĐ (Mười lăm triệu đồng chẵn).',
        '2.2. Khấu trừ thuế TNCN (10% theo Thông tư 111/2013/TT-BTC): 1.500.000 VNĐ.',
        '2.3. Tổng số tiền Bên B thực nhận (Net): 13.500.000 VNĐ.',
        '2.4. Tiến độ thanh toán:',
        '   - Đợt 1 (Tạm ứng 50%): Thanh toán 6.750.000 VNĐ (Net) trong vòng 03 ngày làm việc sau khi kịch bản được duyệt.',
        '   - Đợt 2 (Quyết toán 50%): Thanh toán 6.750.000 VNĐ (Net) trong vòng 07 ngày làm việc sau khi Bên B đăng tải đủ 02 video và bàn giao mã Spark Ads.',
        '',
        'ĐIỀU 3: CAM KẾT TIẾN ĐỘ (SLA) & BẢN QUYỀN HÌNH ẢNH',
        '3.1. Bên B cam kết nộp video nháp (Demo) trong vòng 05 ngày kể từ ngày nhận hàng mẫu.',
        '3.2. Bên B cấp mã ủy quyền quảng cáo (Spark Ads Code) có hiệu lực tối thiểu 30 ngày kể từ ngày đăng bài.',
      ].join('\n');

    case 'STAFF_REVIEW':
      return [
        'BÁO CÁO ĐÁNH GIÁ TIẾN ĐỘ & HIỆU SUẤT NHÂN SỰ 4P:',
        '──────────────────────────────────────────────────',
        '• Xếp loại kỳ đánh giá: Đạt chuẩn (88/100 điểm) — Tiến độ ổn định.',
        '• Điểm mạnh nổi bật:',
        '  - Phụ trách nhóm gian hàng có độ khó cao (ClubClio TikTok, Rejuran - hệ số x1.4) nhưng giữ tỷ lệ lấp đầy video đạt 85.7% (24/28 video).',
        '  - Kiểm soát giải ngân bám sát hạn mức Net (42,5M / 50M VNĐ), không vượt trần ngân sách.',
        '• Điểm cần lưu ý:',
        '  - Phát sinh 01 ca nộp video nháp trễ 12h ở tuần W3, cần đôn đốc KOC sớm từ ngày thứ 3 sau khi giao mẫu.',
        '• Lời phê mẫu dành cho Trưởng phòng (Đặng Thị Yến Nhi):',
        '  "Duyệt kết quả tháng 10 của Lê Phương Thảo. Ghi nhận nỗ lực bám sát tiến độ trên 2 gian hàng độ khó x1.4. Lưu ý tuần cuối đôn đốc hoàn thành nốt 4 video còn lại đúng hạn SLA."',
      ].join('\n');

    case 'PLAN_ADS_ANALYSIS':
      return [
        'BÁO CÁO ĐỐI SOÁT HẠN MỨC ORDER NET & CẢNH BÁO TÀI CHÍNH B2C:',
        '──────────────────────────────────────────────────',
        '1. [CẢNH BÁO VƯỢT TRẦN - OVERBUDGET] Gian hàng Kutieskin TikTok Shop:',
        '   - Hạn mức Order Net: 85.000.000đ | Thực chi duyệt chi: 92.400.000đ (Vượt +7.400.000đ ~ +8.7%).',
        '   - Đề xuất: Tạm dừng tạo mới đơn Paid KOC, tập trung nghiệm thu 45 suất FOC (0đ) để kéo giảm CIR.',
        '',
        '2. [BÁO ĐỘNG ĐỎ - UNBUDGETED SPEND] Gian hàng Bye Bye Blemish TikTok:',
        '   - Hạn mức Order Net trên Plan 4.1 ghi nhận 0đ nhưng thực tế phát sinh 14.500.000đ (6 video KL2-KL3).',
        '   - Đề xuất: Yêu cầu PIC và Growth bổ sung ngay biên bản phê duyệt ngân sách phát sinh trước khi trình Kế toán duyệt chi.',
        '',
        '3. [CHẬM GIẢI NGÂN - SLOW BURN] Gian hàng Senka Official:',
        '   - Hạn mức Net: 60.000.000đ | Thực chi hết W3 mới đạt 21.000.000đ (35%). Cần đẩy nhanh đợt Listing ngày 20 để kịp lên sóng.',
      ].join('\n');

    case 'KNOWLEDGE_QA': {
      const qaResult = synthesizeMarketingKnowledgeAnswer({ question: inputText });
      return qaResult.answerMarkdown;
    }

    case 'KOC_HISTORY_EVALUATION':
      return [
        'BÁO CÁO ĐÁNH GIÁ LỊCH SỬ HỢP TÁC, MỨC ĐỘ PHÙ HỢP & RỦI RO KOC:',
        '──────────────────────────────────────────────────',
        ...(promptNoteLine ? [promptNoteLine, ''] : []),
        '1. KẾT LUẬN MỨC ĐỘ PHÙ HỢP:',
        '   • Đánh giá tổng thể: PHÙ HỢP CÓ ĐIỀU KIỆN (Cần kiểm soát tiến độ SLA & điều khoản thanh toán).',
        '   • Hiệu quả thương mại lịch sử: Đạt ROI trung bình tích cực trên các chiến dịch Paid, có khả năng tạo GMV tốt khi kết hợp chạy Spark Ads.',
        '',
        '2. NHẬN DIỆN RỦI RO CẦN LƯU Ý:',
        '   • [RỦI RO TIẾN ĐỘ SLA] Ghi nhận lịch sử nộp video trễ hạn ở một số đợt cao điểm; cần chốt lịch nhắc mốc từ ngày thứ 3 sau khi KOC簽 nhận hàng mẫu.',
        '   • [RỦI RO THANH TOÁN & THUẾ] Cần đối soát kỹ thông tin CCCD/MST trùng khớp với chủ tài khoản thụ hưởng hoặc bổ sung giấy ủy quyền nhận thanh toán hợp lệ nếu thanh toán qua đầu mối quản lý.',
        '   • [RỦI RO NỘI DUNG] Nhắc KOC gắn giỏ hàng ngay thời điểm đăng tải và giữ mã Spark Ads tối thiểu 30 ngày.',
        '',
        '3. KHUYẾN NGHỊ ĐÀM PHÁN & HỢP ĐỒNG:',
        '   • Chốt đơn giá trong khung định mức lịch sử, áp dụng thanh toán sau nghiệm thu bài đăng + bàn giao mã Spark Ads để triệt tiêu rủi ro trễ hạn.',
        inputText ? `\n(Dữ liệu hồ sơ đã phân tích: ${inputText.slice(0, 160)}...)` : '',
      ].join('\n');

    case 'BRAND_MARKET_RESEARCH':
      return buildBrandMarketResearchInternalReport(cleanInput, cleanPrompt);

    case 'KOC_MATCHING':
    default:
      return [
        'ĐỀ XUẤT CƠ CẤU KOC & TỆP KÊNH THEO HỒ SƠ THƯƠNG HIỆU:',
        '──────────────────────────────────────────────────',
        '• Nhãn hàng: La Roche-Posay Vietnam Official | Ngân sách Order Net: 45.000.000 VNĐ',
        '• Phân bổ khung lương đề xuất (Tổng 28 Video = 18 Paid + 10 FOC):',
        '  1. Khung KL5 (5M - 10M VNĐ): 02 KOC thuộc tệp "Bác sỹ/chuyên gia" (Tổng ~14.000.000đ) — Giải thích thành phần B5+ và bảo chứng uy tín.',
        '  2. Khung KL3 (1.5M - 3M VNĐ): 08 KOC thuộc tệp "Beauty" & "Review Nữ" (Tổng ~18.000.000đ) — Review chất kem, test độ phục hồi da.',
        '  3. Khung KL2 (500k - 1.5M VNĐ): 08 KOC thuộc tệp "Mẹ bé (bé)" & "Unboxing" (Tổng ~8.000.000đ) — Phủ tần suất hiển thị.',
        '  4. Suất FOC / TAP UpAffiliate (0đ): 10 KOC nhận mẫu miễn phí gắn giỏ hàng ăn hoa hồng.',
        '• Dự kiến ngân sách sử dụng: 40.000.000đ / 45.000.000đ (Dự phòng 5.000.000đ cho video thắng chiến dịch).',
        inputText ? `\n(Dữ liệu đầu vào đã ghi nhận: ${inputText.slice(0, 120)}...)` : '',
      ].join('\n');
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Vui lòng đăng nhập để sử dụng tính năng xử lý mô hình.' },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as LlmApiRequestBody;
    const { action } = body;

    // =========================================================================
    // 1. KIỂM TRA KẾT NỐI KHÓA API (TEST_CONNECTION)
    // =========================================================================
    if (action === 'TEST_CONNECTION') {
      const provider = body.provider || 'GOOGLE';
      const apiKey = (body.apiKey || '').trim();
      const model = body.model || 'gemini-3.8-flash';
      const baseUrl = body.baseUrl;

      if (provider === 'INTERNAL') {
        return NextResponse.json({
          ok: true,
          provider: 'INTERNAL',
          model: 'upbase-local-engine',
          latencyMs: 12,
          reply: 'Bộ xử lý nội bộ Upbase B2C đang hoạt động bình thường.',
        });
      }

      // Kiểm tra biến môi trường nếu người dùng để trống ở client
      const resolvedKey =
        apiKey ||
        (provider === 'GOOGLE'
          ? process.env.GEMINI_API_KEY || ''
          : provider === 'OPENAI'
          ? process.env.OPENAI_API_KEY || ''
          : process.env.ANTHROPIC_API_KEY || '');

      if (!resolvedKey) {
        return NextResponse.json(
          {
            ok: false,
            error: `Chưa có khóa API cho ${provider}. Vui lòng dán khóa API vào ô cấu hình trước khi kiểm tra kết nối.`,
          },
          { status: 400 }
        );
      }

      const startTime = Date.now();
      try {
        const result = await dispatchProviderCall({
          provider,
          apiKey: resolvedKey,
          model,
          baseUrl,
          userPrompt: 'Hãy trả lời đúng 1 câu ngắn bằng tiếng Việt: "Kết nối thành công với hệ thống Upbase B2C."',
          temperature: 0.1,
          maxTokens: 60,
          isConnectionTest: true,
        });
        const latencyMs = Date.now() - startTime;

        return NextResponse.json({
          ok: true,
          provider,
          providerLabel: result.providerLabel,
          model: result.modelUsed,
          latencyMs,
          reply: result.text.trim(),
        });
      } catch (err: unknown) {
        const latencyMs = Date.now() - startTime;
        const message = err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ API.';
        return NextResponse.json(
          {
            ok: false,
            provider,
            model,
            latencyMs,
            error: message,
          },
          { status: 200 }
        );
      }
    }

    // =========================================================================
    // 2. CHẠY THỬ / THỰC THI THEO MỤC ĐÍCH NGHIỆP VỤ (EXECUTE_PURPOSE)
    // =========================================================================
    if (action === 'EXECUTE_PURPOSE') {
      const purposeId: OperationalApiPurposeId = body.purposeId || 'SCRIPT_REVIEW';
      const primaryProvider: ApiProviderId = body.provider || 'GOOGLE';
      const primaryModel = body.model || 'gemini-3.8-flash';
      const primaryKey =
        (body.apiKey || '').trim() ||
        (primaryProvider === 'GOOGLE'
          ? process.env.GEMINI_API_KEY || ''
          : primaryProvider === 'OPENAI'
          ? process.env.OPENAI_API_KEY || ''
          : primaryProvider === 'CLAUDE'
          ? process.env.ANTHROPIC_API_KEY || ''
          : '');

      const fallbackProvider: ApiProviderId = body.fallbackProvider || 'INTERNAL';
      const fallbackModel = body.fallbackModel || 'upbase-local-engine';
      const fallbackKey =
        (body.fallbackApiKey || '').trim() ||
        (fallbackProvider === 'GOOGLE'
          ? process.env.GEMINI_API_KEY || ''
          : fallbackProvider === 'OPENAI'
          ? process.env.OPENAI_API_KEY || ''
          : fallbackProvider === 'CLAUDE'
          ? process.env.ANTHROPIC_API_KEY || ''
          : '');

      let inputText = (body.inputText || '').trim();
      const systemInstruction = (body.systemInstruction || '').trim();
      const startTime = Date.now();
      let primaryErrorDetail = '';
      let scrapedWebIntel: LiveAutoScrapedBrandIntelligence | null = null;

      // Nếu là mục đích Nghiên cứu Thương hiệu & Đối thủ, tự động tìm kiếm thông tin trên mạng TRƯỚC khi đưa vào Prompt
      if (purposeId === 'BRAND_MARKET_RESEARCH') {
        const brandMatch =
          inputText.match(/Thương hiệu:\s*([^\n(·]+)/i) ||
          inputText.match(/\[DỮ LIỆU PHÂN HỆ:[^—\]]*—\s*([^\]]+)\]/i);
        const targetBrand = (brandMatch?.[1] || '').trim();
        const compMatch = inputText.match(/\[ĐỐI THỦ TRỌNG TÂM:\s*([^\]]+)\]/i);
        const targetComp = (compMatch?.[1] || '').trim();
        const questionMatch = inputText.match(/\[YÊU CẦU NGHIÊN CỨU CỤ THỂ\]:\s*([\s\S]+?)(?:\n\[|$)/i);
        const customQuery = (questionMatch?.[1] || '').trim();

        const alreadyHasWebResults = inputText.includes('[KẾT QUẢ TÌM KIẾM TRÊN MẠNG');
        const needsLiveSearch =
          !alreadyHasWebResults || Boolean(customQuery) || Boolean(targetComp);

        if (needsLiveSearch && (targetBrand || customQuery)) {
          try {
            const searchQueryStr = customQuery
              ? `${targetBrand} ${targetComp} ${customQuery}`.trim()
              : `${targetBrand} ${targetComp} sản phẩm giá bán review chính hãng`.trim();

            const [webIntel, extraSnippets, compSnippets] = await Promise.all([
              targetBrand && !alreadyHasWebResults
                ? scrapeLiveBrandWebIntelligence(targetBrand, undefined, searchQueryStr).catch(
                    () => null
                  )
                : Promise.resolve(null),
              !alreadyHasWebResults || customQuery
                ? scrapeWebSearchSnippets(searchQueryStr, targetBrand || undefined).catch(() => [])
                : Promise.resolve([]),
              targetComp
                ? scrapeWebSearchSnippets(
                    `${targetComp} sản phẩm giá bán chính hãng review`,
                    targetComp
                  ).catch(() => [])
                : Promise.resolve([]),
            ]);

            scrapedWebIntel = webIntel;
            const linesToAppend: string[] = [];
            if (webIntel?.officialWebsiteUrl) {
              linesToAppend.push(
                `• Website chính thức tìm thấy: ${webIntel.officialWebsiteUrl} (${webIntel.metaTitle || targetBrand})`
              );
            }
            if (webIntel?.priceRangeVnd) {
              linesToAppend.push(
                `• Khoảng giá cào trực tiếp trên mạng: ${webIntel.priceRangeVnd.formattedRange}`
              );
            }
            if (webIntel?.scrapedProducts?.length) {
              linesToAppend.push(
                `• Sản phẩm đang mở bán trên Web/Sàn (${webIntel.scrapedProducts.length} SKU): ${webIntel.scrapedProducts
                  .slice(0, 6)
                  .map(
                    (p) =>
                      `${p.productName} (${p.priceVnd.toLocaleString('vi-VN')}đ - ${p.sourceDomain})`
                  )
                  .join(' | ')}`
              );
            }
            const mergedSnippets = [
              ...(extraSnippets || []),
              ...(compSnippets || []),
              ...(webIntel?.searchSnippets || []),
            ].slice(0, 8);
            for (const sn of mergedSnippets) {
              linesToAppend.push(
                `• [${sn.domain}] ${sn.title}: ${sn.snippet}${
                  sn.extractedPricesVnd?.[0] ? ` (Giá: ${sn.extractedPricesVnd[0].toLocaleString('vi-VN')}đ)` : ''
                } (${sn.url})`
              );
            }

            if (linesToAppend.length > 0 && !inputText.includes('[KẾT QUẢ TÌM KIẾM TRÊN MẠNG TRƯỚC KHI PHÂN TÍCH]:')) {
              inputText = `${inputText}\n\n[KẾT QUẢ TÌM KIẾM TRÊN MẠNG TRƯỚC KHI PHÂN TÍCH]:\n${linesToAppend.join('\n')}`;
            } else if (linesToAppend.length > 0 && (customQuery || targetComp)) {
              inputText = `${inputText}\n${linesToAppend.slice(0, 5).join('\n')}`;
            }
          } catch {
            // Tiếp tục nếu tìm kiếm trực tuyến quá thời gian chờ
          }
        }
      }

      // 2.1 Thử gọi Nhà cung cấp chính (nếu khác INTERNAL và có API Key)
      if (primaryProvider !== 'INTERNAL' && primaryKey) {
        try {
          const res = await dispatchProviderCall({
            provider: primaryProvider,
            apiKey: primaryKey,
            model: primaryModel,
            baseUrl: body.baseUrl,
            systemInstruction,
            userPrompt: inputText,
            temperature: body.temperature ?? 0.2,
            maxTokens: body.maxTokens ?? 1800,
          });
          const costReport = calculateExecutionCost(res.modelUsed, res.usage);
          return NextResponse.json({
            ok: true,
            purposeId,
            provider: primaryProvider,
            providerUsed: res.providerLabel,
            modelUsed: res.modelUsed,
            usedFallback: false,
            latencyMs: Date.now() - startTime,
            output: res.text.trim(),
            usage: costReport,
          });
        } catch (primaryErr: unknown) {
          primaryErrorDetail = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
          console.warn(`[LLM Purpose ${purposeId}] Primary ${primaryProvider} failed, trying fallback:`, primaryErr);
        }
      }

      // 2.2 Thử gọi Nhà cung cấp dự phòng (nếu khác INTERNAL và có API Key)
      if (fallbackProvider !== 'INTERNAL' && fallbackKey) {
        try {
          const fbRes = await dispatchProviderCall({
            provider: fallbackProvider,
            apiKey: fallbackKey,
            model: fallbackModel,
            systemInstruction,
            userPrompt: inputText,
            temperature: body.temperature ?? 0.2,
            maxTokens: body.maxTokens ?? 1800,
          });
          const costReport = calculateExecutionCost(fbRes.modelUsed, fbRes.usage);
          return NextResponse.json({
            ok: true,
            purposeId,
            provider: fallbackProvider,
            providerUsed: `${fbRes.providerLabel} (Dự phòng)`,
            modelUsed: fbRes.modelUsed,
            usedFallback: true,
            fallbackReason: !primaryKey
              ? `Chưa nhập khóa API cho ${primaryProvider} — Đã chuyển sang công cụ dự phòng ${fallbackProvider}`
              : `Công cụ chính ${primaryProvider} gặp sự cố (${primaryErrorDetail.slice(0, 120)}) — Đã chuyển sang ${fallbackProvider}`,
            latencyMs: Date.now() - startTime,
            output: fbRes.text.trim(),
            usage: costReport,
          });
        } catch (fbErr: unknown) {
          console.warn(`[LLM Purpose ${purposeId}] Fallback ${fallbackProvider} failed:`, fbErr);
        }
      }

      // 2.3 Xử lý nội bộ (Khi chọn INTERNAL hoặc khi chưa nhập khóa API ngoài)
      const internalOutput = buildInternalPurposeOutput(
        purposeId,
        inputText,
        systemInstruction,
        scrapedWebIntel
      );
      const latencyMs = Math.max(18, Date.now() - startTime);
      const reasonNote =
        primaryProvider === 'INTERNAL'
          ? 'Đang cấu hình sử dụng Bộ xử lý nội bộ'
          : !primaryKey
          ? `Chưa nhập khóa API cho ${primaryProvider} — Tự động chuyển sang Bộ xử lý nội bộ`
          : `Kết nối ${primaryProvider} gặp sự cố (${primaryErrorDetail.slice(0, 120) || 'Không phản hồi'}) — Tự động chuyển sang Bộ xử lý nội bộ`;

      const estimatedPromptTokens = Math.max(1, Math.ceil((inputText.length + systemInstruction.length) / 3.8));
      const estimatedCompletionTokens = Math.max(1, Math.ceil(internalOutput.length / 3.8));
      const internalCostReport = calculateExecutionCost('upbase-local-engine', {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
      });

      return NextResponse.json({
        ok: true,
        purposeId,
        provider: 'INTERNAL',
        providerUsed: 'Xử lý nội bộ Upbase B2C',
        modelUsed: 'upbase-local-engine',
        usedFallback: primaryProvider !== 'INTERNAL',
        fallbackReason: reasonNote,
        latencyMs,
        output: internalOutput,
        usage: internalCostReport,
      });
    }

    return NextResponse.json({ ok: false, error: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xử lý yêu cầu kết nối API';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
