// Bộ dựng dùng chung cho các test luồng nghiệp vụ xuyên suốt:
// - Dữ liệu ghi vào thư mục tạm (SHARED_DATA_DIR / CONTRACT_DATA_DIR), kế hoạch ở bộ nhớ (không DATABASE_URL).
// - Google Sheets giả lập qua fetch: nhiều Sheet theo mã, đặt được lỗi 403 / 404; chặn mọi lời gọi mạng khác.
// - Hàm gọi API thật của app và dựng nhanh dữ liệu (kế hoạch đã duyệt, Listing, Deal).
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';
import { NextRequest } from 'next/server';

import { POST as monthlyPlansPost } from '../../src/app/api/monthly-plans/route';
import { PUT as monthlyPlanPut } from '../../src/app/api/monthly-plans/[id]/route';
import { GET as listingGet, PUT as listingPut } from '../../src/app/api/listing-board/route';
import { POST as pushSheetPost } from '../../src/app/api/booking-list/push-sheet/route';
import { POST as pullSheetPost } from '../../src/app/api/booking-list/pull-sheet/route';
import { GET as dealGet, PUT as dealPut } from '../../src/app/api/deal-board/route';
import { POST as contractPost } from '../../src/app/api/contracts/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../../src/lib/larkAuth';
import { USERS } from '../../src/lib/mockData';
import { readMasterCatalog } from '../../src/lib/server/masterCatalogStore';
import { distributeReference41ToWeeks } from '../../src/lib/planBreakdownRules';
import { UPBASE_FULL_KOC_MASTER } from '../../src/lib/kocMasterDataset';
import { columnOf, createListingItem, moveItem } from '../../src/lib/listingBoardRules';
import { BOOKING_LIST_COLUMNS, buildBookingListRowsFromListingItems } from '../../src/lib/bookingList';
import { createDeal, type DealBoardData, type PlanDeal } from '../../src/lib/dealBoardRules';
import { loadTemplate } from '../../src/lib/contracts/templates';
import { uniqueFields } from '../../src/components/contracts/contractUi';
import type { ContractRecord } from '../../src/lib/contracts/types';
import type { InputPlanBreakdownState, KocItem, KocListingItem, StorePortfolioItem, UserProfile } from '../../src/lib/types';

// ───────────────────────── Môi trường tạm ─────────────────────────
const dataDir = mkdtempSync(path.join(os.tmpdir(), 'b2c-full-flow-'));
const envBackup = { ...process.env };
process.env.SHARED_DATA_DIR = path.join(dataDir, 'shared');
process.env.CONTRACT_DATA_DIR = path.join(dataDir, 'contracts');
for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_CREDENTIALS', 'DATABASE_URL']) delete process.env[k];
const SA_EMAIL = 'e2e-bot@fake-project.iam.gserviceaccount.com';
const SA_KEY = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
export function setGoogleConfigured(on: boolean) {
  if (on) {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = SA_EMAIL;
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = SA_KEY;
  } else {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  }
}
setGoogleConfigured(true);

// ───────────────────────── Google Sheets giả lập ─────────────────────────
type Tab = { sheetId: number; values: string[][] };
interface FakeSpreadsheet { title: string; tabs: Map<string, Tab>; failWith?: 403 | 404 }
export const fakeSheets = new Map<string, FakeSpreadsheet>();
export const outbound: string[] = [];

export function sheetUrl(id: string) {
  if (!fakeSheets.has(id)) fakeSheets.set(id, { title: `Sheet ${id}`, tabs: new Map() });
  return `https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`;
}
export const sheetOf = (id: string) => fakeSheets.get(id)!;

const colIndex = (letters: string) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
function parseA1(a1: string): { tab: string; row: number; col: number } {
  const m = decodeURIComponent(a1).match(/^'?(.*?)'?!([A-Z]+)(\d*)/);
  if (!m) throw new Error(`A1 lạ: ${a1}`);
  return { tab: m[1].replace(/''/g, "'"), col: colIndex(m[2]), row: m[3] ? Number(m[3]) - 1 : 0 };
}
function writeRange(sheet: FakeSpreadsheet, range: string, values: unknown[][]) {
  const { tab, row, col } = parseA1(range);
  const t = sheet.tabs.get(tab);
  if (!t) throw new Error(`Không có tab ${tab}`);
  values.forEach((r, ri) => {
    const target = (t.values[row + ri] ||= []);
    r.forEach((v, ci) => {
      while (target.length < col + ci) target.push('');
      target[col + ci] = v === null || v === undefined ? '' : String(v);
    });
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || 'GET').toUpperCase();
  if (url.startsWith('https://oauth2.googleapis.com/token')) return json({ access_token: 'fake-token', expires_in: 3600 });
  const m = url.match(/^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/([^/?:]+)(.*)$/);
  if (m) {
    const sheet = fakeSheets.get(m[1]);
    if (!sheet) return json({ error: 'not found' }, 404);
    if (sheet.failWith) return json({ error: 'fail' }, sheet.failWith);
    const rest = m[2];
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (rest.startsWith('?') || rest === '') {
      return json({
        properties: { title: sheet.title },
        sheets: [...sheet.tabs.entries()].map(([title, t]) => ({ properties: { sheetId: t.sheetId, title, gridProperties: { rowCount: 1000, columnCount: 60 }, hidden: false } })),
      });
    }
    if (rest === ':batchUpdate') {
      const replies = (body.requests || []).map((r: { addSheet?: { properties: { title: string } } }) => {
        if (!r.addSheet) return {};
        const sheetId = sheet.tabs.size + 100;
        sheet.tabs.set(r.addSheet.properties.title, { sheetId, values: [] });
        return { addSheet: { properties: { sheetId, title: r.addSheet.properties.title, gridProperties: { rowCount: 1000, columnCount: 26 } } } };
      });
      return json({ replies });
    }
    if (rest === '/values:batchUpdate') {
      for (const d of body.data || []) writeRange(sheet, d.range, d.values);
      return json({ totalUpdatedCells: 1 });
    }
    if (rest.startsWith('/values/')) {
      const range = rest.slice('/values/'.length).split('?')[0];
      if (method === 'PUT') {
        writeRange(sheet, range, body.values);
        return json({});
      }
      const t = sheet.tabs.get(parseA1(range).tab);
      return t ? json({ range, values: t.values }) : json({ error: 'not found' }, 404);
    }
  }
  outbound.push(`${method} ${url}`);
  return json({ error: 'Bị chặn trong kiểm thử E2E' }, 503);
}) as typeof fetch;

after(() => {
  globalThis.fetch = realFetch;
  for (const k of Object.keys(process.env)) if (!(k in envBackup)) delete process.env[k];
  Object.assign(process.env, envBackup);
  rmSync(dataDir, { recursive: true, force: true });
});

/** Đọc bảng của một tab dưới dạng header + dòng. */
export function tabTable(sheetId: string, tab: string) {
  const t = sheetOf(sheetId).tabs.get(tab);
  assert.ok(t, `Sheet chưa có tab ${tab}`);
  const headerIdx = t.values.findIndex(r => r.includes('ID kênh'));
  return { tab: t, headerIdx, header: t.values[headerIdx] || [] };
}

/** Brand điền một ô trên Sheet theo tên cột và ID kênh. */
export function brandFill(sheetId: string, tabName: string, handle: string, column: string, value: string) {
  const { tab, headerIdx, header } = tabTable(sheetId, tabName);
  const keyCol = header.indexOf('ID kênh');
  let col = header.indexOf(column);
  if (col < 0) {
    header.push(column);
    col = header.length - 1;
  }
  const row = tab.values.findIndex((r, i) => i > headerIdx && (r[keyCol] || '').replace(/^@/, '').toLowerCase() === handle.replace(/^@/, '').toLowerCase());
  assert.ok(row > headerIdx, `Sheet không có dòng của @${handle}`);
  while (tab.values[row].length <= col) tab.values[row].push('');
  tab.values[row][col] = value;
}

/** Brand tự thêm một dòng KOC mới vào Sheet. */
export function brandAddRow(sheetId: string, tabName: string, cells: Record<string, string>) {
  const { tab, header } = tabTable(sheetId, tabName);
  tab.values.push(header.map(h => cells[h] ?? ''));
}

// ───────────────────────── Người dùng ─────────────────────────
const findUser = (id: string) => {
  const u = USERS.find(x => x.id === id);
  assert.ok(u, `Không có người dùng ${id}`);
  return u!;
};
export const director = findUser('user-yen-nhi');
export const booking = findUser('user-thanh-hai');
export const leader = findUser('user-ngoc-tam');
export const finance = findUser('contract-demo-finance');
export const legal = findUser('contract-demo-legal');
/** Booking cùng làm của gian Rejuran TikTok (có trong Dữ liệu gốc, không có trong danh sách người dùng mẫu). */
export const coBooking = { ...booking, id: 'user-quynh-nhi-e2e', name: 'Nguyễn Thị Quỳnh Nhi', staffCode: 'HN702', email: 'quynhnhi.e2e@upbase.vn' } as UserProfile;
export const brandPartner = { ...booking, id: 'partner-brand-e2e', name: 'Brand Rejuran', role: 'BRAND_PARTNER', partnerType: 'BRAND' } as UserProfile;
export const contractUser = (id: string): UserProfile =>
  ({ id, name: id, email: `${id}@upbase.vn`, avatar: 'KT', role: 'BOOKING_MEMBER', roleTitle: 'Kiểm thử E2E', loginProvider: 'SANDBOX' }) as UserProfile;

// ───────────────────────── Gọi API ─────────────────────────
const ORIGIN = 'http://localhost:3000';
export function req(url: string, method: string, actor: UserProfile | null, body?: unknown) {
  const headers: Record<string, string> = { origin: ORIGIN };
  if (actor) headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken(actor)}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(ORIGIN + url, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiResult = { status: number; body: any };
export async function call(res: Response | Promise<Response>): Promise<ApiResult> {
  const r = await res;
  const text = await r.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* giữ chuỗi */ }
  return { status: r.status, body };
}
/** Kỳ vọng bị chặn (mã >= 400), kèm thông điệp khớp (nếu có). */
export function assertBlocked(r: ApiResult, why: string, message?: RegExp, status?: number) {
  assert.ok(r.status >= 400, `${why} — phải bị chặn, nhận ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
  if (status) assert.equal(r.status, status, `${why} — mã lỗi: ${JSON.stringify(r.body)}`);
  if (message) assert.match(String(r.body?.error ?? r.body), message, why);
}
export function assertOk(r: ApiResult, why: string) {
  assert.ok(r.status >= 200 && r.status < 300, `${why} — nhận ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
}

export const api = {
  createPlan: (actor: UserProfile, plan: InputPlanBreakdownState) => call(monthlyPlansPost(req('/api/monthly-plans', 'POST', actor, { plan }))),
  putPlan: (actor: UserProfile, plan: InputPlanBreakdownState, expectedRevision: number) =>
    call(monthlyPlanPut(req(`/api/monthly-plans/${plan.id}`, 'PUT', actor, { plan, expectedRevision }), { params: Promise.resolve({ id: plan.id }) })),
  listing: (actor: UserProfile, planId: string) => call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(planId)}`, 'GET', actor))),
  duplicates: (actor: UserProfile, planId: string) => call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(planId)}&view=duplicates`, 'GET', actor))),
  putListing: (actor: UserProfile, planId: string, revision: number, items: KocListingItem[]) => call(listingPut(req('/api/listing-board', 'PUT', actor, { planId, revision, items }))),
  push: (actor: UserProfile, body: Record<string, unknown>) => call(pushSheetPost(req('/api/booking-list/push-sheet', 'POST', actor, body))),
  pull: (actor: UserProfile, body: Record<string, unknown>) => call(pullSheetPost(req('/api/booking-list/pull-sheet', 'POST', actor, body))),
  deals: (actor: UserProfile, planId: string) => call(dealGet(req(`/api/deal-board?planId=${encodeURIComponent(planId)}`, 'GET', actor))),
  putDeals: (actor: UserProfile, planId: string, revision: number, data: Partial<DealBoardData>) => call(dealPut(req('/api/deal-board', 'PUT', actor, { planId, revision, data }))),
  contract: (actorId: string, body: Record<string, unknown>) => call(contractPost(req('/api/contracts', 'POST', contractUser(actorId), body))),
};

// ───────────────────────── Dữ liệu gốc & KOC ─────────────────────────
export const STORE_TIKTOK = 'store-b2c-57-rejuran-tiktok-e2e-o';
export const STORE_SHOPEE = 'store-b2c-56-rejuran-shopee-e2e-o';
export async function storeById(id: string): Promise<StorePortfolioItem> {
  const { data } = await readMasterCatalog();
  const s = data.stores.find(x => x.id === id);
  assert.ok(s, `Không có gian ${id}`);
  return s as StorePortfolioItem;
}
export async function outsider(store: StorePortfolioItem): Promise<UserProfile> {
  const staff = new Set(Object.keys(store.staffCodes || {}));
  const u = USERS.find(x => x.role === 'BOOKING_MEMBER' && !staff.has(x.name.trim().toLowerCase()));
  assert.ok(u, 'Cần một Booking không thuộc gian');
  return u!;
}

const KOC_POOL = (() => {
  const seen = new Set<string>();
  return UPBASE_FULL_KOC_MASTER.filter(k => {
    const h = (k.channelId || '').replace(/^@/, '').toLowerCase();
    if (!h || seen.has(h) || !(k.rateCardVideo && k.rateCardVideo > 0) || /[^a-z0-9._]/.test(h)) return false;
    seen.add(h);
    return true;
  });
})();
let kocCursor = 0;
/** Lấy n KOC thật, không trùng giữa các lần gọi trong cùng tiến trình. */
export function takeKocs(n: number): KocItem[] {
  const out = KOC_POOL.slice(kocCursor, kocCursor + n);
  kocCursor += n;
  assert.equal(out.length, n, 'Hết KOC mẫu');
  return out;
}
export const handleOf = (k: KocItem) => k.channelId.replace(/^@/, '').toLowerCase();

// ───────────────────────── Dựng nhanh kế hoạch ─────────────────────────
let planSeq = 0;
export function draftPlan(store: StorePortfolioItem, month: string, over: Partial<InputPlanBreakdownState> = {}): InputPlanBreakdownState {
  const base: InputPlanBreakdownState = {
    id: `PO-E2E-${store.id.slice(10, 16)}-${month.replace('/', '')}-${Date.now().toString(36)}${planSeq++}`,
    title: store.storeName,
    brandName: store.brandName,
    storeId: store.id,
    storeName: store.storeName,
    month,
    week: 'W1',
    pic: booking.name,
    totalTargetBudget: 120_000_000,
    totalTargetContents: 24,
    targetGmv: 900_000_000,
    cancellationRate: 8,
    budgetAffiliate: 120_000_000,
    status: 'DRAFT',
    items: [],
    reference41: {
      month, importedAt: new Date().toISOString(), importedBy: director.name, isGrowthLocked: true, growthLockLabel: 'Đã chốt',
      videoAff: 24, foc: 0, cast: 24, affCostGross: 114_048_000, affCostNet: 96_000_000,
      selfVideos: 0, selfCostGross: 0, selfCostNet: 0, liveSessions: 0, liveCostGross: 0, liveCostNet: 0,
      tiers: { KL1: 8, KL2: 8, KL3: 6, KL4: 2 },
    },
    ...over,
  };
  return base;
}
export function withBreakdown(plan: InputPlanBreakdownState): InputPlanBreakdownState {
  const { weeklyBreakdown, items } = distributeReference41ToWeeks(plan, 'EVEN');
  return { ...plan, weeklyBreakdown, items, staffWeeklySlices: [{ staffName: booking.name, roleLabel: 'Booking chính', rowCount: weeklyBreakdown.length, weeklyBreakdown }] };
}

export interface PlanCtx { plan: InputPlanBreakdownState; revision: number }
/** Kế hoạch đã qua đủ luồng: tạo → phân rã → Booking gửi → Leader sơ duyệt → Giám đốc duyệt & khóa phiên bản (như giao diện). */
export async function approvedPlan(store: StorePortfolioItem, month: string): Promise<PlanCtx> {
  const created = await api.createPlan(director, draftPlan(store, month));
  assertOk(created, 'Tạo kế hoạch');
  let ctx: PlanCtx = { plan: created.body.plan, revision: created.body.revision };
  const step = async (actor: UserProfile, patch: Partial<InputPlanBreakdownState>, why: string) => {
    const r = await api.putPlan(actor, { ...ctx.plan, ...patch }, ctx.revision);
    assertOk(r, why);
    ctx = { plan: r.body.plan, revision: r.body.revision };
  };
  await step(booking, withBreakdown(ctx.plan), 'Lưu phân rã');
  await step(booking, { status: 'PENDING_PRE_APPROVAL' }, 'Booking gửi duyệt');
  await step(leader, { status: 'PENDING_APPROVAL', leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' }, 'Leader sơ duyệt');
  await step(director, { status: 'IN_EXECUTION', isVersionLocked: true }, 'Giám đốc duyệt & khóa');
  return ctx;
}

// ───────────────────────── Dựng nhanh Listing / Sheet / Deal ─────────────────────────
export async function addToListing(actor: UserProfile, plan: InputPlanBreakdownState, kocs: KocItem[], pic = booking.name, fee?: number) {
  const cur = await api.listing(actor, plan.id);
  assertOk(cur, 'Đọc Listing');
  const items = kocs.map(k => {
    const i = createListingItem({ plan, grade: (k.salaryGrade as never) || 'KL2', handle: k.channelId, koc: k, fee, actorId: actor.id, actorName: actor.name });
    i.assignedStaffName = pic;
    return i;
  });
  return api.putListing(actor, plan.id, cur.body.revision, [...cur.body.items, ...items]);
}

export async function pushAll(actor: UserProfile, plan: InputPlanBreakdownState, sheetId: string, tab: string, kocs: KocItem[], extra: Record<string, unknown> = {}) {
  // Dòng dựng từ Listing do Booking chính đọc (người gửi có thể không có quyền đọc — đó là điều cần kiểm)
  const board = await api.listing(booking, plan.id);
  const rows =buildBookingListRowsFromListingItems(plan, board.body.items, [], kocs);
  return api.push(actor, { planId: plan.id, sheetUrl: sheetUrl(sheetId), tab, columns: [...BOOKING_LIST_COLUMNS], rows, ...extra });
}

export const pull = (actor: UserProfile, plan: InputPlanBreakdownState, sheetId: string, tab: string, dryRun = false) =>
  api.pull(actor, { planId: plan.id, sheetUrl: sheetUrl(sheetId), tab, dryRun });

export async function itemsByHandle(actor: UserProfile, planId: string) {
  const r = await api.listing(actor, planId);
  assertOk(r, 'Đọc Listing');
  const map = new Map<string, KocListingItem>();
  for (const i of r.body.items as KocListingItem[]) map.set(i.kocHandle.replace(/^@/, '').toLowerCase(), i);
  return { map, revision: r.body.revision as number, items: r.body.items as KocListingItem[] };
}

/** Đi trọn: Listing → đẩy Sheet → Brand Yes → kéo → chốt → tạo Deal. Trả về deal theo handle. */
export async function seedDeals(plan: InputPlanBreakdownState, kocs: KocItem[], sheetId: string, tab = 'Listing') {
  assertOk(await addToListing(booking, plan, kocs), 'Thêm Listing');
  assertOk(await pushAll(booking, plan, sheetId, tab, kocs), 'Đẩy Sheet');
  for (const k of kocs) brandFill(sheetId, tab, handleOf(k), 'Brand duyệt', 'Yes');
  assertOk(await pull(booking, plan, sheetId, tab), 'Kéo Sheet');
  const cur = await itemsByHandle(booking, plan.id);
  const confirmed = cur.items.map(i => (columnOf(i) === 'NEGOTIATING' ? moveItem(i, 'CONFIRMED', booking.name).item || i : i));
  const saved = await api.putListing(booking, plan.id, cur.revision, confirmed);
  assertOk(saved, 'Chốt KOC');
  const board = await api.deals(booking, plan.id);
  const codes: string[] = (board.body.data.deals as PlanDeal[]).map(d => d.code);
  const fresh = (saved.body.items as KocListingItem[])
    .filter(i => columnOf(i) === 'CONFIRMED' && kocs.some(k => handleOf(k) === i.kocHandle.replace(/^@/, '').toLowerCase()))
    .map(item => {
      const d = createDeal({ item, planId: plan.id, month: plan.month, actor: booking.name, existingCodes: codes, pic: booking.name });
      codes.push(d.code);
      return d;
    });
  const put = await api.putDeals(booking, plan.id, board.body.revision, { ...board.body.data, deals: [...board.body.data.deals, ...fresh] });
  assertOk(put, 'Tạo Deal');
  return { board: put.body.data as DealBoardData, revision: put.body.revision as number };
}

/** Sửa một Job của deal rồi lưu bằng người dùng chỉ định. */
export async function saveJob(actor: UserProfile, planId: string, dealId: string, patch: (j: PlanDeal['jobs'][number]) => PlanDeal['jobs'][number]) {
  const board = await api.deals(actor, planId);
  assertOk(board, 'Đọc bảng Deal');
  const data = board.body.data as DealBoardData;
  const next = { ...data, deals: data.deals.map(d => (d.id === dealId ? { ...d, jobs: d.jobs.map((j, i) => (i === 0 ? patch(j) : j)) } : d)) };
  return api.putDeals(actor, planId, board.body.revision, next);
}

// ───────────────────────── Hợp đồng ─────────────────────────
export async function filledValues(templateId: string) {
  const { template } = await loadTemplate(templateId);
  const values: Record<string, string> = {};
  for (const f of uniqueFields(template)) if (f.required) values[f.key] = f.source === 'partyName' ? 'NGUYỄN VĂN E2E' : `Giá trị E2E ${f.key.slice(0, 20)}`;
  return values;
}
export async function createContract(templateId: string, extra: Record<string, unknown>) {
  return api.contract('contract-demo-owner', { action: 'CREATE', title: `${templateId} E2E`, brand: 'Rejuran', partner: 'NGUYỄN VĂN E2E', templateId, values: await filledValues(templateId), hasCustomTerms: false, ...extra });
}
/** Gửi duyệt → duyệt theo thứ tự người duyệt → ký số hoàn tất. */
export async function approveAndSign(record: ContractRecord, reviewers: string[] = ['contract-demo-finance'], sign = true): Promise<ContractRecord> {
  let rec = record;
  const run = async (actorId: string, body: Record<string, unknown>) => {
    const r = await api.contract(actorId, { id: rec.id, revision: rec.revision, ...body });
    assertOk(r, `${body.action} bởi ${actorId}`);
    rec = r.body.record;
  };
  await run('contract-demo-owner', { action: 'SUBMIT', reviewers, requireLegal: reviewers.includes('contract-demo-legal') });
  for (const id of reviewers) await run(id, { action: 'DECIDE', decision: 'APPROVED', note: 'Duyệt E2E' });
  if (sign) for (const a of ['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_NEXT']) await run('contract-demo-sign', { action: a });
  return rec;
}
