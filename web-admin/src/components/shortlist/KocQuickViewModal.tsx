'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  History,
  TrendingUp,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type {
  BookingDealItem,
  CreatorSegment,
  KocCategory,
  KocItem,
  KocTier,
  SalaryGrade,
  StorePortfolioItem,
  TepKenh,
  UserProfile,
} from '../../lib/types';
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import {
  computeListingToBrandSla,
  computeTepBookingFromNetFee,
  loadStaffSheetCollection,
  normalizeTikTokId,
  syncSheetRowContactToKocMaster,
  type StaffListingSheetRow,
} from '../../lib/staffBrandListingSheet';

function parseSheetKey(sheetKey: string): { monthKey: string; storeName: string } {
  const [monthKey = '', storeName = ''] = String(sheetKey || '').split('__');
  return { monthKey, storeName };
}
import {
  buildBookingDealFromApprovedItem,
  loadApprovedBookingList,
  type ApprovedBookingListItem,
} from '../../lib/approvedBookingList';
import { KocProfile } from '../koc/KocProfile';
import { Avatar, Button, Modal, Stat, StatRow, Status } from '../ui';

export interface KocQuickViewModalProps {
  open: boolean;
  onClose: () => void;
  /** ID kênh (@handle) hoặc ID bản ghi KOC cần xem nhanh */
  channelHandle?: string;
  kocId?: string;
  /** Dòng dữ liệu từ Bảng Listing Sheet (nếu mở từ Sheet Listing) */
  sheetRow?: Partial<StaffListingSheetRow> | null;
  /** Dòng dữ liệu từ Bảng Deal & Nghiệm thu (nếu mở từ List Duyệt Book) */
  approvedItem?: Partial<ApprovedBookingListItem> | null;
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  deals: BookingDealItem[];
  currentUser?: UserProfile | null;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface CrossSheetListingEntry {
  rowId: string;
  monthKey: string;
  storeName: string;
  dot: string;
  nhanSuDien: string;
  sanPham: string;
  contentTag: string;
  giaNetVideo: number;
  giaChotCuoi: number;
  brandChon: string;
  lyDoTuChoi: string;
  ngayDien: string;
  ngayBrandDuyet: string;
  slaLabel: string;
  slaStatus: 'ON_TIME' | 'OVERDUE' | 'WAITING' | 'WAITING_OVERDUE';
  maBooking: string;
  linkAirNghiemThu: string;
  viewsNghiemThu: number;
  donHangNghiemThu: number;
  gmvNghiemThu: number;
  roiNghiemThu: number;
}

export const KocQuickViewModal: React.FC<KocQuickViewModalProps> = ({
  open,
  onClose,
  channelHandle,
  kocId,
  sheetRow,
  approvedItem,
  kocs: rawKocs,
  stores: rawStores,
  deals: rawDeals,
  currentUser,
  onNotify,
}) => {
  const kocs = useMemo(() => (Array.isArray(rawKocs) ? rawKocs : []), [rawKocs]);
  const stores = useMemo(() => (Array.isArray(rawStores) ? rawStores : []), [rawStores]);
  const deals = useMemo(() => (Array.isArray(rawDeals) ? rawDeals : []), [rawDeals]);
  const [localKocOverride, setLocalKocOverride] = useState<KocItem | null>(null);
  const [showSheetHistoryTable, setShowSheetHistoryTable] = useState<boolean>(true);

  const cleanTargetHandle = useMemo(() => {
    const raw =
      channelHandle ||
      sheetRow?.idKenh ||
      approvedItem?.idKenh ||
      '';
    return normalizeTikTokId(raw).toLowerCase();
  }, [channelHandle, sheetRow?.idKenh, approvedItem?.idKenh]);

  const targetKocId = kocId || sheetRow?.kocId || approvedItem?.kocId || '';

  // 1. Tìm KOC trong Danh bạ Master KOC hoặc tổng hợp từ dữ liệu dòng trên Sheet
  const resolvedKoc = useMemo<KocItem | null>(() => {
    if (!open) return null;
    if (
      localKocOverride &&
      (localKocOverride.id === targetKocId ||
        normalizeTikTokId(localKocOverride.channelId).toLowerCase() === cleanTargetHandle)
    ) {
      return localKocOverride;
    }

    const foundById = targetKocId ? kocs.find((k) => k.id === targetKocId) : undefined;
    const foundByHandle =
      !foundById && cleanTargetHandle
        ? kocs.find(
            (k) => normalizeTikTokId(k.channelId).toLowerCase() === cleanTargetHandle
          )
        : undefined;
    const baseKoc = foundById || foundByHandle;

    const handleDisplay =
      normalizeTikTokId(
        baseKoc?.channelId ||
          sheetRow?.idKenh ||
          approvedItem?.idKenh ||
          channelHandle ||
          ''
      ) || 'koc_channel';

    const netFee = Number(
      sheetRow?.giaChotCuoi ||
        sheetRow?.giaNetVideo ||
        approvedItem?.chiPhiBookingNetCuoi ||
        approvedItem?.giaDeXuatNet ||
        baseKoc?.rateCardVideo ||
        1500000
    );
    const klGrade = (sheetRow?.tepBooking ||
      approvedItem?.klGrade ||
      baseKoc?.salaryGrade ||
      computeTepBookingFromNetFee(netFee)) as SalaryGrade;

    const followers = Number(
      sheetRow?.follower || approvedItem?.follower || baseKoc?.followers || 65000
    );
    const tier: KocTier =
      baseKoc?.tier ||
      (followers >= 500000
        ? 'TIER_1_CELEB'
        : followers >= 150000
          ? 'TIER_2_MACRO'
          : followers >= 10000
            ? 'TIER_3_MICRO'
            : 'TIER_4_AFFILIATE');

    if (baseKoc) {
      return {
        ...baseKoc,
        email: sheetRow?.email || baseKoc.email,
        zalo: sheetRow?.zalo || baseKoc.zalo,
        phone: sheetRow?.sdtNhanHang || sheetRow?.zalo || baseKoc.phone,
        shippingRecipientName:
          sheetRow?.nguoiNhanHang || baseKoc.shippingRecipientName || baseKoc.stageName,
        shippingPhone: sheetRow?.sdtNhanHang || baseKoc.shippingPhone || baseKoc.phone,
        shippingAddress: sheetRow?.diaChiNhanHang || baseKoc.shippingAddress,
        bankAccount: sheetRow?.soTaiKhoan || approvedItem?.soTaiKhoan || baseKoc.bankAccount,
        bankName: sheetRow?.nganHang || approvedItem?.nganHang || baseKoc.bankName,
        cccd: sheetRow?.soCccd || approvedItem?.soCccd || baseKoc.cccd,
      };
    }

    // Nếu KOC mới điền trực tiếp trên Sheet chưa có trong Master KOC, dựng đầy đủ KocItem từ dòng Sheet
    const stageName =
      sheetRow?.tenKenh ||
      approvedItem?.tenKenh ||
      handleDisplay;
    const tepKenhVal = (sheetRow?.tepKenh ||
      approvedItem?.tepKenh ||
      'Beauty') as TepKenh;
    const segmentVal: CreatorSegment =
      followers >= 200000 ? 'Key Creator' : followers >= 80000 ? 'Mid Creator' : 'Massive Creator';
    const categoryVal: KocCategory = 'Personal care';

    return {
      id: targetKocId || `koc-sheet-${handleDisplay}`,
      channelId: handleDisplay,
      channelLink:
        sheetRow?.linkKenh ||
        approvedItem?.linkKenh ||
        `https://www.tiktok.com/@${handleDisplay}`,
      stageName,
      realName:
        sheetRow?.nguoiNhanHang ||
        approvedItem?.tenTaiKhoanNganHang ||
        approvedItem?.nguoiNhanHang ||
        stageName,
      tier,
      tierLabel: tier,
      salaryGrade: klGrade,
      segment: segmentVal,
      tepKenh: tepKenhVal,
      kocCategory: categoryVal,
      niche: tepKenhVal,
      followers,
      avgViews: Number(sheetRow?.viewTrungBinh || 25000),
      rateCardVideo: netFee,
      bookingFormat: 'Booking Video KOC',
      platforms: ['TIKTOK'],
      tiktokChannel: `https://www.tiktok.com/@${handleDisplay}`,
      phone: sheetRow?.sdtNhanHang || sheetRow?.zalo || '',
      zalo: sheetRow?.zalo || '',
      email: sheetRow?.email || '',
      shippingRecipientName: sheetRow?.nguoiNhanHang || stageName,
      shippingPhone: sheetRow?.sdtNhanHang || '',
      shippingAddress: sheetRow?.diaChiNhanHang || '',
      cccd: sheetRow?.soCccd || approvedItem?.soCccd || '',
      bankName: sheetRow?.nganHang || approvedItem?.nganHang || '',
      bankAccount: sheetRow?.soTaiKhoan || approvedItem?.soTaiKhoan || '',
      gmvBestCase: Number(sheetRow?.gmvDaHopTac || 0),
      recentRevenue: Number(sheetRow?.doanhSo || 0),
      itemsSold: Number(sheetRow?.soMonBanRa || 0),
      gpm: Number(sheetRow?.gpm || 0),
      aov: Number(sheetRow?.aov || 0),
      gmvShareVideo: Number(sheetRow?.gmvTuVideoPct ?? 72),
      gmvShareLive: Number(sheetRow?.gmvTuLivePct ?? 18),
      gmvShareProductCard: Number(sheetRow?.gmvTuTheSanPhamPct ?? 10),
      maleRatio: Number(sheetRow?.namPct ?? 22),
      femaleRatio: Number(sheetRow?.nuPct ?? 78),
      age18_24: Number(sheetRow?.tuoi18_24Pct ?? 35),
      age25_34: Number(sheetRow?.tuoi25_34Pct ?? 45),
      age35Plus: Number(sheetRow?.tuoiTren35Pct ?? 20),
      brandName: sheetRow?.store || approvedItem?.brandName || '',
      bookingPic: sheetRow?.nhanSuDien || approvedItem?.nguoiPhuTrach || '',
      contentNote: sheetRow?.contentNote || '',
      reliabilityScore: 92,
    };
  }, [
    open,
    localKocOverride,
    targetKocId,
    cleanTargetHandle,
    kocs,
    sheetRow,
    approvedItem,
    channelHandle,
  ]);

  // 2. Quét toàn bộ lịch sử Listing & Duyệt của KOC này trên tất cả các Sheet Gian hàng B2C
  const crossSheetHistory = useMemo<CrossSheetListingEntry[]>(() => {
    if (!open || !cleanTargetHandle) return [];
    const col = loadStaffSheetCollection(kocs, stores, deals);
    const list: CrossSheetListingEntry[] = [];

    Object.entries(col.sheets || {}).forEach(([sheetKey, rows]) => {
      const parsedKey = parseSheetKey(sheetKey);
      (rows || []).forEach((r) => {
        const h = normalizeTikTokId(r.idKenh).toLowerCase();
        if (h !== cleanTargetHandle && (!targetKocId || r.kocId !== targetKocId)) {
          return;
        }
        const sla = computeListingToBrandSla({
          ngayDien: r.ngayDien,
          createdAt: r.createdAt,
          brandChon: r.brandChon,
          ngayBrandDuyet: r.ngayBrandDuyet,
          brandReviewedAt: r.brandReviewedAt,
        });
        list.push({
          rowId: r.id,
          monthKey: r.thang || parsedKey.monthKey,
          storeName: r.store || parsedKey.storeName,
          dot: r.dot || 'Đợt 1',
          nhanSuDien: r.nhanSuDien || '—',
          sanPham: r.sanPham || '—',
          contentTag: r.contentTag || '—',
          giaNetVideo: Number(r.giaNetVideo) || 0,
          giaChotCuoi: Number(r.giaChotCuoi) || Number(r.giaNetVideo) || 0,
          brandChon: r.brandChon || '',
          lyDoTuChoi: r.lyDoTuChoi || r.leaderNote || '',
          ngayDien: r.ngayDien || '—',
          ngayBrandDuyet: r.ngayBrandDuyet || '',
          slaLabel: r.slaBrandDuyet || sla.label,
          slaStatus: sla.status,
          maBooking: r.maBooking || '',
          linkAirNghiemThu: r.linkAirNghiemThu || '',
          viewsNghiemThu: Number(r.viewsNghiemThu) || 0,
          donHangNghiemThu: Number(r.donHangNghiemThu) || 0,
          gmvNghiemThu: Number(r.gmvNghiemThu) || 0,
          roiNghiemThu: Number(r.roiNghiemThu) || 0,
        });
      });
    });

    return list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [open, cleanTargetHandle, targetKocId, kocs, stores, deals]);

  // 3. Hợp nhất danh sách Deals của KOC từ Bảng Deal hệ thống + List Duyệt Book (ApprovedBookingList)
  const enrichedDeals = useMemo<BookingDealItem[]>(() => {
    if (!open || !resolvedKoc) return deals;
    const map = new Map<string, BookingDealItem>();
    deals.forEach((d) => map.set(d.id, d));

    try {
      const approvedList = loadApprovedBookingList(kocs, stores, deals);
      approvedList.forEach((item) => {
        const h = normalizeTikTokId(item.idKenh).toLowerCase();
        if (h === cleanTargetHandle || (targetKocId && item.kocId === targetKocId)) {
          const syntheticDeal = buildBookingDealFromApprovedItem(item);
          if (!map.has(syntheticDeal.id)) {
            map.set(syntheticDeal.id, syntheticDeal);
          }
        }
      });
    } catch {
      // Giữ nguyên danh sách deals gốc nếu có lỗi đọc bộ nhớ trình duyệt
    }

    return Array.from(map.values());
  }, [open, resolvedKoc, deals, kocs, stores, cleanTargetHandle, targetKocId]);

  // Chỉ số tổng hợp từ các Sheet Listing
  const sheetSummary = useMemo(() => {
    const totalListed = crossSheetHistory.length;
    const approvedCount = crossSheetHistory.filter((x) => x.brandChon === 'Yes').length;
    const rejectedCount = crossSheetHistory.filter((x) => x.brandChon === 'No').length;
    const pendingCount = crossSheetHistory.filter(
      (x) => x.brandChon !== 'Yes' && x.brandChon !== 'No'
    ).length;
    const approvalRatePct =
      totalListed === 0 ? 0 : Math.round((approvedCount / totalListed) * 100);
    const uniqueStoresCount = new Set(crossSheetHistory.map((x) => x.storeName)).size;

    const fees = crossSheetHistory
      .map((x) => x.giaChotCuoi || x.giaNetVideo)
      .filter((n) => n > 0);
    const minFee = fees.length > 0 ? Math.min(...fees) : resolvedKoc?.rateCardVideo || 0;
    const maxFee = fees.length > 0 ? Math.max(...fees) : resolvedKoc?.rateCardVideo || 0;

    const sheetTotalGmv = crossSheetHistory.reduce((s, x) => s + x.gmvNghiemThu, 0);
    const sheetTotalViews = crossSheetHistory.reduce((s, x) => s + x.viewsNghiemThu, 0);

    return {
      totalListed,
      approvedCount,
      rejectedCount,
      pendingCount,
      approvalRatePct,
      uniqueStoresCount,
      minFee,
      maxFee,
      sheetTotalGmv,
      sheetTotalViews,
    };
  }, [crossSheetHistory, resolvedKoc]);

  if (!open || !resolvedKoc) return null;

  const cleanHandle = normalizeTikTokId(resolvedKoc.channelId);
  const tiktokUrl =
    resolvedKoc.channelLink || `https://www.tiktok.com/@${cleanHandle}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Hồ sơ, Hiệu suất & Lịch sử KOC — @${cleanHandle}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span>
              ID kênh: <strong className="text-ink font-mono">@{cleanHandle}</strong>
            </span>
            <span>·</span>
            <span>
              Bậc cast: <strong className="text-ink">{resolvedKoc.salaryGrade}</strong>
            </span>
            <span>·</span>
            <span>
              Tệp kênh: <strong className="text-ink">{resolvedKoc.tepKenh}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line-strong bg-surface text-xs font-medium text-accent hover:bg-sunken"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở kênh TikTok</span>
            </a>
            <Button variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Khối 1: Định danh nhanh KOC & 4 Chỉ số Hiệu suất Kênh + Tỷ lệ Duyệt Book */}
        <div className="p-3.5 rounded-xl bg-sunken/60 border border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={resolvedKoc.stageName}
                src={resolvedKoc.avatarUrl}
                size={44}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-ink truncate">
                    {resolvedKoc.stageName}
                  </span>
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-semibold text-accent hover:underline"
                  >
                    @{cleanHandle} ↗
                  </a>
                  <span className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-2xs font-semibold text-ink">
                    {resolvedKoc.salaryGrade}
                  </span>
                  <Status
                    tone={
                      sheetSummary.approvedCount > 0 || (resolvedKoc.totalPastDeals || 0) > 0
                        ? 'positive'
                        : 'info'
                    }
                  >
                    {sheetSummary.approvedCount > 0 || (resolvedKoc.totalPastDeals || 0) > 0
                      ? 'Đã từng hợp tác'
                      : 'KOC Mới / Tiềm năng'}
                  </Status>
                </div>
                <div className="text-xs text-ink-2 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Tệp kênh: {resolvedKoc.tepKenh}</span>
                  <span>·</span>
                  <span>
                    Follower: <strong>{formatNumber(resolvedKoc.followers || 0)}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Nữ: <strong>{resolvedKoc.femaleRatio ?? 75}%</strong> / Nam:{' '}
                    <strong>{resolvedKoc.maleRatio ?? 25}%</strong>
                  </span>
                  {resolvedKoc.location && (
                    <>
                      <span>·</span>
                      <span>Khu vực: {resolvedKoc.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSheetHistoryTable((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line-strong bg-surface text-xs font-medium text-ink hover:bg-sunken transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
                <span>
                  {showSheetHistoryTable ? 'Thu gọn' : 'Mở'} Lịch sử Sheet ({sheetSummary.totalListed})
                </span>
              </button>
            </div>
          </div>

          <StatRow>
            <Stat
              label="Follower & View TB 30d"
              value={formatNumber(resolvedKoc.followers || 0)}
              note={`View TB: ${formatNumber(resolvedKoc.avgViews || 0)} / video`}
            />
            <Stat
              label="Doanh số Kênh (GMV 30d)"
              value={formatVndShort(
                resolvedKoc.recentRevenue || resolvedKoc.gmvBestCase || 0
              )}
              note={`GPM: ${formatVndShort(resolvedKoc.gpm || 0)} · AOV: ${formatVndShort(
                resolvedKoc.aov || 0
              )}`}
            />
            <Stat
              label="Tỷ lệ Brand duyệt trên Sheet"
              value={`${sheetSummary.approvedCount}/${sheetSummary.totalListed} lần (${sheetSummary.approvalRatePct}%)`}
              tone={sheetSummary.approvedCount > 0 ? 'positive' : undefined}
              note={`${sheetSummary.uniqueStoresCount} gian hàng · Từ chối: ${sheetSummary.rejectedCount} · Chờ: ${sheetSummary.pendingCount}`}
            />
            <Stat
              label="Khung Giá Net & GMV Nghiệm thu"
              value={
                sheetSummary.minFee === sheetSummary.maxFee
                  ? formatVndShort(sheetSummary.maxFee)
                  : `${formatVndShort(sheetSummary.minFee)} – ${formatVndShort(
                      sheetSummary.maxFee
                    )}`
              }
              note={`GMV nghiệm thu: ${formatVndShort(
                sheetSummary.sheetTotalGmv || resolvedKoc.totalPastGmv || 0
              )}`}
            />
          </StatRow>
        </div>

        {/* Khối 2: Bảng Lịch sử Listing & Phê duyệt Brand xuyên suốt các Gian hàng B2C */}
        {showSheetHistoryTable && (
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <div className="px-3.5 py-2 bg-sunken border-b border-line flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                <History className="w-4 h-4 text-accent" />
                <span>
                  Lịch sử Listing, Kết quả Brand duyệt &amp; Nghiệm thu trên các Sheet Gian hàng ({crossSheetHistory.length} đợt)
                </span>
              </div>
              <div className="text-2xs text-ink-3">
                Đối chiếu nhanh giá đề xuất, phản hồi Brand và hiệu quả các đợt đã book
              </div>
            </div>

            {crossSheetHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-3">
                Chưa có lịch sử dòng Listing nào của KOC này trên các Sheet Gian hàng.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-sunken/80 border-b border-line text-2xs font-semibold text-ink-2">
                    <tr>
                      <th className="py-2 px-2.5">Tháng / Đợt</th>
                      <th className="py-2 px-2.5">Gian hàng (Store)</th>
                      <th className="py-2 px-2.5">Sản phẩm (Cột K)</th>
                      <th className="py-2 px-2.5 text-right">Giá Net / Chốt</th>
                      <th className="py-2 px-2.5">Brand chọn &amp; Phản hồi</th>
                      <th className="py-2 px-2.5">TG Duyệt &amp; SLA</th>
                      <th className="py-2 px-2.5">Mã Deal / Air</th>
                      <th className="py-2 px-2.5 text-right">Views · GMV · ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {crossSheetHistory.map((item) => (
                      <tr key={`${item.monthKey}-${item.storeName}-${item.rowId}`} className="hover:bg-sunken/40">
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="font-mono font-semibold text-ink">{item.monthKey}</div>
                          <div className="text-2xs text-ink-3">
                            {item.dot} · PIC: {item.nhanSuDien}
                          </div>
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-medium text-ink truncate max-w-[160px]" title={item.storeName}>
                            {item.storeName}
                          </div>
                          <div className="text-2xs text-ink-3">{item.contentTag}</div>
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="text-ink truncate max-w-[180px]" title={item.sanPham}>
                            {item.sanPham}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-semibold text-ink">
                            {formatVnd(item.giaChotCuoi || item.giaNetVideo)}
                          </div>
                          {item.giaChotCuoi > 0 && item.giaChotCuoi !== item.giaNetVideo && (
                            <div className="text-2xs text-ink-3">
                              Đề xuất: {formatVndShort(item.giaNetVideo)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="flex items-center gap-1.5">
                            <Status
                              tone={
                                item.brandChon === 'Yes'
                                  ? 'positive'
                                  : item.brandChon === 'No'
                                    ? 'critical'
                                    : item.brandChon === 'Cân nhắc'
                                      ? 'warning'
                                      : 'neutral'
                              }
                            >
                              {item.brandChon === 'Yes'
                                ? 'Brand duyệt (Yes)'
                                : item.brandChon === 'No'
                                  ? 'Từ chối (No)'
                                  : item.brandChon === 'Cân nhắc'
                                    ? 'Cân nhắc'
                                    : 'Chờ duyệt'}
                            </Status>
                          </div>
                          {item.lyDoTuChoi && (
                            <div
                              className="text-2xs text-ink-2 mt-0.5 truncate max-w-[170px]"
                              title={item.lyDoTuChoi}
                            >
                              {item.lyDoTuChoi}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-2xs tabular-nums whitespace-nowrap">
                          <div className="text-ink">
                            {item.ngayBrandDuyet ? `Duyệt: ${item.ngayBrandDuyet}` : `Listing: ${item.ngayDien}`}
                          </div>
                          <div
                            className={
                              item.slaStatus === 'OVERDUE' || item.slaStatus === 'WAITING_OVERDUE'
                                ? 'text-critical font-semibold'
                                : 'text-positive'
                            }
                          >
                            {item.slaLabel}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {item.maBooking ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono text-2xs font-semibold text-emerald-800">
                              {item.maBooking}
                            </span>
                          ) : (
                            <span className="text-2xs text-ink-3">—</span>
                          )}
                          {item.linkAirNghiemThu && (
                            <div className="mt-0.5">
                              <a
                                href={item.linkAirNghiemThu}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>Video Air</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-2xs tabular-nums whitespace-nowrap">
                          {item.gmvNghiemThu > 0 || item.viewsNghiemThu > 0 ? (
                            <>
                              <div className="font-semibold text-ink">
                                GMV: {formatVndShort(item.gmvNghiemThu)}
                              </div>
                              <div className="text-ink-3">
                                {formatNumber(item.viewsNghiemThu)} views · ROI{' '}
                                {item.roiNghiemThu > 0 ? `${item.roiNghiemThu.toFixed(2)}x` : '—'}
                              </div>
                            </>
                          ) : (
                            <span className="text-ink-3">Chưa nghiệm thu</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Khối 3: Hồ sơ KOC toàn diện (4 Tab: Lịch sử & Hiệu quả hợp tác, Hồ sơ pháp lý 1-N, Chỉ số kênh & TikTok Seller, Booking đang chạy) */}
        <div className="border border-line rounded-xl p-4 bg-surface">
          <KocProfile
            koc={resolvedKoc}
            deals={enrichedDeals}
            currentUser={currentUser || undefined}
            layout="modal"
            onUpdateKoc={(updated, message) => {
              setLocalKocOverride(updated);
              syncSheetRowContactToKocMaster({
                kocId: updated.id,
                idKenh: updated.channelId,
                email: updated.email,
                zalo: updated.zalo,
                phone: updated.phone,
                shippingRecipientName: updated.shippingRecipientName,
                shippingPhone: updated.shippingPhone,
                shippingAddress: updated.shippingAddress,
                bankAccount: updated.bankAccount,
                bankName: updated.bankName,
                cccd: updated.cccd,
                allKocs: kocs,
              });
              if (message) {
                onNotify?.(message, 'success');
              }
            }}
            onNotify={onNotify}
          />
        </div>
      </div>
    </Modal>
  );
};
