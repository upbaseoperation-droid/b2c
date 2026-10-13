const ExcelJS = require('exceljs');

async function mapAll69() {
  const wb1 = new ExcelJS.Workbook();
  await wb1.xlsx.readFile('../B2C_Quản lý Booking_4.1 Plan order tổng.xlsx');
  const s1 = wb1.getWorksheet('4.1 Plan order tổng');

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
      leader: String(row.getCell(55).value || '').trim()
    });
  }

  // Real Leaders list from GEMINI.md & 4.1:
  // Nguyễn Thị Ngọc Tâm, Lê Phương Thảo, Lương Thị Như Quỳnh, Lê Thanh Hải, Hoàng Diệu Thuỳ, Dương Thị Hồng Nhung
  const leadersList = [
    'Nguyễn Thị Ngọc Tâm',
    'Lê Phương Thảo',
    'Lương Thị Như Quỳnh',
    'Lê Thanh Hải',
    'Hoàng Diệu Thuỳ',
    'Dương Thị Hồng Nhung'
  ];

  const result = [];
  for (let r = 2; r <= s1.rowCount; r++) {
    const row = s1.getRow(r);
    const m = row.getCell(5).value;
    if (String(m).trim() !== '2026/10') continue;
    const b2c = row.getCell(25).value;
    if (!b2c || String(b2c).trim() === '' || String(b2c).trim() === '0' || String(b2c).trim() === 'false') continue;

    const store = String(row.getCell(2).value || '').trim();
    const brand = String(row.getCell(3).value || '').trim();
    const col60 = String(row.getCell(60).value || '').trim();
    const d = detailed411[store];
    const leader411 = d && d[0] ? d[0].leader : '';
    const pic411 = d && d[0] ? d[0].pic.split('\n')[0].trim() : '';

    let leader = '';
    let pic = '';

    // If 4.1.1 explicitly names a Team Leader (like Nguyễn Thị Ngọc Tâm)
    if (leader411 && leader411 !== 'Đặng Thị Yến Nhi' && leadersList.includes(leader411)) {
      leader = leader411;
    } else if (leadersList.includes(col60)) {
      leader = col60;
    } else if (['Hoàng Hải Long', 'Bùi Ngọc Ánh', 'Nguyễn Quỳnh Trang'].includes(col60)) {
      leader = 'Lê Phương Thảo';
    } else if (['Phạm Thị Thu Hằng', 'Lại Ngọc Huyền', 'Lương Nguyễn Trang Nhung', 'Hà Thị Thủy', 'Nguyễn Thị Hồng Ngát'].includes(col60)) {
      leader = 'Nguyễn Thị Ngọc Tâm';
    } else if (['Nguyễn Thị Quỳnh Nhi', 'Bùi Thu Hằng', 'Đinh Thị Bích Liên'].includes(col60)) {
      leader = 'Lương Thị Như Quỳnh';
    } else if (['Trần Hải Phượng', 'Phan Diệu Ánh', 'Vũ Hoài Lâm', 'Nguyễn Thị Mai Anh', 'Phạm Huyền Thương', 'Nguyễn Ngọc Linh'].includes(col60)) {
      leader = 'Lê Thanh Hải';
    } else {
      leader = 'Lê Phương Thảo';
    }

    // Determine Specialist (PIC thực thi)
    if (pic411 && pic411 !== leader) {
      pic = pic411;
    } else if (col60 && col60 !== 'Chưa gán' && !leadersList.includes(col60)) {
      pic = col60;
    } else if (pic411) {
      pic = pic411;
    } else {
      pic = leader;
    }

    result.push({ store, brand, col60, leader411, pic411, leader, pic });
  }

  console.log('Processed', result.length, 'stores.');
  const byLeader = {};
  result.forEach(s => {
    if (!byLeader[s.leader]) byLeader[s.leader] = [];
    byLeader[s.leader].push(s);
  });

  for (const [l, stores] of Object.entries(byLeader)) {
    console.log('\n======================================================');
    console.log('LEADER: ' + l + ' (' + stores.length + ' gian hàng)');
    console.log('======================================================');
    stores.forEach((s, idx) => {
      console.log(
        String(idx + 1).padStart(2) + '. ' +
        s.store.padEnd(35) + ' | PIC: ' +
        s.pic.padEnd(25) + ' | Col60: ' +
        s.col60.padEnd(22) + ' | 411Leader: ' + s.leader411
      );
    });
  }
}
mapAll69().catch(console.error);
