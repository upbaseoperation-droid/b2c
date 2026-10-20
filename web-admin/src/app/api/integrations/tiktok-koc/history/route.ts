import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import type {
  TikTokCompetitorKocResult,
  TikTokCompetitorProfileSummary,
  TikTokHashtagKocResult,
  TikTokTrendingCreatorItem,
  TikTokVideoCommentsScrapeResult,
  TrendingKocCategoryKey,
} from '@/lib/tiktokKocScraper';

export type CrawlerHistoryTabKey =
  | 'COMPETITOR_KOCS'
  | 'HASHTAG_DISCOVERY'
  | 'COMMENTS_AND_TRENDING'
  | 'CHANNEL_AND_VIDEO_TOOLS';

export interface TikTokCrawlerDailyHistoryItem {
  id: string;
  dateKey: string;
  tab: CrawlerHistoryTabKey;
  queryKey: string;
  queryLabel: string;
  rawInput: string;
  resultCount: number;
  staffName: string;
  updatedAt: string;
  timeLabel: string;
  compProfile?: TikTokCompetitorProfileSummary | null;
  compResults?: TikTokCompetitorKocResult[];
  tagResults?: TikTokHashtagKocResult[];
  commentData?: TikTokVideoCommentsScrapeResult | null;
  trendingCategory?: TrendingKocCategoryKey;
  trendingCreators?: TikTokTrendingCreatorItem[];
}

interface DailyHistoryStore {
  dateKey: string;
  items: TikTokCrawlerDailyHistoryItem[];
}

const RECORD_KEY = 'tiktok-crawler-daily-history';
const MAX_DAILY_ITEMS = 30;

function getVietnamDateAndTime(now = new Date()): { dateKey: string; timeLabel: string } {
  const vnDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const vnTime = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return { dateKey: vnDate, timeLabel: vnTime };
}

function normalizeQueryKey(tab: CrawlerHistoryTabKey, rawInput: string): string {
  const clean = (rawInput || '').trim().toLowerCase();
  if (tab === 'COMPETITOR_KOCS') {
    return clean.replace(/^@+/, '');
  }
  if (tab === 'HASHTAG_DISCOVERY') {
    return clean.replace(/^#+/, '');
  }
  return clean;
}

async function mutateHistoryWithRetry(
  mutator: (current: DailyHistoryStore, todayKey: string) => DailyHistoryStore
): Promise<DailyHistoryStore> {
  const { dateKey: todayKey } = getVietnamDateAndTime();
  const fallback: DailyHistoryStore = { dateKey: todayKey, items: [] };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const currentRecord = await readRecord<DailyHistoryStore>(RECORD_KEY, fallback);
      const updated = await updateRecord<DailyHistoryStore>(
        RECORD_KEY,
        fallback,
        currentRecord.revision,
        (data) => {
          const normalized: DailyHistoryStore = {
            dateKey: todayKey,
            items: Array.isArray(data?.items)
              ? data.items.filter((item) => item && item.dateKey === todayKey)
              : [],
          };
          return mutator(normalized, todayKey);
        }
      );
      return updated.data;
    } catch (err) {
      if (err instanceof RecordError && err.status === 409 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return fallback;
}

export async function GET() {
  try {
    const { dateKey: todayKey } = getVietnamDateAndTime();
    const fallback: DailyHistoryStore = { dateKey: todayKey, items: [] };
    const record = await readRecord<DailyHistoryStore>(RECORD_KEY, fallback);
    const todayItems = Array.isArray(record.data?.items)
      ? record.data.items.filter((item) => item && item.dateKey === todayKey)
      : [];

    return NextResponse.json({
      success: true,
      dateKey: todayKey,
      items: todayItems,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Không tải được lịch sử quét trong ngày.',
        items: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tab = body.tab as CrawlerHistoryTabKey;
    const rawInput = String(body.rawInput || '').trim();
    const queryLabel = String(body.queryLabel || rawInput).trim();
    const staffName = String(body.staffName || 'Nhân sự B2C').trim();

    if (!tab || !rawInput) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin phiên quét.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const { dateKey: todayKey, timeLabel } = getVietnamDateAndTime(now);
    const queryKey = normalizeQueryKey(tab, String(body.queryKey || rawInput));

    const compResults = Array.isArray(body.compResults)
      ? (body.compResults as TikTokCompetitorKocResult[])
      : undefined;
    const tagResults = Array.isArray(body.tagResults)
      ? (body.tagResults as TikTokHashtagKocResult[])
      : undefined;
    const commentData = body.commentData
      ? (body.commentData as TikTokVideoCommentsScrapeResult)
      : undefined;
    const trendingCreators = Array.isArray(body.trendingCreators)
      ? (body.trendingCreators as TikTokTrendingCreatorItem[])
      : undefined;

    const resultCount =
      compResults?.length ??
      tagResults?.length ??
      commentData?.comments?.length ??
      trendingCreators?.length ??
      Number(body.resultCount || 0);

    if (resultCount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Phiên quét không có dữ liệu để lưu lịch sử.',
      });
    }

    const store = await mutateHistoryWithRetry((current) => {
      const existingIdx = current.items.findIndex(
        (it) => it.tab === tab && it.queryKey === queryKey && it.dateKey === todayKey
      );

      const newItem: TikTokCrawlerDailyHistoryItem = {
        id:
          existingIdx >= 0
            ? current.items[existingIdx].id
            : `${todayKey}-${tab}-${queryKey}-${now.getTime()}`,
        dateKey: todayKey,
        tab,
        queryKey,
        queryLabel,
        rawInput,
        resultCount,
        staffName,
        updatedAt: now.toISOString(),
        timeLabel,
        compProfile: body.compProfile ?? undefined,
        compResults,
        tagResults,
        commentData,
        trendingCategory: body.trendingCategory ?? undefined,
        trendingCreators,
      };

      const remaining = current.items.filter(
        (_, idx) => idx !== existingIdx
      );
      const nextItems = [newItem, ...remaining].slice(0, MAX_DAILY_ITEMS);

      return {
        dateKey: todayKey,
        items: nextItems,
      };
    });

    return NextResponse.json({
      success: true,
      dateKey: store.dateKey,
      items: store.items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Không lưu được lịch sử quét trong ngày.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tab = searchParams.get('tab') as CrawlerHistoryTabKey | null;

    const store = await mutateHistoryWithRetry((current) => {
      let nextItems = current.items;
      if (id) {
        nextItems = current.items.filter((it) => it.id !== id);
      } else if (tab) {
        nextItems = current.items.filter((it) => it.tab !== tab);
      } else {
        nextItems = [];
      }
      return {
        dateKey: current.dateKey,
        items: nextItems,
      };
    });

    return NextResponse.json({
      success: true,
      dateKey: store.dateKey,
      items: store.items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Không xóa được lịch sử quét.',
      },
      { status: 500 }
    );
  }
}
