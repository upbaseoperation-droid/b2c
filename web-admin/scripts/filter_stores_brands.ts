import ExcelJS from 'exceljs';
import path from 'path';

async function check() {
  const masterDir = 'E:/Upbase/B2C/Master data';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.1 Stores.xlsx'));
  const ws = wb.worksheets[0];

  const validStatuses = new Set(['Live', 'Off', 'Kênh nội bộ']);
  const filteredStores: any[] = [];
  const brandMap = new Map<string, {
    brandName: string;
    totalStores: number;
    liveStores: number;
    offStores: number;
    internalStores: number;
    platforms: Set<string>;
    servicePackages: Set<string>;
    pics: Set<string>;
  }>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const storeOp = vals[0] ? String(vals[0]).trim() : '';
    const brand = vals[2] ? String(vals[2]).trim() : (vals[3] ? String(vals[3]).trim() : '');
    const pkg = vals[4] ? String(vals[4]).trim() : '';
    const plat = vals[5] ? String(vals[5]).trim() : 'Unknown';
    const status = vals[15] ? String(vals[15]).trim() : '';
    const accountPic = vals[9] ? String(vals[9]).trim() : '';
    const growthPic = vals[10] ? String(vals[10]).trim() : '';

    if (validStatuses.has(status)) {
      filteredStores.push({ storeOp, brand, status, pkg, plat });
      if (brand) {
        if (!brandMap.has(brand)) {
          brandMap.set(brand, {
            brandName: brand,
            totalStores: 0,
            liveStores: 0,
            offStores: 0,
            internalStores: 0,
            platforms: new Set(),
            servicePackages: new Set(),
            pics: new Set()
          });
        }
        const b = brandMap.get(brand)!;
        b.totalStores++;
        if (status === 'Live') b.liveStores++;
        if (status === 'Off') b.offStores++;
        if (status === 'Kênh nội bộ') b.internalStores++;
        if (plat) b.platforms.add(plat);
        if (pkg) b.servicePackages.add(pkg);
        if (accountPic) b.pics.add(accountPic);
        if (growthPic) b.pics.add(growthPic);
      }
    }
  });

  console.log('Filtered stores count:', filteredStores.length);
  console.log('Status distribution:', {
    Live: filteredStores.filter(s => s.status === 'Live').length,
    Off: filteredStores.filter(s => s.status === 'Off').length,
    Internal: filteredStores.filter(s => s.status === 'Kênh nội bộ').length,
  });
  console.log('Corresponding distinct brands count:', brandMap.size);

  const brandList = Array.from(brandMap.values()).map(b => ({
    brandName: b.brandName,
    totalStores: b.totalStores,
    liveStores: b.liveStores,
    offStores: b.offStores,
    internalStores: b.internalStores,
    platforms: Array.from(b.platforms),
    servicePackages: Array.from(b.servicePackages),
    pics: Array.from(b.pics)
  }));

  console.log('Top 5 brands by store count:', brandList.sort((a,b) => b.totalStores - a.totalStores).slice(0, 5));
}

check().catch(console.error);
