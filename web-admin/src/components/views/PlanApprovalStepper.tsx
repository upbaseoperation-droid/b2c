'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  Lock,
  PlusCircle,
} from 'lucide-react';
import {
  InputPlanBreakdownState,
  MonthlyPlanStatus,
  PlanDiscussionRole,
  MultiPartySignOff,
  PlanVersionSnapshot,
  UserProfile,
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';
import { Modal } from '../ui';
import { getPlanVersionSnapshots } from '../../lib/monthlyPlanData';
import { resolveStoreBookingLeader } from '../../lib/larkPaymentRequestEngine';

interface PlanApprovalStepperProps {
  plan: InputPlanBreakdownState;
  currentRole: PlanDiscussionRole;
  currentUser?: UserProfile;
  onRoleChange?: (role: PlanDiscussionRole) => void;
  onStatusChange: (newStatus: MonthlyPlanStatus, logMessage: string, note?: string) => void;
  onUpdatePlan?: (updated: Partial<InputPlanBreakdownState>) => void;
  onNotify?: (msg: string) => void;
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

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
      confirmed: ['LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(status),
      confirmedBy: plan.approvedBy || 'Đặng Thị Yến Nhi',
      confirmedAt: plan.approvedAt,
      note: 'Phê duyệt kế hoạch tháng.',
    },
  };
}

export const PlanApprovalStepper: React.FC<PlanApprovalStepperProps> = ({
  plan,
  currentRole,
  currentUser,
  onRoleChange,
  onStatusChange,
  onUpdatePlan,
  onNotify,
  headerExtra,
  footerExtra,
}) => {
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [isActionNoteOpen, setIsActionNoteOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<
    'CONFIRM_BOOKING' | 'CONFIRM_LEADER' | 'FINAL_APPROVE' | null
  >(null);

  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState('v1.1');
  const [newVersionTitle, setNewVersionTitle] = useState('Điều chỉnh Đợt 2 - Cập nhật ngân sách & chỉ tiêu');
  const [newChangeReason, setNewChangeReason] = useState('');
  const [newBudget, setNewBudget] = useState(plan.totalTargetBudget);
  const [newAdsBudget, setNewAdsBudget] = useState(plan.budgetAdsTotal || 45000000);
  const [newGmv, setNewGmv] = useState(plan.targetGmv);

  const currentVersion = plan.currentVersionCode || 'v1.0';
  const isLocked = Boolean(plan.isVersionLocked);
  const resolvedLeader = resolveStoreBookingLeader(plan.storeName || plan.brandName, plan.bookingLeader);
  const hasLeader = Boolean(resolvedLeader);
  const leaderConfirmed =
    plan.leaderApprovalStatus === 'ĐÃ_SƠ_DUYỆT' ||
    ['LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || '');

  const b2cOrderSourced = Boolean(plan.reference41);
  const signOff: MultiPartySignOff = deriveSignOff(plan);
  const allPrePartiesConfirmed = signOff.booking.confirmed && (!hasLeader || leaderConfirmed);

  const normName = (v?: string) => (v || '').trim().toLowerCase();
  const isGlobalManager = ['ADMIN', 'MANAGER'].includes(currentUser?.role || '') || currentRole === 'LEAD';
  const isPlanLeader = Boolean(resolvedLeader) && normName(currentUser?.name) === normName(resolvedLeader);
  const canLeaderAct = isGlobalManager || isPlanLeader;

  const handleConfirmAction = () => {
    if (!pendingActionType) return;
    const now = new Date().toISOString();
    const updatedSignOff = { ...signOff };

    if (pendingActionType === 'CONFIRM_BOOKING') {
      const author = currentUser?.name || plan.primaryPic || plan.pic || 'Lê Phương Thảo';
      updatedSignOff.booking = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Booking PIC đã hoàn thành phân rã chi tiết 4 kênh và định mức KL1-KL7.',
      };
      const nextAll = !hasLeader || leaderConfirmed;
      const msg = `Marketing B2C (${author}) đã gửi duyệt cơ cấu phân rã KOC & kênh: "${actionNote || 'Khớp trần chi phí'}"`;
      onStatusChange(nextAll ? 'PENDING_APPROVAL' : 'PENDING_PRE_APPROVAL', msg, actionNote);
    } else if (pendingActionType === 'CONFIRM_LEADER') {
      const author = currentUser?.name || resolvedLeader || 'Nguyễn Thị Ngọc Tâm';
      const note = actionNote || 'Trưởng nhóm đã sơ duyệt cơ cấu phân bổ KOC và tỷ trọng kênh.';
      if (onUpdatePlan) {
        onUpdatePlan({
          leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT',
          leaderApprovedBy: author,
          leaderApprovedAt: now,
          leaderNotes: note,
        });
      }
      const msg = `Trưởng nhóm B2C (${author}) đã sơ duyệt nội bộ: "${note}"`;
      onStatusChange('PENDING_APPROVAL', msg, note);
      setIsActionNoteOpen(false);
      setActionNote('');
      setPendingActionType(null);
      if (onNotify) onNotify('Trưởng nhóm đã sơ duyệt thành công!');
      return;
    } else if (pendingActionType === 'FINAL_APPROVE') {
      const author = currentUser?.name || 'Đặng Thị Yến Nhi';
      updatedSignOff.leadB2c = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Giám đốc Marketing B2C phê duyệt chính thức và khóa phiên bản.',
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

      if (onUpdatePlan) {
        onUpdatePlan({
          multiPartySignOff: updatedSignOff,
          isVersionLocked: true,
          status: 'IN_EXECUTION',
          approvedBy: author,
          approvedAt: now,
          versionSnapshots: [...(plan.versionSnapshots || []), snapshot],
        });
      }

      const msg = `Giám đốc Marketing B2C (${author}) đã phê duyệt chính thức và khóa phiên bản ${currentVersion}.`;
      onStatusChange('IN_EXECUTION', msg, actionNote);
      if (onNotify) onNotify(`Đã phê duyệt và khóa ${currentVersion} thành công!`);

      setIsActionNoteOpen(false);
      setActionNote('');
      setPendingActionType(null);
      return;
    }

    if (onUpdatePlan) {
      onUpdatePlan({ multiPartySignOff: updatedSignOff });
    }

    setIsActionNoteOpen(false);
    setActionNote('');
    setPendingActionType(null);
    if (onNotify) onNotify('Đã cập nhật trạng thái duyệt!');
  };

  const handleCreateNewVersion = () => {
    if (!newChangeReason.trim()) {
      if (onNotify) onNotify('Vui lòng nhập lý do điều chỉnh phiên bản!');
      return;
    }

    const now = new Date().toISOString();
    const author = currentUser?.name || plan.approvedBy || 'Đặng Thị Yến Nhi';
    const existingSnapshots = getPlanVersionSnapshots(plan).map(s => ({
      ...s,
      status: s.versionCode === 'v1.0' ? ('LOCKED' as const) : ('SUPERSEDED' as const),
    }));

    const updatedSignOff: MultiPartySignOff = {
      booking: { confirmed: false, note: 'Chờ B2C cập nhật lại cơ cấu theo số mới' },
      leadB2c: { confirmed: false, note: `Khởi tạo phiên bản mới ${newVersionCode}: ${newChangeReason}` },
    };

    const nextAffBudget = Math.round(Math.max(0, newBudget - newAdsBudget) * 0.7);
    const nextSelfBudget = Math.round(Math.max(0, newBudget - newAdsBudget) * 0.2);
    const nextMultiBudget = Math.max(0, newBudget - newAdsBudget - nextAffBudget - nextSelfBudget);

    const nextLayer1 = {
      ...(plan.coreMetricsLayer1 || {
        targetGmvAffiliate: Math.round(newGmv * 0.72),
        targetGmvSelfChannel: Math.round(newGmv * 0.18),
        targetGmvLivestream: Math.round(newGmv * 0.10),
        budgetLivestreamNet: 0,
        targetAdsRoas: 4.5,
        qtyAffiliatePaid: 30,
        qtyFocSample: 50,
        qtySelfChannel: 20,
        qtyMultiPlatform: 10,
        qtyLivestreamSessions: 4,
      }),
      isLocked: false,
      pnlTotalBudgetNet: newBudget,
      targetNmvTotal: newGmv,
      budgetAdsNet: newAdsBudget,
      budgetAffiliateNet: nextAffBudget,
      budgetSelfChannelNet: nextSelfBudget,
      budgetMultiPlatformNet: nextMultiBudget,
      alignmentNote: `Bản điều chỉnh ${newVersionCode}: ${newChangeReason}`,
    };

    const newSnap: PlanVersionSnapshot = {
      id: `SNAP-${plan.id}-${newVersionCode.replace(/[^a-zA-Z0-9]/g, '')}-${now.slice(-5).replace(/[^0-9]/g, '')}`,
      versionCode: newVersionCode,
      versionName: newVersionTitle || `${newVersionCode} - Điều chỉnh giữa kỳ`,
      status: 'LOCKED',
      createdAt: now,
      createdBy: author,
      creatorRole: 'LEAD',
      changeReason: newChangeReason,
      totalTargetBudget: newBudget,
      totalTargetContents: plan.totalTargetContents,
      targetGmv: newGmv,
      budgetAdsTotal: newAdsBudget,
      budgetAffiliate: nextAffBudget,
      budgetSelfChannel: nextSelfBudget,
      coreMetricsLayer1: nextLayer1,
      items: plan.items || [],
      signOffRecord: updatedSignOff,
    };

    if (onUpdatePlan) {
      onUpdatePlan({
        currentVersionCode: newVersionCode,
        isVersionLocked: false,
        totalTargetBudget: newBudget,
        budgetAdsTotal: newAdsBudget,
        budgetAffiliate: nextAffBudget,
        budgetSelfChannel: nextSelfBudget,
        targetGmv: newGmv,
        coreMetricsLayer1: nextLayer1,
        multiPartySignOff: updatedSignOff,
        leaderApprovalStatus: hasLeader ? 'CHƯA_DUYỆT' : 'KHÔNG_ÁP_DỤNG',
        versionSnapshots: [...existingSnapshots, newSnap],
        status: 'DRAFT',
        notes: `Phiên bản ${newVersionCode} do ${author} khởi tạo: ${newChangeReason}`,
      });
    }

    const msg = `${author} đã khởi tạo phiên bản điều chỉnh ${newVersionCode}: "${newChangeReason}". Ngân sách mới: ${formatVndShort(newBudget)}, Gói Ads: ${formatVndShort(newAdsBudget)}, Target GMV: ${formatVndShort(newGmv)}.`;
    onStatusChange('DRAFT', msg, newChangeReason);

    setIsNewVersionModalOpen(false);
    if (onNotify) onNotify(`Đã khởi tạo phiên bản ${newVersionCode}!`);
  };

  const handleRevisionSubmit = () => {
    if (!revisionNote.trim()) {
      if (onNotify) onNotify('Vui lòng nhập nội dung cần điều chỉnh!');
      return;
    }

    const actor =
      isPlanLeader && !isGlobalManager
        ? `Trưởng nhóm B2C (${currentUser?.name})`
        : `Giám đốc Marketing B2C (${currentUser?.name || 'Đặng Thị Yến Nhi'})`;
    const log = `${actor} yêu cầu hiệu chỉnh kế hoạch: "${revisionNote}"`;

    onStatusChange('REVISION_REQUESTED', log, revisionNote);
    setIsRevisionModalOpen(false);
    setRevisionNote('');
    if (onNotify) onNotify('Đã gửi yêu cầu hiệu chỉnh!');
  };

  const partyRows: Array<{
    key: string;
    partyName: string;
    personName: string;
    summary: string;
    confirmed: boolean;
    action?: React.ReactNode;
  }> = [
    {
      key: 'booking',
      partyName: 'Marketing B2C',
      personName: signOff.booking.confirmedBy || plan.primaryPic || plan.pic || 'Lê Phương Thảo',
      summary: `${plan.totalTargetContents} video · KL1–KL7 & FOC`,
      confirmed: signOff.booking.confirmed,
      action:
        currentRole === 'BOOKING' && !signOff.booking.confirmed && !isLocked && !b2cOrderSourced ? (
          <button
            type="button"
            onClick={() => {
              setPendingActionType('CONFIRM_BOOKING');
              setIsActionNoteOpen(true);
            }}
            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-2xs transition cursor-pointer shrink-0"
          >
            Duyệt
          </button>
        ) : null,
    },
    ...(hasLeader
      ? [
          {
            key: 'leader',
            partyName: 'Trưởng nhóm B2C',
            personName: plan.leaderApprovedBy || resolvedLeader || 'Nguyễn Thị Ngọc Tâm',
            summary: 'Sơ duyệt nội bộ gian hàng',
            confirmed: leaderConfirmed,
            action:
              canLeaderAct && !leaderConfirmed && !isLocked && plan.status === 'PENDING_PRE_APPROVAL' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPendingActionType('CONFIRM_LEADER');
                    setIsActionNoteOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-2xs transition cursor-pointer shrink-0"
                >
                  Duyệt
                </button>
              ) : null,
          },
        ]
      : []),
    {
      key: 'lead',
      partyName: 'Giám đốc MKT B2C',
      personName: signOff.leadB2c.confirmedBy || plan.approvedBy || 'Đặng Thị Yến Nhi',
      summary: `Chốt & khóa ${currentVersion}`,
      confirmed: signOff.leadB2c.confirmed,
      action:
        currentRole === 'LEAD' && !signOff.leadB2c.confirmed && !isLocked ? (
          <button
            type="button"
            disabled={!allPrePartiesConfirmed}
            onClick={() => {
              setPendingActionType('FINAL_APPROVE');
              setIsActionNoteOpen(true);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold text-2xs transition shrink-0 ${
              allPrePartiesConfirmed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
            title={allPrePartiesConfirmed ? 'Phê duyệt & khóa phiên bản' : 'Cần chuyên viên/trưởng nhóm xác nhận trước khi chốt'}
          >
            {allPrePartiesConfirmed ? 'Duyệt chốt' : 'Chờ đủ bên'}
          </button>
        ) : null,
    },
  ];

  const visibleRows = partyRows;
  const confirmedCount = visibleRows.filter(r => r.confirmed).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1.5 shadow-2xs">
      {/* Thanh tiêu đề gọn 1 dòng */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                confirmedCount === visibleRows.length ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          )}
          <h3 className="font-semibold text-xs text-slate-900">
            Trạng thái duyệt ({confirmedCount}/{visibleRows.length} bên)
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-2xs font-semibold text-slate-700">
            {currentVersion}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {headerExtra}
          {onRoleChange && (
            <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-2xs">
              <UserCheck className="w-3 h-3 text-slate-400" />
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as PlanDiscussionRole)}
                className="font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Đổi vai trò duyệt thử"
              >
                <option value="BOOKING">Vai trò: Marketing B2C</option>
                <option value="LEAD">Vai trò: Giám đốc MKT</option>
              </select>
            </div>
          )}
          {!isLocked && canLeaderAct && (
            <button
              type="button"
              onClick={() => setIsRevisionModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-2xs transition cursor-pointer"
              title="Yêu cầu chỉnh sửa"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Yêu cầu sửa</span>
            </button>
          )}
          {currentRole === 'LEAD' && (
            <button
              type="button"
              onClick={() => {
                const current = parseFloat(currentVersion.replace(/[^0-9.]/g, '')) || 1;
                setNewVersionCode(`v${(Math.round(current * 10) + 1) / 10}`.replace(/^v(\d+)$/, 'v$1.0'));
                setIsNewVersionModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-2xs transition cursor-pointer"
              title="Tạo phiên bản điều chỉnh mới"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Bản mới</span>
            </button>
          )}
          {footerExtra}
        </div>
      </div>

      {/* Danh sách các bên: mỗi bên đúng 1 dòng — Xanh là Đã duyệt, Đỏ là Chưa duyệt */}
      <div className="space-y-1">
        {visibleRows.map((row) => (
          <div
            key={row.key}
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition ${
              row.confirmed
                ? 'bg-emerald-50/75 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/75 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {row.confirmed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              )}
              <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-2xs">{row.partyName}</span>
                <span className="text-slate-400">·</span>
                <span className="font-medium text-2xs truncate">{row.personName}</span>
                <span className="text-2xs text-slate-500 font-mono truncate hidden xl:inline">({row.summary})</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {row.action}
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-semibold ${
                  row.confirmed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {row.confirmed ? 'Đã duyệt' : 'Chưa duyệt'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Hộp thoại: Tạo phiên bản kế hoạch mới */}
      <Modal
        open={isNewVersionModalOpen}
        onClose={() => setIsNewVersionModalOpen(false)}
        title={`Khởi tạo phiên bản mới từ ${currentVersion}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewVersionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCreateNewVersion}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              Kích hoạt {newVersionCode}
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-ink font-semibold mb-1">Mã phiên bản mới</label>
              <input
                type="text"
                value={newVersionCode}
                onChange={(e) => setNewVersionCode(e.target.value)}
                className="w-full px-3 py-1.5 border border-line rounded-xl text-xs font-semibold text-accent focus:outline-none focus:border-accent"
                placeholder="v1.1, v2.0..."
              />
            </div>
            <div>
              <label className="block text-ink font-semibold mb-1">Tên phiên bản</label>
              <input
                type="text"
                value={newVersionTitle}
                onChange={(e) => setNewVersionTitle(e.target.value)}
                className="w-full px-3 py-1.5 border border-line rounded-xl text-xs font-medium focus:outline-none focus:border-accent"
                placeholder="VD: Điều chỉnh Đợt 2..."
              />
            </div>
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1">
              Lý do điều chỉnh <span className="text-critical">*</span>
            </label>
            <textarea
              rows={3}
              value={newChangeReason}
              onChange={(e) => setNewChangeReason(e.target.value)}
              placeholder="Nhập lý do điều chỉnh ngân sách hoặc chỉ tiêu..."
              className="w-full px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="bg-canvas p-3 rounded-xl border border-line space-y-2.5">
            <div className="font-semibold text-ink text-2xs">Chỉ tiêu và ngân sách giao mới</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-2xs text-ink-2 block mb-0.5">Tổng ngân sách (VNĐ)</label>
                <input
                  type="number"
                  step={5000000}
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-line-strong rounded-lg text-xs font-semibold text-ink"
                />
              </div>
              <div>
                <label className="text-2xs text-ink-2 block mb-0.5">Gói Ads tổng (Media)</label>
                <input
                  type="number"
                  step={5000000}
                  value={newAdsBudget}
                  onChange={(e) => setNewAdsBudget(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-line-strong rounded-lg text-xs font-semibold text-accent"
                />
              </div>
              <div>
                <label className="text-2xs text-ink-2 block mb-0.5">Target GMV (VNĐ)</label>
                <input
                  type="number"
                  step={50000000}
                  value={newGmv}
                  onChange={(e) => setNewGmv(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-line-strong rounded-lg text-xs font-semibold text-positive"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Hộp thoại: Xác nhận duyệt */}
      <Modal
        open={isActionNoteOpen}
        onClose={() => {
          setIsActionNoteOpen(false);
          setPendingActionType(null);
          setActionNote('');
        }}
        title={
          pendingActionType === 'CONFIRM_BOOKING'
            ? 'Marketing B2C: Xác nhận cơ cấu phân rã'
            : pendingActionType === 'CONFIRM_LEADER'
            ? 'Trưởng nhóm B2C: Sơ duyệt nội bộ'
            : `Giám đốc MKT B2C: Phê duyệt & khóa ${currentVersion}`
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsActionNoteOpen(false);
                setPendingActionType(null);
                setActionNote('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              Xác nhận duyệt
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="bg-canvas p-3 rounded-xl border border-line space-y-1">
            <div className="text-ink-2">
              Kế hoạch: <strong className="text-ink">{plan.title}</strong>
            </div>
            <div className="text-ink-2">
              Phiên bản: <strong className="text-accent">{currentVersion}</strong> • Ngân sách: <strong>{formatVndShort(plan.totalTargetBudget)}</strong> • Gói Ads: <strong className="text-accent">{formatVndShort(plan.budgetAdsTotal || 0)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1">Ghi chú duyệt</label>
            <textarea
              rows={3}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Nhập ghi chú xác nhận..."
              className="w-full px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Hộp thoại: Yêu cầu hiệu chỉnh */}
      <Modal
        open={isRevisionModalOpen}
        onClose={() => {
          setIsRevisionModalOpen(false);
          setRevisionNote('');
        }}
        title="Yêu cầu hiệu chỉnh kế hoạch"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRevisionModalOpen(false);
                setRevisionNote('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleRevisionSubmit}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              Gửi yêu cầu sửa
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Nội dung cần điều chỉnh <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Ví dụ: Tăng số lượng KOC Micro Shopee lên 15 video, giảm ngân sách KL5..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
