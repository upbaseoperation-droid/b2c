/**
 * Chạy trọn luồng Booking qua API của app, đóng vai từng vị trí:
 * Listing → Brand duyệt → chốt → Deal → Pháp chế → Air / nghiệm thu → đối soát → đề nghị thanh toán → đã chi,
 * kèm các chặn quyền theo người sở hữu, vai trò và vị trí (Kênh tự sở hữu, Plan / KV), bàn giao người cùng làm.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import type { UserProfile, KocListingItem } from '../src/lib/types';
import type { DealBoardData, PlanDeal } from '../src/lib/dealBoardRules';

let routes: {
  md: typeof import('../src/app/api/master-data/route');
  plans: typeof import('../src/app/api/monthly-plans/route');
  plan: typeof import('../src/app/api/monthly-plans/[id]/route');
  listing: typeof import('../src/app/api/listing-board/route');
  deal: typeof import('../src/app/api/deal-board/route');
  content: typeof import('../src/app/api/content-plan/route');
};
let encode: (u: UserProfile) => string;
let cookieName: string;
let createDealJob: typeof import('../src/lib/dealBoardRules').createDealJob;

const u = (id: string, name: string, role: UserProfile['role']): UserProfile => ({ id, name, email: `${id}@e2e.invalid`, role, roleTitle: '', avatar: '' });
const ADMIN = u('e2e-admin', 'E2E Giám Đốc', 'ADMIN');
const MAIN = u('e2e-main', 'E2E Booking Chính', 'BOOKING_MEMBER');
const CO = u('e2e-co', 'E2E Booking Cùng Làm', 'BOOKING_MEMBER');
const LEADER = u('e2e-leader', 'E2E Leader Gian', 'LEADER');
const LEGAL = u('e2e-legal', 'E2E Pháp Chế', 'LEGAL');
const FINANCE = u('e2e-finance', 'E2E Kế Toán', 'FINANCE');
const ACCOUNT = u('e2e-account', 'E2E Account PIC', 'BRAND_MEMBER');
const PLANKV = u('e2e-plan', 'E2E PIC Plan', 'CONTENT_MEMBER');
const SELF = u('e2e-self', 'E2E PIC Kênh', 'CONTENT_MEMBER');

const ORIGIN = 'http://localhost:3000';
function req(url: string, method: string, actor: UserProfile, body?: unknown) {
  return new NextRequest(`${ORIGIN}${url}`, {
    method,
    headers: { cookie: `${cookieName}=${encode(actor)}`, origin: ORIGIN, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
const json = async (r: Response) => ({ status: r.status, body: await r.json().catch(() => null) });

let storeId = '';
let storeName = '';
let brandName = '';
const planId = `PLAN-E2E-RBAC-${Date.now()}`;

before(async () => {
  process.env.SHARED_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'rbac-e2e-'));
  routes = {
    md: await import('../src/app/api/master-data/route'),
    plans: await import('../src/app/api/monthly-plans/route'),
    plan: await import('../src/app/api/monthly-plans/[id]/route'),
    listing: await import('../src/app/api/listing-board/route'),
    deal: await import('../src/app/api/deal-board/route'),
    content: await import('../src/app/api/content-plan/route'),
  };
  const auth = await import('../src/lib/larkAuth');
  encode = auth.encodeSessionToken;
  cookieName = auth.SESSION_COOKIE_NAME;
  createDealJob = (await import('../src/lib/dealBoardRules')).createDealJob;
});

after(async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    const prisma = (await import('../src/lib/prisma')).default;
    await prisma.monthlyPlan.deleteMany({ where: { id: planId } });
  } catch {
    /* môi trường không có database */
  }
});

async function dealBoard(actor: UserProfile) {
  return json(await routes.deal.GET(req(`/api/deal-board?planId=${encodeURIComponent(planId)}`, 'GET', actor)));
}
async function putDeals(actor: UserProfile, edit: (deals: PlanDeal[]) => PlanDeal[]) {
  const cur = await dealBoard(ADMIN);
  const data: DealBoardData = { ...cur.body.data, deals: edit(cur.body.data.deals) };
  return json(await routes.deal.PUT(req('/api/deal-board', 'PUT', actor, { planId, revision: cur.body.revision, data })));
}
async function listing(actor: UserProfile) {
  return json(await routes.listing.GET(req(`/api/listing-board?planId=${encodeURIComponent(planId)}`, 'GET', actor)));
}
async function putListing(actor: UserProfile, edit: (items: KocListingItem[]) => KocListingItem[]) {
  const cur = await listing(ADMIN);
  return json(await routes.listing.PUT(req('/api/listing-board', 'PUT', actor, { planId, revision: cur.body.revision, items: edit(cur.body.items) })));
}
const editJob = (dealId: string, f: (j: PlanDeal['jobs'][number]) => PlanDeal['jobs'][number]) => (deals: PlanDeal[]) =>
  deals.map(d => (d.id === dealId ? { ...d, jobs: d.jobs.map(f) } : d));

test('Luồng Booking E2E theo vị trí: Listing → Deal → duyệt → nghiệm thu → đối soát → thanh toán', async () => {
  // 1. Giám đốc đặt vị trí trên gian (Dữ liệu gốc) và PIC Plan cấp nhãn
  const catalog = await json(await routes.md.GET(req('/api/master-data', 'GET', ADMIN)));
  assert.equal(catalog.status, 200);
  const store = catalog.body.data.stores[0];
  storeId = store.id;
  storeName = store.storeName;
  brandName = store.brandName;
  const assign = await json(await routes.md.PATCH(req('/api/master-data', 'PATCH', ADMIN, {
    storeId,
    assignment: {
      primaryPic: MAIN.name, b2cOwnerName: MAIN.name, assignedStaff: MAIN.name, assignedPic: MAIN.name,
      b2cOwners: [MAIN.name, CO.name], assignedMembers: [MAIN.name, CO.name],
      bookingLeader: LEADER.name, hasBookingLeader: true, contentPic: SELF.name, accountOwnerName: ACCOUNT.name,
      backupOwnerName: null, isBackupActive: false,
    },
  })));
  assert.equal(assign.status, 200, JSON.stringify(assign.body));
  // Leader không được đổi Booking chính
  const leaderTry = await json(await routes.md.PATCH(req('/api/master-data', 'PATCH', LEADER, { storeId, assignment: { primaryPic: CO.name } })));
  assert.equal(leaderTry.status, 403);
  const cat2 = await json(await routes.md.GET(req('/api/master-data', 'GET', ADMIN)));
  const brands = cat2.body.data.brands.map((b: { name: string }) => (b.name === brandName ? { ...b, planStrategyPic: PLANKV.name } : b));
  const full = await json(await routes.md.GET(req('/api/master-data', 'GET', ADMIN)));
  const put = await json(await routes.md.PUT(req('/api/master-data', 'PUT', ADMIN, { revision: full.body.revision, data: { ...full.body.data, brands } })));
  assert.equal(put.status, 200, JSON.stringify(put.body));

  // 2. Kế hoạch tháng của gian; chỉ Booking chính sửa nội dung
  const created = await json(await routes.plans.POST(req('/api/monthly-plans', 'POST', ADMIN, {
    plan: { id: planId, title: 'E2E RBAC', brandName, storeId, storeName, month: '2026/12', status: 'DRAFT', items: [], totalTargetBudget: 50_000_000, totalTargetGmv: 0, totalTargetContents: 0, createdAt: '', updatedAt: '' },
  })));
  assert.ok([200, 201].includes(created.status), JSON.stringify(created.body));
  const stored = created.body.plan ? created.body : { plan: created.body, revision: 1 };
  const coSave = await json(await routes.plan.PUT(req(`/api/monthly-plans/${planId}`, 'PUT', CO, { plan: { ...stored.plan, title: 'sửa' }, expectedRevision: stored.revision }), { params: Promise.resolve({ id: planId }) }));
  assert.equal(coSave.status, 403, 'Booking cùng làm không sửa kế hoạch');
  const mainSave = await json(await routes.plan.PUT(req(`/api/monthly-plans/${planId}`, 'PUT', MAIN, { plan: { ...stored.plan, title: 'E2E RBAC (Booking chính sửa)' }, expectedRevision: stored.revision }), { params: Promise.resolve({ id: planId }) }));
  assert.equal(mainSave.status, 200, JSON.stringify(mainSave.body));

  // 3. Listing: người cùng làm thêm KOC → thành của mình; Brand duyệt phải có căn cứ
  const base = { kocName: 'KOC E2E', salaryGrade: 'KL3', proposedFee: 3_000_000, overallStatus: 'DRAFT', brandApprovalStatus: 'BRAND_PENDING', kocNegotiationStatus: 'NOT_CONTACTED', assignedStaffName: '', batchCycle: 'BATCH_10' };
  let r = await putListing(CO, items => [...items, { ...base, id: 'li-co', kocHandle: 'koc_e2e_co' } as unknown as KocListingItem]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.items.find((i: KocListingItem) => i.id === 'li-co').assignedStaffName, CO.name);
  r = await putListing(CO, items => items.map(i => (i.id === 'li-co' ? { ...i, overallStatus: 'SUBMITTED', brandApprovalStatus: 'BRAND_APPROVED' } : i)));
  assert.equal(r.status, 400, 'Tự đánh Brand duyệt khi không có căn cứ');
  r = await putListing(CO, items => items.map(i => (i.id === 'li-co' ? { ...i, overallStatus: 'SUBMITTED', brandApprovalStatus: 'BRAND_APPROVED', brandApprovedAt: '2026-11-25', brandApprovalEvidence: 'https://zalo/brand-ok' } : i)));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await putListing(CO, items => items.map(i => (i.id === 'li-co' ? { ...i, overallStatus: 'FINAL_APPROVED', kocNegotiationStatus: 'TERMS_AGREED', finalFee: 3_000_000 } : i)));
  assert.equal(r.status, 200, JSON.stringify(r.body));

  // 4. Deal: người cùng làm tạo deal của mình; Booking chính có deal riêng; không sửa chéo
  const newJob = (id: string, pic: string) => ({ ...createDealJob({ dealCode: id, existingJobs: [], pic }), id: `${id}-J1`, code: `${id}-J1`, videoFee: 3_000_000 });
  const mkDeal = (id: string, pic: string, listingItemId: string) =>
    ({ id, code: id, listingItemId, slotId: '', kocHandle: `koc_${id}`, kocName: id, grade: 'KL3', week: 'W1', pic, fee: 3_000_000, jobs: [newJob(id, pic)], createdAt: '', createdBy: pic, history: [] }) as unknown as PlanDeal;
  let d = await putDeals(CO, deals => [...deals, mkDeal('DCO', '', 'li-co')]);
  assert.equal(d.status, 200, JSON.stringify(d.body));
  assert.equal(d.body.data.deals.find((x: PlanDeal) => x.id === 'DCO').pic, CO.name);
  d = await putDeals(MAIN, deals => [...deals, mkDeal('DMAIN', MAIN.name, '')]);
  assert.equal(d.status, 200, JSON.stringify(d.body));
  d = await putDeals(CO, editJob('DMAIN', j => ({ ...j, deadline: '2026-12-20' })));
  assert.equal(d.status, 403, 'Người cùng làm không sửa deal của người khác');
  d = await putDeals(CO, deals => [...deals, mkDeal('DDUP', CO.name, 'li-co')]);
  assert.equal(d.status, 409, 'Một KOC trên List chỉ có một Deal');

  // 5. Pháp chế duyệt trên deal không phải của mình; Booking không tự duyệt
  d = await putDeals(CO, editJob('DCO', j => ({ ...j, legalReviewStatus: 'APPROVED' })));
  assert.equal(d.status, 403);
  d = await putDeals(LEGAL, editJob('DCO', j => ({ ...j, legalReviewStatus: 'APPROVED' })));
  assert.equal(d.status, 200, JSON.stringify(d.body));

  // 6. Air + nghiệm thu (có kết quả soát video), phụ lục
  d = await putDeals(CO, editJob('DCO', j => ({
    ...j, appendixNo: 'PL-E2E-01', appendixDate: '2026-12-01', airLink: 'https://www.tiktok.com/@koc_e2e_co/video/7400000000000000001', airedAt: '2026-12-05',
  })));
  assert.equal(d.status, 200, JSON.stringify(d.body));
  d = await putDeals(CO, editJob('DCO', j => ({ ...j, acceptance: { ...j.acceptance, status: 'PASSED', checks: [{ key: 'visible', label: 'Hiển thị', passed: true, detail: '' }] as never, checkedAt: '2026-12-06' } })));
  assert.equal(d.status, 200, JSON.stringify(d.body));

  // 7. Đối soát: Account PIC phần số liệu Brand, Kế toán phần chứng từ; Booking không tự đối soát
  d = await putDeals(MAIN, editJob('DCO', j => ({ ...j, closingAudit: { accountStatus: 'PASSED', financeStatus: 'PENDING' } })));
  assert.equal(d.status, 403);
  d = await putDeals(ACCOUNT, editJob('DCO', j => ({ ...j, closingAudit: { accountStatus: 'PASSED', financeStatus: j.closingAudit?.financeStatus || 'PENDING' } })));
  assert.equal(d.status, 200, JSON.stringify(d.body));
  d = await putDeals(FINANCE, editJob('DCO', j => ({ ...j, closingAudit: { accountStatus: 'PASSED', financeStatus: 'PASSED' } })));
  assert.equal(d.status, 200, JSON.stringify(d.body));

  // 8. Đề nghị thanh toán: thiếu BBNT thì chặn; có BBNT thì được
  d = await putDeals(CO, editJob('DCO', j => ({ ...j, payment: { ...j.payment, status: 'REQUESTED', amount: 3_000_000 } })));
  assert.equal(d.status, 400, 'Chưa có BBNT đã ký');
  d = await putDeals(CO, editJob('DCO', j => ({ ...j, bbntUrl: 'https://drive/bbnt-e2e', payment: { ...j.payment, status: 'REQUESTED', amount: 3_000_000 } })));
  assert.equal(d.status, 200, JSON.stringify(d.body));

  // 9. Đã thanh toán: chỉ Kế toán
  d = await putDeals(CO, editJob('DCO', j => ({ ...j, payment: { ...j.payment, status: 'PAID' } })));
  assert.equal(d.status, 403);
  d = await putDeals(FINANCE, editJob('DCO', j => ({ ...j, payment: { ...j.payment, status: 'PAID', paidAt: '2026-12-15' } })));
  assert.equal(d.status, 200, JSON.stringify(d.body));

  // 10. PIC Kênh tự sở hữu không xem Listing / Deal; PIC Plan (cấp nhãn) xem được nhưng không sửa
  assert.equal((await dealBoard(SELF)).status, 403);
  assert.equal((await listing(SELF)).status, 403);
  assert.equal((await dealBoard(PLANKV)).status, 200);
  d = await putDeals(PLANKV, editJob('DMAIN', j => ({ ...j, deadline: '2026-12-21' })));
  assert.equal(d.status, 403);

  // 11. Kế hoạch content: PIC Kênh tự sở hữu chỉ dòng SELF
  const cp = await json(await routes.content.GET(req(`/api/content-plan?planId=${encodeURIComponent(planId)}`, 'GET', ADMIN)));
  const slotSelf = { id: 's-self', briefCode: 'BR-01', targetQty: 1, pillar: 'P01', angle: 'a', row: 'SELF' };
  let c = await json(await routes.content.PUT(req('/api/content-plan', 'PUT', SELF, { planId, revision: cp.body.revision, data: { slots: [...(cp.body.data?.slots || []), slotSelf] } })));
  assert.equal(c.status, 200, JSON.stringify(c.body));
  c = await json(await routes.content.PUT(req('/api/content-plan', 'PUT', SELF, { planId, revision: c.body.revision, data: { slots: [...c.body.data.slots, { ...slotSelf, id: 's-kl', row: 'KL1' }] } })));
  assert.equal(c.status, 403);

  // 12. Gỡ người cùng làm: deal chưa thanh toán của họ về Booking chính, deal đã chi giữ nguyên
  d = await putDeals(CO, deals => [...deals, mkDeal('DCO2', CO.name, '')]);
  assert.equal(d.status, 200, JSON.stringify(d.body));
  const removed = await json(await routes.md.PATCH(req('/api/master-data', 'PATCH', ADMIN, { storeId, assignment: { b2cOwners: [MAIN.name], assignedMembers: [MAIN.name] } })));
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal(removed.body.reassigned, 1);
  const finalBoard = await dealBoard(ADMIN);
  assert.equal(finalBoard.body.data.deals.find((x: PlanDeal) => x.id === 'DCO2').pic, MAIN.name);
  assert.equal(finalBoard.body.data.deals.find((x: PlanDeal) => x.id === 'DCO').pic, CO.name);

  // 13. Nhật ký phân công ghi lại các lần đổi
  const log = await json(await routes.md.GET(req(`/api/master-data?view=assignment-log&entityId=${encodeURIComponent(storeId)}`, 'GET', ADMIN)));
  assert.ok(log.body.entries.some((e: { field: string; to: string }) => e.field === 'bookingLeader' && e.to === LEADER.name));
  void storeName;
});
