'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  QrCode,
  FileCheck2,
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

  // Đồng bộ deal khởi tạo khi mở hộp thoại
  const initKey = open ? `${initialDeal?.id || 'NONE'}` : 'CLOSED';
  const [prevInitKey, setPrevInitKey] = useState<string>('CLOSED');
  if (initKey !== prevInitKey) {
    setPrevInitKey(initKey);
    if (open) {
      setActiveTab('CREATE_SLIP');
      setSubmitError('');
      setCreatedSlipResult(null);
      setOverridesByDealId({});
      setSharedPayeeOverride({});
      if (initialDeal) {
        setSelectedDealIds([initialDeal.id]);
        const isAlreadyVerified =
          initialDeal.status === 'VIDEO_VERIFIED' ||
          initialDeal.status === 'VIDEO_SUBMITTED' ||
          Boolean(initialDeal.tiktokVideoUrl || initialDeal.videoUrl);
        setRequestType(isAlreadyVerified ? 'SETTLEMENT' : 'ADVANCE');
        setSlipNote(
          `Đề nghị ${isAlreadyVerified ? 'tất toán' : 'tạm ứng'} mã BO ${initialDeal.dealCode} (${initialDeal.kocStageName} · ${initialDeal.brandName})`
        );
      } else {
        const firstPaid = allDeals.find(d => (d.totalValue || 0) > 0 && d.brandApprovalStatus === 'ĐÃ_DUYỆT');
        setSelectedDealIds(firstPaid ? [firstPaid.id] : []);
        setRequestType('SETTLEMENT');
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
    if (open) {
      loadHistorySlips();
    }
  }, [open, loadHistorySlips]);

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

  const updateDealOverride = (dealId: string, patch: Partial<DealPaymentOverrides>) => {
    setOverridesByDealId(prev => ({
      ...prev,
      [dealId]: {
        ...(prev[dealId] || {}),
        ...patch,
      },
    }));
  };

  const handleAutoFillStandardDemoFields = (dealId: string, deal: BookingDealItem) => {
    const cleanHandle = (deal.kocChannelId || deal.kocStageName || 'creator')
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '');
    const numericSuffix = deal.dealCode.replace(/\D/g, '').slice(-6) || '616068';

    updateDealOverride(dealId, {
      linkAir:
        deal.tiktokVideoUrl && !deal.tiktokVideoUrl.includes('vt.tiktok.com')
          ? deal.tiktokVideoUrl
          : `https://www.tiktok.com/@${cleanHandle || 'koc.upbase'}/video/742185920384${numericSuffix}`,
      postedDate: deal.postedDate || deal.postDate || '2026-10-18',
      sparkAdsCode: deal.sparkAdsCode || `SPARK-TT-${numericSuffix}-60D`,
      adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
      contractUrl:
        deal.contractScanUrl ||
        deal.signedContractUrl ||
        `https://drive.google.com/drive/folders/upbase-hd-${deal.dealCode.toLowerCase()}`,
      bbntUrl: `BBNT-${deal.dealCode}-VER052026`,
      invoiceNumber: `HDGTGT-${numericSuffix}`,
    });

    setSharedPayeeOverride(prev => ({
      ...prev,
      bankName: prev.bankName || evaluation.payee.bankName || 'Techcombank',
      bankAccount: prev.bankAccount || evaluation.payee.bankAccount || `1903${numericSuffix}8899`,
      bankHolder:
        prev.bankHolder ||
        evaluation.payee.bankHolder ||
        (evaluation.payee.legalEntityName || deal.kocStageName).toUpperCase(),
      legalId: prev.legalId || evaluation.payee.legalId || `001196${numericSuffix}`,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Tạo phiếu đề nghị thanh toán & Đồng bộ Lark (Bảng 3.2)"
      footer={
        activeTab === 'CREATE_SLIP' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-xs">
              {evaluation.canSubmit ? (
                <Status tone="positive">
                  Đạt 100% điều kiện Bảng 3.2 · Sẵn sàng đẩy phiếu
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
                  ? 'Đang đẩy sang Lark...'
                  : requestType === 'ADVANCE'
                  ? 'Đẩy phiếu tạm ứng sang Lark'
                  : 'Đẩy phiếu ĐNTT sang Lark'}
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
              label: 'Kiểm tra Bảng 3.2 & Tạo phiếu',
              count: selectedDeals.length,
            },
            {
              key: 'SLIP_HISTORY',
              label: 'Lịch sử phiếu đã đẩy Lark',
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
                  { key: 'SETTLEMENT', label: 'ĐNTT Tất toán (Đợt 2 / 100%)' },
                  { key: 'ADVANCE', label: 'Phiếu Tạm ứng (Đợt 1)' },
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
              <div className="rounded-xl border border-positive/40 bg-positive-soft p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-positive shrink-0" />
                    <span className="text-sm font-semibold text-ink">
                      Đã khởi tạo phiếu {createdSlipResult.slipCode} thành công
                    </span>
                    <Status tone="positive">
                      {createdSlipResult.larkSync.approvalInstanceCode}
                    </Status>
                  </div>
                  <span className="text-xs font-code text-ink-2">
                    Bản ghi Larkbase: {createdSlipResult.larkSync.larkbaseRecordId}
                  </span>
                </div>
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
                label="Số mã BO trong phiếu"
                value={`${evaluation.totals.dealsCount} mã BO`}
                note={evaluation.lineItems.map(i => i.dealCode).join(', ') || 'Chưa chọn BO'}
              />
              <Stat
                label="Tổng Net thỏa thuận"
                value={formatVndShort(evaluation.totals.agreedNetTotal)}
                note={
                  evaluation.totals.droppedDeductionTotal > 0
                    ? `Trừ rớt sóng: -${formatVndShort(evaluation.totals.droppedDeductionTotal)}`
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

            {/* Khung 1: Danh sách mã BO trong phiếu & Gom đơn cùng KOC/MCN */}
            <Panel
              title="1. Danh sách mã BO lập phiếu & Gom đơn cùng KOC / MCN"
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
                    Gom thêm {sameKocOtherDeals.length} BO của {evaluation.payee.kocStageName}
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
                    <option value="">+ Chọn ghép thêm mã BO khác từ Bảng 3.2...</option>
                    {sameKocOtherDeals.length > 0 && (
                      <optgroup label={`Cùng KOC (${evaluation.payee.kocStageName})`}>
                        {sameKocOtherDeals.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.dealCode} · {d.brandName} · {d.productName} ({formatVnd(d.totalValue)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Các mã BO đã duyệt khác trên Bảng 3.2">
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
                    const dealObj = selectedDeals.find(d => d.id === line.dealId);
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
                              {line.dealCode}
                            </span>
                            <Status tone={line.isEligible ? 'positive' : 'critical'}>
                              {line.isEligible
                                ? 'Đủ hồ sơ Bảng 3.2'
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
                            {!line.isEligible && dealObj && (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={FileCheck2}
                                onClick={() => handleAutoFillStandardDemoFields(line.dealId, dealObj)}
                              >
                                Điền nhanh hồ sơ mẫu chuẩn
                              </Button>
                            )}
                            <span className="text-xs font-semibold text-ink tabular-nums">
                              Thực chuyển: {formatVnd(line.netTransferAmount)}
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

                        {/* Danh sách lỗi chặn cứng của mã BO này (nếu có) */}
                        {line.issues.length > 0 && (
                          <div className="rounded-md bg-surface border border-critical/30 p-2.5 space-y-1.5">
                            <div className="text-2xs font-semibold text-critical">
                              Các trường bắt buộc trên Bảng 3.2 cần bổ sung để mở khóa nút đẩy phiếu:
                            </div>
                            <ul className="grid sm:grid-cols-2 gap-1.5 text-2xs text-ink-2">
                              {line.issues.map(iss => (
                                <li key={iss.code} className="flex items-start gap-1.5">
                                  <span className="text-critical font-bold">•</span>
                                  <span>
                                    <strong className="text-ink">{iss.fieldLabel}:</strong> {iss.message}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Khung nhập/sửa trực tiếp thông tin Nghiệm thu & Chứng từ của từng BO */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
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
                evaluation.payee.vietQrUrl ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={QrCode}
                    onClick={() => setShowQrPreview(v => !v)}
                  >
                    {showQrPreview ? 'Ẩn Mã QR' : 'Xem Mã QR'}
                  </Button>
                ) : undefined
              }
            >
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

              {showQrPreview && evaluation.payee.vietQrUrl && (
                <div className="mt-3 p-3 rounded-lg border border-line bg-sunken flex flex-wrap items-center gap-4">
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
                className="rounded-xl border border-line bg-surface p-3.5 space-y-2"
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
                      {slip.larkSync.approvalStatus === 'APPROVED'
                        ? 'Đã duyệt trên Lark'
                        : slip.larkSync.approvalStatus === 'PENDING_LEADER'
                        ? 'Chờ Leader sơ duyệt'
                        : 'Chờ GĐ MKT & Kế toán duyệt'}
                    </Status>
                    <span className="text-xs font-semibold text-ink">
                      {slip.requestTypeLabel}
                    </span>
                    <span className="text-xs text-ink-3 font-code">
                      ({slip.larkSync.approvalInstanceCode})
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ink tabular-nums">
                    Thực chuyển: {formatVnd(slip.totals.netTransferTotal)}
                  </div>
                </div>
                <div className="text-xs text-ink-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    KOC: <strong>{slip.payee.kocStageName}</strong> ({slip.payee.bankName} ·{' '}
                    <span className="font-code">{slip.payee.bankAccount}</span> ·{' '}
                    {slip.payee.bankHolder})
                  </span>
                  <span>
                    Mã BO:{' '}
                    <strong className="font-code">
                      {slip.lineItems.map(i => i.dealCode).join(', ')}
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
