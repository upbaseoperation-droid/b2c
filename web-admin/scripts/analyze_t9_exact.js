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

async function runT9() {
  const wbMacro = new ExcelJS.Workbook();
  await wbMacro.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const wsMacro = wbMacro.worksheets[0];

  const picStats = new Map();
  let gAff = 0, gTap = 0, gCast = 0, gSelf = 0;
  let rowCount = 0;
  const storeSet = new Set();

  for (let r = 2; r <= wsMacro.rowCount; r++) {
    const row = wsMacro.getRow(r);
    const mVal = row.getCell(5).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = mVal.getFullYear() + '/' + String(mVal.getMonth() + 1).padStart(2, '0');
    } else {
      mStr = String(mVal || '').trim();
    }
    if (mStr !== '2026/09' && !mStr.includes('09/2026') && mStr !== '2026-09-01') continue;

    const b2c = row.getCell(25).value;
    if (Number(b2c) !== 1 && String(b2c).trim() !== '1') continue;

    rowCount++;
    const store = String(row.getCell(2).value || '').trim();
    storeSet.add(store);

    let pic = String(row.getCell(60).value || '').trim();
    if (!pic || pic === '1') pic = String(row.getCell(39).value || '').trim();
    if (!pic || pic === '1') pic = 'Chưa phân bổ / Tạm ngưng';

    const tapBrand = parseNum(row.getCell(14).value);
    const tap = parseNum(row.getCell(15).value);
    const tapUp = parseNum(row.getCell(16).value);
    const vTap = tapBrand + tap + tapUp;

    let vCast = 0;
    for (let c = 17; c <= 23; c++) {
      vCast += parseNum(row.getCell(c).value);
    }
    const vAff = vTap + vCast;
    const vSelf = parseNum(row.getCell(28).value);

    gAff += vAff;
    gTap += vTap;
    gCast += vCast;
    gSelf += vSelf;

    if (!picStats.has(pic)) {
      picStats.set(pic, {
        name: pic,
        stores: [],
        vCast: 0,
        vTap: 0,
        vAff: 0,
        vSelf: 0,
        total: 0
      });
    }
    const p = picStats.get(pic);
    p.stores.push(store);
    p.vCast += vCast;
    p.vTap += vTap;
    p.vAff += vAff;
    p.vSelf += vSelf;
    p.total += (vAff + vSelf);
  }

  const arr = Array.from(picStats.values()).sort((a,b) => b.total - a.total);

  console.log('========================================================================');
  console.log('BÁO CÁO TỔNG HỢP NHÂN SỰ & CHỈ TIÊU VIDEO B2C (THÁNG 09/2026)');
  console.log('Nguồn: File 4.1 Plan order tổng (Chuẩn hóa phạm vi B2C phụ trách = 1)');
  console.log('========================================================================');
  console.log(`Tổng số nhân sự có việc: ${arr.filter(x => !x.name.includes('Chưa phân bổ')).length}`);
  console.log(`Tổng Video Affiliate: ${gAff.toLocaleString('vi-VN')}`);
  console.log(`  + Affiliate Có Cast (Paid): ${gCast.toLocaleString('vi-VN')} (${((gCast/gAff)*100).toFixed(1)}%)`);
  console.log(`  + TAP Affiliate (FOC 0đ): ${gTap.toLocaleString('vi-VN')} (${((gTap/gAff)*100).toFixed(1)}%)`);
  console.log(`Tổng Video Self-channel: ${gSelf.toLocaleString('vi-VN')}`);
  console.log(`Tổng Toàn bộ Video toàn phòng: ${(gAff + gSelf).toLocaleString('vi-VN')}`);
  console.log('------------------------------------------------------------------------');

  console.table(arr.map((x, i) => ({
    'STT': i + 1,
    'Nhân sự (PIC)': x.name,
    'Số gian': x.stores.length,
    'Aff Có Cast (Paid)': x.vCast,
    'TAP Aff (FOC)': x.vTap,
    'Tổng Video Aff': x.vAff,
    'Video Self': x.vSelf,
    'Tổng Video': x.total,
    '% Có Cast': (x.vAff > 0 ? ((x.vCast / x.vAff) * 100).toFixed(1) : 0) + '%'
  })));

  console.log('\n--- CHI TIẾT GIAN HÀNG THÁNG 9 CỦA TỪNG NHÂN SỰ ---');
  arr.forEach((x, i) => {
    console.log(`${i + 1}. ${x.name} (${x.stores.length} gian | Cast: ${x.vCast} | TAP: ${x.vTap} | Aff: ${x.vAff} | Self: ${x.vSelf} | Tổng: ${x.total}):`);
    console.log(`   ${x.stores.join(', ')}`);
  });
}

runT9();
