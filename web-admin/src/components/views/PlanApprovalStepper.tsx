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
  Info
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  MonthlyPlanStatus, 
  PlanDiscussionRole 
} from '../../lib/types';

interface PlanApprovalStepperProps {
  plan: InputPlanBreakdownState;
  currentRole: PlanDiscussionRole;
  onRoleChange?: (role: PlanDiscussionRole) => void;
  onStatusChange: (newStatus: MonthlyPlanStatus, logMessage: string, note?: string) => void;
  onNotify?: (msg: string) => void;
}

export const PlanApprovalStepper: React.FC<PlanApprovalStepperProps> = ({
  plan,
  currentRole,
  onRoleChange,
  onStatusChange,
  onNotify
}) => {
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [isActionNoteOpen, setIsActionNoteOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<
    'SUBMIT_PRE_APPROVAL' | 'PRE_APPROVE' | 'SUBMIT_FINAL' | 'FINAL_APPROVE' | null
  >(null);

  const status = plan.status || 'DRAFT';

  // Định nghĩa 4 chặng phê duyệt
  const steps = [
    {
      key: 'DRAFT',
      name: '1. Soạn Thảo (Draft)',
      roleLabel: 'Booking PIC',
      desc: 'Phân rã ngân sách & chỉ tiêu 4 kênh',
      isCompleted: status !== 'DRAFT',
      isCurrent: status === 'DRAFT' || status === 'REVISION_REQUESTED'
    },
    {
      key: 'PRE_APPROVAL',
      name: '2. Sơ Duyệt (Pre-Approval)',
      roleLabel: 'Growth PIC',
      desc: 'Thẩm định trần chi phí, GMV & hero SKU',
      isCompleted: ['PRE_APPROVED', 'PENDING_APPROVAL', 'LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(status),
      isCurrent: status === 'PENDING_PRE_APPROVAL',
      hasRevision: status === 'REVISION_REQUESTED'
    },
    {
      key: 'FINAL_APPROVAL',
      name: '3. Phê Duyệt (Final Approval)',
      roleLabel: 'Trưởng Phòng B2C',
      desc: 'Phê duyệt định mức vận hành & chính sách',
      isCompleted: ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(status),
      isCurrent: status === 'PENDING_APPROVAL' || status === 'PRE_APPROVED'
    },
    {
      key: 'EXECUTION',
      name: '4. Thực Thi & Nghiệm Thu',
      roleLabel: 'Booking Team',
      desc: 'Liên hệ Creator, giải ngân và đóng số',
      isCompleted: status === 'COMPLETED',
      isCurrent: status === 'IN_EXECUTION'
    }
  ];

  // Trợ giúp hiển thị nhãn trạng thái chính
  const renderStatusBanner = () => {
    switch (status) {
      case 'PENDING_PRE_APPROVAL':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <span>Chờ Growth Sơ Duyệt Thẩm Định ({plan.growthPic || 'Growth Manager'})</span>
          </div>
        );
      case 'PRE_APPROVED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
            <BadgeCheck className="w-4 h-4 text-teal-600" />
            <span>Sơ Duyệt Đạt • Sẵn sàng trình Trưởng phòng duyệt chính thức</span>
          </div>
        );
      case 'REVISION_REQUESTED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Yêu Cầu Hiệu Chỉnh Cơ Cấu Phân Rã</span>
          </div>
        );
      case 'PENDING_APPROVAL':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
            <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
            <span>Đã Sơ Duyệt • Đang Chờ Trưởng Phòng Ký Duyệt</span>
          </div>
        );
      case 'LEAD_APPROVED':
      case 'APPROVED':
      case 'BRAND_APPROVED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kế Hoạch Đã Phê Duyệt Chính Thức • Đủ điều kiện giải ngân</span>
          </div>
        );
      case 'IN_EXECUTION':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            <span>Đang Triển Khai Thực Thi Booking</span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            <span>Đã Nghiệm Thu & Đóng Số Chu Kỳ Tháng</span>
          </div>
        );
      case 'DRAFT':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
            <FileCheck className="w-4 h-4 text-slate-500" />
            <span>Bản Nháp • Booking PIC đang phân rã chỉ tiêu</span>
          </div>
        );
    }
  };

  const handleConfirmAction = () => {
    if (!pendingActionType) return;

    if (pendingActionType === 'SUBMIT_PRE_APPROVAL') {
      const msg = `Booking PIC (${plan.pic}) đã gửi Kế hoạch sang Growth (${plan.growthPic || 'Growth Team'}) để Sơ Duyệt thẩm định cơ cấu.`;
      onStatusChange('PENDING_PRE_APPROVAL', msg, actionNote);
      if (onNotify) onNotify(`Đã gửi sơ duyệt kế hoạch thành công!`);
    } else if (pendingActionType === 'PRE_APPROVE') {
      const msg = `Growth PIC (${plan.growthPic || 'Growth Lead'}) đã thẩm định và xác nhận SƠ DUYỆT ĐẠT. Kế hoạch đủ điều kiện trình Trưởng phòng duyệt.`;
      onStatusChange('PRE_APPROVED', msg, actionNote);
      if (onNotify) onNotify(`Đã sơ duyệt đạt kế hoạch!`);
    } else if (pendingActionType === 'SUBMIT_FINAL') {
      const msg = `Đã trình Kế hoạch sang Trưởng Phòng B2C phê duyệt chính thức.`;
      onStatusChange('PENDING_APPROVAL', msg, actionNote);
      if (onNotify) onNotify(`Đã trình Trưởng phòng duyệt!`);
    } else if (pendingActionType === 'FINAL_APPROVE') {
      const msg = `Trưởng Phòng B2C đã PHÊ DUYỆT CHÍNH THỨC kế hoạch tháng. Kế hoạch chuyển sang trạng thái Đang Thực Thi Booking.`;
      onStatusChange('IN_EXECUTION', msg, actionNote);
      if (onNotify) onNotify(`Đã phê duyệt chính thức kế hoạch!`);
    }

    setIsActionNoteOpen(false);
    setActionNote('');
    setPendingActionType(null);
  };

  const handleRevisionSubmit = () => {
    if (!revisionNote.trim()) {
      if (onNotify) onNotify('Vui lòng nhập lý do / nội dung cần Booking điều chỉnh!');
      return;
    }

    const actor = currentRole === 'GROWTH' 
      ? `Growth PIC (${plan.growthPic || 'Growth Team'})` 
      : `Trưởng Phòng B2C`;
    const log = `${actor} đã YÊU CẦU HIỆU CHỈNH kế hoạch: "${revisionNote}"`;

    onStatusChange('REVISION_REQUESTED', log, revisionNote);
    setIsRevisionModalOpen(false);
    setRevisionNote('');
    if (onNotify) onNotify('Đã gửi yêu cầu hiệu chỉnh về cho Booking PIC!');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
      {/* 🌟 HEADER: TIÊU ĐỀ LUỒNG DUYỆT & GIẢ LẬP VAI TRÒ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">
                Luồng Phê Duyệt Kế Hoạch 2 Cấp (Sơ Duyệt Growth ➔ Phê Duyệt Lead)
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                SOP B2C Upbase
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy chuẩn phối hợp giữa Booking và Growth: Thẩm định trần ngân sách, GMV mục tiêu, cơ cấu 4 kênh trước khi ký duyệt giải ngân.
            </p>
          </div>
        </div>

        {/* Giả lập vai trò để người dùng test luồng */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-slate-500 ml-1" />
          <span className="text-slate-500 font-medium">Vai trò thao tác:</span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange && onRoleChange(e.target.value as PlanDiscussionRole)}
            className="font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
          >
            <option value="BOOKING">Booking PIC ({plan.pic || 'Nhân viên'})</option>
            <option value="GROWTH">Growth PIC ({plan.growthPic || 'Growth Lead'})</option>
            <option value="LEAD">Trưởng Phòng B2C (Lead)</option>
          </select>
        </div>
      </div>

      {/* 🌟 TIẾN TRÌNH 4 BƯỚC (APPROVAL STEPPER VISUALIZER) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((st, index) => {
          return (
            <div
              key={st.key}
              className={`p-3.5 rounded-xl border transition-all ${
                st.isCurrent
                  ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10 shadow-2xs'
                  : st.isCompleted
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-white border-slate-200/70 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Bước {index + 1}
                </span>
                {st.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã Xong
                  </span>
                ) : st.isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full animate-pulse">
                    <Clock className="w-3 h-3 text-indigo-600" />
                    Hiện Tại
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">
                    Chờ tới lượt
                  </span>
                )}
              </div>

              <div className="font-bold text-xs text-slate-900 mt-2">
                {st.name}
              </div>
              <div className="text-[11px] font-medium text-indigo-600 mt-0.5">
                Phụ trách: {st.roleLabel}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {st.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌟 KHU VỰC THAO TÁC THEO TRẠNG THÁI & VAI TRÒ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {renderStatusBanner()}
        </div>

        {/* Nút hành động tương ứng */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Nếu đang ở DRAFT hoặc REVISION_REQUESTED */}
          {(status === 'DRAFT' || status === 'REVISION_REQUESTED') && (
            <button
              onClick={() => {
                setPendingActionType('SUBMIT_PRE_APPROVAL');
                setIsActionNoteOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Sang Growth Sơ Duyệt</span>
            </button>
          )}

          {/* 2. Nếu đang ở PENDING_PRE_APPROVAL (Chờ Sơ Duyệt) */}
          {status === 'PENDING_PRE_APPROVAL' && (
            <>
              <button
                onClick={() => setIsRevisionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yêu Cầu Hiệu Chỉnh</span>
              </button>

              <button
                onClick={() => {
                  setPendingActionType('PRE_APPROVE');
                  setIsActionNoteOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Sơ Duyệt Thông Qua</span>
              </button>
            </>
          )}

          {/* 3. Nếu đã PRE_APPROVED (Sơ duyệt xong, trình Lead duyệt) */}
          {status === 'PRE_APPROVED' && (
            <>
              <button
                onClick={() => setIsRevisionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Trả Lại Soạn Thảo</span>
              </button>

              <button
                onClick={() => {
                  setPendingActionType('SUBMIT_FINAL');
                  setIsActionNoteOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Trình Trưởng Phòng Duyệt</span>
              </button>
            </>
          )}

          {/* 4. Nếu đang ở PENDING_APPROVAL (Chờ Phê Duyệt chính thức) */}
          {status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={() => setIsRevisionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yêu Cầu Chỉnh Sửa</span>
              </button>

              <button
                onClick={() => {
                  setPendingActionType('FINAL_APPROVE');
                  setIsActionNoteOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Phê Duyệt Chính Thức</span>
              </button>
            </>
          )}

          {/* 5. Nếu đang ở IN_EXECUTION hoặc APPROVED */}
          {(status === 'IN_EXECUTION' || status === 'APPROVED' || status === 'LEAD_APPROVED') && (
            <button
              onClick={() => {
                onStatusChange('COMPLETED', 'Đã nghiệm thu và đóng số chu kỳ kế hoạch thành công.');
                if (onNotify) onNotify('Kế hoạch đã được nghiệm thu và đóng số!');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nghiệm Thu & Đóng Số Kế Hoạch</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL: NHẬP GHI CHÚ KHI THỰC HIỆN HÀNH ĐỘNG DUYỆT */}
      {isActionNoteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  {pendingActionType === 'SUBMIT_PRE_APPROVAL' && 'Xác Nhận Gửi Sang Growth Sơ Duyệt'}
                  {pendingActionType === 'PRE_APPROVE' && 'Xác Nhận Sơ Duyệt Thông Qua Kế Hoạch'}
                  {pendingActionType === 'SUBMIT_FINAL' && 'Xác Nhận Trình Trưởng Phòng Duyệt'}
                  {pendingActionType === 'FINAL_APPROVE' && 'Xác Nhận Phê Duyệt Kế Hoạch Chính Thức'}
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
                  Nhãn hàng: <strong>{plan.brandName}</strong> • Ngân sách: <strong>{(plan.totalTargetBudget / 1000000).toLocaleString('vi-VN')} Tr đ</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ghi chú đính kèm (sẽ lưu trực tiếp vào Lịch sử trao đổi Booking & Growth):
                </label>
                <textarea
                  rows={3}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    pendingActionType === 'PRE_APPROVE'
                      ? 'Ví dụ: Đã kiểm tra cơ cấu ngân sách 180M, tỷ trọng TikTok Shop 60% và GMV mục tiêu 1.1 Tỷ đạt kỳ vọng ROI 6.1x. Duyệt sơ bộ.'
                      : pendingActionType === 'FINAL_APPROVE'
                      ? 'Ví dụ: Trưởng phòng duyệt phương án phân bổ 4 kênh. Booking team triển khai ký cam kết creator.'
                      : 'Nhập ghi chú hoặc căn cứ thực hiện...'
                  }
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
                Xác Nhận & Cập Nhật
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
                  Yêu Cầu Booking PIC Hiệu Chỉnh Kế Hoạch
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
                  Kế hoạch sẽ chuyển về trạng thái "Yêu Cầu Hiệu Chỉnh"
                </div>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  Ý kiến của bạn sẽ được gửi tới Booking PIC phụ trách và lưu vào lịch sử trao đổi để theo dõi việc sửa đổi cơ cấu phân rã.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lý do / Hướng dẫn điều chỉnh chi tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Ví dụ: Tỷ trọng Shopee Video đang để 0đ trong khi tuần 42 có chiến dịch Mega. Cần phân bổ tối thiểu 15 video Shopee và tăng ngân sách KL3 TikTok lên 60%..."
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
