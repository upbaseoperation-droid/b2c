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
  for (const s of meta.sheets) {
    const title = s.properties.title;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${clioId}/values/'${encodeURIComponent(title)}'!1:1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(title, 'Grid size:', s.properties.gridProperties.rowCount, 'x', s.properties.gridProperties.columnCount);
    console.log(title, 'Row 1 values length:', data.values ? data.values[0].length : 0);
    if (data.values && data.values[0].length > 45) {
      console.log('Extra columns in row 1:', data.values[0].slice(44, 55));
    }
  }
})();
