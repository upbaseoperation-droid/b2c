import type { BookingDealItem, KocItem, StorePortfolioItem, KocListingItem } from './types';
import { formatVndShort } from './format';
import { REAL_LARK_LISTINGS_BY_BOARD_KEY } from './realLarkListings2026';

export type FillMode = 'AUTO_SYSTEM' | 'FORMULA' | 'MANUAL_STAFF';

export interface StaffListingSheetRow {
  id: string;
  kocId?: string;
  createdAt: string;

  // 57 cột chuẩn theo đúng thứ tự A -> BE của Sheet "Template List KOC_TikTok - đã chốt" (QSCWrv)
  ngayDien: string;             // #1  (A)  Ngày điền (Tự động)
  thang: string;                // #2  (B)  Tháng (Tự động: 2026/10)
  nhanSuDien: string;           // #3  (C)  Nhân sự điền (Tự động)
  dot: string;                  // #4  (D)  Đợt listing (Thủ công: Đợt 1, Đợt 2, Đợt 3...)
  store: string;                // #5  (E)  Store (Tự động theo sheet Brand/Gian hàng)
  sanPham: string;              // #6  (F)  Sản phẩm (Nhân viên điền / chọn SKU của Brand)
  idKenh: string;               // #7  (G)  🎃id kênh (Hệ thống tự lấy từ KOC)
  tenKenh: string;              // #8  (H)  Tên người ảnh hưởng (Tên kênh) (Hệ thống tự lấy)
  linkKenh: string;             // #9  (I)  🎃Link kênh (Công thức =CONCAT("https://www.tiktok.com/@",G9))
  follower: number;             // #10 (J)  Follower (Hệ thống tự lấy)
  tepKenh: string;              // #11 (K)  🎃 Tệp kênh (Hệ thống tự lấy + nhân viên chỉnh)
  contentTag: string;           // #12 (L)  Content tag (Thủ công - Pillar Content)
  tepBooking: string;           // #13 (M)  Tệp Booking (Tự động theo Giá net video: Freecast, KL1..KL7)
  giaDaHopTacTruocDo?: number;  // #14 (N)  Giá đã hợp tác trước đó (Giá dự kiến)
  loaiGia?: string;             // #15 (O)  Loại giá (Booking, Code ads, reup Gắn giỏ, SDHA)
  giaNetVideo: number;          // #16 (P)  Giá net video (Hệ thống gợi ý từ hồ sơ / Nhân viên điền)
  phiBookingKemThue: number;    // #17 (Q)  Phí booking kèm thuế TNCN (Công thức = P9/0.9)
  trangThai: string;            // #18 (R)  Trạng thái Quy trình Booking - Tech
  deXuatUpBase: string;         // #19 (S)  Đề xuất từ UpBase (Must Have, Recommend, Optional)
  contentNote: string;          // #20 (T)  Content note (Thủ công)
  brandChon: string;            // #21 (U)  Brand chọn (Yes, No, Cân nhắc, Chờ duyệt)
  lyDoTuChoi: string;           // #22 (V)  Lý do từ chối (Thủ công)
  thanhQuaHopTac: string;       // #23 (W)  Thành quả hợp tác với UB
  thanhQuaBrandNgoai?: string;  // #24 (X)  Thành quả hợp tác với brand ngoài
  doanhSo: number;              // #25 (Y)  Doanh số (nếu có) (= Số món bán ra * AOV)
  doanhSoUocTinh30d?: number;   // #26 (Z)  Doanh số ước tính trong 30 ngày
  soMonBanRa: number;           // #27 (AA) Số món bán ra (Hệ thống tự lấy itemsSold)
  gpm: number;                  // #28 (AB) GPM (Hệ thống tự lấy)
  aov: number;                  // #29 (AC) GMV từ mỗi khách hàng/ AOV (Hệ thống tự lấy)
  viewTrungBinh: number;        // #30 (AD) View trung bình video/ trung vị video
  costPerView?: number;         // #31 (AE) Cost per view (Chi phí / view)
  gmvTuVideoPct: number;        // #32 (AF) Tỉ trọng GMV từ video (%)
  gmvTuLivePct: number;         // #33 (AG) Tỉ trọng GMV từ Live (%)
  gmvTuTheSanPhamPct: number;   // #34 (AH) Tỉ trọng GMV từ thẻ sản phẩm (%)
  tiTrongNganhHang?: string;    // #35 (AI) Tỉ trọng ngành hàng (Top 3 ngành hàng/kênh)
  namPct: number;               // #36 (AJ) Tỉ trọng Nam (%)
  nuPct: number;                // #37 (AK) Tỉ trọng Nữ (%)
  tuoi18_24Pct: number;         // #38 (AL) Tỉ trọng 18-24 (%)
  tuoi25_34Pct: number;         // #39 (AM) Tỉ trọng 25-34 (%)
  tuoiOtherPct: number;         // #40 (AN) Other (%)
  location: string;             // #41 (AO) Location (Hệ thống tự lấy)
  ngayAirPlan: string;          // #42 (AP) Ngày air plan (Nhân viên điền)
  gmvTarget?: number;           // #43 (AQ) GMV Target (View trung bình * CTR * CR * AOV)
  viewTrungVi?: number;         // #44 (AR) View trung vị
  ctrPct?: number;              // #45 (AS) CTR (%)
  crPct?: number;               // #46 (AT) CR (%)
  viewTarget?: number;          // #47 (AU) View Target
  tyLeTuongTacPct?: number;     // #48 (AV) Tỷ lệ tương tác (%)
  email: string;                // #49 (AW) Email (Nội bộ - Tự động điền từ Danh bạ)
  zalo: string;                 // #50 (AX) Zalo (Nội bộ - Tự động điền từ Danh bạ)
  nguoiNhanHang: string;        // #51 (AY) Người nhận hàng (Nội bộ - Tự động điền từ Danh bạ)
  sdtNhanHang: string;          // #52 (AZ) SĐT nhận hàng (Nội bộ - Tự động điền từ Danh bạ)
  diaChiNhanHang: string;       // #53 (BA) Địa chỉ nhận hàng (Nội bộ - Tự động điền từ Danh bạ)
  tenTaiKhoanNganHang: string;  // #54 (BB) Tên tài khoản ngân hàng (Nội bộ - Tự động điền từ Danh bạ)
  soTaiKhoan: string;           // #55 (BC) Số tài khoản (Nội bộ - Tự động điền từ Danh bạ)
  nganHang: string;             // #56 (BD) Ngân hàng (Nội bộ - Tự động điền từ Danh bạ)
  soCccd: string;               // #57 (BE) Số CCCD (Nội bộ - Tự động điền từ Danh bạ)

  // Các trường mở rộng nội bộ & Nghiệm thu Video (File 3.2)
  leaderNote: string;           // #58 (BF) Ghi chú Leader nội bộ
  gmvDaHopTac: number;          // #59 (BG) GMV đã hợp tác cao nhất
  tuoiTren35Pct: number;        // #60 (BH) >35 (%)
  chuyenListDuyetBook?: boolean;
  brandReviewedAt?: string;     // ISO timestamp hệ thống ghi nhận lúc Brand chọn Yes / No / Cân nhắc
  maBooking?: string;           // #61 (BI) Mã Booking (BO...)
  giaChotCuoi?: number;         // #62 (BJ) Chi phí thanh toán Booking chốt cuối
  ngayAirChot?: string;         // #63 (BK) P.Ngày air chốt
  linkAirNghiemThu?: string;    // #64 (BL) 🎃 Link air/Link nghiệm thu
  ngayAirReal?: string;         // #65 (BM) 🎃 Ngày air/live real
  tuanReal?: string;            // #66 (BN) Tuần real
  trangThaiSlaAir?: string;     // #67 (BO) Trễ/Đúng hạn điền link air
  maSparkAds?: string;          // #68 (BP) Mã ủy quyền ads
  viewsNghiemThu?: number;      // #69 (BQ) 🌸 Views 30 ngày
  gmvNghiemThu?: number;        // #70 (BR) 🌸 GMV 30 ngày
  donHangNghiemThu?: number;    // #71 (BS) 🌸 Số đơn hàng 30 ngày
  roiNghiemThu?: number;        // #72 (BT) 🌸 ROI 30 ngày
  trangThaiThanhToan?: string;  // #73 (BU) Trạng thái phiếu thanh toán
  ngayBrandDuyet?: string;      // #74 (BV) Thời gian Brand duyệt (DD/MM/YYYY HH:mm)
  slaBrandDuyet?: string;       // #75 (BW) SLA Brand duyệt (Từ lúc Listing -> Brand duyệt, chuẩn 48h)
}

export type StaffListingColumnKey = keyof Omit<
  StaffListingSheetRow,
  'id' | 'kocId' | 'createdAt' | 'chuyenListDuyetBook' | 'brandReviewedAt'
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
  // 57 cột chuẩn A -> BE của Sheet "Template List KOC_TikTok - đã chốt" (QSCWrv)
  { index: 1, excelCol: 'A', key: 'ngayDien', header: 'Ngày điền', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 138 },
  { index: 2, excelCol: 'B', key: 'thang', header: 'Tháng', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 95 },
  { index: 3, excelCol: 'C', key: 'nhanSuDien', header: 'Nhân sự điền', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 145 },
  { index: 4, excelCol: 'D', key: 'dot', header: 'Đợt listing', group: 'Listing điền', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: false, width: 100 },
  { index: 5, excelCol: 'E', key: 'store', header: 'Store', group: 'Listing điền', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 165 },
  { index: 6, excelCol: 'F', key: 'sanPham', header: 'Sản phẩm', group: 'Đề xuất & Báo giá', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 185 },
  { index: 7, excelCol: 'G', key: 'idKenh', header: '🎃id kênh', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 220 },
  { index: 8, excelCol: 'H', key: 'tenKenh', header: 'Tên người ảnh hưởng (Tên kênh)', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 175 },
  { index: 9, excelCol: 'I', key: 'linkKenh', header: '🎃Link kênh', group: 'Kênh KOC', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 220 },
  { index: 10, excelCol: 'J', key: 'follower', header: 'Follower', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 11, excelCol: 'K', key: 'tepKenh', header: '🎃 Tệp kênh', group: 'Kênh KOC', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 150 },
  { index: 12, excelCol: 'L', key: 'contentTag', header: 'Content tag', group: 'Đề xuất & Báo giá', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 165 },
  { index: 13, excelCol: 'M', key: 'tepBooking', header: 'Tệp Booking', group: 'Đề xuất & Báo giá', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 14, excelCol: 'N', key: 'giaDaHopTacTruocDo', header: 'Giá đã hợp tác trước đó (Giá dự kiến)', group: 'Đề xuất & Báo giá', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 140 },
  { index: 15, excelCol: 'O', key: 'loaiGia', header: 'Loại giá (Booking, Code ads, reup Gắn giỏ, SDHA)', group: 'Đề xuất & Báo giá', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 145 },
  { index: 16, excelCol: 'P', key: 'giaNetVideo', header: 'Giá net video', group: 'Đề xuất & Báo giá', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 17, excelCol: 'Q', key: 'phiBookingKemThue', header: 'Phí booking kèm thuế TNCN', group: 'Đề xuất & Báo giá', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 145 },
  { index: 18, excelCol: 'R', key: 'trangThai', header: 'Trạng thái Quy trình Booking - Tech', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 155 },
  { index: 19, excelCol: 'S', key: 'deXuatUpBase', header: 'Đề xuất từ UpBase', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 135 },
  { index: 20, excelCol: 'T', key: 'contentNote', header: 'Content note', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 240 },
  { index: 21, excelCol: 'U', key: 'brandChon', header: 'Brand chọn', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 150 },
  { index: 22, excelCol: 'V', key: 'lyDoTuChoi', header: 'Lý do từ chối', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 190 },
  { index: 23, excelCol: 'W', key: 'thanhQuaHopTac', header: 'Thành quả hợp tác với UB', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 230 },
  { index: 24, excelCol: 'X', key: 'thanhQuaBrandNgoai', header: 'Thành quả hợp tác với brand ngoài', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 210 },
  { index: 25, excelCol: 'Y', key: 'doanhSo', header: 'Doanh số (nếu có)', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 26, excelCol: 'Z', key: 'doanhSoUocTinh30d', header: 'Doanh số ước tính trong 30 ngày', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 145 },
  { index: 27, excelCol: 'AA', key: 'soMonBanRa', header: 'Số món bán ra', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 115 },
  { index: 28, excelCol: 'AB', key: 'gpm', header: 'GPM', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 110 },
  { index: 29, excelCol: 'AC', key: 'aov', header: 'GMV từ mỗi khách hàng/ AOV', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 30, excelCol: 'AD', key: 'viewTrungBinh', header: 'View trung bình video/ trung vị video', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 135 },
  { index: 31, excelCol: 'AE', key: 'costPerView', header: 'Cost per view', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 110 },
  { index: 32, excelCol: 'AF', key: 'gmvTuVideoPct', header: 'Tỉ trọng GMV từ video', group: 'GMV từ mỗi kênh bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 115 },
  { index: 33, excelCol: 'AG', key: 'gmvTuLivePct', header: 'Tỉ trọng GMV từ Live', group: 'GMV từ mỗi kênh bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 115 },
  { index: 34, excelCol: 'AH', key: 'gmvTuTheSanPhamPct', header: 'Tỉ trọng GMV từ thẻ sản phẩm', group: 'GMV từ mỗi kênh bán hàng', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 35, excelCol: 'AI', key: 'tiTrongNganhHang', header: 'Tỉ trọng ngành hàng', group: 'Người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 165 },
  { index: 36, excelCol: 'AJ', key: 'namPct', header: 'Tỉ trọng Nam', group: 'Người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 100 },
  { index: 37, excelCol: 'AK', key: 'nuPct', header: 'Tỉ trọng Nữ', group: 'Người theo dõi', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 100 },
  { index: 38, excelCol: 'AL', key: 'tuoi18_24Pct', header: 'Tỉ trọng 18-24', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 39, excelCol: 'AM', key: 'tuoi25_34Pct', header: 'Tỉ trọng 25-34', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 105 },
  { index: 40, excelCol: 'AN', key: 'tuoiOtherPct', header: 'Other', group: 'Độ tuổi người theo dõi', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 95 },
  { index: 41, excelCol: 'AO', key: 'location', header: 'Location', group: 'Độ tuổi người theo dõi', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 120 },
  { index: 42, excelCol: 'AP', key: 'ngayAirPlan', header: 'Ngày air plan', group: 'Lịch Air & Hậu cần', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: true, width: 125 },
  { index: 43, excelCol: 'AQ', key: 'gmvTarget', header: 'GMV Target', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: true, width: 130 },
  { index: 44, excelCol: 'AR', key: 'viewTrungVi', header: 'View trung vị', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 120 },
  { index: 45, excelCol: 'AS', key: 'ctrPct', header: 'CTR', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 46, excelCol: 'AT', key: 'crPct', header: 'CR', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 90 },
  { index: 47, excelCol: 'AU', key: 'viewTarget', header: 'View Target', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 120 },
  { index: 48, excelCol: 'AV', key: 'tyLeTuongTacPct', header: 'Tỷ lệ tương tác', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: true, width: 115 },
  { index: 49, excelCol: 'AW', key: 'email', header: 'Email', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 220 },
  { index: 50, excelCol: 'AX', key: 'zalo', header: 'Zalo', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 120 },
  { index: 51, excelCol: 'AY', key: 'nguoiNhanHang', header: 'Người nhận hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 150 },
  { index: 52, excelCol: 'AZ', key: 'sdtNhanHang', header: 'SĐT nhận hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 125 },
  { index: 53, excelCol: 'BA', key: 'diaChiNhanHang', header: 'Địa chỉ nhận hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 230 },
  { index: 54, excelCol: 'BB', key: 'tenTaiKhoanNganHang', header: 'Tên tài khoản ngân hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 165 },
  { index: 55, excelCol: 'BC', key: 'soTaiKhoan', header: 'Số tài khoản', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 140 },
  { index: 56, excelCol: 'BD', key: 'nganHang', header: 'Ngân hàng', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 140 },
  { index: 57, excelCol: 'BE', key: 'soCccd', header: 'Số CCCD', group: 'Thông tin liên hệ & Thanh toán', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 135 },
  // Các cột mở rộng nội bộ & Nghiệm thu (File 3.2)
  { index: 58, excelCol: 'BF', key: 'leaderNote', header: 'Growth/ account/leader note', group: 'Đề xuất & Phê duyệt', fillMode: 'MANUAL_STAFF', inLarkBase: true, inBrandWorkingFile: false, width: 190 },
  { index: 59, excelCol: 'BG', key: 'gmvDaHopTac', header: 'GMV đã hợp tác', group: 'Chỉ số & Lịch sử bán hàng', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 150 },
  { index: 60, excelCol: 'BH', key: 'tuoiTren35Pct', header: '>35', group: 'Độ tuổi người theo dõi', fillMode: 'FORMULA', inLarkBase: true, inBrandWorkingFile: false, width: 90 },
  { index: 61, excelCol: 'BI', key: 'maBooking', header: 'Mã Booking (BO...)', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 135 },
  { index: 62, excelCol: 'BJ', key: 'giaChotCuoi', header: '🎃Chi phí thanh toán Booking (Giá cuối)', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 140 },
  { index: 63, excelCol: 'BK', key: 'ngayAirChot', header: 'P.Ngày air (Chốt)', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 120 },
  { index: 64, excelCol: 'BL', key: 'linkAirNghiemThu', header: '🎃 Link air/Link nghiệm thu', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 230 },
  { index: 65, excelCol: 'BM', key: 'ngayAirReal', header: '🎃 Ngày air/live real', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 125 },
  { index: 66, excelCol: 'BN', key: 'tuanReal', header: 'Tuần real', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 95 },
  { index: 67, excelCol: 'BO', key: 'trangThaiSlaAir', header: 'Trễ/Đúng hạn điền link air', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 140 },
  { index: 68, excelCol: 'BP', key: 'maSparkAds', header: 'Mã ủy quyền ads', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 165 },
  { index: 69, excelCol: 'BQ', key: 'viewsNghiemThu', header: '🌸 Views 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 115 },
  { index: 70, excelCol: 'BR', key: 'gmvNghiemThu', header: '🌸 GMV 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 125 },
  { index: 71, excelCol: 'BS', key: 'donHangNghiemThu', header: '🌸 Số đơn hàng 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 115 },
  { index: 72, excelCol: 'BT', key: 'roiNghiemThu', header: '🌸 ROI 30 ngày', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'FORMULA', inLarkBase: false, inBrandWorkingFile: false, width: 100 },
  { index: 73, excelCol: 'BU', key: 'trangThaiThanhToan', header: 'Trạng thái phiếu thanh toán', group: 'Chốt Book & Nghiệm thu (File 3.2)', fillMode: 'AUTO_SYSTEM', inLarkBase: false, inBrandWorkingFile: false, width: 155 },
  { index: 74, excelCol: 'BV', key: 'ngayBrandDuyet', header: 'Thời gian Brand duyệt', group: 'Đề xuất & Phê duyệt', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 145 },
  { index: 75, excelCol: 'BW', key: 'slaBrandDuyet', header: 'SLA Brand duyệt (48h)', group: 'Đề xuất & Phê duyệt', fillMode: 'AUTO_SYSTEM', inLarkBase: true, inBrandWorkingFile: false, width: 160 },
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

export type StaffSheetRoleTier = 'SUPPORT' | 'PRIMARY_PIC' | 'LEADER' | 'ADMIN';

export interface StaffSheetFieldEditPolicy {
  /** Phạm vi dòng mà Nhân viên hỗ trợ (Booking Support) được phép sửa */
  supportRowScope: 'OWN_ROWS_ONLY' | 'ALL_STORE_ROWS';
  /** Khi Brand chọn = Yes (đã duyệt), khóa các trường đề xuất/báo giá ban đầu đối với Nhân viên hỗ trợ & PIC */
  lockProposalAfterBrandApproved: boolean;
  /** Cho phép Nhân viên hỗ trợ bấm đẩy dữ liệu lên Google Sheet hay chỉ PIC Chính / Leader / Admin */
  allowSupportPushToSheet: boolean;
  /** Danh sách các trường (key cột) được phép sửa theo từng cấp nhân sự */
  editableFieldsByRole: {
    SUPPORT: StaffListingColumnKey[];
    PRIMARY_PIC: StaffListingColumnKey[];
    LEADER: StaffListingColumnKey[];
  };
  updatedAt?: string;
}

export interface StaffSheetConfigurableFieldGroup {
  id: string;
  title: string;
  badge: string;
  fields: StaffListingColumnKey[];
}

/** Các cột do hệ thống tự động sinh hoặc chạy công thức cố định (không mở sửa tay) */
export const STAFF_SHEET_READONLY_SYSTEM_COLUMNS: StaffListingColumnKey[] = [
  'ngayDien',
  'thang',
  'nhanSuDien',
  'store',
  'linkKenh',
  'tepBooking',
  'phiBookingKemThue',
  'gmvTuTheSanPhamPct',
  'nuPct',
  'tuoiTren35Pct',
  'maBooking',
  'trangThaiSlaAir',
  'roiNghiemThu',
  'trangThaiThanhToan',
  'ngayBrandDuyet',
  'slaBrandDuyet',
];

/** Các trường đề xuất ban đầu sẽ tự khóa đối với Support/PIC sau khi Brand chọn = Yes (nếu bật quy tắc khóa) */
export const STAFF_SHEET_INITIAL_PROPOSAL_COLUMNS: StaffListingColumnKey[] = [
  'dot',
  'contentTag',
  'idKenh',
  'tepKenh',
  'sanPham',
  'tenKenh',
  'giaNetVideo',
  'deXuatUpBase',
];

export const STAFF_SHEET_CONFIGURABLE_FIELD_GROUPS: StaffSheetConfigurableFieldGroup[] = [
  {
    id: 'PROPOSAL_QUOTE',
    title: '1. Đề xuất KOC, Sản phẩm & Báo giá Listing',
    badge: 'Giai đoạn đề xuất',
    fields: [
      'dot',
      'contentTag',
      'idKenh',
      'tepKenh',
      'sanPham',
      'tenKenh',
      'giaNetVideo',
      'trangThai',
      'deXuatUpBase',
      'contentNote',
      'ngayAirPlan',
    ],
  },
  {
    id: 'APPROVAL_DECISION',
    title: '2. Sơ duyệt Nội bộ & Kết quả Phê duyệt từ Brand',
    badge: 'Sơ duyệt & Brand',
    fields: ['leaderNote', 'brandChon', 'lyDoTuChoi'],
  },
  {
    id: 'CONTACT_LOGISTICS',
    title: '3. Thông tin Liên hệ, Gửi mẫu (FOC) & Ngân hàng KOC',
    badge: 'Hậu cần & Thanh toán',
    fields: [
      'email',
      'zalo',
      'nguoiNhanHang',
      'sdtNhanHang',
      'diaChiNhanHang',
      'tenTaiKhoanNganHang',
      'soTaiKhoan',
      'nganHang',
      'soCccd',
    ],
  },
  {
    id: 'AIR_ACCEPTANCE',
    title: '4. Đi Air Video & Nghiệm thu 30 ngày (File 3.2)',
    badge: 'Đi Air & Nghiệm thu',
    fields: [
      'giaChotCuoi',
      'ngayAirChot',
      'linkAirNghiemThu',
      'ngayAirReal',
      'tuanReal',
      'maSparkAds',
      'viewsNghiemThu',
      'gmvNghiemThu',
      'donHangNghiemThu',
    ],
  },
  {
    id: 'CHANNEL_METRICS',
    title: '5. Chỉ số Kênh & Lịch sử Bán hàng (Mặc định lấy từ Danh bạ KOC)',
    badge: 'Chỉ số kênh',
    fields: [
      'follower',
      'thanhQuaHopTac',
      'gmvDaHopTac',
      'doanhSo',
      'soMonBanRa',
      'gpm',
      'aov',
      'viewTrungBinh',
      'gmvTuVideoPct',
      'gmvTuLivePct',
      'namPct',
      'tuoi18_24Pct',
      'tuoi25_34Pct',
      'tuoiOtherPct',
      'location',
    ],
  },
];

export const DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY: StaffSheetFieldEditPolicy = {
  supportRowScope: 'OWN_ROWS_ONLY',
  lockProposalAfterBrandApproved: true,
  allowSupportPushToSheet: false,
  editableFieldsByRole: {
    SUPPORT: [
      // Nhóm 1: Đề xuất & Báo giá
      'dot',
      'contentTag',
      'idKenh',
      'tepKenh',
      'sanPham',
      'tenKenh',
      'giaNetVideo',
      'trangThai',
      'deXuatUpBase',
      'contentNote',
      'ngayAirPlan',
      // Nhóm 3: Liên hệ & Nhận mẫu
      'email',
      'zalo',
      'nguoiNhanHang',
      'sdtNhanHang',
      'diaChiNhanHang',
      'tenTaiKhoanNganHang',
      'soTaiKhoan',
      'nganHang',
      'soCccd',
      // Nhóm 4: Điền link air thực tế & Spark Ads
      'linkAirNghiemThu',
      'ngayAirReal',
      'tuanReal',
      'maSparkAds',
    ],
    PRIMARY_PIC: [
      // Nhóm 1: Đề xuất & Báo giá
      'dot',
      'contentTag',
      'idKenh',
      'tepKenh',
      'sanPham',
      'tenKenh',
      'giaNetVideo',
      'trangThai',
      'deXuatUpBase',
      'contentNote',
      'ngayAirPlan',
      // Nhóm 2: Kết quả Brand & Ghi chú
      'leaderNote',
      'brandChon',
      'lyDoTuChoi',
      // Nhóm 3: Liên hệ & Nhận mẫu
      'email',
      'zalo',
      'nguoiNhanHang',
      'sdtNhanHang',
      'diaChiNhanHang',
      'tenTaiKhoanNganHang',
      'soTaiKhoan',
      'nganHang',
      'soCccd',
      // Nhóm 4: Đi Air & Nghiệm thu
      'giaChotCuoi',
      'ngayAirChot',
      'linkAirNghiemThu',
      'ngayAirReal',
      'tuanReal',
      'maSparkAds',
      'viewsNghiemThu',
      'gmvNghiemThu',
      'donHangNghiemThu',
      // Bổ sung chỉnh chỉ số cơ bản khi cần
      'follower',
      'thanhQuaHopTac',
    ],
    LEADER: [
      // Toàn bộ các trường cấu hình Nhóm 1 -> Nhóm 5
      'dot',
      'contentTag',
      'idKenh',
      'tepKenh',
      'sanPham',
      'tenKenh',
      'giaNetVideo',
      'trangThai',
      'deXuatUpBase',
      'contentNote',
      'ngayAirPlan',
      'leaderNote',
      'brandChon',
      'lyDoTuChoi',
      'email',
      'zalo',
      'nguoiNhanHang',
      'sdtNhanHang',
      'diaChiNhanHang',
      'tenTaiKhoanNganHang',
      'soTaiKhoan',
      'nganHang',
      'soCccd',
      'giaChotCuoi',
      'ngayAirChot',
      'linkAirNghiemThu',
      'ngayAirReal',
      'tuanReal',
      'maSparkAds',
      'viewsNghiemThu',
      'gmvNghiemThu',
      'donHangNghiemThu',
      'follower',
      'thanhQuaHopTac',
      'gmvDaHopTac',
      'doanhSo',
      'soMonBanRa',
      'gpm',
      'aov',
      'viewTrungBinh',
      'gmvTuVideoPct',
      'gmvTuLivePct',
      'namPct',
      'tuoi18_24Pct',
      'tuoi25_34Pct',
      'tuoiOtherPct',
      'location',
    ],
  },
};

export interface StaffBrandSheetCollection {
  /** key = `${monthKey}__${brandOrStoreKey}` */
  sheets: Record<string, StaffListingSheetRow[]>;
  googleSheetUrls: BrandGoogleSheetLinkMap;
  fieldEditPolicy?: StaffSheetFieldEditPolicy;
}

const STORAGE_KEY = 'upbase_b2c_staff_brand_listing_sheets_v2';
const LEGACY_STORAGE_KEY_V1 = 'upbase_b2c_staff_brand_listing_sheets_v1';
export const STAFF_SHEET_UPDATED_EVENT = 'upbase-staff-brand-sheet-updated';

let memoryCollectionCache: StaffBrandSheetCollection | null = null;
let lastPersistedSnapshot: StaffBrandSheetCollection | null = null;
let localStorageSaveTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('upbase:staff-sheet-db-hydrated', () => {
    memoryCollectionCache = null;
  });
}

export function normalizeStaffSheetFieldEditPolicy(
  raw?: Partial<StaffSheetFieldEditPolicy> | null
): StaffSheetFieldEditPolicy {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY,
      editableFieldsByRole: {
        SUPPORT: [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.SUPPORT],
        PRIMARY_PIC: [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.PRIMARY_PIC],
        LEADER: [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.LEADER],
      },
    };
  }
  const byRole = raw.editableFieldsByRole;
  return {
    supportRowScope:
      raw.supportRowScope === 'ALL_STORE_ROWS' ? 'ALL_STORE_ROWS' : 'OWN_ROWS_ONLY',
    lockProposalAfterBrandApproved:
      typeof raw.lockProposalAfterBrandApproved === 'boolean'
        ? raw.lockProposalAfterBrandApproved
        : DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.lockProposalAfterBrandApproved,
    allowSupportPushToSheet:
      typeof raw.allowSupportPushToSheet === 'boolean'
        ? raw.allowSupportPushToSheet
        : DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.allowSupportPushToSheet,
    editableFieldsByRole: {
      SUPPORT: Array.isArray(byRole?.SUPPORT)
        ? [...byRole.SUPPORT]
        : [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.SUPPORT],
      PRIMARY_PIC: Array.isArray(byRole?.PRIMARY_PIC)
        ? [...byRole.PRIMARY_PIC]
        : [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.PRIMARY_PIC],
      LEADER: Array.isArray(byRole?.LEADER)
        ? [...byRole.LEADER]
        : [...DEFAULT_STAFF_SHEET_FIELD_EDIT_POLICY.editableFieldsByRole.LEADER],
    },
    updatedAt: raw.updatedAt,
  };
}

const CACHED_DEFAULT_FIELD_EDIT_POLICY: StaffSheetFieldEditPolicy =
  normalizeStaffSheetFieldEditPolicy(null);

export function getStaffSheetFieldEditPolicy(
  collection?: StaffBrandSheetCollection | null
): StaffSheetFieldEditPolicy {
  if (collection?.fieldEditPolicy) {
    return normalizeStaffSheetFieldEditPolicy(collection.fieldEditPolicy);
  }
  if (collection) {
    return CACHED_DEFAULT_FIELD_EDIT_POLICY;
  }
  if (memoryCollectionCache?.fieldEditPolicy) {
    return normalizeStaffSheetFieldEditPolicy(memoryCollectionCache.fieldEditPolicy);
  }
  if (memoryCollectionCache) {
    return CACHED_DEFAULT_FIELD_EDIT_POLICY;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StaffBrandSheetCollection;
        if (parsed?.fieldEditPolicy) {
          return normalizeStaffSheetFieldEditPolicy(parsed.fieldEditPolicy);
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  return CACHED_DEFAULT_FIELD_EDIT_POLICY;
}

export function saveStaffSheetFieldEditPolicy(
  nextPolicy: StaffSheetFieldEditPolicy
): StaffSheetFieldEditPolicy {
  const normalized = normalizeStaffSheetFieldEditPolicy({
    ...nextPolicy,
    updatedAt: new Date().toISOString(),
  });
  if (typeof window === 'undefined') return normalized;
  try {
    const baseCollection: StaffBrandSheetCollection = memoryCollectionCache
      ? memoryCollectionCache
      : (() => {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          return raw
            ? (JSON.parse(raw) as StaffBrandSheetCollection)
            : { sheets: {}, googleSheetUrls: {} };
        })();
    const updatedCollection: StaffBrandSheetCollection = {
      sheets: baseCollection.sheets || {},
      googleSheetUrls: baseCollection.googleSheetUrls || {},
      fieldEditPolicy: normalized,
    };
    saveStaffSheetCollection(updatedCollection, true);
  } catch {
    // ignore storage errors
  }
  return normalized;
}

/**
 * Kiểm tra nhân sự có được phép sửa một ô (cột) cụ thể trên dòng hay không
 */
export function canStaffEditSheetField(params: {
  policy: StaffSheetFieldEditPolicy;
  roleTier: StaffSheetRoleTier;
  colKey: StaffListingColumnKey;
  isOwnRow: boolean;
  isBrandApproved: boolean;
}): { allowed: boolean; reason?: string } {
  const { policy, roleTier, colKey, isOwnRow, isBrandApproved } = params;

  // Các cột công thức hoặc tự động cố định của hệ thống
  if (STAFF_SHEET_READONLY_SYSTEM_COLUMNS.includes(colKey)) {
    return { allowed: false, reason: 'Cột công thức / hệ thống tự động tính' };
  }

  // Admin / Manager có toàn quyền sửa mọi trường cấu hình
  if (roleTier === 'ADMIN') {
    return { allowed: true };
  }

  // Kiểm tra phạm vi dòng đối với Nhân viên hỗ trợ
  if (
    roleTier === 'SUPPORT' &&
    policy.supportRowScope === 'OWN_ROWS_ONLY' &&
    !isOwnRow
  ) {
    return {
      allowed: false,
      reason: 'Nhân viên hỗ trợ chỉ sửa các dòng do mình thêm vào bảng',
    };
  }

  // Kiểm tra quy tắc khóa trường đề xuất ban đầu sau khi Brand đã duyệt (Brand chọn = Yes)
  if (
    isBrandApproved &&
    policy.lockProposalAfterBrandApproved &&
    (roleTier === 'SUPPORT' || roleTier === 'PRIMARY_PIC') &&
    STAFF_SHEET_INITIAL_PROPOSAL_COLUMNS.includes(colKey)
  ) {
    return {
      allowed: false,
      reason: 'Đã khóa trường đề xuất & báo giá ban đầu vì Brand đã duyệt (Yes)',
    };
  }

  const allowedList = policy.editableFieldsByRole[roleTier] || [];
  if (!allowedList.includes(colKey)) {
    const roleLabel =
      roleTier === 'SUPPORT'
        ? 'Nhân viên hỗ trợ'
        : roleTier === 'PRIMARY_PIC'
          ? 'PIC Chính'
          : 'Leader';
    return {
      allowed: false,
      reason: `Quản trị viên chưa mở quyền sửa cột này cho cấp ${roleLabel}`,
    };
  }

  return { allowed: true };
}

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
 * Công thức Phí booking kèm thuế TNCN (Cột O) theo chuẩn BR-09:
 * - Cá nhân (TNCN 10%): Dưới 2.000.000đ không khấu trừ thuế (Gross = Net); từ 2.000.000đ trở lên tính Gross = Net / 0.9
 * - Hộ kinh doanh / FOC: Gross = Net
 * - Công ty / MCN (VAT 8%): Gross = Net * 1.08
 */
export function computeGrossFeeWithTax(netFee: number, loaiTaiKhoan?: string): number {
  const n = Math.max(0, Math.round(Number(netFee) || 0));
  if (n <= 0) return 0;
  const acct = (loaiTaiKhoan || '').toLowerCase();
  if (acct.includes('foc') || acct.includes('hộ kinh doanh')) {
    return n;
  }
  if (acct.includes('công ty') || acct.includes('mcn') || acct.includes('vat')) {
    return Math.round(n * 1.08);
  }
  if (n < 2_000_000) return n;
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

let vnDateTimeFormatterSingleton: Intl.DateTimeFormat | null = null;
function getVnDateTimeFormatter(): Intl.DateTimeFormat {
  if (!vnDateTimeFormatterSingleton) {
    vnDateTimeFormatterSingleton = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return vnDateTimeFormatterSingleton;
}

/**
 * Định dạng Ngày & Giờ chuẩn Việt Nam (UTC+7): DD/MM/YYYY HH:mm
 */
export function formatVnDateTime(date: Date = new Date()): string {
  try {
    const parts = getVnDateTimeFormatter().formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
  } catch {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  }
}

export const SLA_BRAND_REVIEW_HOURS = 48;

/**
 * Đọc mốc thời gian từ chuỗi DD/MM/YYYY HH:mm (giờ VN UTC+7) hoặc ISO fallback sang milliseconds
 */
export function parseVnDateTimeToMs(
  vnDateOrTime?: string,
  isoFallback?: string
): number | null {
  const raw = String(vnDateOrTime || '').trim();
  const match = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hasTime = match[4] !== undefined && match[5] !== undefined;
    if (hasTime) {
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const second = Number(match[6] || 0);
      // Quy đổi từ UTC+7 sang UTC epoch ms
      return Date.UTC(year, month - 1, day, hour - 7, minute, second);
    }
    if (isoFallback) {
      const parsedIso = Date.parse(isoFallback);
      if (Number.isFinite(parsedIso)) return parsedIso;
    }
    // Mặc định 09:00 sáng giờ VN nếu dữ liệu cũ chỉ có DD/MM/YYYY
    return Date.UTC(year, month - 1, day, 9 - 7, 0, 0);
  }
  if (isoFallback) {
    const parsedIso = Date.parse(isoFallback);
    if (Number.isFinite(parsedIso)) return parsedIso;
  }
  return null;
}

function formatDurationHoursText(hours: number): string {
  const safeHours = Math.max(0, hours);
  if (safeHours < 1) {
    const mins = Math.max(1, Math.round(safeHours * 60));
    return `${mins} phút`;
  }
  if (safeHours < 24) {
    return `${safeHours.toFixed(1)}h`;
  }
  const days = (safeHours / 24).toFixed(1);
  return `${days} ngày (${Math.round(safeHours)}h)`;
}

export interface ListingBrandSlaInfo {
  label: string;
  elapsedHours: number | null;
  status: 'ON_TIME' | 'OVERDUE' | 'WAITING' | 'WAITING_OVERDUE';
}

/**
 * Đo lường SLA từ thời điểm Listing KOC lên (ngayDien / createdAt) đến thời điểm Brand duyệt (ngayBrandDuyet / brandReviewedAt)
 * Chuẩn SLA phản hồi duyệt Listing của Brand: 48 giờ (2 ngày)
 */
export function computeListingToBrandSla(params: {
  ngayDien?: string;
  createdAt?: string;
  brandChon?: string;
  ngayBrandDuyet?: string;
  brandReviewedAt?: string;
}): ListingBrandSlaInfo {
  const { ngayDien, createdAt, brandChon, ngayBrandDuyet, brandReviewedAt } = params;
  const startMs = parseVnDateTimeToMs(ngayDien, createdAt);
  const cleanDecision = (brandChon || '').trim();
  const isReviewed =
    cleanDecision === 'Yes' || cleanDecision === 'No' || cleanDecision === 'Cân nhắc';

  if (isReviewed) {
    const endMs = parseVnDateTimeToMs(ngayBrandDuyet, brandReviewedAt);
    if (!startMs || !endMs) {
      return {
        label: 'Đã duyệt',
        elapsedHours: null,
        status: 'ON_TIME',
      };
    }
    const diffHours = Math.max(0.05, (endMs - startMs) / 3_600_000);
    const durText = formatDurationHoursText(diffHours);
    if (diffHours <= SLA_BRAND_REVIEW_HOURS) {
      return {
        label: `Đúng hạn (${durText})`,
        elapsedHours: diffHours,
        status: 'ON_TIME',
      };
    }
    return {
      label: `Trễ SLA (${durText})`,
      elapsedHours: diffHours,
      status: 'OVERDUE',
    };
  }

  if (!startMs) {
    return {
      label: 'Chờ Brand duyệt',
      elapsedHours: null,
      status: 'WAITING',
    };
  }

  const waitHours = Math.max(0.05, (Date.now() - startMs) / 3_600_000);
  const durText = formatDurationHoursText(waitHours);
  if (waitHours <= SLA_BRAND_REVIEW_HOURS) {
    return {
      label: `Đang chờ (${durText})`,
      elapsedHours: waitHours,
      status: 'WAITING',
    };
  }
  return {
    label: `Quá hạn chờ (${durText})`,
    elapsedHours: waitHours,
    status: 'WAITING_OVERDUE',
  };
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
  listedAtDate?: Date;
  brandReviewedAtDate?: Date;
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
    listedAtDate,
    brandReviewedAtDate,
  } = params;

  const cleanId = normalizeTikTokId(koc.channelId || koc.tiktokChannel || '');
  const linkKenh = koc.channelLink?.trim() || buildTikTokChannelUrl(cleanId);
  const netFee = Number(koc.rateCardVideo ?? 0);
  const tepBooking = computeTepBookingFromNetFee(netFee);
  const grossFee = computeGrossFeeWithTax(netFee);

  // Tìm lịch sử hợp tác UpBase từ deals
  const safeDeals = Array.isArray(deals) ? deals : [];
  const kocDeals = safeDeals.filter((d) => {
    if (!d) return false;
    const dHandle = normalizeTikTokId(d.kocChannelId || '');
    return (
      (koc.id && d.kocId === koc.id) ||
      (cleanId && dHandle && dHandle.toLowerCase() === cleanId.toLowerCase()) ||
      (d.kocStageName || '').trim().toLowerCase() === (koc.stageName || '').trim().toLowerCase()
    );
  });

  const maxDealGmv = kocDeals.reduce(
    (max, d) => Math.max(max, Number(d.affiliateGmv || d.gmv30 || 0)),
    Number(koc.gmvBestCase || 0)
  );

  let thanhQuaText = '';
  if (kocDeals.length > 0) {
    const topBrands = Array.from(new Set(kocDeals.map((d) => d.brandName).filter(Boolean))).slice(0, 3);
    const totalDealsCount = Math.max(koc.totalPastDeals || 0, kocDeals.length);
    const brandNote = topBrands.length > 0 ? ` (${topBrands.join(', ')})` : koc.brandName ? ` (${koc.brandName})` : '';
    thanhQuaText = `Đã hợp tác ${totalDealsCount} job tại UpBase${brandNote}`;
    if (maxDealGmv > 0) {
      thanhQuaText += ` · GMV cao nhất: ${formatVndShort(maxDealGmv)}`;
    }
  } else if (koc.totalPastDeals && koc.totalPastDeals > 0) {
    const brandNote = koc.brandName ? ` (${koc.brandName})` : '';
    thanhQuaText = `Đã hợp tác ${koc.totalPastDeals} job tại UpBase${brandNote}`;
    if (koc.totalPastGmv && koc.totalPastGmv > 0) {
      thanhQuaText += ` · Tổng GMV: ${formatVndShort(koc.totalPastGmv)}`;
    }
  } else {
    thanhQuaText = 'KOC mới đề xuất hợp tác';
  }

  // Tỷ trọng GMV theo kênh bán hàng (%) — RULE-DATA-01: Chỉ hiển thị số liệu thực tế từ hồ sơ KOC
  const videoShare = Number(koc.gmvShareVideo ?? 0);
  const liveShare = Number(koc.gmvShareLive ?? 0);
  const cardShare =
    videoShare > 0 || liveShare > 0
      ? Math.max(0, Number((100 - videoShare - liveShare).toFixed(2)))
      : 0;

  // Tỷ trọng Giới tính (%)
  const nuPct = Number(koc.femaleRatio ?? 0);
  const namPct = Number(
    koc.maleRatio ?? (nuPct > 0 ? Math.max(0, Number((100 - nuPct).toFixed(2))) : 0)
  );

  // Tỷ trọng Độ tuổi (%)
  const age18_24 = Number(koc.age18_24 ?? 0);
  const age25_34 = Number(koc.age25_34 ?? 0);
  const ageOther = 0;
  const ageOver35 =
    age18_24 > 0 || age25_34 > 0
      ? Math.max(0, Number((100 - age18_24 - age25_34 - ageOther).toFixed(2)))
      : 0;

  const listedDate = listedAtDate || new Date();
  const createdAtIso = listedDate.toISOString();
  const ngayDienFormatted = formatVnDateTime(listedDate);

  const initialBrandChon =
    koc.brandApprovalStatus === 'ĐÃ_DUYỆT'
      ? 'Yes'
      : koc.brandApprovalStatus === 'TỪ_CHỐI'
        ? 'No'
        : 'Chờ duyệt';

  const isInitiallyReviewed = initialBrandChon === 'Yes' || initialBrandChon === 'No';
  const reviewDate = isInitiallyReviewed ? brandReviewedAtDate : undefined;
  const brandReviewedAtIso = reviewDate ? reviewDate.toISOString() : undefined;
  const ngayBrandDuyetFormatted = reviewDate ? formatVnDateTime(reviewDate) : '';

  const slaInfo = computeListingToBrandSla({
    ngayDien: ngayDienFormatted,
    createdAt: createdAtIso,
    brandChon: initialBrandChon,
    ngayBrandDuyet: ngayBrandDuyetFormatted,
    brandReviewedAt: brandReviewedAtIso,
  });

  const avgViewsVal = Number(koc.avgViews ?? 0);
  const medianViewsVal = Number(koc.medianViews ?? avgViewsVal);
  const aovVal = Number(koc.aov ?? 0);
  const ctrVal = Number(koc.tiktokAvgCtr ?? 0);
  const crVal = Number(koc.tiktokAvgCvr ?? 0);
  const engRateVal = Number(koc.engagementRate ?? 0);
  const cpvVal = avgViewsVal > 0 ? Math.round(netFee / avgViewsVal) : 0;
  const gmvTargetVal =
    avgViewsVal > 0 && aovVal > 0 && ctrVal > 0 && crVal > 0
      ? Math.round(avgViewsVal * (ctrVal / 100) * (crVal / 100) * aovVal)
      : Number(koc.recentRevenue ?? 0);
  const lastHistPrice =
    kocDeals.length > 0
      ? Number(kocDeals[0].totalValue || koc.minRate || netFee)
      : Number(koc.minRate || netFee);
  const topCategoriesText =
    koc.tiktokTopCategories && koc.tiktokTopCategories.length > 0
      ? koc.tiktokTopCategories.slice(0, 3).join(', ')
      : koc.niche || koc.kocCategory || '';

  return {
    id: `sheet-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kocId: koc.id,
    createdAt: createdAtIso,
    ngayDien: ngayDienFormatted,
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
    giaDaHopTacTruocDo: lastHistPrice,
    loaiGia: 'Booking',
    giaNetVideo: netFee,
    phiBookingKemThue: grossFee,
    follower: Number(koc.followers || 0),
    trangThai,
    deXuatUpBase,
    leaderNote: koc.accountComment || '',
    contentNote: contentNote || koc.contentNote || '',
    brandChon: initialBrandChon,
    lyDoTuChoi: koc.brandRejectReason || '',
    thanhQuaHopTac: thanhQuaText,
    thanhQuaBrandNgoai: koc.workedBrands?.length
      ? `Đã hợp tác: ${koc.workedBrands.slice(0, 3).join(', ')}`
      : '',
    gmvDaHopTac: maxDealGmv,
    doanhSo: Number(koc.recentRevenue ?? 0),
    doanhSoUocTinh30d: Number(koc.recentRevenue ?? maxDealGmv ?? 0),
    soMonBanRa: Number(koc.itemsSold ?? 0),
    gpm: Number(koc.gpm ?? 0),
    aov: aovVal,
    viewTrungBinh: avgViewsVal,
    costPerView: cpvVal,
    gmvTuVideoPct: videoShare,
    gmvTuLivePct: liveShare,
    gmvTuTheSanPhamPct: cardShare,
    tiTrongNganhHang: topCategoriesText,
    namPct,
    nuPct,
    tuoi18_24Pct: age18_24,
    tuoi25_34Pct: age25_34,
    tuoiTren35Pct: ageOver35,
    tuoiOtherPct: ageOver35,
    location: koc.location || '',
    ngayAirPlan,
    gmvTarget: gmvTargetVal,
    viewTrungVi: medianViewsVal,
    ctrPct: ctrVal,
    crPct: crVal,
    viewTarget: avgViewsVal,
    tyLeTuongTacPct: engRateVal,
    email: koc.email || '',
    zalo: koc.zalo || koc.phone || '',
    nguoiNhanHang: koc.shippingRecipientName || koc.realName || koc.stageName || '',
    sdtNhanHang: koc.shippingPhone || koc.phone || '',
    diaChiNhanHang: koc.shippingAddress || koc.permanentAddress || '',
    tenTaiKhoanNganHang: koc.realName || '',
    soTaiKhoan: koc.bankAccount || '',
    nganHang: koc.bankName || '',
    soCccd: koc.cccd || '',
    brandReviewedAt: brandReviewedAtIso,
    ngayBrandDuyet: ngayBrandDuyetFormatted,
    slaBrandDuyet: slaInfo.label,
  };
}

export function buildKocLookupMap(kocs?: KocItem[]): Map<string, KocItem> {
  const map = new Map<string, KocItem>();
  if (!Array.isArray(kocs)) return map;
  for (const k of kocs) {
    if (!k) continue;
    const h = normalizeTikTokId(k.channelId || k.tiktokChannel || '').toLowerCase();
    if (h) map.set(h, k);
    if (k.id) map.set(k.id.toLowerCase(), k);
  }
  return map;
}

/**
 * Chuyển đổi một bản ghi KocListingItem (từ Lark Base 3.1 / PlanListingBoard) sang StaffListingSheetRow,
 * đồng thời tự động tra cứu chỉ số từ Danh bạ KOC Master (O(1)) nếu có.
 */
export function buildStaffListingRowFromListingItem(
  item: KocListingItem,
  defaultStaffName?: string,
  kocsOrMap?: Map<string, KocItem> | KocItem[]
): StaffListingSheetRow {
  const cleanId = normalizeTikTokId(item.kocHandle || '');
  const cleanLower = cleanId.toLowerCase();
  let matchedKoc: KocItem | undefined;
  if (kocsOrMap instanceof Map) {
    matchedKoc =
      (cleanLower ? kocsOrMap.get(cleanLower) : undefined) ||
      (item.kocId ? kocsOrMap.get(item.kocId.toLowerCase()) : undefined);
  } else if (Array.isArray(kocsOrMap) && kocsOrMap.length > 0) {
    matchedKoc = kocsOrMap.find((k) => {
      if (!k) return false;
      const h = normalizeTikTokId(k.channelId || k.tiktokChannel || '').toLowerCase();
      return (cleanLower && h === cleanLower) || (item.kocId && k.id === item.kocId);
    });
  }

  const linkKenh = matchedKoc?.channelLink?.trim() || (cleanId ? buildTikTokChannelUrl(cleanId) : '');
  const netFee = Math.max(0, Number(item.finalFee ?? item.proposedFee ?? matchedKoc?.rateCardVideo ?? 0));
  const grossFee = computeGrossFeeWithTax(netFee);
  const tepBooking = item.salaryGrade || computeTepBookingFromNetFee(netFee);

  const brandChon =
    item.brandApprovalStatus === 'BRAND_APPROVED'
      ? 'Yes'
      : item.brandApprovalStatus === 'BRAND_REJECTED'
        ? 'No'
        : 'Chờ duyệt';

  const trangThai =
    item.kocNegotiationStatus === 'TERMS_AGREED'
      ? 'Đã đồng ý giá'
      : item.kocNegotiationStatus === 'NEGOTIATION_FAILED'
        ? 'Từ chối'
        : item.kocNegotiationStatus === 'PRICE_NEGOTIATING'
          ? 'Đang deal'
          : 'Chưa liên hệ';

  const dot =
    item.batchCycle === 'BATCH_10'
      ? 'Đợt 1'
      : item.batchCycle === 'BATCH_20'
        ? 'Đợt 2'
        : item.batchCycle === 'BATCH_30'
          ? 'Đợt 3'
          : 'Đợt 1';

  const rawNiche = (item.niche || '').trim();
  const rawPillar = (item.pillarName || '').trim();
  const isNicheTepKenh = rawNiche ? TEP_KENH_OPTIONS.includes(rawNiche) : false;
  const sanPham =
    (!isNicheTepKenh && rawNiche) ||
    (rawPillar && rawPillar !== 'Trải nghiệm sản phẩm' ? rawPillar : '') ||
    rawPillar ||
    '';
  const tepKenh =
    (isNicheTepKenh ? rawNiche : '') ||
    matchedKoc?.tepKenh ||
    matchedKoc?.creatorCategory ||
    'Beauty';

  const followerVal = Number(item.followersCount || matchedKoc?.followers || 0);
  const avgViewsVal = Number(matchedKoc?.avgViews || 0);
  const medianViewsVal = Number(matchedKoc?.medianViews || avgViewsVal);
  const aovVal = Number(matchedKoc?.aov || 0);
  const gpmVal = Number(matchedKoc?.gpm || 0);
  const itemsSoldVal = Number(matchedKoc?.itemsSold || 0);
  const recentRevenueVal = Number(matchedKoc?.recentRevenue || 0);
  const maxDealGmv = Number(matchedKoc?.gmvBestCase || matchedKoc?.totalPastGmv || 0);
  const ctrVal = Number(matchedKoc?.tiktokAvgCtr ?? 0);
  const crVal = Number(matchedKoc?.tiktokAvgCvr ?? 0);
  const engRateVal = Number(matchedKoc?.engagementRate ?? 0);
  const videoShare = Number(matchedKoc?.gmvShareVideo ?? 0);
  const liveShare = Number(matchedKoc?.gmvShareLive ?? 0);
  const cardShare =
    videoShare > 0 || liveShare > 0
      ? Math.max(0, Number((100 - videoShare - liveShare).toFixed(2)))
      : 0;
  const nuPct = Number(matchedKoc?.femaleRatio ?? 0);
  const namPct = Number(
    matchedKoc?.maleRatio ?? (nuPct > 0 ? Math.max(0, Number((100 - nuPct).toFixed(2))) : 0)
  );
  const age18_24 = Number(matchedKoc?.age18_24 ?? 0);
  const age25_34 = Number(matchedKoc?.age25_34 ?? 0);
  const ageOver35 =
    age18_24 > 0 || age25_34 > 0
      ? Math.max(0, Number((100 - age18_24 - age25_34).toFixed(2)))
      : 0;
  const topCategoriesText =
    matchedKoc?.tiktokTopCategories && matchedKoc.tiktokTopCategories.length > 0
      ? matchedKoc.tiktokTopCategories.slice(0, 3).join(', ')
      : matchedKoc?.niche || matchedKoc?.kocCategory || '';

  let thanhQuaText = '';
  if (matchedKoc?.totalPastDeals && matchedKoc.totalPastDeals > 0) {
    const brandNote = matchedKoc.brandName ? ` (${matchedKoc.brandName})` : '';
    thanhQuaText = `Đã hợp tác ${matchedKoc.totalPastDeals} job tại UpBase${brandNote}`;
    if (maxDealGmv > 0) {
      thanhQuaText += ` · GMV cao nhất: ${formatVndShort(maxDealGmv)}`;
    }
  }

  return recalculateStaffListingRow({
    id: `SSR-${item.id.replace(/^LI-/, '')}`,
    kocId: matchedKoc?.id || item.kocId,
    createdAt: item.createdAt || new Date().toISOString(),
    ngayDien: item.createdAt ? formatVnDateTime(new Date(item.createdAt)) : '',
    thang: item.monthKey || '2026/10',
    nhanSuDien: item.assignedStaffName || defaultStaffName || 'Chưa phân công',
    dot,
    store: item.storeName,
    sanPham,
    idKenh: cleanId,
    tenKenh: matchedKoc?.stageName || item.kocName || cleanId,
    linkKenh,
    follower: followerVal,
    tepKenh,
    contentTag: item.videoFormat || 'Review trực tiếp',
    tepBooking,
    giaDaHopTacTruocDo: Number(matchedKoc?.minRate || netFee),
    loaiGia: 'Booking video',
    giaNetVideo: netFee,
    phiBookingKemThue: grossFee,
    trangThai,
    deXuatUpBase: 'Recommend',
    contentNote: item.staffComment || '',
    brandChon,
    lyDoTuChoi: item.brandFeedback || item.brandFeedbackNote || '',
    thanhQuaHopTac: thanhQuaText,
    thanhQuaBrandNgoai: matchedKoc?.workedBrands?.length
      ? `Đã hợp tác: ${matchedKoc.workedBrands.slice(0, 3).join(', ')}`
      : '',
    leaderNote: '',
    gmvDaHopTac: maxDealGmv,
    doanhSo: recentRevenueVal,
    doanhSoUocTinh30d: recentRevenueVal || maxDealGmv,
    soMonBanRa: itemsSoldVal,
    gpm: gpmVal,
    aov: aovVal,
    viewTrungBinh: avgViewsVal,
    gmvTuVideoPct: videoShare,
    gmvTuLivePct: liveShare,
    gmvTuTheSanPhamPct: cardShare,
    tiTrongNganhHang: topCategoriesText,
    namPct,
    nuPct,
    tuoi18_24Pct: age18_24,
    tuoi25_34Pct: age25_34,
    tuoiTren35Pct: ageOver35,
    tuoiOtherPct: ageOver35,
    location: matchedKoc?.location || '',
    ngayAirPlan: item.expectedAirDate || '',
    gmvTarget: 0,
    viewTrungVi: medianViewsVal,
    ctrPct: ctrVal,
    crPct: crVal,
    viewTarget: avgViewsVal,
    tyLeTuongTacPct: engRateVal,
    email: matchedKoc?.email || '',
    zalo: matchedKoc?.zalo || matchedKoc?.phone || '',
    nguoiNhanHang:
      matchedKoc?.shippingRecipientName ||
      matchedKoc?.realName ||
      matchedKoc?.stageName ||
      item.kocName ||
      cleanId,
    sdtNhanHang: matchedKoc?.shippingPhone || matchedKoc?.phone || '',
    diaChiNhanHang: matchedKoc?.shippingAddress || matchedKoc?.permanentAddress || '',
    tenTaiKhoanNganHang: matchedKoc?.companyName || matchedKoc?.realName || item.kocName || '',
    soTaiKhoan: matchedKoc?.bankAccount || '',
    nganHang: matchedKoc?.bankName || '',
    soCccd: matchedKoc?.cccd || matchedKoc?.taxCode || '',
    brandReviewedAt: item.brandApprovedAt,
    ngayBrandDuyet: item.brandApprovedAt ? formatVnDateTime(new Date(item.brandApprovedAt)) : '',
  });
}

/**
 * Tự động tính toán lại các cột công thức, ghi nhận thời gian Brand duyệt và đo lường SLA khi nhân viên sửa dòng
 */
export function recalculateStaffListingRow(
  row: StaffListingSheetRow,
  options?: { preserveIdKenhInput?: boolean; forceRefreshBrandTimestamp?: boolean }
): StaffListingSheetRow {
  const cleanId = normalizeTikTokId(row.idKenh);
  const linkKenh = cleanId ? buildTikTokChannelUrl(cleanId) : row.linkKenh;
  const netFee = Math.max(0, Number(row.giaNetVideo) || 0);
  const tepBooking = computeTepBookingFromNetFee(netFee);
  const phiBookingKemThue = computeGrossFeeWithTax(netFee);

  const vPct = Math.min(100, Math.max(0, Number(row.gmvTuVideoPct) || 0));
  const lPct = Math.min(100 - vPct, Math.max(0, Number(row.gmvTuLivePct) || 0));
  const cPct =
    vPct > 0 || lPct > 0
      ? Number(Math.max(0, 100 - vPct - lPct).toFixed(2))
      : Math.min(100, Math.max(0, Number(row.gmvTuTheSanPhamPct) || 0));

  const rawNamPct = Math.min(100, Math.max(0, Number(row.namPct) || 0));
  const rawNuPct = Math.min(100, Math.max(0, Number(row.nuPct) || 0));
  const namPct = rawNamPct;
  const nuPct =
    rawNamPct > 0
      ? Number(Math.max(0, 100 - rawNamPct).toFixed(2))
      : rawNuPct;

  const a18 = Math.min(100, Math.max(0, Number(row.tuoi18_24Pct) || 0));
  const a25 = Math.min(100 - a18, Math.max(0, Number(row.tuoi25_34Pct) || 0));
  const a35 =
    a18 > 0 || a25 > 0
      ? Number(Math.max(0, 100 - a18 - a25).toFixed(2))
      : Math.min(100, Math.max(0, Number(row.tuoiTren35Pct) || 0));
  const aOther = Number(row.tuoiOtherPct) > 0 ? Number(row.tuoiOtherPct) : a35;

  const avgViewsVal = Math.max(0, Number(row.viewTrungBinh) || 0);
  const costPerView = avgViewsVal > 0 ? Math.round(netFee / avgViewsVal) : 0;
  const aovVal = Math.max(0, Number(row.aov) || 0);
  const ctrVal = Number(row.ctrPct ?? 0);
  const crVal = Number(row.crPct ?? 0);
  const gmvTarget =
    Number(row.gmvTarget) > 0
      ? Number(row.gmvTarget)
      : avgViewsVal > 0 && aovVal > 0 && ctrVal > 0 && crVal > 0
        ? Math.round(avgViewsVal * (ctrVal / 100) * (crVal / 100) * aovVal)
        : 0;

  // Đảm bảo ngayDien luôn có cả Ngày & Giờ (DD/MM/YYYY HH:mm)
  let ngayDien = (row.ngayDien || '').trim();
  if (!ngayDien) {
    ngayDien = row.createdAt ? formatVnDateTime(new Date(row.createdAt)) : formatVnDateTime();
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(ngayDien) && row.createdAt) {
    const parsedCreated = new Date(row.createdAt);
    if (!Number.isNaN(parsedCreated.getTime())) {
      ngayDien = formatVnDateTime(parsedCreated);
    }
  }

  // Ghi nhận tự động Ngày Giờ Brand duyệt khi Brand chọn = Yes / No / Cân nhắc
  const cleanBrand = (row.brandChon || '').trim();
  const isReviewed =
    cleanBrand === 'Yes' || cleanBrand === 'No' || cleanBrand === 'Cân nhắc';

  let ngayBrandDuyet = (row.ngayBrandDuyet || '').trim();
  let brandReviewedAt = row.brandReviewedAt;

  if (isReviewed) {
    if (!ngayBrandDuyet || options?.forceRefreshBrandTimestamp) {
      const now = new Date();
      ngayBrandDuyet = formatVnDateTime(now);
      brandReviewedAt = now.toISOString();
    }
  } else {
    ngayBrandDuyet = '';
    brandReviewedAt = undefined;
  }

  const slaInfo = computeListingToBrandSla({
    ngayDien,
    createdAt: row.createdAt,
    brandChon: cleanBrand,
    ngayBrandDuyet,
    brandReviewedAt,
  });

  return {
    ...row,
    ngayDien,
    idKenh: options?.preserveIdKenhInput ? row.idKenh : cleanId,
    linkKenh,
    giaNetVideo: netFee,
    tepBooking,
    phiBookingKemThue,
    costPerView,
    gmvTarget,
    viewTrungVi: Number(row.viewTrungVi) > 0 ? Number(row.viewTrungVi) : avgViewsVal,
    ctrPct: ctrVal,
    crPct: crVal,
    viewTarget: Number(row.viewTarget) > 0 ? Number(row.viewTarget) : avgViewsVal,
    tyLeTuongTacPct: Number(row.tyLeTuongTacPct ?? 0),
    loaiGia: row.loaiGia || 'Booking',
    gmvTuVideoPct: vPct,
    gmvTuLivePct: lPct,
    gmvTuTheSanPhamPct: cPct,
    namPct,
    nuPct,
    tuoi18_24Pct: a18,
    tuoi25_34Pct: a25,
    tuoiTren35Pct: a35,
    tuoiOtherPct: aOther,
    brandReviewedAt,
    ngayBrandDuyet,
    slaBrandDuyet: slaInfo.label,
  };
}

let cachedRealLarkSheetsMap: Record<string, StaffListingSheetRow[]> | null = null;
let cachedRealLarkKocCount = -1;

function getOrBuildRealLarkSheetsMap(
  kocs: KocItem[],
  defaultStaffName = 'Chuyên viên Listing'
): Record<string, StaffListingSheetRow[]> {
  const safeKocs = Array.isArray(kocs) ? kocs : [];
  if (cachedRealLarkSheetsMap && cachedRealLarkKocCount === safeKocs.length) {
    return cachedRealLarkSheetsMap;
  }
  const kocMap = buildKocLookupMap(safeKocs);
  const map: Record<string, StaffListingSheetRow[]> = {};
  for (const items of Object.values(REAL_LARK_LISTINGS_BY_BOARD_KEY)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || !item.storeName) continue;
      const sheetKey = makeSheetKey(item.monthKey || '2026/10', item.storeName);
      const row = buildStaffListingRowFromListingItem(item, defaultStaffName, kocMap);
      (map[sheetKey] ||= []).push(row);
    }
  }
  cachedRealLarkSheetsMap = map;
  cachedRealLarkKocCount = safeKocs.length;
  return map;
}

/**
 * Khởi tạo dữ liệu Sheet Listing từ 2.561 bản ghi Lark Base 3.1 thực tế (59 kế hoạch gian hàng kỳ 2026/10 & 2026/11)
 * kết hợp tra cứu chỉ số từ Danh bạ KOC Master.
 */
export function buildInitialStaffSheetCollection(
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[],
  defaultStaffName = 'Chuyên viên Listing'
): StaffBrandSheetCollection {
  const safeKocs = Array.isArray(kocs) ? kocs : [];
  const realSheets = getOrBuildRealLarkSheetsMap(safeKocs, defaultStaffName);
  const sheets: Record<string, StaffListingSheetRow[]> = {};
  for (const [k, rows] of Object.entries(realSheets)) {
    sheets[k] = [...rows];
  }
  return {
    sheets,
    googleSheetUrls: {},
  };
}

let deferredHydrationSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleDeferredLocalStorageSave(collection: StaffBrandSheetCollection) {
  if (typeof window === 'undefined') return;
  if (deferredHydrationSaveTimer) clearTimeout(deferredHydrationSaveTimer);
  deferredHydrationSaveTimer = setTimeout(() => {
    deferredHydrationSaveTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    } catch {
      // ignore quota errors
    }
  }, 400);
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
  if (memoryCollectionCache) {
    return memoryCollectionCache;
  }
  const realSheets = getOrBuildRealLarkSheetsMap(kocs, defaultStaffName);
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY_V1);
    if (raw) {
      const parsed = JSON.parse(raw) as StaffBrandSheetCollection;
      if (parsed && parsed.sheets && typeof parsed.sheets === 'object' && !Array.isArray(parsed.sheets)) {
        const normalizedSheets: Record<string, StaffListingSheetRow[]> = {};
        let needsSaveHydrated = false;
        for (const [k, sheetRows] of Object.entries(parsed.sheets || {})) {
          normalizedSheets[k] = Array.isArray(sheetRows)
            ? sheetRows
                .filter((r): r is StaffListingSheetRow => Boolean(r && typeof r === 'object'))
                .map((r) => (r.slaBrandDuyet && r.tepBooking ? r : recalculateStaffListingRow(r)))
            : [];
        }

        // Bổ sung / làm giàu 59 Sheet thực tế từ Lark Base 3.1 nếu localStorage đang trống hoặc chỉ có dòng mẫu cũ
        for (const [sheetKey, realRows] of Object.entries(realSheets)) {
          const existing = normalizedSheets[sheetKey] || [];
          if (existing.length === 0) {
            normalizedSheets[sheetKey] = [...realRows];
            needsSaveHydrated = true;
            continue;
          }
          const hasAnyRealRow = existing.some((r) => r.id.startsWith('SSR-'));
          if (!hasAnyRealRow && existing.length <= 5) {
            // Thay thế 4-5 dòng mẫu giả lập cũ bằng dữ liệu Lark Base 3.1 thực tế
            normalizedSheets[sheetKey] = [...realRows];
            needsSaveHydrated = true;
            continue;
          }
          // Làm giàu chỉ số KOC Master cho các dòng SSR- đã lưu trước đó và bổ sung dòng SSR- còn thiếu
          const realById = new Map(realRows.map((r) => [r.id, r]));
          const existingIds = new Set<string>();
          let sheetUpdated = false;
          const merged = existing.map((r) => {
            existingIds.add(r.id);
            const enriched = realById.get(r.id);
            if (!enriched) return r;
            if (
              (r.follower === 0 && enriched.follower > 0) ||
              (r.doanhSo === 0 && enriched.doanhSo > 0) ||
              (r.viewTrungBinh === 0 && enriched.viewTrungBinh > 0) ||
              (!r.sanPham && enriched.sanPham) ||
              (r.tepKenh === enriched.sanPham && enriched.tepKenh !== enriched.sanPham) ||
              ((!r.thanhQuaHopTac || r.thanhQuaHopTac.includes('0M₫') || r.thanhQuaHopTac !== enriched.thanhQuaHopTac) && Boolean(enriched.thanhQuaHopTac)) ||
              ((!r.gmvDaHopTac || r.gmvDaHopTac === 0) && (enriched.gmvDaHopTac || 0) > 0) ||
              (r.kocId !== enriched.kocId && Boolean(enriched.kocId))
            ) {
              sheetUpdated = true;
              return recalculateStaffListingRow({
                ...enriched,
                dot: r.dot || enriched.dot,
                sanPham:
                  r.sanPham && r.sanPham !== 'Trải nghiệm sản phẩm'
                    ? r.sanPham
                    : enriched.sanPham || r.sanPham,
                tepKenh:
                  r.tepKenh && TEP_KENH_OPTIONS.includes(r.tepKenh)
                    ? r.tepKenh
                    : enriched.tepKenh,
                giaNetVideo: r.giaNetVideo ?? enriched.giaNetVideo,
                brandChon: r.brandChon || enriched.brandChon,
                lyDoTuChoi: r.lyDoTuChoi || enriched.lyDoTuChoi,
                contentNote: r.contentNote || enriched.contentNote,
                leaderNote: r.leaderNote || enriched.leaderNote,
                trangThai: r.trangThai || enriched.trangThai,
                deXuatUpBase: r.deXuatUpBase || enriched.deXuatUpBase,
                ngayAirPlan: r.ngayAirPlan || enriched.ngayAirPlan,
                maBooking: r.maBooking || enriched.maBooking,
                ngayBrandDuyet: r.ngayBrandDuyet || enriched.ngayBrandDuyet,
                brandReviewedAt: r.brandReviewedAt || enriched.brandReviewedAt,
              });
            }
            return r;
          });
          for (const rr of realRows) {
            if (!existingIds.has(rr.id)) {
              merged.push(rr);
              sheetUpdated = true;
            }
          }
          if (sheetUpdated) {
            normalizedSheets[sheetKey] = merged;
            needsSaveHydrated = true;
          }
        }

        const resultCollection: StaffBrandSheetCollection = {
          sheets: normalizedSheets,
          googleSheetUrls:
            parsed.googleSheetUrls && typeof parsed.googleSheetUrls === 'object'
              ? parsed.googleSheetUrls
              : {},
          ...(parsed.fieldEditPolicy
            ? { fieldEditPolicy: normalizeStaffSheetFieldEditPolicy(parsed.fieldEditPolicy) }
            : {}),
        };
        memoryCollectionCache = resultCollection;
        lastPersistedSnapshot = resultCollection;
        if (needsSaveHydrated) {
          scheduleDeferredLocalStorageSave(resultCollection);
        }
        return resultCollection;
      }
    }
  } catch {
    // ignore storage errors
  }
  const initial = buildInitialStaffSheetCollection(kocs, stores, deals, defaultStaffName);
  memoryCollectionCache = initial;
  lastPersistedSnapshot = initial;
  scheduleDeferredLocalStorageSave(initial);
  return initial;
}

/** Phần thay đổi của Sheet nhân sự gửi lên máy chủ: dòng thêm / sửa và id dòng xóa theo từng Sheet. */
export interface StaffSheetChanges {
  sheets?: Record<string, { upserts?: StaffListingSheetRow[]; deletes?: string[] }>;
  googleSheetUrls?: BrandGoogleSheetLinkMap;
  fieldEditPolicy?: StaffSheetFieldEditPolicy;
}

/** So bản trước và bản sau trên máy này, lấy ra dòng thêm / sửa / xóa (không gửi cả kho, tránh ghi đè dòng người khác). */
export function diffStaffSheetCollections(
  prev: StaffBrandSheetCollection | null,
  next: StaffBrandSheetCollection
): StaffSheetChanges | null {
  const changes: StaffSheetChanges = {};
  const sheetKeys = new Set([...Object.keys(prev?.sheets || {}), ...Object.keys(next.sheets || {})]);
  for (const key of sheetKeys) {
    const prevRows = prev?.sheets?.[key];
    const afterRows = next.sheets?.[key] || [];
    if (prevRows === afterRows) continue;
    const beforeRefMap = new Map((prevRows || []).map((r) => [r.id, r]));
    const afterIds = new Set(afterRows.map((r) => r.id));
    const upserts = afterRows.filter((r) => {
      const b = beforeRefMap.get(r.id);
      if (!b) return true;
      if (b === r) return false;
      return JSON.stringify(b) !== JSON.stringify(r);
    });
    const deletes = [...beforeRefMap.keys()].filter((id) => !afterIds.has(id));
    if (upserts.length || deletes.length) {
      (changes.sheets ||= {})[key] = {
        ...(upserts.length ? { upserts } : {}),
        ...(deletes.length ? { deletes } : {}),
      };
    }
  }
  for (const [store, url] of Object.entries(next.googleSheetUrls || {})) {
    if ((prev?.googleSheetUrls || {})[store] !== url) (changes.googleSheetUrls ||= {})[store] = url;
  }
  if (
    next.fieldEditPolicy &&
    next.fieldEditPolicy !== prev?.fieldEditPolicy &&
    JSON.stringify(next.fieldEditPolicy) !== JSON.stringify(prev?.fieldEditPolicy)
  ) {
    changes.fieldEditPolicy = next.fieldEditPolicy;
  }
  return changes.sheets || changes.googleSheetUrls || changes.fieldEditPolicy ? changes : null;
}

// Gom các lần lưu liên tiếp rồi gửi một lần (giữ thứ tự: dòng xóa rồi thêm lại thì tính là thêm)
let pendingStaffSheetChanges: StaffSheetChanges | null = null;
let staffSheetFlushTimer: ReturnType<typeof setTimeout> | null = null;

function queueStaffSheetChanges(changes: StaffSheetChanges): void {
  const pending: StaffSheetChanges = pendingStaffSheetChanges || {};
  for (const [key, c] of Object.entries(changes.sheets || {})) {
    const cur = ((pending.sheets ||= {})[key] ||= {});
    const upserts = new Map((cur.upserts || []).map(r => [r.id, r]));
    const deletes = new Set(cur.deletes || []);
    for (const id of c.deletes || []) {
      upserts.delete(id);
      deletes.add(id);
    }
    for (const r of c.upserts || []) {
      deletes.delete(r.id);
      upserts.set(r.id, r);
    }
    cur.upserts = [...upserts.values()];
    cur.deletes = [...deletes];
  }
  if (changes.googleSheetUrls) pending.googleSheetUrls = { ...(pending.googleSheetUrls || {}), ...changes.googleSheetUrls };
  if (changes.fieldEditPolicy) pending.fieldEditPolicy = changes.fieldEditPolicy;
  pendingStaffSheetChanges = pending;

  if (staffSheetFlushTimer) clearTimeout(staffSheetFlushTimer);
  staffSheetFlushTimer = setTimeout(() => {
    const body = pendingStaffSheetChanges;
    pendingStaffSheetChanges = null;
    staffSheetFlushTimer = null;
    if (!body) return;
    fetch('/api/staff-listing-sheets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async res => {
        if (res.ok) return;
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        console.warn(`[staffSheet] Không lưu được lên máy chủ (HTTP ${res.status}): ${data?.error || ''}`);
        window.dispatchEvent(new CustomEvent('upbase:staff-sheet-save-failed', { detail: { status: res.status, error: data?.error } }));
      })
      .catch(err => console.warn('[staffSheet] Lỗi mạng khi lưu Sheet nhân sự:', err));
  }, 300);
}

let unloadListenerRegistered = false;
function flushPendingLocalStorageSave(): void {
  if (typeof window === 'undefined' || !memoryCollectionCache) return;
  if (localStorageSaveTimer) {
    clearTimeout(localStorageSaveTimer);
    localStorageSaveTimer = null;
  }
  try {
    const changes = diffStaffSheetCollections(lastPersistedSnapshot, memoryCollectionCache);
    if (changes) queueStaffSheetChanges(changes);
    lastPersistedSnapshot = memoryCollectionCache;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCollectionCache));
  } catch {
    // ignore quota errors
  }
}

export function saveStaffSheetCollection(
  collection: StaffBrandSheetCollection,
  emitEvent = true
): void {
  if (typeof window === 'undefined') return;
  memoryCollectionCache = collection;

  if (!unloadListenerRegistered) {
    unloadListenerRegistered = true;
    window.addEventListener('beforeunload', flushPendingLocalStorageSave);
  }

  if (emitEvent) {
    const changes = diffStaffSheetCollections(lastPersistedSnapshot, collection);
    if (changes) queueStaffSheetChanges(changes);
    lastPersistedSnapshot = collection;
    window.dispatchEvent(new CustomEvent(STAFF_SHEET_UPDATED_EVENT, { detail: collection }));
    window.dispatchEvent(
      new CustomEvent('upbase:staff-brand-listing-sheet-updated', { detail: collection })
    );
  }

  if (localStorageSaveTimer) clearTimeout(localStorageSaveTimer);
  localStorageSaveTimer = setTimeout(() => {
    localStorageSaveTimer = null;
    if (!memoryCollectionCache) return;
    try {
      const changes = diffStaffSheetCollections(lastPersistedSnapshot, memoryCollectionCache);
      if (changes) queueStaffSheetChanges(changes);
      lastPersistedSnapshot = memoryCollectionCache;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCollectionCache));
    } catch {
      // ignore quota errors
    }
  }, 250);
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
 * Đồng bộ ngược thông tin liên hệ + chỉ số KOC (Follower, View, GMV, Tỷ trọng kênh/giới tính/độ tuổi, Email, Zalo, SĐT, Địa chỉ nhận mẫu) từ Danh bạ KOC sang các dòng tương ứng trên toàn bộ Sheet Listing
 */
export function syncKocContactToStaffSheets(updatedKoc: KocItem): void {
  if (typeof window === 'undefined') return;
  try {
    const parsed: StaffBrandSheetCollection | null = memoryCollectionCache
      ? {
          ...memoryCollectionCache,
          sheets: { ...memoryCollectionCache.sheets },
        }
      : (() => {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          return raw ? (JSON.parse(raw) as StaffBrandSheetCollection) : null;
        })();
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
        const nuVal =
          updatedKoc.femaleRatio !== undefined ? Number(updatedKoc.femaleRatio) : r.nuPct;
        const namVal =
          updatedKoc.maleRatio !== undefined
            ? Number(updatedKoc.maleRatio)
            : updatedKoc.femaleRatio !== undefined
              ? Math.max(0, Number((100 - nuVal).toFixed(2)))
              : r.namPct;
        const topCat =
          updatedKoc.tiktokTopCategories && updatedKoc.tiktokTopCategories.length > 0
            ? updatedKoc.tiktokTopCategories.slice(0, 3).join(', ')
            : updatedKoc.niche || updatedKoc.kocCategory || r.tiTrongNganhHang;

        return recalculateStaffListingRow({
          ...r,
          tenKenh: updatedKoc.stageName || r.tenKenh,
          tepKenh: updatedKoc.tepKenh || updatedKoc.creatorCategory || r.tepKenh,
          follower:
            updatedKoc.followers !== undefined && updatedKoc.followers > 0
              ? Number(updatedKoc.followers)
              : r.follower,
          giaNetVideo:
            updatedKoc.rateCardVideo !== undefined && updatedKoc.rateCardVideo > 0 && !r.giaNetVideo
              ? Number(updatedKoc.rateCardVideo)
              : r.giaNetVideo,
          doanhSo:
            updatedKoc.recentRevenue !== undefined && updatedKoc.recentRevenue > 0
              ? Number(updatedKoc.recentRevenue)
              : r.doanhSo,
          doanhSoUocTinh30d:
            updatedKoc.recentRevenue !== undefined && updatedKoc.recentRevenue > 0
              ? Number(updatedKoc.recentRevenue)
              : r.doanhSoUocTinh30d,
          soMonBanRa:
            updatedKoc.itemsSold !== undefined && updatedKoc.itemsSold > 0
              ? Number(updatedKoc.itemsSold)
              : r.soMonBanRa,
          gpm:
            updatedKoc.gpm !== undefined && updatedKoc.gpm > 0
              ? Number(updatedKoc.gpm)
              : r.gpm,
          aov:
            updatedKoc.aov !== undefined && updatedKoc.aov > 0
              ? Number(updatedKoc.aov)
              : r.aov,
          viewTrungBinh:
            updatedKoc.avgViews !== undefined && updatedKoc.avgViews > 0
              ? Number(updatedKoc.avgViews)
              : r.viewTrungBinh,
          viewTrungVi:
            updatedKoc.medianViews !== undefined && updatedKoc.medianViews > 0
              ? Number(updatedKoc.medianViews)
              : r.viewTrungVi,
          ctrPct:
            updatedKoc.tiktokAvgCtr !== undefined && updatedKoc.tiktokAvgCtr > 0
              ? Number(updatedKoc.tiktokAvgCtr)
              : r.ctrPct,
          crPct:
            updatedKoc.tiktokAvgCvr !== undefined && updatedKoc.tiktokAvgCvr > 0
              ? Number(updatedKoc.tiktokAvgCvr)
              : r.crPct,
          tyLeTuongTacPct:
            updatedKoc.engagementRate !== undefined && updatedKoc.engagementRate > 0
              ? Number(updatedKoc.engagementRate)
              : r.tyLeTuongTacPct,
          gmvTuVideoPct:
            updatedKoc.gmvShareVideo !== undefined
              ? Number(updatedKoc.gmvShareVideo)
              : r.gmvTuVideoPct,
          gmvTuLivePct:
            updatedKoc.gmvShareLive !== undefined
              ? Number(updatedKoc.gmvShareLive)
              : r.gmvTuLivePct,
          namPct: namVal,
          nuPct: nuVal,
          tuoi18_24Pct:
            updatedKoc.age18_24 !== undefined ? Number(updatedKoc.age18_24) : r.tuoi18_24Pct,
          tuoi25_34Pct:
            updatedKoc.age25_34 !== undefined ? Number(updatedKoc.age25_34) : r.tuoi25_34Pct,
          tiTrongNganhHang: topCat,
          location: updatedKoc.location || r.location,
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
        });
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

type SyncSheetRowContactParams = {
  kocId?: string;
  idKenh?: string;
  stageName?: string;
  tepKenh?: string;
  followers?: number;
  rateCardVideo?: number;
  recentRevenue?: number;
  itemsSold?: number;
  gpm?: number;
  aov?: number;
  avgViews?: number;
  medianViews?: number;
  tiktokAvgCtr?: number;
  tiktokAvgCvr?: number;
  engagementRate?: number;
  gmvShareVideo?: number;
  gmvShareLive?: number;
  maleRatio?: number;
  femaleRatio?: number;
  age18_24?: number;
  age25_34?: number;
  location?: string;
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
};

const pendingKocMasterSyncMap = new Map<string, SyncSheetRowContactParams>();
let kocMasterSyncFlushTimer: ReturnType<typeof setTimeout> | null = null;
let cachedSavedKocsMap: Record<string, KocItem> | null = null;

function flushPendingKocMasterSync(): void {
  kocMasterSyncFlushTimer = null;
  if (typeof window === 'undefined' || pendingKocMasterSyncMap.size === 0) return;
  const entries = Array.from(pendingKocMasterSyncMap.values());
  pendingKocMasterSyncMap.clear();

  try {
    if (!cachedSavedKocsMap) {
      const raw = window.localStorage.getItem('upbase_saved_kocs_v1');
      cachedSavedKocsMap = raw ? (JSON.parse(raw) as Record<string, KocItem>) : {};
    }
    const savedMap = cachedSavedKocsMap;
    const allKocsSample = entries.find((e) => e.allKocs && e.allKocs.length > 0)?.allKocs || [];
    const kocLookup = buildKocLookupMap(allKocsSample);
    const updatedBatch: KocItem[] = [];

    for (const params of entries) {
      const cleanHandle = normalizeTikTokId(params.idKenh || '').toLowerCase();
      if (!params.kocId && !cleanHandle) continue;

      const matchedFromList =
        (cleanHandle ? kocLookup.get(cleanHandle) : undefined) ||
        (params.kocId ? kocLookup.get(params.kocId.toLowerCase()) : undefined);

      const mapKey = cleanHandle || params.kocId || '';
      const existingSaved =
        (mapKey && savedMap[mapKey]) ||
        Object.values(savedMap).find((k) => {
          const h = normalizeTikTokId(k.channelId || k.tiktokChannel || '').toLowerCase();
          return (params.kocId && k.id === params.kocId) || (cleanHandle && h === cleanHandle);
        });

      const baseKoc = existingSaved || matchedFromList;
      if (!baseKoc) continue;

      const updatedKoc: KocItem = {
        ...baseKoc,
        ...(params.stageName !== undefined && params.stageName.trim()
          ? { stageName: params.stageName.trim() }
          : {}),
        ...(params.tepKenh !== undefined && params.tepKenh.trim()
          ? { tepKenh: params.tepKenh.trim() as KocItem['tepKenh'] }
          : {}),
        ...(params.followers !== undefined ? { followers: Number(params.followers) || 0 } : {}),
        ...(params.rateCardVideo !== undefined
          ? { rateCardVideo: Number(params.rateCardVideo) || 0 }
          : {}),
        ...(params.recentRevenue !== undefined
          ? { recentRevenue: Number(params.recentRevenue) || 0 }
          : {}),
        ...(params.itemsSold !== undefined ? { itemsSold: Number(params.itemsSold) || 0 } : {}),
        ...(params.gpm !== undefined ? { gpm: Number(params.gpm) || 0 } : {}),
        ...(params.aov !== undefined ? { aov: Number(params.aov) || 0 } : {}),
        ...(params.avgViews !== undefined ? { avgViews: Number(params.avgViews) || 0 } : {}),
        ...(params.medianViews !== undefined
          ? { medianViews: Number(params.medianViews) || 0 }
          : {}),
        ...(params.tiktokAvgCtr !== undefined
          ? { tiktokAvgCtr: Number(params.tiktokAvgCtr) || 0 }
          : {}),
        ...(params.tiktokAvgCvr !== undefined
          ? { tiktokAvgCvr: Number(params.tiktokAvgCvr) || 0 }
          : {}),
        ...(params.engagementRate !== undefined
          ? { engagementRate: Number(params.engagementRate) || 0 }
          : {}),
        ...(params.gmvShareVideo !== undefined
          ? { gmvShareVideo: Number(params.gmvShareVideo) || 0 }
          : {}),
        ...(params.gmvShareLive !== undefined
          ? { gmvShareLive: Number(params.gmvShareLive) || 0 }
          : {}),
        ...(params.maleRatio !== undefined ? { maleRatio: Number(params.maleRatio) || 0 } : {}),
        ...(params.femaleRatio !== undefined
          ? { femaleRatio: Number(params.femaleRatio) || 0 }
          : {}),
        ...(params.age18_24 !== undefined ? { age18_24: Number(params.age18_24) || 0 } : {}),
        ...(params.age25_34 !== undefined ? { age25_34: Number(params.age25_34) || 0 } : {}),
        ...(params.location !== undefined && params.location.trim()
          ? { location: params.location.trim() }
          : {}),
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
      }
      updatedBatch.push(updatedKoc);
      window.dispatchEvent(
        new CustomEvent(KOC_MASTER_CONTACT_SYNCED_EVENT, { detail: updatedKoc })
      );
    }

    if (updatedBatch.length > 0) {
      window.localStorage.setItem('upbase_saved_kocs_v1', JSON.stringify(savedMap));
      void fetch('/api/kocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created: [], updated: updatedBatch }),
      }).catch(() => undefined);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Đồng bộ Email / Zalo & các chỉ số KOC từ dòng Sheet Listing ngược về Danh bạ KOC (`upbase_saved_kocs_v1` & `/api/kocs`)
 * Được gom nhóm (debounce 350ms) để không gây giật lag khi gõ phím liên tục trên bảng.
 */
export function syncSheetRowContactToKocMaster(params: SyncSheetRowContactParams): void {
  if (typeof window === 'undefined') return;
  const cleanHandle = normalizeTikTokId(params.idKenh || '').toLowerCase();
  const key = cleanHandle || params.kocId || '';
  if (!key) return;

  const prev = pendingKocMasterSyncMap.get(key) || {};
  pendingKocMasterSyncMap.set(key, { ...prev, ...params });

  if (kocMasterSyncFlushTimer) clearTimeout(kocMasterSyncFlushTimer);
  kocMasterSyncFlushTimer = setTimeout(flushPendingKocMasterSync, 350);
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
          return `=CONCAT("https://www.tiktok.com/@",G${excelRowNum})`;
        }
        if (col.key === 'tepBooking') {
          return `=IFS(P${excelRowNum}=0,"Freecast",AND(P${excelRowNum}>0,P${excelRowNum}<500000),"KL1",AND(P${excelRowNum}>=500000,P${excelRowNum}<1500000),"KL2",AND(P${excelRowNum}>=1500000,P${excelRowNum}<3000000),"KL3",AND(P${excelRowNum}>=3000000,P${excelRowNum}<5000000),"KL4",AND(P${excelRowNum}>=5000000,P${excelRowNum}<10000000),"KL5",AND(P${excelRowNum}>=10000000,P${excelRowNum}<30000000),"KL6",P${excelRowNum}>=30000000,"KL7")`;
        }
        if (col.key === 'phiBookingKemThue') {
          return `=ROUND(P${excelRowNum}/0.9,0)`;
        }
        if (col.key === 'costPerView') {
          return `=IF(AD${excelRowNum}>0,ROUND(P${excelRowNum}/AD${excelRowNum},0),0)`;
        }
        if (col.key === 'gmvTuTheSanPhamPct') {
          return `=1-AF${excelRowNum}-AG${excelRowNum}`;
        }
        if (col.key === 'nuPct') {
          return `=1-AJ${excelRowNum}`;
        }
        if (col.key === 'tuoiOtherPct' || col.key === 'tuoiTren35Pct') {
          return `=1-AL${excelRowNum}-AM${excelRowNum}`;
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

export interface KocActiveSheetListingSummary {
  sheetKey: string;
  thang: string;
  store: string;
  dot: string;
  nhanSuDien: string;
  sanPham: string;
  giaNetVideo: number;
  brandChon: string;
  lyDoTuChoi?: string;
  ngayDien: string;
}

/**
 * Tra cứu nhanh xem 1 kênh KOC (@handle) đang được đề xuất trong những Sheet Listing nào
 * để cảnh báo trùng lặp nhân sự liên hệ và đối chiếu lịch sử Brand duyệt.
 */
export function findKocListingsByHandle(rawHandle: string): KocActiveSheetListingSummary[] {
  if (typeof window === 'undefined' || !rawHandle) return [];
  const cleanTarget = normalizeTikTokId(rawHandle).toLowerCase();
  if (!cleanTarget) return [];
  try {
    const parsed: StaffBrandSheetCollection | null = memoryCollectionCache
      ? memoryCollectionCache
      : (() => {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          return raw ? (JSON.parse(raw) as StaffBrandSheetCollection) : null;
        })();
    if (!parsed || typeof parsed.sheets !== 'object') return [];
    const found: KocActiveSheetListingSummary[] = [];
    for (const [sheetKey, rows] of Object.entries(parsed.sheets)) {
      if (!Array.isArray(rows)) continue;
      for (const r of rows) {
        const rowHandle = normalizeTikTokId(r.idKenh || '').toLowerCase();
        if (rowHandle === cleanTarget) {
          found.push({
            sheetKey,
            thang: r.thang || sheetKey.split('__')[0] || '',
            store: r.store || sheetKey.split('__')[1] || '',
            dot: r.dot || 'Đợt 1',
            nhanSuDien: r.nhanSuDien || 'Chưa gán',
            sanPham: r.sanPham || '',
            giaNetVideo: Number(r.giaNetVideo) || 0,
            brandChon: r.brandChon || 'Chờ duyệt',
            lyDoTuChoi: r.lyDoTuChoi || undefined,
            ngayDien: r.ngayDien || '',
          });
        }
      }
    }
    return found.sort((a, b) => b.thang.localeCompare(a.thang));
  } catch {
    return [];
  }
}
