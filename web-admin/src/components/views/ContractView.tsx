'use client';

import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Eye,
  CheckCircle2,
  CheckCircle,
  QrCode,
  Filter,
  Search,
  Copy,
  Check,
  Building2,
  Package,
  Calendar,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  FileText,
  X,
  CreditCard
} from 'lucide-react';
import { BookingDealItem } from '../../lib/types';

interface ContractViewProps {
  deals: BookingDealItem[];
  onSelectDeal: (deal: BookingDealItem) => void;
  onApproveAdvance: (dealId: string) => void;
  onApproveFinal?: (dealId: string) => void;
}

export const ContractView: React.FC<ContractViewProps> = ({
  deals,
  onSelectDeal,
  onApproveAdvance,
  onApproveFinal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 🌟 SLA B2C: Modal Cảnh Báo Vi Phạm Điều Kiện Hợp Đồng & Thanh Toán
  const [complianceModalDeal, setComplianceModalDeal] = useState<{
    deal: BookingDealItem;
    reason: string;
    requiredAction: string;
  } | null>(null);

  const handleAttemptApproveAdvance = (deal: BookingDealItem) => {
    // 🌟 SLA B2C Rule: Deal > 9.000.000 VNĐ bắt buộc có hợp đồng ký tối thiểu trước 2 ngày khi làm DNTT
    if (deal.totalValue > 9000000) {
      const hasScan = Boolean(deal.contractScanUrl);
      const signedDays = deal.contractSignDaysPrior ?? 0;
      if (!hasScan || signedDays < 2) {
        setComplianceModalDeal({
          deal,
          reason: !hasScan
            ? 'Deal giá trị lớn (> 9.000.000 VNĐ) bắt buộc phải có bản scan hợp đồng hợp tác có chữ ký 2 bên đẩy lên thư mục chung của team!'
            : `Hợp đồng mới ký cách đây ${signedDays} ngày. Theo quy chuẩn SLA B2C, hợp đồng trên 9M phải được ký tối thiểu trước 2 ngày khi làm đề nghị thanh toán!`,
          requiredAction: 'Tải bản Scan Hợp Đồng 2 bên ký lên hệ thống và bổ sung số CCCD của KOC để mở khóa duyệt chi.'
        });
        return;
      }
    }
    onApproveAdvance(deal.id);
  };

  const handleAttemptApproveFinal = (deal: BookingDealItem) => {
    if (deal.totalValue > 9000000) {
      const hasScan = Boolean(deal.contractScanUrl);
      if (!hasScan) {
        setComplianceModalDeal({
          deal,
          reason: 'Quyết toán Deal > 9.000.000 VNĐ bắt buộc phải hoàn tất đầy đủ chứng từ: Bản Scan Hợp đồng, CCCD và nghiệm thu đầy đủ!',
          requiredAction: 'Bổ sung file Scan Hợp Đồng và hóa đơn VAT/chứng từ nghiệm thu trước khi phê duyệt tất toán.'
        });
        return;
      }
    }
    if (onApproveFinal) {
      onApproveFinal(deal.id);
    }
  };

  // Derive unique brands
  const brandsList = useMemo(() => {
    return Array.from(new Set(deals.map(d => d.brandName).filter(Boolean))).sort();
  }, [deals]);

  // Aggregate KPI Calculations
  const totalContractValue = deals.reduce((acc, d) => acc + d.totalValue, 0);
  const totalAdvancePaid = deals
    .filter(d => d.status === 'ADVANCE_PAID' || d.status === 'VIDEO_SUBMITTED' || d.status === 'FINAL_PAID')
    .reduce((acc, d) => acc + d.advanceAmount, 0);
  const totalPendingSettlement = deals
    .filter(d => d.status === 'VIDEO_SUBMITTED')
    .reduce((acc, d) => acc + d.finalAmount, 0);
  const totalCompletedValue = deals
    .filter(d => d.status === 'FINAL_PAID')
    .reduce((acc, d) => acc + d.totalValue, 0);

  const advancePaidRate = totalContractValue > 0 ? Math.round((totalAdvancePaid / totalContractValue) * 100) : 0;

  // Filter Counts
  const needAdvanceCount = deals.filter(
    d => d.status !== 'ADVANCE_PAID' && d.status !== 'FINAL_PAID' && d.status !== 'VIDEO_SUBMITTED'
  ).length;
  const advancePaidCount = deals.filter(d => d.status === 'ADVANCE_PAID').length;
  const needSettleCount = deals.filter(d => d.status === 'VIDEO_SUBMITTED').length;
  const completedCount = deals.filter(d => d.status === 'FINAL_PAID').length;

  // Filtered Deals
  const filteredDeals = deals.filter(deal => {
    // 1. Status Filter
    if (filterStatus === 'NEED_ADVANCE') {
      if (deal.status === 'ADVANCE_PAID' || deal.status === 'FINAL_PAID' || deal.status === 'VIDEO_SUBMITTED') return false;
    } else if (filterStatus === 'ADVANCE_PAID') {
      if (deal.status !== 'ADVANCE_PAID') return false;
    } else if (filterStatus === 'NEED_SETTLE') {
      if (deal.status !== 'VIDEO_SUBMITTED') return false;
    } else if (filterStatus === 'COMPLETED') {
      if (deal.status !== 'FINAL_PAID') return false;
    }

    // 2. Brand Filter
    if (selectedBrand !== 'ALL' && deal.brandName !== selectedBrand) {
      return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = deal.dealCode.toLowerCase().includes(q);
      const matchKoc = deal.kocStageName.toLowerCase().includes(q);
      const matchCamp = deal.campaignTitle.toLowerCase().includes(q);
      const matchProd = (deal.productName || '').toLowerCase().includes(q);
      const matchBrand = (deal.brandName || '').toLowerCase().includes(q);
      if (!matchCode && !matchKoc && !matchCamp && !matchProd && !matchBrand) {
        return false;
      }
    }

    return true;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // Helper for brand badge styling
  const getBrandBadgeClass = (brand: string) => {
    if (brand.includes('Senka')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (brand.includes('Kutieskin')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (brand.includes('Peripera')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (brand.includes('Royal')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (brand.includes('Cure')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-4">
      {/* 4 Balanced KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng Giá Trị */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Giá Trị Hợp Đồng
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 whitespace-nowrap">
            {totalContractValue.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">₫</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-blue-600 font-semibold">{deals.length} HĐ đang theo dõi</span>
            <span className="text-slate-400">{brandsList.length} Nhãn hàng</span>
          </div>
        </div>

        {/* Card 2: Đã Cọc Đợt 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã Chi Tạm Ứng (Đợt 1)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-2 whitespace-nowrap">
            {totalAdvancePaid.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-emerald-500">₫</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Tỷ lệ chi cọc:</span>
              <span className="font-bold text-emerald-700">{advancePaidRate}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(advancePaidRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Chờ Quyết Toán Đợt 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chờ Quyết Toán (Đợt 2)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-2 whitespace-nowrap">
            {totalPendingSettlement.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-indigo-500">₫</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-indigo-600 font-semibold">{needSettleCount} Video đã lên sóng</span>
            <span className="text-slate-500">Cần nghiệm thu mã Ads</span>
          </div>
        </div>

        {/* Card 4: Tuân Thủ Pháp Lý & Thanh Toán */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pháp Lý & VietQR
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-purple-700 mt-2 whitespace-nowrap">
            100% <span className="text-sm font-semibold text-slate-500">HĐ Điện Tử</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-purple-600 font-semibold">Tự động hóa Lark Approval</span>
            <span className="text-slate-400">VietQR 1-chạm</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Brand Filter, Status Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã HĐ (BO26...), KOC, chiến dịch, sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Nhãn hàng:
            </span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả nhãn hàng ({deals.length})</option>
              {brandsList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-2.5">
          <span className="text-slate-400 flex items-center gap-1 mr-1 text-[11px] font-medium shrink-0">
            <Filter className="w-3.5 h-3.5" /> Trạng thái:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả HĐ', count: deals.length },
            { key: 'NEED_ADVANCE', label: 'Chờ chi cọc (Đợt 1)', count: needAdvanceCount, color: 'amber' },
            { key: 'ADVANCE_PAID', label: 'Đã chi cọc (Đang làm video)', count: advancePaidCount, color: 'blue' },
            { key: 'NEED_SETTLE', label: 'Video lên sóng (Cần tất toán)', count: needSettleCount, color: 'indigo' },
            { key: 'COMPLETED', label: 'Đã tất toán xong', count: completedCount, color: 'emerald' },
          ].map(tab => {
            const isActive = filterStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Balanced, Rich Data Contracts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table Header Summary Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Danh Sách Hợp Đồng KOC & Trạng Thái Phê Duyệt</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {filteredDeals.length} Hợp Đồng
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đồng bộ phê duyệt chi tự động qua Lark Approval Open API • Nghiệm thu video & mã Spark Ads trước khi tất toán
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cọc: {totalAdvancePaid.toLocaleString('vi-VN')} ₫
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Chờ tất toán: {totalPendingSettlement.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[1280px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-[170px] min-w-[170px] border-b border-slate-200 bg-slate-50">Mã HĐ & Nhãn Hàng</th>
                <th className="py-3.5 px-4 w-[210px] min-w-[210px] border-b border-slate-200 bg-slate-50">KOC & Kênh Tác Nghiệp</th>
                <th className="py-3.5 px-4 w-[230px] min-w-[230px] border-b border-slate-200 bg-slate-50">Chiến Dịch & Sản Phẩm</th>
                <th className="py-3.5 px-4 w-[160px] min-w-[160px] border-b border-slate-200 bg-slate-50">Lên Sóng & Mẫu</th>
                <th className="py-3.5 px-4 w-[210px] min-w-[210px] border-b border-slate-200 bg-slate-50">Tài Chính & Giải Ngân</th>
                <th className="py-3.5 px-4 w-[190px] min-w-[190px] border-b border-slate-200 bg-slate-50">Trạng Thái Phê Duyệt</th>
                <th className="py-3.5 px-4 w-[180px] min-w-[180px] text-right sticky right-0 z-20 bg-slate-50 shadow-[-3px_0_6px_rgba(0,0,0,0.04)] border-b border-l border-slate-200">
                  Thao Tác / Lark
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    Không tìm thấy hợp đồng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => {
                  const advancePercent = deal.totalValue > 0 ? Math.round((deal.advanceAmount / deal.totalValue) * 100) : 0;
                  const finalPercent = 100 - advancePercent;
                  const isCopied = copiedCode === deal.dealCode;

                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Cột 1: Mã HĐ & Brand */}
                      <td className="py-3.5 px-4 align-top border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => onSelectDeal(deal)}
                            className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline text-xs tracking-tight"
                            title="Bấm để xem chi tiết HĐ điện tử"
                          >
                            {deal.dealCode}
                          </span>
                          <button
                            onClick={() => handleCopyCode(deal.dealCode)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                            title="Sao chép mã hợp đồng"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getBrandBadgeClass(
                              deal.brandName
                            )}`}
                          >
                            {deal.brandName}
                          </span>
                        </div>

                        {/* 🌟 SLA B2C: Cảnh báo điều kiện hợp đồng > 9M & CCCD */}
                        <div className="mt-1.5 space-y-0.5">
                          {deal.totalValue > 9000000 ? (
                            deal.contractScanUrl && (deal.contractSignDaysPrior ?? 0) >= 2 ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> HĐ Scan (Đủ 2d)
                              </span>
                            ) : (
                              <span 
                                onClick={() => setComplianceModalDeal({
                                  deal,
                                  reason: !deal.contractScanUrl 
                                    ? 'Deal > 9.000.000 VNĐ bắt buộc phải có bản scan hợp đồng hợp tác có chữ ký 2 bên đẩy lên thư mục chung của team!'
                                    : `Hợp đồng ký cách đây ${deal.contractSignDaysPrior ?? 0} ngày (yêu cầu tối thiểu 2 ngày trước DNTT).`,
                                  requiredAction: 'Bổ sung file Scan Hợp Đồng ký 2 bên và CCCD trước khi duyệt chi.'
                                })}
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 cursor-pointer hover:bg-rose-100 transition animate-pulse"
                                title="Nhấp xem chi tiết vi phạm SLA"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> HĐ &gt;9M (Thiếu Scan/2d)
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] text-slate-400 block">&lt; 9M: Khuyến khích HĐ</span>
                          )}

                          {deal.hasIdCardScan ? (
                            <span className="text-[9px] text-slate-500 block">✓ CCCD: {deal.kocIdCardNumber || 'Hợp lệ'}</span>
                          ) : (
                            <span className="text-[9px] text-amber-600 font-semibold block">⚠️ Chưa tải ảnh CCCD</span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 mt-1">
                          Ngày tạo: 22/09/2026
                        </div>
                      </td>

                      {/* Cột 2: KOC & Kênh Tác Nghiệp */}
                      <td className="py-3.5 px-4 align-top border-b border-slate-100">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                            {deal.kocStageName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                              {deal.kocStageName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>🎵 {deal.kocChannelId || '@koc'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                {deal.salaryGrade || 'KL5'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {deal.tepKenh || 'Review'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Chiến Dịch & Sản Phẩm */}
                      <td className="py-3.5 px-4 align-top border-b border-slate-100">
                        <div
                          className="font-medium text-slate-800 line-clamp-1 max-w-[210px]"
                          title={deal.campaignTitle}
                        >
                          {deal.campaignTitle}
                        </div>
                        <div
                          className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5 line-clamp-1 max-w-[210px]"
                          title={deal.productName}
                        >
                          <Package className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate">{deal.productName || 'Sản phẩm booking'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>PIC:</span>
                          <strong className="text-slate-600 font-medium">{deal.assignedStaff || 'Khánh Vy'}</strong>
                        </div>
                      </td>

                      {/* Cột 4: Lên Sóng & Hàng Mẫu */}
                      <td className="py-3.5 px-4 align-top border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{deal.deadlinePost || '10/10/2026'}</span>
                        </div>

                        {/* Sample Status Badge */}
                        <div className="mt-1.5">
                          {deal.sampleStatus === 'ĐÃ_NHẬN' ? (
                            <span className="badge-emerald px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Đã nhận sample
                            </span>
                          ) : deal.sampleStatus === 'ĐANG_GIAO' ? (
                            <span className="badge-amber px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Đang giao sample
                            </span>
                          ) : (
                            <span className="badge-slate px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit">
                              Chưa gửi sample
                            </span>
                          )}
                        </div>

                        {/* Spark Ads Code Status */}
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          {deal.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' ? (
                            <span className="text-blue-600 font-medium">⚡ Mã Ads: Sẵn sàng</span>
                          ) : (
                            <span className="text-slate-400">⏳ Mã Ads: Chưa cấp</span>
                          )}
                        </div>
                      </td>

                      {/* Cột 5: Tài Chính & Giải Ngân */}
                      <td className="py-3.5 px-4 align-top border-b border-slate-100">
                        <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
                          {deal.totalValue.toLocaleString('vi-VN')} <span className="text-xs font-medium text-slate-500">₫</span>
                        </div>

                        {/* Dual Progress Bar */}
                        <div className="mt-1.5">
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${advancePercent}%` }}
                              title={`Đã cọc: ${advancePercent}%`}
                            />
                            <div
                              className="h-full bg-blue-300 transition-all"
                              style={{ width: `${finalPercent}%` }}
                              title={`Còn lại: ${finalPercent}%`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 whitespace-nowrap">
                            <span className="text-emerald-700 font-semibold">
                              Cọc: {deal.advanceAmount.toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="text-blue-700 font-semibold">
                              Tất toán: {deal.finalAmount.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 6: Trạng Thái Phê Duyệt */}
                      <td className="py-3.5 px-4 align-top border-b border-slate-100">
                        <div className="w-fit whitespace-nowrap">
                          {deal.status === 'FINAL_PAID' ? (
                            <span className="badge-emerald px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã tất toán xong
                            </span>
                          ) : deal.status === 'VIDEO_SUBMITTED' ? (
                            <span className="badge-purple px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Video lên sóng (Cần tất toán)
                            </span>
                          ) : deal.status === 'ADVANCE_PAID' ? (
                            <span className="badge-blue px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã chi cọc (Chờ video)
                            </span>
                          ) : (
                            <span className="badge-amber px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Chờ duyệt Lark (Cọc)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1 whitespace-nowrap">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span>VietQR • Sẵn sàng chi</span>
                        </div>
                      </td>

                      {/* Cột 7: Thao Tác / Lark (Sticky Right) */}
                      <td className="py-3.5 px-4 align-top text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-3px_0_6px_rgba(0,0,0,0.04)] border-b border-l border-slate-200">
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Nút Chi Đợt 1 (Cọc) */}
                          {deal.status !== 'ADVANCE_PAID' &&
                            deal.status !== 'FINAL_PAID' &&
                            deal.status !== 'VIDEO_SUBMITTED' && (
                              <button
                                onClick={() => handleAttemptApproveAdvance(deal)}
                                className="btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs transition flex items-center gap-1 w-full justify-center"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Duyệt Lark (Cọc)</span>
                              </button>
                            )}

                          {/* Nút Tất Toán Đợt 2 */}
                          {deal.status === 'VIDEO_SUBMITTED' && onApproveFinal && (
                            <button
                              onClick={() => handleAttemptApproveFinal(deal)}
                              className="btn-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs transition flex items-center gap-1 w-full justify-center"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Duyệt Lark (Tất toán)</span>
                            </button>
                          )}

                          {/* Nút Xem HĐ & QR */}
                          <button
                            onClick={() => onSelectDeal(deal)}
                            className="btn-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition flex items-center gap-1 w-full justify-center"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Xem HĐ & QR</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Pagination Info */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Hiển thị <strong className="text-slate-800">{filteredDeals.length}</strong> trên tổng số{' '}
            <strong className="text-slate-800">{deals.length}</strong> hợp đồng
          </span>
          <div className="text-[11px] text-slate-400">
            Hệ thống đối soát hợp đồng điện tử Upbase B2C • Cập nhật tức thời
          </div>
        </div>
      </div>

      {/* 🌟 SLA B2C: Modal Cảnh Báo Chặn Duyệt Chi Khi Vi Phạm Hợp Đồng > 9M */}
      {complianceModalDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-rose-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Cảnh Báo Vi Phạm SLA: Chặn Duyệt Lark
                  </h3>
                  <p className="text-xs text-rose-700 font-semibold mt-0.5">
                    Hợp đồng không đủ điều kiện giải ngân tài chính
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComplianceModalDeal(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-rose-100 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Deal Snapshot Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-500 font-semibold">{complianceModalDeal.deal.dealCode}</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {complianceModalDeal.deal.totalValue.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="text-slate-900 font-bold text-sm">
                  {complianceModalDeal.deal.kocStageName} • <span className="text-slate-600 font-normal">{complianceModalDeal.deal.brandName}</span>
                </div>
                <div className="text-slate-600">
                  Chiến dịch: <strong className="text-slate-800">{complianceModalDeal.deal.campaignTitle}</strong>
                </div>
                <div className="text-slate-500 flex items-center gap-3 pt-1 border-t border-slate-200/60 text-[11px]">
                  <span>PIC: <strong>{complianceModalDeal.deal.assignedStaff}</strong></span>
                  <span>Ngân hàng: <strong>{complianceModalDeal.deal.kocBankName || 'Techcombank'}</strong></span>
                </div>
              </div>

              {/* Chi Tiết Lỗi */}
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/80">
                <div className="font-bold text-rose-800 text-xs flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Lý do kích hoạt cảnh báo vi phạm:</span>
                </div>
                <p className="text-rose-700 leading-relaxed font-medium">
                  {complianceModalDeal.reason}
                </p>
              </div>

              {/* Hành Động Khắc Phục */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Hành động bắt buộc để được phê duyệt:</span>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  {complianceModalDeal.requiredAction}
                </p>
              </div>

              {/* Trích xuất điều khoản SLA B2C */}
              <div className="p-3 bg-slate-100/80 rounded-lg text-[11px] text-slate-600 border border-slate-200 space-y-1">
                <strong className="text-slate-800 block">Quy chuẩn tài chính SLA B2C Upbase:</strong>
                <p>
                  • Hợp đồng <strong>&gt; 9.000.000 VNĐ</strong> bắt buộc phải có bản scan 2 bên ký lưu trên Drive chung tối thiểu <strong>2 ngày làm việc</strong> trước khi làm ĐNTT.
                </p>
                <p>
                  • Bắt buộc thu thập ảnh chụp <strong>CCCD / Passport</strong> chính chủ và kiểm tra STK ngân hàng khớp tên người thụ hưởng (Nghiêm cấm chuyển khoản trung gian cá nhân).
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  const deal = complianceModalDeal.deal;
                  setComplianceModalDeal(null);
                  onSelectDeal(deal);
                }}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Xem Hồ Sơ & Bổ Sung Chứng Từ</span>
              </button>
              <button
                onClick={() => setComplianceModalDeal(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
