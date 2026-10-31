import type { ContractActor, ContractRecord, LegalTemplate } from '../../lib/contracts/types';
import { browserDemoRequest, disableBrowserDemo, enableBrowserDemo } from './browserDemo';

export interface ContractBootstrap {
  actor: ContractActor;
  reviewers: ContractActor[];
  demoActors: ContractActor[];
  templates: LegalTemplate[];
  records: ContractRecord[];
  config: { ai: boolean; wesign: boolean; contractSystem?: boolean; storage: string; googleShareEmail?: string };
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const CONTRACT_BOOTSTRAP_TTL_MS = 25_000;
const CONTRACT_BOOTSTRAP_SESSION_KEY = 'upbase_contract_bootstrap_cache_v1';

let contractBootstrapCache: {
  userId: string;
  data: ContractBootstrap;
  fetchedAt: number;
} | null = null;
let inflightBootstrapPromise: { userId: string; promise: Promise<ContractBootstrap> } | null = null;

function currentSelectedUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('upbase_selected_user_id') || '';
  } catch {
    return '';
  }
}

export function getCachedContractBootstrap(userId?: string): ContractBootstrap | null {
  const targetUser = userId ?? currentSelectedUserId();
  if (contractBootstrapCache && contractBootstrapCache.userId === targetUser) {
    return contractBootstrapCache.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(CONTRACT_BOOTSTRAP_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { userId: string; data: ContractBootstrap; fetchedAt: number };
        if (parsed && parsed.userId === targetUser && parsed.data && Array.isArray(parsed.data.records)) {
          contractBootstrapCache = parsed;
          return parsed.data;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function invalidateContractBootstrapCache() {
  contractBootstrapCache = null;
  inflightBootstrapPromise = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CONTRACT_BOOTSTRAP_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function prefetchContractBootstrap(force = false): Promise<ContractBootstrap> {
  const userId = currentSelectedUserId();
  if (
    !force &&
    contractBootstrapCache &&
    contractBootstrapCache.userId === userId &&
    Date.now() - contractBootstrapCache.fetchedAt < CONTRACT_BOOTSTRAP_TTL_MS
  ) {
    return Promise.resolve(contractBootstrapCache.data);
  }
  return contractApi<ContractBootstrap>('/api/contracts');
}

/** Gọi API hợp đồng. Ưu tiên gọi máy chủ thực trước; chỉ chuyển sang bản lưu trình duyệt khi máy chủ báo thiếu cấu hình phiên (503). */
export async function contractApi<T>(url: string, body?: unknown): Promise<T> {
  const userId = currentSelectedUserId();
  const isBootstrapGet = url === '/api/contracts' && !body;

  if (isBootstrapGet && inflightBootstrapPromise && inflightBootstrapPromise.userId === userId) {
    return inflightBootstrapPromise.promise as unknown as Promise<T>;
  }
  if (body && url.startsWith('/api/contracts')) {
    invalidateContractBootstrapCache();
  }

  const runRequest = async (): Promise<T> => {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (userId) headers['x-upbase-user-id'] = userId;

    let response: Response;
    try {
      response = await fetch(url, {
        cache: 'no-store',
        headers: Object.keys(headers).length ? headers : undefined,
        ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
      });
    } catch {
      if (url.startsWith('/api/contracts')) {
        enableBrowserDemo();
        return browserDemoRequest<T>(url, body as Record<string, unknown> | undefined);
      }
      throw new ApiError('Không kết nối được máy chủ.', 503);
    }

    const result = await response.json().catch(() => ({}));
    if (url.startsWith('/api/contracts') && response.status === 503 && result.error === 'Chưa cấu hình khóa bảo vệ phiên.') {
      enableBrowserDemo();
      return browserDemoRequest<T>(url, body as Record<string, unknown> | undefined);
    }
    if (response.ok && url === '/api/contracts' && !body) {
      disableBrowserDemo();
      const bootstrap = result as ContractBootstrap;
      const cacheEntry = { userId, data: bootstrap, fetchedAt: Date.now() };
      contractBootstrapCache = cacheEntry;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(CONTRACT_BOOTSTRAP_SESSION_KEY, JSON.stringify(cacheEntry));
        } catch {
          /* ignore quota */
        }
      }
    }
    if (!response.ok) throw new ApiError(result.error || 'Không xử lý được yêu cầu. Thử lại sau.', response.status);
    return result as T;
  };

  if (isBootstrapGet) {
    const promise = (runRequest() as unknown as Promise<ContractBootstrap>).finally(() => {
      if (inflightBootstrapPromise?.promise === promise) {
        inflightBootstrapPromise = null;
      }
    });
    inflightBootstrapPromise = { userId, promise };
    return promise as unknown as Promise<T>;
  }

  return runRequest();
}
