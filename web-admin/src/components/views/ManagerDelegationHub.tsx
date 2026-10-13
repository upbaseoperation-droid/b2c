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
  GitFork,
  Database
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
import { MasterDataMindmapView } from './MasterDataMindmapView';
import { Avatar, Button, Presence, Segmented, Status , ChannelTag } from '../ui';
import { formatVndShort } from '../../lib/format';

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
  onNotify
}) => {
  const isGrowthManager = currentUser.role === 'GROWTH_MANAGER';
  const isMediaManager = currentUser.role === 'MEDIA_MANAGER';

  // Active Section Tab
  const [activeSection, setActiveSection] = useState<'BRANDS' | 'STORES' | 'LEADER_TEAMS' | 'STAFF' | 'TASKS' | 'MINDMAP'>(
    isGrowthManager || isMediaManager ? 'STAFF' : 'BRANDS'
  );
  const [selectedLeaderTeam, setSelectedLeaderTeam] = useState<'ALL' | 'TEAM_1' | 'TEAM_2' | 'TEAM_MULTI'>('ALL');
  const [leaderConsoleViewMode, setLeaderConsoleViewMode] = useState<'STORES_ASSIGN' | 'WORKLOAD_BALANCE'>('STORES_ASSIGN');

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
    } else if (currentUser.role === 'MEDIA_MANAGER') {
      setDeptStaffScope('MEDIA');
      setActiveSection('STAFF');
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

  // Bộ lọc danh sách gian hàng (mặc định chỉ lọc gian B2C làm plan)
  const [storeFilterMode, setStoreFilterMode] = useState<'B2C_ONLY' | 'ALL'>('B2C_ONLY');
  const [storePlatformFilter, setStorePlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall' | 'Lazada'>('ALL');
  const [storeSearchTerm, setStoreSearchTerm] = useState('');

  // Danh sách gian hàng B2C làm kế hoạch tháng (16 gian hàng)
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
  }, [storePortfolios, storeFilterMode, selectedStaffFilter, storePlatformFilter, storeSearchTerm]);

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

  // Save Store Assignment
  const handleSaveStoreAssignment = (storeId: string, b2cOwners: string[], notes: string) => {
    const targetStore = storePortfolios.find(s => s.id === storeId);
    if (!targetStore) return;

    const updated: StorePortfolioItem = {
      ...targetStore,
      b2cOwners: b2cOwners,
      b2cOwnerName: b2cOwners.join(', '),
      assignmentNotes: notes
    };

    onUpdateStore(updated);
    notify(`Đã phân công gian hàng "${updated.storeName}" cho: ${b2cOwners.join(' & ')}!`);
    setEditingStore(null);
  };

  return (
    <div className="space-y-5">
      {/* Thanh phân khu: chọn mục, thao tác chính bên phải */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={activeSection}
          onChange={setActiveSection}
          items={[
            { key: 'BRANDS', label: `Nhãn hàng · ${brands.length}` },
            { 
              key: 'STORES', 
              label: storeFilterMode === 'B2C_ONLY' 
                ? `Gian B2C làm plan · ${b2cPlanStores.length}` 
                : `Tất cả gian hàng · ${storePortfolios.length}` 
            },
            { key: 'LEADER_TEAMS', label: 'Đội ngũ Leader & Member' },
            { key: 'STAFF', label: `Tải nhân sự · ${staffList.length}` },
            { key: 'TASKS', label: `Giao việc · ${tasks.length}` },
            { key: 'MINDMAP', label: 'Sơ đồ dữ liệu' },
          ]}
        />
        <div className="flex items-center gap-2">
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
      {/* 3. SECTION 1: PHÂN CHIA NHÃN HÀNG (BRAND PIC LEAD ALLOCATION)              */}
      {/* ========================================================================= */}
      {activeSection === 'BRANDS' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                Danh sách nhãn hàng & trưởng nhóm phụ trách
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Trưởng phòng chỉ định Brand PIC chịu trách nhiệm lập kế hoạch, phân rã KOC và phối hợp cùng Brand Client
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                Tổng ngân sách giao: <strong className="text-slate-900 font-semibold">{formatVndShort(brands.reduce((s, b) => s + (b.planBudget || 0), 0))}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-3 px-4 min-w-[200px]">Nhãn hàng</th>
                  <th className="py-3 px-4 min-w-[210px]">Brand PIC</th>
                  <th className="py-3 px-3 min-w-[170px]">Account PIC</th>
                  <th className="py-3 px-3 min-w-[170px]">Growth PIC</th>
                  <th className="py-3 px-3 text-right">Ngân sách</th>
                  <th className="py-3 px-3 text-right">GMV mục tiêu</th>
                  <th className="py-3 px-3 text-center">Gian hàng</th>
                  <th className="py-3 px-3 text-center w-24"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map((brand) => {
                  const brandStoresCount = storePortfolios.filter(s => 
                    s.brandName.toLowerCase().includes(brand.name.toLowerCase()) && 
                    (storeFilterMode === 'ALL' ? true : Boolean(s.requiresB2cPlan || s.isB2cManaged))
                  ).length;

                  return (
                    <tr key={brand.id} className="hover:bg-slate-50 transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-sunken text-ink-2 font-semibold text-2xs flex items-center justify-center shrink-0">
                            {brand.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 text-xs block">{brand.name}</span>
                            <span className="text-2xs text-slate-400 block truncate max-w-[180px]">
                              {brand.companyName || brand.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Brand PIC Dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2"><Avatar name={brand.bookingPicLead || 'Đặng Thị Yến Nhi' || '?'} size={22} /><select
                          value={brand.bookingPicLead || 'Đặng Thị Yến Nhi'}
                          onChange={(e) => {
                            const updated = { ...brand, bookingPicLead: e.target.value };
                            onUpdateBrand(updated);
                            notify(`Đã gán Brand PIC của ${brand.name} cho: ${e.target.value}`);
                          }}
                          className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                        >
                          {staffList.map(s => (
                            <option key={s.id} value={s.name}>
                              {s.name} ({s.roleTitle})
                            </option>
                          ))}
                        </select></div>
                      </td>

                      {/* Account PIC Dropdown */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2"><Avatar name={brand.accountPic || 'Phạm Thị Nhài' || '?'} size={22} /><select
                          value={brand.accountPic || 'Phạm Thị Nhài'}
                          onChange={(e) => {
                            const updated = { ...brand, accountPic: e.target.value };
                            onUpdateBrand(updated);
                            notify(`Đã gán Account PIC của ${brand.name} cho: ${e.target.value}`);
                          }}
                          className="w-full text-xs px-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-2xs"
                        >
                          {staffList.filter(s => s.role === 'ACCOUNT' || s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select></div>
                      </td>

                      {/* Growth PIC Dropdown */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2"><Avatar name={brand.growthPic || 'Hoàng Long' || '?'} size={22} /><select
                          value={brand.growthPic || 'Hoàng Long'}
                          onChange={(e) => {
                            const updated = { ...brand, growthPic: e.target.value };
                            onUpdateBrand(updated);
                            notify(`Đã gán Growth PIC của ${brand.name} cho: ${e.target.value}`);
                          }}
                          className="w-full text-xs px-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-2xs"
                        >
                          {staffList.filter(s => s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select></div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatVndShort(brand.planBudget || 0)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-700">
                        {formatVndShort(brand.targetGmv || 0)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {brandStoresCount > 0 ? (<span className="tabular-nums text-slate-700">{brandStoresCount}</span>) : (<Status tone="warning">Chưa gán</Status>)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenEditBrand(brand)}
                          className="px-2.5 py-1 rounded text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 transition"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SECTION 2: PHÂN CHIA GIAN HÀNG (STORE PORTFOLIO ASSIGNMENT)             */}
      {/* ========================================================================= */}
      {activeSection === 'STORES' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" />
                Danh sách gian hàng & chuyên viên tác nghiệp
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                {storeFilterMode === 'B2C_ONLY'
                  ? `Đang lọc: ${displayedStores.length}/${b2cPlanStores.length} gian hàng B2C phụ trách lập kế hoạch tháng`
                  : `Đang hiển thị: ${displayedStores.length}/${storePortfolios.length} gian hàng phòng B2C`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Segmented Switcher: B2C Plan Only (Default) vs All */}
              <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStoreFilterMode('B2C_ONLY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    storeFilterMode === 'B2C_ONLY'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chỉ gian B2C làm plan ({b2cPlanStores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    storeFilterMode === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả gian ({storePortfolios.length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên gian hàng, PIC..."
                  value={storeSearchTerm}
                  onChange={(e) => setStoreSearchTerm(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Platform Filter */}
              <select
                value={storePlatformFilter}
                onChange={(e) => setStorePlatformFilter(e.target.value as any)}
                className="text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
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
                className="text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả nhân sự phụ trách</option>
                {staffList.filter(s => s.role === 'BOOKING').map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-3 px-4 min-w-[200px]">Gian hàng & sàn</th>
                  <th className="py-3 px-3">Nhãn hàng</th>
                  <th className="py-3 px-3 text-center">Diện quản lý</th>
                  <th className="py-3 px-4 min-w-[220px]">Nhân sự B2C Ops phụ trách</th>
                  <th className="py-3 px-3">Account Owner</th>
                  <th className="py-3 px-3 text-right">Target GMV</th>
                  <th className="py-3 px-4 min-w-[200px]">Chỉ đạo riêng của trưởng phòng</th>
                  <th className="py-3 px-3 text-center w-24">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedStores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                      Không có gian hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedStores.map((store) => {
                    const isB2c = Boolean(store.requiresB2cPlan || store.isB2cManaged);
                    const owners = store.b2cOwners || (store.b2cOwnerName ? store.b2cOwnerName.split(',').map(s => s.trim()) : ['Khánh Vy']);

                    return (
                      <tr key={store.id} className="hover:bg-slate-50 transition group">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs">{store.storeName}</div>
                          <ChannelTag channel={store.platform} />
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {store.brandName}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isB2c ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Làm plan B2C
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Miễn trừ plan
                            </span>
                          )}
                        </td>

                        {/* Assignee Selector */}
                        <td className="py-3 px-4">
                          <select
                            value={owners[0] || 'Khánh Vy'}
                            onChange={(e) => {
                              const newOwners = [e.target.value];
                              handleSaveStoreAssignment(store.id, newOwners, store.assignmentNotes || '');
                            }}
                            className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                          >
                            {staffList.filter(s => s.role === 'BOOKING' || s.role === 'CONTENT').map(s => (
                              <option key={s.id} value={s.name}>
                                {s.name} ({s.roleTitle})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {store.accountOwnerName || 'Phạm Thị Nhài'}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                          {formatVndShort((store.monthlyTargetGmv || 0))}
                        </td>

                        {/* Assignment Notes */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Ghi chú: Tập trung live, book KOC micro..."
                            defaultValue={store.assignmentNotes || ''}
                            onBlur={(e) => {
                              if (e.target.value !== store.assignmentNotes) {
                                handleSaveStoreAssignment(store.id, owners, e.target.value);
                              }
                            }}
                            className="w-full text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleOpenEditStore(store)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            Chi tiết
                          </button>
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
      {/* SECTION: ĐỘI NGŨ LEADER & TEAM MEMBER (CƠ CHẾ PHÂN CÔNG 2 TẦNG)           */}
      {/* ========================================================================= */}
      {activeSection === 'LEADER_TEAMS' && (
        <div className="space-y-5">
          {/* Header Card & Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Bàn Điều Phối Của Trưởng Nhóm & Chuyên Viên (Leader & Team Member Console)</span>
                  </h3>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Mô hình 2 Tầng
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                  Trưởng phòng phân bổ nhóm gian hàng cho các Trưởng nhóm (Leader) • Trưởng nhóm chủ động phân công Chuyên viên chính (Primary PIC), giao hạn ngạch (quota) và kiểm soát cân bằng tải công việc trong nhóm.
                </p>
              </div>

              {/* View Mode Toggle: Phân Công Gian Hàng vs Cân Bằng Tải */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setLeaderConsoleViewMode('STORES_ASSIGN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    leaderConsoleViewMode === 'STORES_ASSIGN'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Phân công gian hàng</span>
                </button>
                <button
                  onClick={() => setLeaderConsoleViewMode('WORKLOAD_BALANCE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    leaderConsoleViewMode === 'WORKLOAD_BALANCE'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Cân bằng tải ({staffList.length} nhân sự)</span>
                </button>
              </div>
            </div>

            {/* Filter by Team */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">Lọc theo nhóm:</span>
              <button
                onClick={() => setSelectedLeaderTeam('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedLeaderTeam === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất cả gian hàng ({storePortfolios.length} gian)
              </button>
              {BOOKING_TEAMS_STRUCTURE.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedLeaderTeam(t.teamCode as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    selectedLeaderTeam === t.teamCode
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{t.name.split('(')[0].trim()}</span>
                  <span className="text-2xs opacity-80">({t.leaderName.split(' ').slice(-2).join(' ')})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3 Team Cards Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BOOKING_TEAMS_STRUCTURE.map(team => {
              const isSelected = selectedLeaderTeam === 'ALL' || selectedLeaderTeam === team.teamCode;
              return (
                <div
                  key={team.id}
                  className={`bg-white rounded-2xl border p-4 transition ${
                    isSelected ? 'border-blue-300 ring-2 ring-blue-500/10 shadow-xs' : 'border-slate-200 opacity-60'
                  }`}
                >
                  {/* Leader Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center text-sm shadow-xs">
                        {team.leaderAvatar}
                      </div>
                      <div>
                        <span className="text-2xs font-semibold px-2 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {team.teamCode}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900 mt-0.5">{team.leaderName}</h4>
                        <span className="text-2xs text-slate-500 block">{team.leaderTitle}</span>
                      </div>
                    </div>
                    <span className="text-2xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      Tải an toàn
                    </span>
                  </div>

                  {/* Team Scope */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-2xs text-slate-400 block">Gian hàng</span>
                      <strong className="text-xs font-mono font-semibold text-slate-900">{team.managedStoresCount}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-2xs text-slate-400 block">Ngân sách</span>
                      <strong className="text-xs font-mono font-semibold text-blue-700">{formatVndShort(team.totalMonthlyTargetBudget)}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-2xs text-slate-400 block">Chỉ tiêu clip</span>
                      <strong className="text-xs font-mono font-semibold text-slate-900">{team.totalMonthlyTargetClips}</strong>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="mt-3">
                    <span className="text-2xs text-slate-400 font-semibold   block mb-1.5">
                      Thành viên trong nhóm ({team.members.length} chuyên viên)
                    </span>
                    <div className="space-y-1.5">
                      {team.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 text-2xs hover:bg-blue-50/50 transition">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center font-semibold text-2xs text-slate-700">
                              {m.avatar}
                            </span>
                            <div>
                              <strong className="text-slate-900 block leading-tight">{m.name}</strong>
                              <span className="text-2xs text-slate-400">{m.expertise.split('&')[0]}</span>
                            </div>
                          </div>
                          <span className="font-mono text-2xs text-blue-700 font-semibold">
                            {m.assignedClips || 0}/{m.maxCapacityClips} clip
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VIEW MODE 1: BẢNG PHÂN CÔNG GIAN HÀNG 2 TẦNG (LEADER & PRIMARY PIC) */}
          {leaderConsoleViewMode === 'STORES_ASSIGN' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-blue-600" />
                    <span>Bảng Phân Công Gian Hàng Cho Chuyên Viên Dưới Sự Giám Sát Của Leader</span>
                  </h4>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Trưởng nhóm trực tiếp chỉ định Chuyên viên chính (Primary PIC) và ghi chú chỉ đạo chuyên môn cho từng gian hàng
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Hiển thị: <strong className="text-slate-900 font-semibold">{b2cPlanStores.length}</strong> gian B2C làm plan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-2xs">
                      <th className="py-3 px-3 w-56">Gian hàng / Thương hiệu</th>
                      <th className="py-3 px-3 w-48">Trưởng nhóm phụ trách (Leader)</th>
                      <th className="py-3 px-3 w-48">Chuyên viên chính (Primary PIC)</th>
                      <th className="py-3 px-3 w-44">Thành viên cùng chạy</th>
                      <th className="py-3 px-3 text-right w-28">Ngân sách</th>
                      <th className="py-3 px-3 min-w-[200px]">Ghi chú chỉ đạo của Leader</th>
                      <th className="py-3 px-3 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {b2cPlanStores.map(store => {
                      const isAssignedLeader = Boolean(store.hasBookingLeader && store.bookingLeader);
                      const currentLeader = isAssignedLeader ? (store.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : 'NONE';
                      const matchingTeam = isAssignedLeader
                        ? (BOOKING_TEAMS_STRUCTURE.find(t => t.id === 'team-tam') || BOOKING_TEAMS_STRUCTURE[0])
                        : (BOOKING_TEAMS_STRUCTURE.find(t => t.id === 'team-direct') || BOOKING_TEAMS_STRUCTURE[0]);

                      return (
                        <tr key={store.id} className="hover:bg-slate-50 transition">
                          {/* Gian hàng */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-900 block truncate max-w-[200px]">{store.storeName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <ChannelTag channel={store.platform} />
                              <span className="text-2xs text-slate-400">{store.category}</span>
                            </div>
                          </td>

                          {/* Leader Dropdown */}
                          <td className="py-3 px-3">
                            <select
                              value={currentLeader}
                              onChange={(e) => {
                                const val = e.target.value;
                                const isNone = val === 'NONE';
                                const newLeader = isNone ? undefined : 'Nguyễn Thị Ngọc Tâm';
                                const newTeam = isNone
                                  ? (BOOKING_TEAMS_STRUCTURE.find(t => t.id === 'team-direct') || BOOKING_TEAMS_STRUCTURE[0])
                                  : (BOOKING_TEAMS_STRUCTURE.find(t => t.id === 'team-tam') || BOOKING_TEAMS_STRUCTURE[0]);
                                const defaultPic = store.primaryPic || newTeam.members[0]?.name || 'Lê Phương Thảo';
                                const updated: StorePortfolioItem = {
                                  ...store,
                                  bookingLeader: newLeader,
                                  hasBookingLeader: !isNone,
                                  primaryPic: defaultPic,
                                  assignedStaff: defaultPic,
                                  b2cOwnerName: defaultPic
                                };
                                onUpdateStore(updated);
                                notify(isNone
                                  ? `Gian "${store.storeName}" chuyển sang: Không có leader (Duyệt thẳng Trưởng phòng)!`
                                  : `Đã chuyển gian "${store.storeName}" cho Trưởng nhóm: Nguyễn Thị Ngọc Tâm!`);
                              }}
                              className="w-full text-xs font-semibold px-2 py-1.5 bg-blue-50/50 border border-blue-200 rounded-lg text-blue-950 focus:outline-none focus:border-blue-500"
                            >
                              <option value="NONE">Không có leader (Duyệt thẳng Trưởng phòng)</option>
                              <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Trưởng nhóm Booking)</option>
                            </select>
                          </td>

                          {/* Primary PIC Dropdown */}
                          <td className="py-3 px-3">
                            <select
                              value={store.primaryPic || store.b2cOwnerName || matchingTeam.members[0]?.name}
                              onChange={(e) => {
                                const newPic = e.target.value;
                                const updated: StorePortfolioItem = {
                                  ...store,
                                  primaryPic: newPic,
                                  assignedStaff: newPic,
                                  b2cOwnerName: newPic
                                };
                                onUpdateStore(updated);
                                notify(`Leader đã gán chuyên viên "${newPic}" chủ trì gian "${store.storeName}"!`);
                              }}
                              className="w-full text-xs font-medium px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                            >
                              {matchingTeam.members.map(m => (
                                <option key={m.id} value={m.name}>
                                  {m.name} ({m.roleTitle})
                                </option>
                              ))}
                              {/* Option cho phép chọn thành viên khác nếu cần mượn quân */}
                              <option disabled>──────────</option>
                              {staffList.filter(s => !matchingTeam.members.some(m => m.name === s.name)).map(s => (
                                <option key={s.id} value={s.name}>
                                  {s.name} ({s.team})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Thành viên cùng chạy */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {(store.assignedMembers || [store.primaryPic || store.b2cOwnerName || 'Khánh Vy']).map(mem => (
                                <span key={mem} className="text-2xs bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                                  {mem.split(' ').slice(-1)[0]}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Ngân sách */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-blue-700">
                            {formatVndShort(store.monthlyBudget || 150000000)}
                          </td>

                          {/* Ghi chú chỉ đạo của Leader */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              defaultValue={store.assignmentNotes || 'Ưu tiên KOC đúng tệp, tỷ lệ hoàn < 8%'}
                              onBlur={(e) => {
                                const notes = e.target.value;
                                if (notes !== store.assignmentNotes) {
                                  onUpdateStore({ ...store, assignmentNotes: notes });
                                  notify(`Đã lưu chỉ đạo của Leader cho gian "${store.storeName}"!`);
                                }
                              }}
                              className="w-full text-2xs px-2 py-1 bg-slate-50 hover:bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
                              placeholder="Chỉ đạo của Leader..."
                            />
                          </td>

                          {/* Thao tác */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleOpenEditStore(store)}
                              className="text-2xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: BẢNG CÂN BẰNG TẢI KHỐI LƯỢNG CÔNG VIỆC CỦA CHUYÊN VIÊN */}
          {leaderConsoleViewMode === 'WORKLOAD_BALANCE' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Cân Bằng Tải & Sức Chứa Của Từng Chuyên Viên (Capacity & Workload)</span>
                  </h4>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Leader theo dõi định mức số video và số gian hàng để không chuyên viên nào bị quá tải (&gt;50 video/tháng)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-2xs">
                      <th className="py-3 px-4 w-48">Chuyên viên</th>
                      <th className="py-3 px-3 w-40">Tổ đội / Leader</th>
                      <th className="py-3 px-3 min-w-[180px]">Thế mạnh chuyên môn</th>
                      <th className="py-3 px-3 text-center w-28">Số gian phụ trách</th>
                      <th className="py-3 px-4 text-center w-36">Định mức clip tháng</th>
                      <th className="py-3 px-4 w-44">Tỷ lệ tải công việc</th>
                      <th className="py-3 px-3 text-center w-28">Trạng thái</th>
                      <th className="py-3 px-3 text-center w-28">Điều phối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {BOOKING_TEAMS_STRUCTURE.flatMap(team => team.members.map(member => {
                      const assignedStores = storePortfolios.filter(s => 
                        (s.primaryPic === member.name) || 
                        (s.b2cOwnerName && s.b2cOwnerName.includes(member.name)) ||
                        (s.assignedStaff === member.name)
                      );
                      const currentClips = member.assignedClips || assignedStores.length * 15 || 25;
                      const capacity = member.maxCapacityClips || 50;
                      const workloadPct = Math.round((currentClips / capacity) * 100);
                      const isOverloaded = workloadPct > 95;
                      const isNearFull = workloadPct >= 80 && workloadPct <= 95;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50 transition">
                          {/* Chuyên viên */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-semibold flex items-center justify-center text-xs">
                                {member.avatar}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-900 block">{member.name}</span>
                                <span className="text-2xs text-slate-400 block">{member.roleTitle}</span>
                              </div>
                            </div>
                          </td>

                          {/* Tổ đội */}
                          <td className="py-3 px-3">
                            <span className="text-2xs font-semibold text-slate-700 block">{member.team}</span>
                            <span className="text-2xs text-blue-600 block">Leader: {team.leaderName.split(' ').slice(-2).join(' ')}</span>
                          </td>

                          {/* Thế mạnh chuyên môn */}
                          <td className="py-3 px-3 text-slate-600 text-2xs">
                            {member.expertise}
                          </td>

                          {/* Số gian phụ trách */}
                          <td className="py-3 px-3 text-center font-mono font-semibold text-slate-900">
                            {assignedStores.length} gian
                          </td>

                          {/* Định mức clip tháng */}
                          <td className="py-3 px-4 text-center font-mono">
                            <strong className="text-blue-900">{currentClips}</strong> / {capacity} clip
                          </td>

                          {/* Tỷ lệ tải */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between text-2xs font-mono mb-1">
                              <span className="text-slate-500">Tải:</span>
                              <strong className={isOverloaded ? 'text-rose-600' : isNearFull ? 'text-amber-600' : 'text-emerald-600'}>
                                {workloadPct}%
                              </strong>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`data-bar h-full rounded-full ${
                                  isOverloaded ? 'bg-rose-500' : isNearFull ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, workloadPct)}%` }}
                              />
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3 px-3 text-center">
                            <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                              isOverloaded
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isNearFull
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {isOverloaded ? ' Quá tải' : isNearFull ? 'Đầy tải' : '✓ An toàn'}
                            </span>
                          </td>

                          {/* Nút điều phối */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                notify(`Leader đã chọn điều phối công việc cho ${member.name}!`);
                              }}
                              className="text-2xs font-semibold text-slate-700 hover:text-blue-600 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition"
                            >
                              Điều chuyển
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* 5. SECTION 3: QUẢN LÝ NHÂN SỰ THEO TRƯỞNG PHÒNG 3 KHỐI & TẢI GIAN HÀNG B2C */}
      {/* ========================================================================= */}
      {activeSection === 'STAFF' && (
        <div className="space-y-4">
          {/* Bảng Quản Lý Nhân Sự Theo Phòng Ban Của Trưởng Phòng (Marketing B2C / Growth / Media) */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>
                    {deptStaffScope === 'GROWTH'
                      ? `Danh sách nhân sự khối Growth (${filteredDepartmentStaff.length} / ${scopedDepartmentStaff.length} nhân viên) — Trưởng phòng: Trần Thị Đỗ Quyên`
                      : deptStaffScope === 'MEDIA'
                      ? `Danh sách nhân sự khối Media (${filteredDepartmentStaff.length} / ${scopedDepartmentStaff.length} nhân viên) — Trưởng phòng: Nguyễn Đức Quảng`
                      : `Danh sách nhân sự khối Marketing B2C (${filteredDepartmentStaff.length} / ${scopedDepartmentStaff.length} nhân viên) — Trưởng phòng: Đặng Thị Yến Nhi`}
                  </span>
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Đồng bộ từ danh bạ 1.011 nhân sự UpBase. Chỉ hiển thị các nhân viên thuộc khối đã được cấp quyền đăng nhập hệ thống.
                </p>
              </div>

              {/* Nếu là Admin thì cho phép chuyển xem cả 3 khối */}
              {currentUser.role === 'ADMIN' && (
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => { setDeptStaffScope('MARKETING_B2C'); setDeptStaffTeamFilter('ALL'); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      deptStaffScope === 'MARKETING_B2C' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Khối MKT B2C
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeptStaffScope('GROWTH'); setDeptStaffTeamFilter('ALL'); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      deptStaffScope === 'GROWTH' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Khối Growth
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeptStaffScope('MEDIA'); setDeptStaffTeamFilter('ALL'); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      deptStaffScope === 'MEDIA' ? 'bg-white text-accent shadow-2xs' : 'text-slate-600'
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
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên theo tên, mã NV, email, vị trí..."
                  value={deptStaffSearch}
                  onChange={(e) => setDeptStaffSearch(e.target.value)}
                  className="w-full pl-8.5 pr-3 h-8.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/60"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeptStaffTeamFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border transition ${
                    deptStaffTeamFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tất cả Team ({scopedDepartmentStaff.length})
                </button>
                {scopedTeams.map(t => {
                  const count = scopedDepartmentStaff.filter(s => (s.department || s.team || '').trim() === t).length;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDeptStaffTeamFilter(t)}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border transition ${
                        deptStaffTeamFilter === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Danh sách nhân viên thuộc khối của Trưởng phòng */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-2xs font-semibold text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-[90px]">Mã NV</th>
                    <th className="py-2.5 px-3">Họ và tên nhân viên</th>
                    <th className="py-2.5 px-3">Team / Bộ phận</th>
                    <th className="py-2.5 px-3">Chức danh</th>
                    <th className="py-2.5 px-3">Vai trò hệ thống</th>
                    <th className="py-2.5 px-3 text-center w-[130px]">Giao việc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartmentStaff.slice(0, 60).map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-2xs">
                          {emp.staffCode || emp.id}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{emp.name}</div>
                        <div className="text-2xs text-slate-400 font-mono">{emp.email}</div>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-700">
                        {emp.department || emp.team} · {emp.location || 'HN'}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {emp.position || emp.roleTitle}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
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
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold inline-flex items-center gap-1"
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

          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Theo dõi tải gian hàng nhân sự nòng cốt B2C
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                {storeFilterMode === 'B2C_ONLY'
                  ? `Nhân sự chủ động tự phân công và nhận gian hàng (tối đa định mức 3 shop/chuyên viên trên ${b2cPlanStores.length} gian B2C làm plan)`
                  : `Đang tính tải theo toàn bộ ${storePortfolios.length} gian hàng hệ thống`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Phạm vi tính tải:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStoreFilterMode('B2C_ONLY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    storeFilterMode === 'B2C_ONLY'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gian B2C làm plan ({b2cPlanStores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    storeFilterMode === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả gian ({storePortfolios.length})
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  className={`bg-white rounded-2xl border p-4 shadow-2xs flex flex-col justify-between transition hover:shadow-md ${
                    isOverloaded ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                          {staff.avatar}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 text-xs block">{staff.name}</span>
                          <span className="text-2xs text-slate-500 block leading-tight">{staff.roleTitle}</span>
                        </div>
                      </div>
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                        staff.role === 'BOOKING' ? 'bg-slate-50 text-slate-700 border border-slate-200' :
                        staff.role === 'CONTENT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {staff.role}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Gian hàng phụ trách:</span>
                      <span className={`font-mono font-semibold ${isOverloaded ? 'text-rose-600' : 'text-slate-900'}`}>
                        {assignedStores.length} / {maxCap} shops ({loadPct}%)
                      </span>
                    </div>

                    {/* Progress Bar of Capacity */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`data-bar h-full rounded-full ${
                          isOverloaded ? 'bg-rose-500' : isOptimal ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, loadPct)}%` }}
                      />
                    </div>

                    {/* Assigned Stores List tags */}
                    <div className="mt-3">
                      <span className="text-2xs font-semibold text-slate-400 block mb-1">
                        Danh sách Shops:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {assignedStores.length > 0 ? (
                          assignedStores.map(st => (
                            <span key={st.id} className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[130px]" title={st.storeName}>
                              {st.storeName.split('_')[0]}
                            </span>
                          ))
                        ) : (
                          <span className="text-2xs text-slate-400 italic">Chưa được gán shop nào</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setNewTaskState(prev => ({
                          ...prev,
                          targetStaff: staff.name
                        }));
                        setIsTaskModalOpen(true);
                      }}
                      className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Send className="w-3 h-3 text-blue-600" />
                      <span>Giao việc cho bạn này</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SECTION 4: GIAO VIỆC & ĐỐC THÚC SLA (DIRECT TASK DISPATCH)              */}
      {/* ========================================================================= */}
      {activeSection === 'TASKS' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-600" />
                Hàng Chờ Nhiệm Vụ Trưởng Phòng Đã Giao ({tasks.length} Tasks)
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Các nhiệm vụ này tự động hiển thị trong phân hệ "Công việc của tôi" của từng chuyên viên
              </p>
            </div>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Giao thêm việc mới</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 text-2xs">
                  <th className="py-3 px-4 min-w-[240px]">Tiêu đề & chỉ đạo</th>
                  <th className="py-3 px-3">Nhãn hàng</th>
                  <th className="py-3 px-3 min-w-[150px]">Chuyên viên nhận việc</th>
                  <th className="py-3 px-3 text-center">Độ khẩn cấp</th>
                  <th className="py-3 px-3 text-center">Hạn SLA</th>
                  <th className="py-3 px-3 text-center w-28">Đốc Thúc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs">{task.title}</div>
                      <p className="text-2xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {task.brand}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-semibold text-2xs flex items-center justify-center shrink-0">
                          {task.pic.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{task.pic}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                        task.urgency === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        task.urgency === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {task.urgency === 'critical' ? 'Khẩn Cấp' : task.urgency === 'warning' ? 'Cảnh Báo' : 'Bình Thường'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {task.deadlineHours}h
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (onPingStaff) {
                            onPingStaff(task.pic, `Đốc thúc nhiệm vụ: ${task.title}`);
                          }
                          notify(`Đã gửi ping nhắc nhở chuyên viên ${task.pic} qua Lark Bot thành công!`);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 flex items-center justify-center gap-1 mx-auto transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Ping</span>
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
      {/* 7. SECTION 5: SƠ ĐỒ CÂY MINDMAP MASTER DATA (BRAND → GIAN → PIC → SKU)    */}
      {/* ========================================================================= */}
      {activeSection === 'MINDMAP' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 bg-blue-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-semibold shrink-0">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <span>Toàn cảnh phân bổ Mindmap</span>
                  <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Trực quan hóa 4 tầng phân cấp
                  </span>
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Sơ đồ cây phân nhánh trực quan: Nhãn hàng → Gian hàng sàn → Nhân sự PIC phụ trách (1 PIC chính + các PIC hỗ trợ) → Danh mục sản phẩm Hero SKU & doanh số.
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
              Nhấn vào từng node để mở rộng/thu gọn nhánh
            </div>
          </div>

          <MasterDataMindmapView
            currentUser={currentUser}
            onNotify={notify}
          />
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
