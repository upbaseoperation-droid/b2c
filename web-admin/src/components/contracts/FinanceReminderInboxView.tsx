'use client';

import React, { useMemo, useState } from 'react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractRecord } from '../../lib/contracts/types';
import type { ContractBootstrap } from './api';
import {
  evaluateLegalProfileSigningHistory,
  resolveContractLegalAttachments,
} from '../../lib/contracts/legalProfileHistory';
import { formatVnd } from '../../lib/format';
import { documentOfTemplate } from '../../lib/planDealLink';
import { loadApprovedBookingList } from '../../lib/approvedBookingList';
import {
  loadLarkPaymentSlipsFromStorage,
  type LarkPaymentRequestSlip,
} from '../../lib/larkPaymentRequestEngine';
import { extractContractFinancials } from './ContractApprovalPortalView';
import {
  Button,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  Panel,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { Column, StatusTone } from '../ui';

export type FinanceReminderCategory =
  | 'ALL'
  | 'CONTRACT_REVIEW'
  | 'GDOCS_WESIGN'
  | 'LARK_SLIP'
  | 'ADVANCE_SETTLEMENT'
  | 'RISK_ALERT';

export interface FinanceReminderItem {
  id: string;
  category: Exclude<FinanceReminderCategory, 'ALL'>;
  categoryLabel: string;
  title: string;
  subtitle: string;
  kocName: string;
  legalNote: string;
  isPreviouslySignedProfile: boolean;
  amountValue: number;
  amountSubtext: string;
  slaDeadline: string;
  picName: string;
  urgency: 'critical' | 'warning' | 'info' | 'done';
  urgencyLabel: string;
  actionLabel: string;
  contractRecord?: ContractRecord;
  dealCode?: string;
  larkSlip?: LarkPaymentRequestSlip;
}

export function computeFinanceReminderItems({
  data,
  deals = [],
  kocs = [],
  larkSlips,
}: {
  data: ContractBootstrap;
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  larkSlips?: LarkPaymentRequestSlip[];
}): FinanceReminderItem[] {
  const dealMap = new Map<string, BookingDealItem>();
  for (const d of deals) {
    dealMap.set(d.id, d);
    if (d.dealCode) dealMap.set(d.dealCode, d);
  }

  const kocMap = new Map<string, KocItem>();
  for (const k of kocs) {
    kocMap.set(k.id, k);
  }

  const activeSlips =
    larkSlips ??
    (typeof window !== 'undefined' ? loadLarkPaymentSlipsFromStorage() : []);

  const items: FinanceReminderItem[] = [];

  // 1 & 2 & 5: Quét từ danh sách Hồ sơ hợp đồng (Chờ Kế toán duyệt, Google Docs chờ chốt WeSign, Cảnh báo rủi ro)
  for (const r of data.records) {
    const deal =
      (r.dealId && dealMap.get(r.dealId)) ||
      (r.dealCode && dealMap.get(r.dealCode)) ||
      undefined;
    const koc =
      (r.kocId && kocMap.get(r.kocId)) ||
      (deal?.kocId && kocMap.get(deal.kocId)) ||
      undefined;
    const fin = extractContractFinancials(r, deal, koc);
    const history = evaluateLegalProfileSigningHistory(r, data.records, dealMap, kocMap);
    const docs = resolveContractLegalAttachments(r, dealMap, kocMap, data.records);
    const isPreviouslySigned = history.isSkipDeepCheckEligible;
    const latestSignedCode = history.latestMatch?.dealCode || history.latestMatch?.id;
    const stage = documentOfTemplate(r.templateId);
    const stageLabel =
      stage === 'HDNT' ? 'HĐ Nguyên tắc' : stage === 'SOW' ? 'Phụ lục SOW' : 'BBNT';

    const finStep = r.steps.find(s => s.role === 'FINANCE' && s.version === r.version);
    const isSigned = r.signing.some(s => s.status === 'COMPLETED');
    const isPendingFin = r.approval === 'IN_REVIEW' && finStep?.status === 'PENDING';
    const isGDocsPending =
      Boolean(r.googleDocsUrl) && r.approval !== 'APPROVED' && !isSigned;

    if (isPendingFin) {
      const hasRisk = fin.isOverDealBudget || fin.isUnbudgetedSpend || fin.missingBankInfo;
      items.push({
        id: `rem-contract-${r.id}`,
        category: 'CONTRACT_REVIEW',
        categoryLabel: `Duyệt ${stageLabel}`,
        title: `Duyệt ${stageLabel}: ${r.title}`,
        subtitle: `${r.brand} · ${r.dealCode || 'HĐ khung'} · v${r.version}`,
        kocName: r.partner,
        legalNote: isPreviouslySigned
          ? `Đã từng ký HSPL (${latestSignedCode || 'HĐ trước'}) · Miễn kiểm tra lại`
          : docs.length > 0
            ? `Ký lần đầu · Đã đính kèm ${docs.length} tệp CCCD/ĐKKD`
            : 'Ký lần đầu · Chưa đính kèm CCCD/ĐKKD',
        isPreviouslySignedProfile: isPreviouslySigned,
        amountValue: fin.netAmount,
        amountSubtext:
          fin.grossAmount > 0
            ? `Gross ${formatVnd(fin.grossAmount)} · Thuế ${formatVnd(fin.taxAmount)}`
            : 'Hợp đồng khung (Thực chi theo SOW)',
        slaDeadline: hasRisk ? 'Khẩn cấp · Trong 4h' : 'Hôm nay, 17:30',
        picName: r.ownerName,
        urgency: hasRisk ? 'critical' : 'warning',
        urgencyLabel: hasRisk ? 'Cần sửa' : 'Chờ duyệt',
        actionLabel: 'Duyệt',
        contractRecord: r,
        dealCode: r.dealCode,
      });
    }

    if (isGDocsPending) {
      items.push({
        id: `rem-gdocs-${r.id}`,
        category: 'GDOCS_WESIGN',
        categoryLabel: 'Chốt ký WeSign',
        title: `Chốt bản cuối Google Docs đẩy ký WeSign: ${r.title}`,
        subtitle: `${r.brand} · ${r.dealCode || 'HĐ khung'} · Đã thỏa thuận điều khoản`,
        kocName: r.partner,
        legalNote: isPreviouslySigned
          ? `Đã từng ký HSPL (${latestSignedCode || 'HĐ trước'})`
          : `${docs.length} tệp CCCD/ĐKKD đính kèm`,
        isPreviouslySignedProfile: isPreviouslySigned,
        amountValue: fin.netAmount,
        amountSubtext:
          fin.grossAmount > 0
            ? `Tạm ứng đợt 1: ${formatVnd(fin.advanceAmount)}`
            : 'Chốt văn bản trình ký số 2 bên',
        slaDeadline: 'Hôm nay, 18:00',
        picName: r.ownerName,
        urgency: 'warning',
        urgencyLabel: 'Chờ duyệt',
        actionLabel: 'Chốt ký',
        contractRecord: r,
        dealCode: r.dealCode,
      });
    }

    // Cảnh báo rủi ro tài chính / chứng từ trên hợp đồng đang hoạt động
    if (
      !isSigned &&
      (fin.isOverDealBudget ||
        fin.isUnbudgetedSpend ||
        (stage !== 'HDNT' && fin.missingBankInfo) ||
        (!isPreviouslySigned && docs.length === 0 && r.approval === 'IN_REVIEW'))
    ) {
      const reason = fin.isOverDealBudget
        ? `Vượt trần ngân sách Booking (+${formatVnd(fin.grossAmount - fin.dealBudget)})`
        : fin.isUnbudgetedSpend
          ? 'Phát sinh chi phí nhưng hạn mức Booking ghi nhận 0đ'
          : fin.missingBankInfo
            ? 'Thiếu thông tin số tài khoản ngân hàng thụ hưởng'
            : 'KOC ký lần đầu, chưa đính kèm ảnh CCCD/ĐKKD';

      items.push({
        id: `rem-risk-${r.id}`,
        category: 'RISK_ALERT',
        categoryLabel: 'Cảnh báo thanh toán',
        title: `Cảnh báo hồ sơ ${r.partner}: ${reason}`,
        subtitle: `${r.brand} · ${r.dealCode || r.id} · ${r.title}`,
        kocName: r.partner,
        legalNote: reason,
        isPreviouslySignedProfile: isPreviouslySigned,
        amountValue: fin.netAmount,
        amountSubtext: `Gross ${formatVnd(fin.grossAmount)} · Trần ${formatVnd(fin.dealBudget)}`,
        slaDeadline: 'Cần xử lý ngay',
        picName: r.ownerName,
        urgency: 'critical',
        urgencyLabel: 'Cần sửa',
        actionLabel: 'Kiểm tra',
        contractRecord: r,
        dealCode: r.dealCode,
      });
    }
  }

  // 3: Quét Phiếu Tạm ứng / ĐNTT trên Lark chờ Kế toán duyệt hoặc chờ gắn mã Bill UNC
  const slipDealCodesSeen = new Set<string>();
  for (const slip of activeSlips) {
    const status = slip.larkSync.approvalStatus;
    if (status === 'PENDING_FINANCE' || (status === 'APPROVED' && !slip.larkSync.daDiTien)) {
      const isPendingLark = status === 'PENDING_FINANCE';
      const slipTypeLabel =
        slip.requestType === 'ADVANCE' ? 'Phiếu tạm ứng đợt 1' : 'Phiếu ĐNTT quyết toán';
      const firstLine = slip.lineItems[0];
      const dealCode = firstLine?.dealCode || '';
      if (dealCode) slipDealCodesSeen.add(dealCode.toUpperCase());
      const brandName = firstLine?.brandName || 'UpBase';
      const storeName = firstLine?.storeName || slip.month;
      const contractCode =
        firstLine?.contractAppendixCode || firstLine?.masterContractCode || 'Đã đối chiếu';

      items.push({
        id: `rem-slip-${slip.id}`,
        category: 'LARK_SLIP',
        categoryLabel: slipTypeLabel,
        title: isPendingLark
          ? `Duyệt ${slipTypeLabel} trên Lark (${slip.slipCode})`
          : `Cập nhật mã Bill UNC giải ngân cho ${slip.slipCode}`,
        subtitle: `${brandName} · Deal ${dealCode || 'Gộp'} · ${storeName}`,
        kocName: slip.payee.kocStageName || slip.payee.legalEntityName || 'KOC',
        legalNote: `HĐ: ${contractCode} · ${slip.payee.bankName || 'Ngân hàng'}`,
        isPreviouslySignedProfile: true,
        amountValue: slip.totals.netTransferTotal,
        amountSubtext: `Thực chi kỳ này · Tổng Net ${formatVnd(slip.totals.agreedNetTotal)}`,
        slaDeadline: isPendingLark ? 'SLA 24h · Hôm nay' : 'Chờ đi tiền UNC',
        picName: slip.createdBy,
        urgency: isPendingLark ? 'warning' : 'info',
        urgencyLabel: isPendingLark ? 'Chờ duyệt' : 'Đang chạy',
        actionLabel: 'Xử lý phiếu',
        dealCode,
        larkSlip: slip,
      });
    }
  }

  const approvedList =
    typeof window !== 'undefined' ? loadApprovedBookingList(kocs, [], deals) : [];
  for (const it of approvedList) {
    if (!it.bookingOrderCreated || !it.maBooking) continue;
    const upperCode = it.maBooking.trim().toUpperCase();
    if (slipDealCodesSeen.has(upperCode)) continue;

    if (
      it.larkApprovalStatus === 'PENDING_FINANCE' ||
      (it.larkApprovalStatus === 'APPROVED' && !it.daDiTien) ||
      it.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG' ||
      it.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG'
    ) {
      const isAdvance =
        it.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG' ||
        it.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG';
      const isPendingLark =
        it.larkApprovalStatus === 'PENDING_FINANCE' ||
        it.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG';
      const slipCode =
        (isAdvance ? it.larkAdvanceSlipCode : it.larkSlipCode) ||
        `${isAdvance ? 'TU' : 'DNTT'}-${it.maBooking}`;
      const reqAmount = isAdvance
        ? Number(it.soTienTamUngTruoc) || Math.round((Number(it.chiPhiBookingNetCuoi) || 0) * 0.5)
        : Number(it.soTienCanThanhToan) || Number(it.chiPhiBookingNetCuoi) || 0;

      items.push({
        id: `rem-appr-slip-${it.id}`,
        category: 'LARK_SLIP',
        categoryLabel: isAdvance ? 'Phiếu tạm ứng đợt 1' : 'Phiếu ĐNTT quyết toán',
        title: isPendingLark
          ? `Duyệt ${isAdvance ? 'phiếu tạm ứng' : 'phiếu ĐNTT'} trên Lark (${slipCode})`
          : `Cập nhật mã Bill UNC giải ngân cho ${slipCode}`,
        subtitle: `${it.brandName} · Deal ${it.maBooking} · ${it.storeName}`,
        kocName: it.tenKenh || it.idKenh,
        legalNote: `HĐ: ${it.contractAppendixCode || it.masterContractCode || 'Đã đối chiếu'} · ${it.nganHang || 'Ngân hàng'}`,
        isPreviouslySignedProfile: Boolean(it.masterContractStatus === 'ĐÃ_KÝ'),
        amountValue: reqAmount,
        amountSubtext: `Thực chi kỳ này · Tổng Net ${formatVnd(Number(it.chiPhiBookingNetCuoi) || 0)}`,
        slaDeadline: isPendingLark ? 'SLA 24h · Hôm nay' : 'Chờ đi tiền UNC',
        picName: it.nguoiPhuTrach || 'Booking Team',
        urgency: isPendingLark ? 'warning' : 'info',
        urgencyLabel: isPendingLark ? 'Chờ duyệt' : 'Đang chạy',
        actionLabel: 'Xử lý phiếu',
        dealCode: it.maBooking,
      });
    }
  }

  // 4: Quét các Deal đã chi tạm ứng nhưng đang treo chưa quyết toán BBNT
  for (const d of deals.slice(0, 60)) {
    const advanceAmt = Number(d.advanceAmount) || 0;
    const isPaidFull = d.status === 'FINAL_PAID' || d.status === 'COMPLETED';
    if (advanceAmt > 0 && !isPaidFull) {
      const hasLinkedBbnt = data.records.some(
        r =>
          (r.dealId === d.id || (d.dealCode && r.dealCode === d.dealCode)) &&
          documentOfTemplate(r.templateId) === 'BBNT' &&
          r.signing.some(s => s.status === 'COMPLETED'),
      );
      if (!hasLinkedBbnt) {
        const netTotal = Math.max(0, Number(d.totalValue) || 0);
        const remainAmt = Math.max(0, netTotal - advanceAmt);
        const hasVideoAir = Boolean(d.tiktokVideoUrl || d.videoUrl);
        items.push({
          id: `rem-adv-${d.id}`,
          category: 'ADVANCE_SETTLEMENT',
          categoryLabel: 'Tạm ứng treo',
          title: `Đôn đốc BBNT & quyết toán tạm ứng deal ${d.dealCode}`,
          subtitle: `${d.brandName} · ${d.storeName || d.campaignTitle}`,
          kocName: d.kocStageName,
          legalNote: hasVideoAir
            ? 'Đã có link video Air · Chờ ký BBNT để tất toán đợt 2'
            : 'Đã chi tạm ứng đợt 1 · Chưa nghiệm thu BBNT',
          isPreviouslySignedProfile: false,
          amountValue: advanceAmt,
          amountSubtext: `Đã ứng ${formatVnd(advanceAmt)} · Còn lại ${formatVnd(remainAmt)}`,
          slaDeadline: hasVideoAir ? 'Đủ điều kiện quyết toán' : 'Theo dõi công nợ',
          picName: d.bookingPic || d.assignedStaff || 'Booking Team',
          urgency: hasVideoAir ? 'warning' : 'info',
          urgencyLabel: hasVideoAir ? 'Chờ duyệt' : 'Đang chạy',
          actionLabel: 'Tra cứu deal',
          dealCode: d.dealCode,
        });
      }
    }
  }

  const urgencyRank: Record<FinanceReminderItem['urgency'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
    done: 3,
  };

  return items.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
}

export function FinanceReminderInboxView({
  data,
  deals = [],
  kocs = [],
  busy,
  onOpenContractReview,
  onOpenDealLookup,
}: {
  data: ContractBootstrap;
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  busy?: boolean;
  onOpenContractReview: (record: ContractRecord) => void;
  onOpenDealLookup: (dealCode: string, subTab?: 'DEAL_LEDGER' | 'LARK_SLIPS') => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FinanceReminderCategory>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const allReminders = useMemo(
    () => computeFinanceReminderItems({ data, deals, kocs }),
    [data, deals, kocs],
  );

  const searchedReminders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allReminders;
    return allReminders.filter(item =>
      [
        item.title,
        item.subtitle,
        item.kocName,
        item.legalNote,
        item.dealCode || '',
        item.picName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [allReminders, search]);

  const filteredReminders = useMemo(() => {
    if (category === 'ALL') return searchedReminders;
    return searchedReminders.filter(item => item.category === category);
  }, [searchedReminders, category]);

  const stats = useMemo(() => {
    const criticalCount = allReminders.filter(i => i.urgency === 'critical').length;
    const contractReviewItems = allReminders.filter(
      i => i.category === 'CONTRACT_REVIEW' || i.category === 'GDOCS_WESIGN',
    );
    const fastTrackCount = contractReviewItems.filter(i => i.isPreviouslySignedProfile).length;
    const larkSlipCount = allReminders.filter(i => i.category === 'LARK_SLIP').length;
    const advanceAndRiskCount = allReminders.filter(
      i => i.category === 'ADVANCE_SETTLEMENT' || i.category === 'RISK_ALERT',
    ).length;

    return {
      criticalCount,
      contractReviewCount: contractReviewItems.length,
      fastTrackCount,
      larkSlipCount,
      advanceAndRiskCount,
    };
  }, [allReminders]);

  const chipItems: { key: FinanceReminderCategory; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: searchedReminders.length },
    {
      key: 'CONTRACT_REVIEW',
      label: 'Duyệt hợp đồng',
      count: searchedReminders.filter(i => i.category === 'CONTRACT_REVIEW').length,
    },
    {
      key: 'GDOCS_WESIGN',
      label: 'Chốt ký WeSign',
      count: searchedReminders.filter(i => i.category === 'GDOCS_WESIGN').length,
    },
    {
      key: 'LARK_SLIP',
      label: 'Phiếu Lark & UNC',
      count: searchedReminders.filter(i => i.category === 'LARK_SLIP').length,
    },
    {
      key: 'ADVANCE_SETTLEMENT',
      label: 'Tạm ứng treo',
      count: searchedReminders.filter(i => i.category === 'ADVANCE_SETTLEMENT').length,
    },
    {
      key: 'RISK_ALERT',
      label: 'Cảnh báo rủi ro',
      count: searchedReminders.filter(i => i.category === 'RISK_ALERT').length,
    },
  ];

  const handleTriggerAction = (item: FinanceReminderItem) => {
    if (item.contractRecord) {
      onOpenContractReview(item.contractRecord);
      return;
    }
    if (item.category === 'LARK_SLIP') {
      onOpenDealLookup(item.dealCode || '', 'LARK_SLIPS');
      return;
    }
    onOpenDealLookup(item.dealCode || '', 'DEAL_LEDGER');
  };

  const columns: Column<FinanceReminderItem>[] = [
    {
      key: 'task',
      header: 'Đầu việc',
      render: item => (
        <div className="leading-snug space-y-0.5 min-w-[250px]">
          <div className="font-medium text-ink truncate max-w-[400px]">{item.title}</div>
          <div className="text-2xs text-ink-3 truncate max-w-[400px]">
            {item.categoryLabel} · {item.subtitle}
          </div>
        </div>
      ),
    },
    {
      key: 'kocAndLegal',
      header: 'KOC & hồ sơ pháp lý',
      width: 260,
      render: item => (
        <div className="leading-snug space-y-0.5">
          <div className="font-medium text-ink truncate max-w-[250px]">{item.kocName}</div>
          <div className="text-2xs truncate max-w-[250px]">
            {item.isPreviouslySignedProfile ? (
              <span className="text-positive font-medium">{item.legalNote}</span>
            ) : item.category === 'RISK_ALERT' ? (
              <span className="text-critical font-medium">{item.legalNote}</span>
            ) : (
              <span className="text-ink-3">{item.legalNote}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Thực chi Net',
      width: 185,
      align: 'right',
      render: item => (
        <div className="leading-snug space-y-0.5 tabular-nums text-right">
          <div className="font-code font-semibold text-ink">
            {item.amountValue > 0 ? formatVnd(item.amountValue) : '—'}
          </div>
          <div className="text-2xs text-ink-3 truncate max-w-[180px]">{item.amountSubtext}</div>
        </div>
      ),
    },
    {
      key: 'sla',
      header: 'Hạn xử lý',
      width: 165,
      render: item => (
        <div className="leading-snug space-y-0.5">
          <div
            className={`text-xs font-medium ${
              item.urgency === 'critical' ? 'text-critical' : 'text-ink'
            }`}
          >
            {item.slaDeadline}
          </div>
          <div className="text-2xs text-ink-3">PIC: {item.picName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 130,
      render: item => {
        const toneMap: Record<FinanceReminderItem['urgency'], StatusTone> = {
          critical: 'critical',
          warning: 'warning',
          info: 'info',
          done: 'positive',
        };
        return <Status tone={toneMap[item.urgency]}>{item.urgencyLabel}</Status>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: 115,
      align: 'right',
      render: item => (
        <div
          className="inline-flex items-center justify-end"
          onClick={e => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant={item.urgency === 'critical' || item.category === 'CONTRACT_REVIEW' ? 'primary' : 'secondary'}
            disabled={busy}
            onClick={() => handleTriggerAction(item)}
          >
            {item.actionLabel}
          </Button>
        </div>
      ),
    },
  ];

  const pagedRows = filteredReminders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <Panel flush>
        <div className="p-4 border-b border-line">
          <FilterBar
            search={{
              value: search,
              onChange: v => {
                setSearch(v);
                setPage(1);
              },
              placeholder: 'Tìm theo mã deal (BO...), tên KOC, nhãn hàng, mã phiếu Lark...',
            }}
            chips={
              <Chips
                items={chipItems}
                value={category}
                onChange={v => {
                  setCategory(v);
                  setPage(1);
                }}
              />
            }
            resultCount={search.trim() ? filteredReminders.length : undefined}
          />
        </div>

        <DataTable
          columns={columns}
          rows={pagedRows}
          rowKey={r => r.id}
          onRowClick={handleTriggerAction}
          empty={<EmptyState title="Không có đầu việc nhắc Kế toán nào khớp bộ lọc" />}
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredReminders.length}
          onPageChange={setPage}
        />
      </Panel>
    </div>
  );
}
