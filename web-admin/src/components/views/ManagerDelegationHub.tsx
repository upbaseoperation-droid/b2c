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
  GitFork,
  History
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
  SystemDepartmentScope,
  normalizeStoreCoefficient
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
import { ActionMenu, Avatar, Button, Modal, PageActions, Presence, Segmented, Status, ChannelTag } from '../ui';
import { formatVndShort } from '../../lib/format';
import { StoreCoefficientHubSection } from '../stores/StoreCoefficientHubSection';
import { B2C_28_STAFF_WORKLOAD_ROSTER } from './TaskDelegationView';
import {
  computeUnifiedB2cStaffWorkloads,
  loadSavedManagerExceptions,
  persistManagerExceptions,
  loadSavedSowPolicies,
  DIFFICULTY_TIER_BADGE,
  UnifiedStaffWorkloadRow,
} from '../../lib/taskDelegationData';
import {
  INITIAL_STORE_ASSIGNMENT_HISTORY,
  INITIAL_BACKUP_ASSIGNMENTS
} from '../../lib/enterpriseMasterConfig';

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
  const [activeSection, setActiveSection] = useState<'STORES' | 'BRANDS' | 'COEFFICIENTS' | 'STAFF' | 'TASKS' | 'LEADER_TEAMS' | 'ASSIGNMENT_HISTORY'>(
    isGrowthManager || isMediaManager ? 'STAFF' : 'STORES'
  );
  const [leaderConsoleViewMode, setLeaderConsoleViewMode] = useState<'STORES_ASSIGN' | 'WORKLOAD_BALANCE'>('STORES_ASSIGN');
  const [selectedLeaderTeam, setSelectedLeaderTeam] = useState<'ALL' | 'TEAM_1' | 'TEAM_2'>('ALL');
  const [staffSubView, setStaffSubView] = useState<'WORKLOAD' | 'DIRECTORY'>(
    isGrowthManager || isMediaManager ? 'DIRECTORY' : 'WORKLOAD'
  );

  // Bộ lọc Lịch sử PIC & Bàn giao (stateful để ghi nhận trực tiếp mọi thao tác đổi PIC)
  const [assignmentHistory, setAssignmentHistory] = useState(() => INITIAL_STORE_ASSIGNMENT_HISTORY);
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState<'ALL' | 'ASSIGNED' | 'REASSIGNED' | 'BACKUP_ACTIVATED'>('ALL');

  // Bộ lọc nhân sự theo Khối của Trưởng phòng (Marketing B2C / Growth / Media)
  const [deptStaffScope, setDeptStaffScope] = useState<SystemDepartmentScope>(
    isGrowthManager ? 'GROWTH' : isMediaManager ? 'MEDIA' : 'MARKETING_B2C'
  );
  const [deptStaffTeamFilter, setDeptStaffTeamFilter] = useState<string>('ALL');
  const [deptStaffSearch, setDeptStaffSearch] = useState<string>('');

  React.useEffect(() => {
    if (currentUser.role === 'GROWTH_MANAGER') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const [selectedBrandPosRole, setSelectedBrandPosRole] = useState<'ALL' | 'CONTENT_BRAND_MAIN' | 'PLAN_STRATEGY' | 'KEY_VISUAL_SIS'>('ALL');
  const [workloadFilterStatus, setWorkloadFilterStatus] = useState<'ALL' | 'OVERLOAD' | 'OPTIMAL' | 'UNDERLOAD' | 'FAIL_07'>('ALL');
  const [workloadSearch, setWorkloadSearch] = useState('');

  // Đồng bộ ngoại lệ Bảng 4 và cấu hình SOW Bảng 1
  const [managerExceptions, setManagerExceptions] = useState<Record<string, boolean>>(() =>
    loadSavedManagerExceptions()
  );
  const sowPolicies = useMemo(() => loadSavedSowPolicies(), []);

  React.useEffect(() => {
    const syncExceptions = () => setManagerExceptions(loadSavedManagerExceptions());
    window.addEventListener('upbase-workload-exceptions-updated', syncExceptions);
    return () => window.removeEventListener('upbase-workload-exceptions-updated', syncExceptions);
  }, []);

  const toggleManagerException = (staffCode: string, staffName: string) => {
    const next = { ...managerExceptions, [staffCode]: !managerExceptions[staffCode] };
    setManagerExceptions(next);
    persistManagerExceptions(next);
    notify(
      next[staffCode]
        ? `Đã xác nhận ngoại lệ Bảng 4 cho ${staffName}: Giữ nguyên hệ số cơ cấu ×1,00`
        : `Đã gỡ ngoại lệ Bảng 4 của ${staffName}: Áp dụng hệ số cơ cấu theo tỷ lệ thực tế`
    );
  };

  // Tính toán tải công việc hợp nhất của 28 nhân sự B2C
  const unifiedStaffWorkloads = useMemo(() => {
    return computeUnifiedB2cStaffWorkloads({
      tasks,
      brands,
      storePortfolios,
      managerExceptions,
    });
  }, [tasks, brands, storePortfolios, managerExceptions]);

  const staffWorkloadMap = useMemo(() => {
    const map = new Map<string, UnifiedStaffWorkloadRow>();
    unifiedStaffWorkloads.forEach(w => map.set(w.name, w));
    return map;
  }, [unifiedStaffWorkloads]);

  const filteredUnifiedWorkloads = useMemo(() => {
    const q = workloadSearch.trim().toLowerCase();
    return unifiedStaffWorkloads.filter(w => {
      if (workloadFilterStatus === 'OVERLOAD' && w.loadStatus !== 'OVERLOAD') return false;
      if (workloadFilterStatus === 'OPTIMAL' && w.loadStatus !== 'OPTIMAL') return false;
      if (workloadFilterStatus === 'UNDERLOAD' && w.loadStatus !== 'UNDERLOAD') return false;
      if (workloadFilterStatus === 'FAIL_07' && (w.meetsHardRatio || w.hasException)) return false;
      if (q) {
        const matchName = w.name.toLowerCase().includes(q);
        const matchCode = w.staffCode.toLowerCase().includes(q);
        const matchRole = w.roleGroup.toLowerCase().includes(q);
        const matchStore = w.liveStoresSummaryText.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchRole && !matchStore) return false;
      }
      return true;
    });
  }, [unifiedStaffWorkloads, workloadFilterStatus, workloadSearch]);

  // Danh sách nhân sự B2C chuẩn (ưu tiên 28 nhân sự thực tế từ B2C_28_STAFF_WORKLOAD_ROSTER)
  const b2cStorePicOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; roleTitle: string }>();
    B2C_28_STAFF_WORKLOAD_ROSTER.forEach(r => {
      map.set(r.name, {
        id: r.staffCode,
        name: r.name,
        roleTitle: `${r.roleGroup} (${r.level})`,
      });
    });
    staffList
      .filter(s => s.role === 'BOOKING' || s.role === 'CONTENT')
      .forEach(s => {
        if (!map.has(s.name)) {
          map.set(s.name, { id: s.id, name: s.name, roleTitle: s.roleTitle });
        }
      });
    return Array.from(map.values());
  }, [staffList]);

  // Danh sách ứng viên B2C cho 3 vị trí gắn theo Brand [theo brand]
  const brandPositionCandidateNames = useMemo(() => {
    const base = B2C_28_STAFF_WORKLOAD_ROSTER.map(r => r.name);
    if (!base.includes('Đặng Thị Yến Nhi')) base.unshift('Đặng Thị Yến Nhi');
    staffList.forEach(s => {
      if (s.name && !base.includes(s.name)) base.push(s.name);
    });
    brands.forEach(b => {
      if (b.contentBrandMainPic && !base.includes(b.contentBrandMainPic)) base.push(b.contentBrandMainPic);
      if (b.planStrategyPic && !base.includes(b.planStrategyPic)) base.push(b.planStrategyPic);
      if (b.keyVisualSisPic && !base.includes(b.keyVisualSisPic)) base.push(b.keyVisualSisPic);
    });
    return base;
  }, [staffList, brands]);

  const displayedBrands = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return brands.filter(b => {
      const contentMain = b.contentBrandMainPic || b.contentPic || 'Quỳnh Như';
      const planStrat = b.planStrategyPic || b.brandPicName || 'Nguyễn Thị Ngọc Tâm';
      const kvSis = b.keyVisualSisPic || 'Vũ Hoài Lâm';

      if (selectedBrandFilter !== 'ALL') {
        if (selectedBrandPosRole === 'CONTENT_BRAND_MAIN' && contentMain !== selectedBrandFilter) return false;
        if (selectedBrandPosRole === 'PLAN_STRATEGY' && planStrat !== selectedBrandFilter) return false;
        if (selectedBrandPosRole === 'KEY_VISUAL_SIS' && kvSis !== selectedBrandFilter) return false;
        if (
          selectedBrandPosRole === 'ALL' &&
          contentMain !== selectedBrandFilter &&
          planStrat !== selectedBrandFilter &&
          kvSis !== selectedBrandFilter &&
          (b.bookingPicLead || 'Đặng Thị Yến Nhi') !== selectedBrandFilter
        ) {
          return false;
        }
      }
      if (q) {
        const matchName = b.name.toLowerCase().includes(q);
        const matchCompany = (b.companyName || '').toLowerCase().includes(q);
        const matchCat = (b.category || '').toLowerCase().includes(q);
        const matchPic =
          (b.bookingPicLead || '').toLowerCase().includes(q) ||
          (b.accountPic || '').toLowerCase().includes(q) ||
          (b.growthPic || '').toLowerCase().includes(q) ||
          contentMain.toLowerCase().includes(q) ||
          planStrat.toLowerCase().includes(q) ||
          kvSis.toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchCat && !matchPic) return false;
      }
      return true;
    });
  }, [brands, searchTerm, selectedBrandFilter, selectedBrandPosRole]);

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
    sowStt: number;
    difficultyTier: 'EASY' | 'STANDARD' | 'HARD';
    quantity: number;
  }>({
    targetStaff: 'Nguyễn Thị Ngọc Tâm',
    brand: 'ClubClio',
    title: '',
    description: '',
    deadlineHours: 24,
    urgency: 'warning',
    type: 'GENERAL_TASK',
    sowStt: 1,
    difficultyTier: 'STANDARD',
    quantity: 1,
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
    contentBrandMainPic: string;
    planStrategyPic: string;
    keyVisualSisPic: string;
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
    contentBrandMainPic: 'Quỳnh Như',
    planStrategyPic: 'Nguyễn Thị Ngọc Tâm',
    keyVisualSisPic: 'Vũ Hoài Lâm',
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
      contentBrandMainPic: master.contentBrandMainPic || master.contentPic || 'Quỳnh Như',
      planStrategyPic: master.planStrategyPic || master.brandPicName || 'Nguyễn Thị Ngọc Tâm',
      keyVisualSisPic: master.keyVisualSisPic || 'Vũ Hoài Lâm',
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
    const selectedSow = sowPolicies.find(s => s.stt === newTaskState.sowStt) || sowPolicies[0];
    const cleanTitle =
      newTaskState.title.trim() ||
      (selectedSow ? `${selectedSow.name} — ${newTaskState.brand}` : '');
    if (!cleanTitle) {
      notify('Vui lòng nhập tiêu đề nhiệm vụ!');
      return;
    }

    const assignedMember = staffList.find(s => s.name === newTaskState.targetStaff);
    const targetRole: UserRole = assignedMember?.role === 'BOOKING' 
      ? 'BOOKING_MEMBER' 
      : assignedMember?.role === 'CONTENT' 
      ? 'CONTENT_MEMBER' 
      : 'BRAND_MEMBER';

    const stdPt = selectedSow?.basePoint || 3.0;
    const diffCoef = DIFFICULTY_TIER_BADGE[newTaskState.difficultyTier].coef;
    const qty = Math.max(1, newTaskState.quantity || 1);
    const calcPts = Number((qty * stdPt * diffCoef).toFixed(2));

    const createdTask: SlaTask = {
      id: `task-lead-${Date.now()}`,
      title: cleanTitle,
      description: newTaskState.description || `Chỉ đạo trực tiếp từ Trưởng phòng ${currentUser.name}`,
      brand: newTaskState.brand,
      team: assignedMember?.team || 'Marketing B2C',
      deadline: `Trong vòng ${newTaskState.deadlineHours}h`,
      remainingText: `Còn ${newTaskState.deadlineHours} giờ`,
      deadlineHours: newTaskState.deadlineHours,
      urgency: newTaskState.urgency,
      pic: newTaskState.targetStaff,
      targetRole: targetRole,
      type: selectedSow?.categoryKey === 'RESEARCH' ? 'RESEARCH_TASK' : newTaskState.type,
      taskCategory: selectedSow?.categoryKey || 'BOOKING',
      taskSource: 'DIRECTOR_ASSIGNED',
      sowStt: selectedSow?.stt,
      sowGroup: selectedSow?.group,
      sowName: selectedSow?.name,
      acceptedQuantity: qty,
      standardPoint: stdPt,
      scopeCoef: 1.0,
      taskDifficultyTier: newTaskState.difficultyTier,
      taskDifficultyCoef: diffCoef,
      timelineStatus: 'ON_TIME',
      timelineCoef: 1.0,
      multiPlatformCoef: 1.0,
      assignmentRole: 'PIC_OWNER',
      contributionWeightPct: 100,
      baseWorkloadPoints: Number((qty * stdPt).toFixed(2)),
      calculatedWorkloadPoints: calcPts,
      actionLabel: 'Xử lý ngay',
      createdAt: new Date().toISOString()
    };

    onAddTask(createdTask);
    notify(
      `Đã giao nhiệm vụ "${createdTask.title}" (+${calcPts.toFixed(2).replace('.', ',')} điểm) cho ${newTaskState.targetStaff}!`
    );
    
    if (onPingStaff) {
      onPingStaff(newTaskState.targetStaff, `Nhiệm vụ mới từ Trưởng phòng: ${createdTask.title}`);
    }

    setIsTaskModalOpen(false);
    setNewTaskState({
      targetStaff: 'Nguyễn Thị Ngọc Tâm',
      brand: 'ClubClio',
      title: '',
      description: '',
      deadlineHours: 24,
      urgency: 'warning',
      type: 'GENERAL_TASK',
      sowStt: 1,
      difficultyTier: 'STANDARD',
      quantity: 1,
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
        contentBrandMainPic: brandFormState.contentBrandMainPic,
        planStrategyPic: brandFormState.planStrategyPic,
        keyVisualSisPic: brandFormState.keyVisualSisPic,
        brandGuideline: brandFormState.brandGuideline
      };
      onUpdateBrand(updated);
      notify(
        `Đã cập nhật phân bổ nhân sự theo Brand cho ${updated.name}: Content/Brand main (${updated.contentBrandMainPic}), Plan/Strategy (${updated.planStrategyPic}), KV/SIS (${updated.keyVisualSisPic})!`
      );
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
        color: baseMaster?.color || 'bg-accent',
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
        contentBrandMainPic: brandFormState.contentBrandMainPic,
        planStrategyPic: brandFormState.planStrategyPic,
        keyVisualSisPic: brandFormState.keyVisualSisPic,
        brandGuideline: brandFormState.brandGuideline || baseMaster?.brandGuideline || 'Quy định nội dung thương hiệu...',
        kocCriteria: baseMaster?.kocCriteria || 'Phù hợp định vị nhãn hàng',
        stores: baseMaster?.stores || [],
        heroProducts: baseMaster?.heroProducts || []
      };
      onAddBrand(newBrand);
      notify(`Đã thêm nhãn hàng mới ${newBrand.name} ${baseMaster ? 'từ Master Data' : ''} và phân bổ 3 vị trí gắn theo Brand!`);
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
      contentBrandMainPic: brand.contentBrandMainPic || brand.contentPic || 'Quỳnh Như',
      planStrategyPic: brand.planStrategyPic || brand.brandPicName || 'Nguyễn Thị Ngọc Tâm',
      keyVisualSisPic: brand.keyVisualSisPic || 'Vũ Hoài Lâm',
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

    if (isPicChanged) {
      const matchedRoster = B2C_28_STAFF_WORKLOAD_ROSTER.find(r => r.name === nextOwner);
      setAssignmentHistory(prev => [
        {
          id: `hist-${Date.now()}`,
          storeId: updated.storeOperationId || updated.id,
          storeName: updated.storeName,
          brandName: updated.brandName,
          staffId: matchedRoster?.staffCode || `NV-${Date.now()}`,
          staffName: nextOwner,
          roleType: 'PRIMARY_B2C',
          action: 'REASSIGNED',
          effectiveDate: today,
          assignedBy: currentUser.id,
          assignedByName: currentUser.name,
          reason: notes || `Điều chuyển gian hàng từ ${prevOwner} sang ${nextOwner}`,
          handoverNotes: `Bàn giao trực tiếp từ ${prevOwner} sang ${nextOwner}`,
        },
        ...prev,
      ]);
    }

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
      if (b.contentBrandMainPic) set.add(b.contentBrandMainPic);
      if (b.planStrategyPic) set.add(b.planStrategyPic);
      if (b.keyVisualSisPic) set.add(b.keyVisualSisPic);
      if (b.bookingPicLead) set.add(b.bookingPicLead);
    });
    return Array.from(set).sort();
  }, [brands]);

  // Thống kê tải theo Brand của từng nhân sự trên 3 vị trí [theo brand]
  const brandStaffPositionSummary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; contentMainCount: number; planStrategyCount: number; kvSisCount: number; totalPositions: number; brandCount: number }
    >();
    const brandSets = new Map<string, Set<string>>();

    const ensure = (name: string) => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          contentMainCount: 0,
          planStrategyCount: 0,
          kvSisCount: 0,
          totalPositions: 0,
          brandCount: 0,
        });
      }
      if (!brandSets.has(name)) {
        brandSets.set(name, new Set());
      }
      return map.get(name)!;
    };

    brands.forEach(b => {
      const cPic = b.contentBrandMainPic || b.contentPic || 'Quỳnh Như';
      const pPic = b.planStrategyPic || b.brandPicName || 'Nguyễn Thị Ngọc Tâm';
      const kPic = b.keyVisualSisPic || 'Vũ Hoài Lâm';

      const cRec = ensure(cPic);
      cRec.contentMainCount += 1;
      cRec.totalPositions += 1;
      brandSets.get(cPic)!.add(b.name);

      const pRec = ensure(pPic);
      pRec.planStrategyCount += 1;
      pRec.totalPositions += 1;
      brandSets.get(pPic)!.add(b.name);

      const kRec = ensure(kPic);
      kRec.kvSisCount += 1;
      kRec.totalPositions += 1;
      brandSets.get(kPic)!.add(b.name);
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      brandCount: brandSets.get(item.name)?.size || 0,
    }));
    return list.sort((a, b) => b.totalPositions - a.totalPositions);
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
            { key: 'BRANDS', label: `Phân bổ Nhân sự theo Brand · ${brands.length}` },
            { key: 'COEFFICIENTS', label: `Hệ số Gian hàng · ${b2cPlanStores.length}` },
            { key: 'STAFF', label: `Cân bằng tải & Danh bạ · ${B2C_28_STAFF_WORKLOAD_ROSTER.length}` },
            { key: 'ASSIGNMENT_HISTORY', label: `Lịch sử PIC & Bàn giao · ${assignmentHistory.length}` },
          ]}
        />
        <PageActions>
          {onNavigateToDashboard && (
            <ActionMenu
              items={[
                {
                  label: activeSection === 'BRANDS' ? 'Xem báo cáo thương hiệu' : activeSection === 'STAFF' ? 'Xem báo cáo nhân sự' : 'Xem báo cáo gian hàng',
                  icon: BarChart3,
                  onSelect: () => onNavigateToDashboard(activeSection === 'BRANDS' ? 'dashboard-brand' : activeSection === 'STAFF' ? 'dashboard-staff' : 'dashboard-store'),
                },
              ]}
            />
          )}
          <Button
            size="sm"
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
                contentBrandMainPic: 'Quỳnh Như',
                planStrategyPic: 'Nguyễn Thị Ngọc Tâm',
                keyVisualSisPic: 'Vũ Hoài Lâm',
                brandGuideline: ''
              });
              setIsBrandModalOpen(true);
            }}
          >
            Thêm nhãn hàng
          </Button>
        </PageActions>
      </div>

      {/* ========================================================================= */}
      {/* 1. PHÂN BỔ NHÂN SỰ THEO BRAND (3 VỊ TRÍ GẮN THEO BRAND + ACCOUNT/GROWTH) */}
      {/* ========================================================================= */}
      {activeSection === 'BRANDS' && (
        <div className="space-y-4">
          {/* Khung tổng quan 3 vị trí gắn theo Brand dành cho Giám đốc */}
          <div className="bg-surface rounded-xl border border-line p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">
                Phân bổ nhân sự theo Brand ({brands.length} thương hiệu B2C)
              </h3>

              {/* Bộ lọc nhanh theo vị trí gắn theo Brand */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'ALL' as const, label: `Tất cả (${brands.length})` },
                  { key: 'CONTENT_BRAND_MAIN' as const, label: 'Content / Brand main' },
                  { key: 'PLAN_STRATEGY' as const, label: 'Plan / Strategy' },
                  { key: 'KEY_VISUAL_SIS' as const, label: 'Key Visual / SIS' },
                ].map(roleTab => {
                  const active = selectedBrandPosRole === roleTab.key;
                  return (
                    <button
                      key={roleTab.key}
                      type="button"
                      onClick={() => setSelectedBrandPosRole(roleTab.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                        active
                          ? 'bg-accent-soft border-accent/30 text-accent font-semibold'
                          : 'bg-canvas border-line text-ink-2 hover:text-ink hover:border-line-strong'
                      }`}
                    >
                      {roleTab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thanh tóm tắt tải nhân sự theo Brand */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
              {brandStaffPositionSummary.map(st => {
                const isSelected = selectedBrandFilter === st.name;
                return (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => setSelectedBrandFilter(isSelected ? 'ALL' : st.name)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      isSelected
                        ? 'bg-brand/5 border-brand ring-1 ring-brand/30'
                        : 'bg-canvas/70 border-line hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-ink truncate">{st.name}</span>
                      <span className="text-2xs font-mono font-semibold text-ink-2 shrink-0">
                        {st.brandCount} Brand
                      </span>
                    </div>
                    <div className="mt-1 text-2xs text-ink-3 truncate">
                      {[
                        st.contentMainCount > 0 ? `Content: ${st.contentMainCount}` : null,
                        st.planStrategyCount > 0 ? `Plan: ${st.planStrategyCount}` : null,
                        st.kvSisCount > 0 ? `KV: ${st.kvSisCount}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative min-w-[230px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input
                    type="text"
                    placeholder="Tìm nhãn hàng, nhân sự phụ trách..."
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
                  <option value="ALL">Tất cả nhân sự phụ trách Brand</option>
                  {uniqueBrandPics.map(pic => (
                    <option key={pic} value={pic}>{pic}</option>
                  ))}
                </select>

                {(searchTerm || selectedBrandFilter !== 'ALL' || selectedBrandPosRole !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedBrandFilter('ALL');
                      setSelectedBrandPosRole('ALL');
                    }}
                    className="text-2xs text-ink-3 hover:text-ink px-2 py-1 rounded bg-sunken transition"
                  >
                    Xóa lọc ({displayedBrands.length}/{brands.length})
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-2xs">
                    <th className="py-2.5 px-4 min-w-[185px]">Nhãn hàng</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Content / Brand main</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Plan / Strategy</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Key Visual / SIS</th>
                    <th className="py-2.5 px-3 min-w-[195px]">Phối hợp (Account / Growth)</th>
                    <th className="py-2.5 px-3 text-center w-24">Số gian B2C</th>
                    <th className="py-2.5 px-3 text-right w-28"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {displayedBrands.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-ink-3 text-xs">
                        Không tìm thấy nhãn hàng phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    displayedBrands.map((brand) => {
                      const brandStoresCount = storePortfolios.filter(s => 
                        s.brandName.toLowerCase().includes(brand.name.toLowerCase()) && 
                        (storeFilterMode === 'ALL' ? true : Boolean(s.requiresB2cPlan || s.isB2cManaged))
                      ).length;

                      const contentMainVal = brand.contentBrandMainPic || brand.contentPic || 'Quỳnh Như';
                      const planStrategyVal = brand.planStrategyPic || brand.brandPicName || 'Nguyễn Thị Ngọc Tâm';
                      const kvSisVal = brand.keyVisualSisPic || 'Vũ Hoài Lâm';

                      return (
                        <tr key={brand.id} className="hover:bg-canvas transition-colors group">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-sunken text-ink-2 font-semibold text-2xs flex items-center justify-center shrink-0">
                                {brand.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-ink text-xs block truncate">{brand.name}</span>
                                <span className="text-2xs text-ink-3 block truncate max-w-[165px]">
                                  {brand.category || brand.companyName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 1. Content / Brand main */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={contentMainVal} size={22} />
                              <select
                                value={contentMainVal}
                                onChange={(e) => {
                                  const updated: BrandDetail = {
                                    ...brand,
                                    contentBrandMainPic: e.target.value,
                                    contentPic: e.target.value,
                                  };
                                  onUpdateBrand(updated);
                                  notify(`Đã phân bổ vị trí Content / Brand main của ${brand.name} cho ${e.target.value}`);
                                }}
                                className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                              >
                                {brandPositionCandidateNames.map(name => {
                                  const w = staffWorkloadMap.get(name);
                                  return (
                                    <option key={name} value={name}>
                                      {name}
                                      {w ? ` (${w.level} · ${w.liveAssignedStoresCount} gian · ${w.loadPct}%)` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </td>

                          {/* 2. Plan / Strategy */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={planStrategyVal} size={22} />
                              <select
                                value={planStrategyVal}
                                onChange={(e) => {
                                  const updated: BrandDetail = {
                                    ...brand,
                                    planStrategyPic: e.target.value,
                                    brandPicName: e.target.value,
                                  };
                                  onUpdateBrand(updated);
                                  notify(`Đã phân bổ vị trí Plan / Strategy của ${brand.name} cho ${e.target.value}`);
                                }}
                                className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                              >
                                {brandPositionCandidateNames.map(name => {
                                  const w = staffWorkloadMap.get(name);
                                  return (
                                    <option key={name} value={name}>
                                      {name}
                                      {w ? ` (${w.level} · ${w.liveAssignedStoresCount} gian · ${w.loadPct}%)` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </td>

                          {/* 3. Key Visual / SIS */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={kvSisVal} size={22} />
                              <select
                                value={kvSisVal}
                                onChange={(e) => {
                                  const updated: BrandDetail = {
                                    ...brand,
                                    keyVisualSisPic: e.target.value,
                                  };
                                  onUpdateBrand(updated);
                                  notify(`Đã phân bổ vị trí Key Visual / SIS của ${brand.name} cho ${e.target.value}`);
                                }}
                                className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                              >
                                {brandPositionCandidateNames.map(name => {
                                  const w = staffWorkloadMap.get(name);
                                  return (
                                    <option key={name} value={name}>
                                      {name}
                                      {w ? ` (${w.level} · ${w.liveAssignedStoresCount} gian · ${w.loadPct}%)` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </td>

                          {/* Phối hợp Account PIC & Growth PIC */}
                          <td className="py-3 px-3">
                            <div className="space-y-1 text-2xs">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-ink-3 shrink-0">Account:</span>
                                <span className="font-medium text-ink truncate">{brand.accountPic || 'Phạm Thị Nhài'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-ink-3 shrink-0">Growth:</span>
                                <span className="font-medium text-ink truncate">{brand.growthPic || 'Hoàng Long'}</span>
                              </div>
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
              const isSelected = selectedLeaderTeam === (team.teamCode as typeof selectedLeaderTeam);
              const isLeaderGroup = team.id === 'team-tam';
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedLeaderTeam(isSelected ? 'ALL' : (team.teamCode as typeof selectedLeaderTeam))}
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
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2 border-l border-line">
                    <div className="text-base font-mono font-semibold text-ink">{team.managedStoresCount} gian</div>
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
                  onChange={(e) => setSelectedLeaderTeam(e.target.value as typeof selectedLeaderTeam)}
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
                  onChange={(e) => setStorePlatformFilter(e.target.value as typeof storePlatformFilter)}
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
                  {b2cStorePicOptions.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-2xs text-ink-3">
                Hiển thị <strong className="text-ink font-semibold">{displayedStores.length}</strong> gian hàng
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-2xs">
                    <th className="py-2.5 px-4 min-w-[200px]">Gian hàng & sàn</th>
                    <th className="py-2.5 px-3">Nhãn hàng</th>
                    <th className="py-2.5 px-3 text-center min-w-[140px]">Hệ số gian hàng (Bảng 2)</th>
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
                      <td colSpan={8} className="py-10 text-center text-ink-3 text-xs">
                        Không có gian hàng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    displayedStores.map((store) => {
                      const owners = store.b2cOwners || (store.b2cOwnerName ? store.b2cOwnerName.split(',').map(s => s.trim()) : ['Nguyễn Thị Ngọc Tâm']);
                      const hasLeader = Boolean(store.hasBookingLeader && store.bookingLeader);
                      const currentLeaderVal = hasLeader ? (store.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : 'NONE';
                      const coef = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);
                      const coefBadgeClass =
                        coef.tier === 'Khó'
                          ? 'bg-critical-soft text-critical border-critical/20'
                          : coef.tier === 'Vừa'
                            ? 'bg-warning-soft text-warning border-warning/20'
                            : coef.tier === 'Tiêu chuẩn'
                              ? 'bg-accent-soft text-accent border-accent/20'
                              : 'bg-sunken text-ink border-line-strong';

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

                          {/* Hệ số gian hàng */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveSection('COEFFICIENTS')}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold transition cursor-pointer hover:opacity-85 ${coefBadgeClass}`}
                            >
                              <span>{coef.tier}</span>
                              <span className="font-mono font-semibold">· {coef.label}</span>
                            </button>
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
                              <Avatar name={owners[0] || 'Nguyễn Thị Ngọc Tâm'} size={22} />
                              <select
                                value={owners[0] || 'Nguyễn Thị Ngọc Tâm'}
                                onChange={(e) => {
                                  const newOwners = [e.target.value];
                                  handleSaveStoreAssignment(store.id, newOwners, store.assignmentNotes || '');
                                }}
                                className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                              >
                                {b2cStorePicOptions.map(s => {
                                  const w = staffWorkloadMap.get(s.name);
                                  return (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                      {w ? ` (${w.level} · ${w.liveAssignedStoresCount} gian · ${w.loadPct}%)` : ''}
                                    </option>
                                  );
                                })}
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
      {/* 2B. BẢNG 2. HỆ SỐ GIAN HÀNG (HS PHẠM VI CHO VIỆC CẤP SÀN VÀ CẤP BRAND)     */}
      {/* ========================================================================= */}
      {activeSection === 'COEFFICIENTS' && (
        <StoreCoefficientHubSection
          stores={storePortfolios}
          brands={brands}
          selectedMonth="2026/10"
          currentUser={currentUser}
          onUpdateStore={onUpdateStore}
          onNotify={(msg) => notify(msg)}
        />
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
                  ? `Cân bằng định mức tải khối B2C (${filteredUnifiedWorkloads.length}/${unifiedStaffWorkloads.length} nhân sự)`
                  : `Danh bạ nhân sự theo khối (${filteredDepartmentStaff.length} / ${scopedDepartmentStaff.length} nhân viên)`}
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-sunken p-1 rounded-lg border border-line shrink-0 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setStaffSubView('WORKLOAD')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  staffSubView === 'WORKLOAD'
                    ? 'bg-surface text-ink shadow-2xs font-semibold'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Cân bằng tải B2C ({unifiedStaffWorkloads.length})
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
              <div className="bg-surface border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'ALL' as const, label: `Tất cả (${unifiedStaffWorkloads.length})` },
                    {
                      key: 'OVERLOAD' as const,
                      label: `Quá tải ≥115% (${unifiedStaffWorkloads.filter(w => w.loadStatus === 'OVERLOAD').length})`,
                    },
                    {
                      key: 'OPTIMAL' as const,
                      label: `Đủ tải 96–114% (${unifiedStaffWorkloads.filter(w => w.loadStatus === 'OPTIMAL').length})`,
                    },
                    {
                      key: 'UNDERLOAD' as const,
                      label: `Dư công suất <96% (${unifiedStaffWorkloads.filter(w => w.loadStatus === 'UNDERLOAD').length})`,
                    },
                    {
                      key: 'FAIL_07' as const,
                      label: `Thiếu việc khó ×0,70 (${unifiedStaffWorkloads.filter(w => !w.meetsHardRatio && !w.hasException).length})`,
                    },
                  ].map(chip => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setWorkloadFilterStatus(chip.key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                        workloadFilterStatus === chip.key
                          ? 'bg-accent text-white border-accent font-semibold'
                          : 'bg-canvas text-ink-2 border-line hover:text-ink'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={workloadSearch}
                    onChange={e => setWorkloadSearch(e.target.value)}
                    placeholder="Tìm tên NV, mã NV, gian hàng..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-surface border border-line rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredUnifiedWorkloads.map((w) => {
                  const isOverloaded = w.loadStatus === 'OVERLOAD';
                  const isOptimal = w.loadStatus === 'OPTIMAL';
                  const contentMainBrands = brands.filter(b => (b.contentBrandMainPic || b.contentPic) === w.name);
                  const planStrategyBrands = brands.filter(b => (b.planStrategyPic || b.brandPicName) === w.name);
                  const kvSisBrands = brands.filter(b => b.keyVisualSisPic === w.name);
                  const totalBrandPositions = contentMainBrands.length + planStrategyBrands.length + kvSisBrands.length;

                  return (
                    <div
                      key={w.staffCode}
                      className={`bg-surface rounded-xl border p-4 flex flex-col justify-between transition ${
                        isOverloaded ? 'border-critical-line' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={w.name} size={36} />
                            <div className="min-w-0">
                              <span className="font-semibold text-ink text-xs block truncate">{w.name}</span>
                              <span className="text-2xs text-ink-3 block leading-tight truncate">
                                {w.staffCode} · {w.roleGroup}
                              </span>
                            </div>
                          </div>
                          <span className="text-2xs font-semibold text-accent px-1.5 py-0.5 rounded bg-accent-soft border border-accent/20 shrink-0">
                            {w.level}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-line space-y-1 text-xs">
                          <div className="flex items-baseline justify-between">
                            <span className="text-ink-3">Quỹ điểm tháng:</span>
                            <span className={`font-mono font-semibold ${isOverloaded ? 'text-critical' : isOptimal ? 'text-positive' : 'text-accent'}`}>
                              {w.finalMonthlyWorkloadPts.toFixed(1).replace('.', ',')} / {w.targetCapacityPts} đ ({w.loadPct}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-2xs">
                            <span className="text-ink-3">
                              Gian hàng: <strong className="text-ink">{w.liveAssignedStoresCount} gian</strong>
                            </span>
                            {w.meetsHardRatio ? (
                              <span className="text-positive font-semibold">
                                Đạt việc khó ({w.hardRatioPct}% · ×1,00)
                              </span>
                            ) : w.hasException ? (
                              <span className="text-accent font-semibold">
                                Ngoại lệ ×1,00 ({w.hardRatioPct}%)
                              </span>
                            ) : (
                              <span className="text-warning font-semibold">
                                Hệ số ×0,70 ({w.hardRatioPct}%/{w.minHardRatioReqPct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar of Capacity */}
                        <div className="w-full bg-sunken h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`data-bar h-full rounded-full ${
                              isOverloaded ? 'bg-critical' : isOptimal ? 'bg-positive' : 'bg-brand'
                            }`}
                            style={{ width: `${Math.min(100, w.loadPct)}%` }}
                          />
                        </div>

                        {/* Vị trí gắn theo Brand [theo brand] */}
                        <div className="mt-2.5 p-2 rounded-lg bg-warning-soft border border-warning/20">
                          <div className="flex items-center justify-between text-2xs mb-1">
                            <span className="font-semibold text-warning">Vị trí gắn theo Brand:</span>
                            <span className="font-mono font-semibold text-warning">{totalBrandPositions} vị trí</span>
                          </div>
                          {totalBrandPositions > 0 ? (
                            <div className="flex flex-wrap gap-1 text-2xs">
                              {contentMainBrands.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-white border border-warning/20 text-warning font-medium">
                                  Content: {contentMainBrands.length}
                                </span>
                              )}
                              {planStrategyBrands.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-white border border-accent/20 text-accent font-medium">
                                  Plan: {planStrategyBrands.length}
                                </span>
                              )}
                              {kvSisBrands.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-white border border-accent/20 text-accent font-medium">
                                  KV/SIS: {kvSisBrands.length}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-2xs text-ink-3 italic">Chưa gán vị trí theo Brand</span>
                          )}
                        </div>

                        {/* Assigned Stores List tags */}
                        <div className="mt-2.5">
                          <span className="text-2xs font-medium text-ink-3 block mb-1">
                            Danh sách gian hàng ({w.liveAssignedStoresCount}):
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {w.assignedStores.length > 0 ? (
                              w.assignedStores.map(st => (
                                <span key={st.storeId} className="text-2xs px-1.5 py-0.5 rounded border border-line text-ink-2 font-medium truncate max-w-[140px]" title={st.storeName}>
                                  {st.storeName.split('_')[0]}
                                </span>
                              ))
                            ) : (
                              <span className="text-2xs text-ink-3 italic">Chưa gán gian hàng</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-line flex items-center gap-1.5">
                        {w.liveAssignedStoresCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffFilter(w.name);
                              setActiveSection('STORES');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-sunken text-ink-2 hover:text-ink text-2xs font-medium border border-line transition cursor-pointer shrink-0"
                            title="Mở danh sách gian hàng của nhân sự này để bàn giao / cân bằng tải"
                          >
                            Gian hàng ({w.liveAssignedStoresCount})
                          </button>
                        )}
                        {!w.meetsHardRatio && (
                          <button
                            type="button"
                            onClick={() => toggleManagerException(w.staffCode, w.name)}
                            className="px-2 py-1.5 rounded-lg bg-surface hover:bg-sunken text-positive text-2xs font-semibold border border-line transition cursor-pointer shrink-0"
                          >
                            {w.hasException ? 'Gỡ ×1,00' : 'Duyệt ×1,00'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const firstStore = w.assignedStores[0];
                            setNewTaskState(prev => ({
                              ...prev,
                              targetStaff: w.name,
                              brand: firstStore?.brandName || prev.brand,
                              difficultyTier: !w.meetsHardRatio ? 'HARD' : 'STANDARD',
                            }));
                            setIsTaskModalOpen(true);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-canvas hover:bg-sunken text-ink hover:text-accent text-xs font-semibold border border-line flex items-center justify-center gap-1 transition cursor-pointer"
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
              <div className="border border-line rounded-xl overflow-hidden max-h-[460px] overflow-y-auto overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs border-collapse">
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
                          <span className="px-1.5 py-0.5 rounded border border-line text-2xs">
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
                          <span className="text-2xs font-medium px-1.5 py-0.5 rounded bg-brand-soft text-brand border border-brand-line">
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
      {/* 6. LỊCH SỬ PIC & NHÂN SỰ DỰ PHÒNG ĐƯỢC ỦY QUYỀN (STORE ASSIGNMENT HISTORY) */}
      {/* ========================================================================= */}
      {activeSection === 'ASSIGNMENT_HISTORY' && (
        <div className="space-y-6">
          {/* Section 1: Store Assignment History */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-line bg-canvas flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-xs text-ink flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-brand" />
                  <span>Lịch sử điều chuyển & phân công gian hàng</span>
                  <span className="text-2xs font-mono font-medium text-ink-2 px-1.5 py-0.5 rounded border border-line">
                    {assignmentHistory.length} bản ghi
                  </span>
                </h3>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm gian hàng, mã SO, nhân sự..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
                  />
                </div>
                <select
                  value={historyActionFilter}
                  onChange={(e) => setHistoryActionFilter(e.target.value as typeof historyActionFilter)}
                  className="px-2.5 py-1 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
                >
                  <option value="ALL">Mọi hành động</option>
                  <option value="ASSIGNED">Bổ nhiệm chính (ASSIGNED)</option>
                  <option value="REASSIGNED">Điều chuyển (REASSIGNED)</option>
                  <option value="BACKUP_ACTIVATED">Ủy quyền Backup</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 w-[120px]">Mã gian</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Gian hàng</th>
                    <th className="py-2.5 px-4 w-[130px]">Hành động</th>
                    <th className="py-2.5 px-4 min-w-[180px]">Nhân sự đảm nhận</th>
                    <th className="py-2.5 px-4 min-w-[260px]">Lý do & Biên bản bàn giao</th>
                    <th className="py-2.5 px-4 w-[150px]">Người thực hiện</th>
                    <th className="py-2.5 px-4 text-right w-[110px]">Hiệu lực</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assignmentHistory.filter(h => {
                    if (historyActionFilter !== 'ALL' && h.action !== historyActionFilter) return false;
                    if (historySearch.trim()) {
                      const q = historySearch.toLowerCase();
                      return (
                        h.storeName.toLowerCase().includes(q) ||
                        h.storeId.toLowerCase().includes(q) ||
                        h.staffName.toLowerCase().includes(q) ||
                        (h.assignedByName && h.assignedByName.toLowerCase().includes(q)) ||
                        (h.reason && h.reason.toLowerCase().includes(q)) ||
                        (h.handoverNotes && h.handoverNotes.toLowerCase().includes(q))
                      );
                    }
                    return true;
                  }).map((h) => (
                    <tr key={h.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink text-2xs">
                        {h.storeId}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">
                        {h.storeName}
                        <div className="text-2xs text-ink-3 font-normal">{h.brandName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                          h.action === 'ASSIGNED'
                            ? 'bg-positive-soft text-positive border border-line'
                            : h.action === 'REASSIGNED'
                            ? 'bg-accent-soft text-accent border border-line'
                            : 'bg-warning-soft text-warning border border-line'
                        }`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-2xs">
                        <strong className="text-ink font-semibold">{h.staffName}</strong>
                        <div className="text-2xs text-ink-3 font-mono">{h.roleType}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-2">
                        {h.reason && <p className="font-medium text-ink">{h.reason}</p>}
                        {h.handoverNotes && <p className="text-2xs text-ink-3 mt-0.5 leading-relaxed">{h.handoverNotes}</p>}
                        {!h.reason && !h.handoverNotes && '—'}
                      </td>
                      <td className="py-3 px-4 text-2xs font-medium text-ink-2">
                        {h.assignedByName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-2xs text-ink-3">
                        {h.effectiveDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Backup Staff Assignments */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-line bg-canvas flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-ink flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-warning" />
                  <span>Nhân sự dự phòng được ủy quyền (Backup PIC)</span>
                  <span className="text-2xs font-mono font-medium text-ink-2 px-1.5 py-0.5 rounded border border-line">
                    {INITIAL_BACKUP_ASSIGNMENTS.length} cặp ủy quyền
                  </span>
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-semibold text-2xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 min-w-[160px]">Nhân sự chính</th>
                    <th className="py-2.5 px-4 w-[120px]">Chức danh</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Nhân sự dự phòng (Backup)</th>
                    <th className="py-2.5 px-4 min-w-[260px]">Lý do & Ghi chú ủy quyền</th>
                    <th className="py-2.5 px-4 text-center w-[130px]">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right w-[180px]">Thời hạn ủy quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {INITIAL_BACKUP_ASSIGNMENTS.map((b) => (
                    <tr key={b.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        {b.primaryStaffName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-2xs font-semibold text-ink-2">
                          {b.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-warning">
                        {b.backupStaffName}
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-2">
                        <div><strong className="text-ink">{b.reason}</strong></div>
                        {b.notes && <div className="text-ink-3 text-2xs mt-0.5 leading-relaxed">{b.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                          b.isActive
                            ? 'bg-positive-soft text-positive border border-line'
                            : 'bg-sunken text-ink-3 border border-line'
                        }`}>
                          {b.isActive ? 'Đang kích hoạt' : 'Chờ sẵn sàng'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-2xs text-ink-3">
                        {b.startDate} → {b.endDate || 'Vô thời hạn'}
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
      {/* MODAL 1: GIAO VIỆC TRỰC TIẾP CHO NHÂN SỰ                                   */}
      {/* ========================================================================= */}
      <Modal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Giao việc trực tiếp cho nhân sự"
        size="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-ink-2 block mb-1">
              1. Chuyên viên nhận việc
            </label>
            <select
              value={newTaskState.targetStaff}
              onChange={(e) => setNewTaskState(prev => ({ ...prev, targetStaff: e.target.value }))}
              className="w-full text-xs font-medium px-3 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20"
            >
              <optgroup label="28 Nhân sự nòng cốt B2C">
                {b2cStorePicOptions.map(s => {
                  const w = staffWorkloadMap.get(s.name);
                  return (
                    <option key={s.id} value={s.name}>
                      {s.name}
                      {w
                        ? ` (${w.level} · ${w.liveAssignedStoresCount} gian · Tải ${w.loadPct}%${
                            !w.meetsHardRatio && !w.hasException ? ' · Thiếu việc khó' : ''
                          })`
                        : ` (${s.roleTitle})`}
                    </option>
                  );
                })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                2. Hạng mục công việc SOW (Bảng 1)
              </label>
              <select
                value={newTaskState.sowStt}
                onChange={(e) => {
                  const nextStt = Number(e.target.value);
                  const found = sowPolicies.find(sp => sp.stt === nextStt);
                  setNewTaskState(prev => ({
                    ...prev,
                    sowStt: nextStt,
                    difficultyTier: found?.defaultDifficultyTier || prev.difficultyTier,
                  }));
                }}
                className="w-full text-xs font-medium px-3 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20"
              >
                {sowPolicies.map(sp => (
                  <option key={sp.stt} value={sp.stt}>
                    #{sp.stt} [{sp.group}] {sp.name} ({sp.basePoint}đ)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                3. Độ khó (Bảng 3) & Số lượng
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={newTaskState.difficultyTier}
                  onChange={(e) =>
                    setNewTaskState(prev => ({
                      ...prev,
                      difficultyTier: e.target.value as 'EASY' | 'STANDARD' | 'HARD',
                    }))
                  }
                  className="flex-1 text-xs font-medium px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  <option value="HARD">Khó (×1,20)</option>
                  <option value="STANDARD">Tiêu chuẩn (×1,00)</option>
                  <option value="EASY">Dễ (×0,80)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newTaskState.quantity}
                  onChange={(e) =>
                    setNewTaskState(prev => ({
                      ...prev,
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-16 text-xs font-mono px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink text-right"
                  title="Số lượng đầu việc"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                4. Nhãn hàng liên quan
              </label>
              <select
                value={newTaskState.brand}
                onChange={(e) => setNewTaskState(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full text-xs font-medium px-3 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20"
              >
                {brands.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                5. Mức độ ưu tiên
              </label>
              <select
                value={newTaskState.urgency}
                onChange={(e) => setNewTaskState(prev => ({ ...prev, urgency: e.target.value as typeof prev.urgency }))}
                className="w-full text-xs font-medium px-3 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20"
              >
                <option value="critical">Khẩn cấp (SLA gấp)</option>
                <option value="warning">Cảnh báo (cần chú ý)</option>
                <option value="normal">Bình thường</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-ink-2 block mb-1">
              6. Tiêu đề công việc / nhiệm vụ (để trống sẽ tự lấy theo Bảng 1)
            </label>
            <input
              type="text"
              placeholder="VD: Rà soát lại danh sách KOC Micro tuần W42..."
              value={newTaskState.title}
              onChange={(e) => setNewTaskState(prev => ({ ...prev, title: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink placeholder-slate-400 focus:outline-none focus:border-accent/20 shadow-2xs"
            />
          </div>

          <div>
            <label className="font-semibold text-ink-2 block mb-1">
              5. Chỉ đạo chi tiết của trưởng phòng
            </label>
            <textarea
              rows={3}
              placeholder="Yêu cầu cụ thể: Ưu tiên chọn các KOC đã từng có video viral..."
              value={newTaskState.description}
              onChange={(e) => setNewTaskState(prev => ({ ...prev, description: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink placeholder-slate-400 focus:outline-none focus:border-accent/20 shadow-2xs"
            />
          </div>

          <div>
            <label className="font-semibold text-ink-2 block mb-1">
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
                      ? 'bg-accent text-white border-accent/20'
                      : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                  }`}
                >
                  {hrs}h
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-line bg-white hover:bg-sunken text-ink-2 font-semibold transition"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-accent hover:bg-accent text-white font-semibold transition shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Giao Việc Ngay</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM / CHỈNH SỬA PHÂN BỔ NHÃN HÀNG (MASTER DATA INTEGRATED)       */}
      {/* ========================================================================= */}
      <Modal
        open={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={editingBrand ? `Chỉnh sửa phân bổ nhãn hàng: ${editingBrand.name}` : 'Thêm nhãn hàng vào phân bổ & điều phối PIC'}
        size="lg"
      >
        <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
          {!editingBrand && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-1 bg-sunken rounded-xl">
                <button
                  type="button"
                  onClick={() => setBrandAddMode('FROM_MASTER')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    brandAddMode === 'FROM_MASTER'
                      ? 'bg-white text-accent shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Chọn từ Master Data ({UPBASE_BRANDS_MASTER.length} Brands)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrandAddMode('CUSTOM')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    brandAddMode === 'CUSTOM'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo mới ngoài danh mục</span>
                </button>
              </div>

              {brandAddMode === 'FROM_MASTER' && (
                <div className="space-y-2.5 bg-canvas p-3.5 rounded-xl border border-line">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7 relative">
                      <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm theo tên nhãn hàng, mã brand, công ty..."
                        value={masterBrandSearch}
                        onChange={(e) => setMasterBrandSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-line rounded-lg text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/20 shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <select
                        value={masterBrandCategoryFilter}
                        onChange={(e) => setMasterBrandCategoryFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs text-ink-2 focus:outline-none focus:border-accent/20 shadow-2xs"
                      >
                        <option value="ALL">Tất cả ngành hàng ({masterCategories.length})</option>
                        {masterCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-2xs text-ink-3 px-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideAllocatedMasterBrands}
                        onChange={(e) => setHideAllocatedMasterBrands(e.target.checked)}
                        className="rounded border-line-strong text-accent focus:ring-0"
                      />
                      <span>Ẩn nhãn hàng đã phân bổ ({brands.length} đã có)</span>
                    </label>
                    <span>Tìm thấy {filteredMasterBrands.length} thương hiệu Master Data</span>
                  </div>

                  {selectedMasterBrand ? (
                    <div className="p-3 bg-canvas border border-accent/20 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent text-white font-semibold flex items-center justify-center shrink-0 text-xs shadow-xs">
                          {selectedMasterBrand.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-ink text-xs">{selectedMasterBrand.name}</span>
                            <span className="px-1.5 py-0.5 rounded font-mono text-2xs font-semibold text-accent bg-accent-soft">
                              {selectedMasterBrand.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-2xs font-medium text-ink-2 bg-sunken">
                              {selectedMasterBrand.category}
                            </span>
                          </div>
                          <p className="text-ink-2 text-2xs mt-0.5">
                            Pháp nhân: <strong className="text-ink">{selectedMasterBrand.companyName}</strong> • {selectedMasterBrand.stores?.length || 0} gian hàng liên kết
                          </p>
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
                        className="text-2xs font-semibold text-accent px-2 py-1 rounded bg-white border border-accent/20 hover:bg-accent-soft transition shrink-0"
                      >
                        Đổi nhãn hàng khác
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto divide-y divide-line border border-line rounded-xl bg-white shadow-2xs flex flex-col">
                      {filteredMasterBrands.length === 0 ? (
                        <div className="p-4 text-center text-ink-3 text-2xs">
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
                              className={`w-full p-2.5 text-left flex items-center justify-between gap-3 hover:bg-accent-soft transition group shrink-0 ${
                                isAllocated ? 'opacity-60 bg-canvas' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-lg bg-sunken text-ink-2 font-semibold flex items-center justify-center shrink-0 text-2xs group-hover:bg-accent group-hover:text-white transition">
                                  {master.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-ink group-hover:text-accent truncate">
                                      {master.name}
                                    </span>
                                    <span className="text-2xs font-mono text-ink-3">
                                      {master.code}
                                    </span>
                                  </div>
                                  <div className="text-ink-3 text-2xs truncate">
                                    {master.companyName} • {master.category}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isAllocated ? (
                                  <span className="text-2xs font-semibold text-ink-2">
                                    Đã phân bổ
                                  </span>
                                ) : (
                                  <span className="text-2xs font-semibold text-accent flex items-center gap-1">
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
                <div className="p-3 bg-warning-soft border border-warning/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-warning font-semibold text-2xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Chỉ nhập tay khi nhãn hàng đối tác mới ký chưa kịp đồng bộ vào Master Data</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-ink-2 block mb-1">Tên thương hiệu *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Clio Cosmetics..."
                        value={brandFormState.name}
                        onChange={(e) => setBrandFormState(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-ink-2 block mb-1">Công ty chủ quản</label>
                      <input
                        type="text"
                        placeholder="VD: Công ty TNHH Mỹ phẩm Clio VN..."
                        value={brandFormState.companyName}
                        onChange={(e) => setBrandFormState(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {editingBrand && (
            <div className="p-3.5 bg-canvas border border-line rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink text-sm">{editingBrand.name}</span>
                  <span className="px-1.5 py-0.5 rounded font-mono text-2xs font-semibold text-accent bg-accent-soft">
                    {editingBrand.code}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-2xs font-medium text-ink-2 bg-sunken">
                    {editingBrand.category}
                  </span>
                </div>
              </div>
              <span className="text-2xs font-semibold text-positive px-2 py-0.5 rounded border border-positive/20 bg-positive-soft">
                Đang vận hành
              </span>
            </div>
          )}

          {(editingBrand || brandAddMode === 'CUSTOM') && (
            <div>
              <label className="font-semibold text-ink-2 block mb-1">Ngành hàng</label>
              <select
                value={brandFormState.category}
                onChange={(e) => setBrandFormState(prev => ({ ...prev, category: e.target.value }))}
                className="w-full text-xs px-3 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
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

          <div className="pt-2 border-t border-line space-y-3">
            <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-ink">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>Phân bổ 3 vị trí gắn theo Brand & đầu mối phối hợp</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-warning-soft border border-warning/20">
              <div>
                <label className="font-semibold text-ink block mb-1 text-2xs">
                  Content / Brand main
                </label>
                <select
                  value={brandFormState.contentBrandMainPic}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, contentBrandMainPic: e.target.value }))}
                  className="w-full text-xs font-medium px-2.5 py-2 bg-white border border-warning/20 rounded-lg text-ink focus:outline-none focus:border-accent/20 shadow-2xs"
                >
                  {brandPositionCandidateNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1 text-2xs">
                  Plan / Strategy
                </label>
                <select
                  value={brandFormState.planStrategyPic}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, planStrategyPic: e.target.value }))}
                  className="w-full text-xs font-medium px-2.5 py-2 bg-white border border-accent/20 rounded-lg text-ink focus:outline-none focus:border-accent/20 shadow-2xs"
                >
                  {brandPositionCandidateNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1 text-2xs">
                  Key Visual / SIS
                </label>
                <select
                  value={brandFormState.keyVisualSisPic}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, keyVisualSisPic: e.target.value }))}
                  className="w-full text-xs font-medium px-2.5 py-2 bg-white border border-accent/20 rounded-lg text-ink focus:outline-none focus:border-accent/20 shadow-2xs"
                >
                  {brandPositionCandidateNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="font-semibold text-ink-2 block mb-1">Brand Lead / Duyệt B2C</label>
                <select
                  value={brandFormState.bookingPicLead}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, bookingPicLead: e.target.value }))}
                  className="w-full text-xs font-semibold px-2.5 py-2 bg-accent-soft border border-accent/20 rounded-lg text-accent focus:outline-none focus:border-accent/20 shadow-2xs"
                >
                  <option value="Đặng Thị Yến Nhi">Đặng Thị Yến Nhi (Giám đốc MKT B2C)</option>
                  {b2cStorePicOptions.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.roleTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-2 block mb-1">Account PIC (Đầu mối Brand)</label>
                <select
                  value={brandFormState.accountPic}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, accountPic: e.target.value }))}
                  className="w-full text-xs px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {staffList.filter(s => s.role === 'ACCOUNT' || s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.roleTitle})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-2 block mb-1">Growth PIC (Tối ưu GMV/Ads)</label>
                <select
                  value={brandFormState.growthPic}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, growthPic: e.target.value }))}
                  className="w-full text-xs px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {staffList.filter(s => s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.roleTitle})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-ink-2">Ngân sách tháng (VNĐ)</label>
                  <span className="text-2xs font-semibold text-accent font-mono">
                    {formatVndShort(brandFormState.planBudget || 0)}
                  </span>
                </div>
                <input
                  type="number"
                  step="5000000"
                  value={brandFormState.planBudget}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, planBudget: Number(e.target.value) || 0 }))}
                  className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink font-mono font-semibold focus:outline-none focus:border-accent/20 shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-ink-2">Target GMV (VNĐ)</label>
                  <span className="text-2xs font-semibold text-positive font-mono">
                    {formatVndShort(brandFormState.targetGmv || 0)}
                  </span>
                </div>
                <input
                  type="number"
                  step="10000000"
                  value={brandFormState.targetGmv}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, targetGmv: Number(e.target.value) || 0 }))}
                  className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink font-mono font-semibold focus:outline-none focus:border-accent/20 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                Hướng dẫn & Guidelines nội dung riêng cho KOC
              </label>
              <textarea
                rows={2}
                value={brandFormState.brandGuideline}
                onChange={(e) => setBrandFormState(prev => ({ ...prev, brandGuideline: e.target.value }))}
                placeholder="Quy định sản phẩm mẫu, điều khoản cấm kỵ, từ khóa bắt buộc khi KOC lên video..."
                className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/20 shadow-2xs resize-none"
              />
            </div>
          </div>

          <div className="pt-3.5 border-t border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBrandModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-line bg-white hover:bg-sunken text-ink-2 font-semibold transition"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!brandFormState.name.trim()}
              className={`px-5 py-2 rounded-lg text-white font-semibold transition shadow-xs flex items-center gap-1.5 ${
                brandFormState.name.trim()
                  ? 'bg-accent hover:bg-accent cursor-pointer'
                  : 'bg-sunken cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingBrand ? 'Lưu cập nhật phân công' : 'Xác nhận phân bổ nhãn hàng'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CHỈNH SỬA PHÂN CÔNG GIAN HÀNG                                   */}
      {/* ========================================================================= */}
      <Modal
        open={!!editingStore}
        onClose={() => setEditingStore(null)}
        title={editingStore ? `Phân công gian hàng · ${editingStore.storeName}` : 'Phân công gian hàng'}
        size="md"
      >
        {editingStore && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                Chọn nhân sự B2C phụ trách
              </label>
              <select
                value={(editingStore.b2cOwners && editingStore.b2cOwners[0]) || editingStore.b2cOwnerName || 'Nguyễn Thị Ngọc Tâm'}
                onChange={(e) => {
                  handleSaveStoreAssignment(editingStore.id, [e.target.value], editingStore.assignmentNotes || '');
                }}
                className="w-full text-xs font-semibold px-3 py-2 bg-accent-soft border border-accent/20 rounded-lg text-accent focus:outline-none"
              >
                {b2cStorePicOptions.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.roleTitle})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-canvas border border-line rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink text-xs block">Thuộc diện B2C làm Kế hoạch tháng</span>
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
                className="w-4 h-4 rounded text-accent focus:ring-accent/20 cursor-pointer"
              />
            </div>

            <div>
              <label className="font-semibold text-ink-2 block mb-1">
                Chỉ đạo & yêu cầu riêng của trưởng phòng
              </label>
              <textarea
                rows={3}
                defaultValue={editingStore.assignmentNotes || ''}
                id="store-notes-input"
                placeholder="Yêu cầu tập trung: Tăng cường book KOC KL3-KL5, đẩy mạnh livestream..."
                className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink placeholder-slate-400 focus:outline-none focus:border-accent/20 shadow-2xs"
              />
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="px-4 py-2 rounded-lg border border-line bg-white hover:bg-sunken text-ink-2 font-semibold transition"
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
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent text-white font-semibold transition shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
