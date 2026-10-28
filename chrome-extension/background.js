const DEFAULT_SERVER_URL = 'http://localhost:3000';

let cachedMasterDbPromise = null;

function normalizeHandle(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

function stripHandlePunct(raw) {
  return normalizeHandle(raw).replace(/[._-]+/g, '');
}

function dedupeHandleLetters(raw) {
  return stripHandlePunct(raw).replace(/([a-z])\1+/g, '$1');
}

function inflateTupleToKoc(tuple) {
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

async function getLocalMasterDb() {
  if (!cachedMasterDbPromise) {
    cachedMasterDbPromise = (async () => {
      try {
        if (typeof chrome === 'undefined' || typeof chrome?.runtime?.getURL !== 'function') {
          return { byExact: new Map(), byStripped: new Map(), byFuzzy: new Map(), stores: [] };
        }
        const url = chrome.runtime.getURL('koc-master-db.json');
        const res = await fetch(url);
        const raw = await res.json();
        const kocsMap = raw?.kocs || {};
        const stores = Array.isArray(raw?.stores) ? raw.stores : [];
        const byExact = new Map();
        const byStripped = new Map();
        const byFuzzy = new Map();

        for (const [key, tuple] of Object.entries(kocsMap)) {
          const clean = normalizeHandle(key);
          if (!clean || !Array.isArray(tuple)) continue;
          const dealsCount = Number(tuple[14] || 0);

          const prevExact = byExact.get(clean);
          if (!prevExact || Number(prevExact[14] || 0) < dealsCount) {
            byExact.set(clean, tuple);
          }

          const stripped = stripHandlePunct(clean);
          if (stripped) {
            const prevStripped = byStripped.get(stripped);
            if (!prevStripped || Number(prevStripped[14] || 0) < dealsCount) {
              byStripped.set(stripped, tuple);
            }
          }

          const fuzzy = dedupeHandleLetters(clean);
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
  return cachedMasterDbPromise;
}

async function lookupLocalMasterKoc(rawHandle) {
  const db = await getLocalMasterDb();
  const clean = normalizeHandle(rawHandle);
  if (!clean) {
    return {
      success: true,
      handle: '',
      foundInMaster: false,
      sourceType: 'LOCAL_MASTER_DB',
      koc: null,
      recentDeals: [],
      stores: db.stores,
      registeredVideos: [],
    };
  }

  let matchedTuple = db.byExact.get(clean) || null;
  const strippedTuple = db.byStripped.get(stripHandlePunct(clean)) || null;
  const fuzzyTuple = db.byFuzzy.get(dedupeHandleLetters(clean)) || null;

  // Ưu tiên bản ghi có số lượng BO lịch sử đầy đủ hơn khi trùng tên kênh biến thể (VD: po.trann77 vs po.tran77)
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

  const koc = matchedTuple ? inflateTupleToKoc(matchedTuple) : null;
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

async function getServerBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['upbaseServerUrl'], (res) => {
      const url = String(res?.upbaseServerUrl || DEFAULT_SERVER_URL)
        .trim()
        .replace(/\/+$/, '');
      resolve(url || DEFAULT_SERVER_URL);
    });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'UPBASE_LOOKUP_KOC') {
    (async () => {
      const rawHandle = String(message.handle || '').trim();
      const localFallback = await lookupLocalMasterKoc(rawHandle);

      try {
        const baseUrl = await getServerBaseUrl();
        const handle = encodeURIComponent(rawHandle);
        const platform = encodeURIComponent(String(message.platform || 'tiktok').trim());
        const videoId = encodeURIComponent(String(message.videoId || '').trim());
        const videoUrl = encodeURIComponent(String(message.videoUrl || '').trim());
        const extraQs =
          (videoId ? `&videoId=${videoId}` : '') + (videoUrl ? `&videoUrl=${videoUrl}` : '');

        const controller =
          typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer =
          controller && typeof setTimeout === 'function'
            ? setTimeout(() => controller.abort(), 2500)
            : null;
        const fetchOpts = {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Upbase-Ext-Version': '1.4.0',
          },
          cache: 'no-store',
        };
        if (controller) fetchOpts.signal = controller.signal;
        const res = await fetch(
          `${baseUrl}/api/extension/koc-sync?handle=${handle}&platform=${platform}${extraQs}`,
          fetchOpts
        );
        if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
        const data = await res.json();

        if (res.ok && data?.success) {
          if (!data.foundInMaster && localFallback.foundInMaster) {
            data.foundInMaster = true;
            data.koc = localFallback.koc;
            data.recentDeals = localFallback.recentDeals;
          }
          if (!Array.isArray(data.stores) || data.stores.length === 0) {
            data.stores = localFallback.stores;
          }
          sendResponse({ ok: true, status: res.status, data });
          return;
        }
        sendResponse({ ok: true, status: 200, data: localFallback });
      } catch {
        // Fallback 100% sang Master Data nhúng sẵn trong Extension khi chưa bật localhost:3000
        sendResponse({ ok: true, status: 200, data: localFallback });
      }
    })();
    return true;
  }

  if (message.type === 'UPBASE_SYNC_ACTION') {
    (async () => {
      try {
        const baseUrl = await getServerBaseUrl();
        const controller =
          typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer =
          controller && typeof setTimeout === 'function'
            ? setTimeout(() => controller.abort(), 3500)
            : null;
        const fetchOpts = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Upbase-Ext-Version': '1.4.0',
          },
          body: JSON.stringify(message.payload || {}),
        };
        if (controller) fetchOpts.signal = controller.signal;
        const res = await fetch(`${baseUrl}/api/extension/koc-sync`, fetchOpts);
        if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
        const data = await res.json();
        sendResponse({ ok: res.ok, status: res.status, data });
      } catch (err) {
        const errMsg = err && typeof err.message === 'string' ? err.message : '';
        const payload = message.payload || {};
        if (typeof chrome?.storage?.local?.set === 'function') {
          chrome.storage.local.get(['upbaseOfflineSyncQueue'], (stored) => {
            const queue = Array.isArray(stored?.upbaseOfflineSyncQueue)
              ? stored.upbaseOfflineSyncQueue
              : [];
            queue.unshift({
              ...payload,
              savedAt: new Date().toISOString(),
            });
            chrome.storage.local.set({ upbaseOfflineSyncQueue: queue.slice(0, 200) }, () => {
              sendResponse({
                ok: true,
                status: 200,
                offlineQueued: true,
                error: errMsg
                  ? `Không gửi được dữ liệu về máy chủ Upbase B2C: ${errMsg}`
                  : 'Lỗi gửi dữ liệu về máy chủ.',
                data: {
                  success: true,
                  offlineQueued: true,
                  message:
                    'Đã lưu hồ sơ/đề xuất vào bộ nhớ Extension (Tự động đồng bộ khi mở Web-Admin).',
                },
              });
            });
          });
        } else {
          sendResponse({
            ok: false,
            status: 0,
            error: errMsg
              ? `Không gửi được dữ liệu về máy chủ Upbase B2C: ${errMsg}`
              : 'Lỗi gửi dữ liệu về máy chủ.',
          });
        }
      }
    })();
    return true;
  }

  if (
    message.type === 'UPBASE_DOWNLOAD_VIDEO' ||
    message.type === 'UPBASE_DOWNLOAD_MEDIA' ||
    message.type === 'DOWNLOAD_MEDIA_FILE'
  ) {
    (async () => {
      try {
        const url = String(message.url || '').trim();
        const filename = String(message.filename || `Upbase_Media_${Date.now()}.mp4`).replace(
          /[\\/:*?"<>|]+/g,
          '_'
        );
        if (!url) {
          sendResponse({ ok: false, error: 'Chưa tìm thấy luồng tệp phương tiện gốc.' });
          return;
        }
        chrome.downloads.download(
          {
            url,
            filename,
            saveAs: false,
          },
          (downloadId) => {
            if (chrome.runtime.lastError || !downloadId) {
              sendResponse({
                ok: false,
                error: chrome.runtime.lastError?.message || 'Trình duyệt từ chối tải xuống.',
              });
            } else {
              sendResponse({ ok: true, downloadId });
            }
          }
        );
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Lỗi tải tệp phương tiện.',
        });
      }
    })();
    return true;
  }

  return false;
});
