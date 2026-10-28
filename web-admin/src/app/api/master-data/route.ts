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
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { storeCoBookings, storeMainBooking, storePositionsOf } from '@/lib/storePositions';
import { transferDealOwner } from '@/lib/server/dealOwnerTransfer';
import { listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import type { StorePortfolioItem } from '@/lib/types';

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

/** Ô phân công trên gian được sửa qua bàn giao / phân công nhân sự (không cần quyền sửa toàn bộ danh mục). */
const ASSIGNMENT_FIELDS = [
  'b2cOwnerName', 'primaryPic', 'assignedStaff', 'assignedPic', 'b2cOwners', 'assignedMembers',
  'bookingLeader', 'hasBookingLeader', 'backupOwnerName', 'backupOwnerId', 'isBackupActive', 'backupReason', 'backupFrom', 'backupTo',
  'previousPic', 'handoverEffectiveDate', 'assignmentNotes', 'staffCodes', 'contentPic', 'accountOwnerName',
  'storeUrl', 'bookingSheetUrl', 'defaultSheetTab',
] as const;
/** Leader của gian chỉ đổi người cùng làm, dự phòng và link Sheet/Gian hàng; Booking chính / Leader do Giám đốc đặt. */
const LEADER_FIELDS = new Set<string>([
  'b2cOwners', 'assignedMembers', 'backupOwnerName', 'backupOwnerId', 'isBackupActive', 'backupReason', 'backupFrom', 'backupTo', 'assignmentNotes', 'staffCodes',
  'storeUrl', 'bookingSheetUrl', 'defaultSheetTab',
]);
const PIC_LINK_FIELDS = new Set<string>(['storeUrl', 'bookingSheetUrl', 'defaultSheetTab']);

// PATCH /api/master-data — lưu phân công một gian (bàn giao, người cùng làm, dự phòng) lên máy chủ, ghi nhật ký phân công
export async function PATCH(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== req.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const user = await requestActor(req);
    if (!user) throw new RecordError('Phiên không còn quyền truy cập.', 401);
    const body = (await req.json().catch(() => null)) as { storeId?: string; assignment?: Record<string, unknown> } | null;
    if (!body?.storeId || !body.assignment || typeof body.assignment !== 'object') throw new RecordError('Thiếu gian hàng hoặc phân công.');
    const index = await staffIndex();
    const global = isStaffGlobalAdminOrManager(user);
    let changes: AssignmentLogEntry[] = [];
    let savedStore: StorePortfolioItem | undefined;
    let removedBookers: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await readRecord('master-catalog', DEFAULT_MASTER_CATALOG);
      try {
        const result = await updateRecord('master-catalog', DEFAULT_MASTER_CATALOG, current.revision, previous => {
          const store = previous.stores.find(s => s.id === body.storeId);
          if (!store) throw new RecordError('Không tìm thấy gian hàng.', 404);
          const normalizedPrev = normalizeAssignments(previous, index).catalog;
          const positions = storePositionsOf(user, normalizedPrev.stores.find(s => s.id === store.id));
          const patch: Record<string, unknown> = {};
          for (const f of ASSIGNMENT_FIELDS) {
            if (!(f in body.assignment!)) continue;
            const before = JSON.stringify((store as unknown as Record<string, unknown>)[f] ?? null);
            const after = JSON.stringify(body.assignment![f] ?? null);
            if (before === after) continue;
            if (
              !global &&
              !(positions.has('LEADER') && LEADER_FIELDS.has(f)) &&
              !(positions.has('BOOKING_MAIN') && PIC_LINK_FIELDS.has(f))
            ) {
              throw new RecordError(`Bạn không được đổi "${f}" của gian ${store.storeName}. Giám đốc đặt Booking chính và Leader; Leader gian đặt người cùng làm và dự phòng.`, 403);
            }
            patch[f] = body.assignment![f];
          }
          if (patch.backupFrom && patch.backupTo && String(patch.backupTo) < String(patch.backupFrom)) {
            throw new RecordError('Ngày kết thúc dự phòng phải sau ngày bắt đầu.');
          }
          const nextCatalog = {
            ...previous,
            stores: previous.stores.map(s => (s.id === store.id ? ({ ...s, ...patch, updatedAt: new Date().toISOString() } as StorePortfolioItem) : s)),
          };
          const normalized = normalizeAssignments(nextCatalog, index).catalog;
          changes = assignmentChanges(previous, normalized, { name: user.name, code: userStaffCode(user) || undefined });
          savedStore = normalized.stores.find(s => s.id === store.id);
          const before = new Set([storeMainBooking(store), ...storeCoBookings(store)].map(n => n.trim().toLowerCase()).filter(Boolean));
          const after = new Set([storeMainBooking(savedStore!), ...storeCoBookings(savedStore!)].map(n => n.trim().toLowerCase()).filter(Boolean));
          removedBookers = [storeMainBooking(store), ...storeCoBookings(store)].filter(n => n && before.has(n.trim().toLowerCase()) && !after.has(n.trim().toLowerCase()) && n.trim().toLowerCase() !== storeMainBooking(store).trim().toLowerCase());
          return normalized;
        });
        await appendAssignmentLog(changes).catch(() => undefined);
        // Người cùng làm bị gỡ khỏi gian: deal / Job chưa đề nghị thanh toán của họ chuyển về Booking chính
        let reassigned = 0;
        if (savedStore && removedBookers.length) {
          const main = storeMainBooking(savedStore);
          const planIds = (await listMonthlyPlans(user).catch(() => []))
            .map(p => p.plan)
            .filter(p => p.storeId === savedStore!.id || (p.storeName || '').trim().toLowerCase() === savedStore!.storeName.trim().toLowerCase())
            .map(p => p.id);
          for (const name of removedBookers) {
            if (main && name.toLowerCase() !== main.toLowerCase()) {
              reassigned += await transferDealOwner({ planIds, fromPic: name, toPic: main, actorName: user.name, storeCodes: savedStore.staffCodes }).catch(() => 0);
            }
          }
        }
        return NextResponse.json({ store: savedStore, revision: result.revision, changes: changes.length, reassigned }, { headers });
      } catch (e) {
        if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
      }
    }
    throw new RecordError('Dữ liệu gốc đang được cập nhật, thử lại.', 409);
  } catch (e) { return failure(e); }
}
