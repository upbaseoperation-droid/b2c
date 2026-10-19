'use client';

import React, { useState, useMemo, useRef } from 'react';
import { ConfirmDialog, PageActions, StatRow, Stat, Button, useFlipList } from '../ui';
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  Copy, 
  ShieldAlert, 
  Share2, 
  Phone, 
  MessageSquare,
  Check
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
  onNotify,
  onUpdateDealWithSparkAds
}: SampleTrackerViewProps = {}) {
  const [localShipments, setShipments] = useState<SampleShipment[]>(MOCK_SAMPLE_SHIPMENTS);
  const [blacklistingItem, setBlacklistingItem] = useState<SampleShipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sparkCodeInput, setSparkCodeInput] = useState<{ [id: string]: string }>({});

  // Đồng bộ các deal từ Booking sang danh sách vận đơn mẫu nếu chưa có
  const shipments = useMemo(() => {
    const existingCodes = new Set(localShipments.map(s => s.dealCode));
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
        trackingCode: `GHN-${d.dealCode.replace(/[^0-9]/g, '') || String(10000000 + idx)}`,
        sentDate: '01/10/2026',
        deliveredDate: d.sampleStatus === 'ĐÃ_NHẬN' ? '03/10/2026' : undefined,
        status: (d.sampleStatus === 'ĐÃ_NHẬN' ? 'DELIVERED' : d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' ? 'AIRED' : 'DELIVERING') as SampleShipment['status'],
        daysSinceDelivered: d.sampleStatus === 'ĐÃ_NHẬN' ? 2 : 0,
        demoDeadlineDays: 5,
        sparkAdsCode: d.sparkAdsCode,
        isMediaHandedOff: !!d.sparkAdsCode,
        bookingPic: d.assignedStaff || 'Khánh Vy',
        notes: `Tự động liên kết từ Deal Booking ${d.dealCode} - ${d.campaignTitle}`
      }));

    return [...localShipments, ...dealShipments];
  }, [localShipments, deals]);

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
  const shipmentsBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(shipmentsBodyRef, filteredShipments.map(s => s.id).join('|'));

  // KPI counts
  const totalSent = shipments.length;
  const deliveringCount = shipments.filter(s => s.status === 'DELIVERING').length;
  const ghostAlertCount = shipments.filter(s => s.status === 'GHOST_WARNING').length;
  const airedCount = shipments.filter(s => s.status === 'AIRED').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSparkCode = (id: string) => {
    const code = sparkCodeInput[id];
    if (!code) return;
    const targetItem = shipments.find(s => s.id === id);
    setShipments(shipments.map(item => {
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

  const handleMarkBlacklist = (item: SampleShipment) => {
    setBlacklistingItem(item);
  };

  return (
    <div className="space-y-4">
      <PageActions>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => onNotify?.('Tính năng tạo phiếu xuất kho gửi mẫu đang được kết nối với hệ thống kho UpBase', 'info')}
        >
          Tạo phiếu gửi mẫu
        </Button>
      </PageActions>

      <StatRow>
        <Stat label="Tổng đơn mẫu" value={totalSent} />
        <Stat label="Đang vận chuyển" value={deliveringCount} tone="warning" />
        <Stat label="Cảnh báo quá hạn" value={ghostAlertCount} tone={ghostAlertCount > 0 ? 'critical' : undefined} />
        <Stat label="Đã lên sóng & có mã Ads" value={airedCount} tone="positive" />
      </StatRow>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-md shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm KOC, mã vận đơn..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Nhãn hàng:</span>
          </div>
          <select 
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">Tất cả nhãn hàng</option>
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
            <option value="DELIVERED">Đã nhận trong hạn</option>
            <option value="GHOST_WARNING">Cảnh báo quá hạn 5 ngày</option>
            <option value="DEMO_SUBMITTED">Đã nộp bản nháp</option>
            <option value="AIRED">Đã lên sóng & có mã Ads</option>
            <option value="BLACKLISTED">Hạn chế hợp tác</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs border-collapse">
            <thead className="bg-canvas border-b border-line text-ink-2 font-semibold text-2xs">
              <tr>
                <th className="py-2 px-2.5 w-[18%]">KOC &amp; mã hồ sơ</th>
                <th className="py-2 px-2.5 w-[22%]">Sản phẩm &amp; nhãn hàng</th>
                <th className="py-2 px-2.5 w-[20%]">Vận đơn &amp; trạng thái</th>
                <th className="py-2 px-2 w-[14%]">Thời hạn bản nháp</th>
                <th className="py-2 px-2 w-[14%]">Mã TikTok Spark Ads</th>
                <th className="py-2 px-2.5 pr-3 text-right w-[12%]">Xử lý &amp; hành động</th>
              </tr>
            </thead>
            <tbody ref={shipmentsBodyRef} className="divide-y divide-slate-100">
              {filteredShipments.map(item => {
                const isOverdue = item.status === 'GHOST_WARNING';

                return (
                  <tr key={item.id} data-flip={item.id} className={`hover:bg-slate-50/70 transition ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                    {/* KOC Info */}
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-slate-900">{item.kocName}</div>
                      <div className="text-2xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.kocPhone}</span>
                      </div>
                      <div className="text-2xs text-slate-400 font-mono mt-0.5">{item.dealCode}</div>
                    </td>

                    {/* Product & Brand */}
                    <td className="py-2 px-2.5">
                      <span className="block text-2xs font-medium text-ink-3 mb-0.5">
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
                    <td className="py-2 px-2.5">
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
                            <CheckCircle2 className="w-3 h-3" /> Đã nhận ngày {item.deliveredDate}
                          </span>
                        )}
                        {item.status === 'GHOST_WARNING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 rounded">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Cảnh báo quá hạn 5 ngày
                          </span>
                        )}
                        {item.status === 'DEMO_SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-accent-soft text-accent border border-line rounded">
                            <Clock className="w-3 h-3" /> Đã nộp bản nháp
                          </span>
                        )}
                        {item.status === 'AIRED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã lên sóng
                          </span>
                        )}
                        {item.status === 'BLACKLISTED' && (
                          <span className="badge-rose inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold">
                            <ShieldAlert className="w-3 h-3" /> Hạn chế hợp tác
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SLA Demo Countdown */}
                    <td className="py-2 px-2.5">
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
                              <span>Đã qua {item.daysSinceDelivered} ngày · Quá hạn {item.daysSinceDelivered - item.demoDeadlineDays} ngày</span>
                            ) : (
                              <span>Đã qua {item.daysSinceDelivered} ngày · Còn {item.demoDeadlineDays - item.daysSinceDelivered} ngày</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Chưa giao tới KOC</div>
                      )}
                      <div className="text-2xs text-slate-400 mt-1">Phụ trách: {item.bookingPic}</div>
                    </td>

                    {/* Spark Ads Code */}
                    <td className="py-3 px-3">
                      {item.sparkAdsCode ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-code text-2xs">
                            <span className="font-medium text-ink">{item.sparkAdsCode}</span>
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
                              onClick={() => handleMarkBlacklist(item)}
                              className="px-2 py-1 text-2xs font-medium bg-slate-100 hover:bg-rose-100 text-rose-700 rounded transition border border-rose-200"
                              title="Báo cáo quá hạn & hạn chế hợp tác"
                            >
                              Hạn chế hợp tác
                            </button>
                          </>
                        )}

                        {item.status === 'DELIVERING' && (
                          <button 
                            onClick={() => onNotify?.(`Mở hành trình vận đơn ${item.trackingCode} - ${item.carrier}`, 'info')}
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
                            onClick={() => onNotify?.(`Đã gửi thông báo bàn giao mã Spark Ads [${item.sparkAdsCode}] sang bộ phận Media`, 'success')}
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

      {/* Confirm Hạn chế hợp tác KOC Dialog */}
      <ConfirmDialog
        open={Boolean(blacklistingItem)}
        onOpenChange={(open) => !open && setBlacklistingItem(null)}
        title="Xác nhận đưa KOC vào danh sách hạn chế hợp tác"
        description={`Bạn có chắc chắn muốn đưa KOC "${blacklistingItem?.kocName}" vào danh sách hạn chế hợp tác? Thông tin quá hạn nộp video sẽ được cảnh báo nội bộ và tạm dừng gửi mẫu ở các chiến dịch kế tiếp.`}
        confirmLabel="Xác nhận hạn chế"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          if (blacklistingItem) {
            setShipments(shipments.map(item => item.id === blacklistingItem.id ? {
              ...item,
              status: 'BLACKLISTED',
              notes: 'Đã đưa vào danh sách hạn chế hợp tác vì nhận mẫu quá hạn không trả video.'
            } : item));
            onNotify?.(`Đã đưa KOC ${blacklistingItem.kocName} vào danh sách hạn chế hợp tác`, 'warning');
            setBlacklistingItem(null);
          }
        }}
      />
    </div>
  );
}
