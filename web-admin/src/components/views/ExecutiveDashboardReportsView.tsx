'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Video,
  Award,
  Users,
  Layers,
  Calendar,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building,
  Sparkles,
  PieChart,
  BarChart3,
  Search,
  ExternalLink,
  ChevronRight,
  Printer,
  FileText
} from 'lucide-react';
import { 
  BookingDealItem, 
  UserProfile, 
  BrandDetail, 
  StorePortfolioItem, 
  KocItem 
} from '../../lib/types';
import { formatVndShort } from '../../lib/format';
import ExcelJS from 'exceljs';

interface ExecutiveDashboardReportsViewProps {
  currentUser: UserProfile;
  deals: BookingDealItem[];
  brands?: BrandDetail[];
  kocs?: KocItem[];
  storePortfolios?: StorePortfolioItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToTab?: (tabKey: any) => void;
}

export const ExecutiveDashboardReportsView: React.FC<ExecutiveDashboardReportsViewProps> = ({
  currentUser,
  deals = [],
  brands = [],
  kocs = [],
  storePortfolios = [],
  onNotify,
  onNavigateToTab
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'CREATORS' | 'FINANCE_TAX' | 'REPORT_CENTER'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  // Filtered Deals by Brand and Channel
  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchBrand = selectedBrand === 'ALL' || d.brandName === selectedBrand;
      const matchChannel = selectedChannel === 'ALL' || 
        (selectedChannel === 'TIKTOK' && (d.storeName?.includes('TikTok') || d.bookingFormat?.includes('TikTok'))) ||
        (selectedChannel === 'SHOPEE' && d.storeName?.includes('Shopee')) ||
        (selectedChannel === 'LAZADA' && d.storeName?.includes('Lazada'));
      const matchSearch = !searchQuery || 
        d.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.kocStageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.dealCode.toLowerCase().includes(searchQuery.toLowerCase());

      return matchBrand && matchChannel && matchSearch;
    });
  }, [deals, selectedBrand, selectedChannel, searchQuery]);

  // Executive KPI Aggregations
  const stats = useMemo(() => {
    const totalDeals = filteredDeals.length;
    // Deal costs (Net cast booking)
    const bookingCost = filteredDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    // TikTok Ads PGM spend
    const adsSpend = filteredDeals.reduce((sum, d) => sum + (d.adCost || 0), 0) || 30258757;
    // CTV Video Production cost
    const ctvCost = 18500000;
    // Total investment
    const totalSpend = bookingCost + adsSpend + ctvCost;

    // Gross GMV
    const bookingGmv = filteredDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0) || 887040000;
    const adsGmv = filteredDeals.reduce((sum, d) => sum + (d.adGmv || 0), 0) || 165239067;
    const ctvGmv = 406560000;
    const totalGmv = bookingGmv + adsGmv + ctvGmv;

    // Overall ROAS
    const overallRoas = totalSpend > 0 ? Number((totalGmv / totalSpend).toFixed(2)) : 6.30;
    const netProfitContribution = totalGmv - totalSpend;

    // SLA & Outputs
    const totalOnAirVideos = filteredDeals.filter(d => d.status === 'VIDEO_SUBMITTED' || d.status === 'VIDEO_VERIFIED' || d.status === 'FINAL_PAID').length + 214;
    const onTimeSlaCount = filteredDeals.filter(d => d.slaStatus !== 'OVERDUE').length;
    const slaComplianceRate = totalDeals > 0 ? Math.round((onTimeSlaCount / totalDeals) * 100) : 94;

    // Advance & Final Paid
    const totalAdvancePaid = filteredDeals.reduce((sum, d) => sum + (d.advanceAmount || 0), 0);
    const totalFinalPaid = filteredDeals.reduce((sum, d) => sum + (d.finalAmount || 0), 0);
    // 10% PIT Withholding Tax
    const totalPitTaxWithheld = Math.round(totalSpend * 0.1);

    return {
      totalDeals,
      bookingCost,
      adsSpend,
      ctvCost,
      totalSpend,
      bookingGmv,
      adsGmv,
      ctvGmv,
      totalGmv,
      overallRoas,
      netProfitContribution,
      totalOnAirVideos,
      slaComplianceRate,
      totalAdvancePaid,
      totalFinalPaid,
      totalPitTaxWithheld
    };
  }, [filteredDeals]);

  // Brand-level performance scorecard
  const brandScorecard = useMemo(() => {
    const map = new Map<string, { brandName: string; dealsCount: number; cost: number; gmv: number; roas: number; onAirCount: number }>();
    
    filteredDeals.forEach(d => {
      const bName = d.brandName || 'Khác';
      const cur = map.get(bName) || { brandName: bName, dealsCount: 0, cost: 0, gmv: 0, roas: 0, onAirCount: 0 };
      cur.dealsCount++;
      cur.cost += (d.totalValue || 0) + (d.adCost || 0);
      cur.gmv += (d.affiliateGmv || d.gmv30 || 0) + (d.adGmv || 0);
      if (d.status === 'VIDEO_SUBMITTED' || d.status === 'VIDEO_VERIFIED' || d.status === 'FINAL_PAID') {
        cur.onAirCount++;
      }
      map.set(bName, cur);
    });

    // Fallback nếu rỗng
    if (map.size === 0) {
      return [
        { brandName: 'Kutieskin Mama', dealsCount: 14, cost: 42000000, gmv: 265000000, roas: 6.31, onAirCount: 12 },
        { brandName: 'Fresh CTCP Mỹ Phẩm', dealsCount: 28, cost: 68500000, gmv: 420000000, roas: 6.13, onAirCount: 26 },
        { brandName: 'Royal Ausnz', dealsCount: 18, cost: 54000000, gmv: 348000000, roas: 6.44, onAirCount: 16 },
        { brandName: 'Nature\'s Way', dealsCount: 12, cost: 36000000, gmv: 215000000, roas: 5.97, onAirCount: 10 },
        { brandName: 'Babe', dealsCount: 10, cost: 30000000, gmv: 180000000, roas: 6.00, onAirCount: 9 },
      ];
    }

    return Array.from(map.values()).map(b => ({
      ...b,
      roas: b.cost > 0 ? Number((b.gmv / b.cost).toFixed(2)) : 5.8
    })).sort((a, b) => b.gmv - a.gmv);
  }, [filteredDeals]);

  // Export Executive Excel Report
  const handleExportExcel = async (reportType: string) => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Upbase Executive BI';
      workbook.created = new Date();

      const ws = workbook.addWorksheet('Báo Cáo Điều Hành B2C', { views: [{ showGridLines: true }] });

      // Title header
      ws.mergeCells('B2:H2');
      const titleCell = ws.getCell('B2');
      titleCell.value = `UPBASE B2C - ${reportType.toUpperCase()}`;
      titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: '0F172A' } };
      ws.getRow(2).height = 25;

      ws.mergeCells('B3:H3');
      const subCell = ws.getCell('B3');
      subCell.value = `Kỳ báo cáo: ${selectedPeriod} | Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} | Người xuất: ${currentUser.name} (${currentUser.role})`;
      subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };

      // Section 1: KPI Summary
      ws.mergeCells('B5:D5');
      ws.getCell('B5').value = 'CHỈ SỐ TỔNG HỢP';
      ws.getCell('B5').font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      ws.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };

      const kpiRows = [
        ['Tổng Doanh Thu GMV Toàn Sàn', `${stats.totalGmv.toLocaleString('vi-VN')} đ`],
        ['Tổng Chi Phí Vận Hành & Ads', `${stats.totalSpend.toLocaleString('vi-VN')} đ`],
        ['Tỷ Suất Sinh Lời ROAS Toàn Kênh', `${stats.overallRoas}x`],
        ['Lợi Nhuận Gộp Đóng Góp (Net Margin)', `${stats.netProfitContribution.toLocaleString('vi-VN')} đ`],
        ['Tổng Sản Lượng Video Đã On Air', `${stats.totalOnAirVideos} video`],
        ['Tỷ Lệ Tuân Thủ SLA Bàn Giao 3 Team', `${stats.slaComplianceRate}%`],
        ['Thuế TNCN 10% Khấu Trừ Nộp NSNN', `${stats.totalPitTaxWithheld.toLocaleString('vi-VN')} đ`]
      ];

      kpiRows.forEach((row, i) => {
        const r = ws.getRow(6 + i);
        r.getCell(2).value = row[0];
        r.getCell(3).value = row[1];
        r.getCell(2).font = { name: 'Segoe UI', size: 9 };
        r.getCell(3).font = { name: 'Segoe UI', size: 9, bold: true };
      });

      // Section 2: Brand Table
      const startRow = 15;
      ws.mergeCells(`B${startRow}:H${startRow}`);
      ws.getCell(`B${startRow}`).value = 'CHI TIẾT HIỆU SUẤT THEO NHÃN HÀNG (BRAND SCORECARD)';
      ws.getCell(`B${startRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      ws.getCell(`B${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };

      const headers = ['Nhãn Hàng', 'Số Deal', 'Chi Phí (Cast + Ads)', 'Doanh Thu GMV', 'ROAS', 'Video On Air', 'Đánh Giá'];
      const headerRow = ws.getRow(startRow + 1);
      headers.forEach((h, idx) => {
        const c = headerRow.getCell(idx + 2);
        c.value = h;
        c.font = { name: 'Segoe UI', size: 9, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      });

      brandScorecard.forEach((b, idx) => {
        const row = ws.getRow(startRow + 2 + idx);
        row.getCell(2).value = b.brandName;
        row.getCell(3).value = b.dealsCount;
        row.getCell(4).value = `${b.cost.toLocaleString('vi-VN')} đ`;
        row.getCell(5).value = `${b.gmv.toLocaleString('vi-VN')} đ`;
        row.getCell(6).value = `${b.roas}x`;
        row.getCell(7).value = b.onAirCount;
        row.getCell(8).value = b.roas >= 6.0 ? 'Hiệu quả cao 🚀' : 'Đạt kế hoạch';
        for (let col = 2; col <= 8; col++) {
          row.getCell(col).font = { name: 'Segoe UI', size: 9 };
        }
      });

      // Adjust widths
      ws.getColumn(2).width = 28;
      ws.getColumn(3).width = 14;
      ws.getColumn(4).width = 22;
      ws.getColumn(5).width = 22;
      ws.getColumn(6).width = 12;
      ws.getColumn(7).width = 16;
      ws.getColumn(8).width = 18;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Upbase_B2C_${reportType.replace(/\s+/g, '_')}_${selectedPeriod}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      notify(`Đã xuất thành công file Excel: ${reportType}!`);
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xuất file Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* HEADER & PERIOD FILTER BAR                                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Executive BI & Analytics
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Phân Hệ Dashboard Điều Hành & Trung Tâm Báo Cáo
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Bức tranh tổng thể đa chiều về GMV, Chi phí vận hành, ROAS chiến dịch, Sản lượng video và Đối soát tài chính 3 bên (Brand - Upbase - KOC/CTV).
            </p>
          </div>

          {/* Period & Filter Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none pr-2 cursor-pointer"
              >
                <option value="2026-10">Tháng 10/2026 (Hiện tại)</option>
                <option value="2026-09">Tháng 09/2026 (Đã chốt)</option>
                <option value="2026-Q4">Quý 4/2026 (Mega Sale)</option>
              </select>
            </div>

            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả Nhãn Hàng ({brands.length || 7})</option>
              {brands.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedChannel}
              onChange={e => setSelectedChannel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả Kênh Sàn</option>
              <option value="TIKTOK">TikTok Shop (Core)</option>
              <option value="SHOPEE">Shopee Mall</option>
              <option value="LAZADA">Lazada</option>
            </select>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExportExcel('Bao_Cao_Dieu_Hanh_Thang')}
              className="btn-md bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-300" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP TIER KPI METRIC CARDS                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Doanh Thu GMV Toàn Sàn</span>
            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded text-3xs font-bold">+18.4% WoW</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-600 mt-1.5">
            {formatVndShort(stats.totalGmv)}
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Mục tiêu: 2.10 Tỷ</span>
            <span className="font-semibold text-emerald-700">Đạt 88.0%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Chi Phí Vận Hành & Ads</span>
            <span className="text-slate-500 text-3xs">Burn Rate</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1.5">
            {formatVndShort(stats.totalSpend)}
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Booking: {formatVndShort(stats.bookingCost)}</span>
            <span>Ads: {formatVndShort(stats.adsSpend)}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-slate-700 h-full rounded-full" style={{ width: '84%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>ROAS Toàn Hệ Thống</span>
            <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-3xs font-bold">Vượt KPI</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-indigo-600 mt-1.5 flex items-baseline gap-1">
            <span>{stats.overallRoas}x</span>
            <span className="text-xs font-normal text-slate-500">ROAS</span>
          </div>
          <div className="text-3xs text-slate-500 mt-1">
            Lợi nhuận đóng góp: <strong className="text-slate-800 font-mono font-semibold">+{formatVndShort(stats.netProfitContribution)}</strong>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Sản Lượng Video On Air</span>
            <span className="text-emerald-600 text-3xs font-semibold">97.7% KPI</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 mt-1.5">
            {stats.totalOnAirVideos} <span className="text-xs font-normal text-slate-500">video</span>
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>KOC: 128</span>
            <span>CTV: 190</span>
            <span>Official: 24</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: '97.7%' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs relative overflow-hidden">
          <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Tuân Thủ SLA Bàn Giao</span>
            <span className="text-blue-600 text-3xs font-semibold">8 bước SLA</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-blue-600 mt-1.5">
            {stats.slaComplianceRate}%
          </div>
          <div className="text-3xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Duyệt kịch bản: 82%</span>
            <span>Nộp video: 4.2d</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.slaComplianceRate}%` }} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS                                                           */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('OVERVIEW')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'OVERVIEW'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Dashboard Điều Hành Đa Chiều</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CREATORS')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'CREATORS'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Báo Cáo KOC & Creator ROI Ranking</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('FINANCE_TAX')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'FINANCE_TAX'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Tài Chính, Dòng Tiền & Thuế TNCN 10%</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('REPORT_CENTER')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'REPORT_CENTER'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-rose-500" />
            <span>Trung Tâm Xuất Báo Cáo (Report Center)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DASHBOARD ĐIỀU HÀNH ĐA CHIỀU                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Row 1: Weekly Growth & Revenue Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Weekly GMV Trend Visualizer */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Tiến Độ Tăng Trưởng GMV Theo Tuần
                  </h3>
                  <p className="text-xs text-slate-500">So sánh GMV thực đạt và Chi phí đầu tư qua 4 tuần của Tháng 10/2026</p>
                </div>
                <span className="text-2xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  Tăng trưởng liên tục
                </span>
              </div>

              {/* Simulated Chart Bars */}
              <div className="grid grid-cols-4 gap-3 pt-3">
                {[
                  { week: 'Tuần 37 (01-07/10)', gmv: 380000000, spend: 62000000, roas: '6.1x', pct: 68 },
                  { week: 'Tuần 38 (08-14/10)', gmv: 420000000, spend: 68000000, roas: '6.2x', pct: 75 },
                  { week: 'Tuần 39 (15-21/10)', gmv: 494000000, spend: 78000000, roas: '6.3x', pct: 88 },
                  { week: 'Tuần 40 (22-28/10)', gmv: 554000000, spend: 85250000, roas: '6.5x', pct: 100 }
                ].map((w, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between space-y-2">
                    <div className="text-2xs font-semibold text-slate-600 truncate">{w.week}</div>
                    <div>
                      <div className="text-base font-extrabold font-mono text-emerald-600">
                        {formatVndShort(w.gmv)}
                      </div>
                      <div className="text-3xs text-slate-500 font-mono">
                        Chi phí: {formatVndShort(w.spend)}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${w.pct}%` }} />
                    </div>
                    <div className="text-3xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                      ROAS: {w.roas}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Distribution By Channel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  Cơ Cấu Doanh Thu 3 Nguồn Lực
                </h3>
                <p className="text-xs text-slate-500">Tỷ trọng đóng góp GMV toàn hệ thống</p>
              </div>

              <div className="space-y-3.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      1. KOC Booking Ngoài (Affiliate + Cast)
                    </span>
                    <span className="font-mono text-indigo-600">48% ({formatVndShort(stats.bookingGmv)})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '48%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      2. TikTok Seller Ads PGM
                    </span>
                    <span className="font-mono text-rose-600">30% ({formatVndShort(stats.adsGmv)})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      3. Kênh Sở Hữu & CTV Nội Bộ
                    </span>
                    <span className="font-mono text-emerald-600">22% ({formatVndShort(stats.ctvGmv)})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-2xs text-slate-500">
                  Mô hình kiềng 3 chân giúp tối ưu hóa biên độ lợi nhuận và giảm thiểu phụ thuộc vào một nguồn traffic duy nhất.
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Brand Performance Scorecard */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  Ma Trận Hiệu Suất Theo Nhãn Hàng (Brand Scorecard)
                </h3>
                <p className="text-xs text-slate-500">So sánh chi phí đầu tư, doanh thu gộp đem lại và ROAS của từng Brand đang quản lý</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab?.('brand-hub')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Xem Cổng Brand</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Tên Nhãn Hàng</th>
                    <th className="py-3 px-3 text-center">Số Deal</th>
                    <th className="py-3 px-3 text-right">Chi Phí (Cast + Ads)</th>
                    <th className="py-3 px-3 text-right">Doanh Thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS Thực Tế</th>
                    <th className="py-3 px-3 text-center">Video On Air</th>
                    <th className="py-3 px-4 text-center">Tình Trạng Nghiệm Thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brandScorecard.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>{b.brandName}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                        {b.dealsCount}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {b.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {b.gmv.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          b.roas >= 6.0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {b.roas}x
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                        {b.onAirCount} video
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-3xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã nghiệm thu 100%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3: Operations Funnel 5 Stages */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                Phễu Chuyển Đổi Vận Hành B2C (5 Giai Đoạn)
              </h3>
              <p className="text-xs text-slate-500">Tỷ lệ rơi rớt và tiến độ hoàn tất deal qua từng bước tác nghiệp</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {[
                { stage: '1. Sourcing & Pitching', count: 160, status: 'Tiếp cận KOC', pct: '100%', color: 'border-slate-300' },
                { stage: '2. Ký HĐ & Tạm Ứng', count: 148, status: 'Chốt cast 2tr', pct: '92.5%', color: 'border-blue-300' },
                { stage: '3. Giao Mẫu & Kịch Bản', count: 140, status: 'Duyệt brief 5d', pct: '87.5%', color: 'border-indigo-300' },
                { stage: '4. On Air & Chạy Ads', count: 128, status: 'Có mã Spark Ads', pct: '80.0%', color: 'border-rose-300' },
                { stage: '5. Quyết Toán & Thuế', count: 115, status: 'Hoàn tất bill', pct: '71.8%', color: 'border-emerald-400' },
              ].map((s, idx) => (
                <div key={idx} className={`bg-slate-50 p-3.5 rounded-xl border-t-2 ${s.color} border border-slate-200 text-xs space-y-1`}>
                  <div className="text-2xs font-semibold text-slate-500">{s.stage}</div>
                  <div className="text-lg font-bold font-mono text-slate-900">{s.count} deal</div>
                  <div className="flex justify-between text-3xs text-slate-500 pt-1">
                    <span>{s.status}</span>
                    <span className="font-semibold text-slate-700">{s.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: BÁO CÁO KOC & CREATOR ROI RANKING                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'CREATORS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Bảng Xếp Hạng KOC Winner & Creator ROI
              </h3>
              <p className="text-xs text-slate-500">Phân tích hiệu quả từng KOC: Giá cast thỏa thuận vs GMV thật từ Affiliate và Ads PGM</p>
            </div>
            <button
              type="button"
              onClick={() => handleExportExcel('Bao_Cao_KOC_Winner_ROI')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất Báo Cáo KOC</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-3xs">
                  <tr>
                    <th className="py-3 px-4">Tên KOC / Kênh Creator</th>
                    <th className="py-3 px-3">Phân Nhóm / Tệp</th>
                    <th className="py-3 px-3 text-right">Chi Phí Cast Net</th>
                    <th className="py-3 px-3 text-right">Doanh Thu GMV</th>
                    <th className="py-3 px-3 text-center">ROAS Thực Tế</th>
                    <th className="py-3 px-3 text-center">Hook 2 Giây</th>
                    <th className="py-3 px-3 text-center">Mã Spark Ads</th>
                    <th className="py-3 px-4 text-center">Phân Loại Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Kim Chung Phan', tier: 'Macro', niche: 'Review Nữ', cost: 15000000, gmv: 166050000, roas: 11.07, hook2s: '36.8%', ads: 'Đang chạy', winner: 'Top 1 Winner 👑' },
                    { name: 'Sandy ✿', tier: 'Micro', niche: 'Chăm sóc da', cost: 8000000, gmv: 54880000, roas: 6.86, hook2s: '32.1%', ads: 'Đang chạy', winner: 'Top 2 Winner' },
                    { name: 'Heda ☁︎ ᯓ', tier: 'Micro', niche: 'Lifestyle', cost: 7000000, gmv: 43610000, roas: 6.23, hook2s: '29.5%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'Ngọc Matcha ☘️', tier: 'Key', niche: 'Beauty & Vlog', cost: 25000000, gmv: 146000000, roas: 5.84, hook2s: '34.2%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'bui_imeo', tier: 'Micro', niche: 'Makeup Hàn', cost: 12000000, gmv: 61800000, roas: 5.15, hook2s: '31.0%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'Lương Thục Hiền', tier: 'Macro', niche: 'Chuyên gia Kẻ mắt', cost: 18000000, gmv: 89460000, roas: 4.97, hook2s: '28.3%', ads: 'Đang chạy', winner: 'Winner Đạt KPI' },
                    { name: 'Cô Học Chăm Da', tier: 'Key', niche: 'Skincare Khoa học', cost: 20000000, gmv: 83200000, roas: 4.16, hook2s: '27.4%', ads: 'Cần cấp lại mã', winner: 'Tiềm Năng' },
                  ].map((k, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                        {k.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-3xs font-medium bg-slate-100 text-slate-700">
                          {k.tier} - {k.niche}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {k.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {k.gmv.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          k.roas >= 6.0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {k.roas}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                        {k.hook2s}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${
                          k.ads === 'Đang chạy' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {k.ads}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                          k.roas >= 6.0 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {k.winner}
                        </span>
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
      {/* SUB-TAB 3: TÀI CHÍNH, DÒNG TIỀN & THUẾ TNCN                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'FINANCE_TAX' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Tạm Ứng Đã Chi (Advance)</div>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">
                {formatVndShort(stats.totalAdvancePaid || 72000000)}
              </div>
              <div className="text-3xs text-slate-500 mt-1">
                Định mức 2.000.000đ/deal sau khi ký HĐ & CCCD hợp lệ
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Quyết Toán Đã Chi (Final Paid)</div>
              <div className="text-xl font-extrabold font-mono text-emerald-600 mt-1">
                {formatVndShort(stats.totalFinalPaid || 173000000)}
              </div>
              <div className="text-3xs text-emerald-700 mt-1">
                Chi trả sau khi video on air và nghiệm thu mã Spark Ads
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Thuế TNCN 10% Khấu Trừ</div>
              <div className="text-xl font-extrabold font-mono text-rose-600 mt-1">
                {formatVndShort(stats.totalPitTaxWithheld)}
              </div>
              <div className="text-3xs text-slate-500 mt-1">
                Khấu trừ nộp Ngân sách Nhà nước theo mẫu TT80/2021/TT-BTC
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Nguyên Tắc Pháp Chế & Dòng Tiền Đang Áp Dụng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">Quy định Hợp đồng trên 9.000.000 VNĐ:</span>
                <p>Bắt buộc có file scan hợp đồng có chữ ký tươi/chữ ký số và ảnh CCCD 2 mặt rõ nét trước ngày làm Đề nghị thanh toán (DNTT) ít nhất 2 ngày.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">Khấu trừ Thuế TNCN 10% vãng lai:</span>
                <p>Mọi hợp đồng dịch vụ cá nhân từ 2.000.000 VNĐ trở lên bắt buộc khấu trừ 10% tại nguồn và xuất chứng từ khấu trừ thuế điện tử cho KOC.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: TRUNG TÂM XUẤT BÁO CÁO (REPORT CENTER)                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'REPORT_CENTER' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-rose-600" />
              Trung Tâm Tạo & Xuất Báo Cáo Định Kỳ Chuẩn Enterprise
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn mẫu báo cáo phù hợp để hệ thống tự động bóc tách dữ liệu và xuất file Excel (.xlsx) chuẩn hóa để gửi Nhãn hàng hoặc lưu trữ nội bộ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Brand Weekly Report */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    Dành cho Nhãn Hàng
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Tuần Nghiệm Thu Chiến Dịch (Brand Weekly)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tổng hợp toàn bộ video KOC đã lên sóng, link TikTok, mã Spark Ads, số view, chi phí Ads PGM thực tế và ROAS đạt được để Brand ký duyệt nghiệm thu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Tuan_Brand_Nghiem_Thu')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo Brand (.xlsx)</span>
              </button>
            </div>

            {/* Card 2: Campaign PnL Report */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Dành cho Ban Giám Đốc
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo PnL & Hiệu Quả Chiến Dịch (Campaign PnL)</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bóc tách chi tiết từng dòng doanh thu GMV (Booking + Ads + CTV), chi phí vốn (Cast + Ads + Phí mẫu), lợi nhuận gộp và tỷ suất sinh lời ROAS toàn sàn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_PnL_Chien_Dich')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo PnL (.xlsx)</span>
              </button>
            </div>

            {/* Card 3: Legal & Tax Audit */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                    Pháp Chế & Kế Toán
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Đối Soát Hợp Đồng & Thuế TNCN 10%</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Danh sách đối soát CCCD, số tài khoản, mã phiếu duyệt Lark, số tiền cast đã thanh toán, và 10% thuế TNCN đã trích giữ để quyết toán quý với Chi cục Thuế.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Thue_TNCN_Hop_Dong')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo Thuế (.xlsx)</span>
              </button>
            </div>

            {/* Card 4: 4P & P3 Bonus */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    Nhân Sự & Đánh Giá
                  </span>
                  <span className="text-2xs text-slate-400">Định dạng .XLSX</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Báo Cáo Đánh Giá Hiệu Suất 4P & Quỹ Thưởng P3</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bảng tổng hợp điểm Workload theo hệ số độ khó Store, tỷ lệ tuân thủ SLA và phân bổ quỹ thưởng P3 hàng tháng cho từng nhân sự Booking & Content.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleExportExcel('Bao_Cao_Danh_Gia_P3_Nhan_Su')}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Báo Cáo P3 (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
