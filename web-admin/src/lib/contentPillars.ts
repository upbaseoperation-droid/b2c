// Danh mục content pillar theo bảng 5.5 Pillar content của Lark Base (15 pillar, gom theo Tag Pillar).
export interface ContentPillar {
  name: string;
  group: string;
  definition: string;
}

export const CONTENT_PILLARS: ContentPillar[] = [
  { name: 'Review trực tiếp', group: 'Review trực tiếp', definition: 'KOL/KOC quay video trải nghiệm trực tiếp sản phẩm, trên 70% thời lượng tập trung vào sản phẩm hoặc thương hiệu. Thể hiện nội dung Paid Media.' },
  { name: 'Nỗi đau - Giải pháp', group: 'Review trực tiếp', definition: 'Đặt vấn đề (pain point) của khách hàng và đưa ra sản phẩm như giải pháp. Thường dùng format Before/After.' },
  { name: 'Unboxing', group: 'Review trực tiếp', definition: 'Unbox, UGC không quay cận mặt.' },
  { name: 'FOMO', group: 'Review trực tiếp', definition: 'Tạo nội dung theo hiệu ứng "fear of missing out": trend, hot, duet với người nổi tiếng.' },
  { name: 'Content gây tranh cãi', group: 'Content gây tranh cãi', definition: 'Khơi gợi tranh luận, quan điểm trái chiều. Nội dung thiên hướng Earned Media.' },
  { name: 'Daily Vlog – Storytelling', group: 'Storytelling', definition: 'Lồng ghép sản phẩm tự nhiên trong cuộc sống hàng ngày, sản phẩm chiếm dưới 50% thời lượng video.' },
  { name: 'Nội dung doanh nghiệp', group: 'Storytelling', definition: 'Kể câu chuyện thương hiệu, văn hóa, hành trình phát triển. Tạo brand trust.' },
  { name: 'PR báo chí', group: 'Storytelling', definition: 'Nội dung truyền thông chính thống: báo chí, phỏng vấn, coverage. Xây uy tín thương hiệu.' },
  { name: 'Educate', group: 'Educate', definition: 'Chia sẻ kiến thức, tips, insight liên quan đến sản phẩm hoặc ngành hàng. Mang tính chuyên gia, giá trị cộng đồng.' },
  { name: 'Q&A', group: 'Educate', definition: 'Dạng hỏi đáp, giải đáp thắc mắc khách hàng. Tạo cảm giác tương tác, gần gũi.' },
  { name: 'Feedback', group: 'Feedback', definition: 'Đưa đánh giá khách quan về sản phẩm, có thể re-up trải nghiệm từ khách hàng. Review trung lập, khách quan.' },
  { name: 'Promotion/Teasing', group: 'Promotion/Teasing', definition: 'Nội dung khuyến mãi, ưu đãi, ra mắt sản phẩm hoặc call-to-action cho Livestream.' },
  { name: 'Entertainment', group: 'Entertainment', definition: 'Nội dung xây dựng để thu hút, giải trí cho người xem thay vì review hay bán hàng trực tiếp. Có thể gắn sản phẩm khéo léo.' },
  { name: 'PR ngoại sàn', group: 'Khác', definition: 'Banner truyền thông qua ngoại sàn.' },
  { name: 'Livestream', group: 'Khác', definition: 'Nội dung phục vụ livestream.' },
];

export const pillarGroupOf = (name: string): string => CONTENT_PILLARS.find(p => p.name === name)?.group ?? 'Khác';
