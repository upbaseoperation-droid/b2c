const fs = require('fs');
const readline = require('readline');

async function testCsvDetails() {
  console.log('Testing CSV details...');
  const rl = readline.createInterface({
    input: fs.createReadStream('./B2C_Quản lý Booking_3.1 Listing KOCs_All (Đồng bộ hoá).csv'),
    crlfDelay: Infinity
  });

  const mapCsv = new Map();
  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue;
    const parts = line.split(',');
    if (parts.length < 15) continue;
    const cid = (parts[0] || '').replace(/[\"\r\n]/g, '').trim().toLowerCase();
    if (!cid || cid.length > 50) continue;

    const email = (parts[10] || '').replace(/[\"\r\n]/g, '').trim();
    const zalo = (parts[11] || '').replace(/[\"\r\n]/g, '').trim();
    const tepKenh = (parts[23] || '').replace(/[\"\r\n]/g, '').trim();
    const shipping = (parts[42] || '').replace(/[\"\r\n]/g, '').trim();
    const pic = (parts[47] || parts[21] || '').replace(/[\"\r\n]/g, '').trim();

    if (!mapCsv.has(cid)) {
      mapCsv.set(cid, { email, zalo, tepKenh, shipping, pic });
    } else {
      const cur = mapCsv.get(cid);
      if (!cur.email && email && email.includes('@')) cur.email = email;
      if (!cur.zalo && zalo && zalo.length >= 8) cur.zalo = zalo;
      if (!cur.tepKenh && tepKenh) cur.tepKenh = tepKenh;
      if (!cur.shipping && shipping && shipping.length > 5) cur.shipping = shipping;
      if (!cur.pic && pic) cur.pic = pic;
    }
  }
  console.log('Total unique KOCs in CSV:', mapCsv.size);
  let shipCount = 0;
  let zaloCount = 0;
  mapCsv.forEach(v => {
    if (v.shipping) shipCount++;
    if (v.zalo) zaloCount++;
  });
  console.log(`In CSV: ${shipCount} have Shipping info, ${zaloCount} have Zalo.`);
}

testCsvDetails().catch(console.error);
