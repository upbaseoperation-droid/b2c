'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  FileText,
  FileCheck,
  Video,
  Send,
  Building2,
  ShoppingBag,
  Eye,
  CreditCard,
  ShieldCheck,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Phone,
} from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import {
  buildBookingDealFromApprovedItem,
  type ApprovedBookingListItem,
} from '../../lib/approvedBookingList';
import { Button, Status } from '../ui';

export interface DealDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deal: ApprovedBookingListItem | null;
  allDeals?: ApprovedBookingListItem[];
  onSelectDeal?: (deal: ApprovedBookingListItem) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onOpenAcceptanceModal?: (item: ApprovedBookingListItem) => void;
  onOpenLarkPaymentModal?: (item: ApprovedBookingListItem) => void;
  onOpenDealBuilderModal?: (item: ApprovedBookingListItem) => void;
  onOpenTikTokInspector?: (item: ApprovedBookingListItem) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const DealDetailDrawer: React.FC<DealDetailDrawerProps> = ({
  isOpen,
  onClose,
  deal,
  allDeals = [],
  onSelectDeal,
  onOpenContractForDeal,
  onOpenAcceptanceModal,
  onOpenLarkPaymentModal,
  onOpenDealBuilderModal,
  onOpenTikTokInspector,
  onNotify,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullCccd, setShowFullCccd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE' | 'PAYMENT'>('OVERVIEW');

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copy helper with visual feedback
  const handleCopy = (text: string, fieldName: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      onNotify?.(`Đã sao chép ${label}: ${text}`, 'success');
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const currentIndex = useMemo(() => {
    if (!deal || allDeals.length === 0) return -1;
    return allDeals.findIndex((d) => d.id === deal.id);
  }, [deal, allDeals]);

  const prevDeal = currentIndex > 0 ? allDeals[currentIndex - 1] : null;
  const nextDeal = currentIndex >= 0 && currentIndex < allDeals.length - 1 ? allDeals[currentIndex + 1] : null;

  if (!isOpen || !deal) return null;

  const isAccepted = deal.acceptanceStatus === 'DA_NGHIEM_THU';
  const hasBo = deal.bookingOrderCreated && Boolean(deal.maBooking);
  const isSowSigned = deal.contractAppendixStatus === 'ĐÃ_KÝ';

  const maskedCccd = deal.soCccd
    ? showFullCccd
      ? deal.soCccd
      : deal.soCccd.length > 4
      ? `****${deal.soCccd.slice(-4)}`
      : deal.soCccd
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} aria-hidden="true" />

      {/* Drawer Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết Deal ${deal.maBooking || deal.id}`}
        className="relative bg-surface w-full max-w-2xl sm:max-w-3xl h-full shadow-2xl border-l border-line flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header Drawer */}
        <div className="px-5 py-3.5 bg-surface border-b border-line flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-soft border border-line flex items-center justify-center text-accent shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm text-ink tracking-tight">
                  {deal.maBooking || 'Chưa tạo mã Deal'}
                </span>
                {deal.maBooking && (
                  <button
                    type="button"
                    onClick={() => handleCopy(deal.maBooking, 'maBooking', 'mã Deal')}
                    title="Sao chép mã Deal"
                    className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
                  >
                    {copiedField === 'maBooking' ? (
                      <Check className="w-3.5 h-3.5 text-positive" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                {hasBo ? (
                  <Status tone="positive">Đã tạo Deal</Status>
                ) : (
                  <Status tone="warning">Chờ chốt Deal</Status>
                )}
                {isSowSigned ? (
                  <Status tone="positive">Đã ký Phụ lục SOW</Status>
                ) : (
                  <Status tone="warning">Chờ ký SOW</Status>
                )}
                {isAccepted ? (
                  <Status tone="positive">Đã nghiệm thu</Status>
                ) : (
                  <Status tone="neutral">Chưa nghiệm thu</Status>
                )}
              </div>
              <div className="text-2xs text-ink-3 mt-0.5 truncate">
                KOC: <strong className="text-ink font-semibold">{deal.tenKenh || deal.idKenh}</strong> ({deal.idKenh}) · Gian hàng:{' '}
                <strong className="text-ink font-semibold">{deal.storeName}</strong> ({deal.thangPlan})
              </div>
            </div>
          </div>

          {/* Navigation Controls: Prev / Next / Close */}
          <div className="flex items-center gap-1 shrink-0">
            {allDeals.length > 1 && (
              <div className="flex items-center border border-line rounded-lg overflow-hidden bg-surface mr-1">
                <button
                  type="button"
                  disabled={!prevDeal}
                  onClick={() => prevDeal && onSelectDeal?.(prevDeal)}
                  title={prevDeal ? `Deal trước: ${prevDeal.maBooking || prevDeal.idKenh}` : 'Không có Deal trước'}
                  className="p-1.5 text-ink-3 hover:text-ink hover:bg-sunken disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-2xs font-mono text-ink-3 px-1.5 tabular-nums">
                  {currentIndex >= 0 ? currentIndex + 1 : '—'}/{allDeals.length}
                </span>
                <button
                  type="button"
                  disabled={!nextDeal}
                  onClick={() => nextDeal && onSelectDeal?.(nextDeal)}
                  title={nextDeal ? `Deal tiếp: ${nextDeal.maBooking || nextDeal.idKenh}` : 'Không có Deal tiếp'}
                  className="p-1.5 text-ink-3 hover:text-ink hover:bg-sunken disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thanh Tác vụ Nhanh trên đầu Drawer */}
        <div className="px-5 py-2.5 bg-sunken/40 border-b border-line flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {!hasBo ? (
              <Button
                variant="primary"
                size="sm"
                icon={FileCheck}
                onClick={() => onOpenDealBuilderModal?.(deal)}
              >
                Tạo Deal &amp; Phụ lục SOW
              </Button>
            ) : (
              <>
                {onOpenContractForDeal && (
                  <Button
                    variant={isSowSigned ? 'secondary' : 'primary'}
                    size="sm"
                    icon={FileText}
                    onClick={() =>
                      onOpenContractForDeal(
                        buildBookingDealFromApprovedItem(deal),
                        'SOW'
                      )
                    }
                  >
                    {isSowSigned ? 'Xem Phụ lục SOW' : 'Ký Phụ lục SOW'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Video}
                  onClick={() => onOpenAcceptanceModal?.(deal)}
                >
                  {isAccepted ? 'Sửa Nghiệm thu Video' : 'Nghiệm thu Video'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Send}
                  onClick={() => onOpenLarkPaymentModal?.(deal)}
                >
                  Lập phiếu Lark
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-2xs text-ink-3">
            <span>Phụ trách:</span>
            <strong className="text-ink font-semibold">{deal.nguoiPhuTrach || 'Chưa gán'}</strong>
          </div>
        </div>

        {/* Navigation Tabs trong Drawer */}
        <div className="px-5 border-b border-line bg-surface flex items-center gap-4 shrink-0">
          {[
            { key: 'OVERVIEW', label: '1. Tổng quan & Kế hoạch' },
            { key: 'CONTRACT', label: '2. Hợp đồng & Phụ lục SOW' },
            { key: 'ACCEPTANCE', label: '3. Nghiệm thu Video & Ads' },
            { key: 'PAYMENT', label: '4. Tài chính & Lark' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as never)}
              className={`py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body — Cuộn nội dung mượt mà */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-canvas/30">
          {activeTab === 'OVERVIEW' && (
            <>
              {/* Thẻ Chỉ số Tài chính Nổi bật */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-2xs text-ink-3">Giá chốt cuối (Net)</div>
                  <div className="text-sm sm:text-base font-bold text-ink tabular-nums mt-0.5">
                    {formatVnd(deal.chiPhiBookingNetCuoi)}
                  </div>
                  <div className="text-3xs text-ink-3 mt-0.5">Thực nhận về KOC</div>
                </div>

                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-2xs text-ink-3">Tổng Gross (kèm thuế)</div>
                  <div className="text-sm sm:text-base font-bold text-ink tabular-nums mt-0.5">
                    {formatVnd(deal.chiPhiGrossKemThue)}
                  </div>
                  <div className="text-3xs text-ink-3 mt-0.5">Bậc {deal.klGrade || 'KL'}</div>
                </div>

                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-2xs text-ink-3">Tạm ứng / Còn lại</div>
                  <div className="text-sm sm:text-base font-bold text-accent tabular-nums mt-0.5">
                    {formatVndShort(deal.soTienTamUngTruoc)} / {formatVndShort(deal.soTienCanThanhToan)}
                  </div>
                  <div className="text-3xs text-ink-3 mt-0.5">
                    {deal.chiPhiBookingNetCuoi > 0 && deal.soTienTamUngTruoc > 0
                      ? `Đã ứng ${Math.round((deal.soTienTamUngTruoc / deal.chiPhiBookingNetCuoi) * 100)}%`
                      : 'Chưa tạm ứng'}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-line bg-surface">
                  <div className="text-2xs text-ink-3">Hiệu quả (ROI 30d)</div>
                  <div className="text-sm sm:text-base font-bold text-positive tabular-nums mt-0.5">
                    {deal.roi30d.toFixed(2)}x
                  </div>
                  <div className="text-3xs font-semibold text-emerald-700 mt-0.5 truncate">
                    {deal.danhGiaHieuQuaVideo || 'Chưa đánh giá'}
                  </div>
                </div>
              </div>

              {/* Khối Thông tin KOC & Kênh */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-ink">Thông tin KOC &amp; Kênh phát sóng</span>
                  </div>
                  {deal.linkKenh && (
                    <a
                      href={deal.linkKenh}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-2xs text-accent hover:underline font-medium"
                    >
                      <span>Mở kênh TikTok</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-ink-3 block text-2xs">Tên KOC / Stage Name:</span>
                    <strong className="text-ink font-semibold">{deal.tenKenh || deal.idKenh}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">ID Kênh:</span>
                    <span className="font-mono text-ink font-semibold">@{deal.idKenh.replace(/^@/, '')}</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Nền tảng &amp; Tệp kênh:</span>
                    <span className="text-ink">TikTok · {deal.tepKenh || 'Beauty / Lifestyle'}</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Hình thức hợp tác:</span>
                    <span className="text-ink font-medium">{deal.hinhThucHopTac || 'New'}</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Số điện thoại liên hệ:</span>
                    <span className="font-mono text-ink">{deal.sdtNhanHang || 'Chưa cập nhật'}</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Lượt theo dõi (Followers):</span>
                    <span className="text-ink font-medium font-mono">{formatNumber(deal.follower || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Khối Kế hoạch Air & Sản phẩm trọng tâm */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-xs text-ink">Gian hàng, Sản phẩm &amp; Lịch phát sóng</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-ink-3 block text-2xs">Gian hàng / Brand:</span>
                    <strong className="text-ink font-semibold">{deal.storeName}</strong> ({deal.brandName})
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Kỳ Kế hoạch:</span>
                    <span className="font-mono font-medium text-ink">Tháng {deal.thangPlan} · {deal.dot}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-ink-3 block text-2xs">Sản phẩm trọng tâm (SKU):</span>
                    <strong className="text-ink font-semibold text-xs">{deal.sanPham || 'Chưa gán SKU'}</strong>
                    {deal.pillarContent && (
                      <span className="ml-2 px-1.5 py-0.2 rounded bg-sunken text-ink-3 text-2xs">
                        Pillar: {deal.pillarContent}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Ngày air chốt / Kế hoạch:</span>
                    <strong className="font-mono text-ink font-semibold">
                      {deal.actualAirDate || deal.plannedAirDate || 'Chưa chốt ngày air'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Tiến độ SLA:</span>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-2xs font-semibold ${
                        deal.trangThaiSlaAir.startsWith('Trễ')
                          ? 'bg-critical-soft text-critical'
                          : 'bg-positive-soft text-positive'
                      }`}
                    >
                      {deal.trangThaiSlaAir}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'CONTRACT' && (
            <>
              {/* Chi tiết Hợp đồng nguyên tắc & Phụ lục SOW */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div>
                    <span className="font-semibold text-xs text-ink block">Hồ sơ Hợp đồng &amp; Phụ lục SOW</span>
                    <span className="text-2xs text-ink-3">Quy chuẩn 3 chặng B2C: HĐNT → Phụ lục SOW theo Deal → BBNT</span>
                  </div>
                  {onOpenContractForDeal && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={FileText}
                      onClick={() =>
                        onOpenContractForDeal(
                          buildBookingDealFromApprovedItem(deal),
                          'SOW'
                        )
                      }
                    >
                      {isSowSigned ? 'Xem văn bản SOW' : 'Soạn & Ký SOW'}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-line bg-sunken/40 space-y-1">
                    <span className="text-2xs text-ink-3 block font-medium">1. Hợp đồng nguyên tắc (HĐNT):</span>
                    <div className="font-mono font-semibold text-ink">
                      {deal.masterContractCode || 'Chưa gắn mã HĐNT'}
                    </div>
                    <div className="text-2xs text-ink-3">
                      Hiệu lực khung cả năm cho đối tác
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-line bg-sunken/40 space-y-1">
                    <span className="text-2xs text-ink-3 block font-medium">2. Phụ lục SOW theo Deal:</span>
                    <div className="font-mono font-semibold text-ink flex items-center justify-between">
                      <span>{deal.contractAppendixCode || `PL-${deal.maBooking}-01`}</span>
                      <Status tone={isSowSigned ? 'positive' : 'warning'}>
                        {deal.contractAppendixStatus || 'CHỜ_KÝ'}
                      </Status>
                    </div>
                    <div className="text-2xs text-ink-3">
                      Gắn liền với chỉ tiêu 1 Video + Dịch vụ kèm
                    </div>
                  </div>
                </div>

                {/* Danh mục Dịch vụ gia tăng (Addon Services) trong SOW */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      Cấu trúc Asset Video &amp; Quyền đi kèm trong Phụ lục:
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDealBuilderModal?.(deal)}
                      className="text-2xs font-semibold text-accent hover:underline"
                    >
                      + Sửa điều khoản SOW
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-line text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0" />
                        <span className="font-medium text-ink">1 Video TikTok hoàn chỉnh (Asset chính)</span>
                      </div>
                      <span className="text-2xs font-mono text-ink-3">Kịch bản + Quay + Đăng kênh</span>
                    </div>

                    {(deal.addonServices || []).map((addon, idx) => (
                      <div
                        key={addon.id || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-sunken/40 border border-line text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-medium text-ink">{addon.termLabel}</span>
                        </div>
                        <span className="text-2xs font-mono text-ink-3">
                          {addon.durationDays ? `${addon.durationDays} ngày` : 'Theo thỏa thuận'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'ACCEPTANCE' && (
            <>
              {/* Nghiệm thu Video & Spark Ads */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-xs text-ink">Tiến độ Nghiệm thu Video &amp; Bàn giao Ads</span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Video}
                    onClick={() => onOpenAcceptanceModal?.(deal)}
                  >
                    {isAccepted ? 'Cập nhật nghiệm thu' : 'Nghiệm thu Video ngay'}
                  </Button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <span className="text-2xs text-ink-3 block">Link video TikTok chính thức:</span>
                    {deal.linkAir ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <a
                          href={deal.linkAir}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-accent hover:underline truncate max-w-md"
                        >
                          {deal.linkAir}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(deal.linkAir, 'linkAir', 'link video')}
                          className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                        >
                          {copiedField === 'linkAir' ? (
                            <Check className="w-3.5 h-3.5 text-positive" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {onOpenTikTokInspector && (
                          <button
                            type="button"
                            onClick={() => onOpenTikTokInspector(deal)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-line bg-surface text-2xs font-medium text-ink hover:bg-sunken"
                          >
                            <Eye className="w-3 h-3 text-accent" />
                            <span>Soi kịch bản &amp; giỏ hàng</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-3 italic">Chưa có link video nghiệm thu</span>
                    )}
                  </div>

                  <div>
                    <span className="text-2xs text-ink-3 block">Mã ủy quyền Spark Ads:</span>
                    {deal.sparkAdsCode ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sunken border border-line text-ink">
                          {deal.sparkAdsCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(deal.sparkAdsCode, 'sparkAds', 'mã Spark Ads')}
                          className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                        >
                          {copiedField === 'sparkAds' ? (
                            <Check className="w-3.5 h-3.5 text-positive" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-3 italic">Chưa có mã Spark Ads</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line">
                    <div className="p-2 rounded bg-sunken/40 border border-line">
                      <span className="text-3xs text-ink-3 block">Lượt xem (30d)</span>
                      <strong className="text-xs font-mono text-ink tabular-nums">
                        {formatNumber(deal.views30d || 0)}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-sunken/40 border border-line">
                      <span className="text-3xs text-ink-3 block">Số đơn hàng (30d)</span>
                      <strong className="text-xs font-mono text-ink tabular-nums">
                        {formatNumber(deal.orders30d || 0)} đơn
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-sunken/40 border border-line">
                      <span className="text-3xs text-ink-3 block">GMV (30d)</span>
                      <strong className="text-xs font-mono text-ink tabular-nums text-positive">
                        {formatVndShort(deal.gmv30d || 0)}
                      </strong>
                    </div>
                    <div className="p-2 rounded bg-sunken/40 border border-line">
                      <span className="text-3xs text-ink-3 block">ROI 30 ngày</span>
                      <strong className="text-xs font-mono text-emerald-800 tabular-nums">
                        {deal.roi30d.toFixed(2)}x
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'PAYMENT' && (
            <>
              {/* Thông tin Thanh toán, Thuế & Luồng Lark */}
              <div className="p-4 rounded-xl border border-line bg-surface space-y-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-xs text-ink">Tài khoản Thụ hưởng &amp; Thuế TNCN</span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Send}
                    onClick={() => onOpenLarkPaymentModal?.(deal)}
                  >
                    Lập phiếu Lark Approval
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-ink-3 block text-2xs">Loại tài khoản thanh toán / Thuế:</span>
                    <span className="font-medium text-ink">{deal.loaiTaiKhoanThanhToan}</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Tên chủ tài khoản:</span>
                    <strong className="text-ink font-semibold">{deal.tenTaiKhoanNganHang || 'Chưa cập nhật'}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Số tài khoản &amp; Ngân hàng:</span>
                    <span className="font-mono font-semibold text-ink">
                      {deal.soTaiKhoan || '—'} ({deal.nganHang || '—'})
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Số CCCD / Mã số thuế:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-ink">{maskedCccd}</span>
                      {deal.soCccd && (
                        <button
                          type="button"
                          onClick={() => setShowFullCccd(!showFullCccd)}
                          className="text-3xs font-semibold text-accent hover:underline"
                        >
                          {showFullCccd ? 'Che' : 'Hiện'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-ink-3 block text-2xs">Nội dung chuyển khoản chuẩn:</span>
                    <span className="font-mono text-xs text-ink bg-sunken px-2 py-1 rounded border border-line block mt-0.5">
                      {deal.noiDungChuyenKhoan}
                    </span>
                  </div>
                </div>

                {/* Trạng thái Lark Approval */}
                <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-1">
                  <span className="text-2xs text-ink-3 block font-medium">Phiếu đề nghị thanh toán Lark:</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-accent">
                      {deal.larkSlipCode || deal.larkApprovalInstanceCode || 'Chưa tạo phiếu trên Lark'}
                    </span>
                    <span className="text-2xs text-ink-3">
                      {deal.larkApprovalRouteSummary || deal.trangThaiPhieuThanhToan}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
