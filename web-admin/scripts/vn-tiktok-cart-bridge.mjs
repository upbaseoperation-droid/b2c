import dns from 'node:dns';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const execFileAsync = promisify(execFile);

const WEBHOOK_URL =
  process.env.ZALO_WEBHOOK_URL ||
  'https://b2c-theta.vercel.app/api/integrations/zalo-bot/webhook';
const SECRET_TOKEN = process.env.ZALO_BOT_SECRET_TOKEN || 'hDHDHT7wyBCafz3--U';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';

let wafCookieCache = '';
let wafCookieExpireAt = 0;

function extractCookies(res) {
  const getSetCookie = res.headers?.getSetCookie;
  const raw =
    typeof getSetCookie === 'function'
      ? getSetCookie.call(res.headers)
      : [res.headers.get('set-cookie')].filter(Boolean);
  return raw
    .map((c) => String(c || '').split(';')[0]?.trim())
    .filter(Boolean);
}

function solveTikTokWafHtml(html) {
  const wciMatch =
    html.match(/<p id="wci" class="([^"]*)"/) || html.match(/id="cs"\s+value="([^"]+)"/);
  const csMatch =
    html.match(/<p id="cs" class="([^"]*)"/) || html.match(/id="c"\s+value="([^"]+)"/);
  if (!wciMatch || !csMatch || !csMatch[1]) return null;

  try {
    const wci = wciMatch[1] || '_wafchallengeid';
    const cs = csMatch[1];
    const rci = html.match(/<p id="rci" class="([^"]*)"/)?.[1] || '';
    const rs = html.match(/<p id="rs" class="([^"]*)"/)?.[1] || '';
    const rsId = html.match(/<p id="rs_id" class="([^"]*)"/)?.[1] || '';

    const c = JSON.parse(Buffer.from(cs, 'base64').toString('utf8'));
    const prefix = Buffer.from(c.v.a, 'base64');
    const expectHex = Buffer.from(c.v.c, 'base64').toString('hex');

    for (let i = 0; i <= 1_000_000; i++) {
      const hashHex = crypto.createHash('sha256').update(prefix).update(String(i)).digest('hex');
      if (hashHex === expectHex) {
        c.d = Buffer.from(String(i), 'utf8').toString('base64');
        const jsv = Buffer.from(JSON.stringify(c), 'utf8').toString('base64');
        const cookies = [`${wci}=${jsv}`];
        if (rci && rs) cookies.push(`${rci}=${rs}`);
        if (rsId) cookies.push(`waforigin_id=${rsId}`);
        return cookies.join('; ');
      }
    }
  } catch {
    return null;
  }
  return null;
}

function parseCartProductsFromItemStruct(itemStruct) {
  const anchors = Array.isArray(itemStruct?.anchors) ? itemStruct.anchors : [];
  const products = [];
  const seenIds = new Set();

  for (const anchor of anchors) {
    const rawKeyword = String(anchor?.keyword || '').trim();
    const extraStr = String(anchor?.extra || '');
    let entries = [];
    if (extraStr) {
      try {
        const parsed = JSON.parse(extraStr);
        if (Array.isArray(parsed)) entries = parsed;
        else if (parsed && typeof parsed === 'object') entries = [parsed];
      } catch {
        // fallback regex below
      }
    }

    for (const entry of entries) {
      let inner = {};
      const rawEntryExtra = typeof entry?.extra === 'string' ? entry.extra : '';
      if (rawEntryExtra) {
        try {
          inner = JSON.parse(rawEntryExtra);
        } catch {}
      } else if (entry?.extra && typeof entry.extra === 'object') {
        inner = entry.extra;
      }
      const regexProductId =
        (rawEntryExtra
          ? rawEntryExtra.match(/"product_id"\s*:\s*"?(\d{15,22})"?/)?.[1] ||
            rawEntryExtra.match(/"material_id"\s*:\s*"?(\d{15,22})"?/)?.[1]
          : '') || '';
      const regexSellerId =
        (rawEntryExtra ? rawEntryExtra.match(/"seller_id"\s*:\s*"?(\d{15,22})"?/)?.[1] : '') ||
        '';
      const productId = String(
        regexProductId || entry?.id || entry?.product_id || inner?.product_id || ''
      ).trim();
      if (!/^\d{15,22}$/.test(productId) || seenIds.has(productId)) continue;
      seenIds.add(productId);
      const title = String(
        inner?.title || entry?.title || entry?.keyword || rawKeyword || `Sản phẩm #${productId}`
      ).trim();
      const sellerId =
        String(regexSellerId || inner?.seller_id || inner?.kol_id || '').trim() || undefined;
      const seoUrl = String(inner?.seo_url || entry?.seo_url || '').trim();
      const productUrl =
        seoUrl && /^https?:\/\//i.test(seoUrl)
          ? seoUrl
          : `https://shop.tiktok.com/view/product/${productId}`;
      products.push({
        productId,
        title,
        productUrl,
        sellerId,
        source: 'TikTok Shop Anchor (VN Bridge)',
      });
    }

    if (products.length === 0 && extraStr) {
      const idMatches = extraStr.matchAll(/"product_id"\s*:\s*"?(\d{15,22})"?/g);
      for (const m of idMatches) {
        const pid = m[1];
        if (!seenIds.has(pid)) {
          seenIds.add(pid);
          products.push({
            productId: pid,
            title: rawKeyword || `Sản phẩm #${pid}`,
            productUrl: `https://shop.tiktok.com/view/product/${pid}`,
            source: 'TikTok Shop Anchor (VN Bridge)',
          });
        }
      }
    }
  }

  return products;
}

async function extractFfmpegFrameBase64(videoUrl, sec = 3.5) {
  try {
    const tikwmRes = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (!tikwmRes.ok) return undefined;
    const j = await tikwmRes.json();
    const playUrl = j?.data?.play || j?.data?.wmplay;
    if (!playUrl || !playUrl.startsWith('http')) return undefined;
    const tmpFile = path.join(
      os.tmpdir(),
      `tt_bridge_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    );
    await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        String(sec),
        '-i',
        playUrl,
        '-frames:v',
        '1',
        '-vf',
        'scale=540:960:force_original_aspect_ratio=increase,crop=540:960',
        '-q:v',
        '4',
        '-f',
        'image2',
        '-y',
        tmpFile,
      ],
      { timeout: 7000 }
    );
    const buf = fs.readFileSync(tmpFile);
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
    if (buf.length > 1000) {
      return buf.toString('base64');
    }
  } catch {
    // ignore ffmpeg error
  }
  return undefined;
}

export async function inspectTikTokCartFromVietnam(
  videoUrl,
  fallbackVideoId,
  captureSec = 3.5,
  options = { includeFrame: true }
) {
  const baseVnCookie =
    'store-country-code=vn; store-country-code-src=uid; tt-target-idc=alisg; tiktok_webapp_theme=light; ttwid=1%7C15aHll9t7AZRwvrCsSx2d3XrbTNJaMExICHWcNaR9pc%7C1793208695%7Cde66e96e64ad0a808b69318737111a0003e074067cb4c1a67a054344e7c0988c';
  let cookieHeader =
    Date.now() < wafCookieExpireAt && wafCookieCache ? wafCookieCache : baseVnCookie;

  for (let attempt = 0; attempt < 3; attempt++) {
    const targetUrl = videoUrl.includes('?') ? videoUrl : `${videoUrl}?lang=vi-VN`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        Cookie: cookieHeader,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const cookies = extractCookies(res);

    const solved = solveTikTokWafHtml(html);
    if (solved) {
      cookieHeader = [baseVnCookie, ...cookies, solved].filter(Boolean).join('; ');
      wafCookieCache = cookieHeader;
      wafCookieExpireAt = Date.now() + 15 * 60 * 1000;
      continue;
    }

    const scriptMatch = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!scriptMatch) break;

    const json = JSON.parse(scriptMatch[1]);
    const scope = json?.__DEFAULT_SCOPE__ || {};
    const itemStruct =
      (scope['webapp.video-detail'] || scope['webapp.reflow.video.detail'])?.itemInfo
        ?.itemStruct;
    if (!itemStruct) break;

    const videoId = String(itemStruct.id || fallbackVideoId || '').trim();
    const cartProducts = parseCartProductsFromItemStruct(itemStruct);
    const first = cartProducts[0];
    const resolvedUrl = res.url ? res.url.split('?')[0] : videoUrl;
    const frameJpegBase64 = options?.includeFrame
      ? await extractFfmpegFrameBase64(resolvedUrl, captureSec)
      : undefined;
    return {
      videoId,
      videoUrl: resolvedUrl,
      cartProducts,
      cartAnchorTitle: first?.title,
      cartAnchorUrl: first?.productUrl,
      cartProductId: first?.productId,
      cartSellerId: first?.sellerId,
      frameJpegBase64,
      updatedAt: new Date().toISOString(),
    };
  }
  return null;
}

async function pushResolvedItemsToWebhook(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-api-secret-token': SECRET_TOKEN,
    },
    body: JSON.stringify({
      vnBridgeResolve: true,
      items,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

async function pollOnce() {
  try {
    const pollRes = await fetch(`${WEBHOOK_URL}?vnBridgePoll=1`, {
      headers: {
        'x-bot-api-secret-token': SECRET_TOKEN,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!pollRes.ok) return;
    const data = await pollRes.json();
    const pendingList = Array.isArray(data?.pending) ? data.pending : [];
    if (pendingList.length === 0) return;

    for (const item of pendingList) {
      if (!item?.videoUrl || !item?.videoId) continue;
      console.log(`[VN-Bridge] Inspecting pending TikTok video ${item.videoId}: ${item.videoUrl}`);
      // Bước 1: Giải mã nhanh giỏ hàng (<500ms) và đẩy ngay lên Vercel để kịp thời gian chờ 4.5s
      const fastInspected = await inspectTikTokCartFromVietnam(
        item.videoUrl,
        item.videoId,
        3.5,
        { includeFrame: false }
      ).catch((err) => {
        console.error(`[VN-Bridge] Error inspecting ${item.videoId}:`, err?.message || err);
        return null;
      });

      if (fastInspected && fastInspected.cartProducts.length > 0) {
        console.log(
          `[VN-Bridge] Fast-resolved ${fastInspected.cartProducts.length} product(s) for ${item.videoId}: ${fastInspected.cartAnchorTitle}`
        );
        await pushResolvedItemsToWebhook([fastInspected]);
      }

      // Bước 2: Cắt khung hình ffmpeg chất lượng cao và cập nhật bổ sung
      const frameBase64 = await extractFfmpegFrameBase64(
        fastInspected?.videoUrl || item.videoUrl,
        3.5
      ).catch(() => undefined);
      if (frameBase64 && fastInspected) {
        fastInspected.frameJpegBase64 = frameBase64;
        fastInspected.updatedAt = new Date().toISOString();
        await pushResolvedItemsToWebhook([fastInspected]);
        console.log(`[VN-Bridge] Uploaded ffmpeg frame for ${item.videoId}`);
      }
    }
  } catch {
    // Ignore transient network errors
  }
}

async function bootstrap() {
  console.log(`[VN-Bridge] Starting Vietnam TikTok Shop Cart Bridge -> ${WEBHOOK_URL}`);
  const seeds = [];
  const seed1 = await inspectTikTokCartFromVietnam(
    'https://www.tiktok.com/@maiphuong_oplung/video/7700246764321803541',
    '7700246764321803541',
    4.6
  ).catch(() => null);
  if (seed1) seeds.push(seed1);

  const seed2 = await inspectTikTokCartFromVietnam(
    'https://www.tiktok.com/@xbarbershoptrauquy/video/7701192255171775762',
    '7701192255171775762',
    3.7
  ).catch(() => null);
  if (seed2) seeds.push(seed2);

  if (seeds.length > 0) {
    console.log(`[VN-Bridge] Seeded ${seeds.length} videos with cart products + ffmpeg frames`);
    await pushResolvedItemsToWebhook(seeds);
  }

  while (true) {
    await pollOnce();
    await new Promise((r) => setTimeout(r, 700));
  }
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  bootstrap();
}
