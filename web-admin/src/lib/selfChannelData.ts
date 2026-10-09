import { UPBASE_MASTER_PILLARS } from './importedMasterData';
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
export const INITIAL_MASTER_PILLARS: MasterContentPillar[] = UPBASE_MASTER_PILLARS;


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
// 2.1 MULTI-BRAND CHANNEL ALLOCATIONS (Chuẩn hóa Đa Nhãn Hàng cho Trưởng phòng & Nhân viên phụ trách 2-3 Brand)
// ==========================================
export const MULTI_BRAND_ALLOCATIONS: BrandChannelAllocation[] = [
  MOCK_BRAND_ALLOCATION,
  {
    brandId: 'brand-phcare',
    brandName: 'pHCare Chăm Sóc Vệ Sinh Nữ',
    totalBudget: 150000000,
    budgetAffiliate: 105000000,
    targetAffiliateVideos: 60,
    targetAffiliateGmv: 420000000,
    affiliateNotes: 'Chiến dịch tháng 10 đẩy mạnh tệp KOC Nữ & Chăm sóc cá nhân.',
    budgetSelfChannel: 45000000,
    targetSelfChannelVideos: 35,
    selfChannelNotes: 'Tập trung sản xuất video chuyên gia phụ khoa và giải đáp bí quyết phụ nữ.',
    pillars: [
      {
        id: 'pil-ph-01',
        masterPillarId: 'MASTER-PIL-01',
        name: 'Tư Vấn Chuyên Gia & Bác Sĩ',
        code: 'EDUCATIONAL',
        description: 'Bác sĩ phụ khoa hướng dẫn chăm sóc đúng cách hàng ngày.',
        targetVideos: 10,
        completedVideos: 7,
        allocatedBudget: 15000000,
        unitCostPerVideo: 1500000,
        targetViews: 300000,
        coreSkuIds: ['PH-WASH-150ML'],
        color: '#0284C7'
      },
      {
        id: 'pil-ph-02',
        masterPillarId: 'MASTER-PIL-02',
        name: 'Demo Độ pH & Trải Nghiệm Mùi Hương',
        code: 'PRODUCT_SHOWCASE',
        description: 'Test giấy quỳ tím độ pH 5.0 chuẩn tự nhiên, dịu nhẹ an toàn.',
        targetVideos: 15,
        completedVideos: 10,
        allocatedBudget: 18000000,
        unitCostPerVideo: 1200000,
        targetViews: 350000,
        coreSkuIds: ['PH-WASH-150ML', 'PH-FOAM-100ML'],
        color: '#EC4899'
      },
      {
        id: 'pil-ph-03',
        masterPillarId: 'MASTER-PIL-04',
        name: 'Bắt Trend & Tự Tin Phái Đẹp',
        code: 'TREND_JACKING',
        description: 'Tình huống thường ngày nơi công sở và tự tin hẹn hò.',
        targetVideos: 10,
        completedVideos: 6,
        allocatedBudget: 12000000,
        unitCostPerVideo: 1200000,
        targetViews: 200000,
        coreSkuIds: ['PH-WASH-150ML'],
        color: '#F59E0B'
      }
    ]
  },
  {
    brandId: 'brand-royal-ausnz',
    brandName: 'Royal Ausnz Sữa Hoàng Gia',
    totalBudget: 250000000,
    budgetAffiliate: 180000000,
    targetAffiliateVideos: 90,
    targetAffiliateGmv: 950000000,
    affiliateNotes: 'Tập trung tệp mẹ bỉm cao cấp và chuyên gia dinh dưỡng.',
    budgetSelfChannel: 70000000,
    targetSelfChannelVideos: 50,
    selfChannelNotes: 'Sản xuất video quy trình sữa tươi 20 phút - 12 giờ tại Úc.',
    pillars: [
      {
        id: 'pil-ro-01',
        masterPillarId: 'MASTER-PIL-01',
        name: 'Dinh Dưỡng Chuẩn Úc & Chuyên Gia',
        code: 'EDUCATIONAL',
        description: 'Giải thích công thức Lactoferrin tăng đề kháng cho trẻ sơ sinh.',
        targetVideos: 18,
        completedVideos: 12,
        allocatedBudget: 27000000,
        unitCostPerVideo: 1500000,
        targetViews: 450000,
        coreSkuIds: ['RO-PREM-900G'],
        color: '#4F46E5'
      },
      {
        id: 'pil-ro-02',
        masterPillarId: 'MASTER-PIL-02',
        name: 'Quy Trình Trộn Ướt 20 Phút 12 Giờ',
        code: 'PRODUCT_SHOWCASE',
        description: 'Minh họa công nghệ Wet-Blending độc quyền giữ trọn dưỡng chất sinh học.',
        targetVideos: 20,
        completedVideos: 15,
        allocatedBudget: 26000000,
        unitCostPerVideo: 1300000,
        targetViews: 500000,
        coreSkuIds: ['RO-PREM-900G', 'RO-LACTO-100G'],
        color: '#10B981'
      },
      {
        id: 'pil-ro-03',
        masterPillarId: 'MASTER-PIL-03',
        name: 'Trải Nghiệm Mẹ Bỉm Hiện Đại',
        code: 'STORYTELLING',
        description: 'Bé tăng cân đều, tiêu hóa khỏe, không táo bón.',
        targetVideos: 12,
        completedVideos: 8,
        allocatedBudget: 17000000,
        unitCostPerVideo: 1400000,
        targetViews: 300000,
        coreSkuIds: ['RO-PREM-900G'],
        color: '#8B5CF6'
      }
    ]
  },
  {
    brandId: 'brand-mega-uri',
    brandName: 'Mega Uri Hỗ Trợ Đề Kháng & Sức Khỏe',
    totalBudget: 140000000,
    budgetAffiliate: 100000000,
    targetAffiliateVideos: 50,
    targetAffiliateGmv: 400000000,
    affiliateNotes: 'Tập trung tệp phụ huynh có con trong độ tuổi đi học.',
    budgetSelfChannel: 40000000,
    targetSelfChannelVideos: 30,
    selfChannelNotes: 'Sản xuất video chia sẻ bài thuốc & giải pháp thảo dược bảo vệ đường hô hấp.',
    pillars: [
      {
        id: 'pil-mu-01',
        masterPillarId: 'MASTER-PIL-01',
        name: 'Bác Sĩ Chia Sẻ Đề Kháng Hô Hấp',
        code: 'EDUCATIONAL',
        description: 'Phòng ngừa ho, sổ mũi và viêm họng lúc giao mùa.',
        targetVideos: 12,
        completedVideos: 9,
        allocatedBudget: 18000000,
        unitCostPerVideo: 1500000,
        targetViews: 350000,
        coreSkuIds: ['MU-SYRUP-120ML'],
        color: '#059669'
      },
      {
        id: 'pil-mu-02',
        masterPillarId: 'MASTER-PIL-02',
        name: 'Hướng Dẫn Sử Dụng & Test Vị Ngon',
        code: 'PRODUCT_SHOWCASE',
        description: 'Vị siro ngọt dịu tự nhiên, các bé cực kỳ hợp tác khi uống.',
        targetVideos: 18,
        completedVideos: 13,
        allocatedBudget: 22000000,
        unitCostPerVideo: 1200000,
        targetViews: 400000,
        coreSkuIds: ['MU-SYRUP-120ML'],
        color: '#D97706'
      }
    ]
  },
  {
    brandId: 'brand-senka',
    brandName: 'Senka Skincare Nhật Bản',
    totalBudget: 180000000,
    budgetAffiliate: 120000000,
    targetAffiliateVideos: 70,
    targetAffiliateGmv: 550000000,
    affiliateNotes: 'Đẩy mạnh dòng sữa rửa mặt tạo bọt tơ tằm trắng và kem chống nắng.',
    budgetSelfChannel: 60000000,
    targetSelfChannelVideos: 45,
    selfChannelNotes: 'Tạo bọt siêu mịn tơ tằm trắng và test độ sạch sâu không gây khô da.',
    pillars: [
      {
        id: 'pil-sen-01',
        masterPillarId: 'MASTER-PIL-02',
        name: 'Test Tạo Bọt Tơ Tằm Trắng Khổng Lồ',
        code: 'PRODUCT_SHOWCASE',
        description: 'Tạo bọt bông xốp dày đặc rửa mặt không chạm tay vào da.',
        targetVideos: 25,
        completedVideos: 19,
        allocatedBudget: 32000000,
        unitCostPerVideo: 1300000,
        targetViews: 600000,
        coreSkuIds: ['SEN-WHIP-120G'],
        color: '#2563EB'
      },
      {
        id: 'pil-sen-02',
        masterPillarId: 'MASTER-PIL-01',
        name: 'Bí Quyết Làm Sạch Sâu Cho Da Dầu Mụn',
        code: 'EDUCATIONAL',
        description: 'Dược sĩ hướng dẫn làm sạch lỗ chân lông ngừa mụn đầu đen.',
        targetVideos: 20,
        completedVideos: 14,
        allocatedBudget: 28000000,
        unitCostPerVideo: 1400000,
        targetViews: 450000,
        coreSkuIds: ['SEN-WHIP-ACNE-100G'],
        color: '#10B981'
      }
    ]
  }
];


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
  },
  // 7. TASK pHCare - SCRIPT_PENDING_REVIEW
  {
    id: 'task-sc-07',
    taskCode: 'SC-PHC-202610-07',
    title: 'Thử nghiệm quỳ tím chứng minh pH 5.0 dịu nhẹ cho vùng nhạy cảm',
    brandId: 'brand-phcare',
    brandName: 'pHCare Chăm Sóc Vệ Sinh Nữ',
    storeId: 'store-phcare-tts',
    storeName: 'pHCare Official Store (TikTok)',
    pillarId: 'pil-ph-02',
    pillarName: 'Demo Độ pH & Trải Nghiệm Mùi Hương',
    pillarCode: 'PRODUCT_SHOWCASE',
    linkedSku: 'PH-WASH-150ML',
    productName: 'Dung Dịch Vệ Sinh Nữ pHCare 150ml',
    remuneration: 1200000,
    deadline: '2026-10-20',
    contributorId: 'ctv-2',
    contributorName: 'Trần Thu Thảo (Dược Sĩ)',
    contributorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    status: 'SCRIPT_PENDING_REVIEW',
    scriptContent: {
      hook: 'Nhiều bạn nghĩ bọt càng nhiều càng sạch, nhưng pH mất cân bằng là nguyên nhân gây ngứa ngáy đấy!',
      body: 'Test quỳ tím so sánh nước máy thông thường với dung dịch pHCare. Giấy quỳ giữ màu vàng cam tự nhiên đạt chuẩn pH 5.0 sinh lý.',
      cta: 'Bảo vệ sức khỏe vùng nhạy cảm mỗi ngày cùng pHCare deal hời trên live nha!',
      submittedAt: '2026-10-08T09:00:00Z'
    },
    feedbackLogs: [],
    createdAt: '2026-10-06T10:00:00Z'
  },

  // 8. TASK Royal Ausnz - DRAFT_VIDEO_SUBMITTED
  {
    id: 'task-sc-08',
    taskCode: 'SC-RO-202610-08',
    title: 'Quy trình sản xuất sữa tươi 20 phút 12 giờ tại nông trại Úc',
    brandId: 'brand-royal-ausnz',
    brandName: 'Royal Ausnz Sữa Hoàng Gia',
    storeId: 'store-royal-tts',
    storeName: 'Royal Ausnz Official Store (TikTok)',
    pillarId: 'pil-ro-02',
    pillarName: 'Quy Trình Trộn Ướt 20 Phút 12 Giờ',
    pillarCode: 'PRODUCT_SHOWCASE',
    linkedSku: 'RO-PREM-900G',
    productName: 'Sữa Hoàng Gia Úc Premium Gold 900g',
    remuneration: 1300000,
    deadline: '2026-10-16',
    contributorId: 'ctv-4',
    contributorName: 'Phạm Đức Minh & Bé Gấu',
    contributorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    status: 'DRAFT_VIDEO_SUBMITTED',
    videoDeliverables: {
      currentVersion: 1,
      draftVideoUrl: 'https://drive.google.com/royal-ausnz-wet-blend-v1.mp4',
      captionSuggested: 'Bí mật đằng sau hạt sữa vàng óng tan ngay trong nước của Hoàng Gia Úc #royalausnz #suauc',
      durationSeconds: 48,
      submittedAt: '2026-10-08T11:30:00Z'
    },
    feedbackLogs: [],
    createdAt: '2026-10-04T08:00:00Z'
  },

  // 9. TASK Mega Uri - ACCEPTED_COMPLETED
  {
    id: 'task-sc-09',
    taskCode: 'SC-MU-202610-09',
    title: 'Bác sĩ giải đáp: Tăng đề kháng hô hấp cho bé lúc giao mùa như thế nào?',
    brandId: 'brand-mega-uri',
    brandName: 'Mega Uri Hỗ Trợ Đề Kháng & Sức Khỏe',
    storeId: 'store-megauri-tts',
    storeName: 'Mega Uri Official Store (TikTok)',
    pillarId: 'pil-mu-01',
    pillarName: 'Bác Sĩ Chia Sẻ Đề Kháng Hô Hấp',
    pillarCode: 'EDUCATIONAL',
    linkedSku: 'MU-SYRUP-120ML',
    productName: 'Siro Hỗ Trợ Đường Hô Hấp Mega Uri 120ml',
    remuneration: 1500000,
    deadline: '2026-10-10',
    contributorId: 'ctv-2',
    contributorName: 'Trần Thu Thảo (Dược Sĩ)',
    contributorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    status: 'ACCEPTED_COMPLETED',
    videoDeliverables: {
      currentVersion: 1,
      draftVideoUrl: 'https://drive.google.com/megauri-dr-v1.mp4',
      finalVideoUrl: 'https://drive.google.com/megauri-dr-final.mp4',
      captionSuggested: 'Bí kíp phòng ho sổ mũi từ thảo dược tự nhiên cho con #megauri #dekhang',
      durationSeconds: 52,
      submittedAt: '2026-10-06T15:00:00Z'
    },
    feedbackLogs: [
      {
        id: 'fb-09',
        version: 1,
        reviewedBy: 'Khánh Vy (B2C Lead)',
        reviewedAt: '2026-10-07T10:00:00Z',
        type: 'VIDEO',
        verdict: 'APPROVED',
        comment: 'Dược sĩ giải thích khoa học, chất lượng hình ảnh sắc nét chuẩn Do & Donts!'
      }
    ],
    acceptedAt: '2026-10-07T10:00:00Z',
    acceptedBy: 'Khánh Vy (Booking Lead)',
    createdAt: '2026-10-01T08:00:00Z'
  },

  // 10. TASK Senka - SCRIPT_APPROVED
  {
    id: 'task-sc-10',
    taskCode: 'SC-SEN-202610-10',
    title: 'Thử thách tạo bọt tơ tằm trắng Senka bông xốp không rơi',
    brandId: 'brand-senka',
    brandName: 'Senka Skincare Nhật Bản',
    storeId: 'store-senka-tts',
    storeName: 'Senka Official Store (TikTok)',
    pillarId: 'pil-sen-01',
    pillarName: 'Test Tạo Bọt Tơ Tằm Trắng Khổng Lồ',
    pillarCode: 'PRODUCT_SHOWCASE',
    linkedSku: 'SEN-WHIP-120G',
    productName: 'Sữa Rửa Mặt Tạo Bọt Senka Perfect Whip 120g',
    remuneration: 1300000,
    deadline: '2026-10-18',
    contributorId: 'ctv-1',
    contributorName: 'Nguyễn Hoàng Yến',
    contributorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    status: 'SCRIPT_APPROVED',
    scriptContent: {
      hook: 'Lớp bọt này có thể giữ được đồng xu mà không hề xẹp, tin được không?',
      body: 'Tạo bọt bằng lưới tạo bọt trong 15 giây. Úp ngược bát bọt không rơi, đặt đồng xu lên trên. Rửa mặt lướt nhẹ không ma sát mạnh lên da.',
      cta: 'Săn deal độc quyền tặng mini size tại giỏ hàng TikTok Shop Senka ngay!',
      submittedAt: '2026-10-07T16:00:00Z'
    },
    feedbackLogs: [
      {
        id: 'fb-10',
        version: 1,
        reviewedBy: 'Khánh Vy (B2C Lead)',
        reviewedAt: '2026-10-08T08:30:00Z',
        type: 'SCRIPT',
        verdict: 'APPROVED',
        comment: 'Kịch bản hook rất mạnh, đã duyệt quay dựng!'
      }
    ],
    createdAt: '2026-10-05T14:00:00Z'
  }

];
