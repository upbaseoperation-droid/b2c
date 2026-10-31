'use client';

import React from 'react';
import { Clock, History, Plus, RefreshCw, RotateCcw, X } from 'lucide-react';
import type {
  CrawlerHistoryTabKey,
  TikTokCrawlerDailyHistoryItem,
} from '../../app/api/integrations/tiktok-koc/history/route';
import {
  VERDICT_META,
  type KocChannelReviewEntry,
  type KocChannelReviewVerdict,
} from '../../lib/kocChannelReviewService';
import type { KocChannelReviewTarget } from '../koc/KocChannelReviewModal';
import { formatDate } from '../../lib/format';
import { Avatar, Button, Chips, DataTable, SearchInput, Status } from '../ui';
import type { Column } from '../ui';

export const CRAWLER_TAB_SHORT_LABEL: Record<CrawlerHistoryTabKey, string> = {
  COMPETITOR_KOCS: 'KOC của đối thủ',
  HASHTAG_DISCOVERY: 'KOC theo #Hashtag',
  COMMENTS_AND_TRENDING: 'Bình luận video',
  CHANNEL_AND_VIDEO_TOOLS: 'KOC xu hướng',
  LINK_AIR_CHECK: 'Kiểm tra link air',
  HANDLE_SCRAPE: 'Kênh @handle',
};

export const CRAWLER_UNIT_LABEL: Record<CrawlerHistoryTabKey, string> = {
  COMPETITOR_KOCS: 'KOC',
  HASHTAG_DISCOVERY: 'KOC',
  COMMENTS_AND_TRENDING: 'BL',
  CHANNEL_AND_VIDEO_TOOLS: 'KOC',
  LINK_AIR_CHECK: 'Link',
  HANDLE_SCRAPE: 'KOC',
};

export interface CrawlerHistoryButtonsProps {
  currentTab: CrawlerHistoryTabKey;
  dailyHistory: TikTokCrawlerDailyHistoryItem[];
  expandedWeeklyTableByTab: Record<string, boolean>;
  setExpandedWeeklyTableByTab: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  expandedReviewHistoryByTab: Record<string, boolean>;
  setExpandedReviewHistoryByTab: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  channelReviewsCount: number;
}

export const CrawlerHistoryButtons: React.FC<CrawlerHistoryButtonsProps> = ({
  currentTab,
  dailyHistory,
  expandedWeeklyTableByTab,
  setExpandedWeeklyTableByTab,
  expandedReviewHistoryByTab,
  setExpandedReviewHistoryByTab,
  channelReviewsCount,
}) => {
  const tabItems = dailyHistory.filter(
    (it) =>
      it.tab === currentTab ||
      (currentTab === 'CHANNEL_AND_VIDEO_TOOLS' && it.tab === 'HANDLE_SCRAPE')
  );
  const isTableExpanded = Boolean(expandedWeeklyTableByTab[currentTab]);
  const isReviewExpanded = Boolean(expandedReviewHistoryByTab[currentTab]);
  const showKocReviewBtn =
    currentTab === 'COMPETITOR_KOCS' ||
    currentTab === 'HASHTAG_DISCOVERY' ||
    currentTab === 'CHANNEL_AND_VIDEO_TOOLS' ||
    currentTab === 'HANDLE_SCRAPE';

  return (
    <div className="inline-flex items-center gap-2">
      {showKocReviewBtn && (
        <Button
          size="sm"
          variant={isReviewExpanded ? 'primary' : 'secondary'}
          icon={History}
          onClick={() =>
            setExpandedReviewHistoryByTab((prev) => ({
              ...prev,
              [currentTab]: !prev[currentTab],
            }))
          }
          title="Xem nhanh bảng Lịch sử đánh giá KOC theo Brand ngay tại màn hình này"
        >
          <span>Lịch sử ĐG KOC ({channelReviewsCount})</span>
        </Button>
      )}
      <Button
        size="sm"
        variant={isTableExpanded ? 'primary' : 'secondary'}
        icon={Clock}
        onClick={() =>
          setExpandedWeeklyTableByTab((prev) => ({
            ...prev,
            [currentTab]: !prev[currentTab],
          }))
        }
        title="Mở bảng lịch sử quét trong 7 ngày gần nhất"
      >
        <span>Lịch sử{tabItems.length > 0 ? ` (${tabItems.length})` : ''}</span>
      </Button>
    </div>
  );
};

export interface CrawlerHistoryTabSectionProps {
  currentTab: CrawlerHistoryTabKey;
  activeTabShortLabel: string;
  dailyHistory: TikTokCrawlerDailyHistoryItem[];
  historyLoading: boolean;
  activeHistoryId: string | null;
  historyDayFilter: 'ALL_WEEK' | 'TODAY' | 'YESTERDAY' | 'EARLIER';
  setHistoryDayFilter: React.Dispatch<
    React.SetStateAction<'ALL_WEEK' | 'TODAY' | 'YESTERDAY' | 'EARLIER'>
  >;
  historySearchQuery: string;
  setHistorySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showAllTabsInBar: boolean;
  setShowAllTabsInBar: React.Dispatch<React.SetStateAction<boolean>>;
  expandedWeeklyTableByTab: Record<string, boolean>;
  setExpandedWeeklyTableByTab: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  expandedReviewHistoryByTab: Record<string, boolean>;
  setExpandedReviewHistoryByTab: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  channelReviews: KocChannelReviewEntry[];
  inlineReviewVerdictFilter: 'ALL' | KocChannelReviewVerdict;
  setInlineReviewVerdictFilter: React.Dispatch<
    React.SetStateAction<'ALL' | KocChannelReviewVerdict>
  >;
  inlineReviewSearch: string;
  setInlineReviewSearch: React.Dispatch<React.SetStateAction<string>>;
  openChannelReviewModal: (
    target: KocChannelReviewTarget | null,
    mode?: 'CHANNEL_DETAIL' | 'ALL_HISTORY'
  ) => void;
  todayVnDateKey: string;
  yesterdayVnDateKey: string;
  formatHistoryDayBadge: (dateKey: string) => string;
  applyHistoryEntry: (item: TikTokCrawlerDailyHistoryItem) => void;
  rerunHistoryEntry: (item: TikTokCrawlerDailyHistoryItem) => void;
  deleteHistoryEntry: (id: string, e?: React.MouseEvent) => Promise<void>;
  fetchDailyHistory: () => Promise<void>;
  clearTabWeeklyHistory: (tab: CrawlerHistoryTabKey) => Promise<void>;
}

export const CrawlerHistoryTabSection: React.FC<CrawlerHistoryTabSectionProps> = ({
  currentTab,
  activeTabShortLabel,
  dailyHistory,
  historyLoading,
  activeHistoryId,
  historyDayFilter,
  setHistoryDayFilter,
  historySearchQuery,
  setHistorySearchQuery,
  showAllTabsInBar,
  setShowAllTabsInBar,
  expandedWeeklyTableByTab,
  setExpandedWeeklyTableByTab,
  expandedReviewHistoryByTab,
  setExpandedReviewHistoryByTab,
  channelReviews,
  inlineReviewVerdictFilter,
  setInlineReviewVerdictFilter,
  inlineReviewSearch,
  setInlineReviewSearch,
  openChannelReviewModal,
  todayVnDateKey,
  yesterdayVnDateKey,
  formatHistoryDayBadge,
  applyHistoryEntry,
  rerunHistoryEntry,
  deleteHistoryEntry,
  fetchDailyHistory,
  clearTabWeeklyHistory,
}) => {
  const renderInlineKocReviewHistoryPanel = () => {
    if (!expandedReviewHistoryByTab[currentTab]) return null;

    const filteredReviews = channelReviews.filter((rev) => {
      if (inlineReviewVerdictFilter !== 'ALL' && rev.verdict !== inlineReviewVerdictFilter) {
        return false;
      }
      if (inlineReviewSearch.trim()) {
        const q = inlineReviewSearch.trim().toLowerCase();
        const hay = [
          rev.channelHandle,
          rev.channelName,
          rev.brandName,
          rev.note,
          rev.reviewerName,
          ...rev.reasonTags,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const suitableCount = channelReviews.filter((r) => r.verdict === 'SUITABLE').length;
    const cautionCount = channelReviews.filter((r) => r.verdict === 'CAUTION').length;
    const notSuitableCount = channelReviews.filter((r) => r.verdict === 'NOT_SUITABLE').length;

    const inlineReviewColumns: Column<KocChannelReviewEntry>[] = [
      {
        key: 'channel',
        header: 'Kênh KOC',
        width: 230,
        render: (rev) => (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={rev.channelName || rev.channelHandle || 'KOC'} src={rev.avatarUrl} size={26} className="shrink-0" />
            <div className="min-w-0 grid">
              <span className="font-semibold text-xs text-ink truncate" title={rev.channelName || `@${rev.channelHandle || rev.handle}`}>
                {rev.channelName || `@${rev.channelHandle || rev.handle}`}
              </span>
              <span className="font-code text-2xs text-ink-3 break-all">@{rev.channelHandle || rev.handle}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'brand',
        header: 'Brand đánh giá',
        width: 155,
        render: (rev) => (
          <Status tone="info">{rev.brandName || 'Toàn hệ thống B2C'}</Status>
        ),
      },
      {
        key: 'verdict',
        header: 'Kết luận',
        width: 140,
        render: (rev) => {
          const meta = VERDICT_META[rev.verdict];
          return <Status tone={meta.tone}>{meta.label}</Status>;
        },
      },
      {
        key: 'note',
        header: 'Ý kiến nhân viên & Tiêu chí',
        render: (rev) => (
          <div className="grid gap-1 min-w-0">
            {rev.note && (
              <span className="text-xs text-ink break-words">
                &ldquo;{rev.note}&rdquo;
              </span>
            )}
            {rev.reasonTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rev.reasonTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-sunken border border-line text-2xs text-ink-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'reviewer',
        header: 'Người đánh giá & Thời gian',
        width: 200,
        render: (rev) => (
          <div className="grid gap-0.5 text-xs">
            <span className="font-semibold text-ink">{rev.reviewerName}</span>
            <span className="text-2xs text-ink-3 font-code">
              {rev.timeLabel} · {rev.dateLabel}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right',
        width: 150,
        render: (rev) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                openChannelReviewModal({
                  handle: rev.channelHandle || rev.handle,
                  channelName: rev.channelName,
                  channelUrl: rev.channelUrl,
                  avatarUrl: rev.avatarUrl,
                  initialBrandName: rev.brandName,
                  sourceScreen: activeTabShortLabel,
                });
              }}
            >
              Đánh giá thêm
            </Button>
          </div>
        ),
      },
    ];

    return (
      <div className="bg-surface border-b border-line">
        <div className="px-4 py-2 border-b border-line bg-sunken/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink inline-flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-accent" />
              <span>Lịch sử đánh giá KOC theo Brand ({channelReviews.length} lượt)</span>
            </span>
            <Chips<'ALL' | KocChannelReviewVerdict>
              items={[
                { key: 'ALL', label: 'Tất cả', count: channelReviews.length },
                { key: 'SUITABLE', label: 'Phù hợp', count: suitableCount },
                { key: 'CAUTION', label: 'Cân nhắc', count: cautionCount },
                { key: 'NOT_SUITABLE', label: 'Không phù hợp', count: notSuitableCount },
              ]}
              value={inlineReviewVerdictFilter}
              onChange={setInlineReviewVerdictFilter}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={inlineReviewSearch}
              onChange={setInlineReviewSearch}
              placeholder="Tìm @handle, Brand, ý kiến, người ĐG..."
              className="w-56 [&_input]:h-7 [&_input]:text-xs"
            />
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => openChannelReviewModal(null, 'CHANNEL_DETAIL')}
            >
              Đánh giá kênh mới
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openChannelReviewModal(null, 'ALL_HISTORY')}
            >
              Mở cửa sổ đầy đủ
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={X}
              onClick={() =>
                setExpandedReviewHistoryByTab((prev) => ({
                  ...prev,
                  [currentTab]: false,
                }))
              }
            >
              Đóng
            </Button>
          </div>
        </div>
        <DataTable
          rows={filteredReviews}
          columns={inlineReviewColumns}
          rowKey={(r) => r.id}
          onRowClick={(rev) =>
            openChannelReviewModal({
              handle: rev.channelHandle || rev.handle,
              channelName: rev.channelName,
              channelUrl: rev.channelUrl,
              avatarUrl: rev.avatarUrl,
              initialBrandName: rev.brandName,
              sourceScreen: activeTabShortLabel,
            })
          }
          fitContainer
          empty="Chưa có đánh giá KOC nào khớp bộ lọc."
        />
      </div>
    );
  };

  const isExpanded = Boolean(expandedWeeklyTableByTab[currentTab]);
  const isReviewExpanded = Boolean(expandedReviewHistoryByTab[currentTab]);
  if (!isExpanded && !isReviewExpanded) return null;

  if (!isExpanded && isReviewExpanded) {
    return renderInlineKocReviewHistoryPanel();
  }

  const tabOnlyItems = dailyHistory.filter(
    (it) =>
      it.tab === currentTab ||
      (currentTab === 'CHANNEL_AND_VIDEO_TOOLS' && it.tab === 'HANDLE_SCRAPE')
  );
  const allTabItems = showAllTabsInBar ? dailyHistory : tabOnlyItems;

  const todayCount = allTabItems.filter((it) => it.dateKey === todayVnDateKey).length;
  const yesterdayCount = allTabItems.filter((it) => it.dateKey === yesterdayVnDateKey).length;
  const earlierCount = allTabItems.length - todayCount - yesterdayCount;

  const filteredHistoryRows = allTabItems.filter((it) => {
    if (historyDayFilter === 'TODAY' && it.dateKey !== todayVnDateKey) return false;
    if (historyDayFilter === 'YESTERDAY' && it.dateKey !== yesterdayVnDateKey) return false;
    if (
      historyDayFilter === 'EARLIER' &&
      (it.dateKey === todayVnDateKey || it.dateKey === yesterdayVnDateKey)
    ) {
      return false;
    }
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.trim().toLowerCase();
      const hitLabel = it.queryLabel.toLowerCase().includes(q);
      const hitRaw = it.rawInput.toLowerCase().includes(q);
      const hitStaff = (it.staffName || '').toLowerCase().includes(q);
      const hitNote = (it.summaryNote || '').toLowerCase().includes(q);
      if (!hitLabel && !hitRaw && !hitStaff && !hitNote) return false;
    }
    return true;
  });

  const historyColumns: Column<TikTokCrawlerDailyHistoryItem>[] = [
    {
      key: 'query',
      header: 'Nội dung / Từ khóa đã quét',
      width: 280,
      render: (it) => (
        <div className="grid gap-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-code font-semibold text-xs text-ink truncate">
              {it.queryLabel}
            </span>
            {activeHistoryId === it.id && (
              <Status tone="info">Đang mở</Status>
            )}
          </div>
          <span className="text-2xs text-ink-3 font-code truncate max-w-[290px]" title={it.rawInput}>
            Đầu vào: {it.rawInput}
          </span>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Kết quả lưu trữ',
      width: 260,
      render: (it) => (
        <div className="grid gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <Status tone="positive">
              {it.resultCount} {CRAWLER_UNIT_LABEL[it.tab]}
            </Status>
            <span className="text-2xs text-ink-2 font-medium">
              {CRAWLER_TAB_SHORT_LABEL[it.tab]}
            </span>
          </div>
          {it.summaryNote && (
            <span className="text-2xs text-ink-3 truncate">{it.summaryNote}</span>
          )}
        </div>
      ),
    },
    {
      key: 'staff',
      header: 'Nhân sự thực hiện',
      width: 170,
      render: (it) => (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={it.staffName || 'Nhân sự'} size={24} />
          <span className="text-xs font-medium text-ink truncate">
            {it.staffName || 'Nhân sự B2C'}
          </span>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Thời gian quét (7 ngày)',
      width: 175,
      render: (it) => {
        const badge = formatHistoryDayBadge(it.dateKey);
        const isToday = it.dateKey === todayVnDateKey;
        return (
          <div className="grid gap-0.5 tabular-nums">
            <div className="flex items-center gap-2">
              <Status tone={isToday ? 'positive' : 'neutral'}>{badge}</Status>
              <span className="text-xs font-semibold text-ink font-code">
                {it.timeLabel}
              </span>
            </div>
            <span className="text-2xs text-ink-3">{formatDate(it.dateKey)}</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 230,
      render: (it) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              applyHistoryEntry(it);
            }}
          >
            Xem kết quả
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            onClick={(e) => {
              e.stopPropagation();
              rerunHistoryEntry(it);
            }}
          >
            Quét lại
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={X}
            onClick={(e) => void deleteHistoryEntry(it.id, e)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-surface">
      {renderInlineKocReviewHistoryPanel()}
      <div className="px-4 py-2 border-b border-line bg-sunken/30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink inline-flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>
              Lịch sử crawl (7 ngày gần nhất) —{' '}
              {showAllTabsInBar ? 'Tất cả tab' : CRAWLER_TAB_SHORT_LABEL[currentTab]}
            </span>
          </span>
          <Chips<'ALL_WEEK' | 'TODAY' | 'YESTERDAY' | 'EARLIER'>
            items={[
              { key: 'ALL_WEEK', label: 'Tất cả 7 ngày', count: allTabItems.length },
              { key: 'TODAY', label: 'Hôm nay', count: todayCount },
              { key: 'YESTERDAY', label: 'Hôm qua', count: yesterdayCount },
              { key: 'EARLIER', label: 'Trong tuần', count: earlierCount },
            ]}
            value={historyDayFilter}
            onChange={setHistoryDayFilter}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={historySearchQuery}
            onChange={setHistorySearchQuery}
            placeholder="Tìm từ khóa, @handle, nhân sự quét..."
            className="w-52 [&_input]:h-7 [&_input]:text-xs"
          />
          {dailyHistory.length > tabOnlyItems.length && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAllTabsInBar((prev) => !prev)}
            >
              {showAllTabsInBar
                ? `Chỉ tab này (${tabOnlyItems.length})`
                : `Tất cả tab (${dailyHistory.length})`}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            disabled={historyLoading}
            onClick={() => void fetchDailyHistory()}
          >
            Làm mới
          </Button>
          {tabOnlyItems.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              icon={RotateCcw}
              onClick={() => void clearTabWeeklyHistory(currentTab)}
            >
              Xóa lịch sử tab
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={X}
            onClick={() =>
              setExpandedWeeklyTableByTab((prev) => ({
                ...prev,
                [currentTab]: false,
              }))
            }
          >
            Đóng
          </Button>
        </div>
      </div>

      <DataTable
        rows={filteredHistoryRows}
        columns={historyColumns}
        rowKey={(it) => it.id}
        onRowClick={(it) => applyHistoryEntry(it)}
        fitContainer
        empty="Chưa có phiên crawl nào được lưu trong 7 ngày qua ở tab này."
      />
    </div>
  );
};
