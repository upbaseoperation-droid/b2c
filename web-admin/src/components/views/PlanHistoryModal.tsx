'use client';

import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BadgeCheck,
  FileCheck,
  Layers,
  Lock,
  GitCommit,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  MonthlyPlanStatus, 
  PlanDiscussionMessage, 
  PlanDiscussionRole,
  PlanVersionSnapshot,
  UserProfile
} from '../../lib/types';
import { PlanApprovalStepper } from './PlanApprovalStepper';
import { PlanDiscussionHub } from './PlanDiscussionHub';
import { formatVndShort } from '../../lib/format';

interface PlanHistoryModalProps {
  plan: InputPlanBreakdownState | null;
  isOpen: boolean;
  currentUser?: UserProfile;
  onClose: () => void;
  onSendMessage: (planId: string, msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onStatusChange: (planId: string, newStatus: MonthlyPlanStatus, logMessage: string, note?: string) => void;
  onUpdatePlan?: (updated: Partial<InputPlanBreakdownState>) => void;
  onNotify?: (msg: string) => void;
}

export const PlanHistoryModal: React.FC<PlanHistoryModalProps> = ({
  plan,
  isOpen,
  currentUser,
  onClose,
  onSendMessage,
  onStatusChange,
  onUpdatePlan,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'DISCUSSION' | 'APPROVAL_FLOW' | 'VERSION_HISTORY'>('APPROVAL_FLOW');
  const [currentRole, setCurrentRole] = useState<PlanDiscussionRole>('GROWTH');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Đồng bộ vai trò theo tài khoản đăng nhập thực tế
  React.useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'GROWTH_MEMBER') {
      setCurrentRole('GROWTH');
    } else if (currentUser.role === 'MEDIA_MEMBER') {
      setCurrentRole('MEDIA');
    } else if (['ADMIN', 'MANAGER'].includes(currentUser.role)) {
      setCurrentRole('LEAD');
    } else if (currentUser.role === 'BOOKING_MEMBER' || currentUser.role === 'LEADER') {
      setCurrentRole('BOOKING');
    }
  }, [currentUser]);

  if (!isOpen || !plan) return null;

  const snapshots: PlanVersionSnapshot[] = plan.versionSnapshots && plan.versionSnapshots.length > 0
    ? plan.versionSnapshots
    : [
        {
          id: `SNAP-${plan.id}-V1`,
          versionCode: plan.currentVersionCode || 'v1.0',
          versionName: 'Bản chốt đầu tháng (Baseline)',
          status: 'LOCKED',
          createdAt: plan.createdAt || new Date().toISOString(),
          createdBy: plan.growthPic || 'Growth Lead',
          creatorRole: 'GROWTH',
          changeReason: 'Phiên bản kế hoạch chốt đầu kỳ',
          totalTargetBudget: plan.totalTargetBudget,
          totalTargetContents: plan.totalTargetContents,
          targetGmv: plan.targetGmv,
          budgetAdsTotal: plan.budgetAdsTotal || 0,
          budgetAffiliate: plan.budgetAffiliate || 0,
          budgetSelfChannel: plan.budgetSelfChannel || 0,
          items: plan.items || [],
          signOffRecord: plan.multiPartySignOff || {
            growth: { confirmed: true, confirmedBy: plan.growthPic, note: 'Giao số tổng ban đầu' },
            booking: { confirmed: true, confirmedBy: plan.pic, note: 'Phân rã KOC & kênh brand' },
            media: { confirmed: true, confirmedBy: plan.mediaPic || 'Phan Thành Đạt', note: 'Gói Ads tổng' },
            leadB2c: { confirmed: true, confirmedBy: plan.approvedBy, note: 'Phê duyệt' }
          }
        }
      ];

  const activeSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[snapshots.length - 1];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-50 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* MODAL HEADER */}
        <div className="bg-white p-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {plan.month} • {plan.week}
              </span>
              <span className="font-semibold text-xs text-slate-700">
                {plan.brandName}
              </span>
              <span className="text-xs text-slate-400">• Growth: <strong className="text-amber-800">{plan.growthPic || 'Growth Team'}</strong></span>
              <span className="text-xs text-slate-400">• Booking: <strong className="text-slate-800">{plan.pic}</strong></span>
              <span className="text-xs text-slate-400">• Media: <strong className="text-blue-800">{plan.mediaPic || 'Phan Thành Đạt'}</strong></span>
            </div>
            <h3 className="font-bold text-base text-slate-900 line-clamp-1">
              {plan.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QUICK METRICS BAR */}
        <div className="bg-white px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-600">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              <span>Ngân sách: <strong className="text-slate-900">{formatVndShort(plan.totalTargetBudget)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-blue-600 font-bold">Ads:</span>
              <span>Gói Ads tổng: <strong className="text-indigo-700">{formatVndShort(plan.budgetAdsTotal || 0)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Target NMV: <strong className="text-emerald-700">{formatVndShort(plan.targetGmv)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-400">Chỉ tiêu:</span>
              <strong className="text-slate-900">{plan.totalTargetContents} nội dung</strong>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('APPROVAL_FLOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'APPROVAL_FLOW'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tiến trình & Ký duyệt 3 bên</span>
            </button>
            <button
              onClick={() => setActiveTab('VERSION_HISTORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'VERSION_HISTORY'
                  ? 'bg-white text-purple-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Các Phiên Bản Chốt ({snapshots.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('DISCUSSION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'DISCUSSION'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Sổ Trao Đổi 4 Bên ({plan.discussions?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'APPROVAL_FLOW' && (
            <PlanApprovalStepper
              plan={plan}
              currentRole={currentRole}
              currentUser={currentUser}
              onRoleChange={setCurrentRole}
              onStatusChange={(newStatus, log, note) => onStatusChange(plan.id, newStatus, log, note)}
              onUpdatePlan={onUpdatePlan}
              onNotify={onNotify}
            />
          )}

          {activeTab === 'VERSION_HISTORY' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Danh Sách Các Phiên Bản Kế Hoạch Đã Chốt (Version Snapshots)
                      </h4>
                      <p className="text-2xs text-slate-500">
                        Mỗi phiên bản chốt là một bản chụp bất biến (Immutable), làm căn cứ pháp lý đối soát nghiệm thu và P&L
                      </p>
                    </div>
                  </div>
                  <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {snapshots.length} Phiên bản ghi nhận
                  </span>
                </div>

                {/* TIMELINE CÁC PHIÊN BẢN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {snapshots.map((snap) => {
                    const isSelected = activeSnapshot.id === snap.id;
                    return (
                      <div
                        key={snap.id}
                        onClick={() => setSelectedSnapshotId(snap.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                            {snap.versionCode}
                          </span>
                          <span className="text-2xs text-slate-400">
                            {new Date(snap.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-800 mt-2 line-clamp-1">
                          {snap.versionName}
                        </div>
                        <div className="text-2xs text-slate-500 mt-1 line-clamp-2">
                          Lý do: {snap.changeReason || 'Chốt kế hoạch định kỳ'}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs">
                          <span className="text-slate-500">Ngân sách:</span>
                          <strong className="text-slate-900">{formatVndShort(snap.totalTargetBudget)}</strong>
                        </div>
                        <div className="flex items-center justify-between text-2xs">
                          <span className="text-slate-500">Gói Ads tổng:</span>
                          <strong className="text-indigo-700">{formatVndShort(snap.budgetAdsTotal)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CHI TIẾT PHIÊN BẢN ĐƯỢC CHỌN */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Chi Tiết Bản Chụp: {activeSnapshot.versionCode} — {activeSnapshot.versionName}
                    </h5>
                  </div>
                  <span className="text-2xs text-slate-400 font-medium">
                    Chốt lúc: {new Date(activeSnapshot.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-2xs text-slate-500 block mb-0.5">Tổng ngân sách:</span>
                    <strong className="text-sm font-bold text-slate-900">{formatVndShort(activeSnapshot.totalTargetBudget)}</strong>
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200">
                    <span className="text-2xs text-indigo-600 block mb-0.5">Gói Ads tổng (Media):</span>
                    <strong className="text-sm font-bold text-indigo-800">{formatVndShort(activeSnapshot.budgetAdsTotal)}</strong>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-2xs text-emerald-600 block mb-0.5">Mục tiêu NMV:</span>
                    <strong className="text-sm font-bold text-emerald-800">{formatVndShort(activeSnapshot.targetGmv)}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-2xs text-slate-500 block mb-0.5">Tổng số nội dung:</span>
                    <strong className="text-sm font-bold text-slate-900">{activeSnapshot.totalTargetContents} video</strong>
                  </div>
                </div>

                {/* BẰNG CHỨNG KÝ DUYỆT ĐIỆN TỬ */}
                <div className="space-y-2">
                  <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Bằng Chứng Ký Duyệt Đồng Thuận Tại Thời Điểm Chốt:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Growth: {activeSnapshot.signOffRecord?.growth?.confirmedBy || 'Trần Thị Ánh'}
                      </div>
                      <p className="text-2xs text-slate-500">
                        {activeSnapshot.signOffRecord?.growth?.note || 'Đã giao trần ngân sách'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Marketing B2C: {activeSnapshot.signOffRecord?.booking?.confirmedBy || plan.pic}
                      </div>
                      <p className="text-2xs text-slate-500">
                        {activeSnapshot.signOffRecord?.booking?.note || 'Đã hoàn tất phân rã'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Media: {activeSnapshot.signOffRecord?.media?.confirmedBy || 'Phan Thành Đạt'}
                      </div>
                      <p className="text-2xs text-slate-500">
                        {activeSnapshot.signOffRecord?.media?.note || 'Đã nhận gói Ads & cam kết ROAS'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Trưởng phòng: {activeSnapshot.signOffRecord?.leadB2c?.confirmedBy || 'Vân Ngọc'}
                      </div>
                      <p className="text-2xs text-slate-500">
                        {activeSnapshot.signOffRecord?.leadB2c?.note || 'Phê duyệt & đóng băng phiên bản'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DISCUSSION' && (
            <div className="space-y-4">
              <PlanApprovalStepper
                plan={plan}
                currentRole={currentRole}
                currentUser={currentUser}
                onRoleChange={setCurrentRole}
                onStatusChange={(newStatus, log, note) => onStatusChange(plan.id, newStatus, log, note)}
                onUpdatePlan={onUpdatePlan}
                onNotify={onNotify}
              />
              <PlanDiscussionHub
                plan={plan}
                currentRole={currentRole}
                currentUser={currentUser}
                onSendMessage={(msg) => onSendMessage(plan.id, msg)}
                onNotify={onNotify}
              />
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Dữ liệu các phiên bản và quyết định duyệt được đóng băng để phục vụ đối soát tài chính cuối kỳ.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
