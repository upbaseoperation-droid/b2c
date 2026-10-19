import { REAL_B2C_69_STORES, REAL_BOOKING_TEAMS_STRUCTURE, REAL_MONTHLY_PLANS_OCT_2026 } from '../src/lib/realB2cPlanData';

console.log('Stores count:', REAL_B2C_69_STORES.length);
console.log('Teams count:', REAL_BOOKING_TEAMS_STRUCTURE.length);
console.log('Plans count:', REAL_MONTHLY_PLANS_OCT_2026.length);

const picsMap = new Map<string, {
  name: string;
  stores: string[];
  videoAffiliate: number;
  videoSelfChannel: number;
  totalVideo: number;
  budgetGross: number;
  budgetNet: number;
}>();

REAL_MONTHLY_PLANS_OCT_2026.forEach(p => {
  const pic = p.bookingPic || 'Chưa gán';
  if (!picsMap.has(pic)) {
    picsMap.set(pic, {
      name: pic,
      stores: [],
      videoAffiliate: 0,
      videoSelfChannel: 0,
      totalVideo: 0,
      budgetGross: 0,
      budgetNet: 0
    });
  }
  const item = picsMap.get(pic)!;
  item.stores.push(p.storeName);
  item.videoAffiliate += (p.videoAffiliateCount || 0);
  item.videoSelfChannel += (p.videoSelfChannelCount || 0);
  item.totalVideo += (p.videoAffiliateCount || 0) + (p.videoSelfChannelCount || 0);
  item.budgetGross += (p.totalGrossBudget || 0);
  item.budgetNet += (p.totalNetBudget || 0);
});

console.log('\n--- TỔNG HỢP NHÂN SỰ THEO REAL_MONTHLY_PLANS_OCT_2026 ---');
const arr = Array.from(picsMap.values()).sort((a, b) => b.totalVideo - a.totalVideo);

console.table(arr.map(x => ({
  'Nhân sự (PIC)': x.name,
  'Số gian hàng': x.stores.length,
  'Video Affiliate': x.videoAffiliate,
  'Video Self-channel': x.videoSelfChannel,
  'Tổng Video': x.totalVideo,
  'Ngân sách Net (VNĐ)': Math.round(x.budgetNet).toLocaleString('vi-VN')
})));

let sumAff = 0, sumSelf = 0, sumTotal = 0, sumBudgetNet = 0;
arr.forEach(x => {
  sumAff += x.videoAffiliate;
  sumSelf += x.videoSelfChannel;
  sumTotal += x.totalVideo;
  sumBudgetNet += x.budgetNet;
});

console.log(`\n========================================`);
console.log(`TỔNG SỐ NHÂN SỰ (PIC): ${arr.length}`);
console.log(`TỔNG SỐ VIDEO AFFILIATE: ${sumAff.toLocaleString('vi-VN')}`);
console.log(`TỔNG SỐ VIDEO SELF CHANNEL: ${sumSelf.toLocaleString('vi-VN')}`);
console.log(`TỔNG SỐ VIDEO (AFF + SELF): ${sumTotal.toLocaleString('vi-VN')}`);
console.log(`TỔNG NGÂN SÁCH NET: ${Math.round(sumBudgetNet).toLocaleString('vi-VN')} đ`);
console.log(`========================================\n`);

// In ra chi tiết gian hàng của từng người
console.log('--- CHI TIẾT GIAN HÀNG CỦA TỪNG NHÂN SỰ ---');
arr.forEach(x => {
  console.log(`\n[${x.name}] - ${x.stores.length} gian hàng | Aff: ${x.videoAffiliate} | Self: ${x.videoSelfChannel} | Tổng: ${x.totalVideo}`);
  console.log('   Gian hàng: ' + x.stores.join(', '));
});
