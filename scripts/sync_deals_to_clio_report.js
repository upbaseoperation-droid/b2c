/**
 * ============================================================================
 * UPBASE B2C - TEST ĐẨY DEAL ĐÃ DUYỆT SANG TAB "BÁO CÁO & NGHIỆM THU" (CLUBCLIO)
 * ============================================================================
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../web-admin/.env.local'), 'utf8');
const saEmail = envContent.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL="([^"]+)"/)[1];
const saKey = envContent.match(/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="([^"]+)"/)[1].replace(/\\n/g, '\n');

function b64url(str) { return Buffer.from(str).toString('base64url'); }

async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify({
    iss: saEmail, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  }));
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(saKey, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig })
  });
  return (await res.json()).access_token;
}

// 3 Deal mẫu đã được Brand duyệt của ClubClio
const SAMPLE_APPROVED_DEALS = [
  {
    thang: '2026/10',
    store: 'ClubClio_TikTok_E2E-O',
    dot: 'Đợt 1',
    dealCode: 'BO2610_CLIO_001',
    idKenh: 'tram.makeup.artist',
    tenKoc: 'Trâm Makeup Artist',
    sanPham: 'Phấn nước Clio Kill Cover Mesh Glow',
    giaNet: 4500000,
    giaGross: 4950000,
    ngayAirPlan: '15/10/2026',
    ngayAirReal: '15/10/2026',
    tienDoAir: 'Đúng hạn',
    linkVideo: 'https://www.tiktok.com/@tram.makeup.artist/video/7391823719283',
    sparkAds: '#SPARK-CLIO-9921',
    sparkExpiry: '15/11/2026',
    views30d: 125000,
    orders30d: 380,
    gmv30d: 152000000,
    roi30d: 30.71,
    danhGia: 'Vượt Target',
    rowId: 'ROW-CLIO-001'
  },
  {
    thang: '2026/10',
    store: 'ClubClio_TikTok_E2E-O',
    dot: 'Đợt 1',
    dealCode: 'BO2610_CLIO_002',
    idKenh: 'khanh.beauty.vlog',
    tenKoc: 'Khánh Beauty Diary',
    sanPham: 'Son kem Clio Chiffon Blur Tint',
    giaNet: 3000000,
    giaGross: 3300000,
    ngayAirPlan: '18/10/2026',
    ngayAirReal: '19/10/2026',
    tienDoAir: 'Trễ 1 ngày',
    linkVideo: 'https://www.tiktok.com/@khanh.beauty.vlog/video/7392182736192',
    sparkAds: '#SPARK-CLIO-8812',
    sparkExpiry: '19/11/2026',
    views30d: 85000,
    orders30d: 210,
    gmv30d: 73500000,
    roi30d: 22.27,
    danhGia: 'Đạt Target',
    rowId: 'ROW-CLIO-002'
  },
  {
    thang: '2026/10',
    store: 'ClubClio_TikTok_E2E-O',
    dot: 'Đợt 2',
    dealCode: 'BO2610_CLIO_003',
    idKenh: 'ngoc.unboxing.vn',
    tenKoc: 'Ngọc Reviewer',
    sanPham: 'Bảng phấn mắt Clio Pro Eye Palette Air',
    giaNet: 5000000,
    giaGross: 5500000,
    ngayAirPlan: '28/10/2026',
    ngayAirReal: '',
    tienDoAir: 'Đang quay dựng',
    linkVideo: '',
    sparkAds: '',
    sparkExpiry: '',
    views30d: 0,
    orders30d: 0,
    gmv30d: 0,
    roi30d: 0,
    danhGia: 'Chờ lên bài',
    rowId: 'ROW-CLIO-003'
  }
];

(async () => {
  const token = await getServiceAccountToken();
  const clioId = '171qw6gROYAQiUQXXH5oOAfgYoX1OUTjkZUqkl2yaQw4';
  const tabName = 'Báo cáo & Nghiệm thu';

  console.log(`Bắt đầu đồng bộ 3 deal đã duyệt của ClubClio sang tab "${tabName}"...`);

  const rows = SAMPLE_APPROVED_DEALS.map(d => [
    d.thang,
    d.store,
    d.dot,
    d.dealCode,
    d.idKenh,
    d.tenKoc,
    d.sanPham,
    d.giaNet,
    d.giaGross,
    d.ngayAirPlan,
    d.ngayAirReal,
    d.tienDoAir,
    d.linkVideo,
    d.sparkAds,
    d.sparkExpiry,
    d.views30d,
    d.orders30d,
    d.gmv30d,
    d.roi30d,
    d.danhGia,
    d.rowId
  ]);

  // Ghi từ dòng 2 (A2:U4)
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}/values/'${encodeURIComponent(tabName)}'!A2:U4?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows })
  });

  const data = await res.json();
  console.log('Sync deal sang Báo cáo status:', res.status, data);
  console.log('✅ Đã đồng bộ thành công Deal sang tab Báo cáo & Nghiệm thu của ClubClio!');
})();
