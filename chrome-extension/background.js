const DEFAULT_SERVER_URL = 'http://localhost:3000';
const pendingAutoVerifyTabWaiters = new Map();

function normalizeHandle(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

function getSafeDisconnectedKocResponse(rawHandle) {
  const clean = normalizeHandle(rawHandle);
  return {
    success: true,
    handle: clean,
    foundInMaster: false,
    sourceType: 'API_DISCONNECTED',
    koc: null,
    recentDeals: [],
    stores: [],
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
      const offlineFallback = getSafeDisconnectedKocResponse(rawHandle);

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
            ? setTimeout(() => controller.abort(), 3500)
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
          sendResponse({ ok: true, status: res.status, data });
          return;
        }
        sendResponse({
          ok: true,
          status: 200,
          data: {
            ...offlineFallback,
            sourceType: 'NEW_DISCOVERY',
            error: data?.error || 'Không tìm thấy KOC trong hệ thống',
          },
        });
      } catch (err) {
        // Fallback an toàn khi máy chủ chưa kết nối, không crash và không lộ dữ liệu
        sendResponse({
          ok: true,
          status: 200,
          data: {
            ...offlineFallback,
            offlineFallback: true,
            error: err?.message || 'Không kết nối được máy chủ',
          },
        });
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

  if (message.type === 'UPBASE_CAPTURE_TAB') {
    (async () => {
      try {
        chrome.tabs.captureVisibleTab(
          null,
          { format: 'jpeg', quality: 92 },
          (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              sendResponse({
                ok: false,
                error: chrome.runtime.lastError?.message || 'Không thể chụp ảnh màn hình tab hiện tại.',
              });
            } else {
              sendResponse({ ok: true, dataUrl });
            }
          }
        );
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || 'Lỗi chụp ảnh màn hình.' });
      }
    })();
    return true;
  }

  if (message.type === 'UPBASE_DOWNLOAD_DATA_URL') {
    (async () => {
      try {
        const dataUrl = String(message.dataUrl || '').trim();
        const filename = String(message.filename || `Upbase_Anh_NghiemThu_${Date.now()}.jpg`).replace(
          /[\\/:*?"<>|]+/g,
          '_'
        );
        if (!dataUrl) {
          sendResponse({ ok: false, error: 'Thiếu dữ liệu ảnh dataUrl.' });
          return;
        }
        chrome.downloads.download(
          {
            url: dataUrl,
            filename,
            saveAs: false,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ ok: true, downloadId });
            }
          }
        );
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || 'Lỗi tải ảnh về máy.' });
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
        let rawUrl = String(message.url || '').trim();
        const postUrl = String(message.postUrl || '').trim();
        const filename = String(message.filename || `Upbase_Media_${Date.now()}.mp4`).replace(
          /[\\/:*?"<>|]+/g,
          '_'
        );

        // Loại bỏ tham số cắt đoạn DASH/MSE (bytestart, byteend) của CDN Meta để tải trọn vẹn file MP4
        const stripMetaRange = (u) =>
          String(u || '')
            .replace(/[&?](?:bytestart|byteend)=[^&]*/gi, '')
            .replace(/[?&]$/, '');

        const extractMetaVideoFromEmbedHtml = (html) => {
          if (!html || typeof html !== 'string') return '';
          const dec = (s) =>
            String(s || '')
              .replace(/\\u0026/g, '&')
              .replace(/\\u00253D/g, '%3D')
              .replace(/\\\//g, '/')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"');
          const candidates = [];
          let m;
          const patterns = [
            /\\"playable_url_quality_hd\\":\\"(https:[^"\\]+(?:\\.[^"\\]+)*)\\"/g,
            /\\"browser_native_hd_url\\":\\"(https:[^"\\]+(?:\\.[^"\\]+)*)\\"/g,
            /\\"progressive_url\\":\\"(https:[^"\\]+(?:\\.[^"\\]+)*)\\"/g,
            /\\"video_url\\":\\"(https:[^"\\]+(?:\\.[^"\\]+)*)\\"/g,
            /\\"playable_url\\":\\"(https:[^"\\]+(?:\\.[^"\\]+)*)\\"/g,
            /\\"browser_native_sd_url\\":\\"(https:[^"\\]+(?:\\.[^"\\]+)*)\\"/g,
            /<source\s+[^>]*src="([^"]+)"/gi,
            /<video\s+[^>]*src="([^"]+)"/gi,
            /https:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi,
          ];
          for (const re of patterns) {
            while ((m = re.exec(html)) !== null) {
              const u = stripMetaRange(dec(m[1] || m[0]).split('\\')[0]);
              if (
                u.startsWith('https://') &&
                !u.startsWith('blob:') &&
                (u.includes('cdninstagram') || u.includes('fbcdn') || u.includes('.mp4')) &&
                !candidates.includes(u)
              ) {
                candidates.push(u);
              }
            }
          }
          return candidates[0] || '';
        };

        const resolveMetaPageToDirectMp4 = async (pageUrl) => {
          if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) return '';
          const clean = pageUrl.split('?')[0].replace(/\/(media|embed|captioned)?\/?$/i, '');
          const urlsToTry = [];
          if (/threads\.(net|com)/i.test(clean)) {
            urlsToTry.push(`${clean}/embed`);
          } else if (/instagram\.com\/(?:p|reel|reels)\//i.test(clean)) {
            urlsToTry.push(`${clean}/embed/captioned/`);
            urlsToTry.push(`${clean}/embed/`);
          }
          urlsToTry.push(pageUrl);
          for (const target of urlsToTry) {
            try {
              const r = await fetch(target, {
                method: 'GET',
                credentials: 'omit',
                headers: {
                  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
              });
              if (!r.ok) continue;
              const html = await r.text();
              const found = extractMetaVideoFromEmbedHtml(html);
              if (found) return found;
            } catch {
              // Thử tiếp URL dự phòng
            }
          }
          return '';
        };

        if (rawUrl && !rawUrl.startsWith('blob:')) {
          rawUrl = stripMetaRange(rawUrl);
        }

        const resolveTikTokPageToDirectMedia = async (pageUrl) => {
          if (!pageUrl || !/tiktok\.com/i.test(pageUrl)) return { url: '', isImage: false };
          // Tầng 1: Bóc tách luồng MP4 HD không logo (hoặc ảnh Photo Slide) qua TikWM API
          try {
            const apiRes = await fetch(
              `https://www.tikwm.com/api/?url=${encodeURIComponent(pageUrl)}&hd=1`,
              {
                method: 'GET',
                credentials: 'omit',
                headers: { Accept: 'application/json' },
              }
            );
            if (apiRes.ok) {
              const json = await apiRes.json();
              const d = json?.data;
              if (d) {
                if (Array.isArray(d.images) && d.images.length > 0 && d.images[0]) {
                  return { url: String(d.images[0]), isImage: true };
                }
                const hdCandidate = d.hdplay || d.play || d.wmplay || '';
                if (typeof hdCandidate === 'string' && hdCandidate.startsWith('http')) {
                  return { url: hdCandidate, isImage: false };
                }
              }
            }
          } catch {
            // Chuyển sang Tầng 2 nếu API phụ không phản hồi
          }

          // Tầng 2: Bóc tách trực tiếp từ __UNIVERSAL_DATA_FOR_REHYDRATION__ của trang TikTok
          try {
            const htmlRes = await fetch(pageUrl, {
              method: 'GET',
              credentials: 'include',
              headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });
            if (htmlRes.ok) {
              const html = await htmlRes.text();
              const m = html.match(
                /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
              );
              if (m && m[1]) {
                const parsed = JSON.parse(m[1]);
                const scope = parsed?.__DEFAULT_SCOPE__ || {};
                const item =
                  scope?.['webapp.video-detail']?.itemInfo?.itemStruct ||
                  scope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct ||
                  null;
                const v = item?.video || {};
                const pickHttp = (cand) => {
                  if (!cand) return '';
                  if (typeof cand === 'string' && cand.startsWith('http')) return cand;
                  const arr = cand.UrlList || cand.urlList || cand.url_list || [];
                  return Array.isArray(arr) ? arr.find((u) => typeof u === 'string' && u.startsWith('http')) || '' : '';
                };
                const directMp4 =
                  pickHttp(v.playAddr) ||
                  pickHttp(v.PlayAddrStruct) ||
                  pickHttp(v.bitrateInfo?.[0]?.PlayAddr) ||
                  pickHttp(v.downloadAddr) ||
                  '';
                if (directMp4) return { url: directMp4, isImage: false };
                const firstImg = item?.imagePost?.images?.[0]?.imageURL?.urlList?.[0] || '';
                if (firstImg && firstImg.startsWith('http')) {
                  return { url: firstImg, isImage: true };
                }
              }
            }
          } catch {
            // Bỏ qua
          }
          return { url: '', isImage: false };
        };

        const isTikTokPostLink =
          /tiktok\.com\/@[^/]+\/(?:video|photo)\/\d+/i.test(postUrl) ||
          /tiktok\.com\/@[^/]+\/(?:video|photo)\/\d+/i.test(rawUrl);
        const isTikTokSessionLockedStream =
          /webapp-prime\.tiktok\.com|tiktok\.com\/video\/tos/i.test(rawUrl);

        if (isTikTokPostLink && (!rawUrl || rawUrl.startsWith('blob:') || isTikTokPostLink && rawUrl === postUrl || isTikTokSessionLockedStream)) {
          const ttResolved = await resolveTikTokPageToDirectMedia(
            /tiktok\.com\/@[^/]+\/(?:video|photo)\/\d+/i.test(postUrl) ? postUrl : rawUrl
          );
          if (ttResolved.url) {
            rawUrl = ttResolved.url;
          }
        }

        const isPageLinkNotDirectMedia =
          !rawUrl ||
          rawUrl.startsWith('blob:') ||
          (/(?:instagram\.com|threads\.net|threads\.com|facebook\.com|fb\.watch)/i.test(rawUrl) &&
            !/(?:cdninstagram\.com|fbcdn\.net|\.mp4|\.jpg|\.webp|\.mp3)/i.test(rawUrl));

        if (isPageLinkNotDirectMedia && (postUrl || rawUrl)) {
          const resolved = await resolveMetaPageToDirectMp4(
            postUrl || (!rawUrl.startsWith('blob:') ? rawUrl : '')
          );
          if (resolved) {
            rawUrl = resolved;
          }
        }

        if (!rawUrl || rawUrl.startsWith('blob:')) {
          sendResponse({ ok: false, error: 'Chưa tìm thấy luồng tệp phương tiện gốc.' });
          return;
        }

        const finalFilename =
          /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(rawUrl) && filename.endsWith('.mp4')
            ? filename.replace(/\.mp4$/i, '.jpg')
            : filename;

        chrome.downloads.download(
          {
            url: rawUrl,
            filename: finalFilename,
            saveAs: false,
          },
          async (downloadId) => {
            if (chrome.runtime.lastError || !downloadId) {
              // Nếu luồng CDN nội bộ bị chặn (403), thử bóc luồng dự phòng từ postUrl
              if (postUrl && /tiktok\.com/i.test(postUrl)) {
                const retryMedia = await resolveTikTokPageToDirectMedia(postUrl);
                if (retryMedia.url && retryMedia.url !== rawUrl) {
                  chrome.downloads.download(
                    {
                      url: retryMedia.url,
                      filename: retryMedia.isImage
                        ? finalFilename.replace(/\.mp4$/i, '.jpg')
                        : finalFilename,
                      saveAs: false,
                    },
                    (retryId) => {
                      if (chrome.runtime.lastError || !retryId) {
                        sendResponse({
                          ok: false,
                          error:
                            chrome.runtime.lastError?.message || 'Trình duyệt từ chối tải xuống.',
                        });
                      } else {
                        sendResponse({
                          ok: true,
                          downloadId: retryId,
                          resolvedUrl: retryMedia.url,
                          filename: finalFilename,
                        });
                      }
                    }
                  );
                  return;
                }
              }
              sendResponse({
                ok: false,
                error: chrome.runtime.lastError?.message || 'Trình duyệt từ chối tải xuống.',
              });
            } else {
              sendResponse({
                ok: true,
                downloadId,
                resolvedUrl: rawUrl,
                filename: finalFilename,
              });
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

  if (message.type === 'UPBASE_FETCH_TEXT_URL') {
    (async () => {
      try {
        const targetUrl = String(message.url || '').trim();
        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
          sendResponse({ ok: false, text: '' });
          return;
        }
        const res = await fetch(targetUrl, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!res.ok) {
          sendResponse({ ok: false, status: res.status, text: '' });
          return;
        }
        const text = await res.text();
        sendResponse({ ok: true, status: res.status, text });
      } catch {
        sendResponse({ ok: false, text: '' });
      }
    })();
    return true;
  }

  if (message.type === 'UPBASE_TAB_AUTO_VERIFIED') {
    const senderTabId = _sender?.tab?.id;
    if (senderTabId && pendingAutoVerifyTabWaiters.has(senderTabId)) {
      const resolver = pendingAutoVerifyTabWaiters.get(senderTabId);
      pendingAutoVerifyTabWaiters.delete(senderTabId);
      resolver(message.result || { ok: true });
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'UPBASE_BATCH_VERIFY_TAB_QUEUE') {
    (async () => {
      const rawUrls = Array.isArray(message.urls) ? message.urls : [];
      const cleanUrls = rawUrls
        .map((u) => String(u || '').trim())
        .filter((u) => /^https?:\/\//i.test(u))
        .slice(0, 12);

      if (cleanUrls.length === 0) {
        sendResponse({ ok: false, syncedCount: 0, results: [] });
        return;
      }

      const results = [];
      let syncedCount = 0;

      for (const rawUrl of cleanUrls) {
        const sep = rawUrl.includes('#') ? '&' : '#';
        const targetUrl = `${rawUrl}${sep}ub_auto_verify=1`;
        let tabId = null;
        try {
          const createdTab = await new Promise((resolve) => {
            chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
              void chrome.runtime?.lastError;
              resolve(tab || null);
            });
          });
          tabId = createdTab?.id || null;
          if (!tabId) {
            results.push({ url: rawUrl, ok: false, reason: 'TAB_CREATE_FAILED' });
            continue;
          }

          const tabResult = await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              if (pendingAutoVerifyTabWaiters.has(tabId)) {
                pendingAutoVerifyTabWaiters.delete(tabId);
              }
              resolve({ ok: false, reason: 'TIMEOUT' });
            }, 8500);

            pendingAutoVerifyTabWaiters.set(tabId, (resObj) => {
              clearTimeout(timeoutId);
              resolve(resObj || { ok: true });
            });
          });

          if (tabResult && tabResult.ok) {
            syncedCount += 1;
          }
          results.push({ url: rawUrl, ...tabResult });
        } catch (err) {
          results.push({
            url: rawUrl,
            ok: false,
            reason: err instanceof Error ? err.message : 'ERROR',
          });
        } finally {
          if (tabId) {
            try {
              chrome.tabs.remove(tabId, () => {
                void chrome.runtime?.lastError;
              });
            } catch {
              // ignore
            }
          }
        }
      }

      sendResponse({ ok: true, syncedCount, results });
    })();
    return true;
  }

  return false;
});
