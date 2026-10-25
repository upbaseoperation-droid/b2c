// ============================================================================
// TRUNG TÂM HỌC TẬP & ĐỘNG CƠ KHẢO THÍ SÁT HẠCH MARKETING B2C (UPBASE)
// Quản lý khóa học thực chiến, ngân hàng đề thi trắc nghiệm & tình huống,
// chấm điểm tự động và khởi tạo khóa học/bộ đề từ dữ liệu SOP & Nhãn hàng thật.
// ============================================================================

import { BrandDetail, StorePortfolioItem } from './types';
import { KnowledgeCategoryId } from './marketingKnowledgeBase';

export interface ExamOption {
  key: 'A' | 'B' | 'C' | 'D';
  label: string;
}

export interface ExamQuestion {
  id: string;
  prompt: string;
  type: 'MULTIPLE_CHOICE' | 'SCENARIO_CASE';
  options: ExamOption[];
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  citedSopCode: string;
  brandScope?: string;
}

export interface ExamQuiz {
  id: string;
  code: string;
  title: string;
  targetRole: string;
  brandName?: string;
  passScorePct: number;
  timeLimitMinutes: number;
  questions: ExamQuestion[];
  createdAt: string;
  isCustomGenerated?: boolean;
}

export interface TrainingModule {
  id: string;
  title: string;
  durationMinutes: number;
  content: string;
  linkedSopCode?: string;
  caseStudy?: {
    title: string;
    scenario: string;
    keyTakeaway: string;
  };
}

export interface TrainingCourse {
  id: string;
  code: string;
  title: string;
  targetRole: string;
  difficulty: 'CƠ_BẢN' | 'NÂNG_CAO' | 'CHUYÊN_SÂU';
  durationMinutes: number;
  category: KnowledgeCategoryId;
  brandName?: string;
  summary: string;
  modules: TrainingModule[];
  quizId: string;
  enrolledCount?: number;
  completedCount?: number;
  isCustomGenerated?: boolean;
  createdAt: string;
}

export interface UserExamAttempt {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  startedAt: string;
  submittedAt?: string;
  userAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
}

// ============================================================================
// BỘ ĐỀ SÁT HẠCH CHUẨN CỐ ĐỊNH (PRE-BUILT QUIZZES DỰA TRÊN DỮ LIỆU THẬT)
// ============================================================================

export const PREBUILT_EXAM_QUIZZES: ExamQuiz[] = [
  {
    id: 'quiz-plan-01',
    code: 'EXAM-PLAN-01',
    title: 'Sát hạch Quy trình Lập Kế hoạch & Quản trị Hạn mức 69 Gian hàng B2C',
    targetRole: 'Chuyên viên Booking & Quản lý',
    passScorePct: 80,
    timeLimitMinutes: 15,
    createdAt: '2026-10-25',
    questions: [
      {
        id: 'q-plan-01',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Gian hàng do chuyên viên phụ trách không có Trưởng nhóm (Leader) thì quy trình trình duyệt Kế hoạch tháng được thực hiện như thế nào?',
        options: [
          { key: 'A', label: 'Tự động duyệt nếu ngân sách dưới 50 triệu đồng mà không cần trình duyệt cấp trên.' },
          { key: 'B', label: 'Chuyên viên chủ động lập phân rã và trình duyệt trực tiếp lên Giám đốc Marketing (Đặng Thị Yến Nhi) mà không cần bước sơ duyệt trung gian.' },
          { key: 'C', label: 'Phải nhờ Trưởng nhóm của gian hàng khác ký duyệt hộ trước khi gửi lên Ban Giám đốc.' },
          { key: 'D', label: 'Chuyển sang bộ phận Kế toán ký duyệt ngân sách trước rồi mới gửi Giám đốc Marketing.' },
        ],
        correctKey: 'B',
        explanation: 'Theo quy định tại Mục 3 GEMINI.md và POL-ORG-01: Các gian hàng không có Leader hoặc Cột 55 File 4.1.1 để trống thì ghi nhận không có Leader, chuyên viên trình duyệt trực tiếp lên Giám đốc Marketing (Đặng Thị Yến Nhi).',
        citedSopCode: 'POL-ORG-01 Điểm 4 & GEMINI.md Mục 3',
      },
      {
        id: 'q-plan-02',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: Gian hàng Cathy Doll TikTok được giao hạn mức Order Net là 45.000.000đ. Chuyên viên dự kiến book 3 KOC cá nhân (mỗi KOC nhận Net 12.000.000đ) và gửi mẫu FOC cho 10 KOC khác. Kế toán sẽ kiểm soát ngân sách theo số nào?',
        options: [
          { key: 'A', label: 'Kiểm soát theo số Gross bao gồm cả thuế TNCN 10% là 40.000.000đ.' },
          { key: 'B', label: 'Kiểm soát theo hạn mức Net 45.000.000đ; chi phí 3 KOC là 36.000.000đ Net, còn suất gửi mẫu FOC chi phí là 0đ không tính vào trần chi phí cứng.' },
          { key: 'C', label: 'Cộng tiền gửi mẫu FOC định giá 500.000đ/suất vào ngân sách Net thành 41.000.000đ.' },
          { key: 'D', label: 'Bắt buộc nâng ngân sách lên 50.000.000đ mới đủ chi trả cả thuế và phí vận chuyển mẫu.' },
        ],
        correctKey: 'B',
        explanation: 'Theo SOP-PLAN-01 và GEMINI.md: Kế toán kiểm soát chi ngân sách theo hạn mức Net. Suất gửi mẫu FOC ghi nhận chi phí 0đ, không làm tăng chi phí cát-xê Net của chiến dịch.',
        citedSopCode: 'SOP-PLAN-01 Mục II.4 & GEMINI.md Mục 3',
        brandScope: 'Cathy Doll',
      },
      {
        id: 'q-plan-03',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Trường hợp nào sau đây hệ thống B2C Ops Hub sẽ kích hoạt cảnh báo đỏ "Unbudgeted Spend"?',
        options: [
          { key: 'A', label: 'Gian hàng có chi phí thực chi vượt 10% hạn mức Order Net được giao.' },
          { key: 'B', label: 'Gian hàng phát sinh chi phí duyệt chi thực tế lớn nhưng hạn mức Order ghi nhận 0đ trong File 4.1.' },
          { key: 'C', label: 'KOC nộp kịch bản trễ 24 giờ so với mốc thỏa thuận trong hợp đồng.' },
          { key: 'D', label: 'Gian hàng đạt doanh thu GMV thấp hơn 50% so với kế hoạch tháng đề ra.' },
        ],
        correctKey: 'B',
        explanation: 'Theo nguyên tắc cảnh báo tài chính tại GEMINI.md: Báo động đỏ Unbudgeted Spend xuất hiện khi có gian hàng phát sinh chi phí lớn nhưng hạn mức Order ghi nhận 0đ, yêu cầu bổ sung phê duyệt ngân sách.',
        citedSopCode: 'GEMINI.md Mục 3 & SOP-PLAN-01',
      },
      {
        id: 'q-plan-04',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Các đợt xét duyệt và chốt danh sách KOC định kỳ hàng tháng (Batch Listing) diễn ra vào các ngày nào?',
        options: [
          { key: 'A', label: 'Ngày 01, ngày 15 và ngày 30 hàng tháng.' },
          { key: 'B', label: 'Ngày 05, ngày 15 và ngày 25 hàng tháng.' },
          { key: 'C', label: 'Ngày 10, ngày 20 và ngày 30 hàng tháng (Batch 10, Batch 20, Batch 30).' },
          { key: 'D', label: 'Vào mỗi sáng Thứ Hai đầu tuần.' },
        ],
        correctKey: 'C',
        explanation: 'Theo SOP-PLAN-01: Hệ thống B2C vận hành theo 3 đợt chốt listing KOC cố định trong tháng là Đợt ngày 10 (Batch 10), Đợt ngày 20 (Batch 20) và Đợt ngày 30 (Batch 30).',
        citedSopCode: 'SOP-PLAN-01 Mục I.2 & Lịch mốc B2C',
      },
      {
        id: 'q-plan-05',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: Khi phân rã kế hoạch tháng 10/2026, Brand Rejuran có ngân sách phân bổ cho gian hàng Shopee là 25 triệu và TikTok là 35 triệu. Chuyên viên có được tự ý chuyển 10 triệu từ Shopee sang TikTok không?',
        options: [
          { key: 'A', label: 'Được tự ý chuyển vì cùng thuộc tổng ngân sách 60 triệu của một Brand Rejuran.' },
          { key: 'B', label: 'Không được tự ý điều chuyển giữa các sàn; phải lập phiếu điều chỉnh ngân sách và được Giám đốc Marketing phê duyệt.' },
          { key: 'C', label: 'Chỉ cần báo với chuyên viên phụ trách sàn Shopee qua Zalo là được.' },
          { key: 'D', label: 'Được chuyển nếu doanh số TikTok trong tuần đầu tiên đạt trên 100 triệu GMV.' },
        ],
        correctKey: 'B',
        explanation: 'Hạn mức Order được duyệt và ký chốt chi tiết theo từng gian hàng/sàn. Việc điều chuyển ngân sách giữa các sàn làm thay đổi P&L của từng gian hàng nên bắt buộc phải có phê duyệt điều chỉnh từ Giám đốc Marketing.',
        citedSopCode: 'POL-ORG-01 Điều 3 & SOP-PLAN-01',
        brandScope: 'Rejuran',
      },
    ],
  },
  {
    id: 'quiz-qc-01',
    code: 'EXAM-QC-01',
    title: 'Sát hạch Tiêu chuẩn Kiểm duyệt Kịch bản Video & 110 Từ khóa cấm sàn TMĐT',
    targetRole: 'Sáng tạo Nội dung & Kiểm duyệt (QC)',
    passScorePct: 80,
    timeLimitMinutes: 15,
    createdAt: '2026-10-25',
    questions: [
      {
        id: 'q-qc-01',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Trong các cụm từ sau, cụm từ nào bị CẤM TUYỆT ĐỐI xuất hiện trong kịch bản video TikTok Shop/Shopee ngành Mỹ phẩm?',
        options: [
          { key: 'A', label: '"Hỗ trợ làm sáng da và mờ vết thâm sạm sau 2 tuần sử dụng".' },
          { key: 'B', label: '"Cam kết trị dứt điểm 100% mụn viêm và chữa khỏi hoàn toàn trong 3 ngày".' },
          { key: 'C', label: '"Kết cấu mỏng nhẹ, thấm nhanh không gây bết rít".' },
          { key: 'D', label: '"Chiết xuất từ rau má thiên nhiên lành tính cho da nhạy cảm".' },
        ],
        correctKey: 'B',
        explanation: 'Theo SOP-QC-01 (Mục II: 110 Quy tắc kiểm duyệt nội dung): Các từ cam kết tuyệt đối "trị dứt điểm", "chữa khỏi hoàn toàn", "cam kết 100%" bị cấm tuyệt đối vì vi phạm chính sách quảng cáo sàn và luật dược mỹ phẩm.',
        citedSopCode: 'SOP-QC-01 Mục II.2 & Danh mục 110 từ cấm',
      },
      {
        id: 'q-qc-02',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: KOC gửi kịch bản video có cảnh mở đầu (0-3s): "So với tuýp kem chống nắng nhãn hiệu X bôi lên vừa bết vừa vón cục thì tuýp Cathy Doll này tốt gấp 10 lần!". Kịch bản này có đạt tiêu chuẩn kiểm duyệt không?',
        options: [
          { key: 'A', label: 'Đạt, vì khơi gợi được sự tò mò và so sánh trực diện giúp video dễ lên xu hướng.' },
          { key: 'B', label: 'Không đạt, vì vi phạm quy định so sánh dìm hàng nhãn hàng đối thủ trực tiếp và dùng từ phóng đại phi thực tế.' },
          { key: 'C', label: 'Đạt nếu che mờ logo của nhãn hiệu X đi là được.' },
          { key: 'D', label: 'Đạt nếu KOC có trên 500.000 người theo dõi.' },
        ],
        correctKey: 'B',
        explanation: 'Theo SOP-QC-01 và Brand Guideline Cathy Doll: Tuyệt đối không so sánh dìm hàng đối thủ trực tiếp hoặc nói xấu thương hiệu khác; không dùng tuyên bố phóng đại vô căn cứ ("tốt gấp 10 lần").',
        citedSopCode: 'SOP-QC-01 Mục II.4 & Brand Guideline Cathy Doll',
        brandScope: 'Cathy Doll',
      },
      {
        id: 'q-qc-03',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Thời hạn SLA tối đa để nhân sự Content B2C duyệt hoặc phản hồi chỉnh sửa kịch bản cho KOC là bao lâu?',
        options: [
          { key: 'A', label: 'Trong vòng 12 giờ làm việc kể từ khi KOC gửi kịch bản.' },
          { key: 'B', label: 'Trong vòng 24 giờ làm việc kể từ khi KOC gửi kịch bản.' },
          { key: 'C', label: 'Trong vòng 48 giờ làm việc.' },
          { key: 'D', label: 'Tùy ý, miễn là trước ngày video chính thức lên sóng.' },
        ],
        correctKey: 'B',
        explanation: 'Theo bảng 22 mốc SLA B2C: Mốc SLA duyệt kịch bản KOC là 24 giờ làm việc. Nếu quá 24h không phản hồi sẽ bị tính vi phạm SLA tiến độ bộ phận Content.',
        citedSopCode: 'SLA-QC-01 (Mốc 24h duyệt kịch bản)',
      },
      {
        id: 'q-qc-04',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Quy chuẩn thời lượng tối ưu cho 1 video Review Booking trên TikTok Shop đạt tỷ lệ chuyển đổi cao là:',
        options: [
          { key: 'A', label: 'Dưới 15 giây (chỉ cần quay lướt qua sản phẩm).' },
          { key: 'B', label: 'Từ 35 giây đến 55 giây (đủ 4 phần: Hook 3s, Nỗi đau, Trải nghiệm chất kem/Texture, và Kêu gọi mua giỏ hàng).' },
          { key: 'C', label: 'Trên 3 phút (phân tích sâu thành phần hóa học).' },
          { key: 'D', label: 'Từ 90 giây đến 120 giây.' },
        ],
        correctKey: 'B',
        explanation: 'Theo SOP-QC-01: Video booking tối ưu giữ chân người xem ở 35s - 55s, đảm bảo Hook 2s đạt trên 28% và CVR chuyển đổi đơn hàng đạt đỉnh.',
        citedSopCode: 'SOP-QC-01 Mục I.3 & Chuẩn TikTok Seller Ads',
      },
      {
        id: 'q-qc-05',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: Video của KOC đã đăng tải lên kênh nhưng bị TikTok tắt tiếng do bản quyền âm nhạc thương mại. Chuyên viên cần xử lý như thế nào trong vòng 12 giờ?',
        options: [
          { key: 'A', label: 'Kệ video vì người xem vẫn nhìn thấy hình ảnh và giỏ hàng.' },
          { key: 'B', label: 'Yêu cầu KOC xóa video ngay lập tức và hủy đơn hợp đồng.' },
          { key: 'C', label: 'Yêu cầu KOC vào CapCut/TikTok đổi âm thanh thương mại được phép sử dụng hoặc tải lại video có nhạc bản quyền thương mại trong kho của TikTok.' },
          { key: 'D', label: 'Tắt giỏ hàng TikTok Shop đi và chạy Spark Ads để bù tương tác.' },
        ],
        correctKey: 'C',
        explanation: 'Theo FAQ số 31 và SOP-QC-01: Khi video bị tắt tiếng do bản quyền nhạc, KOC phải đổi sang bài hát thuộc kho âm thanh thương mại của TikTok trong vòng 12h để giữ được tương tác và giỏ hàng.',
        citedSopCode: 'FAQ-31 & SOP-QC-01 Mục IV.2',
      },
    ],
  },
  {
    id: 'quiz-legal-01',
    code: 'EXAM-LEGAL-01',
    title: 'Sát hạch Pháp lý Hợp đồng, Biểu mẫu Chuẩn & Chính sách Thuế TNCN / VAT',
    targetRole: 'Pháp chế, Kế toán & Chuyên viên Booking',
    passScorePct: 80,
    timeLimitMinutes: 15,
    createdAt: '2026-10-25',
    questions: [
      {
        id: 'q-leg-01',
        type: 'MULTIPLE_CHOICE',
        prompt: 'KOC cá nhân (không có Mã số thuế Hộ kinh doanh) thỏa thuận nhận thù lao Net là 9.000.000đ. Giá trị Gross ghi trên hợp đồng dịch vụ là bao nhiêu và thuế TNCN khấu trừ là bao nhiêu?',
        options: [
          { key: 'A', label: 'Gross: 9.000.000đ; Khấu trừ thuế TNCN 0đ vì chưa đến mức chịu thuế.' },
          { key: 'B', label: 'Gross: 9.900.000đ; Khấu trừ thuế TNCN 900.000đ.' },
          { key: 'C', label: 'Gross: 10.000.000đ; Khấu trừ thuế TNCN 10% (1.000.000đ), số thực nhận đúng 9.000.000đ.' },
          { key: 'D', label: 'Gross: 10.800.000đ; Khấu trừ cả thuế VAT và TNCN là 1.800.000đ.' },
        ],
        correctKey: 'C',
        explanation: 'Theo SOP-LEGAL-01 và quy định thuế TNCN đối với thù lao dịch vụ từ 2.000.000đ trở lên: Giá Gross = Giá Net / 0.9 = 9.000.000 / 0.9 = 10.000.000đ. Thuế TNCN khấu trừ 10% tại nguồn là 1.000.000đ.',
        citedSopCode: 'SOP-LEGAL-01 Điều 3.1 & Thông tư 111/2013/TT-BTC',
      },
      {
        id: 'q-leg-02',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Trường hợp KOC ký hợp đồng với tư cách Hộ kinh doanh cá thể (HKD) có đăng ký ngành nghề quảng cáo, mức thuế khấu trừ theo quy định là bao nhiêu?',
        options: [
          { key: 'A', label: 'Khấu trừ 10% thuế TNCN giống như cá nhân vãng lai.' },
          { key: 'B', label: 'HKD xuất hóa đơn dịch vụ hoặc nộp thuế khoán 7% (5% VAT + 2% TNCN) theo quy định của cơ quan thuế.' },
          { key: 'C', label: 'Miễn toàn bộ thuế nếu doanh thu cả năm dưới 500 triệu đồng.' },
          { key: 'D', label: 'Khấu trừ 20% thuế thu nhập doanh nghiệp.' },
        ],
        correctKey: 'B',
        explanation: 'Theo SOP-LEGAL-01 Điều 3.2: Hộ kinh doanh có đăng ký ngành nghề chịu thuế suất dịch vụ quảng cáo là 7% (5% VAT + 2% TNCN) và xuất hóa đơn hợp pháp cho công ty.',
        citedSopCode: 'SOP-LEGAL-01 Điều 3.2 & Biểu mẫu 2.1',
      },
      {
        id: 'q-leg-03',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: Nhân sự tạo Deal Booking gồm Video TikTok (Asset chính) và Dịch vụ cấp mã Spark Ads 30 ngày. Video chưa lên sóng (chưa có link nghiệm thu Bước 1), chuyên viên có được lập phiếu Quyết toán thanh toán không?',
        options: [
          { key: 'A', label: 'Được lập phiếu thanh toán nếu KOC đã gửi trước mã Spark Ads qua tin nhắn.' },
          { key: 'B', label: 'Được thanh toán nếu KOC cam kết sẽ lên video vào ngày hôm sau.' },
          { key: 'C', label: 'Tuyệt đối KHÔNG; hệ thống áp dụng quy tắc Nghiệm thu 2 bước tuần tự, Bước 2 bị khóa chặt tới khi Video gốc ở Bước 1 được nghiệm thu đạt.' },
          { key: 'D', label: 'Được thanh toán 50% tạm ứng cho phần video, còn mã Ads thanh toán sau.' },
        ],
        correctKey: 'C',
        explanation: 'Theo quy trình Nghiệm thu 2 bước tuần tự (FR-030 & SOP-LEGAL-01): Toàn bộ các dịch vụ gia tăng (mã Ads, hình ảnh) ở Bước 2 đều bị khóa cứng (LOCKED_BY_VIDEO) cho đến khi Video gốc được nghiệm thu link air hợp lệ.',
        citedSopCode: 'SOP-LEGAL-01 Điều 5 & FR-030 (2.10)',
      },
      {
        id: 'q-leg-04',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Hợp đồng nguyên tắc (HĐNT) ký với KOC có giá trị pháp lý trong bao lâu?',
        options: [
          { key: 'A', label: 'Chỉ có giá trị cho 01 video duy nhất của chiến dịch đó.' },
          { key: 'B', label: 'Có hiệu lực trong vòng 01 năm kể từ ngày ký, áp dụng làm khung pháp lý chung cho toàn bộ các Deal/Phụ lục phát sinh trong năm.' },
          { key: 'C', label: 'Có hiệu lực vô thời hạn không bao giờ hết hạn.' },
          { key: 'D', label: 'Có hiệu lực trong vòng 30 ngày.' },
        ],
        correctKey: 'B',
        explanation: 'Theo SOP-LEGAL-01: Mô hình 1 KOC - 1 HĐNT áp dụng khung thời hạn 1 năm. Mỗi deal phát sinh chỉ cần lập Phụ lục SOW dẫn chiếu về HĐNT gốc, không phải ký lại hợp đồng nguyên tắc.',
        citedSopCode: 'SOP-LEGAL-01 Điều 1.2 & FR-030',
      },
      {
        id: 'q-leg-05',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: Khi kiểm tra hồ sơ thanh toán của KOC, số CCCD trên hợp đồng là của KOC nhưng tài khoản ngân hàng thụ hưởng lại đứng tên mẹ của KOC. Kế toán cần xử lý như thế nào?',
        options: [
          { key: 'A', label: 'Vẫn chuyển tiền bình thường vì mẹ là người thân ruột thịt.' },
          { key: 'B', label: 'Yêu cầu cung cấp Giấy ủy quyền nhận tiền hợp pháp có công chứng hoặc chuyển đúng vào tài khoản chính chủ của KOC đứng tên trên hợp đồng.' },
          { key: 'C', label: 'Trừ thêm 5% phí chuyển hộ vào số tiền chuyển khoản.' },
          { key: 'D', label: 'Yêu cầu ký lại hợp đồng đứng tên người mẹ ngay lập tức.' },
        ],
        correctKey: 'B',
        explanation: 'Theo quy định kiểm soát chi và RULE-SYNC-01: Tài khoản ngân hàng thụ hưởng bắt buộc phải chính chủ của người ký hợp đồng. Nếu nhận hộ bắt buộc phải có Giấy ủy quyền nhận thanh toán hợp lệ theo quy chuẩn Pháp chế.',
        citedSopCode: 'SOP-LEGAL-01 Điều 6 & Quy chế chi tiêu',
      },
    ],
  },
  {
    id: 'quiz-brand-cathy-01',
    code: 'EXAM-BRAND-CATHYDOLL',
    title: 'Sát hạch Brand Guideline, Hero SKU & Chiến thuật Booking Nhãn hàng Cathy Doll',
    targetRole: 'Chuyên viên Booking & Sáng tạo Nội dung',
    brandName: 'Cathy Doll',
    passScorePct: 80,
    timeLimitMinutes: 15,
    createdAt: '2026-10-25',
    questions: [
      {
        id: 'q-cd-01',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Sản phẩm chủ lực (Hero SKU) mang lại GMV lớn nhất cho gian hàng Cathy Doll TikTok trong chiến dịch tháng 10/2026 là dòng sản phẩm nào?',
        options: [
          { key: 'A', label: 'Son kem lì Tint Cathy Doll.' },
          { key: 'B', label: 'Sữa dưỡng thể trắng da Ready 2 White Whitening Body Lotion.' },
          { key: 'C', label: 'Phấn nước che khuyết điểm Magic Cushion.' },
          { key: 'D', label: 'Nước tẩy trang mắt môi Deep Clean.' },
        ],
        correctKey: 'B',
        explanation: 'Dựa trên báo cáo TikTok Seller Campaigns tháng 10/2026: Chiến dịch PGM_Body Lotion của Cathy Doll đạt GMV 99.415.609đ với 470 đơn hàng, là dòng Hero SKU trọng điểm nhất.',
        citedSopCode: 'TikTok Seller Campaign Report Tuần 40 & Brand Profile Cathy Doll',
        brandScope: 'Cathy Doll',
      },
      {
        id: 'q-cd-02',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Quy định về việc kiểm duyệt mẫu sản phẩm gửi cho KOC của nhãn hàng Cathy Doll yêu cầu thời gian SLA là bao lâu?',
        options: [
          { key: 'A', label: 'Gửi mẫu sau khi KOC đã hoàn thành quay xong video.' },
          { key: 'B', label: 'Bộ phận Kho và Brand phải gửi mẫu đi trong vòng 48 giờ làm việc kể từ khi Deal được duyệt chốt danh sách.' },
          { key: 'C', label: 'Thời hạn gửi mẫu tối đa là 10 ngày làm việc.' },
          { key: 'D', label: 'Chỉ gửi mẫu khi KOC đồng ý nhận thù lao bằng sản phẩm.' },
        ],
        correctKey: 'B',
        explanation: 'Theo SLA gửi mẫu sản phẩm của Brand Cathy Doll và SLA-B2C-05: Mẫu sản phẩm phải được xuất kho và giao cho đơn vị vận chuyển trong vòng 48h để đảm bảo KOC nhận được hàng kịp tiến độ sản xuất kịch bản.',
        citedSopCode: 'SLA-B2C-05 & Quy chế mẫu Cathy Doll',
        brandScope: 'Cathy Doll',
      },
      {
        id: 'q-cd-03',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: Khi quay video cho sản phẩm Body Lotion của Cathy Doll, KOC nói câu: "Kem này bật tone trắng bóc như tiêm truyền trắng ngay sau 1 lần thoa duy nhất". Đội ngũ QC cần xử lý như thế nào?',
        options: [
          { key: 'A', label: 'Duyệt luôn vì câu nói rất thu hút người xem mua hàng.' },
          { key: 'B', label: 'Yêu cầu KOC quay lại câu này vì vi phạm điều cấm của Brand Cathy Doll: không so sánh với thủ thuật y khoa tiêm truyền trắng và không cam kết bật tone ảo tức thì phi khoa học.' },
          { key: 'C', label: 'Duyệt nhưng trừ 10% thù lao của KOC.' },
          { key: 'D', label: 'Đổi câu thành "trắng như trứng gà bóc" là được.' },
        ],
        correctKey: 'B',
        explanation: 'Theo Brand Guideline của Cathy Doll: Nhãn hàng định vị làm sáng da tự nhiên, an toàn, nghiêm cấm tuyệt đối liên hệ hoặc so sánh với các thủ thuật xâm lấn (tiêm truyền trắng, kem trộn lột tẩy).',
        citedSopCode: 'Brand Guideline Cathy Doll Mục 4 (Forbidden Notes)',
        brandScope: 'Cathy Doll',
      },
      {
        id: 'q-cd-04',
        type: 'MULTIPLE_CHOICE',
        prompt: 'Tỷ lệ hoa hồng tự nhiên (Affiliate Rate) được thiết lập trên gian hàng Cathy Doll TikTok Shop cho KOC gắn giỏ hàng là bao nhiêu phần trăm?',
        options: [
          { key: 'A', label: '5%.' },
          { key: 'B', label: '10%.' },
          { key: 'C', label: '15%.' },
          { key: 'D', label: '25%.' },
        ],
        correctKey: 'C',
        explanation: 'Theo danh mục 69 gian hàng B2C và Brand Master Data: Gian hàng Cathy Doll_TikTok_E2E-C cài đặt mức hoa hồng Affiliate tiêu chuẩn là 15%.',
        citedSopCode: 'Danh mục 69 Gian hàng B2C & Master Store Cathy Doll',
        brandScope: 'Cathy Doll',
      },
      {
        id: 'q-cd-05',
        type: 'SCENARIO_CASE',
        prompt: 'Tình huống: KOC thuộc khung lương KL3 (ngân sách 2,5 triệu Net) yêu cầu nhận thêm 1 set quà trị giá 1 triệu đồng ngoài thù lao cát-xê. Chuyên viên xử lý ra sao?',
        options: [
          { key: 'A', label: 'Tự bỏ tiền túi mua quà tặng KOC.' },
          { key: 'B', label: 'Kiểm tra hạn mức quà tặng ngoại giao trong Kế hoạch tháng của Brand Cathy Doll; nếu có quỹ FOC thì đề xuất Trưởng nhóm/Brand duyệt cấp quà kèm điều kiện KOC gắn thêm link Bio 7 ngày.' },
          { key: 'C', label: 'Từ chối thẳng thừng và hủy hợp tác ngay lập tức.' },
          { key: 'D', label: 'Trừ 1 triệu đồng vào tiền cát-xê của KOC rồi mới gửi quà.' },
        ],
        correctKey: 'B',
        explanation: 'Trong đàm phán KOC B2C: Có thể sử dụng hạn mức mẫu thử/quà tặng FOC để gia tăng quyền lợi cho thương hiệu (thêm thời hạn mã Ads, thêm link Bio) mà không làm vượt trần ngân sách tiền mặt Net.',
        citedSopCode: 'Kịch bản đàm phán KOC số 8 & SOP-PLAN-01',
        brandScope: 'Cathy Doll',
      },
    ],
  },
];

// ============================================================================
// DANH MỤC 6 KHÓA ĐÀO TẠO THỰC CHIẾN CHUẨN (STANDARD COURSES)
// ============================================================================

export const PREBUILT_TRAINING_COURSES: TrainingCourse[] = [
  {
    id: 'course-plan-01',
    code: 'CRS-PLAN-01',
    title: 'Lập Kế hoạch Tháng & Phân bổ Hạn ngạch 69 Gian hàng B2C',
    targetRole: 'Chuyên viên Booking & Quản lý',
    difficulty: 'NÂNG_CAO',
    durationMinutes: 45,
    category: 'PLANNING_BUDGET',
    summary: 'Nắm vững quy trình 12 bước lập kế hoạch từ cấp Brand đến từng gian hàng, phân bổ ngân sách Net/Gross, chỉ tiêu Paid vs FOC và luồng trình duyệt không qua Leader.',
    quizId: 'quiz-plan-01',
    enrolledCount: 38,
    completedCount: 29,
    createdAt: '2026-10-25',
    modules: [
      {
        id: 'mod-plan-1',
        title: 'Bài 1: Phân cấp Quản trị Brand vs Gian hàng & Quy tắc Phạm vi 69 Gian B2C',
        durationMinutes: 15,
        content: `### 1. Phân cấp Quản trị Brand vs Gian hàng
- **Cấp Brand (Thương hiệu):** Là cấp cao nhất, ký hợp đồng dịch vụ tổng thể, giao ngân sách chiến dịch tổng và định mức phê duyệt kịch bản/đơn giá (Brand Guideline).
- **Cấp Gian hàng (Store / Platform):** Một Brand sở hữu nhiều gian hàng trên các sàn (TikTok, Shopee, Lazada...). Hạn mức Order được phân bổ chi tiết theo từng gian hàng nhưng phải tuân thủ định mức của Brand.
- **Phạm vi phân tích B2C:** Chỉ tính toán các gian hàng có **B2C phụ trách = 1** (Cột 25 trong File 4.1 Plan order tổng). Tuyệt đối không gộp gian hàng thuộc Social Commerce hoặc Outright của phòng ban khác trừ khi được yêu cầu rõ ràng.`,
        linkedSopCode: 'POL-ORG-01',
      },
      {
        id: 'mod-plan-2',
        title: 'Bài 2: Bóc tách Chỉ tiêu Order Growth & Cơ cấu Ngân sách Gross vs Net',
        durationMinutes: 15,
        content: `### 2. Nguyên tắc Bóc tách Ngân sách
- **Tách bạch rõ ràng Chi phí Gross và Chi phí Net:** Kế toán kiểm soát và cấp hạn mức theo ngân sách Net.
- **Tách biệt Video KOC trả phí (Paid) và Suất gửi mẫu sản phẩm miễn phí (FOC):** Suất FOC có chi phí 0đ, thường do chuyên viên riêng phụ trách (như Trần Thị Hảo).
- **Phân bổ theo kênh:** Tách biệt rõ Video Affiliate, Video kênh Brand (Self-channel) và Livestream.
- **Cảnh báo Overbudget & Unbudgeted Spend:** Báo động đỏ ngay khi phát sinh chi phí ở gian hàng có hạn ngạch ghi nhận 0đ.`,
        linkedSopCode: 'SOP-PLAN-01',
      },
      {
        id: 'mod-plan-3',
        title: 'Bài 3: Cơ cấu Tổ chức & Quy tắc Gian hàng không có Leader',
        durationMinutes: 15,
        content: `### 3. Quy tắc Trình duyệt Gian hàng không có Leader
- **Cấp Ban Giám Đốc (CEO):** Đỗ Văn Giang — Phê duyệt chung toàn hệ thống.
- **Cấp Giám Đốc Marketing (Lead B2C):** Đặng Thị Yến Nhi — Quản lý trần PnL/ngân sách toàn bộ 69 gian hàng B2C, ký duyệt kế hoạch tháng.
- **Cấp Trưởng Nhóm (Leader):** Chỉ có Nguyễn Thị Ngọc Tâm làm Trưởng nhóm phụ trách 8 gian hàng (ClubClio, Cindy Bloom, Mine, EUPC, L'Occitane, Bye Bye Blemish, Rejuran).
- **Gian hàng không có Leader:** Đối với các gian hàng chỉ có 1 chuyên viên phụ trách (toàn bộ các gian Shopee và nhiều gian TikTok), chuyên viên chủ động lập phân rã và trình duyệt trực tiếp lên Giám Đốc Marketing (Đặng Thị Yến Nhi) mà không cần bước sơ duyệt trung gian.`,
        linkedSopCode: 'POL-ORG-01',
      },
    ],
  },
  {
    id: 'course-qc-01',
    code: 'CRS-QC-01',
    title: 'Tiêu chuẩn Kiểm duyệt Kịch bản Video & 110 Từ khóa cấm sàn TMĐT',
    targetRole: 'Sáng tạo Nội dung & QC',
    difficulty: 'CƠ_BẢN',
    durationMinutes: 40,
    category: 'CONTENT_CREATIVE',
    summary: 'Quy chuẩn cấu trúc kịch bản 4 phần (Hook 3s, Nỗi đau, Trải nghiệm, CTA), danh mục 110 từ khóa cấm theo sàn TikTok/Shopee và kỹ năng biên tập giữ giọng văn KOC.',
    quizId: 'quiz-qc-01',
    enrolledCount: 52,
    completedCount: 44,
    createdAt: '2026-10-25',
    modules: [
      {
        id: 'mod-qc-1',
        title: 'Bài 1: Cấu trúc Kịch bản Video B2C 4 Phần Chuẩn Chuyển Đổi',
        durationMinutes: 15,
        content: `### 1. Bố cục 4 Phần Video Chuẩn
1. **Phần 1: Hook giữ chân người xem (0–3 giây đầu):**
   - Đạt tỷ lệ giữ chân 2s (Hook rate) trên 28%.
   - Đưa ngay vấn đề nóng, kết quả bất ngờ hoặc hình ảnh cận cảnh texture sản phẩm.
2. **Phần 2: Khơi gợi nỗi đau & Nhu cầu (3–15 giây):**
   - Đánh đúng tâm lý đối tượng mục tiêu (da khô nẻ mùa lạnh, thâm mụn kéo dài, tiết kiệm chi phí).
3. **Phần 3: Trải nghiệm & Chứng minh hiệu quả (15–40 giây):**
   - Cầm sản phẩm trên tay (Holding showcase), test chất kem trực tiếp (Texture demo), giải thích thành phần lành tính.
4. **Phần 4: Kêu gọi hành động (CTA) & Giỏ hàng (40–55 giây):**
   - Hướng dẫn bấm vào giỏ hàng góc trái màn hình, nhấn mạnh ưu đãi Flash sale có hạn.`,
        linkedSopCode: 'SOP-QC-01',
      },
      {
        id: 'mod-qc-2',
        title: 'Bài 2: Bộ 110 Từ khóa cấm & Quy định Luật Quảng cáo',
        durationMinutes: 15,
        content: `### 2. Danh mục Từ khóa cấm
- **Cấm cam kết tuyệt đối:** "Trị dứt điểm", "chữa khỏi hoàn toàn", "cam kết 100%", "vĩnh viễn", "tuyệt đối".
- **Cấm ngôn từ y tế trên mỹ phẩm:** "Thuốc đặc trị", "kháng sinh", "chữa lành vết thương", "corticoide", "kê đơn bác sĩ".
- **Cấm so sánh dìm hàng:** Không nêu tên, không quay cận cảnh bao bì sản phẩm đối thủ để so sánh chê bai.
- **Cấm từ ngữ gây sốc/phóng đại:** "Bật tone cấp tốc sau 1 đêm", "trắng bóc không tì vết", "thần thánh".`,
        linkedSopCode: 'SOP-QC-01',
      },
    ],
  },
  {
    id: 'course-legal-01',
    code: 'CRS-LEGAL-01',
    title: 'Pháp lý Hợp đồng, Biểu mẫu Chuẩn, Thuế TNCN/VAT & Đối soát Nghiệm thu Deal',
    targetRole: 'Pháp chế, Kế toán & Chuyên viên Booking',
    difficulty: 'CHUYÊN_SÂU',
    durationMinutes: 50,
    category: 'CONTRACTS_TAX_LEGAL',
    summary: 'Làm chủ mô hình 1 KOC - 1 HĐNT, công thức tính thuế TNCN 10% / HKD 7%, quy trình nghiệm thu 2 bước tuần tự và giải ngân đúng hạn mốc ngày 02 hàng tháng.',
    quizId: 'quiz-legal-01',
    enrolledCount: 41,
    completedCount: 35,
    createdAt: '2026-10-25',
    modules: [
      {
        id: 'mod-leg-1',
        title: 'Bài 1: Kiến trúc Hợp đồng 3 Giai đoạn: HĐNT Khung -> Phụ lục SOW -> BBNT',
        durationMinutes: 15,
        content: `### 1. Kiến trúc Hợp đồng 3 Giai đoạn
- **Giai đoạn 1: Hợp đồng nguyên tắc (HĐNT Khung):** Ký 1 lần duy nhất với KOC, có hiệu lực trong 1 năm.
- **Giai đoạn 2: Phụ lục Hợp đồng (SOW theo Deal):** Sinh tự động cho từng Job/Deal cụ thể, quy định sản phẩm, ngày air, thù lao Net/Gross và các dịch vụ gia tăng.
- **Giai đoạn 3: Biên bản nghiệm thu (BBNT):** Lập sau khi video đã air và đối soát đầy đủ link bài đăng.`,
        linkedSopCode: 'SOP-LEGAL-01',
      },
      {
        id: 'mod-leg-2',
        title: 'Bài 2: Chính sách Thuế TNCN 10%, Hộ kinh doanh 7% & Công thức Gross/Net',
        durationMinutes: 20,
        content: `### 2. Chính sách Thuế & Công thức Tính
- **Cá nhân có thù lao $\\ge 2.000.000$đ:** Bắt buộc khấu trừ 10% thuế TNCN tại nguồn.
  $$\\text{Giá Gross} = \\frac{\\text{Giá Net}}{0.9}$$
  $$\\text{Thuế TNCN} = \\text{Giá Gross} \\times 10\\%$$
- **Hộ kinh doanh cá thể (HKD):** Nộp thuế khoán 7% (5% VAT + 2% TNCN) hoặc xuất hóa đơn điện tử.
- **Công ty / Agency MCN:** Xuất hóa đơn VAT 8% hoặc 10%.`,
        linkedSopCode: 'SOP-LEGAL-01',
      },
      {
        id: 'mod-leg-3',
        title: 'Bài 3: Quy trình Nghiệm thu 2 Bước Tuần tự theo Deal',
        durationMinutes: 15,
        content: `### 3. Nghiệm thu 2 Bước Tuần tự
- **Bước 1 — Nghiệm thu Asset Video:** Kiểm tra link video TikTok thực tế, ngày air thực tế, gắn giỏ hàng đúng SKU.
- **Bước 2 — Nghiệm thu Dịch vụ gia tăng:** Mở khóa sau khi Bước 1 hoàn thành. Nghiệm thu mã Spark Ads, file ảnh raw, reup đa kênh.
- **Khấu trừ hạng mục hủy (DROPPED):** Nếu KOC không cấp mã Spark Ads, hạng mục đó chuyển sang DROPPED và tự động giảm trừ khỏi số tiền thanh toán cuối cùng.`,
        linkedSopCode: 'SOP-LEGAL-01',
      },
    ],
  },
  {
    id: 'course-brand-cathy-01',
    code: 'CRS-BRAND-CATHYDOLL',
    title: 'Brand Guideline, Hero SKU & Chiến thuật Booking Nhãn hàng Cathy Doll',
    targetRole: 'Chuyên viên Booking & Sáng tạo Nội dung',
    difficulty: 'CƠ_BẢN',
    durationMinutes: 35,
    category: 'BRAND_STORE_GUIDELINES',
    brandName: 'Cathy Doll',
    summary: 'Tìm hiểu sâu về thương hiệu mỹ phẩm Cathy Doll, sản phẩm chủ lực Body Lotion (GMV 99tr), danh mục từ cấm và quy trình phê duyệt mẫu trong 48h.',
    quizId: 'quiz-brand-cathy-01',
    enrolledCount: 29,
    completedCount: 22,
    createdAt: '2026-10-25',
    modules: [
      {
        id: 'mod-cd-1',
        title: 'Bài 1: Tổng quan Thương hiệu Cathy Doll & Định vị 4P',
        durationMinutes: 15,
        content: `### 1. Định vị Nhãn hàng Cathy Doll
- **Thương hiệu:** Mỹ phẩm Thái Lan chính hãng, được phân phối độc quyền tại Việt Nam.
- **Đối tượng khách hàng:** Nữ từ 18–28 tuổi, học sinh - sinh viên và nhân viên văn phòng.
- **Thế mạnh:** Sản phẩm dưỡng thể làm sáng da, trang điểm trẻ trung, giá thành học sinh sinh viên.`,
        linkedSopCode: 'Brand Guideline Cathy Doll',
      },
      {
        id: 'mod-cd-2',
        title: 'Bài 2: Hero SKU Body Lotion & Chiến thuật Phân bổ Bậc lương KL',
        durationMinutes: 20,
        content: `### 2. Chiến lược Booking & Hero SKU
- **Hero SKU:** Sữa dưỡng thể Ready 2 White Whitening Body Lotion.
- **Phân bổ ngân sách:** Tập trung vào các KOC thuộc khung KL2–KL4 có tệp người theo dõi là học sinh, sinh viên, yêu thích phong cách năng động.
- **Hoa hồng Affiliate sàn:** 15% cho mọi sản phẩm gắn giỏ hàng TikTok Shop.`,
        linkedSopCode: 'Brand Guideline Cathy Doll',
      },
    ],
  },
];

// ============================================================================
// HÀM LẤY VÀ LƯU KHÓA HỌC / BỘ ĐỀ TRONG LOCAL STORAGE & STATE
// ============================================================================

const COURSES_STORAGE_KEY = 'upbase_b2c_learning_courses_v1';
const QUIZZES_STORAGE_KEY = 'upbase_b2c_learning_quizzes_v1';
const ATTEMPTS_STORAGE_KEY = 'upbase_b2c_learning_attempts_v1';

export function loadStoredCourses(): TrainingCourse[] {
  if (typeof window === 'undefined') return PREBUILT_TRAINING_COURSES;
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (!raw) return PREBUILT_TRAINING_COURSES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Gộp với prebuilt courses nếu thiếu
      const existingCodes = new Set(parsed.map((c: TrainingCourse) => c.code));
      const merged = [...parsed];
      for (const pre of PREBUILT_TRAINING_COURSES) {
        if (!existingCodes.has(pre.code)) {
          merged.push(pre);
        }
      }
      return merged;
    }
    return PREBUILT_TRAINING_COURSES;
  } catch {
    return PREBUILT_TRAINING_COURSES;
  }
}

export function saveStoredCourses(courses: TrainingCourse[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
  } catch (e) {
    console.warn('Could not save courses to localStorage', e);
  }
}

export function loadStoredQuizzes(): ExamQuiz[] {
  if (typeof window === 'undefined') return PREBUILT_EXAM_QUIZZES;
  try {
    const raw = localStorage.getItem(QUIZZES_STORAGE_KEY);
    if (!raw) return PREBUILT_EXAM_QUIZZES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingCodes = new Set(parsed.map((q: ExamQuiz) => q.code));
      const merged = [...parsed];
      for (const pre of PREBUILT_EXAM_QUIZZES) {
        if (!existingCodes.has(pre.code)) {
          merged.push(pre);
        }
      }
      return merged;
    }
    return PREBUILT_EXAM_QUIZZES;
  } catch {
    return PREBUILT_EXAM_QUIZZES;
  }
}

export function saveStoredQuizzes(quizzes: ExamQuiz[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes));
  } catch (e) {
    console.warn('Could not save quizzes to localStorage', e);
  }
}

export function loadStoredAttempts(): UserExamAttempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserExamAttempt(attempt: UserExamAttempt): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadStoredAttempts();
    const updated = [attempt, ...current].slice(0, 100);
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save exam attempt', e);
  }
}

// ============================================================================
// ĐỘNG CƠ TỔNG HỢP VÀ SINH BỘ ĐỀ / KHÓA HỌC DỰ PHÒNG NỘI BỘ (INTERNAL FALLBACK)
// ============================================================================

export interface CourseGeneratorParams {
  topic: string;
  brandName?: string;
  targetRole: string;
  difficulty?: 'CƠ_BẢN' | 'NÂNG_CAO' | 'CHUYÊN_SÂU';
  questionCount?: number;
}

export function generateTrainingCourseAndQuizInternal(
  params: CourseGeneratorParams,
  brandDetail?: BrandDetail
): { course: TrainingCourse; quiz: ExamQuiz } {
  const brand = brandDetail || {
    name: params.brandName || 'Thương hiệu B2C Trọng điểm',
    brandGuideline: 'Tuân thủ chặt chẽ thông điệp thương hiệu, trần ngân sách Net và kiểm duyệt kịch bản.',
    kocCriteria: 'KOC có tương tác thật, phù hợp nhân khẩu học khách hàng.',
    forbiddenNotes: 'Không so sánh dìm hàng, không cam kết phóng đại phi thực tế.',
    stores: [],
    heroProducts: [],
  };

  const idSuffix = `${Date.now()}`;
  const courseCode = `CRS-CUSTOM-${idSuffix.slice(-4)}`;
  const quizCode = `EXAM-CUSTOM-${idSuffix.slice(-4)}`;
  const quizId = `quiz-custom-${idSuffix}`;
  const courseId = `course-custom-${idSuffix}`;

  const brandLabel = params.brandName || brand.name;
  const questions: ExamQuestion[] = [
    {
      id: `q-${idSuffix}-1`,
      type: 'SCENARIO_CASE',
      prompt: `Tình huống: Khi triển khai chiến dịch cho ${brandLabel}, KOC yêu cầu mức cát-xê Net 8.000.000đ và yêu cầu không khấu trừ thuế TNCN. Theo quy định pháp lý phòng Marketing B2C, chuyên viên cần phản hồi như thế nào?`,
      options: [
        { key: 'A', label: 'Đồng ý chuyển đủ 8.000.000đ mà không làm hợp đồng để tránh phải nộp thuế.' },
        { key: 'B', label: 'Giải thích rõ theo Thông tư 111/2013/TT-BTC và SOP-LEGAL-01, mọi khoản thù lao từ 2.000.000đ trở lên cho cá nhân đều bắt buộc khấu trừ 10% TNCN tại nguồn; hợp đồng sẽ ghi giá Gross là 8.888.888đ để KOC thực nhận đúng 8.000.000đ Net.' },
        { key: 'C', label: 'Yêu cầu KOC tự lên chi cục thuế đóng thuế rồi mới được nhận tiền.' },
        { key: 'D', label: 'Hủy hợp đồng ngay lập tức vì KOC có dấu hiệu trốn thuế.' },
      ],
      correctKey: 'B',
      explanation: 'Theo SOP-LEGAL-01: Công ty áp dụng chính sách hợp đồng chuẩn bảo đảm quyền lợi Net cho KOC bằng cách quy đổi sang giá Gross (Gross = Net / 0.9) và trích nộp 10% thuế TNCN đúng pháp luật.',
      citedSopCode: 'SOP-LEGAL-01 Điều 3.1 & Biểu mẫu Hợp đồng 1.1',
      brandScope: brandLabel,
    },
    {
      id: `q-${idSuffix}-2`,
      type: 'MULTIPLE_CHOICE',
      prompt: `Quy định về việc kiểm soát nội dung kịch bản video đối với nhãn hàng ${brandLabel} nghiêm cấm điều nào sau đây?`,
      options: [
        { key: 'A', label: 'Quay cận cảnh sản phẩm và trải nghiệm chất kem thực tế.' },
        { key: 'B', label: `${brand.forbiddenNotes || 'Không so sánh dìm hàng đối thủ, không cam kết phóng đại chữa khỏi 100%.'}` },
        { key: 'C', label: 'Gắn link giỏ hàng TikTok Shop hoặc Shopee Video.' },
        { key: 'D', label: 'Sử dụng âm nhạc thương mại được cấp quyền trên nền tảng.' },
      ],
      correctKey: 'B',
      explanation: `Theo Brand Guideline của ${brandLabel} và SOP-QC-01: ${brand.forbiddenNotes || 'Nghiêm cấm các phát ngôn phóng đại và so sánh dìm hàng đối thủ.'}`,
      citedSopCode: 'SOP-QC-01 & Brand Guideline ' + brandLabel,
      brandScope: brandLabel,
    },
    {
      id: `q-${idSuffix}-3`,
      type: 'SCENARIO_CASE',
      prompt: `Tình huống: Khi nộp kịch bản video cho nhãn hàng ${brandLabel}, KOC gửi trễ 3 ngày so với mốc thỏa thuận trong phụ lục Deal. Kỷ luật SLA được áp dụng như thế nào?`,
      options: [
        { key: 'A', label: 'Không xử lý gì nếu video sau đó đạt trên 100.000 lượt xem.' },
        { key: 'B', label: 'Ghi nhận điểm trừ tín nhiệm SLA trên Hồ sơ KOC, nhắc nhở chính thức và nếu ảnh hưởng tới lịch lên sóng của chiến dịch thì áp dụng điều khoản phạt vi phạm tiến độ theo quy định hợp đồng.' },
        { key: 'C', label: 'Chuyên viên phải tự viết lại kịch bản thay KOC.' },
        { key: 'D', label: 'Chuyển toàn bộ hợp đồng sang người thụ hưởng khác.' },
      ],
      correctKey: 'B',
      explanation: 'Theo SLA-B2C và Quy chế quản lý hồ sơ KOC: Trễ hạn nộp kịch bản sẽ bị hệ thống tự động ghi cờ rủi ro tiến độ (riskFlags) và áp dụng chế tài theo Phụ lục SOW đã ký kết.',
      citedSopCode: 'SLA-QC-01 & SOP-LEGAL-01',
      brandScope: brandLabel,
    },
    {
      id: `q-${idSuffix}-4`,
      type: 'MULTIPLE_CHOICE',
      prompt: `Hạn mức ngân sách và danh sách KOC của chiến dịch nhãn hàng ${brandLabel} được chốt phê duyệt định kỳ vào các đợt nào trong tháng?`,
      options: [
        { key: 'A', label: 'Ngày 05 và ngày 25 hàng tháng.' },
        { key: 'B', label: 'Ngày 10, ngày 20 và ngày 30 hàng tháng (Batch 10, Batch 20, Batch 30).' },
        { key: 'C', label: 'Chỉ chốt 1 lần duy nhất vào ngày đầu tiên của tháng.' },
        { key: 'D', label: 'Bất cứ ngày nào trong tháng không có lịch cố định.' },
      ],
      correctKey: 'B',
      explanation: 'Theo quy trình quản trị kế hoạch SOP-PLAN-01: Bộ phận B2C chốt danh sách KOC theo 3 đợt Batch 10, Batch 20 và Batch 30 để kiểm soát giải ngân và dòng tiền.',
      citedSopCode: 'SOP-PLAN-01 Mục I.2',
    },
    {
      id: `q-${idSuffix}-5`,
      type: 'SCENARIO_CASE',
      prompt: `Tình huống: Video của KOC đã đăng tải lên sóng đạt yêu cầu nhưng KOC chưa bàn giao mã ủy quyền chạy quảng cáo Spark Ads. Phiếu thanh toán quyết toán Deal sẽ được xử lý như thế nào?`,
      options: [
        { key: 'A', label: 'Kế toán vẫn thanh toán 100% toàn bộ Deal cho KOC.' },
        { key: 'B', label: 'Chưa thể thanh toán phần chi phí mã Spark Ads; chỉ nghiệm thu Bước 1 phần Video và giữ lại hoặc chuyển hạng mục mã Ads sang DROPPED để khấu trừ nếu KOC không bàn giao.' },
        { key: 'C', label: 'Tự động nâng tiền thù lao cho KOC thêm 20%.' },
        { key: 'D', label: 'Báo cáo ngay lên CEO để hủy tư cách KOC vĩnh viễn.' },
      ],
      correctKey: 'B',
      explanation: 'Theo quy trình Nghiệm thu 2 bước tuần tự (FR-030 & SOP-LEGAL-01): Nếu KOC không thực hiện đúng dịch vụ phụ (mã Spark Ads), hạng mục này bị khấu trừ khỏi số tiền thanh toán cuối cùng.',
      citedSopCode: 'SOP-LEGAL-01 Điều 5 & FR-030',
    },
  ];

  const quiz: ExamQuiz = {
    id: quizId,
    code: quizCode,
    title: `Sát hạch Nghiệp vụ: ${params.topic} — ${brandLabel}`,
    targetRole: params.targetRole,
    brandName: brandLabel,
    passScorePct: 80,
    timeLimitMinutes: 15,
    questions,
    createdAt: new Date().toISOString().split('T')[0],
    isCustomGenerated: true,
  };

  const course: TrainingCourse = {
    id: courseId,
    code: courseCode,
    title: `${params.topic} — ${brandLabel}`,
    targetRole: params.targetRole,
    difficulty: params.difficulty || 'NÂNG_CAO',
    durationMinutes: 40,
    category: 'BRAND_STORE_GUIDELINES',
    brandName: brandLabel,
    summary: `Khóa đào tạo chuyên sâu về ${params.topic} áp dụng cho nhãn hàng ${brandLabel}, hướng dẫn thực hiện đúng quy chuẩn Brand Guideline, quản lý ngân sách và phòng ngừa rủi ro hợp tác KOC.`,
    modules: [
      {
        id: `mod-${idSuffix}-1`,
        title: `Bài 1: Tổng quan Yêu cầu Thương hiệu & Bộ quy tắc Vận hành ${brandLabel}`,
        durationMinutes: 15,
        content: `### 1. Yêu cầu Thương hiệu ${brandLabel}\n- **Quy chuẩn thông điệp:** ${brand.brandGuideline || 'Tuân thủ định vị 4P, kịch bản duyệt trước khi lên sóng.'}\n- **Tiêu chuẩn KOC:** ${brand.kocCriteria || 'KOC có tương tác thật, tệp người xem phù hợp.'}\n- **Lưu ý đặc biệt:** ${brand.forbiddenNotes || 'Không so sánh dìm hàng đối thủ, không cam kết phóng đại.'}`,
        linkedSopCode: 'Brand Guideline ' + brandLabel,
      },
      {
        id: `mod-${idSuffix}-2`,
        title: `Bài 2: Thực hành Đối soát Ngân sách & Hợp đồng Dịch vụ ${brandLabel}`,
        durationMinutes: 15,
        content: `### 2. Quản trị Ngân sách & Pháp lý\n- Áp dụng nguyên tắc tách bạch Net vs Gross, bảo đảm 100% KOC có HĐNT hoặc Phụ lục SOW trước khi lên sóng.\n- Chốt danh sách theo 3 đợt Batch 10-20-30 hàng tháng.\n- Quy trình nghiệm thu 2 bước tuần tự đối soát mã Spark Ads và link air thực tế.`,
        linkedSopCode: 'SOP-LEGAL-01 & SOP-PLAN-01',
      },
      {
        id: `mod-${idSuffix}-3`,
        title: `Bài 3: Xử lý Tình huống Thực chiến & Bài tập Khảo thí Đầu ra`,
        durationMinutes: 10,
        content: `### 3. Sát hạch Năng lực Thực chiến\n- Học viên hoàn thành bộ đề thi sát hạch ${quizCode} gồm 5 câu hỏi tình huống thực tế.\n- Yêu cầu đạt tối thiểu 80% điểm số để được cấp quyền nhận bàn giao các đơn booking của nhãn hàng ${brandLabel}.`,
        linkedSopCode: quizCode,
      },
    ],
    quizId: quizId,
    enrolledCount: 1,
    completedCount: 0,
    isCustomGenerated: true,
    createdAt: new Date().toISOString().split('T')[0],
  };

  return { course, quiz };
}
