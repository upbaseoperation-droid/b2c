import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFacebookHtml, parseFacebookOgTitle } from '../src/adapters/facebook.ts';
import { parseInstagramDescription } from '../src/adapters/instagram.ts';
import { parseShopeeVideoHtml } from '../src/adapters/shopee.ts';
import { solveTikTokWaf, tiktokIdToUnixSeconds } from '../src/adapters/tiktok.ts';
import { parseLink } from '../src/core/detect.ts';
import { readMeta } from '../src/core/text.ts';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('Facebook: bóc view, reactions, bình luận, ngày đăng, chủ trang', () => {
  const link = parseLink('https://www.facebook.com/facebook/videos/10153231379946729/')!;
  const result = parseFacebookHtml(fixture('facebook-video.html'), link, link.url);
  assert.equal(result.status, 'LIVE');
  assert.equal(result.contentId, '10153231379946729');
  assert.equal(result.metrics?.views, 2824200);
  assert.equal(result.metrics?.likes, 1350);
  assert.equal(result.metrics?.comments, 2787);
  assert.equal(result.publishedAt, '2014-12-05T08:00:02.000Z');
  assert.equal(result.author?.handle, 'facebook');
  assert.equal(result.caption, 'How to share with just friends.');
});

test('Facebook: og:title rút gọn', () => {
  const parsed = parseFacebookOgTitle('2.8M views · 1.3K reactions | Review kem chống nắng | Hà Linh Official');
  assert.equal(parsed.views, 2_800_000);
  assert.equal(parsed.reactions, 1_300);
  assert.equal(parsed.ownerName, 'Hà Linh Official');
});

test('Facebook: trang không có og:title → UNAVAILABLE', () => {
  const link = parseLink('https://www.facebook.com/reel/1083483413671196')!;
  const result = parseFacebookHtml('<html><head><title>Facebook</title></head></html>', link, link.url);
  assert.equal(result.status, 'UNAVAILABLE');
});

test('Instagram: bóc meta description', () => {
  const description = readMeta(fixture('instagram-post.html'), 'og:description')!;
  const parsed = parseInstagramDescription(description);
  assert.equal(parsed.likes, 60_000_000);
  assert.equal(parsed.comments, 4_000_000);
  assert.equal(parsed.handle, 'world_record_egg');
  assert.equal(parsed.publishedAt, '2019-01-04');
  assert.match(parsed.caption, /^Let’s set a world record/);
});

test('Shopee Video: bóc __NEXT_DATA__', () => {
  const link = parseLink('https://sv.shopee.com.br/share-video/riOOXtljCQDsUBBjAAAAAA')!;
  const result = parseShopeeVideoHtml(fixture('shopee-video.html'), link);
  assert.equal(result.status, 'LIVE');
  assert.equal(result.author?.handle, 'vaishop__');
  assert.equal(result.metrics?.likes, 1);
  assert.equal(result.metrics?.comments, 0);
  assert.equal(result.durationSeconds, 23);
});

test('Shopee Video: không có mediaInfo → UNAVAILABLE', () => {
  const link = parseLink('https://sv.shopee.vn/share-video/AAAA')!;
  const html = '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"mediaInfo":null}}}</script>';
  assert.equal(parseShopeeVideoHtml(html, link).status, 'UNAVAILABLE');
});

test('TikTok: video ID mã hoá thời điểm đăng', () => {
  assert.equal(tiktokIdToUnixSeconds('7638191108970843412'), 1778404952);
  assert.equal(tiktokIdToUnixSeconds('123'), null);
});

test('TikTok: trang không có thử thách WAF → không sinh cookie', () => {
  assert.equal(solveTikTokWaf('<html></html>'), null);
});
