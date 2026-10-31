'use client';

import React, { useState } from 'react';
import { Modal, Presence, Status } from '../ui';
import {
  MessageSquare,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Layers,
  Lock,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { 
  InputPlanBreakdownState, 
  MonthlyPlanStatus, 
  PlanDiscussionMessage, 
  PlanDiscussionRole,
  PlanVersionSnapshot,
  MultiPartySignOff,
  UserProfile
} from '../../lib/types';
import { PlanApprovalStepper } from './PlanApprovalStepper';
import { formatVndShort } from '../../lib/format';
import { getPlanVersionSnapshots, suggestNextVersionCode } from '../../lib/monthlyPlanData';
import { autoBalancePlanItems, INITIAL_INPUT_PLAN_ITEMS } from '../../lib/inputPlanDefaults';

interface PlanHistoryModalProps {
  plan: InputPlanBreakdownState | null;
  isOpen: boolean;
  initialTab?: 'APPROVAL_FLOW' | 'VERSION_HISTORY' | 'DISCUSSION';
  currentUser?: UserProfile;
  onClose: () => void;
  onSendMessage: (planId: string, msg: Omit<PlanDiscussionMessage, 'id' | 'timestamp'>) => void;
  onStatusChange: (planId: string, newStatus: MonthlyPlanStatus, logMessage: string, note?: string, patch?: Partial<InputPlanBreakdownState>) => void;
  onUpdatePlan?: (updated: Partial<InputPlanBreakdownState>) => void;
  onOpenPlanInStudio?: (plan: InputPlanBreakdownState) => void;
  onNotify?: (msg: string) => void;
}

export const PlanHistoryModal: React.FC<PlanHistoryModalProps> = ({
  plan,
  isOpen,
  initialTab = 'VERSION_HISTORY',
  currentUser,
  onClose,
  onStatusChange,
  onUpdatePlan,
  onOpenPlanInStudio,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'DISCUSSION' | 'APPROVAL_FLOW' | 'VERSION_HISTORY'>(initialTab);
  const [currentRole, setCurrentRole] = useState<PlanDiscussionRole>('BOOKING');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Form tạo phiên bản mới ngay trong tháng
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState('v1.1');
  const [newVersionName, setNewVersionName] = useState('Điều chỉnh giữa kỳ (Top-up & Cơ cấu KOC)');
  const [newChangeReason, setNewChangeReason] = useState('');
  const [newBudget, setNewBudget] = useState<number>(0);
  const [newContents, setNewContents] = useState<number>(0);
  const [newAdsBudget, setNewAdsBudget] = useState<number>(0);
  const [newGmv, setNewGmv] = useState<number>(0);

  const openKey = `${isOpen}-${initialTab}-${plan?.id || ''}`;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedSnapshotId(null);
      setIsCreatingVersion(false);
    }
  }

  // Đồng bộ vai trò theo tài khoản đăng nhập thực tế
  const userRoleKey = currentUser?.role || '';
  const [prevUserRoleKey, setPrevUserRoleKey] = useState(userRoleKey);
  if (userRoleKey !== prevUserRoleKey) {
    setPrevUserRoleKey(userRoleKey);
    if (currentUser) {
      if (['ADMIN', 'MANAGER'].includes(currentUser.role)) {
        setCurrentRole('LEAD');
      } else if (currentUser.role === 'BOOKING_MEMBER' || currentUser.role === 'LEADER') {
        setCurrentRole('BOOKING');
      }
    }
  }

  if (!isOpen || !plan) return <Presence show={false} />;

  const snapshots: PlanVersionSnapshot[] = getPlanVersionSnapshots(plan);
  const baselineSnapshot = snapshots[0];
  const activeSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[snapshots.length - 1];
  const currentVersionCode = plan.currentVersionCode || snapshots[snapshots.length - 1]?.versionCode || 'v1.0';

  const openCreateVersionForm = () => {
    const suggested = suggestNextVersionCode(currentVersionCode, snapshots.length);
    setNewVersionCode(suggested);
    setNewVersionName(`Điều chỉnh Đợt ${snapshots.length + 1} (${plan.month})`);
    setNewChangeReason('');
    setNewBudget(plan.totalTargetBudget || 0);
    setNewContents(plan.totalTargetContents || 0);
    setNewAdsBudget(plan.budgetAdsTotal || 0);
    setNewGmv(plan.targetGmv || 0);
    setIsCreatingVersion(true);
  };

  const handleCreateNewVersionInMonth = () => {
    if (!newChangeReason.trim()) {
      if (onNotify) onNotify('Vui lòng nhập lý do tạo phiên bản mới trong tháng!');
      return;
    }

    const now = new Date().toISOString();
    const author = currentUser?.name || plan.pic || 'Growth / B2C PIC';

    // Bảo lưu toàn bộ các phiên bản trước đó (chuyển trạng thái sang SUPERSEDED nếu cần)
    const archivedSnapshots: PlanVersionSnapshot[] = snapshots.map(s => ({
      ...s,
      status: s.versionCode === 'v1.0' ? 'LOCKED' : 'SUPERSEDED'
    }));

    const balancedItems = autoBalancePlanItems(
      plan.items && plan.items.length > 0 ? plan.items : INITIAL_INPUT_PLAN_ITEMS,
      newBudget,
      newContents,
      plan.strategyPreset === 'CUSTOM' ? 'BALANCED' : (plan.strategyPreset || 'BALANCED')
    );

    const newSignOff: MultiPartySignOff = {
      growth: {
        confirmed: true,
        confirmedBy: author,
        confirmedAt: now,
        note: `Khởi tạo phiên bản ${newVersionCode}: ${newChangeReason}`
      },
      booking: {
        confirmed: false,
        confirmedBy: plan.pic,
        note: 'Đang rà soát & phân rã theo hạn mức phiên bản mới'
      },
      media: {
        confirmed: false,
        confirmedBy: 'Phan Thành Đạt',
        acceptedAdsBudget: newAdsBudget,
        targetRoas: 4.8,
        note: 'Chờ xác nhận gói Ads phiên bản mới'
      },
      leadB2c: {
        confirmed: false
      }
    };

    const newlyCreatedSnapshot: PlanVersionSnapshot = {
      id: `SNAP-${plan.id}-${newVersionCode.replace(/[^a-zA-Z0-9]/g, '')}-${now.replace(/[^0-9]/g, '').slice(-4)}`,
      versionCode: newVersionCode,
      versionName: newVersionName || `Phiên bản ${newVersionCode}`,
      status: 'LOCKED',
      createdAt: now,
      createdBy: author,
      creatorRole: currentRole,
      changeReason: newChangeReason,
      totalTargetBudget: newBudget,
      totalTargetContents: newContents,
      targetGmv: newGmv,
      budgetAdsTotal: newAdsBudget,
      budgetAffiliate: Math.round(newBudget * 0.75),
      budgetSelfChannel: Math.round(newBudget * 0.25),
      items: balancedItems,
      signOffRecord: newSignOff
    };

    const nextSnapshots = [...archivedSnapshots, newlyCreatedSnapshot];

    if (onUpdatePlan) {
      onUpdatePlan({
        currentVersionCode: newVersionCode,
        isVersionLocked: false,
        totalTargetBudget: newBudget,
        totalTargetContents: newContents,
        targetGmv: newGmv,
        budgetAdsTotal: newAdsBudget,
        items: balancedItems,
        multiPartySignOff: newSignOff,
        versionSnapshots: nextSnapshots,
        status: 'DRAFT',
        statusLabel: `Đang điều chỉnh (${newVersionCode})`,
        notes: `[${newVersionCode} - ${newVersionName}]: ${newChangeReason}`,
        updatedAt: now
      });
    }

    onStatusChange(
      plan.id,
      'DRAFT',
      `Đã tạo phiên bản kế hoạch mới ${newVersionCode} (${newVersionName}) trong tháng ${plan.month}. Ngân sách: ${formatVndShort(newBudget)}, Tổng video: ${newContents}, Mục tiêu NMV: ${formatVndShort(newGmv)}.`,
      newChangeReason
    );

    setIsCreatingVersion(false);
    setSelectedSnapshotId(newlyCreatedSnapshot.id);
    if (onNotify) {
      onNotify(`Đã tạo phiên bản ${newVersionCode} cho gian hàng ${plan.storeName || plan.brandName} (Tháng ${plan.month}).`);
    }
  };

  const handleActivateSnapshotVersion = (snap: PlanVersionSnapshot) => {
    if (!onUpdatePlan) return;
    const isLockedSnap = snap.status === 'LOCKED';
    onUpdatePlan({
      currentVersionCode: snap.versionCode,
      isVersionLocked: isLockedSnap,
      totalTargetBudget: snap.totalTargetBudget,
      totalTargetContents: snap.totalTargetContents,
      targetGmv: snap.targetGmv,
      budgetAdsTotal: snap.budgetAdsTotal,
      budgetAffiliate: snap.budgetAffiliate,
      budgetSelfChannel: snap.budgetSelfChannel,
      items: snap.items && snap.items.length > 0 ? snap.items : plan.items,
      multiPartySignOff: snap.signOffRecord || plan.multiPartySignOff,
      notes: `[Đang áp dụng ${snap.versionCode} - ${snap.versionName}]: ${snap.changeReason || ''}`,
      updatedAt: new Date().toISOString()
    });
    if (onNotify) {
      onNotify(`Đã chuyển kế hoạch tháng ${plan.month} sang phiên bản ${snap.versionCode} (${snap.versionName}).`);
    }
  };

  // Tính toán chênh lệch (Delta) giữa phiên bản đang chọn và bản gốc đầu tháng (v1.0 Baseline)
  const budgetDelta = activeSnapshot.totalTargetBudget - baselineSnapshot.totalTargetBudget;
  const adsDelta = (activeSnapshot.budgetAdsTotal || 0) - (baselineSnapshot.budgetAdsTotal || 0);
  const gmvDelta = activeSnapshot.targetGmv - baselineSnapshot.targetGmv;
  const contentsDelta = activeSnapshot.totalTargetContents - baselineSnapshot.totalTargetContents;

  const renderDeltaBadge = (delta: number, isCurrency: boolean = true) => {
    if (delta === 0) {
      return <span className="text-2xs text-ink-3 font-medium">Không đổi so với v1.0</span>;
    }
    const isPositive = delta > 0;
    const formatted = isCurrency ? formatVndShort(Math.abs(delta)) : `${Math.abs(delta)} video`;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-2xs font-semibold ${
          isPositive ? 'text-positive' : 'text-warning'
        }`}
      >
        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isPositive ? `+${formatted}` : `-${formatted}`} so với v1.0
      </span>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={plan.title}
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full text-xs">
          <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3">
            <span className="font-semibold text-ink">{plan.storeName || plan.brandName}</span>
            <span>·</span>
            <span>Kỳ tháng: <strong className="font-mono text-ink-2">{plan.month}</strong></span>
            <span>·</span>
            <span>Đang áp dụng: <strong className="font-mono text-positive">{currentVersionCode}</strong> ({snapshots.length} phiên bản)</span>
            <span>·</span>
            <span>Growth: <strong className="text-ink-2">{'Growth Team'}</strong></span>
            <span>·</span>
            <span>B2C: <strong className="text-ink-2">{plan.pic}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sunken hover:bg-sunken text-ink-2 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* QUICK METRICS BAR */}
        <div className="bg-canvas px-4 py-3 rounded-xl border border-line flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-ink-2">
              <DollarSign className="w-3.5 h-3.5 text-accent" />
              <span>Ngân sách ({currentVersionCode}): <strong className="text-ink">{formatVndShort(plan.totalTargetBudget)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-ink-2">
              <span className="text-accent font-semibold">Ads:</span>
              <span>Gói Ads tổng: <strong className="text-accent-hover">{formatVndShort(plan.budgetAdsTotal || 0)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-ink-2">
              <TrendingUp className="w-3.5 h-3.5 text-positive" />
              <span>Target NMV: <strong className="text-positive">{formatVndShort(plan.targetGmv)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-ink-2">
              <span className="text-ink-3">Chỉ tiêu:</span>
              <strong className="text-ink">{plan.totalTargetContents} video</strong>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex items-center gap-1 bg-sunken p-1 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('VERSION_HISTORY')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'VERSION_HISTORY'
                  ? 'bg-white text-accent-hover shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Quản lý Phiên bản Tháng ({snapshots.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('APPROVAL_FLOW')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'APPROVAL_FLOW'
                  ? 'bg-white text-accent-hover shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tiến trình &amp; Ký duyệt 4 bên</span>
            </button>
            <button
              onClick={() => setActiveTab('DISCUSSION')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'DISCUSSION'
                  ? 'bg-white text-accent-hover shadow-2xs'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Sổ Trao Đổi ({plan.discussions?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="space-y-4">
          {activeTab === 'APPROVAL_FLOW' && (
            <PlanApprovalStepper
              plan={plan}
              currentRole={currentRole}
              currentUser={currentUser}
              onStatusChange={(newStatus, log, note, patch) => onStatusChange(plan.id, newStatus, log, note, patch)}
              onUpdatePlan={onUpdatePlan}
              onNotify={onNotify}
            />
          )}

          {activeTab === 'VERSION_HISTORY' && (
            <div className="space-y-4">
              {/* KHỐI 1: DANH SÁCH CÁC PHIÊN BẢN TRONG THÁNG & NÚT TẠO PHIÊN BẢN MỚI */}
              <div className="bg-white p-4 rounded-xl border border-line space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft border border-accent/30 text-accent flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-ink">
                        Các phiên bản kế hoạch trong tháng {plan.month} — {plan.storeName || plan.brandName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-2xs font-medium text-ink-3">
                      {snapshots.length} phiên bản trong tháng
                    </span>
                    <button
                      type="button"
                      onClick={openCreateVersionForm}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Tạo phiên bản mới ({suggestNextVersionCode(currentVersionCode, snapshots.length)})</span>
                    </button>
                  </div>
                </div>

                {/* FORM TẠO PHIÊN BẢN KẾ HOẠCH MỚI TRONG THÁNG */}
                {isCreatingVersion && (
                  <div className="p-4 rounded-xl bg-accent-soft/60 border border-accent/30 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-accent-hover flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-accent" />
                        <span>Khởi tạo phiên bản kế hoạch mới trong tháng {plan.month} (kế thừa từ {currentVersionCode})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreatingVersion(false)}
                        className="text-2xs font-semibold text-ink-3 hover:text-ink"
                      >
                        Đóng
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">Mã phiên bản:</label>
                        <input
                          type="text"
                          value={newVersionCode}
                          onChange={(e) => setNewVersionCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-semibold text-accent-hover"
                          placeholder="v1.1, v1.2, v2.0..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">Tên đợt điều chỉnh / Phiên bản:</label>
                        <input
                          type="text"
                          value={newVersionName}
                          onChange={(e) => setNewVersionName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-medium text-ink"
                          placeholder="VD: Điều chỉnh Đợt 2 - Bổ sung ngân sách Mega Sale"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Tổng ngân sách B2C (VNĐ):
                        </label>
                        <input
                          type="number"
                          step={5000000}
                          value={newBudget}
                          onChange={(e) => setNewBudget(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-mono font-semibold text-ink"
                        />
                        <span className="text-2xs text-ink-3 mt-0.5 block">
                          Hiện tại: {formatVndShort(plan.totalTargetBudget)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Tổng chỉ tiêu Video:
                        </label>
                        <input
                          type="number"
                          step={5}
                          value={newContents}
                          onChange={(e) => setNewContents(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-mono font-semibold text-ink"
                        />
                        <span className="text-2xs text-ink-3 mt-0.5 block">
                          Hiện tại: {plan.totalTargetContents} video
                        </span>
                      </div>
                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Gói Ads tổng (Media):
                        </label>
                        <input
                          type="number"
                          step={5000000}
                          value={newAdsBudget}
                          onChange={(e) => setNewAdsBudget(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-mono font-semibold text-accent-hover"
                        />
                        <span className="text-2xs text-ink-3 mt-0.5 block">
                          Hiện tại: {formatVndShort(plan.budgetAdsTotal || 0)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Mục tiêu NMV (VNĐ):
                        </label>
                        <input
                          type="number"
                          step={20000000}
                          value={newGmv}
                          onChange={(e) => setNewGmv(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-mono font-semibold text-positive"
                        />
                        <span className="text-2xs text-ink-3 mt-0.5 block">
                          Hiện tại: {formatVndShort(plan.targetGmv)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-2xs font-semibold text-ink-2 mb-1">
                        Lý do điều chỉnh phiên bản (bắt buộc lưu biên bản đối soát) <span className="text-critical">*</span>:
                      </label>
                      <textarea
                        rows={2}
                        value={newChangeReason}
                        onChange={(e) => setNewChangeReason(e.target.value)}
                        placeholder="Nhập lý do thay đổi kế hoạch trong tháng (VD: Nhãn hàng cấp thêm 40M Top-up đẩy nhịp Payday 25.10, tăng 15 video KOC KL2-KL3 và 20 suất FOC)..."
                        className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingVersion(false)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-ink-2 hover:bg-sunken/60"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewVersionInMonth}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white shadow-2xs cursor-pointer"
                      >
                        Lưu &amp; Kích hoạt {newVersionCode}
                      </button>
                    </div>
                  </div>
                )}

                {/* TIMELINE CÁC PHIÊN BẢN TRONG THÁNG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {snapshots.map((snap, idx) => {
                    const isSelected = activeSnapshot.id === snap.id;
                    const isCurrentActive = snap.versionCode === currentVersionCode;
                    const isBaseline = idx === 0;
                    const diffFromBase = snap.totalTargetBudget - baselineSnapshot.totalTargetBudget;

                    return (
                      <div
                        key={snap.id}
                        onClick={() => setSelectedSnapshotId(snap.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between ${
                          isSelected
                            ? 'bg-accent-soft/80 border-accent ring-2 ring-accent/20 shadow-xs'
                            : 'bg-white hover:bg-canvas border-line'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 text-2xs text-ink-3">
                              <span className="font-semibold text-xs text-accent font-mono">
                                {snap.versionCode}
                              </span>
                              {isCurrentActive && (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-positive">Đang áp dụng</span>
                                </>
                              )}
                              {!isCurrentActive && isBaseline && (
                                <>
                                  <span>·</span>
                                  <span>Bản gốc đầu kỳ</span>
                                </>
                              )}
                            </div>
                            <span className="text-2xs text-ink-3">
                              {new Date(snap.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="font-semibold text-xs text-ink mt-2 line-clamp-1">
                            {snap.versionName}
                          </div>
                          <div className="text-2xs text-ink-3 mt-1 line-clamp-2">
                            Lý do: {snap.changeReason || 'Chốt kế hoạch định kỳ'}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-line space-y-1 text-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-ink-3">Ngân sách B2C:</span>
                            <div className="flex items-center gap-2">
                              <strong className="text-ink font-mono">{formatVndShort(snap.totalTargetBudget)}</strong>
                              {!isBaseline && diffFromBase !== 0 && (
                                <span className={`font-mono font-semibold ${diffFromBase > 0 ? 'text-positive' : 'text-warning'}`}>
                                  ({diffFromBase > 0 ? '+' : ''}{formatVndShort(diffFromBase)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-ink-3">Chỉ tiêu nội dung:</span>
                            <strong className="text-ink font-mono">{snap.totalTargetContents} video</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-ink-3">Gói Ads tổng:</span>
                            <strong className="text-accent-hover font-mono">{formatVndShort(snap.budgetAdsTotal)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KHỐI 2: CHI TIẾT PHIÊN BẢN ĐƯỢC CHỌN & ĐỐI CHIẾU SO VỚI BẢN GỐC ĐẦU THÁNG (v1.0) */}
              <div className="bg-white p-5 rounded-xl border border-line space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-positive shrink-0" />
                    <div>
                      <h5 className="font-semibold text-xs text-ink">
                        Chi tiết phiên bản: {activeSnapshot.versionCode} — {activeSnapshot.versionName}
                      </h5>
                      <span className="text-2xs text-ink-3">
                        Người lập: <strong>{activeSnapshot.createdBy}</strong> • Thời điểm ghi nhận: {new Date(activeSnapshot.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSnapshot.versionCode !== currentVersionCode && onUpdatePlan && (
                      <button
                        type="button"
                        onClick={() => handleActivateSnapshotVersion(activeSnapshot)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-warning-soft hover:bg-warning-soft text-warning border border-warning/30 text-xs font-semibold transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt {activeSnapshot.versionCode} làm bản hiện hành</span>
                      </button>
                    )}
                    {onOpenPlanInStudio && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeSnapshot.versionCode !== currentVersionCode && onUpdatePlan) {
                            handleActivateSnapshotVersion(activeSnapshot);
                          }
                          onClose();
                          onOpenPlanInStudio({
                            ...plan,
                            currentVersionCode: activeSnapshot.versionCode,
                            totalTargetBudget: activeSnapshot.totalTargetBudget,
                            totalTargetContents: activeSnapshot.totalTargetContents,
                            targetGmv: activeSnapshot.targetGmv,
                            budgetAdsTotal: activeSnapshot.budgetAdsTotal,
                            items: activeSnapshot.items && activeSnapshot.items.length > 0 ? activeSnapshot.items : plan.items
                          });
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Mở phân rã phiên bản {activeSnapshot.versionCode}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Ô CHỈ SỐ & SO SÁNH BIẾN ĐỘNG SO VỚI BẢN ĐẦU THÁNG v1.0 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-canvas p-3 rounded-xl border border-line space-y-1">
                    <span className="text-2xs text-ink-3 block">Tổng ngân sách ({activeSnapshot.versionCode}):</span>
                    <strong className="text-sm font-semibold text-ink font-mono block">
                      {formatVndShort(activeSnapshot.totalTargetBudget)}
                    </strong>
                    {renderDeltaBadge(budgetDelta, true)}
                  </div>
                  <div className="bg-accent-soft/50 p-3 rounded-xl border border-accent/30 space-y-1">
                    <span className="text-2xs text-accent block">Gói Ads tổng (Media):</span>
                    <strong className="text-sm font-semibold text-accent-hover font-mono block">
                      {formatVndShort(activeSnapshot.budgetAdsTotal)}
                    </strong>
                    {renderDeltaBadge(adsDelta, true)}
                  </div>
                  <div className="bg-positive-soft/50 p-3 rounded-xl border border-positive/30 space-y-1">
                    <span className="text-2xs text-positive block">Mục tiêu NMV:</span>
                    <strong className="text-sm font-semibold text-positive font-mono block">
                      {formatVndShort(activeSnapshot.targetGmv)}
                    </strong>
                    {renderDeltaBadge(gmvDelta, true)}
                  </div>
                  <div className="bg-canvas p-3 rounded-xl border border-line space-y-1">
                    <span className="text-2xs text-ink-3 block">Tổng số lượng nội dung:</span>
                    <strong className="text-sm font-semibold text-ink font-mono block">
                      {activeSnapshot.totalTargetContents} video
                    </strong>
                    {renderDeltaBadge(contentsDelta, false)}
                  </div>
                </div>

                {/* BẢNG SO SÁNH NHANH CÁC PHIÊN BẢN TRONG THÁNG */}
                {snapshots.length > 1 && (
                  <div className="space-y-2">
                    <div className="text-2xs font-semibold text-ink-2">
                      Bảng đối chiếu biến động giữa các phiên bản trong tháng {plan.month}:
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-2">
                            <th className="py-2 px-3">Phiên bản</th>
                            <th className="py-2 px-3">Tên &amp; Lý do điều chỉnh</th>
                            <th className="py-2 px-3 text-right">Ngân sách B2C</th>
                            <th className="py-2 px-3 text-right">Gói Ads</th>
                            <th className="py-2 px-3 text-right">Chỉ tiêu Video</th>
                            <th className="py-2 px-3 text-right">Mục tiêu NMV</th>
                            <th className="py-2 px-3 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {snapshots.map((s, i) => {
                            const isCur = s.versionCode === currentVersionCode;
                            const prevSnap = i > 0 ? snapshots[i - 1] : null;
                            const diffBud = prevSnap ? s.totalTargetBudget - prevSnap.totalTargetBudget : 0;

                            return (
                              <tr
                                key={s.id}
                                onClick={() => setSelectedSnapshotId(s.id)}
                                className={`cursor-pointer transition ${
                                  activeSnapshot.id === s.id ? 'bg-accent-soft/60 font-medium' : 'hover:bg-canvas'
                                }`}
                              >
                                <td className="py-2 px-3 font-mono font-semibold text-accent-hover whitespace-nowrap">
                                  {s.versionCode}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-ink">{s.versionName}</div>
                                  <div className="text-2xs text-ink-3 line-clamp-1">{s.changeReason}</div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                  <span className="font-semibold text-ink">{formatVndShort(s.totalTargetBudget)}</span>
                                  {diffBud !== 0 && (
                                    <span className={`block text-2xs ${diffBud > 0 ? 'text-positive' : 'text-warning'}`}>
                                      {diffBud > 0 ? '+' : ''}{formatVndShort(diffBud)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-accent-hover whitespace-nowrap">
                                  {formatVndShort(s.budgetAdsTotal)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-ink whitespace-nowrap">
                                  {s.totalTargetContents} video
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-positive whitespace-nowrap">
                                  {formatVndShort(s.targetGmv)}
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <Status tone={isCur ? 'positive' : 'neutral'}>
                                    {isCur ? 'Đang áp dụng' : i === 0 ? 'Bản gốc đầu kỳ' : 'Lưu trữ'}
                                  </Status>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TRẠNG THÁI DUYỆT CÁC BÊN (XANH = ĐÃ DUYỆT, ĐỎ = CHƯA DUYỆT) */}
                <div className="space-y-2">
                  <div className="text-2xs font-semibold text-ink-2">
                    Trạng thái duyệt các bên tại phiên bản {activeSnapshot.versionCode}:
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      {
                        key: 'growth',
                        party: 'Growth',
                        person: activeSnapshot.signOffRecord?.growth?.confirmedBy || 'Trần Thị Ánh',
                        note: activeSnapshot.signOffRecord?.growth?.note || 'Giao trần ngân sách & gói Ads',
                        confirmed: Boolean(activeSnapshot.signOffRecord?.growth?.confirmed ?? true),
                      },
                      {
                        key: 'booking',
                        party: 'Marketing B2C',
                        person: activeSnapshot.signOffRecord?.booking?.confirmedBy || plan.pic,
                        note: activeSnapshot.signOffRecord?.booking?.note || 'Phân rã chỉ tiêu KL1–KL7 & kênh',
                        confirmed: Boolean(activeSnapshot.signOffRecord?.booking?.confirmed ?? true),
                      },
                      {
                        key: 'media',
                        party: 'Media',
                        person: activeSnapshot.signOffRecord?.media?.confirmedBy || 'Phan Thành Đạt',
                        note: activeSnapshot.signOffRecord?.media?.note || 'Nhận gói Ads & cam kết ROAS',
                        confirmed: Boolean(activeSnapshot.signOffRecord?.media?.confirmed ?? true),
                      },
                      {
                        key: 'lead',
                        party: 'Giám đốc MKT B2C',
                        person: activeSnapshot.signOffRecord?.leadB2c?.confirmedBy || plan.approvedBy || 'Đặng Thị Yến Nhi',
                        note: activeSnapshot.signOffRecord?.leadB2c?.note || 'Phê duyệt & khóa phiên bản',
                        confirmed: Boolean(activeSnapshot.signOffRecord?.leadB2c?.confirmed ?? (activeSnapshot.status === 'LOCKED')),
                      },
                    ].map((row) => (
                      <div
                        key={row.key}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
                          row.confirmed
                            ? 'bg-positive-soft/75 border-positive/30 text-positive'
                            : 'bg-critical-soft/75 border-critical/30 text-critical'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${row.confirmed ? 'text-positive' : 'text-critical'}`} />
                          <span className="font-semibold">{row.party}</span>
                          <span className="text-ink-3">·</span>
                          <span className="font-medium">{row.person}</span>
                          <span className="text-ink-3 hidden sm:inline">—</span>
                          <span className="text-2xs text-ink-2 truncate hidden sm:inline">{row.note}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-semibold shrink-0 ${
                            row.confirmed ? 'bg-positive text-white' : 'bg-critical text-white'
                          }`}
                        >
                          {row.confirmed ? 'Đã duyệt' : 'Chưa duyệt'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DISCUSSION' && (
            <div className="space-y-3">

              {(plan.discussions?.length || 0) === 0 ? (
                <div className="text-center text-xs text-ink-3 py-10 border border-dashed border-line rounded-xl bg-white">
                  Chưa có trao đổi nào.
                </div>
              ) : (
                <ul className="space-y-2">
                  {[...(plan.discussions || [])]
                    .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
                    .map(msg => (
                      <li key={msg.id} className="bg-white border border-line rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 text-2xs text-ink-3 mb-0.5">
                          <span className="font-semibold text-ink-2">{msg.authorName}</span>
                          {msg.authorTitle && <span>• {msg.authorTitle}</span>}
                          <span className="ml-auto font-mono">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="text-ink-2 whitespace-pre-wrap">{msg.content}</div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

