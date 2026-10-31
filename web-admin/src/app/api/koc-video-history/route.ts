import { NextRequest, NextResponse } from 'next/server';
import { USERS } from '@/lib/mockData';
import type { KocItem } from '@/lib/types';
import { getSalaryGradeFromRate, getSegmentFromSalaryGrade } from '@/lib/types';
import { requestActor } from '@/lib/server/requestActor';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import {
  KOC_VIDEO_HISTORY_RECORD_KEY,
  aggregateKocHistoryFromVideoSnapshots,
  buildInitialWeeklyHistoryStore,
  extractSystemVideoId,
  ingestWeeklyRowsBySystemVideoId,
  normalizeChannelHandle,
  registerNewSystemVideo,
  registerNewSystemVideosBatch,
  sanitizeWeeklyHistoryStore,
  type KocVideoWeeklyHistoryStoreData,
  type RegisterSystemVideoPayload,
  type SystemRegisteredVideo,
  type WeeklyVideoInputRow,
} from '@/lib/kocVideoWeeklyHistory';
import type { KocDirectoryChangesData } from '@/app/api/kocs/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const KOC_DIRECTORY_KEY = 'koc-directory-changes';

let cachedDefaultStore: KocVideoWeeklyHistoryStoreData | null = null;
function getDefaultStore(): KocVideoWeeklyHistoryStoreData {
  if (!cachedDefaultStore) {
    cachedDefaultStore = buildInitialWeeklyHistoryStore();
  }
  return cachedDefaultStore;
}

async function resolveUser(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  if (process.env.NODE_ENV !== 'production') {
    return USERS[0];
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Phiên đăng nhập không hợp lệ.' },
        { status: 401, headers }
      );
    }

    const { searchParams } = new URL(req.url);
    const weekKey = searchParams.get('weekKey')?.trim() || '';
    const videoIdFilter = extractSystemVideoId(searchParams.get('videoId'));
    const channelFilter = normalizeChannelHandle(searchParams.get('channelId'));
    const kocIdFilter = searchParams.get('kocId')?.trim() || '';
    const brandFilter = searchParams.get('brandName')?.trim() || '';

    const record = await readRecord<KocVideoWeeklyHistoryStoreData>(
      KOC_VIDEO_HISTORY_RECORD_KEY,
      getDefaultStore()
    );

    const sanitized = sanitizeWeeklyHistoryStore(record.data);
    let store = sanitized.store;
    let currentRevision = record.revision;

    // Tự động lưu bản ghi đã làm sạch xuống DB nếu phát hiện dữ liệu thừa (registeredVideos / chuỗi lặp 32KB)
    if (sanitized.changed && record.revision > 0) {
      try {
        const cleanedRec = await updateRecord<KocVideoWeeklyHistoryStoreData>(
          KOC_VIDEO_HISTORY_RECORD_KEY,
          getDefaultStore(),
          record.revision,
          () => sanitized.store
        );
        store = cleanedRec.data;
        currentRevision = cleanedRec.revision;
      } catch {
        // Bỏ qua nếu có xung đột đồng thời
      }
    }

    let registeredVideos = Object.values(store.registeredVideosById || {});
    let videoSnapshots = Object.values(store.snapshotsByKey || {});

    if (videoIdFilter) {
      registeredVideos = registeredVideos.filter((v) => v.videoId === videoIdFilter);
      videoSnapshots = videoSnapshots.filter((s) => s.videoId === videoIdFilter);
    }
    if (weekKey && weekKey !== 'ALL') {
      videoSnapshots = videoSnapshots.filter((s) => s.weekKey === weekKey);
    }
    if (channelFilter) {
      registeredVideos = registeredVideos.filter(
        (v) => normalizeChannelHandle(v.kocChannelId) === channelFilter
      );
      videoSnapshots = videoSnapshots.filter(
        (s) => normalizeChannelHandle(s.kocChannelId) === channelFilter
      );
    }
    if (kocIdFilter) {
      registeredVideos = registeredVideos.filter((v) => v.kocId === kocIdFilter);
      videoSnapshots = videoSnapshots.filter((s) => s.kocId === kocIdFilter);
    }
    if (brandFilter && brandFilter !== 'ALL') {
      registeredVideos = registeredVideos.filter((v) => v.brandName === brandFilter);
      videoSnapshots = videoSnapshots.filter((s) => s.brandName === brandFilter);
    }

    videoSnapshots.sort(
      (a, b) => b.weekKey.localeCompare(a.weekKey) || b.gmv - a.gmv
    );

    const kocSummaries = aggregateKocHistoryFromVideoSnapshots(store);

    return NextResponse.json(
      {
        success: true,
        revision: currentRevision,
        updatedAt: store.updatedAt,
        batches: store.batches || [],
        totalRegisteredVideos: Object.keys(store.registeredVideosById || {}).length,
        totalSnapshots: Object.keys(store.snapshotsByKey || {}).length,
        registeredVideos,
        videoSnapshots,
        kocSummaries,
      },
      { headers }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof RecordError
            ? err.message
            : 'Không tải được dữ liệu lịch sử KOC & Video Ads.',
      },
      { status: err instanceof RecordError ? err.status : 500, headers }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Phiên đăng nhập không hợp lệ.' },
        { status: 401, headers }
      );
    }

    const body = await req.json();
    const action = String(body.action || 'INGEST_WEEKLY_DATA').toUpperCase();
    const compactResponse = Boolean(body.compactResponse);

    const current = await readRecord<KocVideoWeeklyHistoryStoreData>(
      KOC_VIDEO_HISTORY_RECORD_KEY,
      getDefaultStore()
    );
    const currentCleanStore = sanitizeWeeklyHistoryStore(current.data).store;

    // 1. Khi phát sinh KOC mới (kèm tùy chọn đăng ký luôn Video mới của KOC đó)
    if (action === 'REGISTER_NEW_KOC') {
      const rawChannel = String(body.channelId || body.kocChannelId || '').trim();
      const cleanHandle = normalizeChannelHandle(rawChannel);
      if (!cleanHandle) {
        return NextResponse.json(
          { success: false, error: 'Thiếu ID kênh TikTok (channelId) của KOC mới.' },
          { status: 400, headers }
        );
      }

      const rateNet = Math.max(0, Number(body.rateCardVideo) || 0);
      const salaryGrade = body.salaryGrade || getSalaryGradeFromRate(rateNet);
      const segment = getSegmentFromSalaryGrade(salaryGrade);
      const stageName = String(body.stageName || body.kocStageName || cleanHandle).trim();

      const newKocItem: KocItem = {
        id: String(body.id || `koc-${cleanHandle}`),
        channelId: cleanHandle,
        channelLink: body.channelLink || `https://www.tiktok.com/@${cleanHandle}`,
        stageName,
        realName: String(body.realName || stageName).trim(),
        tier:
          rateNet >= 30000000
            ? 'TIER_1_CELEB'
            : rateNet >= 10000000
            ? 'TIER_2_MACRO'
            : rateNet >= 3000000
            ? 'TIER_3_MICRO'
            : 'TIER_4_AFFILIATE',
        tierLabel:
          rateNet >= 30000000
            ? 'Macro / Celeb'
            : rateNet >= 3000000
            ? 'Micro Creator'
            : 'Nano / Affiliate',
        salaryGrade,
        segment,
        tepKenh: body.tepKenh || 'Review Nữ',
        kocCategory: body.kocCategory || 'Personal care',
        niche: String(body.niche || body.tepKenh || 'Review Nữ'),
        followers: Math.max(0, Number(body.followers) || 0),
        avgViews: Math.max(0, Number(body.avgViews) || 0),
        rateCardVideo: rateNet,
        phone: body.phone ? String(body.phone).trim() : undefined,
        zalo: body.zalo ? String(body.zalo).trim() : undefined,
        email: body.email ? String(body.email).trim() : undefined,
        brandName: body.brandName ? String(body.brandName).trim() : undefined,
        bookingPic: body.pic || user.name,
        reliabilityScore: 100,
      };

      // Lưu vào Danh bạ KOC chung (`koc-directory-changes`)
      const currentKocDir = await readRecord<KocDirectoryChangesData>(KOC_DIRECTORY_KEY, {
        itemsByHandle: {},
        updatedAt: new Date(0).toISOString(),
      });
      await updateRecord<KocDirectoryChangesData>(
        KOC_DIRECTORY_KEY,
        { itemsByHandle: {}, updatedAt: new Date(0).toISOString() },
        currentKocDir.revision,
        (prev) => ({
          itemsByHandle: {
            ...(prev.itemsByHandle || {}),
            [cleanHandle]: {
              ...(prev.itemsByHandle?.[cleanHandle] || {}),
              ...newKocItem,
            },
          },
          updatedAt: new Date().toISOString(),
        })
      );

      // Nếu payload phát sinh KOC mới gửi kèm videoId / linkAir đầu tiên, đăng ký luôn vào sổ Video
      let registeredVideo: SystemRegisteredVideo | undefined;
      let updatedStore = currentCleanStore;
      if (body.videoId || body.linkAir) {
        const regResult = registerNewSystemVideo(currentCleanStore, {
          videoId: body.videoId,
          linkAir: body.linkAir,
          dealCode: body.dealCode,
          kocId: newKocItem.id,
          kocChannelId: cleanHandle,
          kocStageName: stageName,
          brandName: String(body.brandName || 'Cathy Doll'),
          storeName: String(body.storeName || `${body.brandName || 'Cathy Doll'}_TikTok_E2E-C`),
          productName: body.productName,
          campaignName: body.campaignName,
          videoTitle: body.videoTitle,
          airDate: body.airDate,
          weekKey: body.weekKey,
          pic: body.pic || user.name,
          klGrade: salaryGrade,
          bookingCostNet: rateNet,
          sparkAdsCode: body.sparkAdsCode,
          initialAdsSpend: body.initialAdsSpend,
          initialGmv: body.initialGmv,
          initialOrders: body.initialOrders,
          initialViews: body.initialViews,
          source: 'API_REGISTERED',
        });
        registeredVideo = regResult.registeredVideo;
        const saved = await updateRecord<KocVideoWeeklyHistoryStoreData>(
          KOC_VIDEO_HISTORY_RECORD_KEY,
          getDefaultStore(),
          current.revision,
          () => regResult.nextStore
        );
        updatedStore = saved.data;
      }

      return NextResponse.json(
        {
          success: true,
          action: 'REGISTER_NEW_KOC',
          koc: newKocItem,
          registeredVideo,
          ...(compactResponse
            ? {}
            : { kocSummaries: aggregateKocHistoryFromVideoSnapshots(updatedStore) }),
        },
        { headers }
      );
    }

    // 2. Khi phát sinh Video mới (theo videoId của hệ thống)
    if (action === 'REGISTER_NEW_VIDEO') {
      const regResult = registerNewSystemVideo(currentCleanStore, {
        videoId: body.videoId,
        linkAir: body.linkAir,
        dealCode: body.dealCode,
        kocId: body.kocId,
        kocChannelId: String(body.kocChannelId || body.channelId || '').trim(),
        kocStageName: body.kocStageName || body.stageName,
        brandName: String(body.brandName || 'Cathy Doll'),
        storeName: String(body.storeName || `${body.brandName || 'Cathy Doll'}_TikTok_E2E-C`),
        productName: body.productName,
        campaignName: body.campaignName,
        videoTitle: body.videoTitle,
        airDate: body.airDate,
        weekKey: body.weekKey,
        pic: body.pic || user.name,
        klGrade: body.klGrade,
        bookingCostNet: body.bookingCostNet,
        sparkAdsCode: body.sparkAdsCode,
        authorizationType: body.authorizationType,
        initialAdsSpend: body.initialAdsSpend,
        initialGmv: body.initialGmv,
        initialOrders: body.initialOrders,
        initialViews: body.initialViews,
        source: body.source || 'API_REGISTERED',
      });

      const saved = await updateRecord<KocVideoWeeklyHistoryStoreData>(
        KOC_VIDEO_HISTORY_RECORD_KEY,
        getDefaultStore(),
        current.revision,
        () => regResult.nextStore
      );

      return NextResponse.json(
        {
          success: true,
          action: 'REGISTER_NEW_VIDEO',
          revision: saved.revision,
          registeredVideo: regResult.registeredVideo,
          initialSnapshot: regResult.initialSnapshot,
          ...(compactResponse
            ? {}
            : { kocSummaries: aggregateKocHistoryFromVideoSnapshots(saved.data) }),
        },
        { headers }
      );
    }

    // 2b. Đăng ký hàng loạt Video trong 1 giao dịch DB duy nhất
    if (action === 'REGISTER_VIDEOS_BATCH') {
      const rawVideos: Array<Record<string, unknown>> = Array.isArray(body.videos)
        ? body.videos
        : [];
      if (rawVideos.length === 0) {
        return NextResponse.json(
          { success: true, action: 'REGISTER_VIDEOS_BATCH', registeredCount: 0 },
          { headers }
        );
      }

      const payloads: RegisterSystemVideoPayload[] = rawVideos.map((v) => ({
        videoId: v.videoId ? String(v.videoId) : undefined,
        linkAir: v.linkAir ? String(v.linkAir) : undefined,
        dealCode: v.dealCode ? String(v.dealCode) : undefined,
        kocId: v.kocId ? String(v.kocId) : undefined,
        kocChannelId: String(v.kocChannelId || v.channelId || '').trim(),
        kocStageName: v.kocStageName ? String(v.kocStageName) : undefined,
        brandName: String(v.brandName || 'Cathy Doll'),
        storeName: String(v.storeName || `${v.brandName || 'Cathy Doll'}_TikTok_E2E-C`),
        productName: v.productName ? String(v.productName) : undefined,
        campaignName: v.campaignName ? String(v.campaignName) : undefined,
        videoTitle: v.videoTitle ? String(v.videoTitle) : undefined,
        airDate: v.airDate ? String(v.airDate) : undefined,
        weekKey: v.weekKey ? String(v.weekKey) : undefined,
        pic: String(v.pic || user.name),
        klGrade: v.klGrade ? String(v.klGrade) : undefined,
        bookingCostNet: Number(v.bookingCostNet) || 0,
        sparkAdsCode: v.sparkAdsCode ? String(v.sparkAdsCode) : undefined,
        authorizationType: v.authorizationType ? String(v.authorizationType) : undefined,
        initialAdsSpend: Number(v.initialAdsSpend) || 0,
        initialGmv: Number(v.initialGmv) || 0,
        initialOrders: Number(v.initialOrders) || 0,
        initialViews: Number(v.initialViews) || 0,
        source: (v.source as SystemRegisteredVideo['source']) || 'SYSTEM_BOOKING',
      }));

      const batchResult = registerNewSystemVideosBatch(currentCleanStore, payloads);
      const saved = await updateRecord<KocVideoWeeklyHistoryStoreData>(
        KOC_VIDEO_HISTORY_RECORD_KEY,
        getDefaultStore(),
        current.revision,
        () => batchResult.nextStore
      );

      return NextResponse.json(
        {
          success: true,
          action: 'REGISTER_VIDEOS_BATCH',
          revision: saved.revision,
          registeredCount: batchResult.registeredVideos.length,
          ...(compactResponse
            ? {}
            : {
                registeredVideos: batchResult.registeredVideos,
                kocSummaries: aggregateKocHistoryFromVideoSnapshots(saved.data),
              }),
        },
        { headers }
      );
    }

    // 3. Nạp dữ liệu lịch sử Video Ads hàng tuần theo `videoId` của hệ thống
    const rows: WeeklyVideoInputRow[] = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Danh sách dòng dữ liệu tuần (rows) trống hoặc thiếu videoId.',
        },
        { status: 400, headers }
      );
    }

    const weekKey = String(body.weekKey || '2026-W42').trim();
    const fileName = String(body.fileName || `API_Weekly_Sync_${weekKey}.json`).trim();

    const ingestResult = ingestWeeklyRowsBySystemVideoId(currentCleanStore, {
      weekKey,
      weekLabel: body.weekLabel,
      dateRange: body.dateRange,
      fileName,
      sourceType: body.sourceType === 'EXCEL_UPLOAD' ? 'EXCEL_UPLOAD' : 'API_INGEST',
      importedBy: user.name,
      defaultBrandName: body.brandName,
      defaultStoreName: body.storeName,
      rows,
    });

    const saved = await updateRecord<KocVideoWeeklyHistoryStoreData>(
      KOC_VIDEO_HISTORY_RECORD_KEY,
      getDefaultStore(),
      current.revision,
      () => ingestResult.nextStore
    );

    return NextResponse.json(
      {
        success: true,
        action: 'INGEST_WEEKLY_DATA',
        revision: saved.revision,
        batchLog: ingestResult.batchLog,
        matchedCount: ingestResult.matchedCount,
        newlyRegisteredVideosCount: ingestResult.newlyRegisteredVideosCount,
        batches: saved.data.batches,
        ...(compactResponse
          ? {}
          : {
              videoSnapshots: Object.values(saved.data.snapshotsByKey).sort(
                (a, b) => b.weekKey.localeCompare(a.weekKey) || b.gmv - a.gmv
              ),
              kocSummaries: aggregateKocHistoryFromVideoSnapshots(saved.data),
            }),
      },
      { headers }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof RecordError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Lỗi khi ghi nhận dữ liệu lịch sử KOC & Video Ads.',
      },
      { status: err instanceof RecordError ? err.status : 400, headers }
    );
  }
}
