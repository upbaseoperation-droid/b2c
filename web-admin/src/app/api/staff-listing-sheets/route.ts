import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { ensureLarkListingsSyncedToDb } from '@/lib/server/larkListingDbSync';
import { assertListingSheetAccess, assertStoreBookingAccess } from '@/lib/server/monthlyPlanStore';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import type { StaffBrandSheetCollection, StaffSheetChanges } from '@/lib/staffBrandListingSheet';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const RECORD_KEY = 'staff-brand-listing-sheets-v1';
const EMPTY: StaffBrandSheetCollection = { sheets: {}, googleSheetUrls: {} };
const MAX_ROWS_PER_PATCH = 3000;

/** Gộp thay đổi theo từng dòng (id) vào kho chung: dòng người khác vừa thêm / sửa không bị mất. */
function mergeChanges(current: StaffBrandSheetCollection, changes: StaffSheetChanges): StaffBrandSheetCollection {
  const sheets = { ...(current.sheets || {}) };
  for (const [sheetKey, change] of Object.entries(changes.sheets || {})) {
    const deletes = new Set(change.deletes || []);
    const upserts = new Map((change.upserts || []).filter(r => r && r.id).map(r => [r.id, r]));
    const kept = (sheets[sheetKey] || []).filter(r => !deletes.has(r.id)).map(r => upserts.get(r.id) ?? r);
    const keptIds = new Set(kept.map(r => r.id));
    for (const r of upserts.values()) if (!keptIds.has(r.id)) kept.push(r);
    sheets[sheetKey] = kept;
  }
  return {
    ...current,
    sheets,
    googleSheetUrls: { ...(current.googleSheetUrls || {}), ...(changes.googleSheetUrls || {}) },
    ...(changes.fieldEditPolicy ? { fieldEditPolicy: changes.fieldEditPolicy } : {}),
  };
}

// PATCH /api/staff-listing-sheets — lưu Sheet nhân sự theo phần thay đổi (dòng thêm / sửa / xóa), kiểm quyền theo từng gian
export async function PATCH(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const changes = (await request.json().catch(() => null)) as StaffSheetChanges | null;
    if (!changes || typeof changes !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }
    const rowCount = Object.values(changes.sheets || {}).reduce((s, c) => s + (c.upserts?.length || 0), 0);
    if (rowCount > MAX_ROWS_PER_PATCH) {
      return NextResponse.json({ error: `Tối đa ${MAX_ROWS_PER_PATCH} dòng mỗi lần lưu.` }, { status: 400 });
    }
    // Sheet "YYYY/MM__Gian": Booking / Leader của gian; link Sheet theo tên gian: như trên; chính sách sửa cột: Giám đốc / Admin
    for (const sheetKey of Object.keys(changes.sheets || {})) await assertListingSheetAccess(sheetKey, actor);
    for (const storeKey of Object.keys(changes.googleSheetUrls || {})) await assertStoreBookingAccess(storeKey, actor);
    if (changes.fieldEditPolicy && !isStaffGlobalAdminOrManager(actor)) {
      return NextResponse.json({ error: 'Chỉ Giám đốc / Admin được đổi quyền sửa cột của Sheet nhân sự.' }, { status: 403 });
    }

    await ensureLarkListingsSyncedToDb();
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<StaffBrandSheetCollection>(RECORD_KEY, EMPTY);
      try {
        const saved = await updateRecord<StaffBrandSheetCollection>(RECORD_KEY, EMPTY, rec.revision, data => mergeChanges(data, changes));
        return NextResponse.json({ ok: true, revision: saved.revision });
      } catch (err) {
        if (!(err instanceof RecordError && err.status === 409)) throw err;
      }
    }
    return NextResponse.json({ error: 'Nhiều người đang lưu cùng lúc, vui lòng thử lại.', code: 'CONFLICT' }, { status: 409 });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
