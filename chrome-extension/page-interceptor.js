(function () {
  if (window.__upbaseB2cInterceptorInstalled) return;
  window.__upbaseB2cInterceptorInstalled = true;

  const host = window.location.hostname.toLowerCase();
  const isDouyin = host.includes('douyin.com');
  const isShopee = host.includes('shopee.vn') || host.includes('shp.ee');
  const isThreads = host.includes('threads.net') || host.includes('threads.com');
  const isFacebook = host.includes('facebook.com') || host.includes('fb.watch');
  const isInstagram = host.includes('instagram.com');
  const isAdsManager = host.includes('ads.tiktok.com') || host.includes('business.tiktok.com');
  const isSellerOrAffiliate =
    !isAdsManager &&
    !isShopee &&
    !isFacebook &&
    !isInstagram &&
    !isThreads &&
    (host.includes('affiliate') ||
      host.includes('seller') ||
      host.includes('tiktokshop') ||
      host.includes('tiktokglobalshop'));

  const state = {
    platform: isShopee
      ? 'shopee'
      : isThreads
        ? 'threads'
        : isFacebook
          ? 'facebook'
          : isInstagram
            ? 'instagram'
            : isDouyin
              ? 'douyin'
              : isAdsManager
                ? 'tiktok_ads'
                : isSellerOrAffiliate
                  ? 'tiktok_seller'
                  : 'tiktok',
    profilesByHandle: {},
    videosByHandle: {},
    sellerMetricsByHandle: {},
    liveSessionByHandle: {},
    adsRowsByVideoId: {},
    commentsByVideoId: {},
    subtitleCacheByVideoId: {},
    mobileCartAttemptedByVideoId: {},
    searchVideosList: [],
    searchUsersList: [],
    currentVideoDetail: null,
    shopeeProductDetail: null,
    shopeeShopDetail: null,
    shopeeVerifiedOrdersById: {},
    threadsTree: null,
    activeSellerHandle: '',
    playerControls: {
      autoScroll: false,
      bgPlay: true,
      playbackSpeed: 1.0,
      volumePct: 100,
      gridOverlayEnabled: true,
      gridSortMode: 'default', // 'default' | 'views' | 'likes' | 'er' | 'velocity' | 'shop_only'
    },
  };

  function normHandle(raw) {
    if (typeof raw !== 'string') return '';
    return raw.trim().toLowerCase().replace(/^@+/, '').replace(/\s+/g, '');
  }

  function parseCompactNumber(raw) {
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
    if (typeof raw !== 'string') return 0;
    const cleaned = raw
      .trim()
      .replace(/(?:VND|VNĐ|[₫đ$€£¥])/gi, '')
      .replace(/\s+/g, '');
    if (!cleaned) return 0;

    const suffixMatch = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)(K|M|B|N|TR|TỶ|TY)$/i);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1].replace(',', '.'));
      const unit = suffixMatch[2].toUpperCase();
      if (unit === 'K' || unit === 'N') return Math.round(num * 1000);
      if (unit === 'M' || unit === 'TR') return Math.round(num * 1000000);
      if (unit === 'B' || unit === 'TỶ' || unit === 'TY') return Math.round(num * 1000000000);
    }

    const digitsOnly = cleaned.replace(/[^0-9]/g, '');
    return digitsOnly ? Math.round(Number(digitsOnly)) : 0;
  }

  function parsePercentValue(raw) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw <= 1 && raw > 0 ? Math.round(raw * 100) : Math.round(raw);
    }
    if (typeof raw !== 'string') return null;
    const m = raw.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
    if (!m) return null;
    return Math.round(parseFloat(m[1].replace(',', '.')));
  }

  function extractHashtags(caption, textExtra) {
    const tags = new Set();
    if (Array.isArray(textExtra)) {
      for (const item of textExtra) {
        const name = item && (item.hashtagName || item.hashtag_name);
        if (typeof name === 'string' && name.trim()) {
          tags.add('#' + name.trim().replace(/^#+/, '').toLowerCase());
        }
      }
    }
    if (typeof caption === 'string' && caption) {
      const regex = /#([\p{L}\p{N}_]+)/gu;
      let m;
      while ((m = regex.exec(caption)) !== null) {
        if (m[1]) tags.add('#' + m[1].toLowerCase());
      }
    }
    return Array.from(tags);
  }

  function extractContactFromBio(bio) {
    const text = String(bio || '');
    const phoneMatch = text.match(/(?:\+84|0)(?:3|5|7|8|9)[0-9\s.\-]{7,10}/);
    const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return {
      phone: phoneMatch ? phoneMatch[0].replace(/[^0-9+]/g, '') : '',
      email: emailMatch ? emailMatch[0].trim() : '',
    };
  }

  function isTikTokItemPinned(item) {
    if (!item || typeof item !== 'object') return false;
    const flags = [
      item.isPinnedItem,
      item.is_pinned_item,
      item.isPinned,
      item.is_pinned,
      item.isTop,
      item.is_top,
      item.pinned,
    ];
    for (const f of flags) {
      if (f === true || f === 1 || f === '1' || f === 'true') return true;
    }
    return false;
  }

  // Bóc tách chi tiết Giỏ hàng TikTok Shop (anchors type 33, 35, 38 + double JSON extra, bảo toàn 100% mã SP 19 chữ số không bị làm tròn Float64)
  function extractCartAnchorsFromItem(item, caption) {
    const products = [];
    const seenIds = new Set();
    let hasYellowCart = false;
    let hasCapCutMask = false;

    const parseExactId = (raw) => {
      if (!raw) return '';
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^\d{10,25}$/.test(trimmed)) return trimmed;
        const m = trimmed.match(/(?:product_id|material_id|addition_id|pdp|product)[=/:]\s*"?(\d{10,25})"?/i);
        if (m && m[1]) return m[1];
      }
      if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
      return '';
    };

    if (item && typeof item === 'object') {
      if (
        item.isECVideo === true ||
        item.isECVideo === 1 ||
        item.is_ec_video === 1 ||
        Boolean(item.commerceInfo) ||
        Boolean(item.commerce_info)
      ) {
        hasYellowCart = true;
      }
      const anchorTypes = Array.isArray(item.AnchorTypes)
        ? item.AnchorTypes.map((t) => String(t))
        : [];
      if (anchorTypes.includes('33') || anchorTypes.includes('35') || anchorTypes.includes('38')) {
        hasYellowCart = true;
      }
      if (anchorTypes.includes('54')) {
        hasCapCutMask = true;
      }

      const anchors = [
        ...(Array.isArray(item.anchors) ? item.anchors : []),
        ...(item.anchor && typeof item.anchor === 'object'
          ? Array.isArray(item.anchor)
            ? item.anchor
            : [item.anchor]
          : []),
        ...(Array.isArray(item.anchorsExtras) ? item.anchorsExtras : []),
        ...(item.anchor_info && typeof item.anchor_info === 'object' ? [item.anchor_info] : []),
      ];

      for (const anchor of anchors) {
        if (!anchor || typeof anchor !== 'object') continue;
        const aType = Number(anchor.type || 0);
        const aKey = String(anchor.keyword || anchor.title || '').trim();
        const extraStr = typeof anchor.extra === 'string' ? anchor.extra.trim() : '';
        const logExtraStr = typeof anchor.logExtra === 'string' ? anchor.logExtra : '';

        const hasShopHintInAnchor =
          aType === 33 ||
          aType === 35 ||
          aType === 38 ||
          aType === 61 ||
          /anchor_shop|product_id|shop_id|seller_id|seo_url|ecom|pdp/i.test(extraStr + ' ' + logExtraStr);

        if (
          (aType === 54 || /capcut/i.test(aKey)) &&
          !hasShopHintInAnchor
        ) {
          hasCapCutMask = true;
          continue;
        }
        if (/capcut/i.test(aKey) || /capcut/i.test(extraStr) || /capcut/i.test(logExtraStr)) {
          hasCapCutMask = true;
        }

        let outerList = [];
        if (extraStr.startsWith('{') || extraStr.startsWith('[')) {
          try {
            const parsed = JSON.parse(extraStr);
            outerList = Array.isArray(parsed)
              ? parsed
              : parsed && Array.isArray(parsed.products)
                ? parsed.products
                : parsed
                  ? [parsed]
                  : [];
          } catch {
            outerList = [];
          }
        } else if (Array.isArray(anchor.extra)) {
          outerList = anchor.extra;
        } else if (anchor.extra && typeof anchor.extra === 'object') {
          outerList = [anchor.extra];
        }

        if (outerList.length === 0) {
          outerList = [anchor];
        }

        for (const entry of outerList) {
          if (!entry || typeof entry !== 'object') continue;
          const eType = Number(entry.type || aType || 0);
          const compKey = String(entry.component_key || entry.componentKey || anchor.component_key || '').trim();
          const outerKeyword = String(entry.keyword || entry.name || aKey || '').trim();
          const rawSubExtra = typeof entry.extra === 'string' ? entry.extra.trim() : '';

          const isEntryCapCut =
            (eType === 54 || /capcut/i.test(compKey) || /capcut/i.test(outerKeyword)) &&
            !/anchor_shop|product_id|seo_url/i.test(rawSubExtra);
          if (isEntryCapCut) {
            hasCapCutMask = true;
            continue;
          }

          const isEntryShop =
            compKey === 'anchor_shop' ||
            compKey.includes('shop') ||
            compKey.includes('product') ||
            eType === 33 ||
            eType === 35 ||
            eType === 38 ||
            eType === 61 ||
            hasShopHintInAnchor ||
            /product_id|seo_url|seller_id/i.test(rawSubExtra);

          if (!isEntryShop) continue;
          hasYellowCart = true;

          // Trích xuất ID 19 chữ số bằng Regex trên chuỗi thô TRƯỚC khi JSON.parse để không bị làm tròn số thực 64-bit
          const regexSourceStr = rawSubExtra || (outerList.length === 1 ? extraStr : '');
          const rawProductIdFromRegex =
            (regexSourceStr.match(/\\?"product_id\\?"\s*:\s*\\?"?(\d{10,25})\\?"?/) || [])[1] ||
            (regexSourceStr.match(/\\?"material_id\\?"\s*:\s*\\?"?(\d{10,25})\\?"?/) || [])[1] ||
            (regexSourceStr.match(/\\?"item_id\\?"\s*:\s*\\?"?(\d{10,25})\\?"?/) || [])[1] ||
            '';
          const rawSellerIdFromRegex =
            (regexSourceStr.match(/\\?"seller_id\\?"\s*:\s*\\?"?(\d{10,25})\\?"?/) || [])[1] ||
            (regexSourceStr.match(/\\?"shop_id\\?"\s*:\s*\\?"?(\d{10,25})\\?"?/) || [])[1] ||
            '';
          const rawSkuIdFromRegex =
            (regexSourceStr.match(/\\?"sku_id\\?"\s*:\s*\\?"?(\d{10,25})\\?"?/) || [])[1] || '';

          let inner = entry;
          if (rawSubExtra.startsWith('{')) {
            try {
              inner = { ...entry, ...JSON.parse(rawSubExtra) };
            } catch {
              inner = entry;
            }
          }

          const outerIdStr = parseExactId(entry.id || anchor.id);
          const rawUrl = String(
            inner.seo_url || inner.short_url || inner.final_url || inner.detail_url || anchor.url || ''
          ).trim();
          const urlPidMatch = rawUrl.match(/\/(\d{15,25})(?:[/?#]|$)/);

          const pid = String(
            rawProductIdFromRegex ||
              outerIdStr ||
              (urlPidMatch ? urlPidMatch[1] : '') ||
              parseExactId(inner.product_id || inner.productId || inner.item_id) ||
              ''
          ).trim();

          const fullTitle = String(
            inner.title || inner.product_name || inner.elastic_title || ''
          ).trim();
          const title = String(
            fullTitle || outerKeyword || aKey || 'Sản phẩm TikTok Shop'
          ).trim();

          const sellerId = String(
            rawSellerIdFromRegex || parseExactId(inner.seller_id || inner.shop_id || inner.kol_id) || ''
          ).trim();
          const shopName = String(
            inner.shop_name ||
              inner.seller_name ||
              inner.brand_name ||
              (outerKeyword && outerKeyword !== fullTitle ? outerKeyword : '') ||
              (sellerId ? `Gian hàng #${sellerId.slice(-6)}` : 'Gian hàng TikTok Shop')
          ).trim();

          const rawPriceFromRegex =
            (regexSourceStr.match(
              /\\?"(?:format_price|formatted_price|price_str|sale_price_format|real_price_format|display_price)\\?"\s*:\s*\\?"([^"\\]+)\\?"/
            ) || [])[1] || '';

          const rawPriceCandidate =
            inner.format_price ||
            inner.formatted_price ||
            inner.price_str ||
            inner.priceStr ||
            inner.display_price ||
            inner.sale_price_format ||
            inner.real_price_format ||
            inner.price_info?.sale_price_format ||
            inner.price_info?.format_price ||
            inner.price_info?.price_str ||
            inner.price_info?.real_price ||
            inner.sale_price ||
            inner.price ||
            inner.market_price ||
            entry.price_str ||
            anchor.price_str ||
            rawPriceFromRegex ||
            '';
          const priceText = String(rawPriceCandidate || '').trim();
          const priceVnd = parseCompactNumber(priceText);
          const soldCount = parseCompactNumber(
            inner.sold_count ?? inner.sales ?? inner.volume ?? inner.order_count ?? 0
          );
          const stockCount = parseCompactNumber(
            inner.stock ?? inner.inventory ?? inner.stock_count ?? 0
          );
          const commissionRatePct = Number(
            inner.commission_rate ?? inner.cos_ratio ?? inner.commission ?? 10
          );

          const productUrl =
            rawUrl && /^https?:\/\//i.test(rawUrl)
              ? rawUrl
              : pid
                ? `https://shop.tiktok.com/view/product/${pid}?region=VN&locale=vi-VN`
                : '';

          let coverUrl = String(
            inner.cover_url ||
              inner.image_url ||
              (Array.isArray(entry.icon?.url_list) ? entry.icon.url_list[0] : '') ||
              (Array.isArray(entry.icon?.urlList) ? entry.icon.urlList[0] : '') ||
              (Array.isArray(anchor.icon?.urlList) ? anchor.icon.urlList[0] : '') ||
              (Array.isArray(anchor.thumbnail?.urlList) ? anchor.thumbnail.urlList[0] : '') ||
              ''
          ).trim();
          if (!coverUrl && typeof inner.cover === 'string' && inner.cover.trim()) {
            const c = inner.cover.trim();
            coverUrl = c.startsWith('http')
              ? c
              : `https://p16-oec-sg.ibyteimg.com/${c}~tplv-aphluv4xwc-resize-jpeg:800:800.jpeg`;
          }

          const dedupeKey = pid || `${title}_${productUrl}`;
          if (dedupeKey && !seenIds.has(dedupeKey)) {
            seenIds.add(dedupeKey);
            products.push({
              productId: pid,
              skuId: rawSkuIdFromRegex || undefined,
              title,
              anchorKeyword: outerKeyword && outerKeyword !== title ? outerKeyword : undefined,
              priceText: priceText || undefined,
              priceVnd: priceVnd > 0 ? priceVnd : undefined,
              soldCount: soldCount > 0 ? soldCount : undefined,
              stockCount: stockCount > 0 ? stockCount : undefined,
              commissionRatePct:
                Number.isFinite(commissionRatePct) && commissionRatePct > 0
                  ? commissionRatePct
                  : 10,
              productUrl,
              coverUrl: coverUrl || undefined,
              sellerId: sellerId || undefined,
              shopName,
              source: 'TikTok Shop',
            });
          }
        }
      }
    }

    if (!hasYellowCart && /giỏ hàng|gắn ở giỏ|tiktokshop/i.test(String(caption || ''))) {
      hasYellowCart = true;
    }

    const first = products[0] || null;
    return {
      hasYellowCart: hasYellowCart || products.length > 0,
      hasCapCutMask,
      cartProducts: products,
      cartAnchorTitle: first ? first.title : '',
      cartAnchorUrl: first ? first.productUrl : '',
      cartProductId: first ? first.productId : '',
      cartSellerId: first ? first.sellerId || '' : '',
    };
  }

  // Bóc tách Link Affiliate / Sản phẩm (Shopee, TikTok Shop, Lazada, Bio Link) trên Threads, Facebook, Instagram & Reels
  function extractSocialCommerceProductsFromText(caption, extraLinks) {
    const products = [];
    const seenUrls = new Set();
    const rawCaption = String(caption || '');
    const allUrls = [];

    const urlRegex = /https?:\/\/[^\s"'<>)\]]+/gi;
    let m;
    while ((m = urlRegex.exec(rawCaption)) !== null) {
      if (m[0]) allUrls.push(m[0].replace(/[.,;!?]+$/, ''));
    }
    if (Array.isArray(extraLinks)) {
      for (const u of extraLinks) {
        if (typeof u === 'string' && u.trim()) {
          allUrls.push(u.trim());
        }
      }
    }

    for (const rawUrl of allUrls) {
      let cleanUrl = rawUrl;
      // Giải mã link chuyển hướng l.instagram.com / l.facebook.com / l.threads.net (?u=...)
      if (/l\.(?:instagram\.com|facebook\.com|threads\.net|threads\.com)/i.test(cleanUrl)) {
        try {
          const parsedObj = new URL(cleanUrl);
          const uParam = parsedObj.searchParams.get('u');
          if (uParam) cleanUrl = decodeURIComponent(uParam);
        } catch {}
      }
      if (seenUrls.has(cleanUrl)) continue;

      const isShopee = /(?:s\.shopee\.vn|shp\.ee|shopee\.vn)/i.test(cleanUrl);
      const isTikTokShop = /(?:shop\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/view\/product)/i.test(cleanUrl);
      const isLazada = /(?:s\.lazada\.vn|lazada\.vn)/i.test(cleanUrl);
      const isBioHub = /(?:beacons\.ai|linktr\.ee|instabio\.cc|passio\.eco|kol\.com\.vn|msha\.ke)/i.test(cleanUrl);

      if (!isShopee && !isTikTokShop && !isLazada && !isBioHub) continue;
      seenUrls.add(cleanUrl);

      const pidMatch =
        cleanUrl.match(/(?:product|item)[=/](\d{8,25})/i) ||
        cleanUrl.match(/i\.\d+\.(\d{8,25})/i) ||
        cleanUrl.match(/\/([A-Za-z0-9_-]{6,16})$/);
      const pid = pidMatch ? pidMatch[1] : '';

      const sourceName = isShopee
        ? 'Shopee Affiliate'
        : isTikTokShop
          ? 'TikTok Shop'
          : isLazada
            ? 'Lazada Affiliate'
            : 'Bio Link KOC';

      const firstLine = rawCaption
        .split(/\r?\n/)
        .map((s) => s.replace(/https?:\/\/\S+/g, '').trim())
        .find((s) => s.length >= 4);

      products.push({
        productId: pid,
        title: firstLine ? firstLine.slice(0, 68) : `Sản phẩm gắn link (${sourceName})`,
        productUrl: cleanUrl,
        shopName: sourceName,
        source: sourceName,
        commissionRatePct: 10,
      });
    }

    const hasCartHint =
      products.length > 0 ||
      /link mua|link sản phẩm|link ở bio|link dưới cmt|dưới bình luận|giỏ hàng|s\.shopee\.vn|shp\.ee|shop\.tiktok\.com|s\.lazada\.vn/i.test(
        rawCaption
      );

    const first = products[0] || null;
    return {
      hasYellowCart: hasCartHint,
      cartProducts: products,
      cartAnchorTitle: first ? first.title : '',
      cartAnchorUrl: first ? first.productUrl : '',
      cartProductId: first ? first.productId : '',
    };
  }

  // Bóc tách link MP4 không logo (playableUrl), link phụ đề WebVTT (subtitleUrl) & chữ trên màn hình (onScreenStickers)
  function extractMediaAndSubtitlesFromItem(item) {
    const video = (item && item.video) || {};
    const durationSeconds = Number(video.duration || item?.duration || 0);

    // 1. Playable MP4 URL (No-Watermark) — hỗ trợ mọi cấu trúc playAddr / PlayAddrStruct / bitrateInfo / downloadAddr của TikTok Web
    const pickFirstHttpUrl = (cand) => {
      if (!cand) return '';
      if (typeof cand === 'string') {
        const s = cand.trim();
        if (s.startsWith('//')) return `https:${s}`;
        return s.startsWith('http') ? s : '';
      }
      const list =
        (Array.isArray(cand.UrlList) && cand.UrlList) ||
        (Array.isArray(cand.urlList) && cand.urlList) ||
        (Array.isArray(cand.url_list) && cand.url_list) ||
        [];
      for (const u of list) {
        if (typeof u === 'string' && u.trim()) {
          const s = u.trim();
          if (s.startsWith('//')) return `https:${s}`;
          if (s.startsWith('http')) return s;
        }
      }
      return '';
    };

    let playableUrl =
      pickFirstHttpUrl(video.playAddr) ||
      pickFirstHttpUrl(video.PlayAddrStruct) ||
      pickFirstHttpUrl(video.play_addr) ||
      pickFirstHttpUrl(Array.isArray(video.bitrateInfo) ? video.bitrateInfo[0]?.PlayAddr : null) ||
      pickFirstHttpUrl(video.downloadAddr) ||
      pickFirstHttpUrl(video.DownloadAddrStruct) ||
      pickFirstHttpUrl(video.download_addr) ||
      '';

    // 2. Subtitle URL (WebVTT + JSON fallback)
    const captionInfos = [
      ...(Array.isArray(video.claInfo?.captionInfos) ? video.claInfo.captionInfos : []),
      ...(Array.isArray(video.subtitleInfos) ? video.subtitleInfos : []),
    ];
    const getSubUrl = (c) =>
      String(
        c?.url ||
          c?.Url ||
          (Array.isArray(c?.urlList) ? c.urlList[0] : '') ||
          (Array.isArray(c?.UrlList) ? c.UrlList[0] : '') ||
          ''
      ).trim();
    const isWebVttSub = (c) =>
      String(c?.Format || c?.format || '')
        .toLowerCase()
        .includes('webvtt') || getSubUrl(c).toLowerCase().includes('webvtt');
    const isVieSub = (c) =>
      String(c?.languageCodeName || c?.LanguageCodeName || c?.language || '')
        .toLowerCase()
        .includes('vie');

    const preferredSub =
      captionInfos.find((c) => isVieSub(c) && isWebVttSub(c)) ||
      captionInfos.find((c) => isWebVttSub(c)) ||
      captionInfos.find((c) => isVieSub(c)) ||
      captionInfos[0];

    let subtitleUrl = preferredSub ? getSubUrl(preferredSub) : '';
    const allSubtitleUrls = captionInfos.map(getSubUrl).filter(Boolean);

    // 3. Chữ chèn trên màn hình (stickersOnItem)
    const onScreenStickers = [];
    if (Array.isArray(item?.stickersOnItem)) {
      for (const st of item.stickersOnItem) {
        if (Array.isArray(st?.stickerText)) {
          for (const t of st.stickerText) {
            if (typeof t === 'string' && t.trim()) {
              onScreenStickers.push(t.trim());
            }
          }
        }
      }
    }

    // 4. Âm thanh / Nhạc nền MP3 (music)
    const musicObj = (item && item.music) || {};
    const musicId = String(musicObj.id || musicObj.id_str || '').trim();
    const musicTitle = String(musicObj.title || 'Âm thanh gốc').trim();
    const musicAuthor = String(musicObj.authorName || musicObj.author || '').trim();
    let musicPlayUrl = '';
    if (typeof musicObj.playUrl === 'string' && musicObj.playUrl.startsWith('http')) {
      musicPlayUrl = musicObj.playUrl;
    } else if (Array.isArray(musicObj.play_url?.url_list) && musicObj.play_url.url_list[0]) {
      musicPlayUrl = musicObj.play_url.url_list[0];
    } else if (Array.isArray(musicObj.playUrl?.urlList) && musicObj.playUrl.urlList[0]) {
      musicPlayUrl = musicObj.playUrl.urlList[0];
    }

    // 5. Ảnh bài đăng Slide / Photo Mode (imagePost)
    const imageUrls = [];
    const rawImages = item?.imagePost?.images || item?.images || [];
    if (Array.isArray(rawImages)) {
      for (const img of rawImages) {
        const u =
          img?.imageURL?.urlList?.[0] ||
          img?.displayImage?.urlList?.[0] ||
          img?.url_list?.[0] ||
          (typeof img === 'string' ? img : '');
        if (typeof u === 'string' && u.startsWith('http')) {
          imageUrls.push(u);
        }
      }
    }

    return {
      durationSeconds,
      playableUrl,
      subtitleUrl,
      allSubtitleUrls,
      onScreenStickers,
      musicId,
      musicTitle,
      musicAuthor,
      musicPlayUrl,
      imageUrls,
    };
  }

  function formatSecToMmSs(secNum) {
    const totalSec = Math.max(0, Math.floor(Number(secNum || 0)));
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function formatVttClock(rawClock) {
    const clean = String(rawClock || '').trim().split(' ')[0].split('.')[0];
    const parts = clean.split(':').map((p) => Number(p || 0));
    if (parts.length === 3) {
      const totalMinutes = parts[0] * 60 + parts[1];
      return `${String(totalMinutes).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`;
    }
    if (parts.length === 2) {
      return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
    }
    return clean.slice(-5) || '00:00';
  }

  function parseWebVttTextToTranscript(vttRaw) {
    if (!vttRaw || typeof vttRaw !== 'string') return '';
    const trimmed = vttRaw.trim();

    // Hỗ trợ định dạng JSON Subtitle (creator_caption / utterances / body) của TikTok
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.utterances)
            ? parsed.utterances
            : Array.isArray(parsed.body)
              ? parsed.body
              : Array.isArray(parsed.captions)
                ? parsed.captions
                : [];
        if (list.length > 0) {
          const jsonSegs = [];
          for (const item of list) {
            const txt = String(item?.text || item?.content || item?.value || '').trim();
            if (!txt) continue;
            const startSec =
              item?.start_time !== undefined
                ? Number(item.start_time) > 1000
                  ? Number(item.start_time) / 1000
                  : Number(item.start_time)
                : Number(item?.from || item?.startTime || 0);
            const endSec =
              item?.end_time !== undefined
                ? Number(item.end_time) > 1000
                  ? Number(item.end_time) / 1000
                  : Number(item.end_time)
                : Number(item?.to || item?.endTime || startSec + 2);
            jsonSegs.push(`[${formatSecToMmSs(startSec)} - ${formatSecToMmSs(endSec)}] ${txt}`);
          }
          if (jsonSegs.length > 0) return jsonSegs.join('\n');
        }
      } catch {
        // Tiếp tục parse theo chuẩn WebVTT
      }
    }

    const lines = vttRaw.split(/\r?\n/);
    const segments = [];
    let currentTimeLabel = '';
    let currentCueLines = [];

    const flushCue = () => {
      if (currentCueLines.length === 0) return;
      const joinedText = currentCueLines.join(' ').replace(/\s+/g, ' ').trim();
      currentCueLines = [];
      if (!joinedText) return;
      const prev = segments[segments.length - 1];
      if (!prev || prev.text !== joinedText) {
        segments.push({
          timeLabel: currentTimeLabel || '00:00 - 00:02',
          text: joinedText,
        });
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        flushCue();
        continue;
      }
      if (line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE') || /^\d+$/.test(line)) {
        continue;
      }
      if (line.includes('-->')) {
        flushCue();
        const parts = line.split('-->');
        const startFormatted = formatVttClock(parts[0]);
        const endFormatted = formatVttClock(parts[1]);
        currentTimeLabel = `${startFormatted} - ${endFormatted}`;
        continue;
      }
      const clean = line.replace(/<[^>]+>/g, '').trim();
      if (clean) {
        currentCueLines.push(clean);
      }
    }
    flushCue();

    return segments.map((s) => `[${s.timeLabel}] ${s.text}`).join('\n');
  }

  const pendingBridgeTextReqs = new Map();

  function fetchTextViaExtensionBridge(urlToFetch) {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || typeof window.postMessage !== 'function') {
        resolve('');
        return;
      }
      const reqId = `vtt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        pendingBridgeTextReqs.delete(reqId);
        resolve('');
      }, 2800);
      pendingBridgeTextReqs.set(reqId, (text) => {
        clearTimeout(timer);
        resolve(String(text || ''));
      });
      window.postMessage(
        {
          source: 'UPBASE_B2C_BRIDGE_FETCH_TEXT',
          reqId,
          url: urlToFetch,
        },
        '*'
      );
    });
  }

  async function ensureSubtitleFetchedForVideo(videoObj) {
    if (!videoObj || !videoObj.videoId) return;
    const candidateUrls = [
      ...(videoObj.subtitleUrl ? [videoObj.subtitleUrl] : []),
      ...(Array.isArray(videoObj.allSubtitleUrls) ? videoObj.allSubtitleUrls : []),
    ].filter(Boolean);
    if (candidateUrls.length === 0) return;
    if (videoObj.transcriptText && videoObj.transcriptText.split('\n').length >= 4) return;
    const cached = state.subtitleCacheByVideoId[videoObj.videoId];
    if (cached) {
      videoObj.transcriptText = cached;
      return;
    }
    let bestTranscript = videoObj.transcriptText || '';
    for (const subUrl of candidateUrls) {
      try {
        let vttText = '';
        try {
          const res = await origFetch(subUrl, { credentials: 'omit' });
          if (res && res.ok) {
            vttText = await res.text();
          }
        } catch {
          // Nếu bị chặn CORS trên trình duyệt, chuyển sang cầu nối Service Worker của Extension
        }
        if (!vttText) {
          vttText = await fetchTextViaExtensionBridge(subUrl);
        }
        if (!vttText) continue;
        const transcript = parseWebVttTextToTranscript(vttText);
        if (transcript && transcript.length > bestTranscript.length) {
          bestTranscript = transcript;
          if (transcript.split('\n').length >= 5) break;
        }
      } catch {
        // Thử track phụ đề tiếp theo
      }
    }
    if (bestTranscript) {
      state.subtitleCacheByVideoId[videoObj.videoId] = bestTranscript;
      videoObj.transcriptText = bestTranscript;
      if (state.currentVideoDetail && state.currentVideoDetail.videoId === videoObj.videoId) {
        state.currentVideoDetail.transcriptText = bestTranscript;
      }
      broadcastSnapshot();
    }
  }

  // Tự động mở khóa Giỏ hàng TikTok Shop & làm giàu chỉ số Video qua SSR HTML (?__tpt_mobile=1, Desktop HTML) và /api/creator/item_list/
  async function ensureMobileCartUnlockedForVideo(videoObj) {
    if (!videoObj || !videoObj.videoId) return;
    const vidStr = String(videoObj.videoId).trim();
    if (!/^\d{15,22}$/.test(vidStr)) return;
    if (Array.isArray(videoObj.cartProducts) && videoObj.cartProducts.length > 0) return;
    const isCurrentDetail =
      getCurrentUrlInfo().videoId === vidStr ||
      (state.currentVideoDetail && String(state.currentVideoDetail.videoId) === vidStr);
    if (!videoObj.hasYellowCart && !videoObj.hasCapCutMask && !isCurrentDetail) return;
    if (state.mobileCartAttemptedByVideoId[vidStr]) return;
    state.mobileCartAttemptedByVideoId[vidStr] = true;

    try {
      const targetUrl =
        videoObj.videoUrl && videoObj.videoUrl.includes('/video/')
          ? videoObj.videoUrl.split('?')[0]
          : `https://www.tiktok.com/@${videoObj.handle || 'tiktok'}/video/${vidStr}`;
      const sep = targetUrl.includes('?') ? '&' : '?';
      const mobileUrl = `${targetUrl}${sep}__tpt_mobile=1`;

      const fetchItemFromHtmlUrl = async (urlToFetch) => {
        try {
          const r = await origFetch(urlToFetch, {
            credentials: 'include',
            headers: { Accept: 'text/html,application/xhtml+xml' },
          });
          if (!r.ok) return null;
          const html = await r.text();
          const m = html.match(
            /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
          );
          if (!m || !m[1]) return null;
          const parsed = JSON.parse(m[1]);
          const scope = parsed?.__DEFAULT_SCOPE__ || {};
          return (
            scope?.['webapp.video-detail']?.itemInfo?.itemStruct ||
            scope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct ||
            null
          );
        } catch {
          return null;
        }
      };

      // Tầng 1: Thử Mobile HTML (?__tpt_mobile=1), nếu bị trả về reflow shell rỗng thì thử tiếp Desktop HTML
      let fetchedItem = await fetchItemFromHtmlUrl(mobileUrl);
      if (!fetchedItem) {
        fetchedItem = await fetchItemFromHtmlUrl(targetUrl);
      }

      let norm = fetchedItem ? normalizeTikTokVideo(fetchedItem, videoObj.handle) : null;
      let cartInfo = fetchedItem
        ? extractCartAnchorsFromItem(fetchedItem, videoObj.caption || fetchedItem.desc)
        : { hasYellowCart: false, cartProducts: [], cartAnchorTitle: '', cartAnchorUrl: '', cartProductId: '', cartSellerId: '' };

      // Tầng 2: Nếu Mobile HTML có itemStruct nhưng chưa có giỏ, thử tiếp Desktop HTML
      if (cartInfo.cartProducts.length === 0 && fetchedItem) {
        const desktopItem = await fetchItemFromHtmlUrl(targetUrl);
        if (desktopItem) {
          const desktopCart = extractCartAnchorsFromItem(desktopItem, videoObj.caption || desktopItem.desc);
          if (desktopCart.cartProducts.length > 0) {
            cartInfo = desktopCart;
            if (!norm) norm = normalizeTikTokVideo(desktopItem, videoObj.handle);
          }
        }
      }

      // Tầng 3: Truy vấn /api/creator/item_list/ theo secUid của kênh (vượt qua cả lớp phủ CapCut lẫn reflow shell)
      const knownSecUid =
        fetchedItem?.author?.secUid ||
        videoObj.authorSecUid ||
        state.profilesByHandle[videoObj.handle]?.secUid ||
        '';
      if (cartInfo.cartProducts.length === 0 && knownSecUid && typeof origFetch === 'function') {
        try {
          const qs = new URLSearchParams({
            aid: '1988',
            app_language: 'vi-VN',
            app_name: 'tiktok_web',
            channel: 'tiktok_web',
            count: '15',
            cursor: String(Date.now()),
            device_platform: 'web_pc',
            language: 'vi-VN',
            priority_region: 'VN',
            region: 'VN',
            secUid: String(knownSecUid),
            type: '1',
          });
          const cRes = await origFetch(`https://www.tiktok.com/api/creator/item_list/?${qs.toString()}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          if (cRes.ok) {
            const cJson = await cRes.json();
            const list = Array.isArray(cJson?.itemList) ? cJson.itemList : [];
            const matchedItem = list.find((it) => String(it?.id || '') === vidStr);
            if (matchedItem) {
              if (!norm) norm = normalizeTikTokVideo(matchedItem, videoObj.handle);
              const cInfo = extractCartAnchorsFromItem(matchedItem, videoObj.caption || matchedItem.desc);
              if (cInfo.cartProducts.length > 0) {
                cartInfo = cInfo;
              }
            }
          }
        } catch {
          // Bỏ qua lỗi nhánh phụ
        }
      }

      if (norm) {
        if (norm.views > (videoObj.views || 0)) videoObj.views = norm.views;
        if (norm.likes > (videoObj.likes || 0)) videoObj.likes = norm.likes;
        if (norm.comments > (videoObj.comments || 0)) videoObj.comments = norm.comments;
        if (norm.shares > (videoObj.shares || 0)) videoObj.shares = norm.shares;
        if (norm.saves > (videoObj.saves || 0)) videoObj.saves = norm.saves;
        if (norm.engagementRate) videoObj.engagementRate = norm.engagementRate;
        if (norm.publishedAt) videoObj.publishedAt = norm.publishedAt;
        if (norm.durationSeconds) videoObj.durationSeconds = norm.durationSeconds;
        if (norm.isAdAuthorized) videoObj.isAdAuthorized = true;
        if (norm.isSponsored) videoObj.isSponsored = true;
        if (norm.playableUrl && !videoObj.playableUrl) videoObj.playableUrl = norm.playableUrl;
        if (norm.subtitleUrl && !videoObj.subtitleUrl) {
          videoObj.subtitleUrl = norm.subtitleUrl;
          ensureSubtitleFetchedForVideo(videoObj);
        }
        if (norm.caption && !videoObj.caption) videoObj.caption = norm.caption;
        if (norm.authorFollowers && !videoObj.authorFollowers) {
          videoObj.authorFollowers = norm.authorFollowers;
        }
      }

      if (cartInfo.cartProducts.length > 0 || cartInfo.hasYellowCart) {
        videoObj.hasYellowCart = true;
        if (cartInfo.cartProducts.length > 0) {
          videoObj.cartProducts = cartInfo.cartProducts;
          videoObj.cartAnchorTitle = cartInfo.cartAnchorTitle;
          videoObj.cartAnchorUrl = cartInfo.cartAnchorUrl;
          videoObj.cartProductId = cartInfo.cartProductId;
          videoObj.cartSellerId = cartInfo.cartSellerId;
        }
      }

      if (state.currentVideoDetail && String(state.currentVideoDetail.videoId) === vidStr) {
        Object.assign(state.currentVideoDetail, videoObj);
      }
      if (videoObj.handle) {
        mergeVideosForHandle(videoObj.handle, [videoObj]);
      }
      broadcastSnapshot();
    } catch {
      // Bỏ qua nếu lỗi mạng
    }
  }

  function isTikTokItemSponsoredOrCart(item, caption, cartInfo) {
    if (!item || typeof item !== 'object') return false;
    if (cartInfo && cartInfo.hasYellowCart) return true;
    if (item.isAd || item.is_ad || item.ad || item.isECVideo || item.is_ec_video) return true;
    if (item.commerceInfo || item.commerce_info || item.brandedContent) return true;
    const lower = String(caption || '').toLowerCase();
    return /(?:#ad\b|#sponsored|giỏ hàng|gắn ở giỏ|link bio|tiktokshop)/i.test(lower);
  }

  function normalizeTikTokVideo(item, fallbackHandle) {
    if (!item || typeof item !== 'object') return null;
    const videoId = String(
      item.id || item.aweme_id || item.awemeId || item.item_id || item.videoId || ''
    ).trim();
    if (!videoId) return null;

    const authorObj = item.author || item.authorInfo || {};
    const authorStats = item.authorStats || authorObj.stats || {};
    const handle =
      normHandle(authorObj.uniqueId || authorObj.unique_id || fallbackHandle) ||
      getCurrentUrlInfo().handle;
    const authorDisplayName = String(authorObj.nickname || authorObj.uniqueId || handle || '');
    const authorAvatarUrl = String(
      authorObj.avatarLarger ||
        authorObj.avatarMedium ||
        authorObj.avatarThumb ||
        authorObj.avatar_thumb?.url_list?.[0] ||
        ''
    );
    const authorBio = String(authorObj.signature || '');
    const authorFollowers = parseCompactNumber(
      authorStats.followerCount ?? authorObj.follower_count ?? authorObj.followerCount ?? 0
    );
    const authorTotalLikes = parseCompactNumber(
      authorStats.heartCount ?? authorStats.heart ?? authorStats.diggCount ?? authorObj.total_favorited ?? 0
    );
    const authorVideoCount = parseCompactNumber(
      authorStats.videoCount ?? authorObj.aweme_count ?? 0
    );
    const authorSecUid = String(authorObj.secUid || authorObj.sec_uid || '');
    if (handle && (authorDisplayName || authorFollowers > 0 || authorBio || authorAvatarUrl || authorSecUid)) {
      mergeProfileForHandle(handle, {
        handle,
        secUid: authorSecUid,
        displayName: authorDisplayName || handle,
        avatarUrl: authorAvatarUrl,
        bio: authorBio,
        followers: authorFollowers,
        totalLikes: authorTotalLikes,
        videoCount: authorVideoCount,
      });
    }
    const stats = item.stats || item.statsV2 || item.statistics || item.stat || {};
    const views = parseCompactNumber(stats.playCount ?? stats.play_count ?? stats.viewCount ?? 0);
    const likes = parseCompactNumber(stats.diggCount ?? stats.digg_count ?? stats.likeCount ?? 0);
    const comments = parseCompactNumber(stats.commentCount ?? stats.comment_count ?? 0);
    const shares = parseCompactNumber(stats.shareCount ?? stats.share_count ?? 0);
    const saves = parseCompactNumber(stats.collectCount ?? stats.collect_count ?? 0);
    const createTime = Number(item.createTime || item.create_time || 0);
    const publishedAt =
      createTime > 100000000
        ? new Date(createTime * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    const caption = String(item.desc || '').trim();
    const hashtags = extractHashtags(caption, item.textExtra || item.text_extra);
    const isPinned = isTikTokItemPinned(item);

    const cartInfo = extractCartAnchorsFromItem(item, caption);
    const mediaInfo = extractMediaAndSubtitlesFromItem(item);
    const isAdAuthorized = Boolean(
      item.adAuthorization ||
        item.ad_authorization ||
        item.commerce_info?.adv_promotable ||
        item.isAd ||
        item.is_ad
    );
    const isSponsored = isTikTokItemSponsoredOrCart(item, caption, cartInfo) || isAdAuthorized;
    const engagementRate =
      views === 0 ? 0 : Number((((likes + comments + shares) / views) * 100).toFixed(2));
    const ageHours =
      createTime > 100000000
        ? Math.max(1, (Date.now() / 1000 - createTime) / 3600)
        : 24;
    const viewsPerHour = Math.max(1, Math.round(views / ageHours));

    const cachedTranscript = state.subtitleCacheByVideoId[videoId] || '';
    const baseDomain = isDouyin ? 'https://www.douyin.com' : 'https://www.tiktok.com';

    return {
      videoId,
      videoUrl: handle
        ? isDouyin
          ? `${baseDomain}/video/${videoId}`
          : `${baseDomain}/@${handle}/video/${videoId}`
        : window.location.href.split('?')[0],
      handle,
      authorSecUid,
      authorDisplayName: authorDisplayName || handle,
      authorFollowers,
      authorBio,
      authorAvatarUrl,
      caption,
      hashtags,
      publishedAt,
      createTime,
      durationSeconds: mediaInfo.durationSeconds,
      views,
      likes,
      comments,
      shares,
      saves,
      viewsPerHour,
      engagementRate,
      isPinned,
      isSponsored,
      isAdAuthorized,
      hasYellowCart: cartInfo.hasYellowCart,
      hasCapCutMask: cartInfo.hasCapCutMask,
      cartProducts: cartInfo.cartProducts,
      cartAnchorTitle: cartInfo.cartAnchorTitle,
      cartAnchorUrl: cartInfo.cartAnchorUrl,
      cartProductId: cartInfo.cartProductId,
      cartSellerId: cartInfo.cartSellerId,
      playableUrl: mediaInfo.playableUrl,
      subtitleUrl: mediaInfo.subtitleUrl,
      transcriptText: cachedTranscript,
      onScreenStickers: mediaInfo.onScreenStickers,
      musicId: mediaInfo.musicId,
      musicTitle: mediaInfo.musicTitle,
      musicAuthor: mediaInfo.musicAuthor,
      musicPlayUrl: mediaInfo.musicPlayUrl,
      imageUrls: mediaInfo.imageUrls,
      gridLabels: [],
    };
  }

  // Gắn nhãn bằng chữ trên lưới (PRO): Bài nổi bật, Đang tăng nhanh, Tương tác bất thường, Gắn giỏ Shop, Quảng cáo
  function enrichVideosWithProLabels(videos) {
    if (!Array.isArray(videos) || videos.length === 0) return [];
    const sortedViews = videos
      .map((v) => Number(v.views || 0))
      .filter((x) => x > 0)
      .sort((a, b) => a - b);
    const medianViews =
      sortedViews.length > 0 ? sortedViews[Math.floor(sortedViews.length / 2)] : 5000;
    const avgVelocity =
      videos.reduce((s, v) => s + Number(v.viewsPerHour || 0), 0) / Math.max(1, videos.length);

    return videos.map((v) => {
      const labels = [];
      if (v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)) {
        const pCount = Array.isArray(v.cartProducts) && v.cartProducts.length > 0 ? v.cartProducts.length : 1;
        labels.push({ text: `Gắn giỏ Shop (${pCount})`, code: 'SHOP_CART', tone: 'accent' });
      }
      if (v.views >= Math.max(8000, medianViews * 1.75)) {
        labels.push({ text: 'Bài nổi bật', tone: 'pos' });
      }
      if ((v.viewsPerHour || 0) >= Math.max(400, avgVelocity * 1.8)) {
        labels.push({ text: 'Đang tăng nhanh', tone: 'pos' });
      }
      if (v.engagementRate >= 14 || (v.views >= 15000 && v.engagementRate > 0 && v.engagementRate < 0.45)) {
        labels.push({ text: 'Tương tác bất thường', tone: 'warn' });
      }
      if (v.isSponsored) {
        labels.push({ text: 'Quảng cáo', code: 'AD_SPONSORED', tone: 'warn' });
      }
      return {
        ...v,
        gridLabels: labels,
      };
    });
  }

  // Bóc tách thống kê Giờ đăng, Hashtag, Âm thanh & Lượt xem theo Ngày đăng (PRO)
  function computePostingAnalytics(videos) {
    const hourMap = {};
    const hashtagMap = {};
    const musicMap = {};
    const dateMap = {};

    for (const v of videos || []) {
      const vw = Number(v.views || 0);
      const lk = Number(v.likes || 0);
      const isShop = Boolean(v.hasYellowCart || (v.cartProducts && v.cartProducts.length > 0));

      // 1. Giờ đăng (UTC+7)
      const ts = Number(v.createTime || 0);
      const vnHour =
        ts > 100000000 ? new Date((ts + 7 * 3600) * 1000).getUTCHours() : 20;
      const hourKey = `${String(vnHour).padStart(2, '0')}:00`;
      if (!hourMap[hourKey]) {
        hourMap[hourKey] = { hourLabel: hourKey, videoCount: 0, totalViews: 0 };
      }
      hourMap[hourKey].videoCount++;
      hourMap[hourKey].totalViews += vw;

      // 2. Hashtag
      for (const tag of v.hashtags || []) {
        const cleanTag = String(tag || '').toLowerCase();
        if (!cleanTag) continue;
        if (!hashtagMap[cleanTag]) {
          hashtagMap[cleanTag] = { hashtag: cleanTag, tag: cleanTag, videoCount: 0, totalViews: 0 };
        }
        hashtagMap[cleanTag].videoCount++;
        hashtagMap[cleanTag].totalViews += vw;
      }

      // 3. Nhạc nền / Âm thanh
      const mKey = v.musicId || v.musicTitle || 'Âm thanh gốc';
      if (!musicMap[mKey]) {
        musicMap[mKey] = {
          musicId: v.musicId || '',
          musicTitle: v.musicTitle || 'Âm thanh gốc',
          musicAuthor: v.musicAuthor || v.handle || '',
          musicPlayUrl: v.musicPlayUrl || '',
          videoCount: 0,
          totalViews: 0,
        };
      }
      musicMap[mKey].videoCount++;
      musicMap[mKey].totalViews += vw;
      if (!musicMap[mKey].musicPlayUrl && v.musicPlayUrl) {
        musicMap[mKey].musicPlayUrl = v.musicPlayUrl;
      }

      // 4. Ngày đăng
      const dKey = String(v.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      if (!dateMap[dKey]) {
        dateMap[dKey] = {
          date: dKey,
          videoCount: 0,
          totalViews: 0,
          totalLikes: 0,
          shopVideoCount: 0,
        };
      }
      dateMap[dKey].videoCount++;
      dateMap[dKey].totalViews += vw;
      dateMap[dKey].totalLikes += lk;
      if (isShop) dateMap[dKey].shopVideoCount++;
    }

    const byHour = Object.values(hourMap)
      .map((h) => ({
        ...h,
        avgViews: h.videoCount === 0 ? 0 : Math.round(h.totalViews / h.videoCount),
      }))
      .sort((a, b) => b.avgViews - a.avgViews);

    const byHashtag = Object.values(hashtagMap)
      .map((t) => ({
        ...t,
        avgViews: t.videoCount === 0 ? 0 : Math.round(t.totalViews / t.videoCount),
      }))
      .sort((a, b) => b.videoCount - a.videoCount || b.avgViews - a.avgViews)
      .slice(0, 15);

    const byMusic = Object.values(musicMap)
      .map((m) => ({
        ...m,
        avgViews: m.videoCount === 0 ? 0 : Math.round(m.totalViews / m.videoCount),
      }))
      .sort((a, b) => b.videoCount - a.videoCount || b.avgViews - a.avgViews)
      .slice(0, 12);

    const byDate = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));

    return {
      byHour,
      byHashtag,
      byMusic,
      byDate,
      hourlyList: byHour,
      hashtagList: byHashtag,
      musicList: byMusic,
      dateViewList: byDate,
    };
  }

  // Quét Mặt hàng theo ngày đăng, đếm số bài làm cho từng SP, gom theo Shop & chấm điểm Super VIP
  function aggregateProductsAndShops(videos) {
    const prodMap = {};
    const shopMap = {};

    for (const v of videos || []) {
      const products = Array.isArray(v.cartProducts) ? v.cartProducts : [];
      const fallbackProducts =
        products.length > 0
          ? products
          : v.hasYellowCart
            ? [
                {
                  productId: v.cartProductId || `SP-${String(v.videoId).slice(-6)}`,
                  title: v.cartAnchorTitle || 'Sản phẩm gắn giỏ TikTok Shop',
                  priceVnd: 0,
                  commissionRatePct: 10,
                  sellerId: v.cartSellerId || 'shop_b2c',
                  shopName: v.cartSellerId ? `Gian hàng #${String(v.cartSellerId).slice(-6)}` : 'Gian hàng TikTok Shop',
                  productUrl:
                    v.cartAnchorUrl ||
                    (v.cartProductId
                      ? `https://shop.tiktok.com/view/product/${v.cartProductId}?region=VN&locale=vi-VN`
                      : v.videoUrl),
                },
              ]
            : [];

      for (const p of fallbackProducts) {
        const pid = String(p.productId || p.title || '').trim();
        if (!pid) continue;
        const sellerKey = String(p.sellerId || p.shopName || 'shop_default').trim();
        const shopName = String(
          p.shopName || (p.sellerId ? `Gian hàng #${String(p.sellerId).slice(-6)}` : 'Gian hàng TikTok Shop')
        ).trim();

        if (!prodMap[pid]) {
          const priceVnd = Number(p.priceVnd || 0) > 0 ? Math.round(Number(p.priceVnd)) : 0;
          const commPct = Number(p.commissionRatePct || 10) > 0 ? Number(p.commissionRatePct || 10) : 10;
          prodMap[pid] = {
            productId: p.productId || pid,
            title: p.title || 'Sản phẩm TikTok Shop',
            sellerId: p.sellerId || sellerKey,
            shopName,
            priceVnd,
            hasRealPrice: priceVnd > 0,
            priceText: priceVnd > 0 ? p.priceText || `${priceVnd.toLocaleString('vi-VN')} đ` : 'TikTok ẩn giá',
            commissionRatePct: commPct,
            commissionPct: commPct,
            estimatedCommissionVnd: priceVnd > 0 ? Math.round(priceVnd * (commPct / 100)) : 0,
            commissionVnd: priceVnd > 0 ? Math.round(priceVnd * (commPct / 100)) : 0,
            rawSoldCount: Number(p.soldCount || 0),
            stockCount: Number(p.stockCount || 0) > 0 ? Number(p.stockCount) : 0,
            productUrl:
              p.productUrl ||
              (p.productId
                ? `https://shop.tiktok.com/view/product/${p.productId}?region=VN&locale=vi-VN`
                : ''),
            videoCount: 0,
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            firstDate: v.publishedAt || '',
            latestDate: v.publishedAt || '',
          };
        } else if (Number(p.priceVnd || 0) > 0 && !prodMap[pid].priceVnd) {
          const priceVnd = Math.round(Number(p.priceVnd));
          const commPct = prodMap[pid].commissionRatePct || 10;
          prodMap[pid].priceVnd = priceVnd;
          prodMap[pid].hasRealPrice = true;
          prodMap[pid].priceText = p.priceText || `${priceVnd.toLocaleString('vi-VN')} đ`;
          prodMap[pid].estimatedCommissionVnd = Math.round(priceVnd * (commPct / 100));
          prodMap[pid].commissionVnd = prodMap[pid].estimatedCommissionVnd;
        }

        const entry = prodMap[pid];
        entry.videoCount++;
        entry.totalViews += Number(v.views || 0);
        entry.totalLikes += Number(v.likes || 0);
        entry.totalComments += Number(v.comments || 0);
        if (v.publishedAt) {
          if (!entry.firstDate || v.publishedAt < entry.firstDate) entry.firstDate = v.publishedAt;
          if (!entry.latestDate || v.publishedAt > entry.latestDate) entry.latestDate = v.publishedAt;
        }

        if (!shopMap[sellerKey]) {
          shopMap[sellerKey] = {
            sellerId: sellerKey,
            shopName,
            productIds: new Set(),
            videoCount: 0,
            totalViews: 0,
            estimatedGmv: 0,
          };
        }
        shopMap[sellerKey].productIds.add(pid);
        shopMap[sellerKey].videoCount++;
        shopMap[sellerKey].totalViews += Number(v.views || 0);
      }
    }

    const productsList = Object.values(prodMap)
      .map((item) => {
        const avgViews = item.videoCount === 0 ? 0 : Math.round(item.totalViews / item.videoCount);
        const soldCount =
          item.rawSoldCount > 0
            ? item.rawSoldCount
            : Math.max(12, Math.round(item.totalViews * 0.0018));
        const dailySalesVelocity = Math.max(2, Math.round(soldCount / 14));
        const estimatedGmv = soldCount * item.priceVnd;
        const scoreRaw =
          Math.min(35, item.videoCount * 9) +
          Math.min(35, Math.round((dailySalesVelocity / 25) * 35)) +
          Math.min(30, Math.round((avgViews / 25000) * 30));
        const productScore = Math.max(45, Math.min(98, scoreRaw));
        const competitionLabel =
          item.videoCount >= 4 || dailySalesVelocity >= 35
            ? 'Cạnh tranh cao'
            : item.videoCount >= 2 || dailySalesVelocity >= 12
              ? 'Cạnh tranh vừa'
              : 'Cạnh tranh thấp';

        if (shopMap[item.sellerId]) {
          shopMap[item.sellerId].estimatedGmv += estimatedGmv;
        }

        return {
          ...item,
          avgViews,
          soldCount,
          dailySalesVelocity,
          dailyVelocity: dailySalesVelocity,
          estimatedGmv,
          stockStatusLabel: `Sẵn kho (${item.stockCount})`,
          productScore,
          competitionLabel,
          competitionLevel: competitionLabel,
        };
      })
      .sort((a, b) => b.videoCount - a.videoCount || b.totalViews - a.totalViews);

    const shopsList = Object.values(shopMap)
      .map((s) => ({
        sellerId: s.sellerId,
        shopName: s.shopName,
        productCount: s.productIds.size,
        videoCount: s.videoCount,
        totalVideos: s.videoCount,
        totalViews: s.totalViews,
        estimatedGmv: s.estimatedGmv,
      }))
      .sort((a, b) => b.videoCount - a.videoCount || b.totalViews - a.totalViews);

    return { productsList, shopsList };
  }

  // Bộ phân loại 10 nhóm Ý định mua hàng (Buying Intent) & Cảnh báo Rủi ro / Chê (Objections)
  const COMMENT_INTENT_RULES = [
    {
      group: 'BUYING',
      label: 'Để lại SĐT / Inbox tư vấn',
      regex: /\b(0[35789]\d{8})\b|\b(ib|inbox|check\s*ib|rep\s*ib|tư\s*vấn|tu\s*van|zalo)\b/i,
    },
    {
      group: 'BUYING',
      label: 'Hỏi chỗ mua / Xin link giỏ hàng',
      regex: /\b(mua\s*ở\s*đâu|mua\s*o\s*dau|xin\s*link|link\s*mua|giỏ\s*hàng|gio\s*hang|ghim\s*giỏ|đặt\s*hàng|dat\s*hang|chốt\s*đơn)\b/i,
    },
    {
      group: 'BUYING',
      label: 'Hỏi giá / Săn mã giảm giá',
      regex: /\b(giá\s*bao\s*nhiêu|gia\s*bao\s*nhieu|bao\s*nhiêu\s*tiền|mấy\s*tiền|nhiêu\s*vậy|giá\s*sao|mã\s*giảm|voucher|săn\s*sale|how\s*much|price)\b/i,
    },
    {
      group: 'BUYING',
      label: 'Hỏi tồn kho / Phân loại / Độ hợp da',
      regex: /\b(còn\s*hàng|con\s*hang|hết\s*hàng|còn\s*size|màu\s*nào|loại\s*nào|da\s*dầu|da\s*khô|da\s*nhạy\s*cảm|da\s*mụn|mẹ\s*bầu|bầu\s*dùng|freeship|phí\s*ship)\b/i,
    },
    {
      group: 'OBJECTION',
      label: 'Nghi ngờ hàng giả / Auth-Fake',
      regex: /\b(hàng\s*giả|hang\s*gia|hàng\s*fake|hang\s*fake|auth\s*hay\s*fake|chính\s*hãng\s*không|sợ\s*fake|check\s*code|tem\s*phụ)\b/i,
    },
    {
      group: 'OBJECTION',
      label: 'Phàn nàn chất lượng / Kích ứng',
      regex: /\b(nổi\s*mụn|noi\s*mun|kích\s*ứng|kich\s*ung|dị\s*ứng|vón\s*cục|bết\s*dính|phí\s*tiền|không\s*hiệu\s*quả|giao\s*sai|vỡ\s*hàng)\b/i,
    },
    {
      group: 'OBJECTION',
      label: 'Nghi ngờ Seeding / Quảng cáo lố',
      regex: /\b(quảng\s*cáo\s*lố|seeding|ăn\s*tiền\s*quảng\s*cáo|pr\s*ảo|review\s*ảo|lùa\s*gà|đừng\s*tin)\b/i,
    },
    {
      group: 'FEEDBACK',
      label: 'Khách khen / Đã mua trải nghiệm tốt',
      regex: /\b(đã\s*mua|mới\s*nhận|dùng\s*hợp|dùng\s*thích|thấm\s*nhanh|không\s*bết|mùi\s*thơm|đáng\s*tiền|ưng\s*lắm|xài\s*êm|lọ\s*thứ|tuýp\s*thứ)\b/i,
    },
  ];

  function parseTikTokCommentsJson(data, reqUrl) {
    const list = Array.isArray(data?.comments) ? data.comments : [];
    if (list.length === 0) return;

    let awemeId = '';
    const m = String(reqUrl || '').match(/[?&]aweme_id=(\d+)/);
    if (m && m[1]) awemeId = m[1];
    if (!awemeId && list[0]?.aweme_id) awemeId = String(list[0].aweme_id);
    if (!awemeId) awemeId = getCurrentUrlInfo().videoId || '';
    if (!awemeId) return;

    const prev = state.commentsByVideoId[awemeId] || {
      seenCids: {},
      totalScanned: 0,
      buyingIntentCount: 0,
      objectionCount: 0,
      feedbackCount: 0,
      buyingSamples: [],
      objectionSamples: [],
      allComments: [],
    };

    for (const c of list) {
      if (!c || typeof c !== 'object') continue;
      const cid = String(c.cid || '');
      const text = String(c.text || '').trim();
      if (!cid || !text || prev.seenCids[cid]) continue;
      prev.seenCids[cid] = true;
      prev.totalScanned++;

      const userHandle = normHandle(c.user?.unique_id || c.user?.nickname || 'user');
      const likes = parseCompactNumber(c.digg_count ?? 0);
      const phoneMatch = text.match(/\b(0[35789]\d{8})\b/);
      const extractedPhone = phoneMatch ? phoneMatch[1] : '';
      let matchedGroup = 'GENERAL';
      let matchedLabel = 'Bình luận chung';

      for (const rule of COMMENT_INTENT_RULES) {
        if (rule.regex.test(text)) {
          matchedGroup = rule.group;
          matchedLabel = rule.label;
          if (rule.group === 'BUYING') {
            prev.buyingIntentCount++;
            if (prev.buyingSamples.length < 6) {
              prev.buyingSamples.push({
                cid,
                userHandle,
                text: text.slice(0, 120),
                label: rule.label,
                likes,
              });
            }
          } else if (rule.group === 'OBJECTION') {
            prev.objectionCount++;
            if (prev.objectionSamples.length < 6) {
              prev.objectionSamples.push({
                cid,
                userHandle,
                text: text.slice(0, 120),
                label: rule.label,
                likes,
              });
            }
          } else if (rule.group === 'FEEDBACK') {
            prev.feedbackCount++;
          }
          break;
        }
      }

      if (prev.allComments.length < 300) {
        prev.allComments.push({
          cid,
          userHandle,
          text,
          likes,
          intentGroup: matchedGroup,
          intentLabel: matchedLabel,
          extractedPhone,
        });
      }
    }

    state.commentsByVideoId[awemeId] = prev;
  }

  // Tính Điểm KOC (0-100), Tần suất đăng/tuần, Tỷ lệ gắn giỏ Shop %, Khung giờ vàng đăng bài (UTC+7)
  function computeChannelHealthSummary(videos, followers) {
    if (!Array.isArray(videos) || videos.length === 0) {
      return {
        kocScore: 0,
        postsWeekly: 0,
        shopSharePct: 0,
        goldenHours: ['19:00', '20:00', '12:00'],
      };
    }

    const nonPinned = videos.filter((v) => !v.isPinned);
    const pool = (nonPinned.length >= 3 ? nonPinned : videos).slice(0, 20);
    const totalViews = pool.reduce((s, v) => s + (v.views || 0), 0);
    const avgViews = pool.length === 0 ? 0 : Math.round(totalViews / pool.length);
    const avgEr =
      pool.length === 0
        ? 0
        : pool.reduce((s, v) => s + (v.engagementRate || 0), 0) / pool.length;

    const shopVideosCount = pool.filter(
      (v) => v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)
    ).length;
    const shopSharePct =
      pool.length === 0 ? 0 : Math.round((shopVideosCount / pool.length) * 100);

    // Tần suất đăng bài/tuần
    const timestamps = pool
      .map((v) => Number(v.createTime || 0))
      .filter((ts) => ts > 1000000000)
      .sort((a, b) => b - a);

    let postsWeekly = 3.5;
    if (timestamps.length >= 2) {
      const spanDays = Math.max(1, (timestamps[0] - timestamps[timestamps.length - 1]) / 86400);
      postsWeekly = Number(Math.min(28, (timestamps.length / spanDays) * 7).toFixed(1));
    }

    // Khung giờ vàng theo giờ Việt Nam (UTC+7)
    const hourBuckets = {};
    for (const v of pool) {
      const ts = Number(v.createTime || 0);
      if (ts > 1000000000) {
        const vnHour = new Date((ts + 7 * 3600) * 1000).getUTCHours();
        const key = `${String(vnHour).padStart(2, '0')}:00`;
        hourBuckets[key] = (hourBuckets[key] || 0) + Math.max(1, v.views || 1);
      }
    }
    const sortedHours = Object.entries(hourBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);
    const goldenHours = sortedHours.length > 0 ? sortedHours : ['20:00', '19:00', '12:00'];

    // Điểm KOC (0-100): Tương tác (35đ) + View/Follower (30đ) + Tần suất đăng (20đ) + Năng lực gắn giỏ Shop (15đ)
    const erScore = Math.min(35, Math.round((avgEr / 6) * 35));
    const vfRatio = followers > 0 ? avgViews / followers : 0.15;
    const vfScore = Math.min(30, Math.round((vfRatio / 0.25) * 30));
    const freqScore = Math.min(20, Math.round((postsWeekly / 4) * 20));
    const shopScore = Math.min(15, Math.round((shopSharePct / 40) * 15));
    const kocScore = Math.min(100, Math.max(15, erScore + vfScore + freqScore + shopScore));

    return {
      kocScore,
      postsWeekly,
      shopSharePct,
      goldenHours,
    };
  }

  function mergeVideosForHandle(handle, newVideos) {
    const clean = normHandle(handle);
    if (!clean || !Array.isArray(newVideos) || newVideos.length === 0) return;
    const hasRealNumericId = newVideos.some((v) => v && /^\d{15,22}$/.test(String(v.videoId)));
    const existing = (state.videosByHandle[clean] || []).filter(
      (v) => !(hasRealNumericId && /^(?:feed-|dom-)/.test(String(v?.videoId || '')))
    );
    const byId = new Map();
    for (const v of existing) {
      if (v && v.videoId) byId.set(v.videoId, v);
    }
    for (const v of newVideos) {
      if (!v || !v.videoId) continue;
      const prev = byId.get(v.videoId);
      if (prev) {
        const preferPrevApi = Boolean(prev && !prev._fromDomFallback && v._fromDomFallback);
        const mergedCartProducts =
          Array.isArray(v.cartProducts) && v.cartProducts.length > 0
            ? v.cartProducts
            : prev.cartProducts || [];
        const mergedHasYellowCart = Boolean(
          prev.hasYellowCart || v.hasYellowCart || mergedCartProducts.length > 0
        );
        byId.set(v.videoId, {
          ...prev,
          ...(preferPrevApi ? {} : v),
          views: Math.max(prev.views || 0, v.views || 0),
          likes: preferPrevApi ? prev.likes || v.likes || 0 : Math.max(prev.likes || 0, v.likes || 0),
          comments: preferPrevApi ? prev.comments || v.comments || 0 : Math.max(prev.comments || 0, v.comments || 0),
          shares: preferPrevApi ? prev.shares || v.shares || 0 : Math.max(prev.shares || 0, v.shares || 0),
          saves: preferPrevApi ? prev.saves || v.saves || 0 : Math.max(prev.saves || 0, v.saves || 0),
          publishedAt: preferPrevApi ? prev.publishedAt || v.publishedAt : v.publishedAt || prev.publishedAt,
          createTime: preferPrevApi ? prev.createTime || v.createTime : v.createTime || prev.createTime,
          viewsPerHour: preferPrevApi ? prev.viewsPerHour || v.viewsPerHour : v.viewsPerHour || prev.viewsPerHour,
          hasYellowCart: mergedHasYellowCart,
          isSponsored: Boolean(prev.isSponsored || v.isSponsored),
          cartProducts: mergedCartProducts,
          transcriptText: v.transcriptText || prev.transcriptText || '',
          playableUrl: v.playableUrl || prev.playableUrl || '',
          _fromDomFallback: Boolean(prev._fromDomFallback && v._fromDomFallback),
        });
      } else {
        byId.set(v.videoId, v);
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.createTime || 0) - (a.createTime || 0);
    });
    state.videosByHandle[clean] = enrichVideosWithProLabels(merged.slice(0, 300));
  }

  function mergeProfileForHandle(handle, profileData) {
    const clean = normHandle(handle);
    if (!clean || !profileData) return;
    const prev = state.profilesByHandle[clean] || {};
    const bio = profileData.bio ?? prev.bio ?? '';
    const contacts = extractContactFromBio(bio);
    state.profilesByHandle[clean] = {
      ...prev,
      ...profileData,
      handle: clean,
      extractedPhone: profileData.extractedPhone || contacts.phone || prev.extractedPhone || '',
      extractedEmail: profileData.extractedEmail || contacts.email || prev.extractedEmail || '',
    };
  }

  function mergeSellerMetricsForHandle(handle, sellerData) {
    const clean = normHandle(handle);
    if (!clean || !sellerData) return;
    const prev = state.sellerMetricsByHandle[clean] || {};
    state.sellerMetricsByHandle[clean] = {
      ...prev,
      ...sellerData,
      handle: clean,
    };
    state.activeSellerHandle = clean;
  }

  function parseTikTokUserDetailJson(data) {
    const userInfo = data?.userInfo || data?.webapp?.['user-detail']?.userInfo;
    const u = userInfo?.user || data?.user;
    if (!u) return;
    const s = userInfo?.stats || u?.stats || u || {};
    const handle = normHandle(
      u.uniqueId || u.unique_id || u.short_id || u.sec_uid?.slice(-10) || u.nickname
    );
    if (!handle) return;
    state.activeSellerHandle = handle;
    mergeProfileForHandle(handle, {
      handle,
      displayName: String(u.nickname || handle),
      avatarUrl: String(
        u.avatarLarger ||
          u.avatarMedium ||
          u.avatarThumb ||
          u.avatar_larger?.url_list?.[0] ||
          u.avatar_thumb?.url_list?.[0] ||
          ''
      ),
      bio: String(u.signature || ''),
      verified: Boolean(u.verified || u.custom_verify),
      followers: parseCompactNumber(
        s.followerCount ?? s.follower_count ?? s.mplatform_followers_count ?? 0
      ),
      following: parseCompactNumber(s.followingCount ?? s.following_count ?? 0),
      totalLikes: parseCompactNumber(
        s.heartCount ?? s.heart ?? s.diggCount ?? s.total_favorited ?? 0
      ),
      videoCount: parseCompactNumber(s.videoCount ?? s.aweme_count ?? 0),
    });
  }

  function parseTikTokItemListJson(data) {
    const list = Array.isArray(data?.itemList)
      ? data.itemList
      : Array.isArray(data?.aweme_list)
        ? data.aweme_list
        : [];
    if (list.length === 0) return;
    const urlInfo = getCurrentUrlInfo();
    const firstAuthor = list[0]?.author;
    const firstHandle =
      normHandle(
        firstAuthor?.uniqueId ||
          firstAuthor?.unique_id ||
          firstAuthor?.short_id ||
          firstAuthor?.sec_uid?.slice(-10)
      ) || urlInfo.handle;

    if (firstHandle && (urlInfo.pageType === 'profile' || !state.activeSellerHandle)) {
      state.activeSellerHandle = firstHandle;
    }

    const normalized = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const itemAuthor = item.author || item.authorInfo || firstAuthor || {};
      const itemHandle =
        normHandle(
          itemAuthor.uniqueId ||
            itemAuthor.unique_id ||
            itemAuthor.short_id ||
            itemAuthor.sec_uid?.slice(-10)
        ) || firstHandle;
      if (itemAuthor && itemHandle) {
        const aStats = item.authorStats || itemAuthor.stats || itemAuthor || {};
        mergeProfileForHandle(itemHandle, {
          handle: itemHandle,
          displayName: String(itemAuthor.nickname || itemHandle),
          avatarUrl: String(
            itemAuthor.avatarLarger ||
              itemAuthor.avatarMedium ||
              itemAuthor.avatarThumb ||
              itemAuthor.avatar_thumb?.url_list?.[0] ||
              ''
          ),
          bio: String(itemAuthor.signature || ''),
          followers: parseCompactNumber(
            aStats.followerCount ?? itemAuthor.follower_count ?? 0
          ),
          totalLikes: parseCompactNumber(
            aStats.heartCount ?? aStats.heart ?? itemAuthor.total_favorited ?? 0
          ),
          videoCount: parseCompactNumber(
            aStats.videoCount ?? itemAuthor.aweme_count ?? 0
          ),
        });
      }
      const norm = normalizeTikTokVideo(item, itemHandle);
      if (norm) {
        normalized.push(norm);
        if (norm.handle) {
          mergeVideosForHandle(norm.handle, [norm]);
        }
      }
    }

    if (urlInfo.pageType === 'profile' && firstHandle && normalized.length > 0) {
      mergeVideosForHandle(firstHandle, normalized);
    }
  }

  function parseTikTokItemDetailJson(data) {
    const item =
      data?.itemInfo?.itemStruct ||
      data?.webapp?.['video-detail']?.itemInfo?.itemStruct ||
      data?.itemStruct;
    if (!item) return;
    const v = normalizeTikTokVideo(item, getCurrentUrlInfo().handle);
    if (v) {
      state.currentVideoDetail = v;
      if (v.handle) {
        mergeVideosForHandle(v.handle, [v]);
      }
      if (item.author) {
        const handle = normHandle(item.author.uniqueId || v.handle);
        const aStats = item.authorStats || {};
        mergeProfileForHandle(handle, {
          handle,
          displayName: String(item.author.nickname || handle),
          avatarUrl: String(item.author.avatarThumb || ''),
          bio: String(item.author.signature || ''),
          followers: parseCompactNumber(aStats.followerCount ?? 0),
          totalLikes: parseCompactNumber(aStats.heartCount ?? aStats.heart ?? 0),
          videoCount: parseCompactNumber(aStats.videoCount ?? 0),
        });
      }
      ensureSubtitleFetchedForVideo(v);
      ensureMobileCartUnlockedForVideo(v);
    }
  }

  // Bóc tách dữ liệu JSON từ TikTok Ads Manager (ads.tiktok.com)
  function parseTikTokAdsJsonDeep(obj) {
    if (!obj || typeof obj !== 'object') return;
    const visited = new Set();
    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 14 || visited.has(node)) return;
      visited.add(node);

      const m = node.metrics || node.stat_data || node;
      const d = node.dimensions || node;
      const rawVid = String(
        d.item_id ||
          d.tiktok_item_id ||
          d.video_id ||
          d.aweme_id ||
          node.item_id ||
          node.tiktok_item_id ||
          node.video_id ||
          ''
      ).trim();

      if (/^\d{15,22}$/.test(rawVid)) {
        const adsSpend = parseCompactNumber(
          m.spend ?? m.stat_cost ?? m.cost ?? m.total_cost ?? 0
        );
        const gmv = parseCompactNumber(
          m.onsite_shopping_value ??
            m.total_onsite_shopping_value ??
            m.complete_payment_value ??
            m.gmv ??
            0
        );
        const orders = parseCompactNumber(
          m.onsite_shopping ?? m.complete_payment ?? m.orders ?? m.conversions ?? 0
        );
        const impressions = parseCompactNumber(
          m.impressions ?? m.show_cnt ?? m.views ?? 0
        );
        const clicks = parseCompactNumber(m.clicks ?? m.click_cnt ?? 0);
        const ctr = Number(m.ctr ?? (impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0));
        const cvr = Number(m.cvr ?? (clicks > 0 ? ((orders / clicks) * 100).toFixed(2) : 0));
        const hookRate2s = Number(m.video_watched_2s_rate ?? m.play_2s_rate ?? 0);
        const viewRate6s = Number(m.video_watched_6s_rate ?? m.play_6s_rate ?? 0);

        const roas = adsSpend === 0 ? 0 : Number((gmv / adsSpend).toFixed(2));
        state.adsRowsByVideoId[rawVid] = {
          ...(state.adsRowsByVideoId[rawVid] || {}),
          videoId: rawVid,
          handle: normHandle(node.tiktok_name || node.author_name || node.unique_id || ''),
          campaignName: String(node.campaign_name || d.campaign_name || 'Chiến dịch TikTok Ads'),
          adsSpend,
          gmv,
          orders,
          roas,
          views: impressions,
          impressions,
          clicks,
          ctr,
          cvr,
          hookRate2s,
          viewRate6s,
        };
      }

      if (Array.isArray(node)) {
        for (const child of node) walk(child, depth + 1);
      } else {
        for (const k of Object.keys(node)) {
          walk(node[k], depth + 1);
        }
      }
    }
    walk(obj, 0);
  }

  function mergeLiveSessionForHandle(handle, liveData) {
    const clean = normHandle(handle) || state.activeSellerHandle || 'live_koc';
    if (!liveData) return;
    const prev = state.liveSessionByHandle[clean] || {
      handle: clean,
      roomId: '',
      roomTitle: '',
      isLive: false,
      isEnded: false,
      endedAt: '',
      currentViewers: 0,
      peakViewers: 0,
      totalViews: 0,
      likes: 0,
      durationMinutes: 0,
      sessionGmv: 0,
      sessionOrders: 0,
      sessionItemsSold: 0,
      sessionGpm: 0,
      sessionCtrPct: 0,
      sessionCvrPct: 0,
      avgWatchTimeSec: 0,
      newFollowers: 0,
      liveBagProducts: [],
      liveComments: [],
    };
    const mergedBag =
      Array.isArray(liveData.liveBagProducts) && liveData.liveBagProducts.length > 0
        ? liveData.liveBagProducts
        : prev.liveBagProducts || [];
    const mergedComments =
      Array.isArray(liveData.liveComments) && liveData.liveComments.length > 0
        ? liveData.liveComments
        : prev.liveComments || [];
    const bagEstimatedGmv = mergedBag.reduce(
      (sum, p) => sum + Math.round(Number(p.priceVnd || 0) * Number(p.soldCount || 0)),
      0
    );
    const bagEstimatedSold = mergedBag.reduce(
      (sum, p) => sum + Math.round(Number(p.soldCount || 0)),
      0
    );
    const nextIsEnded =
      liveData.isEnded === true
        ? true
        : liveData.isLive === true && liveData.isEnded === false
          ? false
          : Boolean(prev.isEnded);
    const nextIsLive = nextIsEnded ? false : Boolean(liveData.isLive ?? prev.isLive);
    const nextTotalViews = Math.max(
      Number(liveData.totalViews || 0),
      Number(prev.totalViews || 0),
      Number(liveData.currentViewers || 0)
    );
    const nextSessionGmv = Math.max(
      Number(liveData.sessionGmv || 0),
      Number(prev.sessionGmv || 0),
      bagEstimatedGmv
    );
    const nextSessionItemsSold = Math.max(
      Number(liveData.sessionItemsSold || 0),
      Number(prev.sessionItemsSold || 0),
      bagEstimatedSold
    );
    const nextSessionOrders = Math.max(
      Number(liveData.sessionOrders || 0),
      Number(prev.sessionOrders || 0),
      nextSessionItemsSold > 0 ? Math.max(1, Math.round(nextSessionItemsSold * 0.85)) : 0
    );
    const computedGpm =
      nextTotalViews > 0 && nextSessionGmv > 0
        ? Math.round((nextSessionGmv / nextTotalViews) * 1000)
        : 0;

    state.liveSessionByHandle[clean] = {
      ...prev,
      ...liveData,
      handle: clean,
      isLive: nextIsLive,
      isEnded: nextIsEnded,
      endedAt:
        liveData.endedAt ||
        prev.endedAt ||
        (nextIsEnded
          ? new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : ''),
      currentViewers: nextIsEnded
        ? 0
        : Math.max(Number(liveData.currentViewers || 0), Number(prev.currentViewers || 0)),
      peakViewers: Math.max(
        Number(liveData.peakViewers || 0),
        Number(liveData.currentViewers || 0),
        Number(prev.peakViewers || 0)
      ),
      totalViews: nextTotalViews,
      likes: Math.max(Number(liveData.likes || 0), Number(prev.likes || 0)),
      durationMinutes: Math.max(
        Number(liveData.durationMinutes || 0),
        Number(prev.durationMinutes || 0)
      ),
      sessionGmv: nextSessionGmv,
      sessionOrders: nextSessionOrders,
      sessionItemsSold: nextSessionItemsSold,
      sessionGpm: Math.max(
        Number(liveData.sessionGpm || 0),
        Number(prev.sessionGpm || 0),
        computedGpm
      ),
      sessionCtrPct:
        Number(liveData.sessionCtrPct || 0) || Number(prev.sessionCtrPct || 0) || 0,
      sessionCvrPct:
        Number(liveData.sessionCvrPct || 0) || Number(prev.sessionCvrPct || 0) || 0,
      avgWatchTimeSec: Math.max(
        Number(liveData.avgWatchTimeSec || 0),
        Number(prev.avgWatchTimeSec || 0)
      ),
      newFollowers: Math.max(
        Number(liveData.newFollowers || 0),
        Number(prev.newFollowers || 0)
      ),
      liveBagProducts: mergedBag,
      liveComments: mergedComments,
    };
    if (clean !== 'live_koc') {
      state.activeSellerHandle = clean;
    }
  }

  // Bóc tách dữ liệu JSON từ TikTok Seller / Affiliate Creator Marketplace (Bao gồm bộ chỉ số Live Affiliate chuyên sâu)
  function parseTikTokSellerJsonDeep(obj) {
    if (!obj || typeof obj !== 'object') return;
    const visited = new Set();
    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 14 || visited.has(node)) return;
      visited.add(node);

      const rawHandle =
        node.handle ||
        node.creator_handle ||
        node.unique_id ||
        node.uniqueId ||
        node.tiktok_handle ||
        node.user_name ||
        node.author_id;
      const hasCreatorIndicators =
        rawHandle &&
        (node.follower_cnt !== undefined ||
          node.follower_count !== undefined ||
          node.followers !== undefined ||
          node.gmv !== undefined ||
          node.med_gmv_revenue !== undefined ||
          node.live_gmv !== undefined ||
          node.live_gpm !== undefined ||
          node.units_sold !== undefined ||
          node.items_sold !== undefined ||
          node.gpm !== undefined ||
          node.video_avg_view_cnt !== undefined ||
          node.live_avg_view_cnt !== undefined);

      if (hasCreatorIndicators && typeof rawHandle === 'string') {
        const h = normHandle(rawHandle);
        if (h && h.length >= 2) {
          const prevSeller = state.sellerMetricsByHandle[h] || {};
          const followers = parseCompactNumber(
            node.follower_cnt ?? node.follower_count ?? node.followers ?? prevSeller.followers ?? 0
          );
          const gmv = parseCompactNumber(
            node.gmv?.amount ??
              node.gmv ??
              node.med_gmv_revenue?.amount ??
              node.med_gmv_revenue ??
              node.total_gmv ??
              prevSeller.recentRevenue ??
              0
          );
          const itemsSold = parseCompactNumber(
            node.units_sold ?? node.items_sold ?? node.sold_count ?? node.order_cnt ?? prevSeller.itemsSold ?? 0
          );
          const gpm = parseCompactNumber(
            node.gpm?.amount ?? node.gpm ?? node.video_gpm?.amount ?? node.video_gpm ?? prevSeller.gpm ?? 0
          );
          const aov = parseCompactNumber(
            node.aov?.amount ??
              node.aov ??
              node.avg_order_value ??
              (itemsSold > 0 && gmv > 0 ? Math.round(gmv / itemsSold) : prevSeller.aov || 0)
          );
          const avgViews = parseCompactNumber(
            node.video_avg_view_cnt ?? node.avg_views ?? node.video_views ?? prevSeller.avgViews ?? 0
          );

          // Bộ chỉ số Live Affiliate 30 ngày chuyên sâu
          const rawLivePct = parsePercentValue(
            node.live_gmv_pct ?? node.live_gmv_ratio ?? node.gmv_share_live ?? null
          );
          const rawVideoPct = parsePercentValue(
            node.video_gmv_pct ?? node.video_gmv_ratio ?? node.gmv_share_video ?? null
          );
          const gmvShareLive = rawLivePct !== null ? rawLivePct : prevSeller.gmvShareLive ?? 14;
          const gmvShareVideo = rawVideoPct !== null ? rawVideoPct : prevSeller.gmvShareVideo ?? 80;
          const gmvShareProductCard = Math.max(0, 100 - gmvShareVideo - gmvShareLive);

          const rawLiveGmv = parseCompactNumber(
            node.live_gmv?.amount ??
              node.live_gmv ??
              node.live_med_gmv_revenue?.amount ??
              node.live_med_gmv_revenue ??
              0
          );
          const liveGmv =
            rawLiveGmv > 0
              ? rawLiveGmv
              : gmv > 0 && gmvShareLive > 0
                ? Math.round(gmv * (gmvShareLive / 100))
                : prevSeller.liveGmv || 0;

          const rawVideoGmv = parseCompactNumber(
            node.video_gmv?.amount ??
              node.video_gmv ??
              node.video_med_gmv_revenue?.amount ??
              0
          );
          const videoGmv =
            rawVideoGmv > 0
              ? rawVideoGmv
              : gmv > 0 && gmvShareVideo > 0
                ? Math.round(gmv * (gmvShareVideo / 100))
                : prevSeller.videoGmv || 0;

          const liveGpm = parseCompactNumber(
            node.live_gpm?.amount ?? node.live_gpm ?? node.gpm_live ?? prevSeller.liveGpm ?? 0
          );
          const videoGpm = parseCompactNumber(
            node.video_gpm?.amount ?? node.video_gpm ?? prevSeller.videoGpm ?? gpm
          );
          const liveSessionCount = parseCompactNumber(
            node.live_cnt ??
              node.live_count ??
              node.live_stream_cnt ??
              node.live_sessions_30d ??
              prevSeller.liveSessionCount ??
              0
          );
          const liveAvgViews = parseCompactNumber(
            node.live_avg_view_cnt ??
              node.live_avg_views ??
              node.avg_live_views ??
              prevSeller.liveAvgViews ??
              0
          );
          const livePeakViewers = parseCompactNumber(
            node.live_pcu ??
              node.peak_concurrent_users ??
              node.max_viewers ??
              prevSeller.livePeakViewers ??
              0
          );
          const liveAvgDurationMin = parseCompactNumber(
            node.live_avg_duration_min ??
              (node.live_avg_duration ? Math.round(Number(node.live_avg_duration) / 60) : 0) ??
              prevSeller.liveAvgDurationMin ??
              0
          );
          const liveItemsSold = parseCompactNumber(
            node.live_units_sold ??
              node.live_items_sold ??
              (itemsSold > 0 && gmvShareLive > 0 ? Math.round(itemsSold * (gmvShareLive / 100)) : 0) ??
              prevSeller.liveItemsSold ??
              0
          );
          const liveCtrPct =
            Number(node.live_ctr ?? node.live_click_through_rate ?? prevSeller.liveCtrPct ?? 0) || 0;
          const liveCvrPct =
            Number(node.live_cvr ?? node.live_conversion_rate ?? prevSeller.liveCvrPct ?? 0) || 0;

          mergeProfileForHandle(h, {
            handle: h,
            displayName: String(node.nickname || node.creator_name || node.display_name || h),
            avatarUrl: String(node.avatar?.url_list?.[0] || node.avatar_url || ''),
            followers,
          });

          mergeSellerMetricsForHandle(h, {
            followers,
            recentRevenue: gmv,
            itemsSold,
            gpm,
            aov,
            avgViews,
            gmvShareVideo,
            gmvShareLive,
            gmvShareProductCard,
            liveGmv,
            videoGmv,
            liveGpm,
            videoGpm,
            liveSessionCount,
            liveAvgViews,
            livePeakViewers,
            liveAvgDurationMin,
            liveItemsSold,
            liveCtrPct,
            liveCvrPct,
          });
        }
      }

      if (Array.isArray(node)) {
        for (const child of node) walk(child, depth + 1);
      } else {
        for (const k of Object.keys(node)) {
          walk(node[k], depth + 1);
        }
      }
    }
    walk(obj, 0);
  }

  // Bóc tách dữ liệu Phiên Livestream đang phát, Giỏ hàng Phiên Live & Báo cáo Tổng kết khi Ca Live kết thúc
  function parseLiveRoomJsonDeep(obj) {
    if (!obj || typeof obj !== 'object') return;
    const visited = new Set();
    const urlInfo = getCurrentUrlInfo();
    let resolvedHandle = urlInfo.handle || state.activeSellerHandle || '';
    let roomId = '';
    let roomTitle = '';
    let isLive = urlInfo.pageType === 'live';
    let isEnded = false;
    let currentViewers = 0;
    let peakViewers = 0;
    let totalViews = 0;
    let likes = 0;
    let durationMinutes = 0;
    let sessionGmv = 0;
    let sessionOrders = 0;
    let sessionItemsSold = 0;
    let sessionGpm = 0;
    let sessionCtrPct = 0;
    let sessionCvrPct = 0;
    let avgWatchTimeSec = 0;
    let newFollowers = 0;
    const bagProducts = [];
    const seenPid = new Set();

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 14 || visited.has(node)) return;
      visited.add(node);

      // 1. Nhận diện thông tin phòng Live (LiveRoom / roomInfo / webcast / compass live analysis)
      const owner = node.owner || node.host || node.anchor || node.broadcaster || node.creator_info;
      if (owner && typeof owner === 'object') {
        const h = normHandle(
          owner.unique_id || owner.uniqueId || owner.display_id || owner.handle || owner.short_id || ''
        );
        if (h && !resolvedHandle) {
          resolvedHandle = h;
          mergeProfileForHandle(h, {
            handle: h,
            displayName: String(owner.nickname || owner.display_name || h),
            avatarUrl: String(owner.avatar_thumb?.url_list?.[0] || owner.avatarThumb || ''),
            followers: parseCompactNumber(owner.follow_info?.follower_count ?? owner.followerCount ?? 0),
          });
        }
      }

      if (
        node.room_id ||
        node.roomId ||
        node.live_room_id ||
        (node.id_str && (node.user_count !== undefined || node.status !== undefined))
      ) {
        roomId = String(node.room_id || node.roomId || node.live_room_id || node.id_str || roomId);
        if (node.title && !roomTitle) roomTitle = String(node.title);
        if (
          node.status === 4 ||
          node.room_status === 4 ||
          node.stream_status === 'ended' ||
          node.is_finished === true ||
          Number(node.finish_time || node.end_time || 0) > 1000000000
        ) {
          isEnded = true;
          isLive = false;
        } else if (node.status === 2 || node.is_live === true) {
          isLive = true;
        }
        const curV = parseCompactNumber(
          node.user_count ?? node.concurrent_users ?? node.viewer_count ?? node.stats?.user_count ?? 0
        );
        const pkV = parseCompactNumber(
          node.max_viewers ??
            node.peak_viewers ??
            node.pcu ??
            node.peak_concurrent_users ??
            node.stats?.max_user_count ??
            0
        );
        const totV = parseCompactNumber(
          node.total_user ??
            node.stats?.total_user ??
            node.total_viewers ??
            node.cumulative_views ??
            node.live_views ??
            0
        );
        const lk = parseCompactNumber(
          node.like_count ?? node.stats?.like_count ?? node.total_likes ?? 0
        );
        const newFlw = parseCompactNumber(
          node.new_followers ??
            node.follow_cnt ??
            node.stats?.follow_count ??
            node.new_fan_count ??
            0
        );
        const watchSec = parseCompactNumber(
          node.avg_watch_duration ?? node.avg_view_duration ?? node.watch_time_avg ?? 0
        );
        if (curV > currentViewers) currentViewers = curV;
        if (pkV > peakViewers) peakViewers = pkV;
        if (totV > totalViews) totalViews = totV;
        if (lk > likes) likes = lk;
        if (newFlw > newFollowers) newFollowers = newFlw;
        if (watchSec > avgWatchTimeSec) avgWatchTimeSec = watchSec;

        const startTs = Number(node.create_time || node.start_time || node.startTime || 0);
        const endTs = Number(node.finish_time || node.end_time || node.endTime || 0);
        const rawDurSec = Number(node.duration || node.live_duration || node.stream_duration || 0);
        if (rawDurSec > 30) {
          durationMinutes = Math.max(durationMinutes, Math.round(rawDurSec / 60));
        } else if (startTs > 1000000000) {
          const refEnd = endTs > startTs ? endTs : Math.floor(Date.now() / 1000);
          durationMinutes = Math.max(1, Math.round((refEnd - startTs) / 60));
        }
      }

      // 1b. Nhận diện chỉ số Chốt sổ Ca Live từ TikTok Shop Seller Center / Data Compass Live Analysis / LIVE Center
      const rawSessionGmv = parseCompactNumber(
        node.live_gmv?.amount ??
          node.live_gmv ??
          node.room_gmv?.amount ??
          node.room_gmv ??
          node.direct_gmv?.amount ??
          node.direct_gmv ??
          0
      );
      const rawSessionOrders = parseCompactNumber(
        node.sku_orders ?? node.live_orders ?? node.paid_order_cnt ?? node.room_order_cnt ?? 0
      );
      const rawSessionSold = parseCompactNumber(
        node.live_items_sold ?? node.room_items_sold ?? node.product_sold_cnt ?? 0
      );
      const rawSessionGpm = parseCompactNumber(
        node.live_gpm?.amount ?? node.live_gpm ?? node.room_gpm ?? 0
      );
      const rawCtr = parsePercentValue(
        node.product_click_rate ?? node.live_ctr ?? node.click_through_rate ?? null
      );
      const rawCvr = parsePercentValue(
        node.click_to_order_rate ?? node.live_cvr ?? node.conversion_rate ?? null
      );
      if (rawSessionGmv > sessionGmv) sessionGmv = rawSessionGmv;
      if (rawSessionOrders > sessionOrders) sessionOrders = rawSessionOrders;
      if (rawSessionSold > sessionItemsSold) sessionItemsSold = rawSessionSold;
      if (rawSessionGpm > sessionGpm) sessionGpm = rawSessionGpm;
      if (rawCtr !== null && rawCtr > 0) sessionCtrPct = rawCtr;
      if (rawCvr !== null && rawCvr > 0) sessionCvrPct = rawCvr;

      // 2. Nhận diện sản phẩm trong Giỏ hàng Phiên Live (Live Bag / Pinned Product)
      const pid = String(node.product_id || node.productId || node.item_id || '').trim();
      const pTitle = String(node.title || node.product_name || node.name || '').trim();
      const hasPriceField =
        node.price !== undefined ||
        node.sale_price !== undefined ||
        node.real_price !== undefined ||
        node.format_price !== undefined ||
        node.market_price !== undefined;

      if (/^\d{15,22}$/.test(pid) && pTitle && hasPriceField && !seenPid.has(pid)) {
        seenPid.add(pid);
        const rawPrice =
          node.sale_price?.price_str ||
          node.real_price?.price_str ||
          node.format_price ||
          node.price?.price_str ||
          node.price?.min_price ||
          node.sale_price ||
          node.price ||
          0;
        const priceVnd = parseCompactNumber(rawPrice);
        const soldCount = parseCompactNumber(
          node.sold_count ?? node.sales ?? node.volume ?? node.order_count ?? 0
        );
        const stockCount = parseCompactNumber(node.stock ?? node.inventory ?? 0);
        const commPct = Number(node.commission_rate ?? node.cos_ratio ?? 10) || 10;
        const shopName = String(node.shop_name || node.seller_name || 'Gian hàng TikTok Shop').trim();
        const isPinned = Boolean(node.is_pinned || node.pinned || node.is_introducing || bagProducts.length === 0);

        bagProducts.push({
          productId: pid,
          title: pTitle,
          priceVnd,
          soldCount,
          stockCount,
          commissionRatePct: commPct,
          shopName,
          isPinned,
          productUrl: `https://shop.tiktok.com/view/product/${pid}?region=VN&locale=vi-VN`,
        });
      }

      if (Array.isArray(node)) {
        for (const child of node) walk(child, depth + 1);
      } else {
        for (const k of Object.keys(node)) {
          walk(node[k], depth + 1);
        }
      }
    }

    walk(obj, 0);

    if (
      resolvedHandle ||
      roomId ||
      currentViewers > 0 ||
      totalViews > 0 ||
      sessionGmv > 0 ||
      isEnded ||
      bagProducts.length > 0
    ) {
      mergeLiveSessionForHandle(resolvedHandle || 'live_koc', {
        roomId,
        roomTitle,
        isLive,
        isEnded,
        currentViewers,
        peakViewers: Math.max(peakViewers, currentViewers),
        totalViews: Math.max(totalViews, currentViewers),
        likes,
        durationMinutes,
        sessionGmv,
        sessionOrders,
        sessionItemsSold,
        sessionGpm,
        sessionCtrPct,
        sessionCvrPct,
        avgWatchTimeSec,
        newFollowers,
        liveBagProducts: bagProducts,
      });
    }
  }

  const META_BANNED_HANDLES = new Set([
    'facebook',
    'instagram',
    'threads',
    'threads_user',
    'reels',
    'reel',
    'watch',
    'explore',
    'stories',
    'direct',
    'accounts',
    'messages',
    'notifications',
    'profile.php',
    'people',
    'groups',
    'marketplace',
    'gaming',
    'friends',
    'saved',
    'search',
    'p',
    'tv',
    'share',
    'photo',
    'photos',
    'videos',
  ]);

  function cleanMetaHandle(raw) {
    const h = normHandle(raw);
    if (!h || h.length < 2 || META_BANNED_HANDLES.has(h)) return '';
    return h;
  }

  // Chuyển đổi Instagram / Threads Shortcode (ví dụ: DB8x9Yz) sang Media PK số nguyên 64-bit (isorter pattern)
  function igShortcodeToPk(code) {
    const clean = String(code || '').trim();
    if (!/^[A-Za-z0-9_-]{6,16}$/.test(clean) || /^\d+$/.test(clean)) return '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    try {
      let id = 0n;
      for (const ch of clean) {
        const idx = alphabet.indexOf(ch);
        if (idx < 0) return '';
        id = id * 64n + BigInt(idx);
      }
      return id > 0n ? id.toString() : '';
    } catch {
      return '';
    }
  }

  let cachedIgAppId = '';
  function getIgAppId() {
    if (cachedIgAppId) return cachedIgAppId;
    try {
      const html = document.documentElement?.innerHTML || '';
      const m = html.match(/"X-IG-App-ID"\s*:\s*"(\d+)"/) || html.match(/"appId"\s*:\s*"(\d+)"/);
      if (m && m[1]) {
        cachedIgAppId = m[1];
        return cachedIgAppId;
      }
    } catch {}
    return state.platform === 'threads' ? '238260118697367' : '936619743392459';
  }

  // Loại bỏ tham số cắt đoạn DASH/MSE (bytestart, byteend) của CDN Meta (threads-video-downloader pattern)
  function stripMetaRangeParams(u) {
    if (!u || typeof u !== 'string') return '';
    return u.replace(/[&?](?:bytestart|byteend)=[^&]*/gi, '').replace(/[?&]$/, '');
  }

  // Bắt luồng CDN MP4 thật từ Performance Resource Timing cho các video chạy qua blob: MSE
  function pickBestMetaMp4FromPerformance() {
    try {
      if (typeof performance?.getEntriesByType !== 'function') return '';
      const entries = performance.getEntriesByType('resource') || [];
      const candidates = [];
      for (let i = entries.length - 1; i >= 0; i--) {
        const name = String(entries[i]?.name || '');
        if (
          name &&
          (name.includes('cdninstagram.com') || name.includes('fbcdn.net')) &&
          (name.includes('.mp4') || name.includes('/v/t16/') || name.includes('/o1/v/t')) &&
          !name.includes('-seg-') &&
          !name.includes('/range/')
        ) {
          candidates.push(stripMetaRangeParams(name));
          if (candidates.length >= 3) break;
        }
      }
      return candidates[0] || '';
    } catch {
      return '';
    }
  }

  function normalizeMetaMediaItem(node, fallbackHandle) {
    if (!node || typeof node !== 'object') return null;
    const rawCode = String(node.code || node.shortcode || '').trim();
    const rawId = String(
      node.pk ||
        (typeof node.id === 'string' && node.id.includes('_') ? node.id.split('_')[0] : node.id) ||
        node.video_id ||
        node.post_id ||
        ''
    ).trim();
    const videoId = rawCode || rawId;
    if (!videoId) return null;

    const userObj =
      node.user ||
      node.owner ||
      node.video_owner ||
      node.actor ||
      (Array.isArray(node.actors) ? node.actors[0] : null) ||
      node.author ||
      {};
    let extractedUserFromUrl = '';
    if (typeof userObj.url === 'string') {
      const um = userObj.url.match(/facebook\.com\/(?:profile\.php\?id=(\d+)|([A-Za-z0-9._-]+))/i);
      if (um) extractedUserFromUrl = um[1] || um[2] || '';
    }
    const handle =
      cleanMetaHandle(userObj.username) ||
      cleanMetaHandle(userObj.vanity) ||
      cleanMetaHandle(userObj.unique_id) ||
      cleanMetaHandle(extractedUserFromUrl) ||
      cleanMetaHandle(fallbackHandle) ||
      cleanMetaHandle(getCurrentUrlInfo().handle) ||
      cleanMetaHandle(state.activeSellerHandle) ||
      '';

    const followers = parseCompactNumber(
      userObj.follower_count ??
        userObj.edge_followed_by?.count ??
        userObj.followers_count ??
        userObj.page_likers?.count ??
        (handle && state.profilesByHandle[handle]?.followers) ??
        0
    );

    if (handle && (userObj.username || userObj.full_name || userObj.name || followers > 0)) {
      mergeProfileForHandle(handle, {
        handle,
        displayName: String(userObj.full_name || userObj.name || userObj.username || handle),
        avatarUrl: String(
          userObj.profile_pic_url_hd ||
            userObj.profile_pic_url ||
            userObj.profile_picture?.uri ||
            ''
        ),
        bio: String(userObj.biography || userObj.bio_text?.text || ''),
        followers,
      });
    }

    const caption = String(
      node.caption?.text ||
        (typeof node.caption === 'string' ? node.caption : '') ||
        node.edge_media_to_caption?.edges?.[0]?.node?.text ||
        node.text_post_app_info?.text_fragments?.fragments?.map((f) => f?.plaintext || '').join('') ||
        node.message?.text ||
        node.creation_story?.message?.text ||
        node.title?.text ||
        node.description?.text ||
        node.accessibility_caption ||
        ''
    ).trim();

    const likes = parseCompactNumber(
      node.like_count ??
        node.edge_media_preview_like?.count ??
        node.edge_liked_by?.count ??
        node.reaction_count?.count ??
        node.feedback?.reaction_count?.count ??
        node.feedback?.likers?.count ??
        node.likers?.count ??
        0
    );
    const comments = parseCompactNumber(
      node.comment_count?.total_count ??
        node.comment_count ??
        node.edge_media_to_comment?.count ??
        node.text_post_app_info?.direct_reply_count ??
        node.feedback?.total_comment_count ??
        node.feedback?.comment_rendering_instance?.comments?.total_count ??
        0
    );
    const shares = parseCompactNumber(
      node.reshare_count ??
        node.repost_count ??
        node.text_post_app_info?.repost_count ??
        node.text_post_app_info?.quote_count ??
        node.share_count?.count ??
        node.feedback?.share_count?.count ??
        node.feedback?.reshares?.count ??
        0
    );
    const saves = parseCompactNumber(node.save_count ?? node.bookmark_count ?? 0);

    const rawViews = parseCompactNumber(
      node.play_count ??
        node.ig_play_count ??
        node.view_count ??
        node.video_view_count ??
        node.feedback?.play_count ??
        node.video_view_count_renderer?.view_count ??
        0
    );
    const views = rawViews > 0 ? rawViews : 0;

    const ts = Number(
      node.taken_at_timestamp ||
        node.taken_at ||
        node.publish_time ||
        node.creation_time ||
        node.created_time ||
        0
    );
    const nowSec = Math.floor(Date.now() / 1000);
    const ageHours = ts > 100000000 ? Math.max(1, (nowSec - ts) / 3600) : 24;
    const viewsPerHour = views > 0 ? Math.max(1, Math.round(views / ageHours)) : 0;

    // Ưu tiên chọn bản video chất lượng cao nhất từ video_versions (isorter pattern) & progressive_urls của Facebook (yt-dlp pattern)
    const sortByResolution = (list) =>
      [...(Array.isArray(list) ? list : [])]
        .filter((v) => v && typeof v.url === 'string' && v.url)
        .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0));

    const bestIgVideo =
      sortByResolution(node.video_versions)[0]?.url ||
      sortByResolution(node.carousel_media?.[0]?.video_versions)[0]?.url ||
      '';

    const fbProgUrls =
      node.videoDeliveryResponseFragment?.videoDeliveryResponseResult?.progressive_urls ||
      node.playback_video?.videoDeliveryResponseFragment?.videoDeliveryResponseResult?.progressive_urls ||
      [];
    const bestFbProg =
      (Array.isArray(fbProgUrls)
        ? (
            fbProgUrls.find((p) => p?.metadata?.quality === 'HD' && p?.progressive_url) ||
            fbProgUrls.find((p) => p?.progressive_url)
          )?.progressive_url
        : '') || '';

    const playableUrl = stripMetaRangeParams(
      String(
        bestIgVideo ||
          bestFbProg ||
          node.playable_url_quality_hd ||
          node.browser_native_hd_url ||
          node.video_url ||
          node.playable_url ||
          node.browser_native_sd_url ||
          node.hd_src ||
          node.sd_src ||
          ''
      ).trim()
    );

    const imageUrls = [];
    if (Array.isArray(node.carousel_media)) {
      for (const cm of node.carousel_media) {
        const u =
          sortByResolution(cm?.image_versions2?.candidates)[0]?.url ||
          cm?.display_url ||
          '';
        if (u) imageUrls.push(u);
      }
    } else if (Array.isArray(node.edge_sidecar_to_children?.edges)) {
      for (const ed of node.edge_sidecar_to_children.edges) {
        const u = ed?.node?.display_url || '';
        if (u) imageUrls.push(u);
      }
    } else {
      const topImg =
        sortByResolution(node.image_versions2?.candidates)[0]?.url ||
        node.display_url ||
        '';
      if (topImg) imageUrls.push(topImg);
    }

    const extraUrls = [];
    if (node.link_attachment_url) extraUrls.push(String(node.link_attachment_url));
    if (node.text_post_app_info?.link_preview_attachment?.url) {
      extraUrls.push(String(node.text_post_app_info.link_preview_attachment.url));
    }
    if (node.cta_link || node.story_cta?.[0]?.links?.[0]?.webUri) {
      extraUrls.push(String(node.cta_link || node.story_cta[0].links[0].webUri));
    }

    const commerceInfo = extractSocialCommerceProductsFromText(caption, extraUrls);
    const isReelOrVideo = Boolean(
      playableUrl ||
        node.is_video ||
        node.media_type === 2 ||
        node.product_type === 'clips' ||
        node.__typename?.includes('Video') ||
        node.__typename?.includes('Clip')
    );

    let videoUrl = window.location.href.split('?')[0];
    if (state.platform === 'threads') {
      videoUrl = rawCode
        ? `https://www.threads.net/@${handle || 'threads'}/post/${rawCode}`
        : `https://www.threads.net/@${handle || 'threads'}`;
    } else if (state.platform === 'facebook') {
      videoUrl = rawId
        ? `https://www.facebook.com/reel/${rawId}`
        : `https://www.facebook.com/${handle || ''}`;
    } else if (state.platform === 'instagram') {
      const seg = isReelOrVideo ? 'reel' : 'p';
      videoUrl = rawCode
        ? `https://www.instagram.com/${seg}/${rawCode}/`
        : `https://www.instagram.com/${handle || ''}/`;
    }

    const musicTitle = String(
      node.clips_metadata?.music_info?.music_asset_info?.title ||
        node.clips_metadata?.original_sound_info?.original_audio_title ||
        node.music_metadata?.music_info?.music_asset_info?.title ||
        ''
    ).trim();
    const musicPlayUrl = String(
      node.clips_metadata?.music_info?.music_asset_info?.progressive_download_url ||
        node.clips_metadata?.original_sound_info?.progressive_download_url ||
        ''
    ).trim();

    const subtitleUrl = String(
      node.subtitles_uri ||
        node.video_subtitles_uri ||
        node.captions_url ||
        node.playback_video?.subtitles_uri ||
        ''
    ).trim();

    const denom = views > 0 ? views : Math.max(1, followers || likes * 10 || 100);
    return {
      videoId,
      metaPk: rawId || igShortcodeToPk(rawCode) || '',
      metaCode: rawCode || '',
      videoUrl,
      handle: handle || 'koc',
      authorDisplayName: String(userObj.full_name || userObj.name || handle || ''),
      authorFollowers: followers,
      caption,
      hashtags: extractHashtags(caption, []),
      publishedAt:
        ts > 100000000
          ? new Date(ts * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      createTime: ts || nowSec,
      durationSeconds: Math.round(Number(node.video_duration || node.length_in_second || 0)),
      views,
      likes,
      comments,
      shares,
      saves,
      viewsPerHour,
      engagementRate:
        views === 0 && likes === 0
          ? 0
          : Number((((likes + comments + shares) / denom) * 100).toFixed(2)),
      isPinned: Boolean(node.is_pinned || node.timeline_pinned_user_ids?.length),
      isSponsored: Boolean(
        node.is_paid_partnership ||
          commerceInfo.hasYellowCart ||
          /#ad\b|#sponsored|tài trợ/i.test(caption)
      ),
      hasYellowCart: commerceInfo.hasYellowCart,
      cartProducts: commerceInfo.cartProducts,
      cartAnchorTitle: commerceInfo.cartAnchorTitle,
      cartAnchorUrl: commerceInfo.cartAnchorUrl,
      cartProductId: commerceInfo.cartProductId,
      playableUrl,
      subtitleUrl: subtitleUrl || undefined,
      imageUrls,
      musicTitle: musicTitle || undefined,
      musicPlayUrl: musicPlayUrl || undefined,
    };
  }

  // Hoàn thiện bài đăng Instagram / Threads bị khuyết caption hoặc link MP4 trên tab Reels (isorter complete() pattern)
  async function completeMetaMediaItemOnDemand(vObj) {
    if (!vObj || (state.platform !== 'instagram' && state.platform !== 'threads')) return vObj;
    const pk = vObj.metaPk || igShortcodeToPk(vObj.metaCode || vObj.videoId);
    if (!pk || typeof origFetch !== 'function') return vObj;
    try {
      const res = await origFetch(`/api/v1/media/${pk}/info/`, {
        credentials: 'include',
        headers: { 'x-ig-app-id': getIgAppId() },
      });
      if (res && res.ok) {
        const json = await res.json();
        const item = json?.items?.[0];
        if (item) {
          const full = normalizeMetaMediaItem(item, vObj.handle);
          if (full) {
            if (full.views > (vObj.views || 0)) vObj.views = full.views;
            if (full.likes > (vObj.likes || 0)) vObj.likes = full.likes;
            if (full.comments > (vObj.comments || 0)) vObj.comments = full.comments;
            if (full.shares > (vObj.shares || 0)) vObj.shares = full.shares;
            if (full.caption && (!vObj.caption || full.caption.length > vObj.caption.length)) {
              vObj.caption = full.caption;
              vObj.hashtags = full.hashtags;
            }
            if (full.playableUrl && !vObj.playableUrl) vObj.playableUrl = full.playableUrl;
            if (Array.isArray(full.imageUrls) && full.imageUrls.length > 0) vObj.imageUrls = full.imageUrls;
            if (full.publishedAt) vObj.publishedAt = full.publishedAt;
            if (full.durationSeconds) vObj.durationSeconds = full.durationSeconds;
            if (full.musicTitle) vObj.musicTitle = full.musicTitle;
            if (full.hasYellowCart) {
              vObj.hasYellowCart = true;
              vObj.cartProducts = full.cartProducts;
            }
            vObj._fromDomFallback = false;
            if (vObj.handle) mergeVideosForHandle(vObj.handle, [vObj]);
          }
        }
      }
    } catch {
      // Bỏ qua nếu endpoint yêu cầu phiên đăng nhập khác
    }
    return vObj;
  }

  function parseMetaGraphQlAndSjsDeep(rootObj) {
    if (!rootObj || typeof rootObj !== 'object') return;
    const visited = new Set();
    const discoveredVids = [];

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 16 || visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }

      // 1. User / Profile Node trên Instagram, Threads hoặc Facebook
      if (
        (typeof node.username === 'string' &&
          (node.follower_count !== undefined ||
            node.edge_followed_by ||
            node.full_name !== undefined ||
            node.biography !== undefined)) ||
        (node.__typename === 'User' && (node.username || node.vanity || node.name))
      ) {
        const h = normHandle(node.username || node.vanity || '');
        if (h && h.length >= 2) {
          const followers = parseCompactNumber(
            node.follower_count ??
              node.edge_followed_by?.count ??
              node.followers_count ??
              node.page_likers?.count ??
              0
          );
          const following = parseCompactNumber(
            node.following_count ?? node.edge_follow?.count ?? 0
          );
          const videoCount = parseCompactNumber(
            node.media_count ?? node.edge_owner_to_timeline_media?.count ?? 0
          );
          mergeProfileForHandle(h, {
            handle: h,
            displayName: String(node.full_name || node.name || h),
            avatarUrl: String(
              node.profile_pic_url_hd ||
                node.profile_pic_url ||
                node.profile_picture?.uri ||
                ''
            ),
            bio: String(node.biography || node.bio_text?.text || ''),
            followers,
            following,
            videoCount,
          });
        }
      }

      // 2. Post / Reel / Thread / Video Node trên Instagram, Threads hoặc Facebook
      const isIgOrThreadsMedia =
        (node.code || node.shortcode) &&
        (node.like_count !== undefined ||
          node.edge_media_preview_like ||
          node.play_count !== undefined ||
          node.video_versions ||
          node.caption !== undefined ||
          node.text_post_app_info !== undefined);

      const isFbReelOrVideo =
        (node.video_id || node.playable_url || node.browser_native_hd_url || node.playable_url_quality_hd) &&
        (node.id || node.video_id || node.post_id);

      if (isIgOrThreadsMedia || isFbReelOrVideo) {
        const norm = normalizeMetaMediaItem(node, '');
        if (norm && norm.videoId) {
          discoveredVids.push(norm);
          if (norm.handle) {
            mergeVideosForHandle(norm.handle, [norm]);
          }
        }
      }

      for (const k of Object.keys(node)) {
        if (k === 'extensions' || k === '__bbox') {
          walk(node[k], depth + 1);
          continue;
        }
        walk(node[k], depth + 1);
      }
    }

    walk(rootObj, 0);

    if (discoveredVids.length > 0) {
      const byId = new Map();
      for (const v of discoveredVids) {
        if (v && v.videoId) byId.set(String(v.videoId), v);
      }
      for (const v of state.searchVideosList) {
        if (v && v.videoId && !byId.has(String(v.videoId))) {
          byId.set(String(v.videoId), v);
        }
      }
      state.searchVideosList = enrichVideosWithProLabels(Array.from(byId.values()).slice(0, 150));
      if (!state.activeSellerHandle && discoveredVids[0]?.handle) {
        state.activeSellerHandle = discoveredVids[0].handle;
      }
      const urlInfo = getCurrentUrlInfo();
      if (urlInfo.videoId) {
        const exact = discoveredVids.find((v) => String(v.videoId) === String(urlInfo.videoId));
        if (exact) state.currentVideoDetail = exact;
      } else if (!state.currentVideoDetail && discoveredVids[0]) {
        state.currentVideoDetail = discoveredVids[0];
      }
    }
  }

  function parseInstagramJson(url, data) {
    if (!data || typeof data !== 'object') return;
    parseMetaGraphQlAndSjsDeep(data);
    const user = data?.data?.user || data?.user || data?.graphql?.user;
    if (user && user.username) {
      const handle = normHandle(user.username);
      const followers = parseCompactNumber(
        user.follower_count ?? user.edge_followed_by?.count ?? 0
      );
      const following = parseCompactNumber(
        user.following_count ?? user.edge_follow?.count ?? 0
      );
      const videoCount = parseCompactNumber(
        user.media_count ?? user.edge_owner_to_timeline_media?.count ?? 0
      );
      mergeProfileForHandle(handle, {
        handle,
        displayName: String(user.full_name || handle),
        avatarUrl: String(user.profile_pic_url_hd || user.profile_pic_url || ''),
        bio: String(user.biography || ''),
        followers,
        following,
        totalLikes: 0,
        videoCount,
      });

      const edges = [
        ...(user.edge_owner_to_timeline_media?.edges || []),
        ...(user.edge_felix_video_timeline?.edges || []),
      ];
      if (Array.isArray(edges) && edges.length > 0) {
        const vids = edges
          .map((e) => e && e.node)
          .filter(Boolean)
          .map((node) => normalizeMetaMediaItem(node, handle))
          .filter(Boolean);
        mergeVideosForHandle(handle, vids);
      }
    }
  }

  // Quét sâu mọi cấu trúc JSON của TikTok/Douyin (SSR Rehydration & Feed API) để bắt danh sách Video & KOC trên cả Trang chủ Đề xuất
  function parseAnyTikTokJsonDeep(rootObj) {
    if (!rootObj || typeof rootObj !== 'object') return;
    const visited = new Set();
    const discoveredFeedVids = [];

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 14 || visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }

      // Nếu node là 1 video item chuẩn của TikTok/Douyin (có id/aweme_id + stats/statistics + author)
      const vidId = String(node.id || node.aweme_id || '').trim();
      const hasStats = node.stats || node.statistics || node.statsV2;
      const hasAuthor = node.author || node.authorInfo;
      if (/^\d{15,22}$/.test(vidId) && hasStats && hasAuthor) {
        const authorObj = node.author || node.authorInfo || {};
        const aStats = node.authorStats || authorObj.stats || {};
        const h = normHandle(
          authorObj.uniqueId || authorObj.unique_id || authorObj.secUid?.slice(-8) || authorObj.nickname || 'tiktok_creator'
        );
        if (h) {
          mergeProfileForHandle(h, {
            handle: h,
            displayName: String(authorObj.nickname || authorObj.uniqueId || h),
            avatarUrl: String(
              authorObj.avatarLarger ||
                authorObj.avatarMedium ||
                authorObj.avatarThumb ||
                authorObj.avatar_thumb?.url_list?.[0] ||
                ''
            ),
            bio: String(authorObj.signature || ''),
            followers: parseCompactNumber(
              aStats.followerCount ?? authorObj.follower_count ?? authorObj.followerCount ?? 0
            ),
            totalLikes: parseCompactNumber(aStats.heartCount ?? aStats.heart ?? aStats.diggCount ?? 0),
            videoCount: parseCompactNumber(aStats.videoCount ?? 0),
          });
        }
        const normVid = normalizeTikTokVideo(node, h);
        if (normVid) {
          discoveredFeedVids.push(normVid);
          if (normVid.handle) {
            mergeVideosForHandle(normVid.handle, [normVid]);
          }
        }
      }

      for (const k of Object.keys(node)) {
        if (k === ' COMMENTS' || k === 'webpack') continue;
        walk(node[k], depth + 1);
      }
    }

    walk(rootObj, 0);

    if (discoveredFeedVids.length > 0) {
      const byId = new Map();
      // Đưa các video mới phát hiện lên ĐẦU danh sách để không bao giờ bị cắt mất bởi .slice()
      for (const v of discoveredFeedVids) {
        if (v && v.videoId) byId.set(String(v.videoId), v);
      }
      for (const v of state.searchVideosList) {
        if (v && v.videoId && !String(v.videoId).startsWith('feed-') && !byId.has(String(v.videoId))) {
          byId.set(String(v.videoId), v);
        }
      }
      state.searchVideosList = enrichVideosWithProLabels(Array.from(byId.values()).slice(0, 150));
      if (!state.activeSellerHandle && discoveredFeedVids[0]?.handle) {
        state.activeSellerHandle = discoveredFeedVids[0].handle;
      }
      if (!state.currentVideoDetail && discoveredFeedVids[0]) {
        state.currentVideoDetail = discoveredFeedVids[0];
      }
    }
  }

  function inspectNetworkPayload(url, responseText) {
    if (!url || typeof responseText !== 'string' || !responseText) return;
    const u = String(url);
    if (u.includes('__tpt_mobile=1')) return;
    try {
      if (state.platform === 'tiktok_ads' || u.includes('ads.tiktok.com') || u.includes('aadvid')) {
        if (responseText.trim().startsWith('{')) {
          const parsed = JSON.parse(responseText);
          parseTikTokAdsJsonDeep(parsed);
          broadcastSnapshot();
        }
      }
      if (state.platform === 'tiktok_seller' || u.includes('oec') || u.includes('affiliate') || u.includes('creator')) {
        if (responseText.trim().startsWith('{')) {
          const parsed = JSON.parse(responseText);
          parseTikTokSellerJsonDeep(parsed);
          broadcastSnapshot();
        }
      }
      if (state.platform === 'tiktok' || state.platform === 'douyin') {
        const trimmed = responseText.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (u.includes('api/user/detail') || u.includes('user/profile')) {
            parseTikTokUserDetailJson(parsed);
          }
          if (
            u.includes('api/post/item_list') ||
            u.includes('api/recommend/item_list') ||
            u.includes('api/following/item_list') ||
            u.includes('api/preload/item_list') ||
            u.includes('aweme/post')
          ) {
            const list = parsed?.itemList || parsed?.aweme_list || [];
            if (Array.isArray(list) && list.length > 0) {
              parseTikTokItemListJson({ itemList: list });
              if (!u.includes('api/post/item_list')) {
                parseTikTokSearchJson({ itemList: list });
              }
            }
          }
          if (u.includes('api/item/detail') || u.includes('api/video/detail') || u.includes('aweme/detail')) {
            const detailObj = parsed?.aweme_detail ? { itemStruct: parsed.aweme_detail } : parsed;
            parseTikTokItemDetailJson(detailObj);
          }
          if (u.includes('api/comment/list') || u.includes('comment/list')) {
            parseTikTokCommentsJson(parsed, u);
          }
          if (u.includes('api/search/')) {
            parseTikTokSearchJson(parsed);
          }
          if (
            u.includes('webcast') ||
            u.includes('/live/') ||
            u.includes('room/info') ||
            u.includes('bag/product_list') ||
            getCurrentUrlInfo().pageType === 'live'
          ) {
            parseLiveRoomJsonDeep(parsed);
          }
          // Quét sâu mọi gói JSON có chứa danh sách video (Trang chủ Đề xuất, Khám phá, Bạn bè...)
          if (
            parsed.itemList ||
            parsed.aweme_list ||
            parsed.data ||
            parsed.itemInfo ||
            u.includes('item_list') ||
            u.includes('recommend') ||
            u.includes('feed')
          ) {
            parseAnyTikTokJsonDeep(parsed);
          }
          broadcastSnapshot();
        }
      } else if (
        state.platform === 'instagram' ||
        state.platform === 'threads' ||
        state.platform === 'facebook'
      ) {
        if (
          u.includes('/users/web_profile_info/') ||
          u.includes('/api/v1/') ||
          u.includes('/graphql/query') ||
          u.includes('/api/graphql') ||
          u.includes('/ajax/bulk-route-definitions')
        ) {
          const cleanedText = responseText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;?\s*/, '').trim();
          const lines = cleanedText.split(/\r?\n/).filter((l) => l.trim().startsWith('{'));
          for (const line of lines.length > 0 ? lines : [cleanedText]) {
            try {
              const parsed = JSON.parse(line);
              if (state.platform === 'instagram') {
                parseInstagramJson(u, parsed);
              } else {
                parseMetaGraphQlAndSjsDeep(parsed);
              }
            } catch {}
          }
          broadcastSnapshot();
        }
      } else if (state.platform === 'shopee' || u.includes('shopee.vn')) {
        const trimmed = responseText.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          parseShopeeJsonDeep(u, parsed);
          broadcastSnapshot();
        }
      }
    } catch {
      // Bỏ qua nếu response không phải JSON hợp lệ
    }
  }

  // Chuẩn hóa giá Shopee API v4 (Shopee lưu giá nhân 100.000, ví dụ 289.000đ -> 28900000000)
  function normalizeShopeePriceVnd(raw) {
    const n = Number(raw || 0);
    if (!Number.isFinite(n) || n <= 0) return parseCompactNumber(raw);
    if (n >= 100000000) return Math.round(n / 100000);
    return Math.round(n);
  }

  // Bóc tách toàn diện hệ sinh thái Shopee VN: Sản phẩm Shopee, Gian hàng Shopee Mall, Shopee Live, Shopee Affiliate & Đánh giá Người mua
  function parseShopeeJsonDeep(url, rootObj) {
    if (!rootObj || typeof rootObj !== 'object') return;
    const visited = new Set();
    const urlInfo = getCurrentUrlInfo();
    const isRecommendApi = /recommend|rcmd|you_may_also_like|bundle_deal|hot_sales/i.test(String(url || ''));
    let activeHandle = urlInfo.handle || state.activeSellerHandle || '';
    const discoveredVids = [];
    const liveBagItems = [];
    const seenPid = new Set();
    const ratingComments = [];

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 14 || visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }

      // 1. Nhận diện Gian hàng Shopee (/api/v4/shop/get_shop_base, pdp shop info, creator profile)
      const nodeShopId = String(node.shopid || node.shop_id || '').trim();
      const shopUser =
        node.account?.username ||
        node.shop_username ||
        (nodeShopId && node.name && node.follower_count !== undefined ? node.username || node.name : '');
      if (shopUser && (node.follower_count !== undefined || node.rating_star !== undefined || node.item_count !== undefined)) {
        const isCurrentShopOnPdp =
          !urlInfo.shopId || !nodeShopId || String(nodeShopId) === String(urlInfo.shopId);
        const h = normHandle(shopUser);
        if (h && h.length >= 2 && isCurrentShopOnPdp) {
          activeHandle = h;
          state.activeSellerHandle = h;
          const followers = parseCompactNumber(node.follower_count ?? node.followers ?? 0);
          const itemCount = parseCompactNumber(node.item_count ?? 0);
          const ratingStar =
            Number(node.rating_star || 0) > 0 ? Number(Number(node.rating_star).toFixed(2)) : 0;
          const isMall = Boolean(
            node.is_official_shop ||
              node.show_official_shop_label ||
              node.is_shopee_verified ||
              node.cb_option === 1
          );
          const displayName = String(node.name || node.shop_name || shopUser).trim();
          const avatarUrl = node.account?.portrait
            ? `https://down-vn.img.susercontent.com/file/${node.account.portrait}`
            : node.portrait
              ? `https://down-vn.img.susercontent.com/file/${node.portrait}`
              : '';
          state.shopeeShopDetail = {
            ...(state.shopeeShopDetail || {}),
            shopId: nodeShopId || urlInfo.shopId || state.shopeeShopDetail?.shopId || '',
            handle: h,
            shopName: displayName,
            avatarUrl: avatarUrl || state.shopeeShopDetail?.avatarUrl || '',
            followers,
            itemCount,
            ratingStar,
            responseRate: parseCompactNumber(node.response_rate ?? 0),
            isMall: isMall || Boolean(state.shopeeShopDetail?.isMall),
            location: String(node.shop_location || node.place || '').trim(),
          };
          mergeProfileForHandle(h, {
            handle: h,
            displayName,
            avatarUrl,
            bio: String(node.description || ''),
            followers,
            videoCount: itemCount,
          });
        }
      }

      // 2. Nhận diện Phiên Shopee Live & Báo cáo Shopee Live Data Center (live.shopee.vn / banhang.shopee.vn/datacenter/live)
      if (
        node.session_id ||
        node.live_session_id ||
        (node.viewer_count !== undefined && (node.title !== undefined || node.host_name !== undefined))
      ) {
        const roomId = String(node.session_id || node.live_session_id || '');
        const isEnded =
          node.status === 2 ||
          node.status === 'ended' ||
          node.is_ended === true ||
          Number(node.end_time || 0) > 1000000000;
        const curV = parseCompactNumber(node.viewer_count ?? node.ccu ?? node.concurrent_viewers ?? 0);
        const pkV = parseCompactNumber(node.max_viewer_count ?? node.peak_viewer_count ?? node.pcu ?? curV);
        const totV = parseCompactNumber(node.total_view_count ?? node.view_count ?? node.views ?? curV);
        const lk = parseCompactNumber(node.like_count ?? node.likes ?? 0);
        const sessionGmv = normalizeShopeePriceVnd(
          node.placed_gmv ?? node.confirmed_gmv ?? node.gmv ?? node.live_gmv ?? 0
        );
        const sessionOrders = parseCompactNumber(
          node.placed_orders ?? node.confirmed_orders ?? node.order_count ?? node.orders ?? 0
        );
        const sessionItemsSold = parseCompactNumber(node.items_sold ?? node.sold_count ?? sessionOrders);

        mergeLiveSessionForHandle(activeHandle || 'shopee_live', {
          roomId,
          roomTitle: String(node.title || node.session_title || 'Phiên Shopee Live'),
          isLive: !isEnded,
          isEnded,
          currentViewers: curV,
          peakViewers: pkV,
          totalViews: totV,
          likes: lk,
          sessionGmv,
          sessionOrders,
          sessionItemsSold,
        });
      }

      // 3. Nhận diện Sản phẩm Shopee / Danh mục Gian hàng / Shopee Affiliate (Hoa hồng Mở + Hoa hồng Xtra)
      const itemId = String(node.itemid || node.item_id || '').trim();
      const shopId = String(node.shopid || node.shop_id || '').trim();
      const itemName = String(node.name || node.item_name || node.title || '').trim();
      if (/^\d{6,15}$/.test(itemId) && itemName && (node.price !== undefined || node.price_min !== undefined || node.raw_price !== undefined)) {
        const priceMinVnd = normalizeShopeePriceVnd(node.price_min ?? node.price ?? node.raw_price ?? 0);
        const priceMaxVnd = normalizeShopeePriceVnd(node.price_max ?? node.price ?? priceMinVnd);
        const priceVnd = priceMinVnd || priceMaxVnd;
        const sold30d = parseCompactNumber(node.sold ?? node.monthly_sold ?? 0);
        const historicalSold = parseCompactNumber(node.historical_sold ?? node.global_sold ?? sold30d);
        const stockCount = parseCompactNumber(node.stock ?? node.normal_stock ?? 0);
        const ratingStarRaw = Number(node.item_rating?.rating_star ?? node.rating_star ?? 0);
        const ratingStar = ratingStarRaw > 0 ? Number(ratingStarRaw.toFixed(1)) : 0;
        const ratingCount = parseCompactNumber(
          node.item_rating?.rating_count?.[0] ?? node.cmt_count ?? 0
        );
        const isMall = Boolean(
          node.is_official_shop ||
            node.show_official_shop_label ||
            node.shopee_verified
        );
        const commPct =
          Number(
            node.commission_rate ??
              node.brand_commission_rate ??
              node.extra_commission_rate ??
              node.default_commission_rate ??
              0
          ) || 0;
        const normalizedCommPct = commPct > 100 ? Number((commPct / 100).toFixed(1)) : commPct;
        const shopName = String(
          node.shop_name ||
            state.shopeeShopDetail?.shopName ||
            activeHandle ||
            'Gian hàng Shopee'
        ).trim();
        const prodUrl = shopId
          ? `https://shopee.vn/product/${shopId}/${itemId}`
          : `https://shopee.vn/search?keyword=${encodeURIComponent(itemName)}`;

        const rawImages = Array.isArray(node.images)
          ? node.images
          : node.image
            ? [node.image]
            : [];
        const imageUrls = rawImages
          .map((img) => {
            const s = String(img || '').trim();
            if (!s) return '';
            return s.startsWith('http') ? s : `https://down-vn.img.susercontent.com/file/${s}`;
          })
          .filter(Boolean);
        const playableUrl = String(
          node.video_info_list?.[0]?.default_format?.url ||
            node.video?.url ||
            ''
        ).trim();
        const variations = Array.isArray(node.tier_variations)
          ? node.tier_variations
              .flatMap((t) => (Array.isArray(t?.options) ? t.options : []))
              .map((o) => String(o || '').trim())
              .filter(Boolean)
              .slice(0, 30)
          : Array.isArray(node.models)
            ? node.models
                .map((m) => String(m?.name || '').trim())
                .filter(Boolean)
                .slice(0, 30)
            : [];

        const isActivePdpItem =
          urlInfo.itemId && String(itemId) === String(urlInfo.itemId);
        if (isActivePdpItem) {
          state.shopeeProductDetail = {
            ...(state.shopeeProductDetail || {}),
            itemId,
            shopId: shopId || urlInfo.shopId || '',
            title: itemName,
            priceVnd,
            priceMinVnd,
            priceMaxVnd,
            priceDisplay:
              priceMaxVnd > priceMinVnd
                ? `${priceMinVnd.toLocaleString('vi-VN')} đ - ${priceMaxVnd.toLocaleString('vi-VN')} đ`
                : `${priceVnd.toLocaleString('vi-VN')} đ`,
            ratingStar,
            ratingCount,
            historicalSold,
            monthlySold: sold30d,
            stockCount,
            isMall: isMall || Boolean(state.shopeeShopDetail?.isMall),
            commissionRatePct: normalizedCommPct,
            shopName,
            shopHandle: activeHandle || state.activeSellerHandle || '',
            variations: variations.length > 0 ? variations : state.shopeeProductDetail?.variations || [],
            vouchers: state.shopeeProductDetail?.vouchers || [],
            imageUrls: imageUrls.length > 0 ? imageUrls : state.shopeeProductDetail?.imageUrls || [],
            playableUrl: playableUrl || state.shopeeProductDetail?.playableUrl || '',
            productUrl: window.location.href.split('?')[0] || prodUrl,
          };
        }

        // Trên trang chi tiết Sản phẩm, không lấy sản phẩm quảng cáo khác Shop từ API gợi ý đè vào danh mục của Shop
        const belongsToCurrentShopOrSearch =
          urlInfo.pageType !== 'shopee_product' ||
          isActivePdpItem ||
          (!isRecommendApi && (!urlInfo.shopId || !shopId || String(shopId) === String(urlInfo.shopId)));

        if (!seenPid.has(itemId) && belongsToCurrentShopOrSearch) {
          seenPid.add(itemId);
          const pItem = {
            productId: itemId,
            shopId,
            title: itemName,
            priceVnd,
            priceMinVnd,
            priceMaxVnd,
            ratingStar,
            ratingCount,
            soldCount: historicalSold || sold30d,
            monthlySold: sold30d,
            stockCount,
            commissionRatePct: normalizedCommPct,
            shopName,
            source: 'Shopee VN',
            isPinned: isActivePdpItem || liveBagItems.length === 0,
            productUrl: prodUrl,
            imageUrls,
            playableUrl,
          };
          if (isActivePdpItem) {
            liveBagItems.unshift(pItem);
          } else {
            liveBagItems.push(pItem);
          }
        }
      }

      // 4. Nhận diện Bài đăng Shopee Video thực sự (sv.shopee.vn / short_video)
      const svId = String(node.video_id || node.short_video_id || node.post_id || '').trim();
      const svUrl = String(node.video_url || node.play_url || node.mp4_url || '').trim();
      if (svId && (svUrl.includes('http') || node.play_count !== undefined)) {
        const views = parseCompactNumber(node.play_count ?? node.view_count ?? 0);
        const likes = parseCompactNumber(node.like_count ?? 0);
        const comments = parseCompactNumber(node.comment_count ?? 0);
        const shares = parseCompactNumber(node.share_count ?? 0);
        const caption = String(node.caption || node.description || node.title || 'Shopee Video').trim();
        const h = normHandle(node.author?.username || node.user?.username || activeHandle || 'shopee_creator');
        discoveredVids.unshift({
          videoId: svId,
          videoUrl: window.location.href,
          handle: h,
          caption,
          hashtags: extractHashtags(caption, []),
          publishedAt: new Date().toISOString().slice(0, 10),
          views,
          likes,
          comments,
          shares,
          saves: 0,
          engagementRate: views > 0 ? Number((((likes + comments + shares) / views) * 100).toFixed(2)) : 0,
          hasYellowCart: liveBagItems.length > 0,
          cartProducts: liveBagItems.slice(0, 5),
          playableUrl: svUrl,
        });
      }

      // 5. Nhận diện Đơn mua thực tế từ Đánh giá Khách hàng (/api/v2/item/get_ratings) & Báo cáo Đơn hàng Affiliate / Seller Shopee
      if (node.cmtid && (typeof node.comment === 'string' || Array.isArray(node.product_items))) {
        const cid = String(node.cmtid);
        const buyer = String(node.author_username || 'Người mua Shopee').trim();
        const star = Number(node.rating_star || 5);
        const orderTime = node.ctime
          ? new Date(Number(node.ctime) * 1000).toISOString().replace('T', ' ').slice(0, 16)
          : '';
        const models = Array.isArray(node.product_items)
          ? node.product_items
              .map((pi) => String(pi?.model_name || '').trim())
              .filter(Boolean)
          : [];
        const skuVariation = models.join(', ') || String(node.model_name || 'Mặc định').trim();
        const commentTxt = String(node.comment || '').trim();

        state.shopeeVerifiedOrdersById[cid] = {
          orderId: cid,
          buyer,
          orderTime,
          skuVariation,
          skuList: skuVariation
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          ratingStar: star,
          comment: commentTxt || 'Đơn mua xác thực trên Shopee',
          sourceType: 'BUYER_VERIFIED_ORDER',
        };

        if (commentTxt.length > 1) {
          ratingComments.push({
            cid,
            text: `[${star}★ · Phân loại: ${skuVariation}] ${commentTxt}`,
            user: { unique_id: buyer },
          });
        }
      }

      // 6. Nhận diện Đơn hàng trực tiếp trên Shopee Affiliate (affiliate.shopee.vn) & Kênh Người Bán (banhang.shopee.vn)
      const orderSn = String(node.order_sn || node.ordersn || node.conversion_id || '').trim();
      if (orderSn && orderSn.length >= 8 && (node.total_price !== undefined || node.actual_amount !== undefined || node.purchase_value !== undefined || node.estimated_commission !== undefined)) {
        const gmvVnd = normalizeShopeePriceVnd(
          node.actual_amount ?? node.total_price ?? node.purchase_value ?? node.order_amount ?? 0
        );
        const commVnd = normalizeShopeePriceVnd(
          node.estimated_commission ?? node.net_commission ?? node.commission ?? 0
        );
        const statusStr = String(node.order_status || node.status_text || node.status || 'Hoàn thành');
        const skuName = String(
          node.model_name || node.item_name || node.orders?.[0]?.items?.[0]?.model_name || 'Đơn Shopee'
        ).trim();
        state.shopeeVerifiedOrdersById[orderSn] = {
          orderId: orderSn,
          buyer: String(node.buyer_username || node.buyer_name || 'Khách đặt đơn'),
          orderTime: node.create_time
            ? new Date(Number(node.create_time) * 1000).toISOString().replace('T', ' ').slice(0, 16)
            : new Date().toISOString().slice(0, 10),
          skuVariation: skuName,
          skuList: [skuName],
          ratingStar: 5,
          gmvVnd,
          commVnd,
          orderStatus: statusStr,
          comment: `Mã đơn: ${orderSn} · GMV: ${gmvVnd.toLocaleString('vi-VN')}đ${commVnd > 0 ? ` · HH: ${commVnd.toLocaleString('vi-VN')}đ` : ''}`,
          sourceType: 'DIRECT_ORDER_REPORT',
        };
      }

      for (const k of Object.keys(node)) {
        walk(node[k], depth + 1);
      }
    }

    walk(rootObj, 0);

    const targetHandle = activeHandle || state.activeSellerHandle || 'shopee_shop';
    if (discoveredVids.length > 0) {
      mergeVideosForHandle(targetHandle, discoveredVids);
      state.searchVideosList = enrichVideosWithProLabels(
        [...discoveredVids, ...state.searchVideosList].slice(0, 120)
      );
      if (!state.currentVideoDetail) {
        state.currentVideoDetail = discoveredVids[0];
      }
    }

    if (liveBagItems.length > 0) {
      const totalMonthlySold = liveBagItems.reduce((s, p) => s + Number(p.monthlySold || p.soldCount || 0), 0);
      const totalRev30d = liveBagItems.reduce(
        (s, p) => s + Math.round(Number(p.priceVnd || 0) * Number(p.monthlySold || p.soldCount || 0)),
        0
      );
      if (totalRev30d > 0 || totalMonthlySold > 0) {
        mergeSellerMetricsForHandle(targetHandle, {
          recentRevenue: totalRev30d,
          itemsSold: totalMonthlySold,
          aov: totalMonthlySold > 0 ? Math.round(totalRev30d / totalMonthlySold) : 0,
        });
      }
      mergeLiveSessionForHandle(targetHandle, {
        liveBagProducts: liveBagItems,
      });
    }

    if (ratingComments.length > 0) {
      const targetVidId = urlInfo.itemId || urlInfo.videoId || state.currentVideoDetail?.videoId || 'shopee_item';
      parseTikTokCommentsJson({ comments: ratingComments }, `aweme_id=${targetVidId}`);
    }
  }

  // Hook window.fetch
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function (...args) {
      const response = await origFetch.apply(this, args);
      try {
        const clone = response.clone();
        const reqUrl =
          clone.url || (typeof args[0] === 'string' ? args[0] : args[0]?.url || '');
        if (reqUrl && !String(reqUrl).includes('__tpt_mobile=1')) {
          clone
            .text()
            .then((txt) => inspectNetworkPayload(reqUrl, txt))
            .catch(() => {});
        }
      } catch {
        // Bỏ qua lỗi clone
      }
      return response;
    };
  }

  // Hook XMLHttpRequest
  if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
    const origOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (_method, url, ...rest) {
      this.__upbaseReqUrl = String(url || '');
      this.addEventListener('load', function () {
        try {
          const finalUrl = this.responseURL || this.__upbaseReqUrl || '';
          if (!this.responseType || this.responseType === 'text') {
            if (typeof this.responseText === 'string' && this.responseText) {
              inspectNetworkPayload(finalUrl, this.responseText);
            }
          } else if (this.responseType === 'json' && this.response && typeof this.response === 'object') {
            inspectNetworkPayload(finalUrl, JSON.stringify(this.response));
          }
        } catch {
          // Bỏ qua lỗi đọc response XHR
        }
      });
      return origOpen.call(this, _method, url, ...rest);
    };
  }

  // Tự động điền mã Spark Ads trên trang TikTok Ads Manager khi nhân sự bấm "Nạp mã tự động"
  function automateSparkAdsAuthorizationOnPage(codesList) {
    if (!Array.isArray(codesList) || codesList.length === 0) {
      return { filled: false, filledCount: 0, filledCode: '' };
    }
    let filledCount = 0;
    const firstCode = String(codesList[0] || '').trim();
    if (!firstCode) return { filled: false, filledCount: 0, filledCode: '' };

    const inputs = Array.from(
      document.querySelectorAll(
        'input[placeholder*="code" i], input[placeholder*="mã" i], input[placeholder*="post" i], .byted-input-inner, input[type="text"]'
      )
    ).filter((el) => !el.closest('#upbase-b2c-ext-root'));

    const targetInput = inputs.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 80 && rect.height > 16;
    });

    if (targetInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(targetInput, firstCode);
      } else {
        targetInput.value = firstCode;
      }
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      filledCount = 1;

      const buttons = Array.from(document.querySelectorAll('button')).filter(
        (b) => !b.closest('#upbase-b2c-ext-root')
      );
      const searchBtn = buttons.find((b) =>
        /search|tìm kiếm|kiểm tra|verify/i.test((b.innerText || b.textContent || '').trim())
      );
      if (searchBtn) {
        setTimeout(() => searchBtn.click(), 180);
      }
    }

    return { filled: filledCount > 0, filledCount, filledCode: firstCode };
  }

  // Quét bảng báo cáo trên màn hình TikTok Ads Manager (DOM Table Fallback)
  function parseTikTokAdsDomTableFallback() {
    if (!isAdsManager) return;
    const rows = document.querySelectorAll('tr, [role="row"]');
    rows.forEach((row) => {
      if (row.closest('#upbase-b2c-ext-root')) return;
      const text = (row.innerText || '').trim();
      const vidMatch = text.match(/\b(\d{18,20})\b/);
      if (!vidMatch) return;
      const videoId = vidMatch[1];
      if (state.adsRowsByVideoId[videoId]) return;

      const cells = Array.from(row.querySelectorAll('td, [role="gridcell"]')).map((c) =>
        (c.innerText || '').trim()
      );
      const numericVals = cells
        .map((c) => parseCompactNumber(c))
        .filter((n) => n > 0);

      const spendVal = numericVals[0] || 0;
      const gmvVal = numericVals[1] || 0;
      state.adsRowsByVideoId[videoId] = {
        videoId,
        handle: '',
        campaignName: 'Chiến dịch TikTok Ads',
        adsSpend: spendVal,
        gmv: gmvVal,
        orders: numericVals[2] || 0,
        roas: spendVal === 0 ? 0 : Number((gmvVal / spendVal).toFixed(2)),
        views: numericVals[3] || 0,
        impressions: numericVals[3] || 0,
        clicks: 0,
        ctr: 2.4,
        cvr: 3.1,
        hookRate2s: 32.5,
        viewRate6s: 14.2,
      };
    });
  }

  function parseTikTokSellerDomFallback() {
    if (!isSellerOrAffiliate && !window.location.href.includes('creator')) return;
    const bodyText = document.body ? document.body.innerText || '' : '';
    if (!bodyText) return;

    let handle = state.activeSellerHandle || '';
    const handleMatch = bodyText.match(/@([a-zA-Z0-9._]{3,32})/);
    if (handleMatch && handleMatch[1]) {
      handle = normHandle(handleMatch[1]);
    }
    const urlParams = new URLSearchParams(window.location.search || '');
    const paramHandle =
      urlParams.get('handle') ||
      urlParams.get('creator_handle') ||
      urlParams.get('unique_id') ||
      '';
    if (paramHandle) {
      handle = normHandle(paramHandle);
    }
    if (!handle) return;

    const prevSeller = state.sellerMetricsByHandle[handle] || {};

    function extractMetricAfterLabel(regexList) {
      for (const rx of regexList) {
        const m = bodyText.match(rx);
        if (m && m[1]) {
          const val = parseCompactNumber(m[1]);
          if (val > 0) return val;
        }
      }
      return null;
    }

    function extractPctAfterLabel(regexList) {
      for (const rx of regexList) {
        const m = bodyText.match(rx);
        if (m && m[1]) {
          const val = parsePercentValue(m[1] + '%');
          if (val !== null && val >= 0 && val <= 100) return val;
        }
      }
      return null;
    }

    const domGmv = extractMetricAfterLabel([
      /(?:GMV|Doanh số|Tổng doanh thu)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr|Tỷ)?)/i,
    ]);
    const domItemsSold = extractMetricAfterLabel([
      /(?:Số món đã bán|Số sản phẩm đã bán|Items sold|Units sold)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domGpm = extractMetricAfterLabel([
      /(?:GPM)[^\n0-9]{0,30}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domAov = extractMetricAfterLabel([
      /(?:AOV|GMV mỗi khách hàng|Giá trị đơn hàng trung bình|Avg\.?\s*order value)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domFollowers = extractMetricAfterLabel([
      /(?:Người theo dõi|Followers)[^\n0-9]{0,25}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domAvgViews = extractMetricAfterLabel([
      /(?:Lượt xem video trung bình|Avg\.?\s*video views|View trung bình)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domLiveGmv = extractMetricAfterLabel([
      /(?:GMV từ LIVE|LIVE GMV|Doanh thu LIVE)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr|Tỷ)?)/i,
    ]);
    const domLiveGpm = extractMetricAfterLabel([
      /(?:LIVE GPM|GPM từ LIVE|GPM LIVE)[^\n0-9]{0,30}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domLiveSessions = extractMetricAfterLabel([
      /(?:Số phiên LIVE|LIVE streams|Phiên phát trực tiếp)[^\n0-9]{0,30}([0-9][0-9.,]*)/i,
    ]);
    const domLiveAvgViews = extractMetricAfterLabel([
      /(?:Lượt xem LIVE trung bình|Avg\.?\s*LIVE views|View LIVE TB)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);
    const domLivePcu = extractMetricAfterLabel([
      /(?:PCU|Người xem đồng thời cao nhất|Peak viewers)[^\n0-9]{0,35}([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)/i,
    ]);

    const videoPct = extractPctAfterLabel([
      /(?:Video)[^\n0-9%]{0,25}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i,
    ]);
    const livePct = extractPctAfterLabel([
      /(?:LIVE|Livestream)[^\n0-9%]{0,25}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i,
    ]);
    const femalePct = extractPctAfterLabel([
      /(?:Nữ|Female)[^\n0-9%]{0,20}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i,
    ]);
    const malePct = extractPctAfterLabel([
      /(?:Nam|Male)[^\n0-9%]{0,20}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i,
    ]);
    const age18_24 = extractPctAfterLabel([
      /18\s*[-–]\s*24[^\n0-9%]{0,20}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i,
    ]);
    const age25_34 = extractPctAfterLabel([
      /25\s*[-–]\s*34[^\n0-9%]{0,20}([0-9]{1,3}(?:[.,][0-9]+)?)\s*%/i,
    ]);

    mergeProfileForHandle(handle, {
      handle,
      followers: domFollowers || prevSeller.followers || 0,
    });

    const vShare = videoPct ?? prevSeller.gmvShareVideo ?? 80;
    const lShare = livePct ?? prevSeller.gmvShareLive ?? 14;
    const cShare = Math.max(0, 100 - vShare - lShare);
    const fRatio = femalePct ?? prevSeller.femaleRatio ?? (malePct !== null ? 100 - malePct : 78);
    const mRatio = malePct ?? prevSeller.maleRatio ?? Math.max(0, 100 - fRatio);
    const a18 = age18_24 ?? prevSeller.age18_24 ?? 35;
    const a25 = age25_34 ?? prevSeller.age25_34 ?? 45;
    const a35 = Math.max(0, 100 - a18 - a25);
    const resolvedGmv = domGmv ?? prevSeller.recentRevenue ?? 0;
    const resolvedLiveGmv =
      domLiveGmv ??
      prevSeller.liveGmv ??
      (resolvedGmv > 0 && lShare > 0 ? Math.round(resolvedGmv * (lShare / 100)) : 0);

    mergeSellerMetricsForHandle(handle, {
      followers: domFollowers || prevSeller.followers || 0,
      recentRevenue: resolvedGmv,
      itemsSold: domItemsSold ?? prevSeller.itemsSold ?? 0,
      gpm: domGpm ?? prevSeller.gpm ?? 0,
      aov: domAov ?? prevSeller.aov ?? 0,
      avgViews: domAvgViews ?? prevSeller.avgViews ?? 0,
      gmvShareVideo: vShare,
      gmvShareLive: lShare,
      gmvShareProductCard: cShare,
      liveGmv: resolvedLiveGmv,
      liveGpm: domLiveGpm ?? prevSeller.liveGpm ?? 0,
      liveSessionCount: domLiveSessions ?? prevSeller.liveSessionCount ?? 0,
      liveAvgViews: domLiveAvgViews ?? prevSeller.liveAvgViews ?? 0,
      livePeakViewers: domLivePcu ?? prevSeller.livePeakViewers ?? 0,
      maleRatio: mRatio,
      femaleRatio: fRatio,
      age18_24: a18,
      age25_34: a25,
      age35Plus: a35,
      location: prevSeller.location || 'Việt Nam',
    });
  }

  // Bóc tách kết quả Tìm kiếm TikTok (Search Niche Saturation & KOC Finder - PRO)
  function parseTikTokSearchJson(data) {
    if (!data || typeof data !== 'object') return;
    const rawList =
      data.data ||
      data.item_list ||
      data.itemList ||
      data.user_list ||
      [];
    if (!Array.isArray(rawList)) return;

    const newSearchVids = [];
    for (const entry of rawList) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry.item || entry.aweme_info || (entry.id && entry.stats ? entry : null);
      if (item) {
        const norm = normalizeTikTokVideo(item, item.author?.uniqueId || '');
        if (norm) {
          newSearchVids.push(norm);
          if (norm.handle) {
            mergeVideosForHandle(norm.handle, [norm]);
          }
        }
      }
      const userObj = entry.user_info || entry.user || item?.author;
      if (userObj) {
        const h = normHandle(userObj.uniqueId || userObj.unique_id || userObj.ins_id || '');
        if (h) {
          const followers = parseCompactNumber(
            userObj.follower_count ??
              userObj.followerCount ??
              entry.item?.authorStats?.followerCount ??
              0
          );
          mergeProfileForHandle(h, {
            handle: h,
            displayName: String(userObj.nickname || h),
            avatarUrl: String(userObj.avatarThumb || userObj.avatar_thumb?.url_list?.[0] || ''),
            bio: String(userObj.signature || ''),
            followers,
          });
          if (!state.searchUsersList.some((u) => u.handle === h)) {
            state.searchUsersList.push({
              handle: h,
              displayName: String(userObj.nickname || h),
              followers,
              bio: String(userObj.signature || '').slice(0, 80),
            });
          }
        }
      }
    }

    if (newSearchVids.length > 0) {
      const byId = new Map();
      for (const v of state.searchVideosList) byId.set(v.videoId, v);
      for (const v of newSearchVids) byId.set(v.videoId, v);
      state.searchVideosList = enrichVideosWithProLabels(Array.from(byId.values()).slice(0, 60));
    }
  }

  function computeSearchNicheSaturation(fallbackVideos) {
    const pool =
      state.searchVideosList.length > 0
        ? state.searchVideosList
        : Array.isArray(fallbackVideos)
          ? fallbackVideos
          : [];
    if (pool.length === 0) return null;

    const totalVideos = pool.length;
    const shopVideos = pool.filter(
      (v) => v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)
    );
    const shopRatioPct = Math.round((shopVideos.length / totalVideos) * 100);
    const totalViews = pool.reduce((s, v) => s + Number(v.views || 0), 0);
    const avgViews = Math.round(totalViews / totalVideos);

    const authorMap = {};
    for (const v of pool) {
      const h = v.handle || 'koc';
      if (!authorMap[h]) {
        const prof = state.profilesByHandle[h] || {};
        authorMap[h] = {
          handle: h,
          displayName: prof.displayName || v.authorDisplayName || h,
          followers: prof.followers || v.authorFollowers || 0,
          videoCount: 0,
          shopVideoCount: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
        };
      } else if (!authorMap[h].followers && v.authorFollowers) {
        authorMap[h].followers = v.authorFollowers;
      }
      authorMap[h].videoCount++;
      authorMap[h].totalViews += Number(v.views || 0);
      authorMap[h].totalLikes += Number(v.likes || 0);
      authorMap[h].totalComments += Number(v.comments || 0);
      authorMap[h].totalShares += Number(v.shares || 0);
      if (v.isSponsored || v.hasYellowCart || (v.cartProducts && v.cartProducts.length > 0)) {
        authorMap[h].shopVideoCount++;
      }
    }

    const discoveredKocs = Object.values(authorMap)
      .map((k) => {
        const avgViews = k.videoCount === 0 ? 0 : Math.round(k.totalViews / k.videoCount);
        const er =
          k.totalViews === 0
            ? 0
            : Number((((k.totalLikes + k.totalComments + k.totalShares) / k.totalViews) * 100).toFixed(2));
        return {
          ...k,
          avgViews,
          engagementRate: er,
        };
      })
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 15);

    const saturationScore = Math.min(
      100,
      Math.round(shopRatioPct * 0.65 + Math.min(35, (avgViews / 50000) * 35))
    );
    const competitionLabel =
      saturationScore >= 65
        ? 'Cạnh tranh cao (Nhiều KOC gắn giỏ)'
        : saturationScore >= 35
          ? 'Cạnh tranh trung bình (Đang tăng trưởng)'
          : 'Cạnh tranh thấp (Ngách mới tiềm năng)';

    return {
      totalVideos,
      shopVideoCount: shopVideos.length,
      shopRatioPct,
      avgViews,
      saturationScore,
      competitionLabel,
      discoveredKocs,
    };
  }

  function getCurrentUrlInfo() {
    const path = window.location.pathname || '';
    if (isAdsManager) {
      return {
        pageType: 'ads_manager',
        handle: state.activeSellerHandle || '',
        videoId: null,
      };
    }
    if (isSellerOrAffiliate) {
      return {
        pageType: 'seller_creator',
        handle: state.activeSellerHandle || '',
        videoId: null,
      };
    }
    if (state.platform === 'tiktok' || state.platform === 'douyin') {
      if (path.startsWith('/search')) {
        return {
          pageType: 'search',
          handle: state.searchVideosList[0]?.handle || '',
          videoId: null,
        };
      }
      const liveMatch = path.match(/^\/@([^/]+)\/live/);
      if (liveMatch || host.includes('live.tiktok.com') || host.includes('streamer.tiktok.com')) {
        return {
          pageType: 'live',
          handle: liveMatch ? normHandle(liveMatch[1]) : state.activeSellerHandle || '',
          videoId: null,
        };
      }
      const videoMatch =
        path.match(/^\/@([^/]+)\/video\/(\d+)/) || path.match(/^\/video\/(\d+)/);
      if (videoMatch) {
        const isDirectVid = videoMatch.length === 2;
        return {
          pageType: 'video',
          handle: isDirectVid
            ? state.currentVideoDetail?.handle || ''
            : normHandle(videoMatch[1]),
          videoId: isDirectVid ? videoMatch[1] : videoMatch[2],
        };
      }
      const profileMatch = path.match(/^\/@([^/?#]+)/) || path.match(/^\/user\/([^/?#]+)/);
      if (profileMatch) {
        return {
          pageType: 'profile',
          handle: normHandle(profileMatch[1]),
          videoId: null,
        };
      }
    } else if (state.platform === 'instagram') {
      const userReelOrPost = path.match(/^\/([A-Za-z0-9._]{2,30})\/(?:p|reel|reels)\/([^/?#]+)/);
      if (userReelOrPost && !['explore', 'reels', 'reel', 'direct', 'accounts', 'stories', 'p', 'tv'].includes(userReelOrPost[1])) {
        return {
          pageType: 'video',
          handle: normHandle(userReelOrPost[1]),
          videoId: userReelOrPost[2],
        };
      }
      const reelMatch = path.match(/^\/(?:p|reel|reels)\/([^/?#]+)/);
      if (reelMatch) {
        return {
          pageType: 'video',
          handle: state.currentVideoDetail?.handle || state.activeSellerHandle || '',
          videoId: reelMatch[1],
        };
      }
      const igProfile = path.match(/^\/([A-Za-z0-9._]{2,30})(?:\/(?:reels|tagged|saved|channel)?)?\/?$/);
      if (
        igProfile &&
        !['explore', 'reels', 'reel', 'direct', 'accounts', 'stories', 'p', 'tv', 'challenge', 'about', 'legal'].includes(
          igProfile[1].toLowerCase()
        )
      ) {
        return {
          pageType: 'profile',
          handle: normHandle(igProfile[1]),
          videoId: null,
        };
      }
    } else if (state.platform === 'threads') {
      if (path.startsWith('/search')) {
        return {
          pageType: 'search',
          handle: state.searchVideosList[0]?.handle || '',
          videoId: null,
        };
      }
      const postMatch =
        path.match(/^\/@([^/]+)\/post\/([^/?#]+)/) || path.match(/^\/t\/([^/?#]+)/);
      if (postMatch) {
        const isDirect = postMatch.length === 2;
        return {
          pageType: 'video',
          handle: isDirect
            ? state.currentVideoDetail?.handle || state.activeSellerHandle || ''
            : normHandle(postMatch[1]),
          videoId: isDirect ? postMatch[1] : postMatch[2],
        };
      }
      const thProfile = path.match(/^\/@([^/?#]+)/);
      if (thProfile) {
        return {
          pageType: 'profile',
          handle: normHandle(thProfile[1]),
          videoId: null,
        };
      }
    } else if (state.platform === 'facebook') {
      if (path.startsWith('/search')) {
        return {
          pageType: 'search',
          handle: state.searchVideosList[0]?.handle || '',
          videoId: null,
        };
      }
      const urlParams = new URLSearchParams(window.location.search || '');
      const fbReelMatch =
        path.match(/^\/(?:reel|reels)\/(\d+|[A-Za-z0-9_-]{8,})/) ||
        path.match(/^\/share\/(?:r|v)\/([A-Za-z0-9_-]+)/);
      if (fbReelMatch) {
        return {
          pageType: 'video',
          handle: state.currentVideoDetail?.handle || state.activeSellerHandle || '',
          videoId: fbReelMatch[1],
        };
      }
      const fbUserVideoMatch = path.match(/^\/([^/]+)\/(?:videos|posts)\/(\d+|[A-Za-z0-9_-]+)/);
      if (fbUserVideoMatch) {
        return {
          pageType: 'video',
          handle: normHandle(fbUserVideoMatch[1]),
          videoId: fbUserVideoMatch[2],
        };
      }
      if (path.startsWith('/watch') && urlParams.get('v')) {
        return {
          pageType: 'video',
          handle: state.currentVideoDetail?.handle || state.activeSellerHandle || '',
          videoId: urlParams.get('v'),
        };
      }
      if (host.includes('fb.watch') && path.length > 2) {
        return {
          pageType: 'video',
          handle: state.currentVideoDetail?.handle || state.activeSellerHandle || '',
          videoId: path.replace(/^\/+|\/+$/g, ''),
        };
      }
      if (path === '/profile.php' && urlParams.get('id')) {
        return {
          pageType: 'profile',
          handle: normHandle(urlParams.get('id')),
          videoId: null,
        };
      }
      const fbProfileMatch = path.match(/^\/([A-Za-z0-9._-]{3,50})(?:\/(?:reels|videos|about|posts|mentions)?)?\/?$/);
      const fbReserved = new Set([
        'watch',
        'reel',
        'reels',
        'marketplace',
        'groups',
        'gaming',
        'friends',
        'bookmarks',
        'notifications',
        'messages',
        'events',
        'memories',
        'saved',
        'adsmanager',
        'business',
        'login',
        'recover',
        'settings',
        'help',
        'photo',
        'photos',
        'permalink.php',
        'story.php',
        'sharer',
        'share',
      ]);
      if (fbProfileMatch && !fbReserved.has(fbProfileMatch[1].toLowerCase())) {
        return {
          pageType: 'profile',
          handle: normHandle(fbProfileMatch[1]),
          videoId: null,
        };
      }
    } else if (state.platform === 'shopee') {
      if (
        host.includes('live.shopee.vn') ||
        path.includes('/datacenter/live') ||
        path.startsWith('/live')
      ) {
        return {
          pageType: 'live',
          handle: state.activeSellerHandle || 'shopee_live',
          videoId: null,
        };
      }
      if (
        host.includes('affiliate.shopee.vn') ||
        path.includes('web-seller-affiliate')
      ) {
        return {
          pageType: 'seller_creator',
          handle: state.activeSellerHandle || 'shopee_affiliate',
          videoId: null,
        };
      }
      if (path.startsWith('/search')) {
        return {
          pageType: 'search',
          handle: state.activeSellerHandle || 'shopee_search',
          videoId: null,
        };
      }
      const spItemMatch =
        path.match(/-i\.(\d+)\.(\d+)/) || path.match(/^\/product\/(\d+)\/(\d+)/);
      if (spItemMatch) {
        const rawSlug = path.includes('-i.') ? path.split('-i.')[0].replace(/^\/+/, '') : '';
        let slugTitle = '';
        try {
          slugTitle = decodeURIComponent(rawSlug).replace(/-/g, ' ').trim();
        } catch {
          slugTitle = rawSlug.replace(/-/g, ' ').trim();
        }
        return {
          pageType: 'shopee_product',
          handle: state.activeSellerHandle || `shop_${spItemMatch[1]}`,
          videoId: spItemMatch[2],
          shopId: spItemMatch[1],
          itemId: spItemMatch[2],
          slugTitle,
        };
      }
      if (host.includes('sv.shopee.vn') || path.includes('/video/')) {
        return {
          pageType: 'video',
          handle: state.activeSellerHandle || 'shopee_video',
          videoId: state.currentVideoDetail?.videoId || 'sv_item',
        };
      }
      const spShopMatch = path.match(/^\/([A-Za-z0-9._-]{3,40})\/?$/);
      const spReserved = new Set([
        'search',
        'cart',
        'checkout',
        'user',
        'buyer',
        'mall',
        'flash_sale',
        'daily_discover',
        'campaigns',
        'universal-link',
        'portal',
      ]);
      if (spShopMatch && !spReserved.has(spShopMatch[1].toLowerCase())) {
        return {
          pageType: 'profile',
          handle: normHandle(spShopMatch[1]),
          videoId: null,
        };
      }
    }
    return { pageType: 'other', handle: state.activeSellerHandle || '', videoId: null };
  }

  let lastAutoAdvanceAt = 0;
  let profileGridAutoScrollTimer = null;

  function findNextFeedActionButton() {
    if (typeof document.querySelector !== 'function') return null;
    const directBtn = document.querySelector(
      '[data-e2e="arrow-right"], [data-e2e="video-switch-next"], [data-e2e="feed-nav-down"], button[aria-label*="next" i], button[aria-label*="tiếp" i], button[aria-label*="xuống" i]'
    );
    if (directBtn && !directBtn.disabled) return directBtn;

    if (typeof document.querySelectorAll === 'function') {
      const navBtns = Array.from(
        document.querySelectorAll(
          '[class*="FeedNavigation"] button, [class*="NavigationContainer"] button, aside button'
        )
      ).filter((b) => {
        if (!b || b.disabled || b.closest?.('#upbase-b2c-ext-root')) return false;
        if (typeof b.getBoundingClientRect !== 'function') return true;
        const r = b.getBoundingClientRect();
        return r.width >= 20 && r.height >= 20 && r.width <= 72 && r.height <= 72 && r.left > (window.innerWidth || 1000) * 0.5;
      });
      if (navBtns.length >= 2) {
        return navBtns[navBtns.length - 1];
      }
    }
    return null;
  }

  function triggerAutoScrollNextVideo(sourceVideoEl) {
    if (!state.playerControls.autoScroll) return;
    const now = Date.now();
    if (now - lastAutoAdvanceAt < 1350) return;
    lastAutoAdvanceAt = now;

    // 1. Ưu tiên bấm nút chuyển bài tiếp theo của TikTok / Reels nếu có trên giao diện
    const nextBtn = findNextFeedActionButton();
    if (nextBtn && typeof nextBtn.click === 'function') {
      nextBtn.click();
    }

    // 2. Tìm thẻ bài đăng (<article> / feed-item / <video> kế tiếp) bên dưới video hiện tại và cuộn tới tâm màn hình
    if (typeof document.querySelectorAll === 'function') {
      const refTop =
        sourceVideoEl && typeof sourceVideoEl.getBoundingClientRect === 'function'
          ? sourceVideoEl.getBoundingClientRect().top
          : 0;
      const candidates = Array.from(
        document.querySelectorAll(
          '[data-e2e="recommend-list-item-container"], [data-e2e="feed-item"], article, video'
        )
      ).filter((el) => {
        if (!el || el === sourceVideoEl || el.closest?.('#upbase-b2c-ext-root')) return false;
        if (sourceVideoEl && el.contains?.(sourceVideoEl)) return false;
        if (typeof el.getBoundingClientRect !== 'function') return false;
        const r = el.getBoundingClientRect();
        return r.height >= 120 && r.top > refTop + 90;
      });

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        const nextEl = candidates[0];
        if (typeof nextEl.scrollIntoView === 'function') {
          try {
            nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {
            nextEl.scrollIntoView();
          }
        }
      }
    }

    // 3. Cuộn khung chứa có thanh cuộn (scroll container) của TikTok / Reels & window
    let scrolledContainer = false;
    let curr = sourceVideoEl ? sourceVideoEl.parentElement : null;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (
        curr.scrollHeight > curr.clientHeight + 40 &&
        typeof curr.scrollBy === 'function' &&
        typeof window.getComputedStyle === 'function'
      ) {
        const st = window.getComputedStyle(curr);
        if (st && (st.overflowY === 'auto' || st.overflowY === 'scroll' || st.overflow === 'auto' || st.overflow === 'scroll')) {
          curr.scrollBy({ top: Math.round(curr.clientHeight * 0.88), behavior: 'smooth' });
          scrolledContainer = true;
          break;
        }
      }
      curr = curr.parentElement;
    }

    if (!nextBtn && !scrolledContainer && typeof window.scrollBy === 'function') {
      window.scrollBy({ top: Math.round((window.innerHeight || 800) * 0.85), behavior: 'smooth' });
    }

    // 4. Phát thêm phím ArrowDown cho trình điều khiển phím tắt của TikTok / Reels
    try {
      if (typeof KeyboardEvent === 'function' && typeof document.dispatchEvent === 'function') {
        const kd = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          code: 'ArrowDown',
          keyCode: 40,
          which: 40,
          bubbles: true,
          cancelable: true,
        });
        (document.activeElement || document.body || document).dispatchEvent(kd);
      }
    } catch {}

    setTimeout(broadcastSnapshot, 220);
    setTimeout(broadcastSnapshot, 650);
  }

  function syncProfileGridAutoScrollLoop() {
    if (!state.playerControls.autoScroll) {
      if (profileGridAutoScrollTimer) {
        clearInterval(profileGridAutoScrollTimer);
        profileGridAutoScrollTimer = null;
      }
      return;
    }
    if (!profileGridAutoScrollTimer && typeof setInterval === 'function') {
      profileGridAutoScrollTimer = setInterval(() => {
        if (!state.playerControls.autoScroll) return;
        const urlInfo = getCurrentUrlInfo();
        if (urlInfo.pageType !== 'profile' && urlInfo.pageType !== 'search') return;
        // Nếu đang mở modal xem video toàn màn hình trên trang kênh thì nhường cho bộ tự cuộn theo thời lượng video
        const modalVideo =
          typeof document.querySelector === 'function'
            ? document.querySelector('[data-e2e="browse-video"], [data-e2e="detail-video"]')
            : null;
        if (modalVideo) return;
        if (typeof window.scrollBy === 'function') {
          window.scrollBy({ top: 680, behavior: 'smooth' });
        }
      }, 1800);
    }
  }

  // Điều khiển Trình phát Video trên trang (Tự cuộn, Phát nền, Tốc độ phát, Âm lượng - MIỄN PHÍ)
  function applyPlayerControlsOnPage() {
    if (typeof document.querySelector !== 'function') return;
    const cfg = state.playerControls;
    syncProfileGridAutoScrollLoop();

    const allVids =
      typeof document.querySelectorAll === 'function'
        ? Array.from(document.querySelectorAll('video'))
        : [];
    const firstVid = document.querySelector('video');
    if (firstVid && !allVids.includes(firstVid)) {
      allVids.unshift(firstVid);
    }
    if (allVids.length === 0) return;

    for (const videoEl of allVids) {
      if (!videoEl) continue;

      if (cfg.playbackSpeed && Math.abs((videoEl.playbackRate || 1) - cfg.playbackSpeed) > 0.05) {
        videoEl.playbackRate = cfg.playbackSpeed;
      }
      if (typeof cfg.volumePct === 'number' && cfg.volumePct >= 0 && cfg.volumePct <= 100) {
        const targetVol = cfg.volumePct / 100;
        if (Math.abs((videoEl.volume ?? 1) - targetVol) > 0.05) {
          videoEl.volume = targetVol;
        }
      }

      // Khi bật Tự cuộn: tắt thuộc tính loop của thẻ <video> để trình duyệt không tự lặp vô hạn
      if (cfg.autoScroll) {
        if (videoEl.loop) videoEl.loop = false;
        if (typeof videoEl.removeAttribute === 'function') {
          try {
            videoEl.removeAttribute('loop');
          } catch {}
        }
      }

      if (!videoEl.__upbaseEndedBound && typeof videoEl.addEventListener === 'function') {
        videoEl.__upbaseEndedBound = true;

        videoEl.addEventListener('ended', () => {
          if (!state.playerControls.autoScroll) return;
          triggerAutoScrollNextVideo(videoEl);
        });

        videoEl.addEventListener('timeupdate', () => {
          if (!state.playerControls.autoScroll) return;
          if (videoEl.paused) return;
          if (videoEl.loop) {
            videoEl.loop = false;
            try {
              videoEl.removeAttribute?.('loop');
            } catch {}
          }
          // Kiểm tra video đang hiển thị trong vùng nhìn thấy
          if (typeof videoEl.getBoundingClientRect === 'function') {
            const r = videoEl.getBoundingClientRect();
            const vh = window.innerHeight || 900;
            if (r.height > 0 && (r.height < 100 || r.bottom < 40 || r.top > vh - 40)) {
              return;
            }
          }
          const dur = Number(videoEl.duration || 0);
          const cur = Number(videoEl.currentTime || 0);
          if (!Number.isFinite(dur) || dur < 1.5) return;

          const prevMax = Number(videoEl.__upbaseMaxTime || 0);
          if (cur > prevMax) {
            videoEl.__upbaseMaxTime = cur;
          }

          // Nhánh 1: Video phát tới sát 0.25 giây cuối cùng
          if (cur >= dur - 0.25) {
            videoEl.__upbaseMaxTime = 0;
            triggerAutoScrollNextVideo(videoEl);
            return;
          }

          // Nhánh 2: Trình phát nội bộ của TikTok/Reels tự tua ngược về 0:00 sau khi đã phát >85% thời lượng
          if (prevMax >= Math.max(dur - 0.85, dur * 0.85) && cur < 0.65) {
            videoEl.__upbaseMaxTime = 0;
            triggerAutoScrollNextVideo(videoEl);
          }
        });
      }
    }
  }

  // Giữ phát nền khi chuyển tab (Phát nền - MIỄN PHÍ)
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener(
      'visibilitychange',
      (e) => {
        if (state.playerControls.bgPlay && document.hidden) {
          e.stopImmediatePropagation();
        }
      },
      true
    );
  }

  // Tìm khung Tile gốc của lưới Instagram / Facebook (free-sort-feed-extension resolveTileRoot pattern)
  function resolveMetaGridTile(linkEl) {
    if (!linkEl || !linkEl.parentElement) return linkEl;
    let cur = linkEl;
    for (let depth = 0; depth < 6 && cur && cur !== document.body; depth++) {
      const parent = cur.parentElement;
      if (!parent || parent.tagName === 'MAIN' || parent.tagName === 'BODY') break;
      const sibCount = parent.children ? parent.children.length : 0;
      const linksInsideCur = cur.querySelectorAll
        ? cur.querySelectorAll('a[href*="/reel/"], a[href*="/p/"], a[href*="/videos/"]').length
        : 1;
      if (linksInsideCur <= 1 && sibCount >= 3) {
        return cur;
      }
      cur = parent;
    }
    return linkEl;
  }

  // Gắn Nhãn số liệu & Nhãn chữ PRO trực tiếp lên từng thẻ Video của lưới TikTok, Douyin, Instagram, Threads & Facebook + Sắp xếp lưới
  function injectGridCardOverlaysAndSort(videos) {
    if (
      state.platform !== 'tiktok' &&
      state.platform !== 'douyin' &&
      state.platform !== 'instagram' &&
      state.platform !== 'facebook' &&
      state.platform !== 'threads'
    ) {
      return;
    }
    if (typeof document.querySelectorAll !== 'function' || typeof document.createElement !== 'function') return;

    const isMetaGrid = state.platform === 'instagram' || state.platform === 'facebook';
    const isThreadsFeed = state.platform === 'threads';

    let cardNodes = [];
    if (state.platform === 'tiktok' || state.platform === 'douyin') {
      cardNodes = Array.from(
        document.querySelectorAll(
          '[data-e2e="user-post-item"], [data-e2e="search_video-item"], [data-e2e="user-liked-item"]'
        )
      );
    } else if (state.platform === 'instagram') {
      cardNodes = Array.from(
        document.querySelectorAll('main a[href*="/reel/"], main a[href*="/p/"]')
      ).filter((el) => !el.closest('#upbase-b2c-ext-root') && el.querySelector('img'));
    } else if (state.platform === 'facebook') {
      cardNodes = Array.from(
        document.querySelectorAll('a[href*="/reel/"], a[href*="/videos/"]')
      ).filter((el) => !el.closest('#upbase-b2c-ext-root') && el.querySelector('img'));
    } else if (state.platform === 'threads') {
      cardNodes = Array.from(
        document.querySelectorAll('[data-pressable-container="true"], article')
      ).filter((el) => !el.closest('#upbase-b2c-ext-root') && el.querySelector('a[href*="/post/"]'));
    }
    if (cardNodes.length === 0) return;

    const vidById = new Map();
    for (const v of videos || []) {
      if (v && v.videoId) vidById.set(String(v.videoId), v);
      if (v && v.metaCode) vidById.set(String(v.metaCode), v);
      if (v && v.metaPk) vidById.set(String(v.metaPk), v);
    }
    for (const v of state.searchVideosList || []) {
      if (v && v.videoId && !vidById.has(String(v.videoId))) {
        vidById.set(String(v.videoId), v);
      }
      if (v && v.metaCode && !vidById.has(String(v.metaCode))) {
        vidById.set(String(v.metaCode), v);
      }
    }

    const nfLocal = new Intl.NumberFormat('vi-VN');
    const showOverlay = state.playerControls.gridOverlayEnabled !== false;

    cardNodes.forEach((card, idx) => {
      const existingOverlay = card.querySelector('.ub-GridCardOverlay, .ub-ThreadsPostBar');
      const existingPill = card.querySelector('.ub-ThumbCartPill');
      const existingMetaDl = card.querySelector('.ub-MetaQuickDlBtn');
      const tileRoot = isMetaGrid ? resolveMetaGridTile(card) : card;

      if (!showOverlay) {
        if (existingOverlay) existingOverlay.remove();
        if (existingPill) existingPill.remove();
        if (existingMetaDl) existingMetaDl.remove();
        if (card.classList) card.classList.remove('ub-Card--hasCart');
        return;
      }

      const linkEl =
        card.tagName === 'A'
          ? card
          : card.querySelector(
              'a[href*="/video/"], a[href*="/photo/"], a[href*="/reel/"], a[href*="/p/"], a[href*="/post/"], a[href*="/videos/"]'
            );
      const href = linkEl ? linkEl.getAttribute('href') || '' : '';
      const m =
        href.match(/\/(?:video|photo)\/(\d+)/) ||
        href.match(/\/(?:p|reel|reels|post|videos)\/([A-Za-z0-9_-]+)/);
      const vidId = m ? m[1] : `dom-${idx}`;
      let vObj = vidById.get(vidId) || (videos && videos[idx]) || null;
      if (!vObj) {
        const viewsText =
          card.querySelector('[data-e2e="video-views"]')?.textContent ||
          card.innerText ||
          '0';
        const domViews = isThreadsFeed ? 0 : parseCompactNumber(viewsText);
        const domCaption = card.querySelector('img')?.getAttribute('alt') || card.innerText || '';
        const commerce = extractSocialCommerceProductsFromText(domCaption, []);
        const domHasCart = commerce.hasYellowCart || /giỏ hàng|tiktokshop/i.test(domCaption);
        vObj = {
          videoId: vidId,
          videoUrl: href.startsWith('http') ? href : `${window.location.origin}${href || ''}`,
          handle: getCurrentUrlInfo().handle || state.activeSellerHandle || '',
          caption: domCaption,
          publishedAt: new Date().toISOString().slice(0, 10),
          views: domViews,
          likes: 0,
          comments: 0,
          saves: 0,
          shares: 0,
          viewsPerHour: domViews > 0 ? Math.max(1, Math.round(domViews / 48)) : 0,
          engagementRate: 0,
          hasYellowCart: domHasCart,
          cartProducts: commerce.cartProducts,
          gridLabels: [],
        };
      }

      const hasCart = Boolean(
        vObj.hasYellowCart || (Array.isArray(vObj.cartProducts) && vObj.cartProducts.length > 0)
      );
      const prodCount =
        Array.isArray(vObj.cartProducts) && vObj.cartProducts.length > 0
          ? vObj.cartProducts.length
          : hasCart
            ? 1
            : 0;
      const firstProdTitle =
        Array.isArray(vObj.cartProducts) && vObj.cartProducts[0]?.title
          ? String(vObj.cartProducts[0].title)
          : '';

      if (tileRoot && tileRoot.setAttribute) {
        tileRoot.setAttribute('data-ub-views', String(vObj.views || 0));
        tileRoot.setAttribute('data-ub-likes', String(vObj.likes || 0));
        tileRoot.setAttribute('data-ub-er', String(vObj.engagementRate || 0));
        tileRoot.setAttribute('data-ub-velocity', String(vObj.viewsPerHour || 0));
        tileRoot.setAttribute('data-ub-shop', hasCart ? '1' : '0');
        tileRoot.setAttribute('data-ub-idx', tileRoot.getAttribute('data-ub-idx') || String(idx));
      }
      card.setAttribute('data-ub-views', String(vObj.views || 0));
      card.setAttribute('data-ub-likes', String(vObj.likes || 0));
      card.setAttribute('data-ub-er', String(vObj.engagementRate || 0));
      card.setAttribute('data-ub-velocity', String(vObj.viewsPerHour || 0));
      card.setAttribute('data-ub-shop', hasCart ? '1' : '0');
      card.setAttribute('data-ub-idx', card.getAttribute('data-ub-idx') || String(idx));

      if (card.classList && !isThreadsFeed) {
        if (hasCart) {
          card.classList.add('ub-Card--hasCart');
        } else {
          card.classList.remove('ub-Card--hasCart');
        }
      }

      // Lọc ẩn nếu đang bật chế độ "Chỉ hiện bài gắn giỏ"
      if (state.playerControls.gridSortMode === 'shop_only') {
        if (tileRoot && tileRoot.style) tileRoot.style.display = hasCart ? '' : 'none';
      } else if (tileRoot && tileRoot.style && tileRoot.style.display === 'none') {
        tileRoot.style.display = '';
      }

      const renderSig = [
        vObj.videoId,
        vObj.views || 0,
        vObj.likes || 0,
        vObj.comments || 0,
        vObj.saves || 0,
        hasCart ? 1 : 0,
        prodCount,
        firstProdTitle,
        vObj.publishedAt || '',
        (vObj.gridLabels || []).map((l) => l.text).join(','),
      ].join('|');

      if (
        existingOverlay &&
        existingOverlay.getAttribute('data-vid') === String(vObj.videoId) &&
        existingOverlay.getAttribute('data-sig') === renderSig
      ) {
        return;
      }
      if (existingOverlay) existingOverlay.remove();
      if (existingPill) existingPill.remove();
      if (existingMetaDl) existingMetaDl.remove();

      const safeProdTitle = firstProdTitle
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      // NHÁNH 1: Giao diện Thanh ngang chuyên biệt cho luồng bài đăng dọc trên Threads (không che Avatar, không phá CSS Grid)
      if (isThreadsFeed) {
        const bar = document.createElement('div');
        bar.className = `ub-ThreadsPostBar ub-GridCardOverlay${hasCart ? ' ub-ThreadsPostBar--hasCart' : ''}`;
        bar.setAttribute('data-vid', String(vObj.videoId));
        bar.setAttribute('data-sig', renderSig);
        const badgeText = hasCart ? `🛒 Gắn link SP (${prodCount})` : '📝 Bài Threads';
        const badgeCls = hasCart ? 'ub-GridTag ub-GridTag--cart' : 'ub-GridTag ub-GridTag--nocart';
        const mediaBtnLabel =
          vObj.playableUrl || card.querySelector('video')
            ? '⬇ Tải Video'
            : Array.isArray(vObj.imageUrls) && vObj.imageUrls.length > 0
              ? `⬇ Ảnh (${vObj.imageUrls.length})`
              : '⬇ Tải bài';

        bar.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="${badgeCls}">${badgeText}</span>
            ${hasCart && safeProdTitle ? `<span style="color:#B42318; font-weight:600; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${safeProdTitle}">${safeProdTitle}</span>` : ''}
            <span style="color:#4A4944; font-variant-numeric:tabular-nums;">
              ❤️ <strong>${nfLocal.format(vObj.likes || 0)}</strong> · 💬 <strong>${nfLocal.format(vObj.comments || 0)}</strong> · 🔁 <strong>${nfLocal.format(vObj.shares || 0)}</strong>${vObj.views > 0 ? ` · 👁️ <strong>${nfLocal.format(vObj.views)}</strong>` : ''}
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <button type="button" class="ub-GridQuickBtn ub-BtnThreadsInspect" style="background:#FFFFFF; color:#1A1A18; border:1px solid #C8C5BC;">🔍 Chọn bài</button>
            <button type="button" class="ub-GridQuickBtn ub-BtnThreadsDl" data-dl-url="${vObj.playableUrl || vObj.imageUrls?.[0] || vObj.videoUrl || ''}" data-dl-id="${vObj.videoId}">${mediaBtnLabel}</button>
          </div>
        `;

        bar.querySelector('.ub-BtnThreadsInspect')?.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          state.currentVideoDetail = vObj;
          if (vObj.handle) state.activeSellerHandle = vObj.handle;
          completeMetaMediaItemOnDemand(vObj).then(() => broadcastSnapshot());
          broadcastSnapshot();
        });

        bar.querySelector('.ub-BtnThreadsDl')?.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const dlTarget =
            vObj.playableUrl ||
            pickBestMetaMp4FromPerformance() ||
            (Array.isArray(vObj.imageUrls) && vObj.imageUrls[0]) ||
            vObj.videoUrl ||
            '';
          window.postMessage(
            {
              source: 'UPBASE_B2C_GRID_QUICK_DOWNLOAD',
              videoId: vObj.videoId,
              playableUrl: dlTarget,
              videoUrl: vObj.videoUrl || '',
              handle: vObj.handle || '',
            },
            '*'
          );
        });

        card.appendChild(bar);
        return;
      }

      // NHÁNH 2: Giao diện Compact Tile Overlay cho lưới vuông / 9:16 của Instagram & Facebook Reels
      if (isMetaGrid) {
        card.style.position = card.style.position || 'relative';
        if (hasCart) {
          const pill = document.createElement('div');
          pill.className = 'ub-ThumbCartPill';
          pill.textContent = `🔗 LINK SP (${prodCount})`;
          if (firstProdTitle) pill.title = firstProdTitle;
          card.appendChild(pill);
        }

        const topDlBtn = document.createElement('button');
        topDlBtn.type = 'button';
        topDlBtn.className = 'ub-MetaQuickDlBtn';
        topDlBtn.textContent = '⬇ MP4';
        topDlBtn.title = 'Tải Video / Ảnh chất lượng gốc';
        topDlBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          await completeMetaMediaItemOnDemand(vObj);
          const dlTarget =
            vObj.playableUrl ||
            pickBestMetaMp4FromPerformance() ||
            (Array.isArray(vObj.imageUrls) && vObj.imageUrls[0]) ||
            vObj.videoUrl ||
            '';
          window.postMessage(
            {
              source: 'UPBASE_B2C_GRID_QUICK_DOWNLOAD',
              videoId: vObj.videoId,
              playableUrl: dlTarget,
              videoUrl: vObj.videoUrl || '',
              handle: vObj.handle || '',
            },
            '*'
          );
        });
        card.appendChild(topDlBtn);

        const overlay = document.createElement('div');
        overlay.className = `ub-GridCardOverlay ub-GridCardOverlay--compactTile${hasCart ? ' ub-GridCardOverlay--hasCart' : ''}`;
        overlay.setAttribute('data-vid', String(vObj.videoId));
        overlay.setAttribute('data-sig', renderSig);
        overlay.innerHTML = `
          ${
            hasCart && safeProdTitle
              ? `<div class="ub-GridCardProduct" title="${safeProdTitle}">🛍️ ${safeProdTitle}</div>`
              : ''
          }
          <div class="ub-GridCardStats" style="justify-content:space-between; font-size:12px;">
            <span>👁️ <strong>${vObj.views > 0 ? nfLocal.format(vObj.views) : '—'}</strong></span>
            <span>❤️ <strong>${vObj.likes > 0 ? nfLocal.format(vObj.likes) : '—'}</strong></span>
            <span>💬 <strong>${vObj.comments > 0 ? nfLocal.format(vObj.comments) : '—'}</strong></span>
          </div>
        `;
        overlay.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.currentVideoDetail = vObj;
          completeMetaMediaItemOnDemand(vObj).then(() => broadcastSnapshot());
          broadcastSnapshot();
        });
        card.appendChild(overlay);
        return;
      }

      // NHÁNH 3: Giao diện chuẩn cho lưới TikTok & Douyin
      if (hasCart) {
        const pill = document.createElement('div');
        pill.className = 'ub-ThumbCartPill';
        pill.textContent = `🛒 GẮN GIỎ (${prodCount} SP)`;
        if (firstProdTitle) pill.title = firstProdTitle;
        card.style.position = card.style.position || 'relative';
        card.appendChild(pill);
      }

      const otherLabels = (vObj.gridLabels || []).filter((lbl) => lbl.code !== 'SHOP_CART');
      const cartStatusTagHtml = hasCart
        ? `<span class="ub-GridTag ub-GridTag--cart">🛒 Gắn giỏ (${prodCount} SP)</span>`
        : `<span class="ub-GridTag ub-GridTag--nocart">Không gắn giỏ</span>`;
      const otherTagsHtml = otherLabels
        .map(
          (lbl) =>
            `<span class="ub-GridTag ub-GridTag--${lbl.tone || 'neutral'}">${lbl.text}</span>`
        )
        .join('');
      const tagsHtml = `${cartStatusTagHtml}${otherTagsHtml}`;

      const dateParts = String(vObj.publishedAt || '').split('-');
      const vnDateStr =
        dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : vObj.publishedAt || '';

      const overlay = document.createElement('div');
      overlay.className = `ub-GridCardOverlay${hasCart ? ' ub-GridCardOverlay--hasCart' : ''}`;
      overlay.setAttribute('data-vid', String(vObj.videoId));
      overlay.setAttribute('data-sig', renderSig);
      overlay.innerHTML = `
        <div class="ub-GridCardTags">${tagsHtml}</div>
        ${
          hasCart && safeProdTitle
            ? `<div class="ub-GridCardProduct" title="${safeProdTitle}">🛍️ ${safeProdTitle}</div>`
            : ''
        }
        <div class="ub-GridCardStats">
          <span>Xem: <strong>${nfLocal.format(vObj.views || 0)}</strong></span>
          <span>Tim: <strong>${nfLocal.format(vObj.likes || 0)}</strong></span>
          <span>BL: <strong>${nfLocal.format(vObj.comments || 0)}</strong></span>
          <span>Lưu: <strong>${nfLocal.format(vObj.saves || 0)}</strong></span>
        </div>
        <div class="ub-GridCardFooter">
          <span class="ub-GridCardDateVel" title="${vnDateStr} · ${nfLocal.format(vObj.viewsPerHour || 0)} view/h">${vnDateStr} · <strong>${nfLocal.format(vObj.viewsPerHour || 0)}</strong>/h</span>
          <button type="button" class="ub-GridQuickBtn" data-dl-url="${vObj.playableUrl || vObj.imageUrls?.[0] || vObj.videoUrl || ''}" data-dl-id="${vObj.videoId}">${
            Array.isArray(vObj.imageUrls) && vObj.imageUrls.length > 0 && !vObj.playableUrl
              ? `⬇ Ảnh (${vObj.imageUrls.length})`
              : '⬇ Tải MP4'
          }</button>
        </div>
      `;

      const dlBtn = overlay.querySelector('.ub-GridQuickBtn');
      if (dlBtn) {
        dlBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const origLabel = dlBtn.textContent || '⬇ Tải MP4';
          dlBtn.textContent = '⏳ Đang tải...';
          try {
            // Đọc bản ghi mới nhất từ bộ nhớ state nếu vừa được làm giàu
            const latestVid =
              (state.videosByHandle[vObj.handle] || []).find(
                (v) => String(v.videoId) === String(vObj.videoId)
              ) || vObj;
            let resolvedPlayable = latestVid.playableUrl || vObj.playableUrl || '';
            let resolvedImages =
              Array.isArray(latestVid.imageUrls) && latestVid.imageUrls.length > 0
                ? latestVid.imageUrls
                : Array.isArray(vObj.imageUrls)
                  ? vObj.imageUrls
                  : [];
            const resolvedPostUrl =
              latestVid.videoUrl ||
              vObj.videoUrl ||
              (vObj.videoId && vObj.handle
                ? `https://www.tiktok.com/@${vObj.handle}/video/${vObj.videoId}`
                : window.location.href);

            window.postMessage(
              {
                source: 'UPBASE_B2C_GRID_QUICK_DOWNLOAD',
                videoId: vObj.videoId,
                playableUrl: resolvedPlayable,
                imageUrls: resolvedImages,
                videoUrl: resolvedPostUrl,
                handle: vObj.handle || state.activeSellerHandle || '',
              },
              '*'
            );
            setTimeout(() => {
              dlBtn.textContent = '✓ Đang lưu';
              setTimeout(() => {
                dlBtn.textContent = origLabel;
              }, 1800);
            }, 600);
          } catch {
            dlBtn.textContent = origLabel;
          }
        });
      }

      card.appendChild(overlay);
    });

    // Sắp xếp lại thứ tự thẻ trên lưới DOM nếu người dùng chọn chế độ sắp xếp (Không tự ý đảo DOM trên luồng ảo hóa của Threads)
    const sortMode = state.playerControls.gridSortMode;
    if (
      !isThreadsFeed &&
      sortMode &&
      sortMode !== 'default' &&
      sortMode !== 'shop_only' &&
      cardNodes.length > 1
    ) {
      const sortTargets = isMetaGrid
        ? Array.from(new Set(cardNodes.map((c) => resolveMetaGridTile(c)).filter(Boolean)))
        : cardNodes;
      const parent = sortTargets[0]?.parentElement;
      if (parent && sortTargets.every((t) => t.parentElement === parent)) {
        const sortedCards = [...sortTargets].sort((a, b) => {
          if (sortMode === 'views') {
            return Number(b.getAttribute('data-ub-views') || 0) - Number(a.getAttribute('data-ub-views') || 0);
          }
          if (sortMode === 'likes') {
            return Number(b.getAttribute('data-ub-likes') || 0) - Number(a.getAttribute('data-ub-likes') || 0);
          }
          if (sortMode === 'er') {
            return Number(b.getAttribute('data-ub-er') || 0) - Number(a.getAttribute('data-ub-er') || 0);
          }
          if (sortMode === 'velocity') {
            return (
              Number(b.getAttribute('data-ub-velocity') || 0) -
              Number(a.getAttribute('data-ub-velocity') || 0)
            );
          }
          return Number(a.getAttribute('data-ub-idx') || 0) - Number(b.getAttribute('data-ub-idx') || 0);
        });
        sortedCards.forEach((c) => parent.appendChild(c));
      }
    }
  }

  function parseDomAndRehydrationFallback() {
    if (isAdsManager) {
      parseTikTokAdsDomTableFallback();
    }
    if (isSellerOrAffiliate) {
      parseTikTokSellerDomFallback();
    }

    const urlInfo = getCurrentUrlInfo();
    const handle = urlInfo.handle;

    const uniScript = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (uniScript && uniScript.textContent) {
      const txt = uniScript.textContent;
      if (state.__lastUniScriptLen !== txt.length) {
        state.__lastUniScriptLen = txt.length;
        try {
          const json = JSON.parse(txt);
          const scope = json?.__DEFAULT_SCOPE__ || {};
          if (scope['webapp.user-detail']) {
            parseTikTokUserDetailJson({ userInfo: scope['webapp.user-detail'].userInfo });
          }
          if (scope['webapp.video-detail']) {
            parseTikTokItemDetailJson({ itemInfo: scope['webapp.video-detail'].itemInfo });
          }
          if (scope['webapp.live-detail'] || urlInfo.pageType === 'live') {
            parseLiveRoomJsonDeep(json);
          }
          parseAnyTikTokJsonDeep(json);
        } catch {
          // Bỏ qua
        }
      }
    }

    const sigiScript =
      typeof document.getElementById === 'function' ? document.getElementById('SIGI_STATE') : null;
    if (sigiScript && sigiScript.textContent) {
      const sTxt = sigiScript.textContent;
      if (state.__lastSigiLen !== sTxt.length) {
        state.__lastSigiLen = sTxt.length;
        try {
          const parsedSigi = JSON.parse(sTxt);
          if (parsedSigi.LiveRoom || urlInfo.pageType === 'live') {
            parseLiveRoomJsonDeep(parsedSigi);
          }
          parseAnyTikTokJsonDeep(parsedSigi);
        } catch {
          // Bỏ qua
        }
      }
    }

    // Quét DOM phòng phát sóng trực tiếp (/@handle/live) & Màn hình Tổng kết khi Ca Live kết thúc
    if (urlInfo.pageType === 'live' && typeof document.querySelector === 'function') {
      const pcuEl = document.querySelector(
        '[data-e2e="live-people-count"], [data-e2e="live-room-audience-count"], [class*="AudienceCount"]'
      );
      const likeEl = document.querySelector(
        '[data-e2e="live-like-count"], [class*="LikeCount"]'
      );
      const titleEl = document.querySelector(
        '[data-e2e="live-room-title"], [data-e2e="user-RoomTitle"], h1, h2'
      );
      const domPcu = pcuEl ? parseCompactNumber(pcuEl.textContent || '') : 0;
      const domLikes = likeEl ? parseCompactNumber(likeEl.textContent || '') : 0;
      const domRoomTitle = titleEl ? (titleEl.textContent || '').trim() : '';

      // Nhận diện khi Phiên LIVE của gian hàng vừa kết thúc trên màn hình
      const endBannerEl = document.querySelector(
        '[data-e2e="live-end-title"], [data-e2e="live-ended"], [class*="LiveEnd"], [class*="EndContainer"]'
      );
      const rawBodySnippet = (document.body?.innerText || '').slice(0, 4500);
      const domIsEnded =
        Boolean(endBannerEl) ||
        /Phiên LIVE đã kết thúc|Buổi phát trực tiếp đã kết thúc|LIVE has ended|LIVE ended|Tổng kết phiên LIVE/i.test(
          rawBodySnippet
        );

      // Quét bình luận trôi trong phòng Live (Live Chat)
      const chatNodes = typeof document.querySelectorAll === 'function'
        ? Array.from(
            document.querySelectorAll(
              '[data-e2e="chat-message"], [class*="DivChatMessage"], [class*="ChatRoomMessage"]'
            )
          ).slice(-60)
        : [];
      const liveComments = [];
      for (const node of chatNodes) {
        const txt = (node.textContent || '').trim();
        if (!txt || txt.length < 3) continue;
        const phoneMatch = txt.match(/(?:\+?84|0)(?:3|5|7|8|9)[0-9.\-\s]{7,10}\b/);
        const extractedPhone = phoneMatch ? phoneMatch[0].replace(/[^0-9]/g, '') : '';
        let intentGroup = 'GENERAL';
        let intentLabel = 'Bình luận Live';
        for (const rule of COMMENT_INTENT_RULES) {
          if (rule.regex.test(txt)) {
            intentGroup = rule.group;
            intentLabel = rule.label;
            break;
          }
        }
        liveComments.push({
          text: txt.slice(0, 140),
          intentGroup,
          intentLabel,
          extractedPhone,
        });
      }

      mergeLiveSessionForHandle(handle || state.activeSellerHandle || 'live_koc', {
        isLive: !domIsEnded,
        isEnded: domIsEnded,
        roomTitle: domRoomTitle,
        currentViewers: domPcu,
        likes: domLikes,
        ...(liveComments.length > 0 ? { liveComments } : {}),
      });
    }

    if (state.platform === 'tiktok' && handle) {
      const domTitle = document.querySelector('[data-e2e="user-title"]')?.textContent?.trim();
      const domSub = document.querySelector('[data-e2e="user-subtitle"]')?.textContent?.trim();
      const domFollowers = document.querySelector('[data-e2e="followers-count"]')?.textContent?.trim();
      const domFollowing = document.querySelector('[data-e2e="following-count"]')?.textContent?.trim();
      const domLikes = document.querySelector('[data-e2e="likes-count"]')?.textContent?.trim();
      const domBio = document.querySelector('[data-e2e="user-bio"]')?.textContent?.trim();
      const domAvatar = document.querySelector('[data-e2e="user-avatar"] img')?.getAttribute('src');

      if (domFollowers || domTitle || domBio) {
        const existing = state.profilesByHandle[handle] || {};
        mergeProfileForHandle(handle, {
          handle,
          displayName: domSub || domTitle || existing.displayName || handle,
          avatarUrl: domAvatar || existing.avatarUrl || '',
          bio: domBio || existing.bio || '',
          followers: domFollowers ? parseCompactNumber(domFollowers) : existing.followers || 0,
          following: domFollowing ? parseCompactNumber(domFollowing) : existing.following || 0,
          totalLikes: domLikes ? parseCompactNumber(domLikes) : existing.totalLikes || 0,
        });
      }

      const postNodes = document.querySelectorAll('[data-e2e="user-post-item"]');
      if (postNodes.length > 0) {
        const knownIds = new Set(
          (state.videosByHandle[handle] || []).map((v) => String(v?.videoId || ''))
        );
        const domVids = [];
        let hasNewDomCard = false;
        postNodes.forEach((node, idx) => {
          const linkEl = node.querySelector('a[href*="/video/"], a[href*="/photo/"]');
          const href = linkEl ? linkEl.getAttribute('href') || '' : '';
          const m = href.match(/\/(?:video|photo)\/(\d+)/);
          const videoId = m ? m[1] : `dom-${idx}`;
          if (!knownIds.has(String(videoId))) {
            hasNewDomCard = true;
          }
          const viewsText =
            node.querySelector('[data-e2e="video-views"]')?.textContent ||
            node.innerText ||
            '0';
          const views = parseCompactNumber(viewsText);
          const badgeText = node.innerText || '';
          const isPinned = idx < 3 && /ghim|pinned/i.test(badgeText);
          const caption = node.querySelector('img')?.getAttribute('alt') || '';
          domVids.push({
            videoId,
            videoUrl: href.startsWith('http') ? href : `https://www.tiktok.com/@${handle}/video/${videoId}`,
            handle,
            caption,
            hashtags: extractHashtags(caption, []),
            publishedAt: new Date().toISOString().slice(0, 10),
            createTime: Math.floor(Date.now() / 1000) - idx * 86400,
            views,
            likes: Math.round(views * 0.045),
            comments: Math.round(views * 0.003),
            shares: Math.round(views * 0.002),
            saves: Math.round(views * 0.002),
            viewsPerHour: Math.max(10, Math.round(views / Math.max(24, (idx + 1) * 24))),
            engagementRate: 5.0,
            isPinned,
            isSponsored: /#ad|giỏ hàng|tiktokshop/i.test(caption),
            hasYellowCart: /giỏ hàng|tiktokshop/i.test(caption),
            cartProducts: [],
            _fromDomFallback: true,
          });
        });
        if (domVids.length > 0 && (hasNewDomCard || !state.videosByHandle[handle] || state.videosByHandle[handle].length === 0)) {
          mergeVideosForHandle(handle, domVids);
        }
      }

      if (urlInfo.pageType === 'video' && urlInfo.videoId) {
        const likeText =
          document.querySelector('[data-e2e="like-count"], [data-e2e="browse-like-count"]')?.textContent || '';
        const commentText =
          document.querySelector('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]')?.textContent || '';
        const shareText =
          document.querySelector('[data-e2e="share-count"], [data-e2e="browse-share-count"]')?.textContent || '';
        const saveText =
          document.querySelector('[data-e2e="undefined-count"], [data-e2e="browse-collect-count"], [data-e2e="collect-count"]')?.textContent || '';
        const descText =
          document.querySelector('[data-e2e="Executable-video-desc"], [data-e2e="browse-video-desc"], [data-e2e="video-desc"]')?.textContent || '';
        const existingVid =
          (state.videosByHandle[handle] || []).find((v) => String(v.videoId) === String(urlInfo.videoId)) ||
          (state.searchVideosList || []).find((v) => String(v.videoId) === String(urlInfo.videoId)) ||
          (state.currentVideoDetail && String(state.currentVideoDetail.videoId) === String(urlInfo.videoId)
            ? state.currentVideoDetail
            : null);
        const likes = likeText ? parseCompactNumber(likeText) : existingVid?.likes || 0;
        const comments = commentText ? parseCompactNumber(commentText) : existingVid?.comments || 0;
        const shares = shareText ? parseCompactNumber(shareText) : existingVid?.shares || 0;
        const saves = saveText ? parseCompactNumber(saveText) : existingVid?.saves || 0;
        const views = existingVid?.views || Math.max(likes * 18, 1000);
        const caption = descText || existingVid?.caption || '';

        // Bóc thêm bình luận trên DOM nếu TikTok đã render sẵn trên trang
        const domCommentEls = document.querySelectorAll('[data-e2e="comment-level-1"]');
        if (domCommentEls.length > 0 && !state.commentsByVideoId[urlInfo.videoId]) {
          const fakeComments = [];
          domCommentEls.forEach((el, idx) => {
            const t = (el.textContent || '').trim();
            if (t) fakeComments.push({ cid: `dom-c-${idx}`, text: t, user: { unique_id: 'viewer' } });
          });
          if (fakeComments.length > 0) {
            parseTikTokCommentsJson({ comments: fakeComments }, `aweme_id=${urlInfo.videoId}`);
          }
        }

        let domCartProducts = Array.isArray(existingVid?.cartProducts) ? existingVid.cartProducts : [];
        if (domCartProducts.length === 0 && typeof document.querySelectorAll === 'function') {
          const domAnchors = Array.from(
            document.querySelectorAll(
              'a[href*="shop.tiktok.com"], [data-e2e*="anchor-product"], [class*="DivAnchorTag"] a'
            )
          );
          for (const aEl of domAnchors) {
            const href = aEl.getAttribute('href') || '';
            const txt = (aEl.textContent || '').trim();
            if (/capcut/i.test(txt)) continue;
            const pidM = href.match(/\/(\d{15,22})(?:[/?#]|$)/);
            if (pidM || href.includes('shop.tiktok.com')) {
              domCartProducts.push({
                productId: pidM ? pidM[1] : '',
                title: txt || 'Sản phẩm gắn giỏ TikTok Shop',
                productUrl: href,
                shopName: 'TikTok Shop',
                source: 'TikTok Shop',
              });
            }
          }
        }

        state.currentVideoDetail = {
          ...(existingVid || {}),
          videoId: urlInfo.videoId,
          videoUrl: window.location.href.split('?')[0],
          handle,
          caption,
          hashtags: extractHashtags(caption, []),
          publishedAt: existingVid?.publishedAt || new Date().toISOString().slice(0, 10),
          views,
          likes,
          comments,
          shares,
          saves,
          engagementRate:
            views === 0 ? 0 : Number((((likes + comments + shares) / views) * 100).toFixed(2)),
          isPinned: Boolean(existingVid?.isPinned),
          isSponsored: Boolean(existingVid?.isSponsored || /#ad|giỏ hàng/i.test(caption)),
          hasYellowCart: Boolean(
            existingVid?.hasYellowCart ||
              domCartProducts.length > 0 ||
              document.querySelector('[data-e2e*="product"], [class*="anchor-product"], a[href*="shop.tiktok.com"]')
          ),
          cartProducts: domCartProducts,
          transcriptText:
            existingVid?.transcriptText || state.subtitleCacheByVideoId[urlInfo.videoId] || '',
          playableUrl: existingVid?.playableUrl || '',
          subtitleUrl: existingVid?.subtitleUrl || '',
          onScreenStickers: existingVid?.onScreenStickers || [],
        };

        if (handle) {
          mergeVideosForHandle(handle, [state.currentVideoDetail]);
        }
        ensureSubtitleFetchedForVideo(state.currentVideoDetail);
        ensureMobileCartUnlockedForVideo(state.currentVideoDetail);
      }
    }

    // Hỗ trợ đọc bài đăng đang hiển thị trên Trang chủ TikTok (For You Feed: tiktok.com/) với độ nhạy theo tâm màn hình
    if (
      (state.platform === 'tiktok' || state.platform === 'douyin') &&
      urlInfo.pageType === 'other' &&
      typeof document.querySelectorAll === 'function'
    ) {
      const viewH = window.innerHeight || 900;
      const viewCenterY = viewH / 2;

      const getRectInfo = (el) => {
        if (!el || typeof el.getBoundingClientRect !== 'function') return null;
        const r = el.getBoundingClientRect();
        if (r.height <= 6 || r.width <= 6) return null;
        if (r.bottom <= 20 || r.top >= viewH - 20) return null;
        const centerY = (r.top + r.bottom) / 2;
        return { rect: r, centerY, dist: Math.abs(centerY - viewCenterY) };
      };

      // 1. Tìm thẻ <video> đang nằm gần tâm màn hình nhất (ưu tiên video đang phát trong vùng nhìn thấy)
      const allVideos = Array.from(document.querySelectorAll('video'))
        .map((v) => ({ el: v, info: getRectInfo(v) }))
        .filter((x) => x.info !== null)
        .sort((a, b) => a.info.dist - b.info.dist);

      const playingCenterVid = allVideos.find((x) => !x.el.paused && x.info.dist < viewH * 0.45);
      const activeVideoObj = playingCenterVid || allVideos[0] || null;
      const activeVideoEl = activeVideoObj ? activeVideoObj.el : document.querySelector('video');
      const targetCenterY = activeVideoObj ? activeVideoObj.info.centerY : viewCenterY;
      const minVideoLeftPx = activeVideoObj?.info?.rect
        ? Math.max(48, Math.round(activeVideoObj.info.rect.left - 45))
        : 72;

      // Hàm chọn phần tử hiển thị trên màn hình nằm gần tâm của video đang phát nhất
      const pickClosestElement = (selector, minLeftPx = 0) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        let bestEl = null;
        let bestDist = Infinity;
        for (const el of nodes) {
          if (el.closest('#upbase-b2c-ext-root') || el.closest('nav') || el.closest('[data-e2e*="nav-"]')) continue;
          if (typeof el.getBoundingClientRect !== 'function') {
            if (!bestEl && (el.textContent || el.getAttribute?.('href'))) bestEl = el;
            continue;
          }
          const r = el.getBoundingClientRect();
          if (r.height <= 4 || r.width <= 4) continue;
          if (r.bottom <= 10 || r.top >= viewH - 10) continue;
          if (minLeftPx > 0 && r.left > 0 && r.left < minLeftPx) continue;
          const cy = (r.top + r.bottom) / 2;
          const dist = Math.abs(cy - targetCenterY);
          if (dist < bestDist) {
            bestDist = dist;
            bestEl = el;
          }
        }
        return bestEl;
      };

      const pickClosestText = (selector, minLeftPx = minVideoLeftPx) => {
        const el = pickClosestElement(selector, minLeftPx);
        return el && el.textContent ? el.textContent.trim() : '';
      };

      // 2. Bóc tách các chỉ số Tim, Bình luận, Lưu, Chia sẻ của đúng bài đang ở tâm màn hình
      const likeTxt = pickClosestText('[data-e2e="like-count"], [data-e2e="browse-like-count"]', minVideoLeftPx);
      const cmtTxt = pickClosestText('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]', minVideoLeftPx);
      const saveTxt = pickClosestText(
        '[data-e2e="undefined-count"], [data-e2e*="bookmark-count"], [data-e2e*="collect-count"]',
        minVideoLeftPx
      );
      const shareTxt = pickClosestText('[data-e2e="share-count"], [data-e2e="browse-share-count"]', minVideoLeftPx);
      const descTxt = pickClosestText(
        '[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="Executable-video-desc"]',
        minVideoLeftPx
      );
      const musicTxt = pickClosestText(
        '[data-e2e="video-music"], [data-e2e="browse-music"], a[href*="/music/"]',
        minVideoLeftPx
      );
      const closestAvatarImg = pickClosestElement('a[href*="/@"] img', minVideoLeftPx);
      const domAvatarUrl = closestAvatarImg ? closestAvatarImg.getAttribute('src') || '' : '';
      const domDurationSec =
        activeVideoEl && Number.isFinite(activeVideoEl.duration) && activeVideoEl.duration > 0
          ? Math.round(activeVideoEl.duration)
          : 0;

      let likes = likeTxt ? parseCompactNumber(likeTxt) : 0;
      let comments = cmtTxt ? parseCompactNumber(cmtTxt) : 0;
      let saves = saveTxt ? parseCompactNumber(saveTxt) : 0;
      let shares = shareTxt ? parseCompactNumber(shareTxt) : 0;

      // Nhánh dự phòng: Quét cột nút tương tác bên phải video đang phát
      if (likes === 0 && activeVideoEl && typeof activeVideoEl.getBoundingClientRect === 'function') {
        const vRect = activeVideoEl.getBoundingClientRect();
        const strongNodes = Array.from(document.querySelectorAll('button strong, button span'))
          .filter((el) => {
            if (el.closest('#upbase-b2c-ext-root')) return false;
            const info = getRectInfo(el);
            if (!info) return false;
            const r = info.rect;
            const t = (el.textContent || '').trim();
            return (
              r.left >= vRect.right - 90 &&
              r.left <= vRect.right + 140 &&
              Math.abs(info.centerY - targetCenterY) < viewH * 0.45 &&
              /^[0-9]+(?:[.,][0-9]+)?\s*(?:K|M|B|N|Tr)?$/i.test(t)
            );
          })
          .map((el) => parseCompactNumber(el.textContent || '0'))
          .filter((n) => n > 0);

        if (strongNodes.length >= 2) {
          likes = strongNodes[0] || 0;
          comments = strongNodes[1] || 0;
          saves = strongNodes[2] || 0;
          shares = strongNodes[3] || 0;
        }
      }

      // 3. Tìm @handle của đúng video đang ở giữa màn hình
      let feedHandle = '';
      let feedDisplayName = '';
      const bannedHandles = new Set([
        'công_ty',
        'cong_ty',
        'chương_trình',
        ' đề_xuất',
        'khám_phá',
        'hồ_sơ',
        'tiktok',
        'upload',
        'live',
      ]);

      // Ưu tiên tìm thẻ a[href*="/@"] có chứa tên kênh (không phải chữ LIVE) gần video nhất
      const authorLinks = Array.from(document.querySelectorAll('a[href*="/@"]')).filter((el) => {
        if (el.closest('#upbase-b2c-ext-root') || el.closest('nav') || el.closest('[data-e2e*="nav-"]')) return false;
        if (typeof el.getBoundingClientRect !== 'function') return true;
        const r = el.getBoundingClientRect();
        if (r.height <= 4 || r.width <= 4) return false;
        if (r.bottom <= 10 || r.top >= viewH - 10) return false;
        return r.left <= 0 || r.left >= minVideoLeftPx;
      });
      authorLinks.sort((a, b) => {
        if (typeof a.getBoundingClientRect !== 'function') return 0;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return Math.abs((ra.top + ra.bottom) / 2 - targetCenterY) - Math.abs((rb.top + rb.bottom) / 2 - targetCenterY);
      });

      for (const linkEl of authorLinks) {
        const href = linkEl.getAttribute('href') || '';
        const m = href.match(/\/@([^/?#&]+)/);
        if (m && m[1]) {
          const candidate = normHandle(m[1]);
          if (candidate && !bannedHandles.has(candidate)) {
            if (!feedHandle) feedHandle = candidate;
            const txt = (linkEl.textContent || '').trim();
            if (txt && txt.length < 50 && !/^live$/i.test(txt) && !feedDisplayName) {
              feedDisplayName = txt.replace(/^@+/, '');
            }
            if (feedHandle && feedDisplayName) break;
          }
        }
      }

      const domAuthorTitle = pickClosestText(
        '[data-e2e="video-author-uniqueid"], [data-e2e="feed-video-nickname"], [data-e2e="video-author-nickname"], [data-e2e="browse-username"], [class*="AuthorTitle"], h3',
        minVideoLeftPx
      );
      if (!feedDisplayName && domAuthorTitle && !/^live$/i.test(domAuthorTitle)) {
        feedDisplayName = domAuthorTitle.replace(/^@+/, '').trim();
      }
      if (!feedHandle && domAuthorTitle && !/^live$/i.test(domAuthorTitle)) {
        const slug = domAuthorTitle
          .replace(/^@+/, '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
        if (slug && !bannedHandles.has(slug)) feedHandle = slug.slice(0, 28);
      }

      // 4. Đối chiếu chính xác với danh sách video đã bắt từ API mạng (state.searchVideosList)
      const realPool = state.searchVideosList.filter((v) => v && !String(v.videoId).startsWith('feed-'));
      let matchedVid = null;

      // Ưu tiên 1: Nếu đã biết @handle từ DOM, tìm đúng bài của @handle đó khớp số Tim hoặc Mô tả
      if (feedHandle) {
        const sameAuthorVids = realPool.filter((v) => v.handle === feedHandle);
        if (sameAuthorVids.length > 0) {
          matchedVid =
            (likes > 0
              ? sameAuthorVids.find((v) => Math.abs((v.likes || 0) - likes) <= Math.max(10, likes * 0.08))
              : null) ||
            (descTxt && descTxt.length >= 4
              ? sameAuthorVids.find((v) =>
                  String(v.caption || '').toLowerCase().includes(descTxt.slice(0, 20).toLowerCase())
                )
              : null) ||
            sameAuthorVids[0];
        }
      }

      // Ưu tiên 2: Khớp theo nội dung mô tả (caption) trên màn hình
      if (!matchedVid && descTxt && descTxt.length >= 6) {
        const cleanDesc = descTxt.slice(0, 24).toLowerCase();
        matchedVid =
          realPool.find((v) => String(v.caption || '').toLowerCase().includes(cleanDesc)) || null;
      }

      // Ưu tiên 3: Khớp cả số Tim + số Bình luận đang hiển thị trên màn hình
      if (!matchedVid && likes > 0) {
        matchedVid =
          realPool.find(
            (v) =>
              Math.abs((v.likes || 0) - likes) <= Math.max(5, likes * 0.03) &&
              (comments === 0 || Math.abs((v.comments || 0) - comments) <= Math.max(5, comments * 0.1))
          ) || null;
      }

      // Ưu tiên 4: Chỉ khi vừa tải trang chưa đọc được DOM handle & chưa đọc được số Tim mới lấy realPool[0]
      if (!matchedVid && realPool.length > 0 && !feedHandle && !feedDisplayName && likes === 0) {
        matchedVid = realPool[0];
      }

      if (matchedVid && matchedVid.handle) {
        feedHandle = matchedVid.handle;
        if (!feedDisplayName && state.profilesByHandle[feedHandle]?.displayName) {
          feedDisplayName = state.profilesByHandle[feedHandle].displayName;
        }
      }

      if (feedHandle || likes > 0 || comments > 0 || matchedVid) {
        const finalHandle = feedHandle || matchedVid?.handle || 'tiktok_feed';
        state.activeSellerHandle = finalHandle;

        const finalLikes = likes || matchedVid?.likes || 0;
        const finalComments = comments || matchedVid?.comments || 0;
        const finalSaves = saves || matchedVid?.saves || 0;
        const finalShares = shares || matchedVid?.shares || 0;
        const estimatedViews = Math.max(
          finalLikes * 16 + finalComments * 35 + finalSaves * 22 + finalShares * 18,
          1000
        );
        const finalViews = matchedVid?.views || (finalLikes > 0 ? estimatedViews : 0);
        const videoSrc =
          matchedVid?.playableUrl ||
          (activeVideoEl?.currentSrc && activeVideoEl.currentSrc.startsWith('http')
            ? activeVideoEl.currentSrc
            : '') ||
          activeVideoEl?.querySelector('source')?.getAttribute('src') ||
          '';

        const existingProf = state.profilesByHandle[finalHandle] || {};
        mergeProfileForHandle(finalHandle, {
          handle: finalHandle,
          displayName:
            feedDisplayName || matchedVid?.authorDisplayName || existingProf.displayName || finalHandle,
          avatarUrl: domAvatarUrl || matchedVid?.authorAvatarUrl || existingProf.avatarUrl || '',
          bio: matchedVid?.authorBio || existingProf.bio || '',
          followers: matchedVid?.authorFollowers || existingProf.followers || 0,
        });

        const resolvedVidId = matchedVid?.videoId || `feed-${finalHandle}-${finalLikes || Date.now()}`;
        const feedVidObj = {
          ...(matchedVid || {}),
          videoId: resolvedVidId,
          videoUrl:
            matchedVid?.videoUrl ||
            (matchedVid?.videoId
              ? `https://www.tiktok.com/@${finalHandle}/video/${matchedVid.videoId}`
              : `https://www.tiktok.com/@${finalHandle}`),
          handle: finalHandle,
          authorDisplayName:
            feedDisplayName || matchedVid?.authorDisplayName || existingProf.displayName || finalHandle,
          authorFollowers: matchedVid?.authorFollowers || existingProf.followers || 0,
          caption: descTxt || matchedVid?.caption || '',
          hashtags: extractHashtags(descTxt || matchedVid?.caption || '', []),
          publishedAt: matchedVid?.publishedAt || new Date().toISOString().slice(0, 10),
          createTime: matchedVid?.createTime || Math.floor(Date.now() / 1000),
          durationSeconds: matchedVid?.durationSeconds || domDurationSec || 0,
          views: finalViews,
          likes: finalLikes,
          comments: finalComments,
          shares: finalShares,
          saves: finalSaves,
          engagementRate:
            finalViews === 0
              ? 0
              : Number((((finalLikes + finalComments + finalShares) / finalViews) * 100).toFixed(2)),
          isPinned: false,
          isSponsored: Boolean(matchedVid?.isSponsored || /#ad|giỏ hàng/i.test(descTxt)),
          hasYellowCart: Boolean(matchedVid?.hasYellowCart),
          cartProducts: matchedVid?.cartProducts || [],
          playableUrl: videoSrc,
          musicTitle: matchedVid?.musicTitle || musicTxt || 'Âm thanh gốc',
          transcriptText:
            matchedVid?.transcriptText ||
            (resolvedVidId && state.subtitleCacheByVideoId[resolvedVidId]) ||
            '',
        };

        state.currentVideoDetail = feedVidObj;
        ensureSubtitleFetchedForVideo(feedVidObj);
        ensureMobileCartUnlockedForVideo(feedVidObj);
        mergeVideosForHandle(finalHandle, [feedVidObj]);
        if (!state.searchVideosList.some((v) => v.videoId === feedVidObj.videoId)) {
          state.searchVideosList = enrichVideosWithProLabels(
            [feedVidObj, ...state.searchVideosList].slice(0, 150)
          );
        }
      }
    }

    // 5. Quét dữ liệu SSR <script type="application/json"> & DOM thực tế cho Instagram, Threads, Facebook & Reels
    if (
      (state.platform === 'instagram' ||
        state.platform === 'threads' ||
        state.platform === 'facebook') &&
      typeof document.querySelectorAll === 'function'
    ) {
      // 5.1. Đọc các thẻ <script type="application/json"> nhúng sẵn của Meta (Relay/SJS)
      const jsonScripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
      if (jsonScripts.length > 0 && state.__lastMetaScriptCount !== jsonScripts.length) {
        state.__lastMetaScriptCount = jsonScripts.length;
        for (const sc of jsonScripts) {
          const rawTxt = sc.textContent || '';
          if (
            rawTxt.length > 80 &&
            (rawTxt.includes('username') ||
              rawTxt.includes('shortcode') ||
              rawTxt.includes('video_versions') ||
              rawTxt.includes('playable_url') ||
              rawTxt.includes('follower_count') ||
              rawTxt.includes('thread_items') ||
              rawTxt.includes('progressive_urls') ||
              rawTxt.includes('browser_native_hd_url'))
          ) {
            try {
              parseMetaGraphQlAndSjsDeep(JSON.parse(rawTxt));
            } catch {}
          }
        }
      }

      // 5.2. Bóc tách thông tin Kênh (Profile Header) từ thẻ Meta & DOM (free-sort-feed-extension readProfileFollowers pattern)
      const metaDesc =
        document.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute('content') || '';
      const metaTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || '';

      let resolvedHandle = cleanMetaHandle(handle) || cleanMetaHandle(state.activeSellerHandle) || '';
      if (!resolvedHandle) {
        const titleHandleMatch =
          metaTitle.match(/@([A-Za-z0-9._]{2,32})/) ||
          metaDesc.match(/@([A-Za-z0-9._]{2,32})/);
        if (titleHandleMatch && titleHandleMatch[1]) {
          resolvedHandle = cleanMetaHandle(titleHandleMatch[1]);
        }
      }

      // Bóc tách Follower chính xác trên Instagram / Threads / Facebook Header (ưu tiên thuộc tính title số nguyên)
      const readExactMetaFollowersFromDom = () => {
        const headers = Array.from(document.querySelectorAll('main header, header, [role="main"]'));
        for (const hdr of headers) {
          const nodes = Array.from(hdr.querySelectorAll('a, span, div, li, button'));
          for (const el of nodes) {
            if (el.closest('#upbase-b2c-ext-root') || el.closest('h1, h2')) continue;
            const txt = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
            const m = txt.match(/^([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)\s+(?:followers?|người theo dõi)$/i);
            if (m && m[1]) {
              const titleAttr =
                el.getAttribute('title') ||
                el.querySelector('[title]')?.getAttribute('title') ||
                '';
              const exactFromTitle = parseCompactNumber(titleAttr);
              const approxFromText = parseCompactNumber(m[1]);
              if (exactFromTitle > 0) return exactFromTitle;
              if (approxFromText > 0) return approxFromText;
            }
          }
        }
        const flwMatch =
          metaDesc.match(/([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)\s*(?:Followers|người theo dõi)/i) ||
          (document.body?.innerText || '').match(/([0-9][0-9.,]*\s*(?:K|M|B|N|Tr)?)\s*(?:Followers|người theo dõi)/i);
        return flwMatch && flwMatch[1] ? parseCompactNumber(flwMatch[1]) : 0;
      };

      if (resolvedHandle) {
        const existingProf = state.profilesByHandle[resolvedHandle] || {};
        const parsedFlw = readExactMetaFollowersFromDom();
        const domFollowers = parsedFlw > 0 ? parsedFlw : existingProf.followers || 0;

        const rawHeaderH1 =
          document.querySelector('header h1, header h2, [role="main"] h1')?.textContent?.trim() || '';
        const cleanHeaderName =
          rawHeaderH1 && !/^(facebook|instagram|threads|reels|watch|thông báo|notifications)$/i.test(rawHeaderH1)
            ? rawHeaderH1
            : '';
        const domHeaderName =
          cleanHeaderName ||
          existingProf.displayName ||
          metaTitle.split(/[@(|•-]/)[0]?.trim() ||
          resolvedHandle;
        const domAvatar =
          document
            .querySelector(
              'header img, [role="main"] img[alt*="profile" i], [role="main"] img[alt*="ảnh đại diện" i]'
            )
            ?.getAttribute('src') ||
          existingProf.avatarUrl ||
          '';
        const domBio =
          document.querySelector('header section, [data-pressable-container="true"] span')?.textContent?.trim() ||
          existingProf.bio ||
          metaDesc;

        mergeProfileForHandle(resolvedHandle, {
          handle: resolvedHandle,
          displayName: domHeaderName,
          avatarUrl: domAvatar,
          bio: domBio,
          followers: domFollowers,
        });
      }

      // Hàm đọc con số nằm cạnh biểu tượng SVG (Play/View, Heart/Like, Comment) trên thẻ Instagram / Facebook (free-sort-feed-extension pattern)
      const extractSvgMetricsFromCard = (cardEl) => {
        let svgViews = 0;
        let svgLikes = 0;
        let svgComments = 0;
        const svgs = Array.from(cardEl.querySelectorAll('svg'));
        for (const svg of svgs) {
          const label = (
            (svg.getAttribute('aria-label') || '') +
            ' ' +
            (svg.parentElement?.getAttribute('aria-label') || '')
          ).toLowerCase();
          const nearText = (
            svg.parentElement?.textContent ||
            svg.parentElement?.parentElement?.textContent ||
            ''
          ).trim();
          const numMatch = nearText.match(/([0-9]+(?:[.,][0-9]+)?\s*(?:K|M|B|N|Tr)?)/i);
          const val = numMatch ? parseCompactNumber(numMatch[1]) : 0;
          if (!val) continue;
          if (/play|view|xem|reel|video|lượt phát/.test(label) || svg.querySelector('polygon')) {
            if (!svgViews) svgViews = val;
          } else if (/like|heart|thích|yêu thích/.test(label)) {
            if (!svgLikes) svgLikes = val;
          } else if (/comment|bình luận|trả lời|reply/.test(label)) {
            if (!svgComments) svgComments = val;
          }
        }
        return { svgViews, svgLikes, svgComments };
      };

      // 5.3. Quét danh sách bài đăng / Reels trên trang Kênh (Instagram, Threads, Facebook)
      if (state.platform === 'instagram' && resolvedHandle) {
        const igLinks = Array.from(
          document.querySelectorAll('main a[href*="/reel/"], main a[href*="/p/"]')
        ).filter((el) => !el.closest('#upbase-b2c-ext-root'));
        if (igLinks.length > 0) {
          const knownIds = new Set(
            (state.videosByHandle[resolvedHandle] || []).map((v) => String(v?.videoId || ''))
          );
          const domVids = [];
          let hasNew = false;
          igLinks.forEach((aEl, idx) => {
            const href = aEl.getAttribute('href') || '';
            const m = href.match(/\/(?:p|reel|reels)\/([^/?#]+)/);
            if (!m || !m[1]) return;
            const code = m[1];
            if (!knownIds.has(code)) hasNew = true;
            const existing = (state.videosByHandle[resolvedHandle] || []).find(
              (v) => v.videoId === code || v.metaCode === code
            );

            const { svgViews, svgLikes, svgComments } = extractSvgMetricsFromCard(aEl);
            const cardText = (aEl.innerText || '').trim();
            const nums = (cardText.match(/\b[0-9]+(?:[.,][0-9]+)?\s*(?:K|M|B|N|Tr)?\b/gi) || [])
              .map((n) => parseCompactNumber(n))
              .filter((n) => n > 0);
            const views = existing?.views || svgViews || nums[0] || 0;
            const likes = existing?.likes || svgLikes || nums[1] || 0;
            const comments = existing?.comments || svgComments || nums[2] || 0;
            const imgAlt = aEl.querySelector('img')?.getAttribute('alt') || '';
            const caption = existing?.caption || imgAlt;
            const commerce = extractSocialCommerceProductsFromText(caption, []);
            const denom = views > 0 ? views : Math.max(1, likes * 12 || 100);
            domVids.push({
              ...(existing || {}),
              videoId: code,
              metaCode: code,
              metaPk: existing?.metaPk || igShortcodeToPk(code),
              videoUrl: `https://www.instagram.com/${href.includes('/reel/') ? 'reel' : 'p'}/${code}/`,
              handle: resolvedHandle,
              caption,
              hashtags: extractHashtags(caption, []),
              publishedAt: existing?.publishedAt || new Date().toISOString().slice(0, 10),
              createTime: existing?.createTime || Math.floor(Date.now() / 1000) - idx * 86400,
              views,
              likes,
              comments,
              shares: existing?.shares || 0,
              saves: existing?.saves || 0,
              viewsPerHour:
                views > 0 ? Math.max(1, Math.round(views / Math.max(24, (idx + 1) * 24))) : 0,
              engagementRate:
                views === 0 && likes === 0
                  ? 0
                  : Number((((likes + comments) / denom) * 100).toFixed(2)),
              isPinned: Boolean(existing?.isPinned || (idx < 3 && /pinned|ghim/i.test(cardText))),
              isSponsored: Boolean(existing?.isSponsored || commerce.hasYellowCart),
              hasYellowCart: Boolean(existing?.hasYellowCart || commerce.hasYellowCart),
              cartProducts:
                existing?.cartProducts?.length > 0 ? existing.cartProducts : commerce.cartProducts,
              _fromDomFallback: !existing || existing._fromDomFallback,
            });
          });
          if (domVids.length > 0 && (hasNew || !(state.videosByHandle[resolvedHandle]?.length))) {
            mergeVideosForHandle(resolvedHandle, domVids);
          }
        }
      } else if (state.platform === 'threads') {
        const postContainers = Array.from(
          document.querySelectorAll('[data-pressable-container="true"], article')
        ).filter((el) => !el.closest('#upbase-b2c-ext-root') && el.querySelector('a[href*="/post/"]'));

        if (postContainers.length > 0) {
          const domVids = [];
          postContainers.forEach((card, idx) => {
            const postLink = card.querySelector('a[href*="/post/"]');
            const href = postLink ? postLink.getAttribute('href') || '' : '';
            const m = href.match(/\/@([^/]+)\/post\/([^/?#]+)/) || href.match(/\/post\/([^/?#]+)/);
            if (!m) return;
            const postHandle =
              (m.length >= 3 ? cleanMetaHandle(m[1]) : '') || resolvedHandle || 'threads';
            const postCode = m.length >= 3 ? m[2] : m[1];
            const existing =
              (state.videosByHandle[postHandle] || []).find(
                (v) => v.videoId === postCode || v.metaCode === postCode
              ) ||
              state.searchVideosList.find((v) => v.videoId === postCode || v.metaCode === postCode);

            // Lọc bỏ nội dung thanh công cụ của chúng ta (.ub-ThreadsPostBar) trước khi đọc văn bản bài đăng
            const cloneCard = card.cloneNode ? card.cloneNode(true) : null;
            if (cloneCard && cloneCard.querySelectorAll) {
              cloneCard
                .querySelectorAll('.ub-ThreadsPostBar, .ub-GridCardOverlay, time')
                .forEach((el) => el.remove());
            }
            const rawCardText = ((cloneCard || card).innerText || '').trim();
            // Bỏ dòng tên tài khoản và mốc thời gian ở đầu bài Threads
            const cleanLines = rawCardText
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(
                (l) =>
                  l &&
                  l.toLowerCase() !== postHandle.toLowerCase() &&
                  !/^[0-9]+\s*(?:giây|phút|giờ|ngày|tuần|s|m|h|d|w)$/i.test(l) &&
                  !/^[0-9]{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?$/.test(l)
              );
            const fullText = existing?.caption || cleanLines.join('\n').slice(0, 360) || rawCardText.slice(0, 280);

            const extLinks = Array.from(card.querySelectorAll('a[href^="http"]'))
              .map((a) => a.getAttribute('href') || '')
              .filter((u) => !u.includes('threads.net') && !u.includes('threads.com'));
            const commerce = extractSocialCommerceProductsFromText(fullText, extLinks);

            // Đọc chính xác số Tim, Trả lời, Đăng lại từ các nút tương tác trên bài Threads (không đọc nhầm số giờ hoặc số trong bài viết)
            let btnLikes = 0;
            let btnComments = 0;
            let btnShares = 0;
            const actionSvgs = Array.from(card.querySelectorAll('svg'));
            for (const svg of actionSvgs) {
              if (svg.closest('.ub-ThreadsPostBar')) continue;
              const lbl = (
                (svg.getAttribute('aria-label') || '') +
                ' ' +
                (svg.closest('[role="button"], button')?.getAttribute('aria-label') || '')
              ).toLowerCase();
              const btnEl = svg.closest('[role="button"], button') || svg.parentElement;
              const txt = (btnEl?.textContent || '').trim();
              const numVal = parseCompactNumber(txt);
              if (!numVal) continue;
              if (/thích|like|tim|heart/.test(lbl)) {
                if (!btnLikes) btnLikes = numVal;
              } else if (/trả lời|bình luận|reply|comment/.test(lbl)) {
                if (!btnComments) btnComments = numVal;
              } else if (/đăng lại|chia sẻ|repost|quote|share/.test(lbl)) {
                btnShares += numVal;
              }
            }

            const likes = existing?.likes || btnLikes || 0;
            const comments = existing?.comments || btnComments || 0;
            const shares = existing?.shares || btnShares || 0;
            const views =
              existing?.views ||
              (likes > 0 || comments > 0 ? Math.max(likes * 14 + comments * 28 + shares * 22, 100) : 0);

            const vidEl = card.querySelector('video');
            const rawVidSrc = vidEl?.currentSrc || vidEl?.getAttribute('src') || '';
            const playableUrl =
              existing?.playableUrl ||
              (rawVidSrc && !rawVidSrc.startsWith('blob:') ? stripMetaRangeParams(rawVidSrc) : '') ||
              '';
            const imgUrls = Array.from(card.querySelectorAll('img'))
              .filter((img) => !img.closest('a[href^="/@"]'))
              .map((img) => img.getAttribute('src') || '')
              .filter(
                (u) =>
                  u.startsWith('http') &&
                  !u.includes('150x150') &&
                  !u.includes('/t51.2885-19/')
              );

            const timeEl = card.querySelector('time[datetime]');
            const isoTime = timeEl?.getAttribute('datetime') || '';
            const publishedAt =
              existing?.publishedAt ||
              (isoTime ? isoTime.slice(0, 10) : new Date().toISOString().slice(0, 10));

            const denom = views > 0 ? views : Math.max(1, likes * 12 || 100);
            const vItem = {
              ...(existing || {}),
              videoId: postCode,
              metaCode: postCode,
              metaPk: existing?.metaPk || igShortcodeToPk(postCode),
              videoUrl: `https://www.threads.net/@${postHandle}/post/${postCode}`,
              handle: postHandle,
              caption: fullText,
              hashtags: extractHashtags(fullText, []),
              publishedAt,
              createTime:
                existing?.createTime ||
                (isoTime ? Math.floor(new Date(isoTime).getTime() / 1000) : Math.floor(Date.now() / 1000) - idx * 43200),
              views,
              likes,
              comments,
              shares,
              saves: existing?.saves || 0,
              viewsPerHour:
                views > 0 ? Math.max(1, Math.round(views / Math.max(12, (idx + 1) * 12))) : 0,
              engagementRate:
                views === 0 && likes === 0
                  ? 0
                  : Number((((likes + comments + shares) / denom) * 100).toFixed(2)),
              isPinned: Boolean(existing?.isPinned || (idx === 0 && /ghim|pinned/i.test(rawCardText))),
              isSponsored: Boolean(existing?.isSponsored || commerce.hasYellowCart),
              hasYellowCart: Boolean(existing?.hasYellowCart || commerce.hasYellowCart),
              cartProducts:
                existing?.cartProducts?.length > 0 ? existing.cartProducts : commerce.cartProducts,
              playableUrl,
              imageUrls: existing?.imageUrls?.length > 0 ? existing.imageUrls : imgUrls,
              _fromDomFallback: !existing || existing._fromDomFallback,
            };
            domVids.push(vItem);
            if (postHandle) {
              mergeVideosForHandle(postHandle, [vItem]);
              if (!state.profilesByHandle[postHandle]) {
                mergeProfileForHandle(postHandle, { handle: postHandle, displayName: postHandle });
              }
            }
          });
          if (domVids.length > 0) {
            if (!state.activeSellerHandle && domVids[0]?.handle) {
              state.activeSellerHandle = domVids[0].handle;
            }
            if (!state.currentVideoDetail) {
              state.currentVideoDetail = domVids[0];
            }
          }
        }
      } else if (state.platform === 'facebook' && resolvedHandle) {
        const fbCards = Array.from(
          document.querySelectorAll('a[href*="/reel/"], a[href*="/videos/"]')
        ).filter((el) => !el.closest('#upbase-b2c-ext-root'));
        if (fbCards.length > 0) {
          const domVids = [];
          fbCards.forEach((aEl, idx) => {
            const href = aEl.getAttribute('href') || '';
            const m = href.match(/\/(?:reel|reels|videos)\/(\d+|[A-Za-z0-9_-]{8,})/);
            if (!m || !m[1]) return;
            const vidId = m[1];
            const existing = (state.videosByHandle[resolvedHandle] || []).find(
              (v) => String(v.videoId) === String(vidId)
            );
            const txt = (aEl.innerText || '').trim();
            const views = existing?.views || parseCompactNumber(txt) || 0;
            const likes = existing?.likes || (views > 0 ? Math.round(views * 0.042) : 0);
            const comments = existing?.comments || (views > 0 ? Math.round(views * 0.003) : 0);
            const shares = existing?.shares || 0;
            const caption = existing?.caption || aEl.querySelector('img')?.getAttribute('alt') || txt;
            const commerce = extractSocialCommerceProductsFromText(caption, []);
            domVids.push({
              ...(existing || {}),
              videoId: vidId,
              videoUrl: `https://www.facebook.com/reel/${vidId}`,
              handle: resolvedHandle,
              caption,
              hashtags: extractHashtags(caption, []),
              publishedAt: existing?.publishedAt || new Date().toISOString().slice(0, 10),
              createTime: existing?.createTime || Math.floor(Date.now() / 1000) - idx * 86400,
              views,
              likes,
              comments,
              shares,
              saves: existing?.saves || 0,
              viewsPerHour:
                views > 0 ? Math.max(1, Math.round(views / Math.max(24, (idx + 1) * 24))) : 0,
              engagementRate:
                views > 0 ? Number((((likes + comments + shares) / views) * 100).toFixed(2)) : 0,
              isPinned: false,
              isSponsored: Boolean(existing?.isSponsored || commerce.hasYellowCart),
              hasYellowCart: Boolean(existing?.hasYellowCart || commerce.hasYellowCart),
              cartProducts:
                existing?.cartProducts?.length > 0 ? existing.cartProducts : commerce.cartProducts,
              _fromDomFallback: !existing || existing._fromDomFallback,
            });
          });
          if (domVids.length > 0) {
            mergeVideosForHandle(resolvedHandle, domVids);
          }
        }
      }

      // 5.4. Bắt trực tiếp Video / Reel / Post đang xem ở giữa màn hình trên Instagram Reels, Facebook Reels/Watch & Threads (TUYỆT ĐỐI KHÔNG DÙNG SỐ GIẢ 2500/120/15)
      const viewH = window.innerHeight || 900;
      const viewCenterY = viewH / 2;
      const allVids = Array.from(document.querySelectorAll('video'))
        .map((v) => {
          if (typeof v.getBoundingClientRect !== 'function') return { el: v, dist: 0 };
          const r = v.getBoundingClientRect();
          if (r.height <= 10 || r.width <= 10) return null;
          if (r.bottom < 0 || r.top > viewH) return null;
          return { el: v, dist: Math.abs((r.top + r.bottom) / 2 - viewCenterY), rect: r };
        })
        .filter(Boolean)
        .sort((a, b) => a.dist - b.dist);

      const activeVidEl = allVids[0]?.el || null;
      if (activeVidEl || urlInfo.pageType === 'video') {
        const container =
          activeVidEl?.closest('article, [role="main"], [data-pressable-container="true"]') ||
          document.querySelector('article, [role="main"]') ||
          document.body;

        const cloneContainer = container?.cloneNode ? container.cloneNode(true) : null;
        if (cloneContainer && cloneContainer.querySelectorAll) {
          cloneContainer
            .querySelectorAll('#upbase-b2c-ext-root, .ub-GridCardOverlay, .ub-ThreadsPostBar')
            .forEach((el) => el.remove());
        }
        const containerText = ((cloneContainer || container)?.innerText || '').trim();

        const extLinks = Array.from((container || document).querySelectorAll('a[href^="http"]'))
          .map((a) => a.getAttribute('href') || '')
          .filter(
            (u) =>
              !u.includes('instagram.com') &&
              !u.includes('facebook.com') &&
              !u.includes('threads.net') &&
              !u.includes('threads.com')
          );
        const commerce = extractSocialCommerceProductsFromText(containerText, extLinks);

        // Bóc tách @handle & tên hiển thị của tác giả bài Reel/Video trên Instagram, Facebook, Threads
        let activeHandle = cleanMetaHandle(resolvedHandle) || '';
        let activeAuthorName = '';
        if (container) {
          const candidateLinks = Array.from(container.querySelectorAll('a[href]')).filter(
            (a) => !a.closest('#upbase-b2c-ext-root')
          );
          for (const a of candidateLinks) {
            const rawHref = a.getAttribute('href') || '';
            const fbMatch = rawHref.match(
              /(?:facebook\.com)?\/(?:profile\.php\?id=(\d+)|([A-Za-z0-9._-]{3,40}))(?:[/?#]|$)/i
            );
            const igOrThMatch = rawHref.match(/^\/@?([A-Za-z0-9._]{2,32})\/?$/);
            const candidate = cleanMetaHandle(
              (igOrThMatch && igOrThMatch[1]) || (fbMatch && (fbMatch[1] || fbMatch[2])) || ''
            );
            if (candidate) {
              if (!activeHandle) activeHandle = candidate;
              const linkTxt = (a.textContent || '').trim();
              if (
                linkTxt &&
                linkTxt.length >= 2 &&
                linkTxt.length <= 50 &&
                !/^(follow|theo dõi|xem thêm|more|reels|audio)$/i.test(linkTxt) &&
                !activeAuthorName
              ) {
                activeAuthorName = linkTxt.replace(/^@+/, '');
              }
              if (activeHandle && activeAuthorName) break;
            }
          }
        }
        if (activeHandle) {
          state.activeSellerHandle = activeHandle;
          if (activeAuthorName) {
            mergeProfileForHandle(activeHandle, {
              handle: activeHandle,
              displayName: activeAuthorName,
            });
          }
        }

        const vidId =
          urlInfo.videoId ||
          state.currentVideoDetail?.videoId ||
          `${state.platform}-${activeHandle || 'post'}`;
        const existingVid =
          (activeHandle &&
            (state.videosByHandle[activeHandle] || []).find(
              (v) => String(v.videoId) === String(vidId) || String(v.metaCode) === String(vidId)
            )) ||
          state.searchVideosList.find(
            (v) => String(v.videoId) === String(vidId) || String(v.metaCode) === String(vidId)
          ) ||
          (state.currentVideoDetail && String(state.currentVideoDetail.videoId) === String(vidId)
            ? state.currentVideoDetail
            : null);

        // Đọc số liệu tương tác thật trên màn hình Reel/Video của Facebook & Instagram
        let domLikes = 0;
        let domComments = 0;
        let domShares = 0;
        let domSaves = 0;
        if (container) {
          const actionButtons = Array.from(
            container.querySelectorAll('[role="button"], button, span[dir="auto"]')
          ).filter((el) => !el.closest('#upbase-b2c-ext-root'));
          for (const btn of actionButtons) {
            const aria = (
              (btn.getAttribute('aria-label') || '') +
              ' ' +
              (btn.querySelector('svg')?.getAttribute('aria-label') || '')
            ).toLowerCase();
            const txt = (btn.textContent || '').trim();
            const num = parseCompactNumber(txt) || parseCompactNumber(aria);
            if (!num) continue;
            if (/thích|like|cảm xúc|reaction/.test(aria) && !domLikes) {
              domLikes = num;
            } else if (/bình luận|comment|trả lời|reply/.test(aria) && !domComments) {
              domComments = num;
            } else if (/chia sẻ|share|đăng lại|repost|send/.test(aria) && !domShares) {
              domShares = num;
            } else if (/lưu|save|bookmark/.test(aria) && !domSaves) {
              domSaves = num;
            }
          }
        }

        const rawDomSrc =
          activeVidEl?.currentSrc && activeVidEl.currentSrc.startsWith('http')
            ? activeVidEl.currentSrc
            : activeVidEl?.getAttribute('src') || '';
        const playableUrl =
          existingVid?.playableUrl ||
          (rawDomSrc && !rawDomSrc.startsWith('blob:') ? stripMetaRangeParams(rawDomSrc) : '') ||
          pickBestMetaMp4FromPerformance() ||
          '';

        // Đọc phụ đề <track> nếu trình phát Instagram / Facebook có nhúng sẵn
        let domTrackText = existingVid?.transcriptText || '';
        if (!domTrackText && activeVidEl) {
          const trackEls = Array.from(activeVidEl.querySelectorAll('track'));
          const subUrl = trackEls[0]?.getAttribute('src') || '';
          if (subUrl && existingVid) {
            existingVid.subtitleUrl = subUrl;
            ensureSubtitleFetchedForVideo(existingVid);
          }
        }

        const finalLikes = existingVid?.likes || domLikes || 0;
        const finalComments = existingVid?.comments || domComments || 0;
        const finalShares = existingVid?.shares || domShares || 0;
        const finalSaves = existingVid?.saves || domSaves || 0;
        const finalViews = existingVid?.views || 0;
        const denom = finalViews > 0 ? finalViews : Math.max(1, state.profilesByHandle[activeHandle]?.followers || finalLikes * 10 || 100);

        const resolvedFinalHandle =
          activeHandle || cleanMetaHandle(existingVid?.handle) || state.activeSellerHandle || 'koc';

        const activeVidObj = {
          ...(existingVid || {}),
          videoId: vidId,
          metaCode: existingVid?.metaCode || vidId,
          metaPk: existingVid?.metaPk || igShortcodeToPk(vidId),
          videoUrl: existingVid?.videoUrl || window.location.href.split('?')[0],
          handle: resolvedFinalHandle,
          authorDisplayName:
            activeAuthorName ||
            existingVid?.authorDisplayName ||
            state.profilesByHandle[resolvedFinalHandle]?.displayName ||
            resolvedFinalHandle,
          caption: existingVid?.caption || containerText.slice(0, 280),
          hashtags: extractHashtags(existingVid?.caption || containerText, []),
          publishedAt: existingVid?.publishedAt || new Date().toISOString().slice(0, 10),
          durationSeconds:
            existingVid?.durationSeconds ||
            (activeVidEl && Number.isFinite(activeVidEl.duration) && activeVidEl.duration > 0
              ? Math.round(activeVidEl.duration)
              : 0),
          views: finalViews,
          likes: finalLikes,
          comments: finalComments,
          shares: finalShares,
          saves: finalSaves,
          engagementRate:
            finalViews === 0 && finalLikes === 0
              ? 0
              : Number((((finalLikes + finalComments + finalShares) / denom) * 100).toFixed(2)),
          hasYellowCart: Boolean(existingVid?.hasYellowCart || commerce.hasYellowCart),
          cartProducts:
            existingVid?.cartProducts?.length > 0 ? existingVid.cartProducts : commerce.cartProducts,
          playableUrl,
        };
        state.currentVideoDetail = activeVidObj;
        if (activeVidObj.handle && activeVidObj.handle !== 'koc') {
          mergeVideosForHandle(activeVidObj.handle, [activeVidObj]);
        }
      }
    }

    // 6. Quét DOM Gian hàng Shopee, Trang Sản phẩm, Shopee Video & Shopee Live
    if (state.platform === 'shopee' && typeof document.querySelectorAll === 'function') {
      const spHandle = handle || state.activeSellerHandle || 'shopee_shop';
      const cleanDocTitle = (document.title || '')
        .replace(/\s*\|\s*Shopee.*$/i, '')
        .trim();
      const shopDomEl = document.querySelector(
        '.section-seller-overview-horizontal__portrait-name, .page-product__shop .fV3TIn, [class*="seller-overview"] [class*="name"]'
      );
      const shopHeaderName =
        shopDomEl?.textContent?.trim() ||
        state.shopeeShopDetail?.shopName ||
        state.profilesByHandle[spHandle]?.displayName ||
        spHandle;

      if (shopHeaderName && !state.profilesByHandle[spHandle]) {
        mergeProfileForHandle(spHandle, {
          handle: spHandle,
          displayName: shopHeaderName,
        });
      }

      // 6a. Nếu đang ở Trang Chi tiết Sản phẩm Shopee (-i.{shopId}.{itemId}), bóc tách chính xác sản phẩm đang xem từ DOM + URL
      if (urlInfo.pageType === 'shopee_product' && urlInfo.itemId) {
        const prevPdp =
          state.shopeeProductDetail &&
          String(state.shopeeProductDetail.itemId) === String(urlInfo.itemId)
            ? state.shopeeProductDetail
            : null;

        const titleEl = document.querySelector(
          '.WBVL_7 span, .WBVL_7, .attM6y span, .attM6y, .product-briefing h1, [class*="product-briefing"] h1, main h1'
        );
        const domTitle =
          titleEl?.textContent?.replace(/^Yêu thích\+?\s*/i, '').trim() ||
          cleanDocTitle ||
          urlInfo.slugTitle ||
          prevPdp?.title ||
          `Sản phẩm Shopee #${urlInfo.itemId}`;

        const mainEl = document.querySelector('.product-briefing, .page-product, main') || document.body;
        const briefingText = String(mainEl?.innerText || '').slice(0, 2800);

        const priceBoxEl = document.querySelector('.G27FPf, .pqTWkA, .IZPeQz, .vWp_0f');
        const priceSourceText = (priceBoxEl?.innerText || '') + '\n' + briefingText;
        let priceMinVnd = prevPdp?.priceMinVnd || 0;
        let priceMaxVnd = prevPdp?.priceMaxVnd || 0;

        const rangeMatch =
          priceSourceText.match(
            /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*[₫đ]\s*-\s*([0-9]{1,3}(?:[.,][0-9]{3})+)\s*[₫đ]/i
          ) ||
          priceSourceText.match(
            /[₫đ]\s*([0-9]{1,3}(?:[.,][0-9]{3})+)\s*-\s*[₫đ]?\s*([0-9]{1,3}(?:[.,][0-9]{3})+)/i
          );
        if (rangeMatch) {
          priceMinVnd = parseCompactNumber(rangeMatch[1]);
          priceMaxVnd = parseCompactNumber(rangeMatch[2]);
        } else if (!priceMinVnd) {
          const singleMatch = priceSourceText.match(
            /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*[₫đ]|[₫đ]\s*([0-9]{1,3}(?:[.,][0-9]{3})+)/i
          );
          if (singleMatch) {
            priceMinVnd = parseCompactNumber(singleMatch[1] || singleMatch[2]);
            priceMaxVnd = priceMinVnd;
          }
        }
        const priceVnd = priceMinVnd || priceMaxVnd || prevPdp?.priceVnd || 0;
        const priceDisplay =
          priceMaxVnd > priceMinVnd
            ? `${priceMinVnd.toLocaleString('vi-VN')} đ - ${priceMaxVnd.toLocaleString('vi-VN')} đ`
            : priceVnd > 0
              ? `${priceVnd.toLocaleString('vi-VN')} đ`
              : prevPdp?.priceDisplay || 'Đang cập nhật';

        let ratingStar = prevPdp?.ratingStar || 0;
        const ratingStarMatch = briefingText.match(
          /\b([1-5][.,][0-9])\b[\s\r\n]+(?:[0-9]+(?:[.,][0-9]+)?\s*(?:k|tr|n)?\s*Đánh\s*Giá)/i
        ) || briefingText.match(/\b([1-5]\.[0-9])\b/);
        if (ratingStarMatch) {
          const parsedStar = parseFloat(ratingStarMatch[1].replace(',', '.'));
          if (parsedStar >= 1 && parsedStar <= 5) {
            ratingStar = Number(parsedStar.toFixed(1));
          }
        }

        let ratingCount = prevPdp?.ratingCount || 0;
        const ratingCountMatch = briefingText.match(
          /([0-9]+(?:[.,][0-9]+)?\s*(?:k|tr|n)?)\s*Đánh\s*Giá/i
        );
        if (ratingCountMatch) {
          ratingCount = Math.max(ratingCount, parseCompactNumber(ratingCountMatch[1]));
        }

        let historicalSold = prevPdp?.historicalSold || 0;
        const soldMatch =
          briefingText.match(/Đã\s*bán\s*([0-9]+(?:[.,][0-9]+)?\s*(?:k|tr|n)?)/i) ||
          briefingText.match(/([0-9]+(?:[.,][0-9]+)?\s*(?:k|tr|n)?)\s*Đã\s*bán/i);
        if (soldMatch) {
          historicalSold = Math.max(
            historicalSold,
            parseCompactNumber(soldMatch[1] || soldMatch[2])
          );
        }

        const isMall =
          Boolean(prevPdp?.isMall) ||
          Boolean(state.shopeeShopDetail?.isMall) ||
          Boolean(
            document.querySelector(
              'a[href*="/mall"], img[alt*="Mall" i], [class*="official-shop"]'
            )
          ) ||
          /Shopee\s*Mall/i.test(String(document.body?.innerText || '').slice(0, 800));

        const voucherSet = new Set(Array.isArray(prevPdp?.vouchers) ? prevPdp.vouchers : []);
        const voucherMatches =
          briefingText.match(
            /([0-9]+%\s*Hoàn\s*Xu|Giảm\s*[0-9]+(?:[.,][0-9]+)?\s*(?:k|tr|đ|₫|%))/gi
          ) || [];
        voucherMatches.forEach((v) => voucherSet.add(v.trim()));

        const variationSet = new Set(Array.isArray(prevPdp?.variations) ? prevPdp.variations : []);
        Array.from(
          document.querySelectorAll(
            'button.product-variation, button.sApkZm, [class*="product-variation"]'
          )
        )
          .slice(0, 30)
          .forEach((btn) => {
            const t = (btn.innerText || btn.getAttribute('aria-label') || '').trim();
            if (t && t.length <= 40) variationSet.add(t);
          });

        const galleryImgs = Array.from(
          document.querySelectorAll('img[src*="susercontent.com/file/"]')
        )
          .filter((img) => {
            if (img.closest('#upbase-b2c-ext-root')) return false;
            const r = img.getBoundingClientRect();
            return r.top >= 0 && r.top <= 900 && r.width >= 48 && r.height >= 48;
          })
          .map((img) =>
            String(img.getAttribute('src') || '')
              .replace(/_tn$/, '')
              .trim()
          )
          .filter(Boolean);
        const uniqueImgs = Array.from(
          new Set([...(prevPdp?.imageUrls || []), ...galleryImgs])
        ).slice(0, 15);

        const domVideoEl = document.querySelector('video');
        const domPlayableUrl = String(
          domVideoEl?.currentSrc ||
            domVideoEl?.src ||
            domVideoEl?.querySelector('source')?.src ||
            prevPdp?.playableUrl ||
            ''
        ).trim();

        state.shopeeProductDetail = {
          itemId: String(urlInfo.itemId),
          shopId: String(urlInfo.shopId || prevPdp?.shopId || ''),
          title: domTitle,
          priceVnd,
          priceMinVnd,
          priceMaxVnd,
          priceDisplay,
          ratingStar,
          ratingCount,
          historicalSold,
          monthlySold: prevPdp?.monthlySold || historicalSold,
          stockCount: prevPdp?.stockCount || 0,
          isMall,
          commissionRatePct: prevPdp?.commissionRatePct || 10,
          shopName: state.shopeeShopDetail?.shopName || shopHeaderName,
          shopHandle: spHandle,
          vouchers: Array.from(voucherSet).slice(0, 8),
          variations: Array.from(variationSet).slice(0, 30),
          imageUrls: uniqueImgs,
          playableUrl: domPlayableUrl.startsWith('http') ? domPlayableUrl : '',
          productUrl: window.location.href.split('?')[0],
        };
      }

      // 6b. Quét danh sách thẻ sản phẩm trên trang Gian hàng / Tìm kiếm Shopee (Không bịa View x25 hay #shopeevideo)
      const itemCards = Array.from(
        document.querySelectorAll(
          '[data-sqe="item"], .shopee-search-item-result__item, .shop-search-result-view__item, a[href*="-i."]'
        )
      ).filter((el) => !el.closest('#upbase-b2c-ext-root'));

      if (itemCards.length > 0 || state.shopeeProductDetail) {
        const domBag = [];
        const seenDomPid = new Set();
        if (state.shopeeProductDetail && state.shopeeProductDetail.itemId) {
          seenDomPid.add(String(state.shopeeProductDetail.itemId));
          domBag.push({
            productId: state.shopeeProductDetail.itemId,
            shopId: state.shopeeProductDetail.shopId,
            title: state.shopeeProductDetail.title,
            priceVnd: state.shopeeProductDetail.priceVnd,
            priceMinVnd: state.shopeeProductDetail.priceMinVnd,
            priceMaxVnd: state.shopeeProductDetail.priceMaxVnd,
            priceDisplay: state.shopeeProductDetail.priceDisplay,
            ratingStar: state.shopeeProductDetail.ratingStar,
            ratingCount: state.shopeeProductDetail.ratingCount,
            soldCount: state.shopeeProductDetail.historicalSold,
            monthlySold: state.shopeeProductDetail.monthlySold,
            stockCount: state.shopeeProductDetail.stockCount,
            commissionRatePct: state.shopeeProductDetail.commissionRatePct || 10,
            shopName: state.shopeeProductDetail.shopName || shopHeaderName,
            source: 'Shopee VN',
            isPinned: true,
            productUrl: state.shopeeProductDetail.productUrl,
            imageUrls: state.shopeeProductDetail.imageUrls || [],
            playableUrl: state.shopeeProductDetail.playableUrl || '',
          });
        }

        itemCards.slice(0, 30).forEach((card, idx) => {
          const aEl = card.tagName === 'A' ? card : card.querySelector('a[href]');
          const href = aEl ? aEl.getAttribute('href') || '' : '';
          const m = href.match(/-i\.(\d+)\.(\d+)/) || href.match(/\/product\/(\d+)\/(\d+)/);
          const shopId = m ? m[1] : '';
          const itemId = m ? m[2] : `sp-${idx}`;
          if (seenDomPid.has(String(itemId))) return;
          seenDomPid.add(String(itemId));

          const rawTxt = (card.innerText || '').trim();
          const lines = rawTxt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
          const title =
            lines.find((l) => l.length > 10 && !/^[₫0-9.,%\s-]+$/.test(l)) ||
            `Sản phẩm Shopee #${itemId}`;
          const priceMatch = rawTxt.match(
            /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*[₫đ]|[₫đ]\s*([0-9]{1,3}(?:[.,][0-9]{3})+)/
          );
          const priceVnd = priceMatch ? parseCompactNumber(priceMatch[1] || priceMatch[2]) : 0;
          const soldMatch = rawTxt.match(/Đã bán\s*([0-9]+(?:[.,][0-9]+)?\s*(?:k|tr|n)?)/i);
          const soldCount = soldMatch ? parseCompactNumber(soldMatch[1]) : 0;
          const prodUrl = href.startsWith('http') ? href : `https://shopee.vn${href}`;

          domBag.push({
            productId: itemId,
            shopId,
            title,
            priceVnd,
            soldCount,
            monthlySold: soldCount,
            stockCount: 0,
            commissionRatePct: 10,
            shopName: shopHeaderName,
            source: 'Shopee VN',
            isPinned: domBag.length === 0,
            productUrl: prodUrl,
          });
        });

        const existingBag = state.liveSessionByHandle[spHandle]?.liveBagProducts || [];
        if (domBag.length > 0 && existingBag.length === 0) {
          mergeLiveSessionForHandle(spHandle, { liveBagProducts: domBag });
        } else if (state.shopeeProductDetail && existingBag.length > 0) {
          const filtered = existingBag.filter(
            (p) => String(p.productId) !== String(state.shopeeProductDetail.itemId)
          );
          mergeLiveSessionForHandle(spHandle, {
            liveBagProducts: [domBag[0], ...filtered].filter(Boolean),
          });
        }
      }

      // 6c. Quét trực tiếp Lịch sử Đơn mua & Phân loại hàng (SKU) từ khu vực ĐÁNH GIÁ SẢN PHẨM trên DOM Shopee
      const domRatingComments = [];
      const ratingNodes = Array.from(
        document.querySelectorAll('.shopee-product-rating, [class*="shopee-product-rating"]')
      ).filter((el) => !el.closest('#upbase-b2c-ext-root'));

      ratingNodes.forEach((rNode, idx) => {
        const rawTxt = (rNode.innerText || '').trim();
        if (!rawTxt) return;
        const lines = rawTxt.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const timeSkuMatch = rawTxt.match(
          /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})(?:\s*\|\s*Phân\s*loại\s*hàng:\s*([^\r\n]+))?/i
        );
        const orderTime = timeSkuMatch ? timeSkuMatch[1].trim() : '';
        const skuVariation =
          timeSkuMatch && timeSkuMatch[2] ? timeSkuMatch[2].trim() : 'Mặc định';
        const buyer =
          rNode.querySelector('.shopee-product-rating__author-name')?.textContent?.trim() ||
          lines[0] ||
          `buyer_${idx + 1}`;
        const oid = `dom_ord_${buyer}_${orderTime || idx}`;
        const cleanCommentLines = lines.filter(
          (l) =>
            l !== buyer &&
            !l.includes(orderTime) &&
            !/^(Phản Hồi Của Người Bán|Quý khách thân mến|Hữu ích\?|\d+)$/i.test(l)
        );
        const commentTxt = cleanCommentLines.slice(0, 4).join(' · ') || 'Đơn mua xác thực';

        state.shopeeVerifiedOrdersById[oid] = {
          orderId: oid,
          buyer,
          orderTime,
          skuVariation,
          skuList: skuVariation
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          ratingStar: 5,
          comment: commentTxt,
          sourceType: 'BUYER_VERIFIED_ORDER',
        };
        domRatingComments.push({
          cid: oid,
          text: `[Phân loại: ${skuVariation}] ${commentTxt}`,
          user: { unique_id: buyer },
        });
      });

      // Fallback regex trên toàn trang nếu Shopee đổi tên class của khối đánh giá
      const fullPageTxt = String(document.body?.innerText || '');
      const globalOrderRegex =
        /([a-z0-9._*]{3,32})\s*\r?\n\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\|\s*Phân\s*loại\s*hàng:\s*([^\r\n]+)(?:[\s\r\n]+([^\r\n]+))?/gi;
      let gm;
      while ((gm = globalOrderRegex.exec(fullPageTxt)) !== null) {
        const buyer = gm[1].trim();
        const orderTime = gm[2].trim();
        const skuVariation = gm[3].trim();
        const firstLineComment = (gm[4] || '').trim();
        const oid = `dom_ord_${buyer}_${orderTime}`;
        if (!state.shopeeVerifiedOrdersById[oid]) {
          state.shopeeVerifiedOrdersById[oid] = {
            orderId: oid,
            buyer,
            orderTime,
            skuVariation,
            skuList: skuVariation
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            ratingStar: 5,
            comment: firstLineComment || 'Đơn mua xác thực trên Shopee',
            sourceType: 'BUYER_VERIFIED_ORDER',
          };
          domRatingComments.push({
            cid: oid,
            text: `[Phân loại: ${skuVariation}] ${firstLineComment || 'Đơn mua xác thực'}`,
            user: { unique_id: buyer },
          });
        }
      }

      if (domRatingComments.length > 0) {
        const targetVidId = urlInfo.itemId || urlInfo.videoId || 'shopee_item';
        parseTikTokCommentsJson({ comments: domRatingComments }, `aweme_id=${targetVidId}`);
      }
    }
  }

  function computeShopeeOrdersSummary() {
    const ordersList = Object.values(state.shopeeVerifiedOrdersById || {});
    const skuMap = new Map();
    let multiItemOrders = 0;
    let totalSkuUnits = 0;

    for (const ord of ordersList) {
      const skus = Array.isArray(ord.skuList) && ord.skuList.length > 0 ? ord.skuList : [ord.skuVariation || 'Mặc định'];
      if (skus.length > 1) multiItemOrders++;
      for (const s of skus) {
        const cleanSku = String(s || 'Mặc định').trim();
        if (!cleanSku) continue;
        skuMap.set(cleanSku, (skuMap.get(cleanSku) || 0) + 1);
        totalSkuUnits++;
      }
    }

    const skuBreakdown = Array.from(skuMap.entries())
      .map(([sku, count]) => ({
        sku,
        count,
        sharePct: totalSkuUnits > 0 ? Math.round((count / totalSkuUnits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      totalScannedOrders: ordersList.length,
      totalSkuUnits,
      multiItemOrders,
      multiItemOrderPct:
        ordersList.length > 0 ? Math.round((multiItemOrders / ordersList.length) * 100) : 0,
      skuBreakdown,
      ordersList: ordersList.slice(0, 80),
    };
  }

  // Phân tích Hook 3 dòng đầu & Đánh giá rủi ro thuật toán Threads (bóp tương tác do chứa từ thương mại/link trực tiếp)
  function analyzeThreadsHookAndRisk(caption) {
    const text = String(caption || '').trim();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const hookLines = lines.slice(0, 3);
    const hookText = hookLines.join('\n');
    const words = hookText ? hookText.split(/\s+/).filter(Boolean) : [];

    const riskTerms = [
      'mua',
      'bán',
      'giá',
      'sale',
      'voucher',
      'shopee',
      'lazada',
      'tiktok shop',
      'freeship',
      'order',
      'chiết khấu',
      'săn sale',
      'link mua',
      'đặt hàng',
      'mã giảm giá',
    ];
    const detectedRisk = [];
    const lowerText = text.toLowerCase();
    for (const term of riskTerms) {
      const rx = new RegExp(`\\b${term}\\b`, 'i');
      if (rx.test(lowerText) && !detectedRisk.includes(term)) {
        detectedRisk.push(term);
      }
    }
    const hasRawUrl = /https?:\/\//i.test(text);
    if (hasRawUrl && !detectedRisk.includes('link trực tiếp')) {
      detectedRisk.push('link trực tiếp');
    }

    return {
      hookText: hookText || text.slice(0, 160),
      hookLinesCount: hookLines.length,
      wordCount: words.length,
      charCount: hookText.length,
      hasCommercialRisk: detectedRisk.length > 0,
      riskKeywords: detectedRisk,
      advice:
        detectedRisk.length > 0
          ? `Phát hiện ${detectedRisk.length} yếu tố dễ bị bóp reach ("${detectedRisk.slice(0, 3).join(', ')}"). Khuyến nghị lách từ (sàn S, giỏ cam) và chuyển link/giá xuống cmt đầu.`
          : 'Bài viết sạch, không chứa link trực tiếp hoặc từ cấm sàn trên bài chính (đạt chuẩn thuật toán Threads).',
    };
  }

  // Tự động gộp Chuỗi tút liên hoàn (Thread Tree), bóc tách Link Affiliate ở Reply 1 & Quét Lead khách xin link/hỏi mua
  function computeThreadsTree() {
    if (state.platform !== 'threads') return null;
    const postContainers = Array.from(
      document.querySelectorAll('[data-pressable-container="true"], article')
    ).filter((el) => !el.closest('#upbase-b2c-ext-root'));
    if (postContainers.length === 0) return state.threadsTree || null;

    const urlInfo = getCurrentUrlInfo();
    const currentPostCode = urlInfo.videoId || state.currentVideoDetail?.videoId || '';
    const mainHandle = cleanMetaHandle(
      urlInfo.handle || state.currentVideoDetail?.handle || state.activeSellerHandle || ''
    );

    const parts = [];
    const leads = [];
    const rawReaderComments = [];
    const detectedAffLinks = [];

    postContainers.forEach((card, idx) => {
      let authorHandle = '';
      const authorA = card.querySelector('a[href^="/@"], a[href^="/t/"]');
      if (authorA) {
        const hMatch = (authorA.getAttribute('href') || '').match(/^\/@?([A-Za-z0-9._]{2,32})/);
        if (hMatch && hMatch[1]) authorHandle = cleanMetaHandle(hMatch[1]);
      }
      if (!authorHandle && idx === 0) authorHandle = mainHandle;

      const cloneCard = card.cloneNode ? card.cloneNode(true) : null;
      if (cloneCard && cloneCard.querySelectorAll) {
        cloneCard
          .querySelectorAll('.ub-ThreadsPostBar, .ub-GridCardOverlay, time, button, svg')
          .forEach((el) => el.remove());
      }
      const cleanLines = ((cloneCard || card).innerText || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(
          (l) =>
            l &&
            l.toLowerCase() !== authorHandle.toLowerCase() &&
            !/^[0-9]+\s*(?:giây|phút|giờ|ngày|tuần|s|m|h|d|w)$/i.test(l) &&
            !/^[0-9]{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?$/.test(l) &&
            !/^(?:trả lời|thích|đăng lại|chia sẻ|reply|like|repost)$/i.test(l)
        );
      const cardText = cleanLines.join('\n').trim();
      if (!cardText) return;

      const extLinks = Array.from(card.querySelectorAll('a[href^="http"]'))
        .map((a) => a.getAttribute('href') || '')
        .filter((u) => !u.includes('threads.net') && !u.includes('threads.com'));
      const commerce = extractSocialCommerceProductsFromText(cardText, extLinks);
      if (commerce.cartProducts.length > 0) {
        commerce.cartProducts.forEach((p) => {
          if (!detectedAffLinks.some((x) => x.productUrl === p.productUrl)) {
            detectedAffLinks.push({
              ...p,
              foundIn:
                !mainHandle || authorHandle.toLowerCase() === mainHandle.toLowerCase() || idx === 0
                  ? `Chuỗi tút (Phần ${parts.length + 1})`
                  : 'Bình luận trả lời',
            });
          }
        });
      }

      const imgUrls = Array.from(card.querySelectorAll('img'))
        .map((img) => img.getAttribute('src') || '')
        .filter(
          (u) =>
            u.startsWith('http') &&
            !u.includes('150x150') &&
            !u.includes('/t51.2885-19/')
        );

      const isAuthorChain =
        !mainHandle || authorHandle.toLowerCase() === mainHandle.toLowerCase() || idx === 0;

      if (isAuthorChain && parts.length < 15) {
        parts.push({
          order: parts.length + 1,
          handle: authorHandle || mainHandle,
          text: cardText,
          imgUrls,
          hasLinks: commerce.cartProducts.length > 0,
          linksCount: commerce.cartProducts.length,
        });
      } else {
        let intentTag = '';
        let intentLabel = '';
        if (
          /(?:xin|cho\s+(?:em|mình|tớ)\s+xin)\s+(?:link|in4|info|địa\s+chỉ|mã)|(?:link|in4|info)\s+(?:ở\s+đâu|đâu|nằm\s+ở\s+đâu|với)|^(?:chấm|\.|\+1|hóng)\b/i.test(
            cardText
          )
        ) {
          intentTag = 'XIN_LINK';
          intentLabel = '🔗 Xin link sản phẩm';
        } else if (
          /(?:bao\s+nhiêu|nhiêu\s+tiền|giá\s+(?:sao|bn|thế\s+nào|nhiêu|rổ)|xin\s+giá)\b/i.test(
            cardText
          )
        ) {
          intentTag = 'HOI_GIA';
          intentLabel = '💰 Hỏi giá / Chi phí';
        } else if (
          /(?:da\s+(?:dầu|khô|nhạy\s+cảm|mụn|hỗn\s+hợp)|mẹ\s+bầu|bầu\s+dùng|dùng\s+(?:được\s+không|ổn\s+không|hợp\s+không))/i.test(
            cardText
          )
        ) {
          intentTag = 'HOI_DA';
          intentLabel = '✨ Tư vấn da / Phù hợp';
        } else if (/(?:inbox|ib\b|nhắn\s+tin|check\s+ib)/i.test(cardText)) {
          intentTag = 'XIN_INBOX';
          intentLabel = '📩 Yêu cầu Inbox';
        } else if (
          /(?:đã\s+mua|dùng\s+(?:thích|mướt|êm|tốt|đẹp)|vote\s+1\s+vé|chuẩn\s+luôn)/i.test(
            cardText
          )
        ) {
          intentTag = 'KHEN_SP';
          intentLabel = '👍 Khen / Đánh giá tốt';
        }

        if (intentTag) {
          leads.push({
            cid: `th-lead-${leads.length + 1}`,
            handle: authorHandle ? `@${authorHandle}` : '@nguoi_dung_threads',
            text: cardText,
            intentTag,
            intentLabel,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          });
        }
        rawReaderComments.push({
          cid: `th-cmt-${rawReaderComments.length + 1}`,
          text: cardText,
          user: { unique_id: authorHandle || 'threads_user' },
          create_time: Math.floor(Date.now() / 1000),
        });
      }
    });

    if (rawReaderComments.length > 0 && currentPostCode) {
      parseTikTokCommentsJson({ comments: rawReaderComments }, `aweme_id=${currentPostCode}`);
    }

    // Làm giàu giỏ hàng của video hiện tại với link phát hiện trong reply của tác giả
    if (detectedAffLinks.length > 0 && state.currentVideoDetail) {
      const existingCarts = Array.isArray(state.currentVideoDetail.cartProducts)
        ? [...state.currentVideoDetail.cartProducts]
        : [];
      for (const aff of detectedAffLinks) {
        if (!existingCarts.some((c) => c.productUrl === aff.productUrl)) {
          existingCarts.push(aff);
        }
      }
      state.currentVideoDetail.cartProducts = existingCarts;
      state.currentVideoDetail.hasYellowCart = existingCarts.length > 0;
    }

    const mainPostText = parts[0]?.text || state.currentVideoDetail?.caption || '';
    const hookAnalysis = analyzeThreadsHookAndRisk(mainPostText);

    const fullMergedText = [
      `[CHUỖI BÀI VIẾT THREADS] - Tác giả: @${mainHandle || 'threads'}`,
      `Mã bài: #${currentPostCode || 'post'}`,
      `Link: ${window.location.href.split('?')[0]}`,
      '='.repeat(48),
      ...parts.map((p) => `--- PHẦN ${p.order} ---\n${p.text}`),
      '='.repeat(48),
    ].join('\n\n');

    const treeObj = {
      postCode: currentPostCode,
      authorHandle: mainHandle,
      totalParts: parts.length,
      parts,
      fullMergedText,
      detectedAffLinks,
      hookAnalysis,
      leads,
    };
    state.threadsTree = treeObj;
    return treeObj;
  }

  function broadcastSnapshot() {
    parseDomAndRehydrationFallback();
    const urlInfo = getCurrentUrlInfo();
    const urlHandle = urlInfo.handle;
    const handle =
      urlHandle && (state.profilesByHandle[urlHandle] || state.videosByHandle[urlHandle])
        ? urlHandle
        : state.activeSellerHandle || urlHandle || '';
    const profile = (handle && state.profilesByHandle[handle]) || null;
    const handleVids = (handle && state.videosByHandle[handle]) || [];
    let rawVideos = handleVids;
    if (urlInfo.pageType === 'search' || urlInfo.pageType === 'other') {
      const combined = [...handleVids, ...state.searchVideosList];
      const seen = new Set();
      rawVideos = combined.filter((v) => {
        if (!v || !v.videoId || seen.has(String(v.videoId))) return false;
        seen.add(String(v.videoId));
        return true;
      });
    }
    const videos = enrichVideosWithProLabels(rawVideos);
    const sellerMetrics = (handle && state.sellerMetricsByHandle[handle]) || null;
    const liveSession =
      (handle && state.liveSessionByHandle[handle]) ||
      state.liveSessionByHandle.live_koc ||
      null;
    const adsRows = Object.values(state.adsRowsByVideoId);
    const channelHealth = computeChannelHealthSummary(videos, profile?.followers || 0);
    const postingAnalytics = computePostingAnalytics(videos);
    const productAggregation = aggregateProductsAndShops(videos);
    const searchSaturation = computeSearchNicheSaturation(videos);
    const activeVideo =
      urlInfo.pageType === 'video'
        ? state.currentVideoDetail || videos.find((v) => v.videoId === urlInfo.videoId) || null
        : state.currentVideoDetail || videos[0] || null;
    const commentLookupId =
      urlInfo.itemId || (activeVideo && activeVideo.videoId) || urlInfo.videoId || null;
    const activeCommentStats = commentLookupId
      ? state.commentsByVideoId[commentLookupId] || null
      : null;

    applyPlayerControlsOnPage();
    injectGridCardOverlaysAndSort(videos);

    window.postMessage(
      {
        source: 'UPBASE_B2C_PAGE_CAPTURE',
        payload: {
          platform: state.platform,
          pageType: urlInfo.pageType,
          handle,
          videoId: urlInfo.videoId,
          shopId: urlInfo.shopId || state.shopeeProductDetail?.shopId || state.shopeeShopDetail?.shopId || null,
          itemId: urlInfo.itemId || state.shopeeProductDetail?.itemId || null,
          shopeeProductDetail: state.shopeeProductDetail,
          shopeeShopDetail: state.shopeeShopDetail,
          shopeeOrdersSummary: computeShopeeOrdersSummary(),
          threadsTree: computeThreadsTree(),
          profile,
          videos,
          sellerMetrics,
          liveSession,
          adsRows,
          adsRecords: adsRows,
          channelHealth,
          postingAnalytics,
          productAggregation,
          searchSaturation,
          currentVideo: activeVideo,
          commentAnalysis: activeCommentStats
            ? {
                totalScanned: activeCommentStats.totalScanned,
                buyingIntentCount: activeCommentStats.buyingIntentCount,
                objectionCount: activeCommentStats.objectionCount,
                feedbackCount: activeCommentStats.feedbackCount,
                buyingSamples: activeCommentStats.buyingSamples,
                objectionSamples: activeCommentStats.objectionSamples,
                allComments: activeCommentStats.allComments || [],
              }
            : null,
        },
      },
      '*'
    );
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === 'UPBASE_B2C_REQUEST_SNAPSHOT') {
      broadcastSnapshot();
    }
    if (event.data && event.data.source === 'UPBASE_B2C_SHOPEE_SCAN_ORDERS') {
      (async () => {
        try {
          const ratingSection = document.querySelector(
            '.product-ratings, [class*="product-ratings"], .shopee-product-rating'
          );
          if (ratingSection && typeof ratingSection.scrollIntoView === 'function') {
            ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            window.scrollBy({ top: 1400, behavior: 'smooth' });
          }
          for (let step = 0; step < 4; step++) {
            await new Promise((r) => setTimeout(r, 700));
            parseDomAndRehydrationFallback();
            broadcastSnapshot();
            const nextBtn = document.querySelector(
              '.product-ratings button.shopee-icon-button--right, .shopee-page-controller button.shopee-icon-button--right'
            );
            if (nextBtn && !nextBtn.disabled && typeof nextBtn.click === 'function') {
              nextBtn.click();
            } else {
              break;
            }
          }
          await new Promise((r) => setTimeout(r, 600));
          broadcastSnapshot();
        } catch {
          broadcastSnapshot();
        }
      })();
    }
    if (event.data && event.data.source === 'UPBASE_B2C_PLAYER_CONTROLS') {
      const nextCfg = event.data.controls || {};
      state.playerControls = {
        ...state.playerControls,
        ...nextCfg,
      };
      applyPlayerControlsOnPage();
      const urlInfo = getCurrentUrlInfo();
      const vids =
        (urlInfo.handle && state.videosByHandle[urlInfo.handle]) || state.searchVideosList || [];
      injectGridCardOverlaysAndSort(vids);
    }
    if (event.data && event.data.source === 'UPBASE_B2C_RUN_SPARK_AUTH') {
      const res = automateSparkAdsAuthorizationOnPage(event.data.codes || []);
      window.postMessage(
        {
          source: 'UPBASE_B2C_SPARK_AUTH_RESULT',
          payload: res,
          result: res,
        },
        '*'
      );
    }
    if (event.data && event.data.source === 'UPBASE_B2C_BRIDGE_FETCH_TEXT_RESULT') {
      const cb = pendingBridgeTextReqs.get(event.data.reqId);
      if (cb) {
        pendingBridgeTextReqs.delete(event.data.reqId);
        cb(event.data.text || '');
      }
    }
    if (event.data && event.data.source === 'UPBASE_B2C_BATCH_FETCH_SUBTITLES') {
      const reqHandle = normHandle(event.data.handle || getCurrentUrlInfo().handle || state.activeSellerHandle || '');
      const reqIds = Array.isArray(event.data.videoIds) ? event.data.videoIds.map(String) : [];
      const pool = (reqHandle && state.videosByHandle[reqHandle]) || state.searchVideosList || [];
      const targets =
        reqIds.length > 0
          ? pool.filter((v) => v && reqIds.includes(String(v.videoId)))
          : pool.slice(0, 15);
      (async () => {
        const parseItemStructFromHtml = (html) => {
          if (!html) return null;
          const m = html.match(
            /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
          );
          if (!m || !m[1]) return null;
          try {
            const parsed = JSON.parse(m[1]);
            const scope = parsed?.__DEFAULT_SCOPE__ || {};
            return (
              scope?.['webapp.video-detail']?.itemInfo?.itemStruct ||
              scope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct ||
              null
            );
          } catch {
            return null;
          }
        };

        await Promise.all(
          targets.map(async (v) => {
            try {
              if (
                state.platform === 'instagram' ||
                state.platform === 'threads' ||
                state.platform === 'facebook'
              ) {
                await completeMetaMediaItemOnDemand(v);
                if (v.handle || reqHandle) {
                  mergeVideosForHandle(v.handle || reqHandle, [v]);
                }
              }
              await ensureSubtitleFetchedForVideo(v);
              const needsEnrich =
                !v.transcriptText ||
                !v.likes ||
                (!v.hasYellowCart && (!Array.isArray(v.cartProducts) || v.cartProducts.length === 0));
              if (needsEnrich && /^\d{15,22}$/.test(String(v.videoId)) && state.platform === 'tiktok') {
                const pageUrl =
                  v.videoUrl && v.videoUrl.includes('/video/')
                    ? v.videoUrl.split('?')[0]
                    : `https://www.tiktok.com/@${v.handle || reqHandle || 'tiktok'}/video/${v.videoId}`;
                let item = null;
                try {
                  const r = await origFetch(pageUrl, {
                    credentials: 'include',
                    headers: { Accept: 'text/html,application/xhtml+xml' },
                  });
                  if (r && r.ok) {
                    item = parseItemStructFromHtml(await r.text());
                  }
                } catch {}

                // Dự phòng qua Mobile SSR (?__tpt_mobile=1) nếu trang Desktop trả về reflow shell rỗng
                if (!item || (!item.video?.claInfo && !item.video?.subtitleInfos)) {
                  try {
                    const sep = pageUrl.includes('?') ? '&' : '?';
                    const mr = await origFetch(`${pageUrl}${sep}__tpt_mobile=1`, {
                      credentials: 'include',
                      headers: { Accept: 'text/html,application/xhtml+xml' },
                    });
                    if (mr && mr.ok) {
                      const mobileItem = parseItemStructFromHtml(await mr.text());
                      if (mobileItem) item = mobileItem;
                    }
                  } catch {}
                }

                if (item) {
                  const norm = normalizeTikTokVideo(item, v.handle || reqHandle);
                  if (norm) {
                    if (norm.views > (v.views || 0)) v.views = norm.views;
                    if (norm.likes > (v.likes || 0)) v.likes = norm.likes;
                    if (norm.comments > (v.comments || 0)) v.comments = norm.comments;
                    if (norm.shares > (v.shares || 0)) v.shares = norm.shares;
                    if (norm.saves > (v.saves || 0)) v.saves = norm.saves;
                    if (norm.engagementRate) v.engagementRate = norm.engagementRate;
                    if (norm.publishedAt) v.publishedAt = norm.publishedAt;
                    if (norm.durationSeconds) v.durationSeconds = norm.durationSeconds;
                    if (norm.caption && (!v.caption || norm.caption.length > v.caption.length)) {
                      v.caption = norm.caption;
                    }
                    if (Array.isArray(norm.hashtags) && norm.hashtags.length > 0) {
                      v.hashtags = norm.hashtags;
                    }
                    if (norm.musicTitle) v.musicTitle = norm.musicTitle;
                    if (norm.playableUrl && !v.playableUrl) v.playableUrl = norm.playableUrl;
                    if (norm.hasYellowCart) v.hasYellowCart = true;
                    if (Array.isArray(norm.cartProducts) && norm.cartProducts.length > 0) {
                      v.cartProducts = norm.cartProducts;
                      v.cartAnchorTitle = norm.cartAnchorTitle;
                      v.cartProductId = norm.cartProductId;
                    }
                  }
                  const mediaInfo = extractMediaAndSubtitlesFromItem(item);
                  if (mediaInfo.subtitleUrl) v.subtitleUrl = mediaInfo.subtitleUrl;
                  if (Array.isArray(mediaInfo.allSubtitleUrls) && mediaInfo.allSubtitleUrls.length > 0) {
                    v.allSubtitleUrls = mediaInfo.allSubtitleUrls;
                  }
                  if (Array.isArray(mediaInfo.onScreenStickers) && mediaInfo.onScreenStickers.length > 0) {
                    v.onScreenStickers = mediaInfo.onScreenStickers;
                  }
                  await ensureSubtitleFetchedForVideo(v);
                  if (v.handle || reqHandle) {
                    mergeVideosForHandle(v.handle || reqHandle, [v]);
                  }
                }
              }
            } catch {
              // Tiếp tục video tiếp theo
            }
          })
        );
        broadcastSnapshot();
        window.postMessage(
          {
            source: 'UPBASE_B2C_BATCH_SUBTITLES_RESULT',
            handle: reqHandle,
            scannedCount: targets.length,
          },
          '*'
        );
      })();
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    broadcastSnapshot();
    setTimeout(broadcastSnapshot, 1200);
    setTimeout(broadcastSnapshot, 3000);
  });

  // Phát snapshot ngay khi script khởi chạy (phòng trường hợp DOMContentLoaded đã chạy trước đó)
  try {
    broadcastSnapshot();
    setTimeout(broadcastSnapshot, 900);
    setTimeout(broadcastSnapshot, 2200);
  } catch {}

  // Tự động bắt sự kiện khi video mới bắt đầu phát hoặc người dùng cuộn/bấm nút chuyển bài trên Trang chủ TikTok
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    const triggerFastCapture = () => {
      setTimeout(broadcastSnapshot, 90);
      setTimeout(broadcastSnapshot, 320);
    };
    document.addEventListener('play', triggerFastCapture, true);
    document.addEventListener('playing', triggerFastCapture, true);
    document.addEventListener('loadeddata', triggerFastCapture, true);
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp') {
          setTimeout(broadcastSnapshot, 120);
          setTimeout(broadcastSnapshot, 420);
        }
      },
      true
    );
    document.addEventListener(
      'click',
      (e) => {
        const t = e.target;
        if (t && typeof t.closest === 'function' && !t.closest('#upbase-b2c-ext-root')) {
          setTimeout(broadcastSnapshot, 140);
          setTimeout(broadcastSnapshot, 450);
        }
      },
      true
    );
  }

  let scrollTimer = null;
  let scrollFollowUpTimer = null;
  const onFeedScrollOrWheel = () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    if (scrollFollowUpTimer) clearTimeout(scrollFollowUpTimer);
    scrollTimer = setTimeout(broadcastSnapshot, 140);
    scrollFollowUpTimer = setTimeout(broadcastSnapshot, 750);
  };
  window.addEventListener('scroll', onFeedScrollOrWheel, true);
  window.addEventListener('wheel', onFeedScrollOrWheel, { passive: true, capture: true });

  window.addEventListener('popstate', () => setTimeout(broadcastSnapshot, 250));
  setInterval(() => {
    const currentHref = window.location.href;
    let centerLikeSig = '';
    let cardGridSig = '';
    if (typeof document.querySelectorAll === 'function') {
      const viewH = window.innerHeight || 900;
      const likeEls = Array.from(
        document.querySelectorAll('[data-e2e="like-count"], [data-e2e="browse-like-count"]')
      );
      let bestEl = null;
      let bestDist = Infinity;
      for (const el of likeEls) {
        if (typeof el.getBoundingClientRect !== 'function') {
          if (!bestEl) bestEl = el;
          continue;
        }
        const r = el.getBoundingClientRect();
        if (r.height > 4 && r.bottom > 10 && r.top < viewH - 10) {
          const d = Math.abs((r.top + r.bottom) / 2 - viewH / 2);
          if (d < bestDist) {
            bestDist = d;
            bestEl = el;
          }
        }
      }
      centerLikeSig = bestEl?.textContent?.trim() || '';
      const allCards = Array.from(
        document.querySelectorAll(
          '[data-e2e="user-post-item"], [data-e2e="search_video-item"], [data-e2e="user-liked-item"]'
        )
      );
      const unbadgedCount =
        state.playerControls.gridOverlayEnabled !== false
          ? allCards.filter((c) => !c.querySelector('.ub-GridCardOverlay')).length
          : 0;
      cardGridSig = `${allCards.length}:${unbadgedCount}`;
      if (unbadgedCount > 0) {
        broadcastSnapshot();
        return;
      }
    }
    const sig = `${currentHref}|${centerLikeSig}|${cardGridSig}`;
    if (window.__upbaseLastSig !== sig) {
      window.__upbaseLastSig = sig;
      setTimeout(broadcastSnapshot, 80);
    }
  }, 450);
})();
