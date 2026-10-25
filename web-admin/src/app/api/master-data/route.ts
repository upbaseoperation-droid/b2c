import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { readMasterCatalogWithIssues, validateCatalog } from '@/lib/server/masterCatalogStore';
import { DEFAULT_MASTER_CATALOG, type MasterCatalog } from '@/lib/masterCatalog';
import { readRecord, RecordError, updateRecord } from '@/lib/server/sharedRecords';
import { filterScopedBrands, filterScopedStores } from '@/lib/rbacScope';
import { actionAllowed } from '@/lib/server/accessPolicy';
import { assignmentChanges, normalizeAssignments, type AssignmentLogEntry } from '@/lib/assignmentNormalize';
import { staffIndex } from '@/lib/server/staffDirectory';
import { userStaffCode } from '@/lib/staffIdentity';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
const LOG_KEY = 'assignment-log';
const LOG_LIMIT = 5000;
type AssignmentLog = { entries: AssignmentLogEntry[] };
const EMPTY_LOG: AssignmentLog = { entries: [] };

function failure(e: unknown) { return NextResponse.json({ error: e instanceof RecordError ? e.message : 'Không truy cập được kho master data. Thử lại sau.' }, { status: e instanceof RecordError ? e.status : 503, headers }); }

async function appendAssignmentLog(entries: AssignmentLogEntry[]) {
  if (!entries.length) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readRecord<AssignmentLog>(LOG_KEY, EMPTY_LOG);
    try {
      await updateRecord<AssignmentLog>(LOG_KEY, EMPTY_LOG, current.revision, prev => ({ entries: [...(prev.entries || []), ...entries].slice(-LOG_LIMIT) }));
      return;
    } catch (e) {
      if (!(e instanceof RecordError) || e.status !== 409) throw e;
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requestActor(req);
    if (!user) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const partner = !!user.partnerType || user.role.endsWith('_PARTNER');
    const [record, canEdit] = await Promise.all([
      readMasterCatalogWithIssues(),
      !partner && ['ADMIN', 'MANAGER'].includes(user.role)
        ? actionAllowed(user, 'master_data_brand_stores', 'write')
        : Promise.resolve(false),
    ]);
    const brands = filterScopedBrands(record.data.brands, user, record.data.stores);
    const stores = filterScopedStores(record.data.stores, user);
    const view = req.nextUrl.searchParams.get('view');
    // Danh sách phân công cần người dùng xử lý (tên trùng, tên không có trong danh bạ, PIC Plan/KV các gian cùng nhãn khác nhau)
    if (view === 'assignment-issues') {
      if (!canEdit) throw new RecordError('Không có quyền xem danh sách phân công cần xử lý.', 403);
      return NextResponse.json({ revision: record.revision, issues: record.issues }, { headers });
    }
    // Nhật ký phân công của một gian / nhãn (hoặc toàn bộ nếu có quyền sửa danh mục)
    if (view === 'assignment-log') {
      const entityId = req.nextUrl.searchParams.get('entityId') || '';
      const visibleIds = new Set([...brands.map(b => b.id), ...stores.map(s => s.id)]);
      if (!entityId && !canEdit) throw new RecordError('Cần chọn gian hàng hoặc nhãn để xem nhật ký.', 400);
      if (entityId && !visibleIds.has(entityId)) throw new RecordError('Không có quyền xem gian hàng / nhãn này.', 403);
      const log = await readRecord<AssignmentLog>(LOG_KEY, EMPTY_LOG);
      const entries = (log.data.entries || []).filter(e => !entityId || e.entityId === entityId).slice(-500).reverse();
      return NextResponse.json({ entries }, { headers });
    }
    const { issues: _issues, ...rest } = record;
    const brandNameSet = new Set(brands.map(b => b.name));
    return NextResponse.json({ ...rest, canEdit, issueCount: canEdit ? record.issues.length : 0, data: { ...record.data, brands, stores, products: record.data.products.filter(p => brandNameSet.has(p.brandName)), castTiers: partner ? [] : record.data.castTiers } }, { headers });
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
    const { data, revision } = parsed;
    const index = await staffIndex();
    let changes: AssignmentLogEntry[] = [];
    const result = await updateRecord('master-catalog', DEFAULT_MASTER_CATALOG, revision, async previous => {
      await validateCatalog(data, previous);
      const next = normalizeAssignments(data, index).catalog;
      changes = assignmentChanges(previous, next, { name: user.name, code: userStaffCode(user) || undefined });
      return next;
    });
    await appendAssignmentLog(changes).catch(() => undefined);
    return NextResponse.json({ ...result, canEdit: true }, { headers });
  } catch (e) { return failure(e); }
}
