'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileText, Lightbulb, Plus, Search, Send, Trash2, UserPlus } from 'lucide-react';
import type { BookingDealItem, ContentAngleItem, InputPlanBreakdownState, KocItem, StorePortfolioItem } from '../../lib/types';
import { Button, ConfirmDialog, Field, Input, Modal, Select, Status, Textarea } from '../ui';
import { CONTENT_PILLARS, pillarGroupOf } from '../../lib/contentPillars';
import { fetchClientMonthlyPlans, getCachedClientMonthlyPlans } from '../../lib/useMonthlyPlanSync';
import {
  addKocToSlot,
  BRIEF_FORMAT_OPTIONS,
  CONTENT_ROWS,
  DEFAULT_KL67_MANDATORY_SHOTS,
  DEFAULT_KL67_RIGHTS_GUARDRAILS,
  diagnoseContentPlan,
  ensureSequentialBriefCodes,
  formatBriefCode,
  FUNNEL_STAGE_OPTIONS,
  generateMissingSlotsFromBreakdown,
  inferSlotFunnelStage,
  isBriefReady,
  isPlaced,
  isVettingGuardrailRow,
  newSlot,
  removeKocFromSlot,
  requiredGrid,
  resolveBriefMode,
  slotKocHandles,
  slotSpecsFromBrandPlan,
  slotSpecsFromOneSheetPlan,
  slotTargetQty,
  syncSlotsFromBrandPlan,
  type ContentBriefMode,
  type ContentFunnelStage,
  type ContentPlanData,
  type ContentRowKey,
  type ContentSlot,
} from '../../lib/contentPlanRules';
import { useBrandProfiles, findBrandProfile } from '../../lib/brands/useBrandProfiles';
import { StandardBriefPreviewModal } from '../brands/StandardBriefPreviewModal';
import { buildBrandOneSheetPlanData } from '../../lib/oneSheetPlanBuilder';
import type { BrandMonthlyPlanItem, BrandOneSheetPlanData } from '../../lib/types';
import {
  findCatalogProduct,
  listAllCatalogProducts,
  resolveEffectiveProductGuidelines,
  resolveEffectiveProductLinks,
  resolveEffectiveSampleQuota,
  type BrandProductCatalog,
  type CatalogProduct,
} from '../../lib/productCatalog';
import { usePlanRecord } from '../../lib/usePlanRecord';
import { detectChannel, type BrandPlanData, type PlanChannel } from '../../lib/brandPlanRules';
import { CreatorMatchModal } from './CreatorMatchModal';
import { ContentCopilotModal } from '../content/ContentCopilotModal';
import { INITIAL_CONTENT_ANGLES } from '../../lib/contentAngleData';
import { loadSavedBrandAngles, SAVED_BRAND_ANGLES_EVENT } from '../../lib/contentContextBuilder';
import { BOOKING_LIST_COLUMNS, buildBookingListRows, defaultBookingTabName, resolveBrandBookingSheetUrl } from '../../lib/bookingList';

interface ContentPlanBoardProps {
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  currentUserName?: string;
  initialPlanId?: string;
  initialStoreName?: string;
  initialMonth?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const EMPTY: ContentPlanData = { slots: [] };
const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const weekShort = (w: string) => w.split(' ')[0];

const PLAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING_PRE_APPROVAL: 'Chờ sơ duyệt',
  PENDING_APPROVAL: 'Chờ Giám đốc',
  REVISION_REQUESTED: 'Cần sửa',
  PRE_APPROVED: 'Đã sơ duyệt',
  LEAD_APPROVED: 'Đã duyệt',
  BRAND_APPROVED: 'Đã duyệt',
  APPROVED: 'Đã duyệt',
  LOCKED: 'Đã duyệt',
  IN_EXECUTION: 'Đã duyệt',
  COMPLETED: 'Hoàn tất',
};

const saveLabel: Record<string, string> = { idle: '', loading: 'Đang tải…', saved: 'Đã lưu', dirty: 'Chưa lưu', saving: 'Đang lưu…', error: 'Lưu lỗi' };

export const ContentPlanBoard: React.FC<ContentPlanBoardProps> = ({
  kocs = [],
  deals = [],
  currentUserName = 'Nhân viên',
  initialPlanId,
  initialStoreName,
  initialMonth,
  onNotify,
}) => {
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => onNotify?.(msg, type);

  const [plans, setPlans] = useState<InputPlanBreakdownState[]>([]);
  const [plansState, setPlansState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [month, setMonth] = useState(initialMonth || '');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialPlanId || null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [backlogGroup, setBacklogGroup] = useState('ALL');

  useEffect(() => {
    if (initialMonth && initialMonth !== month) {
      setMonth(initialMonth);
    }
  }, [initialMonth]);

  useEffect(() => {
    if (initialPlanId && initialPlanId !== selectedId) {
      setSelectedId(initialPlanId);
    }
  }, [initialPlanId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lắng nghe sự kiện cập nhật Brand Monthly Plans từ DB để tự động cập nhật
  const [brandPlansRevision, setBrandPlansRevision] = useState(0);
  useEffect(() => {
    const handleBrandPlansUpdate = () => {
      setBrandPlansRevision(v => v + 1);
    };
    window.addEventListener('upbase:brand-monthly-plans-updated', handleBrandPlansUpdate);
    return () => window.removeEventListener('upbase:brand-monthly-plans-updated', handleBrandPlansUpdate);
  }, []);

  const months = useMemo(() => Array.from(new Set(plans.map(p => p.month))).sort().reverse(), [plans]);
  const activeMonth = month || initialMonth || months[0] || '';
  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans
      .filter(p => p.month === activeMonth)
      .filter(p => !q || `${p.storeName || ''} ${p.brandName} ${p.pic || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.storeName || a.title).localeCompare(b.storeName || b.title));
  }, [plans, activeMonth, search]);

  const activePlanId = useMemo(() => {
    if (selectedId && visiblePlans.some(p => p.id === selectedId)) return selectedId;
    if (initialPlanId && visiblePlans.some(p => p.id === initialPlanId)) return initialPlanId;
    if (initialStoreName && visiblePlans.some(p => p.storeName === initialStoreName)) {
      return visiblePlans.find(p => p.storeName === initialStoreName)!.id;
    }
    return visiblePlans[0]?.id ?? null;
  }, [selectedId, visiblePlans, initialPlanId, initialStoreName]);

  const plan = useMemo(() => plans.find(p => p.id === activePlanId) || null, [plans, activePlanId]);
  const { profiles: brandProfiles } = useBrandProfiles();
  const activeBrandProfile = useMemo(() => {
    if (!plan) return null;
    const parentBrand = (plan.parentBrand || plan.brandName || '').split('_')[0].trim();
    return findBrandProfile(brandProfiles, parentBrand) || findBrandProfile(brandProfiles, plan.brandName) || brandProfiles[0] || null;
  }, [plan, brandProfiles]);
  const [savedAnglesSyncTick, setSavedAnglesSyncTick] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setSavedAnglesSyncTick(t => t + 1);
    window.addEventListener(SAVED_BRAND_ANGLES_EVENT, handleUpdate);
    return () => window.removeEventListener(SAVED_BRAND_ANGLES_EVENT, handleUpdate);
  }, []);

  const brandSavedAngles = useMemo(() => {
    const bName = (plan?.parentBrand || plan?.brandName || '').split('_')[0].trim();
    const storageAngles = loadSavedBrandAngles(bName);
    const bNameLower = bName.toLowerCase();
    const matched = bNameLower
      ? INITIAL_CONTENT_ANGLES.filter(
          a => a.brandName?.toLowerCase().includes(bNameLower) || bNameLower.includes(a.brandName?.toLowerCase() || '')
        )
      : INITIAL_CONTENT_ANGLES;

    const map = new Map<string, ContentAngleItem>();
    storageAngles.forEach(a => map.set(a.id, a));
    (matched.length > 0 ? matched : INITIAL_CONTENT_ANGLES).forEach(a => {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    });
    return Array.from(map.values());
  }, [plan?.brandName, plan?.parentBrand, savedAnglesSyncTick]);
  const [standardBriefOpen, setStandardBriefOpen] = useState(false);
  const { data, status, update, saveNow } = usePlanRecord<ContentPlanData>('/api/content-plan', plan?.id ?? null, EMPTY, msg => notify(msg, 'warning'));
  const slots = useMemo(() => ensureSequentialBriefCodes(data.slots || []), [data.slots]);

  const [catalog, setCatalog] = useState<BrandProductCatalog>({ groups: [] });
  useEffect(() => {
    if (!plan?.brandName) {
      setCatalog({ groups: [] });
      return;
    }
    let cancelled = false;
    fetch(`/api/product-catalog?brand=${encodeURIComponent(plan.brandName)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(b => {
        if (!cancelled && b?.data) setCatalog(b.data as BrandProductCatalog);
      })
      .catch(() => {
        if (!cancelled) setCatalog({ groups: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [plan?.brandName]);

  const req = useMemo(() => (plan ? requiredGrid(plan) : null), [plan]);
  const diag = useMemo(() => (plan ? diagnoseContentPlan(plan, slots, catalog) : null), [plan, slots, catalog]);
  const storeChannel: PlanChannel = useMemo(() => (plan ? detectChannel(plan) || 'TIKTOK' : 'TIKTOK'), [plan]);
  const targetPlatformLabel = storeChannel === 'SHOPEE' ? 'Shopee' : 'TikTok Shop';

  const buildCatalogSelectionPatch = (groupId: string, productId?: string) => {
    const grp = catalog.groups.find(g => g.id === groupId);
    const prod: CatalogProduct | undefined =
      (productId && grp?.products.find(p => p.id === productId)) ||
      (productId && findCatalogProduct(catalog, productId, groupId)?.product) ||
      grp?.products[0];
    const effGuide = resolveEffectiveProductGuidelines(catalog, groupId || prod && findCatalogProduct(catalog, prod.id)?.group.id || '', prod);
    const effLinks = resolveEffectiveProductLinks(catalog, prod);
    const matchedCart = effLinks.cartLinks.find(l => l.platform === targetPlatformLabel) || effLinks.cartLinks[0];
    const matchedAff = effLinks.affiliateLinks.find(l => l.platform === targetPlatformLabel) || effLinks.affiliateLinks[0];
    const resolvedGroupName = grp?.name || (prod ? findCatalogProduct(catalog, prod.id)?.group.name : '') || '';
    const displayProduct = prod ? (resolvedGroupName && resolvedGroupName !== prod.name ? `${resolvedGroupName} · ${prod.name}` : prod.name) : resolvedGroupName;
    return {
      productGroupId: groupId || (prod ? findCatalogProduct(catalog, prod.id)?.group.id || '' : ''),
      productId: prod?.id || '',
      sku: prod?.sku || prod?.name || '',
      product: displayProduct,
      usp: effGuide.usp,
      forbiddenClaims: effGuide.forbiddenClaims,
      detectKeywords: effGuide.detectKeywords,
      cartUrl: matchedCart?.url || '',
      affiliateUrl: matchedAff?.url || '',
      commissionPct: matchedAff?.commissionPct ?? null,
    };
  };

  const rowsShown = useMemo(() => {
    if (!req) return [];
    return CONTENT_ROWS.filter(r => req.weeks.some(w => (req.grid[w]?.[r.key] || 0) > 0) || slots.some(s => s.row === r.key));
  }, [req, slots]);

  const setSlots = (next: ContentSlot[]) => update({ ...data, slots: ensureSequentialBriefCodes(next) });

  // --- kéo thả ---
  const placeSlot = (id: string, week: string, row: ContentRowKey) => {
    const vetting = isVettingGuardrailRow(row);
    setSlots(
      slots.map(s =>
        s.id === id
          ? {
              ...s,
              week,
              row,
              briefMode: vetting ? 'VETTING_GUARDRAILS' : s.briefMode,
              mandatoryShots: vetting ? s.mandatoryShots || DEFAULT_KL67_MANDATORY_SHOTS : s.mandatoryShots,
              rightsGuardrails: vetting ? s.rightsGuardrails || DEFAULT_KL67_RIGHTS_GUARDRAILS : s.rightsGuardrails,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
  };
  const unplaceSlot = (id: string) => {
    setSlots(slots.map(s => (s.id === id ? { ...s, week: null, row: null, updatedAt: new Date().toISOString() } : s)));
  };

  // --- khởi tạo các dòng Brief mẫu theo khung tuần × bậc KL (mỗi ô thiếu N video -> 1 dòng Brief có SL mục tiêu = N) ---
  const handleGenerateAllPlanBriefs = () => {
    if (!plan) return;
    const defaultHero = listAllCatalogProducts(catalog)[0];
    const defaultProdLabel = defaultHero ? `${defaultHero.group.name} · ${defaultHero.product.name}` : '';
    const { slots: next, addedCount, addedVideos } = generateMissingSlotsFromBreakdown(plan, slots, currentUserName, defaultProdLabel);
    if (addedCount === 0) {
      notify(`Các dòng Brief đã phủ đủ tổng số video theo phân rã tuần.`, 'info');
      return;
    }
    setSlots(next);
    notify(`Đã khởi tạo ${addedCount} dòng Brief mẫu cho ${addedVideos} video mục tiêu.`, 'success');
  };

  // --- thêm dòng định hướng / brief mẫu ---
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    pillar: CONTENT_PILLARS[0].name,
    funnelStage: 'CONSIDERATION' as ContentFunnelStage,
    communicationObjective: '',
    qty: 5,
    briefMode: 'DIRECTIVE' as ContentBriefMode,
    productGroupId: '',
    productId: '',
    sku: '',
    product: '',
    cartUrl: '',
    affiliateUrl: '',
    commissionPct: null as number | null,
    detectKeywords: '',
    angle: '',
    hook: '',
    usp: '',
    forbiddenClaims: '',
    mandatoryShots: '',
    rightsGuardrails: '',
    cta: '',
    format: BRIEF_FORMAT_OPTIONS[0] as string,
    briefUrl: '',
    week: '',
    row: '' as ContentRowKey | '',
  });

  const openAdd = (week?: string, row?: ContentRowKey) => {
    let defaultQty = 5;
    if (week && row && req) {
      const need = req.grid[week]?.[row] || 0;
      const have = slots.filter(s => s.week === week && s.row === row).reduce((sum, s) => sum + slotTargetQty(s), 0);
      defaultQty = Math.max(1, need - have || need || 1);
    }
    const isVetting = isVettingGuardrailRow(row);
    setAddForm(f => ({
      ...f,
      qty: defaultQty,
      week: week || '',
      row: row || '',
      funnelStage: inferSlotFunnelStage(row, f.pillar),
      briefMode: isVetting ? 'VETTING_GUARDRAILS' : 'DIRECTIVE',
      mandatoryShots: isVetting ? f.mandatoryShots || DEFAULT_KL67_MANDATORY_SHOTS : f.mandatoryShots,
      rightsGuardrails: isVetting ? f.rightsGuardrails || DEFAULT_KL67_RIGHTS_GUARDRAILS : f.rightsGuardrails,
    }));
    setAddOpen(true);
  };

  const confirmAdd = () => {
    if (!plan) return;
    const qty = Math.max(1, Math.min(500, Math.floor(addForm.qty) || 1));
    const placed = addForm.week && addForm.row;
    const created = newSlot({
      targetQty: qty,
      pillar: addForm.pillar,
      funnelStage: addForm.funnelStage,
      communicationObjective: addForm.communicationObjective || undefined,
      angle: addForm.angle,
      product: addForm.product,
      productGroupId: addForm.productGroupId || undefined,
      productId: addForm.productId || undefined,
      sku: addForm.sku || undefined,
      cartUrl: addForm.cartUrl || undefined,
      affiliateUrl: addForm.affiliateUrl || undefined,
      commissionPct: addForm.commissionPct,
      detectKeywords: addForm.detectKeywords || undefined,
      hook: addForm.hook,
      usp: addForm.usp,
      forbiddenClaims: addForm.forbiddenClaims,
      briefMode: addForm.briefMode,
      mandatoryShots: addForm.mandatoryShots || undefined,
      rightsGuardrails: addForm.rightsGuardrails || undefined,
      cta: addForm.cta,
      format: addForm.format,
      briefUrl: addForm.briefUrl,
      week: placed ? addForm.week : null,
      row: placed ? (addForm.row as ContentRowKey) : null,
      pic: plan.pic || currentUserName,
      createdBy: currentUserName,
    });
    setSlots([...slots, created]);
    setAddOpen(false);
    notify(`Đã thêm 1 dòng Brief (${qty} video mục tiêu) · ${addForm.pillar}${placed ? ` vào ${weekShort(addForm.week)} ${addForm.row}` : ' vào kho chưa xếp'}.`, 'success');
  };

  // --- sửa / xóa ---
  const [editing, setEditing] = useState<ContentSlot | null>(null);
  const [editForm, setEditForm] = useState({
    briefCode: '',
    targetQty: 1,
    briefMode: 'DIRECTIVE' as ContentBriefMode,
    pillar: '',
    funnelStage: 'CONSIDERATION' as ContentFunnelStage,
    communicationObjective: '',
    productGroupId: '',
    productId: '',
    sku: '',
    product: '',
    cartUrl: '',
    affiliateUrl: '',
    commissionPct: null as number | null,
    detectKeywords: '',
    angle: '',
    hook: '',
    usp: '',
    forbiddenClaims: '',
    mandatoryShots: '',
    rightsGuardrails: '',
    cta: '',
    format: '',
    briefUrl: '',
    note: '',
  });
  const [deleting, setDeleting] = useState<ContentSlot | null>(null);

  const openEdit = (s: ContentSlot) => {
    const matched = findCatalogProduct(catalog, s.productId || s.sku || s.product, s.productGroupId);
    const effMode = resolveBriefMode(s);
    setEditing(s);
    setEditForm({
      briefCode: s.briefCode || '',
      targetQty: slotTargetQty(s),
      briefMode: effMode,
      pillar: s.pillar,
      funnelStage: s.funnelStage || inferSlotFunnelStage(s.row, s.pillar),
      communicationObjective: s.communicationObjective || '',
      productGroupId: s.productGroupId || matched?.group.id || '',
      productId: s.productId || matched?.product.id || '',
      sku: s.sku || matched?.product.sku || '',
      product: s.product,
      cartUrl: s.cartUrl || '',
      affiliateUrl: s.affiliateUrl || '',
      commissionPct: typeof s.commissionPct === 'number' ? s.commissionPct : null,
      detectKeywords: s.detectKeywords || '',
      angle: s.angle,
      hook: s.hook || '',
      usp: s.usp || '',
      forbiddenClaims: s.forbiddenClaims || '',
      mandatoryShots: s.mandatoryShots || (effMode === 'VETTING_GUARDRAILS' ? DEFAULT_KL67_MANDATORY_SHOTS : ''),
      rightsGuardrails: s.rightsGuardrails || (effMode === 'VETTING_GUARDRAILS' ? DEFAULT_KL67_RIGHTS_GUARDRAILS : ''),
      cta: s.cta || '',
      format: s.format || BRIEF_FORMAT_OPTIONS[0],
      briefUrl: s.briefUrl || '',
      note: s.note || '',
    });
  };
  const saveEdit = () => {
    if (!editing) return;
    const isVetting = editForm.briefMode === 'VETTING_GUARDRAILS';
    const ready = isVetting
      ? Boolean(editForm.product.trim() && (editForm.usp.trim() || editForm.forbiddenClaims.trim() || editForm.mandatoryShots.trim()))
      : Boolean(editForm.product.trim() && (editForm.angle.trim() || editForm.hook.trim() || editForm.usp.trim()));
    setSlots(
      slots.map(s =>
        s.id === editing.id
          ? {
              ...s,
              briefCode: editForm.briefCode.trim() || s.briefCode,
              targetQty: Math.max(1, Math.min(500, Math.floor(editForm.targetQty) || 1)),
              briefMode: editForm.briefMode,
              pillar: editForm.pillar,
              funnelStage: editForm.funnelStage,
              communicationObjective: editForm.communicationObjective.trim() || undefined,
              productGroupId: editForm.productGroupId || undefined,
              productId: editForm.productId || undefined,
              sku: editForm.sku.trim() || undefined,
              product: editForm.product.trim(),
              cartUrl: editForm.cartUrl.trim() || undefined,
              affiliateUrl: editForm.affiliateUrl.trim() || undefined,
              commissionPct: typeof editForm.commissionPct === 'number' ? editForm.commissionPct : undefined,
              detectKeywords: editForm.detectKeywords.trim() || undefined,
              angle: editForm.angle.trim(),
              hook: editForm.hook.trim() || undefined,
              usp: editForm.usp.trim() || undefined,
              forbiddenClaims: editForm.forbiddenClaims.trim() || undefined,
              mandatoryShots: editForm.mandatoryShots.trim() || undefined,
              rightsGuardrails: editForm.rightsGuardrails.trim() || undefined,
              cta: editForm.cta.trim() || undefined,
              format: editForm.format.trim() || undefined,
              briefUrl: editForm.briefUrl.trim() || undefined,
              briefStatus: ready ? 'READY' : 'DRAFT',
              note: editForm.note.trim() || undefined,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
    setEditing(null);
  };

  const copyWeekFromPrevious = (wi: number) => {
    if (!req || wi <= 0) return;
    const prev = req.weeks[wi - 1];
    const cur = req.weeks[wi];
    const sources = slots.filter(s => s.week === prev && s.row);
    if (sources.length === 0) {
      notify('Tuần trước chưa có dòng Brief để sao chép.', 'info');
      return;
    }
    const copies = sources.map(s => ({
      ...newSlot({
        targetQty: slotTargetQty(s),
        pillar: s.pillar,
        angle: s.angle,
        product: s.product,
        productGroupId: s.productGroupId,
        productId: s.productId,
        sku: s.sku,
        cartUrl: s.cartUrl,
        affiliateUrl: s.affiliateUrl,
        commissionPct: s.commissionPct,
        detectKeywords: s.detectKeywords,
        hook: s.hook,
        usp: s.usp,
        forbiddenClaims: s.forbiddenClaims,
        cta: s.cta,
        format: s.format,
        briefUrl: s.briefUrl,
        note: s.note,
        week: cur,
        row: s.row,
        pic: s.pic,
        createdBy: currentUserName,
      }),
    }));
    setSlots([...slots, ...copies]);
    notify(`Đã sao chép ${copies.length} dòng Brief từ ${weekShort(prev)} sang ${weekShort(cur)}.`, 'success');
  };

  // --- gán KOC (hỗ trợ 1 Brief - N KOC) ---
  const [matchSlotId, setMatchSlotId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const matchSlot = slots.find(s => s.id === matchSlotId) || null;
  const usedHandles = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      for (const h of slotKocHandles(s)) set.add(h.replace(/^@/, '').toLowerCase());
    }
    return set;
  }, [slots]);

  const assignKoc = (handle: string | null) => {
    if (!matchSlotId) return;
    const clean = handle ? handle.replace(/^@/, '').trim() : '';
    if (!clean) {
      setSlots(slots.map(s => (s.id === matchSlotId ? { ...s, kocHandle: undefined, kocHandles: undefined, updatedAt: new Date().toISOString() } : s)));
      notify('Đã bỏ gán toàn bộ KOC của dòng Brief này.', 'success');
    } else {
      setSlots(slots.map(s => (s.id === matchSlotId ? { ...addKocToSlot(s, clean), updatedAt: new Date().toISOString() } : s)));
      notify(`Đã gán @${clean} vào dòng Brief.`, 'success');
    }
    setMatchSlotId(null);
  };

  const removeAssignedKoc = (slotId: string, handle: string) => {
    const next = slots.map(s => (s.id === slotId ? { ...removeKocFromSlot(s, handle), updatedAt: new Date().toISOString() } : s));
    setSlots(next);
    if (editing && editing.id === slotId) {
      setEditing(next.find(s => s.id === slotId) || null);
    }
    notify(`Đã gỡ @${handle.replace(/^@/, '')} khỏi dòng Brief.`, 'info');
  };

  // --- gửi danh sách KOC dự kiến book cho Brand ---
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ sheetUrl: '', tab: '', dot: 1 });
  const [sheetCfg, setSheetCfg] = useState<{ configured: boolean; serviceAccountEmail: string | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [pulling, setPulling] = useState(false);
  // Lấy content từ plan tháng của Brand: chỉ chạy khi nhân viên bấm nút
  const pullFromBrandPlan = async () => {
    if (!plan) return;
    setPulling(true);
    try {
      const [planRes, catalogRes] = await Promise.all([
        fetch(`/api/brand-plan?planId=${encodeURIComponent(plan.id)}`, { cache: 'no-store' }),
        fetch('/api/master-data', { cache: 'no-store' }),
      ]);
      const planBody = await planRes.json().catch(() => null);
      const catalogBody = await catalogRes.json().catch(() => null);
      const stores = ((catalogBody?.data?.stores as StorePortfolioItem[]) || []).filter(Boolean);
      const slugOf = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const store = stores.find(s => (plan.storeId && s.id === plan.storeId) || (plan.storeName && slugOf(s.storeName || '') === slugOf(plan.storeName)));
      const channel: PlanChannel | null = store ? (store.platform === 'TikTok Shop' ? 'TIKTOK' : store.platform === 'Shopee Mall' ? 'SHOPEE' : null) : detectChannel(plan);
      if (!channel) {
        notify('Chưa xác định gian hàng này bán trên TikTok Shop hay Shopee nên chưa lấy được content từ plan của Brand.', 'warning');
        return;
      }

      const brandPlan = (planBody?.data as BrandPlanData | undefined) || null;
      const hasLegacyRows = Boolean(brandPlan && Array.isArray(brandPlan.rows) && brandPlan.rows.some(r => r.channel === channel));

      // Tìm oneSheetPlanData từ plan gian hàng hoặc từ bộ nhớ Kế hoạch theo Brand
      let resolvedOneSheet: BrandOneSheetPlanData | undefined = plan.oneSheetPlanData;
      let resolvedBrandPlanItem: BrandMonthlyPlanItem | null = null;
      if (!resolvedOneSheet && typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem('b2c_brand_monthly_plans_v1');
          if (raw) {
            const savedBrandPlans = JSON.parse(raw) as BrandMonthlyPlanItem[];
            const parentBrand = (plan.parentBrand || plan.brandName || '').split('_')[0].trim();
            resolvedBrandPlanItem =
              savedBrandPlans.find(
                bp => slugOf(bp.brandName) === slugOf(parentBrand) || slugOf(parentBrand).includes(slugOf(bp.brandName))
              ) || null;
            if (resolvedBrandPlanItem?.oneSheetPlanData) {
              resolvedOneSheet = resolvedBrandPlanItem.oneSheetPlanData;
            }
          }
        } catch {
          /* bỏ qua lỗi đọc localStorage */
        }
      }

      if (!hasLegacyRows) {
        const oneSheet =
          resolvedOneSheet ||
          buildBrandOneSheetPlanData({
            brandName: (plan.parentBrand || plan.brandName || '').split('_')[0].trim(),
            month: plan.month,
            brandPlan: resolvedBrandPlanItem,
            storePlans: plans,
            storePortfolios: stores,
          });
        const { specs, skipped } = slotSpecsFromOneSheetPlan(oneSheet, plan, channel, catalog);
        if (specs.length === 0) {
          notify('Plan tháng của Brand chưa có dòng Chi tiết Content cho sàn này.', 'info');
          return;
        }
        const result = syncSlotsFromBrandPlan(slots, specs, currentUserName);
        setSlots(result.slots);
        const parts = [`thêm ${result.added}`, `cập nhật ${result.updated}`];
        if (result.removed) parts.push(`bỏ ${result.removed} content không còn trong plan`);
        if (result.manualKept) parts.push(`giữ ${result.manualKept} content bạn đã kéo sang chỗ khác`);
        if (result.keptOrphans) parts.push(`${result.keptOrphans} content đã gán KOC nhưng dòng plan không còn`);
        const skip = skipped.live + skipped.noWeek + skipped.noTier;
        if (skip) parts.push(`bỏ qua ${skip}`);
        notify(`Đã lấy từ Kế hoạch theo Brand (Biểu mẫu 01→05): ${parts.join(', ')}.`, result.keptOrphans || skip ? 'warning' : 'success');
        return;
      }

      let groups: { id: string; name: string; usp?: string; forbiddenClaims?: string }[] = [];
      try {
        const gRes = await fetch('/api/product-catalog?brand=' + encodeURIComponent(plan.brandName), { cache: 'no-store' });
        const gBody = await gRes.json().catch(() => null);
        if (gRes.ok) {
          groups = ((gBody?.data?.groups as { id: string; name: string; usp?: string; forbiddenClaims?: string }[]) || []).map(g => ({
            id: g.id,
            name: g.name,
            usp: g.usp,
            forbiddenClaims: g.forbiddenClaims,
          }));
        }
      } catch {
        /* không có danh mục thì ghi sản phẩm theo SKU của dòng plan */
      }
      const { specs, skipped } = slotSpecsFromBrandPlan(brandPlan!.rows, brandPlan!.pillars, channel, groups);
      const result = syncSlotsFromBrandPlan(slots, specs, currentUserName);
      setSlots(result.slots);
      const parts = [`thêm ${result.added}`, `cập nhật ${result.updated}`];
      if (result.removed) parts.push(`bỏ ${result.removed} content không còn trong plan`);
      if (result.manualKept) parts.push(`giữ ${result.manualKept} content bạn đã kéo sang chỗ khác`);
      if (result.keptOrphans) parts.push(`${result.keptOrphans} content đã gán KOC nhưng dòng plan không còn`);
      if (brandPlan!.approval?.status !== 'APPROVED') parts.push('plan của Brand chưa được duyệt');
      const skip = skipped.live + skipped.noWeek + skipped.noTier;
      if (skip) parts.push(`bỏ qua ${skip} (livestream ${skipped.live}, chưa chọn tuần ${skipped.noWeek}, chưa chọn bậc ${skipped.noTier})`);
      notify(`Đã lấy từ plan Brand: ${parts.join(', ')}.`, result.keptOrphans || skip || brandPlan!.approval?.status !== 'APPROVED' ? 'warning' : 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không lấy được plan tháng của Brand.', 'error');
    } finally {
      setPulling(false);
    }
  };
  const bookingRows = useMemo(() => (plan ? buildBookingListRows(plan, slots, kocs) : []), [plan, slots, kocs]);

  const openSend = () => {
    if (!plan) return;
    setSendForm({ sheetUrl: data.sheetUrl || resolveBrandBookingSheetUrl(plan), tab: data.tabName || defaultBookingTabName(plan, 1), dot: 1 });
    setSendOpen(true);
    fetch('/api/booking-list/push-sheet', { cache: 'no-store' })
      .then(r => r.json())
      .then(b => setSheetCfg({ configured: Boolean(b.configured), serviceAccountEmail: b.serviceAccountEmail ?? null }))
      .catch(() => setSheetCfg({ configured: false, serviceAccountEmail: null }));
  };

  const pushToSheet = async () => {
    if (!plan) return;
    setSending(true);
    try {
      const res = await fetch('/api/booking-list/push-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, sheetUrl: sendForm.sheetUrl.trim(), tab: sendForm.tab.trim(), columns: [...BOOKING_LIST_COLUMNS], rows: bookingRows }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        notify(body?.error || `Lỗi ${res.status}`, 'error');
        return;
      }
      update({
        ...data,
        sheetUrl: sendForm.sheetUrl.trim(),
        tabName: sendForm.tab.trim(),
        lastPush: { at: new Date().toISOString(), by: currentUserName, rows: bookingRows.length, added: body.added, url: sendForm.sheetUrl.trim() },
      });
      notify(`Đã gửi ${body.added} KOC mới lên Google Sheet${body.skipped ? `, bỏ qua ${body.skipped} KOC đã có` : ''}. ${body.listed} KOC vào bảng điều phối ở trạng thái Chờ Brand duyệt.`, 'success');
      setSendOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không gửi được lên Google Sheet.', 'error');
    } finally {
      setSending(false);
    }
  };

  const downloadBookingExcel = async () => {
    if (!plan) return;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(sendForm.tab.slice(0, 31) || 'Danh sách KOC');
      ws.addRow([...BOOKING_LIST_COLUMNS]);
      ws.getRow(1).font = { bold: true };
      bookingRows.forEach(r => ws.addRow(r.cells));
      ws.columns.forEach(c => {
        c.width = 18;
      });
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_sach_KOC_${(plan.storeName || plan.brandName).replace(/[^\w.-]+/g, '_')}_${plan.month.replace('/', '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không xuất được file.', 'error');
    }
  };

  const backlog = slots.filter(s => !isPlaced(s)).filter(s => backlogGroup === 'ALL' || pillarGroupOf(s.pillar) === backlogGroup);
  const groupOptions = Array.from(new Set(CONTENT_PILLARS.map(p => p.group)));
  const dragging = dragId ? slots.find(s => s.id === dragId) : undefined;

  const chip = (s: ContentSlot) => {
    const ready = isBriefReady(s);
    const vetting = resolveBriefMode(s) === 'VETTING_GUARDRAILS';
    const code = formatBriefCode(s);
    const qty = slotTargetQty(s);
    const handles = slotKocHandles(s);
    const effStage = s.funnelStage || inferSlotFunnelStage(s.row, s.pillar);
    const stageShort = FUNNEL_STAGE_OPTIONS.find(f => f.value === effStage)?.shortLabel || effStage;
    return (
      <div
        key={s.id}
        draggable
        onDragStart={e => {
          setDragId(s.id);
          e.dataTransfer.setData('text/plain', s.id);
        }}
        onDragEnd={() => setDragId(null)}
        title={CONTENT_PILLARS.find(p => p.name === s.pillar)?.definition}
        className="group cursor-grab rounded border border-line bg-surface px-2 py-1.5 text-2xs hover:border-accent/40 active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-1">
          <button type="button" onClick={() => openEdit(s)} className="truncate font-semibold text-ink hover:text-accent">
            {code} · {qty} video
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <span className="rounded bg-sunken px-1 py-0.5 text-3xs font-medium text-ink-2">
              {stageShort}
            </span>
            {vetting && (
              <span className="rounded bg-accent-soft px-1 py-0.5 text-3xs font-semibold text-accent">
                Khung duyệt
              </span>
            )}
            <span className={`text-3xs ${ready ? 'text-positive font-medium' : 'text-ink-3'}`}>
              {vetting ? (ready ? 'Đủ tham số' : 'Thiếu tham số') : ready ? 'Brief đủ' : 'Nháp'}
            </span>
            {s.row !== 'SELF' && (
              <button
                type="button"
                title="Gán KOC cho dòng Brief này"
                onClick={e => {
                  e.stopPropagation();
                  setMatchSlotId(s.id);
                }}
                className="rounded p-0.5 text-ink-3 hover:bg-accent-soft hover:text-accent"
              >
                <UserPlus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <button type="button" onClick={() => openEdit(s)} className="mt-0.5 block w-full text-left">
          <div className="truncate font-medium text-ink">{vetting ? `Kiểm duyệt KOL · ${s.pillar}` : s.pillar}</div>
          <div className="truncate text-ink-3">{s.product || s.angle || 'Chưa ghi sản phẩm'}</div>
          {vetting ? (
            (s.mandatoryShots || s.usp) && (
              <div className="truncate text-ink-3">Tham số: {s.mandatoryShots || s.usp}</div>
            )
          ) : (
            s.angle && s.product && <div className="truncate text-ink-3">{s.angle}</div>
          )}
          {handles.length > 0 && (
            <div className="mt-0.5 truncate font-medium text-accent">
              {handles.map(h => `@${h.replace(/^@/, '')}`).join(', ')} ({handles.length}/{qty})
            </div>
          )}
          {handles.length === 0 && s.rejectedKoc && <div className="mt-0.5 truncate text-critical">Brand từ chối @{s.rejectedKoc.handle}</div>}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Thanh bộ lọc & Thao tác trên đầu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold text-ink-3">Kỳ</span>
            <Select
              value={activeMonth}
              onChange={e => {
                setMonth(e.target.value);
                setSelectedId(null);
              }}
              className="w-[120px]"
            >
              {months.length === 0 && <option value="">Chưa có kỳ</option>}
              {months.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold text-ink-3">Gian hàng</span>
            <Select
              value={activePlanId || ''}
              onChange={e => {
                setSelectedId(e.target.value);
              }}
              className="min-w-[260px] max-w-[400px]"
            >
              {visiblePlans.length === 0 && <option value="">Không có kế hoạch trong kỳ</option>}
              {visiblePlans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.storeName || p.title} ({p.pic || 'Chưa giao'} · {PLAN_STATUS_LABEL[p.status || 'DRAFT'] || p.status})
                </option>
              ))}
            </Select>
          </div>

          {plan && (
            <div className="hidden xl:flex items-center gap-2 border-l border-line pl-3 text-xs text-ink-3">
              <span>PIC: <strong className="text-ink">{plan.pic || 'Chưa giao'}</strong></span>
              <span>· Trạng thái: <strong className="text-ink">{PLAN_STATUS_LABEL[plan.status || 'DRAFT'] || plan.status}</strong></span>
              {saveLabel[status] && (
                <span className="font-medium text-accent">· {saveLabel[status]}</span>
              )}
            </div>
          )}
        </div>

        {plan && req && diag && (
          <div className="flex flex-wrap items-center gap-2">
            {req.hasData && diag.placedVideos < diag.totalRequired && (
              <Button size="sm" variant="secondary" onClick={handleGenerateAllPlanBriefs}>
                Khởi tạo dòng Brief theo khung tuần × bậc
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={pullFromBrandPlan} disabled={pulling}>
              {pulling ? 'Đang lấy…' : 'Lấy từ plan Brand'}
            </Button>
            {activeBrandProfile && (
              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                onClick={() => setStandardBriefOpen(true)}
              >
                Brief chuẩn 5 phần
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={Send} onClick={openSend} disabled={bookingRows.length === 0}>
              Gửi Brand
            </Button>
            {status === 'error' && (
              <Button size="sm" variant="secondary" onClick={saveNow}>
                Lưu lại
              </Button>
            )}
            <Button size="sm" variant="primary" icon={Plus} onClick={() => openAdd()}>
              Thêm dòng Brief
            </Button>
          </div>
        )}
      </div>

      {plansState === 'loading' && (
        <div className="rounded-lg border border-line bg-surface p-12 text-center text-xs text-ink-3">
          Đang tải dữ liệu kế hoạch…
        </div>
      )}

      {plansState === 'ready' && visiblePlans.length === 0 && (
        <div className="rounded-lg border border-dashed border-line p-12 text-center text-xs text-ink-3">
          Chưa có kế hoạch nào trong kỳ {activeMonth}.
        </div>
      )}

      {plan && req && diag && (
        <section className="space-y-4">

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: 'Số dòng Brief / Góc nội dung', value: `${fmt(diag.totalSlots)} dòng Brief` },
                { label: 'Tổng SL Video theo Brief / Plan', value: `${fmt(diag.totalBriefVideos)} / ${fmt(diag.totalRequired)} video` },
                { label: 'Dòng Brief đã đủ nội dung', value: `${fmt(diag.readyBriefs)} / ${fmt(diag.totalSlots)} dòng` },
                { label: 'SL Video đã xếp vào tuần', value: `${fmt(diag.placedVideos)} / ${fmt(diag.totalRequired)} video` },
                { label: 'Nhóm pillar nhiều nhất', value: diag.byPillarGroup[0] ? `${diag.byPillarGroup[0].group} (${Math.round(diag.byPillarGroup[0].share * 100)}%)` : '—' },
              ].map(c => (
                <div key={c.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="text-2xs text-ink-3">{c.label}</div>
                  <div className="truncate text-sm font-semibold tabular-nums text-ink">{c.value}</div>
                </div>
              ))}
            </div>

            {!req.hasData ? (
              <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-ink-3">
                Kế hoạch này chưa có số theo tuần trong bảng phân rã. Chuyên viên cần nhập tab Phân rã tuần trước khi xếp dòng Brief vào tuần.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full min-w-[900px] border-collapse text-xs">
                  <thead className="text-ink-3">
                    <tr className="border-b border-line">
                      <th className="sticky left-0 z-10 min-w-[120px] bg-surface px-3 py-2 text-left font-medium text-ink">Bậc</th>
                      {req.weeks.map((w, wi) => (
                        <th key={w} className="min-w-[150px] border-l border-line px-2 py-2 text-left font-medium text-ink">
                          <div className="flex items-center justify-between gap-1">
                            <span>{w}</span>
                            {wi > 0 && (
                              <button type="button" title="Sao chép các dòng Brief từ tuần trước" onClick={() => copyWeekFromPrevious(wi)} className="rounded p-1 text-ink-3 hover:bg-accent-soft hover:text-accent">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="min-w-[80px] border-l border-line px-2 py-2 text-right font-medium text-ink">Tổng Video</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsShown.map(row => {
                      const rowNeed = req.weeks.reduce((s, w) => s + (req.grid[w]?.[row.key] || 0), 0);
                      const rowHave = slots
                        .filter(s => s.row === row.key && isPlaced(s))
                        .reduce((sum, s) => sum + slotTargetQty(s), 0);
                      return (
                        <tr key={row.key} className="border-t border-line align-top">
                          <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-ink">{row.label}</td>
                          {req.weeks.map(w => {
                            const need = req.grid[w]?.[row.key] || 0;
                            const cell = slots.filter(s => s.week === w && s.row === row.key);
                            const cellVideos = cell.reduce((sum, s) => sum + slotTargetQty(s), 0);
                            const tone = cellVideos === need ? 'text-positive' : cellVideos > need ? 'text-critical' : 'text-warning';
                            const canDrop = Boolean(dragging);
                            return (
                              <td
                                key={w}
                                onDragOver={e => {
                                  if (canDrop) e.preventDefault();
                                }}
                                onDrop={e => {
                                  e.preventDefault();
                                  const id = dragId || e.dataTransfer.getData('text/plain');
                                  setDragId(null);
                                  if (id) placeSlot(id, w, row.key);
                                }}
                                className={`border-l border-line p-1.5 ${canDrop ? 'bg-accent-soft/40' : ''}`}
                              >
                                <div className="mb-1 flex items-center justify-between">
                                  <span className={`text-2xs font-medium tabular-nums ${need === 0 && cellVideos === 0 ? 'text-ink-3' : tone}`}>
                                    {cellVideos}/{need} video
                                  </span>
                                  <button type="button" title="Thêm dòng Brief vào ô này" onClick={() => openAdd(w, row.key)} className="rounded p-0.5 text-ink-3 hover:bg-accent-soft hover:text-accent">
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="min-h-[28px] space-y-1">{cell.map(chip)}</div>
                              </td>
                            );
                          })}
                          <td className={`border-l border-line px-2 py-2 text-right tabular-nums ${rowHave === rowNeed ? 'text-positive' : rowHave > rowNeed ? 'text-critical' : 'text-warning'}`}>
                            {rowHave}/{rowNeed}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div
                onDragOver={e => {
                  if (dragging && isPlaced(dragging)) e.preventDefault();
                }}
                onDrop={e => {
                  e.preventDefault();
                  const id = dragId || e.dataTransfer.getData('text/plain');
                  setDragId(null);
                  if (id) unplaceSlot(id);
                }}
                className="rounded-lg border border-line bg-surface p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink">Kho dòng Brief chưa xếp tuần ({diag.unplaced})</span>
                  <Select value={backlogGroup} onChange={e => setBacklogGroup(e.target.value)} className="max-w-[180px]">
                    <option value="ALL">Mọi nhóm pillar</option>
                    {groupOptions.map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {backlog.map(chip)}
                  {backlog.length === 0 && <div className="col-span-full px-2 py-6 text-center text-xs text-ink-3">Không có dòng Brief chưa xếp. Kéo từ bảng về đây để bỏ xếp tuần.</div>}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink">Tỷ trọng nhóm Pillar & Kiểm tra ({diag.issues.length})</span>
                  <span className="text-2xs text-ink-3 tabular-nums">{diag.byPillarGroup.length} nhóm</span>
                </div>
                <div className="space-y-1.5">
                  {diag.byPillarGroup.length === 0 && <div className="text-xs text-ink-3">Chưa có dòng Brief nào.</div>}
                  {diag.byPillarGroup.map(g => (
                    <div key={g.group} className="flex items-center gap-2 text-xs">
                      <span className="w-40 shrink-0 truncate text-ink-2">{g.group}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-sunken">
                        <div className="h-full bg-accent" style={{ width: `${Math.round(g.share * 100)}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-right tabular-nums text-ink-3">{g.count} video · {Math.round(g.share * 100)}%</span>
                    </div>
                  ))}
                </div>

                {diag.byProduct.length > 0 && (
                  <div className="space-y-1.5 border-t border-line pt-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ink">Phân bổ theo Sản phẩm đẩy & Hạn mức mẫu</span>
                      <span className="text-2xs text-ink-3 tabular-nums">{diag.byProduct.length} SKU</span>
                    </div>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                      {diag.byProduct.map(p => {
                        const share = diag.totalBriefVideos > 0 ? Math.min(100, Math.round((p.plannedVideos / diag.totalBriefVideos) * 100)) : 0;
                        const isOut = p.status === 'OUT_OF_STOCK' || p.status === 'STOPPED';
                        const overSample = p.sampleQuota !== null && p.focVideos > p.sampleQuota;
                        return (
                          <div key={p.key} className="rounded border border-line bg-canvas/60 px-2.5 py-1.5 text-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-3xs font-semibold text-accent">
                                  {p.role}
                                </span>
                                <span className="truncate font-medium text-ink" title={p.productName}>
                                  {p.productName}
                                </span>
                                {isOut && (
                                  <span className="shrink-0 rounded bg-critical/10 px-1.5 py-0.5 text-3xs font-semibold text-critical">
                                    Hết hàng
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 tabular-nums font-medium text-ink">
                                {p.plannedVideos} video · {p.assignedKocs} KOC
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded bg-sunken">
                                <div className={`h-full ${isOut || overSample ? 'bg-critical' : 'bg-accent'}`} style={{ width: `${share}%` }} />
                              </div>
                              <span className={`shrink-0 tabular-nums ${overSample ? 'font-semibold text-critical' : 'text-ink-3'}`}>
                                {p.sampleQuota !== null ? `FOC: ${p.focVideos}/${p.sampleQuota} mẫu` : `FOC: ${p.focVideos}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {diag.issues.length > 0 && (
                  <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-line pt-2 text-xs">
                    {diag.issues.slice(0, 12).map((i, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Status tone={i.severity === 'warning' ? 'warning' : 'neutral'}>{i.severity === 'warning' ? 'Cần xem' : 'Thiếu'}</Status>
                        <span className="text-ink-2">{i.message}</span>
                      </li>
                    ))}
                    {diag.issues.length > 12 && <li className="text-ink-3">và {diag.issues.length - 12} mục khác</li>}
                  </ul>
                )}
              </div>
            </div>
        </section>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Thêm dòng Định hướng / Brief Content"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={confirmAdd}>
              {`Lưu dòng Brief (${Math.max(1, Math.min(500, Math.floor(addForm.qty) || 1))} video)`}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Content pillar">
            <Select
              value={addForm.pillar}
              onChange={e =>
                setAddForm({
                  ...addForm,
                  pillar: e.target.value,
                  funnelStage: inferSlotFunnelStage(addForm.row || undefined, e.target.value),
                })
              }
            >
              {CONTENT_PILLARS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Giai đoạn Phễu truyền thông">
            <Select
              value={addForm.funnelStage}
              onChange={e => setAddForm({ ...addForm, funnelStage: e.target.value as ContentFunnelStage })}
            >
              {FUNNEL_STAGE_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Số lượng video mục tiêu của dòng Brief">
            <Input inputMode="numeric" value={String(addForm.qty)} onChange={e => setAddForm({ ...addForm, qty: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
          </Field>
          {catalog.groups.length > 0 && (
            <>
              <Field label="Nhóm sản phẩm đẩy (Tầng 1)">
                <Select
                  value={addForm.productGroupId}
                  onChange={e => {
                    const nextGroupId = e.target.value;
                    if (!nextGroupId) {
                      setAddForm({ ...addForm, productGroupId: '', productId: '' });
                      return;
                    }
                    const sel = buildCatalogSelectionPatch(nextGroupId);
                    setAddForm({
                      ...addForm,
                      ...sel,
                      cta: addForm.cta || (sel.cartUrl ? 'Nhấn vào giỏ hàng góc trái mua chính hãng' : ''),
                    });
                  }}
                >
                  <option value="">— Chọn nhóm sản phẩm —</option>
                  {catalog.groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.products.length} SKU)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sản phẩm / SKU / Combo cụ thể (Tầng 2)">
                <Select
                  value={addForm.productId}
                  onChange={e => {
                    const nextProdId = e.target.value;
                    if (!nextProdId) {
                      setAddForm({ ...addForm, productId: '' });
                      return;
                    }
                    const sel = buildCatalogSelectionPatch(addForm.productGroupId, nextProdId);
                    setAddForm({
                      ...addForm,
                      ...sel,
                      cta: addForm.cta || (sel.cartUrl ? 'Nhấn vào giỏ hàng góc trái mua chính hãng' : ''),
                    });
                  }}
                >
                  <option value="">— Chọn SKU đơn hoặc Combo —</option>
                  {(addForm.productGroupId
                    ? (catalog.groups.find(g => g.id === addForm.productGroupId)?.products || []).map(product => ({
                        group: catalog.groups.find(g => g.id === addForm.productGroupId)!,
                        product,
                      }))
                    : listAllCatalogProducts(catalog)
                  ).map(({ group, product }) => {
                    const roleTag = product.productType === 'HARD_BUNDLE' || product.productType === 'ROUTINE_COMBO' ? '[COMBO]' : `[${product.role || 'HERO'}]`;
                    const stockTag = product.status === 'OUT_OF_STOCK' ? ' · HẾT HÀNG' : '';
                    return (
                      <option key={product.id} value={product.id}>
                        {roleTag} {product.name} {product.sku ? `(${product.sku})` : ''} — {group.name}{stockTag}
                      </option>
                    );
                  })}
                </Select>
              </Field>
            </>
          )}
          <Field label="Tên sản phẩm hiển thị trên Brief">
            <Input value={addForm.product} onChange={e => setAddForm({ ...addForm, product: e.target.value })} />
          </Field>
          <Field label="Định dạng quay">
            <Select value={addForm.format} onChange={e => setAddForm({ ...addForm, format: e.target.value })}>
              {BRIEF_FORMAT_OPTIONS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Link giỏ hàng gắn video (${targetPlatformLabel})`}>
            <Input value={addForm.cartUrl} placeholder="https://..." onChange={e => setAddForm({ ...addForm, cartUrl: e.target.value })} />
          </Field>
          <Field label="Link Commission / Affiliate">
            <Input value={addForm.affiliateUrl} placeholder="https://affiliate..." onChange={e => setAddForm({ ...addForm, affiliateUrl: e.target.value })} />
          </Field>
          <Field label="% Hoa hồng Affiliate áp dụng">
            <Input
              inputMode="decimal"
              value={addForm.commissionPct !== null ? String(addForm.commissionPct) : ''}
              placeholder="VD: 12"
              onChange={e => {
                const v = parseFloat(e.target.value.replace(',', '.'));
                setAddForm({ ...addForm, commissionPct: Number.isFinite(v) ? v : null });
              }}
            />
          </Field>
          <Field label="Chế độ làm việc với KOC (Theo phân khúc KL)" className="col-span-2">
            <Select
              value={addForm.briefMode}
              onChange={e => {
                const nextMode = e.target.value as ContentBriefMode;
                setAddForm({
                  ...addForm,
                  briefMode: nextMode,
                  mandatoryShots:
                    nextMode === 'VETTING_GUARDRAILS' && !addForm.mandatoryShots
                      ? DEFAULT_KL67_MANDATORY_SHOTS
                      : addForm.mandatoryShots,
                  rightsGuardrails:
                    nextMode === 'VETTING_GUARDRAILS' && !addForm.rightsGuardrails
                      ? DEFAULT_KL67_RIGHTS_GUARDRAILS
                      : addForm.rightsGuardrails,
                });
              }}
            >
              <option value="DIRECTIVE">Định hướng kịch bản chi tiết (Áp dụng: FOC, Self, KL1–KL5)</option>
              <option value="VETTING_GUARDRAILS">Chỉ giao Tham số kiểm duyệt &amp; Ranh giới Brand (Áp dụng: KL6–KL7, KOL tự lên kịch bản)</option>
            </Select>
          </Field>
          {addForm.briefMode === 'VETTING_GUARDRAILS' ? (
            <div className="col-span-2 space-y-3 rounded-lg border border-accent/40 bg-accent-soft/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent">
                  Bộ tham số kiểm duyệt KOL (KL6 / KL7 — Không áp đặt Angle/Hook mẫu)
                </span>
                <span className="rounded bg-surface px-2 py-0.5 text-2xs font-medium text-ink-2 border border-line">
                  KOL tự đề xuất kịch bản theo chất kênh
                </span>
              </div>
              <Field label="1. Thông điệp cốt lõi tối thiểu phải nhắc (Key USP)">
                <Textarea rows={2} value={addForm.usp} onChange={e => setAddForm({ ...addForm, usp: e.target.value })} />
              </Field>
              <Field label="2. Từ cấm & Ranh giới thương hiệu bắt buộc tránh (Do & Don't)">
                <Textarea rows={2} value={addForm.forbiddenClaims} onChange={e => setAddForm({ ...addForm, forbiddenClaims: e.target.value })} />
              </Field>
              <Field label="3. Yêu cầu khung hình & Hiện diện sản phẩm bắt buộc">
                <Textarea rows={2} value={addForm.mandatoryShots} onChange={e => setAddForm({ ...addForm, mandatoryShots: e.target.value })} />
              </Field>
              <Field label="4. Điều khoản bản quyền, Mã Spark Ads & Độc quyền đi kèm">
                <Input value={addForm.rightsGuardrails} onChange={e => setAddForm({ ...addForm, rightsGuardrails: e.target.value })} />
              </Field>
              <Field label="Gợi ý chủ đề / Bối cảnh tham khảo (Không bắt buộc)">
                <Input value={addForm.angle} placeholder="Để trống nếu KOL tự đề xuất hoàn toàn" onChange={e => setAddForm({ ...addForm, angle: e.target.value })} />
              </Field>
            </div>
          ) : (
            <>
              <Field label="Chọn nhanh từ Kho Góc nội dung chuẩn của SKU (Hồ sơ thương hiệu)" className="col-span-2">
                <Select
                  value=""
                  onChange={e => {
                    const found = brandSavedAngles.find(a => a.id === e.target.value);
                    if (!found) return;
                    setAddForm(prev => ({
                      ...prev,
                      angle: found.name,
                      hook: found.hookIdea || prev.hook,
                      usp: prev.usp || found.solutionApproach || '',
                      cta: prev.cta || found.callToAction || '',
                    }));
                  }}
                >
                  <option value="">— Chọn mẫu góc nội dung từ Hồ sơ thương hiệu —</option>
                  {brandSavedAngles.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.pillarName}] {a.name} — {a.productName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Góc nội dung (Angle)" className="col-span-2">
                <Input value={addForm.angle} onChange={e => setAddForm({ ...addForm, angle: e.target.value })} />
              </Field>
              <Field label="Câu mở đầu 3 giây đầu (Hook 3s)" className="col-span-2">
                <Input value={addForm.hook} onChange={e => setAddForm({ ...addForm, hook: e.target.value })} />
              </Field>
              <Field label="Thông điệp USP sản phẩm bắt buộc" className="col-span-2">
                <Input value={addForm.usp} onChange={e => setAddForm({ ...addForm, usp: e.target.value })} />
              </Field>
              <Field label="Claim cấm / Từ khóa cấm (Do & Don't)" className="col-span-2">
                <Input value={addForm.forbiddenClaims} onChange={e => setAddForm({ ...addForm, forbiddenClaims: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Xếp vào tuần">
            <Select value={addForm.week} onChange={e => setAddForm({ ...addForm, week: e.target.value })}>
              <option value="">Để trong kho, xếp sau</option>
              {(req?.weeks || []).map(w => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bậc">
            <Select
              value={addForm.row}
              disabled={!addForm.week}
              onChange={e => {
                const nextRow = e.target.value as ContentRowKey;
                const isVetting = isVettingGuardrailRow(nextRow);
                setAddForm({
                  ...addForm,
                  row: nextRow,
                  briefMode: isVetting ? 'VETTING_GUARDRAILS' : 'DIRECTIVE',
                  mandatoryShots: isVetting ? addForm.mandatoryShots || DEFAULT_KL67_MANDATORY_SHOTS : addForm.mandatoryShots,
                  rightsGuardrails: isVetting ? addForm.rightsGuardrails || DEFAULT_KL67_RIGHTS_GUARDRAILS : addForm.rightsGuardrails,
                });
              }}
            >
              <option value="">Chọn bậc</option>
              {CONTENT_ROWS.map(r => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Dòng Brief ${formatBriefCode(editing)} (${slotTargetQty(editing)} video) · ${editing.pillar}` : 'Dòng Brief Content'}
        size="lg"
        footer={
          <>
            {editing && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleting(editing)}>
                Xóa
              </Button>
            )}
            {editing && editing.row !== 'SELF' && (
              <Button
                variant="secondary"
                icon={UserPlus}
                onClick={() => {
                  setMatchSlotId(editing.id);
                  setEditing(null);
                }}
              >
                {slotKocHandles(editing).length > 0 ? `+ Thêm KOC (${slotKocHandles(editing).length}/${slotTargetQty(editing)})` : 'Gán KOC'}
              </Button>
            )}
            {editing && isPlaced(editing) && (
              <Button
                variant="secondary"
                onClick={() => {
                  unplaceSlot(editing.id);
                  setEditing(null);
                }}
              >
                Bỏ xếp
              </Button>
            )}
            <Button variant="primary" onClick={saveEdit}>
              Lưu dòng Brief
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {editing && slotKocHandles(editing).length > 0 && (
            <div className="col-span-2 rounded-md border border-line bg-sunken px-3 py-2">
              <div className="mb-1 text-2xs font-medium text-ink-2">
                KOC đã gán vào dòng Brief này ({slotKocHandles(editing).length}/{slotTargetQty(editing)} video):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slotKocHandles(editing).map(h => (
                  <span key={h} className="inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-xs font-medium text-accent border border-line">
                    @{h.replace(/^@/, '')}
                    <button
                      type="button"
                      onClick={() => removeAssignedKoc(editing.id, h)}
                      className="ml-0.5 text-ink-3 hover:text-critical"
                      title="Gỡ KOC này khỏi Brief"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <Field label="Mã dòng Brief">
            <Input value={editForm.briefCode} onChange={e => setEditForm({ ...editForm, briefCode: e.target.value })} />
          </Field>
          <Field label="Số lượng video mục tiêu của dòng Brief">
            <Input
              inputMode="numeric"
              value={String(editForm.targetQty)}
              onChange={e => setEditForm({ ...editForm, targetQty: parseInt(e.target.value.replace(/\D/g, ''), 10) || 1 })}
            />
          </Field>
          {catalog.groups.length > 0 && (
            <>
              <Field label="Nhóm sản phẩm đẩy (Tầng 1)">
                <Select
                  value={editForm.productGroupId}
                  onChange={e => {
                    const nextGroupId = e.target.value;
                    if (!nextGroupId) {
                      setEditForm({ ...editForm, productGroupId: '', productId: '' });
                      return;
                    }
                    const sel = buildCatalogSelectionPatch(nextGroupId);
                    setEditForm({
                      ...editForm,
                      ...sel,
                      cta: editForm.cta || (sel.cartUrl ? 'Nhấn vào giỏ hàng góc trái mua chính hãng' : ''),
                    });
                  }}
                >
                  <option value="">— Chọn nhóm sản phẩm —</option>
                  {catalog.groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.products.length} SKU)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sản phẩm / SKU / Combo cụ thể (Tầng 2)">
                <Select
                  value={editForm.productId}
                  onChange={e => {
                    const nextProdId = e.target.value;
                    if (!nextProdId) {
                      setEditForm({ ...editForm, productId: '' });
                      return;
                    }
                    const sel = buildCatalogSelectionPatch(editForm.productGroupId, nextProdId);
                    setEditForm({
                      ...editForm,
                      ...sel,
                      cta: editForm.cta || (sel.cartUrl ? 'Nhấn vào giỏ hàng góc trái mua chính hãng' : ''),
                    });
                  }}
                >
                  <option value="">— Chọn SKU đơn hoặc Combo —</option>
                  {(editForm.productGroupId
                    ? (catalog.groups.find(g => g.id === editForm.productGroupId)?.products || []).map(product => ({
                        group: catalog.groups.find(g => g.id === editForm.productGroupId)!,
                        product,
                      }))
                    : listAllCatalogProducts(catalog)
                  ).map(({ group, product }) => {
                    const roleTag = product.productType === 'HARD_BUNDLE' || product.productType === 'ROUTINE_COMBO' ? '[COMBO]' : `[${product.role || 'HERO'}]`;
                    const stockTag = product.status === 'OUT_OF_STOCK' ? ' · HẾT HÀNG' : '';
                    return (
                      <option key={product.id} value={product.id}>
                        {roleTag} {product.name} {product.sku ? `(${product.sku})` : ''} — {group.name}{stockTag}
                      </option>
                    );
                  })}
                </Select>
              </Field>
            </>
          )}
          <Field label="Content pillar">
            <Select value={editForm.pillar} onChange={e => setEditForm({ ...editForm, pillar: e.target.value })}>
              {CONTENT_PILLARS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Giai đoạn Phễu truyền thông">
            <Select
              value={editForm.funnelStage}
              onChange={e => setEditForm({ ...editForm, funnelStage: e.target.value as ContentFunnelStage })}
            >
              {FUNNEL_STAGE_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mục tiêu dịch chuyển nhận thức (Communication Objective)" className="col-span-2">
            <Input
              value={editForm.communicationObjective}
              placeholder="VD: Chuyển từ nghi ngờ chất sản phẩm sang tin tưởng kiểm nghiệm da liễu..."
              onChange={e => setEditForm({ ...editForm, communicationObjective: e.target.value })}
            />
          </Field>
          <Field label="Tên sản phẩm hiển thị trên Brief">
            <Input value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} />
          </Field>
          <Field label={`Link giỏ hàng gắn video (${targetPlatformLabel})`}>
            <Input value={editForm.cartUrl} placeholder="https://..." onChange={e => setEditForm({ ...editForm, cartUrl: e.target.value })} />
          </Field>
          <Field label="Link Commission / Affiliate">
            <Input value={editForm.affiliateUrl} placeholder="https://affiliate..." onChange={e => setEditForm({ ...editForm, affiliateUrl: e.target.value })} />
          </Field>
          <Field label="% Hoa hồng Affiliate áp dụng">
            <Input
              inputMode="decimal"
              value={editForm.commissionPct !== null ? String(editForm.commissionPct) : ''}
              placeholder="VD: 12"
              onChange={e => {
                const v = parseFloat(e.target.value.replace(',', '.'));
                setEditForm({ ...editForm, commissionPct: Number.isFinite(v) ? v : null });
              }}
            />
          </Field>
          <Field label="Định dạng quay">
            <Select value={editForm.format} onChange={e => setEditForm({ ...editForm, format: e.target.value })}>
              {BRIEF_FORMAT_OPTIONS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Từ khóa nhận diện tự động khi nghiệm thu">
            <Input value={editForm.detectKeywords} placeholder="Tên SKU, tên gọi tắt..." onChange={e => setEditForm({ ...editForm, detectKeywords: e.target.value })} />
          </Field>
          <Field label="Chế độ làm việc với KOC (Theo phân khúc KL)" className="col-span-2">
            <Select
              value={editForm.briefMode}
              onChange={e => {
                const nextMode = e.target.value as ContentBriefMode;
                setEditForm({
                  ...editForm,
                  briefMode: nextMode,
                  mandatoryShots:
                    nextMode === 'VETTING_GUARDRAILS' && !editForm.mandatoryShots
                      ? DEFAULT_KL67_MANDATORY_SHOTS
                      : editForm.mandatoryShots,
                  rightsGuardrails:
                    nextMode === 'VETTING_GUARDRAILS' && !editForm.rightsGuardrails
                      ? DEFAULT_KL67_RIGHTS_GUARDRAILS
                      : editForm.rightsGuardrails,
                });
              }}
            >
              <option value="DIRECTIVE">Định hướng kịch bản chi tiết (Áp dụng: FOC, Self, KL1–KL5)</option>
              <option value="VETTING_GUARDRAILS">Chỉ giao Tham số kiểm duyệt &amp; Ranh giới Brand (Áp dụng: KL6–KL7, KOL tự lên kịch bản)</option>
            </Select>
          </Field>
          {editForm.briefMode === 'VETTING_GUARDRAILS' ? (
            <div className="col-span-2 space-y-3 rounded-lg border border-accent/40 bg-accent-soft/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent">
                  Bộ tham số kiểm duyệt KOL (KL6 / KL7 — Không áp đặt Angle/Hook mẫu)
                </span>
                <span className="rounded bg-surface px-2 py-0.5 text-2xs font-medium text-ink-2 border border-line">
                  KOL tự đề xuất kịch bản theo chất kênh
                </span>
              </div>
              <Field label="1. Thông điệp cốt lõi tối thiểu phải nhắc (Key USP)">
                <Textarea rows={2} value={editForm.usp} onChange={e => setEditForm({ ...editForm, usp: e.target.value })} />
              </Field>
              <Field label="2. Từ cấm & Ranh giới thương hiệu bắt buộc tránh (Do & Don't)">
                <Textarea rows={2} value={editForm.forbiddenClaims} onChange={e => setEditForm({ ...editForm, forbiddenClaims: e.target.value })} />
              </Field>
              <Field label="3. Yêu cầu khung hình & Hiện diện sản phẩm bắt buộc">
                <Textarea rows={2} value={editForm.mandatoryShots} onChange={e => setEditForm({ ...editForm, mandatoryShots: e.target.value })} />
              </Field>
              <Field label="4. Điều khoản bản quyền, Mã Spark Ads & Độc quyền đi kèm">
                <Input value={editForm.rightsGuardrails} onChange={e => setEditForm({ ...editForm, rightsGuardrails: e.target.value })} />
              </Field>
              <Field label="Gợi ý chủ đề / Bối cảnh tham khảo (Không bắt buộc)">
                <Input value={editForm.angle} placeholder="Để trống nếu KOL tự đề xuất hoàn toàn" onChange={e => setEditForm({ ...editForm, angle: e.target.value })} />
              </Field>
            </div>
          ) : (
            <>
              <Field label="Chọn nhanh từ Kho Góc nội dung chuẩn của SKU (Hồ sơ thương hiệu)" className="col-span-2">
                <Select
                  value=""
                  onChange={e => {
                    const found = brandSavedAngles.find(a => a.id === e.target.value);
                    if (!found) return;
                    setEditForm(prev => ({
                      ...prev,
                      angle: found.name,
                      hook: found.hookIdea || prev.hook,
                      usp: prev.usp || found.solutionApproach || '',
                      cta: prev.cta || found.callToAction || '',
                    }));
                  }}
                >
                  <option value="">— Chọn mẫu góc nội dung từ Hồ sơ thương hiệu —</option>
                  {brandSavedAngles.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.pillarName}] {a.name} — {a.productName}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="col-span-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">Góc nội dung (Angle)</span>
                  <button
                    type="button"
                    onClick={() => setCopilotOpen(true)}
                    className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                  >
                    <Lightbulb className="h-3 w-3" />
                    Gợi ý góc quay & Hook 3s
                  </button>
                </div>
                <Input value={editForm.angle} onChange={e => setEditForm({ ...editForm, angle: e.target.value })} />
              </div>
              <Field label="Câu mở đầu 3 giây đầu (Hook 3s)" className="col-span-2">
                <Input value={editForm.hook} onChange={e => setEditForm({ ...editForm, hook: e.target.value })} />
              </Field>
              <Field label="Thông điệp USP sản phẩm bắt buộc" className="col-span-2">
                <Textarea rows={2} value={editForm.usp} onChange={e => setEditForm({ ...editForm, usp: e.target.value })} />
              </Field>
              <Field label="Claim cấm / Từ khóa cấm (Do & Don't)" className="col-span-2">
                <Textarea rows={2} value={editForm.forbiddenClaims} onChange={e => setEditForm({ ...editForm, forbiddenClaims: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Lời kêu gọi hành động (CTA)">
            <Input value={editForm.cta} onChange={e => setEditForm({ ...editForm, cta: e.target.value })} />
          </Field>
          <Field label="Link file Brief mẫu">
            <Input value={editForm.briefUrl} placeholder="https://" onChange={e => setEditForm({ ...editForm, briefUrl: e.target.value })} />
          </Field>
          <Field label="Ghi chú hướng dẫn quay" className="col-span-2">
            <Textarea rows={2} value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ContentCopilotModal
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        brandName={plan?.brandName}
        productName={editForm.product}
        initialPillar={editForm.pillar}
        initialScript={editForm.note}
        onApplyAngle={data => {
          setEditForm(prev => ({
            ...prev,
            angle: data.angleName,
            hook: data.hook || prev.hook,
            usp: data.usp || prev.usp,
            cta: data.cta || prev.cta,
            note: (prev.note ? prev.note + '\n\n' : '') + `[Tình huống]: ${data.painPoint}`,
          }));
          notify(`Đã áp dụng góc tiếp cận vào Brief: ${data.angleName}`, 'success');
        }}
        onNotify={onNotify}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa Brief Content"
        message={deleting ? `Xóa Brief "${formatBriefCode(deleting)} · ${deleting.pillar}" khỏi kế hoạch?` : ''}
        confirmLabel="Xóa"
        tone="danger"
        onConfirm={() => {
          if (deleting) setSlots(slots.filter(s => s.id !== deleting.id));
          setDeleting(null);
          setEditing(null);
        }}
        onCancel={() => setDeleting(null)}
      />

      <CreatorMatchModal
        open={Boolean(matchSlot)}
        onClose={() => setMatchSlotId(null)}
        slot={matchSlot}
        plan={plan}
        kocs={kocs}
        deals={deals}
        usedHandles={usedHandles}
        onAssign={assignKoc}
        onNotify={onNotify}
      />

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Gửi danh sách KOC cho Brand"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Đóng
            </Button>
            <Button variant="secondary" icon={Download} onClick={() => void downloadBookingExcel()}>
              Tải Excel
            </Button>
            <Button variant="primary" icon={Send} disabled={sending || !sheetCfg?.configured || !sendForm.sheetUrl.trim() || !sendForm.tab.trim()} onClick={() => void pushToSheet()}>
              {sending ? 'Đang gửi…' : 'Gửi lên Google Sheet'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
            {bookingRows.length} KOC đã gán trong kế hoạch này.
            {data.lastPush ? ` Lần gửi gần nhất: ${new Date(data.lastPush.at).toLocaleString('vi-VN')} bởi ${data.lastPush.by}, thêm ${data.lastPush.added} KOC.` : ''}
          </div>
          {sheetCfg && !sheetCfg.configured && (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              Chưa cấu hình tài khoản dịch vụ Google nên chưa gửi thẳng được. Bạn tải Excel và dán vào Google Sheet, hoặc nhờ quản trị khai báo GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.
            </div>
          )}
          {sheetCfg?.configured && <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">Sheet của Brand cần chia sẻ quyền chỉnh sửa cho {sheetCfg.serviceAccountEmail}.</div>}
          <Field label="Link Google Sheet của Brand">
            <Input value={sendForm.sheetUrl} onChange={e => setSendForm({ ...sendForm, sheetUrl: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đợt">
              <Select
                value={String(sendForm.dot)}
                onChange={e => {
                  const dot = parseInt(e.target.value, 10) || 1;
                  setSendForm({ ...sendForm, dot, tab: plan ? defaultBookingTabName(plan, dot) : sendForm.tab });
                }}
              >
                <option value="1">Đợt 1</option>
                <option value="2">Đợt 2</option>
                <option value="3">Đợt 3</option>
              </Select>
            </Field>
            <Field label="Tên tab">
              <Input value={sendForm.tab} onChange={e => setSendForm({ ...sendForm, tab: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      {activeBrandProfile && (
        <StandardBriefPreviewModal
          open={standardBriefOpen}
          onClose={() => setStandardBriefOpen(false)}
          profile={activeBrandProfile}
          slots={slots}
          cycleMonth={plan?.month || activeMonth}
          storeName={plan?.storeName || plan?.title}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
