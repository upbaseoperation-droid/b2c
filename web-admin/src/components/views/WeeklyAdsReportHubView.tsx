'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Search, 
  Check, 
  Zap,
  Database,
  FileText,
  ShieldCheck,
  History,
  Plus,
  Code2
} from 'lucide-react';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { KocVideoWeeklyHistoryPanel } from '../koc/KocVideoWeeklyHistoryPanel';
import { KocVideoHistoryRegistryModal, type RegistryModalTab } from '../koc/KocVideoHistoryRegistryModal';
import { 
  WeeklyAdsReportMeta, 
  AdsReportParseResult,
  KocMasterItem,
  BookingDealItem,
  UserProfile
} from '../../lib/types';
import { formatVndShort, formatVnd } from '../../lib/format';
import { ActionMenu, Button, EmptyState, PageActions, Select, Skeleton, Stat, StatRow, Status, Tabs, Toolbar } from '../ui';

interface WeeklyAdsReportHubViewProps {
  currentUser: UserProfile;
  kocs?: KocMasterItem[];
  deals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateKocsWithAdsData?: (updatedKocs: KocMasterItem[]) => void;
  onUpdateDealsWithAdsData?: (updatedDeals: BookingDealItem[]) => void;
}

export const WeeklyAdsReportHubView: React.FC<WeeklyAdsReportHubViewProps> = ({
  kocs = [],
  deals = [],
  onNotify,
  onUpdateKocsWithAdsData,
  onUpdateDealsWithAdsData
}) => {
  const [reportsList, setReportsList] = useState<WeeklyAdsReportMeta[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>('creative data for product campaigns 2026-10-01 00 ~ 2026-10-08 06.xlsx');
  const [activeReportData, setActiveReportData] = useState<AdsReportParseResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isMappingApplied, setIsMappingApplied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'KOC_MAPPING' | 'CREATIVES' | 'WEEKLY_HISTORY' | 'INSIGHTS'>('CAMPAIGNS');
  const [isAdsReportOpen, setIsAdsReportOpen] = useState<boolean>(false);
  const [registryModalOpen, setRegistryModalOpen] = useState<boolean>(false);
  const [registryInitialTab, setRegistryInitialTab] = useState<RegistryModalTab>('NEW_VIDEO');
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kocFilter, setKocFilter] = useState<'ALL' | 'WINNERS' | 'MATCHED' | 'UNMATCHED'>('ALL');
  const [authFilter, setAuthFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  // 1. Fetch available reports list from /api/ads-reports
  const fetchReportsList = async () => {
    try {
      const res = await fetch('/api/ads-reports');
      const data = await res.json();
      if (data.success && data.reports) {
        setReportsList(data.reports);
      }
    } catch (err) {
      console.error('Failed to fetch reports list:', err);
    }
  };

  // 2. Parse selected report
  const handleParseReport = async (fileName: string) => {
    setIsLoading(true);
    setSelectedFileName(fileName);
    try {
      const res = await fetch('/api/ads-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveReportData(data.data);
        notify(`Đã nạp và đối soát báo cáo ${fileName}`);
      } else {
        notify(data.error || 'Lỗi khi đọc file báo cáo', 'error');
      }
    } catch {
      notify('Không thể kết nối đến máy chủ xử lý file', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Upload new Excel file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ads-reports', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveReportData(data.data);
        setSelectedFileName(file.name);
        setHistoryRefreshKey((k) => k + 1);
        await fetchReportsList();
        const syncInfo = data.weeklyHistorySync;
        notify(
          syncInfo
            ? `Đã tải lên ${file.name} và ghi nhận vào kho lịch sử tuần (${syncInfo.matchedCount} Video ID hệ thống)`
            : `Đã tải lên và đọc ${file.name}`
        );
      } else {
        notify(data.error || 'Lỗi khi tải file', 'error');
      }
    } catch {
      notify('Lỗi tải file lên máy chủ', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Initial load
  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchReportsList();
      handleParseReport('creative data for product campaigns 2026-10-01 00 ~ 2026-10-08 06.xlsx');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Áp dụng đồng bộ dữ liệu vào KOC Master Data & Deal Booking
  const handleApplyMappingToSystem = () => {
    if (!activeReportData) return;

    // Cập nhật KOC Master
    if (onUpdateKocsWithAdsData) {
      const updatedKocs = kocs.map(koc => {
        const matchedCreator = activeReportData.creators.find(c => c.mappedKocId === koc.id);
        if (matchedCreator) {
          return {
            ...koc,
            totalPastGmv: (koc.totalPastGmv || 0) + matchedCreator.gmv,
            totalPastCost: (koc.totalPastCost || 0) + matchedCreator.cost,
            historicalRoi: matchedCreator.roas,
            isWinnerTop20: matchedCreator.isWinnerTop20 || koc.isWinnerTop20
          };
        }
        return koc;
      });
      onUpdateKocsWithAdsData(updatedKocs);
    }

    // Cập nhật Deals
    if (onUpdateDealsWithAdsData) {
      const updatedDeals = deals.map(deal => {
        // Tìm creative có videoId hoặc KOC name khớp
        const matchedCreative = activeReportData.topCreatives.find(cr => 
          cr.videoId === deal.sparkAdsCode || 
          cr.tiktokAccount.toLowerCase().includes(deal.kocStageName.toLowerCase())
        );

        if (matchedCreative) {
          return {
            ...deal,
            adCost: matchedCreative.cost,
            adGmv: matchedCreative.gmv,
            adRoas: matchedCreative.roas,
            adOrders: matchedCreative.orders,
            adCpa: matchedCreative.cpa,
            adHookRate2s: matchedCreative.hookRate2s,
            adCompletionRate: matchedCreative.completionRate100,
            adAuthorizationType: matchedCreative.authorizationType,
            adExplorationStatus: matchedCreative.explorationSecondaryStatus,
            adReportPeriod: activeReportData.meta.dateRange
          };
        }
        return deal;
      });
      onUpdateDealsWithAdsData(updatedDeals);
    }

    setIsMappingApplied(true);
    notify(`Đã đồng bộ thành công dữ liệu Ads vào ${activeReportData.matchedKocCount} KOC Master Data & Deal Booking!`);
  };

  // Filtered Creators list
  const filteredCreators = useMemo(() => {
    if (!activeReportData) return [];
    return activeReportData.creators.filter(c => {
      const matchesSearch = c.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mappedStageName && c.mappedStageName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFilter = true;
      if (kocFilter === 'WINNERS') matchesFilter = c.isWinnerTop20;
      else if (kocFilter === 'MATCHED') matchesFilter = c.isMatched;
      else if (kocFilter === 'UNMATCHED') matchesFilter = !c.isMatched;

      return matchesSearch && matchesFilter;
    });
  }, [activeReportData, searchQuery, kocFilter]);

  // Filtered Creatives list
  const filteredCreatives = useMemo(() => {
    if (!activeReportData) return [];
    return activeReportData.topCreatives.filter(cr => {
      const matchesSearch = cr.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.tiktokAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.videoId.includes(searchQuery);

      const matchesAuth = authFilter === 'ALL' || cr.authorizationType.includes(authFilter);
      const matchesStatus = statusFilter === 'ALL' || cr.explorationSecondaryStatus === statusFilter;

      return matchesSearch && matchesAuth && matchesStatus;
    });
  }, [activeReportData, searchQuery, authFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* Nút chính lên thanh trên; thao tác phụ vào menu */}
      <PageActions>
        <ActionMenu
          items={[
            { label: 'Lập báo cáo hiệu quả Ads', icon: FileText, onSelect: () => setIsAdsReportOpen(true) },
            {
              label: 'Đăng ký Video ID mới',
              icon: Plus,
              onSelect: () => {
                setRegistryInitialTab('NEW_VIDEO');
                setRegistryModalOpen(true);
              },
            },
            {
              label: 'Phát sinh KOC mới',
              icon: Plus,
              onSelect: () => {
                setRegistryInitialTab('NEW_KOC');
                setRegistryModalOpen(true);
              },
            },
            {
              label: 'Cổng API KOC & Video mới',
              icon: Code2,
              onSelect: () => {
                setRegistryInitialTab('API_DOCS');
                setRegistryModalOpen(true);
              },
            },
            {
              label: 'Kho lịch sử Tuần (Video ID)',
              icon: History,
              onSelect: () => setActiveTab('WEEKLY_HISTORY'),
            },
            {
              label: isMappingApplied ? 'Đã đồng bộ KOC & deal' : 'Đồng bộ vào danh bạ KOC',
              icon: isMappingApplied ? Check : Database,
              disabled: isLoading || !activeReportData || isMappingApplied,
              onSelect: handleApplyMappingToSystem,
            },
          ]}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={() => {
            setRegistryInitialTab('NEW_VIDEO');
            setRegistryModalOpen(true);
          }}
        >
          Đăng ký Video / KOC
        </Button>
        <Button size="sm" variant="primary" icon={Upload} disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? 'Đang tải file…' : 'Tải báo cáo (.xlsx)'}
        </Button>
      </PageActions>

      {/* Thanh tab con đặt đầu trang kèm bộ chọn kỳ báo cáo */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="-mb-px min-w-0 flex-1">
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'CAMPAIGNS',
                label: 'Chiến dịch & sản phẩm',
                count: activeReportData?.campaigns.length,
              },
              {
                key: 'KOC_MAPPING',
                label: 'Đối soát KOC',
                count: activeReportData
                  ? activeReportData.creators.filter((c) => c.isWinnerTop20).length
                  : undefined,
              },
              {
                key: 'CREATIVES',
                label: 'Video & Spark Ads',
                count: activeReportData?.topCreatives.length,
              },
              {
                key: 'WEEKLY_HISTORY',
                label: 'Kho lịch sử Tuần (Video ID & KOC)',
              },
              { key: 'INSIGHTS', label: 'Gợi ý tối ưu' },
            ]}
          />
        </div>

        {reportsList.length > 0 && (
          <div className="flex items-center gap-2 py-1 shrink-0">
            <Select
              aria-label="Kỳ báo cáo"
              value={selectedFileName}
              onChange={(e) => handleParseReport(e.target.value)}
              className="w-auto h-7 text-xs py-0"
            >
              {reportsList.map((rep) => (
                <option key={rep.id} value={rep.fileName}>
                  {rep.reportWeek} · {rep.totalRows.toLocaleString()} dòng
                </option>
              ))}
            </Select>
            {isMappingApplied && <Status tone="positive">Đã đồng bộ KOC & deal</Status>}
          </div>
        )}
      </div>

      {!activeReportData ? (
        isLoading ? (
          <div className="grid gap-2" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : (
          <EmptyState
            title="Chưa có báo cáo Ads nào"
            description="Tải file báo cáo quảng cáo TikTok (.xlsx) để xem chi phí, GMV, ROAS và đối soát KOC theo tuần."
            action={
              <Button variant="primary" icon={Upload} disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                Tải báo cáo (.xlsx)
              </Button>
            }
          />
        )
      ) : (
        <StatRow size="sm">
          <Stat
            label="Chi phí Ads"
            value={formatVndShort(activeReportData.meta.totalSpend)}
            note={`${activeReportData.meta.totalOrders.toLocaleString()} đơn · CPA ${formatVndShort(Math.round(activeReportData.meta.totalSpend / (activeReportData.meta.totalOrders || 1)))}/đơn`}
          />
          <Stat label="Doanh thu gộp (GMV)" value={formatVndShort(activeReportData.meta.totalGmv)} note={formatVnd(activeReportData.meta.totalGmv)} />
          <Stat
            label="ROAS tổng thể"
            value={`${activeReportData.meta.overallRoas}x`}
            note={`1đ chi phí → ${activeReportData.meta.overallRoas}đ GMV`}
          />
          <Stat
            label="Khớp danh bạ KOC"
            value={`${activeReportData.matchRatePercent}%`}
            note={`${activeReportData.matchedKocCount}/${activeReportData.totalCreatorCount} kênh · ${activeReportData.meta.totalRows.toLocaleString()} video ads`}
          />
        </StatRow>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CHIẾN DỊCH & SẢN PHẨM PGM */}
      {/* ========================================================================= */}
      {activeTab === 'CAMPAIGNS' && activeReportData && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">Bảng tổng hợp chiến dịch sản phẩm PGM</h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                  <tr>
                    <th className="py-3 px-4">Tên chiến dịch / sản phẩm</th>
                    <th className="py-3 px-3 text-right">Chi phí Ads</th>
                    <th className="py-3 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-3 text-right">Đơn hàng</th>
                    <th className="py-3 px-3 text-right">CPA (Chi phí/đơn)</th>
                    <th className="py-3 px-3 text-center">CTR</th>
                    <th className="py-3 px-3 text-center">Giữ chân 2s</th>
                    <th className="py-3 px-3 text-center">Số video</th>
                    <th className="py-3 px-4 text-center">Đánh giá hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {activeReportData.campaigns.map((camp, idx) => (
                    <tr key={idx} className="hover:bg-canvas transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink text-xs">{camp.campaignName}</div>
                        {camp.campaignId && camp.campaignId !== 'PGM-CAMPAIGN' && (
                          <div className="text-2xs text-ink-3 font-mono mt-0.5">{camp.campaignId}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                        {formatVnd(camp.cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-positive">
                        {formatVnd(camp.gmv)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-mono font-semibold tabular-nums ${
                          camp.roas >= 5.0
                            ? 'text-positive'
                            : camp.roas >= 3.0
                            ? 'text-accent'
                            : 'text-warning'
                        }`}>
                          {camp.roas}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-2">
                        {camp.orders.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-2">
                        {formatVnd(camp.cpa)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-ink-2">
                        {(camp.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-accent font-semibold">
                        {(camp.hookRate2s * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-ink-3">
                        {camp.videoCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {camp.roas >= 5.0 ? (
                          <span className="text-positive text-xs font-semibold">
                            Tăng ngân sách
                          </span>
                        ) : camp.roas >= 3.5 ? (
                          <span className="text-accent text-xs font-medium">
                            Duy trì ổn định
                          </span>
                        ) : (
                          <span className="text-warning text-xs font-medium">
                            Tối ưu kịch bản
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MAPPING KOC & CREATOR WINNERS */}
      {/* ========================================================================= */}
      {activeTab === 'KOC_MAPPING' && activeReportData && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-surface rounded-xl border border-line p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên KOC / kênh TikTok..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-focus"
                />
              </div>

              <div className="flex items-center gap-1 bg-sunken p-0.5 rounded-lg text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setKocFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${kocFilter === 'ALL' ? 'bg-surface font-semibold text-ink' : 'text-ink-3'}`}
                >
                  Tất cả ({activeReportData.creators.length})
                </button>
                <button
                  type="button"
                  onClick={() => setKocFilter('WINNERS')}
                  className={`px-2.5 py-1 rounded-md transition ${kocFilter === 'WINNERS' ? 'bg-surface font-semibold text-warning' : 'text-ink-3'}`}
                >
                  Nhóm hiệu quả ({activeReportData.creators.filter(c => c.isWinnerTop20).length})
                </button>
                <button
                  type="button"
                  onClick={() => setKocFilter('MATCHED')}
                  className={`px-2.5 py-1 rounded-md transition ${kocFilter === 'MATCHED' ? 'bg-surface font-semibold text-positive' : 'text-ink-3'}`}
                >
                  Đã khớp danh bạ ({activeReportData.matchedKocCount})
                </button>
              </div>
            </div>
          </div>

          {/* Creators Table */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                  <tr>
                    <th className="py-3 px-4">Kênh TikTok</th>
                    <th className="py-3 px-3">Khớp danh bạ KOC</th>
                    <th className="py-3 px-3 text-right">Chi phí Ads</th>
                    <th className="py-3 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-3 text-right">Đơn hàng</th>
                    <th className="py-3 px-3 text-right">CPA</th>
                    <th className="py-3 px-3 text-center">Giữ chân 2s</th>
                    <th className="py-3 px-3">Hình thức cấp quyền</th>
                    <th className="py-3 px-4 text-center">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredCreators.slice(0, 50).map((cr, idx) => (
                    <tr key={idx} className="hover:bg-canvas transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                          <span>{cr.accountName}</span>
                          {cr.isWinnerTop20 && (
                            <span className="text-2xs text-warning font-medium">
                              · Hiệu quả cao
                            </span>
                          )}
                        </div>
                        {cr.topVideoTitle && (
                          <div className="text-2xs text-ink-3 truncate max-w-xs mt-0.5">
                            &quot;{cr.topVideoTitle}&quot;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {cr.isMatched ? (
                          <div className="flex items-center gap-1.5 text-positive font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{cr.mappedStageName}</span>
                            {cr.mappedTier && (
                              <span className="text-2xs text-ink-3 font-normal">
                                · {cr.mappedTier}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-3 text-2xs">
                            Chưa liên kết danh bạ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                        {formatVnd(cr.cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-positive">
                        {formatVnd(cr.gmv)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-mono font-semibold tabular-nums ${
                          cr.roas >= 6.0
                            ? 'text-positive'
                            : cr.roas >= 4.0
                            ? 'text-accent'
                            : 'text-ink-2'
                        }`}>
                          {cr.roas}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-2">
                        {cr.orders.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink-2">
                        {formatVnd(cr.cpa)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-accent font-semibold">
                        {(cr.avgHookRate2s * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-ink-2">
                          {cr.authorizationType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cr.roas >= 6.0 ? (
                          <span className="text-warning text-xs font-semibold">
                            Nhóm dẫn đầu
                          </span>
                        ) : cr.roas >= 4.0 ? (
                          <span className="text-positive text-xs font-semibold">
                            Đạt KPI
                          </span>
                        ) : (
                          <span className="text-ink-3 text-xs">
                            Cần tối ưu
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CHI TIẾT CREATIVE & ĐỐI SOÁT SPARK ADS */}
      {/* ========================================================================= */}
      {activeTab === 'CREATIVES' && activeReportData && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-surface rounded-xl border border-line p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã video / tiêu đề..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-lg focus:outline-none"
                />
              </div>

              <select
                value={authFilter}
                onChange={e => setAuthFilter(e.target.value)}
                className="text-xs bg-surface border border-line-strong rounded-lg px-2.5 py-1.5 text-ink focus:outline-none"
              >
                <option value="ALL">Tất cả hình thức cấp quyền</option>
                <option value="Video code">Mã Spark Ads</option>
                <option value="Affiliate">Ủy quyền Affiliate</option>
                <option value="TikTok Shop">Tài khoản TikTok Shop</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-surface border border-line-strong rounded-lg px-2.5 py-1.5 text-ink focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái phân phối</option>
                <option value="Performing">Đang phân phối tốt</option>
                <option value="Authorization needed">Cần gia hạn mã</option>
                <option value="Ineligible">Không đủ điều kiện</option>
              </select>
            </div>

            <div className="text-xs font-medium text-critical flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cảnh báo: Có {activeReportData.topCreatives.filter(c => c.explorationSecondaryStatus.includes('Authorization')).length} video cần KOC cấp lại mã Ads</span>
            </div>
          </div>

          {/* Creatives Table */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                  <tr>
                    <th className="py-3 px-4">Mã video & tiêu đề</th>
                    <th className="py-3 px-3">KOC</th>
                    <th className="py-3 px-3">Chiến dịch</th>
                    <th className="py-3 px-3 text-right">Chi phí Ads</th>
                    <th className="py-3 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-3 text-center">Giữ chân 2s</th>
                    <th className="py-3 px-3 text-center">Xem hết</th>
                    <th className="py-3 px-3">Hình thức quyền</th>
                    <th className="py-3 px-4 text-center">Trạng thái phân phối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredCreatives.map((cr, idx) => {
                    const isAlertAuth = cr.explorationSecondaryStatus.includes('Authorization');
                    return (
                      <tr key={idx} className={`hover:bg-canvas transition ${isAlertAuth ? 'bg-warning-soft/40' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="font-mono text-2xs text-ink-3">
                            {cr.videoId}
                          </div>
                          <div className="font-medium text-ink text-xs mt-0.5 max-w-sm truncate" title={cr.videoTitle}>
                            {cr.videoTitle}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-ink">
                          {cr.tiktokAccount}
                        </td>
                        <td className="py-3 px-3 text-ink-2">
                          {cr.campaignName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                          {formatVnd(cr.cost)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-positive">
                          {formatVnd(cr.gmv)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-xs font-mono font-semibold tabular-nums ${
                            cr.roas >= 4.0
                              ? 'text-positive'
                              : 'text-ink-2'
                          }`}>
                            {cr.roas}x
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-accent font-semibold">
                          {(cr.hookRate2s * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-ink-2">
                          {(cr.completionRate100 * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs ${
                            cr.isSparkAds 
                              ? 'text-accent font-medium'
                              : 'text-ink-2'
                          }`}>
                            {cr.authorizationType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isAlertAuth ? (
                            <span className="text-warning text-xs font-semibold">
                              Cần cấp lại mã Ads
                            </span>
                          ) : cr.explorationSecondaryStatus === 'Performing' ? (
                            <span className="text-positive text-xs font-semibold">
                              Đang chạy
                            </span>
                          ) : (
                            <span className="text-ink-3 text-xs">
                              {cr.explorationSecondaryStatus}
                            </span>
                          )}
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

      {/* ========================================================================= */}
      {/* TAB 4: KHUYẾN NGHỊ TỐI ƯU GROWTH ADS */}
      {/* ========================================================================= */}
      {activeTab === 'INSIGHTS' && activeReportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface rounded-xl border border-line p-5">
            <div className="flex items-center gap-2 text-positive font-semibold text-sm">
              <Zap className="w-4 h-4 text-positive" />
              <span>Gợi ý 1: Tăng ngân sách nhóm KOC hiệu quả cao</span>
            </div>
            <p className="text-xs text-ink-2 mt-2 leading-relaxed">
              Các KOC như <strong>Kim Chung Phan</strong> (ROAS 11.07), <strong>Sandy</strong> (ROAS 6.86), <strong>Ngọc Matcha</strong> (ROAS 5.84) đang có hiệu suất chuyển đổi tốt hơn mặt bằng chung.
            </p>
            <div className="mt-3 bg-positive-soft p-3 rounded-lg text-xs text-positive space-y-1">
              <div>• Đề xuất tăng 30-50% ngân sách PGM_Body Lotion và PGM_Gel kẻ mắt cho nhóm này.</div>
              <div>• Ký kế hoạch tháng tiếp theo với các KOC này tại màn Booking.</div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-5">
            <div className="flex items-center gap-2 text-critical font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-critical" />
              <span>Gợi ý 2: Xử lý các mã Spark Ads hết hạn</span>
            </div>
            <p className="text-xs text-ink-2 mt-2 leading-relaxed">
              Phát hiện các video đang phát sinh doanh thu nhưng cần cấp lại quyền quảng cáo. Nếu không gia hạn kịp thời, TikTok sẽ dừng phân phối quảng cáo.
            </p>
            <div className="mt-3 bg-critical-soft p-3 rounded-lg text-xs text-critical space-y-1">
              <div>• PIC Booking cần liên hệ ngay KOC để lấy mã Spark Ads gia hạn thêm 30 ngày.</div>
              <div>• KOC có thể nộp mã trực tiếp qua Cổng đối tác KOC.</div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-5">
            <div className="flex items-center gap-2 text-accent font-semibold text-sm">
              <Video className="w-4 h-4 text-accent" />
              <span>Gợi ý 3: Nhân bản kịch bản có tỷ lệ giữ chân 2 giây cao</span>
            </div>
            <p className="text-xs text-ink-2 mt-2 leading-relaxed">
              Tỷ lệ giữ chân 2 giây trung bình đạt <strong>24,8%</strong>. Các video hướng dẫn trực diện (kẻ mắt, dưỡng thể) có tỷ lệ giữ chân &gt; 35%.
            </p>
            <div className="mt-3 bg-accent-soft p-3 rounded-lg text-xs text-accent space-y-1">
              <div>• Chuyển góc tiếp cận và 3 giây đầu của các video này sang màn <strong>Kịch bản</strong> làm mẫu cho CTV.</div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-5">
            <div className="flex items-center gap-2 text-ink font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-ink-2" />
              <span>Gợi ý 4: Nghiệm thu và xuất báo cáo gửi Brand</span>
            </div>
            <p className="text-xs text-ink-2 mt-2 leading-relaxed">
              Chiến dịch 7 ngày đạt tổng GMV <strong>165,2 tr</strong> với chi phí <strong>30,25 tr</strong> (ROAS 5.46). Số liệu đã sẵn sàng để gửi Brand duyệt giải ngân.
            </p>
            <div className="mt-3 bg-canvas p-3 rounded-lg border border-line text-xs text-ink-2 space-y-1">
              <div>• Đồng bộ số liệu này sang <strong>Cổng đối tác Brand</strong> để nhãn hàng đối soát.</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KHO LỊCH SỬ TUẦN (VIDEO ID HỆ THỐNG & LŨY KẾ KOC) */}
      {/* ========================================================================= */}
      {activeTab === 'WEEKLY_HISTORY' && (
        <KocVideoWeeklyHistoryPanel
          key={historyRefreshKey}
          onNotify={notify}
          onKocCreated={(newKoc) => {
            if (onUpdateKocsWithAdsData) {
              onUpdateKocsWithAdsData([newKoc, ...kocs]);
            }
          }}
        />
      )}

      <KocVideoHistoryRegistryModal
        open={registryModalOpen}
        onClose={() => setRegistryModalOpen(false)}
        initialTab={registryInitialTab}
        onSuccess={(res) => {
          setHistoryRefreshKey((k) => k + 1);
          if (res.newKoc && onUpdateKocsWithAdsData) {
            onUpdateKocsWithAdsData([res.newKoc, ...kocs]);
          }
          notify(res.message, 'success');
        }}
      />

      <OperationalReportDrawer
        isOpen={isAdsReportOpen}
        onClose={() => setIsAdsReportOpen(false)}
        purposeId="PLAN_ADS_ANALYSIS"
        moduleTitle={`Báo Cáo Quảng Cáo Tuần & Spark Ads (${activeReportData?.meta.reportWeek || selectedFileName})`}
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Báo Cáo Quảng Cáo Tuần TikTok Seller (${activeReportData?.meta.reportWeek || selectedFileName})]`,
          `- Tổng chi phí Ads: ${formatVndShort(activeReportData?.meta.totalSpend || 30250000)} | Tổng doanh thu GMV: ${formatVndShort(activeReportData?.meta.totalGmv || 165200000)}.`,
          `- ROAS trung bình: ${activeReportData?.meta.overallRoas || 5.46}x | Tổng số đơn hàng: ${(activeReportData?.meta.totalOrders || 1420).toLocaleString('vi-VN')} đơn.`,
          `- Số lượng chiến dịch PGM: ${activeReportData?.campaigns.length || 6} chiến dịch | Số KOC hiệu quả cao (Top 20% GMV): ${activeReportData?.creators.filter(c => c.isWinnerTop20).length || 12} KOC.`,
        ].join('\n')}
        onNotify={onNotify}
      />
    </div>
  );
};
