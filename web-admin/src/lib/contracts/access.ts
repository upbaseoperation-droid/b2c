import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '../larkAuth';
import { ContractError, requireCondition } from './domain';
import type { ContractActor } from './types';
export const DEMO_ACTORS: ContractActor[] = [
  { id: 'contract-demo-owner', name: 'Người tạo (kiểm thử)', roles: ['CREATOR'], brands: [], allBrands: true },
  { id: 'contract-demo-legal', name: 'Pháp chế (kiểm thử)', roles: ['LEGAL'], brands: [], allBrands: true },
  { id: 'contract-demo-finance', name: 'Kế toán (kiểm thử)', roles: ['FINANCE'], brands: [], allBrands: true },
  { id: 'user-ngoc-tam', name: 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm)', roles: ['LEAD', 'CREATOR'], brands: ['ClubClio', 'Cindy Bloom', 'EUPC', 'Mine', 'Cathy Doll', 'L\'Occitane Việt Nam', 'Bye Bye Blemish', 'Rejuran'], allBrands: true },
  { id: 'user-yen-nhi', name: 'Đặng Thị Yến Nhi (Trưởng phòng B2C)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'user-admin-giang', name: 'Đỗ Văn Giang (Tổng Giám Đốc)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'user-growth-manager-quyen', name: 'Trần Thị Đỗ Quyên (Trưởng phòng Growth)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'user-media-manager-quang', name: 'Nguyễn Đức Quảng (Trưởng phòng Media)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'contract-demo-sign', name: 'Điều phối ký (kiểm thử)', roles: ['SIGN_COORDINATOR'], brands: [], allBrands: true },
];
export function configuredActors(): ContractActor[] {
  let parsed: ContractActor[] = [];
  try { parsed = JSON.parse(process.env.CONTRACT_ACCESS_JSON || '[]'); } catch { throw new ContractError('Cấu hình phân quyền hợp đồng không hợp lệ.', 503); }
  requireCondition(Array.isArray(parsed) && parsed.every(a => typeof a.id === 'string' && typeof a.name === 'string' && Array.isArray(a.roles) && a.roles.every(r => ['CREATOR', 'LEGAL', 'FINANCE', 'LEAD', 'SIGN_COORDINATOR', 'AUDITOR'].includes(r)) && Array.isArray(a.brands)), 'Cấu hình phân quyền hợp đồng không hợp lệ.', 503);
  return process.env.NODE_ENV !== 'production' ? [...parsed, ...DEMO_ACTORS] : parsed;
}
export function actorFromRequest(req: NextRequest): ContractActor {
  const user = getAuthenticatedUser(req);
  requireCondition(user, 'Vui lòng đăng nhập Lark để truy cập hợp đồng.', 401);
  const demo = process.env.NODE_ENV !== 'production' && DEMO_ACTORS.find(a => a.id === user.id);
  if (demo) return demo;
  if (process.env.NODE_ENV === 'production') {
    requireCondition(process.env.AUTH_SECRET || process.env.SESSION_SECRET, 'Chưa cấu hình khóa bảo vệ phiên.', 503);
    requireCondition(user.loginProvider === 'LARK' && user.larkOpenId && !user.larkOpenId.startsWith('ou_sandbox_'), 'Module hợp đồng yêu cầu phiên Lark thực.', 401);
    requireCondition(process.env.LARK_TENANT_KEY && user.larkTenantKey === process.env.LARK_TENANT_KEY, 'Chưa xác minh tổ chức Lark được phép.', 403);
  }
  // Không lấy role/permissions từ giao diện hoặc suy ra quyền theo email/tên.
  const grant = configuredActors().find(a => a.id === user.larkOpenId || a.id === user.id);
  if (grant) return { ...grant, name: user.name };
  if (process.env.NODE_ENV !== 'production' && !user.partnerType) return { id: user.id, name: user.name, roles: ['CREATOR'], brands: user.assignedBrands || [], allBrands: user.role === 'ADMIN' };
  throw new ContractError('Tài khoản chưa được cấp quyền sử dụng module hợp đồng.', 403);
}
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  requireCondition(origin === req.nextUrl.origin, 'Yêu cầu không xuất phát từ ứng dụng.', 403);
}
