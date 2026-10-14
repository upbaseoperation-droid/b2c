'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Store,
  Users,
  UserCheck,
  ShieldCheck,
  Plus,
  Check,
  Edit3,
  Sliders,
  AlertTriangle,
  Send,
  Clock,
  Flame,
  BarChart3,
  Filter,
  Search,
  RotateCcw,
  X,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight,
  TrendingUp,
  Coins,
  Database,
  GitFork
} from 'lucide-react';
import { 
  UserProfile, 
  BrandDetail, 
  StorePortfolioItem, 
  StaffMasterMember, 
  SlaTask,
  UserRole,
  BookingTeamGroup,
  BookingTeamMemberInfo,
  SystemDepartmentScope
} from '../../lib/types';
import { UPBASE_BRANDS_MASTER, UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';
import { BOOKING_TEAMS_STRUCTURE } from '../../lib/mockData';
import {
  classifyMasterStaffMember,
  getSavedDeptAccessRules,
  getSavedStaffAccessOverrides,
  INITIAL_DEPARTMENT_ACCESS_RULES,
  ROLE_DISPLAY_NAME
} from '../../lib/rbacData';
import { Avatar, Button, Presence, Segmented, Status , ChannelTag } from '../ui';
import { formatVndShort } from '../../lib/format';
import { MasterDataMindmapView } from './MasterDataMindmapView';

interface ManagerDelegationHubProps {
  currentUser: UserProfile;
  brands: BrandDetail[];
  onUpdateBrand: (updated: BrandDetail) => void;
  onAddBrand?: (newBrand: BrandDetail) => void;
  storePortfolios: StorePortfolioItem[];
  onUpdateStore: (updated: StorePortfolioItem) => void;
  staffList: StaffMasterMember[];
  tasks: SlaTask[];
  onAddTask: (task: SlaTask) => void;
  onPingStaff?: (staffName: string, message: string) => void;
  onNotify?: (msg: string) => void;
  onNavigateToDashboard?: (tabKey: string) => void;
}

export const ManagerDelegationHub: React.FC<ManagerDelegationHubProps> = ({
  currentUser,
  brands,
  onUpdateBrand,
  onAddBrand,
  storePortfolios,
  onUpdateStore,
  staffList,
  tasks,
  onAddTask,
  onPingStaff,
  onNotify,
  onNavigateToDashboard
}) => {
  const isGrowthManager = currentUser.role === 'GROWTH_MANAGER';
  const isMediaManager = currentUser.role === 'MEDIA_MANAGER';

  // Active Section Tab
  const [activeSection, setActiveSection] = useState<'STORES' | 'BRANDS' | 'STAFF' | 'TASKS' | 'LEADER_TEAMS'>(
    isGrowthManager || isMediaManager ? 'STAFF' : 'STORES'
  );
  const [leaderConsoleViewMode, setLeaderConsoleViewMode] = useState<'STORES_ASSIGN' | 'WORKLOAD_BALANCE'>('STORES_ASSIGN');
  const [selectedLeaderTeam, setSelectedLeaderTeam] = useState<'ALL' | 'TEAM_1' | 'TEAM_2'>('ALL');
  const [staffSubView, setStaffSubView] = useState<'WORKLOAD' | 'DIRECTORY'>(
    isGrowthManager || isMediaManager ? 'DIRECTORY' : 'WORKLOAD'
  );

  // Bộ lọc nhân sự theo Khối của Trưởng phòng (Marketing B2C / Growth / Media)
  const [deptStaffScope, setDeptStaffScope] = useState<SystemDepartmentScope>(
    isGrowthManager ? 'GROWTH' : isMediaManager ? 'MEDIA' : 'MARKETING_B2C'
  );
  const [deptStaffTeamFilter, setDeptStaffTeamFilter] = useState<string>('ALL');
  const [deptStaffSearch, setDeptStaffSearch] = useState<string>('');

  React.useEffect(() => {
    if (currentUser.role === 'GROWTH_MANAGER') {
      setDeptStaffScope('GROWTH');
      setActiveSection('STAFF');
      setStaffSubView('DIRECTORY');
    } else if (currentUser.role === 'MEDIA_MANAGER') {
      setDeptStaffScope('MEDIA');
      setActiveSection('STAFF');
      setStaffSubView('DIRECTORY');
    } else if (currentUser.role === 'MANAGER') {
      setDeptStaffScope('MARKETING_B2C');
    }
    setDeptStaffTeamFilter('ALL');
  }, [currentUser.role]);

  // Phân loại toàn bộ nhân sự thuộc 3 khối từ UPBASE_STAFF_MASTER
  const classifiedMasterStaff = useMemo(() => {
    const rules = getSavedDeptAccessRules(INITIAL_DEPARTMENT_ACCESS_RULES);
    const overrides = getSavedStaffAccessOverrides();
    return UPBASE_STAFF_MASTER.map(s => {
      const c = classifyMasterStaffMember(s, rules, overrides);
      return {
        ...s,
        ...c,
        classifiedScope: c.departmentScope,
        mappedRole: c.role,
      };
    });
  }, []);

  const scopedDepartmentStaff = useMemo(() => {
    return classifiedMasterStaff.filter(s => s.classifiedScope === deptStaffScope && s.canLogin);
  }, [classifiedMasterStaff, deptStaffScope]);

  const scopedTeams = useMemo(() => {
    const set = new Set<string>();
    scopedDepartmentStaff.forEach(s => {
      const t = (s.department || s.team || '').trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [scopedDepartmentStaff]);

  const filteredDepartmentStaff = useMemo(() => {
    const q = deptStaffSearch.trim().toLowerCase();
    return scopedDepartmentStaff.filter(s => {
      if (deptStaffTeamFilter !== 'ALL') {
        const t = (s.department || s.team || '').trim();
        if (t !== deptStaffTeamFilter) return false;
      }
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          (s.staffCode && s.staffCode.toLowerCase().includes(q)) ||
          s.email.toLowerCase().includes(q) ||
          (s.position && s.position.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [scopedDepartmentStaff, deptStaffTeamFilter, deptStaffSearch]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');

  const displayedBrands = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return brands.filter(b => {
      if (selectedBrandFilter !== 'ALL') {
        const pic = b.bookingPicLead || 'Đặng Thị Yến Nhi';
        if (pic !== selectedBrandFilter) return false;
      }
      if (q) {
        const matchName = b.name.toLowerCase().includes(q);
        const matchCompany = (b.companyName || '').toLowerCase().includes(q);
        const matchCat = (b.category || '').toLowerCase().includes(q);
        const matchPic = (b.bookingPicLead || '').toLowerCase().includes(q) ||
                         (b.accountPic || '').toLowerCase().includes(q) ||
                         (b.growthPic || '').toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchCat && !matchPic) return false;
      }
      return true;
    });
  }, [brands, searchTerm, selectedBrandFilter]);

  // Bộ lọc danh sách gian hàng (mặc định chỉ lọc gian B2C làm plan)
  const [storeFilterMode, setStoreFilterMode] = useState<'B2C_ONLY' | 'ALL'>('B2C_ONLY');
  const [storePlatformFilter, setStorePlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall' | 'Lazada'>('ALL');
  const [storeSearchTerm, setStoreSearchTerm] = useState('');

  // Danh sách gian hàng B2C làm kế hoạch tháng (69 gian hàng)
  const b2cPlanStores = useMemo(() => {
    return storePortfolios.filter(s => Boolean(s.requiresB2cPlan || s.isB2cManaged));
  }, [storePortfolios]);

  // Danh sách gian hàng hiển thị theo bộ lọc
  const displayedStores = useMemo(() => {
    return storePortfolios.filter(store => {
      // 1. Mặc định chỉ hiển thị gian hàng B2C làm kế hoạch
      if (storeFilterMode === 'B2C_ONLY') {
        const isB2c = Boolean(store.requiresB2cPlan || store.isB2cManaged);
        if (!isB2c) return false;
      }

      // 1b. Lọc theo nhóm mô hình 2 tầng (Trưởng nhóm vs Duyệt thẳng Trưởng phòng)
      if (selectedLeaderTeam !== 'ALL') {
        const isAssignedLeader = Boolean(store.hasBookingLeader && store.bookingLeader);
        if (selectedLeaderTeam === 'TEAM_1' && !isAssignedLeader) return false;
        if (selectedLeaderTeam === 'TEAM_2' && isAssignedLeader) return false;
      }

      // 2. Lọc theo nhân sự phụ trách
      if (selectedStaffFilter !== 'ALL') {
        const matchStaff = (store.b2cOwners && store.b2cOwners.includes(selectedStaffFilter)) ||
                           (store.b2cOwnerName && store.b2cOwnerName.includes(selectedStaffFilter));
        if (!matchStaff) return false;
      }

      // 3. Lọc theo sàn thương mại điện tử
      if (storePlatformFilter !== 'ALL') {
        if (store.platform !== storePlatformFilter) return false;
      }

      // 4. Tìm kiếm từ khóa
      if (storeSearchTerm.trim()) {
        const q = storeSearchTerm.toLowerCase().trim();
        const matchName = store.storeName.toLowerCase().includes(q);
        const matchBrand = (store.brandName || '').toLowerCase().includes(q);
        const matchPic = (store.b2cOwnerName || '').toLowerCase().includes(q) || 
                         (store.accountOwnerName || '').toLowerCase().includes(q) ||
                         (store.b2cOwners && store.b2cOwners.some(bo => bo.toLowerCase().includes(q)));
        if (!matchName && !matchBrand && !matchPic) return false;
      }

      return true;
    });
  }, [storePortfolios, storeFilterMode, selectedLeaderTeam, selectedStaffFilter, storePlatformFilter, storeSearchTerm]);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);

  // New Task Form State
  const [newTaskState, setNewTaskState] = useState<{
    targetStaff: string;
    brand: string;
    title: string;
    description: string;
    deadlineHours: number;
    urgency: 'critical' | 'warning' | 'normal';
    type: 'GENERAL_TASK' | 'CAMPAIGN_BRIEF' | 'SCRIPT_REVIEW' | 'CONTRACT_APPROVAL' | 'SAMPLE_DELIVERY' | 'ADS_CODE_RETRIEVAL';
  }>({
    targetStaff: 'Khánh Vy',
    brand: 'Fresh',
    title: '',
    description: '',
    deadlineHours: 24,
    urgency: 'warning',
    type: 'GENERAL_TASK'
  });

  // New/Edit Brand Form State
  const [brandAddMode, setBrandAddMode] = useState<'FROM_MASTER' | 'CUSTOM'>('FROM_MASTER');
  const [selectedMasterBrandId, setSelectedMasterBrandId] = useState<string>('');
  const [masterBrandSearch, setMasterBrandSearch] = useState<string>('');
  const [masterBrandCategoryFilter, setMasterBrandCategoryFilter] = useState<string>('ALL');
  const [hideAllocatedMasterBrands, setHideAllocatedMasterBrands] = useState<boolean>(true);

  const [brandFormState, setBrandFormState] = useState<{
    name: string;
    companyName: string;
    category: string;
    planBudget: number;
    targetGmv: number;
    bookingPicLead: string;
    accountPic: string;
    growthPic: string;
    brandGuideline: string;
  }>({
    name: '',
    companyName: '',
    category: 'Mỹ phẩm & Chăm sóc da',
    planBudget: 150000000,
    targetGmv: 450000000,
    bookingPicLead: 'Đặng Thị Yến Nhi',
    accountPic: 'Phạm Thị Nhài',
    growthPic: 'Hoàng Long',
    brandGuideline: ''
  });

  // Master Data categories
  const masterCategories = useMemo(() => {
    const set = new Set<string>();
    UPBASE_BRANDS_MASTER.forEach(b => {
      if (b.category) set.add(b.category.trim());
    });
    return Array.from(set).sort();
  }, []);

  // Filtered Master Brands
  const filteredMasterBrands = useMemo(() => {
    const q = masterBrandSearch.trim().toLowerCase();
    return UPBASE_BRANDS_MASTER.filter(b => {
      const matchesSearch = !q || 
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.companyName && b.companyName.toLowerCase().includes(q));
      
      const matchesCat = masterBrandCategoryFilter === 'ALL' || b.category === masterBrandCategoryFilter;
      
      const isAlreadyAllocated = brands.some(ab => 
        ab.id === b.id || ab.name.trim().toLowerCase() === b.name.trim().toLowerCase()
      );

      if (hideAllocatedMasterBrands && isAlreadyAllocated) {
        return false;
      }

      return matchesSearch && matchesCat;
    });
  }, [masterBrandSearch, masterBrandCategoryFilter, hideAllocatedMasterBrands, brands]);

  // Selected Master Brand Detail
  const selectedMasterBrand = useMemo(() => {
    if (!selectedMasterBrandId) return null;
    return UPBASE_BRANDS_MASTER.find(b => b.id === selectedMasterBrandId) || null;
  }, [selectedMasterBrandId]);

  const handleSelectMasterBrand = (master: BrandDetail) => {
    setSelectedMasterBrandId(master.id);
    setBrandFormState({
      name: master.name,
      companyName: master.companyName || '',
      category: master.category || 'Mỹ phẩm & Chăm sóc da',
      planBudget: master.planBudget || master.monthlyBudget || 150000000,
      targetGmv: master.targetGmv || 450000000,
      bookingPicLead: master.bookingPicLead || staffList[0]?.name || 'Đặng Thị Yến Nhi',
      accountPic: master.accountPic || 'Phạm Thị Nhài',
      growthPic: master.growthPic || 'Hoàng Long',
      brandGuideline: master.brandGuideline || ''
    });
  };

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  // Staff options (Booking, Brand, Content)
  const bookingAndBrandStaff = useMemo(() => {
    return staffList.filter(s => s.role === 'BOOKING' || s.role === 'GROWTH' || s.role === 'MANAGER');
  }, [staffList]);

  // Handle direct task creation
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskState.title.trim()) {
      notify('Vui lòng nhập tiêu đề nhiệm vụ!');
      return;
    }

    const assignedMember = staffList.find(s => s.name === newTaskState.targetStaff);
    const targetRole: UserRole = assignedMember?.role === 'BOOKING' 
      ? 'BOOKING_MEMBER' 
      : assignedMember?.role === 'CONTENT' 
      ? 'CONTENT_MEMBER' 
      : 'BRAND_MEMBER';

    const createdTask: SlaTask = {
      id: `task-lead-${Date.now()}`,
      title: newTaskState.title,
      description: newTaskState.description || `Chỉ đạo trực tiếp từ Trưởng phòng ${currentUser.name}`,
      brand: newTaskState.brand,
      team: assignedMember?.team || 'Vận Hành B2C',
      deadline: `Trong vòng ${newTaskState.deadlineHours}h`,
      remainingText: `Còn ${newTaskState.deadlineHours} giờ`,
      deadlineHours: newTaskState.deadlineHours,
      urgency: newTaskState.urgency,
      pic: newTaskState.targetStaff,
      targetRole: targetRole,
      type: newTaskState.type,
      actionLabel: 'Xử lý ngay',
      createdAt: new Date().toISOString()
    };

    onAddTask(createdTask);
    notify(`Trưởng phòng đã giao nhiệm vụ "${newTaskState.title}" cho chuyên viên ${newTaskState.targetStaff}!`);
    
    if (onPingStaff) {
      onPingStaff(newTaskState.targetStaff, `Nhiệm vụ mới từ Trưởng phòng: ${newTaskState.title}`);
    }

    setIsTaskModalOpen(false);
    setNewTaskState({
      targetStaff: 'Khánh Vy',
      brand: 'Fresh',
      title: '',
      description: '',
      deadlineHours: 24,
      urgency: 'warning',
      type: 'GENERAL_TASK'
    });
  };

  // Handle Brand Save / Update
  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFormState.name.trim()) return;

    if (editingBrand) {
      const updated: BrandDetail = {
        ...editingBrand,
        name: brandFormState.name,
        companyName: brandFormState.companyName,
        category: brandFormState.category,
        planBudget: brandFormState.planBudget,
        targetGmv: brandFormState.targetGmv,
        bookingPicLead: brandFormState.bookingPicLead,
        accountPic: brandFormState.accountPic,
        growthPic: brandFormState.growthPic,
        brandGuideline: brandFormState.brandGuideline
      };
      onUpdateBrand(updated);
      notify(`Đã cập nhật phân công cho nhãn hàng ${updated.name}: PIC Lead là ${updated.bookingPicLead}!`);
    } else if (onAddBrand) {
      const baseMaster = selectedMasterBrandId
        ? UPBASE_BRANDS_MASTER.find(b => b.id === selectedMasterBrandId)
        : UPBASE_BRANDS_MASTER.find(b => b.name.trim().toLowerCase() === brandFormState.name.trim().toLowerCase());

      const newBrand: BrandDetail = {
        ...(baseMaster || {}),
        id: baseMaster ? baseMaster.id : `brand-${Date.now()}`,
        code: baseMaster ? baseMaster.code : `BRAND_${brandFormState.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: brandFormState.name,
        companyName: brandFormState.companyName || baseMaster?.companyName || 'Công ty Đối tác',
        category: brandFormState.category || baseMaster?.category || 'Mỹ phẩm & Chăm sóc da',
        color: baseMaster?.color || 'bg-blue-600',
        status: 'ACTIVE',
        planBudget: brandFormState.planBudget,
        spentBudget: 0,
        targetGmv: brandFormState.targetGmv,
        currentGmv: 0,
        targetVideos: baseMaster?.targetVideos || 100,
        airedVideos: 0,
        bookingPicLead: brandFormState.bookingPicLead,
        accountPic: brandFormState.accountPic,
        growthPic: brandFormState.growthPic,
        brandGuideline: brandFormState.brandGuideline || baseMaster?.brandGuideline || 'Quy định nội dung thương hiệu...',
        kocCriteria: baseMaster?.kocCriteria || 'Phù hợp định vị nhãn hàng',
        stores: baseMaster?.stores || [],
        heroProducts: baseMaster?.heroProducts || []
      };
      onAddBrand(newBrand);
      notify(`Đã thêm nhãn hàng mới ${newBrand.name} ${baseMaster ? 'từ Master Data' : ''} và phân bổ PIC Lead ${newBrand.bookingPicLead}!`);
    }

    setIsBrandModalOpen(false);
    setEditingBrand(null);
    setSelectedMasterBrandId('');
  };

  // Open Edit Brand modal
  const handleOpenEditBrand = (brand: BrandDetail) => {
    setEditingBrand(brand);
    setSelectedMasterBrandId(brand.id);
    setBrandAddMode('FROM_MASTER');
    setBrandFormState({
      name: brand.name,
      companyName: brand.companyName,
      category: brand.category,
      planBudget: brand.planBudget,
      targetGmv: brand.targetGmv,
      bookingPicLead: brand.bookingPicLead || staffList[0]?.name || 'Đặng Thị Yến Nhi',
      accountPic: brand.accountPic || 'Phạm Thị Nhài',
      growthPic: brand.growthPic || 'Hoàng Long',
      brandGuideline: brand.brandGuideline || ''
    });
    setIsBrandModalOpen(true);
  };

  // Open Edit Store modal
  const handleOpenEditStore = (store: StorePortfolioItem) => {
    setEditingStore(store);
  };

  // Save Store Assignment (lưu vết bàn giao nếu đổi PIC để bảo toàn lịch sử)
  const handleSaveStoreAssignment = (storeId: string, b2cOwners: string[], notes: string) => {
    const targetStore = storePortfolios.find(s => s.id === storeId);
    if (!targetStore) return;

    const prevOwner = (targetStore.b2cOwners && targetStore.b2cOwners[0]) || targetStore.b2cOwnerName || '';
    const nextOwner = b2cOwners[0] || '';
    const isPicChanged = Boolean(prevOwner && nextOwner && prevOwner !== nextOwner);
    const today = new Date().toISOString().slice(0, 10);

    const updated: StorePortfolioItem = {
      ...targetStore,
      ...(isPicChanged ? {
        previousPic: prevOwner,
        handoverEffectiveDate: today,
      } : {}),
      b2cOwners: b2cOwners,
      b2cOwnerName: b2cOwners.join(', '),
      primaryPic: nextOwner || targetStore.primaryPic,
      assignedStaff: nextOwner || targetStore.assignedStaff,
      assignmentNotes: notes,
      updatedAt: new Date().toISOString(),
    };

    onUpdateStore(updated);
    notify(
      isPicChanged
        ? `Đã bàn giao gian "${updated.storeName}" từ ${prevOwner} sang ${b2cOwners.join(' & ')} (hiệu lực ${today})`
        : `Đã cập nhật phân công gian hàng "${updated.storeName}"`
    );
    setEditingStore(null);
  };

  const uniqueBrandPics = useMemo(() => {
    const set = new Set<string>();
    brands.forEach(b => {
      if (b.bookingPicLead) set.add(b.bookingPicLead);
    });
    return Array.from(set).sort();
  }, [brands]);

  return (
    <div className="space-y-4">
      {/* Thanh phân khu: 4 mục tác nghiệp điều phối (không trùng lặp báo cáo với Dashboard) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={activeSection}
          onChange={setActiveSection}
          items={[
            { 
              key: 'STORES', 
              label: storeFilterMode === 'B2C_ONLY' 
                ? `Phân công Gian hàng (2 tầng) · ${b2cPlanStores.length}` 
                : `Phân công Gian hàng · ${storePortfolios.length}` 
            },
            { key: 'BRANDS', label: `Phân công Nhãn hàng · ${brands.length}` },
            { key: 'STAFF', label: `Cân bằng tải & Danh bạ · ${staffList.length}` },
            { key: 'TASKS', label: `Giao việc & Chỉ đạo · ${tasks.length}` },
          ]}
        />
        <div className="flex items-center gap-2">
          {onNavigateToDashboard && (
            <button
              type="button"
              onClick={() => onNavigateToDashboard(
                activeSection === 'BRANDS' ? 'dashboard-brand' :
                activeSection === 'STAFF' ? 'dashboard-staff' : 'dashboard-store'
              )}
              className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-canvas text-xs font-medium text-ink-2 hover:text-ink flex items-center gap-1.5 transition"
            >
              <BarChart3 className="w-3.5 h-3.5 text-brand" />
              <span>
                {activeSection === 'BRANDS' ? 'Xem Dashboard Thương hiệu' :
                 activeSection === 'STAFF' ? 'Xem Dashboard Hiệu suất Nhân viên' : 'Xem Dashboard Gian hàng'}
              </span>
              <ArrowRight className="w-3 h-3 text-ink-3" />
            </button>
          )}
          <Button icon={Send} onClick={() => setIsTaskModalOpen(true)}>Giao việc</Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setEditingBrand(null);
              setBrandAddMode('FROM_MASTER');
              setSelectedMasterBrandId('');
              setMasterBrandSearch('');
              setMasterBrandCategoryFilter('ALL');
              setHideAllocatedMasterBrands(true);
              setBrandFormState({
                name: '',
                companyName: '',
                category: 'Mỹ phẩm & Chăm sóc da',
                planBudget: 150000000,
                targetGmv: 450000000,
                bookingPicLead: staffList[0]?.name || 'Đặng Thị Yến Nhi',
                accountPic: 'Phạm Thị Nhài',
                growthPic: 'Hoàng Long',
                brandGuideline: ''
              });
              setIsBrandModalOpen(true);
            }}
          >
            Thêm nhãn hàng
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PHÂN CÔNG NHÃN HÀNG (BRAND PIC, ACCOUNT PIC, GROWTH PIC)               */}
      {/* ========================================================================= */}
      {activeSection === 'BRANDS' && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  placeholder="Tìm nhãn hàng, công ty, PIC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-focus"
                />
              </div>

              <select
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL">Tất cả Brand PIC</option>
                {uniqueBrandPics.map(pic => (
                  <option key={pic} value={pic}>{pic}</option>
                ))}
              </select>

              {(searchTerm || selectedBrandFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBrandFilter('ALL');
                  }}
                  className="text-2xs text-ink-3 hover:text-ink px-2 py-1 rounded bg-sunken transition"
                >
                  Xóa lọc ({displayedBrands.length}/{brands.length})
                </button>
              )}
            </div>

            <div className="text-2xs text-ink-3">
              Gán đầu mối chịu trách nhiệm chính (Brand PIC, Account PIC, Growth PIC) cho <strong className="text-ink font-semibold">{displayedBrands.length}</strong> thương hiệu
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-2xs">
                  <th className="py-2.5 px-4 min-w-[200px]">Nhãn hàng</th>
                  <th className="py-2.5 px-3 min-w-[185px]">Brand PIC (Booking Lead)</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Account PIC</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Growth PIC</th>
                  <th className="py-2.5 px-3 text-center w-28">Số gian B2C</th>
                  <th className="py-2.5 px-3 text-right w-28"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {displayedBrands.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-ink-3 text-xs">
                      Không tìm thấy nhãn hàng phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  displayedBrands.map((brand) => {
                    const brandStoresCount = storePortfolios.filter(s => 
                      s.brandName.toLowerCase().includes(brand.name.toLowerCase()) && 
                      (storeFilterMode === 'ALL' ? true : Boolean(s.requiresB2cPlan || s.isB2cManaged))
                    ).length;

                    return (
                      <tr key={brand.id} className="hover:bg-canvas transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-sunken text-ink-2 font-semibold text-2xs flex items-center justify-center shrink-0">
                              {brand.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-ink text-xs block truncate">{brand.name}</span>
                              <span className="text-2xs text-ink-3 block truncate max-w-[180px]">
                                {brand.companyName || brand.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Brand PIC Dropdown */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={brand.bookingPicLead || 'Đặng Thị Yến Nhi'} size={22} />
                            <select
                              value={brand.bookingPicLead || 'Đặng Thị Yến Nhi'}
                              onChange={(e) => {
                                const updated = { ...brand, bookingPicLead: e.target.value };
                                onUpdateBrand(updated);
                                notify(`Đã gán Brand PIC của ${brand.name} cho ${e.target.value}`);
                              }}
                              className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {staffList.map(s => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Account PIC Dropdown */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={brand.accountPic || 'Phạm Thị Nhài'} size={22} />
                            <select
                              value={brand.accountPic || 'Phạm Thị Nhài'}
                              onChange={(e) => {
                                const updated = { ...brand, accountPic: e.target.value };
                                onUpdateBrand(updated);
                                notify(`Đã gán Account PIC của ${brand.name} cho ${e.target.value}`);
                              }}
                              className="w-full min-w-0 text-xs px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {staffList.filter(s => s.role === 'ACCOUNT' || s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Growth PIC Dropdown */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={brand.growthPic || 'Hoàng Long'} size={22} />
                            <select
                              value={brand.growthPic || 'Hoàng Long'}
                              onChange={(e) => {
                                const updated = { ...brand, growthPic: e.target.value };
                                onUpdateBrand(updated);
                                notify(`Đã gán Growth PIC của ${brand.name} cho ${e.target.value}`);
                              }}
                              className="w-full min-w-0 text-xs px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {staffList.filter(s => s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {brandStoresCount > 0 ? (
                            <span className="tabular-nums font-medium text-ink-2">{brandStoresCount} gian</span>
                          ) : (
                            <Status tone="warning">Chưa gán</Status>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenEditBrand(brand)}>
                            Cấu hình
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PHÂN CÔNG GIAN HÀNG 2 TẦNG (HỢP NHẤT TRƯỞNG NHÓM & CHUYÊN VIÊN)         */}
      {/* ========================================================================= */}
      {activeSection === 'STORES' && (
        <div className="space-y-4">
          {/* 2 Thẻ Nhóm Quản Trị (Mô hình 2 tầng B2C) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {BOOKING_TEAMS_STRUCTURE.map(team => {
              const isSelected = selectedLeaderTeam === (team.teamCode as any);
              const isLeaderGroup = team.id === 'team-tam';
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedLeaderTeam(isSelected ? 'ALL' : (team.teamCode as any))}
                  className={`text-left bg-surface rounded-xl border p-3.5 transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-brand ring-1 ring-brand/20 bg-brand-soft/15'
                      : 'border-line hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={team.leaderName} size={38} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-2xs font-mono font-semibold px-1.5 py-0.5 rounded bg-brand-soft text-brand border border-brand-line">
                          {isLeaderGroup ? 'Nhóm có Trưởng nhóm' : 'Báo cáo trực tiếp Trưởng phòng'}
                        </span>
                        <span className="text-xs font-semibold text-ink truncate">{team.leaderName}</span>
                      </div>
                      <p className="text-2xs text-ink-3 mt-0.5 truncate">
                        {isLeaderGroup
                          ? 'Sơ duyệt kịch bản/plan cho 8 gian hàng trước khi trình Trưởng phòng'
                          : 'Chuyên viên chủ động lập phân rã & trình duyệt thẳng Trưởng phòng Đặng Thị Yến Nhi'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2 border-l border-line">
                    <div className="text-base font-mono font-bold text-ink">{team.managedStoresCount} gian</div>
                    <div className="text-2xs text-ink-3">{team.members.length} chuyên viên</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Segmented Switcher: B2C Plan Only (Default) vs All */}
                <Segmented
                  value={storeFilterMode}
                  onChange={setStoreFilterMode}
                  items={[
                    { key: 'B2C_ONLY', label: `Gian B2C làm plan · ${b2cPlanStores.length}` },
                    { key: 'ALL', label: `Tất cả gian · ${storePortfolios.length}` },
                  ]}
                />

                {/* Lọc luồng duyệt 2 tầng */}
                <select
                  value={selectedLeaderTeam}
                  onChange={(e) => setSelectedLeaderTeam(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
                >
                  <option value="ALL">Tất cả luồng duyệt (2 tầng)</option>
                  <option value="TEAM_1">Qua Trưởng nhóm Nguyễn Thị Ngọc Tâm (8 gian)</option>
                  <option value="TEAM_2">Duyệt thẳng Trưởng phòng Đặng Thị Yến Nhi (61 gian)</option>
                </select>

                {/* Search input */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input
                    type="text"
                    placeholder="Tìm tên gian hàng, Brand, PIC..."
                    value={storeSearchTerm}
                    onChange={(e) => setStoreSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-surface border border-line-strong rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-focus"
                  />
                </div>

                {/* Platform Filter */}
                <select
                  value={storePlatformFilter}
                  onChange={(e) => setStorePlatformFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
                >
                  <option value="ALL">Tất cả sàn</option>
                  <option value="TikTok Shop">TikTok Shop</option>
                  <option value="Shopee Mall">Shopee Mall</option>
                  <option value="Lazada">Lazada</option>
                </select>

                {/* Staff Filter */}
                <select
                  value={selectedStaffFilter}
                  onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
                >
                  <option value="ALL">Tất cả chuyên viên</option>
                  {staffList.filter(s => s.role === 'BOOKING').map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-2xs text-ink-3">
                Hiển thị <strong className="text-ink font-semibold">{displayedStores.length}</strong> gian hàng · Đổi chuyên viên tự động lưu vết bàn giao
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-2xs">
                    <th className="py-2.5 px-4 min-w-[200px]">Gian hàng & sàn</th>
                    <th className="py-2.5 px-3">Nhãn hàng</th>
                    <th className="py-2.5 px-3 min-w-[195px]">Cấp duyệt trung gian (Leader)</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Chuyên viên B2C phụ trách</th>
                    <th className="py-2.5 px-3">Account PIC</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Ghi chú chỉ đạo điều phối</th>
                    <th className="py-2.5 px-3 text-right w-28"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {displayedStores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-ink-3 text-xs">
                        Không có gian hàng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    displayedStores.map((store) => {
                      const owners = store.b2cOwners || (store.b2cOwnerName ? store.b2cOwnerName.split(',').map(s => s.trim()) : ['Khánh Vy']);
                      const hasLeader = Boolean(store.hasBookingLeader && store.bookingLeader);
                      const currentLeaderVal = hasLeader ? (store.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : 'NONE';

                      return (
                        <tr key={store.id} className="hover:bg-canvas transition-colors group">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink text-xs">{store.storeName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ChannelTag channel={store.platform} />
                              {!Boolean(store.requiresB2cPlan || store.isB2cManaged) && (
                                <span className="text-2xs text-ink-3">· Miễn trừ plan</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-medium text-ink-2">
                            {store.brandName}
                          </td>

                          {/* Inline Leader Selector */}
                          <td className="py-3 px-3">
                            <select
                              value={currentLeaderVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                const isNone = val === 'NONE';
                                const newLeader = isNone ? undefined : 'Nguyễn Thị Ngọc Tâm';
                                const updated: StorePortfolioItem = {
                                  ...store,
                                  bookingLeader: newLeader,
                                  hasBookingLeader: !isNone,
                                };
                                onUpdateStore(updated);
                                notify(isNone
                                  ? `Gian "${store.storeName}" chuyển sang: Duyệt thẳng Trưởng phòng Đặng Thị Yến Nhi`
                                  : `Đã gán Trưởng nhóm Nguyễn Thị Ngọc Tâm phụ trách sơ duyệt gian "${store.storeName}"`);
                              }}
                              className="w-full text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              <option value="NONE">Duyệt thẳng Trưởng phòng</option>
                              <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Leader)</option>
                            </select>
                          </td>

                          {/* Assignee Selector */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={owners[0] || 'Khánh Vy'} size={22} />
                              <select
                                value={owners[0] || 'Khánh Vy'}
                                onChange={(e) => {
                                  const newOwners = [e.target.value];
                                  handleSaveStoreAssignment(store.id, newOwners, store.assignmentNotes || '');
                                }}
                                className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                              >
                                {staffList.filter(s => s.role === 'BOOKING' || s.role === 'CONTENT').map(s => (
                                  <option key={s.id} value={s.name}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {store.previousPic && (
                              <span className="text-2xs text-ink-3 block mt-0.5 pl-7">
                                Trước: {store.previousPic} {store.handoverEffectiveDate ? `(${store.handoverEffectiveDate})` : ''}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-ink-2">
                            {store.accountOwnerName || 'Phạm Thị Nhài'}
                          </td>

                          {/* Assignment Notes */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              placeholder="Ghi chú điều phối..."
                              defaultValue={store.assignmentNotes || ''}
                              onBlur={(e) => {
                                if (e.target.value !== store.assignmentNotes) {
                                  handleSaveStoreAssignment(store.id, owners, e.target.value);
                                }
                              }}
                              className="w-full text-xs px-2.5 py-1 bg-surface border border-line rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-focus transition"
                            />
                          </td>

                          <td className="py-3 px-3 text-right">
                            <Button size="sm" variant="secondary" onClick={() => handleOpenEditStore(store)}>
                              Bàn giao
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CÂN BẰNG TẢI ĐỊNH MỨC & DANH BẠ NHÂN SỰ THEO KHỐI                      */}
      {/* ========================================================================= */}
      {activeSection === 'STAFF' && (
        <div className="space-y-4">
          {/* Sub-view switcher: Định mức tải gian hàng B2C vs Danh bạ theo khối */}
          <div className="bg-surface border border-line p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                {staffSubView === 'WORKLOAD'
                  ? `Cân bằng định mức tải gian hàng B2C (${staffList.length} nhân sự)`
                  : `Danh bạ nhân sự theo khối (${filteredDepartmentStaff.length} / ${scopedDepartmentStaff.length} nhân viên)`}
              </h3>
              <p className="text-xs text-ink-3 mt-0.5">
                {staffSubView === 'WORKLOAD'
                  ? `Kiểm soát định mức số gian hàng phụ trách (khuyến nghị <= 3 gian/chuyên viên) để điều chuyển khi quá tải. Để xem KPI, % Spend, Video Air và ROAS, vui lòng mở Dashboard 5.`
                  : `Tra cứu nhân sự thuộc khối được cấp quyền truy cập và giao việc trực tiếp`}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-sunken p-1 rounded-lg border border-line shrink-0">
              <button
                type="button"
                onClick={() => setStaffSubView('WORKLOAD')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  staffSubView === 'WORKLOAD'
                    ? 'bg-surface text-ink shadow-2xs font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Định mức tải gian hàng ({staffList.length})
              </button>
              <button
                type="button"
                onClick={() => setStaffSubView('DIRECTORY')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  staffSubView === 'DIRECTORY'
                    ? 'bg-surface text-ink shadow-2xs font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Danh bạ theo khối ({scopedDepartmentStaff.length})
              </button>
            </div>
          </div>

          {staffSubView === 'WORKLOAD' && (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-ink-2">
                  Đang tính tải trên: <strong className="text-ink font-semibold">{storeFilterMode === 'B2C_ONLY' ? `${b2cPlanStores.length} gian B2C làm plan` : `${storePortfolios.length} gian toàn hệ thống`}</strong>
                </span>
                <div className="inline-flex p-0.5 bg-sunken rounded-lg border border-line text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setStoreFilterMode('B2C_ONLY')}
                    className={`px-2.5 py-1 rounded-md text-xs transition ${
                      storeFilterMode === 'B2C_ONLY'
                        ? 'bg-surface text-ink font-semibold shadow-2xs'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    Gian B2C làm plan ({b2cPlanStores.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreFilterMode('ALL')}
                    className={`px-2.5 py-1 rounded-md text-xs transition ${
                      storeFilterMode === 'ALL'
                        ? 'bg-surface text-ink font-semibold shadow-2xs'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    Tất cả gian ({storePortfolios.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {staffList.map((staff) => {
                  const targetPool = storeFilterMode === 'B2C_ONLY' ? b2cPlanStores : storePortfolios;
                  const assignedStores = targetPool.filter(st => 
                    (st.b2cOwners && st.b2cOwners.includes(staff.name)) || st.b2cOwnerName.includes(staff.name)
                  );
                  const maxCap = staff.maxStoresCapacity || 3;
                  const loadPct = Math.round((assignedStores.length / maxCap) * 100);
                  const isOverloaded = assignedStores.length > maxCap;
                  const isOptimal = assignedStores.length === maxCap;

                  return (
                    <div
                      key={staff.id}
                      className={`bg-surface rounded-xl border p-4 flex flex-col justify-between transition ${
                        isOverloaded ? 'border-critical-line' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={staff.name} size={36} />
                            <div className="min-w-0">
                              <span className="font-semibold text-ink text-xs block truncate">{staff.name}</span>
                              <span className="text-2xs text-ink-3 block leading-tight truncate">{staff.roleTitle}</span>
                            </div>
                          </div>
                          <span className="text-2xs font-medium px-2 py-0.5 rounded bg-sunken text-ink-2 border border-line shrink-0">
                            {staff.role}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-line flex items-baseline justify-between text-xs">
                          <span className="text-ink-3">Gian phụ trách:</span>
                          <span className={`font-mono font-semibold ${isOverloaded ? 'text-critical' : 'text-ink'}`}>
                            {assignedStores.length} / {maxCap} gian ({loadPct}%)
                          </span>
                        </div>

                        {/* Progress Bar of Capacity */}
                        <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`data-bar h-full rounded-full ${
                              isOverloaded ? 'bg-critical' : isOptimal ? 'bg-positive' : 'bg-brand'
                            }`}
                            style={{ width: `${Math.min(100, loadPct)}%` }}
                          />
                        </div>

                        {/* Assigned Stores List tags */}
                        <div className="mt-3">
                          <span className="text-2xs font-medium text-ink-3 block mb-1">
                            Danh sách gian hàng:
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {assignedStores.length > 0 ? (
                              assignedStores.map(st => (
                                <span key={st.id} className="text-2xs px-1.5 py-0.5 rounded bg-canvas border border-line text-ink-2 font-medium truncate max-w-[140px]" title={st.storeName}>
                                  {st.storeName.split('_')[0]}
                                </span>
                              ))
                            ) : (
                              <span className="text-2xs text-ink-3 italic">Chưa gán gian hàng</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-line flex items-center justify-between">
                        <button
                          onClick={() => {
                            setNewTaskState(prev => ({
                              ...prev,
                              targetStaff: staff.name
                            }));
                            setIsTaskModalOpen(true);
                          }}
                          className="w-full py-1.5 rounded-lg bg-canvas hover:bg-sunken text-ink-2 hover:text-ink text-xs font-medium border border-line flex items-center justify-center gap-1.5 transition"
                        >
                          <Send className="w-3 h-3 text-brand" />
                          <span>Giao việc</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {staffSubView === 'DIRECTORY' && (
            <div className="bg-surface border border-line p-4 rounded-xl space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="text-xs text-ink-2">
                  {deptStaffScope === 'GROWTH'
                    ? `Khối Growth — Trưởng phòng: Trần Thị Đỗ Quyên`
                    : deptStaffScope === 'MEDIA'
                    ? `Khối Media — Trưởng phòng: Nguyễn Đức Quảng`
                    : `Khối Marketing B2C — Trưởng phòng: Đặng Thị Yến Nhi`}
                </div>

                {currentUser.role === 'ADMIN' && (
                  <div className="inline-flex p-0.5 bg-sunken rounded-lg border border-line text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => { setDeptStaffScope('MARKETING_B2C'); setDeptStaffTeamFilter('ALL'); }}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        deptStaffScope === 'MARKETING_B2C' ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-ink-2'
                      }`}
                    >
                      Khối MKT B2C
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeptStaffScope('GROWTH'); setDeptStaffTeamFilter('ALL'); }}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        deptStaffScope === 'GROWTH' ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-ink-2'
                      }`}
                    >
                      Khối Growth
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeptStaffScope('MEDIA'); setDeptStaffTeamFilter('ALL'); }}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        deptStaffScope === 'MEDIA' ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-ink-2'
                      }`}
                    >
                      Khối Media
                    </button>
                  </div>
                )}
              </div>

              {/* Thanh tìm kiếm & lọc theo Team trong khối */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[220px] max-w-sm flex-1">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã NV, email, vị trí..."
                    value={deptStaffSearch}
                    onChange={(e) => setDeptStaffSearch(e.target.value)}
                    className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-line focus:outline-none focus:border-brand bg-surface"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeptStaffTeamFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md text-2xs font-medium border transition ${
                      deptStaffTeamFilter === 'ALL'
                        ? 'bg-ink text-white border-ink font-semibold'
                        : 'bg-surface text-ink-2 border-line hover:bg-sunken'
                    }`}
                  >
                    Tất cả ({scopedDepartmentStaff.length})
                  </button>
                  {scopedTeams.map(t => {
                    const count = scopedDepartmentStaff.filter(s => (s.department || s.team || '').trim() === t).length;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDeptStaffTeamFilter(t)}
                        className={`px-2.5 py-1 rounded-md text-2xs font-medium border transition ${
                          deptStaffTeamFilter === t
                            ? 'bg-brand text-white border-brand font-semibold'
                            : 'bg-surface text-ink-2 border-line hover:bg-sunken'
                        }`}
                      >
                        {t} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Danh sách nhân viên thuộc khối */}
              <div className="border border-line rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-canvas border-b border-line text-2xs font-medium text-ink-2 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 w-[90px]">Mã NV</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Bộ phận</th>
                      <th className="py-2.5 px-3">Chức danh</th>
                      <th className="py-2.5 px-3">Vai trò hệ thống</th>
                      <th className="py-2.5 px-3 text-center w-[110px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredDepartmentStaff.slice(0, 60).map(emp => (
                      <tr key={emp.id} className="hover:bg-surface-hover transition">
                        <td className="py-2 px-3 font-mono font-medium text-ink-2">
                          <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs">
                            {emp.staffCode || emp.id}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-ink">{emp.name}</div>
                          <div className="text-2xs text-ink-3 font-mono">{emp.email}</div>
                        </td>
                        <td className="py-2 px-3 text-ink-2">
                          {emp.department || emp.team} · {emp.location || 'HN'}
                        </td>
                        <td className="py-2 px-3 text-ink-2">
                          {emp.position || emp.roleTitle}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-2xs font-medium bg-brand-soft text-brand border border-brand-line">
                            {ROLE_DISPLAY_NAME[emp.mappedRole] || emp.mappedRole}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setNewTaskState(prev => ({
                                ...prev,
                                targetStaff: emp.name
                              }));
                              setIsTaskModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-md bg-surface hover:bg-sunken text-ink-2 hover:text-ink border border-line text-2xs font-medium inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Giao việc</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SECTION 4: GIAO VIỆC & ĐỐC THÚC SLA                                    */}
      {/* ========================================================================= */}
      {activeSection === 'TASKS' && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-ink">
                Danh sách công việc đã giao ({tasks.length})
              </h3>
              <p className="text-2xs text-ink-3 mt-0.5">
                Hiển thị đồng bộ trong phân hệ &ldquo;Công việc của tôi&rdquo; của từng chuyên viên
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsTaskModalOpen(true)}
            >
              Giao việc mới
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas text-ink-2 font-medium border-b border-line text-2xs">
                  <th className="py-2.5 px-4 min-w-[240px]">Tiêu đề & chỉ đạo</th>
                  <th className="py-2.5 px-3">Nhãn hàng</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Chuyên viên nhận việc</th>
                  <th className="py-2.5 px-3 text-center">Mức độ</th>
                  <th className="py-2.5 px-3 text-center">Hạn SLA</th>
                  <th className="py-2.5 px-3 text-center w-28">Nhắc việc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-hover transition group">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-ink text-xs">{task.title}</div>
                      <p className="text-2xs text-ink-3 mt-0.5 line-clamp-1">{task.description}</p>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-ink-2">
                      {task.brand}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={task.pic} size={22} />
                        <span className="font-medium text-ink text-xs">{task.pic}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <Status tone={task.urgency === 'critical' ? 'critical' : task.urgency === 'warning' ? 'warning' : 'neutral'}>
                        {task.urgency === 'critical' ? 'Khẩn cấp' : task.urgency === 'warning' ? 'Cảnh báo' : 'Bình thường'}
                      </Status>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-ink-2">
                      {task.deadlineHours}h
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          if (onPingStaff) {
                            onPingStaff(task.pic, `Đốc thúc nhiệm vụ: ${task.title}`);
                          }
                          notify(`Đã gửi nhắc việc cho chuyên viên ${task.pic}!`);
                        }}
                        className="px-2.5 py-1 rounded-md text-2xs font-medium text-ink-2 hover:text-ink bg-surface hover:bg-sunken border border-line flex items-center justify-center gap-1 mx-auto transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Nhắc việc</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GIAO VIỆC TRỰC TIẾP CHO NHÂN SỰ                                   */}
      {/* ========================================================================= */}
      <Presence show={!!isTaskModalOpen}>
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-line bg-surface text-ink flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold">Giao việc trực tiếp cho nhân sự</h3>
                  <p className="text-2xs text-ink-2">Trưởng phòng phân công nhiệm vụ và hạn định SLA</p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  1. Chuyên viên nhận việc
                </label>
                <select
                  value={newTaskState.targetStaff}
                  onChange={(e) => setNewTaskState(prev => ({ ...prev, targetStaff: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Nhân sự nòng cốt B2C">
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.roleTitle} - {s.team})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={`Nhân sự thuộc ${deptStaffScope === 'GROWTH' ? 'Khối Growth' : deptStaffScope === 'MEDIA' ? 'Khối Media' : 'Khối Marketing B2C'}`}>
                    {scopedDepartmentStaff.slice(0, 60).map(s => (
                      <option key={`dept-${s.id}`} value={s.name}>
                        {s.staffCode} - {s.name} ({s.department || s.team})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    2. Nhãn hàng liên quan
                  </label>
                  <select
                    value={newTaskState.brand}
                    onChange={(e) => setNewTaskState(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    3. Mức độ ưu tiên
                  </label>
                  <select
                    value={newTaskState.urgency}
                    onChange={(e) => setNewTaskState(prev => ({ ...prev, urgency: e.target.value as any }))}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="critical">Khẩn cấp (SLA gấp)</option>
                    <option value="warning">Cảnh báo (cần chú ý)</option>
                    <option value="normal">Bình Thường</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  4. Tiêu đề công việc / nhiệm vụ
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Rà soát lại danh sách KOC Micro tuần W42..."
                  value={newTaskState.title}
                  onChange={(e) => setNewTaskState(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  5. Chỉ đạo chi tiết của trưởng phòng
                </label>
                <textarea
                  rows={3}
                  placeholder="Yêu cầu cụ thể: Ưu tiên chọn các KOC đã từng có video viral..."
                  value={newTaskState.description}
                  onChange={(e) => setNewTaskState(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  6. Hạn định SLA xử lý (giờ)
                </label>
                <div className="flex items-center gap-2">
                  {[12, 24, 48, 72].map(hrs => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setNewTaskState(prev => ({ ...prev, deadlineHours: hrs }))}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                        newTaskState.deadlineHours === hrs
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {hrs}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Giao Việc Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM / CHỈNH SỬA PHÂN BỔ NHÃN HÀNG (MASTER DATA INTEGRATED)       */}
      {/* ========================================================================= */}
      <Presence show={!!isBrandModalOpen}>
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line bg-surface text-ink flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    {editingBrand ? `Chỉnh sửa phân bổ nhãn hàng: ${editingBrand.name}` : 'Thêm nhãn hàng vào phân bổ & điều phối PIC'}
                  </h3>
                  <p className="text-2xs text-ink-2">
                    {editingBrand 
                      ? 'Trưởng phòng điều chỉnh Brand PIC Lead, Account PIC và ngân sách trần'
                      : `Lựa chọn từ danh mục doanh nghiệp (${UPBASE_BRANDS_MASTER.length} thương hiệu chuẩn) để phân bổ vận hành`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBrandModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
                {/* If adding new brand: Master Data Selection Mode Switcher */}
                {!editingBrand && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBrandAddMode('FROM_MASTER')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                          brandAddMode === 'FROM_MASTER'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Chọn từ Master Data ({UPBASE_BRANDS_MASTER.length} Brands)</span>
                        <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-700 text-2xs rounded-full">Chuẩn hóa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrandAddMode('CUSTOM')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                          brandAddMode === 'CUSTOM'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tạo mới ngoài danh mục</span>
                      </button>
                    </div>

                    {brandAddMode === 'FROM_MASTER' && (
                      <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        {/* Search & Category Filter toolbar */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-7 relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Tìm theo tên nhãn hàng, mã brand, công ty..."
                              value={masterBrandSearch}
                              onChange={(e) => setMasterBrandSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <select
                              value={masterBrandCategoryFilter}
                              onChange={(e) => setMasterBrandCategoryFilter(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
                            >
                              <option value="ALL">Tất cả ngành hàng ({masterCategories.length})</option>
                              {masterCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-2xs text-slate-500 px-0.5">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hideAllocatedMasterBrands}
                              onChange={(e) => setHideAllocatedMasterBrands(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-0"
                            />
                            <span>Ẩn nhãn hàng đã phân bổ ({brands.length} đã có)</span>
                          </label>
                          <span>Tìm thấy {filteredMasterBrands.length} thương hiệu Master Data</span>
                        </div>

                        {/* Selected Brand Banner or Brand Picker List */}
                        {selectedMasterBrand ? (
                          <div className="p-3 bg-slate-50   border border-blue-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center shrink-0 text-xs shadow-xs">
                                {selectedMasterBrand.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900 text-xs">{selectedMasterBrand.name}</span>
                                  <span className="px-1.5 py-0.2 rounded font-mono text-2xs font-semibold bg-blue-100 text-blue-800">
                                    {selectedMasterBrand.code}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-2xs font-medium bg-slate-200/80 text-slate-700">
                                    {selectedMasterBrand.category}
                                  </span>
                                </div>
                                <p className="text-slate-600 text-2xs mt-0.5">
                                  Pháp nhân: <strong className="text-slate-800">{selectedMasterBrand.companyName}</strong> • {selectedMasterBrand.stores?.length || 0} gian hàng liên kết
                                </p>
                                {selectedMasterBrand.brandGuideline && (
                                  <p className="text-slate-500 text-2xs italic line-clamp-1 mt-0.5">
                                    Guidelines: {selectedMasterBrand.brandGuideline}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMasterBrandId('');
                                setBrandFormState(prev => ({
                                  ...prev,
                                  name: '',
                                  companyName: '',
                                  brandGuideline: ''
                                }));
                              }}
                              className="text-2xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-white border border-blue-200 hover:bg-blue-50 transition shrink-0"
                            >
                              Đổi nhãn hàng khác
                            </button>
                          </div>
                        ) : (
                          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-2xs flex flex-col">
                            {filteredMasterBrands.length === 0 ? (
                              <div className="p-4 text-center text-slate-400 text-2xs">
                                Không tìm thấy nhãn hàng nào phù hợp với bộ lọc trong Master Data
                              </div>
                            ) : (
                              filteredMasterBrands.slice(0, 50).map(master => {
                                const isAllocated = brands.some(ab => 
                                  ab.id === master.id || ab.name.trim().toLowerCase() === master.name.trim().toLowerCase()
                                );

                                return (
                                  <button
                                    key={master.id}
                                    type="button"
                                    onClick={() => handleSelectMasterBrand(master)}
                                    className={`w-full p-2.5 text-left flex items-center justify-between gap-3 hover:bg-blue-50/70 transition group shrink-0 ${
                                      isAllocated ? 'opacity-60 bg-slate-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center justify-center shrink-0 text-2xs group-hover:bg-blue-600 group-hover:text-white transition">
                                        {master.name.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                                            {master.name}
                                          </span>
                                          <span className="text-2xs font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                            {master.code}
                                          </span>
                                        </div>
                                        <div className="text-slate-500 text-2xs truncate">
                                          {master.companyName} • {master.category}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isAllocated ? (
                                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-200 text-slate-600">
                                          Đã phân bổ
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition flex items-center gap-1">
                                          <span>Chọn</span>
                                          <ArrowRight className="w-2.5 h-2.5" />
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {brandAddMode === 'CUSTOM' && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-2xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Chỉ nhập tay khi nhãn hàng đối tác mới ký chưa kịp đồng bộ vào Master Data</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">Tên thương hiệu *</label>
                            <input
                              type="text"
                              required
                              placeholder="VD: Clio Cosmetics..."
                              value={brandFormState.name}
                              onChange={(e) => setBrandFormState(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 block mb-1">Công ty chủ quản</label>
                            <input
                              type="text"
                              placeholder="VD: Công ty TNHH Mỹ phẩm Clio VN..."
                              value={brandFormState.companyName}
                              onChange={(e) => setBrandFormState(prev => ({ ...prev, companyName: e.target.value }))}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Editing Brand Summary */}
                {editingBrand && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{editingBrand.name}</span>
                        <span className="px-1.5 py-0.2 rounded font-mono text-2xs font-semibold bg-blue-100 text-blue-800">
                          {editingBrand.code}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-2xs font-medium bg-slate-200 text-slate-700">
                          {editingBrand.category}
                        </span>
                      </div>
                      <p className="text-slate-500 text-2xs mt-0.5">
                        Pháp nhân: {editingBrand.companyName} • {editingBrand.stores?.length || 0} gian hàng liên kết
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đang vận hành
                    </span>
                  </div>
                )}

                {/* Category selector (if custom or editing) */}
                {(editingBrand || brandAddMode === 'CUSTOM') && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ngành hàng</label>
                    <select
                      value={brandFormState.category}
                      onChange={(e) => setBrandFormState(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                    >
                      {masterCategories.length > 0 ? (
                        masterCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      ) : (
                        <>
                          <option value="Mỹ phẩm & Chăm sóc da">Mỹ phẩm & Chăm sóc da</option>
                          <option value="Dược mỹ phẩm">Dược mỹ phẩm</option>
                          <option value="Mẹ & Bé / Sữa">Mẹ & Bé / Sữa</option>
                          <option value="Gia dụng & Tiêu dùng">Gia dụng & Tiêu dùng</option>
                          <option value="F&B / Đồ uống">F&B / Đồ uống</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* SECTION: PHÂN CÔNG NHÂN SỰ & HẠN MỨC (DELEGATION SETTINGS) */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Phân bổ nhân sự chịu trách nhiệm & chỉ tiêu tài chính</span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Brand PIC Lead (Chịu trách nhiệm chính booking & điều phối kịch bản)
                    </label>
                    <select
                      value={brandFormState.bookingPicLead}
                      onChange={(e) => setBrandFormState(prev => ({ ...prev, bookingPicLead: e.target.value }))}
                      className="w-full text-xs font-semibold px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                    >
                      {staffList.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.roleTitle} - {s.team})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Account PIC (Đầu mối Brand)</label>
                      <select
                        value={brandFormState.accountPic}
                        onChange={(e) => setBrandFormState(prev => ({ ...prev, accountPic: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                      >
                        {staffList.filter(s => s.role === 'ACCOUNT' || s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.roleTitle})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Growth PIC (Tối ưu GMV/Ads)</label>
                      <select
                        value={brandFormState.growthPic}
                        onChange={(e) => setBrandFormState(prev => ({ ...prev, growthPic: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                      >
                        {staffList.filter(s => s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.roleTitle})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Ngân sách tháng (VNĐ)</label>
                        <span className="text-2xs font-semibold text-blue-600 font-mono">
                          {formatVndShort(brandFormState.planBudget || 0)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="5000000"
                        value={brandFormState.planBudget}
                        onChange={(e) => setBrandFormState(prev => ({ ...prev, planBudget: Number(e.target.value) || 0 }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Target GMV (VNĐ)</label>
                        <span className="text-2xs font-semibold text-emerald-600 font-mono">
                          {formatVndShort(brandFormState.targetGmv || 0)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="10000000"
                        value={brandFormState.targetGmv}
                        onChange={(e) => setBrandFormState(prev => ({ ...prev, targetGmv: Number(e.target.value) || 0 }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Hướng dẫn & Guidelines nội dung riêng cho KOC
                    </label>
                    <textarea
                      rows={2}
                      value={brandFormState.brandGuideline}
                      onChange={(e) => setBrandFormState(prev => ({ ...prev, brandGuideline: e.target.value }))}
                      placeholder="Quy định sản phẩm mẫu, điều khoản cấm kỵ, từ khóa bắt buộc khi KOC lên video..."
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons - Fixed Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={!brandFormState.name.trim()}
                  className={`px-5 py-2 rounded-lg text-white font-semibold transition shadow-xs flex items-center gap-1.5 ${
                    brandFormState.name.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingBrand ? 'Lưu cập nhật phân công' : 'Xác nhận phân bổ nhãn hàng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL 3: CHỈNH SỬA PHÂN CÔNG GIAN HÀNG                                   */}
      {/* ========================================================================= */}
      <Presence show={!!editingStore}>
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="px-6 py-4 border-b border-line bg-surface text-ink flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold">Phân công gian hàng</h3>
                  <p className="text-2xs text-ink-2">{editingStore.storeName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn nhân sự B2C Ops phụ trách
                </label>
                <select
                  value={(editingStore.b2cOwners && editingStore.b2cOwners[0]) || editingStore.b2cOwnerName || 'Khánh Vy'}
                  onChange={(e) => {
                    handleSaveStoreAssignment(editingStore.id, [e.target.value], editingStore.assignmentNotes || '');
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 focus:outline-none"
                >
                  {staffList.filter(s => s.role === 'BOOKING' || s.role === 'CONTENT').map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.roleTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 text-xs block">Thuộc diện B2C làm Kế hoạch tháng</span>
                  <p className="text-2xs text-slate-500 mt-0.5">Bật để đưa gian hàng vào danh sách lập kế hoạch và phân bổ ngân sách KOC</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(editingStore.requiresB2cPlan || editingStore.isB2cManaged)}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updated: StorePortfolioItem = {
                      ...editingStore,
                      requiresB2cPlan: isChecked,
                      isB2cManaged: isChecked
                    };
                    onUpdateStore(updated);
                    setEditingStore(updated);
                    notify(isChecked
                      ? `Đã bật: Gian "${editingStore.storeName}" thuộc diện Marketing B2C làm plan!`
                      : `Đã chuyển: Gian "${editingStore.storeName}" sang diện Miễn trừ plan B2C.`
                    );
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chỉ đạo & yêu cầu riêng của trưởng phòng
                </label>
                <textarea
                  rows={3}
                  defaultValue={editingStore.assignmentNotes || ''}
                  id="store-notes-input"
                  placeholder="Yêu cầu tập trung: Tăng cường book KOC KL3-KL5, đẩy mạnh livestream..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const notes = (document.getElementById('store-notes-input') as HTMLTextAreaElement)?.value || '';
                    const owners = editingStore.b2cOwners || [editingStore.b2cOwnerName];
                    handleSaveStoreAssignment(editingStore.id, owners, notes);
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
