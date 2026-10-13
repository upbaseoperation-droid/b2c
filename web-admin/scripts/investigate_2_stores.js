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

const stores = ['Dulux_TikTok_E2E-C', 'lgdailybeauty_vietnam_TikTok_E2E-C'];

async function investigate2Stores() {
  console.log('=== KIỂM TRA 2 GIAN HÀNG: Dulux và lgdailybeauty ===\n');

  // 1. Kiểm tra trong 4.1 Plan order tổng
  const wbMacro = new ExcelJS.Workbook();
  await wbMacro.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const wsMacro = wbMacro.worksheets[0];
  const hMacro = {};
  wsMacro.getRow(1).eachCell((c, col) => hMacro[col] = String(c.value).trim());

  console.log('--- 1. TÌM KIẾM TRONG FILE 4.1 Plan order tổng ---');
  let foundInMacro = 0;
  for (let r = 2; r <= wsMacro.rowCount; r++) {
    const row = wsMacro.getRow(r);
    const store = String(row.getCell(2).value || '').trim();
    if (stores.includes(store)) {
      foundInMacro++;
      const mVal = row.getCell(5).value;
      let mStr = '';
      if (mVal instanceof Date) {
        mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
      } else {
        mStr = String(mVal || '').trim();
      }

      console.log(`\nTìm thấy dòng ${r} trong 4.1: Store='${store}', Tháng='${mStr}'`);
      console.log(`  - B2C phụ trách (Cột 25): ${JSON.stringify(row.getCell(25).value)}`);
      console.log(`  - Sàn (Cột 54): ${row.getCell(54).value}`);
      console.log(`  - Growth_PIC (Cột 35): ${row.getCell(35).value}`);
      console.log(`  - Booking PIC (Cột 60): ${row.getCell(60).value}`);
      console.log(`  - Booking phụ trách (Cột 39): ${row.getCell(39).value}`);
      console.log(`  - (Plan) NMV (Cột 6): ${parseNum(row.getCell(6).value).toLocaleString('vi-VN')} đ`);
      console.log(`  - Số video affiliate (Cột 10): ${parseNum(row.getCell(10).value)}`);
      console.log(`  - Chi phí video affiliate (Cột 26): ${parseNum(row.getCell(26).value).toLocaleString('vi-VN')} đ`);
      console.log(`  - Số video self channel (Cột 28): ${parseNum(row.getCell(28).value)}`);
      console.log(`  - Chi phí video self channel (Cột 33): ${parseNum(row.getCell(33).value).toLocaleString('vi-VN')} đ`);
      console.log(`  - Tâm phụ trách (Cột 52): ${row.getCell(52).value}`);
      console.log(`  - Note (Cột 49): ${row.getCell(49).value}`);
      console.log(`  - Trạng thái gian hàng (Cột 43): ${row.getCell(43).value}`);
    }
  }
  if (foundInMacro === 0) {
    console.log('Hoàn toàn KHÔNG TÌM THẤY 2 gian hàng này trong file 4.1 Plan order tổng!');
  }

  // 2. Kiểm tra trong 4.1.1 Input plan
  const wbInput = new ExcelJS.Workbook();
  await wbInput.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1.1 Input plan (1).xlsx'));
  const wsInput = wbInput.worksheets[0];
  const hInput = {};
  wsInput.getRow(1).eachCell((c, col) => hInput[col] = String(c.value).trim());

  console.log('\n--- 2. CHI TIẾT TRONG FILE 4.1.1 Input plan ---');
  for (const target of stores) {
    console.log(`\n=== Gian hàng: ${target} ===`);
    let countRows = 0;
    let totalVAff = 0, totalBAff = 0, totalVSelf = 0, totalBSelf = 0;

    for (let r = 2; r <= wsInput.rowCount; r++) {
      const row = wsInput.getRow(r);
      const store = String(row.getCell(4).value || '').trim();
      const mVal = row.getCell(1).value;
      let mStr = '';
      if (mVal instanceof Date) {
        mStr = `${mVal.getFullYear()}/${String(mVal.getMonth() + 1).padStart(2, '0')}`;
      } else {
        mStr = String(mVal || '').trim();
      }

      if (store === target) {
        countRows++;
        const week = row.getCell(5).value;
        const pic = row.getCell(50).value || row.getCell(3).value;
        const leader = row.getCell(55).value;
        const brand = row.getCell(58).value;
        const vAff = parseNum(row.getCell(8).value);
        const bAff = parseNum(row.getCell(17).value);
        const vSelf = parseNum(row.getCell(37).value);
        const bSelf = parseNum(row.getCell(43).value);
        const note = row.getCell(54).value;

        totalVAff += vAff;
        totalBAff += bAff;
        totalVSelf += vSelf;
        totalBSelf += bSelf;

        console.log(`  Dòng ${r} | Tháng: ${mStr} | Tuần: ${week} | PIC: ${pic} | Leader: ${leader} | Brand: ${brand} | Aff: ${vAff} video (${bAff.toLocaleString('vi-VN')} đ) | Self: ${vSelf} video (${bSelf.toLocaleString('vi-VN')} đ) | Note: ${note || ''}`);
      }
    }
    console.log(`  => TỔNG CỘNG: ${countRows} dòng | Video Aff: ${totalVAff} (${totalBAff.toLocaleString('vi-VN')} đ) | Video Self: ${totalVSelf} (${totalBSelf.toLocaleString('vi-VN')} đ)`);
  }
}

investigate2Stores().catch(console.error);
