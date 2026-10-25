'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ConfirmDialog,
  PageActions,
  Pagination,
  StatRow,
  Stat,
  Button,
  Modal,
  Field,
  Input,
  Select,
  Panel,
  FilterBar,
  Chips,
  Status,
  useFlipList,
} from '../ui';
import {
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Copy,
  ShieldAlert,
  Share2,
  Phone,
  MessageSquare,
  Check,
  Edit3,
} from 'lucide-react';
import { SampleShipment, BookingDealItem, UserProfile } from '@/lib/types';
import { MOCK_SAMPLE_SHIPMENTS } from '@/lib/mockData';

export interface SampleTrackerViewProps {
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  embedded?: boolean;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateDealWithSparkAds?: (dealCode: string, sparkCode: string) => void;
  onUpdateDeal?: (updatedDeal: BookingDealItem) => void;
}

export default function SampleTrackerView({
  deals = [],
  embedded = false,
  onNotify,
  onUpdateDealWithSparkAds,
  onUpdateDeal,
}: SampleTrackerViewProps = {}) {
  const [localShipments, setShipments] = useState<SampleShipment[]>(MOCK_SAMPLE_SHIPMENTS);
  const [shipmentOverrides, setShipmentOverrides] = useState<Record<string, Partial<SampleShipment>>>({});
  const [blacklistingItem, setBlacklistingItem] = useState<SampleShipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sparkCodeInput, setSparkCodeInput] = useState<{ [id: string]: string }>({});
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 30;

  // State cho hộp thoại Tạo / Cập nhật phiếu gửi mẫu & Mã Ads
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [shipmentForm, setShipmentForm] = useState<{
    dealCode: string;
    kocName: string;
    kocPhone: string;
    shippingAddress: string;
    brandName: string;
    productName: string;
    carrier: SampleShipment['carrier'];
    trackingCode: string;
    sentDate: string;
    deliveredDate: string;
    status: SampleShipment['status'];
    sparkAdsCode: string;
    sparkAdsExpiryDays: number;
    bookingPic: string;
  }>({
    dealCode: '',
    kocName: '',
    kocPhone: '0981.234.567',
    shippingAddress: 'Quận Cầu Giấy, Hà Nội',
    brandName: '',
    productName: '',
    carrier: 'GHN',
    trackingCode: '',
    sentDate: '18/10/2026',
    deliveredDate: '',
    status: 'DELIVERING',
    sparkAdsCode: '',
    sparkAdsExpiryDays: 60,
    bookingPic: 'Lê Phương Thảo',
  });

  // Đồng bộ 2 chiều giữa danh sách Deal Booking và Sổ vận đơn mẫu
  const shipments = useMemo(() => {
    const dealByCode = new Map<string, BookingDealItem>();
    for (const d of deals) {
      if (d.dealCode) {
        dealByCode.set(d.dealCode, d);
      }
    }

    const baseMerged: SampleShipment[] = localShipments.map((s) => {
      const matchedDeal = dealByCode.get(s.dealCode);
      const override = shipmentOverrides[s.id] || {};
      const resolvedSpark =
        override.sparkAdsCode !== undefined
          ? override.sparkAdsCode
          : matchedDeal?.sparkAdsCode || s.sparkAdsCode;
      const resolvedCarrier =
        override.carrier || matchedDeal?.sampleCarrier || s.carrier;
      const resolvedTracking =
        override.trackingCode || matchedDeal?.sampleTrackingCode || s.trackingCode;
      const resolvedDeliveredDate =
        override.deliveredDate !== undefined
          ? override.deliveredDate
          : matchedDeal?.sampleDeliveredDate ||
            (matchedDeal?.sampleStatus === 'ĐÃ_NHẬN' ? s.deliveredDate || '15/10/2026' : s.deliveredDate);

      let resolvedStatus: SampleShipment['status'] = override.status || s.status;
      if (!override.status && matchedDeal) {
        if (matchedDeal.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' || resolvedSpark) {
          resolvedStatus = 'AIRED';
        } else if (matchedDeal.sampleStatus === 'ĐÃ_NHẬN' && resolvedStatus === 'DELIVERING') {
          resolvedStatus = 'DELIVERED';
        }
      }

      return {
        ...s,
        ...override,
        carrier: resolvedCarrier,
        trackingCode: resolvedTracking,
        deliveredDate: resolvedDeliveredDate,
        status: resolvedStatus,
        sparkAdsCode: resolvedSpark,
        sparkAdsExpiryDays:
          override.sparkAdsExpiryDays || matchedDeal?.sparkAdsExpiryDays || s.sparkAdsExpiryDays || 60,
        isMediaHandedOff: Boolean(resolvedSpark),
      };
    });

    const existingCodes = new Set(baseMerged.map((s) => s.dealCode));
    const operationalDeals = deals.filter(
      (d) =>
        !existingCodes.has(d.dealCode) &&
        (!d.id.startsWith('deal-real-') || d.bookingBatch === '2026/10')
    );

    const dealShipments: SampleShipment[] = operationalDeals.map((d, idx) => {
      const shipId = `SMP-DEAL-${d.id || idx}`;
      const override = shipmentOverrides[shipId] || {};
      const isReceived = d.sampleStatus === 'ĐÃ_NHẬN';
      const hasAds = d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' || Boolean(d.sparkAdsCode);
      const defaultStatus: SampleShipment['status'] = hasAds
        ? 'AIRED'
        : isReceived
        ? 'DELIVERED'
        : (d.deliveryPendingDays || 0) > 5
        ? 'GHOST_WARNING'
        : 'DELIVERING';

      return {
        id: shipId,
        dealId: d.id,
        dealCode: d.dealCode,
        kocName: d.kocStageName,
        kocPhone: d.sampleRecipientPhone || '0981.xxx.xxx',
        shippingAddress: d.sampleShippingAddress || 'Địa chỉ nhận mẫu KOC đã xác nhận trên hệ thống',
        brandName: d.brandName,
        productName: d.productName || 'Sản phẩm chủ lực',
        carrier: d.sampleCarrier || 'GHN',
        trackingCode:
          d.sampleTrackingCode ||
          `GHN-${d.dealCode.replace(/[^0-9]/g, '').slice(-8) || String(10000000 + idx)}`,
        sentDate: d.sampleSentDate || '12/10/2026',
        deliveredDate: d.sampleDeliveredDate || (isReceived ? '15/10/2026' : undefined),
        status: defaultStatus,
        daysSinceDelivered: isReceived ? 2 : (d.deliveryPendingDays || 0),
        demoDeadlineDays: 5,
        sparkAdsCode: d.sparkAdsCode,
        sparkAdsExpiryDays: d.sparkAdsExpiryDays || 60,
        isMediaHandedOff: Boolean(d.sparkAdsCode),
        bookingPic: d.bookingPic || d.assignedStaff || 'Lê Phương Thảo',
        notes: `Liên kết từ Deal Booking ${d.dealCode} · ${d.storeName || d.brandName}`,
        ...override,
      };
    });

    return [...baseMerged, ...dealShipments];
  }, [localShipments, deals, shipmentOverrides]);

  const brands = useMemo(
    () => Array.from(new Set(shipments.map((s) => s.brandName).filter(Boolean))).sort(),
    [shipments]
  );

  // KPI counts
  const { totalSent, deliveringCount, deliveredCount, ghostAlertCount, airedCount } = useMemo(() => {
    let delivering = 0;
    let delivered = 0;
    let ghost = 0;
    let aired = 0;
    for (const s of shipments) {
      if (s.status === 'DELIVERING') delivering++;
      else if (s.status === 'DELIVERED' || s.status === 'DEMO_SUBMITTED') delivered++;
      else if (s.status === 'GHOST_WARNING') ghost++;
      else if (s.status === 'AIRED') aired++;
    }
    return {
      totalSent: shipments.length,
      deliveringCount: delivering,
      deliveredCount: delivered,
      ghostAlertCount: ghost,
      airedCount: aired,
    };
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      const matchSearch =
        !q ||
        s.kocName.toLowerCase().includes(q) ||
        s.trackingCode.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.dealCode.toLowerCase().includes(q) ||
        (s.sparkAdsCode ? s.sparkAdsCode.toLowerCase().includes(q) : false);
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchBrand = selectedBrand === 'ALL' || s.brandName === selectedBrand;
      return matchSearch && matchStatus && matchBrand;
    });
  }, [shipments, searchQuery, statusFilter, selectedBrand]);

  const filterKey = `${searchQuery}|${statusFilter}|${selectedBrand}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const pagedShipments = useMemo(
    () => filteredShipments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredShipments, page]
  );

  const shipmentsBodyRef = useRef<HTMLTableSectionElement>(null);
  useFlipList(shipmentsBodyRef, pagedShipments.map((s) => s.id).join('|'));

  const syncShipmentToParentDeal = (targetDealCode: string, patch: Partial<BookingDealItem>) => {
    if (!onUpdateDeal) return;
    const foundDeal = deals.find((d) => d.dealCode === targetDealCode);
    if (foundDeal) {
      onUpdateDeal({
        ...foundDeal,
        ...patch,
      });
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDelivered = (item: SampleShipment) => {
    const todayStr = '20/10/2026';
    setShipmentOverrides((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || {}),
        status: 'DELIVERED',
        deliveredDate: todayStr,
        daysSinceDelivered: 0,
      },
    }));
    syncShipmentToParentDeal(item.dealCode, {
      sampleStatus: 'ĐÃ_NHẬN',
      sampleDeliveredDate: todayStr,
      sampleCarrier: item.carrier,
      sampleTrackingCode: item.trackingCode,
      currentStage: '3_CONTENT_SCRIPT',
      pipelineText: 'Kịch bản',
    });
    onNotify?.(`Đã xác nhận KOC ${item.kocName} nhận hàng mẫu (${item.dealCode})`, 'success');
  };

  const handleSaveSparkCode = (id: string) => {
    const code = (sparkCodeInput[id] || '').trim();
    if (!code) return;
    const targetItem = shipments.find((s) => s.id === id);
    setShipmentOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        sparkAdsCode: code,
        sparkAdsExpiryDays: 60,
        isMediaHandedOff: true,
        status: 'AIRED',
      },
    }));

    if (targetItem) {
      if (onUpdateDealWithSparkAds) {
        onUpdateDealWithSparkAds(targetItem.dealCode, code);
      }
      syncShipmentToParentDeal(targetItem.dealCode, {
        adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
        sparkAdsCode: code,
        sparkAdsExpiryDays: 60,
        growthHandoffStatus: 'ĐÃ_GIAO_MÃ_ADS',
        currentStage: '4_AIR_GROWTH',
        pipelineText: 'Bàn giao Growth Ads',
      });
    }
    if (onNotify) {
      onNotify(
        `Đã lưu mã Spark Ads [${code}] cho booking ${targetItem?.dealCode || id} và bàn giao cho Growth/Media`,
        'success'
      );
    }
  };

  const handleOpenCreateShipmentModal = () => {
    const firstDeal = deals.find((d) => !d.id.startsWith('deal-real-')) || deals[0];
    setEditingShipmentId(null);
    setShipmentForm({
      dealCode: firstDeal?.dealCode || `BO26_${Date.now().toString().slice(-6)}`,
      kocName: firstDeal?.kocStageName || '',
      kocPhone: firstDeal?.sampleRecipientPhone || '0981.234.567',
      shippingAddress: firstDeal?.sampleShippingAddress || 'Quận Cầu Giấy, Hà Nội',
      brandName: firstDeal?.brandName || brands[0] || 'Kutieskin Mama',
      productName: firstDeal?.productName || 'Sản phẩm chiến dịch tháng 10',
      carrier: firstDeal?.sampleCarrier || 'GHN',
      trackingCode: firstDeal?.sampleTrackingCode || `GHN-${Date.now().toString().slice(-8)}`,
      sentDate: '20/10/2026',
      deliveredDate: '',
      status: 'DELIVERING',
      sparkAdsCode: firstDeal?.sparkAdsCode || '',
      sparkAdsExpiryDays: firstDeal?.sparkAdsExpiryDays || 60,
      bookingPic: firstDeal?.bookingPic || firstDeal?.assignedStaff || 'Lê Phương Thảo',
    });
    setIsShipmentModalOpen(true);
  };

  const handleOpenEditShipmentModal = (item: SampleShipment) => {
    setEditingShipmentId(item.id);
    setShipmentForm({
      dealCode: item.dealCode,
      kocName: item.kocName,
      kocPhone: item.kocPhone,
      shippingAddress: item.shippingAddress,
      brandName: item.brandName,
      productName: item.productName,
      carrier: item.carrier,
      trackingCode: item.trackingCode,
      sentDate: item.sentDate,
      deliveredDate: item.deliveredDate || '',
      status: item.status,
      sparkAdsCode: item.sparkAdsCode || '',
      sparkAdsExpiryDays: item.sparkAdsExpiryDays || 60,
      bookingPic: item.bookingPic,
    });
    setIsShipmentModalOpen(true);
  };

  const handleSaveShipmentModal = () => {
    const cleanSpark = shipmentForm.sparkAdsCode.trim();
    const nextStatus: SampleShipment['status'] = cleanSpark
      ? 'AIRED'
      : shipmentForm.deliveredDate && shipmentForm.status === 'DELIVERING'
      ? 'DELIVERED'
      : shipmentForm.status;

    if (editingShipmentId) {
      setShipmentOverrides((prev) => ({
        ...prev,
        [editingShipmentId]: {
          dealCode: shipmentForm.dealCode,
          kocName: shipmentForm.kocName,
          kocPhone: shipmentForm.kocPhone,
          shippingAddress: shipmentForm.shippingAddress,
          brandName: shipmentForm.brandName,
          productName: shipmentForm.productName,
          carrier: shipmentForm.carrier,
          trackingCode: shipmentForm.trackingCode,
          sentDate: shipmentForm.sentDate,
          deliveredDate: shipmentForm.deliveredDate || undefined,
          status: nextStatus,
          sparkAdsCode: cleanSpark || undefined,
          sparkAdsExpiryDays: shipmentForm.sparkAdsExpiryDays,
          isMediaHandedOff: Boolean(cleanSpark),
          bookingPic: shipmentForm.bookingPic,
        },
      }));
    } else {
      const created: SampleShipment = {
        id: `SMP-${Date.now()}`,
        dealCode: shipmentForm.dealCode,
        kocName: shipmentForm.kocName || 'KOC mới',
        kocPhone: shipmentForm.kocPhone,
        shippingAddress: shipmentForm.shippingAddress,
        brandName: shipmentForm.brandName || 'Kutieskin Mama',
        productName: shipmentForm.productName || 'Sản phẩm mẫu',
        carrier: shipmentForm.carrier,
        trackingCode: shipmentForm.trackingCode || `GHN-${Date.now().toString().slice(-8)}`,
        sentDate: shipmentForm.sentDate || '20/10/2026',
        deliveredDate: shipmentForm.deliveredDate || undefined,
        status: nextStatus,
        daysSinceDelivered: shipmentForm.deliveredDate ? 1 : 0,
        demoDeadlineDays: 5,
        sparkAdsCode: cleanSpark || undefined,
        sparkAdsExpiryDays: shipmentForm.sparkAdsExpiryDays,
        isMediaHandedOff: Boolean(cleanSpark),
        bookingPic: shipmentForm.bookingPic,
      };
      setShipments((prev) => [created, ...prev]);
    }

    // Đồng bộ ngược về Deal trong Pipeline Booking (Bước 3 & Bước 4)
    syncShipmentToParentDeal(shipmentForm.dealCode, {
      sampleStatus:
        nextStatus === 'DELIVERED' || nextStatus === 'DEMO_SUBMITTED' || nextStatus === 'AIRED'
          ? 'ĐÃ_NHẬN'
          : 'ĐANG_GIAO',
      sampleCarrier: shipmentForm.carrier,
      sampleTrackingCode: shipmentForm.trackingCode,
      sampleSentDate: shipmentForm.sentDate,
      sampleDeliveredDate: shipmentForm.deliveredDate || undefined,
      sampleRecipientPhone: shipmentForm.kocPhone,
      sampleShippingAddress: shipmentForm.shippingAddress,
      ...(cleanSpark
        ? {
            sparkAdsCode: cleanSpark,
            sparkAdsExpiryDays: shipmentForm.sparkAdsExpiryDays,
            adsCodeStatus: 'ĐÃ_NGHIỆM_THU' as const,
            growthHandoffStatus: 'ĐÃ_GIAO_MÃ_ADS' as const,
            currentStage: '4_AIR_GROWTH' as const,
          }
        : {}),
    });

    if (cleanSpark && onUpdateDealWithSparkAds) {
      onUpdateDealWithSparkAds(shipmentForm.dealCode, cleanSpark);
    }

    setIsShipmentModalOpen(false);
    onNotify?.(
      editingShipmentId
        ? `Đã cập nhật vận đơn & mã Ads cho booking ${shipmentForm.dealCode}`
        : `Đã tạo phiếu gửi mẫu ${shipmentForm.trackingCode} cho booking ${shipmentForm.dealCode}`,
      'success'
    );
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <PageActions>
          <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateShipmentModal}>
            Tạo phiếu gửi mẫu
          </Button>
        </PageActions>
      )}

      <StatRow>
        <Stat label="Tổng đơn mẫu Booking" value={totalSent} />
        <Stat label="Đang vận chuyển (B3)" value={deliveringCount} tone="warning" />
        <Stat
          label="Cảnh báo quá hạn 5 ngày"
          value={ghostAlertCount}
          tone={ghostAlertCount > 0 ? 'critical' : undefined}
        />
        <Stat label="Đã lên sóng & có mã Ads (B4)" value={airedCount} tone="positive" />
      </StatRow>

      <Panel
        flush
        title="Sổ Vận đơn Hàng mẫu (Bước 3) & Bàn giao Mã Spark Ads (Bước 4)"
        actions={
          <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateShipmentModal}>
            Tạo phiếu gửi mẫu
          </Button>
        }
      >
        <div className="px-4 py-3 border-b border-line">
          <FilterBar
            search={{
              value: searchQuery,
              onChange: setSearchQuery,
              placeholder: 'Tìm KOC, mã BO, mã vận đơn, sản phẩm, mã Spark Ads...',
            }}
            resultCount={filteredShipments.length}
            filters={
              <Select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full sm:w-auto sm:min-w-[180px]"
                aria-label="Lọc theo nhãn hàng"
              >
                <option value="ALL">Tất cả nhãn hàng</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            }
            chips={
              <Chips
                value={statusFilter}
                onChange={setStatusFilter}
                items={[
                  { key: 'ALL', label: 'Tất cả', count: totalSent },
                  { key: 'DELIVERING', label: 'Đang giao mẫu', count: deliveringCount },
                  { key: 'DELIVERED', label: 'Đã nhận mẫu', count: deliveredCount },
                  { key: 'GHOST_WARNING', label: 'Quá hạn 5 ngày', count: ghostAlertCount },
                  { key: 'AIRED', label: 'Đã có mã Ads', count: airedCount },
                ]}
              />
            }
          />
        </div>

        {/* Main Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs border-collapse">
            <thead className="bg-canvas border-b border-line text-ink-2 font-semibold text-2xs">
              <tr>
                <th className="py-2.5 px-3 w-[18%]">KOC &amp; Mã Booking</th>
                <th className="py-2.5 px-3 w-[22%]">Nhãn hàng &amp; Sản phẩm mẫu</th>
                <th className="py-2.5 px-3 w-[20%]">Vận đơn &amp; Trạng thái (Bước 3)</th>
                <th className="py-2.5 px-2.5 w-[14%]">SLA nộp bản nháp</th>
                <th className="py-2.5 px-2.5 w-[14%]">Mã Spark Ads (Bước 4)</th>
                <th className="py-2.5 px-3 text-right w-[12%]">Thao tác</th>
              </tr>
            </thead>
            <tbody ref={shipmentsBodyRef} className="divide-y divide-line">
              {pagedShipments.map((item) => {
                const isOverdue = item.status === 'GHOST_WARNING';

                return (
                  <tr
                    key={item.id}
                    data-flip={item.id}
                    className={`hover:bg-sunken/40 transition ${isOverdue ? 'bg-critical-soft/20' : ''}`}
                  >
                    {/* KOC Info */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-ink">{item.kocName}</div>
                      <div className="text-2xs text-ink-3 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-ink-3" />
                        <span>{item.kocPhone}</span>
                      </div>
                      <div className="text-2xs text-accent font-code mt-0.5">{item.dealCode}</div>
                    </td>

                    {/* Product & Brand */}
                    <td className="py-2.5 px-3">
                      <span className="block text-2xs font-medium text-ink-3 mb-0.5">
                        {item.brandName}
                      </span>
                      <div
                        className="font-medium text-ink line-clamp-1 max-w-[210px]"
                        title={item.productName}
                      >
                        {item.productName}
                      </div>
                      <div
                        className="text-2xs text-ink-3 line-clamp-1 max-w-[210px]"
                        title={item.shippingAddress}
                      >
                        {item.shippingAddress}
                      </div>
                    </td>

                    {/* Tracking Code */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-code font-medium text-ink">{item.trackingCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.trackingCode, item.id)}
                          className="text-ink-3 hover:text-ink p-0.5"
                          title="Sao chép mã vận đơn"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-positive" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-ink-2">{item.carrier}</span>
                        <span>• Gửi: {item.sentDate}</span>
                      </div>

                      <div className="mt-1.5">
                        {item.status === 'DELIVERING' && (
                          <Status tone="info">
                            <Truck className="w-3 h-3 inline mr-1" />
                            Đang giao hàng
                          </Status>
                        )}
                        {item.status === 'DELIVERED' && (
                          <Status tone="positive">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Đã nhận {item.deliveredDate}
                          </Status>
                        )}
                        {item.status === 'GHOST_WARNING' && (
                          <Status tone="critical">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Quá hạn 5 ngày
                          </Status>
                        )}
                        {item.status === 'DEMO_SUBMITTED' && (
                          <Status tone="info">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Đã nộp bản nháp
                          </Status>
                        )}
                        {item.status === 'AIRED' && (
                          <Status tone="positive">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Đã lên sóng
                          </Status>
                        )}
                        {item.status === 'BLACKLISTED' && (
                          <Status tone="critical">
                            <ShieldAlert className="w-3 h-3 inline mr-1" />
                            Hạn chế hợp tác
                          </Status>
                        )}
                      </div>
                    </td>

                    {/* SLA Demo Countdown */}
                    <td className="py-2.5 px-2.5">
                      {item.deliveredDate ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink-3">Nhận:</span>
                            <span className="text-ink font-semibold">{item.deliveredDate}</span>
                          </div>
                          <div
                            className={`text-2xs font-medium mt-1 ${
                              isOverdue ? 'text-critical font-semibold' : 'text-ink-2'
                            }`}
                          >
                            {item.status === 'AIRED' ? (
                              <span className="text-positive">Đã hoàn thành đúng hạn</span>
                            ) : item.status === 'GHOST_WARNING' ? (
                              <span>
                                Đã qua {item.daysSinceDelivered}d · Quá hạn{' '}
                                {Math.max(1, item.daysSinceDelivered - item.demoDeadlineDays)}d
                              </span>
                            ) : (
                              <span>
                                Đã qua {item.daysSinceDelivered}d · Còn{' '}
                                {Math.max(0, item.demoDeadlineDays - item.daysSinceDelivered)}d
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-ink-3">Chưa giao tới KOC</div>
                      )}
                      <div className="text-2xs text-ink-3 mt-1">PIC: {item.bookingPic}</div>
                    </td>

                    {/* Spark Ads Code */}
                    <td className="py-2.5 px-2.5">
                      {item.sparkAdsCode ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-code text-2xs">
                            <span className="font-medium text-ink">{item.sparkAdsCode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.sparkAdsCode!, `spark-${item.id}`)}
                              className="text-ink-3 hover:text-ink ml-auto"
                              title="Sao chép mã Spark Ads"
                            >
                              {copiedId === `spark-${item.id}` ? (
                                <Check className="w-3 h-3 text-positive" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-2xs text-ink-3 mt-1">
                            <span>Hạn: {item.sparkAdsExpiryDays || 60} ngày</span>
                            {item.isMediaHandedOff ? (
                              <span className="text-positive font-semibold">Đã giao Growth</span>
                            ) : (
                              <span className="text-warning font-medium">Chờ giao Growth</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Nhập mã Spark Ads..."
                            value={sparkCodeInput[item.id] || ''}
                            onChange={(e) =>
                              setSparkCodeInput({ ...sparkCodeInput, [item.id]: e.target.value })
                            }
                            className="w-28 px-2 py-1 text-2xs bg-surface border border-line rounded focus:outline-none focus:border-accent font-code"
                          />
                          <Button size="sm" onClick={() => handleSaveSparkCode(item.id)}>
                            Lưu
                          </Button>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right sticky right-0 bg-surface group-hover:bg-canvas border-l border-line">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'DELIVERING' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Check}
                            onClick={() => handleConfirmDelivered(item)}
                            title="Xác nhận KOC đã nhận hàng mẫu"
                          >
                            Đã nhận
                          </Button>
                        )}

                        {isOverdue && (
                          <>
                            <a
                              href={`https://zalo.me/${item.kocPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium bg-critical text-white rounded transition"
                            >
                              <MessageSquare className="w-3 h-3" /> Giục Zalo
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setBlacklistingItem(item)}
                              title="Đưa vào danh sách hạn chế hợp tác"
                            >
                              Hạn chế
                            </Button>
                          </>
                        )}

                        {item.status === 'AIRED' && item.sparkAdsCode && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Share2}
                            onClick={() =>
                              onNotify?.(
                                `Đã gửi thông báo bàn giao mã Spark Ads [${item.sparkAdsCode}] sang bộ phận Growth/Media`,
                                'success'
                              )
                            }
                            title="Bàn giao mã Ads sang Growth/Media"
                          />
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit3}
                          onClick={() => handleOpenEditShipmentModal(item)}
                          title="Cập nhật vận đơn & mã Spark Ads"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filteredShipments.length}
          onPageChange={setPage}
        />
      </Panel>

      {/* Hộp thoại Tạo / Cập nhật phiếu gửi mẫu & Mã Spark Ads */}
      <Modal
        open={isShipmentModalOpen}
        onClose={() => setIsShipmentModalOpen(false)}
        title={
          editingShipmentId
            ? `Cập nhật vận đơn & Mã Ads · ${shipmentForm.dealCode}`
            : 'Tạo phiếu gửi mẫu cho Deal Booking'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsShipmentModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" icon={Check} onClick={handleSaveShipmentModal}>
              Lưu cập nhật
            </Button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Mã Deal Booking (BO)" htmlFor="ship-deal-code">
            {!editingShipmentId && deals.length > 0 ? (
              <Select
                id="ship-deal-code"
                value={shipmentForm.dealCode}
                onChange={(e) => {
                  const code = e.target.value;
                  const found = deals.find((d) => d.dealCode === code);
                  setShipmentForm((prev) => ({
                    ...prev,
                    dealCode: code,
                    kocName: found?.kocStageName || prev.kocName,
                    brandName: found?.brandName || prev.brandName,
                    productName: found?.productName || prev.productName,
                    bookingPic: found?.bookingPic || found?.assignedStaff || prev.bookingPic,
                    sparkAdsCode: found?.sparkAdsCode || prev.sparkAdsCode,
                  }));
                }}
              >
                {deals.slice(0, 60).map((d) => (
                  <option key={d.id} value={d.dealCode}>
                    {d.dealCode} · {d.kocStageName} ({d.brandName})
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="ship-deal-code"
                className="font-code"
                value={shipmentForm.dealCode}
                onChange={(e) => setShipmentForm((prev) => ({ ...prev, dealCode: e.target.value }))}
              />
            )}
          </Field>
          <Field label="KOC nhận mẫu" htmlFor="ship-koc-name">
            <Input
              id="ship-koc-name"
              value={shipmentForm.kocName}
              onChange={(e) => setShipmentForm((prev) => ({ ...prev, kocName: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nhãn hàng" htmlFor="ship-brand">
            <Input
              id="ship-brand"
              value={shipmentForm.brandName}
              onChange={(e) => setShipmentForm((prev) => ({ ...prev, brandName: e.target.value }))}
            />
          </Field>
          <Field label="Sản phẩm gửi mẫu" htmlFor="ship-product">
            <Input
              id="ship-product"
              value={shipmentForm.productName}
              onChange={(e) => setShipmentForm((prev) => ({ ...prev, productName: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Số điện thoại KOC" htmlFor="ship-phone">
            <Input
              id="ship-phone"
              value={shipmentForm.kocPhone}
              onChange={(e) => setShipmentForm((prev) => ({ ...prev, kocPhone: e.target.value }))}
            />
          </Field>
          <Field label="Địa chỉ nhận mẫu" htmlFor="ship-address">
            <Input
              id="ship-address"
              value={shipmentForm.shippingAddress}
              onChange={(e) =>
                setShipmentForm((prev) => ({ ...prev, shippingAddress: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Đơn vị vận chuyển" htmlFor="ship-carrier">
            <Select
              id="ship-carrier"
              value={shipmentForm.carrier}
              onChange={(e) =>
                setShipmentForm((prev) => ({
                  ...prev,
                  carrier: e.target.value as SampleShipment['carrier'],
                }))
              }
            >
              <option value="GHN">Giao Hàng Nhanh (GHN)</option>
              <option value="ViettelPost">Viettel Post</option>
              <option value="J&T">J&amp;T Express</option>
              <option value="ShopeeExpress">SPX Express</option>
            </Select>
          </Field>
          <Field label="Mã vận đơn" htmlFor="ship-tracking">
            <Input
              id="ship-tracking"
              className="font-code"
              value={shipmentForm.trackingCode}
              onChange={(e) =>
                setShipmentForm((prev) => ({ ...prev, trackingCode: e.target.value }))
              }
            />
          </Field>
          <Field label="Trạng thái vận đơn" htmlFor="ship-status">
            <Select
              id="ship-status"
              value={shipmentForm.status}
              onChange={(e) =>
                setShipmentForm((prev) => ({
                  ...prev,
                  status: e.target.value as SampleShipment['status'],
                }))
              }
            >
              <option value="DELIVERING">Đang vận chuyển</option>
              <option value="DELIVERED">KOC đã nhận mẫu</option>
              <option value="DEMO_SUBMITTED">Đã nộp bản nháp</option>
              <option value="AIRED">Đã lên sóng &amp; có mã Ads</option>
              <option value="GHOST_WARNING">Quá hạn 5 ngày</option>
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Ngày gửi mẫu" htmlFor="ship-sent-date">
            <Input
              id="ship-sent-date"
              value={shipmentForm.sentDate}
              onChange={(e) => setShipmentForm((prev) => ({ ...prev, sentDate: e.target.value }))}
              placeholder="DD/MM/YYYY"
            />
          </Field>
          <Field label="Ngày KOC nhận mẫu" htmlFor="ship-delivered-date">
            <Input
              id="ship-delivered-date"
              value={shipmentForm.deliveredDate}
              onChange={(e) =>
                setShipmentForm((prev) => ({ ...prev, deliveredDate: e.target.value }))
              }
              placeholder="DD/MM/YYYY (Để trống nếu đang giao)"
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-line">
          <Field label="Mã TikTok Spark Ads (Bước 4)" htmlFor="ship-spark-code">
            <Input
              id="ship-spark-code"
              className="font-code"
              value={shipmentForm.sparkAdsCode}
              onChange={(e) =>
                setShipmentForm((prev) => ({ ...prev, sparkAdsCode: e.target.value }))
              }
              placeholder="SPARK-TT-..."
            />
          </Field>
          <Field label="Thời hạn ủy quyền mã Ads" htmlFor="ship-spark-expiry">
            <Select
              id="ship-spark-expiry"
              value={String(shipmentForm.sparkAdsExpiryDays)}
              onChange={(e) =>
                setShipmentForm((prev) => ({
                  ...prev,
                  sparkAdsExpiryDays: Number(e.target.value) || 60,
                }))
              }
            >
              <option value="30">30 ngày</option>
              <option value="60">60 ngày (Chuẩn)</option>
              <option value="90">90 ngày</option>
              <option value="365">365 ngày</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Confirm Hạn chế hợp tác KOC Dialog */}
      <ConfirmDialog
        open={Boolean(blacklistingItem)}
        onCancel={() => setBlacklistingItem(null)}
        title="Xác nhận đưa KOC vào danh sách hạn chế hợp tác"
        message={`Đưa KOC "${blacklistingItem?.kocName}" vào danh sách hạn chế hợp tác? Thông tin quá hạn nộp video sẽ được cảnh báo nội bộ và tạm dừng gửi mẫu ở các chiến dịch kế tiếp.`}
        confirmLabel="Xác nhận hạn chế"
        cancelLabel="Hủy"
        tone="danger"
        onConfirm={() => {
          if (blacklistingItem) {
            setShipmentOverrides((prev) => ({
              ...prev,
              [blacklistingItem.id]: {
                ...(prev[blacklistingItem.id] || {}),
                status: 'BLACKLISTED',
                notes: 'Đã đưa vào danh sách hạn chế hợp tác vì nhận mẫu quá hạn không trả video.',
              },
            }));
            onNotify?.(
              `Đã đưa KOC ${blacklistingItem.kocName} vào danh sách hạn chế hợp tác`,
              'warning'
            );
            setBlacklistingItem(null);
          }
        }}
      />
    </div>
  );
}
