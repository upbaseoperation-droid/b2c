const ExcelJS = require('exceljs');
const path = require('path');

function parseNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[₫$,\s]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

async function checkOnlyApproved() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_3.2 List duyệt book.xlsx'));
  const ws = wb.worksheets[0];

  const approvedKocMap = new Map();
  let totalApprovedRows = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const status = String(row.getCell(30).value || '').trim();

    // Check if status is Approved
    const isApproved = (status === 'Approved' || status.endsWith(',Approved'));

    if (isApproved) {
      totalApprovedRows++;
      const koc = String(row.getCell(2).value || '').trim().toLowerCase();
      const store = String(row.getCell(3).value || '').trim();
      const brand = String(row.getCell(4).value || '').trim();
      const pic = String(row.getCell(5).value || '').trim();
      const format = String(row.getCell(19).value || '').trim();
      const airDate = row.getCell(6).value;
      const costReal = parseNum(row.getCell(18).value);
      const costBO = parseNum(row.getCell(51).value);
      const paidReal = parseNum(row.getCell(15).value);

      const finalCost = paidReal > 0 ? paidReal : (costReal > 0 ? costReal : costBO);

      if (koc && koc !== 'null' && koc.length > 2 && finalCost > 0) {
        if (!approvedKocMap.has(koc)) approvedKocMap.set(koc, []);
        approvedKocMap.get(koc).push({
          r,
          store,
          brand,
          pic,
          format,
          airDate,
          finalCost,
          costReal,
          costBO,
          paidReal
        });
      }
    }
  }

  console.log('========================================================================');
  console.log('PHÂN TÍCH CHÊNH LỆCH GIÁ CHỈ TÍNH TRÊN CÁC DEAL ĐÃ DUYỆT (100% APPROVED)');
  console.log('========================================================================');
  console.log('Tổng số dòng đã được Kế toán duyệt (Approved):', totalApprovedRows);
  console.log('Tổng số KOC unique có giao dịch Approved:', approvedKocMap.size);

  let approvedMultiStoreCount = 0;
  let approvedPriceDiffCount = 0;
  const approvedVarianceList = [];

  for (const [koc, bookings] of approvedKocMap.entries()) {
    const stores = new Set(bookings.map(b => b.store));
    if (stores.size >= 2) {
      approvedMultiStoreCount++;
      const costs = bookings.map(b => b.finalCost);
      const minC = Math.min(...costs);
      const maxC = Math.max(...costs);
      const diff = maxC - minC;
      if (diff >= 1000000) {
        approvedPriceDiffCount++;
        approvedVarianceList.push({
          koc,
          stores: Array.from(stores),
          pics: Array.from(new Set(bookings.map(b => b.pic))),
          minC,
          maxC,
          diff,
          pct: ((diff / minC) * 100).toFixed(1),
          bookingsCount: bookings.length,
          sampleBookings: bookings
        });
      }
    }
  }

  approvedVarianceList.sort((a,b) => b.diff - a.diff);

  console.log('Số KOC có từ 2 gian hàng trở lên CÙNG ĐƯỢC DUYỆT (Approved):', approvedMultiStoreCount);
  console.log('Số KOC CÙNG ĐƯỢC DUYỆT (Approved) có chênh lệch giá >= 1.000.000 VNĐ:', approvedPriceDiffCount);
  console.log('\n--- TOP 10 KOC ĐÃ ĐƯỢC DUYỆT CHI THỰC TẾ (100% APPROVED) BỊ LỆCH GIÁ ---');
  approvedVarianceList.slice(0, 10).forEach((x, i) => {
    console.log((i + 1) + '. KOC "' + x.koc + '":');
    console.log('   - Giá Approved thấp nhất: ' + x.minC.toLocaleString('vi-VN') + ' đ');
    console.log('   - Giá Approved cao nhất: ' + x.maxC.toLocaleString('vi-VN') + ' đ');
    console.log('   - Chênh lệch: ' + x.diff.toLocaleString('vi-VN') + ' đ (+' + x.pct + '%)');
    console.log('   - Gian hàng duyệt: ' + x.stores.join(', '));
    console.log('   - Nhân sự phụ trách: ' + x.pics.join(', '));
  });
}

checkOnlyApproved();
