'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  InputPlanBreakdownState,
  KocItem,
  PlanMultiPlatformKey,
  StorePortfolioItem,
} from '@/lib/types';
import type { LinkAirResult } from '@/lib/linkAirCheck';
import {
  MULTI_PLATFORM_CONFIGS,
  MULTI_PLATFORM_REUP_STORAGE_KEY,
  MULTI_PLATFORM_STORAGE_KEY,
  buildInitialMultiPlatformSeed,
  buildPlatformChannelUrl,
  computeGrossFromNet,
  computeStoreMultiPlatformQuotas,
  detectMultiPlatformFromUrl,
  loadMultiPlatformCustomFields,
  saveMultiPlatformCustomFields,
  type MultiPlatformAutoCheckSummary,
  type MultiPlatformBrandDecision,
  type MultiPlatformFieldDef,
  type MultiPlatformListingItem,
  type MultiPlatformReupRecord,
} from '@/lib/multiPlatformListing';
import {
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Panel,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';

interface MultiPlatformListingWorkspaceProps {
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  monthlyPlans: InputPlanBreakdownState[];
  currentUserName: string;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  selectedStore: string;
  onChangeStore: (storeName: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type WorkspaceMode = 'LISTING' | 'ACCEPTANCE' | 'REUP_TRACKER';

const PLATFORM_ORDER: PlanMultiPlatformKey[] = ['threads', 'facebook', 'shopee', 'instagram'];
const MONTH_OPTIONS = ['2026/11', '2026/10', '2026/09'];
const BATCH_OPTIONS = ['Đợt 1', 'Đợt 2', 'Đợt 3'];
const PROPOSAL_OPTIONS: Array<'Must Have' | 'Recommend' | 'Optional'> = [
  'Must Have',
  'Recommend',
  'Optional',
];
const BRAND_DECISION_OPTIONS: MultiPlatformBrandDecision[] = [
  'Chờ duyệt',
  'Yes',
  'No',
  'Cân nhắc',
];
const PAYMENT_STATUS_OPTIONS: Array<MultiPlatformListingItem['paymentStatus']> = [
  'Chờ nghiệm thu',
  'Đủ điều kiện ĐNTT',
  'Đã lập ĐNTT',
  'Đã thanh toán',
];

const fmt = (v: number) => Math.round(v || 0).toLocaleString('vi-VN');

export const MultiPlatformListingWorkspace: React.FC<MultiPlatformListingWorkspaceProps> = ({
  kocs,
  stores,
  monthlyPlans,
  currentUserName,
  selectedMonth,
  onChangeMonth,
  selectedStore,
  onChangeStore,
  onNotify,
}) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') =>
    onNotify?.(msg, type);

  const seedData = useMemo(
    () => buildInitialMultiPlatformSeed(monthlyPlans, kocs),
    [monthlyPlans, kocs]
  );

  const [items, setItems] = useState<MultiPlatformListingItem[]>(() => {
    if (typeof window === 'undefined') return seedData.items;
    try {
      const raw = window.localStorage.getItem(MULTI_PLATFORM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MultiPlatformListingItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to seed
    }
    return seedData.items;
  });

  const [reupRecords, setReupRecords] = useState<MultiPlatformReupRecord[]>(() => {
    if (typeof window === 'undefined') return seedData.reups;
    try {
      const raw = window.localStorage.getItem(MULTI_PLATFORM_REUP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MultiPlatformReupRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to seed
    }
    return seedData.reups;
  });

  const [customFieldsByPlatform, setCustomFieldsByPlatform] = useState<
    Record<PlanMultiPlatformKey, MultiPlatformFieldDef[]>
  >(() => loadMultiPlatformCustomFields());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MULTI_PLATFORM_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MULTI_PLATFORM_REUP_STORAGE_KEY, JSON.stringify(reupRecords));
    } catch {
      // ignore
    }
  }, [reupRecords]);

  // Danh sách gian hàng ưu tiên các gian có chỉ tiêu Đa sàn trong tháng đang chọn
  const storesInMonth = useMemo(() => {
    const plansForMonth = monthlyPlans.filter(p => p.month === selectedMonth);
    const withMp: { storeName: string; hasTarget: boolean; summaryText: string }[] = [];

    for (const p of plansForMonth) {
      const sName = p.storeName || p.brandName;
      const mp = p.reference41?.multiPlatform;
      const parts: string[] = [];
      if (mp) {
        for (const k of PLATFORM_ORDER) {
          const d = mp[k];
          if (d && (d.affQty > 0 || d.reupQty > 0 || d.costNet > 0)) {
            const label = MULTI_PLATFORM_CONFIGS[k].shortLabel;
            const qtyStr = d.affQty > 0 ? `${d.affQty}` : d.reupQty > 0 ? `${d.reupQty} Reup` : `${fmt(d.costNet)}đ`;
            parts.push(`${label}: ${qtyStr}`);
          }
        }
      }
      withMp.push({
        storeName: sName,
        hasTarget: parts.length > 0,
        summaryText: parts.join(' · '),
      });
    }

    withMp.sort((a, b) => Number(b.hasTarget) - Number(a.hasTarget) || a.storeName.localeCompare(b.storeName));
    return withMp;
  }, [monthlyPlans, selectedMonth]);

  // Nếu gian hàng đang chọn chưa có chỉ tiêu đa sàn, tự gợi ý hoặc giữ nguyên nếu người dùng chọn
  const activePlan = useMemo(() => {
    const sLower = (selectedStore || '').trim().toLowerCase();
    return (
      monthlyPlans.find(
        p =>
          p.month === selectedMonth &&
          (p.storeName || p.brandName).trim().toLowerCase() === sLower
      ) || null
    );
  }, [monthlyPlans, selectedMonth, selectedStore]);

  const [activePlatform, setActivePlatform] = useState<PlanMultiPlatformKey>('threads');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('LISTING');
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [onlyMultiPlatformStores, setOnlyMultiPlatformStores] = useState<boolean>(true);

  // Tự động chọn sàn có chỉ tiêu > 0 khi chuyển gian hàng
  const [lastSyncedPlanId, setLastSyncedPlanId] = useState<string | undefined>(undefined);
  if (activePlan?.id !== lastSyncedPlanId) {
    setLastSyncedPlanId(activePlan?.id);
    const mp = activePlan?.reference41?.multiPlatform;
    if (mp) {
      const firstActivePlatform = PLATFORM_ORDER.find(k => {
        const d = mp[k];
        return d && (d.affQty > 0 || d.costNet > 0 || d.reupQty > 0);
      });
      if (firstActivePlatform && firstActivePlatform !== activePlatform) {
        setActivePlatform(firstActivePlatform);
      }
    }
  }

  const storeItems = useMemo(
    () =>
      items.filter(
        i =>
          i.monthKey === selectedMonth &&
          (selectedStore === 'ALL' ||
            i.storeName.trim().toLowerCase() === selectedStore.trim().toLowerCase())
      ),
    [items, selectedMonth, selectedStore]
  );

  const storeReups = useMemo(
    () =>
      reupRecords.filter(
        r =>
          r.monthKey === selectedMonth &&
          (selectedStore === 'ALL' ||
            r.storeName.trim().toLowerCase() === selectedStore.trim().toLowerCase())
      ),
    [reupRecords, selectedMonth, selectedStore]
  );

  const quotasByPlatform = useMemo(() => {
    if (selectedStore === 'ALL') {
      // Cộng tổng hạn ngạch toàn bộ gian hàng trong tháng
      const plansForMonth = monthlyPlans.filter(p => p.month === selectedMonth);
      const combined = computeStoreMultiPlatformQuotas(null, storeItems, storeReups);
      for (const p of plansForMonth) {
        const sub = computeStoreMultiPlatformQuotas(p, [], []);
        for (const k of PLATFORM_ORDER) {
          combined[k].targetAffQty += sub[k].targetAffQty;
          combined[k].targetBudgetNet += sub[k].targetBudgetNet;
          combined[k].targetReupQty += sub[k].targetReupQty;
        }
      }
      return combined;
    }
    return computeStoreMultiPlatformQuotas(activePlan, storeItems, storeReups);
  }, [activePlan, monthlyPlans, selectedMonth, selectedStore, storeItems, storeReups]);

  const activeConfig = MULTI_PLATFORM_CONFIGS[activePlatform];
  const activeQuota = quotasByPlatform[activePlatform];
  const activeCustomFields = customFieldsByPlatform[activePlatform] || [];

  const listingColumns = useMemo(
    () => [
      ...activeConfig.listingFields,
      ...activeCustomFields.filter(f => f.phase === 'LISTING' || f.phase === 'BOTH'),
    ],
    [activeConfig.listingFields, activeCustomFields]
  );

  const acceptanceColumns = useMemo(
    () => [
      ...activeConfig.acceptanceFields,
      ...activeCustomFields.filter(f => f.phase === 'ACCEPTANCE' || f.phase === 'BOTH'),
    ],
    [activeConfig.acceptanceFields, activeCustomFields]
  );

  const filteredPlatformItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storeItems.filter(item => {
      if (item.platform !== activePlatform) return false;
      if (workspaceMode === 'ACCEPTANCE' && item.brandDecision !== 'Yes') return false;
      if (decisionFilter !== 'ALL' && item.brandDecision !== decisionFilter) return false;
      if (!q) return true;
      return (
        item.channelHandle.toLowerCase().includes(q) ||
        item.kocDisplayName.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        (item.boCode || '').toLowerCase().includes(q) ||
        item.storeName.toLowerCase().includes(q)
      );
    });
  }, [storeItems, activePlatform, workspaceMode, decisionFilter, searchQuery]);

  const filteredReups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return storeReups.filter(r => {
      if (r.platform !== activePlatform) return false;
      if (!q) return true;
      return (
        r.kocOrSourceName.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.reupPostUrl.toLowerCase().includes(q)
      );
    });
  }, [storeReups, activePlatform, searchQuery]);

  // Modal thêm KOC lên sàn đang chọn
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState({
    kocSearch: '',
    channelHandle: '',
    kocDisplayName: '',
    followersCount: 25000,
    nicheTag: 'Beauty & Personal Care',
    productName: '',
    postFormat: activeConfig.formatOptions[0],
    linkPlacement: activeConfig.linkPlacementOptions[0],
    unitNetFee: activeConfig.defaultUnitNet,
    batchLabel: 'Đợt 1',
    targetWeek: selectedMonth === '2026/10' ? 'W42' : 'W46',
  });

  // Modal thêm trường tùy chỉnh cho sàn đang chọn
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'url'>('text');
  const [newFieldPhase, setNewFieldPhase] = useState<'LISTING' | 'ACCEPTANCE' | 'BOTH'>('BOTH');
  const [newFieldOptionsText, setNewFieldOptionsText] = useState('');

  // Modal dán nhanh Link bài đăng để nghiệm thu
  const [isBatchPasteModalOpen, setIsBatchPasteModalOpen] = useState(false);
  const [batchPasteText, setBatchPasteText] = useState('');

  // Modal thêm dòng Reup 0đ
  const [isAddReupModalOpen, setIsAddReupModalOpen] = useState(false);
  const [newReupDraft, setNewReupDraft] = useState({
    weekCode: selectedMonth === '2026/10' ? 'W42' : 'W46',
    kocOrSourceName: '',
    productName: '',
    sourceVideoUrl: '',
    reupPostUrl: '',
  });

  // Trạng thái & Modal kiểm tra chi tiết Engine Nghiệm thu Đa sàn
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [checkingRowId, setCheckingRowId] = useState<string | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedItem, setInspectedItem] = useState<{
    title: string;
    handle: string;
    platformLabel: string;
    postUrl: string;
    result: MultiPlatformAutoCheckSummary;
  } | null>(null);

  // Modal Kiểm thử trực tiếp Link Bài đăng & Link Affiliate bất kỳ
  const [isTestEngineModalOpen, setIsTestEngineModalOpen] = useState(false);
  const [testPostUrlInput, setTestPostUrlInput] = useState('');
  const [testAffiliateUrlInput, setTestAffiliateUrlInput] = useState('');
  const [testExpectedHandleInput, setTestExpectedHandleInput] = useState('');
  const [testExpectedBrandInput, setTestExpectedBrandInput] = useState('');
  const [isRunningDirectTest, setIsRunningDirectTest] = useState(false);
  const [directTestResult, setDirectTestResult] = useState<MultiPlatformAutoCheckSummary | null>(null);
  const [isExtBridgeInstalled, setIsExtBridgeInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const checkBridge = () => {
      if (document.documentElement.getAttribute('data-upbase-ext-installed')) {
        setIsExtBridgeInstalled(true);
      }
    };
    checkBridge();
    const onMsg = (ev: MessageEvent) => {
      if (ev.source === window && ev.data?.source === 'UPBASE_EXT_BRIDGE_READY') {
        setIsExtBridgeInstalled(true);
      }
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ source: 'UPBASE_WEBADMIN_PING_EXT' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const triggerExtensionBatchVerify = (urlsToVerify: string[]): Promise<boolean> => {
    if (typeof window === 'undefined' || urlsToVerify.length === 0) {
      return Promise.resolve(false);
    }
    const hasExt =
      isExtBridgeInstalled ||
      Boolean(document.documentElement.getAttribute('data-upbase-ext-installed'));
    if (!hasExt) return Promise.resolve(false);

    return new Promise(resolve => {
      const reqId = `ext-verify-${Date.now()}`;
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(false);
      }, 25000);

      const handler = (ev: MessageEvent) => {
        if (
          ev.source === window &&
          ev.data?.source === 'UPBASE_WEBADMIN_BATCH_VERIFY_DONE' &&
          ev.data?.reqId === reqId
        ) {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          resolve(Boolean(ev.data?.ok && Number(ev.data?.syncedCount || 0) > 0));
        }
      };

      window.addEventListener('message', handler);
      window.postMessage(
        {
          source: 'UPBASE_WEBADMIN_BATCH_VERIFY',
          reqId,
          urls: urlsToVerify,
        },
        '*'
      );
    });
  };

  const mapLinkAirResultToSummary = (r: LinkAirResult): MultiPlatformAutoCheckSummary => ({
    status: r.status,
    verdict: r.verdict,
    authorHandle: r.author?.handle ?? null,
    authorName: r.author?.name ?? null,
    airedAtVn: r.airedAtVn,
    publishedAt: r.publishedAt,
    hasProductLink: r.hasProductLink,
    productTitle: r.productTitle,
    productUrl: r.productUrl,
    views: r.metrics?.views ?? null,
    likes: r.metrics?.likes ?? null,
    comments: r.metrics?.comments ?? null,
    shares: r.metrics?.shares ?? null,
    captionSnippet: r.caption ? r.caption.slice(0, 240) : undefined,
    source: r.source,
    limitations: r.limitations || [],
    affiliateVerification: r.affiliateVerification,
    checks: (r.checks || []).map(c => ({
      key: c.key,
      label: c.label,
      status: c.status,
      detail: c.detail,
    })),
    checkedAt: r.fetchedAt || new Date().toISOString(),
  });

  const handleRunDirectEngineTest = async () => {
    const cleanPostUrl = testPostUrlInput.trim() || testAffiliateUrlInput.trim();
    if (!cleanPostUrl) {
      notify('Vui lòng dán Link bài đăng hoặc Link Affiliate cần kiểm thử.', 'warning');
      return;
    }
    setIsRunningDirectTest(true);
    setDirectTestResult(null);
    try {
      const res = await fetch('/api/integrations/link-air-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              url: cleanPostUrl,
              expect: {
                handle: testExpectedHandleInput.replace(/^@/, '').trim() || undefined,
                requiredKeywords: testExpectedBrandInput.trim()
                  ? testExpectedBrandInput
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  : undefined,
                affiliateTargetUrl: testAffiliateUrlInput.trim() || undefined,
                requireProductLink: true,
              },
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.results?.[0]) {
        notify(data?.error || 'Không thể chạy kiểm thử Link.', 'error');
        return;
      }
      setDirectTestResult(mapLinkAirResultToSummary(data.results[0]));
    } catch {
      notify('Lỗi kết nối khi kiểm thử trực tiếp Engine.', 'error');
    } finally {
      setIsRunningDirectTest(false);
    }
  };

  const handleRunAutoCheckItems = async (
    targetIds?: string[],
    overrideItems?: MultiPlatformListingItem[]
  ) => {
    const sourceList = overrideItems || items;
    const targets = sourceList.filter(it => {
      if (targetIds && targetIds.length > 0) {
        return targetIds.includes(it.id) && Boolean(it.postUrl?.trim());
      }
      const inScope =
        it.monthKey === selectedMonth &&
        it.platform === activePlatform &&
        it.brandDecision === 'Yes' &&
        (selectedStore === 'ALL' ||
          it.storeName.trim().toLowerCase() === selectedStore.trim().toLowerCase());
      return inScope && Boolean(it.postUrl?.trim());
    });

    if (targets.length === 0) {
      notify('Chưa có bài đăng nào có Link để quét nghiệm thu tự động.', 'warning');
      return;
    }

    if (targets.length === 1) {
      setCheckingRowId(targets[0].id);
    }
    setIsAutoChecking(true);

    try {
      const payload = {
        items: targets.map(it => ({
          url: it.postUrl!.trim(),
          expect: {
            handle: it.channelHandle.replace(/^@/, '').trim(),
            requiredKeywords: [it.brandName].filter(Boolean),
            affiliateTargetUrl: it.affiliateTargetUrl?.trim() || undefined,
            linkPlacement: it.linkPlacement,
            requireProductLink: true,
          },
        })),
      };

      const res = await fetch('/api/integrations/link-air-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.results) {
        notify(data?.error || 'Không thể kết nối Engine nghiệm thu đa sàn.', 'error');
        return;
      }

      const results: LinkAirResult[] = data.results;
      const resultById = new Map<string, MultiPlatformAutoCheckSummary>();
      const urlsNeedingExtensionDom: string[] = [];

      targets.forEach((t, idx) => {
        const r = results[idx];
        if (r) {
          resultById.set(t.id, mapLinkAirResultToSummary(r));
          const needsDom =
            r.status === 'BLOCKED' ||
            (r.source !== 'EXTENSION_DOM' &&
              !r.hasProductLink &&
              !t.affiliateTargetUrl?.trim() &&
              (t.platform === 'facebook' || t.platform === 'threads'));
          if (needsDom && t.postUrl?.trim()) {
            urlsNeedingExtensionDom.push(t.postUrl.trim());
          }
        }
      });

      if (urlsNeedingExtensionDom.length > 0) {
        const extSynced = await triggerExtensionBatchVerify(urlsNeedingExtensionDom);
        if (extSynced) {
          const retryRes = await fetch('/api/integrations/link-air-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && Array.isArray(retryData?.results)) {
            targets.forEach((t, idx) => {
              const rr = retryData.results[idx];
              if (rr) {
                resultById.set(t.id, mapLinkAirResultToSummary(rr));
              }
            });
          }
        }
      }

      const todayYmd = new Date().toISOString().slice(0, 10);

      setItems(prev =>
        prev.map(it => {
          const summary = resultById.get(it.id);
          if (!summary) return it;

          const nextMetrics = { ...it.platformMetrics };
          if (summary.views != null && summary.views > 0) {
            nextMetrics.viewsCount = summary.views;
          }
          if (summary.likes != null && summary.likes > 0) {
            if (it.platform === 'facebook') {
              nextMetrics.reactionsCount = summary.likes;
            } else {
              nextMetrics.likesCount = summary.likes;
            }
          }
          const combinedInteract = (summary.comments || 0) + (summary.shares || 0);
          if (combinedInteract > 0) {
            if (it.platform === 'threads') {
              nextMetrics.repliesRepostsCount = combinedInteract;
            } else if (it.platform === 'facebook') {
              nextMetrics.commentsSharesCount = combinedInteract;
            }
          }

          // Chỉ đánh dấu đã xác thực Link Affiliate khi Engine thực sự tìm thấy hoặc giải mã thành công (RULE-DATA-01)
          const verifiedLink =
            summary.hasProductLink === true ||
            summary.affiliateVerification?.status === 'PASS';
          const nextAffUrl =
            summary.affiliateVerification?.inputUrl ||
            summary.productUrl ||
            it.affiliateTargetUrl ||
            '';

          const publishedDateYmd =
            summary.publishedAt && summary.publishedAt.length >= 10
              ? summary.publishedAt.slice(0, 10)
              : it.actualPostDate || todayYmd;

          const isLiveValid = summary.status === 'LIVE' && summary.verdict !== 'FAIL';

          return {
            ...it,
            actualPostDate: publishedDateYmd,
            isAffiliateLinkVerified: verifiedLink,
            affiliateTargetUrl: nextAffUrl,
            platformMetrics: nextMetrics,
            autoCheckResult: summary,
            stage: isLiveValid ? 'PAYMENT_READY' : 'APPROVED_EXECUTION',
            paymentStatus: isLiveValid
              ? it.paymentStatus === 'Chờ nghiệm thu'
                ? 'Đủ điều kiện ĐNTT'
                : it.paymentStatus
              : 'Chờ nghiệm thu',
            updatedAt: new Date().toISOString(),
          };
        })
      );

      if (targets.length === 1) {
        const singleTarget = targets[0];
        const singleSummary = resultById.get(singleTarget.id);
        if (singleSummary) {
          setInspectedItem({
            title: `${singleTarget.kocDisplayName} · ${singleTarget.productName}`,
            handle: singleTarget.channelHandle,
            platformLabel: MULTI_PLATFORM_CONFIGS[singleTarget.platform].label,
            postUrl: singleTarget.postUrl || '',
            result: singleSummary,
          });
        }
      }

      const passCount = Array.from(resultById.values()).filter(s => s.status === 'LIVE').length;
      notify(
        `Đã quét nghiệm thu ${resultById.size} bài đăng ${activeConfig.label}: ${passCount}/${resultById.size} bài đang LIVE.`,
        passCount === resultById.size ? 'success' : 'info'
      );
    } catch {
      notify('Lỗi kết nối khi chạy Engine nghiệm thu đa sàn.', 'error');
    } finally {
      setIsAutoChecking(false);
      setCheckingRowId(null);
    }
  };

  const handleRunAutoCheckReups = async (targetIds?: string[]) => {
    const targets = filteredReups.filter(r =>
      targetIds && targetIds.length > 0
        ? targetIds.includes(r.id) && Boolean(r.reupPostUrl?.trim())
        : Boolean(r.reupPostUrl?.trim())
    );
    if (targets.length === 0) {
      notify('Chưa có dòng Reup nào có Link để quét kiểm tra.', 'warning');
      return;
    }

    if (targets.length === 1) {
      setCheckingRowId(targets[0].id);
    }
    setIsAutoChecking(true);

    try {
      const res = await fetch('/api/integrations/link-air-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: targets.map(t => ({ url: t.reupPostUrl.trim() })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.results) {
        notify(data?.error || 'Không thể quét kiểm tra link Reup.', 'error');
        return;
      }

      const results: LinkAirResult[] = data.results;
      const resultById = new Map<string, MultiPlatformAutoCheckSummary>();
      targets.forEach((t, idx) => {
        const r = results[idx];
        if (r) resultById.set(t.id, mapLinkAirResultToSummary(r));
      });

      setReupRecords(prev =>
        prev.map(r => {
          const summary = resultById.get(r.id);
          if (!summary) return r;
          return {
            ...r,
            postedDate:
              summary.publishedAt && summary.publishedAt.length >= 10
                ? summary.publishedAt.slice(0, 10)
                : r.postedDate,
            autoCheckResult: summary,
          };
        })
      );

      const liveCount = Array.from(resultById.values()).filter(s => s.status === 'LIVE').length;
      notify(
        `Đã quét ${resultById.size} link Reup 0đ (${activeConfig.label}): ${liveCount}/${resultById.size} bài đang hiển thị công khai.`,
        liveCount === resultById.size ? 'success' : 'info'
      );
    } catch {
      notify('Lỗi kết nối khi quét kiểm tra link Reup.', 'error');
    } finally {
      setIsAutoChecking(false);
      setCheckingRowId(null);
    }
  };

  const updateItem = (id: string, patch: Partial<MultiPlatformListingItem>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const nextNet = patch.unitNetFee !== undefined ? patch.unitNetFee : it.unitNetFee;
        const nextHandle = patch.channelHandle !== undefined ? patch.channelHandle : it.channelHandle;
        return {
          ...it,
          ...patch,
          unitNetFee: nextNet,
          grossFeeWithTax: computeGrossFromNet(nextNet),
          channelUrl:
            patch.channelHandle !== undefined
              ? buildPlatformChannelUrl(it.platform, nextHandle)
              : it.channelUrl,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const updateItemMetric = (id: string, fieldKey: string, val: string | number) => {
    setItems(prev =>
      prev.map(it =>
        it.id === id
          ? {
              ...it,
              platformMetrics: { ...it.platformMetrics, [fieldKey]: val },
              updatedAt: new Date().toISOString(),
            }
          : it
      )
    );
  };

  const handleAddListingRow = () => {
    const cleanHandle = newRowDraft.channelHandle.trim().replace(/^@/, '');
    if (!cleanHandle) {
      notify('Vui lòng nhập ID kênh hoặc chọn KOC từ danh bạ.', 'warning');
      return;
    }
    const targetStoreName =
      selectedStore === 'ALL'
        ? storesInMonth.find(s => s.hasTarget)?.storeName || stores[0]?.storeName || 'Cathy Doll_Shopee_E2E-C'
        : selectedStore;
    const brandName = targetStoreName.split('_')[0].trim();

    const created: MultiPlatformListingItem = {
      id: `MP-USER-${Date.now()}`,
      monthKey: selectedMonth,
      storeName: targetStoreName,
      brandName,
      platform: activePlatform,
      batchLabel: newRowDraft.batchLabel,
      targetWeek: newRowDraft.targetWeek,
      staffName: currentUserName,
      channelHandle: `@${cleanHandle}`,
      kocDisplayName: newRowDraft.kocDisplayName.trim() || cleanHandle,
      channelUrl: buildPlatformChannelUrl(activePlatform, cleanHandle),
      followersCount: Number(newRowDraft.followersCount) || 0,
      nicheTag: newRowDraft.nicheTag,
      productName: newRowDraft.productName.trim() || `${brandName} Chủ lực`,
      postFormat: newRowDraft.postFormat || activeConfig.formatOptions[0],
      linkPlacement: newRowDraft.linkPlacement || activeConfig.linkPlacementOptions[0],
      unitNetFee: Number(newRowDraft.unitNetFee) || 0,
      grossFeeWithTax: computeGrossFromNet(Number(newRowDraft.unitNetFee) || 0),
      upbaseProposal: 'Recommend',
      brandDecision: 'Chờ duyệt',
      stage: 'LISTING',
      paymentStatus: 'Chờ nghiệm thu',
      platformMetrics: {},
      updatedAt: new Date().toISOString(),
    };

    setItems(prev => [created, ...prev]);
    setIsAddRowModalOpen(false);
    notify(`Đã thêm @${cleanHandle} vào danh sách Listing sàn ${activeConfig.label}.`, 'success');
  };

  const handleApproveAndGenerateBo = () => {
    const codePrefix =
      activePlatform === 'threads'
        ? 'THR'
        : activePlatform === 'facebook'
        ? 'FB'
        : activePlatform === 'shopee'
        ? 'SHP'
        : 'IG';
    const monthDigits = selectedMonth.replace('/', '').slice(-4);
    let count = 0;

    setItems(prev =>
      prev.map((it, idx) => {
        const inScope =
          it.monthKey === selectedMonth &&
          it.platform === activePlatform &&
          (selectedStore === 'ALL' ||
            it.storeName.trim().toLowerCase() === selectedStore.trim().toLowerCase());
        if (!inScope || it.brandDecision !== 'Yes') return it;
        if (it.boCode && it.stage !== 'LISTING') return it;
        count += 1;
        return {
          ...it,
          boCode: it.boCode || `BO${monthDigits}-${codePrefix}-${String(idx + 101).padStart(3, '0')}`,
          stage: 'APPROVED_EXECUTION',
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setWorkspaceMode('ACCEPTANCE');
    notify(
      count > 0
        ? `Đã sinh mã BO cho ${count} bài ${activeConfig.label} được Brand duyệt Yes và chuyển sang màn Nghiệm thu.`
        : `Đang mở bảng Nghiệm thu bài đăng sàn ${activeConfig.label}.`,
      'success'
    );
  };

  const handleAddCustomField = () => {
    const cleanLabel = newFieldLabel.trim();
    if (!cleanLabel) {
      notify('Vui lòng nhập tên trường cần thêm.', 'warning');
      return;
    }
    const key = `custom_${cleanLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36).slice(-3)}`;

    const fieldDef: MultiPlatformFieldDef = {
      key,
      label: cleanLabel,
      type: newFieldType,
      options:
        newFieldType === 'select'
          ? newFieldOptionsText
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : undefined,
      phase: newFieldPhase,
      isCustom: true,
    };

    const next = {
      ...customFieldsByPlatform,
      [activePlatform]: [...(customFieldsByPlatform[activePlatform] || []), fieldDef],
    };
    setCustomFieldsByPlatform(next);
    saveMultiPlatformCustomFields(next);
    setNewFieldLabel('');
    setNewFieldOptionsText('');
    setIsAddFieldModalOpen(false);
    notify(`Đã thêm trường "${cleanLabel}" cho sàn ${activeConfig.label}.`, 'success');
  };

  const handleRemoveCustomField = (fieldKey: string) => {
    const next = {
      ...customFieldsByPlatform,
      [activePlatform]: (customFieldsByPlatform[activePlatform] || []).filter(f => f.key !== fieldKey),
    };
    setCustomFieldsByPlatform(next);
    saveMultiPlatformCustomFields(next);
    notify('Đã xóa trường tùy chỉnh.', 'info');
  };

  const handleBatchPasteAcceptanceLinks = () => {
    const lines = batchPasteText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      notify('Vui lòng dán ít nhất 1 dòng link bài đăng.', 'warning');
      return;
    }

    const matchedIds: string[] = [];
    const todayYmd = new Date().toISOString().slice(0, 10);
    const nextList = [...items];

    for (const line of lines) {
      const urls = line.match(/https?:\/\/[^\s\t]+/gi) || [];
      const postUrl = urls[0] || '';
      const affUrl = urls[1] || '';
      if (!postUrl) continue;

      const detectedPlatform = detectMultiPlatformFromUrl(postUrl) || activePlatform;
      const idx = nextList.findIndex(it => {
        if (it.monthKey !== selectedMonth || it.platform !== detectedPlatform) return false;
        if (
          selectedStore !== 'ALL' &&
          it.storeName.trim().toLowerCase() !== selectedStore.trim().toLowerCase()
        ) {
          return false;
        }
        if (it.brandDecision !== 'Yes') return false;
        const cleanHandle = it.channelHandle.replace(/^@/, '').toLowerCase();
        if (cleanHandle && postUrl.toLowerCase().includes(cleanHandle)) return true;
        if (it.boCode && line.toUpperCase().includes(it.boCode.toUpperCase())) return true;
        return !it.postUrl;
      });

      if (idx >= 0) {
        matchedIds.push(nextList[idx].id);
        nextList[idx] = {
          ...nextList[idx],
          postUrl,
          affiliateTargetUrl: affUrl || nextList[idx].affiliateTargetUrl || 'Đã gắn link Shopee',
          isAffiliateLinkVerified: true,
          actualPostDate: nextList[idx].actualPostDate || todayYmd,
          stage: 'PAYMENT_READY',
          paymentStatus: 'Đủ điều kiện ĐNTT',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    setItems(nextList);
    setBatchPasteText('');
    setIsBatchPasteModalOpen(false);

    if (matchedIds.length > 0) {
      void handleRunAutoCheckItems(matchedIds, nextList);
    } else {
      notify('Không tìm thấy dòng chờ nghiệm thu khớp với link đã dán.', 'warning');
    }
  };

  const handleAddReupRecord = () => {
    if (!newReupDraft.reupPostUrl.trim()) {
      notify('Vui lòng dán link bài đã Reup trên sàn.', 'warning');
      return;
    }
    const targetStoreName =
      selectedStore === 'ALL'
        ? storesInMonth.find(s => s.hasTarget)?.storeName || stores[0]?.storeName || 'Cathy Doll_Shopee_E2E-C'
        : selectedStore;
    const brandName = targetStoreName.split('_')[0].trim();

    const rec: MultiPlatformReupRecord = {
      id: `MP-REUP-USER-${Date.now()}`,
      monthKey: selectedMonth,
      storeName: targetStoreName,
      platform: activePlatform,
      weekCode: newReupDraft.weekCode,
      kocOrSourceName: newReupDraft.kocOrSourceName.trim() || 'Video Kênh Brand / TikTok',
      sourceVideoUrl: newReupDraft.sourceVideoUrl.trim(),
      reupPostUrl: newReupDraft.reupPostUrl.trim(),
      productName: newReupDraft.productName.trim() || `${brandName} Chủ lực`,
      staffName: currentUserName,
      postedDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    setReupRecords(prev => [rec, ...prev]);
    setIsAddReupModalOpen(false);
    setNewReupDraft(prev => ({ ...prev, sourceVideoUrl: '', reupPostUrl: '' }));
    notify(`Đã ghi nhận 1 video Reup 0đ trên sàn ${activeConfig.label}.`, 'success');
  };

  return (
    <div className="space-y-3">
      {/* 1. THANH CHỌN THÁNG, GIAN HÀNG & CHỌN TỪNG SÀN (THREADS / FACEBOOK / SHOPEE / INSTAGRAM) */}
      <Panel>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => onChangeMonth(e.target.value)}
                className="h-8 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink focus:outline-none cursor-pointer"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m} value={m}>
                    Kỳ {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedStore}
                onChange={e => onChangeStore(e.target.value)}
                className="h-8 max-w-[320px] truncate rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả gian hàng ({storesInMonth.filter(s => s.hasTarget).length} gian có Đa sàn)</option>
                {(onlyMultiPlatformStores
                  ? storesInMonth.filter(s => s.hasTarget || s.storeName === selectedStore)
                  : storesInMonth
                ).map(s => (
                  <option key={s.storeName} value={s.storeName}>
                    {s.storeName} {s.summaryText ? `(${s.summaryText})` : ''}
                  </option>
                ))}
              </select>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-sunken px-2.5 py-1 text-2xs font-medium text-ink-2">
                <input
                  type="checkbox"
                  checked={onlyMultiPlatformStores}
                  onChange={e => setOnlyMultiPlatformStores(e.target.checked)}
                />
                <span>Chỉ hiện gian có chỉ tiêu Đa sàn</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                value={workspaceMode}
                onChange={val => setWorkspaceMode(val as WorkspaceMode)}
                items={[
                  {
                    key: 'LISTING',
                    label: `1. Listing & Trình Brand (${storeItems.filter(i => i.platform === activePlatform).length})`,
                  },
                  {
                    key: 'ACCEPTANCE',
                    label: `2. Nghiệm thu bài đăng (${activeQuota.approvedYesQty})`,
                  },
                  {
                    key: 'REUP_TRACKER',
                    label: `3. Video Reup 0đ (${activeQuota.actualReupQty}/${activeQuota.targetReupQty})`,
                  },
                ]}
              />
            </div>
          </div>

          {/* BỘ CHỌN 4 SÀN NGOÀI TIKTOK (MỖI SÀN HIỂN THỊ RÕ CHỈ TIÊU 4.1.1 & TIẾN ĐỘ) */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_ORDER.map(pk => {
              const cfg = MULTI_PLATFORM_CONFIGS[pk];
              const q = quotasByPlatform[pk];
              const isSelected = activePlatform === pk;
              const customCount = (customFieldsByPlatform[pk] || []).length;

              return (
                <button
                  key={pk}
                  type="button"
                  onClick={() => setActivePlatform(pk)}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-sunken ring-1 ring-accent'
                      : 'border-line bg-surface hover:bg-sunken/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">{cfg.label}</span>
                    <Status
                      tone={
                        q.targetAffQty > 0 && q.acceptedQty >= q.targetAffQty
                          ? 'positive'
                          : q.targetAffQty > 0 || q.targetBudgetNet > 0
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {q.targetAffQty > 0
                        ? `${q.listedQty}/${q.targetAffQty} bài`
                        : q.targetReupQty > 0
                        ? `${q.actualReupQty}/${q.targetReupQty} Reup`
                        : `${q.listedQty} bài`}
                    </Status>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-2xs">
                    <div className="rounded border border-line bg-surface px-2 py-1">
                      <span className="block text-ink-3">Ngân sách 4.1.1</span>
                      <strong className="font-mono text-ink">
                        {q.targetBudgetNet > 0 ? `${fmt(q.targetBudgetNet)}đ` : '0đ'}
                      </strong>
                    </div>
                    <div className="rounded border border-line bg-surface px-2 py-1">
                      <span className="block text-ink-3">Duyệt Yes · Đã đăng</span>
                      <strong className="font-mono text-ink">
                        {q.approvedYesQty} Yes · {q.acceptedQty} Air
                      </strong>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-2xs text-ink-3">
                    <span>Đơn giá: {cfg.priceRangeLabel.split(' ')[0]}</span>
                    <span>
                      { listingColumns.length + acceptanceColumns.length } trường
                      {customCount > 0 ? ` (+${customCount})` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* 2. HÀNG CHỈ SỐ ĐỐI SOÁT CỦA SÀN ĐANG CHỌN */}
      <StatRow>
        <Stat
          label={`Chỉ tiêu ${activeConfig.label} (4.1 & 4.1.1)`}
          value={`${fmt(activeQuota.targetAffQty)} bài · ${fmt(activeQuota.targetBudgetNet)}đ`}
        />
        <Stat
          label={`Đã Listing trên ${activeConfig.label}`}
          value={`${fmt(activeQuota.listedQty)} KOC · ${fmt(activeQuota.listedBudgetNet)}đ`}
        />
        <Stat
          label="Brand đã chọn (Yes)"
          value={`${fmt(activeQuota.approvedYesQty)} bài · ${fmt(activeQuota.approvedYesBudgetNet)}đ`}
        />
        <Stat
          label="Đã nghiệm thu bài đăng"
          value={`${fmt(activeQuota.acceptedQty)} bài · Reup 0đ: ${fmt(activeQuota.actualReupQty)}/${fmt(activeQuota.targetReupQty)}`}
        />
      </StatRow>

      {/* 3. THANH CÔNG CỤ THEO TỪNG SÀN */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Tìm KOC, sản phẩm, mã BO trên ${activeConfig.label}...`}
                className="h-8 w-64 rounded-lg border border-line bg-surface pl-8 pr-3 text-xs text-ink focus:outline-none"
              />
            </div>

            {workspaceMode === 'LISTING' && (
              <select
                value={decisionFilter}
                onChange={e => setDecisionFilter(e.target.value)}
                className="h-8 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả kết quả Brand</option>
                {BRAND_DECISION_OPTIONS.map(d => (
                  <option key={d} value={d}>
                    Brand chọn: {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsAddFieldModalOpen(true)}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>+ Thêm trường cho {activeConfig.label}</span>
            </Button>

            {workspaceMode === 'LISTING' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleApproveAndGenerateBo}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Chuyển dòng Yes sang Nghiệm thu ({activeQuota.approvedYesQty})</span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setNewRowDraft(prev => ({
                      ...prev,
                      postFormat: activeConfig.formatOptions[0],
                      linkPlacement: activeConfig.linkPlacementOptions[0],
                      unitNetFee: activeConfig.defaultUnitNet,
                    }));
                    setIsAddRowModalOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Thêm KOC {activeConfig.label}</span>
                </Button>
              </>
            )}

            {workspaceMode === 'ACCEPTANCE' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsTestEngineModalOpen(true)}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Kiểm thử Link trực tiếp</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsBatchPasteModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Dán nhanh Link bài đăng {activeConfig.label}</span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={isAutoChecking}
                  onClick={() => void handleRunAutoCheckItems()}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isAutoChecking ? 'animate-spin' : ''}`} />
                  <span>
                    {isAutoChecking
                      ? `Đang quét ${activeConfig.shortLabel}...`
                      : `Quét & Nghiệm thu tự động (${
                          filteredPlatformItems.filter(i => Boolean(i.postUrl?.trim())).length
                        })`}
                  </span>
                </Button>
              </>
            )}

            {workspaceMode === 'REUP_TRACKER' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isAutoChecking}
                  onClick={() => void handleRunAutoCheckReups()}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isAutoChecking ? 'animate-spin' : ''}`} />
                  <span>
                    {isAutoChecking
                      ? 'Đang quét Reup...'
                      : `Quét kiểm tra Link Reup (${filteredReups.length})`}
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddReupModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Ghi nhận Link Reup 0đ</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* HIỂN THỊ DANH SÁCH TRƯỜNG TÙY CHỈNH NẾU CÓ */}
        {activeCustomFields.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 py-2 border-b border-line text-2xs">
            <span className="font-semibold text-ink-2">Trường mở rộng của {activeConfig.label}:</span>
            {activeCustomFields.map(cf => (
              <span
                key={cf.key}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-2 py-0.5 text-ink"
              >
                <span>{cf.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(cf.key)}
                  className="text-ink-3 hover:text-ink cursor-pointer"
                  title="Xóa trường này"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* CHẾ ĐỘ 1: BẢNG LISTING & TRÌNH BRAND THEO TỪNG SÀN */}
        {workspaceMode === 'LISTING' && (
          <div className="overflow-x-auto pt-2">
            {filteredPlatformItems.length === 0 ? (
              <EmptyState
                title={`Chưa có KOC nào trong danh sách Listing ${activeConfig.label}`}
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsAddRowModalOpen(true)}
                  >
                    + Thêm KOC {activeConfig.label}
                  </Button>
                }
              />
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-sunken text-left text-2xs font-semibold text-ink-2">
                    <th className="px-2.5 py-2">Đợt · Tuần</th>
                    {selectedStore === 'ALL' && <th className="px-2.5 py-2">Gian hàng</th>}
                    <th className="px-2.5 py-2">{activeConfig.channelHandleLabel}</th>
                    <th className="px-2.5 py-2 text-right">Follower</th>
                    <th className="px-2.5 py-2">Sản phẩm (SKU)</th>
                    <th className="px-2.5 py-2">Định dạng bài đăng {activeConfig.shortLabel}</th>
                    <th className="px-2.5 py-2">Vị trí gắn Link / Giỏ</th>
                    {listingColumns.map(col => (
                      <th key={col.key} className="px-2.5 py-2">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-2.5 py-2 text-right">Giá Net trọn gói</th>
                    <th className="px-2.5 py-2 text-right">Phí kèm thuế</th>
                    <th className="px-2.5 py-2">Đề xuất</th>
                    <th className="px-2.5 py-2">Brand chọn</th>
                    <th className="px-2 py-2 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPlatformItems.map(item => (
                    <tr key={item.id} className="hover:bg-sunken/50">
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <select
                            value={item.batchLabel}
                            onChange={e => updateItem(item.id, { batchLabel: e.target.value })}
                            className="h-7 rounded border border-line bg-surface px-1.5 text-2xs font-medium text-ink"
                          >
                            {BATCH_OPTIONS.map(b => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.targetWeek}
                            onChange={e => updateItem(item.id, { targetWeek: e.target.value })}
                            className="h-7 w-12 rounded border border-line bg-surface px-1.5 text-center font-mono text-2xs text-ink"
                          />
                        </div>
                      </td>

                      {selectedStore === 'ALL' && (
                        <td className="px-2.5 py-1.5 font-medium text-ink max-w-[160px] truncate" title={item.storeName}>
                          {item.storeName}
                        </td>
                      )}

                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div>
                            <div className="font-semibold text-ink">{item.kocDisplayName}</div>
                            <div className="flex items-center gap-1 text-2xs text-ink-3 font-mono">
                              <span>{item.channelHandle}</span>
                              {item.channelUrl && (
                                <a
                                  href={item.channelUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-accent hover:underline inline-flex items-center"
                                  title="Mở kênh trên sàn"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-ink-2">
                        {fmt(item.followersCount)}
                      </td>

                      <td className="px-2.5 py-1.5">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={e => updateItem(item.id, { productName: e.target.value })}
                          className="h-7 w-36 rounded border border-line bg-surface px-2 text-xs text-ink"
                        />
                      </td>

                      <td className="px-2.5 py-1.5">
                        <select
                          value={item.postFormat}
                          onChange={e => updateItem(item.id, { postFormat: e.target.value })}
                          className="h-7 w-44 rounded border border-line bg-surface px-1.5 text-2xs text-ink"
                        >
                          {activeConfig.formatOptions.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2.5 py-1.5">
                        <select
                          value={item.linkPlacement}
                          onChange={e => updateItem(item.id, { linkPlacement: e.target.value })}
                          className="h-7 w-44 rounded border border-line bg-surface px-1.5 text-2xs text-ink"
                        >
                          {activeConfig.linkPlacementOptions.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {listingColumns.map(col => {
                        const rawVal = item.platformMetrics[col.key] ?? '';
                        return (
                          <td key={col.key} className="px-2.5 py-1.5">
                            {col.type === 'select' && col.options ? (
                              <select
                                value={String(rawVal)}
                                onChange={e => updateItemMetric(item.id, col.key, e.target.value)}
                                className="h-7 w-36 rounded border border-line bg-surface px-1.5 text-2xs text-ink"
                              >
                                <option value="">— Chọn —</option>
                                {col.options.map(o => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={rawVal}
                                placeholder={col.placeholder || '—'}
                                onChange={e =>
                                  updateItemMetric(
                                    item.id,
                                    col.key,
                                    col.type === 'number' ? Number(e.target.value) || 0 : e.target.value
                                  )
                                }
                                className="h-7 w-28 rounded border border-line bg-surface px-2 text-right font-mono text-xs text-ink"
                              />
                            )}
                          </td>
                        );
                      })}

                      <td className="px-2.5 py-1.5 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.unitNetFee ? fmt(item.unitNetFee) : '0'}
                          onChange={e => {
                            const digits = e.target.value.replace(/[^\d]/g, '');
                            updateItem(item.id, { unitNetFee: digits ? parseInt(digits, 10) : 0 });
                          }}
                          className="h-7 w-28 rounded border border-line bg-surface px-2 text-right font-mono font-semibold text-ink"
                        />
                      </td>

                      <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-ink-2">
                        {fmt(item.grossFeeWithTax)}đ
                      </td>

                      <td className="px-2.5 py-1.5">
                        <select
                          value={item.upbaseProposal}
                          onChange={e =>
                            updateItem(item.id, {
                              upbaseProposal: e.target.value as MultiPlatformListingItem['upbaseProposal'],
                            })
                          }
                          className="h-7 rounded border border-line bg-surface px-1.5 text-2xs font-medium text-ink"
                        >
                          {PROPOSAL_OPTIONS.map(p => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2.5 py-1.5">
                        <select
                          value={item.brandDecision}
                          onChange={e => {
                            const nextDec = e.target.value as MultiPlatformBrandDecision;
                            const codePrefix =
                              activePlatform === 'threads'
                                ? 'THR'
                                : activePlatform === 'facebook'
                                ? 'FB'
                                : activePlatform === 'shopee'
                                ? 'SHP'
                                : 'IG';
                            const monthDigits = selectedMonth.replace('/', '').slice(-4);
                            updateItem(item.id, {
                              brandDecision: nextDec,
                              boCode:
                                nextDec === 'Yes' && !item.boCode
                                  ? `BO${monthDigits}-${codePrefix}-${String(Math.floor(Math.random() * 899) + 100)}`
                                  : item.boCode,
                              stage: nextDec === 'Yes' ? 'APPROVED_EXECUTION' : 'LISTING',
                            });
                          }}
                          className={`h-7 rounded border px-2 text-2xs font-semibold ${
                            item.brandDecision === 'Yes'
                              ? 'border-line-strong bg-sunken text-ink'
                              : 'border-line bg-surface text-ink-2'
                          }`}
                        >
                          {BRAND_DECISION_OPTIONS.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))}
                          className="p-1 text-ink-3 hover:text-ink cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CHẾ ĐỘ 2: BẢNG NGHIỆM THU BÀI ĐĂNG & ĐNTT (KHÔNG KÈM ASSET PHỤ CỦA TIKTOK) */}
        {workspaceMode === 'ACCEPTANCE' && (
          <div className="overflow-x-auto pt-2">
            {filteredPlatformItems.length === 0 ? (
              <EmptyState
                title={`Chưa có bài đăng ${activeConfig.label} nào ở trạng thái Brand duyệt Yes`}
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setWorkspaceMode('LISTING')}
                  >
                    Quay lại bảng Listing để duyệt Yes
                  </Button>
                }
              />
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-sunken text-left text-2xs font-semibold text-ink-2">
                    <th className="px-2.5 py-2">Mã BO · Tuần</th>
                    {selectedStore === 'ALL' && <th className="px-2.5 py-2">Gian hàng</th>}
                    <th className="px-2.5 py-2">KOC · Kênh {activeConfig.shortLabel}</th>
                    <th className="px-2.5 py-2">Sản phẩm · Định dạng</th>
                    <th className="px-2.5 py-2 text-right">Giá Net trọn gói</th>
                    <th className="px-2.5 py-2">Ngày đăng thực tế</th>
                    <th className="px-2.5 py-2">Link bài đăng trên {activeConfig.shortLabel}</th>
                    <th className="px-2.5 py-2">Kiểm tra tự động</th>
                    <th className="px-2.5 py-2">Link Shopee Affiliate / Giỏ hàng</th>
                    {acceptanceColumns.map(col => (
                      <th key={col.key} className="px-2.5 py-2 text-right">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-2.5 py-2">Trạng thái ĐNTT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPlatformItems.map(item => (
                    <tr key={item.id} className="hover:bg-sunken/50">
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <div className="font-mono font-semibold text-ink">
                          {item.boCode || 'Chưa cấp BO'}
                        </div>
                        <div className="text-2xs text-ink-3 font-mono">{item.targetWeek}</div>
                      </td>

                      {selectedStore === 'ALL' && (
                        <td className="px-2.5 py-1.5 font-medium text-ink max-w-[150px] truncate" title={item.storeName}>
                          {item.storeName}
                        </td>
                      )}

                      <td className="px-2.5 py-1.5">
                        <div className="font-semibold text-ink">{item.kocDisplayName}</div>
                        <div className="text-2xs font-mono text-ink-3">{item.channelHandle}</div>
                      </td>

                      <td className="px-2.5 py-1.5">
                        <div className="font-medium text-ink">{item.productName}</div>
                        <div className="text-2xs text-ink-3">{item.postFormat}</div>
                      </td>

                      <td className="px-2.5 py-1.5 text-right font-mono font-semibold tabular-nums text-ink">
                        {fmt(item.unitNetFee)}đ
                      </td>

                      <td className="px-2.5 py-1.5">
                        <input
                          type="date"
                          value={item.actualPostDate || item.plannedPostDate || ''}
                          onChange={e => updateItem(item.id, { actualPostDate: e.target.value })}
                          className="h-7 rounded border border-line bg-surface px-2 font-mono text-2xs text-ink"
                        />
                        {item.autoCheckResult?.airedAtVn && (
                          <div className="text-2xs font-mono text-ink-3 mt-0.5">
                            {item.autoCheckResult.airedAtVn}
                          </div>
                        )}
                      </td>

                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={item.postUrl || ''}
                            placeholder={`Dán link ${activeConfig.shortLabel}...`}
                            onChange={e => {
                              const val = e.target.value.trim();
                              updateItem(item.id, {
                                postUrl: val,
                                actualPostDate:
                                  val && !item.actualPostDate
                                    ? new Date().toISOString().slice(0, 10)
                                    : item.actualPostDate,
                                stage: val ? 'ACCEPTED' : 'APPROVED_EXECUTION',
                                paymentStatus:
                                  val && item.paymentStatus === 'Chờ nghiệm thu'
                                    ? 'Đủ điều kiện ĐNTT'
                                    : item.paymentStatus,
                              });
                            }}
                            className="h-7 w-40 rounded border border-line bg-surface px-2 font-mono text-2xs text-ink"
                          />
                          {item.postUrl && (
                            <>
                              <button
                                type="button"
                                disabled={isAutoChecking}
                                onClick={() => void handleRunAutoCheckItems([item.id])}
                                className="inline-flex h-7 items-center gap-1 rounded border border-line bg-surface px-1.5 text-2xs font-semibold text-ink hover:bg-sunken cursor-pointer"
                                title="Quét kiểm tra bài đăng trên sàn"
                              >
                                <RefreshCw
                                  className={`h-3 w-3 ${
                                    checkingRowId === item.id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>Quét</span>
                              </button>
                              <a
                                href={item.postUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent hover:underline"
                                title="Mở bài đăng thực tế"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        {item.autoCheckResult ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedItem({
                                title: `${item.kocDisplayName} · ${item.productName}`,
                                handle: item.channelHandle,
                                platformLabel: MULTI_PLATFORM_CONFIGS[item.platform].label,
                                postUrl: item.postUrl || '',
                                result: item.autoCheckResult!,
                              });
                              setInspectModalOpen(true);
                            }}
                            className="inline-flex flex-col items-start gap-0.5 text-left cursor-pointer hover:opacity-85"
                            title="Bấm xem chi tiết 5 tiêu chí nghiệm thu tự động"
                          >
                            <Status
                              tone={
                                item.autoCheckResult.status === 'LIVE' &&
                                item.autoCheckResult.verdict === 'PASS'
                                  ? 'positive'
                                  : item.autoCheckResult.status === 'LIVE'
                                  ? 'warning'
                                  : 'critical'
                              }
                            >
                              {item.autoCheckResult.status === 'LIVE' &&
                              item.autoCheckResult.verdict === 'PASS'
                                ? 'LIVE · Đạt chuẩn'
                                : item.autoCheckResult.status === 'LIVE'
                                ? 'LIVE · Cần rà soát'
                                : item.autoCheckResult.status === 'UNAVAILABLE'
                                ? 'Bài đã ẩn / xóa'
                                : item.autoCheckResult.status === 'BLOCKED'
                                ? 'Chặn đăng nhập'
                                : 'Lỗi định dạng'}
                            </Status>
                            <span className="text-2xs text-accent underline">
                              Xem {item.autoCheckResult.checks.length} tiêu chí
                            </span>
                          </button>
                        ) : item.postUrl ? (
                          <button
                            type="button"
                            disabled={isAutoChecking}
                            onClick={() => void handleRunAutoCheckItems([item.id])}
                            className="text-2xs font-medium text-accent hover:underline cursor-pointer"
                          >
                            Bấm quét kiểm tra
                          </button>
                        ) : (
                          <span className="text-2xs text-ink-3">Chưa có link</span>
                        )}
                      </td>

                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={Boolean(item.isAffiliateLinkVerified)}
                            onChange={e =>
                              updateItem(item.id, { isAffiliateLinkVerified: e.target.checked })
                            }
                            title="Xác nhận KOC đã gắn đúng Link Shopee Affiliate / Giỏ cam"
                          />
                          <input
                            type="text"
                            value={item.affiliateTargetUrl || ''}
                            placeholder={item.linkPlacement}
                            onChange={e =>
                              updateItem(item.id, {
                                affiliateTargetUrl: e.target.value,
                                isAffiliateLinkVerified: Boolean(e.target.value.trim()),
                              })
                            }
                            className="h-7 w-40 rounded border border-line bg-surface px-2 text-2xs text-ink"
                          />
                        </div>
                      </td>

                      {acceptanceColumns.map(col => {
                        const rawVal = item.platformMetrics[col.key] ?? '';
                        return (
                          <td key={col.key} className="px-2.5 py-1.5 text-right">
                            <input
                              type={col.type === 'number' ? 'number' : 'text'}
                              value={rawVal}
                              placeholder={col.placeholder || '0'}
                              onChange={e =>
                                updateItemMetric(
                                  item.id,
                                  col.key,
                                  col.type === 'number' ? Number(e.target.value) || 0 : e.target.value
                                )
                              }
                              className="h-7 w-24 rounded border border-line bg-surface px-2 text-right font-mono text-xs text-ink"
                            />
                          </td>
                        );
                      })}

                      <td className="px-2.5 py-1.5">
                        <select
                          value={item.paymentStatus}
                          onChange={e => {
                            const nextPay = e.target.value as MultiPlatformListingItem['paymentStatus'];
                            updateItem(item.id, {
                              paymentStatus: nextPay,
                              stage:
                                nextPay === 'Đã thanh toán'
                                  ? 'PAID'
                                  : nextPay === 'Đủ điều kiện ĐNTT' || nextPay === 'Đã lập ĐNTT'
                                  ? 'PAYMENT_READY'
                                  : 'APPROVED_EXECUTION',
                            });
                          }}
                          className="h-7 rounded border border-line bg-surface px-2 text-2xs font-semibold text-ink"
                        >
                          {PAYMENT_STATUS_OPTIONS.map(st => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CHẾ ĐỘ 3: SỔ THEO DÕI VIDEO REUP 0Đ THEO TUẦN */}
        {workspaceMode === 'REUP_TRACKER' && (
          <div className="overflow-x-auto pt-2">
            {filteredReups.length === 0 ? (
              <EmptyState
                title={`Chưa có bản ghi Video Reup 0đ trên sàn ${activeConfig.label}`}
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsAddReupModalOpen(true)}
                  >
                    + Ghi nhận Link Reup 0đ
                  </Button>
                }
              />
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-sunken text-left text-2xs font-semibold text-ink-2">
                    <th className="px-3 py-2">Tuần 4.1.1</th>
                    {selectedStore === 'ALL' && <th className="px-3 py-2">Gian hàng</th>}
                    <th className="px-3 py-2">Nguồn video gốc (KOC / Kênh Brand)</th>
                    <th className="px-3 py-2">Sản phẩm</th>
                    <th className="px-3 py-2">Link video gốc</th>
                    <th className="px-3 py-2">Link đã đăng Reup ({activeConfig.shortLabel})</th>
                    <th className="px-3 py-2">Trạng thái bài Reup</th>
                    <th className="px-3 py-2">Người thực hiện · Ngày đăng</th>
                    <th className="px-2 py-2 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredReups.map(r => (
                    <tr key={r.id} className="hover:bg-sunken/50">
                      <td className="px-3 py-2 font-mono font-semibold text-ink">{r.weekCode}</td>
                      {selectedStore === 'ALL' && (
                        <td className="px-3 py-2 font-medium text-ink">{r.storeName}</td>
                      )}
                      <td className="px-3 py-2 font-medium text-ink">{r.kocOrSourceName}</td>
                      <td className="px-3 py-2 text-ink-2">{r.productName}</td>
                      <td className="px-3 py-2 font-mono text-2xs text-ink-2 max-w-[220px] truncate">
                        {r.sourceVideoUrl || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-2xs">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={r.reupPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline inline-flex items-center gap-1"
                          >
                            <span className="max-w-[220px] truncate">{r.reupPostUrl}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <button
                            type="button"
                            disabled={isAutoChecking}
                            onClick={() => void handleRunAutoCheckReups([r.id])}
                            className="inline-flex h-6 items-center gap-1 rounded border border-line bg-surface px-1.5 text-2xs font-medium text-ink hover:bg-sunken cursor-pointer"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${checkingRowId === r.id ? 'animate-spin' : ''}`}
                            />
                            <span>Quét</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.autoCheckResult ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedItem({
                                title: `Reup 0đ · ${r.productName}`,
                                handle: r.kocOrSourceName,
                                platformLabel: MULTI_PLATFORM_CONFIGS[r.platform].label,
                                postUrl: r.reupPostUrl,
                                result: r.autoCheckResult!,
                              });
                              setInspectModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Status
                              tone={
                                r.autoCheckResult.status === 'LIVE'
                                  ? 'positive'
                                  : r.autoCheckResult.status === 'BLOCKED'
                                  ? 'warning'
                                  : 'critical'
                              }
                            >
                              {r.autoCheckResult.status === 'LIVE'
                                ? 'Đang hiển thị'
                                : r.autoCheckResult.status === 'UNAVAILABLE'
                                ? 'Bài đã ẩn / xóa'
                                : 'Cần kiểm tra'}
                            </Status>
                          </button>
                        ) : (
                          <span className="text-2xs text-ink-3">Chưa quét</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-2xs text-ink-2">
                        {r.staffName} · <span className="font-mono">{r.postedDate}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setReupRecords(prev => prev.filter(x => x.id !== r.id))}
                          className="p-1 text-ink-3 hover:text-ink cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Panel>

      {/* HỘP THOẠI 1: THÊM KOC LÊN SÀN ĐANG CHỌN */}
      <Modal
        open={isAddRowModalOpen}
        onClose={() => setIsAddRowModalOpen(false)}
        title={`Thêm KOC Listing trên sàn ${activeConfig.label}`}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddRowModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleAddListingRow}>
              Thêm vào bảng {activeConfig.label}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Chọn nhanh từ Danh bạ KOC (Tùy chọn)">
            <Select
              value=""
              onChange={e => {
                const picked = kocs.find(k => k.id === e.target.value);
                if (picked) {
                  setNewRowDraft(prev => ({
                    ...prev,
                    channelHandle: (picked.channelId || '').replace(/^@/, ''),
                    kocDisplayName: picked.stageName,
                    followersCount: picked.followers || 25000,
                    nicheTag: picked.tepKenh || 'Beauty',
                  }));
                }
              }}
            >
              <option value="">— Chọn từ danh bạ 5.020 KOC hoặc tự nhập bên dưới —</option>
              {kocs.slice(0, 60).map(k => (
                <option key={k.id} value={k.id}>
                  {k.stageName} ({k.channelId}) · {fmt(k.followers)} flw
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={activeConfig.channelHandleLabel}>
              <Input
                value={newRowDraft.channelHandle}
                onChange={e => setNewRowDraft(prev => ({ ...prev, channelHandle: e.target.value }))}
                placeholder="VD: beauty.review.vn"
              />
            </Field>
            <Field label="Tên hiển thị KOC / Fanpage">
              <Input
                value={newRowDraft.kocDisplayName}
                onChange={e => setNewRowDraft(prev => ({ ...prev, kocDisplayName: e.target.value }))}
                placeholder="VD: Minh Anh Review"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Follower trên sàn">
              <Input
                type="number"
                value={newRowDraft.followersCount}
                onChange={e =>
                  setNewRowDraft(prev => ({ ...prev, followersCount: Number(e.target.value) || 0 }))
                }
              />
            </Field>
            <Field label="Đợt Listing">
              <Select
                value={newRowDraft.batchLabel}
                onChange={e => setNewRowDraft(prev => ({ ...prev, batchLabel: e.target.value }))}
              >
                {BATCH_OPTIONS.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tuần dự kiến (4.1.1)">
              <Input
                value={newRowDraft.targetWeek}
                onChange={e => setNewRowDraft(prev => ({ ...prev, targetWeek: e.target.value }))}
                placeholder="W46"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Sản phẩm (SKU)">
              <Input
                value={newRowDraft.productName}
                onChange={e => setNewRowDraft(prev => ({ ...prev, productName: e.target.value }))}
                placeholder="Nhập tên sản phẩm"
              />
            </Field>
            <Field label="Giá Net trọn gói (VND)">
              <Input
                type="number"
                value={newRowDraft.unitNetFee}
                onChange={e =>
                  setNewRowDraft(prev => ({ ...prev, unitNetFee: Number(e.target.value) || 0 }))
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Định dạng bài đăng">
              <Select
                value={newRowDraft.postFormat}
                onChange={e => setNewRowDraft(prev => ({ ...prev, postFormat: e.target.value }))}
              >
                {activeConfig.formatOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vị trí gắn Link / Giỏ hàng">
              <Select
                value={newRowDraft.linkPlacement}
                onChange={e => setNewRowDraft(prev => ({ ...prev, linkPlacement: e.target.value }))}
              >
                {activeConfig.linkPlacementOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      {/* HỘP THOẠI 2: THÊM TRƯỜNG MỚI CHO SÀN ĐANG CHỌN */}
      <Modal
        open={isAddFieldModalOpen}
        onClose={() => setIsAddFieldModalOpen(false)}
        title={`Thêm trường quản lý mới cho sàn ${activeConfig.label}`}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddFieldModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleAddCustomField}>
              Lưu trường mới
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Tên cột / Trường thông tin">
            <Input
              value={newFieldLabel}
              onChange={e => setNewFieldLabel(e.target.value)}
              placeholder="VD: Sub_id Affiliate, Nhóm Cộng đồng, Lượt Save bài..."
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Kiểu dữ liệu">
              <Select
                value={newFieldType}
                onChange={e =>
                  setNewFieldType(e.target.value as 'text' | 'number' | 'select' | 'url')
                }
              >
                <option value="text">Chữ / Văn bản</option>
                <option value="number">Con số (Đếm chỉ số / Tiền)</option>
                <option value="select">Danh sách lựa chọn</option>
                <option value="url">Đường dẫn (Link)</option>
              </Select>
            </Field>

            <Field label="Hiển thị ở giai đoạn nào">
              <Select
                value={newFieldPhase}
                onChange={e =>
                  setNewFieldPhase(e.target.value as 'LISTING' | 'ACCEPTANCE' | 'BOTH')
                }
              >
                <option value="LISTING">Chỉ ở bảng Listing</option>
                <option value="ACCEPTANCE">Chỉ ở bảng Nghiệm thu</option>
                <option value="BOTH">Cả Listing và Nghiệm thu</option>
              </Select>
            </Field>
          </div>

          {newFieldType === 'select' && (
            <Field label="Các lựa chọn (Ngăn cách bằng dấu phẩy)">
              <Input
                value={newFieldOptionsText}
                onChange={e => setNewFieldOptionsText(e.target.value)}
                placeholder="VD: Nhóm Mẹ Bỉm, Nhóm Làm Đẹp, Nhóm Sinh Viên"
              />
            </Field>
          )}
        </div>
      </Modal>

      {/* HỘP THOẠI 3: DÁN NHANH LINK BÀI ĐĂNG ĐỂ NGHIỆM THU */}
      <Modal
        open={isBatchPasteModalOpen}
        onClose={() => setIsBatchPasteModalOpen(false)}
        title={`Dán nhanh Link bài đăng nghiệm thu (${activeConfig.label})`}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsBatchPasteModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleBatchPasteAcceptanceLinks}>
              Ghép Link &amp; Nghiệm thu
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Dán danh sách Link bài đăng (Mỗi dòng 1 bài, có thể kèm mã BO hoặc Link Shopee Affiliate)">
            <Textarea
              rows={6}
              value={batchPasteText}
              onChange={e => setBatchPasteText(e.target.value)}
              placeholder={`https://www.threads.net/@creator/post/C_abc123 https://s.shopee.vn/xyz\nhttps://www.facebook.com/reel/123456789`}
            />
          </Field>
        </div>
      </Modal>

      {/* HỘP THOẠI 4: GHI NHẬN VIDEO REUP 0Đ */}
      <Modal
        open={isAddReupModalOpen}
        onClose={() => setIsAddReupModalOpen(false)}
        title={`Ghi nhận Video Reup 0đ trên sàn ${activeConfig.label}`}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddReupModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleAddReupRecord}>
              Lưu bản ghi Reup
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tuần 4.1.1">
              <Input
                value={newReupDraft.weekCode}
                onChange={e => setNewReupDraft(prev => ({ ...prev, weekCode: e.target.value }))}
                placeholder="W46"
              />
            </Field>
            <Field label="Sản phẩm">
              <Input
                value={newReupDraft.productName}
                onChange={e => setNewReupDraft(prev => ({ ...prev, productName: e.target.value }))}
                placeholder="Tên sản phẩm"
              />
            </Field>
          </div>
          <Field label="Tên KOC hoặc Nguồn video gốc">
            <Input
              value={newReupDraft.kocOrSourceName}
              onChange={e => setNewReupDraft(prev => ({ ...prev, kocOrSourceName: e.target.value }))}
              placeholder="VD: Video TikTok @koc.handle"
            />
          </Field>
          <Field label="Link video gốc (TikTok / Kênh Brand)">
            <Input
              value={newReupDraft.sourceVideoUrl}
              onChange={e => setNewReupDraft(prev => ({ ...prev, sourceVideoUrl: e.target.value }))}
              placeholder="https://www.tiktok.com/@.../video/..."
            />
          </Field>
          <Field label={`Link đã đăng Reup trên ${activeConfig.label}`}>
            <Input
              value={newReupDraft.reupPostUrl}
              onChange={e => setNewReupDraft(prev => ({ ...prev, reupPostUrl: e.target.value }))}
              placeholder={`${activeConfig.channelUrlPrefix}...`}
            />
          </Field>
        </div>
      </Modal>

      {/* HỘP THOẠI 5: KẾT QUẢ QUÉT & NGHIỆM THU BÀI ĐĂNG ĐA SÀN */}
      <Modal
        open={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={
          inspectedItem
            ? `Chi tiết Nghiệm thu · ${inspectedItem.platformLabel}`
            : 'Chi tiết Nghiệm thu bài đăng'
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setInspectModalOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        {inspectedItem && (
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-line bg-sunken p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{inspectedItem.title}</span>
                <Status
                  tone={
                    inspectedItem.result.status === 'LIVE' &&
                    inspectedItem.result.verdict === 'PASS'
                      ? 'positive'
                      : inspectedItem.result.status === 'LIVE'
                      ? 'warning'
                      : 'critical'
                  }
                >
                  {inspectedItem.result.status === 'LIVE' &&
                  inspectedItem.result.verdict === 'PASS'
                    ? 'LIVE · Đạt nghiệm thu'
                    : inspectedItem.result.status === 'LIVE'
                    ? 'LIVE · Cần rà soát'
                    : inspectedItem.result.status === 'UNAVAILABLE'
                    ? 'Bài đã ẩn / xóa'
                    : inspectedItem.result.status === 'BLOCKED'
                    ? 'Chặn tường đăng nhập'
                    : 'Link không hợp lệ'}
                </Status>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-2">
                <span>
                  Nguồn thu thập:{' '}
                  <strong className="font-mono text-ink">{inspectedItem.result.source}</strong>
                </span>
                <span>
                  Kênh kỳ vọng: <strong className="font-mono text-ink">{inspectedItem.handle}</strong>
                </span>
                {inspectedItem.result.authorHandle && (
                  <span>
                    Kênh thực tế:{' '}
                    <strong className="font-mono text-ink">
                      @{inspectedItem.result.authorHandle}
                    </strong>
                  </span>
                )}
                {inspectedItem.result.airedAtVn && (
                  <span>
                    Giờ lên bài:{' '}
                    <strong className="font-mono text-ink">{inspectedItem.result.airedAtVn}</strong>
                  </span>
                )}
              </div>

              {inspectedItem.postUrl && (
                <div className="pt-1">
                  <a
                    href={inspectedItem.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-2xs text-accent hover:underline break-all"
                  >
                    <span>{inspectedItem.postUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {inspectedItem.result.affiliateVerification && (
              <div className="rounded-lg border border-line bg-surface p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-semibold text-ink">
                    Giải mã & Xác thực Link Affiliate đích ({inspectedItem.result.affiliateVerification.platform})
                  </span>
                  <Status
                    tone={
                      inspectedItem.result.affiliateVerification.status === 'PASS'
                        ? 'positive'
                        : inspectedItem.result.affiliateVerification.status === 'WARN'
                        ? 'warning'
                        : 'critical'
                    }
                  >
                    {inspectedItem.result.affiliateVerification.status === 'PASS'
                      ? 'Có Tracking Affiliate'
                      : inspectedItem.result.affiliateVerification.status === 'WARN'
                      ? 'Link sống · Thiếu mã Tracking'
                      : 'Link lỗi / Không truy cập được'}
                  </Status>
                </div>
                <div className="text-2xs text-ink-2 break-all">
                  Link gốc:{' '}
                  <span className="font-mono text-ink">
                    {inspectedItem.result.affiliateVerification.inputUrl}
                  </span>
                </div>
                <div className="text-2xs text-ink-2 break-all">
                  Link đích sau Redirect:{' '}
                  <span className="font-mono text-ink">
                    {inspectedItem.result.affiliateVerification.resolvedUrl}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-2xs text-ink-2">
                  {inspectedItem.result.affiliateVerification.shopId && (
                    <span>
                      Shop ID:{' '}
                      <strong className="font-mono text-ink">
                        {inspectedItem.result.affiliateVerification.shopId}
                      </strong>
                    </span>
                  )}
                  {inspectedItem.result.affiliateVerification.itemId && (
                    <span>
                      Item ID:{' '}
                      <strong className="font-mono text-ink">
                        {inspectedItem.result.affiliateVerification.itemId}
                      </strong>
                    </span>
                  )}
                  {inspectedItem.result.affiliateVerification.trackingParams.length > 0 && (
                    <span>
                      Tracking:{' '}
                      <strong className="font-mono text-positive">
                        {inspectedItem.result.affiliateVerification.trackingParams.join(', ')}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {inspectedItem.result.captionSnippet && (
              <div className="rounded-lg border border-line bg-surface p-2.5">
                <div className="text-2xs font-semibold text-ink-2 mb-1">
                  Nội dung bài đăng / Mô tả thu thập được
                </div>
                <div className="text-2xs text-ink line-clamp-3">
                  {inspectedItem.result.captionSnippet}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-line overflow-hidden">
              <div className="grid grid-cols-12 border-b border-line bg-sunken px-2.5 py-2 text-2xs font-semibold text-ink-2">
                <div className="col-span-4">Tiêu chí kiểm tra</div>
                <div className="col-span-2">Kết quả</div>
                <div className="col-span-6">Chi tiết đối soát</div>
              </div>
              <div className="divide-y divide-line">
                {inspectedItem.result.checks.map(chk => (
                  <div key={chk.key} className="grid grid-cols-12 items-center px-2.5 py-2 text-xs">
                    <div className="col-span-4 font-semibold text-ink pr-2">{chk.label}</div>
                    <div className="col-span-2">
                      <Status
                        tone={
                          chk.status === 'PASS'
                            ? 'positive'
                            : chk.status === 'WARN'
                            ? 'warning'
                            : 'critical'
                        }
                      >
                        {chk.status === 'PASS'
                          ? 'Đạt'
                          : chk.status === 'WARN'
                          ? 'Lưu ý'
                          : 'Không đạt'}
                      </Status>
                    </div>
                    <div className="col-span-6 text-2xs text-ink-2 break-words">{chk.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {inspectedItem.result.limitations && inspectedItem.result.limitations.length > 0 && (
              <div className="rounded-lg border border-line bg-sunken p-2.5 space-y-1">
                <div className="text-2xs font-semibold text-ink-2">
                  Ghi chú kỹ thuật & Giới hạn nền tảng
                </div>
                {inspectedItem.result.limitations.map((lim, idx) => (
                  <div key={idx} className="text-2xs text-ink-2">
                    • {lim}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* HỘP THOẠI 6: KIỂM THỬ TRỰC TIẾP ENGINE NGHIỆM THU ĐA SÀN */}
      <Modal
        open={isTestEngineModalOpen}
        onClose={() => setIsTestEngineModalOpen(false)}
        title="Kiểm thử trực tiếp Engine Nghiệm thu Đa sàn"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsTestEngineModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              disabled={
                isRunningDirectTest ||
                (!testPostUrlInput.trim() && !testAffiliateUrlInput.trim())
              }
              onClick={() => void handleRunDirectEngineTest()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRunningDirectTest ? 'animate-spin' : ''}`} />
              <span>{isRunningDirectTest ? 'Đang phân tích thật...' : 'Chạy kiểm tra thực tế'}</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Link bài đăng công khai (Threads / FB / IG / Shopee)">
              <Input
                value={testPostUrlInput}
                onChange={e => setTestPostUrlInput(e.target.value)}
                placeholder="https://www.threads.net/@.../post/..."
              />
            </Field>
            <Field label="Link Affiliate đích cần giải mã (s.shopee.vn / shp.ee)">
              <Input
                value={testAffiliateUrlInput}
                onChange={e => setTestAffiliateUrlInput(e.target.value)}
                placeholder="https://s.shopee.vn/..."
              />
            </Field>
            <Field label="ID kênh KOC kỳ vọng (Tùy chọn)">
              <Input
                value={testExpectedHandleInput}
                onChange={e => setTestExpectedHandleInput(e.target.value)}
                placeholder="VD: GocCuaRuu"
              />
            </Field>
            <Field label="Brand / Hashtag bắt buộc (Cách nhau dấu phẩy)">
              <Input
                value={testExpectedBrandInput}
                onChange={e => setTestExpectedBrandInput(e.target.value)}
                placeholder="VD: ClubClio, #ClubClio"
              />
            </Field>
          </div>

          {directTestResult && (
            <div className="space-y-2.5 pt-2 border-t border-line">
              <div className="flex items-center justify-between rounded-lg border border-line bg-sunken px-3 py-2">
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink">
                    Nguồn thu thập: {directTestResult.source || 'HTML_META'}
                  </div>
                  <div className="text-2xs text-ink-2">
                    Kênh thu thập: {directTestResult.authorHandle ? `@${directTestResult.authorHandle}` : '—'} · Giờ lên bài: {directTestResult.airedAtVn || '—'}
                  </div>
                </div>
                <Status
                  tone={
                    directTestResult.status === 'LIVE' && directTestResult.verdict === 'PASS'
                      ? 'positive'
                      : directTestResult.status === 'LIVE'
                      ? 'warning'
                      : 'critical'
                  }
                >
                  {directTestResult.status} · {directTestResult.verdict}
                </Status>
              </div>

              {directTestResult.affiliateVerification && (
                <div className="rounded-lg border border-line bg-surface p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">
                      Kết quả bóc tách Link Affiliate ({directTestResult.affiliateVerification.platform})
                    </span>
                    <Status
                      tone={
                        directTestResult.affiliateVerification.status === 'PASS'
                          ? 'positive'
                          : directTestResult.affiliateVerification.status === 'WARN'
                          ? 'warning'
                          : 'critical'
                      }
                    >
                      {directTestResult.affiliateVerification.status}
                    </Status>
                  </div>
                  <div className="text-2xs text-ink-2 break-all">
                    Đích giải mã: <span className="font-mono text-ink">{directTestResult.affiliateVerification.resolvedUrl}</span>
                  </div>
                  <div className="text-2xs text-ink-2">
                    {directTestResult.affiliateVerification.detail}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-line overflow-hidden">
                <div className="divide-y divide-line">
                  {directTestResult.checks.map(chk => (
                    <div key={chk.key} className="grid grid-cols-12 items-center px-2.5 py-1.5 text-2xs">
                      <div className="col-span-4 font-semibold text-ink">{chk.label}</div>
                      <div className="col-span-2">
                        <Status
                          tone={
                            chk.status === 'PASS'
                              ? 'positive'
                              : chk.status === 'WARN'
                              ? 'warning'
                              : 'critical'
                          }
                        >
                          {chk.status}
                        </Status>
                      </div>
                      <div className="col-span-6 text-ink-2 break-words">{chk.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
