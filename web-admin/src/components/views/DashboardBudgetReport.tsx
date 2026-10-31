'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import { ArrowLeftRight, BarChart3, PieChart, Table2, Wallet } from 'lucide-react';
import {
  BarList,
  DataTable,
  GROUP_COLORS,
  Pagination,
  Panel,
  Person,
  Progress,
  SearchInput,
  Segmented,
  Select,
  StackBar,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { BarItem, Column, StackPart } from '../ui';
import { StorePortfolioItem } from '../../lib/types';
import { formatNumber, formatPercent, formatVndShort } from '../../lib/format';
import { REAL_B2C_69_STORES } from '../../lib/realB2cPlanData';
import { B2C_VIDEO_PIPELINE_BREAKDOWN, B2cBookedVideoRecord } from '../../lib/b2cAnalyticsDataset';

type Risk = 'UNBUDGETED' | 'OVERBUDGET' | 'SLOW_BURN' | 'NORMAL';
type TableView = 'BRAND' | 'STORE';
type SortMode = 'RISK' | 'SPENT' | 'PACE' | 'AIRED';
type BrandMetric = 'SPENT' | 'PACE' | 'AIRED';
type MixView = 'BUDGET' | 'VIDEO';

const PERIOD_LABEL = 'tháng 10/2026';
const PAGE_SIZE = 20;
const RISK_ORDER: Risk[] = ['UNBUDGETED', 'OVERBUDGET', 'SLOW_BURN', 'NORMAL'];
const SETTLED = new Set(['Done', 'Làm ĐNTT']);
const PENDING = new Set(['Tạm ứng', 'Chưa làm ĐNTT']);

const BAR_NORMAL = 'color-mix(in srgb, var(--color-ink-3) 45%, var(--color-surface))';
const BAR_ALERT = 'var(--color-critical)';

const matches = (q: string, ...fields: (string | undefined)[]) => fields.some((f) => (f || '').toLowerCase().includes(q));

const netOf = (s: StorePortfolioItem) => s.budgetNet || s.monthlyBudget || 0;
/** % giải ngân; hạn mức 0đ mà đã chi coi như vô hạn để xếp lên đầu. */
const paceOf = (net: number, spent: number) => (net > 0 ? spent / net : spent > 0 ? Infinity : 0);

function RiskStatus({ risk }: { risk: Risk }) {
  if (risk === 'UNBUDGETED') return <Status tone="critical">Hạn mức 0đ</Status>;
  if (risk === 'OVERBUDGET') return <Status tone="warning">Vượt trần Net</Status>;
  if (risk === 'SLOW_BURN') return <Status tone="neutral">Giải ngân chậm</Status>;
  return <Status tone="positive">Trong hạn mức</Status>;
}

function PanelTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-critical" strokeWidth={1.75} />
      {children}
    </span>
  );
}

function SpentCell({ spent, net }: { spent: number; net: number }) {
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="text-xs tabular-nums text-ink-2">
        {formatVndShort(spent)}
        <span className="text-ink-3"> · {net > 0 ? formatPercent(spent / net, 0) : '—'}</span>
      </div>
      <Progress value={spent} max={Math.max(1, net)} invert />
    </div>
  );
}

function RemainCell({ spent, net }: { spent: number; net: number }) {
  const diff = net - spent;
  if (diff < 0) return <span className="tabular-nums text-critical">Vượt {formatVndShort(-diff)}</span>;
  return <span className="tabular-nums text-ink-2">{formatVndShort(diff)}</span>;
}

interface BrandRow {
  brandName: string;
  storeCount: number;
  targetGmv: number;
  budgetNet: number;
  spent: number;
  paidTarget: number;
  aired: number;
  risk: Risk;
  pics: string[];
}

export function DashboardBudgetReport({
  stores,
  bookedVideos,
  isGlobalViewer,
  onInspectStore,
}: {
  stores: StorePortfolioItem[];
  bookedVideos: B2cBookedVideoRecord[];
  /** Xem toàn công ty: dòng tiền ĐNTT lấy từ bảng tổng hợp luồng file 3.2 thay vì cộng từng video. */
  isGlobalViewer: boolean;
  onInspectStore: (s: StorePortfolioItem) => void;
}) {
  const [mixView, setMixView] = useState<MixView>('BUDGET');
  const [brandMetric, setBrandMetric] = useState<BrandMetric>('PACE');
  const [tableView, setTableView] = useState<TableView>('BRAND');
  const [sortMode, setSortMode] = useState<SortMode>('RISK');
  const [riskFilter, setRiskFilter] = useState<'ALL' | Risk>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  /* ---------------------------------------------------------------- Tổng hợp */
  const totals = useMemo(() => {
    const t = {
      targetGmv: 0,
      gross: 0,
      net: 0,
      affNet: 0,
      selfNet: 0,
      live: 0,
      liveSessions: 0,
      spent: 0,
      paid: 0,
      foc: 0,
      self: 0,
      aired: 0,
      tiktok: 0,
      shopee: 0,
      storesWithAired: 0,
      overAmount: 0,
      risk: { UNBUDGETED: 0, OVERBUDGET: 0, SLOW_BURN: 0, NORMAL: 0 } as Record<Risk, number>,
    };
    stores.forEach((s) => {
      const net = netOf(s);
      const spent = s.actualSpentNet || 0;
      t.targetGmv += s.monthlyTargetGmv || 0;
      t.gross += s.budgetGross || 0;
      t.net += net;
      t.affNet += s.budgetAffiliateNet || s.budgetAffiliate || 0;
      t.selfNet += s.budgetSelfChannelNet || s.budgetSelfChannel || 0;
      t.live += s.budgetLive || 0;
      t.liveSessions += s.targetLiveSessions || 0;
      t.spent += spent;
      t.paid += s.targetPaidVideos || 0;
      t.foc += s.targetFocVideos || 0;
      t.self += s.targetSelfChannelContents || 0;
      t.aired += s.actualAiredVideos || 0;
      if ((s.actualAiredVideos || 0) > 0) t.storesWithAired++;
      if (s.platform === 'TikTok Shop') t.tiktok++;
      else t.shopee++;
      const risk = (s.financialRiskStatus || 'NORMAL') as Risk;
      t.risk[risk]++;
      if (risk === 'UNBUDGETED' || risk === 'OVERBUDGET') t.overAmount += Math.max(0, spent - net);
    });
    return t;
  }, [stores]);

  // Dòng tiền ĐNTT: toàn công ty dùng bảng tổng hợp luồng; phạm vi riêng thì cộng từ video booking của các gian hàng.
  const cash = useMemo(() => {
    const isFullCompany = isGlobalViewer && stores.length >= REAL_B2C_69_STORES.length;
    if (isFullCompany) {
      const sum = (set: Set<string>) =>
        B2C_VIDEO_PIPELINE_BREAKDOWN.filter((st) => set.has(st.pipeline)).reduce(
          (acc, st) => ({ count: acc.count + st.count, cost: acc.cost + st.totalCost }),
          { count: 0, cost: 0 },
        );
      return {
        orders: B2C_VIDEO_PIPELINE_BREAKDOWN.reduce((s, st) => s + st.count, 0),
        settled: sum(SETTLED),
        pending: sum(PENDING),
        source: 'tổng hợp luồng ĐNTT file 3.2 toàn công ty',
      };
    }
    const storeNames = new Set(stores.map((s) => s.storeName.toLowerCase()));
    const brandNames = new Set(stores.map((s) => s.brandName.toLowerCase()));
    const vids = bookedVideos.filter(
      (v) => storeNames.has(v.storeName.toLowerCase()) || brandNames.has(v.brandName.toLowerCase()),
    );
    const settled = { count: 0, cost: 0 };
    const pending = { count: 0, cost: 0 };
    vids.forEach((v) => {
      if (SETTLED.has(v.pipeline)) {
        settled.count++;
        settled.cost += v.cost || 0;
      } else if (PENDING.has(v.pipeline)) {
        pending.count++;
        pending.cost += v.cost || 0;
      }
    });
    return { orders: vids.length, settled, pending, source: 'video booking của các gian hàng trong phạm vi của bạn' };
  }, [isGlobalViewer, stores, bookedVideos]);

  const brands = useMemo<BrandRow[]>(() => {
    const map = new Map<string, BrandRow & { storeRisk: Risk | null }>();
    stores.forEach((s) => {
      const b = map.get(s.brandName) ?? {
        brandName: s.brandName,
        storeCount: 0,
        targetGmv: 0,
        budgetNet: 0,
        spent: 0,
        paidTarget: 0,
        aired: 0,
        risk: 'NORMAL' as Risk,
        pics: [],
        storeRisk: null,
      };
      b.storeCount++;
      b.targetGmv += s.monthlyTargetGmv || 0;
      b.budgetNet += netOf(s);
      b.spent += s.actualSpentNet || 0;
      b.paidTarget += s.targetPaidVideos || 0;
      b.aired += s.actualAiredVideos || 0;
      if (s.financialRiskStatus === 'UNBUDGETED') b.storeRisk = 'UNBUDGETED';
      else if (s.financialRiskStatus === 'OVERBUDGET' && b.storeRisk !== 'UNBUDGETED') b.storeRisk = 'OVERBUDGET';
      if (s.primaryPic && s.primaryPic !== 'Chưa phân công' && !b.pics.includes(s.primaryPic)) b.pics.push(s.primaryPic);
      map.set(s.brandName, b);
    });
    // Thương hiệu kế thừa cảnh báo của gian hàng; nếu không có thì suy từ tổng hạn mức / đã chi.
    return Array.from(map.values()).map(({ storeRisk, ...b }) => {
      let risk: Risk = storeRisk ?? 'NORMAL';
      if (!storeRisk) {
        if (b.budgetNet === 0 && b.spent > 0) risk = 'UNBUDGETED';
        else if (b.budgetNet > 0 && b.spent > b.budgetNet) risk = 'OVERBUDGET';
        else if (b.budgetNet > 0 && b.spent / b.budgetNet < 0.25) risk = 'SLOW_BURN';
      }
      return { ...b, risk };
    });
  }, [stores]);

  /* ------------------------------------------------------------ Biểu đồ khối */
  const mixParts: StackPart[] =
    mixView === 'BUDGET'
      ? [
          { key: 'aff', label: 'Video Affiliate KOC', value: totals.affNet, display: formatVndShort(totals.affNet), color: GROUP_COLORS[0] },
          { key: 'self', label: 'Video kênh Brand', value: totals.selfNet, display: formatVndShort(totals.selfNet), color: GROUP_COLORS[3] },
          { key: 'live', label: 'Livestream & host', value: totals.live, display: formatVndShort(totals.live), color: GROUP_COLORS[2] },
        ]
      : [
          { key: 'paid', label: 'Video KOC trả phí', value: totals.paid, display: formatNumber(totals.paid), color: GROUP_COLORS[0] },
          { key: 'foc', label: 'Gửi mẫu miễn phí (FOC)', value: totals.foc, display: formatNumber(totals.foc), color: GROUP_COLORS[1] },
          { key: 'self', label: 'Video kênh Brand', value: totals.self, display: formatNumber(totals.self), color: GROUP_COLORS[3] },
        ];

  const cashParts: StackPart[] = [
    {
      key: 'settled',
      label: `Đã nghiệm thu, tất toán · ${formatNumber(cash.settled.count)} đơn`,
      value: cash.settled.cost,
      display: formatVndShort(cash.settled.cost),
      color: 'var(--color-positive)',
    },
    {
      key: 'pending',
      label: `Tạm ứng, chờ làm ĐNTT · ${formatNumber(cash.pending.count)} đơn`,
      value: cash.pending.cost,
      display: formatVndShort(cash.pending.cost),
      color: 'var(--color-warning)',
    },
  ];

  const openBrand = (brandName: string) => {
    setTableView('STORE');
    setQuery(brandName);
    setPage(1);
  };

  const brandBars: BarItem[] = (() => {
    const scored = brands.map((b) => {
      const pace = paceOf(b.budgetNet, b.spent);
      const alert = b.risk === 'UNBUDGETED' || b.risk === 'OVERBUDGET';
      if (brandMetric === 'SPENT') return { b, alert, value: b.spent, display: formatVndShort(b.spent) };
      if (brandMetric === 'AIRED')
        return { b, alert, value: b.aired, display: b.paidTarget > 0 ? `${formatNumber(b.aired)} / ${formatNumber(b.paidTarget)}` : formatNumber(b.aired) };
      return {
        b,
        alert,
        value: Number.isFinite(pace) ? pace : 1.5,
        display: Number.isFinite(pace) ? formatPercent(pace, 0) : 'Hạn mức 0đ',
      };
    });
    return scored
      .sort((x, y) => y.value - x.value)
      .slice(0, 10)
      .map(({ b, alert, value, display }) => ({
        key: b.brandName,
        label: b.brandName,
        value,
        display,
        color: alert ? BAR_ALERT : BAR_NORMAL,
        onClick: () => openBrand(b.brandName),
      }));
  })();

  const topBrand = brandBars[0];

  /* -------------------------------------------------------------- Bảng chính */
  const brandRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = brands.filter(
      (b) => (riskFilter === 'ALL' || b.risk === riskFilter) && (!q || matches(q, b.brandName, ...b.pics)),
    );
    return list.sort((a, b) => {
      if (sortMode === 'SPENT') return b.spent - a.spent;
      if (sortMode === 'PACE') return paceOf(b.budgetNet, b.spent) - paceOf(a.budgetNet, a.spent) || b.spent - a.spent;
      if (sortMode === 'AIRED') return b.aired - a.aired;
      return RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || b.spent - a.spent;
    });
  }, [brands, riskFilter, deferredQuery, sortMode]);

  const storeRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = stores.filter((s) => {
      const risk = (s.financialRiskStatus || 'NORMAL') as Risk;
      if (riskFilter !== 'ALL' && risk !== riskFilter) return false;
      return !q || matches(q, s.storeName, s.brandName, s.primaryPic || s.assignedStaff, s.bookingLeader, s.storeOperationId);
    });
    return [...list].sort((a, b) => {
      const sa = a.actualSpentNet || 0;
      const sb = b.actualSpentNet || 0;
      if (sortMode === 'SPENT') return sb - sa;
      if (sortMode === 'PACE') return paceOf(netOf(b), sb) - paceOf(netOf(a), sa) || sb - sa;
      if (sortMode === 'AIRED') return (b.actualAiredVideos || 0) - (a.actualAiredVideos || 0);
      const ra = RISK_ORDER.indexOf((a.financialRiskStatus || 'NORMAL') as Risk);
      const rb = RISK_ORDER.indexOf((b.financialRiskStatus || 'NORMAL') as Risk);
      return ra - rb || sb - sa;
    });
  }, [stores, riskFilter, deferredQuery, sortMode]);

  const total = tableView === 'BRAND' ? brandRows.length : storeRows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const slice = <T,>(rows: T[]) => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const airedCell = (aired: number, target: number) => (
    <span className="tabular-nums text-ink-2">
      {formatNumber(aired)}
      <span className="text-ink-3"> / {target > 0 ? formatNumber(target) : '—'}</span>
    </span>
  );

  const brandColumns: Column<BrandRow>[] = [
    {
      key: 'brand',
      header: 'Thương hiệu',
      render: (b) => (
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">{b.brandName}</div>
          <div className="text-2xs text-ink-3 truncate">{b.storeCount} gian hàng</div>
        </div>
      ),
    },
    { key: 'gmv', header: 'Mục tiêu NMV', align: 'right', render: (b) => <span className="tabular-nums">{b.targetGmv > 0 ? formatVndShort(b.targetGmv) : '—'}</span> },
    { key: 'net', header: 'Hạn mức Net', align: 'right', render: (b) => <span className="tabular-nums">{formatVndShort(b.budgetNet)}</span> },
    { key: 'spent', header: 'Đã chi Net', width: 160, render: (b) => <SpentCell spent={b.spent} net={b.budgetNet} /> },
    { key: 'remain', header: 'Còn lại', align: 'right', render: (b) => <RemainCell spent={b.spent} net={b.budgetNet} /> },
    { key: 'aired', header: 'Video air / chỉ tiêu', align: 'right', render: (b) => airedCell(b.aired, b.paidTarget) },
    { key: 'risk', header: 'Kế toán', render: (b) => <RiskStatus risk={b.risk} /> },
  ];

  const storeColumns: Column<StorePortfolioItem>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      render: (s) => (
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">{s.storeName}</div>
          <div className="text-2xs text-ink-3 truncate">
            {s.brandName} · {s.platform}
          </div>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Phụ trách',
      render: (s) => {
        const name = s.primaryPic || s.assignedStaff;
        return name ? <Person name={name} sub={s.hasBookingLeader && s.bookingLeader ? `Leader ${s.bookingLeader}` : undefined} /> : <span className="text-ink-3">—</span>;
      },
    },
    { key: 'net', header: 'Hạn mức Net', align: 'right', render: (s) => <span className="tabular-nums">{formatVndShort(netOf(s))}</span> },
    { key: 'spent', header: 'Đã chi Net', width: 160, render: (s) => <SpentCell spent={s.actualSpentNet || 0} net={netOf(s)} /> },
    { key: 'remain', header: 'Còn lại', align: 'right', render: (s) => <RemainCell spent={s.actualSpentNet || 0} net={netOf(s)} /> },
    { key: 'aired', header: 'Video air / chỉ tiêu', align: 'right', render: (s) => airedCell(s.actualAiredVideos || 0, s.targetPaidVideos || 0) },
    { key: 'risk', header: 'Kế toán', render: (s) => <RiskStatus risk={(s.financialRiskStatus || 'NORMAL') as Risk} /> },
  ];

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const emptyNode = <p className="text-sm text-ink-3 py-6 text-center">Không có {tableView === 'BRAND' ? 'thương hiệu' : 'gian hàng'} khớp bộ lọc.</p>;
  const alertCount = totals.risk.UNBUDGETED + totals.risk.OVERBUDGET;

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat label="Mục tiêu NMV" value={formatVndShort(totals.targetGmv)} />
        <Stat label="Hạn mức Net" value={formatVndShort(totals.net)} />
        <Stat
          label="Đã chi Net"
          value={formatVndShort(totals.spent)}
          progress={{ value: totals.spent, max: Math.max(1, totals.net), invert: true }}
        />
        <Stat
          label="Còn được chi"
          value={formatVndShort(Math.max(0, totals.net - totals.spent))}
          tone={alertCount > 0 ? 'critical' : undefined}
        />
      </StatRow>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-4 items-start">
        <div className="space-y-4">
          <Panel
            title={<PanelTitle icon={PieChart}>Cơ cấu</PanelTitle>}
            actions={
              <Segmented<MixView>
                items={[
                  { key: 'BUDGET', label: 'Ngân sách Net' },
                  { key: 'VIDEO', label: 'Chỉ tiêu video' },
                ]}
                value={mixView}
                onChange={setMixView}
              />
            }
          >
            <StackBar parts={mixParts} />
          </Panel>

          <Panel title={<PanelTitle icon={Wallet}>Dòng tiền ĐNTT</PanelTitle>}>
            {cash.settled.cost + cash.pending.cost > 0 ? (
              <StackBar parts={cashParts} />
            ) : (
              <p className="text-sm text-ink-3 py-4 text-center">Chưa có đơn booking vào luồng ĐNTT.</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs">
              <span className="text-ink-2">Chi vượt hạn mức</span>
              <span className={`tabular-nums ${totals.overAmount > 0 ? 'text-critical' : 'text-ink-2'}`}>
                {totals.overAmount > 0 ? `+${formatVndShort(totals.overAmount)}` : '0 đ'}
                <span className="text-ink-3"> · {alertCount} gian hàng</span>
              </span>
            </div>
          </Panel>
        </div>

        <Panel
          title={<PanelTitle icon={BarChart3}>Chi tiêu theo thương hiệu</PanelTitle>}
          actions={
            <Segmented<BrandMetric>
              items={[
                { key: 'PACE', label: '% giải ngân' },
                { key: 'SPENT', label: 'Đã chi' },
                { key: 'AIRED', label: 'Video air' },
              ]}
              value={brandMetric}
              onChange={setBrandMetric}
            />
          }
        >
          {brandBars.length === 0 ? (
            <p className="text-sm text-ink-3 py-10 text-center">Chưa có thương hiệu trong phạm vi của bạn.</p>
          ) : (
            <BarList items={brandBars} />
          )}
        </Panel>
      </div>

      <Panel
        flush
        title={<PanelTitle icon={Table2}>Đối soát ngân sách</PanelTitle>}
        actions={
          <>
            <Segmented<TableView>
              items={[
                { key: 'BRAND', label: 'Theo thương hiệu' },
                { key: 'STORE', label: 'Theo gian hàng' },
              ]}
              value={tableView}
              onChange={resetPage(setTableView)}
            />
            <Segmented<SortMode>
              items={[
                { key: 'RISK', label: 'Rủi ro' },
                { key: 'PACE', label: '% giải ngân' },
                { key: 'SPENT', label: 'Đã chi' },
                { key: 'AIRED', label: 'Video air' },
              ]}
              value={sortMode}
              onChange={resetPage(setSortMode)}
            />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-4 py-3 border-b border-line">
          <SearchInput
            value={query}
            onChange={resetPage(setQuery)}
            placeholder={tableView === 'BRAND' ? 'Tìm thương hiệu, PIC' : 'Tìm gian hàng, thương hiệu, PIC'}
            className="w-full sm:w-72"
          />
          <Select
            aria-label="Trạng thái kế toán"
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value as typeof riskFilter);
              setPage(1);
            }}
            className="w-auto"
          >
            <option value="ALL">Mọi trạng thái kế toán</option>
            <option value="UNBUDGETED">Hạn mức 0đ ({totals.risk.UNBUDGETED} gian)</option>
            <option value="OVERBUDGET">Vượt trần Net ({totals.risk.OVERBUDGET} gian)</option>
            <option value="SLOW_BURN">Giải ngân chậm ({totals.risk.SLOW_BURN} gian)</option>
            <option value="NORMAL">Trong hạn mức ({totals.risk.NORMAL} gian)</option>
          </Select>
          {tableView === 'STORE' && query && (
            <button type="button" onClick={() => resetPage(setTableView)('BRAND')} className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Về bảng thương hiệu
            </button>
          )}
        </div>

        {tableView === 'BRAND' ? (
          <DataTable
            columns={brandColumns}
            rows={slice(brandRows)}
            rowKey={(b) => b.brandName}
            onRowClick={(b) => openBrand(b.brandName)}
            empty={emptyNode}
          />
        ) : (
          <DataTable
            columns={storeColumns}
            rows={slice(storeRows)}
            rowKey={(s) => s.id}
            onRowClick={onInspectStore}
            empty={emptyNode}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-4 py-3 border-t border-line">
          <p className="text-2xs text-ink-3">
            Kỳ đối soát {PERIOD_LABEL} · {tableView === 'BRAND' ? 'bấm thương hiệu để xem gian hàng' : 'bấm gian hàng để mở hồ sơ'}.
          </p>
          <Pagination page={safePage} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </Panel>
    </div>
  );
}
