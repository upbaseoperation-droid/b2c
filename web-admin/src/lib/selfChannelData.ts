import { 
  MasterContentPillar,
  SelfChannelContentPillar, 
  BrandChannelAllocation, 
  Contributor, 
  SelfChannelVideoTask 
} from './types';

// ==========================================
// 1. MASTER DATA: DANH MỤC TRỤ CỘT NỘI DUNG (CONTENT PILLARS)
// Dùng làm chuẩn chung toàn hệ thống B2C cho mọi Brand & Kế hoạch
// ==========================================
export const INITIAL_MASTER_PILLARS: MasterContentPillar[] = [
  {
    id: 'MASTER-PIL-01',
    code: 'EDUCATIONAL',
    name: 'Giáo Dục & Tư Vấn Chuyên Gia',
    description: 'Bác sĩ, dược sĩ hoặc chuyên gia chuyên ngành giải thích cơ chế bệnh lý, khoa học làn da, hướng dẫn phòng ngừa và chăm sóc chuẩn y khoa.',
    applicableNiches: ['Mẹ & Bé', 'Chăm Sóc Da', 'Sức Khỏe'],
    suggestedFormats: ['Voiceover chuyên gia + B-roll', 'Q&A giải đáp thắc mắc', 'Infographic trực quan'],
    benchmarkUnitCost: 1500000,
    targetAudience: 'Phụ huynh có con nhỏ, người có vấn đề da liễu cần giải pháp khoa học uy tín',
    keyObjectives: 'Xây dựng uy tín nhãn hàng, định vị chuyên môn và tạo niềm tin bền vững',
    status: 'ACTIVE',
    colorTag: '#4F46E5',
    activeBrandsCount: 5,
    createdAt: '2026-08-15'
  },
  {
    id: 'MASTER-PIL-02',
    code: 'PRODUCT_SHOWCASE',
    name: 'Demo Trải Nghiệm & Hướng Dẫn Sử Dụng',
    description: 'Cận cảnh chất kem/sản phẩm, test độ thấm, hướng dẫn quy trình sử dụng từng bước chuẩn xác, đánh giá cảm quan thực tế trên da.',
    applicableNiches: ['Mẹ & Bé', 'Chăm Sóc Da', 'Gia Dụng & Đời Sống', 'Chăm Sóc Cá Nhân'],
    suggestedFormats: ['Cận cảnh macro test chất kem', 'Quy trình 3 bước sử dụng', 'Review cảm giác thẩm thấu'],
    benchmarkUnitCost: 1000000,
    targetAudience: 'Khách hàng đang tìm hiểu chi tiết thành phần & tính năng trước khi quyết định mua',
    keyObjectives: 'Thúc đẩy chuyển đổi giỏ hàng, giảm tỷ lệ đổi trả do dùng sai cách',
    status: 'ACTIVE',
    colorTag: '#0284C7',
    activeBrandsCount: 8,
    createdAt: '2026-08-15'
  },
  {
    id: 'MASTER-PIL-03',
    code: 'STORYTELLING',
    name: 'Tình Huống & Drama Đời Thực',
    description: 'Khoảnh khắc cứu nguy da bé nửa đêm, chuyện bố chăm con vụng về, tâm sự mẹ bỉm trải lòng lồng ghép khéo léo giải pháp của sản phẩm.',
    applicableNiches: ['Mẹ & Bé', 'Gia Dụng & Đời Sống', 'F&B', 'Toàn ngành'],
    suggestedFormats: ['Tình huống đối thoại 2 người', 'POV tâm sự trải lòng', 'Hài hước nhẹ nhàng đời sống'],
    benchmarkUnitCost: 1500000,
    targetAudience: 'Người dùng lướt feed mạng xã hội giải trí, gia đình trẻ, mẹ bỉm sữa',
    keyObjectives: 'Tạo cảm xúc đồng điệu, tăng organic reach tự nhiên và độ thiện cảm thương hiệu',
    status: 'ACTIVE',
    colorTag: '#E11D48',
    activeBrandsCount: 4,
    createdAt: '2026-08-20'
  },
  {
    id: 'MASTER-PIL-04',
    code: 'TREND_JACKING',
    name: 'Bắt Trend & Âm Thanh Hot TikTok',
    description: 'Bắt nhịp âm thanh hot trend, meme, template thịnh hành hoặc challenge mới nổi, lồng ghép nhận diện thương hiệu trong 3-5 giây đầu.',
    applicableNiches: ['Chăm Sóc Da', 'Mẹ & Bé', 'Thời Trang', 'Toàn ngành'],
    suggestedFormats: ['Biến hình trước / sau 3s', 'Nhạc xu hướng thịnh hành', 'Template Capcut thịnh hành'],
    benchmarkUnitCost: 1000000,
    targetAudience: 'Gen Z, Millennials lướt nhanh mục Dành Cho Bạn (FYP)',
    keyObjectives: 'Tận dụng thuật toán phân phối, tạo đột biến lượt xem và độ phủ nhận diện',
    status: 'ACTIVE',
    colorTag: '#D97706',
    activeBrandsCount: 6,
    createdAt: '2026-08-22'
  },
  {
    id: 'MASTER-PIL-05',
    code: 'PROBLEM_SOLUTION',
    name: 'Nỗi Đau & Giải Pháp Đột Phá',
    description: 'Mở đầu trực diện với nỗi đau bức bối (con gãi ngứa trầy xước, da mẩn đỏ quấy khóc), phân tích nguyên nhân sai lầm và đưa giải pháp dứt điểm.',
    applicableNiches: ['Mẹ & Bé', 'Chăm Sóc Da', 'Sức Khỏe', 'Gia Dụng & Đời Sống'],
    suggestedFormats: ['Hook 3s nỗi đau cấp bách', 'Chỉ rõ sai lầm thường gặp', 'Giải pháp xử lý dứt điểm'],
    benchmarkUnitCost: 1300000,
    targetAudience: 'Người đang chịu vấn đề nhức nhối cấp thiết cần giải pháp ngay',
    keyObjectives: 'Kích hoạt hành động mua ngay (Direct Response), tăng tỷ lệ nhấp giỏ hàng',
    status: 'ACTIVE',
    colorTag: '#7C3AED',
    activeBrandsCount: 7,
    createdAt: '2026-09-01'
  },
  {
    id: 'MASTER-PIL-06',
    code: 'TESTIMONIAL',
    name: 'Feedback & Chứng Thực Khách Hàng',
    description: 'Câu chuyện trải nghiệm thực tế trước và sau khi dùng (Before/After) có kiểm chứng, mở hộp tin nhắn phản hồi của khách hàng thân thiết.',
    applicableNiches: ['Mẹ & Bé', 'Chăm Sóc Da', 'Sức Khỏe'],
    suggestedFormats: ['So sánh Before / After có kiểm chứng', 'Phỏng vấn khách hàng thực tế', 'Mở tin nhắn feedback chân thật'],
    benchmarkUnitCost: 1200000,
    targetAudience: 'Khách hàng đang phân vân so sánh giữa nhiều thương hiệu đối thủ',
    keyObjectives: 'Xóa bỏ rào cản do dự (Social Proof), củng cố quyết định chốt đơn',
    status: 'ACTIVE',
    colorTag: '#059669',
    activeBrandsCount: 5,
    createdAt: '2026-09-05'
  },
  {
    id: 'MASTER-PIL-07',
    code: 'BEHIND_SCENES',
    name: 'Hậu Trường Sản Xuất & Kiểm Định Chất Lượng',
    description: 'Thước phim tại nhà máy chuẩn CGMP, phòng lab R&D nghiên cứu công thức, quy trình đóng gói vô trùng và tem chống hàng giả minh bạch.',
    applicableNiches: ['Mẹ & Bé', 'Dược Mỹ Phẩm', 'F&B Thực Phẩm Sạch'],
    suggestedFormats: ['Tham quan nhà máy CGMP', 'Kiểm nghiệm trong phòng Lab', 'Quy trình đóng gói gửi hàng'],
    benchmarkUnitCost: 1800000,
    targetAudience: 'Khách hàng kỹ tính, đề cao nguồn gốc xuất xứ và quy chuẩn kiểm nghiệm',
    keyObjectives: 'Khẳng định vị thế thương hiệu cao cấp, bảo chứng chất lượng và tính minh bạch',
    status: 'ACTIVE',
    colorTag: '#0D9488',
    activeBrandsCount: 3,
    createdAt: '2026-09-10'
  },
  {
    id: 'MASTER-PIL-08',
    code: 'UNBOXING_ASMR',
    name: 'Đập Hộp & Trải Nghiệm Giác Quan ASMR',
    description: 'Âm thanh mở hộp giòn tan, bóc seal, kiểm tra tem niêm phong, tiếng xịt/thoa kem êm tai tạo cảm giác thư giãn và trải nghiệm sở hữu cao cấp.',
    applicableNiches: ['Chăm Sóc Da', 'Mẹ & Bé', 'Gia Dụng & Đời Sống'],
    suggestedFormats: ['ASMR thu âm chân thực không nhạc nền', 'Unboxing cận cảnh chi tiết quà tặng & bao bì'],
    benchmarkUnitCost: 900000,
    targetAudience: 'Người xem thích trải nghiệm giác quan, giới trẻ chuộng bao bì thẩm mỹ',
    keyObjectives: 'Tăng thời gian xem trung bình (Watch Time), kích thích cảm giác muốn sở hữu',
    status: 'ACTIVE',
    colorTag: '#6366F1',
    activeBrandsCount: 4,
    createdAt: '2026-09-15'
  }
];

// ==========================================
// 2. TRỤ CỘT NỘI DUNG MẪU ÁP DỤNG TRONG KẾ HOẠCH (PLANNING PILLARS)
// ==========================================
export const DEFAULT_CONTENT_PILLARS: SelfChannelContentPillar[] = [
  {
    id: 'pillar-edu',
    masterPillarId: 'MASTER-PIL-01',
    name: 'Giáo Dục / Lời Khuyên Chuyên Gia',
    code: 'EDUCATIONAL',
    description: 'Bác sĩ / Dược sĩ chia sẻ kiến thức bệnh lý chàm sữa, hăm tã, phòng chống côn trùng đốt.',
    targetVideos: 12,
    completedVideos: 9,
    allocatedBudget: 18000000, // 18 Tr
    unitCostPerVideo: 1500000, // 1.5 Tr / video
    targetViews: 350000,
    coreSkuIds: ['KUTIE-SOOTH-30G'],
    color: '#4F46E5' // Indigo
  },
  {
    id: 'pillar-showcase',
    masterPillarId: 'MASTER-PIL-02',
    name: 'Demo Trải Nghiệm & Hướng Dẫn Sử Dụng',
    code: 'PRODUCT_SHOWCASE',
    description: 'Cận cảnh chất kem, test độ thấm, quy trình 3 bước bôi kem chuẩn y khoa cho da bé.',
    targetVideos: 15,
    completedVideos: 11,
    allocatedBudget: 15000000, // 15 Tr
    unitCostPerVideo: 1000000, // 1.0 Tr / video
    targetViews: 400000,
    coreSkuIds: ['KUTIE-SOOTH-30G', 'KUTIE-BATH-250ML'],
    color: '#0284C7' // Sky
  },
  {
    id: 'pillar-story',
    masterPillarId: 'MASTER-PIL-03',
    name: 'Tình Huống / Drama Gia Đình Nuôi Con',
    code: 'STORYTELLING',
    description: 'Khoảnh khắc cứu nguy da bé nửa đêm, chuyện bố chăm con vụng về, mẹ bỉm tâm sự.',
    targetVideos: 8,
    completedVideos: 5,
    allocatedBudget: 12000000, // 12 Tr
    unitCostPerVideo: 1500000, // 1.5 Tr / video
    targetViews: 500000,
    coreSkuIds: ['KUTIE-MOSQ-20ML'],
    color: '#E11D48' // Rose
  },
  {
    id: 'pillar-trend',
    masterPillarId: 'MASTER-PIL-04',
    name: 'Bắt Trend TikTok & Âm Thanh Hot',
    code: 'TREND_JACKING',
    description: 'Biến tấu nhạc viral, unboxing nhịp nhanh, review biến hình trước và sau khi bôi kem.',
    targetVideos: 5,
    completedVideos: 3,
    allocatedBudget: 5000000, // 5 Tr
    unitCostPerVideo: 1000000, // 1.0 Tr / video
    targetViews: 250000,
    coreSkuIds: ['KUTIE-LIP-5G'],
    color: '#D97706' // Amber
  }
];

// ==========================================
// 2. PHÂN BỔ NGÂN SÁCH BRAND MẪU (200 TR: 150 TR AFFILIATE - 50 TR SELF CHANNEL)
// ==========================================
export const MOCK_BRAND_ALLOCATION: BrandChannelAllocation = {
  brandId: 'brand-kutieskin',
  brandName: 'Kutieskin Mama & Baby',
  totalBudget: 200000000, // 200 Triệu VNĐ
  
  // Luồng 1: Affiliate
  budgetAffiliate: 150000000, // 150 Triệu (75%)
  targetAffiliateVideos: 85,
  targetAffiliateGmv: 650000000, // 650 Triệu
  affiliateNotes: 'Chi cho 85 KOC ngoại sàn theo bậc lương KL1 - KL4, tập trung kéo GMV cho Mega 10.10 & Payday.',
  
  // Luồng 2: Self Channel
  budgetSelfChannel: 50000000, // 50 Triệu (25%)
  targetSelfChannelVideos: 40,
  selfChannelNotes: 'Sản xuất 40 video chất lượng cao đăng trực tiếp kênh TikTok Shop & Fanpage Kutieskin, cấp quyền Spark Ads.',
  pillars: DEFAULT_CONTENT_PILLARS
};

// ==========================================
// 3. DANH SÁCH CỘNG TÁC VIÊN LÀM VIDEO (CTV ROSTER)
// ==========================================
export const INITIAL_CONTRIBUTORS: Contributor[] = [
  {
    id: 'ctv-1',
    name: 'Nguyễn Hoàng Yến',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '0981 234 567',
    email: 'hoangyen.creative@gmail.com',
    channelLink: 'https://www.tiktok.com/@mebim.hoangyen',
    nicheSpecialty: ['Mẹ & Bé', 'Nuôi con khoa học', 'Chăm da gia đình'],
    role: 'ALL_IN_ONE',
    status: 'ACTIVE',
    bankName: 'Techcombank',
    bankAccount: '19034567890012',
    bankAccountName: 'NGUYEN HOANG YEN',
    ratingScore: 4.9,
    assignedTaskCount: 14,
    completedTaskCount: 12,
    totalPaidAmount: 18000000,
    joinedDate: '2026-03-15',
    notes: 'Kịch bản rất tự nhiên, có em bé 14 tháng tuổi hợp tác quay ăn ý.'
  },
  {
    id: 'ctv-2',
    name: 'Trần Quốc Huy (Huy Dựng Phim)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    phone: '0978 889 912',
    email: 'huytran.editor@gmail.com',
    channelLink: 'https://portfolio.huyvideo.vn',
    nicheSpecialty: ['Video Dựng Nhanh', 'Visual Effects', 'Review Công nghệ & Mỹ phẩm'],
    role: 'VIDEO_EDITOR',
    status: 'ACTIVE',
    bankName: 'MB Bank',
    bankAccount: '0978889912',
    bankAccountName: 'TRAN QUOC HUY',
    ratingScore: 4.8,
    assignedTaskCount: 18,
    completedTaskCount: 16,
    totalPaidAmount: 16000000,
    joinedDate: '2026-02-10',
    notes: 'Chuyên edit video ngắn bắt trend, chèn text motion và sound effect rất mượt.'
  },
  {
    id: 'ctv-3',
    name: 'Dược Sĩ Lê Mai Anh',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    phone: '0912 345 889',
    email: 'maianh.pharmacist@gmail.com',
    channelLink: 'https://www.tiktok.com/@duocsi.maianh',
    nicheSpecialty: ['Tư vấn Y Dược', 'Thành phần mỹ phẩm', 'Chăm sóc mẹ bầu & sơ sinh'],
    role: 'CREATIVE_ACTOR',
    status: 'ACTIVE',
    bankName: 'Vietcombank',
    bankAccount: '0011004567890',
    bankAccountName: 'LE MAI ANH',
    ratingScore: 5.0,
    assignedTaskCount: 8,
    completedTaskCount: 7,
    totalPaidAmount: 10500000,
    joinedDate: '2026-05-01',
    notes: 'Khuôn mặt sáng, giọng nói truyền cảm, uy tín chuyên gia rất cao.'
  },
  {
    id: 'ctv-4',
    name: 'Phạm Đức Minh & Bé Gấu',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    phone: '0966 778 899',
    email: 'ducminh.family@gmail.com',
    channelLink: 'https://www.tiktok.com/@nhaco.begau',
    nicheSpecialty: ['Bố bỉm sữa', 'Tình huống hài hước', 'Đời sống gia đình'],
    role: 'ALL_IN_ONE',
    status: 'ACTIVE',
    bankName: 'VPBank',
    bankAccount: '1568899234',
    bankAccountName: 'PHAM DUC MINH',
    ratingScore: 4.7,
    assignedTaskCount: 10,
    completedTaskCount: 8,
    totalPaidAmount: 12000000,
    joinedDate: '2026-04-20',
    notes: 'Gia đình trẻ quay tình huống rất duyên, video dễ lên xu hướng.'
  },
  {
    id: 'ctv-5',
    name: 'Vũ Thảo Linh (Content Creator)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    phone: '0934 567 123',
    email: 'thaolinh.writer@gmail.com',
    channelLink: 'https://www.tiktok.com/@linhvu.review',
    nicheSpecialty: ['Biên kịch Hook', 'Review đời thường', 'Lifestyle'],
    role: 'SCRIPTWRITER',
    status: 'ACTIVE',
    bankName: 'ACB',
    bankAccount: '246813579',
    bankAccountName: 'VU THAO LINH',
    ratingScore: 4.6,
    assignedTaskCount: 12,
    completedTaskCount: 10,
    totalPaidAmount: 8000000,
    joinedDate: '2026-06-12',
    notes: 'Viết kịch bản 3 giây đầu rất bắt tai, tỷ lệ giữ chân người xem cao.'
  }
];

// ==========================================
// 4. DANH SÁCH TASK SẢN XUẤT VIDEO SELF CHANNEL (VIDEO PIPELINE)
// ==========================================
export const INITIAL_SELF_CHANNEL_TASKS: SelfChannelVideoTask[] = [
  // 1. OPEN_TASK (Mở task chờ nhận)
  {
    id: 'task-sc-01',
    taskCode: 'SC-KUTI-202610-01',
    title: 'Giải đáp: Vì sao bé bị chàm sữa tái đi tái lại vào mùa hanh khô?',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    pillarId: 'pillar-edu',
    pillarName: 'Giáo Dục / Lời Khuyên Chuyên Gia',
    pillarCode: 'EDUCATIONAL',
    linkedSku: 'KUTIE-SOOTH-30G',
    productName: 'Kem Bôi Dịu Da Kutieskin 30g',
    remuneration: 1500000,
    deadline: '2026-10-18',
    status: 'OPEN_TASK',
    feedbackLogs: [],
    createdAt: '2026-10-06T08:00:00Z'
  },
  
  // 2. SCRIPT_PENDING_REVIEW (Chờ duyệt kịch bản)
  {
    id: 'task-sc-02',
    taskCode: 'SC-KUTI-202610-02',
    title: 'Test cận cảnh độ thấm của chất kem Nano Bạc trên da em bé',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    pillarId: 'pillar-showcase',
    pillarName: 'Demo Trải Nghiệm & Hướng Dẫn Sử Dụng',
    pillarCode: 'PRODUCT_SHOWCASE',
    linkedSku: 'KUTIE-SOOTH-30G',
    productName: 'Kem Bôi Dịu Da Kutieskin 30g',
    remuneration: 1000000,
    deadline: '2026-10-15',
    contributorId: 'ctv-1',
    contributorName: 'Nguyễn Hoàng Yến',
    contributorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    status: 'SCRIPT_PENDING_REVIEW',
    scriptContent: {
      hook: 'Nhiều mẹ sợ bôi kem cho bé bị bết dính bí da, nhìn kỹ thử nghiệm này xem có thật không nha!',
      body: 'Quay cận chất kem mỏng nhẹ màu trắng ngà. Bôi 1 lượng nhỏ lên mu bàn tay bé, thoa nhẹ trong 5 giây. Đặt miếng giấy thấm dầu lên, lắc nhẹ miếng giấy rơi ngay, không hề để lại bóng dầu.',
      cta: 'Mẹ nào da con đang khô ngứa chàm sữa thì nhấn ngay giỏ hàng góc trái nhận deal hời 79k nhé!',
      submittedAt: '2026-10-07T14:30:00Z'
    },
    feedbackLogs: [],
    createdAt: '2026-10-05T09:00:00Z'
  },

  // 3. SCRIPT_APPROVED (Kịch bản đã duyệt -> Đang quay dựng)
  {
    id: 'task-sc-03',
    taskCode: 'SC-KUTI-202610-03',
    title: 'Khoảnh khắc cứu nguy nốt muỗi đốt sưng to lúc nửa đêm',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    pillarId: 'pillar-story',
    pillarName: 'Tình Huống / Drama Gia Đình Nuôi Con',
    pillarCode: 'STORYTELLING',
    linkedSku: 'KUTIE-MOSQ-20ML',
    productName: 'Tinh Chất Bôi Muỗi Đốt Kutieskin 20ml',
    remuneration: 1500000,
    deadline: '2026-10-14',
    contributorId: 'ctv-4',
    contributorName: 'Phạm Đức Minh & Bé Gấu',
    contributorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    status: 'SCRIPT_APPROVED',
    scriptContent: {
      hook: 'Nửa đêm con khóc thét vì muỗi cắn mí mắt, mẹ xem cách bố xử lý chỉ sau 1 nốt nhạc!',
      body: 'Cảnh 12h đêm bé trằn trọc gãi má. Bố lấy tuýp tinh chất tràm trà mát lạnh thoa 1 chấm nhỏ. Bé dịu ngay cơn ngứa và ngủ lại ngon lành.',
      cta: 'Cứu cánh không thể thiếu trong tủ thuốc của mọi nhà có con nhỏ, link ở góc màn hình!',
      submittedAt: '2026-10-04T10:00:00Z'
    },
    feedbackLogs: [
      {
        id: 'fb-01',
        version: 1,
        reviewedBy: 'Khánh Vy (B2C Lead)',
        reviewedAt: '2026-10-04T16:00:00Z',
        type: 'SCRIPT',
        verdict: 'APPROVED',
        comment: 'Kịch bản rất xúc động và đúng insight bố chăm con. Duyệt kịch bản, tiến hành quay dựng ngay nhé anh Minh!'
      }
    ],
    createdAt: '2026-10-03T09:00:00Z'
  },

  // 4. DRAFT_VIDEO_SUBMITTED (Chờ duyệt video nháp)
  {
    id: 'task-sc-04',
    taskCode: 'SC-KUTI-202610-04',
    title: 'Dược sĩ hướng dẫn quy tắc 3 phút bôi dưỡng ẩm sau khi tắm cho bé',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    pillarId: 'pillar-edu',
    pillarName: 'Giáo Dục / Lời Khuyên Chuyên Gia',
    pillarCode: 'EDUCATIONAL',
    linkedSku: 'KUTIE-BATH-250ML',
    productName: 'Nước Tắm Gội Thảo Dược Kutieskin 250ml',
    remuneration: 1500000,
    deadline: '2026-10-12',
    contributorId: 'ctv-3',
    contributorName: 'Dược Sĩ Lê Mai Anh',
    contributorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    status: 'DRAFT_VIDEO_SUBMITTED',
    scriptContent: {
      hook: 'Sai lầm 90% mẹ bỉm mắc phải: Đợi da con khô cong mới bôi kem ẩm!',
      body: 'Dược sĩ giải thích nguyên lý khóa ẩm vàng trong 3 phút đầu sau khi tắm bằng nước tắm thảo dược.',
      cta: 'Combo tắm gội + dưỡng da Kutieskin đang có deal độc quyền trong livestream tối nay!'
    },
    videoDeliverables: {
      currentVersion: 1,
      draftVideoUrl: 'https://drive.google.com/kutieskin-draft-v1-maianh.mp4',
      captionSuggested: 'Thời điểm vàng 3 phút khóa ẩm cho da bé không phải mẹ nào cũng biết! #kutieskin #chamsocdabe #duocsi',
      durationSeconds: 48,
      submittedAt: '2026-10-07T11:00:00Z'
    },
    feedbackLogs: [],
    createdAt: '2026-10-02T10:00:00Z'
  },

  // 5. ACCEPTED_COMPLETED (Đã nghiệm thu - Chờ chi trả)
  {
    id: 'task-sc-05',
    taskCode: 'SC-KUTI-202610-05',
    title: 'Biến hình 5 giây: Em bé thơm tho sạch rôm sảy sau bồn tắm thảo mộc',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    pillarId: 'pillar-trend',
    pillarName: 'Bắt Trend TikTok & Âm Thanh Hot',
    pillarCode: 'TREND_JACKING',
    linkedSku: 'KUTIE-BATH-250ML',
    productName: 'Nước Tắm Gội Thảo Dược Kutieskin 250ml',
    remuneration: 1000000,
    deadline: '2026-10-08',
    contributorId: 'ctv-2',
    contributorName: 'Trần Quốc Huy (Huy Dựng Phim)',
    contributorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    status: 'ACCEPTED_COMPLETED',
    videoDeliverables: {
      currentVersion: 2,
      draftVideoUrl: 'https://drive.google.com/kutieskin-trend-bath-v1.mp4',
      finalVideoUrl: 'https://drive.google.com/kutieskin-trend-bath-final.mp4',
      captionSuggested: 'Tắm mát rượi bé cười tít mắt, da sạch thơm tự nhiên 🌿 #kutieskin #nuoctamthaoduoc',
      durationSeconds: 28,
      submittedAt: '2026-10-06T15:00:00Z'
    },
    feedbackLogs: [
      {
        id: 'fb-02',
        version: 1,
        reviewedBy: 'Khánh Vy (B2C Lead)',
        reviewedAt: '2026-10-05T18:00:00Z',
        type: 'VIDEO',
        verdict: 'REVISE',
        comment: 'Đoạn đầu hơi tối, Huy chỉnh sáng thêm 15% và đẩy tiếng cười bé to hơn xíu nhé.'
      },
      {
        id: 'fb-03',
        version: 2,
        reviewedBy: 'Khánh Vy (B2C Lead)',
        reviewedAt: '2026-10-06T17:30:00Z',
        type: 'VIDEO',
        verdict: 'APPROVED',
        comment: 'Bản v2 màu sắc rất tươi sáng, nhạc khớp nhịp. Đạt chuẩn nghiệm thu đăng kênh!',
        checklist: {
          hookCompliant: true,
          productAppearance: true,
          audioClear: true,
          guidelinesFollowed: true
        }
      }
    ],
    acceptedAt: '2026-10-06T17:30:00Z',
    acceptedBy: 'Khánh Vy (Booking Lead)',
    createdAt: '2026-09-30T08:00:00Z'
  },

  // 6. PAID (Đã thanh toán nhuận bút)
  {
    id: 'task-sc-06',
    taskCode: 'SC-KUTI-202610-06',
    title: 'Hành trình 3 ngày da con dịu đỏ mẩn ngứa nhờ thảo dược lành tính',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    pillarId: 'pillar-showcase',
    pillarName: 'Demo Trải Nghiệm & Hướng Dẫn Sử Dụng',
    pillarCode: 'PRODUCT_SHOWCASE',
    linkedSku: 'KUTIE-SOOTH-30G',
    productName: 'Kem Bôi Dịu Da Kutieskin 30g',
    remuneration: 1000000,
    deadline: '2026-10-05',
    contributorId: 'ctv-1',
    contributorName: 'Nguyễn Hoàng Yến',
    contributorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    status: 'PAID',
    videoDeliverables: {
      currentVersion: 1,
      draftVideoUrl: 'https://drive.google.com/kutieskin-3days-v1.mp4',
      finalVideoUrl: 'https://drive.google.com/kutieskin-3days-final.mp4',
      captionSuggested: 'Khoảnh khắc da con êm dịu trở lại là lúc mẹ thở phào nhẹ nhõm ❤️ #kutieskin #kemdiuda',
      durationSeconds: 42,
      submittedAt: '2026-10-03T16:00:00Z'
    },
    feedbackLogs: [
      {
        id: 'fb-04',
        version: 1,
        reviewedBy: 'Khánh Vy (B2C Lead)',
        reviewedAt: '2026-10-04T09:00:00Z',
        type: 'VIDEO',
        verdict: 'APPROVED',
        comment: 'Video chân thực, ánh sáng tốt, hình ảnh trước và sau rất rõ ràng.'
      }
    ],
    acceptedAt: '2026-10-04T09:00:00Z',
    acceptedBy: 'Khánh Vy (Booking Lead)',
    paidAt: '2026-10-05T14:00:00Z',
    paymentRef: 'UNC-TCB-982134',
    createdAt: '2026-09-28T09:00:00Z'
  }
];
