import {
  computeGrossFeeWithTax,
  computeTepBookingFromNetFee,
  normalizeTikTokId,
} from './staffBrandListingSheet';
import { getVietnamDateYmd } from './format';
import type { KocItem, StoreDifficultyTier } from './types';
import { getStoreCoefficientByTier } from './types';

export type ToolCategoryKey = 'ALL' | 'PINNED' | 'FINANCE' | 'OPERATIONS' | 'CONTENT' | 'MANAGEMENT';

export type ToolId =
  | 'tax-gross-net'
  | 'roas-breakeven'
  | 'kpi-splitter'
  | 'bulk-link-extractor'
  | 'vietqr-generator'
  | 'utm-builder'
  | 'script-policy-checker'
  | 'voiceover-timer'
  | 'brief-hashtag-builder'
  | 'list-diff-checker'
  | 'p3-workload-calc'
  | 'sla-timeline-calc';

export interface ToolkitHistoryEntry {
  id: string;
  toolId: ToolId;
  toolTitle: string;
  label: string;
  content: string;
  createdAt: string;
}

export interface BankOption {
  code: string;
  bin: string;
  shortName: string;
  keywords: string[];
}

export const VIETQR_BANKS: BankOption[] = [
  { code: 'VCB', bin: '970436', shortName: 'Vietcombank', keywords: ['vietcombank', 'vcb', 'ngoai thuong'] },
  { code: 'TCB', bin: '970407', shortName: 'Techcombank', keywords: ['techcombank', 'tcb', 'ky thuong'] },
  { code: 'MB', bin: '970422', shortName: 'MBBank', keywords: ['mbbank', 'mb', 'quan doi'] },
  { code: 'ACB', bin: '970416', shortName: 'ACB', keywords: ['acb', 'a chau'] },
  { code: 'BIDV', bin: '970418', shortName: 'BIDV', keywords: ['bidv', 'dau tu'] },
  { code: 'ICB', bin: '970415', shortName: 'VietinBank', keywords: ['vietinbank', 'icb', 'cong thuong'] },
  { code: 'VPB', bin: '970432', shortName: 'VPBank', keywords: ['vpbank', 'vpb', 'viet nam thinh vuong'] },
  { code: 'TPB', bin: '970423', shortName: 'TPBank', keywords: ['tpbank', 'tpb', 'tien phong'] },
  { code: 'STB', bin: '970403', shortName: 'Sacombank', keywords: ['sacombank', 'stb', 'sai gon thuong tin'] },
  { code: 'VIB', bin: '970441', shortName: 'VIB', keywords: ['vib', 'quoc te'] },
  { code: 'SHB', bin: '970443', shortName: 'SHB', keywords: ['shb', 'sai gon ha noi'] },
  { code: 'HDB', bin: '970437', shortName: 'HDBank', keywords: ['hdbank', 'hdb', 'phat trien tphcm'] },
  { code: 'OCB', bin: '970448', shortName: 'OCB', keywords: ['ocb', 'phuong dong'] },
  { code: 'MSB', bin: '970426', shortName: 'MSB', keywords: ['msb', 'hang hai'] },
  { code: 'LPB', bin: '970449', shortName: 'LPBank', keywords: ['lpbank', 'lpb', 'lien viet', 'buu dien'] },
  { code: 'VBA', bin: '970405', shortName: 'Agribank', keywords: ['agribank', 'vba', 'nong nghiep'] },
  { code: 'SSB', bin: '970440', shortName: 'SeABank', keywords: ['seabank', 'ssb', 'dong nam a'] },
  { code: 'EIB', bin: '970431', shortName: 'Eximbank', keywords: ['eximbank', 'eib', 'xuat nhap khau'] },
  { code: 'SCB', bin: '970429', shortName: 'SCB', keywords: ['scb', 'sai gon'] },
  { code: 'NAB', bin: '970428', shortName: 'Nam A Bank', keywords: ['nam a', 'nab', 'namabank'] },
];

export function matchBankBinByName(bankName?: string): string {
  if (!bankName) return '970436';
  const norm = stripVietnameseTones(bankName).toLowerCase();
  for (const b of VIETQR_BANKS) {
    if (b.keywords.some((kw) => norm.includes(kw))) {
      return b.bin;
    }
  }
  return '970436';
}

export type RestrictedCategory =
  | 'CAM_KET_TUYET_DOI'
  | 'Y_TE_DIEU_TRI'
  | 'DIEU_HUONG_NGOAI_SAN'
  | 'SO_SANH_NHAI'
  | 'KHUYEN_MAI_AO'
  | 'ME_BE_TPCN';

export interface RestrictedWordRule {
  term: string;
  category: RestrictedCategory;
  categoryLabel: string;
  severity: 'CAO' | 'TRUNG_BINH';
  suggestion: string;
}

export const TIKTOK_RESTRICTED_DICTIONARY: RestrictedWordRule[] = [
  // 1. Cam kết tuyệt đối
  { term: '100%', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'hỗ trợ rõ rệt / tỷ lệ cao' },
  { term: 'tuyệt đối', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'tối ưu / đáng kể' },
  { term: 'vĩnh viễn', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'duy trì lâu dài' },
  { term: 'nhất thị trường', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'nổi bật trong phân khúc' },
  { term: 'số 1', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'TRUNG_BINH', suggestion: 'được ưa chuộng hàng đầu' },
  { term: 'tức thì', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'TRUNG_BINH', suggestion: 'nhanh chóng sau khi thoa' },
  { term: 'ngay lập tức', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'TRUNG_BINH', suggestion: 'cảm nhận sớm' },
  { term: 'cam kết khỏi', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'hỗ trợ cải thiện' },
  { term: 'hoàn tiền nếu không', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'chính sách đổi trả theo quy định sàn' },
  { term: 'hiệu quả sau 1 đêm', category: 'CAM_KET_TUYET_DOI', categoryLabel: 'Cam kết tuyệt đối', severity: 'CAO', suggestion: 'cấp ẩm giúp da mịn màng hơn vào sáng hôm sau' },

  // 2. Y tế & Điều trị
  { term: 'trị dứt điểm', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'hỗ trợ cải thiện tình trạng' },
  { term: 'chữa khỏi', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'làm dịu và phục hồi' },
  { term: 'đặc trị', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'chuyên biệt cho làn da' },
  { term: 'thuốc', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'sản phẩm / tinh chất dưỡng' },
  { term: 'viêm da', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'da nhạy cảm / dễ kích ứng' },
  { term: 'bác sĩ khuyên dùng', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'đã qua kiểm nghiệm da liễu' },
  { term: 'trị mụn', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'TRUNG_BINH', suggestion: 'hỗ trợ giảm mụn / ngừa mụn' },
  { term: 'trị nám', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'TRUNG_BINH', suggestion: 'hỗ trợ làm mờ thâm sạm' },
  { term: 'trị rụng tóc', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'TRUNG_BINH', suggestion: 'hỗ trợ giảm gãy rụng tóc' },
  { term: 'kích trắng', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'dưỡng sáng nâng tông tự nhiên' },
  { term: 'lột tẩy', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'làm sạch tế bào chết dịu nhẹ' },
  { term: 'tái tạo tế bào gốc', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'hỗ trợ phục hồi hàng rào bảo vệ da' },
  { term: 'kháng viêm', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'TRUNG_BINH', suggestion: 'hỗ trợ làm dịu nốt đỏ' },
  { term: 'diệt khuẩn', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'TRUNG_BINH', suggestion: 'làm sạch sâu bề mặt da' },
  { term: 'giảm cân cấp tốc', category: 'Y_TE_DIEU_TRI', categoryLabel: 'Y tế & Điều trị', severity: 'CAO', suggestion: 'hỗ trợ kiểm soát vóc dáng kết hợp vận động' },

  // 3. Điều hướng ngoài sàn
  { term: 'zalo', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'nhắn tin trực tiếp tại gian hàng' },
  { term: 'phở bò', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'kênh chính thức của nhãn' },
  { term: 'facebook', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'gian hàng chính hãng' },
  { term: 'shopee', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'giỏ hàng góc trái màn hình' },
  { term: 'lazada', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'giỏ hàng gắn trên video' },
  { term: 'chuyển khoản', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'thanh toán trực tiếp trên đơn hàng' },
  { term: 'đặt cọc', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'áp mã ưu đãi trong giỏ hàng' },
  { term: 'inbox riêng', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'TRUNG_BINH', suggestion: 'bấm vào mục chat với shop' },
  { term: 'link bio', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'TRUNG_BINH', suggestion: 'giỏ hàng màu vàng góc trái' },
  { term: 'số điện thoại', category: 'DIEU_HUONG_NGOAI_SAN', categoryLabel: 'Điều hướng ngoài sàn', severity: 'CAO', suggestion: 'mục hỗ trợ khách hàng của gian hàng' },

  // 4. Hàng nhái / So sánh
  { term: 'rep 1:1', category: 'SO_SANH_NHAI', categoryLabel: 'Hàng nhái / So sánh', severity: 'CAO', suggestion: 'hàng chính hãng có tem phụ' },
  { term: 'hàng tuồn', category: 'SO_SANH_NHAI', categoryLabel: 'Hàng nhái / So sánh', severity: 'CAO', suggestion: 'sản phẩm phân phối chính ngạch' },
  { term: 'hàng xách tay', category: 'SO_SANH_NHAI', categoryLabel: 'Hàng nhái / So sánh', severity: 'CAO', suggestion: 'sản phẩm nhập khẩu chính hãng' },
  { term: 'bản dupe', category: 'SO_SANH_NHAI', categoryLabel: 'Hàng nhái / So sánh', severity: 'TRUNG_BINH', suggestion: 'lựa chọn tối ưu chi phí' },
  { term: 'hàng auth giá rẻ', category: 'SO_SANH_NHAI', categoryLabel: 'Hàng nhái / So sánh', severity: 'TRUNG_BINH', suggestion: 'sản phẩm chính hãng ưu đãi' },

  // 5. Khuyến mãi quá đà / Câu tương tác
  { term: 'miễn phí 100%', category: 'KHUYEN_MAI_AO', categoryLabel: 'Khuyến mãi quá đà', severity: 'CAO', suggestion: 'quà tặng kèm theo đơn' },
  { term: 'giá 0đ', category: 'KHUYEN_MAI_AO', categoryLabel: 'Khuyến mãi quá đà', severity: 'CAO', suggestion: 'quà tặng đính kèm trong khung giờ' },
  { term: 'rẻ nhất', category: 'KHUYEN_MAI_AO', categoryLabel: 'Khuyến mãi quá đà', severity: 'TRUNG_BINH', suggestion: 'mức giá tiết kiệm' },
  { term: 'xả kho lỗ vốn', category: 'KHUYEN_MAI_AO', categoryLabel: 'Khuyến mãi quá đà', severity: 'TRUNG_BINH', suggestion: 'ưu đãi giới hạn trong chiến dịch' },

  // 6. Mẹ & Bé / TPCN nhạy cảm
  { term: 'thay thế sữa mẹ', category: 'ME_BE_TPCN', categoryLabel: 'Mẹ & Bé / TPCN', severity: 'CAO', suggestion: 'bổ sung dinh dưỡng theo độ tuổi' },
  { term: 'chữa chàm sữa', category: 'ME_BE_TPCN', categoryLabel: 'Mẹ & Bé / TPCN', severity: 'CAO', suggestion: 'dưỡng ẩm làm dịu da khô ráp cho bé' },
  { term: 'tăng chiều cao vượt trội', category: 'ME_BE_TPCN', categoryLabel: 'Mẹ & Bé / TPCN', severity: 'TRUNG_BINH', suggestion: 'hỗ trợ bổ sung canxi và D3K2' },
  { term: 'hết biếng ăn ngay', category: 'ME_BE_TPCN', categoryLabel: 'Mẹ & Bé / TPCN', severity: 'CAO', suggestion: 'hỗ trợ bé ăn ngon miệng hơn' },
];

export function formatVnd(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString('vi-VN')} ₫`;
}

export function stripVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  if (typeof window === 'undefined') return;
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface BatchTaxRow {
  id: string;
  index: number;
  handle: string;
  kocName: string;
  inputNet: number;
  videoQty: number;
  taxType: 'PIT_10' | 'VAT_8' | 'VAT_10' | 'FOC_0';
  totalNet: number;
  totalTax: number;
  totalGross: number;
  klGrade: string;
  historicalRateNet: number;
  priceDiffPct: number;
  requiresContract: boolean;
  requiresLegalFinanceReview: boolean;
}

export function parseBatchQuoteLines(
  rawText: string,
  defaultTaxType: 'PIT_10' | 'VAT_8' | 'VAT_10' | 'FOC_0',
  kocLookup: Map<string, KocItem>
): BatchTaxRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, idx) => {
    const parts = line.split(/[\t,;|]+/).map((p) => p.trim());
    let handleRaw = parts[0] || `koc_${idx + 1}`;
    let netVal = 0;
    let qtyVal = 1;

    if (parts.length >= 2) {
      netVal = Number(parts[1].replace(/[^0-9]/g, '')) || 0;
      if (parts[2]) {
        const parsedQty = Number(parts[2].replace(/[^0-9]/g, ''));
        if (parsedQty >= 1 && parsedQty <= 100) qtyVal = parsedQty;
      }
    } else {
      const m = line.match(/^(@?[\w._-]+)\s+([\d.,]+)(?:k|m|tr)?(?:\s+(\d+))?/i);
      if (m) {
        handleRaw = m[1];
        const rawNum = Number(m[2].replace(/[^0-9]/g, '')) || 0;
        netVal = rawNum < 10000 ? rawNum * 1000 : rawNum;
        if (m[3]) qtyVal = Math.max(1, Number(m[3]) || 1);
      }
    }

    const cleanHandle = normalizeTikTokId(handleRaw) || handleRaw.replace(/^@/, '');
    const matchedKoc = kocLookup.get(cleanHandle.toLowerCase());
    const effectiveNet = netVal > 0 ? netVal : Number(matchedKoc?.rateCardVideo || 0);

    let unitGross = 0;
    let unitTax = 0;
    if (defaultTaxType === 'FOC_0' || effectiveNet <= 0) {
      unitGross = 0;
      unitTax = 0;
    } else if (defaultTaxType === 'PIT_10') {
      unitGross = computeGrossFeeWithTax(effectiveNet);
      unitTax = unitGross - effectiveNet;
    } else {
      const vat = defaultTaxType === 'VAT_8' ? 0.08 : 0.1;
      unitTax = Math.round(effectiveNet * vat);
      unitGross = effectiveNet + unitTax;
    }

    const totalNet = effectiveNet * qtyVal;
    const totalTax = unitTax * qtyVal;
    const totalGross = unitGross * qtyVal;
    const klGrade = computeTepBookingFromNetFee(effectiveNet);
    const histRate = Number(matchedKoc?.rateCardVideo || 0);
    const priceDiffPct =
      histRate > 0 && effectiveNet > 0 ? Math.round(((effectiveNet - histRate) / histRate) * 100) : 0;

    return {
      id: `batch-tax-${idx + 1}`,
      index: idx + 1,
      handle: cleanHandle,
      kocName: matchedKoc?.stageName || 'Chưa có trong Danh bạ',
      inputNet: effectiveNet,
      videoQty: qtyVal,
      taxType: effectiveNet <= 0 ? 'FOC_0' : defaultTaxType,
      totalNet,
      totalTax,
      totalGross,
      klGrade,
      historicalRateNet: histRate,
      priceDiffPct,
      requiresContract: totalNet > 9_000_000,
      requiresLegalFinanceReview: totalNet >= 50_000_000,
    };
  });
}

export interface SlaMilestoneRow {
  id: string;
  stepCode: string;
  milestoneName: string;
  ruleSummary: string;
  targetDateStr: string;
  ownerRole: string;
  statusTone: 'neutral' | 'info' | 'warning' | 'critical' | 'positive';
  statusLabel: string;
}

function addCalendarDays(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + deltaDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addWorkingDays(isoDate: string, workingDays: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const dir = workingDays >= 0 ? 1 : -1;
  let remaining = Math.abs(workingDays);
  while (remaining > 0) {
    d.setDate(d.getDate() + dir);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      remaining -= 1;
    }
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function computeSlaTimelineFromAirDate(
  airDateIso: string,
  hasSampleOnHand: boolean,
  dealFeeNet: number
): SlaMilestoneRow[] {
  const todayIso = getVietnamDateYmd();
  const dAir = new Date(`${airDateIso}T00:00:00`);
  const nextMonthYear = dAir.getMonth() === 11 ? dAir.getFullYear() + 1 : dAir.getFullYear();
  const nextMonthNum = dAir.getMonth() === 11 ? 1 : dAir.getMonth() + 2;
  const nextMonthFirstIso = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;
  const closingLockIso = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-02`;
  const round1WindowIso = addWorkingDays(nextMonthFirstIso, 4);
  const round2WindowIso = addWorkingDays(nextMonthFirstIso, 10);

  const checkTone = (targetIso: string): { tone: SlaMilestoneRow['statusTone']; label: string } => {
    if (targetIso < todayIso) return { tone: 'critical', label: 'Đã qua mốc hạn' };
    if (targetIso === todayIso) return { tone: 'warning', label: 'Hạn hôm nay' };
    return { tone: 'positive', label: 'Trong hạn SLA' };
  };

  const rows: Array<Omit<SlaMilestoneRow, 'statusTone' | 'statusLabel'>> = [
    {
      id: 'sla-1',
      stepCode: 'T - 7 ngày',
      milestoneName: 'Chốt Deal KOC & Mở nhóm Zalo xác nhận SOW (Mục 3.4)',
      ruleSummary: 'Gửi tin nhắn chốt đầu việc, USP, từ khóa cấm và lịch On-air trong nhóm Zalo KOC',
      targetDateStr: addCalendarDays(airDateIso, -7),
      ownerRole: 'Booking PIC',
    },
    {
      id: 'sla-2',
      stepCode: 'T - 5 ngày',
      milestoneName: 'Hạn chót Tạo Job & Lên đơn gửi hàng mẫu (SLA Nhận việc gấp)',
      ruleSummary: hasSampleOnHand
        ? 'KOC đã cầm sẵn sản phẩm trên tay — Được phép nhận Job gấp < 5 ngày'
        : 'Bắt buộc cách ngày Air >= 5 ngày nếu KOC chưa cầm sẵn sản phẩm mẫu',
      targetDateStr: addCalendarDays(airDateIso, -5),
      ownerRole: 'Booking / Kho',
    },
    {
      id: 'sla-3',
      stepCode: 'T - 3 ngày',
      milestoneName: 'Hạn có Mã vận đơn & KOC nộp Kịch bản / Video Demo',
      ruleSummary: 'Quá 3 ngày chưa có mã vận đơn phải báo Leader; Brand quá 3 ngày chưa duyệt được đề xuất Tự Air',
      targetDateStr: addCalendarDays(airDateIso, -3),
      ownerRole: 'KOC / Brand',
    },
    {
      id: 'sla-4',
      stepCode: 'T - 1 ngày',
      milestoneName: 'Hoàn tất ký Hợp đồng nguyên tắc & Phụ lục SOW trước Air',
      ruleSummary:
        dealFeeNet > 0
          ? 'Ký muộn (< 1 ngày trước Air hoặc sau Air) bắt buộc lập Giải trình ký muộn (Mục 3.5) có xác nhận của Lead'
          : 'Job FOC 0đ được miễn bước ký Hợp đồng & Phụ lục SOW',
      targetDateStr: addCalendarDays(airDateIso, -1),
      ownerRole: 'Booking / Pháp chế',
    },
    {
      id: 'sla-5',
      stepCode: 'T0 (Ngày Air)',
      milestoneName: 'KOC đăng tải Video chính thức, gắn giỏ hàng & cấp mã Spark Ads',
      ruleSummary: 'Kiểm tra đúng link sản phẩm, hashtag bắt buộc và nghiệm thu hình ảnh sản phẩm cho BBNT',
      targetDateStr: airDateIso,
      ownerRole: 'KOC / Booking PIC',
    },
    {
      id: 'sla-6',
      stepCode: 'T + 1 ngày (10:00)',
      milestoneName: 'Hoàn tất Nghiệm thu & Đẩy Phiếu ĐNTT Lark 6.1 trước 10h sáng',
      ruleSummary: 'Với HKD/Công ty: Ngày xuất Hóa đơn chính thức bắt buộc trùng khớp ngày ký Biên bản nghiệm thu (BBNT)',
      targetDateStr: addWorkingDays(airDateIso, 1),
      ownerRole: 'Booking / Kế toán',
    },
    {
      id: 'sla-7',
      stepCode: 'T + 7 ngày LV',
      milestoneName: 'Tự động khóa sửa Link Air & Hạn gửi Bill UNC cho KOC',
      ruleSummary: 'Hệ thống khóa chỉnh sửa Link Air sau 7 ngày làm việc; gửi ảnh Bill chuyển khoản UNC cho KOC trong 7 ngày sau chi',
      targetDateStr: addWorkingDays(airDateIso, 7),
      ownerRole: 'Hệ thống / Booking',
    },
    {
      id: 'sla-8',
      stepCode: 'Mùng 02 tháng T+1',
      milestoneName: 'Khóa sổ nghiệm thu tháng tự động & Mở cửa sổ sửa lỗi (Ngày LV 5 & 11)',
      ruleSummary: `Khóa sổ: ${closingLockIso} · Mở sửa Lần 1: ${round1WindowIso} (09:00–17:30) · Mở sửa Lần 2: ${round2WindowIso} (09:00–17:30)`,
      targetDateStr: closingLockIso,
      ownerRole: 'Kế toán / Account',
    },
  ];

  return rows.map((r) => {
    const st = checkTone(r.targetDateStr);
    return {
      ...r,
      statusTone: st.tone,
      statusLabel: st.label,
    };
  });
}

export interface P3SimulationRow {
  id: string;
  storeName: string;
  brandName: string;
  picName: string;
  difficultyTier: StoreDifficultyTier;
  storeMultiplier: number;
  completedCases: number;
  qualityMultiplier: number;
  slaMultiplier: number;
  workloadPoints: number;
  estimatedBonusVnd: number;
}

export function computeP3SimulationRow(input: {
  id: string;
  storeName: string;
  brandName: string;
  picName: string;
  difficultyTier: StoreDifficultyTier;
  completedCases: number;
  qualityMultiplier: number;
  slaMultiplier: number;
  unitRateVnd: number;
}): P3SimulationRow {
  const storeMultiplier = getStoreCoefficientByTier(input.difficultyTier);
  const workloadPoints = Number(
    (input.completedCases * storeMultiplier * input.qualityMultiplier * input.slaMultiplier).toFixed(2)
  );
  const estimatedBonusVnd = Math.round(workloadPoints * input.unitRateVnd);
  return {
    id: input.id,
    storeName: input.storeName,
    brandName: input.brandName,
    picName: input.picName,
    difficultyTier: input.difficultyTier,
    storeMultiplier,
    completedCases: input.completedCases,
    qualityMultiplier: input.qualityMultiplier,
    slaMultiplier: input.slaMultiplier,
    workloadPoints,
    estimatedBonusVnd,
  };
}
