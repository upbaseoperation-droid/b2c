import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { brandEditRights, requireBrandScope } from '@/lib/server/brandAccess';
import { BrandError, requireBrand, requireReader, viewRightsFor } from '@/lib/brands/domain';
import { assertValidBrandFileKey, brandFileStorageMode, deleteBrandFile, MAX_BRAND_FILE_BYTES, readBrandFile, uploadBrandFile } from '@/lib/brands/r2';
import { listProfiles } from '@/lib/brands/store';
import { brandKey, type BrandSection } from '@/lib/brands/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

function failure(error: unknown) {
  console.error('[API /api/brands/files error]:', error);
  const known = error instanceof BrandError;
  const message = known ? error.message : (error instanceof Error ? error.message : 'Không xử lý được tệp thương hiệu.');
  return NextResponse.json({ error: message }, { status: known ? error.status : 500, headers: noStore });
}

/** Xem hoặc tải tệp thương hiệu theo khóa `key`. */
export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    requireReader(user);

    const rawKey = req.nextUrl.searchParams.get('key') || '';
    const key = assertValidBrandFileKey(rawKey);
    const fileMaster = await requireBrandScope(user, key.split('/')[1]);
    const fileRights = viewRightsFor(user, fileMaster?.name || key.split('/')[1]);
    const profilesForFile = await listProfiles();
    requireBrand(fileRights.LEGAL || !profilesForFile.some(p => JSON.stringify(p.legal).includes(key)), 'Không có quyền truy cập tệp pháp lý.', 403);
    const download = req.nextUrl.searchParams.get('download') === '1';

    const { buffer, contentType, fileName } = await readBrandFile(key);
    const isInlineSafe = /^(application\/pdf|image\/(png|jpeg|webp|gif)|text\/plain)/i.test(contentType);
    const disposition = download || !isInlineSafe ? 'attachment' : 'inline';
    const encodedName = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `${disposition}; filename="${fileName.replace(/"/g, '')}"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return failure(e);
  }
}

/** Tải tệp thương hiệu lên Cloudflare R2 (hoặc kho cục bộ khi phát triển). */
export async function POST(req: NextRequest) {
  try {
    requireBrand(req.headers.get('origin') === req.nextUrl.origin, 'Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    requireReader(user);

    const formData = await req.formData().catch(() => null);
    requireBrand(formData, 'Dữ liệu tệp tải lên không hợp lệ.');

    const brandName = String(formData.get('brandName') || '').trim();
    requireBrand(brandName.length > 0, 'Thiếu tên nhãn hàng.');

    const rawSection = String(formData.get('section') || 'DOCUMENTS').trim() as BrandSection;
    const section: BrandSection = rawSection === 'LEGAL' ? 'LEGAL' : 'DOCUMENTS';

    const key = brandKey(brandName);
    const master = await requireBrandScope(user, brandName);
    const all = await listProfiles();
    const current = all.find(p => p.key === key);
    requireBrand(master || current, 'Không tìm thấy nhãn hàng trong Dữ liệu gốc.', 404);

    const allowed = await brandEditRights(user, master, brandName);
    if (section === 'LEGAL') {
      requireBrand(allowed.LEGAL, 'Bạn không có quyền tải tệp pháp lý lên mục này.', 403);
    } else {
      requireBrand(allowed.DOCUMENTS, 'Bạn không có quyền tải tệp lên mục này.', 403);
    }

    const fileEntry = formData.get('file');
    requireBrand(fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry, 'Chưa chọn tệp để tải lên.');
    const file = fileEntry as File;
    requireBrand(file.size > 0, 'Tệp tải lên đang trống.');
    requireBrand(file.size <= MAX_BRAND_FILE_BYTES, 'Dung lượng tệp vượt mức tối đa 25 MB.', 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await uploadBrandFile({
      brandName: master?.name || brandName,
      originalName: file.name,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json(
      { file: stored, storageMode: brandFileStorageMode() },
      { headers: noStore },
    );
  } catch (e) {
    return failure(e);
  }
}

/** Xóa tệp thương hiệu khỏi Cloudflare R2 / kho cục bộ. */
export async function DELETE(req: NextRequest) {
  try {
    requireBrand(req.headers.get('origin') === req.nextUrl.origin, 'Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    requireReader(user);

    const rawKey = req.nextUrl.searchParams.get('key') || '';
    const key = assertValidBrandFileKey(rawKey);
    const brandSlug = key.split('/')[1] || '';

    const master = await requireBrandScope(user, brandSlug);
    const allowed = await brandEditRights(user, master, brandSlug);
    requireBrand(allowed.DOCUMENTS || allowed.LEGAL, 'Bạn không có quyền xóa tệp của nhãn hàng này.', 403);
    const profiles = await listProfiles();
    requireBrand(allowed.LEGAL || !profiles.some(p => JSON.stringify(p.legal).includes(key)), 'Không có quyền xóa tệp pháp lý.', 403);

    await deleteBrandFile(key);
    return NextResponse.json({ deleted: true, key }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
