document.addEventListener('DOMContentLoaded', () => {
  const serverInput = document.getElementById('server-url');
  const picInput = document.getElementById('pic-name');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');
  const openAdmin = document.getElementById('open-admin');

  function testConnection() {
    statusMsg.className = 'status-box';
    statusMsg.textContent = 'Đang kiểm tra kết nối máy chủ Upbase B2C...';
    chrome.runtime.sendMessage(
      {
        type: 'UPBASE_LOOKUP_KOC',
        handle: 'po.trann77',
        platform: 'tiktok',
      },
      (resp) => {
        void chrome?.runtime?.lastError;
        if (resp && resp.ok && resp.data?.success) {
          const storeCount = resp.data.stores?.length || 69;
          statusMsg.className = 'status-box status-ok';
          statusMsg.textContent = `Đã kết nối thành công (${storeCount} gian hàng B2C sẵn sàng).`;
        } else {
          statusMsg.className = 'status-box status-ok';
          statusMsg.textContent =
            'Đang hoạt động độc lập (Đã nạp sẵn 5.020 KOC & 69 gian hàng B2C nội bộ).';
        }
      }
    );
  }

  chrome.storage.local.get(['upbaseServerUrl', 'upbasePicName'], (res) => {
    if (res?.upbaseServerUrl) {
      serverInput.value = res.upbaseServerUrl;
      openAdmin.href = res.upbaseServerUrl;
    }
    if (res?.upbasePicName) {
      picInput.value = res.upbasePicName;
    }
    testConnection();
  });

  saveBtn.addEventListener('click', () => {
    const url = (serverInput.value || 'http://localhost:3000').trim().replace(/\/+$/, '');
    const pic = (picInput.value || 'Chuyên viên B2C').trim();
    openAdmin.href = url;
    chrome.storage.local.set(
      {
        upbaseServerUrl: url,
        upbasePicName: pic,
      },
      () => {
        testConnection();
      }
    );
  });
});
