/**
 * Kalodata Open API Data Types & Contracts
 * Chuẩn hóa cấu trúc dữ liệu Creator & E-commerce theo tài liệu Kalodata Enterprise API.
 */

export interface KalodataConfig {
  apiKey?: string;
  baseUrl: string;
  region: string;
  currency: string;
  isSandbox: boolean;
}

export type KalodataPeriod = '7d' | '30d' | '90d';

export interface KalodataCreatorProfile {
  creatorId: string;
  handle: string; // @megauriviu
  nickname: string;
  avatarUrl: string;
  followers: number;
  region: string;
  category: string;
  bio?: string;
  isVerified?: boolean;
}

export interface KalodataCommerceMetrics {
  period: KalodataPeriod;
  gmv: number; // Doanh số ước tính (VNĐ)
  itemsSold: number; // Số sản phẩm đã bán
  orderCount: number; // Số đơn hàng ước tính
  gpm: number; // Doanh thu trên 1000 lượt hiển thị (VNĐ/1000 views)
  aov: number; // Giá trị trung bình một đơn hàng (VNĐ)
  gmvShareVideo: number; // Tỉ trọng GMV từ Video ngắn (%)
  gmvShareLive: number; // Tỉ trọng GMV từ Livestream (%)
  gmvShareProductCard: number; // Tỉ trọng GMV từ Thẻ sản phẩm / Gian hàng (%)
  videoCount: number; // Số video gắn giỏ hàng trong kỳ
  liveCount: number; // Số phiên live có bán hàng
  avgViews: number; // Lượt xem trung bình mỗi video
  engagementRate: number; // Tỉ lệ tương tác (%)
}

export interface KalodataAudienceDemographics {
  femaleRatio: number; // Tỉ lệ nữ (%)
  maleRatio: number; // Tỉ lệ nam (%)
  age18_24: number; // 18 - 24 tuổi (%)
  age25_34: number; // 25 - 34 tuổi (%)
  age35Plus: number; // Trên 35 tuổi (%)
  topLocations?: { city: string; ratio: number }[];
}

export interface KalodataTopProduct {
  productId: string;
  productName: string;
  categoryName: string;
  gmv: number;
  salesCount: number;
  commissionRate: number; // Tỉ lệ hoa hồng (%)
  productImageUrl?: string;
  shopName?: string;
}

export interface KalodataCreatorDetail {
  profile: KalodataCreatorProfile;
  metrics: KalodataCommerceMetrics;
  audience: KalodataAudienceDemographics;
  topProducts: KalodataTopProduct[];
  dataSource: 'LIVE_API' | 'SANDBOX';
  syncedAt: string;
}

export interface KalodataDiscoverFilter {
  category?: string;
  region?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minGmv?: number;
  sortBy?: 'gmv' | 'followers' | 'gpm' | 'itemsSold';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface KalodataConnectionStatus {
  connected: boolean;
  mode: 'LIVE' | 'SANDBOX';
  region: string;
  currency: string;
  message: string;
  hasApiKey: boolean;
}

export interface KalodataSyncPayload {
  kocId?: string;
  channelId: string; // TikTok handle (@abc hoặc abc)
  period?: KalodataPeriod;
}

export interface KalodataSyncResult {
  success: boolean;
  message: string;
  data?: KalodataCreatorDetail;
  suggestedUpdates?: {
    followers?: number;
    avgViews?: number;
    recentRevenue?: number;
    itemsSold?: number;
    gpm?: number;
    aov?: number;
    gmvShareVideo?: number;
    gmvShareLive?: number;
    gmvShareProductCard?: number;
    femaleRatio?: number;
    maleRatio?: number;
    age18_24?: number;
    age25_34?: number;
    age35Plus?: number;
    avatarUrl?: string;
  };
}
