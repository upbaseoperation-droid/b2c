import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { validateCatalog } from '@/lib/server/masterCatalogStore';
import { readCatalogWithPics } from '@/lib/server/storePicStore';
import { DEFAULT_MASTER_CATALOG, type MasterCatalog } from '@/lib/masterCatalog';
import { RecordError, updateRecord } from '@/lib/server/sharedRecords';
import { filterScopedBrands, filterScopedStores } from '@/lib/rbacScope';
import { actionAllowed } from '@/lib/server/accessPolicy';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
function failure(e: unknown) { return NextResponse.json({ error: e instanceof RecordError ? e.message : 'Không truy cập được kho master data. Thử lại sau.' }, { status: e instanceof RecordError ? e.status : 503, headers }); }
export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    if (!user) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const partner = !!user.partnerType || user.role.endsWith('_PARTNER');
    const [record, canEdit] = await Promise.all([
      readCatalogWithPics(),
      !partner && ['ADMIN', 'MANAGER'].includes(user.role)
        ? actionAllowed(user, 'master_data_brand_stores', 'write')
        : Promise.resolve(false),
    ]);
    const brands = filterScopedBrands(record.data.brands, user, record.data.stores);
    const stores = filterScopedStores(record.data.stores, user);
    const brandNameSet = new Set(brands.map(b => b.name));
    return NextResponse.json({ ...record, canEdit, data: { ...record.data, brands, stores, products: record.data.products.filter(p => brandNameSet.has(p.brandName)), castTiers: partner ? [] : record.data.castTiers } }, { headers });
  } catch (e) { return failure(e); }
}
export async function PUT(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role) || !await actionAllowed(user, 'master_data_brand_stores', 'write')) throw new RecordError('Không có quyền quản lý danh mục gốc.', 403);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 15_000_000) throw new RecordError('Danh mục quá lớn.', 413);
    let parsed: { data: MasterCatalog; revision: number };
    try { parsed = JSON.parse(raw); } catch { throw new RecordError('Dữ liệu JSON không hợp lệ.'); }
    const { revision } = parsed;
    // Danh sách PIC gian do kho store-pics quản lý; không lưu bản sao (có thể đã cũ) vào danh mục gốc.
    const data: MasterCatalog = { ...parsed.data, stores: (parsed.data?.stores || []).map(({ pics: _pics, ...store }) => store) };
    const result = await updateRecord('master-catalog', DEFAULT_MASTER_CATALOG, revision, async previous => { await validateCatalog(data, previous); return data; });
    return NextResponse.json({ ...result, canEdit: true }, { headers });
  } catch (e) { return failure(e); }
}
