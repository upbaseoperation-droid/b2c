import type { BookingDealItem, KocItem } from './types';
import {
  calculateKocPerformanceStats,
  dealsOfKoc,
  hasLegalId,
  legalTypeOf,
  LEGAL_TYPE_LABEL,
  type DuplicateMatch,
  type KocPerformanceSummary,
} from '../components/koc/kocUtils';
import { formatVnd, formatVndShort } from './format';

export type KocSuitabilityVerdict = 'HIGHLY_SUITABLE' | 'CONDITIONAL' | 'HIGH_RISK';
export type KocRiskCategory = 'SLA' | 'LEGAL_PAYMENT' | 'COMMERCIAL' | 'BRAND_CONTENT';
export type KocRiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface KocRiskFlagItem {
  id: string;
  category: KocRiskCategory;
  categoryLabel: string;
  severity: KocRiskSeverity;
  title: string;
  detail: string;
  mitigation: string;
}

export interface KocHistoryEvaluationSummary {
  kocId: string;
  stageName: string;
  channelId: string;
  suitabilityVerdict: KocSuitabilityVerdict;
  suitabilityVerdictLabel: string;
  suitabilityScore: number; // 0 - 100
  overallRiskLevel: KocRiskSeverity;
  overallRiskLabel: string;
  stats: KocPerformanceSummary;
  dealCount: number;
  overdueDealCount: number;
  profitableDealCount: number;
  profitableDealRatio: number; // %
  avgHistoricalFeeNet: number;
  legalStatusLabel: string;
  legalTypeLabel: string;
  riskFlags: KocRiskFlagItem[];
  strengths: string[];
  recommendations: string[];
  contextDataText: string;
}

export interface EvaluateKocHistoryParams {
  koc: KocItem;
  deals?: BookingDealItem[];
  duplicates?: DuplicateMatch[];
  targetBrandName?: string;
  targetCategory?: string;
  proposedFeeNet?: number;
}

export function evaluateKocCollaborationHistory(
  params: EvaluateKocHistoryParams
): KocHistoryEvaluationSummary {
  const { koc, deals = [], duplicates = [], targetBrandName, targetCategory, proposedFeeNet } = params;
  const kocDeals = dealsOfKoc(deals, koc);
  const stats = calculateKocPerformanceStats(deals, koc);

  const validDeals = kocDeals.filter(d => d.status !== 'CANCELLED');
  const paidDeals = validDeals.filter(d => (d.totalValue || 0) > 0);
  const overdueDeals = kocDeals.filter(
    d => d.slaStatus === 'OVERDUE' || d.isPostOnTime === false || d.isScriptOnTime === false
  );
  const profitableDeals = paidDeals.filter(d => {
    const cost = d.totalValue || 0;
    const gmv = d.gmv30 || d.affiliateGmv || 0;
    return cost > 0 && gmv / cost >= 2.0;
  });

  const profitableDealRatio =
    paidDeals.length > 0
      ? Math.round((profitableDeals.length / paidDeals.length) * 100)
      : 0;

  const avgHistoricalFeeNet =
    paidDeals.length > 0
      ? Math.round(paidDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0) / paidDeals.length)
      : koc.minRate && koc.maxRate
      ? Math.round((koc.minRate + koc.maxRate) / 2)
      : koc.maxRate || koc.minRate || 0;

  const legalType = legalTypeOf(koc);
  const legalTypeLabel = LEGAL_TYPE_LABEL[legalType];
  const hasValidLegal = hasLegalId(koc);
  const legalStatusLabel = !hasValidLegal
    ? 'Thiếu giấy tờ định danh (CCCD / MST)'
    : koc.isOcrVerified
    ? `Đã xác minh giấy tờ (${legalTypeLabel})`
    : `Đã có số định danh (${legalTypeLabel} — Chưa quét xác minh)`;

  const riskFlags: KocRiskFlagItem[] = [];
  const strengths: string[] = [];
  const recommendations: string[] = [];

  // ---------------------------------------------------------------------------
  // 1. ĐÁNH GIÁ RỦI RO TIẾN ĐỘ & KỶ LUẬT SLA
  // ---------------------------------------------------------------------------
  if (stats.totalDeals > 0 && (stats.onTimePostRate < 80 || overdueDeals.length >= 2)) {
    riskFlags.push({
      id: 'risk-sla-post-delay',
      category: 'SLA',
      categoryLabel: 'Tiến độ & SLA',
      severity: stats.onTimePostRate < 65 ? 'HIGH' : 'MEDIUM',
      title: `Tỷ lệ đăng video đúng hạn đạt ${stats.onTimePostRate}% (${overdueDeals.length} đơn ghi nhận trễ mốc)`,
      detail: `Trong lịch sử hợp tác có ${overdueDeals.length} chiến dịch bị trễ mốc nộp kịch bản hoặc đăng bài so với cam kết SLA.`,
      mitigation:
        'Bắt buộc thu kịch bản trong 48h kể từ khi gửi mẫu, nhắc mốc từ ngày thứ 3 và chỉ giải ngân sau khi video lên sóng + cấp mã Spark Ads.',
    });
  } else if (stats.totalDeals > 0) {
    strengths.push(
      `Kỷ luật tiến độ tốt: Tỷ lệ nộp kịch bản đúng hạn ${stats.onTimeScriptRate}%, đăng bài đúng hạn ${stats.onTimePostRate}%.`
    );
  }

  if ((koc.reliabilityScore ?? 85) < 75) {
    riskFlags.push({
      id: 'risk-sla-reliability',
      category: 'SLA',
      categoryLabel: 'Tiến độ & SLA',
      severity: 'HIGH',
      title: `Điểm tín nhiệm vận hành thấp (${koc.reliabilityScore}/100)`,
      detail: 'Hồ sơ ghi nhận điểm tín nhiệm nội bộ dưới ngưỡng an toàn (75/100) do phản hồi chậm hoặc hủy đơn.',
      mitigation: 'Ưu tiên gửi mẫu FOC trước hoặc áp dụng điều khoản phạt trễ hạn 20% giá trị hợp đồng.',
    });
  }

  if (stats.sparkComplianceRate < 85 && stats.totalDeals > 0) {
    riskFlags.push({
      id: 'risk-sla-spark-code',
      category: 'SLA',
      categoryLabel: 'Tiến độ & SLA',
      severity: 'MEDIUM',
      title: `Tỷ lệ bàn giao mã quảng cáo Spark Ads đạt ${stats.sparkComplianceRate}%`,
      detail: 'Một số chiến dịch trước KOC bàn giao mã Spark Ads muộn hoặc mã hết hạn sớm.',
      mitigation: 'Quy định rõ trong hợp đồng: Bắt buộc cấp mã Spark Ads tối thiểu 30–60 ngày trước khi nghiệm thu thanh toán.',
    });
  }

  if ((koc.tiktokCancellationRate ?? 0) > 12) {
    riskFlags.push({
      id: 'risk-sla-cancel-rate',
      category: 'SLA',
      categoryLabel: 'Tiến độ & SLA',
      severity: (koc.tiktokCancellationRate ?? 0) > 20 ? 'HIGH' : 'MEDIUM',
      title: `Tỷ lệ hủy/hoàn đơn trên kênh TikTok cao (${koc.tiktokCancellationRate}%)`,
      detail: 'Tỷ lệ hủy hoặc hoàn hàng từ người mua trên kênh vượt ngưỡng trung bình ngành (10%–12%).',
      mitigation: 'Kiểm tra kỹ kịch bản phần tư vấn công dụng, tránh nói quá làm khách kỳ vọng sai lệch khi nhận hàng.',
    });
  }

  // ---------------------------------------------------------------------------
  // 2. ĐÁNH GIÁ RỦI RO PHÁP LÝ, THUẾ & THANH TOÁN
  // ---------------------------------------------------------------------------
  if (!hasValidLegal) {
    riskFlags.push({
      id: 'risk-legal-missing-id',
      category: 'LEGAL_PAYMENT',
      categoryLabel: 'Pháp lý & Thanh toán',
      severity: 'HIGH',
      title: 'Hồ sơ chưa có số CCCD 12 số hoặc Mã số thuế hợp lệ',
      detail: 'Kế toán sẽ chặn duyệt chi hoặc tạm ứng nếu hồ sơ KOC chưa cập nhật đủ định danh pháp lý.',
      mitigation: 'Yêu cầu KOC gửi ảnh chụp CCCD 2 mặt / ĐKKD để đọc ảnh giấy tờ và cập nhật trước khi lập hợp đồng.',
    });
  } else {
    strengths.push(`Hồ sơ pháp lý rõ ràng: ${legalStatusLabel}, thuận lợi cho việc lập hợp đồng và quyết toán thuế.`);
  }

  if (koc.sharedMcnInfo) {
    riskFlags.push({
      id: 'risk-legal-shared-mcn',
      category: 'LEGAL_PAYMENT',
      categoryLabel: 'Pháp lý & Thanh toán',
      severity: 'MEDIUM',
      title: `Thanh toán qua đầu mối MCN / Quản lý chung (${koc.sharedMcnInfo})`,
      detail: `Đầu mối này đang đại diện cho ${koc.sharedMcnInfo}. Có rủi ro dồn thu nhập tính thuế hoặc thiếu ủy quyền.`,
      mitigation:
        'Bắt buộc ký Hợp đồng Doanh nghiệp/Đại lý (Mẫu 1.3.1/1.4.1) hoặc có Giấy ủy quyền nhận thanh toán hợp lệ từ từng KOC.',
    });
  }

  if (koc.alternatePayees && koc.alternatePayees.length > 0) {
    riskFlags.push({
      id: 'risk-legal-alternate-payees',
      category: 'LEGAL_PAYMENT',
      categoryLabel: 'Pháp lý & Thanh toán',
      severity: koc.alternatePayees.length >= 2 ? 'HIGH' : 'MEDIUM',
      title: `Lịch sử đổi ${koc.alternatePayees.length} tài khoản người nhận tiền khác nhau`,
      detail: `Ghi nhận thanh toán qua người nhận hộ (${koc.alternatePayees.map(p => p.holderName).join(', ')}).`,
      mitigation: 'Đối chiếu kỹ tên chủ tài khoản trên hợp đồng và khấu trừ đúng chính sách thuế TNCN 10% (nếu từ 2.000.000đ).',
    });
  }

  if (duplicates && duplicates.length > 0) {
    riskFlags.push({
      id: 'risk-legal-duplicate-profile',
      category: 'LEGAL_PAYMENT',
      categoryLabel: 'Pháp lý & Thanh toán',
      severity: 'HIGH',
      title: `Phát hiện ${duplicates.length} hồ sơ KOC nghi trùng thông tin trong danh bạ`,
      detail: `Trùng với: ${duplicates.map(d => `${d.stageName} (trùng ${d.fields.join(', ')})`).join('; ')}.`,
      mitigation: 'Kiểm tra gộp mã KOC hoặc xác minh lại SĐT/CCCD để tránh book trùng một KOC qua 2 chuyên viên khác nhau.',
    });
  }

  // ---------------------------------------------------------------------------
  // 3. ĐÁNH GIÁ HIỆU QUẢ THƯƠNG MẠI & ĐƠN GIÁ (COMMERCIAL / ROI)
  // ---------------------------------------------------------------------------
  if (stats.totalDeals === 0) {
    riskFlags.push({
      id: 'risk-comm-no-history',
      category: 'COMMERCIAL',
      categoryLabel: 'Hiệu quả & Đơn giá',
      severity: 'MEDIUM',
      title: 'Chưa có lịch sử hợp tác thực tế trong hệ thống Upbase B2C',
      detail: 'KOC mới hoàn toàn, chưa có số liệu kiểm chứng GMV, ROI và kỷ luật nộp bài nội bộ.',
      mitigation:
        'Đề xuất hợp tác thử nghiệm bằng hình thức Gửi mẫu miễn phí (FOC / Affiliate) hoặc book gói test khung lương thấp (KL1–KL2).',
    });
  } else {
    if (stats.overallRoi >= 2.5) {
      strengths.push(
        `Hiệu quả chuyển đổi GMV cao: Tổng GMV lịch sử ${formatVndShort(stats.totalGmv)} trên chi phí Net ${formatVndShort(
          stats.totalSpentNet
        )} (ROI trung bình ${stats.overallRoi.toFixed(2)}x, ${profitableDealRatio}% chiến dịch có lãi).`
      );
    } else if (stats.totalSpentNet > 0 && stats.overallRoi < 1.3) {
      riskFlags.push({
        id: 'risk-comm-low-roi',
        category: 'COMMERCIAL',
        categoryLabel: 'Hiệu quả & Đơn giá',
        severity: stats.overallRoi < 0.8 ? 'HIGH' : 'MEDIUM',
        title: `Tỷ suất hoàn vốn lịch sử thấp (ROI trung bình ${stats.overallRoi.toFixed(2)}x)`,
        detail: `Tổng chi phí Net đã chi ${formatVnd(stats.totalSpentNet)} nhưng GMV thu về đạt ${formatVnd(
          stats.totalGmv
        )} (CPO bình quân ${stats.avgCpo > 0 ? formatVnd(stats.avgCpo) : 'cao'}).`,
        mitigation:
          'Đàm phán giảm đơn giá tối thiểu 20%–30% so với mức cũ hoặc chuyển sang mô hình trả phí cứng thấp + thưởng hoa hồng Affiliate.',
      });
    }
  }

  const ceilingRate = koc.maxRate || (avgHistoricalFeeNet > 0 ? Math.round(avgHistoricalFeeNet * 1.25) : 0);
  if (proposedFeeNet && ceilingRate > 0 && proposedFeeNet > ceilingRate) {
    const overPct = Math.round(((proposedFeeNet - ceilingRate) / ceilingRate) * 100);
    riskFlags.push({
      id: 'risk-comm-fee-inflation',
      category: 'COMMERCIAL',
      categoryLabel: 'Hiệu quả & Đơn giá',
      severity: overPct > 30 ? 'HIGH' : 'MEDIUM',
      title: `Đơn giá dự kiến (${formatVnd(proposedFeeNet)}) vượt +${overPct}% trần lịch sử (${formatVnd(ceilingRate)})`,
      detail: `Biên độ giá lịch sử của KOC là ${formatVndShort(koc.minRate || avgHistoricalFeeNet)} – ${formatVndShort(
        ceilingRate
      )}, đơn giá trung bình các đợt trước là ${formatVnd(avgHistoricalFeeNet)}.`,
      mitigation: `Đàm phán kéo đơn giá về vùng ${formatVnd(avgHistoricalFeeNet || ceilingRate)} hoặc yêu cầu tặng kèm 1 video phụ / giữ ghim giỏ hàng 15 ngày.`,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. ĐÁNH GIÁ RỦI RO NỘI DUNG & PHÙ HỢP THƯƠNG HIỆU
  // ---------------------------------------------------------------------------
  if (koc.brandRejectReason && koc.brandRejectReason.trim()) {
    riskFlags.push({
      id: 'risk-brand-reject-history',
      category: 'BRAND_CONTENT',
      categoryLabel: 'Nội dung & Nhãn hàng',
      severity: 'HIGH',
      title: 'Từng có lịch sử bị Nhãn hàng từ chối hoặc lưu ý đặc biệt',
      detail: `Ghi chú từ chối trong hồ sơ: "${koc.brandRejectReason.trim()}"`,
      mitigation: 'Kiểm tra kỹ hình ảnh kênh hiện tại có xung đột với Brand Guideline của nhãn hàng mục tiêu trước khi đưa vào danh sách đề xuất.',
    });
  }

  const dealNegativeFeedbacks = validDeals.filter(
    d =>
      (d.picCollabReview && /trễ|chậm|kém|khó|lưu ý|hủy|thấp/i.test(d.picCollabReview)) ||
      (d.brandFeedback && /từ chối|sửa|vi phạm|không đạt|chậm/i.test(d.brandFeedback))
  );
  if (dealNegativeFeedbacks.length > 0) {
    riskFlags.push({
      id: 'risk-brand-deal-feedback',
      category: 'BRAND_CONTENT',
      categoryLabel: 'Nội dung & Nhãn hàng',
      severity: 'MEDIUM',
      title: `Có ${dealNegativeFeedbacks.length} ghi chú nhắc nhở từ PIC / Nhãn hàng ở các chiến dịch trước`,
      detail: dealNegativeFeedbacks
        .slice(0, 2)
        .map(d => `${d.brandName}: ${d.picCollabReview || d.brandFeedback}`)
        .join(' | '),
      mitigation: 'Gửi sẵn Brief chi tiết kèm danh sách từ cấm cho KOC xác nhận trước khi bấm máy quay.',
    });
  }

  if (targetCategory && koc.kocCategory && !koc.kocCategory.toLowerCase().includes(targetCategory.toLowerCase())) {
    riskFlags.push({
      id: 'risk-brand-category-mismatch',
      category: 'BRAND_CONTENT',
      categoryLabel: 'Nội dung & Nhãn hàng',
      severity: 'LOW',
      title: `Khác biệt ngành hàng chính (${koc.kocCategory} so với ${targetCategory})`,
      detail: `KOC đang phân loại ở nhóm "${koc.kocCategory}" (Tệp kênh: ${koc.tepKenh || 'Đa ngành'}).`,
      mitigation: 'Chọn góc kịch bản trải nghiệm đời sống (Lifestyle / Tình huống gia đình) để lồng ghép sản phẩm tự nhiên.',
    });
  } else if (koc.kocCategory) {
    strengths.push(
      `Định vị tệp kênh rõ ràng: Ngành ${koc.kocCategory}${koc.tepKenh ? ` · Tệp "${koc.tepKenh}"` : ''}${
        koc.salaryGrade ? ` · Khung ${koc.salaryGrade}` : ''
      }.`
    );
  }

  if (stats.uniqueBrands.length > 0) {
    strengths.push(`Đã có kinh nghiệm hợp tác với ${stats.uniqueBrands.length} nhãn hàng: ${stats.uniqueBrands.slice(0, 5).join(', ')}.`);
  }

  // ---------------------------------------------------------------------------
  // 5. TÍNH ĐIỂM PHÙ HỢP TỔNG THỂ (0 - 100) & KẾT LUẬN
  // ---------------------------------------------------------------------------
  let score = 78;
  // Cộng điểm hiệu quả lịch sử
  if (stats.totalDeals > 0) {
    if (stats.overallRoi >= 3.0) score += 12;
    else if (stats.overallRoi >= 2.0) score += 7;
    else if (stats.overallRoi < 1.2 && stats.totalSpentNet > 0) score -= 12;
  } else {
    score -= 6;
  }
  // Cộng/trừ điểm SLA khi đã có lịch sử deal
  if (stats.totalDeals > 0) {
    if (stats.onTimePostRate >= 90) score += 5;
    else if (stats.onTimePostRate < 75) score -= 12;
  }

  // Trừ điểm theo các cờ rủi ro
  for (const flag of riskFlags) {
    if (flag.severity === 'HIGH') score -= 12;
    else if (flag.severity === 'MEDIUM') score -= 5;
    else score -= 2;
  }

  const suitabilityScore = Math.max(18, Math.min(98, Math.round(score)));
  const highRiskCount = riskFlags.filter(f => f.severity === 'HIGH').length;
  const mediumRiskCount = riskFlags.filter(f => f.severity === 'MEDIUM').length;

  let suitabilityVerdict: KocSuitabilityVerdict = 'HIGHLY_SUITABLE';
  let suitabilityVerdictLabel = 'Phù hợp tái ký — Ưu tiên đề xuất';
  if (suitabilityScore < 55 || highRiskCount >= 2) {
    suitabilityVerdict = 'HIGH_RISK';
    suitabilityVerdictLabel = 'Rủi ro cao — Hạn chế book hoặc chỉ gửi FOC';
  } else if (suitabilityScore < 76 || highRiskCount === 1 || mediumRiskCount >= 2) {
    suitabilityVerdict = 'CONDITIONAL';
    suitabilityVerdictLabel = 'Phù hợp có điều kiện — Cần kiểm soát rủi ro';
  }

  const overallRiskLevel: KocRiskSeverity =
    highRiskCount >= 1 ? 'HIGH' : mediumRiskCount >= 1 ? 'MEDIUM' : 'LOW';
  const overallRiskLabel =
    overallRiskLevel === 'HIGH'
      ? `Rủi ro cao (${highRiskCount} cảnh báo đỏ)`
      : overallRiskLevel === 'MEDIUM'
      ? `Rủi ro trung bình (${mediumRiskCount} điểm cần lưu ý)`
      : 'Rủi ro thấp — Hồ sơ an toàn';

  // ---------------------------------------------------------------------------
  // 6. KHUYẾN NGHỊ ĐÀM PHÁN & HỢP ĐỒNG CỤ THỂ
  // ---------------------------------------------------------------------------
  const recommendedMin = koc.minRate || (avgHistoricalFeeNet > 0 ? Math.round(avgHistoricalFeeNet * 0.85) : 500_000);
  const recommendedMax = koc.maxRate || (avgHistoricalFeeNet > 0 ? Math.round(avgHistoricalFeeNet * 1.1) : 2_000_000);

  if (suitabilityVerdict === 'HIGHLY_SUITABLE') {
    recommendations.push(
      `Đề xuất đưa vào danh sách ưu tiên (Shortlist) đợt 10-20-30${
        targetBrandName ? ` cho nhãn hàng ${targetBrandName}` : ''
      } với mức giá chốt khuyến nghị: ${formatVnd(recommendedMin)} – ${formatVnd(recommendedMax)} (Net).`
    );
  } else if (suitabilityVerdict === 'CONDITIONAL') {
    recommendations.push(
      `Có thể book nhưng giữ đơn giá Net không vượt quá ${formatVnd(
        avgHistoricalFeeNet || recommendedMax
      )} và áp dụng thanh toán 100% sau khi nghiệm thu video + mã Spark Ads.`
    );
  } else {
    recommendations.push(
      'Không khuyến nghị book gói trả phí (Paid) giá cao ở thời điểm hiện tại; nếu muốn thử nghiệm chỉ nên gửi mẫu FOC (0đ) kèm hoa hồng Affiliate.'
    );
  }

  if (!hasValidLegal) {
    recommendations.push('Thu thập và xác minh ảnh CCCD 12 số / Mã số thuế ngay khi KOC xác nhận nhận job.');
  }
  if ((stats.totalDeals > 0 && stats.onTimePostRate < 85) || overdueDeals.length > 0) {
    recommendations.push('Thiết lập mốc nộp kịch bản trước 3 ngày và nộp video nháp trong 5 ngày kể từ ngày nhận hàng mẫu.');
  }
  recommendations.push(
    'Yêu cầu KOC cam kết giữ giỏ hàng gắn sản phẩm và cấp mã quảng cáo Spark Ads tối thiểu 30–60 ngày.'
  );

  // ---------------------------------------------------------------------------
  // 7. DỮ LIỆU NGỮ CẢNH CHI TIẾT ĐỂ ĐƯA VÀO PROMPT BÁO CÁO (LLM)
  // ---------------------------------------------------------------------------
  const dealLines =
    kocDeals.length > 0
      ? kocDeals.slice(0, 10).map((d, idx) => {
          const cost = d.totalValue || 0;
          const gmv = d.gmv30 || d.affiliateGmv || 0;
          const roi = cost > 0 ? `${(gmv / cost).toFixed(2)}x` : 'FOC 0đ';
          return `  ${idx + 1}. Chiến dịch ${d.brandName} (${d.bookingBatch || d.campaignTitle || 'Gần đây'}): Hình thức ${
            cost > 0 ? `Paid (${formatVnd(cost)})` : 'FOC (0đ)'
          } | GMV: ${formatVnd(gmv)} | ROI: ${roi} | Đơn hàng: ${d.ordersCount || 0} | Trạng thái: ${
            d.status
          } | Đúng hạn bài đăng: ${d.isPostOnTime === false ? 'Trễ hạn' : 'Đúng hạn'}${
            d.picCollabReview ? ` | Nhận xét PIC: "${d.picCollabReview}"` : ''
          }${d.brandFeedback ? ` | Phản hồi Brand: "${d.brandFeedback}"` : ''}`;
        })
      : ['  • Chưa có chiến dịch chi tiết nào được ghi nhận trong bảng Booking.'];

  const riskLines =
    riskFlags.length > 0
      ? riskFlags.map(
          (f, idx) =>
            `  ${idx + 1}. [${f.severity} - ${f.categoryLabel}] ${f.title}: ${f.detail} -> Hướng xử lý: ${f.mitigation}`
        )
      : ['  • Không phát hiện cảnh báo rủi ro nghiêm trọng nào.'];

  const contextDataText = [
    `[DỮ LIỆU PHÂN HỆ: Báo Cáo Đánh Giá Lịch Sử Hợp Tác, Mức Độ Phù Hợp & Rủi Ro KOC]`,
    `- KOC: ${koc.stageName} (@${koc.channelId.replace(/^@/, '')}) | Tên thật: ${koc.realName || 'Chưa cập nhật'}`,
    `- Phân loại: Ngành ${koc.kocCategory || 'Chưa phân ngành'} | Tệp kênh: ${koc.tepKenh || koc.creatorCategory || 'Chưa gán'} | Khung lương: ${koc.salaryGrade || 'Chưa phân khung'}`,
    `- Quy mô kênh: ${koc.followers?.toLocaleString('vi-VN') || 0} người theo dõi | View trung bình: ${koc.avgViews?.toLocaleString('vi-VN') || 0} | Tỷ lệ hủy đơn TikTok: ${koc.tiktokCancellationRate ?? 'Chưa có'}%`,
    `- Bối cảnh đang thẩm định: Nhãn hàng mục tiêu: ${targetBrandName || 'Đánh giá tổng thể đa nhãn'} | Đơn giá đề xuất: ${proposedFeeNet ? formatVnd(proposedFeeNet) : 'Theo khung lịch sử'}`,
    `- Điểm phù hợp hệ thống chấm: ${suitabilityScore}/100 (${suitabilityVerdictLabel}) | Mức độ rủi ro: ${overallRiskLabel}`,
    `- Tổng hợp lịch sử hợp tác: Tổng ${stats.totalDeals} chiến dịch (${stats.paidDealsCount} Paid, ${stats.focDealsCount} FOC) | Hoàn tất: ${stats.completedDeals} | Đang chạy: ${stats.runningDeals} | Đã hủy: ${stats.cancelledDeals}`,
    `- Hiệu quả thương mại lũy kế: Tổng chi phí Net = ${formatVnd(stats.totalSpentNet)} | Ngân sách Spark Ads = ${formatVnd(stats.totalAdsBudget)} | Tổng GMV tạo ra = ${formatVnd(stats.totalGmv)} | ROI trung bình = ${stats.overallRoi.toFixed(2)}x | Tổng đơn = ${stats.totalOrders} đơn (CPO = ${formatVnd(stats.avgCpo)}) | Tỷ lệ deal có lãi (ROI >= 2.0x) = ${profitableDealRatio}%`,
    `- Khung giá lịch sử: Min ${formatVnd(koc.minRate || 0)} – Max ${formatVnd(koc.maxRate || 0)} (Trung bình thực chi: ${formatVnd(avgHistoricalFeeNet)})`,
    `- Kỷ luật tiến độ & SLA: Điểm tín nhiệm ${koc.reliabilityScore ?? 85}/100 | Nộp kịch bản đúng hạn ${stats.onTimeScriptRate}% | Lên bài đúng hạn ${stats.onTimePostRate}% | Bàn giao mã Spark Ads ${stats.sparkComplianceRate}%`,
    `- Tình trạng Pháp lý & Thanh toán: ${legalStatusLabel} | Đầu mối MCN dùng chung: ${koc.sharedMcnInfo ? `${koc.sharedMcnInfo} (MCN)` : 'Không'} | Số tài khoản nhận tiền hộ đã đổi: ${koc.alternatePayees?.length || 0}`,
    `- Ghi chú nội bộ & Lịch sử từ chối: Nhận xét PIC: "${koc.accountComment || 'Không có'}" | Lý do Brand từng từ chối: "${koc.brandRejectReason || 'Không có'}"`,
    `- Chi tiết các chiến dịch đã thực hiện:`,
    ...dealLines,
    `- Danh sách các rủi ro hệ thống phát hiện:`,
    ...riskLines,
  ].join('\n');

  return {
    kocId: koc.id,
    stageName: koc.stageName,
    channelId: koc.channelId,
    suitabilityVerdict,
    suitabilityVerdictLabel,
    suitabilityScore,
    overallRiskLevel,
    overallRiskLabel,
    stats,
    dealCount: stats.totalDeals,
    overdueDealCount: overdueDeals.length,
    profitableDealCount: profitableDeals.length,
    profitableDealRatio,
    avgHistoricalFeeNet,
    legalStatusLabel,
    legalTypeLabel,
    riskFlags,
    strengths,
    recommendations,
    contextDataText,
  };
}
