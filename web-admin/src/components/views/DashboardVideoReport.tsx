'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import { ExternalLink, Filter, Layers, Megaphone, Package, PlaySquare, Table2, X } from 'lucide-react';
import {
  BarList,
  Button,
  DataTable,
  Pagination,
  Panel,
  SearchInput,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { BarItem, Column } from '../ui';
import { StorePortfolioItem } from '../../lib/types';
import { formatCountShort, formatNumber, formatPercent, formatVndShort } from '../../lib/format';
import { REAL_B2C_69_STORES } from '../../lib/realB2cPlanData';
import {
  B2C_VIDEO_FORMAT_BREAKDOWN,
  B2C_VIDEO_KL_BREAKDOWN,
  B2C_VIDEO_TYPE_BREAKDOWN,
  TIKTOK_SELLER_ADS_SUMMARY,
  TIKTOK_SELLER_CAMPAIGNS,
  TIKTOK_SELLER_TOP_CREATIVES,
  B2cBookedVideoRecord,
} from '../../lib/b2cAnalyticsDataset';

type KlMetric = 'COUNT' | 'COST' | 'UNIT' | 'AIR';
type FormatDim = 'FORMAT' | 'TYPE';
type CampaignMetric = 'GMV' | 'ROAS' | 'COST';
type ProductMetric = 'GMV' | 'ROAS';
type VideoSort = 'RECENT' | 'GMV' | 'ROAS' | 'COST';

interface Breakdown {
  key: string;
  count: number;
  totalCost: number;
  airedCount: number;
}

interface ProductRow {
  key: string;
  productName: string;
  brandName: string;
  isCombo: boolean;
  videoCount: number;
  totalCost: number;
  totalGmv: number;
}

const KL_ORDER = ['TAP UpAffiliate', 'KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];
const klRank = (kl: string) => {
  const i = KL_ORDER.indexOf(kl);
  return i === -1 ? 99 : i;
};
const klLabel = (kl: string) => (kl === 'TAP UpAffiliate' ? 'TAP FOC (0đ)' : kl);

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const times = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x`);
const COMBO_RE = /combo|bộ|set|routine|\+|tặng/i;
const PAGE_SIZE = 30;

function groupBy(videos: B2cBookedVideoRecord[], pick: (v: B2cBookedVideoRecord) => string): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const v of videos) {
    const key = pick(v);
    const cur = map.get(key) ?? { key, count: 0, totalCost: 0, airedCount: 0 };
    cur.count += 1;
    cur.totalCost += v.cost || 0;
    if (v.linkAir) cur.airedCount += 1;
    map.set(key, cur);
  }
  return Array.from(map.values());
}

/** Chiến dịch / creative quảng cáo seller thuộc tập gian hàng (khớp tên gian hoặc tên thương hiệu). */
function matchesStores<T extends { storeName: string }>(rows: T[], stores: StorePortfolioItem[]) {
  const storeNames = new Set(stores.map((s) => s.storeName.toLowerCase()));
  const brandNames = Array.from(new Set(stores.map((s) => s.brandName.toLowerCase()))).filter(Boolean);
  return rows.filter((r) => {
    const n = r.storeName.toLowerCase();
    return storeNames.has(n) || brandNames.some((b) => n.includes(b));
  });
}

const pipelineTone = (p: string) => (p === 'Done' ? 'positive' : p === 'Huỷ' ? 'critical' : 'warning');

export function DashboardVideoReport({
  stores,
  bookedVideos,
  isGlobalViewer,
  onInspectVideo,
}: {
  stores: StorePortfolioItem[];
  bookedVideos: B2cBookedVideoRecord[];
  /** Người xem toàn công ty: dùng số tổng hợp cả tháng (786 đơn) thay cho mẫu video có trong phạm vi. */
  isGlobalViewer: boolean;
  onInspectVideo: (v: B2cBookedVideoRecord) => void;
}) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [brand, setBrand] = useState('ALL');
  const [klFilter, setKlFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [klMetric, setKlMetric] = useState<KlMetric>('COST');
  const [formatDim, setFormatDim] = useState<FormatDim>('FORMAT');
  const [campaignMetric, setCampaignMetric] = useState<CampaignMetric>('GMV');
  const [productMetric, setProductMetric] = useState<ProductMetric>('GMV');
  const [showProductTable, setShowProductTable] = useState(false);
  const [videoSort, setVideoSort] = useState<VideoSort>('RECENT');
  const [page, setPage] = useState(1);

  const brands = useMemo(
    () => Array.from(new Set(stores.map((s) => s.brandName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')),
    [stores],
  );
  const scopeStores = useMemo(() => (brand === 'ALL' ? stores : stores.filter((s) => s.brandName === brand)), [stores, brand]);
  const brandVideos = useMemo(
    () => (brand === 'ALL' ? bookedVideos : bookedVideos.filter((v) => v.brandName === brand)),
    [bookedVideos, brand],
  );
  // Toàn công ty, chưa lọc thương hiệu: dùng bảng tổng hợp cả tháng thay vì mẫu video có trong bộ dữ liệu.
  const useMonthTotals = isGlobalViewer && stores.length >= REAL_B2C_69_STORES.length && brand === 'ALL';

  const klBreakdown = useMemo<Breakdown[]>(() => {
    const rows = useMonthTotals
      ? B2C_VIDEO_KL_BREAKDOWN.map((k) => ({ key: k.kl, count: k.count, totalCost: k.totalCost, airedCount: k.airedCount }))
      : groupBy(brandVideos, (v) => v.kl || 'KL1');
    return [...rows].sort((a, b) => klRank(a.key) - klRank(b.key));
  }, [useMonthTotals, brandVideos]);

  const formatBreakdown = useMemo<Breakdown[]>(() => {
    const rows =
      formatDim === 'FORMAT'
        ? useMonthTotals
          ? B2C_VIDEO_FORMAT_BREAKDOWN.map((f) => ({ key: f.format, count: f.count, totalCost: f.totalCost, airedCount: f.airedCount }))
          : groupBy(brandVideos, (v) => v.format || 'Review')
        : useMonthTotals
          ? B2C_VIDEO_TYPE_BREAKDOWN.map((t) => ({ key: t.videoType, count: t.count, totalCost: t.totalCost, airedCount: t.airedCount }))
          : groupBy(brandVideos, (v) => v.videoType || 'Video Affiliate');
    return [...rows].sort((a, b) => b.count - a.count);
  }, [formatDim, useMonthTotals, brandVideos]);

  /* ------------------------------------------------------------- Tổng quan */

  const totals = useMemo(() => {
    const orders = klBreakdown.reduce((s, k) => s + k.count, 0);
    const cost = klBreakdown.reduce((s, k) => s + k.totalCost, 0);
    const aired = klBreakdown.reduce((s, k) => s + k.airedCount, 0);
    const withGmv = brandVideos.filter((v) => v.linkAir);
    const gmv = withGmv.reduce((s, v) => s + (v.sellerGmv || 0), 0);
    const gmvCost = withGmv.reduce((s, v) => s + (v.cost || 0), 0);
    return { orders, cost, aired, gmv, gmvCost, gmvVideos: withGmv.length };
  }, [klBreakdown, brandVideos]);

  /* --------------------------------------------------------- Quảng cáo seller */

  const campaigns = useMemo(() => matchesStores(TIKTOK_SELLER_CAMPAIGNS, scopeStores), [scopeStores]);
  const creatives = useMemo(() => matchesStores(TIKTOK_SELLER_TOP_CREATIVES, scopeStores), [scopeStores]);

  const ads = useMemo(() => {
    const sum = (k: 'cost' | 'gmv' | 'orders' | 'impressions' | 'clicks') => campaigns.reduce((s, c) => s + c[k], 0);
    // Toàn công ty: tổng từ báo cáo Seller Center cả kỳ; phạm vi hẹp: cộng các chiến dịch khớp gian hàng.
    const base = useMonthTotals
      ? TIKTOK_SELLER_ADS_SUMMARY
      : { totalSpend: sum('cost'), totalGmv: sum('gmv'), totalOrders: sum('orders'), totalImpressions: sum('impressions'), totalClicks: sum('clicks') };
    const avg = (k: 'hookRate2s' | 'viewRate6s' | 'completionRate100') =>
      creatives.length > 0 ? creatives.reduce((s, c) => s + c[k], 0) / creatives.length / 100 : null;
    return {
      spend: base.totalSpend,
      gmv: base.totalGmv,
      orders: base.totalOrders,
      impressions: base.totalImpressions,
      clicks: base.totalClicks,
      roas: ratio(base.totalGmv, base.totalSpend),
      ctr: ratio(base.totalClicks, base.totalImpressions),
      cvr: ratio(base.totalOrders, base.totalClicks),
      hook2s: avg('hookRate2s'),
      view6s: avg('viewRate6s'),
      complete: avg('completionRate100'),
      creativeCount: useMonthTotals ? TIKTOK_SELLER_ADS_SUMMARY.totalCreativeRows : creatives.length,
    };
  }, [campaigns, creatives, useMonthTotals]);

  /* ------------------------------------------------------- Video & sản phẩm */

  const filteredVideos = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return brandVideos.filter((v) => {
      if (klFilter !== 'ALL' && (v.kl || 'KL1') !== klFilter) return false;
      if (formatFilter !== 'ALL' && v.format !== formatFilter && v.videoType !== formatFilter) return false;
      if (!q) return true;
      return [v.code, v.channelId, v.storeName, v.pic, v.productName || ''].some((s) => s.toLowerCase().includes(q));
    });
  }, [brandVideos, klFilter, formatFilter, deferredSearch]);

  const products = useMemo(() => {
    const map = new Map<string, ProductRow>();
    let single = { videos: 0, cost: 0, gmv: 0 };
    let combo = { videos: 0, cost: 0, gmv: 0 };
    for (const v of filteredVideos) {
      const productName = (v.productName || 'Chưa phân loại').trim();
      const isCombo = COMBO_RE.test(productName);
      const bucket = isCombo ? combo : single;
      const next = { videos: bucket.videos + 1, cost: bucket.cost + (v.cost || 0), gmv: bucket.gmv + (v.sellerGmv || 0) };
      if (isCombo) combo = next;
      else single = next;
      const key = `${v.brandName}__${productName}`;
      const cur = map.get(key) ?? { key, productName, brandName: v.brandName, isCombo, videoCount: 0, totalCost: 0, totalGmv: 0 };
      cur.videoCount += 1;
      cur.totalCost += v.cost || 0;
      cur.totalGmv += v.sellerGmv || 0;
      map.set(key, cur);
    }
    const rows = Array.from(map.values());
    const metricOf = (p: ProductRow) => (productMetric === 'GMV' ? p.totalGmv : ratio(p.totalGmv, p.totalCost) ?? -1);
    rows.sort((a, b) => metricOf(b) - metricOf(a) || b.totalGmv - a.totalGmv);
    return { rows, single, combo };
  }, [filteredVideos, productMetric]);

  const sortedVideos = useMemo(() => {
    const rows = [...filteredVideos];
    if (videoSort === 'RECENT') rows.sort((a, b) => (b.airDate || '').localeCompare(a.airDate || ''));
    if (videoSort === 'GMV') rows.sort((a, b) => (b.sellerGmv || 0) - (a.sellerGmv || 0));
    if (videoSort === 'ROAS') rows.sort((a, b) => (b.roas || 0) - (a.roas || 0));
    if (videoSort === 'COST') rows.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    return rows;
  }, [filteredVideos, videoSort]);
  const pageCount = Math.max(1, Math.ceil(sortedVideos.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = sortedVideos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ------------------------------------------------------------ Biểu đồ */

  const klItems: BarItem[] = klBreakdown.map((k) => {
    const unit = ratio(k.totalCost, k.count);
    const airPct = ratio(k.airedCount, k.count);
    const value = klMetric === 'COUNT' ? k.count : klMetric === 'COST' ? k.totalCost : klMetric === 'UNIT' ? unit ?? 0 : airPct ?? 0;
    const display =
      klMetric === 'COUNT'
        ? formatNumber(k.count)
        : klMetric === 'COST'
          ? formatVndShort(k.totalCost)
          : klMetric === 'UNIT'
            ? unit === null ? '—' : formatVndShort(unit)
            : airPct === null ? '—' : formatPercent(airPct, 0);
    const active = klFilter === k.key;
    return {
      key: k.key,
      label: <span className={active ? 'font-semibold' : undefined}>{klLabel(k.key)}</span>,
      value,
      display,
      color: active ? 'var(--color-critical)' : undefined,
      onClick: () => {
        setKlFilter(active ? 'ALL' : k.key);
        setPage(1);
      },
    };
  });
  const klMax = klMetric === 'AIR' ? 1 : undefined;
  const topKlByCost = [...klBreakdown].sort((a, b) => b.totalCost - a.totalCost)[0];

  const formatItems: BarItem[] = formatBreakdown.slice(0, 8).map((f) => {
    const active = formatFilter === f.key;
    return {
      key: f.key,
      label: <span className={active ? 'font-semibold' : undefined}>{f.key}</span>,
      value: f.count,
      display: `${formatNumber(f.count)} đơn`,
      color: active ? 'var(--color-critical)' : undefined,
      onClick: () => {
        setFormatFilter(active ? 'ALL' : f.key);
        setPage(1);
      },
    };
  });
  const topFormat = formatBreakdown[0];

  const funnelItems: BarItem[] = [
    { key: 'imp', label: 'Lượt hiển thị', value: ads.impressions, display: formatCountShort(ads.impressions) },
    { key: 'click', label: 'Lượt nhấp', value: ads.clicks, display: formatCountShort(ads.clicks) },
    { key: 'order', label: 'Đơn hàng', value: ads.orders, display: formatCountShort(ads.orders) },
  ];
  const rateItems: BarItem[] = [
    { key: 'hook', label: 'Giữ chân 2 giây', value: ads.hook2s ?? 0, display: ads.hook2s === null ? '—' : formatPercent(ads.hook2s) },
    { key: 'view6', label: 'Xem qua 6 giây', value: ads.view6s ?? 0, display: ads.view6s === null ? '—' : formatPercent(ads.view6s) },
    { key: 'done', label: 'Xem hết video', value: ads.complete ?? 0, display: ads.complete === null ? '—' : formatPercent(ads.complete) },
    { key: 'ctr', label: 'Tỷ lệ nhấp (CTR)', value: ads.ctr ?? 0, display: ads.ctr === null ? '—' : formatPercent(ads.ctr, 2) },
    { key: 'cvr', label: 'Chuyển đổi (CVR)', value: ads.cvr ?? 0, display: ads.cvr === null ? '—' : formatPercent(ads.cvr, 2) },
  ];

  const campaignItems: BarItem[] = [...campaigns]
    .sort((a, b) =>
      campaignMetric === 'GMV' ? b.gmv - a.gmv : campaignMetric === 'ROAS' ? b.roas - a.roas : b.cost - a.cost,
    )
    .map((c) => ({
      key: c.campaignId,
      label: <span title={`${c.campaignName} · ${c.storeName}`}>{c.campaignName}</span>,
      value: campaignMetric === 'GMV' ? c.gmv : campaignMetric === 'ROAS' ? c.roas : c.cost,
      display: campaignMetric === 'ROAS' ? times(c.roas) : formatVndShort(campaignMetric === 'GMV' ? c.gmv : c.cost),
    }));

  const productItems: BarItem[] = products.rows.slice(0, 10).map((p) => {
    const roas = ratio(p.totalGmv, p.totalCost);
    return {
      key: p.key,
      label: <span title={`${p.productName} · ${p.brandName}`}>{p.productName}</span>,
      value: productMetric === 'GMV' ? p.totalGmv : roas ?? 0,
      display: productMetric === 'GMV' ? formatVndShort(p.totalGmv) : times(roas),
    };
  });

  /* ------------------------------------------------------------- Bảng */

  const productColumns: Column<ProductRow>[] = [
    { key: 'name', header: 'Sản phẩm', render: (p) => <span className="font-medium text-ink">{p.productName}</span> },
    { key: 'type', header: 'Loại', render: (p) => <span className="text-ink-2">{p.isCombo ? 'Combo' : 'SKU đơn lẻ'}</span> },
    { key: 'brand', header: 'Thương hiệu', render: (p) => <span className="text-ink-2">{p.brandName}</span> },
    { key: 'videos', header: 'Video', align: 'right', render: (p) => <span className="tabular-nums">{formatNumber(p.videoCount)}</span> },
    { key: 'cost', header: 'Chi phí', align: 'right', render: (p) => <span className="tabular-nums">{formatVndShort(p.totalCost)}</span> },
    { key: 'gmv', header: 'GMV', align: 'right', render: (p) => <span className="tabular-nums">{formatVndShort(p.totalGmv)}</span> },
    { key: 'roas', header: 'ROAS', align: 'right', render: (p) => <span className="tabular-nums">{times(ratio(p.totalGmv, p.totalCost))}</span> },
  ];

  const videoColumns: Column<B2cBookedVideoRecord>[] = [
    {
      key: 'code',
      header: 'Mã book',
      render: (v) => (
        <div>
          <span className="inline-flex items-center gap-1 font-medium text-ink">
            {v.code}
            {v.linkAir && (
              <a
                href={v.linkAir}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Mở video ${v.code}`}
                className="text-ink-3 hover:text-ink"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </span>
          <span className="block text-2xs text-ink-3 tabular-nums">{v.airDate || '—'}</span>
        </div>
      ),
    },
    {
      key: 'koc',
      header: 'KOC',
      render: (v) => (
        <div>
          <span className="text-ink">@{v.channelId}</span>
          <span className="block text-2xs text-ink-3">{klLabel(v.kl || '—')}</span>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Gian hàng',
      render: (v) => (
        <div className="min-w-0">
          <span className="block truncate max-w-[200px] text-ink">{v.storeName}</span>
          <span className="block text-2xs text-ink-3">{v.pic || '—'}</span>
        </div>
      ),
    },
    { key: 'cost', header: 'Cát-xê', align: 'right', render: (v) => <span className="tabular-nums">{formatVndShort(v.cost)}</span> },
    {
      key: 'gmv',
      header: 'GMV seller',
      align: 'right',
      render: (v) => <span className="tabular-nums">{v.linkAir ? formatVndShort(v.sellerGmv) : '—'}</span>,
    },
    {
      key: 'roas',
      header: 'ROAS',
      align: 'right',
      render: (v) => <span className="tabular-nums">{v.linkAir && v.cost > 0 ? times(v.roas) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái ĐNTT',
      render: (v) => (
        <span title={v.slaWarning && v.slaWarning !== 'Đúng hạn' ? v.slaWarning : undefined}>
          <Status tone={pipelineTone(v.pipeline)}>{v.pipeline || '—'}</Status>
        </span>
      ),
    },
  ];

  const hasFilter = klFilter !== 'ALL' || formatFilter !== 'ALL';
  const panelTitle = (Icon: React.ElementType, text: string) => (
    <span className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-critical" strokeWidth={1.75} />
      {text}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Tìm mã book, KOC, sản phẩm" className="w-full sm:w-72" />
        <Select aria-label="Thương hiệu" value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} className="w-auto">
          <option value="ALL">Tất cả thương hiệu</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        {hasFilter && (
          <Button size="sm" variant="ghost" onClick={() => { setKlFilter('ALL'); setFormatFilter('ALL'); setPage(1); }}>
            <X className="w-3.5 h-3.5" />
            Bỏ lọc {[klFilter !== 'ALL' ? klLabel(klFilter) : '', formatFilter !== 'ALL' ? formatFilter : ''].filter(Boolean).join(' · ')}
          </Button>
        )}
      </div>

      <StatRow size="sm">
        <Stat label="Đơn book video" value={`${formatNumber(totals.aired)} / ${formatNumber(totals.orders)}`} />
        <Stat label="Chi phí booking" value={formatVndShort(totals.cost)} />
        <Stat label="GMV seller từ video" value={totals.gmvVideos > 0 ? formatVndShort(totals.gmv) : '—'} />
        <Stat label="ROAS video" value={times(ratio(totals.gmv, totals.gmvCost))} />
      </StatRow>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4 items-start">
        <Panel
          title={panelTitle(Layers, 'Hiệu quả theo khung KL')}
          actions={
            <Segmented<KlMetric>
              items={[
                { key: 'COST', label: 'Chi phí' },
                { key: 'COUNT', label: 'Số đơn' },
                { key: 'UNIT', label: 'Đơn giá' },
                { key: 'AIR', label: '% air' },
              ]}
              value={klMetric}
              onChange={setKlMetric}
            />
          }
        >
          {klItems.length === 0 ? (
            <p className="text-sm text-ink-3 py-6 text-center">Chưa có đơn book trong phạm vi.</p>
          ) : (
            <BarList items={klItems} max={klMax} />
          )}
        </Panel>

        <Panel
          title={panelTitle(Filter, formatDim === 'FORMAT' ? 'Theo định dạng' : 'Theo kiểu video')}
          actions={
            <Segmented<FormatDim>
              items={[
                { key: 'FORMAT', label: 'Định dạng' },
                { key: 'TYPE', label: 'Kiểu video' },
              ]}
              value={formatDim}
              onChange={(k) => { setFormatDim(k); setFormatFilter('ALL'); }}
            />
          }
        >
          {formatItems.length === 0 ? (
            <p className="text-sm text-ink-3 py-6 text-center">Chưa có đơn book trong phạm vi.</p>
          ) : (
            <BarList items={formatItems} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <Panel title={panelTitle(PlaySquare, 'Phễu quảng cáo TikTok Seller')}>
          {ads.impressions <= 0 && creatives.length === 0 ? (
            <p className="text-sm text-ink-3 py-6 text-center">Chưa có dữ liệu quảng cáo seller cho các gian hàng đang xem.</p>
          ) : (
            <div className="space-y-4">
              <BarList items={funnelItems} />
              <div className="border-t border-line pt-3">
                <BarList items={rateItems} max={1} />
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title={panelTitle(Megaphone, 'Chiến dịch quảng cáo & livestream')}
          actions={
            <Segmented<CampaignMetric>
              items={[
                { key: 'GMV', label: 'GMV' },
                { key: 'ROAS', label: 'ROAS' },
                { key: 'COST', label: 'Chi phí' },
              ]}
              value={campaignMetric}
              onChange={setCampaignMetric}
            />
          }
        >
          {campaignItems.length === 0 ? (
            <p className="text-sm text-ink-3 py-6 text-center">Chưa có chiến dịch PGM/LGM trên các gian hàng đang xem.</p>
          ) : (
            <BarList items={campaignItems} />
          )}
        </Panel>
      </div>

      <Panel
        flush={showProductTable}
        title={panelTitle(Package, 'Sản phẩm')}
        actions={
          <>
            <Segmented<ProductMetric>
              items={[
                { key: 'GMV', label: 'GMV' },
                { key: 'ROAS', label: 'ROAS' },
              ]}
              value={productMetric}
              onChange={setProductMetric}
            />
            <Button size="sm" variant="ghost" onClick={() => setShowProductTable((s) => !s)}>
              <Table2 className="w-3.5 h-3.5" />
              {showProductTable ? 'Xem biểu đồ' : 'Xem bảng'}
            </Button>
          </>
        }
      >
        {showProductTable ? (
          <DataTable
            columns={productColumns}
            rows={products.rows}
            rowKey={(p) => p.key}
            empty={<p className="text-sm text-ink-3 py-6 text-center">Chưa có sản phẩm trong phạm vi.</p>}
          />
        ) : productItems.length === 0 ? (
          <p className="text-sm text-ink-3 py-6 text-center">Chưa có sản phẩm trong phạm vi.</p>
        ) : (
          <BarList items={productItems} />
        )}
      </Panel>

      <Panel
        flush
        title={panelTitle(PlaySquare, 'Video đã booking')}
        actions={
          <Segmented<VideoSort>
            items={[
              { key: 'RECENT', label: 'Mới nhất' },
              { key: 'GMV', label: 'GMV' },
              { key: 'ROAS', label: 'ROAS' },
              { key: 'COST', label: 'Cát-xê' },
            ]}
            value={videoSort}
            onChange={(k) => { setVideoSort(k); setPage(1); }}
          />
        }
      >
        <DataTable
          columns={videoColumns}
          rows={pageRows}
          rowKey={(v) => v.code}
          onRowClick={onInspectVideo}
          empty={<p className="text-sm text-ink-3 py-6 text-center">Không có video khớp bộ lọc.</p>}
        />
        <Pagination page={safePage} pageSize={PAGE_SIZE} total={sortedVideos.length} onPageChange={setPage} />
      </Panel>
    </div>
  );
}
