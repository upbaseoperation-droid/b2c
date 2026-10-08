import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const masterDir = 'E:/Upbase/B2C/Master data';

async function parseMasterData() {
  console.log('=== PARSING UPBASE MASTER DATA EXCEL FILES ===\n');

  // 1. Parse 5.5 Pillar content
  const wbPillar = new ExcelJS.Workbook();
  await wbPillar.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.5 Pillar content.xlsx'));
  const wsPillar = wbPillar.worksheets[0];
  const pillars: any[] = [];
  wsPillar.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (vals[0]) {
      pillars.push({
        id: `PIL-${String(pillars.length + 1).padStart(2, '0')}`,
        name: String(vals[0]).trim(),
        description: vals[1] ? String(vals[1]).trim() : '',
        tagPillar: vals[2] ? String(vals[2]).trim() : 'Review trực tiếp',
        lastUpdate: vals[3] ? String(vals[3]) : ''
      });
    }
  });
  console.log(`1. Pillar Content: ${pillars.length} pillars found`);

  // 2. Parse 5.6 Tệp cast
  const wbCast = new ExcelJS.Workbook();
  await wbCast.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.6 Tệp cast.xlsx'));
  const wsCast = wbCast.worksheets[0];
  const castTiers: any[] = [];
  wsCast.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (vals[0]) {
      castTiers.push({
        id: `CAST-${String(castTiers.length + 1).padStart(2, '0')}`,
        tierCode: String(vals[0]).trim(),
        priceRange: vals[1] ? String(vals[1]).trim() : '',
        minCast: Number(vals[2]) || 0,
        maxCast: Number(vals[3]) || 0,
        baseAverage: Number(vals[4]) || 0,
        creatorGroup: vals[5] ? String(vals[5]).trim() : 'Massive Creator',
        note: vals[6] ? String(vals[6]).trim() : '',
        adsCost: vals[7] ? String(vals[7]).trim() : 'Không mất',
        usageImageCost: vals[8] ? String(vals[8]).trim() : 'Không mất',
        lastUpdate: vals[9] ? String(vals[9]) : ''
      });
    }
  });
  console.log(`2. Tệp Cast: ${castTiers.length} tiers found`);

  // 3. Parse 5.3 Phân loại video
  const wbVideoFormat = new ExcelJS.Workbook();
  await wbVideoFormat.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.3 Phân loại video.xlsx'));
  const wsVideoFormat = wbVideoFormat.worksheets[0];
  const videoFormats: any[] = [];
  wsVideoFormat.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (vals[0]) {
      videoFormats.push({
        id: `VF-${String(videoFormats.length + 1).padStart(2, '0')}`,
        name: String(vals[0]).trim(),
        option: vals[2] ? String(vals[2]).trim() : String(vals[0]).trim(),
        lastUpdate: vals[1] ? String(vals[1]) : ''
      });
    }
  });
  console.log(`3. Phân loại video: ${videoFormats.length} formats found`);

  // 4. Parse 5.4 Tệp KOCs
  const wbKocNiche = new ExcelJS.Workbook();
  await wbKocNiche.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.4 Tệp KOCs.xlsx'));
  const wsKocNiche = wbKocNiche.worksheets[0];
  const kocNiches: any[] = [];
  wsKocNiche.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (vals[0]) {
      kocNiches.push({
        id: `NICHE-${String(kocNiches.length + 1).padStart(2, '0')}`,
        nicheName: String(vals[0]).trim(),
        definition: vals[1] ? String(vals[1]).trim() : '',
        category: vals[2] ? String(vals[2]).trim() : 'General',
        properties: vals[3] ? String(vals[3]).trim() : 'Lifestyle',
        pillarMatch: vals[4] ? String(vals[4]).trim() : '',
        lastUpdate: vals[5] ? String(vals[5]) : ''
      });
    }
  });
  console.log(`4. Tệp KOCs: ${kocNiches.length} niches found`);

  // 5. Parse 5.1 Stores (Distinct Brands & Stores summary)
  const wbStores = new ExcelJS.Workbook();
  await wbStores.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.1 Stores.xlsx'));
  const wsStores = wbStores.worksheets[0];
  const stores: any[] = [];
  const brandSet = new Set<string>();
  wsStores.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const storeOp = vals[0] ? String(vals[0]).trim() : '';
    const brandName = vals[2] ? String(vals[2]).trim() : (vals[3] ? String(vals[3]).trim() : '');
    const platform = vals[5] ? String(vals[5]).trim() : '';
    const servicePkg = vals[4] ? String(vals[4]).trim() : '';
    const status = vals[15] ? String(vals[15]).trim() : 'Live';
    const accountPic = vals[9] ? String(vals[9]).trim() : '';
    const growthPic = vals[10] ? String(vals[10]).trim() : '';
    const contentPic = vals[14] ? String(vals[14]).trim() : '';
    const mediaPic = vals[13] ? String(vals[13]).trim() : '';

    if (brandName) brandSet.add(brandName);
    if (storeOp && brandName) {
      stores.push({
        id: `ST-${String(stores.length + 1).padStart(4, '0')}`,
        storeOperation: storeOp,
        brandName: brandName,
        platform: platform || 'Shopee',
        servicePackage: servicePkg,
        status: status === 'Live' ? 'ACTIVE' : 'INACTIVE',
        accountPic,
        growthPic,
        contentPic,
        mediaPic
      });
    }
  });
  console.log(`5. Stores: ${stores.length} stores found across ${brandSet.size} distinct brands`);

  // 6. Parse 6.2 Nhân sự Booking
  const wbStaff = new ExcelJS.Workbook();
  await wbStaff.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_6.2 Nhân sự Booking.xlsx'));
  const wsStaff = wbStaff.worksheets[0];
  const staffList: any[] = [];
  wsStaff.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const code = vals[0] ? String(vals[0]).trim() : '';
    const name = vals[1] ? String(vals[1]).trim() : '';
    const gender = vals[4] ? String(vals[4]).trim() : '';
    const location = vals[7] ? String(vals[7]).trim() : 'HN';
    const type = vals[8] ? String(vals[8]).trim() : 'Chính thức';
    const department = vals[9] ? String(vals[9]).trim() : '';
    const position = vals[10] ? String(vals[10]).trim() : '';
    const team = vals[11] ? String(vals[11]).trim() : '';
    const email = vals[12] ? String(vals[12]).trim() : '';

    if (code && name) {
      staffList.push({
        id: code,
        name,
        email,
        gender,
        location,
        employmentType: type,
        department,
        position,
        team
      });
    }
  });
  console.log(`6. Nhân sự: ${staffList.length} staff records found`);

  // Output summary file
  const parsedData = {
    pillars,
    castTiers,
    videoFormats,
    kocNiches,
    brandCount: brandSet.size,
    brands: Array.from(brandSet).sort(),
    totalStores: stores.length,
    storesSample: stores.slice(0, 50),
    totalStaff: staffList.length,
    staffSample: staffList.slice(0, 50)
  };

  fs.writeFileSync('E:/Upbase/B2C/Master data/parsed_master_summary.json', JSON.stringify(parsedData, null, 2), 'utf-8');
  console.log('\nSaved parsed data to E:/Upbase/B2C/Master data/parsed_master_summary.json');
}

parseMasterData().catch(console.error);
