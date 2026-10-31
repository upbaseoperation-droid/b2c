import { InputPlanRowItem, InputPlanBreakdownState } from './types';

export const BENCHMARK_COSTS: Record<string, number> = {
  'TAP UpAffiliate': 0,
  'KL1': 250000,      // < 500k (FOC / Sample / Thù lao tượng trưng)
  'KL2': 1000000,     // 500k - 1.5M (Micro-)
  'KL3': 2500000,     // 1.5M - 3M (Micro)
  'KL4': 4500000,     // 3M - 5M (Mid-Macro)
  'KL5': 8500000,     // 5M - 10M (Macro)
  'KL6': 22000000,    // 10M - 30M (Celeb / Key KOL)
  'KL7': 55000000,    // > 30M (Top Celeb / Mega / Brand Ambassador)
  'Shopee_Reup': 50000,
  'Shopee_Affiliate': 1200000,
  'Facebook_Reup': 50000,
  'Facebook_Affiliate': 900000,
  'Instagram_Reup': 60000,
  'Instagram_Affiliate': 800000,
  'Threads_Reup': 30000,
  'Threads_Affiliate': 150000,
  'Review voice': 250000,
  'Nhạc text': 120000,
  'Video remix': 150000,
  'Video AI': 80000,
  'POV': 350000,
  'Độc quyền': 10000000,
  'Add in': 3500000,
  'Daily': 1200000
};

export const CONTENT_FORMAT_OPTIONS = [
  'Review trực tiếp (Direct Review / Swatch)',
  'Nỗi đau - Giải pháp (Pain Point & Solution)',
  'Unboxing / Đập hộp & Trải nghiệm thực tế',
  'Daily Vlog / Tích hợp phong cách sống',
  'FOMO / Siêu Deal Hàng Mới / Giờ Vàng',
  'Educate / Lời khuyên Chuyên gia - Bác sĩ',
  'Review voice (Thu âm giọng đọc thật)',
  'Nhạc text (CapCut trending + Text động)',
  'Video remix (Cắt highlight / Tái biên tập)',
  'Video giọng máy (kịch bản mẫu)',
  'POV (Tình huống kịch bản / Bắt trend)',
  'Livestream Độc quyền (Dedicated Live)',
  'Livestream Add-in (Co-host Mega Live)',
  'Livestream Daily (Ca live thường nhật)'
];

export const INITIAL_INPUT_PLAN_ITEMS: InputPlanRowItem[] = [
  // --- KÊNH 1: TIKTOK SHOP (KOC/KOL AFFILIATE) ---
  {
    id: 'row-tt-tap',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'TAP UpAffiliate',
    tierLabel: 'TAP UpAffiliate (Mạng lưới tự do)',
    salaryGrade: 'TAP UpAffiliate',
    contentFormat: 'Review trực tiếp (Direct Review / Swatch)',
    qty: 6,
    unitCost: 0,
    benchmarkCost: 0,
    totalBudget: 0,
    expectedRoiMultiplier: 6.5,
    targetGmv: 15000000,
    notes: 'Hoa hồng affiliate thuần, chỉ gửi sample'
  },
  {
    id: 'row-tt-kl1',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL1',
    tierLabel: 'KL1: Nano / FOC (< 500k)',
    salaryGrade: 'KL1',
    contentFormat: 'Unboxing / Đập hộp & Trải nghiệm thực tế',
    qty: 12,
    unitCost: 250000,
    benchmarkCost: 250000,
    totalBudget: 3000000,
    expectedRoiMultiplier: 7.2,
    targetGmv: 21600000,
    notes: 'Bậc có ROI cao nhất Upbase (hoàn vốn nhanh)'
  },
  {
    id: 'row-tt-kl2',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL2',
    tierLabel: 'KL2: Micro- (500k - 1.5M)',
    salaryGrade: 'KL2',
    contentFormat: 'Review trực tiếp (Direct Review / Swatch)',
    qty: 8,
    unitCost: 1000000,
    benchmarkCost: 1000000,
    totalBudget: 8000000,
    expectedRoiMultiplier: 6.8,
    targetGmv: 54400000,
    notes: 'Phủ số lượng & đánh giá chân thực'
  },
  {
    id: 'row-tt-kl3',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL3',
    tierLabel: 'KL3: Micro (1.5M - 3M)',
    salaryGrade: 'KL3',
    contentFormat: 'Nỗi đau - Giải pháp (Pain Point & Solution)',
    qty: 6,
    unitCost: 2500000,
    benchmarkCost: 2500000,
    totalBudget: 15000000,
    expectedRoiMultiplier: 6.2,
    targetGmv: 93000000,
    notes: 'Trụ cột chuyển đổi chính'
  },
  {
    id: 'row-tt-kl4',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL4',
    tierLabel: 'KL4: Mid-Macro (3M - 5M)',
    salaryGrade: 'KL4',
    contentFormat: 'Daily Vlog / Tích hợp phong cách sống',
    qty: 4,
    unitCost: 4500000,
    benchmarkCost: 4500000,
    totalBudget: 18000000,
    expectedRoiMultiplier: 5.5,
    targetGmv: 99000000,
    notes: 'Tạo độ uy tín và lan tỏa'
  },
  {
    id: 'row-tt-kl5',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL5',
    tierLabel: 'KL5: Macro (5M - 10M)',
    salaryGrade: 'KL5',
    contentFormat: 'Educate / Lời khuyên Chuyên gia - Bác sĩ',
    qty: 2,
    unitCost: 8500000,
    benchmarkCost: 8500000,
    totalBudget: 17000000,
    expectedRoiMultiplier: 5.0,
    targetGmv: 85000000,
    notes: 'Key Opinion Leader dẫn dắt phễu'
  },
  {
    id: 'row-tt-kl6',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL6',
    tierLabel: 'KL6: Celeb / Key KOL (10M - 30M)',
    salaryGrade: 'KL6',
    contentFormat: 'FOMO / Siêu Deal Hàng Mới / Giờ Vàng',
    qty: 1,
    unitCost: 22000000,
    benchmarkCost: 22000000,
    totalBudget: 22000000,
    expectedRoiMultiplier: 4.8,
    targetGmv: 105600000,
    notes: 'Gương mặt tạo tiếng vang lớn'
  },
  {
    id: 'row-tt-kl7',
    channel: 'TIKTOK',
    platform: 'TikTok',
    category: 'KOC_TIER',
    tierCode: 'KL7',
    tierLabel: 'KL7: Top Celeb / Ambassador (> 30M)',
    salaryGrade: 'KL7',
    contentFormat: 'FOMO / Siêu Deal Hàng Mới / Giờ Vàng',
    qty: 0,
    unitCost: 55000000,
    benchmarkCost: 55000000,
    totalBudget: 0,
    expectedRoiMultiplier: 4.0,
    targetGmv: 0,
    notes: 'Dành riêng cho Brand Mega Launch'
  },

  // --- KÊNH ĐA SÀN: SHOPEE ---
  {
    id: 'row-shopee-reup',
    channel: 'SHOPEE',
    platform: 'Shopee',
    category: 'PLATFORM_FORMAT',
    tierCode: 'Reup',
    tierLabel: 'Shopee Reup (Biên tập từ TikTok)',
    contentFormat: 'Video remix (Cắt highlight / Tái biên tập)',
    qty: 6,
    unitCost: 50000,
    benchmarkCost: 50000,
    totalBudget: 300000,
    expectedRoiMultiplier: 8.0,
    targetGmv: 2400000,
    notes: 'Tối ưu traffic tự nhiên trên Shopee Video'
  },
  {
    id: 'row-shopee-aff',
    channel: 'SHOPEE',
    platform: 'Shopee',
    category: 'PLATFORM_FORMAT',
    tierCode: 'Affiliate',
    tierLabel: 'Shopee Affiliate (Creator sàn cam)',
    contentFormat: 'Review trực tiếp (Direct Review / Swatch)',
    qty: 4,
    unitCost: 1200000,
    benchmarkCost: 1200000,
    totalBudget: 4800000,
    expectedRoiMultiplier: 5.8,
    targetGmv: 27840000,
    notes: 'Khai thác người mua có intent cao'
  },

  // --- KÊNH ĐA NỀN TẢNG: FACEBOOK & INSTAGRAM ---
  {
    id: 'row-fb-reup',
    channel: 'FACEBOOK',
    platform: 'Facebook',
    category: 'PLATFORM_FORMAT',
    tierCode: 'Reup',
    tierLabel: 'Facebook Reels Reup',
    contentFormat: 'Video remix (Cắt highlight / Tái biên tập)',
    qty: 5,
    unitCost: 50000,
    benchmarkCost: 50000,
    totalBudget: 250000,
    expectedRoiMultiplier: 6.0,
    targetGmv: 1500000,
    notes: 'Kéo traffic ngoại sàn'
  },
  {
    id: 'row-fb-aff',
    channel: 'FACEBOOK',
    platform: 'Facebook',
    category: 'PLATFORM_FORMAT',
    tierCode: 'Affiliate',
    tierLabel: 'Facebook Post & Group Review',
    contentFormat: 'Review trực tiếp (Direct Review / Swatch)',
    qty: 2,
    unitCost: 900000,
    benchmarkCost: 900000,
    totalBudget: 1800000,
    expectedRoiMultiplier: 5.2,
    targetGmv: 9360000,
    notes: 'Gắn link affiliate bio'
  },
  {
    id: 'row-ig-aff',
    channel: 'INSTAGRAM',
    platform: 'Instagram',
    category: 'PLATFORM_FORMAT',
    tierCode: 'Affiliate',
    tierLabel: 'Instagram Reels & Story Tag',
    contentFormat: 'Daily Vlog / Tích hợp phong cách sống',
    qty: 2,
    unitCost: 800000,
    benchmarkCost: 800000,
    totalBudget: 1600000,
    expectedRoiMultiplier: 4.8,
    targetGmv: 7680000,
    notes: 'Thẩm mỹ cao, phù hợp mỹ phẩm/chăm sóc da'
  },
  {
    id: 'row-threads-aff',
    channel: 'THREADS',
    platform: 'Threads',
    category: 'PLATFORM_FORMAT',
    tierCode: 'Affiliate',
    tierLabel: 'Threads Bài Viết Seeding Review',
    contentFormat: 'Nỗi đau - Giải pháp (Pain Point & Solution)',
    qty: 3,
    unitCost: 150000,
    benchmarkCost: 150000,
    totalBudget: 450000,
    expectedRoiMultiplier: 7.0,
    targetGmv: 3150000,
    notes: 'Viral thảo luận text + ảnh chân thật'
  },

  // --- KÊNH TỰ XÂY (OWNED BRAND CHANNELS - CHUẨN 4.1.1) ---
  {
    id: 'row-self-voice',
    channel: 'SELF_CHANNEL',
    platform: 'Kênh Tự Xây',
    category: 'SELF_CHANNEL',
    tierCode: 'Review voice',
    tierLabel: 'Review voice (Thu âm giọng đọc thật)',
    contentFormat: 'Review voice (Thu âm giọng đọc thật)',
    qty: 3,
    unitCost: 250000,
    benchmarkCost: 250000,
    totalBudget: 750000,
    expectedRoiMultiplier: 6.5,
    targetGmv: 4875000,
    notes: 'Video inhouse nhân viên hoặc CTV thu voice'
  },
  {
    id: 'row-self-music',
    channel: 'SELF_CHANNEL',
    platform: 'Kênh Tự Xây',
    category: 'SELF_CHANNEL',
    tierCode: 'Nhạc text',
    tierLabel: 'Nhạc text (CapCut trending + Text)',
    contentFormat: 'Nhạc text (CapCut trending + Text động)',
    qty: 4,
    unitCost: 120000,
    benchmarkCost: 120000,
    totalBudget: 480000,
    expectedRoiMultiplier: 5.5,
    targetGmv: 2640000,
    notes: 'Sản xuất tốc độ cao'
  },
  {
    id: 'row-self-remix',
    channel: 'SELF_CHANNEL',
    platform: 'Kênh Tự Xây',
    category: 'SELF_CHANNEL',
    tierCode: 'Video remix',
    tierLabel: 'Video remix (Cắt ghép highlight)',
    contentFormat: 'Video remix (Cắt highlight / Tái biên tập)',
    qty: 3,
    unitCost: 150000,
    benchmarkCost: 150000,
    totalBudget: 450000,
    expectedRoiMultiplier: 6.0,
    targetGmv: 2700000,
    notes: 'Tận dụng footage cũ đạt view cao'
  },
  {
    id: 'row-self-ai',
    channel: 'SELF_CHANNEL',
    platform: 'Kênh Tự Xây',
    category: 'SELF_CHANNEL',
    tierCode: 'Video AI',
    tierLabel: 'Video giọng máy (kịch bản mẫu)',
    contentFormat: 'Video giọng máy (kịch bản mẫu)',
    qty: 2,
    unitCost: 80000,
    benchmarkCost: 80000,
    totalBudget: 160000,
    expectedRoiMultiplier: 5.0,
    targetGmv: 800000,
    notes: 'Chi phí cực thấp'
  },
  {
    id: 'row-self-pov',
    channel: 'SELF_CHANNEL',
    platform: 'Kênh Tự Xây',
    category: 'SELF_CHANNEL',
    tierCode: 'POV',
    tierLabel: 'POV (Tình huống kịch bản ngắn)',
    contentFormat: 'POV (Tình huống kịch bản / Bắt trend)',
    qty: 1,
    unitCost: 350000,
    benchmarkCost: 350000,
    totalBudget: 350000,
    expectedRoiMultiplier: 6.0,
    targetGmv: 2100000,
    notes: 'Dễ ăn đề xuất FYP'
  },

  // --- KÊNH LIVESTREAM (AFFILIATE & HOST - CHUẨN 4.1.1) ---
  {
    id: 'row-live-exclusive',
    channel: 'LIVESTREAM',
    platform: 'Livestream',
    category: 'LIVESTREAM',
    tierCode: 'Độc quyền',
    tierLabel: 'Phiên Độc Quyền (Dedicated Brand Live)',
    contentFormat: 'Livestream Độc quyền (Dedicated Live)',
    qty: 1,
    unitCost: 10000000,
    benchmarkCost: 10000000,
    totalBudget: 10000000,
    expectedRoiMultiplier: 6.5,
    targetGmv: 65000000,
    notes: 'Ca live độc quyền nhãn hàng với deal sốc'
  },
  {
    id: 'row-live-addin',
    channel: 'LIVESTREAM',
    platform: 'Livestream',
    category: 'LIVESTREAM',
    tierCode: 'Add in',
    tierLabel: 'Phiên Add-in (Chèn giỏ hàng Mega Live)',
    contentFormat: 'Livestream Add-in (Co-host Mega Live)',
    qty: 2,
    unitCost: 3500000,
    benchmarkCost: 3500000,
    totalBudget: 7000000,
    expectedRoiMultiplier: 5.8,
    targetGmv: 40600000,
    notes: 'Chèn 3-5 SKU vào phiên live của KOL lớn'
  },
  {
    id: 'row-live-daily',
    channel: 'LIVESTREAM',
    platform: 'Livestream',
    category: 'LIVESTREAM',
    tierCode: 'Daily',
    tierLabel: 'Phiên Daily (Ca live thường nhật)',
    contentFormat: 'Livestream Daily (Ca live thường nhật)',
    qty: 2,
    unitCost: 1200000,
    benchmarkCost: 1200000,
    totalBudget: 2400000,
    expectedRoiMultiplier: 4.5,
    targetGmv: 10800000,
    notes: 'Duy trì đều đặn giỏ hàng shop'
  }
];

export const INITIAL_INPUT_PLAN_STATE: InputPlanBreakdownState = {
  id: 'PLAN-INPUT-STUDIO-01',
  title: 'Kế Hoạch Phân Rã B2C Tuần 41 - Đẩy Mạnh Doanh Số E2E',
  brandName: 'Fresh_TikTok_E2E-C',
  month: '2026/10',
  week: 'W41 [05.10 - 11.10]',
  pic: 'Đặng Mai Hà Linh',
  totalTargetBudget: 125000000, // 125M
  totalTargetContents: 68,     // 68 video/phiên
  targetGmv: 750000000,        // 750M
  cancellationRate: 0.08,      // 8%
  strategyPreset: 'CUSTOM',
  notes: 'Tập trung đẩy mạnh phễu chuyển đổi qua KL1-KL3 và khai thác bổ trợ từ Shopee Video + Kênh tự xây',
  items: INITIAL_INPUT_PLAN_ITEMS
};

// THUẬT TOÁN CÂN ĐỐI TỰ ĐỘNG (AUTO-BALANCE)
export function autoBalancePlanItems(
  items: InputPlanRowItem[],
  totalBudget: number,
  totalContents: number,
  preset: 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE' = 'BALANCED'
): InputPlanRowItem[] {
  // Proportions according to strategy
  let targetShares: Record<string, { qtyPct: number; costMultiplier?: number }> = {};

  if (preset === 'GMV_MAX') {
    // Ưu tiên số lượng lớn KL1-KL3 & Shopee
    targetShares = {
      'TAP UpAffiliate': { qtyPct: 0.10 },
      'KL1': { qtyPct: 0.25 },
      'KL2': { qtyPct: 0.18 },
      'KL3': { qtyPct: 0.15 },
      'KL4': { qtyPct: 0.08 },
      'KL5': { qtyPct: 0.03 },
      'KL6': { qtyPct: 0.01 },
      'KL7': { qtyPct: 0.00 },
      'Shopee_Reup': { qtyPct: 0.05 },
      'Shopee_Affiliate': { qtyPct: 0.04 },
      'Facebook_Reup': { qtyPct: 0.02 },
      'Facebook_Affiliate': { qtyPct: 0.01 },
      'Instagram_Affiliate': { qtyPct: 0.01 },
      'Threads_Affiliate': { qtyPct: 0.02 },
      'Review voice': { qtyPct: 0.02 },
      'Nhạc text': { qtyPct: 0.02 },
      'Video remix': { qtyPct: 0.01 },
      'Video AI': { qtyPct: 0.01 },
      'POV': { qtyPct: 0.01 },
      'Add in': { qtyPct: 0.02 },
      'Daily': { qtyPct: 0.01 }
    };
  } else if (preset === 'BRAND_PUSH') {
    // Đẩy KOL lớn KL4-KL6 + Celeb
    targetShares = {
      'TAP UpAffiliate': { qtyPct: 0.05 },
      'KL1': { qtyPct: 0.10 },
      'KL2': { qtyPct: 0.12 },
      'KL3': { qtyPct: 0.15 },
      'KL4': { qtyPct: 0.15 },
      'KL5': { qtyPct: 0.10 },
      'KL6': { qtyPct: 0.05 },
      'KL7': { qtyPct: 0.02 },
      'Shopee_Affiliate': { qtyPct: 0.05 },
      'Instagram_Affiliate': { qtyPct: 0.06 },
      'Review voice': { qtyPct: 0.04 },
      'POV': { qtyPct: 0.03 },
      'Độc quyền': { qtyPct: 0.04 },
      'Add in': { qtyPct: 0.04 }
    };
  } else if (preset === 'COST_SAVER') {
    // Siêu tiết kiệm: FOC + Inhouse + AI
    targetShares = {
      'TAP UpAffiliate': { qtyPct: 0.18 },
      'KL1': { qtyPct: 0.30 },
      'KL2': { qtyPct: 0.12 },
      'KL3': { qtyPct: 0.05 },
      'KL4': { qtyPct: 0.02 },
      'Shopee_Reup': { qtyPct: 0.08 },
      'Facebook_Reup': { qtyPct: 0.05 },
      'Threads_Affiliate': { qtyPct: 0.04 },
      'Nhạc text': { qtyPct: 0.06 },
      'Video remix': { qtyPct: 0.04 },
      'Video AI': { qtyPct: 0.06 }
    };
  } else {
    // Balanced Upbase chuẩn
    targetShares = {
      'TAP UpAffiliate': { qtyPct: 0.08 },
      'KL1': { qtyPct: 0.20 },
      'KL2': { qtyPct: 0.14 },
      'KL3': { qtyPct: 0.12 },
      'KL4': { qtyPct: 0.08 },
      'KL5': { qtyPct: 0.04 },
      'KL6': { qtyPct: 0.015 },
      'KL7': { qtyPct: 0.005 },
      'Shopee_Reup': { qtyPct: 0.06 },
      'Shopee_Affiliate': { qtyPct: 0.05 },
      'Facebook_Reup': { qtyPct: 0.04 },
      'Facebook_Affiliate': { qtyPct: 0.02 },
      'Instagram_Affiliate': { qtyPct: 0.02 },
      'Threads_Affiliate': { qtyPct: 0.03 },
      'Review voice': { qtyPct: 0.03 },
      'Nhạc text': { qtyPct: 0.03 },
      'Video remix': { qtyPct: 0.02 },
      'Video AI': { qtyPct: 0.02 },
      'POV': { qtyPct: 0.01 },
      'Độc quyền': { qtyPct: 0.01 },
      'Add in': { qtyPct: 0.02 },
      'Daily': { qtyPct: 0.02 }
    };
  }

  // Calculate target quantities
  const calculated = items.map(item => {
    const key = item.category === 'PLATFORM_FORMAT' && item.tierCode === 'Reup'
      ? `${item.platform}_Reup`
      : item.category === 'PLATFORM_FORMAT' && item.tierCode === 'Affiliate'
      ? `${item.platform}_Affiliate`
      : item.tierCode;

    const share = targetShares[key] || { qtyPct: 0.01 };
    const rawQty = Math.round(totalContents * share.qtyPct);
    const qty = Math.max(0, rawQty);
    const unitCost = item.unitCost || BENCHMARK_COSTS[key] || 1000000;
    const totalRowBudget = qty * unitCost;

    return {
      ...item,
      qty,
      totalBudget: totalRowBudget,
      targetGmv: totalRowBudget * (item.expectedRoiMultiplier || 5.0)
    };
  });

  // Adjust sum of qty to match totalContents exactly
  const currentTotalQty = calculated.reduce((sum, r) => sum + r.qty, 0);
  const diffQty = totalContents - currentTotalQty;
  if (diffQty !== 0) {
    // Add or subtract from KL1 / KL2 (the most flexible buffer)
    const bufferRow = calculated.find(r => r.tierCode === 'KL1') || calculated[0];
    if (bufferRow) {
      bufferRow.qty = Math.max(0, bufferRow.qty + diffQty);
      bufferRow.totalBudget = bufferRow.qty * bufferRow.unitCost;
      bufferRow.targetGmv = bufferRow.totalBudget * bufferRow.expectedRoiMultiplier;
    }
  }

  return calculated;
}

// =========================================================================
// 4 BỘ DỮ LIỆU TEST GIẢ LẬP THEO CASE STUDY THỰC TẾ UPBASE
// =========================================================================

export interface MockPlanScenario {
  id: string;
  name: string;
  badge: string;
  brandName: string;
  description: string;
  state: InputPlanBreakdownState;
}

export const MOCK_PLAN_SCENARIOS: MockPlanScenario[] = [];

// generateRandomMockPlan đã được gỡ bỏ theo yêu cầu triệt tiêu dữ liệu ảo.
