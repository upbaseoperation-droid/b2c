const ExcelJS = require('exceljs');

async function inspectRealLeaders() {
  const wb1 = new ExcelJS.Workbook();
  await wb1.xlsx.readFile('../B2C_Quản lý Booking_4.1 Plan order tổng.xlsx');
  const s1 = wb1.getWorksheet('4.1 Plan order tổng');

  const stores = [];
  for (let r = 2; r <= s1.rowCount; r++) {
    const row = s1.getRow(r);
    const m = row.getCell(5).value;
    if (String(m).trim() !== '2026/10') continue;
    const b2c = row.getCell(25).value;
    if (!b2c || String(b2c).trim() === '' || String(b2c).trim() === '0' || String(b2c).trim() === 'false') continue;

    const store = String(row.getCell(2).value || '').trim();
    const brand = String(row.getCell(3).value || '').trim();
    const col26 = Number(row.getCell(26).value) || 0; // Chi phi aff
    const col33 = Number(row.getCell(33).value) || 0; // Chi phi self
    const col35 = String(row.getCell(35).value || '').trim(); // Growth PIC
    const col38 = String(row.getCell(38).value || '').trim(); // Leader confirm
    const col39 = String(row.getCell(39).value || '').trim(); // Booking phu trach
    const col52 = String(row.getCell(52).value || '').trim(); // Tâm phu trach
    const col60 = String(row.getCell(60).value || '').trim(); // Booking PIC
    const col104 = String(row.getCell(104).value || '').trim(); // Plan B2C chot
    const col169 = String(row.getCell(169).value || '').trim(); // Ghi chu cho Leader B2C
    const col196 = String(row.getCell(196).value || '').trim(); // B2C PIC

    stores.push({
      store, brand, budget: col26 + col33,
      growthPic: col35,
      leaderConfirm: col38,
      bookingPhuTrach: col39,
      tamPhuTrach: col52,
      bookingPic: col60,
      planB2cChot: col104,
      noteLeaderB2c: col169,
      b2cPic: col196
    });
  }

  console.log('Total stores in 4.1 B2C:', stores.length);
  console.log('\n--- Unique values in Col 60 (Booking PIC): ---');
  const pics = new Set(stores.map(s => s.bookingPic).filter(Boolean));
  console.log(Array.from(pics));

  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile('../B2C_Quản lý Booking_4.1.1 Input plan (1).xlsx');
  const s2 = wb2.getWorksheet('4.1.1 Input plan');

  const detailed411 = {};
  for (let r = 2; r <= s2.rowCount; r++) {
    const row = s2.getRow(r);
    const m = row.getCell(1).value;
    if (String(m).trim() !== '2026/10') continue;
    const store = String(row.getCell(4).value || '').trim();
    if (!store) continue;
    if (!detailed411[store]) detailed411[store] = [];
    detailed411[store].push({
      pic: String(row.getCell(3).value || '').trim(),
      bookingPic: String(row.getCell(50).value || '').trim(),
      leader: String(row.getCell(55).value || '').trim()
    });
  }

  console.log('\n--- All 69 stores with 4.1 Booking PIC vs 4.1.1 Leader & PIC ---');
  stores.forEach((s, i) => {
    const d = detailed411[s.store];
    const leader411 = d && d[0] && d[0].leader ? d[0].leader : '(k có leader)';
    const pic411 = d && d[0] && d[0].pic ? d[0].pic.replace(/\n/g, ', ') : '(k có)';
    const bpic411 = d && d[0] && d[0].bookingPic ? d[0].bookingPic.replace(/\n/g, ', ') : '';
    console.log(
      String(i + 1).padStart(2) + '. ' +
      s.store.padEnd(35) + ' | 4.1 PIC: ' +
      s.bookingPic.padEnd(25) + ' | 4.1.1 Leader: ' +
      leader411.padEnd(22) + ' | 4.1.1 PIC: ' + pic411
    );
  });
}

inspectRealLeaders().catch(console.error);
