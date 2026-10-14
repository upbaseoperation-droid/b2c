// ============================================================================
// CẤU HÌNH KẾT NỐI API (GOOGLE GEMINI, OPENAI CHATGPT, ANTHROPIC CLAUDE)
// & ĐIỀU PHỐI CÔNG CỤ THEO MỤC ĐÍCH NGHIỆP VỤ B2C
// ============================================================================

export type ApiProviderId = 'GOOGLE' | 'OPENAI' | 'CLAUDE' | 'INTERNAL';

export type OperationalApiPurposeId =
  | 'LEGAL_OCR'
  | 'SCRIPT_REVIEW'
  | 'CONTRACT_DRAFTING'
  | 'STAFF_REVIEW'
  | 'PLAN_ADS_ANALYSIS'
  | 'KOC_MATCHING'
  | 'KNOWLEDGE_QA';

export interface ApiModelOption {
  id: string;
  label: string;
  badge: string;
  description: string;
  supportsVision?: boolean;
  recommendedFor?: OperationalApiPurposeId[];
  inputCostPerMillionUsd: number; // Giá USD trên 1 triệu token đầu vào (Prompt)
  outputCostPerMillionUsd: number; // Giá USD trên 1 triệu token đầu ra (Completion)
  contextWindowTokens: number; // Độ dài ngữ cảnh tối đa (tokens)
}

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ExecutionCostReport {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costVnd: number;
  ratePromptPerMillionUsd: number;
  rateCompletionPerMillionUsd: number;
  promptCostUsd: number;
  completionCostUsd: number;
}

export interface ApiUsageLogItem {
  id: string;
  timestamp: string; // ISO
  purposeId: OperationalApiPurposeId;
  purposeTitle: string;
  provider: ApiProviderId;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costVnd: number;
  latencyMs: number;
  status: 'SUCCESS' | 'FALLBACK' | 'ERROR';
  errorMessage?: string;
  source?: 'PLAYGROUND' | 'STAFF_REVIEW' | 'LEGAL_OCR' | 'SCRIPT_REVIEW' | 'CONTRACT' | 'PLAN' | 'TEST';
}

export const USD_TO_VND_RATE = 25450; // Tỷ giá quy đổi chuẩn USD -> VNĐ

export interface ProviderConfigItem {
  providerId: Exclude<ApiProviderId, 'INTERNAL'>;
  name: string;
  shortName: string;
  company: string;
  enabled: boolean;
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  organizationId?: string;
  monthlyBudgetLimitUsd: number;
  estimatedUsedUsd: number;
  timeoutSeconds: number;
  lastTestedAt?: string;
  lastTestStatus?: 'UNTESTED' | 'CONNECTED' | 'ERROR';
  lastTestLatencyMs?: number;
  lastTestMessage?: string;
  notes?: string;
}

export interface SavedNamedApiKey {
  id: string;
  label: string; // VD: "Key Google - Đọc CCCD Hợp đồng", "Key Claude - Team Content"
  providerId: Exclude<ApiProviderId, 'INTERNAL'>;
  apiKey: string;
  defaultModel: string;
  departmentScope: 'ALL' | 'MARKETING_B2C' | 'CONTENT' | 'BOOKING' | 'GROWTH_ADS' | 'ACCOUNTING_LEGAL';
  createdAt: string;
  lastUsedAt?: string;
  notes?: string;
}

export interface PurposeRoutingRule {
  purposeId: OperationalApiPurposeId;
  title: string;
  departmentTag: string;
  usedInScreens: string[];
  description: string;
  primaryProvider: ApiProviderId;
  primaryModel: string;
  /** Nếu chọn khóa riêng từ Kho khóa (SavedNamedApiKey.id) hoặc để trống dùng khóa mặc định của Nhà cung cấp */
  namedKeyId?: string;
  /** Hoặc nhập trực tiếp một khóa API riêng cho mục đích này */
  customApiKeyOverride?: string;
  fallbackProvider: ApiProviderId;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  systemInstruction: string;
  sampleInputText: string;
}

export interface ApiWorkspaceConfigState {
  providers: Record<Exclude<ApiProviderId, 'INTERNAL'>, ProviderConfigItem>;
  namedKeys: SavedNamedApiKey[];
  purposeRoutes: Record<OperationalApiPurposeId, PurposeRoutingRule>;
  updatedAt: string;
}

export const PROVIDER_MODELS_CATALOG: Record<ApiProviderId, ApiModelOption[]> = {
  GOOGLE: [
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      badge: 'Khuyên dùng · Đa năng',
      description: 'Đọc ảnh giấy tờ CCCD/ĐKKD chính xác, tốc độ phản hồi nhanh và tiết kiệm chi phí.',
      supportsVision: true,
      recommendedFor: ['LEGAL_OCR', 'KOC_MATCHING', 'STAFF_REVIEW'],
      inputCostPerMillionUsd: 0.075,
      outputCostPerMillionUsd: 0.30,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      badge: 'Phân tích sâu',
      description: 'Cửa sổ ngữ cảnh lớn, phù hợp đối soát bảng kế hoạch tháng 69 gian hàng và hợp đồng dài.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 1.25,
      outputCostPerMillionUsd: 5.00,
      contextWindowTokens: 2_000_000,
    },
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      badge: 'Tốc độ cao',
      description: 'Phản hồi tức thì cho các tác vụ trích xuất thông tin và kiểm tra nhanh.',
      supportsVision: true,
      inputCostPerMillionUsd: 0.10,
      outputCostPerMillionUsd: 0.40,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-1.5-flash',
      label: 'Gemini 1.5 Flash',
      badge: 'Ổn định',
      description: 'Tương thích rộng với các luồng xử lý văn bản và nhận xét định kỳ.',
      supportsVision: true,
      inputCostPerMillionUsd: 0.075,
      outputCostPerMillionUsd: 0.30,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro',
      badge: 'Ngữ cảnh 2M',
      description: 'Đọc tài liệu pháp lý nhiều trang và tổng hợp dữ liệu lịch sử KOC.',
      supportsVision: true,
      inputCostPerMillionUsd: 1.25,
      outputCostPerMillionUsd: 5.00,
      contextWindowTokens: 2_000_000,
    },
  ],
  OPENAI: [
    {
      id: 'gpt-4o',
      label: 'ChatGPT-4o (Omni)',
      badge: 'Khuyên dùng · Chuẩn xác',
      description: 'Xử lý cả văn bản, bảng số liệu và hình ảnh. Rất mạnh khi đối soát ngân sách và báo cáo Ads.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'SCRIPT_REVIEW', 'LEGAL_OCR'],
      inputCostPerMillionUsd: 2.50,
      outputCostPerMillionUsd: 10.00,
      contextWindowTokens: 128_000,
    },
    {
      id: 'gpt-4o-mini',
      label: 'ChatGPT-4o Mini',
      badge: 'Tiết kiệm · Nhanh',
      description: 'Chi phí thấp, tốc độ nhanh, phù hợp đánh giá nhân sự 4P, kiểm tra SLA hàng ngày.',
      supportsVision: true,
      recommendedFor: ['STAFF_REVIEW', 'KOC_MATCHING'],
      inputCostPerMillionUsd: 0.15,
      outputCostPerMillionUsd: 0.60,
      contextWindowTokens: 128_000,
    },
    {
      id: 'o3-mini',
      label: 'OpenAI o3-mini (Reasoning)',
      badge: 'Tính toán số liệu',
      description: 'Chuyên suy luận logic, kiểm tra chênh lệch ngân sách Gross/Net, CIR, ROAS và P&L.',
      supportsVision: false,
      recommendedFor: ['PLAN_ADS_ANALYSIS'],
      inputCostPerMillionUsd: 1.10,
      outputCostPerMillionUsd: 4.40,
      contextWindowTokens: 200_000,
    },
    {
      id: 'gpt-4.1',
      label: 'GPT-4.1',
      badge: 'Bám sát quy tắc',
      description: 'Tuân thủ chặt chẽ cấu trúc JSON và danh sách quy định từ cấm của nhãn hàng.',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 8.00,
      contextWindowTokens: 128_000,
    },
  ],
  CLAUDE: [
    {
      id: 'claude-3-7-sonnet-20250219',
      label: 'Claude 3.7 Sonnet',
      badge: 'Khuyên dùng · Ngôn từ tự nhiên',
      description: 'Biên tập kịch bản video KOC tự nhiên, rà soát từ cấm tinh tế và soạn điều khoản hợp đồng chặt chẽ.',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 3.00,
      outputCostPerMillionUsd: 15.00,
      contextWindowTokens: 200_000,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      label: 'Claude 3.5 Sonnet',
      badge: 'Biên tập & Pháp chế',
      description: 'Viết lại Hook 3s đầu, lời thoại KOC theo đúng giọng văn nhãn hàng (Mẹ bỉm, Chuyên gia da liễu).',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'CONTRACT_DRAFTING', 'KOC_MATCHING'],
      inputCostPerMillionUsd: 3.00,
      outputCostPerMillionUsd: 15.00,
      contextWindowTokens: 200_000,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku',
      badge: 'Phản hồi nhanh',
      description: 'Kiểm tra nhanh lỗi chính tả, từ nhạy cảm và tóm tắt trao đổi trong sổ kế hoạch tháng.',
      supportsVision: false,
      recommendedFor: ['STAFF_REVIEW'],
      inputCostPerMillionUsd: 0.80,
      outputCostPerMillionUsd: 4.00,
      contextWindowTokens: 200_000,
    },
  ],
  INTERNAL: [
    {
      id: 'upbase-local-engine',
      label: 'Bộ quy tắc & Tesseract nội bộ',
      badge: '0đ · Không cần mạng',
      description: 'Chạy trực tiếp trên máy chủ nội bộ: đọc ảnh CCCD bằng Tesseract và quét từ cấm theo từ điển nhãn hàng.',
      supportsVision: true,
      inputCostPerMillionUsd: 0.0,
      outputCostPerMillionUsd: 0.0,
      contextWindowTokens: 64_000,
    },
  ],
};

export const PROVIDER_META: Record<
  ApiProviderId,
  {
    name: string;
    shortName: string;
    badgeClass: string;
    borderClass: string;
    keyPlaceholder: string;
    keyPrefixHint: string;
    docsUrl: string;
    docsLabel: string;
    defaultEndpoint: string;
    strengthsSummary: string;
  }
> = {
  GOOGLE: {
    name: 'Google (Gemini API)',
    shortName: 'Google Gemini',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-blue-300',
    keyPlaceholder: 'AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    keyPrefixHint: 'Bắt đầu bằng AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Lấy khóa tại Google AI Studio',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    strengthsSummary: 'Đọc ảnh CCCD/ĐKKD, xử lý bảng dữ liệu lớn 69 gian hàng, tốc độ nhanh.',
  },
  OPENAI: {
    name: 'OpenAI (ChatGPT API)',
    shortName: 'ChatGPT (OpenAI)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-300',
    keyPlaceholder: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    keyPrefixHint: 'Bắt đầu bằng sk-... hoặc sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'Lấy khóa tại OpenAI Platform',
    defaultEndpoint: 'https://api.openai.com/v1',
    strengthsSummary: 'Đối soát số liệu kế hoạch tháng, phân tích báo cáo Ads ROAS/GMV, chấm điểm nhân sự 4P.',
  },
  CLAUDE: {
    name: 'Anthropic (Claude API)',
    shortName: 'Claude (Anthropic)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    borderClass: 'border-amber-300',
    keyPlaceholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    keyPrefixHint: 'Bắt đầu bằng sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Lấy khóa tại Anthropic Console',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    strengthsSummary: 'Rà soát từ cấm & viết lại kịch bản KOC tự nhiên, soạn thảo hợp đồng & phụ lục pháp chế.',
  },
  INTERNAL: {
    name: 'Xử lý nội bộ (Mặc định)',
    shortName: 'Nội bộ (Offline)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    borderClass: 'border-slate-300',
    keyPlaceholder: 'Không cần nhập khóa API',
    keyPrefixHint: 'Chạy sẵn trên máy chủ',
    docsUrl: '#',
    docsLabel: 'Tích hợp sẵn',
    defaultEndpoint: 'local://upbase-engine',
    strengthsSummary: 'Hoạt động ngay cả khi chưa nhập API Key hoặc khi kết nối ngoài gián đoạn.',
  },
};

export const INITIAL_API_WORKSPACE_CONFIG: ApiWorkspaceConfigState = {
  providers: {
    GOOGLE: {
      providerId: 'GOOGLE',
      name: 'Google (Gemini API)',
      shortName: 'Google Gemini',
      company: 'Google DeepMind / Google Cloud',
      enabled: true,
      apiKey: '',
      defaultModel: 'gemini-2.5-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      monthlyBudgetLimitUsd: 50,
      estimatedUsedUsd: 4.2,
      timeoutSeconds: 20,
      lastTestStatus: 'UNTESTED',
      notes: 'Dùng chính cho đọc ảnh CCCD/ĐKKD tạo hợp đồng và sàng lọc danh bạ KOC.',
    },
    OPENAI: {
      providerId: 'OPENAI',
      name: 'OpenAI (ChatGPT API)',
      shortName: 'ChatGPT (OpenAI)',
      company: 'OpenAI',
      enabled: true,
      apiKey: '',
      defaultModel: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      organizationId: '',
      monthlyBudgetLimitUsd: 100,
      estimatedUsedUsd: 12.8,
      timeoutSeconds: 25,
      lastTestStatus: 'UNTESTED',
      notes: 'Dùng chính cho đối soát kế hoạch tháng (Gross/Net), báo cáo Ads tuần và đánh giá nhân sự 4P.',
    },
    CLAUDE: {
      providerId: 'CLAUDE',
      name: 'Anthropic (Claude API)',
      shortName: 'Claude (Anthropic)',
      company: 'Anthropic',
      enabled: true,
      apiKey: '',
      defaultModel: 'claude-3-7-sonnet-20250219',
      baseUrl: 'https://api.anthropic.com/v1',
      monthlyBudgetLimitUsd: 80,
      estimatedUsedUsd: 9.5,
      timeoutSeconds: 25,
      lastTestStatus: 'UNTESTED',
      notes: 'Dùng chính cho rà soát từ cấm, biên tập kịch bản video KOC và soạn điều khoản hợp đồng.',
    },
  },
  namedKeys: [
    {
      id: 'nk-google-legal',
      label: 'Key Google — Đọc ảnh CCCD & Pháp chế',
      providerId: 'GOOGLE',
      apiKey: '',
      defaultModel: 'gemini-2.5-flash',
      departmentScope: 'ACCOUNTING_LEGAL',
      createdAt: '2026-10-01',
      notes: 'Khóa riêng phục vụ đọc ảnh giấy tờ KOC/CTV tại màn Hợp đồng.',
    },
    {
      id: 'nk-claude-content',
      label: 'Key Claude — Team Content & Duyệt Kịch Bản',
      providerId: 'CLAUDE',
      apiKey: '',
      defaultModel: 'claude-3-7-sonnet-20250219',
      departmentScope: 'CONTENT',
      createdAt: '2026-10-02',
      notes: 'Khóa riêng cho đội Content kiểm duyệt kịch bản 4 phần và viết lại câu mở đầu.',
    },
    {
      id: 'nk-openai-growth',
      label: 'Key ChatGPT — Đối soát Plan 4.1 & Báo cáo Ads',
      providerId: 'OPENAI',
      apiKey: '',
      defaultModel: 'gpt-4o',
      departmentScope: 'GROWTH_ADS',
      createdAt: '2026-10-03',
      notes: 'Khóa riêng cho Trưởng phòng & Growth đối soát hạn mức Order Net và ROAS.',
    },
  ],
  purposeRoutes: {
    LEGAL_OCR: {
      purposeId: 'LEGAL_OCR',
      title: '1. Đọc ảnh giấy tờ & CCCD (Tạo hợp đồng)',
      departmentTag: 'Pháp chế & Booking',
      usedInScreens: ['Hợp đồng & thanh toán', 'Danh bạ KOC', 'Danh bạ CTV / VJ'],
      description:
        'Bóc tách số CCCD 12 số, họ tên, ngày sinh, nơi thường trú, mã số thuế từ ảnh chụp CCCD / ĐKKD để điền tự động vào mẫu hợp đồng.',
      primaryProvider: 'GOOGLE',
      primaryModel: 'gemini-2.5-flash',
      fallbackProvider: 'INTERNAL',
      fallbackModel: 'upbase-local-engine',
      temperature: 0.1,
      maxTokens: 1500,
      systemInstruction:
        'Trích xuất chính xác thông tin trên Căn cước công dân (12 chữ số) hoặc Giấy phép ĐKKD (Mã số thuế, tên doanh nghiệp, người đại diện). Trả về JSON đúng trường để điền hợp đồng, không suy đoán thông tin bị mờ.',
      sampleInputText:
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nCĂN CƯỚC CÔNG DÂN\nSố / No: 001199012345\nHọ và tên / Full name: NGUYỄN THỊ MAI ANH\nNgày sinh / Date of birth: 15/08/1999\nGiới tính: Nữ | Quốc tịch: Việt Nam\nNơi thường trú: Số 18 Ngõ 45 Thái Hà, Phường Trung Liệt, Quận Đống Đa, Thành phố Hà Nội\nNgày cấp: 10/05/2022 tại Cục Cảnh sát QLHC về TTXH.',
    },
    SCRIPT_REVIEW: {
      purposeId: 'SCRIPT_REVIEW',
      title: '2. Rà soát từ cấm & Biên tập kịch bản video',
      departmentTag: 'Content & Brand',
      usedInScreens: ['Kịch bản & video', 'Góc nội dung', 'Duyệt với nhãn hàng'],
      description:
        'Kiểm tra từ cấm theo Hồ sơ thương hiệu, câu khuyến cáo pháp lý bắt buộc, chấm điểm bố cục 4 phần (Mở đầu, Nỗi đau, Giải pháp, Kêu gọi mua hàng) và gợi ý bản viết lại.',
      primaryProvider: 'CLAUDE',
      primaryModel: 'claude-3-7-sonnet-20250219',
      fallbackProvider: 'OPENAI',
      fallbackModel: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 2000,
      systemInstruction:
        'Bạn là Trưởng nhóm Kiểm duyệt Nội dung B2C tại Upbase. Hãy rà soát kịch bản video của KOC đối chiếu với danh sách từ cấm của nhãn hàng (VD: "trị dứt điểm", "cam kết 100%", "thuốc đặc trị"), kiểm tra câu khuyến cáo pháp lý và gợi ý cách viết lại tự nhiên, giữ đúng giọng văn của KOC.',
      sampleInputText:
        'Nhãn hàng: Kutieskin Mama & Baby\nTừ cấm quy định: "trị dứt điểm", "chữa khỏi hoàn toàn", "corticoide", "thuốc đặc trị".\nKịch bản KOC gửi duyệt:\n- Mở đầu (3s): Mẹ nào có bé bị chàm sữa mãn tính bôi gì cũng không khỏi thì dùng ngay tuýp thuốc đặc trị Kutieskin này nhé!\n- Thân bài: Kem này cam kết trị dứt điểm 100% vết ngứa đỏ chỉ sau 1 đêm.\n- Kêu gọi: Bấm vào giỏ hàng góc trái mua ngay nhé các mẹ!',
    },
    CONTRACT_DRAFTING: {
      purposeId: 'CONTRACT_DRAFTING',
      title: '3. Soạn hợp đồng & Rà soát điều khoản pháp lý',
      departmentTag: 'Pháp chế & Kế toán',
      usedInScreens: ['Hợp đồng & thanh toán'],
      description:
        'Soạn thảo phụ lục hợp đồng dịch vụ KOC/Brand, kiểm tra điều khoản phạt vi phạm SLA, khấu trừ thuế TNCN 10% và thời hạn cấp mã Spark Ads.',
      primaryProvider: 'CLAUDE',
      primaryModel: 'claude-3-7-sonnet-20250219',
      fallbackProvider: 'GOOGLE',
      fallbackModel: 'gemini-2.5-pro',
      temperature: 0.2,
      maxTokens: 2500,
      systemInstruction:
        'Rà soát chặt chẽ các điều khoản thương mại trong hợp đồng KOC B2C: tách rõ đơn giá Gross và số tiền thực nhận Net sau khi khấu trừ 10% thuế TNCN (đối với khoản chi từ 2.000.000đ trở lên), quy định rõ hạn nộp video nháp trong 5 ngày từ khi nhận mẫu và nghĩa vụ cấp mã Spark Ads tối thiểu 30 ngày.',
      sampleInputText:
        'Soạn điều khoản thanh toán và nghĩa vụ bàn giao cho Hợp đồng Booking KOC:\n- KOC: Chloe Nguyễn (@chloenguyen) - Khung lương KL6\n- Nhãn hàng: ClubClio TikTok Shop\n- Số lượng đầu ra: 02 Video TikTok 60s + Cấp mã Spark Ads 30 ngày\n- Tổng giá trị hợp đồng (Gross): 15.000.000 VNĐ (Tạm ứng 50% sau khi duyệt kịch bản, quyết toán 50% sau khi nghiệm thu bài đăng).',
    },
    STAFF_REVIEW: {
      purposeId: 'STAFF_REVIEW',
      title: '4. Đánh giá tiến độ, SLA & Hiệu suất nhân sự 4P',
      departmentTag: 'Quản lý & Nhân sự',
      usedInScreens: ['Đánh giá 4P', 'Phân bổ & điều phối', 'Tiến độ, SLA & Nhân sự'],
      description:
        'Tổng hợp tỷ lệ lấp đầy slot W1-W4, tỷ lệ đúng hạn SLA, điểm khối lượng việc P3 theo độ khó gian hàng và soạn lời phê / tin nhắn nhắc việc Lark cho Trưởng phòng.',
      primaryProvider: 'OPENAI',
      primaryModel: 'gpt-4o-mini',
      fallbackProvider: 'GOOGLE',
      fallbackModel: 'gemini-2.5-flash',
      temperature: 0.2,
      maxTokens: 1500,
      systemInstruction:
        'Đánh giá khách quan hiệu suất chuyên viên phòng B2C dựa trên số liệu thực tế: tỷ lệ lấp đầy video tuần W1-W4, tỷ lệ đúng hạn SLA và điểm khối lượng việc 4P. Đưa ra gợi ý trao đổi 1-on-1 cụ thể và viết sẵn lời phê ngắn gọn cho Trưởng phòng Đặng Thị Yến Nhi.',
      sampleInputText:
        'Nhân sự: Lê Phương Thảo (Chuyên viên Booking B2C)\nGian hàng phụ trách: ClubClio TikTok, Rejuran (Hệ số độ khó x1.4)\nTiến độ tháng 10/2026: Đã lên sóng 24/28 video (85.7%), giải ngân 42.500.000đ / 50.000.000đ ngân sách Net.\nTỷ lệ đúng hạn SLA: 94.2% (Phát sinh 1 ca KOC nộp video nháp trễ 12h ở tuần W3).',
    },
    PLAN_ADS_ANALYSIS: {
      purposeId: 'PLAN_ADS_ANALYSIS',
      title: '5. Đối soát Kế hoạch tháng, Ngân sách Net & Báo cáo Ads',
      departmentTag: 'Growth, Media & Kế toán',
      usedInScreens: ['Kế hoạch tháng', 'Báo cáo Ads tuần', 'Dashboard Quản Trị B2C'],
      description:
        'Phân tích chênh lệch hạn mức Order Gross/Net (File 4.1) với thực chi (File 3.2), cảnh báo vượt trần ngân sách gian hàng và phân tích chỉ số ROAS, GMV từ báo cáo TikTok Seller.',
      primaryProvider: 'OPENAI',
      primaryModel: 'gpt-4o',
      fallbackProvider: 'GOOGLE',
      fallbackModel: 'gemini-2.5-pro',
      temperature: 0.1,
      maxTokens: 2000,
      systemInstruction:
        'Bạn là Chuyên gia Đối soát Tài chính & Kế hoạch B2C. Luôn tách bạch Chi phí Gross và Chi phí Net (Kế toán kiểm soát theo hạn mức Net), tách rõ Video KOC trả phí (Paid) và suất gửi mẫu 0đ (FOC). Cảnh báo ngay các gian hàng vượt trần Order Net hoặc chi tiêu khi hạn mức bằng 0đ.',
      sampleInputText:
        'Đối soát ngân sách tháng 10/2026:\n1. Gian hàng Kutieskin TikTok Shop: Hạn mức Order Net = 85.000.000đ | Thực chi duyệt chi = 92.400.000đ | Video Paid = 32/30 video | Video FOC = 45 video (0đ).\n2. Gian hàng Bye Bye Blemish TikTok: Hạn mức Order Net = 0đ | Thực chi phát sinh = 14.500.000đ (6 video KL2-KL3).\n3. Gian hàng Senka Official: Hạn mức Order Net = 60.000.000đ | Thực chi = 21.000.000đ (Tuần W3 mới đạt 35% tiến độ giải ngân).',
    },
    KOC_MATCHING: {
      purposeId: 'KOC_MATCHING',
      title: '6. Sàng lọc & Đề xuất danh sách KOC theo Nhãn hàng',
      departmentTag: 'Booking & Listing',
      usedInScreens: ['Đề xuất KOC', 'Booking', 'Hồ sơ thương hiệu'],
      description:
        'Đối chiếu định vị nhãn hàng, sản phẩm chủ lực (SKU) và ngân sách được giao để gợi ý cơ cấu KOC theo khung lương (KL1–KL7) và tệp kênh phù hợp cho đợt Listing ngày 10-20-30.',
      primaryProvider: 'GOOGLE',
      primaryModel: 'gemini-2.5-flash',
      fallbackProvider: 'CLAUDE',
      fallbackModel: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      maxTokens: 1800,
      systemInstruction:
        'Dựa trên ngân sách Order Net của gian hàng và định vị thương hiệu, hãy đề xuất tỷ trọng phân bổ số lượng KOC theo khung lương chuẩn Upbase (TAP 0đ, KL1 <500k, KL2 500k-1.5M, KL3 1.5M-3M, KL4 3M-5M, KL5 5M-10M) và chọn tệp kênh trong 25 tệp chuẩn (Mẹ bé, Bác sỹ/chuyên gia, Review Nữ, Unboxing...) để tối ưu CIR và GMV.',
      sampleInputText:
        'Nhãn hàng: La Roche-Posay Vietnam Official (Ngành Dược mỹ phẩm - Tone Bác sĩ / Chuyên gia da liễu)\nSản phẩm đẩy: Kem dưỡng phục hồi Cicaplast Baume B5+\nNgân sách Order Net giao tháng 10: 45.000.000 VNĐ\nMục tiêu cam kết: Tối thiểu 25 video lên sóng (bao gồm cả Paid KOC và FOC), tỷ lệ chi phí CIR mục tiêu <= 18%.',
    },
    KNOWLEDGE_QA: {
      purposeId: 'KNOWLEDGE_QA',
      title: '7. Hỏi đáp quy trình & Tra cứu sổ tay Marketing B2C',
      departmentTag: 'Toàn phòng B2C',
      usedInScreens: ['Sổ tay & Hỏi đáp'],
      description:
        'Tra cứu quy trình Booking 42 bước, Livestream 28 bước, 21 mốc SLA, 8 mẫu hợp đồng pháp chế, cách tính thuế TNCN 10% / HKD 7%, khung lương KL1–KL7 và 15 trụ cột nội dung.',
      primaryProvider: 'GOOGLE',
      primaryModel: 'gemini-2.5-flash',
      fallbackProvider: 'INTERNAL',
      fallbackModel: 'upbase-local-engine',
      temperature: 0.15,
      maxTokens: 2000,
      systemInstruction:
        'Bạn là Cố vấn Nghiệp vụ & Sổ tay Quy trình Phòng Marketing B2C tại Upbase. Trả lời ngắn gọn, thẳng thắn, đúng số liệu SLA, mẫu hợp đồng (1.1.1 đến 4.2), khung lương (KL1-KL7), chính sách thuế (TNCN 10% từ 2M, HKD 7%, VAT 8%/10%) và cơ cấu nhân sự phòng B2C.',
      sampleInputText:
        'KOC cá nhân chốt giá thực nhận Net là 4.500.000đ thì trên hợp đồng ghi giá Gross bao nhiêu, khấu trừ thuế thế nào và dùng mẫu hợp đồng số mấy?',
    },
  },
  updatedAt: '2026-10-14T10:30:00.000Z',
};

const STORAGE_KEY = 'upbase_b2c_api_workspace_config_v1';
export const API_CONFIG_UPDATED_EVENT = 'upbase-api-config-updated';

export function loadApiWorkspaceConfig(): ApiWorkspaceConfigState {
  if (typeof window === 'undefined') {
    return INITIAL_API_WORKSPACE_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_API_WORKSPACE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ApiWorkspaceConfigState>;
    return {
      providers: {
        GOOGLE: { ...INITIAL_API_WORKSPACE_CONFIG.providers.GOOGLE, ...(parsed.providers?.GOOGLE || {}) },
        OPENAI: { ...INITIAL_API_WORKSPACE_CONFIG.providers.OPENAI, ...(parsed.providers?.OPENAI || {}) },
        CLAUDE: { ...INITIAL_API_WORKSPACE_CONFIG.providers.CLAUDE, ...(parsed.providers?.CLAUDE || {}) },
      },
      namedKeys: Array.isArray(parsed.namedKeys) ? parsed.namedKeys : INITIAL_API_WORKSPACE_CONFIG.namedKeys,
      purposeRoutes: {
        LEGAL_OCR: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.LEGAL_OCR,
          ...(parsed.purposeRoutes?.LEGAL_OCR || {}),
        },
        SCRIPT_REVIEW: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.SCRIPT_REVIEW,
          ...(parsed.purposeRoutes?.SCRIPT_REVIEW || {}),
        },
        CONTRACT_DRAFTING: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.CONTRACT_DRAFTING,
          ...(parsed.purposeRoutes?.CONTRACT_DRAFTING || {}),
        },
        STAFF_REVIEW: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.STAFF_REVIEW,
          ...(parsed.purposeRoutes?.STAFF_REVIEW || {}),
        },
        PLAN_ADS_ANALYSIS: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.PLAN_ADS_ANALYSIS,
          ...(parsed.purposeRoutes?.PLAN_ADS_ANALYSIS || {}),
        },
        KOC_MATCHING: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.KOC_MATCHING,
          ...(parsed.purposeRoutes?.KOC_MATCHING || {}),
        },
        KNOWLEDGE_QA: {
          ...INITIAL_API_WORKSPACE_CONFIG.purposeRoutes.KNOWLEDGE_QA,
          ...(parsed.purposeRoutes?.KNOWLEDGE_QA || {}),
        },
      },
      updatedAt: parsed.updatedAt || INITIAL_API_WORKSPACE_CONFIG.updatedAt,
    };
  } catch (err) {
    console.warn('Could not load API workspace config from localStorage:', err);
    return INITIAL_API_WORKSPACE_CONFIG;
  }
}

export function saveApiWorkspaceConfig(config: ApiWorkspaceConfigState): void {
  if (typeof window === 'undefined') return;
  try {
    const updated: ApiWorkspaceConfigState = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(API_CONFIG_UPDATED_EVENT, { detail: updated }));
  } catch (err) {
    console.warn('Could not save API workspace config to localStorage:', err);
  }
}

export function maskApiKey(key?: string): string {
  if (!key || !key.trim()) return 'Chưa thiết lập khóa';
  const clean = key.trim();
  if (clean.length <= 10) return '••••••••';
  return `${clean.slice(0, 7)}••••••••••••${clean.slice(-4)}`;
}

/**
 * Lấy cấu hình kết nối thực tế (Provider, Model, API Key, Fallback) cho một mục đích nghiệp vụ cụ thể
 */
export function getEffectiveConfigForPurpose(
  purposeId: OperationalApiPurposeId,
  configState?: ApiWorkspaceConfigState
): {
  purpose: PurposeRoutingRule;
  primaryProvider: ApiProviderId;
  primaryModel: string;
  primaryApiKey: string;
  primaryBaseUrl?: string;
  keySourceLabel: string;
  fallbackProvider: ApiProviderId;
  fallbackModel: string;
  fallbackApiKey: string;
  hasActiveExternalKey: boolean;
} {
  const cfg = configState || loadApiWorkspaceConfig();
  const route = cfg.purposeRoutes[purposeId] || INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[purposeId];

  let primaryApiKey = '';
  let primaryBaseUrl: string | undefined = undefined;
  let keySourceLabel = 'Xử lý nội bộ (Không dùng khóa ngoài)';

  if (route.primaryProvider !== 'INTERNAL') {
    const prov = cfg.providers[route.primaryProvider];
    primaryBaseUrl = prov?.baseUrl;

    if (route.customApiKeyOverride && route.customApiKeyOverride.trim()) {
      primaryApiKey = route.customApiKeyOverride.trim();
      keySourceLabel = 'Khóa riêng gắn trực tiếp cho nghiệp vụ này';
    } else if (route.namedKeyId) {
      const foundNamed = cfg.namedKeys.find(k => k.id === route.namedKeyId);
      if (foundNamed && foundNamed.apiKey.trim()) {
        primaryApiKey = foundNamed.apiKey.trim();
        keySourceLabel = `Kho khóa: ${foundNamed.label}`;
      } else if (prov?.apiKey?.trim()) {
        primaryApiKey = prov.apiKey.trim();
        keySourceLabel = `Khóa mặc định ${prov.shortName}`;
      } else {
        keySourceLabel = `Chưa nhập khóa cho ${prov?.shortName || route.primaryProvider}`;
      }
    } else if (prov?.apiKey?.trim()) {
      primaryApiKey = prov.apiKey.trim();
      keySourceLabel = `Khóa mặc định ${prov.shortName}`;
    } else {
      keySourceLabel = `Chưa nhập khóa cho ${prov?.shortName || route.primaryProvider}`;
    }
  }

  let fallbackApiKey = '';
  if (route.fallbackProvider !== 'INTERNAL') {
    const fbProv = cfg.providers[route.fallbackProvider];
    fallbackApiKey = fbProv?.apiKey?.trim() || '';
  }

  return {
    purpose: route,
    primaryProvider: route.primaryProvider,
    primaryModel: route.primaryModel,
    primaryApiKey,
    primaryBaseUrl,
    keySourceLabel,
    fallbackProvider: route.fallbackProvider,
    fallbackModel: route.fallbackModel,
    fallbackApiKey,
    hasActiveExternalKey: Boolean(primaryApiKey || fallbackApiKey),
  };
}

// ============================================================================
// ĐO LƯỜNG TOKEN, BẢNG TÍNH GIÁ CƯỚC & NHẬT KÝ CHI PHÍ THỰC TẾ
// ============================================================================

export const API_USAGE_LOGS_KEY = 'upbase_api_usage_logs';
export const API_USAGE_LOGGED_EVENT = 'upbase-api-usage-logged';

/**
 * Tra cứu thông số cước phí và giới hạn ngữ cảnh của một mô hình bất kỳ
 */
export function getModelOption(modelId: string): ApiModelOption {
  const allModels = [
    ...PROVIDER_MODELS_CATALOG.GOOGLE,
    ...PROVIDER_MODELS_CATALOG.OPENAI,
    ...PROVIDER_MODELS_CATALOG.CLAUDE,
    ...PROVIDER_MODELS_CATALOG.INTERNAL,
  ];
  const found = allModels.find(m => m.id === modelId || m.id.toLowerCase() === modelId.toLowerCase());
  if (found) return found;

  // Dự phòng cho mã model tùy biến do người dùng tự nhập
  const lower = modelId.toLowerCase();
  if (lower.includes('mini') || lower.includes('haiku') || lower.includes('flash')) {
    return {
      id: modelId,
      label: modelId,
      badge: 'Mô hình nhanh',
      description: 'Mô hình tùy biến cấu hình người dùng',
      inputCostPerMillionUsd: 0.15,
      outputCostPerMillionUsd: 0.60,
      contextWindowTokens: 128_000,
    };
  }
  return {
    id: modelId,
    label: modelId,
    badge: 'Mô hình tùy chỉnh',
    description: 'Mô hình do người dùng chỉ định',
    inputCostPerMillionUsd: 2.0,
    outputCostPerMillionUsd: 8.0,
    contextWindowTokens: 128_000,
  };
}

/**
 * Tính toán chi phí thực tế (USD & VNĐ) dựa trên số lượng token Prompt và Completion
 */
export function calculateExecutionCost(modelId: string, usage: TokenUsageMetrics): ExecutionCostReport {
  const model = getModelOption(modelId);
  const promptTokens = Math.max(0, usage.promptTokens || 0);
  const completionTokens = Math.max(0, usage.completionTokens || 0);
  const totalTokens = promptTokens + completionTokens;

  // Chi phí = (Tokens / 1.000.000) * Đơn giá 1M tokens
  const promptCostUsd = (promptTokens / 1_000_000) * model.inputCostPerMillionUsd;
  const completionCostUsd = (completionTokens / 1_000_000) * model.outputCostPerMillionUsd;
  const costUsd = Math.round((promptCostUsd + completionCostUsd) * 1_000_000) / 1_000_000;
  const costVnd = Math.round(costUsd * USD_TO_VND_RATE);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    costVnd,
    ratePromptPerMillionUsd: model.inputCostPerMillionUsd,
    rateCompletionPerMillionUsd: model.outputCostPerMillionUsd,
    promptCostUsd,
    completionCostUsd,
  };
}

const SEED_USAGE_LOGS: ApiUsageLogItem[] = [
  {
    id: 'log-seed-01',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    purposeId: 'LEGAL_OCR',
    purposeTitle: 'Đọc ảnh giấy tờ & CCCD / ĐKKD',
    provider: 'GOOGLE',
    modelUsed: 'gemini-2.5-flash',
    promptTokens: 1420,
    completionTokens: 380,
    totalTokens: 1800,
    costUsd: 0.000221,
    costVnd: 6,
    latencyMs: 840,
    status: 'SUCCESS',
    source: 'LEGAL_OCR',
  },
  {
    id: 'log-seed-02',
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    purposeId: 'SCRIPT_REVIEW',
    purposeTitle: 'Rà soát từ cấm & Biên tập kịch bản',
    provider: 'CLAUDE',
    modelUsed: 'claude-3-7-sonnet-20250219',
    promptTokens: 2150,
    completionTokens: 680,
    totalTokens: 2830,
    costUsd: 0.01665,
    costVnd: 424,
    latencyMs: 1420,
    status: 'SUCCESS',
    source: 'SCRIPT_REVIEW',
  },
  {
    id: 'log-seed-03',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    purposeId: 'STAFF_REVIEW',
    purposeTitle: 'Nhận xét tiến độ, SLA & Đánh giá 4P',
    provider: 'OPENAI',
    modelUsed: 'gpt-4o-mini',
    promptTokens: 1840,
    completionTokens: 520,
    totalTokens: 2360,
    costUsd: 0.000588,
    costVnd: 15,
    latencyMs: 760,
    status: 'SUCCESS',
    source: 'STAFF_REVIEW',
  },
  {
    id: 'log-seed-04',
    timestamp: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    purposeId: 'PLAN_ADS_ANALYSIS',
    purposeTitle: 'Đối soát kế hoạch tháng & Báo cáo Ads',
    provider: 'OPENAI',
    modelUsed: 'gpt-4o',
    promptTokens: 3450,
    completionTokens: 980,
    totalTokens: 4430,
    costUsd: 0.018425,
    costVnd: 469,
    latencyMs: 1890,
    status: 'SUCCESS',
    source: 'PLAN',
  },
  {
    id: 'log-seed-05',
    timestamp: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    purposeId: 'CONTRACT_DRAFTING',
    purposeTitle: 'Soạn thảo & Kiểm tra điều khoản hợp đồng',
    provider: 'CLAUDE',
    modelUsed: 'claude-3-7-sonnet-20250219',
    promptTokens: 2900,
    completionTokens: 1100,
    totalTokens: 4000,
    costUsd: 0.0252,
    costVnd: 641,
    latencyMs: 2150,
    status: 'SUCCESS',
    source: 'CONTRACT',
  },
  {
    id: 'log-seed-06',
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    purposeId: 'KOC_MATCHING',
    purposeTitle: 'Phân loại & Đề xuất KOC theo khung lương',
    provider: 'GOOGLE',
    modelUsed: 'gemini-2.5-flash',
    promptTokens: 1650,
    completionTokens: 420,
    totalTokens: 2070,
    costUsd: 0.00025,
    costVnd: 6,
    latencyMs: 690,
    status: 'SUCCESS',
    source: 'PLAYGROUND',
  },
];

export function loadApiUsageLogs(): ApiUsageLogItem[] {
  if (typeof window === 'undefined') return SEED_USAGE_LOGS;
  try {
    const raw = localStorage.getItem(API_USAGE_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(API_USAGE_LOGS_KEY, JSON.stringify(SEED_USAGE_LOGS));
      return SEED_USAGE_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_USAGE_LOGS;
  } catch (err) {
    console.warn('Could not load API usage logs:', err);
    return SEED_USAGE_LOGS;
  }
}

export function saveApiUsageLogs(logs: ApiUsageLogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(API_USAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 500))); // Giữ tối đa 500 logs gần nhất
    window.dispatchEvent(new CustomEvent(API_USAGE_LOGGED_EVENT, { detail: logs }));
  } catch (err) {
    console.warn('Could not save API usage logs:', err);
  }
}

export function recordApiUsageLog(
  item: Omit<ApiUsageLogItem, 'id' | 'timestamp'>
): ApiUsageLogItem {
  const newLog: ApiUsageLogItem = {
    ...item,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const current = loadApiUsageLogs();
  const updated = [newLog, ...current].slice(0, 500);
  saveApiUsageLogs(updated);

  // Cập nhật số tiền ước tính sử dụng vào ProviderConfig nếu hợp lệ
  if (newLog.provider !== 'INTERNAL' && newLog.costUsd > 0) {
    try {
      const cfg = loadApiWorkspaceConfig();
      if (cfg.providers[newLog.provider]) {
        cfg.providers[newLog.provider].estimatedUsedUsd =
          Math.round(((cfg.providers[newLog.provider].estimatedUsedUsd || 0) + newLog.costUsd) * 1000) / 1000;
        saveApiWorkspaceConfig(cfg);
      }
    } catch {
      // Bỏ qua nếu có lỗi cập nhật config
    }
  }

  return newLog;
}

export function clearApiUsageLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(API_USAGE_LOGS_KEY);
    window.dispatchEvent(new CustomEvent(API_USAGE_LOGGED_EVENT, { detail: [] }));
  } catch (err) {
    console.warn('Could not clear API usage logs:', err);
  }
}

export function getAggregatedUsageMetrics(logs: ApiUsageLogItem[]) {
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalCostUsd = 0;
  let totalCostVnd = 0;
  let successCalls = 0;
  let fallbackCalls = 0;
  let errorCalls = 0;
  let totalLatencyMs = 0;

  const byProvider: Record<ApiProviderId, { calls: number; tokens: number; costUsd: number; costVnd: number }> = {
    GOOGLE: { calls: 0, tokens: 0, costUsd: 0, costVnd: 0 },
    OPENAI: { calls: 0, tokens: 0, costUsd: 0, costVnd: 0 },
    CLAUDE: { calls: 0, tokens: 0, costUsd: 0, costVnd: 0 },
    INTERNAL: { calls: 0, tokens: 0, costUsd: 0, costVnd: 0 },
  };

  const byPurpose: Record<
    OperationalApiPurposeId,
    {
      calls: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      costUsd: number;
      costVnd: number;
    }
  > = {
    LEGAL_OCR: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    SCRIPT_REVIEW: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    CONTRACT_DRAFTING: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    STAFF_REVIEW: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    PLAN_ADS_ANALYSIS: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    KOC_MATCHING: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    KNOWLEDGE_QA: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
  };

  for (const log of logs) {
    totalTokens += log.totalTokens || 0;
    promptTokens += log.promptTokens || 0;
    completionTokens += log.completionTokens || 0;
    totalCostUsd += log.costUsd || 0;
    totalCostVnd += log.costVnd || 0;
    totalLatencyMs += log.latencyMs || 0;

    if (log.status === 'SUCCESS') successCalls++;
    else if (log.status === 'FALLBACK') fallbackCalls++;
    else if (log.status === 'ERROR') errorCalls++;

    if (byProvider[log.provider]) {
      byProvider[log.provider].calls += 1;
      byProvider[log.provider].tokens += log.totalTokens || 0;
      byProvider[log.provider].costUsd += log.costUsd || 0;
      byProvider[log.provider].costVnd += log.costVnd || 0;
    }

    if (byPurpose[log.purposeId]) {
      byPurpose[log.purposeId].calls += 1;
      byPurpose[log.purposeId].promptTokens += log.promptTokens || 0;
      byPurpose[log.purposeId].completionTokens += log.completionTokens || 0;
      byPurpose[log.purposeId].totalTokens += log.totalTokens || 0;
      byPurpose[log.purposeId].costUsd += log.costUsd || 0;
      byPurpose[log.purposeId].costVnd += log.costVnd || 0;
    }
  }

  const totalCalls = logs.length;
  const avgLatencyMs = totalCalls > 0 ? Math.round(totalLatencyMs / totalCalls) : 0;
  const avgCostPerCallUsd = totalCalls > 0 ? totalCostUsd / totalCalls : 0;
  const avgCostPerCallVnd = totalCalls > 0 ? Math.round(totalCostVnd / totalCalls) : 0;

  const costByProvider: Record<ApiProviderId, number> = {
    GOOGLE: byProvider.GOOGLE.costUsd,
    OPENAI: byProvider.OPENAI.costUsd,
    CLAUDE: byProvider.CLAUDE.costUsd,
    INTERNAL: byProvider.INTERNAL.costUsd,
  };

  return {
    totalCalls,
    successCalls,
    fallbackCalls,
    errorCalls,
    totalTokens,
    promptTokens,
    completionTokens,
    totalPromptTokens: promptTokens,
    totalCompletionTokens: completionTokens,
    totalCostUsd: Math.round(totalCostUsd * 1000) / 1000,
    totalCostVnd,
    avgLatencyMs,
    avgCostPerCallUsd,
    avgCostPerCallVnd,
    costByProvider,
    byProvider,
    byPurpose,
  };
}
