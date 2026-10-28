(function () {
  if (window.__upbaseB2cInterceptorInstalled) return;
  window.__upbaseB2cInterceptorInstalled = true;

  const host = window.location.hostname.toLowerCase();
  const isDouyin = host.includes('douyin.com');
  const isAdsManager = host.includes('ads.tiktok.com') || host.includes('business.tiktok.com');
  const isSellerOrAffiliate =
    !isAdsManager &&
    (host.includes('affiliate') ||
      host.includes('seller') ||
      host.includes('tiktokshop') ||
      host.includes('tiktokglobalshop'));

  const state = {
    platform: host.includes('instagram.com')
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
    adsRowsByVideoId: {},
    commentsByVideoId: {},
    subtitleCacheByVideoId: {},
    mobileCartAttemptedByVideoId: {},
    searchVideosList: [],
    searchUsersList: [],
    currentVideoDetail: null,
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

          const rawPriceCandidate =
            inner.format_price ||
            inner.formatted_price ||
            inner.price_str ||
            inner.priceStr ||
            inner.display_price ||
            inner.sale_price_format ||
            inner.real_price_format ||
            inner.sale_price ||
            inner.price ||
            inner.market_price ||
            entry.price_str ||
            anchor.price_str ||
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

  // Bóc tách link MP4 không logo (playableUrl), link phụ đề WebVTT (subtitleUrl) & chữ trên màn hình (onScreenStickers)
  function extractMediaAndSubtitlesFromItem(item) {
    const video = (item && item.video) || {};
    const durationSeconds = Number(video.duration || item?.duration || 0);

    // 1. Playable MP4 URL (No-Watermark)
    let playableUrl = '';
    if (typeof video.playAddr === 'string' && video.playAddr.startsWith('http')) {
      playableUrl = video.playAddr;
    } else if (Array.isArray(video.PlayAddrStruct?.UrlList) && video.PlayAddrStruct.UrlList[0]) {
      playableUrl = video.PlayAddrStruct.UrlList[0];
    } else if (Array.isArray(video.playAddr?.url_list) && video.playAddr.url_list[0]) {
      playableUrl = video.playAddr.url_list[0];
    } else if (Array.isArray(video.play_addr?.url_list) && video.play_addr.url_list[0]) {
      playableUrl = video.play_addr.url_list[0];
    } else if (Array.isArray(video.bitrateInfo) && video.bitrateInfo[0]?.PlayAddr?.UrlList?.[0]) {
      playableUrl = video.bitrateInfo[0].PlayAddr.UrlList[0];
    } else if (typeof video.downloadAddr === 'string' && video.downloadAddr.startsWith('http')) {
      playableUrl = video.downloadAddr;
    } else if (Array.isArray(video.download_addr?.url_list) && video.download_addr.url_list[0]) {
      playableUrl = video.download_addr.url_list[0];
    }
    if (playableUrl.startsWith('//')) {
      playableUrl = `https:${playableUrl}`;
    }

    // 2. Subtitle URL (WebVTT)
    const captionInfos = [
      ...(Array.isArray(video.claInfo?.captionInfos) ? video.claInfo.captionInfos : []),
      ...(Array.isArray(video.subtitleInfos) ? video.subtitleInfos : []),
    ];
    const preferredSub =
      captionInfos.find((c) =>
        String(c?.languageCodeName || c?.LanguageCodeName || '')
          .toLowerCase()
          .includes('vie')
      ) || captionInfos[0];

    let subtitleUrl = '';
    if (preferredSub) {
      subtitleUrl = String(
        preferredSub.url ||
          preferredSub.Url ||
          (Array.isArray(preferredSub.urlList) ? preferredSub.urlList[0] : '') ||
          ''
      ).trim();
    }

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
      onScreenStickers,
      musicId,
      musicTitle,
      musicAuthor,
      musicPlayUrl,
      imageUrls,
    };
  }

  function parseWebVttTextToTranscript(vttRaw) {
    if (!vttRaw || typeof vttRaw !== 'string') return '';
    const lines = vttRaw.split(/\r?\n/);
    const segments = [];
    let currentTimeLabel = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line === 'WEBVTT' || /^\d+$/.test(line)) continue;
      if (line.includes('-->')) {
        const parts = line.split('-->');
        const startRaw = (parts[0] || '').trim().split('.')[0];
        const endRaw = (parts[1] || '').trim().split(' ')[0].split('.')[0];
        currentTimeLabel = `${startRaw.slice(-5)} - ${endRaw.slice(-5)}`;
        continue;
      }
      const clean = line.replace(/<[^>]+>/g, '').trim();
      if (clean) {
        const prev = segments[segments.length - 1];
        if (!prev || prev.text !== clean) {
          segments.push({
            timeLabel: currentTimeLabel || '00:00',
            text: clean,
          });
        }
      }
    }
    return segments.map((s) => `[${s.timeLabel}] ${s.text}`).join('\n');
  }

  async function ensureSubtitleFetchedForVideo(videoObj) {
    if (!videoObj || !videoObj.videoId || !videoObj.subtitleUrl) return;
    if (videoObj.transcriptText) return;
    const cached = state.subtitleCacheByVideoId[videoObj.videoId];
    if (cached) {
      videoObj.transcriptText = cached;
      return;
    }
    try {
      const res = await origFetch(videoObj.subtitleUrl, { credentials: 'omit' });
      if (!res.ok) return;
      const vttText = await res.text();
      const transcript = parseWebVttTextToTranscript(vttText);
      if (transcript) {
        state.subtitleCacheByVideoId[videoObj.videoId] = transcript;
        videoObj.transcriptText = transcript;
        if (state.currentVideoDetail && state.currentVideoDetail.videoId === videoObj.videoId) {
          state.currentVideoDetail.transcriptText = transcript;
        }
        broadcastSnapshot();
      }
    } catch {
      // Bỏ qua nếu không tải được phụ đề
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
      if (v.views >= Math.max(8000, medianViews * 1.75)) {
        labels.push({ text: 'Bài nổi bật', tone: 'pos' });
      }
      if ((v.viewsPerHour || 0) >= Math.max(400, avgVelocity * 1.8)) {
        labels.push({ text: 'Đang tăng nhanh', tone: 'pos' });
      }
      if (v.engagementRate >= 14 || (v.views >= 15000 && v.engagementRate > 0 && v.engagementRate < 0.45)) {
        labels.push({ text: 'Tương tác bất thường', tone: 'warn' });
      }
      if (v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)) {
        const pCount = Array.isArray(v.cartProducts) && v.cartProducts.length > 0 ? v.cartProducts.length : 1;
        labels.push({ text: `Gắn giỏ Shop (${pCount})`, code: 'SHOP_CART', tone: 'accent' });
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
                  priceVnd: 259000,
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
          const priceVnd = Number(p.priceVnd || 0) > 0 ? Math.round(Number(p.priceVnd)) : 259000;
          const commPct = Number(p.commissionRatePct || 10) > 0 ? Number(p.commissionRatePct || 10) : 10;
          prodMap[pid] = {
            productId: p.productId || pid,
            title: p.title || 'Sản phẩm TikTok Shop',
            sellerId: p.sellerId || sellerKey,
            shopName,
            priceVnd,
            priceText: p.priceText || `${priceVnd.toLocaleString('vi-VN')} đ`,
            commissionRatePct: commPct,
            commissionPct: commPct,
            estimatedCommissionVnd: Math.round(priceVnd * (commPct / 100)),
            commissionVnd: Math.round(priceVnd * (commPct / 100)),
            rawSoldCount: Number(p.soldCount || 0),
            stockCount: Number(p.stockCount || 0) > 0 ? Number(p.stockCount) : 320,
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
      (v) => !(hasRealNumericId && String(v?.videoId || '').startsWith('feed-'))
    );
    const byId = new Map();
    for (const v of existing) {
      if (v && v.videoId) byId.set(v.videoId, v);
    }
    for (const v of newVideos) {
      if (!v || !v.videoId) continue;
      const prev = byId.get(v.videoId);
      if (prev) {
        byId.set(v.videoId, {
          ...prev,
          ...v,
          views: Math.max(prev.views || 0, v.views || 0),
          cartProducts:
            Array.isArray(v.cartProducts) && v.cartProducts.length > 0
              ? v.cartProducts
              : prev.cartProducts || [],
          transcriptText: v.transcriptText || prev.transcriptText || '',
          playableUrl: v.playableUrl || prev.playableUrl || '',
        });
      } else {
        byId.set(v.videoId, v);
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.createTime || 0) - (a.createTime || 0);
    });
    state.videosByHandle[clean] = enrichVideosWithProLabels(merged.slice(0, 50));
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

  // Bóc tách dữ liệu JSON từ TikTok Seller / Affiliate Creator Marketplace
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
          node.units_sold !== undefined ||
          node.items_sold !== undefined ||
          node.gpm !== undefined ||
          node.video_avg_view_cnt !== undefined);

      if (hasCreatorIndicators && typeof rawHandle === 'string') {
        const h = normHandle(rawHandle);
        if (h && h.length >= 2) {
          const followers = parseCompactNumber(
            node.follower_cnt ?? node.follower_count ?? node.followers ?? 0
          );
          const gmv = parseCompactNumber(
            node.gmv?.amount ??
              node.gmv ??
              node.med_gmv_revenue?.amount ??
              node.med_gmv_revenue ??
              node.total_gmv ??
              0
          );
          const itemsSold = parseCompactNumber(
            node.units_sold ?? node.items_sold ?? node.sold_count ?? node.order_cnt ?? 0
          );
          const gpm = parseCompactNumber(
            node.gpm?.amount ?? node.gpm ?? node.video_gpm ?? 0
          );
          const aov = parseCompactNumber(
            node.aov?.amount ??
              node.aov ??
              node.avg_order_value ??
              (itemsSold > 0 && gmv > 0 ? Math.round(gmv / itemsSold) : 0)
          );
          const avgViews = parseCompactNumber(
            node.video_avg_view_cnt ?? node.avg_views ?? node.video_views ?? 0
          );

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

  function parseInstagramJson(url, data) {
    if (!data || typeof data !== 'object') return;
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

      const edges =
        user.edge_owner_to_timeline_media?.edges ||
        user.edge_felix_video_timeline?.edges ||
        [];
      if (Array.isArray(edges) && edges.length > 0) {
        const vids = edges
          .map((e) => e && e.node)
          .filter(Boolean)
          .map((node) => {
            const views = parseCompactNumber(node.video_view_count ?? node.play_count ?? 0);
            const likes = parseCompactNumber(
              node.edge_media_preview_like?.count ??
                node.edge_liked_by?.count ??
                node.like_count ??
                0
            );
            const comments = parseCompactNumber(
              node.edge_media_to_comment?.count ?? node.comment_count ?? 0
            );
            const caption =
              node.edge_media_to_caption?.edges?.[0]?.node?.text ||
              node.caption?.text ||
              '';
            const ts = Number(node.taken_at_timestamp || node.taken_at || 0);
            const denom = views > 0 ? views : Math.max(1, followers);
            return {
              videoId: String(node.shortcode || node.code || node.id || ''),
              videoUrl: `https://www.instagram.com/p/${node.shortcode || node.code}/`,
              handle,
              caption: String(caption),
              hashtags: extractHashtags(String(caption), []),
              publishedAt:
                ts > 100000000
                  ? new Date(ts * 1000).toISOString().slice(0, 10)
                  : new Date().toISOString().slice(0, 10),
              createTime: ts,
              views: views > 0 ? views : likes * 8,
              likes,
              comments,
              shares: 0,
              saves: 0,
              engagementRate: Number((((likes + comments) / denom) * 100).toFixed(2)),
              isPinned: Boolean(node.is_pinned),
              isSponsored: Boolean(node.is_paid_partnership || /#ad\b|#sponsored/i.test(caption)),
              hasYellowCart: false,
              cartProducts: [],
            };
          });
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
      for (const v of state.searchVideosList) {
        if (v && v.videoId && !String(v.videoId).startsWith('feed-')) {
          byId.set(String(v.videoId), v);
        }
      }
      for (const v of discoveredFeedVids) {
        if (v && v.videoId) byId.set(String(v.videoId), v);
      }
      state.searchVideosList = enrichVideosWithProLabels(Array.from(byId.values()).slice(0, 60));
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
      } else if (state.platform === 'instagram') {
        if (
          u.includes('/users/web_profile_info/') ||
          u.includes('/api/v1/feed/user/') ||
          u.includes('/graphql/query') ||
          u.includes('/api/graphql')
        ) {
          const parsed = JSON.parse(responseText);
          parseInstagramJson(u, parsed);
          broadcastSnapshot();
        }
      }
    } catch {
      // Bỏ qua nếu response không phải JSON hợp lệ
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
        const finalUrl = this.responseURL || this.__upbaseReqUrl || '';
        if (typeof this.responseText === 'string') {
          inspectNetworkPayload(finalUrl, this.responseText);
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

    mergeSellerMetricsForHandle(handle, {
      followers: domFollowers || prevSeller.followers || 0,
      recentRevenue: domGmv ?? prevSeller.recentRevenue ?? 0,
      itemsSold: domItemsSold ?? prevSeller.itemsSold ?? 0,
      gpm: domGpm ?? prevSeller.gpm ?? 0,
      aov: domAov ?? prevSeller.aov ?? 0,
      avgViews: domAvgViews ?? prevSeller.avgViews ?? 0,
      gmvShareVideo: vShare,
      gmvShareLive: lShare,
      gmvShareProductCard: cShare,
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
          displayName: prof.displayName || h,
          followers: prof.followers || 0,
          videoCount: 0,
          shopVideoCount: 0,
          totalViews: 0,
        };
      }
      authorMap[h].videoCount++;
      authorMap[h].totalViews += Number(v.views || 0);
      if (v.hasYellowCart || (v.cartProducts && v.cartProducts.length > 0)) {
        authorMap[h].shopVideoCount++;
      }
    }

    const discoveredKocs = Object.values(authorMap)
      .map((k) => ({
        ...k,
        avgViews: k.videoCount === 0 ? 0 : Math.round(k.totalViews / k.videoCount),
      }))
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
      const reelMatch = path.match(/^\/(?:p|reel|reels)\/([^/?#]+)/);
      if (reelMatch) {
        return {
          pageType: 'video',
          handle: '',
          videoId: reelMatch[1],
        };
      }
      const igProfile = path.match(/^\/([A-Za-z0-9._]{2,30})\/?$/);
      if (igProfile && !['explore', 'reels', 'direct', 'accounts', 'stories'].includes(igProfile[1])) {
        return {
          pageType: 'profile',
          handle: normHandle(igProfile[1]),
          videoId: null,
        };
      }
    }
    return { pageType: 'other', handle: state.activeSellerHandle || '', videoId: null };
  }

  // Điều khiển Trình phát Video trên trang (Tự cuộn, Phát nền, Tốc độ phát, Âm lượng - MIỄN PHÍ)
  function applyPlayerControlsOnPage() {
    if (typeof document.querySelector !== 'function') return;
    const cfg = state.playerControls;
    const videoEl = document.querySelector('video');
    if (!videoEl) return;

    if (cfg.playbackSpeed && Math.abs(videoEl.playbackRate - cfg.playbackSpeed) > 0.05) {
      videoEl.playbackRate = cfg.playbackSpeed;
    }
    if (typeof cfg.volumePct === 'number' && cfg.volumePct >= 0 && cfg.volumePct <= 100) {
      const targetVol = cfg.volumePct / 100;
      if (Math.abs(videoEl.volume - targetVol) > 0.05) {
        videoEl.volume = targetVol;
      }
    }

    if (!videoEl.__upbaseEndedBound && typeof videoEl.addEventListener === 'function') {
      videoEl.__upbaseEndedBound = true;
      videoEl.addEventListener('ended', () => {
        if (!state.playerControls.autoScroll) return;
        const nextBtn = document.querySelector(
          '[data-e2e="arrow-right"], [data-e2e="video-switch-next"], button[aria-label*="next" i]'
        );
        if (nextBtn) {
          nextBtn.click();
        } else {
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
        }
      });
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

  // Gắn Nhãn số liệu & Nhãn chữ PRO trực tiếp lên từng thẻ Video của lưới TikTok/Douyin + Sắp xếp lưới
  function injectGridCardOverlaysAndSort(videos) {
    if (state.platform !== 'tiktok' && state.platform !== 'douyin') return;
    if (typeof document.querySelectorAll !== 'function' || typeof document.createElement !== 'function') return;
    const cardNodes = Array.from(
      document.querySelectorAll(
        '[data-e2e="user-post-item"], [data-e2e="search_video-item"], [data-e2e="user-liked-item"]'
      )
    );
    if (cardNodes.length === 0) return;

    const vidById = new Map();
    for (const v of videos || []) {
      if (v && v.videoId) vidById.set(String(v.videoId), v);
    }
    for (const v of state.searchVideosList || []) {
      if (v && v.videoId && !vidById.has(String(v.videoId))) {
        vidById.set(String(v.videoId), v);
      }
    }

    const nfLocal = new Intl.NumberFormat('vi-VN');
    const showOverlay = state.playerControls.gridOverlayEnabled !== false;

    cardNodes.forEach((card, idx) => {
      const existingOverlay = card.querySelector('.ub-GridCardOverlay');
      if (!showOverlay) {
        if (existingOverlay) existingOverlay.remove();
        return;
      }

      const linkEl = card.querySelector('a[href*="/video/"]');
      const href = linkEl ? linkEl.getAttribute('href') || '' : '';
      const m = href.match(/\/video\/(\d+)/);
      const vidId = m ? m[1] : `dom-${idx}`;
      const vObj = vidById.get(vidId) || (videos && videos[idx]) || null;
      if (!vObj) return;

      card.setAttribute('data-ub-views', String(vObj.views || 0));
      card.setAttribute('data-ub-likes', String(vObj.likes || 0));
      card.setAttribute('data-ub-er', String(vObj.engagementRate || 0));
      card.setAttribute('data-ub-velocity', String(vObj.viewsPerHour || 0));
      card.setAttribute('data-ub-shop', vObj.hasYellowCart ? '1' : '0');
      card.setAttribute('data-ub-idx', card.getAttribute('data-ub-idx') || String(idx));

      // Lọc ẩn nếu đang bật chế độ "Chỉ hiện bài gắn giỏ"
      if (state.playerControls.gridSortMode === 'shop_only') {
        card.style.display = vObj.hasYellowCart ? '' : 'none';
      } else {
        card.style.display = '';
      }

      if (existingOverlay && existingOverlay.getAttribute('data-vid') === String(vObj.videoId)) {
        return;
      }
      if (existingOverlay) existingOverlay.remove();

      const tagsHtml = (vObj.gridLabels || [])
        .map(
          (lbl) =>
            `<span class="ub-GridTag ub-GridTag--${lbl.tone || 'neutral'}">${lbl.text}</span>`
        )
        .join('');

      const dateParts = String(vObj.publishedAt || '').split('-');
      const vnDateStr =
        dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : vObj.publishedAt || '';

      const overlay = document.createElement('div');
      overlay.className = 'ub-GridCardOverlay';
      overlay.setAttribute('data-vid', String(vObj.videoId));
      overlay.innerHTML = `
        ${tagsHtml ? `<div class="ub-GridCardTags">${tagsHtml}</div>` : ''}
        <div class="ub-GridCardStats">
          <span>Xem: <strong>${nfLocal.format(vObj.views || 0)}</strong></span>
          <span>Tim: <strong>${nfLocal.format(vObj.likes || 0)}</strong></span>
          <span>BL: <strong>${nfLocal.format(vObj.comments || 0)}</strong></span>
          <span>Lưu: <strong>${nfLocal.format(vObj.saves || 0)}</strong></span>
        </div>
        <div class="ub-GridCardFooter">
          <span style="color:#7A7872;">${vnDateStr} · <strong>${nfLocal.format(vObj.viewsPerHour || 0)}</strong> view/h</span>
          <button type="button" class="ub-GridQuickBtn" data-dl-url="${vObj.playableUrl || vObj.videoUrl || ''}" data-dl-id="${vObj.videoId}">Tải MP4</button>
        </div>
      `;

      const dlBtn = overlay.querySelector('.ub-GridQuickBtn');
      if (dlBtn) {
        dlBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          window.postMessage(
            {
              source: 'UPBASE_B2C_GRID_QUICK_DOWNLOAD',
              videoId: vObj.videoId,
              playableUrl: vObj.playableUrl || '',
              videoUrl: vObj.videoUrl || '',
              handle: vObj.handle || '',
            },
            '*'
          );
        });
      }

      card.appendChild(overlay);
    });

    // Sắp xếp lại thứ tự thẻ trên lưới DOM nếu người dùng chọn chế độ sắp xếp
    const sortMode = state.playerControls.gridSortMode;
    if (sortMode && sortMode !== 'default' && sortMode !== 'shop_only' && cardNodes.length > 1) {
      const parent = cardNodes[0].parentElement;
      if (parent) {
        const sortedCards = [...cardNodes].sort((a, b) => {
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
          parseAnyTikTokJsonDeep(JSON.parse(sTxt));
        } catch {
          // Bỏ qua
        }
      }
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
      if (postNodes.length > 0 && (!state.videosByHandle[handle] || state.videosByHandle[handle].length === 0)) {
        const domVids = [];
        postNodes.forEach((node, idx) => {
          const linkEl = node.querySelector('a[href*="/video/"]');
          const href = linkEl ? linkEl.getAttribute('href') || '' : '';
          const m = href.match(/\/video\/(\d+)/);
          const videoId = m ? m[1] : `dom-${idx}`;
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
            saves: 0,
            engagementRate: 5.0,
            isPinned,
            isSponsored: /#ad|giỏ hàng|tiktokshop/i.test(caption),
            hasYellowCart: /giỏ hàng|tiktokshop/i.test(caption),
            cartProducts: [],
          });
        });
        if (domVids.length > 0) {
          mergeVideosForHandle(handle, domVids);
        }
      }

      if (urlInfo.pageType === 'video' && urlInfo.videoId) {
        const likeText =
          document.querySelector('[data-e2e="like-count"], [data-e2e="browse-like-count"]')?.textContent || '';
        const commentText =
          document.querySelector('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]')?.textContent || '';
        const shareText =
          document.querySelector('[data-e2e="share-count"]')?.textContent || '';
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
          saves: existingVid?.saves || 0,
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

      // Hàm chọn phần tử hiển thị trên màn hình nằm gần tâm của video đang phát nhất
      const pickClosestElement = (selector, minLeftPx = 0) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        let bestEl = null;
        let bestDist = Infinity;
        for (const el of nodes) {
          if (el.closest('#upbase-b2c-ext-root') || el.closest('nav')) continue;
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

      const pickClosestText = (selector, minLeftPx = 180) => {
        const el = pickClosestElement(selector, minLeftPx);
        return el && el.textContent ? el.textContent.trim() : '';
      };

      // 2. Bóc tách các chỉ số Tim (9298), Bình luận (32), Lưu (467), Chia sẻ (2520) của đúng bài đang ở tâm màn hình
      const likeTxt = pickClosestText('[data-e2e="like-count"], [data-e2e="browse-like-count"]', 180);
      const cmtTxt = pickClosestText('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]', 180);
      const saveTxt = pickClosestText(
        '[data-e2e="undefined-count"], [data-e2e*="bookmark-count"], [data-e2e*="collect-count"]',
        180
      );
      const shareTxt = pickClosestText('[data-e2e="share-count"], [data-e2e="browse-share-count"]', 180);
      const descTxt = pickClosestText(
        '[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="Executable-video-desc"]',
        180
      );
      const musicTxt = pickClosestText(
        '[data-e2e="video-music"], [data-e2e="browse-music"], a[href*="/music/"]',
        180
      );
      const closestAvatarImg = pickClosestElement('a[href*="/@"] img', 220);
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

      // 3. Tìm @handle của đúng video đang ở giữa màn hình (loại trừ cột menu trái r.left < 220)
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

      const closestAuthorLink = pickClosestElement('a[href*="/@"]', 220);
      if (closestAuthorLink) {
        const href = closestAuthorLink.getAttribute('href') || '';
        const m = href.match(/\/@([^/?#&]+)/);
        if (m && m[1]) {
          const candidate = normHandle(m[1]);
          if (candidate && !bannedHandles.has(candidate)) {
            feedHandle = candidate;
            const txt = (closestAuthorLink.textContent || '').trim();
            if (txt && txt.length < 50) feedDisplayName = txt.replace(/^@+/, '');
          }
        }
      }

      const domAuthorTitle = pickClosestText(
        '[data-e2e="video-author-uniqueid"], [data-e2e="feed-video-nickname"], [data-e2e="video-author-nickname"], [data-e2e="browse-username"]',
        220
      );
      if (!feedDisplayName && domAuthorTitle) {
        feedDisplayName = domAuthorTitle.replace(/^@+/, '').trim();
      }
      if (!feedHandle && domAuthorTitle) {
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

      // Ưu tiên 1: Khớp cả số Tim + số Bình luận đang hiển thị trên màn hình (nhạy 100% khi cuộn sang bài mới)
      if (likes > 0) {
        matchedVid =
          realPool.find(
            (v) =>
              Math.abs((v.likes || 0) - likes) <= Math.max(3, likes * 0.03) &&
              (comments === 0 || Math.abs((v.comments || 0) - comments) <= Math.max(3, comments * 0.1))
          ) ||
          realPool.find((v) => Math.abs((v.likes || 0) - likes) <= Math.max(5, likes * 0.05)) ||
          null;
      }
      // Ưu tiên 2: Khớp theo @handle tìm thấy ở tâm màn hình
      if (!matchedVid && feedHandle) {
        matchedVid = realPool.find((v) => v.handle === feedHandle) || null;
      }
      // Ưu tiên 3: Khớp theo nội dung mô tả (caption)
      if (!matchedVid && descTxt && descTxt.length >= 4) {
        const cleanDesc = descTxt.slice(0, 24).toLowerCase();
        matchedVid =
          realPool.find((v) => String(v.caption || '').toLowerCase().includes(cleanDesc)) || null;
      }
      // Ưu tiên 4: Nếu trang vừa mở chưa đọc được DOM số Tim thì lấy bài đầu tiên trong danh sách mạng
      if (!matchedVid && realPool.length > 0 && !feedHandle && likes === 0) {
        matchedVid = realPool[0];
      }

      if (matchedVid && matchedVid.handle) {
        feedHandle = matchedVid.handle;
        if (!feedDisplayName && state.profilesByHandle[feedHandle]?.displayName) {
          feedDisplayName = state.profilesByHandle[feedHandle].displayName;
        }
      } else if (!feedHandle && realPool[0]?.handle) {
        feedHandle = realPool[0].handle;
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
            [feedVidObj, ...state.searchVideosList].slice(0, 60)
          );
        }
      }
    }
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
    const adsRows = Object.values(state.adsRowsByVideoId);
    const channelHealth = computeChannelHealthSummary(videos, profile?.followers || 0);
    const postingAnalytics = computePostingAnalytics(videos);
    const productAggregation = aggregateProductsAndShops(videos);
    const searchSaturation = computeSearchNicheSaturation(videos);
    const activeVideo =
      urlInfo.pageType === 'video'
        ? state.currentVideoDetail || videos.find((v) => v.videoId === urlInfo.videoId) || null
        : state.currentVideoDetail || videos[0] || null;
    const activeCommentStats =
      activeVideo && activeVideo.videoId ? state.commentsByVideoId[activeVideo.videoId] || null : null;

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
          profile,
          videos,
          sellerMetrics,
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
  const onFeedScrollOrWheel = () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(broadcastSnapshot, 140);
  };
  window.addEventListener('scroll', onFeedScrollOrWheel, true);
  window.addEventListener('wheel', onFeedScrollOrWheel, { passive: true, capture: true });

  window.addEventListener('popstate', () => setTimeout(broadcastSnapshot, 250));
  setInterval(() => {
    const currentHref = window.location.href;
    let centerLikeSig = '';
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
    }
    const sig = `${currentHref}|${centerLikeSig}`;
    if (window.__upbaseLastSig !== sig) {
      window.__upbaseLastSig = sig;
      setTimeout(broadcastSnapshot, 80);
    }
  }, 450);
})();
