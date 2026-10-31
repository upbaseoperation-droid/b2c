import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requestActor } from '@/lib/server/requestActor';
import { defaultPolicy, readPolicy, reconcileAccessPolicy, userWithPolicy, type AccessPolicy } from '@/lib/server/accessPolicy';
import { RecordError, updateRecord } from '@/lib/server/sharedRecords';
import { ALL_SYSTEM_SCREENS, ROLE_ALLOWED_TABS } from '@/lib/rbacData';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
function failure(e: unknown) { return NextResponse.json({ error: e instanceof RecordError ? e.message : 'Không lưu/tải được cấu hình quyền.' }, { status: e instanceof RecordError ? e.status : 503, headers }); }
export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    if (!user) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const record = await readPolicy();
    const canViewRbacDirectory = ['ADMIN', 'MANAGER'].includes(user.role);
    if (!canViewRbacDirectory) return NextResponse.json({ ...record, data: { ...record.data, staffOverrides: {}, deptRules: [], internalStaff: [], audit: [] }, user }, { headers });
    return NextResponse.json({ ...record, user }, { headers });
  } catch (e) { return failure(e); }
}
export async function PUT(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    if (user?.role !== 'ADMIN') throw new RecordError('Chỉ quản trị viên được lưu cấu hình quyền.', 403);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 2_000_000) throw new RecordError('Cấu hình quá lớn.', 413);
    let parsed: { revision: number; data: AccessPolicy };
    try { parsed = JSON.parse(raw); } catch { throw new RecordError('Dữ liệu JSON không hợp lệ.'); }
    const { revision, data: rawData } = parsed;
    if (!rawData || !Array.isArray(rawData.internalStaff) || !Array.isArray(rawData.matrix) || !Array.isArray(rawData.deptRules) || !rawData.staffOverrides || !rawData.roleAllowedTabs || !rawData.roleDefaultLanding) throw new RecordError('Thiếu cấu hình quyền.');
    const data = reconcileAccessPolicy(rawData);
    const roles = Object.keys(ROLE_ALLOWED_TABS);
    const screens = new Set([...ALL_SYSTEM_SCREENS.map(s => s.key), ...Object.values(ROLE_ALLOWED_TABS).flat()]);
    for (const role of roles as Array<keyof typeof ROLE_ALLOWED_TABS>) {
      const tabs = data.roleAllowedTabs[role];
      if (!Array.isArray(tabs) || !tabs.length || tabs.some(t => !screens.has(t))) throw new RecordError('Màn hình của vai trò không hợp lệ.');
      if (!tabs.includes(data.roleDefaultLanding[role])) data.roleDefaultLanding[role] = tabs[0];
    }
    if (!data.roleAllowedTabs.ADMIN.includes('partner-access')) throw new RecordError('Quản trị viên phải giữ quyền quản lý phân quyền.');
    if (new Set(data.internalStaff.map(s => s?.id)).size !== data.internalStaff.length) throw new RecordError('Nhân sự bị trùng mã.');
    for (const staff of data.internalStaff) if (!staff || !staff.id || typeof staff.email !== 'string' || !roles.includes(staff.role) || !Array.isArray(staff.picBrands) || staff.picBrands.some(b => typeof b !== 'string') || !staff.permissions || Object.values(staff.permissions).some(v => typeof v !== 'boolean') || !['ACTIVE', 'SUSPENDED'].includes(staff.status)) throw new RecordError('Nhân sự không hợp lệ.');
    for (const override of Object.values(data.staffOverrides)) if (!override || !roles.includes(override.role) || typeof override.canLogin !== 'boolean') throw new RecordError('Ngoại lệ quyền không hợp lệ.');
    for (const item of data.matrix) if (!defaultPolicy.matrix.some(p => p.id === item.id) || Object.values(item.permissions).some(level => !['ALL', 'SCOPED', 'VIEW', 'APPROVE', 'DENIED'].includes(level))) throw new RecordError('Ma trận không hợp lệ.');
    for (const rule of data.deptRules) if (!rule || !defaultPolicy.deptRules.some(r => r.id === rule.id) || typeof rule.autoAllowLogin !== 'boolean') throw new RecordError('Quy tắc phòng ban không hợp lệ.');
    const own = data.internalStaff.find(s => s.id === user.id || (!!user.email && s.email === user.email));
    if (own && (own.role !== 'ADMIN' || own.status === 'SUSPENDED' || own.canLogin === false)) throw new RecordError('Không tự thu hồi vai trò quản trị trong phiên hiện tại.');
    if (userWithPolicy(user, data)?.role !== 'ADMIN') throw new RecordError('Cấu hình này sẽ khóa tài khoản quản trị hiện tại.');
    const result = await updateRecord('access-policy', defaultPolicy, revision, previous => ({
      ...data,
      audit: [{ id: randomUUID(), timestamp: new Date().toISOString(), actorName: user.name, actorEmail: user.email, actorRole: user.role, actionType: 'PERMISSION_TOGGLE' as const, targetUserOrEntity: 'Cấu hình quyền dùng chung', description: `Lưu phiên bản ${revision + 1}; thay đổi: ${['staffOverrides', 'deptRules', 'roleAllowedTabs', 'roleDefaultLanding', 'roleDataScope', 'internalStaff', 'matrix'].filter(k => JSON.stringify(previous[k as keyof AccessPolicy]) !== JSON.stringify(data[k as keyof AccessPolicy])).join(', ')}.`, ipAddress: 'Không thu thập', deviceInfo: (req.headers.get('user-agent') || 'Không xác định').slice(0, 200), status: 'SUCCESS' as const }, ...previous.audit].slice(0, 1000),
    }));
    return NextResponse.json({ ...result, data: reconcileAccessPolicy(result.data) }, { headers });
  } catch (e) { return failure(e); }
}
