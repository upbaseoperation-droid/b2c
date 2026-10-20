'use client';

import React, { useState, useEffect } from 'react';
import { Presence } from './ui';
import {
  X,
  AlertTriangle,
  UserPlus,
  DollarSign,
  CreditCard,
  Check,
  Truck,
  Users,
  FileText,
  CloudDownload,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  KocItem,
  SalaryGrade,
  CreatorSegment,
  KocCategory,
  TepKenh,
  KocTier,
  getSalaryGradeFromRate,
  getSegmentFromSalaryGrade,
} from '../lib/types';
import type { TikTokScrapedKocResult } from '../lib/tiktokKocScraper';
import {
  extractHandleFromSocialInput,
  formatSocialChannelUrl,
  type KocSocialDiscoveryResult,
} from '../lib/kocSocialDiscovery';
import {
  getEffectiveConfigForPurpose,
  loadApiWorkspaceConfig,
  recordApiUsageLog,
  calculateExecutionCost,
} from '../lib/apiKeyConfig';

interface CreateKocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKocCreated: (newKoc: KocItem) => void;
  existingKocs?: KocItem[];
}

function createKocId(): string {
  return `koc-${Date.now()}`;
}

export const CreateKocModal: React.FC<CreateKocModalProps> = ({
  isOpen,
  onClose,
  onKocCreated,
  existingKocs = [],
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [stageName, setStageName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [realName, setRealName] = useState('');
  const [bookingFormat, setBookingFormat] = useState<'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần'>('Booking Video KOC');
  const [formError, setFormError] = useState<string | null>(null);

  // Kênh Shopee, Facebook, Instagram, Threads
  const [shopeeChannel, setShopeeChannel] = useState('');
  const [facebookChannel, setFacebookChannel] = useState('');
  const [instagramChannel, setInstagramChannel] = useState('');
  const [threadsChannel, setThreadsChannel] = useState('');
  const [isSearchingSocial, setIsSearchingSocial] = useState(false);
  const [socialCandidates, setSocialCandidates] = useState<KocSocialDiscoveryResult | null>(null);

  // Rate Card & 4 Phân Loại Cốt Lõi
  const [rateCardVideo, setRateCardVideo] = useState<number>(3000000);
  const [salaryGrade, setSalaryGrade] = useState<SalaryGrade>('KL4');
  const [segment, setSegment] = useState<CreatorSegment>('Mid Creator');
  const [tepKenh, setTepKenh] = useState<TepKenh>('Review Nữ');
  const [kocCategory, setKocCategory] = useState<KocCategory>('Personal care');
  const [tier, setTier] = useState<KocTier>('TIER_3_MICRO');

  // E-Commerce & Performance
  const [followers, setFollowers] = useState<number>(50000);
  const [gmvBestCase, setGmvBestCase] = useState<number>(15000000);

  // Follower Demographics
  const [femaleRatio, setFemaleRatio] = useState<number>(85);
  const [ageGroup, setAgeGroup] = useState<'18-24' | '25-34' | '35+'>('18-24');

  // Contact & Shipping Logistics for Sample
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [shippingAddress, setShippingAddress] = useState('');
  const [bookingPic, setBookingPic] = useState('Khánh Vy');
  const [brandName, setBrandName] = useState('Kutieskin Mama');

  // Legal & Banking
  const [legalType, setLegalType] = useState<'INDIVIDUAL' | 'BUSINESS_HOUSEHOLD' | 'BUSINESS_COMPANY'>('INDIVIDUAL');
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [legalRepresentative, setLegalRepresentative] = useState('');
  const [cccd, setCccd] = useState('');
  const [bankName, setBankName] = useState('Techcombank');
  const [bankAccount, setBankAccount] = useState('');

  // Tự động lấy dữ liệu kênh từ TikTok & Creator Marketplace
  const [tiktokLookupInput, setTiktokLookupInput] = useState('');
  const [isFetchingTikTok, setIsFetchingTikTok] = useState(false);
  const [scrapedCache, setScrapedCache] = useState<TikTokScrapedKocResult | null>(null);

  const handleSearchSocialChannels = async () => {
    const targetHandle = (channelId || tiktokLookupInput).trim();
    const targetName = stageName.trim();
    if (!targetHandle && !targetName) {
      setFormError('Nhập Tên KOC hoặc TikTok Handle trước khi tìm kênh mạng xã hội.');
      return;
    }
    setIsSearchingSocial(true);
    setFormError(null);
    try {
      const workspaceCfg = loadApiWorkspaceConfig();
      const effective = getEffectiveConfigForPurpose('KOC_MATCHING', workspaceCfg);
      const provider = effective.primaryProvider === 'INTERNAL' ? 'GOOGLE' : effective.primaryProvider;
      const llmConfig = {
        provider,
        model:
          effective.primaryProvider === 'INTERNAL'
            ? workspaceCfg.providers.GOOGLE?.defaultModel || 'gemini-3.8-flash'
            : effective.primaryModel,
        apiKey:
          effective.primaryProvider === 'INTERNAL'
            ? workspaceCfg.providers.GOOGLE?.apiKey || ''
            : effective.primaryApiKey,
        baseUrl: workspaceCfg.providers[provider]?.baseUrl,
      };
      const res = await fetch('/api/integrations/tiktok-koc/social-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokHandle: targetHandle,
          stageName: targetName || targetHandle,
          realName: realName.trim() || undefined,
          phone: phone.trim() || undefined,
          niche: kocCategory,
          bio: scrapedCache?.channelProfile.bio,
          llmConfig,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const data: KocSocialDiscoveryResult = json.data;
        setSocialCandidates(data);

        if (data.usage && data.usage.provider !== 'INTERNAL') {
          const costReport = calculateExecutionCost(data.usage.modelUsed, {
            promptTokens: data.usage.promptTokens,
            completionTokens: data.usage.completionTokens,
            totalTokens: data.usage.totalTokens,
          });

          recordApiUsageLog({
            purposeId: 'KOC_MATCHING',
            purposeTitle: 'Dò tìm kênh KOC (@' + (targetHandle || '') + ')',
            provider: data.usage.provider,
            modelUsed: data.usage.modelUsed,
            promptTokens: costReport.promptTokens,
            completionTokens: costReport.completionTokens,
            totalTokens: costReport.totalTokens,
            costUsd: costReport.costUsd,
            costVnd: costReport.costVnd,
            latencyMs: data.usage.latencyMs,
            status: 'SUCCESS',
            source: 'KOC_DISCOVERY',
          });
        }
        if (!shopeeChannel && data.candidatesByPlatform.SHOPEE[0] && data.candidatesByPlatform.SHOPEE[0].confidence !== 'GỢI_Ý') {
          setShopeeChannel(data.candidatesByPlatform.SHOPEE[0].handle);
        }
        if (!facebookChannel && data.candidatesByPlatform.FACEBOOK[0] && data.candidatesByPlatform.FACEBOOK[0].confidence !== 'GỢI_Ý') {
          setFacebookChannel(data.candidatesByPlatform.FACEBOOK[0].handle);
        }
        if (!instagramChannel && data.candidatesByPlatform.INSTAGRAM[0] && data.candidatesByPlatform.INSTAGRAM[0].confidence !== 'GỢI_Ý') {
          setInstagramChannel(data.candidatesByPlatform.INSTAGRAM[0].handle);
        }
        if (!threadsChannel && data.candidatesByPlatform.THREADS[0] && data.candidatesByPlatform.THREADS[0].confidence !== 'GỢI_Ý') {
          setThreadsChannel(data.candidatesByPlatform.THREADS[0].handle);
        }
      } else {
        setFormError(json.message || 'Không tìm được kênh mạng xã hội.');
      }
    } catch {
      setFormError('Không kết nối được dịch vụ tìm kiếm kênh mạng xã hội.');
    } finally {
      setIsSearchingSocial(false);
    }
  };

  const handleFetchFromTikTok = async () => {
    const query = (tiktokLookupInput || channelId).trim();
    if (!query) {
      setFormError('Vui lòng nhập đường dẫn kênh hoặc @handle TikTok trước khi lấy dữ liệu.');
      return;
    }
    setIsFetchingTikTok(true);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/integrations/tiktok-koc/scrape?handle=${encodeURIComponent(query)}&period=30d`
      );
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setFormError(json.message || 'Không lấy được dữ liệu kênh TikTok.');
        return;
      }
      const data: TikTokScrapedKocResult = json.data;
      setScrapedCache(data);
      setChannelId(`@${data.channelProfile.handle}`);
      setStageName(data.channelProfile.nickname);
      if (data.channelProfile.realName) setRealName(data.channelProfile.realName);
      setFollowers(data.channelProfile.followers);
      setGmvBestCase(data.affiliateMetrics.gmvBestCase);
      const cls = data.affiliateMetrics.suggestedClassification;
      setRateCardVideo(cls.rateCardVideo);
      setSalaryGrade(cls.salaryGrade);
      setSegment(cls.segment);
      setTier(cls.tier);
      setTepKenh(cls.tepKenh);
      setKocCategory(cls.kocCategory);
      setFemaleRatio(data.affiliateMetrics.audience.femaleRatio);
      if (data.channelProfile.extractedPhone) {
        setPhone(data.channelProfile.extractedPhone);
        setZalo(data.channelProfile.extractedPhone);
      }
      if (data.channelProfile.extractedEmail) {
        setEmail(data.channelProfile.extractedEmail);
      }
      if (data.channelProfile.location) {
        setLocation(data.channelProfile.location);
      }
    } catch {
      setFormError('Không kết nối được máy chủ khi lấy dữ liệu kênh TikTok.');
    } finally {
      setIsFetchingTikTok(false);
    }
  };

  // Kiểm tra trùng lặp KOC thời gian thực
  const duplicateMatch = (() => {
    if (!isOpen || !existingKocs || existingKocs.length === 0) return null;
    const cleanHandle = channelId.trim().toLowerCase().replace('@', '');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanCccd = cccd.trim();
    const cleanTax = taxCode.trim();

    for (const k of existingKocs) {
      const kHandle = (k.channelId || '').toLowerCase().replace('@', '');
      const kPhone = (k.phone || '').replace(/\D/g, '');
      const kCccd = k.cccd ? k.cccd.trim() : '';
      const kTax = k.taxCode ? k.taxCode.trim() : '';

      if (cleanHandle && cleanHandle.length >= 3 && kHandle === cleanHandle) {
        return {
          type: 'TRÙNG_KÊNH' as const,
          reason: `Trùng ID kênh TikTok (@${kHandle})`,
          koc: k,
        };
      }
      if (cleanPhone && cleanPhone.length >= 9 && kPhone === cleanPhone) {
        return {
          type: 'TRÙNG_SĐT' as const,
          reason: `Trùng số điện thoại / Zalo (${k.phone})`,
          koc: k,
        };
      }
      if (cleanCccd && cleanCccd.length >= 9 && kCccd === cleanCccd) {
        return {
          type: 'TRÙNG_CCCD' as const,
          reason: `Trùng số CCCD / Định danh (${k.cccd})`,
          koc: k,
        };
      }
      if (cleanTax && cleanTax.length >= 9 && (kTax === cleanTax || kCccd === cleanTax)) {
        return {
          type: 'TRÙNG_MST' as const,
          reason: `Trùng Mã số thuế (${kTax || kCccd})`,
          koc: k,
        };
      }
    }
    return null;
  })();

  if (!isOpen) return <Presence show={false} />;

  // Auto detect Salary Grade (Khung lương) & Segment based on Rate card
  const handleRateCardChange = (value: number) => {
    setRateCardVideo(value);
    const kl = getSalaryGradeFromRate(value);
    setSalaryGrade(kl);
    const seg = getSegmentFromSalaryGrade(kl);
    setSegment(seg);
    if (value <= 3000000) {
      setTier('TIER_4_AFFILIATE');
    } else if (value <= 10000000) {
      setTier('TIER_3_MICRO');
    } else if (value <= 30000000) {
      setTier('TIER_2_MACRO');
    } else {
      setTier('TIER_1_CELEB');
    }
  };

  const handleSalaryGradeChange = (kl: SalaryGrade) => {
    setSalaryGrade(kl);
    setSegment(getSegmentFromSalaryGrade(kl));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim() || !channelId.trim()) {
      setFormError('Vui lòng nhập đầy đủ Tên KOC và Tên Kênh TikTok!');
      return;
    }
    setFormError(null);

    const formattedChannel = channelId.startsWith('@') ? channelId : `@${channelId}`;

    const cleanShopee = extractHandleFromSocialInput('SHOPEE', shopeeChannel) || undefined;
    const cleanFb = extractHandleFromSocialInput('FACEBOOK', facebookChannel) || undefined;
    const cleanIg = extractHandleFromSocialInput('INSTAGRAM', instagramChannel) || undefined;
    const cleanThreads = extractHandleFromSocialInput('THREADS', threadsChannel) || undefined;

    const activePlatforms: ('TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS')[] = ['TIKTOK'];
    if (cleanShopee) activePlatforms.push('SHOPEE');
    if (cleanFb) activePlatforms.push('FACEBOOK');
    if (cleanIg) activePlatforms.push('INSTAGRAM');
    if (cleanThreads) activePlatforms.push('THREADS');

    const newKoc: KocItem = {
      id: createKocId(),
      channelId: formattedChannel,
      channelLink: `https://www.tiktok.com/@${formattedChannel.replace('@', '')}`,
      stageName: stageName.trim(),
      realName: realName.trim(),
      avatarUrl: scrapedCache?.channelProfile.avatarUrl,
      tier: tier,
      tierLabel:
        tier === 'TIER_1_CELEB'
          ? 'Tier 1 (Celeb)'
          : tier === 'TIER_2_MACRO'
            ? 'Tier 2 (Macro)'
            : tier === 'TIER_3_MICRO'
              ? 'Tier 3 (Micro)'
              : 'Tier 4 (Affiliate)',
      // 4 Phân loại cốt lõi
      salaryGrade: salaryGrade,
      segment: segment,
      tepKenh: tepKenh,
      creatorCategory: tepKenh,
      kocCategory: kocCategory,
      niche: scrapedCache ? scrapedCache.affiliateMetrics.topCategories.join(', ') : '',
      followers: Number(followers) || 0,
      avgViews: scrapedCache?.engagementMetrics.avgViews || 20000,
      rateCardVideo: Number(rateCardVideo) || 0,
      bookingFormat: bookingFormat,
      platforms: activePlatforms,
      shopeeChannel: cleanShopee,
      facebookChannel: cleanFb,
      instagramChannel: cleanIg,
      threadsChannel: cleanThreads,

      // Shipping & Logistics
      phone: phone.trim(),
      zalo: zalo.trim() || phone.trim(),
      email: email.trim() || scrapedCache?.channelProfile.extractedEmail || undefined,
      location: location,
      shippingAddress: shippingAddress.trim() || undefined,
      bookingPic: bookingPic,
      brandName: brandName,

      // E-Commerce & Scraped TikTok data
      bio: scrapedCache?.channelProfile.bio,
      totalLikes: scrapedCache?.channelProfile.totalLikes,
      videoCount: scrapedCache?.channelProfile.videoCount,
      avgLikes: scrapedCache?.engagementMetrics.avgLikes,
      avgComments: scrapedCache?.engagementMetrics.avgComments,
      avgShares: scrapedCache?.engagementMetrics.avgShares,
      engagementRate: scrapedCache?.engagementMetrics.engagementRate,
      recentVideos: scrapedCache?.recentVideos,
      recentRevenue: scrapedCache?.affiliateMetrics.gmv30d,
      itemsSold: scrapedCache?.affiliateMetrics.itemsSold,
      gpm: scrapedCache?.affiliateMetrics.gpm,
      gmvBestCase: Number(gmvBestCase) || undefined,
      aov: scrapedCache?.affiliateMetrics.aov || 250000,
      tiktokAvgCtr: scrapedCache?.affiliateMetrics.ctr,
      tiktokAvgCvr: scrapedCache?.affiliateMetrics.cvr,
      tiktokAvgCommissionRate: scrapedCache?.affiliateMetrics.commissionRate,
      tiktokTopCategories: scrapedCache?.affiliateMetrics.topCategories,
      tiktokShopRating: scrapedCache?.affiliateMetrics.shopRating,
      tiktokCancellationRate: scrapedCache?.affiliateMetrics.cancellationRate,

      // Demographics
      femaleRatio: femaleRatio,
      maleRatio: 100 - femaleRatio,

      // Legal & Banking
      cccd: cccd.trim(),
      taxCode: legalType !== 'INDIVIDUAL' ? taxCode.trim() : cccd.trim() || undefined,
      companyName: legalType !== 'INDIVIDUAL' ? companyName.trim() : undefined,
      legalRepresentative:
        legalType !== 'INDIVIDUAL' ? legalRepresentative.trim() || realName.trim() : undefined,
      ocrDocumentType:
        legalType === 'INDIVIDUAL'
          ? 'CCCD'
          : legalType === 'BUSINESS_HOUSEHOLD'
            ? 'BUSINESS_HOUSEHOLD'
            : 'BUSINESS_LICENSE',
      isOcrVerified: Boolean(cccd.trim() || taxCode.trim()),
      bankName: bankName,
      bankAccount: bankAccount.trim(),

      // Operation status
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      statusKoc: 'SẴN_SÀNG',
      reliabilityScore: 10.0,
      totalPastDeals: 0,
      totalPastCost: 0,
      totalPastGmv: 0,
      historicalRoi: 0,
      isWinnerTop20: false,
    };

    onKocCreated(newKoc);
    onClose();
  };

  return (
    <Presence show>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 animate-in fade-in duration-(--motion-base)"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div data-motion-panel
        role="dialog"
        aria-modal="true"
        aria-label="Tạo hồ sơ KOC chuẩn 65 trường nghiệp vụ"
        className="bg-surface border border-line rounded-xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto text-ink animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              Tạo hồ sơ KOC chuẩn 65 trường nghiệp vụ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng modal"
            className="w-8 h-8 rounded-lg bg-sunken hover:bg-hover text-muted hover:text-ink flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-danger-soft border border-danger-line text-danger rounded-xl text-xs font-semibold flex items-center justify-between">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError(null)} className="text-danger font-semibold hover:opacity-80">×</button>
            </div>
          )}
          {duplicateMatch && (
            <div className="p-3 bg-warn-soft border border-warn-line rounded-xl text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-warn font-semibold">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0" />
                <span>Cảnh báo trùng hồ sơ KOC: {duplicateMatch.reason}</span>
              </div>
              <p className="text-ink-2 text-2xs leading-relaxed">
                KOC <strong>{duplicateMatch.koc.stageName}</strong> (@{duplicateMatch.koc.channelId}) đã tồn tại trong danh bạ hệ thống!
                <br />
                • Nhân sự phụ trách: <strong className="text-ink">{duplicateMatch.koc.bookingPic || 'Chưa gán'}</strong>
                {' '}• Nhãn hàng: <strong>{duplicateMatch.koc.brandName || 'Chung'}</strong>
                {' '}• Trạng thái: <span className="font-semibold text-ink">{duplicateMatch.koc.statusKoc || 'Sẵn sàng'}</span>
              </p>
              <div className="text-2xs text-warn font-medium">
                Vui lòng liên hệ với nhân sự phụ trách để tránh 2 người cùng liên hệ một KOC gây xung đột giá cast và mất uy tín.
              </div>
            </div>
          )}

          {/* Tự động điền thông tin từ link kênh TikTok */}
          <div className="p-3.5 bg-surface rounded-xl border border-line space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink font-semibold flex items-center gap-1.5">
                <CloudDownload className="w-3.5 h-3.5 text-accent" />
                Lấy thông tin tự động từ kênh TikTok &amp; Creator Marketplace
              </span>
              {scrapedCache && (
                <span className="text-2xs text-positive font-medium">
                  Đã điền dữ liệu từ @{scrapedCache.handle} ({scrapedCache.recentVideos.length} video, ER {scrapedCache.engagementMetrics.engagementRate}%)
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Dán link kênh (https://www.tiktok.com/@...) hoặc nhập @handle..."
                value={tiktokLookupInput}
                onChange={(e) => setTiktokLookupInput(e.target.value)}
                className="flex-1 bg-canvas border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={isFetchingTikTok}
                onClick={handleFetchFromTikTok}
                className="px-3.5 py-2 rounded-lg bg-surface border border-line-strong hover:bg-sunken text-ink font-medium text-xs inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isFetchingTikTok ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudDownload className="w-3.5 h-3.5" />
                )}
                {isFetchingTikTok ? 'Đang lấy dữ liệu...' : 'Lấy dữ liệu kênh'}
              </button>
            </div>
          </div>

          {/* Section 1: Channel & Stage Name & Booking Format */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Thông tin nhận diện kênh &amp; định dạng booking
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-ink-2 font-semibold block mb-1">
                  Tên kênh / KOC <span className="text-danger">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hải yến Beauty, Chanh Review..."
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="text-ink-2 font-semibold block mb-1">
                  TikTok Handle / Kênh ID <span className="text-danger">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: @haiyen.beauty"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="text-ink-2 font-semibold block mb-1">Định dạng booking:</label>
                <select
                  value={bookingFormat}
                  onChange={(e) => setBookingFormat(e.target.value as 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần')}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Booking Video KOC">Booking Video KOC</option>
                  <option value="Booking Livestream KOC">Booking Livestream KOC</option>
                  <option value="Affiliate Thuần">Affiliate Thuần</option>
                </select>
              </div>
            </div>

            {/* Kênh mạng xã hội khác: Shopee, Facebook, Instagram, Threads */}
            <div className="pt-3 border-t border-line space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-ink font-semibold text-xs">
                  Kênh mạng xã hội khác (Shopee, Facebook, Instagram, Threads)
                </span>
                <button
                  type="button"
                  disabled={isSearchingSocial}
                  onClick={handleSearchSocialChannels}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-line-strong hover:bg-canvas text-ink font-medium text-2xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSearchingSocial ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-accent" />
                  )}
                  {isSearchingSocial ? 'Đang tìm kênh...' : 'Tìm nick & xác nhận'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-ink-2 font-medium text-2xs">Nick / Link Shopee:</label>
                    {shopeeChannel.trim() && (
                      <a
                        href={formatSocialChannelUrl('SHOPEE', shopeeChannel)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        Kiểm tra <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="VD: megauriviu hoặc link shopee.vn/..."
                    value={shopeeChannel}
                    onChange={(e) => setShopeeChannel(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-primary"
                  />
                  {socialCandidates && socialCandidates.candidatesByPlatform.SHOPEE.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {socialCandidates.candidatesByPlatform.SHOPEE.slice(0, 3).map((c) => (
                        <button
                          key={c.handle}
                          type="button"
                          onClick={() => setShopeeChannel(c.handle)}
                          className="px-2 py-0.5 rounded border border-line bg-surface hover:border-primary text-2xs font-mono text-ink-2"
                        >
                          {c.handle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-ink-2 font-medium text-2xs">Nick / Link Facebook:</label>
                    {facebookChannel.trim() && (
                      <a
                        href={formatSocialChannelUrl('FACEBOOK', facebookChannel)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        Kiểm tra <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="VD: megauriviu hoặc link facebook.com/..."
                    value={facebookChannel}
                    onChange={(e) => setFacebookChannel(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-primary"
                  />
                  {socialCandidates && socialCandidates.candidatesByPlatform.FACEBOOK.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {socialCandidates.candidatesByPlatform.FACEBOOK.slice(0, 3).map((c) => (
                        <button
                          key={c.handle}
                          type="button"
                          onClick={() => setFacebookChannel(c.handle)}
                          className="px-2 py-0.5 rounded border border-line bg-surface hover:border-primary text-2xs font-mono text-ink-2"
                        >
                          {c.handle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-ink-2 font-medium text-2xs">Nick / Link Instagram:</label>
                    {instagramChannel.trim() && (
                      <a
                        href={formatSocialChannelUrl('INSTAGRAM', instagramChannel)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        Kiểm tra <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="VD: @megauriviu"
                    value={instagramChannel}
                    onChange={(e) => setInstagramChannel(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-primary"
                  />
                  {socialCandidates && socialCandidates.candidatesByPlatform.INSTAGRAM.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {socialCandidates.candidatesByPlatform.INSTAGRAM.slice(0, 3).map((c) => (
                        <button
                          key={c.handle}
                          type="button"
                          onClick={() => setInstagramChannel(c.handle)}
                          className="px-2 py-0.5 rounded border border-line bg-surface hover:border-primary text-2xs font-mono text-ink-2"
                        >
                          {c.handle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-ink-2 font-medium text-2xs">Nick / Link Threads:</label>
                    {threadsChannel.trim() && (
                      <a
                        href={formatSocialChannelUrl('THREADS', threadsChannel)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        Kiểm tra <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="VD: @megauriviu"
                    value={threadsChannel}
                    onChange={(e) => setThreadsChannel(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:border-primary"
                  />
                  {socialCandidates && socialCandidates.candidatesByPlatform.THREADS.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {socialCandidates.candidatesByPlatform.THREADS.slice(0, 3).map((c) => (
                        <button
                          key={c.handle}
                          type="button"
                          onClick={() => setThreadsChannel(c.handle)}
                          className="px-2 py-0.5 rounded border border-line bg-surface hover:border-primary text-2xs font-mono text-ink-2"
                        >
                          {c.handle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Rate Card & Auto Salary Grade Calculation */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-ink font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-success" />
                Báo giá video &amp; tự động gán khung lương (KL)
              </span>
              <span className="text-2xs font-medium text-ink-3">
                {salaryGrade} · {tier}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Báo giá video net (VNĐ):</label>
                <input
                  type="number"
                  step={100000}
                  value={rateCardVideo}
                  onChange={(e) => handleRateCardChange(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-mono tabular-nums font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Khung lương (KL):</label>
                <select
                  value={salaryGrade}
                  onChange={(e) => handleSalaryGradeChange(e.target.value as SalaryGrade)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="TAP UpAffiliate">TAP UpAffiliate (0đ)</option>
                  <option value="KL1">KL1 (&lt; 500k)</option>
                  <option value="KL2">KL2 (500k - 1.5tr)</option>
                  <option value="KL3">KL3 (1.5tr - 3tr)</option>
                  <option value="KL4">KL4 (3tr - 5tr)</option>
                  <option value="KL5">KL5 (5tr - 10tr)</option>
                  <option value="KL6">KL6 (10tr - 30tr)</option>
                  <option value="KL7">KL7 (&gt; 30tr)</option>
                  <option value="TAP đối tác ngoài">TAP Ngoài</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Phân nhóm Creator:</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as CreatorSegment)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Massive Creator">Massive Creator (TAP, KL1-3)</option>
                  <option value="Mid Creator">Mid Creator (KL4-5)</option>
                  <option value="Key Creator">Key Creator (KL6)</option>
                  <option value="Top Creator">Top Creator (KL7)</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Kỷ lục GMV:</label>
                <input
                  type="number"
                  step={1000000}
                  value={gmvBestCase}
                  onChange={(e) => setGmvBestCase(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-success font-mono tabular-nums font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Creator Niche & Follower Demographics */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Tệp kênh (25 tệp), ngành hàng (9 ngành) &amp; khán giả
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Tệp kênh (25 tệp):</label>
                <select
                  value={tepKenh}
                  onChange={(e) => setTepKenh(e.target.value as TepKenh)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Review Nữ">Review Nữ</option>
                  <option value="Review Nam">Review Nam</option>
                  <option value="Unboxing">Unboxing</option>
                  <option value="Seller">Seller</option>
                  <option value="Mẹ bé (bầu)">Mẹ bé (bầu)</option>
                  <option value="Mẹ bé (bé)">Mẹ bé (bé)</option>
                  <option value="Gia đình">Gia đình</option>
                  <option value="Couple">Couple</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Health">Health</option>
                  <option value="Makeup Artist">Makeup Artist</option>
                  <option value="Tóc">Tóc</option>
                  <option value="Bác sỹ/chuyên gia">Bác sỹ / chuyên gia</option>
                  <option value="Gym">Gym</option>
                  <option value="Eat Clean">Eat Clean</option>
                  <option value="Thời trang (review)">Thời trang (review)</option>
                  <option value="Thời trang (có kiến thức)">Thời trang (kiến thức)</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Nhà cửa đời sống">Nhà cửa đời sống</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Thú cưng">Thú cưng</option>
                  <option value="POV">POV</option>
                  <option value="Dance">Dance</option>
                  <option value="Cosplay">Cosplay</option>
                  <option value="Tin tức">Tin tức</option>
                  <option value="LGBT">LGBT</option>
                  <option value="KOL">KOL</option>
                  <option value="Nữ xinh">Nữ xinh</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Ngành hàng (Category):</label>
                <select
                  value={kocCategory}
                  onChange={(e) => setKocCategory(e.target.value as KocCategory)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Personal care">Personal care (Mỹ phẩm/Skincare)</option>
                  <option value="Mom and baby">Mom and baby (mẹ &amp; bé)</option>
                  <option value="Reviewer">Reviewer (Đánh giá chuyên sâu)</option>
                  <option value="Lifestyle">Lifestyle (Đời sống)</option>
                  <option value="Fashion">Fashion (Thời trang)</option>
                  <option value="ELHA">ELHA (Điện &amp; Gia dụng)</option>
                  <option value="F&B">F&amp;B (thực phẩm &amp; ẩm thực)</option>
                  <option value="Social / Comedian">Social / Comedian (Giải trí)</option>
                  <option value="Travel/Hospitality">Travel/Hospitality (Du lịch)</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Followers kênh:</label>
                <input
                  type="number"
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Tỉ trọng Follower nữ (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={femaleRatio}
                  onChange={(e) => setFemaleRatio(Number(e.target.value))}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-mono tabular-nums font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Nhóm tuổi khán giả chính:</label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as '18-24' | '25-34' | '35+')}
                  className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="18-24">18 - 24 Tuổi</option>
                  <option value="25-34">25 - 34 tuổi (dân VP, sức mua cao)</option>
                  <option value="35+">&gt; 35 Tuổi (Mẹ bỉm, gia đình)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Sample Logistics & Operational PIC */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-success" />
              Hậu cần gửi mẫu &amp; nhân sự booking phụ trách
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Khu vực địa lý:</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Miền Bắc">Miền bắc (tỉnh khác)</option>
                  <option value="Miền Trung">Miền Trung</option>
                  <option value="Miền Nam">Miền nam (tỉnh khác)</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Nhân sự PIC phụ trách:</label>
                <select
                  value={bookingPic}
                  onChange={(e) => setBookingPic(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Khánh Vy">Khánh Vy</option>
                  <option value="Lê Thị Thùy Linh">Lê Thị Thùy Linh</option>
                  <option value="Đinh Thị Bích Liên">Đinh Thị Bích Liên</option>
                  <option value="Trần Thị Hồng">Trần Thị Hồng</option>
                  <option value="Nguyễn Văn An">Nguyễn Văn An</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Gian hàng phù hợp đề xuất:</label>
                <select
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Kutieskin Mama">Kutieskin Mama</option>
                  <option value="Bye Bye Blemish">Bye Bye Blemish</option>
                  <option value="pHCare">pHCare</option>
                  <option value="EUPC">EUPC</option>
                  <option value="Natural Care">Natural Care</option>
                  <option value="Babe">Babe</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-ink-2 font-medium block mb-1">
                  Email KOC (nhận lời mời hợp tác &amp; hợp đồng):
                </label>
                <input
                  type="email"
                  placeholder="VD: haiyen.beauty@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-ink-2 font-medium block mb-1">
                  Thông tin nhận hàng chi tiết (tên người nhận, SĐT, địa chỉ giao mẫu):
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Hải Yến — 0987654321 — Tầng 5, tòa Charmvit, 117 Trần Duy Hưng, Hà Nội"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3.5 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Legal & Payment Data */}
          <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-3">
            <span className="text-ink font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Pháp lý &amp; thanh toán (tự động sinh hợp đồng &amp; VietQR cọc 50%)
            </span>

            {/* Legal Entity Type Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <span className="text-2xs font-medium text-muted">Hình thức pháp lý ký kết &amp; thuế:</span>
              <div className="flex flex-wrap items-center gap-1 bg-surface p-1 rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => setLegalType('INDIVIDUAL')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                    legalType === 'INDIVIDUAL'
                      ? 'bg-primary text-primary-fg'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Cá nhân (CCCD · Thuế 10%)
                </button>
                <button
                  type="button"
                  onClick={() => setLegalType('BUSINESS_HOUSEHOLD')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                    legalType === 'BUSINESS_HOUSEHOLD'
                      ? 'bg-primary text-primary-fg'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Hộ kinh doanh (HKD)
                </button>
                <button
                  type="button"
                  onClick={() => setLegalType('BUSINESS_COMPANY')}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition cursor-pointer ${
                    legalType === 'BUSINESS_COMPANY'
                      ? 'bg-primary text-primary-fg'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Công ty / MCN (Xuất VAT)
                </button>
              </div>
            </div>

            {/* Dynamic fields based on legalType */}
            {legalType === 'INDIVIDUAL' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-ink-2 font-medium block mb-1">Họ &amp; tên thật (trên CCCD):</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Thị Hải Yến"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-ink-2 font-medium block mb-1">Số điện thoại / Zalo:</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!zalo) setZalo(e.target.value);
                    }}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-ink-2 font-medium block mb-1">Số CCCD (12 số):</label>
                  <input
                    type="text"
                    placeholder="001203004567"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-ink-2 font-medium block mb-1">
                      {legalType === 'BUSINESS_COMPANY' ? 'Tên công ty / pháp nhân (theo ĐKKD):' : 'Tên hộ kinh doanh cá thể:'}
                    </label>
                    <input
                      type="text"
                      placeholder={legalType === 'BUSINESS_COMPANY' ? 'CÔNG TY TNHH TRUYỀN THÔNG CREATOR VIỆT' : 'HỘ KINH DOANH VY STUDIO & MEDIA'}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-ink-2 font-medium block mb-1">
                      Mã số thuế (MST doanh nghiệp / HKD):
                    </label>
                    <input
                      type="text"
                      placeholder={legalType === 'BUSINESS_COMPANY' ? '0109876543' : '8491238475-001'}
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-ink-2 font-medium block mb-1">
                      {legalType === 'BUSINESS_COMPANY' ? 'Người đại diện theo pháp luật:' : 'Tên chủ hộ kinh doanh:'}
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Lê Quang Huy"
                      value={legalRepresentative}
                      onChange={(e) => {
                        setLegalRepresentative(e.target.value);
                        if (!realName) setRealName(e.target.value);
                      }}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-ink-2 font-medium block mb-1">Số CCCD người đại diện / chủ hộ:</label>
                    <input
                      type="text"
                      placeholder="001201019876"
                      value={cccd}
                      onChange={(e) => setCccd(e.target.value)}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-ink-2 font-medium block mb-1">Số điện thoại liên hệ:</label>
                    <input
                      type="text"
                      placeholder="0987654321"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (!zalo) setZalo(e.target.value);
                      }}
                      className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-ink-2 font-medium block mb-1">Ngân hàng thụ hưởng:</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Techcombank">Techcombank</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="MB Bank">MB Bank</option>
                  <option value="VPBank">VPBank</option>
                  <option value="ACB">ACB</option>
                  <option value="TPBank">TPBank</option>
                  <option value="VietinBank">VietinBank</option>
                  <option value="BIDV">BIDV</option>
                </select>
              </div>

              <div>
                <label className="text-ink-2 font-medium block mb-1">Số tài khoản ngân hàng (STK):</label>
                <input
                  type="text"
                  placeholder="VD: 190394857281"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-success font-mono font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-ink-2 hover:text-ink bg-sunken hover:bg-hover transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold text-primary-fg bg-primary hover:bg-primary-hover transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu KOC &amp; đưa vào danh mục</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </Presence>
  );
};


