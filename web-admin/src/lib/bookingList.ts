// Danh sách KOC dự kiến book gửi Brand duyệt: dựng từ các content đã gán KOC trong kế hoạch content.
import type { InputPlanBreakdownState, KocItem } from './types';
import type { ContentSlot } from './contentPlanRules';
import { brandKey } from './brands/types';
import { findRealBrandFileLinks, REAL_BRAND_FILE_CATALOG } from './brands/brandFilesCatalog';

export const BOOKING_LIST_COLUMNS = [
  'STT',
  'Tuần',
  'Bậc KL',
  'Pillar',
  'Sản phẩm',
  'PIC',
  'Góc nội dung',
  'ID kênh',
  'Link kênh',
  'Tên kênh',
  'Follower',
  'Tệp kênh',
  'Giá net video',
  'GMV tốt nhất',
  'GPM',
  'ROI lịch sử',
  'Số deal tại Upbase',
  'Đề xuất từ UpBase',
  'Brand duyệt',
  'Lý do Brand từ chối',
  'Ghi chú Brand',
] as const;

export interface BookingListRow {
  handle: string;
  kocName: string;
  followers: number;
  fee: number;
  grade: string;
  /** Content (ô trong kế hoạch content) mà KOC này được gán. */
  slotId: string;
  pic: string;
  cells: (string | number)[];
}

const cleanHandle = (h: string) => h.replace(/^@/, '').trim();

/** Chỉ lấy content đã gán KOC. Thiếu chỉ số thì để trống, không điền số giả. */
export function buildBookingListRows(plan: InputPlanBreakdownState, slots: ContentSlot[], kocs: KocItem[]): BookingListRow[] {
  const byHandle = new Map(kocs.map(k => [cleanHandle(k.channelId || '').toLowerCase(), k]));
  const assigned = slots.filter(s => s.kocHandle && s.kocHandle.trim());
  const weekOrder = (w: string | null) => (w ? w : 'zzz');
  assigned.sort((a, b) => weekOrder(a.week).localeCompare(weekOrder(b.week)) || (a.row || '').localeCompare(b.row || ''));
  return assigned.map((s, idx) => {
    const handle = cleanHandle(s.kocHandle!);
    const koc = byHandle.get(handle.toLowerCase());
    const grade = s.row && s.row !== 'SELF' ? (s.row === 'FOC' ? 'TAP UpAffiliate' : s.row) : koc?.salaryGrade || '';
    const fee = s.row === 'FOC' ? 0 : koc?.rateCardVideo || 0;
    return {
      handle,
      kocName: koc?.stageName || handle,
      followers: koc?.followers || 0,
      fee,
      grade,
      slotId: s.id,
      pic: s.pic || '',
      cells: [
        idx + 1,
        s.week ? s.week.split(' ')[0] : 'Chưa xếp tuần',
        grade,
        s.pillar,
        s.product,
        s.pic || '',
        s.angle,
        handle,
        `https://www.tiktok.com/@${handle}`,
        koc?.stageName || '',
        koc?.followers || '',
        koc?.tepKenh || '',
        s.row === 'FOC' ? 0 : fee || '',
        koc?.gmvBestCase || '',
        koc?.gpm || '',
        koc?.historicalRoi !== undefined ? Number(koc.historicalRoi.toFixed(2)) : '',
        koc?.totalPastDeals ?? '',
        '',
        '',
        '',
        '',
      ],
    };
  });
}

/** Link Google Sheet booking của Brand theo danh mục file Brand (bảng 3.5). */
export function resolveBrandBookingSheetUrl(plan: InputPlanBreakdownState): string {
  const store = (plan.storeName || '').trim().toLowerCase();
  const byStore = REAL_BRAND_FILE_CATALOG.find(i => i.storeCode.toLowerCase() === store);
  if (byStore?.bookingSheetUrl) return byStore.bookingSheetUrl;
  const byBrand = findRealBrandFileLinks(brandKey(plan.brandName || ''));
  return byBrand?.bookingSheetUrl || '';
}

export const defaultBookingTabName = (plan: InputPlanBreakdownState, dot: number) => `Listing ${plan.month.replace('/', '-')} Đợt ${dot}`;
