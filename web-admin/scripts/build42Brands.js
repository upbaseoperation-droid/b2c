const fs = require('fs');

const content = fs.readFileSync('src/lib/realB2cPlanData.ts', 'utf8');
const storeBlocks = content.split('{\n    "id": "store-b2c-');
const brandsMap = {};

for (let i = 1; i < storeBlocks.length; i++) {
  const block = storeBlocks[i];
  const idMatch = block.match(/"id":\s*"([^"]+)"/);
  const nameMatch = block.match(/"storeName":\s*"([^"]+)"/);
  const brandMatch = block.match(/"brandName":\s*"([^"]+)"/);
  const platformMatch = block.match(/"platform":\s*"([^"]+)"/);
  const budgetMatch = block.match(/"monthlyBudget":\s*([0-9\.]+)/);
  const gmvMatch = block.match(/"monthlyTargetGmv":\s*([0-9\.]+)/);
  const catMatch = block.match(/"category":\s*"([^"]+)"/);
  const picMatch = block.match(/"b2cOwnerName":\s*"([^"]+)"/);
  const leaderMatch = block.match(/"bookingLeader":\s*"([^"]+)"/);
  const hasLeaderMatch = block.match(/"hasBookingLeader":\s*(true|false)/);
  const growthMatch = block.match(/"growthPic":\s*"([^"]+)"/);
  const accountMatch = block.match(/"accountOwnerName":\s*"([^"]+)"/);

  const id = idMatch ? 'store-b2c-' + idMatch[1] : `store-b2c-${i}`;
  const name = nameMatch ? nameMatch[1] : '';
  const brand = brandMatch ? brandMatch[1] : '';
  const platform = platformMatch ? platformMatch[1] : '';
  const budget = budgetMatch ? Number(budgetMatch[1]) : 0;
  const gmv = gmvMatch ? Number(gmvMatch[1]) : 0;
  const category = catMatch ? catMatch[1] : 'Tiêu dùng & Chăm sóc';
  const pic = picMatch ? picMatch[1] : 'Chuyên viên B2C';
  const leader = leaderMatch ? leaderMatch[1] : '';
  const hasLeader = hasLeaderMatch ? hasLeaderMatch[1] === 'true' : false;
  const growth = growthMatch ? growthMatch[1] : 'Nguyễn Đức Mạnh';
  const account = accountMatch ? accountMatch[1] : 'Phạm Thị Nhài';

  if (!brandsMap[brand]) {
    brandsMap[brand] = {
      brand,
      category,
      stores: [],
      totalBudget: 0,
      totalGmv: 0,
      pics: new Set(),
      leaders: new Set(),
      growths: new Set(),
      accounts: new Set()
    };
  }

  brandsMap[brand].stores.push({
    id,
    name,
    platform,
    budget,
    gmv,
    pic,
    leader,
    hasLeader
  });
  brandsMap[brand].totalBudget += budget;
  brandsMap[brand].totalGmv += gmv;
  if (pic && pic !== 'Chưa phân công') brandsMap[brand].pics.add(pic);
  if (leader && hasLeader) brandsMap[brand].leaders.add(leader);
  if (growth) brandsMap[brand].growths.add(growth);
  if (account) brandsMap[brand].accounts.add(account);
}

const brandKeys = Object.keys(brandsMap).sort();
console.log('Tổng số Nhãn hàng B2C:', brandKeys.length);

const generatedBrands = [];
const colorPalettes = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', 
  '#0891b2', '#4f46e5', '#ca8a04', '#059669', '#d97706'
];

brandKeys.forEach((brandName, idx) => {
  const b = brandsMap[brandName];
  const code = brandName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || `BR${idx + 1}`;
  const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const brandId = `brand-b2c-${slug || idx + 1}`;

  const picsArr = [...b.pics];
  const primaryPic = picsArr.length > 0 ? picsArr[0] : 'Đặng Thị Yến Nhi';
  const leaderArr = [...b.leaders];
  // If there's a leader (e.g. Tâm), use that leader; otherwise leadB2c (Yến Nhi)
  const bookingPicLead = leaderArr.length > 0 ? leaderArr[0] : 'Đặng Thị Yến Nhi';

  const ecomStores = b.stores.map((s, sIdx) => {
    let platEnum = 'SHOPEE_MALL';
    if (s.platform.toLowerCase().includes('tiktok')) platEnum = 'TIKTOK_SHOP';
    else if (s.platform.toLowerCase().includes('lazada')) platEnum = 'LAZADA';

    return {
      id: s.id,
      brandId,
      platform: platEnum,
      storeName: s.name,
      storeId: `SO-B2C-${String(idx * 3 + sIdx + 1).padStart(3, '0')}`,
      storeUrl: `https://${platEnum.toLowerCase().replace('_', '')}.vn/${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      affiliateRate: 15,
      requiresSparkAds: platEnum === 'TIKTOK_SHOP',
      status: 'ACTIVE',
      rating: 4.9,
      totalProductsCount: 45
    };
  });

  const heroProducts = [
    {
      id: `hero-${slug}-01`,
      brandId,
      productName: `Combo Sản phẩm Chủ lực ${brandName}`,
      sku: `SKU-${code}-01`,
      price: 250000,
      commissionRate: 15,
      sampleAvailable: true,
      sampleStock: 100,
      category: b.category,
      pdpUrl: `https://upbase.vn/products/${slug}-combo`
    }
  ];

  const brandObj = {
    id: brandId,
    code,
    name: brandName,
    companyName: `Công ty TNHH & Nhãn hàng ${brandName}`,
    category: b.category,
    color: colorPalettes[idx % colorPalettes.length],
    status: 'ACTIVE',
    planBudget: b.totalBudget,
    spentBudget: 0,
    targetGmv: b.totalGmv,
    currentGmv: 0,
    targetVideos: Math.max(10, Math.round(b.totalBudget / 800000)),
    airedVideos: 0,
    accountPic: [...b.accounts][0] || 'Phạm Thị Nhài',
    growthPic: [...b.growths][0] || 'Nguyễn Đức Mạnh',
    bookingPicLead,
    brandPicName: primaryPic,
    brandGuideline: `Bộ quy chuẩn nội dung và thông điệp thương hiệu ${brandName} tháng 10/2026. Tuân thủ trần chi phí và kịch bản duyệt trước khi lên sóng.`,
    kocCriteria: `KOC chuyên ngành ${b.category}, tương tác thật, không dính vi phạm sàn.`,
    forbiddenNotes: 'Không so sánh dìm hàng đối thủ trực tiếp, không cam kết hiệu quả chữa bệnh 100%.',
    stores: ecomStores,
    heroProducts,
    contactPerson: primaryPic,
    monthlyBudget: b.totalBudget,
    storeCount: b.stores.length,
    liveStoreCount: b.stores.length,
    offStoreCount: 0,
    internalStoreCount: 0,
    platforms: [...new Set(b.stores.map(s => s.platform))],
    contentPic: primaryPic,
    mediaPic: 'Media Team'
  };

  generatedBrands.push(brandObj);
});

console.log('Sample Brand 1:', JSON.stringify(generatedBrands[0], null, 2));
fs.writeFileSync('scripts/generated42Brands.json', JSON.stringify(generatedBrands, null, 2));
console.log('Saved to scripts/generated42Brands.json successfully.');
