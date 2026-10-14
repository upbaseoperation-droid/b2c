import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { readMasterCatalog, validateCatalog } from '@/lib/server/masterCatalogStore';
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
    const record = await readMasterCatalog();
    const brands = filterScopedBrands(record.data.brands, user, record.data.stores);
    const stores = filterScopedStores(record.data.stores, user);
    const partner = !!user.partnerType || user.role.endsWith('_PARTNER');
    const canEdit = !partner && ['ADMIN', 'MANAGER'].includes(user.role) && await actionAllowed(user, 'master_data_brand_stores', 'write');
    return NextResponse.json({ ...record, canEdit, data: { ...record.data, brands, stores, products: record.data.products.filter(p => brands.some(b => b.name === p.brandName)), castTiers: partner ? [] : record.data.castTiers } }, { headers });
  } catch (e) { return failure(e); }
}
export async function PUT(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role) || !await actionAllowed(user, 'master_data_brand_stores', 'write')) throw new RecordError('Không có quyền quản lý danh mục gốc.', 403);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 15_000_000) throw new RecordError('Danh mục quá lớn.', 413);
    const { data, revision } = JSON.parse(raw) as { data: MasterCatalog; revision: number };
    const result = await updateRecord('master-catalog', DEFAULT_MASTER_CATALOG, revision, async previous => { await validateCatalog(data, previous); return data; });
    return NextResponse.json({ ...result, canEdit: true }, { headers });
  } catch (e) { return failure(e); }
}
