'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  ExternalLink,
  Edit3,
  Check,
  Share2,
  UserPlus,
  Calculator,
  Plus,
  Upload,
  Video,
  Send,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Truck,
  Copy
} from 'lucide-react';
import { 
  KocItem, 
  BookingDealItem, 
  DealDeliverableItem,
  DealRightsTermItem,
  KocCandidateItem,
  StaffDetailedPlanItem,
  MonthlyStaffAllocation,
  UserProfile,
  StorePortfolioItem
} from '../../lib/types';
import { 
  INITIAL_KOCS, 
  INITIAL_KOC_CANDIDATES,
  INITIAL_DETAILED_STAFF_PLANS,
  INITIAL_STAFF_ALLOCATIONS_26,
  MOCK_SAMPLE_SHIPMENTS
} from '../../lib/mockData';
import { REAL_B2C_69_STORES } from '../../lib/realB2cPlanData';
import { filterScopedStores } from '../../lib/rbacScope';
import { getVietnamDateTimeShort } from '../../lib/format';
import { bookingDealCost } from '../../lib/planDealLink';
import { KocProfileModal } from '../KocProfileModal';
import { calculateKocPerformanceStats } from '../koc/kocUtils';
import { CreateKocModal } from '../CreateKocModal';
import { MyPlanWorkspace } from '../MyPlanWorkspace';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { LarkPaymentRequestModal } from '../booking/LarkPaymentRequestModal';
import type { PaymentRequestType } from '../../lib/larkPaymentRequestEngine';
import SampleTrackerView from './SampleTrackerView';
import { ActionMenu, Avatar, Button, Chips, ConfirmDialog, DataTable, EmptyState, Field, FilterBar, Input, Modal, PageActions, Pagination, Panel, Person, Segmented, Select, Stat, StatRow, Status, Tabs, Textarea } from '../ui';
import type { StatusTone } from '../ui';
import { formatNumber, formatPercent, formatVnd, formatVndShort } from '../../lib/format';

type PipelineStageKey =
  | '1_PLAN_SOURCING'
  | '2_DEAL_CONTRACT'
  | '3_CONTENT_SCRIPT'
  | '4_AIR_GROWTH'
  | '5_SETTLEMENT';

const PIPELINE_STAGES: Array<{
  key: PipelineStageKey;
  step: number;
  shortLabel: string;
  label: string;
  team: string;
  tone: StatusTone;
  nextStage?: PipelineStageKey;
  nextActionLabel?: string;
}> = [
  {
    key: '1_PLAN_SOURCING',
    step: 1,
    shortLabel: 'B1 · Đề xuất & Duyệt',
    label: '1. Đề xuất & Chờ Brand duyệt',
    team: 'Booking · Brand',
    tone: 'neutral',
    nextStage: '2_DEAL_CONTRACT',
    nextActionLabel: 'Sang B2 (HĐ & Cọc)',
  },
  {
    key: '2_DEAL_CONTRACT',
    step: 2,
    shortLabel: 'B2 · HĐ & Tạm ứng',
    label: '2. Hợp đồng & Tạm ứng',
    team: 'Booking · Kế toán',
    tone: 'info',
    nextStage: '3_CONTENT_SCRIPT',
    nextActionLabel: 'Sang B3 (Gửi mẫu)',
  },
  {
    key: '3_CONTENT_SCRIPT',
    step: 3,
    shortLabel: 'B3 · Mẫu & Kịch bản',
    label: '3. Gửi mẫu & Kịch bản',
    team: 'Booking · Content',
    tone: 'info',
    nextStage: '4_AIR_GROWTH',
    nextActionLabel: 'Sang B4 (Lên sóng)',
  },
  {
    key: '4_AIR_GROWTH',
    step: 4,
    shortLabel: 'B4 · Lên sóng & Ads',
    label: '4. Lên sóng & Mã Ads',
    team: 'Content',
    tone: 'warning',
    nextStage: '5_SETTLEMENT',
    nextActionLabel: 'Sang B5 (Quyết toán)',
  },
  {
    key: '5_SETTLEMENT',
    step: 5,
    shortLabel: 'B5 · Quyết toán & GMV',
    label: '5. Quyết toán & Hiệu quả',
    team: 'Kế toán',
    tone: 'positive',
  },
];

const PIPELINE_STAGE_MAP: Record<PipelineStageKey, (typeof PIPELINE_STAGES)[number]> = {
  '1_PLAN_SOURCING': PIPELINE_STAGES[0],
  '2_DEAL_CONTRACT': PIPELINE_STAGES[1],
  '3_CONTENT_SCRIPT': PIPELINE_STAGES[2],
  '4_AIR_GROWTH': PIPELINE_STAGES[3],
  '5_SETTLEMENT': PIPELINE_STAGES[4],
};

function resolveDealPipelineStage(deal: BookingDealItem): PipelineStageKey {
  if (deal.currentStage && PIPELINE_STAGE_MAP[deal.currentStage]) {
    return deal.currentStage;
  }
  if (
    deal.brandApprovalStatus === 'CHỜ_DUYỆT' ||
    deal.brandApprovalStatus === 'TỪ_CHỐI' ||
    deal.status === 'DRAFT' ||
    deal.status === 'CANCELLED'
  ) {
    return '1_PLAN_SOURCING';
  }
  if (
    deal.status === 'FINAL_PAID' ||
    deal.status === 'COMPLETED' ||
    deal.pipelineText === 'Done' ||
    (deal.gmv30 || 0) > 0
  ) {
    return '5_SETTLEMENT';
  }
  if (
    deal.status === 'VIDEO_SUBMITTED' ||
    deal.status === 'VIDEO_VERIFIED' ||
    deal.pipelineText === 'On Air' ||
    deal.pipelineText === 'Làm ĐNTT' ||
    (deal.pipelineText === 'Đã nhập mã Spark Ads' || deal.pipelineText === 'Bàn giao Growth Ads')
  ) {
    return '4_AIR_GROWTH';
  }
  if (
    deal.status === 'SAMPLE_SHIPPED' ||
    deal.pipelineText === 'Gửi hàng' ||
    deal.pipelineText === 'Demo' ||
    deal.pipelineText === 'Kịch bản'
  ) {
    return '3_CONTENT_SCRIPT';
  }
  if (
    deal.status === 'CONTRACT_GENERATED' ||
    deal.status === 'ADVANCE_PAID' ||
    deal.pipelineText === 'Tạm ứng' ||
    deal.pipelineText === 'Đã tạo BO'
  ) {
    return '2_DEAL_CONTRACT';
  }
  return '1_PLAN_SOURCING';
}

interface BookingViewProps {
  deals: BookingDealItem[];
  kocs?: KocItem[];
  currentUser?: UserProfile;
  onOpenQuickBookWithKoc: (koc: KocItem) => void;
  onSelectDealForContract?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onUpdateDeal?: (updatedDeal: BookingDealItem) => void;
  onKocCreated?: (newKoc: KocItem) => void;
  onKocUpdated?: (updatedKoc: KocItem, message?: string) => void;
  planItems?: StaffDetailedPlanItem[];
  onAddPlanItem?: (newItem: StaffDetailedPlanItem) => void;
  onUpdatePlanItem?: (item: StaffDetailedPlanItem) => void;
  onDeletePlanItem?: (itemId: string) => void;
  onSubmitPlanToLead?: (staffName: string) => void;
  onConvertPlanItemToDeal?: (item: StaffDetailedPlanItem) => void;
  staffAllocations?: MonthlyStaffAllocation[];
  currentUserName?: string;
  onOpenInputPlan?: () => void;
  onOpenQuickBook?: () => void;
  onOpenImport?: () => void;
  selectedBrand?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  bookingDrilldownIntent?: {
    storeName?: string;
    brandName?: string;
    dealCode?: string;
    month?: string;
    subTab?: 'BOOKING_DEALS' | 'SAMPLE_ADS' | 'MY_PLAN' | 'CANDIDATES' | 'KOC_DIRECTORY';
    nonce: number;
  } | null;
}

export const BookingView: React.FC<BookingViewProps> = ({ 
  deals,
  kocs,
  currentUser,
  onOpenQuickBookWithKoc,
  onSelectDealForContract,
  onUpdateDeal,
  onKocCreated,
  onKocUpdated,
  planItems: externalPlanItems,
  onAddPlanItem: externalOnAddPlanItem,
  onUpdatePlanItem: externalOnUpdatePlanItem,
  onDeletePlanItem: externalOnDeletePlanItem,
  onSubmitPlanToLead: externalOnSubmitPlanToLead,
  onConvertPlanItemToDeal,
  staffAllocations: externalStaffAllocations,
  currentUserName,
  onOpenInputPlan,
  onOpenQuickBook,
  onOpenImport,
  selectedBrand = 'ALL',
  onNotify,
  bookingDrilldownIntent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'BOOKING_DEALS' | 'SAMPLE_ADS' | 'MY_PLAN' | 'CANDIDATES' | 'KOC_DIRECTORY'>('BOOKING_DEALS');
  const [visitedSubTabs, setVisitedSubTabs] = useState<Record<string, boolean>>({ BOOKING_DEALS: true });
  if (!visitedSubTabs[activeSubTab]) {
    setVisitedSubTabs(prev => ({ ...prev, [activeSubTab]: true }));
  }
  const [candidates, setCandidates] = useState<KocCandidateItem[]>(INITIAL_KOC_CANDIDATES);
  const [candidateFilter, setCandidateFilter] = useState<string>('ALL');
  const [localDealOverrides, setLocalDealOverrides] = useState<Record<string, BookingDealItem>>({});
  const [pipelineViewMode, setPipelineViewMode] = useState<'BY_STORE' | 'KANBAN' | 'TABLE'>('BY_STORE');
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<'ALL' | PipelineStageKey>('ALL');
  const [collapsedStores, setCollapsedStores] = useState<Record<string, boolean>>({});
  const [storeGroupPage, setStoreGroupPage] = useState<number>(1);
  const [storeGroupPageSize, setStoreGroupPageSize] = useState<number>(8);
  const [kanbanCardLimit, setKanbanCardLimit] = useState<number>(12);

  const applyDealUpdate = (updatedDeal: BookingDealItem) => {
    setLocalDealOverrides(prev => ({ ...prev, [updatedDeal.id]: updatedDeal }));
    if (onUpdateDeal) {
      onUpdateDeal(updatedDeal);
    }
  };

  const handleAdvanceDealStage = (deal: BookingDealItem, targetStage: PipelineStageKey) => {
    let status = deal.status;
    let statusLabel = deal.statusLabel;
    let pipelineText = deal.pipelineText;
    let brandApprovalStatus = deal.brandApprovalStatus;
    let holdingTeam: BookingDealItem['holdingTeam'] = deal.holdingTeam || 'BOOKING';

    if (targetStage === '2_DEAL_CONTRACT') {
      brandApprovalStatus = 'ĐÃ_DUYỆT';
      status = 'CONTRACT_GENERATED';
      statusLabel = 'Brand Đã Duyệt (Tạo HĐ & Cọc)';
      pipelineText = 'Đã tạo BO';
      holdingTeam = 'BOOKING';
    } else if (targetStage === '3_CONTENT_SCRIPT') {
      brandApprovalStatus = 'ĐÃ_DUYỆT';
      status = 'SAMPLE_SHIPPED';
      statusLabel = 'Đang Gửi Mẫu & Duyệt Kịch Bản';
      pipelineText = 'Gửi hàng';
      holdingTeam = 'CONTENT';
    } else if (targetStage === '4_AIR_GROWTH') {
      brandApprovalStatus = 'ĐÃ_DUYỆT';
      status = 'VIDEO_VERIFIED';
      statusLabel = 'Đã Lên Sóng (Chờ Mã Ads / ĐNTT)';
      pipelineText = 'Làm ĐNTT';
      holdingTeam = 'BOOKING';
    } else if (targetStage === '5_SETTLEMENT') {
      brandApprovalStatus = 'ĐÃ_DUYỆT';
      status = 'FINAL_PAID';
      statusLabel = 'Đã Tất Toán (Hoàn Tất HĐ)';
      pipelineText = 'Done';
      holdingTeam = 'FINANCE';
    }

    applyDealUpdate({
      ...deal,
      currentStage: targetStage,
      brandApprovalStatus,
      status,
      statusLabel,
      pipelineText,
      holdingTeam,
    });
  };

  // Plan Items State
  const [localPlanItems, setLocalPlanItems] = useState<StaffDetailedPlanItem[]>(externalPlanItems || INITIAL_DETAILED_STAFF_PLANS);
  const [prevExternalPlanItems, setPrevExternalPlanItems] = useState(externalPlanItems);
  if (externalPlanItems && externalPlanItems !== prevExternalPlanItems) {
    setPrevExternalPlanItems(externalPlanItems);
    setLocalPlanItems(externalPlanItems);
  }

  // Local KOC list state (allows dynamic creation)
  const [localKocs, setLocalKocs] = useState<KocItem[]>(kocs || INITIAL_KOCS);
  const [isCreateKocOpen, setIsCreateKocOpen] = useState(false);
  const [prevKocs, setPrevKocs] = useState(kocs);
  if (kocs && kocs !== prevKocs) {
    setPrevKocs(kocs);
    setLocalKocs(kocs);
  }

  const handleCreateKocSuccess = (newKoc: KocItem) => {
    setLocalKocs(prev => [newKoc, ...prev]);
    if (onKocCreated) {
      onKocCreated(newKoc);
    }
  };

  const staffAllocationList = externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26;
  const resolveValidStaffName = (candidate?: string) => {
    if (candidate) {
      const exactOrPartial = staffAllocationList.find(a => a.staffName === candidate || a.staffName.includes(candidate));
      if (exactOrPartial) return exactOrPartial.staffName;
    }
    const defaultStaff = staffAllocationList.find(a => a.staffName.includes('Lê Phương Thảo'));
    return defaultStaff?.staffName || staffAllocationList[0]?.staffName || 'Lê Phương Thảo';
  };

  // Active Booking Staff Context (Cho phép nhân viên chọn danh tính của mình để xem KPI cá nhân)
  const [selectedStaffName, setSelectedStaffName] = useState<string>(() =>
    resolveValidStaffName(currentUser?.role === 'BOOKING_MEMBER' ? currentUser.name : currentUserName)
  );
  const userKey = `${currentUser?.role ?? ''}:${currentUser?.name ?? ''}:${currentUserName ?? ''}`;
  const [prevUserKey, setPrevUserKey] = useState(userKey);
  if (userKey !== prevUserKey) {
    setPrevUserKey(userKey);
    if (currentUser?.role === 'BOOKING_MEMBER') {
      setSelectedStaffName(resolveValidStaffName(currentUser.name));
    } else if (!staffAllocationList.some(a => a.staffName === selectedStaffName)) {
      setSelectedStaffName(resolveValidStaffName(currentUserName));
    }
  }

  // Search & 4 Phân loại cốt lõi KOC Directory (Sheet 3.1 & 3.2 & 5.4 & 5.6)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKL, setSelectedKL] = useState<string>('ALL'); // 1. Khung lương
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL'); // 2. Segment
  const [selectedKocCategory, setSelectedKocCategory] = useState<string>('ALL'); // 3. KOC Category
  const [selectedTepKenh, setSelectedTepKenh] = useState<string>('ALL'); // 4. Tệp kênh
  const [inspectedKoc, setInspectedKoc] = useState<KocItem | null>(null);
  const [kocsPage, setKocsPage] = useState(1);
  const [kocsPageSize, setKocsPageSize] = useState(20);

  // Filters for Booking Deals
  const [dealsFilter, setDealsFilter] = useState<'ALL' | 'BRAND_PENDING' | 'BRAND_APPROVED' | 'BRAND_REJECTED' | 'WINNER_TOP20' | 'HAS_GMV' | 'BREAK_EVEN' | 'OVERDUE_SLA' | 'SAMPLE_PENDING' | 'ADS_CODE_PENDING' | 'ADVANCE_PENDING' | 'ADVANCE_PAID'>('ALL');
  const [dealPeriodScope, setDealPeriodScope] = useState<'CURRENT_PAID' | 'ALL_PAID' | 'FOC_ONLY' | 'ALL_ARCHIVE'>('CURRENT_PAID');
  const [selectedDealPicFilter, setSelectedDealPicFilter] = useState<string>('ALL');
  const [dealsSearch, setDealsSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>(selectedBrand || 'ALL');
  const [dealsPage, setDealsPage] = useState(1);
  const [dealsPageSize, setDealsPageSize] = useState(20);
  const [prevSelectedBrand, setPrevSelectedBrand] = useState(selectedBrand);
  if (selectedBrand !== prevSelectedBrand) {
    setPrevSelectedBrand(selectedBrand);
    if (selectedBrand) {
      setSelectedBrandFilter(selectedBrand);
    }
  }

  // Khi người dùng drill-down từ Hồ sơ Gian hàng hoặc Hồ sơ Thương hiệu sang Quản lý Booking
  const [handledBookingDrilldownNonce, setHandledBookingDrilldownNonce] = useState<number>(0);
  if (bookingDrilldownIntent && bookingDrilldownIntent.nonce !== handledBookingDrilldownNonce) {
    setHandledBookingDrilldownNonce(bookingDrilldownIntent.nonce);
    setActiveSubTab(bookingDrilldownIntent.subTab || 'BOOKING_DEALS');
    setDealsFilter('ALL');
    setSelectedDealPicFilter('ALL');
    if (bookingDrilldownIntent.brandName) {
      setSelectedBrandFilter(bookingDrilldownIntent.brandName);
    } else {
      setSelectedBrandFilter('ALL');
    }
    if (bookingDrilldownIntent.dealCode) {
      setDealsSearch(bookingDrilldownIntent.dealCode);
      setDealPeriodScope('ALL_ARCHIVE');
    } else {
      setDealsSearch('');
    }
  }

  // Modal Editing Deal State
  const [editingDeal, setEditingDeal] = useState<BookingDealItem | null>(null);
  const [editForm, setEditForm] = useState<{
    brandApprovalStatus: 'ĐÃ_DUYỆT' | 'CHỜ_DUYỆT' | 'TỪ_CHỐI';
    brandRejectReason: string;
    pipelineText: string;
    sampleStatus: 'CHƯA_GỬI' | 'ĐANG_GIAO' | 'ĐÃ_NHẬN';
    sampleCarrier: 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress';
    sampleTrackingCode: string;
    sampleDeliveredDate: string;
    adsCodeStatus: 'CHƯA_CẤP' | 'ĐÃ_NGHIỆM_THU' | 'KHÔNG_DÙNG';
    sparkAdsCode: string;
    sparkAdsExpiryDays: number;
    tiktokVideoUrl: string;
    viewsCount: number;
    gmv30: number;
    status: BookingDealItem['status'];
    statusLabel: string;
    advanceAmount: number;
    deliverables: DealDeliverableItem[];
    rightsTerms: DealRightsTermItem[];
  }>({
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    brandRejectReason: '',
    pipelineText: 'Kịch bản',
    sampleStatus: 'ĐÃ_NHẬN',
    sampleCarrier: 'GHN',
    sampleTrackingCode: '',
    sampleDeliveredDate: '',
    adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
    sparkAdsCode: '',
    sparkAdsExpiryDays: 60,
    tiktokVideoUrl: '',
    viewsCount: 0,
    gmv30: 0,
    advanceAmount: 0,
    status: 'VIDEO_SUBMITTED',
    statusLabel: 'Video Đã Lên Sóng',
    deliverables: [],
    rightsTerms: []
  });

  // State cho Hộp thoại Cập nhật Vận đơn Hàng mẫu (Bước 3)
  const [sampleModalDeal, setSampleModalDeal] = useState<BookingDealItem | null>(null);
  const [sampleForm, setSampleForm] = useState<{
    sampleStatus: 'CHƯA_GỬI' | 'ĐANG_GIAO' | 'ĐÃ_NHẬN';
    carrier: 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress';
    trackingCode: string;
    sentDate: string;
    deliveredDate: string;
    recipientPhone: string;
    shippingAddress: string;
  }>({
    sampleStatus: 'ĐANG_GIAO',
    carrier: 'GHN',
    trackingCode: '',
    sentDate: '18/10/2026',
    deliveredDate: '',
    recipientPhone: '0981.234.567',
    shippingAddress: 'Địa chỉ nhận mẫu KOC trên hệ thống',
  });
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleOpenSampleModal = (deal: BookingDealItem) => {
    setSampleModalDeal(deal);
    setSampleForm({
      sampleStatus: deal.sampleStatus || 'ĐANG_GIAO',
      carrier: deal.sampleCarrier || 'GHN',
      trackingCode:
        deal.sampleTrackingCode ||
        `GHN-${deal.dealCode.replace(/[^0-9]/g, '').slice(-8) || '00000001'}`,
      sentDate: deal.sampleSentDate || '18/10/2026',
      deliveredDate:
        deal.sampleDeliveredDate || (deal.sampleStatus === 'ĐÃ_NHẬN' ? '20/10/2026' : ''),
      recipientPhone: deal.sampleRecipientPhone || '0981.234.567',
      shippingAddress:
        deal.sampleShippingAddress || 'Địa chỉ nhận mẫu KOC đã xác nhận trên hệ thống',
    });
  };

  const handleConfirmSampleUpdate = () => {
    if (!sampleModalDeal) return;
    const isReceived = sampleForm.sampleStatus === 'ĐÃ_NHẬN';
    const currentSt = resolveDealPipelineStage(sampleModalDeal);
    const shouldMoveToStep3 =
      (sampleForm.sampleStatus === 'ĐANG_GIAO' || isReceived) &&
      (currentSt === '1_PLAN_SOURCING' || currentSt === '2_DEAL_CONTRACT');

    const updated: BookingDealItem = {
      ...sampleModalDeal,
      sampleStatus: sampleForm.sampleStatus,
      sampleCarrier: sampleForm.carrier,
      sampleTrackingCode: sampleForm.trackingCode.trim(),
      sampleSentDate: sampleForm.sentDate,
      sampleDeliveredDate: isReceived
        ? sampleForm.deliveredDate || '20/10/2026'
        : sampleForm.deliveredDate || undefined,
      sampleRecipientPhone: sampleForm.recipientPhone,
      sampleShippingAddress: sampleForm.shippingAddress,
      ...(shouldMoveToStep3
        ? {
            currentStage: '3_CONTENT_SCRIPT' as const,
            status: isReceived ? ('SAMPLE_RECEIVED' as const) : ('SAMPLE_SHIPPED' as const),
            pipelineText: isReceived ? 'Kịch bản' : 'Gửi hàng',
            holdingTeam: 'CONTENT' as const,
          }
        : {}),
    };

    applyDealUpdate(updated);
    onNotify?.(
      `Đã cập nhật vận đơn hàng mẫu [${sampleForm.carrier} · ${sampleForm.trackingCode}] cho ${sampleModalDeal.dealCode}`,
      'success'
    );
    setSampleModalDeal(null);
  };

  // Hộp thoại nhập mã Spark Ads sau khi video đạt (dữ liệu cũ dùng tên trường growth*)
  const [handoffDeal, setHandoffDeal] = useState<BookingDealItem | null>(null);
  const [rejectingDeal, setRejectingDeal] = useState<BookingDealItem | null>(null);
  const [approvingDeal, setApprovingDeal] = useState<BookingDealItem | null>(null);
  const [autoAirDeal, setAutoAirDeal] = useState<BookingDealItem | null>(null);
  const [isVideoInspectorOpen, setIsVideoInspectorOpen] = useState(false);
  const [inspectorDeal, setInspectorDeal] = useState<BookingDealItem | null>(null);
  const [inspectorInitialUrl, setInspectorInitialUrl] = useState<string>('');
  const [isPaymentRequestOpen, setIsPaymentRequestOpen] = useState(false);
  const [paymentRequestDeal, setPaymentRequestDeal] = useState<BookingDealItem | null>(null);
  const [paymentRequestMode, setPaymentRequestMode] = useState<PaymentRequestType>('SETTLEMENT');
  const [handoffForm, setHandoffForm] = useState({
    sparkAdsCode: '',
    tiktokVideoUrl: '',
    authDuration: '60 ngày',
    clientCommitmentStatus: 'ĐÃ_CHỐT_NGÂN_SÁCH_ADS',
    growthNote: ''
  });

  const handleOpenGrowthHandoff = (deal: BookingDealItem) => {
    setHandoffDeal(deal);
    setHandoffForm({
      sparkAdsCode: deal.sparkAdsCode || `SPARK-TT-${deal.dealCode.slice(-6)}-${Date.now().toString().slice(-4)}`,
      tiktokVideoUrl: deal.tiktokVideoUrl || deal.videoUrl || 'https://www.tiktok.com/@creator/video/7418920192',
      authDuration: deal.sparkAdsExpiryDays ? `${deal.sparkAdsExpiryDays} ngày` : '60 ngày',
      clientCommitmentStatus: 'ĐÃ_CHỐT_NGÂN_SÁCH_ADS',
      growthNote: ''
    });
  };

  const handleConfirmGrowthHandoff = () => {
    if (!handoffDeal) return;
    const expiryDays = parseInt(handoffForm.authDuration, 10) || 60;
    const updated: BookingDealItem = {
      ...handoffDeal,
      growthHandoffStatus: 'ĐÃ_GIAO_MÃ_ADS',
      currentStage: '4_AIR_GROWTH',
      holdingTeam: 'BOOKING',
      holdingReason: 'Đã nhận mã Spark Ads, chờ làm ĐNTT',
      adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
      sparkAdsCode: handoffForm.sparkAdsCode,
      sparkAdsExpiryDays: expiryDays,
      tiktokVideoUrl: handoffForm.tiktokVideoUrl,
      pipelineText: 'Đã nhập mã Spark Ads'
    };

    applyDealUpdate(updated);
    onNotify?.(
      `Đã lưu mã Spark Ads [${handoffForm.sparkAdsCode}] cho ${handoffDeal.dealCode}`,
      'success'
    );
    setHandoffDeal(null);
  };

  // ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHandoffDeal(null);
        setEditingDeal(null);
        setSampleModalDeal(null);
      }
    };
    if (handoffDeal || editingDeal || sampleModalDeal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handoffDeal, editingDeal, sampleModalDeal]);

  // 1. Khung Lương (KL) - Chuẩn hóa Sheet 3.1 & 5.6
  const salaryGrades = [
    { key: 'ALL', label: 'Tất cả KL' },
    { key: 'TAP UpAffiliate', label: 'TAP UpAffiliate (0đ)' },
    { key: 'KL1', label: 'KL1 (<500k)' },
    { key: 'KL2', label: 'KL2 (500k-1.5M)' },
    { key: 'KL3', label: 'KL3 (1.5-3M)' },
    { key: 'KL4', label: 'KL4 (3-5M)' },
    { key: 'KL5', label: 'KL5 (5-10M)' },
    { key: 'KL6', label: 'KL6 (10-30M)' },
    { key: 'KL7', label: 'KL7 (>30M)' },
    { key: 'TAP đối tác ngoài', label: 'TAP ngoài / MCN' },
  ];

  // 2. Phân nhóm Creator (Segment) - Sheet 3.2 Col 81 & 5.6
  const creatorSegments = [
    { key: 'ALL', label: 'Tất cả Segment' },
    { key: 'Massive Creator', label: 'Massive Creator (TAP, KL1-3)' },
    { key: 'Mid Creator', label: 'Mid Creator (KL4-5)' },
    { key: 'Key Creator', label: 'Key Creator (KL6)' },
    { key: 'Top Creator', label: 'Top Creator (KL7)' },
  ];

  // 3. KOC Category (Ngành hàng) - Sheet 3.2 Col 87 & 5.4
  const kocCategories = [
    { key: 'ALL', label: 'Tất cả ngành hàng' },
    { key: 'Personal care', label: 'Personal care' },
    { key: 'Mom and baby', label: 'Mom and baby' },
    { key: 'Reviewer', label: 'Reviewer' },
    { key: 'Lifestyle', label: 'Lifestyle' },
    { key: 'Fashion', label: 'Fashion' },
    { key: 'ELHA', label: 'ELHA (Gia dụng)' },
    { key: 'F&B', label: 'F&B (Ẩm thực)' },
    { key: 'Social / Comedian', label: 'Social / Comedian' },
    { key: 'Travel/Hospitality', label: 'Travel/Hospitality' },
  ];

  // 4. Tệp Kênh - 25 tệp chuẩn Sheet 3.1 & 5.4
  const tepKenhList = [
    { key: 'ALL', label: 'Tất cả tệp kênh' },
    { key: 'Review Nữ', label: 'Review Nữ' },
    { key: 'Review Nam', label: 'Review Nam' },
    { key: 'Unboxing', label: 'Unboxing' },
    { key: 'Seller', label: 'Seller' },
    { key: 'Mẹ bé (bầu)', label: 'Mẹ bé (bầu)' },
    { key: 'Mẹ bé (bé)', label: 'Mẹ bé (bé)' },
    { key: 'Gia đình', label: 'Gia đình' },
    { key: 'Couple', label: 'Couple' },
    { key: 'Beauty', label: 'Beauty' },
    { key: 'Health', label: 'Health' },
    { key: 'Makeup Artist', label: 'Makeup Artist' },
    { key: 'Tóc', label: 'Tóc' },
    { key: 'Bác sỹ/chuyên gia', label: 'Bác sỹ/chuyên gia' },
    { key: 'Gym', label: 'Gym' },
    { key: 'Eat Clean', label: 'Eat Clean' },
    { key: 'Thời trang (review)', label: 'Thời trang' },
    { key: 'Thời trang (có kiến thức)', label: 'Thời trang (kiến thức)' },
    { key: 'Lifestyle', label: 'Lifestyle' },
    { key: 'Nhà cửa đời sống', label: 'Nhà cửa đời sống' },
    { key: 'Cooking', label: 'Cooking' },
    { key: 'Thú cưng', label: 'Thú cưng' },
    { key: 'POV', label: 'POV' },
    { key: 'Dance', label: 'Dance' },
    { key: 'Cosplay', label: 'Cosplay' },
    { key: 'Tin tức', label: 'Tin tức' },
    { key: 'LGBT', label: 'LGBT' },
    { key: 'KOL', label: 'KOL' },
    { key: 'Nữ xinh', label: 'Nữ xinh' },
  ];

  // Brands / Gian hàng (Động theo phân quyền nhân viên và danh sách Deal)
  const brandsList = useMemo(() => {
    const set = new Set<string>();
    if (currentUser?.assignedBrands) {
      currentUser.assignedBrands.forEach(b => {
        const norm = b.trim();
        if (norm && !['ALL_BRANDS', 'Tất cả nhãn hàng', 'ALL', '*'].includes(norm)) {
          set.add(norm);
        }
      });
    }
    deals.forEach(d => {
      if (d.brandName) set.add(d.brandName.trim());
    });

    if (set.size === 0) {
      return [
        { key: 'ALL', label: 'Tất cả gian hàng' },
        { key: 'Kutieskin Mama', label: 'Kutieskin Mama' },
        { key: 'Royal Ausnz', label: 'Royal Ausnz' },
        { key: 'Bye Bye Blemish', label: 'Bye Bye Blemish' },
        { key: 'pHCare', label: 'pHCare (cần mã Ads)' },
        { key: 'EUPC', label: 'EUPC' },
        { key: 'Natural Care', label: 'Natural Care' },
        { key: 'Keyshu', label: 'Keyshu' },
        { key: 'Babe', label: 'Babe (Vượt Plan)' },
      ];
    }

    const items = Array.from(set).sort().map(b => ({ key: b, label: b }));
    return [{ key: 'ALL', label: 'Tất cả gian hàng' }, ...items];
  }, [currentUser, deals]);

  const filteredKocs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return localKocs.filter((koc) => {
      if (selectedKL !== 'ALL' && koc.salaryGrade !== selectedKL) return false;
      if (selectedSegment !== 'ALL' && koc.segment !== selectedSegment) return false;
      if (selectedKocCategory !== 'ALL' && koc.kocCategory !== selectedKocCategory) return false;
      if (selectedTepKenh !== 'ALL' && koc.tepKenh !== selectedTepKenh && koc.creatorCategory !== selectedTepKenh) return false;
      if (!q) return true;
      return (
        koc.stageName.toLowerCase().includes(q) ||
        koc.channelId.toLowerCase().includes(q) ||
        koc.niche.toLowerCase().includes(q) ||
        (koc.tepKenh ? koc.tepKenh.toLowerCase().includes(q) : false) ||
        (koc.kocCategory ? koc.kocCategory.toLowerCase().includes(q) : false) ||
        (koc.segment ? koc.segment.toLowerCase().includes(q) : false) ||
        (koc.phone || '').includes(searchTerm.trim())
      );
    });
  }, [localKocs, selectedKL, selectedSegment, selectedKocCategory, selectedTepKenh, searchTerm]);

  const dealsByPeriodBucket = useMemo(() => {
    const sampleByCode = new Map(MOCK_SAMPLE_SHIPMENTS.map(s => [s.dealCode, s]));
    const currentPaid: BookingDealItem[] = [];
    const allPaid: BookingDealItem[] = [];
    const focOnly: BookingDealItem[] = [];
    const allMerged: BookingDealItem[] = [];
    for (const rawDeal of deals) {
      const baseDeal = localDealOverrides[rawDeal.id] || rawDeal;
      const matchedSample = sampleByCode.get(baseDeal.dealCode);
      const deal: BookingDealItem = matchedSample
        ? {
            ...baseDeal,
            sampleCarrier: baseDeal.sampleCarrier || matchedSample.carrier,
            sampleTrackingCode: baseDeal.sampleTrackingCode || matchedSample.trackingCode,
            sampleSentDate: baseDeal.sampleSentDate || matchedSample.sentDate,
            sampleDeliveredDate: baseDeal.sampleDeliveredDate || matchedSample.deliveredDate,
            sampleRecipientPhone: baseDeal.sampleRecipientPhone || matchedSample.kocPhone,
            sampleShippingAddress: baseDeal.sampleShippingAddress || matchedSample.shippingAddress,
            sparkAdsCode: baseDeal.sparkAdsCode || matchedSample.sparkAdsCode,
            sparkAdsExpiryDays: baseDeal.sparkAdsExpiryDays || matchedSample.sparkAdsExpiryDays,
          }
        : baseDeal;
      allMerged.push(deal);
      const isPaid = (deal.totalValue || 0) > 0;
      if (isPaid) {
        allPaid.push(deal);
        const isOperationalCurrent = !deal.id.startsWith('deal-real-') && !deal.id.startsWith('deal-hist-');
        if (isOperationalCurrent || deal.bookingBatch === '2026/10') {
          currentPaid.push(deal);
        }
      } else {
        focOnly.push(deal);
      }
    }
    return {
      CURRENT_PAID: currentPaid,
      ALL_PAID: allPaid,
      FOC_ONLY: focOnly,
      ALL_ARCHIVE: allMerged,
    };
  }, [deals, localDealOverrides]);

  const baseScopedDeals = useMemo(() => {
    const sourceList = dealsByPeriodBucket[dealPeriodScope] || dealsByPeriodBucket.CURRENT_PAID;
    if (selectedBrandFilter === 'ALL' && selectedDealPicFilter === 'ALL') {
      return sourceList;
    }
    const shortSelectedStaff = selectedStaffName.split(' ').slice(-2).join(' ').toLowerCase();
    const lowerStaff = selectedStaffName.toLowerCase();
    return sourceList.filter((deal) => {
      if (selectedBrandFilter !== 'ALL' && deal.brandName !== selectedBrandFilter) return false;
      if (selectedDealPicFilter === 'SELECTED_STAFF') {
        const pic = (deal.bookingPic || deal.assignedStaff || '').toLowerCase();
        if (!pic.includes(lowerStaff) && !pic.includes(shortSelectedStaff)) {
          return false;
        }
      }
      return true;
    });
  }, [dealsByPeriodBucket, dealPeriodScope, selectedBrandFilter, selectedDealPicFilter, selectedStaffName]);

  const dealFilterCounts = useMemo(() => {
    let brandPending = 0;
    let brandApproved = 0;
    let brandRejected = 0;
    let winnerTop20 = 0;
    let samplePending = 0;
    let adsCodePending = 0;
    let advancePending = 0;
    let advancePaid = 0;
    let hasGmv = 0;
    let breakEven = 0;
    let paidCount = 0;
    let totalCost = 0;
    let totalGmv = 0;
    let top20Gmv = 0;
    const byStage: Record<PipelineStageKey, { count: number; cost: number; gmv: number; alertCount: number }> = {
      '1_PLAN_SOURCING': { count: 0, cost: 0, gmv: 0, alertCount: 0 },
      '2_DEAL_CONTRACT': { count: 0, cost: 0, gmv: 0, alertCount: 0 },
      '3_CONTENT_SCRIPT': { count: 0, cost: 0, gmv: 0, alertCount: 0 },
      '4_AIR_GROWTH': { count: 0, cost: 0, gmv: 0, alertCount: 0 },
      '5_SETTLEMENT': { count: 0, cost: 0, gmv: 0, alertCount: 0 },
    };

    for (const d of baseScopedDeals) {
      if (d.brandApprovalStatus === 'CHỜ_DUYỆT') brandPending++;
      else if (d.brandApprovalStatus === 'ĐÃ_DUYỆT') brandApproved++;
      else if (d.brandApprovalStatus === 'TỪ_CHỐI') brandRejected++;
      if (d.isWinnerTop20) {
        winnerTop20++;
        top20Gmv += d.gmv30 || 0;
      }
      if (d.sampleStatus !== 'ĐÃ_NHẬN') samplePending++;
      if (d.adsCodeStatus === 'CHƯA_CẤP') adsCodePending++;
      if ((d.gmv30 || 0) > 0) hasGmv++;
      if ((d.roi || 0) >= 1) breakEven++;
      if ((d.totalValue || 0) > 0) paidCount++;
      const hasAgreedAdvance = (d.totalValue || 0) > 0 && (d.advanceAmount || 0) > 0;
      const isAdvPaid = d.status === 'ADVANCE_PAID' || Boolean(d.larkAdvanceApprovalCode);
      if (hasAgreedAdvance && !isAdvPaid) advancePending++;
      if (isAdvPaid) advancePaid++;
      totalCost += bookingDealCost(d);
      totalGmv += d.gmv30 || 0;

      const stageKey = resolveDealPipelineStage(d);
      byStage[stageKey].count++;
      byStage[stageKey].cost += bookingDealCost(d);
      byStage[stageKey].gmv += d.gmv30 || 0;
      if (
        (stageKey === '1_PLAN_SOURCING' && d.brandApprovalStatus === 'CHỜ_DUYỆT') ||
        (stageKey === '2_DEAL_CONTRACT' && !d.larkAdvanceApprovalCode && (d.advanceAmount || 0) > 0) ||
        (stageKey === '3_CONTENT_SCRIPT' && d.sampleStatus !== 'ĐÃ_NHẬN') ||
        (stageKey === '4_AIR_GROWTH' && d.adsCodeStatus === 'CHƯA_CẤP') ||
        (stageKey === '5_SETTLEMENT' && (d.roi || 0) >= 1)
      ) {
        byStage[stageKey].alertCount++;
      }
    }
    return {
      all: baseScopedDeals.length,
      paidCount,
      totalCost,
      totalGmv,
      top20Gmv,
      brandPending,
      brandApproved,
      brandRejected,
      winnerTop20,
      samplePending,
      adsCodePending,
      advancePending,
      advancePaid,
      hasGmv,
      breakEven,
      byStage,
    };
  }, [baseScopedDeals]);

  const filteredDeals = useMemo(() => {
    const q = dealsSearch.trim().toLowerCase();
    return baseScopedDeals.filter((deal) => {
      if (selectedPipelineStage !== 'ALL' && resolveDealPipelineStage(deal) !== selectedPipelineStage) return false;
      if (dealsFilter === 'BRAND_PENDING' && deal.brandApprovalStatus !== 'CHỜ_DUYỆT') return false;
      if (dealsFilter === 'BRAND_APPROVED' && deal.brandApprovalStatus !== 'ĐÃ_DUYỆT') return false;
      if (dealsFilter === 'BRAND_REJECTED' && deal.brandApprovalStatus !== 'TỪ_CHỐI') return false;
      if (dealsFilter === 'WINNER_TOP20' && !deal.isWinnerTop20) return false;
      if (dealsFilter === 'HAS_GMV' && (deal.gmv30 || 0) <= 0) return false;
      if (dealsFilter === 'BREAK_EVEN' && (deal.roi || 0) < 1.0) return false;
      if (dealsFilter === 'OVERDUE_SLA' && !deal.isSlaWarning) return false;
      if (dealsFilter === 'SAMPLE_PENDING' && deal.sampleStatus === 'ĐÃ_NHẬN') return false;
      if (dealsFilter === 'ADS_CODE_PENDING' && deal.adsCodeStatus !== 'CHƯA_CẤP') return false;
      if (dealsFilter === 'ADVANCE_PENDING' && !((deal.totalValue || 0) > 0 && (deal.advanceAmount || 0) > 0 && !deal.larkAdvanceApprovalCode && deal.status !== 'ADVANCE_PAID')) return false;
      if (dealsFilter === 'ADVANCE_PAID' && !(deal.status === 'ADVANCE_PAID' || Boolean(deal.larkAdvanceApprovalCode))) return false;
      if (!q) return true;
      return (
        deal.dealCode.toLowerCase().includes(q) ||
        deal.kocStageName.toLowerCase().includes(q) ||
        deal.campaignTitle.toLowerCase().includes(q) ||
        (deal.storeName ? deal.storeName.toLowerCase().includes(q) : false) ||
        (deal.productName ? deal.productName.toLowerCase().includes(q) : false) ||
        (deal.brandName ? deal.brandName.toLowerCase().includes(q) : false) ||
        (deal.sampleTrackingCode ? deal.sampleTrackingCode.toLowerCase().includes(q) : false) ||
        (deal.sparkAdsCode ? deal.sparkAdsCode.toLowerCase().includes(q) : false)
      );
    });
  }, [baseScopedDeals, dealsSearch, dealsFilter, selectedPipelineStage]);

  const safeDealsPage = Math.min(dealsPage, Math.max(1, Math.ceil(filteredDeals.length / dealsPageSize)));
  const pagedDeals = useMemo(
    () => filteredDeals.slice((safeDealsPage - 1) * dealsPageSize, safeDealsPage * dealsPageSize),
    [filteredDeals, safeDealsPage, dealsPageSize]
  );

  // Lookup map cho 69 Gian hàng B2C (theo storeName và brandName)
  const storeCatalogLookup = useMemo(() => {
    const byStoreName = new Map<string, StorePortfolioItem>();
    const byBrandName = new Map<string, StorePortfolioItem[]>();
    for (const st of REAL_B2C_69_STORES) {
      byStoreName.set(st.storeName.trim().toLowerCase(), st);
      const bKey = st.brandName.trim().toLowerCase();
      const existing = byBrandName.get(bKey) || [];
      existing.push(st);
      byBrandName.set(bKey, existing);
    }
    return { byStoreName, byBrandName };
  }, []);

  // Đối soát Kế hoạch Gian hàng tổng thể theo bộ lọc đang chọn
  const storePlanOverview = useMemo(() => {
    const shortStaff = selectedStaffName.split(' ').slice(-2).join(' ').toLowerCase();
    const lowerStaff = selectedStaffName.toLowerCase();
    const scopedBaseStores = filterScopedStores(REAL_B2C_69_STORES, currentUser);

    const matchedStores = scopedBaseStores.filter(st => {
      if (selectedBrandFilter !== 'ALL' && st.brandName.toLowerCase() !== selectedBrandFilter.toLowerCase()) {
        return false;
      }
      if (selectedDealPicFilter === 'SELECTED_STAFF') {
        const picMatch = (st.primaryPic || st.assignedStaff || '').toLowerCase();
        const memberMatch = (st.assignedMembers || []).some(m => m.toLowerCase().includes(lowerStaff) || m.toLowerCase().includes(shortStaff));
        if (!picMatch.includes(lowerStaff) && !picMatch.includes(shortStaff) && !memberMatch) {
          return false;
        }
      }
      return true;
    });

    let planPaidVideos = 0;
    let planFocVideos = 0;
    let planBudgetNet = 0;
    let planBudgetGross = 0;
    for (const st of matchedStores) {
      planPaidVideos += st.targetPaidVideos || st.targetAffiliateContents || 0;
      planFocVideos += st.targetFocVideos || 0;
      planBudgetNet += st.budgetAffiliateNet || st.budgetNet || 0;
      planBudgetGross += st.budgetAffiliateGross || st.budgetGross || 0;
    }

    const airedCount =
      dealFilterCounts.byStage['4_AIR_GROWTH'].count +
      dealFilterCounts.byStage['5_SETTLEMENT'].count;

    const actualCost = dealFilterCounts.totalCost;
    const budgetDiff = planBudgetNet - actualCost;
    const isOverbudget = planBudgetNet > 0 && actualCost > planBudgetNet;
    const isUnbudgetedSpend = planBudgetNet === 0 && actualCost > 0;

    return {
      storeCount: matchedStores.length,
      planPaidVideos,
      planFocVideos,
      planBudgetNet,
      planBudgetGross,
      airedCount,
      actualCost,
      budgetDiff,
      isOverbudget,
      isUnbudgetedSpend,
    };
  }, [selectedBrandFilter, selectedDealPicFilter, selectedStaffName, dealFilterCounts, currentUser]);

  // Gom nhóm Deal theo từng Gian hàng kèm đối soát Hạn mức Net & Tiến độ 5 bước
  const storePipelineGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        storeKey: string;
        storeName: string;
        brandName: string;
        platform: string;
        primaryPic: string;
        bookingLeader?: string;
        hasBookingLeader: boolean;
        planPaidVideos: number;
        planFocVideos: number;
        planBudgetNet: number;
        planBudgetGross: number;
        deals: BookingDealItem[];
        paidDealsCount: number;
        focDealsCount: number;
        airedDealsCount: number;
        totalCost: number;
        totalGmv: number;
        breakEvenCount: number;
        stageCounts: Record<PipelineStageKey, number>;
      }
    >();

    for (const deal of filteredDeals) {
      const rawStore = (deal.storeName || '').trim();
      const rawBrand = (deal.brandName || 'Upbase').trim();
      let matchedStore = rawStore
        ? storeCatalogLookup.byStoreName.get(rawStore.toLowerCase())
        : undefined;
      if (!matchedStore && rawBrand) {
        const candidatesForBrand = storeCatalogLookup.byBrandName.get(rawBrand.toLowerCase());
        if (candidatesForBrand && candidatesForBrand.length > 0) {
          matchedStore =
            candidatesForBrand.find(c => c.platform === 'TikTok Shop') || candidatesForBrand[0];
        }
      }

      const groupKey = matchedStore
        ? matchedStore.storeName
        : rawStore || `${rawBrand}_TikTok`;

      let group = groupsMap.get(groupKey);
      if (!group) {
        group = {
          storeKey: groupKey,
          storeName: matchedStore ? matchedStore.storeName : groupKey,
          brandName: matchedStore ? matchedStore.brandName : rawBrand,
          platform: matchedStore ? matchedStore.platform : (groupKey.toLowerCase().includes('shopee') ? 'Shopee Mall' : 'TikTok Shop'),
          primaryPic: matchedStore && matchedStore.primaryPic && matchedStore.primaryPic !== 'Chưa phân công'
            ? matchedStore.primaryPic
            : (deal.bookingPic || deal.assignedStaff || 'Chưa phân công'),
          bookingLeader: matchedStore?.hasBookingLeader ? matchedStore.bookingLeader : undefined,
          hasBookingLeader: Boolean(matchedStore?.hasBookingLeader && matchedStore?.bookingLeader),
          planPaidVideos: matchedStore ? (matchedStore.targetPaidVideos || matchedStore.targetAffiliateContents || 0) : 0,
          planFocVideos: matchedStore ? (matchedStore.targetFocVideos || 0) : 0,
          planBudgetNet: matchedStore ? (matchedStore.budgetAffiliateNet || matchedStore.budgetNet || 0) : 0,
          planBudgetGross: matchedStore ? (matchedStore.budgetAffiliateGross || matchedStore.budgetGross || 0) : 0,
          deals: [],
          paidDealsCount: 0,
          focDealsCount: 0,
          airedDealsCount: 0,
          totalCost: 0,
          totalGmv: 0,
          breakEvenCount: 0,
          stageCounts: {
            '1_PLAN_SOURCING': 0,
            '2_DEAL_CONTRACT': 0,
            '3_CONTENT_SCRIPT': 0,
            '4_AIR_GROWTH': 0,
            '5_SETTLEMENT': 0,
          },
        };
        groupsMap.set(groupKey, group);
      }

      group.deals.push(deal);
      const isPaid = (deal.totalValue || 0) > 0;
      if (isPaid) group.paidDealsCount++;
      else group.focDealsCount++;
      group.totalCost += bookingDealCost(deal);
      group.totalGmv += deal.gmv30 || 0;
      if ((deal.roi || 0) >= 1) group.breakEvenCount++;

      const stKey = resolveDealPipelineStage(deal);
      group.stageCounts[stKey]++;
      if (stKey === '4_AIR_GROWTH' || stKey === '5_SETTLEMENT') {
        group.airedDealsCount++;
      }
    }

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (b.totalCost !== a.totalCost) return b.totalCost - a.totalCost;
      return b.deals.length - a.deals.length;
    });
  }, [filteredDeals, storeCatalogLookup]);

  const safeStoreGroupPage = Math.min(
    storeGroupPage,
    Math.max(1, Math.ceil(storePipelineGroups.length / storeGroupPageSize))
  );
  const pagedStoreGroups = useMemo(
    () =>
      storePipelineGroups.slice(
        (safeStoreGroupPage - 1) * storeGroupPageSize,
        safeStoreGroupPage * storeGroupPageSize
      ),
    [storePipelineGroups, safeStoreGroupPage, storeGroupPageSize]
  );

  const safeKocsPage = Math.min(kocsPage, Math.max(1, Math.ceil(filteredKocs.length / kocsPageSize)));
  const pagedKocs = useMemo(
    () => filteredKocs.slice((safeKocsPage - 1) * kocsPageSize, safeKocsPage * kocsPageSize),
    [filteredKocs, safeKocsPage, kocsPageSize]
  );

  // Tìm thông tin tiến độ cá nhân đồng bộ trực tiếp với allocation và plan items
  const currentStaffAllocation = (externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26).find(a => a.staffName.includes(selectedStaffName));
  const staffPlannedItems = localPlanItems.filter(i => i.staffName.includes(selectedStaffName));
  const targetVideosCount = currentStaffAllocation?.planVideos || 50;
  const targetBudgetAmount = currentStaffAllocation?.planBudget || 150000000;
  const plannedBudgetSum = staffPlannedItems.reduce((sum, i) => sum + (i.budgetEstimated || 0), 0);
  const airVideosDone = staffPlannedItems.filter(i => i.status === 'CONVERTED' || i.status === 'APPROVED').length;

  const personalStaffProgress = {
    staffName: selectedStaffName,
    planVideos: targetVideosCount,
    reportVideos: airVideosDone,
    airProgress: targetVideosCount > 0 ? Math.round((airVideosDone / targetVideosCount) * 100) : 0,
    planBudget: targetBudgetAmount,
    reportBudget: plannedBudgetSum,
    budgetProgress: targetBudgetAmount > 0 ? Math.round((plannedBudgetSum / targetBudgetAmount) * 100) : 0,
    isLagging: targetVideosCount > 0 ? (airVideosDone / targetVideosCount) < 0.5 : false
  };

  // Quick Brand Approval Action (One-click)
  const handleQuickBrandApproval = (deal: BookingDealItem, status: 'ĐÃ_DUYỆT' | 'TỪ_CHỐI', reason = '') => {
    const rejectReason = reason || 'Lệch định vị thương hiệu';

    const updatedDeal: BookingDealItem = {
      ...deal,
      currentStage: status === 'ĐÃ_DUYỆT' ? '2_DEAL_CONTRACT' : '1_PLAN_SOURCING',
      brandApprovalStatus: status,
      brandApprovalDate: getVietnamDateTimeShort(),
      brandRejectReason: status === 'TỪ_CHỐI' ? rejectReason : undefined,
      pipelineText: status === 'ĐÃ_DUYỆT' ? 'Đã tạo BO' : 'Brand từ chối',
      status: status === 'ĐÃ_DUYỆT' ? 'CONTRACT_GENERATED' : 'CANCELLED',
      statusLabel: status === 'ĐÃ_DUYỆT' ? 'Brand Đã Duyệt (Tạo HĐ & Cọc)' : `Brand Từ Chối (${rejectReason})`
    };

    applyDealUpdate(updatedDeal);
  };

  const handleOpenEditModal = (deal: BookingDealItem) => {
    setEditingDeal(deal);
    setEditForm({
      brandApprovalStatus: deal.brandApprovalStatus || 'ĐÃ_DUYỆT',
      brandRejectReason: deal.brandRejectReason || '',
      pipelineText: deal.pipelineText || 'Kịch bản',
      sampleStatus: deal.sampleStatus || 'ĐÃ_NHẬN',
      sampleCarrier: deal.sampleCarrier || 'GHN',
      sampleTrackingCode: deal.sampleTrackingCode || '',
      sampleDeliveredDate: deal.sampleDeliveredDate || '',
      adsCodeStatus: deal.adsCodeStatus || 'ĐÃ_NGHIỆM_THU',
      sparkAdsCode: deal.sparkAdsCode || '',
      sparkAdsExpiryDays: deal.sparkAdsExpiryDays || 30,
      tiktokVideoUrl: deal.tiktokVideoUrl || deal.videoUrl || '',
      viewsCount: deal.viewsCount || 0,
      gmv30: deal.gmv30 || 0,
      advanceAmount: deal.advanceAmount || 0,
      status: deal.status,
      statusLabel: deal.statusLabel,
      deliverables: deal.deliverables ? deal.deliverables.map(item => ({ ...item })) : [],
      rightsTerms: deal.rightsTerms ? deal.rightsTerms.map(rt => ({ ...rt })) : []
    });
  };

  const handleSaveDealUpdate = () => {
    if (!editingDeal) return;
    const newGmv = Number(editForm.gmv30) || 0;
    const droppedDeliverablesCost = editForm.deliverables
      .filter(item => item.lockStatus === 'DROPPED')
      .reduce((sum, item) => sum + (item.allocatedCostVnd || 0), 0);
    const droppedAddonsCost = editForm.rightsTerms
      .filter(rt => rt.acceptanceStatus === 'DROPPED')
      .reduce((sum, rt) => sum + (rt.allocatedCostVnd || 0), 0);
    const droppedCost = droppedDeliverablesCost + droppedAddonsCost;
    const netPositiveCost = (editingDeal.totalValue || 0) - droppedCost;
    const computedRoi = netPositiveCost > 0 ? Number((newGmv / netPositiveCost).toFixed(2)) : 0;
    const isWinner = newGmv >= 30000000;
    const isBreakEven = computedRoi >= 1.0;

    const hasVideoVerified =
      Boolean(editForm.tiktokVideoUrl.trim()) ||
      editForm.deliverables.some(d => d.wave === 0 && d.lockStatus === 'VERIFIED');
    const resolvedRightsTerms = editForm.rightsTerms.map(rt => {
      if (!hasVideoVerified) {
        return { ...rt, acceptanceStatus: 'LOCKED_BY_VIDEO' as const };
      }
      if (rt.acceptanceStatus === 'LOCKED_BY_VIDEO' || !rt.acceptanceStatus) {
        return { ...rt, acceptanceStatus: 'PENDING_ACCEPTANCE' as const };
      }
      return rt;
    });
    const allAddonsDone =
      resolvedRightsTerms.length === 0 ||
      resolvedRightsTerms.every(rt => rt.acceptanceStatus === 'VERIFIED' || rt.acceptanceStatus === 'DROPPED');
    const nextSequentialStage: BookingDealItem['sequentialAcceptanceStage'] = !hasVideoVerified
      ? '1_CHO_NGHIEM_THU_VIDEO'
      : allAddonsDone
        ? '3_DA_NGHIEM_THU_TOAN_DEAL'
        : '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC';

    let updatedStatusLabel = editForm.statusLabel;
    if (editForm.brandApprovalStatus === 'TỪ_CHỐI') {
      updatedStatusLabel = `Brand Từ Chối (${editForm.brandRejectReason || 'Lệch định vị'})`;
    } else if (editForm.status === 'VIDEO_VERIFIED') {
      updatedStatusLabel = editForm.adsCodeStatus === 'CHƯA_CẤP' 
        ? 'Đã Nghiệm Thu Link (Chờ Mã Ads)' 
        : 'Đã Nghiệm Thu Link & Mã Ads (Chờ Tất Toán)';
    } else if (editForm.status === 'FINAL_PAID') {
      updatedStatusLabel = 'Đã Tất Toán (Hoàn Tất HĐ)';
    } else if (editForm.status === 'VIDEO_SUBMITTED') {
      updatedStatusLabel = 'Video Đã Lên Sóng (Chờ Nghiệm Thu)';
    }

    const cleanSpark = editForm.sparkAdsCode.trim();
    const resolvedAdsStatus = cleanSpark && editForm.adsCodeStatus === 'CHƯA_CẤP'
      ? 'ĐÃ_NGHIỆM_THU'
      : editForm.adsCodeStatus;

    const updatedDeal: BookingDealItem = {
      ...editingDeal,
      brandApprovalStatus: editForm.brandApprovalStatus,
      brandRejectReason: editForm.brandApprovalStatus === 'TỪ_CHỐI' ? editForm.brandRejectReason : undefined,
      pipelineText: editForm.pipelineText,
      sampleStatus: editForm.sampleStatus,
      sampleCarrier: editForm.sampleCarrier,
      sampleTrackingCode: editForm.sampleTrackingCode.trim() || editingDeal.sampleTrackingCode,
      sampleDeliveredDate: editForm.sampleDeliveredDate.trim() || editingDeal.sampleDeliveredDate,
      adsCodeStatus: resolvedAdsStatus,
      sparkAdsCode: cleanSpark || editingDeal.sparkAdsCode,
      sparkAdsExpiryDays: editForm.sparkAdsExpiryDays,
      tiktokVideoUrl: editForm.tiktokVideoUrl,
      videoUrl: editForm.tiktokVideoUrl,
      viewsCount: Number(editForm.viewsCount) || 0,
      gmv30: newGmv,
      affiliateGmv: newGmv,
      roi: computedRoi,
      isWinnerTop20: isWinner,
      hasGmv: newGmv > 0,
      isBreakEven: isBreakEven,
      status: editForm.status,
      statusLabel: updatedStatusLabel,
      deliverables: editForm.deliverables.length > 0 ? editForm.deliverables : editingDeal.deliverables,
      rightsTerms: resolvedRightsTerms.length > 0 ? resolvedRightsTerms : editingDeal.rightsTerms,
      droppedCostVnd: droppedCost,
      sequentialAcceptanceStage: nextSequentialStage,
      advanceAmount: Number(editForm.advanceAmount) || 0,
      finalAmount: Math.max(0, (editingDeal.totalValue || 0) - (Number(editForm.advanceAmount) || 0) - droppedCost),
    };

    applyDealUpdate(updatedDeal);
    setEditingDeal(null);
  };

  const bookingDealsSubTabNode = useMemo(() => {
    const TEAM: Record<string, string> = { BOOKING: 'Booking', CONTENT: 'Content', BRAND: 'Brand', FINANCE: 'Kế toán' };
    const totalDealsInScope = dealFilterCounts.all;
    const top20SharePct = dealFilterCounts.totalGmv > 0
      ? ((dealFilterCounts.top20Gmv / dealFilterCounts.totalGmv) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
      : '0';

    const dealColumns = [
      {
        key: 'koc', header: 'KOC & Khung lương', width: 190, render: (d: BookingDealItem) => (
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-ink">{d.kocStageName}</span>
              <span className="text-2xs font-semibold text-accent">({d.salaryGrade})</span>
              {d.isWinnerTop20 && <span className="text-2xs text-warning font-semibold">· Top 20</span>}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5 truncate">
              @{String(d.kocChannelId || '').replace(/^@/, '')}
            </div>
          </div>
        ),
      },
      {
        key: 'campaign', header: 'Gian hàng & Sản phẩm', width: 225, render: (d: BookingDealItem) => (
          <div className="leading-tight min-w-0">
            <div className="text-xs font-medium text-ink truncate max-w-[215px]">
              {d.storeName || d.brandName || 'Upbase'} · <span className="font-normal text-ink-2">{d.productName || 'Sản phẩm'}</span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-code">{d.dealCode}</span>
              {d.bookingBatch && <span>· {d.bookingBatch}</span>}
              {d.dealType === 'SERVICE_ONLY' && (
                <span className="text-warning font-medium">· Mua thêm DV</span>
              )}
              {d.dealType === 'MULTI_PLATFORM_CONTENT' && (
                <span className="text-accent font-medium">· Đa kênh ({d.deliverables?.length || 1})</span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'lifecycle', header: 'Bước Pipeline & Phụ trách', width: 240, render: (d: BookingDealItem) => {
          const stKey = resolveDealPipelineStage(d);
          const st = PIPELINE_STAGE_MAP[stKey];
          return (
            <div className="grid gap-0.5 justify-items-start leading-tight">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Status tone={st.tone}>{st.shortLabel}</Status>
                {d.brandApprovalStatus === 'CHỜ_DUYỆT' && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" icon={Check} onClick={() => setApprovingDeal(d)}>Duyệt</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejectingDeal(d)}>Hủy</Button>
                  </div>
                )}
                {d.brandApprovalStatus === 'TỪ_CHỐI' && (
                  <Status tone="critical">Brand từ chối</Status>
                )}
              </div>
              <div className="flex items-center gap-1 text-2xs text-ink-3 flex-wrap">
                <span className="font-medium text-ink-2">{d.bookingPic || d.assignedStaff}</span>
                <span>·</span>
                <span className={d.isSlaWarning || d.isLocked7WorkingDays || d.isDnttOverdue10Am ? 'text-critical font-medium' : 'text-ink-3'}>
                  {d.isDnttOverdue10Am
                    ? 'Trễ ĐNTT'
                    : d.isLocked7WorkingDays
                    ? 'Quá 7 ngày'
                    : d.slaRemainingText || d.pipelineText || TEAM[d.holdingTeam || 'BOOKING']}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'delivery', header: 'Mẫu (B3) · Video & Mã Ads (B4)', width: 175, render: (d: BookingDealItem) => (
          <div className="grid gap-1 text-2xs leading-tight">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenSampleModal(d)}
                className={`inline-flex items-center gap-1 font-medium hover:underline ${
                  d.sampleStatus === 'ĐÃ_NHẬN'
                    ? 'text-positive'
                    : d.sampleStatus === 'ĐANG_GIAO'
                    ? 'text-accent'
                    : 'text-warning'
                }`}
                title="Cập nhật vận đơn gửi mẫu (Bước 3)"
              >
                <Truck className="w-3 h-3 shrink-0" />
                <span>
                  {d.sampleStatus === 'ĐÃ_NHẬN'
                    ? 'Đã nhận mẫu'
                    : d.sampleStatus === 'ĐANG_GIAO'
                    ? `Đang giao${d.sampleTrackingCode ? ` · ${d.sampleTrackingCode.slice(-6)}` : ''}`
                    : '+ Gửi mẫu'}
                </span>
              </button>
              {(d.tiktokVideoUrl || d.videoUrl) && (
                <a
                  href={d.tiktokVideoUrl || d.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-accent hover:underline font-medium"
                >
                  · Video<ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-1 min-w-0">
              {d.sparkAdsCode ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenGrowthHandoff(d)}
                    className="font-code text-2xs text-ink-2 hover:text-accent truncate max-w-[125px]"
                    title="Cập nhật hoặc bàn giao lại mã Spark Ads"
                  >
                    {d.sparkAdsCode}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(d.sparkAdsCode!);
                      setCopiedCodeId(d.id);
                      setTimeout(() => setCopiedCodeId(null), 1500);
                      onNotify?.(`Đã sao chép mã Spark Ads: ${d.sparkAdsCode}`, 'info');
                    }}
                    className="text-ink-3 hover:text-ink p-0.5 shrink-0"
                    title="Sao chép mã Spark Ads"
                  >
                    {copiedCodeId === d.id ? (
                      <Check className="w-2.5 h-2.5 text-positive" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenGrowthHandoff(d)}
                  className="text-ink-3 hover:text-accent font-medium"
                  title="Nhập mã Spark Ads (Bước 4)"
                >
                  + Cấp mã Ads
                </button>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'cost', header: 'Cát-xê & ĐNTT', align: 'right' as const, width: 140, render: (d: BookingDealItem) => {
          const hasAdvance = (d.advanceAmount || 0) > 0;
          const isAdvancePaid = d.status === 'ADVANCE_PAID' || Boolean(d.larkAdvanceApprovalCode);
          const isFinalPaid = d.status === 'FINAL_PAID' || Boolean(d.larkFinalApprovalCode);
          return (
            <div className="grid gap-0.5 justify-items-end tabular-nums leading-tight">
              <span className="text-ink font-semibold font-mono">{formatVndShort(d.totalValue)}</span>
              {hasAdvance && (
                <span className={`text-2xs font-mono font-medium ${isAdvancePaid ? 'text-positive' : 'text-warning'}`}>
                  {isAdvancePaid ? `Đã cọc ${formatVndShort(d.advanceAmount)}` : `Cọc ${formatVndShort(d.advanceAmount)}`}
                </span>
              )}
              <span className="text-2xs text-ink-3 font-code truncate max-w-[130px]" title={d.larkFinalApprovalCode || d.larkAdvanceApprovalCode || ''}>
                {isFinalPaid
                  ? `Tất toán (${d.larkFinalApprovalCode || 'Lark'})`
                  : d.larkAdvanceApprovalCode
                  ? `Mã cọc: ${d.larkAdvanceApprovalCode}`
                  : (d.totalValue || 0) === 0
                  ? 'Đơn FOC (0đ)'
                  : 'Chưa ĐNTT'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'gmv_roi', header: 'GMV & ROI', align: 'right' as const, width: 110, render: (d: BookingDealItem) => (
          <div className="grid gap-0.5 justify-items-end tabular-nums leading-tight">
            <span className="text-ink font-medium font-mono">{formatVndShort(d.gmv30)}</span>
            <span className={(d.roi || 0) >= 1 ? 'text-2xs font-semibold text-positive' : 'text-2xs text-ink-3'}>
              ROI {(d.roi || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x
            </span>
          </div>
        ),
      },
      {
        key: 'actions', header: <span className="sr-only">Thao tác</span>, align: 'right' as const, width: 215, render: (d: BookingDealItem) => {
          const stKey = resolveDealPipelineStage(d);
          const nextStage = PIPELINE_STAGE_MAP[stKey].nextStage;
          return (
            <div className="flex items-center justify-end gap-1">
              {nextStage && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={ArrowRight}
                  onClick={() => handleAdvanceDealStage(d, nextStage)}
                  title={PIPELINE_STAGE_MAP[stKey].nextActionLabel}
                >
                  B{PIPELINE_STAGE_MAP[nextStage].step}
                </Button>
              )}
              {d.brandOrientationPendingDays && d.brandOrientationPendingDays >= 3 ? (
                <Button size="sm" icon={Zap} onClick={() => setAutoAirDeal(d)} title="Brand quá 3 ngày chưa duyệt định hướng">Air</Button>
              ) : null}
              <Button size="sm" variant="ghost" icon={Truck} onClick={() => handleOpenSampleModal(d)} title="Vận đơn hàng mẫu (Bước 3)" />
              <Button size="sm" variant="ghost" icon={Share2} onClick={() => handleOpenGrowthHandoff(d)} title="Bàn giao mã Spark Ads (Bước 4)" />
              <Button size="sm" variant="ghost" icon={Edit3} onClick={() => handleOpenEditModal(d)} title="Chỉnh sửa deal" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectDealForContract?.(d, d.tiktokVideoUrl ? undefined : 'SOW')}
                title="Ký Phụ lục SOW / Xem hợp đồng của Deal"
              >
                {d.contractAppendixStatus === 'ĐÃ_KÝ' ? 'HĐ' : 'Ký SOW'}
              </Button>
              {(d.totalValue || 0) > 0 && (() => {
                const hasAdvance = (d.advanceAmount || 0) > 0;
                const isAdvancePaid = d.status === 'ADVANCE_PAID' || Boolean(d.larkAdvanceApprovalCode);
                const isFinalPaid = d.status === 'FINAL_PAID' || Boolean(d.larkFinalApprovalCode);
                const needsAdvance = hasAdvance && !isAdvancePaid;

                if (isFinalPaid) {
                  return (
                    <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-positive-soft text-positive border border-positive/30 shrink-0">
                      Đã chi
                    </span>
                  );
                }

                if (needsAdvance) {
                  return (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPaymentRequestMode('ADVANCE');
                        setPaymentRequestDeal(d);
                        setIsPaymentRequestOpen(true);
                      }}
                      title={`Tạo phiếu đề nghị tạm ứng ${formatVndShort(d.advanceAmount)} trên Lark`}
                    >
                      Tạm ứng
                    </Button>
                  );
                }

                return (
                  <Button
                    size="sm"
                    variant={isAdvancePaid ? 'primary' : 'secondary'}
                    onClick={() => {
                      setPaymentRequestMode(isAdvancePaid ? 'SETTLEMENT' : (d.tiktokVideoUrl ? 'SETTLEMENT' : 'ADVANCE'));
                      setPaymentRequestDeal(d);
                      setIsPaymentRequestOpen(true);
                    }}
                    title={isAdvancePaid ? 'Tạo phiếu tất toán phần còn lại sau tạm ứng' : 'Tạo phiếu đề nghị thanh toán'}
                  >
                    {isAdvancePaid ? 'Tất toán' : 'ĐNTT'}
                  </Button>
                );
              })()}
            </div>
          );
        },
      },
    ];

    return (
      <div className="space-y-4">
        {/* 1. KHUNG ĐỐI SOÁT HẠN MỨC KẾ HOẠCH GIAN HÀNG (STORE PLAN CONTEXT BAR) */}
        <StatRow>
          <Stat
            label={`Kế hoạch Gian hàng (${storePlanOverview.storeCount} gian)`}
            value={
              dealPeriodScope === 'FOC_ONLY'
                ? `${formatNumber(totalDealsInScope)} / ${formatNumber(Math.max(1, storePlanOverview.planFocVideos))} đơn FOC`
                : `${formatNumber(dealFilterCounts.paidCount)} / ${formatNumber(Math.max(1, storePlanOverview.planPaidVideos))} video có phí`
            }
            progress={{
              value: dealPeriodScope === 'FOC_ONLY' ? totalDealsInScope : dealFilterCounts.paidCount,
              max: Math.max(
                1,
                dealPeriodScope === 'FOC_ONLY'
                  ? storePlanOverview.planFocVideos
                  : storePlanOverview.planPaidVideos
              ),
              target: 0.8,
            }}
          />
          <Stat
            label={`Chi phí Deal / Hạn mức Order Net (${formatVndShort(storePlanOverview.planBudgetNet)})`}
            value={formatVndShort(dealFilterCounts.totalCost)}
            tone={
              storePlanOverview.isOverbudget || storePlanOverview.isUnbudgetedSpend
                ? 'critical'
                : undefined
            }
            progress={
              storePlanOverview.planBudgetNet > 0
                ? {
                    value: dealFilterCounts.totalCost,
                    max: storePlanOverview.planBudgetNet,
                    target: 1.0,
                  }
                : undefined
            }
          />
          <Stat
            label="Đã lên sóng (B4 + B5) & Có doanh thu"
            value={`${formatNumber(storePlanOverview.airedCount)} air · ${formatNumber(dealFilterCounts.hasGmv)} có GMV`}
            progress={{ value: dealFilterCounts.hasGmv, max: Math.max(1, totalDealsInScope), target: 0.5 }}
          />
          <Stat
            label="Tổng GMV 30d & Video hoàn vốn"
            value={`${formatVndShort(dealFilterCounts.totalGmv)} (${formatNumber(dealFilterCounts.breakEven)} hoàn vốn)`}
            progress={{ value: dealFilterCounts.breakEven, max: Math.max(1, totalDealsInScope), target: 0.3 }}
            tone="positive"
          />
        </StatRow>

        {/* Cảnh báo tài chính Kế hoạch Gian hàng & Nhóm Top 20% GMV */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
            {storePlanOverview.isUnbudgetedSpend ? (
              <Status tone="critical">
                Phát sinh chi {formatVndShort(storePlanOverview.actualCost)} khi Hạn mức Order Net = 0đ (Cần bổ sung phê duyệt)
              </Status>
            ) : storePlanOverview.isOverbudget ? (
              <Status tone="critical">
                Vượt hạn mức Order Net +{formatVndShort(Math.abs(storePlanOverview.budgetDiff))} (Trần Net: {formatVndShort(storePlanOverview.planBudgetNet)})
              </Status>
            ) : (
              <Status tone="positive">
                Trong hạn mức Order Net · Còn dư {formatVndShort(Math.max(0, storePlanOverview.budgetDiff))} (Gross Plan: {formatVndShort(storePlanOverview.planBudgetGross)})
              </Status>
            )}
            <span className="text-ink-3">·</span>
            <span>
              Top 20% video đóng góp <strong className="font-semibold text-ink">{top20SharePct}% GMV</strong> ({formatVndShort(dealFilterCounts.top20Gmv)} / {formatVndShort(dealFilterCounts.totalGmv)})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={Truck}
              onClick={() => setActiveSubTab('SAMPLE_ADS')}
            >
              Vận đơn mẫu &amp; Mã Ads ({dealFilterCounts.samplePending + dealFilterCounts.adsCodePending})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveSubTab('CANDIDATES')}
            >
              Sàng lọc ứng viên ({candidates.length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDealsFilter(dealsFilter === 'WINNER_TOP20' ? 'ALL' : 'WINNER_TOP20');
                setDealsPage(1);
                setStoreGroupPage(1);
              }}
            >
              {dealsFilter === 'WINNER_TOP20' ? 'Bỏ lọc Top GMV' : `Nhóm Top GMV (${dealFilterCounts.winnerTop20})`}
            </Button>
          </div>
        </div>

        {/* 2. THANH PHỄU PIPELINE 5 BƯỚC (INTERACTIVE 5-STAGE FUNNEL BAR) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {PIPELINE_STAGES.map((st) => {
            const stat = dealFilterCounts.byStage[st.key];
            const isSelected = selectedPipelineStage === st.key;
            const sharePct = totalDealsInScope > 0 ? Math.round((stat.count / totalDealsInScope) * 100) : 0;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => {
                  setSelectedPipelineStage(prev => (prev === st.key ? 'ALL' : st.key));
                  setDealsPage(1);
                  setStoreGroupPage(1);
                }}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent-soft/60 ring-1 ring-accent'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-3">
                    Bước {st.step} · {st.team}
                  </span>
                  <span className="text-2xs font-mono text-ink-3">{sharePct}%</span>
                </div>
                <div className="text-xs font-semibold text-ink mt-1 truncate">
                  {st.label}
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold text-ink tabular-nums">
                    {formatNumber(stat.count)} <span className="text-2xs font-normal text-ink-3">job</span>
                  </span>
                  <span className="text-xs font-semibold font-mono text-ink-2 tabular-nums">
                    {st.key === '5_SETTLEMENT' && stat.gmv > 0
                      ? `GMV ${formatVndShort(stat.gmv)}`
                      : formatVndShort(stat.cost)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-2xs">
                  {st.key === '1_PLAN_SOURCING' ? (
                    <span className={stat.alertCount > 0 ? 'text-warning font-medium' : 'text-ink-3'}>
                      {stat.alertCount > 0 ? `${stat.alertCount} chờ Brand duyệt` : `${candidates.length} ứng viên sàng lọc`}
                    </span>
                  ) : st.key === '2_DEAL_CONTRACT' ? (
                    <span className="text-ink-3">Soạn HĐ & Tạm ứng Lark</span>
                  ) : st.key === '3_CONTENT_SCRIPT' ? (
                    <span className={stat.alertCount > 0 ? 'text-warning font-medium' : 'text-ink-3'}>
                      {stat.alertCount > 0 ? `${stat.alertCount} chưa nhận mẫu` : 'Đã giao mẫu & duyệt kịch bản'}
                    </span>
                  ) : st.key === '4_AIR_GROWTH' ? (
                    <span className={stat.alertCount > 0 ? 'text-warning font-medium' : 'text-ink-3'}>
                      {stat.alertCount > 0 ? `${stat.alertCount} chờ cấp mã Ads` : 'Đã bàn giao mã Ads'}
                    </span>
                  ) : (
                    <span className="text-positive font-medium">
                      {stat.alertCount} video đạt hoàn vốn
                    </span>
                  )}
                  {isSelected && <span className="text-accent font-semibold">Đang lọc</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. KHUNG ĐIỀU KHIỂN PIPELINE & 3 CHẾ ĐỘ XEM (THEO GIAN HÀNG / KANBAN 5 CỘT / BẢNG CHI TIẾT) */}
        <Panel
          flush
          title={
            selectedPipelineStage === 'ALL'
              ? 'Pipeline Booking theo Kế hoạch Gian hàng'
              : `Pipeline Booking · ${PIPELINE_STAGE_MAP[selectedPipelineStage].label}`
          }
          actions={
            <div className="flex items-center gap-2">
              {selectedPipelineStage !== 'ALL' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedPipelineStage('ALL');
                    setDealsPage(1);
                    setStoreGroupPage(1);
                  }}
                >
                  Xem cả 5 bước
                </Button>
              )}
              <Segmented
                value={pipelineViewMode}
                onChange={(v) => setPipelineViewMode(v as 'BY_STORE' | 'KANBAN' | 'TABLE')}
                items={[
                  { key: 'BY_STORE', label: `Theo Gian hàng (${storePipelineGroups.length})` },
                  { key: 'KANBAN', label: 'Bảng cột 5 bước' },
                  { key: 'TABLE', label: `Bảng chi tiết (${filteredDeals.length})` },
                ]}
              />
            </div>
          }
        >
          <div className="px-4 py-3 border-b border-line">
            <FilterBar
              search={{
                value: dealsSearch,
                onChange: (v) => {
                  setDealsSearch(v);
                  setDealsPage(1);
                  setStoreGroupPage(1);
                },
                placeholder: 'Tìm tên gian hàng, mã deal, KOC, sản phẩm, chiến dịch',
              }}
              filters={
                <>
                  <Select
                    value={dealPeriodScope}
                    onChange={e => {
                      setDealPeriodScope(e.target.value as 'CURRENT_PAID' | 'ALL_PAID' | 'FOC_ONLY' | 'ALL_ARCHIVE');
                      setDealsPage(1);
                      setStoreGroupPage(1);
                    }}
                    className="w-full sm:w-auto sm:min-w-[210px]"
                    aria-label="Phạm vi kỳ & loại deal"
                  >
                    <option value="CURRENT_PAID">Kỳ hiện tại · Có phí (2026/10)</option>
                    <option value="ALL_PAID">Lịch sử HĐ có phí (Tất cả kỳ)</option>
                    <option value="FOC_ONLY">Đơn gửi mẫu FOC (0đ)</option>
                    <option value="ALL_ARCHIVE">Toàn bộ lịch sử ({formatNumber(deals.length)} deal)</option>
                  </Select>
                  <Select
                    value={selectedDealPicFilter}
                    onChange={e => {
                      setSelectedDealPicFilter(e.target.value);
                      setDealsPage(1);
                      setStoreGroupPage(1);
                    }}
                    className="w-full sm:w-auto sm:min-w-[170px]"
                    aria-label="Lọc theo PIC phụ trách"
                  >
                    <option value="ALL">Mọi chuyên viên PIC</option>
                    <option value="SELECTED_STAFF">Của {selectedStaffName}</option>
                  </Select>
                  <Select
                    value={selectedBrandFilter}
                    onChange={e => {
                      setSelectedBrandFilter(e.target.value);
                      setDealsPage(1);
                      setStoreGroupPage(1);
                    }}
                    className="w-full sm:w-auto sm:min-w-[180px]"
                    aria-label="Lọc theo gian hàng"
                  >
                    {brandsList.map(b => (
                      <option key={b.key} value={b.key}>
                        {b.key === 'ALL' ? 'Mọi gian hàng' : b.label}
                      </option>
                    ))}
                  </Select>
                </>
              }
              resultCount={filteredDeals.length}
              chips={
                <Chips
                  value={dealsFilter}
                  onChange={(v) => {
                    setDealsFilter(v);
                    setDealsPage(1);
                    setStoreGroupPage(1);
                  }}
                  items={[
                    { key: 'ALL', label: 'Tất cả', count: dealFilterCounts.all },
                    { key: 'BRAND_PENDING', label: 'Chờ Brand duyệt', count: dealFilterCounts.brandPending },
                    { key: 'BRAND_APPROVED', label: 'Brand đã duyệt', count: dealFilterCounts.brandApproved },
                    { key: 'BRAND_REJECTED', label: 'Brand từ chối', count: dealFilterCounts.brandRejected },
                    { key: 'SAMPLE_PENDING', label: 'Chờ gửi/nhận mẫu', count: dealFilterCounts.samplePending },
                    { key: 'ADS_CODE_PENDING', label: 'Chưa mã Ads', count: dealFilterCounts.adsCodePending },
                    { key: 'ADVANCE_PENDING', label: 'Chờ tạm ứng', count: dealFilterCounts.advancePending },
                    { key: 'ADVANCE_PAID', label: 'Đã tạm ứng', count: dealFilterCounts.advancePaid },
                    { key: 'WINNER_TOP20', label: 'Top GMV', count: dealFilterCounts.winnerTop20 },
                    { key: 'HAS_GMV', label: 'Có GMV', count: dealFilterCounts.hasGmv },
                    { key: 'BREAK_EVEN', label: 'Hoàn vốn', count: dealFilterCounts.breakEven },
                  ]}
                />
              }
            />
          </div>

          {/* CHẾ ĐỘ 1: HIỂN THỊ PIPELINE GOM THEO KẾ HOẠCH TỪNG GIAN HÀNG */}
          {pipelineViewMode === 'BY_STORE' && (
            <div className="divide-y divide-line">
              {pagedStoreGroups.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="Không có gian hàng hoặc booking phù hợp bộ lọc" />
                </div>
              ) : (
                pagedStoreGroups.map((group) => {
                  const isCollapsed = Boolean(collapsedStores[group.storeKey]);
                  const isOverbudget = group.planBudgetNet > 0 && group.totalCost > group.planBudgetNet;
                  const isUnbudgeted = group.planBudgetNet === 0 && group.totalCost > 0;
                  const targetVideos = dealPeriodScope === 'FOC_ONLY' ? group.planFocVideos : group.planPaidVideos;
                  const actualVideos = dealPeriodScope === 'FOC_ONLY' ? group.focDealsCount : group.paidDealsCount;
                  const previewDeals = group.deals.slice(0, 8);

                  return (
                    <div key={group.storeKey} className="bg-surface">
                      {/* Thanh tiêu đề Kế hoạch Gian hàng & Tiến độ 5 bước */}
                      <div className="px-4 py-3 bg-sunken/40 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedStores(prev => ({
                                ...prev,
                                [group.storeKey]: !prev[group.storeKey],
                              }))
                            }
                            className="p-1 rounded hover:bg-line text-ink-2"
                            aria-label="Thu gọn hoặc mở rộng gian hàng"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-ink">
                                {group.storeName}
                              </span>
                              <Status tone={group.platform.includes('TikTok') ? 'info' : 'neutral'}>
                                {group.platform}
                              </Status>
                              {isUnbudgeted ? (
                                <Status tone="critical">Phát sinh chi chưa có hạn mức Net (0đ)</Status>
                              ) : isOverbudget ? (
                                <Status tone="critical">
                                  Vượt trần Net +{formatVndShort(group.totalCost - group.planBudgetNet)}
                                </Status>
                              ) : group.planBudgetNet > 0 ? (
                                <Status tone="positive">
                                  Trong hạn mức Net (Còn {formatVndShort(Math.max(0, group.planBudgetNet - group.totalCost))})
                                </Status>
                              ) : (
                                <Status tone="neutral">Đơn FOC / 0đ</Status>
                              )}
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                Nhãn hàng: <strong className="text-ink-2">{group.brandName}</strong>
                              </span>
                              <span>·</span>
                              <span>
                                PIC: <strong className="text-ink-2">{group.primaryPic}</strong>
                              </span>
                              <span>·</span>
                              <span>
                                {group.hasBookingLeader && group.bookingLeader
                                  ? `Leader: ${group.bookingLeader}`
                                  : 'Không có leader (Trình trực tiếp GĐ Marketing)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Chỉ số Lấp đầy Kế hoạch Gian hàng & Phễu 5 bước của riêng Gian hàng */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1">
                            {PIPELINE_STAGES.map(st => {
                              const c = group.stageCounts[st.key];
                              return (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={() =>
                                    setSelectedPipelineStage(prev => (prev === st.key ? 'ALL' : st.key))
                                  }
                                  className={`px-2 py-1 rounded text-2xs font-medium border transition-colors ${
                                    c > 0
                                      ? 'border-line-strong bg-surface text-ink hover:border-accent'
                                      : 'border-line bg-sunken/40 text-ink-3'
                                  }`}
                                  title={`${st.label}: ${c} job`}
                                >
                                  B{st.step}: <strong className="tabular-nums">{c}</strong>
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-left sm:text-right text-xs leading-tight tabular-nums border-t sm:border-t-0 sm:border-l border-line pt-2 sm:pt-0 pl-0 sm:pl-3 w-full sm:w-auto">
                            <div>
                              <span className="text-ink-3">Video: </span>
                              <strong className="text-ink">
                                {formatNumber(actualVideos)}
                                {targetVideos > 0 ? `/${formatNumber(targetVideos)}` : ''}
                              </strong>
                              <span className="text-ink-3"> ({group.airedDealsCount} đã air)</span>
                            </div>
                            <div className="mt-0.5">
                              <span className="text-ink-3">Chi Net: </span>
                              <strong className={isOverbudget || isUnbudgeted ? 'text-critical font-mono' : 'text-ink font-mono'}>
                                {formatVndShort(group.totalCost)}
                              </strong>
                              {group.planBudgetNet > 0 && (
                                <span className="text-ink-3 font-mono"> / {formatVndShort(group.planBudgetNet)}</span>
                              )}
                              {group.totalGmv > 0 && (
                                <span className="text-positive font-mono ml-2">
                                  · GMV {formatVndShort(group.totalGmv)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Danh sách Deal thuộc Gian hàng */}
                      {!isCollapsed && (
                        <div>
                          <DataTable
                            rows={previewDeals}
                            rowKey={d => d.id}
                            stickyLast
                            columns={dealColumns}
                          />
                          {group.deals.length > previewDeals.length && (
                            <div className="px-4 py-2 bg-sunken/20 border-t border-line flex items-center justify-between text-xs text-ink-2">
                              <span>
                                Đang hiển thị {previewDeals.length} / {formatNumber(group.deals.length)} booking của gian hàng <strong>{group.storeName}</strong>
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedBrandFilter(group.brandName);
                                  setPipelineViewMode('TABLE');
                                  setDealsPage(1);
                                }}
                              >
                                Xem toàn bộ {formatNumber(group.deals.length)} booking của {group.brandName}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {storePipelineGroups.length > storeGroupPageSize && (
                <Pagination
                  page={safeStoreGroupPage}
                  pageSize={storeGroupPageSize}
                  total={storePipelineGroups.length}
                  onPageChange={setStoreGroupPage}
                  onPageSizeChange={(n) => {
                    setStoreGroupPageSize(n);
                    setStoreGroupPage(1);
                  }}
                />
              )}
            </div>
          )}

          {/* CHẾ ĐỘ 2: BẢNG CỘT KANBAN 5 BƯỚC PIPELINE */}
          {pipelineViewMode === 'KANBAN' && (
            <div className="p-3 sm:p-4 overflow-x-auto">
              <div className="flex md:grid md:grid-cols-5 gap-3 min-w-[1050px]">
                {PIPELINE_STAGES.map((st) => {
                  const stageDeals = filteredDeals.filter(d => resolveDealPipelineStage(d) === st.key);
                  const visibleCards = stageDeals.slice(0, kanbanCardLimit);
                  const stageTotalCost = stageDeals.reduce((sum, d) => sum + bookingDealCost(d), 0);

                  return (
                    <div
                      key={st.key}
                      className="rounded-xl border border-line bg-sunken/30 flex flex-col max-h-[680px] w-[260px] shrink-0 md:w-auto md:shrink"
                    >
                      <div className="p-3 border-b border-line bg-surface rounded-t-xl flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-ink truncate">
                            {st.shortLabel}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {st.team} · <span className="font-mono">{formatVndShort(stageTotalCost)}</span>
                          </div>
                        </div>
                        <Status tone={st.tone}>{stageDeals.length}</Status>
                      </div>

                      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                        {visibleCards.length === 0 ? (
                          <div className="py-8 text-center text-xs text-ink-3">
                            Không có job ở bước này
                          </div>
                        ) : (
                          visibleCards.map((d) => (
                            <div
                              key={d.id}
                              className="rounded-lg border border-line bg-surface p-2.5 space-y-2 shadow-2xs hover:border-line-strong transition-colors"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-ink truncate">
                                    {d.kocStageName} <span className="text-2xs text-accent">({d.salaryGrade})</span>
                                  </div>
                                  <div className="text-2xs text-ink-3 truncate">
                                    {d.storeName || d.brandName} · <span className="font-code">{d.dealCode}</span>
                                  </div>
                                </div>
                                {d.isWinnerTop20 && (
                                  <Status tone="warning">Top 20</Status>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-2xs text-ink-2 tabular-nums">
                                <span>PIC: <strong>{d.bookingPic || d.assignedStaff}</strong></span>
                                <span className="font-semibold font-mono text-ink">{formatVndShort(d.totalValue)}</span>
                              </div>

                              <div className="flex items-center justify-between gap-1 text-2xs px-2 py-1 rounded bg-sunken/60">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSampleModal(d)}
                                  className={`inline-flex items-center gap-1 font-medium hover:underline ${
                                    d.sampleStatus === 'ĐÃ_NHẬN'
                                      ? 'text-positive'
                                      : d.sampleStatus === 'ĐANG_GIAO'
                                      ? 'text-accent'
                                      : 'text-warning'
                                  }`}
                                  title="Cập nhật vận đơn hàng mẫu (Bước 3)"
                                >
                                  <Truck className="w-2.5 h-2.5" />
                                  <span>
                                    {d.sampleStatus === 'ĐÃ_NHẬN'
                                      ? 'Đã nhận mẫu'
                                      : d.sampleStatus === 'ĐANG_GIAO'
                                      ? 'Đang giao mẫu'
                                      : '+ Gửi mẫu'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGrowthHandoff(d)}
                                  className={`font-code hover:underline truncate max-w-[100px] ${
                                    d.sparkAdsCode ? 'text-ink-2 font-medium' : 'text-ink-3'
                                  }`}
                                  title="Cập nhật & bàn giao mã Spark Ads (Bước 4)"
                                >
                                  {d.sparkAdsCode || '+ Mã Ads'}
                                </button>
                              </div>

                              {(d.gmv30 || 0) > 0 && (
                                <div className="flex items-center justify-between text-2xs px-2 py-1 rounded bg-sunken">
                                  <span className="text-ink-2 font-mono">GMV: {formatVndShort(d.gmv30)}</span>
                                  <span className={(d.roi || 0) >= 1 ? 'text-positive font-semibold' : 'text-ink-3'}>
                                    ROI {(d.roi || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x
                                  </span>
                                </div>
                              )}

                              <div className="pt-1 border-t border-line flex items-center justify-between gap-1 flex-wrap">
                                {st.key === '1_PLAN_SOURCING' && d.brandApprovalStatus === 'CHỜ_DUYỆT' ? (
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" icon={Check} onClick={() => setApprovingDeal(d)}>Duyệt</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setRejectingDeal(d)}>Hủy</Button>
                                  </div>
                                ) : st.nextStage ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={ArrowRight}
                                    onClick={() => handleAdvanceDealStage(d, st.nextStage!)}
                                  >
                                    {st.nextActionLabel}
                                  </Button>
                                ) : (
                                  <span className="text-2xs text-positive font-medium">Hoàn tất</span>
                                )}

                                <div className="flex items-center gap-1">
                                  {(st.key === '2_DEAL_CONTRACT' || st.key === '3_CONTENT_SCRIPT') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      icon={Truck}
                                      onClick={() => handleOpenSampleModal(d)}
                                      title="Cập nhật vận đơn mẫu"
                                    />
                                  )}
                                  {(st.key === '3_CONTENT_SCRIPT' || st.key === '4_AIR_GROWTH') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      icon={Share2}
                                      onClick={() => handleOpenGrowthHandoff(d)}
                                      title="Bàn giao mã Ads"
                                    />
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={Edit3}
                                    onClick={() => handleOpenEditModal(d)}
                                    title="Chỉnh sửa"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onSelectDealForContract?.(d, d.tiktokVideoUrl ? undefined : 'SOW')}
                                    title="Ký Phụ lục SOW / Xem hợp đồng của Deal"
                                  >
                                    {d.contractAppendixStatus === 'ĐÃ_KÝ' ? 'HĐ' : 'Ký SOW'}
                                  </Button>
                                  {(d.totalValue || 0) > 0 && (() => {
                                    const hasAdvance = (d.advanceAmount || 0) > 0;
                                    const isAdvancePaid = d.status === 'ADVANCE_PAID' || Boolean(d.larkAdvanceApprovalCode);
                                    const isFinalPaid = d.status === 'FINAL_PAID' || Boolean(d.larkFinalApprovalCode);
                                    const needsAdvance = hasAdvance && !isAdvancePaid;

                                    if (isFinalPaid) {
                                      return (
                                        <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-positive-soft text-positive border border-positive/30 shrink-0">
                                          Đã chi
                                        </span>
                                      );
                                    }

                                    if (needsAdvance) {
                                      return (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => {
                                            setPaymentRequestMode('ADVANCE');
                                            setPaymentRequestDeal(d);
                                            setIsPaymentRequestOpen(true);
                                          }}
                                          title={`Tạo phiếu đề nghị tạm ứng ${formatVndShort(d.advanceAmount)}`}
                                        >
                                          Tạm ứng
                                        </Button>
                                      );
                                    }

                                    return (
                                      <Button
                                        size="sm"
                                        variant={isAdvancePaid ? 'primary' : 'secondary'}
                                        onClick={() => {
                                          setPaymentRequestMode(isAdvancePaid ? 'SETTLEMENT' : (d.tiktokVideoUrl ? 'SETTLEMENT' : 'ADVANCE'));
                                          setPaymentRequestDeal(d);
                                          setIsPaymentRequestOpen(true);
                                        }}
                                        title={isAdvancePaid ? 'Tất toán Deal' : 'Đề nghị thanh toán'}
                                      >
                                        {isAdvancePaid ? 'Tất toán' : 'ĐNTT'}
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        {stageDeals.length > visibleCards.length && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full justify-center"
                            onClick={() => setKanbanCardLimit(prev => prev + 15)}
                          >
                            Xem thêm ({stageDeals.length - visibleCards.length} job)
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ 3: BẢNG DỮ LIỆU CHI TIẾT */}
          {pipelineViewMode === 'TABLE' && (
            <>
              <DataTable
                rows={pagedDeals}
                rowKey={d => d.id}
                stickyLast
                empty={<EmptyState title="Không có job phù hợp" />}
                columns={dealColumns}
              />
              <Pagination
                page={safeDealsPage}
                pageSize={dealsPageSize}
                total={filteredDeals.length}
                onPageChange={setDealsPage}
                onPageSizeChange={(n) => {
                  setDealsPageSize(n);
                  setDealsPage(1);
                }}
              />
            </>
          )}
        </Panel>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dealFilterCounts,
    storePlanOverview,
    dealPeriodScope,
    dealsSearch,
    deals,
    selectedDealPicFilter,
    selectedStaffName,
    selectedBrandFilter,
    brandsList,
    filteredDeals,
    dealsFilter,
    pagedDeals,
    safeDealsPage,
    dealsPageSize,
    pipelineViewMode,
    selectedPipelineStage,
    storePipelineGroups,
    pagedStoreGroups,
    safeStoreGroupPage,
    storeGroupPageSize,
    collapsedStores,
    kanbanCardLimit,
    candidates,
    onSelectDealForContract,
  ]);

  const kocDirectorySubTabNode = useMemo(() => (
    <Panel flush title="Danh bạ KOC">
      <div className="px-4 py-3 border-b border-line">
        <FilterBar
          search={{ value: searchTerm, onChange: (v) => { setSearchTerm(v); setKocsPage(1); }, placeholder: 'Tìm tên, kênh, ngành hàng, số điện thoại' }}
          resultCount={filteredKocs.length}
          filters={
            <>
              <Select value={selectedKL} onChange={e => { setSelectedKL(e.target.value); setKocsPage(1); }} className="w-auto" aria-label="Khung lương">
                {salaryGrades.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi khung lương' : o.label}</option>)}
              </Select>
              <Select value={selectedSegment} onChange={e => { setSelectedSegment(e.target.value); setKocsPage(1); }} className="w-auto" aria-label="Phân nhóm creator">
                {creatorSegments.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi phân nhóm' : o.label}</option>)}
              </Select>
              <Select value={selectedKocCategory} onChange={e => { setSelectedKocCategory(e.target.value); setKocsPage(1); }} className="w-auto" aria-label="Ngành hàng">
                {kocCategories.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi ngành hàng' : o.label}</option>)}
              </Select>
              <Select value={selectedTepKenh} onChange={e => { setSelectedTepKenh(e.target.value); setKocsPage(1); }} className="w-auto" aria-label="Tệp kênh">
                {tepKenhList.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi tệp kênh' : o.label}</option>)}
              </Select>
            </>
          }
        />
      </div>
      <DataTable
        rows={pagedKocs}
        rowKey={k => k.id}
        stickyLast
        onRowClick={k => setInspectedKoc(k)}
        empty={<EmptyState title="Không tìm thấy KOC" action={<Button size="sm" icon={UserPlus} onClick={() => setIsCreateKocOpen(true)}>Thêm KOC</Button>} />}
        columns={[
          {
            key: 'koc_grade', header: 'KOC & Khung lương', width: 250, render: k => (
              <div className="flex items-start gap-2.5">
                <Avatar name={k.stageName} size={28} />
                <div className="leading-tight min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-ink">{k.stageName}</span>
                    {k.isWinnerTop20 && <span className="text-2xs text-warning font-semibold">· Winner</span>}
                    <span className="text-2xs font-semibold text-accent">({k.salaryGrade})</span>
                  </div>
                  <div className="text-2xs text-ink-3 mt-0.5">{k.channelId} · {k.phone && k.phone.trim().length > 4 ? `****${k.phone.trim().slice(-4)}` : k.phone}</div>
                  <div className="text-2xs text-ink-3 mt-0.5">{k.segment || 'Massive Creator'} · {k.location || 'Hà Nội'}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'audience', header: 'Tệp kênh & Khán giả', width: 200, render: k => (
              <div className="leading-tight">
                <div className="font-medium text-ink">{k.tepKenh || k.creatorCategory || 'Review Nữ'}</div>
                <div className="text-2xs text-ink-3 mt-0.5">{k.kocCategory || 'Personal care'} · nữ {k.femaleRatio ?? 85}%</div>
                <div className="text-2xs text-ink-2 mt-0.5 tabular-nums font-medium">{formatNumber(k.followers)} follower</div>
              </div>
            ),
          },
          {
            key: 'rate_history', header: 'Báo giá & Lịch sử hiệu quả', align: 'right', width: 170, render: k => {
              const perf = calculateKocPerformanceStats(deals, k);
              return (
                <div className="grid gap-0.5 justify-items-end tabular-nums leading-tight">
                  <span className="font-semibold text-ink">{formatVnd(k.rateCardVideo)}</span>
                  <span className="text-2xs text-ink-3">
                    GMV: {perf.totalDeals > 0 ? formatVndShort(perf.totalGmv) : '—'}
                  </span>
                  <span className={perf.totalDeals === 0 ? 'text-2xs text-ink-3' : perf.overallRoi >= 1 ? 'text-2xs font-semibold text-positive' : 'text-2xs text-warning'}>
                    {perf.totalDeals > 0 ? `ROI ${perf.overallRoi.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}` : 'Chưa có deal'}
                  </span>
                </div>
              );
            },
          },
          {
            key: 'pic', header: 'Phụ trách', width: 130, render: k => (
              <div className="leading-tight">
                {k.bookingPic ? (
                  <Person name={k.bookingPic} size={20} />
                ) : (
                  <span className="text-xs text-ink-3">Chưa phân bổ</span>
                )}
                <div className="text-2xs text-ink-3 mt-0.5">{k.statusKoc || 'Sẵn sàng'}</div>
              </div>
            ),
          },
          {
            key: 'actions', header: <span className="sr-only">Thao tác</span>, align: 'right', width: 110, render: k => (
              <div onClick={e => e.stopPropagation()}>
                <Button size="sm" onClick={() => onOpenQuickBookWithKoc(k)}>Tạo booking</Button>
              </div>
            ),
          },
        ]}
      />
      <Pagination
        page={safeKocsPage}
        pageSize={kocsPageSize}
        total={filteredKocs.length}
        onPageChange={setKocsPage}
        onPageSizeChange={(n) => { setKocsPageSize(n); setKocsPage(1); }}
      />
    </Panel>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [
    searchTerm,
    filteredKocs.length,
    selectedKL,
    selectedSegment,
    selectedKocCategory,
    selectedTepKenh,
    pagedKocs,
    safeKocsPage,
    kocsPageSize,
    onOpenQuickBookWithKoc,
  ]);

  return (
    <div className="space-y-6">
      {onOpenQuickBook && (
        <PageActions>
          <Button size="sm" variant="primary" icon={Plus} onClick={onOpenQuickBook}>Tạo booking</Button>
        </PageActions>
      )}

      {/* Tiến độ cá nhân. Tab "Kế hoạch của tôi" đã có các ô chỉ số này nên chỉ giữ ô chọn người (§7 quy tắc 9) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
        {currentUser?.role !== 'BOOKING_MEMBER' ? (
          <label className="inline-flex items-center gap-2">
            <span className="text-ink-3">Xem kế hoạch của</span>
            <select
              value={selectedStaffName}
              onChange={(e) => setSelectedStaffName(e.target.value)}
              className="h-8 px-2 rounded-md border border-line-strong bg-surface text-ink font-medium focus:outline-none"
            >
              {staffAllocationList.map(a => (
                <option key={a.id} value={a.staffName}>{a.staffName}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="font-medium text-ink">{selectedStaffName}</span>
        )}
        {activeSubTab !== 'MY_PLAN' && (
          <>
            <span>
              Air <strong className="font-semibold text-ink tabular-nums">{personalStaffProgress.reportVideos}/{personalStaffProgress.planVideos}</strong>
              <span className="text-ink-3"> · {personalStaffProgress.airProgress}%</span>
            </span>
            <span>
              Ngân sách <strong className="font-semibold text-ink tabular-nums">{formatVndShort(personalStaffProgress.reportBudget)} / {formatVndShort(personalStaffProgress.planBudget)}</strong>
              <span className="text-ink-3"> · {personalStaffProgress.budgetProgress}%</span>
            </span>
            {personalStaffProgress.isLagging || personalStaffProgress.airProgress < 50 ? (
              <Status tone="critical">Air dưới 50%</Status>
            ) : (
              <Status tone="positive">Đúng tiến độ</Status>
            )}
          </>
        )}
      </div>

      {/* Tab và thao tác */}
      <Tabs
        value={activeSubTab}
        onChange={setActiveSubTab}
        items={[
          { key: 'BOOKING_DEALS', label: 'Pipeline Booking', count: dealFilterCounts.all },
          { key: 'SAMPLE_ADS', label: 'Hàng mẫu & Mã Ads', count: dealFilterCounts.samplePending + dealFilterCounts.adsCodePending },
          { key: 'MY_PLAN', label: 'Kế hoạch cá nhân' },
          { key: 'CANDIDATES', label: 'Sàng lọc KOC', count: candidates.length },
          { key: 'KOC_DIRECTORY', label: 'Danh bạ KOC', count: localKocs.length },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Send}
              onClick={() => {
                setPaymentRequestDeal(null);
                setPaymentRequestMode('SETTLEMENT');
                setIsPaymentRequestOpen(true);
              }}
            >
              Tạo ĐNTT Lark
            </Button>
            <Button
              variant="secondary"
              icon={Video}
              onClick={() => {
                setInspectorDeal(null);
                setInspectorInitialUrl('');
                setIsVideoInspectorOpen(true);
              }}
            >
              Nghiệm thu video
            </Button>
            <ActionMenu
              items={[
                { label: 'Thêm KOC', icon: UserPlus, onSelect: () => setIsCreateKocOpen(true) },
                { label: 'Tạo phiếu tạm ứng Lark', icon: Send, onSelect: () => { setPaymentRequestDeal(null); setPaymentRequestMode('ADVANCE'); setIsPaymentRequestOpen(true); } },
                ...(onOpenImport ? [{ label: 'Nhập Excel', icon: Upload, onSelect: onOpenImport }] : []),
                ...(onOpenInputPlan ? [{ label: 'Phân rã kế hoạch', icon: Calculator, onSelect: onOpenInputPlan }] : []),
              ]}
            />
          </>
        }
      />

      {/* ========================================================================= */}
      {/* SUB-TAB 0: MY DETAILED PLAN WORKSPACE (NHÂN VIÊN LẬP VÀ TRIỂN KHAI PLAN) */}
      {/* ========================================================================= */}
      {visitedSubTabs.MY_PLAN && (
        <div className={activeSubTab === 'MY_PLAN' ? 'block' : 'hidden'}>
          <MyPlanWorkspace
            currentStaffName={selectedStaffName}
            allocation={(externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26).find(a => a.staffName.includes(selectedStaffName)) || (externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26)[0]}
            planItems={localPlanItems}
            kocs={localKocs}
            onAddPlanItem={(newItem) => {
              const created = {
                ...newItem,
                id: `plan-item-${Date.now()}`,
                updatedAt: getVietnamDateTimeShort()
              };
              setLocalPlanItems(prev => [created, ...prev]);
              if (externalOnAddPlanItem) externalOnAddPlanItem(created);
            }}
            onUpdatePlanItem={(updated) => {
              setLocalPlanItems(prev => prev.map(i => i.id === updated.id ? updated : i));
              if (externalOnUpdatePlanItem) externalOnUpdatePlanItem(updated);
            }}
            onDeletePlanItem={(itemId) => {
              setLocalPlanItems(prev => prev.filter(i => i.id !== itemId));
              if (externalOnDeletePlanItem) externalOnDeletePlanItem(itemId);
            }}
            onSubmitPlanToLead={(sName) => {
              setLocalPlanItems(prev => prev.map(i => i.staffName === sName && i.status === 'DRAFT' ? {
                ...i,
                status: 'SUBMITTED',
                leadNotes: 'Đã gửi trình duyệt lên Trưởng phòng'
              } : i));
              if (externalOnSubmitPlanToLead) externalOnSubmitPlanToLead(sName);
            }}
            onConvertItemToDeal={(item) => {
              const newCode = `BO26_${Date.now().toString().slice(-6)}`;
              const updated = { ...item, status: 'CONVERTED' as const, dealCode: newCode };
              setLocalPlanItems(prev => prev.map(i => i.id === item.id ? updated : i));
              if (onConvertPlanItemToDeal) onConvertPlanItemToDeal(updated);
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SÀNG LỌC KOC                                                          */}
      {/* ========================================================================= */}
      {visitedSubTabs.CANDIDATES && (
        <div className={activeSubTab === 'CANDIDATES' ? 'block' : 'hidden'}>
          {(() => {
            const converted = candidates.filter(c => c.outreachStatus === 'CONVERTED_TO_BOOKING').length;
            const inProgress = candidates.filter(c => c.outreachStatus === 'PITCHED' || c.outreachStatus === 'CONTACTED').length;
            const rejected = candidates.filter(c => c.outreachStatus === 'REJECTED').length;
            const rows = candidates.filter(c => candidateFilter === 'ALL' || c.outreachStatus === candidateFilter);
            const OUTREACH: Record<string, { label: string; tone: StatusTone }> = {
              CONTACTED: { label: 'Đã nhắn', tone: 'neutral' },
              PITCHED: { label: 'Đang chào giá', tone: 'warning' },
              CONVERTED_TO_BOOKING: { label: 'Đã ký booking', tone: 'positive' },
              REJECTED: { label: 'Từ chối', tone: 'critical' },
            };
            return (
              <div className="space-y-4">
                <StatRow>
                  <Stat label="Ứng viên" value={candidates.length} />
                  <Stat label="Đã ký booking" value={`${converted}/${candidates.length}`} progress={{ value: converted, max: candidates.length || 1, target: 0.3 }} note={`Tỷ lệ chốt ${formatPercent(converted / (candidates.length || 1), 0)}`} />
                  <Stat label="Đang trao đổi" value={inProgress} />
                  <Stat label="Từ chối" value={rejected} tone={rejected > 0 ? 'warning' : undefined} />
                </StatRow>

                <Panel flush title="Ứng viên KOC">
                  <div className="px-4 py-3 border-b border-line">
                    <Chips
                      value={candidateFilter}
                      onChange={setCandidateFilter}
                      items={[
                        { key: 'ALL', label: 'Tất cả', count: candidates.length },
                        { key: 'CONTACTED', label: 'Đã nhắn', count: candidates.filter(c => c.outreachStatus === 'CONTACTED').length },
                        { key: 'PITCHED', label: 'Đang chào giá', count: candidates.filter(c => c.outreachStatus === 'PITCHED').length },
                        { key: 'CONVERTED_TO_BOOKING', label: 'Đã ký', count: converted },
                        { key: 'REJECTED', label: 'Từ chối', count: rejected },
                      ]}
                    />
                  </div>
                  <DataTable
                    rows={rows}
                    rowKey={c => c.id}
                    stickyLast
                    empty={<EmptyState title="Không có ứng viên ở trạng thái này" />}
                    columns={[
                      {
                        key: 'koc', header: 'KOC & Kênh', width: 240, render: c => (
                          <div className="leading-tight">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-ink">{c.stageName}</span>
                              <span className="text-2xs font-semibold text-accent">· {c.tierLabel}</span>
                              <span className="text-2xs text-ink-3 font-code">({c.candidateCode})</span>
                            </div>
                            <div className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <a href={c.channelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-accent">
                                {c.channelId}<ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span>•</span>
                              <span className="tabular-nums">{formatNumber(c.followers)} flw · {formatNumber(c.avgViews)} view</span>
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: 'brand', header: 'Nhãn hàng & Đợt', width: 180, render: c => (
                          <div className="leading-tight">
                            <div className="font-medium text-ink">{c.brandName}</div>
                            <div className="text-2xs text-ink-3 mt-0.5">
                              {c.storeName || 'Mọi gian hàng'} · <span className="font-medium text-ink-2">{c.pitchBatch || 'Đợt 1'}</span>
                            </div>
                          </div>
                        ),
                      },
                      { key: 'price', header: 'Giá đề xuất', align: 'right', width: 110, render: c => <span className="tabular-nums font-semibold text-ink">{formatVndShort(c.rateCardExpected)}</span> },
                      {
                        key: 'pic_status', header: 'Phụ trách & Trạng thái', width: 190, render: c => {
                          const st = OUTREACH[c.outreachStatus] || { label: c.outreachStatus, tone: 'neutral' as StatusTone };
                          return (
                            <div className="grid gap-1 justify-items-start leading-tight">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Status tone={st.tone}>{st.label}</Status>
                                <span className="text-2xs text-ink-2 font-medium">· {c.assignedPic}</span>
                              </div>
                              {c.outreachStatus === 'CONVERTED_TO_BOOKING' && c.convertedBookingId && <span className="text-2xs text-ink-3 font-code">{c.convertedBookingId}</span>}
                              {c.outreachStatus === 'REJECTED' && c.rejectionReason && <span className="text-2xs text-ink-3 max-w-[180px] whitespace-normal">{c.rejectionReason}</span>}
                            </div>
                          );
                        },
                      },
                      {
                        key: 'actions', header: <span className="sr-only">Thao tác</span>, align: 'right', width: 110, render: c =>
                          c.outreachStatus !== 'CONVERTED_TO_BOOKING' && c.outreachStatus !== 'REJECTED' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const code = `BO26_${Date.now().toString().slice(-6)}`;
                                setCandidates(prev =>
                                  prev.map(x =>
                                    x.id === c.id
                                      ? { ...x, outreachStatus: 'CONVERTED_TO_BOOKING', convertedBookingId: code }
                                      : x
                                  )
                                );
                                const matchedKoc = localKocs.find(
                                  k =>
                                    k.channelId.toLowerCase().replace('@', '') ===
                                      c.channelId.toLowerCase().replace('@', '') ||
                                    k.stageName.toLowerCase() === c.stageName.toLowerCase()
                                );
                                if (matchedKoc) {
                                  onOpenQuickBookWithKoc(matchedKoc);
                                } else {
                                  onNotify?.(
                                    `Đã chốt ứng viên ${c.stageName} (${code})`,
                                    'success'
                                  );
                                }
                              }}
                            >
                              Chốt booking
                            </Button>
                          ) : null,
                      },
                    ]}
                  />
                </Panel>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PIPELINE BOOKING                                                      */}
      {/* ========================================================================= */}
      {visitedSubTabs.BOOKING_DEALS && (
        <div className={activeSubTab === 'BOOKING_DEALS' ? 'block' : 'hidden'}>
          {bookingDealsSubTabNode}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: HÀNG MẪU (BƯỚC 3) & MÃ SPARK ADS (BƯỚC 4)                             */}
      {/* ========================================================================= */}
      {visitedSubTabs.SAMPLE_ADS && (
        <div className={activeSubTab === 'SAMPLE_ADS' ? 'block' : 'hidden'}>
          <SampleTrackerView
            embedded
            deals={baseScopedDeals}
            currentUser={currentUser}
            onNotify={onNotify}
            onUpdateDeal={applyDealUpdate}
            onUpdateDealWithSparkAds={(dealCode, sparkCode) => {
              const found = deals.find(d => d.dealCode === dealCode);
              if (found) {
                applyDealUpdate({
                  ...found,
                  currentStage: '4_AIR_GROWTH',
                  adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
                  sparkAdsCode: sparkCode,
                  growthHandoffStatus: 'ĐÃ_GIAO_MÃ_ADS',
                  pipelineText: 'Đã nhập mã Spark Ads',
                });
              }
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DANH BẠ KOC                                                           */}
      {/* ========================================================================= */}
      {visitedSubTabs.KOC_DIRECTORY && (
        <div className={activeSubTab === 'KOC_DIRECTORY' ? 'block' : 'hidden'}>
          {kocDirectorySubTabNode}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CẬP NHẬT VẬN ĐƠN HÀNG MẪU (BƯỚC 3 PIPELINE)                         */}
      {/* ========================================================================= */}
      <Modal
        open={!!sampleModalDeal}
        onClose={() => setSampleModalDeal(null)}
        title={sampleModalDeal ? `Vận đơn hàng mẫu (Bước 3) · ${sampleModalDeal.dealCode}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSampleModalDeal(null)}>Hủy</Button>
            <Button variant="primary" icon={Check} onClick={handleConfirmSampleUpdate}>Lưu vận đơn</Button>
          </>
        }
      >
        {sampleModalDeal && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sunken border border-line text-xs">
              <div>
                <strong className="text-ink">{sampleModalDeal.kocStageName}</strong>
                <span className="text-ink-3"> · {sampleModalDeal.storeName || sampleModalDeal.brandName}</span>
              </div>
              <span className="text-ink-2 font-medium">{sampleModalDeal.productName || 'Sản phẩm mẫu'}</span>
            </div>

            <Field label="Trạng thái gửi & nhận mẫu">
              <Segmented
                value={sampleForm.sampleStatus}
                onChange={(v) =>
                  setSampleForm(prev => ({
                    ...prev,
                    sampleStatus: v,
                    deliveredDate: v === 'ĐÃ_NHẬN' && !prev.deliveredDate ? '20/10/2026' : prev.deliveredDate,
                  }))
                }
                items={[
                  { key: 'CHƯA_GỬI', label: 'Chưa gửi mẫu' },
                  { key: 'ĐANG_GIAO', label: 'Đang vận chuyển' },
                  { key: 'ĐÃ_NHẬN', label: 'KOC đã nhận mẫu' },
                ]}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Đơn vị vận chuyển" htmlFor="sample-carrier">
                <Select
                  id="sample-carrier"
                  value={sampleForm.carrier}
                  onChange={e =>
                    setSampleForm(prev => ({
                      ...prev,
                      carrier: e.target.value as 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress',
                    }))
                  }
                >
                  <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                  <option value="ViettelPost">Viettel Post</option>
                  <option value="J&T">J&amp;T Express</option>
                  <option value="ShopeeExpress">SPX Express</option>
                </Select>
              </Field>
              <Field label="Mã vận đơn" htmlFor="sample-tracking">
                <Input
                  id="sample-tracking"
                  className="font-code"
                  value={sampleForm.trackingCode}
                  onChange={e => setSampleForm(prev => ({ ...prev, trackingCode: e.target.value }))}
                  placeholder="GHN-..."
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Ngày gửi mẫu" htmlFor="sample-sent">
                <Input
                  id="sample-sent"
                  value={sampleForm.sentDate}
                  onChange={e => setSampleForm(prev => ({ ...prev, sentDate: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                />
              </Field>
              <Field label="Ngày KOC nhận mẫu (Tính SLA 5 ngày)" htmlFor="sample-delivered">
                <Input
                  id="sample-delivered"
                  value={sampleForm.deliveredDate}
                  onChange={e => setSampleForm(prev => ({ ...prev, deliveredDate: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="SĐT người nhận" htmlFor="sample-phone">
                <Input
                  id="sample-phone"
                  value={sampleForm.recipientPhone}
                  onChange={e => setSampleForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                />
              </Field>
              <Field label="Địa chỉ nhận mẫu" htmlFor="sample-address">
                <Input
                  id="sample-address"
                  value={sampleForm.shippingAddress}
                  onChange={e => setSampleForm(prev => ({ ...prev, shippingAddress: e.target.value }))}
                />
              </Field>
            </div>
          </>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BÀN GIAO SANG TEAM GROWTH                                            */}
      {/* ========================================================================= */}
      <Modal
        open={!!handoffDeal}
        onClose={() => setHandoffDeal(null)}
        title="Nhập mã Spark Ads"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHandoffDeal(null)}>Hủy</Button>
            <Button variant="primary" icon={Check} onClick={handleConfirmGrowthHandoff}>Lưu mã Ads</Button>
          </>
        }
      >
        <Field label="Mã Spark Ads" htmlFor="handoff-spark">
          <Input id="handoff-spark" className="font-code" value={handoffForm.sparkAdsCode} onChange={e => setHandoffForm(prev => ({ ...prev, sparkAdsCode: e.target.value }))} placeholder="SPARK-TT-…" />
        </Field>
        <Field label="Link video TikTok" htmlFor="handoff-url">
          <Input id="handoff-url" value={handoffForm.tiktokVideoUrl} onChange={e => setHandoffForm(prev => ({ ...prev, tiktokVideoUrl: e.target.value }))} placeholder="https://www.tiktok.com/@…/video/…" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Thời hạn mã Ads" htmlFor="handoff-duration">
            <Select id="handoff-duration" value={handoffForm.authDuration} onChange={e => setHandoffForm(prev => ({ ...prev, authDuration: e.target.value }))}>
              <option value="30 ngày">30 ngày</option>
              <option value="60 ngày">60 ngày (thường dùng)</option>
              <option value="90 ngày">90 ngày</option>
              <option value="Không giới hạn">Không giới hạn</option>
            </Select>
          </Field>
          <Field label="Khách hàng" htmlFor="handoff-client">
            <Select id="handoff-client" value={handoffForm.clientCommitmentStatus} onChange={e => setHandoffForm(prev => ({ ...prev, clientCommitmentStatus: e.target.value }))}>
              <option value="ĐÃ_CHỐT_NGÂN_SÁCH_ADS">Đã chốt ngân sách Ads</option>
              <option value="CHỜ_DUYỆT_NGÂN_SÁCH">Đang duyệt ngân sách</option>
              <option value="TEST_ORGANIC_TRƯỚC">Chạy tự nhiên 24 giờ trước</option>
            </Select>
          </Field>
        </div>
        <Field label="Ghi chú" htmlFor="handoff-note">
          <Textarea id="handoff-note" rows={2} value={handoffForm.growthNote} onChange={e => setHandoffForm(prev => ({ ...prev, growthNote: e.target.value }))} />
        </Field>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CẬP NHẬT JOB                                                         */}
      {/* ========================================================================= */}
      <Modal
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        size="lg"
        title={editingDeal ? `Cập nhật Deal ${editingDeal.dealCode}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingDeal(null)}>Hủy</Button>
            <Button variant="primary" icon={Check} onClick={handleSaveDealUpdate}>Lưu</Button>
          </>
        }
      >
        {editingDeal && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sunken border border-line text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink">{editingDeal.kocStageName}</span>
                <span>·</span>
                <span className="text-ink-2">{editingDeal.brandName || 'Upbase'}</span>
                {editingDeal.dealType === 'SERVICE_ONLY' && editingDeal.sourceDealCode && (
                  <span className="px-1.5 py-0.5 rounded bg-warning-soft text-warning font-semibold">
                    Mua thêm dịch vụ từ Deal gốc: {editingDeal.sourceDealCode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap font-code text-ink-3">
                {editingDeal.masterContractCode && (
                  <span>HĐNT: {editingDeal.masterContractCode}</span>
                )}
                <span>Phụ lục Deal: {editingDeal.contractAppendixCode || `PL-${editingDeal.dealCode}-01`}</span>
              </div>
            </div>

            {editForm.deliverables.length > 0 && (
              <div className="rounded-lg border border-line bg-surface p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Bước 1 · Nghiệm thu Asset (Video gốc Wave 0) & Bàn giao đa nền tảng (Wave 1)
                  </span>
                  <span className="text-2xs text-ink-3">
                    {editForm.deliverables.filter(i => i.lockStatus === 'VERIFIED').length}/{editForm.deliverables.length} hoàn tất
                  </span>
                </div>
                <div className="space-y-2">
                  {editForm.deliverables.map((item, idx) => (
                    <div key={item.id} className="p-2.5 rounded-md border border-line bg-sunken/60 grid md:grid-cols-12 gap-2 items-center text-xs">
                      <div className="md:col-span-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded font-code text-2xs font-semibold ${
                            item.wave === 0 ? 'bg-accent-soft text-accent' : 'bg-warning-soft text-warning'
                          }`}>
                            Wave {item.wave}
                          </span>
                          <span className="font-semibold text-ink">{item.title}</span>
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">
                          Đăng: <strong className="text-ink-2">{item.mediaChannel}</strong>
                          {' → '}
                          Giỏ: <strong className="text-ink-2">{item.affiliateChannel}</strong>
                          {' · '}
                          PIC: <strong className="text-ink-2">{item.assignedChannelPic}</strong>
                        </div>
                      </div>
                      <div className="md:col-span-3 text-2xs tabular-nums">
                        <div className="text-ink-2 font-semibold">{formatVnd(item.allocatedCostVnd)} ({item.allocatedWeightPct}%)</div>
                        <div className="text-ink-3">Loại: {item.productionType}</div>
                      </div>
                      <div className="md:col-span-4">
                        <Select
                          value={item.lockStatus}
                          onChange={e => {
                            const nextStatus = e.target.value as DealDeliverableItem['lockStatus'];
                            setEditForm(prev => {
                              const nextList = prev.deliverables.map((dItem, dIdx) =>
                                dIdx === idx ? { ...dItem, lockStatus: nextStatus } : dItem
                              );
                              // Tự động mở khóa các hạng mục Wave 1 và Bước 2 Dịch vụ gia tăng khi Wave 0 (Asset Video) đã VERIFIED
                              const wave0Done = nextList
                                .filter(x => x.wave === 0)
                                .every(x => x.lockStatus === 'VERIFIED');
                              const nextRights = prev.rightsTerms.map(rt => {
                                if (!wave0Done && !prev.tiktokVideoUrl.trim()) {
                                  return { ...rt, acceptanceStatus: 'LOCKED_BY_VIDEO' as const };
                                }
                                if ((wave0Done || prev.tiktokVideoUrl.trim()) && rt.acceptanceStatus === 'LOCKED_BY_VIDEO') {
                                  return { ...rt, acceptanceStatus: 'PENDING_ACCEPTANCE' as const };
                                }
                                return rt;
                              });
                              return {
                                ...prev,
                                deliverables: nextList.map(x =>
                                  x.wave === 1 && wave0Done && x.lockStatus === 'LOCKED_BY_WAVE_0'
                                    ? { ...x, lockStatus: 'UNLOCKED' }
                                    : x
                                ),
                                rightsTerms: nextRights,
                              };
                            });
                          }}
                        >
                          <option value="LOCKED_BY_WAVE_0">Khóa chờ Video gốc (Wave 0)</option>
                          <option value="UNLOCKED">Đã mở khóa (Thực thi)</option>
                          <option value="VERIFIED">Đã nghiệm thu</option>
                          <option value="DROPPED">Hủy hạng mục (Trừ tất toán Deal)</option>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
                {editForm.deliverables.some(i => i.lockStatus === 'DROPPED') && (
                  <div className="px-2.5 py-1.5 rounded bg-warning-soft text-warning text-2xs font-medium">
                    Khấu trừ hạng mục rớt sóng: -{formatVnd(editForm.deliverables.reduce((s, i) => i.lockStatus === 'DROPPED' ? s + i.allocatedCostVnd : s, 0))} · Tất toán còn lại dự tính: {formatVnd(Math.max(0, (editingDeal.totalValue || 0) - (editingDeal.advanceAmount || 0) - editForm.deliverables.reduce((s, i) => i.lockStatus === 'DROPPED' ? s + i.allocatedCostVnd : s, 0)))}
                  </div>
                )}
              </div>
            )}

            {editForm.rightsTerms.length > 0 && (() => {
              const videoVerified =
                Boolean(editForm.tiktokVideoUrl.trim()) ||
                editForm.deliverables.some(d => d.wave === 0 && d.lockStatus === 'VERIFIED');
              return (
                <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink">
                      Bước 2 · Nghiệm thu Dịch vụ gia tăng & Quyền lợi theo Deal (Mở khóa sau khi nghiệm thu Video)
                    </span>
                    <Status tone={videoVerified ? 'positive' : 'warning'}>
                      {videoVerified ? 'Đã mở khóa Bước 2' : 'Khóa chờ nghiệm thu Asset Video (Bước 1)'}
                    </Status>
                  </div>
                  <div className="space-y-1.5">
                    {editForm.rightsTerms.map((rt, rIdx) => (
                      <div key={rt.id} className="p-2 rounded border border-line bg-sunken/50 grid sm:grid-cols-12 gap-2 items-center text-2xs">
                        <div className="sm:col-span-5">
                          <div className="font-semibold text-ink">{rt.termLabel} ({rt.scopeType})</div>
                          <div className="text-ink-2 mt-0.5">
                            {rt.targetMediaChannel || 'Toàn Deal'} · {rt.durationDays} ngày · Mốc: {rt.anchorType === 'AIR_DATE' ? 'Ngày Air' : 'Nghiệm thu'}
                          </div>
                        </div>
                        <div className="sm:col-span-3 tabular-nums">
                          <div className="font-semibold text-ink-2">
                            {rt.allocatedCostVnd && rt.allocatedCostVnd > 0 ? `+${formatVnd(rt.allocatedCostVnd)}` : 'Gộp trong Deal'}
                          </div>
                          <div className="text-ink-3">Hết hạn: {rt.expiresAt || 'Kích hoạt sau nghiệm thu'}</div>
                        </div>
                        <div className="sm:col-span-4">
                          <Select
                            disabled={!videoVerified}
                            value={!videoVerified ? 'LOCKED_BY_VIDEO' : (rt.acceptanceStatus || 'PENDING_ACCEPTANCE')}
                            onChange={e => {
                              const nextSt = e.target.value as NonNullable<DealRightsTermItem['acceptanceStatus']>;
                              setEditForm(prev => ({
                                ...prev,
                                rightsTerms: prev.rightsTerms.map((item, i) =>
                                  i === rIdx ? { ...item, acceptanceStatus: nextSt } : item
                                ),
                              }));
                            }}
                          >
                            <option value="LOCKED_BY_VIDEO">Khóa chờ nghiệm thu Video</option>
                            <option value="PENDING_ACCEPTANCE">Chờ nghiệm thu phần dịch vụ</option>
                            <option value="VERIFIED">Đã nghiệm thu dịch vụ</option>
                            <option value="DROPPED">Không thực hiện (Khấu trừ khỏi Deal)</option>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {editingDeal.revisions && editingDeal.revisions.length > 0 && (
              <div className="rounded-lg border border-line bg-surface p-3 space-y-1.5">
                <div className="text-xs font-semibold text-ink">Lịch sử đàm phán & Chốt phụ lục hợp đồng</div>
                <div className="space-y-1">
                  {editingDeal.revisions.map(rev => (
                    <div key={rev.version} className="flex flex-wrap items-center justify-between gap-2 text-2xs px-2 py-1 rounded bg-sunken/50">
                      <div>
                        <span className="font-code font-semibold text-accent">v{rev.version}</span>
                        <span className="text-ink-2 ml-1.5">{rev.summary}</span>
                      </div>
                      <div className="text-ink-3 tabular-nums">
                        {rev.updatedBy} ({rev.updatedAt})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field label="Brand duyệt KOC cho job này">
              <Segmented
                value={editForm.brandApprovalStatus}
                onChange={(v) => setEditForm(prev => ({
                  ...prev,
                  brandApprovalStatus: v,
                  pipelineText: v === 'TỪ_CHỐI' ? 'Brand từ chối' : (v === 'ĐÃ_DUYỆT' && prev.pipelineText === 'Chờ Brand duyệt' ? 'Đã tạo BO' : prev.pipelineText),
                }))}
                items={[
                  { key: 'ĐÃ_DUYỆT', label: 'Đã duyệt' },
                  { key: 'CHỜ_DUYỆT', label: 'Chờ duyệt' },
                  { key: 'TỪ_CHỐI', label: 'Từ chối' },
                ]}
              />
            </Field>

            {editForm.brandApprovalStatus === 'TỪ_CHỐI' && (
              <Field label="Lý do Brand từ chối" htmlFor="edit-reject">
                <Input id="edit-reject" value={editForm.brandRejectReason} onChange={e => setEditForm(prev => ({ ...prev, brandRejectReason: e.target.value }))} placeholder="Ví dụ: tệp follower lệch định vị" />
                <div className="flex flex-wrap gap-1.5">
                  {['Lệch định vị sản phẩm', 'Follower không khớp tệp khách', 'Giá vượt ngân sách', 'Brand cần KOC chuyên gia', 'KOC trùng lịch'].map(r => (
                    <button key={r} type="button" onClick={() => setEditForm(prev => ({ ...prev, brandRejectReason: r }))} className="h-6 px-2 rounded-full border border-line text-2xs text-ink-2 hover:border-line-strong hover:text-ink">
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Bước hiện tại" htmlFor="edit-pipeline">
                <Select id="edit-pipeline" value={editForm.pipelineText} onChange={e => setEditForm(prev => ({ ...prev, pipelineText: e.target.value }))}>
                  <option value="Chờ Brand duyệt">1. Chờ Brand duyệt KOC</option>
                  <option value="Đã tạo BO">2. Đã tạo BO và ký hợp đồng</option>
                  <option value="Gửi hàng">3. Gửi hàng mẫu</option>
                  <option value="Kịch bản">4. Duyệt kịch bản</option>
                  <option value="KOC quay video">5. KOC quay và nộp video nháp</option>
                  <option value="Lên video">6. Lên video và gắn giỏ hàng</option>
                  <option value="Nghiệm thu Ads">7. Nghiệm thu mã Spark Ads</option>
                  <option value="Đối soát">8. Đối soát thanh toán</option>
                  <option value="Done">Hoàn tất</option>
                  <option value="Brand từ chối">Brand từ chối / hủy job</option>
                </Select>
              </Field>
              <Field label="Giai đoạn thanh toán" htmlFor="edit-status">
                <Select id="edit-status" value={editForm.status} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as BookingDealItem['status'] }))}>
                  <option value="SCRIPT_APPROVED">Đã duyệt kịch bản, chờ ký</option>
                  <option value="ADVANCE_PAID">Đã tạm ứng, đang triển khai</option>
                  <option value="VIDEO_SUBMITTED">Video đã lên sóng, chờ nghiệm thu</option>
                  <option value="VIDEO_VERIFIED">Đã nghiệm thu, chờ kế toán tất toán</option>
                  <option value="FINAL_PAID">Đã tất toán</option>
                  <option value="CANCELLED">Đã hủy</option>
                </Select>
              </Field>
            </div>

            {/* THIẾT LẬP TẠM ỨNG & TẤT TOÁN DEAL */}
            <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">Thỏa thuận Tạm ứng & Quyết toán</span>
                <span className="text-2xs font-mono text-ink-2">
                  Tổng thù lao: <strong>{formatVnd(editingDeal.totalValue || 0)}</strong>
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tiền tạm ứng (Đợt 1)" htmlFor="edit-advance">
                  <Input
                    id="edit-advance"
                    type="number"
                    step={100000}
                    value={editForm.advanceAmount}
                    onChange={e => setEditForm(prev => ({ ...prev, advanceAmount: Math.max(0, Number(e.target.value)) }))}
                  />
                </Field>
                <div className="flex flex-col justify-end pb-1">
                  <div className="text-2xs text-ink-3">Tất toán còn lại (Đợt 2):</div>
                  <div className="text-sm font-semibold font-mono text-ink">
                    {formatVnd(Math.max(0, (editingDeal.totalValue || 0) - editForm.advanceAmount))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, advanceAmount: 0 }))}
                  className="h-6 px-2 rounded-full border border-line text-2xs text-ink-2 hover:border-line-strong"
                >
                  Không tạm ứng (0đ)
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, advanceAmount: Math.round((editingDeal.totalValue || 0) * 0.3) }))}
                  className="h-6 px-2 rounded-full border border-line text-2xs text-ink-2 hover:border-line-strong"
                >
                  Cọc 30% ({formatVndShort(Math.round((editingDeal.totalValue || 0) * 0.3))})
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, advanceAmount: Math.round((editingDeal.totalValue || 0) * 0.5) }))}
                  className="h-6 px-2 rounded-full border border-line text-2xs text-ink-2 hover:border-line-strong"
                >
                  Cọc 50% ({formatVndShort(Math.round((editingDeal.totalValue || 0) * 0.5))})
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, advanceAmount: Math.min(2000000, editingDeal.totalValue || 0) }))}
                  className="h-6 px-2 rounded-full border border-line text-2xs text-ink-2 hover:border-line-strong"
                >
                  Tối đa 2.000.000đ
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Hàng mẫu (Bước 3)">
                <Segmented
                  value={editForm.sampleStatus}
                  onChange={(v) => setEditForm(prev => ({ ...prev, sampleStatus: v }))}
                  items={[{ key: 'CHƯA_GỬI', label: 'Chưa gửi' }, { key: 'ĐANG_GIAO', label: 'Đang giao' }, { key: 'ĐÃ_NHẬN', label: 'Đã nhận' }]}
                />
              </Field>
              <Field label="Mã Spark Ads (Bước 4)">
                <Segmented
                  value={editForm.adsCodeStatus}
                  onChange={(v) => setEditForm(prev => ({ ...prev, adsCodeStatus: v }))}
                  items={[{ key: 'CHƯA_CẤP', label: 'Chưa cấp' }, { key: 'ĐÃ_NGHIỆM_THU', label: 'Đã duyệt' }, { key: 'KHÔNG_DÙNG', label: 'Không dùng' }]}
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Đơn vị vận chuyển" htmlFor="edit-sample-carrier">
                <Select
                  id="edit-sample-carrier"
                  value={editForm.sampleCarrier}
                  onChange={e => setEditForm(prev => ({ ...prev, sampleCarrier: e.target.value as 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress' }))}
                >
                  <option value="GHN">GHN</option>
                  <option value="ViettelPost">Viettel Post</option>
                  <option value="J&T">J&amp;T Express</option>
                  <option value="ShopeeExpress">SPX Express</option>
                </Select>
              </Field>
              <Field label="Mã vận đơn mẫu" htmlFor="edit-sample-tracking">
                <Input
                  id="edit-sample-tracking"
                  className="font-code"
                  value={editForm.sampleTrackingCode}
                  onChange={e => setEditForm(prev => ({ ...prev, sampleTrackingCode: e.target.value }))}
                  placeholder="GHN-..."
                />
              </Field>
              <Field label="Mã TikTok Spark Ads" htmlFor="edit-spark-code">
                <Input
                  id="edit-spark-code"
                  className="font-code"
                  value={editForm.sparkAdsCode}
                  onChange={e => setEditForm(prev => ({ ...prev, sparkAdsCode: e.target.value }))}
                  placeholder="SPARK-TT-..."
                />
              </Field>
            </div>

            <Field label="Link video TikTok" htmlFor="edit-url">
              <div className="flex gap-2">
                <Input id="edit-url" className="flex-1" value={editForm.tiktokVideoUrl} onChange={e => setEditForm(prev => ({ ...prev, tiktokVideoUrl: e.target.value }))} placeholder="https://www.tiktok.com/@creator/video/…" />
                <Button
                  variant="secondary"
                  icon={Video}
                  onClick={() => {
                    setInspectorDeal(editingDeal);
                    setInspectorInitialUrl(editForm.tiktokVideoUrl);
                    setIsVideoInspectorOpen(true);
                  }}
                >
                  Kiểm tra link & Nghiệm thu
                </Button>
              </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Lượt xem" htmlFor="edit-views">
                <Input id="edit-views" type="number" inputMode="numeric" className="tabular-nums" value={editForm.viewsCount} onChange={e => setEditForm(prev => ({ ...prev, viewsCount: Number(e.target.value) }))} />
              </Field>
              <Field label="GMV 30 ngày (đ)" htmlFor="edit-gmv">
                <Input id="edit-gmv" type="number" step={500000} inputMode="numeric" className="tabular-nums" value={editForm.gmv30} onChange={e => setEditForm(prev => ({ ...prev, gmv30: Number(e.target.value) }))} />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 rounded-md bg-sunken text-[13px]">
              <span className="text-ink-3">ROI dự tính</span>
              <strong className="font-semibold text-ink tabular-nums">{((editForm.gmv30 || 0) / (editingDeal.totalValue || 1)).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</strong>
              {editForm.gmv30 >= 30000000 && <span className="text-2xs font-medium text-warning">· Đạt top 20</span>}
              {(editForm.gmv30 || 0) / (editingDeal.totalValue || 1) >= 1 && <span className="text-2xs font-medium text-positive">· Hoàn vốn</span>}
            </div>
          </>
        )}
      </Modal>

      {/* Duyệt nhanh từ bảng: cần xác nhận */}
      <ConfirmDialog
        open={!!approvingDeal}
        title="Xác nhận phê duyệt deal booking?"
        message={approvingDeal ? `Duyệt deal ${approvingDeal.dealCode} cho KOC "${approvingDeal.kocStageName}" (Giá trị: ${formatVnd(approvingDeal.totalValue)})? Sau khi duyệt, deal sẽ chuyển sang trạng thái sẵn sàng xuất hợp đồng và giải ngân cọc.` : undefined}
        confirmLabel="Xác nhận duyệt deal"
        onCancel={() => setApprovingDeal(null)}
        onConfirm={() => {
          if (approvingDeal) {
            handleQuickBrandApproval(approvingDeal, 'ĐÃ_DUYỆT');
            setApprovingDeal(null);
          }
        }}
      />

      {/* Từ chối nhanh từ bảng: cần lý do */}
      <ConfirmDialog
        open={!!rejectingDeal}
        title="Brand từ chối KOC này?"
        message={rejectingDeal ? `${rejectingDeal.kocStageName} · ${rejectingDeal.dealCode}` : undefined}
        confirmLabel="Từ chối"
        tone="danger"
        reason={{ label: 'Lý do', defaultValue: 'Tệp khán giả của KOC không khớp khách hàng mục tiêu', required: true }}
        onCancel={() => setRejectingDeal(null)}
        onConfirm={(reason) => { if (rejectingDeal) handleQuickBrandApproval(rejectingDeal, 'TỪ_CHỐI', reason); setRejectingDeal(null); }}
      />

      {/* Đề xuất tự air khi Brand quá hạn duyệt định hướng */}
      <ConfirmDialog
        open={!!autoAirDeal}
        title="Đề xuất tự air?"
        message={autoAirDeal ? `Brand chưa phản hồi định hướng cho ${autoAirDeal.dealCode} sau ${autoAirDeal.brandOrientationPendingDays} ngày làm việc. Theo SLA, Booking được cho KOC lên video theo brief đã duyệt.` : undefined}
        confirmLabel="Cho phép tự air"
        onCancel={() => setAutoAirDeal(null)}
        onConfirm={() => {
          if (autoAirDeal) {
            applyDealUpdate({
              ...autoAirDeal,
              currentStage: '4_AIR_GROWTH',
              pipelineText: 'Tự air (Brand quá hạn)',
              holdingReason: 'Tự air theo SLA do Brand quá hạn duyệt',
            });
          }
          setAutoAirDeal(null);
        }}
      />

      {/* KOC 360 Profile Modal */}
      <KocProfileModal
        isOpen={!!inspectedKoc}
        onClose={() => setInspectedKoc(null)}
        koc={inspectedKoc}
        deals={deals}
        currentUser={currentUser}
        selectedBrand={selectedBrand}
        onNotify={onNotify}
        onUpdateKoc={(updated, msg) => {
          setLocalKocs(prev => prev.map(k => (k.id === updated.id ? updated : k)));
          setInspectedKoc(updated);
          onKocUpdated?.(updated, msg);
        }}
        onOpenQuickBook={onOpenQuickBookWithKoc}
      />

      {/* Create KOC Modal */}
      <CreateKocModal
        isOpen={isCreateKocOpen}
        onClose={() => setIsCreateKocOpen(false)}
        existingKocs={localKocs}
        onKocCreated={handleCreateKocSuccess}
      />

      {/* TikTok Video Link Acceptance & Inspection Modal */}
      <TikTokVideoInspectorModal
        isOpen={isVideoInspectorOpen}
        onClose={() => setIsVideoInspectorOpen(false)}
        deals={deals}
        initialDeal={inspectorDeal}
        initialUrl={inspectorInitialUrl}
        onAcceptVideoForDeal={(dealCode, inspection) => {
          const targetDeal = deals.find(d => d.dealCode === dealCode) || inspectorDeal;
          if (targetDeal) {
            applyDealUpdate({
              ...targetDeal,
              currentStage: '4_AIR_GROWTH',
              tiktokVideoUrl: inspection.resolvedUrl,
              videoUrl: inspection.resolvedUrl,
              postedDate: inspection.publishedDate,
              postDate: inspection.publishedDate,
              isPostOnTime: inspection.isOnTime,
              isOnTimePost: inspection.isOnTime,
              daysDelayed: inspection.daysDelayed,
              viewsCount: inspection.viewsCount,
              pipelineText: 'Nghiệm thu Ads',
              status: 'VIDEO_VERIFIED',
              statusLabel: 'Đã Nghiệm Thu Video',
            });
          }
          if (editingDeal && editingDeal.dealCode === dealCode) {
            setEditForm(prev => ({
              ...prev,
              tiktokVideoUrl: inspection.resolvedUrl,
              viewsCount: inspection.viewsCount,
              pipelineText: 'Nghiệm thu Ads',
              status: 'VIDEO_VERIFIED',
              statusLabel: 'Đã Nghiệm Thu Video',
            }));
          }
        }}
      />

      {/* Hộp thoại Tạo phiếu ĐNTT / Tạm ứng & Đồng bộ Lark Approval / Larkbase 3.2 */}
      <LarkPaymentRequestModal
        open={isPaymentRequestOpen}
        onClose={() => setIsPaymentRequestOpen(false)}
        initialDeal={paymentRequestDeal}
        initialRequestType={paymentRequestMode}
        allDeals={deals}
        kocs={localKocs}
        currentUserName={currentUser?.name || selectedStaffName}
        onSuccessUpdateDeals={(updatedList) => {
          updatedList.forEach(d => applyDealUpdate(d));
        }}
      />
    </div>
  );
};
