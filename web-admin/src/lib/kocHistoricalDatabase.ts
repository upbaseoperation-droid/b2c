import type { BookingDealItem, KocItem, KocTier, SalaryGrade, CreatorSegment } from './types';
import historicalDbRaw from './kocMasterHistoricalDb.json';

interface RawHistoricalDb {
  kocs?: Record<string, unknown[]>;
  stores?: Array<{
    id: string;
    storeName: string;
    brandName: string;
    platform: string;
    b2cOwnerName: string;
    budgetNet: number;
    actualSpentNet: number;
    financialRiskStatus: string;
    leaderName: string;
    directorName: string;
    routingLabel: string;
  }>;
}

const rawDb = historicalDbRaw as unknown as RawHistoricalDb;

function normalizeHandle(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

function stripHandlePunct(raw?: string | null): string {
  return normalizeHandle(raw).replace(/[._-]+/g, '');
}

function dedupeHandleLetters(raw?: string | null): string {
  return stripHandlePunct(raw).replace(/([a-z])\1+/g, '$1');
}

function getTierFromFollowers(followers: number): { tier: KocTier; tierLabel: string } {
  if (followers >= 500_000) return { tier: 'TIER_1_CELEB', tierLabel: 'Tier 1 · Celeb' };
  if (followers >= 100_000) return { tier: 'TIER_2_MACRO', tierLabel: 'Tier 2 · Macro' };
  if (followers >= 10_000) return { tier: 'TIER_3_MICRO', tierLabel: 'Tier 3 · Micro' };
  return { tier: 'TIER_4_AFFILIATE', tierLabel: 'Tier 4 · Affiliate' };
}

export function inflateHistoricalTuple(tuple: unknown[]): {
  koc: KocItem;
  deals: BookingDealItem[];
} | null {
  if (!Array.isArray(tuple) || tuple.length < 5) return null;

  const rawDeals = Array.isArray(tuple[29]) ? (tuple[29] as unknown[][]) : [];
  const deals: BookingDealItem[] = rawDeals.map((d, idx) => {
    const dealCode = String(d[0] || `BO-HIST-${idx + 1}`);
    const brandName = String(d[1] || 'Upbase Partner');
    const totalVal = Math.round(Number(d[2] || 0));
    const views = Math.round(Number(d[3] || 0));
    const staff = String(d[4] || '—');
    const vidUrl = String(d[5] || '');

    return {
      id: `deal-hist-${dealCode}-${idx}`,
      dealCode,
      campaignCode: `CAMP-HIST-${dealCode}`,
      campaignTitle: `Chiến dịch lịch sử ${brandName}`,
      brandName,
      storeName: brandName,
      kocId: String(tuple[0] || ''),
      kocStageName: String(tuple[2] || tuple[1] || ''),
      kocChannelId: String(tuple[1] || ''),
      bookingFormat: 'Booking Video KOC',
      totalValue: totalVal,
      viewsCount: views,
      assignedStaff: staff,
      assignedStaffId: 'st-historical',
      videoUrl: vidUrl,
      statusLabel: 'Đã hoàn tất',
      dealStatus: 'COMPLETED',
      startDate: String(tuple[17] || '2026/01'),
      endDate: String(tuple[17] || '2026/01'),
    } as unknown as BookingDealItem;
  });

  const followers = Math.round(Number(tuple[6] || 0));
  const tierInfo = getTierFromFollowers(followers);
  const channelId = String(tuple[1] || '');

  const koc: KocItem = {
    id: String(tuple[0] || `koc-hist-${channelId}`),
    channelId,
    channelLink: `https://www.tiktok.com/@${channelId}`,
    stageName: String(tuple[2] || channelId),
    realName: String(tuple[3] || '—'),
    tier: tierInfo.tier,
    tierLabel: tierInfo.tierLabel,
    salaryGrade: (String(tuple[4] || 'KL1') as SalaryGrade),
    segment: (String(tuple[5] || 'Micro') as CreatorSegment),
    tepKenh: 'Review Nữ',
    kocCategory: 'Personal care',
    niche: String(tuple[20] ? `Chuyên sâu ${tuple[20]}` : 'Review Sản phẩm & Đời sống'),
    followers,
    avgViews: Math.round(Number(tuple[7] || 0)),
    medianViews: Math.round(Number(tuple[8] || 0)),
    engagementRate: Number(tuple[9] || 0),
    rateCardVideo: Math.round(Number(tuple[10] || 0)),
    minRate: Math.round(Number(tuple[11] || tuple[10] || 0)),
    maxRate: Math.round(Number(tuple[12] || tuple[10] || 0)),
    reliabilityScore: Number(tuple[13] || 0),
    totalPastDeals: Math.round(Number(tuple[14] || deals.length || 0)),
    totalPaidVideos: Math.round(Number(tuple[15] || 0)),
    totalFocVideos: Math.round(Number(tuple[16] || 0)),
    latestBookMonth: String(tuple[17] || '—'),
    latestBoCode: String(tuple[18] || '—'),
    bookingPic: String(tuple[19] || '—'),
    brandName: String(tuple[20] || '—'),
    phone: String(tuple[21] || '—'),
    cccd: String(tuple[22] || '—'),
    bankAccount: String(tuple[23] || '—'),
    sharedMcnInfo: tuple[24] ? String(tuple[24]) : undefined,
    recentRevenue: Math.round(Number(tuple[25] || 0)),
    itemsSold: Math.round(Number(tuple[26] || 0)),
    gpm: Math.round(Number(tuple[27] || 0)),
    aov: Math.round(Number(tuple[28] || 0)),
    gmvShareVideo: 80,
    gmvShareLive: 14,
    gmvShareProductCard: 6,
    maleRatio: 22,
    femaleRatio: 78,
    age18_24: 35,
    age25_34: 45,
    age35Plus: 20,
    location: 'Việt Nam',
  };

  return { koc, deals };
}

class HistoricalDatabaseRegistry {
  private byExact = new Map<string, KocItem>();
  private byStripped = new Map<string, KocItem>();
  private byFuzzy = new Map<string, KocItem>();
  private dealsByHandle = new Map<string, BookingDealItem[]>();
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    const kocsMap = rawDb?.kocs || {};
    for (const [key, tuple] of Object.entries(kocsMap)) {
      const clean = normalizeHandle(key);
      if (!clean || !Array.isArray(tuple)) continue;

      const inflated = inflateHistoricalTuple(tuple);
      if (!inflated) continue;

      const { koc, deals } = inflated;
      const dealsCount = Number(koc.totalPastDeals || deals.length || 0);

      const prevExact = this.byExact.get(clean);
      if (!prevExact || Number(prevExact.totalPastDeals || 0) < dealsCount) {
        this.byExact.set(clean, koc);
      }

      const stripped = stripHandlePunct(clean);
      if (stripped) {
        const prevStripped = this.byStripped.get(stripped);
        if (!prevStripped || Number(prevStripped.totalPastDeals || 0) < dealsCount) {
          this.byStripped.set(stripped, koc);
        }
      }

      const fuzzy = dedupeHandleLetters(clean);
      if (fuzzy) {
        const prevFuzzy = this.byFuzzy.get(fuzzy);
        if (!prevFuzzy || Number(prevFuzzy.totalPastDeals || 0) < dealsCount) {
          this.byFuzzy.set(fuzzy, koc);
        }
      }

      if (deals.length > 0) {
        const existingDeals = this.dealsByHandle.get(clean);
        if (!existingDeals || existingDeals.length < deals.length) {
          this.dealsByHandle.set(clean, deals);
        }
        if (stripped && !this.dealsByHandle.has(stripped)) {
          this.dealsByHandle.set(stripped, deals);
        }
        if (fuzzy && !this.dealsByHandle.has(fuzzy)) {
          this.dealsByHandle.set(fuzzy, deals);
        }
      }
    }
  }

  public getKoc(rawHandle?: string | null): KocItem | null {
    this.init();
    const clean = normalizeHandle(rawHandle);
    if (!clean) return null;

    const exact = this.byExact.get(clean);
    const stripped = this.byStripped.get(stripHandlePunct(clean));
    const fuzzy = this.byFuzzy.get(dedupeHandleLetters(clean));

    if (
      exact &&
      fuzzy &&
      Number(fuzzy.totalPastDeals || 0) > Number(exact.totalPastDeals || 0) &&
      (String(fuzzy.realName || '') === String(exact.realName || '') ||
        Number(fuzzy.totalPastDeals || 0) >= Number(exact.totalPastDeals || 0) * 3)
    ) {
      return fuzzy;
    }

    return exact || stripped || fuzzy || null;
  }

  public getDeals(rawHandle?: string | null): BookingDealItem[] {
    this.init();
    const clean = normalizeHandle(rawHandle);
    if (!clean) return [];

    return (
      this.dealsByHandle.get(clean) ||
      this.dealsByHandle.get(stripHandlePunct(clean)) ||
      this.dealsByHandle.get(dedupeHandleLetters(clean)) ||
      []
    );
  }

  public getTotalKocsCount(): number {
    this.init();
    return this.byExact.size;
  }

  public getHistoricalStores() {
    return Array.isArray(rawDb?.stores) ? rawDb.stores : [];
  }
}

export const historicalDb = new HistoricalDatabaseRegistry();
