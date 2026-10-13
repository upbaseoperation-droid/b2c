'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  Search, 
  ShieldCheck, 
  Check, 
  Layers, 
  Award,
  Zap,
  Database
} from 'lucide-react';
import { 
  WeeklyAdsReportMeta, 
  AdsReportParseResult,
  KocMasterItem,
  BookingDealItem,
  UserProfile
} from '../../lib/types';
import { formatVndShort, formatVnd } from '../../lib/format';

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
  const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'KOC_MAPPING' | 'CREATIVES' | 'INSIGHTS'>('CAMPAIGNS');

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
        body: JSON.stringify({ fileName, kocs, deals })
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
        await fetchReportsList();
        notify(`Đã tải lên và đọc ${file.name}`);
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
      {/* ========================================================================= */}
      {/* HEADER & INGESTION CONTROL */}
      {/* ========================================================================= */}
      <div className="bg-surface rounded-xl border border-line p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-accent-soft text-accent border border-line flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Đối soát báo cáo quảng cáo tuần
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-1.5">
              Đọc file báo cáo tuần xuất từ TikTok Shop, đối soát mã Spark Ads, tính ROAS thực tế và đồng bộ vào danh bạ KOC.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx,.xls" 
              className="hidden" 
            />

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="btn-md bg-surface hover:bg-sunken text-ink border border-line-strong rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-ink-3" />
              <span>{isUploading ? 'Đang tải file...' : 'Tải lên báo cáo mới (.xlsx)'}</span>
            </button>

            <button
              type="button"
              disabled={isLoading || !activeReportData}
              onClick={handleApplyMappingToSystem}
              className={`btn-md text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                isMappingApplied 
                  ? 'bg-positive-soft text-positive border border-line' 
                  : 'bg-primary hover:bg-primary-hover text-white'
              }`}
            >
              {isMappingApplied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-positive" />
                  <span>Đã đồng bộ KOC & deal</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-white" />
                  <span>Đồng bộ vào danh bạ KOC</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Weekly Report Selector Pills */}
        <div className="mt-4 pt-4 border-t border-line flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-2xs font-semibold text-ink-3 shrink-0">
            Kỳ báo cáo đã lưu:
          </span>
          {reportsList.map(rep => {
            const isSelected = selectedFileName === rep.fileName;
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => handleParseReport(rep.fileName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary font-semibold'
                    : 'bg-canvas hover:bg-sunken text-ink-2 border-line'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-ink-3'}`} />
                <span>{rep.reportWeek}</span>
                <span className={`text-2xs px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-sunken text-ink-2'}`}>
                  {rep.totalRows.toLocaleString()} dòng
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KPI METRIC CARDS */}
      {/* ========================================================================= */}
      {activeReportData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-surface rounded-xl border border-line p-3.5">
            <div className="text-2xs font-medium text-ink-3">Chi phí Ads</div>
            <div className="text-lg font-semibold font-mono text-ink mt-1">
              {formatVndShort(activeReportData.meta.totalSpend)}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5 font-mono">
              {formatVnd(activeReportData.meta.totalSpend)}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-3.5">
            <div className="text-2xs font-medium text-ink-3">Doanh thu gộp (GMV)</div>
            <div className="text-lg font-semibold font-mono text-positive mt-1">
              {formatVndShort(activeReportData.meta.totalGmv)}
            </div>
            <div className="text-2xs text-positive mt-0.5 font-mono">
              {formatVnd(activeReportData.meta.totalGmv)}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-3.5">
            <div className="text-2xs font-medium text-ink-3">ROAS tổng thể</div>
            <div className="text-lg font-semibold font-mono text-accent mt-1 flex items-center gap-1">
              <span>{activeReportData.meta.overallRoas}x</span>
              <span className="text-2xs font-medium text-positive bg-positive-soft px-1.5 py-0.5 rounded">
                Hiệu quả tốt
              </span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              1đ chi phí → {activeReportData.meta.overallRoas}đ GMV
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-3.5">
            <div className="text-2xs font-medium text-ink-3">Số đơn hàng</div>
            <div className="text-lg font-semibold font-mono text-ink mt-1">
              {activeReportData.meta.totalOrders.toLocaleString()} <span className="text-xs font-normal text-ink-3">đơn</span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              CPA: {formatVndShort(Math.round(activeReportData.meta.totalSpend / (activeReportData.meta.totalOrders || 1)))}/đơn
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-3.5">
            <div className="text-2xs font-medium text-ink-3">KOC & video</div>
            <div className="text-lg font-semibold font-mono text-ink mt-1">
              {activeReportData.totalCreatorCount.toLocaleString()} <span className="text-xs font-normal text-ink-3">kênh</span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5 font-mono">
              {activeReportData.meta.totalRows.toLocaleString()} video ads
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-3.5">
            <div className="text-2xs font-medium text-ink-3">Tỷ lệ khớp danh bạ KOC</div>
            <div className="text-lg font-semibold font-mono text-accent mt-1">
              {activeReportData.matchRatePercent}%
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              Khớp {activeReportData.matchedKocCount} / {activeReportData.totalCreatorCount} KOC
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TABS NAVIGATION */}
      {/* ========================================================================= */}
      <div className="border-b border-line flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CAMPAIGNS')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'CAMPAIGNS'
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Theo chiến dịch & sản phẩm</span>
            {activeReportData && (
              <span className="text-2xs bg-sunken text-ink-2 px-1.5 py-0.5 rounded font-mono">
                {activeReportData.campaigns.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('KOC_MAPPING')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'KOC_MAPPING'
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Award className="w-4 h-4 text-warning" />
            <span>Đối soát KOC & nhóm hiệu quả cao</span>
            {activeReportData && (
              <span className="text-2xs bg-warning-soft text-warning px-1.5 py-0.5 rounded font-mono font-semibold">
                {activeReportData.creators.filter(c => c.isWinnerTop20).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREATIVES')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'CREATIVES'
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Video className="w-4 h-4 text-accent" />
            <span>Chi tiết video & đối soát Spark Ads</span>
            {activeReportData && (
              <span className="text-2xs bg-sunken text-ink-2 px-1.5 py-0.5 rounded font-mono">
                100
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INSIGHTS')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'INSIGHTS'
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Gợi ý tối ưu quảng cáo</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHIẾN DỊCH & SẢN PHẨM PGM */}
      {/* ========================================================================= */}
      {activeTab === 'CAMPAIGNS' && activeReportData && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">Bảng tổng hợp chiến dịch sản phẩm PGM</h3>
                <p className="text-xs text-ink-3">Phân bổ chi phí, doanh thu gộp và chỉ số hoàn vốn ROAS của từng dòng sản phẩm chủ lực.</p>
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
                        <div className="text-2xs text-ink-3 font-mono mt-0.5">Mã: {camp.campaignId || 'PGM-CAMPAIGN'}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                        {formatVnd(camp.cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-positive">
                        {formatVnd(camp.gmv)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                          camp.roas >= 5.0
                            ? 'bg-positive-soft text-positive'
                            : camp.roas >= 3.0
                            ? 'bg-accent-soft text-accent'
                            : 'bg-warning-soft text-warning'
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
                          <span className="px-2 py-0.5 bg-positive-soft text-positive rounded text-2xs font-semibold">
                            Tăng ngân sách
                          </span>
                        ) : camp.roas >= 3.5 ? (
                          <span className="px-2 py-0.5 bg-accent-soft text-accent rounded text-2xs font-semibold">
                            Duy trì ổn định
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-warning-soft text-warning rounded text-2xs font-semibold">
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

            <div className="text-xs text-ink-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-positive" />
              <span>Tiêu chuẩn nhóm hiệu quả: ROAS ≥ 4.0 và doanh thu ≥ 3.000.000 đ</span>
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
                          {cr.accountName}
                          {cr.isWinnerTop20 && (
                            <span className="text-2xs bg-warning-soft text-warning px-1.5 py-0.5 rounded font-semibold">
                              Hiệu quả cao
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
                              <span className="text-2xs bg-sunken text-ink-2 px-1 rounded font-normal">
                                {cr.mappedTier}
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
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                          cr.roas >= 6.0
                            ? 'bg-positive-soft text-positive'
                            : cr.roas >= 4.0
                            ? 'bg-accent-soft text-accent'
                            : 'bg-sunken text-ink-2'
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
                        <span className="text-2xs bg-sunken text-ink-2 px-2 py-0.5 rounded">
                          {cr.authorizationType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cr.roas >= 6.0 ? (
                          <span className="px-2 py-0.5 bg-warning-soft text-warning rounded text-2xs font-semibold">
                            Nhóm dẫn đầu
                          </span>
                        ) : cr.roas >= 4.0 ? (
                          <span className="px-2 py-0.5 bg-positive-soft text-positive rounded text-2xs font-semibold">
                            Đạt KPI
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-sunken text-ink-3 rounded text-2xs">
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
              <div className="relative w-64">
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

            <div className="text-xs font-semibold text-critical bg-critical-soft px-2.5 py-1 rounded-lg flex items-center gap-1.5">
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
                          <div className="font-mono text-2xs font-semibold text-ink-3 bg-sunken px-1.5 py-0.5 rounded w-fit">
                            Mã: {cr.videoId}
                          </div>
                          <div className="font-medium text-ink text-xs mt-1 max-w-sm truncate" title={cr.videoTitle}>
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
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                            cr.roas >= 4.0
                              ? 'bg-positive-soft text-positive'
                              : 'bg-sunken text-ink-2'
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
                          <span className={`text-2xs px-2 py-0.5 rounded ${
                            cr.isSparkAds 
                              ? 'bg-accent-soft text-accent font-semibold'
                              : 'bg-sunken text-ink-2'
                          }`}>
                            {cr.authorizationType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isAlertAuth ? (
                            <span className="px-2 py-0.5 bg-warning-soft text-warning rounded text-2xs font-semibold">
                              Cần cấp lại mã Ads
                            </span>
                          ) : cr.explorationSecondaryStatus === 'Performing' ? (
                            <span className="px-2 py-0.5 bg-positive-soft text-positive rounded text-2xs font-semibold">
                              Đang chạy
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-sunken text-ink-2 rounded text-2xs">
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
    </div>
  );
};
