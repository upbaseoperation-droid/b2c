'use client';

import React from 'react';
import { Button, Modal, Progress, Status, Textarea } from '../ui';
import { CheckCircle2, FileText } from 'lucide-react';
import { formatVndShort } from '../../lib/format';
import {
  distributeReference41ToWeeks,
  type PlanValidityEvaluation,
} from '../../lib/planBreakdownRules';
import { isStaffGlobalAdminOrManager } from '../../lib/rbacScope';
import type {
  InputPlanBreakdownState,
  MonthlyPlanStatus,
  StorePortfolioItem,
  UserProfile,
} from '../../lib/types';
import type {
  PersonalWorkPackageItem,
  StorePlanWorkstreamSummary,
} from '../../lib/monthlyPlanData';
import { getStatusBadge } from './PlanCreateEditModal';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export interface B2cWorkloadBreakdownItem {
  totalBudget: number;
  allocatedBudget: number;
  totalVideos: number;
  affPaidQty: number;
  affPaidBudget: number;
  focQty: number;
  selfQty: number;
  selfBudget: number;
  otherQty: number;
  otherBudget: number;
}

export interface StoreGovernanceEntry {
  store: StorePortfolioItem;
  isB2c: boolean;
  plan: InputPlanBreakdownState | null;
  hasPlan: boolean;
  status: MonthlyPlanStatus | 'MISSING';
  breakdown: B2cWorkloadBreakdownItem;
  workstreamSummary: StorePlanWorkstreamSummary;
  validity: PlanValidityEvaluation;
  searchKey?: string;
}

export type StoreGovernanceFilterKey =
  | 'ALL'
  | 'NEEDS_ACTION'
  | 'B2C_ONLY'
  | 'MULTI_VERSION'
  | 'MISSING_PLAN'
  | 'PENDING_APPROVAL'
  | 'PENDING_PRE_APPROVAL'
  | 'REVISION_REQUESTED'
  | 'DRAFT'
  | 'APPROVED'
  | 'EXEMPT'
  | 'PENDING_41_DIFF'
  | 'UNCONFIRMED_41'
  | 'CONFIRMED_41'
  | 'HAS_WEEKLY_411'
  | 'EMPTY_WEEKLY'
  | 'VALID_MATCHED'
  | 'VALID_WITH_NOTE'
  | 'INVALID_411'
  | 'UNEXPLAINED_MISMATCH'
  | 'HAS_ERRORS'
  | 'PRICE_WARNING';

export interface PlanDiscussionDrawerProps {
  inspectingStoreId: string | null;
  setInspectingStoreId: React.Dispatch<React.SetStateAction<string | null>>;
  storeGovernanceList: StoreGovernanceEntry[];
  currentUser?: UserProfile;
  onOpenListingForPlan?: (plan: InputPlanBreakdownState) => void;
  onSelectPlan: (plan: InputPlanBreakdownState) => void;
  onUpdatePlan?: (planId: string, updated: Partial<InputPlanBreakdownState>) => void;
  onUpdatePlanStatus?: (
    planId: string,
    newStatus: MonthlyPlanStatus,
    logMessage?: string,
    note?: string,
    patch?: Partial<InputPlanBreakdownState>
  ) => void;
  setRevisionTarget: React.Dispatch<
    React.SetStateAction<{ planId: string; storeName: string } | null>
  >;
  approvePlanFinal: (
    plan: InputPlanBreakdownState,
    storeName: string,
    silent?: boolean
  ) => boolean;
  notify: (msg: string) => void;
  auditNoteDraft: string;
  setAuditNoteDraft: React.Dispatch<React.SetStateAction<string>>;
  isGovernanceOverviewModalOpen: boolean;
  setIsGovernanceOverviewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMonth: string;
  governanceStats: {
    totalActive: number;
    totalB2cManaged: number;
    totalExempt: number;
    countWithLeader: number;
    countDirectHead: number;
    countWithPlan: number;
    countMissingPlan: number;
    countConfirmed41: number;
    countPending41Diff: number;
    countUnconfirmed41: number;
    countHasWeekly411: number;
    countEmptyWeekly411: number;
    emptyWeekly411List: StoreGovernanceEntry[];
    weekly411Pct: number;
    countValidMatched: number;
    countValidWithNote: number;
    countValidTotal: number;
    countInvalid411: number;
    countUnexplainedMismatch: number;
    countHasErrors: number;
    countPriceWarnings: number;
    validPct: number;
    countApproved: number;
    countPendingApproval: number;
    countPendingPreApproval: number;
    countRevisionRequested: number;
    countDraft: number;
    countMultiVersion: number;
    countReadyToBatchApprove: number;
    countNeedsAction: number;
    readyToBatchApproveList: StoreGovernanceEntry[];
    picBottleneckSummary: Array<{
      picName: string;
      totalStores: number;
      approvedCount: number;
      validCount: number;
      emptyWeeklyCount: number;
      invalidCount: number;
      missingCount: number;
      bottleneckCount: number;
    }>;
    coveragePct: number;
    approvedPct: number;
  };
  batchApprovableList: StoreGovernanceEntry[];
  onOpenPlanReport?: () => void;
  storeGovernanceFilter: StoreGovernanceFilterKey;
  setStoreGovernanceFilter: React.Dispatch<React.SetStateAction<StoreGovernanceFilterKey>>;
  setGovernancePage: React.Dispatch<React.SetStateAction<number>>;
  brandPlanKpis: {
    total: number;
    completeCoverageCount: number;
  };
  setActiveHubTab: React.Dispatch<
    React.SetStateAction<'STORE_GOVERNANCE' | 'BRAND_PLANS'>
  >;
  allPersonalPackages: PersonalWorkPackageItem[];
  governancePicFilter: string;
  setGovernancePicFilter: React.Dispatch<React.SetStateAction<string>>;
}

export const PlanDiscussionDrawer: React.FC<PlanDiscussionDrawerProps> = ({
  inspectingStoreId,
  setInspectingStoreId,
  storeGovernanceList,
  currentUser,
  onOpenListingForPlan,
  onSelectPlan,
  onUpdatePlan,
  onUpdatePlanStatus,
  setRevisionTarget,
  approvePlanFinal,
  notify,
  auditNoteDraft,
  setAuditNoteDraft,
  isGovernanceOverviewModalOpen,
  setIsGovernanceOverviewModalOpen,
  selectedMonth,
  governanceStats,
  batchApprovableList,
  onOpenPlanReport,
  storeGovernanceFilter,
  setStoreGovernanceFilter,
  setGovernancePage,
  brandPlanKpis,
  setActiveHubTab,
  allPersonalPackages,
  governancePicFilter,
  setGovernancePicFilter,
}) => {
  return (
    <>
      {/* Modal: Thẩm định & Đối soát Nhanh Tính Hợp Lệ Plan 4.1 vs 4.1.1 & Xử lý Duyệt */}
      {(() => {
        const inspectingItem = inspectingStoreId
          ? storeGovernanceList.find(it => it.store.id === inspectingStoreId) || null
          : null;
        const iStore = inspectingItem?.store;
        const iPlan = inspectingItem?.plan;
        const iVal = inspectingItem?.validity;
        const hasLeader = Boolean(iPlan?.hasBookingLeader ?? iStore?.hasBookingLeader);
        const canManageApproval = Boolean(
          currentUser && (isStaffGlobalAdminOrManager(currentUser) || currentUser.role === 'LEADER')
        );

        return (
          <Modal
            open={Boolean(inspectingItem && iPlan && iVal)}
            onClose={() => setInspectingStoreId(null)}
            title={
              iStore && iPlan
                ? `Thẩm định Kế hoạch 4.1 vs 4.1.1 — ${iStore.storeName} (${iPlan.month})`
                : 'Thẩm định Kế hoạch'
            }
            size="lg"
            footer={
              iStore && iPlan && iVal ? (
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setInspectingStoreId(null)}>
                      Đóng
                    </Button>
                    {onOpenListingForPlan && (inspectingItem.breakdown.affPaidQty > 0 || inspectingItem.breakdown.focQty > 0) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setInspectingStoreId(null);
                          onOpenListingForPlan(iPlan);
                        }}
                      >
                        Chuyển sang Listing KOC
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInspectingStoreId(null);
                        onSelectPlan(iPlan);
                      }}
                    >
                      Mở chi tiết 5 bước →
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onUpdatePlan && iPlan.reference41 && (!iVal.hasWeeklyBreakdown || iVal.mismatchCount > 0 || iVal.errorCount > 0) && !iPlan.isVersionLocked && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const synced = distributeReference41ToWeeks(iPlan, 'EVEN');
                          onUpdatePlan(iPlan.id, {
                            weeklyBreakdown: synced.weeklyBreakdown,
                            items: synced.items,
                            updatedAt: new Date().toISOString(),
                          });
                          notify(`Đã tự động phân bổ tuần 4.1.1 khớp 100% với Bảng 4.1 cho "${iStore.storeName}".`);
                        }}
                      >
                        Khớp 4.1 &amp; Chia đều tuần
                      </Button>
                    )}
                    {canManageApproval && onUpdatePlanStatus && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRevisionTarget({ planId: iPlan.id, storeName: iStore.storeName })}
                        >
                          Yêu cầu sửa lại
                        </Button>
                        {currentUser?.role === 'LEADER' && hasLeader && iPlan.status === 'PENDING_PRE_APPROVAL' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => {
                              onUpdatePlanStatus(
                                iPlan.id,
                                'PENDING_APPROVAL',
                                `Trưởng nhóm (${currentUser.name}) đã sơ duyệt đạt kế hoạch ${iStore.storeName}, chuyển Giám đốc Marketing phê duyệt.`,
                                'Sơ duyệt đạt chuẩn 4.1.1'
                              );
                              if (onUpdatePlan) {
                                onUpdatePlan(iPlan.id, { leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' });
                              }
                              notify(`Đã sơ duyệt đạt cho "${iStore.storeName}", chuyển trình Giám đốc Marketing.`);
                              setInspectingStoreId(null);
                            }}
                          >
                            Sơ duyệt đạt (Chuyển GĐ)
                          </Button>
                        ) : isStaffGlobalAdminOrManager(currentUser) && (!hasLeader || iPlan.status === 'PENDING_APPROVAL' || iPlan.leaderApprovalStatus === 'ĐÃ_SƠ_DUYỆT') ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => {
                              if (approvePlanFinal(iPlan, iStore.storeName)) {
                                notify(`Đã duyệt chốt kế hoạch "${iStore.storeName}".`);
                                setInspectingStoreId(null);
                              }
                            }}
                          >
                            Phê duyệt kế hoạch
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ) : undefined
            }
          >
            {iStore && iPlan && iVal && (
              <div className="space-y-4 text-xs">
                {/* 1. Tóm tắt 4 chặng của gian hàng */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-sunken/50 border border-line">
                  <div>
                    <div className="text-2xs text-ink-3">1. Plan Tổng (4.1)</div>
                    <div className="mt-1 font-semibold text-ink">
                      {iPlan.pendingReference41
                        ? 'Lệch 4.1 mới'
                        : iPlan.reference41?.isGrowthLocked === false
                          ? '4.1 Chưa chốt (Tạm tính)'
                          : iPlan.reference41
                            ? '4.1 Đã chốt'
                            : 'Khởi tạo trực tiếp'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-3">2. Plan Chi tiết (4.1.1)</div>
                    <div className="mt-1 font-semibold text-ink">
                      {iVal.hasWeeklyBreakdown ? 'Đã chia lịch tuần W1–W5' : 'Chưa nhập lịch tuần'}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-3">3. Tính hợp lệ</div>
                    <div className="mt-1">
                      <Status tone={iVal.badgeTone}>{iVal.badgeLabel}</Status>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xs text-ink-3">4. Luồng phê duyệt</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {getStatusBadge(iPlan.status)}
                      <span className="text-2xs text-ink-3">
                        ({hasLeader ? 'Qua Leader Ngọc Tâm' : 'Trình thẳng GĐ'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Kết luận thẩm định nhanh */}
                <div
                  className={cx(
                    'p-3 rounded-xl border',
                    iVal.badgeTone === 'positive'
                      ? 'bg-positive-soft/70 border-positive/30 text-positive'
                      : iVal.badgeTone === 'info'
                        ? 'bg-accent-soft/70 border-accent/30 text-accent-hover'
                        : iVal.badgeTone === 'critical'
                          ? 'bg-critical-soft/80 border-critical/30 text-critical'
                          : 'bg-warning-soft/80 border-warning/30 text-warning'
                  )}
                >
                  <div className="font-semibold">
                    Kết luận kiểm định: {iVal.shortDetail}
                  </div>
                  <div className="mt-1 text-2xs opacity-90">
                    PIC phụ trách: <strong>{iStore.b2cOwners?.[0] || iStore.b2cOwnerName || iPlan.pic || 'Chưa gán'}</strong>
                    {' · '}
                    Phiên bản hiện hành: <strong>{iPlan.currentVersionCode || 'v1.0'}</strong>
                  </div>
                </div>

                {/* 3. Bảng đối soát 7 chỉ tiêu cốt lõi: Bảng 4.1 (Plan Tổng) vs Bảng 4.1.1 (Phân rã Tuần) */}
                {iVal.comparison.length > 0 && (
                  <div className="rounded-xl border border-line overflow-hidden">
                    <div className="px-4 py-2 bg-sunken/70 border-b border-line font-semibold text-ink flex items-center justify-between">
                      <span>Bảng đối soát 7 chỉ tiêu: Plan Tổng (4.1) vs Phân rã Tuần (4.1.1)</span>
                      <span className="text-2xs text-ink-3 font-normal">Đơn vị tiền: Net (VNĐ)</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-surface text-2xs text-ink-3">
                          <th className="py-2 px-3">Chỉ tiêu</th>
                          <th className="py-2 px-3 text-right">Plan Tổng (4.1)</th>
                          <th className="py-2 px-3 text-right">Phân rã Tuần (4.1.1)</th>
                          <th className="py-2 px-3 text-right">Chênh lệch</th>
                          <th className="py-2 px-3 text-center">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {iVal.comparison.map(row => {
                          const fmtVal = (v: number) =>
                            row.unit === 'money' ? formatVndShort(v) : v.toLocaleString('vi-VN');
                          return (
                            <tr key={row.key} className={row.matched ? '' : 'bg-warning-soft/40'}>
                              <td className="py-2 px-3 font-medium text-ink">{row.label}</td>
                              <td className="py-2 px-3 text-right tabular-nums text-ink-2">{fmtVal(row.reference)}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-semibold text-ink">{fmtVal(row.planned)}</td>
                              <td
                                className={cx(
                                  'py-2 px-3 text-right tabular-nums font-semibold',
                                  row.matched ? 'text-ink-3' : row.diff > 0 ? 'text-warning' : 'text-critical'
                                )}
                              >
                                {row.matched
                                  ? '0'
                                  : `${row.diff > 0 ? '+' : ''}${fmtVal(row.diff)}`}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.matched ? (
                                  <Status tone="positive">Khớp</Status>
                                ) : (
                                  <Status tone="warning">{row.diff > 0 ? 'Thừa' : 'Thiếu'}</Status>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Danh sách lỗi logic hoặc cảnh báo đơn giá Ratecard Bảng 5.6 */}
                {iVal.issues.length > 0 && (
                  <div className="rounded-xl border border-line p-3 space-y-2 bg-surface">
                    <div className="font-semibold text-ink">
                      Chi tiết cảnh báo &amp; lỗi kiểm định ({iVal.issues.length} mục)
                    </div>
                    <ul className="space-y-1 max-h-36 overflow-y-auto text-2xs">
                      {iVal.issues.map((iss, idx) => (
                        <li
                          key={`${iss.code}-${idx}`}
                          className={cx(
                            'px-3 py-2 rounded-lg border flex items-center justify-between gap-2',
                            iss.severity === 'error'
                              ? 'bg-critical-soft border-critical/30 text-critical font-medium'
                              : 'bg-warning-soft/70 border-warning/30 text-warning'
                          )}
                        >
                          <span>{iss.message}</span>
                          <span className="shrink-0 font-mono text-2xs">
                            {iss.severity === 'error' ? 'Lỗi chặn gửi' : iss.needsNote ? 'Cần giải trình' : 'Lưu ý giá'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 5. Giải trình của chuyên viên (breakdownNote) & Ghi chú yêu cầu sửa của Quản lý */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="font-semibold text-ink block">
                      Giải trình chênh lệch 4.1 vs 4.1.1 của PIC
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Nhập lý do nếu phân rã 4.1.1 điều chỉnh khác Bảng 4.1..."
                      value={auditNoteDraft}
                      onChange={e => setAuditNoteDraft(e.target.value)}
                    />
                    {onUpdatePlan && auditNoteDraft !== (iPlan.breakdownNote || '') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onUpdatePlan(iPlan.id, {
                            breakdownNote: auditNoteDraft.trim(),
                            updatedAt: new Date().toISOString(),
                          });
                          notify(`Đã lưu giải trình đối soát 4.1 cho "${iStore.storeName}".`);
                        }}
                      >
                        Lưu giải trình
                      </Button>
                    )}
                  </div>

                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* MODAL TỔNG QUAN TIẾN ĐỘ & KIỂM ĐỊNH 4 CHẶNG */}
      <Modal
        open={isGovernanceOverviewModalOpen}
        onClose={() => setIsGovernanceOverviewModalOpen(false)}
        title={`Tiến độ & Kiểm định kế hoạch kỳ ${selectedMonth === 'ALL' ? 'Tất cả các tháng' : selectedMonth}`}
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {governanceStats.countEmptyWeekly411 > 0 &&
                currentUser &&
                isStaffGlobalAdminOrManager(currentUser) &&
                onUpdatePlan && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      let updatedCount = 0;
                      for (const item of governanceStats.emptyWeekly411List) {
                        if (!item.plan || !item.plan.reference41) continue;
                        const synced = distributeReference41ToWeeks(item.plan);
                        if (!synced) continue;
                        onUpdatePlan(item.plan.id, {
                          weeklyBreakdown: synced.weeklyBreakdown,
                          items: synced.items,
                        });
                        updatedCount += 1;
                      }
                      notify(
                        `Đã tự động chia đều 4 tuần (4.1.1) từ số chuẩn Bảng 4.1 cho ${updatedCount} gian hàng chưa chia.`
                      );
                    }}
                  >
                    Chia tuần 4.1.1 chuẩn ({governanceStats.countEmptyWeekly411} gian chưa chia)
                  </Button>
                )}
              {batchApprovableList.length > 0 &&
                currentUser &&
                isStaffGlobalAdminOrManager(currentUser) &&
                onUpdatePlanStatus && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={() => {
                      let approved = 0;
                      for (const item of batchApprovableList) {
                        if (item.plan && approvePlanFinal(item.plan, item.store.storeName, true)) approved += 1;
                      }
                      const waiting = governanceStats.readyToBatchApproveList.length - approved;
                      notify(
                        `Đã duyệt chốt ${approved} kế hoạch hợp lệ.${waiting > 0 ? ` ${waiting} kế hoạch chưa đủ các bên xác nhận nên giữ nguyên.` : ''}`
                      );
                    }}
                  >
                    Duyệt chốt {batchApprovableList.length} plan hợp lệ
                  </Button>
                )}
            </div>
            <div className="flex items-center gap-2">
              {onOpenPlanReport && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileText}
                  onClick={() => {
                    setIsGovernanceOverviewModalOpen(false);
                    onOpenPlanReport();
                  }}
                >
                  Báo cáo thẩm định kế hoạch
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={() => setIsGovernanceOverviewModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* 4 CỘT SCORECARD QUẢN TRỊ: 1. PLAN TỔNG -> 2. PLAN CHI TIẾT -> 3. TÍNH HỢP LỆ -> 4. DUYỆT & THỰC THI */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-xl overflow-hidden bg-surface">
            {/* CHẶNG 1 */}
            <div className="p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">1. Plan Tổng (4.1 &amp; Brand)</span>
                  <span className="text-sm font-semibold font-mono text-positive tabular-nums">
                    {governanceStats.countConfirmed41}/{governanceStats.totalB2cManaged}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.coveragePct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countConfirmed41}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ chốt Plan Tổng 4.1"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'CONFIRMED_41' as const,
                      label: 'Đã chốt Bảng 4.1',
                      count: governanceStats.countConfirmed41,
                      badgeClass: 'bg-positive-soft text-positive border-positive/30',
                    },
                    {
                      key: 'UNCONFIRMED_41' as const,
                      label: '4.1 Chưa chốt (Tạm)',
                      count: governanceStats.countUnconfirmed41,
                      badgeClass: 'bg-warning-soft text-warning border-warning/30',
                    },
                    ...(governanceStats.countPending41Diff > 0
                      ? [
                          {
                            key: 'PENDING_41_DIFF' as const,
                            label: 'Có 4.1 mới lệch bản duyệt',
                            count: governanceStats.countPending41Diff,
                            badgeClass: 'bg-critical-soft text-critical border-critical/30',
                          },
                        ]
                      : []),
                    {
                      key: 'MISSING_PLAN' as const,
                      label: 'Chưa khởi tạo 4.1',
                      count: governanceStats.countMissingPlan,
                      badgeClass: 'bg-sunken text-ink-2 border-line',
                    },
                  ].map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-2 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-line/70 flex items-center justify-between text-2xs">
                <span className="text-ink-3">
                  Plan Brand: <strong className="text-ink">{brandPlanKpis.completeCoverageCount}/{brandPlanKpis.total} nhãn</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsGovernanceOverviewModalOpen(false);
                    setActiveHubTab('BRAND_PLANS');
                  }}
                  className="text-accent hover:underline font-semibold cursor-pointer"
                >
                  Xem Plan Brand →
                </button>
              </div>
            </div>

            {/* CHẶNG 2 */}
            <div className="p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">2. Plan Chi Tiết (4.1.1 Tuần)</span>
                  <span className="text-sm font-semibold font-mono text-accent-hover tabular-nums">
                    {governanceStats.countHasWeekly411}/{governanceStats.totalB2cManaged}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.weekly411Pct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countHasWeekly411}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ phân rã lịch tuần 4.1.1"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'HAS_WEEKLY_411' as const,
                      label: 'Đã chia lịch tuần 4.1.1 (W1–W4)',
                      count: governanceStats.countHasWeekly411,
                      badgeClass: 'bg-accent-soft text-accent-hover border-accent/30',
                    },
                    {
                      key: 'EMPTY_WEEKLY' as const,
                      label: 'Có 4.1 nhưng chưa chia 4.1.1',
                      count: governanceStats.countEmptyWeekly411,
                      badgeClass: 'bg-warning-soft text-warning border-warning/30',
                    },
                    {
                      key: 'MISSING_PLAN' as const,
                      label: 'Chưa có cả 4.1 & 4.1.1',
                      count: governanceStats.countMissingPlan,
                      badgeClass: 'bg-sunken text-ink-2 border-line',
                    },
                  ].map((row, idx) => (
                    <button
                      key={`${row.key}-${idx}`}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-2 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-line/70 flex items-center justify-between text-2xs">
                <span className="text-ink-3">
                  Gói việc nhân sự: <strong className="text-ink">{allPersonalPackages.length} đầu mục</strong>
                </span>
                
              </div>
            </div>

            {/* CHẶNG 3 */}
            <div className="p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">3. Kiểm Định Hợp Lệ (4.1 vs 4.1.1)</span>
                  <span className="text-sm font-semibold font-mono text-positive tabular-nums">
                    {governanceStats.countValidTotal}/{governanceStats.countWithPlan || 1}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.validPct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countValidTotal}
                  max={governanceStats.countWithPlan || 1}
                  label="Tỷ lệ kế hoạch đạt kiểm định hợp lệ"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'VALID_MATCHED' as const,
                      label: '✓ Khớp 100% Bảng 4.1',
                      count: governanceStats.countValidMatched,
                      badgeClass: 'bg-positive-soft text-positive border-positive/30',
                    },
                    ...(governanceStats.countValidWithNote > 0
                      ? [
                          {
                            key: 'VALID_WITH_NOTE' as const,
                            label: '✓ Lệch 4.1 đã có giải trình',
                            count: governanceStats.countValidWithNote,
                            badgeClass: 'bg-accent-soft text-accent-hover border-accent/30',
                          },
                        ]
                      : []),
                    {
                      key: 'UNEXPLAINED_MISMATCH' as const,
                      label: 'Lệch 4.1 chưa giải trình',
                      count: governanceStats.countUnexplainedMismatch,
                      badgeClass: 'bg-warning-soft text-warning border-warning/30',
                    },
                    {
                      key: 'HAS_ERRORS' as const,
                      label: '✕ Lỗi cấu trúc 4.1.1 (SL/Tiền)',
                      count: governanceStats.countHasErrors,
                      badgeClass: 'bg-critical-soft text-critical border-critical/30',
                    },
                  ].map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-2 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-line/70 flex items-center justify-between text-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setStoreGovernanceFilter('PRICE_WARNING');
                    setGovernancePage(1);
                    setIsGovernanceOverviewModalOpen(false);
                  }}
                  className="text-ink-3 hover:text-ink cursor-pointer"
                >
                  Đơn giá vượt khung 5.6: <strong className="text-ink-2">{governanceStats.countPriceWarnings} gian</strong>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoreGovernanceFilter('INVALID_411');
                    setGovernancePage(1);
                    setIsGovernanceOverviewModalOpen(false);
                  }}
                  className="text-warning hover:underline font-semibold cursor-pointer"
                >
                  Lọc cần xử lý ({governanceStats.countInvalid411}) →
                </button>
              </div>
            </div>

            {/* CHẶNG 4 */}
            <div className="p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">4. Phê Duyệt &amp; Triển Khai</span>
                  <span className="text-sm font-semibold font-mono text-accent tabular-nums">
                    {governanceStats.countApproved}/{governanceStats.totalB2cManaged}{' '}
                    <span className="text-2xs font-semibold">({governanceStats.approvedPct}%)</span>
                  </span>
                </div>
                <Progress
                  value={governanceStats.countApproved}
                  max={governanceStats.totalB2cManaged || 1}
                  label="Tiến độ phê duyệt chính thức"
                />
                <div className="space-y-1 pt-0.5 text-2xs">
                  {[
                    {
                      key: 'APPROVED' as const,
                      label: 'Đã duyệt (Triển khai Listing)',
                      count: governanceStats.countApproved,
                      badgeClass: 'bg-positive-soft text-positive border-positive/30',
                    },
                    {
                      key: 'PENDING_APPROVAL' as const,
                      label: 'Chờ Giám đốc duyệt',
                      count: governanceStats.countPendingApproval,
                      badgeClass: 'bg-warning-soft text-warning border-warning/30',
                    },
                    {
                      key: 'PENDING_PRE_APPROVAL' as const,
                      label: 'Chờ Leader Ngọc Tâm sơ duyệt',
                      count: governanceStats.countPendingPreApproval,
                      badgeClass: 'bg-accent-soft text-accent-hover border-accent/30',
                    },
                    {
                      key: 'DRAFT' as const,
                      label: 'Bản nháp / Cần sửa lại',
                      count: governanceStats.countDraft + governanceStats.countRevisionRequested,
                      badgeClass: 'bg-sunken text-ink-2 border-line',
                    },
                  ].map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => {
                        setStoreGovernanceFilter(row.key);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'w-full flex items-center justify-between px-2 py-1 rounded-md border transition cursor-pointer',
                        storeGovernanceFilter === row.key
                          ? 'bg-ink text-white border-ink font-semibold'
                          : 'bg-canvas/50 hover:bg-sunken text-ink-2 border-line/70'
                      )}
                    >
                      <span>{row.label}</span>
                      <span
                        className={cx(
                          'px-2 py-0.2 rounded font-mono font-semibold border text-2xs tabular-nums',
                          storeGovernanceFilter === row.key ? 'bg-white/20 text-white border-white/30' : row.badgeClass
                        )}
                      >
                        {row.count} gian
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-line/70 flex items-center justify-between text-2xs">
                <span className="text-ink-3">Sau duyệt: Listing KOC · HĐ · Air</span>
                <span className="text-ink-2 font-medium tabular-nums">
                  {governanceStats.countWithLeader} qua Leader · {governanceStats.countDirectHead} trình thẳng
                </span>
              </div>
            </div>
          </div>

          {/* TIẾN ĐỘ & ĐIỂM NGHẼN THEO CHUYÊN VIÊN PHỤ TRÁCH (PIC) */}
          {governanceStats.picBottleneckSummary.length > 0 && (
            <div className="rounded-xl border border-line overflow-hidden bg-surface">
              <div className="px-4 py-2 bg-sunken/60 border-b border-line font-semibold text-ink flex items-center justify-between">
                <span>Tiến độ &amp; Điểm nghẽn theo Chuyên viên phụ trách (Bấm tên PIC để lọc trên bảng)</span>
                {governancePicFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setGovernancePicFilter('ALL')}
                    className="text-2xs text-accent hover:underline font-semibold cursor-pointer"
                  >
                    Bỏ lọc PIC ({governancePicFilter})
                  </button>
                )}
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {governanceStats.picBottleneckSummary.map((p) => {
                  const isSelected = governancePicFilter === p.picName;
                  return (
                    <button
                      key={p.picName}
                      type="button"
                      onClick={() => {
                        setGovernancePicFilter(isSelected ? 'ALL' : p.picName);
                        setGovernancePage(1);
                        setIsGovernanceOverviewModalOpen(false);
                      }}
                      className={cx(
                        'px-3 py-2 rounded-lg border text-2xs transition cursor-pointer flex items-center gap-2',
                        isSelected
                          ? 'bg-ink text-white border-ink font-semibold'
                          : p.bottleneckCount > 0
                            ? 'bg-warning-soft/50 hover:bg-warning-soft/70 text-ink border-warning/30'
                            : 'bg-positive-soft/50 hover:bg-positive-soft/70 text-ink border-positive/30'
                      )}
                      title={`Tổng ${p.totalStores} gian: ${p.emptyWeeklyCount} chưa chia 4.1.1, ${p.invalidCount} lệch/lỗi, ${p.missingCount} chưa lập`}
                    >
                      <span className="font-medium">{p.picName}</span>
                      <span
                        className={cx(
                          'font-mono font-semibold px-2 py-0.5 rounded',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : p.bottleneckCount > 0
                              ? 'bg-warning-soft text-warning'
                              : 'bg-positive-soft text-positive'
                        )}
                      >
                        {p.bottleneckCount > 0 ? `${p.bottleneckCount}/${p.totalStores} cần xử lý` : `${p.totalStores}/${p.totalStores} đạt`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
