import type {
  BookingDealItem,
  InputPlanBreakdownState,
  KocItem,
  PlanMultiPlatformKey,
  StorePortfolioItem,
} from './types';
import { pushSharedStateToDb } from './sharedStateClient';

export const MULTI_PLATFORM_STORAGE_KEY = 'upbase_b2c_multi_platform_listing_v2';
export const MULTI_PLATFORM_CUSTOM_FIELDS_KEY = 'upbase_b2c_multi_platform_custom_fields_v1';
export const MULTI_PLATFORM_REUP_STORAGE_KEY = 'upbase_b2c_multi_platform_reup_v2';

export type MultiPlatformStage = 'LISTING' | 'APPROVED_EXECUTION' | 'ACCEPTED' | 'PAYMENT_READY' | 'PAID';

export type MultiPlatformBrandDecision = 'Chờ duyệt' | 'Yes' | 'No' | 'Cân nhắc';

export interface MultiPlatformFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'url';
  options?: string[];
  placeholder?: string;
  phase: 'LISTING' | 'ACCEPTANCE' | 'BOTH';
  isCustom?: boolean;
}

export interface MultiPlatformSchemaConfig {
  platform: PlanMultiPlatformKey;
  label: string;
  shortLabel: string;
  channelHandleLabel: string;
  channelUrlPrefix: string;
  defaultUnitNet: number;
  priceRangeLabel: string;
  formatOptions: string[];
  linkPlacementOptions: string[];
  listingFields: MultiPlatformFieldDef[];
  acceptanceFields: MultiPlatformFieldDef[];
}

export const MULTI_PLATFORM_CONFIGS: Record<PlanMultiPlatformKey, MultiPlatformSchemaConfig> = {
  threads: {
    platform: 'threads',
    label: 'Threads',
    shortLabel: 'Threads',
    channelHandleLabel: 'ID kênh Threads (@handle)',
    channelUrlPrefix: 'https://www.threads.net/@',
    defaultUnitNet: 180000,
    priceRangeLabel: '115.000đ – 450.000đ Net/bài',
    formatOptions: [
      'Bài viết Text + Ảnh chụp thật',
      'Bài viết Text + Video ngắn',
      'Chuỗi Thread review chi tiết',
      'Seeding bình luận điều hướng',
    ],
    linkPlacementOptions: [
      'Gắn Link Shopee dưới Reply #1',
      'Gắn trực tiếp trong bài đăng',
      'Gắn Link trên Bio Threads',
    ],
    listingFields: [
      {
        key: 'avgLikesReplies',
        label: 'Tương tác TB/bài (Tim + Reply)',
        type: 'number',
        placeholder: '120',
        phase: 'LISTING',
      },
      {
        key: 'threadStyle',
        label: 'Phong cách bài viết',
        type: 'select',
        options: ['Chia sẻ trải nghiệm thật', 'Góc nhìn chuyên gia', 'So sánh sản phẩm', 'Săn deal / Khuyến mãi'],
        phase: 'LISTING',
      },
    ],
    acceptanceFields: [
      {
        key: 'viewsCount',
        label: 'Lượt xem bài (Views)',
        type: 'number',
        placeholder: '3500',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'likesCount',
        label: 'Lượt Tim',
        type: 'number',
        placeholder: '85',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'repliesRepostsCount',
        label: 'Reply & Repost',
        type: 'number',
        placeholder: '24',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'affiliateClicks',
        label: 'Lượt Click Link Shopee',
        type: 'number',
        placeholder: '140',
        phase: 'ACCEPTANCE',
      },
    ],
  },
  facebook: {
    platform: 'facebook',
    label: 'Facebook',
    shortLabel: 'Facebook',
    channelHandleLabel: 'Tên Nick / Fanpage Facebook',
    channelUrlPrefix: 'https://www.facebook.com/',
    defaultUnitNet: 1800000,
    priceRangeLabel: '600.000đ – 3.800.000đ Net/bài',
    formatOptions: [
      'Facebook Reels gắn link Cmt #1',
      'Bài Post Ảnh + Caption cá nhân',
      'Bài đăng Fanpage KOC/KOL',
      'Bài chia sẻ trong Group cộng đồng',
    ],
    linkPlacementOptions: [
      'Ghim Link Shopee ở Comment #1',
      'Gắn Link trong phần mô tả bài đăng',
      'Gắn Link rút gọn kèm mã giảm giá',
    ],
    listingFields: [
      {
        key: 'fbChannelType',
        label: 'Loại kênh FB',
        type: 'select',
        options: ['Trang cá nhân / Hot Mom', 'Fanpage Creator', 'Group Cộng đồng', 'Trang Bác sĩ / Chuyên gia'],
        phase: 'LISTING',
      },
      {
        key: 'avgPostEngagement',
        label: 'Tương tác TB / bài',
        type: 'number',
        placeholder: '450',
        phase: 'LISTING',
      },
    ],
    acceptanceFields: [
      {
        key: 'viewsCount',
        label: 'Lượt tiếp cận / Views Reels',
        type: 'number',
        placeholder: '15000',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'likesCount',
        label: 'Lượt Like / Reaction',
        type: 'number',
        placeholder: '320',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'commentsSharesCount',
        label: 'Bình luận & Chia sẻ',
        type: 'number',
        placeholder: '48',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'affiliateClicks',
        label: 'Lượt Click Link Shopee',
        type: 'number',
        placeholder: '260',
        phase: 'ACCEPTANCE',
      },
    ],
  },
  shopee: {
    platform: 'shopee',
    label: 'Shopee Video',
    shortLabel: 'Shopee',
    channelHandleLabel: 'ID Shopee / Tên kênh Shopee Video',
    channelUrlPrefix: 'https://shopee.vn/',
    defaultUnitNet: 250000,
    priceRangeLabel: '90.000đ – 350.000đ Net/video (hoặc 0đ FOC)',
    formatOptions: [
      'Shopee Video quay mới gắn giỏ cam',
      'Shopee Video Unbox & Test nhanh',
      'Shopee Video FOC 0đ (Nhận mẫu)',
      'Đăng chéo video sang Shopee Video',
    ],
    linkPlacementOptions: [
      'Gắn Giỏ cam Shopee trực tiếp trên video',
      'Gắn Giỏ cam + Voucher độc quyền',
    ],
    listingFields: [
      {
        key: 'avgShopeeViews',
        label: 'View TB Shopee Video',
        type: 'number',
        placeholder: '2500',
        phase: 'LISTING',
      },
      {
        key: 'shopeeCoopMode',
        label: 'Hình thức trả phí',
        type: 'select',
        options: ['Cast trả phí trọn gói', 'FOC 0đ + Hoa hồng Affiliate', 'Gói mua kèm nền tảng khác'],
        phase: 'LISTING',
      },
    ],
    acceptanceFields: [
      {
        key: 'viewsCount',
        label: 'Lượt xem Shopee Video',
        type: 'number',
        placeholder: '4200',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'likesCount',
        label: 'Lượt Thích',
        type: 'number',
        placeholder: '110',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'ordersCount',
        label: 'Đơn hàng Shopee Video',
        type: 'number',
        placeholder: '12',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'gmvAmount',
        label: 'GMV Shopee Video (VND)',
        type: 'number',
        placeholder: '3600000',
        phase: 'ACCEPTANCE',
      },
    ],
  },
  instagram: {
    platform: 'instagram',
    label: 'Instagram',
    shortLabel: 'Instagram',
    channelHandleLabel: 'ID kênh Instagram (@handle)',
    channelUrlPrefix: 'https://www.instagram.com/',
    defaultUnitNet: 1200000,
    priceRangeLabel: '500.000đ – 2.500.000đ Net/bài',
    formatOptions: [
      'Instagram Reels + Story gắn Link',
      'Carousel Ảnh thẩm mỹ (Photo Dump)',
      'Story Review kèm Sticker Link Shopee',
      'Đăng chéo IG Reels trọn gói',
    ],
    linkPlacementOptions: [
      'Gắn Sticker Link trên Story + Highlight',
      'Gắn Link trên Bio Instagram',
      'Gửi Link tự động qua DM (ManyChat)',
    ],
    listingFields: [
      {
        key: 'igEngagementRate',
        label: 'Tỷ lệ tương tác ER (%)',
        type: 'number',
        placeholder: '3.5',
        phase: 'LISTING',
      },
      {
        key: 'igAestheticTag',
        label: 'Gu hình ảnh kênh',
        type: 'select',
        options: ['Beauty Hàn Quốc / Clean Girl', 'Lifestyle / Daily Vlog', 'Mom & Baby hiện đại', 'Fashion / Lookbook'],
        phase: 'LISTING',
      },
    ],
    acceptanceFields: [
      {
        key: 'viewsCount',
        label: 'Reach / Lượt xem Reels',
        type: 'number',
        placeholder: '9500',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'likesCount',
        label: 'Lượt Tim & Save',
        type: 'number',
        placeholder: '410',
        phase: 'ACCEPTANCE',
      },
      {
        key: 'storyLinkClicks',
        label: 'Lượt Click Sticker Link / Bio',
        type: 'number',
        placeholder: '95',
        phase: 'ACCEPTANCE',
      },
    ],
  },
};

export interface MultiPlatformAutoCheckSummary {
  status: 'LIVE' | 'UNAVAILABLE' | 'INVALID_LINK' | 'BLOCKED' | 'ERROR';
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  authorHandle?: string | null;
  authorName?: string | null;
  airedAtVn?: string | null;
  publishedAt?: string | null;
  hasProductLink?: boolean | null;
  productTitle?: string | null;
  productUrl?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  captionSnippet?: string;
  source?: string;
  limitations?: string[];
  affiliateVerification?: {
    inputUrl: string;
    resolvedUrl: string;
    isLive: boolean;
    isShortLink: boolean;
    platform: string;
    shopId: string | null;
    itemId: string | null;
    hasAffiliateTracking: boolean;
    trackingParams: string[];
    status: 'PASS' | 'WARN' | 'FAIL';
    detail: string;
  };
  checks: Array<{ key: string; label: string; status: 'PASS' | 'WARN' | 'FAIL'; detail: string }>;
  checkedAt: string;
}

export interface MultiPlatformDealJobItem {
  id: string;
  jobCode: string;                 // VD: BO2610-THR-001-J01, BO2610-THR-001-J02
  jobTitle: string;                // VD: Bảng công việc #1 (BO2610-THR-001-J01)
  productName: string;             // Sản phẩm / SKU của Job này
  postFormat: string;              // Định dạng bài đăng của Job này
  linkPlacement: string;           // Vị trí gắn link Affiliate / Giỏ cam
  unitNetFee: number;              // Đơn giá Net của Job này (VND)
  plannedPostDate?: string;        // Ngày dự kiến đăng (YYYY-MM-DD)
  actualPostDate?: string;         // Ngày đăng thực tế (YYYY-MM-DD)
  postUrl?: string;                // Link bài đăng nghiệm thu
  affiliateTargetUrl?: string;     // Link Shopee Affiliate / Giỏ hàng
  isAffiliateLinkVerified?: boolean;
  acceptanceStatus?:
    | 'CHỜ_ĐĂNG'
    | 'ĐÃ_ĐĂNG'
    | 'ĐẠT_CHUẨN'
    | 'CHUA_NGHIEM_THU'
    | 'DA_NGHIEM_THU';
  autoCheckResult?: MultiPlatformAutoCheckSummary;
}

/**
 * Một dòng Deal & Nghiệm thu trên sàn ngoài TikTok (Quản lý theo cấu trúc 1 Deal = N Job).
 * Lưu ý: KHÔNG gắn kèm các asset phụ của TikTok (không có Spark Ads code, không tách videoAsset/addonServices).
 * Mỗi Deal (`boCode`) chứa danh sách `dealJobs` (1 hoặc N Job bài đăng) + các trường mở rộng theo từng sàn (`platformMetrics`).
 */
export interface MultiPlatformListingItem {
  id: string;
  monthKey: string;               // '2026/11' | '2026/10'
  storeName: string;              // 'Cathy Doll_Shopee_E2E-C'
  brandName: string;              // 'Cathy Doll'
  platform: PlanMultiPlatformKey; // 'threads' | 'facebook' | 'shopee' | 'instagram'
  batchLabel: string;             // 'Đợt 1' | 'Đợt 2' | 'Đợt 3'
  targetWeek: string;             // 'W45' | 'W46' | 'W47' | 'W48' | 'W49'
  staffName: string;              // Nhân sự phụ trách

  // Định danh KOC gốc sở hữu kênh (Liên kết 1-N với Danh bạ KOC TikTok để chống mồ côi kênh)
  kocId?: string;                 // Mã KOC trong Danh bạ KOC Master (VD: KOC-0001)
  kocStageName?: string;          // Tên KOC gốc trong Danh bạ (VD: Bác Sĩ Hiếu)
  kocTiktokHandle?: string;       // ID kênh TikTok gốc của KOC (VD: @drhieu.official)
  kocTiktokUrl?: string;          // Link kênh TikTok gốc (https://www.tiktok.com/@...)

  // Thông tin kênh trên sàn đó (Threads / Facebook / Shopee Video / Instagram)
  channelHandle: string;          // @handle hoặc tên nick/page trên sàn đó
  kocDisplayName: string;         // Tên hiển thị kênh trên sàn đó
  channelUrl: string;             // Link kênh đúng theo sàn
  followersCount: number;         // Follower trên sàn đó
  nicheTag: string;               // Tệp kênh (Beauty, Mom & Baby, Sức khỏe...)

  // Đề xuất nội dung & Giá trọn gói (tổng hợp từ dealJobs)
  productName: string;            // Sản phẩm / SKU
  postFormat: string;             // Định dạng bài trên sàn đó
  linkPlacement: string;          // Cách gắn link Affiliate / giỏ hàng
  unitNetFee: number;             // Tổng Giá Net Deal (cộng từ các Job trong Deal)
  grossFeeWithTax: number;        // Phí kèm thuế chuẩn BR-09
  upbaseProposal: 'Must Have' | 'Recommend' | 'Optional';
  brandDecision: MultiPlatformBrandDecision;
  brandNote?: string;

  // Thực thi & Nghiệm thu Deal - Job (Khi Brand chọn Yes)
  boCode?: string;                // Mã Deal BO (VD: BO2611-THR-001)
  dealJobs?: MultiPlatformDealJobItem[]; // Danh sách 1..N Job thuộc Deal (sẵn sàng ánh xạ sang Phụ lục SOW khi cần)
  plannedPostDate?: string;       // Ngày dự kiến đăng (YYYY-MM-DD)
  actualPostDate?: string;        // Ngày đăng thực tế (YYYY-MM-DD)
  postUrl?: string;               // Link bài đăng thực tế trên FB / Threads / IG / Shopee Video
  affiliateTargetUrl?: string;    // Link Shopee Affiliate / Giỏ hàng đã gắn trong bài hoặc Comment #1
  isAffiliateLinkVerified?: boolean;
  stage: MultiPlatformStage;
  paymentStatus: 'Chờ nghiệm thu' | 'Đủ điều kiện ĐNTT' | 'Đã lập ĐNTT' | 'Đã thanh toán';

  // Các trường chỉ số & thuộc tính riêng của từng sàn (dễ dàng thêm trường mới mà không vỡ cấu trúc)
  platformMetrics: Record<string, string | number>;
  autoCheckResult?: MultiPlatformAutoCheckSummary;
  updatedAt: string;
}

/** Bản ghi theo dõi Video Reup 0đ theo tuần trên từng sàn */
export interface MultiPlatformReupRecord {
  id: string;
  monthKey: string;
  storeName: string;
  platform: PlanMultiPlatformKey;
  weekCode: string;               // 'W45', 'W46'...
  kocId?: string;                 // Mã KOC gốc sở hữu video (nếu Reup từ KOC)
  kocStageName?: string;          // Tên KOC gốc trong Danh bạ
  kocTiktokHandle?: string;       // ID kênh TikTok gốc (@handle)
  kocOrSourceName: string;        // Kênh hoặc nguồn video gốc
  sourceVideoUrl: string;         // Link video gốc (TikTok / Kênh Brand)
  reupPostUrl: string;            // Link đã đăng lại trên Shopee Video / FB Reels / IG / Threads
  productName: string;
  staffName: string;
  postedDate: string;
  autoCheckResult?: MultiPlatformAutoCheckSummary;
  createdAt: string;
}

export interface MultiPlatformQuotaSummary {
  platform: PlanMultiPlatformKey;
  label: string;
  targetAffQty: number;
  targetBudgetNet: number;
  targetReupQty: number;
  listedQty: number;
  listedBudgetNet: number;
  approvedYesQty: number;
  approvedYesBudgetNet: number;
  acceptedQty: number;
  acceptedBudgetNet: number;
  actualReupQty: number;
}

export function buildPlatformChannelUrl(platform: PlanMultiPlatformKey, handle: string): string {
  const clean = (handle || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  const noAt = clean.replace(/^@/, '');
  switch (platform) {
    case 'threads':
      return `https://www.threads.net/@${noAt}`;
    case 'instagram':
      return `https://www.instagram.com/${noAt}`;
    case 'facebook':
      return `https://www.facebook.com/${noAt}`;
    case 'shopee':
      return `https://shopee.vn/${noAt}`;
  }
}

export function detectMultiPlatformFromUrl(url: string): PlanMultiPlatformKey | null {
  const lower = (url || '').trim().toLowerCase();
  if (!lower) return null;
  if (lower.includes('threads.net') || lower.includes('threads.com')) return 'threads';
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  if (lower.includes('shopee.vn') || lower.includes('shp.ee')) return 'shopee';
  return null;
}

export function computeGrossFromNet(
  netFee: number,
  loaiTaiKhoan: 'INDIVIDUAL' | 'HOUSEHOLD_BUSINESS' | 'COMPANY' = 'INDIVIDUAL'
): number {
  if (!netFee || netFee <= 0) return 0;
  if (loaiTaiKhoan === 'HOUSEHOLD_BUSINESS') return Math.round(netFee);
  if (loaiTaiKhoan === 'COMPANY') return Math.round(netFee * 1.08);
  // Cá nhân (TNCN 10%): Dưới 2.000.000đ không khấu trừ thuế tại nguồn (chuẩn BR-09)
  if (netFee < 2_000_000) return Math.round(netFee);
  return Math.round(netFee / 0.9);
}

/**
 * Chuẩn hóa danh sách Job thuộc 1 Deal ngoại sàn (1 Deal = N Job).
 * Đảm bảo mỗi Deal luôn có ít nhất 1 Job (`J01`) để sẵn sàng mở rộng sang Phụ lục SOW khi cần.
 */
export function ensureMultiPlatformDealJobs(
  item: MultiPlatformListingItem
): MultiPlatformDealJobItem[] {
  const cfg = MULTI_PLATFORM_CONFIGS[item.platform];
  const baseBo = item.boCode || `MP-${item.id}`;
  if (Array.isArray(item.dealJobs) && item.dealJobs.length > 0) {
    return item.dealJobs.map((j, idx) => {
      const fallbackCode = `${baseBo}-J${String(idx + 1).padStart(2, '0')}`;
      const jobCode = j.jobCode?.trim() || fallbackCode;
      const postUrl = j.postUrl !== undefined ? j.postUrl : idx === 0 ? item.postUrl : undefined;
      return {
        ...j,
        id: j.id || `${jobCode}-${idx}`,
        jobCode,
        jobTitle: j.jobTitle?.trim() || `Bảng công việc #${idx + 1} (${jobCode})`,
        productName: j.productName?.trim() || item.productName || `${item.brandName} Chủ lực`,
        postFormat: j.postFormat || item.postFormat || cfg.formatOptions[0],
        linkPlacement: j.linkPlacement || item.linkPlacement || cfg.linkPlacementOptions[0],
        unitNetFee: Number.isFinite(Number(j.unitNetFee)) ? Number(j.unitNetFee) : item.unitNetFee || 0,
        plannedPostDate: j.plannedPostDate || item.plannedPostDate,
        actualPostDate: j.actualPostDate || (idx === 0 ? item.actualPostDate : undefined),
        postUrl,
        affiliateTargetUrl:
          j.affiliateTargetUrl !== undefined
            ? j.affiliateTargetUrl
            : idx === 0
            ? item.affiliateTargetUrl
            : undefined,
        isAffiliateLinkVerified:
          j.isAffiliateLinkVerified !== undefined
            ? j.isAffiliateLinkVerified
            : idx === 0
            ? item.isAffiliateLinkVerified
            : false,
        acceptanceStatus: postUrl?.trim() ? 'DA_NGHIEM_THU' : j.acceptanceStatus || 'CHUA_NGHIEM_THU',
      };
    });
  }

  const jobCode = `${baseBo}-J01`;
  return [
    {
      id: `${jobCode}-0`,
      jobCode,
      jobTitle: `Bảng công việc #1 (${jobCode})`,
      productName: item.productName || `${item.brandName} Chủ lực`,
      postFormat: item.postFormat || cfg.formatOptions[0],
      linkPlacement: item.linkPlacement || cfg.linkPlacementOptions[0],
      unitNetFee: Number(item.unitNetFee) || 0,
      plannedPostDate: item.plannedPostDate,
      actualPostDate: item.actualPostDate,
      postUrl: item.postUrl,
      affiliateTargetUrl: item.affiliateTargetUrl,
      isAffiliateLinkVerified: item.isAffiliateLinkVerified,
      acceptanceStatus: item.postUrl?.trim() ? 'DA_NGHIEM_THU' : 'CHUA_NGHIEM_THU',
      autoCheckResult: item.autoCheckResult,
    },
  ];
}

/**
 * Tính toán lại thông tin tổng hợp của Deal ngoại sàn từ danh sách `dealJobs`.
 */
export function recalculateMultiPlatformDealFromJobs(
  item: MultiPlatformListingItem,
  jobs: MultiPlatformDealJobItem[]
): MultiPlatformListingItem {
  const baseBo = item.boCode || `MP-${item.id}`;
  const normalizedJobs = (jobs.length > 0 ? jobs : ensureMultiPlatformDealJobs(item)).map(
    (j, idx) => {
      const jobCode =
        j.jobCode && !j.jobCode.startsWith('MP-')
          ? j.jobCode
          : `${baseBo}-J${String(idx + 1).padStart(2, '0')}`;
      return {
        ...j,
        id: j.id || `${jobCode}-${idx}`,
        jobCode,
        jobTitle: `Bảng công việc #${idx + 1} (${jobCode})`,
        unitNetFee: Math.max(0, Number(j.unitNetFee) || 0),
        acceptanceStatus: j.postUrl?.trim()
          ? ('DA_NGHIEM_THU' as const)
          : ('CHUA_NGHIEM_THU' as const),
      };
    }
  );

  const totalNet = normalizedJobs.reduce((sum, j) => sum + (Number(j.unitNetFee) || 0), 0);
  const firstJob = normalizedJobs[0];
  const combinedProducts =
    normalizedJobs.length > 1
      ? Array.from(new Set(normalizedJobs.map((j) => j.productName?.trim()).filter(Boolean))).join(' + ')
      : firstJob?.productName || item.productName;
  const anyPostedJob = normalizedJobs.find((j) => Boolean(j.postUrl?.trim())) || firstJob;
  const allJobsPosted = normalizedJobs.every((j) => Boolean(j.postUrl?.trim()));

  return {
    ...item,
    productName: combinedProducts || item.productName,
    postFormat: firstJob?.postFormat || item.postFormat,
    linkPlacement: firstJob?.linkPlacement || item.linkPlacement,
    unitNetFee: totalNet,
    grossFeeWithTax: computeGrossFromNet(totalNet),
    plannedPostDate: firstJob?.plannedPostDate || item.plannedPostDate,
    actualPostDate: anyPostedJob?.actualPostDate || item.actualPostDate,
    postUrl: anyPostedJob?.postUrl || item.postUrl,
    affiliateTargetUrl: anyPostedJob?.affiliateTargetUrl || item.affiliateTargetUrl,
    isAffiliateLinkVerified: Boolean(anyPostedJob?.isAffiliateLinkVerified ?? item.isAffiliateLinkVerified),
    stage:
      item.stage === 'PAID' || item.stage === 'PAYMENT_READY'
        ? item.stage
        : allJobsPosted
        ? 'ACCEPTED'
        : item.boCode
        ? 'APPROVED_EXECUTION'
        : item.stage,
    dealJobs: normalizedJobs,
    updatedAt: new Date().toISOString(),
  };
}

/** Tính hạn ngạch 4 sàn (Shopee, Threads, Facebook, Instagram) của 1 kế hoạch gian hàng từ 4.1 & 4.1.1 */
export function computeStoreMultiPlatformQuotas(
  plan: InputPlanBreakdownState | null | undefined,
  items: MultiPlatformListingItem[],
  reupRecords: MultiPlatformReupRecord[]
): Record<PlanMultiPlatformKey, MultiPlatformQuotaSummary> {
  const keys: PlanMultiPlatformKey[] = ['threads', 'facebook', 'shopee', 'instagram'];
  const result = {} as Record<PlanMultiPlatformKey, MultiPlatformQuotaSummary>;

  for (const key of keys) {
    const cfg = MULTI_PLATFORM_CONFIGS[key];
    const refMp = plan?.reference41?.multiPlatform?.[key];
    let wkAff = 0;
    let wkNet = 0;
    let wkReup = 0;
    for (const r of plan?.weeklyBreakdown || []) {
      const m = r.multiPlatform?.[key];
      if (m) {
        wkAff += m.affQty || 0;
        wkNet += m.budgetNet || 0;
        wkReup += m.reupQty || 0;
      }
    }

    const targetAffQty = Math.max(refMp?.affQty || 0, wkAff);
    const targetBudgetNet = Math.max(refMp?.costNet || 0, wkNet);
    const targetReupQty = Math.max(refMp?.reupQty || 0, wkReup);

    const pItems = items.filter(i => i.platform === key && i.brandDecision !== 'No');
    const yesItems = items.filter(i => i.platform === key && i.brandDecision === 'Yes');
    const acceptedItems = yesItems.filter(
      i => (i.stage === 'ACCEPTED' || i.stage === 'PAYMENT_READY' || i.stage === 'PAID') && Boolean(i.postUrl)
    );
    const pReups = reupRecords.filter(r => r.platform === key);

    const countJobs = (list: MultiPlatformListingItem[]) =>
      list.reduce((sum, it) => sum + Math.max(1, it.dealJobs?.length || 1), 0);

    result[key] = {
      platform: key,
      label: cfg.label,
      targetAffQty,
      targetBudgetNet,
      targetReupQty,
      listedQty: countJobs(pItems),
      listedBudgetNet: pItems.reduce((s, i) => s + (i.unitNetFee || 0), 0),
      approvedYesQty: countJobs(yesItems),
      approvedYesBudgetNet: yesItems.reduce((s, i) => s + (i.unitNetFee || 0), 0),
      acceptedQty: countJobs(acceptedItems),
      acceptedBudgetNet: acceptedItems.reduce((s, i) => s + (i.unitNetFee || 0), 0),
      actualReupQty: pReups.length,
    };
  }

  return result;
}

export function isSyntheticMultiPlatformSeedItem(
  item?: Partial<MultiPlatformListingItem> | null
): boolean {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '');
  return id.startsWith('MP-ITEM-') && item.updatedAt === '2026-10-30T10:00:00.000Z';
}

export function isSyntheticMultiPlatformSeedReup(
  record?: Partial<MultiPlatformReupRecord> | null
): boolean {
  if (!record || typeof record !== 'object') return false;
  const id = String(record.id || '');
  return id.startsWith('MP-REUP-') && record.createdAt === '2026-10-30T10:00:00.000Z';
}

/** Khởi tạo danh sách Đa sàn rỗng (chỉ giữ hạn ngạch thực tế từ Lark Base 4.1 & 4.1.1, không tự sinh KOC mẫu) */
export function buildInitialMultiPlatformSeed(
  _plans: InputPlanBreakdownState[],
  _kocs: KocItem[]
): {
  items: MultiPlatformListingItem[];
  reups: MultiPlatformReupRecord[];
} {
  return { items: [], reups: [] };
}

export function loadMultiPlatformCustomFields(): Record<PlanMultiPlatformKey, MultiPlatformFieldDef[]> {
  const empty: Record<PlanMultiPlatformKey, MultiPlatformFieldDef[]> = {
    threads: [],
    facebook: [],
    shopee: [],
    instagram: [],
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(MULTI_PLATFORM_CUSTOM_FIELDS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

export function saveMultiPlatformCustomFields(
  fieldsByPlatform: Record<PlanMultiPlatformKey, MultiPlatformFieldDef[]>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MULTI_PLATFORM_CUSTOM_FIELDS_KEY, JSON.stringify(fieldsByPlatform));
  } catch {
    // ignore quota errors
  }
}

export interface ResolvedMultiPlatformParentKoc {
  koc: KocItem | null;
  isOrphaned: boolean;
  kocId: string;
  kocStageName: string;
  kocTiktokHandle: string;
  kocTiktokUrl: string;
  salaryGrade?: string;
}

interface MultiPlatformKocIndex {
  byId: Map<string, KocItem>;
  byTiktokHandle: Map<string, KocItem>;
  byPlatformHandle: Map<string, KocItem>;
  byAnyHandle: Map<string, KocItem>;
  byStageName: Map<string, KocItem>;
}

const kocIndexCache = new WeakMap<KocItem[], MultiPlatformKocIndex>();

function cleanSocialHandle(raw?: string | null): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const m = s.match(
    /(?:tiktok\.com\/@|facebook\.com\/|instagram\.com\/|threads\.net\/@|threads\.com\/@|shopee\.vn\/)([a-zA-Z0-9._-]+)/i
  );
  if (m && m[1]) return m[1].replace(/^@/, '').trim();
  return s.replace(/^@/, '').trim();
}

function normPersonText(raw?: string | null): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getMultiPlatformKocIndex(kocs: KocItem[]): MultiPlatformKocIndex {
  const cached = kocIndexCache.get(kocs);
  if (cached) return cached;

  const byId = new Map<string, KocItem>();
  const byTiktokHandle = new Map<string, KocItem>();
  const byPlatformHandle = new Map<string, KocItem>();
  const byAnyHandle = new Map<string, KocItem>();
  const byStageName = new Map<string, KocItem>();

  const registerHandle = (plat: PlanMultiPlatformKey | 'tiktok', rawHandle: string | undefined, k: KocItem) => {
    const clean = cleanSocialHandle(rawHandle).toLowerCase();
    if (!clean) return;
    if (!byAnyHandle.has(clean)) byAnyHandle.set(clean, k);
    if (plat === 'tiktok') {
      if (!byTiktokHandle.has(clean)) byTiktokHandle.set(clean, k);
    } else {
      const key = `${plat}::${clean}`;
      if (!byPlatformHandle.has(key)) byPlatformHandle.set(key, k);
    }
  };

  for (const k of kocs) {
    if (!k) continue;
    if (k.id) byId.set(k.id, k);

    registerHandle('tiktok', k.channelId, k);
    registerHandle('tiktok', k.tiktokChannel, k);
    for (const h of k.tiktokChannels || []) {
      registerHandle('tiktok', h, k);
    }

    const splitHandles = (val?: string) =>
      (val || '')
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(Boolean);

    for (const h of splitHandles(k.threadsChannel)) registerHandle('threads', h, k);
    for (const h of splitHandles(k.facebookChannel)) registerHandle('facebook', h, k);
    for (const h of splitHandles(k.shopeeChannel)) registerHandle('shopee', h, k);
    for (const h of splitHandles(k.instagramChannel)) registerHandle('instagram', h, k);

    for (const ch of k.connectedChannels || []) {
      const p = ch.platform;
      if (p === 'TIKTOK') registerHandle('tiktok', ch.handle, k);
      else if (p === 'THREADS') registerHandle('threads', ch.handle, k);
      else if (p === 'FACEBOOK') registerHandle('facebook', ch.handle, k);
      else if (p === 'SHOPEE') registerHandle('shopee', ch.handle, k);
      else if (p === 'INSTAGRAM') registerHandle('instagram', ch.handle, k);
    }

    const stageNorm = normPersonText(k.stageName);
    if (stageNorm && !byStageName.has(stageNorm)) byStageName.set(stageNorm, k);
    const realNorm = normPersonText(k.realName);
    if (realNorm && !byStageName.has(realNorm)) byStageName.set(realNorm, k);
  }

  const index: MultiPlatformKocIndex = {
    byId,
    byTiktokHandle,
    byPlatformHandle,
    byAnyHandle,
    byStageName,
  };
  kocIndexCache.set(kocs, index);
  return index;
}

/**
 * Xác định KOC gốc (có kênh TikTok trong Danh bạ KOC) sở hữu kênh ngoại sàn.
 * Đảm bảo kênh trên Threads / Facebook / Shopee Video / Instagram không bị mồ côi.
 */
export function resolveMultiPlatformParentKoc(
  item: Pick<
    MultiPlatformListingItem,
    'kocId' | 'kocStageName' | 'kocTiktokHandle' | 'kocTiktokUrl' | 'platform' | 'channelHandle' | 'kocDisplayName'
  >,
  kocs: KocItem[]
): ResolvedMultiPlatformParentKoc {
  const index = getMultiPlatformKocIndex(kocs);
  const cleanPlatHandle = cleanSocialHandle(item.channelHandle).toLowerCase();
  const cleanTtHandle = cleanSocialHandle(item.kocTiktokHandle).toLowerCase();

  let matched: KocItem | undefined;
  if (item.kocId && index.byId.has(item.kocId)) {
    matched = index.byId.get(item.kocId);
  }
  if (!matched && cleanTtHandle) {
    matched = index.byTiktokHandle.get(cleanTtHandle) || index.byAnyHandle.get(cleanTtHandle);
  }
  if (!matched && cleanPlatHandle) {
    matched =
      index.byPlatformHandle.get(`${item.platform}::${cleanPlatHandle}`) ||
      index.byTiktokHandle.get(cleanPlatHandle) ||
      index.byAnyHandle.get(cleanPlatHandle);
  }
  if (!matched && item.kocStageName) {
    matched = index.byStageName.get(normPersonText(item.kocStageName));
  }
  if (!matched && item.kocDisplayName) {
    matched = index.byStageName.get(normPersonText(item.kocDisplayName));
  }

  if (matched) {
    const ttClean = cleanSocialHandle(matched.channelId || matched.tiktokChannel);
    const ttHandle = ttClean ? `@${ttClean}` : item.kocTiktokHandle || '';
    const ttUrl =
      matched.channelLink ||
      (ttClean ? `https://www.tiktok.com/@${ttClean}` : item.kocTiktokUrl || '');
    return {
      koc: matched,
      isOrphaned: false,
      kocId: matched.id,
      kocStageName: matched.stageName || matched.realName || item.kocStageName || item.kocDisplayName,
      kocTiktokHandle: ttHandle,
      kocTiktokUrl: ttUrl,
      salaryGrade: matched.salaryGrade,
    };
  }

  const hasExplicitParent = Boolean(item.kocId?.trim() && item.kocTiktokHandle?.trim());
  const fallbackTtClean = cleanSocialHandle(item.kocTiktokHandle);
  return {
    koc: null,
    isOrphaned: !hasExplicitParent,
    kocId: item.kocId || '',
    kocStageName: item.kocStageName || '',
    kocTiktokHandle: fallbackTtClean ? `@${fallbackTtClean}` : '',
    kocTiktokUrl:
      item.kocTiktokUrl || (fallbackTtClean ? `https://www.tiktok.com/@${fallbackTtClean}` : ''),
  };
}

export function resolveMultiPlatformReupParentKoc(
  record: Pick<
    MultiPlatformReupRecord,
    'kocId' | 'kocStageName' | 'kocTiktokHandle' | 'platform' | 'kocOrSourceName' | 'sourceVideoUrl'
  >,
  kocs: KocItem[]
): ResolvedMultiPlatformParentKoc {
  const urlHandle = cleanSocialHandle(record.sourceVideoUrl);
  return resolveMultiPlatformParentKoc(
    {
      kocId: record.kocId,
      kocStageName: record.kocStageName,
      kocTiktokHandle: record.kocTiktokHandle || (urlHandle ? `@${urlHandle}` : undefined),
      platform: record.platform,
      channelHandle: urlHandle || record.kocOrSourceName,
      kocDisplayName: record.kocOrSourceName,
    },
    kocs
  );
}

/**
 * Lấy thông tin kênh ngoại sàn đã liên kết sẵn của KOC (nếu có trong hồ sơ KOC),
 * hoặc gợi ý từ kênh TikTok gốc khi người dùng chọn KOC trong Danh bạ.
 */
export function extractKocPlatformChannelDefaults(
  koc: KocItem,
  platform: PlanMultiPlatformKey
): {
  kocId: string;
  kocStageName: string;
  kocTiktokHandle: string;
  kocTiktokUrl: string;
  channelHandle: string;
  kocDisplayName: string;
  followersCount: number;
  nicheTag: string;
} {
  const ttClean = cleanSocialHandle(koc.channelId || koc.tiktokChannel);
  const kocTiktokHandle = ttClean ? `@${ttClean}` : '';
  const kocTiktokUrl = koc.channelLink || (ttClean ? `https://www.tiktok.com/@${ttClean}` : '');

  const targetConnectedPlatform =
    platform === 'threads'
      ? 'THREADS'
      : platform === 'facebook'
      ? 'FACEBOOK'
      : platform === 'shopee'
      ? 'SHOPEE'
      : 'INSTAGRAM';

  const connectedMatch = (koc.connectedChannels || []).find(
    c => c.platform === targetConnectedPlatform && cleanSocialHandle(c.handle)
  );

  const rawField =
    platform === 'threads'
      ? koc.threadsChannel
      : platform === 'facebook'
      ? koc.facebookChannel
      : platform === 'shopee'
      ? koc.shopeeChannel
      : koc.instagramChannel;

  const firstFieldHandle = cleanSocialHandle((rawField || '').split(/[,;]/)[0]);
  const resolvedPlatHandle =
    cleanSocialHandle(connectedMatch?.handle) || firstFieldHandle || ttClean;

  return {
    kocId: koc.id,
    kocStageName: koc.stageName || koc.realName || ttClean,
    kocTiktokHandle,
    kocTiktokUrl,
    channelHandle: resolvedPlatHandle,
    kocDisplayName: connectedMatch?.channelName || koc.stageName || resolvedPlatHandle,
    followersCount: connectedMatch?.followers || koc.followers || 0,
    nicheTag: koc.tepKenh || koc.niche || 'Beauty',
  };
}

export function buildBookingDealFromMultiPlatformItem(
  item: MultiPlatformListingItem,
  stores: StorePortfolioItem[],
  kocs: KocItem[]
): BookingDealItem {
  const matchedStore = stores.find(
    s => s.storeName.trim().toLowerCase() === item.storeName.trim().toLowerCase()
  );
  const resolvedParent = resolveMultiPlatformParentKoc(item, kocs);
  const matchedKoc = resolvedParent.koc;
  const cleanHandle = item.channelHandle.replace(/^@/, '').toLowerCase();
  const maBo = item.boCode || `MP-DEAL-${item.id}`;
  const jobs = ensureMultiPlatformDealJobs(item);
  const jobCodesLabel = jobs.map(j => j.jobCode).join(', ');
  const isVerified =
    item.stage === 'PAYMENT_READY' ||
    item.stage === 'ACCEPTED' ||
    Boolean(item.postUrl) ||
    jobs.every(j => Boolean(j.postUrl?.trim()));
  const netFee = Number(item.unitNetFee) || 0;
  const salaryGrade: BookingDealItem['salaryGrade'] =
    netFee <= 0
      ? 'TAP UpAffiliate'
      : netFee <= 500000
      ? 'KL1'
      : netFee <= 1500000
      ? 'KL2'
      : netFee <= 3000000
      ? 'KL3'
      : netFee <= 5000000
      ? 'KL4'
      : netFee <= 10000000
      ? 'KL5'
      : netFee <= 30000000
      ? 'KL6'
      : 'KL7';

  return {
    id: maBo,
    dealCode: maBo,
    jobId: jobCodesLabel || `${maBo}-J01`,
    campaignCode: `CAMP-${item.monthKey.replace(/\D/g, '')}`,
    campaignTitle: `${item.productName} (${MULTI_PLATFORM_CONFIGS[item.platform].shortLabel} · ${jobs.length} Job)`,
    brandName: item.brandName || matchedStore?.brandName || item.storeName.split('_')[0] || 'Brand',
    storeId: matchedStore?.id || 'STORE-MP',
    storeName: item.storeName,
    productName: item.productName,
    bookingBatch: item.batchLabel || 'Đợt 1',
    bookingFormat: 'Booking Video KOC',
    kocId: matchedKoc?.id || resolvedParent.kocId || `KOC-${cleanHandle || item.id}`,
    kocStageName:
      matchedKoc?.stageName ||
      resolvedParent.kocStageName ||
      item.kocDisplayName ||
      item.channelHandle,
    kocChannelId:
      resolvedParent.kocTiktokHandle ||
      (item.channelHandle.startsWith('@') ? item.channelHandle : `@${item.channelHandle}`),
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
    tepKenh: (item.nicheTag as BookingDealItem['tepKenh']) || 'Chưa phân loại',
    kocCategory: 'Reviewer',
    contentPillar: 'Review trực tiếp',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    brandApprovalDate: (item.updatedAt || '').slice(0, 10),
    kocResponseStatus: 'ĐỒNG_Ý',
    pipelineText: isVerified ? 'Done' : 'Đang triển khai',
    status: isVerified ? 'VIDEO_VERIFIED' : 'CONTRACT_GENERATED',
    statusLabel: isVerified ? 'Đã nghiệm thu Đa sàn' : 'Đã tạo Deal Đa sàn',
    currentStage: isVerified ? '5_SETTLEMENT' : '2_DEAL_CONTRACT',
    adsCodeStatus: 'KHÔNG_DÙNG',
    assignedStaff: item.staffName || matchedStore?.primaryPic || 'Chuyên viên Đa sàn',
    bookingPic: item.staffName || matchedStore?.primaryPic || 'Chuyên viên Đa sàn',
    leadBooking: matchedStore?.bookingLeader || 'Đặng Thị Yến Nhi',
    totalValue: netFee,
    advanceAmount: 0,
    finalAmount: netFee,
    deadlinePost: item.actualPostDate || item.plannedPostDate || `${item.monthKey.replace('/', '-')}-20`,
    postedDate: item.actualPostDate || item.plannedPostDate || undefined,
    videoUrl: item.postUrl || undefined,
    tiktokVideoUrl: item.postUrl || undefined,
    viewsCount:
      Number(
        item.platformMetrics?.views ||
          item.platformMetrics?.reach ||
          item.platformMetrics?.videoViews ||
          0
      ) || 0,
    affiliateGmv: Number(item.platformMetrics?.gmvAttributed || 0) || 0,
    gmv30: Number(item.platformMetrics?.gmvAttributed || 0) || 0,
    roi:
      netFee === 0
        ? 0
        : Number(((Number(item.platformMetrics?.gmvAttributed || 0) || 0) / netFee).toFixed(2)),
    publishedDays: isVerified ? 7 : 0,
    remainingSlaHours: 24,
    isSlaWarning: false,
    paymentStatus: item.paymentStatus,
    contractAppendixCode: `SOW-${maBo}`,
  };
}

export function loadMultiPlatformListingItems(
  plans: InputPlanBreakdownState[],
  kocs: KocItem[]
): MultiPlatformListingItem[] {
  if (typeof window !== 'undefined') {
    try {
      const raw =
        window.localStorage.getItem(MULTI_PLATFORM_STORAGE_KEY) ||
        window.localStorage.getItem('upbase_b2c_multi_platform_listings_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as MultiPlatformListingItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to seed
    }
  }
  return buildInitialMultiPlatformSeed(plans, kocs).items;
}

export function saveMultiPlatformListingItems(items: MultiPlatformListingItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(items);
    window.localStorage.setItem(MULTI_PLATFORM_STORAGE_KEY, serialized);
    window.localStorage.setItem('upbase_b2c_multi_platform_listings_v1', serialized);
    pushSharedStateToDb('multi-platform-listings-v1', items);
    window.dispatchEvent(new CustomEvent('upbase:multi-platform-listings-updated', { detail: items }));
  } catch {
    // ignore quota errors
  }
}
