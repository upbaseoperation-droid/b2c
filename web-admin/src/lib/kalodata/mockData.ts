import { KalodataCreatorDetail, KalodataPeriod } from './types';

/**
 * Danh sách creator mẫu (đã dọn dẹp để không sinh số liệu ảo)
 */
export const MOCK_KALODATA_CREATORS: Record<string, KalodataCreatorDetail> = {};

export function generateRealisticMockCreator(handle: string, period: KalodataPeriod = '30d'): KalodataCreatorDetail {
  const cleanHandle = handle.trim().toLowerCase().replace('@', '');
  return {
    profile: {
      creatorId: `kalo_vn_${cleanHandle}`,
      handle: cleanHandle,
      nickname: cleanHandle,
      avatarUrl: '',
      followers: 0,
      region: 'VN',
      category: 'Chưa phân loại',
      bio: '',
      isVerified: false
    },
    metrics: {
      period,
      gmv: 0,
      itemsSold: 0,
      orderCount: 0,
      gpm: 0,
      aov: 0,
      gmvShareVideo: 0,
      gmvShareLive: 0,
      gmvShareProductCard: 0,
      videoCount: 0,
      liveCount: 0,
      avgViews: 0,
      engagementRate: 0
    },
    audience: {
      femaleRatio: 0,
      maleRatio: 0,
      age18_24: 0,
      age25_34: 0,
      age35Plus: 0,
      topLocations: []
    },
    topProducts: [],
    syncedAt: new Date().toISOString(),
    dataSource: 'SANDBOX'
  };
}
