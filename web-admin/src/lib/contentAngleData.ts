import { ContentAngleItem } from './types';

export const INITIAL_CONTENT_ANGLES: ContentAngleItem[] = [];


// Helper: Gợi ý 3 góc kịch bản theo sản phẩm và trụ cột nội dung
export function generateAiAngleSuggestions(
  productName: string,
  pillarName: string,
  brandName: string
): Array<Omit<ContentAngleItem, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'usageCount'>> {
  const pName = productName || 'sản phẩm';
  const bName = brandName || 'nhãn hàng';

  return [
    {
      name: `Xử lý tình huống thực tế với ${pName}`,
      pillarId: 'PIL-02',
      pillarName: pillarName || 'Nỗi đau - Giải pháp',
      pillarCode: 'PROBLEM_SOLUTION',
      productId: 'temp-prod',
      productName: pName,
      brandName: bName,
      storeName: `${bName} Official Store`,
      hookIdea: `Cách mình xử lý tình trạng da khó chịu chỉ sau vài ngày dùng ${pName}.`,
      painPoint: `Người dùng chọn nhầm sản phẩm không hợp tình trạng da hoặc dùng chưa đúng liều lượng khuyến nghị.`,
      solutionApproach: `Quay cận cảnh kết cấu ${pName}, hướng dẫn cách bôi/sử dụng đúng bước và kết quả sau 3–7 ngày.`,
      keySellingPoints: [
        `Bảng thành phần công bố rõ ràng từ ${bName}`,
        `Dịu nhẹ, thấm nhanh, không nhờn rít`,
        `Gian hàng chính hãng trên sàn`
      ],
      targetAudience: 'Khách hàng đang gặp vấn đề thực tế cần sản phẩm xử lý đúng nhu cầu',
      callToAction: `Bấm vào giỏ hàng góc trái để xem giá ưu đãi hôm nay của ${bName}.`,
      suggestedFormat: 'Quay tình huống trước/sau + Lồng tiếng hướng dẫn',
      status: 'ACTIVE'
    },
    {
      name: `Đánh giá thực tế chất sản phẩm ${pName} dưới camera thường`,
      pillarId: 'PIL-01',
      pillarName: 'Review trực tiếp',
      pillarCode: 'DIRECT_REVIEW',
      productId: 'temp-prod',
      productName: pName,
      brandName: bName,
      storeName: `${bName} Official Store`,
      hookIdea: `Kiểm tra chất kem và độ thẩm thấu thực tế của ${pName} dưới ánh sáng thường.`,
      painPoint: 'Khách hàng lo mua phải hàng không rõ nguồn gốc hoặc chất sản phẩm bị bết dính.',
      solutionApproach: `Quay cận cảnh bao bì, tem phụ chính hãng, thử chất sản phẩm trực tiếp trên da và nêu cảm nhận thật.`,
      keySellingPoints: [
        'Hàng chính hãng có đầy đủ giấy công bố',
        'Êm dịu trên da, mùi hương nhẹ',
        'Có chính sách đổi trả của gian hàng Mall'
      ],
      targetAudience: 'Người mua kỹ tính, cần xem chất sản phẩm thực tế trước khi đặt đơn',
      callToAction: `Sản phẩm chính hãng mình gắn ở giỏ hàng góc trái màn hình.`,
      suggestedFormat: 'Chia sẻ trực tiếp + Cảnh quay cận chất sản phẩm',
      status: 'ACTIVE'
    },
    {
      name: `Mở hộp đơn hàng & Lồng ghép ${pName} vào sinh hoạt hằng ngày`,
      pillarId: 'PIL-06',
      pillarName: 'Mở hộp & trải nghiệm',
      pillarCode: 'PILLAR_6',
      productId: 'temp-prod',
      productName: pName,
      brandName: bName,
      storeName: `${bName} Official Store`,
      hookIdea: `Đập hộp kiện hàng vừa đặt từ gian hàng ${bName} xem đóng gói và quà tặng kèm có gì.`,
      painPoint: 'Người mua muốn biết quy cách đóng gói thực tế, hạn sử dụng và quà tặng kèm khi đặt trên sàn.',
      solutionApproach: `Mở kiện hàng, quay rõ hạn sử dụng trên vỏ hộp và dùng thử ${pName} trong bước chăm sóc cá nhân hằng ngày.`,
      keySellingPoints: [
        'Đóng gói chắc chắn, date mới',
        'Dễ sử dụng hằng ngày tại nhà',
        'Có mã giảm giá và quà tặng theo khung giờ'
      ],
      targetAudience: 'Khách mua sắm trên TikTok Shop và Shopee quan tâm ưu đãi và quà tặng',
      callToAction: `Bấm vào giỏ hàng bên dưới để áp mã giảm giá của shop.`,
      suggestedFormat: 'Mở hộp âm thanh thực + Cảnh sử dụng hằng ngày',
      status: 'ACTIVE'
    }
  ];
}
