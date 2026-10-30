'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Upload,
  Check,
  Database,
  FileText,
  History,
  Plus,
  Code2,
} from 'lucide-react';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { KocVideoWeeklyHistoryPanel } from '../koc/KocVideoWeeklyHistoryPanel';
import { KocVideoHistoryRegistryModal, type RegistryModalTab } from '../koc/KocVideoHistoryRegistryModal';
import {
  WeeklyAdsReportMeta,
  AdsReportParseResult,
  KocMasterItem,
  BookingDealItem,
  UserProfile,
} from '../../lib/types';
import { formatVndShort, formatVnd } from '../../lib/format';
import {
  ActionMenu,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  PageActions,
  Panel,
  Segmented,
  Select,
  Skeleton,
  Stat,
  StatRow,
  Status,
  Tabs,
} from '../ui';

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
  onUpdateDealsWithAdsData,
}) => {
  const [reportsList, setReportsList] = useState<WeeklyAdsReportMeta[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>(
    'creative data for product campaigns 2026-10-01 00 ~ 2026-10-08 06.xlsx'
  );
  const [activeReportData, setActiveReportData] = useState<AdsReportParseResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isMappingApplied, setIsMappingApplied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'CAMPAIGNS' | 'KOC_MAPPING' | 'CREATIVES' | 'WEEKLY_HISTORY'
  >('CAMPAIGNS');
  const [isAdsReportOpen, setIsAdsReportOpen] = useState<boolean>(false);
  const [registryModalOpen, setRegistryModalOpen] = useState<boolean>(false);
  const [registryInitialTab, setRegistryInitialTab] = useState<RegistryModalTab>('NEW_VIDEO');
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kocFilter, setKocFilter] = useState<'ALL' | 'WINNERS' | 'MATCHED' | 'UNMATCHED'>('ALL');
  const [authFilter, setAuthFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

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

  const handleParseReport = async (fileName: string) => {
    setIsLoading(true);
    setSelectedFileName(fileName);
    try {
      const res = await fetch('/api/ads-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ads-reports', {
        method: 'POST',
        body: formData,
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

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchReportsList();
      handleParseReport('creative data for product campaigns 2026-10-01 00 ~ 2026-10-08 06.xlsx');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyMappingToSystem = () => {
    if (!activeReportData) return;

    if (onUpdateKocsWithAdsData) {
      const updatedKocs = kocs.map((koc) => {
        const matchedCreator = activeReportData.creators.find((c) => c.mappedKocId === koc.id);
        if (matchedCreator) {
          return {
            ...koc,
            totalPastGmv: (koc.totalPastGmv || 0) + matchedCreator.gmv,
            totalPastCost: (koc.totalPastCost || 0) + matchedCreator.cost,
            historicalRoi: matchedCreator.roas,
            isWinnerTop20: matchedCreator.isWinnerTop20 || koc.isWinnerTop20,
          };
        }
        return koc;
      });
      onUpdateKocsWithAdsData(updatedKocs);
    }

    if (onUpdateDealsWithAdsData) {
      const updatedDeals = deals.map((deal) => {
        const matchedCreative = activeReportData.topCreatives.find(
          (cr) =>
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
            adReportPeriod: activeReportData.meta.dateRange,
          };
        }
        return deal;
      });
      onUpdateDealsWithAdsData(updatedDeals);
    }

    setIsMappingApplied(true);
    notify(
      `Đã đồng bộ thành công dữ liệu Ads vào ${activeReportData.matchedKocCount} KOC Master Data & Deal Booking!`
    );
  };

  const filteredCreators = useMemo(() => {
    if (!activeReportData) return [];
    return activeReportData.creators.filter((c) => {
      const matchesSearch =
        c.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mappedStageName && c.mappedStageName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFilter = true;
      if (kocFilter === 'WINNERS') matchesFilter = c.isWinnerTop20;
      else if (kocFilter === 'MATCHED') matchesFilter = c.isMatched;
      else if (kocFilter === 'UNMATCHED') matchesFilter = !c.isMatched;

      return matchesSearch && matchesFilter;
    });
  }, [activeReportData, searchQuery, kocFilter]);

  const filteredCreatives = useMemo(() => {
    if (!activeReportData) return [];
    return activeReportData.topCreatives.filter((cr) => {
      const matchesSearch =
        cr.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.tiktokAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.videoId.includes(searchQuery);

      const matchesAuth = authFilter === 'ALL' || cr.authorizationType.includes(authFilter);
      const matchesStatus =
        statusFilter === 'ALL' || cr.explorationSecondaryStatus === statusFilter;

      return matchesSearch && matchesAuth && matchesStatus;
    });
  }, [activeReportData, searchQuery, authFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls"
        className="hidden"
      />

      <PageActions>
        <ActionMenu
          items={[
            {
              label: 'Lập báo cáo hiệu quả Ads',
              icon: FileText,
              onSelect: () => setIsAdsReportOpen(true),
            },
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
        <Button
          size="sm"
          variant="primary"
          icon={Upload}
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? 'Đang tải file…' : 'Tải báo cáo (.xlsx)'}
        </Button>
      </PageActions>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="-mb-px min-w-0 flex-1">
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'CAMPAIGNS',
                label: 'Chiến dịch & Sản phẩm',
                count: activeReportData?.campaigns.length,
              },
              {
                key: 'KOC_MAPPING',
                label: 'Đối soát KOC',
                count: activeReportData?.creators.length,
              },
              {
                key: 'CREATIVES',
                label: 'Video & Spark Ads',
                count: activeReportData?.topCreatives.length,
              },
              {
                key: 'WEEKLY_HISTORY',
                label: 'Kho lịch sử Tuần',
              },
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
            {isMappingApplied && <Status tone="positive">Đã đồng bộ</Status>}
          </div>
        )}
      </div>

      {!activeReportData ? (
        isLoading ? (
          <div className="grid gap-2" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có báo cáo Ads nào"
            action={
              <Button
                variant="primary"
                icon={Upload}
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Tải báo cáo (.xlsx)
              </Button>
            }
          />
        )
      ) : (
        <StatRow size="sm">
          <Stat label="Chi phí Ads" value={formatVndShort(activeReportData.meta.totalSpend)} />
          <Stat label="Doanh thu GMV" value={formatVndShort(activeReportData.meta.totalGmv)} />
          <Stat label="ROAS tổng thể" value={`${activeReportData.meta.overallRoas}x`} />
          <Stat
            label="Khớp danh bạ KOC"
            value={`${activeReportData.matchedKocCount} / ${activeReportData.totalCreatorCount}`}
          />
        </StatRow>
      )}

      {activeTab === 'CAMPAIGNS' && activeReportData && (
        <Panel flush title="Chiến dịch sản phẩm PGM">
          <DataTable
            rows={activeReportData.campaigns}
            rowKey={(camp) => `${camp.campaignId}-${camp.campaignName}`}
            columns={[
              {
                key: 'name',
                header: 'Tên chiến dịch / sản phẩm',
                render: (camp) => (
                  <div>
                    <div className="font-semibold text-ink text-xs">{camp.campaignName}</div>
                    {camp.campaignId && camp.campaignId !== 'PGM-CAMPAIGN' && (
                      <div className="text-2xs text-ink-3 font-mono mt-0.5">{camp.campaignId}</div>
                    )}
                  </div>
                ),
              },
              {
                key: 'cost',
                header: 'Chi phí Ads',
                align: 'right',
                render: (camp) => (
                  <span className="font-mono font-semibold text-ink">{formatVnd(camp.cost)}</span>
                ),
              },
              {
                key: 'gmv',
                header: 'Doanh thu GMV',
                align: 'right',
                render: (camp) => (
                  <span className="font-mono font-semibold text-positive">{formatVnd(camp.gmv)}</span>
                ),
              },
              {
                key: 'roas',
                header: 'ROAS',
                align: 'right',
                render: (camp) => (
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      camp.roas >= 5.0
                        ? 'text-positive'
                        : camp.roas >= 3.0
                          ? 'text-accent'
                          : 'text-warning'
                    }`}
                  >
                    {camp.roas}x
                  </span>
                ),
              },
              {
                key: 'orders',
                header: 'Đơn hàng',
                align: 'right',
                render: (camp) => (
                  <span className="font-mono text-ink-2">{camp.orders.toLocaleString('vi-VN')}</span>
                ),
              },
              {
                key: 'cpa',
                header: 'CPA',
                align: 'right',
                render: (camp) => <span className="font-mono text-ink-2">{formatVnd(camp.cpa)}</span>,
              },
              {
                key: 'ctr',
                header: 'CTR',
                align: 'right',
                render: (camp) => (
                  <span className="font-mono text-ink-2">{(camp.ctr * 100).toFixed(2)}%</span>
                ),
              },
              {
                key: 'hook',
                header: 'Giữ chân 2s',
                align: 'right',
                render: (camp) => (
                  <span className="font-mono text-accent font-semibold">
                    {(camp.hookRate2s * 100).toFixed(1)}%
                  </span>
                ),
              },
              {
                key: 'videos',
                header: 'Số video',
                align: 'right',
                render: (camp) => (
                  <span className="font-mono text-ink-3">
                    {camp.videoCount.toLocaleString('vi-VN')}
                  </span>
                ),
              },
            ]}
          />
        </Panel>
      )}

      {activeTab === 'KOC_MAPPING' && activeReportData && (
        <Panel flush>
          <div className="p-3.5 border-b border-line bg-surface">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Tìm tên KOC / kênh TikTok…',
              }}
              resultCount={filteredCreators.length}
              filters={
                <Segmented
                  value={kocFilter}
                  onChange={(val) => setKocFilter(val as typeof kocFilter)}
                  items={[
                    { key: 'ALL', label: `Tất cả (${activeReportData.creators.length})` },
                    {
                      key: 'WINNERS',
                      label: `Hiệu quả cao (${activeReportData.creators.filter((c) => c.isWinnerTop20).length})`,
                    },
                    {
                      key: 'MATCHED',
                      label: `Đã khớp (${activeReportData.matchedKocCount})`,
                    },
                    {
                      key: 'UNMATCHED',
                      label: `Chưa khớp (${activeReportData.totalCreatorCount - activeReportData.matchedKocCount})`,
                    },
                  ]}
                />
              }
            />
          </div>
          <DataTable
            rows={filteredCreators.slice(0, 60)}
            rowKey={(cr) => cr.accountName}
            columns={[
              {
                key: 'account',
                header: 'Kênh TikTok',
                render: (cr) => (
                  <div>
                    <div className="font-semibold text-ink text-xs flex items-center gap-1.5">
                      <span>{cr.accountName}</span>
                      {cr.isWinnerTop20 && <Status tone="positive">Top 20%</Status>}
                    </div>
                    {cr.topVideoTitle && (
                      <div className="text-2xs text-ink-3 truncate max-w-xs mt-0.5">
                        {cr.topVideoTitle}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'matched',
                header: 'Danh bạ KOC',
                render: (cr) =>
                  cr.isMatched ? (
                    <div className="flex items-center gap-1.5 text-positive font-semibold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{cr.mappedStageName}</span>
                    </div>
                  ) : (
                    <span className="text-ink-3 text-xs">Chưa liên kết</span>
                  ),
              },
              {
                key: 'cost',
                header: 'Chi phí Ads',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono font-semibold text-ink">{formatVnd(cr.cost)}</span>
                ),
              },
              {
                key: 'gmv',
                header: 'Doanh thu GMV',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono font-semibold text-positive">{formatVnd(cr.gmv)}</span>
                ),
              },
              {
                key: 'roas',
                header: 'ROAS',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono font-semibold tabular-nums text-ink">{cr.roas}x</span>
                ),
              },
              {
                key: 'orders',
                header: 'Đơn hàng',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono text-ink-2">{cr.orders.toLocaleString('vi-VN')}</span>
                ),
              },
              {
                key: 'cpa',
                header: 'CPA',
                align: 'right',
                render: (cr) => <span className="font-mono text-ink-2">{formatVnd(cr.cpa)}</span>,
              },
              {
                key: 'hook',
                header: 'Giữ chân 2s',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono text-accent font-semibold">
                    {(cr.avgHookRate2s * 100).toFixed(1)}%
                  </span>
                ),
              },
              {
                key: 'auth',
                header: 'Hình thức quyền',
                render: (cr) => <span className="text-xs text-ink-2">{cr.authorizationType}</span>,
              },
            ]}
          />
        </Panel>
      )}

      {activeTab === 'CREATIVES' && activeReportData && (
        <Panel flush>
          <div className="p-3.5 border-b border-line bg-surface">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Tìm mã video, tiêu đề, kênh TikTok…',
              }}
              resultCount={filteredCreatives.length}
              filters={
                <>
                  <Select
                    aria-label="Hình thức cấp quyền"
                    value={authFilter}
                    onChange={(e) => setAuthFilter(e.target.value)}
                    className="w-auto"
                  >
                    <option value="ALL">Tất cả hình thức quyền</option>
                    <option value="Video code">Mã Spark Ads</option>
                    <option value="Affiliate">Ủy quyền Affiliate</option>
                    <option value="TikTok Shop">Tài khoản TikTok Shop</option>
                  </Select>

                  <Select
                    aria-label="Trạng thái phân phối"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-auto"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="Performing">Đang phân phối</option>
                    <option value="Authorization needed">Cần gia hạn mã</option>
                    <option value="Ineligible">Không đủ điều kiện</option>
                  </Select>
                </>
              }
            />
          </div>
          <DataTable
            rows={filteredCreatives}
            rowKey={(cr) => `${cr.videoId}-${cr.campaignName}`}
            columns={[
              {
                key: 'video',
                header: 'Mã video & Tiêu đề',
                render: (cr) => (
                  <div>
                    <div className="font-mono text-2xs text-ink-3">{cr.videoId}</div>
                    <div
                      className="font-medium text-ink text-xs mt-0.5 max-w-sm truncate"
                      title={cr.videoTitle}
                    >
                      {cr.videoTitle}
                    </div>
                  </div>
                ),
              },
              {
                key: 'account',
                header: 'KOC',
                render: (cr) => <span className="font-semibold text-ink">{cr.tiktokAccount}</span>,
              },
              {
                key: 'campaign',
                header: 'Chiến dịch',
                render: (cr) => <span className="text-ink-2">{cr.campaignName}</span>,
              },
              {
                key: 'cost',
                header: 'Chi phí Ads',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono font-semibold text-ink">{formatVnd(cr.cost)}</span>
                ),
              },
              {
                key: 'gmv',
                header: 'Doanh thu GMV',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono font-semibold text-positive">{formatVnd(cr.gmv)}</span>
                ),
              },
              {
                key: 'roas',
                header: 'ROAS',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono font-semibold tabular-nums text-ink">{cr.roas}x</span>
                ),
              },
              {
                key: 'hook',
                header: 'Giữ chân 2s',
                align: 'right',
                render: (cr) => (
                  <span className="font-mono text-accent font-semibold">
                    {(cr.hookRate2s * 100).toFixed(1)}%
                  </span>
                ),
              },
              {
                key: 'auth',
                header: 'Hình thức quyền',
                render: (cr) => <span className="text-xs text-ink-2">{cr.authorizationType}</span>,
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (cr) => {
                  const isAlertAuth = cr.explorationSecondaryStatus.includes('Authorization');
                  if (isAlertAuth) return <Status tone="warning">Cần gia hạn mã</Status>;
                  if (cr.explorationSecondaryStatus === 'Performing') {
                    return <Status tone="positive">Đang chạy</Status>;
                  }
                  return <Status tone="neutral">{cr.explorationSecondaryStatus}</Status>;
                },
              },
            ]}
          />
        </Panel>
      )}

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
        moduleTitle={`Báo Cáo Quảng Cáo Tuần (${activeReportData?.meta.reportWeek || selectedFileName})`}
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Báo Cáo Quảng Cáo Tuần TikTok Seller (${activeReportData?.meta.reportWeek || selectedFileName})]`,
          `- Tổng chi phí Ads: ${formatVndShort(activeReportData?.meta.totalSpend || 30250000)} | Tổng doanh thu GMV: ${formatVndShort(activeReportData?.meta.totalGmv || 165200000)}.`,
          `- ROAS trung bình: ${activeReportData?.meta.overallRoas || 5.46}x | Tổng số đơn hàng: ${(activeReportData?.meta.totalOrders || 1420).toLocaleString('vi-VN')} đơn.`,
          `- Số lượng chiến dịch PGM: ${activeReportData?.campaigns.length || 6} chiến dịch | Số KOC hiệu quả cao: ${activeReportData?.creators.filter((c) => c.isWinnerTop20).length || 12} KOC.`,
        ].join('\n')}
        onNotify={onNotify}
      />
    </div>
  );
};
