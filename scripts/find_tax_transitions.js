const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function findTransitions() {
  console.log('Đang đọc B2C_Quản lý Booking_3.2 List duyệt book.xlsx...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('./B2C_Quản lý Booking_3.2 List duyệt book.xlsx');
  const ws = wb.worksheets[0];
  
  // Collect deals per KOC
  const kocDeals = new Map();
  
  ws.eachRow((r, idx) => {
    if (idx > 1) {
      let ch = String(r.getCell(2).value || '').trim().toLowerCase().replace(/^@/, '');
      if (ch) {
        const dateVal = r.getCell(4).value; // Ngày book
        const taxType = String(r.getCell(17).value || '').trim();
        const accountHolder = String(r.getCell(23).value || '').trim();
        const cccdMst = String(r.getCell(26).value || '').trim();
        const brand = String(r.getCell(6).value || '').trim();
        const cost = r.getCell(18).value;
        const dealCode = String(r.getCell(1).value || '').trim();
        
        let normalizedType = 'OTHER';
        if (taxType.includes('cá nhân') || taxType.includes('TNCN')) normalizedType = 'CA_NHAN';
        else if (taxType.includes('HKD') || taxType.toLowerCase().includes('hộ kinh doanh')) normalizedType = 'HKD';
        else if (taxType.includes('doanh nghiệp') || taxType.includes('VAT')) normalizedType = 'DOANH_NGHIEP';

        if (!kocDeals.has(ch)) kocDeals.set(ch, []);
        kocDeals.get(ch).push({
          rowIdx: idx,
          date: dateVal,
          taxType,
          normalizedType,
          accountHolder,
          cccdMst,
          brand,
          cost,
          dealCode
        });
      }
    }
  });

  console.log('Tổng số KOC có phát sinh deal:', kocDeals.size);

  const matchedHkd = [];
  const matchedDn = [];

  for (const [ch, deals] of kocDeals.entries()) {
    const validDeals = deals.filter(d => d.normalizedType !== 'OTHER');
    if (validDeals.length >= 3) {
      const typesSeq = validDeals.map(d => d.normalizedType);
      
      // 1. Check CA_NHAN -> HKD -> CA_NHAN
      let stageHkd = 0;
      for (const t of typesSeq) {
        if (stageHkd === 0 && t === 'CA_NHAN') stageHkd = 1;
        else if (stageHkd === 1 && t === 'HKD') stageHkd = 2;
        else if (stageHkd === 2 && t === 'CA_NHAN') { stageHkd = 3; break; }
      }

      if (stageHkd === 3) {
        matchedHkd.push({
          channel: ch,
          totalDeals: deals.length,
          seq: typesSeq,
          deals: validDeals
        });
      }

      // 2. Check CA_NHAN -> DOANH_NGHIEP -> CA_NHAN
      let stageDn = 0;
      for (const t of typesSeq) {
        if (stageDn === 0 && t === 'CA_NHAN') stageDn = 1;
        else if (stageDn === 1 && t === 'DOANH_NGHIEP') stageDn = 2;
        else if (stageDn === 2 && t === 'CA_NHAN') { stageDn = 3; break; }
      }

      if (stageDn === 3) {
        matchedDn.push({
          channel: ch,
          totalDeals: deals.length,
          seq: typesSeq,
          deals: validDeals
        });
      }
    }
  }

  console.log('=== KẾT QUẢ PHÂN TÍCH ===');
  console.log(`1. Số trường hợp chuyển đổi: Cá nhân -> Hộ kinh doanh (HKD) -> Cá nhân: ${matchedHkd.length} KOCs`);
  matchedHkd.forEach((m, i) => {
    console.log(`\n[TRƯỜNG HỢP ${i+1}] Kênh: @${m.channel} (Tổng ${m.totalDeals} deal)`);
    console.log('Chuỗi chuyển đổi:', m.seq.join(' -> '));
    m.deals.forEach(d => {
      console.log(`  - Dòng ${d.rowIdx} | Deal: ${d.dealCode} | Loại: ${d.taxType} | Chủ TK: ${d.accountHolder} | MST/CCCD: ${d.cccdMst} | Brand: ${d.brand}`);
    });
  });

  console.log(`\n2. Số trường hợp chuyển đổi: Cá nhân -> Doanh nghiệp (Công ty) -> Cá nhân: ${matchedDn.length} KOCs`);
  matchedDn.forEach((m, i) => {
    console.log(`\n[TRƯỜNG HỢP ${i+1}] Kênh: @${m.channel} (Tổng ${m.totalDeals} deal)`);
    console.log('Chuỗi chuyển đổi:', m.seq.join(' -> '));
    m.deals.slice(0, 8).forEach(d => {
      console.log(`  - Dòng ${d.rowIdx} | Deal: ${d.dealCode} | Loại: ${d.taxType} | Chủ TK: ${d.accountHolder} | MST/CCCD: ${d.cccdMst} | Brand: ${d.brand}`);
    });
    if (m.deals.length > 8) console.log(`  ... và ${m.deals.length - 8} deal khác.`);
  });
}

findTransitions().catch(console.error);
