import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import { UPBASE_BRANDS_MASTER } from '@/lib/importedMasterData';
import { BrandError, applySection, parseSection, permissionsFor, requireBrand, requireReader } from '@/lib/brands/domain';
import { brandStorageMode, listProfiles, saveProfile } from '@/lib/brands/store';
import { brandKey, emptyProfile, type BrandSection } from '@/lib/brands/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECTIONS: BrandSection[] = ['POSITIONING', 'ENTITY', 'PRODUCTS', 'CONTENT_RULES', 'FAQS', 'LEGAL', 'RATECARD', 'DOCUMENTS'];
const noStore = { 'Cache-Control': 'no-store' };

function failure(error: unknown) {
  const known = error instanceof BrandError;
  return NextResponse.json({ error: known ? error.message : 'Không xử lý được hồ sơ thương hiệu. Thử lại sau.' }, { status: known ? error.status : 503, headers: noStore });
}

/** Danh sách hồ sơ đã lưu và quyền của người đang xem (quyền theo Account PIC tính ở từng nhãn). */
export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    requireReader(user);
    const base = permissionsFor(user);
    return NextResponse.json(
      { profiles: await listProfiles(), access: { name: user.name, lead: base.RATECARD, legal: base.LEGAL }, storage: brandStorageMode() },
      { headers: noStore },
    );
  } catch (e) {
    return failure(e);
  }
}

/** Lưu một mục của hồ sơ: { brandName, revision, section, data }. */
export async function POST(req: NextRequest) {
  try {
    requireBrand(req.headers.get('origin') === req.nextUrl.origin, 'Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = getAuthenticatedUser(req);
    requireReader(user);
    const raw = await req.text();
    requireBrand(Buffer.byteLength(raw) < 400000, 'Dữ liệu vượt giới hạn dung lượng.', 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { throw new BrandError('Dữ liệu gửi lên không hợp lệ.'); }

    const section = body.section as BrandSection;
    requireBrand(SECTIONS.includes(section), 'Mục hồ sơ không hợp lệ.');
    requireBrand(typeof body.brandName === 'string' && body.brandName.trim(), 'Thiếu tên nhãn hàng.');
    requireBrand(Number.isInteger(body.revision) && (body.revision as number) >= 0, 'Thiếu phiên bản hồ sơ.');

    const key = brandKey(body.brandName as string);
    const master = UPBASE_BRANDS_MASTER.find(b => brandKey(b.name) === key);
    const all = await listProfiles();
    const current = all.find(p => p.key === key);
    requireBrand(master || current, 'Không tìm thấy nhãn hàng trong Dữ liệu gốc.', 404);

    const allowed = permissionsFor(user, master?.accountPic);
    requireBrand(allowed[section], 'Bạn không có quyền sửa mục này.', 403);

    const profile = current || emptyProfile(master?.name || (body.brandName as string));
    requireBrand((current?.revision || 0) === body.revision, 'Hồ sơ đã được người khác cập nhật. Tải lại rồi sửa tiếp.', 409);
    const data = parseSection(section, body.data, user.name, profile);
    const summary = typeof body.summary === 'string' && body.summary.trim() ? body.summary.trim().slice(0, 200) : undefined;
    const saved = await saveProfile(applySection(profile, section, data, user.name, summary), profile.revision);
    return NextResponse.json({ profile: saved }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
