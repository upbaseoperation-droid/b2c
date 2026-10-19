'use client';

import React, { useState } from 'react';
import {
  Clock,
  AlertCircle,
  RotateCcw,
  BadgeCheck,
  UserCheck,
  X,
  Layers,
  Lock,
  PlusCircle,
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  MonthlyPlanStatus, 
  PlanDiscussionRole,
  MultiPartySignOff,
  PlanVersionSnapshot,
  UserProfile
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';
import { ChangeFlash, Presence, StepMark, Status } from '../ui';
import { getPlanVersionSnapshots } from '../../lib/monthlyPlanData';

interface PlanApprovalStepperProps {
  plan: InputPlanBreakdownState;
  currentRole: PlanDiscussionRole;
  currentUser?: UserProfile;
  onRoleChange?: (role: PlanDiscussionRole) => void;
  onStatusChange: (newStatus: MonthlyPlanStatus, logMessage: string, note?: string) => void;
  onUpdatePlan?: (updated: Partial<InputPlanBreakdownState>) => void;
  onNotify?: (msg: string) => void;
  /** Nội dung chèn thêm vào góc phải tiêu đề (vd: trạng thái trao đổi Growth) */
  headerExtra?: React.ReactNode;
  /** Nội dung chèn thêm vào thanh trạng thái dưới (vd: nút mở sổ trao đổi) */
  footerExtra?: React.ReactNode;
}


/** Trạng thái ký duyệt 4 bên: dùng dữ liệu đã ký, nếu chưa có thì suy ra từ trạng thái kế hoạch. */
export function deriveSignOff(plan: InputPlanBreakdownState): MultiPartySignOff {
  const status = plan.status || 'DRAFT';
  return plan.multiPartySignOff || {
    growth: {
      confirmed: ['PRE_APPROVED', 'PENDING_APPROVAL', 'LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(status),
      confirmedBy: plan.growthPic || 'Trần Thị Ánh',
      confirmedAt: plan.preApprovedAt,
      note: 'Đã giao trần ngân sách và gói tổng Ads.'
    },
    booking: {
      confirmed: status !== 'DRAFT' && status !== 'REVISION_REQUESTED',
      confirmedBy: plan.pic || 'Khánh Vy',
      confirmedAt: plan.submittedAt,
      note: 'Đã phân rã cơ cấu KOC theo KL1-KL7 và Kênh thương hiệu.'
    },
    media: {
      confirmed: ['PRE_APPROVED', 'PENDING_APPROVAL', 'LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(status),
      confirmedBy: plan.mediaPic || 'Phan Thành Đạt (Media PIC)',
      confirmedAt: plan.preApprovedAt,
      targetRoas: 4.5,
      note: 'Đã nhận gói Tổng ngân sách Ads, cam kết ROAS và thẩm định góc kịch bản.'
    },
    leadB2c: {
      confirmed: ['LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(status),
      confirmedBy: plan.approvedBy || 'Vân Ngọc (Trưởng Phòng B2C)',
      confirmedAt: plan.approvedAt,
      note: 'Phê duyệt kế hoạch tháng.'
    }
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
  footerExtra
}) => {
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [isActionNoteOpen, setIsActionNoteOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<
    'CONFIRM_GROWTH' | 'CONFIRM_BOOKING' | 'CONFIRM_MEDIA' | 'FINAL_APPROVE' | null
  >(null);
  const [mediaRoasInput, setMediaRoasInput] = useState<number>(plan.multiPartySignOff?.media?.targetRoas || 4.5);

  // Modal tạo phiên bản điều chỉnh mới dành cho Growth
  const [isGrowthNewVersionModalOpen, setIsGrowthNewVersionModalOpen] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState('v1.1');
  const [newVersionTitle, setNewVersionTitle] = useState('Điều chỉnh Đợt 2 - Cập nhật ngân sách & chỉ tiêu');
  const [newChangeReason, setNewChangeReason] = useState('');
  const [newBudget, setNewBudget] = useState(plan.totalTargetBudget);
  const [newAdsBudget, setNewAdsBudget] = useState(plan.budgetAdsTotal || 45000000);
  const [newGmv, setNewGmv] = useState(plan.targetGmv);

  const currentVersion = plan.currentVersionCode || 'v1.0';
  const isLocked = plan.isVersionLocked || false;

  // Dữ liệu ký duyệt 3 bên hiện tại (hoặc mặc định)
  const signOff: MultiPartySignOff = deriveSignOff(plan);

  const allThreePartiesConfirmed = signOff.growth.confirmed && signOff.booking.confirmed && signOff.media.confirmed;

  // Xử lý khi các bên bấm Xác nhận
  const handleConfirmAction = () => {
    if (!pendingActionType) return;
    const now = new Date().toISOString();

    const updatedSignOff = { ...signOff };

    if (pendingActionType === 'CONFIRM_GROWTH') {
      const author = currentUser?.name || plan.growthPic || 'Trần Thị Ánh';
      updatedSignOff.growth = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Growth đã xác nhận số tổng và gói Ads cho gian hàng.'
      };
      const msg = `Growth PIC (${author}) đã xác nhận giao số tổng và gói Ads: "${actionNote || 'Đạt yêu cầu P&L'}"`;
      onStatusChange(allThreePartiesConfirmed ? 'PENDING_APPROVAL' : 'PENDING_PRE_APPROVAL', msg, actionNote);
    } else if (pendingActionType === 'CONFIRM_BOOKING') {
      const author = currentUser?.name || plan.pic || 'Khánh Vy';
      updatedSignOff.booking = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Booking PIC đã hoàn thành phân rã chi tiết 4 kênh và định mức KL1-KL7.'
      };
      const msg = `Booking PIC (${author}) đã xác nhận cơ cấu phân rã KOC và kênh thương hiệu: "${actionNote || 'Khớp trần chi phí'}"`;
      onStatusChange(allThreePartiesConfirmed ? 'PENDING_APPROVAL' : 'PENDING_PRE_APPROVAL', msg, actionNote);
    } else if (pendingActionType === 'CONFIRM_MEDIA') {
      const author = currentUser?.name || plan.mediaPic || 'Phan Thành Đạt';
      updatedSignOff.media = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        targetRoas: mediaRoasInput,
        acceptedAdsBudget: plan.budgetAdsTotal || 45000000,
        note: actionNote || `Media nhận trọn gói ngân sách Ads ${formatVndShort(plan.budgetAdsTotal || 0)} và cam kết ROAS ${mediaRoasInput}x.`
      };
      const msg = `Media PIC (${author}) đã xác nhận nhận gói tổng ngân sách Ads (${formatVndShort(plan.budgetAdsTotal || 0)}) và cam kết ROAS ${mediaRoasInput}x: "${actionNote || 'Cam kết ROAS đạt chuẩn'}"`;
      onStatusChange(allThreePartiesConfirmed ? 'PENDING_APPROVAL' : 'PENDING_PRE_APPROVAL', msg, actionNote);
    } else if (pendingActionType === 'FINAL_APPROVE') {
      const author = currentUser?.name || 'Vân Ngọc (Trưởng Phòng B2C)';
      updatedSignOff.leadB2c = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Trưởng phòng phê duyệt chính thức và khóa phiên bản.'
      };

      // Đóng băng dữ liệu phiên bản chốt (Freeze Snapshot)
      const snapshot: PlanVersionSnapshot = {
        id: `SNAP-${plan.id}-${now.slice(-6).replace(/[^0-9]/g, '')}`,
        versionCode: currentVersion,
        versionName: `${currentVersion} - Bản chốt có hiệu lực`,
        status: 'LOCKED',
        createdAt: now,
        createdBy: author,
        creatorRole: 'LEAD',
        changeReason: plan.notes || 'Phiên bản kế hoạch chốt đồng thuận 3 bên',
        totalTargetBudget: plan.totalTargetBudget,
        totalTargetContents: plan.totalTargetContents,
        targetGmv: plan.targetGmv,
        budgetAdsTotal: plan.budgetAdsTotal || 0,
        budgetAffiliate: plan.budgetAffiliate || 0,
        budgetSelfChannel: plan.budgetSelfChannel || 0,
        items: plan.items || [],
        signOffRecord: updatedSignOff
      };

      if (onUpdatePlan) {
        onUpdatePlan({
          multiPartySignOff: updatedSignOff,
          isVersionLocked: true,
          status: 'IN_EXECUTION',
          versionSnapshots: [...(plan.versionSnapshots || []), snapshot]
        });
      }

      const msg = `Trưởng Phòng B2C đã Phê duyệt chính thức và khóa phiên bản ${currentVersion}. Kế hoạch chuyển sang trạng thái triển khai thực thi.`;
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
    if (onNotify) onNotify('Đã cập nhật xác nhận thành công!');
  };

  // Xử lý khi Growth tạo phiên bản mới
  const handleGrowthCreateNewVersion = () => {
    if (!newChangeReason.trim()) {
      if (onNotify) onNotify('Vui lòng nhập lý do điều chỉnh phiên bản!');
      return;
    }

    const now = new Date().toISOString();
    const author = currentUser?.name || plan.growthPic || 'Trần Thị Ánh';
    const existingSnapshots = getPlanVersionSnapshots(plan).map(s => ({
      ...s,
      status: s.versionCode === 'v1.0' ? ('LOCKED' as const) : ('SUPERSEDED' as const)
    }));

    const updatedSignOff: MultiPartySignOff = {
      growth: {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: `Khởi tạo phiên bản mới ${newVersionCode}: ${newChangeReason}`
      },
      booking: { confirmed: false, note: 'Chờ Booking cập nhật lại cơ cấu theo số mới' },
      media: { confirmed: false, note: 'Chờ Media cập nhật lại gói Ads mới' },
      leadB2c: { confirmed: false }
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
      alignmentNote: `Bản điều chỉnh ${newVersionCode}: ${newChangeReason} (Mở khóa điều chỉnh cả Layer 1 & Layer 2)`,
    };

    const newSnap: PlanVersionSnapshot = {
      id: `SNAP-${plan.id}-${newVersionCode.replace(/[^a-zA-Z0-9]/g, '')}-${now.slice(-5).replace(/[^0-9]/g, '')}`,
      versionCode: newVersionCode,
      versionName: newVersionTitle || `${newVersionCode} - Điều chỉnh giữa kỳ`,
      status: 'LOCKED',
      createdAt: now,
      createdBy: author,
      creatorRole: 'GROWTH',
      changeReason: newChangeReason,
      totalTargetBudget: newBudget,
      totalTargetContents: plan.totalTargetContents,
      targetGmv: newGmv,
      budgetAdsTotal: newAdsBudget,
      budgetAffiliate: nextAffBudget,
      budgetSelfChannel: nextSelfBudget,
      coreMetricsLayer1: nextLayer1,
      items: plan.items || [],
      signOffRecord: updatedSignOff
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
        versionSnapshots: [...existingSnapshots, newSnap],
        status: 'DRAFT',
        notes: `Phiên bản ${newVersionCode} do Growth (${author}) khởi tạo: ${newChangeReason}`
      });
    }

    const msg = `Growth PIC (${author}) đã khởi tạo phiên bản điều chỉnh mới ${newVersionCode}: "${newChangeReason}". Ngân sách mới: ${formatVndShort(newBudget)}, Gói Ads mới: ${formatVndShort(newAdsBudget)}, Target GMV: ${formatVndShort(newGmv)}.`;
    onStatusChange('DRAFT', msg, newChangeReason);

    setIsGrowthNewVersionModalOpen(false);
    if (onNotify) onNotify(`Đã khởi tạo thành công phiên bản ${newVersionCode}! Mời B2C và Media vào rà soát.`);
  };

  const handleRevisionSubmit = () => {
    if (!revisionNote.trim()) {
      if (onNotify) onNotify('Vui lòng nhập lý do / nội dung cần điều chỉnh!');
      return;
    }

    const actor = currentRole === 'GROWTH' 
      ? `Growth PIC (${plan.growthPic || 'Growth Team'})` 
      : currentRole === 'MEDIA'
      ? `Media PIC (${plan.mediaPic || 'Media Team'})`
      : `Trưởng Phòng B2C`;
    const log = `${actor} đã yêu cầu hiệu chỉnh kế hoạch: "${revisionNote}"`;

    onStatusChange('REVISION_REQUESTED', log, revisionNote);
    setIsRevisionModalOpen(false);
    setRevisionNote('');
    if (onNotify) onNotify('Đã gửi yêu cầu hiệu chỉnh về cho Booking PIC!');
  };

  // Cấu hình 4 bước đồng thuận để hiển thị dạng dãy bước gọn
  const confirmedCount = [signOff.growth, signOff.booking, signOff.media, signOff.leadB2c].filter(s => s.confirmed).length;
  const steps: Array<{
    key: string;
    no: number;
    team: string;
    task: string;
    confirmed: boolean;
    doneLabel: string;
    pendingLabel: string;
    confirmedBy?: string;
    lines: Array<{ label: string; value: React.ReactNode }>;
    action?: React.ReactNode;
  }> = [
    {
      key: 'growth',
      no: 1,
      team: 'Growth',
      task: 'Giao số tổng & gói Ads',
      confirmed: signOff.growth.confirmed,
      doneLabel: 'Đã xác nhận',
      pendingLabel: 'Chờ xác nhận',
      confirmedBy: signOff.growth.confirmedBy,
      lines: [
        { label: 'Ngân sách', value: formatVndShort(plan.totalTargetBudget) },
        { label: 'Gói Ads', value: formatVndShort(plan.budgetAdsTotal || 0) },
        { label: 'Target NMV', value: formatVndShort(plan.targetGmv) }
      ],
      action: currentRole === 'GROWTH' && !signOff.growth.confirmed && !isLocked ? (
        <button
          onClick={() => {
            setPendingActionType('CONFIRM_GROWTH');
            setIsActionNoteOpen(true);
          }}
          className="w-full py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-2xs transition"
        >
          Xác nhận giao số
        </button>
      ) : null
    },
    {
      key: 'booking',
      no: 2,
      team: 'Marketing B2C',
      task: 'Phân rã KOC & kênh Brand',
      confirmed: signOff.booking.confirmed,
      doneLabel: 'Đã phân rã',
      pendingLabel: 'Đang phân rã',
      confirmedBy: signOff.booking.confirmedBy,
      lines: [
        { label: 'Chỉ tiêu', value: `${plan.totalTargetContents} nội dung` },
        { label: 'Khung lương', value: 'KL1-KL7 & TAP' },
        { label: 'Nhịp chạy', value: '3 đợt / tháng' }
      ],
      action: currentRole === 'BOOKING' && !signOff.booking.confirmed && !isLocked ? (
        <button
          onClick={() => {
            setPendingActionType('CONFIRM_BOOKING');
            setIsActionNoteOpen(true);
          }}
          className="w-full py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-2xs transition"
        >
          Xác nhận cơ cấu
        </button>
      ) : null
    },
    {
      key: 'media',
      no: 3,
      team: 'Media',
      task: 'Nhận gói Ads (không tách kênh)',
      confirmed: signOff.media.confirmed,
      doneLabel: 'Đã nhận gói Ads',
      pendingLabel: 'Chờ thẩm định',
      confirmedBy: signOff.media.confirmedBy,
      lines: [
        { label: 'Hạn mức', value: formatVndShort(plan.budgetAdsTotal || 0) },
        { label: 'Cam kết', value: `ROAS ${signOff.media.targetRoas ? `${signOff.media.targetRoas}x` : '4.5x'}` }
      ],
      action: currentRole === 'MEDIA' && !signOff.media.confirmed && !isLocked ? (
        <button
          onClick={() => {
            setPendingActionType('CONFIRM_MEDIA');
            setIsActionNoteOpen(true);
          }}
          className="w-full py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-2xs transition"
        >
          Xác nhận gói Ads & ROAS
        </button>
      ) : null
    },
    {
      key: 'lead',
      no: 4,
      team: 'Trưởng phòng',
      task: 'Ký duyệt & chốt phiên bản',
      confirmed: signOff.leadB2c.confirmed,
      doneLabel: 'Đã phê duyệt',
      pendingLabel: allThreePartiesConfirmed ? 'Chờ duyệt' : 'Chờ đủ 3 bên',
      confirmedBy: signOff.leadB2c.confirmedBy,
      lines: [
        { label: 'Đồng thuận', value: `${[signOff.growth, signOff.booking, signOff.media].filter(s => s.confirmed).length}/3 bên` },
        { label: 'Bản lưu', value: `${plan.versionSnapshots?.length || 1} phiên bản` }
      ],
      action: currentRole === 'LEAD' && !isLocked ? (
        <button
          disabled={!allThreePartiesConfirmed}
          onClick={() => {
            setPendingActionType('FINAL_APPROVE');
            setIsActionNoteOpen(true);
          }}
          className={`w-full py-1.5 rounded-lg font-semibold text-2xs transition ${
            allThreePartiesConfirmed
              ? 'bg-positive hover:opacity-90 text-white cursor-pointer'
              : 'bg-sunken text-ink-3 cursor-not-allowed'
          }`}
        >
          {allThreePartiesConfirmed ? `Duyệt & chốt ${currentVersion}` : 'Cần đủ 3 bên xác nhận'}
        </button>
      ) : null
    }
  ];

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-xs">
      {/* HEADER: TIÊU ĐỀ + PHIÊN BẢN + CÔNG CỤ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          {/* Chốt phiên bản: biểu tượng khóa "đóng dấu" một lần */}
          <ChangeFlash on={isLocked} className="shrink-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isLocked ? 'bg-positive-soft border-line' : 'bg-accent-soft border-line'
            }`}>
              {isLocked ? <Lock className="w-4 h-4 text-positive" /> : <Layers className="w-4 h-4 text-accent" />}
            </div>
          </ChangeFlash>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-ink">Đồng thuận &amp; phê duyệt</h3>
              <span className="text-xs font-mono font-semibold text-ink-2">{currentVersion}</span>
              <Status tone={isLocked ? 'positive' : 'warning'}>{isLocked ? 'Đã chốt' : 'Bản nháp'}</Status>
              <span className="text-2xs text-ink-3">·</span>
              <span className="text-2xs font-semibold text-ink-2 tabular-nums">{confirmedCount}/4 bước hoàn tất</span>
              <span className="w-16 h-1 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
                <span className="data-bar block h-full rounded-full bg-positive" style={{ width: `${(confirmedCount / 4) * 100}%` }} />
              </span>
            </div>
            <p className="text-2xs text-ink-2 mt-0.5 truncate">
              Growth giao số → Marketing B2C phân rã → Media nhận gói Ads → Trưởng phòng duyệt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {headerExtra}
          {onRoleChange && (
            <div className="flex items-center gap-1.5 bg-canvas px-2 py-1 rounded-lg border border-line text-xs" title="Chọn vai trò">
              <UserCheck className="w-3.5 h-3.5 text-ink-3" />
              <span className="text-ink-2">Chạy thử vai trò:</span>
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as PlanDiscussionRole)}
                className="font-semibold text-ink bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="GROWTH">Growth ({plan.growthPic || 'Growth Lead'})</option>
                <option value="BOOKING">Booking ({plan.pic || 'Nhân viên'})</option>
                <option value="MEDIA">Media ({plan.mediaPic || 'Phan Thành Đạt'})</option>
                <option value="LEAD">Trưởng phòng B2C</option>
              </select>
            </div>
          )}
          {(currentRole === 'GROWTH' || currentRole === 'LEAD') && (
            <button
              onClick={() => {
                const current = parseFloat(currentVersion.replace(/[^0-9.]/g, '')) || 1;
                setNewVersionCode(`v${(Math.round(current * 10) + 1) / 10}`.replace(/^v(\d+)$/, 'v$1.0'));
                setIsGrowthNewVersionModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-accent-soft text-accent border border-line font-semibold text-xs transition"
              title="Growth tạo phiên bản điều chỉnh mới"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tạo phiên bản mới</span>
            </button>
          )}
        </div>
      </div>

      {/* DÃY 4 BƯỚC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4">
        {steps.map(step => (
          <div
            key={step.key}
            className={`flex flex-col p-3 rounded-xl border transition-colors duration-(--motion-slow) ease-enter ${
              step.confirmed ? 'bg-positive-soft/40 border-line-strong' : 'bg-surface border-line'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Bước vừa được xác nhận: vòng tròn đóng dấu, dấu tích vẽ nét (DESIGN_SYSTEM.md §9) */}
              <StepMark done={step.confirmed} label={step.no} />
              <div className="min-w-0 flex-1">
                <div className="text-2xs font-semibold text-ink-3">{step.team}</div>
                <div className="text-xs font-semibold text-ink truncate">{step.task}</div>
              </div>
              <ChangeFlash on={step.confirmed}>
                <span className={`text-2xs font-medium whitespace-nowrap ${
                  step.confirmed ? 'text-positive' : 'text-warning'
                }`}>
                  {step.confirmed ? step.doneLabel : step.pendingLabel}
                </span>
              </ChangeFlash>
            </div>

            <dl className="mt-2.5 space-y-1 text-2xs flex-1">
              {step.lines.map(line => (
                <div key={line.label} className="flex items-center justify-between gap-2">
                  <dt className="text-ink-2">{line.label}</dt>
                  <dd className="font-semibold text-ink font-mono">{line.value}</dd>
                </div>
              ))}
            </dl>

            {step.confirmed && step.confirmedBy && (
              <div className="mt-2 text-2xs text-positive truncate animate-in fade-in slide-in-from-bottom-1 duration-(--motion-slow) ease-enter" title={step.confirmedBy}>
                ✓ {step.confirmedBy}
              </div>
            )}

            {step.action && <div className="mt-2.5">{step.action}</div>}
          </div>
        ))}
      </div>

      {/* THANH TRẠNG THÁI DƯỚI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-5 py-3 border-t border-line bg-canvas rounded-b-2xl">
        <div className={`flex items-center gap-2 text-xs ${isLocked ? 'text-positive' : 'text-ink-2'}`}>
          {isLocked ? <Lock className="w-3.5 h-3.5 text-positive shrink-0" /> : <Clock className="w-3.5 h-3.5 text-warning shrink-0" />}
          <span>
            {isLocked
              ? `Phiên bản ${currentVersion} đã chốt. B2C triển khai theo số cam kết.`
              : `Đang làm việc trên bản nháp ${currentVersion}. Các bên có thể trao đổi và cân đối số.`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {footerExtra}
          {!isLocked && (
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-critical-soft text-critical border border-line font-semibold text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Yêu cầu chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL: GROWTH TẠO PHIÊN BẢN MỚI */}
      <Presence show={!!isGrowthNewVersionModalOpen}>
      {isGrowthNewVersionModalOpen && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-line animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-ink">
                    Growth: Khởi tạo phiên bản kế hoạch mới
                  </h4>
                  <p className="text-2xs text-ink-2">
                    Phân nhánh từ {currentVersion} để điều chỉnh chỉ tiêu hoặc bổ sung ngân sách Top-up
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGrowthNewVersionModalOpen(false)}
                className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink font-semibold mb-1">Mã phiên bản mới:</label>
                  <input
                    type="text"
                    value={newVersionCode}
                    onChange={(e) => setNewVersionCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-line rounded-xl text-xs font-semibold text-accent focus:outline-none focus:border-accent"
                    placeholder="v1.1, v2.0..."
                  />
                </div>
                <div>
                  <label className="block text-ink font-semibold mb-1">Tên phiên bản:</label>
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
                  Lý do điều chỉnh (Bắt buộc để lưu lịch sử đối soát) <span className="text-critical">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={newChangeReason}
                  onChange={(e) => setNewChangeReason(e.target.value)}
                  placeholder="Ví dụ: Nhãn hàng tăng 30M ngân sách Ads và bổ sung 10 video Shopee cho chiến dịch Mega 10.10. Cần B2C và Media cân đối lại..."
                  className="w-full px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Nhập số tổng mới */}
              <div className="bg-canvas p-3 rounded-xl border border-line space-y-2.5">
                <div className="font-semibold text-ink text-2xs">
                  Chỉ tiêu và ngân sách giao mới:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-2xs text-ink-2 block mb-0.5">Tổng ngân sách (VNĐ):</label>
                    <input
                      type="number"
                      step={5000000}
                      value={newBudget}
                      onChange={(e) => setNewBudget(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-line-strong rounded-lg text-xs font-semibold text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-ink-2 block mb-0.5">Gói Ads tổng (Media):</label>
                    <input
                      type="number"
                      step={5000000}
                      value={newAdsBudget}
                      onChange={(e) => setNewAdsBudget(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-line-strong rounded-lg text-xs font-semibold text-accent"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-ink-2 block mb-0.5">Target GMV (VNĐ):</label>
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setIsGrowthNewVersionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken"
              >
                Hủy
              </button>
              <button
                onClick={handleGrowthCreateNewVersion}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
              >
                Kích Hoạt Phiên Bản {newVersionCode}
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL: NHẬP GHI CHÚ KHI THỰC HIỆN HÀNH ĐỘNG DUYỆT */}
      <Presence show={!!isActionNoteOpen}>
      {isActionNoteOpen && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-line animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-accent" />
                <h4 className="font-semibold text-sm text-ink">
                  {pendingActionType === 'CONFIRM_GROWTH' && 'Growth: Xác nhận giao số tổng và gói Ads'}
                  {pendingActionType === 'CONFIRM_BOOKING' && 'Marketing B2C: Xác nhận cơ cấu phân rã'}
                  {pendingActionType === 'CONFIRM_MEDIA' && 'Media: Xác nhận nhận gói tổng Ads và ROAS'}
                  {pendingActionType === 'FINAL_APPROVE' && `Trưởng phòng: Phê duyệt chính thức và khóa phiên bản ${currentVersion}`}
                </h4>
              </div>
              <button
                onClick={() => {
                  setIsActionNoteOpen(false);
                  setPendingActionType(null);
                  setActionNote('');
                }}
                className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-canvas p-3 rounded-xl border border-line space-y-1">
                <div className="text-ink-2">
                  Kế hoạch: <strong className="text-ink">{plan.title}</strong>
                </div>
                <div className="text-ink-2">
                  Phiên bản: <strong className="text-accent">{currentVersion}</strong> • Ngân sách: <strong>{formatVndShort(plan.totalTargetBudget)}</strong> • Gói Ads: <strong className="text-accent">{formatVndShort(plan.budgetAdsTotal || 0)}</strong>
                </div>
                <div className="text-2xs text-ink-2">
                  Thao tác bởi: <strong className="text-ink">{currentUser?.name || 'Chuyên viên'}</strong> ({currentUser?.roleTitle || 'Thành viên'})
                </div>
              </div>

              {pendingActionType === 'CONFIRM_MEDIA' && (
                <div className="bg-accent-soft/70 p-3 rounded-xl border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Mức ROAS cam kết tối thiểu:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="20.0"
                        value={mediaRoasInput}
                        onChange={(e) => setMediaRoasInput(parseFloat(e.target.value) || 4.5)}
                        className="w-20 px-2 py-1 bg-surface border border-line-strong rounded-lg text-xs font-semibold text-accent text-center focus:outline-none focus:border-accent"
                      />
                      <span className="font-semibold text-ink text-xs">x</span>
                    </div>
                  </div>
                  <p className="text-2xs text-ink-2 leading-relaxed">
                    * Gói ngân sách Ads là tổng hạn mức ({formatVndShort(plan.budgetAdsTotal || 0)}) không chia nhỏ theo kênh. Media chịu trách nhiệm điều phối ngân sách này giữa Spark Ads và các nhóm quảng cáo để đảm bảo mức ROAS đã cam kết.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-ink font-semibold mb-1">
                  Ý kiến ghi chú (lưu vào lịch sử trao đổi điện tử):
                </label>
                <textarea
                  rows={3}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Nhập ý kiến cam kết hoặc lưu ý thực hiện..."
                  className="w-full px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:border-accent resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
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
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
              >
                Xác nhận &amp; Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL: YÊU CẦU HIỆU CHỈNH / TRẢ VỀ */}
      <Presence show={!!isRevisionModalOpen}>
      {isRevisionModalOpen && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-line animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-critical" />
                <h4 className="font-semibold text-sm text-ink">
                  Yêu Cầu Hiệu Chỉnh Kế Hoạch
                </h4>
              </div>
              <button
                onClick={() => {
                  setIsRevisionModalOpen(false);
                  setRevisionNote('');
                }}
                className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-critical-soft/70 p-3 rounded-xl border border-line text-critical space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-critical" />
                  Kế hoạch sẽ chuyển về trạng thái &ldquo;Yêu cầu hiệu chỉnh&rdquo;
                </div>
                <p className="text-2xs leading-relaxed text-ink-2">
                  Ý kiến của bạn sẽ được lưu vào lịch sử trao đổi để các bên rà soát lại cơ cấu.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nội dung chỉ đạo / yêu cầu điều chỉnh <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Ví dụ: Tăng số lượng KOC Micro Shopee lên 15 video, giảm ngân sách KL5 để bảo đảm tỷ trọng..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsRevisionModalOpen(false);
                  setRevisionNote('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleRevisionSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Gửi Yêu Cầu Hiệu Chỉnh
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
