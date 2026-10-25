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
import { findRealBrandFileLinks } from './brandFilesCatalog';
import type {
  BrandDocument,
  BrandProfile,
  BrandProjectTier,
  BrandWorkflowRules,
  ToneTag,
} from './types';
import { brandKey } from './types';

const local = () => !!process.env.BRAND_DATA_DIR || (process.env.NODE_ENV !== 'production' && process.env.BRAND_STORAGE !== 'postgres');
const directory = () => path.resolve(/*turbopackIgnore: true*/ process.env.BRAND_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.brand-data'));
const file = () => path.join(directory(), 'profiles.json');

const TONE_FROM_MOCK: Record<string, ToneTag> = {
  'BÁC_SĨ_CHUYÊN_GIA': 'EXPERT',
  'MẸ_BỈM_CHÂN_THỰC': 'MOM',
  'GEN_Z_TRENDING': 'GENZ',
  'SANG_TRỌNG_CAO_CẤP': 'PREMIUM',
};

function buildDefaultWorkflowRules(m: BrandDetail, actor: string): BrandWorkflowRules {
  const bKey = brandKey(m.name);
  const realFiles = findRealBrandFileLinks(bKey);
  const budget = m.planBudget || m.monthlyBudget || 0;
  const isStrategic = budget >= 120_000_000 || (m.stores?.length || 0) >= 2;
  const projectTier: BrandProjectTier = isStrategic
    ? 'TIER_A_STRATEGIC'
    : budget >= 40_000_000
      ? 'TIER_B_GROWTH'
      : 'TIER_C_FULLSTACK';

  const operatingModel = realFiles?.operatingModel
    || (isStrategic ? 'SPLIT_RESOURCE' : 'FULLSTACK_CONTENT_BOOKING');

  const isMomBaby = /mẹ|bé|sữa|dinh dưỡng/i.test(m.category);
  const isHealth = /sức khỏe|thực phẩm|dược/i.test(m.category);

  // Theo khảo sát nhân sự B2C: Một số nhãn cho phép tự duyệt KL1-KL3, chỉ trình duyệt từ KL4+; nhãn FOC tự duyệt
  const kocApprovalMode = budget === 0
    ? 'NONE_AUTO'
    : /kutieskin|eupc|clio|ziaja|fresh|l-occitane|nucos|meracine/i.test(bKey)
      ? 'KL4_PLUS_ONLY'
      : 'ALL';

  const requiresSpark = m.stores?.some(s => s.requiresSparkAds) ?? true;

  return {
    projectTier,
    operatingModel,
    strategyOwnerTeam: projectTier === 'TIER_A_STRATEGIC' ? 'BRAND_TEAM' : 'CONTENT_TEAM',
    brandApproverName: m.contactPerson && !/Đại diện/i.test(m.contactPerson)
      ? m.contactPerson
      : (actor || 'Đặng Thị Yến Nhi'),
    kocApprovalMode,
    requireScriptApproval: projectTier !== 'TIER_C_FULLSTACK',
    requireDemoApproval: true,
    autoAirAfterHours: 72,
    maxFreeRevisions: 2,
    sampleSender: /babe|ekseption|talaypu/i.test(bKey) ? 'BRAND_DIRECT' : 'UPBASE_WAREHOUSE',
    samplePrepSlaHours: 48,
    defaultSamplePolicy: /doji|miuusilver/i.test(bKey) ? 'LOAN_RETURN' : 'GIFT',
    requiresAdsCode: requiresSpark,
    adsCodeDurationDays: isStrategic ? 90 : 60,
    requireRawVideoHandover: true,
    repostAllowedChannels: [
      'TikTok Official của nhãn',
      'Shopee Video & Trang sản phẩm (PDP/SIS)',
      'Chèn trong phiên Livestream gian hàng',
    ],
    minVideoRetentionDays: 90,
    exclusivityDays: isStrategic ? 15 : 0,
    allowExtraFeeForAdsOrCrosspost: isStrategic,
    preferredKocNiches: isMomBaby
      ? ['Mẹ bỉm sữa & Gia đình', 'Bác sĩ Nhi / Dược sĩ', 'Review đồ mẹ & bé']
      : isHealth
        ? ['Dược sĩ / Bác sĩ chuyên khoa', 'Chăm sóc sức khỏe gia đình', 'Lifestyle lành mạnh']
        : ['Beauty Reviewer', 'Bác sĩ Da liễu / Chuyên gia', 'Haul & Routine chăm sóc cá nhân'],
    kocSelectionCriteria:
      'Ưu tiên kênh có tệp người xem thật tại Việt Nam, lịch sử ra đơn ổn định trên TikTok Shop/Shopee, không dính gậy vi phạm chính sách sàn và không nhận bài đối thủ cạnh tranh trực tiếp trong vòng 7 ngày.',
    targetAudienceDemographics: isMomBaby
      ? 'Khán giả Nữ ≥ 75%, độ tuổi 22–38 (mẹ bầu & mẹ bỉm sữa tại Việt Nam)'
      : isHealth
        ? 'Khán giả Nữ & Nam 25–45 tuổi quan tâm chăm sóc sức khỏe chủ động'
        : 'Khán giả Nữ ≥ 70%, độ tuổi 18–34 mua sắm trên TikTok Shop & Shopee Mall',
    kocPersonaAndVisualCriteria: isMomBaby
      ? 'Mẹ bỉm có em bé thật hoặc Bác sĩ/Dược sĩ; bối cảnh phòng ngủ/phòng khách gia đình gọn gàng, sáng sủa; giọng nói ấm áp, chân thực.'
      : 'Da thật khỏe hoặc đúng tình trạng sản phẩm xử lý; quay cận cảnh kết cấu dưới ánh sáng tự nhiên, không dùng filter làm bệt màu; giọng đọc rõ ràng.',
    blacklistedKocs: [],
    handoverFrom: realFiles?.handoverFrom,
    handoverTo: realFiles?.handoverTo || m.brandPicName,
    handoverFileUrl: realFiles?.handoverFileUrl,
    bookingSheetUrl: realFiles?.bookingSheetUrl,
    operationFileUrl: realFiles?.operationFileUrl,
    canvaBriefUrl: realFiles?.canvaBriefUrl,
  };
}

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

  const realFiles = findRealBrandFileLinks(bKey);
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
    ...(realFiles?.canvaBriefUrl ? [{
      id: `doc-canva-${bKey}`,
      title: `Canva Brief định hướng sản phẩm & hình ảnh ${kb.brandName}`,
      category: 'BRIEF' as const,
      url: realFiles.canvaBriefUrl,
      note: `Tài liệu Brief sản phẩm thực tế từ danh mục 3.5 (${realFiles.storeCode})`,
      addedBy: realFiles.handoverTo || master?.accountPic || 'Phòng B2C',
      addedAt: '2026-10-01T08:45:00.000Z',
      storage: 'LINK' as const,
    }] : []),
    ...(realFiles?.bookingSheetUrl ? [{
      id: `doc-sheet-${bKey}`,
      title: `File Booking Google Sheet — ${realFiles.storeCode}`,
      category: 'BRIEF' as const,
      url: realFiles.bookingSheetUrl,
      note: `Bảng theo dõi danh sách KOC và tiến độ booking của gian hàng ${realFiles.storeCode}`,
      addedBy: realFiles.handoverTo || master?.accountPic || 'Phòng B2C',
      addedAt: '2026-10-01T09:10:00.000Z',
      storage: 'LINK' as const,
    }] : []),
    ...(realFiles?.operationFileUrl ? [{
      id: `doc-ops-${bKey}`,
      title: `File vận hành gian hàng — ${realFiles.storeCode}`,
      category: 'OTHER' as const,
      url: realFiles.operationFileUrl,
      note: 'Bảng tổng hợp kế hoạch và theo dõi vận hành hàng tháng của nhãn.',
      addedBy: realFiles.handoverTo || master?.accountPic || 'Phòng B2C',
      addedAt: '2026-10-01T09:20:00.000Z',
      storage: 'LINK' as const,
    }] : []),
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

  const defaultAffRate = master?.stores?.[0]?.affiliateRate || 12;

  const mappedProducts = (kb.skus || []).map((s, idx) => ({
    id: s.id,
    name: s.name,
    skuCode: s.skuCode,
    size: s.volumeOrWeight,
    priceVnd: s.priceVnd || undefined,
    dealPriceVnd: s.priceVnd ? Math.round((s.priceVnd * 0.85) / 1000) * 1000 : undefined,
    commissionOrganicPct: defaultAffRate,
    commissionAdsPct: Math.max(5, defaultAffRate - 4),
    sampleStockStatus: s.sampleStockCount && s.sampleStockCount < 10 ? ('LOW_STOCK' as const) : idx === 2 ? ('LOW_STOCK' as const) : ('IN_STOCK' as const),
    sampleReturnRule: 'GIFT' as const,
    pdpUrl: /^https?:/.test(s.pdpUrl) ? s.pdpUrl : '',
    usps: s.uniqueSellingPoints,
    mechanism: s.scientificMechanism,
    ingredients: s.keyActiveIngredients.map(i => [i.name, i.benefit].filter(Boolean).join(': ')),
    usageInstruction: 'Sử dụng đều đặn sáng và tối sau bước làm sạch theo đúng hướng dẫn trên bao bì.',
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
      brandSays: fallback.positioning!.brandSays,
      consumerSays: fallback.positioning!.consumerSays,
      communicationGap: fallback.positioning!.communicationGap,
      bigIdea: fallback.positioning!.bigIdea,
      keyMessage: fallback.positioning!.keyMessage,
      keyVisualDirection: fallback.positioning!.keyVisualDirection,
      achievements: fallback.positioning!.achievements,
      painPoints: fallback.positioning!.painPoints,
      barriersToTrial: fallback.positioning!.barriersToTrial,
      rtbs: (kb.skus || []).map(s => s.clinicalTrials).filter(Boolean).length > 0
        ? (kb.skus || []).map(s => s.clinicalTrials).filter(Boolean)
        : fallback.positioning!.rtbs,
      contentPillars: fallback.positioning!.contentPillars,
      competitors: fallback.positioning!.competitors,
      competitorTiers: fallback.positioning!.competitorTiers,
    },
    entity: {
      companyName: kb.companyName || master?.companyName || fallback.entity!.companyName,
      taxCode: kb.taxCode || fallback.entity!.taxCode,
      contactPerson: kb.contactPerson || master?.contactPerson || fallback.entity!.contactPerson,
      originCountry: kb.originCountry || fallback.entity!.originCountry,
    },
    workflowRules: fallback.workflowRules,
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
      mandatoryHashtags: fallback.contentRules!.mandatoryHashtags,
      mandatoryMentions: fallback.contentRules!.mandatoryMentions,
      defaultCta: fallback.contentRules!.defaultCta,
      videoDurationRule: fallback.contentRules!.videoDurationRule,
      minAdvertisedPriceRule: fallback.contentRules!.minAdvertisedPriceRule,
      keyPromotionMechanic: fallback.contentRules!.keyPromotionMechanic,
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
  const defaultAffRate = m.stores?.[0]?.affiliateRate || (isHealth ? 15 : 12);

  const matchedPushProducts = INITIAL_PUSH_PRODUCTS.filter(
    p => p.brandName.trim().toLowerCase() === m.name.trim().toLowerCase(),
  );

  // Theo khảo sát nhân sự B2C: Lipit và Natural Care có một số SKU phụ dễ gặp tình trạng hết hàng mẫu
  const hasStockAlertBrand = /lipit|natural-care/i.test(bKey);

  const products = (matchedPushProducts.length > 0
    ? matchedPushProducts.map((p, idx) => ({
        id: p.id,
        name: p.productName,
        skuCode: p.sku,
        size: 'Quy cách tiêu chuẩn',
        priceVnd: p.originalPrice || undefined,
        dealPriceVnd: p.originalPrice ? Math.round((p.originalPrice * 0.85) / 1000) * 1000 : undefined,
        commissionOrganicPct: defaultAffRate,
        commissionAdsPct: Math.max(5, defaultAffRate - 4),
        sampleStockStatus: hasStockAlertBrand && idx > 0 ? ('OUT_OF_STOCK' as const) : idx === 1 ? ('LOW_STOCK' as const) : ('IN_STOCK' as const),
        sampleReturnRule: /doji|miuusilver/i.test(bKey) ? ('LOAN_RETURN' as const) : ('GIFT' as const),
        pdpUrl: p.pdpUrl && /^https?:/.test(p.pdpUrl) ? p.pdpUrl : `https://upbase.vn/products/${bKey}`,
        usps: p.usp ? p.usp.split(/[.;]\s*/).filter(Boolean) : [
          `Sản phẩm chủ lực chính hãng của thương hiệu ${m.name}`,
          `Tỷ lệ chuyển đổi cao trên ${m.platforms?.join(' & ') || 'TikTok Shop & Shopee Mall'}`,
        ],
        mechanism: p.viralAngle || p.keyMessage || `Tập trung làm rõ hiệu quả thực tế, trải nghiệm sử dụng trực tiếp và ưu đãi chính hãng trên gian hàng ${m.name}.`,
        ingredients: ['Thành phần đạt chuẩn kiểm định chất lượng lưu hành tại Việt Nam'],
        usageInstruction: 'Sử dụng đều đặn hàng ngày theo hướng dẫn trên bao bì sản phẩm; quay rõ thao tác sử dụng trên video.',
        targetUser: isMomBaby ? 'Mẹ bỉm sữa và gia đình có trẻ nhỏ' : isHealth ? 'Người trưởng thành quan tâm chăm sóc sức khỏe chủ động' : 'Khách hàng nữ 18-35 tuổi mua sắm trên TikTok Shop & Shopee Mall',
        contraindications: 'Bảo quản nơi khô thoáng, đọc kỹ hướng dẫn sử dụng trên bao bì trước khi dùng.',
      }))
    : (m.heroProducts && m.heroProducts.length > 0 ? m.heroProducts : [{
        id: `hero-${bKey}-1`,
        productName: `Bộ sản phẩm chủ lực ${m.name} Chính Hãng`,
        sku: `${(m.code || bKey).toUpperCase()}-HERO-01`,
        price: 350_000,
        pdpUrl: `https://upbase.vn/products/${bKey}`,
      }]).map((hp, idx) => ({
        id: hp.id,
        name: hp.productName,
        skuCode: hp.sku,
        size: 'Bản tiêu chuẩn chính hãng',
        priceVnd: hp.price || undefined,
        dealPriceVnd: hp.price ? Math.round((hp.price * 0.85) / 1000) * 1000 : undefined,
        commissionOrganicPct: defaultAffRate,
        commissionAdsPct: Math.max(5, defaultAffRate - 4),
        sampleStockStatus: hasStockAlertBrand && idx > 0 ? ('OUT_OF_STOCK' as const) : ('IN_STOCK' as const),
        sampleReturnRule: /doji|miuusilver/i.test(bKey) ? ('LOAN_RETURN' as const) : ('GIFT' as const),
        pdpUrl: /^https?:/.test(hp.pdpUrl || '') ? hp.pdpUrl! : `https://upbase.vn/products/${bKey}`,
        usps: [
          `Dòng sản phẩm trọng tâm chiến dịch tháng 10/2026 của ${m.name}`,
          `Phân phối chính hãng trên ${m.platforms?.join(', ') || 'TikTok Shop & Shopee'}`,
          `Hỗ trợ mã ưu đãi độc quyền và quà tặng kèm cho phiên live / video KOC`,
        ],
        mechanism: `Quay rõ chất sản phẩm khi dùng thử trực tiếp và gắn giỏ hàng gian hàng chính hãng.`,
        ingredients: ['Sản phẩm phân phối chính hãng, có đầy đủ tem phụ tiếng Việt'],
        usageInstruction: 'Sử dụng đều đặn hàng ngày theo hướng dẫn trên bao bì sản phẩm; quay rõ thao tác sử dụng trên video.',
        targetUser: `Khách hàng ngành ${m.category} trên sàn thương mại điện tử`,
        contraindications: 'Không dùng sản phẩm đã quá hạn hoặc rách niêm phong.',
      }))
  );

  const actor = m.accountPic && !/Đại diện|Chưa phân công/i.test(m.accountPic) ? m.accountPic : (m.brandPicName || 'Đặng Thị Yến Nhi');
  const realFiles = findRealBrandFileLinks(bKey);
  const cleanHashtag = m.name.replace(/[^a-zA-Z0-9À-ỹ]/g, '');

  const docs: BrandDocument[] = [
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
    ...(realFiles?.canvaBriefUrl ? [{
      id: `doc-canva-${bKey}`,
      title: `Canva Brief định hướng sản phẩm & hình ảnh ${m.name}`,
      category: 'BRIEF' as const,
      url: realFiles.canvaBriefUrl,
      note: `Link Canva Brief sản phẩm thực tế từ bảng 3.5 Danh sách file brand (${realFiles.storeCode}).`,
      addedBy: realFiles.handoverTo || actor,
      addedAt: '2026-10-01T09:00:00.000Z',
      storage: 'LINK' as const,
    }] : []),
    ...(realFiles?.bookingSheetUrl ? [{
      id: `doc-sheet-${bKey}`,
      title: `File Booking Google Sheet — ${realFiles.storeCode}`,
      category: 'BRIEF' as const,
      url: realFiles.bookingSheetUrl,
      note: `Bảng quản lý danh sách KOC và theo dõi booking gian hàng ${realFiles.storeCode}.`,
      addedBy: realFiles.handoverTo || actor,
      addedAt: '2026-10-01T09:30:00.000Z',
      storage: 'LINK' as const,
    }] : []),
    ...(realFiles?.operationFileUrl ? [{
      id: `doc-ops-${bKey}`,
      title: `File vận hành gian hàng — ${realFiles.storeCode}`,
      category: 'OTHER' as const,
      url: realFiles.operationFileUrl,
      note: `File vận hành tổng hợp kế hoạch và báo cáo của gian hàng ${realFiles.storeCode}.`,
      addedBy: realFiles.handoverTo || actor,
      addedAt: '2026-10-01T10:00:00.000Z',
      storage: 'LINK' as const,
    }] : []),
    ...(realFiles?.handoverFileUrl ? [{
      id: `doc-handover-${bKey}`,
      title: `Hồ sơ bàn giao dự án ${m.name} (${realFiles.handoverFrom || 'B2C'} → ${realFiles.handoverTo || actor})`,
      category: 'OTHER' as const,
      url: realFiles.handoverFileUrl,
      note: `Tài liệu bàn giao lịch sử triển khai và tệp KOC của nhãn ${m.name}.`,
      addedBy: realFiles.handoverFrom || actor,
      addedAt: '2026-09-28T10:00:00.000Z',
      storage: 'LINK' as const,
    }] : []),
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
  ];

  return {
    key: bKey,
    brandName: m.name,
    revision: 1,
    updatedAt: '2026-10-04T09:00:00.000Z',
    updatedBy: actor,
    positioning: {
      slogan: `Sản phẩm ${m.category.toLowerCase()} chính hãng từ ${m.name}`,
      story: `${m.name} thuộc ngành ${m.category}, hiện vận hành ${m.stores?.length || m.storeCount || 1} gian hàng chính hãng (${(m.platforms || ['TikTok Shop']).join(', ')}) do phòng B2C UpBase phụ trách.`,
      toneTag,
      toneOfVoice: 'Chia sẻ tự nhiên, nói đúng công dụng theo giấy công bố và quay trải nghiệm dùng thật.',
      targetAudience: `Khách hàng mua ${m.category.toLowerCase()} trên ${(m.platforms || ['TikTok Shop', 'Shopee Mall']).join(' và ')}.`,
      brandSays: isMomBaby
        ? `${m.name} định vị là thương hiệu ${m.category.toLowerCase()} lành tính, chuẩn kiểm định an toàn cho mẹ bầu và trẻ sơ sinh.`
        : isHealth
          ? `${m.name} định vị là giải pháp chăm sóc sức khỏe chủ động với công thức chuẩn dược phẩm và nguồn gốc minh bạch.`
          : `${m.name} định vị là thương hiệu ${m.category.toLowerCase()} chuyên sâu, công thức hiệu quả cao phù hợp làn da châu Á.`,
      consumerSays: isMomBaby
        ? `Khách hàng biết đến ${m.name} qua review của hội mẹ bỉm nhưng còn phân vân về tốc độ thấm, mùi hương và giá khi dùng lâu dài.`
        : isHealth
          ? `Khách hàng quan tâm công dụng của ${m.name} nhưng còn e ngại mùi vị khi uống và cần xem phản hồi thực tế sau 2–4 tuần sử dụng.`
          : `Khách hàng thấy ${m.name} xuất hiện nhiều trên TikTok nhưng cần kiểm chứng chất kem thực tế trên da dầu/nhạy cảm và độ bền màu/hiệu quả thật.`,
      communicationGap: `Cần dịch chuyển nhận thức từ "nghe tên qua quảng cáo" sang "tin tưởng nhờ trải nghiệm kiểm chứng thực tế trên tình huống đời thường" trước khi tung ưu đãi chuyển đổi.`,
      bigIdea: isMomBaby
        ? `Cùng ${m.name} chăm con dịu lành, mẹ nhàn tênh mỗi ngày`
        : isHealth
          ? `Chủ động chăm sóc cơ thể khỏe đẹp từ gốc cùng ${m.name}`
          : `Trạm chăm sóc chuẩn chuyên gia từ ${m.name} — Đúng hoạt chất, thật hiệu quả`,
      keyMessage: isMomBaby
        ? `Dịu lành chuẩn kiểm định cho bé — Mẹ an tâm chọn đúng ngay từ đầu`
        : isHealth
          ? `Bổ sung chuẩn khoa học mỗi ngày — Cơ thể nhẹ nhàng, rạng rỡ từ bên trong`
          : `Chăm da đúng trọng tâm — Mềm mịn để chạm, khỏe khoắn để tự tin`,
      keyVisualDirection: `Bối cảnh phòng ngủ/phòng tắm/bàn trang điểm sáng sạch tự nhiên (Indoor tone trắng/be/pastel hoặc Outdoor nhiều cây xanh); quay cận cảnh (close-up) kết cấu sản phẩm trên da thật dưới ánh sáng tự nhiên, hạn chế filter làm lệch màu.`,
      achievements: [
        `Thương hiệu chính hãng thuộc nhóm tăng trưởng trọng điểm ngành ${m.category} trên ${(m.platforms || ['TikTok Shop', 'Shopee Mall']).join(' & ')}`,
        `Đạt đánh giá trung bình 4.9/5 sao từ hàng chục nghìn lượt mua thực tế tại gian hàng Official Mall`,
        `Được hàng trăm KOC, Dược sĩ, Bác sĩ chuyên khoa và Beauty Creator uy tín trải nghiệm, đánh giá tích cực`,
      ],
      painPoints: isMomBaby
        ? ['Lo ngại sản phẩm gây kích ứng cho làn da nhạy cảm của bé', 'Đã thử nhiều dòng trên thị trường nhưng hiệu quả chậm, tốn kém']
        : isHealth
          ? ['Cơ thể mệt mỏi, thiếu hụt vi chất nhưng ngại dùng sản phẩm khó uống', 'Lo lắng về nguồn gốc xuất xứ và độ an toàn khi dùng dài ngày']
          : ['Da gặp khuyết điểm/kích ứng khi thay đổi thời tiết hoặc thức khuya', 'Khó chọn sản phẩm phù hợp với tình trạng cá nhân giữa quá nhiều lời quảng cáo'],
      barriersToTrial: [
        'Sợ mua phải hàng giả, hàng nhái hoặc cận date trên sàn TMĐT',
        'Ngần ngại mức giá cao hơn các dòng đại trà nếu chưa thấy bằng chứng rõ ràng',
        'Lo ngại sản phẩm không hợp cơ địa hoặc gây kích ứng khi mới chuyển sang dùng',
      ],
      rtbs: [
        `Nhập khẩu / phân phối chính ngạch với đầy đủ phiếu công bố lưu hành tại Việt Nam`,
        `Gian hàng chính hãng (Official Mall) của ${m.name} với cam kết hoàn tiền nếu phát hiện hàng giả`,
        `Hàng nghìn đánh giá 4.9/5 sao thực tế từ khách hàng đã mua lại trên TikTok Shop & Shopee`,
      ],
      contentPillars: [
        'Awareness: Gọi đúng nỗi đau đời thường của tệp khách hàng + Giải thích nguyên nhân khoa học',
        'Consideration: Trải nghiệm thực tế chất sản phẩm (test trực tiếp, routine hàng ngày, giải đáp rào cản)',
        'Conversion: Bằng chứng mua lại lần 2–3 + Tung ưu đãi combo/quà tặng độc quyền phiên Mega/Payday',
      ],
      competitors: ['Các thương hiệu cùng phân khúc chưa có giấy phép công bố hoặc hàng xách tay trôi nổi'],
      competitorTiers: {
        tierA: isMomBaby
          ? ['Các thương hiệu Mẹ & Bé cùng phân khúc giá và cùng tệp mẹ bầu/mẹ bỉm trên TikTok Shop']
          : isHealth
            ? ['Các nhãn Thực phẩm bảo vệ sức khỏe / Dược mỹ phẩm cạnh tranh trực tiếp cùng công dụng']
            : ['Các thương hiệu Skincare / Makeup cùng phân khúc giá (Mass/Masstige) và cùng tệp khách 18–30 tuổi'],
        tierB: ['Các thương hiệu đa ngành hàng có giao thoa 1–2 dòng sản phẩm phụ trong mùa chiến dịch'],
        tierC: ['Các thương hiệu đầu ngành toàn cầu (Benchmark về cách kể câu chuyện nguyên liệu và đồng bộ Key Visual)'],
      },
    },
    entity: {
      companyName: m.companyName || `Công ty TNHH Phân phối Chính hãng ${m.name} Việt Nam`,
      taxCode,
      contactPerson: m.contactPerson || actor,
      originCountry: /nhật|sakura|senka|cure|82x|nucos/i.test(m.name) ? 'Nhật Bản' : /hàn|clio|peripera|goodal|klairs|skin1004|rejuran|dear|nabizam|baegayul|face republic/i.test(m.name) ? 'Hàn Quốc' : /pháp|l'occitane|bioderma|eupc|babe|ziaja|eubos|christian lenart/i.test(m.name) ? 'Châu Âu' : 'Việt Nam / Nhập khẩu chính ngạch',
    },
    workflowRules: buildDefaultWorkflowRules(m, actor),
    products,
    contentRules: {
      banned: [
        {
          id: `ban-${bKey}-1`,
          phrase: 'trị dứt điểm 100%',
          replacement: 'hỗ trợ cải thiện',
          reason: 'Quảng cáo mỹ phẩm/thực phẩm không được cam kết điều trị tuyệt đối.',
        },
        {
          id: `ban-${bKey}-2`,
          phrase: 'cam kết khỏi hoàn toàn',
          replacement: 'cải thiện rõ hơn khi dùng đều đặn',
          reason: 'Tránh từ ngữ khẳng định tuyệt đối gây vi phạm chính sách sàn.',
        },
        {
          id: `ban-${bKey}-3`,
          phrase: 'dìm hàng đối thủ',
          replacement: 'tập trung nói điểm mạnh của sản phẩm',
          reason: 'Không so sánh trực tiếp với nhãn hàng khác theo Luật Quảng cáo.',
        },
      ],
      preferred: [
        {
          id: `pref-${bKey}-1`,
          phrase: `Gian hàng chính hãng ${m.name}`,
          note: 'Nhắc ở cuối video khi chỉ vào giỏ hàng.',
        },
        {
          id: `pref-${bKey}-2`,
          phrase: 'Cảm nhận thực tế khi dùng',
          note: 'Nêu rõ cảm giác trên da/khi sử dụng để người xem dễ hình dung.',
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
      mandatoryHashtags: [`#${cleanHashtag}`, `#${cleanHashtag}ChinhHang`, '#UpBaseB2C'],
      mandatoryMentions: [`@${bKey.replace(/-/g, '')}.official`],
      defaultCta: `Bấm vào giỏ hàng góc trái gian hàng chính hãng ${m.name} để áp voucher ưu đãi và nhận quà tặng kèm ngay hôm nay.`,
      videoDurationRule: 'Thời lượng 45–90 giây; sản phẩm phải xuất hiện trong 5 giây đầu và quay cận cảnh kết cấu.',
      minAdvertisedPriceRule: `Chỉ truyền thông đúng khung giá Deal đã duyệt của chiến dịch; tuyệt đối không dùng từ "xả kho", "thanh lý giá rẻ" hoặc tự ý báo giá thấp hơn giá sàn của nhãn ${m.name}.`,
      keyPromotionMechanic: `Ưu đãi voucher gian hàng chính hãng ${m.name} + Quà tặng kèm GWP và Freeship theo khung chiến dịch Mega / Payday.`,
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
    documents: docs,
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

/** Bổ sung các trường mới từ seed nếu bản ghi cũ trong file JSON / DB chưa có */
function enrichExistingProfile(cur: BrandProfile, seed: BrandProfile): { profile: BrandProfile; upgraded: boolean } {
  let upgraded = false;
  let next = cur;

  if (!cur.workflowRules && seed.workflowRules) {
    next = { ...next, workflowRules: seed.workflowRules };
    upgraded = true;
  }
  if (cur.positioning && seed.positioning && (!cur.positioning.painPoints?.length || !cur.positioning.brandSays || !cur.positioning.bigIdea)) {
    next = {
      ...next,
      positioning: {
        ...cur.positioning,
        brandSays: cur.positioning.brandSays || seed.positioning.brandSays,
        consumerSays: cur.positioning.consumerSays || seed.positioning.consumerSays,
        communicationGap: cur.positioning.communicationGap || seed.positioning.communicationGap,
        bigIdea: cur.positioning.bigIdea || seed.positioning.bigIdea,
        keyMessage: cur.positioning.keyMessage || seed.positioning.keyMessage,
        keyVisualDirection: cur.positioning.keyVisualDirection || seed.positioning.keyVisualDirection,
        achievements: cur.positioning.achievements?.length ? cur.positioning.achievements : seed.positioning.achievements,
        painPoints: cur.positioning.painPoints?.length ? cur.positioning.painPoints : seed.positioning.painPoints,
        barriersToTrial: cur.positioning.barriersToTrial?.length ? cur.positioning.barriersToTrial : seed.positioning.barriersToTrial,
        rtbs: cur.positioning.rtbs?.length ? cur.positioning.rtbs : seed.positioning.rtbs,
        contentPillars: cur.positioning.contentPillars?.length ? cur.positioning.contentPillars : seed.positioning.contentPillars,
        competitors: cur.positioning.competitors?.length ? cur.positioning.competitors : seed.positioning.competitors,
        competitorTiers: cur.positioning.competitorTiers || seed.positioning.competitorTiers,
      },
    };
    upgraded = true;
  }
  if (cur.contentRules && seed.contentRules && !cur.contentRules.mandatoryHashtags?.length) {
    next = {
      ...next,
      contentRules: {
        ...cur.contentRules,
        mandatoryHashtags: seed.contentRules.mandatoryHashtags,
        mandatoryMentions: seed.contentRules.mandatoryMentions,
        defaultCta: cur.contentRules.defaultCta || seed.contentRules.defaultCta,
        videoDurationRule: cur.contentRules.videoDurationRule || seed.contentRules.videoDurationRule,
      },
    };
    upgraded = true;
  }
  if (cur.products.length > 0 && cur.products.every(p => p.commissionOrganicPct === undefined)) {
    next = {
      ...next,
      products: cur.products.map((p, idx) => {
        const sp = seed.products[idx] || seed.products[0];
        return {
          ...p,
          dealPriceVnd: p.dealPriceVnd ?? sp?.dealPriceVnd,
          commissionOrganicPct: p.commissionOrganicPct ?? sp?.commissionOrganicPct ?? 12,
          commissionAdsPct: p.commissionAdsPct ?? sp?.commissionAdsPct ?? 8,
          sampleStockStatus: p.sampleStockStatus ?? sp?.sampleStockStatus ?? 'IN_STOCK',
          sampleReturnRule: p.sampleReturnRule ?? sp?.sampleReturnRule ?? 'GIFT',
        };
      }),
    };
    upgraded = true;
  }
  // Bổ sung các tài liệu thực tế từ bảng 3.5 nếu chưa có trong documents
  if (seed.documents.length > cur.documents.length) {
    const existingIds = new Set(cur.documents.map(d => d.id));
    const missingDocs = seed.documents.filter(d => !existingIds.has(d.id));
    if (missingDocs.length > 0) {
      next = { ...next, documents: [...cur.documents, ...missingDocs] };
      upgraded = true;
    }
  }

  return { profile: next, upgraded };
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
      } else {
        const { profile: enriched, upgraded } = enrichExistingProfile(cur, s);
        if (upgraded) {
          byKey.set(s.key, enriched);
          changed = true;
        }
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

      const seeds = getFallbackProfiles();
      const byKey = new Map(rows.map(r => [r.data.key, r.data]));
      const missing: BrandProfile[] = [];
      for (const s of seeds) {
        const cur = byKey.get(s.key);
        if (!cur) {
          byKey.set(s.key, s);
          missing.push(s);
        } else {
          const { profile: enriched } = enrichExistingProfile(cur, s);
          byKey.set(s.key, enriched);
        }
      }

      if (missing.length > 0) {
        prisma.brandProfileRecord.createMany({
          data: missing.map(s => ({
            key: s.key,
            revision: 1,
            data: s as unknown as object
          })),
          skipDuplicates: true
        }).catch(() => undefined);
      }

      const profiles = Array.from(byKey.values());
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
