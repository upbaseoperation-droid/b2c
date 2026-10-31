import { ThirdPartyAccessAccount, UserProfile, UserRole } from './types';

export const INITIAL_THIRD_PARTY_ACCOUNTS: ThirdPartyAccessAccount[] = [
  // =========================================================================
  // 2. KOC / KOL PARTNERS (CREATORS ĐỐI TÁC)
  // Đăng nhập Gmail -> Vào thẳng view Hub Đối Tác KOC (KocKolHubView)
  // =========================================================================
  {
    id: 'tpa-koc-megauri',
    gmail: 'megauri.creator@gmail.com',
    displayName: 'Mega Uri Review',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    partnerType: 'KOC',
    linkedEntityId: 'koc-1',
    linkedEntityName: 'Mega Uri Review',
    permissions: {
      canApproveDeals: false,
      canReviewScripts: false,
      canViewGmvAndRoas: true,
      canViewFinancials: true,
      canSubmitVideos: true,
      canProvideSparkAds: true,
      canClaimSamples: true
    },
    status: 'ACTIVE',
    lastLoginAt: '2026-10-08 20:45',
    loginCount: 65,
    createdAt: '2026-09-02',
    createdBy: 'Khánh Vy (Booking Lead)',
    notes: 'KOC Tier 2 (Macro) chuyên review mẹ & bé, nhận hàng mẫu và nộp mã Spark Ads.'
  },
  {
    id: 'tpa-koc-chloe',
    gmail: 'chloe.nguyen.beauty@gmail.com',
    displayName: 'Chloe Nguyễn Official',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    partnerType: 'KOC',
    linkedEntityId: 'koc-2',
    linkedEntityName: 'Chloe Nguyễn',
    permissions: {
      canApproveDeals: false,
      canReviewScripts: false,
      canViewGmvAndRoas: true,
      canViewFinancials: true,
      canSubmitVideos: true,
      canProvideSparkAds: true,
      canClaimSamples: true
    },
    status: 'ACTIVE',
    lastLoginAt: '2026-10-08 11:20',
    loginCount: 51,
    createdAt: '2026-09-04',
    createdBy: 'Khánh Vy (Booking Lead)',
    notes: 'KOC Tier 1 (Celeb) phân khúc Beauty & Skincare.'
  },
  {
    id: 'tpa-koc-drhang',
    gmail: 'drhang.nhi@gmail.com',
    displayName: 'Bác Sĩ Hằng (Chuyên Gia Nhi)',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80',
    partnerType: 'KOC',
    linkedEntityId: 'koc-5',
    linkedEntityName: 'Bác Sĩ Hằng',
    permissions: {
      canApproveDeals: false,
      canReviewScripts: false,
      canViewGmvAndRoas: true,
      canViewFinancials: true,
      canSubmitVideos: true,
      canProvideSparkAds: true,
      canClaimSamples: true
    },
    status: 'ACTIVE',
    lastLoginAt: '2026-10-05 16:10',
    loginCount: 14,
    createdAt: '2026-09-12',
    createdBy: 'Minh Đức (Booking Specialist)',
    notes: 'Chuyên gia y tế cố vấn nội dung giáo dục sức khỏe.'
  },

  // =========================================================================
  // 3. CTV PARTNERS (CỘNG TÁC VIÊN KÊNH NỘI BỘ)
  // Đăng nhập Gmail -> Vào thẳng view Hub Cộng Tác Viên (SelfChannelCtvHubView)
  // =========================================================================
  {
    id: 'tpa-ctv-hamy',
    gmail: 'hamy.creator@gmail.com',
    displayName: 'Hà My Content (CTV Creator)',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    partnerType: 'CTV',
    linkedEntityId: 'ctv-hamy',
    linkedEntityName: 'Hà My Content',
    permissions: {
      canApproveDeals: false,
      canReviewScripts: false,
      canViewGmvAndRoas: true,
      canViewFinancials: true,
      canSubmitVideos: true,
      canProvideSparkAds: false,
      canClaimSamples: true
    },
    status: 'ACTIVE',
    lastLoginAt: '2026-10-08 19:30',
    loginCount: 37,
    createdAt: '2026-09-08',
    createdBy: 'Quỳnh Như (Content Creative)',
    notes: 'CTV sản xuất video đều đặn cho kênh TikTok Kutieskin Mama & Baby.'
  },
  {
    id: 'tpa-ctv-tuankiet',
    gmail: 'tuankiet.video@gmail.com',
    displayName: 'Tuấn Kiệt (CTV Video Editor)',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    partnerType: 'CTV',
    linkedEntityId: 'ctv-tuankiet',
    linkedEntityName: 'Tuấn Kiệt Video',
    permissions: {
      canApproveDeals: false,
      canReviewScripts: false,
      canViewGmvAndRoas: false,
      canViewFinancials: true,
      canSubmitVideos: true,
      canProvideSparkAds: false,
      canClaimSamples: false
    },
    status: 'ACTIVE',
    lastLoginAt: '2026-10-07 22:00',
    loginCount: 22,
    createdAt: '2026-09-15',
    createdBy: 'Quỳnh Như (Content Creative)',
    notes: 'Dựng video remix, ảnh lướt, hiệu ứng âm thanh ASMR.'
  }
];

/**
 * Chuyển đổi ThirdPartyAccessAccount thành UserProfile đầy đủ để thiết lập phiên đăng nhập
 */
export function convertPartnerAccountToUserProfile(account: ThirdPartyAccessAccount): UserProfile {
  let role: UserRole = 'BRAND_PARTNER';
  let roleTitle = 'Đại diện Thương hiệu (Brand Partner)';

  if (account.partnerType === 'KOC') {
    role = 'KOC_PARTNER';
    roleTitle = 'Creator / KOC Đối Tác';
  } else if (account.partnerType === 'CTV') {
    role = 'CTV_PARTNER';
    roleTitle = 'Cộng Tác Viên Kênh Nội Bộ';
  }

  // Khởi tạo permissions dạng array string
  const permsList: string[] = [];
  if (account.permissions.canApproveDeals) permsList.push('CAN_APPROVE_DEALS');
  if (account.permissions.canReviewScripts) permsList.push('CAN_REVIEW_SCRIPTS');
  if (account.permissions.canViewGmvAndRoas) permsList.push('CAN_VIEW_GMV');
  if (account.permissions.canViewFinancials) permsList.push('CAN_VIEW_FINANCIALS');
  if (account.permissions.canSubmitVideos) permsList.push('CAN_SUBMIT_VIDEOS');
  if (account.permissions.canProvideSparkAds) permsList.push('CAN_PROVIDE_ADS_CODE');
  if (account.permissions.canClaimSamples) permsList.push('CAN_CLAIM_SAMPLES');

  return {
    id: `partner_${account.id}`,
    name: account.displayName,
    email: account.gmail,
    role,
    roleTitle,
    avatar: account.avatarUrl ? '' : account.displayName.slice(0, 2).toUpperCase(),
    loginProvider: 'GMAIL',
    partnerType: account.partnerType,
    linkedEntityId: account.linkedEntityId,
    linkedEntityName: account.linkedEntityName,
    allowedStoreNames: account.linkedStoreNames || [],
    permissions: permsList
  };
}

/**
 * Kiểm tra xem người dùng hiện tại có phải đối tác bên thứ 3 không
 */
export function isThirdPartyPartner(user?: UserProfile | null): boolean {
  if (!user) return false;
  return (
    user.role === 'BRAND_PARTNER' ||
    user.role === 'KOC_PARTNER' ||
    user.role === 'CTV_PARTNER' ||
    user.loginProvider === 'GMAIL'
  );
}

/**
 * Lấy Tab điều hướng mặc định theo vai trò đối tác
 */
export function getPartnerLandingTab(user?: UserProfile | null): 'koc-listing' | 'koc-hub' | 'self-channel-hub' | 'dashboard-bi' {
  if (!user) return 'dashboard-bi';
  if (user.role === 'BRAND_PARTNER') return 'koc-listing';
  if (user.role === 'KOC_PARTNER') return 'koc-hub';
  if (user.role === 'CTV_PARTNER') return 'self-channel-hub';
  return 'dashboard-bi';
}
