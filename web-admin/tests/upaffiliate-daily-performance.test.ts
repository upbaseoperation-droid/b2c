import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWindowPerformance,
  mergeDailyRows,
  normalizeDailyRow,
  pullRangeForAirDate,
  videoIdFromAirLink,
  type DailyVideoPerformanceRow,
} from '../src/lib/upaffiliateDailyPerformance';
import { sanitizeDealBoard } from '../src/lib/dealBoardRules';

const VID = '7412345678901234567';
const day = (d: string, gmv: number, orders = 1, views = 100): DailyVideoPerformanceRow => ({ date: d, videoId: VID, gmv, orders, views });

test('Cộng daily theo mốc tính từ ngày air (ngày air là ngày thứ 1)', () => {
  const rows = [
    day('2026-09-30', 999), // trước ngày air — bỏ
    day('2026-10-01', 100),
    day('2026-10-14', 200), // ngày thứ 14 — thuộc D14
    day('2026-10-15', 300), // ngày thứ 15 — chỉ thuộc D30/D60
    day('2026-10-30', 400), // ngày thứ 30
    day('2026-10-31', 500), // ngày thứ 31 — chỉ D60
  ];
  const w = computeWindowPerformance(rows, '2026-10-01', '2026-12-31');
  assert.equal(w.d14.gmv, 300);
  assert.equal(w.d14.orders, 2);
  assert.equal(w.d30.gmv, 1000);
  assert.equal(w.d60.gmv, 1500);
  assert.equal(w.d60.views, 500);
  assert.deepEqual([w.d14.daysInWindow, w.d30.daysInWindow, w.d60.daysInWindow], [14, 30, 60]);
  assert.equal(w.d30.daysCovered, 4);
});

test('Mốc chưa trôi hết chỉ đếm tới hôm nay; mốc chưa có dữ liệu là null, không phải 0', () => {
  const w = computeWindowPerformance([day('2026-10-02', 50, 0, 0)], '2026-10-01', '2026-10-10');
  assert.equal(w.d30.daysInWindow, 10);
  assert.equal(w.d30.daysCovered, 1);
  assert.equal(w.d30.orders, 0); // có dữ liệu, số thật bằng 0
  const empty = computeWindowPerformance([], '2026-10-01', '2026-10-10');
  assert.equal(empty.d14.gmv, null);
  assert.equal(empty.d14.daysCovered, 0);
});

test('Kéo lại cùng ngày thì ghi đè, không cộng trùng', () => {
  const merged = mergeDailyRows([day('2026-10-01', 100), day('2026-10-02', 100)], [day('2026-10-02', 250), day('2026-10-03', 10)]);
  assert.deepEqual(merged.map(r => [r.date, r.gmv]), [['2026-10-01', 100], ['2026-10-02', 250], ['2026-10-03', 10]]);
});

test('Chuẩn hóa dòng API và lấy Video ID từ link air', () => {
  assert.deepEqual(normalizeDailyRow({ stat_date: '2026-10-05', video_id: VID, gmv: '1,200,000', order_count: 3, video_views: 5000 }), {
    date: '2026-10-05', videoId: VID, views: 5000, orders: 3, gmv: 1_200_000,
  });
  assert.equal(normalizeDailyRow({ date: '2026-10-05', video_id: 'abc' }), null);
  assert.equal(videoIdFromAirLink(`https://www.tiktok.com/@koc/video/${VID}?lang=vi`), VID);
  assert.equal(videoIdFromAirLink('https://vt.tiktok.com/ZSabc/'), '');
});

test('Khoảng kéo dữ liệu: từ ngày air tới hết D60 hoặc hôm nay', () => {
  assert.deepEqual(pullRangeForAirDate('2026-10-01', '2026-10-20'), { from: '2026-10-01', to: '2026-10-20' });
  assert.deepEqual(pullRangeForAirDate('2026-08-01', '2026-12-01'), { from: '2026-08-01', to: '2026-09-29' });
  assert.equal(pullRangeForAirDate('2026-11-01', '2026-10-20'), null);
});

test('Máy chủ giữ độ phủ daily khi lưu Deal board', () => {
  const board = sanitizeDealBoard({
    deals: [{ id: 'd1', kocHandle: 'koc', jobs: [{ id: 'j1', performance: { d14: { views: 1, orders: 1, gmv: 1, daysCovered: 5, daysInWindow: 14 } } }] }],
  } as never);
  const p = board.deals[0].jobs[0].performance;
  assert.equal(p.d14.daysCovered, 5);
  assert.equal(p.d14.daysInWindow, 14);
  assert.equal(p.d30.daysInWindow, undefined);
});
