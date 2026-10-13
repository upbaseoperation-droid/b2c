'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  RotateCcw,
  BadgeCheck,
  UserCheck,
  Send,
  X,
  AlertTriangle,
  Info,
  Layers,
  Lock,
  PlusCircle,
  TrendingUp,
  DollarSign,
  Tv,
  Users
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

  const status = plan.status || 'DRAFT';
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
        id: `SNAP-${plan.id}-${Date.now().toString().slice(-4)}`,
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

    const newSnap: PlanVersionSnapshot = {
      id: `SNAP-${plan.id}-${newVersionCode.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-3)}`,
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
      budgetAffiliate: plan.budgetAffiliate || Math.round(newBudget * 0.75),
      budgetSelfChannel: plan.budgetSelfChannel || Math.round(newBudget * 0.25),
      items: plan.items || [],
      signOffRecord: updatedSignOff
    };

    if (onUpdatePlan) {
      onUpdatePlan({
        currentVersionCode: newVersionCode,
        isVersionLocked: false,
        totalTargetBudget: newBudget,
        budgetAdsTotal: newAdsBudget,
        targetGmv: newGmv,
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
          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-2xs transition"
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
          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-2xs transition"
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
          className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-2xs transition"
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
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {allThreePartiesConfirmed ? `Duyệt & chốt ${currentVersion}` : 'Cần đủ 3 bên xác nhận'}
        </button>
      ) : null
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs">
      {/* HEADER: TIÊU ĐỀ + PHIÊN BẢN + CÔNG CỤ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            isLocked ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
          }`}>
            {isLocked ? <Lock className="w-4 h-4 text-emerald-600" /> : <Layers className="w-4 h-4 text-blue-600" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-slate-900">Đồng thuận & phê duyệt</h3>
              <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                isLocked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {currentVersion} • {isLocked ? 'Đã chốt' : 'Bản nháp'}
              </span>
              <span className="text-2xs font-semibold text-slate-500">{confirmedCount}/4 bước hoàn tất</span>
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 truncate">
              Growth giao số → Marketing B2C phân rã → Media nhận gói Ads → Trưởng phòng duyệt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {headerExtra}
          {onRoleChange && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs" title="Chỉ tài khoản Admin dùng để chạy thử">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Chạy thử vai trò:</span>
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as PlanDiscussionRole)}
                className="font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs transition"
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
            className={`flex flex-col p-3 rounded-xl border ${
              step.confirmed ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-semibold shrink-0 ${
                step.confirmed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {step.confirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.no}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-2xs font-semibold text-slate-500">{step.team}</div>
                <div className="text-xs font-semibold text-slate-900 truncate">{step.task}</div>
              </div>
              <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                step.confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {step.confirmed ? step.doneLabel : step.pendingLabel}
              </span>
            </div>

            <dl className="mt-2.5 space-y-1 text-2xs flex-1">
              {step.lines.map(line => (
                <div key={line.label} className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">{line.label}</dt>
                  <dd className="font-semibold text-slate-800 font-mono">{line.value}</dd>
                </div>
              ))}
            </dl>

            {step.confirmed && step.confirmedBy && (
              <div className="mt-2 text-2xs text-emerald-700 truncate" title={step.confirmedBy}>
                ✓ {step.confirmedBy}
              </div>
            )}

            {step.action && <div className="mt-2.5">{step.action}</div>}
          </div>
        ))}
      </div>

      {/* THANH TRẠNG THÁI DƯỚI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
        <div className={`flex items-center gap-2 text-xs ${isLocked ? 'text-emerald-700' : 'text-slate-600'}`}>
          {isLocked ? <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Yêu cầu chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL: GROWTH TẠO PHIÊN BẢN MỚI */}
      {isGrowthNewVersionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    Growth: Khởi tạo phiên bản kế hoạch mới
                  </h4>
                  <p className="text-2xs text-slate-500">
                    Phân nhánh từ {currentVersion} để điều chỉnh chỉ tiêu hoặc bổ sung ngân sách Top-up
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGrowthNewVersionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã phiên bản mới:</label>
                  <input
                    type="text"
                    value={newVersionCode}
                    onChange={(e) => setNewVersionCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-blue-700 focus:outline-none focus:border-blue-500"
                    placeholder="v1.1, v2.0..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên phiên bản:</label>
                  <input
                    type="text"
                    value={newVersionTitle}
                    onChange={(e) => setNewVersionTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    placeholder="VD: Điều chỉnh Đợt 2..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lý do điều chỉnh (Bắt buộc để lưu lịch sử đối soát) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={newChangeReason}
                  onChange={(e) => setNewChangeReason(e.target.value)}
                  placeholder="Ví dụ: Nhãn hàng tăng 30M ngân sách Ads và bổ sung 10 video Shopee cho chiến dịch Mega 10.10. Cần B2C và Media cân đối lại..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Nhập số tổng mới */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-semibold text-slate-800 text-2xs">
                  Chỉ tiêu và ngân sách giao mới:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-2xs text-slate-500 block mb-0.5">Tổng ngân sách (VNĐ):</label>
                    <input
                      type="number"
                      step={5000000}
                      value={newBudget}
                      onChange={(e) => setNewBudget(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-500 block mb-0.5">Gói Ads tổng (Media):</label>
                    <input
                      type="number"
                      step={5000000}
                      value={newAdsBudget}
                      onChange={(e) => setNewAdsBudget(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-500 block mb-0.5">Target GMV (VNĐ):</label>
                    <input
                      type="number"
                      step={50000000}
                      value={newGmv}
                      onChange={(e) => setNewGmv(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold text-emerald-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsGrowthNewVersionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleGrowthCreateNewVersion}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Kích Hoạt Phiên Bản {newVersionCode}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NHẬP GHI CHÚ KHI THỰC HIỆN HÀNH ĐỘNG DUYỆT */}
      {isActionNoteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-sm text-slate-900">
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-600">
                  Kế hoạch: <strong className="text-slate-900">{plan.title}</strong>
                </div>
                <div className="text-slate-600">
                  Phiên bản: <strong className="text-blue-700">{currentVersion}</strong> • Ngân sách: <strong>{formatVndShort(plan.totalTargetBudget)}</strong> • Gói Ads: <strong className="text-blue-700">{formatVndShort(plan.budgetAdsTotal || 0)}</strong>
                </div>
                <div className="text-2xs text-slate-500">
                  Thao tác bởi: <strong className="text-slate-800">{currentUser?.name || 'Chuyên viên'}</strong> ({currentUser?.roleTitle || 'Thành viên'})
                </div>
              </div>

              {pendingActionType === 'CONFIRM_MEDIA' && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">Mức ROAS cam kết tối thiểu:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="20.0"
                        value={mediaRoasInput}
                        onChange={(e) => setMediaRoasInput(parseFloat(e.target.value) || 4.5)}
                        className="w-20 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-blue-800 text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="font-semibold text-blue-900 text-xs">x</span>
                    </div>
                  </div>
                  <p className="text-2xs text-blue-700 leading-relaxed">
                    * Gói ngân sách Ads là tổng hạn mức ({formatVndShort(plan.budgetAdsTotal || 0)}) không chia nhỏ theo kênh. Media chịu trách nhiệm điều phối ngân sách này giữa Spark Ads và các nhóm quảng cáo để đảm bảo mức ROAS đã cam kết.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ý kiến ghi chú (lưu vào lịch sử trao đổi điện tử):
                </label>
                <textarea
                  rows={3}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Nhập ý kiến cam kết hoặc lưu ý thực hiện..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsActionNoteOpen(false);
                  setPendingActionType(null);
                  setActionNote('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Xác nhận & Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: YÊU CẦU HIỆU CHỈNH / TRẢ VỀ */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h4 className="font-semibold text-sm text-slate-900">
                  Yêu Cầu Hiệu Chỉnh Kế Hoạch
                </h4>
              </div>
              <button
                onClick={() => {
                  setIsRevisionModalOpen(false);
                  setRevisionNote('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Kế hoạch sẽ chuyển về trạng thái "Yêu cầu hiệu chỉnh"
                </div>
                <p className="text-2xs leading-relaxed text-rose-700">
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
    </div>
  );
};
