'use client';

/**
 * Hồ sơ một KOC — dùng chung cho trang chi tiết (Danh bạ KOC) và modal (màn Booking).
 * Thiết kế chuẩn vận hành B2C:
 * 1. Bộ chỉ số tích hợp từ TikTok Seller (GMV 30d, GPM, AOV, CTR, CVR, cơ cấu định dạng, khán giả, điểm uy tín shop).
 * 2. Thông tin cá nhân & Hậu cần gửi mẫu FOC (người nhận, SĐT nhận hàng, địa chỉ, ghi chú giao nhận, thông số loại da/size).
 * 3. Lịch sử hợp tác & Hiệu quả hợp tác chi tiết (Tổng hợp ROI/CPO/Đơn hàng, bảng chi tiết từng deal, phân bổ Organic vs Ads, đánh giá chất lượng 3 bên).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Copy,
  ExternalLink,
  Eye,
  FileScan,
  FileText,
  History,
  Layers,
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
import type { BookingDealItem, KocItem, KocPlatformType, LegalDocAttachment, TikTokVideoItem, UserProfile } from '../../lib/types';
import { LEGAL_DOC_CATEGORY_LABEL, LegalDocPreviewModal } from '../contracts/LegalAttachmentsPanel';
import { formatDate, formatNumber, formatVndShort } from '../../lib/format';
import { computeMedianViews } from '../../lib/tiktokKocScraper';
import { formatSocialChannelUrl } from '../../lib/kocSocialDiscovery';
import { syncKocContactToStaffSheets } from '../../lib/staffBrandListingSheet';
import { useKocChannelReviews } from '../../lib/kocChannelReviewService';
import {
  getUpaffiliateCreatorId,
  getUpaffiliateSyncStatus,
} from '../../lib/upaffiliateKocSyncService';
import { KocChannelReviewBadge, KocChannelReviewModal } from './KocChannelReviewModal';
import {
  ActionMenu,
  Avatar,
  Button,
  CHANNELS,
  DataTable,
  Density,
  EmptyState,
  FacebookLogo,
  FilterBar,
  Field,
  Input,
  InstagramLogo,
  Modal,
  Panel,
  Person,
  SectionHeader,
  Select,
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
  DEAL_CHANNEL_SCOPE_EVENT,
  KOC_LEGAL_ATTACHMENTS_EVENT,
  LEGAL_TYPE_LABEL,
  KOC_PLATFORM_LABEL,
  READINESS_LABEL,
  calculateKocPerformanceStats,
  canRevealSensitive,
  dealPostOnTimeOf,
  evaluateLegalProfileContractReadiness,
  dealRatingOf,
  dealStatusOf,
  dealStepOf,
  dealViewsOf,
  dealsOfKoc,
  filterDealsByChannelScope,
  formatFollowers,
  getDealChannelBreakdown,
  getKocConnectedChannels,
  getKocLegalProfiles,
  getKocTikTokChannels,
  hasLegalId,
  isCooperatedKoc,
  isDealOpen,
  isMasterSummaryDeal,
  legalIdOf,
  legalTypeOf,
  mask,
  picOfDeal,
  saveDealChannelScopeOverride,
  syncKocWithConnectedChannels,
  syncKocWithLegalProfiles,
  type DuplicateMatch,
  type KocPerformanceSummary,
} from './kocUtils';
import { KocHistoryEvaluationModal } from './KocHistoryEvaluationModal';
import { KocContractLegalPickerModal, KocLegalProfilesSection } from './KocLegalProfilesSection';
import { KocSocialChannelsModal } from './KocSocialChannelsModal';
import { KocVideoWeeklyHistoryPanel } from './KocVideoWeeklyHistoryPanel';

function PlatformChannelIcon({
  platform,
  className = 'w-3.5 h-3.5 shrink-0',
}: {
  platform: KocPlatformType;
  className?: string;
}) {
  if (platform === 'SHOPEE') return <ShopeeLogo className={className} />;
  if (platform === 'FACEBOOK') return <FacebookLogo className={className} />;
  if (platform === 'INSTAGRAM') return <InstagramLogo className={className} />;
  if (platform === 'THREADS') return <ThreadsLogo className={className} />;
  return <TikTokLogo className={className} />;
}

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
  onUpdateKoc?: (updatedKoc: KocItem, message?: string) => void;
  onOpenKocPortal?: (kocId: string) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onCreateContractForKoc?: (koc: KocItem, legalProfileId?: string) => void;
  selectedBrand?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export function classificationOf(k: KocItem): string {
  return [k.salaryGrade, k.tepKenh || k.creatorCategory, k.kocCategory, k.location, k.isWinnerTop20 && 'Nhóm top 20 GMV', 'TikTok Seller']
    .filter(Boolean)
    .join(' · ');
}

type MainTabKey = 'METRICS' | 'HISTORY' | 'LEGAL_PROFILES' | 'ACTIVE_DEALS';

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
  onUpdateKoc,
  onSelectDealForContract,
  onCreateContractForKoc,
}: KocProfileProps) {
  const isPage = layout === 'page';
  const [channelScopeVersion, setChannelScopeVersion] = useState(0);
  const [internalSocialModalOpen, setInternalSocialModalOpen] = useState(false);

  useEffect(() => {
    const onScopeUpdated = () => setChannelScopeVersion((v) => v + 1);
    window.addEventListener(DEAL_CHANNEL_SCOPE_EVENT, onScopeUpdated);
    return () => window.removeEventListener(DEAL_CHANNEL_SCOPE_EVENT, onScopeUpdated);
  }, []);

  const handleOpenSocialChannels = (targetKoc: KocItem = koc) => {
    if (onSearchSocialChannels) {
      onSearchSocialChannels(targetKoc);
    } else {
      setInternalSocialModalOpen(true);
    }
  };

  const kocDeals = useMemo(
    () => dealsOfKoc(deals, koc).sort((a, b) => Number(isDealOpen(b)) - Number(isDealOpen(a))),
    [deals, koc],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => calculateKocPerformanceStats(deals || [], koc), [deals, koc, channelScopeVersion]);
  const legalProfiles = useMemo(() => getKocLegalProfiles(koc), [koc]);
  const connectedChannels = useMemo(() => getKocConnectedChannels(koc), [koc]);
  const tiktokChannels = useMemo(() => getKocTikTokChannels(koc), [koc]);
  const isCooperated = useMemo(() => isCooperatedKoc(koc, deals), [koc, deals]);

  const [activeTab, setActiveTab] = useState<MainTabKey>(() =>
    isCooperatedKoc(koc, deals) ? 'HISTORY' : 'METRICS',
  );
  const [selectedCollabDetail, setSelectedCollabDetail] = useState<BookingDealItem | null>(null);
  const [vietQrDeal, setVietQrDeal] = useState<KocItem | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [historyEvalModalOpen, setHistoryEvalModalOpen] = useState(false);
  const [contractLegalPickerOpen, setContractLegalPickerOpen] = useState(false);
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
  const totalHistoryCount = Math.max(kocDeals.length, koc.totalPastDeals || 0);
  // Trùng thật = cùng @handle. Cùng CCCD / MST / SĐT / Email là một chủ hoặc MCN quản lý nhiều kênh, chỉ là thông tin.
  const channelDuplicates = duplicates.filter((d) => d.fields.includes('kênh'));
  const sharedOwners = duplicates.filter((d) => !d.fields.includes('kênh'));
  const syncStatus = getUpaffiliateSyncStatus(koc);

  // Dải thông tin nhanh: những gì cần biết để quyết định book, không phải mở tab
  const realDeals = kocDeals.filter((d) => !isMasterSummaryDeal(d));
  const latestDeal = realDeals
    .filter((d) => d.postedDate || d.deadlinePost)
    .sort((a, b) => String(b.postedDate || b.deadlinePost).localeCompare(String(a.postedDate || a.deadlinePost)))[0];
  const mainPic = (koc.bookingPic || '').split('\n')[0].trim();
  const hasRateRange = Boolean(koc.minRate && koc.maxRate && koc.minRate > 0 && koc.maxRate > koc.minRate);
  const quickFacts: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: 'Follower',
      value: koc.followers ? formatFollowers(koc.followers) : '—',
      sub: koc.avgViews ? `${formatFollowers(koc.avgViews)} view TB` : undefined,
    },
    {
      label: isCooperated ? 'Đơn giá' : 'Báo giá',
      value: koc.rateCardVideo > 1 ? formatVndShort(koc.rateCardVideo) : '—',
      sub: hasRateRange ? `${formatVndShort(koc.minRate!)} – ${formatVndShort(koc.maxRate!)}` : undefined,
    },
    {
      label: 'GMV kênh 30 ngày',
      value: koc.recentRevenue ? formatVndShort(koc.recentRevenue) : '—',
      sub: koc.recentRevenue ? 'Cả kênh trên TikTok Shop' : undefined,
    },
    {
      label: isCooperated ? 'PIC chính' : 'PIC đề xuất',
      value: mainPic || '—',
      sub: koc.workedPicsCount && koc.workedPicsCount > 1 ? `${koc.workedPicsCount} PIC từng làm` : undefined,
    },
    {
      label: 'Book gần nhất',
      value: latestDeal ? shortDate(String(latestDeal.postedDate || latestDeal.deadlinePost)) : koc.latestBookMonth || 'Chưa book',
      sub: latestDeal ? [latestDeal.brandName, latestDeal.dealCode].filter(Boolean).join(' · ') : koc.latestBoCode || undefined,
    },
  ];

  const tabItems: TabItem<MainTabKey>[] = [
    { key: 'HISTORY', label: 'Lịch sử hợp tác', count: totalHistoryCount },
    { key: 'LEGAL_PROFILES', label: 'Hồ sơ pháp lý', count: legalProfiles.length },
    { key: 'METRICS', label: 'Chỉ số kênh' },
    { key: 'ACTIVE_DEALS', label: 'Booking đang chạy', count: openCount > 0 ? openCount : undefined },
  ];

  const moreActions = [
    { label: 'Đánh giá phù hợp', icon: CheckCircle2, onSelect: () => openChannelReviewWithVerdict('SUITABLE') },
    { label: 'Đánh giá không phù hợp', icon: XCircle, onSelect: () => openChannelReviewWithVerdict('NOT_SUITABLE') },
    ...(channelReviewSummary && channelReviewSummary.totalReviews > 0
      ? [{ label: `Lịch sử đánh giá (${channelReviewSummary.totalReviews})`, icon: History, onSelect: () => openChannelReviewWithVerdict() }]
      : []),
    { label: 'Đánh giá lịch sử & rủi ro', icon: FileText, onSelect: () => setHistoryEvalModalOpen(true) },
    { label: 'Quản lý tài khoản & kênh kết nối', icon: Layers, onSelect: () => handleOpenSocialChannels(koc) },
    ...(koc.bankAccount ? [{ label: 'Mã QR VietQR', icon: QrCode, onSelect: () => setVietQrDeal(koc) }] : []),
  ];

  return (
    <Density className="space-y-4">
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
                <span className="tabular-nums font-figure mr-1">
                  {formatNumber(nav.position)} / {formatNumber(nav.total)}
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

      {/* Đầu hồ sơ: tên, nhãn trạng thái, một dòng phân loại; thao tác chính bên phải, còn lại trong menu */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {isPage && <span className="shrink-0 inline-flex" style={sharedTo('koc-avatar')}><Avatar name={koc.stageName} src={koc.avatarUrl} size={44} /></span>}
          <div className="min-w-0 grid gap-1">
            {isPage && (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-ink" style={sharedTo('koc-title')}>{koc.stageName}</h2>
                {koc.realName && koc.realName !== koc.stageName && (
                  <span className="text-sm text-ink-3">{koc.realName}</span>
                )}
                <KocChannelReviewBadge summary={channelReviewSummary} onClick={() => setChannelReviewModalOpen(true)} />
                <Status tone={isCooperated ? 'positive' : 'info'}>
                  {isCooperated ? `Đã hợp tác · ${formatNumber(totalHistoryCount)} đợt` : 'KOC mới / tiềm năng'}
                </Status>
                {!isCooperated && koc.bookingReadiness && (
                  <Status tone={READINESS_LABEL[koc.bookingReadiness].tone}>{READINESS_LABEL[koc.bookingReadiness].label}</Status>
                )}
                {missingDocs && <Status tone="warning">Thiếu giấy tờ</Status>}
                {channelDuplicates.length > 0 && <Status tone="warning">Trùng kênh</Status>}
              </div>
            )}
            <p className="text-ctl text-ink-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <a
                href={koc.channelLink || `https://www.tiktok.com/@${handle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                @{handle}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {tiktokChannels.length > 1 && (
                <span className="text-2xs font-medium text-ink-2">
                  (+{tiktokChannels.length - 1} kênh TikTok phụ:{' '}
                  {tiktokChannels
                    .filter((c) => !c.isPrimary)
                    .map((c) => `@${c.handle}`)
                    .join(', ')}
                  )
                </span>
              )}
              {isPage && <span className="text-ink-3"> · {classificationOf(koc)}</span>}
            </p>
            {isPage && (
              <p className="text-2xs text-ink-3">
                <span className="font-figure">{getUpaffiliateCreatorId(koc)}</span>
                {' · '}
                {syncStatus === 'SYNCED' ? 'Đã đồng bộ UpAffiliate' : 'Chờ đồng bộ UpAffiliate'}
                {' · '}
                <button
                  type="button"
                  onClick={() => setActiveTab('LEGAL_PROFILES')}
                  className="text-accent hover:underline"
                >
                  {legalProfiles.length} hồ sơ pháp lý
                </button>
                {' · '}
                <button
                  type="button"
                  onClick={() => handleOpenSocialChannels(koc)}
                  className="text-accent hover:underline"
                >
                  {connectedChannels.length} kênh nền tảng kết nối ({tiktokChannels.length} TikTok)
                </button>
                {sharedOwners.length > 0 && ` · Chung chủ / MCN với ${formatNumber(sharedOwners.length)} kênh`}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onCreateContractForKoc && (
            <Button
              variant="secondary"
              icon={FileText}
              onClick={() => setContractLegalPickerOpen(true)}
            >
              Ký hợp đồng
            </Button>
          )}
          {onCreateBooking && (
            <Button variant="primary" icon={Plus} onClick={() => onCreateBooking(koc)}>
              Tạo booking
            </Button>
          )}
          <ActionMenu label="Thao tác khác" items={moreActions} />
        </div>
      </header>

      {isPage && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3">
          {quickFacts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-2xs text-ink-3">{f.label}</dt>
              <dd className="text-ctl-md text-ink font-medium font-figure truncate" title={f.value}>
                {f.value}
              </dd>
              {f.sub && <dd className="text-2xs text-ink-3 truncate" title={f.sub}>{f.sub}</dd>}
            </div>
          ))}
        </dl>
      )}

      {/* Trùng kênh thật (cùng @handle) mới cảnh báo */}
      {channelDuplicates.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-line text-ctl text-ink">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.75} />
          <p>
            Trùng kênh với{' '}
            {channelDuplicates.slice(0, 3).map((d, i) => (
              <React.Fragment key={d.kocId}>
                {i > 0 && ', '}
                {onOpenKoc ? (
                  <button type="button" onClick={() => onOpenKoc(d.kocId)} className="font-medium text-accent hover:underline">
                    {d.stageName}
                  </button>
                ) : (
                  <span className="font-medium">{d.stageName}</span>
                )}
              </React.Fragment>
            ))}
            {channelDuplicates.length > 3 && ` và ${channelDuplicates.length - 3} hồ sơ khác`}. Gộp hồ sơ trước khi tạo booking hoặc hợp đồng.
          </p>
        </div>
      )}

      <div className={cx('grid gap-4 items-start', isPage && 'xl:grid-cols-[minmax(0,1fr)_320px]')}>
        {/* Cột chính */}
        <div className="grid grid-cols-1 gap-4 min-w-0">
          <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

          {activeTab === 'HISTORY' && (
            <CollaborationHistorySection
              koc={koc}
              deals={kocDeals}
              allDeals={deals}
              stats={stats}
              currentUser={currentUser}
              onViewDetail={setSelectedCollabDetail}
              onOpenHistoryEvaluation={() => setHistoryEvalModalOpen(true)}
              onSearchSocialChannels={handleOpenSocialChannels}
              onUpdateKoc={onUpdateKoc}
            />
          )}

          {activeTab === 'LEGAL_PROFILES' && (
            <KocLegalProfilesSection
              koc={koc}
              currentUser={currentUser}
              onUpdateKoc={onUpdateKoc}
              onScanDocs={onScanDocs}
              onCreateContractForProfile={
                onCreateContractForKoc ? (targetKoc, prof) => onCreateContractForKoc(targetKoc, prof.id) : undefined
              }
            />
          )}

          {activeTab === 'METRICS' && (
            <TikTokSellerMetricsSection
              koc={koc}
              onUpdate={() => (onUpdateMetrics ? onUpdateMetrics(koc) : setSyncModalOpen(true))}
              onUpdateKoc={onUpdateKoc}
            />
          )}

          {activeTab === 'ACTIVE_DEALS' && (
            <ActiveDealsSection deals={kocDeals.filter(isDealOpen)} onViewDetail={setSelectedCollabDetail} />
          )}
        </div>

        {/* Cột tra cứu: theo thứ tự quyết định — ký được chưa, liên hệ ai, người khác đánh giá ra sao */}
        <aside className="grid grid-cols-1 gap-4 min-w-0">
          <div className="bg-surface border border-line rounded-xl divide-y divide-line min-w-0">
            <LegalPaymentPanel
              koc={koc}
              currentUser={currentUser}
              onScanDocs={onScanDocs}
              onUpdateKoc={onUpdateKoc}
              onOpenQr={() => setVietQrDeal(koc)}
              onOpenLegalTab={() => setActiveTab('LEGAL_PROFILES')}
              onCreateContractForKoc={onCreateContractForKoc}
            />
            <ShippingAndContactPanel koc={koc} currentUser={currentUser} onSearchSocialChannels={handleOpenSocialChannels} onUpdateKoc={onUpdateKoc} />
          </div>
          {channelReviewSummary && channelReviewSummary.totalReviews > 0 && (
            <Panel
              icon={History}
              title="Đánh giá kênh"
              meta={`${formatNumber(channelReviewSummary.totalReviews)} lượt${
                channelReviewSummary.notSuitableCount > 0 ? ` · ${channelReviewSummary.notSuitableCount} không phù hợp` : ''
              }`}
              actions={
                <Button size="sm" variant="ghost" onClick={() => setChannelReviewModalOpen(true)}>
                  Xem tất cả
                </Button>
              }
            >
              <ul className="divide-y divide-line">
                {channelReviewSummary.reviews.slice(0, 3).map((rev) => (
                  <li key={rev.id} className="py-2 first:pt-0 last:pb-0 grid gap-1 text-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <Status tone={rev.verdict === 'NOT_SUITABLE' ? 'critical' : rev.verdict === 'CAUTION' ? 'warning' : 'positive'}>
                        {rev.verdictLabel}
                      </Status>
                      <span className="text-ink-3 tabular-nums">{rev.dateLabel}</span>
                    </div>
                    <span className="text-ink-2">
                      {rev.reviewerName} · {rev.brandScope || 'Toàn hệ thống B2C'}
                    </span>
                    {(rev.note || rev.reasonTags.length > 0) && (
                      <span className="text-ink-3 line-clamp-2">{rev.note || rev.reasonTags.join(', ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <div className="bg-surface border border-line rounded-xl min-w-0">
            <OperationalNotesPanel koc={koc} />
          </div>
        </aside>
      </div>

      {/* Modal xem sâu chi tiết lần hợp tác */}
      {selectedCollabDetail && (
        <CollaborationDetailModal
          deal={selectedCollabDetail}
          koc={koc}
          onClose={() => setSelectedCollabDetail(null)}
          onSelectDealForContract={onSelectDealForContract}
        />
      )}

      {/* Modal quản lý tài khoản & kênh kết nối nội bộ (khi mở trực tiếp từ KocProfile) */}
      <KocSocialChannelsModal
        open={internalSocialModalOpen}
        koc={koc}
        onClose={() => setInternalSocialModalOpen(false)}
        onSave={(updated) => {
          onUpdateKoc?.(updated, `Đã cập nhật hệ thống tài khoản & kênh kết nối cho ${updated.stageName}`);
          setInternalSocialModalOpen(false);
        }}
      />

      {onCreateContractForKoc && (
        <KocContractLegalPickerModal
          open={contractLegalPickerOpen}
          onClose={() => setContractLegalPickerOpen(false)}
          koc={koc}
          currentUser={currentUser}
          onUpdateKoc={onUpdateKoc}
          onConfirmSelectProfile={(targetKoc, legalProfileId) =>
            onCreateContractForKoc(targetKoc, legalProfileId)
          }
        />
      )}

      {/* Modal VietQR thanh toán nhanh */}
      {vietQrDeal && <VietQrModal koc={vietQrDeal} onClose={() => setVietQrDeal(null)} />}

      {/* Modal đồng bộ chỉ số TikTok Seller */}
      {syncModalOpen && (
        <TikTokSellerSyncModal
          koc={koc}
          onClose={() => setSyncModalOpen(false)}
          onUpdateKoc={onUpdateKoc}
        />
      )}

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
          defaultBrandScope: kocDeals[0]?.brandName || 'ALL',
          sourceScreen: 'Hồ sơ KOC (Danh bạ KOC)',
        }}
        initialMode="CHANNEL_DETAIL"
        currentUserName={currentUser?.name}
        currentUserRole={currentUser?.roleTitle}
        currentUserEmail={currentUser?.email}
        reviews={channelReviews}
      />
    </Density>
  );
}

/* =========================================================================
   1. BỘ CHỈ SỐ TÍCH HỢP TỪ TIKTOK SELLER
   ========================================================================= */

function TikTokSellerMetricsSection({
  koc,
  onUpdate,
  onUpdateKoc,
}: {
  koc: KocItem;
  onUpdate?: () => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
}) {
  const [liveVideos, setLiveVideos] = useState<TikTokVideoItem[] | undefined>(koc.recentVideos);
  const [liveBio, setLiveBio] = useState<string | undefined>(koc.bio);
  const [liveTotalLikes, setLiveTotalLikes] = useState<number | undefined>(koc.totalLikes);
  const [liveVideoCount, setLiveVideoCount] = useState<number | undefined>(koc.videoCount);
  const [liveAvgLikes, setLiveAvgLikes] = useState<number | undefined>(koc.avgLikes);
  const [liveMedianViews, setLiveMedianViews] = useState<number | undefined>(koc.medianViews);
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
        const nextVideos = json.data.recentVideos;
        const nextBio = json.data.channelProfile?.bio;
        const nextTotalLikes = json.data.channelProfile?.totalLikes;
        const nextVideoCount = json.data.channelProfile?.videoCount;
        const nextAvgLikes = json.data.engagementMetrics?.avgLikes;
        const nextMedianViews = json.data.engagementMetrics?.medianViews;
        const nextAvgComments = json.data.engagementMetrics?.avgComments;
        const nextAvgShares = json.data.engagementMetrics?.avgShares;
        const nextEr = json.data.engagementMetrics?.engagementRate;
        const extractedEmail = json.data.channelProfile?.extractedEmail;

        setLiveVideos(nextVideos);
        setLiveBio(nextBio);
        setLiveTotalLikes(nextTotalLikes);
        setLiveVideoCount(nextVideoCount);
        setLiveAvgLikes(nextAvgLikes);
        setLiveMedianViews(nextMedianViews);
        setLiveAvgComments(nextAvgComments);
        setLiveAvgShares(nextAvgShares);
        setLiveEr(nextEr);

        if (onUpdateKoc) {
          const updated: KocItem = {
            ...koc,
            recentVideos: nextVideos || koc.recentVideos,
            bio: nextBio || koc.bio,
            totalLikes: nextTotalLikes ?? koc.totalLikes,
            videoCount: nextVideoCount ?? koc.videoCount,
            medianViews: nextMedianViews ?? koc.medianViews,
            avgLikes: nextAvgLikes ?? koc.avgLikes,
            avgComments: nextAvgComments ?? koc.avgComments,
            avgShares: nextAvgShares ?? koc.avgShares,
            engagementRate: nextEr ?? koc.engagementRate,
            email: koc.email || extractedEmail || undefined,
          };
          syncKocContactToStaffSheets(updated);
          onUpdateKoc(updated, `Đã tải ${nextVideos?.length || 0} video và cập nhật chỉ số kênh @${koc.channelId.replace(/^@/, '')}`);
        }
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
  const medianViewsToShow =
    liveMedianViews ??
    koc.medianViews ??
    (videosToShow.length > 0 ? computeMedianViews(videosToShow.map((v) => v.views)) : undefined);
  const avgCommentsToShow = liveAvgComments ?? koc.avgComments;
  const avgSharesToShow = liveAvgShares ?? koc.avgShares;
  const erToShow = liveEr ?? koc.engagementRate;

  const shares = [
    { label: 'Video ngắn', value: koc.gmvShareVideo || 0, color: CHANNELS.tiktok.color },
    { label: 'Livestream', value: koc.gmvShareLive || 0, color: CHANNELS.live.color },
    { label: 'Thẻ sản phẩm / Giỏ hàng', value: koc.gmvShareProductCard || 0, color: CHANNELS.other.color },
  ].filter((s) => s.value > 0);

  const shareTotal = shares.reduce((s, x) => s + x.value, 0);

  const topCats =
    koc.tiktokTopCategories && koc.tiktokTopCategories.length > 0
      ? koc.tiktokTopCategories
      : [koc.tepKenh, koc.kocCategory, koc.niche].filter(Boolean) as string[];

  const locations = koc.tiktokAudienceLocations || [];

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
              <span className="text-sm font-semibold text-ink">
                {koc.tiktokSellerSyncedAt ? 'Đã đồng bộ TikTok Seller Center' : 'Chỉ số kênh TikTok & Bán hàng'}
              </span>
              {koc.tiktokAccountHealth && (
                <span className="inline-flex items-center gap-1 text-2xs font-medium text-positive">
                  <CheckCircle2 className="w-3 h-3" /> {koc.tiktokAccountHealth}
                </span>
              )}
            </div>
            <p className="text-2xs text-ink-3">
              {koc.tiktokSellerSyncedAt || koc.metricsUpdatedAt
                ? `Cập nhật lúc ${koc.tiktokSellerSyncedAt || koc.metricsUpdatedAt}`
                : 'Chưa đồng bộ lần đầu'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-2xs text-ink-3 block">Điểm uy tín nhà sáng tạo</span>
            <span className="font-semibold text-warning inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              {koc.tiktokShopRating ? `${koc.tiktokShopRating} / 5.0` : '—'}
            </span>
          </div>
          <div className="text-right border-l border-line pl-4">
            <span className="text-2xs text-ink-3 block">Tỷ lệ hoàn/hủy đơn liên kết</span>
            <span className="font-semibold text-positive">
              {koc.tiktokCancellationRate !== undefined ? `${koc.tiktokCancellationRate}%` : '—'}
            </span>
          </div>
          {onUpdate && (
            <Button size="sm" icon={RefreshCw} onClick={onUpdate} className="ml-2">
              Cập nhật &amp; Đồng bộ
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
                medianViewsToShow !== undefined && medianViewsToShow > 0
                  ? `View trung vị: ${formatNumber(medianViewsToShow)} view${videosToShow.length > 0 ? ` (${videosToShow.length} bài)` : ''}`
                  : koc.tiktokTotal30dViews
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
              value={koc.gpm ? formatVndShort(koc.gpm) : '—'}
              note={koc.aov ? `Đơn TB: ${formatVndShort(koc.aov)}` : 'Chưa cập nhật AOV'}
            />
          </StatRow>
        </div>
      </div>

      {/* Phễu tương tác & Chuyển đổi TikTok Seller */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">Tỷ lệ tương tác kênh (ER)</span>
          <span className="text-lg font-semibold text-ink">
            {erToShow !== undefined && erToShow > 0 ? `${erToShow}%` : '—'}
          </span>
          <span className="text-2xs text-ink-3 block mt-0.5">
            {avgLikesToShow
              ? `TB ${formatNumber(avgLikesToShow)} tim · ${formatNumber(avgCommentsToShow || 0)} bình luận · ${formatNumber(avgSharesToShow || 0)} chia sẻ`
              : 'Thích, bình luận & chia sẻ'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">CTR nhấp giỏ hàng</span>
          <span className="text-lg font-semibold text-accent">
            {koc.tiktokAvgCtr !== undefined && koc.tiktokAvgCtr > 0 ? `${koc.tiktokAvgCtr}%` : '—'}
          </span>
          <span className="text-2xs text-ink-3 block mt-0.5">Nhấp xem thẻ sản phẩm</span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">CVR chuyển đổi đơn</span>
          <span className="text-lg font-semibold text-positive">
            {koc.tiktokAvgCvr !== undefined && koc.tiktokAvgCvr > 0 ? `${koc.tiktokAvgCvr}%` : '—'}
          </span>
          <span className="text-2xs text-ink-3 block mt-0.5">Tỷ lệ chốt đơn mua</span>
        </div>
        <div className="p-3.5 rounded-xl border border-line bg-surface">
          <span className="text-2xs text-ink-3 block mb-1">Hoa hồng Affiliate trung bình</span>
          <span className="text-lg font-semibold text-ink">
            {koc.tiktokAvgCommissionRate !== undefined && koc.tiktokAvgCommissionRate > 0
              ? `${koc.tiktokAvgCommissionRate}%`
              : '—'}
          </span>
          <span className="text-2xs text-ink-3 block mt-0.5">Mức nhận từ nhãn hàng</span>
        </div>
      </div>

      {/* Cơ cấu doanh số & Ngành hàng & Khán giả */}
      <div className="grid md:grid-cols-2 gap-6 pt-2">
        {/* Doanh số theo định dạng */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-ink">Cơ cấu doanh thu theo nguồn</h4>
          <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
            {shares.length > 0 && shareTotal > 0 ? (
              <>
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
              </>
            ) : (
              <p className="text-xs text-ink-3">Chưa có dữ liệu phân bổ nguồn doanh thu</p>
            )}
          </div>

          <h4 className="text-xs font-semibold text-ink pt-2">Ngành hàng trọng tâm</h4>
          <div className="text-xs text-ink-2">
            {topCats.length > 0 ? topCats.join(' · ') : 'Chưa cập nhật'}
          </div>
        </div>

        {/* Khán giả & Nhân khẩu học */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-ink">Nhân khẩu học khán giả</h4>
          <div className="p-4 rounded-xl border border-line bg-surface space-y-4 text-xs">
            {koc.femaleRatio !== undefined || koc.maleRatio !== undefined ? (
              <div>
                <div className="flex justify-between text-2xs text-ink-3 mb-1">
                  <span>Giới tính người xem</span>
                  <span>
                    Nữ {koc.femaleRatio ?? Math.max(0, 100 - (koc.maleRatio || 0))}% · Nam{' '}
                    {koc.maleRatio ?? Math.max(0, 100 - (koc.femaleRatio || 0))}%
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-sunken">
                  <div
                    style={{ width: `${koc.femaleRatio ?? Math.max(0, 100 - (koc.maleRatio || 0))}%` }}
                    className="data-bar bg-accent"
                  />
                  <div
                    style={{ width: `${koc.maleRatio ?? Math.max(0, 100 - (koc.femaleRatio || 0))}%` }}
                    className="data-bar bg-ink-3"
                  />
                </div>
              </div>
            ) : (
              <div className="text-2xs text-ink-3">Giới tính người xem: Chưa cập nhật</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-1 border-t border-line">
              <div className="p-2 rounded-lg bg-sunken/60">
                <span className="text-2xs text-ink-3 block">18–24 tuổi</span>
                <span className="text-sm font-semibold text-ink">
                  {koc.age18_24 !== undefined ? pct(koc.age18_24) : '—'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-sunken/60">
                <span className="text-2xs text-ink-3 block">25–34 tuổi</span>
                <span className="text-sm font-semibold text-accent">
                  {koc.age25_34 !== undefined ? pct(koc.age25_34) : '—'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-sunken/60">
                <span className="text-2xs text-ink-3 block">Trên 35 tuổi</span>
                <span className="text-sm font-semibold text-ink">
                  {koc.age35Plus !== undefined ? pct(koc.age35Plus) : '—'}
                </span>
              </div>
            </div>

            {locations.length > 0 && (
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
            )}
          </div>
        </div>
      </div>

      {/* Danh sách video & nội dung gần nhất trên kênh TikTok */}
      <Panel
        flush
        title={`Danh sách video & nội dung gần nhất trên kênh (${videosToShow.length}${videoCountToShow ? ` / ${formatNumber(videoCountToShow)}` : ''} bài${medianViewsToShow ? ` · View trung vị: ${formatNumber(medianViewsToShow)}` : ''})`}
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
   MODAL PHÂN BỔ KÊNH THỰC THI CỦA ĐỢT HỢP TÁC (RIÊNG 1 KÊNH vs ĐA KÊNH)
   ========================================================================= */

function DealChannelScopeModal({
  deal,
  koc,
  onClose,
  onUpdateKoc,
}: {
  deal: BookingDealItem;
  koc: KocItem;
  onClose: () => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
}) {
  const connectedChannels = useMemo(() => getKocConnectedChannels(koc), [koc]);
  const currentBreakdown = useMemo(() => getDealChannelBreakdown(deal, koc), [deal, koc]);

  const [scopeMode, setScopeMode] = useState<'SINGLE' | 'MULTI'>(() =>
    currentBreakdown.channels.length > 1 ? 'MULTI' : 'SINGLE',
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    const init = currentBreakdown.channels.map((c) => `${c.platform}::${c.handle}`);
    if (init.length > 0) return init;
    const first = connectedChannels[0];
    return first ? [`${first.platform}::${first.handle}`] : [`TIKTOK::${koc.channelId.replace(/^@/, '')}`];
  });

  const [newPlat, setNewPlat] = useState<KocPlatformType>('TIKTOK');
  const [newHandle, setNewHandle] = useState('');

  const allSelectableChannels = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        platform: KocPlatformType;
        handle: string;
        roleLabel: string;
        isPrimary?: boolean;
      }
    >();

    for (const ch of connectedChannels) {
      const k = `${ch.platform}::${ch.handle}`;
      map.set(k.toLowerCase(), {
        key: k,
        platform: ch.platform,
        handle: ch.handle,
        roleLabel:
          ch.platform === 'TIKTOK'
            ? ch.isPrimary
              ? 'Kênh TikTok chính'
              : ch.roleLabel || 'Kênh TikTok phụ'
            : ch.roleLabel || KOC_PLATFORM_LABEL[ch.platform],
        isPrimary: ch.isPrimary,
      });
    }

    for (const ch of currentBreakdown.channels) {
      const k = `${ch.platform}::${ch.handle}`;
      if (!map.has(k.toLowerCase())) {
        map.set(k.toLowerCase(), {
          key: k,
          platform: ch.platform,
          handle: ch.handle,
          roleLabel: KOC_PLATFORM_LABEL[ch.platform],
        });
      }
    }

    return Array.from(map.values());
  }, [connectedChannels, currentBreakdown]);

  const isSelected = (key: string) =>
    selectedKeys.some((k) => k.toLowerCase() === key.toLowerCase());

  const handleToggleChannel = (key: string) => {
    if (scopeMode === 'SINGLE') {
      setSelectedKeys([key]);
      return;
    }
    setSelectedKeys((prev) => {
      const exists = prev.some((k) => k.toLowerCase() === key.toLowerCase());
      if (exists) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k.toLowerCase() !== key.toLowerCase());
      }
      return [...prev, key];
    });
  };

  const handleAddQuickChannel = () => {
    const clean = newHandle.trim().replace(/^@/, '');
    if (!clean) return;
    const key = `${newPlat}::${clean}`;
    if (onUpdateKoc) {
      const nextChannels = [
        ...connectedChannels,
        {
          id: `${koc.id}-ch-${newPlat.toLowerCase()}-${Date.now()}`,
          platform: newPlat,
          handle: clean,
          isPrimary: false,
          roleLabel:
            newPlat === 'TIKTOK'
              ? 'Kênh TikTok phụ'
              : `Kênh ${KOC_PLATFORM_LABEL[newPlat]}`,
        },
      ];
      const updatedKoc = syncKocWithConnectedChannels(koc, nextChannels);
      onUpdateKoc(updatedKoc, `Đã thêm kênh @${clean} vào tài khoản KOC ${koc.stageName}`);
    }
    if (scopeMode === 'SINGLE') {
      setSelectedKeys([key]);
    } else {
      setSelectedKeys((prev) =>
        prev.some((k) => k.toLowerCase() === key.toLowerCase()) ? prev : [...prev, key],
      );
    }
    setNewHandle('');
  };

  const handleSaveScope = () => {
    const finalKeys =
      scopeMode === 'SINGLE' ? selectedKeys.slice(0, 1) : selectedKeys;
    if (finalKeys.length === 0) return;
    saveDealChannelScopeOverride(deal.id, deal.dealCode, finalKeys);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Phân bổ kênh thực thi · ${deal.dealCode}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSaveScope}>
            Lưu phạm vi kênh ({scopeMode === 'SINGLE' ? 'Riêng 1 kênh' : `${selectedKeys.length} kênh`})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-sunken/40 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-ink">{deal.brandName}</span>
            {deal.productName ? <span className="text-ink-2"> · {deal.productName}</span> : null}
            <div className="text-2xs text-ink-3 mt-0.5">
              Mã đợt: <span className="font-mono text-ink-2">{deal.dealCode}</span> · Tài khoản KOC chính: <span className="font-medium text-ink">{koc.stageName}</span>
            </div>
          </div>
          <Status tone={scopeMode === 'MULTI' && selectedKeys.length > 1 ? 'info' : 'neutral'}>
            {scopeMode === 'MULTI' && selectedKeys.length > 1
              ? `Đa kênh (${selectedKeys.length} kênh)`
              : 'Riêng 1 kênh'}
          </Status>
        </div>

        {/* Chọn chế độ: Riêng 1 kênh hoặc Đa kênh */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setScopeMode('SINGLE');
              if (selectedKeys.length > 1) {
                setSelectedKeys([selectedKeys[0]]);
              }
            }}
            className={cx(
              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
              scopeMode === 'SINGLE'
                ? 'border-accent bg-accent-soft/40'
                : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span className="text-xs font-semibold text-ink">Hợp tác riêng 1 kênh</span>
            <Status tone={scopeMode === 'SINGLE' ? 'info' : 'neutral'}>1 tài khoản</Status>
          </button>

          <button
            type="button"
            onClick={() => setScopeMode('MULTI')}
            className={cx(
              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
              scopeMode === 'MULTI'
                ? 'border-accent bg-accent-soft/40'
                : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span className="text-xs font-semibold text-ink">Hợp tác Đa kênh</span>
            <Status tone={scopeMode === 'MULTI' ? 'info' : 'neutral'}>Nhiều tài khoản</Status>
          </button>
        </div>

        {/* Danh sách các tài khoản kênh của KOC để chọn */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">
              Chọn tài khoản kênh tham gia đợt hợp tác ({allSelectableChannels.length} kênh khả dụng)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {allSelectableChannels.map((ch) => {
              const checked = isSelected(ch.key);
              const prefix =
                ch.platform === 'TIKTOK' || ch.platform === 'INSTAGRAM' || ch.platform === 'THREADS'
                  ? '@'
                  : '';
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => handleToggleChannel(ch.key)}
                  className={cx(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    checked
                      ? 'border-accent bg-accent-soft/30'
                      : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-sunken">
                      <PlatformChannelIcon platform={ch.platform} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-ink">
                          {prefix}{ch.handle}
                        </span>
                        <Status tone={ch.isPrimary ? 'positive' : 'neutral'}>
                          {ch.roleLabel}
                        </Status>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cx(
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                      checked
                        ? 'border-accent bg-accent text-white'
                        : 'border-line-strong bg-surface text-transparent',
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thêm nhanh tài khoản kênh mới nếu chưa có trong danh sách */}
        <div className="rounded-lg border border-line bg-sunken/30 p-3 space-y-2">
          <div className="text-2xs font-medium text-ink-2">
            Thêm nhanh kênh khác của KOC vào đợt hợp tác này:
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <Select
                value={newPlat}
                onChange={(e) => setNewPlat(e.target.value as KocPlatformType)}
              >
                <option value="TIKTOK">TikTok</option>
                <option value="SHOPEE">Shopee Video</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="THREADS">Threads</option>
              </Select>
            </div>
            <div className="sm:col-span-5">
              <Input
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="@handle kênh..."
              />
            </div>
            <div className="sm:col-span-3">
              <Button
                variant="secondary"
                className="w-full justify-center"
                icon={Plus}
                onClick={handleAddQuickChannel}
                disabled={!newHandle.trim()}
              >
                Thêm kênh
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================================
   2. LỊCH SỬ HỢP TÁC & HIỆU QUẢ HỢP TÁC CHI TIẾT (TÂM ĐIỂM NGHIỆP VỤ B2C)
   ========================================================================= */

function CollaborationHistorySection({
  koc,
  deals,
  allDeals,
  stats,
  currentUser,
  channelScopeVersion = 0,
  onViewDetail,
  onOpenHistoryEvaluation,
  onSearchSocialChannels,
  onUpdateKoc,
}: {
  koc: KocItem;
  deals: BookingDealItem[];
  allDeals?: BookingDealItem[];
  stats: KocPerformanceSummary;
  currentUser?: UserProfile;
  channelScopeVersion?: number;
  onViewDetail: (d: BookingDealItem) => void;
  onOpenHistoryEvaluation?: () => void;
  onSearchSocialChannels?: (koc: KocItem) => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
}) {
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('ALL');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [askDeal, setAskDeal] = useState<BookingDealItem | null>(null);
  const [editingChannelDeal, setEditingChannelDeal] = useState<BookingDealItem | null>(null);

  const connectedChannels = useMemo(() => getKocConnectedChannels(koc), [koc]);
  const detailedDeals = useMemo(() => deals.filter((d) => !isMasterSummaryDeal(d)), [deals]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const singleChannelDealsCount = useMemo(
    () => detailedDeals.filter((d) => !getDealChannelBreakdown(d, koc).isMultiChannel).length,
    [detailedDeals, koc, channelScopeVersion],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const multiChannelDealsCount = useMemo(
    () => detailedDeals.filter((d) => getDealChannelBreakdown(d, koc).isMultiChannel).length,
    [detailedDeals, koc, channelScopeVersion],
  );

  // Thống kê số đợt & GMV theo từng tài khoản kênh kết nối của KOC
  const channelAccountStats = useMemo(() => {
    return connectedChannels.map((ch) => {
      const key = `${ch.platform}::${ch.handle}`;
      const matched = filterDealsByChannelScope(detailedDeals, koc, key);
      const gmv = matched.reduce((s, d) => s + (d.gmv30 || d.affiliateGmv || 0), 0);
      return {
        channel: ch,
        key,
        dealsCount: matched.length,
        gmv,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedChannels, detailedDeals, koc, channelScopeVersion]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayStats = useMemo(
    () =>
      selectedChannelFilter === 'ALL'
        ? stats
        : calculateKocPerformanceStats(allDeals || deals, koc, selectedChannelFilter),
    [selectedChannelFilter, stats, allDeals, deals, koc, channelScopeVersion],
  );

  // Danh sách các Brand đã từng hợp tác
  const brandList = useMemo(() => Array.from(new Set(deals.map((d) => d.brandName).filter(Boolean))), [deals]);

  const [showWeekly, setShowWeekly] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredDeals = useMemo(() => {
    const channelScoped = filterDealsByChannelScope(deals, koc, selectedChannelFilter);
    return channelScoped.filter((d) => {
      // Đợt chỉ có số tổng từ Master không có chi tiết: gom thành một dòng dưới bảng
      if (isMasterSummaryDeal(d)) return false;
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
  }, [deals, koc, selectedChannelFilter, selectedBrandFilter, selectedFormatFilter, searchQuery, channelScopeVersion]);

  const columns: Column<BookingDealItem>[] = [
    {
      key: 'campaign',
      header: 'Đợt hợp tác',
      width: 225,
      render: (d) => {
        const date = d.postedDate || d.deadlinePost;
        const format = (d.totalValue || 0) === 0 ? 'FOC' : d.bookingFormat === 'Booking Livestream KOC' ? 'Livestream' : 'Paid';
        return isMasterSummaryDeal(d) ? (
          <div className="min-w-0 max-w-[225px] leading-snug">
            <span className="block text-ctl text-ink-2">Đợt book theo Master KOC</span>
            <span className="block text-2xs text-ink-3">
              Chưa có chi tiết trên hệ thống{d.bookingBatch ? ` · gần nhất ${d.bookingBatch}` : ''}
            </span>
          </div>
        ) : (
          <div className="min-w-0 max-w-[225px] leading-snug" title={[d.campaignTitle, d.productName, d.dealCode].filter(Boolean).join('\n')}>
            <span className="block font-medium text-ink text-ctl hover:text-accent cursor-pointer truncate" onClick={() => onViewDetail(d)}>
              {d.brandName}
              {d.productName ? <span className="font-normal text-ink-2"> · {d.productName}</span> : null}
            </span>
            <span className="block truncate text-2xs text-ink-3">
              <span className="font-figure">{d.dealCode}</span> · {format}
              {date ? ` · ${shortDate(date)}` : ''}
            </span>
          </div>
        );
      },
    },
    {
      key: 'channelScope',
      header: 'Kênh hợp tác',
      width: 215,
      render: (d) => {
        const bd = getDealChannelBreakdown(d, koc);
        return (
          <div className="grid gap-1.5 justify-items-start max-w-[215px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <Status tone={bd.isMultiChannel ? 'info' : 'neutral'}>{bd.scopeLabel}</Status>
              <button
                type="button"
                onClick={() => setEditingChannelDeal(d)}
                className="text-2xs font-medium text-accent hover:underline"
              >
                Phân kênh
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {bd.channels.map((ch) => {
                const prefix =
                  ch.platform === 'TIKTOK' || ch.platform === 'INSTAGRAM' || ch.platform === 'THREADS'
                    ? '@'
                    : '';
                return (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => setEditingChannelDeal(d)}
                    title={`Bấm để cấu hình kênh cho ${d.dealCode}`}
                    className="inline-flex items-center gap-1 rounded border border-line bg-sunken/50 px-1.5 py-0.5 font-mono text-2xs text-ink hover:border-line-strong"
                  >
                    <PlatformChannelIcon platform={ch.platform} className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[130px]">
                      {prefix}{ch.handle}
                    </span>
                  </button>
                );
              })}
            </div>
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
          <span className="font-semibold text-ink block text-ctl font-figure">
            {d.totalValue ? formatVndShort(d.totalValue) : <span className="text-ink-2 font-medium">0đ (FOC)</span>}
          </span>
          {d.focSampleCost ? (
            <span className="text-2xs text-ink-3 block">Mẫu: {formatVndShort(d.focSampleCost)}</span>
          ) : null}
          {d.sparkAdsBudget ? (
            <span className="text-2xs text-ink-3 block">Ads: {formatVndShort(d.sparkAdsBudget)}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'outcomes',
      header: 'GMV · đơn · lượt xem',
      align: 'right',
      width: 150,
      render: (d) => {
        const summary = isMasterSummaryDeal(d);
        const gmv = summary ? 0 : d.gmv30 || d.affiliateGmv || 0;
        const orders = summary ? 0 : d.ordersCount || 0;
        const roi = gmv > 0 && d.totalValue && d.totalValue > 0 ? gmv / d.totalValue : 0;
        const views = dealViewsOf(d);
        return (
          <div className="text-right">
            <span className="font-semibold text-ink block text-ctl font-figure">
              {gmv > 0 ? formatVndShort(gmv) : <span className="text-ink-3 font-normal">—</span>}
            </span>
            {(orders > 0 || roi > 0) && (
              <span className="block text-2xs text-ink-2 tabular-nums mt-0.5">
                {[orders > 0 ? `${formatNumber(orders)} đơn` : '', roi > 0 ? `ROI ${roi.toFixed(1)}x` : ''].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className="text-2xs text-ink-3 block mt-0.5 tabular-nums">
              {views > 0 ? `${formatNumber(views)} lượt xem` : 'Chưa có lượt xem'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'quality',
      header: 'Tiến độ & Đánh giá',
      width: 130,
      render: (d) => {
        const onTime = dealPostOnTimeOf(d);
        const rating = dealRatingOf(d);
        return (
          <div className="grid gap-1">
            <div className="flex items-center gap-1 text-2xs">
              {rating ? (
                <span className="inline-flex items-center gap-0.5 text-warning font-semibold">
                  <Star className="w-3 h-3 fill-current" />
                  {rating}
                </span>
              ) : (
                <span className="text-ink-3">—</span>
              )}
              <span className="text-ink-3">·</span>
              {onTime !== undefined ? (
                <span className={onTime ? 'text-positive font-medium' : 'text-critical font-medium'}>
                  {onTime ? 'Đúng hạn' : 'Trễ hạn'}
                </span>
              ) : (
                <span className="text-ink-3">Chưa xác nhận</span>
              )}
            </div>
            {d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU' && !isMasterSummaryDeal(d) && (
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

  const summaryDeals = deals.filter(isMasterSummaryDeal).length;

  return (
    <div className="space-y-4">
      {/* Khối Quản lý Tài khoản KOC & Phân rã Lịch sử Hợp tác Đa kênh */}
      <Panel
        icon={Layers}
        title="Tài khoản KOC & Phân rã hợp tác đa kênh"
        meta={`${connectedChannels.length} tài khoản kết nối · Riêng 1 kênh: ${formatNumber(singleChannelDealsCount)} đợt · Đa kênh: ${formatNumber(multiChannelDealsCount)} đợt`}
        actions={
          <div className="flex items-center gap-2">
            {selectedChannelFilter !== 'ALL' && (
              <Button size="sm" variant="ghost" onClick={() => setSelectedChannelFilter('ALL')}>
                Bỏ lọc kênh
              </Button>
            )}
            {onSearchSocialChannels && (
              <Button
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() => onSearchSocialChannels(koc)}
              >
                Quản lý tài khoản &amp; kênh ({connectedChannels.length})
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {/* Hàng 1: 3 thẻ lọc theo phạm vi hợp tác (Tất cả · Riêng 1 kênh · Đa kênh) */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setSelectedChannelFilter('ALL')}
              className={cx(
                'flex items-center justify-between rounded-lg border px-3.5 py-2 text-left transition-colors',
                selectedChannelFilter === 'ALL'
                  ? 'border-accent bg-accent-soft/40'
                  : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className="text-xs font-semibold text-ink">Tất cả đợt hợp tác</span>
              <Status tone={selectedChannelFilter === 'ALL' ? 'info' : 'neutral'}>
                {formatNumber(detailedDeals.length)} đợt
              </Status>
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedChannelFilter(
                  selectedChannelFilter === 'SINGLE_CHANNEL' ? 'ALL' : 'SINGLE_CHANNEL',
                )
              }
              className={cx(
                'flex items-center justify-between rounded-lg border px-3.5 py-2 text-left transition-colors',
                selectedChannelFilter === 'SINGLE_CHANNEL'
                  ? 'border-accent bg-accent-soft/40'
                  : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className="text-xs font-semibold text-ink">Hợp tác riêng 1 kênh</span>
              <Status tone={selectedChannelFilter === 'SINGLE_CHANNEL' ? 'info' : 'neutral'}>
                {formatNumber(singleChannelDealsCount)} đợt
              </Status>
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedChannelFilter(
                  selectedChannelFilter === 'MULTI_CHANNEL' ? 'ALL' : 'MULTI_CHANNEL',
                )
              }
              className={cx(
                'flex items-center justify-between rounded-lg border px-3.5 py-2 text-left transition-colors',
                selectedChannelFilter === 'MULTI_CHANNEL'
                  ? 'border-accent bg-accent-soft/40'
                  : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className="text-xs font-semibold text-ink">Hợp tác Đa kênh</span>
              <Status tone={selectedChannelFilter === 'MULTI_CHANNEL' ? 'info' : 'neutral'}>
                {formatNumber(multiChannelDealsCount)} đợt
              </Status>
            </button>
          </div>

          {/* Hàng 2: Danh sách từng tài khoản kênh kết nối (TikTok chính, TikTok phụ, Shopee, FB, IG, Threads) */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {channelAccountStats.map(({ channel: ch, key, dealsCount, gmv }) => {
              const isActive = selectedChannelFilter.toLowerCase() === key.toLowerCase();
              const prefix =
                ch.platform === 'TIKTOK' || ch.platform === 'INSTAGRAM' || ch.platform === 'THREADS'
                  ? '@'
                  : '';
              const roleTag =
                ch.platform === 'TIKTOK'
                  ? ch.isPrimary
                    ? 'TikTok chính'
                    : ch.roleLabel || 'TikTok phụ'
                  : KOC_PLATFORM_LABEL[ch.platform];

              return (
                <div
                  key={key}
                  onClick={() => setSelectedChannelFilter(isActive ? 'ALL' : key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedChannelFilter(isActive ? 'ALL' : key);
                    }
                  }}
                  className={cx(
                    'flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                    isActive
                      ? 'border-accent bg-accent-soft/40'
                      : 'border-line bg-sunken/30 hover:border-line-strong hover:bg-surface',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface">
                      <PlatformChannelIcon platform={ch.platform} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-xs font-semibold text-ink">
                          {prefix}{ch.handle}
                        </span>
                        {ch.url && (
                          <a
                            href={ch.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-ink-3 hover:text-accent shrink-0"
                            title="Mở trang kênh"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-2xs text-ink-3 mt-0.5">
                        <span>{roleTag}</span>
                        {gmv > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-figure text-ink-2">GMV {formatVndShort(gmv)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Status tone={isActive ? 'info' : dealsCount > 0 ? 'positive' : 'neutral'}>
                    {formatNumber(dealsCount)} đợt
                  </Status>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* 4 ô chính; số đơn, chi phí, số deal làm mẫu số nằm ở dòng ghi chú (tự động tính lại khi lọc riêng 1 kênh / đa kênh) */}
      <StatRow>
        <Stat
          label="GMV từ booking"
          value={displayStats.totalGmv > 0 ? formatVndShort(displayStats.totalGmv) : '—'}
          note={[
            displayStats.totalOrders > 0 ? `${formatNumber(displayStats.totalOrders)} đơn` : '',
            `${formatNumber(displayStats.completedDeals)} xong · ${formatNumber(displayStats.runningDeals)} đang chạy`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <Stat
          label="ROI"
          value={displayStats.overallRoi > 0 ? `${displayStats.overallRoi.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x` : '—'}
          note={`Chi phí Net ${formatVndShort(displayStats.totalSpentNet)}`}
        />
        <Stat
          label="Lượt xem TB / video"
          value={displayStats.avgViewsPerCollab > 0 ? formatNumber(displayStats.avgViewsPerCollab) : '—'}
          note={`${formatNumber(displayStats.viewsDealsCount)} video có số`}
        />
        <Stat
          label="Đánh giá TB"
          value={displayStats.ratedDealsCount > 0 ? `${displayStats.avgRatingScore.toLocaleString('vi-VN')} / 5` : '—'}
          note={
            displayStats.postCheckedDealsCount > 0
              ? `${displayStats.onTimePostRate}% đăng đúng hạn · ${formatNumber(displayStats.ratedDealsCount)} deal có điểm`
              : `${formatNumber(displayStats.ratedDealsCount)} deal có điểm`
          }
        />
      </StatRow>

      <Panel
        flush
        icon={History}
        title="Các đợt hợp tác"
        meta={`${formatNumber(filteredDeals.length)} / ${formatNumber(deals.length - summaryDeals)} đợt có chi tiết · Riêng 1 kênh: ${formatNumber(singleChannelDealsCount)} · Đa kênh: ${formatNumber(multiChannelDealsCount)}${
          displayStats.uniqueBrands.length ? ` · ${displayStats.uniqueBrands.join(', ')}` : ''
        }`}
        actions={
          <div className="flex items-center gap-1.5">
            {onOpenHistoryEvaluation && (
              <Button size="sm" variant="ghost" icon={FileText} onClick={onOpenHistoryEvaluation}>
                Đánh giá lịch sử &amp; rủi ro
              </Button>
            )}
          </div>
        }
      >
        <div className="px-4 pb-3 border-b border-line">
          <FilterBar
            search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Sản phẩm, mã BO, chiến dịch' }}
            filters={
              <>
                <Select
                  value={selectedChannelFilter}
                  onChange={(e) => setSelectedChannelFilter(e.target.value)}
                  aria-label="Phạm vi kênh"
                  className="w-auto"
                >
                  <option value="ALL">Tất cả kênh ({detailedDeals.length} đợt)</option>
                  <option value="SINGLE_CHANNEL">Riêng 1 kênh ({singleChannelDealsCount})</option>
                  <option value="MULTI_CHANNEL">Đa kênh ({multiChannelDealsCount})</option>
                  {connectedChannels.map((ch) => {
                    const key = `${ch.platform}::${ch.handle}`;
                    return (
                      <option key={key} value={key}>
                        {KOC_PLATFORM_LABEL[ch.platform]}: @{ch.handle}{' '}
                        {ch.platform === 'TIKTOK'
                          ? ch.isPrimary
                            ? '(Kênh chính)'
                            : `(${ch.roleLabel || 'Kênh phụ'})`
                          : ''}
                      </option>
                    );
                  })}
                </Select>
                <Select value={selectedBrandFilter} onChange={(e) => setSelectedBrandFilter(e.target.value)} aria-label="Nhãn hàng" className="w-auto">
                  <option value="ALL">Mọi nhãn hàng ({brandList.length})</option>
                  {brandList.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
                <Select value={selectedFormatFilter} onChange={(e) => setSelectedFormatFilter(e.target.value)} aria-label="Hình thức" className="w-auto">
                  <option value="ALL">Mọi hình thức</option>
                  <option value="PAID">Video trả phí</option>
                  <option value="FOC">Gửi mẫu FOC</option>
                  <option value="LIVE">Livestream</option>
                </Select>
              </>
            }
          />
        </div>
        <DataTable
          columns={columns}
          rows={filteredDeals}
          rowKey={(d) => d.id}
          empty={
            <EmptyState
              title={summaryDeals > 0 && deals.length === summaryDeals ? 'Chưa có chi tiết đợt nào trên hệ thống' : 'Chưa có dữ liệu hợp tác phù hợp'}
              description={
                summaryDeals > 0 && deals.length === summaryDeals
                  ? 'Master KOC chỉ ghi số tổng, chưa có mã BO hay số liệu từng đợt.'
                  : 'Thử thay đổi bộ lọc nhãn hàng hoặc xóa từ khóa tìm kiếm.'
              }
            />
          }
        />
        {summaryDeals > 0 && (
          <p className="px-4 py-2.5 border-t border-line text-2xs text-ink-3">
            +{formatNumber(summaryDeals)} đợt chỉ có số tổng từ Master KOC, chưa có chi tiết trên hệ thống.
          </p>
        )}
      </Panel>

      {/* Video Ads theo tuần: công cụ đối soát, mở khi cần */}
      <div className="rounded-xl border border-line bg-surface">
        <button
          type="button"
          onClick={() => setShowWeekly((v) => !v)}
          aria-expanded={showWeekly}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-ctl text-ink hover:bg-canvas rounded-xl"
        >
          <span className="font-medium">Lịch sử Video Ads theo tuần</span>
          <ChevronRight className={cx('w-4 h-4 text-ink-3 transition-transform', showWeekly && 'rotate-90')} />
        </button>
        {showWeekly && (
          <div className="border-t border-line">
            <KocVideoWeeklyHistoryPanel targetKoc={koc} />
          </div>
        )}
      </div>

      {/* Modal phân bổ kênh hợp tác (Riêng 1 kênh vs Đa kênh) */}
      {editingChannelDeal && (
        <DealChannelScopeModal
          deal={editingChannelDeal}
          koc={koc}
          onClose={() => setEditingChannelDeal(null)}
          onUpdateKoc={onUpdateKoc}
        />
      )}

      {/* Modal hỏi đồng nghiệp */}
      {askDeal && (
        <AskColleagueModal
          key={askDeal.id}
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
}: {
  deals: BookingDealItem[];
  onViewDetail: (d: BookingDealItem) => void;
}) {
  const columns: Column<BookingDealItem>[] = [
    {
      key: 'deal',
      header: 'Booking & Chiến dịch',
      width: 220,
      render: (d) => (
        <div className="min-w-0 max-w-[240px]">
          <span className="block truncate font-semibold text-ink text-ctl" title={d.campaignTitle || d.productName}>
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
  currentUser,
  onSearchSocialChannels,
  onUpdateKoc,
}: {
  koc: KocItem;
  currentUser?: UserProfile;
  onSearchSocialChannels?: (k: KocItem) => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
}) {
  const allowedPii = canRevealSensitive(currentUser, koc);
  const prefs = koc.samplePreferences;
  const connectedChannels = useMemo(() => getKocConnectedChannels(koc), [koc]);
  const socialLinks = connectedChannels.map((ch) => {
    const Logo =
      ch.platform === 'SHOPEE'
        ? ShopeeLogo
        : ch.platform === 'FACEBOOK'
          ? FacebookLogo
          : ch.platform === 'INSTAGRAM'
            ? InstagramLogo
            : ch.platform === 'THREADS'
              ? ThreadsLogo
              : TikTokLogo;
    const label =
      ch.platform === 'TIKTOK'
        ? ch.isPrimary
          ? 'TikTok chính'
          : ch.roleLabel || 'TikTok phụ'
        : KOC_PLATFORM_LABEL[ch.platform];
    const prefix =
      ch.platform === 'TIKTOK' || ch.platform === 'INSTAGRAM' || ch.platform === 'THREADS'
        ? '@'
        : '';
    return {
      key: `${ch.platform}::${ch.handle}`,
      name: label,
      platform: ch.platform,
      Logo,
      text: `${prefix}${ch.handle}`,
      href:
        ch.url ||
        (ch.platform === 'TIKTOK'
          ? `https://www.tiktok.com/@${ch.handle}`
          : formatSocialChannelUrl(
              ch.platform as 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS',
              ch.handle,
            )),
    };
  });
  const missingSocial = ['Shopee', 'Facebook', 'Instagram', 'Threads'].filter(
    (n) => !connectedChannels.some((c) => KOC_PLATFORM_LABEL[c.platform] === n),
  );

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [draftEmail, setDraftEmail] = useState(koc.email || '');
  const [draftPhone, setDraftPhone] = useState(koc.phone || '');
  const [draftZalo, setDraftZalo] = useState(koc.zalo || '');
  const [draftLocation, setDraftLocation] = useState(koc.location || 'Hà Nội');
  const [draftRecipient, setDraftRecipient] = useState(
    koc.shippingRecipientName || koc.realName || koc.stageName || ''
  );
  const [draftShippingPhone, setDraftShippingPhone] = useState(
    koc.shippingPhone || koc.phone || ''
  );
  const [draftShippingAddress, setDraftShippingAddress] = useState(
    koc.shippingAddress || ''
  );
  const [draftShippingNotes, setDraftShippingNotes] = useState(
    koc.shippingNotes || ''
  );

  const openFullContactEdit = () => {
    setDraftEmail(koc.email || '');
    setDraftPhone(koc.phone || '');
    setDraftZalo(koc.zalo || '');
    setDraftLocation(koc.location || 'Hà Nội');
    setDraftRecipient(koc.shippingRecipientName || koc.realName || koc.stageName || '');
    setDraftShippingPhone(koc.shippingPhone || koc.phone || '');
    setDraftShippingAddress(koc.shippingAddress || '');
    setDraftShippingNotes(koc.shippingNotes || '');
    setIsEditingContact(true);
  };

  const handleSaveFullContact = () => {
    const nextEmail = draftEmail.trim() || undefined;
    const nextPhone = draftPhone.trim();
    const baseUpdated: KocItem = {
      ...koc,
      email: nextEmail,
      phone: nextPhone,
      zalo: draftZalo.trim() || nextPhone,
      location: draftLocation.trim() || 'Hà Nội',
      shippingRecipientName: draftRecipient.trim() || undefined,
      shippingPhone: draftShippingPhone.trim() || undefined,
      shippingAddress: draftShippingAddress.trim() || undefined,
      shippingNotes: draftShippingNotes.trim() || undefined,
    };
    const existingProfiles = getKocLegalProfiles(baseUpdated);
    const updated =
      existingProfiles.length > 0
        ? syncKocWithLegalProfiles(
            baseUpdated,
            existingProfiles.map((p) =>
              p.isDefault
                ? {
                    ...p,
                    contactPhone: p.contactPhone || nextPhone || undefined,
                    contactEmail: p.contactEmail || nextEmail || undefined,
                  }
                : p,
            ),
          )
        : baseUpdated;
    syncKocContactToStaffSheets(updated);
    onUpdateKoc?.(updated, `Đã cập nhật liên hệ & địa chỉ nhận mẫu cho ${koc.stageName}`);
    setIsEditingContact(false);
  };

  return (
    <AsideSection
      title="Liên hệ"
      actions={
        !isEditingContact && onUpdateKoc ? (
          <Button size="sm" variant="ghost" onClick={openFullContactEdit}>
            Sửa
          </Button>
        ) : undefined
      }
    >
      <dl className="grid gap-3 text-xs">
        {/* Kênh mạng xã hội: hiển thị toàn bộ kênh TikTok (kênh chính + kênh phụ) & các nền tảng kết nối */}
        <div className="grid gap-1.5 text-2xs">
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="font-semibold text-ink">
              Tài khoản kênh liên kết ({socialLinks.length})
            </span>
            {onSearchSocialChannels && (
              <button
                type="button"
                onClick={() => onSearchSocialChannels(koc)}
                className="text-accent hover:underline font-medium"
              >
                + Quản lý kênh &amp; TikTok phụ
              </button>
            )}
          </div>
          {socialLinks.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-3">
                <c.Logo className="w-3.5 h-3.5 shrink-0" />
                {c.name}
              </span>
              <a
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="font-figure text-accent hover:underline inline-flex items-center gap-1 truncate max-w-[180px]"
              >
                {c.text}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          ))}
          {missingSocial.length > 0 && (
            <span className="text-ink-3">
              Chưa có {missingSocial.join(', ')}
              {onSearchSocialChannels && (
                <>
                  {' · '}
                  <button type="button" onClick={() => onSearchSocialChannels(koc)} className="text-accent hover:underline">
                    Dò tìm
                  </button>
                </>
              )}
            </span>
          )}
        </div>

        {isEditingContact ? (
          <div className="p-3 rounded-lg border border-line bg-sunken/40 space-y-2.5">
            <Field label="Email làm việc (nhận lời mời & hợp đồng)">
              <input
                type="email"
                placeholder="VD: creator@gmail.com"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-accent"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Số điện thoại">
                <input
                  type="text"
                  placeholder="09..."
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-mono text-ink focus:outline-none focus:border-accent"
                />
              </Field>
              <Field label="Zalo trao đổi">
                <input
                  type="text"
                  placeholder="09..."
                  value={draftZalo}
                  onChange={(e) => setDraftZalo(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-mono text-ink focus:outline-none focus:border-accent"
                />
              </Field>
            </div>
            <Field label="Khu vực">
              <input
                type="text"
                placeholder="Hà Nội / TP.HCM..."
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-accent"
              />
            </Field>
            <div className="border-t border-line pt-2 grid grid-cols-2 gap-2">
              <Field label="Người nhận mẫu">
                <input
                  type="text"
                  value={draftRecipient}
                  onChange={(e) => setDraftRecipient(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-accent"
                />
              </Field>
              <Field label="SĐT nhận hàng">
                <input
                  type="text"
                  value={draftShippingPhone}
                  onChange={(e) => setDraftShippingPhone(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-mono text-ink focus:outline-none focus:border-accent"
                />
              </Field>
            </div>
            <Field label="Địa chỉ nhận mẫu chi tiết">
              <input
                type="text"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP..."
                value={draftShippingAddress}
                onChange={(e) => setDraftShippingAddress(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-accent"
              />
            </Field>
            <Field label="Ghi chú giao hàng">
              <input
                type="text"
                placeholder="Giờ nhận hàng, lưu ý lễ tân..."
                value={draftShippingNotes}
                onChange={(e) => setDraftShippingNotes(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-accent"
              />
            </Field>
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setIsEditingContact(false)}>
                Hủy
              </Button>
              <Button size="sm" variant="primary" icon={Check} onClick={handleSaveFullContact}>
                Lưu liên hệ
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Liên hệ trao đổi */}
            <InfoRow label="Số điện thoại">{koc.phone ? (allowedPii ? koc.phone : mask(koc.phone)) : '—'}</InfoRow>
            <InfoRow label="Zalo trao đổi">
              {koc.zalo ? (
                <span className="inline-flex items-center gap-1.5">
                  <span>{allowedPii ? koc.zalo : mask(koc.zalo)}</span>
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
            <InfoRow label="Email làm việc">
              {koc.email ? (
                <a
                  href={`mailto:${koc.email}`}
                  className="font-mono text-accent hover:underline truncate"
                >
                  {koc.email}
                </a>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label="Khu vực">{koc.location || '—'}</InfoRow>

            {/* Gửi mẫu: chỉ cần khi chuẩn bị gửi hàng nên thu gọn mặc định */}
            <details className="group border-t border-line pt-2.5">
              <summary className="flex items-center justify-between gap-2 cursor-pointer list-none text-ctl-sm text-ink">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Truck className="w-3.5 h-3.5 text-ink-3" />
                  Gửi mẫu
                </span>
                <span className="text-2xs text-ink-3 truncate">
                  {koc.shippingAddress ? koc.shippingRecipientName || koc.realName || koc.stageName : 'Chưa có địa chỉ'}
                  <ChevronRight className="inline w-3 h-3 ml-0.5 transition-transform group-open:rotate-90" />
                </span>
              </summary>
              <dl className="grid gap-3 mt-3">

            <InfoRow label="Người nhận hàng">
              {koc.shippingRecipientName ? (
                <span className="font-medium text-ink">{koc.shippingRecipientName}</span>
              ) : (
                koc.realName || koc.stageName
              )}
            </InfoRow>

            <InfoRow label="SĐT nhận hàng">{(koc.shippingPhone || koc.phone) ? (allowedPii ? (koc.shippingPhone || koc.phone) : mask(koc.shippingPhone || koc.phone)) : '—'}</InfoRow>

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
              </dl>
            </details>
          </>
        )}

        {/* Đặc tính phục vụ chọn mẫu */}
        {prefs && !isEditingContact && (
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
  onUpdateKoc,
  onOpenQr,
  onOpenLegalTab,
  onCreateContractForKoc,
}: {
  koc: KocItem;
  currentUser?: UserProfile;
  onScanDocs?: (k: KocItem) => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
  onOpenQr?: () => void;
  onOpenLegalTab?: () => void;
  onCreateContractForKoc?: (koc: KocItem, legalProfileId?: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [previewState, setPreviewState] = useState<{
    attachments: LegalDocAttachment[];
    activeDoc: LegalDocAttachment;
    profileLabel: string;
  } | null>(null);
  const allowed = canRevealSensitive(currentUser, koc);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSync = () => setSyncTick((t) => t + 1);
    window.addEventListener(KOC_LEGAL_ATTACHMENTS_EVENT, handleSync);
    return () => window.removeEventListener(KOC_LEGAL_ATTACHMENTS_EVENT, handleSync);
  }, []);

  const legalProfiles = useMemo(
    () => getKocLegalProfiles(koc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [koc, syncTick],
  );
  const defProfile = useMemo(
    () => legalProfiles.find((p) => p.isDefault) || legalProfiles[0],
    [legalProfiles],
  );
  const type = defProfile ? defProfile.legalType : legalTypeOf(koc);
  const legalId = defProfile
    ? (defProfile.legalType !== 'INDIVIDUAL'
        ? defProfile.taxCode || defProfile.cccd
        : defProfile.cccd || defProfile.taxCode) || legalIdOf(koc)
    : legalIdOf(koc);
  const activeHolder = defProfile
    ? defProfile.holderName
    : type === 'INDIVIDUAL'
      ? koc.realName
      : koc.companyName || koc.realName;
  const activeBankAccount = defProfile?.bankAccount || defProfile?.bankAccountNumber || koc.bankAccount;
  const activeBankName = defProfile?.bankName || koc.bankName;
  const show = (v: string) => (revealed ? v : mask(v));
  const readiness = defProfile ? evaluateLegalProfileContractReadiness(defProfile, koc) : null;
  const isSigned = defProfile?.frameworkContractStatus === 'ĐÃ_KÝ';

  const scanButton = onScanDocs && (
    <Button size="sm" icon={FileScan} onClick={() => onScanDocs(koc)}>
      {legalId ? 'Đọc lại giấy tờ' : 'Đọc ảnh giấy tờ'}
    </Button>
  );

  return (
    <AsideSection
      title="Sẵn sàng hợp tác"
      actions={
        allowed && legalId ? (
          <Button size="sm" variant="ghost" onClick={() => setRevealed((v) => !v)}>
            {revealed ? 'Ẩn số' : 'Hiện số'}
          </Button>
        ) : undefined
      }
    >
      {/* Trạng thái ký hợp đồng lên đầu: câu hỏi đầu tiên trước khi book */}
      <div className="mb-3 grid gap-1">
        <div className="flex items-center justify-between gap-2">
          {!defProfile && !legalId ? (
            <Status tone="warning">Chưa có hồ sơ pháp lý</Status>
          ) : isSigned ? (
            <Status tone="positive">Đã ký HĐ nguyên tắc</Status>
          ) : readiness && !readiness.ready ? (
            <Status tone="warning">Chưa đủ để ký HĐ</Status>
          ) : (
            <Status tone="positive">Đủ hồ sơ để ký HĐ</Status>
          )}
          {onOpenLegalTab && (
            <button type="button" onClick={onOpenLegalTab} className="text-2xs text-accent hover:underline shrink-0">
              {legalProfiles.length > 1 ? `${legalProfiles.length} hồ sơ` : 'Xem hồ sơ'}
            </button>
          )}
        </div>
        {readiness && !readiness.ready && !isSigned && (
          <p className="text-2xs text-ink-3">
            Thiếu: {readiness.missingFields.slice(0, 3).join(', ')}
            {readiness.missingFields.length > 3 ? ` và ${readiness.missingFields.length - 3} mục khác` : ''}
          </p>
        )}
      </div>
      {!legalId && !activeBankAccount ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">{scanButton}</div>
        </div>
      ) : (
        <dl className="grid gap-3 text-xs">
          <InfoRow label="Loại hồ sơ mặc định">{LEGAL_TYPE_LABEL[type]}</InfoRow>
          {(defProfile?.taxAccountType || koc.taxAccountType) && (
            <InfoRow label="Chế độ khấu trừ thuế">
              {defProfile?.taxAccountType || koc.taxAccountType}
            </InfoRow>
          )}
          <InfoRow label={type === 'INDIVIDUAL' ? 'Họ tên chủ TK' : 'Tên đơn vị thụ hưởng'}>
            {activeHolder}
          </InfoRow>
          {defProfile?.representativeName && type !== 'INDIVIDUAL' && (
            <InfoRow label="Người đại diện ký HĐ">
              {defProfile.representativeName}
              {defProfile.representativeTitle ? ` (${defProfile.representativeTitle})` : ''}
            </InfoRow>
          )}
          <InfoRow label={type === 'INDIVIDUAL' ? 'Số CCCD / ĐD' : 'Mã số thuế'}>
            {legalId ? (
              <SensitiveValue value={show(legalId)} copyValue={revealed ? legalId : undefined} />
            ) : (
              <span className="text-warning font-medium">Chưa bổ sung</span>
            )}
          </InfoRow>
          {type === 'INDIVIDUAL' &&
            (defProfile?.taxCode || koc.taxCode) &&
            (defProfile?.taxCode || koc.taxCode) !== 'Chưa có' &&
            (defProfile?.taxCode || koc.taxCode)?.trim() !== legalId?.trim() && (
              <InfoRow label="Mã số thuế cá nhân">
                <SensitiveValue
                  value={show((defProfile?.taxCode || koc.taxCode)!)}
                  copyValue={revealed ? defProfile?.taxCode || koc.taxCode : undefined}
                />
              </InfoRow>
            )}
          {type === 'INDIVIDUAL' &&
            (defProfile?.cccdIssueDate ||
              koc.issueDate ||
              defProfile?.cccdIssuePlace ||
              koc.issuePlace) && (
              <InfoRow label="Ngày cấp, nơi cấp">
                {[
                  defProfile?.cccdIssueDate || koc.issueDate,
                  defProfile?.cccdIssuePlace || koc.issuePlace,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </InfoRow>
            )}
          {revealed && (defProfile?.registeredAddress || koc.permanentAddress) && (
            <InfoRow label="Địa chỉ trên giấy tờ">
              {defProfile?.registeredAddress || koc.permanentAddress}
            </InfoRow>
          )}
          <InfoRow label="Tài khoản nhận tiền">
            {activeBankAccount ? (
              <div className="grid gap-1">
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  <SensitiveValue
                    value={show(activeBankAccount)}
                    copyValue={revealed ? activeBankAccount : undefined}
                  />
                  {activeBankName && <span className="text-ink-3">· {activeBankName}</span>}
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
            ) : onOpenLegalTab ? (
              <button
                type="button"
                onClick={onOpenLegalTab}
                className="text-2xs font-medium text-accent hover:underline cursor-pointer"
              >
                + Quản lý pháp lý &amp; TK
              </button>
            ) : (
              '—'
            )}
          </InfoRow>
          {(defProfile?.legalAttachments || []).length > 0 && (
            <InfoRow label="Giấy tờ CCCD / ĐKKD">
              <div className="flex flex-wrap items-center gap-1.5">
                {(defProfile?.legalAttachments || []).map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() =>
                      setPreviewState({
                        attachments: defProfile?.legalAttachments || [],
                        activeDoc: doc,
                        profileLabel: `${defProfile?.profileCode || 'HSPL'} · ${
                          defProfile?.holderName || koc.stageName
                        }`,
                      })
                    }
                    title="Ấn vào để xem giấy tờ"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-sunken/70 text-ink hover:border-accent hover:text-accent font-medium text-2xs transition-colors"
                  >
                    <Eye className="w-3 h-3 text-accent shrink-0" />
                    <span>{doc.label || LEGAL_DOC_CATEGORY_LABEL[doc.docType]}</span>
                  </button>
                ))}
              </div>
            </InfoRow>
          )}
          {koc.sharedMcnInfo && (
            <InfoRow label="Đầu mối dùng chung">{koc.sharedMcnInfo}</InfoRow>
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

      {(legalId || koc.bankAccount) && (
        <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
          <span className="text-2xs text-ink-3">
            {allowed ? 'Số đầy đủ chỉ hiện khi bấm “Hiện số”.' : 'Quản lý, Kế toán, Pháp chế & PIC xem được số đầy đủ.'}
          </span>
          {scanButton}
        </div>
      )}

      {previewState && (
        <LegalDocPreviewModal
          attachments={previewState.attachments}
          activeDoc={previewState.activeDoc}
          profileLabel={previewState.profileLabel}
          onSelectDoc={(doc) =>
            setPreviewState((prev) => (prev ? { ...prev, activeDoc: doc } : null))
          }
          onClose={() => setPreviewState(null)}
        />
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

  return (
    <AsideSection title="Đầu mối vận hành">
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-lg bg-sunken/40 border border-line flex items-center justify-between">
          <div>
            <span className="text-2xs text-ink-3 block">Điểm uy tín KOC (Reliability)</span>
            <span className="text-base font-semibold text-ink">
              {koc.reliabilityScore ? (
                <>
                  {koc.reliabilityScore} <span className="text-xs font-normal text-ink-3">/ 10</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>
          {koc.reliabilityScore ? (
            <span className="text-2xs font-medium text-positive">
              {koc.reliabilityScore >= 8 ? 'Uy tín tốt' : 'Đang theo dõi'}
            </span>
          ) : (
            <span className="text-2xs text-ink-3">Chưa chấm điểm</span>
          )}
        </div>

        <dl className="grid gap-2.5">
          {koc.collabGroupLabel && (
            <InfoRow label="Nhóm hợp tác">{koc.collabGroupLabel}</InfoRow>
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
  koc,
  channelScopeVersion = 0,
  onClose,
  onSelectDealForContract,
  onUpdateKoc,
}: {
  deal: BookingDealItem;
  koc?: KocItem;
  channelScopeVersion?: number;
  onClose: () => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
}) {
  const [editingChannelScope, setEditingChannelScope] = useState(false);
  const gmv = deal.gmv30 || deal.affiliateGmv || 0;
  const cost = deal.totalValue || 0;
  const roi = deal.roi || (cost > 0 ? gmv / cost : 0);
  const orders = deal.ordersCount || (gmv > 0 ? Math.round(gmv / 280000) : 0);
  const cpo = deal.cpo || (orders > 0 && cost > 0 ? Math.round(cost / orders) : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const channelBreakdown = useMemo(() => getDealChannelBreakdown(deal, koc), [deal, koc, channelScopeVersion]);

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
                className="h-[34px] px-3.5 rounded-md font-medium text-ctl-md border border-line-strong hover:bg-sunken text-ink inline-flex items-center gap-1.5"
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
        {/* Phạm vi kênh hợp tác (Riêng 1 kênh hoặc Đa kênh) & Hồ sơ pháp lý thanh toán */}
        <div className="p-3.5 rounded-xl border border-line bg-sunken/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">Phạm vi kênh thực thi:</span>
            <Status tone={channelBreakdown.isMultiChannel ? 'info' : 'neutral'}>
              {channelBreakdown.scopeLabel}
            </Status>
            <div className="flex flex-wrap items-center gap-1.5">
              {channelBreakdown.channels.map((ch) => (
                <span
                  key={ch.key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-line bg-surface font-mono text-2xs text-ink"
                >
                  <PlatformChannelIcon platform={ch.platform} className="h-3 w-3 shrink-0" />
                  {ch.displayLabel}
                </span>
              ))}
            </div>
            {koc && (
              <Button
                size="sm"
                variant="ghost"
                icon={Layers}
                onClick={() => setEditingChannelScope(true)}
              >
                Phân bổ kênh
              </Button>
            )}
          </div>
          {(deal.legalProfileSnapshot?.holderName || deal.kocBankHolder) && (
            <div className="text-2xs text-ink-2">
              Hồ sơ pháp lý thụ hưởng:{' '}
              <strong className="text-ink">
                {deal.legalProfileSnapshot?.holderName || deal.kocBankHolder}
              </strong>
              {deal.legalProfileSnapshot?.profileCode
                ? ` (${deal.legalProfileSnapshot.profileCode})`
                : ''}
            </div>
          )}
        </div>
        {editingChannelScope && koc && (
          <DealChannelScopeModal
            deal={deal}
            koc={koc}
            onClose={() => setEditingChannelScope(false)}
            onUpdateKoc={onUpdateKoc}
          />
        )}

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
            value={deal.viewsCount > 0 ? formatNumber(deal.viewsCount) : '—'}
            note={deal.ctr ? `CTR giỏ hàng ${deal.ctr}% · CVR ${deal.cvr || '—'}%` : 'Chỉ số tương tác'}
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
              style={{ width: `${gmv > 0 ? (organicGmv / gmv) * 100 : 50}%` }}
              className="data-bar bg-positive rounded-sm"
              title={`Tự nhiên: ${formatVndShort(organicGmv)}`}
            />
            <div
              style={{ width: `${gmv > 0 ? (adsGmv / gmv) * 100 : 50}%` }}
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
              <dd className="font-medium text-ink mt-0.5">{deal.contentPillar || '—'}</dd>
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
                <span className="font-medium text-ink">
                  {deal.sampleStatus === 'ĐÃ_NHẬN'
                    ? 'Đã nhận hàng'
                    : deal.sampleStatus === 'ĐANG_GIAO'
                      ? 'Đang vận chuyển'
                      : deal.sampleStatus === 'CHƯA_GỬI'
                        ? 'Chờ xuất kho'
                        : 'Chưa xác nhận'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Nộp kịch bản:</span>
                <span className="font-medium text-ink">
                  {deal.isScriptOnTime === true
                    ? 'Đúng hạn cam kết'
                    : deal.isScriptOnTime === false
                      ? 'Trễ hạn'
                      : 'Chưa xác nhận'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Lên sóng video:</span>
                <span className="font-medium text-ink">
                  {deal.postedDate
                    ? formatDate(deal.postedDate)
                    : deal.isPostOnTime === true
                      ? 'Đúng hạn'
                      : deal.isPostOnTime === false
                        ? 'Trễ hạn'
                        : 'Chưa lên sóng'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Mã Spark Ads:</span>
                <span className="font-medium text-accent font-mono text-2xs">
                  {deal.sparkAdsCode || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Quyết toán tài chính:</span>
                <span className="font-medium text-ink">
                  {deal.status === 'FINAL_PAID' || deal.status === 'COMPLETED'
                    ? 'Đã hoàn tất'
                    : deal.status === 'ADVANCE_PAID'
                      ? 'Đã tạm ứng'
                      : 'Chờ quyết toán'}
                </span>
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
                  {deal.picCollabReview || 'Chưa có ghi chú đánh giá từ PIC.'}
                </p>
              </div>
              <div className="pt-2 border-t border-line">
                <span className="text-2xs font-semibold text-ink-3 block">Phản hồi của Nhãn hàng (Brand):</span>
                <p className="text-ink-2 mt-0.5 leading-relaxed text-2xs">
                  {deal.brandFeedback || 'Chưa có phản hồi từ nhãn hàng.'}
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
   9. MODAL CẬP NHẬT & ĐỒNG BỘ CHỈ SỐ TIKTOK SELLER
   ========================================================================= */

function TikTokSellerSyncModal({
  koc,
  onClose,
  onUpdateKoc,
}: {
  koc: KocItem;
  onClose: () => void;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rateCardVideo: koc.rateCardVideo || 0,
    gpm: koc.gpm || 0,
    aov: koc.aov || 0,
    engagementRate: koc.engagementRate || 0,
    tiktokAvgCtr: koc.tiktokAvgCtr || 0,
    tiktokAvgCvr: koc.tiktokAvgCvr || 0,
    tiktokShopRating: koc.tiktokShopRating || 0,
    tiktokCancellationRate: koc.tiktokCancellationRate || 0,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const nowStr = new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      let updated: KocItem = {
        ...koc,
        rateCardVideo: Number(form.rateCardVideo) || 0,
        gpm: Number(form.gpm) || undefined,
        aov: Number(form.aov) || undefined,
        engagementRate: Number(form.engagementRate) || undefined,
        tiktokAvgCtr: Number(form.tiktokAvgCtr) || undefined,
        tiktokAvgCvr: Number(form.tiktokAvgCvr) || undefined,
        tiktokShopRating: Number(form.tiktokShopRating) || undefined,
        tiktokCancellationRate: Number(form.tiktokCancellationRate) || undefined,
        tiktokSellerSyncedAt: nowStr,
      };
      try {
        const res = await fetch(
          `/api/integrations/tiktok-koc/scrape?handle=${encodeURIComponent(koc.channelId)}&period=30d&videoLimit=12`
        );
        const json = await res.json();
        if (json.success && json.data) {
          updated = {
            ...updated,
            followers: json.data.channelProfile?.followers || updated.followers,
            totalLikes: json.data.channelProfile?.totalLikes || updated.totalLikes,
            videoCount: json.data.channelProfile?.videoCount || updated.videoCount,
            avgViews: json.data.engagementMetrics?.avgViews || updated.avgViews,
            medianViews: json.data.engagementMetrics?.medianViews ?? updated.medianViews,
            engagementRate:
              Number(form.engagementRate) ||
              json.data.engagementMetrics?.engagementRate ||
              updated.engagementRate,
            recentVideos: json.data.recentVideos || updated.recentVideos,
          };
        }
      } catch {
        // Bỏ qua lỗi mạng khi cào trực tiếp
      }
      onUpdateKoc?.(updated, 'Đã cập nhật & đồng bộ chỉ số kênh TikTok');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Cập nhật & Đồng bộ chỉ số TikTok Seller" size="md">
      <div className="space-y-3.5 text-xs">
        <div className="p-2.5 rounded-lg bg-sunken border border-line flex items-center justify-between">
          <span className="text-ink-2">Kênh TikTok</span>
          <span className="font-code font-semibold text-ink">
            @{koc.channelId.replace(/^@/, '')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Rate Card 1 Video (VNĐ)">
            <Input
              type="number"
              value={form.rateCardVideo}
              onChange={(e) =>
                setForm((p) => ({ ...p, rateCardVideo: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="GPM (GMV / 1.000 view)">
            <Input
              type="number"
              value={form.gpm}
              onChange={(e) => setForm((p) => ({ ...p, gpm: Number(e.target.value) || 0 }))}
            />
          </Field>
          <Field label="Giá trị đơn TB - AOV (VNĐ)">
            <Input
              type="number"
              value={form.aov}
              onChange={(e) => setForm((p) => ({ ...p, aov: Number(e.target.value) || 0 }))}
            />
          </Field>
          <Field label="Tỷ lệ tương tác ER (%)">
            <Input
              type="number"
              step="0.1"
              value={form.engagementRate}
              onChange={(e) =>
                setForm((p) => ({ ...p, engagementRate: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="CTR nhấp giỏ hàng (%)">
            <Input
              type="number"
              step="0.1"
              value={form.tiktokAvgCtr}
              onChange={(e) =>
                setForm((p) => ({ ...p, tiktokAvgCtr: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="CVR chuyển đổi đơn (%)">
            <Input
              type="number"
              step="0.1"
              value={form.tiktokAvgCvr}
              onChange={(e) =>
                setForm((p) => ({ ...p, tiktokAvgCvr: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="Điểm uy tín Shop (trên 5.0)">
            <Input
              type="number"
              step="0.1"
              value={form.tiktokShopRating}
              onChange={(e) =>
                setForm((p) => ({ ...p, tiktokShopRating: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="Tỷ lệ hoàn/hủy đơn (%)">
            <Input
              type="number"
              step="0.1"
              value={form.tiktokCancellationRate}
              onChange={(e) =>
                setForm((p) => ({ ...p, tiktokCancellationRate: Number(e.target.value) || 0 }))
              }
            />
          </Field>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-line">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={() => void handleSave()}
            disabled={loading}
          >
            {loading ? 'Đang đồng bộ...' : 'Lưu & Đồng bộ kênh'}
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
      <dd className="text-ctl text-ink break-words">{children || <span className="text-ink-3">—</span>}</dd>
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
        <h3 className="text-ctl-md font-semibold text-ink min-w-0 truncate">{title}</h3>
        {actions && <div className="shrink-0">{actions}</div>}
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
