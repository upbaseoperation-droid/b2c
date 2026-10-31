import type {
  InputPlanBreakdownState,
  MultiPartySignOff,
  PlanVersionSnapshot,
} from './types';
import { resolveStoreBookingLeader } from './larkPaymentRequestEngine';

/**
 * Duyệt chốt kế hoạch tháng: MỘT đường duy nhất cho Studio, hộp thoại lịch sử và danh sách
 * (UI_SYNC_PLAN.md §5 bước 2, quyết định 31/10/2026). Duyệt chốt luôn: đặt trạng thái IN_EXECUTION,
 * khóa phiên bản, chụp bản lưu, ghi chữ ký đủ các bên. Chỉ được duyệt khi các bên trước đã xác nhận.
 */

const APPROVED_AFTER_LEADER = ['LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'];

/** Trạng thái ký duyệt các bên: dùng dữ liệu đã ký, nếu chưa có thì suy ra từ trạng thái kế hoạch. */
export function deriveSignOff(plan: InputPlanBreakdownState): MultiPartySignOff {
  const status = plan.status || 'DRAFT';
  return plan.multiPartySignOff || {
    booking: {
      confirmed: status !== 'DRAFT' && status !== 'REVISION_REQUESTED',
      confirmedBy: plan.primaryPic || plan.pic || 'Lê Phương Thảo',
      confirmedAt: plan.submittedAt,
      note: 'Đã phân rã cơ cấu KOC theo KL1-KL7 và Kênh thương hiệu.',
    },
    leadB2c: {
      confirmed: APPROVED_AFTER_LEADER.includes(status),
      confirmedBy: plan.approvedBy || 'Đặng Thị Yến Nhi',
      confirmedAt: plan.approvedAt,
      note: 'Phê duyệt kế hoạch tháng.',
    },
  };
}

export interface PlanApprovalGate {
  hasLeader: boolean;
  leaderConfirmed: boolean;
  signOff: MultiPartySignOff;
  /** Booking đã gửi và (nếu gian có Trưởng nhóm) Trưởng nhóm đã sơ duyệt. */
  allPrePartiesConfirmed: boolean;
}

export function getPlanApprovalGate(plan: InputPlanBreakdownState): PlanApprovalGate {
  const resolvedLeader = resolveStoreBookingLeader(plan.storeName || plan.brandName, plan.bookingLeader);
  const hasLeader = Boolean(resolvedLeader);
  const leaderConfirmed =
    plan.leaderApprovalStatus === 'ĐÃ_SƠ_DUYỆT' || APPROVED_AFTER_LEADER.includes(plan.status || '');
  const signOff = deriveSignOff(plan);
  return { hasLeader, leaderConfirmed, signOff, allPrePartiesConfirmed: signOff.booking.confirmed && (!hasLeader || leaderConfirmed) };
}

/** Có được duyệt chốt chưa. `reason` nói rõ đang chờ bên nào, dùng để hiện cho người dùng. */
export function canFinalApprovePlan(plan: InputPlanBreakdownState): { ok: boolean; reason?: string } {
  if (plan.isVersionLocked || plan.status === 'IN_EXECUTION' || plan.status === 'COMPLETED') return { ok: false, reason: 'Kế hoạch đã duyệt chốt.' };
  const gate = getPlanApprovalGate(plan);
  if (!gate.signOff.booking.confirmed) return { ok: false, reason: 'Chờ chuyên viên Booking gửi duyệt.' };
  if (gate.hasLeader && !gate.leaderConfirmed) return { ok: false, reason: 'Chờ Trưởng nhóm sơ duyệt.' };
  return { ok: true };
}

/**
 * Dựng bản duyệt chốt: `patch` (khóa phiên bản, bản lưu, chữ ký) và `log` cho sổ trao đổi.
 * Gọi bằng MỘT lần cập nhật cùng trạng thái IN_EXECUTION để bản vá không bị ghi đè.
 */
export function buildFinalApproval(args: { plan: InputPlanBreakdownState; author: string; note?: string; now?: string }): {
  patch: Partial<InputPlanBreakdownState>;
  log: string;
} {
  const { plan, author } = args;
  const now = args.now || new Date().toISOString();
  const currentVersion = plan.currentVersionCode || 'v1.0';
  const signOff = deriveSignOff(plan);
  const updatedSignOff: MultiPartySignOff = {
    ...signOff,
    leadB2c: {
      confirmed: true,
      confirmedBy: author,
      confirmedAt: now,
      note: args.note || 'Giám đốc Marketing B2C phê duyệt chính thức và khóa phiên bản.',
    },
  };
  const snapshot: PlanVersionSnapshot = {
    id: `SNAP-${plan.id}-${now.slice(-6).replace(/[^0-9]/g, '')}`,
    versionCode: currentVersion,
    versionName: `${currentVersion} - Bản chốt có hiệu lực`,
    status: 'LOCKED',
    createdAt: now,
    createdBy: author,
    creatorRole: 'LEAD',
    changeReason: plan.notes || 'Phiên bản kế hoạch chốt đồng thuận các bên',
    totalTargetBudget: plan.totalTargetBudget,
    totalTargetContents: plan.totalTargetContents,
    targetGmv: plan.targetGmv,
    budgetAdsTotal: plan.budgetAdsTotal || 0,
    budgetAffiliate: plan.budgetAffiliate || 0,
    budgetSelfChannel: plan.budgetSelfChannel || 0,
    items: plan.items || [],
    signOffRecord: updatedSignOff,
  };
  return {
    patch: {
      multiPartySignOff: updatedSignOff,
      isVersionLocked: true,
      status: 'IN_EXECUTION',
      approvedBy: author,
      approvedAt: now,
      versionSnapshots: [...(plan.versionSnapshots || []), snapshot],
    },
    log: `Giám đốc Marketing B2C (${author}) đã phê duyệt chính thức và khóa phiên bản ${currentVersion}.`,
  };
}
