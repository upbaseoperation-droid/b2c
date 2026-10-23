export type Platform = 'tiktok' | 'instagram' | 'facebook' | 'shopee';

export type ContentType = 'video' | 'reel' | 'photo' | 'post';

/**
 * LIVE: bài đang hiển thị công khai.
 * UNAVAILABLE: bài đã xoá, bị ẩn hoặc chuyển riêng tư.
 * INVALID_LINK: không nhận ra nền tảng hoặc link không chứa ID bài đăng.
 * BLOCKED: nền tảng chặn worker (captcha, giới hạn tần suất, bắt đăng nhập) — cần proxy hoặc thử lại sau.
 * ERROR: lỗi mạng hoặc lỗi bóc tách không lường trước.
 */
export type LinkStatus = 'LIVE' | 'UNAVAILABLE' | 'INVALID_LINK' | 'BLOCKED' | 'ERROR';

export interface ContentMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

export interface ContentAuthor {
  handle: string | null;
  name: string | null;
  profileUrl: string | null;
  followers: number | null;
}

export interface CartProductItem {
  productId: string;
  skuId?: string;
  sellerId?: string;
  title: string;
  anchorKeyword?: string;
  productUrl: string;
  coverUrl?: string;
  categoryName?: string;
  source?: string;
}

export type CartDiagnosticCode =
  | 'ACTIVE_CART'
  | 'CAPCUT_CONFLICT'
  | 'OUT_OF_STOCK_OR_HIDDEN'
  | 'NO_CART'
  | 'CAPTION_LINK';

export interface CartDiagnosis {
  code: CartDiagnosticCode;
  reason: string;
}

/** Dữ liệu một adapter bóc được từ trang công khai của bài đăng. */
export interface ScrapedContent {
  status: LinkStatus;
  statusDetail?: string;
  canonicalUrl?: string;
  contentId?: string;
  contentType?: ContentType;
  author?: Partial<ContentAuthor>;
  publishedAt?: string | null;
  caption?: string;
  durationSeconds?: number | null;
  metrics?: Partial<ContentMetrics>;
  hasProductLink?: boolean | null;
  productTitle?: string | null;
  productUrl?: string | null;
  productId?: string | null;
  sellerId?: string | null;
  cartProducts?: CartProductItem[];
  cartDiagnosis?: CartDiagnosis;
  source: string;
  /** Trường mà nền tảng không công khai qua trang này. */
  limitations?: string[];
}

export interface ParsedLink {
  platform: Platform;
  url: string;
  contentId: string | null;
  contentType: ContentType | null;
  handle: string | null;
  /** Link rút gọn (vt.tiktok.com, shp.ee, fb.watch...) cần mở redirect mới biết ID. */
  isShortLink: boolean;
}

export interface PlatformAdapter {
  platform: Platform;
  fetchContent(link: ParsedLink): Promise<ScrapedContent>;
}

/** Điều kiện nghiệm thu theo deal/SOW. Tất cả đều tuỳ chọn. */
export interface LinkExpectation {
  /** Kênh KOC đã ký hợp đồng (handle, không cần @). */
  handle?: string;
  /** Khoảng ngày air cho phép (YYYY-MM-DD). */
  airFrom?: string;
  airTo?: string;
  requiredHashtags?: string[];
  /** Tên brand, tên sản phẩm hoặc key message phải có trong caption. */
  requiredKeywords?: string[];
  requireProductLink?: boolean;
  expectedProductUrl?: string;
  minViews?: number;
}

export type CheckStatus = 'PASS' | 'WARN' | 'FAIL';

export interface LinkCheckItem {
  key:
    | 'link_format'
    | 'availability'
    | 'channel'
    | 'air_date'
    | 'hashtags'
    | 'keywords'
    | 'product_link'
    | 'cart_link_match'
    | 'min_views';
  label: string;
  status: CheckStatus;
  detail: string;
}

export type Verdict = 'PASS' | 'REVIEW' | 'FAIL';

export interface LinkCheckResult {
  inputUrl: string;
  platform: Platform | null;
  contentType: ContentType | null;
  contentId: string | null;
  canonicalUrl: string | null;
  status: LinkStatus;
  statusDetail: string | null;
  author: ContentAuthor;
  publishedAt: string | null;
  caption: string;
  hashtags: string[];
  mentions: string[];
  durationSeconds: number | null;
  metrics: ContentMetrics;
  hasProductLink: boolean | null;
  productTitle: string | null;
  productUrl?: string | null;
  productId?: string | null;
  sellerId?: string | null;
  cartProducts?: CartProductItem[];
  cartDiagnosis?: CartDiagnosis;
  checks: LinkCheckItem[];
  verdict: Verdict;
  limitations: string[];
  source: string;
  fetchedAt: string;
  fromCache: boolean;
  durationMs: number;
}
