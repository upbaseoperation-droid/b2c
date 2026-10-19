import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChecks, verdictOf } from '../src/core/checks.ts';
import { parseLink, splitLinks } from '../src/core/detect.ts';
import { extractHashtags, parseCompactNumber } from '../src/core/text.ts';

test('parseLink nhận diện link dài của 4 nền tảng', () => {
  assert.deepEqual(
    pick(parseLink('https://www.tiktok.com/@Dhnlie/video/7638191108970843412?is_from_webapp=1')),
    { platform: 'tiktok', contentId: '7638191108970843412', contentType: 'video', handle: 'dhnlie', isShortLink: false }
  );
  assert.deepEqual(pick(parseLink('instagram.com/reel/C9abcDEF123/?igsh=xyz')), {
    platform: 'instagram', contentId: 'C9abcDEF123', contentType: 'reel', handle: null, isShortLink: false,
  });
  assert.deepEqual(pick(parseLink('https://m.facebook.com/watch/?v=10153231379946729')), {
    platform: 'facebook', contentId: '10153231379946729', contentType: 'video', handle: null, isShortLink: false,
  });
  assert.deepEqual(pick(parseLink('https://www.facebook.com/hanoibeauty/videos/10153231379946729/')), {
    platform: 'facebook', contentId: '10153231379946729', contentType: 'video', handle: 'hanoibeauty', isShortLink: false,
  });
  assert.deepEqual(pick(parseLink('https://sv.shopee.vn/share-video/riOOXtljCQDsUBBjAAAAAA?smtt=1')), {
    platform: 'shopee', contentId: 'riOOXtljCQDsUBBjAAAAAA', contentType: 'video', handle: null, isShortLink: false,
  });
});

test('parseLink đánh dấu link rút gọn và từ chối nền tảng lạ', () => {
  assert.equal(parseLink('https://vt.tiktok.com/ZSabc123/')?.isShortLink, true);
  assert.equal(parseLink('https://fb.watch/abc123/')?.isShortLink, true);
  assert.equal(parseLink('https://www.facebook.com/share/r/1AbCdE/')?.isShortLink, true);
  assert.equal(parseLink('https://shp.ee/3rte2fmk')?.isShortLink, true);
  assert.equal(parseLink('https://youtube.com/watch?v=1'), null);
  assert.equal(parseLink('không phải link'), null);
});

test('splitLinks tách theo dòng/dấu phẩy và bỏ trùng', () => {
  assert.deepEqual(splitLinks('a.com/1\n a.com/2, a.com/1'), ['a.com/1', 'a.com/2']);
});

test('parseCompactNumber', () => {
  assert.equal(parseCompactNumber('2.8M'), 2_800_000);
  assert.equal(parseCompactNumber('1,2 N'), 1_200);
  assert.equal(parseCompactNumber('12,345'), 12_345);
  assert.equal(parseCompactNumber('abc'), null);
});

test('extractHashtags giữ dấu tiếng Việt', () => {
  assert.deepEqual(extractHashtags('Review #KemChốngNắng #larocheposay #kemchốngnắng'), ['#kemchốngnắng', '#larocheposay']);
});

const liveBase = {
  platform: 'tiktok' as const,
  contentId: '7638191108970843412',
  status: 'LIVE' as const,
  statusDetail: null,
  author: { handle: 'dhnlie', name: 'augustine', profileUrl: null, followers: null },
  publishedAt: '2026-05-10T09:22:43.000Z',
  caption: 'kem chống nắng La Roche-Posay #LaRochePosayBrandFanDay',
  hashtags: ['#larocheposaybrandfanday'],
  metrics: { views: 1_000_000, likes: 1, comments: 1, shares: 1, saves: 1 },
  hasProductLink: true,
};

test('buildChecks: đạt đủ điều kiện → PASS', () => {
  const checks = buildChecks(liveBase, {
    handle: '@DHNLIE',
    airFrom: '2026-05-01',
    airTo: '2026-05-31',
    requiredHashtags: ['larocheposaybrandfanday'],
    requiredKeywords: ['la roche-posay'],
    requireProductLink: true,
    minViews: 10_000,
  });
  assert.equal(verdictOf(checks), 'PASS');
});

test('buildChecks: sai kênh và ngoài lịch air → FAIL', () => {
  const checks = buildChecks(liveBase, { handle: 'kocb', airTo: '2026-05-05' });
  assert.equal(checks.find((c) => c.key === 'channel')?.status, 'FAIL');
  assert.equal(checks.find((c) => c.key === 'air_date')?.status, 'FAIL');
  assert.equal(verdictOf(checks), 'FAIL');
});

test('buildChecks: nền tảng thiếu dữ liệu → REVIEW, không đánh FAIL', () => {
  const checks = buildChecks(
    { ...liveBase, platform: 'shopee', publishedAt: null, hasProductLink: null, metrics: { ...liveBase.metrics, views: null } },
    { airFrom: '2026-05-01', requireProductLink: true, minViews: 1000 }
  );
  assert.deepEqual(
    checks.filter((c) => c.status !== 'PASS').map((c) => [c.key, c.status]),
    [['air_date', 'WARN'], ['product_link', 'WARN'], ['min_views', 'WARN']]
  );
  assert.equal(verdictOf(checks), 'REVIEW');
});

test('buildChecks: bài bị chặn → REVIEW; bài đã xoá → FAIL', () => {
  assert.equal(verdictOf(buildChecks({ ...liveBase, status: 'BLOCKED' })), 'REVIEW');
  assert.equal(verdictOf(buildChecks({ ...liveBase, status: 'UNAVAILABLE' })), 'FAIL');
});

function pick(link: ReturnType<typeof parseLink>) {
  if (!link) return null;
  const { platform, contentId, contentType, handle, isShortLink } = link;
  return { platform, contentId, contentType, handle, isShortLink };
}
