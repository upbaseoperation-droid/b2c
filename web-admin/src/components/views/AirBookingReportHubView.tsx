'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  Coins,
  Film,
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
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
  type KlComparisonRow,
  type StoreAirReportItem,
} from '../../lib/storeAirPlanData';
import {
  ApprovedBookingListItem,
  loadApprovedBookingList,
  APPROVED_BOOKING_LIST_UPDATED_EVENT,
} from '../../lib/approvedBookingList';
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Person,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  type Column,
} from '../ui';
import {
  formatDate,
  formatNumber,
  formatVnd,
  formatVndShort,
} from '../../lib/format';

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

  // Phân trang bảng gian hàng
  const [storePage, setStorePage] = useState<number>(1);
  const storePageSize = 15;

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

  const maxStorePage = Math.max(1, Math.ceil(filteredStoreReports.length / storePageSize));
  const safeStorePage = Math.min(storePage, maxStorePage);

  const pagedStoreReports = useMemo(() => {
    const start = (safeStorePage - 1) * storePageSize;
    return filteredStoreReports.slice(start, start + storePageSize);
  }, [filteredStoreReports, safeStorePage, storePageSize]);

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

  // Định nghĩa cột bảng Khung lương (KL)
  const klColumns: Column<KlComparisonRow>[] = [
    {
      key: 'kl',
      header: 'Khung lương (KL)',
      render: (r) => <span className="font-semibold text-ink">{r.kl}</span>,
    },
    {
      key: 'planVideos',
      header: 'Video Plan',
      align: 'right',
      render: (r) => formatNumber(r.planVideos),
    },
    {
      key: 'planUnitCost',
      header: 'Đơn giá Plan',
      align: 'right',
      render: (r) => formatVnd(r.planUnitCost),
    },
    {
      key: 'planBudget',
      header: 'Ngân sách Plan',
      align: 'right',
      render: (r) => formatVndShort(r.planBudget),
    },
    {
      key: 'actualBookedVideos',
      header: 'Đã Duyệt Book',
      align: 'right',
      render: (r) => <span className="font-medium text-accent">{formatNumber(r.actualBookedVideos)}</span>,
    },
    {
      key: 'actualNetSpend',
      header: 'Chi phí Net Book',
      align: 'right',
      render: (r) => formatVndShort(r.actualNetSpend),
    },
    {
      key: 'actualAiredVideos',
      header: 'Video Đã Air',
      align: 'right',
      render: (r) => <span className="font-semibold text-accent">{formatNumber(r.actualAiredVideos)}</span>,
    },
    {
      key: 'airCompletionRate',
      header: 'Tiến độ Air',
      align: 'right',
      render: (r) => (
        <span
          className={`font-semibold ${
            r.airCompletionRate >= 100
              ? 'text-positive'
              : r.airCompletionRate >= 60
              ? 'text-accent'
              : 'text-ink-3'
          }`}
        >
          {r.airCompletionRate.toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'actualNmv',
      header: 'NMV Thực tế',
      align: 'right',
      render: (r) => (r.actualNmv > 0 ? formatVndShort(r.actualNmv) : <span className="text-ink-3">—</span>),
    },
    {
      key: 'spendDiff',
      header: 'Lệch Ngân sách',
      align: 'right',
      render: (r) => (
        <span
          className={`font-semibold ${
            r.spendDiff > 0
              ? 'text-critical'
              : r.spendDiff < 0
              ? 'text-positive'
              : 'text-ink-3'
          }`}
        >
          {r.spendDiff > 0 ? `+${formatVndShort(r.spendDiff)}` : formatVndShort(r.spendDiff)}
        </span>
      ),
    },
    {
      key: 'burnWarning',
      header: 'Trạng thái',
      align: 'center',
      render: (r) => (
        <Status
          tone={
            r.burnWarning === 'BỘI_CHI'
              ? 'critical'
              : r.burnWarning === 'SẮP_TRẦN'
              ? 'warning'
              : r.burnWarning === 'CHƯA_PHÁT_SINH'
              ? 'neutral'
              : 'positive'
          }
        >
          {r.burnWarning === 'BỘI_CHI'
            ? 'Bội chi'
            : r.burnWarning === 'SẮP_TRẦN'
            ? 'Sắp trần'
            : r.burnWarning === 'CHƯA_PHÁT_SINH'
            ? 'Chưa chạy'
            : 'An toàn'}
        </Status>
      ),
    },
  ];

  // Định nghĩa cột bảng Gian hàng
  const storeColumns: Column<StoreAirReportItem>[] = [
    {
      key: 'storeName',
      header: 'Gian hàng & Thương hiệu',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.storeName}</div>
          <div className="text-2xs text-ink-3">{r.brandName}</div>
        </div>
      ),
    },
    {
      key: 'picName',
      header: 'Người phụ trách',
      render: (r) => (
        <div>
          <Person name={r.picName} size={20} />
          {r.leaderName && (
            <div className="text-2xs text-ink-3 mt-0.5">Leader: {r.leaderName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'planNmv',
      header: 'NMV Kế hoạch',
      align: 'right',
      render: (r) => (r.planNmv > 0 ? formatVndShort(r.planNmv) : <span className="text-ink-3">—</span>),
    },
    {
      key: 'actualNmv',
      header: 'NMV Thực tế',
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-positive">
          {r.actualNmv > 0 ? formatVndShort(r.actualNmv) : '0 đ'}
        </span>
      ),
    },
    {
      key: 'planBudget',
      header: 'Ngân sách Plan',
      align: 'right',
      render: (r) => (r.planBudget > 0 ? formatVndShort(r.planBudget) : <span className="text-ink-3">—</span>),
    },
    {
      key: 'actualNetSpend',
      header: 'Đã Duyệt Book',
      align: 'right',
      render: (r) => <span className="font-semibold text-ink">{formatVndShort(r.actualNetSpend)}</span>,
    },
    {
      key: 'actualPaidSpend',
      header: 'Đã Thanh Toán',
      align: 'right',
      render: (r) => (r.actualPaidSpend > 0 ? formatVndShort(r.actualPaidSpend) : '0 đ'),
    },
    {
      key: 'budgetBurnRate',
      header: 'Giải ngân',
      align: 'center',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.budgetBurnRate.toFixed(0)}%</div>
          <div className="w-16 h-1.5 bg-sunken rounded-full mx-auto mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                r.budgetBurnRate > 100
                  ? 'bg-critical'
                  : r.budgetBurnRate >= 85
                  ? 'bg-warning'
                  : 'bg-accent'
              }`}
              style={{ width: `${Math.min(100, r.budgetBurnRate)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'actualAiredVideos',
      header: 'Tiến độ Air',
      align: 'center',
      render: (r) => (
        <div>
          <div className="font-semibold text-accent">
            {r.actualAiredVideos} / {r.planVideos || r.actualBookedVideos} video
          </div>
          <div className="text-2xs text-ink-3">
            {r.actualAiredOntime} chuẩn · {r.actualAiredLate} trễ
          </div>
        </div>
      ),
    },
    {
      key: 'spendStatus',
      header: 'Trạng thái chi tiêu',
      align: 'center',
      render: (r) => (
        <Status
          tone={
            r.spendStatus === 'VƯỢT_NGÂN_SÁCH'
              ? 'critical'
              : r.spendStatus === 'SẮP_TRẦN'
              ? 'warning'
              : r.spendStatus === 'CHƯA_CÓ_PLAN'
              ? 'neutral'
              : 'positive'
          }
        >
          {r.spendStatus === 'VƯỢT_NGÂN_SÁCH'
            ? 'Vượt ngân sách'
            : r.spendStatus === 'SẮP_TRẦN'
            ? 'Sắp trần'
            : r.spendStatus === 'CHƯA_CÓ_PLAN'
            ? 'Chưa có plan'
            : 'An toàn'}
        </Status>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDetailStoreName(r.storeName)}
        >
          Xem video
        </Button>
      ),
    },
  ];

  // Định nghĩa cột bảng Cảnh báo Air trễ
  const pendingColumns: Column<ApprovedBookingListItem>[] = [
    {
      key: 'maBooking',
      header: 'Mã Booking',
      render: (b) => <span className="font-semibold text-ink">{b.maBooking || 'Chờ tạo BO'}</span>,
    },
    {
      key: 'storeName',
      header: 'Gian hàng',
      render: (b) => b.storeName,
    },
    {
      key: 'tenKenh',
      header: 'KOC / Kênh',
      render: (b) => (
        <div>
          <div className="font-semibold text-ink">{b.tenKenh || b.idKenh}</div>
          <div className="text-2xs text-ink-3">@{b.idKenh}</div>
        </div>
      ),
    },
    {
      key: 'klGrade',
      header: 'Khung lương',
      render: (b) => b.klGrade,
    },
    {
      key: 'chiPhiBookingNetCuoi',
      header: 'Chi phí Net',
      align: 'right',
      render: (b) => formatVnd(b.chiPhiBookingNetCuoi || 0),
    },
    {
      key: 'plannedAirDate',
      header: 'Ngày Air Dự kiến',
      render: (b) => formatDate(b.plannedAirDate),
    },
    {
      key: 'trangThaiSlaAir',
      header: 'SLA Air',
      render: (b) => (
        <Status tone={b.trangThaiSlaAir?.includes('Trễ') ? 'critical' : 'warning'}>
          {b.trangThaiSlaAir || 'Chưa lên sóng'}
        </Status>
      ),
    },
    {
      key: 'nguoiPhuTrach',
      header: 'Người phụ trách',
      render: (b) => <Person name={b.nguoiPhuTrach} size={18} />,
    },
    {
      key: 'linkAir',
      header: 'Đường dẫn',
      align: 'center',
      render: (b) =>
        b.linkAir ? (
          <a
            href={b.linkAir}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1 text-2xs font-medium"
          >
            Xem video <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
  ];

  // Định nghĩa cột bảng Kế hoạch Gian hàng
  const planColumns: Column<StoreAirPlan>[] = [
    {
      key: 'monthKey',
      header: 'Tháng',
      render: (p) => <span className="font-medium text-ink-2">{p.monthKey}</span>,
    },
    {
      key: 'storeName',
      header: 'Gian hàng',
      render: (p) => <span className="font-semibold text-ink">{p.storeName}</span>,
    },
    {
      key: 'brandName',
      header: 'Thương hiệu',
      render: (p) => p.brandName,
    },
    {
      key: 'picName',
      header: 'Người phụ trách',
      render: (p) => <Person name={p.picName} size={18} />,
    },
    {
      key: 'leaderName',
      header: 'Leader',
      render: (p) => (p.leaderName ? <Person name={p.leaderName} size={18} /> : <span className="text-ink-3">—</span>),
    },
    {
      key: 'targetNmv',
      header: 'Chỉ tiêu NMV',
      align: 'right',
      render: (p) => formatVndShort(p.targetNmv),
    },
    {
      key: 'targetBudget',
      header: 'Ngân sách Net',
      align: 'right',
      render: (p) => formatVndShort(p.targetBudget),
    },
    {
      key: 'targetVideos',
      header: 'Số Video Plan',
      align: 'right',
      render: (p) => formatNumber(p.targetVideos),
    },
    {
      key: 'klDetails',
      header: 'Phân bổ KL',
      render: (p) => {
        const activeKls = p.klDetails.filter((d) => d.targetVideos > 0);
        return (
          <div className="flex flex-wrap gap-1 max-w-[280px]">
            {activeKls.length > 0 ? (
              activeKls.map((k) => (
                <span
                  key={k.kl}
                  className="inline-block px-1.5 py-0.5 bg-sunken text-ink-2 rounded text-2xs"
                >
                  {k.kl}: {k.targetVideos}
                </span>
              ))
            ) : (
              <span className="text-ink-3">Chưa chia KL</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditPlan(p)}
            title="Chỉnh sửa kế hoạch"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeletePlan(p.id, p.storeName)}
            title="Xóa kế hoạch"
          >
            <Trash2 className="w-3.5 h-3.5 text-critical" />
          </Button>
        </div>
      ),
    },
  ];

  // Định nghĩa cột bảng Modal Chi tiết Video của Gian hàng
  const modalColumns: Column<ApprovedBookingListItem>[] = [
    {
      key: 'maBooking',
      header: 'Mã BO',
      render: (b) => <span className="font-semibold text-ink">{b.maBooking || 'Chờ tạo BO'}</span>,
    },
    {
      key: 'tenKenh',
      header: 'Kênh KOC',
      render: (b) => (
        <div>
          <div className="font-semibold text-ink">{b.tenKenh || b.idKenh}</div>
          <div className="text-2xs text-ink-3">@{b.idKenh}</div>
        </div>
      ),
    },
    {
      key: 'klGrade',
      header: 'Khung lương',
      render: (b) => b.klGrade,
    },
    {
      key: 'chiPhiBookingNetCuoi',
      header: 'Chi phí Net',
      align: 'right',
      render: (b) => formatVnd(b.chiPhiBookingNetCuoi || 0),
    },
    {
      key: 'plannedAirDate',
      header: 'Ngày Air Dự kiến',
      render: (b) => formatDate(b.plannedAirDate),
    },
    {
      key: 'actualAirDate',
      header: 'Ngày Air Thực tế',
      render: (b) => (b.actualAirDate ? formatDate(b.actualAirDate) : <span className="text-ink-3">Chưa air</span>),
    },
    {
      key: 'gmv',
      header: 'NMV / GMV',
      align: 'right',
      render: (b) => formatVndShort(((b.gmv14d || 0) > 0 ? b.gmv14d : b.gmv30d) || 0),
    },
    {
      key: 'acceptanceStatus',
      header: 'Nghiệm thu',
      align: 'center',
      render: (b) => (
        <Status tone={b.acceptanceStatus === 'DA_NGHIEM_THU' ? 'positive' : 'warning'}>
          {b.acceptanceStatus === 'DA_NGHIEM_THU' ? 'Đã duyệt' : 'Chờ duyệt'}
        </Status>
      ),
    },
    {
      key: 'linkAir',
      header: 'Video',
      align: 'center',
      render: (b) =>
        b.linkAir ? (
          <a
            href={b.linkAir}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1 text-2xs font-medium"
          >
            Xem link <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 bg-canvas text-ink">
      {/* 1. Thanh hành động trang */}
      <PageActions>
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={handleExportCsv}
          title="Xuất file đối soát Excel (.csv)"
        >
          Xuất file
        </Button>

        {activeSubTab === 'PLAN_STUDIO' && (
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreatePlan}>
            Tạo kế hoạch
          </Button>
        )}
      </PageActions>

      {/* 2. Thanh Chuyển Phân hệ & Bộ lọc Đa chiều */}
      <div className="bg-surface p-3.5 rounded-xl border border-line flex flex-wrap items-center gap-3">
        <Segmented<'REPORT' | 'PLAN_STUDIO'>
          value={activeSubTab}
          onChange={setActiveSubTab}
          items={[
            { key: 'REPORT', label: 'Báo cáo đối soát & Air' },
            { key: 'PLAN_STUDIO', label: 'Kế hoạch Gian hàng theo KL' },
          ]}
        />
        <span className="text-line-strong hidden sm:inline">|</span>

        {/* Lọc Tháng */}
        <div className="flex items-center gap-2">
          <span className="text-2xs font-medium text-ink-3">Tháng:</span>
          <Select
            aria-label="Tháng"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-auto"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </Select>
        </div>

        {/* Lọc Nhân sự */}
        <div className="flex items-center gap-2">
          <span className="text-2xs font-medium text-ink-3">Nhân sự:</span>
          {isManager ? (
            <Select
              aria-label="Nhân sự"
              value={selectedPic}
              onChange={(e) => setSelectedPic(e.target.value)}
              className="w-auto"
            >
              <option value="">Toàn bộ nhân sự ({availablePics.length})</option>
              {availablePics.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-soft border border-accent/25 text-accent rounded-lg text-2xs font-medium">
              <Users className="w-3.5 h-3.5" />
              <span>{currentUser.name} (Chuyên viên)</span>
            </div>
          )}
        </div>

        {/* Lọc Gian hàng */}
        <div className="flex items-center gap-2">
          <span className="text-2xs font-medium text-ink-3">Gian hàng:</span>
          <Select
            aria-label="Gian hàng"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-auto max-w-[200px]"
          >
            <option value="">Tất cả gian hàng</option>
            {availableStores.map((s) => (
              <option key={s.storeName} value={s.storeName}>
                {s.storeName}
              </option>
            ))}
          </Select>
        </div>

        {/* Ô tìm kiếm từ khóa */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo gian hàng, thương hiệu, nhân sự..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-line rounded-lg bg-canvas text-ink focus:outline-hidden focus:border-accent"
          />
        </div>

        {/* Lọc trạng thái báo động nhanh */}
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-ink text-white font-medium'
                : 'text-ink-2 hover:bg-sunken'
            }`}
          >
            Tất cả ({reportSummary.storeReports.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OVERBUDGET')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'OVERBUDGET'
                ? 'bg-critical text-white font-medium'
                : 'text-critical bg-critical-soft hover:bg-critical-soft/80'
            }`}
          >
            Vượt ngân sách ({reportSummary.overbudgetStoresCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('LATE_AIR')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'LATE_AIR'
                ? 'bg-warning text-white font-medium'
                : 'text-warning bg-warning-soft hover:bg-warning-soft/80'
            }`}
          >
            Trễ hạn air ({reportSummary.totalLateVideos})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NO_PLAN')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'NO_PLAN'
                ? 'bg-ink-3 text-white font-medium'
                : 'text-ink-2 bg-sunken hover:bg-line/60'
            }`}
          >
            Chưa có plan ({reportSummary.unbudgetedStoresCount})
          </button>
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH: TAB BÁO CÁO ĐỐI SOÁT */}
      {activeSubTab === 'REPORT' && (
        <div className="flex flex-col gap-6">
          {/* A. 4 Card KPI Tổng Quan bằng StatRow & Stat */}
          <StatRow>
            <Stat
              label="Chỉ tiêu NMV"
              value={formatVndShort(reportSummary.totalActualNmv)}
              tone={reportSummary.nmvRate >= 100 ? 'positive' : reportSummary.nmvRate >= 70 ? undefined : 'warning'}
              progress={{ value: reportSummary.totalActualNmv, max: Math.max(1, reportSummary.totalPlanNmv) }}
              note={`Kế hoạch: ${formatVndShort(reportSummary.totalPlanNmv)} · Đạt ${reportSummary.nmvRate.toFixed(1)}%`}
              icon={TrendingUp}
            />
            <Stat
              label="Ngân sách Net & Giải ngân"
              value={formatVndShort(reportSummary.totalBookedNetSpend)}
              tone={reportSummary.budgetBurnRate > 100 ? 'critical' : reportSummary.budgetBurnRate >= 85 ? 'warning' : 'positive'}
              progress={{ value: reportSummary.totalBookedNetSpend, max: Math.max(1, reportSummary.totalPlanBudget) }}
              note={`Kế hoạch Net: ${formatVndShort(reportSummary.totalPlanBudget)} · Tỷ lệ: ${reportSummary.budgetBurnRate.toFixed(1)}%`}
              icon={Coins}
            />
            <Stat
              label="Tiến độ Air Video"
              value={`${formatNumber(reportSummary.totalAiredVideos)} / ${formatNumber(reportSummary.totalPlanVideos)} video`}
              tone={reportSummary.airRate >= 80 ? 'positive' : undefined}
              progress={{ value: reportSummary.totalAiredVideos, max: Math.max(1, reportSummary.totalPlanVideos) }}
              note={`Đã book: ${formatNumber(reportSummary.totalBookedVideos)} · Chờ lên sóng: ${formatNumber(reportSummary.totalWaitingAirVideos)}`}
              icon={Film}
            />
            <Stat
              label="SLA Air & Nghiệm thu"
              value={`${formatNumber(reportSummary.totalOntimeVideos)} đúng hạn`}
              tone={reportSummary.totalLateVideos > 0 ? 'warning' : 'positive'}
              note={`${formatNumber(reportSummary.totalLateVideos)} video trễ · Đã chi: ${formatVndShort(reportSummary.totalPaidSpend)}`}
              icon={CheckCircle2}
            />
          </StatRow>

          {/* B. Bảng Đối soát chi tiết theo Phân Tầng KL (Key Level Table) */}
          <Panel
            title="Đối soát chi tiết theo Phân tầng Khung lương (KL)"
            flush
            actions={<span className="text-2xs text-ink-3">Tháng {selectedMonth}</span>}
          >
            <DataTable
              columns={klColumns}
              rows={reportSummary.klBreakdown}
              rowKey={(r) => r.kl}
              empty={<EmptyState title="Không có dữ liệu phân tầng khung lương" />}
            />
          </Panel>

          {/* C. Bảng Tiến độ & Tình trạng Chi tiêu theo từng Gian hàng */}
          <Panel
            title={`Đối soát theo Gian hàng (${filteredStoreReports.length} gian hàng)`}
            flush
          >
            <DataTable
              columns={storeColumns}
              rows={pagedStoreReports}
              rowKey={(r) => r.storeName}
              empty={
                <EmptyState
                  title="Không tìm thấy gian hàng nào phù hợp bộ lọc"
                  description="Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn trạng thái cảnh báo."
                />
              }
            />
            {filteredStoreReports.length > storePageSize && (
              <div className="p-3 bg-canvas border-t border-line">
                <Pagination
                  page={safeStorePage}
                  total={filteredStoreReports.length}
                  pageSize={storePageSize}
                  onPageChange={setStorePage}
                />
              </div>
            )}
          </Panel>

          {/* D. Danh sách Video Cần Đôn Đốc Air (Air Alert List) */}
          <Panel
            title={`Cảnh báo tiến độ: Video đang chờ lên sóng hoặc trễ hạn (${pendingAirBookings.length} video)`}
            flush
          >
            <DataTable
              columns={pendingColumns}
              rows={pendingAirBookings}
              rowKey={(b) => b.id}
              empty={
                <EmptyState
                  title="Tất cả video đã lên sóng đúng hạn"
                  description="Không có video nào trễ hạn hoặc kẹt chờ air trong phạm vi bộ lọc."
                />
              }
            />
          </Panel>
        </div>
      )}

      {/* 4. NỘI DUNG CHÍNH: TAB THIẾT LẬP KẾ HOẠCH GIAN HÀNG (STORE PLAN STUDIO) */}
      {activeSubTab === 'PLAN_STUDIO' && (
        <div className="flex flex-col gap-6">
          <Panel
            title={`Danh mục Kế hoạch Gian hàng theo KL (${plans.length} kế hoạch)`}
            flush
          >
            <DataTable
              columns={planColumns}
              rows={plans}
              rowKey={(p) => p.id}
              empty={
                <EmptyState
                  title="Chưa có kế hoạch gian hàng nào"
                  description="Bấm Tạo kế hoạch trên thanh trên để thiết lập kế hoạch mới."
                />
              }
            />
          </Panel>
        </div>
      )}

      {/* 5. MODAL TẠO / SỬA KẾ HOẠCH GIAN HÀNG */}
      <Modal
        open={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? `Chỉnh sửa kế hoạch: ${planFormData.storeName}` : 'Thiết lập Kế hoạch Gian hàng theo KL'}
        size="2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsPlanModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSavePlan}>
              Lưu kế hoạch
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-xs">
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-ink-2 mb-1">Tháng áp dụng</label>
              <Select
                aria-label="Tháng áp dụng"
                value={planFormData.monthKey}
                onChange={(e) => setPlanFormData({ ...planFormData, monthKey: e.target.value })}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-ink-2 mb-1">Gian hàng</label>
              <Select
                aria-label="Chọn gian hàng"
                value={planFormData.storeName}
                onChange={(e) => {
                  const sName = e.target.value;
                  const matched = availableStores.find((s) => s.storeName === sName);
                  setPlanFormData({
                    ...planFormData,
                    storeName: sName,
                    brandName: matched?.brandName || '',
                  });
                }}
              >
                <option value="">-- Chọn gian hàng --</option>
                {availableStores.map((s) => (
                  <option key={s.storeName} value={s.storeName}>
                    {s.storeName} ({s.brandName})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-2 mb-1">Người phụ trách (PIC)</label>
              <Select
                aria-label="Người phụ trách"
                value={planFormData.picName}
                onChange={(e) => setPlanFormData({ ...planFormData, picName: e.target.value })}
              >
                {availablePics.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block font-medium text-ink-2 mb-1">Trưởng nhóm (Leader)</label>
              <input
                type="text"
                value={planFormData.leaderName}
                onChange={(e) => setPlanFormData({ ...planFormData, leaderName: e.target.value })}
                placeholder="Nguyễn Thị Ngọc Tâm (nếu có)"
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-canvas text-ink"
              />
            </div>
          </div>

          {/* Chỉ tiêu tổng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-sunken rounded-lg border border-line">
            <div>
              <label className="block font-medium text-ink-2 mb-1">Chỉ tiêu NMV (VNĐ)</label>
              <input
                type="number"
                step="10000000"
                value={planFormData.targetNmv}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, targetNmv: Number(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-ink-2 mb-1">Ngân sách Net (VNĐ)</label>
              <input
                type="number"
                step="5000000"
                value={planFormData.targetBudget}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, targetBudget: Number(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-ink font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-ink-2 mb-1">Tổng số Video</label>
              <input
                type="number"
                value={planFormData.targetVideos}
                onChange={(e) =>
                  setPlanFormData({ ...planFormData, targetVideos: Number(e.target.value) || 0 })
                }
                className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-surface text-accent font-semibold"
              />
            </div>
          </div>

          {/* Bảng phân rã chi tiết theo từng KL */}
          <div className="border border-line rounded-xl overflow-hidden">
            <div className="px-3.5 py-2 bg-sunken font-semibold text-ink border-b border-line flex items-center justify-between">
              <span>Phân bổ chi tiết theo Phân tầng Khung lương (KL)</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-3 sticky top-0 border-b border-line">
                  <tr>
                    <th className="py-2 px-3">Khung lương (KL)</th>
                    <th className="py-2 px-3 text-right">Số video</th>
                    <th className="py-2 px-3 text-right">Đơn giá dự kiến (VNĐ)</th>
                    <th className="py-2 px-3 text-right">Tổng ngân sách KL (VNĐ)</th>
                    <th className="py-2 px-3 text-right">NMV dự kiến (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {planFormData.klDetails.map((klItem) => (
                    <tr key={klItem.kl} className="hover:bg-canvas">
                      <td className="py-2 px-3 font-semibold text-ink">{klItem.kl}</td>
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
                          className="w-16 px-2 py-1 text-right border border-line rounded bg-canvas font-semibold text-accent"
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
                          className="w-28 px-2 py-1 text-right border border-line rounded bg-canvas text-ink"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-ink">
                        {formatVndShort(klItem.allocatedBudget)}
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
                          className="w-28 px-2 py-1 text-right border border-line rounded bg-canvas text-positive"
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
            <label className="block font-medium text-ink-2 mb-1">Ghi chú chiến lược</label>
            <textarea
              rows={2}
              value={planFormData.notes}
              onChange={(e) => setPlanFormData({ ...planFormData, notes: e.target.value })}
              placeholder="Sản phẩm trọng tâm, lưu ý kịch bản, thời điểm Payday..."
              className="w-full px-2.5 py-1.5 border border-line rounded-lg text-xs bg-canvas text-ink"
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
            <Button variant="secondary" onClick={() => setDetailStoreName(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        <DataTable
          columns={modalColumns}
          rows={detailStoreBookings}
          rowKey={(b) => b.id}
          empty={
            <EmptyState
              title={`Chưa có video booking nào trong tháng ${selectedMonth}`}
              description="Các video được duyệt từ bảng 3.2 sẽ hiển thị tại đây khi phát sinh."
            />
          }
        />
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
