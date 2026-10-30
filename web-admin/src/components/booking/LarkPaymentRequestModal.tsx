'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  QrCode,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import {
  buildLarkPaymentRequestSlip,
  type DealPaymentOverrides,
  type LarkPaymentRequestSlip,
  type PaymentRequestType,
} from '../../lib/larkPaymentRequestEngine';
import {
  Button,
  Field,
  Input,
  Modal,
  Panel,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
} from '../ui';
import { formatVnd, formatVndShort } from '../../lib/format';

interface LarkPaymentRequestModalProps {
  open: boolean;
  onClose: () => void;
  initialDeal: BookingDealItem | null;
  initialDeals?: BookingDealItem[];
  initialRequestType?: PaymentRequestType;
  allDeals: BookingDealItem[];
  kocs: KocItem[];
  currentUserName: string;
  onSuccessUpdateDeals?: (
    updatedDeals: BookingDealItem[],
    createdSlip: LarkPaymentRequestSlip
  ) => void;
}

export const LarkPaymentRequestModal: React.FC<LarkPaymentRequestModalProps> = ({
  open,
  onClose,
  initialDeal,
  initialDeals,
  initialRequestType,
  allDeals,
  kocs,
  currentUserName,
  onSuccessUpdateDeals,
}) => {
  const [activeTab, setActiveTab] = useState<'CREATE_SLIP' | 'SLIP_HISTORY'>('CREATE_SLIP');
  const [requestType, setRequestType] = useState<PaymentRequestType>('SETTLEMENT');
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
  const [sharedPayeeOverride, setSharedPayeeOverride] = useState<DealPaymentOverrides>({});
  const [overridesByDealId, setOverridesByDealId] = useState<Record<string, DealPaymentOverrides>>({});
  const [slipNote, setSlipNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [createdSlipResult, setCreatedSlipResult] = useState<LarkPaymentRequestSlip | null>(null);
  const [historySlips, setHistorySlips] = useState<LarkPaymentRequestSlip[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showQrPreview, setShowQrPreview] = useState<boolean>(false);
  const [editingDealIds, setEditingDealIds] = useState<Record<string, boolean>>({});
  const [isEditingPayee, setIsEditingPayee] = useState<boolean>(false);

  // Đồng bộ deal khởi tạo khi mở hộp thoại
  const initDealsKey =
    initialDeals && initialDeals.length > 0
      ? initialDeals.map(d => d.id).join(',')
      : initialDeal?.id || 'NONE';
  const initKey = open ? `${initDealsKey}:${initialRequestType || 'AUTO'}` : 'CLOSED';
  const [prevInitKey, setPrevInitKey] = useState<string>('CLOSED');
  if (initKey !== prevInitKey) {
    setPrevInitKey(initKey);
    if (open) {
      setActiveTab('CREATE_SLIP');
      setSubmitError('');
      setCreatedSlipResult(null);
      setOverridesByDealId({});
      setSharedPayeeOverride({});
      setEditingDealIds({});
      setIsEditingPayee(false);
      setLoadingHistory(true);
      const seedDeals =
        initialDeals && initialDeals.length > 0
          ? initialDeals
          : initialDeal
          ? [initialDeal]
          : [];
      if (seedDeals.length > 0) {
        const firstSeed = seedDeals[0];
        setSelectedDealIds(seedDeals.map(d => d.id));
        const isAlreadyVerified =
          firstSeed.status === 'VIDEO_VERIFIED' ||
          firstSeed.status === 'VIDEO_SUBMITTED' ||
          Boolean(firstSeed.tiktokVideoUrl || firstSeed.videoUrl);
        const resolvedType = initialRequestType ?? (isAlreadyVerified ? 'SETTLEMENT' : 'ADVANCE');
        setRequestType(resolvedType);
        const codesText = seedDeals.map(d => d.dealCode).join(', ');
        setSlipNote(
          `Đề nghị ${resolvedType === 'ADVANCE' ? 'tạm ứng' : 'tất toán'} Deal ${codesText} (${firstSeed.kocStageName} · ${firstSeed.brandName})`
        );
      } else {
        const firstPaid = allDeals.find(d => (d.totalValue || 0) > 0 && d.brandApprovalStatus === 'ĐÃ_DUYỆT');
        setSelectedDealIds(firstPaid ? [firstPaid.id] : []);
        setRequestType(initialRequestType ?? 'SETTLEMENT');
        setSlipNote('');
      }
    }
  }

  const loadHistorySlips = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests');
      const json = await res.json();
      if (Array.isArray(json?.slips)) {
        setHistorySlips(json.slips);
      }
    } catch {
      // Giữ nguyên danh sách hiện tại nếu lỗi mạng
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch('/api/integrations/larkbase/payment-requests')
      .then(res => res.json())
      .then(json => {
        if (active && Array.isArray(json?.slips)) {
          setHistorySlips(json.slips);
        }
      })
      .catch(() => {
        // Giữ nguyên danh sách hiện tại nếu lỗi mạng
      })
      .finally(() => {
        if (active) {
          setLoadingHistory(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Danh sách các Deal đã chọn
  const selectedDeals = useMemo(
    () =>
      selectedDealIds
        .map(id => allDeals.find(d => d.id === id))
        .filter((d): d is BookingDealItem => Boolean(d)),
    [selectedDealIds, allDeals]
  );

  const primaryDeal = selectedDeals[0] || initialDeal || null;

  // Các mã BO khác của cùng KOC / cùng kênh để hỗ trợ gom 1 phiếu ĐNTT
  const sameKocOtherDeals = useMemo(() => {
    if (!primaryDeal) return [];
    const targetKocId = primaryDeal.kocId;
    const targetChannel = (primaryDeal.kocChannelId || '').toLowerCase();
    const targetStage = (primaryDeal.kocStageName || '').toLowerCase();

    return allDeals.filter(d => {
      if (selectedDealIds.includes(d.id)) return false;
      if ((d.totalValue || 0) <= 0) return false;
      const sameId = targetKocId && d.kocId === targetKocId;
      const sameChannel = targetChannel && (d.kocChannelId || '').toLowerCase() === targetChannel;
      const sameStage = targetStage && d.kocStageName.toLowerCase() === targetStage;
      return sameId || sameChannel || sameStage;
    });
  }, [primaryDeal, allDeals, selectedDealIds]);

  // Danh sách các deal có phí khác trên Bảng 3.2 để chọn thêm nếu muốn
  const selectablePaidDeals = useMemo(
    () =>
      allDeals
        .filter(
          d =>
            !selectedDealIds.includes(d.id) &&
            (d.totalValue || 0) > 0 &&
            d.brandApprovalStatus === 'ĐÃ_DUYỆT'
        )
        .slice(0, 60),
    [allDeals, selectedDealIds]
  );

  // Chạy động cơ kiểm tra chặn cứng 100% theo thời gian thực
  const evaluation = useMemo(
    () =>
      buildLarkPaymentRequestSlip({
        requestType,
        deals: selectedDeals,
        kocs,
        overridesByDealId,
        sharedPayeeOverride,
        createdBy: currentUserName,
        note: slipNote,
        month: '2026/10',
      }),
    [requestType, selectedDeals, kocs, overridesByDealId, sharedPayeeOverride, currentUserName, slipNote]
  );

  const hasPayeeInfo = Boolean(evaluation.payee.bankAccount && evaluation.payee.legalId);

  const updateDealOverride = (dealId: string, patch: Partial<DealPaymentOverrides>) => {
    setOverridesByDealId(prev => ({
      ...prev,
      [dealId]: {
        ...(prev[dealId] || {}),
        ...patch,
      },
    }));
  };

  const handleSubmitToLark = async () => {
    if (!evaluation.canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          deals: selectedDeals,
          kocs,
          overridesByDealId,
          sharedPayeeOverride,
          actorName: currentUserName,
          note: slipNote,
          month: '2026/10',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(
          json?.message || 'Chưa đủ điều kiện đẩy phiếu thanh toán sang Lark Approval.'
        );
        return;
      }

      const createdSlip = json.slip as LarkPaymentRequestSlip;
      setCreatedSlipResult(createdSlip);
      setHistorySlips(prev => [createdSlip, ...prev]);

      // Cập nhật ngược trạng thái & mã phiếu Lark về các Deal trên Bảng 3.2
      if (onSuccessUpdateDeals) {
        const updatedDeals: BookingDealItem[] = selectedDeals.map(d => {
          const line = createdSlip.lineItems.find(l => l.dealId === d.id);
          return {
            ...d,
            kocBankName: createdSlip.payee.bankName,
            kocBankAccount: createdSlip.payee.bankAccount,
            kocBankHolder: createdSlip.payee.bankHolder,
            kocIdCardNumber: createdSlip.payee.legalId,
            hasIdCardScan: true,
            tiktokVideoUrl: line?.linkAir || d.tiktokVideoUrl,
            videoUrl: line?.linkAir || d.videoUrl,
            postedDate: line?.postedDate || d.postedDate,
            postDate: line?.postedDate || d.postDate,
            sparkAdsCode: line?.sparkAdsCode || d.sparkAdsCode,
            contractScanUrl: line?.contractUrl || d.contractScanUrl,
            signedContractUrl: line?.contractUrl || d.signedContractUrl,
            dnttSubmittedAt: createdSlip.createdAt,
            isDnttOverdue10Am: false,
            ...(requestType === 'ADVANCE'
              ? {
                  larkAdvanceApprovalCode: createdSlip.larkSync.approvalInstanceCode,
                  advanceLarkCode: createdSlip.larkSync.approvalInstanceCode,
                  advanceAmount: line?.netTransferAmount || d.advanceAmount,
                  status: 'ADVANCE_PAID' as const,
                  statusLabel: `Đã tạo phiếu tạm ứng (${createdSlip.slipCode})`,
                  pipelineText: 'Tạm ứng',
                  holdingTeam: 'FINANCE' as const,
                }
              : {
                  larkFinalApprovalCode: createdSlip.larkSync.approvalInstanceCode,
                  finalAmount: line?.netTransferAmount || d.finalAmount,
                  status: 'FINAL_PAID' as const,
                  statusLabel: `Đã đẩy ĐNTT Lark (${createdSlip.slipCode})`,
                  pipelineText: 'Đối soát',
                  currentStage: '5_SETTLEMENT' as const,
                  holdingTeam: 'FINANCE' as const,
                }),
          };
        });
        onSuccessUpdateDeals(updatedDeals, createdSlip);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Không thể kết nối tới cổng Lark Approval.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceLarkApprovalStep = async (targetSlip: LarkPaymentRequestSlip) => {
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipId: targetSlip.id,
          approvalInstanceCode: targetSlip.larkSync.approvalInstanceCode,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.slip) {
        const updatedSlip = json.slip as LarkPaymentRequestSlip;
        setHistorySlips(prev =>
          prev.map(s => (s.id === updatedSlip.id ? updatedSlip : s))
        );
        if (createdSlipResult?.id === updatedSlip.id) {
          setCreatedSlipResult(updatedSlip);
        }
        if (onSuccessUpdateDeals) {
          const matchedDeals = allDeals.filter(d =>
            updatedSlip.lineItems.some(l => l.dealId === d.id || l.dealCode === d.dealCode)
          );
          if (matchedDeals.length > 0) {
            onSuccessUpdateDeals(matchedDeals, updatedSlip);
          }
        }
      } else {
        setSubmitError(json?.message || json?.error || 'Không chuyển được bước duyệt.');
      }
    } catch {
      setSubmitError('Lỗi kết nối mạng khi cập nhật bước duyệt phiếu thanh toán. Vui lòng thử lại.');
    }
  };

  const renderLarkApprovalNodes = (
    hasLeader: boolean,
    leaderName?: string,
    directorName = 'Đặng Thị Yến Nhi',
    currentStatus?: LarkPaymentRequestSlip['larkSync']['approvalStatus']
  ) => {
    const steps: Array<{
      key: string;
      title: string;
      actor: string;
      done: boolean;
      active: boolean;
    }> = [
      {
        key: 'STEP_PIC',
        title: '1. Đối soát Deal & Phụ lục',
        actor: currentUserName,
        done: Boolean(currentStatus),
        active: !currentStatus,
      },
      ...(hasLeader
        ? [
            {
              key: 'STEP_LEADER',
              title: '2. Trưởng nhóm sơ duyệt',
              actor: leaderName || 'Nguyễn Thị Ngọc Tâm',
              done:
                currentStatus === 'PENDING_DIRECTOR' ||
                currentStatus === 'PENDING_FINANCE' ||
                currentStatus === 'APPROVED' ||
                currentStatus === 'PAID',
              active: currentStatus === 'PENDING_LEADER',
            },
          ]
        : []),
      {
        key: 'STEP_DIRECTOR',
        title: `${hasLeader ? '3' : '2'}. Duyệt hạn mức Order Net`,
        actor: `GĐ MKT · ${directorName}`,
        done:
          currentStatus === 'PENDING_FINANCE' ||
          currentStatus === 'APPROVED' ||
          currentStatus === 'PAID',
        active: currentStatus === 'PENDING_DIRECTOR',
      },
      {
        key: 'STEP_FINANCE',
        title: `${hasLeader ? '4' : '3'}. Kế toán đối soát & Giải ngân`,
        actor: 'Phòng TCKT (VietQR)',
        done: currentStatus === 'APPROVED' || currentStatus === 'PAID',
        active: currentStatus === 'PENDING_FINANCE',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {steps.map(st => (
          <div
            key={st.key}
            className={`rounded-lg border px-2.5 py-2 text-xs ${
              st.done
                ? 'border-positive/40 bg-positive-soft/30 text-ink'
                : st.active
                ? 'border-accent bg-accent-soft/25 text-ink'
                : 'border-line bg-sunken text-ink-3'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold">{st.title}</span>
              <span
                className={`text-3xs font-semibold px-1.5 py-0.5 rounded ${
                  st.done
                    ? 'bg-emerald-100 text-emerald-800'
                    : st.active
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface text-ink-3'
                }`}
              >
                {st.done ? 'Đã duyệt' : st.active ? 'Đang xử lý' : 'Chờ tới lượt'}
              </span>
            </div>
            <div className="text-2xs text-ink-2 mt-0.5 truncate">{st.actor}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Đối soát Thanh toán theo Deal & Tạo luồng phê duyệt Lark Approval"
      footer={
        activeTab === 'CREATE_SLIP' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-xs">
              {evaluation.canSubmit ? (
                <Status tone="positive">
                  Đạt 100% điều kiện Đối soát Deal · Sẵn sàng tạo luồng Lark Approval
                </Status>
              ) : (
                <Status tone="critical">
                  Chặn cứng: Thiếu {evaluation.allIssues.length} thông tin bắt buộc
                </Status>
              )}
              <span className="text-ink-3 tabular-nums">
                Thực chuyển:{' '}
                <strong className="font-semibold text-ink">
                  {formatVnd(evaluation.totals.netTransferTotal)}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                icon={Send}
                disabled={!evaluation.canSubmit || submitting}
                onClick={handleSubmitToLark}
              >
                {submitting
                  ? 'Đang tạo luồng Lark Approval...'
                  : requestType === 'ADVANCE'
                  ? 'Tạo luồng Tạm ứng trên Lark Approval'
                  : 'Tạo luồng ĐNTT Deal trên Lark Approval'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'CREATE_SLIP',
              label: 'Đối soát Deal & Tạo luồng Lark Approval',
              count: selectedDeals.length,
            },
            {
              key: 'SLIP_HISTORY',
              label: 'Luồng phê duyệt đã tạo trên Lark Approval',
              count: historySlips.length,
            },
          ]}
          actions={
            activeTab === 'CREATE_SLIP' ? (
              <Segmented
                value={requestType}
                onChange={v => {
                  setRequestType(v as PaymentRequestType);
                  setCreatedSlipResult(null);
                }}
                items={[
                  { key: 'SETTLEMENT', label: 'ĐNTT Tất toán Deal (Đợt 2 / 100%)' },
                  { key: 'ADVANCE', label: 'Phiếu Tạm ứng Deal (Đợt 1)' },
                ]}
              />
            ) : (
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={loadingHistory}
                onClick={loadHistorySlips}
              >
                Làm mới
              </Button>
            )
          }
        />

        {activeTab === 'CREATE_SLIP' && (
          <div className="space-y-4">
            {createdSlipResult && (
              <div className="rounded-xl border border-positive/40 bg-positive-soft p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-positive shrink-0" />
                    <span className="text-sm font-semibold text-ink">
                      Đã khởi tạo luồng phê duyệt Lark Approval cho phiếu {createdSlipResult.slipCode}
                    </span>
                    <Status tone="positive">
                      Mã Lark Approval: {createdSlipResult.larkSync.approvalInstanceCode}
                    </Status>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-code text-ink-2">
                      Bản ghi Larkbase 3.2: {createdSlipResult.larkSync.larkbaseRecordId}
                    </span>
                    {createdSlipResult.larkSync.approvalStatus !== 'PAID' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={CheckCircle2}
                        onClick={() => handleAdvanceLarkApprovalStep(createdSlipResult)}
                      >
                        Duyệt bước tiếp theo trên Lark
                      </Button>
                    )}
                  </div>
                </div>
                {renderLarkApprovalNodes(
                  createdSlipResult.approvalRoute.hasBookingLeader,
                  createdSlipResult.approvalRoute.bookingLeaderName,
                  createdSlipResult.approvalRoute.marketingDirectorName,
                  createdSlipResult.larkSync.approvalStatus
                )}
                <div className="text-xs text-ink-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Luồng duyệt: <strong>{createdSlipResult.approvalRoute.routeSummary}</strong>
                  </span>
                  <span>
                    Số tiền thực chuyển:{' '}
                    <strong className="tabular-nums text-ink">
                      {formatVnd(createdSlipResult.totals.netTransferTotal)}
                    </strong>{' '}
                    ({createdSlipResult.totals.amountInWords})
                  </span>
                </div>
              </div>
            )}

            {submitError && (
              <div className="rounded-xl border border-critical/40 bg-critical-soft p-3 text-xs text-critical font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Hàng chỉ số tổng hợp của phiếu */}
            <StatRow>
              <Stat
                label="Số Deal trong phiếu"
                value={`${evaluation.totals.dealsCount} Deal`}
                note={evaluation.lineItems.map(i => `${i.dealCode} (${i.contractAppendixCode || 'PL'})`).join(', ') || 'Chưa chọn Deal'}
              />
              <Stat
                label="Tổng giá trị Deal (Net)"
                value={formatVndShort(evaluation.totals.agreedNetTotal)}
                note={
                  evaluation.totals.droppedDeductionTotal > 0
                    ? `Khấu trừ phần hủy: -${formatVndShort(evaluation.totals.droppedDeductionTotal)}`
                    : `Đã tạm ứng: ${formatVndShort(evaluation.totals.advancePaidTotal)}`
                }
              />
              <Stat
                label="Thuế TNCN 10% / VAT"
                value={formatVndShort(
                  evaluation.totals.pitTax10PctTotal + evaluation.totals.vatTotal
                )}
                note={`Tổng Gross HĐ: ${formatVndShort(evaluation.totals.grossTotal)}`}
              />
              <Stat
                label="Thực chuyển KOC đợt này"
                value={formatVnd(evaluation.totals.netTransferTotal)}
                tone={evaluation.canSubmit ? 'positive' : 'warning'}
                note={evaluation.totals.amountInWords}
              />
            </StatRow>

            {/* Sơ đồ luồng phê duyệt thanh toán trên Lark Approval */}
            <Panel title="Luồng phê duyệt thanh toán tự động trên Lark Approval">
              <div className="space-y-2">
                {renderLarkApprovalNodes(
                  evaluation.approvalRoute.hasBookingLeader,
                  evaluation.approvalRoute.bookingLeaderName,
                  evaluation.approvalRoute.marketingDirectorName,
                  createdSlipResult?.larkSync.approvalStatus
                )}
              </div>
            </Panel>

            {/* Khung 1: Danh sách mã BO trong phiếu & Gom đơn cùng KOC/MCN */}
            <Panel
              title="1. Danh sách Deal & Phụ lục SOW lập phiếu · Gom thanh toán cùng KOC / MCN"
              actions={
                sameKocOtherDeals.length > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() =>
                      setSelectedDealIds(prev => [
                        ...prev,
                        ...sameKocOtherDeals.map(d => d.id),
                      ])
                    }
                  >
                    Gom thêm {sameKocOtherDeals.length} Deal của {evaluation.payee.kocStageName}
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value=""
                    onChange={e => {
                      const nextId = e.target.value;
                      if (nextId && !selectedDealIds.includes(nextId)) {
                        setSelectedDealIds(prev => [...prev, nextId]);
                      }
                    }}
                    className="w-auto min-w-[280px]"
                    aria-label="Thêm mã BO từ Bảng 3.2 vào phiếu"
                  >
                    <option value="">+ Chọn ghép thêm Deal & Phụ lục SOW từ Bảng 3.2...</option>
                    {sameKocOtherDeals.length > 0 && (
                      <optgroup label={`Cùng KOC (${evaluation.payee.kocStageName})`}>
                        {sameKocOtherDeals.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.dealCode} · {d.brandName} · {d.productName} ({formatVnd(d.totalValue)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Các Deal đã duyệt khác trên Bảng 3.2">
                      {selectablePaidDeals.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.dealCode} · {d.kocStageName} · {d.brandName} ({formatVnd(d.totalValue)})
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                  <span className="text-xs text-ink-3">
                    Luồng duyệt tự động: <strong className="text-ink-2">{evaluation.approvalRoute.routeSummary}</strong>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {evaluation.lineItems.map(line => {
                    const matchedDealObj = selectedDeals.find(d => d.id === line.dealId);
                    const dealJobsList = matchedDealObj?.dealJobs || [];
                    return (
                      <div
                        key={line.dealId}
                        className={`rounded-lg border p-3 space-y-3 ${
                          line.isEligible
                            ? 'border-positive/30 bg-positive-soft/20'
                            : 'border-critical/40 bg-critical-soft/20'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-code text-xs font-semibold text-ink">
                              Deal: {line.dealCode}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-code text-3xs text-ink-2">
                              HĐNT: {line.masterContractCode} · Phụ lục SOW: {line.contractAppendixCode}{dealJobsList.length > 0 ? ` (${dealJobsList.length} Job · ${dealJobsList.length} Bảng CV)` : ''}
                            </span>
                            <Status tone={line.isEligible ? 'positive' : 'critical'}>
                              {line.isEligible
                                ? 'Đủ nghiệm thu Deal (B1+B2)'
                                : `Chặn cứng: Thiếu ${line.issues.length} mục`}
                            </Status>
                            <span className="text-xs font-semibold text-ink">
                              {line.brandName} · {line.storeName}
                            </span>
                            <span className="text-xs text-ink-3">
                              ({line.productName} · {line.salaryGrade})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink tabular-nums">
                              Thanh toán Deal: {formatVnd(line.netTransferAmount)}
                            </span>
                            {selectedDeals.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={Trash2}
                                onClick={() =>
                                  setSelectedDealIds(prev => prev.filter(id => id !== line.dealId))
                                }
                              />
                            )}
                          </div>
                        </div>

                        {/* Tóm tắt cấu trúc chi phí của Deal: Asset Video + Dịch vụ gia tăng - Khấu trừ phần hủy */}
                        {dealJobsList.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-2xs">
                            {dealJobsList.map((jItem, jIdx) => {
                              const jAddonsNet = (jItem.addonServices || []).reduce(
                                (s, a) => s + (Number(a.allocatedCostVnd) || 0),
                                0
                              );
                              const jDropped = (jItem.addonServices || [])
                                .filter(a => a.acceptanceStatus === 'DROPPED')
                                .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
                              const jSub = Math.max(
                                0,
                                (Number(jItem.videoAssetNetCost) || 0) + jAddonsNet - jDropped
                              );
                              return (
                                <div
                                  key={jItem.id || jIdx}
                                  className="px-2.5 py-1.5 rounded border border-line bg-surface flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span className="font-code font-semibold text-accent">
                                      Bảng CV #{jIdx + 1} · {jItem.jobCode}
                                    </span>{' '}
                                    <span className="font-medium text-ink">
                                      {jItem.productName || jItem.jobTitle}
                                    </span>
                                  </div>
                                  <span className="font-code font-semibold text-ink shrink-0">
                                    {formatVnd(jSub)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 px-2.5 py-1.5 rounded bg-surface border border-line text-2xs font-code text-ink-2">
                          <span>
                            Hạng mục 1 (Video review): <strong>{formatVnd(line.videoAssetNetAmount ?? line.agreedNetAmount)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Hạng mục 2 & 3 (DV gia tăng): <strong>{formatVnd(line.addonServicesNetAmount || 0)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Tổng Phụ lục SOW: <strong>{formatVnd(line.agreedNetAmount)}</strong>
                          </span>
                          {line.droppedDeductionAmount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-critical font-semibold">
                                Khấu trừ hạng mục hủy (BBNT): -{formatVnd(line.droppedDeductionAmount)}
                              </span>
                            </>
                          )}
                          {line.advancePaidAmount > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                Đã tạm ứng: -{formatVnd(line.advancePaidAmount)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Danh sách lỗi chặn cứng của mã BO này (nếu có) */}
                        {line.issues.length > 0 && (
                          <div className="rounded-md bg-surface border border-critical/30 p-2.5 space-y-1.5">
                            <div className="text-2xs font-semibold text-critical">
                              Các trường bắt buộc trên Bảng 3.2 cần bổ sung để mở khóa nút đẩy phiếu:
                            </div>
                            <ul className="grid sm:grid-cols-2 gap-1.5 text-2xs text-ink-2">
                              {line.issues.map(iss => (
                                <li key={iss.code} className="flex items-start gap-1.5">
                                  <span className="text-critical font-semibold">•</span>
                                  <span>
                                    <strong className="text-ink">{iss.fieldLabel}:</strong> {iss.message}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Khung chứng từ của từng BO: tóm tắt chỉ đọc khi đủ điều kiện, mở sửa khi cần hoặc thiếu */}
                        {line.isEligible && !editingDealIds[line.dealId] ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-line bg-surface text-2xs">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
                              {requestType === 'SETTLEMENT' && (
                                <>
                                  <span>
                                    Bài đăng:{' '}
                                    {line.linkAir ? (
                                      <a
                                        href={line.linkAir}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-accent hover:underline inline-flex items-center gap-1 font-mono"
                                      >
                                        Xem bài <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-ink-3">Chưa có</span>
                                    )}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Lên sóng: <strong className="text-ink">{line.postedDate || '—'}</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Spark Ads: <code className="font-mono text-ink">{line.sparkAdsCode || 'Không dùng'}</code>
                                  </span>
                                  <span>•</span>
                                </>
                              )}
                              <span>
                                Hợp đồng:{' '}
                                {line.contractUrl ? (
                                  <a
                                    href={line.contractUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline inline-flex items-center gap-1"
                                  >
                                    Xem hợp đồng <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : line.isContractMandatory ? (
                                  <span className="text-warning font-semibold">Chưa có</span>
                                ) : (
                                  <span className="text-ink-3">Miễn ký</span>
                                )}
                              </span>
                              {requestType === 'SETTLEMENT' && line.isBbntMandatory && (
                                <>
                                  <span>•</span>
                                  <span>
                                    BBNT:{' '}
                                    {line.bbntUrl && !line.bbntUrl.startsWith('Miễn BBNT') ? (
                                      <strong className="text-ink">{line.bbntUrl}</strong>
                                    ) : (
                                      <span className="text-ink-3">Miễn BBNT</span>
                                    )}
                                  </span>
                                </>
                              )}
                              {requestType === 'SETTLEMENT' && evaluation.payee.subjectKind === 'COM' && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Hóa đơn: <strong className="text-ink">{line.invoiceNumber || 'Chưa có'}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setEditingDealIds(prev => ({ ...prev, [line.dealId]: true }))
                              }
                            >
                              Sửa chứng từ
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              {requestType === 'SETTLEMENT' && (
                                <>
                                  <Field label="Link bài đăng dài (có Video ID)" noWrap>
                                    <Input
                                      value={line.linkAir}
                                      onChange={e =>
                                        updateDealOverride(line.dealId, { linkAir: e.target.value })
                                      }
                                      placeholder="https://www.tiktok.com/@koc/video/742..."
                                    />
                                  </Field>
                                  <Field label="Ngày lên sóng thực tế" noWrap>
                                    <Input
                                      type="date"
                                      value={line.postedDate}
                                      onChange={e =>
                                        updateDealOverride(line.dealId, { postedDate: e.target.value })
                                      }
                                    />
                                  </Field>
                                  <Field label="Mã quảng cáo Spark Ads" noWrap>
                                    <Input
                                      className="font-code"
                                      value={line.sparkAdsCode}
                                      onChange={e =>
                                        updateDealOverride(line.dealId, {
                                          sparkAdsCode: e.target.value,
                                          adsCodeStatus: e.target.value.trim()
                                            ? 'ĐÃ_NGHIỆM_THU'
                                            : 'KHÔNG_DÙNG',
                                        })
                                      }
                                      placeholder="SPARK-TT-... (hoặc Không dùng)"
                                    />
                                  </Field>
                                </>
                              )}
                              <Field
                                label={
                                  line.isContractMandatory
                                    ? 'Link Hợp đồng đã ký 2 bên (Bắt buộc BR-03)'
                                    : 'Link Hợp đồng (Miễn ký theo BR-03)'
                                }
                              >
                                <Input
                                  value={line.contractUrl}
                                  onChange={e =>
                                    updateDealOverride(line.dealId, { contractUrl: e.target.value })
                                  }
                                  placeholder="https://drive.google.com/drive/folders/..."
                                />
                              </Field>
                              {requestType === 'SETTLEMENT' && line.isBbntMandatory && (
                                <Field label="Mã / Link BBNT đã ký (Bắt buộc BR-04)" noWrap>
                                  <Input
                                    value={
                                      overridesByDealId[line.dealId]?.bbntUrl ??
                                      (line.bbntUrl.startsWith('Miễn BBNT') ? '' : line.bbntUrl)
                                    }
                                    onChange={e =>
                                      updateDealOverride(line.dealId, { bbntUrl: e.target.value })
                                    }
                                    placeholder="BBNT-202610-..."
                                  />
                                </Field>
                              )}
                              {requestType === 'SETTLEMENT' &&
                                evaluation.payee.subjectKind === 'COM' && (
                                  <Field label="Số Hóa đơn GTGT (Bắt buộc Công ty)" noWrap>
                                    <Input
                                      value={line.invoiceNumber}
                                      onChange={e =>
                                        updateDealOverride(line.dealId, {
                                          invoiceNumber: e.target.value,
                                        })
                                      }
                                      placeholder="HD-001284..."
                                    />
                                  </Field>
                                )}
                            </div>
                            {line.isEligible && editingDealIds[line.dealId] && (
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setEditingDealIds(prev => ({ ...prev, [line.dealId]: false }))
                                  }
                                >
                                  Đóng sửa
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {/* Khung 2: Thông tin Thụ hưởng, Pháp lý CCCD/MST & Mã QR Chuyển khoản */}
            <Panel
              title="2. Thông tin thụ hưởng, Pháp lý (CCCD / MST) & Thuế (BR-09)"
              actions={
                <div className="flex items-center gap-1.5">
                  {hasPayeeInfo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPayee(v => !v)}
                    >
                      {isEditingPayee ? 'Đóng sửa' : 'Sửa thông tin thụ hưởng'}
                    </Button>
                  )}
                  {evaluation.payee.vietQrUrl && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={QrCode}
                      onClick={() => setShowQrPreview(v => !v)}
                    >
                      {showQrPreview ? 'Ẩn Mã QR' : 'Xem Mã QR'}
                    </Button>
                  )}
                </div>
              }
            >
              {!isEditingPayee && hasPayeeInfo ? (
                <div className="p-3 rounded-lg border border-line bg-surface/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  <div>
                    <span className="text-ink-3 block text-2xs">Chủ thể thuế</span>
                    <span className="font-medium text-ink">
                      {evaluation.payee.subjectLabel || evaluation.payee.subjectKind}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">
                      {evaluation.payee.subjectKind === 'COM' || evaluation.payee.subjectKind === 'HKD'
                        ? 'Mã số thuế'
                        : 'Số CCCD'}
                    </span>
                    <span className="font-mono font-medium text-ink">
                      {evaluation.payee.legalId}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Ngân hàng</span>
                    <span className="font-medium text-ink">
                      {evaluation.payee.bankName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Số tài khoản</span>
                    <span className="font-mono font-semibold text-ink">
                      {evaluation.payee.bankAccount}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Chủ tài khoản</span>
                    <span className="font-medium text-ink uppercase">
                      {evaluation.payee.bankHolder || '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                  <Field label="Loại chủ thể thuế" className="lg:col-span-3" noWrap>
                    <Select
                      value={sharedPayeeOverride.taxAccountType || evaluation.payee.subjectKind}
                      onChange={e =>
                        setSharedPayeeOverride(prev => ({
                          ...prev,
                          taxAccountType: e.target.value as DealPaymentOverrides['taxAccountType'],
                        }))
                      }
                    >
                      <option value="IND">Cá nhân (TNCN 10% khi ≥ 2M)</option>
                      <option value="HKD">Hộ kinh doanh (Trọn gói thuế)</option>
                      <option value="COM">Công ty / MCN (VAT 8%)</option>
                      <option value="CTV">Cộng tác viên (TNCN 10%)</option>
                    </Select>
                  </Field>
                  <Field
                    className="lg:col-span-2"
                    noWrap
                    label={
                      evaluation.payee.subjectKind === 'COM' ||
                      evaluation.payee.subjectKind === 'HKD'
                        ? 'Mã số thuế (Bắt buộc)'
                        : 'Số CCCD 12 số (Bắt buộc)'
                    }
                  >
                    <Input
                      className="font-code"
                      value={sharedPayeeOverride.legalId ?? evaluation.payee.legalId}
                      onChange={e =>
                        setSharedPayeeOverride(prev => ({ ...prev, legalId: e.target.value }))
                      }
                      placeholder="001195018294"
                    />
                  </Field>
                  <Field label="Ngân hàng nhận thanh toán" className="lg:col-span-2" noWrap>
                    <Input
                      value={sharedPayeeOverride.bankName ?? evaluation.payee.bankName}
                      onChange={e =>
                        setSharedPayeeOverride(prev => ({ ...prev, bankName: e.target.value }))
                      }
                      placeholder="Techcombank, Vietcombank, MB..."
                    />
                  </Field>
                  <Field label="Số tài khoản" className="lg:col-span-2" noWrap>
                    <Input
                      className="font-code"
                      value={sharedPayeeOverride.bankAccount ?? evaluation.payee.bankAccount}
                      onChange={e =>
                        setSharedPayeeOverride(prev => ({ ...prev, bankAccount: e.target.value }))
                      }
                      placeholder="19036829104..."
                    />
                  </Field>
                  <Field label="Tên chủ tài khoản (Khớp CCCD/HĐ)" className="lg:col-span-3" noWrap>
                    <Input
                      value={sharedPayeeOverride.bankHolder ?? evaluation.payee.bankHolder}
                      onChange={e =>
                        setSharedPayeeOverride(prev => ({ ...prev, bankHolder: e.target.value }))
                      }
                      placeholder="NGUYEN VAN A"
                    />
                  </Field>
                </div>
              )}

              {showQrPreview && evaluation.payee.vietQrUrl && (
                <div className="mt-3 p-3 rounded-lg border border-line bg-sunken flex flex-wrap items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evaluation.payee.vietQrUrl}
                    alt="Mã QR chuyển khoản"
                    className="w-36 h-36 rounded-lg border border-line bg-surface object-contain p-1"
                  />
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-ink">
                      {evaluation.payee.bankName} · {evaluation.payee.bankAccount}
                    </div>
                    <div className="text-ink-2">
                      Chủ TK: <strong>{evaluation.payee.bankHolder}</strong>
                    </div>
                    <div className="text-ink-2 tabular-nums">
                      Số tiền chuyển:{' '}
                      <strong className="text-positive font-semibold">
                        {formatVnd(evaluation.totals.netTransferTotal)}
                      </strong>
                    </div>
                    <div className="text-ink-3">
                      Bằng chữ: {evaluation.totals.amountInWords}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <Field label="Ghi chú trình duyệt gửi Leader / Giám đốc MKT / Kế toán">
                  <Textarea
                    rows={2}
                    value={slipNote}
                    onChange={e => setSlipNote(e.target.value)}
                    placeholder="Ghi chú nội dung thanh toán, đợt sóng chiến dịch hoặc lưu ý hóa đơn..."
                  />
                </Field>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'SLIP_HISTORY' && (
          <div className="space-y-3">
            {historySlips.map(slip => (
              <div
                key={slip.id}
                className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-code text-xs font-semibold text-accent">
                      {slip.slipCode}
                    </span>
                    <Status
                      tone={
                        slip.larkSync.approvalStatus === 'APPROVED' ||
                        slip.larkSync.approvalStatus === 'PAID'
                          ? 'positive'
                          : 'warning'
                      }
                    >
                      {slip.larkSync.approvalStatus === 'PAID'
                        ? 'Đã giải ngân hoàn tất'
                        : slip.larkSync.approvalStatus === 'APPROVED'
                        ? 'Đã duyệt trên Lark · Chờ giải ngân'
                        : slip.larkSync.approvalStatus === 'PENDING_FINANCE'
                        ? 'Chờ Kế toán đối soát & giải ngân'
                        : slip.larkSync.approvalStatus === 'PENDING_LEADER'
                        ? 'Chờ Leader sơ duyệt trên Lark'
                        : 'Chờ GĐ MKT duyệt trên Lark'}
                    </Status>
                    <span className="text-xs font-semibold text-ink">
                      {slip.requestTypeLabel}
                    </span>
                    <span className="text-xs text-ink-3 font-code">
                      ({slip.larkSync.approvalInstanceCode})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-ink tabular-nums">
                      Thực chuyển: {formatVnd(slip.totals.netTransferTotal)}
                    </div>
                    {slip.larkSync.approvalStatus !== 'PAID' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={CheckCircle2}
                        onClick={() => handleAdvanceLarkApprovalStep(slip)}
                      >
                        Duyệt bước tiếp theo trên Lark
                      </Button>
                    )}
                  </div>
                </div>
                {renderLarkApprovalNodes(
                  slip.approvalRoute.hasBookingLeader,
                  slip.approvalRoute.bookingLeaderName,
                  slip.approvalRoute.marketingDirectorName,
                  slip.larkSync.approvalStatus
                )}
                <div className="text-xs text-ink-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    KOC: <strong>{slip.payee.kocStageName}</strong> ({slip.payee.bankName} ·{' '}
                    <span className="font-code">{slip.payee.bankAccount && slip.payee.bankAccount.length > 4 && !slip.payee.bankAccount.startsWith('*') ? `****${slip.payee.bankAccount.slice(-4)}` : slip.payee.bankAccount}</span> ·{' '}
                    {slip.payee.bankHolder})
                  </span>
                  <span>
                    Deal &amp; Phụ lục:{' '}
                    <strong className="font-code">
                      {slip.lineItems
                        .map(
                          i => `${i.dealCode} (${i.contractAppendixCode || `PL-${i.dealCode}-01`})`
                        )
                        .join(', ')}
                    </strong>
                  </span>
                  <span>Người lập: {slip.createdBy}</span>
                </div>
                {slip.lineItems.some(i => i.linkAir) && (
                  <div className="flex flex-wrap gap-2 text-2xs">
                    {slip.lineItems.map(i =>
                      i.linkAir ? (
                        <a
                          key={i.dealId}
                          href={i.linkAir}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          Link Air {i.dealCode}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
