// Kiểm thử xuyên suốt luồng nghiệp vụ Booking B2C trên API thật (dữ liệu tạm, Google Sheet giả lập):
// Plan tổng 4.1 → Phân rã tuần / theo nhân sự → Gửi & duyệt 2 cấp → Tìm KOC → HĐ nguyên tắc → Listing
// → Đẩy Google Sheet → Brand duyệt trên Sheet → Kéo kết quả → Chốt → Tạo Deal/Job → Phụ lục SOW → Giai đoạn 2 → Chặn thanh toán.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

import { POST as monthlyPlansPost, GET as monthlyPlansGet } from '../src/app/api/monthly-plans/route';
import { PUT as monthlyPlanPut } from '../src/app/api/monthly-plans/[id]/route';
import { GET as kocsGet } from '../src/app/api/kocs/route';
import { GET as listingGet, PUT as listingPut } from '../src/app/api/listing-board/route';
import { GET as pushSheetGet, POST as pushSheetPost } from '../src/app/api/booking-list/push-sheet/route';
import { POST as pullSheetPost } from '../src/app/api/booking-list/pull-sheet/route';
import { GET as dealGet, PUT as dealPut } from '../src/app/api/deal-board/route';
import { POST as contractPost } from '../src/app/api/contracts/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS, INITIAL_DEALS } from '../src/lib/mockData';
import { readMasterCatalog } from '../src/lib/server/masterCatalogStore';
import { checkBreakdownForSubmit, distributeReference41ToWeeks } from '../src/lib/planBreakdownRules';
import { evaluateAndRankKocs } from '../src/lib/kocRecommendationEngine';
import { UPBASE_FULL_KOC_MASTER } from '../src/lib/kocMasterDataset';
import { createListingItem, columnOf, moveItem } from '../src/lib/listingBoardRules';
import { BOOKING_LIST_COLUMNS, buildBookingListRowsFromListingItems } from '../src/lib/bookingList';
import { createDeal, createDealBlocker, type DealBoardData, type PlanDeal } from '../src/lib/dealBoardRules';
import { loadTemplate } from '../src/lib/contracts/templates';
import { uniqueFields } from '../src/components/contracts/contractUi';
import type { ContractRecord } from '../src/lib/contracts/types';
import type { InputPlanBreakdownState, KocItem, KocListingItem, StorePortfolioItem, UserProfile } from '../src/lib/types';

const ORIGIN = 'http://localhost:3000';
const MONTH = '2026/12';
const STORE_ID = 'store-b2c-57-rejuran-tiktok-e2e-o';
const SHEET_ID = 'FAKE_SHEET_E2E_REJURAN';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`;
const TAB = 'T12/2026';

// ───────────────────────── Google Sheets giả lập (chặn mọi lời gọi ra ngoài) ─────────────────────────
type Tab = { sheetId: number; values: string[][] };
const fakeSheet = { title: 'Rejuran Booking E2E', tabs: new Map<string, Tab>() };
const outbound: string[] = [];

const colIndex = (letters: string) => letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
function parseA1(a1: string): { tab: string; row: number; col: number } {
  const m = decodeURIComponent(a1).match(/^'?(.*?)'?!([A-Z]+)(\d*)/);
  if (!m) throw new Error(`A1 lạ: ${a1}`);
  return { tab: m[1].replace(/''/g, "'"), col: colIndex(m[2]), row: m[3] ? Number(m[3]) - 1 : 0 };
}
function writeRange(range: string, values: unknown[][]) {
  const { tab, row, col } = parseA1(range);
  const t = fakeSheet.tabs.get(tab);
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
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
  if (url.startsWith(base)) {
    const rest = url.slice(base.length);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (rest.startsWith('?')) {
      return json({
        properties: { title: fakeSheet.title },
        sheets: [...fakeSheet.tabs.entries()].map(([title, t]) => ({ properties: { sheetId: t.sheetId, title, gridProperties: { rowCount: 1000, columnCount: 60 }, hidden: false } })),
      });
    }
    if (rest === ':batchUpdate') {
      const replies = (body.requests || []).map((r: { addSheet?: { properties: { title: string } } }) => {
        if (r.addSheet) {
          const sheetId = fakeSheet.tabs.size + 100;
          fakeSheet.tabs.set(r.addSheet.properties.title, { sheetId, values: [] });
          return { addSheet: { properties: { sheetId, title: r.addSheet.properties.title, gridProperties: { rowCount: 1000, columnCount: 26 } } } };
        }
        return {};
      });
      return json({ replies });
    }
    if (rest === '/values:batchUpdate') {
      for (const d of body.data || []) writeRange(d.range, d.values);
      return json({ totalUpdatedCells: 1 });
    }
    if (rest.startsWith('/values/')) {
      const range = rest.slice('/values/'.length).split('?')[0];
      if (method === 'PUT') {
        writeRange(range, body.values);
        return json({});
      }
      const { tab } = parseA1(range);
      const t = fakeSheet.tabs.get(tab);
      return t ? json({ range, values: t.values }) : json({ error: 'not found' }, 404);
    }
  }
  outbound.push(`${method} ${url}`);
  return json({ error: 'Bị chặn trong kiểm thử E2E' }, 503);
}) as typeof fetch;

/** Brand điền một ô trên Sheet theo tên cột và ID kênh. */
function brandFill(handle: string, column: string, value: string) {
  const t = fakeSheet.tabs.get(TAB)!;
  const headerIdx = t.values.findIndex(r => r.includes('ID kênh'));
  const header = t.values[headerIdx];
  const keyCol = header.indexOf('ID kênh');
  const col = header.indexOf(column);
  assert.ok(col >= 0, `Sheet thiếu cột "${column}"`);
  const row = t.values.findIndex((r, i) => i > headerIdx && (r[keyCol] || '').replace(/^@/, '').toLowerCase() === handle.toLowerCase());
  assert.ok(row > headerIdx, `Sheet không có dòng của @${handle}`);
  while (t.values[row].length <= col) t.values[row].push('');
  t.values[row][col] = value;
}

// ───────────────────────── Tiện ích gọi API ─────────────────────────
function req(url: string, method: string, actor: UserProfile | null, body?: unknown) {
  const headers: Record<string, string> = { origin: ORIGIN };
  if (actor) headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken(actor)}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(ORIGIN + url, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
async function call(res: Response | Promise<Response>) {
  const r = await res;
  const text = await r.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}
const contractActor = (id: string): UserProfile => ({
  id, name: id, email: `${id}@upbase.vn`, avatar: 'KT', role: 'BOOKING_MEMBER', roleTitle: 'Kiểm thử E2E', loginProvider: 'SANDBOX',
} as UserProfile);
const user = (id: string) => {
  const u = USERS.find(x => x.id === id);
  assert.ok(u, `Không có người dùng ${id}`);
  return u!;
};

test('Luồng nghiệp vụ đầy đủ: Plan tổng → Phân rã → Duyệt → Tìm KOC → HĐNT → Listing → Google Sheet → Brand duyệt → Deal → Phụ lục SOW', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'b2c-full-flow-'));
  const env = { ...process.env };
  process.env.SHARED_DATA_DIR = path.join(dataDir, 'shared');
  process.env.CONTRACT_DATA_DIR = path.join(dataDir, 'contracts');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'e2e-bot@fake-project.iam.gserviceaccount.com';
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_CREDENTIALS', 'DATABASE_URL']) delete process.env[k];

  const director = user('user-yen-nhi');
  const booking = user('user-thanh-hai');
  const leader = user('user-ngoc-tam');

  const { data: catalog } = await readMasterCatalog();
  const store = catalog.stores.find(s => s.id === STORE_ID) as StorePortfolioItem;
  assert.ok(store, 'Không tìm thấy gian Rejuran trong Dữ liệu gốc');
  const storeStaff = new Set(Object.keys(store.staffCodes || {}));
  const outsider = USERS.find(u => u.role === 'BOOKING_MEMBER' && !storeStaff.has(u.name.trim().toLowerCase()))!;
  assert.ok(outsider, 'Cần một Booking không thuộc gian để thử chặn quyền');

  let plan!: InputPlanBreakdownState;
  let planRevision = 0;
  let pickedKocs: KocItem[] = [];
  let hdnt!: ContractRecord;
  let deals: PlanDeal[] = [];

  try {
    await t.test('1. Plan tổng (4.1): Giám đốc tạo kế hoạch tháng của gian; Booking không tự tạo được', async () => {
      const base: InputPlanBreakdownState = {
        id: `PO-E2E-${Date.now()}`,
        title: store.storeName,
        brandName: store.brandName,
        storeId: store.id,
        storeName: store.storeName,
        month: MONTH,
        week: 'W49',
        pic: booking.name,
        totalTargetBudget: 120_000_000,
        totalTargetContents: 24,
        targetGmv: 900_000_000,
        cancellationRate: 8,
        budgetAffiliate: 120_000_000,
        status: 'DRAFT',
        items: [],
        reference41: {
          month: MONTH, importedAt: new Date().toISOString(), importedBy: director.name, isGrowthLocked: true, growthLockLabel: 'Đã chốt',
          videoAff: 24, foc: 0, cast: 24, affCostGross: 114_048_000, affCostNet: 96_000_000,
          selfVideos: 0, selfCostGross: 0, selfCostNet: 0, liveSessions: 0, liveCostGross: 0, liveCostNet: 0,
          tiers: { KL1: 8, KL2: 8, KL3: 6, KL4: 2 },
        },
      };
      const denied = await call(monthlyPlansPost(req('/api/monthly-plans', 'POST', outsider, { plan: base })));
      assert.equal(denied.status, 403, `Nhân sự ngoài gian tạo kế hoạch phải bị chặn, nhận ${denied.status}: ${JSON.stringify(denied.body)}`);

      const created = await call(monthlyPlansPost(req('/api/monthly-plans', 'POST', director, { plan: base })));
      assert.equal(created.status, 201, JSON.stringify(created.body));
      plan = created.body.plan;
      planRevision = created.body.revision;
      assert.equal(plan.storeId, STORE_ID);

      const dup = await call(monthlyPlansPost(req('/api/monthly-plans', 'POST', booking, { plan: { ...base, id: `${base.id}-DUP` } })));
      assert.equal(dup.status, 409, 'Một gian chỉ có một kế hoạch mỗi tháng');

      const listed = await call(monthlyPlansGet(req('/api/monthly-plans', 'GET', booking)));
      assert.ok(listed.body.plans.some((p: { plan: InputPlanBreakdownState }) => p.plan.id === plan.id), 'Booking chính phải thấy kế hoạch gian mình');
    });

    await t.test('2. Phân tách plan: rải 4.1 theo tuần, lát cắt theo nhân sự, chặn gửi duyệt khi 4.1 chưa chốt', async () => {
      const { weeklyBreakdown, items } = distributeReference41ToWeeks(plan, 'EVEN');
      assert.ok(weeklyBreakdown.length >= 4, 'Tháng phải có ít nhất 4 tuần');
      const qty = weeklyBreakdown.reduce((s, w) => s + Object.values(w.tiers).reduce((x, v) => x + (v?.qty || 0), 0), 0);
      assert.equal(qty, 24, `Tổng số video phân rã phải khớp 4.1 (24), thực tế ${qty}`);
      plan = {
        ...plan,
        weeklyBreakdown,
        items,
        staffWeeklySlices: [{ staffName: booking.name, roleLabel: 'Booking chính', rowCount: weeklyBreakdown.length, weeklyBreakdown }],
      };
      const gate = checkBreakdownForSubmit(plan);
      assert.ok(gate.canSubmit, gate.reason);
      assert.equal(checkBreakdownForSubmit({ ...plan, reference41: { ...plan.reference41!, isGrowthLocked: false } }).canSubmit, false);

      const saved = await call(monthlyPlanPut(req(`/api/monthly-plans/${plan.id}`, 'PUT', booking, { plan, expectedRevision: planRevision }), { params: Promise.resolve({ id: plan.id }) }));
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      plan = saved.body.plan;
      planRevision = saved.body.revision;
    });

    await t.test('3. Duyệt 2 cấp: Booking gửi → không vượt cấp → Leader sơ duyệt → Giám đốc duyệt', async () => {
      const put = (actor: UserProfile, next: InputPlanBreakdownState) =>
        call(monthlyPlanPut(req(`/api/monthly-plans/${plan.id}`, 'PUT', actor, { plan: next, expectedRevision: planRevision }), { params: Promise.resolve({ id: plan.id }) }));

      const skip = await put(booking, { ...plan, status: 'PENDING_APPROVAL' });
      assert.ok([400, 403].includes(skip.status), `Gian có Leader: Booking gửi thẳng Giám đốc phải bị chặn, nhận ${skip.status}`);

      const submitted = await put(booking, { ...plan, status: 'PENDING_PRE_APPROVAL' });
      assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
      plan = submitted.body.plan; planRevision = submitted.body.revision;

      const bookingSelfPre = await put(booking, { ...plan, status: 'PENDING_APPROVAL' });
      assert.equal(bookingSelfPre.status, 403, 'Booking không được tự sơ duyệt');

      const pre = await put(leader, { ...plan, status: 'PENDING_APPROVAL', leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' });
      assert.equal(pre.status, 200, JSON.stringify(pre.body));
      plan = pre.body.plan; planRevision = pre.body.revision;

      const leaderFinal = await put(leader, { ...plan, status: 'APPROVED' });
      assert.equal(leaderFinal.status, 403, `Leader không được duyệt cấp Giám đốc, nhận ${leaderFinal.status}`);

      const approved = await put(director, { ...plan, status: 'APPROVED' });
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
      plan = approved.body.plan; planRevision = approved.body.revision;
      assert.equal(plan.status, 'APPROVED');
    });

    await t.test('4. Tìm kiếm KOC: danh bạ nội bộ, chặn tài khoản đối tác, xếp hạng đề xuất cho gian', async () => {
      const dir = await call(kocsGet(req('/api/kocs', 'GET', booking)));
      assert.equal(dir.status, 200);
      const partner = { ...booking, id: 'partner-brand-e2e', role: 'BRAND_PARTNER', partnerType: 'BRAND' } as UserProfile;
      const blocked = await call(kocsGet(req('/api/kocs', 'GET', partner)));
      assert.equal(blocked.status, 403, 'Tài khoản Brand không được tải danh bạ KOC');

      const pool = UPBASE_FULL_KOC_MASTER.filter(k => k.channelId && (k.rateCardVideo || 0) > 0).slice(0, 400);
      const ranked = evaluateAndRankKocs({ store, kocs: pool, deals: INITIAL_DEALS, activePlan: plan, currentUserName: booking.name } as never);
      assert.ok(ranked.length >= 3, 'Phải đề xuất được ít nhất 3 KOC');
      for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].matchPercent >= ranked[i].matchPercent, 'Danh sách phải xếp giảm dần theo điểm');
      const byId = new Map(pool.map(k => [k.id, k]));
      pickedKocs = ranked.map(r => byId.get((r as { koc?: KocItem; kocId?: string }).koc?.id || (r as { kocId?: string }).kocId || '')).filter((k): k is KocItem => Boolean(k)).slice(0, 3);
      assert.equal(pickedKocs.length, 3, 'Không ánh xạ được KOC đề xuất về danh bạ');
    });

    await t.test('5. Ký Hợp đồng nguyên tắc (HĐNT) với KOC #1: tạo → Kế toán duyệt → ký số hoàn tất', async () => {
      const koc = pickedKocs[0];
      const { template } = await loadTemplate('IND-HDNT');
      const values: Record<string, string> = {};
      for (const f of uniqueFields(template)) if (f.required) values[f.key] = f.source === 'partyName' ? 'NGUYỄN VĂN E2E' : `Giá trị E2E ${f.key.slice(0, 20)}`;
      const created = await call(contractPost(req('/api/contracts', 'POST', contractActor('contract-demo-owner'), {
        action: 'CREATE', title: `HĐNT · ${koc.stageName}`, brand: store.brandName, partner: 'NGUYỄN VĂN E2E', templateId: 'IND-HDNT', values, kocId: koc.id, hasCustomTerms: false,
      })));
      assert.equal(created.status, 200, JSON.stringify(created.body));
      hdnt = created.body.record;

      const submit = await call(contractPost(req('/api/contracts', 'POST', contractActor('contract-demo-owner'), { id: hdnt.id, revision: hdnt.revision, action: 'SUBMIT', reviewers: ['contract-demo-finance'], requireLegal: false })));
      assert.equal(submit.status, 200, JSON.stringify(submit.body));
      hdnt = submit.body.record;

      const selfApprove = await call(contractPost(req('/api/contracts', 'POST', contractActor('contract-demo-owner'), { id: hdnt.id, revision: hdnt.revision, action: 'DECIDE', decision: 'APPROVED', note: 'Tự duyệt' })));
      assert.equal(selfApprove.status >= 400, true, 'Người lập không được tự duyệt');

      const approve = await call(contractPost(req('/api/contracts', 'POST', contractActor('contract-demo-finance'), { id: hdnt.id, revision: hdnt.revision, action: 'DECIDE', decision: 'APPROVED', note: 'E2E duyệt' })));
      assert.equal(approve.status, 200, JSON.stringify(approve.body));
      hdnt = approve.body.record;
      for (const a of ['DEMO_SIGN_START', 'DEMO_SIGN_NEXT', 'DEMO_SIGN_NEXT']) {
        const s = await call(contractPost(req('/api/contracts', 'POST', contractActor('contract-demo-sign'), { id: hdnt.id, revision: hdnt.revision, action: a })));
        assert.equal(s.status, 200, JSON.stringify(s.body));
        hdnt = s.body.record;
      }
      assert.equal(hdnt.signing.at(-1)?.status, 'COMPLETED');
    });

    await t.test('6. Listing: Booking đưa 3 KOC vào bảng điều phối (Nháp)', async () => {
      const cur = await call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      assert.equal(cur.status, 200, JSON.stringify(cur.body));
      const items = pickedKocs.map(k => createListingItem({ plan, grade: (k.salaryGrade as never) || 'KL2', handle: k.channelId, koc: k, actorId: booking.id, actorName: booking.name }));
      items.forEach(i => (i.assignedStaffName = booking.name));
      const saved = await call(listingPut(req('/api/listing-board', 'PUT', booking, { planId: plan.id, revision: cur.body.revision, items: [...cur.body.items, ...items] })));
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      assert.equal(saved.body.items.filter((i: KocListingItem) => columnOf(i) === 'DRAFT').length, 3);

      const stale = await call(listingPut(req('/api/listing-board', 'PUT', booking, { planId: plan.id, revision: cur.body.revision, items })));
      assert.equal(stale.status, 409, 'Lưu bằng revision cũ phải báo xung đột');
    });

    await t.test('7. Kết nối Google Sheet: trạng thái kết nối, xem trước (dryRun) rồi đẩy KOC lên Sheet của Brand', async () => {
      const status = await call(pushSheetGet(req(`/api/booking-list/push-sheet?sheetUrl=${encodeURIComponent(SHEET_URL)}`, 'GET', booking)));
      assert.equal(status.status, 200, JSON.stringify(status.body));
      assert.equal(status.body.configured, true);

      const board = await call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      const rows = buildBookingListRowsFromListingItems(plan, board.body.items, [], pickedKocs);
      const payload = { planId: plan.id, sheetUrl: SHEET_URL, tab: TAB, columns: [...BOOKING_LIST_COLUMNS], rows };

      const preview = await call(pushSheetPost(req('/api/booking-list/push-sheet', 'POST', booking, { ...payload, dryRun: true })));
      assert.equal(preview.status, 200, JSON.stringify(preview.body));
      assert.equal(fakeSheet.tabs.size, 0, 'dryRun không được tạo tab / ghi Sheet');

      const pushed = await call(pushSheetPost(req('/api/booking-list/push-sheet', 'POST', booking, payload)));
      assert.equal(pushed.status, 200, JSON.stringify(pushed.body));
      assert.equal(pushed.body.added, 3, JSON.stringify(pushed.body));
      const tab = fakeSheet.tabs.get(TAB);
      assert.ok(tab, 'Phải tạo tab tháng trên Sheet');
      assert.ok(tab!.values.some(r => r.includes('ID kênh')), 'Sheet phải có dòng tiêu đề');

      const again = await call(pushSheetPost(req('/api/booking-list/push-sheet', 'POST', booking, payload)));
      assert.equal(again.body.added, 0, 'Đẩy lại không được nhân đôi dòng');

      const after = await call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      assert.equal(after.body.items.filter((i: KocListingItem) => columnOf(i) === 'WAIT_BRAND').length, 3, 'KOC đã gửi phải chuyển "Chờ Brand duyệt"');
    });

    await t.test('8. Brand duyệt trên Sheet → kéo kết quả (so sánh trước rồi ghi)', async () => {
      const [k1, k2, k3] = pickedKocs.map(k => k.channelId.replace(/^@/, ''));
      brandFill(k1, 'Brand duyệt', 'Yes');
      brandFill(k2, 'Brand duyệt', 'Yes');
      brandFill(k3, 'Brand duyệt', 'No');
      brandFill(k3, 'Lý do Brand từ chối', 'Kênh lệch tệp khách');

      const dry = await call(pullSheetPost(req('/api/booking-list/pull-sheet', 'POST', booking, { planId: plan.id, sheetUrl: SHEET_URL, tab: TAB, dryRun: true })));
      assert.equal(dry.status, 200, JSON.stringify(dry.body));
      assert.ok(dry.body.changes.length >= 3, 'Bản so sánh phải liệt kê thay đổi');
      const untouched = await call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      assert.equal(untouched.body.items.filter((i: KocListingItem) => i.brandApprovalStatus === 'BRAND_APPROVED').length, 0, 'dryRun không được ghi');

      const pulled = await call(pullSheetPost(req('/api/booking-list/pull-sheet', 'POST', booking, { planId: plan.id, sheetUrl: SHEET_URL, tab: TAB })));
      assert.equal(pulled.status, 200, JSON.stringify(pulled.body));
      assert.equal(pulled.body.approved, 2, JSON.stringify(pulled.body));
      assert.equal(pulled.body.rejected, 1);
      assert.equal(pulled.body.rejectedDetails[0].reason, 'Kênh lệch tệp khách');
      assert.equal(pulled.body.imported, 0, 'Không được nhập trùng KOC đã có');
    });

    await t.test('9. Chốt KOC đã duyệt và tạo Deal/Job; chặn tạo Deal cho KOC bị từ chối hoặc tạo trùng', async () => {
      const cur = await call(listingGet(req(`/api/listing-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      const items: KocListingItem[] = cur.body.items;
      const approved = items.filter(i => columnOf(i) === 'NEGOTIATING');
      const rejected = items.filter(i => columnOf(i) === 'DROPPED');
      assert.equal(approved.length, 2);
      assert.equal(rejected.length, 1);
      assert.ok(createDealBlocker(rejected[0], undefined, []), 'KOC Brand từ chối không được tạo Deal');

      const confirmed = items.map(i => (columnOf(i) === 'NEGOTIATING' ? moveItem(i, 'CONFIRMED', booking.name).item || i : i));
      const saved = await call(listingPut(req('/api/listing-board', 'PUT', booking, { planId: plan.id, revision: cur.body.revision, items: confirmed })));
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      const finals: KocListingItem[] = saved.body.items.filter((i: KocListingItem) => columnOf(i) === 'CONFIRMED');
      assert.equal(finals.length, 2, 'Phải có 2 KOC ở cột Đã chốt');

      const board = await call(dealGet(req(`/api/deal-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      assert.equal(board.status, 200, JSON.stringify(board.body));
      const codes: string[] = [];
      deals = finals.map(item => {
        assert.equal(createDealBlocker(item, undefined, deals), '', 'KOC đã chốt phải tạo được Deal');
        const d = createDeal({ item, planId: plan.id, month: MONTH, actor: booking.name, existingCodes: codes, pic: booking.name });
        codes.push(d.code);
        return d;
      });
      assert.ok(createDealBlocker(finals[0], undefined, deals), 'Không được tạo Deal lần 2 cho cùng KOC');

      const put = await call(dealPut(req('/api/deal-board', 'PUT', booking, { planId: plan.id, revision: board.body.revision, data: { deals } })));
      assert.equal(put.status, 200, JSON.stringify(put.body));
      deals = put.body.data.deals;
      assert.equal(deals.length, 2);

      const dup = await call(dealPut(req('/api/deal-board', 'PUT', booking, { planId: plan.id, revision: put.body.revision, data: { deals: [...deals, { ...deals[0], id: 'DL-dup' }] } })));
      assert.ok(dup.status >= 400 && /Deal/.test(dup.body.error), `Deal trùng cho cùng KOC phải bị chặn: ${dup.status} ${JSON.stringify(dup.body)}`);
    });

    await t.test('10. Phụ lục SOW gắn HĐNT, tự đồng bộ số phụ lục / trạng thái ký về Job', async () => {
      const deal = deals.find(d => d.kocHandle.toLowerCase() === pickedKocs[0].channelId.replace(/^@/, '').toLowerCase()) || deals[0];
      const job = deal.jobs[0];
      const { template } = await loadTemplate('IND-SOW');
      const values: Record<string, string> = {};
      for (const f of uniqueFields(template)) if (f.required) values[f.key] = f.source === 'partyName' ? 'NGUYỄN VĂN E2E' : `Giá trị E2E ${f.key.slice(0, 20)}`;
      const owner = contractActor('contract-demo-owner');

      const created = await call(contractPost(req('/api/contracts', 'POST', owner, {
        action: 'CREATE', title: `Phụ lục SOW · ${job.code}`, brand: store.brandName, partner: 'NGUYỄN VĂN E2E', templateId: 'IND-SOW', parentId: hdnt.id, values, kocId: pickedKocs[0].id, dealCode: job.code, dealId: `PJ-${job.id}`,
      })));
      assert.equal(created.status, 200, JSON.stringify(created.body));
      let sow: ContractRecord = created.body.record;
      assert.equal(sow.parentId, hdnt.id);

      const wrongKoc = await call(contractPost(req('/api/contracts', 'POST', owner, {
        action: 'CREATE', title: 'SOW sai KOC', brand: store.brandName, partner: 'X', templateId: 'IND-SOW', parentId: hdnt.id, values, kocId: 'koc-khac', dealCode: 'X',
      })));
      assert.equal(wrongKoc.status, 400, 'Phụ lục phải cùng KOC với HĐNT gốc');

      let board = await call(dealGet(req(`/api/deal-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      let syncedJob = board.body.data.deals.flatMap((d: PlanDeal) => d.jobs).find((j: { id: string }) => j.id === job.id);
      assert.equal(syncedJob.sowContractId, sow.id, 'Job phải gắn mã hồ sơ SOW');
      assert.ok(syncedJob.appendixNo, 'Job phải nhận số phụ lục');

      for (const [actor, body] of [
        [owner, { action: 'SUBMIT', reviewers: ['contract-demo-finance'], requireLegal: false }],
        [contractActor('contract-demo-finance'), { action: 'DECIDE', decision: 'APPROVED', note: 'E2E duyệt SOW' }],
        [contractActor('contract-demo-sign'), { action: 'DEMO_SIGN_START' }],
        [contractActor('contract-demo-sign'), { action: 'DEMO_SIGN_NEXT' }],
        [contractActor('contract-demo-sign'), { action: 'DEMO_SIGN_NEXT' }],
      ] as const) {
        const r = await call(contractPost(req('/api/contracts', 'POST', actor, { id: sow.id, revision: sow.revision, ...body })));
        assert.equal(r.status, 200, `${body.action}: ${JSON.stringify(r.body)}`);
        sow = r.body.record;
      }
      board = await call(dealGet(req(`/api/deal-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      syncedJob = board.body.data.deals.flatMap((d: PlanDeal) => d.jobs).find((j: { id: string }) => j.id === job.id);
      assert.equal(syncedJob.sowSigned, true, 'Ký xong phụ lục phải đánh dấu Job đã ký SOW');
      assert.equal(syncedJob.financeReviewStatus, 'APPROVED');
      assert.ok(syncedJob.appendixUrl, 'Job phải có link phụ lục đã ký');
    });

    await t.test('11. Giai đoạn 2 qua Sheet: Brand duyệt kịch bản phải chờ B2C duyệt nội bộ vòng 1', async () => {
      const handle = deals[0].kocHandle;
      brandFill(handle, 'Link kịch bản', 'https://docs.google.com/document/d/script-e2e');
      brandFill(handle, 'Brand duyệt kịch bản', 'Yes');
      const pulled = await call(pullSheetPost(req('/api/booking-list/pull-sheet', 'POST', booking, { planId: plan.id, sheetUrl: SHEET_URL, tab: TAB })));
      assert.equal(pulled.status, 200, JSON.stringify(pulled.body));
      const board = await call(dealGet(req(`/api/deal-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      const job = board.body.data.deals.find((d: PlanDeal) => d.id === deals[0].id).jobs[0];
      assert.equal(job.script.scriptUrl, 'https://docs.google.com/document/d/script-e2e', 'Link kịch bản từ Sheet phải về Job');
      assert.notEqual(job.script.status, 'APPROVED', `Kịch bản chưa qua duyệt nội bộ vòng 1 nhưng đã thành "Brand duyệt" (internalScriptAuditStatus=${job.script.internalScriptAuditStatus || 'trống'})`);
    });

    await t.test('12. Chặn đề nghị thanh toán khi Job chưa nghiệm thu', async () => {
      const board = await call(dealGet(req(`/api/deal-board?planId=${encodeURIComponent(plan.id)}`, 'GET', booking)));
      const data: DealBoardData = board.body.data;
      const d0 = data.deals[0];
      const next = { ...data, deals: [{ ...d0, jobs: [{ ...d0.jobs[0], payment: { ...d0.jobs[0].payment, status: 'REQUESTED' } }, ...d0.jobs.slice(1)] }, ...data.deals.slice(1)] };
      const r = await call(dealPut(req('/api/deal-board', 'PUT', booking, { planId: plan.id, revision: board.body.revision, data: next })));
      assert.ok(r.status >= 400, `Đề nghị thanh toán khi chưa nghiệm thu phải bị chặn, nhận ${r.status}`);
    });

    await t.test('13. Không có lời gọi mạng ra ngoài ngoài Google Sheet giả lập', () => {
      assert.deepEqual(outbound, []);
    });
  } finally {
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k];
    Object.assign(process.env, env);
    await rm(dataDir, { recursive: true, force: true });
  }
});
