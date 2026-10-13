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
  '4PM_Shopee_E2E-S', 'Cathy Doll_Shopee_E2E-C', 'Docilee_Shopee_E2E-S',
  'Ekseption_Shopee_E2E-O', 'FeelCleans_Shopee_E2E-S', 'Karmart_Shopee_E2E-C',
  "L'Occitane Việt Nam_Shopee_E2E-C", 'Miss Saigon_Shopee_E2E-C',
  'ORGALIFE_Mall_Shopee_E2E-C', 'ORGALIFE_Shopee_E2E-C',
  'Rejuran_Shopee_E2E-O', 'Revision_Shopee_E2E-O',
  'SCC Saigon Cosmetics_Shopee_E2E-C', 'TM Clean _Shopee_E2E-C',
  'Venus_Shopee_E2E-C', '4PM_TikTok_E2E-S', 'BaBe_TikTok_E2E-O',
  'Baegayul_TikTok_E2E-O', 'Ekseption_TikTok_E2E-O',
  'Face republic_TikTok_E2E-O', 'Revision_TikTok_E2E-O'
];

async function categorizeStores() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const ws = wb.worksheets[0];

  const summary = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const m = String(row.getCell(5).value || '');
    if (m.includes('2026/10')) {
      const store = String(row.getCell(2).value || '').trim();
      if (targetStores.includes(store)) {
        const vAff = parseNum(row.getCell(10).value);
        const bAff = parseNum(row.getCell(26).value);
        const vSelf = parseNum(row.getCell(28).value);
        const bSelf = parseNum(row.getCell(33).value);
        const tap = parseNum(row.getCell(16).value);
        const tapBrand = parseNum(row.getCell(14).value);
        const fbAff = parseNum(row.getCell(219).value);
        const fbCost = parseNum(row.getCell(218).value);
        const thAff = parseNum(row.getCell(223).value);
        const thCost = parseNum(row.getCell(222).value);
        const spAff = parseNum(row.getCell(225).value);
        const spCost = parseNum(row.getCell(224).value);
        const igAff = parseNum(row.getCell(221).value);
        const igCost = parseNum(row.getCell(220).value);

        const spReup = parseNum(row.getCell(212).value);
        const fbReup = parseNum(row.getCell(214).value);
        const igReup = parseNum(row.getCell(211).value);
        const thReup = parseNum(row.getCell(215).value);

        const liveAffCount = parseNum(row.getCell(110).value);
        const liveAffCost = parseNum(row.getCell(111).value);

        const pic = String(row.getCell(60).value || row.getCell(39).value || '').trim();
        const growthPic = String(row.getCell(35).value || '').trim();
        const planNMV = parseNum(row.getCell(6).value);

        summary.push({
          store,
          san: row.getCell(54).value,
          growthPic,
          pic,
          planNMV,
          vAff,
          bAff,
          vSelf,
          bSelf,
          tap: tap || tapBrand,
          reupTotal: spReup + fbReup + igReup + thReup,
          multiAff: {
            fb: { count: fbAff, cost: fbCost },
            th: { count: thAff, cost: thCost },
            sp: { count: spAff, cost: spCost },
            ig: { count: igAff, cost: igCost }
          },
          liveAff: { count: liveAffCount, cost: liveAffCost }
        });
      }
    }
  }

  console.log('JSON_RESULT:' + JSON.stringify(summary));
}

categorizeStores().catch(console.error);
