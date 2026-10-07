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

  // 🌟 Search & 4 Phân loại cốt lõi KOC Directory (Sheet 3.1 & 3.2 & 5.4 & 5.6)
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

  // 🌟 1. Khung Lương (KL) - Chuẩn hóa Sheet 3.1 & 5.6
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

  // 🌟 2. Phân nhóm Creator (Segment) - Sheet 3.2 Col 81 & 5.6
  const creatorSegments = [
    { key: 'ALL', label: 'Tất cả Segment' },
    { key: 'Massive Creator', label: 'Massive Creator (TAP, KL1-3)' },
    { key: 'Mid Creator', label: 'Mid Creator (KL4-5)' },
    { key: 'Key Creator', label: 'Key Creator (KL6)' },
    { key: 'Top Creator', label: 'Top Creator (KL7)' },
  ];

  // 🌟 3. KOC Category (Ngành hàng) - Sheet 3.2 Col 87 & 5.4
  const kocCategories = [
    { key: 'ALL', label: 'Tất cả Ngành Hàng' },
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

  // 🌟 4. Tệp Kênh - 25 tệp chuẩn Sheet 3.1 & 5.4
  const tepKenhList = [
    { key: 'ALL', label: 'Tất cả Tệp Kênh' },
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
    { key: 'Bác sĩ/chuyên gia', label: 'Bác sĩ / Chuyên gia' },
    { key: 'Unboxing', label: 'Unboxing' },
  ];

  // Brands / Gian hàng (from Image 8)
  const brandsList = [
    { key: 'ALL', label: 'Tất Cả Gian Hàng' },
    { key: 'Kutieskin Mama', label: 'Kutieskin Mama' },
    { key: 'Royal Ausnz', label: 'Royal Ausnz' },
    { key: 'Bye Bye Blemish', label: 'Bye Bye Blemish' },
    { key: 'pHCare', label: 'pHCare (Cần Mã Ads)' },
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
  const handleQuickBrandApproval = (deal: BookingDealItem, status: 'ĐÃ_DUYỆT' | 'TỪ_CHỐI') => {
    let rejectReason = '';
    if (status === 'TỪ_CHỐI') {
      const inputReason = prompt('Nhập lý do Brand từ chối KOC cho Job này:', 'Tệp khán giả KOC không phù hợp tệp khách hàng mục tiêu của Brand');
      if (inputReason === null) return;
      rejectReason = inputReason.trim() || 'Lệch định vị thương hiệu';
    }

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
      {/* Compact Personal KPI Bar */}
      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            {currentUser?.role === 'MANAGER' ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] text-amber-800 font-bold">[Lead] Soi KPI NV:</span>
                <select
                  value={selectedStaffName}
                  onChange={(e) => setSelectedStaffName(e.target.value)}
                  className="bg-white text-slate-800 border border-amber-300 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
                >
                  {(externalStaffAllocations || INITIAL_STAFF_ALLOCATIONS_26).map(a => (
                    <option key={a.id} value={a.staffName} className="bg-white text-slate-900">
                      {a.staffName} ({a.roleTitle})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px] shadow-2xs">
                <UserCheck className="w-3 h-3" />
                KPI {selectedStaffName}
              </span>
            )}
            <span className="text-slate-600 font-medium">
              Air: <strong className="text-slate-900 font-bold">{personalStaffProgress.reportVideos}/{personalStaffProgress.planVideos} clips</strong> ({personalStaffProgress.airProgress}%)
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">
              Ngân sách: <strong className="text-blue-700 font-bold">{(personalStaffProgress.reportBudget / 1000000).toFixed(1)}M/{(personalStaffProgress.planBudget / 1000000).toFixed(1)}M</strong> ({personalStaffProgress.budgetProgress}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {personalStaffProgress.isLagging || personalStaffProgress.airProgress < 50 ? (
              <span className="badge-rose px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Tiến độ air &lt;50% — Cần đốc thúc KOC
              </span>
            ) : (
              <span className="badge-emerald px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Tiến độ đạt chuẩn ({personalStaffProgress.airProgress}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2 bg-slate-100 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('MY_PLAN')}
            className={`btn-md font-bold text-xs transition ${
              activeSubTab === 'MY_PLAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>0. Kế Hoạch Của Tôi (My Plan)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CANDIDATES')}
            className={`btn-md font-bold text-xs transition ${
              activeSubTab === 'CANDIDATES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>1. Sàng Lọc KOC & Pipeline Tiếp Cận ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('BOOKING_DEALS')}
            className={`btn-md font-bold text-xs transition ${
              activeSubTab === 'BOOKING_DEALS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>2. Hợp Đồng Booking & Chi Tạm Ứng ({deals.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('KOC_DIRECTORY')}
            className={`btn-md font-bold text-xs transition ${
              activeSubTab === 'KOC_DIRECTORY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Danh Bạ Master KOC ({localKocs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenInputPlan && (
            <button
              onClick={onOpenInputPlan}
              className="btn-md bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-300" />
              <span>Phân Rã Kế Hoạch (Input Plan)</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateKocOpen(true)}
            className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs shadow-2xs transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Thêm KOC Mới</span>
          </button>

          <button
            onClick={() => onOpenQuickBookWithKoc(localKocs[0] || INITIAL_KOCS[0])}
            className="btn-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <span>+ Tạo Booking Deal</span>
          </button>
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
      {/* SUB-TAB 1: CANDIDATE POOL & OUTREACH PIPELINE (DECOUPLED FROM CONTRACTS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'CANDIDATES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Conversion Pipeline Telemetry */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Tổng Ứng Viên Sàng Lọc</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{candidates.length} KOCs</div>
              <span className="text-[10px] text-slate-500">Tiếp cận 3 Kênh (TikTok/Shopee/IG)</span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Chuyển Đổi Thành HĐ Booking</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                {candidates.filter(c => c.outreachStatus === 'CONVERTED_TO_BOOKING').length} / {candidates.length}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">
                Tỷ lệ chốt deal: {((candidates.filter(c => c.outreachStatus === 'CONVERTED_TO_BOOKING').length / (candidates.length || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Đang Chào Giá / Chờ Đồng Ý</span>
              <div className="text-xl font-black text-amber-600 mt-0.5">
                {candidates.filter(c => c.outreachStatus === 'PITCHED' || c.outreachStatus === 'CONTACTED').length} KOCs
              </div>
              <span className="text-[10px] text-slate-500">Đang giữ cam kết SLA 24h</span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-medium">Từ Chối / Vượt Khung Giá</span>
              <div className="text-xl font-black text-rose-600 mt-0.5">
                {candidates.filter(c => c.outreachStatus === 'REJECTED').length} KOCs
              </div>
              <span className="text-[10px] text-slate-500">Kiểm soát chặt chẽ CIR</span>
            </div>
          </div>

          {/* Candidates Pipeline Table */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Pipeline Tiếp Cận Ứng Viên KOC — Tách Biệt Với Hợp Đồng Thương Mại</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đo lường chính xác tỷ lệ chuyển đổi từ liên hệ (Pitch) đến ký kết (Booking Deal), không làm méo mó số liệu CPA
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs">
                {['ALL', 'CONTACTED', 'PITCHED', 'CONVERTED_TO_BOOKING', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setCandidateFilter(st)}
                    className={`px-2.5 py-1 rounded font-semibold text-[11px] transition ${
                      candidateFilter === st ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'Tất Cả' : st === 'CONVERTED_TO_BOOKING' ? 'Đã Chốt HĐ' : st === 'PITCHED' ? 'Đang Chào Giá' : st === 'CONTACTED' ? 'Đang Nhắn' : 'Từ Chối'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1100px] border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5 pl-5 w-[220px] min-w-[220px]">Mã & KOC Ứng Viên</th>
                    <th className="p-3.5 w-[180px] min-w-[180px]">Phân Hạng & Follower</th>
                    <th className="p-3.5 w-[200px] min-w-[200px]">Thương Hiệu / Gian Hàng</th>
                    <th className="p-3.5 w-[140px] min-w-[140px]">Giá Net Đề Xuất</th>
                    <th className="p-3.5 w-[130px] min-w-[130px]">Booking PIC</th>
                    <th className="p-3.5 w-[160px] min-w-[160px] text-center">Trạng Thái Outreach</th>
                    <th className="p-3.5 pr-5 w-[140px] min-w-[140px] text-right sticky right-0 bg-slate-50 border-l border-slate-200">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {candidates
                    .filter(c => candidateFilter === 'ALL' || c.outreachStatus === candidateFilter)
                    .map((can) => (
                      <tr key={can.id} className="hover:bg-blue-50/30 transition">
                        <td className="p-3.5 pl-5">
                          <span className="text-blue-600 font-bold block text-[11px]">{can.candidateCode}</span>
                          <span className="font-bold text-slate-900 text-xs">{can.stageName}</span>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>🎵 {can.channelId}</span>
                            <a href={can.channelUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold block w-fit">
                            {can.tierLabel}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {(can.followers / 1000).toFixed(0)}k Follow • {(can.avgViews / 1000).toFixed(0)}k View
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{can.brandName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{can.storeName || 'Toàn bộ gian hàng'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                            {(can.rateCardExpected / 1000000).toLocaleString('vi-VN')} Triệu ₫
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800">{can.assignedPic}</span>
                          <div className="text-[10px] text-slate-500">{can.pitchBatch || 'Đợt 1'}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          {can.outreachStatus === 'CONVERTED_TO_BOOKING' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              ✓ Đã Ký Booking ({can.convertedBookingId})
                            </span>
                          )}
                          {can.outreachStatus === 'PITCHED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              ⏳ Đang Đàm Phán Brief
                            </span>
                          )}
                          {can.outreachStatus === 'CONTACTED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              💬 Đã Nhắn Zalo
                            </span>
                          )}
                          {can.outreachStatus === 'REJECTED' && (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                                ✕ Từ Chối
                              </span>
                              {can.rejectionReason && (
                                <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs">{can.rejectionReason}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          {can.outreachStatus !== 'CONVERTED_TO_BOOKING' && can.outreachStatus !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                setCandidates(prev => prev.map(c => c.id === can.id ? {
                                  ...c,
                                  outreachStatus: 'CONVERTED_TO_BOOKING',
                                  convertedBookingId: `BO26_${Date.now().toString().slice(-6)}`
                                } : c));
                              }}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-[11px] shadow-sm transition"
                            >
                              + Chốt ➔ Tạo Booking
                            </button>
                          )}
                          {can.outreachStatus === 'CONVERTED_TO_BOOKING' && (
                            <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                              {can.convertedBookingId}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MANAGEMENT OF INDIVIDUAL BOOKING DEALS (OPERATIONAL WORKFLOW) */}
      {/* ========================================================================= */}
      {activeSubTab === 'BOOKING_DEALS' && (
        <div className="space-y-5">
          {/* Executive Performance Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-4">
              <span className="text-xs text-slate-400 font-medium">Tổng Video Booking Có Phí</span>
              <div className="text-2xl font-black text-white mt-1">622 Video</div>
              <span className="text-[11px] text-cyan-400 font-semibold">Tạo 1,27 Tỷ GMV 30 Ngày</span>
            </div>

            <div className="card-enterprise p-4 border-blue-500/30">
              <span className="text-xs text-blue-400 font-medium">Ngân Sách Đã Giải Ngân</span>
              <div className="text-2xl font-black text-blue-400 mt-1">2,83 Tỷ đ</div>
              <span className="text-[11px] text-slate-400">ROI Toàn Bộ: 0.45</span>
            </div>

            <div className="card-enterprise p-4 border-emerald-500/30">
              <span className="text-xs text-emerald-400 font-medium">Video Có Doanh Thu (GMV &gt; 0)</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">274 / 622</div>
              <span className="text-[11px] text-emerald-400 font-bold">44,1% Video Có GMV</span>
            </div>

            <div className="card-enterprise p-4 border-amber-500/30">
              <span className="text-xs text-amber-400 font-medium">Video Hoàn Vốn (GMV &gt;= Cost)</span>
              <div className="text-2xl font-black text-amber-400 mt-1">93 / 622</div>
              <span className="text-[11px] text-amber-400 font-bold">15,0% Đạt Điểm Hòa Vốn</span>
            </div>
          </div>

          {/* Performance Insight Banner */}
          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-blue-900 text-xs uppercase tracking-wider block">
                Phân Tích Hiệu Suất Video: Top 20 Video Đóng Góp 55,8% GMV (709,4M đ)
              </span>
              <p className="text-slate-600 mt-0.5">
                Top 5 video tạo 313,4M (24,6%) đều là Creator đã từng hợp tác trước đó. Đề xuất ưu tiên tái ký các deal có ROI &gt; 1.0.
              </p>
            </div>
            <button
              onClick={() => setDealsFilter('WINNER_TOP20')}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 font-semibold rounded-lg shrink-0 transition shadow-2xs cursor-pointer"
            >
              Lọc Top 20 Hiệu Quả
            </button>
          </div>

          {/* Brand Filter Pills + Search Controls */}
          {/* Brand Filter Pills + Search Controls */}
          <div className="card-enterprise p-4 space-y-3 bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm mã deal (BO26...), tên KOC, cụm gian hàng, hoặc chiến dịch..."
                  value={dealsSearch}
                  onChange={(e) => setDealsSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { key: 'ALL', label: 'Tất Cả Deals / Jobs' },
                  { key: 'BRAND_PENDING', label: '⏳ Chờ Brand Duyệt' },
                  { key: 'BRAND_APPROVED', label: '✓ Brand Đã Duyệt' },
                  { key: 'BRAND_REJECTED', label: '✕ Brand Từ Chối' },
                  { key: 'WINNER_TOP20', label: '🌟 Top 20 Winner' },
                  { key: 'ADS_CODE_PENDING', label: '⚠️ Chưa Mã Ads' },
                  { key: 'HAS_GMV', label: 'GMV > 0' },
                  { key: 'BREAK_EVEN', label: 'Hoàn Vốn (ROI >= 1)' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setDealsFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ${
                      dealsFilter === f.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter Row */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs overflow-x-auto">
              <span className="text-slate-500 flex items-center gap-1 shrink-0 font-medium">
                <Package className="w-3.5 h-3.5 text-blue-500" /> Cụm Gian Hàng / Brand:
              </span>
              {brandsList.map(b => (
                <button
                  key={b.key}
                  onClick={() => setSelectedBrandFilter(b.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                    selectedBrandFilter === b.key
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Deals Table */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600" />
                  Luồng Tác Nghiệp Từng Job Booking — Phê Duyệt Brand & Pipeline 8 Bước Chuẩn Upbase
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phê duyệt Brand theo từng Job cụ thể • Điều phối gửi mẫu kho • Nghiệm thu video & mã Spark Ads • Đo lường GMV/ROI
                </p>
              </div>
              <span className="badge-blue px-2.5 py-1 rounded-full text-xs font-bold">
                {filteredDeals.length} Jobs Đang Hiển Thị
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[1360px]">
                <thead>
                  <tr className="table-header-enterprise bg-slate-50 text-slate-700">
                    <th className="p-3 pl-5 text-slate-700 font-semibold w-[230px] min-w-[230px]">Mã Job & Gian Hàng / Sản Phẩm</th>
                    <th className="p-3 text-slate-700 font-semibold w-[190px] min-w-[190px]">KOC & Định Mức</th>
                    <th className="p-3 text-slate-700 font-semibold w-[160px] min-w-[160px]">Phê Duyệt Brand (Theo Job)</th>
                    <th className="p-3 text-slate-700 font-semibold w-[170px] min-w-[170px]">5 Chặng Quy Trình Vận Hành</th>
                    <th className="p-3 text-slate-700 font-semibold w-[150px] min-w-[150px]">Bên Giữ Bóng & SLA</th>
                    <th className="p-3 text-slate-700 font-semibold w-[160px] min-w-[160px]">Mẫu & Link TikTok / Ads</th>
                    <th className="p-3 text-right text-slate-700 font-semibold w-[160px] min-w-[160px]">Ngân Sách / GMV</th>
                    <th className="p-3 text-slate-700 font-semibold w-[120px] min-w-[120px]">Nhân Sự</th>
                    <th className="p-3 pr-5 text-slate-700 font-semibold text-right w-[160px] min-w-[160px] sticky right-0 bg-slate-50 border-l border-slate-200">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="table-row-enterprise hover:bg-blue-50/30 transition-colors">
                      {/* Job Code & Brand & Product */}
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-blue-600">{deal.dealCode}</span>
                          {deal.jobId && <span className="text-[10px] text-slate-500">• {deal.jobId}</span>}
                          {deal.isWinnerTop20 && (
                            <span className="badge-amber px-1.5 py-0.2 rounded text-[9px] font-bold">Top 20</span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">{deal.brandName || 'Upbase Brand'}</div>
                        <div className="text-[11px] text-blue-600 font-medium truncate max-w-xs">
                          📦 {deal.productName || 'Sản phẩm booking'} {deal.bookingBatch ? `(${deal.bookingBatch})` : ''}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{deal.campaignTitle}</div>
                      </td>

                      {/* KOC & Salary Grade */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{deal.kocStageName}</div>
                        <div className="text-[10px] text-slate-500">{deal.kocChannelId || ''}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="badge-purple px-1.5 py-0.2 rounded text-[9px] font-bold">
                            {deal.salaryGrade}
                          </span>
                          <span className="text-[10px] text-slate-500">{deal.creatorCategory}</span>
                        </div>
                      </td>

                      {/* Phê Duyệt Brand Theo Từng Job */}
                      <td className="p-3.5">
                        {deal.brandApprovalStatus === 'ĐÃ_DUYỆT' ? (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-emerald inline-flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Brand Đã Duyệt
                            </span>
                            {deal.brandApprovalDate && (
                              <div className="text-[9px] text-slate-400 mt-0.5">{deal.brandApprovalDate}</div>
                            )}
                          </div>
                        ) : deal.brandApprovalStatus === 'TỪ_CHỐI' ? (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                              <X className="w-3 h-3 text-rose-400" />
                              Brand Từ Chối
                            </span>
                            <div className="text-[10px] text-rose-400 mt-1 max-w-[150px] leading-tight font-medium">
                              Lý do: {deal.brandRejectReason || 'Lệch định vị'}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-amber inline-block">
                              ⏳ Chờ Brand Duyệt
                            </span>
                            <div className="flex items-center gap-1 pt-0.5">
                              <button
                                onClick={() => handleQuickBrandApproval(deal, 'ĐÃ_DUYỆT')}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition flex items-center gap-0.5 shadow-sm"
                                title="Duyệt KOC cho Job này"
                              >
                                <Check className="w-2.5 h-2.5" /> Duyệt
                              </button>
                              <button
                                onClick={() => handleQuickBrandApproval(deal, 'TỪ_CHỐI')}
                                className="px-2 py-0.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded text-[10px] font-bold transition flex items-center gap-0.5"
                                title="Từ chối KOC (nhập lý do)"
                              >
                                <X className="w-2.5 h-2.5" /> Từ chối
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5 Chặng Quy Trình Vận Hành */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block ${
                            deal.currentStage === '5_SETTLEMENT' || deal.pipelineText === 'Done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            deal.currentStage === '4_AIR_GROWTH' || deal.status === 'VIDEO_SUBMITTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            deal.currentStage === '3_CONTENT_SCRIPT' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            deal.currentStage === '2_DEAL_CONTRACT' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {deal.currentStage === '5_SETTLEMENT' ? '5. Quyết Toán Mùng 2' :
                             deal.currentStage === '4_AIR_GROWTH' ? '4. Air & Bàn Giao Growth' :
                             deal.currentStage === '3_CONTENT_SCRIPT' ? '3. Kịch Bản & Mẫu Thử' :
                             deal.currentStage === '2_DEAL_CONTRACT' ? '2. Hợp Đồng & Cọc' :
                             '1. Kế Hoạch & Sourcing'}
                          </span>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {deal.pipelineText || deal.statusLabel}
                          </div>
                        </div>
                      </td>

                      {/* Đơn Vị Giữ Bóng & SLA */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              deal.holdingTeam === 'GROWTH' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              deal.holdingTeam === 'BRAND' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              deal.holdingTeam === 'FINANCE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              deal.holdingTeam === 'CONTENT' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                              'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              [{deal.holdingTeam || 'BOOKING'}]
                            </span>
                            <span className={`text-[10px] font-semibold ${deal.isSlaWarning ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                              {deal.slaRemainingText || 'Trong hạn'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                            {deal.holdingReason || 'Đang xử lý theo luồng'}
                          </div>

                          {/* SLA Triggers from Các SLA B2C */}
                          {deal.brandOrientationPendingDays && deal.brandOrientationPendingDays >= 3 ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 block w-fit mt-1 animate-pulse">
                              ⚡ Brand quá {deal.brandOrientationPendingDays}d: Tự Air
                            </span>
                          ) : null}
                          {deal.isLocked7WorkingDays && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white block w-fit mt-1">
                              🔒 Khóa (&gt;7d thiếu link)
                            </span>
                          )}
                          {deal.isDnttOverdue10Am && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 block w-fit mt-1">
                              ⚠️ Trễ DNTT 10:00 AM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mẫu (Sample) & Link TikTok & Ads */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium inline-block ${
                            deal.sampleStatus === 'ĐÃ_NHẬN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            deal.sampleStatus === 'ĐANG_GIAO' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {deal.sampleStatus === 'ĐÃ_NHẬN' ? '✓ Đã nhận mẫu' :
                             deal.sampleStatus === 'ĐANG_GIAO' ? '🚚 Đang giao mẫu' : 'Chưa gửi'}
                          </span>

                          {deal.tiktokVideoUrl || deal.videoUrl ? (
                            <a
                              href={deal.tiktokVideoUrl || deal.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-[11px] font-medium flex items-center gap-1 truncate max-w-[120px] hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>Link TikTok</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px] block">Chưa có video</span>
                          )}

                          <div>
                            {deal.sparkAdsCode ? (
                              <span className="text-[9px] font-mono text-emerald-700 font-bold block truncate max-w-[120px]">
                                Ads: {deal.sparkAdsCode}
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 block">Chưa mã Ads</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Chi Phí / GMV / ROI */}
                      <td className="p-3 text-right">
                        <div className="font-bold text-slate-900 font-mono whitespace-nowrap">{deal.totalValue.toLocaleString('vi-VN')}&nbsp;₫</div>
                        <div className="font-semibold text-emerald-600 font-mono text-[11px] whitespace-nowrap">
                          GMV: {deal.gmv30.toLocaleString('vi-VN')}&nbsp;₫
                        </div>
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-semibold inline-block ${
                          deal.roi >= 1.0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          deal.roi >= 0.5 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          ROI {deal.roi.toFixed(2)}
                        </span>
                      </td>

                      {/* Nhân Sự 3 Bên */}
                      <td className="p-3">
                        <div className="text-xs text-slate-900 font-semibold truncate max-w-[100px]">
                          {deal.bookingPic || deal.assignedStaff}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                          G: {deal.growthPic || '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                          A: {deal.accountPic || '—'}
                        </div>
                      </td>

                      {/* Thao Tác (Sticky Right Column) */}
                      <td className="p-3 pr-5 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* SLA B2C Auto-Air Trigger Button */}
                          {deal.brandOrientationPendingDays && deal.brandOrientationPendingDays >= 3 && (
                            <button
                              onClick={() => alert(`Đã kích hoạt đề xuất Tự Air (Auto-Air) cho deal ${deal.dealCode} do Brand không phản hồi quá 3 ngày làm việc theo quy chế SLA B2C.`)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                              title="Đề xuất Tự Air do Brand quá hạn duyệt định hướng 3 ngày"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Tự Air</span>
                            </button>
                          )}

                          {/* Growth Handoff Button (Chặng 4 hoặc có video) */}
                          <button
                            onClick={() => handleOpenGrowthHandoff(deal)}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold transition flex items-center gap-1 shadow-xs"
                            title="Bàn giao mã Spark Ads TikTok sang Team Growth"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Bàn Giao</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(deal)}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded text-[11px] font-medium transition flex items-center gap-1 shadow-xs"
                            title="Cập nhật tiến độ Job"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          <button
                            onClick={() => onSelectDealForContract && onSelectDealForContract(deal)}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-medium border border-slate-200 hover:border-slate-300 transition shadow-xs"
                            title="Xem hợp đồng"
                          >
                            <span>HĐ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KOC DIRECTORY & 360 PROFILE WITH BOOKING HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'KOC_DIRECTORY' && (
        <div className="space-y-5">
          {/* Top Search & Filter Bar */}
          <div className="card-enterprise p-4 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="🔍 Tra cứu KOC theo tên (@channel), ngành hàng, hoặc số điện thoại..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Create KOC Button */}
              <button
                onClick={() => setIsCreateKocOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Thêm KOC Mới</span>
              </button>
            </div>

            {/* Filter 1: Khung Lương (KL) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-200">
              <span className="text-slate-500 flex items-center gap-1 shrink-0 font-medium text-xs mr-1">
                <DollarSign className="w-3.5 h-3.5 text-cyan-600" /> 1. Khung Lương (KL):
              </span>
              {salaryGrades.map((kl) => (
                <button
                  key={kl.key}
                  onClick={() => setSelectedKL(kl.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                    selectedKL === kl.key
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {kl.label}
                </button>
              ))}
            </div>

            {/* Filter 2: Phân nhóm Creator (Segment) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 flex items-center gap-1 shrink-0 font-medium text-xs mr-1">
                <Users className="w-3.5 h-3.5 text-purple-400" /> 2. Segment Creator:
              </span>
              {creatorSegments.map((seg) => (
                <button
                  key={seg.key}
                  onClick={() => setSelectedSegment(seg.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                    selectedSegment === seg.key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            {/* Filter 3 & 4: KOC Category & Tệp Kênh Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 shrink-0 font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" /> 3. KOC Category:
                </span>
                <select
                  value={selectedKocCategory}
                  onChange={(e) => setSelectedKocCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {kocCategories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600 shrink-0 font-medium flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-pink-600" /> 4. Tệp Kênh (25 tệp):
                </span>
                <select
                  value={selectedTepKenh}
                  onChange={(e) => setSelectedTepKenh(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {tepKenhList.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KOC Directory Table */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Danh Mục KOC & Phân Loại 4 Trường Cốt Lõi (KL, Segment, Tệp Kênh, KOC Category)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chuẩn hóa theo file Quản lý Booking 3.1 & 3.2 • Nhấp vào dòng KOC để mở Hồ Sơ 360° & Đánh giá Winner Creator
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-emerald px-2.5 py-1 rounded-full text-xs font-bold">
                  Hiển thị {filteredKocs.length} KOCs
                </span>
                <button
                  onClick={() => setIsCreateKocOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Thêm KOC</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px] text-left border-collapse text-xs">
                <thead>
                  <tr className="table-header-enterprise bg-slate-50 border-b border-slate-200">
                    <th className="p-3.5 pl-6 font-bold text-slate-700 w-[240px] min-w-[240px]">KOC / Kênh & Khu Vực</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[120px] min-w-[120px]">Khung Lương (KL)</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[140px] min-w-[140px]">Phân Nhóm (Segment)</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[170px] min-w-[170px]">Tệp Kênh & Category</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[150px] min-w-[150px] text-right">Báo Giá Video Net</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[200px] min-w-[200px]">TikTok Shop (Follower / GMV / AOV)</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[150px] min-w-[150px]">Lịch Sử Upbase & ROI</th>
                    <th className="p-3.5 font-bold text-slate-700 w-[130px] min-w-[130px]">PIC Phụ Trách</th>
                    <th className="p-3.5 pr-6 font-bold text-slate-700 text-right w-[160px] min-w-[160px] sticky right-0 bg-slate-50 border-l border-slate-200">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredKocs.map((koc) => (
                    <tr
                      key={koc.id}
                      onClick={() => setInspectedKoc(koc)}
                      className="table-row-enterprise cursor-pointer group hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                            {koc.stageName}
                          </span>
                          {koc.isWinnerTop20 && (
                            <span className="badge-amber px-2 py-0.2 rounded-full text-[9px] font-bold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Winner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {koc.channelId} • {koc.phone}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-rose-500" />
                            {koc.location || 'Hà Nội'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] text-blue-600 font-medium">
                            {koc.bookingFormat || 'Booking Video KOC'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="badge-purple px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          {koc.salaryGrade}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">{koc.tierLabel}</div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          koc.segment === 'Top Creator' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          koc.segment === 'Key Creator' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          koc.segment === 'Mid Creator' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {koc.segment === 'Top Creator' && <Sparkles className="w-2.5 h-2.5 text-amber-600" />}
                          {koc.segment || 'Massive Creator'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-800 font-semibold">{koc.tepKenh || koc.creatorCategory || 'Review Nữ'}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="badge-emerald px-1.5 py-0.2 rounded text-[9px] font-medium">
                            {koc.kocCategory || 'Personal care'}
                          </span>
                          <span className="text-[10px] text-pink-600 font-mono">
                            👩 {koc.femaleRatio ?? 85}% • 👨 {koc.maleRatio ?? 15}%
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-blue-700 font-mono text-sm text-right whitespace-nowrap">
                        {koc.rateCardVideo.toLocaleString('vi-VN')}&nbsp;₫
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-900 font-bold">
                          {koc.followers.toLocaleString('vi-VN')} followers
                        </div>
                        <div className="text-[11px] text-emerald-600 font-mono mt-0.5 whitespace-nowrap font-semibold">
                          Kỷ lục GMV: {(koc.gmvBestCase || koc.rateCardVideo * 3).toLocaleString('vi-VN')}&nbsp;₫
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                          AOV: {(koc.aov || 245000).toLocaleString('vi-VN')}&nbsp;₫
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-emerald-700 font-mono whitespace-nowrap">
                          {(koc.totalPastGmv || koc.rateCardVideo * 3).toLocaleString('vi-VN')}&nbsp;₫
                        </div>
                        <div className="mt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (koc.historicalRoi || 2.5) >= 1.0 ? 'badge-emerald' : 'badge-amber'
                          }`}>
                            ROI {(koc.historicalRoi || 2.5).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-900 font-semibold text-xs">
                          {koc.bookingPic || 'Khánh Vy'}
                        </div>
                        <span className="badge-blue px-2 py-0.2 rounded text-[9px] font-bold mt-1 inline-block">
                          {koc.statusKoc || 'SẴN SÀNG'}
                        </span>
                      </td>

                      <td className="p-3.5 pr-6 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectedKoc(koc)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1 transition shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Hồ Sơ 360°</span>
                          </button>
                          <button
                            onClick={() => onOpenQuickBookWithKoc(koc)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1"
                          >
                            <span>Tạo Deal</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BÀN GIAO SANG TEAM GROWTH (QUÉT MÃ SPARK ADS & CHỐT ADS VỚI KHÁCH) */}
      {/* ========================================================================= */}
      {handoffDeal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHandoffDeal(null);
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Bàn Giao Sang Team Growth (Chạy Ads)"
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bàn Giao Sang Team Growth (Chạy Ads)</h3>
                  <p className="text-xs text-slate-500">{handoffDeal.dealCode} • {handoffDeal.kocStageName} • {handoffDeal.brandName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setHandoffDeal(null)}
                aria-label="Đóng modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 space-y-1">
                <span className="font-semibold block text-purple-950">Quy trình bàn giao kỹ thuật chuẩn Upbase:</span>
                <p className="text-[11px] text-purple-800">
                  Sau khi KOC air video và gửi mã Spark Ads TikTok, Booking bàn giao cho Growth Team để quét mã ủy quyền, gắn sản phẩm TikTok Shop và chốt ngân sách chạy Ads với khách hàng.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mã Spark Ads TikTok (Ủy quyền quảng cáo)</label>
                <input
                  type="text"
                  value={handoffForm.sparkAdsCode}
                  onChange={(e) => setHandoffForm(prev => ({ ...prev, sparkAdsCode: e.target.value }))}
                  placeholder="SPARK-TT-xxxx..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Link Video TikTok Đã Air</label>
                <input
                  type="text"
                  value={handoffForm.tiktokVideoUrl}
                  onChange={(e) => setHandoffForm(prev => ({ ...prev, tiktokVideoUrl: e.target.value }))}
                  placeholder="https://www.tiktok.com/@.../video/..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Thời Hạn Mã Ads</label>
                  <select
                    value={handoffForm.authDuration}
                    onChange={(e) => setHandoffForm(prev => ({ ...prev, authDuration: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="30 ngày">30 ngày</option>
                    <option value="60 ngày">60 ngày (Tiêu chuẩn)</option>
                    <option value="90 ngày">90 ngày</option>
                    <option value="Không giới hạn">Không giới hạn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Trạng Thái Khách Hàng</label>
                  <select
                    value={handoffForm.clientCommitmentStatus}
                    onChange={(e) => setHandoffForm(prev => ({ ...prev, clientCommitmentStatus: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="ĐÃ_CHỐT_NGÂN_SÁCH_ADS">Đã chốt ngân sách Ads</option>
                    <option value="CHỜ_DUYỆT_NGÂN_SÁCH">Đang trình duyệt ngân sách</option>
                    <option value="TEST_ORGANIC_TRƯỚC">Chạy organic 24h trước</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi Chú Target Cho Team Growth</label>
                <textarea
                  rows={2}
                  value={handoffForm.growthNote}
                  onChange={(e) => setHandoffForm(prev => ({ ...prev, growthNote: e.target.value }))}
                  placeholder="Ghi chú đối tượng khán giả, USP cần gắn khi set campaign..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setHandoffDeal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmGrowthHandoff}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Xác Nhận Bàn Giao Growth</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CẬP NHẬT TIẾN ĐỘ DEAL TÁC NGHIỆP (OPERATIONAL UPDATE MODAL) */}
      {/* ========================================================================= */}
      {editingDeal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDeal(null);
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Vận Hành Job Booking & Phê Duyệt Brand"
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-800"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {editingDeal.dealCode}
                  </span>
                  {editingDeal.jobId && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Mã Job: <strong className="text-blue-700">{editingDeal.jobId}</strong>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Vận Hành Job Booking &amp; Phê Duyệt Brand
                </h3>
                <p className="text-xs text-slate-500">
                  KOC: <strong className="text-slate-800">{editingDeal.kocStageName}</strong> • Brand: <strong className="text-blue-700">{editingDeal.brandName || 'Upbase Brand'}</strong> • SP: <span className="text-amber-700 font-medium">{editingDeal.productName || 'Chung'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDeal(null)}
                aria-label="Đóng modal"
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Field 0: Phê Duyệt Brand Theo Job Cụ Thể */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold block flex items-center gap-1.5">
                    <span className="text-amber-500">⭐</span> 1. Phê Duyệt Của Brand Đối Với Job Này:
                  </label>
                  <span className="text-[10px] text-slate-500">Duyệt theo từng Job / Chiến dịch</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'ĐÃ_DUYỆT', label: '✓ Brand Đã Duyệt', clsActive: 'bg-emerald-600 border-emerald-500 text-white' },
                    { key: 'CHỜ_DUYỆT', label: '⏳ Chờ Brand Duyệt', clsActive: 'bg-amber-600 border-amber-500 text-white' },
                    { key: 'TỪ_CHỐI', label: '✕ Brand Từ Chối', clsActive: 'bg-rose-600 border-rose-500 text-white' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        const newStatus = s.key as any;
                        setEditForm(prev => ({
                          ...prev,
                          brandApprovalStatus: newStatus,
                          pipelineText: newStatus === 'TỪ_CHỐI' ? 'Brand từ chối' : (newStatus === 'ĐÃ_DUYỆT' && prev.pipelineText === 'Chờ Brand duyệt' ? 'Đã tạo BO' : prev.pipelineText)
                        }));
                      }}
                      className={`py-2 px-2 rounded-lg font-bold border transition text-center text-xs ${
                        editForm.brandApprovalStatus === s.key
                          ? s.clsActive + ' shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* If Brand Rejected, prompt for reason */}
                {editForm.brandApprovalStatus === 'TỪ_CHỐI' && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="text-rose-600 font-bold block text-[11px]">
                      ⚠️ Lý Do Brand Từ Chối KOC Cho Job Này (Lưu vết &amp; Báo cáo):
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tệp follower lệch định vị, Brand yêu cầu chuyên gia, Chi phí vượt ngân sách..."
                      value={editForm.brandRejectReason}
                      onChange={(e) => setEditForm(prev => ({ ...prev, brandRejectReason: e.target.value }))}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Lệch định vị sản phẩm',
                        'Follower không khớp tệp khách',
                        'Chi phí rate card vượt ngân sách',
                        'Brand yêu cầu KOC chuyên gia/Bác sĩ',
                        'KOC quá bận / Trùng lịch'
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, brandRejectReason: reason }))}
                          className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                        >
                          + {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Field 1: Tiến Độ Tác Nghiệp Nội Bộ (Pipeline Lark Base) */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  2. Tiến Độ Vận Hành Nội Bộ (Pipeline 8 Bước Chuẩn Lark Base):
                </label>
                <select
                  value={editForm.pipelineText}
                  onChange={(e) => setEditForm(prev => ({ ...prev, pipelineText: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-blue-700 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Chờ Brand duyệt">1. Chờ Brand duyệt KOC</option>
                  <option value="Đã tạo BO">2. Đã tạo BO &amp; Ký Hợp đồng</option>
                  <option value="Gửi hàng">3. Gửi hàng mẫu (Sample)</option>
                  <option value="Kịch bản">4. Duyệt kịch bản nội dung</option>
                  <option value="KOC quay video">5. KOC quay &amp; nộp video nháp</option>
                  <option value="Lên video">6. Lên video TikTok &amp; Gắn giỏ hàng</option>
                  <option value="Nghiệm thu Ads">7. Nghiệm thu mã Spark Ads</option>
                  <option value="Đối soát">8. Đối soát thanh toán (Kế toán)</option>
                  <option value="Done">✓ Done (Hoàn tất chiến dịch)</option>
                  <option value="Brand từ chối">✕ Brand từ chối / Hủy job</option>
                </select>
              </div>

              {/* Field 2: Trạng Thái Gửi Mẫu Sản Phẩm (Sample) */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  3. Trạng Thái Gửi Mẫu Sản Phẩm (Sample Dispatch):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'CHƯA_GỬI', label: 'Chưa Gửi' },
                    { key: 'ĐANG_GIAO', label: 'Đang Giao Hàng' },
                    { key: 'ĐÃ_NHẬN', label: 'KOC Đã Nhận Mẫu' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, sampleStatus: s.key as any }))}
                      className={`py-2 px-2.5 rounded-lg font-bold border transition text-center ${
                        editForm.sampleStatus === s.key
                          ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: TikTok Video URL */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  4. Link Video TikTok Chính Thức Đã Lên Sóng:
                </label>
                <input
                  type="text"
                  placeholder="https://www.tiktok.com/@creator/video/7418..."
                  value={editForm.tiktokVideoUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tiktokVideoUrl: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Field 5: Ads Code Verification */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  5. Nghiệm Thu Mã Ủy Quyền Ads Spark Code (TikTok):
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  * Tránh Plan Gap ngân sách (ví dụ hụt 50M ở pHCare do chưa đối soát mã Ads)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'CHƯA_CẤP', label: '⚠️ Chưa Cấp Mã' },
                    { key: 'ĐÃ_NGHIỆM_THU', label: '✓ Đã Duyệt Mã Ads' },
                    { key: 'KHÔNG_DÙNG', label: 'Không Dùng Ads' },
                  ].map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, adsCodeStatus: a.key as any }))}
                      className={`py-2 px-2 rounded-lg font-bold border transition text-center ${
                        editForm.adsCodeStatus === a.key
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 6: GMV 30 Days & Views */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">
                    6. Số Lượt Views Đạt Được:
                  </label>
                  <input
                    type="number"
                    value={editForm.viewsCount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, viewsCount: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">
                    7. GMV 30 Ngày (Doanh Thu Thực Tế):
                  </label>
                  <input
                    type="number"
                    step={500000}
                    value={editForm.gmv30}
                    onChange={(e) => setEditForm(prev => ({ ...prev, gmv30: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-emerald-700 font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Field 8: Workflow Stage */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  8. Giai Đoạn Nghiệm Thu &amp; Kế Toán:
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SCRIPT_APPROVED">Đã Duyệt Kịch Bản (Cần Trình Ký)</option>
                  <option value="ADVANCE_PAID">Đã Chi Tạm Ứng (Đang Triển Khai)</option>
                  <option value="VIDEO_SUBMITTED">Video Đã Lên Sóng (Chờ Nghiệm Thu Link)</option>
                  <option value="VIDEO_VERIFIED">Đã Nghiệm Thu Video &amp; Mã Ads (Chờ Kế Toán Tất Toán)</option>
                  <option value="FINAL_PAID">Đã Tất Toán (Hoàn Tất Hợp Đồng)</option>
                  <option value="CANCELLED">Đã Hủy / Brand Từ Chối</option>
                </select>
              </div>
            </div>

            {/* Calculated Preview Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">ROI Dự Tính:</span>
                <span className="font-bold text-emerald-700 ml-1.5 font-mono">
                  {((editForm.gmv30 || 0) / (editingDeal.totalValue || 1)).toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                {editForm.gmv30 >= 30000000 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    🌟 Đạt Chuẩn Top 20 Winner
                  </span>
                )}
                {((editForm.gmv30 || 0) / (editingDeal.totalValue || 1)) >= 1.0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Hoàn Vốn (ROI &gt;= 1.0)
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingDeal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveDealUpdate}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu &amp; Đồng Bộ Báo Cáo</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
