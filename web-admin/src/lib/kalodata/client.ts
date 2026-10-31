import {
  KalodataConfig,
  KalodataConnectionStatus,
  KalodataCreatorDetail,
  KalodataDiscoverFilter,
  KalodataPeriod,
  KalodataSyncResult
} from './types';
import { MOCK_KALODATA_CREATORS, generateRealisticMockCreator } from './mockData';

export class KalodataClient {
  private config: KalodataConfig;

  constructor(customConfig?: Partial<KalodataConfig>) {
    const apiKey = customConfig?.apiKey || process.env.KALODATA_API_KEY;
    const baseUrl = customConfig?.baseUrl || process.env.KALODATA_BASE_URL || 'https://api.kalodata.com/open-api/v1';
    const region = customConfig?.region || process.env.KALODATA_REGION || 'VN';
    const currency = customConfig?.currency || process.env.KALODATA_CURRENCY || 'VND';

    this.config = {
      apiKey: apiKey?.trim() || undefined,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      region,
      currency,
      isSandbox: !apiKey || apiKey.trim() === ''
    };
  }

  /**
   * Lấy trạng thái kết nối hiện tại tới dịch vụ Kalodata
   */
  public getConnectionStatus(): KalodataConnectionStatus {
    const hasKey = Boolean(this.config.apiKey && this.config.apiKey.length > 5);
    return {
      connected: hasKey,
      mode: hasKey ? 'LIVE' : 'SANDBOX',
      region: this.config.region,
      currency: this.config.currency,
      hasApiKey: hasKey,
      message: hasKey
        ? 'Đã cấu hình khóa API Kalodata Enterprise (Chế độ kết nối trực tiếp)'
        : 'Đang chạy chế độ thử nghiệm (Chờ cấu hình KALODATA_API_KEY từ hợp đồng doanh nghiệp)'
    };
  }

  /**
   * Tra cứu thông tin chi tiết và số liệu bán hàng của Creator/KOC
   * @param handle Tên kênh TikTok (@username hoặc username)
   * @param period Chu kỳ đo lường ('7d' | '30d' | '90d')
   */
  public async getCreatorDetail(
    handle: string,
    period: KalodataPeriod = '30d'
  ): Promise<KalodataCreatorDetail> {
    const cleanHandle = handle.trim().toLowerCase().replace('@', '');

    // Nếu chưa có API Key, báo lỗi rõ ràng thay vì sinh số liệu ảo
    if (this.config.isSandbox || !this.config.apiKey) {
      if (MOCK_KALODATA_CREATORS[cleanHandle]) {
        const cached = MOCK_KALODATA_CREATORS[cleanHandle];
        return {
          ...cached,
          metrics: {
            ...cached.metrics,
            period
          },
          dataSource: 'SANDBOX',
          syncedAt: new Date().toISOString()
        };
      }
      throw new Error(`Hệ thống chưa kết nối khóa API Kalodata Enterprise để tra cứu số liệu tự động cho kênh @${cleanHandle}.`);
    }

    // Luồng gọi Open API chính thức khi đã có API Key
    try {
      const response = await fetch(`${this.config.baseUrl}/creator/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'secret-key': this.config.apiKey
        },
        body: JSON.stringify({
          handle: cleanHandle,
          region: this.config.region,
          currency: this.config.currency,
          period
        }),
        // Timeout an toàn 10s
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Kalodata API] Yêu cầu thất bại (${response.status}): ${errorText}`);
        throw new Error(`Dịch vụ Kalodata phản hồi lỗi (${response.status}): ${errorText || 'Không tìm thấy dữ liệu'}`);
      }

      const raw = await response.json();
      return this.transformOpenApiResponse(raw, cleanHandle, period);
    } catch (err) {
      console.error('[Kalodata API] Lỗi kết nối máy chủ Kalodata:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Khám phá & xếp hạng KOC theo ngành hàng và doanh số
   */
  public async discoverCreators(filter: KalodataDiscoverFilter = {}): Promise<KalodataCreatorDetail[]> {
    if (this.config.isSandbox || !this.config.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/creator/ranking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'secret-key': this.config.apiKey
        },
        body: JSON.stringify({
          region: filter.region || this.config.region,
          currency: this.config.currency,
          category: filter.category,
          minGmv: filter.minGmv,
          minFollowers: filter.minFollowers,
          maxFollowers: filter.maxFollowers,
          sortBy: filter.sortBy || 'gmv',
          page: filter.page || 1,
          pageSize: Math.min(filter.pageSize || 20, 100)
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return [];
      }

      const raw = await response.json();
      const items: Record<string, unknown>[] = raw.data?.list || raw.list || [];
      return items.map((item) => this.transformOpenApiResponse(item, String(item.handle || ''), '30d'));
    } catch (err) {
      console.error('[Kalodata API] Lỗi tìm kiếm creator:', err);
      return [];
    }
  }

  /**
   * Chuẩn bị dữ liệu cập nhật cho hồ sơ KOC trong hệ thống
   */
  public buildKocSyncResult(detail: KalodataCreatorDetail): KalodataSyncResult {
    return {
      success: true,
      message: `Đã đồng bộ số liệu thành công cho kênh @${detail.profile.handle} (${detail.dataSource === 'LIVE_API' ? 'Dữ liệu trực tiếp' : 'Dữ liệu thử nghiệm'})`,
      data: detail,
      suggestedUpdates: {
        followers: detail.profile.followers,
        avgViews: detail.metrics.avgViews,
        recentRevenue: detail.metrics.gmv,
        itemsSold: detail.metrics.itemsSold,
        gpm: detail.metrics.gpm,
        aov: detail.metrics.aov,
        gmvShareVideo: detail.metrics.gmvShareVideo,
        gmvShareLive: detail.metrics.gmvShareLive,
        gmvShareProductCard: detail.metrics.gmvShareProductCard,
        femaleRatio: detail.audience.femaleRatio,
        maleRatio: detail.audience.maleRatio,
        age18_24: detail.audience.age18_24,
        age25_34: detail.audience.age25_34,
        age35Plus: detail.audience.age35Plus,
        avatarUrl: detail.profile.avatarUrl
      }
    };
  }

  /**
   * Ánh xạ phản hồi từ Kalodata Open API sang cấu trúc chuẩn của Upbase
   */
  private transformOpenApiResponse(
    raw: Record<string, unknown>,
    handle: string,
    period: KalodataPeriod
  ): KalodataCreatorDetail {
    const profile = (raw.profile || raw.creator || raw) as Record<string, unknown>;
    const metrics = (raw.metrics || raw.data || raw) as Record<string, unknown>;
    const audience = (raw.audience || {}) as Record<string, unknown>;

    return {
      profile: {
        creatorId: String(profile.creator_id || profile.id || `kalo_${handle}`),
        handle: String(profile.username || profile.handle || handle),
        nickname: String(profile.nickname || profile.display_name || handle),
        avatarUrl: String(profile.avatar || profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'),
        followers: Number(profile.follower_count || profile.followers || 0),
        region: String(profile.region || this.config.region),
        category: String(profile.main_category || profile.category || 'Mỹ phẩm & Tiêu dùng'),
        bio: profile.bio || profile.description ? String(profile.bio || profile.description) : undefined,
        isVerified: Boolean(profile.verified)
      },
      metrics: {
        period,
        gmv: Number(metrics.gmv || metrics.revenue || 0),
        itemsSold: Number(metrics.unit_sales || metrics.items_sold || 0),
        orderCount: Number(metrics.order_count || 0),
        gpm: Number(metrics.gpm || 0),
        aov: Number(metrics.aov || 0),
        gmvShareVideo: Number(metrics.video_gmv_share || metrics.gmv_share_video || 70),
        gmvShareLive: Number(metrics.live_gmv_share || metrics.gmv_share_live || 20),
        gmvShareProductCard: Number(metrics.card_gmv_share || metrics.gmv_share_product_card || 10),
        videoCount: Number(metrics.video_count || 0),
        liveCount: Number(metrics.live_count || 0),
        avgViews: Number(metrics.avg_views || 0),
        engagementRate: Number(metrics.engagement_rate || 0)
      },
      audience: {
        femaleRatio: Number(audience.female_ratio || 80),
        maleRatio: Number(audience.male_ratio || 20),
        age18_24: Number(audience.age_18_24 || 50),
        age25_34: Number(audience.age_25_34 || 35),
        age35Plus: Number(audience.age_35_plus || 15)
      },
      topProducts: Array.isArray(raw.top_products)
        ? raw.top_products.map((p: Record<string, unknown>) => ({
            productId: String(p.product_id || p.id || ''),
            productName: String(p.product_name || p.title || ''),
            categoryName: String(p.category_name || 'Hàng tiêu dùng'),
            gmv: Number(p.gmv || 0),
            salesCount: Number(p.sales_count || p.units || 0),
            commissionRate: Number(p.commission_rate || 15),
            productImageUrl: p.image_url ? String(p.image_url) : undefined,
            shopName: p.shop_name ? String(p.shop_name) : undefined
          }))
        : [],
      dataSource: 'LIVE_API',
      syncedAt: new Date().toISOString()
    };
  }
}

// Singleton instance dùng chung cho ứng dụng
export const kalodataClient = new KalodataClient();
