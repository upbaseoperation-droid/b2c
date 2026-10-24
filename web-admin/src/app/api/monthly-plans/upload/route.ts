import { NextRequest, NextResponse } from 'next/server';
import { createMonthlyPlan, listMonthlyPlans, saveMonthlyPlan, PlanStoreError, type StoredMonthlyPlan } from '@/lib/server/monthlyPlanStore';
import { readMasterCatalog } from '@/lib/server/masterCatalogStore';
import { parsePlanOrderWorkbook, PlanOrderFileError } from '@/lib/server/planOrderUpload';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { validateBreakdown, hasBreakdownData, comparePlanWithNewReference41 } from '@/lib/planBreakdownRules';
import type { InputPlanBreakdownState, PlanDiscussionMessage } from '@/lib/types';
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
      const isGrowthLocked = p.reference41?.isGrowthLocked !== false;
      const growthLockLabel = p.reference41?.growthLockLabel || (isGrowthLocked ? 'Đã chốt' : 'Chưa chốt');
      let relation: 'new' | 'draft' | 'locked' = 'new';
      let mismatches = 0;
      let mismatchDetails: string[] = [];
      let lockedHasDiff = false;
      let diffSummary: string[] = [];
      if (ex) {
        relation = EDITABLE_STATUS.has(ex.plan.status || 'DRAFT') ? 'draft' : 'locked';
        const diff = p.reference41 ? comparePlanWithNewReference41(ex.plan, p.reference41) : { hasDiff: false, diffSummary: [] };
        diffSummary = diff.diffSummary;
        if (relation === 'draft') {
          const v = validateBreakdown({ ...ex.plan, reference41: p.reference41 });
          if (hasBreakdownData(v.rows)) {
            const needNotes = v.issues.filter(i => i.needsNote);
            mismatches = needNotes.length;
            mismatchDetails = needNotes.map(i => i.message);
          } else if (diff.hasDiff) {
            mismatchDetails = diff.diffSummary;
          }
        } else {
          lockedHasDiff = diff.hasDiff;
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
        isGrowthLocked,
        growthLockLabel,
        existingStatus: ex?.plan.status,
        relation,
        mismatches,
        mismatchDetails,
        lockedHasDiff,
        diffSummary,
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
    let lockedFlagged = 0;
    let unconfirmedCount = 0;
    const mismatched: { storeName: string; count: number }[] = [];
    const lockedDiffs: { storeName: string; diffSummary: string[] }[] = [];

    for (const plan of parsed.plans) {
      if (plan.reference41?.isGrowthLocked === false) {
        unconfirmedCount += 1;
      }
      const ex = findExisting(existingPlans, plan);
      if (!ex) {
        await createMonthlyPlan(plan, actor);
        created += 1;
        continue;
      }
      if (!EDITABLE_STATUS.has(ex.plan.status || 'DRAFT')) {
        const diff = plan.reference41 ? comparePlanWithNewReference41(ex.plan, plan.reference41) : { hasDiff: false, diffSummary: [] };
        if (diff.hasDiff && plan.reference41) {
          try {
            const warnMsg: PlanDiscussionMessage = {
              id: `DISC-41DIFF-${Date.now()}-${ex.plan.id}`,
              authorName: actor.name,
              authorRole: 'SYSTEM',
              authorTitle: 'Đối soát Plan 4.1',
              content: `Tải lên file 4.1 Plan order tổng mới có thay đổi số liệu so với bản đã duyệt: ${diff.diffSummary.join('; ')}. Hệ thống giữ nguyên bản đã duyệt và gắn cờ "Lệch 4.1 mới" chờ Quản lý mở khóa cập nhật.`,
              type: 'BUDGET_ADJUST',
              timestamp: new Date().toISOString(),
              tags: ['Lệch 4.1 mới'],
            };
            const nextLocked: InputPlanBreakdownState = {
              ...ex.plan,
              pendingReference41: plan.reference41,
              discussions: [warnMsg, ...(ex.plan.discussions || [])],
            };
            await saveMonthlyPlan(ex.plan.id, nextLocked, ex.revision, actor);
            lockedFlagged += 1;
            lockedDiffs.push({ storeName: ex.plan.storeName || ex.plan.title, diffSummary: diff.diffSummary });
          } catch {
            locked += 1;
          }
        } else {
          if (ex.plan.pendingReference41) {
            try {
              await saveMonthlyPlan(ex.plan.id, { ...ex.plan, pendingReference41: undefined }, ex.revision, actor);
            } catch {
              // Bỏ qua nếu đang có xung đột đồng thời
            }
          }
          locked += 1;
        }
        continue;
      }
      try {
        const existingCheck = validateBreakdown(ex.plan);
        const isDraftEmpty = !hasBreakdownData(existingCheck.rows) && (ex.plan.items || []).every(i => (i.qty || 0) === 0);
        const next: InputPlanBreakdownState = {
          ...ex.plan,
          reference41: plan.reference41,
          pendingReference41: undefined,
          ...(isDraftEmpty
            ? {
                totalTargetBudget: plan.totalTargetBudget,
                totalTargetContents: plan.totalTargetContents,
                budgetAffiliate: plan.budgetAffiliate,
                budgetSelfChannel: plan.budgetSelfChannel,
                targetGmv: plan.targetGmv || ex.plan.targetGmv,
              }
            : {}),
        };
        await saveMonthlyPlan(ex.plan.id, next, ex.revision, actor);
        compared += 1;
        const vNext = validateBreakdown(next);
        const count = vNext.issues.filter(i => i.needsNote).length;
        if (count > 0 && hasBreakdownData(vNext.rows)) {
          mismatched.push({ storeName: ex.plan.storeName || ex.plan.title, count });
        }
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
      lockedFlagged,
      unconfirmedCount,
      mismatched,
      lockedDiffs,
      skipped: parsed.skipped,
      warnings: parsed.warnings,
    });
  } catch (err) {
    if (err instanceof PlanOrderFileError) return NextResponse.json({ error: err.message }, { status: 400 });
    return handlePlanError(err);
  }
}
