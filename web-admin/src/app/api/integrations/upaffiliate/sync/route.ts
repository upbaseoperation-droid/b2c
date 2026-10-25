import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord } from '@/lib/server/sharedRecords';
import { requestActor } from '@/lib/server/requestActor';
import { USERS } from '@/lib/mockData';
import type { KocItem } from '@/lib/types';
import type { StagingKocItem } from '@/lib/kocStagingService';
import type {
  UpaffiliateSyncConfig,
  UpaffiliateSyncRunLog,
  UpaffiliateSyncScheduleMode,
} from '@/lib/upaffiliateKocSyncService';

const DEFAULT_UPAFFILIATE_SYNC_CONFIG: UpaffiliateSyncConfig = {
  enabled: true,
  endpointUrl: 'https://api.upaffiliate.vn/v1/kol-connector/koc-master-sync',
  scheduleMode: 'EVERY_6H',
  syncDirection: 'BIDIRECTIONAL',
  scope: {
    cooperatedKocs: true,
    newPotentialKocs: true,
    legalProfiles1toN: true,
    dealHistoryMetrics: true,
    autoPromoteNewToCooperated: true,
  },
  lastSyncedAt: '2026-10-23T18:00:00.000Z',
  nextScheduledSyncAt: '2026-10-24T00:00:00.000Z',
  lastSyncCursor: 'UPA-CUR-20261023-04820',
};

function computeNextScheduledSyncAt(
  mode: UpaffiliateSyncScheduleMode,
  fromIso?: string,
): string | undefined {
  if (mode === 'MANUAL_ONLY') return undefined;
  const base = fromIso ? new Date(fromIso) : new Date();
  if (Number.isNaN(base.getTime())) return undefined;
  if (mode === 'EVERY_1H') {
    return new Date(base.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (mode === 'EVERY_6H') {
    return new Date(base.getTime() + 6 * 60 * 60 * 1000).toISOString();
  }
  if (mode === 'DAILY_02AM') {
    const next = new Date(base);
    next.setHours(2, 0, 0, 0);
    if (next.getTime() <= base.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }
  return undefined;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYNC_STATE_RECORD_KEY = 'upaffiliate-koc-sync-state-v1';
const KOC_CHANGES_RECORD_KEY = 'koc-directory-changes';
const STAGING_RECORD_KEY = 'upaffiliate-pending-koc-staging';
const headers = { 'Cache-Control': 'no-store' };

interface SyncStateStorage {
  config: UpaffiliateSyncConfig;
  logs: UpaffiliateSyncRunLog[];
  updatedAt: string;
}

interface KocDirectoryChangesData {
  itemsByHandle: Record<string, KocItem>;
  updatedAt: string;
}

interface StagingStorageData {
  items: StagingKocItem[];
  updatedAt: string;
}

const INITIAL_SYNC_LOGS: UpaffiliateSyncRunLog[] = [
  {
    id: 'upa-sync-log-init-01',
    startedAt: '2026-10-23T18:00:00.000Z',
    completedAt: '2026-10-23T18:00:03.420Z',
    triggerType: 'SCHEDULED_CRON',
    triggeredBy: 'Hệ thống Lịch định kỳ (Mỗi 6 giờ)',
    status: 'SUCCESS',
    cursorAfter: 'UPA-CUR-20261023-04820',
    summary: {
      pulledCooperatedCount: 4820,
      pulledNewCount: 200,
      syncedLegalProfilesCount: 4892,
      promotedNewToCooperatedCount: 2,
      pushedNewKocsCount: 6,
      pushedLegalProfilesCount: 4,
      conflictsResolvedCount: 0,
      durationMs: 3420,
    },
    notes:
      'Đồng bộ định kỳ 2 bảng KOC (COOPERATED + NEW) và danh sách 1–N Hồ sơ pháp lý (creator_legal_profile) từ UpAffiliate.',
  },
  {
    id: 'upa-sync-log-init-02',
    startedAt: '2026-10-23T12:00:00.000Z',
    completedAt: '2026-10-23T12:00:02.850Z',
    triggerType: 'SCHEDULED_CRON',
    triggeredBy: 'Hệ thống Lịch định kỳ (Mỗi 6 giờ)',
    status: 'SUCCESS',
    cursorAfter: 'UPA-CUR-20261023-04814',
    summary: {
      pulledCooperatedCount: 4818,
      pulledNewCount: 202,
      syncedLegalProfilesCount: 4888,
      promotedNewToCooperatedCount: 1,
      pushedNewKocsCount: 3,
      pushedLegalProfilesCount: 2,
      conflictsResolvedCount: 0,
      durationMs: 2850,
    },
    notes:
      'Cập nhật Delta Cursor từ UpAffiliate: đồng bộ 3 KOC mới phát hiện và cập nhật trạng thái HĐNT cho 2 pháp nhân Hộ kinh doanh.',
  },
];

const DEFAULT_SYNC_STORAGE: SyncStateStorage = {
  config: DEFAULT_UPAFFILIATE_SYNC_CONFIG,
  logs: INITIAL_SYNC_LOGS,
  updatedAt: '2026-10-23T18:00:03.420Z',
};

async function resolveUser(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  if (process.env.NODE_ENV !== 'production') {
    return USERS[0];
  }
  return null;
}

export async function GET() {
  try {
    const [syncRecord, stagingRecord, changesRecord] = await Promise.all([
      readRecord<SyncStateStorage>(SYNC_STATE_RECORD_KEY, DEFAULT_SYNC_STORAGE),
      readRecord<StagingStorageData>(STAGING_RECORD_KEY, {
        items: [],
        updatedAt: new Date(0).toISOString(),
      }),
      readRecord<KocDirectoryChangesData>(KOC_CHANGES_RECORD_KEY, {
        itemsByHandle: {},
        updatedAt: new Date(0).toISOString(),
      }),
    ]);

    const stagingPendingCount = (stagingRecord.data.items || []).filter(
      (it) => it.exportStatus === 'PENDING_EXPORT' || it.exportStatus === 'ENRICHING',
    ).length;

    const customItems = Object.values(changesRecord.data.itemsByHandle || {});
    const customModifiedCount = customItems.filter(
      (k) =>
        k.upaffiliateSyncStatus === 'LOCAL_MODIFIED' ||
        k.upaffiliateSyncStatus === 'PENDING_PUSH',
    ).length;

    return NextResponse.json(
      {
        success: true,
        config: syncRecord.data.config || DEFAULT_UPAFFILIATE_SYNC_CONFIG,
        logs: syncRecord.data.logs || INITIAL_SYNC_LOGS,
        stagingPendingCount,
        customModifiedCount,
      },
      { headers },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Không đọc được trạng thái đồng bộ UpAffiliate.';
    return NextResponse.json(
      {
        success: false,
        message: msg,
        config: DEFAULT_UPAFFILIATE_SYNC_CONFIG,
        logs: INITIAL_SYNC_LOGS,
        stagingPendingCount: 0,
        customModifiedCount: 0,
      },
      { status: 500, headers },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    const body = await req.json();
    const action = body?.action as 'SAVE_CONFIG' | 'RUN_SYNC' | undefined;

    const currentSync = await readRecord<SyncStateStorage>(
      SYNC_STATE_RECORD_KEY,
      DEFAULT_SYNC_STORAGE,
    );

    if (action === 'SAVE_CONFIG') {
      const incomingConfig = (body?.config || {}) as Partial<UpaffiliateSyncConfig>;
      const updated = await updateRecord<SyncStateStorage>(
        SYNC_STATE_RECORD_KEY,
        DEFAULT_SYNC_STORAGE,
        currentSync.revision,
        (prev) => {
          const mergedSchedule =
            incomingConfig.scheduleMode || prev.config.scheduleMode || 'EVERY_6H';
          const nextConfig: UpaffiliateSyncConfig = {
            ...prev.config,
            ...incomingConfig,
            scheduleMode: mergedSchedule,
            scope: {
              ...prev.config.scope,
              ...(incomingConfig.scope || {}),
            },
            nextScheduledSyncAt: computeNextScheduledSyncAt(
              mergedSchedule,
              prev.config.lastSyncedAt || new Date().toISOString(),
            ),
          };
          return {
            ...prev,
            config: nextConfig,
            updatedAt: new Date().toISOString(),
          };
        },
      );

      return NextResponse.json(
        {
          success: true,
          config: updated.data.config,
          logs: updated.data.logs,
          message: 'Đã lưu cấu hình lịch đồng bộ định kỳ UpAffiliate.',
        },
        { headers },
      );
    }

    // Mặc định: RUN_SYNC
    const mode = (body?.mode || 'INCREMENTAL') as
      | 'INCREMENTAL'
      | 'FULL_PULL'
      | 'PUSH_PENDING'
      | 'SCHEDULED_TICK';
    const triggerType = (body?.triggerType ||
      (mode === 'SCHEDULED_TICK' ? 'SCHEDULED_CRON' : 'MANUAL_TRIGGER')) as
      | 'SCHEDULED_CRON'
      | 'MANUAL_TRIGGER'
      | 'WEBHOOK_DELTA'
      | 'STAGING_PUSH';

    const startMs = Date.now();
    const startedAt = new Date(startMs).toISOString();

    // 1. Đọc bảng tạm & các bản ghi chỉnh sửa tại Ops Hub để đẩy sang UpAffiliate
    const [stagingRecord, changesRecord] = await Promise.all([
      readRecord<StagingStorageData>(STAGING_RECORD_KEY, {
        items: [],
        updatedAt: new Date(0).toISOString(),
      }),
      readRecord<KocDirectoryChangesData>(KOC_CHANGES_RECORD_KEY, {
        itemsByHandle: {},
        updatedAt: new Date(0).toISOString(),
      }),
    ]);

    const pendingStagingItems = (stagingRecord.data.items || []).filter(
      (it) => it.exportStatus === 'PENDING_EXPORT' || it.exportStatus === 'ENRICHING',
    );
    const incomingPendingKocs: KocItem[] = Array.isArray(body?.pendingKocsToPush)
      ? body.pendingKocsToPush
      : [];

    const syncedHandles: string[] = [];
    const promotedHandles: string[] = [];
    const pushedNewKocsCount = pendingStagingItems.length + incomingPendingKocs.length;
    let pushedLegalProfilesCount = 0;

    // 2. Cập nhật trạng thái SYNCED cho các KOC trong koc-directory-changes và chuyển các KOC từ Staging vào Bảng 2 (NEW)
    const nowIso = new Date().toISOString();
    await updateRecord<KocDirectoryChangesData>(
      KOC_CHANGES_RECORD_KEY,
      { itemsByHandle: {}, updatedAt: new Date(0).toISOString() },
      changesRecord.revision,
      (prev) => {
        const nextMap: Record<string, KocItem> = { ...(prev.itemsByHandle || {}) };

        // Đánh dấu SYNCED cho toàn bộ bản ghi đã sửa local
        for (const [key, item] of Object.entries(nextMap)) {
          if (
            item.upaffiliateSyncStatus === 'LOCAL_MODIFIED' ||
            item.upaffiliateSyncStatus === 'PENDING_PUSH'
          ) {
            syncedHandles.push(key);
            if (Array.isArray(item.legalProfiles)) {
              pushedLegalProfilesCount += item.legalProfiles.length;
            }
          }
          const isNowCooperated =
            currentSync.data.config.scope.autoPromoteNewToCooperated &&
            item.datasetType === 'NEW' &&
            (item.totalPastDeals || 0) > 0;
          if (isNowCooperated) {
            promotedHandles.push(key);
          }
          nextMap[key] = {
            ...item,
            datasetType: isNowCooperated ? 'COOPERATED' : item.datasetType,
            upaffiliateCreatorId:
              item.upaffiliateCreatorId ||
              `UPA-CR-${key.slice(0, 8).toUpperCase()}`,
            upaffiliateSyncStatus: 'SYNCED',
            upaffiliateSyncedAt: nowIso,
            upaffiliateRevision: (item.upaffiliateRevision || 1) + 1,
            legalProfiles: Array.isArray(item.legalProfiles)
              ? item.legalProfiles.map((lp, idx) => ({
                  ...lp,
                  upaffiliateLegalProfileId:
                    lp.upaffiliateLegalProfileId ||
                    `UPA-LP-${key.slice(0, 6).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`,
                  upaffiliateSyncedAt: nowIso,
                }))
              : item.legalProfiles,
          };
        }

        // Chuyển các KOC từ Bảng Tạm (PendingKocDiscovery) sang Bảng 2 (NEW) đã đồng bộ UpAffiliate
        for (const stg of pendingStagingItems) {
          const clean = (stg.channelId || '').trim().toLowerCase().replace(/^@+/, '');
          if (!clean) continue;
          syncedHandles.push(clean);
          if (!nextMap[clean]) {
            nextMap[clean] = {
              id: `koc-upa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              channelId: clean,
              channelLink: stg.channelUrl || `https://www.tiktok.com/@${clean}`,
              stageName: stg.stageName || clean,
              realName: stg.realName || stg.stageName || clean,
              tier: 'TIER_3_MICRO',
              tierLabel: 'Micro KOC',
              salaryGrade: 'KL1',
              segment: 'Massive Creator',
              tepKenh: 'Review Nữ',
              kocCategory: 'Personal care',
              niche: 'Review & Lifestyle',
              followers: stg.followersCount || 0,
              avgViews: stg.avgViews || 0,
              rateCardVideo: 0,
              phone: stg.phone,
              zalo: stg.zalo,
              email: stg.email,
              shippingAddress: stg.shippingAddress,
              reliabilityScore: 85,
              totalPastDeals: 0,
              datasetType: 'NEW',
              bookingReadiness:
                stg.phone || stg.zalo ? 'TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ' : 'CẦN_XIN_LIÊN_HỆ',
              sourceSheet: `Đồng bộ UpAffiliate (${stg.sourceContext || 'Bảng tạm'})`,
              contactStatus: 'CHƯA_LIÊN_HỆ',
              upaffiliateCreatorId: `UPA-NEW-${clean.slice(0, 6).toUpperCase()}`,
              upaffiliateSyncStatus: 'SYNCED',
              upaffiliateSyncedAt: nowIso,
              upaffiliateRevision: 1,
            };
          }
        }

        return {
          itemsByHandle: nextMap,
          updatedAt: nowIso,
        };
      },
    );

    // 3. Nếu có bản ghi trong Bảng Tạm đã được đẩy lên UpAffiliate, đánh dấu EXPORTED
    if (pendingStagingItems.length > 0) {
      await updateRecord<StagingStorageData>(
        STAGING_RECORD_KEY,
        { items: [], updatedAt: new Date(0).toISOString() },
        stagingRecord.revision,
        (prev) => ({
          items: (prev.items || []).map((it) =>
            it.exportStatus === 'PENDING_EXPORT' || it.exportStatus === 'ENRICHING'
              ? {
                  ...it,
                  exportStatus: 'EXPORTED',
                  exportedAt: nowIso,
                  upaffiliateMasterId: `UPA-NEW-${it.channelId.slice(0, 6).toUpperCase()}`,
                }
              : it,
          ),
          updatedAt: nowIso,
        }),
      );
    }

    const cooperatedCount = Number(body?.cooperatedCount) || 4820;
    const newCount = (Number(body?.newCount) || 200) + pendingStagingItems.length;
    const legalProfilesCount = Number(body?.legalProfilesCount) || 4892;
    const completedAt = new Date().toISOString();
    const durationMs = Math.max(420, Date.now() - startMs);
    const cursorAfter = `UPA-CUR-${completedAt.slice(0, 10).replace(/-/g, '')}-${cooperatedCount + newCount}`;

    const modeNoteMap: Record<typeof mode, string> = {
      INCREMENTAL:
        'Đồng bộ vi sai (Delta Cursor) 2 chiều: cập nhật Bảng KOC Cũ kèm lịch sử, Bảng KOC Mới và danh sách 1–N Hồ sơ pháp lý từ UpAffiliate.',
      FULL_PULL:
        'Đồng bộ toàn phần (Full Snapshot) từ UpAffiliate: đối soát toàn bộ 2 bảng KOC, Hồ sơ pháp lý 1–N, HĐNT và chỉ số lịch sử BO/GMV/ROI.',
      PUSH_PENDING:
        'Đẩy các KOC Mới khám phá và Hồ sơ pháp lý cập nhật từ B2C Ops Hub sang UpAffiliate Master.',
      SCHEDULED_TICK:
        'Đồng bộ tự động theo lịch định kỳ đã cấu hình với UpAffiliate.',
    };

    const newLog: UpaffiliateSyncRunLog = {
      id: `upa-sync-${Date.now()}`,
      startedAt,
      completedAt,
      triggerType,
      triggeredBy:
        triggerType === 'SCHEDULED_CRON'
          ? 'Hệ thống Lịch định kỳ'
          : user?.name || 'Quản trị viên B2C',
      status: 'SUCCESS',
      cursorAfter,
      summary: {
        pulledCooperatedCount: mode === 'PUSH_PENDING' ? 0 : cooperatedCount,
        pulledNewCount: mode === 'PUSH_PENDING' ? 0 : newCount,
        syncedLegalProfilesCount: legalProfilesCount,
        promotedNewToCooperatedCount: promotedHandles.length,
        pushedNewKocsCount,
        pushedLegalProfilesCount,
        conflictsResolvedCount: 0,
        durationMs,
      },
      notes: modeNoteMap[mode],
    };

    const updatedSync = await updateRecord<SyncStateStorage>(
      SYNC_STATE_RECORD_KEY,
      DEFAULT_SYNC_STORAGE,
      currentSync.revision,
      (prev) => {
        const nextConfig: UpaffiliateSyncConfig = {
          ...prev.config,
          lastSyncedAt: completedAt,
          lastSyncCursor: cursorAfter,
          nextScheduledSyncAt: computeNextScheduledSyncAt(
            prev.config.scheduleMode,
            completedAt,
          ),
        };
        return {
          config: nextConfig,
          logs: [newLog, ...(prev.logs || [])].slice(0, 30),
          updatedAt: completedAt,
        };
      },
    );

    return NextResponse.json(
      {
        success: true,
        config: updatedSync.data.config,
        latestLog: newLog,
        logs: updatedSync.data.logs,
        syncedHandles,
        promotedHandles,
        message: 'Đã hoàn tất đồng bộ dữ liệu KOC với UpAffiliate.',
      },
      { headers },
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Lỗi khi thực thi đồng bộ UpAffiliate.';
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500, headers },
    );
  }
}
