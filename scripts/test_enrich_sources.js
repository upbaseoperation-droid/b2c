const fs = require('fs');
const readline = require('readline');
const path = require('path');
const ExcelJS = require(path.resolve(__dirname, '../web-admin/node_modules/exceljs'));

async function testEnrich() {
  console.log('1. Reading 3.1 Unapproved from B2C_Quản lý Booking (1).xlsx...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('./B2C_Quản lý Booking (1).xlsx');
  
  const ws31un = wb.getWorksheet('3.1 List KOC chưa duyệt');
  const map31un = new Map();
  ws31un.eachRow((row, r) => {
    if (r === 1) return;
    const cid = (row.getCell(1).text || '').trim().toLowerCase();
    if (!cid) return;
    const bankName = (row.getCell(9).text || '').trim();
    const bankAcc = (row.getCell(8).text || '').trim();
    const bankHolder = (row.getCell(7).text || '').trim();
    const cccd = (row.getCell(10).text || '').trim();
    const addr = (row.getCell(11).text || '').trim();
    const pic = (row.getCell(3).text || row.getCell(14).text || '').trim();
    const price = typeof row.getCell(5).value === 'number' ? row.getCell(5).value : parseFloat(row.getCell(5).text) || 0;
    const tep = (row.getCell(15).text || '').trim();

    if (!map31un.has(cid)) {
      map31un.set(cid, { bankName, bankAcc, bankHolder, cccd, addr, pic, price, tep });
    } else {
      const cur = map31un.get(cid);
      if (!cur.bankName && bankName) cur.bankName = bankName;
      if (!cur.bankAcc && bankAcc) cur.bankAcc = bankAcc;
      if (!cur.bankHolder && bankHolder) cur.bankHolder = bankHolder;
      if (!cur.cccd && cccd) cur.cccd = cccd;
      if (!cur.addr && addr) cur.addr = addr;
      if (!cur.pic && pic) cur.pic = pic;
      if (!cur.tep && tep) cur.tep = tep;
      if (price > 0 && cur.price === 0) cur.price = price;
    }
  });
  console.log('Loaded 3.1 unapproved unique channels:', map31un.size);

  let cccdCount = 0;
  let bankCount = 0;
  let addrCount = 0;
  map31un.forEach(v => {
    if (v.cccd) cccdCount++;
    if (v.bankAcc && v.bankName) bankCount++;
    if (v.addr) addrCount++;
  });
  console.log(`In 3.1 Unapproved: ${cccdCount} have CCCD, ${bankCount} have Bank, ${addrCount} have Address.`);

  // 2. Check KOL Livestream
  const wsLive = wb.getWorksheet('7.1 KOL livestream');
  const mapLive = new Map();
  if (wsLive) {
    wsLive.eachRow((row, r) => {
      if (r === 1) return;
      const cid = (row.getCell(1).text || '').trim().toLowerCase();
      if (!cid) return;
      const contact = (row.getCell(14).text || '').trim();
      const managerName = (row.getCell(15).text || '').trim();
      const network = (row.getCell(12).text || '').trim();
      const networkLink = (row.getCell(13).text || '').trim();
      mapLive.set(cid, { contact, managerName, network, networkLink });
    });
  }
  console.log('Loaded 7.1 KOL livestream unique channels:', mapLive.size);
}

testEnrich().catch(console.error);
