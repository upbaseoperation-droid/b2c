'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KocItem, KocLegalProfile } from './types';
import { getKocLegalProfiles } from '../components/koc/kocUtils';

export type UpaffiliateSyncScheduleMode =
  | 'EVERY_1H'
  | 'EVERY_6H'
  | 'DAILY_02AM'
  | 'MANUAL_ONLY';

export type UpaffiliateSyncDirection =
  | 'BIDIRECTIONAL'
  | 'PULL_FROM_UPAFFILIATE'
  | 'PUSH_TO_UPAFFILIATE';

export interface UpaffiliateSyncScope {
  cooperatedKocs: boolean; // Đồng bộ Bảng 1: KOC Cũ kèm lịch sử (COOPERATED)
  newPotentialKocs: boolean; // Đồng bộ Bảng 2: KOC Mới / Tiềm năng (NEW)
  legalProfiles1toN: boolean; // Đồng bộ 1–N Hồ sơ pháp lý & Thụ hưởng (creator_legal_profile + HĐNT)
  dealHistoryMetrics: boolean; // Đồng bộ lịch sử BO/Deal, GMV, Cost, ROI & biên độ giá Min–Max
  autoPromoteNewToCooperated: boolean; // Tự động chuyển KOC Mới sang Bảng KOC Hợp tác khi phát sinh BO nghiệm thu
}

export interface UpaffiliateSyncConfig {
  enabled: boolean;
  endpointUrl: string;
  scheduleMode: UpaffiliateSyncScheduleMode;
  syncDirection: UpaffiliateSyncDirection;
  scope: UpaffiliateSyncScope;
  lastSyncedAt?: string;
  nextScheduledSyncAt?: string;
  lastSyncCursor?: string;
}

export interface UpaffiliateSyncRunLog {
  id: string;
  startedAt: string;
  completedAt: string;
  triggerType: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' | 'WEBHOOK_DELTA' | 'STAGING_PUSH';
  triggeredBy: string;
  status: 'SUCCESS' | 'PARTIAL_WARNING' | 'FAILED';
  cursorAfter: string;
  summary: {
    pulledCooperatedCount: number;
    pulledNewCount: number;
    syncedLegalProfilesCount: number;
    promotedNewToCooperatedCount: number;
    pushedNewKocsCount: number;
    pushedLegalProfilesCount: number;
    conflictsResolvedCount: number;
    durationMs: number;
  };
  notes: string;
}

export interface UpaffiliateSyncStateResponse {
  success: boolean;
  config: UpaffiliateSyncConfig;
  logs: UpaffiliateSyncRunLog[];
  stagingPendingCount: number;
  customModifiedCount: number;
}

export const SCHEDULE_MODE_LABELS: Record<UpaffiliateSyncScheduleMode, string> = {
  EVERY_1H: 'Mỗi 1 giờ (Delta Cursor)',
  EVERY_6H: 'Mỗi 6 giờ (4 lần/ngày)',
  DAILY_02AM: 'Hàng ngày lúc 02:00 sáng',
  MANUAL_ONLY: 'Chỉ đồng bộ thủ công',
};

export const SYNC_DIRECTION_LABELS: Record<UpaffiliateSyncDirection, string> = {
  BIDIRECTIONAL: 'Đồng bộ 2 chiều (UpAffiliate ↔ B2C Ops Hub)',
  PULL_FROM_UPAFFILIATE: 'Chỉ kéo từ UpAffiliate về Ops Hub',
  PUSH_TO_UPAFFILIATE: 'Chỉ đẩy KOC Mới & Hồ sơ pháp lý lên UpAffiliate',
};

export const DEFAULT_UPAFFILIATE_SYNC_CONFIG: UpaffiliateSyncConfig = {
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

export function computeNextScheduledSyncAt(
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

/**
 * Sinh mã định danh chuẩn của KOC trên hệ thống UpAffiliate (`creator.id`).
 */
export function getUpaffiliateCreatorId(koc: KocItem): string {
  if (koc.upaffiliateCreatorId?.trim()) return koc.upaffiliateCreatorId.trim();
  const cleanId = (koc.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (koc.datasetType === 'NEW' || (koc.id || '').startsWith('koc-new-')) {
    return `UPA-NEW-${cleanId.replace(/^KOCNEW/, '').padStart(4, '0')}`;
  }
  return `UPA-CR-${cleanId.replace(/^KOCREAL|^KOC/, '').padStart(4, '0')}`;
}

/**
 * Sinh mã định danh chuẩn của Hồ sơ pháp lý trên UpAffiliate (`creator_legal_profile.id`).
 */
export function getUpaffiliateLegalProfileId(
  koc: KocItem,
  profile: KocLegalProfile,
  index = 0,
): string {
  if (profile.upaffiliateLegalProfileId?.trim()) {
    return profile.upaffiliateLegalProfileId.trim();
  }
  const creatorCode = getUpaffiliateCreatorId(koc);
  return `${creatorCode}-LP${String(index + 1).padStart(2, '0')}`;
}

/**
 * Xác định trạng thái đồng bộ của KOC với UpAffiliate.
 */
export function getUpaffiliateSyncStatus(
  koc: KocItem,
): 'SYNCED' | 'LOCAL_MODIFIED' | 'PENDING_PUSH' | 'CONFLICT' {
  if (koc.upaffiliateSyncStatus) return koc.upaffiliateSyncStatus;
  if (
    koc.datasetType === 'NEW' &&
    koc.sourceSheet &&
    koc.sourceSheet.toLowerCase().includes('scraper')
  ) {
    return 'PENDING_PUSH';
  }
  return 'SYNCED';
}

export function formatSyncDateTime(iso?: string): string {
  if (!iso) return 'Chưa đồng bộ';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Tổng hợp thống kê đồng bộ trực tiếp từ 2 bảng KOC hiện tại.
 */
export function computeKocUpaffiliateSyncMetrics(kocs: KocItem[]) {
  let cooperatedSynced = 0;
  let newSynced = 0;
  let legalProfilesTotal = 0;
  let multiLegalKocCount = 0;
  let pendingPushCount = 0;
  let localModifiedCount = 0;

  for (const k of kocs) {
    const profiles = getKocLegalProfiles(k);
    legalProfilesTotal += profiles.length;
    if (profiles.length > 1) multiLegalKocCount++;

    const st = getUpaffiliateSyncStatus(k);
    if (st === 'PENDING_PUSH') pendingPushCount++;
    else if (st === 'LOCAL_MODIFIED') localModifiedCount++;

    const isNew = k.datasetType === 'NEW' || (!k.datasetType && (k.totalPastDeals || 0) === 0);
    if (isNew) {
      if (st === 'SYNCED') newSynced++;
    } else {
      if (st === 'SYNCED') cooperatedSynced++;
    }
  }

  return {
    cooperatedSynced,
    newSynced,
    legalProfilesTotal,
    multiLegalKocCount,
    pendingPushCount,
    localModifiedCount,
  };
}

export async function fetchUpaffiliateSyncState(): Promise<UpaffiliateSyncStateResponse> {
  try {
    const res = await fetch('/api/integrations/upaffiliate/sync', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-store' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json;
    }
  } catch {
    // fallback
  }
  return {
    success: true,
    config: DEFAULT_UPAFFILIATE_SYNC_CONFIG,
    logs: [],
    stagingPendingCount: 0,
    customModifiedCount: 0,
  };
}

export async function saveUpaffiliateSyncConfigApi(
  config: Partial<UpaffiliateSyncConfig>,
): Promise<UpaffiliateSyncStateResponse | null> {
  try {
    const res = await fetch('/api/integrations/upaffiliate/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SAVE_CONFIG',
        config,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}

export async function runUpaffiliateSyncApi(params: {
  mode: 'INCREMENTAL' | 'FULL_PULL' | 'PUSH_PENDING' | 'SCHEDULED_TICK';
  triggerType?: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' | 'STAGING_PUSH';
  pendingKocsToPush?: KocItem[];
  cooperatedCount?: number;
  newCount?: number;
  legalProfilesCount?: number;
}): Promise<{
  success: boolean;
  config: UpaffiliateSyncConfig;
  latestLog?: UpaffiliateSyncRunLog;
  logs: UpaffiliateSyncRunLog[];
  syncedHandles?: string[];
  promotedHandles?: string[];
  message?: string;
} | null> {
  try {
    const res = await fetch('/api/integrations/upaffiliate/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RUN_SYNC',
        ...params,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Hook quản lý trạng thái kết nối và tự động kiểm tra lịch đồng bộ định kỳ với UpAffiliate.
 */
export function useUpaffiliatePeriodicSync(options: {
  kocs: KocItem[];
  onSyncCompleted?: (payload: {
    syncedHandles: string[];
    promotedHandles: string[];
    syncedAt: string;
    log?: UpaffiliateSyncRunLog;
  }) => void;
}) {
  const [config, setConfig] = useState<UpaffiliateSyncConfig>(DEFAULT_UPAFFILIATE_SYNC_CONFIG);
  const [logs, setLogs] = useState<UpaffiliateSyncRunLog[]>([]);
  const [stagingPendingCount, setStagingPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const loadedRef = useRef(false);

  const reloadState = useCallback(async () => {
    const data = await fetchUpaffiliateSyncState();
    if (data.config) setConfig(data.config);
    if (Array.isArray(data.logs)) setLogs(data.logs);
    setStagingPendingCount(data.stagingPendingCount || 0);
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void reloadState();
  }, [reloadState]);

  const triggerSync = useCallback(
    async (
      mode: 'INCREMENTAL' | 'FULL_PULL' | 'PUSH_PENDING' | 'SCHEDULED_TICK',
      triggerType: 'SCHEDULED_CRON' | 'MANUAL_TRIGGER' | 'STAGING_PUSH' = 'MANUAL_TRIGGER',
    ) => {
      if (isSyncing) return null;
      setIsSyncing(true);
      try {
        const metrics = computeKocUpaffiliateSyncMetrics(options.kocs);
        const pendingItems = options.kocs.filter(
          (k) =>
            k.upaffiliateSyncStatus === 'PENDING_PUSH' ||
            k.upaffiliateSyncStatus === 'LOCAL_MODIFIED',
        );
        const res = await runUpaffiliateSyncApi({
          mode,
          triggerType,
          pendingKocsToPush: pendingItems,
          cooperatedCount: metrics.cooperatedSynced,
          newCount: metrics.newSynced,
          legalProfilesCount: metrics.legalProfilesTotal,
        });
        if (res && res.success) {
          setConfig(res.config);
          setLogs(res.logs || []);
          if (mode === 'PUSH_PENDING' || mode === 'INCREMENTAL') {
            setStagingPendingCount(0);
          }
          options.onSyncCompleted?.({
            syncedHandles: res.syncedHandles || [],
            promotedHandles: res.promotedHandles || [],
            syncedAt: res.config.lastSyncedAt || new Date().toISOString(),
            log: res.latestLog,
          });
        }
        return res;
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, options],
  );

  // Kiểm tra định kỳ mỗi 60 giây xem đã tới mốc `nextScheduledSyncAt` chưa
  useEffect(() => {
    if (!config.enabled || config.scheduleMode === 'MANUAL_ONLY') return;
    const timer = window.setInterval(() => {
      if (!config.nextScheduledSyncAt || isSyncing) return;
      const nextTime = new Date(config.nextScheduledSyncAt).getTime();
      if (!Number.isNaN(nextTime) && Date.now() >= nextTime) {
        void triggerSync('SCHEDULED_TICK', 'SCHEDULED_CRON');
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [config.enabled, config.scheduleMode, config.nextScheduledSyncAt, isSyncing, triggerSync]);

  const updateConfig = useCallback(async (patch: Partial<UpaffiliateSyncConfig>) => {
    const nextConfig: UpaffiliateSyncConfig = {
      ...config,
      ...patch,
      scope: {
        ...config.scope,
        ...(patch.scope || {}),
      },
    };
    setConfig(nextConfig);
    const saved = await saveUpaffiliateSyncConfigApi(nextConfig);
    if (saved?.config) {
      setConfig(saved.config);
    }
    return saved?.config || nextConfig;
  }, [config]);

  return {
    config,
    logs,
    stagingPendingCount,
    isSyncing,
    reloadState,
    triggerSync,
    updateConfig,
  };
}
