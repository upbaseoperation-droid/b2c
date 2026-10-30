'use client';

import React, { useState, useMemo } from 'react';
import { klFromFee } from '../../lib/klTiers';
import type {
  KocListingItem,
  UserRole,
  UserProfile,
  SalaryGrade,
  InputPlanBreakdownState,
  StorePortfolioItem,
  KocItem,
  BookingDealItem,
} from '@/lib/types';
import { PageHeaderNav, Segmented } from '../ui';
import { StoreShortlistFilterModal } from '../shortlist/StoreShortlistFilterModal';
import { StaffBrandListingSheetWorkspace } from '../shortlist/StaffBrandListingSheetWorkspace';
import { MultiPlatformListingWorkspace } from '../shortlist/MultiPlatformListingWorkspace';
import type { StoreSheetSetupTabKey } from './StoreStaffSheetSetupView';
import { ApprovedBookingListView } from './ApprovedBookingListView';
import type { ContractDocument } from '../../lib/planDealLink';
import {
  appendKocsToStaffBrandSheet,
  normalizeTikTokId,
} from '@/lib/staffBrandListingSheet';
import { INITIAL_MONTHLY_PLANS } from '@/lib/monthlyPlanData';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS, INITIAL_DEALS } from '@/lib/mockData';
import { REAL_LARK_LISTINGS_BY_BOARD_KEY } from '@/lib/realLarkListings2026';

export interface ListingPlanContext {
  planId?: string;
  storeName?: string;
  monthKey?: string;
  salaryGrade?: SalaryGrade;
  openStaffSheet?: boolean;
  nonce?: number;
}

interface KocListingBatchHubViewProps {
  listings: KocListingItem[];
  onUpdateListings: (updated: KocListingItem[]) => void;
  onGenerateDeal?: (item: KocListingItem) => void;
  onCreateOrUpdateDeals?: (newOrUpdatedDeals: BookingDealItem[]) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, document?: 'HDNT' | 'SOW' | 'BBNT') => void;
  currentUser?: UserProfile | null;
  currentRole?: UserRole;
  currentUserName?: string;
  monthlyPlans?: InputPlanBreakdownState[];
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  activePlanContext?: ListingPlanContext | null;
  onOpenPlanStudio?: (plan: InputPlanBreakdownState) => void;
  onOpenContractForPlanDeal?: (deal: BookingDealItem, document: ContractDocument) => void;
  onNavigateTab?: (
    targetTab: string,
    context?: { subTab?: string; sheetTab?: StoreSheetSetupTabKey; storeName?: string; monthKey?: string }
  ) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

function inferSalaryGradeFromFee(fee: number, existingGrade?: SalaryGrade): SalaryGrade {
  if (existingGrade) return existingGrade;
  return klFromFee(fee);
}

export function KocListingBatchHubView({
  listings: rawListings,
  onUpdateListings,
  onCreateOrUpdateDeals,
  onOpenContractForDeal,
  currentUser,
  currentRole,
  currentUserName = 'Quản trị viên',
  monthlyPlans: rawMonthlyPlans = INITIAL_MONTHLY_PLANS,
  stores: rawStores = INITIAL_STORE_PORTFOLIOS,
  kocs: rawKocs = INITIAL_KOCS,
  deals: rawDeals = INITIAL_DEALS,
  activePlanContext,
  onNavigateTab,
  onNotify,
}: KocListingBatchHubViewProps) {
  const stores = useMemo(
    () => (Array.isArray(rawStores) ? rawStores : INITIAL_STORE_PORTFOLIOS),
    [rawStores]
  );
  const scopedStoreNameSet = useMemo(
    () =>
      new Set(
        stores
          .filter((s) => s.isB2cManaged !== false && s.storeName)
          .map((s) => s.storeName)
      ),
    [stores]
  );

  // RULE-AUTH-01: Chỉ nạp các bản ghi Listing thuộc các gian hàng trong phạm vi phân quyền
  const listings = useMemo(() => {
    const base = (Array.isArray(rawListings) ? rawListings : []).filter(
      (i) => scopedStoreNameSet.size === 0 || scopedStoreNameSet.has(i.storeName)
    );
    const seenIds = new Set<string>(base.map((i) => i.id));
    const merged: KocListingItem[] = [...base];
    for (const items of Object.values(REAL_LARK_LISTINGS_BY_BOARD_KEY)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (
          item &&
          item.id &&
          !seenIds.has(item.id) &&
          (scopedStoreNameSet.size === 0 || scopedStoreNameSet.has(item.storeName))
        ) {
          seenIds.add(item.id);
          merged.push(item);
        }
      }
    }
    return merged;
  }, [rawListings, scopedStoreNameSet]);

  const monthlyPlans = useMemo(
    () => (Array.isArray(rawMonthlyPlans) ? rawMonthlyPlans : INITIAL_MONTHLY_PLANS),
    [rawMonthlyPlans]
  );
  const kocs = useMemo(() => (Array.isArray(rawKocs) ? rawKocs : INITIAL_KOCS), [rawKocs]);
  const deals = useMemo(() => (Array.isArray(rawDeals) ? rawDeals : INITIAL_DEALS), [rawDeals]);

  const canViewFullPii =
    !currentRole ||
    currentRole === 'ADMIN' ||
    currentRole === 'MANAGER' ||
    currentRole === 'FINANCE';

    const [activeSubTab, setActiveSubTab] = useState<
    'STAFF_BRAND_SHEET' | 'APPROVED_DEAL_BOARD' | 'MULTI_PLATFORM_WORKSPACE'
  >('STAFF_BRAND_SHEET');

  const defaultInitialStore = useMemo(() => {
    const firstWithListings = stores.find(
      (s) =>
        s.isB2cManaged !== false &&
        s.storeName &&
        listings.some((l) => l.monthKey === '2026/10' && l.storeName === s.storeName)
    )?.storeName;
    return (
      firstWithListings ||
      stores.find((s) => s.isB2cManaged !== false && s.storeName)?.storeName ||
      'BaBe_TikTok_E2E-O'
    );
  }, [stores, listings]);

  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [selectedStore, setSelectedStore] = useState<string>(() => {
    const firstWithListings = stores.find(
      (s) =>
        s.isB2cManaged !== false &&
        s.storeName &&
        Object.values(REAL_LARK_LISTINGS_BY_BOARD_KEY).some(
          (arr) => arr[0]?.monthKey === '2026/10' && arr[0]?.storeName === s.storeName
        )
    )?.storeName;
    const validFirst = stores.find((s) => s.isB2cManaged !== false && s.storeName)?.storeName;
    return firstWithListings || validFirst || 'BaBe_TikTok_E2E-O';
  });

  const [shortlistTargetGrade, setShortlistTargetGrade] = useState<SalaryGrade | undefined>(undefined);
  const [showShortlistModal, setShowShortlistModal] = useState<boolean>(false);

  const [prevPlanContext, setPrevPlanContext] = useState(activePlanContext);
  if (activePlanContext !== prevPlanContext) {
    setPrevPlanContext(activePlanContext);
    if (activePlanContext) {
      if (activePlanContext.monthKey) setSelectedMonth(activePlanContext.monthKey);
      if (activePlanContext.storeName) setSelectedStore(activePlanContext.storeName);
      if (activePlanContext.salaryGrade) {
        setShortlistTargetGrade(activePlanContext.salaryGrade);
      } else {
        setShortlistTargetGrade(undefined);
      }
      setActiveSubTab('STAFF_BRAND_SHEET');
    }
  }

  const matchedPlanFinal = useMemo(() => {
    const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
    if (selectedStore === 'ALL') return null;
    const sLower = selectedStore.trim().toLowerCase();
    return (
      monthlyPlans.find(
        (p) =>
          p.month === targetMonth &&
          ((p.storeName && p.storeName.trim().toLowerCase() === sLower) ||
            (p.brandName && sLower.includes(p.brandName.trim().toLowerCase())) ||
            (p.brandName && p.brandName.trim().toLowerCase().includes(sLower.split('_')[0])))
      ) || null
    );
  }, [monthlyPlans, selectedMonth, selectedStore]);

  const matchedStoreObj = useMemo(() => {
    if (selectedStore === 'ALL') return stores[0];
    const sLower = selectedStore.trim().toLowerCase();
    return (
      stores.find(
        (s) =>
          s.storeName.trim().toLowerCase() === sLower ||
          (matchedPlanFinal?.storeId && s.id === matchedPlanFinal.storeId) ||
          sLower.includes(s.brandName.trim().toLowerCase())
      ) || stores[0]
    );
  }, [stores, selectedStore, matchedPlanFinal]);

  const handleAddShortlistToListings = (
    newListings: Partial<KocListingItem>[],
    targetStore?: StorePortfolioItem
  ) => {
    const nowIso = new Date().toISOString();
    const targetStoreName =
      targetStore?.storeName ||
      newListings[0]?.storeName ||
      (selectedStore === 'ALL' ? defaultInitialStore : selectedStore);
    const targetMonthKey =
      newListings[0]?.monthKey || (selectedMonth === 'ALL' ? '2026/10' : selectedMonth);

    const matchedKocsToAppend = newListings.map((item) => {
      const cleanHandle = (item.kocHandle || '').replace(/^@/, '').toLowerCase();
      const foundKoc = kocs.find(
        (k) =>
          k.id === item.kocId ||
          (k.channelId || '').replace(/^@/, '').toLowerCase() === cleanHandle
      );
      if (foundKoc) return foundKoc;
      return {
        id: item.kocId,
        stageName: item.kocName || cleanHandle,
        channelId: cleanHandle,
        rateCardVideo: item.proposedFee || 0,
        followers: item.followersCount || 0,
        tepKenh: (item.niche as KocItem['tepKenh']) || 'Beauty',
      };
    });

    appendKocsToStaffBrandSheet({
      kocsToAdd: matchedKocsToAppend,
      monthKey: targetMonthKey,
      storeName: targetStoreName,
      staffName: currentUserName,
      allKocs: kocs,
      allStores: stores,
      allDeals: deals,
      dot: 'Đợt 1',
      sanPham: newListings[0]?.pillarName || '',
      contentTag: newListings[0]?.videoFormat || 'Review trực tiếp',
      deXuatUpBase: 'Recommend',
    });

    const fullListings: KocListingItem[] = newListings.map((item, idx) => {
      const feeToUse = item.proposedFee ?? 0;
      const grade = inferSalaryGradeFromFee(feeToUse, item.salaryGrade);
      const handleVal = item.kocHandle || '@koc';
      return {
        id: item.id || `LIST-SL-${Date.now()}-${idx}`,
        batchId: item.batchId || 'BATCH-202610-B10',
        batchCycle: item.batchCycle || 'BATCH_10',
        monthKey: targetMonthKey,
        storeId: item.storeId || matchedPlanFinal?.storeId || 'STORE-01',
        storeName: targetStoreName,
        brandName: item.brandName || matchedPlanFinal?.brandName || 'Kutieskin',
        sourcePlanId: item.sourcePlanId || matchedPlanFinal?.id,
        sourcePlanVersion: item.sourcePlanVersion || matchedPlanFinal?.currentVersionCode || 'v1.0',
        planRowId: item.planRowId,
        salaryGrade: grade,
        kocId: item.kocId || `KOC-SL-${idx}`,
        kocName: item.kocName || 'KOC Đề Xuất',
        kocHandle: handleVal,
        channel: item.channel || 'TikTok Shop',
        followersCount: item.followersCount ?? 0,
        tier: item.tier || 'MICRO',
        niche: item.niche || 'Chăm sóc cá nhân',
        videoFormat: item.videoFormat || 'Review trải nghiệm',
        pillarName: item.pillarName || 'Chiến dịch tháng',
        proposedFee: feeToUse,
        finalFee: item.finalFee,
        brandApprovalStatus: item.brandApprovalStatus || 'BRAND_PENDING',
        brandFeedbackNote: item.brandFeedbackNote,
        kocNegotiationStatus: item.kocNegotiationStatus || 'NOT_CONTACTED',
        negotiationNote: item.negotiationNote,
        overallStatus: item.overallStatus || 'DRAFT',
        discussions: [
          {
            id: `disc-sl-${Date.now()}-${idx}`,
            authorName: currentUserName,
            authorRole: 'BOOKING',
            content: `Đưa KOC từ danh sách lọc vào Bản nháp (Draft) — Khung lương ${grade} (Plan ${matchedPlanFinal?.currentVersionCode || 'v1.0'}).`,
            createdAt: nowIso,
          },
        ],
        expectedAirDate: item.expectedAirDate || undefined,
        assignedStaffId: item.assignedStaffId || 'STAFF-101',
        assignedStaffName: item.assignedStaffName || currentUserName,
        createdAt: item.createdAt || nowIso,
        updatedAt: item.updatedAt || nowIso,
      };
    });

    const updatedExistingIds = new Set<string>();
    const mergedListings = listings.map((existing) => {
      const exHandle = normalizeTikTokId(existing.kocHandle || '').toLowerCase();
      const matchedIncoming = fullListings.find((inc) => {
        const incHandle = normalizeTikTokId(inc.kocHandle || '').toLowerCase();
        return (
          inc.storeName.trim().toLowerCase() === existing.storeName.trim().toLowerCase() &&
          (inc.monthKey || '2026/10') === (existing.monthKey || '2026/10') &&
          incHandle &&
          incHandle === exHandle
        );
      });
      if (!matchedIncoming) return existing;
      updatedExistingIds.add(matchedIncoming.id);
      return {
        ...existing,
        ...matchedIncoming,
        id: existing.id,
        discussions: existing.discussions || matchedIncoming.discussions,
        expectedAirDate: matchedIncoming.expectedAirDate || existing.expectedAirDate,
        updatedAt: nowIso,
      };
    });
    const brandNewItems = fullListings.filter((inc) => !updatedExistingIds.has(inc.id));
    onUpdateListings([...brandNewItems, ...mergedListings]);
    setSelectedMonth(targetMonthKey);
    setSelectedStore(targetStoreName);
    setShowShortlistModal(false);
    onNotify?.(
      `Đã đưa ${fullListings.length} KOC vào Sheet "${targetStoreName}" (Plan ${targetMonthKey}) và danh sách đề xuất.`,
      'success'
    );
  };

  return (
    <div className="space-y-2">
      <PageHeaderNav>
        <Segmented
          value={activeSubTab}
          onChange={(val) =>
            setActiveSubTab(
              val as 'STAFF_BRAND_SHEET' | 'APPROVED_DEAL_BOARD' | 'MULTI_PLATFORM_WORKSPACE'
            )
          }
          items={[
            { key: 'STAFF_BRAND_SHEET', label: 'Listing TikTok' },
            { key: 'APPROVED_DEAL_BOARD', label: 'Deal & Nghiệm thu TikTok' },
            { key: 'MULTI_PLATFORM_WORKSPACE', label: 'Listing & Nghiệm thu Đa sàn' },
          ]}
        />
      </PageHeaderNav>

      {activeSubTab === 'STAFF_BRAND_SHEET' && (
        <StaffBrandListingSheetWorkspace
          kocs={kocs}
          stores={stores}
          deals={deals}
          currentUser={currentUser}
          currentUserName={currentUserName}
          currentRole={currentRole}
          selectedMonth={selectedMonth === 'ALL' ? '2026/10' : selectedMonth}
          onChangeMonth={setSelectedMonth}
          selectedStore={selectedStore === 'ALL' ? defaultInitialStore : selectedStore}
          onChangeStore={setSelectedStore}
          onCreateOrUpdateDeals={onCreateOrUpdateDeals}
          onOpenDealBoard={(ctx) => {
            if (ctx.storeName) setSelectedStore(ctx.storeName);
            if (ctx.monthKey) setSelectedMonth(ctx.monthKey);
            setActiveSubTab('APPROVED_DEAL_BOARD');
          }}
          onOpenShortlistFilterModal={() => setShowShortlistModal(true)}
          onOpenSheetSetupScreen={(tab?: StoreSheetSetupTabKey) => {
            if (onNavigateTab) {
              onNavigateTab('api-settings', { subTab: 'google-sheets', sheetTab: tab || 'TABLE' });
            } else {
              onNotify?.('Vui lòng mở menu "Tích hợp & Kết nối API" để cấu hình Google Sheet.', 'info');
            }
          }}
          onNotify={onNotify}
        />
      )}

      {activeSubTab === 'MULTI_PLATFORM_WORKSPACE' && (
        <MultiPlatformListingWorkspace
          kocs={kocs}
          stores={stores}
          monthlyPlans={monthlyPlans}
          currentUserName={currentUserName}
          selectedMonth={selectedMonth === 'ALL' ? '2026/11' : selectedMonth}
          onChangeMonth={setSelectedMonth}
          selectedStore={selectedStore}
          onChangeStore={setSelectedStore}
          onNotify={onNotify}
        />
      )}

      {activeSubTab === 'APPROVED_DEAL_BOARD' && (
        <ApprovedBookingListView
          kocs={kocs}
          stores={stores}
          deals={deals}
          currentUserName={currentUserName}
          canViewFullPii={canViewFullPii}
          initialStoreName={selectedStore === 'ALL' ? defaultInitialStore : selectedStore}
          initialMonthKey={selectedMonth === 'ALL' ? '2026/10' : selectedMonth}
          onCreateOrUpdateDeals={onCreateOrUpdateDeals}
          onOpenContractForDeal={onOpenContractForDeal}
          onNavigateTab={(targetTab, ctx) => {
            if (ctx?.storeName) setSelectedStore(ctx.storeName);
            if (ctx?.monthKey) setSelectedMonth(ctx.monthKey);
            if (targetTab === 'koc-listing') {
              setActiveSubTab('STAFF_BRAND_SHEET');
            }
          }}
          onNotify={onNotify}
        />
      )}

      <StoreShortlistFilterModal
        isOpen={showShortlistModal}
        onClose={() => setShowShortlistModal(false)}
        stores={stores}
        kocs={kocs}
        deals={deals}
        existingListings={listings}
        initialStoreId={matchedStoreObj?.id}
        initialSalaryGrade={shortlistTargetGrade}
        activePlan={matchedPlanFinal}
        currentUserName={currentUserName}
        onAddToListingBatch={handleAddShortlistToListings}
      />
    </div>
  );
}
