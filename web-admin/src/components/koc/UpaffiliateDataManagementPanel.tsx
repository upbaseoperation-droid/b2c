'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { KocItem } from '../../lib/types';
import { formatNumber, formatVndShort } from '../../lib/format';
import {
  fetchStagingKocs,
  saveStagingKocsBatch,
  updateStagingKocStatusBatch,
  type StagingDiscoverySource,
  type StagingExportStatus,
  type StagingKocItem,
} from '../../lib/kocStagingService';
import {
  computeWindowPerformance,
  type DailyVideoPerformanceRow,
  type PerformanceWindowKey,
  type WindowPerformance,
} from '../../lib/upaffiliateDailyPerformance';
import {
  formatSyncDateTime,
  getUpaffiliateCreatorId,
  getUpaffiliateSyncStatus,
  type UpaffiliateSyncConfig,
  type UpaffiliateSyncRunLog,
} from '../../lib/upaffiliateKocSyncService';
import type {
  SystemRegisteredVideo,
  VideoWeeklySnapshotItem,
} from '../../lib/kocVideoWeeklyHistory';
import { getKocLegalProfiles, LEGAL_TYPE_LABEL, mask } from './kocUtils';
import {
  Button,
  Chips,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
} from '../ui';
import type { ChipOption, Column } from '../ui';

type HubSubTab = 'VIDEO_PERFORMANCE' | 'NEW_KOC_QUEUE' | 'LOCAL_CHANGES';

interface DailyRecordSummary {
  rows: DailyVideoPerformanceRow[];
  lastPulledAt: string;
}

interface UpaffiliateDataManagementPanelProps {
  kocs: KocItem[];
  syncConfig: UpaffiliateSyncConfig;
  syncLogs: UpaffiliateSyncRunLog[];
  isSyncing: boolean;
  currentUserName?: string;
  onRunSync: (
    mode: 'INCREMENTAL' | 'FULL_PULL' | 'PUSH_PENDING',
    triggerType?: 'MANUAL_TRIGGER' | 'STAGING_PUSH',
  ) => Promise<void>;
  onOpenSyncConfigModal: () => void;
  onOpenVideoRegistryModal: () => void;
  onOpenKocProfile: (kocId: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const DISCOVERY_SOURCE_LABELS: Record<StagingDiscoverySource, string> = {
  COMPETITOR_DISCOVERY: 'Quét KOC Đối thủ',
  HASHTAG_DISCOVERY: 'Tìm theo Hashtag',
  SEARCH_BAR: 'Tra cứu nhanh',
  EXCEL_IMPORT: 'Nhập file Excel',
  TIKTOK_SCRAPER: 'Lấy dữ liệu TikTok',
  MANUAL_ENTRY: 'Nhập thủ công',
};

export const UpaffiliateDataManagementPanel: React.FC<UpaffiliateDataManagementPanelProps> = ({
  kocs,
  syncConfig,
  isSyncing,
  currentUserName = 'Chuyên viên B2C',
  onRunSync,
  onOpenSyncConfigModal,
  onOpenVideoRegistryModal,
  onOpenKocProfile,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<HubSubTab>('VIDEO_PERFORMANCE');

  // ----------------------------------------------------------------- State 1: Danh sách Video theo dõi Performance
  const [registeredVideos, setRegisteredVideos] = useState<SystemRegisteredVideo[]>([]);
  const [weeklySnapshots, setWeeklySnapshots] = useState<VideoWeeklySnapshotItem[]>([]);
  const [dailyRecordsByVid, setDailyRecordsByVid] = useState<Record<string, DailyRecordSummary>>({});
  const [todayYmd, setTodayYmd] = useState<string>(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()),
  );
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [pullingVidId, setPullingVidId] = useState<string | null>(null);
  const [pullingBatchVideos, setPullingBatchVideos] = useState(false);

  const [videoSearch, setVideoSearch] = useState('');
  const [videoBrandFilter, setVideoBrandFilter] = useState('ALL');
  const [videoStatusFilter, setVideoStatusFilter] = useState<'ALL' | 'HAS_DATA' | 'WAIT_PULL'>('ALL');

  // ----------------------------------------------------------------- State 2: Hàng đợi KOC Mới gửi sang UpAffiliate
  const [stagingItems, setStagingItems] = useState<StagingKocItem[]>([]);
  const [loadingStaging, setLoadingStaging] = useState(true);
  const [stagingSearch, setStagingSearch] = useState('');
  const [stagingStatusFilter, setStagingStatusFilter] = useState<'ALL' | StagingExportStatus>('ALL');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickChannelInput, setQuickChannelInput] = useState('');
  const [quickStageName, setQuickStageName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickSourceContext, setQuickSourceContext] = useState('Tìm kiếm trực tiếp');
  const [savingQuickKoc, setSavingQuickKoc] = useState(false);
  const [processingStagingId, setProcessingStagingId] = useState<string | null>(null);

  // ----------------------------------------------------------------- State 3: Bản ghi sửa tại B2C Hub chờ đẩy ngược
  const [localSearch, setLocalSearch] = useState('');
  const [localFilterType, setLocalFilterType] = useState<'ALL' | 'LOCAL_MODIFIED' | 'PENDING_PUSH' | 'MULTI_LEGAL'>('ALL');

  // Nạp danh sách Video đã đăng ký + dữ liệu Daily Performance đã lưu
  const loadVideoPerformanceData = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch('/api/koc-video-history', {
        headers: { 'Cache-Control': 'no-store' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.registeredVideos)) {
        const vids: SystemRegisteredVideo[] = data.registeredVideos;
        setRegisteredVideos(vids);
        setWeeklySnapshots(Array.isArray(data.videoSnapshots) ? data.videoSnapshots : []);

        const ids = vids.map((v) => v.videoId).filter(Boolean).slice(0, 150);
        if (ids.length > 0) {
          const dailyRes = await fetch(
            `/api/integrations/upaffiliate/daily-performance?videoIds=${encodeURIComponent(ids.join(','))}`,
            { headers: { 'Cache-Control': 'no-store' } },
          );
          if (dailyRes.ok) {
            const dailyJson = await dailyRes.json();
            if (dailyJson.today) setTodayYmd(dailyJson.today);
            if (dailyJson.recordsByVideoId) {
              setDailyRecordsByVid(dailyJson.recordsByVideoId);
            }
          }
        }
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  // Nạp hàng đợi KOC mới trong Bảng tạm
  const loadStagingQueue = useCallback(async () => {
    setLoadingStaging(true);
    try {
      const items = await fetchStagingKocs();
      setStagingItems(items);
    } finally {
      setLoadingStaging(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadVideoPerformanceData();
      void loadStagingQueue();
    });
  }, [loadVideoPerformanceData, loadStagingQueue]);

  // Tính toán hiệu quả D14 / D30 / D60 và tổng lũy kế cho từng Video
  const enrichedVideoRows = useMemo(() => {
    const snapByVid = new Map<
      string,
      { views: number; orders: number; gmv: number; adsSpend: number; weeksCount: number; lastUpdated: string }
    >();
    for (const s of weeklySnapshots) {
      const cur = snapByVid.get(s.videoId) || {
        views: 0,
        orders: 0,
        gmv: 0,
        adsSpend: 0,
        weeksCount: 0,
        lastUpdated: '',
      };
      cur.views = Math.max(cur.views, s.views || 0);
      cur.orders += s.orders || 0;
      cur.gmv += s.gmv || 0;
      cur.adsSpend += s.adsSpend || 0;
      cur.weeksCount += 1;
      if (!cur.lastUpdated || s.updatedAt > cur.lastUpdated) {
        cur.lastUpdated = s.updatedAt;
      }
      snapByVid.set(s.videoId, cur);
    }

    return registeredVideos
      .map((v) => {
        const dailyRec = dailyRecordsByVid[v.videoId];
        const dailyRows = dailyRec?.rows || [];
        const airDate = (v.airDate || '2026-10-05').slice(0, 10);
        const windows: Record<PerformanceWindowKey, WindowPerformance> = computeWindowPerformance(
          dailyRows,
          airDate,
          todayYmd,
        );
        const snapAgg = snapByVid.get(v.videoId);
        const hasDaily = dailyRows.length > 0;
        const hasWeekly = Boolean(snapAgg && snapAgg.weeksCount > 0);

        const d14Gmv = windows.d14.gmv ?? (hasWeekly ? Math.round((snapAgg?.gmv || 0) * 0.45) : null);
        const d30Gmv = windows.d30.gmv ?? (hasWeekly ? Math.round((snapAgg?.gmv || 0) * 0.85) : null);
        const d60Gmv = windows.d60.gmv ?? (hasWeekly ? snapAgg?.gmv ?? null : null);

        const d14Views = windows.d14.views ?? (hasWeekly ? Math.round((snapAgg?.views || 0) * 0.6) : null);
        const d30Views = windows.d30.views ?? (hasWeekly ? snapAgg?.views ?? null : null);
        const d60Views = windows.d60.views ?? (hasWeekly ? snapAgg?.views ?? null : null);

        const d14Orders = windows.d14.orders ?? (hasWeekly ? Math.round((snapAgg?.orders || 0) * 0.45) : null);
        const d30Orders = windows.d30.orders ?? (hasWeekly ? Math.round((snapAgg?.orders || 0) * 0.85) : null);
        const d60Orders = windows.d60.orders ?? (hasWeekly ? snapAgg?.orders ?? null : null);

        const lastPulledAt = dailyRec?.lastPulledAt || snapAgg?.lastUpdated || '';
        const hasAnyData = hasDaily || hasWeekly;

        return {
          ...v,
          airDate,
          hasDaily,
          hasWeekly,
          hasAnyData,
          dailyDaysCovered: dailyRows.length,
          lastPulledAt,
          d14: { views: d14Views, orders: d14Orders, gmv: d14Gmv, daysInWindow: windows.d14.daysInWindow },
          d30: { views: d30Views, orders: d30Orders, gmv: d30Gmv, daysInWindow: windows.d30.daysInWindow },
          d60: { views: d60Views, orders: d60Orders, gmv: d60Gmv, daysInWindow: windows.d60.daysInWindow },
        };
      })
      .sort((a, b) => b.airDate.localeCompare(a.airDate));
  }, [registeredVideos, weeklySnapshots, dailyRecordsByVid, todayYmd]);

  const videoBrandOptions = useMemo(() => {
    const s = new Set<string>();
    for (const v of enrichedVideoRows) {
      if (v.brandName) s.add(v.brandName);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [enrichedVideoRows]);

  const filteredVideoRows = useMemo(() => {
    return enrichedVideoRows.filter((r) => {
      if (videoBrandFilter !== 'ALL' && r.brandName !== videoBrandFilter) return false;
      if (videoStatusFilter === 'HAS_DATA' && !r.hasAnyData) return false;
      if (videoStatusFilter === 'WAIT_PULL' && r.hasAnyData) return false;
      if (videoSearch.trim()) {
        const q = videoSearch.trim().toLowerCase();
        const matchVid = r.videoId.toLowerCase().includes(q);
        const matchKoc =
          r.kocChannelId.toLowerCase().includes(q) ||
          r.kocStageName.toLowerCase().includes(q);
        const matchDeal = (r.dealCode || '').toLowerCase().includes(q);
        const matchBrand = (r.brandName || '').toLowerCase().includes(q);
        if (!matchVid && !matchKoc && !matchDeal && !matchBrand) return false;
      }
      return true;
    });
  }, [enrichedVideoRows, videoBrandFilter, videoStatusFilter, videoSearch]);

  // Thao tác kéo lại số liệu Daily Performance cho 1 Video từ UpAffiliate
  const handlePullSingleVideoDaily = async (videoId: string, airDate: string) => {
    setPullingVidId(videoId);
    try {
      const res = await fetch('/api/integrations/upaffiliate/daily-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, airDate }),
      });
      const json = await res.json();
      if (json.rows) {
        setDailyRecordsByVid((prev) => ({
          ...prev,
          [videoId]: {
            rows: json.rows,
            lastPulledAt: json.lastPulledAt || new Date().toISOString(),
          },
        }));
      }
      if (res.ok && !json.error) {
        onNotify?.(
          `Đã kéo ${json.pulled || 0} ngày dữ liệu Performance cho Video ID ${videoId} từ UpAffiliate.`,
          'success',
        );
      } else {
        onNotify?.(
          json.error || `Chưa cấu hình URL API Daily UpAffiliate cho Video ${videoId}. Đang giữ số liệu hiện có.`,
          'info',
        );
      }
    } catch {
      onNotify?.(`Không kết nối được cổng Daily Performance cho Video ${videoId}.`, 'warning');
    } finally {
      setPullingVidId(null);
    }
  };

  // Kéo hàng loạt cho các video đang lọc
  const handlePullBatchVideos = async () => {
    const targets = filteredVideoRows.slice(0, 10);
    if (targets.length === 0) return;
    setPullingBatchVideos(true);
    try {
      for (const item of targets) {
        await fetch('/api/integrations/upaffiliate/daily-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: item.videoId, airDate: item.airDate }),
        }).catch(() => null);
      }
      await loadVideoPerformanceData();
      onNotify?.(
        `Đã gửi yêu cầu làm mới dữ liệu D14/D30/D60 cho ${targets.length} Video ID từ UpAffiliate.`,
        'info',
      );
    } finally {
      setPullingBatchVideos(false);
    }
  };

  // ----------------------------------------------------------------- Logic 2: Hàng đợi KOC Mới gửi sang UpAffiliate
  const stagingCounts = useMemo(() => {
    let pending = 0;
    let enriching = 0;
    let exported = 0;
    for (const it of stagingItems) {
      if (it.exportStatus === 'PENDING_EXPORT') pending++;
      else if (it.exportStatus === 'ENRICHING') enriching++;
      else if (it.exportStatus === 'EXPORTED') exported++;
    }
    return { pending, enriching, exported, total: stagingItems.length };
  }, [stagingItems]);

  const filteredStagingItems = useMemo(() => {
    return stagingItems.filter((it) => {
      if (stagingStatusFilter !== 'ALL' && it.exportStatus !== stagingStatusFilter) return false;
      if (stagingSearch.trim()) {
        const q = stagingSearch.trim().toLowerCase();
        const matchHandle = it.channelId.toLowerCase().includes(q);
        const matchName = (it.stageName || '').toLowerCase().includes(q);
        const matchSource = (it.sourceContext || '').toLowerCase().includes(q);
        const matchPhone = (it.phone || it.zalo || '').toLowerCase().includes(q);
        if (!matchHandle && !matchName && !matchSource && !matchPhone) return false;
      }
      return true;
    });
  }, [stagingItems, stagingStatusFilter, stagingSearch]);

  const handleAddQuickStagingKoc = async () => {
    const clean = quickChannelInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '')
      .split(/[/?#]/)[0]
      .replace(/^@+/, '');
    if (!clean) {
      onNotify?.('Vui lòng nhập @handle hoặc đường dẫn kênh TikTok của KOC mới.', 'warning');
      return;
    }
    setSavingQuickKoc(true);
    try {
      const res = await saveStagingKocsBatch([
        {
          channelId: clean,
          channelUrl: `https://www.tiktok.com/@${clean}`,
          stageName: quickStageName.trim() || clean,
          phone: quickPhone.trim() || undefined,
          followersCount: 0,
          avgViews: 0,
          discoverySource: 'MANUAL_ENTRY',
          sourceContext: quickSourceContext.trim() || 'Nhập trực tiếp tại B2C Hub',
          discoveredByStaffName: currentUserName,
        },
      ]);
      if (res.success) {
        setStagingItems(res.items);
        setQuickChannelInput('');
        setQuickStageName('');
        setQuickPhone('');
        setIsQuickAddOpen(false);
        onNotify?.(
          `Đã đưa KOC @${clean} vào hàng đợi chờ gửi sang UpAffiliate lấy số liệu Sàn & Kalodata.`,
          'success',
        );
      }
    } finally {
      setSavingQuickKoc(false);
    }
  };

  const handleSendToUpaffiliateForEnrichment = async (channelIds: string[]) => {
    if (channelIds.length === 0) return;
    setProcessingStagingId(channelIds[0]);
    try {
      const res = await updateStagingKocStatusBatch(channelIds, 'ENRICHING');
      if (res.success) {
        setStagingItems(res.items);
        onNotify?.(
          `Đã gửi ${channelIds.length} KOC mới sang UpAffiliate. Đang chờ UpAffiliate lấy dữ liệu Sàn & Kalodata.`,
          'info',
        );
      }
    } finally {
      setProcessingStagingId(null);
    }
  };

  const handlePullEnrichedKocFromUpaffiliate = async () => {
    await onRunSync('PUSH_PENDING', 'STAGING_PUSH');
    await loadStagingQueue();
  };

  const handleRemoveStagingKoc = async (channelId: string) => {
    await fetch(
      `/api/integrations/upaffiliate/staging?channelId=${encodeURIComponent(channelId)}`,
      { method: 'DELETE' },
    );
    await loadStagingQueue();
    onNotify?.(`Đã xóa @${channelId} khỏi hàng đợi KOC mới.`, 'info');
  };

  // ----------------------------------------------------------------- Logic 3: Bản ghi sửa tại B2C Hub chờ đẩy ngược
  const localModifiedKocs = useMemo(() => {
    return kocs.filter((k) => {
      const st = getUpaffiliateSyncStatus(k);
      const profiles = getKocLegalProfiles(k);
      if (localFilterType === 'LOCAL_MODIFIED' && st !== 'LOCAL_MODIFIED') return false;
      if (localFilterType === 'PENDING_PUSH' && st !== 'PENDING_PUSH') return false;
      if (localFilterType === 'MULTI_LEGAL' && profiles.length <= 1) return false;
      if (localFilterType === 'ALL') {
        const isPendingOrModified = st === 'LOCAL_MODIFIED' || st === 'PENDING_PUSH';
        const hasMultiLegal = profiles.length > 1;
        if (!isPendingOrModified && !hasMultiLegal) return false;
      }

      if (localSearch.trim()) {
        const q = localSearch.trim().toLowerCase();
        const matchName =
          k.stageName.toLowerCase().includes(q) ||
          k.channelId.toLowerCase().includes(q) ||
          (k.realName || '').toLowerCase().includes(q);
        const matchPhone = (k.phone || k.email || '').toLowerCase().includes(q);
        const matchTax = (k.cccd || k.taxCode || k.bankAccount || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTax) return false;
      }
      return true;
    });
  }, [kocs, localFilterType, localSearch]);

  const localPendingCount = useMemo(
    () =>
      kocs.filter((k) => {
        const st = getUpaffiliateSyncStatus(k);
        return st === 'LOCAL_MODIFIED' || st === 'PENDING_PUSH';
      }).length,
    [kocs],
  );

  // ----------------------------------------------------------------- Cột bảng 1: Video Performance (D14 / D30 / D60)
  const videoColumns: Column<(typeof enrichedVideoRows)[number]>[] = [
    {
      key: 'video',
      header: 'Video ID & KOC',
      width: 230,
      render: (r) => (
        <div className="space-y-0.5 min-w-0 max-w-[240px]">
          <div className="flex items-center gap-1.5">
            <a
              href={r.linkAir}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-code font-semibold text-xs text-ink hover:text-accent inline-flex items-center gap-1"
            >
              <span>{r.videoId}</span>
              <ExternalLink className="w-3 h-3 text-ink-3 shrink-0" />
            </a>
          </div>
          <div className="text-2xs text-ink truncate">
            <span className="font-medium">{r.kocStageName}</span>{' '}
            <span className="font-code text-ink-3">@{r.kocChannelId}</span>
          </div>
          <div className="text-2xs text-ink-3 truncate">
            Ngày Air: <span className="font-code text-ink-2">{r.airDate}</span>
            {r.dealCode ? ` · ${r.dealCode}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'brandStore',
      header: 'Brand & Cát-xê Net',
      width: 175,
      render: (r) => (
        <div className="space-y-0.5 min-w-0 max-w-[180px]">
          <div className="font-semibold text-xs text-ink truncate">{r.brandName}</div>
          <div className="text-2xs text-ink-3 truncate">{r.storeName}</div>
          <div className="text-2xs font-code text-ink-2 tabular-nums">
            Cast Net: {r.bookingCostNet > 0 ? formatVndShort(r.bookingCostNet) : '0đ (FOC)'}
          </div>
        </div>
      ),
    },
    {
      key: 'd14',
      header: 'Mốc D14 (14 ngày đầu)',
      align: 'right',
      width: 145,
      render: (r) => (
        <div className="text-right space-y-0.5 tabular-nums">
          {r.d14.gmv !== null ? (
            <>
              <div className="text-xs font-semibold text-ink">{formatVndShort(r.d14.gmv)}</div>
              <div className="text-2xs text-ink-2">
                {formatNumber(r.d14.views || 0)} view · {formatNumber(r.d14.orders || 0)} đơn
              </div>
            </>
          ) : (
            <span className="text-2xs text-ink-3">Chưa có số D14</span>
          )}
        </div>
      ),
    },
    {
      key: 'd30',
      header: 'Mốc D30 ( Nghiệm thu)',
      align: 'right',
      width: 145,
      render: (r) => (
        <div className="text-right space-y-0.5 tabular-nums">
          {r.d30.gmv !== null ? (
            <>
              <div className="text-xs font-semibold text-positive">{formatVndShort(r.d30.gmv)}</div>
              <div className="text-2xs text-ink-2">
                {formatNumber(r.d30.views || 0)} view · {formatNumber(r.d30.orders || 0)} đơn
              </div>
            </>
          ) : (
            <span className="text-2xs text-ink-3">Chưa có số D30</span>
          )}
        </div>
      ),
    },
    {
      key: 'd60',
      header: 'Mốc D60 (Lũy kế 60d)',
      align: 'right',
      width: 145,
      render: (r) => (
        <div className="text-right space-y-0.5 tabular-nums">
          {r.d60.gmv !== null ? (
            <>
              <div className="text-xs font-semibold text-ink">{formatVndShort(r.d60.gmv)}</div>
              <div className="text-2xs text-ink-2">
                {formatNumber(r.d60.views || 0)} view · {formatNumber(r.d60.orders || 0)} đơn
              </div>
            </>
          ) : (
            <span className="text-2xs text-ink-3">Chưa có số D60</span>
          )}
        </div>
      ),
    },
    {
      key: 'syncStatus',
      header: 'Trạng thái kéo số UpAffiliate',
      width: 175,
      render: (r) => (
        <div className="space-y-1">
          <Status tone={r.hasDaily ? 'positive' : r.hasWeekly ? 'info' : 'warning'}>
            {r.hasDaily
              ? `Daily (${r.dailyDaysCovered} ngày)`
              : r.hasWeekly
                ? 'Đã có số Tuần'
                : 'Chờ kéo từ UpAffiliate'}
          </Status>
          <div className="text-2xs text-ink-3 font-code">
            {r.lastPulledAt ? formatSyncDateTime(r.lastPulledAt) : 'Chưa đồng bộ'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 120,
      render: (r) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            disabled={pullingVidId === r.videoId}
            onClick={() => void handlePullSingleVideoDaily(r.videoId, r.airDate)}
          >
            {pullingVidId === r.videoId ? 'Đang kéo...' : 'Kéo lại số'}
          </Button>
        </div>
      ),
    },
  ];

  // ----------------------------------------------------------------- Cột bảng 2: Hàng đợi KOC Mới gửi sang UpAffiliate
  const stagingColumns: Column<StagingKocItem>[] = [
    {
      key: 'koc',
      header: 'KOC Mới phát hiện',
      width: 210,
      render: (it) => (
        <div className="space-y-0.5 min-w-0 max-w-[220px]">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-ink">
            <a
              href={it.channelUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-accent inline-flex items-center gap-1"
            >
              <span>@{it.channelId}</span>
              <ExternalLink className="w-3 h-3 text-ink-3 shrink-0" />
            </a>
          </div>
          <div className="text-2xs text-ink-2 truncate">{it.stageName}</div>
          {it.upaffiliateMasterId && (
            <div className="text-2xs font-code text-accent">{it.upaffiliateMasterId}</div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Nguồn tìm kiếm & Chuyên viên',
      width: 190,
      render: (it) => (
        <div className="space-y-0.5 min-w-0 max-w-[200px]">
          <div className="text-xs font-medium text-ink truncate">
            {DISCOVERY_SOURCE_LABELS[it.discoverySource] || it.discoverySource}
          </div>
          <div className="text-2xs text-ink-2 truncate">{it.sourceContext}</div>
          <div className="text-2xs text-ink-3 truncate">
            Bởi: {it.discoveredByStaffName || 'Chuyên viên B2C'} · {formatSyncDateTime(it.discoveredAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'metrics',
      header: 'Chỉ số sơ bộ / Kalodata',
      align: 'right',
      width: 150,
      render: (it) => (
        <div className="text-right space-y-0.5 tabular-nums">
          {it.followersCount > 0 || it.avgViews > 0 ? (
            <>
              <div className="text-xs font-semibold text-ink">
                {formatNumber(it.followersCount)} flw
              </div>
              <div className="text-2xs text-ink-2">
                TB {formatNumber(it.avgViews)} view/video
              </div>
            </>
          ) : (
            <span className="text-2xs text-ink-3">Chờ UpAffiliate trả số</span>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Liên hệ thu thập',
      width: 150,
      render: (it) => (
        <div className="space-y-0.5 text-xs">
          {it.phone || it.zalo ? (
            <span className="font-code text-ink font-medium">{mask(it.phone || it.zalo)}</span>
          ) : (
            <span className="text-2xs text-ink-3">Chưa có SĐT/Zalo</span>
          )}
          {it.email && <div className="text-2xs text-ink-2 truncate">{it.email}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái xử lý bên UpAffiliate',
      width: 215,
      render: (it) => {
        if (it.exportStatus === 'PENDING_EXPORT') {
          return (
            <div className="space-y-0.5">
              <Status tone="warning">1. Chờ gửi sang UpAffiliate</Status>
              <div className="text-2xs text-ink-3">Mới lưu tại B2C Hub</div>
            </div>
          );
        }
        if (it.exportStatus === 'ENRICHING') {
          return (
            <div className="space-y-0.5">
              <Status tone="info">2. Đang chờ lấy số Sàn / Kalodata</Status>
              <div className="text-2xs text-ink-3">
                Đã gửi lúc {formatSyncDateTime(it.exportedAt)}
              </div>
            </div>
          );
        }
        if (it.exportStatus === 'EXPORTED') {
          return (
            <div className="space-y-0.5">
              <Status tone="positive">3. Đã trả dữ liệu về Bảng KOC Mới</Status>
              <div className="text-2xs text-ink-3">
                Hoàn tất lúc {formatSyncDateTime(it.exportedAt)}
              </div>
            </div>
          );
        }
        return <Status tone="critical">Trùng lặp</Status>;
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 175,
      render: (it) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {it.exportStatus === 'PENDING_EXPORT' && (
            <Button
              size="sm"
              variant="primary"
              icon={Send}
              disabled={processingStagingId === it.channelId}
              onClick={() => void handleSendToUpaffiliateForEnrichment([it.channelId])}
            >
              Gửi sang UPA
            </Button>
          )}
          {it.exportStatus === 'ENRICHING' && (
            <Button
              size="sm"
              variant="secondary"
              icon={ArrowDownToLine}
              disabled={isSyncing}
              onClick={() => void handlePullEnrichedKocFromUpaffiliate()}
            >
              Nhận dữ liệu về
            </Button>
          )}
          {it.exportStatus === 'EXPORTED' && (
            <span className="inline-flex items-center gap-1 text-2xs font-medium text-positive px-2 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã vào Bảng 2
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            onClick={() => void handleRemoveStagingKoc(it.channelId)}
            aria-label="Xóa khỏi hàng đợi"
          />
        </div>
      ),
    },
  ];

  // ----------------------------------------------------------------- Cột bảng 3: Bản ghi sửa tại B2C Hub chờ đẩy ngược
  const localModifiedColumns: Column<KocItem>[] = [
    {
      key: 'koc',
      header: 'Mã UpAffiliate & KOC',
      width: 220,
      render: (k) => (
        <div className="space-y-0.5 min-w-0 max-w-[230px]">
          <div className="font-code text-2xs text-accent font-semibold">
            {getUpaffiliateCreatorId(k)}
          </div>
          <div className="font-semibold text-xs text-ink truncate">
            {k.stageName}{' '}
            <span className="font-code text-ink-3 font-normal">@{k.channelId.replace(/^@/, '')}</span>
          </div>
          <div className="text-2xs text-ink-3">
            {k.datasetType === 'NEW' ? 'Bảng 2: KOC Mới' : 'Bảng 1: KOC Hợp tác'}
          </div>
        </div>
      ),
    },
    {
      key: 'contactPatch',
      header: 'Thông tin Liên hệ cập nhật tại B2C',
      width: 185,
      render: (k) => (
        <div className="space-y-0.5 text-xs min-w-0 max-w-[195px]">
          <div className="font-code text-ink truncate">
            {k.phone || k.zalo ? mask(k.phone || k.zalo) : 'Chưa cập nhật SĐT'}
          </div>
          <div className="text-2xs text-ink-2 truncate">{k.email || 'Chưa có Email'}</div>
          {k.shippingAddress && (
            <div className="text-2xs text-ink-3 truncate" title={k.shippingAddress}>
              Đ/c: {k.shippingAddress}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'legalProfiles',
      header: 'Hồ sơ Pháp lý 1–N & STK Ngân hàng',
      width: 240,
      render: (k) => {
        const profiles = getKocLegalProfiles(k);
        if (profiles.length === 0) {
          return <span className="text-2xs text-ink-3">Chưa khai báo hồ sơ pháp lý</span>;
        }
        const primary = profiles[0];
        return (
          <div className="space-y-0.5 min-w-0 max-w-[250px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-ink">
                {profiles.length} pháp nhân
              </span>
              <span className="text-2xs text-ink-2">
                ({profiles.map((p) => LEGAL_TYPE_LABEL[p.legalType]).join(' · ')})
              </span>
            </div>
            <div className="text-2xs text-ink-2 truncate font-code">
              {primary.taxCode || (primary.cccd ? mask(primary.cccd) : 'Thiếu CCCD/MST')} ·{' '}
              {primary.bankAccount ? `${primary.bankName || 'NH'} ${mask(primary.bankAccount)}` : 'Thiếu STK'}
            </div>
            {primary.frameworkContractCode && (
              <div className="text-2xs text-positive font-code">
                HĐNT: {primary.frameworkContractCode}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'syncState',
      header: 'Trạng thái đồng bộ',
      width: 170,
      render: (k) => {
        const st = getUpaffiliateSyncStatus(k);
        return (
          <div className="space-y-0.5">
            <Status
              tone={
                st === 'LOCAL_MODIFIED'
                  ? 'info'
                  : st === 'PENDING_PUSH'
                    ? 'warning'
                    : 'positive'
              }
            >
              {st === 'LOCAL_MODIFIED'
                ? 'Vừa sửa tại B2C Hub'
                : st === 'PENDING_PUSH'
                  ? 'KOC mới chờ đẩy'
                  : 'Đã đồng bộ Master'}
            </Status>
            <div className="text-2xs text-ink-3 font-code">
              Rev #{k.upaffiliateRevision || 1}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 145,
      render: (k) => {
        const st = getUpaffiliateSyncStatus(k);
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {(st === 'LOCAL_MODIFIED' || st === 'PENDING_PUSH') && (
              <Button
                size="sm"
                variant="primary"
                icon={ArrowUpFromLine}
                disabled={isSyncing}
                onClick={() => void onRunSync('PUSH_PENDING', 'MANUAL_TRIGGER')}
              >
                Đẩy lên UPA
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenKocProfile(k.id)}
            >
              Mở hồ sơ
            </Button>
          </div>
        );
      },
    },
  ];

  const videoChips: ChipOption<'ALL' | 'HAS_DATA' | 'WAIT_PULL'>[] = [
    { key: 'ALL', label: 'Tất cả Video theo dõi', count: enrichedVideoRows.length },
    {
      key: 'HAS_DATA',
      label: 'Đã có số D14 / D30 / D60',
      count: enrichedVideoRows.filter((x) => x.hasAnyData).length,
    },
    {
      key: 'WAIT_PULL',
      label: 'Chờ kéo số từ UpAffiliate',
      count: enrichedVideoRows.filter((x) => !x.hasAnyData).length,
    },
  ];

  const stagingChips: ChipOption<'ALL' | StagingExportStatus>[] = [
    { key: 'ALL', label: 'Tất cả hàng đợi', count: stagingCounts.total },
    { key: 'PENDING_EXPORT', label: '1. Chờ gửi sang UpAffiliate', count: stagingCounts.pending },
    { key: 'ENRICHING', label: '2. Đang chờ lấy số Sàn/Kalodata', count: stagingCounts.enriching },
    { key: 'EXPORTED', label: '3. Đã trả dữ liệu về Bảng KOC Mới', count: stagingCounts.exported },
  ];

  const localChips: ChipOption<'ALL' | 'LOCAL_MODIFIED' | 'PENDING_PUSH' | 'MULTI_LEGAL'>[] = [
    { key: 'ALL', label: 'Tất cả bản ghi cần chú ý', count: localModifiedKocs.length },
    {
      key: 'LOCAL_MODIFIED',
      label: 'Vừa sửa Liên hệ / Pháp lý tại B2C',
      count: kocs.filter((k) => getUpaffiliateSyncStatus(k) === 'LOCAL_MODIFIED').length,
    },
    {
      key: 'PENDING_PUSH',
      label: 'KOC mới chờ đẩy',
      count: kocs.filter((k) => getUpaffiliateSyncStatus(k) === 'PENDING_PUSH').length,
    },
    {
      key: 'MULTI_LEGAL',
      label: 'KOC đa pháp nhân (≥ 2 hồ sơ)',
      count: kocs.filter((k) => getKocLegalProfiles(k).length > 1).length,
    },
  ];

  return (
    <div className="space-y-4">
      <StatRow>
        <Stat
          label="Video đang theo dõi Performance"
          value={`${formatNumber(enrichedVideoRows.length)} video`}
          note={`Đã có số D14/D30/D60: ${formatNumber(enrichedVideoRows.filter((x) => x.hasAnyData).length)} video`}
          tone="positive"
        />
        <Stat
          label="Hàng đợi KOC Mới gửi UpAffiliate"
          value={`${formatNumber(stagingCounts.pending + stagingCounts.enriching)} KOC`}
          note={`${stagingCounts.pending} chờ gửi · ${stagingCounts.enriching} đang lấy số Kalodata/Sàn`}
          tone={stagingCounts.pending + stagingCounts.enriching > 0 ? 'warning' : 'positive'}
        />
        <Stat
          label="Bản ghi sửa tại B2C chờ đẩy lên"
          value={`${formatNumber(localPendingCount)} hồ sơ`}
          note="Cập nhật SĐT, Zalo, Email, CCCD/MST & STK nhận tiền"
          tone={localPendingCount > 0 ? 'warning' : undefined}
        />
        <Stat
          label="Con trỏ đồng bộ UpAffiliate"
          value={syncConfig.lastSyncCursor || 'UPA-CUR-INIT'}
          note={`Đồng bộ gần nhất: ${formatSyncDateTime(syncConfig.lastSyncedAt)}`}
        />
      </StatRow>

      <Panel flush>
        <div className="px-4 pt-3 border-b border-line bg-surface">
          <Tabs<HubSubTab>
            value={subTab}
            onChange={setSubTab}
            items={[
              {
                key: 'VIDEO_PERFORMANCE',
                label: '1. Theo dõi Performance Video (D14 / D30 / D60)',
                count: enrichedVideoRows.length,
              },
              {
                key: 'NEW_KOC_QUEUE',
                label: '2. Hàng đợi KOC Mới gửi sang UpAffiliate',
                count: stagingCounts.total,
              },
              {
                key: 'LOCAL_CHANGES',
                label: '3. Bản ghi sửa tại B2C chờ đẩy lên (Liên hệ & Pháp lý 1–N)',
                count: localPendingCount,
              },
            ]}
            actions={
              <div className="flex items-center gap-2">
                {subTab === 'VIDEO_PERFORMANCE' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Plus}
                      onClick={onOpenVideoRegistryModal}
                    >
                      Đăng ký Video ID mới
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={RefreshCw}
                      disabled={pullingBatchVideos}
                      onClick={() => void handlePullBatchVideos()}
                    >
                      {pullingBatchVideos ? 'Đang kéo D14/D30/D60...' : 'Kéo số liệu từ UpAffiliate'}
                    </Button>
                  </>
                )}
                {subTab === 'NEW_KOC_QUEUE' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Plus}
                      onClick={() => setIsQuickAddOpen(true)}
                    >
                      Thêm KOC mới vào hàng đợi
                    </Button>
                    {stagingCounts.pending > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Send}
                        onClick={() =>
                          void handleSendToUpaffiliateForEnrichment(
                            stagingItems
                              .filter((x) => x.exportStatus === 'PENDING_EXPORT')
                              .map((x) => x.channelId),
                          )
                        }
                      >
                        Gửi {stagingCounts.pending} KOC sang UpAffiliate
                      </Button>
                    )}
                    {stagingCounts.enriching > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={ArrowDownToLine}
                        disabled={isSyncing}
                        onClick={() => void handlePullEnrichedKocFromUpaffiliate()}
                      >
                        Nhận {stagingCounts.enriching} KOC đã lấy xong số liệu
                      </Button>
                    )}
                  </>
                )}
                {subTab === 'LOCAL_CHANGES' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Settings2}
                      onClick={onOpenSyncConfigModal}
                    >
                      Lịch & Cấu hình
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={ArrowUpFromLine}
                      disabled={isSyncing || localPendingCount === 0}
                      onClick={() => void onRunSync('PUSH_PENDING', 'MANUAL_TRIGGER')}
                    >
                      Đẩy {localPendingCount} cập nhật lên UpAffiliate
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>

        {/* SUB-TAB 1: THEO DÕI PERFORMANCE VIDEO */}
        {subTab === 'VIDEO_PERFORMANCE' && (
          <>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: videoSearch,
                  onChange: setVideoSearch,
                  placeholder: 'Tìm theo Video ID (19 số), @handle KOC, Mã BO, Thương hiệu...',
                }}
                filters={
                  <Select
                    value={videoBrandFilter}
                    onChange={(e) => setVideoBrandFilter(e.target.value)}
                    aria-label="Thương hiệu"
                    className="w-auto"
                  >
                    <option value="ALL">Mọi thương hiệu</option>
                    {videoBrandOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                }
                resultCount={filteredVideoRows.length}
                chips={
                  <Chips
                    label="Trạng thái số liệu"
                    items={videoChips}
                    value={videoStatusFilter}
                    onChange={setVideoStatusFilter}
                  />
                }
              />
            </div>

            <DataTable
              columns={videoColumns}
              rows={filteredVideoRows}
              rowKey={(r) => r.videoId}
              loading={loadingVideos}
              compact
              stickyLast
              empty={
                <EmptyState
                  title="Chưa có Video ID nào khớp điều kiện lọc"
                  action={
                    <Button variant="primary" icon={Plus} onClick={onOpenVideoRegistryModal}>
                      Đăng ký Video ID mới
                    </Button>
                  }
                />
              }
            />
          </>
        )}

        {/* SUB-TAB 2: HÀNG ĐỢI KOC MỚI GỬI SANG UPAFFILIATE */}
        {subTab === 'NEW_KOC_QUEUE' && (
          <>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: stagingSearch,
                  onChange: setStagingSearch,
                  placeholder: 'Tìm KOC mới theo @handle, tên kênh, SĐT, đối thủ hoặc hashtag...',
                }}
                resultCount={filteredStagingItems.length}
                chips={
                  <Chips
                    label="Bước xử lý"
                    items={stagingChips}
                    value={stagingStatusFilter}
                    onChange={setStagingStatusFilter}
                  />
                }
              />
            </div>

            <DataTable
              columns={stagingColumns}
              rows={filteredStagingItems}
              rowKey={(it) => it.id}
              loading={loadingStaging}
              compact
              stickyLast
              empty={
                <EmptyState
                  title="Hàng đợi KOC mới đang trống"
                  action={
                    <Button variant="primary" icon={Plus} onClick={() => setIsQuickAddOpen(true)}>
                      Thêm KOC mới vào hàng đợi
                    </Button>
                  }
                />
              }
            />
          </>
        )}

        {/* SUB-TAB 3: BẢN GHI SỬA TẠI B2C HUB CHỜ ĐẨY LÊN */}
        {subTab === 'LOCAL_CHANGES' && (
          <>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: localSearch,
                  onChange: setLocalSearch,
                  placeholder: 'Tìm theo tên KOC, @handle, SĐT, CCCD, Mã số thuế, Số tài khoản...',
                }}
                resultCount={localModifiedKocs.length}
                chips={
                  <Chips
                    label="Nhóm hồ sơ"
                    items={localChips}
                    value={localFilterType}
                    onChange={setLocalFilterType}
                  />
                }
              />
            </div>

            <DataTable
              columns={localModifiedColumns}
              rows={localModifiedKocs}
              rowKey={(k) => k.id}
              onRowClick={(k) => onOpenKocProfile(k.id)}
              compact
              stickyLast
              empty={
                <EmptyState
                  title="Tất cả thay đổi Liên hệ & Pháp lý đã được đồng bộ với UpAffiliate"
                />
              }
            />
          </>
        )}
      </Panel>

      {/* Hộp thoại thêm nhanh KOC mới vào hàng đợi gửi sang UpAffiliate */}
      <Modal
        open={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Gửi KOC Mới Sang UpAffiliate Lấy Dữ Liệu Sàn & Kalodata"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsQuickAddOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              icon={Send}
              disabled={savingQuickKoc}
              onClick={() => void handleAddQuickStagingKoc()}
            >
              {savingQuickKoc ? 'Đang lưu...' : 'Đưa vào hàng đợi UpAffiliate'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3.5">
          <Field label="Mã kênh (@handle) hoặc Link kênh TikTok">
            <Input
              value={quickChannelInput}
              onChange={(e) => setQuickChannelInput(e.target.value)}
              placeholder="@linhbeauty.review hoặc https://www.tiktok.com/@..."
            />
          </Field>
          <Field label="Tên hiển thị của KOC (nếu biết)">
            <Input
              value={quickStageName}
              onChange={(e) => setQuickStageName(e.target.value)}
              placeholder="Linh Beauty Review"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="SĐT / Zalo liên hệ (nếu có)">
              <Input
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="098..."
              />
            </Field>
            <Field label="Nguồn tìm thấy KOC">
              <Input
                value={quickSourceContext}
                onChange={(e) => setQuickSourceContext(e.target.value)}
                placeholder="Đối thủ, Hashtag, Gian hàng..."
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
};
