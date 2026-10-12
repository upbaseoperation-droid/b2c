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

interface PlanApprovalStepperProps {
  plan: InputPlanBreakdownState;
  currentRole: PlanDiscussionRole;
  currentUser?: UserProfile;
  onRoleChange?: (role: PlanDiscussionRole) => void;
  onStatusChange: (newStatus: MonthlyPlanStatus, logMessage: string, note?: string) => void;
  onUpdatePlan?: (updated: Partial<InputPlanBreakdownState>) => void;
  onNotify?: (msg: string) => void;
}

export const PlanApprovalStepper: React.FC<PlanApprovalStepperProps> = ({
  plan,
  currentRole,
  currentUser,
  onRoleChange,
  onStatusChange,
  onUpdatePlan,
  onNotify
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
  const signOff: MultiPartySignOff = plan.multiPartySignOff || {
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
      const msg = `Growth PIC (${author}) đã XÁC NHẬN GIAO SỐ TỔNG & GÓI ADS: "${actionNote || 'Đạt yêu cầu P&L'}"`;
      onStatusChange(allThreePartiesConfirmed ? 'PENDING_APPROVAL' : 'PENDING_PRE_APPROVAL', msg, actionNote);
    } else if (pendingActionType === 'CONFIRM_BOOKING') {
      const author = currentUser?.name || plan.pic || 'Khánh Vy';
      updatedSignOff.booking = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Booking PIC đã hoàn thành phân rã chi tiết 4 kênh và định mức KL1-KL7.'
      };
      const msg = `Booking PIC (${author}) đã XÁC NHẬN CƠ CẤU PHÂN RÃ KOC & KÊNH THƯƠNG HIỆU: "${actionNote || 'Khớp trần chi phí'}"`;
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
      const msg = `Media PIC (${author}) đã XÁC NHẬN NHẬN GÓI TỔNG NGÂN SÁCH ADS (${formatVndShort(plan.budgetAdsTotal || 0)}) & CAM KẾT ROAS ${mediaRoasInput}x: "${actionNote || 'Cam kết ROAS đạt chuẩn'}"`;
      onStatusChange(allThreePartiesConfirmed ? 'PENDING_APPROVAL' : 'PENDING_PRE_APPROVAL', msg, actionNote);
    } else if (pendingActionType === 'FINAL_APPROVE') {
      const author = currentUser?.name || 'Vân Ngọc (Trưởng Phòng B2C)';
      updatedSignOff.leadB2c = {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: actionNote || 'Trưởng phòng phê duyệt chính thức và đóng băng phiên bản.'
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

      const msg = `Trưởng Phòng B2C đã PHÊ DUYỆT CHÍNH THỨC & ĐÓNG BĂNG PHIÊN BẢN ${currentVersion}. Kế hoạch chuyển sang trạng thái triển khai thực thi.`;
      onStatusChange('IN_EXECUTION', msg, actionNote);
      if (onNotify) onNotify(`Đã phê duyệt và đóng băng ${currentVersion} thành công!`);

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

    const author = currentUser?.name || plan.growthPic || 'Trần Thị Ánh';
    const updatedSignOff: MultiPartySignOff = {
      growth: {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: new Date().toISOString(),
        note: `Khởi tạo phiên bản mới ${newVersionCode}: ${newChangeReason}`
      },
      booking: { confirmed: false, note: 'Chờ Booking cập nhật lại cơ cấu theo số mới' },
      media: { confirmed: false, note: 'Chờ Media cập nhật lại gói Ads mới' },
      leadB2c: { confirmed: false }
    };

    if (onUpdatePlan) {
      onUpdatePlan({
        currentVersionCode: newVersionCode,
        isVersionLocked: false,
        totalTargetBudget: newBudget,
        budgetAdsTotal: newAdsBudget,
        targetGmv: newGmv,
        multiPartySignOff: updatedSignOff,
        status: 'DRAFT',
        notes: `Phiên bản ${newVersionCode} do Growth (${author}) khởi tạo: ${newChangeReason}`
      });
    }

    const msg = `Growth PIC (${author}) đã KHỞI TẠO PHIÊN BẢN ĐIỀU CHỈNH MỚI ${newVersionCode}: "${newChangeReason}". Ngân sách mới: ${formatVndShort(newBudget)}, Gói Ads mới: ${formatVndShort(newAdsBudget)}, Target GMV: ${formatVndShort(newGmv)}.`;
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
    const log = `${actor} đã YÊU CẦU HIỆU CHỈNH kế hoạch: "${revisionNote}"`;

    onStatusChange('REVISION_REQUESTED', log, revisionNote);
    setIsRevisionModalOpen(false);
    setRevisionNote('');
    if (onNotify) onNotify('Đã gửi yêu cầu hiệu chỉnh về cho Booking PIC!');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
      {/* HEADER: PHIÊN BẢN HIỆN TẠI & GIẢ LẬP VAI TRÒ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
            isLocked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
          }`}>
            {isLocked ? <Lock className="w-5 h-5 text-emerald-600" /> : <Layers className="w-5 h-5 text-indigo-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-900">
                Luồng Đồng Thuận 3 Bên: Growth — Marketing B2C — Media
              </h3>
              <span className={`text-2xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                isLocked ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isLocked ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                Phiên bản {currentVersion} {isLocked ? '(Đã đóng băng chốt)' : '(Bản nháp đang làm việc)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Growth khởi tạo số tổng & gói Ads • Marketing B2C phân rã chi tiết KOC/kênh • Media thẩm định kịch bản & cam kết ROAS.
            </p>
          </div>
        </div>

        {/* Khối chức năng: Chọn vai trò test + Nút Growth tạo phiên bản mới */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Growth tạo phiên bản mới */}
          <button
            onClick={() => {
              const currentMajor = parseInt(currentVersion.replace(/[^0-9.]/g, '') || '1');
              setNewVersionCode(`v${currentMajor + 0.1}`);
              setIsGrowthNewVersionModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs shadow-2xs transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
            <span>Growth: Tạo Phiên Bản Mới</span>
          </button>

          {/* Giả lập vai trò */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 ml-1" />
            <span className="text-slate-500 font-medium">Vai trò đang xem:</span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange && onRoleChange(e.target.value as PlanDiscussionRole)}
              className="font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="GROWTH">Growth PIC ({plan.growthPic || 'Growth Lead'})</option>
              <option value="BOOKING">Booking PIC ({plan.pic || 'Nhân viên'})</option>
              <option value="MEDIA">Media PIC ({plan.mediaPic || 'Phan Thành Đạt'})</option>
              <option value="LEAD">Trưởng phòng B2C</option>
            </select>
          </div>
        </div>
      </div>

      {/* MA TRẬN 3 BÊN ĐỒNG THUẬN + PHÊ DUYỆT (4 THẺ TRẠNG THÁI) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* 1. GROWTH */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          signOff.growth.confirmed 
            ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20' 
            : 'bg-amber-50/50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              1. Growth Team
            </span>
            {signOff.growth.confirmed ? (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đã Xác Nhận
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-amber-600" />
                Chờ Xác Nhận
              </span>
            )}
          </div>
          <div className="font-bold text-xs text-slate-900 mt-2">
            Giao số tổng & Gói Ads
          </div>
          <div className="text-2xs text-slate-600 mt-1 space-y-0.5">
            <div>Ngân sách: <strong>{formatVndShort(plan.totalTargetBudget)}</strong></div>
            <div>Gói Ads tổng: <strong className="text-indigo-600">{formatVndShort(plan.budgetAdsTotal || 0)}</strong></div>
            <div>Target NMV: <strong>{formatVndShort(plan.targetGmv)}</strong></div>
          </div>
          {currentRole === 'GROWTH' && !signOff.growth.confirmed && !isLocked && (
            <button
              onClick={() => {
                setPendingActionType('CONFIRM_GROWTH');
                setIsActionNoteOpen(true);
              }}
              className="mt-3 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xs shadow-2xs transition-all active:scale-95"
            >
              Bấm Xác Nhận Giao Số
            </button>
          )}
        </div>

        {/* 2. MARKETING B2C (BOOKING & CONTENT) */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          signOff.booking.confirmed 
            ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20' 
            : 'bg-indigo-50/50 border-indigo-200'
        }`}>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              2. Marketing B2C
            </span>
            {signOff.booking.confirmed ? (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đã Phân Rã
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-indigo-600" />
                Đang Phân Rã
              </span>
            )}
          </div>
          <div className="font-bold text-xs text-slate-900 mt-2">
            Phân rã KOC & Kênh Brand
          </div>
          <div className="text-2xs text-slate-600 mt-1 space-y-0.5">
            <div>Chỉ tiêu: <strong>{plan.totalTargetContents} nội dung</strong></div>
            <div>Khung lương: <strong>KL1-KL7 & TAP</strong></div>
            <div>Nhịp chạy: <strong>3 đợt trong tháng</strong></div>
          </div>
          {currentRole === 'BOOKING' && !signOff.booking.confirmed && !isLocked && (
            <button
              onClick={() => {
                setPendingActionType('CONFIRM_BOOKING');
                setIsActionNoteOpen(true);
              }}
              className="mt-3 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xs shadow-2xs transition-all active:scale-95"
            >
              Bấm Xác Nhận Cơ Cấu
            </button>
          )}
        </div>

        {/* 3. MEDIA (PAID ADS) */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          signOff.media.confirmed 
            ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20' 
            : 'bg-blue-50/50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              3. Media Team
            </span>
            {signOff.media.confirmed ? (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đã Nhận Gói Ads
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-blue-600" />
                Chờ Thẩm Định
              </span>
            )}
          </div>
          <div className="font-bold text-xs text-slate-900 mt-2">
            Gói Tổng Ads (Không tách kênh)
          </div>
          <div className="text-2xs text-slate-600 mt-1 space-y-0.5">
            <div>Hạn mức: <strong className="text-blue-700">{formatVndShort(plan.budgetAdsTotal || 0)}</strong></div>
            <div>Cam kết: <strong className="text-emerald-700">ROAS {signOff.media.targetRoas ? `${signOff.media.targetRoas}x` : '4.5x'}</strong></div>
            {signOff.media.confirmed && (
              <div className="text-slate-500 italic mt-1 line-clamp-2" title={signOff.media.note}>
                "{signOff.media.note || 'Đã nhận gói Ads và cam kết ROAS'}"
              </div>
            )}
          </div>
          {currentRole === 'MEDIA' && !signOff.media.confirmed && !isLocked && (
            <button
              onClick={() => {
                setPendingActionType('CONFIRM_MEDIA');
                setIsActionNoteOpen(true);
              }}
              className="mt-3 w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xs shadow-2xs transition-all active:scale-95"
            >
              Bấm Xác Nhận Gói Ads & ROAS
            </button>
          )}
        </div>

        {/* 4. TRƯỞNG PHÒNG B2C (LEAD APPROVAL & FREEZE) */}
        <div className={`p-3.5 rounded-xl border transition-all ${
          signOff.leadB2c.confirmed 
            ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              4. Trưởng Phòng
            </span>
            {signOff.leadB2c.confirmed ? (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Đã Phê Duyệt
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                Chờ Đồng Thuận
              </span>
            )}
          </div>
          <div className="font-bold text-xs text-slate-900 mt-2">
            Ký Duyệt & Đóng Băng
          </div>
          <div className="text-2xs text-slate-600 mt-1 space-y-0.5">
            <div>Trạng thái: <strong>{isLocked ? 'Khóa bản chốt' : 'Đang mở làm việc'}</strong></div>
            <div>Đồng thuận 3 bên: <strong>{allThreePartiesConfirmed ? 'Đủ 3/3 bên' : 'Chưa đủ 3 bên'}</strong></div>
            <div>Bản lưu: <strong>{plan.versionSnapshots?.length || 1} phiên bản</strong></div>
          </div>
          {currentRole === 'LEAD' && !isLocked && (
            <button
              disabled={!allThreePartiesConfirmed}
              onClick={() => {
                setPendingActionType('FINAL_APPROVE');
                setIsActionNoteOpen(true);
              }}
              className={`mt-3 w-full py-1.5 rounded-lg font-bold text-2xs shadow-2xs transition-all active:scale-95 ${
                allThreePartiesConfirmed 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allThreePartiesConfirmed ? 'Duyệt & Đóng Băng v1.0' : 'Cần đủ 3 bên xác nhận'}
            </button>
          )}
        </div>
      </div>

      {/* THANH ĐIỀU HÀNH & NÚT HÀNH ĐỘNG DƯỚI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Phiên bản {currentVersion} đã được đóng băng chốt. B2C triển khai theo số cam kết.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Đang trong giai đoạn làm việc trên bản nháp {currentVersion}. Các bên có thể thảo luận và cân đối số.</span>
            </div>
          )}
        </div>

        {/* Nút yêu cầu chỉnh sửa nếu cần */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isLocked && (
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Gửi Yêu Cầu Chỉnh Sửa</span>
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
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Growth: Khởi Tạo Phiên Bản Kế Hoạch Mới
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
                  <label className="block text-slate-700 font-bold mb-1">Mã phiên bản mới:</label>
                  <input
                    type="text"
                    value={newVersionCode}
                    onChange={(e) => setNewVersionCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-purple-700 focus:outline-none focus:border-purple-500"
                    placeholder="v1.1, v2.0..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tên phiên bản:</label>
                  <input
                    type="text"
                    value={newVersionTitle}
                    onChange={(e) => setNewVersionTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500"
                    placeholder="VD: Điều chỉnh Đợt 2..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Lý do điều chỉnh (Bắt buộc để lưu lịch sử đối soát) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={newChangeReason}
                  onChange={(e) => setNewChangeReason(e.target.value)}
                  placeholder="Ví dụ: Nhãn hàng tăng 30M ngân sách Ads và bổ sung 10 video Shopee cho chiến dịch Mega 10.10. Cần B2C và Media cân đối lại..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Nhập số tổng mới */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 text-2xs uppercase tracking-wider">
                  Chỉ Tiêu & Ngân Sách Giao Mới:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-2xs text-slate-500 block mb-0.5">Tổng ngân sách (VNĐ):</label>
                    <input
                      type="number"
                      step={5000000}
                      value={newBudget}
                      onChange={(e) => setNewBudget(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-500 block mb-0.5">Gói Ads tổng (Media):</label>
                    <input
                      type="number"
                      step={5000000}
                      value={newAdsBudget}
                      onChange={(e) => setNewAdsBudget(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-500 block mb-0.5">Target GMV (VNĐ):</label>
                    <input
                      type="number"
                      step={50000000}
                      value={newGmv}
                      onChange={(e) => setNewGmv(Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
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
                <BadgeCheck className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  {pendingActionType === 'CONFIRM_GROWTH' && 'Growth: Xác Nhận Giao Số Tổng & Gói Ads'}
                  {pendingActionType === 'CONFIRM_BOOKING' && 'Marketing B2C: Xác Nhận Cơ Cấu Phân Rã'}
                  {pendingActionType === 'CONFIRM_MEDIA' && 'Media: Xác Nhận Nhận Gói Tổng Ads & ROAS'}
                  {pendingActionType === 'FINAL_APPROVE' && `Trưởng Phòng: Phê Duyệt & Đóng Băng ${currentVersion}`}
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
                  Phiên bản: <strong className="text-purple-700">{currentVersion}</strong> • Ngân sách: <strong>{formatVndShort(plan.totalTargetBudget)}</strong> • Gói Ads: <strong className="text-blue-700">{formatVndShort(plan.budgetAdsTotal || 0)}</strong>
                </div>
                <div className="text-2xs text-slate-500">
                  Thao tác bởi: <strong className="text-slate-800">{currentUser?.name || 'Chuyên viên'}</strong> ({currentUser?.roleTitle || 'Thành viên'})
                </div>
              </div>

              {pendingActionType === 'CONFIRM_MEDIA' && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">Mức ROAS cam kết tối thiểu:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="20.0"
                        value={mediaRoasInput}
                        onChange={(e) => setMediaRoasInput(parseFloat(e.target.value) || 4.5)}
                        className="w-20 px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-800 text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="font-bold text-blue-900 text-xs">x</span>
                    </div>
                  </div>
                  <p className="text-2xs text-blue-700 leading-relaxed">
                    * Gói ngân sách Ads là tổng hạn mức ({formatVndShort(plan.budgetAdsTotal || 0)}) không chia nhỏ theo kênh. Media chịu trách nhiệm điều phối ngân sách này giữa Spark Ads và các nhóm quảng cáo để đảm bảo mức ROAS đã cam kết.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Ý kiến ghi chú (lưu vào lịch sử trao đổi điện tử):
                </label>
                <textarea
                  rows={3}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Nhập ý kiến cam kết hoặc lưu ý thực hiện..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 resize-none"
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
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
                <h4 className="font-bold text-sm text-slate-900">
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
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Kế hoạch sẽ chuyển về trạng thái "Yêu cầu hiệu chỉnh"
                </div>
                <p className="text-2xs leading-relaxed text-rose-700">
                  Ý kiến của bạn sẽ được lưu vào lịch sử trao đổi để các bên rà soát lại cơ cấu.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
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
