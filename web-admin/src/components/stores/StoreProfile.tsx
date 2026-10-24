'use client';

/**
 * Hồ sơ Gian hàng sàn — thiết kế theo Upbase Ops Design System (DESIGN_SYSTEM.md).
 * Tách bạch rõ bản chất dữ liệu:
 * 1. Thông tin định danh & cấu hình cố định của gian hàng (Mã SO, Sàn, Gói dịch vụ, Đội ngũ PIC, Sản phẩm SKU).
 * 2. Hồ sơ Kế hoạch & Báo cáo theo tháng (Monthly Plan & Report: NMV, Ngân sách Net/Gross, Sản lượng Video, ROAS)
 *    kèm khả năng drill-down trực tiếp xuống từng Plan tháng, Đề xuất KOC, từng Deal Booking (File 3.2) và Hợp đồng.
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  Pencil,
  Store,
  UserCheck,
  Video,
} from 'lucide-react';
import { INITIAL_STORE_ASSIGNMENT_HISTORY } from '../../lib/enterpriseMasterConfig';
import {
  type BookingDealItem,
  type BrandDetail,
  type InputPlanBreakdownState,
  type InputPlanRowItem,
  type SalaryGrade,
  type StorePortfolioItem,
  type UserProfile,
  normalizeStoreCoefficient,
} from '../../lib/types';
import { formatNumber, formatPercent, formatVnd, formatVndShort } from '../../lib/format';
import {
  Button,
  ChannelTag,
  DataTable,
  EmptyState,
  Modal,
  Pagination,
  Panel,
  Person,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  sharedTo,
  BrandAvatar,
} from '../ui';
import type { Column } from '../ui';
import { INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import {
  PROFILE_MONTH_OPTIONS,
  buildStoreMonthlyPlanReport,
  type StoreMonthlyBookingRecord,
  type StoreMonthlyPlanReport,
} from '../../lib/monthlyProfileMetrics';

export interface StoreProfileProps {
  store: StorePortfolioItem;
  brand?: BrandDetail;
  deals?: BookingDealItem[];
  monthlyPlans?: InputPlanBreakdownState[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  currentUser?: UserProfile | null;
  layout?: 'page' | 'modal';
  nav?: {
    onBack?: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    position?: number;
    total?: number;
  };
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onOpenHandover?: (store: StorePortfolioItem) => void;
  onOpenEdit?: (store: StorePortfolioItem) => void;
  onDrilldownToPlan?: (params: {
    planId?: string;
    storeId?: string;
    storeName: string;
    brandName: string;
    month: string;
  }) => void;
  onDrilldownToListing?: (params: {
    planId?: string;
    storeName: string;
    brandName: string;
    month: string;
    salaryGrade?: SalaryGrade;
  }) => void;
  onDrilldownToBooking?: (params: {
    storeName: string;
    brandName: string;
    month: string;
    dealCode?: string;
  }) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
}

type MonthlyDetailTab = 'PLAN_BREAKDOWN' | 'BOOKING_REPORT' | 'SELLER_AND_SKUS';

export function StoreProfile({
  store,
  brand,
  deals = [],
  monthlyPlans,
  selectedMonth: propSelectedMonth,
  onMonthChange,
  layout = 'page',
  nav,
  onNavigateToBrandProfile,
  onOpenHandover,
  onOpenEdit,
  onDrilldownToPlan,
  onDrilldownToListing,
  onDrilldownToBooking,
  onSelectDealForContract,
}: StoreProfileProps) {
  const [internalMonth, setInternalMonth] = useState<string>(propSelectedMonth || '2026/10');
  const activeMonth = propSelectedMonth || internalMonth;

  const handleMonthChange = (nextMonth: string) => {
    setInternalMonth(nextMonth);
    onMonthChange?.(nextMonth);
  };

  const [detailTab, setDetailTab] = useState<MonthlyDetailTab>('PLAN_BREAKDOWN');
  const [inspectedBooking, setInspectedBooking] = useState<StoreMonthlyBookingRecord | null>(null);
  const [bookingPage, setBookingPage] = useState<number>(1);
  const BOOKING_PAGE_SIZE = 25;

  // Lịch sử Hồ sơ Plan & Report qua các kỳ tháng (2026/11, 2026/10, 2026/09, 2026/08)
  const monthlyLedger = useMemo(() => {
    return PROFILE_MONTH_OPTIONS.map(m =>
      buildStoreMonthlyPlanReport(store, m.value, {
        plans: monthlyPlans,
        deals,
      })
    );
  }, [store, monthlyPlans, deals]);

  // Bản ghi Plan & Report của kỳ tháng đang chọn
  const currentMonthReport = useMemo(() => {
    return (
      monthlyLedger.find(r => r.month === activeMonth) ||
      buildStoreMonthlyPlanReport(store, activeMonth, {
        plans: monthlyPlans,
        deals,
      })
    );
  }, [monthlyLedger, activeMonth, store, monthlyPlans, deals]);

  // 2-tier team setup per Upbase B2C rule
  const leadB2c = 'Đặng Thị Yến Nhi';
  const hasLeader = store.hasBookingLeader && !!store.bookingLeader;
  const leaderName = hasLeader ? store.bookingLeader : undefined;
  const specialistPic =
    store.b2cOwnerName ||
    store.primaryPic ||
    (store.b2cOwners && store.b2cOwners[0]) ||
    'Lê Phương Thảo';
  const focSpecialist = 'Trần Thị Hảo';

  // Lịch sử phân công & bàn giao của riêng gian hàng này
  const storeAssignmentHistory = useMemo(() => {
    return INITIAL_STORE_ASSIGNMENT_HISTORY.filter(
      h => h.storeId === store.id || h.storeName === store.storeName
    );
  }, [store.id, store.storeName]);

  // Products linked to this store
  const storeProducts = useMemo(() => {
    const bNameLower = store.brandName.toLowerCase();
    const sNameLower = store.storeName.toLowerCase();

    const brandHeroes =
      brand?.heroProducts?.map(hp => ({
        id: hp.id,
        sku: hp.sku,
        productName: hp.productName,
        price: hp.price,
        commissionRate: hp.commissionRate || 15,
        sampleStock: hp.sampleStock || 50,
        pdpUrl: hp.pdpUrl || '',
      })) || [];

    const pushHeroes = INITIAL_PUSH_PRODUCTS.filter(
      p =>
        (p.brandName && p.brandName.toLowerCase().includes(bNameLower)) ||
        (p.storeName && p.storeName.toLowerCase().includes(sNameLower))
    ).map(p => ({
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      price: p.originalPrice,
      commissionRate: p.affiliateRate || 15,
      sampleStock: p.monthlySampleQuota || p.availableStock || 50,
      pdpUrl: p.pdpUrl || '',
    }));

    const combined = [...brandHeroes, ...pushHeroes];
    const seen = new Set<string>();
    return combined.filter(p => {
      const key = `${p.sku}-${p.productName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [store, brand]);

  // 1. Cột bảng Lịch sử Hồ sơ theo Tháng (Plan vs Report Ledger)
  const ledgerColumns: Column<StoreMonthlyPlanReport>[] = [
    {
      key: 'month',
      header: 'Kỳ tháng & Phiên bản Plan',
      width: 195,
      render: r => {
        const isSelected = r.month === activeMonth;
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-semibold ${isSelected ? 'text-accent' : 'text-ink'}`}>
                {r.monthLabel}
              </span>
              <span className="text-2xs font-code text-ink-3">
                · {r.versionCode}
              </span>
              {isSelected && <span className="text-2xs font-medium text-accent">· Đang xem</span>}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              {r.planStatusLabel} · PIC: {r.pic}
            </div>
          </div>
        );
      },
    },
    {
      key: 'nmv',
      header: 'Doanh số NMV (Plan vs Report)',
      align: 'right',
      width: 185,
      render: r => (
        <div className="leading-tight tabular-nums text-right">
          <div className="text-xs font-semibold text-ink">
            Report: {r.reportNmv > 0 ? formatVndShort(r.reportNmv) : '0 đ'}
          </div>
          <div className="text-2xs text-ink-3">
            Plan: {r.planNmv > 0 ? formatVndShort(r.planNmv) : '0 đ'}
            {r.planNmv > 0 && (
              <span
                className={`ml-1 font-medium ${
                  r.nmvAchievementPct >= 100
                    ? 'text-positive'
                    : r.nmvAchievementPct >= 70
                      ? 'text-accent'
                      : 'text-warning'
                }`}
              >
                ({Math.round(r.nmvAchievementPct)}%)
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Ngân sách Net (Plan vs Chi)',
      align: 'right',
      width: 185,
      render: r => (
        <div className="leading-tight tabular-nums text-right">
          <div
            className={`text-xs font-semibold ${
              r.isOverbudget || r.isUnbudgetedSpend ? 'text-critical' : 'text-ink'
            }`}
          >
            Chi: {r.reportSpentNet > 0 ? formatVndShort(r.reportSpentNet) : '0 đ'}
          </div>
          <div className="text-2xs text-ink-3">
            Plan Net: {r.planBudgetNet > 0 ? formatVndShort(r.planBudgetNet) : '0 đ'}
            {r.planBudgetNet > 0 && (
              <span className="ml-1">({Math.round(r.budgetBurnPct)}%)</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'videos',
      header: 'Sản lượng Video (Plan vs Air)',
      align: 'right',
      width: 175,
      render: r => (
        <div className="leading-tight tabular-nums text-right">
          <div className="text-xs font-semibold text-ink">
            Air: {formatNumber(r.reportAiredVideos)} · Book: {formatNumber(r.reportBookedVideos)}
          </div>
          <div className="text-2xs text-ink-3">
            Plan: {formatNumber(r.planTotalVideos)} ({r.planAffVideos} Aff · {r.planSelfVideos} Kênh · {r.planFocVideos} FOC)
          </div>
        </div>
      ),
    },
    {
      key: 'roas',
      header: 'ROAS & Đơn hàng',
      align: 'right',
      width: 135,
      render: r => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block text-xs font-semibold text-ink">
            {r.reportRoas > 0 ? `${r.reportRoas.toFixed(2)}x` : '—'}
          </span>
          <span className="block text-2xs text-ink-3">
            {r.reportOrders > 0 ? `${formatNumber(r.reportOrders)} đơn` : 'Chưa phát sinh'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Drill-down chi tiết',
      align: 'right',
      width: 190,
      render: r => (
        <div
          className="inline-flex items-center justify-end gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          {onDrilldownToPlan && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                onDrilldownToPlan({
                  planId: r.plan?.id,
                  storeId: store.id,
                  storeName: store.storeName,
                  brandName: store.brandName,
                  month: r.month,
                })
              }
            >
              Mở Plan
            </Button>
          )}
          {onDrilldownToBooking && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onDrilldownToBooking({
                  storeName: store.storeName,
                  brandName: store.brandName,
                  month: r.month,
                })
              }
            >
              Booking ({r.bookings.length})
            </Button>
          )}
        </div>
      ),
    },
  ];

  // 2. Cột bảng Phân rã Hạng mục Plan trong tháng (InputPlanRowItem)
  const planItemColumns: Column<InputPlanRowItem>[] = [
    {
      key: 'tier',
      header: 'Hạng mục / Khung lương KOC',
      width: 230,
      render: it => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs font-code font-semibold text-ink-2">
              {it.tierCode} ·
            </span>
            <span className="font-medium text-ink truncate">{it.tierLabel}</span>
          </div>
          <span className="block text-2xs text-ink-3 mt-0.5">
            {it.platform} · {it.contentFormat}
          </span>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Nhân sự thực thi',
      width: 150,
      render: it => <Person name={it.assignedStaff || currentMonthReport.pic} size={18} />,
    },
    {
      key: 'qty',
      header: 'Chỉ tiêu Plan',
      align: 'right',
      width: 110,
      render: it => (
        <span className="tabular-nums font-semibold text-ink">
          {formatNumber(it.qty)} video
        </span>
      ),
    },
    {
      key: 'unitCost',
      header: 'Đơn giá định mức',
      align: 'right',
      width: 130,
      render: it => (
        <span className="tabular-nums text-ink-2">
          {it.unitCost > 0 ? formatVnd(it.unitCost) : '0 đ (FOC)'}
        </span>
      ),
    },
    {
      key: 'totalBudget',
      header: 'Ngân sách Plan Net',
      align: 'right',
      width: 140,
      render: it => (
        <span className="tabular-nums font-medium text-ink">
          {it.totalBudget > 0 ? formatVnd(it.totalBudget) : '0 đ'}
        </span>
      ),
    },
    {
      key: 'targetGmv',
      header: 'Mục tiêu NMV/GMV',
      align: 'right',
      width: 140,
      render: it => (
        <span className="tabular-nums text-ink-2">
          {it.targetGmv > 0 ? formatVnd(it.targetGmv) : '—'}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      width: 130,
      render: it => {
        const grade = it.tierCode.startsWith('KL') ? (it.tierCode as SalaryGrade) : undefined;
        return onDrilldownToListing && grade ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onDrilldownToListing({
                planId: currentMonthReport.plan?.id,
                storeName: store.storeName,
                brandName: store.brandName,
                month: activeMonth,
                salaryGrade: grade,
              })
            }
          >
            Listing {grade}
          </Button>
        ) : null;
      },
    },
  ];

  // 3. Cột bảng Thực tế Booking & Kết quả Video trong tháng (StoreMonthlyBookingRecord)
  const bookingColumns: Column<StoreMonthlyBookingRecord>[] = [
    {
      key: 'dealCode',
      header: 'Mã Booking & KOC',
      width: 220,
      render: b => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-code text-xs font-semibold text-accent">{b.dealCode}</span>
            <span className="text-2xs font-code text-ink-3">
              · {b.kl}
            </span>
          </div>
          <div className="mt-1">
            <Person name={b.kocName} size={18} />
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Sản phẩm & Tuyến nội dung',
      width: 190,
      render: b => (
        <div className="min-w-0 leading-tight">
          <span className="block truncate font-medium text-ink text-xs">{b.productName}</span>
          <span className="block truncate text-2xs text-ink-3 mt-0.5">
            {b.videoType} · {b.weekLabel}
          </span>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Chi phí Net',
      align: 'right',
      width: 130,
      render: b => (
        <span className="tabular-nums font-medium text-ink">
          {b.costNet > 0 ? formatVnd(b.costNet) : '0 đ (FOC)'}
        </span>
      ),
    },
    {
      key: 'reportMetrics',
      header: 'Kết quả Report (GMV · Đơn · ROAS)',
      align: 'right',
      width: 200,
      render: b => (
        <div className="leading-tight tabular-nums text-right">
          <span className="block text-xs font-semibold text-ink">
            {b.gmv > 0 ? formatVnd(b.gmv) : 'Chưa ghi nhận GMV'}
          </span>
          <span className="block text-2xs text-ink-3">
            {b.orders > 0 ? `${formatNumber(b.orders)} đơn · ` : ''}
            {b.roas > 0 ? `ROAS ${b.roas.toFixed(2)}x` : `${formatNumber(b.views)} views`}
          </span>
        </div>
      ),
    },
    {
      key: 'video',
      header: 'Link bài Air',
      width: 120,
      render: b =>
        b.linkAir ? (
          <a
            href={b.linkAir}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-accent hover:underline inline-flex items-center gap-1 text-2xs font-medium"
          >
            <span>Xem video</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <span className="text-ink-3 text-2xs">Chưa lên bài</span>
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái & Nghiệm thu',
      width: 150,
      render: b => {
        const isPaid = b.paymentStatus.toLowerCase().includes('tất toán') || b.paymentStatus.toLowerCase().includes('thanh toán');
        return (
          <div className="space-y-0.5">
            <Status tone={isPaid ? 'positive' : 'info'}>{b.pipeline}</Status>
            <span className="block text-2xs text-ink-3">{b.paymentStatus}</span>
          </div>
        );
      },
    },
  ];

  // Product table columns
  interface ProductRow {
    id: string;
    sku: string;
    productName: string;
    price: number;
    commissionRate: number;
    sampleStock: number;
    pdpUrl: string;
  }

  const productColumns: Column<ProductRow>[] = [
    {
      key: 'name',
      header: 'Sản phẩm & SKU',
      render: r => (
        <div className="min-w-0 max-w-[320px]">
          <span className="block truncate font-medium text-ink">{r.productName}</span>
          <span className="block text-2xs text-ink-3 font-code">{r.sku}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Giá niêm yết',
      align: 'right',
      width: 130,
      render: r => <span className="tabular-nums font-medium text-ink">{formatVnd(r.price)}</span>,
    },
    {
      key: 'commission',
      header: 'Hoa hồng sàn',
      align: 'right',
      width: 120,
      render: r => <span className="tabular-nums text-ink-2 font-code">{r.commissionRate}%</span>,
    },
    {
      key: 'sample',
      header: 'Kho mẫu FOC',
      align: 'right',
      width: 120,
      render: r => (
        <span className="tabular-nums text-positive font-medium">
          {formatNumber(r.sampleStock)} suất
        </span>
      ),
    },
    {
      key: 'link',
      header: 'Link sàn',
      align: 'right',
      width: 90,
      render: r =>
        r.pdpUrl ? (
          <a
            href={r.pdpUrl}
            target="_blank"
            rel="noreferrer"
            className="text-ink-3 hover:text-ink inline-flex items-center gap-1 text-2xs font-medium"
            title="Xem trang sản phẩm trên sàn"
          >
            <span>Xem</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. THANH ĐIỀU HƯỚNG & BỘ CHỌN KỲ THÁNG */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {layout === 'page' && nav?.onBack && (
              <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.onBack}>
                Danh bạ gian hàng
              </Button>
            )}
            {layout === 'page' && nav?.position !== undefined && nav?.total !== undefined && (
              <div className="flex items-center gap-1 pl-2 border-l border-line text-2xs text-ink-3">
                <button
                  type="button"
                  disabled={!nav.onPrev}
                  onClick={nav.onPrev}
                  className="p-1 rounded hover:bg-sunken text-ink-3 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Gian hàng trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="tabular-nums font-medium">
                  {nav.position} / {nav.total}
                </span>
                <button
                  type="button"
                  disabled={!nav.onNext}
                  onClick={nav.onNext}
                  className="p-1 rounded hover:bg-sunken text-ink-3 hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Gian hàng sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-ink-2 bg-surface border border-line rounded-md px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-2xs font-medium text-ink-3">Kỳ hồ sơ:</span>
              <Select
                value={activeMonth}
                onChange={e => handleMonthChange(e.target.value)}
                className="w-48 border-0 bg-transparent h-6 text-xs font-semibold text-ink focus:ring-0 px-1"
              >
                {PROFILE_MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            {onDrilldownToPlan && (
              <Button
                variant="primary"
                size="sm"
                icon={FileSpreadsheet}
                onClick={() =>
                  onDrilldownToPlan({
                    planId: currentMonthReport.plan?.id,
                    storeId: store.id,
                    storeName: store.storeName,
                    brandName: store.brandName,
                    month: activeMonth,
                  })
                }
              >
                Chi tiết Plan ({activeMonth})
              </Button>
            )}

            {onDrilldownToBooking && (
              <Button
                variant="secondary"
                size="sm"
                icon={Video}
                onClick={() =>
                  onDrilldownToBooking({
                    storeName: store.storeName,
                    brandName: store.brandName,
                    month: activeMonth,
                  })
                }
              >
                Mở Booking ({currentMonthReport.bookings.length})
              </Button>
            )}

            {store.storeUrl && (
              <Button
                variant="secondary"
                size="sm"
                icon={ExternalLink}
                onClick={() => window.open(store.storeUrl, '_blank', 'noreferrer')}
              >
                Mở link sàn
              </Button>
            )}
            {onOpenEdit && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => onOpenEdit(store)}>
                Thông số tĩnh
              </Button>
            )}
            {onOpenHandover && (
              <Button variant="secondary" size="sm" icon={UserCheck} onClick={() => onOpenHandover(store)}>
                Bàn giao PIC
              </Button>
            )}
          </div>
        </div>

        {/* Định danh cố định của Gian hàng (Không gắn cứng NMV hay Ngân sách vào định danh tĩnh) */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <BrandAvatar
              brandName={store.brandName}
              brandId={store.brandId}
              size={40}
              rounded="lg"
              fallback={
                <div className="w-10 h-10 rounded-lg bg-sunken border border-line flex items-center justify-center text-ink shrink-0 mt-0.5">
                  <Store className="w-5 h-5 text-ink-2" />
                </div>
              }
            />

            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-base sm:text-lg font-semibold text-ink truncate"
                  style={layout === 'page' ? sharedTo('store-title') : undefined}
                >
                  {store.storeName}
                </h2>
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <ChannelTag channel={store.platform} />
                  {store.operationStatus === 'Live' || store.accountStatus === 'ACTIVE' ? (
                    <Status tone="positive">Đang vận hành</Status>
                  ) : (
                    <Status tone="neutral">Dừng hợp tác</Status>
                  )}
                </div>
                <span className="text-2xs text-ink-3 font-medium whitespace-nowrap">
                  · Kỳ {currentMonthReport.monthLabel} · Plan <span className="font-mono text-ink-2 font-medium">{currentMonthReport.versionCode}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-2xs text-ink-3 flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium text-ink bg-sunken px-2 py-0.5 rounded border border-line whitespace-nowrap">
                  <Building2 className="w-3 h-3 text-ink-3 shrink-0" />
                  {onNavigateToBrandProfile ? (
                    <button
                      type="button"
                      onClick={() => onNavigateToBrandProfile(store.brandName)}
                      className="hover:text-accent hover:underline text-ink"
                    >
                      {store.brandName}
                    </button>
                  ) : (
                    <span>{store.brandName}</span>
                  )}
                </span>
                <span className="bg-sunken px-2 py-0.5 rounded border border-line whitespace-nowrap text-ink-2">
                  Mã SO: <strong className="font-mono text-ink">{store.storeOperationId || store.id}</strong>
                </span>
                <span className="bg-sunken px-2 py-0.5 rounded border border-line whitespace-nowrap text-ink-2">
                  Gói: <strong className="text-ink font-medium">{store.servicePackage || 'E2E-S'}</strong>
                </span>
                <span className="bg-sunken px-2 py-0.5 rounded border border-line whitespace-nowrap text-ink-2">
                  Hoa hồng: <strong className="font-mono text-ink">{store.affiliateRate || 15}%</strong>
                </span>
                <span className="bg-sunken px-2 py-0.5 rounded border border-line inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2">
                  <span className="text-ink-3">PIC:</span>
                  <strong className="text-ink font-medium">{specialistPic}</strong>
                </span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* 2. BỐ CỤC 2 CỘT: CỘT CHÍNH (HỒ SƠ PLAN & REPORT THEO THÁNG) + CỘT PHỤ (THÔNG SỐ TĨNH & ĐỘI NGŨ) */}
      <div className={`flex flex-col ${layout === 'modal' ? 'xl:flex-row' : 'lg:flex-row'} gap-6 items-start`}>
        {/* CỘT CHÍNH: QUẢN LÝ HỒ SƠ KẾ HOẠCH (PLAN) & BÁO CÁO (REPORT) THEO THÁNG */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* 2.1 Bảng tổng hợp Lịch sử Plan & Report qua các tháng */}
          <Panel
            title="Hồ sơ Kế hoạch &amp; Báo cáo thực thi theo tháng"
            flush
          >
            <DataTable
              columns={ledgerColumns}
              rows={monthlyLedger}
              rowKey={r => r.month}
              onRowClick={r => handleMonthChange(r.month)}
            />
          </Panel>

          {/* 2.2 Chỉ số Đối soát Plan vs Report của Kỳ tháng đang chọn */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-ink">
                  Đối soát Plan vs Report — {currentMonthReport.monthLabel}
                </h3>
                <Status
                  tone={
                    currentMonthReport.isOverbudget
                      ? 'critical'
                      : currentMonthReport.isUnbudgetedSpend
                        ? 'warning'
                        : currentMonthReport.planStatus === 'COMPLETED' ||
                            currentMonthReport.planStatus === 'IN_EXECUTION'
                          ? 'positive'
                          : currentMonthReport.planStatus === 'REVISION_REQUESTED'
                            ? 'critical'
                            : 'info'
                  }
                >
                  {currentMonthReport.isOverbudget
                    ? 'Vượt trần ngân sách tháng'
                    : currentMonthReport.isUnbudgetedSpend
                      ? 'Chi ngoài kế hoạch (Plan 0đ)'
                      : `${currentMonthReport.planStatusLabel} (${currentMonthReport.versionCode})`}
                </Status>
                {(currentMonthReport.isOverbudget || currentMonthReport.isUnbudgetedSpend) && (
                  <span className="text-2xs text-ink-3">
                    · {currentMonthReport.planStatusLabel} (<span className="font-code">{currentMonthReport.versionCode}</span>)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-2xs">
                {onDrilldownToPlan && (
                  <button
                    type="button"
                    onClick={() =>
                      onDrilldownToPlan({
                        planId: currentMonthReport.plan?.id,
                        storeId: store.id,
                        storeName: store.storeName,
                        brandName: store.brandName,
                        month: activeMonth,
                      })
                    }
                    className="text-accent hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <span>Mở Studio phân rã Plan {activeMonth}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <StatRow>
              <Stat
                label={`Doanh số NMV (${activeMonth})`}
                value={
                  currentMonthReport.reportNmv > 0
                    ? formatVndShort(currentMonthReport.reportNmv)
                    : '0 đ'
                }
                progress={
                  currentMonthReport.planNmv > 0
                    ? {
                        value: currentMonthReport.reportNmv,
                        max: currentMonthReport.planNmv,
                      }
                    : undefined
                }
                note={`Plan giao: ${
                  currentMonthReport.planNmv > 0
                    ? formatVndShort(currentMonthReport.planNmv)
                    : '0 đ'
                }${
                  currentMonthReport.planNmv > 0
                    ? ` · Đạt ${formatPercent(currentMonthReport.nmvAchievementPct / 100, 0)}`
                    : ''
                }`}
                tone={
                  currentMonthReport.nmvAchievementPct >= 100
                    ? 'positive'
                    : currentMonthReport.reportNmv > 0
                      ? 'warning'
                      : undefined
                }
              />

              <Stat
                label={`Ngân sách Net (${activeMonth})`}
                value={
                  currentMonthReport.reportSpentNet > 0
                    ? formatVndShort(currentMonthReport.reportSpentNet)
                    : '0 đ'
                }
                progress={{
                  value: currentMonthReport.reportSpentNet,
                  max: currentMonthReport.planBudgetNet || 1,
                  invert: currentMonthReport.reportSpentNet > currentMonthReport.planBudgetNet,
                }}
                note={`Plan Net: ${formatVndShort(currentMonthReport.planBudgetNet)} (Gross: ${formatVndShort(
                  currentMonthReport.planBudgetGross
                )})`}
                tone={
                  currentMonthReport.isOverbudget
                    ? 'critical'
                    : currentMonthReport.isUnbudgetedSpend
                      ? 'warning'
                      : 'positive'
                }
              />

              <Stat
                label={`Sản lượng Video (${activeMonth})`}
                value={`${formatNumber(currentMonthReport.reportAiredVideos)} / ${formatNumber(
                  currentMonthReport.planTotalVideos
                )} video`}
                progress={
                  currentMonthReport.planTotalVideos > 0
                    ? {
                        value: currentMonthReport.reportAiredVideos,
                        max: currentMonthReport.planTotalVideos,
                      }
                    : undefined
                }
                note={`Đã book: ${formatNumber(currentMonthReport.reportBookedVideos)} deal · Plan: ${
                  currentMonthReport.planAffVideos
                } Aff · ${currentMonthReport.planSelfVideos} Kênh · ${currentMonthReport.planFocVideos} FOC`}
              />

              <Stat
                label={`Hiệu suất Report (${activeMonth})`}
                value={
                  currentMonthReport.reportRoas > 0
                    ? `ROAS ${currentMonthReport.reportRoas.toFixed(2)}x`
                    : 'Chưa có ROAS'
                }
                note={`${formatNumber(currentMonthReport.reportOrders)} đơn hàng · ${formatNumber(
                  currentMonthReport.reportViews
                )} lượt xem`}
              />
            </StatRow>
          </div>

          {/* 2.3 Phân khu Drill-down Chi tiết trong kỳ tháng đang chọn */}
          <Tabs<MonthlyDetailTab>
            value={detailTab}
            onChange={setDetailTab}
            items={[
              {
                key: 'PLAN_BREAKDOWN',
                label: `Chi tiết Kế hoạch (Plan ${activeMonth})`,
                count: currentMonthReport.planItems.length || 3,
              },
              {
                key: 'BOOKING_REPORT',
                label: `Thực tế Booking & Video (Report ${activeMonth})`,
                count: currentMonthReport.bookings.length,
              },
              {
                key: 'SELLER_AND_SKUS',
                label: 'Chiến dịch Seller Ads & Sản phẩm SKU',
                count: currentMonthReport.adsCampaigns.length + storeProducts.length,
              },
            ]}
          />

          {/* TAB A: CHI TIẾT PHÂN BỔ PLAN CỦA THÁNG */}
          {detailTab === 'PLAN_BREAKDOWN' && (
            <div className="space-y-6">
              <Panel
                title={`Cơ cấu phân bổ Ngân sách & Chỉ tiêu Plan (${currentMonthReport.monthLabel})`}
                actions={
                  <div className="flex items-center gap-2">
                    {onDrilldownToListing && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Layers}
                        onClick={() =>
                          onDrilldownToListing({
                            planId: currentMonthReport.plan?.id,
                            storeName: store.storeName,
                            brandName: store.brandName,
                            month: activeMonth,
                          })
                        }
                      >
                        Mở Đề xuất KOC (Listing)
                      </Button>
                    )}
                    {onDrilldownToPlan && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={FileSpreadsheet}
                        onClick={() =>
                          onDrilldownToPlan({
                            planId: currentMonthReport.plan?.id,
                            storeId: store.id,
                            storeName: store.storeName,
                            brandName: store.brandName,
                            month: activeMonth,
                          })
                        }
                      >
                        Mở Studio Plan 4.1.1
                      </Button>
                    )}
                  </div>
                }
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1">
                    <span className="text-2xs text-ink-3">1. Video KOC Affiliate (Paid)</span>
                    <div className="text-sm font-semibold text-ink">
                      {formatVndShort(currentMonthReport.planAffBudgetNet)}
                    </div>
                    <div className="text-2xs text-ink-2">
                      Plan: <strong className="tabular-nums">{formatNumber(currentMonthReport.planAffVideos)}</strong> video
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1">
                    <span className="text-2xs text-ink-3">2. Video kênh Brand (Self-channel)</span>
                    <div className="text-sm font-semibold text-ink">
                      {formatVndShort(currentMonthReport.planSelfBudgetNet)}
                    </div>
                    <div className="text-2xs text-ink-2">
                      Plan: <strong className="tabular-nums">{formatNumber(currentMonthReport.planSelfVideos)}</strong> video
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1">
                    <span className="text-2xs text-ink-3">3. Suất gửi mẫu miễn phí (FOC)</span>
                    <div className="text-sm font-semibold text-ink">0 đ</div>
                    <div className="text-2xs text-ink-2">
                      Plan: <strong className="tabular-nums">{formatNumber(currentMonthReport.planFocVideos)}</strong> suất
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1">
                    <span className="text-2xs text-ink-3">4. Gói ngân sách Media Ads</span>
                    <div className="text-sm font-semibold text-ink">
                      {formatVndShort(currentMonthReport.planAdsBudget)}
                    </div>
                    <div className="text-2xs text-ink-2">
                      Thực chi Ads: <strong className="tabular-nums">{formatVndShort(currentMonthReport.adsCost)}</strong>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title={`Bảng phân rã hạng mục Plan theo khung lương (${currentMonthReport.monthLabel})`}
                flush
              >
                {currentMonthReport.planItems.length === 0 ? (
                  <EmptyState
                    title={`Chưa có dòng phân rã chi tiết cho kỳ ${activeMonth}`}
                    description="Gian hàng hiện đang ở hạn mức 0đ hoặc chưa lập bảng phân rã khung lương chi tiết."
                    action={
                      onDrilldownToPlan && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            onDrilldownToPlan({
                              planId: currentMonthReport.plan?.id,
                              storeId: store.id,
                              storeName: store.storeName,
                              brandName: store.brandName,
                              month: activeMonth,
                            })
                          }
                        >
                          Lập phân rã trong Kế hoạch tháng
                        </Button>
                      )
                    }
                  />
                ) : (
                  <DataTable
                    columns={planItemColumns}
                    rows={currentMonthReport.planItems}
                    rowKey={r => r.id}
                  />
                )}
              </Panel>
            </div>
          )}

          {/* TAB B: THỰC TẾ BOOKING & VIDEO ĐÃ DUYỆT TRONG THÁNG */}
          {detailTab === 'BOOKING_REPORT' && (
            <Panel
              title={`Danh sách Deal Booking & Báo cáo Video (${currentMonthReport.monthLabel})`}
              actions={
                onDrilldownToBooking && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Video}
                    onClick={() =>
                      onDrilldownToBooking({
                        storeName: store.storeName,
                        brandName: store.brandName,
                        month: activeMonth,
                      })
                    }
                  >
                    Xem tất cả trong Quản lý Booking
                  </Button>
                )
              }
              flush
            >
              {currentMonthReport.bookings.length === 0 ? (
                <EmptyState
                  title={`Chưa có booking trong kỳ ${activeMonth}`}
                  description="Chưa có deal KOC nào được ghi nhận cho gian hàng này trong kỳ tháng đang chọn."
                />
              ) : (
                <>
                <DataTable
                  columns={bookingColumns}
                  rows={currentMonthReport.bookings.slice((bookingPage - 1) * BOOKING_PAGE_SIZE, bookingPage * BOOKING_PAGE_SIZE)}
                  rowKey={b => b.id}
                  onRowClick={b => setInspectedBooking(b)}
                />
                <Pagination
                  page={bookingPage}
                  pageSize={BOOKING_PAGE_SIZE}
                  total={currentMonthReport.bookings.length}
                  onPageChange={setBookingPage}
                />
                </>
              )}
            </Panel>
          )}

          {/* TAB C: CHIẾN DỊCH SELLER ADS & SẢN PHẨM CHỦ LỰC */}
          {detailTab === 'SELLER_AND_SKUS' && (
            <div className="space-y-6">
              {currentMonthReport.adsCampaigns.length > 0 && (
                <Panel
                  title={`Báo cáo Chiến dịch Quảng cáo TikTok Seller (${currentMonthReport.adsCampaigns.length} chiến dịch)`}
                  flush
                >
                  <DataTable
                    columns={[
                      {
                        key: 'campaignName',
                        header: 'Tên chiến dịch Seller',
                        render: c => (
                          <div>
                            <span className="font-medium text-ink block">{c.campaignName}</span>
                            <span className="text-2xs text-ink-3 font-code">ID: {c.campaignId}</span>
                          </div>
                        ),
                      },
                      {
                        key: 'cost',
                        header: 'Chi phí Ads',
                        align: 'right',
                        width: 130,
                        render: c => <span className="tabular-nums font-medium text-ink">{formatVnd(c.cost)}</span>,
                      },
                      {
                        key: 'gmv',
                        header: 'Doanh số GMV Ads',
                        align: 'right',
                        width: 145,
                        render: c => <span className="tabular-nums font-semibold text-positive">{formatVnd(c.gmv)}</span>,
                      },
                      {
                        key: 'orders',
                        header: 'Đơn hàng',
                        align: 'right',
                        width: 100,
                        render: c => <span className="tabular-nums text-ink">{formatNumber(c.orders)}</span>,
                      },
                      {
                        key: 'roas',
                        header: 'ROAS',
                        align: 'right',
                        width: 100,
                        render: c => <span className="tabular-nums font-code font-semibold text-ink">{c.roas.toFixed(2)}x</span>,
                      },
                    ]}
                    rows={currentMonthReport.adsCampaigns}
                    rowKey={c => c.campaignId}
                  />
                </Panel>
              )}

              <Panel
                title="Sản phẩm chủ lực & kho mẫu FOC của gian hàng"
                flush
              >
                {storeProducts.length === 0 ? (
                  <EmptyState
                    title="Chưa có sản phẩm chủ lực"
                    description="Chưa ghi nhận danh mục sản phẩm trọng tâm cho gian hàng này."
                  />
                ) : (
                  <DataTable columns={productColumns} rows={storeProducts} rowKey={r => r.id} />
                )}
              </Panel>
            </div>
          )}
        </div>

        {/* CỘT PHỤ BÊN PHẢI: THÔNG TIN TĨNH CỦA GIAN HÀNG & ĐỘI NGŨ PHỤ TRÁCH */}
        <div className={`w-full ${layout === 'modal' ? 'xl:w-[320px]' : 'lg:w-[340px]'} shrink-0 space-y-6`}>
          {/* Đội ngũ phụ trách */}
          <Panel
            title="Đội ngũ phụ trách"
            actions={
              onOpenHandover && (
                <Button size="sm" icon={UserCheck} onClick={() => onOpenHandover(store)}>
                  Bàn giao
                </Button>
              )
            }
          >
            <div className="space-y-3">
              <div>
                <span className="block text-2xs text-ink-3 mb-1">Trưởng phòng B2C (Chung 69 gian)</span>
                <Person name={leadB2c} />
              </div>

              <div>
                <span className="block text-2xs text-ink-3 mb-1">Trưởng nhóm phụ trách</span>
                {hasLeader ? (
                  <Person name={leaderName || ''} />
                ) : (
                  <span className="text-2xs text-ink-3">Không có trưởng nhóm — Trực tiếp Trưởng phòng</span>
                )}
              </div>

              <div>
                <span className="block text-2xs text-ink-3 mb-1">Chuyên viên Booking chính (PIC)</span>
                <Person name={specialistPic} />
              </div>

              <div>
                <span className="block text-2xs text-ink-3 mb-1">Chuyên viên gửi mẫu FOC</span>
                <Person name={focSpecialist} />
              </div>

              <div>
                <span className="block text-2xs text-ink-3 mb-1">Quản lý quan hệ Brand (Account PIC)</span>
                {store.accountOwnerName ? (
                  <Person name={store.accountOwnerName} />
                ) : (
                  <span className="text-ink-3 text-2xs">—</span>
                )}
              </div>

              {store.handoverEffectiveDate && (
                <div className="mt-3 p-2.5 rounded-md bg-sunken border border-line text-2xs text-ink-2 space-y-0.5">
                  <span className="font-medium text-ink">Lệnh bàn giao đang áp dụng</span>
                  <p>
                    Từ {store.previousPic || 'Chuyên viên trước'} sang {specialistPic}, hiệu lực từ{' '}
                    {store.handoverEffectiveDate}.
                  </p>
                </div>
              )}

              {storeAssignmentHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line space-y-2">
                  <span className="block text-2xs font-semibold text-ink">
                    Lịch sử phân công & bàn giao ({storeAssignmentHistory.length})
                  </span>
                  <ol className="space-y-1.5">
                    {storeAssignmentHistory.map((h) => (
                      <li key={h.id} className="text-2xs p-2 rounded bg-sunken/60 border border-line space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink">{h.staffName}</span>
                          <span className="font-mono text-ink-3">{h.effectiveDate}</span>
                        </div>
                        <div className="text-ink-3">
                          {h.action === 'ASSIGNED' ? 'Bổ nhiệm' : h.action === 'REASSIGNED' ? 'Điều chuyển' : 'Ủy quyền Backup'}
                          {h.reason ? ` · ${h.reason}` : ''}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </Panel>

          {/* Thông số kỹ thuật cố định của gian hàng */}
          <Panel
            title="Thông số định danh cố định"
            actions={
              onOpenEdit && (
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onOpenEdit(store)}>
                  Sửa
                </Button>
              )
            }
          >
            <dl className="divide-y divide-line text-xs">
              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Nền tảng sàn</dt>
                <dd>
                  <ChannelTag channel={store.platform} />
                </dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Mã vận hành Upbase</dt>
                <dd className="font-code font-medium text-ink">{store.storeOperationId || store.id}</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Shop ID kỹ thuật</dt>
                <dd className="font-code text-ink">{store.platformStoreId || '—'}</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Gói dịch vụ</dt>
                <dd className="text-ink font-medium">{store.servicePackage || 'E2E-S'}</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Hệ số gian hàng</dt>
                <dd className="text-ink font-medium">
                  {normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier).tier}{' '}
                  <span className="font-mono font-semibold text-ink-2">
                    · ×{normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier).label}
                  </span>
                </dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Hoa hồng sàn mặc định</dt>
                <dd className="font-code text-ink">{store.affiliateRate || 15}%</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Ủy quyền mã Spark Ads</dt>
                <dd className="text-ink">{store.requiresSparkAds ? 'Bắt buộc' : 'Không bắt buộc'}</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Phạm vi quản trị</dt>
                <dd className="text-ink">
                  {store.isB2cManaged !== false ? 'B2C phụ trách (= 1)' : 'Gian hàng ngoài'}
                </dd>
              </div>
            </dl>
          </Panel>

          {store.assignmentNotes && (
            <Panel title="Ghi chú phân công">
              <p className="text-2xs text-ink-2 leading-relaxed whitespace-pre-line">
                {store.assignmentNotes}
              </p>
            </Panel>
          )}
        </div>
      </div>

      {/* HỘP THOẠI DRILL-DOWN CHI TIẾT 1 DEAL BOOKING & BÁO CÁO VIDEO */}
      {inspectedBooking && (
        <Modal
          open={Boolean(inspectedBooking)}
          onClose={() => setInspectedBooking(null)}
          title={`Chi tiết Booking [${inspectedBooking.dealCode}] — ${inspectedBooking.kocName}`}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setInspectedBooking(null)}>
                Đóng
              </Button>
              {inspectedBooking.sourceDeal && onSelectDealForContract && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const deal = inspectedBooking.sourceDeal!;
                    setInspectedBooking(null);
                    onSelectDealForContract(deal);
                  }}
                >
                  Mở Hợp đồng &amp; Thanh toán
                </Button>
              )}
              {onDrilldownToBooking && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const code = inspectedBooking.dealCode;
                    setInspectedBooking(null);
                    onDrilldownToBooking({
                      storeName: store.storeName,
                      brandName: store.brandName,
                      month: activeMonth,
                      dealCode: code,
                    });
                  }}
                >
                  Mở trong Quản lý Booking
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <StatRow>
              <Stat
                label="Chi phí Booking (Net)"
                value={inspectedBooking.costNet > 0 ? formatVnd(inspectedBooking.costNet) : '0 đ (FOC)'}
                note={`Khung lương: ${inspectedBooking.kl} · ${inspectedBooking.format}`}
              />
              <Stat
                label="Doanh số GMV tạo ra"
                value={inspectedBooking.gmv > 0 ? formatVnd(inspectedBooking.gmv) : '0 đ'}
                note={`${formatNumber(inspectedBooking.orders)} đơn hàng`}
                tone={inspectedBooking.gmv > 0 ? 'positive' : undefined}
              />
              <Stat
                label="Hiệu suất ROAS & Views"
                value={inspectedBooking.roas > 0 ? `${inspectedBooking.roas.toFixed(2)}x` : '—'}
                note={`${formatNumber(inspectedBooking.views)} lượt xem`}
              />
            </StatRow>

            <div className="rounded-lg border border-line bg-canvas/50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-2xs text-ink-3 block">Creator / Kênh KOC</span>
                <span className="font-semibold text-ink">
                  {inspectedBooking.kocName} ({inspectedBooking.channelId})
                </span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Sản phẩm &amp; Định dạng</span>
                <span className="font-medium text-ink">
                  {inspectedBooking.productName} · {inspectedBooking.videoType}
                </span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Chuyên viên Booking (PIC)</span>
                <Person name={inspectedBooking.pic} size={18} />
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Tiến độ &amp; Thanh toán</span>
                <span className="font-medium text-ink">
                  {inspectedBooking.pipeline} · {inspectedBooking.paymentStatus}
                </span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Ngày lên sóng (Air Date)</span>
                <span className="font-code text-ink">
                  {inspectedBooking.airDate || 'Chưa ghi nhận'} ({inspectedBooking.weekLabel})
                </span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Link bài đăng thực tế</span>
                {inspectedBooking.linkAir ? (
                  <a
                    href={inspectedBooking.linkAir}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <span>Mở video trên sàn</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-ink-3">Chưa có link air</span>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
