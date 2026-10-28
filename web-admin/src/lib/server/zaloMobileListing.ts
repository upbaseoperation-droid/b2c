/**
 * Bộ phân luồng 4 lớp & Tự động Listing KOC từ Điện thoại qua Zalo Bot
 * - Phân biệt tự động giữa Link Nghiệm thu Video Air và Link Lướt TikTok muốn Listing KOC
 * - Tự động bóc tách @handle, chỉ số kênh TikTok, đối chiếu dữ liệu KOC trên hệ thống
 * - Ghi trực tiếp vào Sheet Listing 57 cột (staff-brand-listing-sheets-v1) theo Gian hàng của PIC
 * - Hỗ trợ phản hồi bằng phím số trên điện thoại (gõ 1, 2, 3 để đổi gian hàng; gõ giá "1500k" / "foc" để đổi Giá Net)
 */
import type { LinkAirResult } from '../linkAirCheck';
import { checkSingleLinkServerless } from '../linkAirCheckServer';
import { fetchLiveTikTokPublicProfile, parseTikTokHandles } from '../tiktokKocScraper';
import { REAL_B2C_69_STORES } from '../realB2cPlanData';
import type {
  StaffBrandSheetCollection,
  StaffListingSheetRow,
} from '../staffBrandListingSheet';
import { readRecord, updateRecord, RecordError } from './sharedRecords';
import type { StorePortfolioItem } from '../types';
import type { ZaloGroupMapping, ZaloUserPermission } from './zaloBot';

const STAFF_SHEET_RECORD_KEY = 'staff-brand-listing-sheets-v1';
const EMPTY_STAFF_SHEET_COLLECTION: StaffBrandSheetCollection = {
  sheets: {},
  googleSheetUrls: {},
};

export interface MobileListingQuickSession {
  chatId: string;
  senderId: string;
  staffName: string;
  monthKey: string;
  currentStoreName: string;
  candidateStores: string[];
  listedEntries: Array<{
    handle: string;
    rowId: string;
    stageName: string;
    videoUrl?: string;
  }>;
  lastVideoUrl?: string;
  createdAt: number;
}

const lastMobileListingSessionByChat = new Map<string, MobileListingQuickSession>();

function foldVi(raw?: string | null): string {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function formatVnd(amount: number | null | undefined): string {
  const safe = Math.round(Number(amount || 0));
  return `${new Intl.NumberFormat('vi-VN').format(safe)}đ`;
}

function normalizeTikTokId(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const urlMatch = s.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  return s.replace(/^@+/, '').split(/[/?#\s]/)[0].trim();
}

function makeSheetKey(monthKey: string, storeName: string): string {
  return `${monthKey.trim()}__${storeName.trim()}`;
}

function computeTepBookingFromNetFee(netFee: number): string {
  if (!netFee || netFee <= 0) return 'Freecast';
  if (netFee <= 1_000_000) return 'KL1';
  if (netFee <= 2_000_000) return 'KL2';
  if (netFee <= 3_000_000) return 'KL3';
  if (netFee <= 5_000_000) return 'KL4';
  if (netFee <= 10_000_000) return 'KL5';
  if (netFee <= 20_000_000) return 'KL6';
  return 'KL7';
}

function computeGrossFeeWithTax(netFee: number): number {
  if (!netFee || netFee <= 0) return 0;
  return Math.round(netFee / 0.9);
}

function formatVnDateTime(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

function recalculateRowLight(row: StaffListingSheetRow): StaffListingSheetRow {
  const cleanId = normalizeTikTokId(row.idKenh);
  const netFee = Math.max(0, Math.round(Number(row.giaNetVideo || 0)));
  const tepBooking = computeTepBookingFromNetFee(netFee);
  const phiBookingKemThue = computeGrossFeeWithTax(netFee);
  const avgViewsVal = Math.max(0, Math.round(Number(row.viewTrungBinh || 0)));
  const costPerView = avgViewsVal > 0 ? Math.round(netFee / avgViewsVal) : 0;

  return {
    ...row,
    idKenh: cleanId,
    linkKenh: cleanId ? `https://www.tiktok.com/@${cleanId}` : row.linkKenh,
    giaNetVideo: netFee,
    tepBooking,
    phiBookingKemThue,
    costPerView,
  };
}

/**
 * Kiểm tra đường link TikTok có phải là link Trang cá nhân (@handle) trực tiếp hay không
 */
export function isDirectTikTokProfileUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    if (host === 'vt.tiktok.com' || host === 'vm.tiktok.com' || /^\/t\/[\w-]+/.test(parsed.pathname)) {
      return false; // Link rút gọn cần giải mã redirect trước
    }
    return /^\/@[^/]+\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Bóc tách ghi chú đi kèm tin nhắn (Giá Net, FOC, Đợt, Kỳ tháng, Tên Brand/Gian hàng, Sản phẩm)
 */
export interface ParsedListingNote {
  isExplicitListCommand: boolean;
  isExplicitAirCommand: boolean;
  hasListingSignalInNote: boolean;
  netFeeOverride: number | null;
  isFoc: boolean;
  monthKey: string;
  dot: string;
  matchedStore: StorePortfolioItem | null;
  productHint: string;
  rawExtraText: string;
}

export function parseListingNoteFromMessage(
  cleanText: string,
  urls: string[]
): ParsedListingNote {
  const lower = cleanText.trim().toLowerCase();
  const isExplicitAirCommand = /^\/?(?:air|nghiemthu|checkair)\b/i.test(lower);
  const isExplicitListCommand = /^\/?(?:list|addkoc|themkoc|gom|savekoc|luukoc)\b/i.test(lower);

  let textWithoutUrls = cleanText;
  for (const u of urls) {
    textWithoutUrls = textWithoutUrls.split(u).join(' ');
  }
  textWithoutUrls = textWithoutUrls
    .replace(/^\/?(?:list|addkoc|themkoc|gom|savekoc|luukoc|air|nghiemthu|checkair)\b/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const foldedExtra = foldVi(textWithoutUrls);

  // Kỳ tháng (mặc định 2026/10, hỗ trợ t11 / 2026/11 / 11/2026)
  let monthKey = '2026/10';
  const monthMatch =
    textWithoutUrls.match(/\b(202\d)[/-](0?[1-9]|1[0-2])\b/) ||
    textWithoutUrls.match(/\b(?:thang|t)\s*(1[0-2]|0?[1-9])\b/i);
  if (monthMatch) {
    if (monthMatch[2]) {
      monthKey = `${monthMatch[1]}/${String(Number(monthMatch[2])).padStart(2, '0')}`;
    } else if (monthMatch[1]) {
      monthKey = `2026/${String(Number(monthMatch[1])).padStart(2, '0')}`;
    }
  }

  // Đợt listing
  let dot = 'Đợt 1';
  const dotMatch = foldedExtra.match(/\bdot\s*([123])\b/);
  if (dotMatch?.[1]) {
    dot = `Đợt ${dotMatch[1]}`;
  }

  // Kiểm tra FOC / Giá Net (VD: "foc", "1500k", "1.5tr", "1tr5", "2m", "2000000")
  const isFoc = /\b(foc|freecast|0d|0đ|free\s*cast)\b/i.test(foldedExtra);
  let netFeeOverride: number | null = isFoc ? 0 : null;

  if (!isFoc) {
    const trSplitMatch = foldedExtra.match(/\b(\d{1,3})\s*(?:tr|trieu|m)\s*(\d{1,2})\b/i);
    const trDecimalMatch = foldedExtra.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:tr|trieu|m)\b/i);
    const kMatch = foldedExtra.match(/\b(\d{2,5})\s*k\b/i);
    const rawVndMatch = foldedExtra.match(/\b(\d{6,8})\s*(?:d|đ|vnd)?\b/i);

    if (trSplitMatch) {
      const major = Number(trSplitMatch[1]);
      const minorStr = trSplitMatch[2].padEnd(2, '0');
      netFeeOverride = Math.round(major * 1_000_000 + Number(minorStr) * 10_000);
    } else if (trDecimalMatch) {
      const val = parseFloat(trDecimalMatch[1].replace(',', '.'));
      if (Number.isFinite(val) && val > 0) {
        netFeeOverride = Math.round(val * 1_000_000);
      }
    } else if (kMatch) {
      const val = Number(kMatch[1]);
      if (Number.isFinite(val) && val >= 100) {
        netFeeOverride = Math.round(val * 1_000);
      }
    } else if (rawVndMatch) {
      const val = Number(rawVndMatch[1]);
      if (Number.isFinite(val) && val >= 200_000 && val <= 150_000_000) {
        netFeeOverride = Math.round(val);
      }
    }
  }

  // Dò tìm Gian hàng / Brand trong ghi chú
  let matchedStore: StorePortfolioItem | null = null;
  if (foldedExtra.length >= 2) {
    const b2cStores = REAL_B2C_69_STORES.filter((s) => s.isB2cManaged !== false);
    const sortedStores = [...b2cStores].sort((a, b) => {
      const aTikTok = a.platform === 'TikTok Shop' ? 0 : 1;
      const bTikTok = b.platform === 'TikTok Shop' ? 0 : 1;
      return aTikTok - bTikTok;
    });

    for (const store of sortedStores) {
      const brandFold = foldVi(store.brandName);
      const storeFold = foldVi(store.storeName).replace(/_/g, ' ');
      const compactBrand = brandFold.replace(/[^a-z0-9]/g, '');
      const compactExtra = foldedExtra.replace(/[^a-z0-9]/g, '');
      if (
        (brandFold.length >= 3 && foldedExtra.includes(brandFold)) ||
        (compactBrand.length >= 4 && compactExtra.includes(compactBrand)) ||
        (storeFold.length >= 4 && foldedExtra.includes(storeFold))
      ) {
        matchedStore = store;
        break;
      }
    }
  }

  const hasListingKeyword = /\b(list|listing|gom|book|them|luu|shortlist|koc)\b/i.test(foldedExtra);
  const hasListingSignalInNote =
    isExplicitListCommand ||
    hasListingKeyword ||
    isFoc ||
    netFeeOverride !== null ||
    matchedStore !== null;

  let productHint = '';
  const prodSegMatch = textWithoutUrls.match(/(?:sp|sản phẩm|sku)\s*[:=-]?\s*([^,|;\n]+)/i);
  if (prodSegMatch?.[1]) {
    productHint = prodSegMatch[1].trim();
  }

  return {
    isExplicitListCommand,
    isExplicitAirCommand,
    hasListingSignalInNote,
    netFeeOverride,
    isFoc,
    monthKey,
    dot,
    matchedStore,
    productHint,
    rawExtraText: textWithoutUrls,
  };
}

/**
 * Kiểm tra xem @handle có đang có Deal chờ lên sóng (Air) trên hệ thống hay không
 */
export function hasActiveDealWaitingForAir(
  handle: string,
  allMappings: Map<string, ZaloGroupMapping>,
  videoContext?: {
    hasProductLink?: boolean | null;
    productTitle?: string | null;
    caption?: string | null;
    hashtags?: string[];
  }
): { isWaitingAir: boolean; matchedDealCode?: string; matchedBrand?: string } {
  const clean = normalizeTikTokId(handle).toLowerCase();
  if (!clean) return { isWaitingAir: false };

  for (const m of allMappings.values()) {
    if (m.isAutoDiscovered) continue;
    const mHandle = normalizeTikTokId(m.kocHandle || '').toLowerCase();
    if (mHandle && mHandle === clean && m.dealCode) {
      if (
        m.dealStatus === 'ĐÃ_DUYỆT_NHÁP' ||
        m.dealStatus === 'ĐANG_QUAY_NHÁP' ||
        m.dealStatus === 'CHỜ_NHẬN_MẪU'
      ) {
        return {
          isWaitingAir: true,
          matchedDealCode: m.dealCode,
          matchedBrand: m.brandName,
        };
      }
    }
  }

  return { isWaitingAir: false };
}

/**
 * Tìm danh sách Gian hàng mà nhân sự gửi tin đang phụ trách (PIC chính hoặc Nhân sự hỗ trợ)
 */
export function resolveStaffAndStoresForSender(params: {
  senderId: string;
  senderName: string;
  senderPerm?: ZaloUserPermission;
  currentMapping?: ZaloGroupMapping;
  explicitStore?: StorePortfolioItem | null;
  videoTextHint?: string;
  chatId: string;
}): {
  staffName: string;
  targetStore: StorePortfolioItem;
  candidateStores: StorePortfolioItem[];
} {
  const { senderPerm, senderName, currentMapping, explicitStore, videoTextHint, chatId } = params;
  const b2cStores = REAL_B2C_69_STORES.filter((s) => s.isB2cManaged !== false);
  const tiktokStores = b2cStores.filter((s) => s.platform === 'TikTok Shop');
  const poolStores = tiktokStores.length > 0 ? tiktokStores : b2cStores;

  let staffName =
    senderPerm?.staffName ||
    currentMapping?.picName ||
    (senderName && senderName !== 'Thành viên nhóm' ? senderName : 'Lê Thị Thùy Thương');

  const senderFold = foldVi(staffName);
  const staffMatchedStores = poolStores.filter((s) => {
    const picFold = foldVi(s.b2cOwnerName || s.assignedStaff);
    const supportList = [...(s.b2cOwners || []), ...(s.assignedMembers || [])];
    const supportMatch = supportList.some((sp: string) => foldVi(sp) === senderFold);
    return (
      (picFold &&
        (picFold === senderFold ||
          picFold.includes(senderFold) ||
          senderFold.includes(picFold))) ||
      supportMatch
    );
  });

  if (staffMatchedStores.length > 0 && !senderPerm?.staffName) {
    staffName =
      staffMatchedStores[0].b2cOwnerName ||
      staffMatchedStores[0].assignedStaff ||
      staffName;
  }

  const permBrands = (senderPerm?.assignedBrands || []).filter(
    (b) => b && b !== 'ALL' && !b.toLowerCase().includes('toàn bộ')
  );
  const permStores =
    permBrands.length > 0
      ? poolStores.filter((s) =>
          permBrands.some((pb) => foldVi(s.brandName).includes(foldVi(pb)))
        )
      : [];

  let cartMatchedStore: StorePortfolioItem | null = null;
  if (videoTextHint) {
    const normVideo = foldVi(videoTextHint);
    for (const s of poolStores) {
      const bFold = foldVi(s.brandName);
      if (bFold.length >= 4 && normVideo.includes(bFold)) {
        cartMatchedStore = s;
        break;
      }
    }
  }

  const prevSession = lastMobileListingSessionByChat.get(chatId);
  const prevStore = prevSession
    ? poolStores.find((s) => s.storeName === prevSession.currentStoreName)
    : undefined;

  const targetStore =
    explicitStore ||
    cartMatchedStore ||
    prevStore ||
    staffMatchedStores[0] ||
    permStores[0] ||
    (currentMapping?.storeName
      ? b2cStores.find((s) => s.storeName === currentMapping.storeName)
      : undefined) ||
    poolStores[0];

  const candidateMap = new Map<string, StorePortfolioItem>();
  for (const s of [
    targetStore,
    ...staffMatchedStores,
    ...permStores,
    ...(cartMatchedStore ? [cartMatchedStore] : []),
    ...poolStores.slice(0, 6),
  ]) {
    if (s && !candidateMap.has(s.storeName)) {
      candidateMap.set(s.storeName, s);
    }
    if (candidateMap.size >= 5) break;
  }

  return {
    staffName,
    targetStore,
    candidateStores: Array.from(candidateMap.values()),
  };
}

function estimateNetFeeByFollowers(followers: number): number {
  if (followers >= 500_000) return 15_000_000;
  if (followers >= 200_000) return 6_000_000;
  if (followers >= 100_000) return 3_500_000;
  if (followers >= 50_000) return 1_800_000;
  if (followers >= 20_000) return 1_000_000;
  if (followers >= 5_000) return 500_000;
  return 0;
}

/**
 * Xử lý phản hồi nhanh bằng phím số từ điện thoại sau khi vừa Listing KOC:
 * - Gõ số "1", "2", "3", "4", "5": Chuyển KOC vừa lưu sang gian hàng tương ứng
 * - Gõ mức giá ("foc", "1500k", "2tr"): Cập nhật lại Giá Net của KOC vừa lưu
 */
export async function tryHandleMobileListingQuickFollowup(params: {
  chatId: string;
  cleanText: string;
}): Promise<{ handled: boolean; reply?: string; triggerAirUrl?: string }> {
  const { chatId, cleanText } = params;
  const session = lastMobileListingSessionByChat.get(chatId);
  if (!session || Date.now() - session.createdAt > 30 * 60 * 1000) {
    return { handled: false };
  }

  const trimmed = cleanText.trim();
  if (!trimmed) return { handled: false };

  if (/^\/?(?:air|nghiemthu|checkair)$/i.test(trimmed) && session.lastVideoUrl) {
    return { handled: true, triggerAirUrl: session.lastVideoUrl };
  }

  // 1. Gõ số 1..5 để đổi gian hàng
  const numMatch = trimmed.match(/^(?:chuyen|chon|so|gian)?\s*([1-5])$/i);
  if (numMatch) {
    const idx = Number(numMatch[1]) - 1;
    const newStoreName = session.candidateStores[idx];
    if (!newStoreName) return { handled: false };

    if (newStoreName === session.currentStoreName) {
      return {
        handled: true,
        reply: `ℹ️ KOC @${session.listedEntries.map((e) => e.handle).join(', @')} hiện đã nằm sẵn trong Sheet [${newStoreName}] (${session.monthKey}).`,
      };
    }

    const oldSheetKey = makeSheetKey(session.monthKey, session.currentStoreName);
    const newSheetKey = makeSheetKey(session.monthKey, newStoreName);
    const targetHandles = new Set(session.listedEntries.map((e) => e.handle.toLowerCase()));

    const rec = await readRecord<StaffBrandSheetCollection>(
      STAFF_SHEET_RECORD_KEY,
      EMPTY_STAFF_SHEET_COLLECTION
    );
    await updateRecord<StaffBrandSheetCollection>(
      STAFF_SHEET_RECORD_KEY,
      EMPTY_STAFF_SHEET_COLLECTION,
      rec.revision,
      (current) => {
        const sheets = { ...(current.sheets || {}) };
        const oldList = sheets[oldSheetKey] || [];
        const newList = [...(sheets[newSheetKey] || [])];
        const movedRows: StaffListingSheetRow[] = [];

        sheets[oldSheetKey] = oldList.filter((r) => {
          const h = normalizeTikTokId(r.idKenh).toLowerCase();
          if (targetHandles.has(h) && r.nhanSuDien === session.staffName) {
            movedRows.push(
              recalculateRowLight({
                ...r,
                store: newStoreName,
              })
            );
            return false;
          }
          return true;
        });

        const existingNewHandles = new Set(
          newList.map((r) => normalizeTikTokId(r.idKenh).toLowerCase())
        );
        for (const mr of movedRows) {
          const h = normalizeTikTokId(mr.idKenh).toLowerCase();
          if (!existingNewHandles.has(h)) {
            newList.unshift(mr);
          }
        }
        sheets[newSheetKey] = newList;
        return { ...current, sheets };
      }
    );

    const prevStore = session.currentStoreName;
    session.currentStoreName = newStoreName;
    session.createdAt = Date.now();
    lastMobileListingSessionByChat.set(chatId, session);

    return {
      handled: true,
      reply: [
        `✅ ĐÃ CHUYỂN GIAN HÀNG LISTING THÀNH CÔNG`,
        `----------------------------------------`,
        `• KOC: ${session.listedEntries.map((e) => `@${e.handle}`).join(', ')}`,
        `• Chuyển từ: ${prevStore} ➔ ${newStoreName} (Kỳ ${session.monthKey})`,
        `• Nhân sự phụ trách: ${session.staffName}`,
        `----------------------------------------`,
        `💡 KOC đã được cập nhật vào bảng Listing 57 cột của [${newStoreName}].`,
      ].join('\n'),
    };
  }

  // 2. Gõ nhanh mức giá ("foc", "1500k", "2tr", "1.5tr") ngay sau khi gửi link
  const isPriceOnlyNote =
    /^(?:gia\s*)?(?:foc|freecast|0d|0đ|\d{1,3}(?:[.,]\d{1,2})?\s*(?:tr|trieu|m)\d*|\d{2,5}\s*k)$/i.test(
      foldVi(trimmed)
    );
  if (isPriceOnlyNote) {
    const parsedNote = parseListingNoteFromMessage(trimmed, []);
    if (parsedNote.netFeeOverride !== null) {
      const newNet = parsedNote.netFeeOverride;
      const sheetKey = makeSheetKey(session.monthKey, session.currentStoreName);
      const targetHandles = new Set(session.listedEntries.map((e) => e.handle.toLowerCase()));
      let updatedRowSample: StaffListingSheetRow | undefined;

      const rec = await readRecord<StaffBrandSheetCollection>(
        STAFF_SHEET_RECORD_KEY,
        EMPTY_STAFF_SHEET_COLLECTION
      );
      await updateRecord<StaffBrandSheetCollection>(
        STAFF_SHEET_RECORD_KEY,
        EMPTY_STAFF_SHEET_COLLECTION,
        rec.revision,
        (current) => {
          const sheets = { ...(current.sheets || {}) };
          const list = (sheets[sheetKey] || []).map((r) => {
            const h = normalizeTikTokId(r.idKenh).toLowerCase();
            if (targetHandles.has(h)) {
              const nextRow = recalculateRowLight({
                ...r,
                giaNetVideo: newNet,
              });
              updatedRowSample = nextRow;
              return nextRow;
            }
            return r;
          });
          sheets[sheetKey] = list;
          return { ...current, sheets };
        }
      );

      session.createdAt = Date.now();
      return {
        handled: true,
        reply: [
          `✅ ĐÃ CẬP NHẬT GIÁ NET TRÊN SHEET LISTING`,
          `----------------------------------------`,
          `• KOC: ${session.listedEntries.map((e) => `@${e.handle}`).join(', ')}`,
          `• Gian hàng: ${session.currentStoreName} (${session.monthKey})`,
          `• Giá Net mới: ${formatVnd(newNet)} (${updatedRowSample?.tepBooking || computeTepBookingFromNetFee(newNet)})`,
          `• Phí kèm thuế TNCN 10%: ${formatVnd(updatedRowSample?.phiBookingKemThue ?? computeGrossFeeWithTax(newNet))}`,
        ].join('\n'),
      };
    }
  }

  return { handled: false };
}

/**
 * Thực thi luồng Listing KOC từ Điện thoại qua Zalo Bot (hỗ trợ cả 1 link, nhiều link, hoặc @handle)
 */
export async function executeMobileTikTokListingFromZalo(params: {
  chatId: string;
  senderId: string;
  senderName: string;
  cleanText: string;
  urls: string[];
  preFetchedResults?: Map<string, LinkAirResult>;
  senderPerm?: ZaloUserPermission;
  currentMapping?: ZaloGroupMapping;
}): Promise<{ handled: boolean; reply: string }> {
  const {
    chatId,
    senderId,
    senderName,
    cleanText,
    urls,
    preFetchedResults,
    senderPerm,
    currentMapping,
  } = params;

  const parsedNote = parseListingNoteFromMessage(cleanText, urls);

  interface CandidateChannel {
    handle: string;
    sourceUrl?: string;
    videoId?: string;
    nickname?: string;
    followers?: number;
    videoViews?: number;
    productTitle?: string;
    caption?: string;
    hashtags?: string[];
    bio?: string;
  }

  const candidates: CandidateChannel[] = [];
  const seenHandles = new Set<string>();

  for (const url of urls) {
    const checkRes =
      preFetchedResults?.get(url) ||
      (await checkSingleLinkServerless(url).catch(() => null));
    let handle = normalizeTikTokId(checkRes?.author?.handle || '').toLowerCase();
    if (!handle) {
      const parsedFromUrl = parseTikTokHandles(url)[0];
      if (parsedFromUrl) handle = parsedFromUrl.toLowerCase();
    }
    if (!handle || seenHandles.has(handle)) continue;
    seenHandles.add(handle);

    candidates.push({
      handle,
      sourceUrl: checkRes?.canonicalUrl || url,
      videoId: checkRes?.contentId || undefined,
      nickname: checkRes?.author?.name || undefined,
      followers: checkRes?.author?.followers ?? undefined,
      videoViews: checkRes?.metrics?.views ?? undefined,
      productTitle:
        checkRes?.cartProducts?.[0]?.title || checkRes?.productTitle || undefined,
      caption: checkRes?.caption || undefined,
      hashtags: checkRes?.hashtags || undefined,
    });
  }

  // Nếu không có URL nhưng người dùng gõ lệnh /addkoc @handle hoặc /list @handle
  if (candidates.length === 0 && parsedNote.isExplicitListCommand) {
    const handleTokens =
      cleanText.match(/@[a-zA-Z0-9._-]{3,32}/g) ||
      parseTikTokHandles(parsedNote.rawExtraText.split(/\s+/)[0] || '');
    for (const rawH of handleTokens) {
      const cleanH = normalizeTikTokId(rawH).toLowerCase();
      if (cleanH && !seenHandles.has(cleanH)) {
        seenHandles.add(cleanH);
        candidates.push({
          handle: cleanH,
          sourceUrl: `https://www.tiktok.com/@${cleanH}`,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      handled: true,
      reply:
        '⚠️ Không nhận diện được @id_kenh từ đường dẫn TikTok. Bạn hãy thử bấm Chia sẻ (Share) lại từ TikTok hoặc gõ kèm @handle nhé.',
    };
  }

  // Đọc dữ liệu Sheet hiện có trên DB để tra cứu lịch sử KOC đã từng được listing trước đó (O(1))
  const existingRecord = await readRecord<StaffBrandSheetCollection>(
    STAFF_SHEET_RECORD_KEY,
    EMPTY_STAFF_SHEET_COLLECTION
  );
  const existingRowByHandle = new Map<string, StaffListingSheetRow>();
  for (const sheetRows of Object.values(existingRecord.data?.sheets || {})) {
    if (!Array.isArray(sheetRows)) continue;
    for (const r of sheetRows) {
      if (!r?.idKenh) continue;
      const h = normalizeTikTokId(r.idKenh).toLowerCase();
      if (h && !existingRowByHandle.has(h)) {
        existingRowByHandle.set(h, r);
      }
    }
  }

  // Bổ sung thông tin từ trang Profile TikTok công khai nếu chưa có số lượng Follower
  await Promise.all(
    candidates.map(async (c) => {
      const histRow = existingRowByHandle.get(c.handle);
      if ((!c.followers || c.followers <= 0) && !histRow?.follower) {
        const liveProfile = await fetchLiveTikTokPublicProfile(c.handle).catch(() => null);
        if (liveProfile) {
          c.followers = liveProfile.followers || c.followers;
          c.nickname = liveProfile.nickname || c.nickname;
          c.bio = liveProfile.bio || c.bio;
        }
      }
    })
  );

  const videoTextHint = candidates
    .map((c) => [c.productTitle, c.caption, ...(c.hashtags || [])].filter(Boolean).join(' '))
    .join(' ');

  const { staffName, targetStore, candidateStores } = resolveStaffAndStoresForSender({
    senderId,
    senderName,
    senderPerm,
    currentMapping,
    explicitStore: parsedNote.matchedStore,
    videoTextHint,
    chatId,
  });

  const now = new Date();
  const createdAtIso = now.toISOString();
  const ngayDienFormatted = formatVnDateTime(now);

  const rowsToUpsert: StaffListingSheetRow[] = [];
  const enrichedDetails: Array<{
    handle: string;
    stageName: string;
    followers: number;
    avgViews: number;
    netFee: number;
    grossFee: number;
    tepBooking: string;
    isExistingKoc: boolean;
    thanhQuaText: string;
    sanPham: string;
    rowId: string;
    videoUrl?: string;
  }> = [];

  for (const c of candidates) {
    const hist = existingRowByHandle.get(c.handle);
    const followers = Math.max(Number(c.followers || 0), Number(hist?.follower || 0));
    const avgViews = Math.max(
      Number(c.videoViews || 0),
      Number(hist?.viewTrungBinh || 0),
      followers > 0 ? Math.round(followers * 0.18) : 0
    );

    const netFee =
      parsedNote.netFeeOverride !== null
        ? parsedNote.netFeeOverride
        : Number(hist?.giaNetVideo || hist?.giaDaHopTacTruocDo || estimateNetFeeByFollowers(followers));

    const tepBooking = computeTepBookingFromNetFee(netFee);
    const grossFee = computeGrossFeeWithTax(netFee);
    const inferredProduct =
      parsedNote.productHint ||
      c.productTitle ||
      hist?.sanPham ||
      `Sản phẩm chủ lực ${targetStore.brandName}`;

    const rowId = `sheet-row-mob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const thanhQuaText =
      hist?.thanhQuaHopTac && hist.thanhQuaHopTac !== 'KOC mới đề xuất hợp tác'
        ? hist.thanhQuaHopTac
        : hist
          ? `Đã từng đề xuất trong hệ thống Sheet Listing UpBase`
          : 'KOC mới phát hiện (Lưu từ TikTok ĐT)';

    const row: StaffListingSheetRow = {
      id: rowId,
      kocId: hist?.kocId || `koc-mob-${c.handle}`,
      createdAt: createdAtIso,
      ngayDien: ngayDienFormatted,
      dot: parsedNote.dot,
      thang: parsedNote.monthKey,
      nhanSuDien: staffName,
      store: targetStore.storeName,
      contentTag: 'Review trực tiếp',
      idKenh: c.handle,
      linkKenh: `https://www.tiktok.com/@${c.handle}`,
      tepKenh: hist?.tepKenh || 'Beauty',
      sanPham: inferredProduct,
      tenKenh: c.nickname || hist?.tenKenh || c.handle,
      tepBooking,
      giaDaHopTacTruocDo: Number(hist?.giaDaHopTacTruocDo || netFee),
      loaiGia: 'Booking',
      giaNetVideo: netFee,
      phiBookingKemThue: grossFee,
      follower: followers,
      trangThai: 'Nhận sản phẩm',
      deXuatUpBase: 'Recommend',
      leaderNote: '',
      contentNote: c.videoId
        ? `Lưu từ TikTok ĐT (Video mẫu: https://www.tiktok.com/@${c.handle}/video/${c.videoId})`
        : 'Lưu từ TikTok ĐT',
      brandChon: 'Chờ duyệt',
      lyDoTuChoi: '',
      thanhQuaHopTac: thanhQuaText,
      thanhQuaBrandNgoai: hist?.thanhQuaBrandNgoai || 'Kalodata ngành hàng tương đương',
      gmvDaHopTac: Number(hist?.gmvDaHopTac || 0),
      doanhSo: Number(hist?.doanhSo || 0),
      doanhSoUocTinh30d: Number(hist?.doanhSoUocTinh30d || 0),
      soMonBanRa: Number(hist?.soMonBanRa || 0),
      gpm: Number(hist?.gpm || 0),
      aov: Number(hist?.aov || 0),
      viewTrungBinh: avgViews,
      costPerView: avgViews > 0 ? Math.round(netFee / avgViews) : 0,
      gmvTuVideoPct: Number(hist?.gmvTuVideoPct ?? 85),
      gmvTuLivePct: Number(hist?.gmvTuLivePct ?? 10),
      gmvTuTheSanPhamPct: Number(hist?.gmvTuTheSanPhamPct ?? 5),
      tiTrongNganhHang: hist?.tiTrongNganhHang || 'Beauty & Chăm sóc cá nhân',
      namPct: Number(hist?.namPct ?? 25),
      nuPct: Number(hist?.nuPct ?? 75),
      tuoi18_24Pct: Number(hist?.tuoi18_24Pct ?? 35),
      tuoi25_34Pct: Number(hist?.tuoi25_34Pct ?? 45),
      tuoiTren35Pct: Number(hist?.tuoiTren35Pct ?? 20),
      tuoiOtherPct: Number(hist?.tuoiOtherPct ?? 20),
      location: hist?.location || 'Việt Nam',
      ngayAirPlan: '',
      gmvTarget: Number(hist?.gmvTarget || 0),
      viewTrungVi: Number(hist?.viewTrungVi || avgViews),
      ctrPct: Number(hist?.ctrPct ?? 4.5),
      crPct: Number(hist?.crPct ?? 2.8),
      viewTarget: avgViews,
      tyLeTuongTacPct: Number(hist?.tyLeTuongTacPct ?? 3.5),
      email: hist?.email || '',
      zalo: hist?.zalo || '',
      nguoiNhanHang: hist?.nguoiNhanHang || c.nickname || c.handle,
      sdtNhanHang: hist?.sdtNhanHang || '',
      diaChiNhanHang: hist?.diaChiNhanHang || '',
      tenTaiKhoanNganHang: hist?.tenTaiKhoanNganHang || '',
      soTaiKhoan: hist?.soTaiKhoan || '',
      nganHang: hist?.nganHang || '',
      soCccd: hist?.soCccd || '',
      ngayBrandDuyet: '',
      slaBrandDuyet: 'Đang chờ (0.0h)',
    };

    rowsToUpsert.push(row);
    enrichedDetails.push({
      handle: c.handle,
      stageName: row.tenKenh,
      followers: row.follower,
      avgViews: row.viewTrungBinh,
      netFee: row.giaNetVideo,
      grossFee: row.phiBookingKemThue,
      tepBooking: row.tepBooking,
      isExistingKoc: Boolean(hist),
      thanhQuaText,
      sanPham: row.sanPham,
      rowId: row.id,
      videoUrl: c.videoId ? c.sourceUrl : undefined,
    });
  }

  // Ghi xuống cơ sở dữ liệu
  const sheetKey = makeSheetKey(parsedNote.monthKey, targetStore.storeName);
  let addedCount = 0;
  let duplicateCount = 0;
  let totalSheetRows = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    const rec = await readRecord<StaffBrandSheetCollection>(
      STAFF_SHEET_RECORD_KEY,
      EMPTY_STAFF_SHEET_COLLECTION
    );
    addedCount = 0;
    duplicateCount = 0;

    try {
      await updateRecord<StaffBrandSheetCollection>(
        STAFF_SHEET_RECORD_KEY,
        EMPTY_STAFF_SHEET_COLLECTION,
        rec.revision,
        (current) => {
          const sheets = { ...(current.sheets || {}) };
          const curList = [...(sheets[sheetKey] || [])];
          const byHandleIdx = new Map<string, number>();
          curList.forEach((r, idx) => {
            const h = normalizeTikTokId(r.idKenh).toLowerCase();
            if (h) byHandleIdx.set(h, idx);
          });

          for (const incoming of rowsToUpsert) {
            const cleanH = normalizeTikTokId(incoming.idKenh).toLowerCase();
            const existingIdx = byHandleIdx.get(cleanH);
            if (existingIdx !== undefined) {
              duplicateCount++;
              const existingRow = curList[existingIdx];
              curList[existingIdx] = recalculateRowLight({
                ...existingRow,
                giaNetVideo:
                  incoming.giaNetVideo > 0 || incoming.tepBooking === 'Freecast'
                    ? incoming.giaNetVideo
                    : existingRow.giaNetVideo,
                sanPham: incoming.sanPham || existingRow.sanPham,
                follower: Math.max(existingRow.follower || 0, incoming.follower || 0),
                viewTrungBinh: Math.max(
                  existingRow.viewTrungBinh || 0,
                  incoming.viewTrungBinh || 0
                ),
              });
            } else {
              addedCount++;
              curList.unshift(incoming);
              byHandleIdx.set(cleanH, 0);
            }
          }

          totalSheetRows = curList.length;
          sheets[sheetKey] = curList;
          return { ...current, sheets };
        }
      );
      break;
    } catch (err) {
      if (!(err instanceof RecordError && err.status === 409)) throw err;
    }
  }

  // Lưu phiên thao tác nhanh cho cuộc trò chuyện này
  const firstVideoUrl = enrichedDetails.find((d) => d.videoUrl)?.videoUrl;
  lastMobileListingSessionByChat.set(chatId, {
    chatId,
    senderId,
    staffName,
    monthKey: parsedNote.monthKey,
    currentStoreName: targetStore.storeName,
    candidateStores: candidateStores.map((s) => s.storeName),
    listedEntries: enrichedDetails.map((d) => ({
      handle: d.handle,
      rowId: d.rowId,
      stageName: d.stageName,
      videoUrl: d.videoUrl,
    })),
    lastVideoUrl: firstVideoUrl,
    createdAt: Date.now(),
  });

  const storeSwitchLines = candidateStores
    .map((s, idx) =>
      s.storeName === targetStore.storeName
        ? `   [${idx + 1}] ${s.storeName} (Đang chọn ✓)`
        : `   [${idx + 1}] Gõ "${idx + 1}" ➔ Chuyển sang ${s.storeName}`
    )
    .slice(0, 4);

  if (enrichedDetails.length === 1) {
    const item = enrichedDetails[0];
    const isDuplicate = addedCount === 0 && duplicateCount > 0;

    const replyLines = [
      isDuplicate
        ? `ℹ️ KOC @${item.handle} ĐÃ CÓ TRONG SHEET — ĐÃ CẬP NHẬT CHỈ SỐ MỚI`
        : `✅ ĐÃ LƯU KOC VÀO SHEET LISTING (TỪ ĐIỆN THOẠI)`,
      `----------------------------------------`,
      `• Kênh TikTok: @${item.handle} (${item.stageName})`,
      `• Chỉ số kênh: ${item.followers > 0 ? `${item.followers.toLocaleString('vi-VN')} flw` : 'Đang cập nhật'} | View TB: ${item.avgViews > 0 ? item.avgViews.toLocaleString('vi-VN') : '—'}`,
      `• Hồ sơ UpBase: ${item.thanhQuaText}`,
      `• Gian hàng đích: ${targetStore.storeName} (Kỳ ${parsedNote.monthKey} · ${parsedNote.dot})`,
      `• Sản phẩm gợi ý: ${item.sanPham}`,
      `• Giá Net đề xuất: ${formatVnd(item.netFee)} (${item.tepBooking}) | Gồm thuế: ${formatVnd(item.grossFee)}`,
      `• Nhân sự điền: ${staffName} (Tổng Sheet: ${totalSheetRows} KOC)`,
      `----------------------------------------`,
      `⚡ ĐỔI NHANH BẰNG PHÍM SỐ NGAY TẠI ĐÂY:`,
      ...storeSwitchLines,
      `   • Đổi giá Net: Gõ trực tiếp mức giá (VD: "foc", "800k", "1.5tr")`,
      item.videoUrl ? `   • Nếu muốn chấm Nghiệm thu Air cho video này: Gõ "/air"` : '',
    ].filter(Boolean);

    return { handled: true, reply: replyLines.join('\n') };
  }

  const batchLines = enrichedDetails.map(
    (d, i) =>
      `${i + 1}. @${d.handle} (${d.followers > 0 ? `${Math.round(d.followers / 1000)}K flw` : 'Mới'}) — Giá Net: ${formatVnd(d.netFee)} (${d.tepBooking})${d.isExistingKoc ? ' [Đã có lịch sử]' : ' [KOC mới]'}`
  );

  return {
    handled: true,
    reply: [
      `✅ ĐÃ GOM HÀNG LOẠT ${enrichedDetails.length} KOC VÀO SHEET LISTING`,
      `----------------------------------------`,
      `• Gian hàng đích: ${targetStore.storeName} (Kỳ ${parsedNote.monthKey} · ${parsedNote.dot})`,
      `• Kết quả: Thêm mới ${addedCount} kênh | Cập nhật ${duplicateCount} kênh đã có`,
      `• Nhân sự điền: ${staffName} (Tổng Sheet: ${totalSheetRows} KOC)`,
      `----------------------------------------`,
      ...batchLines,
      `----------------------------------------`,
      `⚡ Gõ số (1–${Math.min(4, candidateStores.length)}) nếu muốn chuyển cả lô sang gian hàng khác:`,
      ...storeSwitchLines,
    ].join('\n'),
  };
}
