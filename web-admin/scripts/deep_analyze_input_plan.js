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

async function deepAnalyze() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1.1 Input plan (1).xlsx'));
  const ws = wb.worksheets[0];

  console.log(`Sheet: ${ws.name}, Rows: ${ws.rowCount}, Cols: ${ws.columnCount}`);

  // Tống hợp theo tháng
  const monthStats = new Map();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const mVal = row.getCell(1).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
    } else {
      mStr = String(mVal || '').trim();
    }
    if (!mStr) continue;

    if (!monthStats.has(mStr)) {
      monthStats.set(mStr, {
        rows: 0,
        stores: new Set(),
        brands: new Set(),
        vAffTikTok: 0,
        bAffTikTok: 0,
        tap: 0,
        kocTiers: { kl1: 0, kl2: 0, kl3: 0, kl4: 0, kl5: 0, kl6: 0, kl7: 0 },
        vSelf: 0,
        bSelf: 0,
        liveCount: 0,
        liveBudget: 0,
        shopeeAff: 0,
        shopeeReup: 0,
        shopeeBudget: 0,
        fbAff: 0,
        fbReup: 0,
        fbBudget: 0,
        igAff: 0,
        igReup: 0,
        igBudget: 0,
        thAff: 0,
        thReup: 0,
        thBudget: 0
      });
    }

    const st = monthStats.get(mStr);
    st.rows++;
    const store = row.getCell(4).value ? String(row.getCell(4).value).trim() : '';
    const brand = row.getCell(58).value ? String(row.getCell(58).value).trim() : '';
    if (store) st.stores.add(store);
    if (brand) st.brands.add(brand);

    st.vAffTikTok += parseNum(row.getCell(8).value);
    st.bAffTikTok += parseNum(row.getCell(17).value);
    st.tap += parseNum(row.getCell(9).value);
    st.kocTiers.kl1 += parseNum(row.getCell(10).value);
    st.kocTiers.kl2 += parseNum(row.getCell(11).value);
    st.kocTiers.kl3 += parseNum(row.getCell(12).value);
    st.kocTiers.kl4 += parseNum(row.getCell(13).value);
    st.kocTiers.kl5 += parseNum(row.getCell(14).value);
    st.kocTiers.kl6 += parseNum(row.getCell(15).value);
    st.kocTiers.kl7 += parseNum(row.getCell(16).value);

    st.vSelf += parseNum(row.getCell(37).value);
    st.bSelf += parseNum(row.getCell(43).value);
    st.liveCount += parseNum(row.getCell(59).value);
    st.liveBudget += parseNum(row.getCell(60).value);

    st.shopeeReup += parseNum(row.getCell(25).value);
    st.shopeeAff += parseNum(row.getCell(26).value);
    st.shopeeBudget += parseNum(row.getCell(27).value);

    st.fbReup += parseNum(row.getCell(28).value);
    st.fbAff += parseNum(row.getCell(29).value);
    st.fbBudget += parseNum(row.getCell(30).value);

    st.igReup += parseNum(row.getCell(31).value);
    st.igAff += parseNum(row.getCell(32).value);
    st.igBudget += parseNum(row.getCell(33).value);

    st.thReup += parseNum(row.getCell(34).value);
    st.thAff += parseNum(row.getCell(35).value);
    st.thBudget += parseNum(row.getCell(36).value);
  }

  console.log('\n================ THỐNG KÊ CHI TIẾT CÁC KỲ ================');
  for (const [m, st] of monthStats.entries()) {
    console.log(`\n--- KỲ: ${m} ---`);
    console.log(`Số dòng: ${st.rows} | Số gian: ${st.stores.size} | Số Brand: ${st.brands.size}`);
    console.log(`TikTok Video Affiliate: ${st.vAffTikTok.toLocaleString('vi-VN')} video | Ngân sách: ${st.bAffTikTok.toLocaleString('vi-VN')} đ`);
    console.log(`  + TAP (UpAffiliate): ${st.tap.toLocaleString('vi-VN')}`);
    console.log(`  + KL1-KL7: KL1=${st.kocTiers.kl1}, KL2=${st.kocTiers.kl2}, KL3=${st.kocTiers.kl3}, KL4=${st.kocTiers.kl4}, KL5=${st.kocTiers.kl5}, KL6=${st.kocTiers.kl6}, KL7=${st.kocTiers.kl7}`);
    console.log(`Video Tự Xây (Self Channel): ${st.vSelf.toLocaleString('vi-VN')} video | Ngân sách: ${st.bSelf.toLocaleString('vi-VN')} đ`);
    console.log(`Livestream Affiliate: ${st.liveCount} phiên | Ngân sách: ${st.liveBudget.toLocaleString('vi-VN')} đ`);
    console.log(`Đa nền tảng:`);
    console.log(`  - Shopee: ${st.shopeeAff} aff, ${st.shopeeReup} reup | NS: ${st.shopeeBudget.toLocaleString('vi-VN')} đ`);
    console.log(`  - Facebook: ${st.fbAff} aff, ${st.fbReup} reup | NS: ${st.fbBudget.toLocaleString('vi-VN')} đ`);
    console.log(`  - Instagram: ${st.igAff} aff, ${st.igReup} reup | NS: ${st.igBudget.toLocaleString('vi-VN')} đ`);
    console.log(`  - Threads: ${st.thAff} aff, ${st.thReup} reup | NS: ${st.thBudget.toLocaleString('vi-VN')} đ`);
  }
}

deepAnalyze().catch(console.error);
