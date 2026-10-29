import { resolveStoreBookingLeader } from '../larkPaymentRequestEngine';
import { isPlanManagedByUser, isStaffGlobalAdminOrManager } from '../rbacScope';
import { brandKey } from '../brands/types';
import { actionAllowed } from './accessPolicy';
import { readMasterCatalog } from './masterCatalogStore';
// Chỉ dùng phía server (API routes) — không import từ component giao diện.
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import type {
  InputPlanBreakdownState,
  PlanDiscussionMessage,
  PlanDiscussionRole,
  PlanVersionSnapshot,
  StorePortfolioItem,
  UserProfile
} from '../types';
import { FULL_BRAND_PLAN_ACCESS, type BrandPlanAccess, type BrandPlanSection } from '../brandPlanAccess';
import {
  canEditPlanContent,
  canSubmitPlanForApproval,
  isBookingExecutor,
  planPositionsOf,
  storeLeader,
  storeMainBooking,
  storePositionsOf,
  type StorePosition,
} from '../storePositions';
import { isPersonInField } from '../staffIdentity';
import type { BrandDetail } from '../types';
import { INITIAL_MONTHLY_PLANS } from '../monthlyPlanData';
import { REAL_MONTHLY_PLANS_OCT_2026 } from '../realLarkPlans202610';
import { REAL_MONTHLY_PLANS_NOV_2026 } from '../realLarkPlans202611';
import { checkBreakdownForSubmit } from '../planBreakdownRules';
import type { PlanChatMessage, UserMessageType } from '../planChat';
import { notifyPlanMessages } from './planRealtime';

/** Kế hoạch trả về cho giao diện kèm số revision để chống ghi đè. */
export interface StoredMonthlyPlan {
  plan: InputPlanBreakdownState;
  revision: number;
}

export class PlanStoreError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'LOCKED' | 'EXISTS' | 'INVALID',
    message: string,
    public readonly current?: StoredMonthlyPlan
  ) {
    super(message);
  }
}

// Các trường số liệu bị khóa khi phiên bản đã chốt (không được sửa đè v1.0, v1.1...)
const LOCKED_FIELDS = [
  'items',
  'totalTargetBudget',
  'totalTargetContents',
  'targetGmv',
  'budgetAdsTotal',
  'budgetAffiliate',
  'budgetSelfChannel',
  'targetAffiliateContents',
  'targetSelfChannelContents'
] as const satisfies ReadonlyArray<keyof InputPlanBreakdownState>;

// Các trường thông tin gốc & chỉ tiêu cấp gian hàng chỉ do Quản lý hoặc Booking chính (hoặc Dự phòng đang hiệu lực) cập nhật;
// nhân sự Booking cùng làm (BOOKING_CO) / Self-channel chỉ cập nhật phần phân rã thực thi (items, staffWeeklySlices, discussions).
const PLAN_HEADER_TARGET_FIELDS = [
  'title',
  'brandName',
  'storeId',
  'storeName',
  'month',
  'primaryPic',
  'pic',
  'bookingLeader',
  'totalTargetBudget',
  'targetGmv',
  'budgetAdsTotal',
  'budgetAffiliate',
  'budgetSelfChannel',
] as const satisfies ReadonlyArray<keyof InputPlanBreakdownState>;

const PROTECTED_STATUSES = ['PRE_APPROVED', 'LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'LOCKED', 'IN_EXECUTION', 'COMPLETED', 'REVISION_REQUESTED'];
const FINAL_APPROVED_STATUSES = ['APPROVED', 'LOCKED', 'IN_EXECUTION'];

/** Giám đốc duyệt chính thức: máy chủ tự khóa phiên bản, không phụ thuộc giao diện gửi kèm cờ khóa. */
function withApprovalLock(plan: InputPlanBreakdownState, fromStatus: string, toStatus: string): InputPlanBreakdownState {
  return FINAL_APPROVED_STATUSES.includes(toStatus) && !FINAL_APPROVED_STATUSES.includes(fromStatus) ? { ...plan, isVersionLocked: true } : plan;
}

/**
 * Đổi trạng thái được bảo vệ / khóa / phiên bản thì cần quyền duyệt.
 * Ngoại lệ: Leader sơ duyệt, và nhóm Booking gửi lại kế hoạch bị trả về (quyền gửi đã kiểm bằng canSubmitPlanForApproval).
 */
function needsApproveAccess(plan: InputPlanBreakdownState, stored: InputPlanBreakdownState, fromStatus: string, toStatus: string, isLeaderStep: boolean): boolean {
  const lockOrVersionChanged =
    Boolean(plan.isVersionLocked) !== Boolean(stored.isVersionLocked) || (plan.currentVersionCode || 'v1.0') !== (stored.currentVersionCode || 'v1.0');
  const protectedStatusChanged = plan.status !== stored.status && (PROTECTED_STATUSES.includes(plan.status || '') || PROTECTED_STATUSES.includes(stored.status || ''));
  const resubmitting = fromStatus === 'REVISION_REQUESTED' && ['PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(toStatus);
  if (lockOrVersionChanged) return !isLeaderStep;
  return protectedStatusChanged && !isLeaderStep && !resubmitting;
}

const planInclude = {
  versionSnapshots: { orderBy: { lockedAt: 'asc' } },
  discussions: { orderBy: { postedAt: 'desc' } }
} satisfies Prisma.MonthlyPlanInclude;

type PlanRow = Prisma.MonthlyPlanGetPayload<{ include: typeof planInclude }>;

const PLANS_CACHE_TTL_MS = 25_000;
let cachedPlansState: {
  expiresAt: number;
  list: StoredMonthlyPlan[];
  byId: Map<string, StoredMonthlyPlan>;
} | null = null;
let inflightPlansLoad: Promise<StoredMonthlyPlan[]> | null = null;
let hasVerifiedRealLarkPlans = false;

interface MemoryPlanEntry {
  plan: InputPlanBreakdownState;
  revision: number;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
const memoryPlansById = new Map<string, MemoryPlanEntry>();
const memoryMessagesByPlanId = new Map<string, Array<{ clientId: string; data: PlanChatMessage; postedAt: Date; createdAt: Date }>>();
let memoryPlansSeeded = false;

function isPostgresMonthlyPlanEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

function toMemoryStored(entry: MemoryPlanEntry): StoredMonthlyPlan {
  const base = entry.plan;
  const resolvedLeader = resolveStoreBookingLeader(base.storeName || base.brandName, base.bookingLeader);
  return {
    revision: entry.revision,
    plan: {
      ...base,
      hasBookingLeader: Boolean(resolvedLeader),
      bookingLeader: resolvedLeader,
      status: (base.status || 'DRAFT') as InputPlanBreakdownState['status'],
      currentVersionCode: base.currentVersionCode || 'v1.0',
      isVersionLocked: Boolean(base.isVersionLocked),
      createdAt: base.createdAt || entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      versionSnapshots: base.versionSnapshots || [],
      discussions: base.discussions || [],
    },
  };
}

function ensureMemoryPlansSeeded() {
  if (memoryPlansSeeded) return;
  memoryPlansSeeded = true;
  const now = new Date();
  for (const plan of [...INITIAL_MONTHLY_PLANS, ...REAL_MONTHLY_PLANS_OCT_2026, ...REAL_MONTHLY_PLANS_NOV_2026]) {
    if (!plan?.id || memoryPlansById.has(plan.id)) continue;
    memoryPlansById.set(plan.id, {
      plan: structuredClone(plan),
      revision: 1,
      updatedBy: 'System Seed',
      createdAt: plan.createdAt ? new Date(plan.createdAt) : now,
      updatedAt: plan.updatedAt ? new Date(plan.updatedAt) : now,
    });
  }
}

export function invalidateMonthlyPlansCache() {
  cachedPlansState = null;
}

function upsertCachedPlan(stored: StoredMonthlyPlan) {
  if (!cachedPlansState) return;
  cachedPlansState.byId.set(stored.plan.id, stored);
  const idx = cachedPlansState.list.findIndex(item => item.plan.id === stored.plan.id);
  if (idx >= 0) {
    cachedPlansState.list[idx] = stored;
  } else {
    cachedPlansState.list = [stored, ...cachedPlansState.list];
  }
  cachedPlansState.expiresAt = Date.now() + PLANS_CACHE_TTL_MS;
}

function toStored(row: PlanRow): StoredMonthlyPlan {
  const base = row.data as unknown as InputPlanBreakdownState;
  const resolvedLeader = resolveStoreBookingLeader(base.storeName || base.brandName, base.bookingLeader);
  return {
    revision: row.revision,
    plan: {
      ...base,
      id: row.id,
      hasBookingLeader: Boolean(resolvedLeader),
      bookingLeader: resolvedLeader,
      status: row.status as InputPlanBreakdownState['status'],
      currentVersionCode: row.currentVersionCode,
      isVersionLocked: row.isVersionLocked,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      versionSnapshots: row.versionSnapshots.map(s => s.data as unknown as PlanVersionSnapshot),
      discussions: row.discussions.map(d => d.data as unknown as PlanDiscussionMessage)
    }
  };
}

/** Tách phần dữ liệu làm việc (cột data) khỏi phần chỉ-thêm-mới (snapshot, trao đổi). */
function splitPlan(plan: InputPlanBreakdownState) {
  const { versionSnapshots = [], discussions = [], ...rest } = plan;
  return { working: rest, versionSnapshots, discussions };
}

function indexedColumns(plan: InputPlanBreakdownState) {
  return {
    title: plan.title || 'Kế hoạch chưa đặt tên',
    brandName: plan.brandName || '',
    storeId: plan.storeId ?? null,
    month: plan.month || '',
    week: plan.week ?? null,
    pic: plan.pic ?? null,
    bookingLeader: plan.bookingLeader ?? null,
    status: plan.status || 'DRAFT',
    currentVersionCode: plan.currentVersionCode || 'v1.0',
    isVersionLocked: Boolean(plan.isVersionLocked),
    totalTargetBudget: new Prisma.Decimal(plan.totalTargetBudget || 0),
    budgetAdsTotal: new Prisma.Decimal(plan.budgetAdsTotal || 0),
    targetGmv: new Prisma.Decimal(plan.targetGmv || 0),
    totalTargetContents: Math.round(plan.totalTargetContents || 0)
  };
}

function snapshotRows(planId: string, snapshots: PlanVersionSnapshot[]) {
  return snapshots
    .filter(s => s && s.id)
    .map(s => ({
      planId,
      clientId: s.id,
      versionCode: s.versionCode || 'v1.0',
      versionName: s.versionName || s.versionCode || 'Phiên bản chốt',
      createdBy: s.createdBy || 'Không rõ',
      creatorRole: s.creatorRole || 'SYSTEM',
      changeReason: s.changeReason ?? null,
      totalTargetBudget: new Prisma.Decimal(s.totalTargetBudget || 0),
      budgetAdsTotal: new Prisma.Decimal(s.budgetAdsTotal || 0),
      targetGmv: new Prisma.Decimal(s.targetGmv || 0),
      data: s as unknown as Prisma.InputJsonValue,
      lockedAt: s.createdAt ? new Date(s.createdAt) : new Date()
    }));
}

function discussionRows(planId: string, messages: PlanDiscussionMessage[]) {
  return messages
    .filter(m => m && m.id)
    .map(m => ({
      planId,
      clientId: m.id,
      authorName: m.authorName || 'Không rõ',
      authorRole: m.authorRole || 'SYSTEM',
      authorTitle: m.authorTitle ?? null,
      type: m.type || 'COMMENT',
      content: m.content || '',
      data: m as unknown as Prisma.InputJsonValue,
      postedAt: m.timestamp ? new Date(m.timestamp) : new Date()
    }));
}

// So sánh không phụ thuộc thứ tự key (Postgres jsonb tự sắp xếp lại key khi lưu)
function stableStringify(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function sameValue(a: unknown, b: unknown) {
  return stableStringify(a) === stableStringify(b);
}

type CatalogView = { stores: StorePortfolioItem[]; brands: { name: string }[] };

export function planStoreOf(plan: InputPlanBreakdownState, catalog: CatalogView): StorePortfolioItem | undefined {
  return catalog.stores.find(s => (plan.storeId && s.id === plan.storeId) || (plan.storeName && s.storeName === plan.storeName));
}

export function planBrandOf(plan: InputPlanBreakdownState, catalog: CatalogView, store?: StorePortfolioItem): BrandDetail | undefined {
  const name = store?.brandName || plan.brandName || plan.parentBrand || '';
  return name ? (catalog.brands.find(b => brandKey(b.name) === brandKey(name)) as BrandDetail | undefined) : undefined;
}

/** Vị trí của người dùng trên gian của kế hoạch (hợp nhất Dữ liệu gốc Gian hàng + Phân công trên Kế hoạch tháng 4.1 & 4.1.1). */
export function planPositionsWithCatalog(plan: InputPlanBreakdownState, actor: UserProfile, catalog: CatalogView): Set<StorePosition> {
  const store = planStoreOf(plan, catalog);
  const brand = planBrandOf(plan, catalog, store);
  return planPositionsOf(actor, plan, store, brand);
}

/** Xem kế hoạch: trong phạm vi cũ (PIC gian / nhãn / người tham gia tháng) hoặc đang giữ một vị trí trên gian, kể cả vị trí cấp nhãn. */
export function canReadPlanWithCatalog(plan: InputPlanBreakdownState, actor: UserProfile, catalog: CatalogView): boolean {
  return isPlanManagedByUser(plan, actor, catalog.stores) || planPositionsWithCatalog(plan, actor, catalog).size > 0;
}

/**
 * Quyền với kế hoạch tháng:
 * - Xem: phạm vi gian / nhãn hoặc giữ vị trí trên gian.
 * - Sửa nội dung: Nhân sự thực thi trên gian (Booking chính, Booking phụ / FOC, Dự phòng đang hiệu lực, Self-channel), Leader (khi sơ duyệt) hoặc Giám đốc / Admin.
 */
function checkPlanAccessWithCatalog(
  plan: InputPlanBreakdownState,
  actor: UserProfile,
  action: 'read' | 'write' | 'approve',
  catalog: CatalogView,
  allowed: boolean
) {
  if (!allowed || !canReadPlanWithCatalog(plan, actor, catalog)) {
    throw new PlanStoreError('FORBIDDEN', 'Không có quyền với kế hoạch này.');
  }
  if (action === 'read' || isStaffGlobalAdminOrManager(actor)) return;
  const positions = planPositionsWithCatalog(plan, actor, catalog);
  if (!canEditPlanContent(positions, false) && !positions.has('LEADER')) {
    throw new PlanStoreError('FORBIDDEN', 'Chỉ nhân sự phụ trách gian hàng (Booking chính, Booking phụ, Dự phòng, Self-channel) hoặc Leader khi sơ duyệt được sửa kế hoạch.');
  }
}

async function getStoredPlanByIdFast(id: string): Promise<StoredMonthlyPlan | null> {
  if (!isPostgresMonthlyPlanEnabled()) {
    ensureMemoryPlansSeeded();
    const mem = memoryPlansById.get(id);
    return mem ? toMemoryStored(mem) : null;
  }
  if (cachedPlansState && Date.now() < cachedPlansState.expiresAt) {
    const cached = cachedPlansState.byId.get(id);
    if (cached) return cached;
  }
  const row = await prisma.monthlyPlan.findUnique({ where: { id }, include: planInclude });
  if (!row || row.deletedAt) return null;
  return toStored(row);
}

export async function assertPlanAccess(plan: InputPlanBreakdownState, actor: UserProfile, action: 'read' | 'write' | 'approve' = 'read') {
  const [{ data }, allowed] = await Promise.all([
    readMasterCatalog(),
    actionAllowed(actor, 'plan_target_month', action),
  ]);
  checkPlanAccessWithCatalog(plan, actor, action, data, allowed);
}
export async function assertPlanIdAccess(id: string, actor: UserProfile, action: 'read' | 'write' = 'read') {
  const stored = await getStoredPlanByIdFast(id);
  if (!stored) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
  await assertPlanAccess(stored.plan, actor, action);
  return stored.plan;
}

/**
 * Quyền thao tác Google Sheet Listing theo khóa gửi lên:
 * - Mã kế hoạch tháng: quyền sửa kế hoạch, trả về kế hoạch.
 * - Khóa Sheet nhân sự "YYYY/MM__Tên gian hoặc nhãn": Booking / Leader của gian (hoặc gian thuộc nhãn đó), Giám đốc / Admin; trả về null.
 */
export async function assertListingSheetAccess(key: string, actor: UserProfile): Promise<InputPlanBreakdownState | null> {
  const staffSheet = key.match(/^\d{4}\/\d{2}__(.+)$/);
  if (!staffSheet) return assertPlanIdAccess(key, actor, 'write');
  await assertStoreBookingAccess(staffSheet[1], actor);
  return null;
}

/** Booking / Leader của gian (theo mã gian, tên gian, hoặc gian thuộc nhãn trùng tên), Giám đốc / Admin. */
export async function assertStoreBookingAccess(storeIdOrName: string, actor: UserProfile): Promise<void> {
  if (isStaffGlobalAdminOrManager(actor)) return;
  const { data: catalog } = await readMasterCatalog();
  const name = storeIdOrName.trim().toLowerCase();
  const stores = catalog.stores.filter(
    s => normKey(s.id) === name || normKey(s.storeName) === name || brandKey(s.brandName || '') === brandKey(name)
  );
  const allowed = stores.some(store => {
    const brand = catalog.brands.find(b => brandKey(b.name) === brandKey(store.brandName || '')) as BrandDetail | undefined;
    const positions = storePositionsOf(actor, store, brand);
    return isBookingExecutor(positions) || positions.has('LEADER');
  });
  if (!allowed) throw new PlanStoreError('FORBIDDEN', 'Chỉ nhân sự Booking hoặc Leader của gian được thao tác Sheet của gian này.');
}

/** Bối cảnh quyền trên một kế hoạch: vị trí của người dùng trên gian, nhãn, Account PIC. Dùng cho các bảng làm việc theo người sở hữu. */
export interface PlanContext {
  plan: InputPlanBreakdownState;
  store?: StorePortfolioItem;
  brand?: BrandDetail;
  positions: Set<StorePosition>;
  global: boolean;
  isAccountPic: boolean;
}

export async function resolvePlanContext(id: string, actor: UserProfile): Promise<PlanContext> {
  const [stored, { data: catalog }, allowed] = await Promise.all([
    getStoredPlanByIdFast(id),
    readMasterCatalog(),
    actionAllowed(actor, 'plan_target_month', 'read'),
  ]);
  if (!stored) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
  // Pháp chế / Kế toán duyệt hợp đồng, tài chính, thanh toán trên bảng Deal của mọi gian (không xem nội dung kế hoạch tháng)
  const backoffice = actor.role === 'LEGAL' || actor.role === 'FINANCE' || Boolean(actor.permissions?.includes('canApprovePayment'));
  if (!backoffice) checkPlanAccessWithCatalog(stored.plan, actor, 'read', catalog, allowed);
  const store = planStoreOf(stored.plan, catalog);
  return {
    plan: stored.plan,
    store,
    brand: planBrandOf(stored.plan, catalog, store),
    positions: planPositionsWithCatalog(stored.plan, actor, catalog),
    global: isStaffGlobalAdminOrManager(actor),
    isAccountPic: Boolean(store && isPersonInField(actor, store.accountOwnerName, store.staffCodes)),
  };
}

/** Xem Listing / Deal / ngân sách booking: PIC Kênh tự sở hữu (không kiêm Booking) không xem. */
export function assertCanViewBooking(ctx: PlanContext) {
  const onlySelfChannel = ctx.positions.size > 0 && [...ctx.positions].every(p => p === 'SELF_CHANNEL');
  if (!ctx.global && onlySelfChannel) {
    throw new PlanStoreError('FORBIDDEN', 'PIC Kênh tự sở hữu không xem Listing / Deal của gian (trừ khi kiêm Booking).');
  }
}
/**
 * Quyền với Plan tháng của Brand của một kế hoạch: PIC gian / quản lý sửa cả plan;
 * người chỉ giữ vị trí Plan / Strategy hoặc Key Visual / SIS của gian sửa đúng phần đó; còn lại chỉ xem nếu có quyền xem.
 */
function brandPlanAccessSync(
  plan: InputPlanBreakdownState,
  actor: UserProfile,
  catalog: { stores: StorePortfolioItem[]; brands: { name: string }[] },
  canWrite: boolean,
  canRead: boolean
): BrandPlanAccess {
  try {
    checkPlanAccessWithCatalog(plan, actor, 'write', catalog, canWrite);
    return FULL_BRAND_PLAN_ACCESS;
  } catch (err) {
    if (!(err instanceof PlanStoreError) || err.code !== 'FORBIDDEN') throw err;
  }
  const positions = planPositionsWithCatalog(plan, actor, catalog);
  const sections: BrandPlanSection[] = [];
  if (positions.has('PLAN_STRATEGY')) sections.push('STRATEGY');
  if (positions.has('KEY_VISUAL')) sections.push('KEY_VISUAL');
  if (sections.length > 0) return { full: false, sections };
  checkPlanAccessWithCatalog(plan, actor, 'read', catalog, canRead);
  return { full: false, sections: [] };
}

export async function resolveBrandPlanAccess(id: string, actor: UserProfile): Promise<{ plan: InputPlanBreakdownState; access: BrandPlanAccess }> {
  const [stored, { data }, canWrite, canRead] = await Promise.all([
    getStoredPlanByIdFast(id),
    readMasterCatalog(),
    actionAllowed(actor, 'plan_target_month', 'write'),
    actionAllowed(actor, 'plan_target_month', 'read'),
  ]);
  if (!stored) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
  return { plan: stored.plan, access: brandPlanAccessSync(stored.plan, actor, data, canWrite, canRead) };
}

/** Mã mọi kế hoạch (cho việc đồng bộ của hệ thống, không lọc theo người dùng). */
export async function allPlanIdsForSync(): Promise<string[]> {
  return (await loadAllStoredPlans()).map(r => r.plan.id);
}

const normKey = (v?: string) => (v || '').trim().toLowerCase();

/** Cùng gian, cùng tháng: so mã gian; khi mã khác nhau (bản Larkbase có thể mang mã gian tự sinh) thì so tên gian. */
function isSameStoreMonth(a: InputPlanBreakdownState, b: InputPlanBreakdownState): boolean {
  if (!a.month || a.month !== b.month) return false;
  if (a.storeId && b.storeId && normKey(a.storeId) === normKey(b.storeId)) return true;
  return Boolean(normKey(a.storeName)) && normKey(a.storeName) === normKey(b.storeName);
}

/**
 * Mỗi gian chỉ có một kế hoạch mỗi tháng. Chọn kế hoạch đang dùng (chưa lưu trữ) của cùng gian, cùng tháng:
 * ưu tiên bản đã gắn đúng bản ghi Larkbase, rồi bản cùng mã, rồi bản tạo sớm nhất.
 */
function pickPlanForStoreMonth(plans: InputPlanBreakdownState[], plan: InputPlanBreakdownState): InputPlanBreakdownState | null {
  const candidates = plans.filter(p => String(p.status) !== 'ARCHIVED' && isSameStoreMonth(p, plan));
  if (candidates.length === 0) return null;
  return (
    candidates.find(p => plan.larkRecordId && p.larkRecordId === plan.larkRecordId) ||
    candidates.find(p => p.id === plan.id) ||
    [...candidates].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0]
  );
}

/**
 * Mọi kế hoạch cùng nhãn, cùng tháng (không lọc theo quyền xem). Chỉ dùng cho kiểm tra phía máy chủ
 * như cảnh báo trùng KOC giữa các gian; không trả nguyên kế hoạch ra trình duyệt.
 */
export async function listPlansOfBrandMonth(brandName: string, month: string): Promise<InputPlanBreakdownState[]> {
  return (await loadAllStoredPlans())
    .map(r => r.plan)
    .filter(p => p.month === month && String(p.status) !== 'ARCHIVED' && brandKey(p.brandName || '') === brandKey(brandName));
}

/**
 * Mọi kế hoạch của một tháng (không lọc theo quyền xem). Chỉ dùng phía máy chủ cho quyết toán CTV xuyên gian
 * (Partnership / Kế toán); không trả nguyên kế hoạch ra trình duyệt.
 */
export async function listPlansOfMonth(month: string): Promise<InputPlanBreakdownState[]> {
  return (await loadAllStoredPlans()).map(r => r.plan).filter(p => p.month === month && String(p.status) !== 'ARCHIVED');
}

export async function findPlanForStoreMonth(plan: InputPlanBreakdownState): Promise<InputPlanBreakdownState | null> {
  return pickPlanForStoreMonth((await loadAllStoredPlans()).map(r => r.plan), plan);
}

async function loadAllStoredPlans(actorForSeed?: UserProfile): Promise<StoredMonthlyPlan[]> {
  if (!isPostgresMonthlyPlanEnabled()) {
    ensureMemoryPlansSeeded();
    const list = Array.from(memoryPlansById.values())
      .sort((a, b) => (b.plan.month || '').localeCompare(a.plan.month || '') || b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(toMemoryStored);
    cachedPlansState = {
      expiresAt: Date.now() + PLANS_CACHE_TTL_MS,
      list,
      byId: new Map(list.map(item => [item.plan.id, item])),
    };
    return list;
  }
  if (cachedPlansState && Date.now() < cachedPlansState.expiresAt) {
    return cachedPlansState.list;
  }
  if (inflightPlansLoad) {
    return inflightPlansLoad;
  }
  inflightPlansLoad = (async () => {
    let rows = await prisma.monthlyPlan.findMany({
      where: { deletedAt: null },
      include: planInclude,
      orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }]
    });
    if (rows.length === 0 && actorForSeed?.role === 'ADMIN') {
      const totalCount = await prisma.monthlyPlan.count();
      if (totalCount === 0) {
        await seedInitialPlans(actorForSeed);
        rows = await prisma.monthlyPlan.findMany({
          where: { deletedAt: null },
          include: planInclude,
          orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }]
        });
      }
      hasVerifiedRealLarkPlans = true;
    } else if (!hasVerifiedRealLarkPlans) {
      hasVerifiedRealLarkPlans = true;
      const existingById = new Map(rows.map(r => [r.id, r]));
      const rowPlans = rows.map(r => toStored(r).plan);
      // Gian đã có kế hoạch trong tháng (thường là bản nháp lập trong app): ghi bản Lark vào đúng kế hoạch đó, không tạo bản thứ hai
      const allRealPlans = [...REAL_MONTHLY_PLANS_OCT_2026, ...REAL_MONTHLY_PLANS_NOV_2026].map(p => {
        if (existingById.has(p.id)) return p;
        const same = pickPlanForStoreMonth(rowPlans, p);
        return same ? { ...p, id: same.id } : p;
      });
      const staleOrMissingRealPlans = allRealPlans.filter(p => {
        const existing = existingById.get(p.id);
        if (!existing) return true;
        const dbData = existing.data as unknown as InputPlanBreakdownState | null;
        return Boolean(p.larkSyncedAt && dbData?.larkSyncedAt !== p.larkSyncedAt);
      });
      if (staleOrMissingRealPlans.length > 0) {
        await syncRealLarkPlans(staleOrMissingRealPlans);
        rows = await prisma.monthlyPlan.findMany({
          where: { deletedAt: null },
          include: planInclude,
          orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }]
        });
      }
    }
    const list = rows.map(toStored);
    const byId = new Map(list.map(item => [item.plan.id, item]));
    cachedPlansState = {
      expiresAt: Date.now() + PLANS_CACHE_TTL_MS,
      list,
      byId
    };
    return list;
  })().finally(() => {
    inflightPlansLoad = null;
  });
  return inflightPlansLoad;
}

/** Kế hoạch mở được ở màn Plan tháng của Brand: kế hoạch trong phạm vi + kế hoạch của gian mình giữ vị trí Plan / Strategy, Key Visual / SIS. */
export async function listBrandPlanPlans(actor: UserProfile): Promise<{ plan: InputPlanBreakdownState; access: BrandPlanAccess }[]> {
  const [storedList, { data }, canWrite, canRead] = await Promise.all([
    loadAllStoredPlans(actor),
    readMasterCatalog(),
    actionAllowed(actor, 'plan_target_month', 'write'),
    actionAllowed(actor, 'plan_target_month', 'read'),
  ]);
  const out: { plan: InputPlanBreakdownState; access: BrandPlanAccess }[] = [];
  for (const { plan } of storedList) {
    try {
      out.push({ plan, access: brandPlanAccessSync(plan, actor, data, canWrite, canRead) });
    } catch (err) {
      if (!(err instanceof PlanStoreError) || err.code !== 'FORBIDDEN') throw err;
    }
  }
  return out;
}

/** Lấy danh sách kế hoạch. Lần đầu khi bảng trống sẽ nạp bộ kế hoạch mẫu ban đầu. */
export async function listMonthlyPlans(actor: UserProfile): Promise<StoredMonthlyPlan[]> {
  const [storedList, { data }, allowed] = await Promise.all([
    loadAllStoredPlans(actor),
    readMasterCatalog(),
    actionAllowed(actor, 'plan_target_month', 'read')
  ]);
  if (!allowed) throw new PlanStoreError('FORBIDDEN', 'Không có quyền xem kế hoạch.');
  return storedList.filter(row => canReadPlanWithCatalog(row.plan, actor, data));
}

async function syncRealLarkPlans(plansToSync = [...REAL_MONTHLY_PLANS_OCT_2026, ...REAL_MONTHLY_PLANS_NOV_2026]) {
  try {
    const CHUNK_SIZE = 15;
    for (let i = 0; i < plansToSync.length; i += CHUNK_SIZE) {
      const chunk = plansToSync.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(plan => {
          const { working } = splitPlan(plan);
          return prisma.monthlyPlan.upsert({
            where: { id: plan.id },
            create: {
              id: plan.id,
              ...indexedColumns(plan),
              sourceSystem: 'LARKBASE',
              larkRecordId: plan.larkRecordId ?? null,
              larkAppToken: plan.larkAppToken ?? 'W6vRbbuOVar3qtsV18dlan1xgXb',
              larkTableId: plan.larkTableId ?? 'tblvgyOkneDKOVsB',
              larkSyncedAt: new Date(),
              data: working as unknown as Prisma.InputJsonValue,
              createdBy: 'Lark Base Sync',
              updatedBy: 'Lark Base Sync'
            },
            update: {
              ...indexedColumns(plan),
              sourceSystem: 'LARKBASE',
              larkRecordId: plan.larkRecordId ?? null,
              larkAppToken: plan.larkAppToken ?? 'W6vRbbuOVar3qtsV18dlan1xgXb',
              larkTableId: plan.larkTableId ?? 'tblvgyOkneDKOVsB',
              larkSyncedAt: new Date(),
              data: working as unknown as Prisma.InputJsonValue,
              updatedBy: 'Lark Base Sync'
            }
          });
        })
      );
    }
  } catch {
    // Bỏ qua nếu có xung đột đồng thời
  }
}

async function seedInitialPlans(actor: UserProfile) {
  for (const plan of INITIAL_MONTHLY_PLANS) {
    try {
      await createMonthlyPlan(plan, actor, { seeding: true });
    } catch (err) {
      // Bỏ qua nếu đã có người khác nạp cùng lúc
      if (!(err instanceof PlanStoreError && err.code === 'EXISTS')) throw err;
    }
  }
}

export async function createMonthlyPlan(
  plan: InputPlanBreakdownState,
  actor: UserProfile,
  opts: { seeding?: boolean } = {}
): Promise<StoredMonthlyPlan> {
  if (!plan?.id) throw new PlanStoreError('INVALID', 'Thiếu mã kế hoạch.');
  // Khi nạp dữ liệu mẫu, danh sách kế hoạch đang được tải nên không tra lại (tránh tự chờ chính mình)
  if (!opts.seeding) {
    const same = await findPlanForStoreMonth(plan);
    if (same && same.id !== plan.id) {
      throw new PlanStoreError('EXISTS', `Gian ${plan.storeName || plan.storeId || ''} đã có kế hoạch tháng ${plan.month} (${same.id}). Mở kế hoạch đó để làm tiếp thay vì tạo mới.`);
    }
  }
  await assertPlanAccess(plan, actor, 'write');
  if (!isStaffGlobalAdminOrManager(actor)) {
    const { data: catalog } = await readMasterCatalog();
    const store = planStoreOf(plan, catalog);
    const brand = planBrandOf(plan, catalog, store);
    const storePos = store ? storePositionsOf(actor, store, brand) : new Set<StorePosition>();
    if (!storePos.has('BOOKING_MAIN') && !storePos.has('BACKUP') && !storePos.has('LEADER')) {
      throw new PlanStoreError('FORBIDDEN', 'Chỉ Quản lý hoặc PIC chính của gian hàng trong Dữ liệu gốc được khởi tạo kế hoạch tháng mới.');
    }
  }
  if (plan.isVersionLocked || (plan.status && !['DRAFT', 'PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(plan.status)) || plan.versionSnapshots?.length) await assertPlanAccess(plan, actor, 'approve');
  const { working, versionSnapshots, discussions } = splitPlan(plan);

  if (!isPostgresMonthlyPlanEnabled()) {
    ensureMemoryPlansSeeded();
    if (memoryPlansById.has(plan.id)) {
      throw new PlanStoreError('EXISTS', `Kế hoạch ${plan.id} đã tồn tại.`);
    }
    const now = new Date();
    const entry: MemoryPlanEntry = {
      plan: {
        ...structuredClone(plan),
        status: plan.status || 'DRAFT',
        currentVersionCode: plan.currentVersionCode || 'v1.0',
        isVersionLocked: Boolean(plan.isVersionLocked),
        versionSnapshots: structuredClone(versionSnapshots),
        discussions: structuredClone(discussions),
      },
      revision: 1,
      updatedBy: actor.name,
      createdAt: now,
      updatedAt: now,
    };
    memoryPlansById.set(plan.id, entry);
    if (discussions.length > 0) {
      const msgs = discussions.filter(m => m && m.id).map(m => ({
        clientId: m.id,
        data: m as unknown as PlanChatMessage,
        postedAt: m.timestamp ? new Date(m.timestamp) : now,
        createdAt: now,
      }));
      memoryMessagesByPlanId.set(plan.id, msgs);
    }
    const stored = toMemoryStored(entry);
    upsertCachedPlan(stored);
    return stored;
  }

  try {
    const row = await prisma.$transaction(async tx => {
      await tx.monthlyPlan.create({
        data: {
          id: plan.id,
          ...indexedColumns(plan),
          data: working as unknown as Prisma.InputJsonValue,
          createdBy: actor.name,
          updatedBy: actor.name
        }
      });
      if (versionSnapshots.length) {
        await tx.monthlyPlanVersionSnapshot.createMany({ data: snapshotRows(plan.id, versionSnapshots), skipDuplicates: true });
      }
      if (discussions.length) {
        await tx.monthlyPlanDiscussion.createMany({ data: discussionRows(plan.id, discussions), skipDuplicates: true });
      }
      return tx.monthlyPlan.findUniqueOrThrow({ where: { id: plan.id }, include: planInclude });
    });
    const stored = toStored(row);
    upsertCachedPlan(stored);
    return stored;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new PlanStoreError('EXISTS', `Kế hoạch ${plan.id} đã tồn tại.`);
    }
    throw err;
  }
}

/**
 * Lưu bản làm việc của kế hoạch.
 * - Chống ghi đè: chỉ lưu khi revision gửi lên khớp revision trong database.
 * - Phiên bản đã chốt: không cho sửa số liệu, trừ khi Growth mở phiên bản mới (đổi mã phiên bản).
 * - Snapshot phiên bản & sổ trao đổi: chỉ thêm mới, bản ghi cũ giữ nguyên.
 */
export async function saveMonthlyPlan(
  id: string,
  plan: InputPlanBreakdownState,
  expectedRevision: number,
  actor: UserProfile
): Promise<StoredMonthlyPlan> {
  if (!plan || plan.id !== id) throw new PlanStoreError('INVALID', 'Mã kế hoạch không khớp.');

  if (!isPostgresMonthlyPlanEnabled()) {
    ensureMemoryPlansSeeded();
    const existing = memoryPlansById.get(id);
    if (!existing) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
    const stored = toMemoryStored(existing).plan;
    await assertPlanAccess(stored, actor, 'write');
    await assertPlanAccess(plan, actor, 'write');
    const { data: catalog } = await readMasterCatalog();
    const positions = planPositionsWithCatalog(stored, actor, catalog);
    const planStore = planStoreOf(stored, catalog);

    if (['PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(plan.status || '') && plan.status !== stored.status) {
      const gate = checkBreakdownForSubmit(plan);
      if (!gate.canSubmit) throw new PlanStoreError('INVALID', gate.reason || 'Kế hoạch chưa đủ điều kiện gửi duyệt.');
    }

    const nameKey = (v?: string) => (v || '').trim().toLowerCase();
    const fromStatus = stored.status || 'DRAFT';
    const toStatus = plan.status || 'DRAFT';
    const leaderName = planStore ? storeLeader(planStore) : (stored.hasBookingLeader !== false ? stored.bookingLeader : undefined);
    const leaderIsMain = Boolean(
      leaderName &&
        ((planStore && nameKey(leaderName) === nameKey(storeMainBooking(planStore))) ||
          nameKey(leaderName) === nameKey(stored.primaryPic || stored.pic))
    );
    const isGlobalManager = isStaffGlobalAdminOrManager(actor);
    const isPlanLeader = planStore ? positions.has('LEADER') : Boolean(leaderName) && nameKey(actor.name) === nameKey(leaderName);
    if (['PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(toStatus) && ['DRAFT', 'REVISION_REQUESTED'].includes(fromStatus) && !canSubmitPlanForApproval(positions, isGlobalManager)) {
      throw new PlanStoreError('FORBIDDEN', 'Chỉ Booking chính, Dự phòng đang hiệu lực hoặc Quản lý được bấm chốt gửi duyệt kế hoạch.');
    }
    if (leaderName && !leaderIsMain && toStatus === 'PENDING_APPROVAL' && ['DRAFT', 'REVISION_REQUESTED'].includes(fromStatus) && !isGlobalManager) {
      throw new PlanStoreError('INVALID', 'Gian có Trưởng nhóm: kế hoạch phải qua sơ duyệt trước khi lên Giám đốc.');
    }
    if (fromStatus === 'PENDING_PRE_APPROVAL' && toStatus === 'PENDING_APPROVAL' && !isGlobalManager && !isPlanLeader) {
      throw new PlanStoreError('FORBIDDEN', 'Chỉ Trưởng nhóm của gian hàng hoặc quản lý được sơ duyệt.');
    }
    const isLeaderStep = isPlanLeader && fromStatus === 'PENDING_PRE_APPROVAL' && ['PENDING_APPROVAL', 'REVISION_REQUESTED'].includes(toStatus);
    if (!isGlobalManager && !canEditPlanContent(positions, false) && !isLeaderStep) {
      throw new PlanStoreError('FORBIDDEN', 'Leader chỉ sơ duyệt kế hoạch; nội dung do nhân sự phụ trách gian hàng sửa.');
    }
    const isMainPlanOwner = isGlobalManager || positions.has('BOOKING_MAIN') || positions.has('BACKUP');
    if (!isMainPlanOwner && !isLeaderStep) {
      const changedHeader = PLAN_HEADER_TARGET_FIELDS.filter(f => !sameValue(plan[f], stored[f]));
      if (changedHeader.length) {
        throw new PlanStoreError(
          'FORBIDDEN',
          `Booking cùng làm chỉ cập nhật phần phân rã thực thi, không sửa thông tin chung hoặc chỉ tiêu gốc của kế hoạch (${changedHeader.slice(0, 3).join(', ')}).`
        );
      }
    }
    if (isLeaderStep && !canEditPlanContent(positions, false)) {
      const changed = LOCKED_FIELDS.filter(f => !sameValue(plan[f], stored[f]));
      if (changed.length) throw new PlanStoreError('FORBIDDEN', `Leader chỉ sơ duyệt, không sửa số liệu kế hoạch (${changed.slice(0, 3).join(', ')}).`);
    }

    if (existing.revision !== expectedRevision) {
      throw new PlanStoreError(
        'CONFLICT',
        `Kế hoạch đã được ${existing.updatedBy || 'người khác'} cập nhật lúc ${existing.updatedAt.toLocaleString('vi-VN')}.`,
        toMemoryStored(existing),
      );
    }

    plan = withApprovalLock(plan, fromStatus, toStatus);
    if (needsApproveAccess(plan, stored, fromStatus, toStatus, isLeaderStep)) await assertPlanAccess(stored, actor, 'approve');
    const sameVersion = (plan.currentVersionCode || 'v1.0') === (stored.currentVersionCode || 'v1.0');
    const isManagerApplyingPending41 = isGlobalManager && Boolean(stored.pendingReference41) && !plan.pendingReference41;
    if (stored.isVersionLocked && sameVersion && !isManagerApplyingPending41) {
      if (!plan.isVersionLocked) {
        throw new PlanStoreError(
          'LOCKED',
          `Phiên bản ${stored.currentVersionCode || 'v1.0'} đã chốt. Muốn điều chỉnh phải để Growth tạo phiên bản mới.`,
          toMemoryStored(existing),
        );
      }
      const changed = LOCKED_FIELDS.filter(f => !sameValue(plan[f], stored[f]));
      if (changed.length) {
        throw new PlanStoreError(
          'LOCKED',
          `Phiên bản ${stored.currentVersionCode || 'v1.0'} đã chốt, không sửa được số liệu (${changed.join(', ')}). Cần Growth tạo phiên bản mới.`,
          toMemoryStored(existing),
        );
      }
    }

    const { versionSnapshots, discussions } = splitPlan(plan);
    const existingSnaps = existing.plan.versionSnapshots || [];
    const existingDiscs = existing.plan.discussions || [];
    const knownSnapshots = new Set(existingSnaps.map(s => s.id));
    const knownMessages = new Set(existingDiscs.map(d => d.id));
    const newSnapshots = versionSnapshots.filter(s => s?.id && !knownSnapshots.has(s.id));
    if (newSnapshots.length) await assertPlanAccess(stored, actor, 'approve');
    const newMessages = discussions.filter(m => m?.id && !knownMessages.has(m.id));

    const now = new Date();
    const mergedSnapshots = [...existingSnaps, ...structuredClone(newSnapshots)];
    const mergedDiscussions = [...structuredClone(newMessages), ...existingDiscs];
    const nextEntry: MemoryPlanEntry = {
      plan: {
        ...structuredClone(plan),
        status: plan.status || 'DRAFT',
        currentVersionCode: plan.currentVersionCode || 'v1.0',
        isVersionLocked: Boolean(plan.isVersionLocked),
        versionSnapshots: mergedSnapshots,
        discussions: mergedDiscussions,
      },
      revision: existing.revision + 1,
      updatedBy: actor.name,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    memoryPlansById.set(id, nextEntry);
    if (newMessages.length > 0) {
      const list = memoryMessagesByPlanId.get(id) || [];
      for (const m of newMessages) {
        if (!list.some(x => x.clientId === m.id)) {
          list.push({
            clientId: m.id,
            data: m as unknown as PlanChatMessage,
            postedAt: m.timestamp ? new Date(m.timestamp) : now,
            createdAt: now,
          });
        }
      }
      memoryMessagesByPlanId.set(id, list);
      await notifyPlanMessages(id);
    }
    const resultStored = toMemoryStored(nextEntry);
    upsertCachedPlan(resultStored);
    return resultStored;
  }

  let insertedMessages = 0;
  const row = await prisma.$transaction(async tx => {
    const existing = await tx.monthlyPlan.findUnique({ where: { id }, include: planInclude });
    if (!existing || existing.deletedAt) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
    const stored = toStored(existing).plan;
    await assertPlanAccess(stored, actor, 'write');
    await assertPlanAccess(plan, actor, 'write');
    const { data: catalog } = await readMasterCatalog();
    const positions = planPositionsWithCatalog(stored, actor, catalog);
    const planStore = planStoreOf(stored, catalog);

    // Gửi duyệt: bảng phân rã phải hợp lệ và đã giải trình nếu lệch số bảng 4.1
    if (['PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(plan.status || '') && plan.status !== stored.status) {
      const gate = checkBreakdownForSubmit(plan);
      if (!gate.canSubmit) throw new PlanStoreError('INVALID', gate.reason || 'Kế hoạch chưa đủ điều kiện gửi duyệt.');
    }

    // Luồng duyệt: gian có Trưởng nhóm phải sơ duyệt trước khi lên Giám đốc
    const nameKey = (v?: string) => (v || '').trim().toLowerCase();
    const fromStatus = stored.status || 'DRAFT';
    const toStatus = plan.status || 'DRAFT';
    // Leader lấy từ Dữ liệu gốc lúc duyệt (không dùng bản chụp trên kế hoạch); gian không còn Leader thì trình thẳng Giám đốc
    const leaderName = planStore ? storeLeader(planStore) : (stored.hasBookingLeader !== false ? stored.bookingLeader : undefined);
    // Leader kiêm Booking chính: bỏ bước sơ duyệt
    const leaderIsMain = Boolean(
      leaderName &&
        ((planStore && nameKey(leaderName) === nameKey(storeMainBooking(planStore))) ||
          nameKey(leaderName) === nameKey(stored.primaryPic || stored.pic))
    );
    const isGlobalManager = isStaffGlobalAdminOrManager(actor);
    const isPlanLeader = planStore ? positions.has('LEADER') : Boolean(leaderName) && nameKey(actor.name) === nameKey(leaderName);
    if (['PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(toStatus) && ['DRAFT', 'REVISION_REQUESTED'].includes(fromStatus) && !canSubmitPlanForApproval(positions, isGlobalManager)) {
      throw new PlanStoreError('FORBIDDEN', 'Chỉ Booking chính, Dự phòng đang hiệu lực hoặc Quản lý được bấm chốt gửi duyệt kế hoạch.');
    }
    if (leaderName && !leaderIsMain && toStatus === 'PENDING_APPROVAL' && ['DRAFT', 'REVISION_REQUESTED'].includes(fromStatus) && !isGlobalManager) {
      throw new PlanStoreError('INVALID', 'Gian có Trưởng nhóm: kế hoạch phải qua sơ duyệt trước khi lên Giám đốc.');
    }
    if (fromStatus === 'PENDING_PRE_APPROVAL' && toStatus === 'PENDING_APPROVAL' && !isGlobalManager && !isPlanLeader) {
      throw new PlanStoreError('FORBIDDEN', 'Chỉ Trưởng nhóm của gian hàng hoặc quản lý được sơ duyệt.');
    }
    const isLeaderStep = isPlanLeader && fromStatus === 'PENDING_PRE_APPROVAL' && ['PENDING_APPROVAL', 'REVISION_REQUESTED'].includes(toStatus);
    // Leader (không kiêm nhân sự thực thi trên gian) chỉ sơ duyệt, không sửa nội dung kế hoạch
    if (!isGlobalManager && !canEditPlanContent(positions, false) && !isLeaderStep) {
      throw new PlanStoreError('FORBIDDEN', 'Leader chỉ sơ duyệt kế hoạch; nội dung do nhân sự phụ trách gian hàng sửa.');
    }
    const isMainPlanOwner = isGlobalManager || positions.has('BOOKING_MAIN') || positions.has('BACKUP');
    if (!isMainPlanOwner && !isLeaderStep) {
      const changedHeader = PLAN_HEADER_TARGET_FIELDS.filter(f => !sameValue(plan[f], stored[f]));
      if (changedHeader.length) {
        throw new PlanStoreError(
          'FORBIDDEN',
          `Booking cùng làm chỉ cập nhật phần phân rã thực thi, không sửa thông tin chung hoặc chỉ tiêu gốc của kế hoạch (${changedHeader.slice(0, 3).join(', ')}).`
        );
      }
    }
    if (isLeaderStep && !canEditPlanContent(positions, false)) {
      const changed = LOCKED_FIELDS.filter(f => !sameValue(plan[f], stored[f]));
      if (changed.length) throw new PlanStoreError('FORBIDDEN', `Leader chỉ sơ duyệt, không sửa số liệu kế hoạch (${changed.slice(0, 3).join(', ')}).`);
    }

    if (existing.revision !== expectedRevision) {
      throw new PlanStoreError(
        'CONFLICT',
        `Kế hoạch đã được ${existing.updatedBy || 'người khác'} cập nhật lúc ${existing.updatedAt.toLocaleString('vi-VN')}.`,
        toStored(existing)
      );
    }

    plan = withApprovalLock(plan, fromStatus, toStatus);
    if (needsApproveAccess(plan, stored, fromStatus, toStatus, isLeaderStep)) await assertPlanAccess(stored, actor, 'approve');
    const sameVersion = (plan.currentVersionCode || 'v1.0') === existing.currentVersionCode;
    const isManagerApplyingPending41 = isGlobalManager && Boolean(stored.pendingReference41) && !plan.pendingReference41;
    if (existing.isVersionLocked && sameVersion && !isManagerApplyingPending41) {
      if (!plan.isVersionLocked) {
        throw new PlanStoreError(
          'LOCKED',
          `Phiên bản ${existing.currentVersionCode} đã chốt. Muốn điều chỉnh phải để Growth tạo phiên bản mới.`,
          toStored(existing)
        );
      }
      const changed = LOCKED_FIELDS.filter(f => !sameValue(plan[f], stored[f]));
      if (changed.length) {
        throw new PlanStoreError(
          'LOCKED',
          `Phiên bản ${existing.currentVersionCode} đã chốt, không sửa được số liệu (${changed.join(', ')}). Cần Growth tạo phiên bản mới.`,
          toStored(existing)
        );
      }
    }

    const { working, versionSnapshots, discussions } = splitPlan(plan);
    const knownSnapshots = new Set(existing.versionSnapshots.map(s => s.clientId));
    const knownMessages = new Set(existing.discussions.map(d => d.clientId));
    const newSnapshots = versionSnapshots.filter(s => s?.id && !knownSnapshots.has(s.id));
    if (newSnapshots.length) await assertPlanAccess(stored, actor, 'approve');
    const newMessages = discussions.filter(m => m?.id && !knownMessages.has(m.id));

    // updateMany có điều kiện revision để chặn ghi đè trong trường hợp 2 request song song
    const result = await tx.monthlyPlan.updateMany({
      where: { id, revision: expectedRevision },
      data: {
        ...indexedColumns(plan),
        data: working as unknown as Prisma.InputJsonValue,
        revision: { increment: 1 },
        updatedBy: actor.name
      }
    });
    if (result.count === 0) {
      throw new PlanStoreError('CONFLICT', 'Kế hoạch vừa được người khác cập nhật.', toStored(existing));
    }

    if (newSnapshots.length) {
      await tx.monthlyPlanVersionSnapshot.createMany({ data: snapshotRows(id, newSnapshots), skipDuplicates: true });
    }
    if (newMessages.length) {
      // Giữ tương thích: chấp nhận cả tin hệ thống (đổi trạng thái, chốt phiên bản) lẫn tin người dùng đi kèm payload kế hoạch
      const inserted = await tx.monthlyPlanDiscussion.createMany({ data: discussionRows(id, newMessages), skipDuplicates: true });
      insertedMessages = inserted.count;
    }

    return tx.monthlyPlan.findUniqueOrThrow({ where: { id }, include: planInclude });
  }, { timeout: 20000, maxWait: 15000 });

  // Phát tín hiệu sau khi transaction đã commit; hàm không bao giờ ném lỗi
  if (insertedMessages > 0) await notifyPlanMessages(id);

  const stored = toStored(row);
  upsertCachedPlan(stored);
  return stored;
}

// =========================================================================
// TRAO ĐỔI KẾ HOẠCH (gửi/đọc tin riêng, không phụ thuộc revision của kế hoạch)
// =========================================================================

const MESSAGE_LIST_LIMIT = 500;
// Lùi mốc đọc một chút để không sót tin do transaction commit chậm; giao diện tự gộp trùng theo id
const CURSOR_SAFETY_MS = 5000;

function rowToMessage(row: { data: Prisma.JsonValue; postedAt: Date }): PlanChatMessage {
  const data = row.data as unknown as PlanChatMessage;
  return { ...data, timestamp: data.timestamp || row.postedAt.toISOString() };
}

async function assertPlanExists(planId: string) {
  if (!isPostgresMonthlyPlanEnabled()) {
    ensureMemoryPlansSeeded();
    if (!memoryPlansById.has(planId)) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
    return;
  }
  if (cachedPlansState && Date.now() < cachedPlansState.expiresAt && cachedPlansState.byId.has(planId)) {
    return;
  }
  const plan = await prisma.monthlyPlan.findUnique({ where: { id: planId }, select: { id: true, deletedAt: true } });
  if (!plan || plan.deletedAt) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
}

/**
 * Đọc tin trao đổi của kế hoạch, cũ -> mới.
 * - `after`: chỉ lấy tin được ghi vào database sau mốc này (theo giờ server, có lùi an toàn vài giây).
 * - Trả kèm `cursor` (giờ server của tin mới nhất) để lần sau hỏi tiếp.
 */
export async function listPlanMessages(
  planId: string,
  after?: Date | null
): Promise<{ messages: PlanChatMessage[]; cursor: string | null }> {
  await assertPlanExists(planId);
  if (!isPostgresMonthlyPlanEnabled()) {
    const all = memoryMessagesByPlanId.get(planId) || [];
    const filtered = (after ? all.filter(r => r.createdAt.getTime() > after.getTime() - CURSOR_SAFETY_MS) : [...all])
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, MESSAGE_LIST_LIMIT);
    const latest = filtered[0]?.createdAt ?? null;
    const messages = filtered
      .map(r => ({ ...r.data, timestamp: r.data.timestamp || r.postedAt.toISOString() }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return {
      messages,
      cursor: latest ? latest.toISOString() : after ? after.toISOString() : null,
    };
  }
  const rows = await prisma.monthlyPlanDiscussion.findMany({
    where: {
      planId,
      ...(after ? { createdAt: { gt: new Date(after.getTime() - CURSOR_SAFETY_MS) } } : {})
    },
    orderBy: [{ createdAt: 'desc' }],
    take: MESSAGE_LIST_LIMIT,
    select: { data: true, postedAt: true, createdAt: true }
  });
  const latest = rows[0]?.createdAt ?? null;
  const messages = rows
    .map(rowToMessage)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return {
    messages,
    cursor: latest ? latest.toISOString() : after ? after.toISOString() : null
  };
}

export interface AppendPlanMessageInput {
  clientId: string;
  content: string;
  type: UserMessageType;
  tags?: string[];
}

export interface PlanMessageAuthor {
  id: string;
  name: string;
  role: PlanDiscussionRole;
  title: string;
}

/**
 * Thêm một tin trao đổi (chỉ thêm, không sửa/xóa). Idempotent theo clientId:
 * gửi lại cùng clientId trả về tin đã lưu, không tạo bản ghi trùng.
 */
export async function appendPlanMessage(
  planId: string,
  input: AppendPlanMessageInput,
  author: PlanMessageAuthor
): Promise<{ message: PlanChatMessage; created: boolean }> {
  await assertPlanExists(planId);

  if (!isPostgresMonthlyPlanEnabled()) {
    const list = memoryMessagesByPlanId.get(planId) || [];
    const existing = list.find(r => r.clientId === input.clientId);
    if (existing) {
      return { message: { ...existing.data, timestamp: existing.data.timestamp || existing.postedAt.toISOString() }, created: false };
    }
    const postedAt = new Date();
    const message: PlanChatMessage = {
      id: input.clientId,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      authorTitle: author.title,
      content: input.content,
      type: input.type,
      timestamp: postedAt.toISOString(),
      ...(input.tags?.length ? { tags: input.tags } : {}),
    };
    list.push({ clientId: input.clientId, data: message, postedAt, createdAt: postedAt });
    memoryMessagesByPlanId.set(planId, list);
    const planEntry = memoryPlansById.get(planId);
    if (planEntry) {
      planEntry.plan.discussions = [message as unknown as PlanDiscussionMessage, ...(planEntry.plan.discussions || [])];
    }
    invalidateMonthlyPlansCache();
    await notifyPlanMessages(planId);
    return { message, created: true };
  }

  const existing = await prisma.monthlyPlanDiscussion.findUnique({
    where: { planId_clientId: { planId, clientId: input.clientId } },
    select: { data: true, postedAt: true }
  });
  if (existing) return { message: rowToMessage(existing), created: false };

  const postedAt = new Date();
  const message: PlanChatMessage = {
    id: input.clientId,
    authorId: author.id,
    authorName: author.name,
    authorRole: author.role,
    authorTitle: author.title,
    content: input.content,
    type: input.type,
    timestamp: postedAt.toISOString(),
    ...(input.tags?.length ? { tags: input.tags } : {})
  };

  try {
    await prisma.monthlyPlanDiscussion.create({
      data: {
        planId,
        clientId: input.clientId,
        authorName: author.name,
        authorRole: author.role,
        authorTitle: author.title,
        type: input.type,
        content: input.content,
        data: message as unknown as Prisma.InputJsonValue,
        postedAt
      }
    });
  } catch (err) {
    // Hai request cùng clientId chạy song song: trả về bản đã lưu
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const row = await prisma.monthlyPlanDiscussion.findUniqueOrThrow({
        where: { planId_clientId: { planId, clientId: input.clientId } },
        select: { data: true, postedAt: true }
      });
      return { message: rowToMessage(row), created: false };
    }
    throw err;
  }

  invalidateMonthlyPlansCache();
  await notifyPlanMessages(planId);
  return { message, created: true };
}
