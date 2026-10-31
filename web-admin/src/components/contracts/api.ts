import type { ContractActor, ContractRecord, LegalTemplate } from '../../lib/contracts/types';
import { browserDemoEnabled, browserDemoRequest, enableBrowserDemo } from './browserDemo';

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

/** Gọi API hợp đồng. Có `body` thì POST JSON; lỗi trả về câu tiếng Việt của máy chủ. */
export async function contractApi<T>(url: string, body?: unknown): Promise<T> {
  if (browserDemoEnabled() && url.startsWith('/api/contracts')) return browserDemoRequest<T>(url, body as Record<string, unknown> | undefined);
  const response = await fetch(url, {
    cache: 'no-store',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (url === '/api/contracts' && !body && response.status === 503 && result.error === 'Chưa cấu hình khóa bảo vệ phiên.') {
    enableBrowserDemo(); return browserDemoRequest<T>(url);
  }
  if (!response.ok) throw new ApiError(result.error || 'Không xử lý được yêu cầu. Thử lại sau.', response.status);
  return result as T;
}
