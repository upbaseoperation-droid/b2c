// Luồng Listing & kết nối Google Sheet: phân quyền Listing, căn cứ Brand duyệt, đẩy / kéo Sheet và các tình huống Brand thao tác trên Sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET as pushSheetGet } from '../src/app/api/booking-list/push-sheet/route';
import {
  addToListing, api, approvedPlan, assertBlocked, assertOk, booking, brandAddRow, brandFill, brandPartner, call, coBooking, director,
  draftPlan, fakeSheets, handleOf, itemsByHandle, outbound, outsider, pull, pushAll, req, setGoogleConfigured, sheetOf, sheetUrl,
  storeById, STORE_SHOPEE, STORE_TIKTOK, tabTable, takeKocs,
} from './helpers/fullFlowHarness';
import { columnOf, moveItem } from '../src/lib/listingBoardRules';
import { BOOKING_LIST_COLUMNS } from '../src/lib/bookingList';
import type { KocListingItem } from '../src/lib/types';

let monthSeq = 0;
const nextMonth = () => `2029/${String(++monthSeq).padStart(2, '0')}`;
const TAB = 'Listing';
let sheetSeq = 0;
const newSheet = () => {
  const id = `1FakeSheetListingE2E${String(++sheetSeq).padStart(4, "0")}abcdefghij`;
  sheetUrl(id);
  return id;
};
async function planWithPushed(n: number) {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const kocs = takeKocs(n);
  assertOk(await addToListing(booking, plan, kocs), 'Thêm Listing');
  const sheetId = newSheet();
  assertOk(await pushAll(booking, plan, sheetId, TAB, kocs), 'Đẩy Sheet');
  return { plan, kocs, sheetId };
}
/** Giờ Việt Nam dạng dd/MM/yyyy HH:mm, lệch `offsetMin` phút so với hiện tại. */
const vnTime = (offsetMin: number) => {
  const d = new Date(Date.now() + offsetMin * 60_000 + 7 * 3_600_000);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

// ───────────── Phân quyền Listing ─────────────
test('LS-01 Người ngoài gian và tài khoản Brand không đọc được Listing của gian', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  assertBlocked(await api.listing(await outsider(store), plan.id), 'Người ngoài gian đọc Listing', undefined, 403);
  assertBlocked(await api.listing(brandPartner, plan.id), 'Tài khoản Brand đọc Listing nội bộ', undefined, 401);
});

test('LS-02 Booking cùng làm chỉ thêm KOC do mình phụ trách', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const [own, other] = takeKocs(2);
  assertOk(await addToListing(coBooking, plan, [own], coBooking.name), 'Booking cùng làm thêm KOC của mình');
  assertBlocked(await addToListing(coBooking, plan, [other], booking.name), 'Booking cùng làm thêm KOC giao cho Booking chính', /chính mình phụ trách/, 403);
});

test('LS-03 Booking cùng làm không sửa KOC của người khác và không đổi người phụ trách', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const [k] = takeKocs(1);
  assertOk(await addToListing(booking, plan, [k]), 'Booking chính thêm KOC');
  const cur = await itemsByHandle(coBooking, plan.id);
  const edit = cur.items.map(i => (i.kocHandle.toLowerCase().includes(handleOf(k)) ? { ...i, proposedFee: 1 } : i));
  assertBlocked(await api.putListing(coBooking, plan.id, cur.revision, edit), 'Sửa KOC của Booking chính', /phụ trách/, 403);
  const steal = cur.items.map(i => (i.kocHandle.toLowerCase().includes(handleOf(k)) ? { ...i, assignedStaffName: coBooking.name } : i));
  assertBlocked(await api.putListing(coBooking, plan.id, cur.revision, steal), 'Nhận KOC của người khác về mình', undefined, 403);
});

test('LS-04 Không tự đánh "Brand duyệt" trong app khi không có căn cứ; có bằng chứng thì được', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const [k] = takeKocs(1);
  assertOk(await addToListing(booking, plan, [k]), 'Thêm KOC');
  let cur = await itemsByHandle(booking, plan.id);
  const approve = (extra: Partial<KocListingItem>) =>
    cur.items.map(i => (i.kocHandle.toLowerCase().includes(handleOf(k)) ? { ...(moveItem(moveItem(i, 'WAIT_BRAND', booking.name).item!, 'NEGOTIATING', booking.name).item!), ...extra } : i));
  assertBlocked(await api.putListing(booking, plan.id, cur.revision, approve({})), 'Tự duyệt không căn cứ', /chưa có kết quả Brand duyệt/, 400);
  assertBlocked(await api.putListing(booking, plan.id, cur.revision, approve({ lastSheetDecision: 'APPROVED' })), 'Giả kết quả Sheet từ trình duyệt', /chưa có kết quả Brand duyệt/, 400);
  cur = await itemsByHandle(booking, plan.id);
  assertOk(await api.putListing(booking, plan.id, cur.revision, approve({ brandApprovalEvidence: 'https://chat.zalo.me/brand-ok.png' })), 'Duyệt kèm bằng chứng');
});

test('LS-05 KOC FOC 0đ chuyển sang Thương lượng không cần Brand duyệt', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const [k] = takeKocs(1);
  assertOk(await addToListing(booking, plan, [k], booking.name, 0), 'Thêm KOC FOC');
  const cur = await itemsByHandle(booking, plan.id);
  const next = cur.items.map(i => (i.kocHandle.toLowerCase().includes(handleOf(k)) ? moveItem(moveItem(i, 'WAIT_BRAND', booking.name).item!, 'NEGOTIATING', booking.name).item! : i));
  assertOk(await api.putListing(booking, plan.id, cur.revision, next), 'FOC sang Thương lượng');
});

test('LS-06 Cảnh báo KOC trùng ở gian khác cùng nhãn, cùng tháng', async () => {
  const month = nextMonth();
  const tiktok = await storeById(STORE_TIKTOK);
  const shopee = await storeById(STORE_SHOPEE);
  const { plan } = await approvedPlan(tiktok, month);
  const other = await api.createPlan(director, draftPlan(shopee, month));
  assertOk(other, 'Tạo kế hoạch gian Shopee');
  const [k] = takeKocs(1);
  assertOk(await addToListing(booking, plan, [k]), 'List ở TikTok');
  assertOk(await addToListing(director, other.body.plan, [k], director.name), 'List cùng KOC ở Shopee');
  const r = await api.duplicates(booking, plan.id);
  assertOk(r, 'Xem trùng');
  assert.ok(r.body.duplicates.some((d: { handle: string; storeName: string }) => d.handle === handleOf(k) && d.storeName === shopee.storeName), `Không cảnh báo trùng: ${JSON.stringify(r.body)}`);
});

// ───────────── Kết nối Google Sheet ─────────────
test('SH-01 Chưa cấu hình tài khoản dịch vụ Google: báo rõ, không ghi gì', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const kocs = takeKocs(1);
  assertOk(await addToListing(booking, plan, kocs), 'Thêm Listing');
  setGoogleConfigured(false);
  try {
    const st = await call(pushSheetGet(req('/api/booking-list/push-sheet', 'GET', booking)));
    assert.equal(st.body.configured, false);
    assertBlocked(await pushAll(booking, plan, newSheet(), TAB, kocs), 'Đẩy Sheet khi chưa cấu hình', undefined, 503);
    assertBlocked(await pull(booking, plan, newSheet(), TAB), 'Kéo Sheet khi chưa cấu hình', undefined, 503);
  } finally {
    setGoogleConfigured(true);
  }
});

test('SH-02 Link Sheet sai, Sheet chưa chia sẻ quyền, Sheet không tồn tại', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const kocs = takeKocs(1);
  assertOk(await addToListing(booking, plan, kocs), 'Thêm Listing');
  assertBlocked(await api.push(booking, { planId: plan.id, sheetUrl: 'https://example.com/khong-phai-sheet', tab: TAB, columns: [...BOOKING_LIST_COLUMNS], rows: [['x']] }), 'Link không phải Google Sheet', undefined, 400);
  const locked = newSheet();
  fakeSheets.get(locked)!.failWith = 403;
  assertBlocked(await pushAll(booking, plan, locked, TAB, kocs), 'Sheet chưa chia sẻ cho tài khoản dịch vụ', /chia sẻ/, 403);
  const missing = newSheet();
  fakeSheets.get(missing)!.failWith = 404;
  assertBlocked(await pull(booking, plan, missing, TAB), 'Sheet không tồn tại', /Không tìm thấy/, 404);
});

test('SH-03 Người ngoài gian / tài khoản Brand không đẩy được lên Sheet của gian', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const kocs = takeKocs(1);
  assertOk(await addToListing(booking, plan, kocs), 'Thêm Listing');
  const sheetId = newSheet();
  assertBlocked(await pushAll(await outsider(store), plan, sheetId, TAB, kocs), 'Người ngoài gian đẩy Sheet');
  assertBlocked(await pushAll(brandPartner, plan, sheetId, TAB, kocs), 'Tài khoản Brand đẩy Sheet', undefined, 401);
  assert.equal(sheetOf(sheetId).tabs.size, 0, 'Sheet không được bị ghi');
});

test('SH-04 CCCD và số tài khoản ngân hàng không bao giờ lên Sheet của Brand', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const sheetId = newSheet();
  const columns = ['ID kênh', 'Tên kênh', 'Số CCCD', 'Số tài khoản', 'Ngân hàng', 'Giá net video'];
  const rows = [['@ccc.e2e', 'KOC CCCD', '001201019876', '0123456789', 'Vietcombank', '3000000']];
  assertOk(await api.push(booking, { planId: plan.id, sheetUrl: sheetUrl(sheetId), tab: TAB, columns, rows }), 'Đẩy Sheet');
  const flat = JSON.stringify(sheetOf(sheetId).tabs.get(TAB)!.values);
  for (const secret of ['001201019876', '0123456789', 'Vietcombank', 'Số CCCD', 'Số tài khoản']) assert.ok(!flat.includes(secret), `Lộ "${secret}" lên Sheet Brand`);
});

test('SH-05 Kéo Sheet: sai tên tab (Sheet nhiều tab) báo không tìm thấy; tab thiếu cột ID kênh bị từ chối', async () => {
  const { plan, sheetId } = await planWithPushed(1);
  sheetOf(sheetId).tabs.set('Tab khác', { sheetId: 7, values: [['Tên kênh', 'Brand duyệt'], ['abc', 'Yes']] });
  assertBlocked(await pull(booking, plan, sheetId, 'Không có tab này'), 'Tab không tồn tại', /chưa có tab/, 404);
  assertBlocked(await pull(booking, plan, sheetId, 'Tab khác'), 'Tab thiếu cột ID kênh', /ID kênh/, 400);
});

test('SH-06 Đẩy lại sau khi Brand đã chọn: giữ nguyên lựa chọn của Brand, không nhân đôi dòng', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(2);
  brandFill(sheetId, TAB, handleOf(kocs[0]), 'Brand duyệt', 'Yes');
  brandFill(sheetId, TAB, handleOf(kocs[0]), 'Ghi chú Brand', 'Ưu tiên tuần 1');
  const before = tabTable(sheetId, TAB).tab.values.length;
  const r = await pushAll(booking, plan, sheetId, TAB, kocs);
  assertOk(r, 'Đẩy lại');
  const { tab, header } = tabTable(sheetId, TAB);
  assert.equal(tab.values.length, before, 'Số dòng thay đổi khi đẩy lại');
  const row = tab.values.find(x => x.some(c => c.replace(/^@/, '').toLowerCase() === handleOf(kocs[0])))!;
  assert.equal(row[header.indexOf('Brand duyệt')], 'Yes', 'Đẩy lại xóa mất lựa chọn của Brand');
  assert.equal(row[header.indexOf('Ghi chú Brand')], 'Ưu tiên tuần 1');
});

test('SH-07 Brand chọn "Cân nhắc": KOC vẫn chờ duyệt, ghi nhận phản hồi', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  brandFill(sheetId, TAB, handleOf(kocs[0]), 'Brand duyệt', 'Cân nhắc');
  brandFill(sheetId, TAB, handleOf(kocs[0]), 'Ghi chú Brand', 'Xin thêm số liệu GMV');
  const r = await pull(booking, plan, sheetId, TAB);
  assertOk(r, 'Kéo Sheet');
  assert.equal(r.body.considering, 1);
  const item = (await itemsByHandle(booking, plan.id)).map.get(handleOf(kocs[0]))!;
  assert.equal(columnOf(item), 'WAIT_BRAND');
  assert.match(item.brandFeedbackNote || '', /cân nhắc.*GMV/i);
});

test('SH-08 Brand đổi "No" thành "Yes": KOC được khôi phục và sang Thương lượng', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'No');
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo lần 1');
  assert.equal(columnOf((await itemsByHandle(booking, plan.id)).map.get(h)!), 'DROPPED');
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'Yes');
  const r = await pull(booking, plan, sheetId, TAB);
  assertOk(r, 'Kéo lần 2');
  assert.equal(r.body.reapproved, 1, JSON.stringify(r.body).slice(0, 300));
  assert.equal(columnOf((await itemsByHandle(booking, plan.id)).map.get(h)!), 'NEGOTIATING');
});

test('SH-09 Booking đưa KOC bị từ chối về lại trong app: kéo lại Sheet (vẫn "No") không làm rớt lần nữa', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'No');
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo lần 1');
  const cur = await itemsByHandle(booking, plan.id);
  const restored = cur.items.map(i => (i.kocHandle.toLowerCase().includes(h) ? moveItem(i, 'DRAFT', booking.name).item || i : i));
  assertOk(await api.putListing(booking, plan.id, cur.revision, restored), 'Đưa về Nháp');
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo lần 2');
  assert.notEqual(columnOf((await itemsByHandle(booking, plan.id)).map.get(h)!), 'DROPPED', 'KOC bị rớt lại dù Brand không đổi ý');
});

test('SH-10 Brand tự thêm KOC mới trên Sheet: nhập vào Listing, người phụ trách lạ thì giao Booking chính', async () => {
  const { plan, sheetId } = await planWithPushed(1);
  const [a, b] = takeKocs(2);
  brandAddRow(sheetId, TAB, { 'ID kênh': `@${handleOf(a)}`, 'Tên kênh': 'KOC Brand đề xuất', 'Giá net video': '2.500.000', 'PIC': 'Người lạ', 'Brand duyệt': 'Yes' });
  brandAddRow(sheetId, TAB, { 'ID kênh': `@${handleOf(b)}`, 'Tên kênh': 'KOC giao Quỳnh Nhi', 'Giá net video': '1tr', 'PIC': coBooking.name });
  const r = await pull(booking, plan, sheetId, TAB);
  assertOk(r, 'Kéo Sheet');
  assert.equal(r.body.imported, 2, JSON.stringify(r.body).slice(0, 300));
  const items = (await itemsByHandle(booking, plan.id)).map;
  assert.equal(items.get(handleOf(a))!.assignedStaffName, booking.name);
  assert.equal(columnOf(items.get(handleOf(a))!), 'NEGOTIATING');
  assert.equal((items.get(handleOf(a))!.finalFee ?? items.get(handleOf(a))!.proposedFee), 2_500_000);
  assert.equal(items.get(handleOf(b))!.assignedStaffName, coBooking.name);
  assert.equal((items.get(handleOf(b))!.finalFee ?? items.get(handleOf(b))!.proposedFee), 1_000_000);
});

test('SH-11 Brand sửa giá trên Sheet trước khi duyệt: cập nhật giá đề xuất; xem trước không ghi', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  brandFill(sheetId, TAB, h, 'Giá net video', '1.234.000');
  const dry = await pull(booking, plan, sheetId, TAB, true);
  assert.ok(dry.body.changes.some((c: { field: string; conflict?: string }) => c.field === 'Giá net video' && !c.conflict));
  assert.notEqual((await itemsByHandle(booking, plan.id)).map.get(h)!.proposedFee, 1_234_000, 'Xem trước đã ghi giá');
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo Sheet');
  assert.equal((await itemsByHandle(booking, plan.id)).map.get(h)!.proposedFee, 1_234_000);
});

test('SH-12 Brand sửa giá trên Sheet sau khi đã duyệt: báo mâu thuẫn, không ghi đè giá', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'Yes');
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo duyệt');
  const fee = (i: KocListingItem) => i.finalFee ?? i.proposedFee;
  const approvedFee = fee((await itemsByHandle(booking, plan.id)).map.get(h)!);
  brandFill(sheetId, TAB, h, 'Giá net video', '99.000.000');
  const r = await pull(booking, plan, sheetId, TAB);
  assertOk(r, 'Kéo lại');
  assert.ok(r.body.conflicts >= 1, 'Phải báo mâu thuẫn giá');
  assert.equal(fee((await itemsByHandle(booking, plan.id)).map.get(h)!), approvedFee, 'Giá đã duyệt bị Sheet ghi đè');
});

test('SH-13 Tăng giá sau khi Brand duyệt: về chờ duyệt lại; "Yes" cũ không tính; "Yes" mới (có giờ duyệt sau mốc tăng giá) mới được duyệt', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'Yes');
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo duyệt');
  const cur = await itemsByHandle(booking, plan.id);
  const raised = cur.items.map(i => (i.kocHandle.toLowerCase().includes(h) ? { ...i, proposedFee: (i.finalFee ?? i.proposedFee ?? 0) + 2_000_000, finalFee: undefined } : i));
  const saved = await api.putListing(booking, plan.id, cur.revision, raised);
  assertOk(saved, 'Tăng giá');
  const after = (saved.body.items as KocListingItem[]).find(i => i.kocHandle.toLowerCase().includes(h))!;
  assert.equal(after.brandApprovalStatus, 'BRAND_PENDING', 'Tăng giá phải về chờ Brand duyệt lại');
  assert.ok(after.brandRepricedAt);

  const stale = await pull(booking, plan, sheetId, TAB);
  assertOk(stale, 'Kéo khi Sheet còn "Yes" cũ');
  assert.ok(stale.body.changes.some((c: { conflict?: string }) => /tăng giá/.test(c.conflict || '')), 'Phải cảnh báo "Yes" cũ');
  assert.equal((await itemsByHandle(booking, plan.id)).map.get(h)!.brandApprovalStatus, 'BRAND_PENDING', '"Yes" cũ bị tính là duyệt giá mới');

  brandFill(sheetId, TAB, h, 'TG Brand duyệt', vnTime(5));
  assertOk(await pull(booking, plan, sheetId, TAB), 'Kéo sau khi Brand chọn lại');
  assert.equal((await itemsByHandle(booking, plan.id)).map.get(h)!.brandApprovalStatus, 'BRAND_APPROVED');
});

test('SH-14 Sheet có nhiều dòng cùng KOC với kết quả khác nhau: báo mâu thuẫn', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'Yes');
  brandAddRow(sheetId, TAB, { 'ID kênh': `@${h}`, 'Brand duyệt': 'No' });
  const r = await pull(booking, plan, sheetId, TAB, true);
  assertOk(r, 'So sánh');
  assert.ok(r.body.duplicateConflicts.includes(h), JSON.stringify(r.body.duplicateConflicts));
});

test('SH-15 ID kênh trên Sheet gõ dạng link TikTok / chữ hoa vẫn khớp đúng KOC', async () => {
  const { plan, kocs, sheetId } = await planWithPushed(1);
  const h = handleOf(kocs[0]);
  const { tab, header, headerIdx } = tabTable(sheetId, TAB);
  const key = header.indexOf('ID kênh');
  const row = tab.values.findIndex((r, i) => i > headerIdx && r[key].replace(/^@/, '').toLowerCase() === h);
  brandFill(sheetId, TAB, h, 'Brand duyệt', 'yes');
  tab.values[row][key] = `https://www.tiktok.com/@${h.toUpperCase()}?lang=vi`;
  const r = await pull(booking, plan, sheetId, TAB);
  assertOk(r, 'Kéo Sheet');
  assert.equal(r.body.imported, 0, 'Nhập trùng KOC do không khớp định dạng ID');
  assert.equal(r.body.approved, 1);
});

test('SH-16 Không có lời gọi mạng ra ngoài', () => {
  assert.deepEqual(outbound, []);
});
