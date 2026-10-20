import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import {
  getVerdictLabel,
  normalizeKocChannelHandle,
  type KocChannelReviewItem,
  type KocChannelReviewVerdict,
} from '@/lib/kocChannelReviewService';

interface ChannelReviewStore {
  items: KocChannelReviewItem[];
}

const RECORD_KEY = 'koc-channel-reviews';
const MAX_REVIEW_ITEMS = 1000;

function getVietnamDateAndTime(now = new Date()): { dateLabel: string; timeLabel: string } {
  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return { dateLabel, timeLabel };
}

function buildInitialReviewSeed(): KocChannelReviewItem[] {
  return [
    {
      id: 'seed-rev-quinskincareholic-1',
      handle: 'quinskincareholic',
      channelName: 'Quin Skincare Holic',
      channelUrl: 'https://www.tiktok.com/@quinskincareholic',
      verdict: 'NOT_SUITABLE',
      verdictLabel: 'Không phù hợp',
      reasonTags: [
        'Đơn giá cao so với chuyển đổi thực tế',
        'Đã hợp tác độc quyền đối thủ',
      ],
      note: 'Kênh đang nhận gói booking cố định cho dòng chống nắng của đối thủ trực tiếp trong quý này, báo giá lẻ cao hơn định mức KL4.',
      brandScope: 'ClubClio',
      sourceScreen: 'KOC của đối thủ',
      reviewerName: 'Lê Phương Thảo',
      reviewerRole: 'Chuyên viên Booking B2C',
      createdAt: '2026-10-18T10:15:00+07:00',
      dateLabel: '18/10/2026',
      timeLabel: '10:15',
    },
    {
      id: 'seed-rev-linhnhireview-1',
      handle: 'linhnhireview',
      channelName: 'Linh Nhi Review',
      channelUrl: 'https://www.tiktok.com/@linhnhireview',
      verdict: 'NOT_SUITABLE',
      verdictLabel: 'Không phù hợp',
      reasonTags: [
        'Tệp khán giả không khớp ngành hàng',
        'Tương tác thấp / Nghi vấn buff view',
      ],
      note: 'Lượt xem cao nhưng phần bình luận chủ yếu là tài khoản seeding, tệp người xem tuổi dưới 18 không khớp tệp khách hàng mục tiêu.',
      brandScope: 'Dear, Klairs',
      sourceScreen: 'KOC theo #Hashtag',
      reviewerName: 'Lương Thị Như Quỳnh',
      reviewerRole: 'Chuyên viên Booking B2C',
      createdAt: '2026-10-19T14:30:00+07:00',
      dateLabel: '19/10/2026',
      timeLabel: '14:30',
    },
    {
      id: 'seed-rev-mevabe.chloe-1',
      handle: 'chloenguyen.official',
      channelName: 'Chloe Nguyễn',
      channelUrl: 'https://www.tiktok.com/@chloenguyen.official',
      verdict: 'SUITABLE',
      verdictLabel: 'Phù hợp',
      reasonTags: [
        'Tệp khán giả khớp chân dung khách hàng Brand',
        'Hình ảnh / Giọng điệu hợp định vị Brand',
      ],
      note: 'Hình ảnh chỉn chu, giọng đọc truyền cảm, tệp mẹ bỉm và phụ nữ 25-35 tuổi tương tác hỏi mua rất tốt cho dòng chăm sóc da.',
      brandScope: 'Kutieskin',
      sourceScreen: 'Danh bạ KOC',
      reviewerName: 'Nguyễn Thị Ngọc Tâm',
      reviewerRole: 'Trưởng nhóm Booking B2C',
      createdAt: '2026-10-20T09:20:00+07:00',
      dateLabel: '20/10/2026',
      timeLabel: '09:20',
    },
  ];
}

let inMemoryFallbackStore: ChannelReviewStore | null = null;

async function readReviewStore(): Promise<ChannelReviewStore> {
  const seedFallback: ChannelReviewStore = {
    items: buildInitialReviewSeed(),
  };

  try {
    const record = await readRecord<ChannelReviewStore>(RECORD_KEY, seedFallback);
    const rawItems =
      record.revision === 0 && (!record.data?.items || record.data.items.length === 0)
        ? seedFallback.items
        : Array.isArray(record.data?.items)
          ? record.data.items
          : [];
    const sorted = [...rawItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return { items: sorted };
  } catch {
    if (!inMemoryFallbackStore) {
      inMemoryFallbackStore = seedFallback;
    }
    return inMemoryFallbackStore;
  }
}

async function mutateReviewsWithRetry(
  mutator: (current: ChannelReviewStore) => ChannelReviewStore
): Promise<ChannelReviewStore> {
  const seedFallback: ChannelReviewStore = {
    items: buildInitialReviewSeed(),
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const currentRecord = await readRecord<ChannelReviewStore>(RECORD_KEY, seedFallback);
      const updated = await updateRecord<ChannelReviewStore>(
        RECORD_KEY,
        seedFallback,
        currentRecord.revision,
        (data) => {
          const baseItems =
            currentRecord.revision === 0 && (!data?.items || data.items.length === 0)
              ? seedFallback.items
              : Array.isArray(data?.items)
                ? data.items
                : [];
          return mutator({ items: baseItems });
        }
      );
      return updated.data;
    } catch (err) {
      if (err instanceof RecordError && err.status === 409 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
        continue;
      }
      if (!inMemoryFallbackStore) {
        inMemoryFallbackStore = seedFallback;
      }
      inMemoryFallbackStore = mutator(inMemoryFallbackStore);
      return inMemoryFallbackStore;
    }
  }
  return seedFallback;
}

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }

  try {
    const store = await readReviewStore();
    const handleParam = req.nextUrl.searchParams.get('handle');
    const cleanHandle = normalizeKocChannelHandle(handleParam);
    const items = cleanHandle
      ? store.items.filter((it) => normalizeKocChannelHandle(it.handle) === cleanHandle)
      : store.items;

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : 'Không tải được lịch sử đánh giá kênh KOC.',
        items: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền ghi nhận đánh giá nội bộ.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const cleanHandle = normalizeKocChannelHandle(body.handle);
    if (!cleanHandle) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp mã kênh (@handle) hợp lệ.' },
        { status: 400 }
      );
    }

    const verdict: KocChannelReviewVerdict =
      body.verdict === 'CAUTION' || body.verdict === 'SUITABLE'
        ? body.verdict
        : 'NOT_SUITABLE';

    const reasonTags = Array.isArray(body.reasonTags)
      ? body.reasonTags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];
    const note = String(body.note || '').trim();

    if (reasonTags.length === 0 && !note) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng chọn ít nhất một lý do hoặc nhập ghi chú đánh giá.',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const { dateLabel, timeLabel } = getVietnamDateAndTime(now);
    const reviewerName = String(body.reviewerName || user.name || 'Nhân sự B2C').trim();
    const reviewerRole = String(body.reviewerRole || user.role || '').trim();
    const reviewerEmail = String(body.reviewerEmail || user.email || '').trim();

    const newItem: KocChannelReviewItem = {
      id: `rev-${cleanHandle}-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      handle: cleanHandle,
      channelName: String(body.channelName || `@${cleanHandle}`).trim(),
      channelUrl:
        String(body.channelUrl || '').trim() || `https://www.tiktok.com/@${cleanHandle}`,
      avatarUrl: body.avatarUrl ? String(body.avatarUrl).trim() : undefined,
      verdict,
      verdictLabel: getVerdictLabel(verdict),
      reasonTags,
      note,
      brandScope: String(body.brandScope || 'Toàn hệ thống B2C').trim(),
      sourceScreen: String(body.sourceScreen || 'Tìm kiếm KOC').trim(),
      reviewerName,
      reviewerRole: reviewerRole || undefined,
      reviewerEmail: reviewerEmail || undefined,
      createdAt: now.toISOString(),
      dateLabel,
      timeLabel,
    };

    const store = await mutateReviewsWithRetry((current) => {
      const nextItems = [newItem, ...current.items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_REVIEW_ITEMS);
      return { items: nextItems };
    });

    return NextResponse.json({
      success: true,
      item: newItem,
      items: store.items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Lỗi khi lưu lịch sử đánh giá kênh KOC.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Vui lòng đăng nhập.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { success: false, error: 'Tài khoản đối tác không có quyền xóa lịch sử đánh giá.' },
      { status: 403 }
    );
  }

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã đánh giá cần xóa.' },
        { status: 400 }
      );
    }

    const store = await mutateReviewsWithRetry((current) => ({
      items: current.items.filter((it) => it.id !== id),
    }));

    return NextResponse.json({
      success: true,
      items: store.items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Lỗi khi xóa đánh giá kênh KOC.',
      },
      { status: 500 }
    );
  }
}
