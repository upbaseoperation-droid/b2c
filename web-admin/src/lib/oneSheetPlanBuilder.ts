import {
  BrandOneSheetPlanData,
  BrandOneSheetPillarRow,
  BrandOneSheetTikTokWeeklyRow,
  BrandOneSheetTikTokContentRow,
  BrandOneSheetShopeeWeeklyTarget,
  BrandOneSheetShopeeContentRow,
  BrandMonthlyPlanItem,
  CampaignItem,
  InputPlanBreakdownState,
  StorePortfolioItem,
  isCampaignActiveInMonth,
  getCampaignPhaseForMonth,
} from './types';

/**
 * Xây dựng dữ liệu chuẩn 1-Sheet Monthly Content & Key Visual Plan trình Brand
 * Tự động kéo & tổng hợp từ:
 *  - Vị trí Brand Strategy & Thực thể Chiến dịch (Section 01)
 *  - Kế hoạch Gian hàng TikTok Shop + Shopee của Brand trong tháng (Section 02)
 *  - Vị trí Key Visual / SIS (Section 03)
 *  - Đội ngũ Booking & Content TikTok Shop (Section 04)
 *  - Đội ngũ Content Shopee & Chiến lược Pillar P01–P05 (Section 05)
 */
export function buildBrandOneSheetPlanData(params: {
  brandName: string;
  month: string;
  brandPlan?: BrandMonthlyPlanItem | null;
  storePlans?: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
  campaigns?: CampaignItem[];
}): BrandOneSheetPlanData {
  const {
    brandName,
    month,
    brandPlan,
    storePlans = [],
    storePortfolios = [],
    campaigns = [],
  } = params;

  const cleanBrand = (brandName || '').split('_')[0].trim() || 'pH Care';
  const normBrand = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const isPhCare = normBrand.includes('phcare');

  // 1. Tìm Campaign đang hoạt động của Brand trong tháng (nếu có)
  const matchingStorePlans = storePlans.filter((p) => {
    const pb = (p.parentBrand || p.brandName || '').split('_')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return p.month === month && (pb === normBrand || pb.includes(normBrand) || normBrand.includes(pb));
  });

  // Nếu có sẵn oneSheetPlanData đã lưu trong BrandPlan hoặc StorePlan thì ưu tiên trả về
  if (brandPlan?.oneSheetPlanData && brandPlan.oneSheetPlanData.month === month) {
    return brandPlan.oneSheetPlanData;
  }
  const savedFromStore = matchingStorePlans.find((p) => p.oneSheetPlanData)?.oneSheetPlanData;
  if (savedFromStore) {
    return savedFromStore;
  }

  const explicitCampaignId = brandPlan?.campaignId || matchingStorePlans.find((p) => p.campaignId)?.campaignId;
  const activeCampaign =
    (explicitCampaignId ? campaigns.find((c) => c.id === explicitCampaignId) : undefined) ||
    campaigns.find((c) => {
      const cb = (c.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (cb === normBrand || cb.includes(normBrand) || normBrand.includes(cb)) && isCampaignActiveInMonth(c, month);
    });

  const hasCampaign =
    brandPlan?.hasCampaign !== undefined
      ? Boolean(brandPlan.hasCampaign)
      : matchingStorePlans.some((p) => p.hasCampaign !== undefined)
      ? Boolean(matchingStorePlans.find((p) => p.hasCampaign !== undefined)?.hasCampaign)
      : Boolean(activeCampaign);

  const activePhase = activeCampaign ? getCampaignPhaseForMonth(activeCampaign, month) : undefined;

  const monthNum = month.split('/')[1] || '11';
  const yearNum = month.split('/')[0] || '2026';

  // 2. Lọc gian hàng TikTok vs Shopee của Brand
  const brandStores = storePortfolios.filter((s) => {
    const sb = (s.brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return sb === normBrand || sb.includes(normBrand) || normBrand.includes(sb);
  });

  const tiktokPlan = matchingStorePlans.find(
    (p) =>
      (p.storeName || p.brandName || '').toLowerCase().includes('tiktok') ||
      !((p.storeName || p.brandName || '').toLowerCase().includes('shopee'))
  );
  const shopeePlan = matchingStorePlans.find((p) =>
    (p.storeName || p.brandName || '').toLowerCase().includes('shopee')
  );

  const tiktokStore = brandStores.find((s) => s.platform === 'TikTok Shop');
  const shopeeStore = brandStores.find((s) => s.platform === 'Shopee Mall' || s.platform.toLowerCase().includes('shopee'));

  // Lấy số liệu các dòng KL1-KL7 từ tiktokPlan
  const getItemQty = (plan: InputPlanBreakdownState | undefined, id: string, fallback: number) =>
    plan?.items.find((i) => i.id === id)?.qty ?? fallback;
  const getItemBudget = (plan: InputPlanBreakdownState | undefined, id: string, fallback: number) =>
    plan?.items.find((i) => i.id === id)?.totalBudget ?? fallback;

  const tapTotal = isPhCare ? 25 : getItemQty(tiktokPlan, 'row-tt-tap', 25);
  const kl1Total = isPhCare ? 0 : getItemQty(tiktokPlan, 'row-tt-kl1', 0);
  const kl2Total = isPhCare ? 20 : getItemQty(tiktokPlan, 'row-tt-kl2', 20);
  const kl3Total = isPhCare ? 0 : getItemQty(tiktokPlan, 'row-tt-kl3', 0);
  const kl4Total = isPhCare ? 0 : getItemQty(tiktokPlan, 'row-tt-kl4', 0);
  const kl5Total = isPhCare ? 10 : getItemQty(tiktokPlan, 'row-tt-kl5', 10);
  const kl6Total = isPhCare ? 5 : getItemQty(tiktokPlan, 'row-tt-kl6', 5);
  const kl7Total = isPhCare ? 0 : getItemQty(tiktokPlan, 'row-tt-kl7', 0);

  const kl1BudgetTotal = isPhCare ? 0 : getItemBudget(tiktokPlan, 'row-tt-kl1', 0);
  const kl2BudgetTotal = isPhCare ? 10000000 : getItemBudget(tiktokPlan, 'row-tt-kl2', 10000000);
  const kl3BudgetTotal = isPhCare ? 0 : getItemBudget(tiktokPlan, 'row-tt-kl3', 0);
  const kl4BudgetTotal = isPhCare ? 0 : getItemBudget(tiktokPlan, 'row-tt-kl4', 0);
  const kl5BudgetTotal = isPhCare ? 40000000 : getItemBudget(tiktokPlan, 'row-tt-kl5', 40000000);
  const kl6BudgetTotal = isPhCare ? 50000000 : getItemBudget(tiktokPlan, 'row-tt-kl6', 50000000);
  const kl7BudgetTotal = isPhCare ? 0 : getItemBudget(tiktokPlan, 'row-tt-kl7', 0);

  const totalBookingVideoBudget =
    kl1BudgetTotal +
    kl2BudgetTotal +
    kl3BudgetTotal +
    kl4BudgetTotal +
    kl5BudgetTotal +
    kl6BudgetTotal +
    kl7BudgetTotal || 100000000;

  const tiktokGmvSeller = isPhCare
    ? 5000000000
    : tiktokPlan?.targetGmv || tiktokStore?.monthlyTargetGmv || 2500000000;
  const tiktokCancelRate = isPhCare ? 0.1 : tiktokPlan?.cancellationRate || 0.1;
  const tiktokNmvSeller = Math.round(tiktokGmvSeller * (1 - tiktokCancelRate));
  const tiktokAov = 200000;
  const tiktokOrders = Math.round(tiktokGmvSeller / tiktokAov);
  const tiktokCr = 0.05;
  const tiktokTraffic = Math.round(tiktokOrders / tiktokCr);

  const shopeeGmvSeller = isPhCare
    ? 1000000000
    : shopeePlan?.targetGmv || shopeeStore?.monthlyTargetGmv || Math.round(tiktokGmvSeller * 0.35);
  const shopeeCancelRate = 0.05;
  const shopeeNmvSeller = Math.round(shopeeGmvSeller * (1 - shopeeCancelRate));
  const shopeeAov = 200000;
  const shopeeOrders = Math.round(shopeeGmvSeller / shopeeAov);
  const shopeeCr = 0.05;
  const shopeeTraffic = Math.round(shopeeOrders / shopeeCr);

  // Doanh thu theo hoạt động
  const tiktokGmvVideo = isPhCare ? 1400000000 : Math.round(tiktokGmvSeller * 0.28);
  const tiktokGmvLive = isPhCare ? 500000000 : Math.round(tiktokGmvSeller * 0.1);
  const tiktokGmvCard = Math.max(0, tiktokGmvSeller - tiktokGmvVideo - tiktokGmvLive);

  const shopeeGmvVideo = isPhCare ? 600000000 : Math.round(shopeeGmvSeller * 0.6);
  const shopeeGmvLive = isPhCare ? 300000000 : Math.round(shopeeGmvSeller * 0.3);
  const shopeeGmvCard = Math.max(0, shopeeGmvSeller - shopeeGmvVideo - shopeeGmvLive);

  const preparedBy =
    brandPlan?.planStrategyPic ||
    activeCampaign?.brandStrategyPic ||
    tiktokPlan?.pic ||
    'Hoàng Thuỳ';

  const contentMainPic =
    brandPlan?.contentBrandMainPic ||
    shopeePlan?.pic ||
    'Bích Liên';

  const kvPic =
    brandPlan?.keyVisualSisPic ||
    activeCampaign?.kvPic ||
    'Lê Thanh Hải';

  const heroSkuText =
    activeCampaign?.heroSkus?.join(' | ') ||
    (isPhCare
      ? 'pH Care Natural (chai Xanh lá) | Delicate, Cooling 20/10 mới có hàng.'
      : `${cleanBrand} Hero SKU chủ lực & Combo bán chạy tháng ${monthNum}/${yearNum}`);

  // Section 01: Định hướng tháng
  const orientation = {
    roleInYearPlan:
      activeCampaign?.roleInYearPlan ||
      (hasCampaign
        ? `Scale video chuyển đổi trước/sau đợt sale tháng ${monthNum}; duy trì nhận diện trên 2 sàn.`
        : `Duy trì nhịp chuyển đổi thường nhật (Always-on) tháng ${monthNum}/${yearNum} trên TikTok Shop & Shopee.`),
    objectivesAndBarriers:
      activeCampaign?.objectivesAndBarriers ||
      `Mục tiêu: tăng khách mới và mua combo. | Rào cản: Ít SKU, quà chưa đa dạng. KH ngại hỏi trực tiếp về sản phẩm, chưa rõ SKU/giá sau voucher.`,
    heroSkusUspRtb: heroSkuText,
    seasonalOpportunity:
      activeCampaign?.seasonalOpportunity ||
      `Chuẩn bị routine cá nhân cho mùa bận rộn; mua tích trữ trong đợt sale tháng ${monthNum}/${yearNum}.`,
    bigIdeaMonthlyTheme:
      activeCampaign?.bigIdea ||
      brandPlan?.planStrategyPlan.bigIdeaAndKeyMessage ||
      (isPhCare
        ? 'Kiểm soát mùi, mở tự tin - chăm sóc cá nhân để thoải mái trong nhịp sống mỗi ngày.'
        : `${cleanBrand} — Chăm sóc chuẩn chuyên gia, tự tin tỏa sáng mỗi ngày.`),
    previousMonthReview: `Bài học tháng trước: nội dung demo rõ cách dùng và giải thích deal tốt hơn video chỉ nêu giá. Tập trung tối ưu hook 3s đầu và điều kiện voucher.`,
    targetAudienceInsight:
      activeCampaign?.targetAudience ||
      `Tệp đề xuất: nữ 22–35, văn phòng/lifestyle. | Insight: muốn chăm sóc bản thân nhưng cần giải thích kín đáo, dễ hiểu và đáng tin.`,
    comboPromoOffer:
      activeCampaign?.comboPromoOffer ||
      `Chai đơn giảm 10%; combo 2 sản phẩm giảm 15%; voucher tối đa 30.000đ từ 199.000đ. Quà combo: chờ Brand chốt loại/quy cách/tồn; chưa đưa vào KV trước khi xác nhận.`,
    campaignSaleMilestones:
      activePhase?.saleMilestones ||
      activeCampaign?.saleMilestones ||
      `W1 (01–07/${monthNum}): warm-up. W2 (08–14/${monthNum}): Sale Đôi ${monthNum}.${monthNum}. W3 (15–21/${monthNum}): FAQ/review. W4 (22–28/${monthNum}): sale cuối tháng + Payday. W5 (29–30/${monthNum}): kéo dài nội dung mua lại/recap theo CTKM đã duyệt.`,
    keyMessageAndCta:
      activeCampaign?.keyMessage ||
      `Công nghệ & thành phần chủ đạo theo brief Brand đã duyệt. CTA: Ưu đãi tháng ${monthNum}, xem giá và điều kiện trước khi chốt đơn; không dùng claim quá mức khi chưa có căn cứ.`,
  };

  // Section 03: Key Visual
  const keyVisual = {
    theme:
      activeCampaign?.keyVisualSpec?.theme ||
      brandPlan?.keyVisualSisPlan.designTheme ||
      (isPhCare ? 'Feminine Editorial Scrapbook' : `Clean Editorial & Hero Product Cut-out ${cleanBrand}`),
    fonts: activeCampaign?.keyVisualSpec?.fonts || 'Museo, Magnolia Script, Neutraface Text',
    moodboard:
      activeCampaign?.keyVisualSpec?.moodboard ||
      (isPhCare
        ? 'Feminine Editorial Scrapbook: trắng/kem, hồng và xanh lá pH Care; chai Natural hero cut-out, Delicate/Cooling phụ theo hàng thực tế. Lifestyle phụ nữ trưởng thành; USP đặt trên giấy xé/label.'
        : `Tone màu chuẩn nhận diện ${cleanBrand}, sản phẩm Hero cut-out rõ nét, nhãn USP đặt nổi bật, bố cục thoáng cho cả 2 sàn TikTok Shop & Shopee.`),
    proposalUrl:
      activeCampaign?.keyVisualSpec?.proposalUrl ||
      'https://www.canva.com/design/DAHUH0fjPbo/ZFDjboVvuFLmGk18oeJW0w/edit',
    promoTextOnKv:
      activeCampaign?.keyVisualSpec?.promoTextOnKv ||
      `Đơn lẻ -10%; combo 2 -15%; voucher tối đa 30.000đ từ 199.000đ. Đồng bộ offer với mục 01; chỉ in quà tặng sau khi Brand xác nhận tồn kho.`,
    hangDate:
      activeCampaign?.keyVisualSpec?.hangDate ||
      `Treo master 01/${monthNum}/${yearNum}; draft 25 tháng trước, duyệt 28 tháng trước. Adapt Sale Đôi ${monthNum}.${monthNum}: treo 10/${monthNum}. Adapt Cuối tháng: treo 26/${monthNum}.`,
    orderDate:
      activeCampaign?.keyVisualSpec?.orderDate ||
      `Order master 22 tháng trước (10 ngày trước treo). Order adapt ${monthNum}.${monthNum}: 01/${monthNum}; Cuối tháng: 17/${monthNum}.`,
    refDate:
      activeCampaign?.keyVisualSpec?.refDate ||
      `Ref master 13 tháng trước (9 ngày trước order). Dùng proposal hiện có, bổ sung packshot SKU đúng.`,
    kvPic,
  };

  // Section 04: 5 tuần TikTok KOC & Booking
  const weekRanges = [
    { week: 'W1' as const, range: `01–07/${monthNum}` },
    { week: 'W2' as const, range: `08–14/${monthNum}` },
    { week: 'W3' as const, range: `15–21/${monthNum}` },
    { week: 'W4' as const, range: `22–28/${monthNum}` },
    { week: 'W5' as const, range: `29–30/${monthNum}` },
  ];

  const split5 = (total: number) => {
    const base = Math.floor(total / 5);
    const rem = total - base * 5;
    return [0, 1, 2, 3, 4].map((idx) => base + (idx < rem ? 1 : 0));
  };

  const tapW = split5(tapTotal);
  const kl1W = split5(kl1Total);
  const kl2W = split5(kl2Total);
  const kl3W = split5(kl3Total);
  const kl4W = split5(kl4Total);
  const kl5W = split5(kl5Total);
  const kl6W = split5(kl6Total);
  const kl7W = split5(kl7Total);

  const kl1BW = split5(kl1BudgetTotal);
  const kl2BW = split5(kl2BudgetTotal);
  const kl3BW = split5(kl3BudgetTotal);
  const kl4BW = split5(kl4BudgetTotal);
  const kl5BW = split5(kl5BudgetTotal);
  const kl6BW = split5(kl6BudgetTotal);
  const kl7BW = split5(kl7BudgetTotal);

  const tiktokWeeklyRows: BrandOneSheetTikTokWeeklyRow[] = weekRanges.map((w, idx) => {
    const weekVideos =
      tapW[idx] + kl1W[idx] + kl2W[idx] + kl3W[idx] + kl4W[idx] + kl5W[idx] + kl6W[idx] + kl7W[idx];
    const weekBudget =
      kl1BW[idx] + kl2BW[idx] + kl3BW[idx] + kl4BW[idx] + kl5BW[idx] + kl6BW[idx] + kl7BW[idx];
    return {
      week: w.week,
      dateRange: w.range,
      tapCount: tapW[idx],
      kl1Count: kl1W[idx],
      kl2Count: kl2W[idx],
      kl3Count: kl3W[idx],
      kl4Count: kl4W[idx],
      kl5Count: kl5W[idx],
      kl6Count: kl6W[idx],
      kl7Count: kl7W[idx],
      tapBudget: 0,
      kl1Budget: kl1BW[idx],
      kl2Budget: kl2BW[idx],
      kl3Budget: kl3BW[idx],
      kl4Budget: kl4BW[idx],
      kl5Budget: kl5BW[idx],
      kl6Budget: kl6BW[idx],
      kl7Budget: kl7BW[idx],
      targetBookingGmv: weekBudget > 0 ? weekBudget * 10 : 200000000,
      ownerActionNote: `Booking + BM: review view/click/đơn; điều chỉnh angle ${w.week} (${weekVideos} video)`,
    };
  });

  // Section 04: Chi tiết Content TikTok (5 dòng Video affiliate + 5 dòng Video self / Ảnh trượt)
  const tiktokContentRows: BrandOneSheetTikTokContentRow[] = [
    {
      id: 'tt-cnt-1',
      weekAndAirDate: `W1 | 01–07/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU / Combo 2`,
      touchpointSource: 'Video affiliate',
      klGroup: 'Mix KL / TAP',
      kocCriteria: `Nữ beauty/lifestyle 22–35; đã trải nghiệm; mix TAP${tapW[0]}, KL2×${kl2W[0]}, KL5×${kl5W[0]}, KL6×${kl6W[0]}`,
      pillar: 'Product education: hiểu SKU/RTB',
      angleAndBrief: 'Trước khi mua: đọc nhãn và chọn routine phù hợp; tránh nói quá claim.',
      contentType: 'Video',
      qty: tiktokWeeklyRows[0].tapCount + tiktokWeeklyRows[0].kl1Count + tiktokWeeklyRows[0].kl2Count + tiktokWeeklyRows[0].kl3Count + tiktokWeeklyRows[0].kl4Count + tiktokWeeklyRows[0].kl5Count + tiktokWeeklyRows[0].kl6Count + tiktokWeeklyRows[0].kl7Count,
      budgetVnd: 0,
      pic: preparedBy,
    },
    {
      id: 'tt-cnt-2',
      weekAndAirDate: `W2 | 08–14/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural + Delicate/Cooling (tùy tồn)' : `${cleanBrand} Combo Sale Đôi ${monthNum}.${monthNum}`,
      touchpointSource: 'Video affiliate',
      klGroup: 'Mix KL / TAP',
      kocCriteria: `Nữ beauty/lifestyle 22–35; đã trải nghiệm; mix TAP${tapW[1]}, KL2×${kl2W[1]}, KL5×${kl5W[1]}, KL6×${kl6W[1]}`,
      pillar: 'Promotion: hiểu deal & combo',
      angleAndBrief: 'Đọc deal combo 2 sản phẩm: giá, voucher và điều kiện áp dụng thật rõ.',
      contentType: 'Video',
      qty: tiktokWeeklyRows[1].tapCount + tiktokWeeklyRows[1].kl1Count + tiktokWeeklyRows[1].kl2Count + tiktokWeeklyRows[1].kl3Count + tiktokWeeklyRows[1].kl4Count + tiktokWeeklyRows[1].kl5Count + tiktokWeeklyRows[1].kl6Count + tiktokWeeklyRows[1].kl7Count,
      budgetVnd: 0,
      pic: preparedBy,
    },
    {
      id: 'tt-cnt-3',
      weekAndAirDate: `W3 | 15–21/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural / Delicate (tùy tồn)' : `${cleanBrand} Hero SKU chủ lực`,
      touchpointSource: 'Video affiliate',
      klGroup: 'Mix KL / TAP',
      kocCriteria: `Nữ beauty/lifestyle 22–35; đã trải nghiệm; mix TAP${tapW[2]}, KL2×${kl2W[2]}, KL5×${kl5W[2]}, KL6×${kl6W[2]}`,
      pillar: 'Social proof: trải nghiệm thật',
      angleAndBrief: 'Review trải nghiệm có thật: thao tác dùng/bao bì; không dựng kết quả điều trị.',
      contentType: 'Video',
      qty: tiktokWeeklyRows[2].tapCount + tiktokWeeklyRows[2].kl1Count + tiktokWeeklyRows[2].kl2Count + tiktokWeeklyRows[2].kl3Count + tiktokWeeklyRows[2].kl4Count + tiktokWeeklyRows[2].kl5Count + tiktokWeeklyRows[2].kl6Count + tiktokWeeklyRows[2].kl7Count,
      budgetVnd: 0,
      pic: preparedBy,
    },
    {
      id: 'tt-cnt-4',
      weekAndAirDate: `W4 | 22–28/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural + Cooling (tùy tồn)' : `${cleanBrand} Combo Cuối Tháng`,
      touchpointSource: 'Video affiliate',
      klGroup: 'Mix KL / TAP',
      kocCriteria: `Nữ beauty/lifestyle 22–35; đã trải nghiệm; mix TAP${tapW[3]}, KL2×${kl2W[3]}, KL5×${kl5W[3]}, KL6×${kl6W[3]}`,
      pillar: 'Promotion: chọn mua trong đợt sale',
      angleAndBrief: `Chọn đơn lẻ hay combo, giải thích giá/voucher; nhắc đợt sale cuối tháng 27/${monthNum} theo CTKM đã duyệt.`,
      contentType: 'Video',
      qty: tiktokWeeklyRows[3].tapCount + tiktokWeeklyRows[3].kl1Count + tiktokWeeklyRows[3].kl2Count + tiktokWeeklyRows[3].kl3Count + tiktokWeeklyRows[3].kl4Count + tiktokWeeklyRows[3].kl5Count + tiktokWeeklyRows[3].kl6Count + tiktokWeeklyRows[3].kl7Count,
      budgetVnd: 0,
      pic: preparedBy,
    },
    {
      id: 'tt-cnt-5',
      weekAndAirDate: `W5 | 29–30/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural / combo mua lại' : `${cleanBrand} Combo Mua Lại`,
      touchpointSource: 'Video affiliate',
      klGroup: 'Mix KL / TAP',
      kocCriteria: `Nữ beauty/lifestyle 22–35; đã trải nghiệm; mix TAP${tapW[4]}, KL2×${kl2W[4]}, KL5×${kl5W[4]}, KL6×${kl6W[4]}`,
      pillar: 'Usage: chọn mua lại',
      angleAndBrief: 'Routine cuối tháng: nhắc xem thông tin SKU trước khi mua lại.',
      contentType: 'Video',
      qty: tiktokWeeklyRows[4].tapCount + tiktokWeeklyRows[4].kl1Count + tiktokWeeklyRows[4].kl2Count + tiktokWeeklyRows[4].kl3Count + tiktokWeeklyRows[4].kl4Count + tiktokWeeklyRows[4].kl5Count + tiktokWeeklyRows[4].kl6Count + tiktokWeeklyRows[4].kl7Count,
      budgetVnd: 0,
      pic: preparedBy,
    },
    // 5 dòng Video self / Ảnh trượt
    {
      id: 'tt-cnt-6',
      weekAndAirDate: `W1 | 01–07/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU`,
      touchpointSource: 'Video self',
      klGroup: 'Không áp dụng',
      kocCriteria: 'Không dùng KOC; Content + VJ nội bộ',
      pillar: 'Problem / tình huống',
      angleAndBrief: 'Carousel 4 bài: đọc nhãn sản phẩm, chọn SKU theo nhu cầu và FAQ. Mỗi bài 4–6 slide; theo hướng dẫn nhãn.',
      contentType: 'Ảnh trượt',
      qty: 4,
      budgetVnd: 4000000,
      pic: preparedBy,
    },
    {
      id: 'tt-cnt-7',
      weekAndAirDate: `W2 | 08–14/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural + Delicate/Cooling (tùy tồn)' : `${cleanBrand} Combo Sale Đôi`,
      touchpointSource: 'Video self',
      klGroup: 'Không áp dụng',
      kocCriteria: 'Không dùng KOC; Content + VJ nội bộ',
      pillar: 'Promotion',
      angleAndBrief: `Carousel 4 bài: giải thích giá đơn lẻ/combo, điều kiện voucher ${monthNum}.${monthNum}; 4–6 slide/bài.`,
      contentType: 'Ảnh trượt',
      qty: 4,
      budgetVnd: 4000000,
      pic: contentMainPic,
    },
    {
      id: 'tt-cnt-8',
      weekAndAirDate: `W3 | 15–21/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural / Delicate (tùy tồn)' : `${cleanBrand} Hero SKU`,
      touchpointSource: 'Video self',
      klGroup: 'Không áp dụng',
      kocCriteria: 'Không dùng KOC; Content + VJ nội bộ',
      pillar: 'Product education',
      angleAndBrief: 'Carousel 4 bài FAQ chăm sóc hằng ngày; giới thiệu phân loại SKU theo tồn kho; không nêu claim chưa duyệt.',
      contentType: 'Ảnh trượt',
      qty: 4,
      budgetVnd: 4000000,
      pic: contentMainPic,
    },
    {
      id: 'tt-cnt-9',
      weekAndAirDate: `W4 | 22–28/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural + Cooling (tùy tồn)' : `${cleanBrand} Combo Cuối Tháng`,
      touchpointSource: 'Video self',
      klGroup: 'Không áp dụng',
      kocCriteria: 'Không dùng KOC; Content + VJ nội bộ',
      pillar: 'Usage / routine',
      angleAndBrief: `Carousel 4 bài: routine khi bận + checklist mua hàng 27/${monthNum}; giá/điều kiện đúng CTKM.`,
      contentType: 'Ảnh trượt',
      qty: 4,
      budgetVnd: 4000000,
      pic: contentMainPic,
    },
    {
      id: 'tt-cnt-10',
      weekAndAirDate: `W5 | 29–30/${monthNum}`,
      skuOrCombo: isPhCare ? 'Natural / combo mua lại' : `${cleanBrand} Combo Mua Lại`,
      touchpointSource: 'Video self',
      klGroup: 'Không áp dụng',
      kocCriteria: 'Không dùng KOC; Content + VJ nội bộ',
      pillar: 'Usage / mua lại',
      angleAndBrief: 'Carousel 4 bài: recap cách chọn SKU/mua lại; 4–6 slide/bài, không tạo khan hiếm giả.',
      contentType: 'Ảnh trượt',
      qty: 4,
      budgetVnd: 4000000,
      pic: contentMainPic,
    },
  ];

  // Section 05: 5 Chiến lược Pillar P01 -> P05
  const contentPillars: BrandOneSheetPillarRow[] = [
    {
      pillarId: 'P01',
      pillarName: 'Problem / tình huống',
      behaviorObjective: 'Nhận biết nhu cầu chăm sóc',
      insightAndBarrier: 'Ngại hỏi trực tiếp về routine',
      messageAndRtb: 'Chăm sóc cá nhân kín đáo, dễ hiểu',
      priorityAngle: 'FAQ từ tình huống đời sống',
      suitableFormat: 'FAQ / POV',
      videoWeightRatio: 0.2,
      monthlyVideoCount: 6,
    },
    {
      pillarId: 'P02',
      pillarName: 'Product education',
      behaviorObjective: 'Hiểu nhãn và cách dùng',
      insightAndBarrier: 'Chưa rõ cách dùng/sản phẩm',
      messageAndRtb: 'Hướng dẫn theo nhãn đã duyệt',
      priorityAngle: 'Demo thao tác, đọc nhãn',
      suitableFormat: 'Demo / tutorial',
      videoWeightRatio: 0.2,
      monthlyVideoCount: 6,
    },
    {
      pillarId: 'P03',
      pillarName: 'Social proof',
      behaviorObjective: 'Tin từ trải nghiệm thật',
      insightAndBarrier: 'Chưa biết có phù hợp mình',
      messageAndRtb: 'Review từ người đã trải nghiệm',
      priorityAngle: 'Unbox/texture/bao bì; không giả kết quả',
      suitableFormat: 'Review / unbox',
      videoWeightRatio: 0.2,
      monthlyVideoCount: 6,
    },
    {
      pillarId: 'P04',
      pillarName: 'Promotion',
      behaviorObjective: 'Hiểu offer và mua',
      insightAndBarrier: 'Ngại điều kiện voucher phức tạp',
      messageAndRtb: 'Giá + điều kiện ưu đãi rõ',
      priorityAngle: 'Chai đơn vs combo; đọc điều kiện',
      suitableFormat: 'Deal explainer',
      videoWeightRatio: 0.2,
      monthlyVideoCount: 6,
    },
    {
      pillarId: 'P05',
      pillarName: 'Usage / mua lại',
      behaviorObjective: 'Nhớ routine và chọn mua lại',
      insightAndBarrier: 'Mua về nhưng dùng thiếu đều',
      messageAndRtb: 'Routine cá nhân hợp nhu cầu',
      priorityAngle: 'Checklist lựa chọn/mua lại',
      suitableFormat: 'Routine / checklist',
      videoWeightRatio: 0.2,
      monthlyVideoCount: 6,
    },
  ];

  // Section 05: Target tuần Content Shopee (W1 -> W5)
  const shopeeWeeklyTargets: BrandOneSheetShopeeWeeklyTarget[] = weekRanges.map((w) => ({
    week: w.week,
    airDateRange: w.range,
    plannedVideos: 6,
    contentBudget: 4000000,
    targetViews: 120000,
    targetVideoGmv: 60000000,
    ownerAction: `Content Shopee: 6 video; test hook/CTA ${w.week}`,
  }));

  // Section 05: Lịch sản xuất & air Content Shopee (10 dòng W1 -> W5)
  const kvCode = `KV${monthNum}-${cleanBrand.slice(0, 2).toUpperCase()}`;
  const shopeeContentRows: BrandOneSheetShopeeContentRow[] = [
    {
      id: 'sp-cnt-1',
      week: 'W1',
      skuOrCombo: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU / Combo 2`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `03/${monthNum}/${yearNum}`,
      behaviorObjective: 'Awareness',
      pillarId: 'P01',
      angleAndBrief: '3 điều cần đọc trên nhãn trước khi chọn sản phẩm',
      format: 'FAQ',
      productionMethod: 'VJ',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-2',
      week: 'W1',
      skuOrCombo: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU / Combo 2`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `06/${monthNum}/${yearNum}`,
      behaviorObjective: 'Consideration',
      pillarId: 'P02',
      angleAndBrief: 'Routine ở nhà: đọc hướng dẫn và chọn thao tác phù hợp',
      format: 'Demo',
      productionMethod: 'Remix',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-3',
      week: 'W2',
      skuOrCombo: isPhCare ? 'Natural + Delicate/Cooling (tùy tồn)' : `${cleanBrand} Combo Sale Đôi`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `10/${monthNum}/${yearNum}`,
      behaviorObjective: 'Consideration',
      pillarId: 'P03',
      angleAndBrief: 'Review từ người đã dùng: đọc nhãn, bao bì và cảm nhận thật; không dựng kết quả.',
      format: 'Review / unbox',
      productionMethod: 'VJ',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-4',
      week: 'W2',
      skuOrCombo: isPhCare ? 'Natural + Delicate/Cooling (tùy tồn)' : `${cleanBrand} Combo Sale Đôi`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `12/${monthNum}/${yearNum}`,
      behaviorObjective: 'Conversion',
      pillarId: 'P04',
      angleAndBrief: `Chai đơn hay combo: giải thích giá/voucher và điều kiện đợt ${monthNum}.${monthNum}.`,
      format: 'Deal explainer',
      productionMethod: 'Remix',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-5',
      week: 'W3',
      skuOrCombo: isPhCare ? 'Natural / Delicate (tùy tồn)' : `${cleanBrand} Hero SKU`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `16/${monthNum}/${yearNum}`,
      behaviorObjective: 'Loyalty',
      pillarId: 'P05',
      angleAndBrief: 'Checklist routine cá nhân cuối ngày; CTA xem hướng dẫn và lựa chọn SKU.',
      format: 'Routine',
      productionMethod: 'VJ',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-6',
      week: 'W3',
      skuOrCombo: isPhCare ? 'Natural / Delicate (tùy tồn)' : `${cleanBrand} Hero SKU`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `19/${monthNum}/${yearNum}`,
      behaviorObjective: 'Awareness',
      pillarId: 'P01',
      angleAndBrief: 'FAQ ngại hỏi: 3 điều nên đọc trên nhãn trước khi chọn sản phẩm.',
      format: 'FAQ',
      productionMethod: 'Remix',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-7',
      week: 'W4',
      skuOrCombo: isPhCare ? 'Natural + Cooling (tùy tồn)' : `${cleanBrand} Combo Cuối Tháng`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `24/${monthNum}/${yearNum}`,
      behaviorObjective: 'Consideration',
      pillarId: 'P02',
      angleAndBrief: 'Demo dùng theo nhãn; quay cận thao tác.',
      format: 'Demo',
      productionMethod: 'VJ',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-8',
      week: 'W4',
      skuOrCombo: isPhCare ? 'Natural + Cooling (tùy tồn)' : `${cleanBrand} Combo Cuối Tháng`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `27/${monthNum}/${yearNum}`,
      behaviorObjective: 'Consideration',
      pillarId: 'P03',
      angleAndBrief: `Unbox/review cảm nhận thật, source có quyền sử dụng. Kết thúc CTA xem deal 27/${monthNum}.`,
      format: 'Review / unbox',
      productionMethod: 'Remix',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-9',
      week: 'W5',
      skuOrCombo: isPhCare ? 'Natural / combo mua lại' : `${cleanBrand} Combo Mua Lại`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `29/${monthNum}/${yearNum}`,
      behaviorObjective: 'Conversion',
      pillarId: 'P04',
      angleAndBrief: 'Deal cuối tháng: giá, điều kiện, thời hạn; không tạo khan hiếm giả.',
      format: 'Deal explainer',
      productionMethod: 'VJ',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
    {
      id: 'sp-cnt-10',
      week: 'W5',
      skuOrCombo: isPhCare ? 'Natural / combo mua lại' : `${cleanBrand} Combo Mua Lại`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `30/${monthNum}/${yearNum}`,
      behaviorObjective: 'Loyalty',
      pillarId: 'P05',
      angleAndBrief: 'Recap routine và cách chọn mua lại theo nhu cầu; không cam kết điều trị.',
      format: 'Routine',
      productionMethod: 'Remix',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; ${kvCode}; final chưa tạo`,
    },
  ];

  return {
    brandName: cleanBrand,
    month,
    preparedBy,
    statusAndCutoffNote: `Chốt kế hoạch: 13/${monthNum}/${yearNum} | Trạng thái: ${
      brandPlan?.status === 'APPROVED' || brandPlan?.status === 'IN_EXECUTION'
        ? 'Đã phê duyệt'
        : 'Đang rà soát trình Brand'
    }`,
    hasCampaign,
    campaignId: activeCampaign?.id,
    campaignCode: activeCampaign?.code,
    campaignTitle: activeCampaign?.title,
    campaignPhaseName: activePhase?.phaseName || (hasCampaign ? `Giai đoạn ${month}` : undefined),
    orientation,
    shopeeKpi: {
      gmvSeller: shopeeGmvSeller,
      nmvSeller: shopeeNmvSeller,
      orders: shopeeOrders,
      traffic: shopeeTraffic,
      conversionRate: shopeeCr,
      aov: shopeeAov,
      cancellationRate: shopeeCancelRate,
      gmvVideo: shopeeGmvVideo,
      gmvLivestream: shopeeGmvLive,
      gmvProductCard: shopeeGmvCard,
      costBookingVideoAff: 0,
      costVideoSelfChannel: 20000000,
      costAds: 100000000,
      costBookingLiveAff: 0,
      costLiveSelfChannel: 30000000,
      costDisplayPackage: 10000000,
      costOtherNet: 5000000,
      costAffiliateCommission: 10000000,
      costAffiliateAdsCommission: 5000000,
    },
    tiktokKpi: {
      gmvSeller: tiktokGmvSeller,
      nmvSeller: tiktokNmvSeller,
      orders: tiktokOrders,
      traffic: tiktokTraffic,
      conversionRate: tiktokCr,
      aov: tiktokAov,
      cancellationRate: tiktokCancelRate,
      gmvVideo: tiktokGmvVideo,
      gmvLivestream: tiktokGmvLive,
      gmvProductCard: tiktokGmvCard,
      costBookingVideoAff: totalBookingVideoBudget,
      costVideoSelfChannel: 20000000,
      costAds: isPhCare ? 500000000 : tiktokPlan?.budgetAdsTotal || 500000000,
      costBookingLiveAff: 0,
      costLiveSelfChannel: 100000000,
      costDisplayPackage: 0,
      costOtherNet: 10000000,
      costAffiliateCommission: 175000000,
      costAffiliateAdsCommission: 25000000,
    },
    kpiBalanceNote:
      'Lưu ý: GMV thẻ sản phẩm đang là phần cân đối = GMV nhà bán − GMV video − GMV live; Growth xác nhận cơ cấu nguồn trước duyệt. Ngân sách Marketing thúc đẩy (-VAT) chưa gồm chi phí hoa hồng tiếp thị liên kết ghi nhận chung với phí sàn.',
    keyVisual,
    tiktokOverviewExtra: {
      selfRevenueTarget: 400000000,
      selfContentCount: 20,
      selfCostNet: 20000000,
      affRevenueTarget: 1000000000,
      awarenessVideoTagCount: 20,
      brandingVideoTagCount: 10,
      liveSelfOrders: 2500,
      liveSelfSessions2h: 50,
      liveAffOrders: 0,
      liveAffSessions: 0,
    },
    tiktokWeeklyRows,
    tiktokContentRows,
    contentPillars,
    shopeeWeeklyTargets,
    shopeeContentRows,
  };
}
