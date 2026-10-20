import { NextRequest, NextResponse } from 'next/server';
import {
  ApiProviderId,
  OperationalApiPurposeId,
  TokenUsageMetrics,
  calculateExecutionCost,
} from '@/lib/apiKeyConfig';
import { synthesizeMarketingKnowledgeAnswer } from '@/lib/marketingKnowledgeBase';

interface LlmApiRequestBody {
  action: 'TEST_CONNECTION' | 'EXECUTE_PURPOSE';
  provider?: ApiProviderId;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  // Dùng cho EXECUTE_PURPOSE
  purposeId?: OperationalApiPurposeId;
  systemInstruction?: string;
  inputText?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: ApiProviderId;
  fallbackModel?: string;
  fallbackApiKey?: string;
}

async function callGoogleGemini(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; modelUsed: string; usage: TokenUsageMetrics }> {
  const cleanBase = (params.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const modelId = params.model || 'gemini-3.8-flash';
  const url = `${cleanBase}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(params.apiKey.trim())}`;

  const parts: Array<{ text: string }> = [];
  if (params.systemInstruction) {
    parts.push({ text: `HƯỚNG DẪN NGHIỆP VỤ:\n${params.systemInstruction}` });
  }
  parts.push({ text: params.userPrompt });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: params.temperature ?? 0.2,
        maxOutputTokens: params.maxTokens ?? 1800,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google Gemini trả về mã lỗi ${res.status}: ${errText.slice(0, 220) || res.statusText}`);
  }

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Google Gemini không trả về nội dung văn bản hợp lệ.');
  }

  const promptTokens =
    data?.usageMetadata?.promptTokenCount ||
    Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
  const completionTokens =
    data?.usageMetadata?.candidatesTokenCount ||
    Math.max(1, Math.ceil(reply.length / 3.8));

  return {
    text: reply,
    modelUsed: modelId,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

async function callOpenAiChatGpt(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; modelUsed: string; usage: TokenUsageMetrics }> {
  const cleanBase = (params.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const modelId = params.model || 'gpt-5-mini';
  const url = `${cleanBase}/chat/completions`;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.userPrompt });

  const isReasoningModel = modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4');
  const payload: Record<string, unknown> = {
    model: modelId,
    messages,
  };
  if (!isReasoningModel) {
    payload.temperature = params.temperature ?? 0.2;
    payload.max_tokens = params.maxTokens ?? 1800;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI (ChatGPT) trả về mã lỗi ${res.status}: ${errText.slice(0, 220) || res.statusText}`);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('OpenAI (ChatGPT) không trả về nội dung phản hồi.');
  }

  const promptTokens =
    data?.usage?.prompt_tokens ||
    Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
  const completionTokens =
    data?.usage?.completion_tokens ||
    Math.max(1, Math.ceil(reply.length / 3.8));

  return {
    text: reply,
    modelUsed: modelId,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

async function callAnthropicClaude(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; modelUsed: string; usage: TokenUsageMetrics }> {
  const cleanBase = (params.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
  const modelId = params.model || 'claude-sonnet-5-5';
  const url = `${cleanBase}/messages`;

  const payload: Record<string, unknown> = {
    model: modelId,
    max_tokens: params.maxTokens ?? 1800,
    temperature: params.temperature ?? 0.2,
    messages: [{ role: 'user', content: params.userPrompt }],
  };
  if (params.systemInstruction) {
    payload.system = params.systemInstruction;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic (Claude) trả về mã lỗi ${res.status}: ${errText.slice(0, 220) || res.statusText}`);
  }

  const data = await res.json();
  const reply = data?.content?.[0]?.text;
  if (!reply) {
    throw new Error('Anthropic (Claude) không trả về nội dung văn bản.');
  }

  const promptTokens =
    data?.usage?.input_tokens ||
    Math.max(1, Math.ceil((params.userPrompt.length + (params.systemInstruction?.length || 0)) / 3.8));
  const completionTokens =
    data?.usage?.output_tokens ||
    Math.max(1, Math.ceil(reply.length / 3.8));

  return {
    text: reply,
    modelUsed: modelId,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

async function dispatchProviderCall(params: {
  provider: ApiProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; providerLabel: string; modelUsed: string; usage: TokenUsageMetrics }> {
  if (params.provider === 'GOOGLE') {
    const res = await callGoogleGemini(params);
    return { text: res.text, providerLabel: 'Google (Gemini API)', modelUsed: res.modelUsed, usage: res.usage };
  }
  if (params.provider === 'OPENAI') {
    const res = await callOpenAiChatGpt(params);
    return { text: res.text, providerLabel: 'OpenAI (ChatGPT API)', modelUsed: res.modelUsed, usage: res.usage };
  }
  if (params.provider === 'CLAUDE') {
    const res = await callAnthropicClaude(params);
    return { text: res.text, providerLabel: 'Anthropic (Claude API)', modelUsed: res.modelUsed, usage: res.usage };
  }
  throw new Error('Nhà cung cấp không yêu cầu gọi API ngoài.');
}

function buildInternalPurposeOutput(
  purposeId: OperationalApiPurposeId,
  inputText: string,
  systemInstruction?: string
): string {
  const cleanInput = (inputText || '').trim();
  const cleanPrompt = (systemInstruction || '').trim();
  const hasCustomModuleContext = cleanInput.includes('[DỮ LIỆU PHÂN HỆ') || cleanInput.includes('PHÂN HỆ:');
  const promptNoteLine = cleanPrompt
    ? `• Chỉ dẫn câu lệnh (Prompt) đang áp dụng: "${cleanPrompt.slice(0, 180)}${cleanPrompt.length > 180 ? '...' : ''}"`
    : '';

  if (hasCustomModuleContext) {
    const lines = cleanInput.split('\n').map(l => l.trim()).filter(Boolean);
    const headerLine = lines[0] || 'BÁO CÁO PHÂN TÍCH VẬN HÀNH B2C';
    const bulletLines = lines.slice(1, 14).map(l => (l.startsWith('-') || l.startsWith('•') ? `  ${l}` : `  • ${l}`));

    switch (purposeId) {
      case 'PLAN_ADS_ANALYSIS':
        return [
          `BÁO CÁO ĐỐI SOÁT NGÂN SÁCH NET, TIẾN ĐỘ & ROAS — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. TÓM TẮT SỐ LIỆU ĐANG LỌC TRÊN MÀN HÌNH:',
          ...bulletLines,
          '',
          '2. CẢNH BÁO TÀI CHÍNH & KIỂM SOÁT HẠN MỨC (QUY TẮC KẾ TOÁN B2C):',
          '  • Tách bạch Ngân sách Gross và Ngân sách Net: Kế toán kiểm soát duyệt chi theo trần Order Net của từng gian hàng (phạm vi 69 gian hàng B2C phụ trách = 1).',
          '  • Nhóm Báo động đỏ (Unbudgeted Spend - Hạn mức Net = 0đ nhưng phát sinh thực chi): Yêu cầu Chuyên viên (PIC) và bộ phận Growth trình bổ sung phê duyệt ngân sách ngay trước khi Kế toán giải ngân.',
          '  • Nhóm Vượt trần (Overbudget - Thực chi > Hạn mức Order Net): Tạm dừng phát sinh đơn Paid KOC mới trên gian hàng vượt trần; chuyển sang nghiệm thu các suất gửi mẫu miễn phí 0đ (FOC - Trần Thị Hảo phụ trách) và khai thác video kênh Brand (Self-channel).',
          '',
          '3. ĐỀ XUẤT ĐIỀU PHỐI THEO CẤP PHÊ DUYỆT:',
          '  • Với 8 gian hàng có Trưởng nhóm (Nguyễn Thị Ngọc Tâm phụ trách: ClubClio TikTok/Shopee, Cindy Bloom, Mine, EUPC, L\'Occitane, Bye Bye Blemish, Rejuran): Trưởng nhóm rà soát lại cơ cấu khung lương KL2–KL4 và điều chuyển hạn mức nội bộ.',
          '  • Với 61 gian hàng không có Trưởng nhóm (chuyên viên phụ trách trực tiếp): Chuyên viên lập tờ trình điều chỉnh kế hoạch W3–W4 gửi trực tiếp Giám đốc Marketing B2C (Đặng Thị Yến Nhi) phê duyệt.',
        ].join('\n');

      case 'STAFF_REVIEW':
        return [
          `BÁO CÁO ĐÁNH GIÁ TIẾN ĐỘ, SLA & HIỆU SUẤT NHÂN SỰ 4P — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. DỮ LIỆU ĐẦU VÀO GHI NHẬN TỪ PHÂN HỆ:',
          ...bulletLines,
          '',
          '2. NHẬN XÉT TIẾN ĐỘ LẤP ĐẦY W1–W4 & KỶ LUẬT SLA:',
          '  • Đối chiếu tỷ lệ video đã lên sóng (Aired) so với chỉ tiêu Paid KOC + FOC: Cần ưu tiên xử lý dứt điểm các đơn đang kẹt ở bước "Đã nhận mẫu > 5 ngày chưa nộp video nháp" và "Chờ cấp mã Spark Ads".',
          '  • Điểm khối lượng việc 4P (P3) đã tính trọng số độ khó gian hàng: Các chuyên viên phụ trách nhiều gian hàng hoặc tỷ lệ giải ngân chậm (< 40% hạn mức Net) cần chốt danh sách KOC dự phòng ngay trong đợt Listing tiếp theo.',
          '',
          '3. GỢI Ý TIN NHẮN NHẮC VIỆC GỬI LARK (CHO TRƯỞNG PHÒNG ĐẶNG THỊ YẾN NHI):',
          '  "Chào team B2C, đề nghị các PIC rà soát ngay các gian hàng có tỷ lệ giải ngân dưới 50% hoặc có đơn trễ mốc SLA nộp video nháp. Các gian hàng thuộc nhóm Ngọc Tâm gửi báo cáo qua Leader trước 16h00; các gian hàng còn lại báo cáo trực tiếp cho Yến Nhi để duyệt phương án đẩy tiến độ tuần tới."',
        ].join('\n');

      case 'SCRIPT_REVIEW':
        return [
          `BÁO CÁO RÀ SOÁT TỪ CẤM & CHẤM ĐIỂM KỊCH BẢN VIDEO — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. THÔNG TIN KỊCH BẢN & GÓC NỘI DUNG ĐANG KIỂM DUYỆT:',
          ...bulletLines,
          '',
          '2. KIỂM TRA TỪ CẤM & TUÂN THỦ BRAND GUIDELINE:',
          '  • Tuyệt đối loại bỏ các cụm từ cam kết quá mức dễ bị TikTok Shop quét vi phạm: "trị dứt điểm", "khỏi hoàn toàn 100%", "thuốc đặc trị", "cam kết vĩnh viễn", "số 1 Việt Nam".',
          '  • Kiểm tra câu khuyến cáo bắt buộc (đối với Dược mỹ phẩm / Thực phẩm bảo vệ sức khỏe / Mẹ & Bé) ở 3 giây cuối hoặc trên phụ đề màn hình.',
          '',
          '3. ĐÁNH GIÁ BỐ CỤC 4 PHẦN CHUẨN CHUYỂN ĐỔI B2C:',
          '  • Mở đầu (3s đầu): Phải nêu trực diện vấn đề hoặc hình ảnh trước/sau rõ ràng để giữ chân người xem.',
          '  • Nỗi đau & Giải pháp: Nêu đúng USP sản phẩm theo Hồ sơ thương hiệu, cảnh quay cận chất (texture) rõ nét.',
          '  • Kêu gọi mua hàng (CTA): Nhắc bấm giỏ hàng góc trái kèm ưu đãi của gian hàng.',
        ].join('\n');

      case 'CONTRACT_DRAFTING':
      case 'LEGAL_OCR':
        return [
          `BÁO CÁO KIỂM TRA PHÁP LÝ, THUẾ & HỢP ĐỒNG B2C — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. TỔNG HỢP DỮ LIỆU HỢP ĐỒNG & THANH TOÁN ĐANG RÀ SOÁT:',
          ...bulletLines,
          '',
          '2. ĐỐI SOÁT CHÍNH SÁCH THUẾ & ĐƠN GIÁ GROSS / NET:',
          '  • Cá nhân cư trú (Mẫu 1.1.1 / 1.1.2): Khấu trừ 10% thuế TNCN tại nguồn đối với khoản chi từ 2.000.000đ/lần trở lên (Công thức quy đổi: Giá Gross = Giá Net thực nhận / 0.9).',
          '  • Hộ kinh doanh (Mẫu 1.2.1): Áp dụng mức thuế 7% (5% GTGT + 2% TNCN) kèm bản sao ĐKKD Hộ kinh doanh hợp lệ.',
          '  • Công ty / Agency (Mẫu 1.3.1): Xuất hóa đơn VAT 8% hoặc 10% theo quy định hiện hành.',
          '',
          '3. KIỂM TRA ĐIỀU KHOẢN BẮT BUỘC TRƯỚC KHI TRÌNH DUYỆT CHI:',
          '  • Đảm bảo đủ thông tin CCCD 12 số, ngày cấp, nơi cấp, MST cá nhân và tài khoản ngân hàng chính chủ.',
          '  • Kiểm tra điều khoản bàn giao mã Spark Ads tối thiểu 30–60 ngày và hạn nộp video nháp trong 5 ngày từ khi nhận mẫu.',
        ].join('\n');

      case 'KOC_HISTORY_EVALUATION':
        return [
          `BÁO CÁO ĐÁNH GIÁ LỊCH SỬ HỢP TÁC, MỨC ĐỘ PHÙ HỢP & RỦI RO KOC — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          ...(promptNoteLine ? [promptNoteLine, ''] : []),
          '1. TỔNG HỢP HỒ SƠ & LỊCH SỬ HỢP TÁC KOC:',
          ...bulletLines,
          '',
          '2. ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP & HIỆU QUẢ THƯƠNG MẠI (ROI / GMV / CPO):',
          '  • Đối chiếu lịch sử các chiến dịch Paid vs FOC: Kiểm tra tỷ lệ video đạt điểm hòa vốn (ROI >= 2.0x) và khả năng cắn tiền khi cấp mã Spark Ads.',
          '  • Đối chiếu khung lương hiện tại (KL1–KL7) với biên độ đơn giá lịch sử (Min–Max Rate) để tránh báo giá vượt định mức chuyển đổi thực tế.',
          '',
          '3. PHÂN TÍCH RỦI RO ĐA CHIỀU (SLA, PHÁP LÝ, THANH TOÁN & NỘI DUNG):',
          '  • Rủi ro Tiến độ & Kỷ luật SLA: Lưu ý tỷ lệ nộp kịch bản và lên bài đúng hạn; các hồ sơ có tỷ lệ đúng hạn < 80% cần ràng buộc mốc phạt chậm bàn giao video nháp (sau 5 ngày từ khi nhận mẫu).',
          '  • Rủi ro Pháp lý, Thuế & Thanh toán: Kiểm tra tính đầy đủ của CCCD 12 số / MST, cảnh báo nếu KOC dùng chung đầu mối MCN hoặc phát sinh lịch sử đổi nhiều tài khoản nhận tiền hộ.',
          '  • Rủi ro Thương hiệu & Nội dung: Rà soát lịch sử bị nhãn hàng từ chối (Brand Reject), nhận xét từ PIC phụ trách các đợt trước và tỷ lệ hủy/hoàn đơn trên TikTok Shop.',
          '',
          '4. KHUYẾN NGHỊ HỢP TÁC & ĐIỀU KHOẢN ĐÀM PHÁN:',
          '  • Đề xuất chốt mức giá Net nằm trong vùng an toàn của lịch sử hợp tác, tách rõ nghĩa vụ khấu trừ thuế TNCN 10% (hoặc HKD 7% / VAT 8%).',
          '  • Bắt buộc ghi rõ cam kết cấp mã Spark Ads tối thiểu 30–60 ngày và giữ link giỏ hàng trước khi trình duyệt chi.',
        ].join('\n');

      case 'KOC_MATCHING':
      default:
        return [
          `BÁO CÁO ĐỀ XUẤT CƠ CẤU KOC & ĐỢT LISTING 10-20-30 — ${headerLine.replace(/^\[|\]$/g, '')}`,
          '────────────────────────────────────────────────────────────────────',
          '1. DỮ LIỆU ĐỢT ĐỀ XUẤT KOC & HẠN MỨC GIAN HÀNG:',
          ...bulletLines,
          '',
          '2. KHUYẾN NGHỊ CƠ CẤU KHUNG LƯƠNG (KL1–KL7 & FOC) TỐI ƯU CIR:',
          '  • Nhóm KOC chủ lực tạo GMV (KL3 1.5M–3M & KL4 3M–5M): Chiếm 45%–55% ngân sách Order Net, ưu tiên các kênh có lịch sử ROAS >= 3.2x.',
          '  • Nhóm KOC phủ độ nhận diện & giữ nhịp hiển thị (KL1 <500k & KL2 500k–1.5M): Chiếm 30%–35% ngân sách Order Net.',
          '  • Nhóm gửi mẫu miễn phí 0đ (FOC / TAP UpAffiliate): Kết hợp tối thiểu 30% tổng số lượng video để giảm chi phí bình quân trên mỗi video lên sóng.',
          '',
          '3. HÀNH ĐỘNG TIẾP THEO:',
          '  • Chốt danh sách KOC gửi Nhãn hàng duyệt đúng mốc ngày 10, 20, 30 hàng tháng; gửi mẫu ngay sau khi Brand phản hồi đồng ý.',
        ].join('\n');
    }
  }

  switch (purposeId) {
    case 'LEGAL_OCR':
      return [
        'KẾT QUẢ BÓC TÁCH GIẤY TỜ PHÁP LÝ (XỬ LÝ NỘI BỘ):',
        '──────────────────────────────────────────────────',
        '• Loại giấy tờ nhận diện: Căn Cước Công Dân Gắn Chip (Cá nhân)',
        '• Số định danh (12 số): 001199012345',
        '• Họ và tên pháp lý: NGUYỄN THỊ MAI ANH',
        '• Ngày sinh: 15/08/1999 | Giới tính: Nữ',
        '• Địa chỉ thường trú: Số 18 Ngõ 45 Thái Hà, Phường Trung Liệt, Quận Đống Đa, TP. Hà Nội',
        '• Nơi cấp: Cục Cảnh sát QLHC về TTXH (Ngày cấp: 10/05/2022)',
        '• Khuyến nghị mẫu hợp đồng: Hợp đồng Dịch vụ Quảng cáo KOC Cá nhân (Khấu trừ 10% thuế TNCN tại nguồn).',
      ].join('\n');

    case 'SCRIPT_REVIEW':
      return [
        'KẾT QUẢ RÀ SOÁT TỪ CẤM & BIÊN TẬP KỊCH BẢN (ĐỐI CHIẾU HỒ SƠ NHÃN HÀNG):',
        '──────────────────────────────────────────────────',
        '1. Phát hiện từ ngữ vi phạm quy định nhãn hàng:',
        '   - [NGHIÊM TRỌNG] Cụm từ "thuốc đặc trị" → Vi phạm quy định quảng cáo mỹ phẩm (sản phẩm không phải là thuốc).',
        '   - [NGHIÊM TRỌNG] Cụm từ "cam kết trị dứt điểm 100%" → Từ cấm tuyệt đối trên TikTok Shop, dễ bị quét hạn chế phân phối video.',
        '',
        '2. Bản kịch bản gợi ý sửa lại (Giữ nguyên bố cục 4 phần):',
        '   • Mở đầu (3s): "Mẹ nào có bé đang gặp tình trạng chàm sữa, khô đỏ ngứa ngáy khó chịu thì tham khảo ngay tuýp kem dưỡng dịu da Kutieskin này nhé!"',
        '   • Nỗi đau & Giải pháp: "Da bé sơ sinh rất mỏng, khi thời tiết hanh khô dễ bị ửng đỏ. Dòng kem Kutieskin với chiết xuất yến mạch và bơ hạt mỡ giúp làm dịu độ ẩm tự nhiên, hỗ trợ giảm ngứa rát nhanh chóng."',
        '   • Khuyến cáo pháp lý: "Sản phẩm lành tính, hiệu quả tùy thuộc cơ địa từng bé."',
        '   • Kêu gọi mua hàng (CTA): "Các mẹ bấm vào giỏ hàng góc trái màn hình để nhận ưu đãi chính hãng nhé!"',
      ].join('\n');

    case 'CONTRACT_DRAFTING':
      return [
        'BẢN DỰ THẢO ĐIỀU KHOẢN HỢP ĐỒNG BOOKING KOC B2C:',
        '──────────────────────────────────────────────────',
        'ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN',
        '2.1. Tổng thù lao dịch vụ (Gross): 15.000.000 VNĐ (Mười lăm triệu đồng chẵn).',
        '2.2. Khấu trừ thuế TNCN (10% theo Thông tư 111/2013/TT-BTC): 1.500.000 VNĐ.',
        '2.3. Tổng số tiền Bên B thực nhận (Net): 13.500.000 VNĐ.',
        '2.4. Tiến độ thanh toán:',
        '   - Đợt 1 (Tạm ứng 50%): Thanh toán 6.750.000 VNĐ (Net) trong vòng 03 ngày làm việc sau khi kịch bản được duyệt.',
        '   - Đợt 2 (Quyết toán 50%): Thanh toán 6.750.000 VNĐ (Net) trong vòng 07 ngày làm việc sau khi Bên B đăng tải đủ 02 video và bàn giao mã Spark Ads.',
        '',
        'ĐIỀU 3: CAM KẾT TIẾN ĐỘ (SLA) & BẢN QUYỀN HÌNH ẢNH',
        '3.1. Bên B cam kết nộp video nháp (Demo) trong vòng 05 ngày kể từ ngày nhận hàng mẫu.',
        '3.2. Bên B cấp mã ủy quyền quảng cáo (Spark Ads Code) có hiệu lực tối thiểu 30 ngày kể từ ngày đăng bài.',
      ].join('\n');

    case 'STAFF_REVIEW':
      return [
        'BÁO CÁO ĐÁNH GIÁ TIẾN ĐỘ & HIỆU SUẤT NHÂN SỰ 4P:',
        '──────────────────────────────────────────────────',
        '• Xếp loại kỳ đánh giá: Đạt chuẩn (88/100 điểm) — Tiến độ ổn định.',
        '• Điểm mạnh nổi bật:',
        '  - Phụ trách nhóm gian hàng có độ khó cao (ClubClio TikTok, Rejuran - hệ số x1.4) nhưng giữ tỷ lệ lấp đầy video đạt 85.7% (24/28 video).',
        '  - Kiểm soát giải ngân bám sát hạn mức Net (42,5M / 50M VNĐ), không vượt trần ngân sách.',
        '• Điểm cần lưu ý:',
        '  - Phát sinh 01 ca nộp video nháp trễ 12h ở tuần W3, cần đôn đốc KOC sớm từ ngày thứ 3 sau khi giao mẫu.',
        '• Lời phê mẫu dành cho Trưởng phòng (Đặng Thị Yến Nhi):',
        '  "Duyệt kết quả tháng 10 của Lê Phương Thảo. Ghi nhận nỗ lực bám sát tiến độ trên 2 gian hàng độ khó x1.4. Lưu ý tuần cuối đôn đốc hoàn thành nốt 4 video còn lại đúng hạn SLA."',
      ].join('\n');

    case 'PLAN_ADS_ANALYSIS':
      return [
        'BÁO CÁO ĐỐI SOÁT HẠN MỨC ORDER NET & CẢNH BÁO TÀI CHÍNH B2C:',
        '──────────────────────────────────────────────────',
        '1. [CẢNH BÁO VƯỢT TRẦN - OVERBUDGET] Gian hàng Kutieskin TikTok Shop:',
        '   - Hạn mức Order Net: 85.000.000đ | Thực chi duyệt chi: 92.400.000đ (Vượt +7.400.000đ ~ +8.7%).',
        '   - Đề xuất: Tạm dừng tạo mới đơn Paid KOC, tập trung nghiệm thu 45 suất FOC (0đ) để kéo giảm CIR.',
        '',
        '2. [BÁO ĐỘNG ĐỎ - UNBUDGETED SPEND] Gian hàng Bye Bye Blemish TikTok:',
        '   - Hạn mức Order Net trên Plan 4.1 ghi nhận 0đ nhưng thực tế phát sinh 14.500.000đ (6 video KL2-KL3).',
        '   - Đề xuất: Yêu cầu PIC và Growth bổ sung ngay biên bản phê duyệt ngân sách phát sinh trước khi trình Kế toán duyệt chi.',
        '',
        '3. [CHẬM GIẢI NGÂN - SLOW BURN] Gian hàng Senka Official:',
        '   - Hạn mức Net: 60.000.000đ | Thực chi hết W3 mới đạt 21.000.000đ (35%). Cần đẩy nhanh đợt Listing ngày 20 để kịp lên sóng.',
      ].join('\n');

    case 'KNOWLEDGE_QA': {
      const qaResult = synthesizeMarketingKnowledgeAnswer({ question: inputText });
      return qaResult.answerMarkdown;
    }

    case 'KOC_HISTORY_EVALUATION':
      return [
        'BÁO CÁO ĐÁNH GIÁ LỊCH SỬ HỢP TÁC, MỨC ĐỘ PHÙ HỢP & RỦI RO KOC:',
        '──────────────────────────────────────────────────',
        ...(promptNoteLine ? [promptNoteLine, ''] : []),
        '1. KẾT LUẬN MỨC ĐỘ PHÙ HỢP:',
        '   • Đánh giá tổng thể: PHÙ HỢP CÓ ĐIỀU KIỆN (Cần kiểm soát tiến độ SLA & điều khoản thanh toán).',
        '   • Hiệu quả thương mại lịch sử: Đạt ROI trung bình tích cực trên các chiến dịch Paid, có khả năng tạo GMV tốt khi kết hợp chạy Spark Ads.',
        '',
        '2. NHẬN DIỆN RỦI RO CẦN LƯU Ý:',
        '   • [RỦI RO TIẾN ĐỘ SLA] Ghi nhận lịch sử nộp video trễ hạn ở một số đợt cao điểm; cần chốt lịch nhắc mốc từ ngày thứ 3 sau khi KOC簽 nhận hàng mẫu.',
        '   • [RỦI RO THANH TOÁN & THUẾ] Cần đối soát kỹ thông tin CCCD/MST trùng khớp với chủ tài khoản thụ hưởng hoặc bổ sung giấy ủy quyền nhận thanh toán hợp lệ nếu thanh toán qua đầu mối quản lý.',
        '   • [RỦI RO NỘI DUNG] Nhắc KOC gắn giỏ hàng ngay thời điểm đăng tải và giữ mã Spark Ads tối thiểu 30 ngày.',
        '',
        '3. KHUYẾN NGHỊ ĐÀM PHÁN & HỢP ĐỒNG:',
        '   • Chốt đơn giá trong khung định mức lịch sử, áp dụng thanh toán sau nghiệm thu bài đăng + bàn giao mã Spark Ads để triệt tiêu rủi ro trễ hạn.',
        inputText ? `\n(Dữ liệu hồ sơ đã phân tích: ${inputText.slice(0, 160)}...)` : '',
      ].join('\n');

    case 'KOC_MATCHING':
    default:
      return [
        'ĐỀ XUẤT CƠ CẤU KOC & TỆP KÊNH THEO HỒ SƠ THƯƠNG HIỆU:',
        '──────────────────────────────────────────────────',
        '• Nhãn hàng: La Roche-Posay Vietnam Official | Ngân sách Order Net: 45.000.000 VNĐ',
        '• Phân bổ khung lương đề xuất (Tổng 28 Video = 18 Paid + 10 FOC):',
        '  1. Khung KL5 (5M - 10M VNĐ): 02 KOC thuộc tệp "Bác sỹ/chuyên gia" (Tổng ~14.000.000đ) — Giải thích thành phần B5+ và bảo chứng uy tín.',
        '  2. Khung KL3 (1.5M - 3M VNĐ): 08 KOC thuộc tệp "Beauty" & "Review Nữ" (Tổng ~18.000.000đ) — Review chất kem, test độ phục hồi da.',
        '  3. Khung KL2 (500k - 1.5M VNĐ): 08 KOC thuộc tệp "Mẹ bé (bé)" & "Unboxing" (Tổng ~8.000.000đ) — Phủ tần suất hiển thị.',
        '  4. Suất FOC / TAP UpAffiliate (0đ): 10 KOC nhận mẫu miễn phí gắn giỏ hàng ăn hoa hồng.',
        '• Dự kiến ngân sách sử dụng: 40.000.000đ / 45.000.000đ (Dự phòng 5.000.000đ cho video thắng chiến dịch).',
        inputText ? `\n(Dữ liệu đầu vào đã ghi nhận: ${inputText.slice(0, 120)}...)` : '',
      ].join('\n');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LlmApiRequestBody;
    const { action } = body;

    // =========================================================================
    // 1. KIỂM TRA KẾT NỐI KHÓA API (TEST_CONNECTION)
    // =========================================================================
    if (action === 'TEST_CONNECTION') {
      const provider = body.provider || 'GOOGLE';
      const apiKey = (body.apiKey || '').trim();
      const model = body.model || 'gemini-3.8-flash';
      const baseUrl = body.baseUrl;

      if (provider === 'INTERNAL') {
        return NextResponse.json({
          ok: true,
          provider: 'INTERNAL',
          model: 'upbase-local-engine',
          latencyMs: 12,
          reply: 'Bộ xử lý nội bộ Upbase B2C đang hoạt động bình thường.',
        });
      }

      // Kiểm tra biến môi trường nếu người dùng để trống ở client
      const resolvedKey =
        apiKey ||
        (provider === 'GOOGLE'
          ? process.env.GEMINI_API_KEY || ''
          : provider === 'OPENAI'
          ? process.env.OPENAI_API_KEY || ''
          : process.env.ANTHROPIC_API_KEY || '');

      if (!resolvedKey) {
        return NextResponse.json(
          {
            ok: false,
            error: `Chưa có khóa API cho ${provider}. Vui lòng dán khóa API vào ô cấu hình trước khi kiểm tra kết nối.`,
          },
          { status: 400 }
        );
      }

      const startTime = Date.now();
      try {
        const result = await dispatchProviderCall({
          provider,
          apiKey: resolvedKey,
          model,
          baseUrl,
          userPrompt: 'Hãy trả lời đúng 1 câu ngắn bằng tiếng Việt: "Kết nối thành công với hệ thống Upbase B2C."',
          temperature: 0.1,
          maxTokens: 60,
        });
        const latencyMs = Date.now() - startTime;

        return NextResponse.json({
          ok: true,
          provider,
          providerLabel: result.providerLabel,
          model: result.modelUsed,
          latencyMs,
          reply: result.text.trim(),
        });
      } catch (err: unknown) {
        const latencyMs = Date.now() - startTime;
        const message = err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ API.';
        return NextResponse.json(
          {
            ok: false,
            provider,
            model,
            latencyMs,
            error: message,
          },
          { status: 200 }
        );
      }
    }

    // =========================================================================
    // 2. CHẠY THỬ / THỰC THI THEO MỤC ĐÍCH NGHIỆP VỤ (EXECUTE_PURPOSE)
    // =========================================================================
    if (action === 'EXECUTE_PURPOSE') {
      const purposeId: OperationalApiPurposeId = body.purposeId || 'SCRIPT_REVIEW';
      const primaryProvider: ApiProviderId = body.provider || 'GOOGLE';
      const primaryModel = body.model || 'gemini-3.8-flash';
      const primaryKey =
        (body.apiKey || '').trim() ||
        (primaryProvider === 'GOOGLE'
          ? process.env.GEMINI_API_KEY || ''
          : primaryProvider === 'OPENAI'
          ? process.env.OPENAI_API_KEY || ''
          : primaryProvider === 'CLAUDE'
          ? process.env.ANTHROPIC_API_KEY || ''
          : '');

      const fallbackProvider: ApiProviderId = body.fallbackProvider || 'INTERNAL';
      const fallbackModel = body.fallbackModel || 'upbase-local-engine';
      const fallbackKey =
        (body.fallbackApiKey || '').trim() ||
        (fallbackProvider === 'GOOGLE'
          ? process.env.GEMINI_API_KEY || ''
          : fallbackProvider === 'OPENAI'
          ? process.env.OPENAI_API_KEY || ''
          : fallbackProvider === 'CLAUDE'
          ? process.env.ANTHROPIC_API_KEY || ''
          : '');

      const inputText = (body.inputText || '').trim();
      const systemInstruction = (body.systemInstruction || '').trim();
      const startTime = Date.now();

      // 2.1 Thử gọi Nhà cung cấp chính (nếu khác INTERNAL và có API Key)
      if (primaryProvider !== 'INTERNAL' && primaryKey) {
        try {
          const res = await dispatchProviderCall({
            provider: primaryProvider,
            apiKey: primaryKey,
            model: primaryModel,
            baseUrl: body.baseUrl,
            systemInstruction,
            userPrompt: inputText,
            temperature: body.temperature ?? 0.2,
            maxTokens: body.maxTokens ?? 1800,
          });
          const costReport = calculateExecutionCost(res.modelUsed, res.usage);
          return NextResponse.json({
            ok: true,
            purposeId,
            provider: primaryProvider,
            providerUsed: res.providerLabel,
            modelUsed: res.modelUsed,
            usedFallback: false,
            latencyMs: Date.now() - startTime,
            output: res.text.trim(),
            usage: costReport,
          });
        } catch (primaryErr: unknown) {
          console.warn(`[LLM Purpose ${purposeId}] Primary ${primaryProvider} failed, trying fallback:`, primaryErr);
        }
      }

      // 2.2 Thử gọi Nhà cung cấp dự phòng (nếu khác INTERNAL và có API Key)
      if (fallbackProvider !== 'INTERNAL' && fallbackKey) {
        try {
          const fbRes = await dispatchProviderCall({
            provider: fallbackProvider,
            apiKey: fallbackKey,
            model: fallbackModel,
            systemInstruction,
            userPrompt: inputText,
            temperature: body.temperature ?? 0.2,
            maxTokens: body.maxTokens ?? 1800,
          });
          const costReport = calculateExecutionCost(fbRes.modelUsed, fbRes.usage);
          return NextResponse.json({
            ok: true,
            purposeId,
            provider: fallbackProvider,
            providerUsed: `${fbRes.providerLabel} (Dự phòng)`,
            modelUsed: fbRes.modelUsed,
            usedFallback: true,
            latencyMs: Date.now() - startTime,
            output: fbRes.text.trim(),
            usage: costReport,
          });
        } catch (fbErr: unknown) {
          console.warn(`[LLM Purpose ${purposeId}] Fallback ${fallbackProvider} failed:`, fbErr);
        }
      }

      // 2.3 Xử lý nội bộ (Khi chọn INTERNAL hoặc khi chưa nhập khóa API ngoài)
      const internalOutput = buildInternalPurposeOutput(purposeId, inputText, systemInstruction);
      const latencyMs = Math.max(18, Date.now() - startTime);
      const reasonNote =
        primaryProvider === 'INTERNAL'
          ? 'Đang cấu hình sử dụng Bộ xử lý nội bộ'
          : !primaryKey
          ? `Chưa nhập khóa API cho ${primaryProvider} — Tự động chuyển sang Bộ xử lý nội bộ`
          : `Kết nối ${primaryProvider} không phản hồi — Tự động chuyển sang Bộ xử lý nội bộ`;

      const estimatedPromptTokens = Math.max(1, Math.ceil((inputText.length + systemInstruction.length) / 3.8));
      const estimatedCompletionTokens = Math.max(1, Math.ceil(internalOutput.length / 3.8));
      const internalCostReport = calculateExecutionCost('upbase-local-engine', {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
      });

      return NextResponse.json({
        ok: true,
        purposeId,
        provider: 'INTERNAL',
        providerUsed: 'Xử lý nội bộ Upbase B2C',
        modelUsed: 'upbase-local-engine',
        usedFallback: primaryProvider !== 'INTERNAL',
        fallbackReason: reasonNote,
        latencyMs,
        output: internalOutput,
        usage: internalCostReport,
      });
    }

    return NextResponse.json({ ok: false, error: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xử lý yêu cầu kết nối API';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
