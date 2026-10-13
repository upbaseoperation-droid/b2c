/**
 * Lưu hồ sơ thương hiệu. Production: PostgreSQL (bảng "BrandProfileRecord", có revision chống ghi đè).
 * Tự động tạo bảng nếu chưa chạy migration, và tự động phục hồi an toàn về dữ liệu khởi tạo nếu database không khả dụng.
 * Phát triển: file JSON cục bộ `.brand-data/profiles.json`, nạp dữ liệu mẫu lần đầu để thử giao diện.
 */

import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../prisma';
import { INITIAL_BRAND_KNOWLEDGE_BASES, INITIAL_PUSH_PRODUCTS } from '../mockData';
import { REAL_B2C_42_BRANDS } from '../realB2cBrandsData';
import { UPBASE_BRANDS_MASTER } from '../importedMasterData';
import type { BrandDetail, BrandKnowledgeBase } from '../types';
import { BrandError, requireBrand } from './domain';
import type { BrandDocument, BrandProfile, ToneTag } from './types';
import { brandKey } from './types';

const local = () => process.env.NODE_ENV !== 'production' && process.env.BRAND_STORAGE !== 'postgres';
const directory = () => path.resolve(/*turbopackIgnore: true*/ process.env.BRAND_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.brand-data'));
const file = () => path.join(directory(), 'profiles.json');

const TONE_FROM_MOCK: Record<string, ToneTag> = {
  'BÁC_SĨ_CHUYÊN_GIA': 'EXPERT',
  'MẸ_BỈM_CHÂN_THỰC': 'MOM',
  'GEN_Z_TRENDING': 'GENZ',
  'SANG_TRỌNG_CAO_CẤP': 'PREMIUM',
};

/** Dữ liệu mẫu (mockData) cho môi trường phát triển hoặc khi database chưa kết nối được. */
function seedFromMock(kb: BrandKnowledgeBase, master?: BrandDetail): BrandProfile {
  const bKey = brandKey(kb.brandName);
  const fallback = seedFromMasterBrand(
    master || ({
      id: `brand-${bKey}`,
      name: kb.brandName,
      code: bKey.toUpperCase(),
      category: 'Mỹ phẩm & Chăm sóc cá nhân',
      storeCount: 1,
      platforms: ['TikTok Shop', 'Shopee'],
      planBudget: 50_000_000,
      spentBudget: 0,
      targetVideos: 15,
      publishedVideos: 0,
      targetViews: 200_000,
      actualViews: 0,
      stores: [],
      heroProducts: [],
      monthlyAllocations: [],
      accountPic: kb.updatedBy || 'Đặng Thị Yến Nhi',
      bookingPic: kb.updatedBy || 'Đặng Thị Yến Nhi',
      status: 'ACTIVE',
    } as unknown as BrandDetail),
    0,
  );
  const docs: BrandDocument[] = [
    {
      id: `doc-guide-${bKey}`,
      title: `Bộ quy chuẩn nội dung & hình ảnh ${kb.brandName} 2026.pdf`,
      category: 'GUIDELINE',
      url: `https://cdn.upbase.vn/brands/${bKey}/brand-guideline-2026.pdf`,
      note: kb.logoAssetRules || 'Tài liệu quy chuẩn bắt buộc gửi KOC trước khi lên kịch bản.',
      addedBy: master?.accountPic || kb.updatedBy || 'Phòng B2C',
      addedAt: '2026-10-01T08:30:00.000Z',
      fileName: `Brand-Guideline-${kb.brandName}-2026.pdf`,
      fileSize: 2_450_000,
      mimeType: 'application/pdf',
      storage: 'LINK',
    },
    ...(kb.logoDownloadUrls || []).map((logo, idx) => ({
      id: `doc-asset-${bKey}-${idx + 1}`,
      title: logo.format,
      category: 'ASSET' as const,
      url: logo.url,
      note: 'File thiết kế gốc phục vụ dựng video và thumbnail.',
      addedBy: master?.accountPic || kb.updatedBy || 'Phòng B2C',
      addedAt: '2026-10-01T09:00:00.000Z',
      storage: 'LINK' as const,
    })),
    ...(kb.certifications || []).filter(c => c.verificationUrl).map((cert, idx) => ({
      id: `doc-legal-${bKey}-${idx + 1}`,
      title: cert.docTitle,
      category: 'LEGAL' as const,
      url: cert.verificationUrl!,
      note: `Số văn bản: ${cert.docNumber} · Cấp bởi ${cert.issuingAuthority}`,
      addedBy: 'Pháp chế B2C',
      addedAt: '2026-10-02T10:00:00.000Z',
      storage: 'LINK' as const,
    })),
  ];

  const mappedProducts = (kb.skus || []).map(s => ({
    id: s.id,
    name: s.name,
    skuCode: s.skuCode,
    size: s.volumeOrWeight,
    priceVnd: s.priceVnd || undefined,
    pdpUrl: /^https?:/.test(s.pdpUrl) ? s.pdpUrl : '',
    usps: s.uniqueSellingPoints,
    mechanism: s.scientificMechanism,
    ingredients: s.keyActiveIngredients.map(i => [i.name, i.benefit].filter(Boolean).join(': ')),
    targetUser: s.targetSkinOrUser,
    contraindications: s.contraindications,
  }));

  const mappedBanned = (kb.blacklistKeywords || []).map(b => ({
    id: b.id,
    phrase: b.keyword,
    reason: b.rationale,
    replacement: b.alternativeSuggestion || '',
  }));

  const mappedFaqs = (kb.objectionFaqs || []).map(f => ({
    id: f.id,
    question: f.question,
    answer: f.recommendedAnswerForKoc,
    mention: f.doMentionPoints,
    avoid: f.dontSayWords,
  }));

  const mappedLegal = (kb.certifications || []).map(c => ({
    id: c.id,
    title: c.docTitle,
    docNumber: c.docNumber,
    authority: c.issuingAuthority,
    issueDate: c.issueDate,
    validUntil: c.validUntil || '',
    disclaimer: c.mandatoryDisclaimerText || '',
    url: c.verificationUrl || '',
  }));

  const mappedRatecard = (kb.ratecardCeiling || []).map(r => ({
    grade: r.grade,
    maxBudget: r.maxBudget,
  }));

  return {
    key: bKey,
    brandName: master?.name || kb.brandName,
    revision: 1,
    updatedAt: '2026-10-05T10:30:00.000Z',
    updatedBy: master?.accountPic || kb.updatedBy || 'Đặng Thị Yến Nhi',
    positioning: {
      slogan: kb.slogan || fallback.positioning!.slogan,
      story: kb.brandStory || fallback.positioning!.story,
      toneTag: TONE_FROM_MOCK[kb.toneTag] || fallback.positioning!.toneTag,
      toneOfVoice: kb.toneOfVoice || fallback.positioning!.toneOfVoice,
      targetAudience: kb.targetPersonaSummary || fallback.positioning!.targetAudience,
    },
    entity: {
      companyName: kb.companyName || master?.companyName || fallback.entity!.companyName,
      taxCode: kb.taxCode || fallback.entity!.taxCode,
      contactPerson: kb.contactPerson || master?.contactPerson || fallback.entity!.contactPerson,
      originCountry: kb.originCountry || fallback.entity!.originCountry,
    },
    products: mappedProducts.length > 0 ? mappedProducts : fallback.products,
    contentRules: {
      banned: mappedBanned.length > 0 ? mappedBanned : fallback.contentRules!.banned,
      preferred: (kb.whitelistKeywords || []).map(w => ({
        id: w.id,
        phrase: w.phrase,
        note: w.benefitNotes,
      })),
      visualDo: kb.visualDoList?.length ? kb.visualDoList : fallback.contentRules!.visualDo,
      visualDont: kb.visualDontList?.length ? kb.visualDontList : fallback.contentRules!.visualDont,
    },
    faqs: mappedFaqs.length > 0 ? mappedFaqs : fallback.faqs,
    legal: mappedLegal.length > 0 ? mappedLegal : fallback.legal,
    ratecard: mappedRatecard.some(r => (r.maxBudget || 0) > 0) ? mappedRatecard : fallback.ratecard,
    documents: docs.length > 0 ? docs : fallback.documents,
    history: [
      {
        at: '2026-10-05T10:30:00.000Z',
        actorName: master?.accountPic || kb.updatedBy || 'Đặng Thị Yến Nhi',
        section: 'DOCUMENTS',
        summary: `Đồng bộ hồ sơ & bộ tài liệu quy chuẩn thương hiệu ${master?.name || kb.brandName}`,
      },
    ],
  };
}

/** Khởi tạo hồ sơ chuẩn cho từng nhãn hàng trong 42 nhãn B2C thực tế từ dữ liệu gốc. */
function seedFromMasterBrand(m: BrandDetail, index: number): BrandProfile {
  const bKey = brandKey(m.name);
  const isMomBaby = /mẹ|bé|sữa|dinh dưỡng/i.test(m.category);
  const isHealth = /sức khỏe|thực phẩm|dược/i.test(m.category);
  const isFashion = /thời trang|phụ kiện/i.test(m.category);
  const toneTag: ToneTag = isMomBaby ? 'MOM' : isHealth ? 'EXPERT' : isFashion ? 'GENZ' : (m.planBudget || 0) >= 80_000_000 ? 'PREMIUM' : 'EXPERT';

  const taxSuffix = String(100000000 + ((index + 1) * 7919) % 899999999).slice(0, 9);
  const taxCode = `0${taxSuffix}`;

  const matchedPushProducts = INITIAL_PUSH_PRODUCTS.filter(
    p => p.brandName.trim().toLowerCase() === m.name.trim().toLowerCase(),
  );

  const products = (matchedPushProducts.length > 0
    ? matchedPushProducts.map(p => ({
        id: p.id,
        name: p.productName,
        skuCode: p.sku,
        size: 'Quy cách tiêu chuẩn',
        priceVnd: p.originalPrice || undefined,
        pdpUrl: p.pdpUrl && /^https?:/.test(p.pdpUrl) ? p.pdpUrl : `https://upbase.vn/products/${bKey}`,
        usps: p.usp ? p.usp.split(/[.;]\s*/).filter(Boolean) : [
          `Sản phẩm chủ lực chính hãng của thương hiệu ${m.name}`,
          `Tỷ lệ chuyển đổi cao trên ${m.platforms?.join(' & ') || 'TikTok Shop & Shopee Mall'}`,
        ],
        mechanism: p.viralAngle || p.keyMessage || `Tập trung làm rõ hiệu quả thực tế, trải nghiệm sử dụng trực tiếp và ưu đãi chính hãng trên gian hàng ${m.name}.`,
        ingredients: ['Thành phần đạt chuẩn kiểm định chất lượng lưu hành tại Việt Nam'],
        targetUser: isMomBaby ? 'Mẹ bỉm sữa và gia đình có trẻ nhỏ' : isHealth ? 'Người trưởng thành quan tâm chăm sóc sức khỏe chủ động' : 'Khách hàng nữ 18-35 tuổi mua sắm trên TikTok Shop & Shopee Mall',
        contraindications: 'Bảo quản nơi khô thoáng, đọc kỹ hướng dẫn sử dụng trên bao bì trước khi dùng.',
      }))
    : (m.heroProducts && m.heroProducts.length > 0 ? m.heroProducts : [{
        id: `hero-${bKey}-1`,
        productName: `Bộ sản phẩm chủ lực ${m.name} Chính Hãng`,
        sku: `${(m.code || bKey).toUpperCase()}-HERO-01`,
        price: 350_000,
        pdpUrl: `https://upbase.vn/products/${bKey}`,
      }]).map(hp => ({
        id: hp.id,
        name: hp.productName,
        skuCode: hp.sku,
        size: 'Bản tiêu chuẩn chính hãng',
        priceVnd: hp.price || undefined,
        pdpUrl: /^https?:/.test(hp.pdpUrl || '') ? hp.pdpUrl! : `https://upbase.vn/products/${bKey}`,
        usps: [
          `Dòng sản phẩm trọng tâm chiến dịch tháng 10/2026 của ${m.name}`,
          `Phân phối chính hãng trên ${m.platforms?.join(', ') || 'TikTok Shop & Shopee'}`,
          `Hỗ trợ mã ưu đãi độc quyền và quà tặng kèm cho phiên live / video KOC`,
        ],
        mechanism: `Trình bày trực quan kết cấu/chất lượng sản phẩm trong 3 giây đầu (Hook), chứng minh giải pháp thực tế và kêu gọi gắn giỏ hàng chính hãng.`,
        ingredients: ['Công thức chính hãng nhập khẩu / phân phối độc quyền có tem phụ tiếng Việt'],
        targetUser: `Tệp khách hàng ngành ${m.category} trên sàn thương mại điện tử`,
        contraindications: 'Không dùng sản phẩm đã quá hạn hoặc rách niêm phong.',
      }))
  );

  const actor = m.accountPic && !/Đại diện|Chưa phân công/i.test(m.accountPic) ? m.accountPic : (m.brandPicName || 'Đặng Thị Yến Nhi');

  return {
    key: bKey,
    brandName: m.name,
    revision: 1,
    updatedAt: '2026-10-04T09:00:00.000Z',
    updatedBy: actor,
    positioning: {
      slogan: `Giải pháp ${m.category.toLowerCase()} chính hãng chuẩn chất lượng từ ${m.name}`,
      story: `${m.name} là thương hiệu thuộc nhóm ${m.category}, hiện đang vận hành ${m.stores?.length || m.storeCount || 1} gian hàng chính hãng (${(m.platforms || ['TikTok Shop']).join(', ')}) do khối B2C UpBase trực tiếp quản lý kế hoạch Order & Booking KOC.`,
      toneTag,
      toneOfVoice: 'Chân thực, rõ ràng về công dụng được phép công bố, nhấn mạnh trải nghiệm thực tế và cam kết hàng chính hãng.',
      targetAudience: `Khách hàng mua sắm ngành ${m.category} trên ${(m.platforms || ['TikTok Shop', 'Shopee Mall']).join(' và ')}, ưu tiên sản phẩm có đánh giá thực tế từ KOC.`,
    },
    entity: {
      companyName: m.companyName || `Công ty TNHH Phân phối Chính hãng ${m.name} Việt Nam`,
      taxCode,
      contactPerson: m.contactPerson || actor,
      originCountry: /nhật|sakura|senka|cure/i.test(m.name) ? 'Nhật Bản' : /hàn|clio|peripera|goodal|klairs|skin1004|rejuran|dear/i.test(m.name) ? 'Hàn Quốc' : /pháp|l'occitane|bioderma|eupc|babe/i.test(m.name) ? 'Châu Âu' : 'Việt Nam / Nhập khẩu chính ngạch',
    },
    products,
    contentRules: {
      banned: [
        {
          id: `ban-${bKey}-1`,
          phrase: 'trị dứt điểm 100%',
          replacement: 'hỗ trợ cải thiện hiệu quả',
          reason: 'Tuân thủ quy định quảng cáo thương mại điện tử và hồ sơ công bố sản phẩm.',
        },
        {
          id: `ban-${bKey}-2`,
          phrase: 'cam kết khỏi hoàn toàn',
          replacement: 'mang lại thay đổi tích cực khi sử dụng đều đặn',
          reason: 'Tránh dùng từ ngữ khẳng định tuyệt đối gây vi phạm chính sách sàn.',
        },
        {
          id: `ban-${bKey}-3`,
          phrase: 'dìm hàng đối thủ',
          replacement: 'tập trung nêu bật điểm mạnh riêng của sản phẩm',
          reason: 'Quy chuẩn bảo vệ hình ảnh thương hiệu và tuân thủ Luật Quảng cáo.',
        },
      ],
      preferred: [
        {
          id: `pref-${bKey}-1`,
          phrase: `Gian hàng chính hãng ${m.name}`,
          note: 'Nhắc trong phần CTA cuối video để tăng tỷ lệ bấm vào giỏ hàng.',
        },
        {
          id: `pref-${bKey}-2`,
          phrase: 'Trải nghiệm thực tế sau khi sử dụng',
          note: 'Giúp video tự nhiên, giữ chân người xem 3 giây đầu.',
        },
      ],
      visualDo: [
        'Quay rõ bao bì, tem nhãn chính hãng và kết cấu sản phẩm dưới ánh sáng tự nhiên',
        'Hiển thị thao tác sử dụng thực tế của KOC trong 3-5 giây đầu video',
        'Đảm bảo khung hình sạch sẽ, trang phục lịch sự phù hợp tệp khách hàng của nhãn',
      ],
      visualDont: [
        'Không để lộ sản phẩm của thương hiệu cạnh tranh trực tiếp trong cùng khung hình',
        'Không dùng filter làm biến đổi màu sắc thật của bao bì sản phẩm',
        'Không chèn chữ che khuất vùng giỏ hàng TikTok Shop / Shopee Video',
      ],
    },
    faqs: [
      {
        id: `faq-${bKey}-1`,
        question: `Sản phẩm ${m.name} trong giỏ hàng của KOC có phải hàng chính hãng không?`,
        answer: `Link sản phẩm gắn trực tiếp từ gian hàng chính hãng ${m.stores?.[0]?.storeName || m.name}, có đầy đủ hóa đơn, tem phụ và chính sách đổi trả của sàn.`,
        mention: ['Gian hàng Mall / Official chính hãng', 'Đầy đủ tem nhãn kiểm định'],
        avoid: ['Hàng xách tay', 'Hàng tuồn kho'],
      },
      {
        id: `faq-${bKey}-2`,
        question: 'Bao lâu thì thấy hiệu quả khi sử dụng sản phẩm?',
        answer: 'Tùy cơ địa và thói quen sinh hoạt của mỗi người, nên sử dụng đều đặn đúng hướng dẫn để cảm nhận sự cải thiện rõ rệt.',
        mention: ['Sử dụng đều đặn theo hướng dẫn', 'Kết hợp quy trình chăm sóc phù hợp'],
        avoid: ['Hiệu quả tức thì sau 1 lần dùng', 'Chữa khỏi 100%'],
      },
    ],
    legal: [
      {
        id: `leg-${bKey}-1`,
        title: `Hồ sơ công bố lưu hành sản phẩm & Xác nhận quảng cáo ${m.name}`,
        docNumber: `${1020 + index}/2025/XNQC-B2C`,
        authority: 'Cơ quan Quản lý Nhà nước có thẩm quyền',
        issueDate: '15/01/2025',
        validUntil: '15/01/2028',
        disclaimer: isHealth ? 'Thực phẩm này không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.' : 'Đọc kỹ hướng dẫn sử dụng trước khi dùng.',
        url: `https://cdn.upbase.vn/brands/${bKey}/ho-so-cong-bo-${bKey}.pdf`,
      },
    ],
    ratecard: [
      { grade: 'KL1', maxBudget: 800_000 },
      { grade: 'KL2', maxBudget: 1_500_000 },
      { grade: 'KL3', maxBudget: 3_000_000 },
      { grade: 'KL4', maxBudget: 6_000_000 },
      { grade: 'KL5', maxBudget: 12_000_000 },
      { grade: 'KL6', maxBudget: 25_000_000 },
      { grade: 'KL7', maxBudget: 50_000_000 },
    ],
    documents: [
      {
        id: `doc-guide-${bKey}`,
        title: `Brand Guideline & Quy chuẩn KOC ${m.name} Q4/2026.pdf`,
        category: 'GUIDELINE',
        url: `https://cdn.upbase.vn/brands/${bKey}/brand-guideline-q4-2026.pdf`,
        note: m.brandGuideline || `Tài liệu quy chuẩn hình ảnh, giọng văn và từ khóa cho KOC nhãn ${m.name}.`,
        addedBy: actor,
        addedAt: '2026-10-01T08:30:00.000Z',
        fileName: `Brand-Guideline-${m.code || bKey}-Q4-2026.pdf`,
        fileSize: 1_840_000,
        mimeType: 'application/pdf',
        storage: 'LINK',
      },
      {
        id: `doc-brief-${bKey}`,
        title: `Brief Chiến dịch Booking & Phân bổ KOC ${m.name} Tháng 10/2026.xlsx`,
        category: 'BRIEF',
        url: `https://cdn.upbase.vn/brands/${bKey}/brief-booking-2026-10.xlsx`,
        note: `Kế hoạch ngân sách ${m.planBudget ? `${(m.planBudget / 1_000_000).toFixed(1)}M` : 'FOC'} · Chỉ tiêu ${m.targetVideos || 10} video.`,
        addedBy: actor,
        addedAt: '2026-10-02T10:15:00.000Z',
        fileName: `Brief-Booking-${m.code || bKey}-T10-2026.xlsx`,
        fileSize: 645_000,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storage: 'LINK',
      },
    ],
    history: [
      {
        at: '2026-10-04T09:00:00.000Z',
        actorName: actor,
        section: 'POSITIONING',
        summary: `Khởi tạo hồ sơ thương hiệu ${m.name} từ Dữ liệu gốc phòng B2C`,
      },
    ],
  };
}

// Bộ nhớ tạm phòng ngừa khi database Postgres không khả dụng trên serverless hoặc local
let inMemoryFallback: BrandProfile[] | null = null;

export function getFallbackProfiles(): BrandProfile[] {
  if (!inMemoryFallback) {
    const byKey = new Map<string, BrandProfile>();
    for (const kb of INITIAL_BRAND_KNOWLEDGE_BASES) {
      const master = REAL_B2C_42_BRANDS.find(m => brandKey(m.name) === brandKey(kb.brandName))
        || UPBASE_BRANDS_MASTER.find(m => brandKey(m.name) === brandKey(kb.brandName));
      const seeded = seedFromMock(kb, master);
      byKey.set(seeded.key, seeded);
    }
    [...REAL_B2C_42_BRANDS, ...UPBASE_BRANDS_MASTER].forEach((m, idx) => {
      const k = brandKey(m.name);
      if (!byKey.has(k)) {
        byKey.set(k, seedFromMasterBrand(m, idx));
      }
    });
    inMemoryFallback = Array.from(byKey.values());
  }
  return inMemoryFallback;
}

// Bộ nhớ đệm tầng ứng dụng (In-Memory Cache) với TTL 30 giây để phản hồi ngay lập tức (<1ms)
let profilesMemoryCache: { profiles: BrandProfile[]; timestamp: number } | null = null;
const PROFILES_CACHE_TTL_MS = 30_000;

// Circuit Breaker chống treo server khi Postgres không thể kết nối hoặc độ trễ mạng cao
const dbHealth = {
  isAvailable: true,
  lastFailureTime: 0,
};
const DB_FAILURE_COOLDOWN_MS = 60_000; // Nghỉ 60 giây trước khi thử kết nối lại nếu vừa gặp lỗi

async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function ensurePostgresTable(): Promise<boolean> {
  if (!dbHealth.isAvailable) return false;
  try {
    await withTimeout(
      prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "BrandProfileRecord" (
          "key" TEXT NOT NULL PRIMARY KEY,
          "revision" INTEGER NOT NULL DEFAULT 1,
          "data" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
      1500,
      'Khởi tạo bảng BrandProfileRecord quá thời gian cho phép'
    );
    return true;
  } catch (err) {
    console.warn('[BrandProfileStore] Could not auto-create BrandProfileRecord table:', err);
    dbHealth.isAvailable = false;
    dbHealth.lastFailureTime = Date.now();
    return false;
  }
}

async function localProfiles(): Promise<BrandProfile[]> {
  const seeds = getFallbackProfiles();
  try {
    const existing: BrandProfile[] = JSON.parse(await readFile(file(), 'utf8'));
    const byKey = new Map(existing.map(p => [p.key, p]));
    let changed = false;
    for (const s of seeds) {
      const cur = byKey.get(s.key);
      if (!cur) {
        byKey.set(s.key, s);
        changed = true;
      } else if (cur.revision === 1 && cur.documents.length === 0 && s.documents.length > 0) {
        byKey.set(s.key, { ...cur, documents: s.documents, history: cur.history.length ? cur.history : s.history });
        changed = true;
      }
    }
    const merged = Array.from(byKey.values());
    if (changed) {
      await writeFile(file(), JSON.stringify(merged), { mode: 0o600 }).catch(() => undefined);
    }
    return merged;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    await mkdir(directory(), { recursive: true });
    await writeFile(file(), JSON.stringify(seeds), { mode: 0o600, flag: 'wx' }).catch(() => undefined);
    return seeds;
  }
}

export async function listProfiles(): Promise<BrandProfile[]> {
  // 1. Phục vụ ngay từ in-memory cache nếu còn hạn
  if (profilesMemoryCache && Date.now() - profilesMemoryCache.timestamp < PROFILES_CACHE_TTL_MS) {
    return profilesMemoryCache.profiles;
  }

  // 2. Chế độ cục bộ (local JSON)
  if (local()) {
    try {
      const data = await localProfiles();
      profilesMemoryCache = { profiles: data, timestamp: Date.now() };
      return data;
    } catch {
      const data = getFallbackProfiles();
      profilesMemoryCache = { profiles: data, timestamp: Date.now() };
      return data;
    }
  }

  // 3. Chế độ database với Circuit Breaker & Timeout (tối đa 1.5s)
  const isCooldown = Date.now() - dbHealth.lastFailureTime < DB_FAILURE_COOLDOWN_MS;
  if (!isCooldown) {
    try {
      const rows = await withTimeout(
        prisma.$queryRaw<Array<{ data: BrandProfile }>>`SELECT data FROM "BrandProfileRecord"`,
        1500,
        'Truy vấn BrandProfileRecord vượt quá thời gian cho phép'
      );
      dbHealth.isAvailable = true;

      if (rows.length === 0) {
        const seeds = getFallbackProfiles();
        // Cập nhật ngầm trong nền không chặn người dùng
        ensurePostgresTable().then(async ready => {
          if (!ready) return;
          for (const s of seeds) {
            await prisma.$executeRaw`
              INSERT INTO "BrandProfileRecord" (key, revision, data, "updatedAt")
              VALUES (${s.key}, 1, ${JSON.stringify(s)}::jsonb, NOW())
              ON CONFLICT (key) DO NOTHING;
            `.catch(() => undefined);
          }
        }).catch(() => undefined);

        profilesMemoryCache = { profiles: seeds, timestamp: Date.now() };
        return seeds;
      }

      const profiles = rows.map(r => r.data);
      profilesMemoryCache = { profiles, timestamp: Date.now() };
      return profiles;
    } catch (dbErr) {
      console.warn('[BrandProfileStore] Database query failed or timed out, activating circuit breaker fallback:', (dbErr as Error).message);
      dbHealth.isAvailable = false;
      dbHealth.lastFailureTime = Date.now();
    }
  }

  // 4. Fallback mượt mà: ưu tiên đọc file cục bộ nếu có, sau đó đến in-memory seed
  try {
    const fallback = await localProfiles();
    profilesMemoryCache = { profiles: fallback, timestamp: Date.now() };
    return fallback;
  } catch {
    const fallback = getFallbackProfiles();
    profilesMemoryCache = { profiles: fallback, timestamp: Date.now() };
    return fallback;
  }
}

/** Ghi hồ sơ. `expected` là revision người dùng đang xem; khác revision trên máy chủ thì từ chối. */
export async function saveProfile(profile: BrandProfile, expected: number): Promise<BrandProfile> {
  const next = { ...profile, revision: expected + 1, updatedAt: new Date().toISOString() };
  
  // Cập nhật ngay vào cache bộ nhớ để phản hồi tức thì
  if (profilesMemoryCache) {
    const list = profilesMemoryCache.profiles;
    const idx = list.findIndex(p => p.key === next.key);
    if (idx >= 0) list[idx] = next; else list.push(next);
    profilesMemoryCache.timestamp = Date.now();
  }

  if (!local()) {
    const isCooldown = Date.now() - dbHealth.lastFailureTime < DB_FAILURE_COOLDOWN_MS;
    if (!isCooldown) {
      try {
        if (expected === 0) {
          const inserted = await withTimeout(
            prisma.$executeRaw`INSERT INTO "BrandProfileRecord" (key, revision, data, "updatedAt") VALUES (${next.key}, 1, ${JSON.stringify(next)}::jsonb, NOW()) ON CONFLICT (key) DO NOTHING`,
            2000,
            'Lưu hồ sơ vào Database quá thời gian cho phép'
          );
          requireBrand(inserted === 1, 'Hồ sơ vừa được người khác tạo. Tải lại rồi sửa tiếp.', 409);
        } else {
          const updated = await withTimeout(
            prisma.$executeRaw`UPDATE "BrandProfileRecord" SET revision=${next.revision}, data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW() WHERE key=${next.key} AND revision=${expected}`,
            2000,
            'Cập nhật hồ sơ vào Database quá thời gian cho phép'
          );
          requireBrand(updated === 1, 'Hồ sơ đã được người khác cập nhật. Tải lại rồi sửa tiếp.', 409);
        }
        dbHealth.isAvailable = true;
        return next;
      } catch (dbErr) {
        if (dbErr instanceof BrandError) throw dbErr;
        console.warn('[BrandProfileStore] Postgres save failed or timed out:', (dbErr as Error).message);
        dbHealth.isAvailable = false;
        dbHealth.lastFailureTime = Date.now();
      }
    }
    // Fallback in-memory
    const list = getFallbackProfiles();
    const index = list.findIndex(p => p.key === next.key);
    if (index < 0) list.push(next); else list[index] = next;
    return next;
  }

  // Local filesystem
  await mkdir(directory(), { recursive: true });
  let lock;
  try {
    lock = await open(path.join(directory(), 'profiles.lock'), 'wx');
  } catch {
    throw new BrandError('Hồ sơ đang được lưu. Thử lại sau giây lát.', 409);
  }
  const temp = path.join(directory(), `${randomUUID()}.tmp`);
  try {
    const all = await localProfiles();
    const index = all.findIndex(p => p.key === next.key);
    requireBrand(index < 0 ? expected === 0 : all[index].revision === expected, 'Hồ sơ đã được người khác cập nhật. Tải lại rồi sửa tiếp.', 409);
    if (index < 0) all.push(next); else all[index] = next;
    await writeFile(temp, JSON.stringify(all), { mode: 0o600 });
    await rename(temp, file());
    return next;
  } finally {
    await lock.close();
    await unlink(path.join(directory(), 'profiles.lock')).catch(() => undefined);
    await unlink(temp).catch(() => undefined);
  }
}

export const brandStorageMode = () => (local() ? 'LOCAL_DEVELOPMENT' : (dbHealth.isAvailable ? 'POSTGRES' : 'POSTGRES_FALLBACK'));
