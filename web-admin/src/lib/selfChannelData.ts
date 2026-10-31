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
  brandId: '',
  brandName: '',
  totalBudget: 0,
  budgetAffiliate: 0,
  targetAffiliateVideos: 0,
  targetAffiliateGmv: 0,
  affiliateNotes: '',
  budgetSelfChannel: 0,
  targetSelfChannelVideos: 0,
  selfChannelNotes: '',
  pillars: []
};

export const MULTI_BRAND_ALLOCATIONS: BrandChannelAllocation[] = [];

export interface SelfChannelContentMemberInfo {
  id: string;
  name: string;
  roleTitle: string;
  avatar: string;
  assignedBrands: string[];
  specialty: string;
  monthlyVideoQuota: number;
}

export const SELF_CHANNEL_PARTNERSHIP_LEADER = {
  id: 'user-viet-hoang',
  name: 'Việt Hoàng',
  roleTitle: 'Trưởng Nhóm Partnership & Self-Channel (Leader quản lý Content & Liên hệ CTV)',
  email: 'viethoang.partnership@upbase.vn',
  phone: '0938 776 554',
  avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80',
  managerName: 'Đặng Thị Yến Nhi (Lead B2C)',
  responsibilities: [
    'Quản lý trực tiếp đội ngũ Chuyên viên Content Self-Channel bên dưới',
    'Tìm kiếm, liên hệ CTV/VJ mới và đàm phán bảng giá (Rate Card)',
    'Thu thập CCCD/MST, kiểm tra pháp lý & ký Hợp đồng dịch vụ CTV',
    'Tiếp nhận yêu cầu từ Content, điều phối CTV phù hợp và theo dõi gửi hàng mẫu (SLA 48h)',
    'Tổng hợp biên bản nghiệm thu cuối tháng & lập phiếu Đề nghị thanh toán (DNTT)'
  ]
};

export const SELF_CHANNEL_CONTENT_MEMBERS: SelfChannelContentMemberInfo[] = [
  {
    id: 'user-content-1',
    name: 'Quỳnh Như',
    roleTitle: 'Chuyên Viên Content Self-Channel',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80',
    assignedBrands: ['Kutieskin Mama & Baby', 'Royal Ausnz Sữa Hoàng Gia'],
    specialty: 'Mẹ & Bé, Dược mỹ phẩm gia đình, Storytelling cảm xúc',
    monthlyVideoQuota: 45
  },
  {
    id: 'user-content-2',
    name: 'Nguyễn Thị Mai Anh',
    roleTitle: 'Chuyên Viên Content Self-Channel',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80',
    assignedBrands: ['Senka Skincare Nhật Bản', 'pHCare Chăm Sóc Vệ Sinh Nữ'],
    specialty: 'Skincare Nhật Bản, Thực nghiệm khoa học (test bọt, quỳ tím)',
    monthlyVideoQuota: 45
  },
  {
    id: 'user-content-3',
    name: 'Vũ Hoài Lâm',
    roleTitle: 'Chuyên Viên Content Self-Channel',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
    assignedBrands: ['Mega Uri Hỗ Trợ Đề Kháng & Sức Khỏe', 'Kutieskin Mama & Baby'],
    specialty: 'Bắt trend TikTok, Nhạc text, Video to Live chuyển đổi cao',
    monthlyVideoQuota: 40
  },
  {
    id: 'user-content-4',
    name: 'Phan Diệu Ánh',
    roleTitle: 'Chuyên Viên Content Self-Channel',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    assignedBrands: ['pHCare Chăm Sóc Vệ Sinh Nữ', 'Senka Skincare Nhật Bản'],
    specialty: 'Tư vấn Y Dược, Chuyên gia Da liễu & Chăm sóc cá nhân',
    monthlyVideoQuota: 35
  }
];

// ==========================================
// 3. DANH SÁCH CỘNG TÁC VIÊN LÀM VIDEO (CTV ROSTER)
// ==========================================
export const INITIAL_CONTRIBUTORS: Contributor[] = [];

export const INITIAL_SELF_CHANNEL_TASKS: SelfChannelVideoTask[] = [];
