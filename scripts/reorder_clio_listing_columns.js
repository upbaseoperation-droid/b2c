/**
 * ============================================================================
 * UPBASE B2C - ĐƯA "NGÀY AIR DỰ KIẾN" VỀ CỤM TRUNG TÂM DUYỆT (CLUBCLIO)
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

const REORDERED_LISTING_HEADERS = [
  'Ngày điền',                                    // A
  'Tháng',                                        // B
  'Nhân sự điền',                                 // C
  'Đợt listing',                                  // D
  'Store',                                        // E
  'Sản phẩm',                                     // F
  '🎃id kênh',                                    // G
  'Tên người ảnh hưởng (Tên kênh)',               // H
  '🎃Link kênh',                                  // I
  'Follower',                                     // J
  '🎃 Tệp kênh',                                  // K
  'Content tag',                                  // L
  'Tệp Booking',                                  // M
  'Giá đã hợp tác trước đó (Giá dự kiến)',         // N
  'Gói Asset & Quyền lợi cam kết',                // O
  'Giá net video',                                // P
  'Ngày air dự kiến',                             // Q (ĐƯA VỀ CỤM TRUNG TÂM)
  'Phí booking kèm thuế TNCN',                    // R
  'Trạng thái Quy trình Booking - Tech',           // S
  'Đề xuất từ UpBase',                            // T
  'Content note',                                 // U
  'Brand chọn',                                   // V
  'Lý do từ chối',                                // W (Nhập tự do)
  'Thời gian gửi listing',                        // X
  'Thời gian Brand duyệt (Lần đầu)',              // Y
  'SLA phản hồi (giờ)',                           // Z
  'Trạng thái SLA 48h',                           // AA
  'Thành quả hợp tác với UB',                     // AB
  'Thành quả hợp tác với brand ngoài',            // AC
  'Doanh số ước tính trong 30 ngày',              // AD
  'View trung bình video',                        // AE
  'Cost per view',                                // AF
  'Tỉ trọng GMV từ video',                        // AG
  'Tỉ trọng GMV từ Live',                         // AH
  'Tỉ trọng GMV từ thẻ sản phẩm',                 // AI
  'Tỉ trọng ngành hàng',                          // AJ
  'Tỉ trọng Nam',                                 // AK
  'Tỉ trọng Nữ',                                  // AL
  'Tỉ trọng 18-24',                               // AM
  'Tỉ trọng 25-34',                               // AN
  'Location',                                     // AO
  'GMV Target',                                   // AP
  'View Target',                                  // AQ
  'Tỷ lệ tương tác',                              // AR
  'Mã dòng (Row ID)'                              // AS
];

const SHORT_ASSET_OPTIONS = [
  '1 Video',
  '1 Video + Ads',
  '1 Video + SDHA',
  '1 Video + Reup',
  '1 Video + Ads + SDHA',
  '1 Video + Ads + Reup',
  '1 Video + Ads + Reup + SDHA',
  '1 Video + Gắn giỏ',
  '1 Video + Ads + Gắn giỏ + SDHA'
];

(async () => {
  const token = await getServiceAccountToken();
  const clioId = '171qw6gROYAQiUQXXH5oOAfgYoX1OUTjkZUqkl2yaQw4';

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}?fields=sheets(properties(sheetId,title))`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await metaRes.json();
  const tabs = meta.sheets.filter(s => s.properties.title.startsWith('ClubClio_'));

  const requests = [];

  for (const t of tabs) {
    const sheetId = t.properties.sheetId;
    const title = t.properties.title;

    // 1. Ghi lại Header A1:AS1
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}/values/'${encodeURIComponent(title)}'!A1:AS1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [REORDERED_LISTING_HEADERS] })
    });

    // 2. Clear validation cũ trên cột Q đến W
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 16, endColumnIndex: 25 }
      }
    });

    // 3. Set Dropdown cho Gói Asset (Cột O - Index 14)
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 14, endColumnIndex: 15 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: SHORT_ASSET_OPTIONS.map(v => ({ userEnteredValue: v })) },
          inputMessage: 'Chọn gói quyền lợi rút gọn',
          strict: false,
          showCustomUi: true
        }
      }
    });

    // 4. Set Dropdown cho Brand chọn (Cột V - Index 21)
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 21, endColumnIndex: 22 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: [{ userEnteredValue: 'Yes' }, { userEnteredValue: 'No' }, { userEnteredValue: 'Cân nhắc' }] },
          inputMessage: 'Brand phê duyệt deal',
          strict: false,
          showCustomUi: true
        }
      }
    });

    // 5. Căn chỉnh độ rộng & format cột Q (Ngày air dự kiến - căn giữa, định dạng Date)
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 16, endIndex: 17 },
        properties: { pixelSize: 130 },
        fields: 'pixelSize'
      }
    });
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 16, endColumnIndex: 17 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat.horizontalAlignment'
      }
    });
  }

  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
  }

  console.log('✅ Đã di chuyển xong "Ngày air dự kiến" về Cột Q trên các tab Listing của ClubClio!');
})();
