const fs = require('fs');

const brands = JSON.parse(fs.readFileSync('scripts/generated42Brands.json', 'utf8'));

// Format Ziaja Intimate nicely
brands.forEach(b => {
  if (b.name === 'Intimate') {
    b.name = 'Ziaja Intimate';
    b.code = 'ZIAJA';
    b.companyName = 'Dược phẩm Ziaja Intimate';
    b.id = 'brand-b2c-ziaja-intimate';
  }
});

let tsContent = `// =========================================================================
// DANH MỤC 42 NHÃN HÀNG (BRANDS) THỰC TẾ PHÒNG B2C THÁNG 10/2026
// Nguồn đối soát: File 4.1 Plan order tổng & 69 gian hàng B2C
// =========================================================================

import { BrandDetail } from './types';

export const REAL_B2C_42_BRANDS: BrandDetail[] = ${JSON.stringify(brands, null, 2)};
`;

fs.writeFileSync('src/lib/realB2cBrandsData.ts', tsContent);
console.log('Successfully wrote src/lib/realB2cBrandsData.ts with', brands.length, 'brands.');
