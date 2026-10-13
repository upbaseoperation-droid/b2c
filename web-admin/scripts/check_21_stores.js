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

const targetStores = [
  // 15 Shopee
  '4PM_Shopee_E2E-S',
  'Cathy Doll_Shopee_E2E-C',
  'Docilee_Shopee_E2E-S',
  'Ekseption_Shopee_E2E-O',
  'FeelCleans_Shopee_E2E-S',
  'Karmart_Shopee_E2E-C',
  "L'Occitane Việt Nam_Shopee_E2E-C",
  'Miss Saigon_Shopee_E2E-C',
  'ORGALIFE_Mall_Shopee_E2E-C',
  'ORGALIFE_Shopee_E2E-C',
  'Rejuran_Shopee_E2E-O',
  'Revision_Shopee_E2E-O',
  'SCC Saigon Cosmetics_Shopee_E2E-C',
  'TM Clean _Shopee_E2E-C',
  'Venus_Shopee_E2E-C',
  // 6 TikTok
  '4PM_TikTok_E2E-S',
  'BaBe_TikTok_E2E-O',
  'Baegayul_TikTok_E2E-O',
  'Ekseption_TikTok_E2E-O',
  'Face republic_TikTok_E2E-O',
  'Revision_TikTok_E2E-O'
];

async function check21Stores() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const ws = wb.worksheets[0];

  const headerRow = ws.getRow(1);
  const headers = {};
  headerRow.eachCell((c, col) => {
    headers[col] = String(c.value).trim();
  });

  const results = [];

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
      const store = row.getCell(2).value ? String(row.getCell(2).value).trim() : '';
      if (targetStores.includes(store)) {
        // Collect all non-empty cells in this row
        const filledCols = [];
        row.eachCell((c, col) => {
          let val = c.value;
          if (val !== null && val !== undefined && val !== '' && val !== 0 && val !== '0' && val !== '₫0') {
            // Check if object formula result
            if (typeof val === 'object' && val.result !== undefined) {
              if (val.result === 0 || val.result === '0' || val.result === null) return;
              val = val.result;
            }
            filledCols.push({
              col,
              header: headers[col] || `Col ${col}`,
              val
            });
          }
        });

        // Key metrics
        const pic = row.getCell(60).value || row.getCell(39).value || '';
        const growthPic = row.getCell(35).value || '';
        const planNMV = parseNum(row.getCell(6).value);
        const col10_videoAff = parseNum(row.getCell(10).value);
        const col26_costAff = parseNum(row.getCell(26).value);
        const col28_videoSelf = parseNum(row.getCell(28).value);
        const col33_costSelf = parseNum(row.getCell(33).value);

        // Multiplatform breakdown
        const igReup = parseNum(row.getCell(211).value);
        const spReup = parseNum(row.getCell(212).value);
        const ttReup = parseNum(row.getCell(213).value);
        const fbReup = parseNum(row.getCell(214).value);
        const thReup = parseNum(row.getCell(215).value);

        const ttCost = parseNum(row.getCell(216).value);
        const ttAff = parseNum(row.getCell(217).value);
        const fbCost = parseNum(row.getCell(218).value);
        const fbAff = parseNum(row.getCell(219).value);
        const igCost = parseNum(row.getCell(220).value);
        const igAff = parseNum(row.getCell(221).value);
        const thCost = parseNum(row.getCell(222).value);
        const thAff = parseNum(row.getCell(223).value);
        const spCost = parseNum(row.getCell(224).value);
        const spAff = parseNum(row.getCell(225).value);

        // KOC tiers
        const tap = parseNum(row.getCell(16).value);
        const kl1 = parseNum(row.getCell(17).value);
        const kl2 = parseNum(row.getCell(18).value);
        const kl3 = parseNum(row.getCell(19).value);
        const kl4 = parseNum(row.getCell(20).value);
        const kl5 = parseNum(row.getCell(21).value);
        const kl6 = parseNum(row.getCell(22).value);
        const kl7 = parseNum(row.getCell(23).value);

        results.push({
          store,
          san: row.getCell(54).value,
          growthPic,
          pic,
          planNMV,
          col10_videoAff,
          col26_costAff,
          col28_videoSelf,
          col33_costSelf,
          koc: { tap, kl1, kl2, kl3, kl4, kl5, kl6, kl7 },
          multi: {
            shopee: { reup: spReup, aff: spAff, cost: spCost },
            fb: { reup: fbReup, aff: fbAff, cost: fbCost },
            threads: { reup: thReup, aff: thAff, cost: thCost },
            ig: { reup: igReup, aff: igAff, cost: igCost },
            tiktok: { reup: ttReup, aff: ttAff, cost: ttCost }
          },
          filledColsCount: filledCols.length,
          filledCols
        });
      }
    }
  }

  console.log(`Đã kiểm tra ${results.length} gian hàng:\n`);
  for (const r of results) {
    console.log(`========================================================================`);
    console.log(`GIAN HÀNG: ${r.store} (Sàn: ${r.san}) | Growth: ${r.growthPic} | Booking PIC: ${r.pic}`);
    console.log(`- NMV Plan: ${r.planNMV.toLocaleString('vi-VN')} đ`);
    console.log(`- Video Affiliate (Cột 10): ${r.col10_videoAff} video | Chi phí (Cột 26): ${r.col26_costAff.toLocaleString('vi-VN')} đ`);
    console.log(`- Video Tự làm (Cột 28): ${r.col28_videoSelf} video | Chi phí (Cột 33): ${r.col33_costSelf.toLocaleString('vi-VN')} đ`);
    console.log(`- Phân bổ đa kênh:`);
    console.log(`  + Shopee: ${r.multi.shopee.aff} aff, ${r.multi.shopee.reup} reup | ${r.multi.shopee.cost.toLocaleString('vi-VN')} đ`);
    console.log(`  + Facebook: ${r.multi.fb.aff} aff, ${r.multi.fb.reup} reup | ${r.multi.fb.cost.toLocaleString('vi-VN')} đ`);
    console.log(`  + Threads: ${r.multi.threads.aff} aff, ${r.multi.threads.reup} reup | ${r.multi.threads.cost.toLocaleString('vi-VN')} đ`);
    console.log(`  + Instagram: ${r.multi.ig.aff} aff, ${r.multi.ig.reup} reup | ${r.multi.ig.cost.toLocaleString('vi-VN')} đ`);
    console.log(`  + TikTok: ${r.multi.tiktok.aff} aff | ${r.multi.tiktok.cost.toLocaleString('vi-VN')} đ`);
    console.log(`- KOC TikTok Tiers: TAP=${r.koc.tap}, KL1=${r.koc.kl1}, KL2=${r.koc.kl2}, KL3=${r.koc.kl3}, KL4=${r.koc.kl4}, KL5=${r.koc.kl5}, KL6=${r.koc.kl6}, KL7=${r.koc.kl7}`);
  }
}

check21Stores().catch(console.error);
