'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  Search,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  ChannelTag,
  EmptyState,
  Modal,
  Panel,
  Person,
  Segmented,
  Stat,
  StatRow,
  Status,
} from '../ui';
import {
  formatVndShort,
  formatNumber,
} from '../../lib/format';
import {
  B2C_WEEKLY_MACRO_AIR_SUMMARY,
  B2C_DAILY_AIR_PULSE_OCT_2026,
  B2C_STORE_WEEKLY_AIR_SYNC_LIST,
  StoreWeeklyAirSyncRecord,
  StoreAirSyncStatus,
  DealAirTimingStatus,
} from '../../lib/b2cWeeklyAirSyncDataset';

interface WeeklyAirSyncDashboardSectionProps {
  selectedBrandGlobal?: string;
  selectedPlatformGlobal?: 'ALL' | 'TikTok Shop' | 'Shopee Mall';
  selectedGovernanceGlobal?: 'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD';
}

type PlanBaselineMode = 'CORE_PAID_SELF' | 'BOOKED_32_SCHEDULE' | 'ALL_WITH_FOC';

const SYNC_STATUS_META: Record<
  StoreAirSyncStatus,
  {
    label: string;
    shortBadge: string;
    tone: 'positive' | 'info' | 'warning' | 'critical' | 'neutral';
    description: string;
  }
> = {
  AIR_SYNCHRONIZED: {
    label: 'Air đồng loạt chuẩn nhịp',
    shortBadge: 'Đã duyệt',
    tone: 'positive',
    description: 'Lên sóng tập trung đúng khung ngày cao điểm và đạt tỷ lệ khớp lịch cam kết ≥ 70%.',
  },
  AIR_BURST_UNSCHEDULED: {
    label: 'Gom cụm nhưng thiếu lịch dự kiến',
    shortBadge: 'Đang chạy',
    tone: 'info',
    description: 'Thực tế có gom video nổ đồng loạt theo đợt nhưng chuyên viên bỏ trống ngày dự kiến lên sóng trên kế hoạch.',
  },
  AIR_FRAGMENTED_LATE: {
    label: 'Vỡ lịch đồng loạt (Rải rác / Trễ)',
    shortBadge: 'Cần sửa',
    tone: 'warning',
    description: 'Kế hoạch đặt gom cụm ngày cao điểm nhưng thực tế bị trễ hạn hàng loạt, rải vụn qua nhiều ngày sau.',
  },
  AIR_BOTTLENECK_PENDING: {
    label: 'Nghẽn sóng (Chưa air đủ tuần)',
    shortBadge: 'Quá hạn',
    tone: 'critical',
    description: 'Có chỉ tiêu kế hoạch tuần W41–W42 hoặc đã book nhiều đơn nhưng tỷ lệ lên sóng thực tế dưới 45%.',
  },
  NO_WAVE_TARGET: {
    label: 'Không giao lịch W40–W42',
    shortBadge: 'Nháp',
    tone: 'neutral',
    description: 'Gian hàng không có chỉ tiêu video trả phí hoặc đơn cam kết trong nửa đầu tháng 10.',
  },
};

function renderDealTimingBadge(status: DealAirTimingStatus, dayDelta: number | null) {
  switch (status) {
    case 'ON_TIME':
      return <Status tone="positive">Đúng ngày hẹn</Status>;
    case 'EARLY':
      return (
        <Status tone="info">
          {dayDelta !== null ? `Sớm ${Math.abs(dayDelta)} ngày` : 'Air sớm trong sóng'}
        </Status>
      );
    case 'LATE':
      return (
        <Status tone="critical">
          {dayDelta !== null ? `Trễ +${dayDelta} ngày` : 'Trễ lịch cam kết'}
        </Status>
      );
    case 'UNSCHEDULED_AIR':
      return <Status tone="warning">Thiếu ngày dự kiến</Status>;
    case 'NOT_AIRED':
    default:
      return <Status tone="neutral">Chưa lên sóng</Status>;
  }
}

export const WeeklyAirSyncDashboardSection: React.FC<WeeklyAirSyncDashboardSectionProps> = ({
  selectedBrandGlobal = 'ALL',
  selectedPlatformGlobal = 'ALL',
  selectedGovernanceGlobal = 'ALL',
}) => {
  const [baselineMode, setBaselineMode] = useState<PlanBaselineMode>('CORE_PAID_SELF');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('ALL');
  const [selectedSyncStatus, setSelectedSyncStatus] = useState<'ALL' | StoreAirSyncStatus>('ALL');
  const [selectedDayFocus, setSelectedDayFocus] = useState<string>('2026-10-09');
  const [brandFilter, setBrandFilter] = useState<string>(selectedBrandGlobal);
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>(selectedPlatformGlobal);
  const [governanceFilter, setGovernanceFilter] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD'>(selectedGovernanceGlobal);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [visibleLimit, setVisibleLimit] = useState<number>(20);
  const [inspectStore, setInspectStore] = useState<StoreWeeklyAirSyncRecord | null>(null);
  const [modalDealFilter, setModalDealFilter] = useState<'ALL' | DealAirTimingStatus>('ALL');

  const allBrands = useMemo(() => {
    const s = new Set<string>();
    B2C_STORE_WEEKLY_AIR_SYNC_LIST.forEach((item) => {
      if (item.brandName) s.add(item.brandName);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, []);

  // Lọc danh sách gian hàng theo bộ lọc chung (trước khi lọc theo chip syncStatus)
  const baseFilteredStores = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return B2C_STORE_WEEKLY_AIR_SYNC_LIST.filter((st) => {
      if (brandFilter !== 'ALL' && st.brandName !== brandFilter) return false;
      if (platformFilter !== 'ALL' && st.platform !== platformFilter) return false;
      if (governanceFilter === 'WITH_LEADER' && !st.hasLeader) return false;
      if (governanceFilter === 'DIRECT_HEAD' && st.hasLeader) return false;
      if (selectedWeekFilter !== 'ALL') {
        const wkBucket = st.weeks.find((w) => w.weekCode === selectedWeekFilter);
        if (
          !wkBucket ||
          (wkBucket.planCoreVideos === 0 &&
            wkBucket.actualAiredInWeek === 0 &&
            wkBucket.bookedPlannedInWeek === 0)
        ) {
          return false;
        }
      }
      if (q) {
        const match =
          st.storeName.toLowerCase().includes(q) ||
          st.brandName.toLowerCase().includes(q) ||
          st.pic.toLowerCase().includes(q) ||
          (st.leaderName && st.leaderName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [brandFilter, platformFilter, governanceFilter, selectedWeekFilter, deferredSearch]);

  // Đếm số lượng theo từng trạng thái đồng loạt trên tập đang lọc
  const statusChipCounts = useMemo(() => {
    const counts: Record<'ALL' | StoreAirSyncStatus, number> = {
      ALL: baseFilteredStores.length,
      AIR_SYNCHRONIZED: 0,
      AIR_BURST_UNSCHEDULED: 0,
      AIR_FRAGMENTED_LATE: 0,
      AIR_BOTTLENECK_PENDING: 0,
      NO_WAVE_TARGET: 0,
    };
    baseFilteredStores.forEach((st) => {
      counts[st.syncStatus] = (counts[st.syncStatus] || 0) + 1;
    });
    return counts;
  }, [baseFilteredStores]);

  const filteredStores = useMemo(() => {
    if (selectedSyncStatus === 'ALL') return baseFilteredStores;
    return baseFilteredStores.filter((st) => st.syncStatus === selectedSyncStatus);
  }, [baseFilteredStores, selectedSyncStatus]);

  // Tổng hợp chỉ số điều hành trên tập gian hàng đang xem
  const executiveMetrics = useMemo(() => {
    let totalBooked = 0;
    let totalAired = 0;
    let onTime = 0;
    let early = 0;
    let late = 0;
    let unscheduled = 0;
    let pending = 0;
    let w40To42PlanCore = 0;
    let w40To42ActualAir = 0;
    let totalPlanPaidMonth = 0;
    let totalPlanSelfMonth = 0;
    let totalPlanFocMonth = 0;

    filteredStores.forEach((st) => {
      totalBooked += st.totalBooked;
      totalAired += st.totalAired;
      onTime += st.onTimeCount;
      early += st.earlyCount;
      late += st.lateCount;
      unscheduled += st.unscheduledCount;
      pending += st.pendingCount;
      w40To42PlanCore += st.w40To42PlanCore;
      w40To42ActualAir += st.w40To42ActualAir;
      totalPlanPaidMonth += st.totalPlanPaidMonth;
      totalPlanSelfMonth += st.totalPlanSelfMonth;
      totalPlanFocMonth += st.totalPlanFocMonth;
    });

    const scheduledAired = onTime + early + late;
    const syncAdherencePct =
      scheduledAired > 0 ? Math.round(((onTime + early) / scheduledAired) * 1000) / 10 : 0;
    const airedVsBookedPct =
      totalBooked > 0 ? Math.round((totalAired / totalBooked) * 1000) / 10 : 0;

    // Tính mật độ gom sóng 5 ngày cao điểm Mega Sale 10.10 (06/10 - 10/10)
    const megaWaveDays = B2C_DAILY_AIR_PULSE_OCT_2026.filter(
      (d) => d.date >= '2026-10-06' && d.date <= '2026-10-10'
    );
    const megaWaveActual = megaWaveDays.reduce((acc, d) => acc + d.actualCount, 0);
    const totalPulseActual = B2C_DAILY_AIR_PULSE_OCT_2026.reduce(
      (acc, d) => acc + d.actualCount,
      0
    );
    const megaWaveSharePct =
      totalPulseActual > 0 ? Math.round((megaWaveActual / totalPulseActual) * 1000) / 10 : 0;

    return {
      totalBooked,
      totalAired,
      onTime,
      early,
      late,
      unscheduled,
      pending,
      scheduledAired,
      syncAdherencePct,
      airedVsBookedPct,
      w40To42PlanCore,
      w40To42ActualAir,
      totalPlanPaidMonth,
      totalPlanSelfMonth,
      totalPlanFocMonth,
      megaWaveActual,
      megaWaveSharePct,
    };
  }, [filteredStores]);

  // Tổng hợp theo tuần từ tập gian hàng đang lọc
  const weeklyChartRows = useMemo(() => {
    return B2C_WEEKLY_MACRO_AIR_SUMMARY.map((macroWk) => {
      let planPaid = 0;
      let planFoc = 0;
      let planSelf = 0;
      let planCore = 0;
      let planTotal = 0;
      let bookedPlan = 0;
      let actualAir = 0;
      let onTime = 0;
      let early = 0;
      let late = 0;
      let unscheduled = 0;
      let pending = 0;

      const wkCode = macroWk.weekCode || macroWk.code;
      baseFilteredStores.forEach((st) => {
        const w = st.weeks.find((x) => x.weekCode === wkCode);
        if (!w) return;
        planPaid += w.planPaidVideos;
        planFoc += w.planFocVideos;
        planSelf += w.planSelfVideos;
        planCore += w.planCoreVideos;
        planTotal += w.planTotalVideos;
        bookedPlan += w.bookedPlannedInWeek;
        actualAir += w.actualAiredInWeek;
        onTime += w.onTimeInWeek;
        early += w.earlyInWeek;
        late += w.lateInWeek;
        unscheduled += w.unscheduledInWeek;
        pending += w.pendingInWeek;
      });

      const targetQty =
        baselineMode === 'CORE_PAID_SELF'
          ? Math.max(planCore, bookedPlan)
          : baselineMode === 'BOOKED_32_SCHEDULE'
          ? bookedPlan
          : planTotal;

      const progressPct = targetQty > 0 ? Math.round((actualAir / targetQty) * 100) : 0;

      return {
        ...macroWk,
        weekCode: wkCode,
        planPaid,
        planFoc,
        planSelf,
        planCore,
        planTotal,
        bookedPlan,
        actualAir,
        onTime,
        early,
        late,
        unscheduled,
        pending,
        targetQty,
        progressPct,
      };
    });
  }, [baseFilteredStores, baselineMode]);

  const focusedDayRecord = useMemo(() => {
    return (
      B2C_DAILY_AIR_PULSE_OCT_2026.find((d) => d.date === selectedDayFocus) ||
      B2C_DAILY_AIR_PULSE_OCT_2026[8]
    );
  }, [selectedDayFocus]);

  const maxDailyValue = useMemo(() => {
    let m = 10;
    B2C_DAILY_AIR_PULSE_OCT_2026.forEach((d) => {
      if (d.actualCount > m) m = d.actualCount;
      if (d.plannedCount > m) m = d.plannedCount;
    });
    return m;
  }, []);

  const inspectedStoreDeals = useMemo(() => {
    if (!inspectStore) return [];
    if (modalDealFilter === 'ALL') return inspectStore.deals;
    return inspectStore.deals.filter((d) => d.syncTimingStatus === modalDealFilter);
  }, [inspectStore, modalDealFilter]);

  return (
    <div className="space-y-5">
      {/* 1. 4 Ô CHỈ SỐ ĐIỀU HÀNH CỐT LÕI VỀ LỊCH AIR TUẦN & ĐỘ ĐỒNG LOẠT */}
      <StatRow>
        <Stat
          label="Sản lượng đã air / Đơn đã book"
          value={`${formatNumber(executiveMetrics.totalAired)} / ${formatNumber(executiveMetrics.totalBooked)}`}
          tone="positive"
          progress={{ value: executiveMetrics.totalAired, max: Math.max(executiveMetrics.totalBooked, 1) }}
          note={`Đạt ${executiveMetrics.airedVsBookedPct}% đơn book · Còn ${executiveMetrics.pending} đơn chờ lên sóng`}
        />
        <Stat
          label="Độ khớp lịch cam kết (Đúng & Sớm)"
          value={`${executiveMetrics.syncAdherencePct}%`}
          tone={executiveMetrics.syncAdherencePct >= 75 ? 'positive' : 'warning'}
          progress={{
            value: executiveMetrics.onTime + executiveMetrics.early,
            max: Math.max(executiveMetrics.scheduledAired, 1),
          }}
          note={`${executiveMetrics.onTime} đúng ngày + ${executiveMetrics.early} sớm · ${executiveMetrics.late} trễ lịch · ${executiveMetrics.unscheduled} thiếu ngày dự kiến`}
        />
        <Stat
          label="Mật độ nổ đồng loạt sóng 10.10"
          value={`${executiveMetrics.megaWaveSharePct}% (${executiveMetrics.megaWaveActual} video)`}
          tone="positive"
          note="Tập trung trong 5 ngày cao điểm 06/10 – 10/10 · Đỉnh sóng 09/10 nổ 137 video/ngày"
        />
        <Stat
          label="Phân loại 69 gian hàng theo độ đồng loạt"
          value={`${statusChipCounts.AIR_SYNCHRONIZED} chuẩn · ${statusChipCounts.AIR_FRAGMENTED_LATE + statusChipCounts.AIR_BOTTLENECK_PENDING} lệch/nghẽn`}
          tone={statusChipCounts.AIR_BOTTLENECK_PENDING > 0 ? 'warning' : 'positive'}
          note={`${statusChipCounts.AIR_BURST_UNSCHEDULED} gian gom cụm thiếu ngày KH · ${statusChipCounts.AIR_BOTTLENECK_PENDING} gian kẹt chưa air`}
        />
      </StatRow>

      {/* 2. KHỐI BIỂU ĐỒ KÉP: LỊCH AIR KẾ HOẠCH THEO TUẦN (W40-W45) & BIỂU ĐỒ NGÀY (01/10 - 31/10) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CỘT TRÁI (5 CỘT): LỊCH AIR KẾ HOẠCH THEO TUẦN VS THỰC TẾ LÊN SÓNG */}
        <div className="lg:col-span-5 bg-surface rounded-xl border border-line p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  1. Lịch air kế hoạch vs. thực tế theo tuần (W40 → W45)
                </h3>
              </div>
              {selectedWeekFilter !== 'ALL' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWeekFilter('ALL')}
                >
                  Xem cả tháng
                </Button>
              )}
            </div>

            {/* Bộ chọn Hệ quy chiếu Kế hoạch tuần */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-2">Hệ quy chiếu kế hoạch:</span>
              <Segmented
                value={baselineMode}
                onChange={(v) => setBaselineMode(v as PlanBaselineMode)}
                items={[
                  { key: 'CORE_PAID_SELF', label: 'Paid KOC + Kênh Brand' },
                  { key: 'BOOKED_32_SCHEDULE', label: 'Lịch đơn 3.2' },
                  { key: 'ALL_WITH_FOC', label: 'Gồm cả FOC 0đ' },
                ]}
              />
            </div>

            {/* Danh sách 6 Tuần W40 -> W45 */}
            <div className="mt-3 space-y-2.5">
              {weeklyChartRows.map((wk) => {
                const isSelected = selectedWeekFilter === wk.weekCode;
                const isCurrentOrPastWeek = ['W40', 'W41', 'W42'].includes(wk.weekCode);
                const maxBarRef = Math.max(wk.targetQty, wk.actualAir, 1);
                const planWidthPct = Math.min(100, Math.round((wk.targetQty / maxBarRef) * 100));
                const actualWidthPct = Math.min(100, Math.round((wk.actualAir / maxBarRef) * 100));

                const actualBarColorClass =
                  wk.progressPct >= 70
                    ? 'bg-positive'
                    : wk.progressPct >= 30
                    ? 'bg-warning'
                    : wk.actualAir > 0
                    ? 'bg-critical'
                    : 'bg-ink-3/30';

                return (
                  <div
                    key={wk.weekCode}
                    onClick={() =>
                      setSelectedWeekFilter(isSelected ? 'ALL' : wk.weekCode)
                    }
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-accent-soft/50 border-accent'
                        : 'bg-canvas/60 border-line hover:bg-canvas'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-semibold font-code ${
                            isSelected
                              ? 'text-accent'
                              : isCurrentOrPastWeek
                              ? 'text-ink'
                              : 'text-ink-3'
                          }`}
                        >
                          {wk.weekCode}
                        </span>
                        <span className="text-xs font-semibold text-ink truncate">
                          {wk.dateRange} · {wk.waveTheme}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold font-code shrink-0 ${
                          wk.progressPct >= 70
                            ? 'text-positive'
                            : wk.progressPct >= 30
                            ? 'text-warning'
                            : wk.actualAir > 0
                            ? 'text-critical'
                            : 'text-ink-3'
                        }`}
                      >
                        Thực air {wk.actualAir} / KH {wk.targetQty} ({wk.progressPct}%)
                      </span>
                    </div>

                    {/* 2 Thanh đơn sắc rõ ràng: Thanh 1 = Kế hoạch, Thanh 2 = Thực tế đã Air */}
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-ink-3 shrink-0">Kế hoạch:</span>
                        <div className="flex-1 h-2.5 bg-sunken rounded-full overflow-hidden">
                          <div
                            className="data-bar h-full bg-ink-3/40 rounded-full"
                            style={{ width: `${Math.max(planWidthPct, wk.targetQty > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <span className="w-36 text-right font-code text-ink-2 shrink-0">
                          {wk.targetQty} video ({wk.planPaid} Paid · {wk.planSelf} Brand)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-ink font-medium shrink-0">Thực tế air:</span>
                        <div className="flex-1 h-2.5 bg-sunken rounded-full overflow-hidden">
                          {wk.actualAir > 0 && (
                            <div
                              className={`data-bar h-full rounded-full ${actualBarColorClass}`}
                              style={{ width: `${Math.max(actualWidthPct, 4)}%` }}
                            />
                          )}
                        </div>
                        <span className="w-36 text-right font-code font-medium text-ink shrink-0">
                          {wk.actualAir > 0
                            ? `${wk.actualAir} air (${wk.onTime + wk.early} đúng hẹn · ${wk.late} trễ)`
                            : wk.pending > 0
                            ? `0 air (${wk.pending} đơn đang chờ)`
                            : '0 video'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (7 CỘT): BIỂU ĐỒ LỊCH AIR KẾ HOẠCH VS THỰC TẾ TỪNG NGÀY (01/10 -> 31/10/2026) */}
        <div className="lg:col-span-7 bg-surface rounded-xl border border-line p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  2. Biểu đồ lịch air từng ngày &amp; kiểm tra nổ sóng đồng loạt (Tháng 10/2026)
                </h3>
              </div>
            </div>

            {/* 3 Thẻ Tóm tắt 3 Đợt Sóng Chiến Dịch lớn trong tháng (Bấm để nhảy tới ngày đó) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
              <div
                onClick={() => setSelectedDayFocus('2026-10-01')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedDayFocus === '2026-10-01'
                    ? 'bg-critical-soft/60 border-critical'
                    : 'bg-canvas border-line hover:bg-sunken'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Đợt 1 · Ngày 01/10</span>
                  <span className="text-2xs font-medium text-critical">Hụt lịch (Cột Đỏ)</span>
                </div>
                <div className="mt-1 text-xs font-semibold font-code text-critical">
                  Thực tế 29 / Kế hoạch 91 video
                </div>
              </div>

              <div
                onClick={() => setSelectedDayFocus('2026-10-09')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedDayFocus >= '2026-10-06' && selectedDayFocus <= '2026-10-10'
                    ? 'bg-positive-soft/60 border-positive'
                    : 'bg-canvas border-line hover:bg-sunken'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Đợt 2 · Cao điểm 06–10/10</span>
                  <span className="text-2xs font-medium text-positive">Air đồng loạt (Cột Xanh lá)</span>
                </div>
                <div className="mt-1 text-xs font-semibold font-code text-positive">
                  Thực tế 413 / Kế hoạch 296 video
                </div>
              </div>

              <div
                onClick={() => setSelectedDayFocus('2026-10-30')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedDayFocus >= '2026-10-29'
                    ? 'bg-accent-soft/60 border-accent'
                    : 'bg-canvas border-line hover:bg-sunken'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Đợt 3 · Cuối tháng 29–31/10</span>
                  <span className="text-2xs font-medium text-accent">Đón sóng 11.11 (Cột Xanh lam)</span>
                </div>
                <div className="mt-1 text-xs font-semibold font-code text-accent">
                  Ngày 30/10: Thực tế 31 / KH 27 video
                </div>
              </div>
            </div>

            {/* Biểu đồ cột đôi (Kế hoạch vs Thực tế) 31 ngày Tháng 10/2026 */}
            <div className="mt-3 pt-3 px-3 pb-2 rounded-lg bg-canvas/70 border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2 mb-2">
                <span>
                  <strong>Biểu đồ 31 ngày (01/10 → 31/10/2026)</strong>
                </span>
                <span className="font-code text-ink-3">Đỉnh cao nhất: {maxDailyValue} video/ngày (09/10)</span>
              </div>

              <div className="h-48 flex items-end gap-1 pt-5 pb-1 overflow-x-auto">
                {B2C_DAILY_AIR_PULSE_OCT_2026.map((d) => {
                  const isFocused = d.date === selectedDayFocus;
                  const isWeekMatched =
                    selectedWeekFilter === 'ALL' || d.weekCode === selectedWeekFilter;
                  const actualH = Math.round((d.actualCount / maxDailyValue) * 128);
                  const planH = Math.round((d.plannedCount / maxDailyValue) * 128);

                  // Quy tắc 1 màu duy nhất cho cột Thực tế của từng ngày (không chia khúc gây rối mắt)
                  const isMissedWaveDay =
                    d.plannedCount >= 10 && d.actualCount < d.plannedCount * 0.6;
                  const isMegaSaleWave = d.date >= '2026-10-06' && d.date <= '2026-10-10';

                  const actualBarBg = isMissedWaveDay
                    ? 'bg-critical'
                    : isMegaSaleWave || (d.actualCount >= d.plannedCount && d.actualCount >= 15)
                    ? 'bg-positive'
                    : 'bg-accent';

                  const actualTextColor = isMissedWaveDay
                    ? 'text-critical'
                    : isMegaSaleWave
                    ? 'text-positive'
                    : 'text-ink';

                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDayFocus(d.date)}
                      title={`Ngày ${d.dayLabel} (${d.weekCode}): Kế hoạch hẹn ${d.plannedCount} video | Thực tế đã air ${d.actualCount} video`}
                      className={`group relative flex-1 min-w-[22px] flex flex-col items-center justify-end h-full rounded-md px-0.5 py-1 transition-colors cursor-pointer ${
                        isFocused
                          ? 'bg-accent-soft ring-1 ring-accent'
                          : isMegaSaleWave
                          ? 'bg-positive-soft/35 hover:bg-positive-soft/60'
                          : 'hover:bg-sunken/80'
                      } ${!isWeekMatched ? 'opacity-30' : ''}`}
                    >
                      {/* Nhãn số lượng Thực tế trên đỉnh cột */}
                      {(d.actualCount >= 15 || d.plannedCount >= 30 || isFocused) && (
                        <span
                          className={`text-2xs font-code font-semibold mb-1 leading-none ${actualTextColor}`}
                        >
                          {d.actualCount}
                        </span>
                      )}

                      {/* Cặp 2 cột cạnh nhau: Trái = Kế hoạch (Xám viền đứt), Phải = Thực tế (1 màu đơn nhất) */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        {/* Cột Trái: Kế hoạch (p_air_date) */}
                        <div
                          className="w-2 rounded-t-sm bg-ink-3/30 border border-dashed border-ink-2/70"
                          style={{
                            height: `${Math.max(planH, d.plannedCount > 0 ? 4 : 1)}px`,
                          }}
                        />
                        {/* Cột Phải: Thực tế đã Air (air_date_real) */}
                        <div
                          className={`w-2.5 rounded-t-sm ${
                            d.actualCount > 0 ? actualBarBg : 'bg-line'
                          }`}
                          style={{
                            height: `${Math.max(actualH, d.actualCount > 0 ? 4 : 1)}px`,
                          }}
                        />
                      </div>

                      {/* Nhãn ngày (01 .. 31) */}
                      <span
                        className={`mt-1.5 text-2xs font-code leading-none ${
                          isFocused
                            ? 'font-semibold text-accent'
                            : isMegaSaleWave
                            ? 'font-semibold text-positive'
                            : 'text-ink-3'
                        }`}
                      >
                        {d.dayLabel.slice(0, 2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Thanh thông tin chi tiết của Ngày đang chọn (Focused Day Inspector) */}
          {focusedDayRecord && (
            <div className="mt-3 p-3 rounded-lg bg-accent-soft/40 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold font-code text-accent">
                    Đang xem Ngày {focusedDayRecord.dayLabel}/2026 ({focusedDayRecord.weekCode})
                  </span>
                  {focusedDayRecord.campaignTag && (
                    <span className="text-xs font-semibold text-ink">
                      · {focusedDayRecord.campaignTag}
                    </span>
                  )}
                  <span className="text-xs text-ink-3">
                    · Chi phí duyệt chi ngày {focusedDayRecord.dayLabel}:{' '}
                    <strong className="font-code text-ink">
                      {formatVndShort(focusedDayRecord.totalCostActual)}
                    </strong>
                  </span>
                </div>
                <p className="text-xs text-ink-2">
                  <strong>Cột Xám (Kế hoạch hẹn air):</strong>{' '}
                  <strong className="font-code text-ink">{focusedDayRecord.plannedCount} video</strong>
                  {' · '}
                  <strong>Cột Màu (Thực tế đã air):</strong>{' '}
                  <strong className="font-code text-positive">{focusedDayRecord.actualCount} video</strong>{' '}
                  (Gồm: {focusedDayRecord.onTimeCount} đúng ngày hẹn, {focusedDayRecord.earlyCount} lên sớm,{' '}
                  {focusedDayRecord.lateSpilloverCount} trễ từ ngày trước dồn sang,{' '}
                  {focusedDayRecord.unscheduledCount} đơn chưa điền ngày dự kiến)
                </p>
              </div>

              {focusedDayRecord.topStores.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs text-ink-3">Gian hàng lên nhiều nhất:</span>
                  {focusedDayRecord.topStores.map((ts, idx) => (
                    <span
                      key={ts.storeName}
                      className="text-xs font-medium text-ink"
                    >
                      {idx > 0 ? '· ' : ''}{ts.storeName.split('_')[0]} (<strong className="font-code">{ts.count} video</strong>)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. MA TRẬN KIỂM SOÁT LỊCH AIR TUẦN (W40-W45) & CHẨN ĐOÁN AIR ĐỒNG LOẠT 69 GIAN HÀNG B2C */}
      <Panel
        flush
        title={`Ma trận lịch air tuần (W40–W45) & chẩn đoán air đồng loạt (${filteredStores.length} gian hàng)`}
      >
        {/* Thanh công cụ lọc bảng */}
        <div className="p-4 border-b border-line space-y-3 bg-surface">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm gian hàng, thương hiệu, PIC..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-hidden focus:border-accent focus:bg-surface"
              />
            </div>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink focus:outline-hidden focus:border-accent"
            >
              <option value="ALL">Tất cả thương hiệu ({allBrands.length} Brand)</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>
                  Thương hiệu: {b}
                </option>
              ))}
            </select>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as 'ALL' | 'TikTok Shop' | 'Shopee Mall')}
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink focus:outline-hidden focus:border-accent"
            >
              <option value="ALL">Tất cả sàn (TikTok Shop &amp; Shopee)</option>
              <option value="TikTok Shop">Sàn TikTok Shop</option>
              <option value="Shopee Mall">Sàn Shopee Mall</option>
            </select>

            <select
              value={governanceFilter}
              onChange={(e) =>
                setGovernanceFilter(e.target.value as 'ALL' | 'WITH_LEADER' | 'DIRECT_HEAD')
              }
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg font-medium text-ink focus:outline-hidden focus:border-accent"
            >
              <option value="ALL">Mọi luồng duyệt (69 gian hàng)</option>
              <option value="WITH_LEADER">Có Trưởng nhóm Ngọc Tâm (8 gian)</option>
              <option value="DIRECT_HEAD">Trình trực tiếp Giám đốc MKT (61 gian)</option>
            </select>
          </div>

          {/* Chip lọc theo 4 trạng thái Air đồng loạt */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'ALL', label: 'Tất cả gian hàng' },
                  { key: 'AIR_SYNCHRONIZED', label: 'Air đồng loạt chuẩn nhịp' },
                  { key: 'AIR_FRAGMENTED_LATE', label: 'Vỡ lịch / Rải rác trễ nhịp' },
                  { key: 'AIR_BURST_UNSCHEDULED', label: 'Gom cụm thiếu lịch dự kiến' },
                  { key: 'AIR_BOTTLENECK_PENDING', label: 'Nghẽn sóng / Kẹt chưa air' },
                  { key: 'NO_WAVE_TARGET', label: 'Không giao lịch W40–W42' },
                ] as const
              ).map((chip) => {
                const active = selectedSyncStatus === chip.key;
                const count = statusChipCounts[chip.key];
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setSelectedSyncStatus(chip.key)}
                    className={`px-2.5 py-1 rounded-md text-2xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-ink text-white font-semibold'
                        : 'bg-sunken text-ink-2 hover:bg-line/60'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-sm font-code text-2xs ${
                        active ? 'bg-white/20 text-white' : 'bg-surface text-ink-3'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {(selectedSyncStatus !== 'ALL' ||
              selectedWeekFilter !== 'ALL' ||
              brandFilter !== 'ALL' ||
              platformFilter !== 'ALL' ||
              governanceFilter !== 'ALL' ||
              searchQuery.trim() !== '') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSyncStatus('ALL');
                  setSelectedWeekFilter('ALL');
                  setBrandFilter('ALL');
                  setPlatformFilter('ALL');
                  setGovernanceFilter('ALL');
                  setSearchQuery('');
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        {/* Bảng Ma trận 8 cột vừa khít màn hình */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-canvas text-ink-3 border-b border-line sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4 font-medium">Gian hàng &amp; thương hiệu</th>
                <th className="py-2.5 px-3 font-medium">PIC &amp; luồng duyệt</th>
                <th className="py-2.5 px-3 font-medium">Chẩn đoán air đồng loạt</th>
                <th className="py-2.5 px-3 font-medium text-center">
                  Ma trận lịch tuần (Thực air / Kế hoạch Paid+Brand)
                </th>
                <th className="py-2.5 px-3 font-medium text-right">Độ tụ sóng 3 ngày đỉnh</th>
                <th className="py-2.5 px-3 font-medium text-right">Khớp lịch hẹn</th>
                <th className="py-2.5 px-3 font-medium text-right">Tiến độ đơn 3.2</th>
                <th className="py-2.5 px-4 font-medium text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      title="Không có gian hàng phù hợp bộ lọc"
                      description="Thử chọn lại trạng thái đồng loạt hoặc xóa bộ lọc tuần/thương hiệu."
                    />
                  </td>
                </tr>
              ) : (
                filteredStores.slice(0, visibleLimit).map((st) => {
                  const meta = SYNC_STATUS_META[st.syncStatus];
                  const w40 = st.weeks.find((w) => w.weekCode === 'W40')!;
                  const w41 = st.weeks.find((w) => w.weekCode === 'W41')!;
                  const w42 = st.weeks.find((w) => w.weekCode === 'W42')!;
                  const w43 = st.weeks.find((w) => w.weekCode === 'W43')!;
                  const w44 = st.weeks.find((w) => w.weekCode === 'W44')!;
                  const w45 = st.weeks.find((w) => w.weekCode === 'W45')!;

                  const compactWeeks = [
                    { code: 'W40', air: w40.actualAiredInWeek, plan: Math.max(w40.planCoreVideos, w40.bookedPlannedInWeek) },
                    { code: 'W41', air: w41.actualAiredInWeek, plan: w41.planCoreVideos },
                    { code: 'W42', air: w42.actualAiredInWeek, plan: w42.planCoreVideos },
                    { code: 'W43', air: w43.actualAiredInWeek, plan: w43.planCoreVideos },
                    {
                      code: 'W44-45',
                      air: w44.actualAiredInWeek + w45.actualAiredInWeek,
                      plan: w44.planCoreVideos + w45.planCoreVideos,
                    },
                  ];

                  return (
                    <tr
                      key={st.storeId}
                      onClick={() => {
                        setModalDealFilter('ALL');
                        setInspectStore(st);
                      }}
                      className="hover:bg-canvas transition-colors cursor-pointer"
                    >
                      {/* 1. Gian hàng & Brand */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{st.storeName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-ink-3">
                          <ChannelTag channel={st.platform} />
                          <span>·</span>
                          <span>{st.brandName}</span>
                        </div>
                      </td>

                      {/* 2. PIC & Luồng duyệt */}
                      <td className="py-3 px-3">
                        <Person name={st.pic} size={20} />
                        <div className="text-2xs text-ink-3 mt-0.5">
                          {st.hasLeader
                            ? `Qua Leader ${st.leaderName}`
                            : 'Trình trực tiếp TP Yến Nhi'}
                        </div>
                      </td>

                      {/* 3. Chẩn đoán Air đồng loạt */}
                      <td className="py-3 px-3 max-w-[260px]">
                        <Status tone={meta.tone}>{meta.label}</Status>
                        <p className="text-2xs text-ink-3 mt-0.5 line-clamp-2">
                          {st.syncDiagnosis}
                        </p>
                      </td>

                      {/* 4. Ma trận 5 cột tuần */}
                      <td className="py-3 px-3">
                        <div className="grid grid-cols-5 gap-1 min-w-[235px]">
                          {compactWeeks.map((cw) => {
                            const hasActivity = cw.air > 0 || cw.plan > 0;
                            const isGood = cw.air > 0 && cw.air >= cw.plan * 0.7;
                            const isPartial = cw.air > 0 && cw.air < cw.plan * 0.7;
                            const isMissed =
                              cw.air === 0 &&
                              cw.plan > 0 &&
                              (cw.code === 'W40' || cw.code === 'W41' || cw.code === 'W42');

                            return (
                              <div
                                key={cw.code}
                                className={`px-1.5 py-1 rounded text-center font-code border ${
                                  isGood
                                    ? 'bg-positive-soft/70 border-positive/30 text-positive'
                                    : isPartial
                                    ? 'bg-warning-soft/70 border-warning/30 text-warning'
                                    : isMissed
                                    ? 'bg-critical-soft/60 border-critical/30 text-critical'
                                    : hasActivity
                                    ? 'bg-sunken border-line text-ink-2'
                                    : 'bg-canvas border-line/60 text-ink-3/60'
                                }`}
                              >
                                <span className="block text-2xs font-sans font-medium leading-tight">
                                  {cw.code}
                                </span>
                                <span className="block text-xs font-semibold leading-tight mt-0.5">
                                  {cw.air}/{cw.plan}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* 5. Độ tụ sóng 3 ngày đỉnh */}
                      <td className="py-3 px-3 text-right font-code">
                        {st.totalAired > 0 ? (
                          <>
                            <div className="font-semibold text-ink">
                              {st.burstConcentrationPct}% gom 3 ngày
                            </div>
                            <div className="text-2xs text-ink-3 font-sans">
                              Đỉnh {st.peakActualDate.slice(8, 10)}/10 ({st.peakActualCount} video)
                            </div>
                          </>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>

                      {/* 6. Khớp lịch hẹn */}
                      <td className="py-3 px-3 text-right font-code">
                        {st.totalAired > 0 ? (
                          <>
                            <div
                              className={`font-semibold ${
                                st.scheduleAdherencePct >= 75
                                  ? 'text-positive'
                                  : st.lateCount >= 4
                                  ? 'text-critical'
                                  : 'text-ink-2'
                              }`}
                            >
                              {st.onTimeCount + st.earlyCount} chuẩn · {st.lateCount} trễ
                            </div>
                            <div className="text-2xs text-ink-3 font-sans">
                              {st.unscheduledCount > 0
                                ? `${st.unscheduledCount} đơn thiếu ngày KH`
                                : `Đạt ${st.scheduleAdherencePct}% đúng hẹn`}
                            </div>
                          </>
                        ) : (
                          <span className="text-ink-3">Chưa air</span>
                        )}
                      </td>

                      {/* 7. Tiến độ đơn 3.2 */}
                      <td className="py-3 px-3 text-right font-code">
                        <div className="font-semibold text-ink">
                          {st.totalAired} / {st.totalBooked} đơn
                        </div>
                        <div className="text-2xs font-sans text-ink-3">
                          {st.pendingCount > 0 ? (
                            <span className="text-critical font-medium">
                              {st.pendingCount} đơn kẹt chờ air
                            </span>
                          ) : st.totalBooked > 0 ? (
                            <span className="text-positive">Đã air đủ 100%</span>
                          ) : (
                            <span>KH: {st.totalPlanCoreMonth} video</span>
                          )}
                        </div>
                      </td>

                      {/* 8. Hành động */}
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                          Soi lịch <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredStores.length > 20 && (
          <div className="p-3 bg-canvas border-t border-line flex items-center justify-between text-xs text-ink-2 px-4">
            <span>
              Đang hiển thị <strong className="font-semibold">{Math.min(visibleLimit, filteredStores.length)}</strong> /{' '}
              <strong className="font-semibold">{filteredStores.length}</strong> gian hàng B2C
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setVisibleLimit(visibleLimit >= filteredStores.length ? 20 : filteredStores.length)
              }
            >
              {visibleLimit >= filteredStores.length
                ? 'Thu gọn về 20 gian hàng'
                : `Xem toàn bộ ${filteredStores.length} gian hàng`}
            </Button>
          </div>
        )}
      </Panel>

      {/* 4. MODAL DRILL-DOWN CHI TIẾT LỊCH AIR TUẦN & ĐỘ ĐỒNG LOẠT CỦA GIAN HÀNG */}
      <Modal
        open={Boolean(inspectStore)}
        onClose={() => setInspectStore(null)}
        title={
          inspectStore
            ? `Đối soát lịch air tuần & độ đồng loạt — ${inspectStore.storeName}`
            : 'Chi tiết lịch air gian hàng'
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-2xs text-ink-3">
              Dữ liệu đối soát: Kế hoạch tuần &amp; Lịch duyệt book
            </span>
            <Button variant="secondary" size="sm" onClick={() => setInspectStore(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {inspectStore && (
          <div className="space-y-4 text-xs text-ink">
            {/* Đầu hồ sơ chẩn đoán */}
            <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ChannelTag channel={inspectStore.platform} />
                  <span className="font-semibold text-sm text-ink">{inspectStore.storeName}</span>
                  <Status tone={SYNC_STATUS_META[inspectStore.syncStatus].tone}>
                    {SYNC_STATUS_META[inspectStore.syncStatus].label}
                  </Status>
                </div>
                <p className="text-xs text-ink-2">{inspectStore.syncDiagnosis}</p>
                <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-3 pt-0.5">
                  <span>
                    Chuyên viên PIC: <strong className="text-ink font-medium">{inspectStore.pic}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Luồng duyệt:{' '}
                    <strong className="text-ink font-medium">
                      {inspectStore.hasLeader
                        ? `Qua Trưởng nhóm ${inspectStore.leaderName}`
                        : 'Trình trực tiếp Giám đốc MKT Đặng Thị Yến Nhi'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Thực chi Net:{' '}
                    <strong className="font-code text-ink">
                      {formatVndShort(inspectStore.actualSpentNet)} / {formatVndShort(inspectStore.budgetNet)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="shrink-0 bg-surface p-2.5 rounded-lg border border-line text-right font-code">
                <span className="block text-2xs font-sans text-ink-3">Đỉnh nổ đồng loạt</span>
                <span className="text-sm font-semibold text-ink">
                  {inspectStore.peakActualDate
                    ? `${inspectStore.peakActualDate.slice(8, 10)}/10 (${inspectStore.peakActualCount} video)`
                    : 'Chưa có đỉnh air'}
                </span>
                <span className="block text-2xs text-positive mt-0.5">
                  Tụ sóng 3 ngày: {inspectStore.burstConcentrationPct}%
                </span>
              </div>
            </div>

            {/* Bảng đối chiếu 6 Tuần W40 -> W45 của Gian hàng */}
            <div>
              <h4 className="text-xs font-semibold text-ink mb-2">
                1. Bảng đối chiếu lịch air kế hoạch tuần vs. thực tế lên sóng
              </h4>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-xs text-left">
                  <thead className="bg-canvas text-ink-3 border-b border-line">
                    <tr>
                      <th className="py-2 px-3 font-medium">Tuần chiến dịch</th>
                      <th className="py-2 px-3 font-medium text-right">KH Video Paid</th>
                      <th className="py-2 px-3 font-medium text-right">KH Kênh Brand</th>
                      <th className="py-2 px-3 font-medium text-right">KH Mẫu FOC (0đ)</th>
                      <th className="py-2 px-3 font-medium text-right">Đơn hẹn lịch 3.2</th>
                      <th className="py-2 px-3 font-medium text-right">Thực tế đã Air</th>
                      <th className="py-2 px-3 font-medium text-right">Đúng/Sớm · Trễ · Chờ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {inspectStore.weeks.map((w) => (
                      <tr key={w.weekCode} className="hover:bg-canvas/60">
                        <td className="py-2 px-3 font-code font-semibold text-ink">{w.weekCode}</td>
                        <td className="py-2 px-3 text-right font-code">{w.planPaidVideos}</td>
                        <td className="py-2 px-3 text-right font-code">{w.planSelfVideos}</td>
                        <td className="py-2 px-3 text-right font-code text-ink-3">{w.planFocVideos}</td>
                        <td className="py-2 px-3 text-right font-code font-medium">{w.bookedPlannedInWeek}</td>
                        <td className="py-2 px-3 text-right font-code font-semibold text-positive">
                          {w.actualAiredInWeek}
                        </td>
                        <td className="py-2 px-3 text-right font-code text-2xs">
                          <span className="text-positive">{w.onTimeInWeek + w.earlyInWeek} chuẩn</span> ·{' '}
                          <span className={w.lateInWeek > 0 ? 'text-critical font-semibold' : 'text-ink-3'}>
                            {w.lateInWeek} trễ
                          </span>{' '}
                          ·{' '}
                          <span className={w.pendingInWeek > 0 ? 'text-warning font-semibold' : 'text-ink-3'}>
                            {w.pendingInWeek} chờ
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Danh sách từng đơn video (BO...) của gian hàng */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h4 className="text-xs font-semibold text-ink">
                  2. Danh sách đơn booking &amp; kiểm tra ngày air thực tế ({inspectedStoreDeals.length} đơn)
                </h4>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { key: 'ALL', label: `Tất cả (${inspectStore.deals.length})` },
                      { key: 'ON_TIME', label: `Đúng ngày (${inspectStore.onTimeCount})` },
                      { key: 'LATE', label: `Trễ lịch (${inspectStore.lateCount})` },
                      { key: 'UNSCHEDULED_AIR', label: `Thiếu ngày KH (${inspectStore.unscheduledCount})` },
                      { key: 'NOT_AIRED', label: `Chưa air (${inspectStore.pendingCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setModalDealFilter(tab.key)}
                      className={`px-2 py-0.5 rounded text-2xs font-medium cursor-pointer ${
                        modalDealFilter === tab.key
                          ? 'bg-ink text-white'
                          : 'bg-sunken text-ink-2 hover:bg-line'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {inspectedStoreDeals.length === 0 ? (
                <div className="p-6 rounded-lg border border-line bg-canvas text-center text-ink-3">
                  Không có bản ghi đơn booking trong nhóm này.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-canvas text-ink-3 border-b border-line sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-medium">Mã BO &amp; KOC</th>
                        <th className="py-2 px-2.5 font-medium">Hạng mục &amp; KL</th>
                        <th className="py-2 px-2.5 font-medium text-right">Cát-xê</th>
                        <th className="py-2 px-2.5 font-medium text-center">Ngày dự kiến Air</th>
                        <th className="py-2 px-2.5 font-medium text-center">Ngày thực tế Air</th>
                        <th className="py-2 px-2.5 font-medium">Độ khớp lịch</th>
                        <th className="py-2 px-3 font-medium text-right">Video</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {inspectedStoreDeals.map((d) => (
                        <tr key={d.code} className="hover:bg-canvas/60">
                          <td className="py-2 px-3">
                            <div className="font-code font-semibold text-ink">{d.code}</div>
                            <div className="text-2xs text-ink-3">@{d.channelId}</div>
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="text-ink">{d.videoType}</div>
                            <div className="text-2xs text-ink-3">
                              {d.kl} · {d.pipeline}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-right font-code">
                            {formatVndShort(d.cost)}
                          </td>
                          <td className="py-2 px-2.5 text-center font-code">
                            {d.plannedAirDate || <span className="text-ink-3">Trống</span>}
                          </td>
                          <td className="py-2 px-2.5 text-center font-code font-semibold">
                            {d.actualAirDate || <span className="text-ink-3">Chưa air</span>}
                          </td>
                          <td className="py-2 px-2.5">
                            {renderDealTimingBadge(d.syncTimingStatus, d.dayDelta)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {d.linkAir ? (
                              <a
                                href={d.linkAir}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                              >
                                Mở link <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
