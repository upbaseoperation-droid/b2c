'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import type {
  BookingDealItem,
  DealContractAppendixStatus,
  DealRightsTermItem,
  DealSowJobItem,
  KocItem,
  MediaChannelPlatform,
  UserRole,
} from '../../lib/types';

type SystemUser = {
  id?: string;
  name?: string;
  role?: UserRole;
};
import { getKocLegalProfiles } from '../koc/kocUtils';
import type { ContractRecord } from '../../lib/contracts/types';
import { extractSowPaymentScheduleAndAdvance } from '../../lib/contracts/contractRules';
import {
  formatDate,
  formatNumber,
  formatVnd,
  formatVndShort,
  getVietnamDateYmd,
  maskSensitivePii,
  parseThousandNumberInput,
} from '../../lib/format';
import {
  S40_STANDARD_UNLOCK_REASONS,
  buildBookingDealFromApprovedItem,
  buildDefaultAddonServicesForDeal,
  computeDataLockDate,
  computeDealSowJobSubtotal,
  ensureDealJobsForApprovedItem,
  formatLivestreamConfirmationSheet,
  generateBookingOrderCode,
  generateDealAppendixCode,
  generateMasterContractCode,
  isLivestreamBookingItem,
  normalizeBankHolderUpperNoAccent,
  recalculateApprovedBookingItem,
  type ApprovedBookingListItem,
  type S40AuditLogEntry,
} from '../../lib/approvedBookingList';
import { computeGrossFeeWithTax, normalizeTikTokId } from '../../lib/staffBrandListingSheet';
import { documentOfTemplate } from '../../lib/planDealLink';
import {
  computeSigningProgress,
  contractStatus,
  resolveActiveLegalProfile,
} from '../contracts/contractUi';
import {
  Button,
  Field,
  Input,
  PageActions,
  Panel,
  Person,
  Progress,
  Select,
  Stat,
  StatRow,
  Status,
  StepMark,
  Tabs,
} from '../ui';

export interface DealDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deal: ApprovedBookingListItem | null;
  initialTab?: DrawerTab;
  allDeals?: ApprovedBookingListItem[];
  kocs?: KocItem[];
  contractRecords?: ContractRecord[];
  onSelectDeal?: (deal: ApprovedBookingListItem) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onOpenDraftBbntPreview?: (deal: BookingDealItem) => void;
  onOpenAcceptanceModal?: (item: ApprovedBookingListItem) => void;
  onOpenLarkPaymentModal?: (
    item: ApprovedBookingListItem,
    requestType?: 'ADVANCE' | 'SETTLEMENT'
  ) => void;
  onOpenDealBuilderModal?: (item: ApprovedBookingListItem) => void;
  onOpenTikTokInspector?: (item: ApprovedBookingListItem) => void;
  onOpenKocProfile?: (item: ApprovedBookingListItem) => void;
  onUpdateDealFields?: (dealId: string, patch: Partial<ApprovedBookingListItem>) => void;
  onPullContractLinks?: () => void;
  isPullingContractLinks?: boolean;
  canViewFullPii?: boolean;
  currentUser?: SystemUser | null;
  currentRole?: UserRole;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type DrawerTab = 'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE';

function maskSensitive(raw?: string, showFull?: boolean): string {
  const masked = maskSensitivePii(raw, Boolean(showFull));
  return masked === '—' ? 'Chưa cập nhật' : masked;
}

export const DealDetailDrawer: React.FC<DealDetailDrawerProps> = ({
  isOpen,
  onClose,
  deal,
  initialTab,
  allDeals = [],
  kocs = [],
  contractRecords = [],
  onSelectDeal,
  onOpenContractForDeal,
  onOpenDraftBbntPreview,
  onOpenAcceptanceModal,
  onOpenLarkPaymentModal,
  onOpenTikTokInspector,
  onOpenKocProfile,
  onUpdateDealFields,
  onPullContractLinks,
  isPullingContractLinks,
  canViewFullPii = false,
  currentUser,
  currentRole,
  onNotify,
}) => {
  const effectiveRole: UserRole = currentRole || currentUser?.role || 'BOOKING_MEMBER';
  const isReadOnlyPartnerRole =
    effectiveRole === 'BRAND_PARTNER' || effectiveRole === 'BRAND_MEMBER';
  const canApproveDataUnlock =
    effectiveRole === 'ADMIN' ||
    effectiveRole === 'MANAGER' ||
    effectiveRole === 'FINANCE' ||
    effectiveRole === 'LEADER';

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab || 'OVERVIEW');

  // State cấu hình Deal & Phụ lục SOW (tích hợp trực tiếp vào màn hình lớn)
  const [dealDraftCode, setDealDraftCode] = useState<string>('');
  const [dealDraftMasterContract, setDealDraftMasterContract] = useState<string>('');
  const [dealDraftAppendixCode, setDealDraftAppendixCode] = useState<string>('');
  const [dealDraftAppendixStatus, setDealDraftAppendixStatus] =
    useState<DealContractAppendixStatus>('CHỜ_KÝ');
  const [dealDraftPlannedAirDate, setDealDraftPlannedAirDate] = useState<string>('');
  const [dealDraftVideoNetCost, setDealDraftVideoNetCost] = useState<number>(0);
  const [dealDraftPaymentSchedule, setDealDraftPaymentSchedule] = useState<
    'ONE_TIME' | 'TWO_TIMES'
  >('ONE_TIME');
  const [dealDraftAdvanceAmount, setDealDraftAdvanceAmount] = useState<number>(0);
  const [dealDraftAddons, setDealDraftAddons] = useState<DealRightsTermItem[]>([]);
  const [dealDraftJobs, setDealDraftJobs] = useState<DealSowJobItem[]>([]);
  const [activeDealDraftJobIdx, setActiveDealDraftJobIdx] = useState<number>(0);

  // Inline state cho Nghiệm thu Video & Asset đi kèm
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editingEvidenceText, setEditingEvidenceText] = useState<string>('');
  const [addingAddonJobIdx, setAddingAddonJobIdx] = useState<number | null>(null);
  const [newAddonType, setNewAddonType] = useState<DealRightsTermItem['termType']>('ADS_CODE');
  const [newAddonLabel, setNewAddonLabel] = useState<string>('');
  const [newAddonDays, setNewAddonDays] = useState<number>(30);
  const [newAddonCost, setNewAddonCost] = useState<number>(0);
  const [newAddonEvidence, setNewAddonEvidence] = useState<string>('');

  // Inline state cập nhật nhanh Link Video lên sóng
  const [editingAirJobIdx, setEditingAirJobIdx] = useState<number | null>(null);
  const [quickAirLink, setQuickAirLink] = useState<string>('');
  const [quickAirDate, setQuickAirDate] = useState<string>('');

  const [prevTabKey, setPrevTabKey] = useState<string>('');
  const currentTabKey = `${isOpen ? '1' : '0'}:${initialTab || ''}`;
  if (currentTabKey !== prevTabKey) {
    setPrevTabKey(currentTabKey);
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }

  // Đồng bộ dữ liệu Deal đang chọn vào bộ soạn thảo Deal & Bảng công việc
  const [prevDealKey, setPrevDealKey] = useState<string>('');
  const currentDealKey = deal ? `${deal.id}:${deal.updatedAt || ''}` : '';
  if (currentDealKey !== prevDealKey) {
    setPrevDealKey(currentDealKey);
    if (deal) {
      const seqIdx = allDeals.findIndex((x) => x.id === deal.id);
      const maBo =
        deal.maBooking ||
        generateBookingOrderCode(deal.thangPlan, (seqIdx >= 0 ? seqIdx : 0) + 201);
      const masterCode =
        deal.masterContractCode || generateMasterContractCode(deal.idKenh, deal.kocId);
      const appendixCode =
        deal.contractAppendixCode || generateDealAppendixCode(maBo, 1);
      const initialJobs = ensureDealJobsForApprovedItem({
        ...deal,
        maBooking: maBo,
      });
      const safeIdx = Math.min(activeDealDraftJobIdx, Math.max(0, initialJobs.length - 1));
      const currentJob = initialJobs[safeIdx] || initialJobs[0];

      setDealDraftCode(maBo);
      setDealDraftMasterContract(masterCode);
      setDealDraftAppendixCode(appendixCode);
      setDealDraftAppendixStatus(
        deal.contractAppendixStatus && deal.contractAppendixStatus !== 'CHƯA_LẬP'
          ? deal.contractAppendixStatus
          : 'CHỜ_KÝ'
      );
      setDealDraftJobs(initialJobs);
      setActiveDealDraftJobIdx(safeIdx);
      setDealDraftPlannedAirDate(
        currentJob?.plannedAirDate || deal.plannedAirDate || `${deal.thangPlan.replace('/', '-')}-20`
      );
      setDealDraftVideoNetCost(currentJob?.videoAssetNetCost ?? deal.chiPhiBookingNetCuoi ?? 0);
      setDealDraftPaymentSchedule(
        deal.paymentScheduleOption ||
          ((deal.soTienTamUngTruoc || 0) > 0 ? 'TWO_TIMES' : 'ONE_TIME')
      );
      setDealDraftAdvanceAmount(deal.soTienTamUngTruoc || 0);
      setDealDraftAddons(currentJob?.addonServices || []);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && (e.altKey || e.metaKey)) {
        const idx = deal ? allDeals.findIndex((d) => d.id === deal.id) : -1;
        if (idx > 0) onSelectDeal?.(allDeals[idx - 1]);
      } else if (e.key === 'ArrowRight' && (e.altKey || e.metaKey)) {
        const idx = deal ? allDeals.findIndex((d) => d.id === deal.id) : -1;
        if (idx >= 0 && idx < allDeals.length - 1) onSelectDeal?.(allDeals[idx + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, deal, allDeals, onSelectDeal]);

  const handleCopy = (text: string, fieldName: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      onNotify?.(`Đã sao chép ${label}: ${text}`, 'success');
      setTimeout(() => setCopiedField(null), 1800);
    });
  };

  const currentIndex = useMemo(() => {
    if (!deal || allDeals.length === 0) return -1;
    return allDeals.findIndex((d) => d.id === deal.id);
  }, [deal, allDeals]);

  const prevDeal = currentIndex > 0 ? allDeals[currentIndex - 1] : null;
  const nextDeal =
    currentIndex >= 0 && currentIndex < allDeals.length - 1 ? allDeals[currentIndex + 1] : null;

  const matchedKoc = useMemo(() => {
    if (!deal) return undefined;
    const cleanHandle = normalizeTikTokId(deal.idKenh).toLowerCase();
    return kocs.find(
      (k) =>
        (deal.kocId && k.id === deal.kocId) ||
        (cleanHandle && normalizeTikTokId(k.channelId).toLowerCase() === cleanHandle)
    );
  }, [deal, kocs]);

  const mappedBookingDeal = useMemo(
    () => (deal ? buildBookingDealFromApprovedItem(deal) : null),
    [deal]
  );

  const activeLegalProfile = useMemo(
    () =>
      matchedKoc && mappedBookingDeal
        ? resolveActiveLegalProfile(matchedKoc, mappedBookingDeal)
        : undefined,
    [matchedKoc, mappedBookingDeal]
  );

  const linkedContracts = useMemo(() => {
    if (!deal || contractRecords.length === 0) {
      return { hdnt: undefined, sow: undefined, bbnt: undefined };
    }
    const dealCodeUpper = (deal.maBooking || '').trim().toUpperCase();
    const kocId = deal.kocId || matchedKoc?.id;
    const cleanHandle = normalizeTikTokId(deal.idKenh).toLowerCase();

    const sameDeal = (r: ContractRecord) =>
      Boolean(
        dealCodeUpper &&
          ((r.dealId || '').toUpperCase() === dealCodeUpper ||
            (r.dealCode || '').toUpperCase() === dealCodeUpper)
      );

    const sameKoc = (r: ContractRecord) =>
      sameDeal(r) ||
      Boolean(kocId && r.kocId === kocId) ||
      Boolean(
        cleanHandle &&
          r.partner &&
          normalizeTikTokId(r.partner).toLowerCase().includes(cleanHandle)
      );

    const byLatest = (a: ContractRecord, b: ContractRecord) =>
      b.updatedAt.localeCompare(a.updatedAt);

    const hdnt = [...contractRecords]
      .filter((r) => documentOfTemplate(r.templateId) === 'HDNT' && sameKoc(r))
      .sort(byLatest)[0];
    const sow = [...contractRecords]
      .filter((r) => documentOfTemplate(r.templateId) === 'SOW' && sameDeal(r))
      .sort(byLatest)[0];
    const bbnt = [...contractRecords]
      .filter((r) => documentOfTemplate(r.templateId) === 'BBNT' && sameDeal(r))
      .sort(byLatest)[0];

    return { hdnt, sow, bbnt };
  }, [deal, contractRecords, matchedKoc]);

  const nextAmendmentAppendixCode = useMemo(() => {
    const baseCode = dealDraftCode || deal?.maBooking || 'BO2610-201';
    const currentPl = dealDraftAppendixCode || '';
    const matchSeq = currentPl.match(/-(\d+)$/);
    const nextSeq = matchSeq ? Number(matchSeq[1]) + 1 : 2;
    return generateDealAppendixCode(baseCode, nextSeq);
  }, [dealDraftCode, dealDraftAppendixCode, deal?.maBooking]);

  if (!isOpen || !deal) return null;

  const isAccepted = deal.acceptanceStatus === 'DA_NGHIEM_THU';
  const hasBo = deal.bookingOrderCreated && Boolean(deal.maBooking);
  const sowSigningCompleted =
    linkedContracts.sow?.signing.at(-1)?.status === 'COMPLETED' ||
    deal.contractAppendixStatus === 'ĐÃ_KÝ';
  const isDataLocked =
    Boolean(deal.chotData) && deal.unlockRequestBatch !== 'UNLOCKED' && !canApproveDataUnlock;
  const isDealBuilderSowLocked =
    dealDraftAppendixStatus === 'ĐÃ_KÝ' || isReadOnlyPartnerRole || isDataLocked;

  const stageStatus =
    deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
      ? { label: 'Hoàn tất', tone: 'positive' as const }
      : isAccepted
      ? { label: 'Đã duyệt', tone: 'positive' as const }
      : sowSigningCompleted
      ? { label: 'Đang chạy', tone: 'info' as const }
      : hasBo
      ? { label: 'Chờ duyệt', tone: 'warning' as const }
      : { label: 'Nháp', tone: 'neutral' as const };

  // Các hàm thao tác trên Bộ cấu hình Deal & Job (Tab 1)
  const updateActiveDealDraftJob = (
    updater: (job: DealSowJobItem) => DealSowJobItem,
    targetIdx = activeDealDraftJobIdx
  ) => {
    setDealDraftJobs((prev) => {
      const safeIdx = Math.max(0, Math.min(targetIdx, prev.length - 1));
      return prev.map((j, idx) => (idx === safeIdx ? updater(j) : j));
    });
  };

  const handleSelectDealDraftJob = (idx: number) => {
    const target = dealDraftJobs[idx];
    if (!target) return;
    setActiveDealDraftJobIdx(idx);
    setDealDraftPlannedAirDate(target.plannedAirDate || '');
    setDealDraftVideoNetCost(target.videoAssetNetCost || 0);
    setDealDraftAddons(target.addonServices || []);
  };

  const handleAddJobToDealBuilder = () => {
    const nextIdx = dealDraftJobs.length;
    const baseBo = dealDraftCode || deal.maBooking || 'BO2610';
    const nextJobCode = `${baseBo}-J${String(nextIdx + 1).padStart(2, '0')}`;
    const defaultAddons = buildDefaultAddonServicesForDeal({
      maBooking: nextJobCode,
      totalNet: dealDraftVideoNetCost || 0,
      includeDefaultAddons: true,
    });
    const newJob: DealSowJobItem = {
      id: `${nextJobCode}-${Date.now()}`,
      jobCode: nextJobCode,
      jobTitle: `Bảng công việc #${nextIdx + 1} (${nextJobCode})`,
      productName: `${deal.sanPham || deal.brandName} (Job #${nextIdx + 1})`,
      mediaChannel: 'TikTok',
      affiliateChannel: deal.storeName.toLowerCase().includes('shopee')
        ? 'Shopee'
        : 'TikTok Shop',
      plannedAirDate:
        dealDraftPlannedAirDate ||
        deal.plannedAirDate ||
        `${deal.thangPlan.replace('/', '-')}-20`,
      videoAssetNetCost: dealDraftVideoNetCost || 0,
      quantity: 1,
      addonServices: defaultAddons,
      acceptanceStatus: 'CHUA_NGHIEM_THU',
    };
    const nextJobs = [...dealDraftJobs, newJob];
    setDealDraftJobs(nextJobs);
    setActiveDealDraftJobIdx(nextIdx);
    setDealDraftPlannedAirDate(newJob.plannedAirDate);
    setDealDraftVideoNetCost(newJob.videoAssetNetCost);
    setDealDraftAddons(newJob.addonServices);
  };

  const handleDeleteDealDraftJob = (idx: number) => {
    if (dealDraftJobs.length <= 1) {
      onNotify?.('Mỗi Deal cần có tối thiểu 1 Bảng công việc.', 'warning');
      return;
    }
    const remaining = dealDraftJobs.filter((_, i) => i !== idx);
    const nextActive = Math.max(0, Math.min(activeDealDraftJobIdx, remaining.length - 1));
    setDealDraftJobs(remaining);
    setActiveDealDraftJobIdx(nextActive);
    const activeJob = remaining[nextActive];
    if (activeJob) {
      setDealDraftPlannedAirDate(activeJob.plannedAirDate || '');
      setDealDraftVideoNetCost(activeJob.videoAssetNetCost || 0);
      setDealDraftAddons(activeJob.addonServices || []);
    }
  };

  const handleTogglePresetAddonInBuilder = (
    termType: DealRightsTermItem['termType'],
    defaultLabel: string,
    anchorType: 'ACCEPTANCE_DATE' | 'AIR_DATE',
    defaultDays: number
  ) => {
    const activeJob = dealDraftJobs[activeDealDraftJobIdx];
    const currentAddons = activeJob ? activeJob.addonServices : dealDraftAddons;
    const exists = currentAddons.some((a) => a.termType === termType);
    const nextAddons = exists
      ? currentAddons.filter((a) => a.termType !== termType)
      : [
          ...currentAddons,
          {
            id: `${activeJob?.jobCode || dealDraftCode || 'DEAL'}-ADDON-${termType}-${currentAddons.length + 1}`,
            termType,
            termLabel: defaultLabel,
            scopeType: 'ASSET' as const,
            targetDeliverableId: activeJob?.jobCode,
            anchorType,
            durationDays: defaultDays,
            allocatedWeightPct: 10,
            allocatedCostVnd: 0,
            status: 'PENDING_ANCHOR' as const,
            acceptanceStatus: 'LOCKED_BY_VIDEO' as const,
            evidenceCodeOrUrl: '',
          },
        ];
    setDealDraftAddons(nextAddons);
    updateActiveDealDraftJob((job) => ({
      ...job,
      addonServices: nextAddons,
    }));
  };

  const handleUnlockForAmendmentAppendix = () => {
    const nextCode = nextAmendmentAppendixCode;
    setDealDraftAppendixCode(nextCode);
    setDealDraftAppendixStatus('CHỜ_KÝ');
    setActiveTab('OVERVIEW');
    onUpdateDealFields?.(deal.id, {
      contractAppendixCode: nextCode,
      contractAppendixStatus: 'CHỜ_KÝ',
    });
    onNotify?.(
      `Đã mở khóa cấu hình Deal để lập Phụ lục bổ sung ${nextCode}`,
      'info'
    );
  };

  const handleSaveDealWorkspace = (openSowAfterSave?: boolean) => {
    if (isReadOnlyPartnerRole) {
      onNotify?.('Tài khoản đối tác chỉ có quyền xem, không thể chỉnh sửa cấu hình Deal.', 'warning');
      return;
    }
    if (isDataLocked) {
      onNotify?.(
        'Deal đã chốt data nghiệm thu tháng. Vui lòng gửi đề nghị Kế toán mở khóa trên S40 trước khi sửa.',
        'warning'
      );
      return;
    }
    const normalizedJobs: DealSowJobItem[] =
      dealDraftJobs.length > 0
        ? dealDraftJobs
        : [
            {
              id: `${dealDraftCode || 'BO'}-J01`,
              jobCode: `${dealDraftCode || 'BO'}-J01`,
              jobTitle: `Bảng công việc #1 (${dealDraftCode || 'BO'}-J01)`,
              productName: deal.sanPham || deal.brandName,
              mediaChannel: 'TikTok',
              plannedAirDate: dealDraftPlannedAirDate,
              videoAssetNetCost: Math.max(0, dealDraftVideoNetCost),
              quantity: 1,
              addonServices: dealDraftAddons,
            },
          ];

    const missingAirJob = normalizedJobs.find((j) => !j.plannedAirDate?.trim());
    if (missingAirJob) {
      onNotify?.(
        `Chưa chọn ngày air dự kiến cho ${missingAirJob.jobCode} của kênh @${deal.idKenh}. Chọn ngày air rồi thử lại.`,
        'warning'
      );
      return;
    }

    const jobSubtotals = normalizedJobs.map((j) => computeDealSowJobSubtotal(j));
    const totalVideoNet = jobSubtotals.reduce((s, t) => s + t.videoNet, 0);
    const addonsTotal = jobSubtotals.reduce((s, t) => s + t.addonsNet, 0);
    const totalDealNet = totalVideoNet + addonsTotal;
    const allAddons = normalizedJobs.flatMap((j) => j.addonServices || []);
    const primaryAirDate = normalizedJobs[0]?.plannedAirDate || dealDraftPlannedAirDate;
    const combinedProducts =
      normalizedJobs.length > 1
        ? Array.from(
            new Set(normalizedJobs.map((j) => j.productName?.trim()).filter(Boolean))
          ).join(' + ')
        : normalizedJobs[0]?.productName || deal.sanPham;

    const finalDealCode =
      dealDraftCode.trim() || generateBookingOrderCode(deal.thangPlan, 205);
    const finalAppendixCode =
      dealDraftAppendixCode.trim() || generateDealAppendixCode(finalDealCode, 1);
    const finalMasterCode =
      dealDraftMasterContract.trim() || generateMasterContractCode(deal.idKenh, deal.kocId);
    const resolvedAdvanceAmount =
      dealDraftPaymentSchedule === 'ONE_TIME'
        ? 0
        : Math.max(0, dealDraftAdvanceAmount);

    const patch: Partial<ApprovedBookingListItem> = {
      maBooking: finalDealCode,
      bookingOrderCreated: true,
      bookingOrderCreatedAt: deal.bookingOrderCreatedAt || new Date().toISOString(),
      linkedDealId: finalDealCode,
      sanPham: combinedProducts || deal.sanPham,
      plannedAirDate: primaryAirDate,
      chiPhiBookingNetCuoi: totalDealNet,
      videoAssetNetCost: totalVideoNet,
      addonServicesNetCost: addonsTotal,
      paymentScheduleOption: dealDraftPaymentSchedule,
      soTienTamUngTruoc: resolvedAdvanceAmount,
      addonServices: allAddons,
      dealJobs: normalizedJobs,
      masterContractCode: finalMasterCode,
      contractAppendixCode: finalAppendixCode,
      contractAppendixStatus: dealDraftAppendixStatus,
    };

    onUpdateDealFields?.(deal.id, patch);

    onNotify?.(
      `Đã lưu deal ${finalDealCode} (${normalizedJobs.length} bảng công việc · Tổng Net ${formatVnd(totalDealNet)})`,
      'success'
    );

    if (openSowAfterSave && onOpenContractForDeal) {
      const updatedItem = recalculateApprovedBookingItem({ ...deal, ...patch });
      onOpenContractForDeal(buildBookingDealFromApprovedItem(updatedItem), 'SOW');
    }
  };

  // Các hàm thao tác Nghiệm thu 2 tầng (Tab 3)
  const handleToggleAddonStatus = (
    jobIdx: number,
    addonId: string,
    nextStatus: 'VERIFIED' | 'DROPPED' | 'PENDING_ACCEPTANCE'
  ) => {
    if (isReadOnlyPartnerRole || isDataLocked) {
      onNotify?.(
        isDataLocked
          ? 'Deal đã chốt data nghiệm thu tháng. Vui lòng gửi đề nghị Kế toán mở khóa trên S40 trước khi sửa.'
          : 'Tài khoản không có quyền chỉnh sửa nghiệm thu.',
        'warning'
      );
      return;
    }
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const targetJob = currentJobs[jobIdx];
    if (!targetJob) return;

    const today = getVietnamDateYmd();
    const updatedJobAddons = (targetJob.addonServices || []).map((addon) => {
      if (addon.id !== addonId) return addon;
      let status: DealRightsTermItem['status'] = 'PENDING_ANCHOR';
      let verifiedAt = addon.verifiedAt;
      if (nextStatus === 'VERIFIED') {
        status = 'ACTIVE';
        verifiedAt = verifiedAt || today;
      } else if (nextStatus === 'DROPPED') {
        status = 'EXPIRED';
      }
      return {
        ...addon,
        acceptanceStatus: nextStatus,
        status,
        verifiedAt,
      };
    });

    const updatedJobs = currentJobs.map((j, idx) =>
      idx === jobIdx ? { ...j, addonServices: updatedJobAddons } : j
    );

    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    onUpdateDealFields?.(deal.id, {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    });

    const statusLabel =
      nextStatus === 'VERIFIED'
        ? 'Đã nhận đủ'
        : nextStatus === 'DROPPED'
        ? 'Đã khấu trừ hủy'
        : 'Chờ bàn giao';
    onNotify?.(`Đã cập nhật trạng thái hạng mục: ${statusLabel}`, 'success');
  };

  const handleSaveAddonEvidence = (jobIdx: number, addonId: string, evidence: string) => {
    if (isReadOnlyPartnerRole || isDataLocked) {
      onNotify?.(
        isDataLocked
          ? 'Deal đã chốt data nghiệm thu tháng. Vui lòng gửi đề nghị Kế toán mở khóa trên S40 trước khi sửa.'
          : 'Tài khoản không có quyền chỉnh sửa nghiệm thu.',
        'warning'
      );
      return;
    }
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const targetJob = currentJobs[jobIdx];
    if (!targetJob) return;

    const trimmed = evidence.trim();
    const today = getVietnamDateYmd();
    const hasJobAir = Boolean(targetJob.linkAir || deal.linkAir);

    const updatedJobAddons = (targetJob.addonServices || []).map((addon) => {
      if (addon.id !== addonId) return addon;
      const isVerified = Boolean(trimmed) && hasJobAir;
      return {
        ...addon,
        evidenceCodeOrUrl: trimmed,
        acceptanceStatus: isVerified ? ('VERIFIED' as const) : addon.acceptanceStatus,
        status: isVerified ? ('ACTIVE' as const) : addon.status,
        verifiedAt: isVerified ? addon.verifiedAt || today : addon.verifiedAt,
      };
    });

    const isAdsTerm =
      targetJob.addonServices?.find((a) => a.id === addonId)?.termType === 'ADS_CODE';
    const updatedJobs = currentJobs.map((j, idx) => {
      if (idx !== jobIdx) return j;
      return {
        ...j,
        sparkAdsCode: isAdsTerm && trimmed ? trimmed : j.sparkAdsCode,
        addonServices: updatedJobAddons,
      };
    });

    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    const patch: Partial<ApprovedBookingListItem> = {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    };
    if (isAdsTerm && trimmed && (!deal.sparkAdsCode || jobIdx === 0)) {
      patch.sparkAdsCode = trimmed;
    }

    onUpdateDealFields?.(deal.id, patch);
    setEditingAddonId(null);
    onNotify?.('Đã lưu mã/bằng chứng bàn giao quyền lợi', 'success');
  };

  const handleAddNewAddonToJob = (jobIdx: number) => {
    if (isReadOnlyPartnerRole || isDataLocked) {
      onNotify?.(
        isDataLocked
          ? 'Deal đã chốt data nghiệm thu tháng. Vui lòng gửi đề nghị Kế toán mở khóa trên S40 trước khi sửa.'
          : 'Tài khoản không có quyền chỉnh sửa nghiệm thu.',
        'warning'
      );
      return;
    }
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const targetJob = currentJobs[jobIdx];
    if (!targetJob) return;

    const hasJobAir = Boolean(targetJob.linkAir || deal.linkAir);
    const addonId = `${targetJob.jobCode || deal.maBooking || 'DEAL'}-ADDON-${Date.now()}`;
    const trimmedEvidence = newAddonEvidence.trim();
    const isVerified = Boolean(trimmedEvidence) && hasJobAir;

    const defaultLabels: Record<DealRightsTermItem['termType'], string> = {
      ADS_CODE: 'Mã ủy quyền Spark Ads',
      IMAGE_USAGE: 'Quyền sử dụng hình ảnh & file video gốc',
      CROSS_POST_REUP: 'Đăng chéo kênh phụ / Reup Wave 1',
      LINK_BIO_CART: 'Duy trì link Bio & giỏ hàng',
      EXCLUSIVITY: 'Độc quyền ngành hàng',
    };

    const newAddon: DealRightsTermItem = {
      id: addonId,
      termType: newAddonType,
      termLabel: newAddonLabel.trim() || defaultLabels[newAddonType],
      scopeType: 'ASSET',
      anchorType: 'ACCEPTANCE_DATE',
      durationDays: newAddonDays || 30,
      allocatedCostVnd: Math.max(0, Number(newAddonCost) || 0),
      status: isVerified ? 'ACTIVE' : 'PENDING_ANCHOR',
      acceptanceStatus: !hasJobAir
        ? 'LOCKED_BY_VIDEO'
        : isVerified
        ? 'VERIFIED'
        : 'PENDING_ACCEPTANCE',
      evidenceCodeOrUrl: trimmedEvidence,
      verifiedAt: isVerified ? getVietnamDateYmd() : undefined,
    };

    const updatedJobAddons = [...(targetJob.addonServices || []), newAddon];
    const updatedJobs = currentJobs.map((j, idx) =>
      idx === jobIdx ? { ...j, addonServices: updatedJobAddons } : j
    );

    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    onUpdateDealFields?.(deal.id, {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    });

    setAddingAddonJobIdx(null);
    setNewAddonLabel('');
    setNewAddonCost(0);
    setNewAddonEvidence('');
    onNotify?.(`Đã thêm hạng mục: ${newAddon.termLabel}`, 'success');
  };

  const handleRemoveAddonFromJob = (jobIdx: number, addonId: string) => {
    if (isReadOnlyPartnerRole || isDataLocked) {
      onNotify?.(
        isDataLocked
          ? 'Deal đã chốt data nghiệm thu tháng. Vui lòng gửi đề nghị Kế toán mở khóa trên S40 trước khi sửa.'
          : 'Tài khoản không có quyền chỉnh sửa nghiệm thu.',
        'warning'
      );
      return;
    }
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const targetJob = currentJobs[jobIdx];
    if (!targetJob) return;

    const updatedJobAddons = (targetJob.addonServices || []).filter((a) => a.id !== addonId);
    const updatedJobs = currentJobs.map((j, idx) =>
      idx === jobIdx ? { ...j, addonServices: updatedJobAddons } : j
    );
    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    onUpdateDealFields?.(deal.id, {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    });
    onNotify?.('Đã xóa hạng mục khỏi bảng công việc', 'info');
  };

  const handleSaveJobAirVideo = (jobIdx: number) => {
    if (isReadOnlyPartnerRole || isDataLocked) {
      onNotify?.(
        isDataLocked
          ? 'Deal đã chốt data nghiệm thu tháng. Vui lòng gửi đề nghị Kế toán mở khóa trên S40 trước khi sửa.'
          : 'Tài khoản không có quyền chỉnh sửa nghiệm thu.',
        'warning'
      );
      return;
    }
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const trimmedLink = quickAirLink.trim();
    const trimmedDate = quickAirDate.trim() || getVietnamDateYmd();

    const updatedJobs = currentJobs.map((j, idx) => {
      if (idx !== jobIdx) return j;
      return {
        ...j,
        linkAir: trimmedLink || j.linkAir,
        actualAirDate: trimmedDate || j.actualAirDate,
        acceptanceStatus: (trimmedLink ? 'DA_NGHIEM_THU' : j.acceptanceStatus) as
          | 'DA_NGHIEM_THU'
          | 'CHUA_NGHIEM_THU',
      };
    });

    const patch: Partial<ApprovedBookingListItem> = {
      dealJobs: updatedJobs,
    };
    if (jobIdx === 0 || !deal.linkAir) {
      patch.linkAir = trimmedLink;
      patch.actualAirDate = trimmedDate;
      patch.acceptanceStatus = trimmedLink ? 'DA_NGHIEM_THU' : deal.acceptanceStatus;
    }

    onUpdateDealFields?.(deal.id, patch);
    setEditingAirJobIdx(null);
    onNotify?.('Đã cập nhật nghiệm thu video lên sóng', 'success');
  };

  // Tính toán tổng hợp trực tiếp từ cấu hình nháp đang chỉnh sửa
  const draftSubtotals = dealDraftJobs.map((j) => computeDealSowJobSubtotal(j));
  const draftTotalVideoNet = draftSubtotals.reduce((s, x) => s + x.videoNet, 0);
  const draftTotalAddonsNet = draftSubtotals.reduce((s, x) => s + x.addonsNet, 0);
  const draftGrandDealNet = draftTotalVideoNet + draftTotalAddonsNet;
  const draftGrossWithTax = computeGrossFeeWithTax(draftGrandDealNet, deal.loaiTaiKhoanThanhToan);
  const draftRemainingPayable = Math.max(0, draftGrandDealNet - (dealDraftAdvanceAmount || 0));

  const activeDraftJob = dealDraftJobs[activeDealDraftJobIdx];
  const activeDraftJobSub = activeDraftJob
    ? computeDealSowJobSubtotal(activeDraftJob)
    : {
        videoNet: dealDraftVideoNetCost,
        addonsNet: 0,
        plannedJobNet: dealDraftVideoNetCost,
      };

  return (
    <div className="space-y-5">
      {/* PHÂN VÙNG 1A: Thanh công cụ đầu trang (PageActions) */}
      <PageActions>
        <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={onClose}>
          Về danh sách Deal
        </Button>

        {allDeals.length > 1 && (
          <div className="inline-flex items-center gap-2">
            <Select
              value={deal.id}
              onChange={(e) => {
                const found = allDeals.find((d) => d.id === e.target.value);
                if (found) onSelectDeal?.(found);
              }}
              aria-label="Chọn nhanh Deal"
              className="w-auto min-w-[210px] max-w-[280px] h-7 text-xs"
            >
              {allDeals.map((d, idx) => (
                <option key={d.id} value={d.id}>
                  #{idx + 1} · {d.maBooking || 'Chờ BO'} — @{d.idKenh.replace(/^@/, '')}
                </option>
              ))}
            </Select>

            <div className="inline-flex items-center border border-line-strong rounded-md overflow-hidden bg-surface h-7">
              <button
                type="button"
                disabled={!prevDeal}
                onClick={() => prevDeal && onSelectDeal?.(prevDeal)}
                title={prevDeal ? `Deal trước: ${prevDeal.maBooking || prevDeal.idKenh}` : 'Đầu danh sách'}
                aria-label="Deal trước"
                className="h-7 w-7 inline-flex items-center justify-center text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-2xs font-code text-ink-3 px-2 tabular-nums">
                {currentIndex >= 0 ? currentIndex + 1 : 1}/{allDeals.length}
              </span>
              <button
                type="button"
                disabled={!nextDeal}
                onClick={() => nextDeal && onSelectDeal?.(nextDeal)}
                title={nextDeal ? `Deal sau: ${nextDeal.maBooking || nextDeal.idKenh}` : 'Cuối danh sách'}
                aria-label="Deal sau"
                className="h-7 w-7 inline-flex items-center justify-center text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {onPullContractLinks && (
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            disabled={isPullingContractLinks}
            onClick={onPullContractLinks}
          >
            Kéo HĐ · PL · BBNT
          </Button>
        )}

        {!isDealBuilderSowLocked ? (
          <Button
            variant="primary"
            size="sm"
            icon={FileCheck}
            onClick={() => handleSaveDealWorkspace(Boolean(onOpenContractForDeal))}
          >
            {onOpenContractForDeal ? 'Lưu Deal & Ký SOW' : 'Lưu cấu hình Deal'}
          </Button>
        ) : !isAccepted ? (
          <Button
            variant="primary"
            size="sm"
            icon={Video}
            onClick={() => {
              setActiveTab('ACCEPTANCE');
              onOpenAcceptanceModal?.(deal);
            }}
          >
            Nghiệm thu video
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={Send}
            onClick={() => onOpenLarkPaymentModal?.(deal)}
          >
            Lập phiếu Lark
          </Button>
        )}
      </PageActions>

      {/* PHÂN VÙNG 1B: Khung Định danh Deal & Thanh hành trình 4 chặng */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b border-line">
          <div className="flex items-center gap-4 min-w-0">
            <Person
              name={deal.tenKenh || deal.idKenh}
              sub={`@${deal.idKenh.replace(/^@/, '')} · Bậc ${deal.klGrade || 'KL3'} · ${formatNumber(deal.follower || matchedKoc?.followers || 0)} người theo dõi`}
              size={40}
            />
            <div className="hidden sm:block h-8 w-px bg-line" />
            <div className="flex flex-wrap items-center gap-2">
              <Status tone={stageStatus.tone}>{stageStatus.label}</Status>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-sunken border border-line font-code text-xs font-semibold text-ink">
                <span>{dealDraftCode || deal.maBooking || 'Chưa cấp mã BO'}</span>
                {(dealDraftCode || deal.maBooking) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(dealDraftCode || deal.maBooking, 'maBooking', 'mã Deal')
                    }
                    className="text-ink-3 hover:text-ink ml-1"
                    title="Sao chép mã Deal"
                  >
                    {copiedField === 'maBooking' ? (
                      <Check className="w-3.5 h-3.5 text-positive" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </span>
              <span className="px-3 py-1 rounded-md bg-sunken border border-line font-code text-xs text-ink-2">
                {dealDraftAppendixCode || deal.contractAppendixCode || 'Chưa lập PL'}
              </span>
              <span className="px-3 py-1 rounded-md bg-sunken border border-line text-xs text-ink-2">
                {deal.storeName} · <span className="font-code">{deal.thangPlan}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenKocProfile && (
              <Button
                variant="secondary"
                size="sm"
                icon={UserCheck}
                onClick={() => onOpenKocProfile(deal)}
              >
                Hồ sơ KOC
              </Button>
            )}
            {deal.linkKenh && (
              <a
                href={deal.linkKenh}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-7 px-3 rounded-md border border-line bg-surface hover:bg-sunken text-xs font-medium text-accent"
              >
                <span>Mở kênh</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Thanh hành trình 4 chặng chuẩn StepMark */}
        <div className="px-4 py-3 bg-sunken/50 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center gap-3 min-w-0 text-left px-3 py-2 rounded-lg border transition-colors ${
              activeTab === 'OVERVIEW'
                ? 'bg-surface border-line-strong'
                : 'border-transparent hover:bg-surface/70'
            }`}
          >
            <StepMark done={hasBo} label="1" size={22} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink truncate">
                Cấu hình Deal &amp; Bảng CV
              </div>
              <div className="text-2xs text-ink-3 font-code truncate">
                {hasBo
                  ? `${deal.maBooking} · ${dealDraftJobs.length} Job`
                  : 'Chờ cấp mã BO'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTRACT')}
            className={`flex items-center gap-3 min-w-0 text-left px-3 py-2 rounded-lg border transition-colors ${
              activeTab === 'CONTRACT'
                ? 'bg-surface border-line-strong'
                : 'border-transparent hover:bg-surface/70'
            }`}
          >
            <StepMark done={sowSigningCompleted} label="2" size={22} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink truncate">
                Hợp đồng &amp; Ký SOW
              </div>
              <div className="text-2xs text-ink-3 truncate">
                {sowSigningCompleted
                  ? `${dealDraftAppendixCode} (Đã ký)`
                  : 'Chờ ký Phụ lục SOW'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACCEPTANCE')}
            className={`flex items-center gap-3 min-w-0 text-left px-3 py-2 rounded-lg border transition-colors ${
              activeTab === 'ACCEPTANCE'
                ? 'bg-surface border-line-strong'
                : 'border-transparent hover:bg-surface/70'
            }`}
          >
            <StepMark done={isAccepted} label="3" size={22} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink truncate">
                Nghiệm thu Video &amp; Asset
              </div>
              <div className="text-2xs text-ink-3 truncate">
                {isAccepted
                  ? deal.actualAirDate
                    ? `Đã air ${formatDate(deal.actualAirDate)}`
                    : 'Đã nghiệm thu'
                  : 'Chờ cập nhật link air'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ACCEPTANCE');
              if (isAccepted) onOpenLarkPaymentModal?.(deal);
            }}
            className="flex items-center gap-3 min-w-0 text-left px-3 py-2 rounded-lg border border-transparent hover:bg-surface/70 transition-colors"
          >
            <StepMark
              done={deal.trangThaiPhieuThanhToan === 'Đã thanh toán'}
              label="4"
              size={22}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink truncate">
                BBNT &amp; Quyết toán Lark
              </div>
              <div className="text-2xs text-ink-3 truncate">
                {deal.trangThaiPhieuThanhToan}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* PHÂN VÙNG 2: Hàng 4 chỉ số tổng quan của Deal (StatRow) */}
      <StatRow size="sm">
        <Stat
          label="Ngân sách Net chốt"
          value={formatVnd(draftGrandDealNet)}
          numeric={draftGrandDealNet}
          note={`Gross kèm thuế ${formatVndShort(draftGrossWithTax)} · Bậc ${deal.klGrade || 'KL3'}`}
        />
        <Stat
          label="Cấu trúc Bảng công việc"
          value={`${dealDraftJobs.length} Job`}
          note={`Video ${formatVndShort(draftTotalVideoNet)} · Quyền lợi kèm ${formatVndShort(draftTotalAddonsNet)}`}
        />
        <Stat
          label="Cần thanh toán"
          value={formatVnd(deal.soTienCanThanhToan)}
          numeric={deal.soTienCanThanhToan}
          progress={{
            value:
              deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                ? draftGrandDealNet
                : dealDraftAdvanceAmount,
            max: Math.max(1, draftGrandDealNet),
          }}
          note={
            dealDraftAdvanceAmount > 0
              ? `Đã tạm ứng ${formatVndShort(dealDraftAdvanceAmount)}`
              : 'Chưa phát sinh tạm ứng'
          }
        />
        <Stat
          label="Doanh số GMV 30 ngày"
          value={formatVnd(deal.gmv30d || 0)}
          numeric={deal.gmv30d || 0}
          tone={deal.roi30d >= 2 ? 'positive' : deal.roi30d > 0 ? 'warning' : undefined}
          note={`${formatNumber(deal.orders30d || 0)} đơn · ROI ${deal.roi30d.toFixed(2)}x`}
        />
      </StatRow>

      {/* PHÂN VÙNG 3: Thanh điều hướng 3 phân khu nghiệp vụ (Tabs) */}
      <Tabs<DrawerTab>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'OVERVIEW',
            label: 'Cấu hình Deal & Bảng công việc',
            count: dealDraftJobs.length,
          },
          {
            key: 'CONTRACT',
            label: 'Pháp lý & Hợp đồng',
            count: 3,
          },
          {
            key: 'ACCEPTANCE',
            label: 'Nghiệm thu & Quyết toán',
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isDealBuilderSowLocked ? (
              <Button
                variant="secondary"
                size="sm"
                icon={Unlock}
                onClick={handleUnlockForAmendmentAppendix}
              >
                Lập Phụ lục bổ sung ({nextAmendmentAppendixCode})
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={FileCheck}
                onClick={() => handleSaveDealWorkspace(false)}
              >
                Lưu cấu hình Deal
              </Button>
            )}
          </div>
        }
      />

      {/* PHÂN VÙNG 4: Không gian làm việc 2 cột theo từng Tab */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* CỘT TRÁI (8 CỘT): Thiết kế Định danh Deal, Danh sách Job & Quyền lợi SOW */}
          <div className="lg:col-span-8 space-y-5">
            {/* Panel 1: Định danh Deal & Phụ lục Hợp đồng */}
            <Panel
              title="Định danh Deal & Hồ sơ Phụ lục SOW"
              actions={
                <Status tone={isDealBuilderSowLocked ? 'positive' : 'warning'}>
                  {isDealBuilderSowLocked ? 'Đã duyệt' : 'Chờ duyệt'}
                </Status>
              }
            >
              <div className="space-y-4 text-xs">
                {isDealBuilderSowLocked ? (
                  <div className="p-3 rounded-lg bg-warning-soft border border-line flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-warning font-medium">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>
                        Phụ lục SOW ({dealDraftAppendixCode}) đã ký hoàn tất — các điều khoản đơn giá, ngày air cam kết và hạng mục bàn giao được khóa để bảo toàn hồ sơ pháp lý.
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Unlock}
                      onClick={handleUnlockForAmendmentAppendix}
                    >
                      Lập Phụ lục bổ sung ({nextAmendmentAppendixCode})
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-positive-soft/60 border border-line flex items-center gap-2 text-positive font-medium">
                    <Unlock className="w-4 h-4 shrink-0" />
                    <span>
                      Phụ lục SOW đang ở trạng thái chờ ký — cho phép chỉnh sửa đơn giá, ngày air dự kiến và quyền lợi đi kèm trước khi phát hành.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Mã Deal (Booking Order)">
                    <Input
                      value={dealDraftCode}
                      disabled={isDealBuilderSowLocked}
                      onChange={(e) => {
                        const nextCode = e.target.value;
                        setDealDraftCode(nextCode);
                        setDealDraftAppendixCode(generateDealAppendixCode(nextCode, 1));
                      }}
                    />
                  </Field>
                  <Field label="Mã Hợp đồng nguyên tắc (1 HĐNT / KOC)">
                    <Input
                      value={dealDraftMasterContract}
                      disabled={isDealBuilderSowLocked}
                      onChange={(e) => setDealDraftMasterContract(e.target.value)}
                    />
                  </Field>
                  <Field label="Mã Phụ lục theo Deal (1 Phụ lục / Deal)">
                    <div className="flex items-center gap-2">
                      <Input
                        value={dealDraftAppendixCode}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => setDealDraftAppendixCode(e.target.value)}
                      />
                      <Select
                        value={dealDraftAppendixStatus}
                        onChange={(e) =>
                          setDealDraftAppendixStatus(
                            e.target.value as DealContractAppendixStatus
                          )
                        }
                        className="w-auto shrink-0"
                      >
                        <option value="CHỜ_KÝ">Chờ ký PL</option>
                        <option value="ĐÃ_KÝ">Đã ký PL</option>
                        <option value="CHƯA_LẬP">Chưa lập</option>
                      </Select>
                    </div>
                  </Field>
                </div>
              </div>
            </Panel>

            {/* Panel 2: Danh sách Bảng công việc (Job) & Cấu hình chi tiết */}
            <Panel
              title={`Cấu hình Bảng công việc trong Phụ lục SOW (${dealDraftJobs.length} Job)`}
              actions={
                !isDealBuilderSowLocked ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={handleAddJobToDealBuilder}
                  >
                    Thêm Job vào Deal
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-4 text-xs">
                {/* Thanh chuyển đổi giữa các Job trong Deal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {dealDraftJobs.map((jobItem, jIdx) => {
                    const isSelected = jIdx === activeDealDraftJobIdx;
                    const jobSub = computeDealSowJobSubtotal(jobItem);
                    return (
                      <div
                        key={jobItem.id || jIdx}
                        className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent-soft/40 text-ink'
                            : 'border-line bg-sunken/40 text-ink-2 hover:bg-sunken'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectDealDraftJob(jIdx)}
                          className="text-left min-w-0 flex-1 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-code text-2xs font-semibold">
                              Bảng CV #{jIdx + 1} · {jobItem.jobCode}
                            </span>
                            <span className="font-code font-semibold text-accent tabular-nums">
                              {formatVndShort(jobSub.plannedJobNet)}
                            </span>
                          </div>
                          <div className="font-medium text-ink truncate">
                            {jobItem.productName || deal.sanPham || 'Sản phẩm'}
                          </div>
                          <div className="text-2xs text-ink-3 font-code">
                            {jobItem.mediaChannel || 'TikTok'} · Air:{' '}
                            {jobItem.plannedAirDate
                              ? formatDate(jobItem.plannedAirDate)
                              : 'Chưa chốt'}
                          </div>
                        </button>
                        {!isDealBuilderSowLocked && dealDraftJobs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDealDraftJob(jIdx)}
                            className="text-ink-3 hover:text-critical p-1 rounded hover:bg-critical-soft shrink-0"
                            title="Xóa Bảng công việc này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Chi tiết Bảng công việc đang chọn */}
                <div className="p-4 rounded-xl border border-line bg-sunken/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                    <div className="font-semibold text-ink inline-flex items-center gap-2">
                      <Video className="w-4 h-4 text-accent" />
                      <span>
                        Bảng công việc #{activeDealDraftJobIdx + 1} (
                        {activeDraftJob?.jobCode || `${dealDraftCode}-J01`}) — Hạng mục Video &amp; Quyền lợi đi kèm
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-surface border border-line font-code text-xs font-semibold text-accent tabular-nums">
                      Cộng Bảng CV #{activeDealDraftJobIdx + 1}:{' '}
                      {formatVnd(activeDraftJobSub.plannedJobNet)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Field label="Mã Job trên Phụ lục">
                      <Input
                        value={
                          activeDraftJob?.jobCode ||
                          `${dealDraftCode}-J0${activeDealDraftJobIdx + 1}`
                        }
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextCode = e.target.value;
                          updateActiveDealDraftJob((j) => ({ ...j, jobCode: nextCode }));
                        }}
                      />
                    </Field>
                    <Field label="Sản phẩm / Nội dung Job" className="sm:col-span-2">
                      <Input
                        value={activeDraftJob?.productName ?? deal.sanPham}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextProd = e.target.value;
                          updateActiveDealDraftJob((j) => ({
                            ...j,
                            productName: nextProd,
                            jobTitle: `Bảng công việc #${activeDealDraftJobIdx + 1} (${j.jobCode}) — ${nextProd}`,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Kênh đăng tải">
                      <Select
                        value={activeDraftJob?.mediaChannel || 'TikTok'}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const ch = e.target.value as NonNullable<
                            DealSowJobItem['mediaChannel']
                          >;
                          updateActiveDealDraftJob((j) => ({ ...j, mediaChannel: ch }));
                        }}
                      >
                        <option value="TikTok">TikTok</option>
                        <option value="Facebook">Facebook Reels</option>
                        <option value="Instagram">Instagram Reels</option>
                        <option value="Shopee Video">Shopee Video</option>
                        <option value="YouTube">YouTube Shorts</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Field label="Ngày air dự kiến (Job này)">
                      <Input
                        type="date"
                        value={dealDraftPlannedAirDate}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextDate = e.target.value;
                          setDealDraftPlannedAirDate(nextDate);
                          updateActiveDealDraftJob((j) => ({
                            ...j,
                            plannedAirDate: nextDate,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Đơn giá Net Video chính (VNĐ)">
                      <Input
                        type="text"
                        inputMode="numeric"
                        disabled={isDealBuilderSowLocked}
                        value={formatNumber(Number(dealDraftVideoNetCost) || 0)}
                        onChange={(e) => {
                          const nextCost = parseThousandNumberInput(e.target.value);
                          setDealDraftVideoNetCost(nextCost);
                          updateActiveDealDraftJob((j) => ({
                            ...j,
                            videoAssetNetCost: nextCost,
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Phương thức thanh toán SOW">
                      <Select
                        value={dealDraftPaymentSchedule}
                        disabled={isDealBuilderSowLocked}
                        onChange={(e) => {
                          const nextOpt = e.target.value as 'ONE_TIME' | 'TWO_TIMES';
                          setDealDraftPaymentSchedule(nextOpt);
                          if (nextOpt === 'ONE_TIME') {
                            setDealDraftAdvanceAmount(0);
                          }
                        }}
                      >
                        <option value="ONE_TIME">1 lần (100% sau nghiệm thu)</option>
                        <option value="TWO_TIMES">2 đợt (Có tạm ứng trước)</option>
                      </Select>
                    </Field>
                    <Field label="Tạm ứng trước toàn Deal (VNĐ)">
                      <Input
                        type="text"
                        inputMode="numeric"
                        disabled={
                          isDealBuilderSowLocked || dealDraftPaymentSchedule === 'ONE_TIME'
                        }
                        value={formatNumber(
                          dealDraftPaymentSchedule === 'ONE_TIME'
                            ? 0
                            : Number(dealDraftAdvanceAmount) || 0
                        )}
                        onChange={(e) => {
                          const nextAdv = parseThousandNumberInput(e.target.value);
                          setDealDraftAdvanceAmount(nextAdv);
                          if (nextAdv > 0 && dealDraftPaymentSchedule !== 'TWO_TIMES') {
                            setDealDraftPaymentSchedule('TWO_TIMES');
                          }
                        }}
                      />
                    </Field>
                  </div>

                  {/* Quyền lợi & Hạng mục đi kèm của Job */}
                  <div className="pt-3 border-t border-line space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        Hạng mục quyền lợi đi kèm trong Bảng công việc #{activeDealDraftJobIdx + 1} (
                        {dealDraftAddons.length} hạng mục)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          {
                            type: 'ADS_CODE' as const,
                            label: 'Mã Spark Ads (30d)',
                            fullLabel: 'Cấp mã quảng cáo Spark Ads (30 ngày)',
                            anchor: 'ACCEPTANCE_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'IMAGE_USAGE' as const,
                            label: 'Sử dụng hình ảnh (30d)',
                            fullLabel: 'Quyền sử dụng hình ảnh & file video gốc (30 ngày)',
                            anchor: 'ACCEPTANCE_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'EXCLUSIVITY' as const,
                            label: 'Độc quyền ngành hàng',
                            fullLabel: 'Độc quyền ngành hàng (30 ngày)',
                            anchor: 'AIR_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'CROSS_POST_REUP' as const,
                            label: 'Đăng chéo / Reup Wave 1',
                            fullLabel: 'Đăng chéo kênh phụ / Reup Wave 1',
                            anchor: 'ACCEPTANCE_DATE' as const,
                            days: 30,
                          },
                          {
                            type: 'LINK_BIO_CART' as const,
                            label: 'Gắn giỏ & Link Bio',
                            fullLabel: 'Gắn giỏ hàng & Link Bio (30 ngày)',
                            anchor: 'AIR_DATE' as const,
                            days: 30,
                          },
                        ].map((preset) => {
                          const active = dealDraftAddons.some(
                            (a) => a.termType === preset.type
                          );
                          return (
                            <button
                              key={preset.type}
                              type="button"
                              disabled={isDealBuilderSowLocked}
                              onClick={() =>
                                handleTogglePresetAddonInBuilder(
                                  preset.type,
                                  preset.fullLabel,
                                  preset.anchor,
                                  preset.days
                                )
                              }
                              className={`px-3 py-1 rounded-md border text-2xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                                active
                                  ? 'bg-ink border-ink text-white'
                                  : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                              }`}
                            >
                              {active ? `✓ ${preset.label}` : `+ ${preset.label}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {dealDraftAddons.length === 0 ? (
                      <div className="p-3 rounded-lg border border-dashed border-line bg-surface text-ink-3 text-center">
                        Bảng công việc #{activeDealDraftJobIdx + 1} hiện chỉ có 1 Hạng mục Video chính. Bấm các nút phía trên để gắn thêm quyền lợi đi kèm vào Phụ lục SOW.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dealDraftAddons.map((addon, idx) => (
                          <div
                            key={addon.id || idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-lg border border-line bg-surface"
                          >
                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                disabled={isDealBuilderSowLocked}
                                value={addon.termLabel}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const nextAddons = dealDraftAddons.map((a, i) =>
                                    i === idx ? { ...a, termLabel: val } : a
                                  );
                                  setDealDraftAddons(nextAddons);
                                  updateActiveDealDraftJob((j) => ({
                                    ...j,
                                    addonServices: nextAddons,
                                  }));
                                }}
                                className="w-full h-8 px-3 rounded-md border border-line bg-surface font-medium text-xs text-ink disabled:bg-sunken disabled:text-ink-3"
                              />
                            </div>
                            <div className="sm:col-span-2 flex items-center gap-2">
                              <input
                                type="number"
                                disabled={isDealBuilderSowLocked}
                                value={addon.durationDays}
                                onChange={(e) => {
                                  const days = Math.max(1, Number(e.target.value) || 30);
                                  const nextAddons = dealDraftAddons.map((a, i) =>
                                    i === idx ? { ...a, durationDays: days } : a
                                  );
                                  setDealDraftAddons(nextAddons);
                                  updateActiveDealDraftJob((j) => ({
                                    ...j,
                                    addonServices: nextAddons,
                                  }));
                                }}
                                className="w-16 h-8 px-2 rounded-md border border-line bg-surface font-code text-xs text-right text-ink disabled:bg-sunken disabled:text-ink-3"
                              />
                              <span className="text-2xs text-ink-3 shrink-0">ngày</span>
                            </div>
                            <div className="sm:col-span-3 flex items-center gap-2">
                              <span className="text-2xs text-ink-3 shrink-0">Phí Net:</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                disabled={isDealBuilderSowLocked}
                                value={formatNumber(Number(addon.allocatedCostVnd) || 0)}
                                onChange={(e) => {
                                  const cost = parseThousandNumberInput(e.target.value);
                                  const nextAddons = dealDraftAddons.map((a, i) =>
                                    i === idx ? { ...a, allocatedCostVnd: cost } : a
                                  );
                                  setDealDraftAddons(nextAddons);
                                  updateActiveDealDraftJob((j) => ({
                                    ...j,
                                    addonServices: nextAddons,
                                  }));
                                }}
                                className="w-full h-8 px-3 rounded-md border border-line bg-surface font-code text-xs text-right font-semibold text-ink tabular-nums disabled:bg-sunken disabled:text-ink-3"
                              />
                            </div>
                            <div className="sm:col-span-1 text-right">
                              {!isDealBuilderSowLocked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextAddons = dealDraftAddons.filter(
                                      (_, i) => i !== idx
                                    );
                                    setDealDraftAddons(nextAddons);
                                    updateActiveDealDraftJob((j) => ({
                                      ...j,
                                      addonServices: nextAddons,
                                    }));
                                  }}
                                  className="text-critical hover:underline text-xs font-medium"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            {isLivestreamBookingItem(deal) && (
              <Panel
                title="Phiếu xác nhận hợp tác Livestream Affiliate & Thông số Phiên Live"
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Copy}
                    onClick={() => {
                      const text = formatLivestreamConfirmationSheet(deal);
                      void navigator.clipboard?.writeText(text);
                      onNotify?.(
                        `Đã sao chép Phiếu xác nhận Livestream (${deal.maBooking || deal.idKenh}) để gửi nhóm làm việc.`,
                        'success'
                      );
                    }}
                  >
                    Sao chép Phiếu xác nhận Live
                  </Button>
                }
              >
                <div className="space-y-4 text-xs">
                  {/* Khối 1: Lịch & Đầu ra phiên Live */}
                  <div className="p-3.5 rounded-lg border border-line bg-sunken/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        1. Lịch phát sóng &amp; Thời lượng cam kết phiên Live
                      </span>
                      <Status
                        tone={
                          (deal.liveActualMinutes || 0) >= (deal.liveCommittedMinutes || 120)
                            ? 'positive'
                            : deal.actualAirDate
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {(deal.liveActualMinutes || 0) > 0
                          ? `Thực tế: ${deal.liveActualMinutes}/${deal.liveCommittedMinutes || 120} phút`
                          : `Cam kết: ${deal.liveCommittedMinutes || 120} phút (${deal.liveSessionsCount || 1} phiên)`}
                      </Status>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <Field label="Giờ bắt đầu">
                        <Input
                          value={deal.liveStartTime || '20:00'}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, { liveStartTime: e.target.value })
                          }
                          placeholder="20:00"
                        />
                      </Field>
                      <Field label="Giờ kết thúc">
                        <Input
                          value={deal.liveEndTime || '22:00'}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, { liveEndTime: e.target.value })
                          }
                          placeholder="22:00"
                        />
                      </Field>
                      <Field label="Cam kết (phút)">
                        <Input
                          type="number"
                          value={deal.liveCommittedMinutes ?? 120}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveCommittedMinutes: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </Field>
                      <Field label="Thực tế (phút)">
                        <Input
                          type="number"
                          value={deal.liveActualMinutes ?? 0}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveActualMinutes: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </Field>
                      <Field label="Số phiên">
                        <Input
                          type="number"
                          value={deal.liveSessionsCount ?? 1}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveSessionsCount: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Lịch Teasing & Đầu ra bổ sung trước phiên Live">
                        <Input
                          value={deal.liveTeasingSchedule || ''}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveTeasingSchedule: e.target.value,
                            })
                          }
                          placeholder="VD: 1 Video Teasing trước 24h + Story đếm ngược"
                        />
                      </Field>
                      <Field label="Cam kết độc quyền trong phiên Live">
                        <Input
                          value={deal.liveExclusivityNote || ''}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveExclusivityNote: e.target.value,
                            })
                          }
                          placeholder="VD: Không gắn sản phẩm đối thủ cùng ngành trong phiên"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Khối 2: Hoa hồng Affiliate, Thưởng GMV & KPI mục tiêu */}
                  <div className="p-3.5 rounded-lg border border-line bg-sunken/30 space-y-3">
                    <span className="font-semibold text-ink block">
                      2. Hoa hồng Affiliate, Thưởng GMV &amp; KPI mục tiêu phiên Live
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <Field label="Hoa hồng Affiliate (%)">
                        <Input
                          type="number"
                          value={deal.liveCommissionPct ?? 15}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveCommissionPct: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </Field>
                      <Field label="Loại KPI">
                        <Select
                          value={deal.liveKpiType || 'Tham chiếu'}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveKpiType: e.target.value as 'Tham chiếu' | 'Cam kết',
                            })
                          }
                        >
                          <option value="Tham chiếu">Tham chiếu</option>
                          <option value="Cam kết">Cam kết</option>
                        </Select>
                      </Field>
                      <Field label="GMV mục tiêu (VNĐ)">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(deal.liveTargetGmv || 0)}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveTargetGmv: parseThousandNumberInput(e.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Đơn mục tiêu">
                        <Input
                          type="number"
                          value={deal.liveTargetOrders ?? 0}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveTargetOrders: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </Field>
                      <Field label="Ngân sách Ads Live (VNĐ)">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(deal.liveAdsBudget || 0)}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveAdsBudget: parseThousandNumberInput(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Mốc thưởng GMV">
                        <Input
                          value={deal.liveGmvBonusTier || ''}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveGmvBonusTier: e.target.value,
                            })
                          }
                          placeholder="VD: Đạt 150tr thưởng 3.000.000đ"
                        />
                      </Field>
                      <Field label="Giá Live / Deal độc quyền">
                        <Input
                          value={deal.liveDealPriceInfo || ''}
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              liveDealPriceInfo: e.target.value,
                            })
                          }
                          placeholder="VD: Mua 1 tặng 1 Refill (Giá Live 429k)"
                        />
                      </Field>
                      <Field label="Voucher / Quà tặng & Tồn kho cam kết">
                        <div className="flex items-center gap-2">
                          <Input
                            value={deal.liveVoucherInfo || ''}
                            disabled={isReadOnlyPartnerRole || isDataLocked}
                            onChange={(e) =>
                              onUpdateDealFields?.(deal.id, {
                                liveVoucherInfo: e.target.value,
                              })
                            }
                            placeholder="Voucher 20% + Freeship"
                          />
                          <Input
                            type="number"
                            value={deal.liveCommittedStock ?? 0}
                            disabled={isReadOnlyPartnerRole || isDataLocked}
                            onChange={(e) =>
                              onUpdateDealFields?.(deal.id, {
                                liveCommittedStock: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            placeholder="Tồn kho"
                            className="w-24 shrink-0"
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Khối 3: Cổng xác nhận 3 bên trước giờ G */}
                  <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-semibold text-ink block">
                        3. Xác nhận 3 bên trước phiên Live (Đủ điều kiện tạo HĐ LIVE-HD &amp; gửi mẫu)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Status
                          tone={
                            deal.liveKocConfirmed &&
                            deal.liveBrandConfirmed &&
                            deal.liveLeaderConfirmed
                              ? 'positive'
                              : 'warning'
                          }
                        >
                          {deal.liveKocConfirmed &&
                          deal.liveBrandConfirmed &&
                          deal.liveLeaderConfirmed
                            ? 'Đủ điều kiện tạo HĐ Livestream'
                            : 'Chờ đủ 3 bên xác nhận'}
                        </Status>
                        <Status
                          tone={
                            deal.liveKocConfirmed && deal.liveBrandConfirmed
                              ? 'positive'
                              : 'neutral'
                          }
                        >
                          {deal.liveKocConfirmed && deal.liveBrandConfirmed
                            ? 'Được phép gửi hàng mẫu'
                            : 'Chưa gửi mẫu'}
                        </Status>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={deal.liveKocConfirmed ? 'primary' : 'secondary'}
                        size="sm"
                        icon={Check}
                        disabled={isReadOnlyPartnerRole}
                        onClick={() =>
                          onUpdateDealFields?.(deal.id, {
                            liveKocConfirmed: !deal.liveKocConfirmed,
                          })
                        }
                      >
                        {deal.liveKocConfirmed ? 'KOC đã xác nhận' : 'Xác nhận KOC'}
                      </Button>
                      <Button
                        variant={deal.liveBrandConfirmed ? 'primary' : 'secondary'}
                        size="sm"
                        icon={Check}
                        onClick={() =>
                          onUpdateDealFields?.(deal.id, {
                            liveBrandConfirmed: !deal.liveBrandConfirmed,
                          })
                        }
                      >
                        {deal.liveBrandConfirmed ? 'Brand đã xác nhận' : 'Xác nhận Brand'}
                      </Button>
                      <Button
                        variant={deal.liveLeaderConfirmed ? 'primary' : 'secondary'}
                        size="sm"
                        icon={UserCheck}
                        disabled={isReadOnlyPartnerRole}
                        onClick={() =>
                          onUpdateDealFields?.(deal.id, {
                            liveLeaderConfirmed: !deal.liveLeaderConfirmed,
                          })
                        }
                      >
                        {deal.liveLeaderConfirmed ? 'Leader đã duyệt' : 'Leader xác nhận'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>

          {/* CỘT PHẢI (4 CỘT): Tổng hợp Phụ lục SOW, Gian hàng & Hồ sơ KOC */}
          <div className="lg:col-span-4 space-y-5">
            {/* Panel 3: Tổng hợp Phụ lục SOW & Thao tác phát hành */}
            <Panel title="Tổng hợp Phụ lục SOW & Giải ngân">
              <div className="space-y-4 text-xs">
                <div className="divide-y divide-line border border-line rounded-lg bg-sunken/40 px-3">
                  {dealDraftJobs.map((jobItem, idx) => {
                    const sub = computeDealSowJobSubtotal(jobItem);
                    return (
                      <div
                        key={jobItem.id || idx}
                        className="py-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate">
                            Bảng CV #{idx + 1} · {jobItem.jobCode}
                          </div>
                          <div className="text-2xs text-ink-3 truncate">
                            {jobItem.productName || deal.sanPham} ·{' '}
                            {(jobItem.addonServices || []).length} quyền lợi
                          </div>
                        </div>
                        <div className="font-code font-semibold text-ink tabular-nums shrink-0">
                          {formatVnd(sub.plannedJobNet)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <dl className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-ink-2">
                    <dt>Tổng đơn giá Video Net</dt>
                    <dd className="font-code font-medium text-ink tabular-nums">
                      {formatVnd(draftTotalVideoNet)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-ink-2">
                    <dt>Tổng phí quyền lợi đi kèm</dt>
                    <dd className="font-code font-medium text-ink tabular-nums">
                      {formatVnd(draftTotalAddonsNet)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-ink-2">
                    <dt>Chi phí Gross kèm thuế</dt>
                    <dd className="font-code text-ink-2 tabular-nums">
                      {formatVnd(draftGrossWithTax)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-line font-semibold text-ink">
                    <dt>Tổng giá trị Deal (Ghi trên SOW)</dt>
                    <dd className="font-code text-sm text-accent tabular-nums">
                      {formatVnd(draftGrandDealNet)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-ink-2">
                    <dt>Tạm ứng trước</dt>
                    <dd className="font-code text-warning font-medium tabular-nums">
                      {formatVnd(dealDraftAdvanceAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-ink-2">
                    <dt>Còn lại quyết toán sau BBNT</dt>
                    <dd className="font-code text-positive font-semibold tabular-nums">
                      {formatVnd(draftRemainingPayable)}
                    </dd>
                  </div>
                </dl>

                {!isDealBuilderSowLocked ? (
                  <div className="pt-2 border-t border-line flex flex-col gap-2">
                    {onOpenContractForDeal && (
                      <Button
                        variant="primary"
                        icon={FileText}
                        onClick={() => handleSaveDealWorkspace(true)}
                      >
                        Lưu Deal &amp; Ký Phụ lục SOW
                      </Button>
                    )}
                    <Button
                      variant={onOpenContractForDeal ? 'secondary' : 'primary'}
                      icon={FileCheck}
                      onClick={() => handleSaveDealWorkspace(false)}
                    >
                      Lưu cấu hình Deal
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-line flex flex-col gap-2">
                    {onOpenContractForDeal && mappedBookingDeal && (
                      <Button
                        variant="secondary"
                        icon={FileText}
                        onClick={() => onOpenContractForDeal(mappedBookingDeal, 'SOW')}
                      >
                        Mở văn bản Phụ lục SOW
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      icon={Unlock}
                      onClick={handleUnlockForAmendmentAppendix}
                    >
                      Lập Phụ lục bổ sung ({nextAmendmentAppendixCode})
                    </Button>
                  </div>
                )}
              </div>
            </Panel>

            {/* Panel 4: Gian hàng, Sản phẩm & Lịch phát sóng */}
            <Panel title="Gian hàng & Lịch phát sóng">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-2xs text-ink-3">Gian hàng</dt>
                  <dd className="font-medium text-ink mt-0.5">{deal.storeName}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Thương hiệu &amp; Kỳ</dt>
                  <dd className="text-ink mt-0.5">
                    {deal.brandName} · <span className="font-code">{deal.thangPlan}</span> ({deal.dot})
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-2xs text-ink-3">Sản phẩm trọng tâm (SKU)</dt>
                  <dd className="font-medium text-ink mt-0.5">
                    {deal.sanPham || 'Chưa gán sản phẩm'}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Định hướng nội dung</dt>
                  <dd className="text-ink mt-0.5">{deal.pillarContent || 'Review trực tiếp'}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Nhân sự phụ trách</dt>
                  <dd className="mt-0.5">
                    <Person
                      name={deal.nguoiPhuTrach || 'Chuyên viên Booking'}
                      sub={deal.leaderName ? `Leader: ${deal.leaderName}` : undefined}
                      size={20}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Ngày air cam kết</dt>
                  <dd className="font-code text-ink tabular-nums mt-0.5">
                    {dealDraftPlannedAirDate
                      ? formatDate(dealDraftPlannedAirDate)
                      : 'Chưa chốt ngày air'}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Ngày air thực tế &amp; SLA</dt>
                  <dd className="text-ink mt-0.5">
                    <span className="font-code tabular-nums">
                      {deal.actualAirDate ? formatDate(deal.actualAirDate) : 'Chưa lên sóng'}
                    </span>
                    <span className="text-ink-3"> · {deal.trangThaiSlaAir}</span>
                  </dd>
                </div>
              </dl>
            </Panel>

            {/* Panel 5: Thông tin KOC & Gửi hàng mẫu */}
            <Panel title="Thông tin KOC & Gửi hàng mẫu">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-2xs text-ink-3">Nghệ danh / KOC</dt>
                  <dd className="font-medium text-ink mt-0.5">{deal.tenKenh || deal.idKenh}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">ID Kênh TikTok</dt>
                  <dd className="font-code text-ink mt-0.5">@{deal.idKenh.replace(/^@/, '')}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Tệp kênh &amp; Phân loại</dt>
                  <dd className="text-ink mt-0.5">
                    {deal.tepKenh || 'Review'} · {deal.phanLoaiVideo || 'Affiliate KOC'}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Điện thoại nhận mẫu</dt>
                  <dd className="font-code text-ink mt-0.5">
                    {maskSensitive(deal.sdtNhanHang || matchedKoc?.phone, canViewFullPii && showSensitive)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-2xs text-ink-3">Địa chỉ gửi hàng mẫu</dt>
                  <dd className="text-ink mt-0.5">
                    {deal.diaChiNhanHang ||
                      matchedKoc?.shippingAddress ||
                      'Chưa cập nhật địa chỉ nhận mẫu'}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'CONTRACT' && (
        <div className="space-y-5">
          {/* Hàng trên: Chuỗi 3 chặng văn bản pháp lý */}
          <Panel
            title="Chuỗi 3 chặng văn bản pháp lý (HĐNT · Phụ lục SOW · BBNT)"
            actions={
              <div className="flex items-center gap-2">
                {onPullContractLinks && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RefreshCw}
                    disabled={isPullingContractLinks}
                    onClick={onPullContractLinks}
                  >
                    Kéo HĐ · PL · BBNT &amp; Link
                  </Button>
                )}
                {canViewFullPii && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSensitive((v) => !v)}
                  >
                    {showSensitive ? 'Che CCCD / MST' : 'Hiện đầy đủ CCCD / MST'}
                  </Button>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chặng 1: HĐNT */}
              <div className="p-4 rounded-xl border border-line bg-sunken/30 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs font-medium text-ink-3">
                      1. Hợp đồng nguyên tắc
                    </span>
                    {linkedContracts.hdnt ? (
                      <Status tone={contractStatus(linkedContracts.hdnt).tone}>
                        {contractStatus(linkedContracts.hdnt).label}
                      </Status>
                    ) : (
                      <Status tone="neutral">Khung năm</Status>
                    )}
                  </div>
                  <div className="font-code text-xs font-semibold text-ink truncate">
                    {linkedContracts.hdnt?.contractSystem?.contractCode ||
                      linkedContracts.hdnt?.title ||
                      deal.masterContractCode ||
                      'Chưa gắn mã HĐNT'}
                  </div>
                  <div className="text-2xs text-ink-3">
                    {linkedContracts.hdnt
                      ? computeSigningProgress(linkedContracts.hdnt.signing.at(-1))
                          ?.summaryText || 'Đã khởi tạo hồ sơ HĐNT'
                      : 'Áp dụng chung cho các Deal của KOC'}
                  </div>
                  {linkedContracts.hdnt && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {linkedContracts.hdnt.contractSystem?.googleDocsUrl && (
                        <a
                          href={linkedContracts.hdnt.contractSystem.googleDocsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Google Docs
                        </a>
                      )}
                      {(linkedContracts.hdnt.signing.at(-1)?.signedFileUrl ||
                        linkedContracts.hdnt.contractSystem?.signedFileUrl) && (
                        <a
                          href={
                            linkedContracts.hdnt.signing.at(-1)?.signedFileUrl ||
                            linkedContracts.hdnt.contractSystem?.signedFileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-medium text-positive hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Bản đã ký
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {onOpenContractForDeal && mappedBookingDeal && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FileText}
                    onClick={() => onOpenContractForDeal(mappedBookingDeal, 'HDNT')}
                  >
                    {linkedContracts.hdnt ? 'Mở hồ sơ HĐNT' : 'Soạn HĐNT'}
                  </Button>
                )}
              </div>

              {/* Chặng 2: Phụ lục SOW */}
              <div className="p-4 rounded-xl border border-line bg-sunken/30 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs font-medium text-ink-3">
                      2. Phụ lục SOW theo Deal
                    </span>
                    <Status tone={sowSigningCompleted ? 'positive' : 'warning'}>
                      {sowSigningCompleted ? 'Đã duyệt' : 'Chờ duyệt'}
                    </Status>
                  </div>
                  <div className="font-code text-xs font-semibold text-ink truncate">
                    {linkedContracts.sow?.contractSystem?.contractCode ||
                      linkedContracts.sow?.title ||
                      deal.contractAppendixCode ||
                      (deal.maBooking ? `PL-${deal.maBooking}-01` : 'Chưa cấp mã SOW')}
                  </div>
                  <div className="text-2xs text-ink-3">
                    {linkedContracts.sow
                      ? computeSigningProgress(linkedContracts.sow.signing.at(-1))
                          ?.summaryText || `Giá trị Net: ${formatVnd(deal.chiPhiBookingNetCuoi)}`
                      : `Giá trị Net: ${formatVnd(deal.chiPhiBookingNetCuoi)}`}
                  </div>
                  {linkedContracts.sow && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {linkedContracts.sow.contractSystem?.googleDocsUrl && (
                        <a
                          href={linkedContracts.sow.contractSystem.googleDocsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Google Docs
                        </a>
                      )}
                      {(linkedContracts.sow.signing.at(-1)?.signedFileUrl ||
                        linkedContracts.sow.contractSystem?.signedFileUrl) && (
                        <a
                          href={
                            linkedContracts.sow.signing.at(-1)?.signedFileUrl ||
                            linkedContracts.sow.contractSystem?.signedFileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-medium text-positive hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Bản đã ký
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {onOpenContractForDeal && mappedBookingDeal && (
                  <Button
                    variant={sowSigningCompleted ? 'secondary' : 'primary'}
                    size="sm"
                    icon={FileText}
                    onClick={() => onOpenContractForDeal(mappedBookingDeal, 'SOW')}
                  >
                    {linkedContracts.sow ? 'Mở Phụ lục SOW' : 'Soạn & Ký SOW'}
                  </Button>
                )}
              </div>

              {/* Chặng 3: Biên bản nghiệm thu BBNT */}
              <div className="p-4 rounded-xl border border-line bg-sunken/30 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs font-medium text-ink-3">
                      3. Biên bản nghiệm thu
                    </span>
                    <Status tone={linkedContracts.bbnt || isAccepted ? 'positive' : 'neutral'}>
                      {linkedContracts.bbnt
                        ? contractStatus(linkedContracts.bbnt).label
                        : isAccepted
                        ? 'Đã duyệt'
                        : 'Nháp'}
                    </Status>
                  </div>
                  <div className="font-code text-xs font-semibold text-ink truncate">
                    {linkedContracts.bbnt?.contractSystem?.contractCode ||
                      linkedContracts.bbnt?.title ||
                      (deal.maBooking ? `BBNT-${deal.maBooking}` : 'Chưa lập BBNT')}
                  </div>
                  <div className="text-2xs text-ink-3">
                    {linkedContracts.bbnt
                      ? computeSigningProgress(linkedContracts.bbnt.signing.at(-1))
                          ?.summaryText || 'Đã khởi tạo BBNT'
                      : isAccepted
                      ? `Đã nghiệm thu ngày ${formatDate(deal.actualAirDate)}`
                      : 'Cần có link video thực tế để xuất BBNT'}
                  </div>
                  {linkedContracts.bbnt && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {linkedContracts.bbnt.contractSystem?.googleDocsUrl && (
                        <a
                          href={linkedContracts.bbnt.contractSystem.googleDocsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Google Docs
                        </a>
                      )}
                      {(linkedContracts.bbnt.signing.at(-1)?.signedFileUrl ||
                        linkedContracts.bbnt.contractSystem?.signedFileUrl) && (
                        <a
                          href={
                            linkedContracts.bbnt.signing.at(-1)?.signedFileUrl ||
                            linkedContracts.bbnt.contractSystem?.signedFileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-medium text-positive hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Bản đã ký
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onOpenContractForDeal && mappedBookingDeal && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FileText}
                      onClick={() => onOpenContractForDeal(mappedBookingDeal, 'BBNT')}
                    >
                      {linkedContracts.bbnt ? 'Mở BBNT' : 'Soạn BBNT'}
                    </Button>
                  )}
                  {onOpenDraftBbntPreview && mappedBookingDeal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDraftBbntPreview(mappedBookingDeal)}
                    >
                      Xem nháp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* Hàng dưới 2 cột: Đường link văn bản (8 cột) & Chủ thể pháp lý KOC (4 cột) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8">
              <Panel title="Đường dẫn lưu trữ Hợp đồng (HĐNT) · Phụ lục (PL) · Biên bản (BBNT)">
                <div className="space-y-4 text-xs">
                  {/* 1. HĐNT */}
                  <div className="p-4 rounded-lg border border-line bg-sunken/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        1. Hợp đồng nguyên tắc (HĐNT)
                      </span>
                      <span className="text-2xs font-code text-ink-2">
                        {deal.masterContractStatus ||
                          (linkedContracts.hdnt
                            ? contractStatus(linkedContracts.hdnt).label
                            : 'CHƯA_LẬP')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Số / Mã HĐNT">
                        <Input
                          value={
                            deal.masterContractCode ||
                            linkedContracts.hdnt?.contractSystem?.contractCode ||
                            linkedContracts.hdnt?.title ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              masterContractCode: e.target.value,
                            })
                          }
                          placeholder="VD: 291026/HDNT/KOC"
                        />
                      </Field>
                      <Field label="Link Google Docs HĐNT">
                        <Input
                          value={
                            deal.masterContractGoogleDocsUrl ||
                            linkedContracts.hdnt?.contractSystem?.googleDocsUrl ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              masterContractGoogleDocsUrl: e.target.value,
                            })
                          }
                          placeholder="https://docs.google.com/document/d/..."
                        />
                      </Field>
                      <Field label="Link bản HĐNT đã ký">
                        <Input
                          value={
                            deal.masterContractSignedUrl ||
                            linkedContracts.hdnt?.signing.at(-1)?.signedFileUrl ||
                            linkedContracts.hdnt?.contractSystem?.signedFileUrl ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              masterContractSignedUrl: e.target.value,
                            })
                          }
                          placeholder="/api/contracts/.../document"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* 2. Phụ lục SOW */}
                  <div className="p-4 rounded-lg border border-line bg-sunken/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        2. Phụ lục Hợp đồng theo Deal (PL / SOW)
                      </span>
                      <span className="text-2xs font-code text-ink-2">
                        {deal.contractAppendixStatus || 'CHỜ_KÝ'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Số / Mã Phụ lục SOW">
                        <Input
                          value={
                            deal.contractAppendixCode ||
                            linkedContracts.sow?.contractSystem?.contractCode ||
                            linkedContracts.sow?.title ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              contractAppendixCode: e.target.value,
                            })
                          }
                          placeholder="VD: PL-BO2610-01"
                        />
                      </Field>
                      <Field label="Link Google Docs Phụ lục">
                        <Input
                          value={
                            deal.contractAppendixGoogleDocsUrl ||
                            linkedContracts.sow?.contractSystem?.googleDocsUrl ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              contractAppendixGoogleDocsUrl: e.target.value,
                            })
                          }
                          placeholder="https://docs.google.com/document/d/..."
                        />
                      </Field>
                      <Field label="Link bản Phụ lục đã ký">
                        <Input
                          value={
                            deal.contractAppendixSignedUrl ||
                            linkedContracts.sow?.signing.at(-1)?.signedFileUrl ||
                            linkedContracts.sow?.contractSystem?.signedFileUrl ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              contractAppendixSignedUrl: e.target.value,
                            })
                          }
                          placeholder="/api/contracts/.../document"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* 3. BBNT */}
                  <div className="p-4 rounded-lg border border-line bg-sunken/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        3. Biên bản nghiệm thu (BBNT)
                      </span>
                      <span className="text-2xs font-code text-ink-2">
                        {deal.bbntStatus ||
                          (linkedContracts.bbnt
                            ? contractStatus(linkedContracts.bbnt).label
                            : 'CHƯA_LẬP')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Số / Mã BBNT">
                        <Input
                          value={
                            deal.bbntCode ||
                            linkedContracts.bbnt?.contractSystem?.contractCode ||
                            linkedContracts.bbnt?.title ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, { bbntCode: e.target.value })
                          }
                          placeholder="VD: BBNT-BO2610-01"
                        />
                      </Field>
                      <Field label="Link Google Docs BBNT">
                        <Input
                          value={
                            deal.bbntGoogleDocsUrl ||
                            linkedContracts.bbnt?.contractSystem?.googleDocsUrl ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              bbntGoogleDocsUrl: e.target.value,
                            })
                          }
                          placeholder="https://docs.google.com/document/d/..."
                        />
                      </Field>
                      <Field label="Link bản BBNT đã ký">
                        <Input
                          value={
                            deal.bbntSignedUrl ||
                            linkedContracts.bbnt?.signing.at(-1)?.signedFileUrl ||
                            linkedContracts.bbnt?.contractSystem?.signedFileUrl ||
                            ''
                          }
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              bbntSignedUrl: e.target.value,
                            })
                          }
                          placeholder="/api/contracts/.../document"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="lg:col-span-4">
              <Panel title="Chủ thể pháp lý & Tài khoản thuế KOC">
                <div className="space-y-3 text-xs">
                  {matchedKoc && getKocLegalProfiles(matchedKoc).length > 0 && (
                    <Field label="Chọn Hồ sơ pháp lý KOC áp dụng cho Deal">
                      <Select
                        disabled={isReadOnlyPartnerRole || isDataLocked}
                        value={deal.legalProfileId || activeLegalProfile?.id || ''}
                        onChange={(e) => {
                          const profiles = getKocLegalProfiles(matchedKoc);
                          const picked = profiles.find((p) => p.id === e.target.value);
                          if (!picked) return;
                          onUpdateDealFields?.(deal.id, {
                            legalProfileId: picked.id,
                            loaiTaiKhoanThanhToan:
                              picked.taxAccountType || deal.loaiTaiKhoanThanhToan,
                            tenTaiKhoanNganHang: normalizeBankHolderUpperNoAccent(
                              picked.bankHolderName || picked.holderName || deal.tenTaiKhoanNganHang
                            ),
                            soTaiKhoan:
                              picked.bankAccount ||
                              picked.bankAccountNumber ||
                              deal.soTaiKhoan,
                            nganHang: picked.bankName || deal.nganHang,
                            soCccd:
                              picked.taxCode ||
                              picked.cccd ||
                              deal.soCccd,
                          });
                          onNotify?.(
                            `Đã đồng bộ Hồ sơ pháp lý (${picked.profileCode || picked.holderName}) vào Deal ${deal.maBooking || ''}.`,
                            'success'
                          );
                        }}
                      >
                        {getKocLegalProfiles(matchedKoc).map((prof) => (
                          <option key={prof.id} value={prof.id}>
                            {prof.profileCode || prof.legalType} · {prof.holderName} ({prof.bankName || 'NH'})
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-2xs text-ink-3">Loại chủ thể &amp; Khấu trừ thuế</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {activeLegalProfile
                          ? `${activeLegalProfile.taxAccountType} · ${activeLegalProfile.holderName}`
                          : deal.loaiTaiKhoanThanhToan}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Số CCCD / Mã số thuế</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(
                          activeLegalProfile?.taxCode ||
                            activeLegalProfile?.cccd ||
                            deal.soCccd ||
                            matchedKoc?.cccd,
                          showSensitive
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Chủ tài khoản thụ hưởng</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {deal.tenTaiKhoanNganHang || 'Chưa cập nhật'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Ngân hàng &amp; Số tài khoản</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.soTaiKhoan, canViewFullPii && showSensitive)} · {deal.nganHang || '—'}
                      </dd>
                    </div>
                  </dl>
                  {(deal.loaiTaiKhoanThanhToan.includes('Công ty') ||
                    deal.loaiTaiKhoanThanhToan.includes('Hộ kinh doanh')) && (
                    <div className="pt-2 border-t border-line">
                      <Field label="Số Hóa đơn VAT / Bán hàng (Quyết toán)">
                        <Input
                          className="font-code"
                          disabled={isReadOnlyPartnerRole || isDataLocked}
                          value={deal.soHoaDonVat || ''}
                          onChange={(e) =>
                            onUpdateDealFields?.(deal.id, {
                              soHoaDonVat: e.target.value,
                            })
                          }
                          placeholder="VD: HD-001284..."
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ACCEPTANCE' &&
        (() => {
          const jobs = ensureDealJobsForApprovedItem(deal);
          const totalAddons = jobs.flatMap((j) => j.addonServices || []);
          const activeAddons = totalAddons.filter((a) => a.acceptanceStatus !== 'DROPPED');
          const verifiedAddons = totalAddons.filter((a) => a.acceptanceStatus === 'VERIFIED');
          const pendingAddons = totalAddons.filter(
            (a) => a.acceptanceStatus === 'PENDING_ACCEPTANCE'
          );

          const airedJobsCount = jobs.filter((j) =>
            Boolean(j.linkAir?.trim() || j.actualAirDate?.trim())
          ).length;
          const isAllJobsAired = airedJobsCount === jobs.length && jobs.length > 0;
          const isStage1Complete = isAllJobsAired;
          const isStage2Complete =
            isStage1Complete &&
            (activeAddons.length === 0 ||
              activeAddons.every((a) => a.acceptanceStatus === 'VERIFIED'));
          const isDealFullyAccepted =
            deal.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' || isStage2Complete;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* CỘT TRÁI (8 CỘT): Quy trình nghiệm thu 2 tầng theo từng Job */}
              <div className="lg:col-span-8 space-y-5">
                <Panel
                  title={`Nghiệm thu theo Bảng công việc & Quyền lợi (${jobs.length} Job)`}
                  actions={
                    <div className="flex items-center gap-2">
                      {deal.linkAir && onOpenTikTokInspector && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => onOpenTikTokInspector(deal)}
                        >
                          Đối soát kịch bản &amp; giỏ hàng
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Video}
                        onClick={() => onOpenAcceptanceModal?.(deal)}
                      >
                        {isAccepted ? 'Cập nhật hàng loạt' : 'Nghiệm thu video'}
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-4 text-xs">
                    {/* 3 ô tiến độ nghiệm thu */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        className={`p-3 rounded-lg border ${
                          isStage1Complete
                            ? 'border-positive/40 bg-positive-soft/20'
                            : 'border-line bg-sunken/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink text-2xs">
                            1. Video lên sóng
                          </span>
                          <Status tone={isStage1Complete ? 'positive' : 'warning'}>
                            {isStage1Complete ? 'Hoàn tất' : `${airedJobsCount}/${jobs.length} Job`}
                          </Status>
                        </div>
                        <div className="text-2xs text-ink-3 mt-1">
                          {isStage1Complete
                            ? `Đủ link bài đăng cho ${jobs.length} Job`
                            : `Còn ${jobs.length - airedJobsCount} Job chưa lên sóng`}
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-lg border ${
                          !isStage1Complete
                            ? 'border-line bg-sunken/40 opacity-75'
                            : isStage2Complete
                            ? 'border-positive/40 bg-positive-soft/20'
                            : 'border-warning/40 bg-warning-soft/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink text-2xs">
                            2. Asset &amp; Quyền lợi
                          </span>
                          <Status
                            tone={
                              !isStage1Complete
                                ? 'neutral'
                                : isStage2Complete
                                ? 'positive'
                                : 'warning'
                            }
                          >
                            {!isStage1Complete
                              ? 'Nháp'
                              : isStage2Complete
                              ? 'Hoàn tất'
                              : `${verifiedAddons.length}/${activeAddons.length}`}
                          </Status>
                        </div>
                        <div className="text-2xs text-ink-3 mt-1">
                          {!isStage1Complete
                            ? 'Cần nghiệm thu video trước'
                            : isStage2Complete
                            ? `Đã nhận đủ ${verifiedAddons.length} hạng mục`
                            : `Còn ${pendingAddons.length} quyền lợi chờ bàn giao`}
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-lg border ${
                          isDealFullyAccepted
                            ? 'border-positive/40 bg-positive-soft/20'
                            : 'border-line bg-sunken/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink text-2xs">
                            3. Quyết toán &amp; BBNT
                          </span>
                          <Status tone={isDealFullyAccepted ? 'positive' : 'neutral'}>
                            {isDealFullyAccepted ? 'Đã duyệt' : 'Nháp'}
                          </Status>
                        </div>
                        <div className="text-2xs text-ink-3 mt-1">
                          {isDealFullyAccepted
                            ? `Cần chi: ${formatVndShort(deal.soTienCanThanhToan || 0)}`
                            : 'Hoàn tất tầng 1 & 2 để mở khóa'}
                        </div>
                      </div>
                    </div>

                    {/* Danh sách từng Job nghiệm thu */}
                    {jobs.map((jobItem, jIdx) => {
                      const sub = computeDealSowJobSubtotal(jobItem);
                      const jobLink = jobItem.linkAir || (jIdx === 0 ? deal.linkAir : '');
                      const jobAirDate =
                        jobItem.actualAirDate || (jIdx === 0 ? deal.actualAirDate : '');
                      const hasJobAir = Boolean(jobLink || jobAirDate);

                      return (
                        <div
                          key={jobItem.id || jIdx}
                          className="p-4 rounded-xl border border-line bg-sunken/20 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-code font-semibold text-2xs">
                                Bảng CV #{jIdx + 1} · {jobItem.jobCode}
                              </span>
                              <span className="font-semibold text-ink">
                                {jobItem.productName || jobItem.jobTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-code text-2xs font-semibold text-ink">
                                Net: {formatVnd(sub.acceptedJobNet)}
                              </span>
                              <Status tone={hasJobAir ? 'positive' : 'warning'}>
                                {hasJobAir ? 'Hoàn tất' : 'Chờ duyệt'}
                              </Status>
                            </div>
                          </div>

                          {/* Tầng 1: Video chính lên sóng */}
                          <div className="p-3 rounded-lg border border-line bg-surface space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-medium text-ink">
                                <Video className="w-3.5 h-3.5 text-accent" />
                                <span>Tầng 1: Video chính lên sóng</span>
                              </div>
                              {jobAirDate && (
                                <span className="font-code text-2xs text-ink-2">
                                  Ngày air: {formatDate(jobAirDate)}
                                </span>
                              )}
                            </div>

                            {editingAirJobIdx === jIdx ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                <input
                                  type="text"
                                  value={quickAirLink}
                                  onChange={(e) => setQuickAirLink(e.target.value)}
                                  placeholder="Dán link video TikTok..."
                                  className="sm:col-span-2 h-8 px-3 rounded-md border border-line bg-surface font-code text-xs text-ink"
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={quickAirDate}
                                    onChange={(e) => setQuickAirDate(e.target.value)}
                                    className="h-8 px-2 rounded-md border border-line bg-surface font-code text-xs text-ink flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleSaveJobAirVideo(jIdx)}
                                  >
                                    Lưu
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingAirJobIdx(null)}
                                  >
                                    Hủy
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {jobLink ? (
                                    <>
                                      <a
                                        href={jobLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-code text-xs text-accent hover:underline truncate max-w-[360px]"
                                      >
                                        {jobLink}
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopy(jobLink, `jobLink_${jIdx}`, 'link video')
                                        }
                                        className="p-1 rounded text-ink-3 hover:text-ink"
                                      >
                                        {copiedField === `jobLink_${jIdx}` ? (
                                          <Check className="w-3.5 h-3.5 text-positive" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-ink-3 text-2xs">
                                      Chưa cập nhật đường dẫn video phát sóng
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAirJobIdx(jIdx);
                                    setQuickAirLink(jobLink || '');
                                    setQuickAirDate(jobAirDate || getVietnamDateYmd());
                                  }}
                                >
                                  {jobLink ? 'Sửa link' : 'Cập nhật link air'}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Tầng 2: Asset & Quyền lợi đi kèm */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-medium text-ink">
                                <Sparkles className="w-3.5 h-3.5 text-accent" />
                                <span>
                                  Tầng 2: Bàn giao Asset &amp; Quyền lợi đi kèm (
                                  {jobItem.addonServices?.length || 0})
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Plus}
                                onClick={() => {
                                  setAddingAddonJobIdx(jIdx);
                                  setNewAddonType('ADS_CODE');
                                  setNewAddonLabel('Mã ủy quyền Spark Ads (30 ngày)');
                                  setNewAddonDays(30);
                                  setNewAddonCost(0);
                                  setNewAddonEvidence('');
                                }}
                              >
                                Thêm asset
                              </Button>
                            </div>

                            {(jobItem.addonServices || []).map((addon) => {
                              const isEditingEvidence = editingAddonId === addon.id;
                              const isVerified = addon.acceptanceStatus === 'VERIFIED';
                              const isDropped = addon.acceptanceStatus === 'DROPPED';
                              const isLocked = !hasJobAir;

                              return (
                                <div
                                  key={addon.id}
                                  className="p-3 rounded-lg border border-line bg-surface space-y-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-ink">
                                        {addon.termLabel}
                                      </span>
                                      <span className="text-2xs px-2 py-0.5 rounded bg-sunken text-ink-2 font-code">
                                        {addon.durationDays
                                          ? `${addon.durationDays} ngày`
                                          : 'Theo thỏa thuận'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Status
                                        tone={
                                          isDropped
                                            ? 'critical'
                                            : isVerified
                                            ? 'positive'
                                            : isLocked
                                            ? 'neutral'
                                            : 'warning'
                                        }
                                      >
                                        {isDropped
                                          ? 'Đã hủy'
                                          : isVerified
                                          ? 'Hoàn tất'
                                          : isLocked
                                          ? 'Nháp'
                                          : 'Chờ duyệt'}
                                      </Status>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveAddonFromJob(jIdx, addon.id)}
                                        className="p-1 rounded text-ink-3 hover:text-critical"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-2xs">
                                    <div className="flex-1 min-w-[200px]">
                                      {isEditingEvidence ? (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={editingEvidenceText}
                                            onChange={(e) =>
                                              setEditingEvidenceText(e.target.value)
                                            }
                                            placeholder="Nhập mã Spark Ads hoặc link Drive..."
                                            className="h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink flex-1"
                                          />
                                          <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() =>
                                              handleSaveAddonEvidence(
                                                jIdx,
                                                addon.id,
                                                editingEvidenceText
                                              )
                                            }
                                          >
                                            Lưu
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingAddonId(null)}
                                          >
                                            Hủy
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-ink-3">Bằng chứng:</span>
                                          {addon.evidenceCodeOrUrl ? (
                                            <span className="font-code font-semibold text-ink">
                                              {addon.evidenceCodeOrUrl}
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingAddonId(addon.id);
                                                setEditingEvidenceText('');
                                              }}
                                              className="text-accent hover:underline font-medium"
                                            >
                                              Nhập mã / link bàn giao
                                            </button>
                                          )}
                                          {addon.evidenceCodeOrUrl && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingAddonId(addon.id);
                                                setEditingEvidenceText(
                                                  addon.evidenceCodeOrUrl || ''
                                                );
                                              }}
                                              className="text-accent hover:underline"
                                            >
                                              Sửa
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {!isLocked && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleAddonStatus(jIdx, addon.id, 'VERIFIED')
                                          }
                                          className={`px-2 py-0.5 rounded text-2xs font-medium ${
                                            isVerified
                                              ? 'bg-positive text-white'
                                              : 'border border-line bg-surface text-ink hover:bg-positive-soft'
                                          }`}
                                        >
                                          Đã nhận
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleAddonStatus(jIdx, addon.id, 'DROPPED')
                                          }
                                          className={`px-2 py-0.5 rounded text-2xs font-medium ${
                                            isDropped
                                              ? 'bg-critical text-white'
                                              : 'border border-line bg-surface text-ink-3 hover:bg-critical-soft'
                                          }`}
                                        >
                                          Khấu trừ
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {addingAddonJobIdx === jIdx && (
                              <div className="p-3 rounded-lg border border-line bg-surface space-y-3">
                                <div className="font-semibold text-ink flex items-center justify-between">
                                  <span>Thêm quyền lợi / Asset đi kèm cho Job #{jIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setAddingAddonJobIdx(null)}
                                    className="text-ink-3 hover:text-ink"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <Field label="Tên hạng mục hiển thị">
                                    <Input
                                      value={newAddonLabel}
                                      onChange={(e) => setNewAddonLabel(e.target.value)}
                                    />
                                  </Field>
                                  <Field label="Mã Spark Ads / Link bàn giao">
                                    <Input
                                      value={newAddonEvidence}
                                      onChange={(e) => setNewAddonEvidence(e.target.value)}
                                      placeholder="Dán mã hoặc link..."
                                    />
                                  </Field>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAddingAddonJobIdx(null)}
                                  >
                                    Hủy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleAddNewAddonToJob(jIdx)}
                                  >
                                    Thêm hạng mục
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>

              {/* CỘT PHẢI (4 CỘT): Kết nối Lark 3 Luồng — (1) Tạm ứng QNvp · (2) Nghiệm thu & Khóa sổ WORKDAY 3 · (3) Tất toán ĐNTT KN8A & Bill UNC */}
              <div className="lg:col-span-4 space-y-5">
                {/* LUỒNG 1: Tạm ứng Deal trên Lark Approval (Whiteboard QNvp) */}
                {(() => {
                  const sowExtracted = linkedContracts.sow
                    ? extractSowPaymentScheduleAndAdvance(
                        linkedContracts.sow.values,
                        linkedContracts.sow.templateId
                      )
                    : undefined;
                  const effectiveSowSchedule: 'ONE_TIME' | 'TWO_TIMES' =
                    sowExtracted?.paymentScheduleOption ||
                    deal.paymentScheduleOption ||
                    ((deal.soTienTamUngTruoc || 0) > 0 ? 'TWO_TIMES' : 'ONE_TIME');
                  const isTwoTimesSow = effectiveSowSchedule === 'TWO_TIMES';
                  const effectiveAdvanceAmount = isTwoTimesSow
                    ? deal.soTienTamUngTruoc || sowExtracted?.advanceAmount || 0
                    : 0;

                  return (
                    <Panel
                      title="1. Luồng Tạm ứng Lark (QNvp)"
                      actions={
                        <Status
                          tone={
                            deal.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG' ||
                            deal.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG'
                              ? 'positive'
                              : deal.larkAdvanceStatus === 'TỪ_CHỐI_TẠM_ỨNG'
                              ? 'critical'
                              : !isTwoTimesSow
                              ? 'neutral'
                              : deal.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG' ||
                                effectiveAdvanceAmount > 0
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {deal.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG'
                            ? 'Đã chi tạm ứng'
                            : deal.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG'
                            ? 'Đã duyệt tạm ứng'
                            : deal.larkAdvanceStatus === 'TỪ_CHỐI_TẠM_ỨNG'
                            ? 'Từ chối tạm ứng'
                            : !isTwoTimesSow
                            ? 'Thanh toán 1 lần (Khóa tạm ứng)'
                            : deal.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG'
                            ? 'Chờ duyệt QNvp'
                            : effectiveAdvanceAmount > 0
                            ? 'Đủ điều kiện ứng (2 đợt)'
                            : 'Chờ nhập số tạm ứng'}
                        </Status>
                      }
                    >
                      <div className="space-y-3 text-xs">
                        <div className="p-3 rounded-lg bg-sunken border border-line space-y-2 text-2xs text-ink-2">
                          <div className="flex items-center justify-between gap-2">
                            <span>Phương thức TT trên SOW:</span>
                            <strong
                              className={
                                isTwoTimesSow ? 'text-positive' : 'text-ink-2'
                              }
                            >
                              {isTwoTimesSow
                                ? 'Thanh toán 2 đợt (Cho phép tạm ứng)'
                                : 'Thanh toán 1 lần (100% sau nghiệm thu)'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Điều kiện Phụ lục SOW (Bước 2.4):</span>
                            <strong
                              className={
                                deal.contractAppendixStatus === 'ĐÃ_KÝ'
                                  ? 'text-positive'
                                  : 'text-warning'
                              }
                            >
                              {deal.contractAppendixStatus === 'ĐÃ_KÝ'
                                ? 'Đã ký 2 bên (Đủ điều kiện)'
                                : 'Chờ ký Phụ lục SOW'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Mã phiếu tạm ứng (6.1):</span>
                            <span className="font-code font-semibold text-ink">
                              {deal.larkAdvanceSlipCode ||
                                deal.larkAdvanceInstanceCode ||
                                'Chưa tạo phiếu'}
                            </span>
                          </div>
                        </div>

                        {!isTwoTimesSow && (
                          <div className="p-3 rounded-lg bg-warning-soft border border-line text-2xs text-ink-2">
                            Phụ lục SOW của Deal đang chọn <strong className="font-semibold text-ink">Thanh toán 1 lần (100% sau nghiệm thu)</strong>. Chỉ khi Phụ lục SOW cấu hình <strong className="font-semibold text-ink">Thanh toán 2 đợt (Có tạm ứng)</strong> mới được phép đẩy luồng Tạm ứng trên Lark.
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                          <Field label="Số tiền tạm ứng trước (Net VND)">
                            <Input
                              type="number"
                              className="font-code"
                              disabled={!isTwoTimesSow}
                              value={effectiveAdvanceAmount}
                              onChange={(e) => {
                                if (!isTwoTimesSow) return;
                                const nextAdv = Math.max(0, Number(e.target.value) || 0);
                                onUpdateDealFields?.(deal.id, {
                                  paymentScheduleOption: 'TWO_TIMES',
                                  soTienTamUngTruoc: nextAdv,
                                });
                              }}
                              placeholder={
                                isTwoTimesSow
                                  ? 'Nhập số tiền tạm ứng Net...'
                                  : 'Khóa do SOW thanh toán 1 lần'
                              }
                            />
                          </Field>
                          {isTwoTimesSow &&
                            (deal.loaiTaiKhoanThanhToan.includes('Công ty') ||
                              deal.loaiTaiKhoanThanhToan.includes('Hộ kinh doanh')) && (
                              <Field label="Số / Link Hóa đơn nháp đợt 1 (HKD / Công ty)">
                                <Input
                                  className="font-code"
                                  value={deal.draftInvoiceCode || ''}
                                  onChange={(e) =>
                                    onUpdateDealFields?.(deal.id, {
                                      draftInvoiceCode: e.target.value,
                                    })
                                  }
                                  placeholder="HD-NHAP-001..."
                                />
                              </Field>
                            )}
                        </div>

                        <Button
                          variant="secondary"
                          icon={Send}
                          disabled={!isTwoTimesSow}
                          onClick={() => {
                            if (!isTwoTimesSow) {
                              onNotify?.(
                                'Chỉ khi Phụ lục SOW có Thanh toán 2 đợt mới được phép đẩy luồng Tạm ứng.',
                                'warning'
                              );
                              return;
                            }
                            onOpenLarkPaymentModal?.(
                              {
                                ...deal,
                                paymentScheduleOption: 'TWO_TIMES',
                                soTienTamUngTruoc: effectiveAdvanceAmount,
                              },
                              'ADVANCE'
                            );
                          }}
                        >
                          {isTwoTimesSow
                            ? 'Lập phiếu Tạm ứng trên Lark (QNvp)'
                            : 'Không hỗ trợ Tạm ứng (SOW TT 1 lần)'}
                        </Button>
                      </div>
                    </Panel>
                  );
                })()}

                {/* LUỒNG 2: Nghiệm thu tháng, Khóa sổ WORKDAY 3 & Mở khóa 2 đợt (GĐ7 B-54..B-65, S40) */}
                <Panel
                  title="2. Khóa sổ Nghiệm thu Tháng & Mở khóa (GĐ7)"
                  actions={
                    <Status tone={deal.chotData ? 'positive' : 'warning'}>
                      {deal.chotData ? 'Đã chốt data' : 'Chưa chốt data'}
                    </Status>
                  }
                >
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Kỳ nghiệm thu chốt (Cố định)">
                        <Input
                          className="font-code"
                          value={deal.thangNghiemThuChot || deal.thangPlan || '2026/10'}
                          onChange={(e) => {
                            const nextMonth = e.target.value;
                            onUpdateDealFields?.(deal.id, {
                              thangNghiemThuChot: nextMonth,
                              ngayKhoaData: computeDataLockDate(
                                deal.actualAirDate || deal.plannedAirDate,
                                nextMonth
                              ),
                            });
                          }}
                        />
                      </Field>
                      <Field label="Ngày khóa sổ (WORKDAY 3)">
                        <Input
                          className="font-code"
                          value={
                            deal.ngayKhoaData ||
                            computeDataLockDate(
                              deal.actualAirDate || deal.plannedAirDate,
                              deal.thangNghiemThuChot || deal.thangPlan
                            )
                          }
                          readOnly
                        />
                      </Field>
                    </div>

                    <div className="p-3 rounded-lg bg-sunken border border-line flex items-center justify-between gap-2">
                      <span className="text-2xs text-ink-2">
                        Cờ <strong>Chốt data</strong> trên Base 3.2 (trước 00:00 ngày khóa):
                      </span>
                      <Button
                        size="sm"
                        disabled={
                          isReadOnlyPartnerRole ||
                          (Boolean(deal.chotData) && !canApproveDataUnlock)
                        }
                        variant={deal.chotData ? 'secondary' : 'primary'}
                        onClick={() => {
                          if (deal.chotData && !canApproveDataUnlock) {
                            onNotify?.(
                              'Chỉ Kế toán / Giám đốc MKT / Leader mới có quyền bỏ Chốt data sau khi đã khóa sổ. Vui lòng gửi đề nghị mở khóa trên S40.',
                              'warning'
                            );
                            return;
                          }
                          const nextChot = !deal.chotData;
                          const nowIso = new Date().toISOString();
                          const actorName = currentUser?.name || deal.nguoiPhuTrach || 'Nhân sự';
                          const logEntry: S40AuditLogEntry = {
                            id: `s40-${Date.now()}`,
                            action: nextChot ? 'LOCK_DATA' : 'APPROVE_UNLOCK',
                            batch: nextChot ? 'NONE' : 'UNLOCKED',
                            reason: nextChot
                              ? 'Tích Chốt data khóa sổ nghiệm thu tháng'
                              : 'Bỏ Chốt data mở khóa chỉnh sửa',
                            actorName,
                            actorRole: effectiveRole,
                            createdAt: nowIso,
                          };
                          onUpdateDealFields?.(deal.id, {
                            chotData: nextChot,
                            ...(nextChot
                              ? {
                                  ngayKhoaData:
                                    deal.ngayKhoaData || getVietnamDateYmd(),
                                  unlockRequestBatch: 'NONE',
                                }
                              : {}),
                            s40ReviewedBy: actorName,
                            s40ReviewedAt: nowIso,
                            s40History: [logEntry, ...(deal.s40History || [])].slice(0, 20),
                          });
                          onNotify?.(
                            nextChot
                              ? `Đã tích "Chốt data" cho Deal ${deal.maBooking} vào kỳ ${deal.thangNghiemThuChot || deal.thangPlan}.`
                              : `Đã bỏ tích "Chốt data" cho Deal ${deal.maBooking}.`,
                            'info'
                          );
                        }}
                      >
                        {deal.chotData ? 'Bỏ Chốt data' : 'Tích Chốt data'}
                      </Button>
                    </div>

                    <Field label="Đề nghị Kế toán mở khóa sửa sau nghiệm thu (Sheet S40)">
                      <Select
                        disabled={isReadOnlyPartnerRole || Boolean(deal.daDiTien)}
                        value={deal.unlockRequestBatch || 'NONE'}
                        onChange={(e) => {
                          if (deal.daDiTien) {
                            onNotify?.(
                              'Deal đã giải ngân thanh toán (Đã đi tiền UNC), không thể mở khóa chỉnh sửa nghiệm thu.',
                              'warning'
                            );
                            return;
                          }
                          const nextBatch = e.target.value as NonNullable<
                            ApprovedBookingListItem['unlockRequestBatch']
                          >;
                          if (nextBatch === 'UNLOCKED' && !canApproveDataUnlock) {
                            onNotify?.(
                              'Chỉ Kế toán / Giám đốc MKT / Leader mới có thẩm quyền duyệt mở khóa sửa nghiệm thu (UNLOCKED).',
                              'warning'
                            );
                            return;
                          }
                          const nowIso = new Date().toISOString();
                          const actorName = currentUser?.name || deal.nguoiPhuTrach || 'Nhân sự';
                          const defaultReason =
                            deal.unlockRequestReason || S40_STANDARD_UNLOCK_REASONS[0];
                          const logEntry: S40AuditLogEntry = {
                            id: `s40-${Date.now()}`,
                            action:
                              nextBatch === 'UNLOCKED'
                                ? 'APPROVE_UNLOCK'
                                : nextBatch === 'NONE'
                                  ? 'LOCK_DATA'
                                  : 'REQUEST_UNLOCK',
                            batch: nextBatch,
                            reason: nextBatch === 'NONE' ? undefined : defaultReason,
                            actorName,
                            actorRole: effectiveRole,
                            createdAt: nowIso,
                          };
                          onUpdateDealFields?.(deal.id, {
                            unlockRequestBatch: nextBatch,
                            ...(nextBatch === 'DOT_1_LV4_LV5' || nextBatch === 'DOT_2_LV10_LV11'
                              ? {
                                  unlockRequestReason: defaultReason,
                                  s40RequestedBy: actorName,
                                  s40RequestedAt: nowIso,
                                }
                              : nextBatch === 'UNLOCKED'
                                ? {
                                    s40ReviewedBy: actorName,
                                    s40ReviewedAt: nowIso,
                                  }
                                : {}),
                            s40History: [logEntry, ...(deal.s40History || [])].slice(0, 20),
                          });
                          if (nextBatch !== 'NONE') {
                            onNotify?.(
                              `Đã ghi nhận đề nghị mở khóa sửa (${nextBatch}) cho mã ${deal.maBooking}.`,
                              'info'
                            );
                          }
                        }}
                      >
                        <option value="NONE">Không yêu cầu mở khóa</option>
                        <option value="DOT_1_LV4_LV5">
                          Đợt 1: Gửi lỗi LV4 · Kế toán mở sửa 09h-17h LV5
                        </option>
                        <option value="DOT_2_LV10_LV11">
                          Đợt 2: Đối soát Brand LV10 · Kế toán mở sửa LV11
                        </option>
                        <option value="UNLOCKED" disabled={!canApproveDataUnlock}>
                          Kế toán đã mở khóa cho phép sửa
                        </option>
                      </Select>
                    </Field>

                    {deal.unlockRequestBatch && deal.unlockRequestBatch !== 'NONE' && (
                      <div className="space-y-2">
                        <Field label="Chọn nhanh nhóm lý do mở khóa chuẩn B2C (S40)">
                          <Select
                            disabled={isReadOnlyPartnerRole}
                            value={
                              S40_STANDARD_UNLOCK_REASONS.includes(
                                (deal.unlockRequestReason || '') as (typeof S40_STANDARD_UNLOCK_REASONS)[number]
                              )
                                ? deal.unlockRequestReason || ''
                                : '__CUSTOM__'
                            }
                            onChange={(e) => {
                              const picked = e.target.value;
                              if (picked === '__CUSTOM__') return;
                              onUpdateDealFields?.(deal.id, {
                                unlockRequestReason: picked,
                              });
                            }}
                          >
                            {S40_STANDARD_UNLOCK_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                            <option value="__CUSTOM__">Lý do chi tiết khác (nhập bên dưới)</option>
                          </Select>
                        </Field>
                        <Field label="Chi tiết lý do xin mở khóa sửa trên S40">
                          <Input
                            disabled={isReadOnlyPartnerRole}
                            value={deal.unlockRequestReason || ''}
                            onChange={(e) =>
                              onUpdateDealFields?.(deal.id, {
                                unlockRequestReason: e.target.value,
                              })
                            }
                            placeholder="VD: Bổ sung mã Spark Ads / Sửa tên TK IN HOA không dấu..."
                          />
                        </Field>
                      </div>
                    )}

                    {(deal.s40History || []).length > 0 && (
                      <div className="pt-2 border-t border-line space-y-1.5">
                        <div className="text-2xs font-semibold text-ink-3">
                          Nhật ký khóa sổ &amp; mở khóa S40 ({(deal.s40History || []).length})
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-line rounded-lg border border-line bg-surface">
                          {(deal.s40History || []).slice(0, 6).map((h) => (
                            <div key={h.id} className="px-2.5 py-1.5 text-2xs space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-ink">
                                  {h.action === 'LOCK_DATA'
                                    ? 'Khóa sổ data'
                                    : h.action === 'REQUEST_UNLOCK'
                                      ? `Xin mở S40 (${h.batch === 'DOT_1_LV4_LV5' ? 'Đợt 1' : 'Đợt 2'})`
                                      : h.action === 'APPROVE_UNLOCK'
                                        ? 'Duyệt mở khóa S40'
                                        : 'Từ chối mở khóa S40'}
                                </span>
                                <span className="font-code text-ink-3">
                                  {h.actorName} · {h.createdAt.slice(0, 16).replace('T', ' ')}
                                </span>
                              </div>
                              {h.reason && <div className="text-ink-2 truncate">{h.reason}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>

                {/* LUỒNG 3: Đối chiếu Quyết toán ĐNTT (KN8A/Le27) & Khép kín KT Handle (Bill UNC) */}
                <Panel title="3. Luồng Tất toán ĐNTT Lark (KN8A) &amp; KT Handle">
                  <div className="space-y-4 text-xs">
                    <dl className="space-y-2">
                      <div className="flex items-center justify-between text-ink-2">
                        <dt>Loại thanh toán Lark (§3.3.2)</dt>
                        <dd className="font-code font-semibold text-ink">
                          {deal.loaiThanhToanLark || 'Thanh toán Booking KOC'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between text-ink-2">
                        <dt>Tổng giá trị SOW Net</dt>
                        <dd className="font-code font-semibold text-ink tabular-nums">
                          {formatVnd(deal.chiPhiBookingNetCuoi)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between text-ink-2">
                        <dt>Tổng tiền đã ứng KOC (Tự trừ từ QNvp)</dt>
                        <dd className="font-code text-warning font-medium tabular-nums">
                          {(deal.soTienTamUngTruoc || 0) > 0
                            ? `-${formatVnd(deal.soTienTamUngTruoc || 0)}`
                            : '0 đ'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between text-ink-2">
                        <dt>Khấu trừ hạng mục hủy</dt>
                        <dd className="font-code text-critical font-medium tabular-nums">
                          {(deal.khauTruHangMucHuy || 0) > 0
                            ? `-${formatVnd(deal.khauTruHangMucHuy || 0)}`
                            : '0 đ'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-line font-semibold text-ink">
                        <dt>Cần tất toán Đợt 2</dt>
                        <dd className="font-code text-sm text-accent tabular-nums">
                          {formatVnd(deal.soTienCanThanhToan || 0)}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-2 border-t border-line flex flex-col gap-2">
                      <Button
                        variant="primary"
                        icon={Send}
                        onClick={() => {
                          if (
                            deal.unlockRequestBatch === 'DOT_1_LV4_LV5' ||
                            deal.unlockRequestBatch === 'DOT_2_LV10_LV11'
                          ) {
                            onNotify?.(
                              'Deal đang gửi yêu cầu mở khóa sửa S40. Vui lòng chờ Kế toán mở sửa hoặc hủy yêu cầu mở khóa và chốt sổ trước khi lập phiếu ĐNTT quyết toán.',
                              'warning'
                            );
                            return;
                          }
                          if (!deal.chotData || deal.unlockRequestBatch === 'UNLOCKED') {
                            onUpdateDealFields?.(deal.id, {
                              chotData: true,
                              unlockRequestBatch: 'NONE',
                            });
                          }
                          onOpenLarkPaymentModal?.(
                            {
                              ...deal,
                              chotData: true,
                              unlockRequestBatch: 'NONE',
                            },
                            'SETTLEMENT'
                          );
                        }}
                      >
                        Lập phiếu ĐNTT Tất toán trên Lark (KN8A)
                      </Button>
                      {onOpenDraftBbntPreview && (
                        <Button
                          variant="secondary"
                          icon={FileText}
                          onClick={() =>
                            onOpenDraftBbntPreview(buildBookingDealFromApprovedItem(deal))
                          }
                        >
                          Xem trước Biên bản nghiệm thu
                        </Button>
                      )}
                    </div>

                    {/* Trạng thái đi tiền & Bill UNC đồng bộ từ Lark */}
                    <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                      <span className="text-ink-2">
                        Trạng thái giải ngân &amp; UNC (Từ Lark):
                      </span>
                      <Status tone={deal.daDiTien ? 'positive' : 'neutral'}>
                        {deal.daDiTien
                          ? `Đã đi tiền (${deal.uncBillCode || 'Đã có UNC'})`
                          : 'Duyệt & giải ngân trên Lark'}
                      </Status>
                    </div>
                  </div>
                </Panel>

                <Panel
                  title="Tài khoản thụ hưởng (Hồ sơ pháp lý KOC)"
                  actions={
                    canViewFullPii ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSensitive((v) => !v)}
                      >
                        {showSensitive ? 'Che STK' : 'Hiện đầy đủ'}
                      </Button>
                    ) : undefined
                  }
                >
                  <dl className="space-y-3 text-xs">
                    <div>
                      <dt className="text-2xs text-ink-3">Chủ tài khoản thụ hưởng (Theo Hồ sơ pháp lý)</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {deal.tenTaiKhoanNganHang || 'Chưa cập nhật'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Ngân hàng &amp; Số tài khoản</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.soTaiKhoan, canViewFullPii && showSensitive)} · {deal.nganHang || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Mã phiếu Lark Approval (Tạm ứng / ĐNTT)</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {deal.larkSlipCode ||
                          deal.larkApprovalInstanceCode ||
                          deal.larkAdvanceSlipCode ||
                          'Chưa khởi tạo phiếu'}{' '}
                        · <span className="font-sans text-ink-2">{deal.trangThaiPhieuThanhToan}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Nội dung chuyển khoản Kế toán (§3.3.2)</dt>
                      <dd className="mt-1 flex items-center justify-between gap-2 p-2 rounded-md bg-sunken border border-line font-code text-xs text-ink">
                        <span className="truncate">{deal.noiDungChuyenKhoan || '—'}</span>
                        {deal.noiDungChuyenKhoan && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                deal.noiDungChuyenKhoan,
                                'noiDungCk',
                                'nội dung chuyển khoản'
                              )
                            }
                            className="p-1 rounded text-ink-3 hover:text-ink shrink-0"
                          >
                            {copiedField === 'noiDungCk' ? (
                              <Check className="w-3.5 h-3.5 text-positive" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </dd>
                    </div>
                  </dl>
                </Panel>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
