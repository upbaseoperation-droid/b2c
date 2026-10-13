const ExcelJS = require('exceljs');
const path = require('path');

function parseNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object') {
    if (val.result !== undefined) return parseNum(val.result);
    if (val.text !== undefined) return parseNum(val.text);
  }
  const s = String(val).replace(/[₫$,\s]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

async function checkMultiplatformMacro() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const ws = wb.worksheets[0];

  console.log('Headers from col 210 to 226:');
  const row1 = ws.getRow(1);
  for (let c = 210; c <= 226; c++) {
    console.log(`Col ${c}: ${row1.getCell(c).value}`);
  }

  // Check month 10/2026 rows where B2C phụ trách = 1
  let nonZeroRows = 0;
  const platformTotals = {
    igReup: 0, shopeeReup: 0, tiktokReup: 0, fbReup: 0, thReup: 0,
    tiktokGrossCost: 0, tiktokCount: 0,
    fbCost: 0, fbCount: 0,
    igCost: 0, igCount: 0,
    thCost: 0, thCount: 0,
    shopeeCost: 0, shopeeCount: 0
  };

  const sampleRows = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const mVal = row.getCell(5).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
    } else {
      mStr = String(mVal || '').trim();
    }

    if (mStr === '2026/10') {
      const b2c = row.getCell(25).value;
      if (Number(b2c) === 1 || String(b2c).trim() === '1') {
        const store = row.getCell(2).value;
        const brand = row.getCell(3).value;
        const san = row.getCell(54).value;

        const igR = parseNum(row.getCell(211).value);
        const shopeeR = parseNum(row.getCell(212).value);
        const tiktokR = parseNum(row.getCell(213).value);
        const fbR = parseNum(row.getCell(214).value);
        const thR = parseNum(row.getCell(215).value);

        const tiktokGross = parseNum(row.getCell(216).value);
        const tiktokC = parseNum(row.getCell(217).value);
        const fbCost = parseNum(row.getCell(218).value);
        const fbC = parseNum(row.getCell(219).value);
        const igCost = parseNum(row.getCell(220).value);
        const igC = parseNum(row.getCell(221).value);
        const thCost = parseNum(row.getCell(222).value);
        const thC = parseNum(row.getCell(223).value);
        const shopeeCost = parseNum(row.getCell(224).value);
        const shopeeC = parseNum(row.getCell(225).value);

        platformTotals.igReup += igR;
        platformTotals.shopeeReup += shopeeR;
        platformTotals.tiktokReup += tiktokR;
        platformTotals.fbReup += fbR;
        platformTotals.thReup += thR;

        platformTotals.tiktokGrossCost += tiktokGross;
        platformTotals.tiktokCount += tiktokC;
        platformTotals.fbCost += fbCost;
        platformTotals.fbCount += fbC;
        platformTotals.igCost += igCost;
        platformTotals.igCount += igC;
        platformTotals.thCost += thCost;
        platformTotals.thCount += thC;
        platformTotals.shopeeCost += shopeeCost;
        platformTotals.shopeeCount += shopeeC;

        const sumNonTikTok = igR + shopeeR + fbR + thR + fbCost + fbC + igCost + igC + thCost + thC + shopeeCost + shopeeC;
        if (sumNonTikTok > 0) {
          nonZeroRows++;
          sampleRows.push({
            store, san,
            shopee: { reup: shopeeR, count: shopeeC, cost: shopeeCost },
            fb: { reup: fbR, count: fbC, cost: fbCost },
            ig: { reup: igR, count: igC, cost: igCost },
            th: { reup: thR, count: thC, cost: thCost }
          });
        }
      }
    }
  }

  console.log('\n--- TỔNG KẾT ĐA NỀN TẢNG THÁNG 10/2026 (69 GIAN B2C) ---');
  console.log('Số gian có số liệu đa kênh khác TikTok:', nonZeroRows);
  console.log(JSON.stringify(platformTotals, null, 2));

  console.log('\n--- MẪU CÁC GIAN CÓ ORDER ĐA NỀN TẢNG ---');
  console.log(JSON.stringify(sampleRows.slice(0, 15), null, 2));

  // Check if there are formulas in these cells
  const rowSample = ws.getRow(sampleRows.length > 0 ? 2 : 2);
  console.log('\nSample cell formulas/values for row 2 or next:');
  for (let c = 211; c <= 225; c++) {
    const cell = rowSample.getCell(c);
    console.log(`Col ${c} (${row1.getCell(c).value}): val=${JSON.stringify(cell.value)} formula=${cell.formula}`);
  }
}

checkMultiplatformMacro().catch(console.error);
