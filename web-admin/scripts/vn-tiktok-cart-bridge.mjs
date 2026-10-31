import dns from 'node:dns';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const execFileAsync = promisify(execFile);

process.on('uncaughtException', (err) => {
  console.error('[VN-Bridge Error uncaughtException]:', err?.message || err);
});
process.on('unhandledRejection', (err) => {
  console.error('[VN-Bridge Error unhandledRejection]:', err?.message || err);
});

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

export async function extractFfmpegFrameBase64(videoUrl, sec = 3.5) {
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
    if (!scriptMatch) {
      wafCookieCache = '';
      wafCookieExpireAt = 0;
      cookieHeader = baseVnCookie;
      continue;
    }

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

const inFlightJobs = new Map();
const resolvedCartMemory = new Map();

async function processPendingItem(item) {
  if (!item?.videoUrl || !item?.videoId) return;
  const targetSec = Number(item.captureSec) > 0 ? Number(item.captureSec) : 3.5;
  const jobKey = `${item.videoId}:${targetSec.toFixed(1)}`;
  const now = Date.now();
  const prevStarted = inFlightJobs.get(jobKey);
  if (prevStarted && now - prevStarted < 25_000) {
    return;
  }
  inFlightJobs.set(jobKey, now);

  console.log(
    `[VN-Bridge] Inspecting pending TikTok video ${item.videoId}: ${item.videoUrl} (sec: ${targetSec})`
  );

  const cachedCart = resolvedCartMemory.get(item.videoId);
  const cartPromise = cachedCart
    ? Promise.resolve({ ...cachedCart, captureSec: targetSec })
    : inspectTikTokCartFromVietnam(item.videoUrl, item.videoId, targetSec, {
        includeFrame: false,
      }).catch((err) => {
        console.error(`[VN-Bridge] Error inspecting ${item.videoId}:`, err?.message || err);
        return null;
      });

  // Chạy song song cắt khung hình ffmpeg ngay từ giây 0 (không đợi giải mã giỏ hàng xong mới bắt đầu)
  const framePromise = extractFfmpegFrameBase64(item.videoUrl, targetSec).catch(() => undefined);

  const fastInspected = await cartPromise;
  if (fastInspected && Array.isArray(fastInspected.cartProducts) && fastInspected.cartProducts.length > 0) {
    resolvedCartMemory.set(item.videoId, fastInspected);
    fastInspected.captureSec = targetSec;
    console.log(
      `[VN-Bridge] Fast-resolved ${fastInspected.cartProducts.length} product(s) for ${item.videoId}: ${fastInspected.cartAnchorTitle}`
    );
    await pushResolvedItemsToWebhook([fastInspected]);
  }

  const frameBase64 = await framePromise;
  if (frameBase64) {
    const baseItem = fastInspected || resolvedCartMemory.get(item.videoId) || {
      videoId: item.videoId,
      videoUrl: item.videoUrl,
      cartProducts: [],
    };
    const withFrame = {
      ...baseItem,
      captureSec: targetSec,
      frameJpegBase64: frameBase64,
      updatedAt: new Date().toISOString(),
    };
    await pushResolvedItemsToWebhook([withFrame]);
    console.log(`[VN-Bridge] Uploaded ffmpeg frame for ${item.videoId} at sec ${targetSec}`);
  }
}

async function pollOnce() {
  try {
    const pollRes = await fetch(`${WEBHOOK_URL}?vnBridgePoll=1&longPoll=1`, {
      headers: {
        'x-bot-api-secret-token': SECRET_TOKEN,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!pollRes.ok) return false;
    const data = await pollRes.json();
    const pendingList = Array.isArray(data?.pending) ? data.pending : [];
    if (pendingList.length === 0) return false;

    for (const item of pendingList) {
      // Khởi chạy xử lý bất đồng bộ để không chặn vòng lặp poll tiếp theo
      processPendingItem(item).catch((err) => {
        console.error('[VN-Bridge] processPendingItem error:', err?.message || err);
      });
    }
    return true;
  } catch {
    // Ignore transient network errors
    return false;
  }
}

let bridgeStarted = false;

export async function bootstrap() {
  if (bridgeStarted) return;
  bridgeStarted = true;
  console.log(`[VN-Bridge] Starting Vietnam TikTok Shop Cart Bridge -> ${WEBHOOK_URL}`);

  // Làm ấm WAF Cookie và đẩy các video mẫu trong nền (không chặn vòng lặp poll chính)
  (async () => {
    try {
      const warmTargets = [
        {
          url: 'https://www.tiktok.com/@tonycase96/video/7702104002401537287',
          id: '7702104002401537287',
          sec: 11.2,
        },
        {
          url: 'https://www.tiktok.com/@thaotepvn/video/7700954270161554708',
          id: '7700954270161554708',
          sec: 4.5,
        },
      ];
      for (const t of warmTargets) {
        await processPendingItem({
          videoId: t.id,
          videoUrl: t.url,
          captureSec: t.sec,
        });
      }
    } catch {
      // ignore warmup errors
    }
  })();

  // Định kỳ làm mới WAF cookie mỗi 8 phút để mọi yêu cầu từ Zalo luôn phản hồi <600ms
  setInterval(() => {
    inspectTikTokCartFromVietnam(
      'https://www.tiktok.com/@tonycase96/video/7702104002401537287',
      '7702104002401537287',
      3.5,
      { includeFrame: false }
    ).catch(() => null);
  }, 8 * 60 * 1000).unref?.();

  while (true) {
    const hasWork = await pollOnce();
    await new Promise((r) => setTimeout(r, hasWork ? 150 : 300));
  }
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  bootstrap();
}
