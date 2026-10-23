'use client';

import { useCallback, useMemo } from 'react';
import type { KocListingItem } from './types';
import { usePlanRecord, type PlanRecordSyncStatus } from './usePlanRecord';

export type ListingBoardSyncStatus = PlanRecordSyncStatus;

const EMPTY: { items: KocListingItem[] } = { items: [] };

/** Tải và tự lưu danh sách KOC đã list của một kế hoạch. Khi người khác lưu trước, thay đổi được gộp theo từng thẻ KOC. */
export function useListingBoard(planId: string | null, onNotify?: (msg: string) => void) {
  const { data, status, update, saveNow, reload } = usePlanRecord<{ items: KocListingItem[] }>('/api/listing-board', planId, EMPTY, onNotify);
  const items = useMemo(() => data.items || [], [data]);
  const updateItems = useCallback((next: KocListingItem[]) => update({ items: next }), [update]);
  return { items, status, update: updateItems, saveNow, reload };
}