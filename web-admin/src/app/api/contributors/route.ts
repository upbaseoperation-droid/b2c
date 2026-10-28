import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import {
  EMPTY_CTV_DIRECTORY,
  isPartnershipStaff,
  maskContributor,
  type CtvDirectoryAccess,
  type CtvDirectoryData,
  type PartnershipStaffEntry,
} from '@/lib/ctvDirectory';
import type { Contributor, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RECORD_KEY = 'ctv-directory-v1';
const MAX_CONTRIBUTORS = 2000;
const headers = { 'Cache-Control': 'no-store' };

function accessOf(user: UserProfile, data: CtvDirectoryData): CtvDirectoryAccess {
  const global = isStaffGlobalAdminOrManager(user);
  const canEdit = global || isPartnershipStaff(user, data.partnershipStaff || []);
  const finance = user.role === 'FINANCE' || Boolean(user.permissions?.includes('canApprovePayment'));
  return { canEdit, canManagePartnership: global, canSeeSensitive: canEdit || finance };
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

// GET /api/contributors — danh bạ CTV dùng chung. Nội bộ: cả danh bạ (ẩn giấy tờ / ngân hàng nếu không có quyền).
// Tài khoản CTV: chỉ hồ sơ của chính mình.
export async function GET(request: NextRequest) {
  const user = await requestActor(request).catch(() => null);
  if (!user) return fail('Phiên đăng nhập không hợp lệ.', 401);
  try {
    const rec = await readRecord<CtvDirectoryData>(RECORD_KEY, EMPTY_CTV_DIRECTORY);
    const data = { ...EMPTY_CTV_DIRECTORY, ...rec.data };
    if (user.partnerType || user.role.endsWith('_PARTNER')) {
      if (user.role !== 'CTV_PARTNER' || !user.linkedEntityId) return fail('Không có quyền xem danh bạ CTV.', 403);
      const mine = data.contributors.filter(c => c.id === user.linkedEntityId || c.code === user.linkedEntityId);
      return NextResponse.json({ contributors: mine, partnershipStaff: [], access: { canEdit: false, canManagePartnership: false, canSeeSensitive: true }, revision: rec.revision }, { headers });
    }
    const access = accessOf(user, data);
    const contributors = access.canSeeSensitive ? data.contributors : data.contributors.map(maskContributor);
    return NextResponse.json({ contributors, partnershipStaff: data.partnershipStaff, access, revision: rec.revision }, { headers });
  } catch (err) {
    if (err instanceof RecordError) return fail(err.message, err.status);
    throw err;
  }
}

type DirectoryOp =
  | { op: 'upsert'; contributor: Contributor }
  | { op: 'delete'; id: string }
  | { op: 'setPartnershipStaff'; staff: PartnershipStaffEntry[] };

function applyOp(data: CtvDirectoryData, body: DirectoryOp, user: UserProfile): CtvDirectoryData {
  if (body.op === 'setPartnershipStaff') {
    const staff = (body.staff || [])
      .map(s => ({ name: String(s.name || '').trim(), staffCode: s.staffCode ? String(s.staffCode).trim() : undefined }))
      .filter(s => s.name);
    return { ...data, partnershipStaff: staff };
  }
  if (body.op === 'delete') {
    return { ...data, contributors: data.contributors.filter(c => c.id !== body.id) };
  }
  const c = body.contributor;
  const exists = data.contributors.some(x => x.id === c.id);
  const next: Contributor = { ...c, partnershipPic: c.partnershipPic?.trim() || user.name };
  if (!exists && data.contributors.length >= MAX_CONTRIBUTORS) throw new RecordError(`Tối đa ${MAX_CONTRIBUTORS} CTV.`, 400);
  if (data.contributors.some(x => x.id !== c.id && c.code && x.code === c.code)) throw new RecordError(`Mã CTV ${c.code} đã có trong danh bạ.`, 400);
  return {
    ...data,
    contributors: exists ? data.contributors.map(x => (x.id === c.id ? next : x)) : [next, ...data.contributors],
  };
}

// POST /api/contributors — thêm / sửa / xóa một CTV (Partnership, Giám đốc / Admin); đặt danh sách Partnership (Giám đốc / Admin).
// Gộp theo từng CTV trên bản mới nhất, không ghi đè cả danh bạ.
export async function POST(request: NextRequest) {
  const user = await requestActor(request).catch(() => null);
  if (!user || user.partnerType || user.role.endsWith('_PARTNER')) return fail('Phiên đăng nhập không hợp lệ hoặc không có quyền.', 401);
  try {
    const body = (await request.json().catch(() => null)) as DirectoryOp | null;
    if (!body || !['upsert', 'delete', 'setPartnershipStaff'].includes(body.op)) return fail('Dữ liệu gửi lên không hợp lệ.', 400);
    if (body.op === 'upsert' && (!body.contributor?.id || !body.contributor.name?.trim())) return fail('CTV cần có mã và họ tên.', 400);

    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<CtvDirectoryData>(RECORD_KEY, EMPTY_CTV_DIRECTORY);
      const current = { ...EMPTY_CTV_DIRECTORY, ...rec.data };
      const access = accessOf(user, current);
      if (body.op === 'setPartnershipStaff' && !access.canManagePartnership) return fail('Chỉ Giám đốc / Admin được đặt nhân sự Partnership.', 403);
      if (body.op !== 'setPartnershipStaff' && !access.canEdit) return fail('Chỉ nhân sự Partnership hoặc Giám đốc / Admin được sửa danh bạ CTV.', 403);
      try {
        const saved = await updateRecord<CtvDirectoryData>(RECORD_KEY, EMPTY_CTV_DIRECTORY, rec.revision, prev =>
          applyOp({ ...EMPTY_CTV_DIRECTORY, ...prev }, body, user)
        );
        const nextAccess = accessOf(user, saved.data);
        return NextResponse.json({ ...saved.data, access: nextAccess, revision: saved.revision }, { headers });
      } catch (err) {
        // Người khác vừa lưu: đọc lại bản mới nhất rồi gộp lại
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }
    return fail('Nhiều người đang sửa danh bạ cùng lúc, vui lòng thử lại.', 409);
  } catch (err) {
    if (err instanceof RecordError) return fail(err.message, err.status);
    throw err;
  }
}
