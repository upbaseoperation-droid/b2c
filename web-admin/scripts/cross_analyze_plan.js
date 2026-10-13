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

async function crossAnalyze() {
  console.log('=== PHÂN TÍCH VÀ ĐỐI CHIẾU DỮ LIỆU B2C ===');

  // 1. Đọc file 4.1 Plan order tổng
  const wbMacro = new ExcelJS.Workbook();
  await wbMacro.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const wsMacro = wbMacro.worksheets[0];

  // Thu thập danh sách store B2C phụ trách tháng 10/2026 từ 4.1
  const b2cStoresMacro = new Map();

  for (let r = 2; r <= wsMacro.rowCount; r++) {
    const row = wsMacro.getRow(r);
    const mVal = row.getCell(5).value; // Col 5: Tháng
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
    } else {
      mStr = String(mVal || '').trim();
    }

    if (mStr === '2026/10' || mStr.includes('10/2026') || mStr === '2026-10-01') {
      const b2cResp = row.getCell(25).value; // Col 25: B2C phụ trách
      const isB2C = (Number(b2cResp) === 1 || String(b2cResp).trim() === '1');
      const storeName = row.getCell(2).value ? String(row.getCell(2).value).trim() : ''; // Col 2: Gian hàng
      const brand = row.getCell(3).value ? String(row.getCell(3).value).trim() : '';
      const growthPic = row.getCell(35).value ? String(row.getCell(35).value).trim() : '';
      const bookingPic = row.getCell(60).value ? String(row.getCell(60).value).trim() : '';
      const videoAff = parseNum(row.getCell(10).value);
      const budgetAff = parseNum(row.getCell(26).value);
      const videoSelf = parseNum(row.getCell(28).value);
      const budgetSelf = parseNum(row.getCell(33).value);

      if (storeName && isB2C) {
        b2cStoresMacro.set(storeName, {
          brand,
          growthPic,
          bookingPic,
          videoAff,
          budgetAff,
          videoSelf,
          budgetSelf
        });
      }
    }
  }

  let macroTotalVAff = 0, macroTotalBAff = 0, macroTotalVSelf = 0, macroTotalBSelf = 0;
  for (const [s, data] of b2cStoresMacro.entries()) {
    macroTotalVAff += data.videoAff;
    macroTotalBAff += data.budgetAff;
    macroTotalVSelf += data.videoSelf;
    macroTotalBSelf += data.budgetSelf;
  }
  console.log(`\n[4.1 Plan order tổng] Số gian hàng B2C phụ trách Tháng 10/2026: ${b2cStoresMacro.size}`);
  console.log(`  + Tổng Video Aff: ${macroTotalVAff.toLocaleString('vi-VN')} | Ngân sách Aff: ${macroTotalBAff.toLocaleString('vi-VN')} đ`);
  console.log(`  + Tổng Video Self: ${macroTotalVSelf.toLocaleString('vi-VN')} | Ngân sách Self: ${macroTotalBSelf.toLocaleString('vi-VN')} đ`);

  // 2. Đọc file 4.1.1 Input plan
  const wbInput = new ExcelJS.Workbook();
  await wbInput.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1.1 Input plan (1).xlsx'));
  const wsInput = wbInput.worksheets[0];

  const octStoresInput = new Map();
  let totalVAff = 0, totalBAff = 0, totalVSelf = 0, totalBSelf = 0, totalLive = 0, totalBLive = 0;

  const tierSummary = { tap: 0, kl1: 0, kl2: 0, kl3: 0, kl4: 0, kl5: 0, kl6: 0, kl7: 0 };
  const tierBudgetSummary = { kl1: 0, kl2: 0, kl3: 0, kl4: 0, kl5: 0, kl6: 0, kl7: 0 };

  const multiPlatform = {
    shopeeReup: 0, shopeeAff: 0, shopeeBudget: 0,
    fbReup: 0, fbAff: 0, fbBudget: 0,
    igReup: 0, igAff: 0, igBudget: 0,
    thReup: 0, thAff: 0, thBudget: 0
  };

  const selfFormats = { voice: 0, text: 0, remix: 0, ai: 0, pov: 0 };
  const weekBreakdown = new Map();

  for (let r = 2; r <= wsInput.rowCount; r++) {
    const row = wsInput.getRow(r);
    const mVal = row.getCell(1).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
    } else {
      mStr = String(mVal || '').trim();
    }
    if (mStr !== '2026/10') continue;

    const store = row.getCell(4).value ? String(row.getCell(4).value).trim() : '';
    const week = row.getCell(5).value ? String(row.getCell(5).value).trim() : 'Unknown';
    const brand = row.getCell(58).value ? String(row.getCell(58).value).trim() : '';
    const leader = row.getCell(55).value ? String(row.getCell(55).value).trim() : '';
    const bookingPic = row.getCell(50).value ? String(row.getCell(50).value).trim() : '';

    const vAff = parseNum(row.getCell(8).value);
    const bAff = parseNum(row.getCell(17).value);
    const vSelf = parseNum(row.getCell(37).value);
    const bSelf = parseNum(row.getCell(43).value);
    const live = parseNum(row.getCell(59).value);
    const bLive = parseNum(row.getCell(60).value);

    if (store) {
      if (!octStoresInput.has(store)) {
        octStoresInput.set(store, {
          brand, leader, bookingPic,
          weeks: new Set(),
          vAff: 0, bAff: 0, vSelf: 0, bSelf: 0, live: 0, bLive: 0,
          rowCount: 0
        });
      }
      const stObj = octStoresInput.get(store);
      stObj.weeks.add(week);
      stObj.vAff += vAff;
      stObj.bAff += bAff;
      stObj.vSelf += vSelf;
      stObj.bSelf += bSelf;
      stObj.live += live;
      stObj.bLive += bLive;
      stObj.rowCount++;
    }

    if (!weekBreakdown.has(week)) {
      weekBreakdown.set(week, { rows: 0, vAff: 0, bAff: 0, vSelf: 0, bSelf: 0, live: 0 });
    }
    const wbItem = weekBreakdown.get(week);
    wbItem.rows++;
    wbItem.vAff += vAff;
    wbItem.bAff += bAff;
    wbItem.vSelf += vSelf;
    wbItem.bSelf += bSelf;
    wbItem.live += live;

    totalVAff += vAff;
    totalBAff += bAff;
    totalVSelf += vSelf;
    totalBSelf += bSelf;
    totalLive += live;
    totalBLive += bLive;

    tierSummary.tap += parseNum(row.getCell(9).value);
    tierSummary.kl1 += parseNum(row.getCell(10).value);
    tierSummary.kl2 += parseNum(row.getCell(11).value);
    tierSummary.kl3 += parseNum(row.getCell(12).value);
    tierSummary.kl4 += parseNum(row.getCell(13).value);
    tierSummary.kl5 += parseNum(row.getCell(14).value);
    tierSummary.kl6 += parseNum(row.getCell(15).value);
    tierSummary.kl7 += parseNum(row.getCell(16).value);

    tierBudgetSummary.kl1 += parseNum(row.getCell(18).value);
    tierBudgetSummary.kl2 += parseNum(row.getCell(19).value);
    tierBudgetSummary.kl3 += parseNum(row.getCell(20).value);
    tierBudgetSummary.kl4 += parseNum(row.getCell(21).value);
    tierBudgetSummary.kl5 += parseNum(row.getCell(22).value);
    tierBudgetSummary.kl6 += parseNum(row.getCell(23).value);
    tierBudgetSummary.kl7 += parseNum(row.getCell(24).value);

    multiPlatform.shopeeReup += parseNum(row.getCell(25).value);
    multiPlatform.shopeeAff += parseNum(row.getCell(26).value);
    multiPlatform.shopeeBudget += parseNum(row.getCell(27).value);
    multiPlatform.fbReup += parseNum(row.getCell(28).value);
    multiPlatform.fbAff += parseNum(row.getCell(29).value);
    multiPlatform.fbBudget += parseNum(row.getCell(30).value);
    multiPlatform.igReup += parseNum(row.getCell(31).value);
    multiPlatform.igAff += parseNum(row.getCell(32).value);
    multiPlatform.igBudget += parseNum(row.getCell(33).value);
    multiPlatform.thReup += parseNum(row.getCell(34).value);
    multiPlatform.thAff += parseNum(row.getCell(35).value);
    multiPlatform.thBudget += parseNum(row.getCell(36).value);

    selfFormats.voice += parseNum(row.getCell(38).value);
    selfFormats.text += parseNum(row.getCell(39).value);
    selfFormats.remix += parseNum(row.getCell(40).value);
    selfFormats.ai += parseNum(row.getCell(41).value);
    selfFormats.pov += parseNum(row.getCell(42).value);
  }

  console.log(`\n[4.1.1 Input plan] Số gian hàng Tháng 10/2026: ${octStoresInput.size}`);
  console.log(`  + Tổng Video Aff: ${totalVAff.toLocaleString('vi-VN')} | Ngân sách Aff: ${totalBAff.toLocaleString('vi-VN')} đ`);
  console.log(`  + Tổng Video Self: ${totalVSelf.toLocaleString('vi-VN')} | Ngân sách Self: ${totalBSelf.toLocaleString('vi-VN')} đ`);

  // 3. So sánh độ lệch giữa 4.1 và 4.1.1
  console.log('\n=== ĐỐI CHIẾU TỔNG THỂ 4.1 vs 4.1.1 (Tháng 10/2026) ===');
  console.log(`Số gian hàng: 4.1 Macro = ${b2cStoresMacro.size} gian | 4.1.1 Input = ${octStoresInput.size} gian (Chênh: ${b2cStoresMacro.size - octStoresInput.size})`);
  console.log(`Video Affiliate: 4.1 Macro = ${macroTotalVAff.toLocaleString('vi-VN')} | 4.1.1 Input = ${totalVAff.toLocaleString('vi-VN')} (Chênh: ${(macroTotalVAff - totalVAff).toLocaleString('vi-VN')})`);
  console.log(`Ngân sách Affiliate: 4.1 Macro = ${macroTotalBAff.toLocaleString('vi-VN')} đ | 4.1.1 Input = ${totalBAff.toLocaleString('vi-VN')} đ (Chênh: ${(macroTotalBAff - totalBAff).toLocaleString('vi-VN')} đ)`);
  console.log(`Video Self Channel: 4.1 Macro = ${macroTotalVSelf.toLocaleString('vi-VN')} | 4.1.1 Input = ${totalVSelf.toLocaleString('vi-VN')} (Chênh: ${(macroTotalVSelf - totalVSelf).toLocaleString('vi-VN')})`);
  console.log(`Ngân sách Self Channel: 4.1 Macro = ${macroTotalBSelf.toLocaleString('vi-VN')} đ | 4.1.1 Input = ${totalBSelf.toLocaleString('vi-VN')} đ (Chênh: ${(macroTotalBSelf - totalBSelf).toLocaleString('vi-VN')} đ)`);

  // Phân tích chi tiết 48 gian trùng khớp xem có lệch số không
  let diffCount = 0;
  const diffStores = [];
  for (const [s, mData] of b2cStoresMacro.entries()) {
    if (octStoresInput.has(s)) {
      const iData = octStoresInput.get(s);
      const vAffDiff = mData.videoAff - iData.vAff;
      const bAffDiff = mData.budgetAff - iData.bAff;
      const vSelfDiff = mData.videoSelf - iData.vSelf;
      const bSelfDiff = mData.budgetSelf - iData.bSelf;

      if (vAffDiff !== 0 || bAffDiff !== 0 || vSelfDiff !== 0 || bSelfDiff !== 0) {
        diffCount++;
        diffStores.push({
          store: s,
          macro: mData,
          input: iData,
          diff: { vAffDiff, bAffDiff, vSelfDiff, bSelfDiff }
        });
      }
    }
  }

  console.log(`\nTrong 48 gian có ở cả 2 file:`);
  console.log(`- Trùng khớp 100% số liệu: ${48 - diffCount} gian hàng`);
  console.log(`- Có độ lệch số liệu (Macro vs Input tuần): ${diffCount} gian hàng`);
  if (diffStores.length > 0) {
    console.log('Top 5 gian lệch:');
    diffStores.slice(0, 5).forEach(d => {
      console.log(`  * ${d.store}:`);
      console.log(`    - Video Aff: Macro=${d.macro.videoAff} vs Input=${d.input.vAff} (Lệch: ${d.diff.vAffDiff})`);
      console.log(`    - NS Aff: Macro=${d.macro.budgetAff.toLocaleString('vi-VN')} vs Input=${d.input.bAff.toLocaleString('vi-VN')} (Lệch: ${d.diff.bAffDiff.toLocaleString('vi-VN')})`);
      console.log(`    - Video Self: Macro=${d.macro.videoSelf} vs Input=${d.input.vSelf} (Lệch: ${d.diff.vSelfDiff})`);
      console.log(`    - NS Self: Macro=${d.macro.budgetSelf.toLocaleString('vi-VN')} vs Input=${d.input.bSelf.toLocaleString('vi-VN')} (Lệch: ${d.diff.bSelfDiff.toLocaleString('vi-VN')})`);
    });
  }
}

crossAnalyze().catch(console.error);
