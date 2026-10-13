const ExcelJS = require('exceljs');
const path = require('path');

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

async function inspectFilled() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const ws = wb.worksheets[0];
  const h = {};
  ws.getRow(1).eachCell((c, col) => {
    h[col] = String(c.value).trim();
  });

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const m = String(row.getCell(5).value || '');
    if (m.includes('2026/10')) {
      const store = String(row.getCell(2).value || '').trim();
      if (targetStores.includes(store)) {
        const nonNulls = [];
        row.eachCell((c, col) => {
          let v = c.value;
          if (v && typeof v === 'object' && v.result !== undefined) v = v.result;
          if (v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0' && v !== '₫0') {
            const metaCols = [1, 2, 3, 4, 5, 25, 42, 44, 54, 132, 175, 194, 195, 197, 202];
            if (!metaCols.includes(col)) {
              nonNulls.push(`${h[col] || 'Col' + col}: ${v}`);
            }
          }
        });
        console.log(`\n[${store}] (${nonNulls.length} thông tin):`);
        nonNulls.forEach(item => console.log(`   - ${item}`));
      }
    }
  }
}

inspectFilled().catch(console.error);
