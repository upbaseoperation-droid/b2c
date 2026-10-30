import type {
  InputPlanBreakdownState,
  KocItem,
  PlanMultiPlatformKey,
} from './types';

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

/**
 * Một dòng Listing & Nghiệm thu trên sàn ngoài TikTok.
 * Lưu ý: KHÔNG gắn kèm các asset phụ của TikTok (không có Spark Ads code, không tách videoAsset/addonServices).
 * Mỗi dòng là 1 bài đăng trọn gói trên sàn đó + các trường mở rộng theo từng sàn (`platformMetrics`).
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

  // Thông tin KOC trên sàn đó
  kocId?: string;
  channelHandle: string;          // @handle hoặc tên nick/page trên sàn đó
  kocDisplayName: string;         // Tên hiển thị KOC
  channelUrl: string;             // Link kênh đúng theo sàn
  followersCount: number;         // Follower trên sàn đó
  nicheTag: string;               // Tệp kênh (Beauty, Mom & Baby, Sức khỏe...)

  // Đề xuất nội dung & Giá trọn gói (không kèm asset phụ)
  productName: string;            // Sản phẩm / SKU
  postFormat: string;             // Định dạng bài trên sàn đó
  linkPlacement: string;          // Cách gắn link Affiliate / giỏ hàng
  unitNetFee: number;             // Giá Net trọn gói cho bài đăng trên sàn này
  grossFeeWithTax: number;        // Phí kèm thuế TNCN 10% (= unitNetFee / 0.9)
  upbaseProposal: 'Must Have' | 'Recommend' | 'Optional';
  brandDecision: MultiPlatformBrandDecision;
  brandNote?: string;

  // Thực thi & Nghiệm thu bài đăng (Khi Brand chọn Yes)
  boCode?: string;                // Mã BO (VD: BO2611-THR-001)
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

export function computeGrossFromNet(netFee: number): number {
  if (!netFee || netFee <= 0) return 0;
  return Math.round(netFee / 0.9);
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

    result[key] = {
      platform: key,
      label: cfg.label,
      targetAffQty,
      targetBudgetNet,
      targetReupQty,
      listedQty: pItems.length,
      listedBudgetNet: pItems.reduce((s, i) => s + (i.unitNetFee || 0), 0),
      approvedYesQty: yesItems.length,
      approvedYesBudgetNet: yesItems.reduce((s, i) => s + (i.unitNetFee || 0), 0),
      acceptedQty: acceptedItems.length,
      acceptedBudgetNet: acceptedItems.reduce((s, i) => s + (i.unitNetFee || 0), 0),
      actualReupQty: pReups.length,
    };
  }

  return result;
}

/** Tạo dữ liệu mẫu bám sát 100% các gian hàng có chỉ tiêu Đa sàn thực tế trên Lark Base 4.1 & 4.1.1 */
export function buildInitialMultiPlatformSeed(plans: InputPlanBreakdownState[], kocs: KocItem[]): {
  items: MultiPlatformListingItem[];
  reups: MultiPlatformReupRecord[];
} {
  const sampleKocs = kocs.length > 0 ? kocs.slice(0, 40) : [];
  const pickKoc = (idx: number) => {
    const k = sampleKocs[idx % Math.max(1, sampleKocs.length)];
    return {
      kocId: k?.id || `KOC-MP-${idx}`,
      handle: (k?.channelId || `creator.b2c.${idx + 1}`).replace(/^@/, ''),
      name: k?.stageName || `Creator Đa Sàn #${idx + 1}`,
      followers: k?.followers || 28500 + (idx % 9) * 6200,
      niche: k?.tepKenh || 'Beauty & Personal Care',
    };
  };

  const items: MultiPlatformListingItem[] = [];
  const reups: MultiPlatformReupRecord[] = [];
  let seq = 1;

  for (const plan of plans) {
    const storeName = plan.storeName || plan.brandName;
    const brandName = (plan.parentBrand || plan.brandName || storeName).split('_')[0].trim();
    const staffName = plan.primaryPic || plan.pic || 'Hà Thị Thủy';
    const mpRef = plan.reference41?.multiPlatform;
    if (!mpRef) continue;

    const platforms: PlanMultiPlatformKey[] = ['threads', 'facebook', 'shopee', 'instagram'];
    for (const pk of platforms) {
      const pData = mpRef[pk];
      if (!pData) continue;
      const cfg = MULTI_PLATFORM_CONFIGS[pk];
      const affQty = pData.affQty || 0;
      const costNet = pData.costNet || 0;
      const reupQty = pData.reupQty || 0;

      if (affQty > 0 || costNet > 0) {
        const countToSeed = Math.min(affQty > 0 ? affQty : 3, 6);
        const unitNet =
          affQty > 0 && costNet > 0
            ? Math.round(costNet / affQty)
            : costNet > 0
            ? Math.round(costNet / countToSeed)
            : cfg.defaultUnitNet;

        for (let i = 0; i < countToSeed; i++) {
          const koc = pickKoc(seq);
          const isApproved = i < Math.ceil(countToSeed * 0.75);
          const weekNum = 45 + (i % 4);
          const weekCode = plan.month === '2026/10' ? `W${40 + (i % 4)}` : `W${weekNum}`;
          const postDate =
            plan.month === '2026/10'
              ? `2026-10-${String(10 + i * 3).padStart(2, '0')}`
              : `2026-11-${String(5 + i * 3).padStart(2, '0')}`;

          // Chỉ lưu các chỉ số hồ sơ kênh ở bước Listing; tuyệt đối không tự điền giả chỉ số nghiệm thu hoặc trạng thái Đã nghiệm thu trước khi quét thực tế (RULE-DATA-01)
          const metrics: Record<string, string | number> = {};
          if (pk === 'threads') {
            metrics.avgLikesReplies = 95 + (i * 27) % 180;
            metrics.threadStyle = i % 2 === 0 ? 'Chia sẻ trải nghiệm thật' : 'So sánh sản phẩm';
          } else if (pk === 'facebook') {
            metrics.fbChannelType = i % 2 === 0 ? 'Trang cá nhân / Hot Mom' : 'Fanpage Creator';
            metrics.avgPostEngagement = 380 + i * 120;
          } else if (pk === 'shopee') {
            metrics.avgShopeeViews = 2400 + i * 500;
            metrics.shopeeCoopMode = unitNet > 0 ? 'Cast trả phí trọn gói' : 'FOC 0đ + Hoa hồng Affiliate';
          } else if (pk === 'instagram') {
            metrics.igEngagementRate = Number((3.2 + (i % 4) * 0.6).toFixed(1));
            metrics.igAestheticTag = 'Beauty Hàn Quốc / Clean Girl';
          }

          const codePrefix = pk === 'threads' ? 'THR' : pk === 'facebook' ? 'FB' : pk === 'shopee' ? 'SHP' : 'IG';
          const monthDigits = plan.month.replace('/', '').slice(-4);
          const boCode = isApproved ? `BO${monthDigits}-${codePrefix}-${String(seq).padStart(3, '0')}` : undefined;

          items.push({
            id: `MP-ITEM-${plan.month.replace('/', '')}-${pk}-${seq}`,
            monthKey: plan.month,
            storeName,
            brandName,
            platform: pk,
            batchLabel: i < 3 ? 'Đợt 1' : 'Đợt 2',
            targetWeek: weekCode,
            staffName,
            kocId: koc.kocId,
            channelHandle: `@${koc.handle}`,
            kocDisplayName: koc.name,
            channelUrl: buildPlatformChannelUrl(pk, koc.handle),
            followersCount: koc.followers,
            nicheTag: koc.niche,
            productName: `${brandName} Chủ lực`,
            postFormat: cfg.formatOptions[i % cfg.formatOptions.length],
            linkPlacement: cfg.linkPlacementOptions[0],
            unitNetFee: unitNet,
            grossFeeWithTax: computeGrossFromNet(unitNet),
            upbaseProposal: i === 0 ? 'Must Have' : 'Recommend',
            brandDecision: isApproved ? 'Yes' : 'Chờ duyệt',
            boCode,
            plannedPostDate: postDate,
            actualPostDate: undefined,
            postUrl: undefined,
            affiliateTargetUrl: undefined,
            isAffiliateLinkVerified: false,
            stage: isApproved ? 'APPROVED_EXECUTION' : 'LISTING',
            paymentStatus: 'Chờ nghiệm thu',
            platformMetrics: metrics,
            updatedAt: '2026-10-30T10:00:00.000Z',
          });
          seq += 1;
        }
      }

      if (reupQty > 0) {
        const reupSeedCount = Math.min(reupQty, 4);
        for (let rIdx = 0; rIdx < reupSeedCount; rIdx++) {
          const koc = pickKoc(seq + rIdx);
          const weekCode = plan.month === '2026/10' ? `W${40 + (rIdx % 4)}` : `W${45 + (rIdx % 4)}`;
          reups.push({
            id: `MP-REUP-${plan.month.replace('/', '')}-${pk}-${seq}-${rIdx}`,
            monthKey: plan.month,
            storeName,
            platform: pk,
            weekCode,
            kocOrSourceName: koc.name,
            sourceVideoUrl: '',
            reupPostUrl: '',
            productName: `${brandName} Chủ lực`,
            staffName,
            postedDate: plan.month === '2026/10' ? '2026-10-18' : '2026-11-12',
            createdAt: '2026-10-30T10:00:00.000Z',
          });
        }
      }
    }
  }

  return { items, reups };
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
