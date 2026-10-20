// ============================================================================
// CẤU HÌNH KẾT NỐI API (GOOGLE GEMINI, OPENAI CHATGPT, ANTHROPIC CLAUDE)
// & ĐIỀU PHỐI CÔNG CỤ THEO MỤC ĐÍCH NGHIỆP VỤ B2C
// ============================================================================

import { formatDateTimeVn, getVietnamIsoString } from './format';

export type ApiProviderId = 'GOOGLE' | 'OPENAI' | 'CLAUDE' | 'INTERNAL';

export type OperationalApiPurposeId =
  | 'LEGAL_OCR'
  | 'SCRIPT_REVIEW'
  | 'CONTRACT_DRAFTING'
  | 'STAFF_REVIEW'
  | 'PLAN_ADS_ANALYSIS'
  | 'KOC_MATCHING'
  | 'KOC_HISTORY_EVALUATION'
  | 'KNOWLEDGE_QA'
  | 'BRAND_MARKET_RESEARCH';

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
  source?: 'PLAYGROUND' | 'STAFF_REVIEW' | 'LEGAL_OCR' | 'SCRIPT_REVIEW' | 'CONTRACT' | 'PLAN' | 'QA' | 'MARKET_RESEARCH' | 'TEST' | 'KOC_DISCOVERY' | 'KOC_MATCHING';
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
      id: 'gemini-3.8-flash',
      label: 'Gemini 3.8 Flash',
      badge: 'Khuyên dùng',
      description: 'Đọc ảnh giấy tờ CCCD/ĐKKD chính xác, tốc độ phản hồi cực nhanh và tối ưu chi phí vận hành.',
      supportsVision: true,
      recommendedFor: ['LEGAL_OCR', 'KOC_MATCHING', 'STAFF_REVIEW', 'KNOWLEDGE_QA'],
      inputCostPerMillionUsd: 0.75,
      outputCostPerMillionUsd: 3.75,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-4-argon',
      label: 'Gemini 4 Argon (Flagship)',
      badge: 'Suy luận sâu',
      description: 'Mô hình cao cấp nhất của Google, xử lý bài toán phân tích dữ liệu đa bước, đối soát 69 gian hàng và pháp chế.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 10.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-3.6-flash',
      label: 'Gemini 3.6 Flash',
      badge: 'Ổn định',
      description: 'Bản nâng cấp kế nhiệm Gemini 3.5 Flash: cân bằng tốc độ và độ sâu phân tích cho rà soát nội dung và danh bạ KOC.',
      supportsVision: true,
      recommendedFor: ['KOC_MATCHING', 'SCRIPT_REVIEW'],
      inputCostPerMillionUsd: 0.60,
      outputCostPerMillionUsd: 3.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-3.5-flash-lite',
      label: 'Gemini 3.5 Flash-Lite',
      badge: 'Tốc độ cao',
      description: 'Chi phí thấp, chuyên dùng cho phân loại nhanh, kiểm tra định kỳ và trích xuất dữ liệu số lượng lớn.',
      supportsVision: true,
      recommendedFor: ['LEGAL_OCR', 'STAFF_REVIEW'],
      inputCostPerMillionUsd: 0.30,
      outputCostPerMillionUsd: 2.50,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-3.5-flash',
      label: 'Gemini 3.5 Flash',
      badge: 'Đa năng',
      description: 'Xử lý ổn định các tác vụ phân tích kịch bản, trích xuất hồ sơ thương hiệu và đánh giá lịch sử KOC.',
      supportsVision: true,
      recommendedFor: ['KOC_MATCHING', 'SCRIPT_REVIEW'],
      inputCostPerMillionUsd: 1.50,
      outputCostPerMillionUsd: 9.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-3.1-pro-preview',
      label: 'Gemini 3.1 Pro (2M Context)',
      badge: 'Ngữ cảnh 2M',
      description: 'Cửa sổ ngữ cảnh 2 triệu token, đọc toàn bộ hồ sơ nhãn hàng và lịch sử kế hoạch nhiều tháng.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 12.00,
      contextWindowTokens: 2_000_000,
    },
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro (Bản LTS)',
      badge: 'Bản LTS',
      description: 'Phiên bản ổn định dài hạn, tương thích tốt với các luồng đọc tài liệu pháp lý nhiều trang.',
      supportsVision: true,
      inputCostPerMillionUsd: 1.25,
      outputCostPerMillionUsd: 10.00,
      contextWindowTokens: 2_000_000,
    },
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash (Bản LTS)',
      badge: 'Tiết kiệm',
      description: 'Phiên bản tiết kiệm ngân sách cho các tác vụ đọc văn bản cơ bản.',
      supportsVision: true,
      inputCostPerMillionUsd: 0.15,
      outputCostPerMillionUsd: 0.60,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      badge: 'Dự phòng nhanh',
      description: 'Mô hình phản hồi độ trễ thấp, luôn sẵn sàng làm luồng dự phòng khi cụm chính quá tải.',
      supportsVision: true,
      inputCostPerMillionUsd: 0.10,
      outputCostPerMillionUsd: 0.40,
      contextWindowTokens: 1_000_000,
    },
  ],
  OPENAI: [
    {
      id: 'gpt-6.1-sol',
      label: 'GPT-6.1 Sol',
      badge: 'Khuyên dùng',
      description: 'Mô hình chủ lực thế hệ 6.1 của OpenAI: tối ưu đối soát kế hoạch tháng, báo cáo Ads đa sàn và thẩm định hồ sơ KOC.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'SCRIPT_REVIEW', 'CONTRACT_DRAFTING', 'KOC_HISTORY_EVALUATION'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 10.00,
      contextWindowTokens: 1_050_000,
    },
    {
      id: 'gpt-6-astra',
      label: 'GPT-6 Astra (Flagship)',
      badge: 'Flagship',
      description: 'Mô hình cao cấp nhất dòng GPT-6 với ngữ cảnh 1.05M token, giải quyết bài toán chiến lược tài chính và pháp chế phức tạp.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 10.00,
      outputCostPerMillionUsd: 50.00,
      contextWindowTokens: 1_050_000,
    },
    {
      id: 'gpt-6-luna',
      label: 'GPT-6 Luna',
      badge: 'Tốc độ cao',
      description: 'Mô hình nhanh và tiết kiệm nhất thế hệ GPT-6, rất phù hợp đánh giá nhân sự 4P, kiểm tra SLA và phân loại KOC.',
      supportsVision: true,
      recommendedFor: ['STAFF_REVIEW', 'KOC_MATCHING', 'KNOWLEDGE_QA', 'LEGAL_OCR'],
      inputCostPerMillionUsd: 0.10,
      outputCostPerMillionUsd: 0.50,
      contextWindowTokens: 1_050_000,
    },
    {
      id: 'gpt-5.6-sol',
      label: 'GPT-5.6 Sol',
      badge: 'Chuyên sâu',
      description: 'Phiên bản cao cấp dòng GPT-5.6 với ngữ cảnh 1.05M token, chuyên phân tích báo cáo vận hành và hợp đồng dịch vụ.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 5.00,
      outputCostPerMillionUsd: 30.00,
      contextWindowTokens: 1_050_000,
    },
    {
      id: 'gpt-5.6-terra',
      label: 'GPT-5.6 Terra',
      badge: 'Cân bằng',
      description: 'Cân bằng giữa năng lực suy luận và chi phí vận hành với cửa sổ ngữ cảnh 1.05M token.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'SCRIPT_REVIEW'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 12.00,
      contextWindowTokens: 1_050_000,
    },
    {
      id: 'gpt-5.6-luna',
      label: 'GPT-5.6 Luna',
      badge: 'Tối ưu chi phí',
      description: 'Bản thu gọn tốc độ cao của dòng GPT-5.6 cho tác vụ phân loại và trích xuất dữ liệu.',
      supportsVision: true,
      recommendedFor: ['STAFF_REVIEW', 'KOC_MATCHING'],
      inputCostPerMillionUsd: 0.20,
      outputCostPerMillionUsd: 1.20,
      contextWindowTokens: 1_050_000,
    },
    {
      id: 'gpt-5.5',
      label: 'GPT-5.5',
      badge: 'Ổn định',
      description: 'Hiệu năng ổn định với cửa sổ ngữ cảnh 1.1M token, phù hợp phân tích báo cáo Ads đa sàn và hợp đồng.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'SCRIPT_REVIEW'],
      inputCostPerMillionUsd: 3.00,
      outputCostPerMillionUsd: 20.00,
      contextWindowTokens: 1_100_000,
    },
    {
      id: 'gpt-5',
      label: 'GPT-5 (Standard)',
      badge: 'Bản chuẩn 5.0',
      description: 'Mô hình tiêu chuẩn thế hệ 5 của OpenAI: xử lý bảng số liệu, đối soát kế hoạch tháng và đánh giá vận hành.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'SCRIPT_REVIEW', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 1.25,
      outputCostPerMillionUsd: 10.00,
      contextWindowTokens: 400_000,
    },
    {
      id: 'gpt-5-mini',
      label: 'GPT-5 mini',
      badge: 'Tiết kiệm',
      description: 'Tốc độ phản hồi nhanh, chi phí thấp cho đánh giá nhân sự 4P, kiểm tra SLA và phân loại KOC.',
      supportsVision: true,
      recommendedFor: ['STAFF_REVIEW', 'KOC_MATCHING', 'KNOWLEDGE_QA'],
      inputCostPerMillionUsd: 0.25,
      outputCostPerMillionUsd: 2.00,
      contextWindowTokens: 400_000,
    },
    {
      id: 'gpt-5-nano',
      label: 'GPT-5 nano',
      badge: 'Siêu nhẹ',
      description: 'Chuyên dùng trích xuất trường dữ liệu, chuẩn hóa định dạng và kiểm tra nhanh.',
      supportsVision: true,
      recommendedFor: ['LEGAL_OCR', 'STAFF_REVIEW'],
      inputCostPerMillionUsd: 0.05,
      outputCostPerMillionUsd: 0.40,
      contextWindowTokens: 400_000,
    },
    {
      id: 'o3',
      label: 'OpenAI o3 (Deep Reasoning)',
      badge: 'Tài chính',
      description: 'Mô hình suy luận chuyên sâu: kiểm tra chéo hạn mức Gross/Net, tính thuế TNCN/HKD, CIR, ROAS và P&L.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 8.00,
      contextWindowTokens: 200_000,
    },
    {
      id: 'o4-mini',
      label: 'OpenAI o4-mini (Fast Reasoning)',
      badge: 'Số liệu nhanh',
      description: 'Suy luận logic và tính toán bảng số liệu nhanh với mức chi phí tiết kiệm.',
      supportsVision: true,
      recommendedFor: ['PLAN_ADS_ANALYSIS', 'STAFF_REVIEW'],
      inputCostPerMillionUsd: 1.10,
      outputCostPerMillionUsd: 4.40,
      contextWindowTokens: 200_000,
    },
    {
      id: 'gpt-4.1',
      label: 'GPT-4.1 (1M Context LTS)',
      badge: 'Định dạng JSON',
      description: 'Tuân thủ chặt chẽ cấu trúc JSON đầu ra và danh sách quy định từ cấm của nhãn hàng.',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'LEGAL_OCR'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 8.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'gpt-4.1-mini',
      label: 'GPT-4.1 mini (LTS)',
      badge: 'Ngữ cảnh 1M',
      description: 'Bản thu gọn của GPT-4.1 với ngữ cảnh 1M token và chi phí hợp lý.',
      supportsVision: true,
      inputCostPerMillionUsd: 0.40,
      outputCostPerMillionUsd: 1.60,
      contextWindowTokens: 1_000_000,
    },
  ],
  CLAUDE: [
    {
      id: 'claude-sonnet-5-5',
      label: 'Claude Sonnet 5.5',
      badge: 'Khuyên dùng',
      description: 'Biên tập kịch bản video KOC tự nhiên, rà soát từ cấm tinh tế và soạn điều khoản hợp đồng chặt chẽ.',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'CONTRACT_DRAFTING', 'KOC_MATCHING'],
      inputCostPerMillionUsd: 2.00,
      outputCostPerMillionUsd: 10.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'claude-opus-5-5',
      label: 'Claude Opus 5.5 (Flagship)',
      badge: 'Pháp chế',
      description: 'Phù hợp rà soát điều khoản pháp lý và biên tập kịch bản tiếng Việt.',
      supportsVision: true,
      recommendedFor: ['CONTRACT_DRAFTING', 'SCRIPT_REVIEW'],
      inputCostPerMillionUsd: 4.00,
      outputCostPerMillionUsd: 20.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'claude-haiku-5-5',
      label: 'Claude Haiku 5.5',
      badge: 'Tốc độ cao',
      description: 'Phản hồi nhanh cho tác vụ quét lỗi chính tả, từ nhạy cảm và tóm tắt trao đổi trong sổ kế hoạch tháng.',
      supportsVision: true,
      recommendedFor: ['STAFF_REVIEW', 'KNOWLEDGE_QA'],
      inputCostPerMillionUsd: 0.10,
      outputCostPerMillionUsd: 0.50,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'claude-fable-5-1',
      label: 'Claude Fable 5.1 (Frontier)',
      badge: 'Chiến dịch lớn',
      description: 'Mô hình suy luận chuyên sâu của Anthropic: xử lý hồ sơ chiến dịch quy mô lớn và thẩm định rủi ro hợp đồng đa bên.',
      supportsVision: true,
      recommendedFor: ['CONTRACT_DRAFTING', 'PLAN_ADS_ANALYSIS'],
      inputCostPerMillionUsd: 10.00,
      outputCostPerMillionUsd: 50.00,
      contextWindowTokens: 1_000_000,
    },
    {
      id: 'claude-opus-4-8',
      label: 'Claude Opus 4.8',
      badge: 'Soạn thảo 4.8',
      description: 'Phiên bản Opus 4.8 chuyên xử lý văn bản hợp đồng thương mại và đối chiếu quy chuẩn nhãn hàng.',
      supportsVision: true,
      recommendedFor: ['CONTRACT_DRAFTING', 'SCRIPT_REVIEW'],
      inputCostPerMillionUsd: 5.00,
      outputCostPerMillionUsd: 25.00,
      contextWindowTokens: 500_000,
    },
    {
      id: 'claude-sonnet-4-6',
      label: 'Claude Sonnet 4.6',
      badge: 'Biên tập 4.6',
      description: 'Phiên bản Sonnet 4.6 ổn định cho rà soát kịch bản 4 phần và gợi ý câu mở đầu 3 giây.',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'KOC_MATCHING'],
      inputCostPerMillionUsd: 3.00,
      outputCostPerMillionUsd: 15.00,
      contextWindowTokens: 500_000,
    },
    {
      id: 'claude-sonnet-4-5',
      label: 'Claude Sonnet 4.5 (Bản LTS)',
      badge: 'Bản LTS',
      description: 'Viết lại Hook 3s đầu, lời thoại KOC theo đúng giọng văn nhãn hàng (Mẹ bỉm, Chuyên gia da liễu).',
      supportsVision: true,
      recommendedFor: ['SCRIPT_REVIEW', 'CONTRACT_DRAFTING'],
      inputCostPerMillionUsd: 3.00,
      outputCostPerMillionUsd: 15.00,
      contextWindowTokens: 200_000,
    },
    {
      id: 'claude-opus-4-5',
      label: 'Claude Opus 4.5 (Bản LTS)',
      badge: 'Bản LTS',
      description: 'Phiên bản Opus 4.5 ổn định dài hạn cho các nghiệp vụ biên tập nội dung và hợp đồng thương mại.',
      supportsVision: true,
      inputCostPerMillionUsd: 5.00,
      outputCostPerMillionUsd: 25.00,
      contextWindowTokens: 200_000,
    },
    {
      id: 'claude-haiku-4-5',
      label: 'Claude Haiku 4.5 (Bản LTS)',
      badge: 'Tiết kiệm',
      description: 'Phiên bản Haiku 4.5 nhẹ và ổn định cho các tác vụ hỏi đáp sổ tay quy trình.',
      supportsVision: true,
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
    badgeLabel?: string;
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
    strengthsSummary: 'Gemini 4 Argon & 3.8 Flash: Đọc ảnh CCCD/ĐKKD, xử lý bảng dữ liệu lớn 69 gian hàng, tốc độ nhanh.',
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
    strengthsSummary: 'GPT-5.6 Sol, GPT-5 & o3/o4-mini: Đối soát số liệu kế hoạch tháng, phân tích báo cáo Ads ROAS/GMV, chấm điểm nhân sự 4P.',
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
    strengthsSummary: 'Claude Sonnet 5.5 & Opus 5.5: Rà soát từ cấm & viết lại kịch bản KOC tự nhiên, soạn thảo hợp đồng & phụ lục pháp chế.',
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
      defaultModel: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      monthlyBudgetLimitUsd: 50,
      estimatedUsedUsd: 0,
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
      defaultModel: 'gpt-6.1-sol',
      baseUrl: 'https://api.openai.com/v1',
      organizationId: '',
      monthlyBudgetLimitUsd: 100,
      estimatedUsedUsd: 0,
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
      defaultModel: 'claude-sonnet-5-5',
      baseUrl: 'https://api.anthropic.com/v1',
      monthlyBudgetLimitUsd: 80,
      estimatedUsedUsd: 0,
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
      defaultModel: 'gemini-3.8-flash',
      departmentScope: 'ACCOUNTING_LEGAL',
      createdAt: '2026-10-01',
      notes: 'Khóa riêng phục vụ đọc ảnh giấy tờ KOC/CTV tại màn Hợp đồng.',
    },
    {
      id: 'nk-claude-content',
      label: 'Key Claude — Team Content & Duyệt Kịch Bản',
      providerId: 'CLAUDE',
      apiKey: '',
      defaultModel: 'claude-sonnet-5-5',
      departmentScope: 'CONTENT',
      createdAt: '2026-10-02',
      notes: 'Khóa riêng cho đội Content kiểm duyệt kịch bản 4 phần và viết lại câu mở đầu.',
    },
    {
      id: 'nk-openai-growth',
      label: 'Key ChatGPT — Đối soát Plan 4.1 & Báo cáo Ads',
      providerId: 'OPENAI',
      apiKey: '',
      defaultModel: 'gpt-6.1-sol',
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
      primaryModel: 'gemini-3.8-flash',
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
      primaryModel: 'claude-sonnet-5-5',
      fallbackProvider: 'OPENAI',
      fallbackModel: 'gpt-6.1-sol',
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
      primaryModel: 'claude-opus-5-5',
      fallbackProvider: 'GOOGLE',
      fallbackModel: 'gemini-4-argon',
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
      primaryModel: 'gpt-6-luna',
      fallbackProvider: 'GOOGLE',
      fallbackModel: 'gemini-3.8-flash',
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
      primaryModel: 'gpt-6.1-sol',
      fallbackProvider: 'GOOGLE',
      fallbackModel: 'gemini-4-argon',
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
      primaryModel: 'gemini-3.8-flash',
      fallbackProvider: 'CLAUDE',
      fallbackModel: 'claude-sonnet-5-5',
      temperature: 0.3,
      maxTokens: 1800,
      systemInstruction:
        'Dựa trên ngân sách Order Net của gian hàng và định vị thương hiệu, hãy đề xuất tỷ trọng phân bổ số lượng KOC theo khung lương chuẩn Upbase (TAP 0đ, KL1 <500k, KL2 500k-1.5M, KL3 1.5M-3M, KL4 3M-5M, KL5 5M-10M) và chọn tệp kênh trong 25 tệp chuẩn (Mẹ bé, Bác sỹ/chuyên gia, Review Nữ, Unboxing...) để tối ưu CIR và GMV.',
      sampleInputText:
        'Nhãn hàng: La Roche-Posay Vietnam Official (Ngành Dược mỹ phẩm - Tone Bác sĩ / Chuyên gia da liễu)\nSản phẩm đẩy: Kem dưỡng phục hồi Cicaplast Baume B5+\nNgân sách Order Net giao tháng 10: 45.000.000 VNĐ\nMục tiêu cam kết: Tối thiểu 25 video lên sóng (bao gồm cả Paid KOC và FOC), tỷ lệ chi phí CIR mục tiêu <= 18%.',
    },
    KOC_HISTORY_EVALUATION: {
      purposeId: 'KOC_HISTORY_EVALUATION',
      title: '7. Đánh giá lịch sử hợp tác, mức độ phù hợp & rủi ro KOC',
      departmentTag: 'Danh bạ KOC & Booking',
      usedInScreens: ['Danh bạ KOC', 'Hồ sơ KOC', 'Booking', 'Đề xuất KOC'],
      description:
        'Phân tích lịch sử hợp tác của KOC qua các chiến dịch (Paid/FOC, GMV, ROI, CPO), chấm điểm mức độ phù hợp tái ký, nhận diện rủi ro trễ hạn SLA, rủi ro pháp lý/đổi tài khoản nhận tiền và lịch sử bị nhãn hàng từ chối.',
      primaryProvider: 'GOOGLE',
      primaryModel: 'gemini-3.8-flash',
      fallbackProvider: 'OPENAI',
      fallbackModel: 'gpt-6-luna',
      temperature: 0.2,
      maxTokens: 2200,
      systemInstruction:
        'Bạn là Chuyên gia Thẩm định Hồ sơ & Rủi ro KOC tại Phòng Marketing B2C Upbase. Dựa trên lịch sử hợp tác (tổng số deal Paid/FOC, GMV, ROI, CPO, tỷ lệ video hoàn vốn), kỷ luật tiến độ SLA (tỷ lệ nộp kịch bản/video đúng hạn, bàn giao mã Spark Ads), tình trạng pháp lý/thanh toán (CCCD/MST, dùng chung MCN, đổi nhiều tài khoản nhận tiền) và phản hồi từ Nhãn hàng/PIC, hãy lập Báo cáo Đánh giá KOC gồm 4 phần: (1) Kết luận mức độ phù hợp (Phù hợp tái ký / Cân nhắc có điều kiện / Rủi ro cao hạn chế book), (2) Phân tích hiệu quả thương mại lịch sử, (3) Nhận diện chi tiết các rủi ro (Tiến độ SLA, Pháp lý & Thuế, Đơn giá, Nội dung/Thương hiệu), (4) Khuyến nghị đàm phán đơn giá và điều khoản ràng buộc khi book.',
      sampleInputText:
        'Hồ sơ KOC: Hà Linh Official (@halinhofficial) — Ngành Làm đẹp & Chăm sóc cá nhân | Khung lương KL6 (15M - 25M)\nLịch sử hợp tác: 6 chiến dịch (5 Paid, 1 FOC) | Tổng chi phí Net: 85.000.000đ | Tổng GMV: 310.000.000đ | ROI trung bình: 3.65x | CPO: 42.000đ.\nTiến độ SLA: Nộp kịch bản đúng hạn 83%, lên bài đúng hạn 67% (2 chiến dịch nộp video trễ 2 ngày).\nPháp lý & Thanh toán: Đã xác minh CCCD (Cá nhân khấu trừ 10% TNCN), ghi nhận 2 lần đổi người thụ hưởng nhận tiền hộ.\nPhản hồi lịch sử: Chuyển đổi tốt nhóm kem chống nắng nhưng từng bị 1 nhãn hàng nhắc nhở vì gắn giỏ hàng muộn 4 tiếng.',
    },
    KNOWLEDGE_QA: {
      purposeId: 'KNOWLEDGE_QA',
      title: '8. Hỏi đáp quy trình & Tra cứu sổ tay Marketing B2C',
      departmentTag: 'Toàn phòng B2C',
      usedInScreens: ['Sổ tay & Hỏi đáp'],
      description:
        'Tra cứu quy trình Booking 42 bước, Livestream 28 bước, 21 mốc SLA, 8 mẫu hợp đồng pháp chế, cách tính thuế TNCN 10% / HKD 7%, khung lương KL1–KL7 và 15 trụ cột nội dung.',
      primaryProvider: 'GOOGLE',
      primaryModel: 'gemini-3.8-flash',
      fallbackProvider: 'INTERNAL',
      fallbackModel: 'upbase-local-engine',
      temperature: 0.15,
      maxTokens: 2000,
      systemInstruction:
        'Bạn là Cố vấn Nghiệp vụ & Sổ tay Quy trình Phòng Marketing B2C tại Upbase. Trả lời ngắn gọn, thẳng thắn, đúng số liệu SLA, mẫu hợp đồng (1.1.1 đến 4.2), khung lương (KL1-KL7), chính sách thuế (TNCN 10% từ 2M, HKD 7%, VAT 8%/10%) và cơ cấu nhân sự phòng B2C.',
      sampleInputText:
        'KOC cá nhân chốt giá thực nhận Net là 4.500.000đ thì trên hợp đồng ghi giá Gross bao nhiêu, khấu trừ thuế thế nào và dùng mẫu hợp đồng số mấy?',
    },
    BRAND_MARKET_RESEARCH: {
      purposeId: 'BRAND_MARKET_RESEARCH',
      title: '9. Nghiên cứu thị trường, phân tích 4P nhãn hàng & đào bình luận',
      departmentTag: 'Chiến lược & Thương hiệu',
      usedInScreens: ['Nghiên cứu thị trường & đối thủ', 'Hồ sơ thương hiệu'],
      description:
        'Tổng hợp hồ sơ 4P của thương hiệu, đối chiếu ma trận đối thủ cạnh tranh trên TikTok Shop/Shopee Mall, bóc tách bình luận nỗi đau khách hàng và đề xuất chiến lược định vị.',
      primaryProvider: 'GOOGLE',
      primaryModel: 'gemini-3.8-flash',
      fallbackProvider: 'OPENAI',
      fallbackModel: 'gpt-6.1-sol',
      temperature: 0.25,
      maxTokens: 2200,
      systemInstruction:
        'Bạn là Chuyên gia Nghiên cứu Thị trường & Định vị Thương hiệu B2C tại Upbase. Dựa trên dữ liệu 4P nhãn hàng, danh mục SKU, ma trận đối thủ cạnh tranh và các cụm bình luận khách hàng trên TikTok/Shopee, hãy lập báo cáo gồm: (1) Định vị & khoảng giá tối ưu, (2) Điểm yếu của đối thủ cần khai thác ngay trong kịch bản KOC, (3) 3 góc nội dung giải quyết trực diện nỗi đau & rào cản mua hàng của khách.',
      sampleInputText:
        'Thương hiệu: Kutieskin (Chăm sóc da Mẹ & Bé)\nKhoảng giá chủ lực: 85.000đ - 245.000đ | SKU mũi nhọn: Kem mẩn ngứa hăm (95.000đ), Kem chàm sữa (215.000đ).\nĐối thủ trực diện: Bepanthen, Mustela, Cỏ Mềm.\nCụm bình luận khách hàng nhiều nhất: Sợ chứa corticoid (42%), Hỏi trẻ sơ sinh 1 tháng tuổi bôi mặt được không (31%).',
    },
  },
  updatedAt: '2026-10-20T12:00:00.000Z',
};

const STORAGE_KEY = 'upbase_b2c_api_workspace_config_v2';
const LEGACY_STORAGE_KEY_V1 = 'upbase_b2c_api_workspace_config_v1';
export const API_CONFIG_UPDATED_EVENT = 'upbase-api-config-updated';

const LEGACY_MODEL_UPGRADE_MAP: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-3.8-flash',
  'gemini-2.5-pro': 'gemini-4-argon',
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-1.5-pro': 'gemini-4-argon',
  'gemini-1.5-flash': 'gemini-3.8-flash',
  'gpt-4o': 'gpt-6.1-sol',
  'gpt-4o-mini': 'gpt-6-luna',
  'o1': 'o3',
  'o3-mini': 'o4-mini',
  'claude-3-7-sonnet-20250219': 'claude-sonnet-5-5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-5-5',
  'claude-3-5-haiku-20241022': 'claude-haiku-5-5',
  'claude-3-opus-20240229': 'claude-opus-5-5',
};

function upgradeLegacyModelId(modelId: string | undefined, fallback: string): string {
  if (!modelId) return fallback;
  return LEGACY_MODEL_UPGRADE_MAP[modelId] || modelId;
}

export function loadApiWorkspaceConfig(): ApiWorkspaceConfigState {
  if (typeof window === 'undefined') {
    return INITIAL_API_WORKSPACE_CONFIG;
  }
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let isMigratingFromV1 = false;
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY_V1);
      isMigratingFromV1 = Boolean(raw);
    }
    if (!raw) return INITIAL_API_WORKSPACE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ApiWorkspaceConfigState>;

    const googleCfg = {
      ...INITIAL_API_WORKSPACE_CONFIG.providers.GOOGLE,
      ...(parsed.providers?.GOOGLE || {}),
    };
    const openaiCfg = {
      ...INITIAL_API_WORKSPACE_CONFIG.providers.OPENAI,
      ...(parsed.providers?.OPENAI || {}),
    };
    const claudeCfg = {
      ...INITIAL_API_WORKSPACE_CONFIG.providers.CLAUDE,
      ...(parsed.providers?.CLAUDE || {}),
    };

    // Xóa sạch các giá trị chi phí mẫu (seed mock) nếu trình duyệt còn lưu trong bộ nhớ
    if (googleCfg.estimatedUsedUsd === 4.2) googleCfg.estimatedUsedUsd = 0;
    if (openaiCfg.estimatedUsedUsd === 12.8) openaiCfg.estimatedUsedUsd = 0;
    if (claudeCfg.estimatedUsedUsd === 9.5) claudeCfg.estimatedUsedUsd = 0;

    if (isMigratingFromV1) {
      googleCfg.defaultModel = upgradeLegacyModelId(googleCfg.defaultModel, 'gemini-3.8-flash');
      openaiCfg.defaultModel = upgradeLegacyModelId(openaiCfg.defaultModel, 'gpt-5');
      claudeCfg.defaultModel = upgradeLegacyModelId(claudeCfg.defaultModel, 'claude-sonnet-5-5');
    }

    const namedKeys = Array.isArray(parsed.namedKeys)
      ? parsed.namedKeys.map(k => ({
          ...k,
          defaultModel: isMigratingFromV1 ? upgradeLegacyModelId(k.defaultModel, k.defaultModel) : k.defaultModel,
        }))
      : INITIAL_API_WORKSPACE_CONFIG.namedKeys;

    const mergeRoute = (id: OperationalApiPurposeId): PurposeRoutingRule => {
      const base = INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[id];
      const saved = parsed.purposeRoutes?.[id];
      if (!saved) return base;
      return {
        ...base,
        ...saved,
        primaryModel: isMigratingFromV1
          ? upgradeLegacyModelId(saved.primaryModel, base.primaryModel)
          : saved.primaryModel || base.primaryModel,
        fallbackModel: isMigratingFromV1
          ? upgradeLegacyModelId(saved.fallbackModel, base.fallbackModel)
          : saved.fallbackModel || base.fallbackModel,
      };
    };

    const migratedState: ApiWorkspaceConfigState = {
      providers: {
        GOOGLE: googleCfg,
        OPENAI: openaiCfg,
        CLAUDE: claudeCfg,
      },
      namedKeys,
      purposeRoutes: {
        LEGAL_OCR: mergeRoute('LEGAL_OCR'),
        SCRIPT_REVIEW: mergeRoute('SCRIPT_REVIEW'),
        CONTRACT_DRAFTING: mergeRoute('CONTRACT_DRAFTING'),
        STAFF_REVIEW: mergeRoute('STAFF_REVIEW'),
        PLAN_ADS_ANALYSIS: mergeRoute('PLAN_ADS_ANALYSIS'),
        KOC_MATCHING: mergeRoute('KOC_MATCHING'),
        KOC_HISTORY_EVALUATION: mergeRoute('KOC_HISTORY_EVALUATION'),
        KNOWLEDGE_QA: mergeRoute('KNOWLEDGE_QA'),
        BRAND_MARKET_RESEARCH: mergeRoute('BRAND_MARKET_RESEARCH'),
      },
      updatedAt: parsed.updatedAt || INITIAL_API_WORKSPACE_CONFIG.updatedAt,
    };

    if (isMigratingFromV1) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState));
    }

    return migratedState;
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
      updatedAt: getVietnamIsoString(),
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
 * Lấy cấu hình mặc định ban đầu của một nghiệp vụ (dùng để đối chiếu hoặc khôi phục câu lệnh gốc)
 */
export function getDefaultPurposeRoute(purposeId: OperationalApiPurposeId): PurposeRoutingRule {
  return INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[purposeId];
}

/**
 * Cập nhật và lưu câu lệnh chỉ dẫn (System Prompt) cho một phân hệ nghiệp vụ bất kỳ
 */
export function updatePurposeSystemInstruction(
  purposeId: OperationalApiPurposeId,
  systemInstruction: string
): PurposeRoutingRule {
  const cfg = loadApiWorkspaceConfig();
  const base = cfg.purposeRoutes[purposeId] || INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[purposeId];
  const updatedRule: PurposeRoutingRule = {
    ...base,
    systemInstruction: systemInstruction.trim() || INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[purposeId].systemInstruction,
  };
  cfg.purposeRoutes[purposeId] = updatedRule;
  saveApiWorkspaceConfig(cfg);
  return updatedRule;
}

/**
 * Khôi phục câu lệnh chỉ dẫn (System Prompt) của phân hệ về mặc định gốc của hệ thống
 */
export function resetPurposeSystemInstruction(purposeId: OperationalApiPurposeId): PurposeRoutingRule {
  const defaultRule = INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[purposeId];
  return updatePurposeSystemInstruction(purposeId, defaultRule.systemInstruction);
}

/**
 * Cập nhật nhanh cấu hình kết nối (Nhà cung cấp, Mô hình, Khóa API riêng, Dự phòng, Câu lệnh) cho một phân hệ ngay trên màn hình tính năng
 */
export function updatePurposeRoutingRule(
  purposeId: OperationalApiPurposeId,
  patch: Partial<Pick<PurposeRoutingRule, 'primaryProvider' | 'primaryModel' | 'fallbackProvider' | 'fallbackModel' | 'customApiKeyOverride' | 'namedKeyId' | 'systemInstruction' | 'temperature' | 'maxTokens'>>
): PurposeRoutingRule {
  const cfg = loadApiWorkspaceConfig();
  const base = cfg.purposeRoutes[purposeId] || INITIAL_API_WORKSPACE_CONFIG.purposeRoutes[purposeId];
  const updatedRule: PurposeRoutingRule = {
    ...base,
    ...patch,
  };
  cfg.purposeRoutes[purposeId] = updatedRule;
  saveApiWorkspaceConfig(cfg);
  return updatedRule;
}

/**
 * Lưu nhanh khóa API mặc định cho một nhà cung cấp (Google / OpenAI / Claude) từ màn hình tính năng
 */
export function updateProviderApiKey(
  providerId: Exclude<ApiProviderId, 'INTERNAL'>,
  apiKey: string,
  defaultModel?: string
): void {
  const cfg = loadApiWorkspaceConfig();
  if (!cfg.providers[providerId]) return;
  cfg.providers[providerId] = {
    ...cfg.providers[providerId],
    apiKey: apiKey.trim(),
    ...(defaultModel ? { defaultModel } : {}),
  };
  saveApiWorkspaceConfig(cfg);
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

export const API_USAGE_LOGS_KEY = 'upbase_api_usage_logs_v2';
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
  if (lower.includes('mini') || lower.includes('haiku') || lower.includes('flash') || lower.includes('nano')) {
    return {
      id: modelId,
      label: modelId,
      badge: 'Mô hình nhanh',
      description: 'Mô hình tùy biến cấu hình người dùng',
      inputCostPerMillionUsd: 0.25,
      outputCostPerMillionUsd: 2.0,
      contextWindowTokens: 400_000,
    };
  }
  return {
    id: modelId,
    label: modelId,
    badge: 'Mô hình tùy chỉnh',
    description: 'Mô hình do người dùng chỉ định',
    inputCostPerMillionUsd: 2.0,
    outputCostPerMillionUsd: 10.0,
    contextWindowTokens: 1_000_000,
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

const SEED_USAGE_LOGS: ApiUsageLogItem[] = [];

export function loadApiUsageLogs(): ApiUsageLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(API_USAGE_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Lọc bỏ toàn bộ các bản ghi gọi nháp / dữ liệu mẫu (id bắt đầu bằng log-seed-)
    const cleanLogs = parsed.filter(item => item && !String(item.id || '').startsWith('log-seed-'));
    if (cleanLogs.length !== parsed.length) {
      localStorage.setItem(API_USAGE_LOGS_KEY, JSON.stringify(cleanLogs));
    }
    return cleanLogs;
  } catch (err) {
    console.warn('Could not load API usage logs:', err);
    return [];
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

export function formatApiLogTimestamp(rawTimestamp?: string): string {
  return formatDateTimeVn(rawTimestamp);
}

export function recordApiUsageLog(
  item: Omit<ApiUsageLogItem, 'id' | 'timestamp'>
): ApiUsageLogItem {
  const newLog: ApiUsageLogItem = {
    ...item,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: getVietnamIsoString(),
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
    KOC_HISTORY_EVALUATION: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    KNOWLEDGE_QA: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
    BRAND_MARKET_RESEARCH: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costVnd: 0 },
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
