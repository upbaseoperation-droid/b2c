import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const masterDir = 'E:/Upbase/B2C/Master data';
const outFile = path.resolve('src/lib/importedMasterData.ts');

function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.text) return String(val.text).trim();
  return String(val).trim();
}

function formatDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = cleanStr(val);
  if (s.includes('T')) return s.split('T')[0];
  return s;
}

async function run() {
  console.log('Generating importedMasterData.ts from Excel files in:', masterDir);

  // 1. PILLAR CONTENT
  const wbPillars = new ExcelJS.Workbook();
  await wbPillars.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.5 Pillar content.xlsx'));
  const wsPillars = wbPillars.worksheets[0];
  const pillars: any[] = [];
  const pillarCodeMap: Record<string, string> = {
    'Review trực tiếp': 'DIRECT_REVIEW',
    'Nỗi đau - Giải pháp': 'PROBLEM_SOLUTION',
    'Unboxing': 'UNBOXING',
    'FOMO': 'FOMO_TREND',
    'Content gây tranh cãi': 'CONTROVERSIAL',
    'Daily Vlog - Storytelling': 'STORYTELLING',
    'Nội dung doanh nghiệp': 'CORPORATE_BRAND',
    'PR báo chí': 'PRESS_PR',
    'Educate': 'EDUCATIONAL',
    'Q&A': 'Q_AND_A',
    'Feedback': 'CUSTOMER_FEEDBACK',
    'Promotion/Teasing': 'PROMOTION_TEASING',
    'Entertainment': 'ENTERTAINMENT',
    'PR ngoại sàn': 'OFF_PLATFORM_PR',
    'Livestream': 'LIVESTREAM_HIGHLIGHT'
  };

  const pillarColorMap: Record<string, string> = {
    'Review trực tiếp': '#3B82F6',
    'Nỗi đau - Giải pháp': '#EF4444',
    'Unboxing': '#10B981',
    'FOMO': '#F59E0B',
    'Content gây tranh cãi': '#EC4899',
    'Daily Vlog - Storytelling': '#8B5CF6',
    'Nội dung doanh nghiệp': '#6366F1',
    'PR báo chí': '#0EA5E9',
    'Educate': '#14B8A6',
    'Q&A': '#F97316',
    'Feedback': '#84CC16',
    'Promotion/Teasing': '#E11D48',
    'Entertainment': '#A855F7',
    'PR ngoại sàn': '#06B6D4',
    'Livestream': '#D946EF'
  };

  wsPillars.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const name = cleanStr(vals[0]);
    if (!name) return;
    const desc = cleanStr(vals[1]);
    const tagPillar = cleanStr(vals[2]) || name;
    const lastUpdate = formatDate(vals[3]);
    const code = pillarCodeMap[name] || `PILLAR_${rowNumber - 1}`;
    const colorTag = pillarColorMap[name] || '#64748B';

    pillars.push({
      id: `PIL-${String(pillars.length + 1).padStart(2, '0')}`,
      code,
      name,
      description: desc,
      tagPillar,
      applicableNiches: ['Toàn ngành'],
      suggestedFormats: name.includes('Unbox') ? ['Unbox Voice', 'Ảnh lướt'] : ['Review Voice', 'Video AI'],
      benchmarkUnitCost: 1500000,
      targetAudience: 'Khách hàng mục tiêu đa kênh',
      keyObjectives: desc.slice(0, 80) + '...',
      status: 'ACTIVE',
      colorTag,
      activeBrandsCount: 12,
      createdAt: '2025-01-01',
      lastUpdate
    });
  });

  // 2. TỆP CAST
  const wbCast = new ExcelJS.Workbook();
  await wbCast.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.6 Tệp cast.xlsx'));
  const wsCast = wbCast.worksheets[0];
  const castTiers: any[] = [];
  wsCast.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const tierCode = cleanStr(vals[0]);
    if (!tierCode) return;
    const priceRange = cleanStr(vals[1]);
    const minCast = Number(vals[2]) || 0;
    const maxCast = Number(vals[3]) || 0;
    const baseAverage = Number(vals[4]) || 0;
    const creatorGroup = cleanStr(vals[5]) || 'Massive Creator';
    const note = cleanStr(vals[6]);
    const adsCost = cleanStr(vals[7]) || 'Không mất';
    const usageImageCost = cleanStr(vals[8]) || 'Không mất';
    const lastUpdate = formatDate(vals[9]);

    castTiers.push({
      id: `CAST-${String(castTiers.length + 1).padStart(2, '0')}`,
      tierCode,
      priceRange,
      minCast,
      maxCast,
      baseAverage,
      creatorGroup,
      note,
      adsCost,
      usageImageCost,
      lastUpdate
    });
  });

  // 3. PHÂN LOẠI VIDEO
  const wbVF = new ExcelJS.Workbook();
  await wbVF.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.3 Phân loại video.xlsx'));
  const wsVF = wbVF.worksheets[0];
  const videoFormats: any[] = [];
  wsVF.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const name = cleanStr(vals[0]);
    if (!name) return;
    const lastUpdate = formatDate(vals[1]);
    const option = cleanStr(vals[2]) || name;

    videoFormats.push({
      id: `VF-${String(videoFormats.length + 1).padStart(2, '0')}`,
      name,
      option,
      lastUpdate
    });
  });

  // 4. TỆP KOCS
  const wbNiche = new ExcelJS.Workbook();
  await wbNiche.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.4 Tệp KOCs.xlsx'));
  const wsNiche = wbNiche.worksheets[0];
  const kocNiches: any[] = [];
  wsNiche.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const nicheName = cleanStr(vals[0]);
    if (!nicheName) return;
    const definition = cleanStr(vals[1]);
    const category = cleanStr(vals[2]) || 'Đa ngành';
    const properties = cleanStr(vals[3]) || 'Lifestyle';
    const pillarMatch = cleanStr(vals[4]);
    const lastUpdate = formatDate(vals[5]);

    kocNiches.push({
      id: `NICHE-${String(kocNiches.length + 1).padStart(2, '0')}`,
      nicheName,
      definition,
      category,
      properties,
      pillarMatch,
      lastUpdate
    });
  });

  // 5. STORES (5.1 Stores)
  const wbStores = new ExcelJS.Workbook();
  await wbStores.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_5.1 Stores.xlsx'));
  const wsStores = wbStores.worksheets[0];
  const stores: any[] = [];
  const brandMap = new Map<string, {
    brandName: string;
    brandId?: string;
    storeCount: number;
    liveStoreCount: number;
    offStoreCount: number;
    internalStoreCount: number;
    platforms: Set<string>;
    servicePackages: Set<string>;
    accountPic?: string;
    growthPic?: string;
    contentPic?: string;
    mediaPic?: string;
    stores: any[];
  }>();

  const validStatuses = new Set(['Live', 'Off', 'Kênh nội bộ']);

  wsStores.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const storeOp = cleanStr(vals[0]);
    const brandName = cleanStr(vals[2]) || cleanStr(vals[3]);
    const statusRaw = cleanStr(vals[15]);

    // BỎ CÁC GIAN HÀNG NHÁP/BLANK - CHỈ GIỮ LẠI: Live, Off, Kênh nội bộ
    if (!validStatuses.has(statusRaw)) return;
    if (!brandName || !storeOp) return;

    const brandId = cleanStr(vals[29]); // Brand ID (Col 30)
    const servicePkg = cleanStr(vals[4]); // Service_package (Col 5)
    const servicePkgName = cleanStr(vals[33]); // Service_Package_Name (Col 34)
    const rawPlatform = cleanStr(vals[5]); // Platform (Col 6)
    let platform: 'TikTok Shop' | 'Shopee Mall' | 'Lazada' = 'Shopee Mall';
    if (rawPlatform.toLowerCase().includes('tiktok')) platform = 'TikTok Shop';
    else if (rawPlatform.toLowerCase().includes('laza')) platform = 'Lazada';

    const accountPic = cleanStr(vals[9]);
    const growthPic = cleanStr(vals[10]);
    const csListingPic = cleanStr(vals[11]);
    const csDesignPic = cleanStr(vals[12]);
    const mediaPic = cleanStr(vals[13]);
    const contentPic = cleanStr(vals[14]);
    const liveDate = formatDate(vals[16]);
    const offDate = formatDate(vals[18]);
    const livestreamPic = cleanStr(vals[25]);
    const teamGrowth = cleanStr(vals[28]);
    const cmsRate = vals[42] ? Number(vals[42]) || cleanStr(vals[42]) : 0;
    const fixFeeLive = vals[41] ? Number(vals[41]) || 0 : 0;

    let serviceModel: 'FULL_SERVICE' | 'AFFILIATE_ONLY' | 'LIVESTREAM_DEDICATED' = 'FULL_SERVICE';
    if (servicePkg.toLowerCase().includes('live')) serviceModel = 'LIVESTREAM_DEDICATED';
    else if (servicePkg.toLowerCase().includes('mcn') || servicePkg.toLowerCase().includes('affiliate')) serviceModel = 'AFFILIATE_ONLY';

    let accountStatus: 'ACTIVE' | 'OFFBOARDED' | 'MAINTENANCE' = 'ACTIVE';
    if (statusRaw === 'Off') accountStatus = 'OFFBOARDED';
    else if (statusRaw === 'Kênh nội bộ') accountStatus = 'MAINTENANCE';

    const storeOpId = cleanStr(vals[47]); // Store_Operation_ID (Col 48)
    const b2cPhuTrach = cleanStr(vals[46]); // B2C phụ trách (Col 47)
    const isB2cManaged = b2cPhuTrach === '1' || b2cPhuTrach.toLowerCase() === 'true';
    const storeId = storeOpId ? `ST-${storeOpId}` : `ST-${String(stores.length + 1).padStart(4, '0')}`;
    const storeUrl = cleanStr(vals[7]) || `https://${platform.toLowerCase().replace(/\s+/g, '')}.vn/${storeOp.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

    const storeItem = {
      id: storeId,
      storeOperationId: storeOpId || storeId,
      brandName,
      storeName: storeOp,
      platform,
      storeUrl,
      serviceModel,
      difficultyTier: 'Tiêu chuẩn',
      difficultyMultiplier: 1.0,
      accountStatus,
      operationStatus: statusRaw as 'Live' | 'Off' | 'Kênh nội bộ',
      category: 'Tiêu dùng & Bán lẻ',
      monthlyTargetGmv: 150000000,
      monthlyBudget: 25000000,
      accountOwnerName: accountPic || growthPic || 'Nguyễn Thu Trang',
      b2cOwnerName: contentPic || growthPic || 'Đặng Thị Linh',
      isB2cManaged,
      requiresB2cPlan: isB2cManaged,
      storeOperation: storeOp,
      servicePackage: servicePkg,
      servicePackageName: servicePkgName,
      growthPic,
      contentPic,
      mediaPic,
      csListingPic,
      csDesignPic,
      livestreamPic,
      teamGrowth,
      liveDate,
      offDate,
      brandId,
      cmsRate,
      fixFeeLivePerHour: fixFeeLive
    };

    stores.push(storeItem);

    if (!brandMap.has(brandName)) {
      brandMap.set(brandName, {
        brandName,
        brandId,
        storeCount: 0,
        liveStoreCount: 0,
        offStoreCount: 0,
        internalStoreCount: 0,
        platforms: new Set(),
        servicePackages: new Set(),
        accountPic,
        growthPic,
        contentPic,
        mediaPic,
        stores: []
      });
    }
    const bInfo = brandMap.get(brandName)!;
    bInfo.storeCount += 1;
    if (statusRaw === 'Live') bInfo.liveStoreCount += 1;
    else if (statusRaw === 'Off') bInfo.offStoreCount += 1;
    else if (statusRaw === 'Kênh nội bộ') bInfo.internalStoreCount += 1;

    if (rawPlatform) bInfo.platforms.add(platform);
    if (servicePkg) bInfo.servicePackages.add(servicePkg);
    if (!bInfo.accountPic && accountPic) bInfo.accountPic = accountPic;
    if (!bInfo.growthPic && growthPic) bInfo.growthPic = growthPic;
    if (!bInfo.contentPic && contentPic) bInfo.contentPic = contentPic;
    if (!bInfo.mediaPic && mediaPic) bInfo.mediaPic = mediaPic;

    let ecomPlatform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA' = 'SHOPEE_MALL';
    if (platform === 'TikTok Shop') ecomPlatform = 'TIKTOK_SHOP';
    else if (platform === 'Lazada') ecomPlatform = 'LAZADA';

    bInfo.stores.push({
      id: storeItem.id,
      brandId: brandId || `BRAND-${String(brandMap.size).padStart(3, '0')}`,
      platform: ecomPlatform,
      storeName: storeOp,
      storeId: storeOp,
      storeUrl: storeItem.storeUrl,
      affiliateRate: 15,
      requiresSparkAds: true,
      status: statusRaw === 'Live' ? 'ACTIVE' : 'PAUSED'
    });
  });

  const extractedBrands = Array.from(brandMap.values()).map((b, idx) => {
    const isLive = b.liveStoreCount > 0 || b.internalStoreCount > 0;
    const brandId = b.brandId || `BRAND-${String(idx + 1).padStart(3, '0')}`;
    return {
      id: brandId,
      code: b.brandId || `BRAND_${String(idx + 1).padStart(3, '0')}`,
      name: b.brandName,
      companyName: `${b.brandName} Corporation`,
      category: 'Tiêu dùng & Bán lẻ',
      color: isLive ? 'bg-emerald-600' : 'bg-slate-500',
      status: (isLive ? 'ACTIVE' : 'PAUSED') as 'ACTIVE' | 'PAUSED' | 'UPCOMING',
      planBudget: 150000000,
      spentBudget: 0,
      targetGmv: 500000000,
      currentGmv: 0,
      targetVideos: 50,
      airedVideos: 0,
      accountPic: b.accountPic || 'Phương Thảo',
      growthPic: b.growthPic || 'Hoàng Long',
      bookingPicLead: 'Khánh Vy',
      contentPic: b.contentPic || 'Đặng Thị Linh',
      mediaPic: b.mediaPic || '',
      brandGuideline: `Bộ quy chuẩn nội dung và thương hiệu cho ${b.brandName}`,
      kocCriteria: 'KOC phù hợp tệp khách hàng nhãn hàng',
      stores: b.stores,
      heroProducts: [],
      contactPerson: 'Đại diện Nhãn hàng',
      contractEndDate: '2026-12-31',
      monthlyBudget: 150000000,
      storeCount: b.storeCount,
      liveStoreCount: b.liveStoreCount,
      offStoreCount: b.offStoreCount,
      internalStoreCount: b.internalStoreCount,
      platforms: Array.from(b.platforms),
      servicePackages: Array.from(b.servicePackages)
    };
  });

  // 6. NHÂN SỰ BOOKING (6.2)
  const wbStaff = new ExcelJS.Workbook();
  await wbStaff.xlsx.readFile(path.join(masterDir, 'B2C_Quản lý Booking_6.2 Nhân sự Booking.xlsx'));
  const wsStaff = wbStaff.worksheets[0];
  const staffList: any[] = [];

  wsStaff.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
    const code = cleanStr(vals[0]);
    const name = cleanStr(vals[1]);
    if (!code || !name) return;

    const gender = cleanStr(vals[4]);
    const startDate = formatDate(vals[5]);
    const location = cleanStr(vals[7]) || 'HN';
    const employmentType = cleanStr(vals[8]) || 'Chính thức';
    const department = cleanStr(vals[9]);
    const position = cleanStr(vals[10]);
    const team = cleanStr(vals[11]);
    const email = `staff_${code.toLowerCase()}@upbase.vn`;

    let role: 'BOOKING' | 'CONTENT' | 'ACCOUNT' | 'GROWTH' | 'MANAGER' = 'BOOKING';
    const posLower = (position + ' ' + department + ' ' + team).toLowerCase();
    if (posLower.includes('leader') || posLower.includes('trưởng') || posLower.includes('manager')) role = 'MANAGER';
    else if (posLower.includes('content') || posLower.includes('kịch bản')) role = 'CONTENT';
    else if (posLower.includes('growth')) role = 'GROWTH';
    else if (posLower.includes('account')) role = 'ACCOUNT';
    else if (posLower.includes('booking') || posLower.includes('koc')) role = 'BOOKING';

    staffList.push({
      id: code,
      name,
      staffCode: code,
      role,
      team: team || department || 'Booking',
      roleTitle: position || (role === 'BOOKING' ? 'Chuyên viên Booking' : 'Chuyên viên B2C'),
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
      email,
      maxStoresCapacity: 5,
      gender,
      location,
      employmentType,
      department,
      position,
      startDate
    });
  });

  console.log(`Summary:
- Pillars: ${pillars.length}
- Cast Tiers: ${castTiers.length}
- Video Formats: ${videoFormats.length}
- KOC Niches: ${kocNiches.length}
- Stores: ${stores.length}
- Brands: ${extractedBrands.length}
- Staff: ${staffList.length}
`);

  // Write TypeScript code to importedMasterData.ts
  const tsContent = `// =========================================================================
// UPBASE MASTER DATA - IMPORTED DIRECTLY FROM OFFICIAL ENTERPRISE EXCEL SHEETS
// Source directory: E:/Upbase/B2C/Master data
// Total Stores: ${stores.length} | Staff: ${staffList.length} | Pillars: ${pillars.length} | Niches: ${kocNiches.length}
// =========================================================================

import { 
  MasterContentPillar, 
  MasterCastTier, 
  MasterVideoFormat, 
  MasterKocNiche, 
  StorePortfolioItem, 
  StaffMasterMember,
  BrandDetail
} from './types';

// 1. TRỤ CỘT NỘI DUNG CHUẨN UPBASE (5.5 Pillar content.xlsx - 15 Trụ cột)
export const UPBASE_MASTER_PILLARS: MasterContentPillar[] = ${JSON.stringify(pillars, null, 2)};

// 2. BẬC CAST & PHÂN NHÓM CREATOR (5.6 Tệp cast.xlsx - 9 Bậc)
export const UPBASE_CAST_TIERS: MasterCastTier[] = ${JSON.stringify(castTiers, null, 2)};

// 3. PHÂN LOẠI ĐỊNH DẠNG VIDEO (5.3 Phân loại video.xlsx - 9 Định dạng)
export const UPBASE_VIDEO_FORMATS: MasterVideoFormat[] = ${JSON.stringify(videoFormats, null, 2)};

// 4. TỆP KÊNH & CHUYÊN MỤC KOC (5.4 Tệp KOCs.xlsx - 34 Tệp kênh)
export const UPBASE_KOC_NICHES: MasterKocNiche[] = ${JSON.stringify(kocNiches, null, 2)};

// 5. DANH SÁCH THƯƠNG HIỆU DOANH NGHIỆP TRÍCH XUẤT TỪ GIAN HÀNG (${extractedBrands.length} Brands)
export const UPBASE_BRANDS_MASTER: BrandDetail[] = ${JSON.stringify(extractedBrands, null, 2)};

// 6. GIAN HÀNG VẬN HÀNH UPBASE (5.1 Stores.xlsx - ${stores.length} Gian hàng)
export const UPBASE_STORES_MASTER: StorePortfolioItem[] = ${JSON.stringify(stores, null, 2)};

// 7. NHÂN SỰ BOOKING & VẬN HÀNH (6.2 Nhân sự Booking.xlsx - ${staffList.length} Nhân sự)
export const UPBASE_STAFF_MASTER: StaffMasterMember[] = ${JSON.stringify(staffList, null, 2)};
`;

  fs.writeFileSync(outFile, tsContent, 'utf-8');
  console.log('Successfully written importedMasterData.ts to:', outFile);
}

run().catch(console.error);
