import type {
  BookingDealItem,
  DealContractAppendixStatus,
  DealDeliverableItem,
  DealRightsTermItem,
  DealSequentialAcceptanceStage,
  DealSowJobItem,
  KocItem,
  SalaryGrade,
  StorePortfolioItem,
} from './types';

export type { DealSowJobItem };
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
import { getVietnamDateYmd, maskSensitivePii } from './format';
import { pushSharedStateToDb } from './sharedStateClient';

export const APPROVED_BOOKING_LIST_STORAGE_KEY = 'upbase_b2c_approved_booking_list_v3';
export const APPROVED_BOOKING_LIST_UPDATED_EVENT = 'upbase-approved-booking-list-updated';

export type ApprovedBookingPaymentStatus =
  | 'Chờ nghiệm thu'
  | 'Đủ điều kiện ĐNTT'
  | 'Đã lập ĐNTT'
  | 'Đang duyệt Lark'
  | 'Đã tạm ứng'
  | 'Đã duyệt chờ chi'
  | 'Từ chối duyệt'
  | 'Đã thanh toán';

export type ApprovedBookingPipelineStatus =
  | 'Chờ chốt giá & ngày air'
  | 'Sẵn sàng tạo BO'
  | 'Đang thực thi (Đã tạo BO)'
  | 'Đã nghiệm thu video'
  | 'Đã quyết toán';

export type AddonServicesAcceptanceStatus =
  | 'KHONG_CO'
  | 'KHOA_CHO_VIDEO'
  | 'CHO_NGHIEM_THU'
  | 'DA_NGHIEM_THU_DU';

export interface S40AuditLogEntry {
  id: string;
  action: 'LOCK_DATA' | 'REQUEST_UNLOCK' | 'APPROVE_UNLOCK' | 'REJECT_UNLOCK';
  batch?: 'NONE' | 'DOT_1_LV4_LV5' | 'DOT_2_LV10_LV11' | 'UNLOCKED';
  reason?: string;
  actorName: string;
  actorRole?: string;
  createdAt: string;
}

export const S40_STANDARD_UNLOCK_REASONS = [
  'KOC lên sóng cuối tháng / gửi link bài Air hoặc Mã Spark Ads trễ sau ngày khóa sổ',
  'Video bị gậy bản quyền / hạn chế hiển thị — KOC xóa đăng lại và cấp link/code mới',
  'Bàn giao bổ sung hoặc khấu trừ (Drop) hạng mục phụ đi kèm trong SOW (link Drive, bài đa sàn)',
  'Điều chỉnh giá trị quyết toán thực tế / phát sinh mua thêm quyền lợi sau Air (Upsell)',
  'Điều chỉnh thông tin đối soát theo yêu cầu Kế toán (kỳ nghiệm thu, pháp nhân, số hóa đơn)',
] as const;

export const DATA_LOCKED_APPROVED_FIELDS: ReadonlySet<keyof ApprovedBookingListItem> = new Set([
  'idKenh',
  'sanPham',
  'giaDeXuatNet',
  'chiPhiBookingNetCuoi',
  'plannedAirDate',
  'soTienTamUngTruoc',
  'loaiTaiKhoanThanhToan',
  'linkAir',
  'videoId',
  'actualAirDate',
  'sparkAdsCode',
  'videoAssetNetCost',
  'addonServicesNetCost',
  'khauTruHangMucHuy',
  'addonServices',
  'dealJobs',
  'acceptanceStatus',
  'thangNghiemThuChot',
]);

export function isApprovedDealDataLocked(
  item?: Pick<ApprovedBookingListItem, 'chotData' | 'unlockRequestBatch' | 'daDiTien'> | null,
): boolean {
  if (!item) return false;
  if (item.daDiTien) return true;
  return Boolean(item.chotData) && item.unlockRequestBatch !== 'UNLOCKED';
}

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
  paymentScheduleOption?: 'ONE_TIME' | 'TWO_TIMES'; // Phương thức thanh toán trên Phụ lục SOW: 1 lần | 2 đợt (mở tạm ứng)
  soTienTamUngTruoc: number;           // Cột 40: 🎃 Số tiền tạm ứng trước
  advanceAmount?: number;              // Alias tương thích ngược cho soTienTamUngTruoc
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
  sampleStatus?: BookingDealItem['sampleStatus'];
  sampleTrackingCode?: string;
  sampleCarrier?: string;
  tenTaiKhoanNganHang: string;         // Cột 23: Tên tài khoản ngân hàng
  soTaiKhoan: string;                  // Cột 24: Số tài khoản
  nganHang: string;                    // Cột 25: Ngân hàng
  soCccd: string;                      // Cột 26: CCCD/MST/Passport
  legalProfileId?: string;             // Khóa ngoại Hồ sơ pháp lý KOC (KocLegalProfile) được chọn cho Deal
  soHoaDonVat?: string;                // Số hóa đơn VAT / Hóa đơn bán hàng phục vụ quyết toán ĐNTT

  // 6. Cấu trúc Deal (1 Deal -> N Jobs, mỗi Job = 1 Bảng công việc trong Phụ lục SOW) & Nghiệm thu 2 tầng
  dealStructureType?: 'VIDEO_ONLY' | 'VIDEO_AND_ADDONS';
  videoAssetNetCost?: number;          // Tổng chi phí Net phần Asset Video gốc của các Job trong Deal
  addonServicesNetCost?: number;       // Tổng chi phí Net các dịch vụ gia tăng đi kèm của các Job trong Deal
  khauTruHangMucHuy?: number;          // Khấu trừ dịch vụ gia tăng không thực hiện (DROPPED) khi quyết toán Deal
  addonServices?: DealRightsTermItem[]; // Danh sách gộp các dịch vụ gia tăng & quyền lợi đi kèm trong Deal
  dealJobs?: DealSowJobItem[];         // Danh sách N Job trong Deal (Mỗi Job tương ứng 1 Bảng công việc trong Phụ lục SOW)
  masterContractCode?: string;         // Mã HĐNT của KOC (1 HĐNT / KOC)
  masterContractStatus?: DealContractAppendixStatus; // Trạng thái ký HĐNT
  masterContractGoogleDocsUrl?: string; // Link Google Docs HĐNT (contract-system)
  masterContractSignedUrl?: string;    // Link file HĐNT đã ký hoàn tất
  contractAppendixCode?: string;       // Mã Phụ lục hợp đồng của Deal (1 Phụ lục / Deal)
  contractAppendixStatus?: DealContractAppendixStatus; // Trạng thái ký Phụ lục Deal
  contractAppendixGoogleDocsUrl?: string; // Link Google Docs Phụ lục SOW (contract-system)
  contractAppendixSignedUrl?: string;  // Link file Phụ lục SOW đã ký hoàn tất
  bbntCode?: string;                   // Mã Biên bản nghiệm thu (BBNT) của Deal
  bbntStatus?: DealContractAppendixStatus; // Trạng thái ký BBNT
  bbntGoogleDocsUrl?: string;          // Link Google Docs BBNT (contract-system)
  bbntSignedUrl?: string;              // Link file BBNT đã ký hoàn tất
  contractSyncedAt?: string;           // Thời điểm kéo/đồng bộ thông tin HĐ, PL, BBNT gần nhất
  sequentialAcceptanceStage?: DealSequentialAcceptanceStage; // Nghiệm thu tuần tự: (1) Video -> (2) Phần khác
  addonsAcceptanceStatus?: AddonServicesAcceptanceStatus;

  // 7. Kết nối Luồng phê duyệt thanh toán trên Lark Approval & Base (3.2 / 6.1)
  larkApprovalInstanceCode?: string;   // Mã instance luồng duyệt trên Lark Approval (VD: LARK-DNTT-202610-001)
  larkSlipCode?: string;               // Mã phiếu đối soát thanh toán (VD: DNTT-202610-001 / TU-202610-001)
  larkApprovalStatus?:
    | 'CHƯA_TẠO_LUỒNG'
    | 'PENDING_LEADER'
    | 'PENDING_DIRECTOR'
    | 'PENDING_FINANCE'
    | 'APPROVED'
    | 'PAID'
    | 'REJECTED';
  larkApprovalRouteSummary?: string;   // Tóm tắt luồng phê duyệt Lark Approval (Chuyên viên -> Leader -> GĐ MKT -> Kế toán)
  larkSyncedAt?: string;

  // 8. Luồng 1 — Tạm ứng trên Lark (Whiteboard QNvp & Bảng 3.2/6.1)
  larkAdvanceSlipCode?: string;        // Mã phiếu tạm ứng (TU-202610-001)
  larkAdvanceInstanceCode?: string;    // Mã instance Lark Approval luồng tạm ứng QNvp
  larkAdvanceStatus?:
    | 'CHƯA_TẠM_ỨNG'
    | 'CHỜ_DUYỆT_TẠM_ỨNG'
    | 'ĐÃ_DUYỆT_TẠM_ỨNG'
    | 'ĐÃ_CHI_TẠM_ỨNG'
    | 'TỪ_CHỐI_TẠM_ỨNG';
  draftInvoiceCode?: string;           // Số/Link hóa đơn nháp hoặc hóa đơn đợt 1 (bắt buộc với HKD/Công ty khi tạm ứng)

  // 9. Luồng 2 — Nghiệm thu tháng, Khóa sổ WORKDAY 3 & Mở khóa 2 đợt (GĐ7 B-54..B-65, S40)
  thangNghiemThuChot?: string;         // Kỳ nghiệm thu chốt cố định theo tháng Air gốc (không nhảy khi mua thêm mã Ads tháng sau - P-01)
  ngayKhoaData?: string;               // Công thức Base 3.2: WORKDAY(EOMONTH(Ngày air, 0), 3) - khóa lúc 00:00 ngày LV thứ 3 tháng kế tiếp
  chotData?: boolean;                  // Cờ "Chốt data" trên Base 3.2 (bắt buộc tích trước ngayKhoaData để vào kỳ nghiệm thu)
  unlockRequestBatch?: 'NONE' | 'DOT_1_LV4_LV5' | 'DOT_2_LV10_LV11' | 'UNLOCKED'; // Đợt xin Kế toán mở khóa sửa trên S40
  unlockRequestReason?: string;        // Lý do đề nghị mở khóa sửa nghiệm thu
  s40RequestedBy?: string;             // Người gửi yêu cầu mở khóa S40
  s40RequestedAt?: string;             // Thời điểm gửi yêu cầu mở khóa S40 (ISO)
  s40ReviewedBy?: string;              // Kế toán / Lãnh đạo duyệt mở khóa hoặc khóa sổ
  s40ReviewedAt?: string;              // Thời điểm Kế toán xử lý khóa sổ / mở khóa S40 (ISO)
  s40History?: S40AuditLogEntry[];     // Nhật ký kiểm toán các lần khóa sổ & mở khóa sửa S40 của Deal

  // 10. Luồng 3 — Thanh toán ĐNTT & Bước cuối KT Handle (Đã đi tiền + Bill UNC 7 ngày - P-07, P-08)
  loaiThanhToanLark?:
    | 'Tạm ứng trước Booking KOC'
    | 'Thanh toán Booking KOC'
    | 'Tạm ứng trước Booking Livestream'
    | 'Thanh toán Booking Livestream'
    | 'Thanh toán CTV Content kênh';
  isBrandBudgetAdvance?: boolean;      // Ngoại lệ GĐ2 (B-11..B-14): Brand chưa kịp chuyển ngân sách, UpBase ứng trước thay Brand
  brandConfirmPaymentDate?: string;    // Ngày Brand cam kết thanh toán trong email xác nhận gửi Kế toán
  daDiTien?: boolean;                  // Checkbox "Đã đi tiền" trên Bảng 6.1 sau bước KT Handle
  uncBillCode?: string;                // Mã lệnh chi / Link ảnh Bill Ủy nhiệm chi (UNC) gửi KOC
  uncSentToKocAt?: string;             // Thời điểm gửi Bill UNC cho KOC (cam kết 100% trong 7 ngày sau duyệt)
}

/**
 * Chuẩn hóa Tên chủ tài khoản ngân hàng sang IN HOA KHÔNG DẤU (chống lỗi P-02 trên Lark Approval)
 */
export function normalizeBankHolderUpperNoAccent(raw?: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Tính ngày khóa sổ tự động trên Lark Base 3.2:
 * Công thức: WORKDAY(EOMONTH(Ngày air, 0), 3) — ngày làm việc thứ 3 của tháng kế tiếp sau tháng Air
 */
export function computeDataLockDate(airDateStr?: string, fallbackMonth?: string): string {
  let year = 2026;
  let month = 10; // 1-12
  const cleanAir = (airDateStr || '').trim();
  const ymdMatch = cleanAir.match(/^(\d{4})-(\d{2})/);
  const ymMatch = (fallbackMonth || '').trim().match(/^(\d{4})[/-](\d{2})/);
  if (ymdMatch) {
    year = Number(ymdMatch[1]);
    month = Number(ymdMatch[2]);
  } else if (ymMatch) {
    year = Number(ymMatch[1]);
    month = Number(ymMatch[2]);
  } else {
    return '';
  }
  // Tháng kế tiếp sau tháng Air
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthIdx = month === 12 ? 0 : month; // 0-indexed cho Date.UTC
  let workdaysCount = 0;
  let day = 1;
  while (workdaysCount < 3 && day <= 15) {
    const dt = new Date(Date.UTC(nextMonthYear, nextMonthIdx, day));
    const dow = dt.getUTCDay(); // 0 = CN, 6 = T7
    if (dow !== 0 && dow !== 6) {
      workdaysCount++;
      if (workdaysCount === 3) {
        const mm = String(nextMonthIdx + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${nextMonthYear}-${mm}-${dd}`;
      }
    }
    day++;
  }
  return `${nextMonthYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-05`;
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

let autoBoSeqCounter = 1;

/**
 * Sinh mã Booking chuẩn File 3.2: BO + YYMM + 5 chữ số (Tất định theo seqHint hoặc bộ đếm tuần tự)
 */
export function generateBookingOrderCode(monthKey: string, seqHint?: number): string {
  const cleanMonth = (monthKey || '2026/10').replace(/[^0-9]/g, '');
  const yy = cleanMonth.slice(2, 4) || '26';
  const mm = cleanMonth.slice(4, 6) || '10';
  const seq = seqHint ?? ++autoBoSeqCounter;
  const suffix = String(35000 + (seq % 60000)).padStart(5, '0');
  return `BO${yy}${mm}${suffix}`;
}

/**
 * Sinh mã Hợp đồng nguyên tắc (HĐNT) theo KOC (1 HĐNT / KOC)
 */
export function generateMasterContractCode(idKenh: string, kocId?: string): string {
  const raw = (normalizeTikTokId(idKenh) || kocId || 'KOC')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  return `HDNT-2026-${raw || 'KOC'}`;
}

/**
 * Sinh mã Phụ lục hợp đồng theo từng Deal (1 Phụ lục / Deal)
 */
export function generateDealAppendixCode(maBooking: string, seq = 1): string {
  if (!maBooking) return '';
  return `PL-${maBooking.trim()}-${String(seq).padStart(2, '0')}`;
}

/**
 * Tạo danh sách Dịch vụ gia tăng (Add-on Services) mặc định đi kèm Asset Video trong Deal
 */
export function buildDefaultAddonServicesForDeal(params: {
  maBooking: string;
  totalNet: number;
  sparkAdsCode?: string;
  actualAirDate?: string;
  includeDefaultAddons?: boolean;
}): DealRightsTermItem[] {
  const { maBooking, totalNet, sparkAdsCode, actualAirDate, includeDefaultAddons = true } = params;
  if (!includeDefaultAddons || totalNet <= 0) {
    return [];
  }
  const hasVideoVerified = Boolean(actualAirDate?.trim());
  const hasSparkCode = Boolean(sparkAdsCode?.trim());
  const prefix = maBooking || 'DEAL';
  const adsCost = totalNet >= 10000000 ? Math.round(totalNet * 0.1) : 0;
  const imageCost = totalNet >= 10000000 ? Math.round(totalNet * 0.1) : 0;

  return [
    {
      id: `${prefix}-ADDON-ADS`,
      termType: 'ADS_CODE',
      termLabel: 'Cấp mã quảng cáo Spark Ads (30 ngày)',
      scopeType: 'ASSET',
      anchorType: 'ACCEPTANCE_DATE',
      durationDays: 30,
      allocatedWeightPct: 10,
      allocatedCostVnd: adsCost,
      status: hasSparkCode && hasVideoVerified ? 'ACTIVE' : 'PENDING_ANCHOR',
      acceptanceStatus: !hasVideoVerified
        ? 'LOCKED_BY_VIDEO'
        : hasSparkCode
          ? 'VERIFIED'
          : 'PENDING_ACCEPTANCE',
      evidenceCodeOrUrl: sparkAdsCode || '',
      verifiedAt: hasSparkCode && hasVideoVerified ? actualAirDate : undefined,
    },
    {
      id: `${prefix}-ADDON-IMG`,
      termType: 'IMAGE_USAGE',
      termLabel: 'Quyền sử dụng hình ảnh & file video gốc (30 ngày)',
      scopeType: 'ASSET',
      anchorType: 'ACCEPTANCE_DATE',
      durationDays: 30,
      allocatedWeightPct: 10,
      allocatedCostVnd: imageCost,
      status: hasVideoVerified ? 'ACTIVE' : 'PENDING_ANCHOR',
      acceptanceStatus: !hasVideoVerified
        ? 'LOCKED_BY_VIDEO'
        : hasSparkCode
          ? 'VERIFIED'
          : 'PENDING_ACCEPTANCE',
      evidenceCodeOrUrl: hasSparkCode ? 'Đã bàn giao file video gốc & hình ảnh' : '',
      verifiedAt: hasSparkCode && hasVideoVerified ? actualAirDate : undefined,
    },
  ];
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
 * Tính tổng chi phí của 1 Job (= 1 Bảng công việc trong Phụ lục SOW)
 */
export function computeDealSowJobSubtotal(job: DealSowJobItem): {
  videoNet: number;
  addonsNet: number;
  droppedDeduction: number;
  plannedJobNet: number;
  acceptedJobNet: number;
} {
  const qty = Math.max(1, Number(job.quantity) || 1);
  const videoNet = Math.max(0, Number(job.videoAssetNetCost) || 0) * qty;
  const addons = job.addonServices || [];
  const addonsNet = addons.reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
  const droppedDeduction = addons
    .filter((a) => a.acceptanceStatus === 'DROPPED')
    .reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
  const plannedJobNet = videoNet + addonsNet;
  const acceptedJobNet = Math.max(0, plannedJobNet - droppedDeduction);
  return {
    videoNet,
    addonsNet,
    droppedDeduction,
    plannedJobNet,
    acceptedJobNet,
  };
}

/**
 * Chuẩn hóa danh sách Job (1 Job = 1 Bảng công việc trong Phụ lục SOW) của 1 Deal
 */
export function ensureDealJobsForApprovedItem(
  item: ApprovedBookingListItem
): DealSowJobItem[] {
  const maBo = item.maBooking || 'BO-DEAL';
  const defaultAffiliateChannel = item.storeName?.toLowerCase().includes('shopee')
    ? 'Shopee'
    : 'TikTok Shop';

  if (Array.isArray(item.dealJobs) && item.dealJobs.length > 0) {
    return item.dealJobs.map((job, idx) => {
      const seqStr = String(idx + 1).padStart(2, '0');
      const jobCode = job.jobCode?.trim() || `${maBo}-J${seqStr}`;
      const hasJobAir = Boolean(
        job.linkAir?.trim() ||
          job.actualAirDate?.trim() ||
          (idx === 0 && (item.linkAir?.trim() || item.actualAirDate?.trim()))
      );
      const jobLinkAir = job.linkAir?.trim() || (idx === 0 ? item.linkAir || '' : '');
      const jobActualAir = job.actualAirDate?.trim() || (idx === 0 ? item.actualAirDate || '' : '');
      const jobSparkCode = job.sparkAdsCode?.trim() || (idx === 0 ? item.sparkAdsCode || '' : '');

      const normalizedJobAddons: DealRightsTermItem[] = (job.addonServices || []).map((addon, aIdx) => {
        if (addon.acceptanceStatus === 'DROPPED') {
          return {
            ...addon,
            id: addon.id || `${jobCode}-ADDON-${aIdx + 1}`,
            targetDeliverableId: jobCode,
            status: 'EXPIRED',
          };
        }
        if (!hasJobAir) {
          return {
            ...addon,
            id: addon.id || `${jobCode}-ADDON-${aIdx + 1}`,
            targetDeliverableId: jobCode,
            status: 'PENDING_ANCHOR',
            acceptanceStatus: 'LOCKED_BY_VIDEO',
          };
        }
        const isAdsTerm = addon.termType === 'ADS_CODE';
        const syncedEvidence = isAdsTerm
          ? jobSparkCode || addon.evidenceCodeOrUrl?.trim() || ''
          : addon.evidenceCodeOrUrl?.trim() || '';
        const isVerifiedAddon =
          addon.acceptanceStatus === 'VERIFIED' || (isAdsTerm && Boolean(syncedEvidence));
        return {
          ...addon,
          id: addon.id || `${jobCode}-ADDON-${aIdx + 1}`,
          targetDeliverableId: jobCode,
          evidenceCodeOrUrl: syncedEvidence,
          status: isVerifiedAddon ? 'ACTIVE' : 'PENDING_ANCHOR',
          acceptanceStatus: isVerifiedAddon ? 'VERIFIED' : 'PENDING_ACCEPTANCE',
        };
      });

      return {
        ...job,
        id: job.id || `${jobCode}-ID`,
        jobCode,
        jobTitle:
          job.jobTitle?.trim() ||
          `Bảng công việc #${idx + 1} (${jobCode}) — ${job.productName || item.sanPham || item.brandName}`,
        productName: job.productName?.trim() || item.sanPham || item.brandName,
        mediaChannel: job.mediaChannel || 'TikTok',
        affiliateChannel: job.affiliateChannel || defaultAffiliateChannel,
        plannedAirDate: job.plannedAirDate || item.plannedAirDate || '',
        actualAirDate: jobActualAir || undefined,
        linkAir: jobLinkAir || undefined,
        sparkAdsCode: jobSparkCode || undefined,
        videoAssetNetCost: Math.max(0, Number(job.videoAssetNetCost) || 0),
        quantity: Math.max(1, Number(job.quantity) || 1),
        addonServices: normalizedJobAddons,
        acceptanceStatus: hasJobAir ? 'DA_NGHIEM_THU' : 'CHUA_NGHIEM_THU',
      };
    });
  }

  const fallbackNet = Math.max(0, Number(item.chiPhiBookingNetCuoi) || 0);
  const rawAddons =
    item.addonServices !== undefined
      ? item.addonServices
      : item.bookingOrderCreated && fallbackNet > 0
        ? buildDefaultAddonServicesForDeal({
            maBooking: item.maBooking,
            totalNet: fallbackNet,
            sparkAdsCode: item.sparkAdsCode,
            actualAirDate: item.actualAirDate,
          })
        : [];
  const addonsCost = rawAddons.reduce((s, a) => s + (Number(a.allocatedCostVnd) || 0), 0);
  const defaultVideoNet =
    item.videoAssetNetCost !== undefined
      ? Math.max(0, Number(item.videoAssetNetCost) || 0)
      : Math.max(0, fallbackNet - addonsCost);
  const jobCode = `${maBo}-J01`;
  const hasAir = Boolean(item.linkAir?.trim() || item.actualAirDate?.trim());

  return [
    {
      id: `${jobCode}-ID`,
      jobCode,
      jobTitle: `Bảng công việc #1 (${jobCode}) — ${item.sanPham || item.brandName}`,
      productName: item.sanPham || item.brandName,
      mediaChannel: 'TikTok',
      affiliateChannel: defaultAffiliateChannel,
      plannedAirDate: item.plannedAirDate || '',
      actualAirDate: item.actualAirDate || undefined,
      linkAir: item.linkAir || undefined,
      sparkAdsCode: item.sparkAdsCode || undefined,
      videoAssetNetCost: defaultVideoNet,
      quantity: 1,
      addonServices: rawAddons.map((a, aIdx) => ({
        ...a,
        id: a.id || `${jobCode}-ADDON-${aIdx + 1}`,
        targetDeliverableId: jobCode,
      })),
      acceptanceStatus: hasAir ? 'DA_NGHIEM_THU' : 'CHUA_NGHIEM_THU',
    },
  ];
}

/**
 * Tự động tính toán lại dòng trong List Duyệt Book khi nhân viên sửa Giá cuối, Ngày air hoặc thông tin nghiệm thu
 */
export function recalculateApprovedBookingItem(
  item: ApprovedBookingListItem
): ApprovedBookingListItem {
  const cleanId = normalizeTikTokId(item.idKenh);
  const linkKenh = cleanId ? buildTikTokChannelUrl(cleanId) : item.linkKenh;
  const hasExplicitMultiJobs = Array.isArray(item.dealJobs) && item.dealJobs.length > 0;
  const normalizedDealJobs = ensureDealJobsForApprovedItem(item);

  // Nếu Deal được cấu hình theo danh sách Job (1 Deal -> N Jobs), tổng hợp chi phí từ N Bảng công việc
  const jobsTotals = normalizedDealJobs.map((j) => computeDealSowJobSubtotal(j));
  const sumJobsVideoNet = jobsTotals.reduce((s, t) => s + t.videoNet, 0);
  const sumJobsAddonsNet = jobsTotals.reduce((s, t) => s + t.addonsNet, 0);
  const sumJobsPlannedNet = sumJobsVideoNet + sumJobsAddonsNet;

  const finalNet = hasExplicitMultiJobs
    ? sumJobsPlannedNet
    : Math.max(0, Number(item.chiPhiBookingNetCuoi) || 0);
  const grossWithTax = computeGrossFeeWithTax(finalNet, item.loaiTaiKhoanThanhToan);
  const klGrade = mapTepBookingToSalaryGrade(finalNet);
  const isAdvAlreadyProcessed =
    item.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG' ||
    item.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG' ||
    item.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG';
  const tamUng =
    item.paymentScheduleOption === 'ONE_TIME' && !isAdvAlreadyProcessed
      ? 0
      : Math.max(0, Number(item.soTienTamUngTruoc) || 0);

  const hasAir =
    hasExplicitMultiJobs && normalizedDealJobs.length > 1
      ? normalizedDealJobs.every((j) => Boolean(j.linkAir?.trim() || j.actualAirDate?.trim()))
      : Boolean(
          item.linkAir?.trim() ||
            item.actualAirDate?.trim() ||
            (normalizedDealJobs.length > 0 &&
              Boolean(normalizedDealJobs[0]?.linkAir?.trim() || normalizedDealJobs[0]?.actualAirDate?.trim()))
        );
  const acceptanceStatus = hasAir ? 'DA_NGHIEM_THU' : 'CHUA_NGHIEM_THU';
  const extractedVideoMatch = (item.linkAir || '').match(/\/video\/(\d+)/i);
  const videoId = extractedVideoMatch ? extractedVideoMatch[1] : item.videoId || '';
  const tuanReal = item.actualAirDate
    ? computeWeekLabelFromDate(item.actualAirDate)
    : item.tuanReal || '';
  const thangAirReal = item.actualAirDate
    ? item.actualAirDate.slice(0, 7).replace('-', '/')
    : item.thangAirReal || '';

  // Chuẩn hóa danh sách Dịch vụ gia tăng (Add-on Services) trong Deal & Nghiệm thu 2 tầng tuần tự
  const rawAddons = hasExplicitMultiJobs
    ? normalizedDealJobs.flatMap((j) => j.addonServices || [])
    : item.addonServices !== undefined
      ? item.addonServices
      : item.bookingOrderCreated && finalNet > 0
        ? buildDefaultAddonServicesForDeal({
            maBooking: item.maBooking,
            totalNet: finalNet,
            sparkAdsCode: item.sparkAdsCode,
            actualAirDate: item.actualAirDate,
          })
        : [];

  const normalizedAddons: DealRightsTermItem[] = rawAddons.map((addon) => {
    if (addon.acceptanceStatus === 'DROPPED') {
      return {
        ...addon,
        status: 'EXPIRED',
      };
    }
    // Tầng 1 chưa nghiệm thu Video -> Khóa toàn bộ nghiệm thu dịch vụ gia tăng (Tầng 2)
    if (!hasAir) {
      return {
        ...addon,
        status: 'PENDING_ANCHOR',
        acceptanceStatus: 'LOCKED_BY_VIDEO',
      };
    }
    // Tầng 1 đã nghiệm thu Video -> Mở khóa Tầng 2
    const isAdsTerm = addon.termType === 'ADS_CODE';
    const syncedEvidence = isAdsTerm
      ? item.sparkAdsCode?.trim() || addon.evidenceCodeOrUrl?.trim() || ''
      : addon.evidenceCodeOrUrl?.trim() || '';
    const isVerifiedAddon =
      addon.acceptanceStatus === 'VERIFIED' ||
      (isAdsTerm && Boolean(syncedEvidence));

    let expiresAt = addon.expiresAt;
    if (isVerifiedAddon && !expiresAt && (item.actualAirDate || item.ngayDienLinkAir)) {
      const anchorStr =
        addon.anchorType === 'AIR_DATE'
          ? item.actualAirDate || item.ngayDienLinkAir
          : item.ngayDienLinkAir || item.actualAirDate;
      const anchorDate = new Date(anchorStr);
      if (!Number.isNaN(anchorDate.getTime())) {
        anchorDate.setDate(anchorDate.getDate() + (addon.durationDays || 30));
        expiresAt = getVietnamDateYmd(anchorDate);
      }
    }

    return {
      ...addon,
      evidenceCodeOrUrl: syncedEvidence,
      expiresAt,
      status: isVerifiedAddon ? 'ACTIVE' : 'PENDING_ANCHOR',
      acceptanceStatus: isVerifiedAddon ? 'VERIFIED' : 'PENDING_ACCEPTANCE',
      verifiedAt: isVerifiedAddon
        ? addon.verifiedAt || item.ngayDienLinkAir || item.actualAirDate
        : undefined,
    };
  });

  const addonServicesNetCost = normalizedAddons.reduce(
    (sum, a) => sum + (Number(a.allocatedCostVnd) || 0),
    0
  );
  const khauTruHangMucHuy = normalizedAddons
    .filter((a) => a.acceptanceStatus === 'DROPPED')
    .reduce((sum, a) => sum + (Number(a.allocatedCostVnd) || 0), 0);
  const videoAssetNetCost = hasExplicitMultiJobs
    ? sumJobsVideoNet
    : Math.max(0, finalNet - addonServicesNetCost);
  const dealStructureType: 'VIDEO_ONLY' | 'VIDEO_AND_ADDONS' =
    normalizedAddons.length > 0 || normalizedDealJobs.length > 1
      ? 'VIDEO_AND_ADDONS'
      : 'VIDEO_ONLY';
  const syncedDealJobs: DealSowJobItem[] =
    normalizedDealJobs.length === 1 && !hasExplicitMultiJobs
      ? [
          {
            ...normalizedDealJobs[0],
            videoAssetNetCost,
            addonServices: normalizedAddons,
          },
        ]
      : normalizedDealJobs;

  const activeAddons = normalizedAddons.filter((a) => a.acceptanceStatus !== 'DROPPED');
  let sequentialAcceptanceStage: DealSequentialAcceptanceStage = '1_CHO_NGHIEM_THU_VIDEO';
  let addonsAcceptanceStatus: AddonServicesAcceptanceStatus =
    activeAddons.length > 0 ? 'KHOA_CHO_VIDEO' : 'KHONG_CO';

  if (hasAir) {
    if (activeAddons.length === 0) {
      sequentialAcceptanceStage = '3_DA_NGHIEM_THU_TOAN_DEAL';
      addonsAcceptanceStatus = 'KHONG_CO';
    } else if (activeAddons.every((a) => a.acceptanceStatus === 'VERIFIED')) {
      sequentialAcceptanceStage = '3_DA_NGHIEM_THU_TOAN_DEAL';
      addonsAcceptanceStatus = 'DA_NGHIEM_THU_DU';
    } else {
      sequentialAcceptanceStage = '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC';
      addonsAcceptanceStatus = 'CHO_NGHIEM_THU';
    }
  }

  // Mã HĐNT (1 HĐNT/KOC) & Mã Phụ lục theo Deal (1 Phụ lục/Deal)
  const masterContractCode =
    item.masterContractCode || generateMasterContractCode(cleanId, item.kocId);
  const contractAppendixCode =
    item.contractAppendixCode ||
    (item.bookingOrderCreated && item.maBooking
      ? generateDealAppendixCode(item.maBooking, 1)
      : '');
  const contractAppendixStatus: DealContractAppendixStatus =
    item.contractAppendixStatus ||
    (item.bookingOrderCreated && item.maBooking
      ? 'CHỜ_KÝ'
      : 'CHƯA_LẬP');

  // Số tiền cần thanh toán theo Deal = Tổng giá Deal - Khấu trừ phần hủy - Tạm ứng
  const canThanhToan = Math.max(0, finalNet - khauTruHangMucHuy - tamUng);

  const views30 = Math.max(0, Number(item.views30d) || Number(item.views14d) || 0);
  const gmv30 = Math.max(0, Number(item.gmv30d) || Number(item.gmv14d) || 0);
  const orders30 = Math.max(0, Number(item.orders30d) || Number(item.orders14d) || 0);
  const gpm30 = views30 > 0 ? Math.round((gmv30 / views30) * 1000) : 0;
  const roi30 = finalNet > 0 ? Number((gmv30 / finalNet).toFixed(2)) : 0;

  const views14 = Math.max(0, Number(item.views14d) || 0);
  const gmv14 = Math.max(0, Number(item.gmv14d) || 0);
  const orders14 = Math.max(0, Number(item.orders14d) || 0);
  const gpm14 = views14 > 0 ? Math.round((gmv14 / views14) * 1000) : 0;
  const roi14 = finalNet > 0 ? Number((gmv14 / finalNet).toFixed(2)) : 0;

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

  // Kế toán thanh toán theo Deal: chỉ đủ điều kiện ĐNTT khi hoàn tất nghiệm thu cả Video lẫn các phần khác của Deal
  let paymentStatus: ApprovedBookingPaymentStatus = item.trangThaiPhieuThanhToan;
  if (
    sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL' &&
    paymentStatus === 'Chờ nghiệm thu'
  ) {
    paymentStatus = 'Đủ điều kiện ĐNTT';
  } else if (
    sequentialAcceptanceStage !== '3_DA_NGHIEM_THU_TOAN_DEAL' &&
    paymentStatus === 'Đủ điều kiện ĐNTT'
  ) {
    paymentStatus = 'Chờ nghiệm thu';
  }

  const noiDungChuyenKhoan =
    item.noiDungChuyenKhoan ||
    buildTransferDescription(item.brandName, item.thangPlan, item.maBooking);

  // Luồng 2 (GĐ7 B-54..B-65, P-01): Khóa kỳ nghiệm thu theo tháng Air gốc, không tự nhảy khi bổ sung mã Ads tháng sau
  const thangNghiemThuChot =
    item.thangNghiemThuChot || thangAirReal || item.thangPlan || '2026/10';
  const ngayKhoaData =
    item.ngayKhoaData ||
    computeDataLockDate(item.actualAirDate || item.plannedAirDate, thangNghiemThuChot);
  const chotData =
    item.chotData !== undefined
      ? item.chotData
      : Boolean(
          item.daDiTien ||
            item.larkSlipCode ||
            item.trangThaiPhieuThanhToan === 'Đã thanh toán' ||
            item.trangThaiPhieuThanhToan === 'Đã lập ĐNTT' ||
            item.trangThaiPhieuThanhToan === 'Đã duyệt chờ chi',
        );

  const isLivestreamFormat =
    item.phanLoaiVideo === 'Livestream' || item.dinhDangNghiemThu === 'Phiên Livestream';
  const loaiThanhToanLark =
    item.loaiThanhToanLark ||
    (isLivestreamFormat ? 'Thanh toán Booking Livestream' : 'Thanh toán Booking KOC');

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
    dealStructureType,
    videoAssetNetCost,
    addonServicesNetCost,
    khauTruHangMucHuy,
    addonServices: normalizedAddons,
    dealJobs: syncedDealJobs,
    masterContractCode,
    contractAppendixCode,
    contractAppendixStatus,
    sequentialAcceptanceStage,
    addonsAcceptanceStatus,
    thangNghiemThuChot,
    ngayKhoaData,
    chotData,
    loaiThanhToanLark,
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

  const loaiTaiKhoanThanhToan =
    finalNet === 0
      ? 'FOC / Gửi mẫu 0đ (Không phát sinh thanh toán)'
      : '(Thuế TNCN 10%) Tài khoản cá nhân';

  const baseItem: ApprovedBookingListItem = {
    id: row.id ? `ABL-${row.id}` : `ABL-${sheetKey}-${normalizeTikTokId(row.idKenh)}`,
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
    chiPhiGrossKemThue: computeGrossFeeWithTax(finalNet, loaiTaiKhoanThanhToan),
    klGrade: mapTepBookingToSalaryGrade(finalNet),
    plannedAirDate: plannedAir,
    plannedSendSampleDate: '',
    plannedScriptDate: '',
    plannedDemoDate: '',
    soTienTamUngTruoc: 0,
    loaiTaiKhoanThanhToan,
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
    views14d: 0,
    orders14d: 0,
    gmv14d: 0,
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
    rows
      .filter(
        (row) =>
          row &&
          row.brandChon === 'Yes' &&
          row.trangThai !== 'Từ chối' &&
          row.trangThai !== 'Không phản hồi'
      )
      .slice(0, 2)
      .forEach((row) => {
        const storeObj = storeMap.get(row.store);
        const base = buildApprovedBookingItemFromSheetRow({
          row,
          sheetKey,
          store: storeObj,
        });
        items.push(base);
      });
  });

  return items;
}

function mergeDealsAndKocsIntoApprovedList(
  list: ApprovedBookingListItem[],
  kocs: KocItem[],
  deals: BookingDealItem[]
): ApprovedBookingListItem[] {
  if (list.length === 0) return list;

  // RULE-PERF-01: O(1) Map lookup cho KOC và Deal
  const kocByHandle = new Map<string, KocItem>();
  const kocById = new Map<string, KocItem>();
  for (const k of kocs) {
    if (k.id) kocById.set(k.id, k);
    const h = normalizeTikTokId(k.channelId).toLowerCase();
    if (h) kocByHandle.set(h, k);
  }

  const dealByCode = new Map<string, BookingDealItem>();
  const dealByJobId = new Map<string, BookingDealItem>();
  for (const d of deals) {
    if (d.id) dealByCode.set(d.id.toUpperCase(), d);
    if (d.dealCode) dealByCode.set(d.dealCode.toUpperCase(), d);
    if (d.jobId) dealByJobId.set(d.jobId, d);
  }

  return list.map((rawItem) => {
    const cleanHandle = normalizeTikTokId(rawItem.idKenh).toLowerCase();
    const matchedKoc =
      (rawItem.kocId ? kocById.get(rawItem.kocId) : undefined) ||
      (cleanHandle ? kocByHandle.get(cleanHandle) : undefined);

    const matchedDeal =
      (rawItem.maBooking ? dealByCode.get(rawItem.maBooking.toUpperCase()) : undefined) ||
      (rawItem.linkedDealId ? dealByCode.get(rawItem.linkedDealId.toUpperCase()) : undefined) ||
      dealByJobId.get(rawItem.id);

    const isRebookFromKoc =
      Boolean(matchedKoc?.totalPastDeals && matchedKoc.totalPastDeals > 0) ||
      Boolean(matchedKoc?.totalPastGmv && matchedKoc.totalPastGmv > 0);
    const finalNetVal = Number(rawItem.chiPhiBookingNetCuoi) || 0;
    const syncedHinhThuc: 'New' | 'Rebook' | 'FOC' =
      finalNetVal === 0
        ? 'FOC'
        : rawItem.hinhThucHopTac === 'Rebook' || isRebookFromKoc
          ? 'Rebook'
          : rawItem.hinhThucHopTac || 'New';

    const next: ApprovedBookingListItem = {
      ...rawItem,
      kocId: matchedKoc?.id || rawItem.kocId,
      hinhThucHopTac: syncedHinhThuc,
      tenKenh: rawItem.tenKenh || matchedKoc?.stageName || matchedKoc?.realName || rawItem.idKenh,
      follower: rawItem.follower || matchedKoc?.followers || 0,
      tenTaiKhoanNganHang:
        rawItem.tenTaiKhoanNganHang || matchedDeal?.kocBankHolder || matchedKoc?.realName || '',
      soTaiKhoan:
        rawItem.soTaiKhoan || matchedDeal?.kocBankAccount || matchedKoc?.bankAccount || '',
      nganHang:
        rawItem.nganHang || matchedDeal?.kocBankName || matchedKoc?.bankName || '',
      soCccd:
        rawItem.soCccd || matchedDeal?.kocIdCardNumber || matchedKoc?.cccd || '',
      sdtNhanHang: rawItem.sdtNhanHang || matchedKoc?.shippingPhone || matchedKoc?.phone || '',
      diaChiNhanHang: rawItem.diaChiNhanHang || matchedKoc?.shippingAddress || '',
      sampleStatus: rawItem.sampleStatus || matchedDeal?.sampleStatus,
      sampleTrackingCode: rawItem.sampleTrackingCode || matchedDeal?.sampleTrackingCode,
      sampleCarrier: rawItem.sampleCarrier || matchedDeal?.sampleCarrier,
      masterContractCode:
        matchedDeal?.masterContractCode || rawItem.masterContractCode,
      contractAppendixCode:
        matchedDeal?.contractAppendixCode || rawItem.contractAppendixCode,
      contractAppendixStatus:
        matchedDeal?.contractAppendixStatus === 'ĐÃ_KÝ'
          ? 'ĐÃ_KÝ'
          : matchedDeal?.contractAppendixStatus || rawItem.contractAppendixStatus,
      paymentScheduleOption:
        matchedDeal?.paymentScheduleOption || rawItem.paymentScheduleOption,
      soTienTamUngTruoc:
        matchedDeal?.paymentScheduleOption === 'ONE_TIME'
          ? 0
          : matchedDeal?.paymentScheduleOption === 'TWO_TIMES' && (matchedDeal.advanceAmount || 0) > 0
            ? rawItem.soTienTamUngTruoc || matchedDeal.advanceAmount
            : rawItem.soTienTamUngTruoc,
      larkApprovalInstanceCode:
        matchedDeal?.larkFinalApprovalCode || rawItem.larkApprovalInstanceCode,
      linkAir: rawItem.linkAir || matchedDeal?.tiktokVideoUrl || matchedDeal?.videoUrl || '',
      actualAirDate: rawItem.actualAirDate || matchedDeal?.postedDate || '',
      sparkAdsCode: rawItem.sparkAdsCode || matchedDeal?.sparkAdsCode || '',
    };

    return recalculateApprovedBookingItem(next);
  });
}

function buildRealBrandApprovedListFromSheets(
  kocs: KocItem[],
  stores: StorePortfolioItem[],
  deals: BookingDealItem[],
  defaultStaffName = 'Chuyên viên Booking'
): ApprovedBookingListItem[] {
  const sheetCollection = loadStaffSheetCollection(kocs, stores, deals, defaultStaffName);
  const storeMap = new Map(stores.map((s) => [s.storeName, s]));
  const items: ApprovedBookingListItem[] = [];
  Object.entries(sheetCollection.sheets).forEach(([sheetKey, rows]) => {
    if (!Array.isArray(rows)) return;
    rows
      .filter(
        (r) =>
          r &&
          r.brandChon === 'Yes' &&
          r.trangThai !== 'Từ chối' &&
          r.trangThai !== 'Không phản hồi'
      )
      .forEach((row) => {
        const storeObj = storeMap.get(row.store);
        const created = buildApprovedBookingItemFromSheetRow({
          row,
          sheetKey,
          store: storeObj,
        });
        items.push({
          ...created,
          id: row.id ? `ABL-${row.id}` : created.id,
        });
      });
  });
  return items;
}

let memoryApprovedListCache: ApprovedBookingListItem[] | null = null;
let lastApprovedKocsCount = -1;
let lastApprovedDealsCount = -1;
let pendingApprovedPersistTimer: ReturnType<typeof setTimeout> | null = null;

function flushPendingApprovedListPersist(): void {
  if (typeof window === 'undefined' || !memoryApprovedListCache) return;
  if (pendingApprovedPersistTimer) {
    clearTimeout(pendingApprovedPersistTimer);
    pendingApprovedPersistTimer = null;
  }
  try {
    window.localStorage.setItem(
      APPROVED_BOOKING_LIST_STORAGE_KEY,
      JSON.stringify(memoryApprovedListCache)
    );
  } catch {
    // ignore storage errors
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingApprovedListPersist);
}

export function loadApprovedBookingList(
  kocs: KocItem[] = [],
  stores: StorePortfolioItem[] = [],
  deals: BookingDealItem[] = [],
  defaultStaffName?: string
): ApprovedBookingListItem[] {
  if (typeof window === 'undefined') {
    const realApproved = buildRealBrandApprovedListFromSheets(
      kocs,
      stores,
      deals,
      defaultStaffName
    );
    return mergeDealsAndKocsIntoApprovedList(
      realApproved.length > 0
        ? realApproved
        : buildInitialApprovedBookingList(kocs, stores, deals, defaultStaffName),
      kocs,
      deals
    );
  }

  if (memoryApprovedListCache && memoryApprovedListCache.length > 0) {
    if (kocs.length !== lastApprovedKocsCount || deals.length !== lastApprovedDealsCount) {
      memoryApprovedListCache = mergeDealsAndKocsIntoApprovedList(
        memoryApprovedListCache,
        kocs,
        deals
      );
      lastApprovedKocsCount = kocs.length;
      lastApprovedDealsCount = deals.length;
    }
    return memoryApprovedListCache;
  }

  const realApproved = buildRealBrandApprovedListFromSheets(
    kocs,
    stores,
    deals,
    defaultStaffName
  );
  try {
    const raw = window.localStorage.getItem(APPROVED_BOOKING_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ApprovedBookingListItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasRealRows = parsed.some(
          (i) => i.sourceSheetRowId && i.sourceSheetRowId.startsWith('SSR-')
        );
        // Nếu localStorage chỉ có vài dòng mẫu cũ chưa có dữ liệu Lark Base 3.1 thực tế -> nạp dữ liệu thực tế
        if (!hasRealRows && realApproved.length > 0) {
          const mergedReal = mergeDealsAndKocsIntoApprovedList(realApproved, kocs, deals);
          memoryApprovedListCache = mergedReal;
          lastApprovedKocsCount = kocs.length;
          lastApprovedDealsCount = deals.length;
          try {
            window.localStorage.setItem(
              APPROVED_BOOKING_LIST_STORAGE_KEY,
              JSON.stringify(mergedReal)
            );
          } catch {
            // ignore quota
          }
          return mergedReal;
        }
        // Bổ sung các dòng Brand duyệt Yes mới từ Lark Base 3.1 chưa có trong danh sách
        if (realApproved.length > 0) {
          const existingRowIds = new Set(
            parsed.map((i) => i.sourceSheetRowId || i.id).filter(Boolean)
          );
          const missingReal = realApproved.filter(
            (r) => r.sourceSheetRowId && !existingRowIds.has(r.sourceSheetRowId)
          );
          if (missingReal.length > 0) {
            const combined = mergeDealsAndKocsIntoApprovedList(
              [...parsed, ...missingReal],
              kocs,
              deals
            );
            memoryApprovedListCache = combined;
            lastApprovedKocsCount = kocs.length;
            lastApprovedDealsCount = deals.length;
            try {
              window.localStorage.setItem(
                APPROVED_BOOKING_LIST_STORAGE_KEY,
                JSON.stringify(combined)
              );
            } catch {
              // ignore quota
            }
            return combined;
          }
        }
        const mergedParsed = mergeDealsAndKocsIntoApprovedList(parsed, kocs, deals);
        memoryApprovedListCache = mergedParsed;
        lastApprovedKocsCount = kocs.length;
        lastApprovedDealsCount = deals.length;
        return mergedParsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const initial = mergeDealsAndKocsIntoApprovedList(
    realApproved.length > 0
      ? realApproved
      : buildInitialApprovedBookingList(kocs, stores, deals, defaultStaffName),
    kocs,
    deals
  );
  saveApprovedBookingList(initial, false);
  return initial;
}

export function saveApprovedBookingList(
  list: ApprovedBookingListItem[],
  emitEvent = true
): void {
  memoryApprovedListCache = list;
  if (typeof window === 'undefined') return;
  try {
    if (pendingApprovedPersistTimer) clearTimeout(pendingApprovedPersistTimer);
    pendingApprovedPersistTimer = setTimeout(() => {
      pendingApprovedPersistTimer = null;
      flushPendingApprovedListPersist();
    }, 250);
    if (emitEvent) {
      pushSharedStateToDb('approved-booking-list-v2', list);
      window.dispatchEvent(
        new CustomEvent(APPROVED_BOOKING_LIST_UPDATED_EVENT, { detail: list })
      );
      window.dispatchEvent(
        new CustomEvent('upbase:approved-booking-list-updated', { detail: list })
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
      const locked = isApprovedDealDataLocked(existing);
      const merged = recalculateApprovedBookingItem({
        ...existing,
        sourceSheetRowId: row.id,
        sourceSheetKey: sheetKey,
        dot: locked ? existing.dot : row.dot || existing.dot,
        sanPham: locked ? existing.sanPham : row.sanPham || existing.sanPham,
        pillarContent: row.contentTag || existing.pillarContent,
        contentAngle: row.contentNote || existing.contentAngle,
        giaDeXuatNet: locked
          ? existing.giaDeXuatNet
          : Number(row.giaNetVideo) || existing.giaDeXuatNet,
        chiPhiBookingNetCuoi: locked
          ? existing.chiPhiBookingNetCuoi
          : existing.chiPhiBookingNetCuoi || Number(row.giaNetVideo) || 0,
        plannedAirDate: locked
          ? existing.plannedAirDate
          : existing.plannedAirDate || row.ngayAirPlan || '',
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
  const normalized = recalculateApprovedBookingItem(item);
  const fallbackSeq =
    parseInt(String(normalized.id || normalized.sourceSheetRowId || '').replace(/\D/g, '').slice(-5), 10) || 10001;
  const maBo = normalized.maBooking || generateBookingOrderCode(normalized.thangPlan, fallbackSeq);
  const salaryGrade: SalaryGrade = normalized.klGrade || 'KL3';
  const isVideoVerified = normalized.acceptanceStatus === 'DA_NGHIEM_THU';
  const isFullyVerified =
    normalized.sequentialAcceptanceStage === '3_DA_NGHIEM_THU_TOAN_DEAL';
  const addons = normalized.addonServices || [];
  const addonsCost = normalized.addonServicesNetCost || 0;
  const videoCost =
    normalized.videoAssetNetCost ?? Math.max(0, normalized.chiPhiBookingNetCuoi - addonsCost);
  const dealJobs = ensureDealJobsForApprovedItem({
    ...normalized,
    maBooking: maBo,
  });
  const deliverables: DealDeliverableItem[] = dealJobs.map((job, idx) => {
    const jobSub = computeDealSowJobSubtotal(job);
    const isJobVerified = job.acceptanceStatus === 'DA_NGHIEM_THU' || isVideoVerified;
    return {
      id: `${job.jobCode || `${maBo}-J0${idx + 1}`}-ASSET-VID`,
      title: `Bảng công việc #${idx + 1} (${job.jobCode}) — ${job.productName || normalized.sanPham || normalized.brandName}`,
      mediaChannel: job.mediaChannel || 'TikTok',
      affiliateChannel:
        job.affiliateChannel ||
        (normalized.storeName.toLowerCase().includes('shopee') ? 'Shopee' : 'TikTok Shop'),
      productionType: 'ORIGINAL',
      wave: 0,
      lockStatus: isJobVerified ? 'VERIFIED' : 'UNLOCKED',
      assignedChannelPic: normalized.nguoiPhuTrach,
      allocatedWeightPct:
        normalized.chiPhiBookingNetCuoi > 0
          ? Math.round((jobSub.plannedJobNet / normalized.chiPhiBookingNetCuoi) * 100)
          : Math.round(100 / Math.max(1, dealJobs.length)),
      allocatedCostVnd: jobSub.videoNet,
      airDate: job.actualAirDate || job.plannedAirDate || normalized.actualAirDate || normalized.plannedAirDate || undefined,
      publishedUrl: job.linkAir || (idx === 0 ? normalized.linkAir || undefined : undefined),
    };
  });

  const activeAdsAddons = addons.filter(
    (a) => a.termType === 'ADS_CODE' && a.acceptanceStatus !== 'DROPPED',
  );
  const resolvedAdsCodeStatus: BookingDealItem['adsCodeStatus'] =
    normalized.sparkAdsCode?.trim() ||
    (activeAdsAddons.length > 0 &&
      activeAdsAddons.every((a) => a.acceptanceStatus === 'VERIFIED'))
      ? 'ĐÃ_NGHIỆM_THU'
      : activeAdsAddons.length === 0
        ? 'KHÔNG_DÙNG'
        : 'CHƯA_CẤP';
  const resolvedDealStatus: BookingDealItem['status'] =
    normalized.daDiTien || normalized.trangThaiPhieuThanhToan === 'Đã thanh toán'
      ? 'FINAL_PAID'
      : isVideoVerified
        ? 'VIDEO_VERIFIED'
        : normalized.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG' ||
            normalized.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG'
          ? 'ADVANCE_PAID'
          : 'CONTRACT_GENERATED';

  return {
    id: maBo,
    dealCode: maBo,
    jobId: normalized.id,
    campaignCode: `CAMP-${normalized.thangPlan.replace(/\D/g, '')}`,
    campaignTitle: `Chiến dịch ${normalized.brandName} (${normalized.thangPlan})`,
    brandName: normalized.brandName,
    storeName: normalized.storeName,
    productName: normalized.sanPham,
    bookingBatch: normalized.dot || 'Đợt 1',
    bookingFormat:
      normalized.phanLoaiVideo === 'Livestream' ||
      normalized.dinhDangNghiemThu === 'Phiên Livestream'
        ? 'Booking Livestream KOC'
        : 'Booking Video KOC',
    kocId: normalized.kocId || `KOC-${normalized.idKenh}`,
    kocStageName: normalized.tenKenh || normalized.idKenh,
    kocChannelId: `@${normalizeTikTokId(normalized.idKenh)}`,
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
    tepKenh: (normalized.tepKenh as BookingDealItem['tepKenh']) || 'Chưa phân loại',
    kocCategory: 'Reviewer',
    contentPillar: 'Review trực tiếp',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    brandApprovalDate: normalized.createdAt.slice(0, 10),
    kocResponseStatus: 'ĐỒNG_Ý',
    pipelineText: isFullyVerified
      ? 'Done'
      : isVideoVerified
        ? 'Chờ nghiệm thu dịch vụ đi kèm'
        : 'Đang triển khai',
    status: resolvedDealStatus,
    statusLabel: isFullyVerified
      ? 'Đã nghiệm thu toàn Deal'
      : isVideoVerified
        ? 'Đã nghiệm thu Video (Chờ phần khác)'
        : 'Đã lập Phụ lục Deal & Gửi mẫu',
    currentStage: isFullyVerified
      ? '5_SETTLEMENT'
      : isVideoVerified
        ? '4_AIR_GROWTH'
        : '2_DEAL_CONTRACT',
    sparkAdsCode: normalized.sparkAdsCode || undefined,
    adsCodeStatus: resolvedAdsCodeStatus,
    tiktokVideoUrl: normalized.linkAir || undefined,
    videoUrl: normalized.linkAir || undefined,
    assignedStaff: normalized.nguoiPhuTrach,
    bookingPic: normalized.nguoiPhuTrach,
    leadBooking: normalized.leaderName,
    totalValue: normalized.chiPhiBookingNetCuoi,
    advanceAmount: normalized.soTienTamUngTruoc,
    finalAmount: normalized.soTienCanThanhToan,
    deadlinePost: normalized.plannedAirDate,
    postedDate: normalized.actualAirDate || undefined,
    viewsCount: normalized.views30d || 0,
    affiliateGmv: normalized.gmv30d || 0,
    gmv30: normalized.gmv30d || 0,
    roi: normalized.roi30d || 0,
    ordersCount: normalized.orders30d || 0,
    publishedDays: isVideoVerified ? 7 : 0,
    remainingSlaHours: 48,
    isSlaWarning: false,
    kocBankName: normalized.nganHang || undefined,
    kocBankAccount: normalized.soTaiKhoan || undefined,
    kocBankHolder: normalized.tenTaiKhoanNganHang || undefined,
    kocIdCardNumber: normalized.soCccd || undefined,
    hasIdCardScan: Boolean(normalized.soCccd?.trim()),
    legalProfileId: normalized.legalProfileId || undefined,
    sampleStatus: normalized.sampleStatus,
    sampleTrackingCode: normalized.sampleTrackingCode,
    sampleCarrier: (['GHN', 'ViettelPost', 'J&T', 'ShopeeExpress'].includes(normalized.sampleCarrier || '') ? (normalized.sampleCarrier as 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress') : undefined),
    contractScanUrl: undefined,
    invoiceNumber: normalized.soHoaDonVat || normalized.draftInvoiceCode || undefined,
    draftInvoiceCode: normalized.draftInvoiceCode || undefined,
    larkAdvanceApprovalCode:
      normalized.larkAdvanceStatus !== 'TỪ_CHỐI_TẠM_ỨNG'
        ? normalized.larkAdvanceInstanceCode || normalized.larkAdvanceSlipCode || undefined
        : undefined,
    larkFinalApprovalCode: normalized.larkApprovalInstanceCode || undefined,
    committedOutputsCount: dealJobs.reduce((s, j) => s + Math.max(1, Number(j.quantity) || 1), 0),
    dealType: addons.length > 0 || dealJobs.length > 1 ? 'MULTI_PLATFORM_CONTENT' : 'SINGLE_CONTENT',
    pricingDisplayMode:
      salaryGrade === 'KL4' ||
      salaryGrade === 'KL5' ||
      salaryGrade === 'KL6' ||
      salaryGrade === 'KL7'
        ? 'ITEMIZED_SOW'
        : 'PACKAGE_TOTAL',
    deliverables,
    rightsTerms: addons,
    dealJobs,
    masterContractCode: normalized.masterContractCode,
    masterContractStatus: normalized.masterContractStatus,
    masterContractGoogleDocsUrl: normalized.masterContractGoogleDocsUrl,
    masterContractSignedUrl: normalized.masterContractSignedUrl,
    contractAppendixCode:
      normalized.contractAppendixCode || generateDealAppendixCode(maBo, 1),
    contractAppendixStatus: normalized.contractAppendixStatus || 'CHỜ_KÝ',
    paymentScheduleOption:
      normalized.paymentScheduleOption ||
      (normalized.soTienTamUngTruoc > 0 ? 'TWO_TIMES' : undefined),
    soTienTamUngTruoc: normalized.soTienTamUngTruoc,
    contractAppendixGoogleDocsUrl: normalized.contractAppendixGoogleDocsUrl,
    contractAppendixSignedUrl: normalized.contractAppendixSignedUrl,
    bbntCode: normalized.bbntCode,
    bbntStatus: normalized.bbntStatus,
    bbntGoogleDocsUrl: normalized.bbntGoogleDocsUrl,
    bbntSignedUrl: normalized.bbntSignedUrl,
    signedContractUrl:
      normalized.contractAppendixSignedUrl ||
      normalized.masterContractSignedUrl ||
      undefined,
    videoAssetCostVnd: videoCost,
    addonsCostVnd: addonsCost,
    droppedCostVnd: normalized.khauTruHangMucHuy || 0,
    sequentialAcceptanceStage: normalized.sequentialAcceptanceStage,
    stage1VideoVerifiedAt: isVideoVerified
      ? normalized.ngayDienLinkAir || normalized.actualAirDate
      : undefined,
    stage2AddonsVerifiedAt: isFullyVerified
      ? normalized.ngayDienLinkAir || normalized.actualAirDate
      : undefined,
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
  const todayStr = getVietnamDateYmd();

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
    const locked = isApprovedDealDataLocked(target);
    const maBooking =
      target.maBooking || generateBookingOrderCode(target.thangPlan, targetIdx + 501);
    const actualAirDate = locked
      ? target.actualAirDate
      : acc.actualAirDate || target.actualAirDate || todayStr;
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
      linkAir: locked ? target.linkAir : acc.linkAir || target.linkAir,
      videoId: locked ? target.videoId : acc.videoId || target.videoId,
      actualAirDate,
      ngayDienLinkAir: locked ? target.ngayDienLinkAir : todayStr,
      sparkAdsCode: locked
        ? target.sparkAdsCode
        : acc.sparkAdsCode || target.sparkAdsCode || '',
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
  includeHeaders = true,
  canViewFullPii = false
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
    'Mã HĐNT',
    'Trạng thái HĐNT',
    'Link HĐNT (Google Docs)',
    'Link HĐNT đã ký',
    'Mã Phụ lục (PL SOW)',
    'Trạng thái PL SOW',
    'Link PL SOW (Google Docs)',
    'Link PL SOW đã ký',
    'Mã BBNT',
    'Trạng thái BBNT',
    'Link BBNT (Google Docs)',
    'Link BBNT đã ký',
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
      canViewFullPii ? it.soTaiKhoan : maskSensitivePii(it.soTaiKhoan, false),
      it.nganHang,
      canViewFullPii ? it.soCccd : maskSensitivePii(it.soCccd, false),
      canViewFullPii ? it.sdtNhanHang : maskSensitivePii(it.sdtNhanHang, false),
      it.diaChiNhanHang,
      it.masterContractCode || '',
      it.masterContractStatus || '',
      it.masterContractGoogleDocsUrl || '',
      it.masterContractSignedUrl || '',
      it.contractAppendixCode || '',
      it.contractAppendixStatus || '',
      it.contractAppendixGoogleDocsUrl || '',
      it.contractAppendixSignedUrl || '',
      it.bbntCode || '',
      it.bbntStatus || '',
      it.bbntGoogleDocsUrl || '',
      it.bbntSignedUrl || '',
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
  storeFilter: string,
  canViewFullPii = false
): void {
  if (typeof window === 'undefined') return;
  const tsv = formatApprovedBookingListToTsv(items, true, canViewFullPii);
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

/**
 * Tải danh sách Booking đã duyệt (đồng bộ từ máy chủ hoặc bộ nhớ đệm).
 */
export async function hydrateApprovedBookingListFromServer(
  allKocs: KocItem[],
  allStores: StorePortfolioItem[],
  allDeals: BookingDealItem[] = [],
): Promise<ApprovedBookingListItem[]> {
  return loadApprovedBookingList(allKocs, allStores, allDeals);
}
