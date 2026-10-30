import type { ApprovedBookingListItem } from './approvedBookingList';

export type ReportColumnColor = 'blue' | 'black' | 'orange' | 'red';
export type ReportColumnFillMode = 'BOOKING_MASTER' | 'SELLER_DATA' | 'ADS_DATA' | 'FORMULA';
export type ReportNumberFormat = 'NONE' | 'INTEGER' | 'PERCENT' | 'DECIMAL';

export interface BookingReportColumnMeta {
  index: number;
  excelCol: string;
  key: keyof BookingReportSheetRow;
  header: string;
  group: string;
  color: ReportColumnColor;
  fillMode: ReportColumnFillMode;
  numberFormat: ReportNumberFormat;
  width: number;
  formulaBuilder?: (rowNum: number) => string;
}

/**
 * Cấu trúc tinh gọn 28 cột (A -> AB) cho Sheet 3 — Kết quả & Nghiệm thu Video:
 * - Nhóm 1 (A -> G): Định danh Deal & KOC (7 cột)
 * - Nhóm 2 (H -> M): Thực thi & Nghiệm thu Air (6 cột)
 * - Nhóm 3 (N -> Q): Chi phí Booking & Ads (4 cột)
 * - Nhóm 4 (R -> AB): Kết quả Bán hàng, Ads & ROI (11 cột)
 */
export interface BookingReportSheetRow {
  // 1. Định danh Deal & KOC (A -> G)
  thangReport: string;      // A: Tháng
  store: string;            // B: Gian hàng
  bookingId: string;        // C: Mã Booking
  pic: string;              // D: PIC
  kocTier: string;          // E: Bậc KOC
  creatorName: string;      // F: ID kênh
  kocName: string;          // G: Tên KOC

  // 2. Thực thi & Nghiệm thu Air (H -> M)
  product: string;          // H: Sản phẩm
  planAirDate: string;      // I: Ngày Air dự kiến
  airDate: string;          // J: Ngày Air thực tế
  videoUrl: string;         // K: Link video Air
  videoId: string;          // L: ID video
  sparkAdsCode: string;     // M: Mã Spark Ads

  // 3. Chi phí Booking & Ads (N -> Q)
  costBookingNet: number;   // N: Giá Booking Net
  costBookingGross: number; // O: Giá Booking Gross (=N/0.9)
  costAds: number;          // P: Chi phí Ads
  totalCost: number;        // Q: Tổng chi phí (=O+P)

  // 4. Kết quả Bán hàng, Ads & ROI (R -> AB)
  view: number;             // R: Views
  interactions: number;     // S: Tương tác
  click: number;            // T: Click giỏ hàng
  ordersTotal: number;      // U: Đơn hàng
  gmvTotal: number;         // V: GMV video
  gpm: number;              // W: GPM (=V/R*1000)
  gmvAds: number;           // X: GMV Ads
  roasAds: number;          // Y: ROAS Ads (=X/P)
  roiTotal: number;         // Z: ROI Tổng (=V/Q)
  cpv: number;              // AA: CPV (=Q/R)
  danhGia: string;          // AB: Đánh giá
}

export const DEFAULT_REPORT_SHEET_TAB = 'Template Report Video - đã chốt';

export const BOOKING_REPORT_LEGEND_ROW: string[] = (() => {
  const row = new Array<string>(28).fill('');
  row[0] = '*Note: Sheet Kết quả tinh gọn (28 cột)';
  row[1] = 'Chữ xanh: Data Booking';
  row[2] = 'Chữ đen: Data Seller';
  row[3] = 'Chữ cam: Data Ads';
  row[4] = 'Chữ đỏ: Công thức tự động';
  return row;
})();

export const BOOKING_REPORT_COLUMNS: BookingReportColumnMeta[] = [
  // 1. Định danh Deal & KOC (A -> G)
  { index: 1, excelCol: 'A', key: 'thangReport', header: 'Tháng', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 95 },
  { index: 2, excelCol: 'B', key: 'store', header: 'Gian hàng', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 165 },
  { index: 3, excelCol: 'C', key: 'bookingId', header: 'Mã Booking', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 135 },
  { index: 4, excelCol: 'D', key: 'pic', header: 'PIC', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 135 },
  { index: 5, excelCol: 'E', key: 'kocTier', header: 'Bậc KOC', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 90 },
  { index: 6, excelCol: 'F', key: 'creatorName', header: 'ID kênh', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 150 },
  { index: 7, excelCol: 'G', key: 'kocName', header: 'Tên KOC', group: '1. Định danh Deal & KOC', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 155 },

  // 2. Thực thi & Nghiệm thu Air (H -> M)
  { index: 8, excelCol: 'H', key: 'product', header: 'Sản phẩm', group: '2. Thực thi & Nghiệm thu Air', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 195 },
  { index: 9, excelCol: 'I', key: 'planAirDate', header: 'Ngày Air dự kiến', group: '2. Thực thi & Nghiệm thu Air', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'NONE', width: 120 },
  { index: 10, excelCol: 'J', key: 'airDate', header: 'Ngày Air thực tế', group: '2. Thực thi & Nghiệm thu Air', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'NONE', width: 125 },
  {
    index: 11,
    excelCol: 'K',
    key: 'videoUrl',
    header: 'Link video Air',
    group: '2. Thực thi & Nghiệm thu Air',
    color: 'blue',
    fillMode: 'BOOKING_MASTER',
    numberFormat: 'NONE',
    width: 210,
    formulaBuilder: (r) => `=IF(AND(F${r}<>"",L${r}<>""),"https://www.tiktok.com/@"&F${r}&"/video/"&L${r},"")`,
  },
  { index: 12, excelCol: 'L', key: 'videoId', header: 'ID video', group: '2. Thực thi & Nghiệm thu Air', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'NONE', width: 155 },
  { index: 13, excelCol: 'M', key: 'sparkAdsCode', header: 'Mã Spark Ads', group: '2. Thực thi & Nghiệm thu Air', color: 'orange', fillMode: 'ADS_DATA', numberFormat: 'NONE', width: 145 },

  // 3. Chi phí Booking & Ads (N -> Q)
  { index: 14, excelCol: 'N', key: 'costBookingNet', header: 'Giá Booking Net', group: '3. Chi phí Booking & Ads', color: 'blue', fillMode: 'BOOKING_MASTER', numberFormat: 'INTEGER', width: 130 },
  {
    index: 15,
    excelCol: 'O',
    key: 'costBookingGross',
    header: 'Giá Booking Gross',
    group: '3. Chi phí Booking & Ads',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'INTEGER',
    width: 135,
    formulaBuilder: (r) => `=IF(N${r}>0, ROUND(N${r}/0.9, 0), 0)`,
  },
  { index: 16, excelCol: 'P', key: 'costAds', header: 'Chi phí Ads', group: '3. Chi phí Booking & Ads', color: 'orange', fillMode: 'ADS_DATA', numberFormat: 'INTEGER', width: 120 },
  {
    index: 17,
    excelCol: 'Q',
    key: 'totalCost',
    header: 'Tổng chi phí',
    group: '3. Chi phí Booking & Ads',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'INTEGER',
    width: 130,
    formulaBuilder: (r) => `=O${r}+P${r}`,
  },

  // 4. Kết quả Bán hàng, Ads & ROI (R -> AB)
  { index: 18, excelCol: 'R', key: 'view', header: 'Views', group: '4. Kết quả Bán hàng & ROI', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'INTEGER', width: 105 },
  { index: 19, excelCol: 'S', key: 'interactions', header: 'Tương tác', group: '4. Kết quả Bán hàng & ROI', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'INTEGER', width: 100 },
  { index: 20, excelCol: 'T', key: 'click', header: 'Click giỏ hàng', group: '4. Kết quả Bán hàng & ROI', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'INTEGER', width: 110 },
  { index: 21, excelCol: 'U', key: 'ordersTotal', header: 'Đơn hàng', group: '4. Kết quả Bán hàng & ROI', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'INTEGER', width: 100 },
  { index: 22, excelCol: 'V', key: 'gmvTotal', header: 'GMV video', group: '4. Kết quả Bán hàng & ROI', color: 'black', fillMode: 'SELLER_DATA', numberFormat: 'INTEGER', width: 135 },
  {
    index: 23,
    excelCol: 'W',
    key: 'gpm',
    header: 'GPM',
    group: '4. Kết quả Bán hàng & ROI',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'INTEGER',
    width: 115,
    formulaBuilder: (r) => `=IF(R${r}>0, ROUND(V${r}/R${r}*1000, 0), 0)`,
  },
  { index: 24, excelCol: 'X', key: 'gmvAds', header: 'GMV Ads', group: '4. Kết quả Bán hàng & ROI', color: 'orange', fillMode: 'ADS_DATA', numberFormat: 'INTEGER', width: 130 },
  {
    index: 25,
    excelCol: 'Y',
    key: 'roasAds',
    header: 'ROAS Ads',
    group: '4. Kết quả Bán hàng & ROI',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'DECIMAL',
    width: 100,
    formulaBuilder: (r) => `=IF(P${r}>0, X${r}/P${r}, 0)`,
  },
  {
    index: 26,
    excelCol: 'Z',
    key: 'roiTotal',
    header: 'ROI Tổng',
    group: '4. Kết quả Bán hàng & ROI',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'DECIMAL',
    width: 100,
    formulaBuilder: (r) => `=IF(Q${r}>0, V${r}/Q${r}, 0)`,
  },
  {
    index: 27,
    excelCol: 'AA',
    key: 'cpv',
    header: 'CPV',
    group: '4. Kết quả Bán hàng & ROI',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'INTEGER',
    width: 95,
    formulaBuilder: (r) => `=IF(R${r}>0, ROUND(Q${r}/R${r}, 0), 0)`,
  },
  {
    index: 28,
    excelCol: 'AB',
    key: 'danhGia',
    header: 'Đánh giá',
    group: '4. Kết quả Bán hàng & ROI',
    color: 'red',
    fillMode: 'FORMULA',
    numberFormat: 'NONE',
    width: 125,
    formulaBuilder: (r) => `=IF(K${r}="","Chờ lên bài",IF(Z${r}>=5,"Vượt Target",IF(Z${r}>=2,"Đạt Target","Cần tối ưu")))`,
  },
];

export const BOOKING_REPORT_HEADERS: string[] = BOOKING_REPORT_COLUMNS.map((c) => c.header);

export function createEmptyReportSheetRow(): BookingReportSheetRow {
  return {
    thangReport: '',
    store: '',
    bookingId: '',
    pic: '',
    kocTier: '',
    creatorName: '',
    kocName: '',
    product: '',
    planAirDate: '',
    airDate: '',
    videoUrl: '',
    videoId: '',
    sparkAdsCode: '',
    costBookingNet: 0,
    costBookingGross: 0,
    costAds: 0,
    totalCost: 0,
    view: 0,
    interactions: 0,
    click: 0,
    ordersTotal: 0,
    gmvTotal: 0,
    gpm: 0,
    gmvAds: 0,
    roasAds: 0,
    roiTotal: 0,
    cpv: 0,
    danhGia: 'Chờ lên bài',
  };
}

export function extractVideoIdFromUrl(url?: string): string {
  if (!url) return '';
  const m = String(url).match(/\/video\/(\d{15,22})/);
  return m ? m[1] : '';
}

export function formatMonthLabelForReport(monthKey?: string): string {
  if (!monthKey) return '';
  const m = String(monthKey).match(/(\d{4})[/-](\d{1,2})/);
  if (m) return `${m[1]}/${String(m[2]).padStart(2, '0')}`;
  return monthKey;
}

/**
 * Chuyển đổi 1 dòng ApprovedBookingListItem sang cấu trúc tinh gọn 28 cột (A -> AB)
 */
export function buildReportSheetRowFromApprovedItem(
  item: ApprovedBookingListItem,
  existingRow?: Partial<BookingReportSheetRow>
): BookingReportSheetRow {
  const base = { ...createEmptyReportSheetRow(), ...(existingRow || {}) };
  const netCost = item.chiPhiBookingNetCuoi || item.giaDeXuatNet || base.costBookingNet || 0;
  const grossCost = item.chiPhiGrossKemThue || (netCost > 0 ? Math.round(netCost / 0.9) : base.costBookingGross || 0);
  const extractedVid = item.videoId || extractVideoIdFromUrl(item.linkAir) || base.videoId || '';
  const cleanHandle = (item.idKenh || base.creatorName || '').replace(/^@/, '').trim();
  const resolvedVideoUrl =
    item.linkAir ||
    base.videoUrl ||
    (cleanHandle && extractedVid ? `https://www.tiktok.com/@${cleanHandle}/video/${extractedVid}` : '');

  const totalView = Math.max(base.view || 0, item.views30d || 0, item.views14d || 0);
  const totalOrders = Math.max(base.ordersTotal || 0, item.orders30d || 0, item.orders14d || 0);
  const totalGmv = Math.max(base.gmvTotal || 0, item.gmv30d || 0, item.gmv14d || 0);
  const gpmVal = item.gpm30d || base.gpm || (totalView > 0 ? Math.round((totalGmv / totalView) * 1000) : 0);
  const adsCost = base.costAds || 0;
  const totalCostVal = grossCost + adsCost;
  const roiVal = totalCostVal > 0 ? Number((totalGmv / totalCostVal).toFixed(2)) : item.roi30d || base.roiTotal || 0;

  return {
    ...base,
    thangReport: item.thangPlan || base.thangReport || '2026/10',
    store: item.storeName || base.store || '',
    bookingId: item.maBooking || base.bookingId || item.id,
    pic: item.nguoiPhuTrach || base.pic || '',
    kocTier: item.klGrade || base.kocTier || 'KL1',
    creatorName: cleanHandle,
    kocName: item.tenKenh || base.kocName || cleanHandle,
    product: item.sanPham || base.product || '',
    planAirDate: item.plannedAirDate || base.planAirDate || '',
    airDate: item.actualAirDate || base.airDate || '',
    videoUrl: resolvedVideoUrl,
    videoId: extractedVid,
    sparkAdsCode: item.sparkAdsCode || base.sparkAdsCode || '',
    costBookingNet: netCost,
    costBookingGross: grossCost,
    costAds: adsCost,
    totalCost: totalCostVal,
    view: totalView,
    interactions: base.interactions || 0,
    click: base.click || 0,
    ordersTotal: totalOrders,
    gmvTotal: totalGmv,
    gpm: gpmVal,
    gmvAds: base.gmvAds || 0,
    roasAds: adsCost > 0 ? Number(((base.gmvAds || 0) / adsCost).toFixed(2)) : base.roasAds || 0,
    roiTotal: roiVal,
    cpv: totalView > 0 ? Math.round(totalCostVal / totalView) : base.cpv || 0,
    danhGia:
      item.danhGiaHieuQuaVideo ||
      base.danhGia ||
      (!resolvedVideoUrl ? 'Chờ lên bài' : roiVal >= 5 ? 'Vượt Target' : roiVal >= 2 ? 'Đạt Target' : 'Cần tối ưu'),
  };
}

/**
 * Chuyển đổi 1 dòng BookingReportSheetRow sang mảng 28 ô (A -> AB) để ghi lên Google Sheet
 */
export function serializeReportRowToSheetCells(
  row: BookingReportSheetRow,
  sheetRowNumber: number,
  useFormulas = true
): (string | number)[] {
  return BOOKING_REPORT_COLUMNS.map((col) => {
    if (useFormulas && col.formulaBuilder) {
      if (col.key === 'videoUrl' && row.videoUrl && !row.videoId) {
        return row.videoUrl;
      }
      return col.formulaBuilder(sheetRowNumber);
    }
    const val = row[col.key];
    if (val === undefined || val === null) return '';
    return val;
  });
}

function parseNum(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (!raw) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const isPct = s.endsWith('%');
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  const dotParts = cleaned.split('.');
  const commaParts = cleaned.split(',');
  let num = 0;
  if (dotParts.length > 2) {
    num = Number(cleaned.replace(/\./g, ''));
  } else if (commaParts.length > 2) {
    num = Number(cleaned.replace(/,/g, ''));
  } else if (dotParts.length === 2 && dotParts[1].length === 3 && !isPct && !s.includes('x')) {
    num = Number(cleaned.replace(/\./g, ''));
  } else if (commaParts.length === 2 && commaParts[1].length === 3 && !isPct) {
    num = Number(cleaned.replace(/,/g, ''));
  } else {
    num = Number(cleaned.replace(/,/g, '.'));
  }
  if (!Number.isFinite(num)) return 0;
  return isPct ? num / 100 : num;
}

function normHeader(h: string): string {
  return String(h || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Đọc danh sách dòng từ Google Sheet (hỗ trợ chuẩn tinh gọn 28 cột mới và tương thích ngược các bản cũ)
 */
export function parseSheetValuesToReportRows(allValues: string[][]): {
  headerRowIndex: number;
  rows: (BookingReportSheetRow & { rowId?: string; tienDoAir?: string })[];
} {
  if (!allValues || allValues.length === 0) {
    return { headerRowIndex: 0, rows: [] };
  }

  const firstCell = String(allValues[0]?.[0] || '').trim().toLowerCase();
  const headerRowIndex = firstCell.startsWith('*note') && allValues.length > 1 ? 1 : 0;
  const headers = (allValues[headerRowIndex] || []).map((h) => normHeader(h));
  const dataRows = allValues.slice(headerRowIndex + 1);

  const findColIdx = (...candidates: string[]): number => {
    for (const c of candidates) {
      const target = normHeader(c);
      const exact = headers.findIndex((h) => h === target);
      if (exact >= 0) return exact;
    }
    for (const c of candidates) {
      const target = normHeader(c);
      const partial = headers.findIndex((h) => h.includes(target));
      if (partial >= 0) return partial;
    }
    return -1;
  };

  const is28ColCompact =
    headers.length >= 25 &&
    headers.length <= 32 &&
    headers[0] === 'thang' &&
    headers[1] === 'gian hang' &&
    headers[2] === 'ma booking';

  const out: (BookingReportSheetRow & { rowId?: string; tienDoAir?: string })[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i] || [];
    if (!r.some((cell) => String(cell || '').trim() !== '')) continue;

    if (is28ColCompact) {
      const item = createEmptyReportSheetRow();
      BOOKING_REPORT_COLUMNS.forEach((col, idx) => {
        const rawVal = r[idx];
        if (col.numberFormat !== 'NONE') {
          (item[col.key] as number) = parseNum(rawVal);
        } else {
          (item[col.key] as string) = String(rawVal ?? '').trim();
        }
      });
      out.push({
        ...item,
        rowId: item.bookingId,
      });
      continue;
    }

    const getStr = (...names: string[]) => {
      const idx = findColIdx(...names);
      return idx >= 0 ? String(r[idx] ?? '').trim() : '';
    };
    const getNum = (...names: string[]) => {
      const idx = findColIdx(...names);
      return idx >= 0 ? parseNum(r[idx]) : 0;
    };

    const item = createEmptyReportSheetRow();
    item.thangReport = getStr('Tháng', 'Tháng Report');
    item.store = getStr('Gian hàng', 'Gian hàng (Store)', 'Store');
    item.bookingId = getStr('Mã Booking', 'Mã Booking (Booking ID)', 'Mã Deal (BO)', 'Mã Booking (Deal Code)');
    item.pic = getStr('PIC', 'PIC phụ trách');
    item.kocTier = getStr('Bậc KOC', 'Bậc KL');
    item.creatorName = getStr('ID kênh', 'Tên nhà sáng tạo', 'ID Kênh TikTok');
    item.kocName = getStr('Tên KOC', 'Tên KOC / Kênh', 'Thông tin video') || item.creatorName;
    item.product = getStr('Sản phẩm');
    item.planAirDate = getStr('Ngày Air dự kiến', 'Ngày Air kế hoạch');
    item.airDate = getStr('Ngày Air thực tế', 'Ngày Air');
    item.videoId = getStr('ID video');
    item.videoUrl = getStr('Link video Air', 'Link video TikTok', 'Link Video Air');
    if (!item.videoId && item.videoUrl) {
      item.videoId = extractVideoIdFromUrl(item.videoUrl);
    }
    if (!item.videoUrl && item.creatorName && item.videoId) {
      item.videoUrl = `https://www.tiktok.com/@${item.creatorName.replace(/^@/, '')}/video/${item.videoId}`;
    }
    item.sparkAdsCode = getStr('Mã Spark Ads', 'Mã Spark Ads (Auth Code)');
    item.costBookingNet = getNum('Giá Booking Net', 'Cost Booking (NET)', 'Giá Net (VND)', 'Chi phí Net (₫)');
    item.costBookingGross =
      getNum('Giá Booking Gross', 'Cost Booking (GROSS / Thuế 10%)', 'Giá Gross (VND)') ||
      (item.costBookingNet > 0 ? Math.round(item.costBookingNet / 0.9) : 0);
    item.costAds = getNum('Chi phí Ads', 'Cost Ads');
    item.totalCost =
      getNum('Tổng chi phí', 'Tổng Cost Thực tế', 'Tổng Cost (Ads + Booking + CMS)') ||
      item.costBookingGross + item.costAds;
    item.view = getNum('Views', 'View', 'Views 30 ngày', 'Views chốt mốc D30');
    item.interactions =
      getNum('Tương tác') ||
      getNum('Lượt thích') + getNum('Bình luận') + getNum('Lượt chia sẻ');
    item.click = getNum('Click giỏ hàng', 'Click');
    item.ordersTotal = getNum('Đơn hàng', 'Đơn hàng SKU đã ghi nhận', 'Đơn hàng 30 ngày');
    item.gmvTotal = getNum('GMV video', 'GMV đến từ video (₫)', 'GMV 30 ngày (VND)', 'GMV chốt mốc D30 (₫)');
    item.gpm = getNum('GPM', 'GPM (₫)') || (item.view > 0 ? Math.round((item.gmvTotal / item.view) * 1000) : 0);
    item.gmvAds = getNum('GMV Ads');
    item.roasAds = getNum('ROAS Ads') || (item.costAds > 0 ? Number((item.gmvAds / item.costAds).toFixed(2)) : 0);
    item.roiTotal =
      getNum('ROI Tổng', 'ROI 30 ngày') ||
      (item.totalCost > 0 ? Number((item.gmvTotal / item.totalCost).toFixed(2)) : 0);
    item.cpv = getNum('CPV') || (item.view > 0 ? Math.round(item.totalCost / item.view) : 0);
    item.danhGia =
      getStr('Đánh giá', 'Đánh giá hiệu quả') ||
      (!item.videoUrl ? 'Chờ lên bài' : item.roiTotal >= 5 ? 'Vượt Target' : item.roiTotal >= 2 ? 'Đạt Target' : 'Cần tối ưu');

    const rowId = getStr('Row ID', 'Mã dòng (Row ID)') || item.bookingId;
    out.push({
      ...item,
      rowId,
    });
  }

  return { headerRowIndex, rows: out };
}
