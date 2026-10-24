// Đọc file "B2C_Quản lý Booking_4.1 Plan order tổng" (.xlsx) và tạo kế hoạch tháng ở trạng thái Nháp
// cho từng gian hàng B2C. Quy tắc cột: blueprint/1-requirements/1.9_DATA_SOURCE_LARK_4.1_PLAN_ORDER.md (DEC-006).
import ExcelJS from 'exceljs';
import type { InputPlanBreakdownState, StorePortfolioItem } from '../types';

// DEC-006 R4: Gross = Net × (1 + VAT 8%) × (1 + TNCN 10%)
const GROSS_FACTOR = 1.08 * 1.1;

const KL_TIERS = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'] as const;
type KlTier = (typeof KL_TIERS)[number];

const FOC_COLUMNS = ['TAP Brand', 'TAP', 'TAP UpAffiliate'] as const;

const COL = {
  recordId: 'Record ID',
  month: 'Tháng',
  storeCode: 'Mã GH',
  storeName: 'Gian hàng',
  brand: 'Brand',
  platform: 'Sàn',
  b2cScope: 'B2C phụ trách',
  videoAff: 'Số video affiliate',
  costAffNet: '(Net) Chi phí video affiliate',
  costAffGross: 'Chi phí booking video affiliate',
  selfVideos: 'Booking - Số video self channel',
  costSelfNet: '(Net) Chi phí video self channel',
  costSelfGross: 'Booking - Chi phí video self channel',
  liveSessions: 'Số phiên livestream affiliate',
  liveCostGross: 'Chi phí booking livestream affiliate',
  gmvAff: '(Plan) GMV video affiliate',
  gmvSelf: '(Plan) GMV video self channel',
  planLock: 'Chốt plan',
  planStatusFallback: 'Trạng thái plan',
} as const;

const REQUIRED_COLUMNS: string[] = [
  COL.month,
  COL.storeName,
  COL.b2cScope,
  COL.videoAff,
  ...KL_TIERS,
  ...FOC_COLUMNS
];

type CellValue = ExcelJS.CellValue;

function rawCell(v: CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v) return (v as { result?: unknown }).result ?? null;
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map(t => t.text).join('');
    if ('text' in v) return (v as { text: unknown }).text;
    return null;
  }
  return v;
}

function text(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Số trong export Lark có thể là number, "1,234", "₫1,234". Ô trống hoặc không đọc được trả 0. */
function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[₫%\s]/g, '').replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** Nhân sự phụ trách gian hàng theo Dữ liệu gốc trong app; để trống nếu chưa được giao. */
function pickStorePic(store?: StorePortfolioItem): string {
  if (!store) return '';
  return (store.primaryPic || store.assignedPic || store.assignedStaff || store.b2cOwnerName || '').trim();
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

export interface PlanOrderUploadSkip {
  storeName: string;
  reason: string;
}

export interface PlanOrderParseResult {
  month: string;
  availableMonths: string[];
  plans: InputPlanBreakdownState[];
  skipped: PlanOrderUploadSkip[];
  warnings: string[];
}

export class PlanOrderFileError extends Error {}

/**
 * Tạo danh sách kế hoạch Nháp từ file 4.1.
 * - Chỉ lấy dòng `B2C phụ trách = 1` của tháng được chọn (mặc định: tháng mới nhất trong file).
 * - Không điền số mặc định: ô trống = 0, phần chưa chia bậc được ghi chú để chuyên viên phân rã.
 */
export async function parsePlanOrderWorkbook(
  buffer: Buffer | ArrayBuffer,
  options: { month?: string; stores: StorePortfolioItem[]; importedBy: string }
): Promise<PlanOrderParseResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as ArrayBuffer);
  } catch {
    throw new PlanOrderFileError('Không đọc được file. Vui lòng chọn file Excel (.xlsx) xuất từ bảng 4.1 Plan order tổng.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new PlanOrderFileError('File không có bảng dữ liệu.');

  const headers = (sheet.getRow(1).values as CellValue[]).slice(1).map(h => text(rawCell(h)));
  const missing = REQUIRED_COLUMNS.filter(h => !headers.includes(h));
  if (missing.length) {
    throw new PlanOrderFileError(`File thiếu cột: ${missing.join(', ')}. Kiểm tra lại file 4.1 Plan order tổng.`);
  }
  const colIndex = new Map(headers.map((h, i) => [h, i + 1]));
  const read = (row: ExcelJS.Row, name: string): unknown => {
    const idx = colIndex.get(name);
    return idx ? rawCell(row.getCell(idx).value) : null;
  };

  interface Line {
    row: ExcelJS.Row;
    month: string;
  }
  const lines: Line[] = [];
  const monthSet = new Set<string>();
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const scope = text(read(row, COL.b2cScope));
    if (scope !== '1' || !text(read(row, COL.storeName))) continue;
    const month = text(read(row, COL.month));
    if (!/^\d{4}\/\d{2}$/.test(month)) continue;
    monthSet.add(month);
    lines.push({ row, month });
  }
  const availableMonths = [...monthSet].sort().reverse();
  if (availableMonths.length === 0) {
    throw new PlanOrderFileError('File không có gian hàng nào có "B2C phụ trách = 1".');
  }
  const month = options.month && monthSet.has(options.month) ? options.month : availableMonths[0];
  if (options.month && !monthSet.has(options.month)) {
    throw new PlanOrderFileError(`File không có dữ liệu tháng ${options.month}.`);
  }

  const plans: InputPlanBreakdownState[] = [];
  const skipped: PlanOrderUploadSkip[] = [];
  const warnings: string[] = [];
  const usedIds = new Set<string>();
  const monthKey = month.replace('/', '-');
  const storeByName = new Map(options.stores.map(s => [slug(s.storeName), s]));

  for (const { row, month: rowMonth } of lines) {
    if (rowMonth !== month) continue;
    const storeName = text(read(row, COL.storeName));
    const storeCode = text(read(row, COL.storeCode));
    const recordId = text(read(row, COL.recordId));
    const store = storeByName.get(slug(storeName));
    const storePic = pickStorePic(store);
    if (!store) warnings.push(`${storeName}: chưa khớp gian hàng trong Dữ liệu gốc`);

    let id = `PO-${monthKey}-${slug(storeCode || recordId || storeName)}`;
    if (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);

    const klQty = Object.fromEntries(KL_TIERS.map(t => [t, num(read(row, t))])) as Record<KlTier, number>;
    const klTotal = KL_TIERS.reduce((s, t) => s + klQty[t], 0);
    const focQty = FOC_COLUMNS.reduce((s, c) => s + num(read(row, c)), 0);
    // DEC-006 R2: số video Cast = FOC + ΣKL, không dùng cột tổng của nguồn
    const videoAffSource = num(read(row, COL.videoAff));
    const castTarget = Math.max(0, videoAffSource - focQty);

    const costAffNet = num(read(row, COL.costAffNet)) || Math.round(num(read(row, COL.costAffGross)) / GROSS_FACTOR);
    const selfVideos = num(read(row, COL.selfVideos));
    const costSelfNet = num(read(row, COL.costSelfNet)) || Math.round(num(read(row, COL.costSelfGross)) / GROSS_FACTOR);
    const liveSessions = num(read(row, COL.liveSessions));
    const liveCostNet = Math.round(num(read(row, COL.liveCostGross)) / GROSS_FACTOR);
    const gmvAff = num(read(row, COL.gmvAff));
    const gmvSelf = num(read(row, COL.gmvSelf));
    const nmvPlan = num(read(row, '(Plan) NMV'));
    const focBreakdown = {
      tapBrand: num(read(row, 'TAP Brand')),
      tap: num(read(row, 'TAP')),
      tapUp: num(read(row, 'TAP UpAffiliate')),
    };
    const splitNames = (raw: unknown) =>
      text(raw)
        .split(/[,;/\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
    const inhouseSessions =
      num(read(row, 'Inhouse️ - Số phiên livestream self channel (3h)')) ||
      num(read(row, 'Inhouse - Số phiên livestream self channel (3h)'));
    const inhouseCostGross =
      num(read(row, 'Inhouse️ - Chi phí livestream self channel')) ||
      num(read(row, 'Inhouse - Chi phí livestream self channel'));
    const inhouseGmv =
      num(read(row, 'Inhouse️ - Doanh thu livestream self channel')) ||
      num(read(row, 'Inhouse - Doanh thu livestream self channel'));
    const ctvSessions = num(read(row, 'CTV ngoài - Số phiên livestream self channel (2h)'));
    const ctvCostGross = num(read(row, 'CTV ngoài - Chi phí livestream self channel'));
    const ctvGmv = num(read(row, 'CTV ngoài - Doanh thu livestream self channel'));
    const brandSessions = num(read(row, 'Brand - Số phiên livestream self channel (2h)'));
    const liveSelfCostGross = num(read(row, 'Chi phí livestream self channel')) || inhouseCostGross + ctvCostGross;
    const liveSelfCostNet = Math.round(liveSelfCostGross / GROSS_FACTOR);

    const hasLockColumn = colIndex.has(COL.planLock) || colIndex.has(COL.planStatusFallback);
    const rawLockValue = text(read(row, COL.planLock)) || text(read(row, COL.planStatusFallback));
    const uniqueLockTokens = Array.from(
      new Set(
        rawLockValue
          .split(/[,;/\n]+/)
          .map(s => s.trim())
          .filter(Boolean)
      )
    );
    const normalizedLockText = uniqueLockTokens.join(', ');
    const lowerLock = normalizedLockText.toLowerCase();
    const isGrowthLocked = hasLockColumn
      ? (lowerLock.includes('chốt') || lowerLock.includes('chot') || lowerLock === '1' || lowerLock === 'true') &&
        !lowerLock.includes('chưa') &&
        !lowerLock.includes('chua') &&
        !lowerLock.includes('nháp') &&
        !lowerLock.includes('nhap')
      : true;
    const growthLockLabel = isGrowthLocked
      ? 'Đã chốt'
      : normalizedLockText
      ? `Chưa chốt (${normalizedLockText})`
      : 'Chưa chốt';

    const noteParts: string[] = ['Tạo từ file 4.1 Plan order tổng.'];
    if (!isGrowthLocked) {
      noteParts.push('Dòng 4.1 chưa có trạng thái Chốt plan (số tạm tính — chỉ lưu Nháp, chờ bản 4.1 đã chốt để gửi duyệt).');
    }

    const totalBudget = costAffNet + costSelfNet + liveCostNet;
    const bookingLeader = store?.bookingLeader?.trim() || undefined;
    const hasLeader = store?.hasBookingLeader !== false && Boolean(bookingLeader);
    const monthNo = month.split('/')[1];

    plans.push({
      id,
      title: `Kế hoạch T${monthNo} - ${storeName}`,
      brandName: text(read(row, COL.brand)) || store?.brandName || storeName,
      storeId: store?.id,
      storeName: store?.storeName || storeName,
      month,
      week: `Tháng ${month}`,
      pic: storePic,
      primaryPic: storePic || undefined,
      hasBookingLeader: hasLeader,
      bookingLeader,
      leaderApprovalStatus: hasLeader ? 'CHƯA_DUYỆT' : 'KHÔNG_ÁP_DỤNG',
      totalTargetBudget: totalBudget,
      totalTargetContents: castTarget + focQty + selfVideos + liveSessions,
      targetGmv: gmvAff + gmvSelf,
      cancellationRate: 8,
      strategyPreset: 'CUSTOM',
      notes: noteParts.join(' '),
      status: 'DRAFT',
      currentVersionCode: 'v1.0',
      isVersionLocked: false,
      items: [],
      reference41: {
        month,
        importedAt: new Date().toISOString(),
        importedBy: options.importedBy,
        isGrowthLocked,
        growthLockLabel,
        videoAff: videoAffSource,
        foc: focQty,
        cast: klTotal > 0 ? klTotal : castTarget,
        affCostGross: num(read(row, COL.costAffGross)) || Math.round(costAffNet * GROSS_FACTOR),
        affCostNet: costAffNet,
        selfVideos,
        selfCostGross: num(read(row, COL.costSelfGross)) || Math.round(costSelfNet * GROSS_FACTOR),
        selfCostNet: costSelfNet,
        liveSessions,
        liveCostGross: num(read(row, COL.liveCostGross)),
        liveCostNet,
        tiers: klQty,
        kl4PlusTarget: num(read(row, 'Số video KL4 trở lên')),
        focBreakdown,
        tiktokReup: num(read(row, 'Số Video Reup - TikTok')),
        multiPlatform: {
          shopee: {
            affQty: num(read(row, 'Shopee - Số video affiliate')),
            costGross: num(read(row, 'Shopee - Chi phí video affiliate')),
            costNet: Math.round(num(read(row, 'Shopee - Chi phí video affiliate')) / GROSS_FACTOR),
            reupQty: num(read(row, 'Số Video Reup - Shopee')),
          },
          threads: {
            affQty: num(read(row, 'Threads - Số video affiliate')),
            costGross: num(read(row, 'Threads - Chi phí video affiliate')),
            costNet: Math.round(num(read(row, 'Threads - Chi phí video affiliate')) / GROSS_FACTOR),
            reupQty: num(read(row, 'Số Video Reup - Threads')),
          },
          facebook: {
            affQty: num(read(row, 'Facebook - Số video affiliate')),
            costGross: num(read(row, 'Facebook - Chi phí video affiliate')),
            costNet: Math.round(num(read(row, 'Facebook - Chi phí video affiliate')) / GROSS_FACTOR),
            reupQty: num(read(row, 'Số Video Reup - Facebook')),
          },
          instagram: {
            affQty: num(read(row, 'Instagram - Số video affiliate')),
            costGross: num(read(row, 'Instagram - Chi phí video affiliate')),
            costNet: Math.round(num(read(row, 'Instagram - Chi phí video affiliate')) / GROSS_FACTOR),
            reupQty: num(read(row, 'Số Video Reup - Instagram')),
          },
        },
        liveSelf: {
          inhouse3h: inhouseSessions,
          inhouseCostGross,
          inhouseGmv,
          ctv2h: ctvSessions,
          ctvCostGross,
          ctvGmv,
          brand2h: brandSessions,
          totalCostGross: liveSelfCostGross,
          totalCostNet: liveSelfCostNet,
        },
        gmvTargets: {
          nmvPlan,
          videoAff: gmvAff,
          videoSelf: gmvSelf,
          liveInhouse: inhouseGmv,
          liveCtv: ctvGmv,
          lastMonth30d: 0,
          thisMonth30d: 0,
        },
        rolePics: {
          growthPics: splitNames(read(row, 'Growth_PIC')),
          growthSupports: splitNames(read(row, 'Growth_Support')),
          accountPics: splitNames(read(row, 'Account PIC')),
          bookingPics: splitNames(read(row, 'Booking PIC')),
          contentPics: splitNames(read(row, 'Content PIC')),
          focPics: [],
          livePics: splitNames(read(row, 'Livestream phụ trách')),
          b2cPics: splitNames(read(row, 'B2C PIC')),
        },
      },
      budgetAffiliate: costAffNet,
      budgetSelfChannel: costSelfNet,
      targetAffiliateContents: castTarget + focQty,
      targetSelfChannelContents: selfVideos,
      sourceSystem: 'WEB_ADMIN'
    });
  }

  return { month, availableMonths, plans, skipped, warnings };
}
