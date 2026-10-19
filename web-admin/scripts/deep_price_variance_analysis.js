const ExcelJS = require('exceljs');
const path = require('path');

function parseNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[₫$,\s]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_3.2 List duyệt book.xlsx'));
  const ws = wb.worksheets[0];

  const kocPriceMap = new Map(); // koc -> { min, max, diff, rows: [] }
  let totalWith5455 = 0;
  let totalVarianceCases = 0;
  let totalWasteMoney = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const koc = String(row.getCell(2).value || '').trim().toLowerCase();
    const store = String(row.getCell(3).value || '').trim();
    const brand = String(row.getCell(4).value || '').trim();
    const pic = String(row.getCell(5).value || '').trim();
    const format = String(row.getCell(19).value || '').trim();
    const maxVal = parseNum(row.getCell(54).value);
    const minVal = parseNum(row.getCell(55).value);
    const costReal = parseNum(row.getCell(18).value) || parseNum(row.getCell(51).value);

    if (maxVal > 0 && minVal > 0) {
      totalWith5455++;
      if (maxVal > minVal) {
        totalVarianceCases++;
        if (!kocPriceMap.has(koc)) {
          kocPriceMap.set(koc, {
            koc,
            min: minVal,
            max: maxVal,
            diff: maxVal - minVal,
            pct: ((maxVal - minVal) / minVal) * 100,
            bookings: []
          });
        }
        const item = kocPriceMap.get(koc);
        item.bookings.push({ r, store, brand, pic, format, costReal });
      }
    }
  }

  const kocList = Array.from(kocPriceMap.values()).sort((a,b) => b.diff - a.diff);

  // Group by variance range
  const tier500k_2m = kocList.filter(x => x.diff >= 500000 && x.diff < 2000000);
  const tier2m_5m = kocList.filter(x => x.diff >= 2000000 && x.diff < 5000000);
  const tier5m_15m = kocList.filter(x => x.diff >= 5000000 && x.diff < 15000000);
  const tier15m_plus = kocList.filter(x => x.diff >= 15000000);

  console.log('========================================================================');
  console.log('BÁO CÁO PHÂN TÍCH CHUYÊN SÂU CHÊNH LỆCH ĐƠN GIÁ BOOKING (PRICE VARIANCE)');
  console.log('Nguồn dữ liệu: Cột 54 (Giá book cao nhất) & Cột 55 (Giá book thấp nhất) file 3.2');
  console.log('========================================================================');
  console.log('Tổng số dòng có ghi nhận biên độ giá (Cột 54 & 55):', totalWith5455);
  console.log('Số lượt booking phát sinh chênh lệch giá (Max > Min):', totalVarianceCases, '(' + ((totalVarianceCases / totalWith5455) * 100).toFixed(1) + '%)');
  console.log('Tổng số KOC unique có biến động giá book:', kocList.length);

  let sumDiff = kocList.reduce((s, x) => s + x.diff, 0);
  let avgPct = kocList.reduce((s, x) => s + x.pct, 0) / kocList.length;
  console.log('Mức chênh lệch phần trăm trung bình trên mỗi KOC:', avgPct.toFixed(1) + '%');

  console.log('\n--- PHÂN BỔ MỨC ĐỘ CHÊNH LỆCH GIÁ ---');
  console.log(`1. Nhóm chênh lệch nhẹ (500k - dưới 2 triệu): ${tier500k_2m.length} KOC (Chủ yếu KOC Micro/Nano)`);
  console.log(`2. Nhóm chênh lệch đáng kể (2 triệu - dưới 5 triệu): ${tier2m_5m.length} KOC (Chủ yếu KOC Mid-tier)`);
  console.log(`3. Nhóm chênh lệch lớn (5 triệu - dưới 15 triệu): ${tier5m_15m.length} KOC (Chủ yếu KOC Macro)`);
  console.log(`4. Nhóm chênh lệch rất lớn (>= 15 triệu): ${tier15m_plus.length} KOC (Celeb/KOL hàng đầu)`);

  console.log('\n--- TOP 10 KOC CÓ ĐỘ LỆCH GIÁ CỤ THỂ VÀ BẰNG CHỨNG GIAN HÀNG ---');
  kocList.slice(0, 10).forEach((x, i) => {
    console.log(`${i + 1}. KOC "${x.koc}":`);
    console.log(`   - Giá thấp nhất: ${x.min.toLocaleString('vi-VN')} đ`);
    console.log(`   - Giá cao nhất: ${x.max.toLocaleString('vi-VN')} đ`);
    console.log(`   - Mức chênh lệch: ${x.diff.toLocaleString('vi-VN')} đ (+${x.pct.toFixed(1)}%)`);
    const uniquePics = Array.from(new Set(x.bookings.map(b => b.pic))).filter(Boolean);
    const uniqueStores = Array.from(new Set(x.bookings.map(b => b.store))).filter(Boolean);
    console.log(`   - Các nhân sự từng book: ${uniquePics.join(', ')}`);
    console.log(`   - Các gian hàng đã book: ${uniqueStores.join(', ')}`);
  });
}

run();
