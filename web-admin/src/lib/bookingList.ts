// Danh sách KOC dự kiến book gửi Brand duyệt: dựng từ các content đã gán KOC trong kế hoạch content hoặc từ bảng điều phối Listing.
import type { InputPlanBreakdownState, KocItem, KocListingItem, StorePortfolioItem } from './types';
import { formatBriefCode, slotKocHandles, type ContentSlot } from './contentPlanRules';
import { brandKey } from './brands/types';
import { findRealBrandFileLinks, REAL_BRAND_FILE_CATALOG } from './brands/brandFilesCatalog';

export const BOOKING_LIST_COLUMNS = [
  'STT',
  'Mã Brief',
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
  'Link kịch bản',
  'Brand duyệt kịch bản',
  'Link video demo',
  'Brand duyệt demo',
  'Ghi chú sửa demo',
  'Link Air',
] as const;

export interface BookingListRow {
  handle: string;
  kocName: string;
  followers: number;
  fee: number;
  grade: string;
  /** Content (ô trong kế hoạch content) mà KOC này được gán. */
  slotId: string;
  briefCode?: string;
  pic: string;
  cells: (string | number)[];
}

const cleanHandle = (h: string) => h.replace(/^@/, '').trim();

/** Mở rộng toàn bộ KOC được gán trong từng dòng Brief (1 Brief BR-xx chứa được N KOC). */
export function buildBookingListRows(plan: InputPlanBreakdownState, slots: ContentSlot[], kocs: KocItem[]): BookingListRow[] {
  const byHandle = new Map(kocs.map(k => [cleanHandle(k.channelId || '').toLowerCase(), k]));
  const assigned = slots.filter(s => slotKocHandles(s).length > 0);
  const weekOrder = (w: string | null) => (w ? w : 'zzz');
  assigned.sort((a, b) => weekOrder(a.week).localeCompare(weekOrder(b.week)) || (a.row || '').localeCompare(b.row || ''));
  const out: BookingListRow[] = [];
  let stt = 0;
  assigned.forEach((s, slotIdx) => {
    const handles = slotKocHandles(s);
    const briefCode = formatBriefCode(s, slotIdx);
    const grade = s.row && s.row !== 'SELF' ? (s.row === 'FOC' ? 'TAP UpAffiliate' : s.row) : '';
    for (const rawH of handles) {
      const handle = cleanHandle(rawH);
      if (!handle) continue;
      stt += 1;
      const koc = byHandle.get(handle.toLowerCase());
      const resolvedGrade = grade || koc?.salaryGrade || 'KL1';
      const fee = s.row === 'FOC' ? 0 : koc?.rateCardVideo || 0;
      out.push({
        handle,
        kocName: koc?.stageName || handle,
        followers: koc?.followers || 0,
        fee,
        grade: resolvedGrade,
        slotId: s.id,
        briefCode,
        pic: s.pic || plan.pic || '',
        cells: [
          stt,
          briefCode,
          s.week ? s.week.split(' ')[0] : 'Chưa xếp tuần',
          resolvedGrade,
          s.pillar,
          s.product,
          s.pic || plan.pic || '',
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
          '',
          '',
          '',
          '',
          '',
          '',
        ],
      });
    }
  });
  return out;
}

/** Dựng danh sách dòng đẩy Google Sheet trực tiếp từ bảng điều phối Listing (`PlanListingBoard`). */
export function buildBookingListRowsFromListingItems(
  plan: InputPlanBreakdownState,
  items: KocListingItem[],
  slots: ContentSlot[],
  kocs: KocItem[]
): BookingListRow[] {
  const byHandle = new Map(kocs.map(k => [cleanHandle(k.channelId || '').toLowerCase(), k]));
  const slotById = new Map(slots.map((s, idx) => [s.id, { slot: s, briefCode: formatBriefCode(s, idx) }]));
  const candidates = items.filter(i => i.overallStatus !== 'DROPPED');
  return candidates.map((item, idx) => {
    const handle = cleanHandle(item.kocHandle || '');
    const koc = byHandle.get(handle.toLowerCase());
    const matched = item.planSlotId ? slotById.get(item.planSlotId) : undefined;
    const s = matched?.slot;
    const briefCode = matched?.briefCode || '';
    const grade = item.salaryGrade || s?.row || koc?.salaryGrade || 'KL1';
    const fee = item.finalFee ?? item.proposedFee ?? (grade === 'TAP UpAffiliate' ? 0 : koc?.rateCardVideo || 0);
    return {
      handle,
      kocName: item.kocName || koc?.stageName || handle,
      followers: item.followersCount || koc?.followers || 0,
      fee,
      grade: String(grade),
      slotId: item.planSlotId || '',
      briefCode,
      pic: item.assignedStaffName || s?.pic || plan.pic || '',
      cells: [
        idx + 1,
        briefCode,
        s?.week ? s.week.split(' ')[0] : 'Chưa xếp tuần',
        String(grade),
        s?.pillar || '',
        s?.product || '',
        item.assignedStaffName || s?.pic || plan.pic || '',
        s?.angle || item.niche || '',
        handle,
        `https://www.tiktok.com/@${handle}`,
        item.kocName || koc?.stageName || '',
        item.followersCount || koc?.followers || '',
        koc?.tepKenh || '',
        grade === 'TAP UpAffiliate' ? 0 : fee || '',
        koc?.gmvBestCase || '',
        koc?.gpm || '',
        koc?.historicalRoi !== undefined ? Number(koc.historicalRoi.toFixed(2)) : '',
        koc?.totalPastDeals ?? '',
        item.negotiationNote || '',
        item.brandApprovalStatus === 'BRAND_APPROVED' ? 'Yes' : item.brandApprovalStatus === 'BRAND_REJECTED' ? 'No' : '',
        item.dropReason || '',
        item.brandFeedbackNote || '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    };
  });
}

function readStoreOverrideByPlan(planOrBrand: InputPlanBreakdownState | string, storeName?: string): Partial<StorePortfolioItem> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('upbase_store_overrides_v1');
    if (!raw) return null;
    const overrides = JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>;
    if (typeof planOrBrand !== 'string' && planOrBrand.storeId && overrides[planOrBrand.storeId]) {
      return overrides[planOrBrand.storeId];
    }
    const targetStore = (typeof planOrBrand === 'string' ? storeName || '' : planOrBrand.storeName || '').trim().toLowerCase();
    if (!targetStore) return null;
    return Object.values(overrides).find(o => (o?.storeName || '').trim().toLowerCase() === targetStore) || null;
  } catch {
    return null;
  }
}

export const DEFAULT_TEMPLATE_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1PhQI6Yu7immdb905Zbf1joD9GkfaUfla2DhoIyD9U4w/edit?gid=1281865760#gid=1281865760';

/** Link Google Sheet booking của Gian hàng / Brand (ưu tiên cấu hình riêng trên Gian hàng -> Store Overrides -> Bảng 3.5 -> Link Template mặc định). */
export function resolveBrandBookingSheetUrl(
  planOrBrand: InputPlanBreakdownState | string,
  storeName?: string,
  storeObj?: StorePortfolioItem | null
): string {
  if (storeObj?.bookingSheetUrl?.trim()) return storeObj.bookingSheetUrl.trim();
  const override = readStoreOverrideByPlan(planOrBrand, storeName);
  if (override?.bookingSheetUrl?.trim()) return override.bookingSheetUrl.trim();

  const brandStr = typeof planOrBrand === 'string' ? planOrBrand : planOrBrand.brandName || '';
  const storeStr = typeof planOrBrand === 'string' ? storeName || '' : planOrBrand.storeName || '';
  const store = storeStr.trim().toLowerCase();
  const byStore = REAL_BRAND_FILE_CATALOG.find(i => i.storeCode.toLowerCase() === store);
  if (byStore?.bookingSheetUrl) return byStore.bookingSheetUrl;
  const byBrand = findRealBrandFileLinks(brandKey(brandStr));
  return byBrand?.bookingSheetUrl || DEFAULT_TEMPLATE_GOOGLE_SHEET_URL;
}

export const defaultBookingTabName = (
  planOrMonth: InputPlanBreakdownState | string,
  dot = 1,
  storeObj?: StorePortfolioItem | null
) => {
  if (storeObj?.defaultSheetTab?.trim()) return storeObj.defaultSheetTab.trim();
  if (typeof planOrMonth !== 'string') {
    const override = readStoreOverrideByPlan(planOrMonth);
    if (override?.defaultSheetTab?.trim()) return override.defaultSheetTab.trim();
  }
  const monthStr = typeof planOrMonth === 'string' ? planOrMonth : planOrMonth.month || '';
  return `Listing ${monthStr.replace('/', '-')} Đợt ${dot}`;
};
