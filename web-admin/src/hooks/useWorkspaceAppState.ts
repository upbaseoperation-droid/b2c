'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TabKey } from '../components/Sidebar';
import type { ContractIntent } from '../components/views/ContractManagementView';
import type { ContractDocument } from '../lib/planDealLink';
import type { ListingPlanContext } from '../components/views/KocListingBatchHubView';
import type { StoreSheetSetupTabKey } from '../components/views/StoreStaffSheetSetupView';
import type { ToastType } from '../components/ui';
import { hydrateAllSharedStatesFromDb, pushSharedStateToDb } from '../lib/sharedStateClient';
import {
  autoMapVideoAcceptanceByKocChannel,
  extractTikTokChannelAndVideoFromInput,
} from '../lib/approvedBookingList';
import {
  filterScopedStores,
  filterScopedBrands,
  filterScopedPlans,
  filterScopedDeals,
  getUserScopeSummary,
} from '../lib/rbacScope';
import {
  INITIAL_DEALS,
  INITIAL_TASKS,
  INITIAL_KOCS,
  INITIAL_DETAILED_STAFF_PLANS,
  INITIAL_STAFF_ALLOCATIONS_26,
  INITIAL_BRANDS,
  INITIAL_STORE_PORTFOLIOS,
  INITIAL_KOC_LISTINGS,
  INITIAL_CAMPAIGNS,
} from '../lib/mockData';
import { useCtvDirectory } from '../lib/useCtvDirectory';
import { INITIAL_MONTHLY_PLANS, enrichPlanWithVersions } from '../lib/monthlyPlanData';
import { fetchClientMonthlyPlans, getCachedClientMonthlyPlans } from '../lib/useMonthlyPlanSync';
import {
  UserProfile,
  BookingDealItem,
  DealStatus,
  SlaTask,
  KocItem,
  Contributor,
  CampaignItem,
  StaffDetailedPlanItem,
  MonthlyStaffAllocation,
  StaffPlanStatus,
  ContentPillarType,
  BrandDetail,
  StorePortfolioItem,
  KocListingItem,
  GrowthDemandItem,
  GrowthDemandBreakdownTier,
  SalaryGrade,
  KocCategory,
  InputPlanBreakdownState,
} from '../lib/types';

/** Ô phân công lưu ở Dữ liệu gốc trên máy chủ; bản sửa tạm trên trình duyệt không được đè lên các ô này. */
const STORE_ASSIGNMENT_FIELDS = [
  'b2cOwnerName', 'primaryPic', 'assignedStaff', 'assignedPic', 'b2cOwners', 'assignedMembers',
  'bookingLeader', 'hasBookingLeader', 'backupOwnerName', 'backupOwnerId', 'isBackupActive', 'backupReason', 'backupFrom', 'backupTo',
  'previousPic', 'handoverEffectiveDate', 'assignmentNotes', 'staffCodes', 'contentPic', 'accountOwnerName',
] as const;

function withoutAssignment(o: Partial<StorePortfolioItem> | undefined): Partial<StorePortfolioItem> {
  if (!o) return {};
  const copy: Record<string, unknown> = { ...o };
  for (const f of STORE_ASSIGNMENT_FIELDS) delete copy[f];
  return copy as Partial<StorePortfolioItem>;
}

export interface UseWorkspaceAppStateOptions {
  currentUser: UserProfile | null;
  isLoadingAuth: boolean;
  setActiveTab: Dispatch<SetStateAction<TabKey>>;
  setSelectedBrandContext: Dispatch<SetStateAction<string>>;
  showToast: (message: string, type?: ToastType) => void;
}

export function useWorkspaceAppState({
  currentUser,
  isLoadingAuth,
  setActiveTab,
  setSelectedBrandContext,
  showToast,
}: UseWorkspaceAppStateOptions) {
  const isDeprecatedDemoKoc = useCallback((item?: Partial<KocItem> | null) => {
    if (!item) return true;
    const id = (item.id || '').trim();
    const h = (item.channelId || '').trim().toLowerCase().replace(/^@+/, '');
    if (/^koc-(?:[1-9]|1\d|20)$/.test(id)) return true;
    if (h === 'megauriviu' || h === 'chanhbeauty99' || h === 'linhskincare' || h === 'an_nhien_beauty') return true;
    return false;
  }, []);

  const [kocs, setKocs] = useState<KocItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_KOCS;
    try {
      const raw = localStorage.getItem('upbase_saved_kocs_v1');
      if (!raw) return INITIAL_KOCS;
      const savedMap = JSON.parse(raw) as Record<string, KocItem>;
      const customItems = Object.values(savedMap || {}).filter((item) => {
        const id = (item?.id || '').trim();
        const h = (item?.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        if (/^koc-(?:[1-9]|1\d|20)$/.test(id)) return false;
        if (h === 'megauriviu' || h === 'chanhbeauty99' || h === 'linhskincare' || h === 'an_nhien_beauty') return false;
        return true;
      });
      if (customItems.length === 0) return INITIAL_KOCS;
      const byId = new Map<string, KocItem>();
      const byHandle = new Map<string, KocItem>();
      for (const item of customItems) {
        if (item.id) byId.set(item.id, item);
        const h = (item.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        if (h) byHandle.set(h, item);
      }
      const matchedKeys = new Set<string>();
      const mergedBase = INITIAL_KOCS.map((base) => {
        const h = (base.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        const override = byId.get(base.id) || (h ? byHandle.get(h) : undefined);
        if (override) {
          matchedKeys.add(override.id);
          if (h) matchedKeys.add(h);
          return { ...base, ...override };
        }
        return base;
      });
      const brandNew = customItems.filter((item) => {
        const h = (item.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        return !matchedKeys.has(item.id) && (!h || !matchedKeys.has(h));
      });
      return [...brandNew, ...mergedBase];
    } catch {
      return INITIAL_KOCS;
    }
  });

  const syncCustomKocsIntoState = useCallback((rawCustomItems: KocItem[]) => {
    const customItems = Array.isArray(rawCustomItems)
      ? rawCustomItems.filter((item) => !isDeprecatedDemoKoc(item))
      : [];
    if (customItems.length === 0) return;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('upbase_saved_kocs_v1');
        const map: Record<string, KocItem> = raw ? JSON.parse(raw) : {};
        for (const [k, v] of Object.entries(map)) {
          if (isDeprecatedDemoKoc(v)) delete map[k];
        }
        for (const item of customItems) {
          const key = (item.channelId || item.id || '').trim().toLowerCase().replace(/^@+/, '') || item.id;
          if (!key) continue;
          if (item.id) {
            for (const [k, v] of Object.entries(map)) {
              if (v?.id === item.id && k !== key) {
                delete map[k];
              }
            }
          }
          map[key] = item;
        }
        localStorage.setItem('upbase_saved_kocs_v1', JSON.stringify(map));
      }
    } catch {
      // ignore storage quota
    }
    setKocs((prev) => {
      const byId = new Map<string, KocItem>();
      const byHandle = new Map<string, KocItem>();
      for (const item of customItems) {
        if (item.id) byId.set(item.id, item);
        const h = (item.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        if (h) byHandle.set(h, item);
      }
      const matchedHandles = new Set<string>();
      const matchedIds = new Set<string>();
      const next = prev.map((existing) => {
        const h = (existing.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        const hit = byId.get(existing.id) || (h ? byHandle.get(h) : undefined);
        if (hit) {
          matchedIds.add(hit.id);
          const hitH = (hit.channelId || '').trim().toLowerCase().replace(/^@+/, '');
          if (hitH) matchedHandles.add(hitH);
          if (h) matchedHandles.add(h);
          return { ...existing, ...hit };
        }
        return existing;
      });
      const createdNew = customItems.filter((item) => {
        const h = (item.channelId || '').trim().toLowerCase().replace(/^@+/, '');
        return !matchedIds.has(item.id) && (!h || !matchedHandles.has(h));
      });
      return createdNew.length > 0 ? [...createdNew, ...next] : next;
    });
  }, [isDeprecatedDemoKoc]);

  const persistKocsToDatabase = useCallback(
    async (payload: { created?: KocItem[]; updated?: KocItem[] }) => {
      const created = payload.created || [];
      const updated = payload.updated || [];
      const combined = [...created, ...updated];
      if (combined.length === 0) return;

      syncCustomKocsIntoState(combined);

      try {
        const res = await fetch('/api/kocs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ created, updated }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && Array.isArray(json.items)) {
          syncCustomKocsIntoState(json.items as KocItem[]);
        }
      } catch {
        // Đã lưu dự phòng vào localStorage nếu mất kết nối tạm thời
      }
    },
    [syncCustomKocsIntoState]
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/kocs', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.items) && json.items.length > 0) {
          syncCustomKocsIntoState(json.items as KocItem[]);
        }
      })
      .catch(() => undefined);

    const handleMasterContactSynced = (evt: Event) => {
      try {
        const customEvt = evt as CustomEvent<{
          handleKey?: string;
          email?: string;
          phone?: string;
          shippingRecipientName?: string;
          shippingPhone?: string;
          shippingAddress?: string;
          bankName?: string;
          bankAccount?: string;
          cccd?: string;
        }>;
        const raw = localStorage.getItem('upbase_saved_kocs_v1');
        if (raw) {
          const savedMap = JSON.parse(raw) as Record<string, KocItem>;
          const handleKey = customEvt.detail?.handleKey;
          if (handleKey && savedMap[handleKey]) {
            void persistKocsToDatabase({ updated: [savedMap[handleKey]] });
            return;
          }
          const items = Object.values(savedMap || {});
          if (items.length > 0) {
            syncCustomKocsIntoState(items);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('upbase:koc-master-contact-synced', handleMasterContactSynced);
    return () => {
      cancelled = true;
      window.removeEventListener('upbase:koc-master-contact-synced', handleMasterContactSynced);
    };
  }, [syncCustomKocsIntoState, persistKocsToDatabase]);
  const ctvDirectory = useCtvDirectory(Boolean(currentUser), showToast);
  const contributors = ctvDirectory.contributors;
  const [deals, setDeals] = useState<BookingDealItem[]>(INITIAL_DEALS);
  const [tasks, setTasks] = useState<SlaTask[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TASKS;
    try {
      const raw = localStorage.getItem('upbase_b2c_sla_tasks_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_TASKS;
  });
  const [brands, setBrands] = useState<BrandDetail[]>(INITIAL_BRANDS);
  const [storePortfolios, setStorePortfolios] = useState<StorePortfolioItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_STORE_PORTFOLIOS;
    try {
      const raw = localStorage.getItem('upbase_store_overrides_v1');
      if (!raw) return INITIAL_STORE_PORTFOLIOS;
      const overrides = JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>;
      return INITIAL_STORE_PORTFOLIOS.map(st => overrides[st.id] ? { ...st, ...withoutAssignment(overrides[st.id]) } : st);
    } catch {
      return INITIAL_STORE_PORTFOLIOS;
    }
  });

  // Đồng bộ hai chiều toàn bộ Shared State từ DB (PostgreSQL AppSharedRecord)
  useEffect(() => {
    void hydrateAllSharedStatesFromDb();
  }, []);

  // Lắng nghe sự kiện đồng bộ từ DB cho SLA Tasks và Store Overrides
  useEffect(() => {
    const handleSlaTasksUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<SlaTask[]>;
      if (customEvt.detail && Array.isArray(customEvt.detail)) {
        setTasks(customEvt.detail);
      }
    };

    const handleStoreOverridesUpdated = (evt: Event) => {
      const customEvt = evt as CustomEvent<Record<string, Partial<StorePortfolioItem>>>;
      const overrides = customEvt.detail;
      if (overrides && typeof overrides === 'object') {
        setStorePortfolios(prev =>
          prev.map(st => (overrides[st.id] ? { ...st, ...withoutAssignment(overrides[st.id]) } : st))
        );
      }
    };

    window.addEventListener('upbase:sla-tasks-updated', handleSlaTasksUpdated);
    window.addEventListener('upbase:store-overrides-updated', handleStoreOverridesUpdated);
    return () => {
      window.removeEventListener('upbase:sla-tasks-updated', handleSlaTasksUpdated);
      window.removeEventListener('upbase:store-overrides-updated', handleStoreOverridesUpdated);
    };
  }, []);
  const currentUserId = currentUser?.id;
  const currentUserRole = currentUser?.role;
  useEffect(() => {
    let cancelled = false;
    const reload = () => fetch('/api/master-data', { cache: 'no-store' }).then(async res => {
      const body = await res.json(); if (!res.ok) throw new Error(body.error);
      if (!cancelled) {
        let storeOverrides: Record<string, Partial<StorePortfolioItem>> = {};
        try {
          const raw = localStorage.getItem('upbase_store_overrides_v1');
          if (raw) storeOverrides = JSON.parse(raw);
        } catch {
          // ignore
        }
        setBrands(prev => {
          const incoming = (body.data.brands || []) as BrandDetail[];
          if (incoming.length === 0) return prev;
          const byId = new Map(incoming.map(b => [b.id, b]));
          return prev.map(b => byId.get(b.id) ? { ...b, ...byId.get(b.id)! } : b);
        });
        setStorePortfolios(prev => {
          const incoming = (body.data.stores || []) as StorePortfolioItem[];
          const byId = new Map(incoming.map(s => [s.id, s]));
          return prev.map(s => {
            const fromApi = byId.get(s.id);
            const merged = fromApi ? { ...s, ...fromApi } : s;
            const localOverride = storeOverrides[s.id];
            return localOverride ? { ...merged, ...withoutAssignment(localOverride) } : merged;
          });
        });
      }
    }).catch(e => { if (!cancelled) showToast(e.message, 'error'); });
    if (currentUserId && !isLoadingAuth) void reload();
    window.addEventListener('upbase-master-data-updated', reload);
    return () => { cancelled = true; window.removeEventListener('upbase-master-data-updated', reload); };
  }, [currentUserId, currentUserRole, isLoadingAuth, showToast]);

  // Đồng bộ toàn bộ Deal/Job thực tế từ SQLite (/api/deal-board?all=1) vào danh sách deals để Hồ sơ KOC, Dashboard B2C và Quản lý Hợp đồng dùng chung 1 nguồn dữ liệu duy nhất
  useEffect(() => {
    let cancelled = false;
    const syncLiveDeals = () => {
      fetch('/api/deal-board?all=1', { cache: 'no-store' })
        .then(res => res.json().catch(() => null))
        .then(body => {
          if (cancelled || !body || !Array.isArray(body.bookingDeals)) return;
          const liveDeals = body.bookingDeals as BookingDealItem[];
          setDeals(prev => {
            // Bỏ bản cũ của deal sinh từ plan (id `PJ-…`/`PD-…`) trước khi nạp bản mới, tránh nhân đôi mỗi lần đồng bộ.
            const liveIds = new Set(liveDeals.map(d => d.id));
            const nonPlanDeals = prev.filter(d => !d.id.startsWith('PJ-') && !d.id.startsWith('PD-') && !liveIds.has(d.id));
            if (liveDeals.length === 0) return nonPlanDeals;
            return [...liveDeals, ...nonPlanDeals];
          });
        })
        .catch(() => undefined);
    };
    if (currentUserId && !isLoadingAuth) {
      syncLiveDeals();
    }
    window.addEventListener('upbase-deal-board-updated', syncLiveDeals);
    return () => {
      cancelled = true;
      window.removeEventListener('upbase-deal-board-updated', syncLiveDeals);
    };
  }, [currentUserId, isLoadingAuth]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);

  // Shared Plan State between Manager & Employees
  const [detailedPlans, setDetailedPlans] = useState<StaffDetailedPlanItem[]>(INITIAL_DETAILED_STAFF_PLANS);
  const [staffAllocations, setStaffAllocations] = useState<Record<string, MonthlyStaffAllocation[]>>({
    '2026/08': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/09': INITIAL_STAFF_ALLOCATIONS_26,
    '2026/10': INITIAL_STAFF_ALLOCATIONS_26
  });

  // Monthly KOC Listings (Batch 10, 20, 30 with parallel Brand/KOC approval and Air Video tracking)
  const [kocListings, setKocListings] = useState<KocListingItem[]>(INITIAL_KOC_LISTINGS);
  const [sharedMonthlyPlans, setSharedMonthlyPlans] = useState<InputPlanBreakdownState[]>(() => {
    const cached = getCachedClientMonthlyPlans();
    if (cached && cached.length > 0) {
      return cached.map((p, idx) =>
        p.versionSnapshots && p.versionSnapshots.length > 1 ? p : enrichPlanWithVersions(p, idx)
      );
    }
    return INITIAL_MONTHLY_PLANS;
  });

  // Tự động đồng bộ kế hoạch tháng từ cơ sở dữ liệu Supabase (/api/monthly-plans) qua bộ đệm dùng chung
  useEffect(() => {
    let cancelled = false;
    fetchClientMonthlyPlans()
      .then((storedList) => {
        if (cancelled || !Array.isArray(storedList) || storedList.length === 0) return;
        const enriched = storedList.map((s, idx) => {
          const raw = s.plan ? s.plan : (s as unknown as InputPlanBreakdownState);
          return raw.versionSnapshots && raw.versionSnapshots.length > 1
            ? raw
            : enrichPlanWithVersions(raw, idx);
        });
        setSharedMonthlyPlans(enriched);
      })
      .catch(() => {
        // Dự phòng về dữ liệu sẵn có nếu ngoại tuyến
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Phân quyền dữ liệu theo phạm vi quản lý của nhân sự Growth và B2C (chỉ cho xem các gian hàng, brand thuộc quản lý)
  const scopedStores = useMemo(() => filterScopedStores(storePortfolios, currentUser), [storePortfolios, currentUser]);
  const scopedBrands = useMemo(() => filterScopedBrands(brands, currentUser, storePortfolios), [brands, currentUser, storePortfolios]);
  const scopedDeals = useMemo(() => filterScopedDeals(deals, currentUser, storePortfolios), [deals, currentUser, storePortfolios]);
  const scopedMonthlyPlans = useMemo(() => filterScopedPlans(sharedMonthlyPlans, currentUser, storePortfolios), [sharedMonthlyPlans, currentUser, storePortfolios]);
  const userScopeSummary = useMemo(() => getUserScopeSummary(currentUser, brands, storePortfolios), [currentUser, brands, storePortfolios]);
  const pendingTasksCount = useMemo(() => tasks.filter(t => t.urgency !== 'done').length, [tasks]);

  const [listingPlanContext, setListingPlanContext] = useState<ListingPlanContext | null>(null);
  const [planDrilldownIntent, setPlanDrilldownIntent] = useState<{
    planId?: string;
    storeId?: string;
    storeName?: string;
    brandName?: string;
    month?: string;
    nonce: number;
  } | null>(null);
  const [bookingDrilldownIntent, setBookingDrilldownIntent] = useState<{
    storeName?: string;
    brandName?: string;
    dealCode?: string;
    month?: string;
    nonce: number;
  } | null>(null);

  const handleDrilldownToPlan = useCallback(
    (params: { planId?: string; storeId?: string; storeName?: string; brandName?: string; month: string }) => {
      setPlanDrilldownIntent({
        ...params,
        nonce: Date.now(),
      });
      setActiveTab('input-plan');
      showToast(
        `Đang mở Kế hoạch tháng ${params.month} của "${params.storeName || params.brandName || 'gian hàng'}"`,
        'info',
      );
    },
    [showToast],
  );

  const handleDrilldownToListing = useCallback(
    (params: { storeName?: string; brandName?: string; month: string }) => {
      const targetName = params.storeName || params.brandName || '';
      const matchedPlan = sharedMonthlyPlans.find(
        p =>
          p.brandName.trim().toLowerCase() === targetName.trim().toLowerCase() ||
          (p.parentBrand && p.parentBrand.trim().toLowerCase() === targetName.trim().toLowerCase()),
      );
      setListingPlanContext({
        planId: matchedPlan?.id || `plan-${targetName}`,
        storeName: targetName,
        monthKey: params.month,
        nonce: Date.now(),
      });
      setActiveTab('koc-listing');
      showToast(`Đang mở Đề xuất KOC kỳ ${params.month} cho "${targetName}"`, 'info');
    },
    [sharedMonthlyPlans, showToast],
  );

  const handleDrilldownToBooking = useCallback(
    (params: { storeName?: string; brandName?: string; dealCode?: string; month: string }) => {
      if (params.brandName && params.brandName !== 'ALL') {
        setSelectedBrandContext(params.brandName);
      }
      setBookingDrilldownIntent({
        ...params,
        nonce: Date.now(),
      });
      setActiveTab('koc-listing');
      showToast(
        `Đang mở Quản lý Booking kỳ ${params.month} ${params.dealCode ? `(Mã deal ${params.dealCode})` : `cho "${params.storeName || params.brandName || ''}"`}`,
        'info',
      );
    },
    [showToast],
  );

  const handleGenerateDealFromListing = (listingItem: KocListingItem) => {
    const existing = deals.find(d => d.dealCode === listingItem.generatedDealId);
    if (!existing) {
      const fee = listingItem.finalFee || listingItem.proposedFee;
      const newDeal: BookingDealItem = {
        id: `DEAL-${Date.now().toString().slice(-4)}`,
        dealCode: listingItem.generatedDealId || `DEAL-AUTO-${Date.now().toString().slice(-4)}`,
        campaignCode: 'CAMP-202610',
        campaignTitle: 'Chiến Dịch Tháng 10/2026',
        brandName: listingItem.brandName,
        storeId: listingItem.storeId,
        storeName: listingItem.storeName,
        productName: listingItem.pillarName,
        bookingBatch: listingItem.batchCycle === 'BATCH_10' ? 'Đợt 1' : listingItem.batchCycle === 'BATCH_20' ? 'Đợt 2' : 'Đợt 3',
        kocId: listingItem.kocId,
        kocStageName: listingItem.kocName,
        kocTier: listingItem.tier === 'NANO' ? 'TIER_4_AFFILIATE' : listingItem.tier === 'MICRO' ? 'TIER_3_MICRO' : listingItem.tier === 'MACRO' ? 'TIER_2_MACRO' : 'TIER_1_CELEB',
        salaryGrade: listingItem.salaryGrade || 'KL3',
        segment: 'Mid Creator',
        tepKenh: 'Mẹ bé (bé)',
        kocCategory: 'Mom and baby',
        contentPillar: 'Review trực tiếp',
        brandApprovalStatus: 'ĐÃ_DUYỆT',
        pipelineText: 'Chờ lên sóng bài review',
        status: 'TERMS_AGREED',
        statusLabel: 'Đã chốt điều khoản',
        currentStage: '4_AIR_GROWTH',
        holdingTeam: 'BOOKING',
        adsCodeStatus: listingItem.sparkAdsCode ? 'ĐÃ_NGHIỆM_THU' : 'CHƯA_CẤP',
        sparkAdsCode: listingItem.sparkAdsCode,
        assignedStaff: listingItem.assignedStaffName,
        totalValue: fee,
        advanceAmount: Math.round(fee * 0.5),
        finalAmount: Math.round(fee * 0.5),
        deadlinePost: listingItem.expectedAirDate || '',
        viewsCount: 0,
        affiliateGmv: 0,
        gmv30: 0,
        roi: 0,
        publishedDays: 0,
        remainingSlaHours: 48,
        isSlaWarning: false,
        accountComment: `Tự động sinh từ Đợt Listing ${listingItem.batchCycle} tháng ${listingItem.monthKey} (${listingItem.salaryGrade || 'KL3'} · Plan ${listingItem.sourcePlanVersion || 'v1.0'})`
      };
      setDeals(prev => [newDeal, ...prev]);
      showToast(`Đã tự động tạo Deal ${newDeal.dealCode} (${newDeal.salaryGrade}) cho KOC ${newDeal.kocStageName}`, 'success');
    }
  };

  // Modals
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Mở hồ sơ hợp đồng của một deal hoặc từ một KOC / Hồ sơ pháp lý (từ Booking, Danh bạ KOC, Tổng quan, Việc của tôi).
  const [contractIntent, setContractIntent] = useState<ContractIntent | null>(null);
  const openContractForDeal = (deal: BookingDealItem, document?: ContractDocument) => {
    setDeals(prev => (prev.some(d => d.id === deal.id) ? prev.map(d => (d.id === deal.id ? deal : d)) : [deal, ...prev]));
    setContractIntent({
      dealId: deal.id,
      kocId: deal.kocId,
      legalProfileId: deal.legalProfileId,
      nonce: Date.now(),
      document: document || (!deal.tiktokVideoUrl ? 'SOW' : undefined),
    });
    setActiveTab('contracts');
  };
  const openContractForKoc = (koc: KocItem, legalProfileId?: string) => {
    setContractIntent({ kocId: koc.id, legalProfileId, nonce: Date.now(), document: 'HDNT' });
    setActiveTab('contracts');
  };
  // Deal/Job của kế hoạch: đưa bản Job vào danh sách rồi mở hồ sơ hợp đồng nguyên tắc, SOW hoặc biên bản nghiệm thu của Job đó.
  const openContractForPlanDeal = (deal: BookingDealItem, document: ContractDocument) => {
    setDeals(prev => (prev.some(d => d.id === deal.id) ? prev.map(d => (d.id === deal.id ? deal : d)) : [deal, ...prev]));
    setContractIntent({ dealId: deal.id, kocId: deal.kocId, legalProfileId: deal.legalProfileId, nonce: Date.now(), document });
    setActiveTab('contracts');
  };
  const [preselectedKoc, setPreselectedKoc] = useState<KocItem | null>(null);
  const [preselectedBrand, setPreselectedBrand] = useState<string | null>(null);

  // Mobile Drawer & Desktop Sidebar Collapse State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('upbase_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('upbase_sidebar_collapsed', String(next));
      }
      return next;
    });
  }, []);

  // Plan Handlers
  const handleAddPlanItem = (newItem: StaffDetailedPlanItem) => {
    setDetailedPlans(prev => [newItem, ...prev]);
    showToast(`Đã thêm ${newItem.kocStageName} vào kế hoạch tuần ${newItem.targetWeek}`);
  };

  const handleUpdatePlanItem = (updated: StaffDetailedPlanItem) => {
    setDetailedPlans(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDeletePlanItem = (itemId: string) => {
    setDetailedPlans(prev => prev.filter(i => i.id !== itemId));
    showToast('Đã xóa slot khỏi kế hoạch');
  };

  const handleSubmitPlanToLead = (staffName: string) => {
    setDetailedPlans(prev => prev.map(i => i.staffName === staffName && i.status === 'DRAFT' ? {
      ...i,
      status: 'SUBMITTED',
      leadNotes: 'Đã gửi trình duyệt lên Trưởng phòng'
    } : i));
    showToast(`Đã gửi duyệt kế hoạch của ${staffName}`);
  };

  const handleApproveEntirePlanFromLead = (staffName: string, managerFeedback: string) => {
    setDetailedPlans(prev => prev.map(item => item.staffName === staffName ? {
      ...item,
      status: 'APPROVED',
      leadNotes: managerFeedback || 'Trưởng phòng đã phê duyệt toàn bộ kế hoạch'
    } : item));
    showToast(`Đã duyệt kế hoạch của ${staffName}`);
  };

  const handleRequestPlanRevisionFromLead = (staffName: string, managerFeedback: string) => {
    setDetailedPlans(prev => prev.map(item => item.staffName === staffName && item.status !== 'CONVERTED' ? {
      ...item,
      status: 'REVISION_REQUESTED',
      leadNotes: managerFeedback || 'Trưởng phòng yêu cầu điều chỉnh danh sách KOC'
    } : item));
    showToast(`Đã trả kế hoạch về cho ${staffName} để sửa`, 'warning');
  };

  const handleUpdatePlanItemStatusFromLead = (itemId: string, newStatus: StaffPlanStatus, leadNotes?: string) => {
    setDetailedPlans(prev => prev.map(item => item.id === itemId ? {
      ...item,
      status: newStatus,
      leadNotes: leadNotes || item.leadNotes
    } : item));
  };

  const handleConvertPlanItemToDeal = (item: StaffDetailedPlanItem) => {
    const newDeal: BookingDealItem = {
      id: `deal-${Date.now()}`,
      dealCode: item.dealCode || `BO26_${Date.now().toString().slice(-6)}`,
      kocId: `koc-${item.kocStageName.replace(/\s+/g, '-').toLowerCase()}`,
      kocStageName: item.kocStageName,
      kocChannelId: item.channelId || '@tiktok',
      kocTier: item.tier,
      campaignCode: `CAMP-${item.brandName.toUpperCase().replace(/\s+/g, '')}`,
      campaignTitle: `Chiến Dịch Tháng 9 - ${item.brandName}`,
      brandName: item.brandName,
      productName: `Combo Sản Phẩm Chủ Lực ${item.brandName}`,
      totalValue: item.budgetEstimated || 5000000,
      advanceAmount: Math.round((item.budgetEstimated || 5000000) * 0.2),
      finalAmount: Math.round((item.budgetEstimated || 5000000) * 0.8),
      salaryGrade: item.salaryGrade,
      segment: item.tier === 'TIER_1_CELEB' ? 'Top Creator' : item.tier === 'TIER_2_MACRO' ? 'Key Creator' : item.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
      tepKenh: item.tepKenh || 'Beauty',
      kocCategory: 'Personal care',
      contentPillar: (item.contentPillar as ContentPillarType) || 'Review trực tiếp',
      status: 'CONTRACT_GENERATED',
      statusLabel: 'Đã Ký HĐ (Cần Duyệt Cọc)',
      pipelineText: 'Chờ chi cọc',
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      sampleStatus: 'CHƯA_GỬI',
      adsCodeStatus: 'CHƯA_CẤP',
      gmv30: item.targetGmv,
      affiliateGmv: item.targetGmv,
      roi: item.budgetEstimated > 0 ? Number((item.targetGmv / item.budgetEstimated).toFixed(2)) : 5.0,
      assignedStaff: item.staffName,
      deadlinePost: '2026-10-15',
      viewsCount: 0,
      publishedDays: 0,
      remainingSlaHours: 24,
      isSlaWarning: false
    };

    setDeals(prev => [newDeal, ...prev]);
    // Mark item as CONVERTED in detailedPlans so MyPlan and ManagerView reflect updated status
    setDetailedPlans(prev => prev.map(p => p.id === item.id ? {
      ...p,
      status: 'CONVERTED',
      dealCode: newDeal.dealCode,
      leadNotes: 'Đã kích hoạt chuyển đổi sang Deal Booking chính thức'
    } : p));
    showToast(`Đã tạo deal ${newDeal.dealCode} cho ${item.kocStageName}`);
  };

  const handleBatchConvertPlanToDeals = (staffName: string) => {
    const approvedItems = detailedPlans.filter(p => p.staffName === staffName && p.status === 'APPROVED');
    if (approvedItems.length === 0) {
      showToast(`Kế hoạch của ${staffName} chưa có KOC nào được duyệt. Duyệt ít nhất một KOC rồi thử lại.`, 'warning');
      return;
    }

    const createdDeals: BookingDealItem[] = approvedItems.map((item, idx) => {
      const code = item.dealCode || `BO26_${Date.now().toString().slice(-4)}${idx}`;
      return {
        id: `deal-batch-${Date.now()}-${idx}`,
        dealCode: code,
        kocId: `koc-${item.kocStageName.replace(/\s+/g, '-').toLowerCase()}`,
        kocStageName: item.kocStageName,
        kocChannelId: item.channelId || '@tiktok',
        kocTier: item.tier,
        campaignCode: `CAMP-${item.brandName.toUpperCase().replace(/\s+/g, '')}`,
        campaignTitle: `Chiến Dịch Tháng 9 - ${item.brandName}`,
        brandName: item.brandName,
        storeName: item.storeName || `${item.brandName} Official Store`,
        productName: item.productName || `Combo Sản Phẩm Chủ Lực ${item.brandName}`,
        totalValue: item.budgetEstimated || 5000000,
        advanceAmount: Math.round((item.budgetEstimated || 5000000) * 0.2),
        finalAmount: Math.round((item.budgetEstimated || 5000000) * 0.8),
        salaryGrade: item.salaryGrade,
        segment: item.tier === 'TIER_1_CELEB' ? 'Top Creator' : item.tier === 'TIER_2_MACRO' ? 'Key Creator' : item.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
        tepKenh: item.tepKenh || 'Beauty',
        kocCategory: 'Personal care',
        contentPillar: (item.contentPillar as ContentPillarType) || 'Review trực tiếp',
        contentAngleId: item.contentAngleId,
        contentAngleName: item.contentAngleName,
        contentHook: item.contentHook,
        status: 'CONTRACT_GENERATED',
        statusLabel: 'Đã Ký HĐ (Cần Duyệt Cọc)',
        pipelineText: 'Chờ chi cọc',
        brandApprovalStatus: 'ĐÃ_DUYỆT',
        sampleStatus: 'CHƯA_GỬI',
        adsCodeStatus: 'CHƯA_CẤP',
        gmv30: item.targetGmv,
        affiliateGmv: item.targetGmv,
        roi: item.budgetEstimated > 0 ? Number((item.targetGmv / item.budgetEstimated).toFixed(2)) : 5.0,
        assignedStaff: item.staffName,
        deadlinePost: '2026-10-15',
        viewsCount: 0,
        publishedDays: 0,
        remainingSlaHours: 24,
        isSlaWarning: false
      };
    });

    setDeals(prev => [...createdDeals, ...prev]);

    setDetailedPlans(prev => prev.map(p => {
      const match = approvedItems.find(a => a.id === p.id);
      if (match) {
        const correspondingDeal = createdDeals.find(d => d.kocStageName === match.kocStageName);
        return {
          ...p,
          status: 'CONVERTED',
          dealCode: correspondingDeal ? correspondingDeal.dealCode : p.dealCode,
          leadNotes: 'Trưởng phòng đã chuyển đổi hàng loạt sang Booking Deals'
        };
      }
      return p;
    }));

    showToast(`Đã tạo ${approvedItems.length} deal từ kế hoạch của ${staffName}`);
  };

  const handleGenerateDealsFromGrowthDemand = (demand: GrowthDemandItem) => {
    const newDealsGenerated: BookingDealItem[] = (demand.breakdown || []).flatMap((tierItem: GrowthDemandBreakdownTier, tIdx: number) => {
      return Array.from({ length: Math.min(tierItem.targetCount, 4) }).map((_, i) => ({
        id: `deal-gen-${Date.now()}-${tIdx}-${i}`,
        dealCode: `BO26_${Date.now().toString().slice(-4)}${tIdx}${i}`,
        kocId: `koc-pending-${tIdx}-${i}`,
        kocStageName: `[Slot ${tierItem.tierLabel.split(':')[1]?.trim() || 'KOC'}] #${i + 1}`,
        kocChannelId: '@chua_gan',
        kocTier: tierItem.tier,
        campaignCode: demand.code,
        campaignTitle: demand.title,
        brandName: demand.brandName,
        productName: `Sản Phẩm Chiến Dịch ${demand.brandName}`,
        totalValue: tierItem.estimatedAvgCost,
        advanceAmount: Math.round(tierItem.estimatedAvgCost * 0.2),
        finalAmount: Math.round(tierItem.estimatedAvgCost * 0.8),
        salaryGrade: (tierItem.salaryGradeLabel?.split(' ')[0] as SalaryGrade) || 'KL4',
        segment: tierItem.tier === 'TIER_1_CELEB' ? 'Top Creator' : tierItem.tier === 'TIER_2_MACRO' ? 'Key Creator' : tierItem.tier === 'TIER_3_MICRO' ? 'Mid Creator' : 'Massive Creator',
        tepKenh: 'Beauty',
        kocCategory: (demand.brandCategory?.split('/')[0]?.trim() as KocCategory) || 'Personal care',
        contentPillar: 'Review trực tiếp',
        status: 'DRAFT' as DealStatus,
        statusLabel: 'Chờ Tuyển KOC & Trình Brand',
        pipelineText: 'Sàng lọc',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleStatus: 'CHƯA_GỬI',
        adsCodeStatus: 'CHƯA_CẤP',
        gmv30: tierItem.estimatedGmvPerKoc,
        affiliateGmv: tierItem.estimatedGmvPerKoc,
        roi: tierItem.historicalRoiBenchmark || 4.5,
        assignedStaff: 'Chưa phân bổ',
        deadlinePost: '2026-10-15',
        viewsCount: 0,
        publishedDays: 0,
        remainingSlaHours: 24,
        isSlaWarning: false
      }));
    });

    if (newDealsGenerated.length > 0) {
      setDeals(prev => [...newDealsGenerated, ...prev]);
      showToast(`Đã tạo ${newDealsGenerated.length} deal từ kế hoạch ${demand.code}`);
    }
  };

  const handleDealCreated = (newDeal: BookingDealItem, openSowAfterCreate?: boolean) => {
    setDeals(prev => [newDeal, ...prev]);
    const newTask: SlaTask = {
      id: `task-${Date.now()}`,
      title: `Thẩm định kịch bản KOC ${newDeal.kocStageName} (${newDeal.campaignCode})`,
      type: 'SCRIPT_REVIEW',
      team: 'Content Team',
      pic: 'Quỳnh Như',
      targetRole: 'CONTENT_MEMBER',
      deadline: 'Trong vòng 24h',
      remainingText: 'Còn 24 giờ',
      urgency: 'warning',
      dealCode: newDeal.dealCode
    };
    setTasks(prev => [newTask, ...prev]);
    if (openSowAfterCreate) {
      openContractForDeal(newDeal, 'SOW');
      showToast(`Đã tạo deal ${newDeal.dealCode} và mở Phụ lục SOW cho ${newDeal.kocStageName}.`);
      return;
    }
    showToast(`Đã tạo deal ${newDeal.dealCode} cho ${newDeal.kocStageName}. Hạn duyệt kịch bản: 24 giờ.`);
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => {
      const next: SlaTask[] = prev.map(t => t.id === taskId ? { ...t, urgency: 'done' as const, remainingText: 'Đạt SLA 100%' } : t);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('upbase_b2c_sla_tasks_v1', JSON.stringify(next));
          pushSharedStateToDb('sla-tasks-v1', next);
        } catch {
          // ignore
        }
      }
      return next;
    });
    showToast('Đã hoàn thành việc. +5 điểm SLA');
  };

  const handleAddTask = (newTask: SlaTask) => {
    setTasks(prev => {
      const next = [newTask, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('upbase_b2c_sla_tasks_v1', JSON.stringify(next));
          pushSharedStateToDb('sla-tasks-v1', next);
        } catch {
          // ignore
        }
      }
      return next;
    });
    showToast(`Đã giao việc cho ${newTask.pic}`);
  };

  const handleUpdateTask = (updatedTask: SlaTask) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === updatedTask.id ? updatedTask : t);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('upbase_b2c_sla_tasks_v1', JSON.stringify(next));
          pushSharedStateToDb('sla-tasks-v1', next);
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleUpdateBrand = (updatedBrand: BrandDetail) => {
    setBrands(prev => prev.map(b => b.id === updatedBrand.id ? updatedBrand : b));
    showToast(`Đã cập nhật phân bổ ${updatedBrand.name}`);
  };

  const handleAddBrand = (newBrand: BrandDetail) => {
    setBrands(prev => [newBrand, ...prev]);
    showToast(`Đã thêm nhãn hàng ${newBrand.name}`);
  };

  const handleUpdateStore = (updatedStore: StorePortfolioItem) => {
    const current = storePortfolios.find(s => s.id === updatedStore.id);
    // Phân công (Booking chính, cùng làm, Leader, dự phòng) lưu vào Dữ liệu gốc trên máy chủ: quyền đọc từ đây
    const assignment: Record<string, unknown> = {};
    for (const f of STORE_ASSIGNMENT_FIELDS) {
      const next = (updatedStore as unknown as Record<string, unknown>)[f];
      const prev = current ? (current as unknown as Record<string, unknown>)[f] : undefined;
      if (JSON.stringify(next ?? null) !== JSON.stringify(prev ?? null)) assignment[f] = next ?? null;
    }
    if (Object.keys(assignment).length > 0) {
      void fetch('/api/master-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: updatedStore.id, assignment }),
      })
        .then(async res => {
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
          if (body?.store) setStorePortfolios(prev => prev.map(s => (s.id === updatedStore.id ? { ...s, ...body.store } : s)));
        })
        .catch(err => {
          showToast(`Chưa lưu được phân công gian ${updatedStore.storeName}: ${err instanceof Error ? err.message : 'lỗi mạng'}`);
          if (current) setStorePortfolios(prev => prev.map(s => (s.id === updatedStore.id ? { ...s, ...Object.fromEntries(STORE_ASSIGNMENT_FIELDS.map(f => [f, (current as unknown as Record<string, unknown>)[f]])) } : s)));
        });
    }
    try {
      const raw = localStorage.getItem('upbase_store_overrides_v1');
      const overrides = raw ? (JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>) : {};
      overrides[updatedStore.id] = withoutAssignment(updatedStore);
      localStorage.setItem('upbase_store_overrides_v1', JSON.stringify(overrides));
      pushSharedStateToDb('store-overrides-v1', overrides);
    } catch {
      // ignore storage errors
    }
    setStorePortfolios(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
  };

  const handleImportSuccess = (result: { updatedDeals: number; totalGmvAdded: number }) => {
    showToast(`Đã cập nhật ${result.updatedDeals} deal, GMV +${result.totalGmvAdded.toLocaleString('vi-VN')} đ`);
  };

  const handleOpenQuickBookWithKoc = (koc: KocItem) => {
    setPreselectedKoc(koc);
    setIsQuickBookOpen(true);
  };

  const handleCampaignCreatedNotification = (camp: CampaignItem) => {
    showToast(`Đã tạo chiến dịch ${camp.code} và gửi brief cho team Content`);
  };

  const handleTriggerHandoffNotification = (title: string) => {
    showToast(`Đã bàn giao tài liệu chiến dịch ${title} cho team Content`);
  };

  const handleScriptApprovedNotification = (dealCode: string) => {
    setDeals(prev => prev.map(d => d.dealCode === dealCode ? {
      ...d,
      status: 'SCRIPT_APPROVED',
      statusLabel: 'Đã Duyệt Kịch Bản (Cần Trình Ký HĐ)'
    } : d));
    showToast(`Đã duyệt kịch bản ${dealCode}. Bước tiếp theo: ký hợp đồng.`);
  };

  const handlePingStaffNotification = (staffName: string, taskTitle: string) => {
    showToast(`Đã nhắc ${staffName}: ${taskTitle}`, 'warning');
  };

  const handleUpdateDeal = (updatedDeal: BookingDealItem) => {
    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    const videoLink = updatedDeal.tiktokVideoUrl || updatedDeal.videoUrl || '';
    const extracted = extractTikTokChannelAndVideoFromInput(videoLink);
    const channelHandle =
      extracted.channelHandle ||
      (updatedDeal.kocChannelId ? updatedDeal.kocChannelId.replace(/^@/, '') : '');
    if (channelHandle && (videoLink || updatedDeal.viewsCount > 0 || updatedDeal.gmv30 > 0)) {
      autoMapVideoAcceptanceByKocChannel({
        acceptances: [
          {
            channelHandle,
            linkAir: videoLink,
            videoId: extracted.videoId,
            actualAirDate: updatedDeal.postedDate || updatedDeal.postDate,
            sparkAdsCode: updatedDeal.sparkAdsCode,
            views30d: updatedDeal.viewsCount,
            gmv30d: updatedDeal.gmv30 || updatedDeal.affiliateGmv,
            orders30d: updatedDeal.ordersCount || updatedDeal.orders30,
            storeNameFilter: updatedDeal.storeName,
          },
        ],
        allKocs: kocs,
        allStores: storePortfolios,
        allDeals: deals,
      });
    }
    showToast(`Đã cập nhật deal ${updatedDeal.dealCode} và đồng bộ nghiệm thu vào List duyệt book & Sheet Brand`);
  };

  const handleKocCreated = (newKoc: KocItem) => {
    void persistKocsToDatabase({ created: [newKoc], updated: [] });
    showToast(`Đã thêm và lưu CSDL ${newKoc.stageName} vào danh bạ (${newKoc.salaryGrade})`);
  };

  const handleKocUpdated = (updatedKoc: KocItem) => {
    void persistKocsToDatabase({ created: [], updated: [updatedKoc] });
    showToast(`Đã cập nhật và lưu CSDL hồ sơ của ${updatedKoc.stageName}`);
  };

  // Danh bạ CTV lưu trên máy chủ: báo thành công chỉ khi máy chủ nhận (lỗi quyền / mạng hook tự báo và tải lại)
  const handleContributorCreated = (newCtv: Contributor) => {
    void ctvDirectory.upsert(newCtv).then(ok => ok && showToast(`Đã thêm CTV / VJ ${newCtv.name} vào danh bạ`));
  };

  const handleContributorUpdated = (updatedCtv: Contributor) => {
    void ctvDirectory.upsert(updatedCtv).then(ok => ok && showToast(`Đã cập nhật hồ sơ CTV / VJ ${updatedCtv.name}`));
  };

  const handleContributorDeleted = (ctvId: string) => {
    void ctvDirectory.remove(ctvId).then(ok => ok && showToast('Đã xóa CTV / VJ khỏi danh sách'));
  };

  const handleTaskActionClick = (task: SlaTask) => {
    if (task.dealCode) {
      const matched = deals.find(d => d.dealCode === task.dealCode);
      if (matched) {
        openContractForDeal(matched);
        return;
      }
    }
    if (task.type === 'RESEARCH_TASK' || task.taskCategory) {
      setActiveTab('task-delegation');
      return;
    }
    if (task.type === 'SCRIPT_REVIEW') {
      setActiveTab('content');
      showToast('Kịch bản chờ duyệt', 'info');
    } else if (task.type === 'CONTRACT_APPROVAL') {
      setActiveTab('contracts');
    } else if (task.type === 'CAMPAIGN_BRIEF') {
      setActiveTab('input-plan');
    } else {
      handleCompleteTask(task.id);
    }
  };

  return {
    kocs,
    setKocs,
    ctvDirectory,
    contributors,
    deals,
    setDeals,
    tasks,
    setTasks,
    brands,
    setBrands,
    storePortfolios,
    setStorePortfolios,
    campaigns,
    setCampaigns,
    detailedPlans,
    setDetailedPlans,
    staffAllocations,
    setStaffAllocations,
    kocListings,
    setKocListings,
    sharedMonthlyPlans,
    setSharedMonthlyPlans,
    scopedStores,
    scopedBrands,
    scopedDeals,
    scopedMonthlyPlans,
    userScopeSummary,
    pendingTasksCount,
    listingPlanContext,
    setListingPlanContext,
    planDrilldownIntent,
    setPlanDrilldownIntent,
    bookingDrilldownIntent,
    setBookingDrilldownIntent,
    isQuickBookOpen,
    setIsQuickBookOpen,
    isImportOpen,
    setIsImportOpen,
    contractIntent,
    setContractIntent,
    preselectedKoc,
    setPreselectedKoc,
    preselectedBrand,
    setPreselectedBrand,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isSidebarCollapsed,
    handleToggleSidebarCollapse,
    syncCustomKocsIntoState,
    persistKocsToDatabase,
    handleDrilldownToPlan,
    handleDrilldownToListing,
    handleDrilldownToBooking,
    handleGenerateDealFromListing,
    openContractForDeal,
    openContractForKoc,
    openContractForPlanDeal,
    handleAddPlanItem,
    handleUpdatePlanItem,
    handleDeletePlanItem,
    handleSubmitPlanToLead,
    handleApproveEntirePlanFromLead,
    handleRequestPlanRevisionFromLead,
    handleUpdatePlanItemStatusFromLead,
    handleConvertPlanItemToDeal,
    handleBatchConvertPlanToDeals,
    handleGenerateDealsFromGrowthDemand,
    handleDealCreated,
    handleCompleteTask,
    handleAddTask,
    handleUpdateTask,
    handleUpdateBrand,
    handleAddBrand,
    handleUpdateStore,
    handleImportSuccess,
    handleOpenQuickBookWithKoc,
    handleCampaignCreatedNotification,
    handleTriggerHandoffNotification,
    handleScriptApprovedNotification,
    handlePingStaffNotification,
    handleUpdateDeal,
    handleKocCreated,
    handleKocUpdated,
    handleContributorCreated,
    handleContributorUpdated,
    handleContributorDeleted,
    handleTaskActionClick,
  };
}
