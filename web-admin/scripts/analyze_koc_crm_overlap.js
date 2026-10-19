const ExcelJS = require('exceljs');
const path = require('path');

async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('..', 'B2C_Quản lý Booking_3.2 List duyệt book.xlsx'));
  const ws = wb.worksheets[0];

  const kocMap = new Map(); // koc -> { pics: Set, stores: Set, brands: Set, costs: [] }
  let duplicateLinkAirCount = 0;
  let totalLinkAir = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const koc = String(row.getCell(2).value || '').trim().toLowerCase();
    const store = String(row.getCell(3).value || '').trim();
    const brand = String(row.getCell(4).value || '').trim();
    const pic = String(row.getCell(5).value || '').trim();
    const linkAir = row.getCell(9).value;
    const isDupLink = row.getCell(11).value;

    let costVal = row.getCell(51).value;
    let numCost = 0;
    if (typeof costVal === 'number') numCost = costVal;
    else if (costVal) numCost = parseFloat(String(costVal).replace(/[₫$,\s]/g, '')) || 0;

    if (linkAir && String(linkAir).trim() !== '' && String(linkAir).trim() !== 'do') {
      totalLinkAir++;
      if (Number(isDupLink) > 1 || String(isDupLink).trim() === '> 1') {
        duplicateLinkAirCount++;
      }
    }

    if (koc && koc !== 'null' && koc !== 'undefined' && koc.length > 2) {
      if (!kocMap.has(koc)) {
        kocMap.set(koc, {
          koc,
          pics: new Set(),
          stores: new Set(),
          brands: new Set(),
          costs: []
        });
      }
      const entry = kocMap.get(koc);
      if (pic && pic !== 'null') entry.pics.add(pic);
      if (store && store !== 'null') entry.stores.add(store);
      if (brand && brand !== 'null') entry.brands.add(brand);
      if (numCost > 0) entry.costs.push({ pic, store, brand, cost: numCost });
    }
  }

  console.log('========================================================================');
  console.log('PHÂN TÍCH QUẢN TRỊ KOC THEO CRM & ĐỘ CHỒNG CHÉO NỘI BỘ');
  console.log('Nguồn: B2C_Quản lý Booking_3.2 List duyệt book (16.025 bản ghi)');
  console.log('========================================================================');
  console.log('Tổng số KOC unique trong hệ thống:', kocMap.size);

  let multiPicCount = 0;
  let multiStoreCount = 0;
  let topPicKoc = null;
  let topStoreKoc = null;

  const priceVarianceList = [];

  for (const [koc, data] of kocMap.entries()) {
    if (data.pics.size >= 2) {
      multiPicCount++;
      if (!topPicKoc || data.pics.size > topPicKoc.pics.size) topPicKoc = data;
    }
    if (data.stores.size >= 2) {
      multiStoreCount++;
      if (!topStoreKoc || data.stores.size > topStoreKoc.stores.size) topStoreKoc = data;
    }

    // Price variance across PICs or stores
    if (data.costs.length >= 2) {
      const distinctCosts = data.costs.map(c => c.cost);
      const minCost = Math.min(...distinctCosts);
      const maxCost = Math.max(...distinctCosts);
      const diff = maxCost - minCost;
      if (diff >= 1000000) {
        priceVarianceList.push({
          koc,
          pics: Array.from(data.pics),
          stores: Array.from(data.stores),
          minCost,
          maxCost,
          diff,
          costEntries: data.costs
        });
      }
    }
  }

  console.log(`\n1. ĐỘ TRÙNG LẶP ĐẦU MỐI (PAINPOINT: 1 KOC nhiều người làm việc riêng lẻ):`);
  console.log(`- Số KOC có từ 2 CHUYÊN VIÊN trở lên cùng liên hệ: ${multiPicCount} KOC (${((multiPicCount / kocMap.size) * 100).toFixed(1)}%)`);
  console.log(`- Số KOC nhận job từ 2 GIAN HÀNG trở lên: ${multiStoreCount} KOC (${((multiStoreCount / kocMap.size) * 100).toFixed(1)}%)`);
  if (topPicKoc) {
    console.log(`- Kỷ lục chồng chéo đầu mối: KOC "${topPicKoc.koc}" có ${topPicKoc.pics.size} nhân sự khác nhau cùng book (${Array.from(topPicKoc.pics).join(', ')}) trên ${topPicKoc.stores.size} gian hàng!`);
  }

  console.log(`\n2. CHÊNH LỆCH ĐƠN GIÁ BOOKING TRÊN CÙNG 1 KOC (PRICE VARIANCE):`);
  console.log(`- Số KOC có mức giá lệch >= 1.000.000 VNĐ giữa các lần book: ${priceVarianceList.length} KOC`);
  priceVarianceList.sort((a,b) => b.diff - a.diff);
  console.log('Top 5 KOC bị lệch giá booking lớn nhất:');
  priceVarianceList.slice(0, 5).forEach((p, idx) => {
    console.log(`  ${idx + 1}. KOC "${p.koc}":`);
    console.log(`     + Giá thấp nhất: ${p.minCost.toLocaleString('vi-VN')} đ vs Giá cao nhất: ${p.maxCost.toLocaleString('vi-VN')} đ (LỆCH: ${p.diff.toLocaleString('vi-VN')} đ)`);
    console.log(`     + Nhân sự book: ${p.pics.join(', ')}`);
    console.log(`     + Gian hàng: ${p.stores.join(', ')}`);
  });

  console.log(`\n3. TRÙNG LẶP LINK AIR (Cột 11: Check trùng link air):`);
  console.log(`- Tổng số bài air có link hợp lệ: ${totalLinkAir}`);
  console.log(`- Số link bị phát hiện TRÙNG LẶP (nghiệm thu 2 lần cho 1 link): ${duplicateLinkAirCount}`);
}

run();
