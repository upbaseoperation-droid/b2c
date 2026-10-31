'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { klLabel } from '../../lib/klTiers';
import { Avatar, Status, Modal, Button } from '../ui';
import { PartnerDiscussion } from '../PartnerDiscussion';
import { LegalOcrModal } from '../LegalOcrModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  Briefcase,
  History as HistoryIcon,
  Video,
  CheckCircle2,
  AlertCircle,
  Search,
  Play,
  Check,
  DollarSign,
  ArrowRight,
  Layers,
  RefreshCw,
  Send,
  Building,
  Truck,
  MessageSquare,
  ShieldCheck,
  QrCode,
  UserCheck,
  FileText,
  BarChart3,
  FileScan,
  ExternalLink,
  Star,
  TrendingUp,
  Package,
  CreditCard,
  Award
} from 'lucide-react';
import {
  KocItem,
  BookingDealItem,
  UserProfile,
  BrandDetail,
  OcrLegalExtractionResult,
  getSalaryGradeFromRate,
  getSegmentFromSalaryGrade,
  KocCategory,
  TepKenh
} from '../../lib/types';
import { INITIAL_KOCS, INITIAL_DEALS } from '../../lib/mockData';
import { formatVnd, formatVndShort, getVietnamDateYmd } from '../../lib/format';
import {
  dealsOfKoc,
  calculateKocPerformanceStats,
  legalTypeOf,
  legalIdOf,
  hasLegalId,
  LEGAL_TYPE_LABEL,
  formatFollowers,
  getKocLegalProfiles
} from '../koc/kocUtils';
import { contractApi, type ContractBootstrap } from '../contracts/api';
import type { ContractRecord } from '../../lib/contracts/types';
import { computeSigningProgress } from '../contracts/contractUi';
import { documentOfTemplate } from '../../lib/planDealLink';
import type { KocLegalProfile } from '../../lib/types';

export interface KocKolHubViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  initialKocs?: KocItem[];
  initialDeals?: BookingDealItem[];
  selectedKocId?: string | null;
  onKocUpdated?: (updatedKoc: KocItem) => void;
  onUpdateDeal?: (updatedDeal: BookingDealItem) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onOpenContractForKoc?: (koc: KocItem, legalProfileId?: string) => void;
  onOpenKocMaster?: (kocId: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;

  onNavigateToCtvHub?: () => void;
}

type PortalTabKey =
  | 'OVERVIEW'
  | 'PROFILE'
  | 'APPROVALS'
  | 'ACTIVE_JOBS'
  | 'CONTRACTS'
  | 'HISTORY'
  | 'PERFORMANCE'
  | 'DISCUSSION';

export const KocKolHubView: React.FC<KocKolHubViewProps> = (props) => {
  const kocs = props.initialKocs || INITIAL_KOCS;
  if (props.currentUser?.role === 'KOC_PARTNER') {
    const own = kocs.filter(k => k.id === props.currentUser?.linkedEntityId);
    if (!own.length) {
      return (
        <div className="rounded-xl border border-line bg-white p-6 text-sm text-ink-2">
          Chưa có hồ sơ KOC được liên kết với tài khoản của bạn.
        </div>
      );
    }
    return (
      <KocKolWorkspace
        key={props.currentUser.id}
        {...props}
        initialKocs={own}
        initialDeals={dealsOfKoc(props.initialDeals || INITIAL_DEALS, own[0])}
      />
    );
  }
  if (!kocs.length) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-sm text-ink-2">
        Chưa có hồ sơ KOC.
      </div>
    );
  }
  return <KocKolWorkspace key={props.currentUser?.id || 'guest'} {...props} />;
};

const KocKolWorkspace: React.FC<KocKolHubViewProps> = ({
  currentUser,
  initialKocs = INITIAL_KOCS,
  initialDeals = INITIAL_DEALS,
  selectedKocId: externalSelectedKocId = null,
  onKocUpdated,
  onUpdateDeal,
  onOpenContractForDeal,
  onOpenContractForKoc,
  onOpenKocMaster,
  onNotify,

  onNavigateToCtvHub
}) => {
  const isKocPartner = currentUser?.role === 'KOC_PARTNER';
  const isManagerOrStaff = !isKocPartner;

  const [kocs, setKocs] = useState<KocItem[]>(initialKocs);
  const [syncedInitialKocs, setSyncedInitialKocs] = useState(initialKocs);
  if (initialKocs !== syncedInitialKocs) {
    setSyncedInitialKocs(initialKocs);
    setKocs(initialKocs);
  }

  const [deals, setDeals] = useState<BookingDealItem[]>(initialDeals);
  const [syncedInitialDeals, setSyncedInitialDeals] = useState(initialDeals);
  if (initialDeals !== syncedInitialDeals) {
    setSyncedInitialDeals(initialDeals);
    setDeals(initialDeals);
  }

  const [viewMode, setViewMode] = useState<'NETWORK_COCKPIT' | 'KOC_PORTAL'>(
    isKocPartner || externalSelectedKocId ? 'KOC_PORTAL' : 'NETWORK_COCKPIT'
  );

  const [selectedKocId, setSelectedKocId] = useState<string>(
    externalSelectedKocId || kocs[0]?.id || 'koc-1'
  );
  const [syncedExternalKocId, setSyncedExternalKocId] = useState<string | null>(externalSelectedKocId);
  if (externalSelectedKocId !== syncedExternalKocId) {
    setSyncedExternalKocId(externalSelectedKocId);
    if (externalSelectedKocId) {
      setSelectedKocId(externalSelectedKocId);
      setViewMode('KOC_PORTAL');
    }
  }

  const activeKoc = useMemo(() => {
    return kocs.find(k => k.id === selectedKocId) || kocs[0];
  }, [kocs, selectedKocId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterSalaryGrade, setFilterSalaryGrade] = useState('ALL');
  const [filterTepKenh, setFilterTepKenh] = useState('ALL');
  const [filterPic, setFilterPic] = useState('ALL');
  const [cockpitPage, setCockpitPage] = useState(1);
  const COCKPIT_PAGE_SIZE = 12;

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    kocs.forEach(k => {
      if (k.brandName) set.add(k.brandName);
    });
    return Array.from(set).sort();
  }, [kocs]);

  const availablePics = useMemo(() => {
    const set = new Set<string>();
    kocs.forEach(k => {
      if (k.bookingPic) set.add(k.bookingPic);
    });
    return Array.from(set).sort();
  }, [kocs]);

  const availableTepKenhs = useMemo(() => {
    const set = new Set<string>();
    kocs.forEach(k => {
      if (k.tepKenh) set.add(k.tepKenh);
    });
    return Array.from(set).sort();
  }, [kocs]);

  const filteredKocs = useMemo(() => {
    return kocs.filter(k => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = k.stageName.toLowerCase().includes(q);
        const matchChannel = (k.channelId || '').toLowerCase().includes(q);
        const matchReal = (k.realName || '').toLowerCase().includes(q);
        const matchPhone = (k.phone || '').includes(q);
        const matchCccd = (k.cccd || '').includes(q);
        if (!matchName && !matchChannel && !matchReal && !matchPhone && !matchCccd) return false;
      }
      if (filterBrand !== 'ALL') {
        const b = filterBrand.toLowerCase();
        const matchBrand = (k.brandName || '').toLowerCase().includes(b);
        if (!matchBrand) return false;
      }
      if (filterTier !== 'ALL' && k.tier !== filterTier) return false;
      if (filterSalaryGrade !== 'ALL' && k.salaryGrade !== filterSalaryGrade) return false;
      if (filterTepKenh !== 'ALL' && k.tepKenh !== filterTepKenh) return false;
      if (filterPic !== 'ALL' && k.bookingPic !== filterPic) return false;
      return true;
    });
  }, [kocs, searchQuery, filterBrand, filterTier, filterSalaryGrade, filterTepKenh, filterPic]);

  const totalCockpitPages = Math.max(1, Math.ceil(filteredKocs.length / COCKPIT_PAGE_SIZE));
  const paginatedKocs = useMemo(() => {
    const start = (cockpitPage - 1) * COCKPIT_PAGE_SIZE;
    return filteredKocs.slice(start, start + COCKPIT_PAGE_SIZE);
  }, [filteredKocs, cockpitPage]);

  const networkStats = useMemo(() => {
    const totalKocs = kocs.length;
    const activeDeals = deals.filter(d => d.status !== 'CANCELLED');
    const pendingSamples = deals.filter(d => d.sampleStatus === 'ĐANG_GIAO' || d.sampleStatus === 'CHƯA_GỬI').length;
    const pendingReviews = deals.filter(d => d.status === 'SCRIPT_PENDING' || d.status === 'VIDEO_SUBMITTED').length;
    const totalCastValue = activeDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const totalGmvEstimate = activeDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0);
    return { totalKocs, activeDealsCount: activeDeals.length, pendingSamples, pendingReviews, totalCastValue, totalGmvEstimate };
  }, [kocs, deals]);

  const [activeTab, setActiveTab] = useState<PortalTabKey>('OVERVIEW');
  const [activeJobsSubTab, setActiveJobsSubTab] = useState<'DEALS' | 'SAMPLES' | 'SUBMISSION'>('DEALS');

  const currentKocDeals = useMemo(() => dealsOfKoc(deals, activeKoc), [deals, activeKoc]);
  const perfStats = useMemo(() => calculateKocPerformanceStats(deals, activeKoc), [deals, activeKoc]);

  const [apiContracts, setApiContracts] = useState<ContractRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    contractApi<ContractBootstrap>('/api/contracts')
      .then((res) => {
        if (!cancelled && res?.records) {
          setApiContracts(res.records);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const kocContracts = useMemo(() => {
    const chClean = (activeKoc.channelId || '').replace(/^@/, '').toLowerCase();
    return apiContracts.filter(
      c =>
        c.kocId === activeKoc.id ||
        c.partner.toLowerCase().includes(chClean) ||
        c.partner.toLowerCase() === activeKoc.stageName.toLowerCase() ||
        c.partner.toLowerCase() === (activeKoc.realName || '').toLowerCase()
    );
  }, [apiContracts, activeKoc]);

  const kocLegalProfiles: KocLegalProfile[] = useMemo(() => getKocLegalProfiles(activeKoc), [activeKoc]);

  const [profileForm, setProfileForm] = useState(() => buildProfileForm(activeKoc));
  const [syncedProfileKoc, setSyncedProfileKoc] = useState<KocItem>(activeKoc);
  if (activeKoc !== syncedProfileKoc) {
    setSyncedProfileKoc(activeKoc);
    setProfileForm(buildProfileForm(activeKoc));
  }

  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [previewContractDeal, setPreviewContractDeal] = useState<BookingDealItem | null>(null);
  const [selectedHistoryDeal, setSelectedHistoryDeal] = useState<BookingDealItem | null>(null);
  const [kocSelfFeedback, setKocSelfFeedback] = useState('');

  const [historyBrandFilter, setHistoryBrandFilter] = useState('ALL');
  const [historyFormatFilter, setHistoryFormatFilter] = useState<'ALL' | 'PAID' | 'FOC' | 'LIVE'>('ALL');
  const [historySearch, setHistorySearch] = useState('');

  const [negotiatingDeal, setNegotiatingDeal] = useState<BookingDealItem | null>(null);
  const [counterRate, setCounterRate] = useState<number>(activeKoc.rateCardVideo || 3000000);
  const [counterNote, setCounterNote] = useState<string>('');

  const [rejectingDeal, setRejectingDeal] = useState<BookingDealItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Lệch định hướng kênh / không phù hợp sản phẩm');

  const [submittingDeal, setSubmittingDeal] = useState<BookingDealItem | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    videoUrl: '',
    sparkAdsCode: '',
    scriptUrl: '',
    notes: ''
  });

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    recipient: activeKoc.shippingRecipientName || activeKoc.realName || activeKoc.stageName,
    phone: activeKoc.shippingPhone || activeKoc.phone || '',
    address: activeKoc.shippingAddress || activeKoc.permanentAddress || ''
  });

  const [metricsForm, setMetricsForm] = useState(() => ({
    followers: activeKoc.followers || 0,
    followerGrowth30dPct: activeKoc.tiktokFollowerGrowth30d ?? 0,
    avgViews: activeKoc.avgViews || 0,
    tiktokGmv30d: activeKoc.recentRevenue ?? (perfStats.totalGmv || 0),
    gpm: activeKoc.gpm ?? 0,
    avgOrderValue: activeKoc.aov ?? 0,
    ctrPct: activeKoc.tiktokAvgCtr ?? 0,
    cvrPct: activeKoc.tiktokAvgCvr ?? 0,
    avgCommissionPct: activeKoc.tiktokAvgCommissionRate ?? 10,
    shopRatingScore: activeKoc.tiktokShopRating ?? 0,
    cancellationRatePct: activeKoc.tiktokCancellationRate ?? 0,
    revenueVideoPct: activeKoc.gmvShareVideo ?? 75,
    revenueLivePct: activeKoc.gmvShareLive ?? 20,
    revenueShowcasePct: activeKoc.gmvShareProductCard ?? 5,
    femalePct: activeKoc.femaleRatio ?? 82,
    age18_24Pct: activeKoc.age18_24 ?? 40,
    age25_34Pct: activeKoc.age25_34 ?? 48
  }));

  const [syncedAddrKocId, setSyncedAddrKocId] = useState(activeKoc.id);
  if (activeKoc.id !== syncedAddrKocId) {
    setSyncedAddrKocId(activeKoc.id);
    setAddressForm({
      recipient: activeKoc.shippingRecipientName || activeKoc.realName || activeKoc.stageName,
      phone: activeKoc.shippingPhone || activeKoc.phone || '',
      address: activeKoc.shippingAddress || activeKoc.permanentAddress || ''
    });
    setMetricsForm({
      followers: activeKoc.followers || 0,
      followerGrowth30dPct: activeKoc.tiktokFollowerGrowth30d ?? 0,
      avgViews: activeKoc.avgViews || 0,
      tiktokGmv30d: activeKoc.recentRevenue ?? (perfStats.totalGmv || 0),
      gpm: activeKoc.gpm ?? 0,
      avgOrderValue: activeKoc.aov ?? 0,
      ctrPct: activeKoc.tiktokAvgCtr ?? 0,
      cvrPct: activeKoc.tiktokAvgCvr ?? 0,
      avgCommissionPct: activeKoc.tiktokAvgCommissionRate ?? 10,
      shopRatingScore: activeKoc.tiktokShopRating ?? 0,
      cancellationRatePct: activeKoc.tiktokCancellationRate ?? 0,
      revenueVideoPct: activeKoc.gmvShareVideo ?? 75,
      revenueLivePct: activeKoc.gmvShareLive ?? 20,
      revenueShowcasePct: activeKoc.gmvShareProductCard ?? 5,
      femalePct: activeKoc.femaleRatio ?? 82,
      age18_24Pct: activeKoc.age18_24 ?? 40,
      age25_34Pct: activeKoc.age25_34 ?? 48
    });
  }

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  const commitKocUpdate = (updatedKoc: KocItem, toastMsg: string) => {
    setKocs(prev => prev.map(k => (k.id === updatedKoc.id ? updatedKoc : k)));
    onKocUpdated?.(updatedKoc);
    notify(toastMsg, 'success');
  };

  const commitDealUpdate = (updatedDeal: BookingDealItem, toastMsg?: string) => {
    setDeals(prev => prev.map(d => (d.id === updatedDeal.id ? updatedDeal : d)));
    onUpdateDeal?.(updatedDeal);
    if (toastMsg) notify(toastMsg, 'success');
  };

  const pendingActionCount = useMemo(() => {
    const pendingOffers = currentKocDeals.filter(
      d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') && d.status === 'CONTACTING'
    ).length;
    const pendingSamples = currentKocDeals.filter(d => d.sampleStatus === 'ĐANG_GIAO').length;
    const pendingContracts = currentKocDeals.filter(
      d => d.status !== 'CANCELLED' && !d.contractCreatedAt && d.totalValue > 0
    ).length;
    return pendingOffers + pendingSamples + pendingContracts;
  }, [currentKocDeals]);

  const stats = useMemo(() => {
    const totalJobs = currentKocDeals.length;
    const acceptedJobs = currentKocDeals.filter(
      d => d.kocResponseStatus === 'ĐỒNG_Ý' || (d.status !== 'CONTACTING' && d.status !== 'CANCELLED')
    ).length;
    const pendingSamples = currentKocDeals.filter(
      d => d.sampleStatus === 'ĐANG_GIAO' || d.sampleStatus === 'CHƯA_GỬI'
    ).length;
    const totalEarnings = currentKocDeals
      .filter(d => d.status !== 'CANCELLED')
      .reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const totalGmv = currentKocDeals
      .filter(d => d.status !== 'CANCELLED')
      .reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0);
    const advancePaid = currentKocDeals
      .filter(d => d.status !== 'CANCELLED')
      .reduce((sum, d) => sum + (d.advanceAmount || 0), 0);
    const signedContractsCount = currentKocDeals.filter(
      d => d.contractCreatedAt || d.status === 'CONTRACT_GENERATED' || d.status === 'COMPLETED' || d.status === 'FINAL_PAID'
    ).length;
    return {
      totalJobs,
      acceptedJobs,
      pendingSamples,
      totalEarnings,
      totalGmv,
      advancePaid,
      signedContractsCount
    };
  }, [currentKocDeals]);

  const filteredHistoryDeals = useMemo(() => {
    return currentKocDeals.filter(d => {
      const isFoc = (d.totalValue || 0) === 0;
      if (historyBrandFilter !== 'ALL' && d.brandName !== historyBrandFilter) return false;
      if (historyFormatFilter === 'FOC' && !isFoc) return false;
      if (historyFormatFilter === 'PAID' && isFoc) return false;
      if (
        historyFormatFilter === 'LIVE' &&
        !(d.campaignTitle || '').toLowerCase().includes('live') &&
        !(d.bookingFormat || '').toLowerCase().includes('live')
      ) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const hit =
          (d.dealCode || '').toLowerCase().includes(q) ||
          (d.campaignTitle || '').toLowerCase().includes(q) ||
          (d.productName || '').toLowerCase().includes(q) ||
          (d.brandName || '').toLowerCase().includes(q) ||
          (d.storeName || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [currentKocDeals, historyBrandFilter, historyFormatFilter, historySearch]);

  const historyBrands = useMemo(() => {
    return Array.from(new Set(currentKocDeals.map(d => d.brandName).filter(Boolean))).sort();
  }, [currentKocDeals]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(profileForm.rateCardVideo) || 0;
    const computedKl = getSalaryGradeFromRate(rate);
    const computedSegment = getSegmentFromSalaryGrade(computedKl);

    const updatedKoc: KocItem = {
      ...activeKoc,
      stageName: profileForm.stageName.trim() || activeKoc.stageName,
      realName: profileForm.realName.trim(),
      channelId: profileForm.channelId.trim().replace(/^@/, ''),
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim(),
      tepKenh: (profileForm.tepKenh.trim() || 'Chưa phân loại') as TepKenh,
      kocCategory: profileForm.kocCategory as KocCategory,
      rateCardVideo: rate,
      rateCardLive: Number(profileForm.rateCardLive) || undefined,
      salaryGrade: computedKl,
      segment: computedSegment,
      cccd: profileForm.cccd.trim(),
      dob: profileForm.dob.trim(),
      issueDate: profileForm.issueDate.trim(),
      issuePlace: profileForm.issuePlace.trim(),
      permanentAddress: profileForm.permanentAddress.trim(),
      taxCode: profileForm.taxCode.trim(),
      companyName: profileForm.companyName.trim() || undefined,
      legalRepresentative: profileForm.legalRepresentative.trim() || undefined,
      bankName: profileForm.bankName.trim(),
      bankAccount: profileForm.bankAccount.trim(),
      shippingAddress: profileForm.shippingAddress.trim(),
      samplePreferences: {
        skinType: profileForm.skinType.trim() || undefined,
        clothingSize: profileForm.clothingSize.trim() || undefined,
        shoeSize: profileForm.shoeSize.trim() || undefined,
        babyAgeMonths: profileForm.babyAgeMonths ? Number(profileForm.babyAgeMonths) : undefined,
        babyWeightKg: profileForm.babyWeightKg ? Number(profileForm.babyWeightKg) : undefined,
        specialNotes: profileForm.specialNotes.trim() || undefined
      }
    };

    setAddressForm({
      recipient: updatedKoc.realName || updatedKoc.stageName,
      phone: updatedKoc.phone || '',
      address: updatedKoc.shippingAddress || updatedKoc.permanentAddress || ''
    });

    commitKocUpdate(
      updatedKoc,
      `Đã lưu và đồng bộ thông tin cá nhân & pháp lý của ${updatedKoc.stageName} sang Danh bạ KOC, Hợp đồng và Hàng mẫu!`
    );
  };

  const handleApplyOcrToProfile = (r: OcrLegalExtractionResult) => {
    const f = r.fields;
    const nextForm = {
      ...profileForm,
      realName: f.fullName || profileForm.realName,
      cccd: f.idNumber || profileForm.cccd,
      taxCode: f.taxCode || profileForm.taxCode,
      companyName: f.companyName || profileForm.companyName,
      permanentAddress: f.permanentAddress || f.headquartersAddress || profileForm.permanentAddress,
      dob: f.dob || profileForm.dob,
      issueDate: f.issueDate || profileForm.issueDate,
      issuePlace: f.issuePlace || profileForm.issuePlace,
      legalRepresentative: f.legalRepresentative || profileForm.legalRepresentative
    };
    setProfileForm(nextForm);

    const updatedKoc: KocItem = {
      ...activeKoc,
      realName: nextForm.realName,
      cccd: nextForm.cccd,
      taxCode: nextForm.taxCode,
      companyName: nextForm.companyName || undefined,
      permanentAddress: nextForm.permanentAddress,
      dob: nextForm.dob,
      issueDate: nextForm.issueDate,
      issuePlace: nextForm.issuePlace,
      legalRepresentative: nextForm.legalRepresentative || undefined,
      isOcrVerified: true,
      ocrDocumentType: r.documentType,
      ocrVerifiedAt: new Date().toISOString()
    };

    commitKocUpdate(
      updatedKoc,
      `Đã đọc ảnh giấy tờ và đồng bộ hồ sơ pháp lý cho ${updatedKoc.stageName}!`
    );
    setIsOcrOpen(false);
  };

  const handleAcceptDeal = (dealId: string) => {
    const target = deals.find(d => d.id === dealId);
    if (!target) return;
    const updated: BookingDealItem = {
      ...target,
      kocResponseStatus: 'ĐỒNG_Ý',
      status: 'SCRIPT_PENDING',
      statusLabel: 'KOC Đã Đồng Ý Hợp Tác',
      pipelineText: 'Chờ gửi hàng mẫu'
    };
    commitDealUpdate(
      updated,
      `KOC [${activeKoc.stageName}] đã đồng ý nhận Job ${target.dealCode}! Đã đồng bộ sang Booking & Đề xuất KOC.`
    );
  };

  const handleNegotiateDeal = () => {
    if (!negotiatingDeal) return;
    const updated: BookingDealItem = {
      ...negotiatingDeal,
      kocResponseStatus: 'ĐANG_THƯƠNG_LƯỢNG',
      totalValue: counterRate,
      statusLabel: 'KOC Đang Đề Xuất Mức Cast',
      holdingReason: `KOC đề xuất cast: ${formatVndShort(counterRate)} - ${counterNote}`
    };
    commitDealUpdate(
      updated,
      `Đã gửi đề xuất mức cast [${formatVndShort(counterRate)}] tới PIC ${negotiatingDeal.bookingPic || negotiatingDeal.assignedStaff}!`
    );
    setNegotiatingDeal(null);
  };

  const handleRejectDeal = () => {
    if (!rejectingDeal) return;
    const updated: BookingDealItem = {
      ...rejectingDeal,
      kocResponseStatus: 'TỪ_CHỐI',
      status: 'CANCELLED',
      statusLabel: 'KOC Đã Từ Chối Job',
      holdingReason: `Lý do KOC từ chối: ${rejectReason}`
    };
    commitDealUpdate(updated);
    notify(`Đã thông báo từ chối Job ${rejectingDeal.dealCode} tới Brand & PIC!`, 'warning');
    setRejectingDeal(null);
  };

  const handleConfirmReceivedSample = (dealId: string) => {
    const target = deals.find(d => d.id === dealId);
    if (!target) return;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 5);
    const updated: BookingDealItem = {
      ...target,
      sampleStatus: 'ĐÃ_NHẬN',
      slaDeadline: getVietnamDateYmd(deadlineDate),
      pipelineText: 'Đã nhận mẫu - SLA 5 ngày nộp video'
    };
    commitDealUpdate(
      updated,
      `Đã xác nhận nhận mẫu cho ${target.dealCode}! Đã đồng bộ trạng thái sang phân hệ Hàng mẫu & Booking.`
    );
  };

  const handleSubmitVideoDemo = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!submittingDeal || !submissionForm.videoUrl.trim()) {
      notify('Vui lòng nhập link video demo!', 'warning');
      return;
    }

    const updated: BookingDealItem = {
      ...submittingDeal,
      tiktokVideoUrl: submissionForm.videoUrl.trim(),
      sparkAdsCode: submissionForm.sparkAdsCode.trim() || submittingDeal.sparkAdsCode,
      adsCodeStatus: submissionForm.sparkAdsCode.trim() ? 'ĐÃ_NGHIỆM_THU' : submittingDeal.adsCodeStatus,
      status: 'VIDEO_SUBMITTED',
      statusLabel: 'Đã nộp Video Nháp (Chờ Brand duyệt)',
      pipelineText: 'Chờ nghiệm thu video'
    };

    commitDealUpdate(
      updated,
      `Đã nộp video & mã Spark Ads cho [${submittingDeal.campaignTitle}]! Đã đồng bộ sang Kịch bản & Video, Hàng mẫu và Báo cáo Ads tuần.`
    );
    setSubmittingDeal(null);
    setSubmissionForm({ videoUrl: '', sparkAdsCode: '', scriptUrl: '', notes: '' });
  };

  const handleKocSignContract = (deal: BookingDealItem) => {
    if (!hasLegalId(activeKoc)) {
      notify('Vui lòng cập nhật CCCD hoặc Mã số thuế tại tab Thông tin cá nhân trước khi ký hợp đồng!', 'warning');
      setActiveTab('PROFILE');
      return;
    }
    const nowStr = new Date().toLocaleDateString('vi-VN');
    const updated: BookingDealItem = {
      ...deal,
      status: deal.status === 'CONTACTING' ? 'CONTRACT_GENERATED' : deal.status,
      contractCreatedAt: deal.contractCreatedAt || nowStr,
      statusLabel: 'KOC Đã Ký Xác Nhận Hợp Đồng Điện Tử',
      pipelineText: 'Đã ký HĐ điện tử - Chờ kế toán giải ngân'
    };
    commitDealUpdate(
      updated,
      `KOC ${activeKoc.stageName} đã ký xác nhận hợp đồng cho deal ${deal.dealCode}! Đã đồng bộ sang phân hệ Hợp đồng & Thanh toán.`
    );
    if (previewContractDeal?.id === deal.id) {
      setPreviewContractDeal(updated);
    }
  };

  const handleSaveChannelMetrics = (e?: React.FormEvent) => {
    e?.preventDefault();
    const updatedKoc: KocItem = {
      ...activeKoc,
      followers: Number(metricsForm.followers) || activeKoc.followers,
      tiktokFollowerGrowth30d: Number(metricsForm.followerGrowth30dPct),
      avgViews: Number(metricsForm.avgViews) || activeKoc.avgViews,
      recentRevenue: Number(metricsForm.tiktokGmv30d),
      gpm: Number(metricsForm.gpm),
      aov: Number(metricsForm.avgOrderValue),
      tiktokAvgCtr: Number(metricsForm.ctrPct),
      tiktokAvgCvr: Number(metricsForm.cvrPct),
      tiktokAvgCommissionRate: Number(metricsForm.avgCommissionPct),
      tiktokShopRating: Number(metricsForm.shopRatingScore),
      tiktokCancellationRate: Number(metricsForm.cancellationRatePct),
      gmvShareVideo: Number(metricsForm.revenueVideoPct),
      gmvShareLive: Number(metricsForm.revenueLivePct),
      gmvShareProductCard: Number(metricsForm.revenueShowcasePct),
      femaleRatio: Number(metricsForm.femalePct),
      maleRatio: Math.max(0, 100 - Number(metricsForm.femalePct)),
      age18_24: Number(metricsForm.age18_24Pct),
      age25_34: Number(metricsForm.age25_34Pct),
      age35Plus: Math.max(0, 100 - Number(metricsForm.age18_24Pct) - Number(metricsForm.age25_34Pct)),
      metricsUpdatedAt: new Date().toISOString()
    };

    commitKocUpdate(
      updatedKoc,
      `Đã cập nhật chỉ số kênh TikTok Seller của ${updatedKoc.stageName} và đồng bộ sang Danh bạ KOC!`
    );
    setIsMetricsModalOpen(false);
  };

  const legalType = legalTypeOf(activeKoc);
  const legalComplete = hasLegalId(activeKoc);

  return (
    <div className="space-y-6">
      {isManagerOrStaff && (
        <div className="bg-white rounded-xl border border-line/90 p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-semibold text-xs shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink tracking-tight flex items-center gap-2">
                  <span>Trung Tâm Điều Hành KOC Đối Tác</span>
                  <span className="text-2xs font-normal text-ink-3">
                    ({filteredKocs.length}/{kocs.length} KOC)
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 bg-sunken rounded-xl border border-line/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('NETWORK_COCKPIT')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                  viewMode === 'NETWORK_COCKPIT'
                    ? 'bg-white text-accent-hover shadow-xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Giám Sát Mạng Lưới KOC</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('KOC_PORTAL')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                  viewMode === 'KOC_PORTAL'
                    ? 'bg-white text-accent-hover shadow-xs'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cổng KOC Đang Chọn ({activeKoc.stageName})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, kênh @, SĐT, CCCD..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-line bg-canvas/50 text-ink placeholder-ink-3 focus:bg-white focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <select
                value={filterBrand}
                onChange={(e) => {
                  setFilterBrand(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-ink-2 font-medium focus:outline-none focus:border-accent"
              >
                <option value="ALL">Tất cả nhãn hàng</option>
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-ink-2 font-medium focus:outline-none focus:border-accent"
              >
                <option value="ALL">Tất cả Cấp bậc (Tier)</option>
                <option value="TIER_1_CELEB">Mega / Celeb (&gt;1M)</option>
                <option value="TIER_2_MACRO">Macro (250K - 1M)</option>
                <option value="TIER_3_MICRO">Micro (50K - 250K)</option>
                <option value="TIER_4_NANO">Nano (&lt;50K)</option>
              </select>
            </div>

            <div>
              <select
                value={filterSalaryGrade}
                onChange={(e) => {
                  setFilterSalaryGrade(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-ink-2 font-medium focus:outline-none focus:border-accent"
              >
                <option value="ALL">Tất cả Khung lương (KL)</option>
                <option value="KL1">{klLabel('KL1')}</option>
                <option value="KL2">{klLabel('KL2')}</option>
                <option value="KL3">{klLabel('KL3')}</option>
                <option value="KL4">{klLabel('KL4')}</option>
                <option value="KL5">{klLabel('KL5')}</option>
                <option value="KL6">{klLabel('KL6')}</option>
                <option value="KL7">{klLabel('KL7')}</option>
              </select>
            </div>

            <div>
              <select
                value={filterTepKenh}
                onChange={(e) => {
                  setFilterTepKenh(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-ink-2 font-medium focus:outline-none focus:border-accent truncate"
              >
                <option value="ALL">Tất cả Tệp kênh</option>
                {availableTepKenhs.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterPic}
                onChange={(e) => {
                  setFilterPic(e.target.value);
                  setCockpitPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-ink-2 font-medium focus:outline-none focus:border-accent truncate"
              >
                <option value="ALL">Tất cả PIC Booking</option>
                {availablePics.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {(searchQuery || filterBrand !== 'ALL' || filterTier !== 'ALL' || filterSalaryGrade !== 'ALL' || filterTepKenh !== 'ALL' || filterPic !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterBrand('ALL');
                    setFilterTier('ALL');
                    setFilterSalaryGrade('ALL');
                    setFilterTepKenh('ALL');
                    setFilterPic('ALL');
                    setCockpitPage(1);
                  }}
                  className="px-2 py-2 rounded-lg bg-sunken hover:bg-sunken text-ink-2 transition shrink-0"
                  title="Xóa bộ lọc"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'NETWORK_COCKPIT' && isManagerOrStaff ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-line/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
                <span>Mạng Lưới KOC Hợp Tác</span>
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div className="text-xl font-semibold text-ink tracking-tight">
                {filteredKocs.length} <span className="text-xs font-normal text-ink-3">/ {kocs.length} KOC</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
                <span>Hợp Đồng Booking Đang Chạy</span>
                <Briefcase className="w-4 h-4 text-positive" />
              </div>
              <div className="text-xl font-semibold text-positive tracking-tight">
                {networkStats.activeDealsCount} <span className="text-xs font-normal text-ink-3">deals</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
                <span>Hàng Mẫu &amp; Video Đang Chạy</span>
                <Truck className="w-4 h-4 text-warning" />
              </div>
              <div className="text-xl font-semibold text-warning tracking-tight">
                {networkStats.pendingSamples} <span className="text-xs font-normal text-ink-3">mẫu</span> • {networkStats.pendingReviews} <span className="text-xs font-normal text-ink-3">video chờ</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-line/80 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
                <span>Tổng GMV Thực Tế &amp; Dự Kiến</span>
                <DollarSign className="w-4 h-4 text-accent" />
              </div>
              <div className="text-xl font-semibold text-accent-hover tracking-tight">
                {formatVndShort(networkStats.totalGmvEstimate)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-line/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink tracking-tight">
                  Danh Bạ Mạng Lưới KOC Đối Tác ({filteredKocs.length} KOC)
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-3 text-2xs">
                  Trang {cockpitPage}/{totalCockpitPages}
                </span>
                <button
                  type="button"
                  disabled={cockpitPage <= 1}
                  onClick={() => setCockpitPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded-md border border-line hover:bg-canvas disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={cockpitPage >= totalCockpitPages}
                  onClick={() => setCockpitPage(prev => Math.min(totalCockpitPages, prev + 1))}
                  className="p-1 rounded-md border border-line hover:bg-canvas disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas/75 border-b border-line text-2xs font-semibold text-ink-3">
                    <th className="py-3 px-4">KOC / Creator</th>
                    <th className="py-3 px-3">Cấp Bậc &amp; Cast Chuẩn</th>
                    <th className="py-3 px-3">Tệp Kênh</th>
                    <th className="py-3 px-3">Lịch Sử &amp; Hiệu Quả</th>
                    <th className="py-3 px-3">PIC Booking</th>
                    <th className="py-3 px-3">Hồ Sơ &amp; Pháp Lý</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedKocs.map((koc) => {
                    const kDeals = dealsOfKoc(deals, koc);
                    const kPerf = calculateKocPerformanceStats(deals, koc);
                    return (
                      <tr key={koc.id} className="hover:bg-canvas/60 transition group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={koc.stageName} size={36} />
                            <div className="min-w-0">
                              <div className="font-semibold text-ink group-hover:text-accent transition flex items-center gap-2">
                                <span>{koc.stageName}</span>
                                {koc.realName && (
                                  <span className="text-2xs font-normal text-ink-3">({koc.realName})</span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-3 flex items-center gap-2 mt-0.5 font-mono">
                                <span>@{koc.channelId.replace(/^@/, '')}</span>
                                <span>•</span>
                                <span>{formatFollowers(koc.followers)} flw</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-ink">
                              {koc.tierLabel || koc.tier} <span className="text-slate-300">·</span>{' '}
                              <span className="font-mono text-ink-2">{koc.salaryGrade}</span>
                            </div>
                            <div className="text-2xs text-ink-3 font-mono font-semibold">
                              {formatVndShort(koc.rateCardVideo || 3000000)}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-xs text-ink-2">
                            {koc.tepKenh || 'Chăm sóc da'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-0.5 text-2xs">
                            <div className="text-xs font-medium text-ink">
                              {koc.brandName || 'Đa nhãn'} <span className="text-slate-300">·</span>{' '}
                              <span className="text-ink-3 font-normal">{kDeals.length} chiến dịch</span>
                            </div>
                            <div className="text-ink-3 font-mono">
                              GMV: <strong className="text-ink">{formatVndShort(kPerf.totalGmv)}</strong> · ROI: <strong className="text-positive">{kPerf.overallRoi.toFixed(1)}x</strong>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-xs text-ink-2 font-medium">
                            {koc.bookingPic || 'Lê Phương Thảo'}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-1 text-2xs">
                            <Status tone={hasLegalId(koc) ? 'ok' : 'warn'}>
                              {hasLegalId(koc) ? `${LEGAL_TYPE_LABEL[legalTypeOf(koc)]}: Đủ giấy tờ` : 'Thiếu giấy tờ'}
                            </Status>
                            <div className="text-ink-3 font-mono">
                              {koc.bankName ? `${koc.bankName} · ${koc.bankAccount || '—'}` : `MST: ${koc.taxCode || 'Chưa có'}`}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onOpenKocMaster && (
                              <button
                                type="button"
                                onClick={() => onOpenKocMaster(koc.id)}
                                className="px-2 py-2 bg-sunken hover:bg-sunken text-ink-2 rounded-lg text-2xs font-medium transition"
                                title="Mở hồ sơ gốc tại Danh bạ KOC"
                              >
                                Danh bạ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedKocId(koc.id);
                                setViewMode('KOC_PORTAL');
                                notify(`Đang mở Cổng KOC: ${koc.stageName}`, 'info');
                              }}
                              className="px-3 py-2 bg-accent-soft hover:bg-accent text-accent-hover hover:text-white rounded-lg text-2xs font-semibold transition flex items-center gap-1"
                            >
                              <span>Mở cổng KOC</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-line/80 bg-canvas/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-ink-3 text-2xs">
                Hiển thị {paginatedKocs.length} trên tổng số {filteredKocs.length} KOC phù hợp bộ lọc
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cockpitPage <= 1}
                  onClick={() => setCockpitPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1 rounded-md border border-line bg-white hover:bg-canvas text-ink-2 text-2xs font-semibold disabled:opacity-40 transition"
                >
                  Trang Trước
                </button>
                {Array.from({ length: Math.min(5, totalCockpitPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCockpitPage(p)}
                      className={`w-7 h-7 rounded-md text-2xs font-semibold transition ${
                        cockpitPage === p
                          ? 'bg-accent text-white shadow-2xs'
                          : 'bg-white border border-line text-ink-2 hover:bg-canvas'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={cockpitPage >= totalCockpitPages}
                  onClick={() => setCockpitPage(prev => Math.min(totalCockpitPages, prev + 1))}
                  className="px-3 py-1 rounded-md border border-line bg-white hover:bg-canvas text-ink-2 text-2xs font-semibold disabled:opacity-40 transition"
                >
                  Trang Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isManagerOrStaff && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-accent-soft/70 border border-accent/80 px-4 py-3 rounded-xl text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('NETWORK_COCKPIT')}
                  className="font-semibold text-accent-hover hover:text-accent-hover flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại Bảng Giám Sát Mạng Lưới ({filteredKocs.length} KOC)</span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-ink-2">
                  Đang quản lý Cổng đối tác KOC: <strong className="text-ink">{activeKoc.stageName}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onOpenKocMaster && (
                  <button
                    type="button"
                    onClick={() => onOpenKocMaster(activeKoc.id)}
                    className="px-3 py-1 rounded-lg bg-white border border-accent/30 text-accent-hover hover:bg-accent-soft font-semibold text-2xs flex items-center gap-1 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Xem tại Danh bạ KOC</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Avatar name={activeKoc.stageName} src={activeKoc.avatarUrl} size={48} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-positive border-2 border-white rounded-full"></span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-ink tracking-tight">
                      {activeKoc.stageName}
                    </h2>
                    {activeKoc.realName && (
                      <span className="text-xs text-ink-3">({activeKoc.realName})</span>
                    )}
                    <span className="text-xs font-medium text-ink-2">
                      · {activeKoc.salaryGrade} · {activeKoc.segment}
                    </span>
                    <span className="font-mono text-xs text-ink-3">
                      · @{activeKoc.channelId.replace(/^@/, '')}
                    </span>
                    <Status tone={legalComplete ? 'ok' : 'warn'}>
                      {legalComplete ? `${LEGAL_TYPE_LABEL[legalType]} · Đủ pháp lý` : 'Thiếu hồ sơ pháp lý'}
                    </Status>
                  </div>
                  <p className="text-xs text-ink-3 mt-1">
                    Cast chuẩn: <strong className="text-ink font-mono">{formatVndShort(activeKoc.rateCardVideo || 3000000)}</strong> • Followers: <strong className="text-ink font-mono">{formatFollowers(activeKoc.followers)}</strong> • Ngân hàng: <strong className="text-ink-2">{activeKoc.bankName || 'Chưa cập nhật'} ({activeKoc.bankAccount || '—'})</strong> • Địa chỉ nhận mẫu: <span className="text-ink-2">{addressForm.address}</span> (
                    <button type="button" onClick={() => setActiveTab('PROFILE')} className="text-accent hover:underline font-medium">
                      Quản lý hồ sơ
                    </button>
                    )
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="px-3 py-2 bg-canvas hover:bg-sunken text-ink-2 border border-line rounded-lg text-xs font-medium flex items-center gap-2 transition"
                >
                  <QrCode className="w-3.5 h-3.5 text-positive" />
                  <span>Mã QR nhận thù lao</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOcrOpen(true)}
                  className="px-3 py-2 bg-canvas hover:bg-sunken text-ink-2 border border-line rounded-lg text-xs font-medium flex items-center gap-2 transition"
                >
                  <FileScan className="w-3.5 h-3.5 text-accent" />
                  <span>Đọc ảnh CCCD</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-line/80 pb-3 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tổng quan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'PROFILE'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Thông tin cá nhân &amp; Pháp lý{!legalComplete ? ' (Thiếu)' : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('APPROVALS')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'APPROVALS'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Cần xác nhận ({pendingActionCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE_JOBS')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ACTIVE_JOBS'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Công việc đang làm ({currentKocDeals.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONTRACTS')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'CONTRACTS'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Hợp đồng &amp; Thanh toán ({currentKocDeals.filter(d => d.status !== 'CANCELLED').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              <span>Lịch sử hợp tác ({currentKocDeals.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PERFORMANCE')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'PERFORMANCE'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Hiệu quả &amp; Chỉ số kênh</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DISCUSSION')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'DISCUSSION'
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-sunken'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Trao đổi</span>
            </button>
          </div>

          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Chiến dịch &amp; Lịch sử hợp tác</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-ink">{stats.totalJobs}</span>
                    <span className="text-2xs text-positive font-medium">{perfStats.completedDeals} đã lên sóng</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('HISTORY')}
                    className="text-2xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <span>Xem lịch sử hợp tác</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Hợp đồng &amp; Thù lao Cast</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-positive">{formatVndShort(stats.totalEarnings)}</span>
                    <span className="text-2xs text-ink-3">{stats.signedContractsCount}/{stats.acceptedJobs} HĐ đã ký</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONTRACTS')}
                    className="text-2xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <span>Quản lý hợp đồng &amp; duyệt chi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Doanh số GMV &amp; ROI tạo ra</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-semibold font-mono text-accent">{formatVndShort(perfStats.totalGmv)}</span>
                    <span className="text-2xs text-positive font-semibold font-mono">ROI {perfStats.overallRoi.toFixed(1)}x</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PERFORMANCE')}
                    className="text-2xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <span>Xem phân tích hiệu quả</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Hồ sơ pháp lý &amp; Nhận mẫu</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className={`text-sm font-semibold ${legalComplete ? 'text-positive' : 'text-warning'}`}>
                      {legalComplete ? 'Đã xác thực CCCD/MST' : 'Cần bổ sung giấy tờ'}
                    </span>
                    <span className="text-2xs text-ink-3">{stats.pendingSamples} mẫu đang giao</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PROFILE')}
                    className="text-2xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <span>Cập nhật thông tin cá nhân</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-line/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <span>Liên Thông Dữ Liệu Giữa Các Phân Hệ Vận Hành</span>
                    </h3>
                    
                  </div>
                  {onOpenKocMaster && (
                    <button
                      type="button"
                      onClick={() => onOpenKocMaster(activeKoc.id)}
                      className="px-3 py-2 rounded-lg bg-sunken hover:bg-sunken text-ink text-2xs font-semibold inline-flex items-center gap-2 transition self-start"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Hồ Sơ Tại Danh Bạ KOC</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-4 rounded-lg bg-canvas border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">1. Thông tin cá nhân</span>
                      <span className="text-2xs font-medium text-positive">Đồng bộ</span>
                    </div>
                    <p className="text-2xs text-ink-3">
                      CCCD: <strong className="font-mono text-ink-2">{legalIdOf(activeKoc) || 'Chưa có'}</strong> • NH: <strong className="text-ink-2">{activeKoc.bankName || '—'}</strong>
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-canvas border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">2. Hợp đồng &amp; Duyệt chi</span>
                      <span className="text-2xs font-medium text-positive">Đồng bộ</span>
                    </div>
                    <p className="text-2xs text-ink-3">
                      Đã ký: <strong className="font-mono text-ink-2">{stats.signedContractsCount} HĐ</strong> • Đã tạm ứng: <strong className="font-mono text-positive">{formatVndShort(stats.advancePaid)}</strong>
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-canvas border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">3. Lịch sử hợp tác</span>
                      <span className="text-2xs font-medium text-positive">Đồng bộ</span>
                    </div>
                    <p className="text-2xs text-ink-3">
                      Tổng: <strong className="font-mono text-ink-2">{currentKocDeals.length} deal</strong> • Điểm uy tín: <strong className="font-mono text-warning">{perfStats.avgRatingScore > 0 ? `${perfStats.avgRatingScore.toFixed(1)}/5.0` : '5.0/5.0'}</strong>
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-canvas border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">4. Hiệu quả &amp; Kênh</span>
                      <span className="text-2xs font-medium text-positive">Đồng bộ</span>
                    </div>
                    <p className="text-2xs text-ink-3">
                      GMV: <strong className="font-mono text-ink-2">{formatVndShort(perfStats.totalGmv)}</strong> • Đúng hạn đăng: <strong className="font-mono text-positive">{perfStats.onTimePostRate.toFixed(0)}%</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Thông tin KOC &amp; Hồ sơ pháp lý
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOcrOpen(true)}
                    className="px-3 py-2 rounded-lg border border-accent/30 bg-accent-soft hover:bg-accent-soft text-accent-hover text-xs font-semibold inline-flex items-center gap-2 transition"
                  >
                    <FileScan className="w-4 h-4" />
                    <span>Đọc ảnh CCCD / Giấy tờ</span>
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu &amp; Đồng Bộ Hồ Sơ</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h4 className="font-semibold text-ink text-xs flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent" />
                      <span>1. Thông Tin Kênh &amp; Định Giá Cast</span>
                    </h4>
                    <span className="font-mono text-2xs font-semibold text-ink-2">
                      {getSalaryGradeFromRate(Number(profileForm.rateCardVideo) || 0)} · {getSegmentFromSalaryGrade(getSalaryGradeFromRate(Number(profileForm.rateCardVideo) || 0))}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Nghệ danh / Tên kênh *</label>
                      <input
                        type="text"
                        required
                        value={profileForm.stageName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, stageName: e.target.value }))}
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent font-medium text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">ID Kênh TikTok (@handle) *</label>
                      <input
                        type="text"
                        required
                        value={profileForm.channelId}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, channelId: e.target.value }))}
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Số điện thoại liên hệ / Zalo *</label>
                      <input
                        type="tel"
                        required
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Email nhận hợp đồng điện tử</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Tệp kênh (Niche)</label>
                      <input
                        type="text"
                        value={profileForm.tepKenh}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, tepKenh: e.target.value as TepKenh }))}
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Ngành hàng thế mạnh</label>
                      <select
                        value={profileForm.kocCategory}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, kocCategory: e.target.value as KocCategory }))}
                        className="w-full px-3 py-2 border border-line rounded-lg bg-white focus:outline-none focus:border-accent text-ink"
                      >
                        <option value="Personal care">Personal care (Mỹ phẩm &amp; Chăm sóc cá nhân)</option>
                        <option value="Mom and baby">Mom and baby (Mẹ và bé)</option>
                        <option value="Fashion">Fashion (Thời trang)</option>
                        <option value="Lifestyle">Lifestyle (Đời sống &amp; Gia dụng)</option>
                        <option value="Reviewer">Reviewer (Đánh giá chuyên sâu)</option>
                        <option value="ELHA">ELHA (Điện tử &amp; Gia dụng)</option>
                        <option value="F&B">F&amp;B (Ẩm thực &amp; Sức khỏe)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">
                        Đơn giá Cast / Video (VNĐ) · {getSalaryGradeFromRate(Number(profileForm.rateCardVideo) || 0)}
                      </label>
                      <input
                        type="number"
                        step={500000}
                        value={profileForm.rateCardVideo}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, rateCardVideo: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono font-semibold focus:outline-none focus:border-accent text-positive"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Đơn giá Phiên Livestream (VNĐ)</label>
                      <input
                        type="number"
                        step={500000}
                        value={profileForm.rateCardLive}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, rateCardLive: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h4 className="font-semibold text-ink text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-positive" />
                      <span>2. Giấy Tờ Pháp Lý &amp; Mã Số Thuế (Dùng Soạn Hợp Đồng)</span>
                    </h4>
                    <Status tone={legalComplete ? 'ok' : 'warn'}>
                      {activeKoc.isOcrVerified ? 'Đã đọc ảnh CCCD' : legalComplete ? 'Đã có giấy tờ' : 'Chưa đủ giấy tờ'}
                    </Status>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Họ và tên pháp lý trên CCCD *</label>
                      <input
                        type="text"
                        value={profileForm.realName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, realName: e.target.value }))}
                        placeholder="VD: Nguyễn Thị Minh Thư"
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent font-medium text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Số CCCD (12 chữ số) *</label>
                      <input
                        type="text"
                        value={profileForm.cccd}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, cccd: e.target.value }))}
                        placeholder="00119900xxxx"
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Ngày sinh</label>
                      <input
                        type="text"
                        value={profileForm.dob}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Ngày cấp &amp; Nơi cấp CCCD</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={profileForm.issueDate}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, issueDate: e.target.value }))}
                          placeholder="Ngày cấp"
                          className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                        />
                        <input
                          type="text"
                          value={profileForm.issuePlace}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, issuePlace: e.target.value }))}
                          placeholder="Cục CS QLHC"
                          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Mã số thuế TNCN / Doanh nghiệp</label>
                      <input
                        type="text"
                        value={profileForm.taxCode}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, taxCode: e.target.value }))}
                        placeholder="MST cá nhân hoặc công ty"
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Tên Công ty / Hộ kinh doanh (Nếu có)</label>
                      <input
                        type="text"
                        value={profileForm.companyName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Để trống nếu ký cá nhân"
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-ink-2 font-medium mb-1">Địa chỉ thường trú trên CCCD / Trụ sở</label>
                      <input
                        type="text"
                        value={profileForm.permanentAddress}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, permanentAddress: e.target.value }))}
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h4 className="font-semibold text-ink text-xs flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-positive" />
                      <span>3. Tài Khoản Ngân Hàng Nhận Thù Lao &amp; Mã QR</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="text-2xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Xem Mã QR</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Ngân hàng thụ hưởng *</label>
                      <input
                        type="text"
                        value={profileForm.bankName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent font-medium text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Số tài khoản ngân hàng *</label>
                      <input
                        type="text"
                        value={profileForm.bankAccount}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                        placeholder="Nhập chính xác số tài khoản"
                        className="w-full px-3 py-2 border border-line rounded-lg font-mono font-semibold focus:outline-none focus:border-accent text-positive"
                      />
                    </div>
                    <div className="sm:col-span-2 p-3 rounded-lg bg-canvas border border-line flex items-center justify-between">
                      <div>
                        <span className="text-2xs text-ink-3 block">Chủ tài khoản thụ hưởng (theo tên pháp lý)</span>
                        <span className="font-semibold text-ink">
                          {profileForm.realName || profileForm.stageName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xs text-ink-3 block">Chế độ thuế áp dụng</span>
                        <span className="text-2xs font-semibold text-ink-2">
                          {profileForm.companyName ? 'Hóa đơn VAT (Doanh nghiệp/HKD)' : 'Khấu trừ 10% TNCN tại nguồn'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h4 className="font-semibold text-ink text-xs flex items-center gap-2">
                      <Package className="w-4 h-4 text-warning" />
                      <span>4. Địa Chỉ Nhận Hàng Mẫu &amp; Thông Số Sản Phẩm</span>
                    </h4>
                    <span className="text-2xs text-ink-3">Liên thông phân hệ Hàng mẫu</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-ink-2 font-medium mb-1">Địa chỉ giao nhận hàng mẫu (Shipper GHN/GHTK) *</label>
                      <input
                        type="text"
                        value={profileForm.shippingAddress}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, shippingAddress: e.target.value }))}
                        placeholder="Số nhà, ngõ, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Loại da / Tình trạng da</label>
                      <input
                        type="text"
                        value={profileForm.skinType}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, skinType: e.target.value }))}
                        placeholder="VD: Da dầu nhạy cảm"
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Size trang phục / Giày</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={profileForm.clothingSize}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, clothingSize: e.target.value }))}
                          placeholder="Áo: S/M/L"
                          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                        />
                        <input
                          type="text"
                          value={profileForm.shoeSize}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, shoeSize: e.target.value }))}
                          placeholder="Giày: 37"
                          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-ink-2 font-medium mb-1">Thông số bé (Mẹ &amp; Bé)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={profileForm.babyAgeMonths}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, babyAgeMonths: e.target.value }))}
                          placeholder="Tháng tuổi"
                          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                        />
                        <input
                          type="number"
                          value={profileForm.babyWeightKg}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, babyWeightKg: e.target.value }))}
                          placeholder="Cân nặng kg"
                          className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-ink-2 font-medium mb-1">Ghi chú dị ứng / Lưu ý gửi hàng mẫu</label>
                      <input
                        type="text"
                        value={profileForm.specialNotes}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, specialNotes: e.target.value }))}
                        placeholder="VD: Giao giờ hành chính, gọi trước khi giao, dị ứng hương liệu mạnh..."
                        className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:border-accent text-ink"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'APPROVALS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {pendingActionCount === 0 && (
                <div className="p-8 rounded-xl bg-white border border-line/80 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-positive-soft text-positive flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">
                      Tất cả các mục đã được xác nhận hoàn tất!
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACTIVE_JOBS')}
                    className="mt-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition"
                  >
                    <span>Xem công việc đang chạy</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {pendingActionCount > 0 && (
                <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-line flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-ink">
                        Hộp Việc Cần Xác Nhận &amp; Phản Hồi ({pendingActionCount} mục)
                      </h3>
                      
                    </div>
                  </div>

                  <div className="divide-y divide-line">
                    {currentKocDeals
                      .filter(d => (!d.kocResponseStatus || d.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG') && d.status === 'CONTACTING')
                      .map(deal => (
                        <div key={deal.id} className="p-4 hover:bg-canvas/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-hover font-semibold text-xs flex items-center justify-center shrink-0">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink text-xs">{deal.campaignTitle}</span>
                                <span className="text-2xs font-medium text-ink-3">
                                  · {deal.brandName}
                                </span>
                              </div>
                              <p className="text-xs text-ink-3 mt-0.5">
                                Sản phẩm: <span className="text-ink font-medium">{deal.productName}</span> • Mức cast: <strong className="text-positive font-mono text-sm">{formatVndShort(deal.totalValue || 3000000)}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleAcceptDeal(deal.id)}
                              className="px-3 py-2 rounded-lg bg-positive hover:bg-positive text-white font-semibold text-xs transition shadow-2xs"
                            >
                              Đồng Ý Nhận Job
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNegotiatingDeal(deal);
                                setCounterRate(deal.totalValue || activeKoc.rateCardVideo || 3000000);
                              }}
                              className="px-3 py-2 rounded-lg border border-line hover:bg-canvas text-ink-2 font-medium text-xs transition"
                            >
                              Đề Xuất Cast
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingDeal(deal)}
                              className="px-3 py-2 rounded-lg border border-critical/30 hover:bg-critical-soft text-critical font-medium text-xs transition"
                            >
                              Từ Chối
                            </button>
                          </div>
                        </div>
                      ))}

                    {currentKocDeals
                      .filter(d => d.status !== 'CANCELLED' && !d.contractCreatedAt && d.totalValue > 0)
                      .map(deal => (
                        <div key={`contract-${deal.id}`} className="p-4 hover:bg-canvas/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-positive-soft text-positive font-semibold text-xs flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink text-xs">Hợp đồng dịch vụ KOC: {deal.dealCode}</span>
                                <Status tone="warn">Chờ ký xác nhận</Status>
                              </div>
                              <p className="text-xs text-ink-3 mt-0.5">
                                Nhãn hàng: <strong>{deal.brandName}</strong> • Giá trị Gross: <strong className="font-mono text-ink">{formatVnd(deal.totalValue)}</strong> (Thực nhận Net: <strong className="font-mono text-positive">{formatVnd(Math.round(deal.totalValue * 0.9))}</strong>)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setPreviewContractDeal(deal)}
                              className="px-3 py-2 rounded-lg border border-line hover:bg-canvas text-ink-2 font-medium text-xs transition"
                            >
                              Xem hợp đồng
                            </button>
                            <button
                              type="button"
                              onClick={() => handleKocSignContract(deal)}
                              className="px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition shadow-2xs"
                            >
                              Ký xác nhận hợp đồng
                            </button>
                          </div>
                        </div>
                      ))}

                    {currentKocDeals
                      .filter(d => d.sampleStatus === 'ĐANG_GIAO')
                      .map(deal => (
                        <div key={`sample-${deal.id}`} className="p-4 hover:bg-canvas/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-warning-soft text-warning font-semibold text-xs flex items-center justify-center shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink text-xs">Kiện hàng mẫu: {deal.productName || 'Combo sản phẩm'}</span>
                                <span className="font-mono text-2xs text-ink-3">· {deal.jobId || 'GHN-89421'}</span>
                              </div>
                              <p className="text-xs text-ink-3 mt-0.5">
                                Nhãn hàng: <strong>{deal.brandName}</strong> • Giao đến: {addressForm.address}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleConfirmReceivedSample(deal.id)}
                            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition shadow-2xs shrink-0 self-end sm:self-auto"
                          >
                            <Check className="w-3.5 h-3.5 inline mr-1" />
                            Xác Nhận Đã Nhận Mẫu
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ACTIVE_JOBS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 bg-canvas p-2 rounded-xl border border-line/80 w-fit text-xs">
                <button
                  type="button"
                  onClick={() => setActiveJobsSubTab('DEALS')}
                  className={`px-3 py-2 rounded-lg font-medium transition ${
                    activeJobsSubTab === 'DEALS' ? 'bg-white text-ink font-semibold shadow-xs' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Danh sách Deals ({currentKocDeals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveJobsSubTab('SAMPLES')}
                  className={`px-3 py-2 rounded-lg font-medium transition ${
                    activeJobsSubTab === 'SAMPLES' ? 'bg-white text-ink font-semibold shadow-xs' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Hàng mẫu ({stats.pendingSamples})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveJobsSubTab('SUBMISSION')}
                  className={`px-3 py-2 rounded-lg font-medium transition ${
                    activeJobsSubTab === 'SUBMISSION' ? 'bg-white text-ink font-semibold shadow-xs' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Nộp Video &amp; Spark Ads
                </button>
              </div>

              {activeJobsSubTab === 'DEALS' && (
                <div className="space-y-3">
                  {currentKocDeals.map(deal => {
                    const isAccepted = deal.kocResponseStatus === 'ĐỒNG_Ý' || (deal.status !== 'CONTACTING' && deal.status !== 'CANCELLED');
                    const isNegotiating = deal.kocResponseStatus === 'ĐANG_THƯƠNG_LƯỢNG';
                    const isRejected = deal.kocResponseStatus === 'TỪ_CHỐI' || deal.status === 'CANCELLED';

                    return (
                      <div
                        key={deal.id}
                        className="bg-white rounded-xl border border-line/80 p-4 shadow-xs hover:border-line-strong transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-2xs text-ink-3">
                              {deal.dealCode || deal.jobId || 'DEAL-KOC'}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-2xs font-medium text-ink-2">
                              {deal.brandName}
                            </span>
                            {deal.storeName && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-2xs text-ink-3">{deal.storeName}</span>
                              </>
                            )}
                            <Status tone={isAccepted ? 'ok' : isNegotiating ? 'warn' : isRejected ? 'neutral' : 'info'}>
                              {isAccepted
                                ? 'Đã xác nhận hợp tác'
                                : isNegotiating
                                ? 'Đang đàm phán mức cast'
                                : isRejected
                                ? 'Đã từ chối'
                                : 'Chờ xác nhận'}
                            </Status>
                          </div>

                          <h3 className="text-sm font-semibold text-ink">{deal.campaignTitle}</h3>

                          <div className="text-xs text-ink-3 flex items-center gap-3 flex-wrap">
                            <span>Sản phẩm: <strong className="text-ink-2">{deal.productName || 'Combo sản phẩm'}</strong></span>
                            <span>•</span>
                            <span>Trụ cột: <strong className="text-accent">{deal.contentPillar || 'Review thực tế'}</strong></span>
                            <span>•</span>
                            <span>PIC: <strong className="text-ink-2">{deal.bookingPic || deal.assignedStaff}</strong></span>
                            <span>•</span>
                            <span>Hạn đăng: <strong className="text-ink-2 font-mono">{deal.slaDeadline || '2026-10-25'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-line pt-3 md:pt-0 md:pl-5 shrink-0 justify-between md:justify-end">
                          <div className="text-right">
                            <div className="text-2xs text-ink-3 font-semibold">Thù lao Cast</div>
                            <div className="text-base font-semibold font-mono text-positive">
                              {(deal.totalValue || 0) === 0 ? 'FOC 0đ' : formatVndShort(deal.totalValue || 0)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewContractDeal(deal)}
                              className="px-3 py-2 border border-line hover:bg-canvas text-ink-2 text-xs font-medium rounded-lg transition"
                            >
                              Xem hợp đồng
                            </button>

                            {!isAccepted && !isRejected && (
                              <button
                                type="button"
                                onClick={() => handleAcceptDeal(deal.id)}
                                className="px-3 py-2 bg-positive hover:bg-positive text-white text-xs font-semibold rounded-lg transition shadow-2xs"
                              >
                                Nhận Job
                              </button>
                            )}

                            {isAccepted && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmittingDeal(deal);
                                  setSubmissionForm({
                                    videoUrl: deal.tiktokVideoUrl || '',
                                    sparkAdsCode: deal.sparkAdsCode || '',
                                    scriptUrl: '',
                                    notes: ''
                                  });
                                }}
                                className="px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition flex items-center gap-2 shadow-2xs"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Nộp Video
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeJobsSubTab === 'SAMPLES' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-line/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-ink-3">Địa chỉ nhận hàng mẫu hiện tại: </span>
                      <strong className="text-ink">{addressForm.recipient} ({addressForm.phone}) — {addressForm.address}</strong>
                      {activeKoc.samplePreferences?.skinType && (
                        <span className="ml-2 text-2xs text-ink-2">
                          · Da: {activeKoc.samplePreferences.skinType}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingAddress(true)}
                      className="px-3 py-2 rounded-lg border border-line hover:bg-canvas text-ink-2 font-semibold text-2xs shrink-0"
                    >
                      Sửa địa chỉ nhận mẫu
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-canvas/50 text-ink-3 border-b border-line font-medium text-2xs">
                        <tr>
                          <th className="py-3 px-4">Chiến dịch &amp; Sản phẩm</th>
                          <th className="py-3 px-4">Nhãn hàng</th>
                          <th className="py-3 px-4">Mã vận đơn</th>
                          <th className="py-3 px-4 text-right">Giá trị mẫu</th>
                          <th className="py-3 px-4 text-center">Trạng thái</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {currentKocDeals.map(d => {
                          const isReceived = d.sampleStatus === 'ĐÃ_NHẬN';
                          const trackingCode = d.sampleTrackingCode || 'Chưa cập nhật';

                          return (
                            <tr key={d.id} className="hover:bg-canvas/40 transition">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-ink">{d.productName || 'Sản phẩm mẫu'}</div>
                                <div className="text-2xs text-ink-3">{d.campaignTitle}</div>
                              </td>
                              <td className="py-3 px-4 font-medium text-ink">{d.brandName}</td>
                              <td className="py-3 px-4 font-mono text-2xs text-accent font-semibold">
                                {trackingCode}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-ink-2">
                                {d.focSampleCost ? formatVndShort(d.focSampleCost) : '—'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Status tone={isReceived ? 'ok' : 'warn'}>
                                  {isReceived ? 'Đã nhận hàng' : 'Đang giao hàng'}
                                </Status>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {!isReceived ? (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmReceivedSample(d.id)}
                                    className="px-3 py-1 bg-positive hover:bg-positive text-white rounded text-2xs font-semibold transition"
                                  >
                                    Đã nhận được hàng
                                  </button>
                                ) : (
                                  <span className="text-2xs text-ink-3">Hạn nộp bài: {d.slaDeadline}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeJobsSubTab === 'SUBMISSION' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-line/80 shadow-xs">
                    <h3 className="text-xs font-semibold text-ink mb-4">Cổng Nộp Video Nghiệm Thu &amp; Mã Spark Ads</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentKocDeals.map(d => (
                        <div key={d.id} className="border border-line rounded-xl p-4 space-y-2 bg-canvas/50 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ink">{d.brandName} · <span className="font-mono text-ink-3 font-normal">{d.dealCode}</span></span>
                            <Status tone={d.tiktokVideoUrl ? 'ok' : 'warn'}>
                              {d.tiktokVideoUrl ? 'Đã nộp video' : 'Chưa nộp video'}
                            </Status>
                          </div>

                          <div className="font-semibold text-ink">{d.productName || d.campaignTitle}</div>

                          {d.tiktokVideoUrl && (
                            <div className="text-2xs font-mono text-ink-2 bg-white p-2 rounded border border-line truncate">
                              Link: <a href={d.tiktokVideoUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">{d.tiktokVideoUrl}</a>
                            </div>
                          )}

                          {d.sparkAdsCode && (
                            <div className="text-2xs font-mono text-positive truncate">
                              Spark Ads: {d.sparkAdsCode}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSubmittingDeal(d);
                              setSubmissionForm({
                                videoUrl: d.tiktokVideoUrl || '',
                                sparkAdsCode: d.sparkAdsCode || '',
                                scriptUrl: '',
                                notes: ''
                              });
                            }}
                            className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-2"
                          >
                            <Play className="w-3.5 h-3.5" />
                            {d.tiktokVideoUrl ? 'Cập nhật lại video / mã Ads' : 'Nộp video & mã Spark Ads'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'CONTRACTS' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Tổng giá trị Hợp đồng (Gross)</span>
                  <div className="text-lg font-semibold font-mono text-ink mt-1">
                    {formatVnd(stats.totalEarnings)}
                  </div>
                  <span className="text-2xs text-ink-3 mt-0.5 block">
                    Trên {currentKocDeals.filter(d => d.status !== 'CANCELLED').length} thỏa thuận hợp tác
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Thuế TNCN khấu trừ (10%)</span>
                  <div className="text-lg font-semibold font-mono text-warning mt-1">
                    {formatVnd(Math.round(stats.totalEarnings * 0.1))}
                  </div>
                  <span className="text-2xs text-ink-3 mt-0.5 block">
                    Kế toán Upbase kê khai &amp; nộp hộ
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Thực nhận sau thuế (Net 90%)</span>
                  <div className="text-lg font-semibold font-mono text-positive mt-1">
                    {formatVnd(Math.round(stats.totalEarnings * 0.9))}
                  </div>
                  <span className="text-2xs text-positive mt-0.5 block">
                    Chuyển khoản về {activeKoc.bankName || 'Ngân hàng'}
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs font-medium text-ink-3">Đã giải ngân tạm ứng / quyết toán</span>
                  <div className="text-lg font-semibold font-mono text-accent mt-1">
                    {formatVnd(stats.advancePaid)}
                  </div>
                  <span className="text-2xs text-ink-3 mt-0.5 block">
                    Còn chờ quyết toán: {formatVndShort(Math.max(0, Math.round(stats.totalEarnings * 0.9) - stats.advancePaid))}
                  </span>
                </div>
              </div>

              {/* KHỐI 1: LAYER HỒ SƠ PHÁP LÝ — HỢP ĐỒNG NGUYÊN TẮC (HĐNT KHUNG) */}
              <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink text-white text-2xs font-bold">1</span>
                      <h3 className="text-sm font-semibold text-ink">
                        Layer 1: Hồ sơ pháp lý &amp; Hợp đồng nguyên tắc khung ({kocLegalProfiles.length})
                      </h3>
                    </div>
                  </div>
                  {onOpenContractForKoc && (
                    <button
                      type="button"
                      onClick={() => onOpenContractForKoc(activeKoc)}
                      className="px-3 py-2 rounded-lg bg-ink hover:bg-ink text-white text-xs font-medium inline-flex items-center gap-2 transition self-start sm:self-auto"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Soạn HĐNT Khung</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas/75 text-ink-3 border-b border-line font-semibold text-2xs">
                      <tr>
                        <th className="py-3 px-4">Tên Hồ Sơ &amp; Nhãn Pháp Lý</th>
                        <th className="py-3 px-3">Chủ Thể Bên B</th>
                        <th className="py-3 px-3">Tài Khoản Ngân Hàng</th>
                        <th className="py-3 px-3">Số HĐNT Khung</th>
                        <th className="py-3 px-3 text-center">Tiến Độ Ký Số WeSign</th>
                        <th className="py-3 px-3 text-center">Trạng Thái HĐNT</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {kocLegalProfiles.map((profile, pIdx) => {
                        const linkedHdnt = kocContracts.find(
                          c => (documentOfTemplate(c.templateId) === 'HDNT' || c.templateId.includes('HDNT')) &&
                               (c.values?.['LEGAL_PROFILE_ID'] === profile.id || (!c.dealId && !c.dealCode))
                        );
                        const hdntCode = profile.frameworkContractCode || linkedHdnt?.id || (profile.frameworkContractStatus === 'ĐÃ_KÝ' ? `HĐNT-${activeKoc.id}-${profile.id}` : undefined);
                        const hdntStatus = profile.frameworkContractStatus || (linkedHdnt ? (linkedHdnt.approval === 'APPROVED' ? 'ĐÃ_KÝ' : 'CHỜ_KÝ') : 'CHƯA_CÓ_HĐNT');
                        const latestAttempt = linkedHdnt?.signing && linkedHdnt.signing.length > 0 ? linkedHdnt.signing[linkedHdnt.signing.length - 1] : undefined;
                        const progress = latestAttempt ? computeSigningProgress(latestAttempt) : null;
                        const isSigned = hdntStatus === 'ĐÃ_KÝ';

                        const legalTypeTag = profile.legalType === 'COMPANY'
                          ? { label: 'Doanh nghiệp / MCN', cls: 'bg-accent-soft text-accent-hover border-accent/30' }
                          : profile.legalType === 'HOUSEHOLD'
                            ? { label: 'Hộ kinh doanh', cls: 'bg-accent-soft text-accent-hover border-accent/30' }
                            : { label: 'Cá nhân', cls: 'bg-positive-soft text-positive border-positive/30' };

                        return (
                          <tr key={profile.id || `profile-${pIdx}`} className="hover:bg-canvas/60 transition">
                            <td className="py-3 px-4 font-medium text-ink">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{profile.holderName || profile.profileCode || `Hồ sơ #${pIdx + 1}`}</span>
                                <span className={`text-2xs px-2 py-0.5 rounded border font-medium ${legalTypeTag.cls}`}>
                                  {legalTypeTag.label}
                                </span>
                              </div>
                              <span className="text-2xs text-ink-3 block mt-0.5 font-mono">
                                Mã hồ sơ: {profile.profileCode || profile.id}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-ink-2">
                              <div className="font-medium">{profile.holderName || activeKoc.realName || activeKoc.stageName}</div>
                              <div className="text-2xs text-ink-3 font-mono mt-0.5">
                                {profile.legalType === 'INDIVIDUAL' && profile.cccd && (
                                  <span>CCCD: {profile.cccd}</span>
                                )}
                                {(profile.legalType === 'HOUSEHOLD' || profile.legalType === 'COMPANY') && profile.taxCode && (
                                  <span>MST: {profile.taxCode}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-ink-2">
                              <div className="font-mono text-2xs font-medium">
                                {profile.bankAccount || profile.bankAccountNumber || activeKoc.bankAccount || '—'}
                              </div>
                              <div className="text-2xs text-ink-3">
                                {profile.bankName || activeKoc.bankName || '—'}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {hdntCode ? (
                                <div className="font-mono text-xs font-semibold text-ink">
                                  {hdntCode}
                                </div>
                              ) : (
                                <span className="text-2xs text-ink-3 italic">Chưa ký HĐNT Khung</span>
                              )}
                              {profile.frameworkContractSignedAt && (
                                <div className="text-2xs text-ink-3 mt-0.5">
                                  Ký ngày: {profile.frameworkContractSignedAt}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {progress ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="w-20 bg-sunken rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full ${progress.progressPercent === 100 ? 'bg-positive' : 'bg-accent'}`}
                                      style={{ width: `${progress.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-2xs font-medium text-ink-2">
                                    {progress.completedCount}/{progress.totalCount} bên ký ({progress.progressPercent}%)
                                  </span>
                                </div>
                              ) : isSigned ? (
                                <span className="inline-flex items-center gap-1 text-2xs font-medium text-positive bg-positive-soft px-2 py-0.5 rounded">
                                  <Check className="w-3.5 h-3.5 text-positive" />
                                  <span>2/2 bên đã ký</span>
                                </span>
                              ) : (
                                <span className="text-2xs text-ink-3">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {isSigned ? (
                                <Status tone="ok">Đã ký HĐNT</Status>
                              ) : hdntStatus === 'CHỜ_KÝ' ? (
                                <Status tone="warn">Chờ WeSign</Status>
                              ) : (
                                <Status tone="neutral">Chưa có HĐNT</Status>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {profile.frameworkContractDriveUrl && (
                                  <a
                                    href={profile.frameworkContractDriveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 rounded-lg border border-line hover:bg-canvas text-ink-2 text-2xs font-semibold transition"
                                  >
                                    Xem file
                                  </a>
                                )}
                                {onOpenContractForKoc && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenContractForKoc(activeKoc, profile.id)}
                                    className="px-2 py-1 rounded-lg bg-sunken hover:bg-sunken text-ink text-2xs font-medium transition inline-flex items-center gap-1"
                                    title="Mở soạn / xem HĐNT Khung tại phân hệ Hợp đồng"
                                  >
                                    <span>{isSigned ? 'Mở HĐNT' : 'Soạn HĐNT'}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KHỐI 2: LAYER DEAL & BOOKING — PHỤ LỤC SOW & BIÊN BẢN NGHIỆM THU (BBNT) */}
              <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink text-white text-2xs font-bold">2</span>
                      <h3 className="text-sm font-semibold text-ink">
                        Layer 2: Phụ lục SOW &amp; Nghiệm thu BBNT theo Booking / Deal ({currentKocDeals.filter(d => d.status !== 'CANCELLED').length})
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="px-3 py-2 rounded-lg border border-line hover:bg-canvas text-ink-2 text-xs font-medium flex items-center gap-2 transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-positive" />
                      <span>Mã QR thụ hưởng</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas/75 text-ink-3 border-b border-line font-semibold text-2xs">
                      <tr>
                        <th className="py-3 px-4">Mã Deal / Chiến Dịch</th>
                        <th className="py-3 px-3">Hồ Sơ Pháp Lý Bên B</th>
                        <th className="py-3 px-3">HĐNT Khung Kế Thừa</th>
                        <th className="py-3 px-3 text-right">Giá Trị Gross</th>
                        <th className="py-3 px-3 text-right">Thực Nhận Net (90%)</th>
                        <th className="py-3 px-3 text-center">Tiến Độ Ký Phụ Lục SOW</th>
                        <th className="py-3 px-3 text-center">Trạng Thái BBNT</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {currentKocDeals
                        .filter(d => d.status !== 'CANCELLED')
                        .map((deal, idx) => {
                          const linkedSow = kocContracts.find(
                            c => (documentOfTemplate(c.templateId) === 'SOW' || c.templateId.includes('SOW')) &&
                                 (c.dealId === deal.id || c.dealCode === deal.dealCode)
                          );
                          const linkedBbnt = kocContracts.find(
                            c => (documentOfTemplate(c.templateId) === 'BBNT' || c.templateId.includes('BBNT')) &&
                                 (c.dealId === deal.id || c.dealCode === deal.dealCode)
                          );

                          // Resolve active legal profile for this deal
                          const dealProfile = kocLegalProfiles.find(p => p.id === deal.legalProfileId) || kocLegalProfiles[0];
                          const inheritedHdntCode = deal.masterContractCode || dealProfile?.frameworkContractCode || `HĐNT-${activeKoc.id}`;

                          const sowLatestAttempt = linkedSow?.signing && linkedSow.signing.length > 0 ? linkedSow.signing[linkedSow.signing.length - 1] : undefined;
                          const sowProgress = sowLatestAttempt ? computeSigningProgress(sowLatestAttempt) : null;
                          const isSowSigned = linkedSow?.approval === 'APPROVED' || deal.status === 'COMPLETED' || deal.status === 'FINAL_PAID';
                          const isBbntSigned = linkedBbnt?.approval === 'APPROVED' || deal.status === 'COMPLETED';

                          const grossValue = deal.totalValue || 0;
                          const netValue = Math.round(grossValue * 0.9);

                          return (
                            <tr key={deal.id || `deal-${idx}`} className="hover:bg-canvas/60 transition">
                              <td className="py-3 px-4">
                                <div className="font-mono text-xs font-semibold text-ink">
                                  {deal.dealCode || `DEAL-${idx + 1}`}
                                </div>
                                <div className="text-2xs text-ink-2 mt-0.5 line-clamp-1 font-medium">
                                  {deal.brandName || 'Nhãn hàng'} — {deal.campaignTitle || deal.campaignCode || 'Chiến dịch'}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                {dealProfile ? (
                                  <div>
                                    <div className="font-medium text-ink">{dealProfile.holderName || dealProfile.profileCode}</div>
                                    <div className="text-2xs text-ink-3 mt-0.5">
                                      {dealProfile.legalType === 'INDIVIDUAL'
                                        ? `Cá nhân (${dealProfile.cccd ? `CCCD: ${dealProfile.cccd}` : 'Chưa có CCCD'})`
                                        : `HKD/DN (${dealProfile.taxCode ? `MST: ${dealProfile.taxCode}` : 'Chưa có MST'})`}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-2xs text-ink-3 italic">Mặc định theo KOC</span>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-mono text-2xs font-medium text-ink-2">
                                  {inheritedHdntCode}
                                </div>
                                <div className="text-2xs text-positive flex items-center gap-0.5 mt-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>HĐNT Khung hợp lệ</span>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-ink">
                                {formatVnd(grossValue)}
                              </td>

                              <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-positive">
                                {formatVnd(netValue)}
                              </td>

                              <td className="py-3 px-3 text-center">
                                {sowProgress ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <div className="w-16 bg-sunken rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full ${sowProgress.progressPercent === 100 ? 'bg-positive' : 'bg-accent'}`}
                                        style={{ width: `${sowProgress.progressPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-2xs font-medium text-ink-2">
                                      {sowProgress.completedCount}/{sowProgress.totalCount} bên ({sowProgress.progressPercent}%)
                                    </span>
                                  </div>
                                ) : isSowSigned ? (
                                  <span className="inline-flex items-center gap-1 text-2xs font-medium text-positive bg-positive-soft px-2 py-0.5 rounded">
                                    <Check className="w-3.5 h-3.5 text-positive" />
                                    <span>Đã ký SOW</span>
                                  </span>
                                ) : (
                                  <Status tone="warn">Chờ ký SOW</Status>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center">
                                {isBbntSigned ? (
                                  <Status tone="ok">Đã nghiệm thu ✓</Status>
                                ) : isSowSigned ? (
                                  <Status tone="warn">Chờ nghiệm thu</Status>
                                ) : (
                                  <span className="text-2xs text-ink-3">—</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewContractDeal(deal)}
                                    className="px-2 py-1 rounded-lg border border-line hover:bg-canvas text-ink-2 text-2xs font-semibold transition"
                                  >
                                    Xem
                                  </button>

                                  {onOpenContractForDeal && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenContractForDeal(deal, isSowSigned ? 'BBNT' : 'SOW')}
                                      className="px-2 py-1 rounded-lg bg-sunken hover:bg-sunken text-ink text-2xs font-medium transition inline-flex items-center gap-1"
                                      title={isSowSigned ? 'Lập Biên bản nghiệm thu BBNT' : 'Soạn Phụ lục SOW'}
                                    >
                                      <span>{isSowSigned ? 'Nghiệm thu' : 'Soạn SOW'}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs text-ink-3">Tổng chiến dịch</span>
                  <div className="text-base font-semibold font-mono text-ink mt-0.5">
                    {perfStats.totalDeals} chiến dịch
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs text-ink-3">Video đã lên sóng</span>
                  <div className="text-base font-semibold font-mono text-positive mt-0.5">
                    {perfStats.completedDeals} video
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs text-ink-3">Tổng đầu tư (Cast + FOC + Ads)</span>
                  <div className="text-base font-semibold font-mono text-ink mt-0.5">
                    {formatVndShort(perfStats.totalInvestment)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs text-ink-3">Tổng GMV tạo ra</span>
                  <div className="text-base font-semibold font-mono text-accent mt-0.5">
                    {formatVndShort(perfStats.totalGmv)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-line/80 shadow-xs">
                  <span className="text-2xs text-ink-3">Điểm đánh giá hợp tác</span>
                  <div className="text-base font-semibold font-mono text-warning mt-0.5 flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span>{perfStats.avgRatingScore > 0 ? perfStats.avgRatingScore.toFixed(1) : '5.0'} / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-line/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm mã deal, chiến dịch, sản phẩm..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <select
                    value={historyBrandFilter}
                    onChange={(e) => setHistoryBrandFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-line bg-white text-ink-2 font-medium focus:outline-none"
                  >
                    <option value="ALL">Tất cả nhãn hàng ({historyBrands.length})</option>
                    {historyBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 bg-sunken p-1 rounded-lg">
                    {(
                      [
                        { key: 'ALL', label: 'Tất cả' },
                        { key: 'PAID', label: 'Video trả phí (Paid)' },
                        { key: 'FOC', label: 'Gửi mẫu miễn phí (FOC 0đ)' },
                        { key: 'LIVE', label: 'Livestream' }
                      ] as const
                    ).map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setHistoryFormatFilter(item.key)}
                        className={`px-3 py-1 rounded-md text-2xs font-semibold transition ${
                          historyFormatFilter === item.key
                            ? 'bg-white text-ink shadow-2xs'
                            : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-2xs text-ink-3">
                  Hiển thị {filteredHistoryDeals.length} / {currentKocDeals.length} bản ghi hợp tác
                </span>
              </div>

              <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas/75 text-ink-3 border-b border-line font-semibold text-2xs">
                      <tr>
                        <th className="py-3 px-4">Chiến Dịch &amp; Sản Phẩm</th>
                        <th className="py-3 px-3">Hình Thức &amp; Ngày Đăng</th>
                        <th className="py-3 px-3 text-right">Đầu Tư (Cast / FOC / Ads)</th>
                        <th className="py-3 px-3 text-right">Kết Quả (GMV / Đơn / ROI)</th>
                        <th className="py-3 px-3">Tuân Thủ SLA &amp; Đánh Giá</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredHistoryDeals.map(deal => {
                        const gmv = deal.affiliateGmv || deal.gmv30 || 0;
                        const isFoc = (deal.totalValue || 0) === 0;
                        const invest = (deal.totalValue || 0) + (deal.focSampleCost || 0) + (deal.adCost || 0);
                        const roi = invest > 0 ? gmv / invest : deal.roi || 0;

                        return (
                          <tr key={deal.id} className="hover:bg-canvas/50 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 flex-wrap text-2xs">
                                <span className="font-mono text-ink-3">
                                  {deal.dealCode}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="font-medium text-ink-2">
                                  {deal.brandName}
                                </span>
                                {deal.storeName && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-ink-3">{deal.storeName}</span>
                                  </>
                                )}
                              </div>
                              <div className="font-semibold text-ink mt-1">{deal.campaignTitle}</div>
                              <div className="text-2xs text-ink-3">
                                SP: {deal.productName} • PIC: {deal.bookingPic || deal.assignedStaff}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                <div className="text-xs font-medium text-ink">
                                  {isFoc ? 'Suất gửi mẫu miễn phí (FOC 0đ)' : 'Video KOC trả phí (Paid)'}
                                </div>
                                <div className="text-2xs text-ink-3 font-mono">
                                  Ngày đăng: {deal.postedDate || deal.slaDeadline || '—'}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono">
                              <div className="font-semibold text-ink">
                                Cast: {isFoc ? '0 đ' : formatVndShort(deal.totalValue || 0)}
                              </div>
                              <div className="text-2xs text-ink-3">
                                Mẫu: {formatVndShort(deal.focSampleCost || 0)} · Ads: {formatVndShort(deal.adCost || 0)}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono">
                              <div className="font-semibold text-accent">{formatVndShort(gmv)}</div>
                              <div className="text-2xs text-ink-3">
                                {deal.ordersCount || 0} đơn · <strong className="text-positive">ROI {roi.toFixed(1)}x</strong>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-1 text-2xs">
                                <div className="flex items-center gap-2">
                                  <Status tone={deal.isPostOnTime !== false ? 'ok' : 'err'}>
                                    {deal.isPostOnTime !== false ? 'Đúng hạn SLA' : 'Trễ SLA'}
                                  </Status>
                                  {deal.ratingScore && (
                                    <span className="font-mono font-semibold text-warning">
                                      {deal.ratingScore.toFixed(1)}/5.0
                                    </span>
                                  )}
                                </div>
                                {(deal.picCollabReview || deal.brandFeedback) && (
                                  <p className="text-ink-3 truncate max-w-[220px]" title={deal.picCollabReview || deal.brandFeedback}>
                                    &ldquo;{deal.picCollabReview || deal.brandFeedback}&rdquo;
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedHistoryDeal(deal);
                                    setKocSelfFeedback(deal.holdingReason || '');
                                  }}
                                  className="px-3 py-1 rounded-lg bg-sunken hover:bg-sunken text-ink-2 text-2xs font-semibold transition"
                                >
                                  Chi tiết
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewContractDeal(deal)}
                                  className="px-3 py-1 rounded-lg border border-line hover:bg-canvas text-ink-2 text-2xs font-medium transition"
                                >
                                  Hợp đồng
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PERFORMANCE' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span>1. Hiệu Quả Thương Mại &amp; Tuân Thủ SLA Lũy Kế ({perfStats.totalDeals} Chiến Dịch)</span>
                    </h3>
                    
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMetricsModalOpen(true)}
                    className="px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold inline-flex items-center gap-2 transition self-start"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cập nhật chỉ số kênh TikTok</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-canvas border border-line">
                    <span className="text-2xs text-ink-3 block">Tổng GMV tạo ra</span>
                    <span className="text-base font-semibold font-mono text-accent mt-1 block">
                      {formatVndShort(perfStats.totalGmv)}
                    </span>
                    <span className="text-2xs text-ink-3">
                      TB {formatVndShort(perfStats.totalDeals > 0 ? Math.round(perfStats.totalGmv / perfStats.totalDeals) : 0)}/video
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-canvas border border-line">
                    <span className="text-2xs text-ink-3 block">ROI tổng hợp</span>
                    <span className="text-base font-semibold font-mono text-positive mt-1 block">
                      {perfStats.overallRoi.toFixed(2)}x
                    </span>
                    <span className="text-2xs text-ink-3">Đầu tư: {formatVndShort(perfStats.totalInvestment)}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-canvas border border-line">
                    <span className="text-2xs text-ink-3 block">Tổng đơn hàng (Orders)</span>
                    <span className="text-base font-semibold font-mono text-ink mt-1 block">
                      {perfStats.totalOrders.toLocaleString('vi-VN')} đơn
                    </span>
                    <span className="text-2xs text-ink-3">CPO: {formatVndShort(perfStats.avgCpo)}/đơn</span>
                  </div>

                  <div className="p-4 rounded-xl bg-canvas border border-line">
                    <span className="text-2xs text-ink-3 block">Đúng hạn kịch bản</span>
                    <span className="text-base font-semibold font-mono text-positive mt-1 block">
                      {perfStats.onTimeScriptRate.toFixed(0)}%
                    </span>
                    <span className="text-2xs text-ink-3">SLA nộp kịch bản</span>
                  </div>

                  <div className="p-4 rounded-xl bg-canvas border border-line">
                    <span className="text-2xs text-ink-3 block">Đúng hạn lên sóng</span>
                    <span className="text-base font-semibold font-mono text-positive mt-1 block">
                      {perfStats.onTimePostRate.toFixed(0)}%
                    </span>
                    <span className="text-2xs text-ink-3">SLA đăng video</span>
                  </div>

                  <div className="p-4 rounded-xl bg-canvas border border-line">
                    <span className="text-2xs text-ink-3 block">Cấp mã Spark Ads</span>
                    <span className="text-base font-semibold font-mono text-accent mt-1 block">
                      {perfStats.sparkComplianceRate.toFixed(0)}%
                    </span>
                    <span className="text-2xs text-ink-3">Ủy quyền chạy Ads</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-line/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      2. Bóc Tách Doanh Số Tự Nhiên (Organic) &amp; Quảng Cáo (Spark Ads) Theo Video
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas/75 text-ink-3 border-b border-line font-semibold text-2xs">
                      <tr>
                        <th className="py-3 px-4">Mã Deal &amp; Video</th>
                        <th className="py-3 px-3">Mã Spark Ads</th>
                        <th className="py-3 px-3 text-right">Lượt Xem (Views)</th>
                        <th className="py-3 px-3 text-right">Organic GMV</th>
                        <th className="py-3 px-3 text-right">Chi Phí Ads</th>
                        <th className="py-3 px-3 text-right">Spark Ads GMV</th>
                        <th className="py-3 px-3 text-right">ROAS Ads</th>
                        <th className="py-3 px-4 text-right">Giữ Chân (Hook 2s / Xem hết)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {currentKocDeals.map(deal => {
                        const totalGmv = deal.affiliateGmv || deal.gmv30 || 0;
                        const adGmv = deal.adGmv ?? Math.round(totalGmv * 0.45);
                        const organicGmv = Math.max(0, totalGmv - adGmv);
                        const adCost = deal.adCost ?? Math.round((deal.totalValue || 2000000) * 0.3);
                        const roas = deal.adRoas ?? (adCost > 0 ? adGmv / adCost : 0);

                        return (
                          <tr key={deal.id} className="hover:bg-canvas/50 transition">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-ink">{deal.productName || deal.campaignTitle}</div>
                              <div className="text-2xs text-ink-3 font-mono">{deal.dealCode} • {deal.brandName}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-2xs">
                              {deal.sparkAdsCode ? (
                                <span className="text-positive font-semibold">
                                  {deal.sparkAdsCode}
                                </span>
                              ) : (
                                <span className="text-ink-3">Chưa cấp mã</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-ink">
                              {(deal.viewsCount || activeKoc.avgViews || 28000).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                              {formatVndShort(organicGmv)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-warning">
                              {formatVndShort(adCost)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-accent">
                              {formatVndShort(adGmv)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-positive">
                              {roas.toFixed(1)}x
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-2xs text-ink-2">
                              Hook: <strong>{deal.adHookRate2s ?? 38}%</strong> · Full: <strong>{deal.adCompletionRate ?? 16}%</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                <div className="lg:col-span-2 bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h4 className="font-semibold text-ink flex items-center gap-2">
                      <Award className="w-4 h-4 text-accent" />
                      <span>3. Chỉ Số Kênh TikTok Seller Center (30 Ngày Gần Nhất)</span>
                    </h4>
                    <span className="text-2xs text-ink-3">
                      Cập nhật: {activeKoc.metricsUpdatedAt ? new Date(activeKoc.metricsUpdatedAt).toLocaleDateString('vi-VN') : 'Hôm nay'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-canvas border border-line">
                      <span className="text-2xs text-ink-3 block">Followers kênh</span>
                      <span className="text-sm font-semibold font-mono text-ink mt-0.5 block">
                        {formatFollowers(activeKoc.followers)}
                      </span>
                      <span className="text-2xs text-positive font-mono">
                        +{activeKoc.tiktokFollowerGrowth30d ?? 12.5}% (30d)
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-canvas border border-line">
                      <span className="text-2xs text-ink-3 block">GMV Kênh 30 ngày</span>
                      <span className="text-sm font-semibold font-mono text-accent mt-0.5 block">
                        {formatVndShort(activeKoc.recentRevenue ?? (perfStats.totalGmv || 120000000))}
                      </span>
                      <span className="text-2xs text-ink-3 font-mono">
                        GPM: {formatVndShort(activeKoc.gpm ?? 185000)}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-canvas border border-line">
                      <span className="text-2xs text-ink-3 block">Tỷ lệ CTR &amp; CVR</span>
                      <span className="text-sm font-semibold font-mono text-positive mt-0.5 block">
                        CTR {activeKoc.tiktokAvgCtr ?? 4.8}% · CVR {activeKoc.tiktokAvgCvr ?? 3.6}%
                      </span>
                      <span className="text-2xs text-ink-3 font-mono">
                        AOV: {formatVndShort(activeKoc.aov ?? 265000)}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-canvas border border-line">
                      <span className="text-2xs text-ink-3 block">Điểm uy tín &amp; Hoàn hủy</span>
                      <span className="text-sm font-semibold font-mono text-warning mt-0.5 block">
                        {activeKoc.tiktokShopRating ?? 4.8} / 5.0
                      </span>
                      <span className="text-2xs text-ink-3 font-mono">
                        Tỷ lệ hủy: {activeKoc.tiktokCancellationRate ?? 2.4}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-2xs font-medium text-ink-2">
                      <span>Cơ cấu GMV theo định dạng nội dung</span>
                      <span className="font-mono">
                        Video {activeKoc.gmvShareVideo ?? 75}% · Live {activeKoc.gmvShareLive ?? 20}% · Trưng bày {activeKoc.gmvShareProductCard ?? 5}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-sunken overflow-hidden flex">
                      <div
                        style={{ width: `${activeKoc.gmvShareVideo ?? 75}%` }}
                        className="bg-accent h-full"
                        title="Video gắn giỏ hàng"
                      />
                      <div
                        style={{ width: `${activeKoc.gmvShareLive ?? 20}%` }}
                        className="bg-positive h-full"
                        title="Livestream"
                      />
                      <div
                        style={{ width: `${activeKoc.gmvShareProductCard ?? 5}%` }}
                        className="bg-amber-400 h-full"
                        title="Kệ trưng bày"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-line/80 p-5 shadow-xs space-y-4">
                  <div className="border-b border-line pb-3">
                    <h4 className="font-semibold text-ink">Chân Dung Khán Giả Kênh</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-2xs mb-1">
                        <span className="text-ink-2">Tỷ lệ Nữ / Nam</span>
                        <span className="font-mono font-semibold text-ink">
                          Nữ {activeKoc.femaleRatio ?? 82}% · Nam {activeKoc.maleRatio ?? 18}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-sunken overflow-hidden flex">
                        <div style={{ width: `${activeKoc.femaleRatio ?? 82}%` }} className="bg-critical h-full" />
                        <div style={{ width: `${activeKoc.maleRatio ?? 18}%` }} className="bg-accent h-full" />
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <span className="text-2xs text-ink-3 block">Phân bổ độ tuổi người mua</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-canvas border border-line">
                          <span className="text-2xs text-ink-3 block">18 - 24</span>
                          <span className="font-mono font-semibold text-ink">{activeKoc.age18_24 ?? 40}%</span>
                        </div>
                        <div className="p-2 rounded-lg bg-canvas border border-line">
                          <span className="text-2xs text-ink-3 block">25 - 34</span>
                          <span className="font-mono font-semibold text-accent">{activeKoc.age25_34 ?? 48}%</span>
                        </div>
                        <div className="p-2 rounded-lg bg-canvas border border-line">
                          <span className="text-2xs text-ink-3 block">35+</span>
                          <span className="font-mono font-semibold text-ink">{activeKoc.age35Plus ?? 12}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DISCUSSION' && (
            <PartnerDiscussion family="KOC" root={`koc:${activeKoc.id}`} actorId={currentUser?.id || 'guest'} />
          )}
        </div>
      )}

      <LegalOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onApplyToContract={handleApplyOcrToProfile}
        initialPreset="CCCD_INDIVIDUAL"
      />

      <Modal
        open={Boolean(previewContractDeal)}
        onClose={() => setPreviewContractDeal(null)}
        title="Hợp Đồng Dịch Vụ Sản Xuất Nội Dung & Quảng Bá Nhãn Hàng"
        size="xl"
        footer={
          previewContractDeal ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-2xs text-ink-3">
                Đối tác xem và xác nhận trực tuyến bằng mã OTP / Chữ ký số
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPreviewContractDeal(null)}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleKocSignContract(previewContractDeal)}
                >
                  Ký xác nhận hợp đồng
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {previewContractDeal && (
          <div className="space-y-4 text-xs leading-relaxed text-ink-2">
            <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3 pb-2 border-b border-line font-mono">
              <span>Mã Deal: <strong className="text-ink">{previewContractDeal.dealCode}</strong></span>
              <span>·</span>
              <span className="font-sans">Chiến dịch: <strong className="text-ink">{previewContractDeal.campaignTitle}</strong></span>
            </div>

            <div className="text-center space-y-1 border-b border-line pb-4">
              <div className="font-semibold text-ink">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="text-2xs text-ink-3">Độc lập - Tự do - Hạnh phúc</div>
              <h4 className="text-sm font-semibold text-ink pt-2">
                HỢP ĐỒNG DỊCH VỤ QUẢNG BÁ THƯƠNG HIỆU (BOOKING KOC/KOL)
              </h4>
              <div className="font-mono text-2xs text-accent">
                Số: HĐ-B2C-2026/{previewContractDeal.dealCode}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-canvas border border-line/80 space-y-1">
                <div className="font-semibold text-ink">BÊN A (BÊN THUÊ DỊCH VỤ):</div>
                <div><strong>CÔNG TY CỔ PHẦN CÔNG NGHỆ UPBASE</strong></div>
                <div>Mã số thuế: <span className="font-mono">0109876543</span></div>
                <div>Đại diện: <strong>Bà Đặng Thị Yến Nhi</strong> — Giám Đốc Marketing B2C</div>
                <div>Chuyên viên phụ trách (PIC): <strong>{previewContractDeal.bookingPic || previewContractDeal.assignedStaff}</strong></div>
              </div>

              <div className="p-4 rounded-xl bg-accent-soft/50 border border-accent/80 space-y-1">
                <div className="font-semibold text-ink">BÊN B (ĐỐI TÁC SÁNG TẠO / KOC):</div>
                <div>Họ và tên pháp lý: <strong>{activeKoc.realName || activeKoc.stageName}</strong> (Kênh: @{activeKoc.channelId.replace(/^@/, '')})</div>
                <div>Số CCCD / ĐKKD: <strong className="font-mono">{legalIdOf(activeKoc) || 'Chưa cập nhật'}</strong></div>
                <div>Mã số thuế: <span className="font-mono">{activeKoc.taxCode || 'Chưa cập nhật'}</span></div>
                <div>Địa chỉ: {activeKoc.permanentAddress || activeKoc.shippingAddress || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-canvas border border-line/80 space-y-2">
              <div className="font-semibold text-ink">ĐIỀU KHOẢN HỢP TÁC &amp; ĐỊNH MỨC THÙ LAO:</div>
              <ul className="list-disc pl-4 space-y-1 text-2xs text-ink-2">
                <li>Bên B thực hiện sản xuất <strong>01 Video TikTok</strong> quảng bá sản phẩm theo đúng Brief và Kịch bản được duyệt.</li>
                <li>Thời lượng video cam kết từ <strong>45s - 60s</strong>, gắn link giỏ hàng chính hãng của nhãn <strong>{previewContractDeal.brandName}</strong>.</li>
                <li>Mức thù lao thỏa thuận trọn gói: <strong className="text-ink font-mono text-xs">{formatVnd(previewContractDeal.totalValue || 0)}</strong> (Đã bao gồm thuế TNCN 10% do Bên A khấu trừ và nộp thay theo luật định).</li>
                <li>Thực nhận sau thuế: <strong className="text-accent font-mono text-xs">{formatVnd(Math.round((previewContractDeal.totalValue || 0) * 0.9))}</strong>.</li>
                <li>Thời hạn thanh toán: Trong vòng <strong>07 ngày làm việc</strong> sau khi Video lên sóng đạt nghiệm thu và KOC hoàn tất đối soát link.</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(selectedHistoryDeal)}
        onClose={() => setSelectedHistoryDeal(null)}
        title={selectedHistoryDeal ? `Chi Tiết Chiến Dịch Hợp Tác: ${selectedHistoryDeal.dealCode}` : 'Chi Tiết Chiến Dịch'}
        size="xl"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="ghost" onClick={() => setSelectedHistoryDeal(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {selectedHistoryDeal && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3 pb-2 border-b border-line">
              <span>Nhãn hàng: <strong className="text-ink">{selectedHistoryDeal.brandName}</strong></span>
              <span>·</span>
              <span>Chiến dịch: <strong className="text-ink">{selectedHistoryDeal.campaignTitle}</strong></span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-sans">Thù lao Cast</span>
                <strong className="text-ink">{formatVnd(selectedHistoryDeal.totalValue || 0)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-sans">Lượt xem</span>
                <strong className="text-ink">{(selectedHistoryDeal.viewsCount || selectedHistoryDeal.views30 || 0).toLocaleString()}</strong>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-sans">GMV mang về</span>
                <strong className="text-positive">{formatVnd(selectedHistoryDeal.affiliateGmv || selectedHistoryDeal.gmv30 || 0)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-canvas border border-line">
                <span className="text-2xs text-ink-3 block font-sans">Đánh giá sao</span>
                <strong className="text-ink font-mono inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current text-warning" />
                  <span>{(selectedHistoryDeal.ratingScore || 5).toFixed(1)} / 5.0</span>
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-ink-2 block">Đánh giá từ Brand / Account Upbase:</label>
              <div className="p-3 rounded-lg bg-canvas text-ink-2 text-xs italic border border-line">
                &ldquo;{selectedHistoryDeal.brandFeedback || selectedHistoryDeal.accountComment || 'Video lên sóng đúng hạn, chỉ số tương tác tự nhiên tốt và tương tác giỏ hàng cao.'}&rdquo;
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="font-semibold text-ink-2 block">Phản hồi của KOC về chiến dịch này:</label>
              <textarea
                rows={2}
                value={kocSelfFeedback}
                onChange={(e) => setKocSelfFeedback(e.target.value)}
                placeholder="Gửi cảm nhận về sản phẩm hoặc quá trình làm việc cùng nhãn..."
                className="w-full text-xs p-3 rounded-lg border border-line focus:outline-none focus:border-accent"
              />
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    commitDealUpdate(
                      {
                        ...selectedHistoryDeal,
                        contentNote: kocSelfFeedback.trim()
                          ? `[Phản hồi KOC]: ${kocSelfFeedback.trim()}`
                          : selectedHistoryDeal.contentNote,
                      },
                      'Đã gửi phản hồi chiến dịch đến Account Upbase!'
                    );
                    setSelectedHistoryDeal(null);
                  }}
                >
                  Lưu phản hồi
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Mã QR Nhận Thù Lao KOC"
        size="sm"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="ghost" onClick={() => setIsQrModalOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div className="text-center space-y-4">
          <div className="p-4 rounded-xl bg-canvas border border-line inline-flex flex-col items-center space-y-2">
            <QrCode className="w-28 h-28 text-ink" />
            <span className="text-2xs font-mono text-positive font-semibold">
              Chuẩn chuyển khoản Napas 247
            </span>
          </div>

          <div className="text-xs space-y-1 text-ink-2">
            <div className="font-semibold text-ink">{activeKoc.realName || activeKoc.stageName}</div>
            <div className="font-mono text-sm font-semibold text-accent">{activeKoc.bankAccount || 'Chưa cập nhật STK'}</div>
            <div className="text-ink-3">{activeKoc.bankName || 'Chưa cập nhật ngân hàng'}</div>
          </div>
        </div>
      </Modal>

      <Modal
        open={isMetricsModalOpen}
        onClose={() => setIsMetricsModalOpen(false)}
        title="Cập Nhật Chỉ Số Kênh TikTok Seller"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setIsMetricsModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSaveChannelMetrics()}
            >
              Lưu &amp; Đồng bộ chỉ số
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveChannelMetrics} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-ink-2 font-medium mb-1">Followers hiện tại</label>
              <input
                type="number"
                value={metricsForm.followers}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, followers: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-line rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">View trung bình / video</label>
              <input
                type="number"
                value={metricsForm.avgViews}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, avgViews: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-line rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">GMV Kênh 30 ngày (VNĐ)</label>
              <input
                type="number"
                value={metricsForm.tiktokGmv30d}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, tiktokGmv30d: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-line rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-ink-2 font-medium mb-1">GPM (GMV / 1.000 views)</label>
              <input
                type="number"
                value={metricsForm.gpm}
                onChange={(e) => setMetricsForm(prev => ({ ...prev, gpm: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-line rounded-lg font-mono text-xs"
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(negotiatingDeal)}
        onClose={() => setNegotiatingDeal(null)}
        title="Đề xuất mức thù lao Cast"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setNegotiatingDeal(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleNegotiateDeal}
            >
              Gửi đề xuất
            </Button>
          </div>
        }
      >
        {negotiatingDeal && (
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-ink-3">Chiến dịch:</span> <strong className="text-ink">{negotiatingDeal.campaignTitle}</strong>
            </div>

            <div>
              <label className="block text-ink-2 font-semibold mb-1">Mức thù lao mong muốn (VND)</label>
              <input
                type="number"
                step="500000"
                value={counterRate}
                onChange={(e) => setCounterRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm font-mono font-semibold focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-ink-2 font-semibold mb-1">Ghi chú gửi Account Upbase</label>
              <textarea
                rows={3}
                placeholder="Lý do đề xuất..."
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(rejectingDeal)}
        onClose={() => setRejectingDeal(null)}
        title="Từ chối lời mời hợp tác"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setRejectingDeal(null)}
            >
              Đóng
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectDeal}
            >
              Xác nhận từ chối
            </Button>
          </div>
        }
      >
        {rejectingDeal && (
          <div className="space-y-3 text-xs">
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg bg-white text-xs focus:outline-none"
            >
              <option value="Lệch định hướng kênh / không phù hợp sản phẩm">Lệch định hướng kênh / không phù hợp sản phẩm</option>
              <option value="Đã kẹt lịch air / không kịp timeline tháng này">Đã kẹt lịch air / không kịp timeline tháng này</option>
              <option value="Xung đột hợp đồng độc quyền với đối thủ nhãn hàng">Xung đột hợp đồng độc quyền với đối thủ nhãn hàng</option>
              <option value="Mức cast chưa phù hợp với yêu cầu sản xuất">Mức cast chưa phù hợp với yêu cầu sản xuất</option>
            </select>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(submittingDeal)}
        onClose={() => setSubmittingDeal(null)}
        title="Nộp Video Demo & Mã Spark Ads"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setSubmittingDeal(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => handleSubmitVideoDemo()}
            >
              Xác nhận nộp video
            </Button>
          </div>
        }
      >
        {submittingDeal && (
          <form onSubmit={handleSubmitVideoDemo} className="space-y-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3 pb-2 border-b border-line">
              <span>Nhãn hàng: <strong className="text-ink">{submittingDeal.brandName}</strong></span>
              <span>·</span>
              <span>Sản phẩm: <strong className="text-ink">{submittingDeal.productName}</strong></span>
            </div>

            <div>
              <label className="block text-ink-2 font-semibold mb-1">Link Video Demo (Google Drive / TikTok) *</label>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/... hoặc https://vt.tiktok.com/..."
                value={submissionForm.videoUrl}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-ink-2 font-semibold mb-1">Mã ủy quyền Spark Ads Code (TikTok)</label>
              <input
                type="text"
                placeholder="VD: 7412894723984729384..."
                value={submissionForm.sparkAdsCode}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, sparkAdsCode: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-lg font-mono text-xs focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-ink-2 font-semibold mb-1">Ghi chú cho Brand / Content Lead</label>
              <textarea
                rows={2}
                placeholder="Lưu ý về góc quay, thời điểm xuất hiện sản phẩm..."
                value={submissionForm.notes}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(editingAddress)}
        onClose={() => setEditingAddress(false)}
        title="Cập nhật địa chỉ nhận hàng mẫu"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setEditingAddress(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const updatedKoc: KocItem = {
                  ...activeKoc,
                  realName: addressForm.recipient || activeKoc.realName,
                  phone: addressForm.phone || activeKoc.phone,
                  shippingAddress: addressForm.address
                };
                setEditingAddress(false);
                commitKocUpdate(updatedKoc, 'Đã cập nhật địa chỉ giao hàng mẫu và đồng bộ sang phân hệ Hàng mẫu!');
              }}
            >
              Lưu địa chỉ
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-ink-2 font-semibold mb-1">Họ tên người nhận</label>
            <input
              type="text"
              value={addressForm.recipient}
              onChange={(e) => setAddressForm(prev => ({ ...prev, recipient: e.target.value }))}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-semibold mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={addressForm.phone}
              onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-ink-2 font-semibold mb-1">Địa chỉ chi tiết</label>
            <textarea
              rows={2}
              value={addressForm.address}
              onChange={(e) => setAddressForm(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none text-xs"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};


function buildProfileForm(koc: KocItem) {
  return {
    stageName: koc.stageName || '',
    realName: koc.realName || '',
    channelId: koc.channelId || '',
    phone: koc.phone || '',
    email: koc.email || '',
    tepKenh: (koc.tepKenh || koc.creatorCategory || 'Beauty') as TepKenh,
    kocCategory: (koc.kocCategory || 'Personal care') as KocCategory,
    rateCardVideo: koc.rateCardVideo || 3000000,
    rateCardLive: koc.rateCardLive || Math.round((koc.rateCardVideo || 3000000) * 1.5),
    cccd: koc.cccd || '',
    dob: koc.dob || '',
    issueDate: koc.issueDate || '',
    issuePlace: koc.issuePlace || '',
    permanentAddress: koc.permanentAddress || '',
    taxCode: koc.taxCode || '',
    companyName: koc.companyName || '',
    legalRepresentative: koc.legalRepresentative || '',
    bankName: koc.bankName || '',
    bankAccount: koc.bankAccount || '',
    shippingAddress: koc.shippingAddress || koc.permanentAddress || '',
    skinType: koc.samplePreferences?.skinType || '',
    clothingSize: koc.samplePreferences?.clothingSize || '',
    shoeSize: koc.samplePreferences?.shoeSize || '',
    babyAgeMonths: koc.samplePreferences?.babyAgeMonths ? String(koc.samplePreferences.babyAgeMonths) : '',
    babyWeightKg: koc.samplePreferences?.babyWeightKg ? String(koc.samplePreferences.babyWeightKg) : '',
    specialNotes: koc.samplePreferences?.specialNotes || ''
  };
}
