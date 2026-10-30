(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function markExtensionInstalled() {
    try {
      document.documentElement.setAttribute('data-upbase-ext-installed', '1.4.0');
      window.postMessage(
        {
          source: 'UPBASE_EXT_BRIDGE_READY',
          version: '1.4.0',
        },
        '*'
      );
    } catch {
      // ignore
    }
  }

  markExtensionInstalled();
  window.addEventListener('DOMContentLoaded', markExtensionInstalled);
  setTimeout(markExtensionInstalled, 800);

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;

    if (event.data.source === 'UPBASE_WEBADMIN_PING_EXT') {
      markExtensionInstalled();
      return;
    }

    if (event.data.source === 'UPBASE_WEBADMIN_BATCH_VERIFY') {
      const reqId = String(event.data.reqId || Date.now());
      const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
      if (!chrome?.runtime?.id || urls.length === 0) {
        window.postMessage(
          {
            source: 'UPBASE_WEBADMIN_BATCH_VERIFY_DONE',
            reqId,
            ok: false,
            syncedCount: 0,
            error: 'Extension chưa sẵn sàng hoặc danh sách URL trống.',
          },
          '*'
        );
        return;
      }

      try {
        chrome.runtime.sendMessage(
          {
            type: 'UPBASE_BATCH_VERIFY_TAB_QUEUE',
            urls,
          },
          (resp) => {
            void chrome.runtime?.lastError;
            window.postMessage(
              {
                source: 'UPBASE_WEBADMIN_BATCH_VERIFY_DONE',
                reqId,
                ok: Boolean(resp?.ok),
                syncedCount: Number(resp?.syncedCount || 0),
                results: Array.isArray(resp?.results) ? resp.results : [],
              },
              '*'
            );
          }
        );
      } catch (err) {
        window.postMessage(
          {
            source: 'UPBASE_WEBADMIN_BATCH_VERIFY_DONE',
            reqId,
            ok: false,
            syncedCount: 0,
            error: err instanceof Error ? err.message : 'Lỗi kết nối Extension.',
          },
          '*'
        );
      }
    }
  });
})();
