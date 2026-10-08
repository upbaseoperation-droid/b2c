'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Zap, 
  ShieldCheck, 
  Eye, 
  Star, 
  Filter, 
  TrendingUp, 
  Flame, 
  Video, 
  CheckCircle2, 
  DollarSign, 
  ExternalLink,
  Layers,
  Award,
  Clock,
  Package,
  AlertTriangle,
  Sparkles,
  Edit3,
  Check,
  X,
  Share2,
  HelpCircle,
  TrendingDown,
  UserCheck,
  UserPlus,
  MapPin,
  ShoppingBag,
  Users,
  Truck,
  Target,
  Crown,
  Calculator
} from 'lucide-react';
import { 
  KocItem, 
  BookingDealItem, 
  SalaryGrade, 
  CreatorNiche, 
  CreatorSegment, 
  KocCategory, 
  TepKenh, 
  KocCandidateItem,
  StaffDetailedPlanItem,
  MonthlyStaffAllocation,
  UserProfile
} from '../../lib/types';
import { 
  INITIAL_KOCS, 
  BOOKING_STAFF_PROGRESS_26, 
  INITIAL_KOC_CANDIDATES,
  INITIAL_DETAILED_STAFF_PLANS,
  INITIAL_STAFF_ALLOCATIONS_26
} from '../../lib/mockData';
import { KocProfileModal } from '../KocProfileModal';
import { CreateKocModal } from '../CreateKocModal';
import { MyPlanWorkspace } from '../MyPlanWorkspace';
import { Avatar, Button, Chips, ConfirmDialog, DataTable, EmptyState, Field, FilterBar, Input, Modal, Panel, Person, Segmented, Select, Stat, StatRow, Status, Tabs, Textarea } from '../ui';
import type { StatusTone } from '../ui';
import { formatNumber, formatPercent, formatVnd, formatVndShort } from '../../lib/format';

interface BookingViewProps {
  deals: BookingDealItem[];
  kocs?: KocItem[];
  currentUser?: UserProfile;
  onOpenQuickBookWithKoc: (koc: KocItem) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onUpdateDeal?: (updatedDeal: BookingDealItem) => void;
  onKocCreated?: (newKoc: KocItem) => void;
  planItems?: StaffDetailedPlanItem[];
  onAddPlanItem?: (newItem: any) => void;
  onUpdatePlanItem?: (item: any) => void;
  onDeletePlanItem?: (itemId: string) => void;
  onSubmitPlanToLead?: (staffName: string) => void;
  onConvertPlanItemToDeal?: (item: StaffDetailedPlanItem) => void;
  staffAllocations?: MonthlyStaffAllocation[];
  currentUserName?: string;
  onOpenInputPlan?: () => void;
}

export const BookingView: React.FC<BookingViewProps> = ({ 
  deals,
  kocs,
  currentUser,
  onOpenQuickBookWithKoc,
  onSelectDealForContract,
  onUpdateDeal,
  onKocCreated,
  planItems: externalPlanItems,
  onAddPlanItem: externalOnAddPlanItem,
  onUpdatePlanItem: externalOnUpdatePlanItem,
  onDeletePlanItem: externalOnDeletePlanItem,
  onSubmitPlanToLead: externalOnSubmitPlanToLead,
  onConvertPlanItemToDeal,
  staffAllocations: externalStaffAllocations,
  currentUserName,
  onOpenInputPlan
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'MY_PLAN' | 'CANDIDATES' | 'BOOKING_DEALS' | 'KOC_DIRECTORY'>('MY_PLAN');
  const [candidates, setCandidates] = useState<KocCandidateItem[]>(INITIAL_KOC_CANDIDATES);
  const [candidateFilter, setCandidateFilter] = useState<string>('ALL');

  // Plan Items State
  const [localPlanItems, setLocalPlanItems] = useState<StaffDetailedPlanItem[]>(externalPlanItems || INITIAL_DETAILED_STAFF_PLANS);

  React.useEffect(() => {
    if (externalPlanItems) {
      setLocalPlanItems(externalPlanItems);
    }
  }, [externalPlanItems]);


  // Local KOC list state (allows dynamic creation)
  const [localKocs, setLocalKocs] = useState<KocItem[]>(kocs || INITIAL_KOCS);
  const [isCreateKocOpen, setIsCreateKocOpen] = useState(false);

  React.useEffect(() => {
    if (kocs) setLocalKocs(kocs);
  }, [kocs]);

  const handleCreateKocSuccess = (newKoc: KocItem) => {
    setLocalKocs(prev => [newKoc, ...prev]);
    if (onKocCreated) {
      onKocCreated(newKoc);
    }
  };

  // Active Booking Staff Context (Cho phép nhân viên chọn danh tính của mình để xem KPI cá nhân)
  const [selectedStaffName, setSelectedStaffName] = useState<string>(
    currentUser?.role === 'BOOKING_MEMBER' ? currentUser.name : (currentUserName || 'Khánh Vy')
  );

  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'BOOKING_MEMBER') {
        setSelectedStaffName(currentUser.name);
      } else if (currentUser.role === 'MANAGER' && !selectedStaffName) {
        setSelectedStaffName('Khánh Vy');
      }
    } else if (currentUserName) {
      setSelectedStaffName(currentUserName);
    }
  }, [currentUser, currentUserName]);

  // Search & 4 Phân loại cốt lõi KOC Directory (Sheet 3.1 & 3.2 & 5.4 & 5.6)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKL, setSelectedKL] = useState<string>('ALL'); // 1. Khung lương
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL'); // 2. Segment
  const [selectedKocCategory, setSelectedKocCategory] = useState<string>('ALL'); // 3. KOC Category
  const [selectedTepKenh, setSelectedTepKenh] = useState<string>('ALL'); // 4. Tệp kênh
  const [selectedCreatorNiche, setSelectedCreatorNiche] = useState<string>('ALL');
  const [inspectedKoc, setInspectedKoc] = useState<KocItem | null>(null);

  // Filters for Booking Deals
  const [dealsFilter, setDealsFilter] = useState<'ALL' | 'BRAND_PENDING' | 'BRAND_APPROVED' | 'BRAND_REJECTED' | 'WINNER_TOP20' | 'HAS_GMV' | 'BREAK_EVEN' | 'OVERDUE_SLA' | 'ADS_CODE_PENDING'>('ALL');
  const [dealsSearch, setDealsSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');

  // Modal Editing Deal State
  const [editingDeal, setEditingDeal] = useState<BookingDealItem | null>(null);
  const [editForm, setEditForm] = useState<{
    brandApprovalStatus: 'ĐÃ_DUYỆT' | 'CHỜ_DUYỆT' | 'TỪ_CHỐI';
    brandRejectReason: string;
    pipelineText: string;
    sampleStatus: 'CHƯA_GỬI' | 'ĐANG_GIAO' | 'ĐÃ_NHẬN';
    adsCodeStatus: 'CHƯA_CẤP' | 'ĐÃ_NGHIỆM_THU' | 'KHÔNG_DÙNG';
    tiktokVideoUrl: string;
    viewsCount: number;
    gmv30: number;
    status: BookingDealItem['status'];
    statusLabel: string;
  }>({
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    brandRejectReason: '',
    pipelineText: 'Kịch bản',
    sampleStatus: 'ĐÃ_NHẬN',
    adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
    tiktokVideoUrl: '',
    viewsCount: 0,
    gmv30: 0,
    status: 'VIDEO_SUBMITTED',
    statusLabel: 'Video Đã Lên Sóng'
  });

  // State for Growth Handoff Modal (Bàn giao quét mã Spark Ads & setup Ads)
  const [handoffDeal, setHandoffDeal] = useState<BookingDealItem | null>(null);
  const [rejectingDeal, setRejectingDeal] = useState<BookingDealItem | null>(null);
  const [autoAirDeal, setAutoAirDeal] = useState<BookingDealItem | null>(null);
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
      authDuration: '60 ngày',
      clientCommitmentStatus: 'ĐÃ_CHỐT_NGÂN_SÁCH_ADS',
      growthNote: `Video đã được Brand duyệt đạt chuẩn. Đề xuất team Growth triển khai quét mã Ads và gắn sản phẩm giỏ hàng TikTok Shop.`
    });
  };

  const handleConfirmGrowthHandoff = () => {
    if (!handoffDeal) return;
    const updated: BookingDealItem = {
      ...handoffDeal,
      growthHandoffStatus: 'ĐÃ_GIAO_MÃ_ADS',
      currentStage: '4_AIR_GROWTH',
      holdingTeam: 'GROWTH',
      holdingReason: 'Team Growth đang quét mã Ads & setup campaign',
      adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
      sparkAdsCode: handoffForm.sparkAdsCode,
      tiktokVideoUrl: handoffForm.tiktokVideoUrl,
      pipelineText: 'Bàn giao Growth Ads'
    };

    if (onUpdateDeal) {
      onUpdateDeal(updated);
    }
    setHandoffDeal(null);
  };

  // ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHandoffDeal(null);
        setEditingDeal(null);
      }
    };
    if (handoffDeal || editingDeal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handoffDeal, editingDeal]);

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
    { key: 'TAP đối tác ngoài', label: 'TAP Ngoài (MCN)' },
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
    { key: 'Thời trang (review)', label: 'Thời trang (review)' },
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

  // Creator Niches List backward compatibility
  const creatorNiches = [
    { key: 'ALL', label: 'Tất cả tệp Creator' },
    { key: 'Review Nữ', label: 'Review Nữ' },
    { key: 'Review Nam', label: 'Review Nam' },
    { key: 'Mẹ bé', label: 'Mẹ bé' },
    { key: 'Gia đình', label: 'Gia đình' },
    { key: 'Beauty', label: 'Beauty' },
    { key: 'Bác sĩ/chuyên gia', label: 'Bác sĩ / chuyên gia' },
    { key: 'Unboxing', label: 'Unboxing' },
  ];

  // Brands / Gian hàng (from Image 8)
  const brandsList = [
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

  const filteredKocs = localKocs.filter((koc) => {
    const matchKL = selectedKL === 'ALL' || koc.salaryGrade === selectedKL;
    const matchSegment = selectedSegment === 'ALL' || koc.segment === selectedSegment;
    const matchKocCat = selectedKocCategory === 'ALL' || koc.kocCategory === selectedKocCategory;
    const effectiveTep = selectedTepKenh !== 'ALL' ? selectedTepKenh : selectedCreatorNiche;
    const matchTep = effectiveTep === 'ALL' || koc.tepKenh === effectiveTep || koc.creatorCategory === effectiveTep;
    const matchSearch =
      koc.stageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      koc.channelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      koc.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (koc.tepKenh && koc.tepKenh.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (koc.kocCategory && koc.kocCategory.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (koc.segment && koc.segment.toLowerCase().includes(searchTerm.toLowerCase())) ||
      koc.phone.includes(searchTerm);
    return matchKL && matchSegment && matchKocCat && matchTep && matchSearch;
  });

  const filteredDeals = deals.filter((deal) => {
    const matchSearch = 
      deal.dealCode.toLowerCase().includes(dealsSearch.toLowerCase()) ||
      deal.kocStageName.toLowerCase().includes(dealsSearch.toLowerCase()) ||
      deal.campaignTitle.toLowerCase().includes(dealsSearch.toLowerCase()) ||
      (deal.productName && deal.productName.toLowerCase().includes(dealsSearch.toLowerCase())) ||
      (deal.brandName && deal.brandName.toLowerCase().includes(dealsSearch.toLowerCase()));
    
    if (!matchSearch) return false;

    if (selectedBrandFilter !== 'ALL' && deal.brandName !== selectedBrandFilter) return false;

    if (dealsFilter === 'BRAND_PENDING') return deal.brandApprovalStatus === 'CHỜ_DUYỆT';
    if (dealsFilter === 'BRAND_APPROVED') return deal.brandApprovalStatus === 'ĐÃ_DUYỆT';
    if (dealsFilter === 'BRAND_REJECTED') return deal.brandApprovalStatus === 'TỪ_CHỐI';
    if (dealsFilter === 'WINNER_TOP20') return deal.isWinnerTop20;
    if (dealsFilter === 'HAS_GMV') return (deal.gmv30 || 0) > 0;
    if (dealsFilter === 'BREAK_EVEN') return (deal.roi || 0) >= 1.0;
    if (dealsFilter === 'OVERDUE_SLA') return deal.isSlaWarning;
    if (dealsFilter === 'ADS_CODE_PENDING') return deal.adsCodeStatus === 'CHƯA_CẤP';
    return true;
  });

  // Tìm thông tin tiến độ cá nhân từ bảng 26 nhân sự
  const personalStaffProgress = BOOKING_STAFF_PROGRESS_26.find(s => s.staffName.includes(selectedStaffName)) || {
    staffName: selectedStaffName,
    planVideos: 50,
    reportVideos: 38,
    airProgress: 76,
    planBudget: 150000000,
    reportBudget: 125000000,
    budgetProgress: 83,
    isLagging: false
  };

  // Quick Brand Approval Action (One-click)
  const handleQuickBrandApproval = (deal: BookingDealItem, status: 'ĐÃ_DUYỆT' | 'TỪ_CHỐI', reason = '') => {
    const rejectReason = reason || 'Lệch định vị thương hiệu';

    const updatedDeal: BookingDealItem = {
      ...deal,
      brandApprovalStatus: status,
      brandApprovalDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      brandRejectReason: status === 'TỪ_CHỐI' ? rejectReason : undefined,
      pipelineText: status === 'ĐÃ_DUYỆT' ? 'Đã tạo BO' : 'Brand từ chối',
      status: status === 'ĐÃ_DUYỆT' ? 'CONTRACT_GENERATED' : 'CANCELLED',
      statusLabel: status === 'ĐÃ_DUYỆT' ? 'Brand Đã Duyệt (Tạo HĐ & Cọc)' : `Brand Từ Chối (${rejectReason})`
    };

    if (onUpdateDeal) {
      onUpdateDeal(updatedDeal);
    }
  };

  const handleOpenEditModal = (deal: BookingDealItem) => {
    setEditingDeal(deal);
    setEditForm({
      brandApprovalStatus: deal.brandApprovalStatus || 'ĐÃ_DUYỆT',
      brandRejectReason: deal.brandRejectReason || '',
      pipelineText: deal.pipelineText || 'Kịch bản',
      sampleStatus: deal.sampleStatus || 'ĐÃ_NHẬN',
      adsCodeStatus: deal.adsCodeStatus || 'ĐÃ_NGHIỆM_THU',
      tiktokVideoUrl: deal.tiktokVideoUrl || deal.videoUrl || '',
      viewsCount: deal.viewsCount || 0,
      gmv30: deal.gmv30 || 0,
      status: deal.status,
      statusLabel: deal.statusLabel
    });
  };

  const handleSaveDealUpdate = () => {
    if (!editingDeal) return;
    const newGmv = Number(editForm.gmv30) || 0;
    const totalCost = editingDeal.totalValue || 1;
    const computedRoi = Number((newGmv / totalCost).toFixed(2));
    const isWinner = newGmv >= 30000000;
    const isBreakEven = computedRoi >= 1.0;

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

    const updatedDeal: BookingDealItem = {
      ...editingDeal,
      brandApprovalStatus: editForm.brandApprovalStatus,
      brandRejectReason: editForm.brandApprovalStatus === 'TỪ_CHỐI' ? editForm.brandRejectReason : undefined,
      pipelineText: editForm.pipelineText,
      sampleStatus: editForm.sampleStatus,
      adsCodeStatus: editForm.adsCodeStatus,
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
      statusLabel: updatedStatusLabel
    };

    if (onUpdateDeal) {
      onUpdateDeal(updatedDeal);
    }
    setEditingDeal(null);
  };

  return (
    <div className="space-y-6">
      {/* Tiến độ cá nhân */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
        {currentUser?.role === 'MANAGER' ? (
          <label className="inline-flex items-center gap-2">
            <span className="text-ink-3">Xem kế hoạch của</span>
            <select
              value={selectedStaffName}
              onChange={(e) => setSelectedStaffName(e.target.value)}
              className="h-8 px-2 rounded-md border border-line-strong bg-surface text-ink font-medium focus:outline-none"
            >
              {(externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26).map(a => (
                <option key={a.id} value={a.staffName}>{a.staffName}</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="font-medium text-ink">{selectedStaffName}</span>
        )}
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
      </div>

      {/* Tab và thao tác */}
      <div className="flex flex-col-reverse lg:flex-row lg:items-end justify-between gap-3">
        <Tabs
          className="flex-1"
          value={activeSubTab}
          onChange={setActiveSubTab}
          items={[
            { key: 'MY_PLAN', label: 'Kế hoạch của tôi' },
            { key: 'CANDIDATES', label: 'Sàng lọc KOC', count: candidates.length },
            { key: 'BOOKING_DEALS', label: 'Hợp đồng & tạm ứng', count: deals.length },
            { key: 'KOC_DIRECTORY', label: 'Danh bạ KOC', count: localKocs.length },
          ]}
        />
        <div className="flex items-center gap-2 lg:pb-2">
          {onOpenInputPlan && (
            <Button icon={Calculator} onClick={onOpenInputPlan}>Phân rã kế hoạch</Button>
          )}
          <Button icon={UserPlus} onClick={() => setIsCreateKocOpen(true)}>Thêm KOC</Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 0: MY DETAILED PLAN WORKSPACE (NHÂN VIÊN LẬP VÀ TRIỂN KHAI PLAN) */}
      {/* ========================================================================= */}
      {activeSubTab === 'MY_PLAN' && (
        <MyPlanWorkspace
          currentStaffName={selectedStaffName}
          allocation={(externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26).find(a => a.staffName.includes(selectedStaffName)) || (externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26)[0]}
          planItems={localPlanItems}
          kocs={localKocs}
          onAddPlanItem={(newItem) => {
            const created = {
              ...newItem,
              id: `plan-item-${Date.now()}`,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
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
      )}

      {/* ========================================================================= */}
      {/* TAB: SÀNG LỌC KOC                                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'CANDIDATES' && (() => {
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
              <Stat label="Ứng viên" value={candidates.length} note="Đang theo dõi trong tháng" />
              <Stat label="Đã ký booking" value={`${converted}/${candidates.length}`} progress={{ value: converted, max: candidates.length || 1, target: 0.3 }} note={`Tỷ lệ chốt ${formatPercent(converted / (candidates.length || 1), 0)}`} />
              <Stat label="Đang trao đổi" value={inProgress} note="Phản hồi trong 24 giờ" />
              <Stat label="Từ chối" value={rejected} note="Lệch tệp hoặc vượt khung giá" tone={rejected > 0 ? 'warning' : undefined} />
            </StatRow>

            <Panel flush title="Ứng viên KOC" description="Theo dõi từ lúc liên hệ đến khi ký booking">
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
                empty={<EmptyState title="Không có ứng viên ở trạng thái này" description="Chọn “Tất cả” để xem toàn bộ danh sách." />}
                columns={[
                  {
                    key: 'koc', header: 'KOC', width: 220, render: c => (
                      <div className="leading-tight">
                        <div className="font-medium text-ink">{c.stageName}</div>
                        <a href={c.channelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs text-ink-3 hover:text-accent mt-0.5">
                          {c.channelId}<ExternalLink className="w-3 h-3" />
                        </a>
                        <div className="text-2xs text-ink-3 font-code mt-0.5">{c.candidateCode}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'tier', header: 'Hạng', width: 160, render: c => (
                      <div className="leading-tight">
                        <div className="text-ink">{c.tierLabel}</div>
                        <div className="text-2xs text-ink-3 mt-0.5 tabular-nums">{formatNumber(c.followers)} follower · {formatNumber(c.avgViews)} view</div>
                      </div>
                    ),
                  },
                  {
                    key: 'brand', header: 'Nhãn hàng', width: 180, render: c => (
                      <div className="leading-tight">
                        <div className="text-ink">{c.brandName}</div>
                        <div className="text-2xs text-ink-3 mt-0.5">{c.storeName || 'Mọi gian hàng'}</div>
                      </div>
                    ),
                  },
                  { key: 'price', header: 'Giá đề xuất', align: 'right', width: 120, render: c => <span className="tabular-nums">{formatVndShort(c.rateCardExpected)}</span> },
                  { key: 'pic', header: 'PIC', width: 160, render: c => <Person name={c.assignedPic} sub={c.pitchBatch || 'Đợt 1'} size={22} /> },
                  {
                    key: 'status', header: 'Trạng thái', width: 170, render: c => {
                      const st = OUTREACH[c.outreachStatus] || { label: c.outreachStatus, tone: 'neutral' as StatusTone };
                      return (
                        <div className="grid gap-1 justify-items-start">
                          <Status tone={st.tone}>{st.label}</Status>
                          {c.outreachStatus === 'CONVERTED_TO_BOOKING' && c.convertedBookingId && <span className="text-2xs text-ink-3 font-code">{c.convertedBookingId}</span>}
                          {c.outreachStatus === 'REJECTED' && c.rejectionReason && <span className="text-2xs text-ink-3 max-w-[200px] whitespace-normal">{c.rejectionReason}</span>}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actions', header: <span className="sr-only">Thao tác</span>, align: 'right', width: 130, render: c =>
                      c.outreachStatus !== 'CONVERTED_TO_BOOKING' && c.outreachStatus !== 'REJECTED' ? (
                        <Button size="sm" onClick={() => setCandidates(prev => prev.map(x => x.id === c.id ? { ...x, outreachStatus: 'CONVERTED_TO_BOOKING', convertedBookingId: `BO26_${Date.now().toString().slice(-6)}` } : x))}>
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

      {/* ========================================================================= */}
      {/* TAB: HỢP ĐỒNG & TẠM ỨNG (TỪNG JOB BOOKING)                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'BOOKING_DEALS' && (() => {
        const STAGE: Record<string, { label: string; tone: StatusTone }> = {
          '1_PLAN_SOURCING': { label: '1. Kế hoạch & tìm KOC', tone: 'neutral' },
          '2_DEAL_CONTRACT': { label: '2. Hợp đồng & cọc', tone: 'info' },
          '3_CONTENT_SCRIPT': { label: '3. Kịch bản & mẫu', tone: 'info' },
          '4_AIR_GROWTH': { label: '4. Lên sóng & bàn giao', tone: 'warning' },
          '5_SETTLEMENT': { label: '5. Quyết toán', tone: 'positive' },
        };
        const TEAM: Record<string, string> = { BOOKING: 'Booking', CONTENT: 'Content', BRAND: 'Brand', GROWTH: 'Growth', FINANCE: 'Kế toán' };
        const countBy = (fn: (d: BookingDealItem) => boolean) => deals.filter(fn).length;
        return (
          <div className="space-y-4">
            <StatRow>
              <Stat label="Video booking có phí" value="622" note="Tạo 1,27 tỷ GMV trong 30 ngày" />
              <Stat label="Ngân sách đã giải ngân" value="2,83 tỷ" note="ROI toàn bộ 0,45" />
              <Stat label="Video có doanh thu" value="274/622" progress={{ value: 274, max: 622, target: 0.5 }} note="44,1% video có GMV" />
              <Stat label="Video hoàn vốn" value="93/622" progress={{ value: 93, max: 622, target: 0.3 }} note="15% đạt điểm hòa vốn" tone="warning" />
            </StatRow>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-accent-soft">
              <p className="text-[13px] text-ink-2 min-w-0">
                <strong className="font-semibold text-ink">Top 20 video đóng góp 55,8% GMV (709 tr).</strong>{' '}
                5 video đứng đầu đều từ creator đã từng hợp tác. Ưu tiên tái ký các deal có ROI trên 1.
              </p>
              <Button size="sm" onClick={() => setDealsFilter('WINNER_TOP20')}>Xem top 20</Button>
            </div>

            <Panel flush title="Job booking" description="Brand duyệt từng job, gửi mẫu, nghiệm thu video và mã Spark Ads, đo GMV">
              <div className="px-4 py-3 border-b border-line">
                <FilterBar
                  search={{ value: dealsSearch, onChange: setDealsSearch, placeholder: 'Tìm mã deal, KOC, sản phẩm, chiến dịch' }}
                  filters={
                    <Select value={selectedBrandFilter} onChange={e => setSelectedBrandFilter(e.target.value)} className="w-auto min-w-[180px]" aria-label="Lọc theo gian hàng">
                      {brandsList.map(b => <option key={b.key} value={b.key}>{b.key === 'ALL' ? 'Mọi gian hàng' : b.label}</option>)}
                    </Select>
                  }
                  resultCount={filteredDeals.length}
                  chips={
                    <Chips
                      value={dealsFilter}
                      onChange={setDealsFilter}
                      items={[
                        { key: 'ALL', label: 'Tất cả', count: deals.length },
                        { key: 'BRAND_PENDING', label: 'Chờ Brand duyệt', count: countBy(d => d.brandApprovalStatus === 'CHỜ_DUYỆT') },
                        { key: 'BRAND_APPROVED', label: 'Brand đã duyệt', count: countBy(d => d.brandApprovalStatus === 'ĐÃ_DUYỆT') },
                        { key: 'BRAND_REJECTED', label: 'Brand từ chối', count: countBy(d => d.brandApprovalStatus === 'TỪ_CHỐI') },
                        { key: 'WINNER_TOP20', label: 'Top 20', count: countBy(d => !!d.isWinnerTop20) },
                        { key: 'ADS_CODE_PENDING', label: 'Chưa mã Ads', count: countBy(d => d.adsCodeStatus === 'CHƯA_CẤP') },
                        { key: 'HAS_GMV', label: 'Có GMV', count: countBy(d => (d.gmv30 || 0) > 0) },
                        { key: 'BREAK_EVEN', label: 'Hoàn vốn', count: countBy(d => (d.roi || 0) >= 1) },
                      ]}
                    />
                  }
                />
              </div>
              <DataTable
                rows={filteredDeals}
                rowKey={d => d.id}
                stickyLast
                empty={<EmptyState title="Không có job phù hợp" description="Bỏ bớt bộ lọc hoặc xóa từ khóa tìm kiếm." />}
                columns={[
                  {
                    key: 'job', header: 'Job', width: 230, render: d => (
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-code text-2xs text-ink-3">{d.dealCode}</span>
                          {d.isWinnerTop20 && <Status tone="warning">Top 20</Status>}
                        </div>
                        <div className="font-medium text-ink mt-1">{d.brandName || 'Upbase'}</div>
                        <div className="text-2xs text-ink-2 truncate max-w-[220px]">{d.productName || 'Sản phẩm booking'}{d.bookingBatch ? ` · ${d.bookingBatch}` : ''}</div>
                        {d.contentAngleName ? (
                          <div className="text-2xs font-semibold text-purple-700 flex items-center gap-1 mt-0.5 truncate max-w-[220px]" title={d.contentHook ? `Hook: "${d.contentHook}"` : d.contentAngleName}>
                            <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                            <span className="truncate">{d.contentAngleName}</span>
                          </div>
                        ) : d.contentPillar ? (
                          <div className="text-3xs text-ink-3 mt-0.5">{d.contentPillar}</div>
                        ) : null}
                        <div className="text-2xs text-ink-3 truncate max-w-[220px]">{d.campaignTitle}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'koc', header: 'KOC', width: 180, render: d => (
                      <div className="leading-tight">
                        <div className="font-medium text-ink">{d.kocStageName}</div>
                        <div className="text-2xs text-ink-3 mt-0.5">{d.kocChannelId}</div>
                        <div className="text-2xs text-ink-3 mt-0.5">{d.salaryGrade}{d.creatorCategory ? ` · ${d.creatorCategory}` : ''}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'approval', header: 'Brand duyệt', width: 170, render: d =>
                      d.brandApprovalStatus === 'ĐÃ_DUYỆT' ? (
                        <div className="grid gap-1 justify-items-start">
                          <Status tone="positive">Đã duyệt</Status>
                          {d.brandApprovalDate && <span className="text-2xs text-ink-3">{d.brandApprovalDate}</span>}
                        </div>
                      ) : d.brandApprovalStatus === 'TỪ_CHỐI' ? (
                        <div className="grid gap-1 justify-items-start">
                          <Status tone="critical">Từ chối</Status>
                          <span className="text-2xs text-ink-3 max-w-[160px] whitespace-normal">{d.brandRejectReason || 'Lệch định vị'}</span>
                        </div>
                      ) : (
                        <div className="grid gap-1.5 justify-items-start">
                          <Status tone="warning">Chờ duyệt</Status>
                          <div className="flex gap-1">
                            <Button size="sm" icon={Check} onClick={() => handleQuickBrandApproval(d, 'ĐÃ_DUYỆT')}>Duyệt</Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejectingDeal(d)}>Từ chối</Button>
                          </div>
                        </div>
                      ),
                  },
                  {
                    key: 'stage', header: 'Bước', width: 180, render: d => {
                      const st = STAGE[d.currentStage || '1_PLAN_SOURCING'];
                      return (
                        <div className="grid gap-1 justify-items-start">
                          <Status tone={d.pipelineText === 'Done' ? 'positive' : st.tone}>{st.label}</Status>
                          <span className="text-2xs text-ink-3 max-w-[170px] whitespace-normal">{d.pipelineText || d.statusLabel}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'holder', header: 'Đang ở', width: 170, render: d => (
                      <div className="grid gap-1 justify-items-start leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink">{TEAM[d.holdingTeam || 'BOOKING']}</span>
                          <span className={d.isSlaWarning ? 'text-2xs text-warning font-medium' : 'text-2xs text-ink-3'}>{d.slaRemainingText || 'Trong hạn'}</span>
                        </div>
                        <span className="text-2xs text-ink-3 truncate max-w-[160px]">{d.holdingReason || 'Đang xử lý'}</span>
                        {d.brandOrientationPendingDays && d.brandOrientationPendingDays >= 3 ? <Status tone="warning">Brand quá {d.brandOrientationPendingDays} ngày</Status> : null}
                        {d.isLocked7WorkingDays && <Status tone="critical">Khóa: quá 7 ngày chưa có link</Status>}
                        {d.isDnttOverdue10Am && <Status tone="critical">Trễ đề nghị thanh toán</Status>}
                      </div>
                    ),
                  },
                  {
                    key: 'delivery', header: 'Mẫu · video · Ads', width: 160, render: d => (
                      <div className="grid gap-1 text-2xs leading-tight">
                        <span className={d.sampleStatus === 'ĐÃ_NHẬN' ? 'text-positive' : 'text-ink-2'}>
                          {d.sampleStatus === 'ĐÃ_NHẬN' ? 'Đã nhận mẫu' : d.sampleStatus === 'ĐANG_GIAO' ? 'Đang giao mẫu' : 'Chưa gửi mẫu'}
                        </span>
                        {d.tiktokVideoUrl || d.videoUrl ? (
                          <a href={d.tiktokVideoUrl || d.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                            Video TikTok<ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-ink-3">Chưa có video</span>
                        )}
                        {d.sparkAdsCode ? <span className="font-code text-ink-2 truncate max-w-[150px]">{d.sparkAdsCode}</span> : <span className="text-ink-3">Chưa mã Ads</span>}
                      </div>
                    ),
                  },
                  {
                    key: 'money', header: 'Chi phí · GMV', align: 'right', width: 140, render: d => (
                      <div className="grid gap-0.5 justify-items-end tabular-nums leading-tight">
                        <span className="text-ink">{formatVndShort(d.totalValue)}</span>
                        <span className="text-2xs text-ink-3">GMV {formatVndShort(d.gmv30)}</span>
                        <span className={(d.roi || 0) >= 1 ? 'text-2xs font-medium text-positive' : 'text-2xs text-ink-3'}>ROI {(d.roi || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'people', header: 'Nhân sự', width: 170, render: d => (
                      <div className="grid gap-1">
                        <Person name={d.bookingPic || d.assignedStaff} size={22} />
                        <span className="text-2xs text-ink-3 pl-[30px]">Growth: {d.growthPic || '—'} · Account: {d.accountPic || '—'}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'actions', header: <span className="sr-only">Thao tác</span>, align: 'right', width: 200, render: d => (
                      <div className="flex items-center justify-end gap-1">
                        {d.brandOrientationPendingDays && d.brandOrientationPendingDays >= 3 ? (
                          <Button size="sm" icon={Zap} onClick={() => setAutoAirDeal(d)} title="Brand quá 3 ngày chưa duyệt định hướng">Tự air</Button>
                        ) : null}
                        <Button size="sm" variant="ghost" icon={Share2} onClick={() => handleOpenGrowthHandoff(d)} title="Bàn giao mã Spark Ads cho team Growth">Bàn giao</Button>
                        <Button size="sm" variant="ghost" icon={Edit3} onClick={() => handleOpenEditModal(d)}>Sửa</Button>
                        <Button size="sm" variant="ghost" onClick={() => onSelectDealForContract?.(d)} title="Xem hợp đồng">HĐ</Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Panel>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB: DANH BẠ KOC                                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'KOC_DIRECTORY' && (
        <Panel flush title="Danh bạ KOC" description="Bấm vào một KOC để mở hồ sơ đầy đủ và lịch sử hợp tác">
          <div className="px-4 py-3 border-b border-line">
            <FilterBar
              search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Tìm tên, kênh, ngành hàng, số điện thoại' }}
              resultCount={filteredKocs.length}
              filters={
                <>
                  <Select value={selectedKL} onChange={e => setSelectedKL(e.target.value)} className="w-auto" aria-label="Khung lương">
                    {salaryGrades.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi khung lương' : o.label}</option>)}
                  </Select>
                  <Select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)} className="w-auto" aria-label="Phân nhóm creator">
                    {creatorSegments.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi phân nhóm' : o.label}</option>)}
                  </Select>
                  <Select value={selectedKocCategory} onChange={e => setSelectedKocCategory(e.target.value)} className="w-auto" aria-label="Ngành hàng">
                    {kocCategories.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi ngành hàng' : o.label}</option>)}
                  </Select>
                  <Select value={selectedTepKenh} onChange={e => setSelectedTepKenh(e.target.value)} className="w-auto" aria-label="Tệp kênh">
                    {tepKenhList.map(o => <option key={o.key} value={o.key}>{o.key === 'ALL' ? 'Mọi tệp kênh' : o.label}</option>)}
                  </Select>
                </>
              }
            />
          </div>
          <DataTable
            rows={filteredKocs}
            rowKey={k => k.id}
            stickyLast
            onRowClick={k => setInspectedKoc(k)}
            empty={<EmptyState title="Không tìm thấy KOC" description="Thử từ khóa khác hoặc bỏ bớt bộ lọc." action={<Button size="sm" icon={UserPlus} onClick={() => setIsCreateKocOpen(true)}>Thêm KOC</Button>} />}
            columns={[
              {
                key: 'koc', header: 'KOC', width: 300, render: k => (
                  <div className="flex items-start gap-2.5">
                    <Avatar name={k.stageName} size={28} />
                    <div className="leading-tight min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ink">{k.stageName}</span>
                        {k.isWinnerTop20 && <Status tone="warning">Winner</Status>}
                      </div>
                      <div className="text-2xs text-ink-3 mt-0.5">{k.channelId} · {k.phone}</div>
                      <div className="text-2xs text-ink-3">{k.location || 'Hà Nội'} · {k.bookingFormat || 'Booking video'}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'grade', header: 'Khung lương', width: 140, render: k => (
                  <div className="leading-tight">
                    <div className="text-ink">{k.salaryGrade}</div>
                    <div className="text-2xs text-ink-3 mt-0.5">{k.segment || 'Massive Creator'}</div>
                  </div>
                ),
              },
              {
                key: 'audience', header: 'Tệp kênh', width: 170, render: k => (
                  <div className="leading-tight">
                    <div className="text-ink">{k.tepKenh || k.creatorCategory || 'Review Nữ'}</div>
                    <div className="text-2xs text-ink-3 mt-0.5">{k.kocCategory || 'Personal care'} · nữ {k.femaleRatio ?? 85}%</div>
                  </div>
                ),
              },
              { key: 'rate', header: 'Báo giá video', align: 'right', width: 130, render: k => <span className="tabular-nums">{formatVnd(k.rateCardVideo)}</span> },
              {
                key: 'shop', header: 'TikTok Shop', width: 180, render: k => (
                  <div className="leading-tight tabular-nums">
                    <div className="text-ink">{formatNumber(k.followers)} follower</div>
                    <div className="text-2xs text-ink-3 mt-0.5">GMV cao nhất {formatVndShort(k.gmvBestCase || k.rateCardVideo * 3)} · AOV {formatVndShort(k.aov || 245000)}</div>
                  </div>
                ),
              },
              {
                key: 'history', header: 'Với Upbase', align: 'right', width: 130, render: k => (
                  <div className="grid gap-0.5 justify-items-end tabular-nums leading-tight">
                    <span className="text-ink">{formatVndShort(k.totalPastGmv || k.rateCardVideo * 3)}</span>
                    <span className={(k.historicalRoi || 2.5) >= 1 ? 'text-2xs font-medium text-positive' : 'text-2xs text-warning'}>ROI {(k.historicalRoi || 2.5).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span>
                  </div>
                ),
              },
              { key: 'pic', header: 'PIC', width: 150, render: k => <Person name={k.bookingPic || 'Khánh Vy'} sub={k.statusKoc || 'Sẵn sàng'} size={22} /> },
              {
                key: 'actions', header: <span className="sr-only">Thao tác</span>, align: 'right', width: 120, render: k => (
                  <div onClick={e => e.stopPropagation()}>
                    <Button size="sm" onClick={() => onOpenQuickBookWithKoc(k)}>Tạo booking</Button>
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BÀN GIAO SANG TEAM GROWTH                                            */}
      {/* ========================================================================= */}
      <Modal
        open={!!handoffDeal}
        onClose={() => setHandoffDeal(null)}
        title="Bàn giao cho team Growth"
        description={handoffDeal ? `${handoffDeal.dealCode} · ${handoffDeal.kocStageName} · ${handoffDeal.brandName}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setHandoffDeal(null)}>Hủy</Button>
            <Button variant="primary" icon={Check} onClick={handleConfirmGrowthHandoff}>Bàn giao</Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">Growth dùng mã Spark Ads để chạy quảng cáo trên video đã lên sóng và chốt ngân sách Ads với khách hàng.</p>
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
        <Field label="Ghi chú cho Growth" hint="Đối tượng khán giả, điểm bán hàng cần nhấn khi lên chiến dịch" htmlFor="handoff-note">
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
        title={editingDeal ? `Cập nhật job ${editingDeal.dealCode}` : ''}
        description={editingDeal ? `${editingDeal.kocStageName} · ${editingDeal.brandName || 'Upbase'} · ${editingDeal.productName || 'Sản phẩm chung'}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingDeal(null)}>Hủy</Button>
            <Button variant="primary" icon={Check} onClick={handleSaveDealUpdate}>Lưu</Button>
          </>
        }
      >
        {editingDeal && (
          <>
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
              <Field label="Lý do Brand từ chối" hint="Lưu lại để báo cáo và lần sau chọn KOC phù hợp hơn" htmlFor="edit-reject">
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

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Hàng mẫu">
                <Segmented
                  value={editForm.sampleStatus}
                  onChange={(v) => setEditForm(prev => ({ ...prev, sampleStatus: v }))}
                  items={[{ key: 'CHƯA_GỬI', label: 'Chưa gửi' }, { key: 'ĐANG_GIAO', label: 'Đang giao' }, { key: 'ĐÃ_NHẬN', label: 'Đã nhận' }]}
                />
              </Field>
              <Field label="Mã Spark Ads" hint="Chưa đối soát mã Ads sẽ gây hụt ngân sách kế hoạch">
                <Segmented
                  value={editForm.adsCodeStatus}
                  onChange={(v) => setEditForm(prev => ({ ...prev, adsCodeStatus: v }))}
                  items={[{ key: 'CHƯA_CẤP', label: 'Chưa cấp' }, { key: 'ĐÃ_NGHIỆM_THU', label: 'Đã duyệt' }, { key: 'KHÔNG_DÙNG', label: 'Không dùng' }]}
                />
              </Field>
            </div>

            <Field label="Link video TikTok" htmlFor="edit-url">
              <Input id="edit-url" value={editForm.tiktokVideoUrl} onChange={e => setEditForm(prev => ({ ...prev, tiktokVideoUrl: e.target.value }))} placeholder="https://www.tiktok.com/@creator/video/…" />
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
              {editForm.gmv30 >= 30000000 && <Status tone="warning">Đạt top 20</Status>}
              {(editForm.gmv30 || 0) / (editingDeal.totalValue || 1) >= 1 && <Status tone="positive">Hoàn vốn</Status>}
            </div>
          </>
        )}
      </Modal>

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
          if (autoAirDeal && onUpdateDeal) onUpdateDeal({ ...autoAirDeal, pipelineText: 'Tự air (Brand quá hạn)', holdingReason: 'Tự air theo SLA do Brand quá hạn duyệt' });
          setAutoAirDeal(null);
        }}
      />

      {/* KOC 360 Profile Modal */}
      <KocProfileModal
        isOpen={!!inspectedKoc}
        onClose={() => setInspectedKoc(null)}
        koc={inspectedKoc}
        onOpenQuickBook={onOpenQuickBookWithKoc}
      />

      {/* Create KOC Modal */}
      <CreateKocModal
        isOpen={isCreateKocOpen}
        onClose={() => setIsCreateKocOpen(false)}
        onKocCreated={handleCreateKocSuccess}
      />
    </div>
  );
};
