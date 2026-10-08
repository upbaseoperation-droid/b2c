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
  GitFork
} from 'lucide-react';
import { 
  UserProfile, 
  BrandDetail, 
  StorePortfolioItem, 
  StaffMasterMember, 
  SlaTask,
  UserRole
} from '../../lib/types';
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
      const newBrand: BrandDetail = {
        id: `brand-${Date.now()}`,
        code: `BRAND_${brandFormState.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: brandFormState.name,
        companyName: brandFormState.companyName || 'Công ty Đối tác',
        category: brandFormState.category,
        color: 'bg-blue-600 ',
        status: 'ACTIVE',
        planBudget: brandFormState.planBudget,
        spentBudget: 0,
        targetGmv: brandFormState.targetGmv,
        currentGmv: 0,
        targetVideos: 100,
        airedVideos: 0,
        bookingPicLead: brandFormState.bookingPicLead,
        accountPic: brandFormState.accountPic,
        growthPic: brandFormState.growthPic,
        brandGuideline: brandFormState.brandGuideline || 'Quy định nội dung thương hiệu...',
        kocCriteria: 'Phù hợp định vị nhãn hàng',
        stores: [],
        heroProducts: []
      };
      onAddBrand(newBrand);
      notify(`Đã thêm nhãn hàng mới ${newBrand.name} và phân bổ PIC Lead ${newBrand.bookingPicLead}!`);
    }

    setIsBrandModalOpen(false);
    setEditingBrand(null);
  };

  // Open Edit Brand modal
  const handleOpenEditBrand = (brand: BrandDetail) => {
    setEditingBrand(brand);
    setBrandFormState({
      name: brand.name,
      companyName: brand.companyName,
      category: brand.category,
      planBudget: brand.planBudget,
      targetGmv: brand.targetGmv,
      bookingPicLead: brand.bookingPicLead || 'Đặng Mai Hà Linh',
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
              setBrandFormState({
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
      {/* MODAL 2: THÊM / CHỈNH SỬA PHÂN BỔ NHÃN HÀNG                               */}
      {/* ========================================================================= */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-semibold">
                    {editingBrand ? `Chỉnh Sửa Phân Bổ Nhãn Hàng: ${editingBrand.name}` : 'Thêm Nhãn Hàng Mới & Phân Bổ PIC'}
                  </h3>
                  <p className="text-2xs text-slate-400">Trưởng phòng thiết lập Brand PIC, Account PIC và ngân sách trần</p>
                </div>
              </div>
              <button
                onClick={() => setIsBrandModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên thương hiệu
                  </label>
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
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ngành hàng
                  </label>
                  <select
                    value={brandFormState.category}
                    onChange={(e) => setBrandFormState(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                  >
                    <option value="Mỹ phẩm & Chăm sóc da">Mỹ phẩm & Chăm sóc da</option>
                    <option value="Dược mỹ phẩm">Dược mỹ phẩm</option>
                    <option value="Mẹ & Bé / Sữa">Mẹ & Bé / Sữa</option>
                    <option value="Gia dụng & Tiêu dùng">Gia dụng & Tiêu dùng</option>
                    <option value="F&B / Đồ uống">F&B / Đồ uống</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Brand PIC Lead (Chịu trách nhiệm chính)
                </label>
                <select
                  value={brandFormState.bookingPicLead}
                  onChange={(e) => setBrandFormState(prev => ({ ...prev, bookingPicLead: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 focus:outline-none focus:border-blue-500"
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
                    Account PIC
                  </label>
                  <select
                    value={brandFormState.accountPic}
                    onChange={(e) => setBrandFormState(prev => ({ ...prev, accountPic: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                  >
                    {staffList.filter(s => s.role === 'ACCOUNT' || s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Growth PIC
                  </label>
                  <select
                    value={brandFormState.growthPic}
                    onChange={(e) => setBrandFormState(prev => ({ ...prev, growthPic: e.target.value }))}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                  >
                    {staffList.filter(s => s.role === 'GROWTH' || s.role === 'MANAGER').map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ngân sách (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="5000000"
                    value={brandFormState.planBudget}
                    onChange={(e) => setBrandFormState(prev => ({ ...prev, planBudget: Number(e.target.value) || 0 }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Target GMV (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="10000000"
                    value={brandFormState.targetGmv}
                    onChange={(e) => setBrandFormState(prev => ({ ...prev, targetGmv: Number(e.target.value) || 0 }))}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

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
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu phân công Brand</span>
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
