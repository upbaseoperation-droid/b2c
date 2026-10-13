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

async function checkCol10VsMulti() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const ws = wb.worksheets[0];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const m = String(row.getCell(5).value || '');
    const b2c = row.getCell(25).value;
    if (m.includes('2026/10') && (Number(b2c) === 1 || String(b2c).trim() === '1')) {
      const store = row.getCell(2).value;
      const col10 = parseNum(row.getCell(10).value);
      const col26 = parseNum(row.getCell(26).value);
      const ttGross = parseNum(row.getCell(216).value);
      const ttC = parseNum(row.getCell(217).value);
      const fbCost = parseNum(row.getCell(218).value);
      const fbC = parseNum(row.getCell(219).value);
      const igCost = parseNum(row.getCell(220).value);
      const igC = parseNum(row.getCell(221).value);
      const thCost = parseNum(row.getCell(222).value);
      const thC = parseNum(row.getCell(223).value);
      const spCost = parseNum(row.getCell(224).value);
      const spC = parseNum(row.getCell(225).value);

      if (fbC > 0 || thC > 0 || spC > 0 || igC > 0) {
        const sumCount = ttC + fbC + thC + spC + igC;
        const sumCost = ttGross + fbCost + thCost + spCost + igCost;
        console.log(`\nStore: ${store}`);
        console.log(`  Col 10 (Số video aff tổng): ${col10} vs Tổng đa kênh: ${sumCount} [TT:${ttC}, FB:${fbC}, TH:${thC}, SP:${spC}, IG:${igC}]`);
        console.log(`  Col 26 (Chi phí aff tổng): ${col26.toLocaleString('vi-VN')} đ vs Tổng chi phí đa kênh: ${sumCost.toLocaleString('vi-VN')} đ [TT:${ttGross.toLocaleString('vi-VN')}, FB:${fbCost.toLocaleString('vi-VN')}, TH:${thCost.toLocaleString('vi-VN')}, SP:${spCost.toLocaleString('vi-VN')}]`);
      }
    }
  }
}

checkCol10VsMulti().catch(console.error);
