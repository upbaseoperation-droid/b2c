'use client';

/**
 * Hồ sơ một gian hàng sàn — thiết kế theo Upbase Ops Design System (DESIGN_SYSTEM.md).
 * Bố cục hai cột:
 * - Cột chính: Chỉ số vận hành, trần ngân sách Net, Kế hoạch & phân bổ Order (File 4.1), Sản phẩm chủ lực (Hero SKUs), Thực tế Booking (File 3.2).
 * - Cột phụ: Đội ngũ phụ trách (Cơ cấu 2 tầng: Trưởng phòng Đặng Thị Yến Nhi, Trưởng nhóm Nguyễn Thị Ngọc Tâm, Chuyên viên PIC, FOC Trần Thị Hảo), Thông số kỹ thuật sàn, Lịch sử phân công & bàn giao.
 */

import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Store,
  UserCheck
} from 'lucide-react';
import type { BookingDealItem, BrandDetail, StorePortfolioItem, UserProfile } from '../../lib/types';
import { formatNumber, formatPercent, formatVnd, formatVndShort } from '../../lib/format';
import { Button, ChannelTag, DataTable, EmptyState, Panel, Person, Stat, StatRow, Status, sharedTo } from '../ui';
import type { Column } from '../ui';
import { INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';

export interface StoreProfileProps {
  store: StorePortfolioItem;
  brand?: BrandDetail;
  deals?: BookingDealItem[];
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
}

export function StoreProfile({
  store,
  brand,
  deals = [],
  layout = 'page',
  nav,
  onNavigateToBrandProfile,
  onOpenHandover,
  onOpenEdit
}: StoreProfileProps) {
  // Budget & spent calculations
  const budgetNet = store.budgetNet ?? store.monthlyBudget ?? 0;
  const storeDeals = useMemo(() => {
    const sName = store.storeName.toLowerCase();
    const bName = store.brandName.toLowerCase();
    return deals.filter(d => 
      (d.storeName && d.storeName.toLowerCase() === sName) ||
      (d.storeId && (d.storeId === store.id || d.storeId === store.storeOperationId)) ||
      (!d.storeName && d.brandName && d.brandName.toLowerCase() === bName)
    );
  }, [store, deals]);

  const spentFromDeals = storeDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
  const spent = store.actualSpentNet ?? (spentFromDeals > 0 ? spentFromDeals : 0);
  const isOverbudget = budgetNet > 0 && spent > budgetNet;
  const isUnbudgetedSpend = budgetNet === 0 && spent > 0;

  // Target contents
  const targetVideos = (store.targetAffiliateContents || 0) + (store.targetSelfChannelContents || 0) + (store.targetFocVideos || 0);

  // 2-tier team setup per Upbase B2C rule
  const leadB2c = 'Đặng Thị Yến Nhi';
  const hasLeader = store.hasBookingLeader && !!store.bookingLeader;
  const leaderName = hasLeader ? store.bookingLeader : undefined;
  const specialistPic = store.b2cOwnerName || store.primaryPic || (store.b2cOwners && store.b2cOwners[0]) || 'Lê Phương Thảo';
  const focSpecialist = 'Trần Thị Hảo';

  // Products linked to this store
  const storeProducts = useMemo(() => {
    const bNameLower = store.brandName.toLowerCase();
    const sNameLower = store.storeName.toLowerCase();

    const brandHeroes = brand?.heroProducts?.map(hp => ({
      id: hp.id,
      sku: hp.sku,
      productName: hp.productName,
      price: hp.price,
      commissionRate: hp.commissionRate || 15,
      sampleStock: hp.sampleStock || 50,
      pdpUrl: hp.pdpUrl || '',
    })) || [];

    const pushHeroes = INITIAL_PUSH_PRODUCTS.filter(p => 
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
      )
    },
    {
      key: 'price',
      header: 'Giá niêm yết',
      align: 'right',
      width: 130,
      render: r => <span className="tabular-nums font-medium text-ink">{formatVnd(r.price)}</span>
    },
    {
      key: 'commission',
      header: 'Hoa hồng sàn',
      align: 'right',
      width: 120,
      render: r => <span className="tabular-nums text-ink-2 font-code">{r.commissionRate}%</span>
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
      )
    },
    {
      key: 'link',
      header: 'Link sàn',
      align: 'right',
      width: 90,
      render: r => r.pdpUrl ? (
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
      ) : <span className="text-ink-3">—</span>
    }
  ];

  // Deal table columns
  const dealColumns: Column<BookingDealItem>[] = [
    {
      key: 'koc',
      header: 'Creator / KOC',
      render: d => (
        <div className="min-w-0">
          <Person name={d.kocStageName} size={20} />
          {d.campaignTitle && (
            <span className="block truncate text-2xs text-ink-3 mt-0.5">{d.campaignTitle}</span>
          )}
        </div>
      )
    },
    {
      key: 'cost',
      header: 'Chi phí thỏa thuận',
      align: 'right',
      width: 150,
      render: d => {
        const val = d.totalValue || 0;
        return <span className="tabular-nums font-medium text-ink">{formatVnd(val)}</span>;
      }
    },
    {
      key: 'video',
      header: 'Link video',
      width: 130,
      render: d => {
        const link = d.videoUrl || d.tiktokVideoUrl || '';
        return link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1 text-2xs font-medium truncate max-w-[120px]"
          >
            <span>Video live</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <span className="text-ink-3 text-2xs">Chưa lên bài</span>
        );
      }
    },
    {
      key: 'status',
      header: 'Trạng thái deal',
      width: 130,
      render: d => {
        const isDone = d.status === 'COMPLETED' || d.status === 'FINAL_PAID';
        const isPending = d.status === 'DRAFT' || d.status === 'SCRIPT_PENDING' || d.status === 'TERMS_AGREED';
        return isDone ? (
          <Status tone="positive">Hoàn tất</Status>
        ) : isPending ? (
          <Status tone="warning">Chờ duyệt</Status>
        ) : (
          <Status tone="info">Đang chạy</Status>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. HEADER PROFILE BAR */}
      <div className="space-y-3">
        {/* Navigation & Controls */}
        {layout === 'page' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {nav?.onBack && (
                <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.onBack}>
                  Hồ sơ gian hàng
                </Button>
              )}
              {nav?.position !== undefined && nav?.total !== undefined && (
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
                  <span className="tabular-nums font-medium">{nav.position} / {nav.total}</span>
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

            <div className="flex items-center gap-2">
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
                  Sửa thông số
                </Button>
              )}
              {onOpenHandover && (
                <Button variant="primary" size="sm" icon={UserCheck} onClick={() => onOpenHandover(store)}>
                  Lập lệnh bàn giao
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Identity & Status */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-sunken border border-line flex items-center justify-center text-ink shrink-0 mt-0.5">
              <Store className="w-5 h-5 text-ink-2" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tên chuyển cảnh khớp với hàng trong StoreManagementView */}
                <h2 className="text-lg font-semibold text-ink truncate" style={layout === 'page' ? sharedTo('store-title') : undefined}>
                  {store.storeName}
                </h2>
                <ChannelTag channel={store.platform} />
                {store.operationStatus === 'Live' || store.accountStatus === 'ACTIVE' ? (
                  <Status tone="positive">Đang chạy</Status>
                ) : (
                  <Status tone="neutral">Dừng hợp tác</Status>
                )}
                {isOverbudget ? (
                  <Status tone="critical">Bội chi</Status>
                ) : isUnbudgetedSpend ? (
                  <Status tone="warning">Chi ngoài kế hoạch</Status>
                ) : budgetNet === 0 ? (
                  <Status tone="neutral">Chỉ gửi mẫu 0 đ</Status>
                ) : (
                  <Status tone="positive">Ngân sách an toàn</Status>
                )}
              </div>

              <div className="flex items-center gap-2 text-2xs text-ink-3 flex-wrap">
                <span>Thuộc nhãn hàng</span>
                {onNavigateToBrandProfile ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToBrandProfile(store.brandName)}
                    className="font-medium text-ink hover:text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <Building2 className="w-3 h-3 text-ink-3" />
                    <span>{store.brandName}</span>
                  </button>
                ) : (
                  <span className="font-medium text-ink">{store.brandName}</span>
                )}
                <span>·</span>
                <span>Mã: <strong className="font-code text-ink">{store.storeOperationId || store.id}</strong></span>
                <span>·</span>
                <span>Gói: <strong className="text-ink">{store.servicePackage || 'E2E-S'}</strong></span>
                <span>·</span>
                <span>Chuyên viên PIC:</span>
                <Person name={specialistPic} size={18} />
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* 2. TWO-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* MAIN COLUMN (flex-1) */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* 2.1 Operations & Budget Radar */}
          <StatRow>
            <Stat
              label="Hạn mức Order Net"
              value={formatVndShort(budgetNet)}
              note="Kế toán kiểm soát theo hạn mức Net"
            />
            <Stat
              label="Đã duyệt chi"
              value={formatVndShort(spent)}
              progress={{ value: spent, max: budgetNet || 1, invert: spent > budgetNet }}
              note={
                budgetNet > 0
                  ? (spent > budgetNet
                      ? `Vượt ${formatVndShort(spent - budgetNet)}`
                      : `Đã giải ngân ${formatPercent(spent / budgetNet, 0)}`)
                  : 'Suất gửi mẫu 0 đ'
              }
              tone={isOverbudget ? 'critical' : isUnbudgetedSpend ? 'warning' : 'positive'}
            />
            <Stat
              label="Mục tiêu doanh số NMV"
              value={formatVndShort(store.monthlyTargetGmv || 0)}
              note="Chỉ tiêu sàn giao tháng này"
            />
            <Stat
              label="Chỉ tiêu video tháng"
              value={formatNumber(targetVideos)}
              note={`${store.targetAffiliateContents || 0} Aff · ${store.targetSelfChannelContents || 0} Brand · ${store.targetFocVideos || 0} FOC`}
            />
          </StatRow>

          {/* 2.2 Plan Quota Breakdown (File 4.1) */}
          <Panel
            title="Kế hoạch & phân bổ Order (File 4.1)"
            description="Phân bổ hạn mức Net cho video Affiliate, kênh Brand và suất gửi mẫu FOC 0 đ"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1.5">
                <span className="text-2xs text-ink-3">Video KOC Affiliate (Paid)</span>
                <div className="text-sm font-semibold text-ink">
                  {formatVndShort(store.budgetAffiliateNet ?? store.budgetAffiliate ?? 0)}
                </div>
                <div className="text-2xs text-ink-3">
                  Chỉ tiêu: <strong className="text-ink tabular-nums">{formatNumber(store.targetAffiliateContents || 0)}</strong> video
                </div>
                <p className="text-2xs text-ink-3 mt-1">
                  Tính vào chỉ tiêu doanh số tiếp thị liên kết sàn.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1.5">
                <span className="text-2xs text-ink-3">Video kênh Brand (Self-channel)</span>
                <div className="text-sm font-semibold text-ink">
                  {formatVndShort(store.budgetSelfChannelNet ?? store.budgetSelfChannel ?? 0)}
                </div>
                <div className="text-2xs text-ink-3">
                  Chỉ tiêu: <strong className="text-ink tabular-nums">{formatNumber(store.targetSelfChannelContents || 0)}</strong> video
                </div>
                <p className="text-2xs text-ink-3 mt-1">
                  Sản xuất nội dung và đăng tải trực tiếp trên kênh thương hiệu.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-surface space-y-1.5">
                <span className="text-2xs text-ink-3">Suất gửi mẫu miễn phí (FOC)</span>
                <div className="text-sm font-semibold text-ink">
                  0 đ
                </div>
                <div className="text-2xs text-ink-3">
                  Chỉ tiêu: <strong className="text-ink tabular-nums">{formatNumber(store.targetFocVideos || 0)}</strong> suất
                </div>
                <p className="text-2xs text-ink-3 mt-1">
                  Chuyên viên FOC phụ trách: <strong className="text-ink">{focSpecialist}</strong>.
                </p>
              </div>
            </div>
          </Panel>

          {/* 2.3 Hero SKUs & Sample Quota */}
          <Panel
            title="Sản phẩm chủ lực & kho mẫu FOC"
            description="Danh mục sản phẩm trọng tâm và số lượng mẫu khả dụng gửi KOC"
            flush
          >
            {storeProducts.length === 0 ? (
              <EmptyState
                title="Chưa có sản phẩm chủ lực"
                description="Chưa ghi nhận danh mục sản phẩm trọng tâm cho gian hàng này."
              />
            ) : (
              <DataTable
                columns={productColumns}
                rows={storeProducts}
                rowKey={r => r.id}
              />
            )}
          </Panel>

          {/* 2.4 Actual Bookings (File 3.2) */}
          <Panel
            title="Thực tế booking đã duyệt (File 3.2)"
            description="Danh sách deal hợp tác KOC đã phát sinh chi phí của gian hàng"
            flush
          >
            {storeDeals.length === 0 ? (
              <EmptyState
                title="Chưa có booking trong kỳ"
                description="Chưa có deal KOC nào được ghi nhận cho gian hàng này trong tháng."
              />
            ) : (
              <DataTable
                columns={dealColumns}
                rows={storeDeals}
                rowKey={d => d.id}
              />
            )}
          </Panel>
        </div>

        {/* SIDE COLUMN (w-[340px]) */}
        <div className="w-full lg:w-[340px] shrink-0 space-y-6">
          {/* 2.5 Team Organization (2-Tier B2C Structure) */}
          <Panel
            title="Đội ngũ phụ trách"
            description="Phân bổ nhân sự theo quy chuẩn B2C"
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
                  <span className="text-2xs text-ink-3">Không có trưởng nhóm — Trực tiếp trưởng phòng</span>
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
                <span className="block text-2xs text-ink-3 mb-1">Bộ phận Tăng trưởng sàn (Growth PIC)</span>
                {store.growthPic ? <Person name={store.growthPic} /> : <span className="text-ink-3 text-2xs">—</span>}
              </div>

              <div>
                <span className="block text-2xs text-ink-3 mb-1">Quản lý quan hệ Brand (Account PIC)</span>
                {store.accountOwnerName ? <Person name={store.accountOwnerName} /> : <span className="text-ink-3 text-2xs">—</span>}
              </div>

              {store.handoverEffectiveDate && (
                <div className="mt-3 p-2.5 rounded-md bg-sunken border border-line text-2xs text-ink-2 space-y-0.5">
                  <span className="font-medium text-ink">Lệnh bàn giao đang áp dụng</span>
                  <p>Từ {store.previousPic || 'Chuyên viên trước'} sang {specialistPic}, hiệu lực từ {store.handoverEffectiveDate}.</p>
                </div>
              )}
            </div>
          </Panel>

          {/* 2.6 Technical parameters */}
          <Panel title="Thông số kỹ thuật">
            <dl className="divide-y divide-line text-xs">
              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Nền tảng sàn</dt>
                <dd><ChannelTag channel={store.platform} /></dd>
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
                <dt className="text-ink-3">Hoa hồng sàn Affiliate</dt>
                <dd className="font-code text-ink">{store.affiliateRate || 15}%</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Ủy quyền mã Spark Ads</dt>
                <dd className="text-ink">{store.requiresSparkAds ? 'Bắt buộc' : 'Không bắt buộc'}</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Marketing B2C phụ trách</dt>
                <dd className="text-ink">{store.isB2cManaged !== false ? 'Thuộc phòng B2C' : 'Gian hàng ngoài'}</dd>
              </div>

              <div className="py-2 flex items-center justify-between gap-2">
                <dt className="text-ink-3">Yêu cầu lập kế hoạch tháng</dt>
                <dd className="text-ink">{store.requiresB2cPlan !== false ? 'Bắt buộc' : 'Miễn trừ'}</dd>
              </div>
            </dl>
          </Panel>

          {/* 2.7 Assignment history */}
          <Panel title="Lịch sử phân công & bàn giao">
            {store.assignmentNotes ? (
              <p className="text-2xs text-ink-2 leading-relaxed whitespace-pre-line">
                {store.assignmentNotes}
              </p>
            ) : (
              <p className="text-2xs text-ink-3">
                Chưa có ghi chú phân công hoặc bàn giao phát sinh trong kỳ.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
