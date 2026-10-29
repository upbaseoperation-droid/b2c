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

(async () => {
  const token = await getServiceAccountToken();
  const clioId = '171qw6gROYAQiUQXXH5oOAfgYoX1OUTjkZUqkl2yaQw4';
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}?fields=sheets(properties)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await metaRes.json();
  const tabs = meta.sheets.filter(s => s.properties.title.startsWith('ClubClio_'));

  const requests = [];
  for (const t of tabs) {
    const sheetId = t.properties.sheetId;
    const colCount = t.properties.gridProperties.columnCount;
    if (colCount > 45) {
      console.log(`Tab ${t.properties.title} has ${colCount} cols. Deleting cols from 45 to ${colCount}...`);
      requests.push({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 45,
            endIndex: colCount
          }
        }
      });
    }
  }

  if (requests.length > 0) {
    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    const result = await batchRes.json();
    console.log('BatchUpdate result:', result);
  } else {
    console.log('No columns to trim.');
  }
})();
