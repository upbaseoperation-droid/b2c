import ExcelJS from 'exceljs';
import path from 'path';

async function analyze() {
  const masterDir = 'E:/Upbase/B2C/Master data';

  console.log('--- ANALYZING STORES FILE ---');
  const wbStores = new ExcelJS.Workbook();
  await wbStores.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.1 Stores.xlsx'));
  console.log('Sheets in Stores:', wbStores.worksheets.map(w => w.name));
  const wsStore = wbStores.worksheets[0];
  console.log('Total store rows (including header):', wsStore.rowCount);
  const headerRow: any = wsStore.getRow(1).values;
  console.log('Header row:', headerRow);

  // Analyze columns & distributions
  const statuses: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const packages: Record<string, number> = {};
  let emptyStores = 0;
  let sampleRows: any[] = [];

  wsStore.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const storeOp = vals[0] ? String(vals[0]).trim() : '';
    const brand = vals[2] ? String(vals[2]).trim() : (vals[3] ? String(vals[3]).trim() : '');
    const pkg = vals[4] ? String(vals[4]).trim() : 'Unknown';
    const plat = vals[5] ? String(vals[5]).trim() : 'Unknown';
    const st = vals[15] ? String(vals[15]).trim() : 'Blank';

    if (!storeOp && !brand) {
      emptyStores++;
      return;
    }

    statuses[st] = (statuses[st] || 0) + 1;
    platforms[plat] = (platforms[plat] || 0) + 1;
    packages[pkg] = (packages[pkg] || 0) + 1;

    if (rowNumber <= 10) {
      sampleRows.push({ rowNumber, storeOp, brand, pkg, plat, st, offDate: vals[8], liveDate: vals[7] });
    }
  });

  console.log('Store statuses:', statuses);
  console.log('Store platforms:', platforms);
  console.log('Store packages (top 10):', Object.entries(packages).sort((a,b)=>b[1]-a[1]).slice(0, 10));
  console.log('Sample rows:', sampleRows.slice(0, 5));

  console.log('\n--- ANALYZING STAFF FILE ---');
  const wbStaff = new ExcelJS.Workbook();
  await wbStaff.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_6.2 Nhân sự Booking.xlsx'));
  console.log('Sheets in Staff:', wbStaff.worksheets.map(w => w.name));
  const wsStaff = wbStaff.worksheets[0];
  console.log('Total staff rows (including header):', wsStaff.rowCount);
  const staffHeader: any = wsStaff.getRow(1).values;
  console.log('Staff header row:', staffHeader);

  const staffTypes: Record<string, number> = {};
  const staffDepts: Record<string, number> = {};
  const staffPositions: Record<string, number> = {};
  const staffStatuses: Record<string, number> = {};
  let sampleStaff: any[] = [];

  wsStaff.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const code = vals[0] ? String(vals[0]).trim() : '';
    const name = vals[1] ? String(vals[1]).trim() : '';
    const type = vals[8] ? String(vals[8]).trim() : 'Unknown';
    const dept = vals[9] ? String(vals[9]).trim() : 'Unknown';
    const pos = vals[10] ? String(vals[10]).trim() : 'Unknown';
    const statusCol = vals[14] ? String(vals[14]).trim() : (vals[13] ? String(vals[13]).trim() : 'N/A');

    staffTypes[type] = (staffTypes[type] || 0) + 1;
    staffDepts[dept] = (staffDepts[dept] || 0) + 1;
    staffPositions[pos] = (staffPositions[pos] || 0) + 1;

    if (rowNumber <= 10) {
      sampleStaff.push({ rowNumber, code, name, type, dept, pos, fullVals: vals.slice(0, 15) });
    }
  });

  console.log('Staff Types:', staffTypes);
  console.log('Staff Depts (top 10):', Object.entries(staffDepts).sort((a,b)=>b[1]-a[1]).slice(0, 10));
  console.log('Staff Positions (top 10):', Object.entries(staffPositions).sort((a,b)=>b[1]-a[1]).slice(0, 10));
  console.log('Staff samples:', sampleStaff.slice(0, 3));
}

analyze().catch(console.error);
