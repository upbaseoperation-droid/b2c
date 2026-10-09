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
  Zap,
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
  UserRole
} from '../../lib/types';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import { MasterDataMindmapView } from './MasterDataMindmapView';
import { Avatar, Button, Segmented, Status , ChannelTag } from '../ui';
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
  // Active Section Tab
  const [activeSection, setActiveSection] = useState<'BRANDS' | 'STORES' | 'STAFF' | 'TASKS' | 'MINDMAP'>('BRANDS');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');

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
    bookingPicLead: 'Đặng Mai Hà Linh',
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
      bookingPicLead: master.bookingPicLead || staffList[0]?.name || 'Đặng Mai Hà Linh',
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
      bookingPicLead: brand.bookingPicLead || staffList[0]?.name || 'Đặng Mai Hà Linh',
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

  // Auto Rebalance Staff Stores Capacity
  const handleAutoRebalance = () => {
    let rebalancedCount = 0;
    const availableStaff = staffList.filter(s => s.role === 'BOOKING');
    
    storePortfolios.forEach((store, index) => {
      // If store has no assigned owner or assigned to an overloaded staff
      const currentOwners = store.b2cOwners || [store.b2cOwnerName];
      const primaryStaff = staffList.find(s => s.name === currentOwners[0]);
      
      const currentLoad = storePortfolios.filter(s => 
        (s.b2cOwners && s.b2cOwners.includes(primaryStaff?.name || '')) || s.b2cOwnerName === primaryStaff?.name
      ).length;

      if (!primaryStaff || currentLoad > (primaryStaff.maxStoresCapacity || 3)) {
        // Find staff with least load
        const leastLoadedStaff = availableStaff.reduce((min, s) => {
          const sLoad = storePortfolios.filter(st => 
            (st.b2cOwners && st.b2cOwners.includes(s.name)) || st.b2cOwnerName === s.name
          ).length;
          const minLoad = storePortfolios.filter(st => 
            (st.b2cOwners && st.b2cOwners.includes(min.name)) || st.b2cOwnerName === min.name
          ).length;
          return sLoad < minLoad ? s : min;
        }, availableStaff[0]);

        if (leastLoadedStaff) {
          onUpdateStore({
            ...store,
            b2cOwners: [leastLoadedStaff.name],
            b2cOwnerName: leastLoadedStaff.name,
            assignmentNotes: `[Cân bằng tải tự động bởi Trưởng phòng ${currentUser.name}]: Đảm bảo trần năng lực 3 shop/người`
          });
          rebalancedCount++;
        }
      }
    });

    notify(`Đã tự động cân bằng tải thành công cho ${rebalancedCount} gian hàng trên toàn phòng!`);
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
            { key: 'STORES', label: `Gian hàng · ${storePortfolios.length}` },
            { key: 'STAFF', label: `Tải nhân sự · ${staffList.length}` },
            { key: 'TASKS', label: `Giao việc · ${tasks.length}` },
            { key: 'MINDMAP', label: 'Sơ đồ dữ liệu' },
          ]}
        />
        <div className="flex items-center gap-2">
          {activeSection === 'STAFF' && (
            <Button icon={Zap} onClick={handleAutoRebalance} title="Phân bổ lại gian hàng để không ai bị quá tải">
              Cân bằng tải
            </Button>
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
                bookingPicLead: staffList[0]?.name || 'Đặng Mai Hà Linh',
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
                  const brandStoresCount = storePortfolios.filter(s => s.brandName.toLowerCase().includes(brand.name.toLowerCase())).length;

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
                        <div className="flex items-center gap-2"><Avatar name={brand.bookingPicLead || 'Đặng Mai Hà Linh' || '?'} size={22} /><select
                          value={brand.bookingPicLead || 'Đặng Mai Hà Linh'}
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
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" />
                Danh sách gian hàng & chuyên viên tác nghiệp
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Phân bổ chuyên viên Booking / B2C Ops phụ trách từng gian hàng TikTok Shop, Shopee Mall, Lazada
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                  <th className="py-3 px-4 min-w-[220px]">Nhân sự B2C Ops phụ trách</th>
                  <th className="py-3 px-3">Account Owner</th>
                  <th className="py-3 px-3 text-right">Target GMV</th>
                  <th className="py-3 px-4 min-w-[200px]">Chỉ đạo riêng của trưởng phòng</th>
                  <th className="py-3 px-3 text-center w-24">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storePortfolios
                  .filter(store => {
                    if (selectedStaffFilter === 'ALL') return true;
                    return (store.b2cOwners && store.b2cOwners.includes(selectedStaffFilter)) || store.b2cOwnerName.includes(selectedStaffFilter);
                  })
                  .map((store) => {
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
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SECTION 3: CÂN BẰNG TẢI NHÂN SỰ TOÀN PHÒNG (STAFF CAPACITY)             */}
      {/* ========================================================================= */}
      {activeSection === 'STAFF' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {staffList.map((staff) => {
              const assignedStores = storePortfolios.filter(st => 
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
                        staff.role === 'BOOKING' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        staff.role === 'CONTENT' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
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
                        className={`h-full rounded-full transition-all ${
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
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold">Giao việc trực tiếp cho nhân sự</h3>
                  <p className="text-2xs text-slate-400">Trưởng phòng phân công nhiệm vụ và hạn định SLA</p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
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
                  {staffList.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.roleTitle} - {s.team})
                    </option>
                  ))}
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

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM / CHỈNH SỬA PHÂN BỔ NHÃN HÀNG (MASTER DATA INTEGRATED)       */}
      {/* ========================================================================= */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    {editingBrand ? `Chỉnh Sửa Phân Bổ Nhãn Hàng: ${editingBrand.name}` : 'Thêm Nhãn Hàng Vào Phân Bổ & Điều Phối PIC'}
                  </h3>
                  <p className="text-2xs text-slate-400">
                    {editingBrand 
                      ? 'Trưởng phòng điều chỉnh Brand PIC Lead, Account PIC và ngân sách trần'
                      : `Lựa chọn từ Master Data doanh nghiệp (${UPBASE_BRANDS_MASTER.length} thương hiệu chuẩn) để phân bổ vận hành`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBrandModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
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
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                              {selectedMasterBrand.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">{selectedMasterBrand.name}</span>
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
                              setBrandFormState(prev => ({ ...prev, name: '' }));
                            }}
                            className="text-2xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-white border border-blue-200 hover:bg-blue-50 transition shrink-0"
                          >
                            Đổi nhãn hàng khác
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-2xs">
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
                                  className={`w-full p-2.5 text-left flex items-center justify-between gap-2 hover:bg-blue-50/70 transition group ${
                                    isAllocated ? 'opacity-60 bg-slate-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center justify-center shrink-0 text-2xs group-hover:bg-blue-600 group-hover:text-white transition">
                                      {master.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
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
                      <span className="font-bold text-slate-900 text-sm">{editingBrand.name}</span>
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

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
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

      {/* ========================================================================= */}
      {/* MODAL 3: CHỈNH SỬA PHÂN CÔNG GIAN HÀNG                                   */}
      {/* ========================================================================= */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold">Phân công gian hàng</h3>
                  <p className="text-2xs text-slate-400">{editingStore.storeName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
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
    </div>
  );
};
