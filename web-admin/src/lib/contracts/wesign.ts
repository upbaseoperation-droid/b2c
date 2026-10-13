import { ContractError, requireCondition } from './domain';
import type { SigningPerson } from './types';
const base = () => process.env.WESIGN_ENV === 'test' ? 'https://testapiwesign.misa.vn' : process.env.WESIGN_ENV === 'demo' ? 'https://demoamisapp.misa.vn/wesign/api/public' : 'https://amisapp.misa.vn/wesign/api/public';
const ACTIONS: Record<number, string> = { 0: 'Chưa đến lượt', 1: 'Chờ ký', 2: 'Đã ký', 3: 'Từ chối', 4: 'Chờ điều phối', 5: 'Đã điều phối', 6: 'Chờ phê duyệt trên weSign', 7: 'Đã phê duyệt trên weSign', 8: 'Đã ủy quyền', 9: 'Đã hủy ủy quyền' };
interface MisaDetail { document: { id: string; name: string; status: number }; listDocumentParticipant: Array<{ participantName: string; participantEmail: string; action: number; role: number; level?: number }> }
let cached: { value: string; expires: number } | undefined;
export function wesignConfigured() { return Boolean(process.env.WESIGN_ACCESS_TOKEN || (process.env.WESIGN_CLIENT_ID && process.env.WESIGN_CLIENT_SECRET && process.env.WESIGN_AMIS_SID)); }
async function request(endpoint: string, init: RequestInit) {
  const response = await fetch(base() + endpoint, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new ContractError(`MISA weSign trả lỗi ${response.status}. Kiểm tra kết nối và phạm vi tài khoản.`, 502);
  return response;
}
async function token() {
  if (process.env.WESIGN_ACCESS_TOKEN) return process.env.WESIGN_ACCESS_TOKEN;
  if (cached && cached.expires > Date.now() + 60000) return cached.value;
  requireCondition(wesignConfigured(), 'Chưa cấu hình kết nối MISA AMIS weSign.', 503);
  const response = await request('/api/v1/Auth/credentials', { method: 'POST', headers: { 'x-client-id': process.env.WESIGN_CLIENT_ID!, 'x-client-secret': process.env.WESIGN_CLIENT_SECRET!, 'x-amis-sid': process.env.WESIGN_AMIS_SID! } });
  const data = await response.json(); requireCondition(typeof data.accessToken === 'string', 'MISA chưa cấp access token hợp lệ.', 502);
  cached = { value: data.accessToken, expires: Date.parse(data.acccessExpAt) || Date.now() + 300000 }; return cached.value;
}
export function normalizeDetail(detail: MisaDetail, id: string) {
  requireCondition(detail.document?.id?.toLowerCase() === id.toLowerCase() && Number.isInteger(detail.document.status) && Array.isArray(detail.listDocumentParticipant), 'Không tìm thấy đúng luồng ký hoặc dữ liệu weSign không hợp lệ.', 502);
  const people: SigningPerson[] = [...detail.listDocumentParticipant].sort((a, b) => (a.level || 0) - (b.level || 0)).map(p => ({ name: p.participantName || 'Chưa có tên', email: p.participantEmail || '', action: p.action, status: ACTIONS[p.action] || `Trạng thái weSign ${p.action}` }));
  // Mã document.status không có bảng nghĩa trong OpenAPI đã đọc. Chỉ dùng mapping do MISA xác nhận tại môi trường công ty.
  let mapping: Record<string, string> = {};
  try { mapping = JSON.parse(process.env.WESIGN_STATUS_MAP || '{}'); } catch { throw new ContractError('Cấu hình trạng thái weSign không hợp lệ.', 503); }
  const mapped = mapping[String(detail.document.status)];
  const status = ['WAITING', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'REJECTED', 'DRAFT'].includes(mapped) ? mapped : 'UNKNOWN';
  return { sourceStatus: detail.document.status, name: detail.document.name, status, people, syncedAt: new Date().toISOString() };
}
export async function wesignDetail(id: string) {
  requireCondition(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id), 'Mã tài liệu weSign phải là UUID.');
  const response = await request('/Documents/detail', { method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify([id]) });
  const payload = await response.json();
  const list = Array.isArray(payload) ? payload : payload.success === true && Array.isArray(payload.data) ? payload.data : [];
  const detail = list.find((d: MisaDetail) => d.document?.id?.toLowerCase() === id.toLowerCase());
  requireCondition(detail, 'Tài khoản tích hợp chưa đọc được luồng ký này.', 502); return normalizeDetail(detail, id);
}
export async function signedFile(id: string) {
  return request('/api/File/downloadFileInfosByDocumentID', { method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify([id]) });
}
