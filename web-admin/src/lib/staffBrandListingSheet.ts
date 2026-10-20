import type { BookingDealItem, KocItem, StorePortfolioItem } from './types';

export type FillMode = 'AUTO_SYSTEM' | 'FORMULA' | 'MANUAL_STAFF';

export interface StaffListingSheetRow {
  id: string;
  kocId?: string;
  createdAt: string;

  // 48 cột theo đúng thứ tự B -> AW của Sheet "Template hệ thống" (template list KOL_KOC.xlsx)
  ngayDien: string;             // #1  (B)  ngay_dien (Tự động)
  dot: string;                  // #2  (C)  Đợt (Thủ công: Đợt 1, Đợt 2, Đợt 3...)
  thang: string;                // #3  (D)  Tháng (Tự động: 2026/10, Tháng 10...)
  nhanSuDien: string;           // #4  (E)  nhan_su_dien (Tự động)
  store: string;                // #5  (F)  Store (Tự động theo sheet Brand/Gian hàng)
  contentTag: string;           // #6  (G)  Content tag (Thủ công - Pillar Content)
  idKenh: string;               // #7  (H)  🎃id kênh (Hệ thống tự lấy từ KOC)
  linkKenh: string;             // #8  (I)  🎃Link kênh (Công thức =CONCAT("https://www.tiktok.com/@",H4))
  tepKenh: string;              // #9  (J)  🎃 Tệp kênh (Hệ thống tự lấy + nhân viên chỉnh)
  sanPham: string;              // #10 (K)  Sản phẩm (Nhân viên điền / chọn SKU của Brand)
  tenKenh: string;              // #11 (L)  Tên người ảnh hưởng (Tên kênh) (Hệ thống tự lấy)
  tepBooking: string;           // #12 (M)  Tệp Booking (Tự động theo Giá net video: Freecast, KL1..KL7)
  giaNetVideo: number;          // #13 (N)  Giá net video (Hệ thống gợi ý từ hồ sơ / Nhân viên điền)
  phiBookingKemThue: number;    // #14 (O)  Phí booking kèm thuế TNCN (Công thức = N4/0.9)
  follower: number;             // #15 (P)  Follower (Hệ thống tự lấy)
  trangThai: string;            // #16 (Q)  Trạng thái (Nhận sản phẩm, Trải nghiệm sản phẩm, Không phản hồi, Từ chối...)
  deXuatUpBase: string;         // #17 (R)  Đề xuất từ UpBase (Must Have, Recommend, Optional)
  leaderNote: string;           // #18 (S)  Growth/ account/leader note (Thủ công)
  contentNote: string;          // #19 (T)  Content note (Thủ công)
  brandChon: string;            // #20 (U)  Brand chọn (Yes, No, Cân nhắc, Chờ duyệt)
  lyDoTuChoi: string;           // #21 (V)  Lý do từ chối - brand note (Thủ công)
  thanhQuaHopTac: string;       // #22 (W)  Thành quả hợp tác (Hệ thống tự tổng hợp lịch sử + Nhân viên điền)
  gmvDaHopTac: number;          // #23 (X)  GMV đã hợp tác - Kéo từ GMV max của ID kênh (Tự động - kéo)
  doanhSo: number;              // #24 (Y)  Doanh số (nếu có) (Hệ thống tự lấy GMV 30d)
  soMonBanRa: number;           // #25 (Z)  Số món bán ra (Hệ thống tự lấy itemsSold)
  gpm: number;                  // #26 (AA) GPM (Hệ thống tự lấy)
  aov: number;                  // #27 (AB) GMV từ mỗi khách hàng/ AOV (Hệ thống tự lấy)
  viewTrungBinh: number;        // #28 (AC) View trung bình video (Hệ thống tự lấy)
  gmvTuVideoPct: number;        // #29 (AD) GMV từ video (%) (Hệ thống tự lấy)
  gmvTuLivePct: number;         // #30 (AE) GMV từ Live (%) (Hệ thống tự lấy)
  gmvTuTheSanPhamPct: number;   // #31 (AF) GMV từ thẻ sản phẩm (%) (Công thức = 100% - AD - AE)
  namPct: number;               // #32 (AG) Nam (%) (Hệ thống tự lấy)
  nuPct: number;                // #33 (AH) Nữ (%) (Công thức = 100% - AG)
  tuoi18_24Pct: number;         // #34 (AI) 18-24 (%) (Hệ thống tự lấy)
  tuoi25_34Pct: number;         // #35 (AJ) 25-34 (%) (Hệ thống tự lấy)
  tuoiTren35Pct: number;        // #36 (AK) >35 (%) (Công thức = 100% - AI - AJ - AL)
  tuoiOtherPct: number;         // #37 (AL) Other (%)
  location: string;             // #38 (AM) Location (Hệ thống tự lấy)
  ngayAirPlan: string;          // #39 (AN) Ngày air plan (Nhân viên điền)
  email: string;                // #40 (AO) Email (Hệ thống tự lấy từ Danh bạ)
  zalo: string;                 // #41 (AP) Zalo (Hệ thống tự lấy từ Danh bạ)
  nguoiNhanHang: string;        // #42 (AQ) Người nhận hàng (Hệ thống tự lấy từ Danh bạ)
  sdtNhanHang: string;          // #43 (AR) SĐT nhận hàng (Hệ thống tự lấy từ Danh bạ)
  diaChiNhanHang: string;       // #44 (AS) Địa chỉ nhận hàng (Hệ thống tự lấy từ Danh bạ)
  tenTaiKhoanNganHang: string;  // #45 (AT) Tên tài khoản ngân hàng (Hệ thống tự lấy từ Danh bạ)
  soTaiKhoan: string;           // #46 (AU) Số tài khoản (Hệ thống tự lấy từ Danh bạ)
  nganHang: string;             // #47 (AV) Ngân hàng (Hệ thống tự lấy từ Danh bạ)
  soCccd: string;               // #48 (AW) Số CCCD (Hệ thống tự lấy từ Danh bạ)

  // Các trường Chốt Book & Nghiệm thu Video (Hệ thống tự động mapping theo kênh KOC sau khi nghiệm thu)
  chuyenListDuyetBook?: boolean;
  maBooking?: string;           // #49 (AX) Mã Booking (BO...)
  giaChotCuoi?: number;         // #50 (AY) Chi phí thanh toán Booking chốt cuối
  ngayAirChot?: string;         // #51 (AZ) P.Ngày air chốt
  linkAirNghiemThu?: string;    // #52 (BA) 🎃 Link air/Link nghiệm thu
  ngayAirReal?: string;         // #53 (BB) 🎃 Ngày air/live real
  tuanReal?: string;            // #54 (BC) Tuần real
  trangThaiSlaAir?: string;     // #55 (BD) Trễ/Đúng hạn điền link air
  maSparkAds?: string;          // #56 (BE) Mã ủy quyền ads
  viewsNghiemThu?: number;      // #57 (BF) 🌸 Views 30 ngày
  gmvNghiemThu?: number;        // #58 (BG) 🌸 GMV 30 ngày
  donHangNghiemThu?: number;    // #59 (BH) 🌸 Số đơn hàng 30 ngày
  roiNghiemThu?: number;        // #60 (BI) 🌸 ROI 30 ngày
  trangThaiThanhToan?: string;  // #61 (BJ) Trạng thái phiếu thanh toán
}

export type StaffListingColumnKey = keyof Omit<
  StaffListingSheetRow,
  'id' | 'kocId' | 'createdAt' | 'chuyenListDuyetBook'
>;

export interface StaffListingColumnMeta {
  index: number;
  excelCol: string;
  key: StaffListingColumnKey;
  header: string;
  group?: string;
  fillMode: FillMode;
  inLarkBase: boolean;
  inBrandWorkingFile: boolean;
  width: number;
}

export const STAFF_LISTING_COLUMNS: StaffListingColumnMeta[] = [
  { index: 1, excelCol: 'B', key: 'ngayDien', header: 'ngay_dien', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 105 },
  { index: 2, excelCol: 'C', key: 'dot', header: 'Đợt (Bổ sung thêm)', group: 'Listing điền', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: false, width: 100 },
  { index: 3, excelCol: 'D', key: 'thang', header: 'Tháng', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 95 },
  { index: 4, excelCol: 'E', key: 'nhanSuDien', header: 'nhan_su_dien', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 145 },
  { index: 5, excelCol: 'F', key: 'store', header: 'Store', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 165 },
  { index: 6, excelCol: 'G', key: 'contentTag', header: 'Content tag', group: 'Listing điền', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 165 },
  { index: 7, excelCol: 'H', key: 'idKenh', header: '🎃id kênh', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 220 },
  { index: 8, excelCol: 'I', key: 'linkKenh', header: '🎃Link kênh', group: 'Kênh KOC', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 220 },
  { index: 9, excelCol: 'J', key: 'tepKenh', header: '🎃 Tệp kênh', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 150 },
  { index: 10, excelCol: 'K', key: 'sanPham', header: 'Sản phẩm', group: 'Đề xuất & Báo giá', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 185 },
  { index: 11, excelCol: 'L', key: 'tenKenh', header: 'Tên người ảnh hưởng (Tên kênh)', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 170 },
  { index: 12, excelCol: 'M', key: 'tepBooking', header: 'Tệp Booking', group: 'Đề xuất & Báo giá', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 13, excelCol: 'N', key: 'giaNetVideo', header: 'Giá net video', group: 'Đề xuất & Báo giá', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 14, excelCol: 'O', key: 'phiBookingKemThue', header: 'Phí booking kèm thuế TNCN', group: 'Đề xuất & Báo giá', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 145 },
  { index: 15, excelCol: 'P', key: 'follower', header: 'Follower', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 16, excelCol: 'Q', key: 'trangThai', header: 'Trạng thái', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 155 },
  { index: 17, excelCol: 'R', key: 'deXuatUpBase', header: 'Đề xuất từ UpBase', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 135 },
  { index: 18, excelCol: 'S', key: 'leaderNote', header: 'Growth/ account/leader note (Bổ sung thêm)', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: false, width: 190 },
  { index: 19, excelCol: 'T', key: 'contentNote', header: 'Content note', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 240 },
  { index: 20, excelCol: 'U', key: 'brandChon', header: 'Brand chọn', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 120 },
  { index: 21, excelCol: 'V', key: 'lyDoTuChoi', header: 'Lý do từ chối - brand note', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 190 },
  { index: 22, excelCol: 'W', key: 'thanhQuaHopTac', header: 'Thành quả hợp tác', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 230 },
  { index: 23, excelCol: 'X', key: 'gmvDaHopTac', header: 'GMV đã hợp tác (Bổ sung thêm) - Kéo từ GMV max của ID kênh', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 150 },
  { index: 24, excelCol: 'Y', key: 'doanhSo', header: 'Doanh số (nếu có)', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 25, excelCol: 'Z', key: 'soMonBanRa', header: 'Số món bán ra', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 115 },
  { index: 26, excelCol: 'AA', key: 'gpm', header: 'GPM', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 110 },
  { index: 27, excelCol: 'AB', key: 'aov', header: 'GMV từ mỗi khách hàng/ AOV', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 28, excelCol: 'AC', key: 'viewTrungBinh', header: 'View trung bình video', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 125 },
  { index: 29, excelCol: 'AD', key: 'gmvTuVideoPct', header: 'GMV từ video', group: 'GMV từ mỗi kênh bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 30, excelCol: 'AE', key: 'gmvTuLivePct', header: 'GMV từ Live', group: 'GMV từ mỗi kênh bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 31, excelCol: 'AF', key: 'gmvTuTheSanPhamPct', header: 'GMV từ thẻ sản phẩm', group: 'GMV từ mỗi kênh bán hàng', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 120 },
  { index: 32, excelCol: 'AG', key: 'namPct', header: 'Nam', group: 'Người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 33, excelCol: 'AH', key: 'nuPct', header: 'Nữ', group: 'Người theo dõi', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 34, excelCol: 'AI', key: 'tuoi18_24Pct', header: '18-24', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 35, excelCol: 'AJ', key: 'tuoi25_34Pct', header: '25-34', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 36, excelCol: 'AK', key: 'tuoiTren35Pct', header: '>35', group: 'Độ tuổi người theo dõi', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 37, excelCol: 'AL', key: 'tuoiOtherPct', header: 'Other', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 85 },
  { index: 38, excelCol: 'AM', key: 'location', header: 'Location', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 120 },
  { index: 39, excelCol: 'AN', key: 'ngayAirPlan', header: 'Ngày air plan', group: 'Lịch Air & Hậu cần', fillMode: 'MANUAL_STAFF', inLarkBase: false, inBrandWorkingFile: false, width: 125 },
  { index: 40, excelCol: 'AO', key: 'email', header: 'Email', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 220 },
  { index: 41, excelCol: 'AP', key: 'zalo', header: 'Zalo', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 120 },
  { index: 42, excelCol: 'AQ', key: 'nguoiNhanHang', header: 'Người nhận hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 150 },
  { index: 43, excelCol: 'AR', key: 'sdtNhanHang', header: 'SĐT nhận hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 125 },
  { index: 44, excelCol: 'AS', key: 'diaChiNhanHang', header: 'Địa chỉ nhận hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 230 },
  { index: 45, excelCol: 'AT', key: 'tenTaiKhoanNganHang', header: 'Tên tài khoản ngân hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 165 },
  { index: 46, excelCol: 'AU', key: 'soTaiKhoan', header: 'Số tài khoản', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 140 },
  { index: 47, excelCol: 'AV', key: 'nganHang', header: 'Ngân hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 140 },
  { index: 48, excelCol: 'AW', key: 'soCccd', header: 'Số CCCD', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 135 },
  // 13 cột Nghiệm thu & Booking (File 3.2) tự động điền khi mapping nghiệm thu video
  { index: 49, excelCol: 'AX', key: 'maBooking', header: 'Mã Booking (BO...)', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 135 },
  { index: 50, excelCol: 'AY', key: 'giaChotCuoi', header: '🎃Chi phí thanh toán Booking (Giá cuối)', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 140 },
  { index: 51, excelCol: 'AZ', key: 'ngayAirChot', header: 'P.Ngày air (Chốt)', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 120 },
  { index: 52, excelCol: 'BA', key: 'linkAirNghiemThu', header: '🎃 Link air/Link nghiệm thu', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 230 },
  { index: 53, excelCol: 'BB', key: 'ngayAirReal', header: '🎃 Ngày air/live real', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 125 },
  { index: 54, excelCol: 'BC', key: 'tuanReal', header: 'Tuần real', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 95 },
  { index: 55, excelCol: 'BD', key: 'trangThaiSlaAir', header: 'Trễ/Đúng hạn điền link air', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 140 },
  { index: 56, excelCol: 'BE', key: 'maSparkAds', header: 'Mã ủy quyền ads', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 165 },
  { index: 57, excelCol: 'BF', key: 'viewsNghiemThu', header: '🌸 Views 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 115 },
  { index: 58, excelCol: 'BG', key: 'gmvNghiemThu', header: '🌸 GMV 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 125 },
  { index: 59, excelCol: 'BH', key: 'donHangNghiemThu', header: '🌸 Số đơn hàng 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 115 },
  { index: 60, excelCol: 'BI', key: 'roiNghiemThu', header: '🌸 ROI 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'FORMULA', inLarkBase: false, inBrandWorkingFile: false, width: 100 },
  { index: 61, excelCol: 'BJ', key: 'trangThaiThanhToan', header: 'Trạng thái phiếu thanh toán', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 155 },
];

// Danh mục chuẩn từ Sheet 9 ("Định nghĩa") của file template list KOL_KOC.xlsx
export const CONTENT_TAG_OPTIONS: string[] = [
  'Review trực tiếp',
  'Nỗi đau – Giải pháp',
  'Unboxing',
  'FOMO',
  'Content gây tranh cãi',
  'Daily Vlog – Storytelling',
  'Nội dung doanh nghiệp',
  'PR báo chí',
  'Educate',
  'Q&A',
  'Feedback',
  'Promotion/Teasing',
  'Entertainment',
];

export const TEP_KENH_OPTIONS: string[] = [
  'Beauty',
  'Unboxing',
  'Mẹ bầu',
  'Mẹ bé',
  'Makeup Artist',
  'Bác sỹ/chuyên gia',
  'Couple',
  'Gym',
  'Eat Clean',
  'Gia đình',
  'Thời trang (có kiến thức)',
  'Thời trang (review)',
  'Lifestyle',
  'Daily Vlog',
  'Cooking',
  'POV',
  'Dance',
  'Seller',
  'Thú cưng',
  'Cosplay',
  'Shipper',
  'Nhà cửa đời sống',
  'Nữ xinh',
  'Tóc',
  'Health',
  'Tin tức',
  'LGBT',
  'KOL',
];

export const TRANG_THAI_OPTIONS: string[] = [
  'Nhận sản phẩm',
  'Trải nghiệm sản phẩm',
  'Đang liên hệ',
  'Không phản hồi',
  'Từ chối',
];

export const DE_XUAT_UPBASE_OPTIONS: string[] = [
  'Must Have',
  'Recommend',
  'Optional',
];

export const BRAND_CHON_OPTIONS: string[] = [
  'Chờ duyệt',
  'Yes',
  'No',
  'Cân nhắc',
];

export const DOT_LISTING_OPTIONS: string[] = [
  'Đợt 1',
  'Đợt 2',
  'Đợt 3',
  'Bổ sung',
];

export const CONTENT_NOTE_SUGGESTIONS: string[] = [
  'Hình ảnh phù hợp với thương hiệu',
  'Yếu tố xu hướng',
  'Sản phẩm bán chạy / tương tự',
  'Đề xuất hỗ trợ từ KOC',
];

export interface BrandGoogleSheetLinkMap {
  [brandOrStoreKey: string]: string;
}

export interface StaffBrandSheetCollection {
  /** key = `${monthKey}__${brandOrStoreKey}` */
  sheets: Record<string, StaffListingSheetRow[]>;
  googleSheetUrls: BrandGoogleSheetLinkMap;
}

const STORAGE_KEY = 'upbase_b2c_staff_brand_listing_sheets_v1';
export const STAFF_SHEET_UPDATED_EVENT = 'upbase-staff-brand-sheet-updated';

/**
 * Công thức Tệp Booking (Cột M) chuẩn theo Sheet "Template hệ thống":
 * =IFS(N=0,"Freecast", AND(N>0,N<500000),"KL1", AND(N>=500000,N<1500000),"KL2",
 *      AND(N>=1500000,N<3000000),"KL3", AND(N>=3000000,N<5000000),"KL4",
 *      AND(N>=5000000,N<10000000),"KL5", AND(N>=10000000,N<30000000),"KL6", N>=30000000,"KL7")
 */
export function computeTepBookingFromNetFee(netFee: number): string {
  const n = Number(netFee) || 0;
  if (n <= 0) return 'Freecast';
  if (n < 500_000) return 'KL1';
  if (n < 1_500_000) return 'KL2';
  if (n < 3_000_000) return 'KL3';
  if (n < 5_000_000) return 'KL4';
  if (n < 10_000_000) return 'KL5';
  if (n < 30_000_000) return 'KL6';
  return 'KL7';
}

/**
 * Công thức Phí booking kèm thuế TNCN (Cột O): = N4 / 0.9
 */
export function computeGrossFeeWithTax(netFee: number): number {
  const n = Number(netFee) || 0;
  if (n <= 0) return 0;
  return Math.round(n / 0.9);
}

export function normalizeTikTokId(raw: string): string {
  return (raw || '').trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, '').replace(/^@/, '').split(/[/?#]/)[0].trim();
}

export function buildTikTokChannelUrl(handle: string): string {
  const clean = normalizeTikTokId(handle);
  if (!clean) return '';
  return `https://www.tiktok.com/@${clean}`;
}

export function formatShortVnDate(date: Date = new Date()): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function makeSheetKey(monthKey: string, storeOrBrand: string): string {
  return `${(monthKey || '2026/10').trim()}__${(storeOrBrand || '').trim()}`;
}

/**
 * Tự động lấy dữ liệu từ hồ sơ KOC + lịch sử Deal UpBase để điền vào 1 dòng của Sheet Listing
 */
export function buildStaffListingRowFromKoc(params: {
  koc: Partial<KocItem> & { stageName: string; channelId: string };
  monthKey: string;
  storeName: string;
  staffName: string;
  deals?: BookingDealItem[];
  dot?: string;
  sanPham?: string;
  contentTag?: string;
  deXuatUpBase?: string;
  trangThai?: string;
  contentNote?: string;
  ngayAirPlan?: string;
}): StaffListingSheetRow {
  const {
    koc,
    monthKey,
    storeName,
    staffName,
    deals = [],
    dot = 'Đợt 1',
    sanPham = '',
    contentTag = 'Review trực tiếp',
    deXuatUpBase = 'Recommend',
    trangThai = 'Nhận sản phẩm',
    contentNote = '',
    ngayAirPlan = '',
  } = params;

  const cleanId = normalizeTikTokId(koc.channelId || koc.tiktokChannel || '');
  const linkKenh = koc.channelLink?.trim() || buildTikTokChannelUrl(cleanId);
  const netFee = Number(koc.rateCardVideo ?? 0);
  const tepBooking = computeTepBookingFromNetFee(netFee);
  const grossFee = computeGrossFeeWithTax(netFee);

  // Tìm lịch sử hợp tác UpBase từ deals
  const kocDeals = deals.filter((d) => {
    const dHandle = normalizeTikTokId(d.kocChannelId || '');
    return (
      (koc.id && d.kocId === koc.id) ||
      (cleanId && dHandle && dHandle.toLowerCase() === cleanId.toLowerCase()) ||
      d.kocStageName.trim().toLowerCase() === koc.stageName.trim().toLowerCase()
    );
  });

  const maxDealGmv = kocDeals.reduce(
    (max, d) => Math.max(max, Number(d.affiliateGmv || d.gmv30 || 0)),
    Number(koc.gmvBestCase || 0)
  );

  let thanhQuaText = '';
  if (kocDeals.length > 0) {
    const topBrands = Array.from(new Set(kocDeals.map((d) => d.brandName).filter(Boolean))).slice(0, 3);
    const totalDealsCount = koc.totalPastDeals || kocDeals.length;
    thanhQuaText = `Đã hợp tác ${totalDealsCount} job tại UpBase (${topBrands.join(', ')})`;
    if (maxDealGmv > 0) {
      thanhQuaText += ` · GMV cao nhất: ${Math.round(maxDealGmv / 1_000_000)}M₫`;
    }
  } else if (koc.totalPastDeals && koc.totalPastDeals > 0) {
    thanhQuaText = `Đã hợp tác ${koc.totalPastDeals} job tại UpBase`;
    if (koc.totalPastGmv && koc.totalPastGmv > 0) {
      thanhQuaText += ` · Tổng GMV: ${Math.round(koc.totalPastGmv / 1_000_000)}M₫`;
    }
  } else {
    thanhQuaText = 'KOC mới đề xuất hợp tác';
  }

  // Tỷ trọng GMV theo kênh bán hàng (%)
  const videoShare = Number(koc.gmvShareVideo ?? 85);
  const liveShare = Number(koc.gmvShareLive ?? 10);
  const cardShare = Math.max(0, Number((100 - videoShare - liveShare).toFixed(2)));

  // Tỷ trọng Giới tính (%)
  const nuPct = Number(koc.femaleRatio ?? 75);
  const namPct = Number(koc.maleRatio ?? Math.max(0, Number((100 - nuPct).toFixed(2))));

  // Tỷ trọng Độ tuổi (%)
  const age18_24 = Number(koc.age18_24 ?? 35);
  const age25_34 = Number(koc.age25_34 ?? 45);
  const ageOther = 0;
  const ageOver35 = Math.max(0, Number((100 - age18_24 - age25_34 - ageOther).toFixed(2)));

  return {
    id: `sheet-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kocId: koc.id,
    createdAt: new Date().toISOString(),
    ngayDien: formatShortVnDate(),
    dot,
    thang: monthKey,
    nhanSuDien: staffName,
    store: storeName,
    contentTag,
    idKenh: cleanId,
    linkKenh,
    tepKenh: koc.tepKenh || koc.creatorCategory || 'Beauty',
    sanPham,
    tenKenh: koc.stageName || cleanId,
    tepBooking,
    giaNetVideo: netFee,
    phiBookingKemThue: grossFee,
    follower: Number(koc.followers || 0),
    trangThai,
    deXuatUpBase,
    leaderNote: koc.accountComment || '',
    contentNote: contentNote || koc.contentNote || '',
    brandChon:
      koc.brandApprovalStatus === 'ĐÃ_DUYỆT'
        ? 'Yes'
        : koc.brandApprovalStatus === 'TỪ_CHỐI'
          ? 'No'
          : 'Chờ duyệt',
    lyDoTuChoi: koc.brandRejectReason || '',
    thanhQuaHopTac: thanhQuaText,
    gmvDaHopTac: maxDealGmv,
    doanhSo: Number(koc.recentRevenue ?? 0),
    soMonBanRa: Number(koc.itemsSold ?? 0),
    gpm: Number(koc.gpm ?? 0),
    aov: Number(koc.aov ?? 0),
    viewTrungBinh: Number(koc.avgViews ?? 0),
    gmvTuVideoPct: videoShare,
    gmvTuLivePct: liveShare,
    gmvTuTheSanPhamPct: cardShare,
    namPct,
    nuPct,
    tuoi18_24Pct: age18_24,
    tuoi25_34Pct: age25_34,
    tuoiTren35Pct: ageOver35,
    tuoiOtherPct: ageOther,
    location: koc.location || 'Việt Nam',
    ngayAirPlan,
    email: koc.email || '',
    zalo: koc.zalo || koc.phone || '',
    nguoiNhanHang: koc.shippingRecipientName || koc.realName || koc.stageName || '',
    sdtNhanHang: koc.shippingPhone || koc.phone || '',
    diaChiNhanHang: koc.shippingAddress || koc.permanentAddress || '',
    tenTaiKhoanNganHang: koc.realName || '',
    soTaiKhoan: koc.bankAccount || '',
    nganHang: koc.bankName || '',
    soCccd: koc.cccd || '',
  };
}

/**
 * Tự động tính toán lại các cột công thức khi nhân viên sửa dòng
 */
export function recalculateStaffListingRow(
  row: StaffListingSheetRow,
  options?: { preserveIdKenhInput?: boolean }
): StaffListingSheetRow {
  const cleanId = normalizeTikTokId(row.idKenh);
  const linkKenh = cleanId ? buildTikTokChannelUrl(cleanId) : row.linkKenh;
  const netFee = Math.max(0, Number(row.giaNetVideo) || 0);
  const tepBooking = computeTepBookingFromNetFee(netFee);
  const phiBookingKemThue = computeGrossFeeWithTax(netFee);

  const vPct = Math.min(100, Math.max(0, Number(row.gmvTuVideoPct) || 0));
  const lPct = Math.min(100 - vPct, Math.max(0, Number(row.gmvTuLivePct) || 0));
  const cPct = Number(Math.max(0, 100 - vPct - lPct).toFixed(2));

  const namPct = Math.min(100, Math.max(0, Number(row.namPct) || 0));
  const nuPct = Number(Math.max(0, 100 - namPct).toFixed(2));

  const a18 = Math.min(100, Math.max(0, Number(row.tuoi18_24Pct) || 0));
  const a25 = Math.min(100 - a18, Math.max(0, Number(row.tuoi25_34Pct) || 0));
  const aOther = Math.min(100 - a18 - a25, Math.max(0, Number(row.tuoiOtherPct) || 0));
  const a35 = Number(Math.max(0, 100 - a18 - a25 - aOther).toFixed(2));

  return {
    ...row,
    idKenh: options?.preserveIdKenhInput ? row.idKenh : cleanId,
    linkKenh,
    giaNetVideo: netFee,
    tepBooking,
    phiBookingKemThue,
    gmvTuVideoPct: vPct,
    gmvTuLivePct: lPct,
    gmvTuTheSanPhamPct: cPct,
    namPct,
    nuPct,
    tuoi18_24Pct: a18,
    tuoi25_34Pct: a25,
    tuoiTren35Pct: a35,
    tuoiOtherPct: aOther,
  };
}

/**
 * Khởi tạo dữ liệu mẫu ban đầu từ Danh bạ KOC cho các Gian hàng để nhân viên vào có sẵn dữ liệu tham khảo
 */
export function buildInitialStaffSheetCollection(
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[],
  defaultStaffName = 'Chuyên viên Listing'
): StaffBrandSheetCollection {
  const sheets: Record<string, StaffListingSheetRow[]> = {};
  const targetMonth = '2026/10';
  const topStores = stores.filter((s) => s.isB2cManaged !== false).slice(0, 5);

  topStores.forEach((store, sIdx) => {
    const key = makeSheetKey(targetMonth, store.storeName);
    const matchingKocs = kocs
      .filter(
        (k) =>
          (k.brandName &&
            store.brandName &&
            k.brandName.toLowerCase().includes(store.brandName.toLowerCase())) ||
          sIdx === 0
      )
      .slice(sIdx * 3, sIdx * 3 + 5);

    const sampleKocs = matchingKocs.length > 0 ? matchingKocs : kocs.slice(0, 4);
    sheets[key] = sampleKocs.map((koc, idx) =>
      buildStaffListingRowFromKoc({
        koc,
        monthKey: targetMonth,
        storeName: store.storeName,
        staffName: store.assignedPic || koc.bookingPic || defaultStaffName,
        deals,
        dot: idx < 2 ? 'Đợt 1' : 'Đợt 2',
        sanPham: store.mainProducts?.[0] || `Sản phẩm chủ lực ${store.brandName}`,
        contentTag: CONTENT_TAG_OPTIONS[idx % 4],
        deXuatUpBase: idx === 0 ? 'Must Have' : 'Recommend',
        trangThai: idx % 2 === 0 ? 'Nhận sản phẩm' : 'Trải nghiệm sản phẩm',
        contentNote: 'Hình ảnh phù hợp với thương hiệu, tệp người xem nữ đúng độ tuổi mục tiêu',
        ngayAirPlan: `2026-10-${15 + idx * 2}`,
      })
    );
  });

  return {
    sheets,
    googleSheetUrls: {},
  };
}

export function loadStaffSheetCollection(
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[],
  defaultStaffName?: string
): StaffBrandSheetCollection {
  if (typeof window === 'undefined') {
    return buildInitialStaffSheetCollection(kocs, stores, deals, defaultStaffName);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StaffBrandSheetCollection;
      if (parsed && typeof parsed.sheets === 'object') {
        return {
          sheets: parsed.sheets || {},
          googleSheetUrls: parsed.googleSheetUrls || {},
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  const initial = buildInitialStaffSheetCollection(kocs, stores, deals, defaultStaffName);
  saveStaffSheetCollection(initial, false);
  return initial;
}

export function saveStaffSheetCollection(
  collection: StaffBrandSheetCollection,
  emitEvent = true
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent(STAFF_SHEET_UPDATED_EVENT, { detail: collection }));
    }
  } catch {
    // ignore quota errors
  }
}

/**
 * Thêm nhanh 1 hoặc nhiều KOC vào Sheet của Brand + Tháng (dùng từ Danh bạ KOC, Crawler KOC, hoặc Shortlist)
 */
export function appendKocsToStaffBrandSheet(params: {
  kocsToAdd: Array<Partial<KocItem> & { stageName: string; channelId: string }>;
  monthKey: string;
  storeName: string;
  staffName: string;
  allKocs: KocItem[];
  allStores: StorePortfolioItem[];
  allDeals: BookingDealItem[];
  dot?: string;
  sanPham?: string;
  contentTag?: string;
  deXuatUpBase?: string;
  contentNote?: string;
}): { addedCount: number; skippedDuplicateCount: number; sheetKey: string } {
  const {
    kocsToAdd,
    monthKey,
    storeName,
    staffName,
    allKocs,
    allStores,
    allDeals,
    dot = 'Đợt 1',
    sanPham = '',
    contentTag = 'Review trực tiếp',
    deXuatUpBase = 'Recommend',
    contentNote = '',
  } = params;

  const collection = loadStaffSheetCollection(allKocs, allStores, allDeals, staffName);
  const sheetKey = makeSheetKey(monthKey, storeName);
  const existingRows = collection.sheets[sheetKey] || [];
  const existingHandles = new Set(
    existingRows.map((r) => normalizeTikTokId(r.idKenh).toLowerCase()).filter(Boolean)
  );

  let addedCount = 0;
  let skippedDuplicateCount = 0;
  const newRows: StaffListingSheetRow[] = [];

  for (const item of kocsToAdd) {
    const cleanHandle = normalizeTikTokId(item.channelId || item.tiktokChannel || '').toLowerCase();
    if (cleanHandle && existingHandles.has(cleanHandle)) {
      skippedDuplicateCount++;
      continue;
    }
    if (cleanHandle) existingHandles.add(cleanHandle);

    const row = buildStaffListingRowFromKoc({
      koc: item,
      monthKey,
      storeName,
      staffName,
      deals: allDeals,
      dot,
      sanPham,
      contentTag,
      deXuatUpBase,
      contentNote,
    });
    newRows.push(row);
    addedCount++;
  }

  if (newRows.length > 0) {
    collection.sheets[sheetKey] = [...existingRows, ...newRows];
    saveStaffSheetCollection(collection, true);
  }

  return { addedCount, skippedDuplicateCount, sheetKey };
}

/**
 * Đồng bộ ngược thông tin liên hệ (Email, Zalo, SĐT, Địa chỉ nhận mẫu) từ Danh bạ KOC sang các dòng tương ứng trên toàn bộ Sheet Listing
 */
export function syncKocContactToStaffSheets(updatedKoc: KocItem): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StaffBrandSheetCollection;
    if (!parsed || typeof parsed.sheets !== 'object') return;

    const cleanHandle = normalizeTikTokId(updatedKoc.channelId || updatedKoc.tiktokChannel || '').toLowerCase();
    let changed = false;

    for (const sheetKey of Object.keys(parsed.sheets)) {
      const rows = parsed.sheets[sheetKey];
      if (!Array.isArray(rows)) continue;
      parsed.sheets[sheetKey] = rows.map((r) => {
        const rowHandle = normalizeTikTokId(r.idKenh || '').toLowerCase();
        const isMatch =
          (updatedKoc.id && r.kocId === updatedKoc.id) ||
          (cleanHandle && rowHandle === cleanHandle);
        if (!isMatch) return r;
        changed = true;
        return {
          ...r,
          email: updatedKoc.email !== undefined ? updatedKoc.email : r.email,
          zalo: updatedKoc.zalo || updatedKoc.phone || r.zalo,
          nguoiNhanHang:
            updatedKoc.shippingRecipientName ||
            updatedKoc.realName ||
            updatedKoc.stageName ||
            r.nguoiNhanHang,
          sdtNhanHang: updatedKoc.shippingPhone || updatedKoc.phone || r.sdtNhanHang,
          diaChiNhanHang:
            updatedKoc.shippingAddress || updatedKoc.permanentAddress || r.diaChiNhanHang,
          tenTaiKhoanNganHang:
            updatedKoc.companyName || updatedKoc.realName || r.tenTaiKhoanNganHang,
          soTaiKhoan: updatedKoc.bankAccount || r.soTaiKhoan,
          nganHang: updatedKoc.bankName || r.nganHang,
          soCccd: updatedKoc.cccd || updatedKoc.taxCode || r.soCccd,
        };
      });
    }

    if (changed) {
      saveStaffSheetCollection(parsed, true);
    }
  } catch {
    // ignore storage errors
  }
}

export const KOC_MASTER_CONTACT_SYNCED_EVENT = 'upbase:koc-master-contact-synced';

/**
 * Đồng bộ Email / Zalo từ dòng Sheet Listing ngược về Danh bạ KOC (`upbase_saved_kocs_v1` & `/api/kocs`)
 */
export function syncSheetRowContactToKocMaster(params: {
  kocId?: string;
  idKenh?: string;
  email?: string;
  zalo?: string;
  phone?: string;
  shippingRecipientName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  bankName?: string;
  bankAccount?: string;
  cccd?: string;
  allKocs?: KocItem[];
}): void {
  if (typeof window === 'undefined') return;
  const cleanHandle = normalizeTikTokId(params.idKenh || '').toLowerCase();
  if (!params.kocId && !cleanHandle) return;

  try {
    const raw = window.localStorage.getItem('upbase_saved_kocs_v1');
    const savedMap: Record<string, KocItem> = raw ? JSON.parse(raw) : {};

    const matchedFromList = (params.allKocs || []).find((k) => {
      const h = normalizeTikTokId(k.channelId || k.tiktokChannel || '').toLowerCase();
      return (params.kocId && k.id === params.kocId) || (cleanHandle && h === cleanHandle);
    });

    const mapKey = cleanHandle || params.kocId || '';
    const existingSaved =
      (mapKey && savedMap[mapKey]) ||
      Object.values(savedMap).find((k) => {
        const h = normalizeTikTokId(k.channelId || k.tiktokChannel || '').toLowerCase();
        return (params.kocId && k.id === params.kocId) || (cleanHandle && h === cleanHandle);
      });

    const baseKoc = existingSaved || matchedFromList;
    if (!baseKoc) return;

    const updatedKoc: KocItem = {
      ...baseKoc,
      ...(params.email !== undefined ? { email: params.email.trim() } : {}),
      ...(params.zalo !== undefined ? { zalo: params.zalo.trim() } : {}),
      ...(params.phone !== undefined ? { phone: params.phone.trim() } : {}),
      ...(params.shippingRecipientName !== undefined
        ? { shippingRecipientName: params.shippingRecipientName.trim() }
        : {}),
      ...(params.shippingPhone !== undefined
        ? { shippingPhone: params.shippingPhone.trim() }
        : {}),
      ...(params.shippingAddress !== undefined
        ? { shippingAddress: params.shippingAddress.trim() }
        : {}),
      ...(params.bankName !== undefined ? { bankName: params.bankName.trim() } : {}),
      ...(params.bankAccount !== undefined ? { bankAccount: params.bankAccount.trim() } : {}),
      ...(params.cccd !== undefined ? { cccd: params.cccd.trim() } : {}),
    };

    const targetKey =
      normalizeTikTokId(updatedKoc.channelId || '').toLowerCase() || updatedKoc.id;
    if (targetKey) {
      savedMap[targetKey] = updatedKoc;
      window.localStorage.setItem('upbase_saved_kocs_v1', JSON.stringify(savedMap));
    }

    window.dispatchEvent(
      new CustomEvent(KOC_MASTER_CONTACT_SYNCED_EVENT, { detail: updatedKoc })
    );

    void fetch('/api/kocs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ created: [], updated: [updatedKoc] }),
    }).catch(() => undefined);
  } catch {
    // ignore storage errors
  }
}

function cleanTsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Xuất TSV chuẩn Google Sheet / Excel:
 * - Giữ nguyên thứ tự các cột đang hiển thị
 * - Tùy chọn xuất công thức Google Sheet (=CONCAT, =IFS, =N4/0.9, =1-AD4-AE4...) khi bật đầy đủ cột hoặc xuất giá trị chuẩn
 */
export function formatStaffSheetToTsv(
  rows: StaffListingSheetRow[],
  visibleColumns: StaffListingColumnMeta[],
  options: {
    includeHeaders: boolean;
    useGoogleSheetFormulas: boolean;
    startRowNumberInSheet?: number; // Mặc định dòng 4 theo đúng file mẫu Template hệ thống
  }
): string {
  const { includeHeaders, useGoogleSheetFormulas, startRowNumberInSheet = 4 } = options;
  const lines: string[] = [];

  if (includeHeaders) {
    lines.push(visibleColumns.map((c) => cleanTsvCell(c.header)).join('\t'));
  }

  // Tạo bản đồ vị trí cột chữ cái hiện tại (A, B, C...) trong khối dữ liệu được copy
  // Nếu copy toàn bộ 48 cột và dán vào từ cột B của file mẫu, cột sẽ khớp chính xác B -> AW.
  rows.forEach((row, rIdx) => {
    const excelRowNum = startRowNumberInSheet + rIdx;
    const cells = visibleColumns.map((col) => {
      if (useGoogleSheetFormulas) {
        if (col.key === 'linkKenh') {
          return `=CONCAT("https://www.tiktok.com/@",H${excelRowNum})`;
        }
        if (col.key === 'tepBooking') {
          return `=IFS(N${excelRowNum}=0,"Freecast",AND(N${excelRowNum}>0,N${excelRowNum}<500000),"KL1",AND(N${excelRowNum}>=500000,N${excelRowNum}<1500000),"KL2",AND(N${excelRowNum}>=1500000,N${excelRowNum}<3000000),"KL3",AND(N${excelRowNum}>=3000000,N${excelRowNum}<5000000),"KL4",AND(N${excelRowNum}>=5000000,N${excelRowNum}<10000000),"KL5",AND(N${excelRowNum}>=10000000,N${excelRowNum}<30000000),"KL6",N${excelRowNum}>=30000000,"KL7")`;
        }
        if (col.key === 'phiBookingKemThue') {
          return `=ROUND(N${excelRowNum}/0.9,0)`;
        }
        if (col.key === 'gmvTuTheSanPhamPct') {
          return `=1-AD${excelRowNum}-AE${excelRowNum}`;
        }
        if (col.key === 'nuPct') {
          return `=1-AG${excelRowNum}`;
        }
        if (col.key === 'tuoiTren35Pct') {
          return `=1-AI${excelRowNum}-AJ${excelRowNum}`;
        }
      }

      const rawVal = row[col.key];
      // Các cột tỷ lệ % khi xuất công thức sang Google Sheet dạng số thập phân (0.233 = 23.3%) hoặc hiển thị %
      if (
        useGoogleSheetFormulas &&
        (col.key === 'gmvTuVideoPct' ||
          col.key === 'gmvTuLivePct' ||
          col.key === 'namPct' ||
          col.key === 'tuoi18_24Pct' ||
          col.key === 'tuoi25_34Pct' ||
          col.key === 'tuoiOtherPct')
      ) {
        return String(Number(((Number(rawVal) || 0) / 100).toFixed(4)));
      }
      if (
        !useGoogleSheetFormulas &&
        (col.key === 'gmvTuVideoPct' ||
          col.key === 'gmvTuLivePct' ||
          col.key === 'gmvTuTheSanPhamPct' ||
          col.key === 'namPct' ||
          col.key === 'nuPct' ||
          col.key === 'tuoi18_24Pct' ||
          col.key === 'tuoi25_34Pct' ||
          col.key === 'tuoiTren35Pct' ||
          col.key === 'tuoiOtherPct')
      ) {
        return `${Number(rawVal) || 0}%`;
      }

      return cleanTsvCell(rawVal);
    });
    lines.push(cells.join('\t'));
  });

  return lines.join('\n');
}

/**
 * Xuất CSV mở bằng Excel (có BOM UTF-8 tiếng Việt)
 */
export function downloadStaffSheetCsv(
  rows: StaffListingSheetRow[],
  visibleColumns: StaffListingColumnMeta[],
  storeName: string,
  monthKey: string
): void {
  if (typeof window === 'undefined') return;
  const escapeCsv = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = visibleColumns.map((c) => escapeCsv(`[${c.excelCol}] ${c.header}`)).join(',');
  const dataLines = rows.map((row) =>
    visibleColumns
      .map((col) => {
        const val = row[col.key];
        return escapeCsv(val);
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeStore = storeName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeMonth = monthKey.replace(/[^a-zA-Z0-9_-]/g, '-');
  link.href = url;
  link.setAttribute('download', `Template_List_KOL_KOC_${safeStore}_${safeMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
