'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  Sparkles, 
  Eye, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Check, 
  Layers, 
  Award,
  Zap,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { 
  WeeklyAdsReportMeta, 
  AdsCampaignPerformance, 
  AdsCreatorPerformance, 
  AdsCreativeDetailItem, 
  AdsReportParseResult,
  KocMasterItem,
  BookingDealItem,
  UserProfile
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';

interface WeeklyAdsReportHubViewProps {
  currentUser: UserProfile;
  kocs?: KocMasterItem[];
  deals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateKocsWithAdsData?: (updatedKocs: KocMasterItem[]) => void;
  onUpdateDealsWithAdsData?: (updatedDeals: BookingDealItem[]) => void;
}

export const WeeklyAdsReportHubView: React.FC<WeeklyAdsReportHubViewProps> = ({
  currentUser,
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
        notify(`Đã nạp & mapping thành công báo cáo [${fileName}]!`);
      } else {
        notify(data.error || 'Lỗi khi đọc file báo cáo', 'error');
      }
    } catch (err) {
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
        notify(`Đã tải lên và đọc thành công ${file.name}!`);
      } else {
        notify(data.error || 'Lỗi khi tải file', 'error');
      }
    } catch (err) {
      notify('Lỗi tải file lên máy chủ', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Initial load
  useEffect(() => {
    fetchReportsList();
    handleParseReport('creative data for product campaigns 2026-10-01 00 ~ 2026-10-08 06.xlsx');
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
      {/* HEADER & INGESTION CONTROL                                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                TikTok Seller Ads Ingestion
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Thư mục: E:\Upbase\B2C\Baocao ads
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Báo Cáo Ads TikTok Seller & Mapping Hiệu Quả Tuần
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động đọc file báo cáo tuần xuất từ TikTok Shop Seller Center, đối soát mã Spark Ads, tính ROAS thực tế và đồng bộ vào KOC Master Data.
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
              className="btn-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{isUploading ? 'Đang tải file...' : 'Tải lên báo cáo mới (.xlsx)'}</span>
            </button>

            <button
              type="button"
              disabled={isLoading || !activeReportData}
              onClick={handleApplyMappingToSystem}
              className={`btn-md text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-xs ${
                isMappingApplied 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isMappingApplied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã đồng bộ KOC Master & Deals</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-white" />
                  <span>Áp dụng Mapping vào Hệ thống</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Weekly Report Selector Pills */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
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
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-400' : 'text-slate-500'}`} />
                <span>{rep.reportWeek}</span>
                <span className={`text-2xs px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {rep.totalRows.toLocaleString()} dòng
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KPI METRIC CARDS                                                          */}
      {/* ========================================================================= */}
      {activeReportData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Chi phí Ads (Spend)</div>
            <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">
              {formatVndShort(activeReportData.meta.totalSpend)}
            </div>
            <div className="text-3xs text-slate-500 mt-0.5 font-mono">
              {activeReportData.meta.totalSpend.toLocaleString('vi-VN')} đ
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Doanh thu gộp (GMV)</div>
            <div className="text-lg font-extrabold font-mono text-emerald-600 mt-1">
              {formatVndShort(activeReportData.meta.totalGmv)}
            </div>
            <div className="text-3xs text-emerald-700 mt-0.5 font-mono">
              {activeReportData.meta.totalGmv.toLocaleString('vi-VN')} đ
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">ROAS Tổng thể</div>
            <div className="text-lg font-extrabold font-mono text-indigo-600 mt-1 flex items-center gap-1">
              <span>{activeReportData.meta.overallRoas}x</span>
              <span className="text-2xs font-medium text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                Lãi cao
              </span>
            </div>
            <div className="text-3xs text-slate-500 mt-0.5">
              1đ chi phí → {activeReportData.meta.overallRoas}đ GMV
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Số đơn hàng (SKU)</div>
            <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">
              {activeReportData.meta.totalOrders.toLocaleString()} <span className="text-xs font-normal text-slate-500">đơn</span>
            </div>
            <div className="text-3xs text-slate-500 mt-0.5">
              CPA: {formatVndShort(Math.round(activeReportData.meta.totalSpend / (activeReportData.meta.totalOrders || 1)))}/đơn
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Creator & Video</div>
            <div className="text-lg font-extrabold font-mono text-slate-900 mt-1">
              {activeReportData.totalCreatorCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">kênh</span>
            </div>
            <div className="text-3xs text-slate-500 mt-0.5 font-mono">
              {activeReportData.meta.totalRows.toLocaleString()} video ads
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ khớp KOC Master</div>
            <div className="text-lg font-extrabold font-mono text-rose-600 mt-1">
              {activeReportData.matchRatePercent}%
            </div>
            <div className="text-3xs text-slate-500 mt-0.5">
              Khớp {activeReportData.matchedKocCount} / {activeReportData.totalCreatorCount} KOC
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TABS NAVIGATION                                                       */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CAMPAIGNS')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'CAMPAIGNS'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Theo Chiến dịch & Sản phẩm</span>
            {activeReportData && (
              <span className="text-2xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
                {activeReportData.campaigns.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('KOC_MAPPING')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'KOC_MAPPING'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Mapping KOC & Creator Winners</span>
            {activeReportData && (
              <span className="text-2xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {activeReportData.creators.filter(c => c.isWinnerTop20).length} Winner
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREATIVES')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'CREATIVES'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Video className="w-4 h-4 text-rose-500" />
            <span>Chi tiết Creative & Đối soát Spark Ads</span>
            {activeReportData && (
              <span className="text-2xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
                Top 100
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INSIGHTS')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'INSIGHTS'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Khuyến nghị Tối ưu AI Growth</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHIẾN DỊCH & SẢN PHẨM PGM                                          */}
      {/* ========================================================================= */}
      {activeTab === 'CAMPAIGNS' && activeReportData && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bảng Tổng Hợp Chiến Dịch Sản Phẩm PGM</h3>
                <p className="text-xs text-slate-500">Phân bổ chi phí, doanh thu gộp và chỉ số hoàn vốn ROAS của từng dòng sản phẩm chủ lực.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Tên Chiến Dịch / Sản Phẩm</th>
                    <th className="py-3 px-3 text-right">Chi phí Ads</th>
                    <th className="py-3 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-3 text-right">Đơn hàng</th>
                    <th className="py-3 px-3 text-right">CPA (Chi phí/đơn)</th>
                    <th className="py-3 px-3 text-center">CTR</th>
                    <th className="py-3 px-3 text-center">Hook 2s</th>
                    <th className="py-3 px-3 text-center">Số Video</th>
                    <th className="py-3 px-4 text-center">Đánh giá hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeReportData.campaigns.map((camp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{camp.campaignName}</div>
                        <div className="text-3xs text-slate-400 font-mono mt-0.5">ID: {camp.campaignId || 'PGM-CAMPAIGN'}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {camp.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {camp.gmv.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          camp.roas >= 5.0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : camp.roas >= 3.0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {camp.roas}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {camp.orders.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {camp.cpa.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600">
                        {(camp.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                        {(camp.hookRate2s * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {camp.videoCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {camp.roas >= 5.0 ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-3xs font-semibold">
                            Scale ngân sách
                          </span>
                        ) : camp.roas >= 3.5 ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-3xs font-semibold">
                            Duy trì ổn định
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-3xs font-semibold">
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
      {/* TAB 2: MAPPING KOC & CREATOR WINNERS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'KOC_MAPPING' && activeReportData && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên KOC / Kênh TikTok..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setKocFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${kocFilter === 'ALL' ? 'bg-white font-semibold text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                >
                  Tất cả ({activeReportData.creators.length})
                </button>
                <button
                  type="button"
                  onClick={() => setKocFilter('WINNERS')}
                  className={`px-2.5 py-1 rounded-md transition ${kocFilter === 'WINNERS' ? 'bg-white font-semibold text-amber-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Top Winners ({activeReportData.creators.filter(c => c.isWinnerTop20).length})
                </button>
                <button
                  type="button"
                  onClick={() => setKocFilter('MATCHED')}
                  className={`px-2.5 py-1 rounded-md transition ${kocFilter === 'MATCHED' ? 'bg-white font-semibold text-emerald-700 shadow-2xs' : 'text-slate-600'}`}
                >
                  Đã khớp Master ({activeReportData.matchedKocCount})
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Tiêu chuẩn Winner: ROAS ≥ 4.0 & Doanh thu ≥ 3.000.000đ</span>
            </div>
          </div>

          {/* Creators Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Kênh TikTok (Từ Ads)</th>
                    <th className="py-3 px-3">Khớp KOC Master Data</th>
                    <th className="py-3 px-3 text-right">Chi phí Ads</th>
                    <th className="py-3 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-3 text-right">Đơn hàng</th>
                    <th className="py-3 px-3 text-right">CPA</th>
                    <th className="py-3 px-3 text-center">Hook 2s</th>
                    <th className="py-3 px-3">Hình thức cấp quyền</th>
                    <th className="py-3 px-4 text-center">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCreators.slice(0, 50).map((cr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {cr.accountName}
                          {cr.isWinnerTop20 && (
                            <span className="text-3xs bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                              WINNER
                            </span>
                          )}
                        </div>
                        {cr.topVideoTitle && (
                          <div className="text-3xs text-slate-400 truncate max-w-xs mt-0.5">
                            "{cr.topVideoTitle}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {cr.isMatched ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{cr.mappedStageName}</span>
                            {cr.mappedTier && (
                              <span className="text-3xs bg-slate-100 text-slate-600 px-1 rounded font-normal">
                                {cr.mappedTier}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-3xs italic">
                            Chưa liên kết Master
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {cr.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {cr.gmv.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          cr.roas >= 6.0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : cr.roas >= 4.0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cr.roas}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {cr.orders.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {cr.cpa.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                        {(cr.avgHookRate2s * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-3xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {cr.authorizationType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cr.roas >= 6.0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-3xs font-bold">
                            Top 1 Winner
                          </span>
                        ) : cr.roas >= 4.0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-3xs font-semibold">
                            Winner Đạt KPI
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-3xs">
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
      {/* TAB 3: CHI TIẾT CREATIVE & ĐỐI SOÁT SPARK ADS                             */}
      {/* ========================================================================= */}
      {activeTab === 'CREATIVES' && activeReportData && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm Video ID / Tiêu đề..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <select
                value={authFilter}
                onChange={e => setAuthFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả hình thức cấp quyền</option>
                <option value="Video code">Spark Ads (Video code)</option>
                <option value="Affiliate">Affiliate mass authorization</option>
                <option value="TikTok Shop">TikTok Shop official account</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái phân phối</option>
                <option value="Performing">Performing (Đang phân phối tốt)</option>
                <option value="Authorization needed">Authorization needed (Cần gia hạn mã!)</option>
                <option value="Ineligible">Ineligible (Không đủ điều kiện)</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cảnh báo: Có {activeReportData.topCreatives.filter(c => c.explorationSecondaryStatus.includes('Authorization')).length} video cần KOC cấp lại mã Ads</span>
            </div>
          </div>

          {/* Creatives Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Video ID & Tiêu đề</th>
                    <th className="py-3 px-3">KOC / Creator</th>
                    <th className="py-3 px-3">Chiến dịch</th>
                    <th className="py-3 px-3 text-right">Chi phí Ads</th>
                    <th className="py-3 px-3 text-right">Doanh thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS</th>
                    <th className="py-3 px-3 text-center">Hook 2s</th>
                    <th className="py-3 px-3 text-center">Xem hết 100%</th>
                    <th className="py-3 px-3">Hình thức quyền</th>
                    <th className="py-3 px-4 text-center">Trạng thái phân phối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCreatives.map((cr, idx) => {
                    const isAlertAuth = cr.explorationSecondaryStatus.includes('Authorization');
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/80 transition ${isAlertAuth ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="font-mono text-3xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            ID: {cr.videoId}
                          </div>
                          <div className="font-medium text-slate-900 text-xs mt-1 max-w-sm truncate" title={cr.videoTitle}>
                            {cr.videoTitle}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {cr.tiktokAccount}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {cr.campaignName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                          {cr.cost.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {cr.gmv.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            cr.roas >= 4.0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {cr.roas}x
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                          {(cr.hookRate2s * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {(cr.completionRate100 * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-3xs px-2 py-0.5 rounded ${
                            cr.isSparkAds 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cr.authorizationType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isAlertAuth ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-3xs font-bold animate-pulse">
                              Cần cấp lại mã Ads!
                            </span>
                          ) : cr.explorationSecondaryStatus === 'Performing' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-3xs font-semibold">
                              Performing
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-3xs">
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
      {/* TAB 4: KHUYẾN NGHỊ TỐI ƯU AI GROWTH                                       */}
      {/* ========================================================================= */}
      {activeTab === 'INSIGHTS' && activeReportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Khuyến nghị 1: Scale ngân sách Top Creator Winner</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Các Creator như <strong>Kim Chung Phan</strong> (ROAS 11.07), <strong>Sandy</strong> (ROAS 6.86), <strong>Ngọc Matcha</strong> (ROAS 5.84) đang có hiệu suất chuyển đổi vượt bậc so với mặt bằng chung.
            </p>
            <div className="mt-3 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div>• Đề xuất tăng 30-50% ngân sách PGM_Body Lotion và PGM_Gel kẻ mắt cho nhóm này.</div>
              <div>• Kích hoạt hợp tác dài hạn (kế hoạch tháng tiếp theo) với các KOC này tại Hub Booking.</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Khuyến nghị 2: Xử lý gấp các mã Spark Ads hết hạn</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Phát hiện các video đang phát sinh doanh thu nhưng chuyển trạng thái <code>Authorization needed</code>. Nếu không gia hạn kịp thời, TikTok sẽ dừng phân phối quảng cáo.
            </p>
            <div className="mt-3 bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs text-rose-800 space-y-1">
              <div>• PIC Booking cần liên hệ ngay KOC để lấy mã Spark Ads gia hạn thêm 30 ngày.</div>
              <div>• KOC có thể nộp mã trực tiếp qua Cổng KOC Partner Hub ([`koc-hub`]).</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
              <Video className="w-4 h-4 text-indigo-600" />
              <span>Khuyến nghị 3: Nhân bản kịch bản có Hook 2 giây cao</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Tỷ lệ giữ chân 2 giây trung bình đạt <strong>24.8%</strong>. Các video hướng dẫn trực diện (Tutorial kẻ mắt, giải quyết nỗi đau da body) có hook rate &gt; 35%.
            </p>
            <div className="mt-3 bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-xs text-indigo-800 space-y-1">
              <div>• Chuyển angle và 3 giây đầu của các video này sang phân hệ <strong>Kịch bản (Content View)</strong> làm mẫu cho CTV.</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Khuyến nghị 4: Nghiệm thu & Xuất báo cáo gửi Brand</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Chiến dịch 7 ngày đạt tổng GMV <strong>165.2 triệu</strong> với chi phí <strong>30.25 triệu</strong> (ROAS 5.46). Đây là số liệu nghiệm thu hoàn hảo để gửi Brand duyệt giải ngân.
            </p>
            <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-1">
              <div>• Đồng bộ trực tiếp số liệu này sang <strong>Cổng đối tác Brand (Brand Hub)</strong> để nhãn hàng đối soát.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
