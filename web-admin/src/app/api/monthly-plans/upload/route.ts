import { NextRequest, NextResponse } from 'next/server';
import { createMonthlyPlan, listMonthlyPlans, saveMonthlyPlan, PlanStoreError, type StoredMonthlyPlan } from '@/lib/server/monthlyPlanStore';
import { readMasterCatalog } from '@/lib/server/masterCatalogStore';
import { parsePlanOrderWorkbook, PlanOrderFileError } from '@/lib/server/planOrderUpload';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { validateBreakdown, hasBreakdownData } from '@/lib/planBreakdownRules';
import type { InputPlanBreakdownState } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../_shared';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const EDITABLE_STATUS = new Set(['DRAFT', 'REVISION_REQUESTED']);

const norm = (v?: string) => (v || '').trim().toLowerCase();

/** Tìm kế hoạch đã có của cùng gian hàng trong cùng tháng (nhân viên có thể đã lập nháp trước khi có bảng 4.1). */
function findExisting(list: StoredMonthlyPlan[], p: InputPlanBreakdownState): StoredMonthlyPlan | undefined {
  return list.find(
    e =>
      e.plan.month === p.month &&
      ((p.storeId && e.plan.storeId === p.storeId) || (norm(e.plan.storeName) && norm(e.plan.storeName) === norm(p.storeName)))
  );
}

// POST /api/monthly-plans/upload — nhận file 4.1 Plan order tổng.
// mode=preview: chỉ đọc file và trả danh sách. mode=commit: tạo kế hoạch cho gian chưa có,
// gắn số 4.1 vào kế hoạch nháp đã có để đối chiếu và cảnh báo lệch.
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  if (!isStaffGlobalAdminOrManager(actor)) {
    return NextResponse.json({ error: 'Chỉ quản lý được tải Plan order tổng.' }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    const mode = form.get('mode') === 'commit' ? 'commit' : 'preview';
    const month = typeof form.get('month') === 'string' ? (form.get('month') as string) : undefined;
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Chưa chọn file.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File quá lớn (tối đa 20 MB).' }, { status: 400 });
    }

    const { data } = await readMasterCatalog();
    const parsed = await parsePlanOrderWorkbook(await file.arrayBuffer(), {
      month: month || undefined,
      stores: data.stores,
      importedBy: actor.name,
    });
    const existingPlans = await listMonthlyPlans(actor);

    const summary = parsed.plans.map(p => {
      const ex = findExisting(existingPlans, p);
      let relation: 'new' | 'draft' | 'locked' = 'new';
      let mismatches = 0;
      if (ex) {
        relation = EDITABLE_STATUS.has(ex.plan.status || 'DRAFT') ? 'draft' : 'locked';
        if (relation === 'draft' && hasBreakdownData(validateBreakdown({ ...ex.plan, reference41: p.reference41 }).rows)) {
          mismatches = validateBreakdown({ ...ex.plan, reference41: p.reference41 }).issues.filter(i => i.needsNote).length;
        }
      }
      return {
        id: p.id,
        storeName: p.storeName,
        brandName: p.brandName,
        pic: p.pic || null,
        matchedStore: Boolean(p.storeId),
        bookingLeader: p.bookingLeader ?? null,
        totalTargetBudget: p.totalTargetBudget,
        totalTargetContents: p.totalTargetContents,
        relation,
        mismatches,
      };
    });

    if (mode === 'preview') {
      return NextResponse.json({
        month: parsed.month,
        availableMonths: parsed.availableMonths,
        plans: summary,
        skipped: parsed.skipped,
        warnings: parsed.warnings,
      });
    }

    let created = 0;
    let compared = 0;
    let locked = 0;
    const mismatched: { storeName: string; count: number }[] = [];
    for (const plan of parsed.plans) {
      const ex = findExisting(existingPlans, plan);
      if (!ex) {
        await createMonthlyPlan(plan, actor);
        created += 1;
        continue;
      }
      if (!EDITABLE_STATUS.has(ex.plan.status || 'DRAFT')) {
        locked += 1;
        continue;
      }
      try {
        const next: InputPlanBreakdownState = { ...ex.plan, reference41: plan.reference41 };
        await saveMonthlyPlan(ex.plan.id, next, ex.revision, actor);
        compared += 1;
        const count = validateBreakdown(next).issues.filter(i => i.needsNote).length;
        if (count > 0 && hasBreakdownData(validateBreakdown(next).rows)) mismatched.push({ storeName: ex.plan.storeName || ex.plan.title, count });
      } catch (err) {
        if (err instanceof PlanStoreError && (err.code === 'CONFLICT' || err.code === 'LOCKED')) {
          locked += 1;
        } else {
          throw err;
        }
      }
    }
    return NextResponse.json({
      month: parsed.month,
      created,
      compared,
      locked,
      mismatched,
      skipped: parsed.skipped,
      warnings: parsed.warnings,
    });
  } catch (err) {
    if (err instanceof PlanOrderFileError) return NextResponse.json({ error: err.message }, { status: 400 });
    return handlePlanError(err);
  }
}
