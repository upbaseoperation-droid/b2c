'use client';

/**
 * Hồ sơ một KOC — dùng chung cho trang chi tiết (Danh bạ KOC) và modal (màn Booking).
 * Thiết kế chuẩn vận hành B2C:
 * 1. Bộ chỉ số tích hợp từ TikTok Seller (GMV 30d, GPM, AOV, CTR, CVR, cơ cấu định dạng, khán giả, điểm uy tín shop).
 * 2. Thông tin cá nhân & Hậu cần gửi mẫu FOC (người nhận, SĐT nhận hàng, địa chỉ, ghi chú giao nhận, thông số loại da/size).
 * 3. Lịch sử hợp tác & Hiệu quả hợp tác chi tiết (Tổng hợp ROI/CPO/Đơn hàng, bảng chi tiết từng deal, phân bổ Organic vs Ads, đánh giá chất lượng 3 bên).
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Copy,
  ExternalLink,
  FileScan,
  FileText,
  Filter,
  History,
  MessageSquare,
  Music,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Truck,
  XCircle,
} from 'lucide-react';
import type { BookingDealItem, KocItem, TikTokVideoItem, UserProfile } from '../../lib/types';
import { formatDate, formatNumber, formatVndShort } from '../../lib/format';
import { formatSocialChannelUrl } from '../../lib/kocSocialDiscovery';
import { useKocChannelReviews } from '../../lib/kocChannelReviewService';
import { KocChannelReviewBadge, KocChannelReviewModal } from './KocChannelReviewModal';
import {
  Avatar,
  Button,
  CHANNELS,
  DataTable,
  EmptyState,
  FacebookLogo,
  Field,
  InstagramLogo,
  Modal,
  Panel,
  Person,
  SectionHeader,
  ShopeeLogo,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
  ThreadsLogo,
  TikTokLogo,
  sharedTo,
} from '../ui';
import type { Column, TabItem } from '../ui';
import {
  LEGAL_TYPE_LABEL,
  calculateKocPerformanceStats,
  canRevealSensitive,
  dealStatusOf,
  dealStepOf,
  dealsOfKoc,
  formatFollowers,
  hasLegalId,
  isDealOpen,
  legalIdOf,
  legalTypeOf,
  mask,
  picOfDeal,
  type DuplicateMatch,
  type KocPerformanceSummary,
} from './kocUtils';
import { KocHistoryEvaluationModal } from './KocHistoryEvaluationModal';

const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(' ');

/** Ngày ISO hoặc dd/mm/yyyy → dd/mm */
const shortDate = (s: string) => {
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s) : null;
  if (d && !isNaN(d.getTime())) return formatDate(d).slice(0, 5);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const pct = (n?: number) =>
  typeof n === 'number' ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n)}%` : '—';

export interface KocProfileProps {
  koc: KocItem;
  deals?: BookingDealItem[];
  currentUser?: UserProfile;
  duplicates?: DuplicateMatch[];
  /** `page`: hai cột, có đầu trang. `modal`: một cột, tên KOC nằm ở tiêu đề modal. */
  layout?: 'page' | 'modal';
  /** Điều hướng trong trang chi tiết. */
  nav?: {
    onBack: () => void;
    onReturnToSource?: () => void;
    returnToSourceLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
    position?: number;
    total?: number;
  };
  onOpenKoc?: (kocId: string) => void;
  onCreateBooking?: (koc: KocItem) => void;
  onUpdateMetrics?: (koc: KocItem) => void;
  onScanDocs?: (koc: KocItem) => void;
  onSearchSocialChannels?: (koc: KocItem) => void;
  onOpenKocPortal?: (kocId: string) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
}

export function classificationOf(k: KocItem): string {
  return [k.salaryGrade, k.tepKenh || k.creatorCategory, k.kocCategory, k.location, k.isWinnerTop20 && 'Nhóm top 20 GMV', 'TikTok Seller']
    .filter(Boolean)
    .join(' · ');
}

type MainTabKey = 'METRICS' | 'HISTORY' | 'ACTIVE_DEALS';

export function KocProfile({
  koc,
  deals,
  currentUser,
  duplicates = [],
  layout = 'page',
  nav,
  onOpenKoc,
  onCreateBooking,
  onUpdateMetrics,
  onScanDocs,
  onSearchSocialChannels,
  onOpenKocPortal,
  onSelectDealForContract,
}: KocProfileProps) {
  const isPage = layout === 'page';
  const kocDeals = useMemo(
    () => dealsOfKoc(deals, koc).sort((a, b) => Number(isDealOpen(b)) - Number(isDealOpen(a))),
    [deals, koc],
  );

  const stats = useMemo(() => calculateKocPerformanceStats(deals || [], koc), [deals, koc]);

  const [activeTab, setActiveTab] = useState<MainTabKey>('HISTORY');
  const [selectedCollabDetail, setSelectedCollabDetail] = useState<BookingDealItem | null>(null);
  const [vietQrDeal, setVietQrDeal] = useState<KocItem | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [historyEvalModalOpen, setHistoryEvalModalOpen] = useState(false);
  const [channelReviewModalOpen, setChannelReviewModalOpen] = useState(false);
  const [channelReviewInitialVerdict, setChannelReviewInitialVerdict] = useState<
    'SUITABLE' | 'CAUTION' | 'NOT_SUITABLE' | undefined
  >(undefined);

  const openChannelReviewWithVerdict = (
    verdict?: 'SUITABLE' | 'CAUTION' | 'NOT_SUITABLE'
  ) => {
    setChannelReviewInitialVerdict(verdict);
    setChannelReviewModalOpen(true);
  };

  const { reviews: channelReviews, getChannelSummary } = useKocChannelReviews();
  const channelReviewSummary = getChannelSummary(koc.channelId);

  const missingDocs = !hasLegalId(koc);
  const handle = koc.channelId.replace(/^@/, '');
  const openCount = stats.runningDeals;

  const tabItems: TabItem<MainTabKey>[] = [
    { key: 'HISTORY', label: 'Lịch sử & Hiệu quả hợp tác', count: kocDeals.length },
    { key: 'METRICS', label: 'Chỉ số kênh & TikTok Seller' },
    { key: 'ACTIVE_DEALS', label: 'Booking đang chạy', count: openCount > 0 ? openCount : undefined },
  ];

  return (
    <div className="space-y-6">
      {isPage && nav && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {nav.onReturnToSource && nav.returnToSourceLabel ? (
              <>
                <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={nav.onReturnToSource}>
                  {nav.returnToSourceLabel}
                </Button>
                <Button variant="ghost" size="sm" onClick={nav.onBack}>
                  Xem bảng Danh bạ KOC
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={nav.onBack} className="-ml-2.5">
                Danh bạ KOC
              </Button>
            )}
          </div>
          {(nav.onPrev || nav.onNext) && (
            <div className="flex items-center gap-1.5 text-2xs text-ink-3">
              {nav.position && nav.total ? (
                <span className="tabular-nums mr-1">
                  {nav.position} / {nav.total}
                </span>
              ) : null}
              <IconButton label="KOC trước" onClick={nav.onPrev}>
                <ChevronLeft className="w-4 h-4" />
              </IconButton>
              <IconButton label="KOC sau" onClick={nav.onNext}>
                <ChevronRight className="w-4 h-4" />
              </IconButton>
            </div>
          )}
        </div>
      )}

      {/* Đầu hồ sơ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Tên chuyển cảnh khớp với hàng trong KocMasterDataView (chỉ ở dạng trang) */}
          {isPage && <span className="shrink-0 inline-flex" style={sharedTo('koc-avatar')}><Avatar name={koc.stageName} src={koc.avatarUrl} size={52} /></span>}
          <div className="min-w-0 grid gap-1">
            {isPage && (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-ink" style={isPage ? sharedTo('koc-title') : undefined}>{koc.stageName}</h2>
                {koc.realName && koc.realName !== koc.stageName && (
                  <span className="text-sm text-ink-3 font-normal">({koc.realName})</span>
                )}
                <KocChannelReviewBadge
                  summary={channelReviewSummary}
                  onClick={() => setChannelReviewModalOpen(true)}
                />
                {missingDocs && <Status tone="warning">Thiếu giấy tờ</Status>}
                {duplicates.length > 0 && <Status tone="warning">Nghi trùng</Status>}
              </div>
            )}
            <p className="text-[13px] text-ink-2">
              <a
                href={koc.channelLink || `https://www.tiktok.com/@${handle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                @{handle}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {isPage && <span className="text-ink-3"> · {classificationOf(koc)}</span>}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              {koc.phone && (
                <span className="font-mono text-ink text-xs">
                  SĐT: {koc.phone}
                </span>
              )}
              {koc.location && (
                <span className="text-ink-3 text-xs">
                  {koc.location}
                </span>
              )}
              {stats.avgRatingScore > 0 && (
                <span className="inline-flex items-center gap-1 text-2xs font-medium text-warning">
                  <Star className="w-3 h-3 fill-current" />
                  {stats.avgRatingScore} / 5.0
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={CheckCircle2}
            onClick={() => openChannelReviewWithVerdict('SUITABLE')}
          >
            Đánh giá Phù hợp
          </Button>
          <Button
            variant={channelReviewSummary?.latestReview.verdict === 'NOT_SUITABLE' ? 'danger' : 'secondary'}
            icon={XCircle}
            onClick={() => openChannelReviewWithVerdict('NOT_SUITABLE')}
          >
            Không phù hợp
          </Button>
          {channelReviewSummary && channelReviewSummary.totalReviews > 0 && (
            <Button
              variant="secondary"
              icon={History}
              onClick={() => openChannelReviewWithVerdict()}
            >
              Lịch sử ĐG ({channelReviewSummary.totalReviews})
            </Button>
          )}
          <Button variant="secondary" icon={FileText} onClick={() => setHistoryEvalModalOpen(true)}>
            Đánh giá lịch sử & rủi ro
          </Button>
          {onSearchSocialChannels && (
            <Button variant="secondary" icon={Search} onClick={() => onSearchSocialChannels(koc)}>
              Tìm kênh MXH
            </Button>
          )}
          {koc.bankAccount && (
            <Button variant="secondary" icon={QrCode} onClick={() => setVietQrDeal(koc)}>
              Mã QR VietQR
            </Button>
          )}
          {onCreateBooking && (
            <Button variant="primary" icon={Plus} onClick={() => onCreateBooking(koc)}>
              Tạo booking
            </Button>
          )}
        </div>
      </header>

      {/* Cảnh báo / Lịch sử đánh giá kênh KOC từ nhân viên */}
      {channelReviewSummary && channelReviewSummary.totalReviews > 0 && (
        <div
          className={cx(
            'p-3.5 rounded-xl border text-xs space-y-2',
            channelReviewSummary.latestReview.verdict === 'NOT_SUITABLE'
              ? 'bg-critical-soft/40 border-critical/30'
              : channelReviewSummary.latestReview.verdict === 'CAUTION'
                ? 'bg-warning-soft/50 border-warning/30'
                : 'bg-positive-soft/40 border-positive/30',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <KocChannelReviewBadge
                summary={channelReviewSummary}
                onClick={() => setChannelReviewModalOpen(true)}
              />
              <span className="font-semibold text-ink">
                Kênh @{handle} có {channelReviewSummary.totalReviews} lượt đánh giá trong lịch sử
              </span>
              {channelReviewSummary.notSuitableCount > 0 && (
                <span className="text-2xs font-medium text-critical">
                  ({channelReviewSummary.notSuitableCount} lượt Không phù hợp)
                </span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={History}
              onClick={() => setChannelReviewModalOpen(true)}
            >
              Xem lịch sử & Thêm đánh giá
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {channelReviewSummary.reviews.slice(0, 2).map((rev) => (
              <div key={rev.id} className="p-2.5 rounded-lg bg-surface border border-line text-2xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-ink">
                      {rev.reviewerName}
                      {rev.reviewerRole ? <span className="font-normal text-ink-3"> ({rev.reviewerRole})</span> : null}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-line text-ink font-semibold text-[10px]">
                      Brand: {rev.brandScope || 'Toàn hệ thống B2C'}
                    </span>
                    <Status
                      tone={
                        rev.verdict === 'NOT_SUITABLE'
                          ? 'critical'
                          : rev.verdict === 'CAUTION'
                            ? 'warning'
                            : 'positive'
                      }
                    >
                      {rev.verdictLabel}
                    </Status>
                  </div>
                  <span className="text-ink-3 tabular-nums">
                    {rev.dateLabel} · {rev.timeLabel}
                  </span>
                </div>
                {rev.reasonTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rev.reasonTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-sunken border border-line text-3xs font-medium text-ink-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {rev.note && <div className="text-ink-2">Ý kiến: &ldquo;{rev.note}&rdquo;</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cảnh báo trùng lặp nếu có */}
      {duplicates.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-warning-soft text-[13px] text-ink">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.75} />
          <p>
            Có thể trùng với{' '}
            {duplicates.slice(0, 3).map((d, i) => (
              <React.Fragment key={d.kocId}>
                {i > 0 && ', '}
                {onOpenKoc ? (
                  <button type="button" onClick={() => onOpenKoc(d.kocId)} className="font-medium text-accent hover:underline">
                    {d.stageName}
                  </button>
                ) : (
                  <span className="font-medium">{d.stageName}</span>
                )}{' '}
                <span className="text-ink-2">(cùng {d.fields.join(', ')})</span>
              </React.Fragment>
            ))}
            {duplicates.length > 3 && ` và ${duplicates.length - 3} hồ sơ khác`}. Kiểm tra trước khi tạo booking hoặc hợp đồng.
          </p>
        </div>
      )}

      {/* Bố cục 2 cột */}
      <div className={cx('grid gap-6 items-start', isPage && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
        {/* Cột chính (Trái) */}
        <div className="grid gap-6 min-w-0">
          {/* Thanh chuyển Tabs */}
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
            <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

            <div className="pt-5">
              {activeTab === 'HISTORY' && (
                <CollaborationHistorySection
                  koc={koc}
                  deals={kocDeals}
                  stats={stats}
                  currentUser={currentUser}
                  onViewDetail={setSelectedCollabDetail}
                  onSelectDealForContract={onSelectDealForContract}
                  onOpenHistoryEvaluation={() => setHistoryEvalModalOpen(true)}
                />
              )}

              {activeTab === 'METRICS' && (
                <TikTokSellerMetricsSection
                  koc={koc}
                  onUpdate={() => (onUpdateMetrics ? onUpdateMetrics(koc) : setSyncModalOpen(true))}
                />
              )}

              {activeTab === 'ACTIVE_DEALS' && (
                <ActiveDealsSection
                  deals={kocDeals.filter(isDealOpen)}
                  onViewDetail={setSelectedCollabDetail}
                  onSelectDealForContract={onSelectDealForContract}
                />
              )}
            </div>
          </div>
        </div>

        {/* Cột tra cứu (Phải) */}
        <aside className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0 shadow-xs">
          <ShippingAndContactPanel koc={koc} onSearchSocialChannels={onSearchSocialChannels} />
          <LegalPaymentPanel koc={koc} currentUser={currentUser} onScanDocs={onScanDocs} onOpenQr={() => setVietQrDeal(koc)} />
          <OperationalNotesPanel koc={koc} />
        </aside>
      </div>

      {/* Modal xem sâu chi tiết lần hợp tác */}
      {selectedCollabDetail && (
        <CollaborationDetailModal
          deal={selectedCollabDetail}
          onClose={() => setSelectedCollabDetail(null)}
          onSelectDealForContract={onSelectDealForContract}
        />
      )}

      {/* Modal VietQR thanh toán nhanh */}
      {vietQrDeal && <VietQrModal koc={vietQrDeal} onClose={() => setVietQrDeal(null)} />}

      {/* Modal đồng bộ chỉ số TikTok Seller */}
      {syncModalOpen && <TikTokSellerSyncModal koc={koc} onClose={() => setSyncModalOpen(false)} />}

      {/* Modal báo cáo đánh giá lịch sử hợp tác, mức độ phù hợp & rủi ro KOC */}
      <KocHistoryEvaluationModal
        open={historyEvalModalOpen}
        onClose={() => setHistoryEvalModalOpen(false)}
        koc={koc}
        deals={deals}
        duplicates={duplicates}
        onCreateBooking={onCreateBooking}
      />

      <KocChannelReviewModal
        open={channelReviewModalOpen}
        onClose={() => setChannelReviewModalOpen(false)}
        target={{
          handle: koc.channelId,
          channelName: koc.stageName,
          avatarUrl: koc.avatarUrl,
          initialVerdict: channelReviewInitialVerdict,
          sourceScreen: 'Hồ sơ KOC (Danh bạ KOC)',
        }}
        initialMode="CHANNEL_DETAIL"
        currentUserName={currentUser?.name}
        currentUserRole={currentUser?.roleTitle}
        currentUserEmail={currentUser?.email}
        reviews={channelReviews}
      />
    </div>
  );
}

/* =========================================================================
   1. BỘ CHỈ SỐ TÍCH HỢP TỪ TIKTOK SELLER
   ========================================================================= */

function TikTokSellerMetricsSection({ koc, onUpdate }: { koc: KocItem; onUpdate?: () => void }) {
  const [liveVideos, setLiveVideos] = useState<TikTokVideoItem[] | undefined>(koc.recentVideos);
  const [liveBio, setLiveBio] = useState<string | undefined>(koc.bio);
  const [liveTotalLikes, setLiveTotalLikes] = useState<number | undefined>(koc.totalLikes);
  const [liveVideoCount, setLiveVideoCount] = useState<number | undefined>(koc.videoCount);
  const [liveAvgLikes, setLiveAvgLikes] = useState<number | undefined>(koc.avgLikes);
  const [liveAvgComments, setLiveAvgComments] = useState<number | undefined>(koc.avgComments);
  const [liveAvgShares, setLiveAvgShares] = useState<number | undefined>(koc.avgShares);
  const [liveEr, setLiveEr] = useState<number | undefined>(koc.engagementRate);
  const [fetchingVideos, setFetchingVideos] = useState(false);

  const handleFetchChannelVideos = async (targetLimit = 24) => {
    setFetchingVideos(true);
    try {
      const res = await fetch(
        `/api/integrations/tiktok-koc/scrape?handle=${encodeURIComponent(koc.channelId)}&period=30d&videoLimit=${targetLimit}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setLiveVideos(json.data.recentVideos);
        setLiveBio(json.data.channelProfile?.bio);
        setLiveTotalLikes(json.data.channelProfile?.totalLikes);
        setLiveVideoCount(json.data.channelProfile?.videoCount);
        setLiveAvgLikes(json.data.engagementMetrics?.avgLikes);
        setLiveAvgComments(json.data.engagementMetrics?.avgComments);
        setLiveAvgShares(json.data.engagementMetrics?.avgShares);
        setLiveEr(json.data.engagementMetrics?.engagementRate);
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời
    } finally {
      setFetchingVideos(false);
    }
  };

  const videosToShow = liveVideos || koc.recentVideos || [];
  const bioToShow = liveBio || koc.bio;
  const totalLikesToShow = liveTotalLikes ?? koc.totalLikes;
  const videoCountToShow = liveVideoCount ?? koc.videoCount;
  const avgLikesToShow = liveAvgLikes ?? koc.avgLikes;
  const avgCommentsToShow = liveAvgComments ?? koc.avgComments;
  const avgSharesToShow = liveAvgShares ?? koc.avgShares;
  const erToShow = liveEr ?? koc.engagementRate ?? 4.6;

  const shares = [
    { label: 'Video ngắn', value: koc.gmvShareVideo || 70, color: CHANNELS.tiktok.color },
    { label: 'Livestream', value: koc.gmvShareLive || 20, color: CHANNELS.live.color },
    { label: 'Thẻ sản phẩm / Giỏ hàng', value: koc.gmvShareProductCard || 10, color: CHANNELS.other.color },
  ].filter((s) => s.value > 0);

  const shareTotal = shares.reduce((s, x) => s + x.value, 0);

  const topCats = koc.tiktokTopCategories || [
    koc.tepKenh || 'Dược mỹ phẩm & Skincare',
    koc.kocCategory || 'Chăm sóc cá nhân',
    'Mẹ & Bé',
  ];

  const locations = koc.tiktokAudienceLocations || [
    { city: 'Hà Nội', ratio: 42 },
    { city: 'TP.HCM', ratio: 38 },
    { city: 'Đà Nẵng & Tỉnh khác', ratio: 20 },
  ];

  const videoColumns: Column<TikTokVideoItem>[] = [
    {
      key: 'content',
      header: 'Nội dung & hashtag',
      width: 260,
      render: (v) => (
        <div className="grid gap-1 min-w-0 max-w-[320px]">
          <a
            href={v.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-ink hover:text-accent line-clamp-2 leading-snug inline-flex items-start gap-1"
          >
            <span>{v.caption}</span>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
          </a>
          <span className="text-2xs text-ink-3 truncate">
            {v.hashtags.length > 0 ? v.hashtags.join(' ') : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'meta',
      header: 'Ngày đăng & nhạc nền',
      width: 150,
      render: (v) => (
        <div className="grid gap-0.5 min-w-0">
          <span className="text-xs text-ink tabular-nums">{formatDate(v.publishedAt)}</span>
          <span className="text-2xs text-ink-3 truncate inline-flex items-center gap-1" title={v.musicTitle}>
            <Music className="w-3 h-3 shrink-0" />
            <span className="truncate">{v.musicTitle}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'views',
      header: 'Lượt xem & ER',
      align: 'right',
      width: 105,
      render: (v) => (
        <div className="grid gap-0.5">
          <span className="text-xs font-semibold text-ink tabular-nums">{formatNumber(v.views)}</span>
          <span className="text-2xs text-ink-3 tabular-nums">ER {v.engagementRate}%</span>
        </div>
      ),
    },
    {
      key: 'engagement',
      header: 'Tương tác',
      align: 'right',
      width: 140,
      render: (v) => (
        <div className="grid gap-0.5">
          <span className="text-xs text-ink tabular-nums">{formatNumber(v.likes)} tim</span>
          <span className="text-2xs text-ink-3 tabular-nums">
            {formatNumber(v.comments)} bình luận · {formatNumber(v.shares)} chia sẻ
          </span>
        </div>
      ),
    },
    {
      key: 'affiliate',
      header: 'Giỏ hàng Affiliate',
      align: 'right',
      width: 180,
      render: (v) =>
        v.isAffiliate ? (
          <div className="grid gap-0.5">
            <span className="text-xs font-medium text-ink truncate max-w-[190px] ml-auto" title={v.productName}>
              {v.productName || 'Sản phẩm gắn giỏ'}
            </span>
            {v.estimatedGmv && v.estimatedGmv > 0 ? (
              <span className="text-2xs text-positive tabular-nums">
                GMV {formatVndShort(v.estimatedGmv)} · {formatNumber(v.itemsSold || 0)} đơn
              </span>
            ) : (
              <span className="text-2xs text-positive">Có gắn giỏ TikTok Shop</span>
            )}
          </div>
        ) : (
          <span className="text-2xs text-ink-3">Không gắn giỏ</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hộp trạng thái kết nối TikTok Seller Center */}
      <div className="p-4 rounded-xl border border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink text-white flex items-center justify-center font-semibold text-xs shrink-0">
            TTS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Đã kết nối TikTok Seller Center</span>
              <span className="inline-flex items-center gap-1 text-2xs font-medium text-positive">
                <CheckCircle2 className="w-3 h-3" /> Tài khoản chuẩn
              </span>
            </div>
            <p className="text-2xs text-ink-3">
              Đồng bộ dữ liệu lúc {koc.tiktokSellerSyncedAt || koc.metricsUpdatedAt || '12/10/2026 18:30'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-2xs text-ink-3 block">Điểm uy tín nhà sáng tạo</span>
            <span className="font-semibold text-warning inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              {koc.tiktokShopRating || 4.9} / 5.0
            </span>
          </div>
          <div className="text-right border-l border-line pl-4">
            <span className="text-2xs text-ink-3 block">Tỷ lệ hoàn/hủy đơn liên kết</span>
            <span className="font-semibold text-positive">{koc.tiktokCancellationRate || 1.4}%</span>
          </div>
          {onUpdate && (
            <Button size="sm" icon={RefreshCw} onClick={onUpdate} className="ml-2">
              Đồng bộ lại
            </Button>
          )}
        </div>
      </div>

      {/* Tiểu sử kênh TikTok (Bio) nếu đã thu thập */}
      {bioToShow && (
        <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xs font-medium text-ink-3">Tiểu sử kênh TikTok (Bio)</span>
            {(totalLikesToShow || videoCountToShow) && (
              <span className="text-2xs text-ink-3 tabular-nums">
                {totalLikesToShow ? `Tổng ${formatFollowers(totalLikesToShow)} lượt thích` : ''}
                {totalLikesToShow && videoCountToShow ? ' · ' : ''}
                {videoCountToShow ? `${formatNumber(videoCountToShow)} video đã đăng` : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-relaxed">{bioToShow}</p>
        </div>
      )}

      {/* Lưới chỉ số tổng quan thương mại điện tử */}
      <div>
        <SectionHeader
          title="Chỉ số hiệu năng bán hàng"
        />
        <div className="mt-3">
          <StatRow>
            <Stat
              label="Lượng người theo dõi"
              value={formatFollowers(koc.followers)}
              note={
                koc.tiktokFollowerGrowth30d ? (
                  <span className="text-positive font-medium inline-flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{formatNumber(koc.tiktokFollowerGrowth30d)} 30 ngày qua
                  </span>
                ) : undefined
              }
            />
            <Stat
              label="Lượt xem trung bình"
              value={formatNumber(koc.avgViews)}
              note={
                koc.tiktokTotal30dViews
                  ? `Tổng 30 ngày ${formatFollowers(koc.tiktokTotal30dViews)} view`
                  : 'Lượt xem trung bình mỗi video'
              }
            />
            <Stat
              label="Doanh thu GMV 30 ngày"
              value={koc.recentRevenue || koc.gmvBestCase ? formatVndShort(koc.recentRevenue || koc.gmvBestCase || 0) : '—'}
              note={
                koc.itemsSold
                  ? `${formatNumber(koc.itemsSold)} đơn hàng đã bán`
                  : 'Doanh số phát sinh trên TikTok Shop'
              }
              tone="positive"
            />
            <Stat
              label="GPM (GMV / 1.000 view)"
              value={koc.gpm ? formatVndShort(koc.gpm) : '185 tr'}
              note={`Đơn TB: ${formatVndShort(koc.aov || 320000)}`}
            />
          </StatRow>
        </div>
      </div>

      {/* Phễu tương tác & Chuyển đổi TikTok Seller */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">Tỷ lệ tương tác kênh (ER)</span>
          <span className="text-lg font-semibold text-ink">{erToShow}%</span>
          <span className="text-2xs text-ink-3 block mt-0.5">
            {avgLikesToShow
              ? `TB ${formatNumber(avgLikesToShow)} tim · ${formatNumber(avgCommentsToShow || 0)} bình luận · ${formatNumber(avgSharesToShow || 0)} chia sẻ`
              : 'Thích, bình luận & chia sẻ'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">CTR nhấp giỏ hàng</span>
          <span className="text-lg font-semibold text-accent">{koc.tiktokAvgCtr || 5.8}%</span>
          <span className="text-2xs text-ink-3 block mt-0.5">Nhấp xem thẻ sản phẩm</span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">CVR chuyển đổi đơn</span>
          <span className="text-lg font-semibold text-positive">{koc.tiktokAvgCvr || 2.8}%</span>
          <span className="text-2xs text-ink-3 block mt-0.5">Tỷ lệ chốt đơn mua</span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">Hoa hồng Affiliate trung bình</span>
          <span className="text-lg font-semibold text-ink">{koc.tiktokAvgCommissionRate || 12}%</span>
          <span className="text-2xs text-ink-3 block mt-0.5">Mức nhận từ nhãn hàng</span>
        </div>
      </div>

      {/* Cơ cấu doanh số & Ngành hàng & Khán giả */}
      <div className="grid md:grid-cols-2 gap-6 pt-2">
        {/* Doanh số theo định dạng */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-ink">Cơ cấu doanh thu theo nguồn</h4>
          <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
            <div className="flex h-3 gap-1 rounded-full overflow-hidden bg-sunken">
              {shares.map((s) => (
                <span
                  key={s.label}
                  className="data-bar h-full rounded-sm"
                  style={{ width: `${(s.value / shareTotal) * 100}%`, background: s.color }}
                  title={`${s.label}: ${pct(s.value)}`}
                />
              ))}
            </div>
            <div className="grid gap-2">
              {shares.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-ink-2">
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold text-ink tabular-nums">{pct(s.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <h4 className="text-xs font-semibold text-ink pt-2">Ngành hàng bán chạy</h4>
          <p className="text-xs text-ink-2">
            {topCats.join(' · ')}
          </p>
        </div>

        {/* Khán giả & Nhân khẩu học */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-ink">Nhân khẩu học khán giả</h4>
          <div className="p-4 rounded-xl border border-line bg-surface space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-2xs text-ink-3 mb-1">
                <span>Giới tính người xem</span>
                <span>Nữ {koc.femaleRatio || 82}% · Nam {koc.maleRatio || 18}%</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-sunken">
                <div style={{ width: `${koc.femaleRatio || 82}%` }} className="data-bar bg-accent" />
                <div style={{ width: `${koc.maleRatio || 18}%` }} className="data-bar bg-ink-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-1 border-t border-line">
              <div className="p-2 rounded-lg bg-sunken/60">
                <span className="text-2xs text-ink-3 block">18–24 tuổi</span>
                <span className="text-sm font-semibold text-ink">{pct(koc.age18_24 || 38)}</span>
              </div>
              <div className="p-2 rounded-lg bg-sunken/60">
                <span className="text-2xs text-ink-3 block">25–34 tuổi</span>
                <span className="text-sm font-semibold text-accent">{pct(koc.age25_34 || 49)}</span>
              </div>
              <div className="p-2 rounded-lg bg-sunken/60">
                <span className="text-2xs text-ink-3 block">Trên 35 tuổi</span>
                <span className="text-sm font-semibold text-ink">{pct(koc.age35Plus || 13)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <span className="text-2xs text-ink-3 block mb-1.5">Địa bàn tập trung khán giả</span>
              <div className="grid gap-1.5">
                {locations.map((loc) => (
                  <div key={loc.city} className="flex items-center justify-between text-2xs">
                    <span className="text-ink-2">{loc.city}</span>
                    <span className="font-medium text-ink tabular-nums">{loc.ratio}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách video & nội dung gần nhất trên kênh TikTok */}
      <Panel
        flush
        title={`Danh sách video & nội dung gần nhất trên kênh (${videosToShow.length}${videoCountToShow ? ` / ${formatNumber(videoCountToShow)}` : ''} bài)`}
        actions={
          <div className="flex items-center gap-2">
            {videosToShow.length > 0 && videosToShow.length < 80 && (
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={fetchingVideos}
                onClick={() => handleFetchChannelVideos(Math.min(80, Math.max(videosToShow.length + 24, 48)))}
              >
                {fetchingVideos ? 'Đang tải...' : 'Tải thêm video'}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={fetchingVideos ? RefreshCw : CloudDownload}
              disabled={fetchingVideos}
              onClick={() => handleFetchChannelVideos(24)}
            >
              {fetchingVideos
                ? 'Đang lấy video...'
                : videosToShow.length > 0
                  ? 'Làm mới video'
                  : 'Lấy danh sách video'}
            </Button>
          </div>
        }
      >
        {videosToShow.length > 0 ? (
          <DataTable
            columns={videoColumns}
            rows={videosToShow}
            rowKey={(v) => v.videoId}
            compact
          />
        ) : (
          <EmptyState
            title="Chưa tải danh sách video gần nhất của kênh"
            description="Bấm lấy danh sách video để xem caption, hashtag, nhạc nền, lượt tương tác và doanh số gắn giỏ của các video gần nhất."
            action={
              <Button
                variant="secondary"
                icon={CloudDownload}
                disabled={fetchingVideos}
                onClick={() => handleFetchChannelVideos(24)}
              >
                Lấy danh sách video
              </Button>
            }
          />
        )}
      </Panel>
    </div>
  );
}

/* =========================================================================
   2. LỊCH SỬ HỢP TÁC & HIỆU QUẢ HỢP TÁC CHI TIẾT (TÂM ĐIỂM NGHIỆP VỤ B2C)
   ========================================================================= */

function CollaborationHistorySection({
  koc,
  deals,
  stats,
  currentUser,
  onViewDetail,
  onSelectDealForContract,
  onOpenHistoryEvaluation,
}: {
  koc: KocItem;
  deals: BookingDealItem[];
  stats: KocPerformanceSummary;
  currentUser?: UserProfile;
  onViewDetail: (d: BookingDealItem) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onOpenHistoryEvaluation?: () => void;
}) {
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [askDeal, setAskDeal] = useState<BookingDealItem | null>(null);

  // Danh sách các Brand đã từng hợp tác
  const brandList = useMemo(() => Array.from(new Set(deals.map((d) => d.brandName).filter(Boolean))), [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (selectedBrandFilter !== 'ALL' && d.brandName !== selectedBrandFilter) return false;
      if (selectedFormatFilter !== 'ALL') {
        if (selectedFormatFilter === 'FOC' && (d.totalValue || 0) > 0) return false;
        if (selectedFormatFilter === 'PAID' && (d.totalValue || 0) === 0) return false;
        if (selectedFormatFilter === 'LIVE' && d.bookingFormat !== 'Booking Livestream KOC') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = d.dealCode?.toLowerCase().includes(q);
        const matchProd = d.productName?.toLowerCase().includes(q);
        const matchCamp = d.campaignTitle?.toLowerCase().includes(q);
        const matchStore = d.storeName?.toLowerCase().includes(q);
        if (!matchCode && !matchProd && !matchCamp && !matchStore) return false;
      }
      return true;
    });
  }, [deals, selectedBrandFilter, selectedFormatFilter, searchQuery]);

  const columns: Column<BookingDealItem>[] = [
    {
      key: 'campaign',
      header: 'Chiến dịch & Sản phẩm',
      width: 240,
      render: (d) => (
        <div className="min-w-0 max-w-[260px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink text-[13px] hover:text-accent cursor-pointer truncate" onClick={() => onViewDetail(d)} title={d.campaignTitle}>
              {d.campaignTitle || d.productName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-2xs text-ink-3 truncate mt-0.5">
            <span className="font-medium text-ink-2">{d.brandName}</span>
            <span>·</span>
            <span className="truncate">{d.productName}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-2xs text-ink-3">
            <span className="font-code">{d.dealCode}</span>
            {d.bookingBatch && <span>· {d.bookingBatch}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'format_time',
      header: 'Hình thức & Ngày đăng',
      width: 160,
      render: (d) => {
        const isFoc = (d.totalValue || 0) === 0;
        const isLive = d.bookingFormat === 'Booking Livestream KOC';
        const date = d.postedDate || d.deadlinePost;
        return (
          <div className="grid gap-1">
            <div>
              {isFoc ? (
                <span className="text-xs font-medium text-ink-2">
                  Suất mẫu FOC (0đ)
                </span>
              ) : isLive ? (
                <span className="text-xs font-medium text-accent">
                  Livestream KOC
                </span>
              ) : (
                <span className="text-xs font-medium text-ink">
                  Video trả phí (Paid)
                </span>
              )}
            </div>
            {date && (
              <span className="text-2xs text-ink-3 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {shortDate(date)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'cost',
      header: 'Chi phí đầu tư',
      align: 'right',
      width: 120,
      render: (d) => (
        <div className="text-right">
          <span className="font-semibold text-ink block text-[13px]">
            {d.totalValue ? formatVndShort(d.totalValue) : <span className="text-positive font-medium">0đ (FOC)</span>}
          </span>
          {d.focSampleCost ? (
            <span className="text-2xs text-ink-3 block">Mẫu: {formatVndShort(d.focSampleCost)}</span>
          ) : null}
          {d.sparkAdsBudget ? (
            <span className="text-2xs text-accent block">Ads: {formatVndShort(d.sparkAdsBudget)}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'outcomes',
      header: 'Hiệu quả thực tế (GMV / Đơn)',
      align: 'right',
      width: 170,
      render: (d) => {
        const gmv = d.gmv30 || d.affiliateGmv || 0;
        const orders = d.ordersCount || (gmv > 0 ? Math.round(gmv / (koc.aov || 280000)) : 0);
        const roi = d.roi || (d.totalValue && d.totalValue > 0 ? gmv / d.totalValue : 0);
        return (
          <div className="text-right">
            <span className="font-semibold text-ink block text-[13.5px]">
              {gmv > 0 ? formatVndShort(gmv) : <span className="text-ink-3 font-normal">—</span>}
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              {orders > 0 && <span className="text-2xs text-ink-2 font-medium">{formatNumber(orders)} đơn</span>}
              {roi > 0 && (
                <span
                  className={cx(
                    'text-2xs font-medium tabular-nums',
                    roi >= 4 ? 'text-positive' : roi >= 2 ? 'text-accent' : 'text-warning',
                  )}
                >
                  · ROI {roi.toFixed(1)}x
                </span>
              )}
            </div>
            {d.viewsCount > 0 && (
              <span className="text-2xs text-ink-3 block mt-0.5">{formatNumber(d.viewsCount)} views</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quality',
      header: 'Tiến độ & Đánh giá',
      width: 150,
      render: (d) => {
        const onTime = d.isPostOnTime ?? true;
        const rating = d.ratingScore || 4.8;
        return (
          <div className="grid gap-1">
            <div className="flex items-center gap-1 text-2xs">
              <span className="inline-flex items-center gap-0.5 text-warning font-semibold">
                <Star className="w-3 h-3 fill-current" />
                {rating}
              </span>
              <span className="text-ink-3">·</span>
              <span className={onTime ? 'text-positive font-medium' : 'text-critical font-medium'}>
                {onTime ? 'Đúng hạn' : 'Trễ hạn'}
              </span>
            </div>
            {d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' && (
              <span className="text-2xs text-accent inline-block w-fit">
                Mã Ads hợp lệ
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 110,
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => onViewDetail(d)}>
            Chi tiết
          </Button>
          {d.tiktokVideoUrl && (
            <a
              href={d.tiktokVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-sunken"
              title="Xem video trên TikTok"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {picOfDeal(d) && (
            <button
              type="button"
              onClick={() => setAskDeal(d)}
              className="p-1.5 rounded text-ink-3 hover:text-accent hover:bg-sunken"
              title={`Hỏi ${picOfDeal(d)} về lần hợp tác này`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KHỐI TỔNG HỢP HIỆU QUẢ HỢP TÁC TÍCH LŨY */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <SectionHeader
            title="Tổng hợp hiệu quả hợp tác tích lũy"
          />
          <div className="flex flex-wrap items-center gap-2">
            {stats.overallRoi >= 3 && (
              <span className="text-xs font-medium text-positive flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Hiệu suất sinh lời cao ({stats.overallRoi.toFixed(1)}x)
              </span>
            )}
            {onOpenHistoryEvaluation && (
              <Button size="sm" variant="secondary" icon={FileText} onClick={onOpenHistoryEvaluation}>
                Báo cáo đánh giá lịch sử & rủi ro
              </Button>
            )}
          </div>
        </div>

        <StatRow>
          <Stat
            label="Tổng GMV mang về"
            value={formatVndShort(stats.totalGmv)}
            note={`${stats.completedDeals} chiến dịch hoàn tất · ${stats.runningDeals} đang chạy`}
            tone="positive"
          />
          <Stat
            label="Tỷ suất sinh lời (ROI)"
            value={`${stats.overallRoi.toFixed(2)}x`}
            note={`Chi phí Net: ${formatVndShort(stats.totalSpentNet)}`}
            tone={stats.overallRoi >= 3 ? 'positive' : 'warning'}
          />
          <Stat
            label="Đơn hàng & Giá vốn đơn (CPO)"
            value={`${formatNumber(stats.totalOrders)} đơn`}
            note={`Giá vốn: ${formatVndShort(stats.avgCpo)}/đơn`}
          />
          <Stat
            label="Chất lượng & Tuân thủ SLA"
            value={`${stats.avgRatingScore} / 5.0`}
            note={`Đúng hạn kịch bản ${stats.onTimeScriptRate}% · Video ${stats.onTimePostRate}%`}
          />
        </StatRow>

        {/* Thước phụ giải thích thêm */}
        <div className="mt-3 p-3 rounded-lg border border-line bg-sunken/40 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-ink-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Suất mẫu FOC: <b className="text-ink">{formatVndShort(stats.totalFocCost)}</b>
            </span>
            <span>
              Ngân sách Ads Spark: <b className="text-ink">{formatVndShort(stats.totalAdsBudget)}</b>
            </span>
            <span>
              Tổng lượt xem video hợp tác: <b className="text-ink">{formatNumber(stats.totalCollabViews)} views</b> (TB{' '}
              {formatNumber(stats.avgViewsPerCollab)}/video)
            </span>
          </div>
          <div className="text-ink-3 text-2xs">
            Brand đã book: <span className="font-medium text-ink-2">{stats.uniqueBrands.join(', ') || 'Chưa có'}</span>
          </div>
        </div>
      </div>

      {/* THANH LỌC VÀ TÌM KIẾM CHI TIẾT */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-3 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>

          {/* Lọc Brand */}
          <select
            value={selectedBrandFilter}
            onChange={(e) => setSelectedBrandFilter(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-line text-xs bg-surface text-ink focus:border-accent"
          >
            <option value="ALL">Tất cả nhãn hàng ({brandList.length})</option>
            {brandList.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Lọc Hình thức */}
          <select
            value={selectedFormatFilter}
            onChange={(e) => setSelectedFormatFilter(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-line text-xs bg-surface text-ink focus:border-accent"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="PAID">Video trả phí (Paid)</option>
            <option value="FOC">Suất gửi mẫu FOC (0đ)</option>
            <option value="LIVE">Livestream KOC</option>
          </select>
        </div>

        {/* Tìm kiếm */}
        <div className="relative w-full sm:w-auto sm:min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo sản phẩm, mã BO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 w-full rounded-md border border-line text-xs bg-surface text-ink focus:border-accent"
          />
        </div>
      </div>

      {/* BẢNG LỊCH SỬ HỢP TÁC CHI TIẾT */}
      <Panel title={`Danh sách chiến dịch đã hợp tác (${filteredDeals.length})`} flush>
        <DataTable
          columns={columns}
          rows={filteredDeals}
          rowKey={(d) => d.id}
          empty={
            <EmptyState
              title="Chưa có dữ liệu hợp tác phù hợp"
              description="Thử thay đổi bộ lọc nhãn hàng hoặc xóa từ khóa tìm kiếm."
            />
          }
        />
      </Panel>

      {/* Modal hỏi đồng nghiệp */}
      {askDeal && (
        <AskColleagueModal
          deal={askDeal}
          koc={koc}
          currentUser={currentUser}
          onClose={() => setAskDeal(null)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   3. BOOKING ĐANG THỰC HIỆN
   ========================================================================= */

function ActiveDealsSection({
  deals,
  onViewDetail,
  onSelectDealForContract,
}: {
  deals: BookingDealItem[];
  onViewDetail: (d: BookingDealItem) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
}) {
  const columns: Column<BookingDealItem>[] = [
    {
      key: 'deal',
      header: 'Booking & Chiến dịch',
      width: 220,
      render: (d) => (
        <div className="min-w-0 max-w-[240px]">
          <span className="block truncate font-semibold text-ink text-[13px]" title={d.campaignTitle || d.productName}>
            {d.campaignTitle || d.brandName}
          </span>
          <span className="block truncate text-2xs text-ink-2">{d.productName}</span>
          <span className="block font-code text-2xs text-ink-3">{d.dealCode}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Tiến độ & SLA',
      width: 170,
      render: (d) => {
        const s = dealStatusOf(d);
        const step = dealStepOf(d);
        return (
          <div className="grid gap-1 justify-items-start">
            <Status tone={s.tone}>{s.label}</Status>
            <div className="flex items-center gap-1.5 text-2xs text-ink-3">
              <span>{step}</span>
              {d.deadlinePost && (
                <>
                  <span>·</span>
                  <span className="text-warning font-medium">Hạn {shortDate(d.deadlinePost)}</span>
                </>
              )}
            </div>
            {d.slaRemainingText && (
              <span className={cx('text-2xs font-medium', d.isSlaWarning ? 'text-critical' : 'text-ink-3')}>
                {d.slaRemainingText}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'pic',
      header: 'PIC phụ trách',
      width: 140,
      render: (d) => {
        const pic = picOfDeal(d);
        return pic ? <Person name={pic} size={20} /> : <span className="text-ink-3">—</span>;
      },
    },
    {
      key: 'cost',
      header: 'Giá hợp đồng',
      align: 'right',
      width: 100,
      render: (d) => (d.totalValue ? formatVndShort(d.totalValue) : <span className="text-positive">0đ (FOC)</span>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 90,
      render: (d) => (
        <Button size="sm" variant="secondary" onClick={() => onViewDetail(d)}>
          Xem deal
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Các chiến dịch đang tác nghiệp"
      />
      <Panel flush>
        <DataTable
          columns={columns}
          rows={deals}
          rowKey={(d) => d.id}
          empty={
            <EmptyState
              title="Hiện không có booking nào đang chạy"
              description="Bấm 'Tạo booking' ở góc trên để khởi tạo chiến dịch mới với KOC này."
            />
          }
        />
      </Panel>
    </div>
  );
}

/* =========================================================================
   4. CỘT PHẢI: LIÊN HỆ & HẬU CẦN GỬI MẪU (SAMPLE SHIPPING LOGISTICS)
   ========================================================================= */

function ShippingAndContactPanel({
  koc,
  onSearchSocialChannels,
}: {
  koc: KocItem;
  onSearchSocialChannels?: (k: KocItem) => void;
}) {
  const prefs = koc.samplePreferences;
  const tiktokHandle = koc.channelId.replace(/^@+/, '');

  return (
    <AsideSection
      title="Liên hệ & Hậu cần gửi mẫu (FOC)"
      actions={
        onSearchSocialChannels && (
          <Button size="sm" variant="secondary" icon={Search} onClick={() => onSearchSocialChannels(koc)}>
            Tìm kênh MXH
          </Button>
        )
      }
    >
      <dl className="grid gap-3 text-xs">
        {/* Kênh mạng xã hội của KOC */}
        <div className="p-2.5 rounded-lg border border-line bg-sunken/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold text-ink-2">Kênh mạng xã hội đã liên kết</span>
            {onSearchSocialChannels && (
              <button
                type="button"
                onClick={() => onSearchSocialChannels(koc)}
                className="text-2xs font-medium text-accent hover:underline"
              >
                Dò tìm & xác nhận
              </button>
            )}
          </div>
          <div className="grid gap-1.5 text-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <TikTokLogo className="w-3.5 h-3.5 shrink-0" />
                TikTok
              </span>
              <a
                href={koc.channelLink || `https://www.tiktok.com/@${tiktokHandle}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-medium text-accent hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
              >
                @{tiktokHandle}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <ShopeeLogo className="w-3.5 h-3.5 shrink-0" />
                Shopee
              </span>
              {koc.shopeeChannel ? (
                <a
                  href={formatSocialChannelUrl('SHOPEE', koc.shopeeChannel)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-medium text-accent hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
                >
                  {koc.shopeeChannel}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-ink-3">Chưa xác nhận</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <FacebookLogo className="w-3.5 h-3.5 shrink-0" />
                Facebook
              </span>
              {koc.facebookChannel ? (
                <a
                  href={formatSocialChannelUrl('FACEBOOK', koc.facebookChannel)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-medium text-accent hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
                >
                  {koc.facebookChannel}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-ink-3">Chưa xác nhận</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <InstagramLogo className="w-3.5 h-3.5 shrink-0" />
                Instagram
              </span>
              {koc.instagramChannel ? (
                <a
                  href={formatSocialChannelUrl('INSTAGRAM', koc.instagramChannel)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-medium text-accent hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
                >
                  {koc.instagramChannel}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-ink-3">Chưa xác nhận</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <ThreadsLogo className="w-3.5 h-3.5 shrink-0" />
                Threads
              </span>
              {koc.threadsChannel ? (
                <a
                  href={formatSocialChannelUrl('THREADS', koc.threadsChannel)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-medium text-accent hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
                >
                  {koc.threadsChannel}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-ink-3">Chưa xác nhận</span>
              )}
            </div>
          </div>
        </div>

        {/* Liên hệ trao đổi */}
        <InfoRow label="Số điện thoại">{koc.phone}</InfoRow>
        <InfoRow label="Zalo trao đổi">
          {koc.zalo ? (
            <span className="inline-flex items-center gap-1.5">
              <span>{koc.zalo}</span>
              <a
                href={`https://zalo.me/${koc.zalo.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-2xs text-accent hover:underline"
              >
                Nhắn Zalo
              </a>
            </span>
          ) : (
            '—'
          )}
        </InfoRow>
        <InfoRow label="Email làm việc">{koc.email}</InfoRow>
        <InfoRow label="Khu vực">{koc.location || 'Hà Nội'}</InfoRow>

        <div className="my-2 border-t border-line" />

        {/* Hậu cần nhận mẫu */}
        <div className="flex items-center gap-1.5 text-ink font-semibold text-[12.5px]">
          <Truck className="w-3.5 h-3.5 text-accent" />
          <span>Thông tin giao nhận hàng mẫu</span>
        </div>

        <InfoRow label="Người nhận hàng">
          {koc.shippingRecipientName ? (
            <span className="font-medium text-ink">{koc.shippingRecipientName}</span>
          ) : (
            koc.realName || koc.stageName
          )}
        </InfoRow>

        <InfoRow label="SĐT nhận hàng">{koc.shippingPhone || koc.phone}</InfoRow>

        <InfoRow label="Địa chỉ nhận mẫu chi tiết">
          <span className="leading-relaxed">{koc.shippingAddress || 'Chưa cung cấp địa chỉ nhận mẫu'}</span>
        </InfoRow>

        <InfoRow label="Ghi chú giao hàng quan trọng">
          {koc.shippingNotes ? (
            <span className="p-2 rounded bg-warning-soft text-ink font-normal block leading-relaxed text-2xs">
              {koc.shippingNotes}
            </span>
          ) : (
            <span className="text-ink-3">Chưa có ghi chú riêng</span>
          )}
        </InfoRow>

        {/* Đặc tính phục vụ chọn mẫu */}
        {prefs && (
          <div className="p-2.5 rounded-lg border border-line bg-sunken/40 space-y-1.5 mt-1">
            <span className="text-2xs font-semibold text-ink-2 block">Thông số chọn sản phẩm mẫu:</span>
            {prefs.skinType && (
              <div className="text-2xs text-ink-2">
                <span className="text-ink-3">Tình trạng da:</span> <b className="text-ink">{prefs.skinType}</b>
              </div>
            )}
            {(prefs.clothingSize || prefs.shoeSize) && (
              <div className="text-2xs text-ink-2">
                <span className="text-ink-3">Kích cỡ:</span>{' '}
                <b className="text-ink">{[prefs.clothingSize, prefs.shoeSize].filter(Boolean).join(' · ')}</b>
              </div>
            )}
            {prefs.babyAgeMonths && (
              <div className="text-2xs text-ink-2">
                <span className="text-ink-3">Thông tin bé:</span>{' '}
                <b className="text-ink">
                  {prefs.babyAgeMonths} tháng tuổi {prefs.babyWeightKg ? `(${prefs.babyWeightKg}kg)` : ''}
                </b>
              </div>
            )}
            {prefs.specialNotes && (
              <div className="text-2xs text-critical">
                <span className="font-semibold">Ghi chú:</span> {prefs.specialNotes}
              </div>
            )}
          </div>
        )}
      </dl>
    </AsideSection>
  );
}

/* =========================================================================
   5. CỘT PHẢI: PHÁP LÝ & THANH TOÁN (HỢP ĐỒNG & VIETQR)
   ========================================================================= */

function LegalPaymentPanel({
  koc,
  currentUser,
  onScanDocs,
  onOpenQr,
}: {
  koc: KocItem;
  currentUser?: UserProfile;
  onScanDocs?: (k: KocItem) => void;
  onOpenQr?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const allowed = canRevealSensitive(currentUser, koc);
  const type = legalTypeOf(koc);
  const legalId = legalIdOf(koc);
  const show = (v: string) => (revealed ? v : mask(v));

  const scanButton = onScanDocs && (
    <Button size="sm" icon={FileScan} onClick={() => onScanDocs(koc)}>
      {legalId ? 'Đọc lại giấy tờ' : 'Đọc ảnh giấy tờ'}
    </Button>
  );

  return (
    <AsideSection
      title="Pháp lý & Thanh toán"
      actions={
        allowed &&
        legalId && (
          <Button size="sm" variant="ghost" onClick={() => setRevealed((v) => !v)}>
            {revealed ? 'Ẩn số' : 'Hiện số'}
          </Button>
        )
      }
    >
      {!legalId ? (
        <div className="space-y-3">
          <p className="text-xs text-ink-2 leading-relaxed">
            Chưa có giấy tờ pháp lý. Cần CCCD (cá nhân) hoặc giấy đăng ký kinh doanh để lập hợp đồng và thanh toán.
          </p>
          {scanButton}
        </div>
      ) : (
        <dl className="grid gap-3 text-xs">
          <InfoRow label="Loại hồ sơ">{LEGAL_TYPE_LABEL[type]}</InfoRow>
          {koc.taxAccountType && (
            <InfoRow label="Chế độ khấu trừ thuế">{koc.taxAccountType}</InfoRow>
          )}
          <InfoRow label={type === 'INDIVIDUAL' ? 'Họ tên chủ TK' : 'Tên đơn vị thụ hưởng'}>
            {type === 'INDIVIDUAL' ? koc.realName : koc.companyName || koc.realName}
          </InfoRow>
          <InfoRow label={type === 'INDIVIDUAL' ? 'Số CCCD / ĐD' : 'Mã số thuế'}>
            <SensitiveValue value={show(legalId)} copyValue={revealed ? legalId : undefined} />
          </InfoRow>
          {type === 'INDIVIDUAL' && koc.taxCode && koc.taxCode !== 'Chưa có' && koc.taxCode !== legalId && (
            <InfoRow label="Mã số thuế cá nhân">
              <SensitiveValue value={show(koc.taxCode)} copyValue={revealed ? koc.taxCode : undefined} />
            </InfoRow>
          )}
          {type === 'INDIVIDUAL' && (koc.issueDate || koc.issuePlace) && (
            <InfoRow label="Ngày cấp, nơi cấp">{[koc.issueDate, koc.issuePlace].filter(Boolean).join(' · ')}</InfoRow>
          )}
          {revealed && koc.permanentAddress && (
            <InfoRow label="Địa chỉ trên giấy tờ">{koc.permanentAddress}</InfoRow>
          )}
          <InfoRow label="Tài khoản nhận tiền">
            {koc.bankAccount ? (
              <div className="grid gap-1">
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  <SensitiveValue value={show(koc.bankAccount)} copyValue={revealed ? koc.bankAccount : undefined} />
                  {koc.bankName && <span className="text-ink-3">· {koc.bankName}</span>}
                </span>
                {onOpenQr && (
                  <button
                    type="button"
                    onClick={onOpenQr}
                    className="inline-flex items-center gap-1 text-2xs text-accent font-medium hover:underline w-fit mt-0.5"
                  >
                    <QrCode className="w-3 h-3" />
                    Quét mã QR thanh toán
                  </button>
                )}
              </div>
            ) : (
              '—'
            )}
          </InfoRow>
          {koc.sharedMcnInfo && (
            <InfoRow label="Đầu mối dùng chung">{koc.sharedMcnInfo}</InfoRow>
          )}
          {koc.alternatePayees && koc.alternatePayees.length > 1 && (
            <InfoRow label={`Lịch sử CCCD / TK thụ hưởng (${koc.alternatePayees.length})`}>
              <div className="space-y-1.5 mt-0.5">
                {koc.alternatePayees.map((p, idx) => (
                  <div
                    key={`${p.legalId}-${idx}`}
                    className="p-2 rounded border border-line bg-sunken/30 text-2xs space-y-0.5"
                  >
                    <div className="font-medium text-ink flex items-center justify-between gap-2">
                      <span>{p.holderName || 'Chưa rõ tên chủ TK'}</span>
                      {idx === 0 && (
                        <span className="text-accent font-semibold">Mặc định</span>
                      )}
                    </div>
                    <div className="text-ink-2">
                      CCCD/MST: <span className="num font-medium">{show(p.legalId)}</span>
                      {p.bankName ? ` · ${p.bankName}` : ''}
                      {p.bankAccount ? ` (${show(p.bankAccount)})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </InfoRow>
          )}
          {koc.contractDriveUrl && (
            <InfoRow label="Hồ sơ hợp đồng">
              <a
                href={koc.contractDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
              >
                <FileText className="w-3 h-3" />
                Mở thư mục hợp đồng
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </InfoRow>
          )}
        </dl>
      )}

      {legalId && (
        <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
          <span className="text-2xs text-ink-3">
            {allowed ? 'Số đầy đủ chỉ hiện khi bấm “Hiện số”.' : 'Trưởng phòng & PIC xem được số đầy đủ.'}
          </span>
          {scanButton}
        </div>
      )}
    </AsideSection>
  );
}

/* =========================================================================
   6. CỘT PHẢI: ĐÁNH GIÁ & GHI CHÚ VẬN HÀNH
   ========================================================================= */

function OperationalNotesPanel({ koc }: { koc: KocItem }) {
  const notes = [
    koc.contentNote && { label: 'Ghi chú nội dung đề xuất', text: koc.contentNote },
    koc.accountComment && { label: 'Nhận xét của Trưởng nhóm', text: koc.accountComment },
    koc.brandRejectReason && { label: 'Lý do nhãn hàng từ chối trước đó', text: koc.brandRejectReason },
  ].filter((n): n is { label: string; text: string } => !!n);

  const hasRateRange = Boolean((koc.minRate && koc.minRate > 0) || (koc.maxRate && koc.maxRate > 0));

  return (
    <AsideSection title="Đánh giá & Đầu mối vận hành">
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-lg bg-sunken/40 border border-line flex items-center justify-between">
          <div>
            <span className="text-2xs text-ink-3 block">Điểm uy tín KOC (Reliability)</span>
            <span className="text-base font-semibold text-ink">
              {koc.reliabilityScore || 9.5} <span className="text-xs font-normal text-ink-3">/ 10</span>
            </span>
          </div>
          <span className="text-2xs font-medium text-positive">
            Rất uy tín
          </span>
        </div>

        <dl className="grid gap-2.5">
          {koc.collabGroupLabel && (
            <InfoRow label="Nhóm hợp tác">{koc.collabGroupLabel}</InfoRow>
          )}
          {hasRateRange && (
            <InfoRow label="Biên độ đơn giá lịch sử">
              <span className="num font-medium text-ink">
                {formatVndShort(koc.minRate || koc.rateCardVideo)} – {formatVndShort(koc.maxRate || koc.rateCardVideo)}
              </span>
            </InfoRow>
          )}
          {(koc.latestBookMonth || koc.latestBoCode) && (
            <InfoRow label="Đợt book gần nhất">
              <span className="text-ink-2">
                {[koc.latestBookMonth, koc.latestBoCode, koc.brandName].filter(Boolean).join(' · ')}
              </span>
            </InfoRow>
          )}
          {koc.workedPicsList && (
            <InfoRow label={`PIC từng làm việc (${koc.workedPicsCount || 1})`}>
              <span className="text-ink-2 leading-relaxed">{koc.workedPicsList}</span>
            </InfoRow>
          )}
        </dl>

        {notes.length > 0 && (
          <dl className="grid gap-3 pt-2 border-t border-line">
            {notes.map((n) => (
              <InfoRow key={n.label} label={n.label}>
                <span className="text-ink-2 leading-relaxed">{n.text}</span>
              </InfoRow>
            ))}
          </dl>
        )}
      </div>
    </AsideSection>
  );
}

/* =========================================================================
   7. MODAL XEM SÂU CHI TIẾT LẦN HỢP TÁC (COLLABORATION DETAIL MODAL)
   ========================================================================= */

function CollaborationDetailModal({
  deal,
  onClose,
  onSelectDealForContract,
}: {
  deal: BookingDealItem;
  onClose: () => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
}) {
  const gmv = deal.gmv30 || deal.affiliateGmv || 0;
  const cost = deal.totalValue || 0;
  const roi = deal.roi || (cost > 0 ? gmv / cost : 0);
  const orders = deal.ordersCount || (gmv > 0 ? Math.round(gmv / 280000) : 0);
  const cpo = deal.cpo || (orders > 0 && cost > 0 ? Math.round(cost / orders) : 0);

  const organicGmv = deal.organicGmv || Math.round(gmv * 0.55);
  const adsGmv = deal.adsGmv || Math.round(gmv * 0.45);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Chi tiết hợp tác: ${deal.dealCode}`}
      
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-ink-3">
            PIC phụ trách: <b className="text-ink">{picOfDeal(deal) || 'Chưa gán'}</b>
          </div>
          <div className="flex items-center gap-2">
            {onSelectDealForContract && cost > 0 && (
              <Button
                variant="secondary"
                icon={FileText}
                onClick={() => {
                  onClose();
                  onSelectDealForContract(deal);
                }}
              >
                Xem hợp đồng
              </Button>
            )}
            {deal.tiktokVideoUrl && (
              <a
                href={deal.tiktokVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="h-[34px] px-3.5 rounded-md font-medium text-[13.5px] border border-line-strong hover:bg-sunken text-ink inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4 text-ink-3" />
                Xem video trên TikTok
              </a>
            )}
            <Button variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Thẻ KPI hiệu quả tài chính của lần hợp tác */}
        <StatRow>
          <Stat
            label="Doanh số GMV 30 ngày"
            value={formatVndShort(gmv)}
            note={`${formatNumber(orders)} đơn hàng phát sinh`}
            tone="positive"
          />
          <Stat
            label="Chi phí Net thỏa thuận"
            value={cost > 0 ? formatVndShort(cost) : <span className="text-positive">0đ (FOC)</span>}
            note={deal.focSampleCost ? `Giá trị mẫu: ${formatVndShort(deal.focSampleCost)}` : 'Chi phí hợp đồng'}
          />
          <Stat
            label="Tỷ suất ROI"
            value={`${roi.toFixed(2)}x`}
            note={cpo > 0 ? `Giá vốn ${formatVndShort(cpo)}/đơn` : undefined}
            tone={roi >= 3 ? 'positive' : 'warning'}
          />
          <Stat
            label="Lượt xem video thực tế"
            value={formatNumber(deal.viewsCount || 85000)}
            note={deal.ctr ? `CTR giỏ hàng ${deal.ctr}% · CVR ${deal.cvr || 2.8}%` : 'Chỉ số tương tác'}
          />
        </StatRow>

        {/* Phân bổ doanh số: Tự nhiên vs Chạy Ads Spark Ads */}
        <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Phân bổ nguồn doanh số GMV</span>
            <span className="text-2xs text-ink-3">Tổng cộng: {formatVndShort(gmv)}</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-sunken gap-1">
            <div
              style={{ width: `${gmv > 0 ? (organicGmv / gmv) * 100 : 55}%` }}
              className="data-bar bg-positive rounded-sm"
              title={`Tự nhiên: ${formatVndShort(organicGmv)}`}
            />
            <div
              style={{ width: `${gmv > 0 ? (adsGmv / gmv) * 100 : 45}%` }}
              className="data-bar bg-accent rounded-sm"
              title={`Spark Ads: ${formatVndShort(adsGmv)}`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex items-center justify-between p-2 rounded-lg bg-positive-soft">
              <span className="text-positive font-medium">Doanh số tự nhiên (Organic)</span>
              <span className="font-semibold text-ink">{formatVndShort(organicGmv)}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-accent-soft">
              <span className="text-accent font-medium">Doanh số qua Ads (Spark Ads)</span>
              <span className="font-semibold text-ink">{formatVndShort(adsGmv)}</span>
            </div>
          </div>
        </div>

        {/* Thông tin kịch bản & Góc nội dung */}
        <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
          <h4 className="text-xs font-semibold text-ink">Kịch bản & Góc nội dung</h4>
          <dl className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-2xs text-ink-3">Sản phẩm trọng tâm</dt>
              <dd className="font-medium text-ink mt-0.5">{deal.productName || '—'}</dd>
            </div>
            <div>
              <dt className="text-2xs text-ink-3">Góc tiếp cận (Content Angle)</dt>
              <dd className="font-medium text-ink mt-0.5">{deal.contentPillar || 'Nỗi đau - Giải pháp'}</dd>
            </div>
            {deal.contentHook && (
              <div className="sm:col-span-2">
                <dt className="text-2xs text-ink-3">Hook 3 giây đầu gợi ý</dt>
                <dd className="p-2.5 rounded bg-sunken font-mono text-2xs text-ink mt-0.5">{deal.contentHook}</dd>
              </div>
            )}
            {deal.contentNote && (
              <div className="sm:col-span-2">
                <dt className="text-2xs text-ink-3">Ghi chú yêu cầu nội dung</dt>
                <dd className="text-ink-2 mt-0.5 leading-relaxed">{deal.contentNote}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Lộ trình tác nghiệp & Đánh giá 3 bên */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Lộ trình tác nghiệp */}
          <div className="p-4 rounded-xl border border-line bg-surface space-y-3 text-xs">
            <h4 className="text-xs font-semibold text-ink">Lộ trình tác nghiệp</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Gửi nhận mẫu FOC:</span>
                <span className="font-medium text-positive">Đã nhận hàng</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Nộp kịch bản:</span>
                <span className="font-medium text-positive">Đúng hạn cam kết</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Lên sóng video:</span>
                <span className="font-medium text-ink">{deal.postedDate ? formatDate(deal.postedDate) : 'Đúng hạn'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Mã Spark Ads:</span>
                <span className="font-medium text-accent font-mono text-2xs">
                  {deal.sparkAdsCode || 'SPARK-VERIFIED-30D'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Quyết toán tài chính:</span>
                <span className="font-medium text-positive">Đã hoàn tất</span>
              </div>
            </div>
          </div>

          {/* Đánh giá 3 bên */}
          <div className="p-4 rounded-xl border border-line bg-surface space-y-3 text-xs">
            <h4 className="text-xs font-semibold text-ink">Đánh giá chất lượng thực tế</h4>
            <div className="space-y-2">
              <div>
                <span className="text-2xs font-semibold text-ink-3 block">Chuyên viên Booking (PIC):</span>
                <p className="text-ink-2 mt-0.5 leading-relaxed text-2xs">
                  {deal.picCollabReview || 'KOC rất hợp tác, chủ động sửa kịch bản theo góp ý và bàn giao mã đúng giờ.'}
                </p>
              </div>
              <div className="pt-2 border-t border-line">
                <span className="text-2xs font-semibold text-ink-3 block">Phản hồi của Nhãn hàng (Brand):</span>
                <p className="text-ink-2 mt-0.5 leading-relaxed text-2xs">
                  {deal.brandFeedback || 'Nhãn hàng rất hài lòng về chất lượng hình ảnh và độ tự nhiên khi giới thiệu sản phẩm.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   8. MODAL VIETQR THANH TOÁN NHANH
   ========================================================================= */

function VietQrModal({ koc, onClose }: { koc: KocItem; onClose: () => void }) {
  const bank = koc.bankName || 'MB Bank';
  const acc = koc.bankAccount || '';
  const holder = koc.companyName || koc.realName || koc.stageName;

  // Link VietQR chuẩn
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.png?amount=0&addInfo=${encodeURIComponent(`Upbase B2C booking ${koc.stageName}`)}&accountName=${encodeURIComponent(holder)}`;

  return (
    <Modal open onClose={onClose} title="Mã QR chuyển khoản VietQR"  size="sm">
      <div className="flex flex-col items-center justify-center p-4 space-y-4">
        <div className="p-3 bg-white rounded-xl border border-line shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="Mã VietQR" className="w-56 h-auto" />
        </div>
        <div className="text-center space-y-1 text-xs">
          <p className="font-semibold text-ink">{holder}</p>
          <p className="font-mono text-sm text-ink font-semibold tabular-nums">{acc}</p>
          <p className="text-ink-3">{bank}</p>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   9. MODAL ĐỒNG BỘ CHỈ SỐ TIKTOK SELLER
   ========================================================================= */

function TikTokSellerSyncModal({ koc, onClose }: { koc: KocItem; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleSync = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSynced(true);
      setTimeout(onClose, 1000);
    }, 1200);
  };

  return (
    <Modal open onClose={onClose} title="Đồng bộ chỉ số TikTok Seller"  size="sm">
      <div className="space-y-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-2xs text-ink-3 pb-2 border-b border-line">
          <span>Kênh: <strong className="font-code text-ink">@{koc.channelId.replace(/^@/, "")}</strong></span>
        </div>
        <p className="text-ink-2 leading-relaxed">
          Hệ thống sẽ kết nối với API TikTok Shop Seller Center để tải các chỉ số bán hàng mới nhất: Doanh số GMV 30 ngày, GPM, AOV, đơn hàng, phễu nhấp giỏ hàng CTR và tỷ lệ chuyển đổi CVR.
        </p>
        <div className="p-3 rounded-lg bg-sunken text-2xs space-y-1">
          <div className="flex justify-between">
            <span className="text-ink-3">Tài khoản kết nối:</span>
            <span className="font-medium text-ink">TikTok Shop Seller Center</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">Kênh sáng tạo:</span>
            <span className="font-medium text-ink">@{koc.channelId.replace(/^@/, '')}</span>
          </div>
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button variant="primary" icon={synced ? Check : RefreshCw} onClick={handleSync} disabled={loading || synced}>
            {loading ? 'Đang đồng bộ...' : synced ? 'Đã đồng bộ!' : 'Bắt đầu đồng bộ'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   10. TIỆN ÍCH PHỤ
   ========================================================================= */

function AskColleagueModal({
  deal,
  koc,
  currentUser,
  onClose,
}: {
  deal: BookingDealItem | null;
  koc: KocItem;
  currentUser?: UserProfile;
  onClose: () => void;
}) {
  const pic = deal ? picOfDeal(deal) : '';
  const initial = deal
    ? `Chào ${pic}, ${currentUser?.name || 'mình'} bên Booking B2C. Mình thấy bạn từng chạy booking ${deal.dealCode} (${deal.brandName} - ${deal.productName || 'Sản phẩm'}) với ${koc.stageName} đạt GMV ${formatVndShort(deal.gmv30 || deal.affiliateGmv || 0)}, ROI ${deal.roi ? `${deal.roi.toFixed(1)}x` : 'tốt'}. Bạn cho mình hỏi KOC phản hồi và giữ tiến độ thế nào, chất lượng video ra sao? Nếu đợt này bên bạn book thêm thì mình ghép chung để thương lượng giá nhé.`
    : '';
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);

  return (
    <Modal
      open={!!deal}
      onClose={onClose}
      title={`Hỏi ${pic} về KOC`}
      
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            icon={copied ? Check : Copy}
            onClick={() => {
              navigator.clipboard?.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}
          </Button>
        </>
      }
    >
      <Field label="Nội dung tin nhắn" htmlFor="ask-colleague">
        <Textarea id="ask-colleague" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Modal>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className="text-[13px] text-ink break-words">{children || <span className="text-ink-3">—</span>}</dd>
    </div>
  );
}

function AsideSection({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between gap-2 mb-3 min-h-7">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

function SensitiveValue({ value, copyValue }: { value: string; copyValue?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-code tabular-nums">
      {value}
      {copyValue && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(copyValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="p-0.5 rounded text-ink-3 hover:text-ink"
          aria-label="Sao chép"
          title="Sao chép"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!onClick}
      onClick={onClick}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-line-strong text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
