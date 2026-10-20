import type { BookingDealItem, KocItem, SalaryGrade, StorePortfolioItem } from './types';
import {
  buildTikTokChannelUrl,
  computeGrossFeeWithTax,
  computeTepBookingFromNetFee,
  loadStaffSheetCollection,
  makeSheetKey,
  normalizeTikTokId,
  saveStaffSheetCollection,
  type StaffListingSheetRow,
} from './staffBrandListingSheet';

export const APPROVED_BOOKING_LIST_STORAGE_KEY = 'upbase_b2c_approved_booking_list_v1';
export const APPROVED_BOOKING_LIST_UPDATED_EVENT = 'upbase-approved-booking-list-updated';

export type ApprovedBookingPaymentStatus =
  | 'Chờ nghiệm thu'
  | 'Đủ điều kiện ĐNTT'
  | 'Đã lập ĐNTT'
  | 'Đã thanh toán';

export type ApprovedBookingPipelineStatus =
  | 'Chờ chốt giá & ngày air'
  | 'Sẵn sàng tạo BO'
  | 'Đang thực thi (Đã tạo BO)'
  | 'Đã nghiệm thu video'
  | 'Đã quyết toán';

export interface ApprovedBookingListItem {
  id: string;
  sourceSheetRowId?: string;
  sourceSheetKey?: string;
  createdAt: string;
  updatedAt: string;

  // 1. Định danh kế hoạch & gian hàng (File 3.2)
  maBooking: string;                   // Cột 1: Mã Booking (BO2610...) - sinh khi bấm Tạo Booking Order
  bookingOrderCreated: boolean;
  bookingOrderCreatedAt?: string;
  linkedDealId?: string;
  thangPlan: string;                   // Cột 36: Tháng Plan (2026/10)
  dot: string;                         // Đợt Listing (Đợt 1, Đợt 2...)
  storeName: string;                   // Cột 3: Store
  brandName: string;                   // Cột 4: Brand
  nguoiPhuTrach: string;               // Cột 5 & 34: Người phụ trách / Booking PIC
  growthPic: string;                   // Cột 35: Growth PIC
  leaderName: string;                  // Cột 62: Leader

  // 2. Thông tin kênh KOC & Nội dung Brand đã duyệt
  kocId?: string;
  idKenh: string;                      // Cột 2: 🎃 id kênh
  tenKenh: string;                     // Tên kênh KOC
  linkKenh: string;                    // Cột 33: Link kênh
  tepKenh: string;                     // Cột 37: 🎃 Tệp kênh
  follower: number;                    // Số lượng follower
  sanPham: string;                     // Cột 31: 🎃 Sản phẩm
  pillarContent: string;               // Cột 89: 🎃 Pillar (Content tag)
  contentAngle: string;                // Cột 93: Content angle (Content note)
  phanLoaiVideo: string;               // Cột 8: 🎃 Phân loại video
  dinhDangNghiemThu: string;           // Cột 19: 🎃 Định dạng nghiệm thu
  hinhThucHopTac: 'New' | 'Rebook' | 'FOC'; // Cột 20: Hình thức hợp tác

  // 3. Nhân viên điền tại List Duyệt Book: Ngày Air dự kiến & Giá cuối cùng
  giaDeXuatNet: number;                // Giá đề xuất ban đầu trên Sheet Listing
  chiPhiBookingNetCuoi: number;        // Cột 18: 🎃Chi phí thanh toán Booking (Giá cuối cùng nhân viên chốt)
  chiPhiGrossKemThue: number;          // Chi phí Gross kèm thuế TNCN (= Giá cuối / 0.9)
  klGrade: SalaryGrade;                // Cột 56: KL (KL1..KL7 / TAP UpAffiliate)
  plannedAirDate: string;              // Cột 61: P.Ngày air (YYYY-MM-DD) - Nhân viên điền
  plannedSendSampleDate: string;       // Cột 84: P.Ngày gửi hàng
  plannedScriptDate: string;           // Cột 86: P.Ngày KOC gửi kịch bản
  plannedDemoDate: string;             // Cột 87: P.Ngày KOC gửi demo
  soTienTamUngTruoc: number;           // Cột 40: 🎃 Số tiền tạm ứng trước
  loaiTaiKhoanThanhToan: string;       // Cột 17: 🎃📝Loại tài khoản thanh toán
  ghiChu: string;                      // Cột 32: Ghi chú
  pipelineStatus: ApprovedBookingPipelineStatus; // Cột 27: Pipeline

  // 4. Các trường Nghiệm thu Video & Hiệu quả sau Air (Hệ thống tự tìm kênh KOC để mapping & điền)
  acceptanceStatus: 'CHUA_NGHIEM_THU' | 'DA_NGHIEM_THU';
  linkAir: string;                     // Cột 9: 🎃 Link air/Link nghiệm thu
  videoId: string;                     // Cột 59: video_id
  actualAirDate: string;               // Cột 6: 🎃 Ngày air/live real (YYYY-MM-DD)
  ngayDienLinkAir: string;             // Cột 16: Ngày điền link air
  tuanReal: string;                    // Cột 7: Tuần real (W40..W45)
  thangAirReal: string;                // Cột 48: Tháng air real
  trangThaiSlaAir: string;             // Cột 39: Trễ/Đúng hạn điền link air ("Đúng hạn" | "Trễ N ngày" | "Sớm N ngày")
  diffDaysAir: number;                 // Cột 111: Diff_date
  sparkAdsCode: string;                // Cột 45: Mã ủy quyền ads
  views14d: number;                    // Cột 63: 🌼 Views 14 ngày
  orders14d: number;                   // Cột 64: 🌼 Số đơn hàng 14 ngày
  gmv14d: number;                      // Cột 65: 🌼 GMV 14 ngày
  gpm14d: number;                      // Cột 66: 🌼 GPM 14 ngày
  roi14d: number;                      // Cột 67: 🌼 ROI 14 ngày
  views30d: number;                    // Cột 68: 🌸 Views 30 ngày
  orders30d: number;                   // Cột 69: 🌸 Số đơn hàng 30 ngày
  gmv30d: number;                      // Cột 70: 🌸 GMV 30 ngày
  gpm30d: number;                      // Cột 71: 🌸 GPM 30 ngày
  roi30d: number;                      // Cột 72: 🌸 ROI 30 ngày
  danhGiaHieuQuaVideo: string;         // Cột 76: Đánh giá hiệu quả video

  // 5. Đối soát thanh toán & Thông tin nhận hàng / Ngân hàng
  soTienCanThanhToan: number;          // Cột 42: Số tiền cần phải thanh toán
  soTienDaThanhToan: number;           // Cột 43: Số tiền đã thanh toán
  trangThaiPhieuThanhToan: ApprovedBookingPaymentStatus; // Cột 30: Trạng thái phiếu thanh toán
  noiDungChuyenKhoan: string;          // Cột 22: Nội dung chuyển khoản
  nguoiNhanHang: string;
  sdtNhanHang: string;
  diaChiNhanHang: string;
  tenTaiKhoanNganHang: string;         // Cột 23: Tên tài khoản ngân hàng
  soTaiKhoan: string;                  // Cột 24: Số tài khoản
  nganHang: string;                    // Cột 25: Ngân hàng
  soCccd: string;                      // Cột 26: CCCD/MST/Passport
}

export const LOAI_TAI_KHOAN_THANH_TOAN_OPTIONS: string[] = [
  '(Thuế TNCN 10%) Tài khoản cá nhân',
  'Hộ kinh doanh (Kèm ĐKKD)',
  'Công ty / MCN (Xuất HĐ VAT 8-10%)',
  'FOC / Gửi mẫu 0đ (Không phát sinh thanh toán)',
];

export const PHAN_LOAI_VIDEO_OPTIONS: string[] = [
  'Affiliate KOC',
  'Video Kênh Brand',
  'Livestream',
  'Reup / Whitelist Ads',
];

export const DINH_DANG_NGHIEM_THU_OPTIONS: string[] = [
  'Booking Video KOC',
  'Gắn giỏ Affiliate FOC',
  'Phiên Livestream',
  'Video Cấp Mã Spark Ads',
];

export function mapTepBookingToSalaryGrade(netFee: number): SalaryGrade {
  const tep = computeTepBookingFromNetFee(netFee);
  if (tep === 'Freecast') return 'TAP UpAffiliate';
  return tep as SalaryGrade;
}

/**
 * Sinh mã Booking chuẩn File 3.2: BO + YYMM + 5 chữ số
 */
export function generateBookingOrderCode(monthKey: string, seqHint?: number): string {
  const cleanMonth = (monthKey || '2026/10').replace(/[^0-9]/g, '');
  const yy = cleanMonth.slice(2, 4) || '26';
  const mm = cleanMonth.slice(4, 6) || '10';
  const suffix = seqHint
    ? String(35000 + (seqHint % 60000)).padStart(5, '0')
    : String(Math.floor(10000 + Math.random() * 89999));
  return `BO${yy}${mm}${suffix}`;
}

/**
 * Tính Tuần real (W1..W52) từ chuỗi ngày YYYY-MM-DD
 */
export function computeWeekLabelFromDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDays = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  const weekNum = Math.max(1, Math.min(53, Math.ceil((pastDays + startOfYear.getDay() + 1) / 7)));
  return `W${weekNum}`;
}

/**
 * Tính chênh lệch ngày và trạng thái SLA giữa Ngày air thực tế và P.Ngày air chốt
 */
export function computeAirSlaStatus(
  plannedAirDate: string,
  actualAirDate: string
): { statusText: string; diffDays: number } {
  if (!actualAirDate) {
    return { statusText: 'Chưa lên sóng', diffDays: 0 };
  }
  if (!plannedAirDate) {
    return { statusText: 'Đúng hạn', diffDays: 0 };
  }
  const p = new Date(plannedAirDate);
  const a = new Date(actualAirDate);
  if (Number.isNaN(p.getTime()) || Number.isNaN(a.getTime())) {
    return { statusText: 'Đúng hạn', diffDays: 0 };
  }
  const diffDays = Math.round((a.getTime() - p.getTime()) / 86400000);
  if (diffDays <= 0) {
    return {
      statusText: diffDays === 0 ? 'Đúng hạn' : `Sớm ${Math.abs(diffDays)} ngày`,
      diffDays,
    };
  }
  return {
    statusText: `Trễ ${diffDays} ngày`,
    diffDays,
  };
}

/**
 * Đánh giá hiệu quả video tự động theo ROI và Views
 */
export function evaluateVideoEffectivenessLabel(
  roi: number,
  views: number,
  netCost: number
): string {
  if (views <= 0 && roi <= 0) return 'Chưa có số liệu';
  if (netCost <= 0 && views >= 5000) return 'FOC Hiệu quả cao';
  if (roi >= 3.0) return 'Winner xuất sắc (ROI ≥ 3.0x)';
  if (roi >= 2.0) return 'Đạt chuẩn Scale Ads (ROI ≥ 2.0x)';
  if (roi >= 1.0) return 'Hoàn vốn (ROI 1.0x – 1.9x)';
  if (views >= 50000) return 'Traffic cao / Cần tối ưu giỏ hàng';
  return 'Cần tối ưu chuyển đổi (< 1.0x)';
}

/**
 * Tạo nội dung chuyển khoản chuẩn File 3.2:
 * "UpBase thanh toan cho KOC [Brand] thang [MM] [Ma BO]"
 */
export function buildTransferDescription(
  brandName: string,
  thangPlan: string,
  maBooking: string
): string {
  const monthPart = (thangPlan || '2026/10').split(/[/-]/)[1] || '10';
  const cleanBrand = (brandName || 'Brand').replace(/\s+/g, ' ').trim();
  const code = maBooking || 'BO_PENDING';
  return `UpBase thanh toan cho KOC ${cleanBrand} thang ${monthPart} ${code}`;
}

/**
 * Tự động tính toán lại dòng trong List Duyệt Book khi nhân viên sửa Giá cuối, Ngày air hoặc thông tin nghiệm thu
 */
export function recalculateApprovedBookingItem(
  item: ApprovedBookingListItem
): ApprovedBookingListItem {
  const cleanId = normalizeTikTokId(item.idKenh);
  const linkKenh = cleanId ? buildTikTokChannelUrl(cleanId) : item.linkKenh;
  const finalNet = Math.max(0, Number(item.chiPhiBookingNetCuoi) || 0);
  const grossWithTax = computeGrossFeeWithTax(finalNet);
  const klGrade = mapTepBookingToSalaryGrade(finalNet);
  const tamUng = Math.max(0, Number(item.soTienTamUngTruoc) || 0);
  const canThanhToan = Math.max(0, finalNet - tamUng);

  const views30 = Math.max(0, Number(item.views30d) || Number(item.views14d) || 0);
  const gmv30 = Math.max(0, Number(item.gmv30d) || Number(item.gmv14d) || 0);
  const orders30 = Math.max(0, Number(item.orders30d) || Number(item.orders14d) || 0);
  const gpm30 = views30 > 0 ? Math.round((gmv30 / views30) * 1000) : 0;
  const roi30 = finalNet > 0 ? Number((gmv30 / finalNet).toFixed(2)) : 0;

  const views14 = Math.max(0, Number(item.views14d) || Math.round(views30 * 0.75));
  const gmv14 = Math.max(0, Number(item.gmv14d) || Math.round(gmv30 * 0.75));
  const orders14 = Math.max(0, Number(item.orders14d) || Math.round(orders30 * 0.75));
  const gpm14 = views14 > 0 ? Math.round((gmv14 / views14) * 1000) : 0;
  const roi14 = finalNet > 0 ? Number((gmv14 / finalNet).toFixed(2)) : 0;

  const hasAir = Boolean(item.linkAir?.trim() || item.actualAirDate?.trim());
  const acceptanceStatus = hasAir ? 'DA_NGHIEM_THU' : 'CHUA_NGHIEM_THU';
  const extractedVideoMatch = (item.linkAir || '').match(/\/video\/(\d+)/i);
  const videoId = extractedVideoMatch ? extractedVideoMatch[1] : item.videoId || '';
  const tuanReal = item.actualAirDate
    ? computeWeekLabelFromDate(item.actualAirDate)
    : item.tuanReal || '';
  const thangAirReal = item.actualAirDate
    ? item.actualAirDate.slice(0, 7).replace('-', '/')
    : item.thangAirReal || '';

  const slaInfo = computeAirSlaStatus(item.plannedAirDate, item.actualAirDate);
  const danhGia = hasAir
    ? evaluateVideoEffectivenessLabel(roi30, views30, finalNet)
    : item.danhGiaHieuQuaVideo || 'Chờ lên sóng';

  let pipelineStatus: ApprovedBookingPipelineStatus = item.pipelineStatus;
  if (item.trangThaiPhieuThanhToan === 'Đã thanh toán') {
    pipelineStatus = 'Đã quyết toán';
  } else if (acceptanceStatus === 'DA_NGHIEM_THU') {
    pipelineStatus = 'Đã nghiệm thu video';
  } else if (item.bookingOrderCreated && item.maBooking) {
    pipelineStatus = 'Đang thực thi (Đã tạo BO)';
  } else if (item.plannedAirDate && finalNet >= 0) {
    pipelineStatus = 'Sẵn sàng tạo BO';
  } else {
    pipelineStatus = 'Chờ chốt giá & ngày air';
  }

  let paymentStatus: ApprovedBookingPaymentStatus = item.trangThaiPhieuThanhToan;
  if (acceptanceStatus === 'DA_NGHIEM_THU' && paymentStatus === 'Chờ nghiệm thu') {
    paymentStatus = 'Đủ điều kiện ĐNTT';
  }

  const noiDungChuyenKhoan =
    item.noiDungChuyenKhoan ||
    buildTransferDescription(item.brandName, item.thangPlan, item.maBooking);

  return {
    ...item,
    updatedAt: new Date().toISOString(),
    idKenh: cleanId,
    linkKenh,
    chiPhiBookingNetCuoi: finalNet,
    chiPhiGrossKemThue: grossWithTax,
    klGrade,
    soTienTamUngTruoc: tamUng,
    soTienCanThanhToan: canThanhToan,
    acceptanceStatus,
    videoId,
    tuanReal,
    thangAirReal,
    trangThaiSlaAir: slaInfo.statusText,
    diffDaysAir: slaInfo.diffDays,
    views14d: views14,
    orders14d: orders14,
    gmv14d: gmv14,
    gpm14d: gpm14,
    roi14d: roi14,
    views30d: views30,
    orders30d: orders30,
    gmv30d: gmv30,
    gpm30d: gpm30,
    roi30d: roi30,
    danhGiaHieuQuaVideo: danhGia,
    pipelineStatus,
    trangThaiPhieuThanhToan: paymentStatus,
    noiDungChuyenKhoan,
  };
}

/**
 * Chuyển đổi 1 dòng từ Sheet Listing Cá nhân (Brand đã duyệt) sang dòng List Duyệt Book
 */
export function buildApprovedBookingItemFromSheetRow(params: {
  row: StaffListingSheetRow;
  sheetKey: string;
  store?: StorePortfolioItem;
}): ApprovedBookingListItem {
  const { row, sheetKey, store } = params;
  const nowIso = new Date().toISOString();
  const brandName =
    store?.brandName ||
    row.store.split(/[_-]/)[0]?.replace('Chính Hãng', '').trim() ||
    row.store;
  const finalNet = Number(row.giaChotCuoi ?? row.giaNetVideo) || 0;
  const plannedAir = row.ngayAirChot || row.ngayAirPlan || `${row.thang.replace('/', '-')}-20`;
  const isRebook =
    row.thanhQuaHopTac.toLowerCase().includes('đã hợp tác') || row.gmvDaHopTac > 0;
  const hinhThucHopTac: 'New' | 'Rebook' | 'FOC' =
    finalNet === 0 ? 'FOC' : isRebook ? 'Rebook' : 'New';

  const baseItem: ApprovedBookingListItem = {
    id: `ABL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceSheetRowId: row.id,
    sourceSheetKey: sheetKey,
    createdAt: nowIso,
    updatedAt: nowIso,
    maBooking: row.maBooking || '',
    bookingOrderCreated: Boolean(row.maBooking),
    thangPlan: row.thang || '2026/10',
    dot: row.dot || 'Đợt 1',
    storeName: row.store,
    brandName,
    nguoiPhuTrach: row.nhanSuDien || store?.assignedPic || 'Chuyên viên Booking',
    growthPic: store?.accountOwnerName || 'Phạm Thị Thu Hằng',
    leaderName: store?.bookingLeader || '',
    kocId: row.kocId,
    idKenh: normalizeTikTokId(row.idKenh),
    tenKenh: row.tenKenh || row.idKenh,
    linkKenh: row.linkKenh || buildTikTokChannelUrl(row.idKenh),
    tepKenh: row.tepKenh || 'Review Nữ',
    follower: Number(row.follower) || 0,
    sanPham: row.sanPham || store?.mainProducts?.[0] || `Sản phẩm ${brandName}`,
    pillarContent: row.contentTag || 'Review trực tiếp',
    contentAngle: row.contentNote || '',
    phanLoaiVideo: 'Affiliate KOC',
    dinhDangNghiemThu: finalNet === 0 ? 'Gắn giỏ Affiliate FOC' : 'Booking Video KOC',
    hinhThucHopTac,
    giaDeXuatNet: Number(row.giaNetVideo) || 0,
    chiPhiBookingNetCuoi: finalNet,
    chiPhiGrossKemThue: computeGrossFeeWithTax(finalNet),
    klGrade: mapTepBookingToSalaryGrade(finalNet),
    plannedAirDate: plannedAir,
    plannedSendSampleDate: '',
    plannedScriptDate: '',
    plannedDemoDate: '',
    soTienTamUngTruoc: 0,
    loaiTaiKhoanThanhToan:
      finalNet === 0
        ? 'FOC / Gửi mẫu 0đ (Không phát sinh thanh toán)'
        : '(Thuế TNCN 10%) Tài khoản cá nhân',
    ghiChu: row.leaderNote || '',
    pipelineStatus: 'Sẵn sàng tạo BO',
    acceptanceStatus: row.linkAirNghiemThu ? 'DA_NGHIEM_THU' : 'CHUA_NGHIEM_THU',
    linkAir: row.linkAirNghiemThu || '',
    videoId: '',
    actualAirDate: row.ngayAirReal || '',
    ngayDienLinkAir: row.ngayAirReal || '',
    tuanReal: row.tuanReal || '',
    thangAirReal: '',
    trangThaiSlaAir: row.trangThaiSlaAir || 'Chưa lên sóng',
    diffDaysAir: 0,
    sparkAdsCode: row.maSparkAds || '',
    views14d: Math.round((Number(row.viewsNghiemThu) || 0) * 0.75),
    orders14d: Math.round((Number(row.donHangNghiemThu) || 0) * 0.75),
    gmv14d: Math.round((Number(row.gmvNghiemThu) || 0) * 0.75),
    gpm14d: 0,
    roi14d: 0,
    views30d: Number(row.viewsNghiemThu) || 0,
    orders30d: Number(row.donHangNghiemThu) || 0,
    gmv30d: Number(row.gmvNghiemThu) || 0,
    gpm30d: 0,
    roi30d: Number(row.roiNghiemThu) || 0,
    danhGiaHieuQuaVideo: 'Chờ lên sóng',
    soTienCanThanhToan: finalNet,
    soTienDaThanhToan: 0,
    trangThaiPhieuThanhToan:
      (row.trangThaiThanhToan as ApprovedBookingPaymentStatus) || 'Chờ nghiệm thu',
    noiDungChuyenKhoan: '',
    nguoiNhanHang: row.nguoiNhanHang || '',
    sdtNhanHang: row.sdtNhanHang || '',
    diaChiNhanHang: row.diaChiNhanHang || '',
    tenTaiKhoanNganHang: row.tenTaiKhoanNganHang || '',
    soTaiKhoan: row.soTaiKhoan || '',
    nganHang: row.nganHang || '',
    soCccd: row.soCccd || '',
  };

  return recalculateApprovedBookingItem(baseItem);
}

/**
 * Khởi tạo dữ liệu mẫu ban đầu cho List Duyệt Book từ các dòng trong Sheet Listing Brand
 */
export function buildInitialApprovedBookingList(
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[],
  defaultStaffName = 'Chuyên viên Booking'
): ApprovedBookingListItem[] {
  const sheetCollection = loadStaffSheetCollection(kocs, stores, deals, defaultStaffName);
  const storeMap = new Map(stores.map((s) => [s.storeName, s]));
  const items: ApprovedBookingListItem[] = [];

  Object.entries(sheetCollection.sheets).forEach(([sheetKey, rows]) => {
    rows.slice(0, 2).forEach((row, idx) => {
      const storeObj = storeMap.get(row.store);
      const base = buildApprovedBookingItemFromSheetRow({
        row: {
          ...row,
          brandChon: 'Yes',
        },
        sheetKey,
        store: storeObj,
      });

      // Dòng đầu tiên minh họa đã tạo mã BO & đã nghiệm thu; dòng thứ 2 đang chờ chốt tạo BO
      if (idx === 0) {
        const boCode = generateBookingOrderCode(row.thang, items.length + 101);
        const actualAir = row.ngayAirPlan || '2026-10-16';
        const views = Math.max(18500, row.viewTrungBinh || 24000);
        const gmv = Math.max(14500000, Math.round((row.giaNetVideo || 2000000) * 3.2));
        const orders = Math.max(42, Math.round(gmv / 265000));
        items.push(
          recalculateApprovedBookingItem({
            ...base,
            maBooking: boCode,
            bookingOrderCreated: true,
            bookingOrderCreatedAt: new Date().toISOString(),
            linkAir: `https://www.tiktok.com/@${base.idKenh}/video/742619820192837${items.length + 1}`,
            videoId: `742619820192837${items.length + 1}`,
            actualAirDate: actualAir,
            ngayDienLinkAir: actualAir,
            sparkAdsCode: `#SPARK-${base.idKenh.slice(0, 6).toUpperCase()}-2610`,
            views30d: views,
            gmv30d: gmv,
            orders30d: orders,
            trangThaiPhieuThanhToan: 'Đủ điều kiện ĐNTT',
          })
        );
      } else {
        items.push(base);
      }
    });
  });

  return items;
}

export function loadApprovedBookingList(
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[],
  defaultStaffName?: string
): ApprovedBookingListItem[] {
  if (typeof window === 'undefined') {
    return buildInitialApprovedBookingList(kocs, stores, deals, defaultStaffName);
  }
  try {
    const raw = window.localStorage.getItem(APPROVED_BOOKING_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ApprovedBookingListItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const initial = buildInitialApprovedBookingList(kocs, stores, deals, defaultStaffName);
  saveApprovedBookingList(initial, false);
  return initial;
}

export function saveApprovedBookingList(
  list: ApprovedBookingListItem[],
  emitEvent = true
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APPROVED_BOOKING_LIST_STORAGE_KEY, JSON.stringify(list));
    if (emitEvent) {
      window.dispatchEvent(
        new CustomEvent(APPROVED_BOOKING_LIST_UPDATED_EVENT, { detail: list })
      );
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Đồng bộ ngược thông tin Booking Order & Nghiệm thu từ List Duyệt Book về đúng dòng KOC trên Sheet Listing Brand
 */
export function syncApprovedItemsBackToStaffBrandSheets(
  approvedItems: ApprovedBookingListItem[],
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[]
): void {
  if (typeof window === 'undefined') return;
  const collection = loadStaffSheetCollection(kocs, stores, deals);
  let hasChanged = false;

  for (const item of approvedItems) {
    const cleanHandle = normalizeTikTokId(item.idKenh).toLowerCase();
    const candidateSheetKeys = item.sourceSheetKey
      ? [item.sourceSheetKey, makeSheetKey(item.thangPlan, item.storeName)]
      : Object.keys(collection.sheets);

    for (const key of Array.from(new Set(candidateSheetKeys))) {
      const sheetRows = collection.sheets[key];
      if (!sheetRows) continue;

      collection.sheets[key] = sheetRows.map((row) => {
        const isSameRow =
          (item.sourceSheetRowId && row.id === item.sourceSheetRowId) ||
          (normalizeTikTokId(row.idKenh).toLowerCase() === cleanHandle &&
            (!item.storeName || row.store === item.storeName));

        if (!isSameRow) return row;
        hasChanged = true;
        return {
          ...row,
          brandChon: 'Yes',
          chuyenListDuyetBook: true,
          maBooking: item.maBooking || row.maBooking,
          giaChotCuoi: item.chiPhiBookingNetCuoi,
          ngayAirChot: item.plannedAirDate || row.ngayAirPlan,
          linkAirNghiemThu: item.linkAir || row.linkAirNghiemThu,
          ngayAirReal: item.actualAirDate || row.ngayAirReal,
          tuanReal: item.tuanReal || row.tuanReal,
          trangThaiSlaAir: item.trangThaiSlaAir || row.trangThaiSlaAir,
          maSparkAds: item.sparkAdsCode || row.maSparkAds,
          viewsNghiemThu: item.views30d || row.viewsNghiemThu,
          gmvNghiemThu: item.gmv30d || row.gmvNghiemThu,
          donHangNghiemThu: item.orders30d || row.donHangNghiemThu,
          roiNghiemThu: item.roi30d || row.roiNghiemThu,
          trangThaiThanhToan: item.trangThaiPhieuThanhToan || row.trangThaiThanhToan,
        };
      });
    }
  }

  if (hasChanged) {
    saveStaffSheetCollection(collection, true);
  }
}

/**
 * Chuyển các dòng được Brand duyệt từ Sheet Listing Cá nhân sang bảng List Duyệt Book
 */
export function transferBrandApprovedRowsToBookingList(params: {
  rowsToTransfer: StaffListingSheetRow[];
  sheetKey: string;
  store?: StorePortfolioItem;
  allKocs: KocItem[];
  allStores: StorePortfolioItem[];
  allDeals: BookingDealItem[];
}): { addedCount: number; updatedCount: number; totalApprovedList: ApprovedBookingListItem[] } {
  const { rowsToTransfer, sheetKey, store, allKocs, allStores, allDeals } = params;
  const currentList = loadApprovedBookingList(allKocs, allStores, allDeals);
  let addedCount = 0;
  let updatedCount = 0;
  const nextList = [...currentList];
  const syncedItems: ApprovedBookingListItem[] = [];

  for (const row of rowsToTransfer) {
    const cleanHandle = normalizeTikTokId(row.idKenh).toLowerCase();
    const existingIdx = nextList.findIndex(
      (item) =>
        (item.sourceSheetRowId && item.sourceSheetRowId === row.id) ||
        (normalizeTikTokId(item.idKenh).toLowerCase() === cleanHandle &&
          item.storeName === row.store &&
          item.thangPlan === row.thang)
    );

    if (existingIdx >= 0) {
      const existing = nextList[existingIdx];
      const merged = recalculateApprovedBookingItem({
        ...existing,
        sourceSheetRowId: row.id,
        sourceSheetKey: sheetKey,
        dot: row.dot || existing.dot,
        sanPham: row.sanPham || existing.sanPham,
        pillarContent: row.contentTag || existing.pillarContent,
        contentAngle: row.contentNote || existing.contentAngle,
        giaDeXuatNet: Number(row.giaNetVideo) || existing.giaDeXuatNet,
        chiPhiBookingNetCuoi:
          existing.chiPhiBookingNetCuoi || Number(row.giaNetVideo) || 0,
        plannedAirDate: existing.plannedAirDate || row.ngayAirPlan || '',
        nguoiNhanHang: row.nguoiNhanHang || existing.nguoiNhanHang,
        sdtNhanHang: row.sdtNhanHang || existing.sdtNhanHang,
        diaChiNhanHang: row.diaChiNhanHang || existing.diaChiNhanHang,
        tenTaiKhoanNganHang: row.tenTaiKhoanNganHang || existing.tenTaiKhoanNganHang,
        soTaiKhoan: row.soTaiKhoan || existing.soTaiKhoan,
        nganHang: row.nganHang || existing.nganHang,
        soCccd: row.soCccd || existing.soCccd,
      });
      nextList[existingIdx] = merged;
      syncedItems.push(merged);
      updatedCount++;
    } else {
      const created = buildApprovedBookingItemFromSheetRow({
        row: { ...row, brandChon: 'Yes' },
        sheetKey,
        store,
      });
      nextList.unshift(created);
      syncedItems.push(created);
      addedCount++;
    }
  }

  saveApprovedBookingList(nextList, true);
  syncApprovedItemsBackToStaffBrandSheets(syncedItems, allKocs, allStores, allDeals);

  return { addedCount, updatedCount, totalApprovedList: nextList };
}

/**
 * Chuyển đổi 1 dòng trong List Duyệt Book (đã có Mã Booking BO...) thành BookingDealItem để đẩy sang Quản lý Booking
 */
export function buildBookingDealFromApprovedItem(
  item: ApprovedBookingListItem
): BookingDealItem {
  const maBo = item.maBooking || generateBookingOrderCode(item.thangPlan);
  const salaryGrade: SalaryGrade = item.klGrade || 'KL3';
  const isVerified = item.acceptanceStatus === 'DA_NGHIEM_THU';
  return {
    id: maBo,
    dealCode: maBo,
    jobId: item.id,
    campaignCode: `CAMP-${item.thangPlan.replace(/\D/g, '')}`,
    campaignTitle: `Chiến dịch ${item.brandName} (${item.thangPlan})`,
    brandName: item.brandName,
    storeName: item.storeName,
    productName: item.sanPham,
    bookingBatch: item.dot || 'Đợt 1',
    bookingFormat: 'Booking Video KOC',
    kocId: item.kocId || `KOC-${item.idKenh}`,
    kocStageName: item.tenKenh || item.idKenh,
    kocChannelId: `@${normalizeTikTokId(item.idKenh)}`,
    kocTier:
      salaryGrade === 'KL6' || salaryGrade === 'KL7'
        ? 'TIER_1_CELEB'
        : salaryGrade === 'KL4' || salaryGrade === 'KL5'
          ? 'TIER_2_MACRO'
          : salaryGrade === 'KL2' || salaryGrade === 'KL3'
            ? 'TIER_3_MICRO'
            : 'TIER_4_AFFILIATE',
    salaryGrade,
    segment: salaryGrade === 'TAP UpAffiliate' ? 'Massive Creator' : 'Mid Creator',
    tepKenh: (item.tepKenh as BookingDealItem['tepKenh']) || 'Chưa phân loại',
    kocCategory: 'Reviewer',
    contentPillar: 'Review trực tiếp',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    brandApprovalDate: item.createdAt.slice(0, 10),
    kocResponseStatus: 'ĐỒNG_Ý',
    pipelineText: isVerified ? 'Done' : 'Đang triển khai',
    status: isVerified ? 'VIDEO_VERIFIED' : 'CONTRACT_GENERATED',
    statusLabel: isVerified ? 'Đã nghiệm thu video' : 'Đã tạo hợp đồng & gửi mẫu',
    currentStage: isVerified ? '5_SETTLEMENT' : '2_DEAL_CONTRACT',
    sparkAdsCode: item.sparkAdsCode || undefined,
    tiktokVideoUrl: item.linkAir || undefined,
    videoUrl: item.linkAir || undefined,
    assignedStaff: item.nguoiPhuTrach,
    bookingPic: item.nguoiPhuTrach,
    leadBooking: item.leaderName,
    totalValue: item.chiPhiBookingNetCuoi,
    advanceAmount: item.soTienTamUngTruoc,
    finalAmount: item.soTienCanThanhToan,
    deadlinePost: item.plannedAirDate,
    postedDate: item.actualAirDate || undefined,
    viewsCount: item.views30d || 0,
    affiliateGmv: item.gmv30d || 0,
    gmv30: item.gmv30d || 0,
    roi: item.roi30d || 0,
    ordersCount: item.orders30d || 0,
    publishedDays: isVerified ? 7 : 0,
    remainingSlaHours: 48,
    isSlaWarning: false,
  };
}

/**
 * Tách @handle (ID kênh) và video_id từ Link video TikTok hoặc chuỗi nhập vào
 */
export function extractTikTokChannelAndVideoFromInput(rawInput: string): {
  channelHandle: string;
  videoId: string;
  cleanUrl: string;
} {
  const trimmed = (rawInput || '').trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s,\t]+/i);
  const cleanUrl = urlMatch ? urlMatch[0] : trimmed;

  // Mẫu chuẩn: https://www.tiktok.com/@katthy.review/video/7425819201928371
  const fullMatch = cleanUrl.match(/tiktok\.com\/@([A-Za-z0-9._-]+)(?:\/video\/(\d+))?/i);
  if (fullMatch) {
    return {
      channelHandle: normalizeTikTokId(fullMatch[1]),
      videoId: fullMatch[2] || '',
      cleanUrl,
    };
  }

  // Nếu người dùng nhập @handle kèm link hoặc mã
  const handleMatch = trimmed.match(/@([A-Za-z0-9._-]{2,40})/);
  const videoIdMatch = trimmed.match(/\b(\d{15,22})\b/);
  return {
    channelHandle: handleMatch ? normalizeTikTokId(handleMatch[1]) : '',
    videoId: videoIdMatch ? videoIdMatch[1] : '',
    cleanUrl,
  };
}

export interface VideoAcceptanceMappingInput {
  channelHandle: string;
  linkAir: string;
  videoId?: string;
  actualAirDate?: string;
  sparkAdsCode?: string;
  views30d?: number;
  gmv30d?: number;
  orders30d?: number;
  storeNameFilter?: string;
  thangPlanFilter?: string;
  targetItemId?: string;
  targetBookingCode?: string;
}

export interface VideoAcceptanceMappingResult {
  matchedCount: number;
  unmatchedHandles: string[];
  updatedApprovedItems: ApprovedBookingListItem[];
  updatedList: ApprovedBookingListItem[];
}

/**
 * Tự động tìm kênh KOC (@handle) để mapping nghiệm thu video và điền đầy đủ các trường nghiệm thu
 * vào cả Bảng List Duyệt Book lẫn Bảng Sheet Listing Brand của nhân viên.
 */
export function autoMapVideoAcceptanceByKocChannel(params: {
  acceptances: VideoAcceptanceMappingInput[];
  allKocs: KocItem[];
  allStores: StorePortfolioItem[];
  allDeals: BookingDealItem[];
}): VideoAcceptanceMappingResult {
  const { acceptances, allKocs, allStores, allDeals } = params;
  const currentList = loadApprovedBookingList(allKocs, allStores, allDeals);
  const nextList = [...currentList];
  const updatedApprovedItems: ApprovedBookingListItem[] = [];
  const unmatchedHandles: string[] = [];
  let matchedCount = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const acc of acceptances) {
    const cleanHandle = normalizeTikTokId(acc.channelHandle).toLowerCase();
    const cleanTargetBo = (acc.targetBookingCode || '').trim().toUpperCase();
    if (!cleanHandle && !acc.targetItemId && !cleanTargetBo) continue;

    let targetIdx = -1;

    // 0. Ưu tiên khớp chính xác theo dòng BO mà nhân viên đã chọn trực tiếp (targetItemId hoặc targetBookingCode)
    if (acc.targetItemId) {
      targetIdx = nextList.findIndex((item) => item.id === acc.targetItemId);
    }
    if (targetIdx === -1 && cleanTargetBo) {
      targetIdx = nextList.findIndex(
        (item) => (item.maBooking || '').trim().toUpperCase() === cleanTargetBo
      );
    }

    // 1. Tìm tự động theo @id_kênh trong List Duyệt Book (ưu tiên khớp Store + Tháng và dòng chưa nghiệm thu)
    if (targetIdx === -1 && cleanHandle) {
      targetIdx = nextList.findIndex(
        (item) =>
          normalizeTikTokId(item.idKenh).toLowerCase() === cleanHandle &&
          (!acc.storeNameFilter ||
            acc.storeNameFilter === 'ALL' ||
            item.storeName === acc.storeNameFilter) &&
          (!acc.thangPlanFilter ||
            acc.thangPlanFilter === 'ALL' ||
            item.thangPlan === acc.thangPlanFilter) &&
          item.acceptanceStatus === 'CHUA_NGHIEM_THU'
      );
    }

    if (targetIdx === -1 && cleanHandle) {
      targetIdx = nextList.findIndex(
        (item) =>
          normalizeTikTokId(item.idKenh).toLowerCase() === cleanHandle &&
          (!acc.storeNameFilter ||
            acc.storeNameFilter === 'ALL' ||
            item.storeName === acc.storeNameFilter) &&
          (!acc.thangPlanFilter ||
            acc.thangPlanFilter === 'ALL' ||
            item.thangPlan === acc.thangPlanFilter)
      );
    }

    if (targetIdx === -1 && cleanHandle) {
      targetIdx = nextList.findIndex(
        (item) => normalizeTikTokId(item.idKenh).toLowerCase() === cleanHandle
      );
    }

    // 2. Nếu kênh KOC đang nằm trên Sheet Listing Brand nhưng chưa bấm chuyển sang List Duyệt Book,
    // hệ thống tự động tìm trong Sheet Listing Brand, đưa sang List Duyệt Book và điền nghiệm thu luôn!
    if (targetIdx === -1) {
      const sheetCollection = loadStaffSheetCollection(allKocs, allStores, allDeals);
      for (const [sheetKey, rows] of Object.entries(sheetCollection.sheets)) {
        const matchedSheetRow = rows.find(
          (r) => normalizeTikTokId(r.idKenh).toLowerCase() === cleanHandle
        );
        if (matchedSheetRow) {
          const storeObj = allStores.find((s) => s.storeName === matchedSheetRow.store);
          const created = buildApprovedBookingItemFromSheetRow({
            row: { ...matchedSheetRow, brandChon: 'Yes' },
            sheetKey,
            store: storeObj,
          });
          nextList.unshift(created);
          targetIdx = 0;
          break;
        }
      }
    }

    if (targetIdx === -1) {
      unmatchedHandles.push(acc.channelHandle);
      continue;
    }

    const target = nextList[targetIdx];
    const maBooking =
      target.maBooking || generateBookingOrderCode(target.thangPlan, targetIdx + 501);
    const actualAirDate = acc.actualAirDate || target.actualAirDate || todayStr;
    const views30 =
      acc.views30d !== undefined && acc.views30d >= 0
        ? acc.views30d
        : target.views30d > 0
        ? target.views30d
        : 0;
    const gmv30 =
      acc.gmv30d !== undefined && acc.gmv30d >= 0
        ? acc.gmv30d
        : target.gmv30d > 0
        ? target.gmv30d
        : 0;
    const orders30 =
      acc.orders30d !== undefined && acc.orders30d >= 0
        ? acc.orders30d
        : target.orders30d > 0
        ? target.orders30d
        : 0;

    const updated = recalculateApprovedBookingItem({
      ...target,
      maBooking,
      bookingOrderCreated: true,
      bookingOrderCreatedAt: target.bookingOrderCreatedAt || new Date().toISOString(),
      linkAir: acc.linkAir || target.linkAir,
      videoId: acc.videoId || target.videoId,
      actualAirDate,
      ngayDienLinkAir: todayStr,
      sparkAdsCode: acc.sparkAdsCode || target.sparkAdsCode || '',
      views30d: views30,
      gmv30d: gmv30,
      orders30d: orders30,
      trangThaiPhieuThanhToan:
        target.trangThaiPhieuThanhToan === 'Chờ nghiệm thu'
          ? 'Đủ điều kiện ĐNTT'
          : target.trangThaiPhieuThanhToan,
    });

    nextList[targetIdx] = updated;
    updatedApprovedItems.push(updated);
    matchedCount++;
  }

  if (matchedCount > 0) {
    saveApprovedBookingList(nextList, true);
    syncApprovedItemsBackToStaffBrandSheets(
      updatedApprovedItems,
      allKocs,
      allStores,
      allDeals
    );
  }

  return {
    matchedCount,
    unmatchedHandles,
    updatedApprovedItems,
    updatedList: nextList,
  };
}

/**
 * Xuất TSV chuẩn File 3.2 List duyệt book để dán vào Google Sheet / Excel
 */
export function formatApprovedBookingListToTsv(
  items: ApprovedBookingListItem[],
  includeHeaders = true
): string {
  const headers = [
    'Mã Booking',
    '🎃 id kênh',
    'Store',
    'Brand',
    'Người phụ trách',
    'P.Ngày air (Chốt)',
    '🎃 Ngày air/live real',
    'Tuần real',
    '🎃 Phân loại video',
    '🎃 Link air/Link nghiệm thu',
    'Trễ/Đúng hạn điền link air',
    '🎃📝Loại tài khoản thanh toán',
    '🎃Chi phí thanh toán Booking (Giá cuối)',
    'Chi phí Gross (Kèm thuế TNCN)',
    'KL',
    '🎃 Định dạng nghiệm thu',
    'Hình thức hợp tác',
    '🎃 Số tiền tạm ứng trước',
    'Số tiền cần phải thanh toán',
    'Trạng thái phiếu thanh toán',
    'Nội dung chuyển khoản',
    '🎃 Sản phẩm',
    '🎃 Pillar',
    '🎃 Tệp kênh',
    'Mã ủy quyền ads',
    '🌼 Views 14 ngày',
    '🌼 GMV 14 ngày',
    '🌼 ROI 14 ngày',
    '🌸 Views 30 ngày',
    '🌸 Số đơn hàng 30 ngày',
    '🌸 GMV 30 ngày',
    '🌸 GPM 30 ngày',
    '🌸 ROI 30 ngày',
    'Đánh giá hiệu quả video',
    'Tên tài khoản ngân hàng',
    'Số tài khoản',
    'Ngân hàng',
    'CCCD/MST/Passport',
    'SĐT nhận hàng',
    'Địa chỉ nhận hàng',
    'Ghi chú',
  ];

  const clean = (v: unknown) =>
    v === null || v === undefined ? '' : String(v).replace(/[\t\r\n]+/g, ' ').trim();

  const rows = items.map((it) =>
    [
      it.maBooking || 'Chưa tạo BO',
      it.idKenh,
      it.storeName,
      it.brandName,
      it.nguoiPhuTrach,
      it.plannedAirDate,
      it.actualAirDate,
      it.tuanReal,
      it.phanLoaiVideo,
      it.linkAir,
      it.trangThaiSlaAir,
      it.loaiTaiKhoanThanhToan,
      it.chiPhiBookingNetCuoi,
      it.chiPhiGrossKemThue,
      it.klGrade,
      it.dinhDangNghiemThu,
      it.hinhThucHopTac,
      it.soTienTamUngTruoc,
      it.soTienCanThanhToan,
      it.trangThaiPhieuThanhToan,
      it.noiDungChuyenKhoan,
      it.sanPham,
      it.pillarContent,
      it.tepKenh,
      it.sparkAdsCode,
      it.views14d,
      it.gmv14d,
      it.roi14d,
      it.views30d,
      it.orders30d,
      it.gmv30d,
      it.gpm30d,
      it.roi30d,
      it.danhGiaHieuQuaVideo,
      it.tenTaiKhoanNganHang,
      it.soTaiKhoan,
      it.nganHang,
      it.soCccd,
      it.sdtNhanHang,
      it.diaChiNhanHang,
      it.ghiChu,
    ]
      .map(clean)
      .join('\t')
  );

  return includeHeaders ? [headers.join('\t'), ...rows].join('\n') : rows.join('\n');
}

/**
 * Tải file CSV chuẩn File 3.2 List duyệt book
 */
export function downloadApprovedBookingListCsv(
  items: ApprovedBookingListItem[],
  monthKey: string,
  storeFilter: string
): void {
  if (typeof window === 'undefined') return;
  const tsv = formatApprovedBookingListToTsv(items, true);
  const csvLines = tsv.split('\n').map((line) =>
    line
      .split('\t')
      .map((cell) => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(',')
  );
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeStore = (storeFilter || 'All_Stores').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeMonth = (monthKey || '2026-10').replace(/[^a-zA-Z0-9_-]/g, '-');
  a.href = url;
  a.download = `3.2_List_Duyet_Book_${safeStore}_${safeMonth}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
