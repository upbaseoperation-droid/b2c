'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Coins,
  Film,
  Store,
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  SalaryGrade,
  UserProfile,
  UserRole,
  StorePortfolioItem,
  KocItem,
  BookingDealItem,
  KocListingItem,
} from '../../lib/types';
import {
  StoreAirPlan,
  StoreAirPlanKlDetail,
  STANDARD_KL_LIST,
  BENCHMARK_KL_UNIT_COST,
  loadStoreAirPlans,
  upsertStoreAirPlan,
  deleteStoreAirPlan,
  computeAirBookingComparisonReport,
  STORE_AIR_PLAN_UPDATED_EVENT,
} from '../../lib/storeAirPlanData';
import {
  ApprovedBookingListItem,
  loadApprovedBookingList,
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
} from '../../lib/approvedBookingList';
import { Button, ConfirmDialog, Modal, PageActions, Segmented } from '../ui';

interface AirBookingReportHubViewProps {
  currentUser: UserProfile;
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  kocListings?: KocListingItem[];
  onNavigateToTab?: (tabKey: string, context?: Record<string, unknown>) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const AirBookingReportHubView: React.FC<AirBookingReportHubViewProps> = ({
  currentUser,
  stores = [],
  kocs = [],
  deals = [],
  kocListings = [],
  onNotify,
}) => {
  // 1. Phân quyền: Kiểm tra vai trò Quản lý hay Chuyên viên
  const isManager = useMemo(() => {
    const managerRoles: UserRole[] = [
      'ADMIN',
      'MANAGER',
      'LEADER',
      'GROWTH_MANAGER',
      'MEDIA_MANAGER',
      'FINANCE',
    ];
    return managerRoles.includes(currentUser.role);
  }, [currentUser.role]);

  // 2. State dữ liệu
  const [plans, setPlans] = useState<StoreAirPlan[]>(() => loadStoreAirPlans());
  const [approvedBookings, setApprovedBookings] = useState<ApprovedBookingListItem[]>(() =>
    loadApprovedBookingList(kocs, stores, deals, currentUser.name)
  );

  // 3. Tab chuyển đổi: Báo cáo đối soát vs Thiết lập kế hoạch gian hàng
  const [activeSubTab, setActiveSubTab] = useState<'REPORT' | 'PLAN_STUDIO'>('REPORT');

  // 4. State Bộ lọc
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  // Nếu là Specialist thì mặc định chọn chính mình
  const [selectedPic, setSelectedPic] = useState<string>(() => (isManager ? '' : currentUser.name));
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedBrand] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERBUDGET' | 'LATE_AIR' | 'NO_PLAN'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 5. State Modal thêm/sửa Kế hoạch
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<StoreAirPlan | null>(null);
  const [pendingDeletePlan, setPendingDeletePlan] = useState<{
    id: string;
    storeName: string;
  } | null>(null);
  const [planFormData, setPlanFormData] = useState<{
    id: string;
    monthKey: string;
    storeName: string;
    brandName: string;
    picName: string;
    leaderName: string;
    targetNmv: number;
    targetBudget: number;
    targetVideos: number;
    notes: string;
    klDetails: StoreAirPlanKlDetail[];
  }>({
    id: '',
    monthKey: '2026/10',
    storeName: '',
    brandName: '',
    picName: currentUser.name,
    leaderName: '',
    targetNmv: 300000000,
    targetBudget: 50000000,
    targetVideos: 25,
    notes: '',
    klDetails: STANDARD_KL_LIST.map((kl) => ({
      kl,
      targetVideos: 0,
      unitCost: BENCHMARK_KL_UNIT_COST[kl] || 0,
      allocatedBudget: 0,
      targetNmv: 0,
    })),
  });

  // 6. State Modal Xem chi tiết danh sách Video của một Gian hàng
  const [detailStoreName, setDetailStoreName] = useState<string | null>(null);

  // Lắng nghe cập nhật từ LocalStorage & CustomEvents
  useEffect(() => {
    const handlePlanUpdate = () => {
      setPlans(loadStoreAirPlans());
    };
    const handleBookingUpdate = () => {
      setApprovedBookings(loadApprovedBookingList(kocs, stores, deals, currentUser.name));
    };

    window.addEventListener(STORE_AIR_PLAN_UPDATED_EVENT, handlePlanUpdate);
    window.addEventListener(APPROVED_BOOKING_LIST_UPDATED_EVENT, handleBookingUpdate);

    return () => {
      window.removeEventListener(STORE_AIR_PLAN_UPDATED_EVENT, handlePlanUpdate);
      window.removeEventListener(APPROVED_BOOKING_LIST_UPDATED_EVENT, handleBookingUpdate);
    };
  }, [kocs, stores, deals, currentUser.name]);

  // Danh sách các tháng có dữ liệu
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    plans.forEach((p) => months.add(p.monthKey));
    approvedBookings.forEach((b) => {
      if (b.thangPlan) months.add(b.thangPlan);
    });
    if (!months.has('2026/10')) months.add('2026/10');
    if (!months.has('2026/11')) months.add('2026/11');
    return Array.from(months).sort();
  }, [plans, approvedBookings]);

  // Danh sách Specialist / PIC thực tế
  const availablePics = useMemo(() => {
    const pics = new Set<string>();
    plans.forEach((p) => {
      if (p.picName) pics.add(p.picName);
    });
    approvedBookings.forEach((b) => {
      if (b.nguoiPhuTrach) pics.add(b.nguoiPhuTrach);
    });
    // Nhân sự B2C chuẩn
    const b2cStaff = [
      'Lê Phương Thảo',
      'Lương Thị Như Quỳnh',
      'Lê Thanh Hải',
      'Phạm Thị Thu Hằng',
      'Hoàng Hải Long',
      'Trần Hải Phượng',
      'Phan Diệu Ánh',
      'Vũ Hoài Lâm',
      'Nguyễn Thị Mai Anh',
    ];
    b2cStaff.forEach((s) => pics.add(s));
    return Array.from(pics).sort();
  }, [plans, approvedBookings]);

  // Danh sách Gian hàng thực tế
  const availableStores = useMemo(() => {
    const storeMap = new Map<string, { storeName: string; brandName: string }>();
    stores.forEach((s) => {
      storeMap.set(s.storeName, { storeName: s.storeName, brandName: s.brandName });
    });
    plans.forEach((p) => {
      if (!storeMap.has(p.storeName)) {
        storeMap.set(p.storeName, { storeName: p.storeName, brandName: p.brandName });
      }
    });
    approvedBookings.forEach((b) => {
      if (b.storeName && !storeMap.has(b.storeName)) {
        storeMap.set(b.storeName, { storeName: b.storeName, brandName: b.brandName });
      }
    });
    return Array.from(storeMap.values()).sort((a, b) => a.storeName.localeCompare(b.storeName));
  }, [stores, plans, approvedBookings]);

  // Tính toán Báo cáo Đối soát Tổng hợp
  const reportSummary = useMemo(() => {
    return computeAirBookingComparisonReport({
      plans,
      approvedBookings,
      kocListings,
      selectedMonth,
      selectedPic: selectedPic || undefined,
      selectedStore: selectedStore || undefined,
      selectedBrand: selectedBrand || undefined,
    });
  }, [plans, approvedBookings, kocListings, selectedMonth, selectedPic, selectedStore, selectedBrand]);

  // Lọc danh sách Gian hàng theo ô tìm kiếm và trạng thái cảnh báo
  const filteredStoreReports = useMemo(() => {
    return reportSummary.storeReports.filter((item) => {
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchName = item.storeName.toLowerCase().includes(kw);
        const matchBrand = item.brandName.toLowerCase().includes(kw);
        const matchPic = item.picName.toLowerCase().includes(kw);
        if (!matchName && !matchBrand && !matchPic) return false;
      }

      if (statusFilter === 'OVERBUDGET') {
        return item.spendStatus === 'VƯỢT_NGÂN_SÁCH';
      }
      if (statusFilter === 'LATE_AIR') {
        return item.actualAiredLate > 0 || item.airStatus === 'CHẬM_TIẾN_ĐỘ';
      }
      if (statusFilter === 'NO_PLAN') {
        return !item.hasPlan;
      }
      return true;
    });
  }, [reportSummary.storeReports, searchKeyword, statusFilter]);

  // Danh sách các booking đang trễ hoặc sắp đến hạn air (Air Alert)
  const pendingAirBookings = useMemo(() => {
    return approvedBookings.filter((b) => {
      if (selectedMonth && b.thangPlan && b.thangPlan !== selectedMonth) return false;
      if (selectedPic && b.nguoiPhuTrach.toLowerCase() !== selectedPic.toLowerCase()) return false;
      if (selectedStore && b.storeName.toLowerCase() !== selectedStore.toLowerCase()) return false;

      const isAired = Boolean(b.actualAirDate || b.linkAir || b.videoId);
      const isLate = b.trangThaiSlaAir && b.trangThaiSlaAir.includes('Trễ');
      return !isAired || isLate;
    });
  }, [approvedBookings, selectedMonth, selectedPic, selectedStore]);

  // Danh sách video chi tiết của gian hàng đang được chọn trong Modal
  const detailStoreBookings = useMemo(() => {
    if (!detailStoreName) return [];
    return approvedBookings.filter(
      (b) =>
        b.storeName?.toLowerCase() === detailStoreName.toLowerCase() &&
        (!selectedMonth || b.thangPlan === selectedMonth)
    );
  }, [detailStoreName, approvedBookings, selectedMonth]);

  // Xử lý mở modal tạo Kế hoạch mới
  const handleOpenCreatePlan = () => {
    const newId = `SAP-${selectedMonth.replace('/', '')}-${Date.now().toString().slice(-4)}`;
    setEditingPlan(null);
    setPlanFormData({
      id: newId,
      monthKey: selectedMonth,
      storeName: availableStores[0]?.storeName || '',
      brandName: availableStores[0]?.brandName || '',
      picName: isManager ? availablePics[0] || currentUser.name : currentUser.name,
      leaderName: 'Nguyễn Thị Ngọc Tâm',
      targetNmv: 300000000,
      targetBudget: 50000000,
      targetVideos: 20,
      notes: '',
      klDetails: STANDARD_KL_LIST.map((kl) => ({
        kl,
        targetVideos: 0,
        unitCost: BENCHMARK_KL_UNIT_COST[kl] || 0,
        allocatedBudget: 0,
        targetNmv: 0,
      })),
    });
    setIsPlanModalOpen(true);
  };

  // Xử lý mở modal chỉnh sửa Kế hoạch
  const handleOpenEditPlan = (plan: StoreAirPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      id: plan.id,
      monthKey: plan.monthKey,
      storeName: plan.storeName,
      brandName: plan.brandName,
      picName: plan.picName,
      leaderName: plan.leaderName || '',
      targetNmv: plan.targetNmv,
      targetBudget: plan.targetBudget,
      targetVideos: plan.targetVideos,
      notes: plan.notes || '',
      klDetails: STANDARD_KL_LIST.map((kl) => {
        const exist = plan.klDetails.find((d) => d.kl === kl);
        return (
          exist || {
            kl,
            targetVideos: 0,
            unitCost: BENCHMARK_KL_UNIT_COST[kl] || 0,
            allocatedBudget: 0,
            targetNmv: 0,
          }
        );
      }),
    });
    setIsPlanModalOpen(true);
  };

  // Cập nhật số lượng hoặc đơn giá trong bảng KL
  const handleKlDetailChange = (
    kl: SalaryGrade,
    field: 'targetVideos' | 'unitCost' | 'targetNmv',
    val: number
  ) => {
    setPlanFormData((prev) => {
      const nextKlDetails = prev.klDetails.map((item) => {
        if (item.kl === kl) {
          const updated = { ...item, [field]: Math.max(0, val) };
          updated.allocatedBudget = updated.targetVideos * updated.unitCost;
          return updated;
        }
        return item;
      });

      // Tự động tính tổng ngân sách và tổng video phân bổ
      const autoTotalBudget = nextKlDetails.reduce((sum, i) => sum + i.allocatedBudget, 0);
      const autoTotalVideos = nextKlDetails.reduce((sum, i) => sum + i.targetVideos, 0);

      return {
        ...prev,
        klDetails: nextKlDetails,
        targetBudget: autoTotalBudget > 0 ? autoTotalBudget : prev.targetBudget,
        targetVideos: autoTotalVideos > 0 ? autoTotalVideos : prev.targetVideos,
      };
    });
  };

  // Lưu Kế hoạch
  const handleSavePlan = () => {
    if (!planFormData.storeName) {
      onNotify?.('Vui lòng chọn hoặc nhập tên gian hàng.', 'warning');
      return;
    }

    const matchedStore = availableStores.find((s) => s.storeName === planFormData.storeName);
    const storeId =
      matchedStore?.storeName.toLowerCase().replace(/\s+/g, '-') ||
      planFormData.storeName.toLowerCase().replace(/\s+/g, '-');

    const newPlan: StoreAirPlan = {
      id: planFormData.id || `SAP-${planFormData.monthKey.replace('/', '')}-${Date.now().toString().slice(-4)}`,
      monthKey: planFormData.monthKey,
      storeId,
      storeName: planFormData.storeName,
      brandName: planFormData.brandName || matchedStore?.brandName || 'Thương hiệu',
      picName: planFormData.picName,
      leaderName: planFormData.leaderName || undefined,
      targetNmv: Number(planFormData.targetNmv) || 0,
      targetBudget: Number(planFormData.targetBudget) || 0,
      targetVideos: Number(planFormData.targetVideos) || 0,
      notes: planFormData.notes,
      klDetails: planFormData.klDetails,
      status: 'ACTIVE',
      createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = upsertStoreAirPlan(newPlan);
    setPlans(updated);
    setIsPlanModalOpen(false);
    onNotify?.(`Đã lưu kế hoạch gian hàng ${newPlan.storeName} (${newPlan.monthKey})`, 'success');
  };

  // Xóa Kế hoạch
  const handleDeletePlan = (planId: string, storeName: string) => {
    setPendingDeletePlan({ id: planId, storeName });
  };

  const confirmDeletePlan = () => {
    if (!pendingDeletePlan) return;
    const updated = deleteStoreAirPlan(pendingDeletePlan.id);
    setPlans(updated);
    onNotify?.(`Đã xóa kế hoạch của gian hàng ${pendingDeletePlan.storeName}`, 'info');
    setPendingDeletePlan(null);
  };

  // Xuất file CSV báo cáo
  const handleExportCsv = () => {
    const headers = [
      'Tháng',
      'Gian hàng',
      'Thương hiệu',
      'Người phụ trách',
      'Leader',
      'NMV Kế hoạch',
      'NMV Thực tế',
      'Tỷ lệ đạt NMV (%)',
      'Ngân sách Kế hoạch',
      'Chi phí Net đã book',
      'Thực tế đã thanh toán',
      'Tỷ lệ giải ngân (%)',
      'Số video Kế hoạch',
      'Số video đã book',
      'Số video đã air',
      'Tỷ lệ hoàn thành Air (%)',
      'Video air đúng hạn',
      'Video air trễ',
      'Tình trạng chi tiêu',
    ];

    const rows = reportSummary.storeReports.map((r) => [
      `"${r.monthKey}"`,
      `"${r.storeName}"`,
      `"${r.brandName}"`,
      `"${r.picName}"`,
      `"${r.leaderName || '—'}"`,
      r.planNmv,
      r.actualNmv,
      r.nmvAchievementRate.toFixed(1),
      r.planBudget,
      r.actualNetSpend,
      r.actualPaidSpend,
      r.budgetBurnRate.toFixed(1),
      r.planVideos,
      r.actualBookedVideos,
      r.actualAiredVideos,
      r.airProgressRate.toFixed(1),
      r.actualAiredOntime,
      r.actualAiredLate,
      `"${r.spendStatus}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Air_Video_Chi_Tieu_${selectedMonth.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* 1. Thanh hành động & Điều hướng Phân hệ */}
      <PageActions>
        <Segmented<'REPORT' | 'PLAN_STUDIO'>
          value={activeSubTab}
          onChange={setActiveSubTab}
          items={[
            { key: 'REPORT', label: 'Báo cáo đối soát & Air' },
            { key: 'PLAN_STUDIO', label: 'Kế hoạch Gian hàng theo KL' },
          ]}
        />

        {activeSubTab === 'PLAN_STUDIO' && (
          <Button variant="primary" size="md" icon={Plus} onClick={handleOpenCreatePlan}>
            Tạo kế hoạch gian hàng
          </Button>
        )}

        <Button
          variant="secondary"
          size="md"
          icon={Download}
          onClick={handleExportCsv}
          title="Xuất file đối soát Excel (.csv)"
        >
          Xuất file
        </Button>
      </PageActions>

      {/* 2. Thanh Bộ lọc Đa chiều */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        {/* Lọc Tháng */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Tháng:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc Nhân viên (Nếu là Chuyên viên thì cố định của mình, nếu là Quản lý thì chọn được tất cả) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Nhân sự:</span>
          {isManager ? (
            <select
              value={selectedPic}
              onChange={(e) => setSelectedPic(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Toàn bộ nhân sự ({availablePics.length})</option>
              {availablePics.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-soft border border-accent/25 text-accent rounded-lg text-xs font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>{currentUser.name} (Chuyên viên)</span>
            </div>
          )}
        </div>

        {/* Lọc Gian hàng */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Gian hàng:</span>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 max-w-[200px] truncate focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Tất cả gian hàng</option>
            {availableStores.map((s) => (
              <option key={s.storeName} value={s.storeName}>
                {s.storeName}
              </option>
            ))}
          </select>
        </div>

        {/* Ô tìm kiếm từ khóa */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo gian hàng, thương hiệu, nhân sự..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Lọc trạng thái báo động nhanh */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2 py-1 rounded-md transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-primary text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({reportSummary.storeReports.length})
          </button>
          <button
            onClick={() => setStatusFilter('OVERBUDGET')}
            className={`px-2 py-1 rounded-md transition-colors ${
              statusFilter === 'OVERBUDGET'
                ? 'bg-red-600 text-white font-semibold'
                : 'text-red-700 bg-red-50 hover:bg-red-100'
            }`}
          >
            Vượt ngân sách ({reportSummary.overbudgetStoresCount})
          </button>
          <button
            onClick={() => setStatusFilter('LATE_AIR')}
            className={`px-2 py-1 rounded-md transition-colors ${
              statusFilter === 'LATE_AIR'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            Trễ hạn air ({reportSummary.totalLateVideos})
          </button>
          <button
            onClick={() => setStatusFilter('NO_PLAN')}
            className={`px-2 py-1 rounded-md transition-colors ${
              statusFilter === 'NO_PLAN'
                ? 'bg-slate-600 text-white font-semibold'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Chưa có plan ({reportSummary.unbudgetedStoresCount})
          </button>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH: TAB BÁO CÁO ĐỐI SOÁT */}
      {activeSubTab === 'REPORT' && (
        <div className="flex flex-col gap-6">
          {/* A. 4 Card KPI Tổng Quan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Doanh số NMV */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Chỉ tiêu NMV</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {reportSummary.totalActualNmv.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Mục tiêu kế hoạch: {reportSummary.totalPlanNmv.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Tỷ lệ đạt</span>
                  <span
                    className={`font-semibold ${
                      reportSummary.nmvRate >= 100
                        ? 'text-emerald-600'
                        : reportSummary.nmvRate >= 70
                        ? 'text-accent'
                        : 'text-amber-600'
                    }`}
                  >
                    {reportSummary.nmvRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, reportSummary.nmvRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Ngân sách & Chi tiêu */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Ngân sách & Chi tiêu</span>
                  <Coins className="w-4 h-4 text-accent" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {reportSummary.totalBookedNetSpend.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Kế hoạch Net: {reportSummary.totalPlanBudget.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Tỷ lệ giải ngân</span>
                  <span
                    className={`font-semibold ${
                      reportSummary.budgetBurnRate > 100
                        ? 'text-red-600'
                        : reportSummary.budgetBurnRate >= 85
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {reportSummary.budgetBurnRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      reportSummary.budgetBurnRate > 100
                        ? 'bg-red-500'
                        : reportSummary.budgetBurnRate >= 85
                        ? 'bg-amber-500'
                        : 'bg-accent'
                    }`}
                    style={{ width: `${Math.min(100, reportSummary.budgetBurnRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Tiến độ Air Video */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">Tiến độ Air Video</span>
                  <Film className="w-4 h-4 text-accent" />
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {reportSummary.totalAiredVideos} / {reportSummary.totalPlanVideos} video
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Đã book: {reportSummary.totalBookedVideos} · Chờ lên sóng: {reportSummary.totalWaitingAirVideos}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Hoàn thành</span>
                  <span className="font-semibold text-accent">
                    {reportSummary.airRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, reportSummary.airRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Kiểm soát SLA & Nghiệm thu */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-medium">SLA Air & Nghiệm thu</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {reportSummary.totalOntimeVideos}
                    </div>
                    <div className="text-2xs text-slate-400">Đúng hạn</div>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <div className="text-sm font-semibold text-amber-600">
                      {reportSummary.totalLateVideos}
                    </div>
                    <div className="text-2xs text-slate-400">Trễ hạn</div>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <div className="text-sm font-semibold text-accent">
                      {reportSummary.totalAcceptedVideos}
                    </div>
                    <div className="text-2xs text-slate-400">Đã nghiệm thu</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                <span>Đã chi trả:</span>
                <span className="font-semibold text-slate-800">
                  {reportSummary.totalPaidSpend.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* B. Bảng Đối soát chi tiết theo Phân Tầng KL (Key Level Table) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Đối soát chi tiết theo Phân tầng Khung lương (KL)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Tháng: <strong className="text-slate-800">{selectedMonth}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Khung lương (KL)</th>
                    <th className="py-2.5 px-3 text-right">Video Plan</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá Plan</th>
                    <th className="py-2.5 px-3 text-right">Ngân sách Plan</th>
                    <th className="py-2.5 px-3 text-right">Đã Duyệt Book</th>
                    <th className="py-2.5 px-3 text-right">Chi phí Net Book</th>
                    <th className="py-2.5 px-3 text-right">Video Đã Air</th>
                    <th className="py-2.5 px-3 text-right">Tiến độ Air</th>
                    <th className="py-2.5 px-3 text-right">NMV Thực tế</th>
                    <th className="py-2.5 px-3 text-right">Lệch Ngân sách</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportSummary.klBreakdown.map((row) => (
                    <tr key={row.kl} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.kl}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {row.planVideos}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {row.planUnitCost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {row.planBudget.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-accent">
                        {row.actualBookedVideos}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {row.actualNetSpend.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-accent">
                        {row.actualAiredVideos}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-semibold ${
                            row.airCompletionRate >= 100
                              ? 'text-emerald-600'
                              : row.airCompletionRate >= 60
                              ? 'text-accent'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.airCompletionRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                        {row.actualNmv > 0 ? `${row.actualNmv.toLocaleString('vi-VN')} đ` : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          row.spendDiff > 0
                            ? 'text-red-600'
                            : row.spendDiff < 0
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {row.spendDiff > 0 ? '+' : ''}
                        {row.spendDiff.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-2xs font-semibold ${
                            row.burnWarning === 'BỘI_CHI'
                              ? 'bg-red-100 text-red-700'
                              : row.burnWarning === 'SẮP_TRẦN'
                              ? 'bg-amber-100 text-amber-700'
                              : row.burnWarning === 'CHƯA_PHÁT_SINH'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {row.burnWarning === 'BỘI_CHI'
                            ? 'Bội chi'
                            : row.burnWarning === 'SẮP_TRẦN'
                            ? 'Sắp trần'
                            : row.burnWarning === 'CHƯA_PHÁT_SINH'
                            ? 'Chưa chạy'
                            : 'An toàn'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* C. Bảng Tiến độ & Tình trạng Chi tiêu theo từng Gian hàng */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Đối soát theo Gian hàng ({filteredStoreReports.length} gian hàng)
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Gian hàng & Brand</th>
                    <th className="py-2.5 px-3">Người phụ trách</th>
                    <th className="py-2.5 px-3 text-right">NMV Kế hoạch</th>
                    <th className="py-2.5 px-3 text-right">NMV Thực tế</th>
                    <th className="py-2.5 px-3 text-right">Ngân sách Plan</th>
                    <th className="py-2.5 px-3 text-right">Đã Duyệt Book</th>
                    <th className="py-2.5 px-3 text-right">Đã Thanh Toán</th>
                    <th className="py-2.5 px-3 text-center">Giải ngân</th>
                    <th className="py-2.5 px-3 text-center">Tiến độ Air</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái chi tiêu</th>
                    <th className="py-2.5 px-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStoreReports.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Không tìm thấy gian hàng nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredStoreReports.map((row) => (
                      <tr key={row.storeName} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{row.storeName}</div>
                          <div className="text-2xs text-slate-500">{row.brandName}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">{row.picName}</div>
                          {row.leaderName && (
                            <div className="text-2xs text-slate-400">
                              Leader: {row.leaderName}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {row.planNmv > 0 ? `${row.planNmv.toLocaleString('vi-VN')} đ` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {row.actualNmv > 0 ? `${row.actualNmv.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {row.planBudget > 0 ? `${row.planBudget.toLocaleString('vi-VN')} đ` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {row.actualNetSpend.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                          {row.actualPaidSpend > 0
                            ? `${row.actualPaidSpend.toLocaleString('vi-VN')} đ`
                            : '0 đ'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="font-semibold text-slate-700">
                            {row.budgetBurnRate.toFixed(0)}%
                          </div>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.budgetBurnRate > 100
                                  ? 'bg-red-500'
                                  : row.budgetBurnRate >= 85
                                  ? 'bg-amber-500'
                                  : 'bg-accent'
                              }`}
                              style={{ width: `${Math.min(100, row.budgetBurnRate)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="font-semibold text-accent">
                            {row.actualAiredVideos} / {row.planVideos || row.actualBookedVideos} video
                          </div>
                          <div className="text-2xs text-slate-400">
                            {row.actualAiredOntime} đúng hạn · {row.actualAiredLate} trễ
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-2xs font-semibold ${
                              row.spendStatus === 'VƯỢT_NGÂN_SÁCH'
                                ? 'bg-red-100 text-red-700'
                                : row.spendStatus === 'SẮP_TRẦN'
                                ? 'bg-amber-100 text-amber-700'
                                : row.spendStatus === 'CHƯA_CÓ_PLAN'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {row.spendStatus === 'VƯỢT_NGÂN_SÁCH'
                              ? 'Vượt ngân sách'
                              : row.spendStatus === 'SẮP_TRẦN'
                              ? 'Sắp trần'
                              : row.spendStatus === 'CHƯA_CÓ_PLAN'
                              ? 'Chưa có plan'
                              : 'An toàn'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setDetailStoreName(row.storeName)}
                            className="px-2.5 py-1 text-2xs font-medium text-accent bg-accent-soft hover:bg-accent-soft/80 rounded-md transition-colors"
                          >
                            Xem video
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* D. Danh sách Video Cần Đôn Đốc Air (Air Alert List) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Cảnh báo tiến độ: Video đang chờ lên sóng hoặc trễ hạn ({pendingAirBookings.length} video)
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Mã Booking</th>
                    <th className="py-2 px-3">Gian hàng</th>
                    <th className="py-2 px-3">KOC / Kênh</th>
                    <th className="py-2 px-3">Khung lương</th>
                    <th className="py-2 px-3 text-right">Chi phí Net</th>
                    <th className="py-2 px-3">Ngày Air Dự kiến</th>
                    <th className="py-2 px-3">SLA Air</th>
                    <th className="py-2 px-3">Người phụ trách</th>
                    <th className="py-2 px-3 text-center">Đường dẫn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingAirBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Tất cả các video đã lên sóng đúng hạn và không có cảnh báo tồn đọng.
                      </td>
                    </tr>
                  ) : (
                    pendingAirBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {b.maBooking || 'Chờ tạo BO'}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{b.storeName}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{b.tenKenh || b.idKenh}</div>
                          <div className="text-2xs text-slate-400">@{b.idKenh}</div>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700">{b.klGrade}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          {b.chiPhiBookingNetCuoi?.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2 px-3 text-slate-700">{b.plannedAirDate || '—'}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-2xs font-semibold ${
                              b.trangThaiSlaAir?.includes('Trễ')
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {b.trangThaiSlaAir || 'Chưa lên sóng'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{b.nguoiPhuTrach}</td>
                        <td className="py-2 px-3 text-center">
                          {b.linkAir ? (
                            <a
                              href={b.linkAir}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline flex items-center justify-center gap-1"
                            >
                              Xem video <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400">Chưa điền link</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. NỘI DUNG CHÍNH: TAB THIẾT LẬP KẾ HOẠCH GIAN HÀNG (STORE PLAN STUDIO) */}
      {activeSubTab === 'PLAN_STUDIO' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Danh mục Kế hoạch Gian hàng theo KL ({plans.length} kế hoạch)
                </h2>
              </div>
              <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreatePlan}>
                Thêm kế hoạch gian hàng
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tháng</th>
                    <th className="py-2.5 px-3">Gian hàng</th>
                    <th className="py-2.5 px-3">Thương hiệu</th>
                    <th className="py-2.5 px-3">Người phụ trách</th>
                    <th className="py-2.5 px-3">Leader</th>
                    <th className="py-2.5 px-3 text-right">Chỉ tiêu NMV</th>
                    <th className="py-2.5 px-3 text-right">Ngân sách Net</th>
                    <th className="py-2.5 px-3 text-right">Số Video Plan</th>
                    <th className="py-2.5 px-3">Phân bổ KL</th>
                    <th className="py-2.5 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((p) => {
                    const activeKls = p.klDetails.filter((d) => d.targetVideos > 0);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{p.monthKey}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{p.storeName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.brandName}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{p.picName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.leaderName || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                          {p.targetNmv.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                          {p.targetBudget.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-accent">
                          {p.targetVideos}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {activeKls.length > 0 ? (
                              activeKls.map((k) => (
                                <span
                                  key={k.kl}
                                  className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-2xs"
                                >
                                  {k.kl}: {k.targetVideos} video
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400">Chưa chia KL</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditPlan(p)}
                              className="p-1 text-slate-500 hover:text-accent hover:bg-accent-soft rounded transition-colors"
                              title="Chỉnh sửa kế hoạch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlan(p.id, p.storeName)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Xóa kế hoạch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* 5. MODAL TẠO / SỬA KẾ HOẠCH GIAN HÀNG */}
      <Modal
        open={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? `Chỉnh sửa Kế hoạch: ${editingPlan.storeName}` : 'Tạo Kế hoạch Gian hàng mới'}
        size="2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSavePlan}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors"
            >
              Lưu kế hoạch
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-xs">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tháng áp dụng</label>
              <input
                type="text"
                value={planFormData.monthKey}
                onChange={(e) => setPlanFormData({ ...planFormData, monthKey: e.target.value })}
                placeholder="2026/10"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gian hàng</label>
              <select
                value={planFormData.storeName}
                onChange={(e) => {
                  const sName = e.target.value;
                  const matched = availableStores.find((s) => s.storeName === sName);
                  setPlanFormData({
                    ...planFormData,
                    storeName: sName,
                    brandName: matched?.brandName || planFormData.brandName,
                  });
                }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
              >
                <option value="">-- Chọn gian hàng --</option>
                {availableStores.map((s) => (
                  <option key={s.storeName} value={s.storeName}>
                    {s.storeName} ({s.brandName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Thương hiệu</label>
              <input
                type="text"
                value={planFormData.brandName}
                onChange={(e) => setPlanFormData({ ...planFormData, brandName: e.target.value })}
                placeholder="ClubClio, EUPC..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Người phụ trách (PIC)</label>
              <select
                value={planFormData.picName}
                onChange={(e) => setPlanFormData({ ...planFormData, picName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
              >
                {availablePics.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chỉ số chính */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <label className="block font-semibold text-slate-700 mb-1">Mục tiêu NMV (VNĐ)</label>
              <input
                type="number"
                step="1000000"
                value={planFormData.targetNmv}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, targetNmv: Number(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-emerald-700"
              />
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <label className="block font-semibold text-slate-700 mb-1">Tổng ngân sách Net (VNĐ)</label>
              <input
                type="number"
                step="1000000"
                value={planFormData.targetBudget}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, targetBudget: Number(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-900"
              />
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <label className="block font-semibold text-slate-700 mb-1">Tổng số Video kế hoạch</label>
              <input
                type="number"
                value={planFormData.targetVideos}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, targetVideos: Number(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-accent"
              />
            </div>
          </div>

          {/* Bảng phân rã chi tiết theo từng KL */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 font-semibold text-slate-800 border-b border-slate-200 flex items-center justify-between">
              <span>Phân bổ chi tiết theo Phân tầng Khung lương (KL)</span>
              <span className="text-2xs text-slate-500">
                Tự động tính thành tiền theo số lượng và đơn giá
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Khung lương (KL)</th>
                    <th className="py-2 px-3 text-right">Số video</th>
                    <th className="py-2 px-3 text-right">Đơn giá dự kiến (VNĐ)</th>
                    <th className="py-2 px-3 text-right">Tổng ngân sách KL (VNĐ)</th>
                    <th className="py-2 px-3 text-right">NMV dự kiến (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planFormData.klDetails.map((klItem) => (
                    <tr key={klItem.kl}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{klItem.kl}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={klItem.targetVideos || ''}
                          onChange={(e) =>
                            handleKlDetailChange(
                              klItem.kl,
                              'targetVideos',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          placeholder="0"
                          className="w-16 px-2 py-1 text-right border border-slate-200 rounded font-semibold text-accent"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="100000"
                          value={klItem.unitCost || ''}
                          onChange={(e) =>
                            handleKlDetailChange(
                              klItem.kl,
                              'unitCost',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          placeholder="0"
                          className="w-28 px-2 py-1 text-right border border-slate-200 rounded text-slate-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {klItem.allocatedBudget.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="1000000"
                          value={klItem.targetNmv || ''}
                          onChange={(e) =>
                            handleKlDetailChange(
                              klItem.kl,
                              'targetNmv',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          placeholder="0"
                          className="w-28 px-2 py-1 text-right border border-slate-200 rounded text-emerald-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú chiến lược</label>
            <textarea
              rows={2}
              value={planFormData.notes}
              onChange={(e) => setPlanFormData({ ...planFormData, notes: e.target.value })}
              placeholder="Sản phẩm trọng tâm, lưu ý kịch bản, thời điểm Payday..."
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* 6. MODAL XEM CHI TIẾT VIDEO CỦA MỘT GIAN HÀNG */}
      <Modal
        open={Boolean(detailStoreName)}
        onClose={() => setDetailStoreName(null)}
        title={`Danh sách Video đã Book & Air: ${detailStoreName}`}
        size="2xl"
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              onClick={() => setDetailStoreName(null)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-xs">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Mã BO</th>
                  <th className="py-2 px-3">Kênh KOC</th>
                  <th className="py-2 px-3">Khung lương</th>
                  <th className="py-2 px-3 text-right">Chi phí Net</th>
                  <th className="py-2 px-3">Ngày Air Dự kiến</th>
                  <th className="py-2 px-3">Ngày Air Thực tế</th>
                  <th className="py-2 px-3 text-right">NMV / GMV</th>
                  <th className="py-2 px-3 text-center">Nghiệm thu</th>
                  <th className="py-2 px-3 text-center">Video</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailStoreBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Chưa có video booking nào được tạo cho gian hàng này trong tháng {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  detailStoreBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {b.maBooking || 'Chờ tạo BO'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{b.tenKenh || b.idKenh}</div>
                        <div className="text-2xs text-slate-400">@{b.idKenh}</div>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-700">{b.klGrade}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {b.chiPhiBookingNetCuoi?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2 px-3 text-slate-600">{b.plannedAirDate || '—'}</td>
                      <td className="py-2 px-3 font-medium text-accent">
                        {b.actualAirDate || 'Chưa air'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                        {((b.gmv14d || 0) > 0 ? b.gmv14d : b.gmv30d)?.toLocaleString('vi-VN') || 0} đ
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-2xs font-semibold ${
                            b.acceptanceStatus === 'DA_NGHIEM_THU'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {b.acceptanceStatus === 'DA_NGHIEM_THU' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {b.linkAir ? (
                          <a
                            href={b.linkAir}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline flex items-center justify-center gap-1"
                          >
                            Xem link <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeletePlan)}
        title="Xác nhận xóa kế hoạch gian hàng"
        message={`Bạn có chắc chắn muốn xóa kế hoạch của gian hàng "${pendingDeletePlan?.storeName || ''}" không?`}
        confirmLabel="Xóa kế hoạch"
        tone="danger"
        onConfirm={confirmDeletePlan}
        onCancel={() => setPendingDeletePlan(null)}
      />
    </div>
  );
};
export default AirBookingReportHubView;
