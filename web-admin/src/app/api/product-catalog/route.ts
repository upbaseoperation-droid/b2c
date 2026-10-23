import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { readMasterCatalog } from '@/lib/server/masterCatalogStore';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { filterScopedBrands } from '@/lib/rbacScope';
import { brandKey } from '@/lib/brands/types';
import { EMPTY_PRODUCT_CATALOG, sanitizeProductCatalog, type BrandProductCatalog } from '@/lib/productCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'no-store' };
const keyOf = (brand: string) => `product-catalog-${brandKey(brand).slice(0, 80)}`;

function fail(e: unknown) {
  if (e instanceof RecordError) return NextResponse.json({ error: e.message, code: e.status === 409 ? 'CONFLICT' : undefined }, { status: e.status, headers });
  return NextResponse.json({ error: 'Không truy cập được danh mục sản phẩm. Thử lại sau.' }, { status: 503, headers });
}

/** Người dùng nội bộ chỉ thao tác được với Brand nằm trong phạm vi của mình. */
async function assertBrandAccess(req: NextRequest, brand: string) {
  const user = await requestActor(req);
  if (!user) throw new RecordError('Phiên không còn quyền truy cập.', 401);
  if (user.partnerType || user.role.endsWith('_PARTNER')) throw new RecordError('Tài khoản đối tác không có quyền xem danh mục sản phẩm.', 403);
  const catalog = await readMasterCatalog();
  const scoped = filterScopedBrands(catalog.data.brands, user, catalog.data.stores);
  if (!scoped.some(b => b.name === brand)) throw new RecordError('Brand này không thuộc phạm vi của bạn.', 403);
  return user;
}

// GET /api/product-catalog?brand=... — danh mục sản phẩm của một Brand
export async function GET(req: NextRequest) {
  try {
    const brand = (req.nextUrl.searchParams.get('brand') || '').trim();
    if (!brand) throw new RecordError('Thiếu tên Brand.', 400);
    await assertBrandAccess(req, brand);
    const rec = await readRecord<BrandProductCatalog>(keyOf(brand), EMPTY_PRODUCT_CATALOG);
    return NextResponse.json({ data: sanitizeProductCatalog(rec.data), revision: rec.revision }, { headers });
  } catch (e) {
    return fail(e);
  }
}

// PUT /api/product-catalog — lưu toàn bộ danh mục của Brand (chống ghi đè bằng revision)
export async function PUT(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const body = (await req.json()) as { brand?: string; revision?: number; data?: Partial<BrandProductCatalog> };
    const brand = (body.brand || '').trim();
    if (!brand || !body.data || typeof body.revision !== 'number') throw new RecordError('Dữ liệu gửi lên không hợp lệ.', 400);
    await assertBrandAccess(req, brand);
    const next = sanitizeProductCatalog(body.data);
    const saved = await updateRecord<BrandProductCatalog>(keyOf(brand), EMPTY_PRODUCT_CATALOG, body.revision, () => next);
    return NextResponse.json({ data: saved.data, revision: saved.revision }, { headers });
  } catch (e) {
    return fail(e);
  }
}
