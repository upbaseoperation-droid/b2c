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

/** Gọi API hợp đồng. Ưu tiên gọi máy chủ thực trước; chỉ chuyển sang bản lưu trình duyệt khi máy chủ báo thiếu cấu hình phiên (503). */
export async function contractApi<T>(url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  try {
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('upbase_selected_user_id');
      if (savedUserId) headers['x-upbase-user-id'] = savedUserId;
    }
  } catch {
    /* ignore */
  }

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
  }
  if (!response.ok) throw new ApiError(result.error || 'Không xử lý được yêu cầu. Thử lại sau.', response.status);
  return result as T;
}
