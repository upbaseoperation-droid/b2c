import { KalodataCreatorDetail, KalodataPeriod } from './types';

/**
 * Dữ liệu mẫu thị trường Việt Nam (Sandbox)
 * Được chuẩn bị sẵn cho các kênh KOC thực tế để kiểm thử luồng vận hành
 * trong lúc chờ kích hoạt khóa API doanh nghiệp từ Kalodata.
 */
export const MOCK_KALODATA_CREATORS: Record<string, KalodataCreatorDetail> = {
  megauriviu: {
    profile: {
      creatorId: 'kalo_vn_cr_001',
      handle: 'megauriviu',
      nickname: 'Mê Gái Review',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      followers: 850000,
      region: 'VN',
      category: 'Mỹ phẩm & Chăm sóc da',
      bio: 'Chuyên gia soi thành phần mỹ phẩm & quy trình dưỡng da khoa học',
      isVerified: true
    },
    metrics: {
      period: '30d',
      gmv: 420000000,
      itemsSold: 2850,
      orderCount: 2410,
      gpm: 12500000,
      aov: 174000,
      gmvShareVideo: 65,
      gmvShareLive: 25,
      gmvShareProductCard: 10,
      videoCount: 18,
      liveCount: 4,
      avgViews: 48000,
      engagementRate: 5.8
    },
    audience: {
      femaleRatio: 88,
      maleRatio: 12,
      age18_24: 52,
      age25_34: 38,
      age35Plus: 10,
      topLocations: [
        { city: 'Hà Nội', ratio: 38 },
        { city: 'TP. Hồ Chí Minh', ratio: 34 },
        { city: 'Đà Nẵng', ratio: 12 }
      ]
    },
    topProducts: [
      {
        productId: 'kalo_p_01',
        productName: 'Kem chống nắng nâng tone kiềm dầu 50ml',
        categoryName: 'Chăm sóc da',
        gmv: 145000000,
        salesCount: 980,
        commissionRate: 15,
        productImageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&h=200&q=80',
        shopName: 'Official Beauty Store'
      },
      {
        productId: 'kalo_p_02',
        productName: 'Serum phục hồi B5 cấp ẩm sâu 30ml',
        categoryName: 'Chăm sóc da',
        gmv: 110000000,
        salesCount: 650,
        commissionRate: 18,
        productImageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&h=200&q=80',
        shopName: 'Derma Official'
      },
      {
        productId: 'kalo_p_03',
        productName: 'Sữa rửa mặt tạo bọt dịu nhẹ 150ml',
        categoryName: 'Làm sạch da',
        gmv: 85000000,
        salesCount: 520,
        commissionRate: 12,
        productImageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=200&h=200&q=80',
        shopName: 'Skincare Center'
      }
    ],
    dataSource: 'SANDBOX',
    syncedAt: new Date().toISOString()
  },
  chanhbeauty: {
    profile: {
      creatorId: 'kalo_vn_cr_002',
      handle: 'chanhbeauty',
      nickname: 'Chanh Beauty Review',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80',
      followers: 420000,
      region: 'VN',
      category: 'Mỹ phẩm & Chăm sóc da',
      bio: 'Review chân thực mỹ phẩm bình dân và đồ dưỡng tóc',
      isVerified: true
    },
    metrics: {
      period: '30d',
      gmv: 215000000,
      itemsSold: 1890,
      orderCount: 1620,
      gpm: 8900000,
      aov: 132000,
      gmvShareVideo: 80,
      gmvShareLive: 15,
      gmvShareProductCard: 5,
      videoCount: 22,
      liveCount: 2,
      avgViews: 26000,
      engagementRate: 4.6
    },
    audience: {
      femaleRatio: 92,
      maleRatio: 8,
      age18_24: 64,
      age25_34: 28,
      age35Plus: 8
    },
    topProducts: [
      {
        productId: 'kalo_p_04',
        productName: 'Tẩy trang dịu nhẹ cho da mụn 500ml',
        categoryName: 'Làm sạch da',
        gmv: 88000000,
        salesCount: 710,
        commissionRate: 16,
        shopName: 'Cosmetic Store'
      }
    ],
    dataSource: 'SANDBOX',
    syncedAt: new Date().toISOString()
  },
  linhreview: {
    profile: {
      creatorId: 'kalo_vn_cr_003',
      handle: 'linhreview',
      nickname: 'Linh Review Đồ Gia Dụng',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80',
      followers: 290000,
      region: 'VN',
      category: 'Đồ gia dụng & Nhà cửa',
      bio: 'Review thông minh đồ dùng phòng bếp & thiết bị tiện ích',
      isVerified: false
    },
    metrics: {
      period: '30d',
      gmv: 165000000,
      itemsSold: 920,
      orderCount: 880,
      gpm: 7200000,
      aov: 187000,
      gmvShareVideo: 70,
      gmvShareLive: 20,
      gmvShareProductCard: 10,
      videoCount: 16,
      liveCount: 3,
      avgViews: 21000,
      engagementRate: 3.9
    },
    audience: {
      femaleRatio: 76,
      maleRatio: 24,
      age18_24: 25,
      age25_34: 55,
      age35Plus: 20
    },
    topProducts: [
      {
        productId: 'kalo_p_05',
        productName: 'Máy xay sinh tố cầm tay mini sạc USB',
        categoryName: 'Thiết bị nhà bếp',
        gmv: 72000000,
        salesCount: 410,
        commissionRate: 14,
        shopName: 'Gia Dụng Tiện Ích'
      }
    ],
    dataSource: 'SANDBOX',
    syncedAt: new Date().toISOString()
  }
};

/**
 * Sinh dữ liệu thương mại mô phỏng hợp lý dựa trên handle cho các kênh chưa có trong danh mục mẫu
 */
export function generateRealisticMockCreator(handle: string, period: KalodataPeriod = '30d'): KalodataCreatorDetail {
  const clean = handle.trim().toLowerCase().replace('@', '');
  
  // Seed ngẫu nhiên nhưng ổn định theo tên kênh
  let seed = 0;
  for (let i = 0; i < clean.length; i++) {
    seed = (seed * 31 + clean.charCodeAt(i)) >>> 0;
  }

  const followers = 50000 + (seed % 950000);
  const avgViews = Math.round(followers * (0.04 + ((seed % 10) / 100)));
  const baseGmv = Math.round(avgViews * (1500 + (seed % 3500)) * (period === '7d' ? 0.25 : period === '90d' ? 2.8 : 1));
  const aov = 120000 + (seed % 180000);
  const itemsSold = Math.max(10, Math.round(baseGmv / aov));
  const orderCount = Math.round(itemsSold * 0.9);
  const gpm = Math.round((baseGmv / (avgViews * 15)) * 1000);

  const videoShare = 55 + (seed % 35);
  const liveShare = Math.min(100 - videoShare, 10 + (seed % 30));
  const cardShare = Math.max(0, 100 - videoShare - liveShare);

  const femaleRatio = 60 + (seed % 35);
  const maleRatio = 100 - femaleRatio;

  return {
    profile: {
      creatorId: `kalo_vn_${clean}_${seed % 10000}`,
      handle: clean,
      nickname: clean.charAt(0).toUpperCase() + clean.slice(1),
      avatarUrl: `https://images.unsplash.com/photo-${1530000000000 + (seed % 100000000)}?auto=format&fit=crop&w=200&h=200&q=80`,
      followers,
      region: 'VN',
      category: 'Mỹ phẩm & Chăm sóc đời sống',
      bio: `Kênh sáng tạo nội dung của @${clean} trên TikTok Shop Việt Nam`,
      isVerified: followers > 200000
    },
    metrics: {
      period,
      gmv: baseGmv,
      itemsSold,
      orderCount,
      gpm,
      aov,
      gmvShareVideo: videoShare,
      gmvShareLive: liveShare,
      gmvShareProductCard: cardShare,
      videoCount: 12 + (seed % 16),
      liveCount: 2 + (seed % 6),
      avgViews,
      engagementRate: +(3.5 + (seed % 35) / 10).toFixed(1)
    },
    audience: {
      femaleRatio,
      maleRatio,
      age18_24: 45 + (seed % 20),
      age25_34: 30 + (seed % 15),
      age35Plus: Math.max(5, 100 - (45 + (seed % 20)) - (30 + (seed % 15)))
    },
    topProducts: [
      {
        productId: `kalo_prod_${seed % 1000}`,
        productName: `Sản phẩm chủ lực gắn liền với kênh @${clean}`,
        categoryName: 'Chăm sóc cá nhân',
        gmv: Math.round(baseGmv * 0.45),
        salesCount: Math.round(itemsSold * 0.45),
        commissionRate: 15,
        shopName: 'TikTok Shop Partner'
      }
    ],
    dataSource: 'SANDBOX',
    syncedAt: new Date().toISOString()
  };
}
