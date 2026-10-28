'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Send,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractRecord } from '../../lib/contracts/types';
import { formatDate, formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import {
  buildBookingDealFromApprovedItem,
  type ApprovedBookingListItem,
} from '../../lib/approvedBookingList';
import { normalizeTikTokId } from '../../lib/staffBrandListingSheet';
import { documentOfTemplate } from '../../lib/planDealLink';
import { computeSigningProgress, contractStatus, resolveActiveLegalProfile } from '../contracts/contractUi';
import { Avatar, Button, Panel, Person, Presence, Progress, Stat, StatRow, Status, StepMark, Tabs } from '../ui';

export interface DealDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deal: ApprovedBookingListItem | null;
  allDeals?: ApprovedBookingListItem[];
  kocs?: KocItem[];
  contractRecords?: ContractRecord[];
  onSelectDeal?: (deal: ApprovedBookingListItem) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onOpenDraftBbntPreview?: (deal: BookingDealItem) => void;
  onOpenAcceptanceModal?: (item: ApprovedBookingListItem) => void;
  onOpenLarkPaymentModal?: (item: ApprovedBookingListItem) => void;
  onOpenDealBuilderModal?: (item: ApprovedBookingListItem) => void;
  onOpenTikTokInspector?: (item: ApprovedBookingListItem) => void;
  onOpenKocProfile?: (item: ApprovedBookingListItem) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type DrawerTab = 'OVERVIEW' | 'CONTRACT' | 'ACCEPTANCE';

function maskSensitive(raw?: string, showFull?: boolean): string {
  const clean = (raw || '').trim();
  if (!clean) return 'Chưa cập nhật';
  if (showFull || clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

export const DealDetailDrawer: React.FC<DealDetailDrawerProps> = ({
  isOpen,
  onClose,
  deal,
  allDeals = [],
  kocs = [],
  contractRecords = [],
  onSelectDeal,
  onOpenContractForDeal,
  onOpenDraftBbntPreview,
  onOpenAcceptanceModal,
  onOpenLarkPaymentModal,
  onOpenDealBuilderModal,
  onOpenTikTokInspector,
  onOpenKocProfile,
  onNotify,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('OVERVIEW');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && (e.altKey || e.metaKey)) {
        const idx = deal ? allDeals.findIndex((d) => d.id === deal.id) : -1;
        if (idx > 0) onSelectDeal?.(allDeals[idx - 1]);
      } else if (e.key === 'ArrowRight' && (e.altKey || e.metaKey)) {
        const idx = deal ? allDeals.findIndex((d) => d.id === deal.id) : -1;
        if (idx >= 0 && idx < allDeals.length - 1) onSelectDeal?.(allDeals[idx + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, deal, allDeals, onSelectDeal]);

  const handleCopy = (text: string, fieldName: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      onNotify?.(`Đã sao chép ${label}: ${text}`, 'success');
      setTimeout(() => setCopiedField(null), 1800);
    });
  };

  const currentIndex = useMemo(() => {
    if (!deal || allDeals.length === 0) return -1;
    return allDeals.findIndex((d) => d.id === deal.id);
  }, [deal, allDeals]);

  const prevDeal = currentIndex > 0 ? allDeals[currentIndex - 1] : null;
  const nextDeal =
    currentIndex >= 0 && currentIndex < allDeals.length - 1 ? allDeals[currentIndex + 1] : null;

  const matchedKoc = useMemo(() => {
    if (!deal) return undefined;
    const cleanHandle = normalizeTikTokId(deal.idKenh).toLowerCase();
    return kocs.find(
      (k) =>
        (deal.kocId && k.id === deal.kocId) ||
        (cleanHandle && normalizeTikTokId(k.channelId).toLowerCase() === cleanHandle)
    );
  }, [deal, kocs]);

  const mappedBookingDeal = useMemo(
    () => (deal ? buildBookingDealFromApprovedItem(deal) : null),
    [deal]
  );

  const activeLegalProfile = useMemo(
    () =>
      matchedKoc && mappedBookingDeal
        ? resolveActiveLegalProfile(matchedKoc, mappedBookingDeal)
        : undefined,
    [matchedKoc, mappedBookingDeal]
  );

  // Tìm các hồ sơ hợp đồng thực tế từ /api/contracts của Deal / KOC này
  const linkedContracts = useMemo(() => {
    if (!deal || contractRecords.length === 0) {
      return { hdnt: undefined, sow: undefined, bbnt: undefined };
    }
    const dealCodeUpper = (deal.maBooking || '').trim().toUpperCase();
    const kocId = deal.kocId || matchedKoc?.id;
    const cleanHandle = normalizeTikTokId(deal.idKenh).toLowerCase();

    const sameDeal = (r: ContractRecord) =>
      Boolean(
        dealCodeUpper &&
          ((r.dealId || '').toUpperCase() === dealCodeUpper ||
            (r.dealCode || '').toUpperCase() === dealCodeUpper)
      );

    const sameKoc = (r: ContractRecord) =>
      sameDeal(r) ||
      Boolean(kocId && r.kocId === kocId) ||
      Boolean(
        cleanHandle &&
          r.partner &&
          normalizeTikTokId(r.partner).toLowerCase().includes(cleanHandle)
      );

    const byLatest = (a: ContractRecord, b: ContractRecord) =>
      b.updatedAt.localeCompare(a.updatedAt);

    const hdnt = [...contractRecords]
      .filter((r) => documentOfTemplate(r.templateId) === 'HDNT' && sameKoc(r))
      .sort(byLatest)[0];
    const sow = [...contractRecords]
      .filter((r) => documentOfTemplate(r.templateId) === 'SOW' && sameDeal(r))
      .sort(byLatest)[0];
    const bbnt = [...contractRecords]
      .filter((r) => documentOfTemplate(r.templateId) === 'BBNT' && sameDeal(r))
      .sort(byLatest)[0];

    return { hdnt, sow, bbnt };
  }, [deal, contractRecords, matchedKoc]);

  if (!deal) return <Presence show={false} exit="drawer" />;

  const isAccepted = deal.acceptanceStatus === 'DA_NGHIEM_THU';
  const hasBo = deal.bookingOrderCreated && Boolean(deal.maBooking);
  const sowSigningCompleted =
    linkedContracts.sow?.signing.at(-1)?.status === 'COMPLETED' ||
    deal.contractAppendixStatus === 'ĐÃ_KÝ';

  const stageStatus =
    deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
      ? { label: 'Đã thanh toán', tone: 'positive' as const }
      : isAccepted
      ? { label: 'Đã nghiệm thu', tone: 'positive' as const }
      : sowSigningCompleted
      ? { label: 'Đang thực thi', tone: 'info' as const }
      : hasBo
      ? { label: 'Chờ ký SOW', tone: 'warning' as const }
      : { label: 'Chờ tạo deal', tone: 'warning' as const };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <Presence show={isOpen} exit="drawer">
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
        <div
          className="absolute inset-0"
          onClick={onClose}
          aria-hidden="true"
        />

        <div
          data-motion-panel
          role="dialog"
          aria-modal="true"
          aria-label={`Hồ sơ Deal ${deal.maBooking || deal.id}`}
          className="relative bg-surface w-full max-w-3xl h-full border-l border-line shadow-lg flex flex-col overflow-hidden"
        >
          {/* Đầu trang Hồ sơ — chuẩn DESIGN_SYSTEM.md §7 Rule 12: Định danh bên trái (tối đa 1 Status), Nút hành động chính + Điều hướng bên phải */}
          <header className="px-5 py-3.5 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={deal.tenKenh || deal.idKenh} size={36} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-ink truncate">
                    {deal.tenKenh || deal.idKenh}
                  </h2>
                  <Status tone={stageStatus.tone}>{stageStatus.label}</Status>
                </div>
                <div className="flex items-center gap-2 text-2xs text-ink-3 mt-0.5 flex-wrap">
                  <span className="font-code text-ink-2">
                    @{deal.idKenh.replace(/^@/, '')}
                  </span>
                  <span>·</span>
                  <span className="font-code font-medium text-ink">
                    {deal.maBooking || 'Chưa cấp mã BO'}
                  </span>
                  {deal.maBooking && (
                    <button
                      type="button"
                      onClick={() => handleCopy(deal.maBooking, 'maBooking', 'mã Deal')}
                      title="Sao chép mã Deal"
                      className="inline-flex items-center justify-center w-5 h-5 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                    >
                      {copiedField === 'maBooking' ? (
                        <Check className="w-3.5 h-3.5 text-positive" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  <span>·</span>
                  <span className="truncate">{deal.storeName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!hasBo ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={FileCheck}
                  onClick={() => onOpenDealBuilderModal?.(deal)}
                >
                  Tạo Deal &amp; SOW
                </Button>
              ) : !sowSigningCompleted && onOpenContractForDeal && mappedBookingDeal ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={FileText}
                  onClick={() => onOpenContractForDeal(mappedBookingDeal, 'SOW')}
                >
                  Ký Phụ lục SOW
                </Button>
              ) : !isAccepted ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Video}
                  onClick={() => onOpenAcceptanceModal?.(deal)}
                >
                  Nghiệm thu video
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Send}
                  onClick={() => onOpenLarkPaymentModal?.(deal)}
                >
                  Lập phiếu ĐNTT
                </Button>
              )}

              {allDeals.length > 1 && (
                <div className="inline-flex items-center border border-line-strong rounded-md overflow-hidden bg-surface h-7">
                  <button
                    type="button"
                    disabled={!prevDeal}
                    onClick={() => prevDeal && onSelectDeal?.(prevDeal)}
                    title={prevDeal ? `Deal trước: ${prevDeal.maBooking || prevDeal.idKenh}` : 'Đầu danh sách'}
                    aria-label="Deal trước"
                    className="h-7 w-7 inline-flex items-center justify-center text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-2xs font-code text-ink-3 px-2 tabular-nums">
                    {currentIndex >= 0 ? currentIndex + 1 : 1}/{allDeals.length}
                  </span>
                  <button
                    type="button"
                    disabled={!nextDeal}
                    onClick={() => nextDeal && onSelectDeal?.(nextDeal)}
                    title={nextDeal ? `Deal sau: ${nextDeal.maBooking || nextDeal.idKenh}` : 'Cuối danh sách'}
                    aria-label="Deal sau"
                    className="h-7 w-7 inline-flex items-center justify-center text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                title="Đóng (Esc)"
                aria-label="Đóng"
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Thanh hành trình 4 chặng chuẩn StepMark — nhấp vào từng chặng để mở đúng phân hệ */}
          <div className="px-5 py-2.5 bg-sunken/50 border-b border-line shrink-0">
            <div className="grid grid-cols-4 gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('OVERVIEW');
                  if (!hasBo) onOpenDealBuilderModal?.(deal);
                }}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark done={hasBo} label="1" size={20} />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Tạo Deal &amp; BO</div>
                  <div className="text-2xs text-ink-3 font-code truncate">
                    {hasBo ? deal.maBooking : 'Chờ cấp mã'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CONTRACT')}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark done={sowSigningCompleted} label="2" size={20} />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Ký Phụ lục SOW</div>
                  <div className="text-2xs text-ink-3 truncate">
                    {sowSigningCompleted
                      ? deal.contractAppendixCode || 'Đã ký kết'
                      : 'Chờ ký SOW'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ACCEPTANCE')}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark done={isAccepted} label="3" size={20} />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Nghiệm thu Video</div>
                  <div className="text-2xs text-ink-3 truncate">
                    {isAccepted
                      ? deal.actualAirDate
                        ? `Air ${formatDate(deal.actualAirDate)}`
                        : 'Đã lên sóng'
                      : 'Chờ link video'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('ACCEPTANCE');
                  if (isAccepted) onOpenLarkPaymentModal?.(deal);
                }}
                className="flex items-center gap-2 min-w-0 text-left px-2 py-1.5 rounded-md hover:bg-surface transition-colors"
              >
                <StepMark
                  done={deal.trangThaiPhieuThanhToan === 'Đã thanh toán'}
                  label="4"
                  size={20}
                />
                <div className="min-w-0">
                  <div className="text-2xs font-medium text-ink truncate">Quyết toán Lark</div>
                  <div className="text-2xs text-ink-3 truncate">
                    {deal.trangThaiPhieuThanhToan}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Dãy 3 Tab chuẩn DESIGN_SYSTEM.md §7 Rule 14 (không đánh số, tên ngắn gọn, thao tác phụ bên phải) */}
          <div className="px-5 pt-2 bg-surface border-b border-line shrink-0">
            <Tabs<DrawerTab>
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'OVERVIEW', label: 'Tổng quan' },
                {
                  key: 'CONTRACT',
                  label: 'Pháp lý & SOW',
                  count: 1 + (deal.addonServices?.length || 0),
                },
                { key: 'ACCEPTANCE', label: 'Nghiệm thu & Thanh toán' },
              ]}
              actions={
                <div className="flex items-center gap-1.5">
                  {onOpenKocProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={UserCheck}
                      onClick={() => onOpenKocProfile(deal)}
                    >
                      Hồ sơ KOC
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenDealBuilderModal?.(deal)}
                  >
                    {sowSigningCompleted ? 'Lập Phụ lục bổ sung' : 'Sửa cấu hình Deal'}
                  </Button>
                </div>
              }
            />
          </div>

          {/* Nội dung cuộn */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-canvas">
            {/* 4 ô chỉ số đầu hồ sơ — chuẩn StatRow size="sm" */}
            <StatRow size="sm">
              <Stat
                label="Chi phí Net chốt"
                value={formatVnd(deal.chiPhiBookingNetCuoi)}
                numeric={deal.chiPhiBookingNetCuoi}
                note={`Gross ${formatVndShort(deal.chiPhiGrossKemThue)} · Bậc ${deal.klGrade || 'KL3'}`}
              />
              <Stat
                label="Cần thanh toán"
                value={formatVnd(deal.soTienCanThanhToan)}
                numeric={deal.soTienCanThanhToan}
                note={
                  deal.soTienTamUngTruoc > 0
                    ? `Đã tạm ứng ${formatVndShort(deal.soTienTamUngTruoc)}`
                    : 'Chưa phát sinh tạm ứng'
                }
              />
              <Stat
                label="Doanh số GMV 30 ngày"
                value={formatVnd(deal.gmv30d || 0)}
                numeric={deal.gmv30d || 0}
                note={`${formatNumber(deal.orders30d || 0)} đơn · ${formatNumber(deal.views30d || 0)} lượt xem`}
              />
              <Stat
                label="Hiệu quả ROI 30 ngày"
                value={`${deal.roi30d.toFixed(2)}x`}
                tone={deal.roi30d >= 2 ? 'positive' : deal.roi30d > 0 ? 'warning' : undefined}
                note={deal.danhGiaHieuQuaVideo || 'Chờ lên sóng'}
              />
            </StatRow>

            {activeTab === 'OVERVIEW' && (
              <div className="space-y-4">
                <Panel title="Cấu trúc chi phí & Đối chiếu giải ngân">
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="text-ink-2">
                          Đã tạm ứng / Giải ngân:{' '}
                          <span className="font-code font-semibold text-ink">
                            {formatVnd(
                              deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                                ? deal.chiPhiBookingNetCuoi
                                : deal.soTienTamUngTruoc
                            )}
                          </span>{' '}
                          / {formatVnd(deal.chiPhiBookingNetCuoi)}
                        </span>
                        <span className="font-code text-ink-3 tabular-nums">
                          {deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                            ? 100
                            : deal.chiPhiBookingNetCuoi > 0
                            ? Math.round(
                                (deal.soTienTamUngTruoc / deal.chiPhiBookingNetCuoi) * 100
                              )
                            : 0}
                          % hoàn tất
                        </span>
                      </div>
                      <Progress
                        value={
                          deal.trangThaiPhieuThanhToan === 'Đã thanh toán'
                            ? deal.chiPhiBookingNetCuoi
                            : deal.soTienTamUngTruoc
                        }
                        max={Math.max(1, deal.chiPhiBookingNetCuoi)}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line text-xs">
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Chi phí Gross</div>
                        <div className="font-code font-semibold text-ink mt-0.5 tabular-nums">
                          {formatVnd(deal.chiPhiGrossKemThue)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">
                          Bậc {deal.klGrade || 'KL3'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Net chốt Deal</div>
                        <div className="font-code font-semibold text-ink mt-0.5 tabular-nums">
                          {formatVnd(deal.chiPhiBookingNetCuoi)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">HĐNT &amp; SOW</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Đã tạm ứng trước</div>
                        <div className="font-code font-semibold text-warning mt-0.5 tabular-nums">
                          {formatVnd(deal.soTienTamUngTruoc)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">Theo điều khoản SOW</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-sunken border border-line">
                        <div className="text-2xs text-ink-3">Cần thanh toán</div>
                        <div className="font-code font-semibold text-positive mt-0.5 tabular-nums">
                          {formatVnd(deal.soTienCanThanhToan)}
                        </div>
                        <div className="text-2xs text-ink-3 mt-0.5">Quyết toán sau BBNT</div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Panel
                    title="Thông tin KOC & Kênh phát sóng"
                  actions={
                    deal.linkKenh ? (
                      <a
                        href={deal.linkKenh}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                      >
                        <span>Mở kênh TikTok</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : undefined
                  }
                >
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-2xs text-ink-3">Nghệ danh / KOC</dt>
                      <dd className="font-medium text-ink mt-0.5">{deal.tenKenh || deal.idKenh}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">ID Kênh TikTok</dt>
                      <dd className="font-code text-ink mt-0.5">@{deal.idKenh.replace(/^@/, '')}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Tệp kênh &amp; Phân loại</dt>
                      <dd className="text-ink mt-0.5">
                        {deal.tepKenh || 'Review'} · {deal.phanLoaiVideo || 'Affiliate KOC'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Lượt theo dõi</dt>
                      <dd className="font-code text-ink tabular-nums mt-0.5">
                        {formatNumber(deal.follower || matchedKoc?.followers || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Điện thoại nhận mẫu</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.sdtNhanHang || matchedKoc?.phone, showSensitive)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Hình thức hợp tác</dt>
                      <dd className="text-ink mt-0.5">{deal.hinhThucHopTac || 'New'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-2xs text-ink-3">Địa chỉ gửi hàng mẫu</dt>
                      <dd className="text-ink mt-0.5">
                        {deal.diaChiNhanHang || matchedKoc?.shippingAddress || 'Chưa cập nhật địa chỉ nhận mẫu'}
                      </dd>
                    </div>
                  </dl>
                </Panel>

                <Panel title="Gian hàng, Sản phẩm & Lịch phát sóng">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-2xs text-ink-3">Gian hàng</dt>
                      <dd className="font-medium text-ink mt-0.5">{deal.storeName}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Thương hiệu &amp; Kỳ Plan</dt>
                      <dd className="text-ink mt-0.5">
                        {deal.brandName} · <span className="font-code">{deal.thangPlan}</span> ({deal.dot})
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-2xs text-ink-3">Sản phẩm trọng tâm (SKU)</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {deal.sanPham || 'Chưa gán sản phẩm'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Định hướng nội dung (Pillar)</dt>
                      <dd className="text-ink mt-0.5">{deal.pillarContent || 'Review trực tiếp'}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Nhân sự phụ trách</dt>
                      <dd className="mt-0.5">
                        <Person
                          name={deal.nguoiPhuTrach || 'Chuyên viên Booking'}
                          sub={deal.leaderName ? `Leader: ${deal.leaderName}` : undefined}
                          size={20}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Ngày air cam kết</dt>
                      <dd className="font-code text-ink tabular-nums mt-0.5">
                        {deal.plannedAirDate ? formatDate(deal.plannedAirDate) : 'Chưa chốt ngày air'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Ngày air thực tế &amp; SLA</dt>
                      <dd className="text-ink mt-0.5">
                        <span className="font-code tabular-nums">
                          {deal.actualAirDate ? formatDate(deal.actualAirDate) : 'Chưa lên sóng'}
                        </span>
                        <span className="text-ink-3"> · {deal.trangThaiSlaAir}</span>
                      </dd>
                    </div>
                  </dl>
                </Panel>
                </div>
              </div>
            )}

            {activeTab === 'CONTRACT' && (
              <div className="space-y-4">
                <Panel
                  title="Chuỗi 3 chặng văn bản pháp lý (Kết nối Quản lý Hợp đồng)"
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowSensitive((v) => !v)}
                    >
                      {showSensitive ? 'Che CCCD / MST' : 'Hiện đầy đủ CCCD / MST'}
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    {/* Hồ sơ pháp lý đang áp dụng của KOC */}
                    <div className="p-3 rounded-lg bg-sunken border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-2xs text-ink-3">Chủ thể ký kết &amp; Khấu trừ thuế</div>
                        <div className="font-medium text-ink">
                          {activeLegalProfile
                            ? `${activeLegalProfile.taxAccountType} · ${activeLegalProfile.holderName}`
                            : deal.loaiTaiKhoanThanhToan}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-2xs text-ink-3">Số CCCD / Mã số thuế</div>
                        <div className="font-code text-ink">
                          {maskSensitive(
                            activeLegalProfile?.taxCode ||
                              activeLegalProfile?.cccd ||
                              deal.soCccd ||
                              matchedKoc?.cccd,
                            showSensitive
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3 chặng: HĐNT -> SOW -> BBNT */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Chặng 1: HĐNT */}
                      <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xs font-medium text-ink-3">Hợp đồng nguyên tắc</span>
                            {linkedContracts.hdnt ? (
                              <Status tone={contractStatus(linkedContracts.hdnt).tone}>
                                {contractStatus(linkedContracts.hdnt).label}
                              </Status>
                            ) : (
                              <Status tone="neutral">Khung năm</Status>
                            )}
                          </div>
                          <div className="font-code text-xs font-semibold text-ink truncate">
                            {linkedContracts.hdnt?.title ||
                              deal.masterContractCode ||
                              'Chưa gắn mã HĐNT'}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {linkedContracts.hdnt
                              ? computeSigningProgress(linkedContracts.hdnt.signing.at(-1))?.summaryText ||
                                'Đã khởi tạo hồ sơ HĐNT'
                              : 'Áp dụng chung cho mọi Deal của KOC'}
                          </div>
                        </div>
                        {onOpenContractForDeal && mappedBookingDeal && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={FileText}
                            onClick={() => onOpenContractForDeal(mappedBookingDeal, 'HDNT')}
                          >
                            {linkedContracts.hdnt ? 'Mở hồ sơ HĐNT' : 'Soạn HĐNT'}
                          </Button>
                        )}
                      </div>

                      {/* Chặng 2: Phụ lục SOW */}
                      <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xs font-medium text-ink-3">Phụ lục SOW theo Deal</span>
                            <Status tone={sowSigningCompleted ? 'positive' : 'warning'}>
                              {sowSigningCompleted ? 'Đã ký' : 'Chờ ký'}
                            </Status>
                          </div>
                          <div className="font-code text-xs font-semibold text-ink truncate">
                            {linkedContracts.sow?.title ||
                              deal.contractAppendixCode ||
                              (deal.maBooking ? `PL-${deal.maBooking}-01` : 'Chưa cấp mã SOW')}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {linkedContracts.sow
                              ? computeSigningProgress(linkedContracts.sow.signing.at(-1))?.summaryText ||
                                `Giá trị Net: ${formatVnd(deal.chiPhiBookingNetCuoi)}`
                              : `Giá trị Net: ${formatVnd(deal.chiPhiBookingNetCuoi)}`}
                          </div>
                        </div>
                        {onOpenContractForDeal && mappedBookingDeal && (
                          <Button
                            variant={sowSigningCompleted ? 'secondary' : 'primary'}
                            size="sm"
                            icon={FileText}
                            onClick={() => onOpenContractForDeal(mappedBookingDeal, 'SOW')}
                          >
                            {linkedContracts.sow ? 'Mở Phụ lục SOW' : 'Soạn & Ký SOW'}
                          </Button>
                        )}
                      </div>

                      {/* Chặng 3: Biên bản nghiệm thu BBNT */}
                      <div className="p-3.5 rounded-lg border border-line bg-surface flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xs font-medium text-ink-3">Biên bản nghiệm thu</span>
                            <Status tone={linkedContracts.bbnt || isAccepted ? 'positive' : 'neutral'}>
                              {linkedContracts.bbnt
                                ? contractStatus(linkedContracts.bbnt).label
                                : isAccepted
                                ? 'Đủ điều kiện lập'
                                : 'Chờ nghiệm thu'}
                            </Status>
                          </div>
                          <div className="font-code text-xs font-semibold text-ink truncate">
                            {linkedContracts.bbnt?.title ||
                              (deal.maBooking ? `BBNT-${deal.maBooking}` : 'Chưa lập BBNT')}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {isAccepted
                              ? `Đã nghiệm thu ngày ${formatDate(deal.actualAirDate)}`
                              : 'Cần có link video thực tế để xuất BBNT'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {onOpenContractForDeal && mappedBookingDeal && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={FileText}
                              onClick={() => onOpenContractForDeal(mappedBookingDeal, 'BBNT')}
                            >
                              {linkedContracts.bbnt ? 'Mở BBNT' : 'Soạn BBNT'}
                            </Button>
                          )}
                          {onOpenDraftBbntPreview && mappedBookingDeal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenDraftBbntPreview(mappedBookingDeal)}
                            >
                              Xem nháp
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel
                  title="Cấu trúc Hạng mục bàn giao & Quyền đi kèm trong Phụ lục SOW"
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenDealBuilderModal?.(deal)}
                    >
                      {sowSigningCompleted
                        ? 'Lập Phụ lục bổ sung'
                        : 'Chỉnh sửa điều khoản SOW'}
                    </Button>
                  }
                >
                  <div className="divide-y divide-line text-xs">
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">
                          01 Video TikTok hoàn chỉnh — {deal.sanPham || deal.brandName}
                        </div>
                        <div className="text-2xs text-ink-3">
                          Kịch bản, quay dựng và đăng tải trên kênh @{deal.idKenh.replace(/^@/, '')}
                        </div>
                      </div>
                      <div className="text-right font-code tabular-nums shrink-0">
                        <div className="font-semibold text-ink">
                          {formatVnd(deal.videoAssetNetCost ?? deal.chiPhiBookingNetCuoi)}
                        </div>
                        <div className="text-2xs text-ink-3">Hạng mục chính</div>
                      </div>
                    </div>

                    {(deal.addonServices || []).map((addon, idx) => (
                      <div
                        key={addon.id || idx}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-medium text-ink">{addon.termLabel}</div>
                          <div className="text-2xs text-ink-3">
                            Thời hạn: {addon.durationDays ? `${addon.durationDays} ngày` : 'Theo thỏa thuận'} ·{' '}
                            {addon.evidenceCodeOrUrl || 'Chờ bàn giao mã / file'}
                          </div>
                        </div>
                        <div className="text-right font-code tabular-nums shrink-0">
                          <div className="font-semibold text-ink">
                            {(addon.allocatedCostVnd || 0) > 0
                              ? formatVnd(addon.allocatedCostVnd || 0)
                              : 'Đã gộp trong gói'}
                          </div>
                          <div className="text-2xs text-ink-3">
                            {addon.acceptanceStatus === 'VERIFIED' ? 'Đã bàn giao' : 'Đi kèm video'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}

            {activeTab === 'ACCEPTANCE' && (
              <div className="space-y-4">
                <Panel
                  title="Nghiệm thu Video & Mã ủy quyền Spark Ads"
                  actions={
                    <div className="flex items-center gap-2">
                      {deal.linkAir && onOpenTikTokInspector && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => onOpenTikTokInspector(deal)}
                        >
                          Đối soát kịch bản &amp; giỏ hàng
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Video}
                        onClick={() => onOpenAcceptanceModal?.(deal)}
                      >
                        {isAccepted ? 'Cập nhật nghiệm thu' : 'Nghiệm thu video'}
                      </Button>
                    </div>
                  }
                >
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <dt className="text-2xs text-ink-3">Đường dẫn video nghiệm thu (TikTok)</dt>
                      <dd className="mt-1">
                        {deal.linkAir ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={deal.linkAir}
                              target="_blank"
                              rel="noreferrer"
                              className="font-code text-xs text-accent hover:underline break-all"
                            >
                              {deal.linkAir}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(deal.linkAir, 'linkAir', 'link video')}
                              className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                              title="Sao chép link video"
                            >
                              {copiedField === 'linkAir' ? (
                                <Check className="w-3.5 h-3.5 text-positive" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-ink-3">Chưa cập nhật đường dẫn video lên sóng</span>
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-2xs text-ink-3">Mã ủy quyền quảng cáo (Spark Ads)</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        {deal.sparkAdsCode ? (
                          <>
                            <span className="font-code font-medium text-ink px-2 py-0.5 rounded bg-sunken border border-line">
                              {deal.sparkAdsCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(deal.sparkAdsCode, 'sparkAds', 'mã Spark Ads')}
                              className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                              title="Sao chép mã Spark Ads"
                            >
                              {copiedField === 'sparkAds' ? (
                                <Check className="w-3.5 h-3.5 text-positive" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-ink-3">Chưa cấp mã Spark Ads</span>
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-2xs text-ink-3">Ngày lên sóng thực tế &amp; Tuần</dt>
                      <dd className="mt-1 font-code text-ink tabular-nums">
                        {deal.actualAirDate
                          ? `${formatDate(deal.actualAirDate)} (${deal.tuanReal || '—'})`
                          : 'Chưa lên sóng'}
                      </dd>
                    </div>
                  </dl>
                </Panel>

                <Panel
                  title="Tài khoản thụ hưởng & Phê duyệt thanh toán Lark"
                  actions={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSensitive((v) => !v)}
                      >
                        {showSensitive ? 'Che STK / CCCD' : 'Hiện đầy đủ'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Send}
                        onClick={() => onOpenLarkPaymentModal?.(deal)}
                      >
                        Lập phiếu Lark
                      </Button>
                    </div>
                  }
                >
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <dt className="text-2xs text-ink-3">Chủ tài khoản thụ hưởng</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {deal.tenTaiKhoanNganHang || 'Chưa cập nhật'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Ngân hàng &amp; Số tài khoản</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.soTaiKhoan, showSensitive)} · {deal.nganHang || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Số CCCD / Mã số thuế</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {maskSensitive(deal.soCccd, showSensitive)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-3">Phiếu đề nghị thanh toán (Lark)</dt>
                      <dd className="font-code text-ink mt-0.5">
                        {deal.larkSlipCode || deal.larkApprovalInstanceCode || 'Chưa khởi tạo phiếu'} ·{' '}
                        <span className="font-sans text-ink-2">{deal.trangThaiPhieuThanhToan}</span>
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-2xs text-ink-3">Nội dung chuyển khoản chuẩn Kế toán</dt>
                      <dd className="mt-1 flex items-center justify-between gap-2 p-2 rounded bg-sunken border border-line font-code text-xs text-ink">
                        <span className="truncate">{deal.noiDungChuyenKhoan || '—'}</span>
                        {deal.noiDungChuyenKhoan && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                deal.noiDungChuyenKhoan,
                                'noiDungCk',
                                'nội dung chuyển khoản'
                              )
                            }
                            className="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface shrink-0"
                          >
                            {copiedField === 'noiDungCk' ? (
                              <Check className="w-3.5 h-3.5 text-positive" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </dd>
                    </div>
                  </dl>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </div>
    </Presence>,
    document.body
  );
};
