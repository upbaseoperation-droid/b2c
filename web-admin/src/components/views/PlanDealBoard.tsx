'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, ChevronDown, ChevronRight, FileText, Plus, Search, Send, Trash2 } from 'lucide-react';
import type { BookingDealItem, InputPlanBreakdownState, KocItem } from '../../lib/types';
import { isPersonInField } from '../../lib/staffIdentity';
import { SheetPullPreviewModal, type SheetPullChange } from './SheetPullPreviewModal';
import { getVietnamDateYmd } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { findSavedScreenshotsForContext } from '../../lib/acceptanceScreenshotStore';
import { VideoProductScreenshotModal } from '../contracts/VideoProductScreenshotModal';
import { DraftBbntPreviewModal } from '../contracts/DraftBbntPreviewModal';
import { PullHangingJobsModal } from './PullHangingJobsModal';
import { getKocLegalProfiles } from '../koc/kocUtils';
import { usePlanRecord } from '../../lib/usePlanRecord';
import { useListingBoard } from '../../lib/useListingBoard';
import { fetchClientMonthlyPlans, getCachedClientMonthlyPlans } from '../../lib/useMonthlyPlanSync';
import { contractApi, type ContractBootstrap } from '../contracts/api';
import type { ContractRecord } from '../../lib/contracts/types';
import type { DealPaymentOverrides } from '../../lib/larkPaymentRequestEngine';
import {
  DOCUMENT_LABEL,
  documentOfTemplate,
  documentsOfJob,
  formatContractRecordNumber,
  planJobToBookingDeal,
  recordSigned,
  type ContractDocument,
} from '../../lib/planDealLink';
import { columnOf, itemFee, itemGrade, planQuota } from '../../lib/listingBoardRules';
import {
  ensureSequentialBriefCodes,
  isBriefReady,
  isVettingGuardrailRow,
  resolveBriefMode,
  slotKocHandles,
  slotTargetQty,
  type ContentSlot,
} from '../../lib/contentPlanRules';
import {
  findCatalogProduct,
  resolveEffectiveProductGuidelines,
  resolveEffectiveProductLinks,
  resolveEffectiveSampleQuota,
  type BrandProductCatalog,
} from '../../lib/productCatalog';
import { computeWindowPerformance, videoIdFromAirLink, type DailyVideoPerformanceRow } from '../../lib/upaffiliateDailyPerformance';
import {
  BOOKING_LIST_COLUMNS,
  defaultBookingTabName,
  resolveBrandBookingSheetUrl,
} from '../../lib/bookingList';
import {
  ADDON_STATUS_LABEL,
  ADDON_TYPE_LABEL,
  COMMERCE_PLATFORM_LABEL,
  EMPTY_DEAL_BOARD,
  FRAMEWORK_STATE_LABEL,
  HARDCOPY_STATUS_LABEL,
  LEGAL_ENTITY_LABEL,
  PRICING_DISPLAY_MODE_LABEL,
  PRODUCTION_MODE_LABEL,
  PUBLISH_PLATFORM_LABEL,
  STAGES,
  budgetIssues,
  computeJobContractAmounts,
  computeJobPipelineState,
  createDeal,
  createDealBlocker,
  createDealJob,
  createPostAirUpsellJob,
  dealIssues,
  dealTotalFee,
  frameworkState,
  getMonthlyClosingStatus,
  isAccountHolderMatched,
  isAirLinkLocked,
  isJobAcceptanceCleared,
  jobAddonsFee,
  jobDroppedFee,
  jobPaymentBlocker,
  jobStageOf,
  jobTotalFee,
  newAddonId,
  normHandle,
  pushEvent,
  requiresLateSigningExplanation,
  requiresLegalFinanceReview,
  stageOf,
  summarizeDeals,
  syncDealSummaryFields,
  type AcceptanceStatus,
  type AdvancePaymentStatus,
  type ClosingWindowMode,
  type CommercePlatform,
  type ContentProductionMode,
  type ContractReviewStatus,
  type DealBoardData,
  type DealJob,
  type DraftInvoiceStatus,
  type FrameworkContract,
  type HardcopyStatus,
  type JobAddonItem,
  type JobAddonStatus,
  type JobAddonType,
  type JobLifecycleStatus,
  type LegalEntityType,
  type MonthlyClosingState,
  type PaymentStatus,
  type PlanDeal,
  type PricingDisplayMode,
  type PublishPlatform,
  type SampleStatus,
  type ScriptStatus,
} from '../../lib/dealBoardRules';

interface PlanDealBoardProps {
  kocs?: KocItem[];
  currentUserName?: string;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  /** Mở hồ sơ hợp đồng nguyên tắc (theo KOC), SOW hoặc biên bản nghiệm thu (theo từng Job) trong mô-đun Hợp đồng. */
  onOpenContract?: (deal: BookingDealItem, document: ContractDocument) => void;
  /** Mở bảng ở kế hoạch này và tạo Deal cho KOC đã chốt trên List (bấm "Tạo Deal" ở thẻ List) */
  focus?: { planId: string; listingItemId: string; nonce: number } | null;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };
const SAMPLE_LABEL: Record<SampleStatus, string> = {
  NONE: 'Chưa gửi',
  NOT_NEEDED: 'Không cần gửi',
  SENT: 'Đã gửi',
  RECEIVED: 'KOC đã nhận',
  OUT_OF_STOCK: 'Brand hết hàng (Tạm dừng SLA)',
  ISSUE: 'Lỗi sản phẩm mẫu (Tạm dừng SLA)',
};
const SCRIPT_LABEL: Record<ScriptStatus, string> = { NONE: 'Chưa nộp', NOT_NEEDED: 'Không cần kịch bản', SUBMITTED: 'Chờ duyệt', CHANGES: 'Cần sửa', APPROVED: 'Đã duyệt' };
const PAY_LABEL: Record<PaymentStatus, string> = { NONE: 'Chưa đề nghị', REQUESTED: 'Đã đẩy Lark (Chờ chi)', PAID: 'Đã thanh toán' };
const ACCEPT_LABEL: Record<AcceptanceStatus, string> = { PENDING: 'Chưa nghiệm thu', PASSED: 'Đạt', REVIEW: 'Cần xem lại', FAILED: 'Không đạt' };
const TH = 'whitespace-nowrap border-b border-line bg-sunken px-2 py-2 text-left text-2xs font-medium text-ink-3';
const TD = 'border-b border-line px-2 py-1.5 align-middle text-[13px] text-ink';

type PlanLite = InputPlanBreakdownState;

export const PlanDealBoard: React.FC<PlanDealBoardProps> = ({ kocs = [], currentUserName = 'Nhân viên', onNotify, onOpenContract, focus }) => {
  const notify = useCallback((msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type), [onNotify]);

  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [expandedDealIds, setExpandedDealIds] = useState<Record<string, boolean>>({});
  const [fwModal, setFwModal] = useState<{ handle: string } | null>(null);
  const [fwForm, setFwForm] = useState<{
    contractNo: string;
    signedAt: string;
    validTo: string;
    fileUrl: string;
    note: string;
    entityType: LegalEntityType;
    legalName: string;
    taxOrCccd: string;
    bankName: string;
    bankAccount: string;
    bankHolder: string;
    authorizationUrl: string;
    hardcopyStatus: HardcopyStatus;
    hardcopyDueAt: string;
    coveredHandlesText: string;
  }>({
    contractNo: '',
    signedAt: '',
    validTo: '',
    fileUrl: '',
    note: '',
    entityType: 'INDIVIDUAL',
    legalName: '',
    taxOrCccd: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    authorizationUrl: '',
    hardcopyStatus: 'ESIGN_VERIFIED',
    hardcopyDueAt: '',
    coveredHandlesText: '',
  });
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [pushingLarkJobId, setPushingLarkJobId] = useState<string | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [stage2SheetOpen, setStage2SheetOpen] = useState(false);
  const [stage2SheetUrl, setStage2SheetUrl] = useState('');
  const [stage2TabName, setStage2TabName] = useState('');
  const [stage2Syncing, setStage2Syncing] = useState(false);
  const [bundlePaymentOpen, setBundlePaymentOpen] = useState(false);
  const [selectedBundleJobIds, setSelectedBundleJobIds] = useState<string[]>([]);
  const [bundlingLark, setBundlingLark] = useState(false);
  const [pullHangingOpen, setPullHangingOpen] = useState(false);
  const [payeeQuickForm, setPayeeQuickForm] = useState<{
    bankName: string;
    bankAccount: string;
    bankHolder: string;
    legalId: string;
  }>({ bankName: '', bankAccount: '', bankHolder: '', legalId: '' });

  useEffect(() => {
    const cached = getCachedClientMonthlyPlans();
    if (cached && cached.length > 0) {
      setPlans(cached);
      setPlansState('ready');
    }
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchClientMonthlyPlans();
        if (cancelled) return;
        setPlans(stored.map(p => p.plan));
        setPlansState('ready');
      } catch (err) {
        if (cancelled) return;
        setPlansState('error');
        notify(err instanceof Error ? err.message : 'Không tải được danh sách kế hoạch.', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const months = useMemo(() => Array.from(new Set(plans.map(p => p.month))).sort().reverse(), [plans]);
  const activeMonth = month || months[0] || '';
  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans
      .filter(p => p.month === activeMonth)
      .filter(p => !q || `${p.storeName || ''} ${p.brandName} ${p.pic || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.storeName || a.title).localeCompare(b.storeName || b.title));
  }, [plans, activeMonth, search]);
  const plan = useMemo(() => plans.find(p => p.id === selectedId) || null, [plans, selectedId]);

  const { data, status, update, saveNow, reload } = usePlanRecord<DealBoardData>('/api/deal-board', plan?.id ?? null, EMPTY_DEAL_BOARD, msg => notify(msg, 'warning'));
  const [syncingSlip, setSyncingSlip] = useState('');
  /** Hỏi trạng thái phiếu trên Lark; máy chủ tự ghi bước duyệt / đã chi về Job rồi tải lại bảng. */
  const syncLarkSlip = async (slipCode: string) => {
    setSyncingSlip(slipCode);
    try {
      await saveNow();
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'SYNC_LARK_STATUS', slipCode }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.message || body?.error || `Lỗi ${res.status}`);
      await reload();
      notify(body.message || 'Đã cập nhật trạng thái từ Lark.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không cập nhật được trạng thái từ Lark.', 'error');
    } finally {
      setSyncingSlip('');
    }
  };
  // Vị trí của người dùng trên gian (máy chủ là nơi chặn; giao diện chỉ khóa sẵn cho dễ dùng)
  const [boardAccess, setBoardAccess] = useState<{ global: boolean; positions: string[]; isAccountPic: boolean; storeCodes: Record<string, string>; me: { id: string; name: string; staffCode?: string; role: string }; bookers?: string[] } | null>(null);
  useEffect(() => {
    if (!plan?.id) return;
    let alive = true;
    fetch(`/api/deal-board?planId=${encodeURIComponent(plan.id)}&view=access`, { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => alive && setBoardAccess(body))
      .catch(() => alive && setBoardAccess(null));
    return () => {
      alive = false;
    };
  }, [plan?.id]);
  const canEditDealFields = (d: PlanDeal): boolean => {
    if (!boardAccess) return true;
    const pos = new Set(boardAccess.positions);
    if (boardAccess.global || pos.has('BOOKING_MAIN') || pos.has('LEADER')) return true;
    // Pháp chế / Kế toán / Account PIC sửa phần duyệt của mình trên mọi deal (máy chủ giới hạn đúng trường)
    if (boardAccess.isAccountPic || /^(LEGAL|FINANCE)$/.test(boardAccess.me?.role || '')) return true;
    if (!pos.has('BOOKING_CO') && !pos.has('BACKUP')) return false;
    const mine = (name?: string) => isPersonInField(boardAccess.me, name, boardAccess.storeCodes);
    return mine(d.pic) || (d.jobs || []).some(j => mine(j.pic));
  };
  const { items } = useListingBoard(plan?.id ?? null, msg => notify(msg, 'warning'));
  const deals = data.deals;

  // Nguồn tham chiếu: hợp đồng nguyên tắc, content của kế hoạch, danh mục sản phẩm
  const [frameworks, setFrameworks] = useState<Record<string, FrameworkContract>>({});
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [catalog, setCatalog] = useState<BrandProductCatalog>({ groups: [] });
  const [screenshotTarget, setScreenshotTarget] = useState<{
    deal: PlanDeal;
    job: DealJob;
  } | null>(null);
  const [draftBbntTarget, setDraftBbntTarget] = useState<{
    deal: PlanDeal;
    job: DealJob;
  } | null>(null);

  const handlesKey = useMemo(
    () =>
      Array.from(new Set([...items.filter(i => columnOf(i) === 'CONFIRMED').map(i => normHandle(i.kocHandle)), ...deals.map(d => normHandle(d.kocHandle))].filter(Boolean)))
        .sort()
        .join(','),
    [items, deals]
  );

  const loadFrameworks = useCallback(async (handles: string) => {
    if (!handles) {
      setFrameworks({});
      return;
    }
    try {
      const res = await fetch(`/api/koc-framework?handles=${encodeURIComponent(handles)}`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) return;
      setFrameworks(Object.fromEntries(((body?.items as FrameworkContract[]) || []).map(i => [i.id, i])));
    } catch {
      /* không tải được thì coi như chưa có hợp đồng nguyên tắc */
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadFrameworks(handlesKey));
  }, [handlesKey, loadFrameworks]);

  const currentPlanId = plan?.id ?? null;
  const [prevPlanId, setPrevPlanId] = useState<string | null>(currentPlanId);
  if (currentPlanId !== prevPlanId) {
    setPrevPlanId(currentPlanId);
    setSlots([]);
    setCatalog({ groups: [] });
  }

  const activePlanId = plan?.id ?? null;
  const activePlanBrandName = plan?.brandName ?? '';
  useEffect(() => {
    if (!activePlanId) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`/api/content-plan?planId=${encodeURIComponent(activePlanId)}`, { cache: 'no-store' }),
          fetch(`/api/product-catalog?brand=${encodeURIComponent(activePlanBrandName)}`, { cache: 'no-store' }),
        ]);
        const cBody = await cRes.json().catch(() => null);
        const pBody = await pRes.json().catch(() => null);
        if (cancelled) return;
        if (cRes.ok) setSlots(ensureSequentialBriefCodes((cBody?.data?.slots as ContentSlot[]) || []));
        if (pRes.ok) setCatalog((pBody?.data as BrandProductCatalog) || { groups: [] });
      } catch {
        /* thiếu tham chiếu thì deal tạo không kèm tuần, sản phẩm */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePlanId, activePlanBrandName]);

  // Hồ sơ trong mô-đun Hợp đồng: dùng để hiện trạng thái soạn, duyệt, ký của từng Job
  const [contractRecords, setContractRecords] = useState<ContractRecord[]>([]);
  const [contractsState, setContractsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const loadContracts = useCallback(async () => {
    setContractsState('loading');
    try {
      const res = await contractApi<ContractBootstrap>('/api/contracts');
      setContractRecords(res.records || []);
      setContractsState('ready');
    } catch {
      setContractsState('error');
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(() => loadContracts());
  }, [loadContracts]);

  const kocByHandleMap = useMemo(() => {
    const m = new Map<string, KocItem>();
    for (const k of kocs) {
      const h = normHandle(k.channelId || '');
      if (h && !m.has(h)) m.set(h, k);
    }
    return m;
  }, [kocs]);
  const kocOfHandle = useCallback((handle: string) => kocByHandleMap.get(normHandle(handle)), [kocByHandleMap]);
  const kocIdOfHandle = useCallback((handle: string) => kocOfHandle(handle)?.id, [kocOfHandle]);

  /** Số hợp đồng ghi trong hồ sơ (ô điền có chữ số hợp đồng, phụ lục hoặc SOW), không có thì dùng mã hồ sơ. */
  const numberOfRecord = (r: ContractRecord): string => {
    const key = Object.keys(r.values || {}).find(k => /^(token:)?\[?\s*(số|so)\b.*(hợp đồng|phụ lục|sow)/i.test(k) && (r.values[k] || '').trim());
    return (key ? r.values[key] : '').trim() || formatContractRecordNumber(r);
  };

  /** Hợp đồng nguyên tắc đã ký của KOC trong mô-đun Hợp đồng, nếu có. */
  const signedFrameworkOf = (handle: string): { record: ContractRecord; signedAt: string } | null => {
    const h = normHandle(handle);
    const kocId = kocIdOfHandle(handle);
    const found = contractRecords
      .filter(r => documentOfTemplate(r.templateId) === 'HDNT' && recordSigned(r).signed && ((kocId && r.kocId === kocId) || normHandle((r.kocId || '').replace(/^KOC-/i, '')) === h))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return found ? { record: found, signedAt: recordSigned(found).at } : null;
  };

  const summary = useMemo(() => summarizeDeals(deals), [deals]);
  const plannedTotalVideos = useMemo(
    () => (plan ? planQuota(plan).reduce((sum, q) => sum + (q.requiredQty || 0), 0) : 0),
    [plan]
  );
  const slotUsageCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of deals) {
      for (const j of d.jobs || []) {
        if (j.slotId) m.set(j.slotId, (m.get(j.slotId) || 0) + 1);
      }
    }
    return m;
  }, [deals]);
  const jobsWithBriefCount = useMemo(() => {
    let count = 0;
    for (const d of deals) {
      for (const j of d.jobs || []) {
        if (j.slotId || j.briefCode || j.angle?.trim()) count += 1;
      }
    }
    return count;
  }, [deals]);
  const pickBestSlotForKoc = useCallback(
    (preferredSlotId: string | undefined, handle: string, grade: string): ContentSlot | undefined => {
      if (preferredSlotId) {
        const direct = slots.find(s => s.id === preferredSlotId);
        if (direct) return direct;
      }
      const normH = normHandle(handle);
      const normGrade = grade === 'TAP UpAffiliate' ? 'FOC' : grade;
      const hasCapacity = (s: ContentSlot) => (slotUsageCountMap.get(s.id) || 0) < slotTargetQty(s);
      return (
        slots.find(s => normH && slotKocHandles(s).some(h => normHandle(h) === normH) && hasCapacity(s)) ||
        slots.find(s => s.row === normGrade && hasCapacity(s)) ||
        slots.find(hasCapacity) ||
        slots.find(s => s.row === normGrade) ||
        slots[0]
      );
    },
    [slots, slotUsageCountMap]
  );

  const issues = useMemo(() => [...(plan ? budgetIssues(deals, planQuota(plan)) : []), ...dealIssues(deals)], [deals, plan]);
  const confirmedNoDeal = useMemo(
    () => items.filter(i => columnOf(i) === 'CONFIRMED' && !deals.some(d => d.listingItemId === i.id || (d.jobs || []).some(j => j.listingItemId === i.id))),
    [items, deals]
  );
  const openDeal = deals.find(d => d.id === openDealId) || null;

  // Khởi tạo thông tin ngân hàng/CCCD của KOC khi mở Deal
  const openDealSyncKey = openDeal ? `${openDeal.id}::${openDeal.kocHandle}` : '';
  const [prevOpenDealSyncKey, setPrevOpenDealSyncKey] = useState('');
  if (openDealSyncKey !== prevOpenDealSyncKey) {
    setPrevOpenDealSyncKey(openDealSyncKey);
    if (openDeal) {
      const matchedKoc = kocOfHandle(openDeal.kocHandle);
      const alt = matchedKoc?.alternatePayees?.[0];
      setPayeeQuickForm({
        bankName: matchedKoc?.bankName || alt?.bankName || '',
        bankAccount: matchedKoc?.bankAccount || alt?.bankAccount || '',
        bankHolder: matchedKoc?.realName || alt?.holderName || openDeal.kocName || '',
        legalId: matchedKoc?.cccd || matchedKoc?.taxCode || alt?.legalId || '',
      });
    }
  }

  const closingState: MonthlyClosingState = useMemo(
    () =>
      data.closingState || {
        mode: 'AUTO',
        round1ErrorLog: '',
        round2ErrorLog: '',
        updatedBy: '',
        updatedAt: '',
      },
    [data.closingState]
  );
  const closingStatus = useMemo(
    () => (plan ? getMonthlyClosingStatus(plan.month, closingState) : null),
    [plan, closingState]
  );
  const patchClosingState = (fn: (cur: MonthlyClosingState) => MonthlyClosingState) => {
    const next = fn(closingState);
    update({
      ...data,
      closingState: {
        ...next,
        updatedBy: currentUserName,
        updatedAt: new Date().toISOString(),
      },
    });
  };
  const setDeals = (next: PlanDeal[]) => update({ ...data, deals: next.map(syncDealSummaryFields) });
  const patchDeal = (id: string, fn: (d: PlanDeal) => PlanDeal) => setDeals(deals.map(d => (d.id === id ? syncDealSummaryFields(fn(d)) : d)));
  const patchJob = (dealId: string, jobId: string, fn: (j: DealJob) => DealJob, log?: string) => {
    patchDeal(dealId, d => {
      const nextJobs = (d.jobs || []).map(j => (j.id === jobId ? fn(j) : j));
      const updated = syncDealSummaryFields({ ...d, jobs: nextJobs });
      return log ? pushEvent(updated, currentUserName, log) : updated;
    });
  };

  const legalProfilesOfHandle = useCallback(
    (handle: string) => {
      const matched = kocOfHandle(handle);
      return matched ? getKocLegalProfiles(matched) : [];
    },
    [kocOfHandle]
  );

  const hasValidKocProfile = useCallback(
    (handle: string) => {
      const profiles = legalProfilesOfHandle(handle);
      return profiles.some(p => Boolean((p.frameworkContractCode || '').trim() || (p.cccd || p.taxCode || '').trim()));
    },
    [legalProfilesOfHandle]
  );

  const defaultLegalProfileOf = useCallback(
    (handle: string) => {
      const profiles = legalProfilesOfHandle(handle);
      return profiles.find(p => p.isDefault) || profiles[0];
    },
    [legalProfilesOfHandle]
  );

  const openDealWithJob = (dealId: string, jobId?: string) => {
    const targetDeal = deals.find(d => d.id === dealId);
    setOpenDealId(dealId);
    setActiveJobId(jobId || targetDeal?.jobs?.[0]?.id || null);
  };

  const makeDeal = (itemId: string, openSowAfterCreate?: boolean) => {
    if (!plan) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const reason = createDealBlocker(item, frameworks[normHandle(item.kocHandle)], deals, hasValidKocProfile(item.kocHandle));
    if (reason) {
      notify(reason, 'warning');
      return;
    }
    const slot = pickBestSlotForKoc(item.planSlotId, item.kocHandle, itemGrade(item));
    const group = catalog.groups.find(g => g.id === slot?.productGroupId || (slot?.product && g.name === slot.product));
    const defProfile = defaultLegalProfileOf(item.kocHandle);
    const deal = createDeal({
      item,
      planId: plan.id,
      month: plan.month,
      actor: currentUserName,
      existingCodes: deals.map(d => d.code),
      week: slot?.week || '',
      // Deal thuộc người phụ trách KOC trên List (Booking cùng làm giữ deal của mình)
      pic: item.assignedStaffName || slot?.pic || currentUserName,
      slotId: slot?.id,
      briefCode: slot?.briefCode || '',
      pillar: slot?.pillar || '',
      angle: slot?.angle || '',
      hook: slot?.hook || '',
      usp: slot?.usp || group?.usp || '',
      forbiddenClaims: slot?.forbiddenClaims || group?.forbiddenClaims || '',
      briefMode: slot ? resolveBriefMode(slot) : isVettingGuardrailRow(String(itemGrade(item))) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE',
      mandatoryShots: slot?.mandatoryShots || '',
      rightsGuardrails: slot?.rightsGuardrails || '',
      cta: slot?.cta || '',
      briefUrl: slot?.briefUrl || '',
      productGroupId: group?.id || '',
      productGroupName: group?.name || slot?.product || '',
      productName: slot?.sku || slot?.productName || '',
      cartUrl: slot?.cartUrl || '',
      affiliateUrl: slot?.affiliateUrl || '',
      commissionPct: slot?.commissionPct ?? null,
      legalProfileId: defProfile?.id || '',
      entityType: defProfile?.legalType || 'INDIVIDUAL',
      payeeLegalName: defProfile?.holderName || '',
      payeeTaxOrCccd: defProfile?.taxCode || defProfile?.cccd || '',
      payeeBankName: defProfile?.bankName || '',
      payeeBankAccount: defProfile?.bankAccount || '',
      payeeBankHolder: defProfile?.holderName || '',
    });
    setDeals([...deals, deal]);
    setExpandedDealIds(prev => ({ ...prev, [deal.id]: true }));
    if (openSowAfterCreate && onOpenContract && deal.jobs[0]) {
      const fwNo = frameworks[normHandle(deal.kocHandle)]?.contractNo || defProfile?.frameworkContractCode;
      onOpenContract(planJobToBookingDeal(deal, deal.jobs[0], plan, kocIdOfHandle(deal.kocHandle), fwNo), 'SOW');
      return;
    }
    openDealWithJob(deal.id, deal.jobs[0]?.id);
  };

  // Bấm "Tạo Deal" ở thẻ List: chọn đúng kế hoạch, chờ bảng tải xong rồi tạo (hoặc mở Deal đã có) đúng 1 lần
  const handledFocus = React.useRef(0);
  useEffect(() => {
    if (!focus || handledFocus.current === focus.nonce) return;
    const target = plans.find(p => p.id === focus.planId);
    if (!target) return;
    if (selectedId !== focus.planId) {
      setMonth(target.month);
      setSelectedId(focus.planId);
      return;
    }
    if (status === 'loading' || status === 'idle' || !items.some(i => i.id === focus.listingItemId)) return;
    handledFocus.current = focus.nonce;
    const existing = deals.find(d => d.listingItemId === focus.listingItemId);
    if (existing) openDealWithJob(existing.id, existing.jobs[0]?.id);
    else makeDeal(focus.listingItemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, plans, selectedId, status, items, deals]);

  /** Nếu KOC trên bảng List đã có Deal trong kế hoạch, cho phép gộp dòng List này thành 1 Job mới trong Deal đó. */
  const addListingItemAsJobToDeal = (itemId: string, targetDealId: string) => {
    if (!plan) return;
    const item = items.find(i => i.id === itemId);
    const targetDeal = deals.find(d => d.id === targetDealId);
    if (!item || !targetDeal) return;
    const reason = createDealBlocker(item, frameworks[normHandle(item.kocHandle)], deals, hasValidKocProfile(item.kocHandle));
    if (reason) {
      notify(reason, 'warning');
      return;
    }
    const slot = pickBestSlotForKoc(item.planSlotId, item.kocHandle, itemGrade(item));
    const group = catalog.groups.find(g => g.id === slot?.productGroupId || (slot?.product && g.name === slot.product));
    const defProfile = defaultLegalProfileOf(item.kocHandle);
    const newJob = createDealJob({
      dealCode: targetDeal.code,
      existingJobs: targetDeal.jobs || [],
      title: slot?.briefCode
        ? `${slot.briefCode} · ${slot.angle || slot.pillar || `Video ${(targetDeal.jobs || []).length + 1}`}`
        : `Job ${(targetDeal.jobs || []).length + 1} · Video ${(targetDeal.jobs || []).length + 1}`,
      listingItemId: item.id,
      slotId: slot?.id || item.planSlotId || '',
      briefCode: slot?.briefCode || '',
      pillar: slot?.pillar || '',
      angle: slot?.angle || '',
      hook: slot?.hook || '',
      usp: slot?.usp || group?.usp || '',
      forbiddenClaims: slot?.forbiddenClaims || group?.forbiddenClaims || '',
      briefMode: slot ? resolveBriefMode(slot) : isVettingGuardrailRow(String(itemGrade(item))) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE',
      mandatoryShots: slot?.mandatoryShots || '',
      rightsGuardrails: slot?.rightsGuardrails || '',
      cta: slot?.cta || '',
      briefUrl: slot?.briefUrl || '',
      week: slot?.week || '',
      pic: slot?.pic || item.assignedStaffName || currentUserName,
      legalProfileId: defProfile?.id || '',
      entityType: defProfile?.legalType || 'INDIVIDUAL',
      payeeLegalName: defProfile?.holderName || '',
      payeeTaxOrCccd: defProfile?.taxCode || defProfile?.cccd || '',
      payeeBankName: defProfile?.bankName || '',
      payeeBankAccount: defProfile?.bankAccount || '',
      payeeBankHolder: defProfile?.holderName || '',
      videoFee: itemFee(item),
      productGroupId: group?.id || '',
      productGroupName: group?.name || slot?.product || '',
      productName: slot?.sku || slot?.productName || '',
      cartUrl: slot?.cartUrl || '',
      affiliateUrl: slot?.affiliateUrl || '',
      commissionPct: slot?.commissionPct ?? null,
    });
    patchDeal(targetDeal.id, cur =>
      pushEvent(
        syncDealSummaryFields({ ...cur, jobs: [...(cur.jobs || []), newJob] }),
        currentUserName,
        `Thêm Job ${newJob.code} từ danh sách KOC đã chốt`
      )
    );
    setExpandedDealIds(prev => ({ ...prev, [targetDeal.id]: true }));
    openDealWithJob(targetDeal.id, newJob.id);
    notify(`Đã thêm Job ${newJob.code} vào Deal ${targetDeal.code}.`, 'success');
  };

  /** Tạo thêm 1 Job mới (1 Video + Dịch vụ gia tăng) trực tiếp bên trong Deal. */
  const addNewJobInsideDeal = (d: PlanDeal) => {
    const lastJob = (d.jobs || [])[(d.jobs || []).length - 1];
    const nextIdx = (d.jobs || []).length + 1;
    const slot = pickBestSlotForKoc(undefined, d.kocHandle, d.grade);
    const group = catalog.groups.find(g => g.id === slot?.productGroupId || (slot?.product && g.name === slot.product));
    const newJob = createDealJob({
      dealCode: d.code,
      existingJobs: d.jobs || [],
      title: slot?.briefCode
        ? `${slot.briefCode} · ${slot.angle || slot.pillar || `Video ${nextIdx}`}`
        : `Job ${nextIdx} · Video ${nextIdx}`,
      slotId: slot?.id || '',
      briefCode: slot?.briefCode || '',
      pillar: slot?.pillar || '',
      angle: slot?.angle || '',
      hook: slot?.hook || '',
      usp: slot?.usp || group?.usp || '',
      forbiddenClaims: slot?.forbiddenClaims || group?.forbiddenClaims || '',
      briefMode: slot ? resolveBriefMode(slot) : isVettingGuardrailRow(String(d.grade)) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE',
      mandatoryShots: slot?.mandatoryShots || '',
      rightsGuardrails: slot?.rightsGuardrails || '',
      cta: slot?.cta || '',
      briefUrl: slot?.briefUrl || '',
      week: slot?.week || lastJob?.week || d.week || '',
      pic: slot?.pic || lastJob?.pic || d.pic || currentUserName,
      publishPlatform: lastJob?.publishPlatform || 'TIKTOK',
      commercePlatform: lastJob?.commercePlatform || 'TIKTOK_SHOP',
      productionMode: 'ORIGINAL',
      pricingDisplayMode: lastJob?.pricingDisplayMode || 'PACKAGE_ALL_IN',
      legalProfileId: lastJob?.legalProfileId || '',
      entityType: lastJob?.entityType || 'INDIVIDUAL',
      vatPct: lastJob?.vatPct ?? 8,
      payeeLegalName: lastJob?.payeeLegalName || '',
      payeeTaxOrCccd: lastJob?.payeeTaxOrCccd || '',
      payeeBankName: lastJob?.payeeBankName || '',
      payeeBankAccount: lastJob?.payeeBankAccount || '',
      payeeBankHolder: lastJob?.payeeBankHolder || '',
      authorizationUrl: lastJob?.authorizationUrl || '',
      videoFee: lastJob?.videoFee ?? 0,
      productGroupId: group?.id || lastJob?.productGroupId || d.productGroupId || '',
      productGroupName: group?.name || slot?.product || lastJob?.productGroupName || d.productGroupName || '',
      productName: slot?.sku || slot?.productName || lastJob?.productName || '',
      cartUrl: slot?.cartUrl || lastJob?.cartUrl || '',
      affiliateUrl: slot?.affiliateUrl || lastJob?.affiliateUrl || '',
      commissionPct: slot?.commissionPct ?? lastJob?.commissionPct ?? null,
    });
    patchDeal(d.id, cur =>
      pushEvent(
        syncDealSummaryFields({ ...cur, jobs: [...(cur.jobs || []), newJob] }),
        currentUserName,
        `Thêm Job ${newJob.code} (${newJob.title})`
      )
    );
    setExpandedDealIds(prev => ({ ...prev, [d.id]: true }));
    setActiveJobId(newJob.id);
    notify(`Đã tạo ${newJob.code} trong Deal ${d.code}.`, 'success');
  };

  /** Tạo Phụ lục SOW phát sinh sau khi Video đã lên sóng (Post-Air Upsell). */
  const addUpsellJobAfterAir = (d: PlanDeal, sourceJob: DealJob) => {
    const upsellJob = createPostAirUpsellJob(d, sourceJob, currentUserName);
    patchDeal(d.id, cur =>
      pushEvent(
        syncDealSummaryFields({ ...cur, jobs: [...(cur.jobs || []), upsellJob] }),
        currentUserName,
        `Tạo Phụ lục SOW phát sinh sau Air (${upsellJob.code}) từ video của ${sourceJob.code}`
      )
    );
    setExpandedDealIds(prev => ({ ...prev, [d.id]: true }));
    setActiveJobId(upsellJob.id);
    notify(`Đã tạo Phụ lục SOW phát sinh sau Air (${upsellJob.code}) gắn với video của ${sourceJob.code}.`, 'success');
  };

  /** Kéo số liệu daily của video từ UpAffiliate rồi cộng D14 / D30 / D60 tính từ ngày air (RULE-DATA-01: không sinh số giả) */
  const [syncingPerfJobId, setSyncingPerfJobId] = useState<string | null>(null);
  const syncJobPerformanceFromUpaffiliate = async (d: PlanDeal, job: DealJob) => {
    const videoId = videoIdFromAirLink(job.airLink);
    if (!videoId) {
      notify(`${job.code} chưa có link air dài chứa Video ID nên chưa kéo được số liệu daily.`, 'warning');
      return;
    }
    if (!job.airedAt) {
      notify(`${job.code} chưa có ngày air nên chưa tính được D14 / D30 / D60.`, 'warning');
      return;
    }
    setSyncingPerfJobId(job.id);
    try {
      const res = await fetch('/api/integrations/upaffiliate/daily-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, airDate: job.airedAt }),
      });
      const body = (await res.json().catch(() => null)) as {
        rows?: DailyVideoPerformanceRow[];
        today?: string;
        error?: string | null;
      } | null;
      if (!body?.rows || !body.today) {
        notify(body?.error || 'Không đồng bộ được số liệu daily từ UpAffiliate.', 'error');
        return;
      }
      if (body.rows.length === 0) {
        notify(body.error || `UpAffiliate chưa có số liệu daily cho video ${videoId}.`, 'warning');
        return;
      }
      const windows = computeWindowPerformance(body.rows, job.airedAt, body.today);
      patchJob(
        d.id,
        job.id,
        cur => ({ ...cur, performance: { d14: windows.d14, d30: windows.d30, d60: windows.d60 } }),
        `Tính hiệu suất D14/D30/D60 từ số liệu daily UpAffiliate cho ${job.code}`
      );
      const coverage = (['d14', 'd30', 'd60'] as const).map(k => `${k.toUpperCase()} ${windows[k].daysCovered}/${windows[k].daysInWindow} ngày`).join(' · ');
      if (body.error) notify(`${body.error} Đã tính lại từ số liệu daily đã lưu (${coverage}).`, 'warning');
      else notify(`Đã cập nhật hiệu suất ${job.code} từ số liệu daily UpAffiliate (${coverage}).`, 'success');
    } catch {
      notify('Không kết nối được máy chủ để đồng bộ số liệu daily.', 'error');
    } finally {
      setSyncingPerfJobId(null);
    }
  };

  const removeJobFromDeal = (d: PlanDeal, job: DealJob) => {
    if ((d.jobs || []).length <= 1) {
      notify('Mỗi Deal cần có ít nhất 1 Job.', 'warning');
      return;
    }
    if (job.payment.status !== 'NONE') {
      notify(`Job ${job.code} đã đẩy đề nghị thanh toán, không thể xóa.`, 'warning');
      return;
    }
    const remaining = (d.jobs || []).filter(j => j.id !== job.id);
    patchDeal(d.id, cur =>
      pushEvent(syncDealSummaryFields({ ...cur, jobs: remaining }), currentUserName, `Xóa Job ${job.code}`)
    );
    if (activeJobId === job.id) {
      setActiveJobId(remaining[0]?.id || null);
    }
    notify(`Đã xóa Job ${job.code}.`, 'info');
  };

  const saveFramework = async () => {
    if (!fwModal) return;
    try {
      const coveredHandles = fwForm.coveredHandlesText
        .split(/[,;\n]/)
        .map(s => normHandle(s))
        .filter(Boolean);
      const res = await fetch('/api/koc-framework', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: fwModal.handle, ...fwForm, coveredHandles }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
      notify(`Đã ghi hợp đồng nguyên tắc của @${normHandle(fwModal.handle)}.`, 'success');
      setFwModal(null);
      await loadFrameworks(handlesKey);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không ghi được hợp đồng nguyên tắc.', 'error');
    }
  };

  const openFramework = (handle: string) => {
    const cur = frameworks[normHandle(handle)];
    const defProfile = defaultLegalProfileOf(handle);
    setFwForm({
      contractNo: cur?.contractNo || defProfile?.frameworkContractCode || '',
      signedAt: cur?.signedAt || defProfile?.frameworkContractSignedAt || '',
      validTo: cur?.validTo || defProfile?.effectiveTo || '',
      fileUrl: cur?.fileUrl || defProfile?.frameworkContractDriveUrl || '',
      note: cur?.note || '',
      entityType: cur?.entityType || defProfile?.legalType || 'INDIVIDUAL',
      legalName: cur?.legalName || defProfile?.holderName || '',
      taxOrCccd: cur?.taxOrCccd || defProfile?.taxCode || defProfile?.cccd || '',
      bankName: cur?.bankName || defProfile?.bankName || '',
      bankAccount: cur?.bankAccount || defProfile?.bankAccount || '',
      bankHolder: cur?.bankHolder || defProfile?.holderName || '',
      authorizationUrl: cur?.authorizationUrl || '',
      hardcopyStatus: cur?.hardcopyStatus || 'ESIGN_VERIFIED',
      hardcopyDueAt: cur?.hardcopyDueAt || '',
      coveredHandlesText: (cur?.coveredHandles || []).join(', '),
    });
    setFwModal({ handle });
  };

  // Nghiệm thu video theo từng Job: chỉ chạy khi nhân viên bấm
  const runJobAcceptance = async (d: PlanDeal, job: DealJob) => {
    if (!job.airLink.trim()) return;
    setInspecting(true);
    try {
      const matchedCatalogProd = findCatalogProduct(catalog, job.productName, job.productGroupId)?.product;
      const effJobLinks = resolveEffectiveProductLinks(catalog, matchedCatalogProd);
      const effJobGuides = resolveEffectiveProductGuidelines(catalog, job.productGroupId, matchedCatalogProd);
      const effectiveExpectedCartUrl = effJobLinks.isMultiComponentLinks
        ? Array.from(new Set([job.cartUrl, ...effJobLinks.cartLinks.map(l => l.url)].filter(Boolean))).join('\n')
        : job.cartUrl || undefined;
      const customForbiddenClaims = [job.forbiddenClaims, effJobGuides.forbiddenClaims]
        .filter(Boolean)
        .join(',')
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/integrations/tiktok-koc/inspect-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [job.airLink.trim()],
          expectedHandle: d.kocHandle,
          expectedDeadline: job.deadline || undefined,
          expectedCartUrl: effectiveExpectedCartUrl,
          customForbiddenClaims,
          requiredUspKeywords: [job.usp, findCatalogProduct(catalog, job.productName, job.productGroupId)?.product.detectKeywords]
            .filter(Boolean)
            .join(',')
            .split(/[,;\n]/)
            .map(s => s.trim())
            .filter(Boolean),
          brandName: plan?.brandName,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.error || `Lỗi ${res.status}`);
      const r = (
        body.data as Array<{
          verdict: string;
          verdictSummary: string;
          checklist: { key: string; label: string; passed: boolean; detail: string }[];
          viewsCount: number;
          isOnTime: boolean;
          daysDelayed: number;
          publishedDate: string;
        }>
      )[0];
      if (!r) throw new Error('Không có kết quả kiểm tra.');
      const statusMap: Record<string, AcceptanceStatus> = { ĐẠT_CHUẨN: 'PASSED', CẦN_KIỂM_TRA: 'REVIEW', KHÔNG_ĐẠT: 'FAILED' };
      const st = statusMap[r.verdict] || 'REVIEW';
      patchJob(
        d.id,
        job.id,
        cur => ({
          ...cur,
          airedAt: r.publishedDate || cur.airedAt,
          acceptance: {
            ...cur.acceptance,
            status: st,
            checks: [
              ...(r.checklist || []).map(c => ({ key: c.key, label: c.label, passed: c.passed, detail: c.detail })),
              ...(job.affiliateUrl || effJobLinks.affiliateLinks.length > 0
                ? (() => {
                    const matchedAff = effJobLinks.affiliateLinks.find(a => a.url === job.affiliateUrl);
                    const airDate = (r.publishedDate || cur.airedAt || '').slice(0, 10);
                    const isExpired = Boolean(matchedAff?.validTo && airDate && matchedAff.validTo < airDate);
                    const hasAff = Boolean(job.affiliateUrl);
                    return [
                      {
                        key: 'AFFILIATE_COMMISSION',
                        label: 'Link Commission / Hoa hồng Affiliate',
                        passed: hasAff && !isExpired,
                        detail: !hasAff
                          ? 'Chưa gắn Link Commission cho Job dù sản phẩm có cấu hình link hoa hồng'
                          : isExpired
                            ? `Cảnh báo: Link Commission đã hết hạn ngày ${matchedAff?.validTo} (trước ngày Air ${airDate})`
                            : `Đã gắn Link Commission (${job.commissionPct !== null ? `${job.commissionPct}%` : 'Chưa ghi %'}) · ${matchedAff?.type === 'DESIGNATED' ? 'Hoa hồng chỉ định KOC' : 'Hoa hồng mở'}`,
                      },
                    ];
                  })()
                : []),
            ],
            summary: r.verdictSummary || '',
            views: typeof r.viewsCount === 'number' ? r.viewsCount : null,
            isOnTime: typeof r.isOnTime === 'boolean' ? r.isOnTime : null,
            daysDelayed: typeof r.daysDelayed === 'number' ? r.daysDelayed : null,
            checkedAt: new Date().toISOString(),
            confirmedBy: '',
            confirmedAt: '',
            confirmNote: '',
          },
        }),
        `Nghiệm thu video ${job.code}: ${ACCEPT_LABEL[st]}`
      );
      notify(`Kết quả nghiệm thu ${job.code}: ${ACCEPT_LABEL[st]}.`, st === 'PASSED' ? 'success' : 'warning');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không kiểm tra được video.', 'error');
    } finally {
      setInspecting(false);
    }
  };

  /** Thông tin thụ hưởng thật của Job; thiếu thì báo và trả null — không bao giờ điền STK/CCCD mẫu. */
  const resolveJobPayee = (d: PlanDeal, job: DealJob, matchedKoc: KocItem | undefined) => {
    const bankName = (job.payeeBankName || payeeQuickForm.bankName || matchedKoc?.bankName || '').trim();
    const bankAccount = (job.payeeBankAccount || payeeQuickForm.bankAccount || matchedKoc?.bankAccount || '').trim();
    const bankHolder = (job.payeeBankHolder || payeeQuickForm.bankHolder || matchedKoc?.realName || '').trim();
    const legalId = (job.payeeTaxOrCccd || payeeQuickForm.legalId || matchedKoc?.cccd || matchedKoc?.taxCode || '').trim();
    const missing = [
      !bankName && 'ngân hàng',
      !bankAccount && 'số tài khoản',
      !bankHolder && 'chủ tài khoản',
      !legalId && 'CCCD/MST',
    ].filter(Boolean);
    if (missing.length > 0) {
      notify(`${job.code} (@${normHandle(d.kocHandle)}): thiếu ${missing.join(', ')} của người thụ hưởng — bổ sung trước khi lập phiếu.`, 'warning');
      return null;
    }
    return { bankName, bankAccount, bankHolder, legalId };
  };

  /**
   * Đẩy phiếu đề nghị thanh toán về Lark theo từng Job sau khi đã duyệt KOC, ký phụ lục Job và nghiệm thu Job.
   */
  const pushJobToLarkPayment = async (d: PlanDeal, job: DealJob) => {
    if (!plan) return;
    const blocker = jobPaymentBlocker(job);
    if (blocker) {
      notify(blocker, 'warning');
      return;
    }
    const fw = frameworks[normHandle(d.kocHandle)];
    const matchedKoc = kocOfHandle(d.kocHandle);
    const bookingDeal = planJobToBookingDeal(d, job, plan, matchedKoc?.id, fw?.contractNo);
    const taxCalc = computeJobContractAmounts(job);
    // Tất toán = tổng − phần đã tạm ứng; máy chủ còn đối chiếu sổ phiếu tạm ứng để trừ lần nữa nếu client chưa cập nhật.
    const effectiveAmount = job.payment.amount ?? taxCalc.remainingSettlementAmount;
    const dealPayload: BookingDealItem = {
      ...bookingDeal,
      totalValue: taxCalc.netAmount + jobDroppedFee(job),
      ...(taxCalc.advancePaidAmount > 0 ? { status: 'ADVANCE_PAID' as const, advanceAmount: taxCalc.advancePaidAmount } : {}),
      finalAmount: effectiveAmount,
      postedDate: job.airedAt || getVietnamDateYmd(),
      postDate: job.airedAt || getVietnamDateYmd(),
      contractScanUrl: job.appendixUrl || fw?.fileUrl || '',
      signedContractUrl: job.appendixUrl || fw?.fileUrl || '',
    };

    const payee = resolveJobPayee(d, job, matchedKoc);
    if (!payee) return;
    const { bankName, bankAccount, bankHolder, legalId } = payee;

    setPushingLarkJobId(job.id);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'SETTLEMENT',
          deals: [dealPayload],
          planJobRefs: [{ planId: plan.id, dealId: d.id, jobId: job.id }],
          kocs: matchedKoc ? [matchedKoc] : [],
          sharedPayeeOverride: {
            bankName,
            bankAccount,
            bankHolder,
            legalId,
            linkAir: job.airLink.trim(),
            postedDate: job.airedAt || getVietnamDateYmd(),
            sparkAdsCode: job.sparkAdsCode || '',
            adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
            contractUrl: job.appendixUrl || fw?.fileUrl || '',
            bbntUrl: job.bbntUrl || '',
          },
          actorName: currentUserName,
          month: plan.month,
          note: `Thanh toán theo Job ${job.code} (Deal ${d.code} · Phụ lục ${job.appendixNo} · ${taxCalc.ruleSummary})`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const firstIssue = body?.issues?.[0]?.message;
        throw new Error(firstIssue || body?.message || body?.error || `Lỗi ${res.status}`);
      }
      const slip = body.slip as {
        slipCode: string;
        larkSync: { approvalInstanceCode: string; larkbaseRecordId: string; syncedAt: string };
      };
      const todayStr = getVietnamDateYmd();
      patchJob(
        d.id,
        job.id,
        cur => ({
          ...cur,
          payment: {
            ...cur.payment,
            status: 'REQUESTED',
            amount: cur.payment.amount ?? computeJobContractAmounts(cur).remainingSettlementAmount,
            requestedAt: cur.payment.requestedAt || todayStr,
            larkSlipCode: slip.slipCode || '',
            larkApprovalCode: slip.larkSync?.approvalInstanceCode || '',
            larkRecordId: slip.larkSync?.larkbaseRecordId || '',
            larkSyncedAt: slip.larkSync?.syncedAt || new Date().toISOString(),
          },
        }),
        `Đẩy Job ${job.code} về Lark thanh toán (${slip.slipCode} · ${slip.larkSync?.approvalInstanceCode})`
      );
      notify(`Đã đẩy Job ${job.code} về Lark cho Kế toán thanh toán (Mã phiếu: ${slip.slipCode}).`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đẩy được phiếu thanh toán sang Lark.', 'error');
    } finally {
      setPushingLarkJobId(null);
    }
  };

  /** Đẩy Phiếu Tạm ứng trước Air (Pipeline 8) sang Lark 6.1 */
  const pushAdvancePaymentToLark = async (d: PlanDeal, job: DealJob) => {
    if (!plan) return;
    if (!job.appendixNo.trim()) {
      notify('Cần điền số phụ lục đã ký trước khi đẩy phiếu Tạm ứng.', 'warning');
      return;
    }
    const jobAmounts = computeJobContractAmounts(job);
    const advAmt = job.advancePayment?.amount ?? Math.round(jobAmounts.netAmount * 0.5);
    if (advAmt <= 0) {
      notify('Số tiền tạm ứng phải lớn hơn 0đ.', 'warning');
      return;
    }
    if (advAmt > jobAmounts.netAmount) {
      notify(`Số tiền tạm ứng (${fmt(advAmt)}đ) vượt tổng thù lao Net của Job (${fmt(jobAmounts.netAmount)}đ).`, 'warning');
      return;
    }
    const fw = frameworks[normHandle(d.kocHandle)];
    const matchedKoc = kocOfHandle(d.kocHandle);
    const bookingDeal = planJobToBookingDeal(d, job, plan, matchedKoc?.id, fw?.contractNo);
    // totalValue giữ tổng thù lao (để xét BR-03 đúng giá trị HĐ); số tạm ứng truyền qua advanceAmount.
    const dealPayload: BookingDealItem = {
      ...bookingDeal,
      advanceAmount: advAmt,
      finalAmount: advAmt,
      contractScanUrl: job.appendixUrl || fw?.fileUrl || '',
      signedContractUrl: job.appendixUrl || fw?.fileUrl || '',
    };
    const payee = resolveJobPayee(d, job, matchedKoc);
    if (!payee) return;
    const { bankName, bankAccount, bankHolder, legalId } = payee;

    setPushingLarkJobId(job.id);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'ADVANCE',
          deals: [dealPayload],
          planJobRefs: [{ planId: plan.id, dealId: d.id, jobId: job.id }],
          kocs: matchedKoc ? [matchedKoc] : [],
          sharedPayeeOverride: {
            bankName,
            bankAccount,
            bankHolder,
            legalId,
            contractUrl: job.appendixUrl || fw?.fileUrl || '',
          },
          actorName: currentUserName,
          month: plan.month,
          note: `Tạm ứng trước Air cho ${job.code} (Deal ${d.code} · Phụ lục ${job.appendixNo})`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const firstIssue = body?.issues?.[0]?.message;
        throw new Error(firstIssue || body?.message || body?.error || `Lỗi ${res.status}`);
      }
      const slip = body.slip as { slipCode: string };
      const todayStr = getVietnamDateYmd();
      patchJob(
        d.id,
        job.id,
        cur => ({
          ...cur,
          advancePayment: {
            status: 'REQUESTED',
            amount: advAmt,
            requestedAt: todayStr,
            paidAt: cur.advancePayment?.paidAt || '',
            larkSlipCode: slip.slipCode || '',
            uncBillUrl: cur.advancePayment?.uncBillUrl || '',
          },
        }),
        `Đẩy Phiếu Tạm ứng ${job.code} về Lark (${slip.slipCode} · ${fmt(advAmt)}đ)`
      );
      notify(`Đã đẩy Phiếu Tạm ứng ${job.code} về Lark 6.1 (${slip.slipCode}).`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đẩy được phiếu tạm ứng sang Lark.', 'error');
    } finally {
      setPushingLarkJobId(null);
    }
  };

  /** Gom nhiều Job đã đủ điều kiện thành 1 Phiếu ĐNTT Lark 6.1 duy nhất */
  const pushBundleJobsToLarkPayment = async () => {
    if (!plan || selectedBundleJobIds.length === 0) return;
    const selectedPairs: { deal: PlanDeal; job: DealJob }[] = [];
    for (const d of deals) {
      for (const j of d.jobs || []) {
        if (selectedBundleJobIds.includes(j.id)) selectedPairs.push({ deal: d, job: j });
      }
    }
    if (selectedPairs.length === 0) return;
    for (const { job } of selectedPairs) {
      const b = jobPaymentBlocker(job);
      if (b) {
        notify(`${job.code}: ${b}`, 'warning');
        return;
      }
    }
    const firstPair = selectedPairs[0];
    // Một phiếu chỉ chuyển cho một người thụ hưởng: chỉ gom các Job của cùng KOC.
    const handles = new Set(selectedPairs.map(p => normHandle(p.deal.kocHandle)));
    if (handles.size > 1) {
      notify(`Đang chọn Job của ${handles.size} KOC khác nhau. Mỗi phiếu ĐNTT chỉ gom Job của cùng một KOC — tách thành nhiều phiếu.`, 'warning');
      return;
    }
    const fw = frameworks[normHandle(firstPair.deal.kocHandle)];
    const matchedKoc = kocOfHandle(firstPair.deal.kocHandle);
    const overridesByDealId: Record<string, DealPaymentOverrides> = {};
    const dealPayloads: BookingDealItem[] = selectedPairs.map(({ deal: d, job }) => {
      const bookingDeal = planJobToBookingDeal(d, job, plan, kocOfHandle(d.kocHandle)?.id, frameworks[normHandle(d.kocHandle)]?.contractNo);
      const taxCalc = computeJobContractAmounts(job);
      const effectiveAmount = job.payment.amount ?? taxCalc.remainingSettlementAmount;
      // Link air / ngày air / mã Ads là của từng Job, không dùng chung của Job đầu tiên.
      overridesByDealId[bookingDeal.id] = {
        linkAir: job.airLink.trim(),
        postedDate: job.airedAt || getVietnamDateYmd(),
        sparkAdsCode: job.sparkAdsCode || '',
        adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
        contractUrl: job.appendixUrl || fw?.fileUrl || '',
        bbntUrl: job.bbntUrl || '',
      };
      return {
        ...bookingDeal,
        totalValue: taxCalc.netAmount + jobDroppedFee(job),
        ...(taxCalc.advancePaidAmount > 0 ? { status: 'ADVANCE_PAID' as const, advanceAmount: taxCalc.advancePaidAmount } : {}),
        finalAmount: effectiveAmount,
        postedDate: job.airedAt || getVietnamDateYmd(),
        postDate: job.airedAt || getVietnamDateYmd(),
        contractScanUrl: job.appendixUrl || fw?.fileUrl || '',
        signedContractUrl: job.appendixUrl || fw?.fileUrl || '',
      };
    });

    const payee = resolveJobPayee(firstPair.deal, firstPair.job, matchedKoc);
    if (!payee) return;
    const { bankName, bankAccount, bankHolder, legalId } = payee;

    setBundlingLark(true);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'SETTLEMENT',
          deals: dealPayloads,
          planJobRefs: selectedPairs.map(p => ({ planId: plan.id, dealId: p.deal.id, jobId: p.job.id })),
          kocs: matchedKoc ? [matchedKoc] : [],
          sharedPayeeOverride: {
            bankName,
            bankAccount,
            bankHolder,
            legalId,
          },
          overridesByDealId,
          actorName: currentUserName,
          month: plan.month,
          note: `Gom ${selectedPairs.length} Job (${selectedPairs.map(p => p.job.code).join(', ')}) vào 1 Phiếu ĐNTT Lark 6.1`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const firstIssue = body?.issues?.[0]?.message;
        throw new Error(firstIssue || body?.message || body?.error || `Lỗi ${res.status}`);
      }
      const slip = body.slip as {
        slipCode: string;
        larkSync: { approvalInstanceCode: string; larkbaseRecordId: string; syncedAt: string };
      };
      const todayStr = getVietnamDateYmd();
      const idSet = new Set(selectedBundleJobIds);
      setDeals(
        deals.map(d => {
          const hasMatch = (d.jobs || []).some(j => idSet.has(j.id));
          if (!hasMatch) return d;
          const nextJobs = (d.jobs || []).map(cur =>
            idSet.has(cur.id)
              ? {
                  ...cur,
                  payment: {
                    ...cur.payment,
                    status: 'REQUESTED' as PaymentStatus,
                    amount: cur.payment.amount ?? computeJobContractAmounts(cur).remainingSettlementAmount,
                    requestedAt: cur.payment.requestedAt || todayStr,
                    larkSlipCode: slip.slipCode || '',
                    larkApprovalCode: slip.larkSync?.approvalInstanceCode || '',
                    larkRecordId: slip.larkSync?.larkbaseRecordId || '',
                    larkSyncedAt: slip.larkSync?.syncedAt || new Date().toISOString(),
                  },
                }
              : cur
          );
          return pushEvent(
            syncDealSummaryFields({ ...d, jobs: nextJobs }),
            currentUserName,
            `Gom thanh toán sang Lark 6.1 (${slip.slipCode})`
          );
        })
      );
      setBundlePaymentOpen(false);
      setSelectedBundleJobIds([]);
      notify(`Đã gom ${selectedPairs.length} Job đẩy vào 1 Phiếu ĐNTT Lark 6.1 (${slip.slipCode}).`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không gom được phiếu thanh toán sang Lark.', 'error');
    } finally {
      setBundlingLark(false);
    }
  };

  const [syncingLark32, setSyncingLark32] = useState(false);

  /** Đồng bộ toàn bộ Job (kể cả FOC 0đ) sang Bảng 3.2 List duyệt book trên Lark tại Mốc 1 (Chốt Deal/Job) & Mốc 2 (Đã Air & Nghiệm thu) */
  const syncJobsToLark32BookingList = async () => {
    if (!plan) return;
    const allJobsPayload: Array<{
      jobId: string;
      jobCode: string;
      dealCode: string;
      brandName: string;
      storeName: string;
      month: string;
      kocName: string;
      kocHandle: string;
      grade: string;
      fee: number;
      sampleStatus: string;
      trackingNo: string;
      airLink: string;
      airedAt: string;
      sparkAdsCode: string;
      acceptanceStatus: string;
      existingRecordId: string;
    }> = [];
    for (const d of deals) {
      for (const j of d.jobs || []) {
        if (j.lifecycleStatus && j.lifecycleStatus !== 'ACTIVE') continue;
        allJobsPayload.push({
          jobId: j.id,
          jobCode: j.code,
          dealCode: d.code,
          brandName: plan.brandName,
          storeName: plan.storeName || plan.title,
          month: plan.month,
          kocName: d.kocName || d.kocHandle,
          kocHandle: d.kocHandle,
          grade: d.grade,
          fee: jobTotalFee(j),
          sampleStatus: j.sample.status,
          trackingNo: j.sample.trackingNo || '',
          airLink: j.airLink || '',
          airedAt: j.airedAt || '',
          sparkAdsCode: j.sparkAdsCode || '',
          acceptanceStatus: j.acceptance.status,
          existingRecordId: j.payment.larkRecordId || '',
        });
      }
    }
    if (allJobsPayload.length === 0) {
      notify('Chưa có Job đang hoạt động nào để đồng bộ sang Lark 3.2.', 'warning');
      return;
    }
    setSyncingLark32(true);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SYNC_LARK_32_BOOKING_LIST',
          jobs: allJobsPayload,
          actorName: currentUserName,
          month: plan.month,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.message || body?.error || `Lỗi ${res.status}`);
      const syncedMap = new Map<string, { larkRecordId: string; syncedAt: string; isFoc: boolean }>(
        ((body.syncedJobs as Array<{ jobId: string; larkRecordId: string; syncedAt: string; isFoc: boolean }>) || []).map(x => [x.jobId, x])
      );
      setDeals(
        deals.map(d => {
          const nextJobs = (d.jobs || []).map(j => {
            const s = syncedMap.get(j.id);
            if (!s) return j;
            return {
              ...j,
              payment: {
                ...j.payment,
                larkRecordId: s.larkRecordId,
                larkSyncedAt: s.syncedAt,
              },
            };
          });
          return syncDealSummaryFields({ ...d, jobs: nextJobs });
        })
      );
      const focCount = Array.from(syncedMap.values()).filter(x => x.isFoc).length;
      notify(
        body.simulated
          ? `Giả lập: ${syncedMap.size} Job (gồm ${focCount} Job FOC 0đ) CHƯA được gửi lên Lark 3.2.`
          : `Đã đồng bộ ${syncedMap.size} Job (gồm ${focCount} Job FOC 0đ) sang Lark 3.2 List duyệt book.`,
        body.simulated ? 'warning' : 'success'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đồng bộ được sang Lark 3.2.', 'error');
    } finally {
      setSyncingLark32(false);
    }
  };

  /** Đồng bộ Vòng 2 lên Google Sheet Brand: đẩy Link kịch bản, Link video demo (sau khi đạt duyệt nội bộ Vòng 1), Link Air */
  const openStage2SheetModal = () => {
    if (!plan) return;
    setStage2SheetUrl(stage2SheetUrl || resolveBrandBookingSheetUrl(plan.brandName, plan.storeName));
    setStage2TabName(stage2TabName || defaultBookingTabName(plan.month));
    setStage2SheetOpen(true);
  };

  const pushStage2ToBrandSheet = async () => {
    if (!plan) return;
    if (!stage2SheetUrl.trim()) {
      notify('Dán link Google Sheet của Brand trước khi đồng bộ.', 'warning');
      return;
    }
    const stage2Rows: (string | number)[][] = [];
    let rowIdx = 1;
    for (const d of deals) {
      const matchedKoc = kocOfHandle(d.kocHandle);
      for (const j of d.jobs || []) {
        const cleanId = d.kocHandle.replace(/^@/, '').trim();
        // Chỉ đẩy Link Video Demo sang Brand khi đã Đạt duyệt nội bộ Vòng 1 (Pipeline 12.1)
        const safeDemoUrl = j.script.internalDemoAuditStatus === 'PASSED' ? (j.script.demoUrl || '') : '';
        stage2Rows.push([
          rowIdx++,
          j.briefCode || '',
          j.week ? j.week.split(' ')[0] : 'Chưa xếp tuần',
          d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade,
          j.pillar || '',
          j.productName || j.productGroupName || '',
          j.pic || d.pic || plan.pic || '',
          [j.angle, j.hook, j.usp].filter(Boolean).join(' — '),
          cleanId,
          cleanId ? `https://www.tiktok.com/@${cleanId}` : '',
          d.kocName || matchedKoc?.stageName || '',
          matchedKoc?.followers || '',
          matchedKoc?.tepKenh || matchedKoc?.niche || '',
          j.videoFee > 0 ? Math.round(j.videoFee) : 0,
          matchedKoc?.gmvBestCase || '',
          matchedKoc?.gpm || '',
          matchedKoc?.historicalRoi !== undefined ? Number(matchedKoc.historicalRoi.toFixed(2)) : '',
          matchedKoc?.totalPastDeals ?? '',
          '',
          'Yes',
          '',
          '',
          j.script.scriptUrl || '',
          j.script.status === 'APPROVED' ? 'Yes' : j.script.status === 'CHANGES' ? 'Sửa' : '',
          safeDemoUrl,
          j.script.demoStatus === 'APPROVED' ? 'Yes' : j.script.demoStatus === 'CHANGES' ? 'Sửa' : '',
          j.script.note || '',
          j.airLink || '',
        ]);
      }
    }
    setStage2Syncing(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          sheetUrl: stage2SheetUrl.trim(),
          tabName: (stage2TabName || defaultBookingTabName(plan.month)).trim(),
          header: [...BOOKING_LIST_COLUMNS],
          rows: stage2Rows,
          items: [],
          actor: currentUserName,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
      notify(`Đã đẩy Link Kịch bản / Video Demo (đạt Vòng 1) / Link Air lên Google Sheet Brand.`, 'success');
      setStage2SheetOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đẩy được lên Google Sheet.', 'error');
    } finally {
      setStage2Syncing(false);
    }
  };

  // Kéo Sheet 2 bước: xem trước thay đổi / mâu thuẫn rồi mới ghi
  const [stage2Preview, setStage2Preview] = useState<SheetPullChange[] | null>(null);
  const pullStage2FromBrandSheet = async (confirm = false) => {
    if (!plan) return;
    if (!stage2SheetUrl.trim()) {
      notify('Dán link Google Sheet của Brand trước khi kéo kết quả.', 'warning');
      return;
    }
    setStage2Syncing(true);
    try {
      await saveNow();
      const tabValue = (stage2TabName || defaultBookingTabName(plan.month)).trim();
      const res = await fetch('/api/booking-list/pull-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          sheetUrl: stage2SheetUrl.trim(),
          tab: tabValue,
          tabName: tabValue,
          dryRun: !confirm,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
      if (!confirm) {
        setStage2Preview(body.changes || []);
        return;
      }
      // Tải lại Deal Board sau khi server đã cập nhật kết quả Brand duyệt KB/Demo
      await reload();
      setStage2Preview(null);
      notify(`Đã kéo kết quả Brand duyệt Kịch bản / Video Demo từ Google Sheet.`, 'success');
      setStage2SheetOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không đọc được Google Sheet.', 'error');
    } finally {
      setStage2Syncing(false);
    }
  };

  /* ------------------------------------------------------------ Chi tiết Deal & từng Job */
  const productsOfGroup = (groupId: string) => catalog.groups.find(g => g.id === groupId)?.products || [];

  const renderDealModal = (d: PlanDeal) => {
    const jobs = d.jobs || [];
    const job = jobs.find(j => j.id === activeJobId) || jobs[0];
    if (!job) return null;

    const setJob = (fn: (x: DealJob) => DealJob, log?: string) => patchJob(d.id, job.id, fn, log);
    const prod =
      productsOfGroup(job.productGroupId).find(p => p.name === job.productName) ||
      findCatalogProduct(catalog, job.productName, job.productGroupId)?.product;
    const effLinks = resolveEffectiveProductLinks(catalog, prod);
    const sentCountsByProductKey: Record<string, number> = {};
    for (const dealItem of deals) {
      for (const jItem of dealItem.jobs || []) {
        if (jItem.sample.status === 'SENT' || jItem.sample.status === 'RECEIVED') {
          const found = findCatalogProduct(catalog, jItem.productName, jItem.productGroupId);
          if (found) sentCountsByProductKey[found.product.id] = (sentCountsByProductKey[found.product.id] || 0) + 1;
          const kName = (jItem.productName || '').trim().toLowerCase();
          if (kName) sentCountsByProductKey[kName] = (sentCountsByProductKey[kName] || 0) + 1;
        }
      }
    }
    const sampleQuotaInfo = resolveEffectiveSampleQuota(catalog, prod, sentCountsByProductKey);
    const substituteProd = prod?.substituteProductId ? findCatalogProduct(catalog, prod.substituteProductId) : null;
    const blocker = jobPaymentBlocker(job);
    const stage = jobStageOf(job);
    const fw = frameworks[normHandle(d.kocHandle)];
    const kocLegalProfiles = legalProfilesOfHandle(d.kocHandle);
    const addonsActiveFee = jobAddonsFee(job);
    const addonsDroppedFee = jobDroppedFee(job);
    const totalJobNet = jobTotalFee(job);
    const taxCalc = computeJobContractAmounts(job);
    const holderMatched = isAccountHolderMatched(job);
    const airLinkLocked = isAirLinkLocked(job, closingState);
    const jobPipe = computeJobPipelineState(job, fw);
    const needLegalFinance = requiresLegalFinanceReview(job);
    const needLateExplanation = requiresLateSigningExplanation(job);

    const addAddon = () => {
      const nextAddon: JobAddonItem = {
        id: newAddonId(),
        type: 'ADS_CODE',
        label: ADDON_TYPE_LABEL.ADS_CODE,
        fee: 0,
        status: 'PENDING',
        evidence: '',
      };
      setJob(cur => ({ ...cur, addons: [...(cur.addons || []), nextAddon] }), `Thêm dịch vụ gia tăng cho ${job.code}`);
    };

    const updateAddon = (addonId: string, patch: Partial<JobAddonItem>) => {
      setJob(cur => ({
        ...cur,
        addons: (cur.addons || []).map(a => (a.id === addonId ? { ...a, ...patch } : a)),
      }));
    };

    const removeAddon = (addonId: string) => {
      setJob(
        cur => ({
          ...cur,
          addons: (cur.addons || []).filter(a => a.id !== addonId),
        }),
        `Xóa dịch vụ gia tăng khỏi ${job.code}`
      );
    };

    const perfRow = (key: 'd14' | 'd30' | 'd60', label: string) => (
      <tr key={key}>
        <td className={TD}>
          {label}
          {job.performance[key].daysInWindow !== undefined && (
            <div className="text-xs text-ink-3">
              Daily {job.performance[key].daysCovered}/{job.performance[key].daysInWindow} ngày
            </div>
          )}
        </td>
        {(['views', 'orders', 'gmv'] as const).map(f => (
          <td key={f} className={TD}>
            <Input
              type="number"
              min={0}
              className="h-8 text-right"
              value={job.performance[key][f] ?? ''}
              onChange={e =>
                setJob(x => ({
                  ...x,
                  // Sửa tay thì bỏ nhãn độ phủ daily vì số không còn là số tự cộng
                  performance: {
                    ...x.performance,
                    [key]: { ...x.performance[key], [f]: e.target.value === '' ? null : Number(e.target.value), daysCovered: undefined, daysInWindow: undefined },
                  },
                }))
              }
            />
          </td>
        ))}
        <td className={`${TD} text-right text-ink-2`}>
          {totalJobNet > 0 && job.performance[key].gmv !== null ? (job.performance[key].gmv! / totalJobNet).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'}
        </td>
      </tr>
    );

    return (
      <div className="space-y-5">
        {/* Thông tin chung của Deal cha */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-sunken px-3 py-2 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
            <span className="font-semibold text-ink">Deal {d.code}</span>
            <span className="font-medium text-ink">@{d.kocHandle}</span>
            <span>{d.kocName}</span>
            <span>Bậc: {d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade}</span>
            <span>HĐNT: {fw?.contractNo || kocLegalProfiles[0]?.frameworkContractCode || 'Chưa ghi'}</span>
            <span>Hồ sơ pháp lý: {kocLegalProfiles.length || 1} bộ</span>
            <span>Số lượng Job: {jobs.length}</span>
            <span className="font-semibold text-ink">Tổng Deal Net: {fmt(dealTotalFee(d))}đ</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {job.airLink.trim() && (
              <Button size="sm" variant="secondary" onClick={() => addUpsellJobAfterAir(d, job)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Phụ lục SOW phát sinh sau Air
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={() => addNewJobInsideDeal(d)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm Job
            </Button>
          </div>
        </div>

        {/* 4 Nhánh Pipeline Song Song 7 -> 18 & Quả bóng trách nhiệm */}
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-2.5 text-xs md:grid-cols-5">
          <div className="rounded border border-line bg-sunken px-2 py-1.5">
            <div className="text-2xs text-ink-3">Nhánh Pháp lý &amp; HĐ</div>
            <div className="font-semibold text-ink">{jobPipe.legalTrack}</div>
          </div>
          <div className="rounded border border-line bg-sunken px-2 py-1.5">
            <div className="text-2xs text-ink-3">Nhánh Sản phẩm mẫu</div>
            <div className="font-semibold text-ink">{jobPipe.sampleTrack}</div>
          </div>
          <div className="rounded border border-line bg-sunken px-2 py-1.5">
            <div className="text-2xs text-ink-3">Nhánh Kịch bản / Demo / Air</div>
            <div className="font-semibold text-ink">{jobPipe.contentTrack}</div>
          </div>
          <div className="rounded border border-line bg-sunken px-2 py-1.5">
            <div className="text-2xs text-ink-3">Nhánh Hóa đơn &amp; Thanh toán</div>
            <div className="font-semibold text-ink">{jobPipe.financeTrack}</div>
          </div>
          <div className="rounded border border-accent bg-accent-soft px-2 py-1.5">
            <div className="text-2xs text-ink-3">Trách nhiệm xử lý tiếp</div>
            <div className="font-semibold text-ink">{jobPipe.ballLabel}</div>
          </div>
        </div>

        {/* Thanh chuyển đổi giữa các Job trong Deal */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
          {jobs.map((j, idx) => {
            const isSelected = j.id === job.id;
            const jStage = STAGES.find(s => s.key === jobStageOf(j))?.label;
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => setActiveJobId(j.id)}
                className={`rounded-md border px-3 py-1.5 text-left text-xs transition ${
                  isSelected ? 'border-accent bg-accent-soft font-semibold text-ink' : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                }`}
              >
                <div>
                  {j.code} · {j.title || `Job ${idx + 1}`}
                  {j.isPostAirUpsell ? ' [Phụ lục sau Air]' : ''}
                </div>
                <div className="mt-0.5 text-2xs text-ink-3">
                  {fmt(jobTotalFee(j))}đ · {jStage}
                  {j.payment.larkSlipCode ? ` · ${j.payment.larkSlipCode}` : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Khu vực 1: Định danh Job, Nền tảng Đa sàn, Hình thức sản xuất & Dịch vụ gia tăng */}
        <section className="space-y-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">
              1. Cấu trúc {job.code} · Nền tảng Đa sàn &amp; Dịch vụ gia tăng
            </div>
            {jobs.length > 1 && (
              <Button size="sm" variant="secondary" disabled={job.payment.status !== 'NONE'} onClick={() => removeJobFromDeal(d, job)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Xóa Job này
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Tên Job / Nội dung">
              <Input value={job.title} onChange={e => setJob(x => ({ ...x, title: e.target.value }))} />
            </Field>
            <Field label="Tuần lên sóng">
              <Input value={job.week} placeholder="W41" onChange={e => setJob(x => ({ ...x, week: e.target.value }))} />
            </Field>
            <Field label="Chuyên viên phụ trách (PIC)">
              <Input value={job.pic} onChange={e => setJob(x => ({ ...x, pic: e.target.value }))} />
            </Field>
            <Field label="Thù lao Net 1 Video chính (VNĐ)">
              <Input
                type="number"
                min={0}
                value={job.videoFee}
                onChange={e => setJob(x => ({ ...x, videoFee: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-md border border-line bg-sunken/50 p-3 md:grid-cols-4">
            <Field label="Kênh đăng nội dung (Publish Platform)">
              <Select
                value={job.publishPlatform || 'TIKTOK'}
                onChange={e => setJob(x => ({ ...x, publishPlatform: e.target.value as PublishPlatform }))}
              >
                {(Object.keys(PUBLISH_PLATFORM_LABEL) as PublishPlatform[]).map(k => (
                  <option key={k} value={k}>
                    {PUBLISH_PLATFORM_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kênh bán / gắn link (Commerce Platform)">
              <Select
                value={job.commercePlatform || 'TIKTOK_SHOP'}
                onChange={e => setJob(x => ({ ...x, commercePlatform: e.target.value as CommercePlatform }))}
              >
                {(Object.keys(COMMERCE_PLATFORM_LABEL) as CommercePlatform[]).map(k => (
                  <option key={k} value={k}>
                    {COMMERCE_PLATFORM_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hình thức sản xuất & sử dụng">
              <Select
                value={job.productionMode || 'ORIGINAL'}
                onChange={e => setJob(x => ({ ...x, productionMode: e.target.value as ContentProductionMode }))}
              >
                {(Object.keys(PRODUCTION_MODE_LABEL) as ContentProductionMode[]).map(k => (
                  <option key={k} value={k}>
                    {PRODUCTION_MODE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Chế độ hiển thị đơn giá trên Phụ lục SOW">
              <Select
                value={job.pricingDisplayMode || 'PACKAGE_ALL_IN'}
                onChange={e => setJob(x => ({ ...x, pricingDisplayMode: e.target.value as PricingDisplayMode }))}
              >
                {(Object.keys(PRICING_DISPLAY_MODE_LABEL) as PricingDisplayMode[]).map(k => (
                  <option key={k} value={k}>
                    {PRICING_DISPLAY_MODE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-ink">
                Dịch vụ gia tăng đi kèm Video ({(job.addons || []).length})
              </div>
              <Button size="sm" variant="secondary" onClick={addAddon}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Thêm dịch vụ gia tăng
              </Button>
            </div>

            {(job.addons || []).length === 0 ? (
              <div className="rounded-md border border-dashed border-line px-3 py-3 text-center text-xs text-ink-3">
                Chưa có dịch vụ gia tăng nào trong Job này. Bấm &ldquo;Thêm dịch vụ gia tăng&rdquo; để khai báo Mã Spark Ads, Reup đa kênh, Hình ảnh...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[680px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Hạng mục dịch vụ</th>
                      <th className={TH}>Chi tiết cam kết</th>
                      <th className={`${TH} text-right`}>Phí Net (VNĐ)</th>
                      <th className={TH}>Mã Ads / Link nghiệm thu</th>
                      <th className={TH}>Nghiệm thu DVGT</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {(job.addons || []).map(addon => (
                      <tr key={addon.id}>
                        <td className={TD}>
                          <Select
                            value={addon.type}
                            onChange={e => {
                              const nextType = e.target.value as JobAddonType;
                              updateAddon(addon.id, { type: nextType, label: ADDON_TYPE_LABEL[nextType] });
                            }}
                          >
                            {(Object.keys(ADDON_TYPE_LABEL) as JobAddonType[]).map(t => (
                              <option key={t} value={t}>
                                {ADDON_TYPE_LABEL[t]}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className={TD}>
                          <Input value={addon.label} onChange={e => updateAddon(addon.id, { label: e.target.value })} />
                        </td>
                        <td className={TD}>
                          <Input
                            type="number"
                            min={0}
                            className="w-28 text-right"
                            value={addon.fee}
                            onChange={e => updateAddon(addon.id, { fee: Math.max(0, Number(e.target.value) || 0) })}
                          />
                        </td>
                        <td className={TD}>
                          <Input
                            value={addon.evidence}
                            placeholder="Mã Spark Ads hoặc link bài..."
                            onChange={e => updateAddon(addon.id, { evidence: e.target.value })}
                          />
                        </td>
                        <td className={TD}>
                          <Select
                            value={addon.status}
                            onChange={e => updateAddon(addon.id, { status: e.target.value as JobAddonStatus })}
                          >
                            {(Object.keys(ADDON_STATUS_LABEL) as JobAddonStatus[]).map(st => (
                              <option key={st} value={st}>
                                {ADDON_STATUS_LABEL[st]}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className={`${TD} text-right`}>
                          <Button size="sm" variant="secondary" onClick={() => removeAddon(addon.id)}>
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
              <span>
                Video chính: <strong className="text-ink">{fmt(job.videoFee)}đ</strong> · Dịch vụ gia tăng:{' '}
                <strong className="text-ink">{fmt(addonsActiveFee)}đ</strong>
                {addonsDroppedFee > 0 ? ` (Đã trừ hủy: ${fmt(addonsDroppedFee)}đ)` : ''}
              </span>
              <span>
                Tổng thù lao Net của {job.code}: <strong className="text-sm text-ink">{fmt(totalJobNet)}đ</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Khu vực 2: Hồ sơ pháp lý 1-N, Quy tắc Thuế theo Pháp nhân & Ký Phụ lục hợp đồng theo từng Job */}
        <section className="space-y-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">
              2. Hồ sơ pháp lý thụ hưởng (1–N) &amp; Phụ lục hợp đồng ({job.code})
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {plan && onOpenContract && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    onOpenContract(
                      planJobToBookingDeal(d, job, plan, kocIdOfHandle(d.kocHandle), fw?.contractNo),
                      'SOW'
                    )
                  }
                >
                  {job.appendixNo.trim() ? 'Xem Phụ lục SOW' : 'Ký Phụ lục SOW (Bắt đầu Deal)'}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => void loadContracts()}>
                Tải lại hồ sơ
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-md border border-line bg-sunken/50 p-3 md:grid-cols-4">
            <Field label={`Chọn Hồ sơ pháp lý của @${d.kocHandle} (${kocLegalProfiles.length} bộ)`} className="md:col-span-2">
              <Select
                value={job.legalProfileId || ''}
                onChange={e => {
                  const nextId = e.target.value;
                  const found = kocLegalProfiles.find(lp => lp.id === nextId);
                  if (!found) {
                    setJob(cur => ({ ...cur, legalProfileId: '' }));
                    return;
                  }
                  setJob(
                    cur => ({
                      ...cur,
                      legalProfileId: found.id,
                      entityType: found.legalType || 'INDIVIDUAL',
                      payeeLegalName: found.holderName || cur.payeeLegalName,
                      payeeTaxOrCccd: found.taxCode || found.cccd || cur.payeeTaxOrCccd,
                      payeeBankName: found.bankName || cur.payeeBankName,
                      payeeBankAccount: found.bankAccount || cur.payeeBankAccount,
                      payeeBankHolder: found.holderName || cur.payeeBankHolder,
                      vatPct: found.legalType === 'COMPANY' ? 8 : 0,
                    }),
                    `Gắn hồ sơ pháp lý "${found.profileCode}" (${LEGAL_ENTITY_LABEL[found.legalType]}) cho ${job.code}`
                  );
                }}
              >
                <option value="">-- Nhập tay hoặc chọn Hồ sơ pháp lý đã lưu --</option>
                {kocLegalProfiles.map(lp => (
                  <option key={lp.id} value={lp.id}>
                    {lp.profileCode} · {LEGAL_ENTITY_LABEL[lp.legalType]} · {lp.holderName} · {lp.bankName} {lp.bankAccount}
                    {lp.isDefault ? ' [Mặc định]' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Loại pháp nhân ký kết">
              <Select
                value={job.entityType || 'INDIVIDUAL'}
                onChange={e => {
                  const nextEntity = e.target.value as LegalEntityType;
                  setJob(cur => ({
                    ...cur,
                    entityType: nextEntity,
                    vatPct: nextEntity === 'COMPANY' ? (cur.vatPct || 8) : 0,
                  }));
                }}
              >
                {(Object.keys(LEGAL_ENTITY_LABEL) as LegalEntityType[]).map(k => (
                  <option key={k} value={k}>
                    {LEGAL_ENTITY_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Thuế suất VAT (%) (Công ty)">
              <Input
                type="number"
                min={0}
                max={20}
                disabled={job.entityType !== 'COMPANY'}
                value={job.entityType === 'COMPANY' ? (job.vatPct ?? 8) : 0}
                onChange={e => setJob(x => ({ ...x, vatPct: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Tên pháp nhân / Cá nhân trên HĐ">
              <Input
                value={job.payeeLegalName || ''}
                placeholder="Họ tên trên CCCD / Tên Công ty / HKD"
                onChange={e => setJob(x => ({ ...x, payeeLegalName: e.target.value }))}
              />
            </Field>
            <Field label="Số CCCD / Mã số thuế">
              <Input
                value={job.payeeTaxOrCccd || ''}
                placeholder="12 số CCCD hoặc MST"
                onChange={e => setJob(x => ({ ...x, payeeTaxOrCccd: e.target.value }))}
              />
            </Field>
            <Field label="Ngân hàng & Số tài khoản">
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={job.payeeBankName || ''}
                  placeholder="Ngân hàng"
                  onChange={e => setJob(x => ({ ...x, payeeBankName: e.target.value }))}
                />
                <Input
                  value={job.payeeBankAccount || ''}
                  placeholder="Số tài khoản"
                  onChange={e => setJob(x => ({ ...x, payeeBankAccount: e.target.value }))}
                />
              </div>
            </Field>
            <Field label="Tên chủ tài khoản nhận tiền">
              <Input
                value={job.payeeBankHolder || ''}
                placeholder="NGUYEN VAN A"
                onChange={e => setJob(x => ({ ...x, payeeBankHolder: e.target.value }))}
              />
            </Field>
          </div>

          {!holderMatched && (
            <div className="grid grid-cols-1 gap-3 rounded-md border border-critical/50 bg-critical/5 p-2.5 md:grid-cols-2">
              <div className="text-xs text-critical">
                Chủ tài khoản ({job.payeeBankHolder || 'Trống'}) khác với Tên pháp nhân trên Hợp đồng ({job.payeeLegalName || 'Trống'}). Theo quy chuẩn Kế toán, bắt buộc phải đính kèm Giấy ủy quyền nhận thanh toán hợp lệ.
              </div>
              <Field label="Link Giấy ủy quyền nhận thay (bắt buộc khi lệch tên)">
                <Input
                  value={job.authorizationUrl || ''}
                  placeholder="https://drive.google.com/..."
                  onChange={e => setJob(x => ({ ...x, authorizationUrl: e.target.value }))}
                />
              </Field>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-sunken px-3 py-2 text-xs text-ink-2">
            <div>
              <span className="font-semibold text-ink">{LEGAL_ENTITY_LABEL[job.entityType || 'INDIVIDUAL']}:</span> {taxCalc.ruleSummary}
            </div>
            <div className="flex flex-wrap gap-3 tabular-nums">
              <span>
                Giá ghi trên HĐ/SOW: <strong className="text-ink">{fmt(taxCalc.contractDisplayValue)}đ</strong>
              </span>
              {taxCalc.pitTaxAmount > 0 && (
                <span>
                  Thuế TNCN 10% công ty nộp thay: <strong className="text-ink">{fmt(taxCalc.pitTaxAmount)}đ</strong>
                </span>
              )}
              {taxCalc.vatAmount > 0 && (
                <span>
                  VAT ({job.vatPct ?? 8}%): <strong className="text-ink">{fmt(taxCalc.vatAmount)}đ</strong>
                </span>
              )}
              <span>
                Thực chuyển KOC/Agency: <strong className="text-ink">{fmt(taxCalc.contractDisplayValue)}đ</strong>
              </span>
              <span>
                Tổng chi phí công ty: <strong className="text-ink">{fmt(taxCalc.grossPayoutOrInvoice)}đ</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Số phụ lục của Job">
              <Input
                value={job.appendixNo}
                placeholder={`PL-${job.code}`}
                onChange={e => setJob(x => ({ ...x, appendixNo: e.target.value }))}
              />
            </Field>
            <Field label="Ngày ký phụ lục">
              <Input type="date" value={job.appendixDate} onChange={e => setJob(x => ({ ...x, appendixDate: e.target.value }))} />
            </Field>
            <Field label="Link file phụ lục đã ký">
              <Input value={job.appendixUrl} placeholder="https://" onChange={e => setJob(x => ({ ...x, appendixUrl: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-md border border-line bg-sunken/50 p-3 md:grid-cols-3">
            <Field label="Mẫu hợp đồng / Điều khoản (Mục 7)">
              <Select
                value={job.isCustomContractTemplate ? 'CUSTOM' : 'STANDARD'}
                onChange={e => {
                  const isCustom = e.target.value === 'CUSTOM';
                  setJob(x => ({
                    ...x,
                    isCustomContractTemplate: isCustom,
                    legalReviewStatus:
                      isCustom || jobTotalFee(x) >= 50_000_000
                        ? x.legalReviewStatus === 'NOT_REQUIRED' || !x.legalReviewStatus
                          ? 'PENDING'
                          : x.legalReviewStatus
                        : 'NOT_REQUIRED',
                    financeReviewStatus:
                      isCustom || jobTotalFee(x) >= 50_000_000
                        ? x.financeReviewStatus === 'NOT_REQUIRED' || !x.financeReviewStatus
                          ? 'PENDING'
                          : x.financeReviewStatus
                        : 'NOT_REQUIRED',
                  }));
                }}
              >
                <option value="STANDARD">Mẫu hợp đồng chuẩn của Công ty</option>
                <option value="CUSTOM">Mẫu hợp đồng ngoài / Có sửa điều khoản (Cần Pháp chế &amp; Tài chính duyệt)</option>
              </Select>
            </Field>
            <Field label="Pháp chế rà soát (SLA 24h · HĐ ≥ 50tr hoặc sửa mẫu)">
              <Select
                value={job.legalReviewStatus || (needLegalFinance ? 'PENDING' : 'NOT_REQUIRED')}
                disabled={!needLegalFinance}
                onChange={e => setJob(x => ({ ...x, legalReviewStatus: e.target.value as ContractReviewStatus }))}
              >
                <option value="NOT_REQUIRED">Không bắt buộc</option>
                <option value="PENDING">7.2a Chờ Pháp chế rà soát (SLA 24h)</option>
                <option value="CHANGES">7.2b Pháp chế yêu cầu chỉnh sửa</option>
                <option value="APPROVED">Đã được Pháp chế duyệt</option>
              </Select>
            </Field>
            <Field label="Tài chính kiểm duyệt (SLA 48h · HĐ ≥ 50tr hoặc sửa mẫu)">
              <Select
                value={job.financeReviewStatus || (needLegalFinance ? 'PENDING' : 'NOT_REQUIRED')}
                disabled={!needLegalFinance}
                onChange={e => setJob(x => ({ ...x, financeReviewStatus: e.target.value as ContractReviewStatus }))}
              >
                <option value="NOT_REQUIRED">Không bắt buộc</option>
                <option value="PENDING">7.2c Chờ Tài chính kiểm duyệt (SLA 48h)</option>
                <option value="CHANGES">7.2d Tài chính yêu cầu chỉnh sửa</option>
                <option value="APPROVED">Đã được Tài chính duyệt</option>
              </Select>
            </Field>
          </div>

          {needLateExplanation && (
            <div className="space-y-2 rounded-md border border-critical/60 bg-critical/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-critical">
                  Giải trình ký hợp đồng muộn (Mục 3.5 · Hạn ngày 15 tháng kế tiếp khi Video đã Air nhưng chưa ký xong Phụ lục)
                </div>
                <Button
                  size="sm"
                  variant={job.lateSigningExplanation?.leadConfirmed ? 'secondary' : 'primary'}
                  onClick={() =>
                    setJob(
                      x => {
                        const nextConfirmed = !x.lateSigningExplanation?.leadConfirmed;
                        return {
                          ...x,
                          lateSigningExplanation: {
                            reason: x.lateSigningExplanation?.reason || '',
                            chatEvidenceUrl: x.lateSigningExplanation?.chatEvidenceUrl || '',
                            leadConfirmed: nextConfirmed,
                            leadConfirmedBy: nextConfirmed ? currentUserName : '',
                            confirmedByLead: nextConfirmed ? currentUserName : '',
                            leadConfirmedAt: nextConfirmed ? new Date().toISOString() : '',
                            confirmedAt: nextConfirmed ? getVietnamDateYmd() : '',
                          },
                        };
                      },
                      `Xác nhận giải trình ký muộn cho ${job.code}`
                    )
                  }
                >
                  {job.lateSigningExplanation?.leadConfirmed
                    ? `Lead đã xác nhận (${job.lateSigningExplanation.leadConfirmedBy || 'Lead'})`
                    : 'Lead Booking xác nhận Giải trình'}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Lý do ký muộn hợp đồng / phụ lục">
                  <Input
                    value={job.lateSigningExplanation?.reason || ''}
                    placeholder="KOC đi công tác, MCN phản hồi chậm..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        lateSigningExplanation: {
                          ...x.lateSigningExplanation,
                          reason: e.target.value,
                          chatEvidenceUrl: x.lateSigningExplanation?.chatEvidenceUrl || '',
                          leadConfirmed: Boolean(x.lateSigningExplanation?.leadConfirmed),
                          leadConfirmedBy: x.lateSigningExplanation?.leadConfirmedBy || '',
                          leadConfirmedAt: x.lateSigningExplanation?.leadConfirmedAt || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Link ảnh chụp lịch sử trao đổi đôn đốc ký với KOC">
                  <Input
                    value={job.lateSigningExplanation?.chatEvidenceUrl || ''}
                    placeholder="https://drive.google.com/..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        lateSigningExplanation: {
                          ...x.lateSigningExplanation,
                          reason: x.lateSigningExplanation?.reason || '',
                          chatEvidenceUrl: e.target.value,
                          leadConfirmed: Boolean(x.lateSigningExplanation?.leadConfirmed),
                          leadConfirmedBy: x.lateSigningExplanation?.leadConfirmedBy || '',
                          leadConfirmedAt: x.lateSigningExplanation?.leadConfirmedAt || '',
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Pipeline 8: Tạm ứng trước Air */}
          <div className="space-y-2 rounded-md border border-line bg-sunken/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-ink">
                Tạm ứng thù lao trước khi Air (Pipeline 8 · Trường hợp KOC/KOL có điều khoản tạm ứng)
              </div>
              {job.advancePayment?.status && job.advancePayment.status !== 'NONE' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pushingLarkJobId === job.id || !job.appendixNo.trim()}
                  onClick={() => void pushAdvancePaymentToLark(d, job)}
                >
                  <Send className="mr-1 h-3.5 w-3.5" />
                  {job.advancePayment.larkSlipCode
                    ? `Đẩy lại Phiếu Tạm ứng (${job.advancePayment.larkSlipCode})`
                    : 'Đẩy Phiếu Tạm ứng Lark 6.1'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Trạng thái tạm ứng trước Air">
                <Select
                  value={job.advancePayment?.status || 'NONE'}
                  onChange={e => {
                    const st = e.target.value as AdvancePaymentStatus;
                    setJob(x => ({
                      ...x,
                      advancePayment: {
                        status: st,
                        amount: x.advancePayment?.amount ?? (st !== 'NONE' ? Math.round(taxCalc.contractDisplayValue * 0.5) : null),
                        requestedAt: st === 'REQUESTED' && !x.advancePayment?.requestedAt ? getVietnamDateYmd() : x.advancePayment?.requestedAt || '',
                        paidAt: st === 'PAID' ? getVietnamDateYmd() : x.advancePayment?.paidAt || '',
                        larkSlipCode: x.advancePayment?.larkSlipCode || '',
                        uncBillUrl: x.advancePayment?.uncBillUrl || '',
                      },
                    }));
                  }}
                >
                  <option value="NONE">Không tạm ứng (Thanh toán 100% sau nghiệm thu)</option>
                  <option value="REQUIRED">8.1 Cần làm đề nghị tạm ứng</option>
                  <option value="REQUESTED">8.2 Đã gửi ĐNTT tạm ứng (Chờ KT duyệt &amp; chi)</option>
                  <option value="PAID">8.4 Đã hoàn tất tạm ứng cho KOC</option>
                </Select>
              </Field>
              <Field label="Số tiền tạm ứng (VNĐ)">
                <Input
                  type="number"
                  min={0}
                  disabled={!job.advancePayment?.status || job.advancePayment.status === 'NONE'}
                  value={job.advancePayment?.amount ?? ''}
                  placeholder="0"
                  onChange={e =>
                    setJob(x => ({
                      ...x,
                      advancePayment: {
                        status: x.advancePayment?.status || 'REQUIRED',
                        amount: e.target.value === '' ? null : Number(e.target.value),
                        requestedAt: x.advancePayment?.requestedAt || '',
                        paidAt: x.advancePayment?.paidAt || '',
                        larkSlipCode: x.advancePayment?.larkSlipCode || '',
                        uncBillUrl: x.advancePayment?.uncBillUrl || '',
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Link Bill UNC tạm ứng (Gửi KOC giữ lịch quay)">
                <Input
                  disabled={!job.advancePayment?.status || job.advancePayment.status === 'NONE'}
                  value={job.advancePayment?.uncBillUrl || ''}
                  placeholder="https://drive.google.com/..."
                  onChange={e =>
                    setJob(x => ({
                      ...x,
                      advancePayment: {
                        status: x.advancePayment?.status || 'REQUIRED',
                        amount: x.advancePayment?.amount ?? null,
                        requestedAt: x.advancePayment?.requestedAt || '',
                        paidAt: x.advancePayment?.paidAt || '',
                        larkSlipCode: x.advancePayment?.larkSlipCode || '',
                        uncBillUrl: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          </div>

          {contractsState === 'error' && <div className="text-xs text-ink-3">Không tải được hồ sơ từ mô-đun Hợp đồng.</div>}
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Tài liệu pháp lý</th>
                  <th className={TH}>Trạng thái ký</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {documentsOfJob(d, job, contractRecords, contractRecords).map(x => (
                  <tr key={x.document}>
                    <td className={TD}>{DOCUMENT_LABEL[x.document]}</td>
                    <td className={TD}>
                      {x.label}
                      {x.signedAt ? ` · ký ${x.signedAt}` : ''}
                      {x.record ? <span className="ml-2 text-2xs text-ink-3">{x.record.title}</span> : null}
                    </td>
                    <td className={`${TD} text-right`}>
                      <div className="flex justify-end gap-2">
                        {x.document === 'SOW' && x.signed && x.record && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const rec = x.record!;
                              setJob(
                                cur => ({ ...cur, appendixNo: numberOfRecord(rec), appendixDate: x.signedAt || cur.appendixDate }),
                                `Lấy số và ngày ký phụ lục cho ${job.code} từ hồ sơ ${rec.id}`
                              );
                            }}
                          >
                            Lấy số và ngày ký
                          </Button>
                        )}
                        {x.document === 'BBNT' && plan && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={FileText}
                            onClick={() => setDraftBbntTarget({ deal: d, job })}
                          >
                            Xem nháp BBNT
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={x.record ? 'secondary' : 'primary'}
                          disabled={!onOpenContract || !plan}
                          onClick={() =>
                            plan && onOpenContract?.(planJobToBookingDeal(d, job, plan, kocIdOfHandle(d.kocHandle), fw?.contractNo), x.document)
                          }
                        >
                          {x.record ? 'Mở hồ sơ' : 'Soạn theo Job'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Khu vực 3: Brief Content theo Plan, Sản phẩm, Hàng mẫu, SLA 2-3-5-7 ngày & Duyệt Kịch bản / Video Demo theo Job */}
        <section className="space-y-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">
              3. Luồng Brief Content theo Plan, SLA 2-3-5-7 ngày &amp; Duyệt Kịch bản / Video Demo ({job.code})
            </div>
            {job.slotId && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const s = slots.find(x => x.id === job.slotId);
                  if (!s) return;
                  const g = catalog.groups.find(x => x.id === s.productGroupId || (s.product && x.name === s.product));
                  const nextGroupProds = g?.products || [];
                  const matchedProd =
                    nextGroupProds.find(p => p.id === s.productId) ||
                    nextGroupProds.find(p => p.name === (s.sku || s.productName)) ||
                    undefined;
                  setJob(
                    cur => ({
                      ...cur,
                      briefCode: s.briefCode || cur.briefCode,
                      briefMode: resolveBriefMode(s),
                      pillar: s.pillar || cur.pillar,
                      angle: s.angle || cur.angle,
                      hook: s.hook || cur.hook,
                      usp: s.usp || g?.usp || cur.usp,
                      forbiddenClaims: s.forbiddenClaims || g?.forbiddenClaims || cur.forbiddenClaims,
                      mandatoryShots: s.mandatoryShots || cur.mandatoryShots,
                      rightsGuardrails: s.rightsGuardrails || cur.rightsGuardrails,
                      cta: s.cta || cur.cta,
                      briefUrl: s.briefUrl || cur.briefUrl,
                      week: s.week || cur.week,
                      pic: s.pic || cur.pic,
                      productGroupId: g?.id || cur.productGroupId,
                      productGroupName: g?.name || s.product || cur.productGroupName,
                      productName: matchedProd?.name || s.sku || s.productName || cur.productName,
                      cartUrl: s.cartUrl || cur.cartUrl,
                      affiliateUrl: s.affiliateUrl || cur.affiliateUrl,
                      commissionPct: s.commissionPct ?? cur.commissionPct,
                    }),
                    `Đồng bộ Brief ${s.briefCode || s.id} từ Plan cho ${job.code}`
                  );
                  notify(`Đã đồng bộ Brief ${s.briefCode || ''} và sản phẩm từ Plan vào ${job.code}.`, 'success');
                }}
              >
                Đồng bộ lại từ Brief Plan
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-md border border-line bg-sunken/50 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field
                label={`Chọn dòng Định hướng / Brief mẫu từ Plan (${slots.length} dòng Brief · ${slots.reduce((sum, x) => sum + slotTargetQty(x), 0)} video)`}
                className="md:col-span-2"
              >
                <Select
                  value={job.slotId}
                  onChange={e => {
                    const nextSlotId = e.target.value;
                    const s = slots.find(x => x.id === nextSlotId);
                    if (!s) {
                      setJob(cur => ({ ...cur, slotId: '' }));
                      return;
                    }
                    const g = catalog.groups.find(x => x.id === s.productGroupId || (s.product && x.name === s.product));
                    const nextGroupProds = g?.products || [];
                    const matchedProd =
                      nextGroupProds.find(p => p.id === s.productId) ||
                      nextGroupProds.find(p => p.name === (s.sku || s.productName)) ||
                      undefined;
                    setJob(
                      cur => ({
                        ...cur,
                        slotId: s.id,
                        briefCode: s.briefCode || cur.briefCode,
                        briefMode: resolveBriefMode(s),
                        pillar: s.pillar || cur.pillar,
                        angle: s.angle || cur.angle,
                        hook: s.hook || cur.hook,
                        usp: s.usp || g?.usp || cur.usp,
                        forbiddenClaims: s.forbiddenClaims || g?.forbiddenClaims || cur.forbiddenClaims,
                        mandatoryShots: s.mandatoryShots || cur.mandatoryShots,
                        rightsGuardrails: s.rightsGuardrails || cur.rightsGuardrails,
                        cta: s.cta || cur.cta,
                        briefUrl: s.briefUrl || cur.briefUrl,
                        week: s.week || cur.week,
                        pic: s.pic || cur.pic,
                        productGroupId: g?.id || cur.productGroupId,
                        productGroupName: g?.name || s.product || cur.productGroupName,
                        productName: matchedProd?.name || s.sku || s.productName || cur.productName,
                        cartUrl: s.cartUrl || cur.cartUrl,
                        affiliateUrl: s.affiliateUrl || cur.affiliateUrl,
                        commissionPct: s.commissionPct ?? cur.commissionPct,
                      }),
                      `Gắn dòng Brief ${s.briefCode || s.id} vào ${job.code}`
                    );
                  }}
                >
                  <option value="">-- Chọn dòng Định hướng / Brief mẫu trong Plan --</option>
                  {slots.map((s, idx) => {
                    const code = s.briefCode || `BR-${String(idx + 1).padStart(2, '0')}`;
                    const targetVideos = slotTargetQty(s);
                    const usedJobs = slotUsageCountMap.get(s.id) || 0;
                    const mode = resolveBriefMode(s);
                    const readyLabel = isBriefReady(s)
                      ? mode === 'VETTING_GUARDRAILS'
                        ? 'Đủ Khung kiểm duyệt'
                        : 'Đủ Brief'
                      : 'Chưa soạn';
                    const summaryText =
                      mode === 'VETTING_GUARDRAILS'
                        ? `[Khung kiểm duyệt KOL] ${s.usp || 'Chưa có USP'} · Cấm: ${s.forbiddenClaims || '—'}`
                        : `${s.pillar || 'Chưa chọn trụ cột'} — ${s.angle || 'Chưa có góc nội dung'}`;
                    return (
                      <option key={s.id} value={s.id}>
                        {code} · {s.week ? s.week.split(' ')[0] : 'Tuần ?'} · {s.row || 'Bậc ?'} · {summaryText} ({readyLabel}) [Đã gắn {usedJobs}/{targetVideos} video]
                      </option>
                    );
                  })}
                </Select>
              </Field>
              <Field label="Mã dòng Brief">
                <Input
                  value={job.briefCode}
                  placeholder="BR-01"
                  onChange={e => setJob(x => ({ ...x, briefCode: e.target.value }))}
                />
              </Field>
              <Field label="Chế độ làm việc với KOC / KOL">
                <Select
                  value={job.briefMode || (isVettingGuardrailRow(String(d.grade)) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE')}
                  onChange={e =>
                    setJob(x => ({
                      ...x,
                      briefMode: e.target.value as 'DIRECTIVE' | 'VETTING_GUARDRAILS',
                    }))
                  }
                >
                  <option value="DIRECTIVE">Định hướng kịch bản chi tiết (FOC / KL1–KL5)</option>
                  <option value="VETTING_GUARDRAILS">Khung tham số kiểm duyệt KOL (KL6 / KL7)</option>
                </Select>
              </Field>
            </div>

            {(job.briefMode || (isVettingGuardrailRow(String(d.grade)) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE')) === 'VETTING_GUARDRAILS' ? (
              <div className="space-y-3 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-ink">
                    Bộ tham số kiểm duyệt KOL ({d.grade || 'KL6 / KL7'} · Tôn trọng văn phong riêng của KOL — Kiểm soát ranh giới Brand &amp; Khung hình bắt buộc)
                  </span>
                  <Field label="Link file Guideline / Brief Brand" className="w-72">
                    <Input
                      value={job.briefUrl}
                      placeholder="https://docs.google.com/..."
                      onChange={e => setJob(x => ({ ...x, briefUrl: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="1. Điểm bán hàng bắt buộc (Key USP)">
                    <Textarea
                      rows={2}
                      value={job.usp}
                      placeholder="Thông điệp cốt lõi, hoạt chất chính hoặc ưu đãi chiến dịch bắt buộc KOL nhắc tới..."
                      onChange={e => setJob(x => ({ ...x, usp: e.target.value }))}
                    />
                  </Field>
                  <Field label="2. Từ cấm &amp; Ranh giới Brand (Do &amp; Don't)">
                    <Textarea
                      rows={2}
                      value={job.forbiddenClaims || ''}
                      placeholder="Cấm cam kết trị dứt điểm 100%, cấm nhắc tên đối thủ trực tiếp, cấm từ nhạy cảm y khoa..."
                      onChange={e => setJob(x => ({ ...x, forbiddenClaims: e.target.value }))}
                    />
                  </Field>
                  <Field label="3. Yêu cầu khung hình &amp; Hiện diện sản phẩm bắt buộc (Mandatory Shots)">
                    <Textarea
                      rows={2}
                      value={job.mandatoryShots || ''}
                      placeholder="Có cảnh test texture trên da thật, rõ logo sản phẩm tối thiểu 3 giây, trang phục lịch sự..."
                      onChange={e => setJob(x => ({ ...x, mandatoryShots: e.target.value }))}
                    />
                  </Field>
                  <Field label="4. Điều khoản bản quyền, Mã Spark Ads &amp; Độc quyền ngành hàng">
                    <Textarea
                      rows={2}
                      value={job.rightsGuardrails || ''}
                      placeholder="Cấp mã Spark Ads 30–60 ngày, giữ video tối thiểu 90 ngày, không nhận nhãn đối thủ cùng ngách trong ±7 ngày..."
                      onChange={e => setJob(x => ({ ...x, rightsGuardrails: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Chủ đề / Định hướng tham khảo (Không bắt buộc)">
                    <Input
                      value={job.pillar}
                      placeholder="Chủ đề gợi ý cho KOL (nếu có)..."
                      onChange={e => setJob(x => ({ ...x, pillar: e.target.value }))}
                    />
                  </Field>
                  <Field label="Kêu gọi hành động &amp; Gắn giỏ (CTA)">
                    <Input
                      value={job.cta}
                      placeholder="Gắn giỏ hàng góc trái / Link bio..."
                      onChange={e => setJob(x => ({ ...x, cta: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Trụ cột nội dung (Content Pillar)">
                    <Input
                      value={job.pillar}
                      placeholder="Review trải nghiệm thật / Giải quyết vấn đề..."
                      onChange={e => setJob(x => ({ ...x, pillar: e.target.value }))}
                    />
                  </Field>
                  <Field label="Góc tiếp cận (Content Angle)">
                    <Input
                      value={job.angle}
                      placeholder="So sánh trước - sau 7 ngày / Test độ kiềm dầu..."
                      onChange={e => setJob(x => ({ ...x, angle: e.target.value }))}
                    />
                  </Field>
                  <Field label="Link file Brief chi tiết">
                    <Input
                      value={job.briefUrl}
                      placeholder="https://docs.google.com/..."
                      onChange={e => setJob(x => ({ ...x, briefUrl: e.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Câu mở đầu 3 giây đầu (Hook)">
                    <Textarea
                      rows={2}
                      value={job.hook}
                      placeholder="Mở đầu giữ chân người xem 3s đầu..."
                      onChange={e => setJob(x => ({ ...x, hook: e.target.value }))}
                    />
                  </Field>
                  <Field label="Điểm bán hàng chính (Key USP)">
                    <Textarea
                      rows={2}
                      value={job.usp}
                      placeholder="Thành phần, công dụng, ưu đãi cần nhấn mạnh..."
                      onChange={e => setJob(x => ({ ...x, usp: e.target.value }))}
                    />
                  </Field>
                  <Field label="Claim cấm / Từ khóa cấm (Do &amp; Don't)">
                    <Textarea
                      rows={2}
                      value={job.forbiddenClaims || ''}
                      placeholder="Cấm cam kết trị dứt điểm 100%, cấm nhắc đối thủ..."
                      onChange={e => setJob(x => ({ ...x, forbiddenClaims: e.target.value }))}
                    />
                  </Field>
                  <Field label="Kêu gọi hành động (CTA)">
                    <Textarea
                      rows={2}
                      value={job.cta}
                      placeholder="Bấm giỏ hàng góc trái nhận voucher..."
                      onChange={e => setJob(x => ({ ...x, cta: e.target.value }))}
                    />
                  </Field>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nhóm sản phẩm">
              <Select
                value={job.productGroupId}
                onChange={e => {
                  const g = catalog.groups.find(x => x.id === e.target.value);
                  const defCart = undefined as { url?: string } | undefined;
                  const defAff = undefined as { url?: string; commissionPct?: number | null } | undefined;
                  setJob(x => ({
                    ...x,
                    productGroupId: g?.id || '',
                    productGroupName: g?.name || '',
                    usp: x.usp || g?.usp || '',
                    forbiddenClaims: x.forbiddenClaims || g?.forbiddenClaims || '',
                    productName: '',
                    cartUrl: defCart?.url || '',
                    affiliateUrl: defAff?.url || '',
                    commissionPct: defAff?.commissionPct ?? null,
                  }));
                }}
              >
                <option value="">Chọn nhóm</option>
                {catalog.groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name || 'Chưa đặt tên'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sản phẩm">
              <Select
                value={job.productName}
                disabled={!job.productGroupId}
                onChange={e => {
                  const nextName = e.target.value;
                  const nextProd = findCatalogProduct(catalog, nextName, job.productGroupId)?.product;
                  const nextGuides = resolveEffectiveProductGuidelines(catalog, job.productGroupId, nextProd);
                  const nextLinks = resolveEffectiveProductLinks(catalog, nextProd);
                  const targetPlat = job.commercePlatform === 'SHOPEE' ? 'Shopee' : 'TikTok Shop';
                  const defCart = nextLinks.cartLinks.find(l => l.platform === targetPlat) || nextLinks.cartLinks[0];
                  const defAff = nextLinks.affiliateLinks.find(l => l.platform === targetPlat) || nextLinks.affiliateLinks[0];
                  setJob(x => ({
                    ...x,
                    productName: nextName,
                    usp: nextGuides.usp || x.usp,
                    forbiddenClaims: nextGuides.forbiddenClaims || x.forbiddenClaims,
                    cartUrl: defCart?.url || '',
                    affiliateUrl: defAff?.url || '',
                    commissionPct: defAff?.commissionPct ?? null,
                  }));
                }}
              >
                <option value="">Chọn sản phẩm</option>
                {productsOfGroup(job.productGroupId).map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Link giỏ hàng">
              <Select value={job.cartUrl} disabled={!prod} onChange={e => setJob(x => ({ ...x, cartUrl: e.target.value }))}>
                <option value="">Chọn link giỏ hàng</option>
                {effLinks.cartLinks.map(l => (
                  <option key={l.id} value={l.url}>
                    {l.platform} · {l.storeName || l.url}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Link affiliate">
              <Select
                value={job.affiliateUrl}
                disabled={!prod}
                onChange={e => {
                  const l = effLinks.affiliateLinks.find(a => a.url === e.target.value);
                  setJob(x => ({ ...x, affiliateUrl: l?.url || '', commissionPct: l ? l.commissionPct : null }));
                }}
              >
                <option value="">Chọn link affiliate</option>
                {effLinks.affiliateLinks.map(l => (
                  <option key={l.id} value={l.url}>
                    {l.label || l.platform} · {l.commissionPct === null ? 'chưa có hoa hồng' : `${l.commissionPct}%`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {job.affiliateUrl && <div className="text-xs text-ink-2">Hoa hồng đã chốt cho Job: {job.commissionPct === null ? '—' : `${job.commissionPct}%`}</div>}
          {prod && (
            <div className="space-y-2 rounded-md border border-line bg-sunken/40 p-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-ink-2">
                  <span className="font-semibold text-ink">
                    {prod.productType === 'HARD_BUNDLE'
                      ? 'Combo có link riêng trên sàn'
                      : prod.productType === 'ROUTINE_COMBO'
                        ? `Combo Routine (${(prod.bundleComponents || []).length} món lẻ)`
                        : 'SKU đơn lẻ'}
                  </span>
                  <span>· Vai trò: <strong>{prod.role || 'HERO'}</strong></span>
                  {prod.originalPrice ? <span>· Giá niêm yết: <strong>{fmt(prod.originalPrice)}đ</strong></span> : null}
                  {prod.promoPrice ? <span>· Giá Deal: <strong>{fmt(prod.promoPrice)}đ</strong></span> : null}
                  {sampleQuotaInfo.quota !== null && (
                    <span>
                      · Hàng mẫu tháng: Đã gửi <strong>{sampleQuotaInfo.sent}</strong> / Quota <strong>{sampleQuotaInfo.quota}</strong> (Còn lại:{' '}
                      <strong className={sampleQuotaInfo.remaining === 0 ? 'text-critical' : 'text-ink'}>{sampleQuotaInfo.remaining}</strong> bộ)
                    </span>
                  )}
                </div>
              </div>
              {effLinks.isMultiComponentLinks && effLinks.cartLinks.length > 0 && (
                <div className="rounded border border-line bg-surface px-2.5 py-1.5 text-ink-2">
                  <span className="font-semibold text-ink">Danh sách link các món trong Combo Routine ({effLinks.cartLinks.length} giỏ hàng): </span>
                  {effLinks.cartLinks.map((cl, idx) => (
                    <span key={cl.id} className="mr-2 inline-block">
                      {idx + 1}. {cl.note || cl.platform}: <span className="underline">{cl.url}</span>
                    </span>
                  ))}
                </div>
              )}
              {sampleQuotaInfo.hasOutOfStockComponent && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-critical/40 bg-critical/10 px-2.5 py-1.5 text-critical">
                  <span>
                    Cảnh báo: Sản phẩm hoặc món thành phần ({sampleQuotaInfo.outOfStockComponentNames.join(', ')}) đang <strong>Tạm hết hàng</strong>.
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {job.sample.status !== 'OUT_OF_STOCK' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setJob(
                            x => ({ ...x, sample: { ...x.sample, status: 'OUT_OF_STOCK', at: getVietnamDateYmd() } }),
                            `Tạm dừng SLA ${job.code} do sản phẩm hết hàng`
                          )
                        }
                      >
                        Bật trạng thái Brand hết hàng (Dừng SLA)
                      </Button>
                    )}
                    {substituteProd && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const subGuides = resolveEffectiveProductGuidelines(catalog, substituteProd.group.id, substituteProd.product);
                          const subLinks = resolveEffectiveProductLinks(catalog, substituteProd.product);
                          const targetPlat = job.commercePlatform === 'SHOPEE' ? 'Shopee' : 'TikTok Shop';
                          const defCart = subLinks.cartLinks.find(l => l.platform === targetPlat) || subLinks.cartLinks[0];
                          const defAff = subLinks.affiliateLinks.find(l => l.platform === targetPlat) || subLinks.affiliateLinks[0];
                          setJob(
                            x => ({
                              ...x,
                              productGroupId: substituteProd.group.id,
                              productGroupName: substituteProd.group.name,
                              productName: substituteProd.product.name,
                              usp: subGuides.usp || x.usp,
                              forbiddenClaims: subGuides.forbiddenClaims || x.forbiddenClaims,
                              cartUrl: defCart?.url || '',
                              affiliateUrl: defAff?.url || '',
                              commissionPct: defAff?.commissionPct ?? null,
                            }),
                            `Đổi sản phẩm của ${job.code} sang SKU thay thế "${substituteProd.product.name}"`
                          );
                        }}
                      >
                        Đổi sang SKU thay thế: {substituteProd.product.name}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 border-t border-line pt-3 md:grid-cols-5">
            <Field label="Hàng mẫu (SLA gửi ≤ 2 ngày)">
              <Select
                value={job.sample.status}
                onChange={e => {
                  const nextStatus = e.target.value as SampleStatus;
                  const todayStr = getVietnamDateYmd();
                  setJob(
                    x => ({
                      ...x,
                      sample: { ...x.sample, status: nextStatus, at: x.sample.at || todayStr },
                    }),
                    `Hàng mẫu ${job.code}: ${SAMPLE_LABEL[nextStatus]}`
                  );
                }}
              >
                {(Object.keys(SAMPLE_LABEL) as SampleStatus[]).map(k => (
                  <option key={k} value={k}>
                    {SAMPLE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ngày giao/nhận SP (tính SLA 3–7 ngày)">
              <Input
                type="date"
                value={job.sample.at || ''}
                onChange={e => setJob(x => ({ ...x, sample: { ...x.sample, at: e.target.value } }))}
              />
            </Field>
            <Field label="Mã vận đơn">
              <Input value={job.sample.trackingNo} onChange={e => setJob(x => ({ ...x, sample: { ...x.sample, trackingNo: e.target.value } }))} />
            </Field>
            <Field label="Duyệt Kịch bản nội bộ Vòng 1 (SLA 24h)">
              <Select
                value={job.script.internalScriptAuditStatus || 'NONE'}
                onChange={e =>
                  setJob(
                    x => ({
                      ...x,
                      script: {
                        ...x.script,
                        internalScriptAuditStatus: e.target.value as 'NONE' | 'PASSED' | 'CHANGES',
                      },
                    }),
                    `Duyệt Kịch bản nội bộ Vòng 1 ${job.code}: ${e.target.value}`
                  )
                }
              >
                <option value="NONE">Chưa rà soát nội bộ Vòng 1</option>
                <option value="PASSED">Đạt Vòng 1 (Cho phép gửi Brand)</option>
                <option value="CHANGES">Cần sửa lại trước khi gửi Brand</option>
              </Select>
            </Field>
            <Field label="Brand duyệt Kịch bản / Khung tham số (Vòng 2)">
              <Select
                value={job.script.status}
                onChange={e =>
                  setJob(
                    x => ({ ...x, script: { ...x.script, status: e.target.value as ScriptStatus, at: getVietnamDateYmd() } }),
                    `Kịch bản ${job.code}: ${SCRIPT_LABEL[e.target.value as ScriptStatus]}`
                  )
                }
              >
                {(Object.keys(SCRIPT_LABEL) as ScriptStatus[]).map(k => (
                  <option key={k} value={k}>
                    {SCRIPT_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <Field label="Link Kịch bản KOC gửi">
              <Input
                value={job.script.scriptUrl || ''}
                placeholder="https://docs.google.com/..."
                onChange={e => setJob(x => ({ ...x, script: { ...x.script, scriptUrl: e.target.value } }))}
              />
            </Field>
            <Field label="Link Video Demo (Drive / CapCut)">
              <Input
                value={job.script.demoUrl || ''}
                placeholder="https://drive.google.com/..."
                onChange={e => setJob(x => ({ ...x, script: { ...x.script, demoUrl: e.target.value } }))}
              />
            </Field>
            <Field label="Duyệt Demo nội bộ Vòng 1 (Pipeline 12.1)">
              <Select
                value={job.script.internalDemoAuditStatus || 'NONE'}
                onChange={e =>
                  setJob(
                    x => ({
                      ...x,
                      script: {
                        ...x.script,
                        internalDemoAuditStatus: e.target.value as 'NONE' | 'PASSED' | 'CHANGES',
                      },
                    }),
                    `Duyệt Demo nội bộ Vòng 1 ${job.code}: ${e.target.value}`
                  )
                }
              >
                <option value="NONE">Chưa rà soát nội bộ Vòng 1</option>
                <option value="PASSED">Đạt Vòng 1 (Cho phép đẩy Sheet Brand)</option>
                <option value="CHANGES">Cần KOC sửa lại trước khi gửi Brand</option>
              </Select>
            </Field>
            <Field label="Brand duyệt Video Demo (Vòng 2)">
              <Select
                value={job.script.demoStatus || 'NONE'}
                onChange={e =>
                  setJob(
                    x => ({ ...x, script: { ...x.script, demoStatus: e.target.value as ScriptStatus, at: getVietnamDateYmd() } }),
                    `Video Demo ${job.code}: ${SCRIPT_LABEL[e.target.value as ScriptStatus]}`
                  )
                }
              >
                {(Object.keys(SCRIPT_LABEL) as ScriptStatus[]).map(k => (
                  <option key={k} value={k}>
                    {SCRIPT_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="SLA 72h Brand chậm duyệt">
              <Select
                value={job.selfAirProposed ? 'SELF_AIR' : 'NORMAL'}
                onChange={e =>
                  setJob(
                    x => ({ ...x, selfAirProposed: e.target.value === 'SELF_AIR' }),
                    `${e.target.value === 'SELF_AIR' ? 'Bật' : 'Tắt'} đề xuất tự sản xuất / tự Air quá hạn 72h cho ${job.code}`
                  )
                }
              >
                <option value="NORMAL">Theo tiến độ duyệt bình thường</option>
                <option value="SELF_AIR">Quá 72h Brand chưa duyệt · Đề xuất tự Air</option>
              </Select>
            </Field>
            <Field label="Ghi chú góp ý Kịch bản / Video Demo">
              <Input value={job.script.note} onChange={e => setJob(x => ({ ...x, script: { ...x.script, note: e.target.value } }))} />
            </Field>
          </div>

          {/* Tùy chọn Job Phiên Livestream Affiliate */}
          <div className="space-y-2 rounded-md border border-line bg-sunken/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-ink">Cấu hình Phiên Livestream Affiliate (Nếu Job là Phiên Live thay vì Video)</div>
              <Select
                className="w-60"
                value={job.isLivestreamJob ? 'LIVE' : 'VIDEO'}
                onChange={e =>
                  setJob(x => ({
                    ...x,
                    isLivestreamJob: e.target.value === 'LIVE',
                  }))
                }
              >
                <option value="VIDEO">Job Video KOC / KOL thông thường</option>
                <option value="LIVE">Job Phiên Livestream Affiliate</option>
              </Select>
            </div>
            {job.isLivestreamJob && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <Field label="Khung giờ bắt đầu Live">
                  <Input
                    value={job.liveSpec?.scheduledStartAt || ''}
                    placeholder="20:00 25/10/2026"
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        liveSpec: {
                          scheduledStartAt: e.target.value,
                          durationMinutes: x.liveSpec?.durationMinutes ?? 120,
                          pinnedSkus: x.liveSpec?.pinnedSkus || '',
                          voucherDeal: x.liveSpec?.voucherDeal || '',
                          replayRecordingUrl: x.liveSpec?.replayRecordingUrl || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Thời lượng cam kết (Phút)">
                  <Input
                    type="number"
                    min={15}
                    value={job.liveSpec?.durationMinutes ?? 120}
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        liveSpec: {
                          scheduledStartAt: x.liveSpec?.scheduledStartAt || '',
                          durationMinutes: Math.max(15, Number(e.target.value) || 60),
                          pinnedSkus: x.liveSpec?.pinnedSkus || '',
                          voucherDeal: x.liveSpec?.voucherDeal || '',
                          replayRecordingUrl: x.liveSpec?.replayRecordingUrl || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Danh sách SKU ghim giỏ">
                  <Input
                    value={job.liveSpec?.pinnedSkus || ''}
                    placeholder="SKU 1, SKU 2..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        liveSpec: {
                          scheduledStartAt: x.liveSpec?.scheduledStartAt || '',
                          durationMinutes: x.liveSpec?.durationMinutes ?? 120,
                          pinnedSkus: e.target.value,
                          voucherDeal: x.liveSpec?.voucherDeal || '',
                          replayRecordingUrl: x.liveSpec?.replayRecordingUrl || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Deal giá / Voucher tung trong phiên">
                  <Input
                    value={job.liveSpec?.voucherDeal || ''}
                    placeholder="Giảm 25% + Quà tặng..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        liveSpec: {
                          scheduledStartAt: x.liveSpec?.scheduledStartAt || '',
                          durationMinutes: x.liveSpec?.durationMinutes ?? 120,
                          pinnedSkus: x.liveSpec?.pinnedSkus || '',
                          voucherDeal: e.target.value,
                          replayRecordingUrl: x.liveSpec?.replayRecordingUrl || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Link Record / Báo cáo Dashboard Live">
                  <Input
                    value={job.liveSpec?.replayRecordingUrl || ''}
                    placeholder="https://drive.google.com/..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        liveSpec: {
                          scheduledStartAt: x.liveSpec?.scheduledStartAt || '',
                          durationMinutes: x.liveSpec?.durationMinutes ?? 120,
                          pinnedSkus: x.liveSpec?.pinnedSkus || '',
                          voucherDeal: x.liveSpec?.voucherDeal || '',
                          replayRecordingUrl: e.target.value,
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            )}
          </div>
        </section>

        {/* Khu vực 4: Air, Khóa Link 7 ngày làm việc & Nghiệm thu theo Job */}
        <section className="space-y-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">
              4. Air và Nghiệm thu {job.code}
              {airLinkLocked ? ' · [ĐÃ KHÓA SỬA LINK AIR QUÁ 7 NGÀY LÀM VIỆC]' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {(job.addons || []).some(a => a.status === 'PENDING') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setJob(
                      cur => ({
                        ...cur,
                        addons: (cur.addons || []).map(a => (a.status === 'PENDING' ? { ...a, status: 'VERIFIED' } : a)),
                      }),
                      `Xác nhận hoàn tất các dịch vụ gia tăng của ${job.code}`
                    )
                  }
                >
                  Duyệt đạt tất cả DVGT
                </Button>
              )}
              <Button
                size="md"
                variant="secondary"
                icon={FileText}
                onClick={() => setDraftBbntTarget({ deal: d, job })}
              >
                Xem &amp; Kiểm tra nháp BBNT (Theo Phụ lục)
              </Button>
              <Button
                size="md"
                variant="secondary"
                icon={Camera}
                onClick={() => setScreenshotTarget({ deal: d, job })}
              >
                Chụp ảnh sản phẩm cho BBNT
              </Button>
              <Button size="md" variant="primary" disabled={inspecting || !job.airLink.trim()} onClick={() => void runJobAcceptance(d, job)}>
                {inspecting ? 'Đang kiểm tra…' : 'Nghiệm thu video'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Hạn air">
              <Input type="date" value={job.deadline} onChange={e => setJob(x => ({ ...x, deadline: e.target.value }))} />
            </Field>
            <Field label="Ngày lên sóng thực tế (Aired At)">
              <Input
                type="date"
                value={job.airedAt || ''}
                disabled={airLinkLocked}
                onChange={e => setJob(x => ({ ...x, airedAt: e.target.value }))}
              />
            </Field>
            <Field label="Link video lên sóng (Khóa sau 7 ngày LV)">
              <Input
                value={job.airLink}
                disabled={airLinkLocked}
                placeholder="https://www.tiktok.com/@kênh/video/…"
                onChange={e => {
                  const todayStr = getVietnamDateYmd();
                  setJob(x => ({
                    ...x,
                    airLink: e.target.value,
                    airedAt: x.airedAt || (e.target.value.trim() ? todayStr : ''),
                    acceptance:
                      x.airLink === e.target.value
                        ? x.acceptance
                        : { ...x.acceptance, status: 'PENDING', checks: [], summary: '', confirmedBy: '', confirmedAt: '', confirmNote: '' },
                  }));
                }}
              />
            </Field>
            <Field label="Mã Spark Ads (nếu có)">
              <Input value={job.sparkAdsCode} placeholder="#SparkAds..." onChange={e => setJob(x => ({ ...x, sparkAdsCode: e.target.value }))} />
            </Field>
            <Field label={job.bbntSigned ? 'Link BBNT đã ký (đồng bộ từ Hợp đồng)' : 'Link BBNT đã ký (bắt buộc trước khi đề nghị thanh toán)'}>
              <Input
                value={job.bbntUrl || ''}
                disabled={Boolean(job.bbntContractId && job.bbntSigned)}
                placeholder="https://… (file BBNT đã ký)"
                onChange={e => setJob(x => ({ ...x, bbntUrl: e.target.value }))}
              />
            </Field>
          </div>

          {job.acceptance.status !== 'PENDING' && (
            <div className="space-y-2 rounded-lg border border-line bg-sunken p-3">
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <span className={`font-medium ${job.acceptance.status === 'PASSED' ? 'text-ink' : 'text-critical'}`}>
                  Kết quả Video: {ACCEPT_LABEL[job.acceptance.status]}
                </span>
                {job.acceptance.views !== null && <span className="text-ink-2">{fmt(job.acceptance.views)} lượt xem</span>}
                {job.acceptance.isOnTime !== null && (
                  <span className="text-ink-2">{job.acceptance.isOnTime ? 'Đúng hạn' : `Trễ ${job.acceptance.daysDelayed ?? '?'} ngày`}</span>
                )}
                {job.acceptance.confirmedBy && <span className="text-ink-2">Đã xác nhận bởi {job.acceptance.confirmedBy}</span>}
              </div>
              {job.acceptance.summary && <div className="text-xs text-ink-2">{job.acceptance.summary}</div>}
              <ul className="space-y-1">
                {job.acceptance.checks.map(c => (
                  <li key={c.key} className="flex gap-2 text-[13px]">
                    <span className={c.passed ? 'text-ink-3' : 'text-critical'}>{c.passed ? '✓' : '✗'}</span>
                    <span className="text-ink">{c.label}</span>
                    {c.detail && <span className="text-ink-3">· {c.detail}</span>}
                  </li>
                ))}
              </ul>
              {job.acceptance.status !== 'PASSED' && !job.acceptance.confirmedBy && (
                <div className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
                  <Field label="Lý do xác nhận nghiệm thu dù chưa đạt" className="min-w-[260px] flex-1">
                    <Input value={confirmNote} onChange={e => setConfirmNote(e.target.value)} />
                  </Field>
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={!confirmNote.trim()}
                    onClick={() => {
                      setJob(
                        x => ({ ...x, acceptance: { ...x.acceptance, confirmedBy: currentUserName, confirmNote: confirmNote.trim() } }),
                        `Xác nhận nghiệm thu ${job.code} dù ${ACCEPT_LABEL[job.acceptance.status].toLowerCase()}: ${confirmNote.trim()}`
                      );
                      setConfirmNote('');
                    }}
                  >
                    Xác nhận nghiệm thu
                  </Button>
                </div>
              )}
              {job.acceptance.confirmNote && <div className="text-xs text-ink-2">Lý do xác nhận: {job.acceptance.confirmNote}</div>}
            </div>
          )}

          {/* Pipeline 16: Hóa đơn nháp & Hóa đơn chính thức HKD / Công ty (Ngày HĐ === Ngày BBNT) */}
          {(job.entityType === 'HOUSEHOLD' || job.entityType === 'COMPANY') && (
            <div className="space-y-2 rounded-md border border-line bg-sunken/50 p-3">
              <div className="text-xs font-semibold text-ink">
                Kiểm tra Hóa đơn nháp &amp; Hóa đơn chính thức HKD / Công ty (Pipeline 16 · Ngày xuất HĐ chính thức phải trùng ngày ký BBNT)
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Trạng thái duyệt Hóa đơn nháp">
                  <Select
                    value={job.invoiceCheck?.draftInvoiceStatus || 'NOT_REQUIRED'}
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        invoiceCheck: {
                          draftInvoiceUrl: x.invoiceCheck?.draftInvoiceUrl || '',
                          draftInvoiceStatus: e.target.value as DraftInvoiceStatus,
                          officialInvoiceNo: x.invoiceCheck?.officialInvoiceNo || '',
                          officialInvoiceDate: x.invoiceCheck?.officialInvoiceDate || '',
                          officialInvoiceUrl: x.invoiceCheck?.officialInvoiceUrl || '',
                          bbntDate: x.invoiceCheck?.bbntDate || '',
                        },
                      }))
                    }
                  >
                    <option value="NOT_REQUIRED">Chưa gửi bản nháp</option>
                    <option value="PENDING">16.3 Chờ Kế toán duyệt HĐ nháp</option>
                    <option value="CHANGES">16.4 HĐ nháp sai — Chờ xuất lại</option>
                    <option value="APPROVED">16.5 KT đã duyệt HĐ nháp — Chờ xuất HĐ chính thức</option>
                  </Select>
                </Field>
                <Field label="Link Hóa đơn nháp">
                  <Input
                    value={job.invoiceCheck?.draftInvoiceUrl || ''}
                    placeholder="https://drive.google.com/..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        invoiceCheck: {
                          draftInvoiceUrl: e.target.value,
                          draftInvoiceStatus: x.invoiceCheck?.draftInvoiceStatus || 'PENDING',
                          officialInvoiceNo: x.invoiceCheck?.officialInvoiceNo || '',
                          officialInvoiceDate: x.invoiceCheck?.officialInvoiceDate || '',
                          officialInvoiceUrl: x.invoiceCheck?.officialInvoiceUrl || '',
                          bbntDate: x.invoiceCheck?.bbntDate || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Số Hóa đơn chính thức">
                  <Input
                    value={job.invoiceCheck?.officialInvoiceNo || ''}
                    placeholder="0001234"
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        invoiceCheck: {
                          draftInvoiceUrl: x.invoiceCheck?.draftInvoiceUrl || '',
                          draftInvoiceStatus: x.invoiceCheck?.draftInvoiceStatus || 'PENDING',
                          officialInvoiceNo: e.target.value,
                          officialInvoiceDate: x.invoiceCheck?.officialInvoiceDate || '',
                          officialInvoiceUrl: x.invoiceCheck?.officialInvoiceUrl || '',
                          bbntDate: x.invoiceCheck?.bbntDate || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Ngày ký Biên bản nghiệm thu (BBNT)">
                  <Input
                    type="date"
                    value={job.invoiceCheck?.bbntDate || ''}
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        invoiceCheck: {
                          draftInvoiceUrl: x.invoiceCheck?.draftInvoiceUrl || '',
                          draftInvoiceStatus: x.invoiceCheck?.draftInvoiceStatus || 'PENDING',
                          officialInvoiceNo: x.invoiceCheck?.officialInvoiceNo || '',
                          officialInvoiceDate: x.invoiceCheck?.officialInvoiceDate || '',
                          officialInvoiceUrl: x.invoiceCheck?.officialInvoiceUrl || '',
                          bbntDate: e.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Ngày xuất Hóa đơn chính thức (Phải = Ngày BBNT)">
                  <Input
                    type="date"
                    value={job.invoiceCheck?.officialInvoiceDate || ''}
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        invoiceCheck: {
                          draftInvoiceUrl: x.invoiceCheck?.draftInvoiceUrl || '',
                          draftInvoiceStatus: x.invoiceCheck?.draftInvoiceStatus || 'PENDING',
                          officialInvoiceNo: x.invoiceCheck?.officialInvoiceNo || '',
                          officialInvoiceDate: e.target.value,
                          officialInvoiceUrl: x.invoiceCheck?.officialInvoiceUrl || '',
                          bbntDate: x.invoiceCheck?.bbntDate || '',
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Link file Hóa đơn chính thức (PDF/XML)">
                  <Input
                    value={job.invoiceCheck?.officialInvoiceUrl || ''}
                    placeholder="https://drive.google.com/..."
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        invoiceCheck: {
                          draftInvoiceUrl: x.invoiceCheck?.draftInvoiceUrl || '',
                          draftInvoiceStatus: x.invoiceCheck?.draftInvoiceStatus || 'PENDING',
                          officialInvoiceNo: x.invoiceCheck?.officialInvoiceNo || '',
                          officialInvoiceDate: x.invoiceCheck?.officialInvoiceDate || '',
                          officialInvoiceUrl: e.target.value,
                          bbntDate: x.invoiceCheck?.bbntDate || '',
                        },
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Đối soát Nghiệm thu Account (Mùng 2) & Kế toán (Ngày 5) + Ngoại lệ Pipeline 19 */}
          <div className="grid grid-cols-1 gap-3 rounded-md border border-line bg-sunken/50 p-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink">Đối soát Nghiệm thu Account (Mùng 2) &amp; Kế toán (Ngày 5)</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Account đối soát số liệu Brand">
                  <Select
                    value={job.closingAudit?.accountStatus || 'PENDING'}
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        closingAudit: {
                          accountStatus: e.target.value as 'PENDING' | 'PASSED' | 'RETURNED',
                          accountErrorNote: x.closingAudit?.accountErrorNote || '',
                          financeStatus: x.closingAudit?.financeStatus || 'PENDING',
                          financeErrorNote: x.closingAudit?.financeErrorNote || '',
                        },
                      }))
                    }
                  >
                    <option value="PENDING">Chờ Account đối soát</option>
                    <option value="PASSED">Account đã chốt khớp</option>
                    <option value="RETURNED">Account trả lỗi cần sửa</option>
                  </Select>
                </Field>
                <Field label="Kế toán đối soát chứng từ">
                  <Select
                    value={job.closingAudit?.financeStatus || 'PENDING'}
                    onChange={e =>
                      setJob(x => ({
                        ...x,
                        closingAudit: {
                          accountStatus: x.closingAudit?.accountStatus || 'PENDING',
                          accountErrorNote: x.closingAudit?.accountErrorNote || '',
                          financeStatus: e.target.value as 'PENDING' | 'PASSED' | 'RETURNED',
                          financeErrorNote: x.closingAudit?.financeErrorNote || '',
                        },
                      }))
                    }
                  >
                    <option value="PENDING">Chờ Kế toán đối soát</option>
                    <option value="PASSED">Kế toán đã duyệt khớp</option>
                    <option value="RETURNED">Kế toán trả lỗi chứng từ</option>
                  </Select>
                </Field>
              </div>
              {(job.closingAudit?.accountStatus === 'RETURNED' || job.closingAudit?.financeStatus === 'RETURNED') && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Ghi chú lỗi Account trả về">
                    <Input
                      value={job.closingAudit?.accountErrorNote || ''}
                      placeholder="Lệch đơn giá, thiếu ảnh giỏ hàng..."
                      onChange={e =>
                        setJob(x => ({
                          ...x,
                          closingAudit: {
                            accountStatus: x.closingAudit?.accountStatus || 'RETURNED',
                            accountErrorNote: e.target.value,
                            financeStatus: x.closingAudit?.financeStatus || 'PENDING',
                            financeErrorNote: x.closingAudit?.financeErrorNote || '',
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Ghi chú lỗi Kế toán trả về">
                    <Input
                      value={job.closingAudit?.financeErrorNote || ''}
                      placeholder="Lệch ngày BBNT và Hóa đơn..."
                      onChange={e =>
                        setJob(x => ({
                          ...x,
                          closingAudit: {
                            accountStatus: x.closingAudit?.accountStatus || 'PENDING',
                            accountErrorNote: x.closingAudit?.accountErrorNote || '',
                            financeStatus: x.closingAudit?.financeStatus || 'RETURNED',
                            financeErrorNote: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink">Trạng thái vòng đời Job &amp; Xử lý ngoại lệ (Pipeline 19)</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Trạng thái vòng đời Job">
                  <Select
                    value={job.lifecycleStatus || 'ACTIVE'}
                    onChange={e =>
                      setJob(
                        x => ({
                          ...x,
                          lifecycleStatus: e.target.value as JobLifecycleStatus,
                        }),
                        `Cập nhật trạng thái vòng đời ${job.code}: ${e.target.value}`
                      )
                    }
                  >
                    <option value="ACTIVE">Đang chạy bình thường</option>
                    <option value="REPLACED_KOC">19.3 Đổi KOC thay thế (Giữ mã Brief)</option>
                    <option value="ROLLED_OVER_NEXT_MONTH">Dời sang tháng kế tiếp (Rollover)</option>
                    <option value="CANCELLED">19.5 Đã hủy Job (Giải phóng ngân sách)</option>
                  </Select>
                </Field>
                {job.lifecycleStatus === 'ROLLED_OVER_NEXT_MONTH' ? (
                  <Field label="Tháng nhận dời sang (VD: 2026-11)">
                    <Input
                      value={job.rolledOverToMonth || ''}
                      placeholder="YYYY-MM"
                      onChange={e => setJob(x => ({ ...x, rolledOverToMonth: e.target.value }))}
                    />
                  </Field>
                ) : job.lifecycleStatus === 'REPLACED_KOC' ? (
                  <Field label="ID kênh KOC mới thay thế">
                    <Input
                      value={job.replacedByKocHandle || ''}
                      placeholder="@id_kenh_moi"
                      onChange={e => setJob(x => ({ ...x, replacedByKocHandle: e.target.value }))}
                    />
                  </Field>
                ) : (
                  <Field label="Ghi chú ngoại lệ / Lý do">
                    <Input
                      value={job.lifecycleNote || ''}
                      placeholder="Lý do hủy / đổi KOC / dời tháng..."
                      onChange={e => setJob(x => ({ ...x, lifecycleNote: e.target.value }))}
                    />
                  </Field>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Khu vực 5: Đẩy về Lark theo Job để Kế toán thanh toán & Đính kèm Bill UNC (SLA 7 ngày) */}
        <section className="space-y-3 rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">
              5. Đẩy về Lark theo {job.code} để Kế toán thanh toán &amp; Đối soát Bill UNC (Bước: {STAGES.find(s => s.key === stage)?.label})
            </div>
            <div className="flex flex-wrap gap-2">
              {jobs.length > 1 && (
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    const clearedIds = jobs.filter(j => !jobPaymentBlocker(j) && j.payment.status === 'NONE').map(j => j.id);
                    setSelectedBundleJobIds(clearedIds.length > 0 ? clearedIds : [job.id]);
                    setBundlePaymentOpen(true);
                  }}
                >
                  Gom nhiều Job đẩy 1 Phiếu Lark 6.1
                </Button>
              )}
              <Button
                size="md"
                variant="primary"
                disabled={Boolean(blocker) || job.payment.status !== 'NONE' || pushingLarkJobId === job.id}
                title={blocker || (job.payment.status !== 'NONE' ? 'Job đã có phiếu đề nghị thanh toán' : undefined)}
                onClick={() => void pushJobToLarkPayment(d, job)}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {pushingLarkJobId === job.id
                  ? 'Đang đẩy về Lark…'
                  : job.payment.status !== 'NONE'
                  ? 'Đã lập phiếu thanh toán'
                  : 'Đẩy về Lark (Thanh toán Job)'}
              </Button>
            </div>
          </div>

          {job.payment.larkSlipCode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-sunken px-3 py-2 text-xs text-ink">
              <div>
                Đã đồng bộ sang Lark cho Kế toán · Mã phiếu: <strong>{job.payment.larkSlipCode}</strong> · Mã duyệt:{' '}
                <strong>{job.payment.larkApprovalCode || '—'}</strong> · Bản ghi Bảng 3.2: <strong>{job.payment.larkRecordId || '—'}</strong>
              </div>
              <div className="flex items-center gap-2">
                {job.payment.larkApprovalStatus && <span className="text-ink-2">Bước: {job.payment.larkApprovalStatus}</span>}
                {job.payment.larkSyncedAt && <span className="text-ink-3">{job.payment.larkSyncedAt.slice(0, 16).replace('T', ' ')}</span>}
                <Button size="sm" variant="secondary" disabled={syncingSlip === job.payment.larkSlipCode} onClick={() => void syncLarkSlip(job.payment.larkSlipCode)}>
                  {syncingSlip === job.payment.larkSlipCode ? 'Đang cập nhật…' : 'Cập nhật từ Lark'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Số tiền thực chuyển KOC/Agency">
              <Input
                type="number"
                min={0}
                value={job.payment.amount ?? taxCalc.contractDisplayValue}
                onChange={e =>
                  setJob(x => ({
                    ...x,
                    payment: { ...x.payment, amount: e.target.value === '' ? null : Number(e.target.value) },
                  }))
                }
              />
            </Field>
            <Field label="Trạng thái thanh toán Job">
              <Select
                value={job.payment.status}
                onChange={e => {
                  const next = e.target.value as PaymentStatus;
                  if (next !== 'NONE') {
                    const reason = jobPaymentBlocker({ ...job, payment: { ...job.payment, amount: job.payment.amount ?? taxCalc.contractDisplayValue } });
                    if (reason) {
                      notify(reason, 'warning');
                      return;
                    }
                  }
                  setJob(
                    x => ({
                      ...x,
                      payment: {
                        ...x.payment,
                        amount: x.payment.amount ?? taxCalc.contractDisplayValue,
                        status: next,
                        requestedAt: next === 'REQUESTED' && !x.payment.requestedAt ? getVietnamDateYmd() : x.payment.requestedAt,
                        paidAt: next === 'PAID' ? getVietnamDateYmd() : '',
                      },
                    }),
                    `Thanh toán ${job.code}: ${PAY_LABEL[next]}`
                  );
                }}
              >
                {(Object.keys(PAY_LABEL) as PaymentStatus[]).map(k => (
                  <option key={k} value={k}>
                    {PAY_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Link Bill chuyển khoản (UNC Kế toán)">
              <Input
                value={job.payment.uncBillUrl || ''}
                placeholder="https://drive.google.com/bill-unc..."
                onChange={e => {
                  const todayStr = getVietnamDateYmd();
                  setJob(x => ({
                    ...x,
                    payment: {
                      ...x.payment,
                      uncBillUrl: e.target.value,
                      uncSentToKocAt: e.target.value.trim() && !x.payment.uncSentToKocAt ? todayStr : x.payment.uncSentToKocAt,
                    },
                  }));
                }}
              />
            </Field>
            <Field label="Ngày gửi Bill UNC cho KOC">
              <Input
                type="date"
                value={job.payment.uncSentToKocAt || ''}
                onChange={e => setJob(x => ({ ...x, payment: { ...x.payment, uncSentToKocAt: e.target.value } }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Ghi chú thanh toán Job" className="md:col-span-2">
              <Input value={job.payment.note} onChange={e => setJob(x => ({ ...x, payment: { ...x.payment, note: e.target.value } }))} />
            </Field>
          </div>

          {blocker && job.payment.status === 'NONE' && <div className="text-xs text-critical">Điều kiện còn thiếu trước khi đẩy Lark thanh toán: {blocker}</div>}
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">Hiệu suất của {job.code} (Đối soát GMV &amp; Đơn hàng D14 / D30 / D60)</div>
            <Button size="sm" variant="secondary" disabled={syncingPerfJobId === job.id} onClick={() => void syncJobPerformanceFromUpaffiliate(d, job)}>
              {syncingPerfJobId === job.id ? 'Đang kéo số liệu daily…' : 'Đồng bộ GMV / Đơn hàng từ UpAffiliate'}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Mốc</th>
                  <th className={`${TH} text-right`}>Lượt xem</th>
                  <th className={`${TH} text-right`}>Đơn hàng</th>
                  <th className={`${TH} text-right`}>GMV</th>
                  <th className={`${TH} text-right`}>GMV / thù lao Job</th>
                </tr>
              </thead>
              <tbody>
                {perfRow('d14', '14 ngày')}
                {perfRow('d30', '30 ngày')}
                {perfRow('d60', '60 ngày')}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-1">
          <div className="text-sm font-semibold text-ink">Lịch sử Deal & Job</div>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-ink-2">
            {[...d.history].reverse().map((h, i) => (
              <li key={i}>
                {h.at.slice(0, 16).replace('T', ' ')} · {h.actor} · {h.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-lg border border-line bg-surface p-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={activeMonth} onChange={e => setMonth(e.target.value)}>
            {months.length === 0 && <option value="">Chưa có tháng</option>}
            {months.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-3" />
            <Input className="pl-8" placeholder="Tìm gian hàng" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
          {plansState === 'loading' && <div className="px-2 py-4 text-xs text-ink-3">Đang tải kế hoạch…</div>}
          {plansState === 'ready' && visiblePlans.length === 0 && <div className="px-2 py-4 text-xs text-ink-3">Chưa có kế hoạch trong tháng này.</div>}
          {visiblePlans.map(p => (
            <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} className={`w-full rounded-md border px-3 py-2 text-left transition ${p.id === selectedId ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'}`}>
              <div className="truncate text-[13px] font-medium text-ink">{p.storeName || p.title}</div>
              <div className="mt-0.5 truncate text-2xs text-ink-3">{p.pic || 'Chưa giao'}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        {!plan ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center text-sm text-ink-3">Chọn một kế hoạch ở bên trái để quản lý Deal và các Job.</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink">{plan.storeName || plan.title}</h2>
                <div className="mt-0.5 text-xs text-ink-3">
                  {plan.brandName} · {plan.month}
                  {saveLabel[status] ? ` · ${saveLabel[status]}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPullHangingOpen(true)}>
                  Chuyển Job chưa lên sóng từ tháng trước
                </Button>
                <Button size="sm" variant="secondary" disabled={syncingLark32} onClick={() => void syncJobsToLark32BookingList()}>
                  {syncingLark32 ? 'Đang đồng bộ Lark 3.2…' : 'Đồng bộ Lark 3.2 List duyệt book (Cả FOC 0đ)'}
                </Button>
                <Button size="sm" variant="secondary" onClick={openStage2SheetModal}>
                  Đồng bộ Google Sheet Brand (Vòng 2: KB / Demo / Air)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const clearedIds: string[] = [];
                    for (const d of deals) {
                      for (const j of d.jobs || []) {
                        if (!jobPaymentBlocker(j) && j.payment.status === 'NONE') clearedIds.push(j.id);
                      }
                    }
                    setSelectedBundleJobIds(clearedIds);
                    setBundlePaymentOpen(true);
                  }}
                >
                  Gom nhiều Job đẩy 1 Phiếu Lark 6.1
                </Button>
                {closingStatus && (
                  <Button size="sm" variant="secondary" onClick={() => setClosingModalOpen(true)}>
                    {closingStatus.locked ? 'Đã khóa sổ nghiệm thu tháng' : 'Cổng nghiệm thu cuối tháng'} · {closingStatus.phaseLabel}
                  </Button>
                )}
                {status === 'error' && (
                  <Button size="sm" variant="secondary" onClick={saveNow}>
                    Lưu lại
                  </Button>
                )}
              </div>
            </div>

            {closingStatus && (
              <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${closingStatus.locked ? 'border-critical/60 bg-critical/5 text-critical' : 'border-line bg-sunken text-ink-2'}`}>
                <div>
                  <span className="font-semibold text-ink">Lịch Khóa Sổ &amp; Đối Soát E2E Tháng {plan.month}:</span> {closingStatus.phaseLabel}
                </div>
                <Button size="sm" variant="secondary" onClick={() => setClosingModalOpen(true)}>
                  Cấu hình Khóa sổ &amp; Đối soát
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[
                { label: 'Số Deal', value: fmt(summary.count) },
                { label: 'Tổng số Job / Video Plan', value: `${fmt(summary.jobsCount)}/${fmt(plannedTotalVideos || summary.jobsCount)}` },
                { label: 'Job đã gắn dòng Brief', value: `${fmt(jobsWithBriefCount)}/${fmt(summary.jobsCount)} Job (${fmt(slots.length)} dòng Brief)` },
                { label: 'Tổng thù lao chốt', value: `${fmt(summary.totalFee)}đ` },
                { label: 'Đã thanh toán', value: `${fmt(summary.paid)}đ` },
                { label: 'GMV 30 ngày', value: summary.gmv30 ? `${fmt(summary.gmv30)}đ` : '—' },
              ].map(c => (
                <div key={c.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="text-2xs text-ink-3">{c.label}</div>
                  <div className="truncate text-sm font-semibold tabular-nums text-ink">{c.value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-ink-2">
              {STAGES.map(s => (
                <span key={s.key} className="rounded-md border border-line px-2 py-1">
                  {s.label}: {summary.byStage[s.key]} Job
                </span>
              ))}
              {summary.carryOverJobsCount > 0 && (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 font-medium text-amber-900">
                  Job tồn tháng cũ xử lý tiếp: {summary.carryOverAiredCount}/{summary.carryOverJobsCount} đã Air ({fmt(summary.carryOverFee)}đ · Ngân sách thuộc tháng cũ)
                </span>
              )}
            </div>

            {issues.length > 0 && (
              <div className="space-y-1">
                {issues.slice(0, 20).map((i, idx) => (
                  <div key={idx} className={`rounded-md border px-3 py-1.5 text-[13px] ${i.level === 'error' ? 'border-critical text-critical' : 'border-line text-ink'}`}>
                    <span className="mr-2 font-medium">{i.dealCode}</span>
                    {i.text}
                  </div>
                ))}
              </div>
            )}

            {(() => {
              // Cảnh báo deal "mồ côi": người phụ trách không còn thuộc nhóm Booking của gian (nghỉ việc / bị gỡ)
              if (!boardAccess?.bookers || boardAccess.bookers.length === 0) return null;
              const active = (d: PlanDeal) => (d.jobs || []).some(j => (!j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE') && j.payment.status !== 'PAID');
              const orphans = deals.filter(d => d.pic?.trim() && active(d) && !boardAccess.bookers!.some(b => isPersonInField({ id: '', name: b }, d.pic, boardAccess.storeCodes)));
              if (orphans.length === 0) return null;
              const names = Array.from(new Set(orphans.map(d => d.pic)));
              return (
                <div className="mb-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-ink">
                  <strong>{orphans.length} deal</strong> có người phụ trách không còn ở nhóm Booking của gian ({names.join(', ')}). Leader hoặc Giám đốc bàn giao ở Phân công nhân sự để có người làm tiếp.
                </div>
              );
            })()}

            <div className="space-y-2">
              <div className="text-sm font-semibold text-ink">KOC đã duyệt trên List KOC, chờ tạo Deal / Job ({confirmedNoDeal.length})</div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>KOC</th>
                      <th className={TH}>Bậc</th>
                      <th className={`${TH} text-right`}>Thù lao chốt</th>
                      <th className={TH}>Hợp đồng nguyên tắc / Hồ sơ pháp lý (1–N)</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedNoDeal.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-ink-3">
                          Không có KOC nào đang chờ tạo Deal.
                        </td>
                      </tr>
                    )}
                    {confirmedNoDeal.map(i => {
                      const fw = frameworks[normHandle(i.kocHandle)];
                      const st = frameworkState(fw);
                      const lps = legalProfilesOfHandle(i.kocHandle);
                      const hasValid = hasValidKocProfile(i.kocHandle);
                      const blocker = createDealBlocker(i, fw, deals, hasValid);
                      const existingDealOfKoc = deals.find(d => normHandle(d.kocHandle) === normHandle(i.kocHandle));
                      return (
                        <tr key={i.id}>
                          <td className={TD}>
                            <div className="font-medium">@{i.kocHandle.replace(/^@/, '')}</div>
                            <div className="text-2xs text-ink-3">{i.kocName}</div>
                          </td>
                          <td className={TD}>{itemGrade(i) === 'TAP UpAffiliate' ? 'FOC' : itemGrade(i)}</td>
                          <td className={`${TD} text-right`}>{fmt(itemFee(i))}đ</td>
                          <td className={TD}>
                            <span className={hasValid ? 'text-ink' : 'text-critical'}>
                              {st === 'VALID'
                                ? FRAMEWORK_STATE_LABEL[st]
                                : lps.length > 0
                                ? `Đủ hồ sơ pháp lý (${lps.length} bộ: ${lps.map(x => LEGAL_ENTITY_LABEL[x.legalType]).join(', ')})`
                                : FRAMEWORK_STATE_LABEL[st]}
                            </span>
                            {fw?.contractNo && <span className="ml-2 text-2xs text-ink-3">{fw.contractNo}</span>}
                            {fw?.hardcopyStatus && (
                              <span className="ml-2 text-2xs text-ink-3">· {HARDCOPY_STATUS_LABEL[fw.hardcopyStatus]}</span>
                            )}
                          </td>
                          <td className={`${TD} text-right`}>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="secondary" onClick={() => openFramework(i.kocHandle)}>
                                {fw ? 'Sửa HĐNT' : 'Ghi HĐNT'}
                              </Button>
                              {existingDealOfKoc && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={Boolean(blocker)}
                                  title={blocker || undefined}
                                  onClick={() => addListingItemAsJobToDeal(i.id, existingDealOfKoc.id)}
                                >
                                  + Thêm Job vào {existingDealOfKoc.code}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={onOpenContract ? 'secondary' : 'primary'}
                                disabled={Boolean(blocker)}
                                title={blocker || undefined}
                                onClick={() => makeDeal(i.id, false)}
                              >
                                Tạo Deal
                              </Button>
                              {onOpenContract && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  disabled={Boolean(blocker)}
                                  title={blocker || undefined}
                                  onClick={() => makeDeal(i.id, true)}
                                >
                                  Tạo Deal &amp; Ký Phụ lục SOW
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-ink">
                Danh sách Deal ({deals.length}) & các Job vận hành ({summary.jobsCount})
              </div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Deal / Mã Job</th>
                      <th className={TH}>KOC / Hạng mục Job</th>
                      <th className={TH}>Brief Content / Tuần</th>
                      <th className={TH}>Sản phẩm &amp; Kịch bản</th>
                      <th className={TH}>Phụ lục &amp; Pháp nhân</th>
                      <th className={`${TH} text-right`}>Thù lao Net</th>
                      <th className={TH}>Pipeline 7→18 &amp; Trách nhiệm</th>
                      <th className={TH}>Nghiệm thu</th>
                      <th className={TH}>Thanh toán / Lark</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {deals.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-sm text-ink-3">
                          Chưa có Deal nào.
                        </td>
                      </tr>
                    )}
                    {deals.map(d => {
                      const jobs = d.jobs || [];
                      const isExpanded = expandedDealIds[d.id] ?? true;
                      const clearedJobsCount = jobs.filter(isJobAcceptanceCleared).length;
                      const paidJobsCount = jobs.filter(j => j.payment.status === 'PAID').length;
                      const briefedJobsCount = jobs.filter(j => Boolean(j.slotId || j.briefCode || j.angle?.trim())).length;
                      const fw = frameworks[normHandle(d.kocHandle)];
                      return (
                        <React.Fragment key={d.id}>
                          {/* Dòng Deal Cha */}
                          <tr className="bg-sunken/70 font-medium">
                            <td className={TD}>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
                                onClick={() => setExpandedDealIds(prev => ({ ...prev, [d.id]: !isExpanded }))}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-ink-3" /> : <ChevronRight className="h-4 w-4 text-ink-3" />}
                                {d.code}
                              </button>
                            </td>
                            <td className={TD}>
                              <span className="font-semibold text-ink">@{d.kocHandle}</span>
                              <span className="ml-2 text-xs text-ink-3">
                                ({d.grade === 'TAP UpAffiliate' ? 'FOC' : d.grade} · {jobs.length} Job)
                              </span>
                            </td>
                            <td className={TD}>
                              <span className="text-xs text-ink-2">
                                {briefedJobsCount}/{jobs.length} gắn Brief
                              </span>
                            </td>
                            <td className={TD}>—</td>
                            <td className={TD}>
                              <span className="text-xs text-ink-2">
                                {jobs.filter(j => j.appendixNo.trim()).length}/{jobs.length} phụ lục
                              </span>
                            </td>
                            <td className={`${TD} text-right font-semibold`}>{fmt(dealTotalFee(d))}đ</td>
                            <td className={TD}>{STAGES.find(s => s.key === stageOf(d))?.label}</td>
                            <td className={TD}>
                              {clearedJobsCount}/{jobs.length} Job đạt
                            </td>
                            <td className={TD}>
                              {paidJobsCount}/{jobs.length} đã TT
                            </td>
                            <td className={`${TD} text-right`}>
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="secondary" onClick={() => addNewJobInsideDeal(d)}>
                                  + Thêm Job
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => openDealWithJob(d.id, jobs[0]?.id)}>
                                  Chi tiết
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Các dòng Job Con thuộc Deal */}
                          {isExpanded &&
                            jobs.map(job => {
                              const jStage = jobStageOf(job);
                              const jCleared = isJobAcceptanceCleared(job);
                              const jBlocker = jobPaymentBlocker(job);
                              const jPipe = computeJobPipelineState(job, fw);
                              const addonsCount = (job.addons || []).filter(a => a.status !== 'DROPPED').length;
                              const linkedSlot = job.slotId ? slots.find(s => s.id === job.slotId) : undefined;
                              const displayBriefCode = job.briefCode || linkedSlot?.briefCode || '';
                              const displayPillar = job.pillar || linkedSlot?.pillar || '';
                              const displayAngle = job.angle || linkedSlot?.angle || '';
                              return (
                                <tr
                                  key={job.id}
                                  className="cursor-pointer hover:bg-sunken/40"
                                  onClick={() => openDealWithJob(d.id, job.id)}
                                >
                                  <td className={`${TD} pl-7 text-xs font-medium text-ink-2`}>
                                    <div>{job.code}</div>
                                    {job.sourcePlanMonth && (
                                      <div className="mt-0.5 inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-2xs font-semibold text-amber-900">
                                        Tồn kỳ {job.sourcePlanMonth}
                                      </div>
                                    )}
                                    {job.isPostAirUpsell && <div className="text-2xs text-accent">Phụ lục sau Air</div>}
                                    {job.isLivestreamJob && <div className="text-2xs text-ink">Phiên Livestream</div>}
                                  </td>
                                  <td className={TD}>
                                    <div className="text-[13px] font-medium text-ink">{job.title}</div>
                                    <div className="text-2xs text-ink-3">
                                      {PUBLISH_PLATFORM_LABEL[job.publishPlatform || 'TIKTOK']} → {COMMERCE_PLATFORM_LABEL[job.commercePlatform || 'TIKTOK_SHOP']} ·{' '}
                                      {addonsCount > 0 ? `+${addonsCount} DVGT (${fmt(jobAddonsFee(job))}đ)` : '1 Video'}
                                    </div>
                                  </td>
                                  <td className={TD}>
                                    {displayBriefCode || displayAngle ? (
                                      <div>
                                        <div className="text-xs font-semibold text-ink">
                                          {displayBriefCode || 'Brief'}
                                          {job.week ? ` · ${job.week.split(' ')[0]}` : ''}
                                        </div>
                                        <div className="max-w-[200px] truncate text-2xs text-ink-3">
                                          {[displayPillar, displayAngle].filter(Boolean).join(' — ') || 'Đã gắn Brief'}
                                        </div>
                                      </div>
                                    ) : job.sourcePlanMonth ? (
                                      <div>
                                        <div className="text-xs font-semibold text-amber-900">
                                          Kéo từ {job.sourcePlanMonth}
                                          {job.week ? ` · ${job.week.split(' ')[0]}` : ''}
                                        </div>
                                        <div className="text-2xs text-ink-3">Ngân sách thuộc {job.sourcePlanMonth}</div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-critical">Chưa gắn Brief</span>
                                    )}
                                  </td>
                                  <td className={TD}>
                                    <div className="text-xs text-ink">
                                      {[job.productGroupName, job.productName].filter(Boolean).join(' · ') || '—'}
                                    </div>
                                    <div className="text-2xs text-ink-3">
                                      KB: {SCRIPT_LABEL[job.script.status]}
                                      {job.script.demoStatus && job.script.demoStatus !== 'NONE'
                                        ? ` · Demo: ${SCRIPT_LABEL[job.script.demoStatus]}`
                                        : ''}
                                    </div>
                                  </td>
                                  <td className={TD}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {job.appendixNo ? (
                                        <span className="text-xs font-medium text-ink">{job.appendixNo}</span>
                                      ) : (
                                        <span className="text-xs text-ink-3">Chưa ký</span>
                                      )}
                                      {onOpenContract && (
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            onOpenContract(
                                              planJobToBookingDeal(d, job, plan, kocIdOfHandle(d.kocHandle), fw?.contractNo),
                                              'SOW'
                                            );
                                          }}
                                          className="rounded border border-accent/30 bg-accent-soft/25 px-1.5 py-0.5 text-2xs font-semibold text-accent hover:bg-accent-soft/50"
                                        >
                                          {job.appendixNo ? 'Mở SOW' : 'Ký Phụ lục SOW'}
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-2xs text-ink-3">
                                      {LEGAL_ENTITY_LABEL[job.entityType || 'INDIVIDUAL']}
                                    </div>
                                  </td>
                                  <td className={`${TD} text-right tabular-nums`}>
                                    <div>{fmt(jobTotalFee(job))}đ</div>
                                    <div className="text-2xs text-ink-3">
                                      HĐ: {fmt(computeJobContractAmounts(job).contractDisplayValue)}đ
                                    </div>
                                  </td>
                                  <td className={TD}>
                                    <div className="text-xs font-medium text-ink">{STAGES.find(s => s.key === jStage)?.label}</div>
                                    <div className="text-2xs text-ink-2">{jPipe.contentTrack}</div>
                                    <div className="text-2xs font-medium text-accent">{jPipe.ballLabel}</div>
                                  </td>
                                  <td className={TD}>
                                    {jCleared ? (
                                      <span className="font-medium text-ink">Đã đạt</span>
                                    ) : (
                                      <span className="text-ink-3">{ACCEPT_LABEL[job.acceptance.status]}</span>
                                    )}
                                  </td>
                                  <td className={TD}>
                                    <div>{PAY_LABEL[job.payment.status]}</div>
                                    {job.payment.larkSlipCode && (
                                      <div className="text-2xs text-ink-3">{job.payment.larkSlipCode}</div>
                                    )}
                                    {job.payment.uncBillUrl && (
                                      <div className="text-2xs text-ink">Đã gửi UNC</div>
                                    )}
                                  </td>
                                  <td className={`${TD} text-right`} onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-end gap-1.5">
                                      {jCleared && job.payment.status === 'NONE' && !jBlocker && (
                                        <Button
                                          size="sm"
                                          variant="primary"
                                          disabled={pushingLarkJobId === job.id}
                                          onClick={() => void pushJobToLarkPayment(d, job)}
                                        >
                                          Đẩy Lark
                                        </Button>
                                      )}
                                      <Button size="sm" variant="secondary" onClick={() => openDealWithJob(d.id, job.id)}>
                                        Vận hành Job
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <SheetPullPreviewModal
        open={stage2Preview !== null}
        changes={stage2Preview || []}
        busy={stage2Syncing}
        onCancel={() => setStage2Preview(null)}
        onConfirm={() => void pullStage2FromBrandSheet(true)}
      />

      <Modal open={Boolean(openDeal)} onClose={() => setOpenDealId(null)} title={openDeal ? `Quản lý Deal ${openDeal.code} & các Job` : 'Deal'} size="xl">
        {openDeal && !canEditDealFields(openDeal) && (
          <div className="mb-3 rounded-lg border border-line bg-sunken px-3 py-2 text-xs text-ink-2">
            Deal do {openDeal.pic || 'người khác'} phụ trách — bạn chỉ xem. Booking chính / Leader của gian sửa được mọi deal.
          </div>
        )}
        {openDeal && (
          <fieldset disabled={!canEditDealFields(openDeal)} className="min-w-0 border-0 p-0 m-0">
            {renderDealModal(openDeal)}
          </fieldset>
        )}
      </Modal>

      <Modal
        open={closingModalOpen}
        onClose={() => setClosingModalOpen(false)}
        title={`Cổng Khóa sổ Nghiệm thu & Đối soát (${plan?.month || ''})`}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="md" variant="primary" onClick={() => setClosingModalOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-sunken p-3 text-xs text-ink-2">
            <div className="font-semibold text-ink">Quy chuẩn Khóa sổ Nghiệm thu Cuối tháng (E2E v1.0.0 &amp; Các SLA B2C):</div>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li><strong>Ngày 2 hàng tháng:</strong> Hoàn tất điền toàn bộ dữ liệu nghiệm thu tháng trước trên hệ thống.</li>
              <li><strong>Ngày làm việc thứ 4:</strong> Kế toán gửi bảng tổng hợp lỗi Lần 1.</li>
              <li><strong>Ngày làm việc thứ 5 (09:00 – 17:30):</strong> Mở cửa sổ chỉnh sửa thông tin Lần 1.</li>
              <li><strong>Ngày làm việc thứ 10 – 11:</strong> Gửi bảng tổng hợp lỗi Lần 2 &amp; Mở cửa sổ chỉnh sửa Lần 2 trước khi khóa sổ vĩnh viễn.</li>
            </ul>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Chế độ cổng nghiệm thu tháng" className="md:col-span-2">
              <Select
                value={closingState.mode}
                onChange={e =>
                  patchClosingState(cur => ({
                    ...cur,
                    mode: e.target.value as ClosingWindowMode,
                  }))
                }
              >
                <option value="AUTO">Tự động theo lịch (Khóa sau ngày mùng 2 tháng kế tiếp)</option>
                <option value="OPEN_ROUND_1">Kế toán mở cửa sổ sửa Lần 1 (Ngày LV thứ 5 · 09:00–17:30)</option>
                <option value="OPEN_ROUND_2">Kế toán mở cửa sổ sửa Lần 2 (Ngày LV thứ 11 · 09:00–17:30)</option>
                <option value="LOCKED">Khóa sổ nghiệm thu tháng</option>
              </Select>
            </Field>
            <Field label="Ghi chú tổng hợp lỗi Lần 1 (Ngày LV thứ 4)">
              <Textarea
                rows={3}
                value={closingState.round1ErrorLog || ''}
                placeholder="Danh sách Job cần bổ sung chứng từ Lần 1..."
                onChange={e => patchClosingState(cur => ({ ...cur, round1ErrorLog: e.target.value }))}
              />
            </Field>
            <Field label="Ghi chú tổng hợp lỗi Lần 2 (Ngày LV thứ 10)">
              <Textarea
                rows={3}
                value={closingState.round2ErrorLog || ''}
                placeholder="Danh sách lỗi Brand/Kế toán phản hồi Lần 2..."
                onChange={e => patchClosingState(cur => ({ ...cur, round2ErrorLog: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(fwModal)}
        onClose={() => setFwModal(null)}
        title={fwModal ? `Hợp đồng nguyên tắc & Bản cứng Kế toán @${normHandle(fwModal.handle)}` : 'Hợp đồng nguyên tắc'}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="md" variant="secondary" onClick={() => setFwModal(null)}>
              Hủy
            </Button>
            <Button size="md" variant="primary" onClick={() => void saveFramework()}>
              Lưu
            </Button>
          </div>
        }
      >
        {fwModal && signedFrameworkOf(fwModal.handle) && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
            <span className="text-ink">Có hợp đồng nguyên tắc đã ký trong mô-đun Hợp đồng: {signedFrameworkOf(fwModal.handle)!.record.title}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const f = signedFrameworkOf(fwModal.handle)!;
                setFwForm(prev => ({ ...prev, contractNo: numberOfRecord(f.record), signedAt: f.signedAt || prev.signedAt, note: prev.note || `Từ hồ sơ ${f.record.id}` }));
              }}
            >
              Điền từ hồ sơ
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Số hợp đồng nguyên tắc">
            <Input value={fwForm.contractNo} onChange={e => setFwForm({ ...fwForm, contractNo: e.target.value })} />
          </Field>
          <Field label="Loại pháp nhân ký HĐNT">
            <Select
              value={fwForm.entityType}
              onChange={e => setFwForm({ ...fwForm, entityType: e.target.value as LegalEntityType })}
            >
              {(Object.keys(LEGAL_ENTITY_LABEL) as LegalEntityType[]).map(k => (
                <option key={k} value={k}>
                  {LEGAL_ENTITY_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ngày ký">
            <Input type="date" value={fwForm.signedAt} onChange={e => setFwForm({ ...fwForm, signedAt: e.target.value })} />
          </Field>
          <Field label="Hiệu lực đến">
            <Input type="date" value={fwForm.validTo} onChange={e => setFwForm({ ...fwForm, validTo: e.target.value })} />
          </Field>
          <Field label="Trạng thái Bản cứng nộp Kế toán (Hạn ngày 15 tháng T+1)">
            <Select
              value={fwForm.hardcopyStatus}
              onChange={e => setFwForm({ ...fwForm, hardcopyStatus: e.target.value as HardcopyStatus })}
            >
              {(Object.keys(HARDCOPY_STATUS_LABEL) as HardcopyStatus[]).map(k => (
                <option key={k} value={k}>
                  {HARDCOPY_STATUS_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hạn nộp bản cứng cho Kế toán">
            <Input
              type="date"
              value={fwForm.hardcopyDueAt}
              onChange={e => setFwForm({ ...fwForm, hardcopyDueAt: e.target.value })}
            />
          </Field>
          <Field label="Link file hợp đồng" className="md:col-span-2">
            <Input value={fwForm.fileUrl} placeholder="https://" onChange={e => setFwForm({ ...fwForm, fileUrl: e.target.value })} />
          </Field>
          <Field label="Các kênh @handle trực thuộc MCN dùng chung HĐNT này (cách nhau dấu phẩy)" className="md:col-span-2">
            <Input
              value={fwForm.coveredHandlesText}
              placeholder="@koc_1, @koc_2, @koc_3..."
              onChange={e => setFwForm({ ...fwForm, coveredHandlesText: e.target.value })}
            />
          </Field>
          <Field label="Ghi chú" className="md:col-span-2">
            <Textarea rows={2} value={fwForm.note} onChange={e => setFwForm({ ...fwForm, note: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={stage2SheetOpen}
        onClose={() => setStage2SheetOpen(false)}
        title="Đồng bộ Vòng 2 với Google Sheet Brand (Kịch bản, Video Demo, Link Air)"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="md" variant="secondary" onClick={() => setStage2SheetOpen(false)}>
              Đóng
            </Button>
            <Button size="md" variant="secondary" disabled={stage2Syncing} onClick={() => void pullStage2FromBrandSheet()}>
              {stage2Syncing ? 'Đang đọc Sheet…' : 'Kéo kết quả Brand duyệt KB / Demo'}
            </Button>
            <Button size="md" variant="primary" disabled={stage2Syncing} onClick={() => void pushStage2ToBrandSheet()}>
              {stage2Syncing ? 'Đang đẩy lên Sheet…' : 'Đẩy Link KB / Demo (Đạt Vòng 1) / Air lên Sheet'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Link Google Sheet của Brand" className="md:col-span-2">
            <Input
              value={stage2SheetUrl}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              onChange={e => setStage2SheetUrl(e.target.value)}
            />
          </Field>
          <Field label="Tên Tab tháng trên Sheet">
            <Input value={stage2TabName} onChange={e => setStage2TabName(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={bundlePaymentOpen}
        onClose={() => setBundlePaymentOpen(false)}
        title="Gom nhiều Job đẩy chung 1 Phiếu đề nghị thanh toán Lark 6.1"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="md" variant="secondary" onClick={() => setBundlePaymentOpen(false)}>
              Hủy
            </Button>
            <Button
              size="md"
              variant="primary"
              disabled={bundlingLark || selectedBundleJobIds.length === 0}
              onClick={() => void pushBundleJobsToLarkPayment()}
            >
              {bundlingLark ? 'Đang đẩy sang Lark…' : `Đẩy 1 Phiếu Lark 6.1 (${selectedBundleJobIds.length} Job)`}
            </Button>
          </div>
        }
      >
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {deals.flatMap(d =>
            (d.jobs || []).map(j => {
              const b = jobPaymentBlocker(j);
              const checked = selectedBundleJobIds.includes(j.id);
              return (
                <label
                  key={j.id}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded border border-line px-3 py-2 text-xs hover:bg-sunken"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        setSelectedBundleJobIds(prev =>
                          e.target.checked ? [...prev, j.id] : prev.filter(id => id !== j.id)
                        )
                      }
                    />
                    <span className="font-semibold text-ink">
                      {j.code} · @{d.kocHandle}
                    </span>
                    <span className="text-ink-2">{j.title}</span>
                    {b && <span className="text-critical">({b})</span>}
                  </div>
                  <span className="font-semibold tabular-nums text-ink">
                    {fmt(j.payment.amount ?? computeJobContractAmounts(j).contractDisplayValue)}đ
                  </span>
                </label>
              );
            })
          )}
        </div>
      </Modal>

      <VideoProductScreenshotModal
        open={Boolean(screenshotTarget)}
        onClose={() => setScreenshotTarget(null)}
        initialVideoUrl={screenshotTarget?.job.airLink || ''}
        productName={
          [
            screenshotTarget?.job.productName ||
              screenshotTarget?.job.productGroupName ||
              screenshotTarget?.deal.productName ||
              screenshotTarget?.deal.productGroupName ||
              plan?.brandName ||
              '',
            screenshotTarget
              ? findCatalogProduct(catalog, screenshotTarget.job.productName, screenshotTarget.job.productGroupId)?.product.detectKeywords
              : '',
          ]
            .filter(Boolean)
            .join(', ') ||
          screenshotTarget?.job.productGroupName ||
          screenshotTarget?.deal.productName ||
          screenshotTarget?.deal.productGroupName ||
          plan?.brandName ||
          ''
        }
        brandName={plan?.brandName || ''}
        dealId={screenshotTarget ? `PJ-${screenshotTarget.job.id}` : undefined}
        dealCode={screenshotTarget ? screenshotTarget.job.code : undefined}
        authorHandle={screenshotTarget?.deal.kocHandle}
        existingScreenshots={
          screenshotTarget
            ? findSavedScreenshotsForContext({
                dealId: `PJ-${screenshotTarget.job.id}`,
                dealCode: screenshotTarget.job.code,
                authorHandle: screenshotTarget.deal.kocHandle,
                videoUrl: screenshotTarget.job.airLink,
              })
            : []
        }
        onApplyScreenshots={shots => {
          notify(
            `Đã lưu ${shots.length} ảnh chụp sản phẩm cho Biên bản nghiệm thu (${screenshotTarget?.job.code || ''}).`,
            'success',
          );
        }}
      />

      <DraftBbntPreviewModal
        open={Boolean(draftBbntTarget && plan)}
        onClose={() => setDraftBbntTarget(null)}
        deal={
          draftBbntTarget && plan
            ? planJobToBookingDeal(
                draftBbntTarget.deal,
                draftBbntTarget.job,
                plan,
                kocIdOfHandle(draftBbntTarget.deal.kocHandle),
                frameworks[normHandle(draftBbntTarget.deal.kocHandle)]?.contractNo,
              )
            : null
        }
        koc={draftBbntTarget ? kocOfHandle(draftBbntTarget.deal.kocHandle) : undefined}
        existingRecords={contractRecords}
        onSavedRecord={rec => {
          setContractRecords(prev => [rec, ...prev.filter(x => x.id !== rec.id)]);
          notify(`Đã lưu bản nháp BBNT (${rec.title}) cho ${draftBbntTarget?.job.code || 'Job'}.`, 'success');
        }}
        onOpenFullEditor={
          onOpenContract
            ? targetDeal => onOpenContract(targetDeal, 'BBNT')
            : undefined
        }
      />

      {plan && (
        <PullHangingJobsModal
          open={pullHangingOpen}
          onClose={() => setPullHangingOpen(false)}
          plan={plan}
          canMergeIntoBreakdown={false}
          onPulledSuccess={({ updatedDealBoardData }) => {
            if (updatedDealBoardData) {
              update(updatedDealBoardData as DealBoardData);
            }
          }}
          onNotify={(msg, tone) => notify(msg, tone || 'info')}
        />
      )}
    </div>
  );
};
