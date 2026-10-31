import type { NextRequest } from 'next/server';
import { getAuthenticatedUser, isSandboxLoginAllowed } from '../larkAuth';
import { ContractError, requireCondition } from './domain';
import type { ContractActor } from './types';
export const DEMO_ACTORS: ContractActor[] = [
  { id: 'contract-demo-owner', name: 'Người tạo (kiểm thử)', roles: ['CREATOR'], brands: [], allBrands: true },
  { id: 'contract-demo-legal', name: 'Pháp chế (kiểm thử)', roles: ['LEGAL'], brands: [], allBrands: true },
  { id: 'contract-demo-finance', name: 'Kế toán (kiểm thử)', roles: ['FINANCE'], brands: [], allBrands: true },
  { id: 'user-ngoc-tam', name: 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm)', roles: ['LEAD', 'CREATOR'], brands: ['ClubClio', 'Cindy Bloom', 'EUPC', 'Mine', 'L\'Occitane Việt Nam', 'Bye Bye Blemish', 'Rejuran'], allBrands: false },
  { id: 'user-yen-nhi', name: 'Đặng Thị Yến Nhi (Giám đốc Marketing B2C)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'user-admin-giang', name: 'Đỗ Văn Giang (Tổng Giám Đốc)', roles: ['LEAD', 'CREATOR'], brands: [], allBrands: true },
  { id: 'contract-demo-sign', name: 'Điều phối ký (kiểm thử)', roles: ['SIGN_COORDINATOR'], brands: [], allBrands: true },
];
export function configuredActors(): ContractActor[] {
  let parsed: ContractActor[] = [];
  try { parsed = JSON.parse(process.env.CONTRACT_ACCESS_JSON || '[]'); } catch { throw new ContractError('Cấu hình phân quyền hợp đồng không hợp lệ.', 503); }
  requireCondition(Array.isArray(parsed) && parsed.every(a => typeof a.id === 'string' && typeof a.name === 'string' && Array.isArray(a.roles) && a.roles.every(r => ['CREATOR', 'LEGAL', 'FINANCE', 'LEAD', 'SIGN_COORDINATOR', 'AUDITOR'].includes(r)) && Array.isArray(a.brands)), 'Cấu hình phân quyền hợp đồng không hợp lệ.', 503);
  return [...parsed, ...DEMO_ACTORS];
}
export function actorFromRequest(req: NextRequest): ContractActor {
  const headerUserId = req.headers.get('x-upbase-user-id')?.trim();
  if (headerUserId) {
    const headerDemo = DEMO_ACTORS.find(a => a.id === headerUserId);
    if (headerDemo) return headerDemo;
  }
  const user = getAuthenticatedUser(req);
  if (!user) {
    if (isSandboxLoginAllowed() || process.env.CONTRACT_STRICT_AUTH !== 'true') {
      return DEMO_ACTORS[0];
    }
    throw new ContractError('Vui lòng đăng nhập Lark để truy cập hợp đồng.', 401);
  }
  const demo = DEMO_ACTORS.find(a => a.id === user.id);
  if (demo) return demo;
  if (process.env.CONTRACT_STRICT_AUTH === 'true') {
    requireCondition(process.env.AUTH_SECRET || process.env.SESSION_SECRET, 'Chưa cấu hình khóa bảo vệ phiên.', 503);
    requireCondition(user.loginProvider === 'LARK' && user.larkOpenId && !user.larkOpenId.startsWith('ou_sandbox_'), 'Module hợp đồng yêu cầu phiên Lark thực.', 401);
    requireCondition(process.env.LARK_TENANT_KEY && user.larkTenantKey === process.env.LARK_TENANT_KEY, 'Chưa xác minh tổ chức Lark được phép.', 403);
  }
  const grant = configuredActors().find(a => a.id === user.larkOpenId || a.id === user.id);
  if (grant) return { ...grant, name: user.name };

  const roleLower = (user.roleTitle || '').toLowerCase();
  const roles: ContractActor['roles'] =
    user.role === 'LEGAL' || roleLower.includes('pháp chế')
      ? ['LEGAL', 'CREATOR']
      : user.role === 'FINANCE' || roleLower.includes('kế toán')
        ? ['FINANCE', 'SIGN_COORDINATOR', 'CREATOR']
        : user.role === 'SIGN_ADMIN'
          ? ['SIGN_COORDINATOR', 'CREATOR']
          : user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'LEADER'
            ? ['LEAD', 'SIGN_COORDINATOR', 'CREATOR']
            : ['CREATOR'];
  return {
    id: user.id,
    name: user.name,
    roles,
    brands: user.assignedBrands || [],
    allBrands: true,
  };
}
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  requireCondition(origin === req.nextUrl.origin, 'Yêu cầu không xuất phát từ ứng dụng.', 403);
}
