/**
 * Hồ sơ thương hiệu lưu trên hệ thống. Chứa thông tin định vị, chiến lược nội dung, sản phẩm,
 * quy chuẩn nội dung, quy tắc vận hành & phê duyệt, pháp lý, trần thù lao và kho tài liệu của nhãn.
 */

export type ToneTag = 'EXPERT' | 'MOM' | 'GENZ' | 'PREMIUM';

export interface BrandCompetitorTiers {
  /** Tier A — Đối thủ trực tiếp (Primary Direct Competitor: cùng ngành hàng, tệp khách, định vị & kênh bán — cần thắng) */
  tierA?: string[];
  /** Tier B — Đối thủ giao thoa một phần danh mục (Secondary / Near Competitor — cần theo dõi) */
  tierB?: string[];
  /** Tier C — Hình mẫu tham khảo (Aspirational Benchmark — học cách xây thương hiệu/kể chuyện, không đối đầu trực diện) */
  tierC?: string[];
}

export interface BrandPositioning {
  slogan: string;
  story: string;
  toneTag?: ToneTag;
  toneOfVoice: string;
  targetAudience: string;
  /** Định vị theo Brand Guideline (Brand Says — Thương hiệu tự nói mình là ai) */
  brandSays?: string;
  /** Nhận thức thực tế của người mua trên sàn (Consumer Says / Brand Current State — Khách hàng thực sự nhớ gì) */
  consumerSays?: string;
  /** Khoảng trống truyền thông & Mục tiêu dịch chuyển nhận thức (Communication Gap & Objective) */
  communicationGap?: string;
  /** Ý tưởng lớn xuyên suốt (Master Big Idea) */
  bigIdea?: string;
  /** Thông điệp trọng tâm (Key Message) */
  keyMessage?: string;
  /** Định hướng hình ảnh chủ đạo (Key Visual Direction: nhân vật, bối cảnh, tone màu, mood & feel) */
  keyVisualDirection?: string;
  /** Thành tựu, giải thưởng, báo chí & KOL lớn đã hợp tác (200–300 từ phục vụ Slide 3 Brief chuẩn) */
  achievements?: string[];
  /** Nỗi đau chính của khách hàng mục tiêu (Pain points) */
  painPoints?: string[];
  /** Rào cản khiến khách hàng ngần ngại chưa mua (Barriers to trial: giá, sợ kích ứng, nghi ngờ hiệu quả...) */
  barriersToTrial?: string[];
  /** Bằng chứng tin cậy (Reason to Believe: kiểm nghiệm lâm sàng, nguồn gốc nguyên liệu, số liệu thực tế...) */
  rtbs?: string[];
  /** Tuyến nội dung chủ đạo & góc tiếp cận hiệu quả (Content Pillars & Angles) */
  contentPillars?: string[];
  /** Đối thủ cạnh tranh trực tiếp (không nhắc tên / không xuất hiện cùng khung hình) */
  competitors?: string[];
  /** Phân tầng đối thủ theo khung Brand Communication Strategy (Tier A / Tier B / Tier C) */
  competitorTiers?: BrandCompetitorTiers;
}

export interface BrandEntity {
  companyName: string;
  taxCode: string;
  contactPerson: string;
  originCountry: string;
}

export type SampleStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PRE_ORDER';
export type SampleReturnRule = 'GIFT' | 'LOAN_RETURN';

export interface BrandProduct {
  id: string;
  name: string;
  skuCode: string;
  size: string;
  priceVnd?: number;
  /** Giá bán chiến dịch / Giá deal trên phiên Live */
  dealPriceVnd?: number;
  /** % Hoa hồng Affiliate tự nhiên (Organic) */
  commissionOrganicPct?: number;
  /** % Hoa hồng Affiliate khi chạy quảng cáo (Ads) */
  commissionAdsPct?: number;
  /** Trạng thái tồn kho hàng mẫu (Nếu OUT_OF_STOCK sẽ cảnh báo/chặn khi tạo Deal) */
  sampleStockStatus?: SampleStockStatus;
  /** Quy định hàng mẫu của SKU: Tặng luôn (GIFT) hay Cho mượn phải thu hồi (LOAN_RETURN) */
  sampleReturnRule?: SampleReturnRule;
  pdpUrl: string;
  usps: string[];
  mechanism: string;
  ingredients: string[];
  /** Hướng dẫn sử dụng chuẩn / Bước dùng trong Routine (liều lượng, thời điểm sáng/tối, lưu ý thao tác trên clip) */
  usageInstruction?: string;
  targetUser: string;
  contraindications: string;
}

export interface BannedPhrase { id: string; phrase: string; reason: string; replacement: string }
export interface PreferredPhrase { id: string; phrase: string; note: string }

export interface BrandContentRules {
  banned: BannedPhrase[];
  preferred: PreferredPhrase[];
  visualDo: string[];
  visualDont: string[];
  /** Hashtag bắt buộc gắn trên bài đăng */
  mandatoryHashtags?: string[];
  /** Tài khoản bắt buộc Tag / Mention */
  mandatoryMentions?: string[];
  /** Câu kêu gọi hành động (CTA) chuẩn của nhãn */
  defaultCta?: string;
  /** Quy định thời lượng video & thời điểm xuất hiện sản phẩm */
  videoDurationRule?: string;
  /** Quy định giá sàn truyền thông tối thiểu (Minimum Advertised Price) & các từ cấm nói về giá */
  minAdvertisedPriceRule?: string;
  /** Cơ chế khuyến mãi, ưu đãi combo / voucher & quà tặng chủ đạo KOC được phép truyền thông */
  keyPromotionMechanic?: string;
}

export type BrandProjectTier = 'TIER_A_STRATEGIC' | 'TIER_B_GROWTH' | 'TIER_C_FULLSTACK';
export type BrandOperatingModel = 'SPLIT_RESOURCE' | 'FULLSTACK_CONTENT_BOOKING';
export type StrategyOwnerTeam = 'BRAND_TEAM' | 'CONTENT_TEAM';
export type KocApprovalMode = 'ALL' | 'KL4_PLUS_ONLY' | 'NONE_AUTO';
export type SampleSenderType = 'UPBASE_WAREHOUSE' | 'BRAND_DIRECT';

/**
 * Cấu hình quy tắc vận hành, phê duyệt, hàng mẫu và bản quyền của nhãn hàng.
 * Thiết lập tại đây điều khiển trực tiếp luồng tạo Deal, gửi mẫu, duyệt kịch bản và nghiệm thu của nhân viên.
 */
export interface BrandWorkflowRules {
  /** Phân hạng dự án theo quy mô & bài toán (Tier A / B / C) */
  projectTier: BrandProjectTier;
  /** Mô hình phối hợp nguồn lực (Tách nguồn lực vs Full-stack Content x Booking) */
  operatingModel: BrandOperatingModel;
  /** Đơn vị giữ quyền Strategy Owner duyệt định hướng */
  strategyOwnerTeam: StrategyOwnerTeam;
  /** Đầu mối phê duyệt phía Nhãn hàng / Account */
  brandApproverName: string;

  /** Chế độ duyệt danh sách KOC: Duyệt toàn bộ (ALL), Tự duyệt KL1-KL3 chỉ trình KL4+ (KL4_PLUS_ONLY), hoặc Tự duyệt (NONE_AUTO) */
  kocApprovalMode: KocApprovalMode;
  /** Nhãn có bắt buộc duyệt kịch bản chữ (Script/Outline) trước khi quay không */
  requireScriptApproval: boolean;
  /** Nhãn có bắt buộc duyệt video Demo trước khi đăng bài không */
  requireDemoApproval: boolean;
  /** Số giờ chờ phản hồi tối đa trước khi KOC được phép tự đăng (VD: 72h theo SLA B2C; 0 = bắt buộc chờ duyệt) */
  autoAirAfterHours: number;
  /** Số vòng chỉnh sửa kịch bản/demo miễn phí tối đa (thường là 1 hoặc 2 vòng) */
  maxFreeRevisions: number;

  /** Đơn vị xuất kho gửi hàng mẫu (Kho UpBase gửi qua UpS hay Kho Nhãn tự gửi) */
  sampleSender: SampleSenderType;
  /** SLA chuẩn bị hàng mẫu từ khi có địa chỉ KOC (chuẩn: 48 giờ) */
  samplePrepSlaHours: number;
  /** Chính sách sở hữu hàng mẫu mặc định (Tặng luôn hay Cho mượn thu hồi) */
  defaultSamplePolicy: SampleReturnRule;

  /** Bắt buộc KOC cấp mã quảng cáo (Spark Ads / Partnership Ads) */
  requiresAdsCode: boolean;
  /** Thời hạn cấp mã quảng cáo mặc định (30 / 60 / 90 / 365 ngày) */
  adsCodeDurationDays: number;
  /** Bắt buộc KOC bàn giao file video gốc không logo (MP4/Raw) để gắn PDP/Reup */
  requireRawVideoHandover: boolean;
  /** Các kênh cho phép nhãn hàng đăng lại nội dung */
  repostAllowedChannels: string[];
  /** Thời gian tối thiểu KOC phải giữ video & giỏ hàng công khai (ngày; 999 = Vĩnh viễn) */
  minVideoRetentionDays: number;
  /** Số ngày độc quyền ngành hàng trước/sau ngày đăng (0 = Không yêu cầu độc quyền) */
  exclusivityDays: number;
  /** Cho phép tính phụ phí riêng cho mã Ads / đăng chéo (true) hay bắt buộc đàm phán trọn gói All-in (false) */
  allowExtraFeeForAdsOrCrosspost: boolean;

  /** Tệp KOC ưu tiên hợp tác của nhãn */
  preferredKocNiches: string[];
  /** Tiêu chí chọn và loại trừ KOC của nhãn */
  kocSelectionCriteria: string;
  /** Yêu cầu nhân khẩu học khán giả của kênh KOC (VD: Nữ >= 70%, độ tuổi 18–34 tại VN) */
  targetAudienceDemographics?: string;
  /** Yêu cầu hình ảnh, đặc điểm ngoại hình/làn da & bối cảnh quay của KOC */
  kocPersonaAndVisualCriteria?: string;
  /** Danh sách KOC / kênh bị nhãn hàng từ chối hợp tác lại (Blacklist riêng của nhãn) */
  blacklistedKocs?: string[];

  /** Thông tin bàn giao & bộ file gốc từ Danh sách file brand (3.5) */
  handoverFrom?: string;
  handoverTo?: string;
  handoverFileUrl?: string;
  bookingSheetUrl?: string;
  operationFileUrl?: string;
  canvaBriefUrl?: string;
}

export interface BrandFaq { id: string; question: string; answer: string; mention: string[]; avoid: string[] }

export type BrandFileStorage = 'R2' | 'LOCAL' | 'LINK';

export interface BrandLegalDoc {
  id: string;
  title: string;
  docNumber: string;
  authority: string;
  issueDate: string;
  validUntil: string;
  disclaimer: string;
  url: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storage?: BrandFileStorage;
}

export interface BrandRatecardRow { grade: string; maxBudget?: number }

export type BrandDocCategory = 'GUIDELINE' | 'LEGAL' | 'PRODUCT' | 'BRIEF' | 'ASSET' | 'OTHER';
export interface BrandDocument {
  id: string;
  title: string;
  category: BrandDocCategory;
  url: string;
  note: string;
  /** Tóm tắt nội dung cốt lõi / quy định chính bên trong tài liệu đính kèm */
  extractedContent?: string;
  addedBy: string;
  addedAt: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storage?: BrandFileStorage;
}

export interface BrandHistoryEntry { at: string; actorName: string; section: BrandSection; summary: string }

export interface BrandProfile {
  key: string;
  brandName: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  positioning?: BrandPositioning;
  entity?: BrandEntity;
  workflowRules?: BrandWorkflowRules;
  products: BrandProduct[];
  contentRules?: BrandContentRules;
  faqs: BrandFaq[];
  legal: BrandLegalDoc[];
  ratecard: BrandRatecardRow[];
  documents: BrandDocument[];
  history: BrandHistoryEntry[];
}

export type BrandSection =
  | 'POSITIONING'
  | 'ENTITY'
  | 'WORKFLOW_RULES'
  | 'PRODUCTS'
  | 'CONTENT_RULES'
  | 'FAQS'
  | 'LEGAL'
  | 'RATECARD'
  | 'DOCUMENTS';

export const SECTION_LABEL: Record<BrandSection, string> = {
  POSITIONING: 'Định vị & chiến lược nội dung',
  ENTITY: 'Pháp nhân',
  WORKFLOW_RULES: 'Quy tắc vận hành & phê duyệt',
  PRODUCTS: 'Sản phẩm chủ lực',
  CONTENT_RULES: 'Quy chuẩn nội dung',
  FAQS: 'Câu hỏi khó',
  LEGAL: 'Pháp lý',
  RATECARD: 'Trần thù lao',
  DOCUMENTS: 'Tài liệu',
};

/** Quyền sửa từng mục của người đang xem, do máy chủ tính. */
export type BrandPermissions = Record<BrandSection, boolean>;

/** Khóa nhãn từ tên: bỏ dấu, viết thường, nối bằng gạch ngang. */
export function brandKey(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function emptyProfile(brandName: string): BrandProfile {
  return { key: brandKey(brandName), brandName, revision: 0, updatedAt: '', updatedBy: '', products: [], faqs: [], legal: [], ratecard: [], documents: [], history: [] };
}
