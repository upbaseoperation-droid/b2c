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

async function analyze() {
  const wbMacro = new ExcelJS.Workbook();
  await wbMacro.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_4.1 Plan order tổng.xlsx'));
  const wsMacro = wbMacro.worksheets[0];

  const fallbackMap = {
    'Karmart_Shopee_E2E-C': 'Trần Hải Phượng',
    'Mine_Shopee_E2E-C': 'Lại Ngọc Huyền',
    'Rejuran_Shopee_E2E-O': 'Lê Thanh Hải',
    'Revision_Shopee_E2E-O': 'Nguyễn Quỳnh Trang',
    'Royal Canin_TikTok_E2E-S': 'Nguyễn Ngọc Huyền'
  };

  const picStats = new Map();
  let grandAff = 0, grandSelf = 0;

  for (let r = 2; r <= wsMacro.rowCount; r++) {
    const row = wsMacro.getRow(r);
    const mVal = row.getCell(5).value;
    let mStr = '';
    if (mVal instanceof Date) {
      mStr = mVal.getFullYear() + '/' + String(mVal.getMonth() + 1).padStart(2, '0');
    } else {
      mStr = String(mVal || '').trim();
    }
    if (mStr !== '2026/10' && !mStr.includes('10/2026') && mStr !== '2026-10-01') continue;

    const b2c = row.getCell(25).value;
    if (Number(b2c) !== 1 && String(b2c).trim() !== '1') continue;

    const store = String(row.getCell(2).value || '').trim();
    let pic = String(row.getCell(60).value || '').trim();
    if (!pic || pic === '1') {
      pic = String(row.getCell(39).value || '').trim();
    }
    if (!pic || pic === '1') {
      pic = fallbackMap[store] || 'Không chạy (4PM Shopee, Baegayul, Face Republic)';
    }

    const vAff = parseNum(row.getCell(10).value);
    const vSelf = parseNum(row.getCell(28).value);

    grandAff += vAff;
    grandSelf += vSelf;

    if (!picStats.has(pic)) {
      picStats.set(pic, { name: pic, stores: [], vAff: 0, vSelf: 0, total: 0 });
    }
    const p = picStats.get(pic);
    p.stores.push(store);
    p.vAff += vAff;
    p.vSelf += vSelf;
    p.total += (vAff + vSelf);
  }

  const arr = Array.from(picStats.values()).sort((a,b) => b.total - a.total);
  console.log('========================================================================');
  console.log('BÁO CÁO TỔNG HỢP NHÂN SỰ & CHỈ TIÊU VIDEO B2C (THÁNG 10/2026)');
  console.log('Nguồn: File 4.1 Plan order tổng (Chuẩn hóa phạm vi B2C phụ trách = 1)');
  console.log('========================================================================');
  console.log('Tổng số nhân sự nhận order thực tế:', arr.filter(x => !x.name.includes('Không chạy')).length);
  console.log('Tổng Video Affiliate cả phòng:', grandAff);
  console.log('Tổng Video Self-channel cả phòng:', grandSelf);
  console.log('Tổng Video toàn bộ B2C:', grandAff + grandSelf);
  console.log('------------------------------------------------------------------------');

  console.table(arr.map((x, i) => ({
    'STT': i + 1,
    'Nhân sự (PIC)': x.name,
    'Số gian': x.stores.length,
    'Video Affiliate': x.vAff,
    'Video Self Channel': x.vSelf,
    'Tổng Video': x.total,
    'Tỷ trọng Aff': (x.total > 0 ? ((x.vAff / x.total) * 100).toFixed(1) : 0) + '%'
  })));

  console.log('\n--- CHI TIẾT GIAN HÀNG CỦA TỪNG NHÂN SỰ ---');
  arr.forEach((x, i) => {
    console.log((i + 1) + '. ' + x.name + ' (' + x.stores.length + ' gian | Aff: ' + x.vAff + ' | Self: ' + x.vSelf + ' | Tổng: ' + x.total + '):');
    console.log('   Gian: ' + x.stores.join(', '));
  });
}

analyze();
