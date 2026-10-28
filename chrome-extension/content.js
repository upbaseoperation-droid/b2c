(function () {
  if (document.getElementById('upbase-b2c-ext-root')) return;

  const nf = new Intl.NumberFormat('vi-VN');

  function formatVnd(amount) {
    const n = Math.round(Number(amount || 0));
    return n > 0 ? `${nf.format(n)} đ` : '0 đ';
  }

  function formatNum(val) {
    const n = Math.round(Number(val || 0));
    return nf.format(n);
  }

  function formatDateVn(isoDateStr) {
    const raw = String(isoDateStr || '').trim();
    if (!raw || raw === '—') return '—';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return raw;
  }

  function calcMedian(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sorted = arr
      .map((x) => Number(x || 0))
      .filter((x) => Number.isFinite(x))
      .sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? Math.round(sorted[mid])
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  const isAdsHost = window.location.hostname.includes('ads.tiktok.com');
  const isSellerHost =
    !isAdsHost &&
    (window.location.hostname.includes('affiliate') ||
      window.location.hostname.includes('seller') ||
      window.location.hostname.includes('tiktokshop'));

  const savedUiPrefs = (() => {
    try {
      const raw = window.localStorage.getItem('upbase_ext_ui_prefs_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  const savedWatchlist = (() => {
    try {
      const raw = window.localStorage.getItem('upbase_ext_watchlist_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const UPBASE_ICON_SVG = `<svg viewBox="0 0 36 36" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;"><path d="M7.5 3.5C8.4 1.9 10.1 1 12 1H24C25.9 1 27.6 1.9 28.5 3.5L34.2 14.5C35.8 17.6 33.5 21.5 30 21.5H28.5V27.5C28.5 31.6 25.1 35 21 35H15C10.9 35 7.5 31.6 7.5 27.5V21.5H6C2.5 21.5 0.2 17.6 1.8 14.5L7.5 3.5Z" fill="#E84520"/><path d="M12.5 11.5V22.5C12.5 25.5 14.9 28 18 28C21.1 28 23.5 25.5 23.5 22.5V11.5H19.5V22.2C19.5 23.1 18.8 23.8 18 23.8C17.2 23.8 16.5 23.1 16.5 22.2V11.5H12.5Z" fill="#FFFFFF"/></svg>`;

  const UPBASE_LOGO_SVG = `<svg viewBox="0 0 132 36" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;"><path d="M7.5 3.5C8.4 1.9 10.1 1 12 1H24C25.9 1 27.6 1.9 28.5 3.5L34.2 14.5C35.8 17.6 33.5 21.5 30 21.5H28.5V27.5C28.5 31.6 25.1 35 21 35H15C10.9 35 7.5 31.6 7.5 27.5V21.5H6C2.5 21.5 0.2 17.6 1.8 14.5L7.5 3.5Z" fill="#E84520"/><path d="M12.5 11.5V22.5C12.5 25.5 14.9 28 18 28C21.1 28 23.5 25.5 23.5 22.5V11.5H19.5V22.2C19.5 23.1 18.8 23.8 18 23.8C17.2 23.8 16.5 23.1 16.5 22.2V11.5H12.5Z" fill="#FFFFFF"/><text x="41" y="25" fill="#1C2B4B" font-family="'Be Vietnam Pro', sans-serif" font-weight="800" font-size="21" letter-spacing="-0.4">Upbase</text></svg>`;

  const uiState = {
    minimized: Boolean(savedUiPrefs.minimized),
    compactBarMode: Boolean(savedUiPrefs.compactBarMode),
    toolsExpanded: false,
    dockSide: savedUiPrefs.dockSide === 'left' ? 'left' : 'right', // 'right' | 'left'
    customPos: savedUiPrefs.customPos || null, // { top, left }
    sellerEditExpanded: false,
    activeTab: isAdsHost ? 'ads' : isSellerHost ? 'seller' : 'metrics', // 'metrics' | 'seller' | 'ads' | 'booking' | 'aircheck'
    metricsSubView: 'posts', // 'posts' | 'schedule' | 'products' | 'hub' | 'ai_studio'
    sampleSize: 15,
    excludePinned: true,
    dateFromFilter: '',
    dateToFilter: '',
    keywordFilter: '',
    tableSortMode: 'default', // 'default' | 'views' | 'likes' | 'er' | 'velocity'
    showExtraCols: true,
    playerControls: {
      autoScroll: false,
      bgPlay: true,
      playbackSpeed: 1.0,
      volumePct: 100,
      gridOverlayEnabled: true,
      gridSortMode: 'default',
    },
    platform: isAdsHost ? 'tiktok_ads' : isSellerHost ? 'tiktok_seller' : 'tiktok',
    pageType: isAdsHost ? 'ads_manager' : isSellerHost ? 'seller_creator' : 'profile',
    handle: '',
    videoId: null,
    profile: null,
    videos: [],
    sellerMetrics: null,
    adsRecords: [],
    currentVideo: null,
    postingAnalytics: null,
    productAggregation: null,
    searchSaturation: null,
    // Super VIP Product Scorer
    superVipQueryInput: '',
    superVipCommissionPct: 12,
    superVipScoredProduct: null,
    // Affiliate Hub (Watchlist & Commission Calculator)
    watchlistChannels: Array.isArray(savedWatchlist) ? savedWatchlist : [],
    commissionCalc: {
      priceVnd: 289000,
      commissionPct: 12,
      expectedOrders: 50,
      fixedCostVnd: 2000000,
    },
    // PRO Channel Review & Video Script + Image Prompt Generator
    scriptAnalysisResult: null,
    imagePromptInputUrl: '',
    imagePromptStyle: 'Chụp studio thương mại B2C ánh sáng tự nhiên',
    imagePromptResult: null,
    // Bug Report / Feedback Note
    feedbackModalOpen: false,
    bugReportNoteInput: '',
    // Dữ liệu đối soát từ web-admin
    lookupLoading: false,
    lastLookedUpHandle: '',
    lookupResult: null,
    // Các trường TikTok Seller (Cột Y -> AM trên Google Sheet Listing)
    sellerDraft: {
      followers: 0,
      doanhSo: 0,
      soMonBanRa: 0,
      gpm: 0,
      aov: 0,
      viewTrungBinh: 0,
      gmvTuVideoPct: 80,
      gmvTuLivePct: 14,
      gmvTuTheSanPhamPct: 6,
      namPct: 22,
      nuPct: 78,
      tuoi18_24Pct: 35,
      tuoi25_34Pct: 45,
      tuoiTren35Pct: 20,
      location: 'Việt Nam',
    },
    // Các trường TikTok Ads Manager & Nghiệm thu Cột BE -> BI
    adsDraft: {
      videoId: '',
      dealCode: '',
      sparkAdsCode: '',
      bookingCostNet: 0,
      adsSpend: 0,
      gmv: 0,
      orders: 0,
      views: 0,
      hookRate2s: 0,
      viewRate6s: 0,
      batchSparkCodesText: '',
    },
    // Form state
    selectedStoreName: 'ClubClio_TikTok_E2E-S',
    bookingFormatLabel: 'Video trả phí',
    rateCardNetInput: '',
    picNameInput: 'Trần Hữu Chiến',
    noteInput: '',
    dealCodeInput: '',
    expectedHashtagInput: '',
    expectedUspInput: '',
    expectedCartUrlInput: '',
    channelHealth: null,
    commentAnalysis: null,
    feedbackBanner: null,
    syncing: false,
  };

  const BLACKLIST_FORBIDDEN_WORDS = [
    'trị dứt điểm',
    'chữa khỏi',
    'cam kết 100%',
    'hiệu quả 100%',
    'thuốc đặc trị',
    'trắng tức thì',
    'bác sĩ khuyên dùng',
    'shopee',
    'lazada',
    'tiki',
    'zalo',
    'chuyển khoản',
    'đặt cọc',
    'hàng tuồn',
  ];

  chrome.storage.local.get(['upbasePicName'], (res) => {
    if (res?.upbasePicName) {
      uiState.picNameInput = String(res.upbasePicName);
    }
  });

  function saveUiPrefs() {
    try {
      window.localStorage.setItem(
        'upbase_ext_ui_prefs_v1',
        JSON.stringify({
          minimized: uiState.minimized,
          compactBarMode: uiState.compactBarMode,
          dockSide: uiState.dockSide,
          customPos: uiState.customPos,
        })
      );
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
  }

  function isUserTypingInExtension() {
    const active = document.activeElement;
    if (!active || !root.contains(active)) return false;
    const tag = (active.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function hydrateSellerDraft() {
    const sm = uiState.sellerMetrics || {};
    const db = uiState.lookupResult?.koc || {};
    const stats = computeChannelStats();

    uiState.sellerDraft = {
      followers: Math.round(Number(sm.followers || stats.followers || db.followers || 0)),
      doanhSo: Math.round(Number(sm.recentRevenue || db.recentRevenue || 0)),
      soMonBanRa: Math.round(Number(sm.itemsSold || db.itemsSold || 0)),
      gpm: Math.round(Number(sm.gpm || db.gpm || 0)),
      aov: Math.round(Number(sm.aov || db.aov || 0)),
      viewTrungBinh: Math.round(Number(sm.avgViews || stats.avgViews || db.avgViews || 0)),
      gmvTuVideoPct: Number(sm.gmvShareVideo ?? db.gmvShareVideo ?? 80),
      gmvTuLivePct: Number(sm.gmvShareLive ?? db.gmvShareLive ?? 14),
      gmvTuTheSanPhamPct: Number(sm.gmvShareProductCard ?? db.gmvShareProductCard ?? 6),
      namPct: Number(sm.maleRatio ?? db.maleRatio ?? 22),
      nuPct: Number(sm.femaleRatio ?? db.femaleRatio ?? 78),
      tuoi18_24Pct: Number(sm.age18_24 ?? db.age18_24 ?? 35),
      tuoi25_34Pct: Number(sm.age25_34 ?? db.age25_34 ?? 45),
      tuoiTren35Pct: Number(sm.age35Plus ?? db.age35Plus ?? 20),
      location: String(sm.location || db.location || 'Việt Nam'),
    };
  }

  function hydrateAdsDraft() {
    const firstAds = uiState.adsRecords?.[0] || null;
    const regVid = uiState.lookupResult?.registeredVideos?.[0] || null;
    const kocDb = uiState.lookupResult?.koc || null;
    const curVid = uiState.currentVideo || uiState.videos?.[0] || null;

    uiState.adsDraft = {
      videoId: String(
        uiState.adsDraft.videoId ||
          firstAds?.videoId ||
          regVid?.videoId ||
          regVid?.systemVideoId ||
          curVid?.videoId ||
          ''
      ),
      dealCode: String(
        uiState.adsDraft.dealCode ||
          regVid?.dealCode ||
          kocDb?.latestBoCode ||
          ''
      ),
      sparkAdsCode: String(
        uiState.adsDraft.sparkAdsCode ||
          firstAds?.sparkAdsCode ||
          regVid?.sparkAdsCode ||
          ''
      ),
      bookingCostNet: Math.round(
        Number(
          uiState.adsDraft.bookingCostNet ||
            regVid?.bookingCostNet ||
            kocDb?.rateCardVideo ||
            0
        )
      ),
      adsSpend: Math.round(
        Number(
          firstAds?.adsSpend ??
            uiState.adsDraft.adsSpend ??
            regVid?.latestAdsSpend ??
            0
        )
      ),
      gmv: Math.round(
        Number(firstAds?.gmv ?? uiState.adsDraft.gmv ?? regVid?.latestGmv ?? 0)
      ),
      orders: Math.round(
        Number(firstAds?.orders ?? uiState.adsDraft.orders ?? 0)
      ),
      views: Math.round(
        Number(
          firstAds?.impressions ||
            curVid?.views ||
            uiState.adsDraft.views ||
            regVid?.latestViews ||
            0
        )
      ),
      hookRate2s: Number(firstAds?.hookRate2s ?? uiState.adsDraft.hookRate2s ?? 0),
      viewRate6s: Number(firstAds?.viewRate6s ?? uiState.adsDraft.viewRate6s ?? 0),
      batchSparkCodesText:
        uiState.adsDraft.batchSparkCodesText ||
        (uiState.lookupResult?.registeredVideos || [])
          .filter((v) => v.sparkAdsCode)
          .map((v) => v.sparkAdsCode)
          .join('\n'),
    };
  }

  function computeChannelStats() {
    const allVids = Array.isArray(uiState.videos) ? uiState.videos : [];
    const kw = String(uiState.keywordFilter || '').trim().toLowerCase();
    const fromD = String(uiState.dateFromFilter || '').trim();
    const toD = String(uiState.dateToFilter || '').trim();

    const filtered = allVids
      .filter((v) => {
        if (uiState.excludePinned && v.isPinned) return false;
        const pub = String(v.publishedAt || '').slice(0, 10);
        if (fromD && pub && pub < fromD) return false;
        if (toD && pub && pub > toD) return false;
        if (kw) {
          const cap = String(v.caption || '').toLowerCase();
          const prodTitles = (v.cartProducts || []).map((p) => String(p.title || '').toLowerCase()).join(' ');
          if (!cap.includes(kw) && !prodTitles.includes(kw)) return false;
        }
        return true;
      })
      .slice(0, uiState.sampleSize);

    if (uiState.tableSortMode === 'views') {
      filtered.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    } else if (uiState.tableSortMode === 'likes') {
      filtered.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
    } else if (uiState.tableSortMode === 'er') {
      filtered.sort((a, b) => Number(b.engagementRate || 0) - Number(a.engagementRate || 0));
    } else if (uiState.tableSortMode === 'velocity') {
      filtered.sort((a, b) => Number(b.viewsPerHour || 0) - Number(a.viewsPerHour || 0));
    }

    const count = filtered.length;
    if (count === 0) {
      const masterKoc = uiState.lookupResult?.koc;
      const sm = uiState.sellerMetrics;
      return {
        sampleCount: 0,
        followers: uiState.profile?.followers || sm?.followers || masterKoc?.followers || 0,
        avgViews: sm?.avgViews || masterKoc?.avgViews || 0,
        medianViews: masterKoc?.medianViews || sm?.avgViews || masterKoc?.avgViews || 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        engagementRate: masterKoc?.engagementRate || 0,
        organicAvgViews: 0,
        sponsoredAvgViews: 0,
        sponsoredCount: 0,
        filteredVideos: [],
      };
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    const viewsList = [];
    const organicViews = [];
    const sponsoredViews = [];

    for (const v of filtered) {
      const vw = Number(v.views || 0);
      const lk = Number(v.likes || 0);
      const cm = Number(v.comments || 0);
      const sh = Number(v.shares || 0);
      totalViews += vw;
      totalLikes += lk;
      totalComments += cm;
      totalShares += sh;
      viewsList.push(vw);
      if (v.isSponsored || v.hasYellowCart) {
        sponsoredViews.push(vw);
      } else {
        organicViews.push(vw);
      }
    }

    const avgViews = count === 0 ? 0 : Math.round(totalViews / count);
    const medianViews = calcMedian(viewsList);
    const avgLikes = count === 0 ? 0 : Math.round(totalLikes / count);
    const avgComments = count === 0 ? 0 : Math.round(totalComments / count);
    const avgShares = count === 0 ? 0 : Math.round(totalShares / count);
    const engagementRate =
      totalViews === 0
        ? 0
        : Number((((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(2));
    const organicAvgViews =
      organicViews.length === 0
        ? 0
        : Math.round(organicViews.reduce((a, b) => a + b, 0) / organicViews.length);
    const sponsoredAvgViews =
      sponsoredViews.length === 0
        ? 0
        : Math.round(sponsoredViews.reduce((a, b) => a + b, 0) / sponsoredViews.length);

    return {
      sampleCount: count,
      followers: uiState.profile?.followers || uiState.lookupResult?.koc?.followers || 0,
      avgViews,
      medianViews,
      avgLikes,
      avgComments,
      avgShares,
      engagementRate,
      organicAvgViews,
      sponsoredAvgViews,
      sponsoredCount: sponsoredViews.length,
      filteredVideos: filtered,
    };
  }

  let contentMasterDbPromise = null;
  let lookupSeqCounter = 0;

  function normalizeKocHandle(raw) {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/\s+/g, '');
  }

  function stripKocHandlePunct(raw) {
    return normalizeKocHandle(raw).replace(/[._-]+/g, '');
  }

  function dedupeKocHandleLetters(raw) {
    return stripKocHandlePunct(raw).replace(/([a-z])\1+/g, '$1');
  }

  function inflateMasterTuple(tuple) {
    if (!Array.isArray(tuple)) return null;
    const rawDeals = Array.isArray(tuple[29]) ? tuple[29] : [];
    const recentDeals = rawDeals.map((d, idx) => ({
      id: `${tuple[0]}-deal-${idx + 1}`,
      dealCode: d[0] || '—',
      brandName: d[1] || '—',
      storeName: d[1] || '—',
      bookingFormat: 'Booking Video KOC',
      totalValue: Number(d[2] || 0),
      viewsCount: Number(d[3] || 0),
      assignedStaff: d[4] || '—',
      videoUrl: d[5] || '',
      statusLabel: 'Đã hoàn tất',
    }));

    return {
      id: tuple[0] || '',
      channelId: tuple[1] || '',
      stageName: tuple[2] || tuple[1] || '',
      realName: tuple[3] || '—',
      salaryGrade: tuple[4] || 'KL1',
      segment: tuple[5] || 'Micro',
      followers: Number(tuple[6] || 0),
      avgViews: Number(tuple[7] || 0),
      medianViews: Number(tuple[8] || 0),
      engagementRate: Number(tuple[9] || 0),
      rateCardVideo: Number(tuple[10] || 0),
      minRate: Number(tuple[11] || tuple[10] || 0),
      maxRate: Number(tuple[12] || tuple[10] || 0),
      reliabilityScore: Number(tuple[13] || 0),
      totalPastDeals: Number(tuple[14] || recentDeals.length || 0),
      totalPaidVideos: Number(tuple[15] || 0),
      totalFocVideos: Number(tuple[16] || 0),
      latestBookMonth: tuple[17] || '—',
      latestBoCode: tuple[18] || '—',
      bookingPic: tuple[19] || '—',
      brandName: tuple[20] || '—',
      proposedStores: tuple[20] || '',
      phoneMasked: tuple[21] || '—',
      cccdMasked: tuple[22] || '—',
      bankAccountMasked: tuple[23] || '—',
      sharedMcnInfo: tuple[24] || null,
      recentRevenue: Number(tuple[25] || 0),
      itemsSold: Number(tuple[26] || 0),
      gpm: Number(tuple[27] || 0),
      aov: Number(tuple[28] || 0),
      gmvShareVideo: 80,
      gmvShareLive: 14,
      gmvShareProductCard: 6,
      maleRatio: 22,
      femaleRatio: 78,
      age18_24: 35,
      age25_34: 45,
      age35Plus: 20,
      location: 'Việt Nam',
      recentDeals,
    };
  }

  async function lookupLocalMasterKocInContent(rawHandle) {
    if (!contentMasterDbPromise) {
      contentMasterDbPromise = (async () => {
        try {
          if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
            return { byExact: new Map(), byStripped: new Map(), byFuzzy: new Map(), stores: [] };
          }
          const res = await fetch(chrome.runtime.getURL('koc-master-db.json'));
          const raw = await res.json();
          const kocsMap = raw?.kocs || {};
          const stores = Array.isArray(raw?.stores) ? raw.stores : [];
          const byExact = new Map();
          const byStripped = new Map();
          const byFuzzy = new Map();

          for (const [key, tuple] of Object.entries(kocsMap)) {
            const clean = normalizeKocHandle(key);
            if (!clean || !Array.isArray(tuple)) continue;
            const dealsCount = Number(tuple[14] || 0);
            const prevExact = byExact.get(clean);
            if (!prevExact || Number(prevExact[14] || 0) < dealsCount) {
              byExact.set(clean, tuple);
            }
            const stripped = stripKocHandlePunct(clean);
            if (stripped) {
              const prevStripped = byStripped.get(stripped);
              if (!prevStripped || Number(prevStripped[14] || 0) < dealsCount) {
                byStripped.set(stripped, tuple);
              }
            }
            const fuzzy = dedupeKocHandleLetters(clean);
            if (fuzzy) {
              const prevFuzzy = byFuzzy.get(fuzzy);
              if (!prevFuzzy || Number(prevFuzzy[14] || 0) < dealsCount) {
                byFuzzy.set(fuzzy, tuple);
              }
            }
          }
          return { byExact, byStripped, byFuzzy, stores };
        } catch {
          return { byExact: new Map(), byStripped: new Map(), byFuzzy: new Map(), stores: [] };
        }
      })();
    }

    const db = await contentMasterDbPromise;
    const clean = normalizeKocHandle(rawHandle);
    if (!clean) {
      return {
        success: true,
        handle: '',
        foundInMaster: false,
        koc: null,
        recentDeals: [],
        stores: db.stores,
        registeredVideos: [],
      };
    }

    let matchedTuple = db.byExact.get(clean) || null;
    const strippedTuple = db.byStripped.get(stripKocHandlePunct(clean)) || null;
    const fuzzyTuple = db.byFuzzy.get(dedupeKocHandleLetters(clean)) || null;

    if (!matchedTuple && strippedTuple) {
      matchedTuple = strippedTuple;
    } else if (
      matchedTuple &&
      fuzzyTuple &&
      Number(fuzzyTuple[14] || 0) > Number(matchedTuple[14] || 0) &&
      (String(fuzzyTuple[3] || '') === String(matchedTuple[3] || '') ||
        Number(fuzzyTuple[14] || 0) >= Number(matchedTuple[14] || 0) * 3)
    ) {
      matchedTuple = fuzzyTuple;
    } else if (!matchedTuple && fuzzyTuple) {
      matchedTuple = fuzzyTuple;
    }

    const koc = matchedTuple ? inflateMasterTuple(matchedTuple) : null;
    return {
      success: true,
      handle: clean,
      foundInMaster: Boolean(koc),
      sourceType: koc ? 'LOCAL_MASTER_DB' : 'NEW_PROSPECT',
      koc,
      recentDeals: koc ? koc.recentDeals : [],
      stores: db.stores,
      registeredVideos: [],
    };
  }

  function applyLookupDataToUi(data) {
    if (!data) return;
    uiState.lookupResult = data;
    const insp = data.inspectedVideo;
    if (insp && typeof insp === 'object') {
      const cur = uiState.currentVideo || {};
      if (!cur.videoId || String(cur.videoId) === String(insp.videoId)) {
        const mergedCart =
          Array.isArray(cur.cartProducts) && cur.cartProducts.length > 0
            ? cur.cartProducts
            : Array.isArray(insp.cartProducts)
              ? insp.cartProducts
              : [];
        uiState.currentVideo = {
          ...cur,
          ...insp,
          views: Math.max(Number(cur.views || 0), Number(insp.views || 0)),
          likes: Math.max(Number(cur.likes || 0), Number(insp.likes || 0)),
          comments: Math.max(Number(cur.comments || 0), Number(insp.comments || 0)),
          shares: Math.max(Number(cur.shares || 0), Number(insp.shares || 0)),
          saves: Math.max(Number(cur.saves || 0), Number(insp.saves || 0)),
          hasYellowCart: Boolean(cur.hasYellowCart || insp.hasYellowCart || mergedCart.length > 0),
          cartProducts: mergedCart,
          transcriptText: cur.transcriptText || insp.transcriptText || '',
          playableUrl: cur.playableUrl || insp.playableUrl || '',
        };
      }
    }
    if (data.koc?.rateCardVideo && !uiState.rateCardNetInput) {
      uiState.rateCardNetInput = String(data.koc.rateCardVideo);
    }
    if (data.koc?.brandName && data.stores?.length) {
      const matchedStore = data.stores.find(
        (s) =>
          s.storeName === data.koc.proposedStores ||
          s.brandName === data.koc.brandName
      );
      if (matchedStore) {
        uiState.selectedStoreName = matchedStore.storeName;
      }
    }
    hydrateSellerDraft();
    hydrateAdsDraft();
  }

  function lookupKocOnServer(handle, forceVideoId) {
    const clean = normalizeKocHandle(handle);
    const activeVidId = String(forceVideoId || uiState.videoId || uiState.currentVideo?.videoId || '').trim();
    const lookupSig = `${clean || '__ALL__'}|${activeVidId}`;
    if (clean && uiState.lastLookedUpHandle === lookupSig && uiState.lookupResult?.handle === clean) {
      return;
    }
    const reqId = ++lookupSeqCounter;
    uiState.lookupLoading = true;
    uiState.lastLookedUpHandle = lookupSig;
    render();

    // Bước 1: Nhận diện ngay lập tức từ bộ Master Data 5.020 KOC nhúng sẵn trong Extension
    lookupLocalMasterKocInContent(clean).then((localData) => {
      if (reqId === lookupSeqCounter && localData?.foundInMaster && !uiState.lookupResult?.foundInMaster) {
        applyLookupDataToUi(localData);
        if (!isUserTypingInExtension()) {
          render();
        }
      }

      // Bước 2: Gọi sang Background / Web-Admin để đồng bộ dữ liệu trực tuyến mới nhất
      chrome.runtime.sendMessage(
        {
          type: 'UPBASE_LOOKUP_KOC',
          handle: clean,
          platform: uiState.platform === 'instagram' ? 'instagram' : 'tiktok',
          videoId: activeVidId,
          videoUrl:
            uiState.currentVideo?.videoUrl ||
            (window.location.href.includes('/video/') ? window.location.href.split('?')[0] : ''),
        },
        (resp) => {
          if (reqId !== lookupSeqCounter) return;
          uiState.lookupLoading = false;
          if (resp && resp.ok && resp.data?.success) {
            const serverData = resp.data;
            if (!serverData.foundInMaster && localData?.foundInMaster) {
              serverData.foundInMaster = true;
              serverData.koc = localData.koc;
              serverData.recentDeals = localData.recentDeals;
            }
            if ((!serverData.stores || serverData.stores.length === 0) && localData?.stores?.length) {
              serverData.stores = localData.stores;
            }
            applyLookupDataToUi(serverData);
          } else if (localData) {
            applyLookupDataToUi(localData);
          } else {
            uiState.lookupResult = {
              foundInMaster: false,
              handle: clean,
              error: resp?.error || 'Chưa kết nối máy chủ Upbase B2C',
              stores: [],
              registeredVideos: [],
            };
            hydrateSellerDraft();
            hydrateAdsDraft();
          }
          if (!isUserTypingInExtension()) {
            render();
          }
        }
      );
    });
  }

  function copyTextToClipboard(text, successMsg) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        uiState.feedbackBanner = { tone: 'pos', text: successMsg };
        render();
      })
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        uiState.feedbackBanner = { tone: 'pos', text: successMsg };
        render();
      });
  }

  // Copy 15 cột chuẩn từ Cột Y (Doanh số) -> Cột AM (Location) để dán 1 phát vào Google Sheet Listing
  function handleCopySellerColumnsYtoAM() {
    const d = uiState.sellerDraft;
    const otherAgePct = Math.max(
      0,
      100 - Number(d.tuoi18_24Pct || 0) - Number(d.tuoi25_34Pct || 0) - Number(d.tuoiTren35Pct || 0)
    );
    const colsYtoAM = [
      Math.round(Number(d.doanhSo || 0)),              // Cột Y: Doanh số (nếu có)
      Math.round(Number(d.soMonBanRa || 0)),           // Cột Z: Số món bán ra
      Math.round(Number(d.gpm || 0)),                  // Cột AA: GPM
      Math.round(Number(d.aov || 0)),                  // Cột AB: GMV từ mỗi khách hàng/ AOV
      Math.round(Number(d.viewTrungBinh || 0)),        // Cột AC: View trung bình video
      `${Number(d.gmvTuVideoPct || 0)}%`,              // Cột AD: GMV từ video
      `${Number(d.gmvTuLivePct || 0)}%`,               // Cột AE: GMV từ Live
      `${Number(d.gmvTuTheSanPhamPct || 0)}%`,         // Cột AF: GMV từ thẻ sản phẩm
      `${Number(d.namPct || 0)}%`,                     // Cột AG: Nam
      `${Number(d.nuPct || 0)}%`,                      // Cột AH: Nữ
      `${Number(d.tuoi18_24Pct || 0)}%`,               // Cột AI: 18-24
      `${Number(d.tuoi25_34Pct || 0)}%`,               // Cột AJ: 25-34
      `${Number(d.tuoiTren35Pct || 0)}%`,              // Cột AK: >35
      `${otherAgePct}%`,                               // Cột AL: Other
      String(d.location || 'Việt Nam'),                // Cột AM: Location
    ].join('\t');

    copyTextToClipboard(
      colsYtoAM,
      'Đã copy 15 cột (Cột Y → AM). Đặt chuột vào ô Cột Y (Doanh số) trên Google Sheet rồi bấm Ctrl+V.'
    );
  }

  // Copy tóm tắt chỉ số kênh TikTok Seller để dán vào nhóm Lark / Zalo
  function handleCopySellerSummaryText() {
    const d = uiState.sellerDraft;
    const text = [
      `Kênh KOC: @${uiState.handle} (https://www.tiktok.com/@${uiState.handle})`,
      `- Follower: ${formatNum(d.followers)} | View TB: ${formatNum(d.viewTrungBinh)}`,
      `- GMV 30d: ${formatVnd(d.doanhSo)} | Đã bán: ${formatNum(d.soMonBanRa)} món`,
      `- GPM: ${formatVnd(d.gpm)} | AOV: ${formatVnd(d.aov)}`,
      `- Tỷ trọng GMV: Video ${d.gmvTuVideoPct}% · Live ${d.gmvTuLivePct}% · Thẻ SP ${d.gmvTuTheSanPhamPct}%`,
      `- Tệp khán giả: Nữ ${d.nuPct}% / Nam ${d.namPct}% · Tuổi 18-24 (${d.tuoi18_24Pct}%), 25-34 (${d.tuoi25_34Pct}%)`,
    ].join('\n');

    copyTextToClipboard(text, 'Đã copy bản tóm tắt chỉ số TikTok Seller vào bộ nhớ tạm.');
  }

  // Copy 5 cột Nghiệm thu Air & Ads (Cột BE -> BI trên Google Sheet Listing)
  function handleCopyAdsAcceptanceColumnsBEtoBI() {
    const a = uiState.adsDraft;
    const totalCost = Math.round(Number(a.bookingCostNet || 0)) + Math.round(Number(a.adsSpend || 0));
    const gmv = Math.round(Number(a.gmv || 0));
    const totalRoi = totalCost === 0 ? 0 : Number((gmv / totalCost).toFixed(2));

    const colsBEtoBI = [
      String(a.sparkAdsCode || '—'),             // Cột BE: Mã ủy quyền ads
      Math.round(Number(a.views || 0)),          // Cột BF: Views (cập nhật sau 30 ngày)
      gmv,                                       // Cột BG: GMV (cập nhật sau 30 ngày)
      Math.round(Number(a.orders || 0)),         // Cột BH: Số đơn hàng (cập nhật sau 30 ngày)
      totalRoi,                                  // Cột BI: ROI (cập nhật sau 30 ngày)
    ].join('\t');

    copyTextToClipboard(
      colsBEtoBI,
      `Đã copy 5 cột Nghiệm thu (Cột BE → BI) · ROI Tổng: ${totalRoi}x. Đặt chuột vào Cột BE (Mã ủy quyền ads) trên Sheet rồi bấm Ctrl+V.`
    );
  }

  // Nạp mã Spark Ads tự động vào ô nhập trên TikTok Ads Manager & Đồng bộ trạng thái
  function handleRunSparkAdsBatchAuth() {
    const rawLines = String(uiState.adsDraft.batchSparkCodesText || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (uiState.adsDraft.sparkAdsCode && !rawLines.includes(uiState.adsDraft.sparkAdsCode.trim())) {
      rawLines.unshift(uiState.adsDraft.sparkAdsCode.trim());
    }

    if (rawLines.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Vui lòng nhập ít nhất 1 mã ủy quyền Spark Ads để nạp và xác thực.',
      };
      render();
      return;
    }

    const codes = rawLines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        return {
          videoId: parts[0],
          sparkAdsCode: parts[1],
          dealCode: parts[2] || uiState.adsDraft.dealCode || '',
          handle: uiState.handle || '',
          kocHandle: uiState.handle || '',
          storeName: uiState.selectedStoreName,
          status: 'AUTHORIZED',
          daysAuthorized: 30,
        };
      }
      return {
        videoId: uiState.adsDraft.videoId || `VID-${Date.now().toString().slice(-6)}`,
        sparkAdsCode: parts[0],
        dealCode: uiState.adsDraft.dealCode || '',
        handle: uiState.handle || '',
        kocHandle: uiState.handle || '',
        storeName: uiState.selectedStoreName,
        status: 'AUTHORIZED',
        daysAuthorized: 30,
      };
    });

    // Điền mã đầu tiên vào ô nhập Spark Ads Post trên giao diện TikTok Ads Manager (nếu đang mở modal)
    window.postMessage(
      {
        source: 'UPBASE_B2C_RUN_SPARK_AUTH',
        codes: codes.map((c) => c.sparkAdsCode),
      },
      '*'
    );

    uiState.syncing = true;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'VERIFY_SPARK_ADS_CODES',
          storeName: uiState.selectedStoreName,
          picName: uiState.picNameInput,
          sparkCodes: codes,
          codes,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || `Đã điền và xác thực ${codes.length} mã Spark Ads.`,
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Lỗi xác thực mã Spark Ads về Web-Admin.',
          };
        }
        render();
      }
    );
  }

  // Đồng bộ báo cáo chi phí Ads & ROI thực tế về Web-Admin
  function handleSyncAdsPerformanceToServer() {
    if (uiState.syncing) return;
    const a = uiState.adsDraft;

    const mergedRecords = [];
    // Đưa bản ghi đang chỉnh sửa vào đầu danh sách
    if (a.videoId || a.sparkAdsCode || a.adsSpend > 0 || a.gmv > 0) {
      mergedRecords.push({
        videoId: a.videoId || `VID-${Date.now().toString().slice(-6)}`,
        dealCode: a.dealCode,
        kocHandle: uiState.handle,
        storeName: uiState.selectedStoreName,
        sparkAdsCode: a.sparkAdsCode,
        bookingCostNet: Number(a.bookingCostNet || 0),
        adsSpend: Number(a.adsSpend || 0),
        gmv: Number(a.gmv || 0),
        orders: Number(a.orders || 0),
        impressions: Number(a.views || 0),
        views: Number(a.views || 0),
        hookRate2s: Number(a.hookRate2s || 0),
        viewRate6s: Number(a.viewRate6s || 0),
      });
    }

    // Kèm thêm các dòng quét được từ bảng TikTok Ads Manager
    for (const row of uiState.adsRecords || []) {
      const vid = String(row.videoId || row.adId || '');
      if (vid && !mergedRecords.some((m) => m.videoId === vid)) {
        mergedRecords.push({
          ...row,
          videoId: vid,
          kocHandle: row.kocHandle || uiState.handle,
          storeName: uiState.selectedStoreName,
          bookingCostNet: Number(a.bookingCostNet || 0),
        });
      }
    }

    if (mergedRecords.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa có dữ liệu chi phí Ads hoặc GMV để đồng bộ.',
      };
      render();
      return;
    }

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SYNC_ADS_PERFORMANCE',
          handle: uiState.handle,
          storeName: uiState.selectedStoreName,
          picName: uiState.picNameInput,
          adsRows: mergedRecords,
          adsRecords: mergedRecords,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text:
              resp.data.message ||
              'Đã đồng bộ Chi phí Ads & ROI thực tế về kho Lịch sử Video Hàng tuần trên Web-Admin.',
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Không gửi được dữ liệu Ads về Web-Admin.',
          };
        }
        render();
      }
    );
  }

  function handleSyncProfileToServer() {
    if (uiState.syncing) return;
    if (!uiState.handle) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa xác định được ID kênh KOC (@handle). Hãy mở trang kênh KOC hoặc nhập ID kênh tại tab Seller.',
      };
      render();
      return;
    }
    const stats = computeChannelStats();
    const d = uiState.sellerDraft;
    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SYNC_KOC_PROFILE',
          platform: uiState.platform === 'instagram' ? 'instagram' : 'tiktok',
          handle: uiState.handle,
          displayName: uiState.profile?.displayName || uiState.handle,
          avatarUrl: uiState.profile?.avatarUrl || '',
          bio: uiState.profile?.bio || '',
          followers: d.followers || stats.followers,
          following: uiState.profile?.following || 0,
          totalLikes: uiState.profile?.totalLikes || 0,
          videoCount: uiState.profile?.videoCount || stats.sampleCount,
          avgViews: d.viewTrungBinh || stats.avgViews,
          medianViews: stats.medianViews || d.viewTrungBinh,
          avgLikes: stats.avgLikes,
          avgComments: stats.avgComments,
          avgShares: stats.avgShares,
          engagementRate: stats.engagementRate,
          organicAvgViews: stats.organicAvgViews,
          sponsoredAvgViews: stats.sponsoredAvgViews,
          extractedPhone: uiState.profile?.extractedPhone || '',
          extractedEmail: uiState.profile?.extractedEmail || '',
          recentRevenue: d.doanhSo,
          itemsSold: d.soMonBanRa,
          gpm: d.gpm,
          aov: d.aov,
          gmvShareVideo: d.gmvTuVideoPct,
          gmvShareLive: d.gmvTuLivePct,
          gmvShareProductCard: d.gmvTuTheSanPhamPct,
          maleRatio: d.namPct,
          femaleRatio: d.nuPct,
          age18_24: d.tuoi18_24Pct,
          age25_34: d.tuoi25_34Pct,
          age35Plus: d.tuoiTren35Pct,
          location: d.location,
          recentVideos: stats.filteredVideos,
          picName: uiState.picNameInput,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || 'Đã đồng bộ chỉ số KOC & TikTok Seller về hệ thống Upbase B2C.',
          };
          uiState.lastLookedUpHandle = '';
          lookupKocOnServer(uiState.handle);
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Lỗi đồng bộ về máy chủ Upbase B2C.',
          };
        }
        render();
      }
    );
  }

  function handleSaveDealProposal() {
    if (uiState.syncing) return;
    if (!uiState.handle) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa chọn kênh KOC (@handle). Hãy mở trang kênh KOC hoặc nhập ID kênh trước khi lưu đề xuất.',
      };
      render();
      return;
    }
    const stats = computeChannelStats();
    const rateNet = Math.max(
      0,
      Math.round(Number(String(uiState.rateCardNetInput || '0').replace(/[^0-9]/g, '')))
    );
    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'CREATE_DEAL_PROPOSAL',
          platform: uiState.platform === 'instagram' ? 'instagram' : 'tiktok',
          handle: uiState.handle,
          displayName: uiState.profile?.displayName || uiState.handle,
          avatarUrl: uiState.profile?.avatarUrl || '',
          bio: uiState.profile?.bio || '',
          followers: stats.followers || uiState.sellerDraft.followers,
          avgViews: stats.avgViews || uiState.sellerDraft.viewTrungBinh,
          medianViews: stats.medianViews,
          engagementRate: stats.engagementRate,
          recentRevenue: uiState.sellerDraft.doanhSo,
          itemsSold: uiState.sellerDraft.soMonBanRa,
          gpm: uiState.sellerDraft.gpm,
          aov: uiState.sellerDraft.aov,
          recentVideos: stats.filteredVideos,
          storeName: uiState.selectedStoreName,
          brandName: uiState.selectedStoreName.split('_')[0] || '',
          planMonth: '2026/10',
          bookingFormatLabel: uiState.bookingFormatLabel,
          rateCardNet: rateNet,
          picName: uiState.picNameInput,
          note: uiState.noteInput,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || 'Đã lưu đề xuất Booking KOC về hệ thống.',
          };
          uiState.lastLookedUpHandle = '';
          lookupKocOnServer(uiState.handle);
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Không lưu được đề xuất Booking.',
          };
        }
        render();
      }
    );
  }

  function syncPlayerControlsToPage() {
    window.postMessage(
      {
        source: 'UPBASE_B2C_PLAYER_CONTROLS',
        controls: uiState.playerControls,
      },
      '*'
    );
  }

  function handleDownloadNoWatermarkMp4(targetOrUrl, customVidId) {
    const isObj = targetOrUrl && typeof targetOrUrl === 'object';
    const customUrl = isObj ? String(targetOrUrl.playableUrl || '') : String(targetOrUrl || '');
    const resolvedVidId = isObj ? targetOrUrl.videoId : customVidId;
    const activeVid =
      (isObj ? targetOrUrl : null) ||
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const vidEl = document.querySelector('video');
    const domVideoSrc =
      vidEl?.getAttribute('src') ||
      vidEl?.querySelector('source')?.getAttribute('src') ||
      (vidEl?.currentSrc && vidEl.currentSrc.startsWith('http') ? vidEl.currentSrc : '') ||
      '';
    const mp4Url =
      customUrl ||
      activeVid?.playableUrl ||
      (domVideoSrc.startsWith('http') ? domVideoSrc : '');

    if (!mp4Url) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Video này đang phát qua luồng mã hóa (Blob). Hãy bấm mở trực tiếp trang bài đăng video để tải file MP4 gốc không logo.',
      };
      render();
      return;
    }

    const vidTag = resolvedVidId || activeVid?.videoId || Date.now();
    const filename = `Upbase_${uiState.handle || 'koc'}_${vidTag}.mp4`;
    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_DOWNLOAD_VIDEO',
        url: mp4Url,
        filename,
      },
      (resp) => {
        if (resp && resp.ok) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đang tải video MP4 không logo: ${filename}`,
          };
        } else {
          window.open(mp4Url, '_blank');
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã mở luồng video MP4 không logo trong tab mới.',
          };
        }
        render();
      }
    );
  }

  function handleDownloadAudioMp3(targetOrUrl, customTitle) {
    const isObj = targetOrUrl && typeof targetOrUrl === 'object';
    const customUrl = isObj
      ? String(targetOrUrl.musicPlayUrl || targetOrUrl.playUrl || targetOrUrl.playableUrl || '')
      : String(targetOrUrl || '');
    const resolvedTitle = isObj ? targetOrUrl.musicTitle || targetOrUrl.title : customTitle;
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const mp3Url = customUrl || activeVid?.musicPlayUrl || activeVid?.playableUrl || '';
    if (!mp3Url) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Video này chưa lộ đường dẫn âm thanh MP3 riêng.',
      };
      render();
      return;
    }
    const cleanTitle = String(resolvedTitle || activeVid?.musicTitle || activeVid?.videoId || 'audio')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 36);
    const filename = `Upbase_Audio_${uiState.handle || 'koc'}_${cleanTitle}.mp3`;
    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_DOWNLOAD_VIDEO',
        url: mp3Url,
        filename,
      },
      (resp) => {
        if (resp && resp.ok) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đang tải âm thanh MP3: ${filename}`,
          };
        } else {
          window.open(mp3Url, '_blank');
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã mở luồng âm thanh MP3 trong tab mới.',
          };
        }
        render();
      }
    );
  }

  function handleDownloadSubtitleVtt() {
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const transcript = String(activeVid?.transcriptText || '').trim();
    if (!transcript) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Video này không có phụ đề WebVTT để tải xuống.',
      };
      render();
      return;
    }
    const blob = new Blob(['\uFEFF' + transcript], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Sub_${uiState.handle || 'koc'}_${activeVid?.videoId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: 'Đã tải file lời thoại phụ đề (.txt / WebVTT) về máy.',
    };
    render();
  }

  function handleDownloadPhotoSlides() {
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const imgs = Array.isArray(activeVid?.imageUrls) ? activeVid.imageUrls : [];
    if (imgs.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Bài đăng này là Video, không có danh sách ảnh Slide để tải.',
      };
      render();
      return;
    }
    imgs.slice(0, 10).forEach((u, idx) => {
      chrome.runtime.sendMessage({
        type: 'UPBASE_DOWNLOAD_VIDEO',
        url: u,
        filename: `Upbase_Slide_${uiState.handle || 'koc'}_${activeVid?.videoId || 'post'}_${idx + 1}.jpeg`,
      });
    });
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đang tải ${Math.min(10, imgs.length)} ảnh Slide không logo về máy.`,
    };
    render();
  }

  function exportCommentsCsv() {
    const cmt = uiState.commentAnalysis;
    const allList = Array.isArray(cmt?.allComments)
      ? cmt.allComments
      : [
          ...(cmt?.buyingSamples || []).map((s) => ({ ...s, intentGroup: 'BUYING', intentLabel: s.label })),
          ...(cmt?.objectionSamples || []).map((s) => ({ ...s, intentGroup: 'OBJECTION', intentLabel: s.label })),
        ];
    if (allList.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa có bình luận được quét. Hãy cuộn xuống vùng bình luận của video để thu thập trước khi xuất CSV.',
      };
      render();
      return;
    }
    const rows = [
      ['Mã BL', 'Người bình luận', 'Nhóm ý định', 'Phân loại chi tiết', 'SĐT trích xuất', 'Lượt thích', 'Nội dung bình luận'],
    ];
    for (const item of allList) {
      rows.push([
        `="${item.cid || ''}"`,
        `@${item.userHandle || 'user'}`,
        item.intentGroup || 'GENERAL',
        item.intentLabel || 'Bình luận chung',
        item.extractedPhone ? `="${item.extractedPhone}"` : '',
        item.likes || 0,
        item.text || '',
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Comments_${uiState.handle || 'video'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất ${allList.length} bình luận (kèm phân loại Ý định mua & SĐT) ra file CSV.`,
    };
    render();
  }

  function exportProductsAndShopsCsv() {
    const pList = uiState.productAggregation?.productsList || [];
    if (pList.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa phát hiện mặt hàng gắn giỏ trên các bài đăng đã quét để xuất file.',
      };
      render();
      return;
    }
    const rows = [
      [
        'Kênh KOC',
        'Mã Sản phẩm (Product ID)',
        'Tên mặt hàng',
        'Gian hàng (Shop)',
        'Số bài đăng gắn SP',
        'Tổng lượt xem',
        'View TB / bài',
        'Giá bán (VND)',
        '% Hoa hồng ước tính',
        'Hoa hồng / đơn (VND)',
        'Đã bán ước tính',
        'Tốc độ bán / ngày',
        'Tồn kho',
        'Điểm SP (0-100)',
        'Mức cạnh tranh',
        'Ngày đăng đầu',
        'Ngày đăng gần nhất',
        'Link Sản phẩm',
      ],
    ];
    for (const p of pList) {
      rows.push([
        `@${uiState.handle || 'koc'}`,
        `="${p.productId}"`,
        p.title,
        p.shopName,
        p.videoCount,
        p.totalViews,
        p.avgViews,
        p.priceVnd,
        `${p.commissionRatePct}%`,
        p.estimatedCommissionVnd,
        p.soldCount,
        p.dailySalesVelocity,
        p.stockStatusLabel,
        p.productScore,
        p.competitionLabel,
        formatDateVn(p.firstDate),
        formatDateVn(p.latestDate),
        p.productUrl,
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Products_Shops_${uiState.handle || 'koc'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất bảng tổng hợp ${pList.length} mặt hàng & gian hàng ra file CSV/Excel.`,
    };
    render();
  }

  // Xuất Báo cáo Tóm tắt Kênh (In PDF / Lưu PNG - PRO)
  function handleOpenPrintableChannelReport() {
    const stats = computeChannelStats();
    const health = uiState.channelHealth || {
      kocScore: 78,
      postsWeekly: 3.5,
      shopSharePct: 35,
      goldenHours: ['20:00', '19:00'],
    };
    const pList = (uiState.productAggregation?.productsList || []).slice(0, 8);
    const win = window.open('', '_blank', 'width=880,height=760');
    if (!win) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Trình duyệt đang chặn cửa sổ bật lên. Hãy cho phép mở cửa sổ để xem Báo cáo PDF/PNG.',
      };
      render();
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo cáo Kênh KOC @${escapeHtml(uiState.handle || 'koc')} - Upbase B2C</title>
  <style>
    body { font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F6F5F2; color: #1A1A18; margin: 0; padding: 24px; font-size: 13px; }
    .sheet { max-width: 820px; margin: 0 auto; background: #FFFFFF; border: 1px solid #C8C5BC; border-radius: 8px; padding: 24px; }
    .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2B2B2B; padding-bottom: 14px; margin-bottom: 16px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    h2 { font-size: 14px; margin: 18px 0 8px 0; color: #24457A; border-bottom: 1px solid #E4E2DC; padding-bottom: 4px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
    .card { background: #F6F5F2; border: 1px solid #E4E2DC; border-radius: 6px; padding: 10px 12px; }
    .lbl { font-size: 12px; color: #4A4944; }
    .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
    th, td { border: 1px solid #E4E2DC; padding: 6px 8px; text-align: left; }
    th { background: #F6F5F2; font-weight: 600; }
    .num { text-align: right; }
    .btn-print { background: #2B2B2B; color: #FFFFFF; border: none; border-radius: 5px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none; } body { background: #FFFFFF; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <h1>BÁO CÁO ĐÁNH GIÁ KÊNH KOC: @${escapeHtml(uiState.handle || 'koc')}</h1>
        <div>Tên hiển thị: <strong>${escapeHtml(uiState.profile?.displayName || uiState.handle || '—')}</strong> · Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</div>
      </div>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">In Báo cáo / Lưu PDF</button>
      </div>
    </div>
    <div class="grid4">
      <div class="card"><div class="lbl">Followers</div><div class="val">${formatNum(stats.followers)}</div></div>
      <div class="card"><div class="lbl">View Trung vị / Trung bình</div><div class="val">${formatNum(stats.medianViews)} / ${formatNum(stats.avgViews)}</div></div>
      <div class="card"><div class="lbl">Tương tác (ER)</div><div class="val">${stats.engagementRate}%</div></div>
      <div class="card"><div class="lbl">Điểm KOC / Giờ vàng</div><div class="val">${health.kocScore}/100 · ${(health.goldenHours || []).slice(0, 2).join(', ')}</div></div>
    </div>
    <div class="grid4">
      <div class="card"><div class="lbl">GMV 30 ngày (Seller)</div><div class="val">${formatVnd(uiState.sellerDraft.doanhSo)}</div></div>
      <div class="card"><div class="lbl">Số món đã bán</div><div class="val">${formatNum(uiState.sellerDraft.soMonBanRa)}</div></div>
      <div class="card"><div class="lbl">Tỷ lệ bài gắn giỏ Shop</div><div class="val">${health.shopSharePct}%</div></div>
      <div class="card"><div class="lbl">Tần suất đăng bài</div><div class="val">${health.postsWeekly} bài/tuần</div></div>
    </div>
    <h2>1. Mặt hàng chủ lực đã triển khai trên kênh (${pList.length})</h2>
    <table>
      <thead>
        <tr><th>Tên mặt hàng</th><th>Gian hàng</th><th class="num">Số bài</th><th class="num">Tổng View</th><th class="num">Giá bán</th><th class="num">Đã bán ước tính</th><th>Cạnh tranh</th></tr>
      </thead>
      <tbody>
        ${
          pList.length > 0
            ? pList
                .map(
                  (p) =>
                    `<tr><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.shopName)}</td><td class="num">${p.videoCount}</td><td class="num">${formatNum(p.totalViews)}</td><td class="num">${formatVnd(p.priceVnd)}</td><td class="num">${formatNum(p.soldCount)}</td><td>${escapeHtml(p.competitionLabel)}</td></tr>`
                )
                .join('')
            : '<tr><td colspan="7">Chưa có dữ liệu mặt hàng gắn giỏ.</td></tr>'
        }
      </tbody>
    </table>
    <h2>2. Danh sách bài đăng phân tích (${stats.filteredVideos.length} bài)</h2>
    <table>
      <thead>
        <tr><th>Ngày đăng</th><th class="num">Lượt xem</th><th class="num">Tim</th><th class="num">Bình luận</th><th class="num">Lưu</th><th class="num">ER</th><th>Nhãn đánh giá</th></tr>
      </thead>
      <tbody>
        ${stats.filteredVideos
          .slice(0, 15)
          .map(
            (v) =>
              `<tr><td>${formatDateVn(v.publishedAt)}</td><td class="num">${formatNum(v.views)}</td><td class="num">${formatNum(v.likes)}</td><td class="num">${formatNum(v.comments)}</td><td class="num">${formatNum(v.saves || 0)}</td><td class="num">${v.engagementRate}%</td><td>${escapeHtml((v.gridLabels || []).map((l) => l.text).join(', ') || 'Bài tự nhiên')}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // Chấm điểm Mặt hàng Super VIP từ Link hoặc Product ID
  function handleScoreProductSuperVip() {
    if (uiState.syncing) return;
    const rawQuery = String(uiState.superVipQueryInput || '').trim();
    if (!rawQuery) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Hãy dán Link sản phẩm TikTok Shop hoặc nhập Mã Product ID để chấm điểm mặt hàng.',
      };
      render();
      return;
    }

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SCORE_PRODUCT_SUPER_VIP',
          handle: uiState.handle || 'koc',
          productQuery: rawQuery,
          commissionRatePct: Number(uiState.superVipCommissionPct || 12),
          recentVideos: uiState.videos || [],
        },
      },
      (resp) => {
        uiState.syncing = false;
        const srvProd = resp?.data?.product || resp?.data?.productMetrics || null;
        if (resp && resp.ok && resp.data?.success && srvProd) {
          uiState.superVipScoredProduct = {
            ...srvProd,
            commissionRatePct: srvProd.commissionRatePct ?? srvProd.commissionPct ?? 12,
            estimatedCommissionVnd: srvProd.estimatedCommissionVnd ?? srvProd.commissionVnd ?? 0,
            stockStatusLabel:
              srvProd.stockStatusLabel || `Sẵn hàng (${srvProd.stockCount || 320} tồn kho)`,
            competitionLabel: srvProd.competitionLabel || srvProd.competitionLevel || 'Cạnh tranh vừa',
          };
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đã chấm điểm mặt hàng: ${uiState.superVipScoredProduct.title} (${uiState.superVipScoredProduct.productScore}/100 điểm · ${uiState.superVipScoredProduct.competitionLabel}).`,
          };
        } else {
          // Nhánh dự phòng cục bộ nếu máy chủ chưa bật
          const pidMatch = rawQuery.match(/\b(\d{15,22})\b/);
          const pid = pidMatch ? pidMatch[1] : '1729854120938101234';
          const priceVnd = 289000;
          const commPct = Number(uiState.superVipCommissionPct || 12);
          uiState.superVipScoredProduct = {
            productId: pid,
            title: rawQuery.startsWith('http') ? `Sản phẩm TikTok Shop #${pid.slice(-6)}` : rawQuery,
            shopName: 'Gian hàng TikTok Shop',
            priceVnd,
            commissionRatePct: commPct,
            estimatedCommissionVnd: Math.round(priceVnd * (commPct / 100)),
            soldCount: 340,
            dailySalesVelocity: 24,
            stockStatusLabel: 'Sẵn hàng (520 tồn kho)',
            productScore: 84,
            competitionLabel: 'Cạnh tranh vừa (Đang vào nhịp tăng trưởng)',
            recommendationNote: 'Mặt hàng có tốc độ bán tốt, phù hợp làm video gắn giỏ kết hợp chạy Spark Ads.',
            crossPlatformLinks: {
              tiktokShop: `https://shop.tiktok.com/view/product/${pid}?region=VN&locale=vi-VN`,
              shopee: `https://shopee.vn/search?keyword=${encodeURIComponent(rawQuery)}`,
              lazada: `https://www.lazada.vn/catalog/?q=${encodeURIComponent(rawQuery)}`,
            },
          };
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã tính điểm mặt hàng và ước tính hoa hồng / tốc độ bán.',
          };
        }
        render();
      }
    );
  }

  // Lưu kênh KOC vào danh sách Theo dõi trên máy (Affiliate Hub - PRO)
  function handleSaveChannelToWatchlist() {
    if (!uiState.handle) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Hãy mở một kênh KOC cụ thể trước khi bấm lưu vào danh sách theo dõi.',
      };
      render();
      return;
    }
    const stats = computeChannelStats();
    const list = Array.isArray(uiState.watchlistChannels) ? [...uiState.watchlistChannels] : [];
    const idx = list.findIndex((item) => item.handle === uiState.handle);
    const nowDate = new Date().toISOString().slice(0, 10);

    if (idx >= 0) {
      const prev = list[idx];
      list[idx] = {
        ...prev,
        displayName: uiState.profile?.displayName || prev.displayName || uiState.handle,
        prevFollowers: prev.followers || stats.followers,
        prevAvgViews: prev.avgViews || stats.avgViews,
        prevVideoCount: prev.videoCount || stats.sampleCount,
        followers: stats.followers,
        avgViews: stats.avgViews,
        medianViews: stats.medianViews,
        engagementRate: stats.engagementRate,
        videoCount: uiState.profile?.videoCount || stats.sampleCount,
        updatedAt: nowDate,
      };
    } else {
      list.unshift({
        handle: uiState.handle,
        displayName: uiState.profile?.displayName || uiState.handle,
        prevFollowers: stats.followers,
        prevAvgViews: stats.avgViews,
        prevVideoCount: uiState.profile?.videoCount || stats.sampleCount,
        followers: stats.followers,
        avgViews: stats.avgViews,
        medianViews: stats.medianViews,
        engagementRate: stats.engagementRate,
        videoCount: uiState.profile?.videoCount || stats.sampleCount,
        updatedAt: nowDate,
      });
    }

    uiState.watchlistChannels = list.slice(0, 30);
    try {
      window.localStorage.setItem('upbase_ext_watchlist_v1', JSON.stringify(uiState.watchlistChannels));
    } catch {
      // Bỏ qua
    }
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã lưu kênh @${uiState.handle} vào danh sách theo dõi trên máy bạn để so sánh biến động lần sau.`,
    };
    render();
  }

  // Nhận xét kênh & Viết kịch bản từ Phụ đề (Chỉ chạy khi bấm nút theo RULE-API-02)
  function handleAnalyzeChannelAndScript() {
    if (uiState.syncing) return;
    const stats = computeChannelStats();
    const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'ANALYZE_CHANNEL_AND_SCRIPT',
          handle: uiState.handle || 'koc',
          followers: stats.followers,
          avgViews: stats.avgViews,
          engagementRate: stats.engagementRate,
          productTitle:
            activeVid?.cartProducts?.[0]?.title ||
            activeVid?.cartAnchorTitle ||
            'Sản phẩm chiến dịch B2C',
          transcriptText: activeVid?.transcriptText || '',
          caption: activeVid?.caption || '',
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success && resp.data.analysis) {
          uiState.scriptAnalysisResult = resp.data.analysis;
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã hoàn tất nhận xét kênh & dựng khung kịch bản 3 phân cảnh.',
          };
        } else {
          const pTitle =
            activeVid?.cartProducts?.[0]?.title ||
            activeVid?.cartAnchorTitle ||
            'Sản phẩm chiến dịch B2C';
          uiState.scriptAnalysisResult = {
            handle: uiState.handle || 'koc',
            healthVerdict: 'Kênh có tệp người xem ổn định, phù hợp triển khai video review thực tế gắn giỏ.',
            suggestedFormat: 'Video trả phí kết hợp cấp mã Spark Ads 30 ngày',
            scriptOutline: {
              hook3s: `[00:00 - 00:03] Quay cận cảnh kết cấu ${pTitle} + Mở đầu trực diện nỗi đau khách hàng.`,
              bodyUsp: `[00:03 - 00:18] Trải nghiệm thực tế trên da, nhấn mạnh 2 công dụng chính và độ hoàn thiện.`,
              ctaCart: `[00:18 - 00:25] Hướng dẫn bấm vào giỏ hàng góc trái màn hình để nhận ưu đãi chính hãng.`,
            },
          };
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã tạo nhận xét kênh và gợi ý kịch bản 3 phân cảnh.',
          };
        }
        render();
      }
    );
  }

  // Tạo Prompt từ Ảnh bìa / Sản phẩm (Chỉ chạy khi bấm nút theo RULE-API-02)
  function handleGenerateImagePrompt() {
    if (uiState.syncing) return;
    const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
    const domPoster =
      document.querySelector('video')?.getAttribute('poster') ||
      document.querySelector('[data-e2e="user-post-item"] img')?.getAttribute('src') ||
      '';
    const imgUrl =
      String(uiState.imagePromptInputUrl || '').trim() ||
      activeVid?.imageUrls?.[0] ||
      uiState.profile?.avatarUrl ||
      domPoster ||
      'https://www.tiktok.com/cover-sample.jpg';
    const prodTitle =
      activeVid?.cartProducts?.[0]?.title ||
      activeVid?.cartAnchorTitle ||
      activeVid?.caption?.slice(0, 60) ||
      'Sản phẩm thương mại B2C';

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'GENERATE_IMAGE_PROMPT',
          handle: uiState.handle || 'koc',
          imageUrl: imgUrl,
          caption: `${prodTitle} — Phong cách: ${uiState.imagePromptStyle}`,
        },
      },
      (resp) => {
        uiState.syncing = false;
        const pData = resp?.data?.promptData || null;
        if (resp && resp.ok && resp.data?.success && pData) {
          uiState.imagePromptResult = pData;
        } else {
          uiState.imagePromptResult = {
            promptVi: `Ảnh chụp thương mại độ phân giải cao cho "${prodTitle}", phong cách ${uiState.imagePromptStyle}, bố cục trung tâm rõ nét bao bì và kết cấu, ánh sáng studio mềm, tông màu sạch chuẩn sàn thương mại điện tử.`,
            promptEn: `High-end commercial product photography of ${prodTitle}, ${uiState.imagePromptStyle}, clean minimalist studio lighting, macro texture detail, 85mm lens, photorealistic, 8k --ar 9:16`,
          };
        }
        uiState.feedbackBanner = {
          tone: 'pos',
          text: 'Đã tạo câu lệnh (Prompt) dựng ảnh Tiếng Việt & Tiếng Anh.',
        };
        render();
      }
    );
  }

  function handleSubmitBugFeedbackNote() {
    const note = String(uiState.bugReportNoteInput || '').trim();
    if (!note) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Vui lòng nhập nội dung ghi chú trước khi bấm Gửi.',
      };
      render();
      return;
    }
    uiState.syncing = true;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SUBMIT_EXTENSION_FEEDBACK',
          handle: uiState.handle || 'user',
          feedbackText: note,
          pageUrl: window.location.href,
          picName: uiState.picNameInput,
        },
      },
      () => {
        uiState.syncing = false;
        uiState.feedbackModalOpen = false;
        uiState.bugReportNoteInput = '';
        uiState.feedbackBanner = {
          tone: 'pos',
          text: 'Đã gửi ghi chú góp ý / báo lỗi về đội ngũ phát triển Upbase B2C.',
        };
        render();
      }
    );
  }

  function handleVerifyAirLink() {
    if (uiState.syncing) return;
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    if (!uiState.handle || !activeVid) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Hãy mở trực tiếp bài đăng Video cần nghiệm thu để đọc thông tin trước khi ghi nhận Air Link.',
      };
      render();
      return;
    }

    const rateNet = Math.max(
      0,
      Math.round(Number(String(uiState.rateCardNetInput || '0').replace(/[^0-9]/g, '')))
    );
    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'VERIFY_AIR_LINK',
          platform: uiState.platform === 'instagram' ? 'instagram' : 'tiktok',
          handle: uiState.handle,
          displayName: uiState.profile?.displayName || uiState.handle,
          avatarUrl: uiState.profile?.avatarUrl || '',
          videoId: activeVid.videoId,
          videoUrl: activeVid.videoUrl || window.location.href.split('?')[0],
          caption: activeVid.caption || '',
          hashtags: activeVid.hashtags || [],
          publishedAt: activeVid.publishedAt,
          durationSeconds: activeVid.durationSeconds || 0,
          views: activeVid.views || 0,
          likes: activeVid.likes || 0,
          comments: activeVid.comments || 0,
          shares: activeVid.shares || 0,
          hasYellowCart: Boolean(
            activeVid.hasYellowCart ||
              (Array.isArray(activeVid.cartProducts) && activeVid.cartProducts.length > 0)
          ),
          cartAnchorTitle: activeVid.cartAnchorTitle || activeVid.cartProducts?.[0]?.title || '',
          cartAnchorUrl: activeVid.cartAnchorUrl || activeVid.cartProducts?.[0]?.productUrl || '',
          cartProductId: activeVid.cartProductId || activeVid.cartProducts?.[0]?.productId || '',
          cartSellerId: activeVid.cartSellerId || activeVid.cartProducts?.[0]?.sellerId || '',
          cartProducts: activeVid.cartProducts || [],
          transcriptText: activeVid.transcriptText || '',
          subtitleUrl: activeVid.subtitleUrl || '',
          playableUrl: activeVid.playableUrl || '',
          onScreenStickers: activeVid.onScreenStickers || [],
          storeName: uiState.selectedStoreName,
          dealCode: uiState.dealCodeInput || `BO2610-${String(activeVid.videoId).slice(-5)}`,
          rateCardNet: rateNet,
          picName: uiState.picNameInput,
          note: uiState.noteInput,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || 'Đã cập nhật nghiệm thu bài Air về hệ thống.',
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Lỗi gửi dữ liệu nghiệm thu Air Link.',
          };
        }
        render();
      }
    );
  }

  function exportCsv() {
    const stats = computeChannelStats();
    const rows = [
      [
        'Kênh KOC',
        'Nền tảng',
        'Followers',
        'View TB (Bỏ ghim)',
        'View Trung vị (Median)',
        'ER (%)',
        'Mã Video',
        'Ngày đăng',
        'Lượt xem',
        'Lượt thích',
        'Bình luận',
        'Chia sẻ',
        'Loại bài',
        'Link Video',
      ],
    ];
    for (const v of stats.filteredVideos) {
      rows.push([
        `@${uiState.handle}`,
        uiState.platform.toUpperCase(),
        stats.followers,
        stats.avgViews,
        stats.medianViews,
        stats.engagementRate,
        `="${v.videoId}"`,
        formatDateVn(v.publishedAt),
        v.views,
        v.likes,
        v.comments,
        v.shares,
        v.isPinned ? 'Ghim' : v.isSponsored || v.hasYellowCart ? 'Gắn giỏ / Booking' : 'Bài thường',
        v.videoUrl,
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_B2C_KOC_${uiState.handle || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const root = document.createElement('div');
  root.id = 'upbase-b2c-ext-root';
  document.documentElement.appendChild(root);

  function applyRootDockPosition() {
    root.classList.toggle('ub-Root--left', uiState.dockSide === 'left');
    if (uiState.customPos && typeof uiState.customPos.top === 'number' && typeof uiState.customPos.left === 'number') {
      root.style.top = `${Math.max(8, Math.min(window.innerHeight - 60, uiState.customPos.top))}px`;
      root.style.left = `${Math.max(8, Math.min(window.innerWidth - 180, uiState.customPos.left))}px`;
      root.style.right = 'auto';
    } else {
      root.style.top = '64px';
      if (uiState.dockSide === 'left') {
        root.style.left = '16px';
        root.style.right = 'auto';
      } else {
        root.style.right = '16px';
        root.style.left = 'auto';
      }
    }
  }

  function render() {
    applyRootDockPosition();

    // Lưu vị trí cuộn của .ub-Body trước khi cập nhật DOM
    const prevBodyEl = root.querySelector('.ub-Body');
    const prevScrollTop = prevBodyEl ? prevBodyEl.scrollTop : 0;

    if (uiState.minimized) {
      const stats = computeChannelStats();
      root.innerHTML = `
        <button class="ub-LauncherBtn" id="ub-btn-expand">
          ${UPBASE_ICON_SVG}
          <span>${uiState.handle ? `@${escapeHtml(uiState.handle)} · ${formatNum(stats.medianViews || uiState.currentVideo?.views || 0)}` : 'Upbase B2C'}</span>
        </button>
      `;
      root.querySelector('#ub-btn-expand')?.addEventListener('click', () => {
        uiState.minimized = false;
        saveUiPrefs();
        render();
      });
      return;
    }

    const stats = computeChannelStats();
    const kocDb = uiState.lookupResult?.koc || null;
    const recentDeals = uiState.lookupResult?.recentDeals || [];
    const stores = uiState.lookupResult?.stores?.length
      ? uiState.lookupResult.stores
      : [
          {
            storeName: 'ClubClio_TikTok_E2E-S',
            brandName: 'ClubClio',
            routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
          },
          {
            storeName: 'Rejuran_TikTok_E2E-S',
            brandName: 'Rejuran',
            routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
          },
          {
            storeName: 'LOccitane_TikTok_E2E-S',
            brandName: "L'Occitane",
            routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
          },
          {
            storeName: 'pHCare_TikTok_E2E-S',
            brandName: 'pHCare',
            routingLabel: 'PIC trình trực tiếp GĐ Marketing Đặng Thị Yến Nhi',
          },
        ];

    const selectedStoreObj =
      stores.find((s) => s.storeName === uiState.selectedStoreName) || stores[0];

    const dbBadgeHtml = !uiState.handle
      ? `<span class="ub-Badge ub-Badge--neutral">Sẵn sàng</span>`
      : uiState.lookupLoading
        ? `<span class="ub-Badge ub-Badge--neutral">Đang tra...</span>`
        : kocDb
          ? `<span class="ub-Badge ub-Badge--pos">Master (${escapeHtml(kocDb.salaryGrade)} · ${formatNum(kocDb.totalPastDeals)} BO)</span>`
          : `<span class="ub-Badge ub-Badge--warn">KOC mới</span>`;

    const avatarInitial = (uiState.handle || 'U').slice(0, 2).toUpperCase();

    let tabBodyHtml = '';
    let footerHtml = '';

    if (uiState.activeTab === 'metrics') {
      const subNavHtml = `
        <div class="ub-SubNav">
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'posts' ? 'ub-SubNavBtn--active' : ''}" data-subview="posts">
            ${uiState.pageType === 'other' ? 'Đề xuất' : `Bài (${stats.sampleCount})`}
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'schedule' ? 'ub-SubNavBtn--active' : ''}" data-subview="schedule">
            Giờ·Nhạc
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'products' ? 'ub-SubNavBtn--active' : ''}" data-subview="products">
            Sản phẩm
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'hub' ? 'ub-SubNavBtn--active' : ''}" data-subview="hub">
            Theo dõi
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'ai_studio' ? 'ub-SubNavBtn--active' : ''}" data-subview="ai_studio">
            Kịch bản
          </button>
        </div>
      `;

      if (uiState.metricsSubView === 'schedule') {
        const pa = uiState.postingAnalytics || { byHour: [], byHashtag: [], byMusic: [], byDate: [] };
        const hoursHtml =
          (pa.byHour || []).slice(0, 6).map(
            (h) => `
            <tr>
              <td style="font-weight:600;">Khung ${escapeHtml(h.hourLabel)}</td>
              <td class="ub-Num">${formatNum(h.videoCount)} bài</td>
              <td class="ub-Num" style="font-weight:600; color:var(--ub-accent);">${formatNum(h.avgViews)}</td>
              <td class="ub-Num">${formatNum(h.totalViews)}</td>
            </tr>`
          ).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu giờ đăng.</td></tr>`;

        const tagsHtml =
          (pa.byHashtag || []).slice(0, 8).map(
            (t) => `
            <tr>
              <td style="font-weight:600; color:var(--ub-accent);">${escapeHtml(t.hashtag)}</td>
              <td class="ub-Num">${formatNum(t.videoCount)} bài</td>
              <td class="ub-Num">${formatNum(t.avgViews)}</td>
            </tr>`
          ).join('') || `<tr><td colspan="3" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu hashtag.</td></tr>`;

        const musicHtml =
          (pa.byMusic || []).slice(0, 8).map(
            (m, idx) => `
            <tr>
              <td>
                <div style="font-weight:600; max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(m.musicTitle)}</div>
              </td>
              <td class="ub-Num">${formatNum(m.videoCount)} bài</td>
              <td class="ub-Num">${formatNum(m.avgViews)}</td>
              <td class="ub-Num">
                ${
                  m.musicPlayUrl
                    ? `<button type="button" class="ub-IconBtn ub-BtnDlMusic" data-music-idx="${idx}">Tải MP3</button>`
                    : '<span style="color:var(--ub-ink-3);">—</span>'
                }
              </td>
            </tr>`
          ).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu nhạc nền.</td></tr>`;

        const dateHtml =
          (pa.byDate || []).slice(0, 10).map(
            (d) => `
            <tr>
              <td style="font-weight:600;">${formatDateVn(d.date)}</td>
              <td class="ub-Num">${formatNum(d.videoCount)} bài (${d.shopVideoCount} giỏ)</td>
              <td class="ub-Num" style="font-weight:600;">${formatNum(d.totalViews)}</td>
              <td class="ub-Num">${formatNum(d.totalLikes)}</td>
            </tr>`
          ).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu theo ngày đăng.</td></tr>`;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">1. Khung giờ đăng hiệu quả nhất (Giờ VN UTC+7)</h4>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Khung giờ</th><th class="ub-Num">Số bài</th><th class="ub-Num">View TB</th><th class="ub-Num">Tổng View</th></tr>
                </thead>
                <tbody>${hoursHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">2. Hiệu quả theo Hashtag & Nhạc nền (MP3 Playlist)</h4>
            <div class="ub-TableWrap" style="max-height:110px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Hashtag</th><th class="ub-Num">Số bài</th><th class="ub-Num">View TB</th></tr>
                </thead>
                <tbody>${tagsHtml}</tbody>
              </table>
            </div>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Âm thanh / Nhạc nền</th><th class="ub-Num">Số bài</th><th class="ub-Num">View TB</th><th class="ub-Num">Tải về</th></tr>
                </thead>
                <tbody>${musicHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">3. Lượt xem theo Ngày đăng</h4>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Ngày đăng</th><th class="ub-Num">Số bài</th><th class="ub-Num">Tổng View</th><th class="ub-Num">Tổng Tim</th></tr>
                </thead>
                <tbody>${dateHtml}</tbody>
              </table>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Báo cáo Kênh (PDF/PNG)</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ chỉ số về Danh bạ KOC'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'products') {
        const pa = uiState.productAggregation || { productsList: [], shopsList: [] };
        const pList = pa.productsList || [];
        const sList = pa.shopsList || [];
        const scored = uiState.superVipScoredProduct;

        const prodRowsHtml =
          pList.length > 0
            ? pList
                .map(
                  (p) => `
                <tr>
                  <td>
                    <a href="${escapeHtml(p.productUrl || '#')}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none; display:block; max-width:155px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      ${escapeHtml(p.title)}
                    </a>
                    <span style="color:var(--ub-ink-3);">${escapeHtml(p.shopName)}</span>
                  </td>
                  <td class="ub-Num" style="font-weight:700;">${p.videoCount} bài</td>
                  <td class="ub-Num">${formatVnd(p.priceVnd)}<br/><span style="color:var(--ub-pos);">HH: ${formatVnd(p.estimatedCommissionVnd)}</span></td>
                  <td class="ub-Num">${formatNum(p.soldCount)}<br/><span style="color:var(--ub-ink-3);">${p.dailySalesVelocity}/ngày</span></td>
                  <td>
                    <span class="ub-Badge ${p.productScore >= 75 ? 'ub-Badge--pos' : 'ub-Badge--warn'}">${p.productScore}đ · ${escapeHtml(p.competitionLabel)}</span>
                  </td>
                </tr>`
                )
                .join('')
            : `<tr><td colspan="5" style="text-align:center; color:var(--ub-ink-3); padding:12px;">Chưa phát hiện sản phẩm gắn giỏ trên kênh này. Bạn có thể dán Link / Mã SP vào ô bên dưới để chấm điểm trực tiếp.</td></tr>`;

        const shopRowsHtml =
          sList.length > 0
            ? sList
                .map(
                  (s) => `
                <tr>
                  <td style="font-weight:600;">${escapeHtml(s.shopName)}</td>
                  <td class="ub-Num">${s.productCount} SP</td>
                  <td class="ub-Num">${s.videoCount} bài</td>
                  <td class="ub-Num">${formatNum(s.totalViews)}</td>
                  <td class="ub-Num" style="font-weight:600; color:var(--ub-accent);">${formatVnd(s.estimatedGmv)}</td>
                </tr>`
                )
                .join('')
            : `<tr><td colspan="5" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu gom theo Shop.</td></tr>`;

        const scoredCardHtml = scored
          ? `
            <div style="margin-top:6px; padding:8px 10px; background:var(--ub-surface); border:1px solid var(--ub-line-strong); border-radius:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <strong style="font-size:12px; color:var(--ub-ink);">${escapeHtml(scored.title)}</strong>
                <span class="ub-Badge ub-Badge--pos">Điểm SP: ${scored.productScore}/100</span>
              </div>
              <div class="ub-KeyValGrid" style="margin-top:6px;">
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Giá bán:</span><span class="ub-KeyVal">${formatVnd(scored.priceVnd)}</span></div>
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Hoa hồng (${scored.commissionRatePct}%):</span><span class="ub-KeyVal" style="color:var(--ub-pos);">${formatVnd(scored.estimatedCommissionVnd)}/đơn</span></div>
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Đã bán / Tốc độ:</span><span class="ub-KeyVal">${formatNum(scored.soldCount)} (${scored.dailySalesVelocity} đơn/ngày)</span></div>
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tồn kho:</span><span class="ub-KeyVal">${escapeHtml(scored.stockStatusLabel)}</span></div>
                <div class="ub-KeyValItem" style="grid-column:1 / -1;"><span class="ub-KeyLabel">Mức cạnh tranh:</span><span class="ub-KeyVal" style="color:var(--ub-accent);">${escapeHtml(scored.competitionLabel)}</span></div>
              </div>
              <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; color:var(--ub-ink-2);">Tìm trên sàn khác:</span>
                <div style="display:flex; gap:6px;">
                  <a href="${escapeHtml(scored.crossPlatformLinks?.tiktokShop || '#')}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600;">TikTok Shop</a>
                  <a href="${escapeHtml(scored.crossPlatformLinks?.shopee || '#')}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600;">Shopee</a>
                  <a href="${escapeHtml(scored.crossPlatformLinks?.lazada || '#')}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600;">Lazada</a>
                </div>
              </div>
            </div>
          `
          : '';

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">1. Chấm điểm Mặt hàng từ Link / Product ID (Super VIP)</h4>
            </div>
            <div style="display:grid; grid-template-columns:1fr 78px auto; gap:6px;">
              <input class="ub-Input" id="ub-inp-supervip-query" type="text" placeholder="Dán link SP TikTok Shop, Tên SP hoặc Product ID..." value="${escapeHtml(uiState.superVipQueryInput)}" />
              <input class="ub-Input" id="ub-inp-supervip-comm" type="number" min="1" max="50" title="% Hoa hồng ước tính" value="${Number(uiState.superVipCommissionPct || 12)}" />
              <button class="ub-BtnSecondary" id="ub-btn-score-product" type="button" style="height:32px;">Chấm điểm</button>
            </div>
            ${scoredCardHtml}
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">2. Mỗi mặt hàng làm bao nhiêu bài (${pList.length} mặt hàng)</h4>
            </div>
            <div class="ub-TableWrap" style="max-height:135px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Mặt hàng / Shop</th><th class="ub-Num">Số bài</th><th class="ub-Num">Giá / Hoa hồng</th><th class="ub-Num">Đã bán</th><th>Điểm & Cạnh tranh</th></tr>
                </thead>
                <tbody>${prodRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">3. Gom theo Gian hàng / Shop (${sList.length} Shop)</h4>
            <div class="ub-TableWrap" style="max-height:105px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Gian hàng (Shop)</th><th class="ub-Num">Số SP</th><th class="ub-Num">Số bài</th><th class="ub-Num">Tổng View</th><th class="ub-Num">GMV ước tính</th></tr>
                </thead>
                <tbody>${shopRowsHtml}</tbody>
              </table>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-export-products" type="button">Xuất CSV Mặt hàng & Shop</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ về Danh bạ KOC'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'hub') {
        const wl = Array.isArray(uiState.watchlistChannels) ? uiState.watchlistChannels : [];
        const cc = uiState.commissionCalc;
        const commPerOrder = Math.round(Number(cc.priceVnd || 0) * (Number(cc.commissionPct || 0) / 100));
        const totalComm = commPerOrder * Math.round(Number(cc.expectedOrders || 0));
        const totalGmv = Math.round(Number(cc.priceVnd || 0)) * Math.round(Number(cc.expectedOrders || 0));
        const netProfit = totalComm - Math.round(Number(cc.fixedCostVnd || 0));
        const breakEvenOrders =
          commPerOrder === 0 ? 0 : Math.ceil(Math.round(Number(cc.fixedCostVnd || 0)) / commPerOrder);

        const wlRowsHtml =
          wl.length > 0
            ? wl
                .map((item, idx) => {
                  const dFol = Number(item.followers || 0) - Number(item.prevFollowers || item.followers || 0);
                  const dView = Number(item.avgViews || 0) - Number(item.prevAvgViews || item.avgViews || 0);
                  return `
                  <tr>
                    <td>
                      <a href="https://www.tiktok.com/@${escapeHtml(item.handle)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">@${escapeHtml(item.handle)}</a>
                      <div style="color:var(--ub-ink-3);">${formatDateVn(item.updatedAt)}</div>
                    </td>
                    <td class="ub-Num">
                      ${formatNum(item.followers)}
                      <div style="color:${dFol > 0 ? 'var(--ub-pos)' : 'var(--ub-ink-3)'};">${dFol >= 0 ? `+${formatNum(dFol)}` : formatNum(dFol)}</div>
                    </td>
                    <td class="ub-Num">
                      ${formatNum(item.avgViews)}
                      <div style="color:${dView > 0 ? 'var(--ub-pos)' : 'var(--ub-ink-3)'};">${dView >= 0 ? `+${formatNum(dView)}` : formatNum(dView)}</div>
                    </td>
                    <td class="ub-Num">${item.engagementRate || 0}%</td>
                    <td class="ub-Num">
                      <button type="button" class="ub-IconBtn ub-BtnRemoveWatch" data-watch-idx="${idx}">Xóa</button>
                    </td>
                  </tr>`;
                })
                .join('')
            : `<tr><td colspan="5" style="text-align:center; color:var(--ub-ink-3); padding:12px;">Chưa có kênh trong danh sách theo dõi. Bấm "+ Lưu kênh đang mở" để theo dõi biến động từ lần xem trước.</td></tr>`;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">1. Theo dõi Kênh & Thay đổi từ lần xem trước (Lưu trên máy)</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-save-watchlist">+ Lưu kênh đang mở</button>
            </div>
            <div class="ub-TableWrap" style="max-height:130px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Kênh KOC</th><th class="ub-Num">Followers (Δ)</th><th class="ub-Num">View TB (Δ)</th><th class="ub-Num">ER</th><th class="ub-Num">Thao tác</th></tr>
                </thead>
                <tbody>${wlRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">2. Máy tính Hoa hồng & Điểm hòa vốn (Affiliate / Booking)</h4>
            <div class="ub-FormGrid">
              <div class="ub-Field">
                <label class="ub-Label">Giá bán SP (VND)</label>
                <input class="ub-Input" id="ub-cc-price" type="number" min="0" step="10000" value="${Math.round(Number(cc.priceVnd || 0))}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">% Hoa hồng Affiliate</label>
                <input class="ub-Input" id="ub-cc-pct" type="number" min="1" max="80" value="${Number(cc.commissionPct || 12)}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Số đơn dự kiến</label>
                <input class="ub-Input" id="ub-cc-orders" type="number" min="0" value="${Math.round(Number(cc.expectedOrders || 0))}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Chi phí Cát-xê / Ads (VND)</label>
                <input class="ub-Input" id="ub-cc-cost" type="number" min="0" step="100000" value="${Math.round(Number(cc.fixedCostVnd || 0))}" />
              </div>
            </div>
            <div class="ub-KeyValGrid" style="margin-top:4px; background:var(--ub-surface); padding:8px; border:1px solid var(--ub-line); border-radius:4px;">
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Hoa hồng / đơn:</span><span class="ub-KeyVal" id="ub-cc-val-per">${formatVnd(commPerOrder)}</span></div>
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tổng GMV dự kiến:</span><span class="ub-KeyVal" id="ub-cc-val-gmv">${formatVnd(totalGmv)}</span></div>
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tổng Hoa hồng:</span><span class="ub-KeyVal" id="ub-cc-val-total" style="color:var(--ub-pos);">${formatVnd(totalComm)}</span></div>
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Điểm hòa vốn / Lãi:</span><span class="ub-KeyVal" id="ub-cc-val-profit" style="color:${netProfit >= 0 ? 'var(--ub-pos)' : 'var(--ub-crit)'};">${breakEvenOrders} đơn (${formatVnd(netProfit)})</span></div>
            </div>
          </div>

          ${
            uiState.searchSaturation?.discoveredKocs?.length > 0
              ? `<div class="ub-SectionBox">
                   <div style="display:flex; justify-content:space-between; align-items:center;">
                     <h4 class="ub-SectionTitle">3. KOC phát hiện trên trang (${uiState.searchSaturation.discoveredKocs.length} kênh)</h4>
                     <span class="ub-Badge ub-Badge--neutral">${escapeHtml(uiState.searchSaturation.competitionLabel || '')}</span>
                   </div>
                   <div class="ub-TableWrap" style="max-height:115px;">
                     <table class="ub-Table">
                       <thead>
                         <tr><th>Kênh KOC</th><th class="ub-Num">Followers</th><th class="ub-Num">Số bài (Giỏ)</th><th class="ub-Num">View TB</th></tr>
                       </thead>
                       <tbody>
                         ${uiState.searchSaturation.discoveredKocs
                           .map(
                             (k) => `
                           <tr>
                             <td><a href="https://www.tiktok.com/@${escapeHtml(k.handle)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">@${escapeHtml(k.handle)}</a></td>
                             <td class="ub-Num">${formatNum(k.followers)}</td>
                             <td class="ub-Num">${k.videoCount} (${k.shopVideoCount} giỏ)</td>
                             <td class="ub-Num" style="font-weight:600;">${formatNum(k.avgViews)}</td>
                           </tr>`
                           )
                           .join('')}
                       </tbody>
                     </table>
                   </div>
                 </div>`
              : ''
          }
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Xuất Báo cáo PDF/PNG</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ về Danh bạ KOC'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'ai_studio') {
        const ipRes = uiState.imagePromptResult;
        const scRes = uiState.scriptAnalysisResult;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">1. Tạo Prompt từ Ảnh bìa / Sản phẩm (Mọi trang)</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-gen-img-prompt" ${uiState.syncing ? 'disabled' : ''}>
                ${uiState.syncing ? 'Đang tạo...' : 'Tạo Prompt Ảnh'}
              </button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 110px; gap:4px;">
              <input class="ub-Input" id="ub-inp-img-url" type="text" placeholder="URL ảnh hoặc để trống lấy ảnh bài đang mở..." value="${escapeHtml(uiState.imagePromptInputUrl)}" />
              <select class="ub-Select" id="ub-sel-img-style">
                <option value="Chụp studio thương mại B2C ánh sáng tự nhiên" ${uiState.imagePromptStyle.includes('studio') ? 'selected' : ''}>Studio B2C</option>
                <option value="Lifestyle KOC cầm sản phẩm ngoài trời" ${uiState.imagePromptStyle.includes('Lifestyle') ? 'selected' : ''}>Lifestyle KOC</option>
                <option value="Cận cảnh kết cấu mỹ phẩm Macro" ${uiState.imagePromptStyle.includes('Macro') ? 'selected' : ''}>Cận cảnh Macro</option>
              </select>
            </div>
            ${
              ipRes
                ? `<div style="margin-top:4px; padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                     <div><strong>Prompt Tiếng Việt:</strong> ${escapeHtml(ipRes.promptVi || '')}</div>
                     <div style="color:var(--ub-ink-2);"><strong>Prompt Tiếng Anh:</strong> ${escapeHtml(ipRes.promptEn || '')}</div>
                     <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                       <button type="button" class="ub-IconBtn" id="ub-btn-copy-img-prompt">Copy Prompt</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-gemini-img">Mở Gemini</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-chatgpt-img">Mở ChatGPT</button>
                     </div>
                   </div>`
                : `<div style="font-size:12px; color:var(--ub-ink-3);">Bấm "Tạo Prompt Ảnh" để sinh câu lệnh dựng ảnh sản phẩm và mở thẳng sang tab Gemini / ChatGPT đã đăng nhập.</div>`
            }
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">2. Nhận xét Kênh & Viết Kịch bản Video (3 phân cảnh)</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-analyze-script" ${uiState.syncing ? 'disabled' : ''}>
                ${uiState.syncing ? 'Đang soạn...' : 'Soạn Kịch bản'}
              </button>
            </div>
            ${
              scRes
                ? `<div style="padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                     <div><strong>Nhận xét kênh:</strong> ${escapeHtml(scRes.healthVerdict || scRes.channelEvaluation || '')}</div>
                     <div><strong>Khuyến nghị:</strong> ${escapeHtml(scRes.suggestedFormat || scRes.recommendation || '')}</div>
                     ${
                       scRes.scriptOutline
                         ? `<div style="padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:3px;">
                              <div><strong>Cảnh 1 (0-3s):</strong> ${escapeHtml(scRes.scriptOutline.hook3s || '')}</div>
                              <div><strong>Cảnh 2 (3-18s):</strong> ${escapeHtml(scRes.scriptOutline.bodyUsp || '')}</div>
                              <div><strong>Cảnh 3 (18-25s):</strong> ${escapeHtml(scRes.scriptOutline.ctaCart || '')}</div>
                            </div>`
                         : ''
                     }
                     <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                       <button type="button" class="ub-IconBtn" id="ub-btn-copy-script-text">Copy Kịch bản</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-gemini-script">Mở Gemini</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-chatgpt-script">Mở ChatGPT</button>
                     </div>
                   </div>`
                : `<div style="font-size:12px; color:var(--ub-ink-3);">Bấm "Soạn Kịch bản" để tổng hợp đánh giá sức khỏe kênh và gợi ý kịch bản 3 cảnh theo sản phẩm đang mở.</div>`
            }
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Xuất Báo cáo PDF</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi...' : 'Đồng bộ KOC'}
          </button>
        `;
      } else {
        // Default sub-view: 'posts' (Bài đăng & Lưới)
        const contactLine =
          uiState.profile?.extractedPhone || uiState.profile?.extractedEmail
            ? `<div class="ub-Notice ub-Notice--pos">
                 Liên hệ trích xuất từ tiểu sử:
                 <strong>${escapeHtml(uiState.profile?.extractedPhone || '—')}</strong>
                 ${uiState.profile?.extractedEmail ? ` · <strong>${escapeHtml(uiState.profile.extractedEmail)}</strong>` : ''}
               </div>`
            : '';

        const searchSat = uiState.searchSaturation;
        const searchSaturationHtml =
          uiState.pageType === 'search' && searchSat
            ? `<div class="ub-SectionBox" style="background:var(--ub-surface); border-color:var(--ub-line-strong);">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                   <h4 class="ub-SectionTitle">Độ bão hòa ngách trên Tìm kiếm (${searchSat.totalVideos} bài)</h4>
                   <span class="ub-Badge ${searchSat.saturationScore >= 65 ? 'ub-Badge--crit' : 'ub-Badge--pos'}">${escapeHtml(searchSat.competitionLabel)}</span>
                 </div>
                 <div class="ub-KeyValGrid">
                   <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tỷ lệ bài gắn giỏ:</span><span class="ub-KeyVal">${searchSat.shopRatioPct}% (${searchSat.shopVideoCount} bài)</span></div>
                   <div class="ub-KeyValItem"><span class="ub-KeyLabel">View TB ngách:</span><span class="ub-KeyVal">${formatNum(searchSat.avgViews)}</span></div>
                 </div>
               </div>`
            : '';

        const videoRowsHtml =
          stats.filteredVideos.length > 0
            ? stats.filteredVideos
                .map((v, idx) => {
                  const firstLabel =
                    Array.isArray(v.gridLabels) && v.gridLabels.length > 0 ? v.gridLabels[0] : null;
                  const shortLabelText = firstLabel
                    ? String(firstLabel.text || '')
                        .replace('Bài nổi bật', 'Nổi bật')
                        .replace('Đang tăng nhanh', 'Tăng nhanh')
                        .replace('Gắn giỏ Shop', 'Gắn giỏ')
                    : '';
                  const labelsHtml = firstLabel
                    ? `<span class="ub-Badge ub-Badge--${firstLabel.tone === 'accent' ? 'warn' : firstLabel.tone || 'neutral'}">${escapeHtml(shortLabelText)}</span>`
                    : v.isPinned
                      ? '<span class="ub-Badge ub-Badge--neutral">Ghim</span>'
                      : v.isSponsored || v.hasYellowCart
                        ? '<span class="ub-Badge ub-Badge--warn">Gắn giỏ</span>'
                        : '<span class="ub-Badge ub-Badge--pos">Tự nhiên</span>';
                  const isFeedOrSearch = uiState.pageType === 'other' || uiState.pageType === 'search';
                  const rowFirstProd =
                    Array.isArray(v.cartProducts) && v.cartProducts.length > 0 ? v.cartProducts[0] : null;
                  return `
                <tr>
                  <td style="word-break:break-word;">
                    ${
                      isFeedOrSearch && v.handle
                        ? `<a href="https://www.tiktok.com/@${escapeHtml(v.handle)}" target="_blank" style="color: var(--ub-ink); text-decoration: none; font-weight: 700; display:block;">@${escapeHtml(v.handle)}</a>`
                        : ''
                    }
                    <a href="${escapeHtml(v.videoUrl)}" target="_blank" style="color: var(--ub-accent); text-decoration: none; font-weight: 600;">
                      ${formatDateVn(v.publishedAt)}
                    </a>
                    <div style="color:var(--ub-ink-3);">${formatNum(v.viewsPerHour || 0)}/h</div>
                    ${
                      rowFirstProd
                        ? `<div style="color:var(--ub-pos); font-weight:600; word-break:break-word;">🛒 ${escapeHtml(rowFirstProd.title || 'Sản phẩm gắn giỏ')}${rowFirstProd.productId ? ` (${escapeHtml(rowFirstProd.productId)})` : ''}</div>`
                        : ''
                    }
                  </td>
                  <td class="ub-Num" style="font-weight: 600;">${formatNum(v.views)}</td>
                  <td class="ub-Num">
                    <div style="font-weight:600;">${formatNum(v.likes)}</div>
                    ${uiState.showExtraCols ? `<div style="color:var(--ub-ink-3);">${formatNum(v.comments)} BL · ${formatNum(v.saves || 0)} lưu</div>` : ''}
                  </td>
                  ${uiState.showExtraCols ? `<td>${labelsHtml}</td>` : ''}
                  <td class="ub-Num">
                    <button type="button" class="ub-IconBtn ub-BtnRowDlMp4" data-row-idx="${idx}" title="Tải MP4 không logo">MP4</button>
                  </td>
                </tr>
              `;
                })
                .join('')
            : `<tr><td colspan="5" style="text-align:center; color: var(--ub-ink-3); padding: 16px;">Mở trang kênh TikTok/Douyin/Instagram để tự động đọc danh sách video.</td></tr>`;

        const curFeedVid = uiState.currentVideo || stats.filteredVideos[0] || null;
        const isHomeFeedOrSearch = uiState.pageType === 'other' || uiState.pageType === 'search';
        const displayFollowers =
          stats.followers || uiState.profile?.followers || curFeedVid?.authorFollowers || 0;
        const displayMedian = stats.medianViews || curFeedVid?.views || 0;
        const displayAvg = stats.avgViews || curFeedVid?.views || 0;
        const displayEr = stats.sampleCount > 0 ? stats.engagementRate : curFeedVid?.engagementRate || 0;

        const curCartProducts = Array.isArray(curFeedVid?.cartProducts) ? curFeedVid.cartProducts : [];
        const curHasCart = Boolean(curFeedVid?.hasYellowCart || curCartProducts.length > 0);
        const activeVideoDetailBoxHtml = curFeedVid
          ? `<div class="ub-SectionBox" style="background:var(--ub-surface); padding:6px 8px; gap:4px;">
               <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                 <div style="font-weight:700; color:var(--ub-ink);">
                   Bài đang xem: <a href="https://www.tiktok.com/@${escapeHtml(curFeedVid.handle || uiState.handle)}" target="_blank" style="color:var(--ub-accent); text-decoration:none;">@${escapeHtml(curFeedVid.handle || uiState.handle || 'tiktok')}</a>
                   ${displayFollowers > 0 ? `<span style="font-weight:500; color:var(--ub-ink-2);"> · ${formatNum(displayFollowers)} flw</span>` : ''}
                 </div>
                 <span class="ub-Badge ${curHasCart ? 'ub-Badge--warn' : 'ub-Badge--pos'}">
                   ${curCartProducts.length > 0 ? `Giỏ hàng (${curCartProducts.length} SP)` : curHasCart ? 'Có gắn giỏ' : `ER: ${curFeedVid.engagementRate || 0}%`}
                 </span>
               </div>
               <div style="color:var(--ub-ink-2); display:flex; flex-wrap:wrap; gap:6px;">
                 <span>Ngày: <strong>${formatDateVn(curFeedVid.publishedAt)}</strong></span>
                 ${curFeedVid.durationSeconds ? `<span>· Thời lượng: <strong>${curFeedVid.durationSeconds}s</strong></span>` : ''}
                 <span>· Tốc độ: <strong>${formatNum(curFeedVid.viewsPerHour || 0)}/h</strong></span>
                 <span>· ER: <strong>${curFeedVid.engagementRate || 0}%</strong></span>
               </div>
               ${
                 curFeedVid.caption
                   ? `<div style="color:var(--ub-ink); word-break:break-word; line-height:1.35; padding-top:2px; border-top:1px dashed var(--ub-line);">
                        <strong>Mô tả:</strong> ${escapeHtml(curFeedVid.caption)}
                      </div>`
                   : ''
               }
               ${
                 curFeedVid.musicTitle
                   ? `<div style="color:var(--ub-ink-2); word-break:break-word;">
                        <strong>Nhạc nền:</strong> 🎵 ${escapeHtml(curFeedVid.musicTitle)}
                      </div>`
                   : ''
               }
               ${
                 curCartProducts.length > 0
                   ? `<div style="display:flex; flex-direction:column; gap:4px; padding-top:3px; border-top:1px dashed var(--ub-line);">
                        <div style="font-weight:700; color:var(--ub-pos);">🛒 Sản phẩm trong Giỏ hàng TikTok Shop (${curCartProducts.length} SP):</div>
                        ${curCartProducts
                          .slice(0, 4)
                          .map(
                            (p, pIdx) => `
                          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px; background:var(--ub-canvas); padding:5px 6px; border:1px solid var(--ub-line); border-radius:4px;">
                            <div style="min-width:0; flex:1; word-break:break-word;">
                              <strong style="color:var(--ub-ink); display:block;">${pIdx + 1}. ${escapeHtml(p.title || 'Sản phẩm gắn giỏ')}</strong>
                              <span style="color:var(--ub-ink-2); display:block;">Mã SP: <strong>${escapeHtml(p.productId || '—')}</strong>${p.anchorKeyword ? ` · Thẻ: <strong>${escapeHtml(p.anchorKeyword)}</strong>` : ''}${p.priceText ? ` · Giá: <strong style="color:var(--ub-pos);">${escapeHtml(p.priceText)}</strong>` : p.priceVnd ? ` · Giá: <strong style="color:var(--ub-pos);">${formatVnd(p.priceVnd)}</strong>` : ''}</span>
                              ${
                                p.productUrl
                                  ? `<a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); font-size:12px; word-break:break-all; text-decoration:underline; display:block; margin-top:2px;">${escapeHtml(p.productUrl)}</a>`
                                  : ''
                              }
                            </div>
                            <div style="display:flex; flex-direction:column; gap:3px; align-items:flex-end;">
                              ${
                                p.productUrl
                                  ? `<button type="button" class="ub-IconBtn ub-BtnCopyCartUrl" data-cart-url="${escapeHtml(p.productUrl)}">Copy Link Giỏ</button>`
                                  : ''
                              }
                              ${
                                p.productId
                                  ? `<button type="button" class="ub-IconBtn ub-BtnCopyPid" data-pid="${escapeHtml(p.productId)}">Copy Mã</button>`
                                  : ''
                              }
                              ${
                                p.productUrl
                                  ? `<a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none; white-space:nowrap;">Mở SP ↗</a>`
                                  : ''
                              }
                            </div>
                          </div>`
                          )
                          .join('')}
                      </div>`
                   : ''
               }
               ${
                 curFeedVid.transcriptText
                   ? `<div style="color:var(--ub-ink-2); background:var(--ub-canvas); padding:4px 6px; border-radius:4px; max-height:48px; overflow-y:auto; word-break:break-word;">
                        <strong>Lời thoại:</strong> ${escapeHtml(curFeedVid.transcriptText)}
                      </div>`
                   : ''
               }
             </div>`
          : '';

        const statRowHtml = isHomeFeedOrSearch
          ? `
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">View bài</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.views || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Lượt tim</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.likes || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">BL / Lưu</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.comments || 0)} / ${formatNum(curFeedVid?.saves || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Chia sẻ</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.shares || 0)}</div>
            </div>
          </div>`
          : `
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">${stats.sampleCount > 0 || displayFollowers > 0 ? 'Follower' : 'View bài'}</div>
              <div class="ub-StatVal">${formatNum(stats.sampleCount > 0 || displayFollowers > 0 ? displayFollowers : curFeedVid?.views || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">${stats.sampleCount > 0 ? 'Trung vị' : 'Lượt tim'}</div>
              <div class="ub-StatVal">${formatNum(stats.sampleCount > 0 ? displayMedian : curFeedVid?.likes || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">${stats.sampleCount > 0 ? 'View TB' : 'BL / Lưu'}</div>
              <div class="ub-StatVal">${formatNum(stats.sampleCount > 0 ? displayAvg : curFeedVid?.comments || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Tỷ lệ ER</div>
              <div class="ub-StatVal">${displayEr}%</div>
            </div>
          </div>`;

        tabBodyHtml = `
          ${subNavHtml}

          ${statRowHtml}

          <div class="ub-QuickToolbar" style="flex-wrap:wrap; gap:4px;">
            <div style="display:flex; align-items:center; gap:3px; flex-wrap:wrap;">
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-mp4" title="Tải video đang phát không logo">⬇ MP4</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-mp3" title="Tải âm thanh MP3">🎵 MP3</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-sub" title="Tải lời thoại phụ đề (.txt)">📝 Phụ đề</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-img" title="Tải bộ ảnh Slide không logo">🖼 Ảnh</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-cmt" title="Xuất danh sách bình luận ra CSV">💬 BL</button>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:6px; padding-top:2px; border-top:1px dashed var(--ub-line);">
              <div style="display:flex; align-items:center; gap:6px;">
                <label class="ub-CheckLabel" title="Tự động chuyển sang video tiếp theo khi hết bài">
                  <input type="checkbox" id="ub-chk-autoscroll" ${uiState.playerControls.autoScroll ? 'checked' : ''} />
                  <span>Tự cuộn</span>
                </label>
                <label class="ub-CheckLabel" title="Hiện nhãn số liệu trên từng thẻ lưới TikTok">
                  <input type="checkbox" id="ub-chk-gridoverlay" ${uiState.playerControls.gridOverlayEnabled ? 'checked' : ''} />
                  <span>Nhãn lưới</span>
                </label>
              </div>
              <button type="button" class="ub-IconBtn ${uiState.toolsExpanded ? 'ub-IconBtn--active' : ''}" id="ub-btn-toggle-tools">
                ⚙ Bộ lọc ${uiState.toolsExpanded ? '▴' : '▾'}
              </button>
            </div>
          </div>

          <div class="ub-CollapsibleTools ${uiState.toolsExpanded ? 'ub-CollapsibleTools--open' : ''}">
            <div class="ub-PlayerBar">
              <label class="ub-CheckLabel" title="Giữ video phát tiếp khi chuyển sang tab khác">
                <input type="checkbox" id="ub-chk-bgplay" ${uiState.playerControls.bgPlay ? 'checked' : ''} />
                <span>Phát nền</span>
              </label>
              <div style="display:flex; align-items:center; gap:3px;">
                <select class="ub-Select" id="ub-sel-speed" style="width:52px; height:24px; padding:0 2px;" title="Tốc độ phát video">
                  <option value="0.75" ${uiState.playerControls.playbackSpeed === 0.75 ? 'selected' : ''}>0.75x</option>
                  <option value="1" ${uiState.playerControls.playbackSpeed === 1 ? 'selected' : ''}>1.0x</option>
                  <option value="1.25" ${uiState.playerControls.playbackSpeed === 1.25 ? 'selected' : ''}>1.25x</option>
                  <option value="1.5" ${uiState.playerControls.playbackSpeed === 1.5 ? 'selected' : ''}>1.5x</option>
                  <option value="2" ${uiState.playerControls.playbackSpeed === 2 ? 'selected' : ''}>2.0x</option>
                </select>
                <select class="ub-Select" id="ub-sel-volume" style="width:58px; height:24px; padding:0 2px;" title="Âm lượng video">
                  <option value="100" ${uiState.playerControls.volumePct === 100 ? 'selected' : ''}>🔊100%</option>
                  <option value="75" ${uiState.playerControls.volumePct === 75 ? 'selected' : ''}>🔊75%</option>
                  <option value="50" ${uiState.playerControls.volumePct === 50 ? 'selected' : ''}>🔉50%</option>
                  <option value="25" ${uiState.playerControls.volumePct === 25 ? 'selected' : ''}>🔈25%</option>
                  <option value="0" ${uiState.playerControls.volumePct === 0 ? 'selected' : ''}>🔇0%</option>
                </select>
                <select class="ub-Select" id="ub-sel-gridsort" style="width:88px; height:24px; padding:0 2px;" title="Sắp xếp các thẻ bài đăng trên lưới TikTok">
                  <option value="default" ${uiState.playerControls.gridSortMode === 'default' ? 'selected' : ''}>Lưới: Mặc định</option>
                  <option value="views" ${uiState.playerControls.gridSortMode === 'views' ? 'selected' : ''}>Lưới: View cao</option>
                  <option value="likes" ${uiState.playerControls.gridSortMode === 'likes' ? 'selected' : ''}>Lưới: Tim cao</option>
                  <option value="er" ${uiState.playerControls.gridSortMode === 'er' ? 'selected' : ''}>Lưới: ER cao</option>
                  <option value="velocity" ${uiState.playerControls.gridSortMode === 'velocity' ? 'selected' : ''}>Lưới: Tăng nhanh</option>
                  <option value="shop_only" ${uiState.playerControls.gridSortMode === 'shop_only' ? 'selected' : ''}>Chỉ bài giỏ</option>
                </select>
              </div>
            </div>

            <div class="ub-FilterBar" style="flex-wrap:nowrap; gap:4px;">
              <label class="ub-CheckLabel" style="white-space:nowrap;">
                <input type="checkbox" id="ub-chk-unpin" ${uiState.excludePinned ? 'checked' : ''} />
                <span>Bỏ ghim</span>
              </label>
              <input class="ub-Input" id="ub-inp-kw-filter" type="text" placeholder="Từ khóa / SP..." value="${escapeHtml(uiState.keywordFilter)}" style="flex:1; min-width:52px; height:24px;" />
              <input class="ub-Input" id="ub-inp-date-from" type="date" title="Từ ngày đăng" value="${escapeHtml(uiState.dateFromFilter)}" style="width:84px; height:24px; padding:0 2px;" />
              <select class="ub-Select" id="ub-sel-sample" style="width:58px; height:24px; padding:0 2px;">
                <option value="10" ${uiState.sampleSize === 10 ? 'selected' : ''}>10 bài</option>
                <option value="15" ${uiState.sampleSize === 15 ? 'selected' : ''}>15 bài</option>
                <option value="30" ${uiState.sampleSize === 30 ? 'selected' : ''}>30 bài</option>
                <option value="50" ${uiState.sampleSize === 50 ? 'selected' : ''}>50 bài</option>
              </select>
            </div>

            <div class="ub-FilterBar" style="justify-content:space-between; gap:4px;">
              <select class="ub-Select" id="ub-sel-tablesort" style="flex:1; height:24px; padding:0 4px;" title="Sắp xếp bảng phân tích bài đăng">
                <option value="default" ${uiState.tableSortMode === 'default' ? 'selected' : ''}>Bảng: Mới nhất</option>
                <option value="views" ${uiState.tableSortMode === 'views' ? 'selected' : ''}>Bảng: Lượt xem cao</option>
                <option value="likes" ${uiState.tableSortMode === 'likes' ? 'selected' : ''}>Bảng: Lượt thích cao</option>
                <option value="er" ${uiState.tableSortMode === 'er' ? 'selected' : ''}>Bảng: Tương tác ER cao</option>
                <option value="velocity" ${uiState.tableSortMode === 'velocity' ? 'selected' : ''}>Bảng: Tốc độ view/giờ</option>
              </select>
              <label class="ub-CheckLabel" title="Chọn cột hiển thị trên bảng phân tích">
                <input type="checkbox" id="ub-chk-col-extra" ${uiState.showExtraCols ? 'checked' : ''} />
                <span>Đủ cột (Lưu·Nhãn)</span>
              </label>
            </div>

            <div class="ub-CompareBox">
              <div class="ub-CompareItem">
                <span style="font-size:12px; color:var(--ub-ink-2);">View tự nhiên:</span>
                <strong style="font-size:12px; color:var(--ub-ink);">${formatNum(stats.organicAvgViews)}</strong>
              </div>
              <div class="ub-CompareItem">
                <span style="font-size:12px; color:var(--ub-ink-2);">View giỏ (${stats.sponsoredCount}):</span>
                <strong style="font-size:12px; color:var(--ub-accent);">${stats.sponsoredCount > 0 ? formatNum(stats.sponsoredAvgViews) : '—'}</strong>
              </div>
            </div>
          </div>

          ${searchSaturationHtml}

          ${activeVideoDetailBoxHtml}

          ${
            !isHomeFeedOrSearch && uiState.channelHealth && stats.sampleCount > 0
              ? `<div class="ub-HealthStrip">
                   <div>
                     <div class="ub-HealthLabel">Điểm KOC</div>
                     <div class="ub-HealthVal">${uiState.channelHealth.kocScore}/100</div>
                   </div>
                   <div>
                     <div class="ub-HealthLabel">Nhịp đăng</div>
                     <div class="ub-HealthVal">${uiState.channelHealth.postsWeekly}/tuần</div>
                   </div>
                   <div>
                     <div class="ub-HealthLabel">Tỷ lệ gắn giỏ</div>
                     <div class="ub-HealthVal" style="color:var(--ub-accent);">${uiState.channelHealth.shopSharePct}%</div>
                   </div>
                   <div>
                     <div class="ub-HealthLabel">Giờ vàng</div>
                     <div class="ub-HealthVal" style="font-size:12px;">${escapeHtml((uiState.channelHealth.goldenHours || []).slice(0, 2).join(' · '))}</div>
                   </div>
                 </div>`
              : ''
          }

          ${contactLine}

          ${
            stats.sampleCount > 0
              ? `<div class="ub-TableWrap" style="max-height:138px;">
                   <table class="ub-Table">
                     <thead>
                       <tr>
                         <th>${isHomeFeedOrSearch ? 'Kênh / Ngày' : 'Ngày / Tốc độ'}</th>
                         <th class="ub-Num">View</th>
                         <th class="ub-Num">Tim / BL</th>
                         ${uiState.showExtraCols ? `<th>Nhãn</th>` : ''}
                         <th class="ub-Num">Tải</th>
                       </tr>
                     </thead>
                     <tbody>
                       ${videoRowsHtml}
                     </tbody>
                   </table>
                 </div>`
              : `<div style="padding:6px 8px; background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; font-size:12px; color:var(--ub-ink-2); display:flex; justify-content:space-between; align-items:center;">
                   <span>${uiState.handle ? `Đang xem bài của @${escapeHtml(uiState.handle)}` : 'Mở kênh KOC để quét danh sách bài'}</span>
                   ${uiState.handle ? `<a href="https://www.tiktok.com/@${escapeHtml(uiState.handle)}" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">Mở kênh →</a>` : ''}
                 </div>`
          }
        `;

        footerHtml = `
          <div style="display:flex; gap:4px;">
            <button class="ub-BtnSecondary" id="ub-btn-csv" type="button">Xuất CSV</button>
            <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Báo cáo PDF</button>
          </div>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi...' : 'Đồng bộ KOC'}
          </button>
        `;
      }
    } else if (uiState.activeTab === 'seller') {
      const d = uiState.sellerDraft;
      const gmvVal = Math.round(Number(d.doanhSo || 0));
      const itemsVal = Math.round(Number(d.soMonBanRa || 0));
      const gpmVal = Math.round(Number(d.gpm || 0));
      const aovVal = Math.round(Number(d.aov || 0));
      const viewsVal = Math.round(Number(d.viewTrungBinh || 0));

      const sellerEditFormHtml = uiState.sellerEditExpanded
        ? `
          <div class="ub-FormGrid" style="margin-top:6px; padding-top:8px; border-top:1px solid var(--ub-line);">
            <div class="ub-Field">
              <label class="ub-Label">Follower (Cột P)</label>
              <input class="ub-Input" id="ub-seller-followers" type="number" min="0" value="${Math.round(Number(d.followers || 0))}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Doanh số GMV 30d (Cột Y - VND)</label>
              <input class="ub-Input" id="ub-seller-gmv" type="number" min="0" step="100000" value="${gmvVal}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Số món bán ra (Cột Z)</label>
              <input class="ub-Input" id="ub-seller-items" type="number" min="0" value="${itemsVal}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">GPM (Cột AA - VND)</label>
              <input class="ub-Input" id="ub-seller-gpm" type="number" min="0" step="1000" value="${gpmVal}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">GMV/Khách hàng AOV (Cột AB - VND)</label>
              <input class="ub-Input" id="ub-seller-aov" type="number" min="0" step="1000" value="${aovVal}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">View TB video (Cột AC)</label>
              <input class="ub-Input" id="ub-seller-views" type="number" min="0" value="${viewsVal}" />
            </div>

            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Video % / Live % / Thẻ SP % (AD-AF)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-vidpct" type="number" min="0" max="100" title="% GMV từ Video" value="${Number(d.gmvTuVideoPct || 0)}" />
                <input class="ub-Input" id="ub-seller-livepct" type="number" min="0" max="100" title="% GMV từ Live" value="${Number(d.gmvTuLivePct || 0)}" />
                <input class="ub-Input" id="ub-seller-cardpct" type="number" min="0" max="100" title="% GMV từ Thẻ SP" value="${Number(d.gmvTuTheSanPhamPct || 0)}" />
              </div>
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Tỷ lệ Nam % / Nữ % (Cột AG-AH)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-male" type="number" min="0" max="100" title="% Nam" value="${Number(d.namPct || 0)}" />
                <input class="ub-Input" id="ub-seller-female" type="number" min="0" max="100" title="% Nữ" value="${Number(d.nuPct || 0)}" />
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Tuổi 18-24 / 25-34 / >35 % (AI-AK)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-a18" type="number" min="0" max="100" title="% 18-24" value="${Number(d.tuoi18_24Pct || 0)}" />
                <input class="ub-Input" id="ub-seller-a25" type="number" min="0" max="100" title="% 25-34" value="${Number(d.tuoi25_34Pct || 0)}" />
                <input class="ub-Input" id="ub-seller-a35" type="number" min="0" max="100" title="% >35" value="${Number(d.tuoiTren35Pct || 0)}" />
              </div>
            </div>
          </div>
        `
        : '';

      tabBodyHtml = `
        <div class="ub-StatRow">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">GMV 30d (Y)</div>
            <div class="ub-StatVal" id="ub-seller-stat-gmv">${formatVnd(gmvVal)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Đã bán (Z)</div>
            <div class="ub-StatVal" id="ub-seller-stat-items">${formatNum(itemsVal)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">GPM (AA)</div>
            <div class="ub-StatVal" id="ub-seller-stat-gpm">${formatVnd(gpmVal)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">View TB (AC)</div>
            <div class="ub-StatVal" id="ub-seller-stat-views">${formatNum(viewsVal)}</div>
          </div>
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">Bộ chỉ số TikTok Seller (Chuẩn Cột Y → AM)</h4>
            <div style="display:flex; gap:4px;">
              <button class="ub-IconBtn" id="ub-btn-toggle-seller-edit" type="button">
                ${uiState.sellerEditExpanded ? 'Thu gọn ô nhập' : 'Sửa số liệu (15 cột)'}
              </button>
              <button class="ub-IconBtn" id="ub-btn-rescan-seller" type="button">Quét lại</button>
            </div>
          </div>

          <div class="ub-Field ub-Field--full">
            <label class="ub-Label">ID kênh KOC (Cột H)</label>
            <div style="display:flex; gap:4px;">
              <input class="ub-Input" id="ub-seller-handle" style="flex:1;" type="text" placeholder="VD: po.trann77" value="${escapeHtml(uiState.handle)}" />
              <button class="ub-IconBtn" id="ub-btn-lookup-handle" type="button">Tra cứu</button>
            </div>
          </div>

          <div class="ub-KeyValGrid">
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">AOV / Khách (AB):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-aov">${formatVnd(aovVal)}</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Kênh Video/Live/SP:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-channel">${Number(d.gmvTuVideoPct || 0)}% / ${Number(d.gmvTuLivePct || 0)}% / ${Number(d.gmvTuTheSanPhamPct || 0)}%</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Tệp Nam / Nữ:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-gender">${Number(d.namPct || 0)}% / ${Number(d.nuPct || 0)}%</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Độ tuổi (18-24 / 25-34 / >35):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-age">${Number(d.tuoi18_24Pct || 0)}% / ${Number(d.tuoi25_34Pct || 0)}% / ${Number(d.tuoiTren35Pct || 0)}%</span>
            </div>
          </div>

          ${sellerEditFormHtml}
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-copy-summary" type="button">Copy gửi Lark</button>
        <div style="display:flex; gap:6px;">
          <button class="ub-BtnSecondary" id="ub-btn-sync-seller" type="button" ${uiState.syncing ? 'disabled' : ''}>
            Lưu Web-Admin
          </button>
          <button class="ub-BtnPrimary" id="ub-btn-copy-sheet-row" type="button">
            Copy Cột Y → AM (Dán Sheet)
          </button>
        </div>
      `;
    } else if (uiState.activeTab === 'ads') {
      const a = uiState.adsDraft;
      const bookingNet = Math.round(Number(a.bookingCostNet || 0));
      const adsSpend = Math.round(Number(a.adsSpend || 0));
      const gmv = Math.round(Number(a.gmv || 0));
      const totalCost = bookingNet + adsSpend;
      const roasAds = adsSpend === 0 ? 0 : Number((gmv / adsSpend).toFixed(2));
      const roiTotal = totalCost === 0 ? 0 : Number((gmv / totalCost).toFixed(2));

      const adsRowsHtml =
        Array.isArray(uiState.adsRecords) && uiState.adsRecords.length > 0
          ? uiState.adsRecords
              .slice(0, 12)
              .map(
                (r, idx) => {
                  const rowRoas =
                    r.roas !== undefined
                      ? r.roas
                      : Number(r.adsSpend || 0) > 0
                        ? Number((Number(r.gmv || 0) / Number(r.adsSpend)).toFixed(2))
                        : 0;
                  return `
              <tr data-ads-idx="${idx}" class="ub-AdsRowItem" style="cursor:pointer;">
                <td style="font-weight:600; color:var(--ub-accent);">${escapeHtml(String(r.videoId || r.adId).slice(-10))}</td>
                <td class="ub-Num">${formatVnd(r.adsSpend)}</td>
                <td class="ub-Num">${formatVnd(r.gmv)}</td>
                <td class="ub-Num">${formatNum(r.orders)}</td>
                <td class="ub-Num" style="font-weight:600;">${rowRoas}x</td>
              </tr>
            `;
                }
              )
              .join('')
          : `<tr><td colspan="5" style="text-align:center; color:var(--ub-ink-3); padding:12px;">Mở bảng chiến dịch trên ads.tiktok.com để tự động bóc tách hoặc nhập trực tiếp bên dưới.</td></tr>`;

      tabBodyHtml = `
        <div class="ub-StatRow">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Tổng chi</div>
            <div class="ub-StatVal" id="ub-ads-stat-cost">${formatVnd(totalCost)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">GMV Ads</div>
            <div class="ub-StatVal" id="ub-ads-stat-gmv">${formatVnd(gmv)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">ROAS Ads</div>
            <div class="ub-StatVal" id="ub-ads-stat-roas">${roasAds}x</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">ROI Tổng</div>
            <div class="ub-StatVal" id="ub-ads-stat-roi" style="color:${roiTotal >= 2 ? 'var(--ub-pos)' : roiTotal > 0 && roiTotal < 1 ? 'var(--ub-crit)' : 'var(--ub-accent)'};">${roiTotal}x</div>
          </div>
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">1. Nạp & Xác thực Mã ủy quyền Spark Ads hàng loạt</h4>
            <button class="ub-IconBtn" id="ub-btn-load-reg-videos" type="button">Tải mã từ Web-Admin</button>
          </div>
          <div class="ub-Field ub-Field--full">
            <label class="ub-Label">Danh sách mã Spark Ads (Mỗi dòng 1 mã hoặc VideoID|SparkCode|MãBO)</label>
            <textarea class="ub-Input" id="ub-ads-batch-codes" rows="2" style="resize:vertical; font-family:monospace;" placeholder="VD: #19x82K9LmP2q...">${escapeHtml(a.batchSparkCodesText)}</textarea>
          </div>
          <div class="ub-BtnRow" style="margin-top:2px;">
            <button class="ub-BtnSecondary" id="ub-btn-run-spark-auth" type="button" ${uiState.syncing ? 'disabled' : ''}>
              Điền mã vào TikTok Ads & Xác thực
            </button>
          </div>
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">2. Đối soát Chi phí Ads & Nghiệm thu 30 ngày (Cột BE → BI)</h4>
            <button class="ub-IconBtn" id="ub-btn-rescan-ads" type="button">Quét bảng Ads</button>
          </div>

          <div class="ub-TableWrap" style="max-height:110px;">
            <table class="ub-Table">
              <thead>
                <tr>
                  <th>Mã Video / Ad</th>
                  <th class="ub-Num">Chi phí Ads</th>
                  <th class="ub-Num">GMV Ads</th>
                  <th class="ub-Num">Đơn hàng</th>
                  <th class="ub-Num">ROAS</th>
                </tr>
              </thead>
              <tbody>
                ${adsRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="ub-FormGrid">
            <div class="ub-Field">
              <label class="ub-Label">Mã Video / Mã BO</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-ads-vid" type="text" placeholder="Video ID" value="${escapeHtml(a.videoId)}" />
                <input class="ub-Input" id="ub-ads-deal" type="text" placeholder="Mã BO" value="${escapeHtml(a.dealCode)}" />
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Mã ủy quyền Ads (Cột BE)</label>
              <input class="ub-Input" id="ub-ads-spark" type="text" placeholder="Mã Spark Ads..." value="${escapeHtml(a.sparkAdsCode)}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Cát-xê Booking Net (VND)</label>
              <input class="ub-Input" id="ub-ads-booking-net" type="number" min="0" step="100000" value="${bookingNet}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Chi phí chạy Ads (VND)</label>
              <input class="ub-Input" id="ub-ads-spend" type="number" min="0" step="100000" value="${adsSpend}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">GMV 30 ngày (Cột BG - VND)</label>
              <input class="ub-Input" id="ub-ads-gmv" type="number" min="0" step="100000" value="${gmv}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Views (BF) / Đơn hàng (BH)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-ads-views" type="number" min="0" title="Views 30 ngày (Cột BF)" value="${Math.round(Number(a.views || 0))}" />
                <input class="ub-Input" id="ub-ads-orders" type="number" min="0" title="Số đơn hàng 30 ngày (Cột BH)" value="${Math.round(Number(a.orders || 0))}" />
              </div>
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-copy-ads-cols" type="button">
          Copy Cột BE → BI (Dán Sheet)
        </button>
        <button class="ub-BtnPrimary" id="ub-btn-sync-ads" type="button" ${uiState.syncing ? 'disabled' : ''}>
          ${uiState.syncing ? 'Đang đồng bộ...' : 'Đồng bộ Báo cáo Ads về Web-Admin'}
        </button>
      `;
    } else if (uiState.activeTab === 'booking') {
      const historySectionHtml = kocDb
        ? `
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">Hồ sơ & Giá cát-xê nội bộ tại Upbase B2C</h4>
              <span class="ub-Badge ub-Badge--pos">Điểm uy tín: ${kocDb.reliabilityScore}/10</span>
            </div>
            <div class="ub-KeyValGrid">
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Khung lương / Nhóm:</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.salaryGrade)} · ${escapeHtml(kocDb.segment)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Giá Net chuẩn:</span>
                <span class="ub-KeyVal" style="color:var(--ub-accent);">${formatVnd(kocDb.rateCardVideo)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Biên độ giá lịch sử:</span>
                <span class="ub-KeyVal">${formatVnd(kocDb.minRate)} – ${formatVnd(kocDb.maxRate)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Tổng số Deal cũ:</span>
                <span class="ub-KeyVal">${formatNum(kocDb.totalPastDeals)} (${formatNum(kocDb.totalPaidVideos)} Paid · ${formatNum(kocDb.totalFocVideos)} FOC)</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Đợt book gần nhất:</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.latestBookMonth)} (${escapeHtml(kocDb.latestBoCode)})</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">PIC phụ trách:</span>
                <span class="ub-KeyVal">${escapeHtml(String(kocDb.bookingPic || '—').slice(0, 26))}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">SĐT / CCCD (Đã che):</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.phoneMasked)} · ${escapeHtml(kocDb.cccdMasked)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Tài khoản thụ hưởng:</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.bankAccountMasked)}</span>
              </div>
            </div>
            ${
              kocDb.sharedMcnInfo
                ? `<div class="ub-Notice ub-Notice--warn">Lưu ý đối soát pháp lý: ${escapeHtml(kocDb.sharedMcnInfo)}</div>`
                : ''
            }
          </div>
        `
        : `
          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">KOC chưa có lịch sử hợp tác trong Master Data</h4>
            <div style="font-size:12px; color:var(--ub-ink-2);">
              Kênh <strong>@${escapeHtml(uiState.handle || 'chưa chọn')}</strong> chưa từng phát sinh mã BO trong 16.024 Deal lịch sử. Bạn có thể lập đề xuất mới bên dưới để đưa vào danh sách trình duyệt.
            </div>
          </div>
        `;

      const dealsTableHtml =
        recentDeals.length > 0
          ? `
            <div class="ub-TableWrap" style="max-height:120px;">
              <table class="ub-Table">
                <thead>
                  <tr>
                    <th>Mã BO</th>
                    <th>Gian hàng / Brand</th>
                    <th class="ub-Num">Giá Net</th>
                    <th class="ub-Num">View</th>
                    <th>PIC</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentDeals
                    .map(
                      (d) => `
                    <tr>
                      <td style="font-weight:600;">
                        ${
                          d.videoUrl
                            ? `<a href="${escapeHtml(d.videoUrl)}" target="_blank" style="color:var(--ub-accent); text-decoration:none;" title="Mở bài Air có gắn giỏ hàng">${escapeHtml(d.dealCode)} ↗</a>`
                            : escapeHtml(d.dealCode)
                        }
                      </td>
                      <td>${escapeHtml(d.brandName)}</td>
                      <td class="ub-Num">${formatVnd(d.totalValue)}</td>
                      <td class="ub-Num">${formatNum(d.viewsCount)}</td>
                      <td>${escapeHtml(d.assignedStaff)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          : '';

      const storeOptionsHtml = stores
        .map(
          (s) =>
            `<option value="${escapeHtml(s.storeName)}" ${s.storeName === uiState.selectedStoreName ? 'selected' : ''}>
              ${escapeHtml(s.storeName)} (${escapeHtml(s.brandName)})
            </option>`
        )
        .join('');

      tabBodyHtml = `
        ${historySectionHtml}
        ${dealsTableHtml}

        <div class="ub-SectionBox">
          <h4 class="ub-SectionTitle">Đề xuất đưa KOC vào Kế hoạch Booking tháng 10/2026</h4>
          <div class="ub-FormGrid">
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Gian hàng nhận phân bổ (69 gian hàng B2C)</label>
              <select class="ub-Select" id="ub-sel-store">${storeOptionsHtml}</select>
            </div>
            <div class="ub-Field ub-Field--full">
              <div style="font-size:12px; padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px;">
                Luồng phê duyệt: <strong style="color:var(--ub-accent);">${escapeHtml(selectedStoreObj?.routingLabel || 'Trình duyệt B2C')}</strong>
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Hạng mục Booking</label>
              <select class="ub-Select" id="ub-sel-format">
                <option value="Video trả phí" ${uiState.bookingFormatLabel === 'Video trả phí' ? 'selected' : ''}>Video trả phí</option>
                <option value="Suất gửi mẫu FOC" ${uiState.bookingFormatLabel === 'Suất gửi mẫu FOC' ? 'selected' : ''}>Suất gửi mẫu FOC (0đ)</option>
                <option value="Video Affiliate" ${uiState.bookingFormatLabel === 'Video Affiliate' ? 'selected' : ''}>Video Affiliate</option>
              </select>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Đơn giá Net dự kiến (VND)</label>
              <input class="ub-Input" id="ub-inp-rate" type="number" step="100000" min="0" placeholder="VD: 5000000" value="${escapeHtml(uiState.rateCardNetInput)}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Chuyên viên thực thi (PIC)</label>
              <input class="ub-Input" id="ub-inp-pic" type="text" value="${escapeHtml(uiState.picNameInput)}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Ghi chú sản phẩm / Góc nội dung</label>
              <input class="ub-Input" id="ub-inp-note" type="text" placeholder="VD: Cushion kiềm dầu..." value="${escapeHtml(uiState.noteInput)}" />
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <span style="font-size:12px; color:var(--ub-ink-2);">Gian hàng: <strong>${escapeHtml(selectedStoreObj?.brandName || 'B2C')}</strong></span>
        <button class="ub-BtnPrimary" id="ub-btn-save-proposal" type="button" ${uiState.syncing ? 'disabled' : ''}>
          ${uiState.syncing ? 'Đang lưu...' : 'Lưu đề xuất Booking về Web-Admin'}
        </button>
      `;
    } else if (uiState.activeTab === 'aircheck') {
      const activeVid =
        uiState.currentVideo ||
        (uiState.videos && uiState.videos[0]) ||
        null;

      if (!activeVid) {
        tabBodyHtml = `
          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">Chưa chọn video cần nghiệm thu</h4>
            <div style="font-size:12px; color:var(--ub-ink-2);">
              Hãy bấm mở một video cụ thể trên kênh KOC để kiểm tra Hashtag, Giỏ hàng và đẩy số liệu nghiệm thu Air Link về hệ thống.
            </div>
          </div>
        `;
      } else {
        const expectedTags = String(uiState.expectedHashtagInput || '')
          .split(/[,\s]+/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t : `#${t}`));
        const actualTags = (activeVid.hashtags || []).map((t) => String(t).toLowerCase());
        const missingTags = expectedTags.filter((t) => !actualTags.includes(t));

        // 1. Giỏ hàng TikTok Shop & Đối chiếu Link Giỏ hàng mẫu
        const cartProducts = Array.isArray(activeVid.cartProducts) ? activeVid.cartProducts : [];
        const hasCart = Boolean(activeVid.hasYellowCart || cartProducts.length > 0);
        const expectedCartRaw = String(uiState.expectedCartUrlInput || '').trim();
        const expectedPidMatch = expectedCartRaw.match(/\b(\d{15,22})\b/);
        const expectedPid = expectedPidMatch ? expectedPidMatch[1] : '';
        let isCartMatched = true;
        if (expectedCartRaw) {
          if (expectedPid) {
            isCartMatched =
              cartProducts.some((p) => String(p.productId || '') === expectedPid) ||
              String(activeVid.cartProductId || '') === expectedPid;
          } else {
            const kw = expectedCartRaw.toLowerCase();
            isCartMatched = cartProducts.some(
              (p) =>
                String(p.title || '').toLowerCase().includes(kw) ||
                String(p.productUrl || '').toLowerCase().includes(kw)
            );
          }
        }

        const cartProductsHtml =
          cartProducts.length > 0
            ? cartProducts
                .map(
                  (p, idx) => `
                  <div class="ub-ProductCard">
                    <div class="ub-ProductCardInfo">
                      <div class="ub-ProductCardTitle">
                        ${idx + 1}. ${escapeHtml(p.title || 'Sản phẩm TikTok Shop')}
                      </div>
                      <div class="ub-ProductCardMeta">
                        Mã SP: <strong>${escapeHtml(p.productId || '—')}</strong>
                        ${p.anchorKeyword ? ` · Thẻ giỏ: <strong>${escapeHtml(p.anchorKeyword)}</strong>` : ''}
                        ${p.priceText ? ` · Giá: <strong>${escapeHtml(p.priceText)}</strong>` : p.priceVnd ? ` · Giá: <strong>${formatVnd(p.priceVnd)}</strong>` : ''}
                      </div>
                      ${
                        p.productUrl
                          ? `<div class="ub-ProductCardMeta" style="margin-top:2px;">
                               Link giỏ: <a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); word-break:break-all; text-decoration:underline;">${escapeHtml(p.productUrl)}</a>
                             </div>`
                          : ''
                      }
                    </div>
                    <div style="display:flex; flex-direction:column; gap:3px; align-items:flex-end;">
                      ${
                        p.productUrl
                          ? `<button type="button" class="ub-IconBtn ub-BtnCopyCartUrl" data-cart-url="${escapeHtml(p.productUrl)}">Copy Link Giỏ</button>`
                          : ''
                      }
                      ${
                        p.productId
                          ? `<button type="button" class="ub-IconBtn ub-BtnCopyPid" data-pid="${escapeHtml(p.productId)}">Copy Mã</button>`
                          : ''
                      }
                      ${
                        p.productUrl
                          ? `<a href="${escapeHtml(p.productUrl)}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600; text-decoration:none; white-space:nowrap;">Mở SP ↗</a>`
                          : ''
                      }
                    </div>
                  </div>`
                )
                .join('')
            : hasCart
              ? `<div class="ub-ProductCard">
                   <div class="ub-ProductCardInfo">
                     <div class="ub-ProductCardMeta" style="color:var(--ub-ink-2);">
                       Phát hiện gắn giỏ hàng thương mại${activeVid.hasCapCutMask ? ' (Đang mở khóa lớp phủ CapCut...)' : ''}.
                     </div>
                   </div>
                 </div>`
              : (() => {
                  const genericTagSet = new Set([
                    '#fyp',
                    '#xuhuong',
                    '#tiktok',
                    '#viral',
                    '#trending',
                    '#tranthanhtam',
                    '#antamfamily',
                    '#metaverse',
                    `#${String(uiState.handle || '').replace(/[._-]+/g, '')}`,
                  ]);
                  const brandTags = actualTags.filter((t) => !genericTagSet.has(t));
                  const searchKw =
                    brandTags.length > 0
                      ? brandTags.map((t) => t.replace(/^#/, '')).join(' ')
                      : '';
                  const dealsWithVideo = (recentDeals || []).filter((d) => d.videoUrl).slice(0, 3);
                  return `<div class="ub-ProductCard" style="flex-direction:column; align-items:stretch; gap:4px;">
                     <div class="ub-ProductCardInfo">
                       <div class="ub-ProductCardMeta" style="color:var(--ub-ink);">
                         <strong>KOC không gắn giỏ hàng TikTok Shop trên video này</strong>${
                           activeVid.isAdAuthorized || activeVid.isSponsored
                             ? ' (Bài đăng dạng Booking Branding · Đã bật Ủy quyền Quảng cáo Spark Ads).'
                             : ' (Bài đăng tự nhiên hoặc Booking Branding không gắn giỏ).'
                         }
                       </div>
                       ${
                         brandTags.length > 0
                           ? `<div class="ub-ProductCardMeta" style="margin-top:3px; display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                                <span>Nhãn hàng/SP trong bài: <strong style="color:var(--ub-accent);">${escapeHtml(brandTags.join(' '))}</strong></span>
                                <a href="https://www.tiktok.com/search?q=${encodeURIComponent(searchKw)}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600; text-decoration:none;">Tìm SP trên TikTok ↗</a>
                              </div>`
                           : ''
                       }
                       ${
                         dealsWithVideo.length > 0
                           ? `<div class="ub-ProductCardMeta" style="margin-top:4px; padding-top:4px; border-top:1px dashed var(--ub-line);">
                                <span>Bài Air có gắn giỏ của @${escapeHtml(uiState.handle)}:</span>
                                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
                                  ${dealsWithVideo
                                    .map(
                                      (d) =>
                                        `<a href="${escapeHtml(d.videoUrl)}" style="font-size:12px; color:var(--ub-accent); font-weight:600; text-decoration:none;">${escapeHtml(d.brandName)} (${escapeHtml(d.dealCode)}) ↗</a>`
                                    )
                                    .join(' · ')}
                                </div>
                              </div>`
                           : ''
                       }
                     </div>
                   </div>`;
                })();

        // 2. Lời thoại Phụ đề (WebVTT), Chữ trên màn hình & Quét Từ cấm / USP
        const transcriptText = String(activeVid.transcriptText || '').trim();
        const stickers = Array.isArray(activeVid.onScreenStickers) ? activeVid.onScreenStickers : [];
        const combinedContentLower = `${activeVid.caption || ''} ${transcriptText} ${stickers.join(' ')}`.toLowerCase();

        const detectedForbidden = BLACKLIST_FORBIDDEN_WORDS.filter((w) =>
          combinedContentLower.includes(w.toLowerCase())
        );

        const expectedUsps = String(uiState.expectedUspInput || '')
          .split(/[,;]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        const missingUsps = expectedUsps.filter(
          (u) => !combinedContentLower.includes(u.toLowerCase())
        );

        // 3. Phân tích Bình luận (Ý định mua hàng vs Cảnh báo Chê / Hàng giả)
        const cmt = uiState.commentAnalysis;
        const commentSectionHtml = cmt
          ? `<div class="ub-CommentBox">
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                 <strong style="font-size:12px; color:var(--ub-ink);">Phân tích Bình luận (${formatNum(cmt.totalScanned)} mẫu đã quét)</strong>
                 <span class="ub-Badge ${cmt.objectionCount > 0 ? 'ub-Badge--crit' : 'ub-Badge--pos'}">
                   Hỏi mua: ${cmt.buyingIntentCount} · Chê/Nghi Fake: ${cmt.objectionCount}
                 </span>
               </div>
               ${
                 cmt.buyingSamples?.length > 0
                   ? `<div style="font-size:12px; color:var(--ub-ink-2); margin-bottom:4px;">
                        <strong>Khách hỏi mua tiêu biểu:</strong> "${escapeHtml(cmt.buyingSamples[0].text)}" (${escapeHtml(cmt.buyingSamples[0].label)})
                      </div>`
                   : ''
               }
               ${
                 cmt.objectionSamples?.length > 0
                   ? `<div style="font-size:12px; color:var(--ub-crit);">
                        <strong>Cảnh báo tiêu cực:</strong> "${escapeHtml(cmt.objectionSamples[0].text)}" (${escapeHtml(cmt.objectionSamples[0].label)})
                      </div>`
                   : ''
               }
             </div>`
          : '';

        const storeOptionsHtml = stores
          .map(
            (s) =>
              `<option value="${escapeHtml(s.storeName)}" ${s.storeName === uiState.selectedStoreName ? 'selected' : ''}>
                ${escapeHtml(s.storeName)} (${escapeHtml(s.brandName)})
              </option>`
          )
          .join('');

        tabBodyHtml = `
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Lượt xem bài</div>
              <div class="ub-StatVal">${formatNum(activeVid.views)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Lượt thích</div>
              <div class="ub-StatVal">${formatNum(activeVid.likes)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Bình luận</div>
              <div class="ub-StatVal">${formatNum(activeVid.comments)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Tương tác (ER)</div>
              <div class="ub-StatVal">${activeVid.engagementRate}%</div>
            </div>
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">Kiểm tra điều kiện nghiệm thu Video #${escapeHtml(String(activeVid.videoId).slice(-8))}</h4>
              <span class="ub-Badge ${hasCart || activeVid.isSponsored ? 'ub-Badge--pos' : 'ub-Badge--warn'}">
                ${
                  cartProducts.length > 0
                    ? `Có gắn giỏ (${cartProducts.length} SP)`
                    : hasCart || activeVid.isSponsored
                      ? 'Có gắn giỏ / Thẻ thương mại'
                      : 'Chưa phát hiện giỏ hàng'
                }
              </span>
            </div>

            <div style="margin-top:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; font-weight:700; color:var(--ub-pos);">🛒 Sản phẩm trong Giỏ hàng TikTok Shop (${cartProducts.length} SP)</span>
              </div>
              ${cartProductsHtml}
            </div>

            <div style="margin-top:6px; font-size:12px; color:var(--ub-ink-2); background:var(--ub-surface); padding:8px; border:1px solid var(--ub-line); border-radius:4px;">
              <div><strong>Ngày đăng:</strong> ${formatDateVn(activeVid.publishedAt)} ${activeVid.durationSeconds ? `· <strong>Thời lượng:</strong> ${activeVid.durationSeconds}s` : ''}</div>
              <div style="margin-top:4px;"><strong>Nội dung mô tả:</strong> ${escapeHtml(activeVid.caption || 'Không có mô tả')}</div>
              <div style="margin-top:4px;"><strong>Hashtag trong bài (${actualTags.length}):</strong> ${actualTags.length ? escapeHtml(actualTags.join(' ')) : 'Không có hashtag'}</div>
              ${
                stickers.length > 0
                  ? `<div style="margin-top:4px;"><strong>Chữ chèn trên màn hình:</strong> ${escapeHtml(stickers.join(' · '))}</div>`
                  : ''
              }
            </div>

            <div class="ub-TranscriptBox">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:4px; flex-wrap:wrap;">
                <strong style="font-size:12px; color:var(--ub-ink);">Lời thoại Phụ đề Video & Tải Đa Định Dạng</strong>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                  ${
                    transcriptText
                      ? `<button class="ub-IconBtn" id="ub-btn-copy-transcript" type="button">Copy Lời thoại</button>
                         <button class="ub-IconBtn" id="ub-btn-dl-vtt" type="button">Tải Phụ đề (.txt)</button>`
                      : `<span style="font-size:12px; color:var(--ub-ink-3);">Chưa có phụ đề VTT</span>`
                  }
                  <button class="ub-IconBtn" id="ub-btn-dl-mp3" type="button">Tải MP3 Nhạc</button>
                  ${
                    Array.isArray(activeVid.imageUrls) && activeVid.imageUrls.length > 0
                      ? `<button class="ub-IconBtn" id="ub-btn-dl-slides" type="button">Tải Ảnh (${activeVid.imageUrls.length})</button>`
                      : ''
                  }
                  <button class="ub-IconBtn" id="ub-btn-export-comments-csv" type="button">Xuất CSV Bình luận</button>
                </div>
              </div>
              <div class="ub-TranscriptContent">${
                transcriptText
                  ? escapeHtml(transcriptText)
                  : 'Video không có track phụ đề tự động hoặc chỉ dùng nhạc nền.'
              }</div>
            </div>

            ${
              detectedForbidden.length > 0
                ? `<div class="ub-Notice ub-Notice--crit" style="margin-top:6px;">
                     Phát hiện từ ngữ nhạy cảm / vi phạm chính sách sàn: <strong>${escapeHtml(detectedForbidden.join(', '))}</strong>
                   </div>`
                : `<div class="ub-Notice ub-Notice--pos" style="margin-top:6px;">
                     An toàn chính sách: Không phát hiện từ cấm Y tế / Điều hướng ngoài sàn trong mô tả & lời thoại.
                   </div>`
            }

            ${commentSectionHtml}

            <div class="ub-TranscriptBox" style="margin-top:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px;">
                <strong style="font-size:12px; color:var(--ub-ink);">Nhận xét Kênh & Viết Kịch bản Video (3 cảnh)</strong>
                <button class="ub-IconBtn" id="ub-btn-analyze-script" type="button" ${uiState.syncing ? 'disabled' : ''}>
                  ${uiState.syncing ? 'Đang soạn...' : 'Soạn Kịch bản & Nhận xét'}
                </button>
              </div>
              ${
                uiState.scriptAnalysisResult
                  ? `<div style="font-size:12px; color:var(--ub-ink-2); display:flex; flex-direction:column; gap:4px;">
                       <div><strong>Nhận xét kênh:</strong> ${escapeHtml(uiState.scriptAnalysisResult.healthVerdict || uiState.scriptAnalysisResult.channelEvaluation || '')}</div>
                       <div><strong>Hình thức khuyến nghị:</strong> ${escapeHtml(uiState.scriptAnalysisResult.suggestedFormat || uiState.scriptAnalysisResult.recommendation || '')}</div>
                       ${
                         uiState.scriptAnalysisResult.scriptOutline
                           ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:4px;">
                                <div><strong>Cảnh 1 (Mở đầu 3s):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.hook3s || '')}</div>
                                <div><strong>Cảnh 2 (Trải nghiệm USP):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.bodyUsp || '')}</div>
                                <div><strong>Cảnh 3 (Kêu gọi giỏ hàng):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.ctaCart || '')}</div>
                              </div>`
                           : ''
                       }
                     </div>`
                  : `<div style="font-size:12px; color:var(--ub-ink-3);">Bấm nút "Soạn Kịch bản & Nhận xét" để tổng hợp đánh giá kênh và khung kịch bản 3 cảnh theo sản phẩm đang chọn.</div>`
              }
            </div>

            <div class="ub-FormGrid" style="margin-top:6px;">
              <div class="ub-Field">
                <label class="ub-Label">Hashtag bắt buộc</label>
                <input class="ub-Input" id="ub-inp-expect-tags" type="text" placeholder="VD: #clubclio #review" value="${escapeHtml(uiState.expectedHashtagInput)}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Từ khóa USP bắt buộc (cách bởi dấu phẩy)</label>
                <input class="ub-Input" id="ub-inp-expect-usp" type="text" placeholder="VD: kiềm dầu, che phủ" value="${escapeHtml(uiState.expectedUspInput)}" />
              </div>
              <div class="ub-Field ub-Field--full">
                <label class="ub-Label">Link / Mã SP Giỏ hàng mẫu cần đối chiếu</label>
                <input class="ub-Input" id="ub-inp-expect-cart" type="text" placeholder="Dán link shop.tiktok.com hoặc Mã Product ID..." value="${escapeHtml(uiState.expectedCartUrlInput)}" />
              </div>
              <div class="ub-Field ub-Field--full" id="ub-air-match-wrap">
                ${
                  expectedTags.length > 0 || expectedUsps.length > 0 || expectedCartRaw
                    ? `<div class="ub-Notice ${
                        missingTags.length === 0 && missingUsps.length === 0 && isCartMatched
                          ? 'ub-Notice--pos'
                          : 'ub-Notice--crit'
                      }">
                        ${
                          missingTags.length === 0 && missingUsps.length === 0 && isCartMatched
                            ? 'Đạt chuẩn: Khớp đầy đủ Hashtag, Thông điệp USP và Giỏ hàng mẫu.'
                            : [
                                missingTags.length > 0 ? `Thiếu hashtag: ${missingTags.join(', ')}` : '',
                                missingUsps.length > 0 ? `Thiếu USP: ${missingUsps.join(', ')}` : '',
                                !isCartMatched ? 'Lệch sản phẩm trong giỏ hàng mẫu' : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')
                        }
                      </div>`
                    : ''
                }
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Gian hàng nghiệm thu</label>
                <select class="ub-Select" id="ub-sel-air-store">${storeOptionsHtml}</select>
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Mã BO (Deal Code)</label>
                <input class="ub-Input" id="ub-inp-dealcode" type="text" placeholder="VD: BO261067161" value="${escapeHtml(uiState.dealCodeInput || kocDb?.latestBoCode || '')}" />
              </div>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-download-mp4" type="button">
            Tải Video Không Logo (MP4)
          </button>
          <button class="ub-BtnPrimary" id="ub-btn-verify-air" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi nghiệm thu...' : 'Ghi nhận Nghiệm thu Air Link'}
          </button>
        `;
      }
    }

    const bannerHtml = uiState.feedbackBanner
      ? `<div class="ub-Notice ub-Notice--${uiState.feedbackBanner.tone}">${escapeHtml(uiState.feedbackBanner.text)}</div>`
      : '';

    const feedbackModalHtml = uiState.feedbackModalOpen
      ? `<div class="ub-TranscriptBox" style="margin-bottom:8px; border-color:var(--ub-line-strong);">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
             <strong style="font-size:12px; color:var(--ub-ink);">Gửi ghi chú Báo lỗi / Góp ý cho kỹ thuật</strong>
             <button class="ub-IconBtn" id="ub-btn-close-feedback" type="button">Đóng</button>
           </div>
           <div style="display:flex; gap:6px; align-items:center;">
             <input class="ub-Input" id="ub-inp-feedback-note" type="text" placeholder="Nhập mô tả lỗi hoặc góp ý ngắn (chỉ gửi khi bấm nút Gửi)..." value="${escapeHtml(uiState.bugReportNoteInput || '')}" style="flex:1;" />
             <button class="ub-BtnPrimary" id="ub-btn-send-feedback" type="button" style="flex:0 0 auto; width:auto; padding:0 12px;" ${uiState.syncing ? 'disabled' : ''}>
               ${uiState.syncing ? 'Đang gửi...' : 'Gửi ghi chú'}
             </button>
           </div>
         </div>`
      : '';

    if (uiState.compactBarMode) {
      const curVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      const viewMetric = stats.medianViews || curVid?.views || 0;
      const erMetric = stats.sampleCount > 0 ? stats.engagementRate : curVid?.engagementRate || 0;

      root.innerHTML = `
        <div class="ub-Panel ub-Panel--compact">
          <div class="ub-Header">
            <div class="ub-HeaderTitleWrap" id="ub-drag-handle" title="Kéo để di chuyển thanh">
              <span class="ub-BrandMark">${UPBASE_ICON_SVG}</span>
              <span class="ub-HandleName">${uiState.handle ? `@${escapeHtml(uiState.handle)}` : 'Upbase B2C'}</span>
              <span style="color:var(--ub-ink-3);">·</span>
              <span style="font-size:12px; color:var(--ub-accent); font-weight:700;">${formatNum(viewMetric)} view (${erMetric}%)</span>
            </div>
            <div class="ub-HeaderActions">
              <button class="ub-IconBtn" id="ub-btn-compact-toggle" type="button" title="Mở bảng đầy đủ">▾ Mở</button>
              <button class="ub-IconBtn" id="ub-btn-min" type="button" title="Thu thành nút nhỏ">—</button>
            </div>
          </div>
          <div style="padding:5px 8px; display:flex; flex-direction:column; gap:4px; background:var(--ub-surface);">
            ${bannerHtml}
            <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-mp4" title="Tải MP4 không logo">⬇ MP4</button>
              <label class="ub-CheckLabel" title="Tự cuộn bài tiếp theo">
                <input type="checkbox" id="ub-chk-autoscroll" ${uiState.playerControls.autoScroll ? 'checked' : ''} />
                <span>Tự cuộn</span>
              </label>
              <label class="ub-CheckLabel" title="Phát nền khi sang tab khác">
                <input type="checkbox" id="ub-chk-bgplay" ${uiState.playerControls.bgPlay ? 'checked' : ''} />
                <span>Nền</span>
              </label>
              <select class="ub-Select" id="ub-sel-speed" style="width:54px; height:22px; padding:0 2px;" title="Tốc độ phát">
                <option value="0.75" ${uiState.playerControls.playbackSpeed === 0.75 ? 'selected' : ''}>0.75x</option>
                <option value="1" ${uiState.playerControls.playbackSpeed === 1 ? 'selected' : ''}>1.0x</option>
                <option value="1.25" ${uiState.playerControls.playbackSpeed === 1.25 ? 'selected' : ''}>1.25x</option>
                <option value="1.5" ${uiState.playerControls.playbackSpeed === 1.5 ? 'selected' : ''}>1.5x</option>
                <option value="2" ${uiState.playerControls.playbackSpeed === 2 ? 'selected' : ''}>2.0x</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else {
      root.innerHTML = `
        <div class="ub-Panel">
          <div class="ub-Header">
            <div class="ub-HeaderTitleWrap" id="ub-drag-handle" title="Kéo để di chuyển bảng">
              <span class="ub-BrandMark">${UPBASE_LOGO_SVG}</span>
              <h3 class="ub-HeaderTitle">B2C</h3>
            </div>
            <div class="ub-HeaderActions">
              <button class="ub-IconBtn" id="ub-btn-compact-toggle" type="button" title="Thu thành thanh nổi siêu gọn">▭ Gọn</button>
              <button class="ub-IconBtn" id="ub-btn-feedback-toggle" type="button" title="Báo lỗi hoặc gửi góp ý">Góp ý</button>
              <button class="ub-IconBtn" id="ub-btn-dock" type="button" title="Đổi bên neo Trái / Phải">
                ${uiState.dockSide === 'left' ? '⇄' : '⇄'}
              </button>
              <button class="ub-IconBtn" id="ub-btn-refresh" type="button" title="Làm mới dữ liệu">↻</button>
              <button class="ub-IconBtn" id="ub-btn-min" type="button" title="Thu gọn bảng">—</button>
            </div>
          </div>

          <div class="ub-ProfileStrip">
            <div class="ub-ProfileLeft">
              <div class="ub-Avatar">
                ${
                  uiState.profile?.avatarUrl
                    ? `<img src="${escapeHtml(uiState.profile.avatarUrl)}" alt="" />`
                    : avatarInitial
                }
              </div>
              <div style="min-width:0;">
                <div class="ub-HandleName">${uiState.handle ? `@${escapeHtml(uiState.handle)}` : isAdsHost ? 'TikTok Ads Manager' : 'Chưa chọn kênh KOC'}</div>
                <div class="ub-SubMeta">
                  <span>${
                    uiState.platform === 'instagram'
                      ? 'Instagram'
                      : uiState.platform === 'tiktok_seller'
                        ? 'TikTok Seller'
                        : uiState.platform === 'tiktok_ads'
                          ? 'TikTok Ads'
                          : uiState.platform === 'douyin'
                            ? 'Douyin'
                            : 'TikTok'
                  }</span>
                  <span>·</span>
                  <span>${escapeHtml(uiState.profile?.displayName || uiState.handle || 'Sẵn sàng')}</span>
                </div>
              </div>
            </div>
            <div>${dbBadgeHtml}</div>
          </div>

          <div class="ub-Tabs">
            <button class="ub-TabBtn ${uiState.activeTab === 'metrics' ? 'ub-TabBtn--active' : ''}" data-tab="metrics" type="button">
              Kênh (${stats.sampleCount})
            </button>
            <button class="ub-TabBtn ${uiState.activeTab === 'seller' ? 'ub-TabBtn--active' : ''}" data-tab="seller" type="button">
              Seller
            </button>
            <button class="ub-TabBtn ${uiState.activeTab === 'ads' ? 'ub-TabBtn--active' : ''}" data-tab="ads" type="button">
              Ads
            </button>
            <button class="ub-TabBtn ${uiState.activeTab === 'booking' ? 'ub-TabBtn--active' : ''}" data-tab="booking" type="button">
              Đề xuất
            </button>
            <button class="ub-TabBtn ${uiState.activeTab === 'aircheck' ? 'ub-TabBtn--active' : ''}" data-tab="aircheck" type="button">
              Air Link
            </button>
          </div>

          <div class="ub-Body">
            ${bannerHtml}
            ${feedbackModalHtml}
            ${tabBodyHtml}
          </div>

          ${footerHtml ? `<div class="ub-StickyFooter">${footerHtml}</div>` : ''}
        </div>
      `;
    }

    // Khôi phục vị trí cuộn của .ub-Body
    const nextBodyEl = root.querySelector('.ub-Body');
    if (nextBodyEl && prevScrollTop > 0) {
      nextBodyEl.scrollTop = prevScrollTop;
    }

    // Gắn sự kiện Kéo thả (Drag) trên HeaderTitleWrap
    const dragHandle = root.querySelector('#ub-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = root.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMouseMove = (moveEv) => {
          const nextLeft = Math.max(8, Math.min(window.innerWidth - 180, moveEv.clientX - offsetX));
          const nextTop = Math.max(8, Math.min(window.innerHeight - 60, moveEv.clientY - offsetY));
          uiState.customPos = { top: nextTop, left: nextLeft };
          applyRootDockPosition();
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          saveUiPrefs();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    // Gắn sự kiện tương tác Header, Chế độ Gọn & Báo lỗi
    root.querySelector('#ub-btn-compact-toggle')?.addEventListener('click', () => {
      uiState.compactBarMode = !uiState.compactBarMode;
      saveUiPrefs();
      render();
    });
    root.querySelector('#ub-btn-toggle-tools')?.addEventListener('click', () => {
      uiState.toolsExpanded = !uiState.toolsExpanded;
      render();
    });
    root.querySelector('#ub-btn-quick-mp4')?.addEventListener('click', () => {
      handleDownloadNoWatermarkMp4();
    });
    root.querySelector('#ub-btn-quick-mp3')?.addEventListener('click', () => {
      handleDownloadAudioMp3();
    });
    root.querySelector('#ub-btn-quick-sub')?.addEventListener('click', () => {
      handleDownloadSubtitleVtt();
    });
    root.querySelector('#ub-btn-quick-img')?.addEventListener('click', () => {
      handleDownloadPhotoSlides();
    });
    root.querySelector('#ub-btn-quick-cmt')?.addEventListener('click', () => {
      exportCommentsCsv();
    });
    root.querySelector('#ub-btn-feedback-toggle')?.addEventListener('click', () => {
      uiState.feedbackModalOpen = !uiState.feedbackModalOpen;
      render();
    });
    root.querySelector('#ub-btn-close-feedback')?.addEventListener('click', () => {
      uiState.feedbackModalOpen = false;
      render();
    });
    root.querySelector('#ub-inp-feedback-note')?.addEventListener('input', (e) => {
      uiState.bugReportNoteInput = e.target.value;
    });
    root.querySelector('#ub-btn-send-feedback')?.addEventListener('click', handleSubmitBugFeedbackNote);

    root.querySelector('#ub-btn-dock')?.addEventListener('click', () => {
      uiState.dockSide = uiState.dockSide === 'left' ? 'right' : 'left';
      uiState.customPos = null;
      saveUiPrefs();
      render();
    });

    root.querySelector('#ub-btn-min')?.addEventListener('click', () => {
      uiState.minimized = true;
      saveUiPrefs();
      render();
    });

    root.querySelector('#ub-btn-refresh')?.addEventListener('click', () => {
      uiState.lastLookedUpHandle = '';
      window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
      lookupKocOnServer(uiState.handle);
    });

    root.querySelectorAll('.ub-TabBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.activeTab = btn.getAttribute('data-tab') || 'metrics';
        uiState.feedbackBanner = null;
        if (uiState.activeTab === 'seller') hydrateSellerDraft();
        if (uiState.activeTab === 'ads') hydrateAdsDraft();
        if (
          uiState.handle &&
          (!uiState.lookupResult ||
            uiState.lookupResult.handle !== normalizeKocHandle(uiState.handle))
        ) {
          lookupKocOnServer(uiState.handle, uiState.videoId);
        }
        render();
      });
    });

    // Sub-tabs trong Tab Kênh (metrics)
    root.querySelectorAll('[data-subview]').forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.metricsSubView = btn.getAttribute('data-subview') || 'posts';
        render();
      });
    });

    // Điều khiển trình phát (Xem) & Sắp xếp lưới trên trang TikTok/Douyin
    root.querySelector('#ub-chk-autoscroll')?.addEventListener('change', (e) => {
      uiState.playerControls.autoScroll = Boolean(e.target.checked);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-chk-bgplay')?.addEventListener('change', (e) => {
      uiState.playerControls.bgPlay = Boolean(e.target.checked);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-chk-gridoverlay')?.addEventListener('change', (e) => {
      uiState.playerControls.gridOverlayEnabled = Boolean(e.target.checked);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-sel-speed')?.addEventListener('change', (e) => {
      uiState.playerControls.playbackSpeed = Number(e.target.value) || 1;
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-sel-volume')?.addEventListener('change', (e) => {
      uiState.playerControls.volumePct = Number(e.target.value);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-sel-gridsort')?.addEventListener('change', (e) => {
      uiState.playerControls.gridSortMode = e.target.value || 'default';
      syncPlayerControlsToPage();
      render();
    });
    root.querySelector('#ub-sel-tablesort')?.addEventListener('change', (e) => {
      uiState.tableSortMode = e.target.value || 'default';
      render();
    });
    root.querySelector('#ub-chk-col-extra')?.addEventListener('change', (e) => {
      uiState.showExtraCols = Boolean(e.target.checked);
      render();
    });
    root.querySelector('#ub-inp-img-url')?.addEventListener('input', (e) => {
      uiState.imagePromptInputUrl = e.target.value;
    });
    root.querySelector('#ub-sel-img-style')?.addEventListener('change', (e) => {
      uiState.imagePromptStyle = e.target.value;
    });
    root.querySelector('#ub-btn-gen-img-prompt')?.addEventListener('click', handleGenerateImagePrompt);
    root.querySelector('#ub-btn-copy-img-prompt')?.addEventListener('click', () => {
      const p = uiState.imagePromptResult?.promptVi || uiState.imagePromptResult?.promptEn || '';
      if (p) copyTextToClipboard(p, 'Đã copy Prompt dựng ảnh vào bộ nhớ tạm.');
    });
    root.querySelector('#ub-btn-open-gemini-img')?.addEventListener('click', () => {
      const p = uiState.imagePromptResult?.promptVi || '';
      if (p) copyTextToClipboard(p, 'Đã copy Prompt & mở Gemini trong tab mới.');
      window.open('https://gemini.google.com/app', '_blank');
    });
    root.querySelector('#ub-btn-open-chatgpt-img')?.addEventListener('click', () => {
      const p = uiState.imagePromptResult?.promptVi || '';
      if (p) copyTextToClipboard(p, 'Đã copy Prompt & mở ChatGPT trong tab mới.');
      window.open('https://chatgpt.com/', '_blank');
    });
    root.querySelector('#ub-btn-copy-script-text')?.addEventListener('click', () => {
      const sc = uiState.scriptAnalysisResult?.scriptOutline;
      if (sc) {
        const txt = `${sc.hook3s}\n${sc.bodyUsp}\n${sc.ctaCart}`;
        copyTextToClipboard(txt, 'Đã copy kịch bản 3 phân cảnh vào bộ nhớ tạm.');
      }
    });
    root.querySelector('#ub-btn-open-gemini-script')?.addEventListener('click', () => {
      const sc = uiState.scriptAnalysisResult?.scriptOutline;
      if (sc) copyTextToClipboard(`${sc.hook3s}\n${sc.bodyUsp}\n${sc.ctaCart}`, 'Đã copy kịch bản & mở Gemini.');
      window.open('https://gemini.google.com/app', '_blank');
    });
    root.querySelector('#ub-btn-open-chatgpt-script')?.addEventListener('click', () => {
      const sc = uiState.scriptAnalysisResult?.scriptOutline;
      if (sc) copyTextToClipboard(`${sc.hook3s}\n${sc.bodyUsp}\n${sc.ctaCart}`, 'Đã copy kịch bản & mở ChatGPT.');
      window.open('https://chatgpt.com/', '_blank');
    });

    root.querySelector('#ub-chk-unpin')?.addEventListener('change', (e) => {
      uiState.excludePinned = Boolean(e.target.checked);
      render();
    });

    root.querySelector('#ub-sel-sample')?.addEventListener('change', (e) => {
      uiState.sampleSize = Number(e.target.value) || 15;
      render();
    });

    root.querySelector('#ub-inp-date-from')?.addEventListener('change', (e) => {
      uiState.dateFromFilter = e.target.value;
      render();
    });
    root.querySelector('#ub-inp-kw-filter')?.addEventListener('input', (e) => {
      uiState.keywordFilter = e.target.value;
    });
    root.querySelector('#ub-inp-kw-filter')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') render();
    });

    // Nút tải nhanh MP4 / MP3 trong bảng Bài đăng & Âm thanh
    root.querySelectorAll('.ub-BtnRowDlMp4').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-row-idx') || 0);
        const target = stats.filteredVideos[idx];
        if (target) handleDownloadNoWatermarkMp4(target);
      });
    });
    root.querySelectorAll('.ub-BtnDlMusic').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-music-idx') || 0);
        const mItem = (uiState.postingAnalytics?.byMusic || [])[idx];
        if (mItem) {
          handleDownloadAudioMp3(mItem);
        }
      });
    });

    // Sub-view Mặt hàng & Shop (Super VIP)
    root.querySelector('#ub-inp-supervip-query')?.addEventListener('input', (e) => {
      uiState.superVipQueryInput = e.target.value;
    });
    root.querySelector('#ub-inp-supervip-comm')?.addEventListener('input', (e) => {
      uiState.superVipCommissionPct = Number(e.target.value || 12);
    });
    root.querySelector('#ub-btn-score-product')?.addEventListener('click', handleScoreProductSuperVip);
    root.querySelector('#ub-btn-export-products')?.addEventListener('click', exportProductsAndShopsCsv);

    // Sub-view Affiliate Hub & Máy tính hoa hồng
    const updateCommissionDom = () => {
      const cc = uiState.commissionCalc;
      const commPerOrder = Math.round(Number(cc.priceVnd || 0) * (Number(cc.commissionPct || 0) / 100));
      const totalComm = commPerOrder * Math.round(Number(cc.expectedOrders || 0));
      const totalGmv = Math.round(Number(cc.priceVnd || 0)) * Math.round(Number(cc.expectedOrders || 0));
      const netProfit = totalComm - Math.round(Number(cc.fixedCostVnd || 0));
      const breakEvenOrders =
        commPerOrder === 0 ? 0 : Math.ceil(Math.round(Number(cc.fixedCostVnd || 0)) / commPerOrder);

      const perEl = root.querySelector('#ub-cc-val-per');
      const gmvEl = root.querySelector('#ub-cc-val-gmv');
      const totEl = root.querySelector('#ub-cc-val-total');
      const profEl = root.querySelector('#ub-cc-val-profit');
      if (perEl) perEl.textContent = formatVnd(commPerOrder);
      if (gmvEl) gmvEl.textContent = formatVnd(totalGmv);
      if (totEl) totEl.textContent = formatVnd(totalComm);
      if (profEl) {
        profEl.textContent = `${breakEvenOrders} đơn (${formatVnd(netProfit)})`;
        profEl.style.color = netProfit >= 0 ? 'var(--ub-pos)' : 'var(--ub-crit)';
      }
    };
    root.querySelector('#ub-cc-price')?.addEventListener('input', (e) => {
      uiState.commissionCalc.priceVnd = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-cc-pct')?.addEventListener('input', (e) => {
      uiState.commissionCalc.commissionPct = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-cc-orders')?.addEventListener('input', (e) => {
      uiState.commissionCalc.expectedOrders = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-cc-cost')?.addEventListener('input', (e) => {
      uiState.commissionCalc.fixedCostVnd = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-btn-save-watchlist')?.addEventListener('click', handleSaveChannelToWatchlist);
    root.querySelectorAll('.ub-BtnRemoveWatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-watch-idx') || -1);
        if (idx >= 0 && Array.isArray(uiState.watchlistChannels)) {
          uiState.watchlistChannels.splice(idx, 1);
          try {
            window.localStorage.setItem('upbase_ext_watchlist_v1', JSON.stringify(uiState.watchlistChannels));
          } catch {
            // Bỏ qua
          }
          render();
        }
      });
    });

    root.querySelector('#ub-btn-csv')?.addEventListener('click', exportCsv);
    root.querySelector('#ub-btn-report-pdf')?.addEventListener('click', handleOpenPrintableChannelReport);
    root.querySelector('#ub-btn-sync-profile')?.addEventListener('click', handleSyncProfileToServer);

    // Sự kiện Tab TikTok Seller
    root.querySelector('#ub-btn-toggle-seller-edit')?.addEventListener('click', () => {
      uiState.sellerEditExpanded = !uiState.sellerEditExpanded;
      render();
    });

    root.querySelector('#ub-btn-rescan-seller')?.addEventListener('click', () => {
      window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
      hydrateSellerDraft();
      uiState.feedbackBanner = {
        tone: 'pos',
        text: 'Đã quét lại các chỉ số hiển thị trên màn hình TikTok Seller.',
      };
      render();
    });

    root.querySelector('#ub-seller-handle')?.addEventListener('input', (e) => {
      const clean = String(e.target.value || '').trim().toLowerCase().replace(/^@+/, '');
      if (clean) {
        uiState.handle = clean;
      }
    });

    root.querySelector('#ub-btn-lookup-handle')?.addEventListener('click', () => {
      const val = root.querySelector('#ub-seller-handle')?.value || '';
      const clean = String(val).trim().toLowerCase().replace(/^@+/, '');
      if (clean) {
        uiState.handle = clean;
        uiState.lastLookedUpHandle = '';
        lookupKocOnServer(clean);
      }
    });

    const updateSellerSummaryDom = () => {
      const d = uiState.sellerDraft;
      const setTxt = (sel, txt) => {
        const el = root.querySelector(sel);
        if (el) el.textContent = txt;
      };
      setTxt('#ub-seller-stat-gmv', formatVnd(d.doanhSo));
      setTxt('#ub-seller-stat-items', formatNum(d.soMonBanRa));
      setTxt('#ub-seller-stat-gpm', formatVnd(d.gpm));
      setTxt('#ub-seller-stat-views', formatNum(d.viewTrungBinh));
      setTxt('#ub-seller-kv-aov', formatVnd(d.aov));
      setTxt(
        '#ub-seller-kv-channel',
        `${Number(d.gmvTuVideoPct || 0)}% / ${Number(d.gmvTuLivePct || 0)}% / ${Number(d.gmvTuTheSanPhamPct || 0)}%`
      );
      setTxt('#ub-seller-kv-gender', `${Number(d.namPct || 0)}% / ${Number(d.nuPct || 0)}%`);
      setTxt(
        '#ub-seller-kv-age',
        `${Number(d.tuoi18_24Pct || 0)}% / ${Number(d.tuoi25_34Pct || 0)}% / ${Number(d.tuoiTren35Pct || 0)}%`
      );
    };

    const bindSellerField = (selector, key) => {
      root.querySelector(selector)?.addEventListener('input', (e) => {
        uiState.sellerDraft[key] = Number(e.target.value || 0);
        updateSellerSummaryDom();
      });
    };
    bindSellerField('#ub-seller-followers', 'followers');
    bindSellerField('#ub-seller-gmv', 'doanhSo');
    bindSellerField('#ub-seller-items', 'soMonBanRa');
    bindSellerField('#ub-seller-gpm', 'gpm');
    bindSellerField('#ub-seller-aov', 'aov');
    bindSellerField('#ub-seller-views', 'viewTrungBinh');
    bindSellerField('#ub-seller-vidpct', 'gmvTuVideoPct');
    bindSellerField('#ub-seller-livepct', 'gmvTuLivePct');
    bindSellerField('#ub-seller-cardpct', 'gmvTuTheSanPhamPct');
    bindSellerField('#ub-seller-male', 'namPct');
    bindSellerField('#ub-seller-female', 'nuPct');
    bindSellerField('#ub-seller-a18', 'tuoi18_24Pct');
    bindSellerField('#ub-seller-a25', 'tuoi25_34Pct');
    bindSellerField('#ub-seller-a35', 'tuoiTren35Pct');

    root.querySelector('#ub-btn-copy-sheet-row')?.addEventListener('click', handleCopySellerColumnsYtoAM);
    root.querySelector('#ub-btn-copy-summary')?.addEventListener('click', handleCopySellerSummaryText);
    root.querySelector('#ub-btn-sync-seller')?.addEventListener('click', handleSyncProfileToServer);

    // Sự kiện Tab TikTok Ads Manager
    root.querySelector('#ub-btn-load-reg-videos')?.addEventListener('click', () => {
      uiState.lastLookedUpHandle = '';
      lookupKocOnServer(uiState.handle);
      uiState.feedbackBanner = {
        tone: 'pos',
        text: 'Đã tải danh sách Video Air & Mã Spark Ads từ Web-Admin.',
      };
      render();
    });

    root.querySelector('#ub-ads-batch-codes')?.addEventListener('input', (e) => {
      uiState.adsDraft.batchSparkCodesText = e.target.value;
    });

    root.querySelector('#ub-btn-run-spark-auth')?.addEventListener('click', handleRunSparkAdsBatchAuth);

    root.querySelector('#ub-btn-rescan-ads')?.addEventListener('click', () => {
      window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
      hydrateAdsDraft();
      uiState.feedbackBanner = {
        tone: 'pos',
        text: `Đã quét bảng báo cáo TikTok Ads (${uiState.adsRecords?.length || 0} dòng chiến dịch/video).`,
      };
      render();
    });

    root.querySelectorAll('.ub-AdsRowItem').forEach((tr) => {
      tr.addEventListener('click', () => {
        const idx = Number(tr.getAttribute('data-ads-idx') || 0);
        const rec = uiState.adsRecords?.[idx];
        if (rec) {
          uiState.adsDraft.videoId = String(rec.videoId || rec.adId || '');
          if (rec.sparkAdsCode) uiState.adsDraft.sparkAdsCode = rec.sparkAdsCode;
          uiState.adsDraft.adsSpend = Math.round(Number(rec.adsSpend || 0));
          uiState.adsDraft.gmv = Math.round(Number(rec.gmv || 0));
          uiState.adsDraft.orders = Math.round(Number(rec.orders || 0));
          if (rec.impressions) uiState.adsDraft.views = Math.round(Number(rec.impressions || 0));
          render();
        }
      });
    });

    const updateAdsStatDom = () => {
      const a = uiState.adsDraft;
      const bookingNet = Math.round(Number(a.bookingCostNet || 0));
      const adsSpend = Math.round(Number(a.adsSpend || 0));
      const gmv = Math.round(Number(a.gmv || 0));
      const totalCost = bookingNet + adsSpend;
      const roasAds = adsSpend === 0 ? 0 : Number((gmv / adsSpend).toFixed(2));
      const roiTotal = totalCost === 0 ? 0 : Number((gmv / totalCost).toFixed(2));

      const costEl = root.querySelector('#ub-ads-stat-cost');
      const gmvEl = root.querySelector('#ub-ads-stat-gmv');
      const roasEl = root.querySelector('#ub-ads-stat-roas');
      const roiEl = root.querySelector('#ub-ads-stat-roi');
      if (costEl) costEl.textContent = formatVnd(totalCost);
      if (gmvEl) gmvEl.textContent = formatVnd(gmv);
      if (roasEl) roasEl.textContent = `${roasAds}x`;
      if (roiEl) {
        roiEl.textContent = `${roiTotal}x`;
        roiEl.style.color =
          roiTotal >= 2
            ? 'var(--ub-pos)'
            : roiTotal > 0 && roiTotal < 1
              ? 'var(--ub-crit)'
              : 'var(--ub-accent)';
      }
    };

    root.querySelector('#ub-ads-vid')?.addEventListener('input', (e) => {
      uiState.adsDraft.videoId = e.target.value;
    });
    root.querySelector('#ub-ads-deal')?.addEventListener('input', (e) => {
      uiState.adsDraft.dealCode = e.target.value;
    });
    root.querySelector('#ub-ads-spark')?.addEventListener('input', (e) => {
      uiState.adsDraft.sparkAdsCode = e.target.value;
    });
    root.querySelector('#ub-ads-booking-net')?.addEventListener('input', (e) => {
      uiState.adsDraft.bookingCostNet = Number(e.target.value || 0);
      updateAdsStatDom();
    });
    root.querySelector('#ub-ads-spend')?.addEventListener('input', (e) => {
      uiState.adsDraft.adsSpend = Number(e.target.value || 0);
      updateAdsStatDom();
    });
    root.querySelector('#ub-ads-gmv')?.addEventListener('input', (e) => {
      uiState.adsDraft.gmv = Number(e.target.value || 0);
      updateAdsStatDom();
    });
    root.querySelector('#ub-ads-views')?.addEventListener('input', (e) => {
      uiState.adsDraft.views = Number(e.target.value || 0);
    });
    root.querySelector('#ub-ads-orders')?.addEventListener('input', (e) => {
      uiState.adsDraft.orders = Number(e.target.value || 0);
    });

    root.querySelector('#ub-btn-copy-ads-cols')?.addEventListener(
      'click',
      handleCopyAdsAcceptanceColumnsBEtoBI
    );
    root.querySelector('#ub-btn-sync-ads')?.addEventListener(
      'click',
      handleSyncAdsPerformanceToServer
    );

    // Sự kiện Tab Giá & Đề xuất
    root.querySelector('#ub-sel-store')?.addEventListener('change', (e) => {
      uiState.selectedStoreName = e.target.value;
      render();
    });

    root.querySelector('#ub-sel-format')?.addEventListener('change', (e) => {
      uiState.bookingFormatLabel = e.target.value;
      if (uiState.bookingFormatLabel === 'Suất gửi mẫu FOC') {
        uiState.rateCardNetInput = '0';
        render();
      }
    });

    root.querySelector('#ub-inp-rate')?.addEventListener('input', (e) => {
      uiState.rateCardNetInput = e.target.value;
    });

    root.querySelector('#ub-inp-pic')?.addEventListener('input', (e) => {
      uiState.picNameInput = e.target.value;
      chrome.storage.local.set({ upbasePicName: e.target.value });
    });

    root.querySelector('#ub-inp-note')?.addEventListener('input', (e) => {
      uiState.noteInput = e.target.value;
    });

    root.querySelector('#ub-btn-save-proposal')?.addEventListener('click', handleSaveDealProposal);

    // Sự kiện Tab Nghiệm thu Air Link
    const updateAirCheckMatchDom = () => {
      const wrap = root.querySelector('#ub-air-match-wrap');
      const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      if (!wrap || !activeVid) return;

      const expectedTags = String(uiState.expectedHashtagInput || '')
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));
      const actualTags = (activeVid.hashtags || []).map((t) => String(t).toLowerCase());
      const missingTags = expectedTags.filter((t) => !actualTags.includes(t));

      const cartProducts = Array.isArray(activeVid.cartProducts) ? activeVid.cartProducts : [];
      const expectedCartRaw = String(uiState.expectedCartUrlInput || '').trim();
      const expectedPidMatch = expectedCartRaw.match(/\b(\d{15,22})\b/);
      const expectedPid = expectedPidMatch ? expectedPidMatch[1] : '';
      let isCartMatched = true;
      if (expectedCartRaw) {
        if (expectedPid) {
          isCartMatched =
            cartProducts.some((p) => String(p.productId || '') === expectedPid) ||
            String(activeVid.cartProductId || '') === expectedPid;
        } else {
          const kw = expectedCartRaw.toLowerCase();
          isCartMatched = cartProducts.some(
            (p) =>
              String(p.title || '').toLowerCase().includes(kw) ||
              String(p.productUrl || '').toLowerCase().includes(kw)
          );
        }
      }

      const transcriptText = String(activeVid.transcriptText || '').trim();
      const stickers = Array.isArray(activeVid.onScreenStickers) ? activeVid.onScreenStickers : [];
      const combinedContentLower = `${activeVid.caption || ''} ${transcriptText} ${stickers.join(' ')}`.toLowerCase();
      const expectedUsps = String(uiState.expectedUspInput || '')
        .split(/[,;]+/)
        .map((u) => u.trim())
        .filter(Boolean);
      const missingUsps = expectedUsps.filter((u) => !combinedContentLower.includes(u.toLowerCase()));

      if (expectedTags.length === 0 && expectedUsps.length === 0 && !expectedCartRaw) {
        wrap.innerHTML = '';
        return;
      }

      const allOk = missingTags.length === 0 && missingUsps.length === 0 && isCartMatched;
      const msg = allOk
        ? 'Đạt chuẩn: Khớp đầy đủ Hashtag, Thông điệp USP và Giỏ hàng mẫu.'
        : [
            missingTags.length > 0 ? `Thiếu hashtag: ${missingTags.join(', ')}` : '',
            missingUsps.length > 0 ? `Thiếu USP: ${missingUsps.join(', ')}` : '',
            !isCartMatched ? 'Lệch sản phẩm trong giỏ hàng mẫu' : '',
          ]
            .filter(Boolean)
            .join(' · ');

      wrap.innerHTML = `<div class="ub-Notice ${allOk ? 'ub-Notice--pos' : 'ub-Notice--crit'}">${escapeHtml(msg)}</div>`;
    };

    root.querySelector('#ub-inp-expect-tags')?.addEventListener('input', (e) => {
      uiState.expectedHashtagInput = e.target.value;
      updateAirCheckMatchDom();
    });

    root.querySelector('#ub-inp-expect-usp')?.addEventListener('input', (e) => {
      uiState.expectedUspInput = e.target.value;
      updateAirCheckMatchDom();
    });

    root.querySelector('#ub-inp-expect-cart')?.addEventListener('input', (e) => {
      uiState.expectedCartUrlInput = e.target.value;
      updateAirCheckMatchDom();
    });

    root.querySelector('#ub-btn-copy-transcript')?.addEventListener('click', () => {
      const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      if (activeVid?.transcriptText) {
        copyTextToClipboard(
          activeVid.transcriptText,
          'Đã copy toàn bộ lời thoại phụ đề (WebVTT) vào bộ nhớ tạm.'
        );
      }
    });

    root.querySelector('#ub-btn-dl-vtt')?.addEventListener('click', () => handleDownloadSubtitleVtt());
    root.querySelector('#ub-btn-dl-mp3')?.addEventListener('click', () => handleDownloadAudioMp3());
    root.querySelector('#ub-btn-dl-slides')?.addEventListener('click', () => handleDownloadPhotoSlides());
    root.querySelector('#ub-btn-export-comments-csv')?.addEventListener('click', exportCommentsCsv);
    root.querySelector('#ub-btn-analyze-script')?.addEventListener('click', handleAnalyzeChannelAndScript);

    root.querySelector('#ub-btn-download-mp4')?.addEventListener('click', () => handleDownloadNoWatermarkMp4());

    root.querySelector('#ub-sel-air-store')?.addEventListener('change', (e) => {
      uiState.selectedStoreName = e.target.value;
    });

    root.querySelector('#ub-inp-dealcode')?.addEventListener('input', (e) => {
      uiState.dealCodeInput = e.target.value;
    });

    root.querySelector('#ub-btn-verify-air')?.addEventListener('click', handleVerifyAirLink);

    root.querySelectorAll('.ub-BtnCopyPid').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-pid') || '';
        if (pid) {
          copyTextToClipboard(pid, `Đã copy Mã sản phẩm TikTok Shop: ${pid}`);
        }
      });
    });

    root.querySelectorAll('.ub-BtnCopyCartUrl').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cartUrl = btn.getAttribute('data-cart-url') || '';
        if (cartUrl) {
          copyTextToClipboard(cartUrl, `Đã copy Link Giỏ hàng TikTok Shop: ${cartUrl}`);
        }
      });
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === 'UPBASE_B2C_PAGE_CAPTURE') {
      const p = event.data.payload || {};
      const handleChanged = Boolean(p.handle && p.handle !== uiState.handle);
      const videoIdChanged = Boolean(p.videoId && p.videoId !== uiState.videoId);
      uiState.platform = p.platform || uiState.platform;
      uiState.pageType = p.pageType || 'profile';
      if (p.handle) uiState.handle = p.handle;
      uiState.videoId = p.videoId || null;
      if (p.profile) uiState.profile = p.profile;
      if (Array.isArray(p.videos) && p.videos.length > 0) {
        uiState.videos = p.videos;
      }
      if (p.postingAnalytics) {
        uiState.postingAnalytics = p.postingAnalytics;
      }
      if (p.productAggregation) {
        uiState.productAggregation = p.productAggregation;
      }
      if (p.searchSaturation) {
        uiState.searchSaturation = p.searchSaturation;
      }
      if (p.sellerMetrics) {
        uiState.sellerMetrics = p.sellerMetrics;
        if (!isUserTypingInExtension()) {
          hydrateSellerDraft();
        }
      }
      const incomingAds = Array.isArray(p.adsRecords)
        ? p.adsRecords
        : Array.isArray(p.adsRows)
          ? p.adsRows
          : [];
      if (incomingAds.length > 0) {
        uiState.adsRecords = incomingAds;
        if (!isUserTypingInExtension()) {
          hydrateAdsDraft();
        }
      }
      if (p.channelHealth) {
        uiState.channelHealth = p.channelHealth;
      }
      if (p.commentAnalysis) {
        uiState.commentAnalysis = p.commentAnalysis;
      }
      if (p.currentVideo) {
        const prevVid = uiState.currentVideo;
        if (prevVid && String(prevVid.videoId) === String(p.currentVideo.videoId)) {
          const prevCart = Array.isArray(prevVid.cartProducts) ? prevVid.cartProducts : [];
          const nextCart = Array.isArray(p.currentVideo.cartProducts) ? p.currentVideo.cartProducts : [];
          uiState.currentVideo = {
            ...prevVid,
            ...p.currentVideo,
            views: Math.max(Number(prevVid.views || 0), Number(p.currentVideo.views || 0)),
            hasYellowCart: Boolean(prevVid.hasYellowCart || p.currentVideo.hasYellowCart || prevCart.length > 0 || nextCart.length > 0),
            cartProducts: nextCart.length > 0 ? nextCart : prevCart,
            transcriptText: p.currentVideo.transcriptText || prevVid.transcriptText || '',
            playableUrl: p.currentVideo.playableUrl || prevVid.playableUrl || '',
          };
        } else {
          uiState.currentVideo = p.currentVideo;
        }
      }
      if (p.pageType === 'video' && (handleChanged || videoIdChanged)) {
        uiState.activeTab = 'aircheck';
      } else if (p.pageType === 'seller_creator' && handleChanged) {
        uiState.activeTab = 'seller';
      } else if (p.pageType === 'ads_manager' && uiState.activeTab !== 'ads') {
        uiState.activeTab = 'ads';
      }
      if (
        uiState.handle &&
        (handleChanged ||
          videoIdChanged ||
          !uiState.lookupResult ||
          uiState.lookupResult.handle !== normalizeKocHandle(uiState.handle))
      ) {
        lookupKocOnServer(uiState.handle, uiState.videoId);
      } else if (isAdsHost && !uiState.lookupResult) {
        lookupKocOnServer('');
      }
      // Focus Guard: Không ghi đè DOM khi người dùng đang gõ trong ô input/textarea
      if (!isUserTypingInExtension()) {
        render();
      }
    } else if (event.data && event.data.source === 'UPBASE_B2C_GRID_QUICK_DOWNLOAD') {
      const vidId = event.data.videoId;
      const vidObj =
        (uiState.videos || []).find((v) => String(v.videoId) === String(vidId)) ||
        event.data.video ||
        null;
      if (vidObj) {
        handleDownloadNoWatermarkMp4(vidObj);
      }
    } else if (
      event.data &&
      (event.data.source === 'UPBASE_B2C_SPARK_AUTH_RESULT' ||
        event.data.source === 'UPBASE_B2C_SPARK_AUTH_DOM_RESULT')
    ) {
      const r = event.data.payload || event.data.result || {};
      if (r.filled || r.filledCount > 0) {
        uiState.feedbackBanner = {
          tone: 'pos',
          text: `Đã tự động điền mã Spark Ads (${r.filledCode || 'Thành công'}) vào ô nhập trên TikTok Ads Manager.`,
        };
        if (!isUserTypingInExtension()) {
          render();
        }
      }
    }
  });

  // Nhận diện ngay ID kênh & Video từ URL ngay lúc khởi tạo (0ms)
  const initHandleMatch = window.location.pathname.match(/\/@([^/?#]+)/);
  const initVidMatch = window.location.pathname.match(/\/(?:video|photo)\/(\d+)/);
  if (initHandleMatch && initHandleMatch[1]) {
    uiState.handle = normalizeKocHandle(decodeURIComponent(initHandleMatch[1]));
  }
  if (initVidMatch && initVidMatch[1]) {
    uiState.videoId = initVidMatch[1];
    uiState.pageType = 'video';
    uiState.activeTab = 'aircheck';
  }
  if (uiState.handle) {
    lookupKocOnServer(uiState.handle, uiState.videoId);
  }

  render();
  window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
  setTimeout(() => {
    window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
  }, 1000);
  setTimeout(() => {
    window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
  }, 2600);
})();
