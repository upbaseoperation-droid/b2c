const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function analyze() {
  const wb = new ExcelJS.Workbook();
  const filePath = path.resolve('..', 'B2C_Quản lý Booking_4.1.1 Input plan (1).xlsx');
  await wb.xlsx.readFile(filePath);
  
  console.log('Worksheets:', wb.worksheets.map(s => s.name));
  const ws = wb.worksheets[0];
  console.log('Total rows in sheet:', ws.rowCount, 'columns:', ws.columnCount);

  // Headers
  const headerRow = ws.getRow(1);
  const headers = [];
  headerRow.eachCell((cell, colNumber) => {
    headers.push({ col: colNumber, val: cell.value ? String(cell.value).trim() : '' });
  });

  console.log('\n--- HEADERS ---');
  headers.forEach(h => console.log(`Col ${h.col}: ${h.val}`));

  // Analyze rows
  const months = new Map();
  const stores = new Set();
  const brands = new Set();
  const weeks = new Set();
  const storeByMonth = new Map();
  const leaderByStore = new Map();
  const bookingPicByStore = new Map();

  // Metrics for 10/2026
  let octRows = 0;
  let octAffVideo = 0;
  let octAffBudget = 0;
  let octSelfVideo = 0;
  let octSelfBudget = 0;
  let octLiveCount = 0;
  let octLiveBudget = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const mCell = row.getCell(1).value;
    const storeCell = row.getCell(4).value;
    const weekCell = row.getCell(5).value;
    const bookingPic = row.getCell(50).value;
    const leader = row.getCell(55).value;
    const brand = row.getCell(58).value;

    if (!mCell && !storeCell) continue;

    let mStr = '';
    if (mCell instanceof Date) {
      const y = mCell.getFullYear();
      const m = String(mCell.getMonth() + 1).padStart(2, '0');
      mStr = `${y}/${m}`;
    } else {
      mStr = String(mCell || '').trim();
    }

    const sStr = storeCell ? String(storeCell).trim() : '';
    const bStr = brand ? String(brand).trim() : '';
    const wStr = weekCell ? String(weekCell).trim() : '';

    months.set(mStr, (months.get(mStr) || 0) + 1);

    if (sStr) {
      stores.add(sStr);
      if (!storeByMonth.has(mStr)) storeByMonth.set(mStr, new Set());
      storeByMonth.get(mStr).add(sStr);

      if (leader) leaderByStore.set(sStr, String(leader).trim());
      if (bookingPic) bookingPicByStore.set(sStr, String(bookingPic).trim());
    }
    if (bStr) brands.add(bStr);
    if (wStr) weeks.add(wStr);

    // If month is 2026/10 (or contains 10/2026)
    if (mStr.includes('2026/10') || mStr.includes('10/2026') || mStr === '2026-10-01') {
      octRows++;
      octAffVideo += Number(row.getCell(8).value) || 0;
      octAffBudget += Number(row.getCell(17).value) || 0;
      octSelfVideo += Number(row.getCell(37).value) || 0;
      octSelfBudget += Number(row.getCell(43).value) || 0;
      octLiveCount += Number(row.getCell(59).value) || 0;
      octLiveBudget += Number(row.getCell(60).value) || 0;
    }
  }

  console.log('\n--- THỐNG KÊ KỲ THÁNG ---');
  for (const [m, count] of months.entries()) {
    const sCount = storeByMonth.has(m) ? storeByMonth.get(m).size : 0;
    console.log(`Tháng: '${m}' => ${count} dòng | ${sCount} gian hàng`);
  }

  console.log('\nTổng số gian hàng duy nhất (tất cả các tháng):', stores.size);
  console.log('Tổng số nhãn hàng duy nhất:', brands.size);
  console.log('Các giá trị Tuần:', Array.from(weeks));

  console.log('\n--- TỔNG HỢP THÁNG 10/2026 ---');
  console.log(`Số dòng plan tuần tháng 10: ${octRows}`);
  const octStores = storeByMonth.get('2026/10') || new Set();
  console.log(`Số gian hàng có plan tháng 10: ${octStores.size}`);
  console.log(`Tổng video affiliate TikTok (Col 8): ${octAffVideo}`);
  console.log(`Tổng ngân sách affiliate TikTok (Col 17): ${octAffBudget.toLocaleString('vi-VN')} VND`);
  console.log(`Tổng video tự làm (Col 37): ${octSelfVideo}`);
  console.log(`Tổng ngân sách video tự làm (Col 43): ${octSelfBudget.toLocaleString('vi-VN')} VND`);
  console.log(`Tổng phiên livestream (Col 59): ${octLiveCount}`);
  console.log(`Tổng ngân sách livestream (Col 60): ${octLiveBudget.toLocaleString('vi-VN')} VND`);

  // Compare with 4.1 Plan order tổng.xlsx
  const wbMacro = new ExcelJS.Workbook();
  const macroPath = path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx');
  await wbMacro.xlsx.readFile(macroPath);
  const wsMacro = wbMacro.worksheets[0];

  const b2cStoresMacro = new Set();
  const allStoresMacro = new Set();
  for (let r = 2; r <= wsMacro.rowCount; r++) {
    const row = wsMacro.getRow(r);
    const mVal = row.getCell(1).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
    } else {
      mStr = String(mVal || '').trim();
    }
    if (mStr.includes('2026/10') || mStr.includes('10/2026')) {
      const storeName = row.getCell(4).value ? String(row.getCell(4).value).trim() : '';
      const b2cResp = row.getCell(30).value;
      if (storeName) {
        allStoresMacro.add(storeName);
        if (Number(b2cResp) === 1 || String(b2cResp).trim() === '1') {
          b2cStoresMacro.add(storeName);
        }
      }
    }
  }

  console.log('\n--- ĐỐI CHIẾU VỚI 4.1 PLAN ORDER TỔNG (Tháng 10/2026) ---');
  console.log(`Gian hàng B2C phụ trách trong 4.1 Macro: ${b2cStoresMacro.size}`);
  console.log(`Gian hàng có trong 4.1.1 Input plan tháng 10: ${octStores.size}`);

  const missingIn411 = [];
  b2cStoresMacro.forEach(s => {
    if (!octStores.has(s)) missingIn411.push(s);
  });
  console.log(`Số gian B2C ở 4.1 nhưng CHƯA CÓ ở 4.1.1: ${missingIn411.length}`);
  if (missingIn411.length > 0) {
    console.log('Danh sách gian chưa có ở 4.1.1:', missingIn411);
  }

  const extraIn411 = [];
  octStores.forEach(s => {
    if (!b2cStoresMacro.has(s)) extraIn411.push(s);
  });
  console.log(`Số gian ở 4.1.1 nhưng KHÔNG THUỘC 69 gian B2C ở 4.1: ${extraIn411.length}`);
  if (extraIn411.length > 0) {
    console.log('Danh sách gian dôi dư:', extraIn411);
  }
}

analyze().catch(console.error);
