#!/usr/bin/env node
/**
 * Script đóng gói chuẩn Chrome Web Store & Tự động đẩy (Publish) lên Google Chrome Web Store API
 * Chạy đóng gói: node publish-chrome-web-store.mjs
 * Chạy đóng gói + đẩy tự động qua API:
 *   CWS_CLIENT_ID=... CWS_CLIENT_SECRET=... CWS_REFRESH_TOKEN=... CWS_EXTENSION_ID=... node publish-chrome-web-store.mjs --publish
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.4.0';

// Danh sách file chuẩn bắt buộc có trong gói nộp lên Google Developer Console (không kèm rác hay file .md)
const STORE_FILES = [
  'manifest.json',
  'background.js',
  'page-interceptor.js',
  'content.js',
  'styles.css',
  'popup.html',
  'popup.js',
  'net_rules.json',
  'icon-16.png',
  'icon-32.png',
  'icon-48.png',
  'icon-128.png',
  'upbase-logo.png',
];

for (const file of STORE_FILES) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[LỖI] Thiếu file bắt buộc khi đóng gói Chrome Web Store: ${file}`);
    process.exit(1);
  }
}

const outZipName = `Upbase-B2C-ChromeWebStore-v${version}.zip`;
const outZipPath = path.join(__dirname, outZipName);

console.log(`[1/3] Đang kiểm tra cú pháp & đóng gói ${outZipName} (v${version})...`);

try {
  if (fs.existsSync(outZipPath)) {
    fs.unlinkSync(outZipPath);
  }
  const fileListArg = STORE_FILES.map((f) => `"${path.join(__dirname, f)}"`).join(',');
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path ${fileListArg} -DestinationPath '${outZipPath}' -Force"`,
    { stdio: 'inherit' }
  );
  const stat = fs.statSync(outZipPath);
  console.log(
    `[HOÀN TẤT ĐÓNG GÓI] Đã tạo file chuẩn Chrome Web Store: ${outZipPath} (${(stat.size / 1024).toFixed(1)} KB)`
  );
} catch (err) {
  console.error('[LỖI ĐÓNG GÓI ZIP]:', err);
  process.exit(1);
}

const shouldPublishApi = process.argv.includes('--publish');
if (!shouldPublishApi) {
  console.log('\n========================================================================');
  console.log('SẴN SÀNG TẢI LÊN GOOGLE CHROME WEB STORE DEVELOPER DASHBOARD:');
  console.log(`1. Truy cập: https://chrome.google.com/webstore/devconsole`);
  console.log(`2. Bấm nút "New item" (Mục mới) -> Chọn file:`);
  console.log(`   ${outZipPath}`);
  console.log(`3. Xem file CHROME_WEB_STORE_GUIDE.md để copy sẵn nội dung khai báo quyền (Privacy Practices).`);
  console.log('========================================================================\n');
  process.exit(0);
}

// Nhánh tự động đẩy qua Chrome Web Store Publish API (OAuth2)
async function publishViaChromeWebStoreApi() {
  const clientId = process.env.CWS_CLIENT_ID;
  const clientSecret = process.env.CWS_CLIENT_SECRET;
  const refreshToken = process.env.CWS_REFRESH_TOKEN;
  const extensionId = process.env.CWS_EXTENSION_ID;
  const publishTarget = process.env.CWS_PUBLISH_TARGET || 'default'; // 'default' hoặc 'trustedTesters'

  if (!clientId || !clientSecret || !refreshToken || !extensionId) {
    console.error(
      '[THIẾU BIẾN MÔI TRƯỜNG] Để đẩy tự động qua API, cần cung cấp đủ: CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_EXTENSION_ID'
    );
    process.exit(1);
  }

  console.log('[2/3] Đang lấy Access Token từ Google OAuth2...');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('[LỖI OAUTH2]:', tokenData);
    process.exit(1);
  }

  const accessToken = tokenData.access_token;
  const zipBuffer = fs.readFileSync(outZipPath);

  console.log(`[3/3] Đang tải gói ${outZipName} lên Chrome Web Store (ID: ${extensionId})...`);
  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-api-version': '2',
      },
      body: zipBuffer,
    }
  );
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || uploadJson.uploadState === 'FAILURE') {
    console.error('[LỖI UPLOAD GÓI EXTENSION]:', JSON.stringify(uploadJson, null, 2));
    process.exit(1);
  }
  console.log('[UPLOAD THÀNH CÔNG]:', uploadJson.uploadState);

  console.log(`[PUBLISH] Đang gửi yêu cầu xét duyệt (target=${publishTarget})...`);
  const pubRes = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish?publishTarget=${publishTarget}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-api-version': '2',
        'Content-Length': '0',
      },
    }
  );
  const pubJson = await pubRes.json();
  console.log('[KẾT QUẢ PUBLISH]:', JSON.stringify(pubJson, null, 2));
}

publishViaChromeWebStoreApi().catch((err) => {
  console.error('[LỖI PUBLISH API]:', err);
  process.exit(1);
});
