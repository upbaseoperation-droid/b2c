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

async function check() {
  console.log('--- 1. CHECK 4.1 PLAN ORDER TỔNG ---');
  const wbMacro = new ExcelJS.Workbook();
  await wbMacro.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const wsMacro = wbMacro.worksheets[0];

  let b2cCount = 0;
  let totalVAff41 = 0, totalTap41 = 0, totalKl41 = 0;

  for (let r = 2; r <= wsMacro.rowCount; r++) {
    const row = wsMacro.getRow(r);
    const mVal = row.getCell(5).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = mVal.getFullYear() + '/' + String(mVal.getMonth() + 1).padStart(2, '0');
    } else {
      mStr = String(mVal || '').trim();
    }
    const b2c = row.getCell(25).value;
    const isB2C = (Number(b2c) === 1 || String(b2c).trim() === '1');

    if (isB2C && (mStr === '2026/10' || mStr.includes('10/2026') || mStr === '2026-10-01')) {
      b2cCount++;
      const store = row.getCell(2).value;
      const vAff = parseNum(row.getCell(10).value);
      const tapBrand = parseNum(row.getCell(14).value);
      const tap = parseNum(row.getCell(15).value);
      const tapUp = parseNum(row.getCell(16).value);
      const tapSum = tapBrand + tap + tapUp;

      let klSum = 0;
      for (let c = 17; c <= 23; c++) {
        klSum += parseNum(row.getCell(c).value);
      }

      totalVAff41 += vAff;
      totalTap41 += tapSum;
      totalKl41 += klSum;

      if (vAff !== (tapSum + klSum) || b2cCount <= 8) {
        console.log(`[4.1] ${store}: vAff=${vAff} | TAP=${tapSum} (Brand:${tapBrand}, TAP:${tap}, Up:${tapUp}) | KL=${klSum}`);
      }
    }
  }
  console.log(`Summary 4.1: Stores=${b2cCount} | Total vAff=${totalVAff41} | Total TAP=${totalTap41} | Total KL=${totalKl41}`);

  console.log('\n--- 2. CHECK 4.1.1 INPUT PLAN ---');
  const wbInput = new ExcelJS.Workbook();
  await wbInput.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1.1 Input plan (1).xlsx'));
  const wsInput = wbInput.worksheets[0];

  let totalVAff411 = 0, totalTap411 = 0, totalKl411 = 0;
  const storeInputSet = new Set();

  for (let r = 2; r <= wsInput.rowCount; r++) {
    const row = wsInput.getRow(r);
    const mVal = row.getCell(1).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = mVal.getFullYear() + '/' + String(mVal.getMonth() + 1).padStart(2, '0');
    } else {
      mStr = String(mVal || '').trim();
    }
    if (mStr !== '2026/10') continue;

    const store = String(row.getCell(4).value || '').trim();
    storeInputSet.add(store);

    const vAff = parseNum(row.getCell(8).value);
    const tap = parseNum(row.getCell(9).value);

    let klSum = 0;
    for (let c = 10; c <= 16; c++) {
      klSum += parseNum(row.getCell(c).value);
    }

    totalVAff411 += vAff;
    totalTap411 += tap;
    totalKl411 += klSum;
  }
  console.log(`Summary 4.1.1: Stores=${storeInputSet.size} | Total vAff=${totalVAff411} | Total TAP=${totalTap411} | Total KL=${totalKl411}`);
}

check();
