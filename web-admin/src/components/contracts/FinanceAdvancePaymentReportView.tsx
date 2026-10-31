'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
} from 'lucide-react';
import type {
  BookingDealItem,
  DealRightsTermItem,
  DealSowJobItem,
  KocItem,
  LegalDocAttachment,
} from '../../lib/types';
import type { ContractRecord } from '../../lib/contracts/types';
import {
  evaluateLegalProfileSigningHistory,
  resolveContractLegalAttachments,
  type LegalProfileSigningHistorySummary,
} from '../../lib/contracts/legalProfileHistory';
import { numberToVietnameseWords } from '../../lib/contracts/contractRules';
import { formatVnd } from '../../lib/format';
import { documentOfTemplate } from '../../lib/planDealLink';
import {
  hydrateApprovedBookingListFromServer,
  loadApprovedBookingList,
  saveApprovedBookingList,
  type ApprovedBookingListItem,
} from '../../lib/approvedBookingList';
import {
  loadLarkPaymentSlipsFromStorage,
  saveLarkPaymentSlipsToStorage,
  type LarkPaymentRequestSlip,
} from '../../lib/larkPaymentRequestEngine';
import { getKocLegalProfiles, LEGAL_TYPE_LABEL } from '../koc/kocUtils';
import { maskSensitiveNumber } from './ContractApprovalPortalView';
import {
  LegalAttachmentsPanel,
  LegalProfileSigningHistoryBanner,
} from './LegalAttachmentsPanel';
import {
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Pagination,
  Panel,
  Person,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { Column, StatusTone } from '../ui';

type ReportSubTab = 'DEAL_LEDGER' | 'LARK_SLIPS' | 'BRAND_SUMMARY';
type DealModalTab = 'DOSSIER_AND_PAYMENT' | 'LEGAL_ID_DOCS';
type SlipModalTab = 'SLIP_DOSSIER' | 'SLIP_LEGAL_DOCS';

type DealLedgerFilter =
  | 'ALL'
  | 'FULL_DOSSIER'
  | 'ADVANCE_UNSETTLED'
  | 'READY_SETTLEMENT'
  | 'IN_LARK_APPROVAL'
  | 'PAID_COMPLETED'
  | 'UNLOCK_REQUESTED';

type SlipFilter =
  | 'ALL'
  | 'ADVANCE'
  | 'SETTLEMENT'
  | 'PENDING_LARK'
  | 'APPROVED_LARK'
  | 'PAID_UNC'
  | 'REJECTED_LARK';

export interface FinanceDealLedgerRow {
  id: string;
  dealCode: string;
  brandName: string;
  storeName: string;
  productName: string;
  picName: string;
  leaderName: string;
  cooperationType: string;
  videoCategory: string;
  month: string;
  lockedAcceptanceMonth: string;
  lockDate: string;
  isDataLocked: boolean;
  unlockRequestBatch: NonNullable<ApprovedBookingListItem['unlockRequestBatch']>;
  unlockRequestReason: string;
  kocId?: string;
  kocName: string;
  kocChannelId: string;
  legalProfileId?: string;
  legalProfileCode: string;
  legalTypeLabel: string;
  taxCodeOrCccd: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  masterContractCode: string;
  masterContractSigned: boolean;
  masterContractGoogleDocsUrl?: string;
  masterContractSignedUrl?: string;
  sowCode: string;
  sowSigned: boolean;
  sowGoogleDocsUrl?: string;
  sowSignedUrl?: string;
  bbntCode: string;
  bbntSigned: boolean;
  bbntGoogleDocsUrl?: string;
  bbntSignedUrl?: string;
  invoiceNumber: string;
  frameworkRecord?: ContractRecord;
  sowRecords: ContractRecord[];
  bbntRecords: ContractRecord[];
  allLinkedRecords: ContractRecord[];
  legalAttachments: LegalDocAttachment[];
  signingHistory?: LegalProfileSigningHistorySummary;
  linkAir: string;
  actualAirDate: string;
  plannedAirDate: string;
  sparkAdsCode: string;
  views14d: number;
  orders14d: number;
  gmv14d: number;
  dealJobs: DealSowJobItem[];
  addonServices: DealRightsTermItem[];
  sowNetAmount: number;
  droppedDeductionAmount: number;
  effectiveNetAmount: number;
  taxAmount: number;
  grossAmount: number;
  advanceAmount: number;
  advanceSlipCode: string;
  advanceLarkInstanceCode: string;
  advanceStatusLabel: string;
  advanceStatusTone: StatusTone;
  remainingNetToPay: number;
  settlementSlipCode: string;
  settlementLarkInstanceCode: string;
  settlementStatusLabel: string;
  settlementStatusTone: StatusTone;
  daDiTien: boolean;
  uncBillCode: string;
  acceptanceStageLabel: string;
  isAcceptedAll: boolean;
  transferNote: string;
  rawApprovedItem?: ApprovedBookingListItem;
  linkedDeal?: BookingDealItem;
}

interface BrandSummaryRow {
  brandName: string;
  dealsCount: number;
  sowNetTotal: number;
  taxTotal: number;
  grossTotal: number;
  advanceTotal: number;
  unsettledAdvanceTotal: number;
  unsettledAdvanceDealsCount: number;
  settledPaidTotal: number;
  remainingToPayTotal: number;
}

function normalizeHandle(raw?: string): string {
  return (raw || '').trim().replace(/^@+/, '').toLowerCase();
}

export function FinanceAdvancePaymentReportView({
  deals = [],
  kocs = [],
  contractRecords = [],
  isFinanceActor = true,
  initialSearch = '',
  initialSubTab = 'LARK_SLIPS',
  onOpenContractRecord,
  onQuickViewRecord,
  onNotify,
}: {
  deals?: BookingDealItem[];
  kocs?: KocItem[];
  contractRecords?: ContractRecord[];
  isFinanceActor?: boolean;
  initialSearch?: string;
  initialSubTab?: ReportSubTab;
  onOpenContractRecord?: (id: string) => void;
  onQuickViewRecord?: (record: ContractRecord) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}) {
  const [subTab, setSubTab] = useState<ReportSubTab>(initialSubTab);
  const [dealFilter, setDealFilter] = useState<DealLedgerFilter>('ALL');
  const [slipFilter, setSlipFilter] = useState<SlipFilter>('ALL');
  const [search, setSearch] = useState(initialSearch);
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);
  const [prevInitialSubTab, setPrevInitialSubTab] = useState(initialSubTab);
  if (initialSearch !== prevInitialSearch || initialSubTab !== prevInitialSubTab) {
    setPrevInitialSearch(initialSearch);
    setPrevInitialSubTab(initialSubTab);
    setSearch(initialSearch);
    setSubTab(initialSubTab);
    setDealFilter('ALL');
  }
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [page, setPage] = useState(1);
  const [slips, setSlips] = useState<LarkPaymentRequestSlip[]>([]);
  const [approvedItems, setApprovedItems] = useState<ApprovedBookingListItem[]>([]);
  const [loadingSync, setLoadingSync] = useState(false);

  const [selectedDealRow, setSelectedDealRow] = useState<FinanceDealLedgerRow | null>(null);
  const [dealModalTab, setDealModalTab] = useState<DealModalTab>('DOSSIER_AND_PAYMENT');
  const [selectedSlip, setSelectedSlip] = useState<LarkPaymentRequestSlip | null>(null);
  const [slipModalTab, setSlipModalTab] = useState<SlipModalTab>('SLIP_DOSSIER');
  const [selectedSlipDealCode, setSelectedSlipDealCode] = useState<string>('');
  const [slipUncInput, setSlipUncInput] = useState<string>('');
  const [slipActionBusy, setSlipActionBusy] = useState<boolean>(false);
  const [rejectSlipTarget, setRejectSlipTarget] = useState<LarkPaymentRequestSlip | null>(null);

  const openDealModal = useCallback(
    (row: FinanceDealLedgerRow, defaultTab: DealModalTab = 'DOSSIER_AND_PAYMENT') => {
      setSelectedDealRow(row);
      setDealModalTab(defaultTab);
    },
    [],
  );

  const openSlipModal = useCallback(
    (
      slip: LarkPaymentRequestSlip,
      defaultTab: SlipModalTab = 'SLIP_DOSSIER',
      preferredDealCode?: string,
    ) => {
      setSelectedSlip(slip);
      setSlipModalTab(defaultTab);
      setSelectedSlipDealCode(
        preferredDealCode || slip.lineItems[0]?.dealCode || '',
      );
      setSlipUncInput(slip.larkSync.uncBillCode || `UNC-VCB-${slip.slipCode}`);
    },
    [],
  );

  const reloadData = useCallback(async () => {
    setLoadingSync(true);
    try {
      const loadedApproved = loadApprovedBookingList(kocs, [], deals);
      setApprovedItems(loadedApproved);
      void hydrateApprovedBookingListFromServer(kocs, [], deals).then((serverList) => {
        if (Array.isArray(serverList) && serverList.length > 0) {
          setApprovedItems(serverList);
        }
      });

      const localSlips = loadLarkPaymentSlipsFromStorage();
      setSlips(localSlips);

      const res = await fetch('/api/integrations/larkbase/payment-requests');
      if (res.ok) {
        const json = (await res.json()) as { slips?: LarkPaymentRequestSlip[] };
        if (Array.isArray(json.slips) && json.slips.length > 0) {
          const mergedMap = new Map<string, LarkPaymentRequestSlip>();
          localSlips.forEach((s) => mergedMap.set(s.id, s));
          json.slips.forEach((s) => mergedMap.set(s.id, s));
          const merged = Array.from(mergedMap.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
          setSlips(merged);
          saveLarkPaymentSlipsToStorage(merged);
        }
      }
    } catch {
      // Fallback đọc từ bộ nhớ trình duyệt khi chạy độc lập
    } finally {
      setLoadingSync(false);
    }
  }, [kocs, deals]);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  // Index O(1) cho KOC, Deal và ContractRecord theo RULE-PERF-01
  const kocByIdAndHandle = useMemo(() => {
    const byId = new Map<string, KocItem>();
    const byHandle = new Map<string, KocItem>();
    for (const k of kocs) {
      byId.set(k.id, k);
      const h = normalizeHandle(k.channelId);
      if (h) byHandle.set(h, k);
    }
    return { byId, byHandle };
  }, [kocs]);

  const dealByCodeAndId = useMemo(() => {
    const byCode = new Map<string, BookingDealItem>();
    const byId = new Map<string, BookingDealItem>();
    for (const d of deals) {
      byId.set(d.id, d);
      if (d.dealCode) {
        byCode.set(d.dealCode.trim().toUpperCase(), d);
      }
    }
    return { byCode, byId };
  }, [deals]);

  const contractsIndex = useMemo(() => {
    const byDealCode = new Map<string, ContractRecord[]>();
    const hdntByKocId = new Map<string, ContractRecord>();
    const hdntByPartner = new Map<string, ContractRecord>();
    for (const rec of contractRecords) {
      if (rec.dealCode) {
        const key = rec.dealCode.trim().toUpperCase();
        const arr = byDealCode.get(key) || [];
        arr.push(rec);
        byDealCode.set(key, arr);
      }
      if (documentOfTemplate(rec.templateId) === 'HDNT') {
        const isSigned = rec.signing.some((s) => s.status === 'COMPLETED');
        if (rec.kocId) {
          const prev = hdntByKocId.get(rec.kocId);
          if (!prev || isSigned) hdntByKocId.set(rec.kocId, rec);
        }
        const partnerKey = rec.partner.trim().toLowerCase();
        if (partnerKey) {
          const prev = hdntByPartner.get(partnerKey);
          if (!prev || isSigned) hdntByPartner.set(partnerKey, rec);
        }
      }
    }
    return { byDealCode, hdntByKocId, hdntByPartner };
  }, [contractRecords]);

  // Index phiếu Tạm ứng & Tất toán theo mã Deal (BO...)
  const slipsByDealCode = useMemo(() => {
    const advMap = new Map<string, LarkPaymentRequestSlip>();
    const setMap = new Map<string, LarkPaymentRequestSlip>();
    for (const s of slips) {
      for (const line of s.lineItems) {
        const code = (line.dealCode || '').toUpperCase();
        if (!code) continue;
        if (s.requestType === 'ADVANCE') {
          if (!advMap.has(code)) advMap.set(code, s);
        } else {
          if (!setMap.has(code)) setMap.set(code, s);
        }
      }
    }
    return { advMap, setMap };
  }, [slips]);

  // Xây dựng sổ tra cứu Deal tổng hợp
  const dealLedgerRows = useMemo<FinanceDealLedgerRow[]>(() => {
    const seenDealCodes = new Set<string>();
    const mergedSourceItems: {
      approvedItem?: ApprovedBookingListItem;
      dealItem?: BookingDealItem;
      dealCode: string;
    }[] = [];

    for (const it of approvedItems) {
      if (!it.bookingOrderCreated || !it.maBooking) continue;
      const code = it.maBooking.trim();
      const upper = code.toUpperCase();
      seenDealCodes.add(upper);
      const linkedDeal =
        (it.linkedDealId ? dealByCodeAndId.byId.get(it.linkedDealId) : undefined) ||
        dealByCodeAndId.byCode.get(upper);
      mergedSourceItems.push({ approvedItem: it, dealItem: linkedDeal, dealCode: code });
    }

    for (const d of deals) {
      const code = (d.dealCode || '').trim();
      if (!code) continue;
      const upper = code.toUpperCase();
      if (seenDealCodes.has(upper)) continue;
      seenDealCodes.add(upper);
      mergedSourceItems.push({ dealItem: d, dealCode: code });
    }

    return mergedSourceItems.map(({ approvedItem: it, dealItem: d, dealCode }) => {
      const upperDealCode = dealCode.toUpperCase();
      const koc =
        (it?.kocId ? kocByIdAndHandle.byId.get(it.kocId) : undefined) ||
        (d?.kocId ? kocByIdAndHandle.byId.get(d.kocId) : undefined) ||
        kocByIdAndHandle.byHandle.get(normalizeHandle(it?.idKenh || d?.kocChannelId));

      const legalProfiles = koc ? getKocLegalProfiles(koc) : [];
      const activeLegalProfile =
        (d?.legalProfileId
          ? legalProfiles.find((p) => p.id === d.legalProfileId)
          : undefined) ||
        legalProfiles.find((p) => p.isDefault) ||
        legalProfiles[0];

      const legalTypeLabel = activeLegalProfile
        ? LEGAL_TYPE_LABEL[activeLegalProfile.legalType]
        : it?.loaiTaiKhoanThanhToan?.includes('Doanh nghiệp')
          ? 'Công ty'
          : it?.loaiTaiKhoanThanhToan?.includes('HKD')
            ? 'Hộ kinh doanh'
            : 'Cá nhân';

      const taxCodeOrCccd =
        activeLegalProfile?.taxCode ||
        activeLegalProfile?.cccd ||
        it?.soCccd ||
        koc?.taxCode ||
        koc?.cccd ||
        '';

      const bankName =
        activeLegalProfile?.bankName || it?.nganHang || koc?.bankName || '';
      const bankAccount =
        activeLegalProfile?.bankAccountNumber ||
        activeLegalProfile?.bankAccount ||
        it?.soTaiKhoan ||
        koc?.bankAccount ||
        '';
      const bankHolder =
        activeLegalProfile?.bankHolderName ||
        activeLegalProfile?.holderName ||
        it?.tenTaiKhoanNganHang ||
        koc?.realName ||
        it?.tenKenh ||
        d?.kocStageName ||
        '';

      const directDealContracts = contractsIndex.byDealCode.get(upperDealCode) || [];
      const sowRecords = directDealContracts.filter(
        (rec) => documentOfTemplate(rec.templateId) === 'SOW',
      );
      const bbntRecords = directDealContracts.filter(
        (rec) => documentOfTemplate(rec.templateId) === 'BBNT',
      );
      const frameworkFromDeal = directDealContracts.find(
        (rec) => documentOfTemplate(rec.templateId) === 'HDNT',
      );
      const frameworkRecord =
        frameworkFromDeal ||
        (koc?.id ? contractsIndex.hdntByKocId.get(koc.id) : undefined) ||
        contractsIndex.hdntByPartner.get(
          (it?.tenKenh || d?.kocStageName || '').trim().toLowerCase(),
        );

      const allLinkedRecords: ContractRecord[] = [];
      if (frameworkRecord) allLinkedRecords.push(frameworkRecord);
      for (const sRec of sowRecords) {
        if (!allLinkedRecords.some((x) => x.id === sRec.id)) allLinkedRecords.push(sRec);
      }
      for (const bRec of bbntRecords) {
        if (!allLinkedRecords.some((x) => x.id === bRec.id)) allLinkedRecords.push(bRec);
      }

      const primaryRecordForHistory =
        sowRecords[0] || bbntRecords[0] || frameworkRecord;

      const legalAttachments = primaryRecordForHistory
        ? resolveContractLegalAttachments(primaryRecordForHistory, deals, kocs, contractRecords)
        : activeLegalProfile?.legalAttachments || [];

      const signingHistory = primaryRecordForHistory
        ? evaluateLegalProfileSigningHistory(
            primaryRecordForHistory,
            contractRecords,
            deals,
            kocs,
          )
        : undefined;

      const advSlip = slipsByDealCode.advMap.get(upperDealCode);
      const setSlip = slipsByDealCode.setMap.get(upperDealCode);

      const sowNetAmount = Math.max(
        0,
        Math.round(it?.chiPhiBookingNetCuoi || d?.totalValue || 0),
      );
      const droppedDeductionAmount = Math.max(
        0,
        Math.round(it?.khauTruHangMucHuy || 0),
      );
      const effectiveNetAmount = Math.max(0, sowNetAmount - droppedDeductionAmount);

      const advanceFromSlip = advSlip
        ? advSlip.lineItems.find(
            (l) => l.dealCode.toUpperCase() === upperDealCode,
          )?.netTransferAmount || advSlip.totals.netTransferTotal
        : 0;
      const advanceAmount = Math.max(
        Math.round(it?.soTienTamUngTruoc || d?.advanceAmount || 0),
        Math.round(advanceFromSlip || 0),
      );

      const grossAmount = Math.max(
        effectiveNetAmount,
        Math.round(it?.chiPhiGrossKemThue || effectiveNetAmount),
      );
      const taxAmount = Math.max(
        0,
        Math.round(grossAmount - effectiveNetAmount),
      );

      const remainingNetToPay = Math.max(0, effectiveNetAmount - advanceAmount);

      let advanceStatusLabel = 'Không tạm ứng';
      let advanceStatusTone: StatusTone = 'neutral';
      if (advanceAmount > 0 || advSlip || it?.larkAdvanceSlipCode) {
        const advSt = advSlip?.larkSync.approvalStatus;
        if (advSt === 'PAID' || it?.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG') {
          advanceStatusLabel = 'Đã chi tạm ứng';
          advanceStatusTone = 'positive';
        } else if (advSt === 'APPROVED' || it?.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG') {
          advanceStatusLabel = 'Đã duyệt Lark';
          advanceStatusTone = 'info';
        } else if (advSt === 'REJECTED' || it?.larkAdvanceStatus === 'TỪ_CHỐI_TẠM_ỨNG') {
          advanceStatusLabel = 'Từ chối';
          advanceStatusTone = 'critical';
        } else {
          advanceStatusLabel = 'Đang duyệt Lark';
          advanceStatusTone = 'warning';
        }
      }

      const isAcceptedAll =
        it?.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' ||
        d?.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' ||
        bbntRecords.some((r) => r.signing.some((s) => s.status === 'COMPLETED'));

      const daDiTien = Boolean(
        it?.daDiTien ||
          setSlip?.larkSync.daDiTien ||
          setSlip?.larkSync.approvalStatus === 'PAID' ||
          it?.trangThaiPhieuThanhToan === 'Đã thanh toán',
      );
      const uncBillCode =
        it?.uncBillCode || setSlip?.larkSync.uncBillCode || '';

      let settlementStatusLabel = 'Nháp';
      let settlementStatusTone: StatusTone = 'neutral';
      if (daDiTien) {
        settlementStatusLabel = 'Hoàn tất';
        settlementStatusTone = 'positive';
      } else if (
        setSlip?.larkSync.approvalStatus === 'REJECTED' ||
        it?.larkApprovalStatus === 'REJECTED'
      ) {
        settlementStatusLabel = 'Cần sửa';
        settlementStatusTone = 'critical';
      } else if (
        setSlip?.larkSync.approvalStatus === 'APPROVED' ||
        it?.larkApprovalStatus === 'APPROVED'
      ) {
        settlementStatusLabel = 'Đã duyệt';
        settlementStatusTone = 'positive';
      } else if (
        setSlip ||
        it?.trangThaiPhieuThanhToan === 'Đã lập ĐNTT' ||
        (it?.larkApprovalStatus && it.larkApprovalStatus !== 'CHƯA_TẠO_LUỒNG')
      ) {
        settlementStatusLabel = 'Chờ duyệt';
        settlementStatusTone = 'warning';
      } else if (
        isAcceptedAll ||
        it?.trangThaiPhieuThanhToan === 'Đủ điều kiện ĐNTT' ||
        advanceAmount > 0
      ) {
        settlementStatusLabel = 'Đang chạy';
        settlementStatusTone = 'info';
      }

      const acceptanceStageLabel =
        it?.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' || isAcceptedAll
          ? 'Đã nghiệm thu đủ'
          : it?.sequentialAcceptanceStage === '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC'
            ? 'Đã nghiệm thu video'
            : 'Chờ nghiệm thu';

      const masterContractCode =
        frameworkRecord?.contractSystem?.contractCode ||
        it?.masterContractCode ||
        d?.masterContractCode ||
        activeLegalProfile?.frameworkContractCode ||
        (frameworkRecord ? frameworkRecord.title : '—');
      const masterContractSigned = Boolean(
        frameworkRecord?.signing.some((s) => s.status === 'COMPLETED') ||
          it?.masterContractStatus === 'ĐÃ_KÝ' ||
          d?.masterContractStatus === 'ĐÃ_KÝ' ||
          activeLegalProfile?.frameworkContractStatus === 'ĐÃ_KÝ',
      );

      const primarySow = sowRecords[0];
      const sowCode =
        primarySow?.contractSystem?.contractCode ||
        it?.contractAppendixCode ||
        d?.contractAppendixCode ||
        `PL-${dealCode}-01`;
      const sowSigned = Boolean(
        sowRecords.some((r) => r.signing.some((s) => s.status === 'COMPLETED')) ||
          it?.contractAppendixStatus === 'ĐÃ_KÝ' ||
          d?.contractAppendixStatus === 'ĐÃ_KÝ',
      );

      const primaryBbnt = bbntRecords[0];
      const bbntCode =
        primaryBbnt?.contractSystem?.contractCode ||
        it?.bbntCode ||
        d?.bbntCode ||
        '—';
      const bbntSigned = Boolean(
        bbntRecords.some((r) => r.signing.some((s) => s.status === 'COMPLETED')) ||
          it?.bbntStatus === 'ĐÃ_KÝ' ||
          d?.bbntStatus === 'ĐÃ_KÝ',
      );

      return {
        id: it?.id || d?.id || dealCode,
        dealCode,
        brandName: it?.brandName || d?.brandName || 'Chưa gắn nhãn hàng',
        storeName: it?.storeName || d?.storeName || it?.brandName || d?.brandName || '—',
        productName: it?.sanPham || d?.productName || '—',
        picName: it?.nguoiPhuTrach || d?.picName || '—',
        leaderName: it?.leaderName || '—',
        cooperationType: it?.hinhThucHopTac || 'Booking',
        videoCategory: it?.phanLoaiVideo || d?.bookingFormat || 'Video',
        month: it?.thangPlan || '2026/10',
        lockedAcceptanceMonth:
          it?.thangNghiemThuChot || it?.thangPlan || '2026/10',
        lockDate: it?.ngayKhoaData || '—',
        isDataLocked: Boolean(it?.chotData),
        unlockRequestBatch: it?.unlockRequestBatch || 'NONE',
        unlockRequestReason: it?.unlockRequestReason || '',
        kocId: koc?.id || it?.kocId || d?.kocId,
        kocName: it?.tenKenh || d?.kocStageName || koc?.stageName || it?.idKenh || '—',
        kocChannelId: it?.idKenh || d?.kocChannelId || koc?.channelId || '—',
        legalProfileId: activeLegalProfile?.id || d?.legalProfileId,
        legalProfileCode: activeLegalProfile?.profileCode || 'HSPL-01',
        legalTypeLabel,
        taxCodeOrCccd,
        bankName,
        bankAccount,
        bankHolder,
        masterContractCode,
        masterContractSigned,
        masterContractGoogleDocsUrl:
          frameworkRecord?.googleDocsUrl ||
          frameworkRecord?.contractSystem?.googleDocsUrl ||
          it?.masterContractGoogleDocsUrl ||
          d?.masterContractGoogleDocsUrl,
        masterContractSignedUrl:
          frameworkRecord?.signing.at(-1)?.signedFileUrl ||
          frameworkRecord?.contractSystem?.signedFileUrl ||
          it?.masterContractSignedUrl ||
          d?.masterContractSignedUrl,
        sowCode,
        sowSigned,
        sowGoogleDocsUrl:
          primarySow?.googleDocsUrl ||
          primarySow?.contractSystem?.googleDocsUrl ||
          it?.contractAppendixGoogleDocsUrl ||
          d?.contractAppendixGoogleDocsUrl,
        sowSignedUrl:
          primarySow?.signing.at(-1)?.signedFileUrl ||
          primarySow?.contractSystem?.signedFileUrl ||
          it?.contractAppendixSignedUrl ||
          d?.contractAppendixSignedUrl,
        bbntCode,
        bbntSigned,
        bbntGoogleDocsUrl:
          primaryBbnt?.googleDocsUrl ||
          primaryBbnt?.contractSystem?.googleDocsUrl ||
          it?.bbntGoogleDocsUrl ||
          d?.bbntGoogleDocsUrl,
        bbntSignedUrl:
          primaryBbnt?.signing.at(-1)?.signedFileUrl ||
          primaryBbnt?.contractSystem?.signedFileUrl ||
          it?.bbntSignedUrl ||
          d?.bbntSignedUrl,
        invoiceNumber:
          setSlip?.lineItems.find(
            (l) => l.dealCode.toUpperCase() === upperDealCode,
          )?.invoiceNumber ||
          it?.draftInvoiceCode ||
          '—',
        frameworkRecord,
        sowRecords,
        bbntRecords,
        allLinkedRecords,
        legalAttachments,
        signingHistory,
        linkAir: it?.linkAir || d?.videoUrl || d?.tiktokVideoUrl || '',
        actualAirDate: it?.actualAirDate || d?.postedDate || '',
        plannedAirDate: it?.plannedAirDate || d?.deadlinePost || '',
        sparkAdsCode: it?.sparkAdsCode || d?.sparkAdsCode || '',
        views14d: it?.views14d || 0,
        orders14d: it?.orders14d || 0,
        gmv14d: it?.gmv14d || 0,
        dealJobs: it?.dealJobs || d?.dealJobs || [],
        addonServices: it?.addonServices || d?.rightsTerms || [],
        sowNetAmount,
        droppedDeductionAmount,
        effectiveNetAmount,
        taxAmount,
        grossAmount,
        advanceAmount,
        advanceSlipCode:
          it?.larkAdvanceSlipCode || advSlip?.slipCode || '—',
        advanceLarkInstanceCode:
          it?.larkAdvanceInstanceCode ||
          advSlip?.larkSync.approvalInstanceCode ||
          '—',
        advanceStatusLabel,
        advanceStatusTone,
        remainingNetToPay,
        settlementSlipCode:
          it?.larkSlipCode || setSlip?.slipCode || '—',
        settlementLarkInstanceCode:
          it?.larkApprovalInstanceCode ||
          setSlip?.larkSync.approvalInstanceCode ||
          '—',
        settlementStatusLabel,
        settlementStatusTone,
        daDiTien,
        uncBillCode,
        acceptanceStageLabel,
        isAcceptedAll,
        transferNote:
          it?.noiDungChuyenKhoan ||
          `${dealCode} ${it?.brandName || d?.brandName || ''} TT Booking ${it?.idKenh || d?.kocChannelId || ''}`.trim(),
        rawApprovedItem: it,
        linkedDeal: d,
      };
    });
  }, [
    approvedItems,
    deals,
    kocByIdAndHandle,
    dealByCodeAndId,
    contractsIndex,
    contractRecords,
    slipsByDealCode,
    kocs,
  ]);

  // Index O(1) tra cứu dòng Deal từ mã Deal (RULE-PERF-01 & RULE-SYNC-01)
  const dealRowByCode = useMemo(() => {
    const map = new Map<string, FinanceDealLedgerRow>();
    for (const r of dealLedgerRows) {
      map.set(r.dealCode.toUpperCase(), r);
    }
    return map;
  }, [dealLedgerRows]);

  // Hợp nhất phiếu thanh toán từ kho lưu trữ + tổng hợp tự động từ các Deal đã gắn mã phiếu (RULE-SYNC-01)
  const allSlips = useMemo<LarkPaymentRequestSlip[]>(() => {
    const bySlipCode = new Map<string, LarkPaymentRequestSlip>();
    for (const s of slips) {
      bySlipCode.set(s.slipCode.toUpperCase(), s);
    }

    const synthesizeSlip = (
      r: FinanceDealLedgerRow,
      requestType: 'ADVANCE' | 'SETTLEMENT',
    ): LarkPaymentRequestSlip => {
      const isAdv = requestType === 'ADVANCE';
      const slipCode = isAdv ? r.advanceSlipCode : r.settlementSlipCode;
      const instanceCode = isAdv
        ? r.advanceLarkInstanceCode !== '—'
          ? r.advanceLarkInstanceCode
          : `LARK-TU-${r.dealCode}`
        : r.settlementLarkInstanceCode !== '—'
          ? r.settlementLarkInstanceCode
          : `LARK-DNTT-${r.dealCode}`;

      const subjectKind =
        r.legalTypeLabel === 'Công ty'
          ? 'COM'
          : r.legalTypeLabel === 'Hộ kinh doanh'
            ? 'HKD'
            : 'IND';

      const netTransfer = isAdv ? r.advanceAmount : r.remainingNetToPay;
      const pitAmount = subjectKind === 'IND' ? r.taxAmount : 0;
      const vatAmount = subjectKind !== 'IND' ? r.taxAmount : 0;
      const grossForSlip = isAdv
        ? subjectKind === 'IND' && netTransfer >= 2_000_000
          ? Math.round(netTransfer / 0.9)
          : netTransfer
        : r.grossAmount;

      let approvalStatus: LarkPaymentRequestSlip['larkSync']['approvalStatus'] =
        'PENDING_FINANCE';
      if (isAdv) {
        if (r.advanceStatusLabel === 'Đã chi tạm ứng') approvalStatus = 'PAID';
        else if (r.advanceStatusLabel === 'Đã duyệt Lark') approvalStatus = 'APPROVED';
        else if (r.advanceStatusLabel === 'Từ chối') approvalStatus = 'REJECTED';
        else approvalStatus = 'PENDING_FINANCE';
      } else {
        if (r.daDiTien) approvalStatus = 'PAID';
        else if (r.settlementStatusLabel === 'Cần sửa') approvalStatus = 'REJECTED';
        else if (r.settlementStatusLabel === 'Đã duyệt') approvalStatus = 'APPROVED';
        else approvalStatus = 'PENDING_FINANCE';
      }

      const isContractMandatory =
        subjectKind !== 'IND' || r.advanceAmount >= 2_000_000 || r.grossAmount >= 10_000_000;
      const isBbntMandatory =
        subjectKind !== 'IND' || r.grossAmount >= 20_000_000 || r.droppedDeductionAmount > 0;

      return {
        id: `SYNTH-${requestType}-${r.dealCode}`,
        slipCode,
        requestType,
        requestTypeLabel: isAdv
          ? 'Phiếu tạm ứng (Đợt 1)'
          : 'Đề nghị thanh toán tất toán (Đợt 2 / 100%)',
        larkPaymentCategory: isAdv
          ? 'Tạm ứng trước Booking KOC'
          : 'Thanh toán Booking KOC',
        transferTitle: r.transferNote,
        month: r.lockedAcceptanceMonth || r.month,
        createdAt: r.rawApprovedItem?.updatedAt || new Date().toISOString(),
        createdBy: r.picName,
        note: `${isAdv ? 'Tạm ứng đợt 1' : 'Quyết toán'} Deal ${r.dealCode} (${r.kocName} · ${r.brandName})`,
        payee: {
          subjectKind,
          subjectLabel: r.legalTypeLabel,
          kocId: r.kocId || r.id,
          kocStageName: r.kocName,
          kocChannelId: r.kocChannelId,
          legalEntityName: r.bankHolder || r.kocName,
          legalId: r.taxCodeOrCccd,
          hasIdCardScan: r.legalAttachments.length > 0,
          bankName: r.bankName,
          bankAccount: r.bankAccount,
          bankHolder: r.bankHolder,
          isMcnOrAlternatePayee: false,
        },
        approvalRoute: {
          hasBookingLeader: r.leaderName !== '—' && Boolean(r.leaderName),
          bookingLeaderName: r.leaderName !== '—' ? r.leaderName : undefined,
          marketingDirectorName: 'Đặng Thị Yến Nhi',
          financeApproverName: 'Phòng Tài chính - Kế toán (TCKT)',
          routeSummary:
            r.leaderName !== '—' && r.leaderName
              ? `PIC (${r.picName}) → Leader (${r.leaderName}) → GĐ MKT (Đặng Thị Yến Nhi) → Kế toán (TCKT)`
              : `PIC (${r.picName}) → GĐ MKT (Đặng Thị Yến Nhi) → Kế toán (TCKT)`,
        },
        lineItems: [
          {
            dealId: r.id,
            dealCode: r.dealCode,
            brandName: r.brandName,
            storeName: r.storeName,
            productName: r.productName,
            salaryGrade: r.rawApprovedItem?.klGrade || 'KL3',
            bookingPic: r.picName,
            bookingLeader: r.leaderName !== '—' ? r.leaderName : undefined,
            approverDirector: 'Đặng Thị Yến Nhi',
            requestType,
            larkPaymentCategory: isAdv
              ? 'Tạm ứng trước Booking KOC'
              : 'Thanh toán Booking KOC',
            transferTitle: r.transferNote,
            masterContractCode: r.masterContractCode,
            contractAppendixCode: r.sowCode,
            agreedNetAmount: r.sowNetAmount,
            droppedDeductionAmount: r.droppedDeductionAmount,
            effectiveSettledNetAmount: r.effectiveNetAmount,
            advancePaidAmount: isAdv ? 0 : r.advanceAmount,
            requestBaseNetAmount: netTransfer,
            vatRate: vatAmount > 0 && r.effectiveNetAmount > 0 ? 0.08 : 0,
            vatAmount,
            pitDeductionRate: pitAmount > 0 ? 0.1 : 0,
            pitDeductionAmount: pitAmount,
            grossContractAmount: grossForSlip,
            netTransferAmount: netTransfer,
            linkAir: r.linkAir,
            postedDate: r.actualAirDate || r.plannedAirDate,
            sparkAdsCode: r.sparkAdsCode,
            contractUrl: r.sowSignedUrl || r.masterContractSignedUrl || '',
            bbntUrl: r.bbntSignedUrl || (isBbntMandatory ? '' : 'Tự động nghiệm thu (<20tr & khớp SOW)'),
            invoiceNumber: r.invoiceNumber !== '—' ? r.invoiceNumber : '',
            isContractMandatory,
            contractMandatoryReason: isContractMandatory
              ? 'Bắt buộc ký HĐNT + Phụ lục SOW theo ngưỡng BR-03'
              : 'Dưới ngưỡng 10tr Gross & không tạm ứng ≥ 2tr: Miễn ký HĐ theo BR-03',
            isBbntMandatory,
            bbntMandatoryReason: isBbntMandatory
              ? 'Bắt buộc ký BBNT (Gross ≥ 20tr hoặc lệch SOW / HKD / Công ty theo BR-04)'
              : 'Tự động nghiệm thu (< 20tr & khớp 100% SOW theo BR-04)',
            isEligible: true,
            issues: [],
          },
        ],
        totals: {
          dealsCount: 1,
          agreedNetTotal: r.sowNetAmount,
          droppedDeductionTotal: r.droppedDeductionAmount,
          advancePaidTotal: isAdv ? 0 : r.advanceAmount,
          requestBaseNetTotal: netTransfer,
          vatTotal: vatAmount,
          pitTax10PctTotal: pitAmount,
          grossTotal: grossForSlip,
          netTransferTotal: netTransfer,
          amountInWords: numberToVietnameseWords(netTransfer),
        },
        larkSync: {
          approvalInstanceCode: instanceCode,
          larkbaseRecordId: `rec_${r.dealCode}`,
          larkAppToken: 'W6vRbbuOVar3qtsV18dlan1xgXb',
          larkTableId: 'tbl517FtC9TEWRXA',
          anycrossWebhookDelivered: true,
          syncMode: 'SANDBOX_SIMULATED',
          approvalStatus,
          syncedAt: r.rawApprovedItem?.updatedAt || new Date().toISOString(),
          daDiTien: approvalStatus === 'PAID',
          uncBillCode: isAdv ? undefined : r.uncBillCode || undefined,
        },
      };
    };

    for (const r of dealLedgerRows) {
      if (
        r.advanceSlipCode !== '—' &&
        !bySlipCode.has(r.advanceSlipCode.toUpperCase())
      ) {
        bySlipCode.set(
          r.advanceSlipCode.toUpperCase(),
          synthesizeSlip(r, 'ADVANCE'),
        );
      }
      if (
        r.settlementSlipCode !== '—' &&
        !bySlipCode.has(r.settlementSlipCode.toUpperCase())
      ) {
        bySlipCode.set(
          r.settlementSlipCode.toUpperCase(),
          synthesizeSlip(r, 'SETTLEMENT'),
        );
      }
    }

    return Array.from(bySlipCode.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [slips, dealLedgerRows]);

  const handleSlipDecision = async (
    targetSlip: LarkPaymentRequestSlip,
    action: 'ADVANCE_STEP' | 'REJECT_SLIP',
    extra?: { uncBillCode?: string; rejectedReason?: string },
  ) => {
    setSlipActionBusy(true);
    try {
      const nowIso = new Date().toISOString();
      let updatedSlip: LarkPaymentRequestSlip | null = null;

      let serverRejectedRequest = false;
      try {
        const res = await fetch('/api/integrations/larkbase/payment-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slipId: targetSlip.id,
            approvalInstanceCode: targetSlip.larkSync.approvalInstanceCode,
            action,
            uncBillCode: extra?.uncBillCode,
            rejectedReason: extra?.rejectedReason,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          slip?: LarkPaymentRequestSlip;
          message?: string;
          error?: string;
        } | null;
        if (res.ok && json?.slip) {
          updatedSlip = json.slip;
        } else if (res.status === 400 || res.status === 401 || res.status === 403) {
          serverRejectedRequest = true;
          onNotify?.(
            json?.message || json?.error || 'Không đủ thẩm quyền hoặc thiếu thông tin duyệt phiếu.',
            'warning',
          );
        }
      } catch {
        // Fallback xử lý cục bộ khi chạy độc lập (offline)
      }

      if (serverRejectedRequest) {
        return;
      }

      if (!updatedSlip) {
        if (action === 'REJECT_SLIP') {
          updatedSlip = {
            ...targetSlip,
            larkSync: {
              ...targetSlip.larkSync,
              approvalStatus: 'REJECTED',
              lastLarkStatus: 'REJECTED',
              rejectedReason: (
                extra?.rejectedReason || 'Cần bổ sung chứng từ / kiểm tra lại STK'
              ).trim(),
              syncedAt: nowIso,
            },
          };
        } else {
          const cur = targetSlip.larkSync.approvalStatus;
          const nextStatus: LarkPaymentRequestSlip['larkSync']['approvalStatus'] =
            cur === 'PENDING_LEADER'
              ? 'PENDING_DIRECTOR'
              : cur === 'PENDING_DIRECTOR'
                ? 'PENDING_FINANCE'
                : cur === 'PENDING_FINANCE'
                  ? 'APPROVED'
                  : 'PAID';
          const isMovingToPaid = nextStatus === 'PAID';
          const resolvedUnc =
            (extra?.uncBillCode || targetSlip.larkSync.uncBillCode || '').trim() ||
            (isMovingToPaid ? `UNC-VCB-${targetSlip.slipCode}` : undefined);
          updatedSlip = {
            ...targetSlip,
            larkSync: {
              ...targetSlip.larkSync,
              approvalStatus: nextStatus,
              syncedAt: nowIso,
              ...(isMovingToPaid
                ? {
                    daDiTien: true,
                    uncBillCode: resolvedUnc,
                    uncSentToKocAt: nowIso,
                  }
                : {}),
            },
          };
        }
      }

      const finalSlip = updatedSlip;
      setSlips((prev) => {
        const exists = prev.some(
          (x) =>
            x.id === finalSlip.id ||
            x.slipCode.toUpperCase() === finalSlip.slipCode.toUpperCase(),
        );
        const nextList = exists
          ? prev.map((x) =>
              x.id === finalSlip.id ||
              x.slipCode.toUpperCase() === finalSlip.slipCode.toUpperCase()
                ? finalSlip
                : x,
            )
          : [finalSlip, ...prev];
        saveLarkPaymentSlipsToStorage(nextList);
        return nextList;
      });
      setSelectedSlip(finalSlip);
      setRejectSlipTarget(null);
      setApprovedItems((prev) => {
        const lineByCode = new Map<string, LarkPaymentRequestSlip['lineItems'][number]>();
        for (const li of finalSlip.lineItems || []) {
          if (li.dealCode) lineByCode.set(li.dealCode.trim().toUpperCase(), li);
        }
        const st = finalSlip.larkSync.approvalStatus;
        const isPaid = Boolean(finalSlip.larkSync.daDiTien || st === 'PAID');
        const isRejected = st === 'REJECTED';
        const isApproved = st === 'APPROVED' || isPaid;
        const nextApproved = prev.map((row) => {
          const matchedLine = lineByCode.get((row.maBooking || '').trim().toUpperCase());
          if (!matchedLine) return row;
          if (finalSlip.requestType === 'ADVANCE') {
            return {
              ...row,
              larkAdvanceSlipCode: finalSlip.slipCode,
              larkAdvanceInstanceCode: finalSlip.larkSync.approvalInstanceCode,
              larkAdvanceStatus: (isRejected
                ? 'TỪ_CHỐI_TẠM_ỨNG'
                : isPaid
                  ? 'ĐÃ_CHI_TẠM_ỨNG'
                  : isApproved
                    ? 'ĐÃ_DUYỆT_TẠM_ỨNG'
                    : 'CHỜ_DUYỆT_TẠM_ỨNG') as ApprovedBookingListItem['larkAdvanceStatus'],
              larkApprovalStatus: st,
              trangThaiPhieuThanhToan: (isRejected
                ? 'Từ chối duyệt'
                : isPaid || isApproved
                  ? 'Đã tạm ứng'
                  : 'Đang duyệt Lark') as ApprovedBookingListItem['trangThaiPhieuThanhToan'],
            };
          }
          return {
            ...row,
            larkSlipCode: finalSlip.slipCode,
            larkApprovalInstanceCode: finalSlip.larkSync.approvalInstanceCode,
            larkApprovalStatus: st,
            trangThaiPhieuThanhToan: (isRejected
              ? 'Từ chối duyệt'
              : isPaid
                ? 'Đã thanh toán'
                : isApproved
                  ? 'Đã duyệt chờ chi'
                  : 'Đang duyệt Lark') as ApprovedBookingListItem['trangThaiPhieuThanhToan'],
            daDiTien: isPaid ? true : isRejected ? false : row.daDiTien,
            uncBillCode: finalSlip.larkSync.uncBillCode || row.uncBillCode,
            uncSentToKocAt: finalSlip.larkSync.uncSentToKocAt || row.uncSentToKocAt,
          };
        });
        saveApprovedBookingList(nextApproved);
        return nextApproved;
      });
      onNotify?.(
        action === 'REJECT_SLIP'
          ? `Đã từ chối phiếu ${finalSlip.slipCode} và trả về bổ sung hồ sơ.`
          : finalSlip.larkSync.approvalStatus === 'PAID'
            ? `Đã xác nhận đi tiền và lưu mã UNC (${finalSlip.larkSync.uncBillCode}) cho phiếu ${finalSlip.slipCode}.`
            : `Đã duyệt phiếu ${finalSlip.slipCode} sang bước tiếp theo.`,
        action === 'REJECT_SLIP' ? 'warning' : 'success',
      );
    } finally {
      setSlipActionBusy(false);
    }
  };

  const handleUpdateDealDataLock = useCallback(
    (
      dealCodes: string[],
      mode: 'LOCK_DATA' | 'APPROVE_S40_UNLOCK' | 'REJECT_S40_UNLOCK',
    ) => {
      if (!isFinanceActor) {
        onNotify?.(
          'Chỉ Kế toán (FINANCE), Giám đốc hoặc Quản trị viên mới có quyền khóa sổ / duyệt mở khóa S40.',
          'warning',
        );
        return;
      }
      const targetCodes = new Set(
        dealCodes.map((c) => c.trim().toUpperCase()).filter(Boolean),
      );
      if (targetCodes.size === 0) return;

      if (mode === 'APPROVE_S40_UNLOCK') {
        const paidDeal = approvedItems.find(
          (r) =>
            targetCodes.has((r.maBooking || '').trim().toUpperCase()) &&
            Boolean(r.daDiTien),
        );
        if (paidDeal && targetCodes.size === 1) {
          onNotify?.(
            `Deal ${paidDeal.maBooking} đã giải ngân thanh toán (Đã đi tiền UNC), không thể mở khóa S40 để sửa số liệu.`,
            'warning',
          );
          return;
        }
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();
      const actorName = 'Phòng Kế toán (FINANCE)';
      setApprovedItems((prev) => {
        const nextList = prev.map((row) => {
          const code = (row.maBooking || '').trim().toUpperCase();
          if (!targetCodes.has(code)) return row;
          if (mode === 'APPROVE_S40_UNLOCK' && row.daDiTien) return row;
          const logEntry = {
            id: `s40-${Date.now()}-${code}`,
            action:
              mode === 'LOCK_DATA'
                ? ('LOCK_DATA' as const)
                : mode === 'APPROVE_S40_UNLOCK'
                  ? ('APPROVE_UNLOCK' as const)
                  : ('REJECT_UNLOCK' as const),
            batch:
              mode === 'APPROVE_S40_UNLOCK'
                ? ('UNLOCKED' as const)
                : ('NONE' as const),
            reason:
              row.unlockRequestReason ||
              (mode === 'LOCK_DATA'
                ? 'Kế toán khóa sổ nghiệm thu tháng'
                : mode === 'APPROVE_S40_UNLOCK'
                  ? 'Kế toán duyệt mở khóa sửa S40'
                  : 'Kế toán từ chối yêu cầu mở khóa S40'),
            actorName,
            actorRole: 'FINANCE',
            createdAt: nowIso,
          };
          const nextHistory = [logEntry, ...(row.s40History || [])].slice(0, 20);
          if (mode === 'LOCK_DATA') {
            return {
              ...row,
              chotData: true,
              ngayKhoaData: todayIso,
              thangNghiemThuChot:
                row.thangNghiemThuChot ||
                row.thangPlan ||
                (monthFilter !== 'ALL' ? monthFilter : '2026/10'),
              unlockRequestBatch: 'NONE' as const,
              s40ReviewedBy: actorName,
              s40ReviewedAt: nowIso,
              s40History: nextHistory,
            };
          }
          if (mode === 'APPROVE_S40_UNLOCK') {
            return {
              ...row,
              chotData: true,
              unlockRequestBatch: 'UNLOCKED' as const,
              s40ReviewedBy: actorName,
              s40ReviewedAt: nowIso,
              s40History: nextHistory,
            };
          }
          return {
            ...row,
            chotData: true,
            unlockRequestBatch: 'NONE' as const,
            s40ReviewedBy: actorName,
            s40ReviewedAt: nowIso,
            s40History: nextHistory,
          };
        });
        saveApprovedBookingList(nextList, true);
        return nextList;
      });

      setSelectedDealRow((prev) => {
        if (!prev || !targetCodes.has(prev.dealCode.trim().toUpperCase())) return prev;
        if (mode === 'LOCK_DATA') {
          return {
            ...prev,
            isDataLocked: true,
            lockDate: todayIso,
            unlockRequestBatch: 'NONE',
          };
        }
        if (mode === 'APPROVE_S40_UNLOCK') {
          return {
            ...prev,
            isDataLocked: true,
            unlockRequestBatch: 'UNLOCKED',
          };
        }
        return {
          ...prev,
          isDataLocked: true,
          unlockRequestBatch: 'NONE',
        };
      });

      onNotify?.(
        mode === 'LOCK_DATA'
          ? `Đã khóa sổ nghiệm thu (${targetCodes.size} deal) và đồng bộ về bảng thực thi.`
          : mode === 'APPROVE_S40_UNLOCK'
            ? `Đã duyệt mở khóa sửa S40 (${targetCodes.size} deal) cho chuyên viên cập nhật số liệu.`
            : `Đã từ chối yêu cầu mở khóa S40 và giữ nguyên khóa sổ (${targetCodes.size} deal).`,
        mode === 'REJECT_S40_UNLOCK' ? 'warning' : 'success',
      );
    },
    [approvedItems, isFinanceActor, monthFilter, onNotify],
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    dealLedgerRows.forEach((r) => {
      if (r.lockedAcceptanceMonth) set.add(r.lockedAcceptanceMonth);
      if (r.month) set.add(r.month);
    });
    allSlips.forEach((s) => {
      if (s.month) set.add(s.month);
    });
    return Array.from(set).sort().reverse();
  }, [dealLedgerRows, allSlips]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    dealLedgerRows.forEach((r) => {
      if (r.brandName) set.add(r.brandName);
    });
    return Array.from(set).sort();
  }, [dealLedgerRows]);

  const searchedDealRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dealLedgerRows.filter((r) => {
      if (
        monthFilter !== 'ALL' &&
        r.lockedAcceptanceMonth !== monthFilter &&
        r.month !== monthFilter
      ) {
        return false;
      }
      if (brandFilter !== 'ALL' && r.brandName !== brandFilter) {
        return false;
      }
      if (!q) return true;
      const sowTitles = r.sowRecords
        .map((x) => `${x.title} ${x.contractSystem?.contractCode || ''}`)
        .join(' ');
      const bbntTitles = r.bbntRecords
        .map((x) => `${x.title} ${x.contractSystem?.contractCode || ''}`)
        .join(' ');
      return `${r.dealCode} ${r.brandName} ${r.storeName} ${r.productName} ${r.picName} ${r.kocName} ${r.kocChannelId} ${r.bankHolder} ${r.advanceSlipCode} ${r.advanceLarkInstanceCode} ${r.settlementSlipCode} ${r.settlementLarkInstanceCode} ${r.masterContractCode} ${r.sowCode} ${r.bbntCode} ${sowTitles} ${bbntTitles}`
        .toLowerCase()
        .includes(q);
    });
  }, [dealLedgerRows, search, monthFilter, brandFilter]);

  const dealFilterMatchers: Record<DealLedgerFilter, (r: FinanceDealLedgerRow) => boolean> = {
    ALL: () => true,
    FULL_DOSSIER: (r) =>
      r.masterContractSigned && r.sowSigned && (r.bbntSigned || r.bbntCode !== '—'),
    ADVANCE_UNSETTLED: (r) => r.advanceAmount > 0 && !r.daDiTien,
    READY_SETTLEMENT: (r) =>
      r.isAcceptedAll && r.settlementSlipCode === '—' && !r.daDiTien,
    IN_LARK_APPROVAL: (r) =>
      !r.daDiTien &&
      (r.settlementSlipCode !== '—' ||
        (r.advanceSlipCode !== '—' && r.advanceStatusLabel === 'Đang duyệt Lark')),
    PAID_COMPLETED: (r) => r.daDiTien,
    UNLOCK_REQUESTED: (r) =>
      r.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
      r.unlockRequestBatch === 'DOT_2_LV10_LV11',
  };

  const filteredDealRows = useMemo(
    () => searchedDealRows.filter(dealFilterMatchers[dealFilter]),
    [searchedDealRows, dealFilter],
  );

  const searchedSlips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSlips.filter((s) => {
      if (monthFilter !== 'ALL' && s.month !== monthFilter) return false;
      if (
        brandFilter !== 'ALL' &&
        !s.lineItems.some((l) => l.brandName === brandFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const dealCodes = s.lineItems.map((l) => l.dealCode).join(' ');
      const brands = s.lineItems.map((l) => l.brandName).join(' ');
      return `${s.slipCode} ${s.larkSync.approvalInstanceCode} ${s.payee.kocStageName} ${s.payee.kocChannelId} ${s.payee.bankHolder} ${dealCodes} ${brands}`
        .toLowerCase()
        .includes(q);
    });
  }, [allSlips, search, monthFilter, brandFilter]);

  const slipFilterMatchers: Record<SlipFilter, (s: LarkPaymentRequestSlip) => boolean> = {
    ALL: () => true,
    ADVANCE: (s) => s.requestType === 'ADVANCE',
    SETTLEMENT: (s) => s.requestType === 'SETTLEMENT',
    PENDING_LARK: (s) =>
      s.larkSync.approvalStatus === 'PENDING_LEADER' ||
      s.larkSync.approvalStatus === 'PENDING_DIRECTOR' ||
      s.larkSync.approvalStatus === 'PENDING_FINANCE',
    APPROVED_LARK: (s) => s.larkSync.approvalStatus === 'APPROVED',
    PAID_UNC: (s) => s.larkSync.approvalStatus === 'PAID' || Boolean(s.larkSync.daDiTien),
    REJECTED_LARK: (s) => s.larkSync.approvalStatus === 'REJECTED',
  };

  const filteredSlips = useMemo(
    () => searchedSlips.filter(slipFilterMatchers[slipFilter]),
    [searchedSlips, slipFilter],
  );

  const brandSummaryRows = useMemo<BrandSummaryRow[]>(() => {
    const map = new Map<string, BrandSummaryRow>();
    for (const r of searchedDealRows) {
      const cur = map.get(r.brandName) || {
        brandName: r.brandName,
        dealsCount: 0,
        sowNetTotal: 0,
        taxTotal: 0,
        grossTotal: 0,
        advanceTotal: 0,
        unsettledAdvanceTotal: 0,
        unsettledAdvanceDealsCount: 0,
        settledPaidTotal: 0,
        remainingToPayTotal: 0,
      };
      cur.dealsCount += 1;
      cur.sowNetTotal += r.effectiveNetAmount;
      cur.taxTotal += r.taxAmount;
      cur.grossTotal += r.grossAmount;
      cur.advanceTotal += r.advanceAmount;
      if (r.advanceAmount > 0 && !r.daDiTien) {
        cur.unsettledAdvanceTotal += r.advanceAmount;
        cur.unsettledAdvanceDealsCount += 1;
      }
      if (r.daDiTien) {
        cur.settledPaidTotal += r.effectiveNetAmount;
      } else {
        cur.remainingToPayTotal += r.remainingNetToPay;
      }
      map.set(r.brandName, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.grossTotal - a.grossTotal);
  }, [searchedDealRows]);

  const stats = useMemo(() => {
    const totalAdvanceVnd = searchedDealRows.reduce((s, r) => s + r.advanceAmount, 0);
    const advanceDealsCount = searchedDealRows.filter((r) => r.advanceAmount > 0).length;
    const unsettledAdvanceRows = searchedDealRows.filter(
      (r) => r.advanceAmount > 0 && !r.daDiTien,
    );
    const unsettledAdvanceVnd = unsettledAdvanceRows.reduce(
      (s, r) => s + r.advanceAmount,
      0,
    );
    const totalSettledPaidVnd = searchedDealRows
      .filter((r) => r.daDiTien)
      .reduce((s, r) => s + r.effectiveNetAmount, 0);
    const totalRemainingToPayVnd = searchedDealRows
      .filter((r) => !r.daDiTien)
      .reduce((s, r) => s + r.remainingNetToPay, 0);
    const totalGrossVnd = searchedDealRows.reduce((s, r) => s + r.grossAmount, 0);
    const totalTaxVnd = searchedDealRows.reduce((s, r) => s + r.taxAmount, 0);

    return {
      totalAdvanceVnd,
      advanceDealsCount,
      unsettledAdvanceCount: unsettledAdvanceRows.length,
      unsettledAdvanceVnd,
      totalSettledPaidVnd,
      totalRemainingToPayVnd,
      totalGrossVnd,
      totalTaxVnd,
    };
  }, [searchedDealRows]);

  const pageSize = 15;
  const pagedDealRows = filteredDealRows.slice((page - 1) * pageSize, page * pageSize);
  const pagedSlips = filteredSlips.slice((page - 1) * pageSize, page * pageSize);

  const buildReportRowsForExport = () => {
    const headers = [
      'Mã Deal',
      'Nhãn hàng',
      'Gian hàng',
      'Kỳ nghiệm thu chốt',
      'Trạng thái khóa sổ',
      'Ngày khóa sổ',
      'Trạng thái S40',
      'Lý do mở khóa S40',
      'Người duyệt / Khóa sổ S40',
      'KOC',
      'ID Kênh',
      'Mã Hồ sơ pháp lý',
      'Pháp nhân',
      'CCCD / MST',
      'Ngân hàng (Từ HSPL)',
      'Số tài khoản (Từ HSPL)',
      'Tên chủ tài khoản (Từ HSPL)',
      'Mã Phụ lục SOW',
      'Mã BBNT',
      'Số Hóa đơn',
      'Giá trị Net chốt (VND)',
      'Thuế TNCN / VAT (VND)',
      'Giá trị Gross (VND)',
      'Đã tạm ứng Đợt 1 (VND)',
      'Mã phiếu Tạm ứng Lark',
      'Trạng thái Tạm ứng Lark',
      'Còn phải thanh toán Đợt 2 (VND)',
      'Mã phiếu ĐNTT Lark',
      'Trạng thái ĐNTT Lark',
      'Mã Bill UNC',
    ];
    const lines = filteredDealRows.map((r) => [
      r.dealCode,
      r.brandName,
      r.storeName,
      r.lockedAcceptanceMonth,
      r.isDataLocked ? 'Đã chốt data' : 'Chưa chốt data',
      r.lockDate,
      r.unlockRequestBatch === 'DOT_1_LV4_LV5'
        ? 'Xin mở S40 Đợt 1 (LV4-LV5)'
        : r.unlockRequestBatch === 'DOT_2_LV10_LV11'
          ? 'Xin mở S40 Đợt 2 (LV10-LV11)'
          : r.unlockRequestBatch === 'UNLOCKED'
            ? 'Đã mở S40 cho sửa'
            : 'Không yêu cầu mở S40',
      r.unlockRequestReason || '',
      r.rawApprovedItem?.s40ReviewedBy || '',
      r.kocName,
      r.kocChannelId,
      r.legalProfileCode,
      r.legalTypeLabel,
      revealSensitive ? r.taxCodeOrCccd : maskSensitiveNumber(r.taxCodeOrCccd, false),
      r.bankName,
      revealSensitive ? r.bankAccount : maskSensitiveNumber(r.bankAccount, false),
      r.bankHolder,
      r.sowCode,
      r.bbntCode,
      r.invoiceNumber,
      String(r.effectiveNetAmount),
      String(r.taxAmount),
      String(r.grossAmount),
      String(r.advanceAmount),
      r.advanceSlipCode,
      r.advanceStatusLabel,
      String(r.remainingNetToPay),
      r.settlementSlipCode,
      r.settlementStatusLabel,
      r.uncBillCode || '',
    ]);
    return { headers, lines };
  };

  const handleDownloadCsvReport = () => {
    const { headers, lines } = buildReportRowsForExport();
    const csv =
      '\uFEFF' +
      [headers, ...lines]
        .map((row) =>
          row
            .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
            .join(','),
        )
        .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Thanh_Toan_Ke_Toan_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất file CSV báo cáo Kế toán (${lines.length} deal).`, 'success');
  };

  // Cột bảng 1: Tra cứu Deal (Tuân thủ §7 Rules 5, 6, 8: Tối đa 2 dòng/ô, không badge tô nền, chỉ 1 Status/hàng)
  const dealColumns: Column<FinanceDealLedgerRow>[] = [
    {
      key: 'deal',
      header: 'Mã deal & nhãn hàng',
      width: 215,
      render: (r) => (
        <div className="min-w-0 max-w-[235px] leading-snug space-y-0.5">
          <div className="truncate">
            <span className="font-code font-semibold text-ink">{r.dealCode}</span>
            <span className="text-ink-3"> · </span>
            <span className="text-ink-2">{r.brandName}</span>
          </div>
          <span className="block truncate text-2xs text-ink-3">
            {r.productName} · Kỳ {r.lockedAcceptanceMonth}
            {r.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
            r.unlockRequestBatch === 'DOT_2_LV10_LV11' ? (
              <span className="font-medium text-warning">
                {' '}
                · Xin mở S40 ({r.unlockRequestBatch === 'DOT_1_LV4_LV5' ? 'Đợt 1' : 'Đợt 2'})
              </span>
            ) : r.unlockRequestBatch === 'UNLOCKED' ? (
              <span className="font-medium text-accent"> · Đã mở S40</span>
            ) : r.isDataLocked ? (
              <span className="text-positive"> · Đã khóa sổ</span>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      key: 'koc',
      header: 'KOC & pháp lý',
      width: 215,
      render: (r) => (
        <div className="min-w-0 max-w-[235px] leading-snug space-y-0.5">
          <div className="truncate">
            <span className="font-medium text-ink">{r.kocName}</span>{' '}
            <span className="text-2xs text-ink-3">({r.kocChannelId})</span>
          </div>
          <span className="block truncate text-2xs text-ink-3">
            {r.legalTypeLabel} ·{' '}
            {r.signingHistory?.isSkipDeepCheckEligible ? (
              <span className="text-positive font-medium">Đã từng ký HSPL</span>
            ) : (
              'Ký lần đầu'
            )}{' '}
            · {r.legalAttachments.length} tệp CCCD/ĐKKD
          </span>
        </div>
      ),
    },
    {
      key: 'docs',
      header: 'Chứng từ (HĐNT · SOW · BBNT)',
      width: 245,
      render: (r) => {
        const sowCount = Math.max(1, r.sowRecords.length);
        return (
          <div
            className="min-w-0 max-w-[260px] leading-snug space-y-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (r.frameworkRecord && onQuickViewRecord) {
                    onQuickViewRecord(r.frameworkRecord);
                  } else {
                    openDealModal(r, 'DOSSIER_AND_PAYMENT');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (r.frameworkRecord && onQuickViewRecord) {
                      onQuickViewRecord(r.frameworkRecord);
                    } else {
                      openDealModal(r, 'DOSSIER_AND_PAYMENT');
                    }
                  }
                }}
                className={`cursor-pointer hover:text-accent hover:underline ${
                  r.masterContractSigned ? 'font-medium text-ink' : 'text-ink-3'
                }`}
              >
                HĐNT {r.masterContractSigned ? '✓' : '—'}
              </span>
              <span className="text-ink-3">·</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (r.sowRecords[0] && onQuickViewRecord) {
                    onQuickViewRecord(r.sowRecords[0]);
                  } else {
                    openDealModal(r, 'DOSSIER_AND_PAYMENT');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (r.sowRecords[0] && onQuickViewRecord) {
                      onQuickViewRecord(r.sowRecords[0]);
                    } else {
                      openDealModal(r, 'DOSSIER_AND_PAYMENT');
                    }
                  }
                }}
                className={`cursor-pointer hover:text-accent hover:underline ${
                  r.sowSigned ? 'font-medium text-ink' : 'font-medium text-warning'
                }`}
              >
                {sowCount > 1 ? `${sowCount} Phụ lục` : 'Phụ lục SOW'}{' '}
                {r.sowSigned ? '✓' : '…'}
              </span>
              <span className="text-ink-3">·</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (r.bbntRecords[0] && onQuickViewRecord) {
                    onQuickViewRecord(r.bbntRecords[0]);
                  } else {
                    openDealModal(r, 'DOSSIER_AND_PAYMENT');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (r.bbntRecords[0] && onQuickViewRecord) {
                      onQuickViewRecord(r.bbntRecords[0]);
                    } else {
                      openDealModal(r, 'DOSSIER_AND_PAYMENT');
                    }
                  }
                }}
                className={`cursor-pointer hover:text-accent hover:underline ${
                  r.bbntSigned ? 'font-medium text-ink' : 'text-ink-3'
                }`}
              >
                BBNT {r.bbntSigned ? '✓' : '—'}
              </span>
            </div>
            <span className="block truncate text-2xs text-ink-3 font-code">
              {r.sowCode} · HĐơn: {r.invoiceNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'netAmount',
      header: 'Thực chi Net',
      width: 175,
      align: 'right',
      render: (r) => (
        <div className="leading-snug space-y-0.5 tabular-nums text-right">
          <div className="font-code font-semibold text-ink">
            {formatVnd(r.effectiveNetAmount)}
          </div>
          <div className="text-2xs text-ink-3">
            Gross {formatVnd(r.grossAmount)} · Thuế {formatVnd(r.taxAmount)}
          </div>
        </div>
      ),
    },
    {
      key: 'remaining',
      header: 'Còn phải chi',
      width: 185,
      align: 'right',
      render: (r) => (
        <div className="leading-snug space-y-0.5 tabular-nums text-right">
          <div className="font-code font-semibold text-ink">
            {formatVnd(r.remainingNetToPay)}
          </div>
          <div className="text-2xs text-ink-3 truncate max-w-[185px]">
            {r.advanceAmount > 0 ? `Đã ứng ${formatVnd(r.advanceAmount)}` : 'Không tạm ứng'} ·{' '}
            <span className="font-code">
              {r.settlementSlipCode !== '—'
                ? r.settlementSlipCode
                : r.advanceSlipCode !== '—'
                  ? r.advanceSlipCode
                  : 'Chưa lập phiếu'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 135,
      align: 'right',
      render: (r) => <Status tone={r.settlementStatusTone}>{r.settlementStatusLabel}</Status>,
    },
    {
      key: 'actions',
      header: '',
      width: 110,
      align: 'right',
      render: (r) => {
        const linkedSlipCode =
          r.settlementSlipCode !== '—'
            ? r.settlementSlipCode
            : r.advanceSlipCode !== '—'
              ? r.advanceSlipCode
              : '';
        return (
          <div
            className="inline-flex items-center justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (linkedSlipCode) {
                  const found = allSlips.find(
                    (s) => s.slipCode.toUpperCase() === linkedSlipCode.toUpperCase(),
                  );
                  if (found) {
                    openSlipModal(found, 'SLIP_DOSSIER', r.dealCode);
                    return;
                  }
                }
                openDealModal(r, 'DOSSIER_AND_PAYMENT');
              }}
            >
              Đối chiếu
            </Button>
          </div>
        );
      },
    },
  ];

  // Cột bảng 2: Danh sách Phiếu Tạm ứng & ĐNTT trên Lark
  const slipColumns: Column<LarkPaymentRequestSlip>[] = [
    {
      key: 'slipCode',
      header: 'Mã phiếu & kỳ tháng',
      width: 195,
      render: (s) => (
        <div className="min-w-0 max-w-[210px] leading-snug space-y-0.5">
          <div className="truncate">
            <span className="font-code font-semibold text-ink">{s.slipCode}</span>
            <span className="text-ink-3"> · </span>
            <span className="text-ink-2">
              {s.requestType === 'ADVANCE' ? 'Phiếu tạm ứng' : 'Phiếu thanh toán'}
            </span>
          </div>
          <span className="block truncate text-2xs font-code text-ink-3">
            Lark: {s.larkSync.approvalInstanceCode} · Kỳ {s.month}
          </span>
        </div>
      ),
    },
    {
      key: 'payee',
      header: 'KOC & ngân hàng',
      width: 190,
      render: (s) => (
        <div className="min-w-0 max-w-[205px] leading-snug space-y-0.5">
          <span className="block truncate font-medium text-ink">
            {s.payee.kocStageName} ({s.payee.kocChannelId})
          </span>
          <span className="block truncate text-2xs text-ink-3">
            {s.payee.bankName} · Chủ TK: {s.payee.bankHolder}
          </span>
        </div>
      ),
    },
    {
      key: 'dealsAndDocs',
      header: 'Deal & bộ chứng từ (HĐNT · SOW · BBNT)',
      width: 255,
      render: (s) => {
        const firstLine = s.lineItems[0];
        const matchedRow = firstLine
          ? dealRowByCode.get(firstLine.dealCode.toUpperCase())
          : undefined;
        const isBbntExempt =
          firstLine &&
          !firstLine.isBbntMandatory &&
          (!matchedRow || matchedRow.bbntCode === '—');
        return (
          <div
            className="min-w-0 max-w-[270px] leading-snug space-y-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="font-code font-semibold text-ink">
                {s.lineItems.map((l) => l.dealCode).join(', ')}
              </span>
              <span className="text-ink-3">·</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (matchedRow?.frameworkRecord && onQuickViewRecord) {
                    onQuickViewRecord(matchedRow.frameworkRecord);
                  } else {
                    openSlipModal(s, 'SLIP_DOSSIER');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (matchedRow?.frameworkRecord && onQuickViewRecord) {
                      onQuickViewRecord(matchedRow.frameworkRecord);
                    } else {
                      openSlipModal(s, 'SLIP_DOSSIER');
                    }
                  }
                }}
                className={`cursor-pointer hover:text-accent hover:underline ${
                  matchedRow?.masterContractSigned ? 'font-medium text-ink' : 'text-ink-3'
                }`}
              >
                HĐNT {matchedRow?.masterContractSigned ? '✓' : '—'}
              </span>
              <span className="text-ink-3">·</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (matchedRow?.sowRecords[0] && onQuickViewRecord) {
                    onQuickViewRecord(matchedRow.sowRecords[0]);
                  } else {
                    openSlipModal(s, 'SLIP_DOSSIER');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (matchedRow?.sowRecords[0] && onQuickViewRecord) {
                      onQuickViewRecord(matchedRow.sowRecords[0]);
                    } else {
                      openSlipModal(s, 'SLIP_DOSSIER');
                    }
                  }
                }}
                className={`cursor-pointer hover:text-accent hover:underline ${
                  matchedRow?.sowSigned ? 'font-medium text-ink' : 'font-medium text-warning'
                }`}
              >
                SOW {matchedRow?.sowSigned ? '✓' : '…'}
              </span>
              <span className="text-ink-3">·</span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (matchedRow?.bbntRecords[0] && onQuickViewRecord) {
                    onQuickViewRecord(matchedRow.bbntRecords[0]);
                  } else {
                    openSlipModal(s, 'SLIP_DOSSIER');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (matchedRow?.bbntRecords[0] && onQuickViewRecord) {
                      onQuickViewRecord(matchedRow.bbntRecords[0]);
                    } else {
                      openSlipModal(s, 'SLIP_DOSSIER');
                    }
                  }
                }}
                className={`cursor-pointer hover:text-accent hover:underline ${
                  matchedRow?.bbntSigned
                    ? 'font-medium text-ink'
                    : isBbntExempt
                      ? 'text-positive'
                      : 'text-ink-3'
                }`}
              >
                BBNT {matchedRow?.bbntSigned ? '✓' : isBbntExempt ? 'Miễn' : '—'}
              </span>
            </div>
            <div className="text-2xs text-ink-3 truncate">
              {s.lineItems.map((l) => l.brandName).filter(Boolean).join(', ')} ·{' '}
              <span className="font-code">
                {matchedRow?.sowCode || firstLine?.contractAppendixCode || '—'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'amounts',
      header: 'Thực chuyển',
      width: 185,
      align: 'right',
      render: (s) => (
        <div className="leading-snug space-y-0.5 tabular-nums text-right">
          <div className="font-code font-semibold text-ink">
            {formatVnd(s.totals.netTransferTotal)}
          </div>
          <div className="text-2xs text-ink-3">
            {s.totals.advancePaidTotal > 0
              ? `Trừ ứng ${formatVnd(s.totals.advancePaidTotal)}`
              : `Gross ${formatVnd(s.totals.grossTotal)}`}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 135,
      align: 'right',
      render: (s) => {
        const st = s.larkSync.approvalStatus;
        let tone: StatusTone = 'warning';
        let label = 'Chờ duyệt';
        if (st === 'PAID' || s.larkSync.daDiTien) {
          tone = 'positive';
          label = 'Hoàn tất';
        } else if (st === 'APPROVED') {
          tone = 'positive';
          label = 'Đã duyệt';
        } else if (st === 'REJECTED') {
          tone = 'critical';
          label = 'Cần sửa';
        }
        return <Status tone={tone}>{label}</Status>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: 110,
      align: 'right',
      render: (s) => (
        <div
          className="inline-flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openSlipModal(s, 'SLIP_DOSSIER')}
          >
            Đối chiếu
          </Button>
        </div>
      ),
    },
  ];

  // Cột bảng 3: Tổng hợp theo Nhãn hàng
  const brandColumns: Column<BrandSummaryRow>[] = [
    {
      key: 'brandName',
      header: 'Nhãn hàng',
      width: 190,
      render: (r) => (
        <div className="leading-snug space-y-0.5">
          <span className="font-medium text-ink block">{r.brandName}</span>
          <span className="text-2xs text-ink-3 block">{r.dealsCount} deal</span>
        </div>
      ),
    },
    {
      key: 'sowNetTotal',
      header: 'Tổng Net SOW',
      width: 150,
      align: 'right',
      render: (r) => (
        <span className="font-code font-medium text-ink tabular-nums">
          {formatVnd(r.sowNetTotal)}
        </span>
      ),
    },
    {
      key: 'taxTotal',
      header: 'Thuế khấu trừ',
      width: 145,
      align: 'right',
      render: (r) => (
        <span className="font-code text-ink-2 tabular-nums">
          {formatVnd(r.taxTotal)}
        </span>
      ),
    },
    {
      key: 'grossTotal',
      header: 'Tổng Gross',
      width: 155,
      align: 'right',
      render: (r) => (
        <span className="font-code font-semibold text-ink tabular-nums">
          {formatVnd(r.grossTotal)}
        </span>
      ),
    },
    {
      key: 'unsettledAdvanceTotal',
      header: 'Tạm ứng chưa tất toán',
      width: 175,
      align: 'right',
      render: (r) => (
        <div className="tabular-nums text-right leading-snug space-y-0.5">
          <span
            className={`font-code font-medium ${
              r.unsettledAdvanceTotal > 0 ? 'text-warning' : 'text-ink-3'
            }`}
          >
            {formatVnd(r.unsettledAdvanceTotal)}
          </span>
          {r.unsettledAdvanceDealsCount > 0 && (
            <span className="block text-2xs text-ink-3">
              {r.unsettledAdvanceDealsCount} deal đang treo
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'remainingToPayTotal',
      header: 'Còn phải chi đợt 2',
      width: 165,
      align: 'right',
      render: (r) => (
        <span className="font-code text-ink font-semibold tabular-nums">
          {formatVnd(r.remainingToPayTotal)}
        </span>
      ),
    },
  ];

  const unlockRequestedDealRows = useMemo(
    () => searchedDealRows.filter(dealFilterMatchers.UNLOCK_REQUESTED),
    [searchedDealRows],
  );
  const lockableAcceptedDealRows = useMemo(
    () =>
      searchedDealRows.filter(
        (r) => r.isAcceptedAll && (!r.isDataLocked || r.unlockRequestBatch === 'UNLOCKED'),
      ),
    [searchedDealRows],
  );

  const dealChipItems: { key: DealLedgerFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: searchedDealRows.length },
    {
      key: 'FULL_DOSSIER',
      label: 'Đủ bộ chứng từ',
      count: searchedDealRows.filter(dealFilterMatchers.FULL_DOSSIER).length,
    },
    {
      key: 'IN_LARK_APPROVAL',
      label: 'Đang duyệt Lark',
      count: searchedDealRows.filter(dealFilterMatchers.IN_LARK_APPROVAL).length,
    },
    {
      key: 'ADVANCE_UNSETTLED',
      label: 'Treo tạm ứng',
      count: searchedDealRows.filter(dealFilterMatchers.ADVANCE_UNSETTLED).length,
    },
    {
      key: 'READY_SETTLEMENT',
      label: 'Chờ lập ĐNTT',
      count: searchedDealRows.filter(dealFilterMatchers.READY_SETTLEMENT).length,
    },
    {
      key: 'PAID_COMPLETED',
      label: 'Đã đi tiền',
      count: searchedDealRows.filter(dealFilterMatchers.PAID_COMPLETED).length,
    },
    {
      key: 'UNLOCK_REQUESTED',
      label: 'Xin mở khóa S40',
      count: unlockRequestedDealRows.length,
    },
  ];

  const slipChipItems: { key: SlipFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: searchedSlips.length },
    {
      key: 'ADVANCE',
      label: 'Phiếu tạm ứng',
      count: searchedSlips.filter(slipFilterMatchers.ADVANCE).length,
    },
    {
      key: 'SETTLEMENT',
      label: 'Phiếu thanh toán',
      count: searchedSlips.filter(slipFilterMatchers.SETTLEMENT).length,
    },
    {
      key: 'PENDING_LARK',
      label: 'Đang duyệt Lark',
      count: searchedSlips.filter(slipFilterMatchers.PENDING_LARK).length,
    },
    {
      key: 'APPROVED_LARK',
      label: 'Chờ đi tiền',
      count: searchedSlips.filter(slipFilterMatchers.APPROVED_LARK).length,
    },
    {
      key: 'PAID_UNC',
      label: 'Đã đi tiền',
      count: searchedSlips.filter(slipFilterMatchers.PAID_UNC).length,
    },
  ];

  return (
    <div className="space-y-4">
      <Panel flush>
        <div className="p-4 border-b border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              value={subTab}
              onChange={(v) => {
                setSubTab(v);
                setPage(1);
              }}
              items={[
                {
                  key: 'LARK_SLIPS',
                  label: `Phiếu thanh toán (${searchedSlips.length})`,
                },
                {
                  key: 'DEAL_LEDGER',
                  label: `Theo deal (${searchedDealRows.length})`,
                },
                {
                  key: 'BRAND_SUMMARY',
                  label: `Theo nhãn hàng (${brandSummaryRows.length})`,
                },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setPage(1);
                }}
                className="w-36"
              >
                <option value="ALL">Tất cả kỳ tháng</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    Kỳ {m}
                  </option>
                ))}
              </Select>

              <Select
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              >
                <option value="ALL">Tất cả nhãn hàng</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>

              {isFinanceActor && subTab === 'DEAL_LEDGER' && unlockRequestedDealRows.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={CheckCircle2}
                  onClick={() =>
                    handleUpdateDealDataLock(
                      unlockRequestedDealRows.map((r) => r.dealCode),
                      'APPROVE_S40_UNLOCK',
                    )
                  }
                >
                  Duyệt mở S40 ({unlockRequestedDealRows.length})
                </Button>
              )}

              {isFinanceActor &&
                subTab === 'DEAL_LEDGER' &&
                lockableAcceptedDealRows.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      handleUpdateDealDataLock(
                        lockableAcceptedDealRows.map((r) => r.dealCode),
                        'LOCK_DATA',
                      )
                    }
                  >
                    Khóa sổ nghiệm thu ({lockableAcceptedDealRows.length})
                  </Button>
                )}

              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={handleDownloadCsvReport}
              >
                Xuất CSV
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={loadingSync}
                onClick={() => void reloadData()}
              >
                Đồng bộ Lark
              </Button>
            </div>
          </div>

          {subTab !== 'BRAND_SUMMARY' && (
            <FilterBar
              search={{
                value: search,
                onChange: (v) => {
                  setSearch(v);
                  setPage(1);
                },
                placeholder:
                  'Tìm mã deal BO..., mã HĐ/phụ lục/BBNT, tên KOC, @id_kênh, mã phiếu Lark...',
              }}
              chips={
                subTab === 'DEAL_LEDGER' ? (
                  <Chips
                    items={dealChipItems}
                    value={dealFilter}
                    onChange={(v) => {
                      setDealFilter(v);
                      setPage(1);
                    }}
                  />
                ) : (
                  <Chips
                    items={slipChipItems}
                    value={slipFilter}
                    onChange={(v) => {
                      setSlipFilter(v);
                      setPage(1);
                    }}
                  />
                )
              }
              resultCount={
                subTab === 'DEAL_LEDGER'
                  ? filteredDealRows.length
                  : filteredSlips.length
              }
            />
          )}
        </div>

        {subTab === 'DEAL_LEDGER' && (
          <>
            <DataTable
              columns={dealColumns}
              rows={pagedDealRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => openDealModal(r, 'DOSSIER_AND_PAYMENT')}
              empty={
                <EmptyState title="Không tìm thấy deal nào khớp bộ lọc hiện tại" />
              }
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredDealRows.length}
              onPageChange={setPage}
            />
          </>
        )}

        {subTab === 'LARK_SLIPS' && (
          <>
            <DataTable
              columns={slipColumns}
              rows={pagedSlips}
              rowKey={(s) => s.id}
              onRowClick={(s) => openSlipModal(s, 'SLIP_DOSSIER')}
              empty={
                <EmptyState title="Chưa có phiếu tạm ứng hoặc thanh toán nào khớp bộ lọc" />
              }
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredSlips.length}
              onPageChange={setPage}
            />
          </>
        )}

        {subTab === 'BRAND_SUMMARY' && (
          <DataTable
            columns={brandColumns}
            rows={brandSummaryRows}
            rowKey={(r) => r.brandName}
            empty={<EmptyState title="Chưa có dữ liệu tổng hợp công nợ theo nhãn hàng" />}
          />
        )}
      </Panel>

      {/* Modal 1: Tra cứu chi tiết Deal cho Kế toán — Bố cục 2 cột chuẩn §7 Rule 14 */}
      <Modal
        open={Boolean(selectedDealRow)}
        onClose={() => setSelectedDealRow(null)}
        title={
          selectedDealRow
            ? `Deal ${selectedDealRow.dealCode} · ${selectedDealRow.kocName} (${selectedDealRow.brandName})`
            : 'Chi tiết deal'
        }
        size="xl"
        footer={
          selectedDealRow && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <span className="text-2xs text-ink-3">
                Hồ sơ pháp lý:{' '}
                <strong className="font-code text-ink-2">
                  {selectedDealRow.legalProfileCode}
                </strong>{' '}
                ({selectedDealRow.legalTypeLabel}) · Kỳ chốt sổ:{' '}
                <strong className="font-code text-ink-2">
                  {selectedDealRow.lockedAcceptanceMonth}
                </strong>
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setSelectedDealRow(null)}
              >
                Đóng
              </Button>
            </div>
          )
        }
      >
        {selectedDealRow && (
          <div className="space-y-4 text-xs">
            {/* Gợi ý 1 dòng về lịch sử ký hợp đồng với Hồ sơ pháp lý của KOC */}
            {selectedDealRow.signingHistory && (
              <LegalProfileSigningHistoryBanner summary={selectedDealRow.signingHistory} />
            )}

            <Segmented
              value={dealModalTab}
              onChange={(v) => setDealModalTab(v)}
              items={[
                {
                  key: 'DOSSIER_AND_PAYMENT',
                  label: 'Chứng từ & thanh toán',
                },
                {
                  key: 'LEGAL_ID_DOCS',
                  label: `Giấy tờ CCCD / ĐKKD (${selectedDealRow.legalAttachments.length})`,
                },
              ]}
            />

            {dealModalTab === 'DOSSIER_AND_PAYMENT' ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
                {/* CỘT CHÍNH: Bộ chứng từ 3 giai đoạn + Nghiệm thu & Hạng mục công việc */}
                <div className="space-y-4 min-w-0">
                  {/* Khối 1: Bộ chứng từ hợp đồng (HĐNT · Phụ lục SOW · BBNT) */}
                  <div className="rounded-xl border border-line bg-surface divide-y divide-line">
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        Chứng từ hợp đồng (HĐNT · Phụ lục SOW · BBNT)
                      </span>
                      <span className="text-2xs text-ink-3">
                        Hóa đơn:{' '}
                        <strong className="font-code text-ink">
                          {selectedDealRow.invoiceNumber}
                        </strong>
                      </span>
                    </div>

                    {/* 1. Hợp đồng nguyên tắc */}
                    <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">Hợp đồng nguyên tắc</span>
                          <span className="font-code text-ink-2">
                            {selectedDealRow.masterContractCode}
                          </span>
                        </div>
                        <span className="block text-2xs text-ink-3 truncate">
                          {selectedDealRow.frameworkRecord
                            ? `${selectedDealRow.frameworkRecord.title} (${selectedDealRow.frameworkRecord.templateId})`
                            : `Hợp đồng nguyên tắc gắn với ${selectedDealRow.legalProfileCode}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-2xs font-medium ${
                            selectedDealRow.masterContractSigned ? 'text-positive' : 'text-warning'
                          }`}
                        >
                          {selectedDealRow.masterContractSigned ? 'Đã ký 2 bên' : 'Chờ ký'}
                        </span>
                        {selectedDealRow.frameworkRecord && onQuickViewRecord && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Eye}
                            onClick={() => onQuickViewRecord(selectedDealRow.frameworkRecord!)}
                          >
                            Xem văn bản
                          </Button>
                        )}
                        {selectedDealRow.frameworkRecord && onOpenContractRecord && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={FileText}
                            onClick={() => {
                              setSelectedDealRow(null);
                              onOpenContractRecord(selectedDealRow.frameworkRecord!.id);
                            }}
                          >
                            Chi tiết
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 2. Danh sách Phụ lục SOW */}
                    {selectedDealRow.sowRecords.length > 0 ? (
                      selectedDealRow.sowRecords.map((sowRec, idx) => {
                        const isSowCompleted = sowRec.signing.some((s) => s.status === 'COMPLETED');
                        const code = sowRec.contractSystem?.contractCode || sowRec.title;
                        return (
                          <div
                            key={sowRec.id}
                            className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-ink">
                                  Phụ lục SOW {idx > 0 ? `(Bổ sung #${idx + 1})` : ''}
                                </span>
                                <span className="font-code text-ink-2">{code}</span>
                              </div>
                              <span className="block text-2xs text-ink-3 truncate">
                                {sowRec.title} ({sowRec.templateId} · v{sowRec.version})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-2xs font-medium ${
                                  isSowCompleted ? 'text-positive' : 'text-warning'
                                }`}
                              >
                                {isSowCompleted ? 'Đã ký 2 bên' : 'Chờ ký'}
                              </span>
                              {onQuickViewRecord && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={Eye}
                                  onClick={() => onQuickViewRecord(sowRec)}
                                >
                                  Xem văn bản
                                </Button>
                              )}
                              {onOpenContractRecord && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={FileText}
                                  onClick={() => {
                                    setSelectedDealRow(null);
                                    onOpenContractRecord(sowRec.id);
                                  }}
                                >
                                  Chi tiết
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink">Phụ lục SOW</span>
                            <span className="font-code text-ink-2">{selectedDealRow.sowCode}</span>
                          </div>
                          <span className="block text-2xs text-ink-3">
                            Phụ lục đặt hàng Booking của deal {selectedDealRow.dealCode}
                          </span>
                        </div>
                        <span
                          className={`text-2xs font-medium ${
                            selectedDealRow.sowSigned ? 'text-positive' : 'text-warning'
                          }`}
                        >
                          {selectedDealRow.sowSigned ? 'Đã ký 2 bên' : 'Chờ ký'}
                        </span>
                      </div>
                    )}

                    {/* 3. Biên bản nghiệm thu BBNT */}
                    {selectedDealRow.bbntRecords.length > 0 ? (
                      selectedDealRow.bbntRecords.map((bbntRec) => {
                        const isBbntCompleted = bbntRec.signing.some((s) => s.status === 'COMPLETED');
                        const code = bbntRec.contractSystem?.contractCode || bbntRec.title;
                        return (
                          <div
                            key={bbntRec.id}
                            className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-ink">Biên bản nghiệm thu</span>
                                <span className="font-code text-ink-2">{code}</span>
                              </div>
                              <span className="block text-2xs text-ink-3 truncate">
                                {bbntRec.title} ({bbntRec.templateId} · v{bbntRec.version})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-2xs font-medium ${
                                  isBbntCompleted ? 'text-positive' : 'text-warning'
                                }`}
                              >
                                {isBbntCompleted ? 'Đã ký 2 bên' : 'Chờ ký'}
                              </span>
                              {onQuickViewRecord && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={Eye}
                                  onClick={() => onQuickViewRecord(bbntRec)}
                                >
                                  Xem văn bản
                                </Button>
                              )}
                              {onOpenContractRecord && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={FileText}
                                  onClick={() => {
                                    setSelectedDealRow(null);
                                    onOpenContractRecord(bbntRec.id);
                                  }}
                                >
                                  Chi tiết
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink">Biên bản nghiệm thu</span>
                            <span className="font-code text-ink-2">{selectedDealRow.bbntCode}</span>
                          </div>
                          <span className="block text-2xs text-ink-3">
                            Biên bản nghiệm thu quyết toán deal {selectedDealRow.dealCode}
                          </span>
                        </div>
                        <span
                          className={`text-2xs font-medium ${
                            selectedDealRow.bbntSigned
                              ? 'text-positive'
                              : selectedDealRow.bbntCode !== '—'
                                ? 'text-warning'
                                : 'text-ink-3'
                          }`}
                        >
                          {selectedDealRow.bbntSigned
                            ? 'Đã ký 2 bên'
                            : selectedDealRow.bbntCode !== '—'
                              ? 'Chờ ký'
                              : 'Chưa lập'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Khối 2: Nghiệm thu & hạng mục công việc */}
                  <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        Nghiệm thu &amp; hạng mục công việc
                      </span>
                      <span
                        className={`text-2xs font-medium ${
                          selectedDealRow.isAcceptedAll ? 'text-positive' : 'text-warning'
                        }`}
                      >
                        {selectedDealRow.acceptanceStageLabel}
                      </span>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Sản phẩm</dt>
                        <dd className="font-medium text-ink text-right">
                          {selectedDealRow.productName}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 items-center">
                        <dt className="text-ink-3">Chuyên viên PIC</dt>
                        <dd className="text-ink text-right">
                          <Person name={selectedDealRow.picName} size={20} />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Ngày lên sóng</dt>
                        <dd className="font-code text-ink text-right">
                          {selectedDealRow.actualAirDate || selectedDealRow.plannedAirDate || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Video nghiệm thu</dt>
                        <dd className="text-right">
                          {selectedDealRow.linkAir ? (
                            <a
                              href={selectedDealRow.linkAir}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                            >
                              Mở link video <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-ink-3">Chưa cập nhật</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Mã Spark Ads</dt>
                        <dd className="font-code text-ink text-right">
                          {selectedDealRow.sparkAdsCode || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Kỳ nghiệm thu chốt</dt>
                        <dd className="font-code text-ink text-right">
                          {selectedDealRow.lockedAcceptanceMonth}{' '}
                          {selectedDealRow.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
                          selectedDealRow.unlockRequestBatch === 'DOT_2_LV10_LV11'
                            ? '(Đang xin mở S40)'
                            : selectedDealRow.unlockRequestBatch === 'UNLOCKED'
                              ? '(Đã mở S40 cho sửa)'
                              : selectedDealRow.isDataLocked
                                ? `(Đã khóa sổ ${selectedDealRow.lockDate})`
                                : '(Chưa khóa sổ)'}
                        </dd>
                      </div>
                    </dl>

                    {(selectedDealRow.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
                      selectedDealRow.unlockRequestBatch === 'DOT_2_LV10_LV11' ||
                      selectedDealRow.unlockRequestReason ||
                      isFinanceActor) && (
                      <div className="pt-3 border-t border-line space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-2xs font-semibold text-ink-2">
                            Kiểm soát khóa sổ tháng (WORKDAY 3) &amp; Mở khóa sửa (S40)
                          </span>
                          {isFinanceActor && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(selectedDealRow.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
                                selectedDealRow.unlockRequestBatch === 'DOT_2_LV10_LV11') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={CheckCircle2}
                                    onClick={() =>
                                      handleUpdateDealDataLock(
                                        [selectedDealRow.dealCode],
                                        'APPROVE_S40_UNLOCK',
                                      )
                                    }
                                  >
                                    Duyệt mở khóa S40
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                      handleUpdateDealDataLock(
                                        [selectedDealRow.dealCode],
                                        'REJECT_S40_UNLOCK',
                                      )
                                    }
                                  >
                                    Từ chối mở S40
                                  </Button>
                                </>
                              )}
                              {(!selectedDealRow.isDataLocked ||
                                selectedDealRow.unlockRequestBatch === 'UNLOCKED') && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    handleUpdateDealDataLock(
                                      [selectedDealRow.dealCode],
                                      'LOCK_DATA',
                                    )
                                  }
                                >
                                  {selectedDealRow.unlockRequestBatch === 'UNLOCKED'
                                    ? 'Khóa lại sổ Deal'
                                    : 'Khóa sổ Deal'}
                                </Button>
                              )}
                              {selectedDealRow.isDataLocked &&
                                selectedDealRow.unlockRequestBatch === 'NONE' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleUpdateDealDataLock(
                                        [selectedDealRow.dealCode],
                                        'APPROVE_S40_UNLOCK',
                                      )
                                    }
                                  >
                                    Mở khóa S40 cho sửa
                                  </Button>
                                )}
                            </div>
                          )}
                        </div>
                        {(selectedDealRow.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
                          selectedDealRow.unlockRequestBatch === 'DOT_2_LV10_LV11' ||
                          selectedDealRow.unlockRequestReason) && (
                          <div className="rounded-lg border border-line bg-sunken px-3 py-2 text-2xs text-ink-2 space-y-1">
                            <div>
                              <span className="text-ink-3">Đợt xin mở khóa: </span>
                              <span className="font-medium text-warning">
                                {selectedDealRow.unlockRequestBatch === 'DOT_1_LV4_LV5'
                                  ? 'Đợt 1 (Ngày làm việc 4–5)'
                                  : selectedDealRow.unlockRequestBatch === 'DOT_2_LV10_LV11'
                                    ? 'Đợt 2 (Ngày làm việc 10–11)'
                                    : 'Đã mở khóa sửa'}
                              </span>
                            </div>
                            {selectedDealRow.unlockRequestReason && (
                              <div>
                                <span className="text-ink-3">Lý do chuyên viên trình: </span>
                                <span className="text-ink">
                                  {selectedDealRow.unlockRequestReason}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDealRow.dealJobs.length > 0 && (
                      <div className="pt-3 border-t border-line space-y-2">
                        <span className="text-2xs font-semibold text-ink-3 block">
                          Hạng mục trong SOW ({selectedDealRow.dealJobs.length})
                        </span>
                        <div className="divide-y divide-line border border-line rounded-lg">
                          {selectedDealRow.dealJobs.map((job, idx) => (
                            <div
                              key={job.id || idx}
                              className="px-3 py-2 flex items-center justify-between gap-2"
                            >
                              <span className="truncate text-ink">
                                {job.jobTitle || job.productName || selectedDealRow.productName}
                              </span>
                              <span className="font-code text-ink-2 tabular-nums shrink-0">
                                {formatVnd((job.videoAssetNetCost || 0) + (job.addonServicesNetCost || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDealRow.addonServices.length > 0 && (
                      <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
                        <span className="text-ink-3">Quyền lợi đi kèm:</span>
                        <span>
                          {selectedDealRow.addonServices
                            .map((ad) => `${ad.termLabel} (${formatVnd(ad.allocatedCostVnd || 0)})`)
                            .join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CỘT PHỤ 340PX: Chung một khung, ngăn bằng đường kẻ mảnh (DESIGN_SYSTEM.md §7 Rule 14) */}
                <div className="rounded-xl border border-line bg-surface divide-y divide-line">
                  {/* Khối 1: Thụ hưởng */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        Thụ hưởng ({selectedDealRow.legalProfileCode})
                      </span>
                      {isFinanceActor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={revealSensitive ? EyeOff : Eye}
                          onClick={() => setRevealSensitive((v) => !v)}
                        >
                          {revealSensitive ? 'Ẩn số' : 'Hiện số'}
                        </Button>
                      )}
                    </div>

                    <dl className="space-y-2">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Loại hình</dt>
                        <dd className="text-ink text-right">{selectedDealRow.legalTypeLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Số CCCD / MST</dt>
                        <dd className="font-code font-medium text-ink text-right">
                          {maskSensitiveNumber(selectedDealRow.taxCodeOrCccd, revealSensitive)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Ngân hàng</dt>
                        <dd className="text-ink text-right">{selectedDealRow.bankName || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Số tài khoản</dt>
                        <dd className="font-code font-medium text-ink text-right">
                          {maskSensitiveNumber(selectedDealRow.bankAccount, revealSensitive)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Chủ tài khoản</dt>
                        <dd className="font-medium text-ink text-right">
                          {selectedDealRow.bankHolder || '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDealModalTab('LEGAL_ID_DOCS')}
                      >
                        Xem CCCD / ĐKKD ({selectedDealRow.legalAttachments.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Copy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedDealRow.transferNote);
                            onNotify?.('Đã sao chép nội dung chuyển khoản.', 'success');
                          } catch {
                            onNotify?.('Không thể sao chép.', 'error');
                          }
                        }}
                      >
                        Chép ND CK
                      </Button>
                    </div>
                  </div>

                  {/* Khối 2: Đối soát thanh toán */}
                  <div className="p-4 space-y-2">
                    <span className="font-semibold text-ink block">Đối soát thanh toán</span>
                    <dl className="space-y-2 tabular-nums">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Tổng ngân sách Gross</dt>
                        <dd className="font-code text-ink">
                          {formatVnd(selectedDealRow.grossAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Thuế khấu trừ</dt>
                        <dd className="font-code text-ink-2">
                          -{formatVnd(selectedDealRow.taxAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Thực nhận Net</dt>
                        <dd className="font-code font-medium text-ink">
                          {formatVnd(selectedDealRow.effectiveNetAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Đã tạm ứng đợt 1</dt>
                        <dd className="font-code text-ink-2">
                          -{formatVnd(selectedDealRow.advanceAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 pt-2 border-t border-line">
                        <dt className="font-semibold text-ink">Còn phải chi đợt 2</dt>
                        <dd className="font-code font-semibold text-accent">
                          {formatVnd(selectedDealRow.remainingNetToPay)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Khối 3: Đồng bộ phiếu Lark */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">Đồng bộ phiếu Lark</span>
                      <Status tone={selectedDealRow.settlementStatusTone}>
                        {selectedDealRow.settlementStatusLabel}
                      </Status>
                    </div>

                    <dl className="space-y-2">
                      <div className="flex justify-between gap-2 items-center">
                        <dt className="text-ink-3">Phiếu tạm ứng</dt>
                        <dd className="font-code text-ink text-right">
                          {selectedDealRow.advanceSlipCode !== '—' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const found = allSlips.find(
                                  (s) =>
                                    s.slipCode.toUpperCase() ===
                                    selectedDealRow.advanceSlipCode.toUpperCase(),
                                );
                                if (found) {
                                  const dealCode = selectedDealRow.dealCode;
                                  setSelectedDealRow(null);
                                  openSlipModal(found, 'SLIP_DOSSIER', dealCode);
                                }
                              }}
                            >
                              {selectedDealRow.advanceSlipCode} ({selectedDealRow.advanceStatusLabel}) →
                            </Button>
                          ) : (
                            <span>
                              {selectedDealRow.advanceSlipCode} ({selectedDealRow.advanceStatusLabel})
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 items-center">
                        <dt className="text-ink-3">Phiếu thanh toán</dt>
                        <dd className="font-code text-ink text-right">
                          {selectedDealRow.settlementSlipCode !== '—' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const found = allSlips.find(
                                  (s) =>
                                    s.slipCode.toUpperCase() ===
                                    selectedDealRow.settlementSlipCode.toUpperCase(),
                                );
                                if (found) {
                                  const dealCode = selectedDealRow.dealCode;
                                  setSelectedDealRow(null);
                                  openSlipModal(found, 'SLIP_DOSSIER', dealCode);
                                }
                              }}
                            >
                              {selectedDealRow.settlementSlipCode} →
                            </Button>
                          ) : (
                            <span>{selectedDealRow.settlementSlipCode}</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Mã Lark Approval</dt>
                        <dd className="font-code text-ink-2 text-right">
                          {selectedDealRow.settlementLarkInstanceCode !== '—'
                            ? selectedDealRow.settlementLarkInstanceCode
                            : selectedDealRow.advanceLarkInstanceCode}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Mã Bill UNC</dt>
                        <dd className="font-code font-medium text-positive text-right">
                          {selectedDealRow.uncBillCode || 'Chưa cập nhật'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            ) : (
              <LegalAttachmentsPanel
                title={`Giấy tờ CCCD / ĐKKD của ${selectedDealRow.kocName} (${selectedDealRow.legalProfileCode})`}
                attachments={selectedDealRow.legalAttachments}
                editable={false}
                defaultExpandPreview
              />
            )}
          </div>
        )}
      </Modal>

      {/* Modal 2: Đối chiếu Hồ sơ Phiếu Thanh toán / Tạm ứng — Bố cục 2 cột chuẩn §7 Rule 14 */}
      <Modal
        open={Boolean(selectedSlip)}
        onClose={() => setSelectedSlip(null)}
        title={
          selectedSlip
            ? `Đối chiếu phiếu ${selectedSlip.slipCode} · ${selectedSlip.payee.kocStageName} (${selectedSlip.requestType === 'ADVANCE' ? 'Tạm ứng đợt 1' : 'Quyết toán'})`
            : 'Đối chiếu phiếu thanh toán'
        }
        size="xl"
        footer={
          selectedSlip && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <span className="text-2xs text-ink-3">
                Luồng duyệt: <span className="text-ink-2">{selectedSlip.approvalRoute.routeSummary}</span>
              </span>
              <div className="flex items-center gap-2">
                {isFinanceActor &&
                  selectedSlip.larkSync.approvalStatus !== 'PAID' &&
                  selectedSlip.larkSync.approvalStatus !== 'REJECTED' &&
                  !selectedSlip.larkSync.daDiTien && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={slipActionBusy}
                      onClick={() => setRejectSlipTarget(selectedSlip)}
                    >
                      Từ chối phiếu
                    </Button>
                  )}
                {isFinanceActor &&
                (selectedSlip.larkSync.approvalStatus === 'PENDING_LEADER' ||
                  selectedSlip.larkSync.approvalStatus === 'PENDING_DIRECTOR' ||
                  selectedSlip.larkSync.approvalStatus === 'PENDING_FINANCE') ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedSlip(null)}
                    >
                      Đóng
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={CheckCircle2}
                      disabled={slipActionBusy}
                      onClick={() => void handleSlipDecision(selectedSlip, 'ADVANCE_STEP')}
                    >
                      {slipActionBusy ? 'Đang xử lý...' : 'Duyệt kế toán'}
                    </Button>
                  </>
                ) : isFinanceActor &&
                  selectedSlip.larkSync.approvalStatus === 'APPROVED' &&
                  !selectedSlip.larkSync.daDiTien ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedSlip(null)}
                    >
                      Đóng
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={CheckCircle2}
                      disabled={slipActionBusy}
                      onClick={() =>
                        void handleSlipDecision(selectedSlip, 'ADVANCE_STEP', {
                          uncBillCode: slipUncInput,
                        })
                      }
                    >
                      {slipActionBusy ? 'Đang lưu...' : 'Xác nhận đi tiền'}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setSelectedSlip(null)}
                  >
                    Đóng
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedSlip && (() => {
          const activeLine =
            selectedSlip.lineItems.find(
              (l) => l.dealCode.toUpperCase() === selectedSlipDealCode.toUpperCase(),
            ) || selectedSlip.lineItems[0];
          const activeDealRow = activeLine
            ? dealRowByCode.get(activeLine.dealCode.toUpperCase())
            : undefined;
          const slipLegalAttachments = activeDealRow?.legalAttachments || [];
          const slipSigningHistory = activeDealRow?.signingHistory;
          const isBbntRequired = Boolean(
            activeLine?.isBbntMandatory ||
              (activeDealRow &&
                (activeDealRow.grossAmount >= 20_000_000 ||
                  activeDealRow.droppedDeductionAmount > 0 ||
                  activeDealRow.legalTypeLabel !== 'Cá nhân')),
          );
          const isContractRequired = Boolean(
            activeLine?.isContractMandatory ||
              (activeDealRow &&
                (activeDealRow.advanceAmount >= 2_000_000 ||
                  activeDealRow.grossAmount >= 10_000_000 ||
                  activeDealRow.legalTypeLabel !== 'Cá nhân')),
          );
          const isInvoiceRequired = Boolean(
            selectedSlip.payee.subjectKind === 'HKD' ||
              selectedSlip.payee.subjectKind === 'COM' ||
              (activeDealRow && activeDealRow.legalTypeLabel !== 'Cá nhân'),
          );
          const currentInvoiceCode =
            activeDealRow?.invoiceNumber || activeLine?.invoiceNumber || '—';
          const currentSlipIdx = filteredSlips.findIndex((s) => s.id === selectedSlip.id);
          const prevSlip = currentSlipIdx > 0 ? filteredSlips[currentSlipIdx - 1] : null;
          const nextSlip =
            currentSlipIdx >= 0 && currentSlipIdx < filteredSlips.length - 1
              ? filteredSlips[currentSlipIdx + 1]
              : null;

          const gate1ContractSowOk = Boolean(
            activeDealRow?.sowSigned &&
              (!isContractRequired || activeDealRow?.masterContractSigned),
          );
          const gate2BbntOk =
            selectedSlip.requestType === 'ADVANCE'
              ? true
              : Boolean(activeDealRow?.bbntSigned || !isBbntRequired);
          const gate3PayeeInvoiceOk = Boolean(
            selectedSlip.payee.bankAccount &&
              selectedSlip.payee.legalId &&
              (!isInvoiceRequired || currentInvoiceCode !== '—'),
          );

          return (
            <div className="space-y-4 text-xs">
              {slipSigningHistory && (
                <LegalProfileSigningHistoryBanner summary={slipSigningHistory} />
              )}

              {/* Thanh 4 cổng kiểm tra tự động (Recognition rather than recall — Nielsen #6) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs text-ink-3">Hợp đồng &amp; SOW</span>
                    <Status tone={gate1ContractSowOk ? 'positive' : 'warning'}>
                      {gate1ContractSowOk ? 'Đạt' : 'Cần kiểm tra'}
                    </Status>
                  </div>
                  <span className="font-medium text-ink block truncate">
                    {activeDealRow?.masterContractSigned
                      ? 'Đã ký HĐNT'
                      : isContractRequired
                        ? 'Chờ ký HĐNT'
                        : 'Miễn HĐNT (<10tr)'}{' '}
                    · {activeDealRow?.sowSigned ? 'Đã ký SOW' : 'Chờ ký SOW'}
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs text-ink-3">Nghiệm thu &amp; BBNT</span>
                    <Status tone={gate2BbntOk ? 'positive' : 'warning'}>
                      {selectedSlip.requestType === 'ADVANCE'
                        ? 'Tạm ứng'
                        : activeDealRow?.bbntSigned
                          ? 'Đã ký BBNT'
                          : !isBbntRequired
                            ? 'Miễn BBNT'
                            : 'Thiếu BBNT'}
                    </Status>
                  </div>
                  <span className="font-medium text-ink block truncate">
                    {selectedSlip.requestType === 'ADVANCE'
                      ? 'Đối soát BBNT ở kỳ quyết toán'
                      : activeDealRow?.bbntSigned
                        ? activeDealRow.bbntCode
                        : !isBbntRequired
                          ? 'Tự động nghiệm thu (<20tr, khớp SOW)'
                          : 'Bắt buộc BBNT (≥20tr / lệch SOW)'}
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs text-ink-3">Pháp nhân &amp; hóa đơn</span>
                    <Status tone={gate3PayeeInvoiceOk ? 'positive' : 'warning'}>
                      {gate3PayeeInvoiceOk ? 'Đủ thông tin' : 'Thiếu HĐơn/STK'}
                    </Status>
                  </div>
                  <span className="font-medium text-ink block truncate">
                    {activeDealRow?.legalTypeLabel || selectedSlip.payee.subjectLabel} · HĐơn:{' '}
                    <span className="font-code">{currentInvoiceCode}</span>
                  </span>
                </div>

                <div className="rounded-lg border border-line bg-sunken/40 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs text-ink-3">Công nợ &amp; thực chuyển</span>
                    <Status tone="positive">
                      {selectedSlip.totals.advancePaidTotal > 0 ? 'Có trừ tạm ứng' : 'Thanh toán 1 lần'}
                    </Status>
                  </div>
                  <span className="font-code font-semibold text-ink block truncate tabular-nums">
                    {formatVnd(selectedSlip.totals.netTransferTotal)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    value={slipModalTab}
                    onChange={(v) => setSlipModalTab(v)}
                    items={[
                      {
                        key: 'SLIP_DOSSIER',
                        label: `Deal, hợp đồng & nghiệm thu (${selectedSlip.lineItems.length})`,
                      },
                      {
                        key: 'SLIP_LEGAL_DOCS',
                        label: `Giấy tờ CCCD / ĐKKD (${slipLegalAttachments.length})`,
                      },
                    ]}
                  />

                  {selectedSlip.lineItems.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedSlip.lineItems.map((line) => {
                        const isCurrent =
                          line.dealCode.toUpperCase() ===
                          (activeLine?.dealCode || '').toUpperCase();
                        return (
                          <Button
                            key={line.dealId}
                            size="sm"
                            variant={isCurrent ? 'secondary' : 'ghost'}
                            onClick={() => setSelectedSlipDealCode(line.dealCode)}
                          >
                            {line.dealCode} · {formatVnd(line.netTransferAmount)}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {filteredSlips.length > 1 && currentSlipIdx >= 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xs text-ink-3 tabular-nums">
                      Phiếu {currentSlipIdx + 1} / {filteredSlips.length}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={ChevronLeft}
                      disabled={!prevSlip}
                      onClick={() => prevSlip && openSlipModal(prevSlip, slipModalTab)}
                    >
                      Trước
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={ChevronRight}
                      disabled={!nextSlip}
                      onClick={() => nextSlip && openSlipModal(nextSlip, slipModalTab)}
                    >
                      Tiếp
                    </Button>
                  </div>
                )}
              </div>

              {slipModalTab === 'SLIP_DOSSIER' ? (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-5 items-start">
                  {/* CỘT CHÍNH: Bộ chứng từ (HĐNT · Phụ lục SOW · BBNT nếu có) + Thông tin Deal & Nghiệm thu */}
                  <div className="space-y-4 min-w-0">
                    {/* Khối 1: Đối chiếu bộ chứng từ hợp đồng của Deal trong phiếu */}
                    <div className="rounded-xl border border-line bg-surface divide-y divide-line">
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-ink">
                          Bộ chứng từ pháp lý của Deal {activeLine?.dealCode || '—'} (HĐNT · Phụ lục SOW · BBNT)
                        </span>
                        <span className="text-2xs text-ink-3">
                          Hóa đơn:{' '}
                          <strong className="font-code text-ink">
                            {currentInvoiceCode}
                          </strong>
                        </span>
                      </div>

                      {/* Hợp đồng nguyên tắc (HĐNT) */}
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-ink">Hợp đồng nguyên tắc</span>
                            <span className="font-code text-ink-2">
                              {activeDealRow?.masterContractCode || activeLine?.masterContractCode || '—'}
                            </span>
                          </div>
                          <span className="block text-2xs text-ink-3 truncate">
                            {isContractRequired
                              ? 'Bắt buộc ký HĐNT theo ngưỡng BR-03 (Tạm ứng ≥ 2tr hoặc Gross ≥ 10tr / HKD / Công ty)'
                              : 'Dưới ngưỡng 10tr Gross & không tạm ứng ≥ 2tr: Miễn ký HĐ theo BR-03'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-2xs font-medium ${
                              activeDealRow?.masterContractSigned
                                ? 'text-positive'
                                : isContractRequired
                                  ? 'text-warning'
                                  : 'text-ink-2'
                            }`}
                          >
                            {activeDealRow?.masterContractSigned
                              ? 'Đã ký 2 bên'
                              : isContractRequired
                                ? 'Chờ ký'
                                : 'Miễn ký HĐ'}
                          </span>
                          {activeDealRow?.frameworkRecord && onQuickViewRecord && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Eye}
                              onClick={() => onQuickViewRecord(activeDealRow.frameworkRecord!)}
                            >
                              Xem văn bản
                            </Button>
                          )}
                          {activeDealRow?.frameworkRecord && onOpenContractRecord && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={FileText}
                              onClick={() => {
                                setSelectedSlip(null);
                                onOpenContractRecord(activeDealRow.frameworkRecord!.id);
                              }}
                            >
                              Chi tiết
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Phụ lục hợp đồng (SOW) */}
                      {activeDealRow && activeDealRow.sowRecords.length > 0 ? (
                        activeDealRow.sowRecords.map((sowRec, idx) => {
                          const isSowCompleted = sowRec.signing.some(
                            (s) => s.status === 'COMPLETED',
                          );
                          const code = sowRec.contractSystem?.contractCode || sowRec.title;
                          return (
                            <div
                              key={sowRec.id}
                              className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-ink">
                                    Phụ lục SOW {idx > 0 ? `(Bổ sung #${idx + 1})` : ''}
                                  </span>
                                  <span className="font-code text-ink-2">{code}</span>
                                </div>
                                <span className="block text-2xs text-ink-3 truncate">
                                  {sowRec.title} · Định mức Net SOW:{' '}
                                  <strong className="font-code text-ink-2">
                                    {formatVnd(activeDealRow.sowNetAmount)}
                                  </strong>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-2xs font-medium ${
                                    isSowCompleted ? 'text-positive' : 'text-warning'
                                  }`}
                                >
                                  {isSowCompleted ? 'Đã ký 2 bên' : 'Chờ ký'}
                                </span>
                                {onQuickViewRecord && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Eye}
                                    onClick={() => onQuickViewRecord(sowRec)}
                                  >
                                    Xem văn bản
                                  </Button>
                                )}
                                {onOpenContractRecord && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={FileText}
                                    onClick={() => {
                                      setSelectedSlip(null);
                                      onOpenContractRecord(sowRec.id);
                                    }}
                                  >
                                    Chi tiết
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">Phụ lục SOW</span>
                              <span className="font-code text-ink-2">
                                {activeDealRow?.sowCode || activeLine?.contractAppendixCode || '—'}
                              </span>
                            </div>
                            <span className="block text-2xs text-ink-3">
                              Định mức Net theo Phụ lục SOW:{' '}
                              <strong className="font-code text-ink-2">
                                {formatVnd(
                                  activeDealRow?.sowNetAmount ||
                                    activeLine?.agreedNetAmount ||
                                    0,
                                )}
                              </strong>
                            </span>
                          </div>
                          <span
                            className={`text-2xs font-medium ${
                              activeDealRow?.sowSigned ? 'text-positive' : 'text-warning'
                            }`}
                          >
                            {activeDealRow?.sowSigned ? 'Đã ký 2 bên' : 'Chờ ký'}
                          </span>
                        </div>
                      )}

                      {/* Biên bản nghiệm thu (BBNT — nếu có hoặc kiểm tra điều kiện bắt buộc) */}
                      {activeDealRow && activeDealRow.bbntRecords.length > 0 ? (
                        activeDealRow.bbntRecords.map((bbntRec) => {
                          const isBbntCompleted = bbntRec.signing.some(
                            (s) => s.status === 'COMPLETED',
                          );
                          const code = bbntRec.contractSystem?.contractCode || bbntRec.title;
                          return (
                            <div
                              key={bbntRec.id}
                              className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-ink">
                                    Biên bản nghiệm thu (BBNT)
                                  </span>
                                  <span className="font-code text-ink-2">{code}</span>
                                </div>
                                <span className="block text-2xs text-ink-3 truncate">
                                  {bbntRec.title} ({bbntRec.templateId} · v{bbntRec.version})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-2xs font-medium ${
                                    isBbntCompleted ? 'text-positive' : 'text-warning'
                                  }`}
                                >
                                  {isBbntCompleted ? 'Đã ký 2 bên' : 'Chờ ký'}
                                </span>
                                {onQuickViewRecord && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Eye}
                                    onClick={() => onQuickViewRecord(bbntRec)}
                                  >
                                    Xem văn bản
                                  </Button>
                                )}
                                {onOpenContractRecord && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={FileText}
                                    onClick={() => {
                                      setSelectedSlip(null);
                                      onOpenContractRecord(bbntRec.id);
                                    }}
                                  >
                                    Chi tiết
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">
                                Biên bản nghiệm thu (BBNT)
                              </span>
                              <span className="font-code text-ink-2">
                                {activeDealRow?.bbntCode && activeDealRow.bbntCode !== '—'
                                  ? activeDealRow.bbntCode
                                  : isBbntRequired
                                    ? 'Chưa gắn mã BBNT'
                                    : 'Miễn lập BBNT'}
                              </span>
                            </div>
                            <span className="block text-2xs text-ink-3">
                              {selectedSlip.requestType === 'ADVANCE'
                                ? 'Phiếu tạm ứng đợt 1 — Chưa đến bước nghiệm thu BBNT'
                                : isBbntRequired
                                  ? 'Bắt buộc có BBNT đã ký (Gross ≥ 20tr hoặc nghiệm thu lệch SOW / HKD / Công ty)'
                                  : 'Tự động nghiệm thu (< 20tr & khớp 100% Phụ lục SOW theo quy tắc BR-04)'}
                            </span>
                          </div>
                          <span
                            className={`text-2xs font-medium ${
                              activeDealRow?.bbntSigned
                                ? 'text-positive'
                                : selectedSlip.requestType === 'ADVANCE'
                                  ? 'text-ink-3'
                                  : !isBbntRequired
                                    ? 'text-positive'
                                    : 'text-warning'
                            }`}
                          >
                            {activeDealRow?.bbntSigned
                              ? 'Đã ký 2 bên'
                              : selectedSlip.requestType === 'ADVANCE'
                                ? 'Đối soát khi tất toán'
                                : !isBbntRequired
                                  ? 'Tự động nghiệm thu'
                                  : 'Cần bổ sung BBNT'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Khối 2: Chi tiết Deal, Hạng mục SOW (Jobs & Assets) & Bằng chứng Nghiệm thu */}
                    <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-ink">
                          Thông tin Deal {activeLine?.dealCode} &amp; bằng chứng nghiệm thu
                        </span>
                        {activeDealRow && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSlip(null);
                              openDealModal(activeDealRow, 'DOSSIER_AND_PAYMENT');
                            }}
                          >
                            Mở sổ chi tiết deal →
                          </Button>
                        )}
                      </div>

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Nhãn hàng · Gian hàng</dt>
                          <dd className="font-medium text-ink text-right truncate">
                            {activeDealRow?.brandName || activeLine?.brandName || '—'} ·{' '}
                            {activeDealRow?.storeName || activeLine?.storeName || '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Sản phẩm</dt>
                          <dd className="font-medium text-ink text-right truncate">
                            {activeDealRow?.productName || activeLine?.productName || '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2 items-center">
                          <dt className="text-ink-3">Chuyên viên PIC</dt>
                          <dd className="text-ink text-right">
                            <Person
                              name={
                                activeDealRow?.picName ||
                                activeLine?.bookingPic ||
                                selectedSlip.createdBy
                              }
                              size={20}
                            />
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Kỳ nghiệm thu chốt</dt>
                          <dd className="font-code text-ink text-right">
                            {activeDealRow?.lockedAcceptanceMonth || selectedSlip.month}{' '}
                            {activeDealRow?.isDataLocked ? '(Đã khóa sổ)' : ''}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Ngày lên sóng (Air)</dt>
                          <dd className="font-code text-ink text-right">
                            {activeDealRow?.actualAirDate ||
                              activeLine?.postedDate ||
                              activeDealRow?.plannedAirDate ||
                              '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Link video nghiệm thu</dt>
                          <dd className="text-right">
                            {activeDealRow?.linkAir || activeLine?.linkAir ? (
                              <a
                                href={activeDealRow?.linkAir || activeLine?.linkAir}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                              >
                                Kiểm tra link air <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-ink-3">Chưa cập nhật</span>
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Mã Spark Ads</dt>
                          <dd className="font-code text-ink text-right">
                            {activeDealRow?.sparkAdsCode || activeLine?.sparkAdsCode || '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Trạng thái nghiệm thu</dt>
                          <dd className="font-medium text-ink text-right">
                            {activeDealRow?.acceptanceStageLabel || 'Đã nghiệm thu'}
                          </dd>
                        </div>
                      </dl>

                      {activeDealRow && activeDealRow.dealJobs.length > 0 && (
                        <div className="pt-3 border-t border-line space-y-2">
                          <span className="text-2xs font-semibold text-ink-3 block">
                            Các Job &amp; hạng mục công việc trong Deal ({activeDealRow.dealJobs.length})
                          </span>
                          <div className="divide-y divide-line border border-line rounded-lg">
                            {activeDealRow.dealJobs.map((job, idx) => (
                              <div
                                key={job.id || idx}
                                className="px-3 py-2 flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-ink">
                                  {job.jobTitle || job.productName || activeDealRow.productName}
                                </span>
                                <span className="font-code text-ink-2 tabular-nums shrink-0">
                                  {formatVnd(
                                    (job.videoAssetNetCost || 0) + (job.addonServicesNetCost || 0),
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeDealRow && activeDealRow.addonServices.length > 0 && (
                        <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
                          <span className="text-ink-3">Quyền lợi / Addon đi kèm:</span>
                          <span>
                            {activeDealRow.addonServices
                              .map((ad) => `${ad.termLabel} (${formatVnd(ad.allocatedCostVnd || 0)})`)
                              .join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CỘT PHỤ 350PX: Thụ hưởng + Đối soát Công nợ (SOW - Hủy - Tạm ứng = Thực chuyển) + Xác nhận UNC */}
                  <div className="rounded-xl border border-line bg-surface divide-y divide-line">
                    {/* Khối 1: Định danh thụ hưởng */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">
                          Thụ hưởng ({activeDealRow?.legalProfileCode || selectedSlip.payee.subjectKind})
                        </span>
                        {isFinanceActor && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={revealSensitive ? EyeOff : Eye}
                            onClick={() => setRevealSensitive((v) => !v)}
                          >
                            {revealSensitive ? 'Ẩn số' : 'Hiện số'}
                          </Button>
                        )}
                      </div>

                      <dl className="space-y-2">
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Đối tác KOC</dt>
                          <dd className="font-medium text-ink text-right">
                            {selectedSlip.payee.kocStageName} ({selectedSlip.payee.kocChannelId})
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Loại hình pháp lý</dt>
                          <dd className="text-ink text-right">
                            {activeDealRow?.legalTypeLabel || selectedSlip.payee.subjectLabel}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Số CCCD / MST</dt>
                          <dd className="font-code font-medium text-ink text-right">
                            {maskSensitiveNumber(selectedSlip.payee.legalId, revealSensitive)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Ngân hàng</dt>
                          <dd className="text-ink text-right">
                            {selectedSlip.payee.bankName || '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Số tài khoản</dt>
                          <dd className="font-code font-medium text-ink text-right">
                            {maskSensitiveNumber(selectedSlip.payee.bankAccount, revealSensitive)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Chủ tài khoản</dt>
                          <dd className="font-code font-medium text-ink text-right">
                            {selectedSlip.payee.bankHolder || '—'}
                          </dd>
                        </div>
                      </dl>

                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSlipModalTab('SLIP_LEGAL_DOCS')}
                        >
                          Xem CCCD / ĐKKD ({slipLegalAttachments.length})
                        </Button>
                        <div className="flex flex-wrap items-center gap-1">
                          {selectedSlip.payee.bankAccount && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Copy}
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    selectedSlip.payee.bankAccount,
                                  );
                                  onNotify?.('Đã sao chép số tài khoản ngân hàng.', 'success');
                                } catch {
                                  onNotify?.('Không thể sao chép.', 'error');
                                }
                              }}
                            >
                              Chép STK
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Copy}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  selectedSlip.transferTitle ||
                                    activeDealRow?.transferNote ||
                                    selectedSlip.slipCode,
                                );
                                onNotify?.('Đã sao chép nội dung chuyển khoản.', 'success');
                              } catch {
                                onNotify?.('Không thể sao chép.', 'error');
                              }
                            }}
                          >
                            Chép ND CK
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Khối 2: Bảng đối soát công nợ & khấu trừ tạm ứng */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">
                          Đối soát số tiền ({selectedSlip.totals.dealsCount} deal)
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Copy}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                String(selectedSlip.totals.netTransferTotal),
                              );
                              onNotify?.('Đã sao chép số tiền thực chuyển.', 'success');
                            } catch {
                              onNotify?.('Không thể sao chép.', 'error');
                            }
                          }}
                        >
                          Chép số tiền
                        </Button>
                      </div>
                      <dl className="space-y-2 tabular-nums">
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Định mức Net theo SOW</dt>
                          <dd className="font-code text-ink">
                            {formatVnd(selectedSlip.totals.agreedNetTotal)}
                          </dd>
                        </div>
                        {selectedSlip.totals.droppedDeductionTotal > 0 && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-ink-3">Khấu trừ hạng mục hủy</dt>
                            <dd className="font-code text-critical">
                              -{formatVnd(selectedSlip.totals.droppedDeductionTotal)}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Tổng giá trị Gross</dt>
                          <dd className="font-code text-ink">
                            {formatVnd(selectedSlip.totals.grossTotal)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Thuế TNCN / VAT</dt>
                          <dd className="font-code text-ink-2">
                            {formatVnd(
                              selectedSlip.totals.pitTax10PctTotal +
                                selectedSlip.totals.vatTotal,
                            )}
                          </dd>
                        </div>
                        {selectedSlip.totals.advancePaidTotal > 0 && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-ink-3">
                              Trừ tạm ứng đợt 1{' '}
                              {activeDealRow?.advanceSlipCode &&
                              activeDealRow.advanceSlipCode !== '—'
                                ? `(${activeDealRow.advanceSlipCode})`
                                : ''}
                            </dt>
                            <dd className="font-code text-warning">
                              -{formatVnd(selectedSlip.totals.advancePaidTotal)}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-2 pt-2 border-t border-line">
                          <dt className="font-semibold text-ink">Thực chuyển đợt này</dt>
                          <dd className="font-code font-semibold text-positive">
                            {formatVnd(selectedSlip.totals.netTransferTotal)}
                          </dd>
                        </div>
                      </dl>
                      {selectedSlip.totals.amountInWords && (
                        <p className="text-2xs text-ink-3 pt-1">
                          Bằng chữ: {selectedSlip.totals.amountInWords}
                        </p>
                      )}
                    </div>

                    {/* Khối 3: Trạng thái phiếu Lark & Cập nhật Bill UNC */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">Trạng thái phiếu &amp; UNC</span>
                        <Status
                          tone={
                            selectedSlip.larkSync.daDiTien ||
                            selectedSlip.larkSync.approvalStatus === 'PAID'
                              ? 'positive'
                              : selectedSlip.larkSync.approvalStatus === 'APPROVED'
                                ? 'positive'
                                : selectedSlip.larkSync.approvalStatus === 'REJECTED'
                                  ? 'critical'
                                  : 'warning'
                          }
                        >
                          {selectedSlip.larkSync.daDiTien ||
                          selectedSlip.larkSync.approvalStatus === 'PAID'
                            ? 'Hoàn tất'
                            : selectedSlip.larkSync.approvalStatus === 'APPROVED'
                              ? 'Đã duyệt'
                              : selectedSlip.larkSync.approvalStatus === 'REJECTED'
                                ? 'Cần sửa'
                                : 'Chờ duyệt'}
                        </Status>
                      </div>

                      <dl className="space-y-2">
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Mã phiếu</dt>
                          <dd className="font-code font-medium text-ink text-right">
                            {selectedSlip.slipCode}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Mã Lark Approval</dt>
                          <dd className="font-code text-ink-2 text-right">
                            {selectedSlip.larkSync.approvalInstanceCode}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Mã Bill UNC</dt>
                          <dd className="font-code font-medium text-positive text-right">
                            {selectedSlip.larkSync.uncBillCode ||
                              activeDealRow?.uncBillCode ||
                              'Chưa cập nhật'}
                          </dd>
                        </div>
                        {selectedSlip.larkSync.rejectedReason && (
                          <div className="pt-1 text-2xs text-critical">
                            Lý do từ chối: {selectedSlip.larkSync.rejectedReason}
                          </div>
                        )}
                      </dl>

                      {isFinanceActor &&
                        selectedSlip.larkSync.approvalStatus === 'APPROVED' &&
                        !selectedSlip.larkSync.daDiTien && (
                          <div className="pt-2 border-t border-line">
                            <Field label="Mã lệnh chi / Bill UNC" htmlFor="slip-unc-input">
                              <Input
                                id="slip-unc-input"
                                value={slipUncInput}
                                onChange={(e) => setSlipUncInput(e.target.value)}
                                placeholder="Nhập mã lệnh chi ngân hàng..."
                              />
                            </Field>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <LegalAttachmentsPanel
                  title={`Giấy tờ CCCD / ĐKKD của ${selectedSlip.payee.kocStageName}`}
                  attachments={slipLegalAttachments}
                  editable={false}
                  defaultExpandPreview
                />
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Hộp thoại Kế toán từ chối phiếu thanh toán */}
      {rejectSlipTarget && (
        <ConfirmDialog
          open={true}
          title={`Từ chối phiếu ${rejectSlipTarget.slipCode}`}
          tone="danger"
          confirmLabel="Từ chối phiếu"
          reason={{
            label: 'Lý do từ chối / yêu cầu bổ sung chứng từ',
            required: true,
          }}
          onConfirm={(note) =>
            void handleSlipDecision(rejectSlipTarget, 'REJECT_SLIP', {
              rejectedReason: note || '',
            })
          }
          onCancel={() => setRejectSlipTarget(null)}
          onOpenChange={(o) => !o && setRejectSlipTarget(null)}
        />
      )}
    </div>
  );
}
