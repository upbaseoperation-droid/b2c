import { isPlanManagedByUser, isBrandManagedByUser, isStoreManagedByUser, isStaffGlobalAdminOrManager } from '../rbacScope';
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
import { brandPlanSectionsOf, FULL_BRAND_PLAN_ACCESS, type BrandPlanAccess } from '../brandPlanAccess';
import { INITIAL_MONTHLY_PLANS } from '../monthlyPlanData';
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

const planInclude = {
  versionSnapshots: { orderBy: { lockedAt: 'asc' } },
  discussions: { orderBy: { postedAt: 'desc' } }
} satisfies Prisma.MonthlyPlanInclude;

type PlanRow = Prisma.MonthlyPlanGetPayload<{ include: typeof planInclude }>;

function toStored(row: PlanRow): StoredMonthlyPlan {
  const base = row.data as unknown as InputPlanBreakdownState;
  return {
    revision: row.revision,
    plan: {
      ...base,
      id: row.id,
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
    growthPic: plan.growthPic ?? null,
    mediaPic: plan.mediaPic ?? null,
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

export async function assertPlanAccess(plan: InputPlanBreakdownState, actor: UserProfile, action: 'read' | 'write' | 'approve' = 'read') {
  const { data } = await readMasterCatalog();
  if (!isPlanManagedByUser(plan, actor, data.stores) || !await actionAllowed(actor, 'plan_target_month', action)) throw new PlanStoreError('FORBIDDEN', 'Không có quyền với kế hoạch này.');
  // A client cannot grant itself another brand by putting its own name into plan.pic.
  if (action !== 'read' && !isStaffGlobalAdminOrManager(actor)) {
    const targetStore = plan.storeId || plan.storeName;
    if (targetStore) {
      const store = data.stores.find(s => s.id === plan.storeId || s.storeName === plan.storeName);
      if (!store || !isStoreManagedByUser(store, actor)) throw new PlanStoreError('FORBIDDEN', 'Gian hàng không thuộc phạm vi được giao.');
    }
    const targetBrand = plan.brandName || plan.parentBrand;
    if (targetBrand) {
      const brand = data.brands.find(b => brandKey(b.name) === brandKey(targetBrand));
      if (!brand || !isBrandManagedByUser(brand, actor, data.stores)) throw new PlanStoreError('FORBIDDEN', 'Thương hiệu không thuộc phạm vi được giao.');
    }
  }
}
export async function assertPlanIdAccess(id: string, actor: UserProfile, action: 'read' | 'write' = 'read') {
  const row = await prisma.monthlyPlan.findUnique({ where: { id }, include: planInclude });
  if (!row || row.deletedAt) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
  const plan = toStored(row).plan;
  await assertPlanAccess(plan, actor, action);
  return plan;
}
/**
 * Quyền với Plan tháng của Brand của một kế hoạch: PIC gian / quản lý sửa cả plan;
 * người chỉ giữ vị trí Plan / Strategy hoặc Key Visual / SIS của gian sửa đúng phần đó; còn lại chỉ xem nếu có quyền xem.
 */
async function brandPlanAccessFor(plan: InputPlanBreakdownState, actor: UserProfile, stores: StorePortfolioItem[]): Promise<BrandPlanAccess> {
  try {
    await assertPlanAccess(plan, actor, 'write');
    return FULL_BRAND_PLAN_ACCESS;
  } catch (err) {
    if (!(err instanceof PlanStoreError) || err.code !== 'FORBIDDEN') throw err;
  }
  const store = stores.find(s => (plan.storeId && s.id === plan.storeId) || (plan.storeName && s.storeName === plan.storeName));
  const sections = brandPlanSectionsOf(store, actor.name);
  if (sections.length > 0) return { full: false, sections };
  await assertPlanAccess(plan, actor, 'read');
  return { full: false, sections: [] };
}

export async function resolveBrandPlanAccess(id: string, actor: UserProfile): Promise<{ plan: InputPlanBreakdownState; access: BrandPlanAccess }> {
  const row = await prisma.monthlyPlan.findUnique({ where: { id }, include: planInclude });
  if (!row || row.deletedAt) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
  const plan = toStored(row).plan;
  const { data } = await readMasterCatalog();
  return { plan, access: await brandPlanAccessFor(plan, actor, data.stores) };
}

/** Kế hoạch mở được ở màn Plan tháng của Brand: kế hoạch trong phạm vi + kế hoạch của gian mình giữ vị trí Plan / Strategy, Key Visual / SIS. */
export async function listBrandPlanPlans(actor: UserProfile): Promise<{ plan: InputPlanBreakdownState; access: BrandPlanAccess }[]> {
  const [rows, { data }] = await Promise.all([
    prisma.monthlyPlan.findMany({ where: { deletedAt: null }, include: planInclude, orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }] }),
    readMasterCatalog(),
  ]);
  const out: { plan: InputPlanBreakdownState; access: BrandPlanAccess }[] = [];
  for (const row of rows) {
    const plan = toStored(row).plan;
    try {
      out.push({ plan, access: await brandPlanAccessFor(plan, actor, data.stores) });
    } catch (err) {
      if (!(err instanceof PlanStoreError) || err.code !== 'FORBIDDEN') throw err;
    }
  }
  return out;
}

/** Lấy danh sách kế hoạch. Lần đầu khi bảng trống sẽ nạp bộ kế hoạch mẫu ban đầu. */
export async function listMonthlyPlans(actor: UserProfile): Promise<StoredMonthlyPlan[]> {
  const [initialRows, { data }, allowed] = await Promise.all([
    prisma.monthlyPlan.findMany({
      where: { deletedAt: null },
      include: planInclude,
      orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }]
    }),
    readMasterCatalog(),
    actionAllowed(actor, 'plan_target_month', 'read')
  ]);
  if (!allowed) throw new PlanStoreError('FORBIDDEN', 'Không có quyền xem kế hoạch.');
  let rows = initialRows;
  if (rows.length === 0 && actor.role === 'ADMIN') {
    const totalCount = await prisma.monthlyPlan.count();
    if (totalCount === 0) {
      await seedInitialPlans(actor);
      rows = await prisma.monthlyPlan.findMany({
        where: { deletedAt: null },
        include: planInclude,
        orderBy: [{ month: 'desc' }, { updatedAt: 'desc' }]
      });
    }
  }
  return rows.map(toStored).filter(row => isPlanManagedByUser(row.plan, actor, data.stores));
}

async function seedInitialPlans(actor: UserProfile) {
  for (const plan of INITIAL_MONTHLY_PLANS) {
    try {
      await createMonthlyPlan(plan, actor);
    } catch (err) {
      // Bỏ qua nếu đã có người khác nạp cùng lúc
      if (!(err instanceof PlanStoreError && err.code === 'EXISTS')) throw err;
    }
  }
}

export async function createMonthlyPlan(plan: InputPlanBreakdownState, actor: UserProfile): Promise<StoredMonthlyPlan> {
  if (!plan?.id) throw new PlanStoreError('INVALID', 'Thiếu mã kế hoạch.');
  await assertPlanAccess(plan, actor, 'write');
  if (plan.isVersionLocked || (plan.status && !['DRAFT', 'PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(plan.status)) || plan.versionSnapshots?.length) await assertPlanAccess(plan, actor, 'approve');
  const { working, versionSnapshots, discussions } = splitPlan(plan);

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
    return toStored(row);
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

  let insertedMessages = 0;
  const row = await prisma.$transaction(async tx => {
    const existing = await tx.monthlyPlan.findUnique({ where: { id }, include: planInclude });
    if (!existing || existing.deletedAt) throw new PlanStoreError('NOT_FOUND', 'Không tìm thấy kế hoạch.');
    const stored = toStored(existing).plan;
    await assertPlanAccess(stored, actor, 'write');
    await assertPlanAccess(plan, actor, 'write');

    // Gửi duyệt: bảng phân rã phải hợp lệ và đã giải trình nếu lệch số bảng 4.1
    if (['PENDING_PRE_APPROVAL', 'PENDING_APPROVAL'].includes(plan.status || '') && plan.status !== stored.status) {
      const gate = checkBreakdownForSubmit(plan);
      if (!gate.canSubmit) throw new PlanStoreError('INVALID', gate.reason || 'Kế hoạch chưa đủ điều kiện gửi duyệt.');
    }

    // Luồng duyệt: gian có Trưởng nhóm phải sơ duyệt trước khi lên Giám đốc
    const nameKey = (v?: string) => (v || '').trim().toLowerCase();
    const fromStatus = stored.status || 'DRAFT';
    const toStatus = plan.status || 'DRAFT';
    const leaderName = stored.hasBookingLeader !== false ? stored.bookingLeader : undefined;
    const isGlobalManager = isStaffGlobalAdminOrManager(actor);
    const isPlanLeader = Boolean(leaderName) && nameKey(actor.name) === nameKey(leaderName);
    if (leaderName && toStatus === 'PENDING_APPROVAL' && ['DRAFT', 'REVISION_REQUESTED'].includes(fromStatus) && !isGlobalManager) {
      throw new PlanStoreError('INVALID', 'Gian có Trưởng nhóm: kế hoạch phải qua sơ duyệt trước khi lên Giám đốc.');
    }
    if (fromStatus === 'PENDING_PRE_APPROVAL' && toStatus === 'PENDING_APPROVAL' && !isGlobalManager && !isPlanLeader) {
      throw new PlanStoreError('FORBIDDEN', 'Chỉ Trưởng nhóm của gian hàng hoặc quản lý được sơ duyệt.');
    }
    const isLeaderStep = isPlanLeader && fromStatus === 'PENDING_PRE_APPROVAL' && ['PENDING_APPROVAL', 'REVISION_REQUESTED'].includes(toStatus);

    if (existing.revision !== expectedRevision) {
      throw new PlanStoreError(
        'CONFLICT',
        `Kế hoạch đã được ${existing.updatedBy || 'người khác'} cập nhật lúc ${existing.updatedAt.toLocaleString('vi-VN')}.`,
        toStored(existing)
      );
    }

    const protectedStatuses = ['PRE_APPROVED', 'LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'LOCKED', 'IN_EXECUTION', 'COMPLETED', 'REVISION_REQUESTED'];
    if ((plan.status !== stored.status && (protectedStatuses.includes(plan.status || '') || protectedStatuses.includes(stored.status || ''))) || Boolean(plan.isVersionLocked) !== Boolean(stored.isVersionLocked) || (plan.currentVersionCode || 'v1.0') !== (stored.currentVersionCode || 'v1.0')) {
      if (!isLeaderStep) await assertPlanAccess(stored, actor, 'approve');
    }
    const sameVersion = (plan.currentVersionCode || 'v1.0') === existing.currentVersionCode;
    if (existing.isVersionLocked && sameVersion) {
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

  return toStored(row);
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

  await notifyPlanMessages(planId);
  return { message, created: true };
}
