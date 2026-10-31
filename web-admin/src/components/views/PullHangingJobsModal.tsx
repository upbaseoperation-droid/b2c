'use client';

import React, { useState, useMemo } from 'react';
import { Button, Field, Input, Modal, Select } from '../ui';
import type { InputPlanBreakdownState, PlanTierKey } from '../../lib/types';
import { resolveWeekRows, TIER_KEYS } from '../../lib/planBreakdownRules';

export interface RolloverJobCandidate {
  sourcePlanId: string;
  sourceMonth: string;
  dealId: string;
  dealCode: string;
  kocHandle: string;
  kocName: string;
  grade: string;
  jobId: string;
  jobCode: string;
  title: string;
  productName: string;
  week: string;
  deadline: string;
  videoFee: number;
  totalFee: number;
  sampleStatus: string;
  scriptStatus: string;
  stage: string;
  lifecycleStatus: string;
  appendixNo?: string;
  larkSlipCode?: string;
  paymentStatus?: string;
  acceptanceStatus?: string;
  isAired?: boolean;
  reasonLabel: string;
}

interface PullHangingJobsModalProps {
  open: boolean;
  onClose: () => void;
  plan: InputPlanBreakdownState;
  canMergeIntoBreakdown?: boolean;
  onPulledSuccess?: (result: {
    pulledCount: number;
    targetWeek: string;
    mergeIntoBreakdown: boolean;
    pulledSummaryByTier: Record<string, { qty: number; budgetNet: number }>;
    updatedDealBoardData?: unknown;
    updatedDealBoardRevision?: number;
  }) => void;
  onNotify?: (msg: string, tone?: 'success' | 'warning' | 'error') => void;
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');

export const PullHangingJobsModal: React.FC<PullHangingJobsModalProps> = ({
  open,
  onClose,
  plan,
  onPulledSuccess,
  onNotify,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadedPlanId, setLoadedPlanId] = useState<string>('');
  const [candidates, setCandidates] = useState<RolloverJobCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'UNAIRED_ONLY' | 'AIRED_PENDING_SETTLE' | 'ALL'>('UNAIRED_ONLY');
  const [search, setSearch] = useState('');

  const weekOptions = useMemo(() => {
    const rows = resolveWeekRows(plan);
    return rows.map(r => r.week).filter(Boolean);
  }, [plan]);

  const [targetWeek, setTargetWeek] = useState<string>('');
  const [targetDeadline, setTargetDeadline] = useState<string>('');

  const loadCandidates = async () => {
    if (!plan?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/deal-board?rolloverCandidatesForPlanId=${encodeURIComponent(plan.id)}`,
        { cache: 'no-store' }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
      const list = (body?.candidates as RolloverJobCandidate[]) || [];
      setCandidates(list);
      setLoadedPlanId(plan.id);
      const unairedIds = list.filter(c => !c.isAired).map(c => c.jobId);
      setSelectedIds(unairedIds.length > 0 ? unairedIds : list.map(c => c.jobId));
      if (!targetWeek && weekOptions.length > 0) {
        setTargetWeek(weekOptions[0]);
      }
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Không tải được danh sách Job treo tháng cũ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(c => {
      if (filterMode === 'UNAIRED_ONLY') {
        if (c.isAired) return false;
      } else if (filterMode === 'AIRED_PENDING_SETTLE') {
        if (!c.isAired) return false;
      }
      if (!q) return true;
      return (
        c.jobCode.toLowerCase().includes(q) ||
        c.kocHandle.toLowerCase().includes(q) ||
        c.kocName.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        (c.appendixNo || '').toLowerCase().includes(q) ||
        (c.larkSlipCode || '').toLowerCase().includes(q)
      );
    });
  }, [candidates, filterMode, search]);

  const selectedSummary = useMemo(() => {
    const chosen = candidates.filter(c => selectedIds.includes(c.jobId));
    const totalFee = chosen.reduce((s, c) => s + (c.totalFee || 0), 0);
    const byTier: Record<string, number> = {};
    for (const c of chosen) {
      const k = /TAP|FOC/i.test(c.grade) ? 'FOC' : TIER_KEYS.includes(c.grade as PlanTierKey) ? c.grade : 'KL1';
      byTier[k] = (byTier[k] || 0) + 1;
    }
    return { count: chosen.length, totalFee, byTier };
  }, [candidates, selectedIds]);

  const handleConfirmPull = async () => {
    const chosen = candidates.filter(c => selectedIds.includes(c.jobId));
    if (chosen.length === 0) {
      onNotify?.('Chọn ít nhất 1 Job để kéo sang xử lý tiếp.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const effectiveWeek = targetWeek || weekOptions[0] || '';
      const res = await fetch('/api/deal-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PULL_HANGING_JOBS',
          targetPlanId: plan.id,
          targetWeek: effectiveWeek,
          targetDeadline: targetDeadline || undefined,
          items: chosen.map(c => ({
            sourcePlanId: c.sourcePlanId,
            dealId: c.dealId,
            jobId: c.jobId,
          })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);

      onPulledSuccess?.({
        pulledCount: body.pulledCount || chosen.length,
        targetWeek: effectiveWeek,
        mergeIntoBreakdown: false,
        pulledSummaryByTier: body.pulledSummaryByTier || {},
        updatedDealBoardData: body.data,
        updatedDealBoardRevision: body.revision,
      });
      onNotify?.(
        `Đã chuyển ${body.pulledCount || chosen.length} Job chưa lên sóng sang tháng ${plan.month}. Job tháng cũ ghi "Không hoàn thành"; ngân sách và thanh toán tính ở tháng ${plan.month}.`,
        'success'
      );
      for (const w of (body.warnings as string[] | undefined) || []) onNotify?.(w, 'warning');
      onClose();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Không kéo được Job sang tháng mới.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chuyển Job chưa lên sóng sang tháng ${plan.month} — ${plan.storeName || plan.title}`}
      size="lg"
      footer={
        <>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={submitting || selectedSummary.count === 0}
            onClick={() => void handleConfirmPull()}
          >
            {submitting
              ? 'Đang kéo Job sang xử lý…'
              : `Chuyển ${selectedSummary.count} Job sang tháng này (${fmt(selectedSummary.totalFee)}đ · tính ngân sách tháng ${plan.month})`}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-sunken px-3 py-3">
          <div className="space-y-0.5 text-xs text-ink-2">
            <div>
              Gian hàng: <span className="font-semibold text-ink">{plan.storeName || plan.title}</span> · Kỳ làm việc:{' '}
              <span className="font-semibold text-ink">{plan.month}</span>
            </div>
            <div className="text-2xs text-ink-3">
              Chỉ Job chưa lên sóng mới chuyển được. Job ở tháng cũ ghi &ldquo;Không hoàn thành (chuyển tháng sau)&rdquo;; bản sao là Job bình thường của tháng {plan.month}: tính ngân sách, nghiệm thu và đề nghị thanh toán ở tháng này. Hợp đồng / SOW, mẫu, kịch bản và tạm ứng đã chi được mang theo (tất toán sẽ trừ tạm ứng). Job đã lên sóng làm nốt ở tháng cũ.
            </div>
          </div>
          <Button size="sm" variant="secondary" disabled={loading} onClick={() => void loadCandidates()}>
            {loading
              ? 'Đang dò Job tháng cũ…'
              : loadedPlanId === plan.id
              ? 'Tải lại danh sách Job tháng cũ'
              : 'Lấy danh sách Job còn treo tháng cũ'}
          </Button>
        </div>

        {loadedPlanId === plan.id && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Nhóm Job cần xử lý tiếp">
                <Select
                  value={filterMode}
                  onChange={e => setFilterMode(e.target.value as 'UNAIRED_ONLY' | 'AIRED_PENDING_SETTLE' | 'ALL')}
                >
                  <option value="UNAIRED_ONLY">
                    Chưa có Link Air ({candidates.filter(c => !c.isAired).length})
                  </option>
                  <option value="AIRED_PENDING_SETTLE">
                    Đã Air · Chờ nghiệm thu / Thanh toán ({candidates.filter(c => c.isAired).length})
                  </option>
                  <option value="ALL">Tất cả Job chưa hoàn tất ({candidates.length})</option>
                </Select>
              </Field>
              <Field label="Tìm mã BO / KOC / HĐNT">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="BO2610..., @handle, HĐNT..."
                />
              </Field>
              <Field label={`Tuần theo dõi trong ${plan.month}`}>
                <Select value={targetWeek || weekOptions[0] || ''} onChange={e => setTargetWeek(e.target.value)}>
                  {weekOptions.length === 0 && <option value={`Tháng ${plan.month}`}>Tháng {plan.month}</option>}
                  {weekOptions.map(w => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hạn Air mới (Tùy chọn)">
                <Input
                  type="date"
                  value={targetDeadline}
                  onChange={e => setTargetDeadline(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
              <div>
                Đã chọn: <span className="font-semibold text-ink">{selectedSummary.count}</span> / {filteredCandidates.length} Job · Thù lao thuộc tháng cũ:{' '}
                <span className="font-semibold text-ink">{fmt(selectedSummary.totalFee)}đ</span>
                {Object.keys(selectedSummary.byTier).length > 0 && (
                  <span className="ml-2 text-ink-3">
                    (
                    {Object.entries(selectedSummary.byTier)
                      .map(([k, q]) => `${k}: ${q}`)
                      .join(', ')}
                    )
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(filteredCandidates.map(c => c.jobId))}
                >
                  Chọn tất cả đang lọc ({filteredCandidates.length})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Bỏ chọn
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-lg border border-line">
              <table className="w-full min-w-[740px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-sunken text-left text-ink-3">
                    <th className="px-3 py-2 font-medium">Chọn</th>
                    <th className="px-3 py-2 font-medium">Kỳ gốc / Mã Job</th>
                    <th className="px-3 py-2 font-medium">KOC &amp; Bậc</th>
                    <th className="px-3 py-2 font-medium">Sản phẩm &amp; Trạng thái treo</th>
                    <th className="px-3 py-2 font-medium">Tiến độ &amp; Hồ sơ</th>
                    <th className="px-3 py-2 text-right font-medium">Thù lao (Tháng cũ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-ink-3">
                        Không có Job nào trong nhóm lọc này của tháng trước.
                      </td>
                    </tr>
                  )}
                  {filteredCandidates.map(c => {
                    const checked = selectedIds.includes(c.jobId);
                    return (
                      <tr
                        key={c.jobId}
                        className={`cursor-pointer hover:bg-sunken/50 ${checked ? 'bg-accent-soft/20' : ''}`}
                        onClick={() =>
                          setSelectedIds(prev =>
                            prev.includes(c.jobId) ? prev.filter(x => x !== c.jobId) : [...prev, c.jobId]
                          )
                        }
                      >
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e =>
                              setSelectedIds(prev =>
                                e.target.checked
                                  ? Array.from(new Set([...prev, c.jobId]))
                                  : prev.filter(x => x !== c.jobId)
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-ink">{c.jobCode}</div>
                          <div className="text-2xs text-ink-3">
                            Plan gốc: {c.sourceMonth} · {c.week ? c.week.split(' ')[0] : '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">@{c.kocHandle.replace(/^@/, '')}</div>
                          <div className="text-2xs text-ink-3">
                            {c.grade === 'TAP UpAffiliate' ? 'FOC (0đ)' : c.grade}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-[210px] truncate text-ink">{c.productName || c.title}</div>
                          <div className="text-2xs font-medium text-warning">{c.reasonLabel}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-ink">
                            Mẫu: {c.sampleStatus} · KB: {c.scriptStatus}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1 text-2xs">
                            {c.appendixNo && (
                              <span className="rounded bg-positive-soft px-2 py-0.5 font-medium text-positive border border-positive/30">
                                HĐ: {c.appendixNo}
                              </span>
                            )}
                            {c.larkSlipCode && (
                              <span className="rounded bg-accent-soft px-2 py-0.5 font-medium text-accent-hover border border-accent/30">
                                6.1: {c.larkSlipCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                          {fmt(c.totalFee)}đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
