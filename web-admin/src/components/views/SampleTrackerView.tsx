'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Search, 
  Filter, 
  Plus, 
  Copy, 
  ShieldAlert, 
  Share2, 
  Phone, 
  MessageSquare,
  Check,
  Sparkles
} from 'lucide-react';
import { SampleShipment, BookingDealItem, UserProfile } from '@/lib/types';
import { MOCK_SAMPLE_SHIPMENTS } from '@/lib/mockData';

export interface SampleTrackerViewProps {
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateDealWithSparkAds?: (dealCode: string, sparkCode: string) => void;
}

export default function SampleTrackerView({
  deals = [],
  currentUser,
  onNotify,
  onUpdateDealWithSparkAds
}: SampleTrackerViewProps = {}) {
  // Đồng bộ các deal từ Booking sang danh sách vận đơn mẫu nếu chưa có
  const mergedInitialShipments = useMemo(() => {
    const existingCodes = new Set(MOCK_SAMPLE_SHIPMENTS.map(s => s.dealCode));
    const dealShipments: SampleShipment[] = deals
      .filter(d => !existingCodes.has(d.dealCode))
      .map((d, idx) => ({
        id: `SMP-DEAL-${d.id || idx}`,
        dealCode: d.dealCode,
        kocName: d.kocStageName,
        kocPhone: '0981.xxx.xxx',
        shippingAddress: 'Địa chỉ nhận mẫu KOC đã xác nhận trên hệ thống',
        brandName: d.brandName,
        productName: d.productName || 'Sản phẩm chủ lực',
        carrier: 'GHN',
        trackingCode: `GHN-${d.dealCode.replace(/[^0-9]/g, '') || Math.floor(10000000 + Math.random() * 90000000)}`,
        sentDate: '01/10/2026',
        deliveredDate: d.sampleStatus === 'ĐÃ_NHẬN' ? '03/10/2026' : undefined,
        status: (d.sampleStatus === 'ĐÃ_NHẬN' ? 'DELIVERED' : d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' ? 'AIRED' : 'DELIVERING') as any,
        daysSinceDelivered: d.sampleStatus === 'ĐÃ_NHẬN' ? 2 : 0,
        demoDeadlineDays: 5,
        sparkAdsCode: d.sparkAdsCode,
        isMediaHandedOff: !!d.sparkAdsCode,
        bookingPic: d.assignedStaff || 'Khánh Vy',
        notes: `Tự động liên kết từ Deal Booking ${d.dealCode} (${d.campaignTitle})`
      }));

    return [...MOCK_SAMPLE_SHIPMENTS, ...dealShipments];
  }, [deals]);

  const [shipments, setShipments] = useState<SampleShipment[]>(mergedInitialShipments);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sparkCodeInput, setSparkCodeInput] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    setShipments(prev => {
      const prevIds = new Set(prev.map(p => p.id));
      const newlyAdded = mergedInitialShipments.filter(m => !prevIds.has(m.id));
      return newlyAdded.length > 0 ? [...prev, ...newlyAdded] : prev;
    });
  }, [mergedInitialShipments]);

  const brands = Array.from(new Set(shipments.map(s => s.brandName)));

  const filteredShipments = shipments.filter(s => {
    const matchSearch = s.kocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.dealCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchBrand = selectedBrand === 'ALL' || s.brandName === selectedBrand;
    return matchSearch && matchStatus && matchBrand;
  });

  // KPI counts
  const totalSent = shipments.length;
  const deliveringCount = shipments.filter(s => s.status === 'DELIVERING').length;
  const inProgressCount = shipments.filter(s => s.status === 'DELIVERED' || s.status === 'DEMO_SUBMITTED').length;
  const ghostAlertCount = shipments.filter(s => s.status === 'GHOST_WARNING').length;
  const airedCount = shipments.filter(s => s.status === 'AIRED').length;
  const blacklistedCount = shipments.filter(s => s.status === 'BLACKLISTED').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSparkCode = (id: string) => {
    const code = sparkCodeInput[id];
    if (!code) return;
    const targetItem = shipments.find(s => s.id === id);
    setShipments(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          sparkAdsCode: code,
          sparkAdsExpiryDays: 60,
          isMediaHandedOff: true,
          status: 'AIRED'
        };
      }
      return item;
    }));

    if (targetItem && onUpdateDealWithSparkAds) {
      onUpdateDealWithSparkAds(targetItem.dealCode, code);
    }
    if (onNotify) {
      onNotify(`Đã lưu mã Spark Ads [${code}] cho đơn mẫu ${targetItem?.dealCode || id} và bàn giao cho Media`);
    }
  };

  const handleMarkBlacklist = (id: string) => {
    if (!confirm('Xác nhận đưa KOC này vào danh sách Blacklist bùng mẫu? Thông tin sẽ được cảnh báo toàn công ty.')) return;
    setShipments(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'BLACKLISTED',
          notes: 'Đã đưa vào Blacklist vì nhận mẫu quá hạn không trả video.'
        };
      }
      return item;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Giám sát mẫu & chống bùng KOC</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
              SLA 5 ngày kịch bản
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hành trình gửi mẫu, cảnh báo KOC nhận hàng quá hạn nộp kịch bản và thu thập mã Spark Ads bàn giao Media.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('Mở form tạo phiếu xuất kho gửi mẫu cho KOC')}
            className="btn-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo phiếu gửi mẫu</span>
          </button>
        </div>
      </div>

      {/* SLA B2C: Quy Chuẩn Vận Chuyển Mẫu & Leo Thang */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl text-xs text-amber-900 space-y-1">
        <div className="font-semibold flex items-center gap-2 text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Quy Chuẩn SLA Xuất Kho &amp; Leo Thang Vận Đơn Mẫu (B2C Standard):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-2xs pt-1">
          <div className="p-2 bg-white/70 rounded-lg border border-amber-200">
            <strong>1. SLA kho xuất hàng:</strong> Tối đa <strong>48h (2 ngày)</strong> kể từ khi Content gửi thông tin.
          </div>
          <div className="p-2 bg-white/70 rounded-lg border border-amber-200">
            <strong>2. Quá 2 ngày chưa gửi kho:</strong> Hệ thống tự động <strong>Alert Account &amp; Growth</strong>.
          </div>
          <div className="p-2 bg-white/70 rounded-lg border border-amber-200">
            <strong>3. Quá 3 ngày thiếu mã:</strong> Tự động <strong>Alert Leader B2C</strong> can thiệp.
          </div>
          <div className="p-2 bg-white/70 rounded-lg border border-amber-200">
            <strong>4. Quá 5 ngày chưa nhận:</strong> Đổi KOC / điều chỉnh timeline (Cấm nhận video gấp &lt; 5 ngày).
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Tổng đơn mẫu</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-semibold text-slate-900">{totalSent}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Toàn bộ chiến dịch</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Đang vận chuyển</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-semibold text-blue-600">{deliveringCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Chờ bưu tá giao</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Đã nhận (trong hạn)</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-semibold text-emerald-600">{inProgressCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Đang dựng kịch bản</div>
        </div>

        <div className="bg-rose-50/50 border border-rose-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-semibold">Cảnh báo bùng mẫu</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-semibold text-rose-700">{ghostAlertCount}</div>
          <div className="text-2xs text-rose-600 font-medium mt-0.5">&gt; 5 ngày chưa có video</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Đã Air & có Spark Ads</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-semibold text-slate-900">{airedCount}</div>
          <div className="text-2xs text-emerald-600 font-medium mt-0.5">Sẵn sàng chạy Ads</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Blacklist Bùng</span>
            <ShieldAlert className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-semibold text-slate-700">{blacklistedCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Chặn hợp tác</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-md shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo KOC, mã vận đơn, sản phẩm..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Brand:</span>
          </div>
          <select 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">Tất cả Brand</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DELIVERING">Đang vận chuyển</option>
            <option value="DELIVERED">Đã nhận (Trong hạn)</option>
            <option value="GHOST_WARNING">Cảnh báo bùng mẫu (&gt;5 ngày)</option>
            <option value="DEMO_SUBMITTED">Đã nộp Demo</option>
            <option value="AIRED">Đã Air & có Spark Ads</option>
            <option value="BLACKLISTED">Blacklist bùng mẫu</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-[200px] min-w-[200px]">KOC & Deal</th>
                <th className="py-3 px-3 w-[240px] min-w-[240px]">Sản phẩm & Brand</th>
                <th className="py-3 px-3 w-[220px] min-w-[220px]">Vận đơn & trạng thái</th>
                <th className="py-3 px-3 w-[180px] min-w-[180px]">Thời Gian & SLA Demo</th>
                <th className="py-3 px-3 w-[190px] min-w-[190px]">Mã TikTok Spark Ads</th>
                <th className="py-3 px-3 pr-4 text-right w-[160px] min-w-[160px] sticky right-0 bg-slate-50 border-l border-slate-200">Xử lý & hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.map(item => {
                const isOverdue = item.status === 'GHOST_WARNING';
                const isBlacklisted = item.status === 'BLACKLISTED';

                return (
                  <tr key={item.id} className={`hover:bg-slate-50/70 transition ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                    {/* KOC Info */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.kocName}</div>
                      <div className="text-2xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.kocPhone}</span>
                      </div>
                      <div className="text-2xs text-slate-400 font-mono mt-0.5">{item.dealCode}</div>
                    </td>

                    {/* Product & Brand */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-1.5 py-0.5 text-2xs font-semibold bg-slate-100 text-slate-700 rounded mb-1">
                        {item.brandName}
                      </span>
                      <div className="font-medium text-slate-800 line-clamp-1 max-w-[200px]" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="text-2xs text-slate-400 line-clamp-1 max-w-[200px]" title={item.shippingAddress}>
                        {item.shippingAddress}
                      </div>
                    </td>

                    {/* Tracking Code */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-slate-800">{item.trackingCode}</span>
                        <button 
                          onClick={() => handleCopy(item.trackingCode, item.id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Sao chép mã vận đơn"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-2xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-slate-600">{item.carrier}</span>
                        <span>• Gửi: {item.sentDate}</span>
                      </div>

                      {/* Status Badges */}
                      <div className="mt-1.5">
                        {item.status === 'DELIVERING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            <Truck className="w-3 h-3" /> Đang giao hàng
                          </span>
                        )}
                        {item.status === 'DELIVERED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Đã nhận ({item.deliveredDate})
                          </span>
                        )}
                        {item.status === 'GHOST_WARNING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 rounded">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Cảnh báo bùng (quá hạn 5d)
                          </span>
                        )}
                        {item.status === 'DEMO_SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded">
                            <Clock className="w-3 h-3" /> Đã nộp Demo
                          </span>
                        )}
                        {item.status === 'AIRED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Video đã Air
                          </span>
                        )}
                        {item.status === 'BLACKLISTED' && (
                          <span className="badge-rose inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold">
                            <ShieldAlert className="w-3 h-3" /> BLACKLIST
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SLA Demo Countdown */}
                    <td className="py-3 px-3">
                      {item.deliveredDate ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600 font-medium">Nhận hàng:</span>
                            <span className="text-slate-900 font-semibold">{item.deliveredDate}</span>
                          </div>
                          <div className={`text-2xs font-medium mt-1 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                            {item.status === 'AIRED' ? (
                              <span className="text-emerald-600">Đã hoàn thành đúng hạn</span>
                            ) : item.status === 'GHOST_WARNING' ? (
                              <span>Đã qua {item.daysSinceDelivered} ngày (Quá hạn {item.daysSinceDelivered - item.demoDeadlineDays} ngày)</span>
                            ) : (
                              <span>Đã qua {item.daysSinceDelivered} ngày (Còn {item.demoDeadlineDays - item.daysSinceDelivered} ngày)</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Chưa giao tới KOC</div>
                      )}
                      <div className="text-2xs text-slate-400 mt-1">PIC: {item.bookingPic}</div>
                    </td>

                    {/* Spark Ads Code */}
                    <td className="py-3 px-3">
                      {item.sparkAdsCode ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-2xs bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            <span className="font-semibold text-slate-800">{item.sparkAdsCode}</span>
                            <button 
                              onClick={() => handleCopy(item.sparkAdsCode!, `spark-${item.id}`)}
                              className="text-slate-400 hover:text-slate-600 ml-auto"
                            >
                              {copiedId === `spark-${item.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                            <span>Hạn: {item.sparkAdsExpiryDays} ngày</span>
                            {item.isMediaHandedOff ? (
                              <span className="text-emerald-600 font-semibold">Đã giao Media</span>
                            ) : (
                              <span className="text-amber-600 font-medium">Chờ giao Media</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Nhập mã Spark Ads..." 
                            value={sparkCodeInput[item.id] || ''}
                            onChange={(e) => setSparkCodeInput({ ...sparkCodeInput, [item.id]: e.target.value })}
                            className="w-32 px-2 py-1 text-2xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <button 
                            onClick={() => handleSaveSparkCode(item.id)}
                            className="btn-sm bg-blue-600 hover:bg-blue-700 text-white text-2xs font-medium rounded transition shadow-2xs"
                          >
                            Lưu
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 pr-4 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-end gap-1.5">
                        {isOverdue && (
                          <>
                            <a 
                              href={`https://zalo.me/${item.kocPhone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded transition shadow-sm"
                            >
                              <MessageSquare className="w-3 h-3" /> Giục Zalo
                            </a>
                            <button 
                              onClick={() => handleMarkBlacklist(item.id)}
                              className="px-2 py-1 text-2xs font-medium bg-slate-100 hover:bg-rose-100 text-rose-700 rounded transition border border-rose-200"
                              title="Báo cáo bùng & đưa vào Blacklist"
                            >
                              Blacklist
                            </button>
                          </>
                        )}

                        {item.status === 'DELIVERING' && (
                          <button 
                            onClick={() => alert(`Tra cứu hành trình vận đơn ${item.trackingCode} trên cổng ${item.carrier}`)}
                            className="px-2.5 py-1 text-2xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition border border-slate-200"
                          >
                            Tra cứu
                          </button>
                        )}

                        {item.status === 'DELIVERED' && (
                          <a 
                            href={`https://zalo.me/${item.kocPhone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition border border-slate-200"
                          >
                            <MessageSquare className="w-3 h-3 text-blue-500" /> Nhắn Zalo
                          </a>
                        )}

                        {item.status === 'AIRED' && item.sparkAdsCode && (
                          <button 
                            onClick={() => alert(`Đã gửi thông báo bàn giao mã ${item.sparkAdsCode} sang Team Media (Zalo/Slack)`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition"
                          >
                            <Share2 className="w-3 h-3" /> Bàn giao Media
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
