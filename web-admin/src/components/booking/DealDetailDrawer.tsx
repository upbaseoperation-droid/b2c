'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import type { BookingDealItem, DealRightsTermItem, DealSowJobItem, KocItem, MediaChannelPlatform } from '../../lib/types';
import type { ContractRecord } from '../../lib/contracts/types';
import { formatDate, formatNumber, formatVnd, formatVndShort, getVietnamDateYmd } from '../../lib/format';
import {
  buildBookingDealFromApprovedItem,
  buildDefaultAddonServicesForDeal,
  computeDealSowJobSubtotal,
  ensureDealJobsForApprovedItem,
  type ApprovedBookingListItem,
} from '../../lib/approvedBookingList';
import { normalizeTikTokId } from '../../lib/staffBrandListingSheet';
import { documentOfTemplate } from '../../lib/planDealLink';
import { computeSigningProgress, contractStatus, resolveActiveLegalProfile } from '../contracts/contractUi';
import { Avatar, Button, Panel, Person, Presence, Progress, Stat, StatRow, Status, StepMark, Tabs } from '../ui';

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
  onOpenLarkPaymentModal?: (item: ApprovedBookingListItem) => void;
  onOpenDealBuilderModal?: (item: ApprovedBookingListItem) => void;
  onOpenTikTokInspector?: (item: ApprovedBookingListItem) => void;
  onOpenKocProfile?: (item: ApprovedBookingListItem) => void;
  onUpdateDealFields?: (dealId: string, patch: Partial<ApprovedBookingListItem>) => void;
  onPullContractLinks?: () => void;
  isPullingContractLinks?: boolean;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type DrawerTab = 'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE';

function maskSensitive(raw?: string, showFull?: boolean): string {
  const clean = (raw || '').trim();
  if (!clean) return 'Chưa cập nhật';
  if (showFull || clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
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
  onOpenDealBuilderModal,
  onOpenTikTokInspector,
  onOpenKocProfile,
  onUpdateDealFields,
  onPullContractLinks,
  isPullingContractLinks,
  onNotify,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab || 'OVERVIEW');

  // Inline state for deliverable / asset acceptance
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editingEvidenceText, setEditingEvidenceText] = useState<string>('');
  const [addingAddonJobIdx, setAddingAddonJobIdx] = useState<number | null>(null);
  const [newAddonType, setNewAddonType] = useState<DealRightsTermItem['termType']>('ADS_CODE');
  const [newAddonLabel, setNewAddonLabel] = useState<string>('');
  const [newAddonDays, setNewAddonDays] = useState<number>(30);
  const [newAddonCost, setNewAddonCost] = useState<number>(0);
  const [newAddonEvidence, setNewAddonEvidence] = useState<string>('');

  // Inline state for quick air update
  const [editingAirJobIdx, setEditingAirJobIdx] = useState<number | null>(null);
  const [quickAirLink, setQuickAirLink] = useState<string>('');
  const [quickAirDate, setQuickAirDate] = useState<string>('');

  // Inline state for editing a Job in Deal
  const [editingJobIdx, setEditingJobIdx] = useState<number | null>(null);
  const [editJobProduct, setEditJobProduct] = useState<string>('');
  const [editJobChannel, setEditJobChannel] = useState<MediaChannelPlatform>('TikTok');
  const [editJobPlannedDate, setEditJobPlannedDate] = useState<string>('');
  const [editJobVideoNet, setEditJobVideoNet] = useState<number>(0);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

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

  // Tìm các hồ sơ hợp đồng thực tế từ /api/contracts của Deal / KOC này
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

  const handleToggleAddonStatus = (
    jobIdx: number,
    addonId: string,
    nextStatus: 'VERIFIED' | 'DROPPED' | 'PENDING_ACCEPTANCE'
  ) => {
    if (!deal) return;
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
    if (!deal) return;
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

    const isAdsTerm = targetJob.addonServices?.find((a) => a.id === addonId)?.termType === 'ADS_CODE';
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
    onNotify?.('Đã lưu mã/bằng chứng bàn giao asset', 'success');
  };

  const handleAddNewAddonToJob = (jobIdx: number) => {
    if (!deal) return;
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const targetJob = currentJobs[jobIdx];
    if (!targetJob) return;

    const hasJobAir = Boolean(targetJob.linkAir || deal.linkAir);
    const addonId = `${targetJob.jobCode || deal.maBooking || 'DEAL'}-ADDON-${Date.now()}`;
    const trimmedEvidence = newAddonEvidence.trim();
    const isVerified = Boolean(trimmedEvidence) && hasJobAir;

    const defaultLabels: Record<DealRightsTermItem['termType'], string> = {
      ADS_CODE: 'Mã ủy quyền Spark Ads',
      IMAGE_USAGE: 'Quyền SDHA & Video gốc (File Raw)',
      CROSS_POST_REUP: 'Đăng chéo (Reup Facebook Reels / Shopee)',
      LINK_BIO_CART: 'Duy trì link Bio / Giỏ hàng Affiliate',
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
    onNotify?.(`Đã thêm hạng mục asset: ${newAddon.termLabel}`, 'success');
  };

  const handleRemoveAddonFromJob = (jobIdx: number, addonId: string) => {
    if (!deal) return;
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
    onNotify?.('Đã xóa hạng mục asset khỏi Job', 'info');
  };

  const handleSaveJobAirVideo = (jobIdx: number) => {
    if (!deal) return;
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const trimmedLink = quickAirLink.trim();
    const trimmedDate = quickAirDate.trim() || getVietnamDateYmd();

    const updatedJobs = currentJobs.map((j, idx) => {
      if (idx !== jobIdx) return j;
      return {
        ...j,
        linkAir: trimmedLink || j.linkAir,
        actualAirDate: trimmedDate || j.actualAirDate,
        acceptanceStatus: (trimmedLink ? 'DA_NGHIEM_THU' : j.acceptanceStatus) as 'DA_NGHIEM_THU' | 'CHUA_NGHIEM_THU',
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
    onNotify?.('Đã cập nhật nghiệm thu Video lên sóng', 'success');
  };

  const handleAddJobToCurrentDeal = () => {
    if (!deal) return;
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const nextIdx = currentJobs.length + 1;
    const baseBo = deal.maBooking || 'BO2610-001';
    const nextJobCode = `${baseBo}-J${String(nextIdx).padStart(2, '0')}`;
    const defaultVideoNet = 2000000;
    const defaultAddons = buildDefaultAddonServicesForDeal({
      maBooking: nextJobCode,
      totalNet: defaultVideoNet,
      includeDefaultAddons: true,
    });
    const newJob: DealSowJobItem = {
      id: `${nextJobCode}-${Date.now()}`,
      jobCode: nextJobCode,
      jobTitle: `Bảng công việc #${nextIdx} (${nextJobCode}) — ${deal.sanPham || deal.brandName}`,
      productName: `${deal.sanPham || deal.brandName} (Job #${nextIdx})`,
      mediaChannel: 'TikTok',
      affiliateChannel: deal.storeName?.toLowerCase().includes('shopee') ? 'Shopee' : 'TikTok Shop',
      plannedAirDate: deal.plannedAirDate || getVietnamDateYmd(),
      videoAssetNetCost: defaultVideoNet,
      quantity: 1,
      addonServices: defaultAddons,
      acceptanceStatus: 'CHUA_NGHIEM_THU',
    };
    const updatedJobs = [...currentJobs, newJob];
    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    onUpdateDealFields?.(deal.id, {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    });
    onNotify?.(`Đã thêm Bảng công việc #${nextIdx} (${nextJobCode}) vào Deal`, 'success');
  };

  const handleDeleteJobFromCurrentDeal = (jobIdx: number) => {
    if (!deal) return;
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    if (currentJobs.length <= 1) {
      onNotify?.('Mỗi Deal phải có tối thiểu 1 Bảng công việc (Job)!', 'warning');
      return;
    }
    const updatedJobs = currentJobs
      .filter((_, idx) => idx !== jobIdx)
      .map((j, idx) => {
        const seqStr = String(idx + 1).padStart(2, '0');
        const baseBo = deal.maBooking || 'BO2610';
        return {
          ...j,
          jobCode: `${baseBo}-J${seqStr}`,
          jobTitle: j.jobTitle.replace(/Bảng công việc #\d+/, `Bảng công việc #${idx + 1}`),
        };
      });
    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    onUpdateDealFields?.(deal.id, {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    });
    if (editingJobIdx === jobIdx) setEditingJobIdx(null);
    onNotify?.(`Đã xóa Bảng công việc #${jobIdx + 1} khỏi Deal`, 'info');
  };

  const handleSaveJobDetails = (jobIdx: number) => {
    if (!deal) return;
    const currentJobs = ensureDealJobsForApprovedItem(deal);
    const updatedJobs = currentJobs.map((j, idx) => {
      if (idx !== jobIdx) return j;
      const cleanProd = editJobProduct.trim() || j.productName;
      return {
        ...j,
        productName: cleanProd,
        jobTitle: `Bảng công việc #${idx + 1} (${j.jobCode}) — ${cleanProd}`,
        mediaChannel: editJobChannel,
        plannedAirDate: editJobPlannedDate || j.plannedAirDate,
        videoAssetNetCost: Math.max(0, Number(editJobVideoNet) || 0),
      };
    });
    const allAddons = updatedJobs.flatMap((j) => j.addonServices || []);
    onUpdateDealFields?.(deal.id, {
      dealJobs: updatedJobs,
      addonServices: allAddons,
    });
    setEditingJobIdx(null);
    onNotify?.(`Đã lưu thông tin Bảng công việc #${jobIdx + 1}`, 'success');
  };

  if (!deal) return <Presence show={false} exit="drawer" />;

  const isAccepted = deal.acceptanceStatus === 'DA_NGHIEM_THU';
  const hasBo = deal.bookingOrderCreated && Boolean(deal.maBooking);
  const sowSigningCompleted =
    linkedContracts.sow?.signing.at(-1)?.status === 'COMPLETED' ||
    deal.contractAppendixStatus === 'ĐÃ_KÝ';

  const stageStatus =
    deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
      ? { label: 'Đã thanh toán', tone: 'positive' as const }
      : isAccepted
      ? { label: 'Đã nghiệm thu', tone: 'positive' as const }
      : sowSigningCompleted
      ? { label: 'Đang thực thi', tone: 'info' as const }
      : hasBo
      ? { label: 'Chờ ký SOW', tone: 'warning' as const }
      : { label: 'Chờ tạo deal', tone: 'warning' as const };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <Presence show={isOpen} exit="drawer">
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
        <div
          className="absolute inset-0"
          onClick={onClose}
          aria-hidden="true"
        />

        <div
          data-motion-panel
          role="dialog"
          aria-modal="true"
          aria-label={`Hồ sơ Deal ${deal.maBooking || deal.id}`}
          className="relative bg-surface w-full max-w-3xl h-full border-l border-line shadow-lg flex flex-col overflow-hidden"
        >
          {/* Đầu trang Hồ sơ — chuẩn DESIGN_SYSTEM.md §7 Rule 12: Định danh bên trái (tối đa 1 Status), Nút hành động chính + Điều hướng bên phải */}
          <header className="px-5 py-3.5 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={deal.tenKenh || deal.idKenh} size={36} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-ink truncate">
                    {deal.tenKenh || deal.idKenh}
                  </h2>
                  <Status tone={stageStatus.tone}>{stageStatus.label}</Status>
                </div>
                <div className="flex items-center gap-2 text-2xs text-ink-3 mt-0.5 flex-wrap">
                  <span className="font-code text-ink-2">
                    @{deal.idKenh.replace(/^@/, '')}
                  </span>
                  <span>·</span>
                  <span className="font-code font-medium text-ink">
                    {deal.maBooking || 'Chưa cấp mã BO'}
                  </span>
                  {deal.maBooking && (
                    <button
                      type="button"
                      onClick={() => handleCopy(deal.maBooking, 'maBooking', 'mã Deal')}
                      title="Sao chép mã Deal"
                      className="inline-flex items-center justify-center w-5 h-5 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                    >
                      {copiedField === 'maBooking' ? (
                        <Check className="w-3.5 h-3.5 text-positive" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  <span>·</span>
                  <span className="truncate">{deal.storeName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!hasBo ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={FileCheck}
                  onClick={() => onOpenDealBuilderModal?.(deal)}
                >
                  Tạo Deal &amp; SOW
                </Button>
              ) : !sowSigningCompleted && onOpenContractForDeal && mappedBookingDeal ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={FileText}
                  onClick={() => onOpenContractForDeal(mappedBookingDeal, 'SOW')}
                >
                  Ký Phụ lục SOW
                </Button>
              ) : !isAccepted ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Video}
                  onClick={() => onOpenAcceptanceModal?.(deal)}
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
                  Lập phiếu ĐNTT
                </Button>
              )}

              {allDeals.length > 1 && (
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
              )}

              <button
                type="button"
                onClick={onClose}
                title="Đóng (Esc)"
                aria-label="Đóng"
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Thanh hành trình 4 chặng chuẩn StepMark — nhấp vào từng chặng để mở đúng phân hệ */}
          <div className="px-5 py-2.5 bg-sunken/50 border-b border-line shrink-0">
            <div className="grid grid-cols-4 gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('OVERVIEW');
                  if (!hasBo) onOpenDealBuilderModal?.(deal);
                }}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark done={hasBo} label="1" size={20} />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Tạo Deal &amp; BO</div>
                  <div className="text-2xs text-ink-3 font-code truncate">
                    {hasBo ? deal.maBooking : 'Chờ cấp mã'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CONTRACT')}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark done={sowSigningCompleted} label="2" size={20} />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Ký Phụ lục SOW</div>
                  <div className="text-2xs text-ink-3 truncate">
                    {sowSigningCompleted
                      ? deal.contractAppendixCode || 'Đã ký kết'
                      : 'Chờ ký SOW'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ACCEPTANCE')}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark done={isAccepted} label="3" size={20} />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Nghiệm thu Video</div>
                  <div className="text-2xs text-ink-3 truncate">
                    {isAccepted
                      ? deal.actualAirDate
                        ? `Air ${formatDate(deal.actualAirDate)}`
                        : 'Đã lên sóng'
                      : 'Chờ link video'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('ACCEPTANCE');
                  if (isAccepted) onOpenLarkPaymentModal?.(deal);
                }}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark
                  done={deal.trangThaiPhieuThanhToan === 'Đã thanh toán'}
                  label="4"
                  size={20}
                />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Quyết toán Lark</div>
                  <div className="text-2xs text-ink-3 truncate">
                    {deal.trangThaiPhieuThanhToan}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Dãy 3 Tab chuẩn DESIGN_SYSTEM.md §7 Rule 14 (không đánh số, tên ngắn gọn, thao tác phụ bên phải) */}
          <div className="px-5 pt-2 bg-surface border-b border-line shrink-0">
            <Tabs<DrawerTab>
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'OVERVIEW', label: 'Tổng quan' },
                {
                  key: 'CONTRACT',
                  label: 'Pháp lý & SOW',
                  count: 1 + (deal.addonServices?.length || 0),
                },
                { key: 'ACCEPTANCE', label: 'Nghiệm thu & Thanh toán' },
              ]}
              actions={
                <div className="flex items-center gap-1.5">
                  {onOpenKocProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={UserCheck}
                      onClick={() => onOpenKocProfile(deal)}
                    >
                      Hồ sơ KOC
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenDealBuilderModal?.(deal)}
                  >
                    {sowSigningCompleted ? 'Lập Phụ lục bổ sung' : 'Sửa cấu hình Deal'}
                  </Button>
                </div>
              }
            />
          </div>

          {/* Nội dung cuộn */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-canvas">
            {/* 4 ô chỉ số đầu hồ sơ — chuẩn StatRow size="sm" */}
            <StatRow size="sm">
              <Stat
                label="Chi phí Net chốt"
                value={formatVnd(deal.chiPhiBookingNetCuoi)}
                numeric={deal.chiPhiBookingNetCuoi}
                note={`Gross ${formatVndShort(deal.chiPhiGrossKemThue)} · Bậc ${deal.klGrade || 'KL3'}`}
              />
              <Stat
                label="Cần thanh toán"
                value={formatVnd(deal.soTienCanThanhToan)}
                numeric={deal.soTienCanThanhToan}
                note={
                  deal.soTienTamUngTruoc > 0
                    ? `Đã tạm ứng ${formatVndShort(deal.soTienTamUngTruoc)}`
                    : 'Chưa phát sinh tạm ứng'
                }
              />
              <Stat
                label="Doanh số GMV 30 ngày"
                value={formatVnd(deal.gmv30d || 0)}
                numeric={deal.gmv30d || 0}
                note={`${formatNumber(deal.orders30d || 0)} đơn · ${formatNumber(deal.views30d || 0)} lượt xem`}
              />
              <Stat
                label="Hiệu quả ROI 30 ngày"
                value={`${deal.roi30d.toFixed(2)}x`}
                tone={deal.roi30d >= 2 ? 'positive' : deal.roi30d > 0 ? 'warning' : undefined}
                note={deal.danhGiaHieuQuaVideo || 'Chờ lên sóng'}
              />
            </StatRow>

            {activeTab === 'OVERVIEW' && (
              <div className="space-y-4">
                <Panel title="Cấu trúc chi phí & Đối chiếu giải ngân">
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="text-ink-2">
                          Đã tạm ứng / Giải ngân:{' '}
                          <span className="font-code font-semibold text-ink">
                            {formatVnd(
                              deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                                ? deal.chiPhiBookingNetCuoi
                                : deal.soTienTamUngTruoc
                            )}
                          </span>{' '}
                          / {formatVnd(deal.chiPhiBookingNetCuoi)}
                        </span>
                        <span className="font-code text-ink-3 tabular-nums">
                          {deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                            ? 100
                            : deal.chiPhiBookingNetCuoi > 0
                            ? Math.round(
                                (deal.soTienTamUngTruoc / deal.chiPhiBookingNetCuoi) * 100
                              )
                            : 0}
                          % hoàn tất
                        </span>
                      </div>
                      <Progress
                        value={
                          deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                            ? deal.chiPhiBookingNetCuoi
                            : deal.soTienTamUngTruoc
                        }
                        max={Math.max(1, deal.chiPhiBookingNetCuoi)}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line text-xs">
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Chi phí Gross</div>
                        <div className="font-code font-semibold text-ink mt-0.5 tabular-nums">
                          {formatVnd(deal.chiPhiGrossKemThue)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">
                          Bậc {deal.klGrade || 'KL3'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Net chốt Deal</div>
                        <div className="font-code font-semibold text-ink mt-0.5 tabular-nums">
                          {formatVnd(deal.chiPhiBookingNetCuoi)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">HĐNT &amp; SOW</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Đã tạm ứng trước</div>
                        <div className="font-code font-semibold text-warning mt-0.5 tabular-nums">
                          {formatVnd(deal.soTienTamUngTruoc)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">Theo điều khoản SOW</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Cần thanh toán</div>
                        <div className="font-code font-semibold text-positive mt-0.5 tabular-nums">
                          {formatVnd(deal.soTienCanThanhToan)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">Quyết toán sau BBNT</div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Panel
                    title="Thông tin KOC & Kênh phát sóng"
                  actions={
                    deal.linkKenh ? (
                      <a
                        href={deal.linkKenh}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                      >
                        <span>Mở kênh TikTok</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : undefined
                  }
                >
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
                      <dt className="text-2xs text-ink-3">Lượt theo dõi</dt>
                      <dd className="font-code text-ink tabular-nums mt-0.5">
                        {formatNumber(deal.follower || matchedKoc?.followers || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Điện thoại nhận mẫu</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.sdtNhanHang || matchedKoc?.phone, showSensitive)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Hình thức hợp tác</dt>
                      <dd className="text-ink mt-0.5">{deal.hinhThucHopTac || 'New'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-2xs text-ink-3">Địa chỉ gửi hàng mẫu</dt>
                      <dd className="text-ink mt-0.5">
                        {deal.diaChiNhanHang || matchedKoc?.shippingAddress || 'Chưa cập nhật địa chỉ nhận mẫu'}
                      </dd>
                    </div>
                  </dl>
                </Panel>

                <Panel title="Gian hàng, Sản phẩm & Lịch phát sóng">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-2xs text-ink-3">Gian hàng</dt>
                      <dd className="font-medium text-ink mt-0.5">{deal.storeName}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Thương hiệu &amp; Kỳ Plan</dt>
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
                      <dt className="text-2xs text-ink-3">Định hướng nội dung (Pillar)</dt>
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
                        {deal.plannedAirDate ? formatDate(deal.plannedAirDate) : 'Chưa chốt ngày air'}
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
                </div>
              </div>
            )}

            {activeTab === 'CONTRACT' && (
              <div className="space-y-4">
                <Panel
                  title="Chuỗi 3 chặng văn bản pháp lý (Kết nối Quản lý Hợp đồng)"
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSensitive((v) => !v)}
                      >
                        {showSensitive ? 'Che CCCD / MST' : 'Hiện đầy đủ CCCD / MST'}
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    {/* Hồ sơ pháp lý đang áp dụng của KOC */}
                    <div className="p-3 rounded-lg bg-sunken border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-2xs text-ink-3">Chủ thể ký kết &amp; Khấu trừ thuế</div>
                        <div className="font-medium text-ink">
                          {activeLegalProfile
                            ? `${activeLegalProfile.taxAccountType} · ${activeLegalProfile.holderName}`
                            : deal.loaiTaiKhoanThanhToan}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-2xs text-ink-3">Số CCCD / Mã số thuế</div>
                        <div className="font-code text-ink">
                          {maskSensitive(
                            activeLegalProfile?.taxCode ||
                              activeLegalProfile?.cccd ||
                              deal.soCccd ||
                              matchedKoc?.cccd,
                            showSensitive
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3 chặng: HĐNT -> SOW -> BBNT */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Chặng 1: HĐNT */}
                      <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xs font-medium text-ink-3">Hợp đồng nguyên tắc</span>
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
                              ? computeSigningProgress(linkedContracts.hdnt.signing.at(-1))?.summaryText ||
                                'Đã khởi tạo hồ sơ HĐNT (contract-system)'
                              : 'Áp dụng chung cho mọi Deal của KOC'}
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
                                  <ExternalLink className="w-3 h-3" />
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
                                  <ExternalLink className="w-3 h-3" />
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
                      <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xs font-medium text-ink-3">Phụ lục SOW theo Deal</span>
                            <Status tone={sowSigningCompleted ? 'positive' : 'warning'}>
                              {sowSigningCompleted ? 'Đã ký' : 'Chờ ký'}
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
                              ? computeSigningProgress(linkedContracts.sow.signing.at(-1))?.summaryText ||
                                `Giá trị Net: ${formatVnd(deal.chiPhiBookingNetCuoi)}`
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
                                  <ExternalLink className="w-3 h-3" />
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
                                  <ExternalLink className="w-3 h-3" />
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
                      <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xs font-medium text-ink-3">Biên bản nghiệm thu</span>
                            <Status tone={linkedContracts.bbnt || isAccepted ? 'positive' : 'neutral'}>
                              {linkedContracts.bbnt
                                ? contractStatus(linkedContracts.bbnt).label
                                : isAccepted
                                ? 'Đủ điều kiện lập'
                                : 'Chờ nghiệm thu'}
                            </Status>
                          </div>
                          <div className="font-code text-xs font-semibold text-ink truncate">
                            {linkedContracts.bbnt?.contractSystem?.contractCode ||
                              linkedContracts.bbnt?.title ||
                              (deal.maBooking ? `BBNT-${deal.maBooking}` : 'Chưa lập BBNT')}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {linkedContracts.bbnt
                              ? computeSigningProgress(linkedContracts.bbnt.signing.at(-1))?.summaryText ||
                                (isAccepted
                                  ? `Đã nghiệm thu ngày ${formatDate(deal.actualAirDate)}`
                                  : 'Đã khởi tạo BBNT (contract-system)')
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
                                  <ExternalLink className="w-3 h-3" />
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
                                  <ExternalLink className="w-3 h-3" />
                                  Bản đã ký
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
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
                  </div>
                </Panel>

                {/* Bảng trường thông tin & Đường link HĐNT, Phụ lục SOW (PL), BBNT */}
                <Panel
                  title="Trường thông tin & Đường link Hợp đồng (HĐNT) · Phụ lục (PL) · BBNT"
                  actions={
                    onPullContractLinks ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RefreshCw}
                        disabled={isPullingContractLinks}
                        onClick={onPullContractLinks}
                      >
                        Đồng bộ lại từ contract-system
                      </Button>
                    ) : undefined
                  }
                >
                  <div className="space-y-4 text-xs">
                    {/* 1. Trường thông tin HĐNT */}
                    <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">1. Hợp đồng nguyên tắc (HĐNT)</span>
                        <span className="text-2xs font-code text-ink-2">
                          {deal.masterContractStatus || (linkedContracts.hdnt ? contractStatus(linkedContracts.hdnt).label : 'CHƯA_LẬP')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-2xs text-ink-3 block mb-1">Số / Mã HĐNT</label>
                          <input
                            type="text"
                            value={
                              deal.masterContractCode ||
                              linkedContracts.hdnt?.contractSystem?.contractCode ||
                              linkedContracts.hdnt?.title ||
                              ''
                            }
                            onChange={(e) =>
                              onUpdateDealFields?.(deal.id, { masterContractCode: e.target.value })
                            }
                            placeholder="VD: 291026/HDNT/KOC"
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-2xs text-ink-3">Link Google Docs HĐNT</label>
                            {(deal.masterContractGoogleDocsUrl ||
                              linkedContracts.hdnt?.contractSystem?.googleDocsUrl) && (
                              <a
                                href={
                                  deal.masterContractGoogleDocsUrl ||
                                  linkedContracts.hdnt?.contractSystem?.googleDocsUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-2xs font-medium text-accent hover:underline"
                              >
                                Mở ↗
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-2xs text-ink-3">Link bản HĐNT đã ký</label>
                            {(deal.masterContractSignedUrl ||
                              linkedContracts.hdnt?.signing.at(-1)?.signedFileUrl ||
                              linkedContracts.hdnt?.contractSystem?.signedFileUrl) && (
                              <a
                                href={
                                  deal.masterContractSignedUrl ||
                                  linkedContracts.hdnt?.signing.at(-1)?.signedFileUrl ||
                                  linkedContracts.hdnt?.contractSystem?.signedFileUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-2xs font-medium text-positive hover:underline"
                              >
                                Tải ↗
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Trường thông tin Phụ lục SOW (PL) */}
                    <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">2. Phụ lục Hợp đồng theo Deal (PL / SOW)</span>
                        <span className="text-2xs font-code text-ink-2">
                          {deal.contractAppendixStatus || 'CHỜ_KÝ'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-2xs text-ink-3 block mb-1">Số / Mã Phụ lục SOW</label>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-2xs text-ink-3">Link Google Docs Phụ lục</label>
                            {(deal.contractAppendixGoogleDocsUrl ||
                              linkedContracts.sow?.contractSystem?.googleDocsUrl) && (
                              <a
                                href={
                                  deal.contractAppendixGoogleDocsUrl ||
                                  linkedContracts.sow?.contractSystem?.googleDocsUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-2xs font-medium text-accent hover:underline"
                              >
                                Mở ↗
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-2xs text-ink-3">Link bản Phụ lục đã ký</label>
                            {(deal.contractAppendixSignedUrl ||
                              linkedContracts.sow?.signing.at(-1)?.signedFileUrl ||
                              linkedContracts.sow?.contractSystem?.signedFileUrl) && (
                              <a
                                href={
                                  deal.contractAppendixSignedUrl ||
                                  linkedContracts.sow?.signing.at(-1)?.signedFileUrl ||
                                  linkedContracts.sow?.contractSystem?.signedFileUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-2xs font-medium text-positive hover:underline"
                              >
                                Tải ↗
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Trường thông tin Biên bản nghiệm thu (BBNT) */}
                    <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">3. Biên bản nghiệm thu (BBNT)</span>
                        <span className="text-2xs font-code text-ink-2">
                          {deal.bbntStatus || (linkedContracts.bbnt ? contractStatus(linkedContracts.bbnt).label : 'CHƯA_LẬP')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-2xs text-ink-3 block mb-1">Số / Mã BBNT</label>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-2xs text-ink-3">Link Google Docs BBNT</label>
                            {(deal.bbntGoogleDocsUrl ||
                              linkedContracts.bbnt?.contractSystem?.googleDocsUrl) && (
                              <a
                                href={
                                  deal.bbntGoogleDocsUrl ||
                                  linkedContracts.bbnt?.contractSystem?.googleDocsUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-2xs font-medium text-accent hover:underline"
                              >
                                Mở ↗
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-2xs text-ink-3">Link bản BBNT đã ký</label>
                            {(deal.bbntSignedUrl ||
                              linkedContracts.bbnt?.signing.at(-1)?.signedFileUrl ||
                              linkedContracts.bbnt?.contractSystem?.signedFileUrl) && (
                              <a
                                href={
                                  deal.bbntSignedUrl ||
                                  linkedContracts.bbnt?.signing.at(-1)?.signedFileUrl ||
                                  linkedContracts.bbnt?.contractSystem?.signedFileUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-2xs font-medium text-positive hover:underline"
                              >
                                Tải ↗
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
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
                            className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>

                {(() => {
                  const dealJobs = ensureDealJobsForApprovedItem(deal);
                  return (
                    <Panel
                      title={`Cấu trúc Bảng công việc theo từng Job trong Phụ lục SOW (${dealJobs.length} Job · ${dealJobs.length} Bảng công việc)`}
                      actions={
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Plus}
                            onClick={handleAddJobToCurrentDeal}
                          >
                            + Thêm Job vào Deal
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenDealBuilderModal?.(deal)}
                          >
                            {sowSigningCompleted
                              ? 'Lập Phụ lục bổ sung'
                              : 'Soạn chi tiết SOW'}
                          </Button>
                        </div>
                      }
                    >
                      <div className="space-y-3 text-xs">
                        {dealJobs.map((jobItem, jIdx) => {
                          const jobSub = computeDealSowJobSubtotal(jobItem);
                          const isEditing = editingJobIdx === jIdx;
                          return (
                            <div
                              key={jobItem.id || jIdx}
                              className="rounded-lg border border-line bg-sunken/30 p-3 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-code text-2xs font-semibold">
                                    Bảng công việc #{jIdx + 1} · {jobItem.jobCode}
                                  </span>
                                  <span className="font-semibold text-ink">
                                    {jobItem.productName || deal.sanPham || deal.brandName}
                                  </span>
                                  <span className="text-2xs text-ink-3">
                                    ({jobItem.mediaChannel || 'TikTok'} · Air dự kiến:{' '}
                                    {jobItem.plannedAirDate ? formatDate(jobItem.plannedAirDate) : '—'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-code font-semibold text-accent">
                                    Cộng Bảng CV #{jIdx + 1}: {formatVnd(jobSub.plannedJobNet)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingJobIdx(null);
                                      } else {
                                        setEditingJobIdx(jIdx);
                                        setEditJobProduct(jobItem.productName || deal.sanPham || deal.brandName);
                                        setEditJobChannel(jobItem.mediaChannel || 'TikTok');
                                        setEditJobPlannedDate(jobItem.plannedAirDate || deal.plannedAirDate || '');
                                        setEditJobVideoNet(jobItem.videoAssetNetCost || 0);
                                      }
                                    }}
                                    className="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface text-2xs font-medium inline-flex items-center gap-1"
                                    title="Chỉnh sửa thông tin Bảng công việc này"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{isEditing ? 'Đóng' : 'Sửa'}</span>
                                  </button>
                                  {dealJobs.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteJobFromCurrentDeal(jIdx)}
                                      className="p-1 rounded text-ink-3 hover:text-critical hover:bg-critical-soft"
                                      title="Xóa Bảng công việc này khỏi Deal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditing && (
                                <div className="p-3 rounded-lg border border-accent/40 bg-accent-soft/20 space-y-2.5 text-xs">
                                  <div className="font-semibold text-ink text-2xs">
                                    Chỉnh sửa thông tin Bảng công việc #{jIdx + 1} ({jobItem.jobCode})
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">Sản phẩm / Chiến dịch</label>
                                      <input
                                        type="text"
                                        value={editJobProduct}
                                        onChange={(e) => setEditJobProduct(e.target.value)}
                                        className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">Kênh phát sóng</label>
                                      <select
                                        value={editJobChannel}
                                        onChange={(e) => setEditJobChannel(e.target.value as MediaChannelPlatform)}
                                        className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                                      >
                                        <option value="TikTok">TikTok</option>
                                        <option value="Shopee Video">Shopee Video</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="YouTube">YouTube</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">Ngày lên sóng dự kiến</label>
                                      <input
                                        type="date"
                                        value={editJobPlannedDate}
                                        onChange={(e) => setEditJobPlannedDate(e.target.value)}
                                        className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">Chi phí Net Video (VND)</label>
                                      <input
                                        type="number"
                                        value={editJobVideoNet}
                                        onChange={(e) => setEditJobVideoNet(Number(e.target.value) || 0)}
                                        className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingJobIdx(null)}>
                                      Hủy
                                    </Button>
                                    <Button size="sm" variant="primary" onClick={() => handleSaveJobDetails(jIdx)}>
                                      Lưu thay đổi
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="divide-y divide-line">
                                <div className="py-2 flex items-center justify-between gap-3">
                                  <div>
                                    <div className="font-medium text-ink">
                                      1. Sản xuất &amp; đăng tải Video — {jobItem.productName || deal.sanPham || deal.brandName}
                                    </div>
                                    <div className="text-2xs text-ink-3">
                                      Kênh @{deal.idKenh.replace(/^@/, '')} ({jobItem.mediaChannel || 'TikTok'})
                                      {jobItem.linkAir ? ` · Đã có Link Air` : ''}
                                    </div>
                                  </div>
                                  <div className="text-right font-code tabular-nums shrink-0">
                                    <div className="font-semibold text-ink">
                                      {formatVnd(jobSub.videoNet)}
                                    </div>
                                    <div className="text-2xs text-ink-3">Hạng mục chính</div>
                                  </div>
                                </div>

                                {(jobItem.addonServices || []).map((addon, idx) => (
                                  <div
                                    key={addon.id || idx}
                                    className="py-2 flex items-center justify-between gap-3"
                                  >
                                    <div>
                                      <div className="font-medium text-ink">
                                        {idx + 2}. {addon.termLabel}
                                      </div>
                                      <div className="text-2xs text-ink-3">
                                        Thời hạn: {addon.durationDays ? `${addon.durationDays} ngày` : 'Theo thỏa thuận'} ·{' '}
                                        {addon.evidenceCodeOrUrl || 'Chờ bàn giao mã / file'}
                                      </div>
                                    </div>
                                    <div className="text-right font-code tabular-nums shrink-0">
                                      <div className="font-semibold text-ink">
                                        {(addon.allocatedCostVnd || 0) > 0
                                          ? formatVnd(addon.allocatedCostVnd || 0)
                                          : 'Đã gộp trong gói'}
                                      </div>
                                      <div className="text-2xs text-ink-3">
                                        {addon.acceptanceStatus === 'VERIFIED' ? 'Đã bàn giao' : 'Đi kèm Job'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        <div className="pt-2 border-t border-line flex items-center justify-between font-code text-xs">
                          <span className="text-ink-2">
                            Tổng hợp Phụ lục SOW ({dealJobs.length} Job = {dealJobs.length} Bảng công việc):
                          </span>
                          <span className="font-semibold text-ink">
                            {formatVnd(deal.chiPhiBookingNetCuoi)}
                          </span>
                        </div>
                      </div>
                    </Panel>
                  );
                })()}
              </div>
            )}

            {activeTab === 'ACCEPTANCE' && (() => {
              const jobs = ensureDealJobsForApprovedItem(deal);
              const totalAddons = jobs.flatMap((j) => j.addonServices || []);
              const activeAddons = totalAddons.filter((a) => a.acceptanceStatus !== 'DROPPED');
              const verifiedAddons = totalAddons.filter((a) => a.acceptanceStatus === 'VERIFIED');
              const droppedAddons = totalAddons.filter((a) => a.acceptanceStatus === 'DROPPED');
              const pendingAddons = totalAddons.filter((a) => a.acceptanceStatus === 'PENDING_ACCEPTANCE');

              const hasVideo = Boolean(deal.linkAir || deal.actualAirDate);
              const airedJobsCount = jobs.filter((j) =>
                Boolean(j.linkAir?.trim() || j.actualAirDate?.trim())
              ).length;
              const isAllJobsAired = airedJobsCount === jobs.length && jobs.length > 0;
              const isStage1Complete = isAllJobsAired;
              const isStage2Complete =
                isStage1Complete &&
                (activeAddons.length === 0 || activeAddons.every((a) => a.acceptanceStatus === 'VERIFIED'));
              const isDealFullyAccepted =
                deal.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' || isStage2Complete;

              return (
                <div className="space-y-4">
                  {/* 1. Tiến trình nghiệm thu 2 tầng theo Deal */}
                  <div className="p-3.5 rounded-lg border border-line bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-accent" />
                        <span>
                          Quy trình nghiệm thu Deal ({jobs.length} Bảng công việc / Jobs)
                        </span>
                      </div>
                      <Status
                        tone={
                          isDealFullyAccepted
                            ? 'positive'
                            : isStage1Complete
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {isDealFullyAccepted
                          ? 'Đã nghiệm thu toàn Deal'
                          : isStage1Complete
                          ? 'Chờ bàn giao Asset'
                          : `Chờ Video (${airedJobsCount}/${jobs.length} Job)`}
                      </Status>
                    </div>

                    {/* 3-Step Pipeline Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div
                        className={`p-2.5 rounded border transition-colors ${
                          isStage1Complete
                            ? 'border-positive/40 bg-positive-soft/20'
                            : 'border-line bg-sunken/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink text-2xs">
                            1. Video lên sóng ({airedJobsCount}/{jobs.length} Job)
                          </span>
                          <Status tone={isStage1Complete ? 'positive' : 'warning'}>
                            {isStage1Complete ? 'Hoàn tất' : `${airedJobsCount}/${jobs.length} Job`}
                          </Status>
                        </div>
                        <div className="text-2xs text-ink-3 mt-1 truncate">
                          {isStage1Complete
                            ? `Tất cả ${jobs.length} Job đã có link bài đăng`
                            : `Còn ${jobs.length - airedJobsCount} Job chưa lên sóng`}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded border transition-colors ${
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
                              ? 'Đang khóa'
                              : isStage2Complete
                              ? 'Đủ asset'
                              : `${verifiedAddons.length}/${activeAddons.length}`}
                          </Status>
                        </div>
                        <div className="text-2xs text-ink-3 mt-1 truncate">
                          {!isStage1Complete
                            ? 'Cần nghiệm thu video trước'
                            : isStage2Complete
                            ? `Đã nhận đủ ${verifiedAddons.length} hạng mục`
                            : `Còn ${pendingAddons.length} asset chờ bàn giao`}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded border transition-colors ${
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
                            {isDealFullyAccepted ? 'Sẵn sàng' : 'Chưa đủ'}
                          </Status>
                        </div>
                        <div className="text-2xs text-ink-3 mt-1 truncate">
                          {isDealFullyAccepted
                            ? `Cần chi: ${formatVndShort(deal.soTienCanThanhToan || 0)}`
                            : 'Cần hoàn tất Tầng 1 & 2'}
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line text-xs font-code">
                      <div>
                        <div className="text-2xs text-ink-3 font-sans">Tổng giá trị SOW Net</div>
                        <div className="font-semibold text-ink mt-0.5">
                          {formatVnd(deal.chiPhiBookingNetCuoi)}
                        </div>
                      </div>
                      <div>
                        <div className="text-2xs text-ink-3 font-sans">Tạm ứng trước</div>
                        <div className="font-semibold text-ink mt-0.5">
                          {formatVnd(deal.soTienTamUngTruoc || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-2xs text-ink-3 font-sans">Khấu trừ hủy</div>
                        <div
                          className={`font-semibold mt-0.5 ${
                            (deal.khauTruHangMucHuy || 0) > 0 ? 'text-critical' : 'text-ink-3'
                          }`}
                        >
                          {(deal.khauTruHangMucHuy || 0) > 0
                            ? `-${formatVnd(deal.khauTruHangMucHuy || 0)}`
                            : '0 đ'}
                        </div>
                      </div>
                      <div>
                        <div className="text-2xs text-ink-3 font-sans">Cần tất toán</div>
                        <div className="font-semibold text-accent mt-0.5">
                          {formatVnd(deal.soTienCanThanhToan || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Quản lý Nghiệm thu theo Bảng công việc (Job) & Deliverables */}
                  <Panel
                    title={`Nghiệm thu theo Bảng công việc (Job) & Deliverables (${jobs.length} Job)`}
                    actions={
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Plus}
                          onClick={handleAddJobToCurrentDeal}
                        >
                          + Thêm Job vào Deal
                        </Button>
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
                    <div className="space-y-3 text-xs">
                      {jobs.map((jobItem, jIdx) => {
                        const sub = computeDealSowJobSubtotal(jobItem);
                        const jobLink = jobItem.linkAir || (jIdx === 0 ? deal.linkAir : '');
                        const jobAirDate = jobItem.actualAirDate || (jIdx === 0 ? deal.actualAirDate : '');
                        const hasJobAir = Boolean(jobLink || jobAirDate);

                        return (
                          <div
                            key={jobItem.id || jIdx}
                            className="p-3 rounded-lg border border-line bg-surface space-y-3"
                          >
                            {/* Job Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-code font-semibold text-2xs">
                                  Bảng công việc #{jIdx + 1} · {jobItem.jobCode}
                                </span>
                                <span className="font-semibold text-ink">
                                  {jobItem.productName || jobItem.jobTitle}
                                </span>
                                <span className="text-2xs text-ink-3">
                                  ({jobItem.mediaChannel || 'TikTok'} · {jobItem.affiliateChannel || 'TikTok Shop'})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-code text-2xs font-semibold text-ink">
                                  Tổng Net Job: {formatVnd(sub.acceptedJobNet)}
                                </span>
                                <Status tone={hasJobAir ? 'positive' : 'warning'}>
                                  {hasJobAir ? 'Đã lên sóng' : 'Chờ lên sóng'}
                                </Status>
                                {jobs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJobFromCurrentDeal(jIdx)}
                                    className="p-1 rounded text-ink-3 hover:text-critical hover:bg-critical-soft"
                                    title="Xóa Bảng công việc này khỏi Deal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Tầng 1: Video chính lên sóng */}
                            <div className="p-2.5 rounded border border-line bg-sunken/40 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-medium text-ink text-xs">
                                  <Video className="w-3.5 h-3.5 text-accent" />
                                  <span>Tầng 1: Video chính lên sóng</span>
                                </div>
                                <div className="flex items-center gap-1 text-2xs">
                                  {jobAirDate && (
                                    <span className="font-code text-ink-2">
                                      Ngày air: {formatDate(jobAirDate)}{' '}
                                      {jobItem.plannedAirDate ? `(KH: ${formatDate(jobItem.plannedAirDate)})` : ''}
                                    </span>
                                  )}
                                  <Status tone={hasJobAir ? 'positive' : 'warning'}>
                                    {hasJobAir ? 'Đã nghiệm thu' : 'Chưa có link'}
                                  </Status>
                                </div>
                              </div>

                              {/* Video Link & Actions */}
                              {editingAirJobIdx === jIdx ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={quickAirLink}
                                    onChange={(e) => setQuickAirLink(e.target.value)}
                                    placeholder="Dán link video TikTok (https://www.tiktok.com/@.../video/...)"
                                    className="sm:col-span-2 h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                  />
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="date"
                                      value={quickAirDate}
                                      onChange={(e) => setQuickAirDate(e.target.value)}
                                      className="h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink flex-1"
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
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                    {jobLink ? (
                                      <>
                                        <a
                                          href={jobLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-code text-xs text-accent hover:underline break-all truncate max-w-[340px]"
                                          title={jobLink}
                                        >
                                          {jobLink}
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleCopy(jobLink, `jobLink_${jIdx}`, 'link video')
                                          }
                                          className="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface"
                                          title="Sao chép link video"
                                        >
                                          {copiedField === `jobLink_${jIdx}` ? (
                                            <Check className="w-3.5 h-3.5 text-positive" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        {onOpenTikTokInspector && (
                                          <button
                                            type="button"
                                            onClick={() => onOpenTikTokInspector(deal)}
                                            className="text-2xs font-medium text-accent hover:underline flex items-center gap-0.5"
                                          >
                                            <Eye className="w-3 h-3" />
                                            Đối soát Brief &amp; Giỏ
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-ink-3 italic text-2xs">
                                        Chưa cập nhật đường dẫn video phát sóng
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingAirJobIdx(jIdx);
                                        setQuickAirLink(jobLink || '');
                                        setQuickAirDate(jobAirDate || getVietnamDateYmd());
                                      }}
                                    >
                                      {jobLink ? 'Sửa link' : '+ Cập nhật link air'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Tầng 2: Asset & Quyền lợi đi kèm (addonServices) */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-medium text-ink text-xs">
                                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                                  <span>
                                    Tầng 2: Quản lý bàn giao Asset &amp; Quyền lợi đi kèm (
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

                              {/* Addon Items List */}
                              <div className="space-y-1.5">
                                {(jobItem.addonServices || []).length === 0 ? (
                                  <div className="p-2 rounded border border-line/60 bg-sunken/20 text-2xs text-ink-3 italic">
                                    Chưa có hạng mục asset/quyền lợi phụ đi kèm trong Job này. Bấm &quot;Thêm asset&quot; nếu có phát sinh mã Spark Ads, file Raw, quyền SDHA hoặc link bio.
                                  </div>
                                ) : (
                                  (jobItem.addonServices || []).map((addon) => {
                                    const isEditingEvidence = editingAddonId === addon.id;
                                    const isVerified = addon.acceptanceStatus === 'VERIFIED';
                                    const isDropped = addon.acceptanceStatus === 'DROPPED';
                                    const isLocked = !hasJobAir;
                                    const isPending = !isVerified && !isDropped && !isLocked;

                                    let tone: 'positive' | 'warning' | 'critical' | 'neutral' = 'neutral';
                                    let badgeText = 'Khóa chờ video';
                                    if (isDropped) {
                                      tone = 'critical';
                                      badgeText = 'Đã khấu trừ hủy';
                                    } else if (isVerified) {
                                      tone = 'positive';
                                      badgeText = 'Đã nhận đủ';
                                    } else if (isPending) {
                                      tone = 'warning';
                                      badgeText = 'Chờ bàn giao';
                                    }

                                    return (
                                      <div
                                        key={addon.id}
                                        className={`p-2.5 rounded border transition-colors ${
                                          isDropped
                                            ? 'border-critical/30 bg-critical-soft/20'
                                            : isVerified
                                            ? 'border-positive/30 bg-positive-soft/20'
                                            : 'border-line bg-surface'
                                        } space-y-2`}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-ink text-xs">
                                              {addon.termLabel}
                                            </span>
                                            <span className="text-2xs px-1.5 py-0.2 rounded bg-sunken text-ink-2 font-code">
                                              {addon.durationDays ? `${addon.durationDays} ngày` : 'Theo thỏa thuận'}
                                            </span>
                                            <span className="text-2xs font-code text-ink-3">
                                              {(addon.allocatedCostVnd || 0) > 0
                                                ? `Net: ${formatVnd(addon.allocatedCostVnd || 0)}`
                                                : 'Gộp trong gói'}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <Status tone={tone}>{badgeText}</Status>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveAddonFromJob(jIdx, addon.id)}
                                              className="p-1 rounded text-ink-3 hover:text-critical hover:bg-critical-soft"
                                              title="Xóa hạng mục này"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Evidence Row */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-2xs">
                                          <div className="flex-1 min-w-[200px]">
                                            {isEditingEvidence ? (
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="text"
                                                  value={editingEvidenceText}
                                                  onChange={(e) => setEditingEvidenceText(e.target.value)}
                                                  placeholder={
                                                    addon.termType === 'ADS_CODE'
                                                      ? 'Nhập mã ủy quyền Spark Ads...'
                                                      : 'Nhập link Google Drive file raw hoặc bài đăng...'
                                                  }
                                                  className="h-6 px-2 rounded border border-line bg-surface font-code text-xs text-ink flex-1"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleSaveAddonEvidence(
                                                      jIdx,
                                                      addon.id,
                                                      editingEvidenceText
                                                    )
                                                  }
                                                  className="px-2 py-0.5 rounded bg-primary text-white font-medium hover:bg-black"
                                                >
                                                  Lưu
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingAddonId(null)}
                                                  className="px-1.5 py-0.5 rounded text-ink-3 hover:bg-sunken"
                                                >
                                                  Hủy
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-ink-3">Bằng chứng / Mã:</span>
                                                {addon.evidenceCodeOrUrl ? (
                                                  <>
                                                    {addon.evidenceCodeOrUrl.startsWith('http') ? (
                                                      <a
                                                        href={addon.evidenceCodeOrUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="font-code text-accent hover:underline break-all truncate max-w-[260px]"
                                                      >
                                                        {addon.evidenceCodeOrUrl} ↗
                                                      </a>
                                                    ) : (
                                                      <span className="font-code font-semibold px-1.5 py-0.2 rounded bg-sunken text-ink">
                                                        {addon.evidenceCodeOrUrl}
                                                      </span>
                                                    )}
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleCopy(
                                                          addon.evidenceCodeOrUrl || '',
                                                          `addon_${addon.id}`,
                                                          addon.termLabel
                                                        )
                                                      }
                                                      className="p-0.5 text-ink-3 hover:text-ink"
                                                      title="Sao chép"
                                                    >
                                                      {copiedField === `addon_${addon.id}` ? (
                                                        <Check className="w-3 h-3 text-positive" />
                                                      ) : (
                                                        <Copy className="w-3 h-3" />
                                                      )}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setEditingAddonId(addon.id);
                                                        setEditingEvidenceText(
                                                          addon.evidenceCodeOrUrl || ''
                                                        );
                                                      }}
                                                      className="text-ink-3 hover:text-accent hover:underline ml-1"
                                                    >
                                                      Sửa
                                                    </button>
                                                  </>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditingAddonId(addon.id);
                                                      setEditingEvidenceText('');
                                                    }}
                                                    className="text-accent hover:underline"
                                                  >
                                                    + Nhập mã / link bàn giao
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action buttons per addon */}
                                          {!isLocked && (
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleToggleAddonStatus(jIdx, addon.id, 'VERIFIED')
                                                }
                                                className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors ${
                                                  isVerified
                                                    ? 'bg-positive text-white'
                                                    : 'border border-line bg-surface text-ink hover:bg-positive-soft hover:text-positive'
                                                }`}
                                              >
                                                ✓ Đã nhận
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleToggleAddonStatus(jIdx, addon.id, 'DROPPED')
                                                }
                                                className={`px-2 py-0.5 rounded text-2xs font-medium transition-colors ${
                                                  isDropped
                                                    ? 'bg-critical text-white'
                                                    : 'border border-line bg-surface text-ink-3 hover:bg-critical-soft hover:text-critical'
                                                }`}
                                                title="Không bàn giao - Khấu trừ vào quyết toán"
                                              >
                                                ✕ Khấu trừ
                                              </button>
                                              {(isVerified || isDropped) && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleToggleAddonStatus(
                                                      jIdx,
                                                      addon.id,
                                                      'PENDING_ACCEPTANCE'
                                                    )
                                                  }
                                                  className="px-1.5 py-0.5 rounded text-2xs text-ink-3 hover:bg-sunken hover:text-ink"
                                                  title="Chuyển lại về Chờ bàn giao"
                                                >
                                                  ↺ Chờ
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Inline Add Addon Form */}
                              {addingAddonJobIdx === jIdx && (
                                <div className="p-3 rounded-lg border border-accent/40 bg-accent-soft/20 space-y-2.5 text-xs">
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
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">
                                        Loại quyền lợi / Asset
                                      </label>
                                      <select
                                        value={newAddonType}
                                        onChange={(e) => {
                                          const val = e.target.value as DealRightsTermItem['termType'];
                                          setNewAddonType(val);
                                          if (val === 'ADS_CODE')
                                            setNewAddonLabel('Mã ủy quyền Spark Ads (30 ngày)');
                                          else if (val === 'IMAGE_USAGE')
                                            setNewAddonLabel('Quyền SDHA & Video gốc (File Raw)');
                                          else if (val === 'CROSS_POST_REUP')
                                            setNewAddonLabel('Đăng chéo (Reup Reels / Shopee)');
                                          else if (val === 'LINK_BIO_CART')
                                            setNewAddonLabel('Duy trì link Bio / Giỏ hàng');
                                          else if (val === 'EXCLUSIVITY')
                                            setNewAddonLabel('Độc quyền ngành hàng');
                                        }}
                                        className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                                      >
                                        <option value="ADS_CODE">Mã ủy quyền Spark Ads</option>
                                        <option value="IMAGE_USAGE">
                                          Quyền SDHA &amp; Video gốc (File Raw sạch)
                                        </option>
                                        <option value="CROSS_POST_REUP">
                                          Đăng chéo (Reup FB Reels / Shopee Video)
                                        </option>
                                        <option value="LINK_BIO_CART">
                                          Duy trì link Bio / Giỏ hàng Affiliate
                                        </option>
                                        <option value="EXCLUSIVITY">Độc quyền ngành hàng</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">
                                        Tên hạng mục hiển thị
                                      </label>
                                      <input
                                        type="text"
                                        value={newAddonLabel}
                                        onChange={(e) => setNewAddonLabel(e.target.value)}
                                        placeholder="VD: Cấp mã Spark Ads 30 ngày / Bàn giao file raw 4K"
                                        className="w-full h-7 px-2 rounded border border-line bg-surface text-xs text-ink"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">
                                        Thời hạn hiệu lực (ngày)
                                      </label>
                                      <input
                                        type="number"
                                        value={newAddonDays}
                                        onChange={(e) => setNewAddonDays(Number(e.target.value) || 0)}
                                        className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-2xs text-ink-3 block mb-0.5">
                                        Giá trị Net phân bổ (0 nếu gộp gói)
                                      </label>
                                      <input
                                        type="number"
                                        value={newAddonCost}
                                        onChange={(e) => setNewAddonCost(Number(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                      />
                                    </div>

                                    <div className="sm:col-span-2">
                                      <label className="text-2xs text-ink-3 block mb-0.5">
                                        Mã Spark Ads hoặc Link Drive file raw (nếu có sẵn)
                                      </label>
                                      <input
                                        type="text"
                                        value={newAddonEvidence}
                                        onChange={(e) => setNewAddonEvidence(e.target.value)}
                                        placeholder="Dán mã ads hoặc link Drive..."
                                        className="w-full h-7 px-2 rounded border border-line bg-surface font-code text-xs text-ink"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 pt-1">
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

                  {/* 3. Tầng 3: Tổng kết Nghiệm thu Deal & Mở khóa Thủ tục */}
                  <Panel
                    title="Tầng 3: Tổng kết Nghiệm thu &amp; Thủ tục Pháp chế - Kế toán"
                    actions={
                      <div className="flex items-center gap-2">
                        {onOpenDraftBbntPreview && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={FileText}
                            onClick={() =>
                              onOpenDraftBbntPreview(buildBookingDealFromApprovedItem(deal))
                            }
                          >
                            Xem trước BBNT
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Send}
                          onClick={() => onOpenLarkPaymentModal?.(deal)}
                        >
                          Lập phiếu Lark
                        </Button>
                      </div>
                    }
                  >
                    <div className="space-y-3 text-xs">
                      {isDealFullyAccepted ? (
                        <div className="p-3 rounded-lg border border-positive/40 bg-positive-soft/20 flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-semibold text-ink">
                              Toàn bộ Video và Asset đi kèm đã được nghiệm thu hoàn tất
                            </div>
                            <div className="text-2xs text-ink-2">
                              Deal đã đủ điều kiện tiến hành ký Biên bản nghiệm thu (BBNT) và lập phiếu Đề nghị thanh toán (ĐNTT) tất toán qua Lark Approval.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border border-warning/40 bg-warning-soft/20 flex items-start gap-2.5">
                          <Eye className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-semibold text-ink">
                              Chưa hoàn tất đủ 2 tầng nghiệm thu
                            </div>
                            <div className="text-2xs text-ink-2">
                              {!isStage1Complete
                                ? 'Vui lòng cập nhật nghiệm thu Video phát sóng chính thức (Tầng 1).'
                                : `Còn ${pendingAddons.length} hạng mục asset/quyền lợi đi kèm đang chờ bàn giao hoặc chưa xác nhận khấu trừ (Tầng 2).`}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-2.5 rounded border border-line bg-surface">
                          <div className="text-2xs text-ink-3">Biên bản nghiệm thu (BBNT)</div>
                          <div className="font-code font-semibold text-ink mt-0.5">
                            {deal.bbntCode || (deal.maBooking ? `BBNT-${deal.maBooking}` : 'Chưa lập')}
                          </div>
                          <div className="text-2xs text-ink-3 mt-1">
                            Trạng thái ký: {deal.bbntStatus || 'CHƯA_LẬP'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded border border-line bg-surface">
                          <div className="text-2xs text-ink-3">Phiếu ĐNTT Tất toán (Lark Approval)</div>
                          <div className="font-code font-semibold text-ink mt-0.5">
                            {deal.larkSlipCode || 'Chưa khởi tạo phiếu'}
                          </div>
                          <div className="text-2xs text-ink-3 mt-1">
                            Trạng thái: {deal.trangThaiPhieuThanhToan || 'Chưa lập ĐNTT'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Panel>

                <Panel
                  title="Tài khoản thụ hưởng & Phê duyệt thanh toán Lark"
                  actions={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSensitive((v) => !v)}
                      >
                        {showSensitive ? 'Che STK / CCCD' : 'Hiện đầy đủ'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Send}
                        onClick={() => onOpenLarkPaymentModal?.(deal)}
                      >
                        Lập phiếu Lark
                      </Button>
                    </div>
                  }
                >
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <dt className="text-2xs text-ink-3">Chủ tài khoản thụ hưởng</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {deal.tenTaiKhoanNganHang || 'Chưa cập nhật'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Ngân hàng &amp; Số tài khoản</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.soTaiKhoan, showSensitive)} · {deal.nganHang || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Số CCCD / Mã số thuế</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.soCccd, showSensitive)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Phiếu đề nghị thanh toán (Lark)</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {deal.larkSlipCode || deal.larkApprovalInstanceCode || 'Chưa khởi tạo phiếu'} ·{' '}
                        <span className="font-sans text-ink-2">{deal.trangThaiPhieuThanhToan}</span>
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-2xs text-ink-3">Nội dung chuyển khoản chuẩn Kế toán</dt>
                      <dd className="mt-1 flex items-center justify-between gap-2 p-2 rounded bg-sunken border border-line font-code text-xs text-ink">
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
                            className="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface shrink-0"
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
            );
          })()}
          </div>
        </div>
      </div>
    </Presence>,
    document.body
  );
};
