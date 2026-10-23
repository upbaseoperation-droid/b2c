const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function checkMultipleCccd() {
  console.log('Checking multiple CCCDs per KOC in 3.2 List duyệt book & 3.1 unapproved...');
  const wb32 = new ExcelJS.Workbook();
  await wb32.xlsx.readFile('./B2C_Quản lý Booking_3.2 List duyệt book.xlsx');
  const ws32 = wb32.worksheets[0];
  
  // map channelId -> Set of CCCD
  const channelToCccd = new Map();
  // map cccd -> Set of channelId
  const cccdToChannel = new Map();

  function addEntry(cid, rawCccd) {
    if (!cid || !rawCccd) return;
    const cleaned = rawCccd.replace(/[\s\.\-\/\:]/g, '');
    // Ignore invalid placeholder CCCDs
    if (!cleaned || cleaned === '0' || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined' || cleaned.length < 8) return;

    if (!channelToCccd.has(cid)) channelToCccd.set(cid, new Set());
    channelToCccd.get(cid).add(rawCccd.trim());

    if (!cccdToChannel.has(cleaned)) cccdToChannel.set(cleaned, new Set());
    cccdToChannel.get(cleaned).add(cid);
  }

  ws32.eachRow((row, r) => {
    if (r === 1) return;
    const cid = (row.getCell(2).text || '').trim().toLowerCase();
    const rawCccd = (row.getCell(26).text || '').trim();
    addEntry(cid, rawCccd);
  });

  console.log('Channels with CCCD in 3.2:', channelToCccd.size);

  // Also check 3.1 unapproved
  const wbBig = new ExcelJS.Workbook();
  await wbBig.xlsx.readFile('./B2C_Quản lý Booking (1).xlsx');
  const ws31un = wbBig.getWorksheet('3.1 List KOC chưa duyệt');
  if (ws31un) {
    ws31un.eachRow((row, r) => {
      if (r === 1) return;
      const cid = (row.getCell(1).text || '').trim().toLowerCase();
      const rawCccd = (row.getCell(10).text || '').trim();
      addEntry(cid, rawCccd);
    });
  }

  // Channels with > 1 CCCD
  let multiCccdCount = 0;
  const multiCccdList = [];
  channelToCccd.forEach((cccds, cid) => {
    // Distinct normalized
    const normalizedMap = new Map(); // norm -> original
    cccds.forEach(c => {
      const norm = c.replace(/[\s\.\-\/\:]/g, '');
      if (norm.length >= 8) normalizedMap.set(norm, c);
    });
    if (normalizedMap.size > 1) {
      multiCccdCount++;
      multiCccdList.push({ 
        cid, 
        count: normalizedMap.size,
        cccds: Array.from(normalizedMap.keys()),
        rawList: Array.from(normalizedMap.values())
      });
    }
  });

  console.log('TOTAL KOCs WITH MORE THAN 1 CCCD:', multiCccdCount);
  console.log('Sample top 10 KOCs with > 1 CCCD:');
  multiCccdList.slice(0, 15).forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.cid}] (${item.count} CCCD): ${item.cccds.join(', ')} (Raw: ${item.rawList.join(' | ')})`);
  });

  // CCCDs shared across channels
  let sharedCccdCount = 0;
  const sharedCccdList = [];
  cccdToChannel.forEach((channels, cccd) => {
    if (channels.size > 1) {
      sharedCccdCount++;
      sharedCccdList.push({ cccd, channels: Array.from(channels) });
    }
  });
  console.log('TOTAL CCCDs SHARED BY MORE THAN 1 KOC:', sharedCccdCount);
  console.log('Sample top 5 shared CCCDs:');
  sharedCccdList.slice(0, 5).forEach((item, idx) => {
    console.log(`${idx + 1}. CCCD [${item.cccd}] (${item.channels.length} channels): ${item.channels.slice(0, 5).join(', ')}...`);
  });
}

checkMultipleCccd().catch(console.error);
