/**
 * Danh bạ ánh xạ Logo nhận diện thương hiệu cho 42 nhãn hàng B2C.
 * File logo được lưu tại /public/brands/ phục vụ tối ưu hóa giao diện trực quan.
 */

export interface BrandLogoMeta {
  file: string;
  aliases: string[];
}

export const BRAND_LOGOS: Record<string, BrandLogoMeta> = {
  '4pm': { file: '4pm.svg', aliases: ['4pm', 'brand-b2c-4pm'] },
  'bella': { file: 'bella.svg', aliases: ['bella', 'brand-b2c-bella'] },
  'babe': { file: 'babe.svg', aliases: ['babe', 'laboratorios babe', 'laboratorios babé', 'brand-b2c-babe'] },
  'badlab': { file: 'badlab.svg', aliases: ['badlab', 'bad lab', 'brand-b2c-badlab'] },
  'baegayul': { file: 'baegayul.svg', aliases: ['baegayul', 'bae ga yul', 'brand-b2c-baegayul'] },
  'baniphar': { file: 'baniphar.svg', aliases: ['baniphar', 'dược phẩm baniphar', 'brand-b2c-baniphar'] },
  'bye-bye-blemish': { file: 'bye-bye-blemish.png', aliases: ['bye bye blemish', 'byebye', 'byebyeblemish', 'brand-b2c-bye-bye-blemish'] },
  'cm24': { file: 'cm24.svg', aliases: ['cm24', 'coolmate', 'cm24 by coolmate', 'brand-b2c-cm24'] },
  'cathy-doll': { file: 'cathy-doll.png', aliases: ['cathy doll', 'cathydoll', 'cathyd', 'brand-b2c-cathy-doll'] },
  'chulala': { file: 'chulala.svg', aliases: ['chulala', 'brand-b2c-chulala'] },
  'cindy-bloom': { file: 'cindy-bloom.svg', aliases: ['cindy bloom', 'cindybloom', 'cindyb', 'brand-b2c-cindy-bloom'] },
  'clubclio': { file: 'clubclio.png', aliases: ['clubclio', 'clio', 'club clio', 'clio cosmetics', 'brand-b2c-clubclio'] },
  'docilee': { file: 'docilee.svg', aliases: ['docilee', 'brand-b2c-docilee'] },
  'dynik': { file: 'dynik.svg', aliases: ['dynik', 'brand-b2c-dynik'] },
  'eupc': { file: 'eupc.svg', aliases: ['eupc', 'brand-b2c-eupc'] },
  'ekseption': { file: 'ekseption.png', aliases: ['ekseption', 'brand-b2c-ekseption'] },
  'face-republic': { file: 'face-republic.svg', aliases: ['face republic', 'facerepublic', 'facere', 'brand-b2c-face-republic'] },
  'feelcleans': { file: 'feelcleans.svg', aliases: ['feelcleans', 'feel cleans', 'brand-b2c-feelcleans'] },
  'fresh': { file: 'fresh.svg', aliases: ['fresh', 'brand-b2c-fresh'] },
  'hdt': { file: 'hdt.svg', aliases: ['hdt', 'brand-b2c-hdt'] },
  'herbal-care': { file: 'herbal-care.svg', aliases: ['herbal care', 'farmona herbal care', 'herbal', 'brand-b2c-herbal-care'] },
  'ziaja-intimate': { file: 'ziaja.svg', aliases: ['ziaja', 'ziaja intimate', 'dung dịch vệ sinh ziaja', 'brand-b2c-ziaja-intimate'] },
  'karmart': { file: 'karmart.png', aliases: ['karmart', 'karmarts', 'brand-b2c-karmart'] },
  'kutieskin-mama': { file: 'kutieskin.png', aliases: ['kutieskin', 'kutieskin mama', 'kuties', 'brand-b2c-kutieskin-mama'] },
  'l-occitane-vi-t-nam': { file: 'l-occitane.svg', aliases: ["l'occitane", "l'occitane việt nam", "l'occitane en provence", "loccit", "loccitane", "brand-b2c-l-occitane-vi-t-nam"] },
  'lipit': { file: 'lipit.svg', aliases: ['lipit', 'brand-b2c-lipit'] },
  'meracine': { file: 'meracine.png', aliases: ['meracine', 'dược phẩm meracine', 'việt đức', 'brand-b2c-meracine'] },
  'mine': { file: 'mine.svg', aliases: ['mine', 'nước hoa mine', 'brand-b2c-mine'] },
  'miss-saigon': { file: 'miss-saigon.svg', aliases: ['miss saigon', 'miss saigon elegance', 'misssa', 'brand-b2c-miss-saigon'] },
  'nabizam': { file: 'nabizam.svg', aliases: ['nabizam', 'bỉm nabizam', 'tã nabizam', 'brand-b2c-nabizam'] },
  'natural-care': { file: 'natural-care.svg', aliases: ['natural care', 'brand-b2c-natural-care'] },
  'nature-s-way': { file: 'natures-way.webp', aliases: ["nature's way", "natures way", "nature", "brand-b2c-nature-s-way"] },
  'nucos': { file: 'nucos.png', aliases: ['nucos', 'collagen nucos', 'brand-b2c-nucos'] },
  'orgalife': { file: 'orgalife.png', aliases: ['orgalife', 'dinh dưỡng orgalife', 'brand-b2c-orgalife'] },
  'rejuran': { file: 'rejuran.png', aliases: ['rejuran', 'rejuran cosmetics', 'rejura', 'brand-b2c-rejuran'] },
  'revision': { file: 'revision.svg', aliases: ['revision', 'revision skincare', 'revisi', 'brand-b2c-revision'] },
  'royal-canin': { file: 'royal-canin.svg', aliases: ['royal canin', 'royalcanin', 'royalc', 'brand-b2c-royal-canin'] },
  'scc-saigon-cosmetics': { file: 'saigon-cosmetics.png', aliases: ['scc', 'saigon cosmetics', 'mỹ phẩm sài gòn', 'scc saigon cosmetics', 'sccsai', 'brand-b2c-scc-saigon-cosmetics'] },
  'tm-clean': { file: 'tm-clean.svg', aliases: ['tm clean', 'tmclean', 'tmclea', 'brand-b2c-tm-clean'] },
  'upbeauty': { file: 'upbeauty.svg', aliases: ['upbeauty', 'up beauty', 'brand-b2c-upbeauty'] },
  'venus': { file: 'venus.svg', aliases: ['venus', 'brand-b2c-venus'] },
  'phcare': { file: 'phcare.svg', aliases: ['phcare', 'ph care', 'dung dịch phcare', 'brand-b2c-phcare'] },
};

/**
 * Tìm kiếm đường dẫn logo ảnh cho thương hiệu dựa theo tên, mã hoặc id.
 * Trả về chuỗi đường dẫn public URL (ví dụ: '/brands/kutieskin.png') hoặc null nếu không tìm thấy.
 */
export function getBrandLogoUrl(identifier?: string | null): string | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  // 1. Khớp theo key chính xác
  if (BRAND_LOGOS[clean]) {
    return `/brands/${BRAND_LOGOS[clean].file}`;
  }

  // 2. Chuẩn hóa bỏ tiền tố brand-b2c-
  const noPrefix = clean.replace(/^brand-b2c-/, '');
  if (BRAND_LOGOS[noPrefix]) {
    return `/brands/${BRAND_LOGOS[noPrefix].file}`;
  }

  // 3. Khớp theo alias hoặc tên chứa chuỗi
  for (const [key, meta] of Object.entries(BRAND_LOGOS)) {
    if (meta.aliases.some(a => a === clean || a === noPrefix)) {
      return `/brands/${meta.file}`;
    }
  }

  // 4. Fuzzy match: nếu identifier chứa tên brand hoặc ngược lại
  for (const [key, meta] of Object.entries(BRAND_LOGOS)) {
    if (meta.aliases.some(a => clean.includes(a) || a.includes(clean))) {
      return `/brands/${meta.file}`;
    }
  }

  return null;
}
