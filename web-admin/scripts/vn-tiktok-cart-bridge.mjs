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

function solveSlardarWaf(cs, cStr) {
  const b = JSON.parse(Buffer.from(cStr, 'base64').toString('utf8'));
  const prefix = Buffer.from(b.v.a, 'base64');
  const targetHex = Buffer.from(b.v.c, 'base64').toString('hex');
  for (let i = 0; i <= 1_000_000; i++) {
    const hash = crypto
      .createHash('sha256')
      .update(prefix)
      .update(String(i))
      .digest('hex');
    if (hash === targetHex) {
      b.d = Buffer.from(String(i)).toString('base64');
      return `${cs}=${Buffer.from(JSON.stringify(b)).toString('base64')}`;
    }
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
      if (typeof entry?.extra === 'string') {
        try {
          inner = JSON.parse(entry.extra);
        } catch {}
      } else if (entry?.extra && typeof entry.extra === 'object') {
        inner = entry.extra;
      }
      const productId = String(
        inner?.product_id || entry?.product_id || entry?.id || ''
      ).trim();
      if (!/^\d{15,22}$/.test(productId) || seenIds.has(productId)) continue;
      seenIds.add(productId);
      const title = String(
        inner?.title || entry?.title || entry?.keyword || rawKeyword || `Sản phẩm #${productId}`
      ).trim();
      const sellerId = String(inner?.seller_id || inner?.kol_id || '').trim() || undefined;
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

  // Dự phòng cho Video Quảng cáo Thương mại TikTok Ads (isAd: true + ec_global_verdict: 1)
  if (
    products.length === 0 &&
    itemStruct?.isAd &&
    (itemStruct?.penaltyContext?.ec_global_verdict === 1 || itemStruct?.music?.is_commerce_music)
  ) {
    const suggested = Array.isArray(itemStruct?.suggestedWords) ? itemStruct.suggestedWords : [];
    const primaryKw = String(suggested[0] || '').trim();
    const formattedKw = primaryKw
      ? primaryKw.charAt(0).toUpperCase() + primaryKw.slice(1)
      : String(itemStruct?.desc || 'Sản phẩm TikTok Shop Ads').slice(0, 56);
    products.push({
      productId: String(itemStruct?.id || ''),
      title: `${formattedKw} [Quảng cáo TikTok Shop Ads]`,
      productUrl: `https://www.tiktok.com/search?q=${encodeURIComponent(primaryKw || formattedKw)}`,
      source: 'TikTok Shop Ads (VN Bridge)',
    });
  }

  return products;
}

async function extractFfmpegFrameBase64(videoUrl, sec = 4.2) {
  try {
    const tikwmRes = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (!tikwmRes.ok) return undefined;
    const j = await tikwmRes.json();
    const playUrl = j?.data?.play || j?.data?.wmplay;
    if (!playUrl || !playUrl.startsWith('http')) return undefined;
    const tmpFile = path.join(os.tmpdir(), `tt_bridge_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
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

export async function inspectTikTokCartFromVietnam(videoUrl, fallbackVideoId, captureSec = 4.2) {
  let cookieHeader =
    Date.now() < wafCookieExpireAt && wafCookieCache
      ? wafCookieCache
      : 'store-country-code=vn; store-country-code-src=uid; tt-target-idc=alisg';

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(videoUrl, {
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

    const csMatch = html.match(/id="cs"\s+value="([^"]+)"/);
    const cMatch = html.match(/id="c"\s+value="([^"]+)"/);
    if (csMatch && cMatch) {
      const solved = solveSlardarWaf(csMatch[1], cMatch[1]);
      if (solved) {
        cookieHeader = [
          ...cookies,
          solved,
          'store-country-code=vn',
          'store-country-code-src=uid',
          'tt-target-idc=alisg',
        ].join('; ');
        wafCookieCache = cookieHeader;
        wafCookieExpireAt = Date.now() + 15 * 60 * 1000;
        continue;
      }
    }

    const scriptMatch = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!scriptMatch) break;

    const json = JSON.parse(scriptMatch[1]);
    const itemStruct =
      json?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!itemStruct) break;

    const videoId = String(itemStruct.id || fallbackVideoId || '').trim();
    const cartProducts = parseCartProductsFromItemStruct(itemStruct);
    const first = cartProducts[0];
    const frameJpegBase64 = await extractFfmpegFrameBase64(res.url || videoUrl, captureSec);
    return {
      videoId,
      videoUrl: res.url || videoUrl,
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

    const resolvedItems = [];
    for (const item of pendingList) {
      if (!item?.videoUrl || !item?.videoId) continue;
      console.log(`[VN-Bridge] Inspecting pending TikTok video ${item.videoId}: ${item.videoUrl}`);
      const inspected = await inspectTikTokCartFromVietnam(item.videoUrl, item.videoId).catch(
        (err) => {
          console.error(`[VN-Bridge] Error inspecting ${item.videoId}:`, err?.message || err);
          return null;
        }
      );
      if (inspected && (inspected.cartProducts.length > 0 || inspected.frameJpegBase64)) {
        console.log(
          `[VN-Bridge] Resolved ${inspected.cartProducts.length} product(s) & frame=${Boolean(inspected.frameJpegBase64)} for ${item.videoId}`
        );
        resolvedItems.push(inspected);
      }
    }

    if (resolvedItems.length > 0) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-api-secret-token': SECRET_TOKEN,
        },
        body: JSON.stringify({
          vnBridgeResolve: true,
          items: resolvedItems,
        }),
        signal: AbortSignal.timeout(8000),
      });
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
    'https://www.tiktok.com/@user1877211117511/video/7699036513912376582',
    '7699036513912376582',
    4.2
  ).catch(() => null);
  if (seed2) seeds.push(seed2);

  if (seeds.length > 0) {
    console.log(`[VN-Bridge] Seeded ${seeds.length} videos with cart products + ffmpeg frames`);
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-api-secret-token': SECRET_TOKEN,
      },
      body: JSON.stringify({
        vnBridgeResolve: true,
        items: seeds,
      }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  }

  while (true) {
    await pollOnce();
    await new Promise((r) => setTimeout(r, 700));
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  bootstrap();
}
