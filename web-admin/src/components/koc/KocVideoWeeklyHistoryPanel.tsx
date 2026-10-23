'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Code2,
  ExternalLink,
  History,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import type { KocItem } from '../../lib/types';
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import {
  STANDARD_WEEK_OPTIONS,
  normalizeChannelHandle,
  type KocWeeklyAggregatedHistory,
  type SystemRegisteredVideo,
  type VideoWeeklySnapshotItem,
  type WeeklyHistoryBatchLog,
} from '../../lib/kocVideoWeeklyHistory';
import {
  Button,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
} from '../ui';
import {
  KocVideoHistoryRegistryModal,
  type RegistryModalTab,
} from './KocVideoHistoryRegistryModal';

interface KocVideoWeeklyHistoryPanelProps {
  /** Nếu truyền `targetKoc`, chỉ lọc và hiển thị lịch sử Video ID & tuần của KOC đó (dùng trong KocProfile) */
  targetKoc?: Pick<KocItem, 'id' | 'channelId' | 'stageName' | 'realName' | 'brandName' | 'rateCardVideo'> | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onKocCreated?: (newKoc: KocItem) => void;
}

export const KocVideoWeeklyHistoryPanel: React.FC<KocVideoWeeklyHistoryPanelProps> = ({
  targetKoc = null,
  onNotify,
  onKocCreated,
}) => {
  const [subView, setSubView] = useState<'VIDEO_SNAPSHOTS' | 'KOC_AGGREGATED' | 'BATCH_LOGS'>('VIDEO_SNAPSHOTS');
  const [loading, setLoading] = useState(true);
  const [uploadingWeekFile, setUploadingWeekFile] = useState(false);

  const [batches, setBatches] = useState<WeeklyHistoryBatchLog[]>([]);
  const [registeredVideos, setRegisteredVideos] = useState<SystemRegisteredVideo[]>([]);
  const [videoSnapshots, setVideoSnapshots] = useState<VideoWeeklySnapshotItem[]>([]);
  const [kocSummaries, setKocSummaries] = useState<KocWeeklyAggregatedHistory[]>([]);

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('ALL');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadTargetWeek, setUploadTargetWeek] = useState<string>('2026-W42');

  const [registryModalOpen, setRegistryModalOpen] = useState(false);
  const [registryInitialTab, setRegistryInitialTab] = useState<RegistryModalTab>('NEW_VIDEO');
  const [selectedVideoForTimeline, setSelectedVideoForTimeline] = useState<string | null>(null);

  const weeklyFileInputRef = useRef<HTMLInputElement>(null);
  const targetChannelId = targetKoc?.channelId;

  const [prevTargetChannelId, setPrevTargetChannelId] = useState(targetChannelId);
  if (targetChannelId !== prevTargetChannelId) {
    setPrevTargetChannelId(targetChannelId);
    setLoading(true);
  }

  const fetchHistoryStore = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (targetChannelId) {
        qs.set('channelId', normalizeChannelHandle(targetChannelId));
      }
      const res = await fetch(`/api/koc-video-history?${qs.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches || []);
        setRegisteredVideos(data.registeredVideos || []);
        setVideoSnapshots(data.videoSnapshots || []);
        setKocSummaries(data.kocSummaries || []);
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời
    } finally {
      setLoading(false);
    }
  }, [targetChannelId]);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (targetChannelId) {
      qs.set('channelId', normalizeChannelHandle(targetChannelId));
    }
    fetch(`/api/koc-video-history?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setBatches(data.batches || []);
          setRegisteredVideos(data.registeredVideos || []);
          setVideoSnapshots(data.videoSnapshots || []);
          setKocSummaries(data.kocSummaries || []);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetChannelId]);

  const handleUploadWeeklyExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWeekFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('weekKey', uploadTargetWeek);
      if (selectedBrandFilter !== 'ALL') {
        formData.append('brandName', selectedBrandFilter);
      }

      const res = await fetch('/api/ads-reports', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchHistoryStore();
        const syncInfo = data.weeklyHistorySync;
        onNotify?.(
          syncInfo
            ? `Đã nạp báo cáo ${uploadTargetWeek} (${file.name}): Khớp ${syncInfo.matchedCount} Video ID hệ thống, thêm ${syncInfo.newlyRegisteredVideosCount} Video mới.`
            : `Đã nạp báo cáo tuần ${uploadTargetWeek} từ file ${file.name}.`,
          'success'
        );
      } else {
        onNotify?.(data.error || 'Không đọc được file báo cáo tuần.', 'error');
      }
    } catch {
      onNotify?.('Lỗi khi tải file báo cáo tuần lên máy chủ.', 'error');
    } finally {
      setUploadingWeekFile(false);
      if (weeklyFileInputRef.current) weeklyFileInputRef.current.value = '';
    }
  };

  const openRegistryModal = (tab: RegistryModalTab) => {
    setRegistryInitialTab(tab);
    setRegistryModalOpen(true);
  };

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of videoSnapshots) {
      if (s.brandName) set.add(s.brandName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [videoSnapshots]);

  const weekOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of STANDARD_WEEK_OPTIONS) {
      map.set(w.weekKey, w.weekLabel);
    }
    for (const s of videoSnapshots) {
      if (!map.has(s.weekKey)) {
        map.set(s.weekKey, s.weekLabel || s.weekKey);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [videoSnapshots]);

  const filteredSnapshots = useMemo(() => {
    return videoSnapshots.filter((s) => {
      if (selectedWeekFilter !== 'ALL' && s.weekKey !== selectedWeekFilter) return false;
      if (selectedBrandFilter !== 'ALL' && s.brandName !== selectedBrandFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVid = s.videoId.toLowerCase().includes(q);
        const matchBo = s.dealCode?.toLowerCase().includes(q);
        const matchKoc =
          s.kocChannelId?.toLowerCase().includes(q) ||
          s.kocStageName?.toLowerCase().includes(q);
        const matchTitle =
          s.videoTitle?.toLowerCase().includes(q) ||
          s.productName?.toLowerCase().includes(q);
        if (!matchVid && !matchBo && !matchKoc && !matchTitle) return false;
      }
      return true;
    });
  }, [videoSnapshots, selectedWeekFilter, selectedBrandFilter, searchQuery]);

  const filteredKocSummaries = useMemo(() => {
    return kocSummaries.filter((k) => {
      if (targetKoc) {
        const cleanTarget = normalizeChannelHandle(targetKoc.channelId);
        const cleanItem = normalizeChannelHandle(k.kocChannelId);
        if (
          cleanTarget &&
          cleanItem !== cleanTarget &&
          !cleanItem.includes(cleanTarget) &&
          !cleanTarget.includes(cleanItem) &&
          k.kocId !== targetKoc.id
        ) {
          return false;
        }
      }
      if (selectedBrandFilter !== 'ALL' && !k.brands.includes(selectedBrandFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKoc =
          k.kocChannelId.toLowerCase().includes(q) ||
          k.kocStageName.toLowerCase().includes(q) ||
          k.videoIds.some((vid) => vid.includes(q));
        if (!matchKoc) return false;
      }
      return true;
    });
  }, [kocSummaries, targetKoc, selectedBrandFilter, searchQuery]);

  const totals = useMemo(() => {
    const spend = filteredSnapshots.reduce((sum, x) => sum + x.adsSpend, 0);
    const gmv = filteredSnapshots.reduce((sum, x) => sum + x.gmv, 0);
    const orders = filteredSnapshots.reduce((sum, x) => sum + x.orders, 0);
    const uniqueVideos = new Set(filteredSnapshots.map((x) => x.videoId)).size;
    const uniqueKocs = new Set(filteredSnapshots.map((x) => x.kocChannelId)).size;
    const roas = spend > 0 ? Number((gmv / spend).toFixed(2)) : 0;
    return { spend, gmv, orders, uniqueVideos, uniqueKocs, roas };
  }, [filteredSnapshots]);

  const selectedVideoTimelineRows = useMemo(() => {
    if (!selectedVideoForTimeline) return [];
    return videoSnapshots
      .filter((s) => s.videoId === selectedVideoForTimeline)
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  }, [videoSnapshots, selectedVideoForTimeline]);

  return (
    <div className="space-y-4">
      <input
        ref={weeklyFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleUploadWeeklyExcel}
        className="hidden"
      />

      {/* Thanh điều khiển nhập liệu tuần & API phát sinh mới */}
      <div className="bg-surface border border-line rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!targetKoc ? (
            <Tabs
              value={subView}
              onChange={setSubView}
              items={[
                {
                  key: 'VIDEO_SNAPSHOTS',
                  label: 'Lịch sử theo Video ID',
                  count: filteredSnapshots.length,
                },
                {
                  key: 'KOC_AGGREGATED',
                  label: 'Lũy kế KOC qua các tuần',
                  count: filteredKocSummaries.length,
                },
                {
                  key: 'BATCH_LOGS',
                  label: 'Nhật ký đợt nạp tuần',
                  count: batches.length,
                },
              ]}
            />
          ) : (
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-ink">
                Lịch sử Video Ads theo Tuần — @{normalizeChannelHandle(targetKoc.channelId)} ({registeredVideos.length} Video ID)
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-sunken px-2 py-1 rounded-lg border border-line">
            <Calendar className="w-3.5 h-3.5 text-ink-3" />
            <span className="text-2xs text-ink-3">Kỳ nạp:</span>
            <select
              value={uploadTargetWeek}
              onChange={(e) => setUploadTargetWeek(e.target.value)}
              className="text-xs font-medium text-ink bg-transparent focus:outline-none"
            >
              {STANDARD_WEEK_OPTIONS.map((w) => (
                <option key={w.weekKey} value={w.weekKey}>
                  {w.weekKey}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              icon={Upload}
              disabled={uploadingWeekFile}
              onClick={() => weeklyFileInputRef.current?.click()}
            >
              {uploadingWeekFile ? 'Đang nạp...' : 'Nhập file tuần (.xlsx)'}
            </Button>
          </div>

          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() => openRegistryModal('NEW_VIDEO')}
          >
            Đăng ký Video mới
          </Button>

          {!targetKoc && (
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() => openRegistryModal('NEW_KOC')}
            >
              Phát sinh KOC mới
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            icon={Code2}
            onClick={() => openRegistryModal('API_DOCS')}
          >
            API KOC & Video
          </Button>
        </div>
      </div>

      {/* Hàng chỉ số tổng hợp theo bộ lọc */}
      <StatRow size="sm">
        <Stat
          label="Số Video ID theo dõi"
          value={`${totals.uniqueVideos} video`}
          note={`${filteredSnapshots.length} bản ghi lịch sử tuần · ${totals.uniqueKocs} KOC`}
        />
        <Stat
          label="Tổng chi phí Ads lũy kế"
          value={formatVndShort(totals.spend)}
          note={formatVnd(totals.spend)}
        />
        <Stat
          label="Tổng GMV Video Ads"
          value={formatVndShort(totals.gmv)}
          note={`${formatNumber(totals.orders)} đơn hàng`}
          tone="positive"
        />
        <Stat
          label="ROAS trung bình các tuần"
          value={`${totals.roas}x`}
          note="Đối soát trực tiếp theo Video ID hệ thống"
          tone={totals.roas >= 4 ? 'positive' : totals.roas >= 2 ? 'warning' : undefined}
        />
      </StatRow>

      {/* Thanh bộ lọc */}
      {subView !== 'BATCH_LOGS' && (
        <div className="bg-surface border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo Video ID, Mã BO, @koc..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-lg focus:outline-none focus:border-focus"
              />
            </div>

            {subView === 'VIDEO_SNAPSHOTS' && (
              <Select
                aria-label="Lọc theo tuần"
                value={selectedWeekFilter}
                onChange={(e) => setSelectedWeekFilter(e.target.value)}
                className="w-auto h-8 text-xs"
              >
                <option value="ALL">Tất cả các tuần ({weekOptions.length} tuần)</option>
                {weekOptions.map(([wk, label]) => (
                  <option key={wk} value={wk}>
                    {label}
                  </option>
                ))}
              </Select>
            )}

            {!targetKoc && (
              <Select
                aria-label="Lọc theo thương hiệu"
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="w-auto h-8 text-xs"
              >
                <option value="ALL">Tất cả thương hiệu ({brandOptions.length})</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="text-2xs text-ink-3">
            Hiển thị <strong className="text-ink">{filteredSnapshots.length}</strong> bản chụp lịch sử tuần
          </div>
        </div>
      )}

      {/* BẢNG 1: LỊCH SỬ VIDEO ADS THEO VIDEO ID HỆ THỐNG */}
      {subView === 'VIDEO_SNAPSHOTS' && (
        <Panel
          flush
          title={`Bảng lịch sử hiệu quả Video Ads theo tuần (${filteredSnapshots.length} bản ghi)`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                <tr>
                  <th className="py-2.5 px-3">Kỳ tuần</th>
                  <th className="py-2.5 px-3">Mã Video ID &amp; Mã BO hệ thống</th>
                  <th className="py-2.5 px-3">Kênh KOC</th>
                  <th className="py-2.5 px-3">Brand / Sản phẩm</th>
                  <th className="py-2.5 px-3 text-right">Cát-xê Net</th>
                  <th className="py-2.5 px-3 text-right">Chi phí Ads tuần</th>
                  <th className="py-2.5 px-3 text-right">GMV tuần</th>
                  <th className="py-2.5 px-3 text-center">ROAS Ads</th>
                  <th className="py-2.5 px-3 text-right">Đơn hàng</th>
                  <th className="py-2.5 px-3 text-center">Giữ chân 2s</th>
                  <th className="py-2.5 px-3 text-center">Chuỗi tuần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading && filteredSnapshots.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-ink-3">
                      Đang tải kho lịch sử tuần...
                    </td>
                  </tr>
                ) : filteredSnapshots.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-ink-3">
                      Chưa có bản ghi lịch sử tuần khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredSnapshots.slice(0, 80).map((row) => (
                    <tr key={row.id} className="hover:bg-canvas transition">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-semibold text-ink block">{row.weekKey}</span>
                        <span className="text-2xs text-ink-3">{row.reportDateRange}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-accent">{row.videoId}</span>
                          {row.linkAir && (
                            <a
                              href={row.linkAir}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ink-3 hover:text-accent"
                              title="Mở video gốc trên TikTok"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-ink-3">
                          <span className="font-mono text-ink-2">{row.dealCode}</span>
                          <span>·</span>
                          <span className="truncate max-w-[180px]" title={row.videoTitle}>
                            {row.videoTitle}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-ink">{row.kocStageName}</div>
                        <div className="text-2xs text-ink-3 font-mono">@{row.kocChannelId.replace(/^@/, '')}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-ink">{row.brandName}</div>
                        <div className="text-2xs text-ink-3 truncate max-w-[160px]" title={row.productName}>
                          {row.productName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                        {row.bookingCostNet > 0 ? formatVndShort(row.bookingCostNet) : '0đ (FOC)'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                        {formatVnd(row.adsSpend)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-positive">
                        {formatVnd(row.gmv)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-semibold ${
                            row.roas >= 5
                              ? 'text-positive'
                              : row.roas >= 3
                              ? 'text-accent'
                              : 'text-warning'
                          }`}
                        >
                          {row.roas}x
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                        {row.orders.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-ink-2">
                        {row.hookRate2s}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedVideoForTimeline(row.videoId)}
                        >
                          Xem các tuần
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* BẢNG 2: LỊCH SỬ LŨY KẾ THEO KOC QUA CÁC TUẦN */}
      {subView === 'KOC_AGGREGATED' && (
        <Panel
          flush
          title={`Bảng tổng hợp lịch sử KOC lũy kế từ Video ID hệ thống (${filteredKocSummaries.length} KOC)`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                <tr>
                  <th className="py-2.5 px-3">KOC &amp; Kênh TikTok</th>
                  <th className="py-2.5 px-3">Nhãn hàng hợp tác</th>
                  <th className="py-2.5 px-3 text-center">Số Video ID</th>
                  <th className="py-2.5 px-3">Chuỗi tuần hoạt động</th>
                  <th className="py-2.5 px-3 text-right">Tổng Cát-xê Net</th>
                  <th className="py-2.5 px-3 text-right">Lũy kế Chi phí Ads</th>
                  <th className="py-2.5 px-3 text-right">Lũy kế GMV</th>
                  <th className="py-2.5 px-3 text-center">ROAS Ads</th>
                  <th className="py-2.5 px-3 text-center">ROI Tổng</th>
                  <th className="py-2.5 px-3 text-right">Tổng đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredKocSummaries.slice(0, 60).map((k) => (
                  <tr key={k.kocChannelId} className="hover:bg-canvas transition">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-ink">{k.kocStageName}</div>
                      <div className="text-2xs text-ink-3 font-mono">@{k.kocChannelId.replace(/^@/, '')}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-ink-2 truncate max-w-[180px]" title={k.brands.join(', ')}>
                        {k.brands.join(', ') || '—'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-ink">
                      {k.totalRegisteredVideos}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {k.weeklyTimeline.map((wt) => (
                          <span
                            key={wt.weekKey}
                            className="px-1.5 py-0.5 rounded bg-sunken border border-line font-mono text-2xs text-ink-2"
                            title={`${wt.weekLabel}: GMV ${formatVndShort(wt.gmv)} · ROAS ${wt.roas}x`}
                          >
                            {wt.weekKey.replace('2026-', '')}: {formatVndShort(wt.gmv)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                      {formatVndShort(k.totalBookingCostNet)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                      {formatVnd(k.cumulativeAdsSpend)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-positive">
                      {formatVnd(k.cumulativeGmv)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-accent">
                      {k.overallAdsRoas}x
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-positive">
                      {k.overallTotalRoi}x
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                      {k.cumulativeOrders.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* BẢNG 3: NHẬT KÝ CÁC ĐỢT NẠP DỮ LIỆU TUẦN */}
      {subView === 'BATCH_LOGS' && (
        <Panel flush title={`Nhật ký các đợt nạp báo cáo tuần (${batches.length} đợt)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                <tr>
                  <th className="py-2.5 px-3">Kỳ tuần</th>
                  <th className="py-2.5 px-3">Nguồn dữ liệu / Tên file</th>
                  <th className="py-2.5 px-3 text-center">Hình thức</th>
                  <th className="py-2.5 px-3 text-right">Số Video khớp hệ thống</th>
                  <th className="py-2.5 px-3 text-right">Video mới phát sinh</th>
                  <th className="py-2.5 px-3 text-right">Tổng Chi phí Ads</th>
                  <th className="py-2.5 px-3 text-right">Tổng GMV</th>
                  <th className="py-2.5 px-3 text-center">ROAS</th>
                  <th className="py-2.5 px-3">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-canvas transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-ink">{b.weekKey}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-ink">{b.fileName}</div>
                      <div className="text-2xs text-ink-3">{b.weekLabel}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Status tone={b.sourceType === 'API_INGEST' ? 'info' : 'positive'}>
                        {b.sourceType === 'API_INGEST'
                          ? 'API'
                          : b.sourceType === 'EXCEL_UPLOAD'
                          ? 'File Excel'
                          : 'Đồng bộ gốc'}
                      </Status>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-positive">
                      {b.matchedSystemVideos}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-2">
                      {b.unmatchedVideos}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink">
                      {formatVnd(b.totalAdsSpend)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-positive">
                      {formatVnd(b.totalGmv)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-accent">
                      {b.overallRoas}x
                    </td>
                    <td className="py-2.5 px-3 text-ink-2">{b.importedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Modal xem chuỗi lịch sử qua các tuần của 1 Video ID */}
      <Modal
        open={Boolean(selectedVideoForTimeline)}
        onClose={() => setSelectedVideoForTimeline(null)}
        title={`Lịch sử hiệu quả qua các tuần — Video ID ${selectedVideoForTimeline || ''}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedVideoForTimeline(null)}>
            Đóng
          </Button>
        }
      >
        {selectedVideoTimelineRows.length > 0 ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-sunken border border-line text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-2xs text-ink-3 block">KOC sở hữu</span>
                <span className="font-semibold text-ink">{selectedVideoTimelineRows[0].kocStageName}</span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Mã đơn Booking</span>
                <span className="font-mono font-semibold text-ink">{selectedVideoTimelineRows[0].dealCode}</span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Thương hiệu &amp; Gian hàng</span>
                <span className="font-medium text-ink">{selectedVideoTimelineRows[0].brandName}</span>
              </div>
              <div>
                <span className="text-2xs text-ink-3 block">Cát-xê Booking Net</span>
                <span className="font-mono font-semibold text-ink">
                  {formatVnd(selectedVideoTimelineRows[0].bookingCostNet)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Tuần</th>
                    <th className="py-2.5 px-3 text-right">Chi phí Ads</th>
                    <th className="py-2.5 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-2.5 px-3 text-center">ROAS tuần</th>
                    <th className="py-2.5 px-3 text-right">Đơn hàng</th>
                    <th className="py-2.5 px-3 text-right">Lượt xem</th>
                    <th className="py-2.5 px-3 text-center">Giữ chân 2s</th>
                    <th className="py-2.5 px-3">Nguồn nạp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selectedVideoTimelineRows.map((w) => (
                    <tr key={w.id}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-ink">{w.weekKey}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatVnd(w.adsSpend)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-positive">
                        {formatVnd(w.gmv)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-accent">
                        {w.roas}x
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{w.orders.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{w.views.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{w.hookRate2s}%</td>
                      <td className="py-2.5 px-3 text-2xs text-ink-3 truncate max-w-[180px]" title={w.sourceFileName}>
                        {w.sourceFileName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-ink-3">
            Chưa có bản ghi tuần cho Video ID này.
          </div>
        )}
      </Modal>

      {/* Modal Đăng ký Video mới, KOC mới & API */}
      <KocVideoHistoryRegistryModal
        open={registryModalOpen}
        onClose={() => setRegistryModalOpen(false)}
        initialTab={registryInitialTab}
        prefillKoc={targetKoc}
        onSuccess={(res) => {
          void fetchHistoryStore();
          if (res.newKoc && onKocCreated) {
            onKocCreated(res.newKoc);
          }
          onNotify?.(res.message, 'success');
        }}
      />
    </div>
  );
};
